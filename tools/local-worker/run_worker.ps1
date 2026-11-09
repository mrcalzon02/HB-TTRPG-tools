$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
if ($env:RUNNER_NAME -ne 'OLD-CORE30-homebrew') { throw 'Wrong runner; no changes made.' }
if ($env:HB_MODE -notin @('blender','full','workbench','status')) { throw 'Invalid diagnostic mode.' }
$root = 'D:\Runner\actions-runner'
if (-not (Test-Path -LiteralPath "$root\.runner")) { throw 'Expected D: runner configuration is missing.' }
$work = Join-Path $root '_homebrew'
$out = Join-Path $work ("reports\{0}-{1}" -f $env:GITHUB_RUN_ID,$env:GITHUB_RUN_ATTEMPT)
New-Item -ItemType Directory -Force -Path $out | Out-Null
"HB_REPORT_DIR=$out" | Out-File $env:GITHUB_ENV -Append -Encoding utf8
$report = [ordered]@{schema_version=3;runner=$env:RUNNER_NAME;commit=$env:GITHUB_SHA;mode=$env:HB_MODE;started_utc=[DateTime]::UtcNow.ToString('o');stage='preflight';stages=[ordered]@{};tools=[ordered]@{};processes=[ordered]@{};changes=@();errors=@();installs=@();model_downloads=@()}
$ownedServer = $null
$statusAvailable=$false
if ($env:HB_STATUS_SCRIPT -and (Test-Path -LiteralPath $env:HB_STATUS_SCRIPT)) {
  try {
    . $env:HB_STATUS_SCRIPT
    $statusAvailable=Test-Path -LiteralPath (Join-Path $out 'worker-status.json')
  } catch { Write-Warning 'Live status support is unavailable; retaining normal task checkpoints.' }
}
function Update-Status([hashtable]$Fields) {
  if (-not $statusAvailable) { return }
  try { Set-HBStatus -Directory $out @Fields }
  catch { Write-Warning 'Status checkpoint write failed; task execution continues.' }
}
function Save-Checkpoint {
  $tmp = Join-Path $out 'repair.json.tmp'
  $report | ConvertTo-Json -Depth 15 | Set-Content -LiteralPath $tmp -Encoding utf8
  Move-Item -LiteralPath $tmp -Destination (Join-Path $out 'repair.json') -Force
}
function Log([string]$Text) { Write-Host ("[{0}] {1}" -f [DateTime]::UtcNow.ToString('HH:mm:ssZ'),$Text) }
function Stage([string]$Name,[scriptblock]$Body) {
  if (($env:HB_MODE -eq 'status' -and $Name -ne 'worker-status-smoke') -or
        ($Name -eq 'worker-status-smoke' -and $env:HB_MODE -ne 'status') -or
        ($env:HB_MODE -eq 'blender' -and $Name -notin @('resolve-tools','blender-save-reopen-render')) -or
        ($env:HB_MODE -eq 'workbench' -and $Name -notin @('resolve-tools','workbench-render')) -or
        ($Name -eq 'workbench-render' -and $env:HB_MODE -ne 'workbench')) {
    $report.stages[$Name]=[ordered]@{status='not-requested'}; Save-Checkpoint; return
  }
  $report.stage=$Name; $report.stages[$Name]=[ordered]@{status='running'}; Save-Checkpoint
  Update-Status @{Stage=$Name;Progress=@{};Progressed=$true}
  Log "START $Name"
  try { & $Body; $report.stages[$Name].status='passed'; Log "PASS $Name" }
  catch { $message=$_.Exception.Message; $report.stages[$Name].status='blocked'; $report.stages[$Name].error=$message; $report.errors+= "$Name : $message"; Log "BLOCKED $Name : $message" }
  Save-Checkpoint
  Update-Status @{Stage=$Name;Errors=@($report.errors);Progressed=$true}
}
function Find-Tool([string]$Name,[string[]]$Patterns) {
  $candidates=@(Get-Command $Name -CommandType Application -ErrorAction SilentlyContinue | Where-Object {$_.Source -notlike '*\WindowsApps\*'} | ForEach-Object {$_.Source})
  foreach ($pattern in $Patterns) { $candidates+=@(Get-ChildItem -Path $pattern -File -ErrorAction SilentlyContinue | ForEach-Object {$_.FullName}) }
  foreach ($candidate in ($candidates | Select-Object -Unique)) {
    if (Test-Path -LiteralPath $candidate -PathType Leaf) { return $candidate }
  }
  return $null
}
function Run-Tool([string]$Name,[string]$Exe,[string]$Arguments,[int]$Timeout=90) {
  if (-not $Exe) { throw "$Name executable is not accessible to the runner service." }
  Log "RUN $Name"
  $stdout=Join-Path $out "$Name.stdout.txt"; $stderr=Join-Path $out "$Name.stderr.txt"
  $process=New-Object System.Diagnostics.Process
  $process.StartInfo.FileName=$Exe
  $process.StartInfo.Arguments=$Arguments
  $process.StartInfo.WorkingDirectory=$out
  $process.StartInfo.UseShellExecute=$false
  $process.StartInfo.CreateNoWindow=$true
  $process.StartInfo.RedirectStandardOutput=$true
  $process.StartInfo.RedirectStandardError=$true
  $stdoutFile=$null; $stderrFile=$null; $started=$false
  try {
    # Keep the native handle/exit code, and stream logs to disk rather than
    # buffering the complete output in memory until the process exits.
    $stdoutFile=New-Object System.IO.FileStream($stdout,[IO.FileMode]::Create,[IO.FileAccess]::Write,[IO.FileShare]::ReadWrite,1,[IO.FileOptions]::Asynchronous)
    $stderrFile=New-Object System.IO.FileStream($stderr,[IO.FileMode]::Create,[IO.FileAccess]::Write,[IO.FileShare]::ReadWrite,1,[IO.FileOptions]::Asynchronous)
    if (-not $process.Start()) { throw "$Name did not start." }
    $started=$true
    $stdoutTask=$process.StandardOutput.BaseStream.CopyToAsync($stdoutFile)
    $stderrTask=$process.StandardError.BaseStream.CopyToAsync($stderrFile)
    $watch=[Diagnostics.Stopwatch]::StartNew(); $heartbeat=0
    $lastBytes=-1L; $lastFiles=-1
    while (-not $process.WaitForExit(1000)) {
      if ($watch.Elapsed.TotalSeconds -ge $Timeout) {
        & taskkill.exe /PID $process.Id /T /F | Out-Null
        [void]$process.WaitForExit(10000)
        [void]$stdoutTask.Wait(5000); [void]$stderrTask.Wait(5000)
        $report.processes[$Name]=[ordered]@{timed_out=$true;elapsed_seconds=[Math]::Round($watch.Elapsed.TotalSeconds,2)}
        Update-Status @{Progress=@{process_alive=$false;elapsed_seconds=[Math]::Round($watch.Elapsed.TotalSeconds,2)};Progressed=$true}
        throw "$Name exceeded its existing ${Timeout}s task timeout; job-owned process stopped."
      }
      if ($watch.Elapsed.TotalSeconds -ge $heartbeat) {
        try {
          $process.Refresh()
          $stdoutBytes=(Get-Item -LiteralPath $stdout).Length
          $stderrBytes=(Get-Item -LiteralPath $stderr).Length
          $files=@(Get-ChildItem -LiteralPath $out -File -Recurse | Where-Object {$_.Extension -in @('.png','.blend','.gif','.mp4','.webp')}).Count
          $advanced=(($stdoutBytes+$stderrBytes) -gt $lastBytes -or $files -gt $lastFiles)
          $progress=@{process_alive=(-not $process.HasExited);elapsed_seconds=[Math]::Round($watch.Elapsed.TotalSeconds,2);stdout_bytes=$stdoutBytes;stderr_bytes=$stderrBytes;output_files=$files}
          # A process may exit between sampling and reading its OS counters.
          try {
            $progress.cpu_seconds=[Math]::Round($process.TotalProcessorTime.TotalSeconds,2)
            $progress.working_set_bytes=$process.WorkingSet64
          } catch { }
          Update-Status @{Progress=$progress;Progressed=$advanced}
          $lastBytes=$stdoutBytes+$stderrBytes; $lastFiles=$files
          Log "$Name observed ($([int]$watch.Elapsed.TotalSeconds)s); log bytes $lastBytes; output files $files"
        } catch { Write-Warning 'Optional process metrics unavailable; task execution continues.' }
        $heartbeat+=15
      }
    }
    $code=$process.ExitCode
    if (-not $stdoutTask.Wait(10000) -or -not $stderrTask.Wait(10000)) { throw "$Name log collection timed out." }
    $stdoutFile.Flush(); $stderrFile.Flush()
    $report.processes[$Name]=[ordered]@{exit_code=$code;elapsed_seconds=[Math]::Round($watch.Elapsed.TotalSeconds,2)}
    try {
      Update-Status @{Progress=@{process_alive=$false;elapsed_seconds=[Math]::Round($watch.Elapsed.TotalSeconds,2);stdout_bytes=(Get-Item -LiteralPath $stdout).Length;stderr_bytes=(Get-Item -LiteralPath $stderr).Length};Progressed=$true}
    } catch { Write-Warning 'Final process metrics unavailable; retaining the actual process exit code.' }
    Log "$Name exited $code"
    if ($code -ne 0) { throw "$Name exited $code; see its stdout/stderr artifact." }
  } finally {
    if ($started -and -not $process.HasExited) { & taskkill.exe /PID $process.Id /T /F | Out-Null; [void]$process.WaitForExit(10000) }
    if ($null -ne $stdoutFile) { $stdoutFile.Dispose() }
    if ($null -ne $stderrFile) { $stderrFile.Dispose() }
    $process.Dispose()
  }
}
Save-Checkpoint
try {
  Stage 'worker-status-smoke' {
    if (-not $statusAvailable) { throw 'Live-status integration did not initialize.' }
    $support=Split-Path -Parent $env:HB_STATUS_SCRIPT
    & (Join-Path $support 'test_worker_status.ps1') -Directory (Join-Path $out 'status-tests')
    $probe=@'
1..4 | ForEach-Object {
  Write-Output ("STATUS_PROBE_PROGRESS {0}/4" -f $_)
  Start-Sleep -Seconds 10
}
Write-Output 'HB_STATUS_PROBE_OK'
'@
    $probePath=Join-Path $out 'worker-status-probe.ps1'
    $probe | Set-Content -LiteralPath $probePath -Encoding utf8
    $powershell=(Get-Process -Id $PID).Path
    Run-Tool 'status-probe' $powershell ('-NoLogo -NoProfile -NonInteractive -ExecutionPolicy Bypass -File "{0}"' -f $probePath) 90
    if ((Get-Content (Join-Path $out 'status-probe.stdout.txt') -Raw) -notmatch 'HB_STATUS_PROBE_OK') { throw 'Status probe completion marker missing.' }
  }
  Stage 'resolve-tools' {
    $report.tools.blender=Find-Tool 'blender' @('C:\Program Files\Blender Foundation\Blender*\blender.exe')
    if ($env:HB_MODE -eq 'full') {
      $report.tools.git=Find-Tool 'git' @('C:\Program Files\Git\cmd\git.exe')
      $report.tools.java=Find-Tool 'java' @('C:\Program Files\Java\jdk*\bin\java.exe','C:\Program Files\Eclipse Adoptium\jdk*\bin\java.exe')
      $report.tools.javac=Find-Tool 'javac' @('C:\Program Files\Java\jdk*\bin\javac.exe','C:\Program Files\Eclipse Adoptium\jdk*\bin\javac.exe')
      $report.tools.python=Find-Tool 'python' @('D:\Runner\actions-runner\_homebrew\tools\python*\python.exe','C:\Program Files\Python*\python.exe','C:\Users\*\AppData\Local\Programs\Python\Python3*\python.exe')
      $report.tools.ollama=Find-Tool 'ollama' @('C:\Program Files\Ollama\ollama.exe','C:\Users\*\AppData\Local\Programs\Ollama\ollama.exe','D:\AI-Relocation\Ollama\ollama.exe')
      $report.tools.nvidia_smi=Find-Tool 'nvidia-smi' @('C:\Windows\System32\nvidia-smi.exe')
    }
    $paths=@($report.tools.Values | Where-Object {$_} | ForEach-Object {Split-Path -Parent $_} | Select-Object -Unique)
    $env:PATH=($paths -join ';')+';'+$env:PATH
    $paths | Out-File -FilePath $env:GITHUB_PATH -Encoding utf8 -Append
    $report.changes+='Resolved existing tool paths for this job; no machine or desktop-user PATH changes.'
    $config=[ordered]@{schema_version=1;runner=$env:RUNNER_NAME;mode=$env:HB_MODE;tools=$report.tools;model_root='D:\AI-Relocation\Ollama\models';worker_host='127.0.0.1:11435';num_parallel=1;num_threads=8;context=2048;recorded_utc=[DateTime]::UtcNow.ToString('o')}
    $config | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath (Join-Path $out 'worker-environment.json') -Encoding utf8
    foreach ($key in $report.tools.Keys) { Log "$key = $($report.tools[$key])" }
  }
  Stage 'workbench-render' {
    if ($report.stages['resolve-tools'].status -ne 'passed') { throw 'Tool resolution must pass first.' }
    if ($env:HB_WORKBENCH_COMMIT -notmatch '^[0-9a-f]{40}$') { throw 'Workbench source must be pinned to a full Git commit SHA.' }
    if ($env:HB_WORKBENCH_SOURCE_SHA256 -notmatch '^[0-9a-f]{64}$') { throw 'Workbench source ZIP hash must be pinned.' }
    foreach ($relativePath in @($env:HB_WORKBENCH_SCRIPT,$env:HB_WORKBENCH_SOURCE_ZIP)) {
      if ($relativePath -notmatch '^models/island-survival/blender/workbench-v7/[A-Za-z0-9_.-]+$') { throw 'Unexpected workbench source path.' }
    }
    $assetBase="https://raw.githubusercontent.com/mrcalzon02/Tanks-for-bob-Fork/$env:HB_WORKBENCH_COMMIT"
    $downloads=@(
      @{path=$env:HB_WORKBENCH_SCRIPT;destination=(Join-Path $out 'workbench_v7.py')},
      @{path=$env:HB_WORKBENCH_SOURCE_ZIP;destination=(Join-Path $out 'source.zip')}
    )
    [Net.ServicePointManager]::SecurityProtocol=[Net.SecurityProtocolType]::Tls12
    foreach ($download in $downloads) {
      $downloaded=$false
      foreach ($delay in @(0,2,5)) {
        if ($delay -gt 0) { Start-Sleep -Seconds $delay }
        try {
          Invoke-WebRequest -UseBasicParsing -Uri "$assetBase/$($download.path)" -OutFile $download.destination -TimeoutSec 30
          if ((Get-Item -LiteralPath $download.destination).Length -le 0) { throw 'Empty source download.' }
          $downloaded=$true; break
        } catch { Log "Source download attempt failed: $($_.Exception.Message)" }
      }
      if (-not $downloaded) { throw "Pinned source download failed: $($download.path)" }
    }
    $sourceZip=Join-Path $out 'source.zip'
    $zipHash=(Get-FileHash -LiteralPath $sourceZip -Algorithm SHA256).Hash.ToLowerInvariant()
    if ($zipHash -ne $env:HB_WORKBENCH_SOURCE_SHA256) { throw 'Workbench source ZIP hash mismatch.' }
    $sourceDir=Join-Path $out 'source'
    Expand-Archive -LiteralPath $sourceZip -DestinationPath $sourceDir -Force
    $sourceBlend=Join-Path $sourceDir 'rough_timber_workbench_v4.blend'
    if (-not (Test-Path -LiteralPath $sourceBlend -PathType Leaf)) { throw 'Expected V4 editable workbench source is missing.' }
    $report.workbench=[ordered]@{
      source_repository='mrcalzon02/Tanks-for-bob-Fork';source_commit=$env:HB_WORKBENCH_COMMIT;
      script=$env:HB_WORKBENCH_SCRIPT;script_sha256=(Get-FileHash -LiteralPath (Join-Path $out 'workbench_v7.py') -Algorithm SHA256).Hash.ToLowerInvariant();
      source_zip=$env:HB_WORKBENCH_SOURCE_ZIP;source_zip_sha256=$zipHash;render='running'
    }
    Save-Checkpoint
    Log "Rendering workbench from pinned source $env:HB_WORKBENCH_COMMIT"
    Run-Tool 'workbench' $report.tools.blender '--background --factory-startup --python-exit-code 1 --python workbench_v7.py -- --source-blend source/rough_timber_workbench_v4.blend --output-dir . --render all' 1440
    if ((Get-Content (Join-Path $out 'workbench.stdout.txt') -Raw) -notmatch 'WORKBENCH_V7_OK') { throw 'Workbench export completion marker is missing.' }
    if (@(Get-ChildItem -LiteralPath $out -Filter '*.blend' -File).Count -eq 0) { throw 'Editable workbench output is missing.' }
    if (@(Get-ChildItem -LiteralPath $out -Filter '*.png' -File -Recurse).Count -eq 0) { throw 'Rendered workbench proof is missing.' }
    $report.workbench.render='passed'
    $report.changes+='Rendered pinned Tanks-for-Bob workbench source into this job-owned D: report directory.'
  }
  Stage 'git-test' { Run-Tool 'git-version' $report.tools.git '--version' }
  Stage 'java-compile-run' {
    'public class WorkerSmoke { public static void main(String[] args) { if (6*7 != 42) throw new AssertionError(); System.out.println("JAVA_WORKER_OK"); } }' | Set-Content -LiteralPath (Join-Path $out 'WorkerSmoke.java') -Encoding ascii
    Run-Tool 'javac' $report.tools.javac 'WorkerSmoke.java'
    Run-Tool 'java' $report.tools.java '-cp . WorkerSmoke'
    if ((Get-Content (Join-Path $out 'java.stdout.txt') -Raw) -notmatch 'JAVA_WORKER_OK') { throw 'Java success marker missing.' }
  }
  Stage 'python-runtime-venv' {
    $pythonSource=@'
import json, pathlib, subprocess, sys, venv
assert sum(range(10)) == 45
pathlib.Path('python-roundtrip.json').write_text(json.dumps({'answer': 42}), encoding='utf-8')
assert json.loads(pathlib.Path('python-roundtrip.json').read_text(encoding='utf-8'))['answer'] == 42
venv.EnvBuilder(with_pip=False).create('python-venv')
subprocess.run([str(pathlib.Path('python-venv/Scripts/python.exe').resolve()), '-I', '-c', 'print("VENV_WORKER_OK")'], check=True, timeout=20)
print(json.dumps({'python': sys.version, 'executable': sys.executable, 'venv': 'passed', 'file_roundtrip': 'passed'}))
print('PYTHON_WORKER_OK')
'@
    $pythonSource | Set-Content -LiteralPath (Join-Path $out 'python-smoke.py') -Encoding utf8
    Run-Tool 'python' $report.tools.python '-I python-smoke.py'
    if ((Get-Content (Join-Path $out 'python.stdout.txt') -Raw) -notmatch 'PYTHON_WORKER_OK') { throw 'Python success marker missing.' }
  }
  Stage 'blender-save-reopen-render' {
    $blenderSource=@'
import bpy, json, pathlib, sys
out = pathlib.Path.cwd()
bpy.ops.wm.read_factory_settings(use_empty=False)
scene = bpy.context.scene
scene.render.engine = 'CYCLES'
scene.cycles.device = 'CPU'
scene.cycles.samples = 4
scene.cycles.use_denoising = False
scene.render.threads_mode = 'FIXED'
scene.render.threads = 4
scene.render.resolution_x = 256
scene.render.resolution_y = 256
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = 'PNG'
scene.render.filepath = str(out / 'blender-proof.png')
bpy.ops.wm.save_as_mainfile(filepath=str(out / 'worker-smoke.blend'))
bpy.ops.wm.open_mainfile(filepath=str(out / 'worker-smoke.blend'))
bpy.ops.render.render(write_still=True)
png = out / 'blender-proof.png'
assert png.stat().st_size > 1000
assert png.read_bytes()[:8] == b'\x89PNG\r\n\x1a\n'
proof = {'blender': bpy.app.version_string, 'python': sys.version, 'saved_reopened': True, 'rendered': True, 'png_bytes': png.stat().st_size}
(out / 'blender-result.json').write_text(json.dumps(proof, indent=2), encoding='utf-8')
print('BLENDER_WORKER_OK')
'@
    $blenderSource | Set-Content -LiteralPath (Join-Path $out 'blender-smoke.py') -Encoding utf8
    Run-Tool 'blender' $report.tools.blender '--background --factory-startup --python-exit-code 1 --python blender-smoke.py' 120
    if (-not (Test-Path -LiteralPath (Join-Path $out 'blender-proof.png'))) { throw 'Blender render missing.' }
    if ((Get-Content (Join-Path $out 'blender.stdout.txt') -Raw) -notmatch 'BLENDER_WORKER_OK') { throw 'Blender success marker missing.' }
    $report.blender=Get-Content -LiteralPath (Join-Path $out 'blender-result.json') -Raw | ConvertFrom-Json
  }
  Stage 'model-store-validation' {
    $modelRoot='D:\AI-Relocation\Ollama\models'
    $manifestRoot=Join-Path $modelRoot 'manifests'
    $files=@(Get-ChildItem -LiteralPath $manifestRoot -File -Recurse -ErrorAction Stop)
    $report.model_store=[ordered]@{path=$modelRoot;manifest_count=$files.Count;manifests=@()}
    foreach ($file in $files) {
      $entry=[ordered]@{path=$file.FullName.Substring($manifestRoot.Length+1);valid=$false;missing_blobs=@()}
      try {
        $manifest=Get-Content -LiteralPath $file.FullName -Raw | ConvertFrom-Json
        $descriptors=@($manifest.config)+@($manifest.layers)
        if ($descriptors.Count -lt 2) { throw 'No model layers present.' }
        foreach ($descriptor in $descriptors) {
          if ($descriptor.digest -notmatch '^sha256:[0-9a-f]{64}$') { throw 'Invalid blob digest.' }
          $blob=Join-Path (Join-Path $modelRoot 'blobs') ($descriptor.digest.Replace(':','-'))
          if (-not (Test-Path -LiteralPath $blob -PathType Leaf)) { $entry.missing_blobs+=$descriptor.digest; continue }
          $info=Get-Item -LiteralPath $blob
          if ($info.Length -ne [long]$descriptor.size) { throw 'Blob size does not match manifest.' }
          $stream=[IO.File]::OpenRead($blob); try { [void]$stream.ReadByte() } finally { $stream.Dispose() }
        }
        $entry.valid=($entry.missing_blobs.Count -eq 0)
      } catch { $entry.error=$_.Exception.Message }
      $report.model_store.manifests+=$entry
    }
    Log "Found $($files.Count) model manifests on D:."
    if (@($report.model_store.manifests | Where-Object {$_.valid}).Count -eq 0) { throw 'No complete readable models found in relocated store; no changes or downloads attempted.' }
  }
  Stage 'local-inference' {
    if ($report.stages['model-store-validation'].status -ne 'passed') { throw 'Model-store validation must pass first.' }
    if (-not $report.tools.ollama) { throw 'Ollama executable not accessible to runner service.' }
    $os=Get-CimInstance Win32_OperatingSystem
    if ($os.FreePhysicalMemory -lt 8MB) { throw 'Less than 8 GiB free RAM; no inference started.' }
    $desktop=$null
    try { $desktop=Invoke-RestMethod -Uri 'http://127.0.0.1:11434/api/ps' -TimeoutSec 5 } catch { Log 'Desktop API not reachable; dedicated worker will be checked independently.' }
    if ($null -ne $desktop -and @($desktop.models).Count -gt 0) { throw 'Desktop Ollama has a loaded model; preserving desktop work, not competing for GPU.' }
    $listener=New-Object Net.Sockets.TcpListener([Net.IPAddress]::Loopback,11435)
    try { $listener.Start() } catch { throw 'Worker port 11435 already in use; refusing to stop or reuse an unknown server.' } finally { $listener.Stop() }
    $env:OLLAMA_MODELS='D:\AI-Relocation\Ollama\models'
    $env:OLLAMA_HOST='127.0.0.1:11435'
    $env:OLLAMA_NO_CLOUD='1'; $env:OLLAMA_NO_PRUNE='1'
    $env:OLLAMA_MAX_LOADED_MODELS='1'; $env:OLLAMA_NUM_PARALLEL='1'; $env:OLLAMA_CONTEXT_LENGTH='2048'; $env:OLLAMA_KEEP_ALIVE='30s'
    Log 'Starting job-owned Ollama on 127.0.0.1:11435 with explicit D: model store.'
    $script:ownedServer=Start-Process -FilePath $report.tools.ollama -ArgumentList 'serve' -WorkingDirectory $out -NoNewWindow -PassThru -RedirectStandardOutput (Join-Path $out 'ollama-server.stdout.txt') -RedirectStandardError (Join-Path $out 'ollama-server.stderr.txt')
    $endpoint='http://127.0.0.1:11435'; $tags=$null
    foreach ($delay in @(1,2,4,8,8)) {
      Start-Sleep -Seconds $delay
      $ownedServer.Refresh(); if ($ownedServer.HasExited) { throw 'Job-owned Ollama exited; inspect server logs.' }
      try { $tags=Invoke-RestMethod -Uri "$endpoint/api/tags" -TimeoutSec 5; break } catch { Log 'Worker API starting; bounded retry.' }
    }
    if ($null -eq $tags) { throw 'Worker API failed to start within bounded retries.' }
    $report.ollama=[ordered]@{endpoint=$endpoint;models=@($tags.models | Select-Object name,size);inference='not-run'}
    Save-Checkpoint
    $model=$tags.models | Where-Object {$_.size -gt 0 -and $_.size -le 5GB -and ($_.name -like 'llama3.2:3b*' -or $_.name -like 'qwen2.5:3b*' -or $_.name -eq 'qwen2.5:7b-instruct-q3_K_L')} | Sort-Object size | Select-Object -First 1
    if (-not $model) { throw 'Worker sees no approved small model; preserved store without downloading.' }
    Log "Running local structured-response test with $($model.name)."
    $request=@{model=$model.name;prompt='Return only this JSON object: {"ready":true,"answer":42}';format='json';stream=$false;keep_alive='30s';options=@{temperature=0;num_ctx=2048;num_predict=64;num_thread=8}} | ConvertTo-Json -Depth 6
    $timer=[Diagnostics.Stopwatch]::StartNew()
    $answer=Invoke-RestMethod -Uri "$endpoint/api/generate" -Method Post -ContentType 'application/json' -Body $request -TimeoutSec 180
    $timer.Stop()
    $answer | ConvertTo-Json -Depth 10 | Set-Content -LiteralPath (Join-Path $out 'inference-response.json') -Encoding utf8
    $decoded=$answer.response | ConvertFrom-Json
    if ($answer.done -ne $true -or $decoded.ready -ne $true -or $decoded.answer -ne 42) { throw 'Model did not pass exact structured-response test.' }
    $report.ollama.model=$model.name; $report.ollama.inference='passed'; $report.ollama.elapsed_seconds=[Math]::Round($timer.Elapsed.TotalSeconds,2)
    $report.ollama.eval_count=$answer.eval_count; $report.ollama.eval_duration_ns=$answer.eval_duration
    if ($answer.eval_duration -gt 0) { $report.ollama.tokens_per_second=[Math]::Round($answer.eval_count / ($answer.eval_duration/1e9),2) }
    $report.ollama.loaded_models=(Invoke-RestMethod -Uri "$endpoint/api/ps" -TimeoutSec 10).models
    $report.changes+='Explicit job-scoped model-store configuration; desktop Ollama left untouched.'
    Log "Inference passed in $($report.ollama.elapsed_seconds)s."
  }
} finally {
  if ($null -ne $ownedServer) {
    $ownedServer.Refresh()
    if (-not $ownedServer.HasExited) { Log 'Stopping only the Ollama process tree created by this job.'; & taskkill.exe /PID $ownedServer.Id /T /F | Out-Null }
  }
  $report.stage=if ($report.errors.Count -eq 0) {'selected-tests-passed'} else {'selected-tests-blocked'}
  $report.completed_utc=[DateTime]::UtcNow.ToString('o'); Save-Checkpoint
  $workResult=if ($report.errors.Count -eq 0) {'passed'} else {'blocked'}
  Update-Status @{Stage='work-finished';WorkResult=$workResult;Progress=@{};Errors=@($report.errors);Progressed=$true}
  $summary=@('# OLD-CORE30 local worker tests',"Mode: **$env:HB_MODE**", "Result: **$($report.stage)**",'',"Commit: $env:GITHUB_SHA",'', 'No applications or inference models installed; workbench mode downloads only its pinned project source.','', '| Test | Result |','|---|---|')
  foreach ($name in $report.stages.Keys) { $summary+="| $name | $($report.stages[$name].status) |" }
  $summary+=''; foreach ($errorMessage in $report.errors) {$summary+="- Blocker: $errorMessage"}
  $summary | Set-Content -LiteralPath (Join-Path $out 'SUMMARY.md') -Encoding utf8
  $summary | Out-File -FilePath $env:GITHUB_STEP_SUMMARY -Append -Encoding utf8
  Log "FINAL $($report.stage)"
}
if ($report.errors.Count -gt 0) { exit 1 }
