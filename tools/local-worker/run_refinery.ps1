# One job-owned, no-fanout, checkpointed MH7 Blender+Qwen execution on OLD-CORE30.
$ErrorActionPreference='Stop'
$ProgressPreference='SilentlyContinue'
if ($env:RUNNER_NAME -ne 'OLD-CORE30-homebrew') { throw 'Refusing non-designated runner.' }
if ($env:HB_MODE -ne 'refinery') { throw 'Refinery launched without explicit refinery mode.' }
$root='D:\Runner\actions-runner'
if (-not (Test-Path -LiteralPath (Join-Path $root '.runner'))) { throw 'Runner configuration missing.' }
$report = if ($env:HB_REPORT_DIR) { $env:HB_REPORT_DIR } else { Join-Path $root ("_homebrew\reports\{0}-{1}" -f $env:GITHUB_RUN_ID,$env:GITHUB_RUN_ATTEMPT) }
$workspace=Join-Path $root '_homebrew\refinery-mh7'
$source=Join-Path $workspace 'checkout\Tech-Priests'
$results=Join-Path $workspace 'output'
$scriptDir=Join-Path $report '_mh7-runner'
New-Item -ItemType Directory -Force -Path $report,$scriptDir,$workspace,$results | Out-Null
$env:HB_REPORT_DIR=$report
"HB_REPORT_DIR=$report" | Out-File $env:GITHUB_ENV -Append -Encoding utf8
$status=$false
if ($env:HB_STATUS_SCRIPT -and (Test-Path -LiteralPath $env:HB_STATUS_SCRIPT)) {
 try { . $env:HB_STATUS_SCRIPT; $status=$true } catch { Write-Warning 'Live status unavailable; checkpoint files still authoritative.' }
}
function Publish([string]$stage,[hashtable]$progress) {
  if ($status) {try { Set-HBStatus -Directory $report -Stage $stage -Progress $progress -Progressed } catch { Write-Warning 'Status delivery failed; continuing safely.' }}
}
function Exec([string]$exe,[string[]]$args) {
  & $exe @args
  if ($LASTEXITCODE -ne 0) { throw "Command $exe failed with code $LASTEXITCODE" }
}
function Find-Executable([string]$name,[string[]]$paths) {
  $cmd=Get-Command $name -CommandType Application -ErrorAction SilentlyContinue
  if ($cmd -and $cmd.Source -and $cmd.Source -notlike '*\WindowsApps\*') { return $cmd.Source }
  foreach ($pattern in $paths) {
    foreach ($candidate in @(Get-ChildItem -Path $pattern -File -ErrorAction SilentlyContinue)) {
      if (Test-Path -LiteralPath $candidate.FullName) { return $candidate.FullName }
    }
  }
  return $null
}
function Download-Script([string]$name) {
 $dst=Join-Path $scriptDir $name
 $url="https://raw.githubusercontent.com/$env:GITHUB_REPOSITORY/$env:GITHUB_SHA/tools/refinery-agent/$name"
 $ok=$false
 foreach ($delay in @(0,2,5,10)) {
   if ($delay -gt 0) { Start-Sleep -Seconds $delay }
   try {
     Invoke-WebRequest -UseBasicParsing -Uri $url -OutFile $dst -TimeoutSec 30
     if ((Get-Item -LiteralPath $dst).Length -le 100) {throw 'Empty or truncated source file.' }
     $ok=$true;break
   } catch { Write-Warning "Pinned helper download retry $name" }
 }
 if (-not $ok) { throw "Cannot retrieve pinned helper $name" }
 return $dst
}
$ownedOllama=$null
$exitCode=1
$reportState=[ordered]@{job='TP-MH7';runner=$env:RUNNER_NAME;workflow_sha=$env:GITHUB_SHA;started_utc=[datetime]::UtcNow.ToString('o');phase='preflight';failure=$null;model=$null;source_sha=$null;results_path=$results}
try {
  Publish 'refinery-preflight' @{stage='preflight';files=0}
  $git=Find-Executable 'git' @('C:\Program Files\Git\cmd\git.exe')
  $python=Find-Executable 'python' @('D:\Runner\actions-runner\_homebrew\tools\python*\python.exe','C:\Program Files\Python*\python.exe','C:\Python*\python.exe','D:\Python*\python.exe','D:\Runner\Python*\python.exe','C:\Users\*\AppData\Local\Programs\Python\Python*\python.exe')
  $blender=Find-Executable 'blender' @('C:\Program Files\Blender Foundation\Blender*\blender.exe')
  $ollama=Find-Executable 'ollama' @('C:\Program Files\Ollama\ollama.exe','C:\Users\*\AppData\Local\Programs\Ollama\ollama.exe','D:\AI-Relocation\Ollama\ollama.exe')
  if (-not $python) {
    # Service accounts often lack the interactive user's Python PATH.
    # Prefer existing Windows launcher before touching the machine.
    $python=Find-Executable 'py' @('C:\Windows\py.exe','C:\Windows\System32\py.exe')
  }
  if (-not $python -and $blender) {
    # Blender ships a full stdlib-capable Python. Use its verified bundled binary
    # to orchestrate Blender; no global runtime installation or PATH mutation.
    $blenderRoot=Split-Path -Parent $blender
    $embedded=@(Get-ChildItem -LiteralPath $blenderRoot -Recurse -Filter 'python.exe' -File -ErrorAction SilentlyContinue | Select-Object -First 1)
    if ($embedded.Count -gt 0) { $python=$embedded[0].FullName }
  }
  if ($python) {
    Write-Host "MH7 Python executable discovered: $python"
    Exec $python @('--version')
  }
  foreach ($item in @(@('git',$git),@('python',$python),@('blender',$blender))) { if (-not $item[1]) { throw "Missing existing $($item[0]) executable; do not install automatically." } }
  if (@(Get-Process -Name blender -ErrorAction SilentlyContinue).Count -gt 0) {throw 'Existing Blender process on runner; refusing duplicate renderer.'}
  $os=Get-CimInstance Win32_OperatingSystem
  if ($os.FreePhysicalMemory -lt (6 * 1024 * 1024)) { throw 'Runner has less than six GiB free physical RAM.' }
  $disk=(Get-PSDrive -Name D -ErrorAction Stop)
  if ($disk.Free -lt 4GB) {throw 'Runner D: free disk below four GiB; no construction attempted.'}
  # A busy desktop Ollama is protected, but does not block independent Blender study.
  $desktop=$null
  try {$desktop=Invoke-RestMethod -Uri 'http://127.0.0.1:11434/api/ps' -TimeoutSec 5} catch {}
  $desktopBusy=($desktop -and @($desktop.models).Count -gt 0)
  $reportState['tools']=@{git=$git;python=$python;blender=$blender;ollama=$ollama}
  $reportState.phase='download-pinned-helpers'
  $helpers=@('drive_refinery.py','build_machine.py','verify_machine.py','extract_parts.py','verify_part.py')
  foreach ($h in $helpers) {[void](Download-Script $h)}
  # Preserve the authoritative source package. This checkout is dedicated to this job, not the user's C:\GITS tree.
  $pin='23204d88d55cb22314e56ba962fe3ce3f357dfa3'
  $reportState.phase='acquire-pinned-source'
  if (-not (Test-Path -LiteralPath (Join-Path $source '.git'))) {
    New-Item -ItemType Directory -Force -Path (Split-Path -Parent $source) | Out-Null
    Exec $git @('clone','--depth','1','--filter=blob:none','--sparse','https://github.com/mrcalzon02/Tech-Priests.git',$source)
  } else {
    $dirty=@(& $git -C $source status --porcelain)
    if ($dirty.Count -gt 0) { throw 'Dedicated source checkout contains uncommitted changes; preserve them rather than wiping.' }
  }
  Exec $git @('-C',$source,'sparse-checkout','set',
   'docs/art/metallic-hydrogen-chain','art/source-to-3d/condenser-v19','art/source-to-3d/condenser-v21',
   'art/source-to-3d/boiler-v08','art/source-to-3d/emergency-miner',
   'tech-priests_src/graphics/entity/martian-micro','tech-priests_src/graphics/entity/cogitator-station','tools/art')
  Exec $git @('-C',$source,'fetch','--depth','1','origin',$pin)
  Exec $git @('-C',$source,'checkout','--detach',$pin)
  $actual=(& $git -C $source rev-parse HEAD).Trim()
  if ($actual -ne $pin) {throw 'Pinned Tech-Priests source did not check out.'}
  $reportState.source_sha=$actual
  Exec $python @((Join-Path $source 'docs\art\metallic-hydrogen-chain\validate_packet.py'))
  # Discover an existing Qwen endpoint without installing a model/runtime.
  # When missing, continue a provenance-labelled deterministic Blender pilot.
  $modelStore='D:\AI-Relocation\Ollama\models'
  $selected=[pscustomobject]@{name='none-scripted-baseline';size=0}
  $endpoint='none'
  $tags=$null
  if (-not $desktopBusy) {
    try { $tags=Invoke-RestMethod -Uri 'http://127.0.0.1:11434/api/tags' -TimeoutSec 6; $endpoint='http://127.0.0.1:11434' } catch {}
  }
  if (-not $tags -and $ollama -and (Test-Path -LiteralPath $modelStore)) {
    $listener=New-Object Net.Sockets.TcpListener([Net.IPAddress]::Loopback,11435)
    $portReady=$false
    try {$listener.Start();$portReady=$true} catch {Write-Warning 'Model worker port busy; will not take control of it.'} finally {$listener.Stop()}
    if ($portReady) {
      $env:OLLAMA_MODELS=$modelStore
      $env:OLLAMA_HOST='127.0.0.1:11435'
      $env:OLLAMA_NO_CLOUD='1';$env:OLLAMA_MAX_LOADED_MODELS='1'
      $env:OLLAMA_NUM_PARALLEL='1';$env:OLLAMA_CONTEXT_LENGTH='4096'
      $env:OLLAMA_KEEP_ALIVE='30s';$env:OLLAMA_NO_PRUNE='1'
      $reportState.phase='local-inference-preflight'
      $ownedOllama=Start-Process -FilePath $ollama -ArgumentList 'serve' -WorkingDirectory $scriptDir -PassThru -WindowStyle Hidden -RedirectStandardOutput (Join-Path $report 'ollama.stdout.txt') -RedirectStandardError (Join-Path $report 'ollama.stderr.txt')
      foreach ($delay in @(1,2,4,8,8,10)) {
        Start-Sleep -Seconds $delay
        $ownedOllama.Refresh()
        if ($ownedOllama.HasExited) { break }
        try { $tags=Invoke-RestMethod -Uri 'http://127.0.0.1:11435/api/tags' -TimeoutSec 6; $endpoint='http://127.0.0.1:11435';break } catch {}
      }
    }
  }
  if ($tags) {
    $candidates=@($tags.models | Where-Object {$_.size -gt 0 -and $_.name -match '(?i)qwen.*coder'} | Sort-Object size -Descending)
    if ($candidates.Count -eq 0) { $candidates=@($tags.models | Where-Object {$_.size -gt 0 -and $_.name -match '(?i)qwen'} | Sort-Object size -Descending) }
    if ($candidates.Count -gt 0) {$selected=$candidates[0]}
  }
  if ($selected.name -eq 'none-scripted-baseline') {
    $endpoint='none'
    $reportState['inference_warning']='No accessible idle local Qwen service or existing Ollama executable. Scripted geometry only; Qwen revision pending.'
    Write-Warning $reportState['inference_warning']
  }
  $reportState.model=$selected.name
  $reportState['model_size_bytes']=$selected.size
  $reportState.phase='construction'
  $reportState | ConvertTo-Json -Depth 7 | Set-Content -LiteralPath (Join-Path $report 'refinery-preflight.json') -Encoding utf8
  Publish 'refinery-agent-starting' @{stage='Blender-construction';model=$selected.name;complete=0;total=7}
  $args=@((Join-Path $scriptDir 'drive_refinery.py'),'--repo',$source,'--out',$results,'--report',$report,
      '--blender',$blender,'--endpoint',$endpoint,'--model',$selected.name,
      '--source-sha',$pin,'--max-machines','7')
  $stdout=Join-Path $report 'refinery.stdout.log';$stderr=Join-Path $report 'refinery.stderr.log'
  $quoted=($args | ForEach-Object { '"'+($_ -replace '"','')+'"' }) -join ' '
  $agent=Start-Process -FilePath $python -ArgumentList $quoted -WorkingDirectory $scriptDir -PassThru -WindowStyle Hidden -RedirectStandardOutput $stdout -RedirectStandardError $stderr
  $timer=[Diagnostics.Stopwatch]::StartNew();$lastSignature=''
  while (-not $agent.WaitForExit(10000)) {
    if ($timer.Elapsed.TotalMinutes -ge 325) {
       & taskkill.exe /PID $agent.Id /T /F | Out-Null
       throw 'Budgeted local execution exceeded 325 minutes; durable stage checkpoints retained.'
    }
    $stateFile=Join-Path $report 'progress.json'
    $stageInfo=@{phase='construction';process_alive=$true;elapsed_seconds=[int]$timer.Elapsed.TotalSeconds}
    if (Test-Path -LiteralPath $stateFile) {
      try {
        $s=Get-Content -LiteralPath $stateFile -Raw | ConvertFrom-Json
        $stageInfo.machine=$s.machine;$stageInfo.index=$s.index;$stageInfo.total=$s.total
        $stageInfo.completed=@($s.completed).Count;$stageInfo.blocked=@($s.blocked).Count
        $signature="$($s.machine)/$($s.state)/$($stageInfo.completed)/$($stageInfo.blocked)"
        if ($signature -ne $lastSignature) { Write-Host "MH7 $signature";$lastSignature=$signature }
      } catch {Write-Warning 'Optional progress unreadable; process continues.'}
    }
    Publish 'refinery-running' $stageInfo
  }
  $agent.Refresh();$exitCode=$agent.ExitCode
  $reportState.phase='completed';$reportState['agent_exit']=$exitCode
  if ($exitCode -ne 0) {throw "Refinery agent returned $exitCode, preserve completed outputs and report blockers."}
  Publish 'refinery-finished' @{stage='model-verified';process_alive=$false;total=7}
} catch {
  $reportState.phase='blocked';$reportState.failure=$_.Exception.Message
  Write-Host ('MH7 BLOCKED: '+$reportState.failure)
  Publish 'refinery-blocked' @{stage='blocked';error=$reportState.failure}
  $exitCode=1
} finally {
  if ($ownedOllama) {
    $ownedOllama.Refresh()
    if (-not $ownedOllama.HasExited) {
      Write-Host 'Stopping only job-owned Ollama process.'
      & taskkill.exe /PID $ownedOllama.Id /T /F | Out-Null
    }
  }
  $reportState.finished_utc=[datetime]::UtcNow.ToString('o')
  $reportState | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath (Join-Path $report 'refinery-worker-final.json') -Encoding utf8
  $summary=@('# MH7 local Qwen/Blender worker', '',"Result: **$($reportState.phase)**", "Model: **$($reportState.model)**", "Target commit: $($reportState.source_sha)", '', 'Source geometry and previews are **candidates**, not in-game acceptance.')
  if ($reportState.failure) {$summary+="Blocked: $($reportState.failure)"}
  $summary | Set-Content -LiteralPath (Join-Path $report 'SUMMARY.md') -Encoding utf8
  $summary | Out-File -FilePath $env:GITHUB_STEP_SUMMARY -Append -Encoding utf8
}
exit $exitCode
