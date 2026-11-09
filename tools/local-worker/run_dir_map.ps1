# Targeted, read-only discovery for the Homebrew OLD-CORE30 Windows runner.
# No drive-wide walk, model download, service restart, process kill, or secret read.
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
if ($env:RUNNER_NAME -ne 'OLD-CORE30-homebrew') { throw 'Directory mapper requires OLD-CORE30-homebrew.' }
if ($env:HB_MODE -ne 'map') { throw 'Directory mapper must run with HB_MODE=map.' }
$runnerRoot = 'D:\Runner\actions-runner'
if (-not (Test-Path -LiteralPath (Join-Path $runnerRoot '.runner'))) { throw 'Expected runner installation missing.' }
$report = if ($env:HB_REPORT_DIR) { $env:HB_REPORT_DIR } else { Join-Path $runnerRoot ("_homebrew\reports\{0}-{1}" -f $env:GITHUB_RUN_ID,$env:GITHUB_RUN_ATTEMPT) }
$privateRoot = Join-Path $runnerRoot '_homebrew\private\directory-map'
New-Item -ItemType Directory -Force -Path $report,$privateRoot | Out-Null
"HB_REPORT_DIR=$report" | Out-File $env:GITHUB_ENV -Append -Encoding utf8
$stopwatch = [Diagnostics.Stopwatch]::StartNew()
$maxSeconds = 110
$errors = New-Object System.Collections.Generic.List[string]
$skipped = @('.git','node_modules','.venv','venv','__pycache__','blobs','Temp','tmp','Cache','.cache','AppData','Downloads','Documents','Desktop','Secrets','credentials')
function Save-Json([string]$path, $data) {
  $temp = $path + '.tmp'
  $data | ConvertTo-Json -Depth 14 | Set-Content -LiteralPath $temp -Encoding utf8
  Move-Item -LiteralPath $temp -Destination $path -Force
}
function Clean-Path([string]$value) {
  if (-not $value) { return $null }
  $result = $value -replace '(?i)C:\\Users\\[^\\]+', 'C:\Users\<PROFILE>'
  if ($result -match '(?i)(token|credential|password|secret|private[-_]?key)') { return '<REDACTED-SENSITIVE-PATH>' }
  return $result
}
function Find-Binary([string]$exe, [string[]]$patterns) {
  $locations = New-Object System.Collections.Generic.List[string]
  try {
    $cmds = @(Get-Command -Name $exe -CommandType Application -ErrorAction SilentlyContinue)
    foreach ($c in $cmds) { if ($c.Source -and $c.Source -notlike '*\WindowsApps\*' -and (Test-Path -LiteralPath $c.Source -PathType Leaf)) { $locations.Add($c.Source) } }
  } catch { }
  foreach ($pattern in $patterns) {
    if ($stopwatch.Elapsed.TotalSeconds -gt $maxSeconds) { break }
    try {
      foreach ($p in @(Get-ChildItem -Path $pattern -File -ErrorAction SilentlyContinue | Select-Object -First 12)) {
        if ($p -and $p.FullName -and (Test-Path -LiteralPath $p.FullName -PathType Leaf)) { $locations.Add($p.FullName) }
      }
    } catch { }
  }
  return @($locations | Select-Object -Unique)
}
function Walk-Root([string]$path,[int]$depthLimit=3,[int]$maxNodes=140) {
  if (-not (Test-Path -LiteralPath $path -PathType Container)) { return @() }
  $out = New-Object System.Collections.Generic.List[object]
  $pending = New-Object System.Collections.Generic.Queue[object]
  $pending.Enqueue([pscustomobject]@{full=$path;relative='.';depth=0})
  while ($pending.Count -gt 0 -and $out.Count -lt $maxNodes -and $stopwatch.Elapsed.TotalSeconds -lt $maxSeconds) {
    $curr=$pending.Dequeue()
    $out.Add([pscustomobject]@{relative=$curr.relative;depth=$curr.depth})
    if ($curr.depth -ge $depthLimit) {continue}
    try {
      $children = @(Get-ChildItem -LiteralPath $curr.full -Directory -ErrorAction Stop | Select-Object -First 65)
      foreach ($child in $children) {
        if ($child.Name -in $skipped) {continue}
        $rel = if ($curr.relative -eq '.') { $child.Name } else { $curr.relative+'\'+$child.Name }
        $pending.Enqueue([pscustomobject]@{full=$child.FullName;relative=$rel;depth=$curr.depth+1})
      }
    } catch { $errors.Add('Directory unreadable in one approved root (details retained locally).') }
  }
  return @($out.ToArray())
}
function Get-Installed-Models([string]$storePath) {
  $manifests=Join-Path $storePath 'manifests'
  if (-not (Test-Path -LiteralPath $manifests -PathType Container)) {return @()}
  $result=New-Object System.Collections.Generic.List[object]
  try {
    foreach ($f in @(Get-ChildItem -LiteralPath $manifests -File -Recurse -ErrorAction SilentlyContinue | Select-Object -First 120)) {
      if ($stopwatch.Elapsed.TotalSeconds -gt $maxSeconds) {break}
      $rel=$f.FullName.Substring($manifests.Length).TrimStart('\')
      # Only model/tag path metadata. Never read the manifest or model payload bytes.
      $result.Add($rel)
    }
  } catch { $errors.Add('Some model manifest paths could not be enumerated.') }
  return @($result.ToArray())
}
$statusAvailable=$false
if ($env:HB_STATUS_SCRIPT -and (Test-Path -LiteralPath $env:HB_STATUS_SCRIPT)) {
  try { . $env:HB_STATUS_SCRIPT; $statusAvailable=$true; Set-HBStatus -Directory $report -Stage 'directory-map-read-only' -Progress @{phase='scan';roots=0} -Progressed } catch { }
}
$rootDefinitions = [ordered]@{
  runner = @('D:\Runner\actions-runner\_homebrew','D:\Runner\actions-runner\_work')
  models = @('D:\AI-Relocation\Ollama','D:\Ollama','D:\AI\Ollama','C:\ProgramData\Ollama')
  repos = @('C:\GITS','D:\GITS','D:\Git','D:\Projects')
  art = @('D:\Blender','D:\Models','D:\Assets','C:\GITS\Tech-Priests\art\source-to-3d','D:\Runner\actions-runner\_homebrew\refinery-mh7')
  programs = @('C:\Program Files\Blender Foundation','C:\Program Files\Ollama','C:\Program Files\Git')
}
$rawRoots = New-Object System.Collections.Generic.List[object]
foreach ($category in @($rootDefinitions.Keys)) {
  foreach ($base in @($rootDefinitions[$category])) {
    if ($stopwatch.Elapsed.TotalSeconds -ge $maxSeconds) {break}
    $exists=Test-Path -LiteralPath $base -PathType Container
    $nodes=if($exists){ @(Walk-Root $base 3 130) }else{@()}
    $rawRoots.Add([pscustomobject]@{category=$category;path=$base;exists=$exists;directories=$nodes})
  }
}
$processes = New-Object System.Collections.Generic.List[object]
try {
  foreach ($p in @(Get-CimInstance Win32_Process -ErrorAction Stop | Where-Object { $_.Name -in @('ollama.exe','blender.exe','python.exe','git.exe') } | Select-Object -First 24)) {
    $processes.Add([pscustomobject]@{name=$p.Name;executable=$p.ExecutablePath;pid=$p.ProcessId})
  }
} catch { $errors.Add('Running process executable paths are not accessible to the runner account.') }
$binPatterns = [ordered]@{
  ollama = @('C:\Program Files\Ollama\ollama.exe','C:\Program Files (x86)\Ollama\ollama.exe','C:\Users\*\AppData\Local\Programs\Ollama\ollama.exe','C:\Users\*\AppData\Local\Ollama\ollama.exe','D:\AI-Relocation\Ollama\ollama.exe','D:\AI-Relocation\Ollama\bin\ollama.exe','D:\Ollama\ollama.exe')
  blender = @('C:\Program Files\Blender Foundation\Blender*\blender.exe')
  python = @('D:\Runner\actions-runner\_homebrew\tools\python*\python.exe','C:\Program Files\Blender Foundation\Blender*\*\python\bin\python.exe','C:\Python*\python.exe')
  git = @('C:\Program Files\Git\cmd\git.exe')
}
$binaries = [ordered]@{}
foreach ($exe in @($binPatterns.Keys)) {
  $found = @(Find-Binary ($exe+'.exe') $binPatterns[$exe])
  foreach ($proc in @($processes | Where-Object {$_.name -eq ($exe+'.exe')})) {
    if ($proc.executable -and (Test-Path -LiteralPath $proc.executable -PathType Leaf)) { $found+= $proc.executable }
  }
  $binaries[$exe]=@($found | Select-Object -Unique)
}
$modelPaths=New-Object System.Collections.Generic.List[string]
$modelPaths.Add('D:\AI-Relocation\Ollama\models')
$modelPaths.Add('D:\Ollama\models')
$modelPaths.Add('C:\ProgramData\Ollama\models')
try {
  # Target specific per-profile paths only; never enumerate home files.
  foreach ($user in @(Get-ChildItem -LiteralPath 'C:\Users' -Directory -ErrorAction SilentlyContinue | Select-Object -First 40)) {
    foreach ($relative in @('.ollama\models','AppData\Local\Ollama\models','AppData\Local\Programs\Ollama\models')) {
      $p=Join-Path $user.FullName $relative
      if(Test-Path -LiteralPath $p -PathType Container){$modelPaths.Add($p)}
    }
  }
} catch { }
$modelStores=New-Object System.Collections.Generic.List[object]
foreach ($p in @($modelPaths | Select-Object -Unique)) {
  if ($stopwatch.Elapsed.TotalSeconds -ge $maxSeconds) {break}
  if (Test-Path -LiteralPath $p -PathType Container) {
    $items=@(Get-Installed-Models $p)
    $modelStores.Add([pscustomobject]@{path=$p;manifest_paths=$items;manifest_count=$items.Count})
  }
}
$ollamaApi=[ordered]@{}
foreach ($port in @(11434,11435)) {
  try {
    $tags=Invoke-RestMethod -Uri "http://127.0.0.1:$port/api/tags" -TimeoutSec 3
    $ps=$null;try{$ps=Invoke-RestMethod -Uri "http://127.0.0.1:$port/api/ps" -TimeoutSec 3}catch{}
    $ollamaApi["$port"]=@{reachable=$true;models=@($tags.models | ForEach-Object {$_.name});loaded_count=if($ps){@($ps.models).Count}else{$null}}
  } catch { $ollamaApi["$port"]=@{reachable=$false;models=@();loaded_count=$null} }
}
$inventory=[ordered]@{
 schema_version=1;scan_type='bounded-read-only';created_utc=[DateTime]::UtcNow.ToString('o');runner_name=$env:RUNNER_NAME
 scan_seconds=[Math]::Round($stopwatch.Elapsed.TotalSeconds,2);roots=@($rawRoots.ToArray());binaries=$binaries
 model_stores=@($modelStores.ToArray());ollama_apis=$ollamaApi;processes=@($processes.ToArray());warnings=@($errors.ToArray())
}
# Local persistent file contains exact paths for future explicitly-authorized jobs.
$privateFile=Join-Path $privateRoot 'path-registry-private.json'
Save-Json $privateFile $inventory
# GitHub artifacts contain only a sanitized targeted summary, not arbitrary user/home file trees.
$sanitizedRoots=foreach($root in $rawRoots){
  $rels=@($root.directories | ForEach-Object {
     $v=$_.relative
     if($v -match '(?i)(token|credential|password|secret|private[-_]?key|user)'){ '[REDACTED]' } elseif($root.category -in @('repos','art') -and $v -notmatch '(?i)(Tech-Priests|HB-TTRPG-tools|Blender|source-to-3d|metallic-hydrogen|model|texture|asset|GITS|Git|refinery|condenser|boiler|emergency|shared-parts|workbench|parts|render|library|Factorio)') { '[OTHER_DIRECTORY]' } else { $v }
  } | Select-Object -First 75)
  [ordered]@{category=$root.category;root=(Clean-Path $root.path);exists=$root.exists;directory_count=$root.directories.Count;relative_directories=$rels}
}
$sanitized=[ordered]@{
 schema_version=1;scan_type='bounded-read-only';created_utc=$inventory.created_utc;runner_name=$env:RUNNER_NAME
 exact_local_registry_stored=$true;private_registry_not_uploaded=$true;scan_seconds=$inventory.scan_seconds
 roots=@($sanitizedRoots);binaries=[ordered]@{};model_stores=@();ollama_apis=$ollamaApi
 process_executable_hints=@($processes | ForEach-Object {@{name=$_.name;executable=(Clean-Path $_.executable)}});warnings=@($errors.ToArray())
}
foreach($k in @($binaries.Keys)) { $sanitized.binaries[$k]=@($binaries[$k] | ForEach-Object {Clean-Path $_}) }
$sanitized.model_stores=@($modelStores | ForEach-Object { @{path=(Clean-Path $_.path);manifest_count=$_.manifest_count;model_manifest_paths=@($_.manifest_paths | Where-Object {$_ -match '(?i)qwen|llama|deepseek|phi' } | Select-Object -First 45)} })
$publicJson=Join-Path $report 'directory-map-public.json'
Save-Json $publicJson $sanitized
$md=@('# Homebrew OLD-CORE30 targeted directory map','', 'Read-only bounded inspection; no files moved, installed, deleted or downloaded.','')
$md+=('Scan seconds: '+$inventory.scan_seconds)
$md+=('Exact private path registry retained on runner at: '+(Clean-Path $privateFile)+' (not uploaded).')
$md+='';$md+='## Executables'
foreach($k in @($binaries.Keys)){$md+=('- '+$k+': '+$(if($binaries[$k].Count){@($binaries[$k]|ForEach-Object{Clean-Path $_}) -join '; '}else{'not found'}))}
$md+='';$md+='## Ollama APIs';foreach($port in @('11434','11435')){$e=$ollamaApi[$port];$md+=('- '+$port+': reachable='+$e.reachable+', model_tags='+(@($e.models) -join ', ')+', loaded='+$e.loaded_count)}
$md+='';$md+='## Model store manifests';foreach($m in @($sanitized.model_stores)){$md+=('- '+$m.path+': '+$m.manifest_count+' manifests');foreach($n in @($m.model_manifest_paths)){$md+=('  - '+$n)}}
$md+='';$md+='## Scoped roots';foreach($v in @($sanitizedRoots)){$md+=('- '+$v.category+' '+$v.root+': exists='+$v.exists+', folders='+$v.directory_count)}
$md+='';$md+='## Warnings';foreach($v in $errors){$md+=('- '+$v)}
$md | Set-Content -LiteralPath (Join-Path $report 'DIRECTORY_MAP.md') -Encoding utf8
if ($statusAvailable) {try{Set-HBStatus -Directory $report -Stage 'directory-map-complete' -Progress @{phase='complete';roots=$rawRoots.Count;models=$modelStores.Count} -Progressed}catch{}}
Write-Host ('MAP_DONE models_stores='+$modelStores.Count+' ollama_paths='+@($binaries.ollama).Count+' private_registry_saved=true public_report='+$publicJson)
exit 0
