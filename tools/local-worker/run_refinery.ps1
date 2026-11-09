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
function Exec([string]$exe,[string[]]$commandArgs) {
  if (-not $exe -or -not $commandArgs -or $commandArgs.Count -eq 0) { throw 'Missing command executable or arguments.' }
  Write-Host ("MH7 EXEC {0} {1}" -f (Split-Path -Leaf $exe), ($commandArgs -join ' '))
  & $exe @commandArgs
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
  $ollama=Find-Executable 'ollama' @('C:\Program Files\Ollama\ollama.exe','C:\Program Files (x86)\Ollama\ollama.exe','C:\Users\*\AppData\Local\Programs\Ollama\ollama.exe','C:\Users\*\AppData\Local\Ollama\ollama.exe','D:\AI-Relocation\Ollama\ollama.exe','D:\Ollama\ollama.exe')
  if (-not $ollama) {
    # Ollama is known to be installed in a user's per-profile Programs directory.
    # Enumerating C:\Users or hidden AppData can fail for a service account.
    # Read only registered local profile paths from WMI, never profile contents,
    # settings, passwords, tokens or the owner's Cline configuration.
    try {
      $profiles=@(Get-CimInstance -ClassName Win32_UserProfile -ErrorAction Stop |
        Where-Object {$_.LocalPath -like 'C:\Users\*' -and -not $_.Special})
      Write-Host ("MH7 Registered user profiles examined: {0}" -f $profiles.Count)
      foreach ($profile in $profiles) {
        $candidate=Join-Path -Path $profile.LocalPath -ChildPath 'AppData\Local\Programs\Ollama\ollama.exe'
        # File.Exists returns false on access denial rather than throwing;
        # do not try to grant ourselves access or enumerate a private directory.
        if ([System.IO.File]::Exists($candidate)) {
          $ollama=$candidate
          Write-Host 'MH7 Discovered executable at a registered user Ollama installation.'
          break
        }
      }
    } catch {
      Write-Warning 'MH7 Service account cannot query Windows user-profile records; falling back to process-image discovery.'
    }
  }
  if (-not $ollama) {
    # Existing process ownership/discovery only. No process is killed, restarted or reconfigured.
    try {
      $running=@(Get-CimInstance Win32_Process -Filter "Name='ollama.exe'" -ErrorAction SilentlyContinue |
        Where-Object {$_.ExecutablePath -and (Test-Path -LiteralPath $_.ExecutablePath -PathType Leaf)})
      if ($running.Count -gt 0) { $ollama=$running[0].ExecutablePath; Write-Host "MH7 Resolved installed Ollama from running process: $ollama" }
    } catch { Write-Warning 'Ollama process image path unavailable to service account.' }
  }
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
  # Prefer an existing idle local Ollama API even when the service-account PATH lacks ollama.exe.
  # Never preempt an active model owned by the desktop user.
  $desktop=$null
  try {$desktop=Invoke-RestMethod -Uri 'http://127.0.0.1:11434/api/ps' -TimeoutSec 5} catch {}
  $desktopBusy=($null -ne $desktop -and @($desktop.models).Count -gt 0)
  $reportState['inference_discovery']=@{desktop_busy=$desktopBusy;ollama_executable_found=($null -ne $ollama);reused_desktop_service=$false}
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
  # Inspect only the known relocated model store, not arbitrary user drives.
  $foundManifests=@()
  $manifestRoot=Join-Path $modelStore 'manifests'
  if (Test-Path -LiteralPath $manifestRoot -PathType Container) {
    $foundManifests=@(Get-ChildItem -LiteralPath $manifestRoot -Recurse -File -ErrorAction SilentlyContinue |
      Select-Object -First 30 | ForEach-Object {$_.FullName.Substring($manifestRoot.Length).TrimStart('\')})
  }
  $reportState['inference_discovery'].relocated_model_store_present=(Test-Path -LiteralPath $modelStore -PathType Container)
  $reportState['inference_discovery'].model_manifest_hints=$foundManifests
  $reportState['inference_discovery'].ollama_executable_found=($null -ne $ollama)
  $reportState['inference_discovery'].ollama_executable_source=if ($ollama) {'discovered_installed_path'} else {'missing'}
  $selected=[pscustomobject]@{name='none-scripted-baseline';size=0}
  $endpoint='none'
  $tags=$null
  if (-not $desktopBusy) {
    try {
      $tags=Invoke-RestMethod -Uri 'http://127.0.0.1:11434/api/tags' -TimeoutSec 6
      $endpoint='http://127.0.0.1:11434'
      $reportState['inference_discovery'].reused_desktop_service=$true
      Write-Host 'MH7 Existing idle Ollama API found on 11434; executable not required.'
    } catch { Write-Host 'MH7 No existing reachable desktop Ollama API.' }
  }
  if ((-not $tags -or @($tags.models).Count -eq 0) -and -not $desktopBusy -and $ollama -and (Test-Path -LiteralPath $modelStore -PathType Container)) {
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
    # Reserve 6GiB for the OS/Blender, and avoid memory-exhausting 20GiB variants on this 32GiB host.
    $budget=[Math]::Min([double](14GB),[Math]::Max([double]0,([double]$os.FreePhysicalMemory * [double]1024 - [double](6GB))))
    $reportState['inference_discovery'].available_model_names=@($tags.models | Select-Object -ExpandProperty name)
    $reportState['inference_discovery'].budget_bytes=[long]$budget
    $candidates=@($tags.models | Where-Object {$_.size -gt 0 -and $_.size -le $budget -and $_.name -match '(?i)qwen.*coder'} | Sort-Object size -Descending)
    if ($candidates.Count -eq 0) { $candidates=@($tags.models | Where-Object {$_.size -gt 0 -and $_.size -le $budget -and $_.name -match '(?i)qwen'} | Sort-Object size -Descending) }
    if ($candidates.Count -gt 0) { $selected=$candidates[0] }
  }
  # Do not run the deterministic baseline again: the seven native source candidates
  # already exist. This execution is allowed to modify a model ONLY after Qwen
  # is actually loaded and returns a valid structured reply.
  if ($selected.name -eq 'none-scripted-baseline') {
    $reportState['inference_warning']='No usable Qwen model is visible at the isolated/local Ollama API; original seven Blender baselines stay untouched.'
    throw $reportState['inference_warning']
  }
  $reportState.phase='qwen-smoke'
  $smokeBody=@{
    model=$selected.name
    prompt='Reply with only a JSON object containing exactly ready true and answer 42.'
    format='json'
    stream=$false
    keep_alive='30s'
    options=@{temperature=0;num_ctx=2048;num_predict=96;num_thread=8}
  } | ConvertTo-Json -Depth 8
  try {
    $smoke=Invoke-RestMethod -Method Post -Uri ($endpoint.TrimEnd('/')+'/api/generate') -ContentType 'application/json' -Body $smokeBody -TimeoutSec 300
    if ($smoke.done -ne $true) { throw 'No completion marker from Qwen.' }
    $smokeJson=$smoke.response | ConvertFrom-Json -ErrorAction Stop
    if ($smokeJson.ready -ne $true -or [int]$smokeJson.answer -ne 42) { throw 'Qwen returned the wrong structured result.' }
    $reportState['qwen_smoke']=@{success=$true;model=$selected.name;endpoint=$endpoint;eval_count=$smoke.eval_count;completed=$smoke.done}
    Write-Host ('MH7_QWEN_SMOKE_PASSED '+$selected.name)
  } catch {
    $reportState['qwen_smoke']=@{success=$false;model=$selected.name;message=$_.Exception.Message}
    throw ('Qwen inference preflight failed without touching Blender: '+$_.Exception.Message)
  }
  $reportState.model=$selected.name
  $reportState['model_size_bytes']=$selected.size
  $reportState.phase='construction'
  $reportState | ConvertTo-Json -Depth 7 | Set-Content -LiteralPath (Join-Path $report 'refinery-preflight.json') -Encoding utf8
  # Preserve the actual seven previously constructed native scenes in this new
  # artifact without rerendering or mutating their source checkpoints.
  if ($selected.name -eq 'none-scripted-baseline') {
    $rescue=[ordered]@{machine_ids=@();missing=@();copied_files=0;status='baseline_recovery'}
    foreach ($machine in @('water-purifier','electrolyzer','hydrogen-compressor','metallization-crucible','pelletization-forge','pressure-vessel-fabricator','canister-assembler')) {
      $from=Join-Path $results ('machines\'+$machine)
      $cpPath=Join-Path $from 'CHECKPOINT.json'
      if (-not (Test-Path -LiteralPath $cpPath)) { $rescue.missing+=($machine+':checkpoint');continue }
      try {
        $cp=Get-Content -LiteralPath $cpPath -Raw | ConvertFrom-Json
        $glb=Join-Path $from ($machine+'.glb')
        $blend=Join-Path $from ($machine+'.blend')
        $preview=Join-Path $from 'inspection_3quarter.png'
        if ($cp.state -ne 'model_verified' -or
            -not (Test-Path $glb) -or -not (Test-Path $blend) -or -not (Test-Path $preview) -or
            (Get-FileHash -LiteralPath $glb -Algorithm SHA256).Hash.ToLowerInvariant() -ne $cp.glb_sha256 -or
            (Get-FileHash -LiteralPath $blend -Algorithm SHA256).Hash.ToLowerInvariant() -ne $cp.blend_sha256 -or
            (Get-FileHash -LiteralPath $preview -Algorithm SHA256).Hash.ToLowerInvariant() -ne $cp.preview_sha256) {
          $rescue.missing+=($machine+':hash_or_model_invalid');continue
        }
        $to=Join-Path $report ('machines\'+$machine)
        New-Item -ItemType Directory -Force -Path $to | Out-Null
        foreach ($f in @($machine+'.glb',$machine+'.blend','inspection_3quarter.png','CHECKPOINT.json','verified_model.json','build_receipt.json','inference_receipt.json','parts_extracted.json')) {
          $src=Join-Path $from $f
          if (Test-Path -LiteralPath $src) {Copy-Item -LiteralPath $src -Destination (Join-Path $to $f) -Force;$rescue.copied_files++}
        }
        $rescue.machine_ids+= $machine
      } catch { $rescue.missing+=($machine+':verification_error') }
    }
    $rescue | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath (Join-Path $report 'baseline-recovery.json') -Encoding utf8
    Write-Host ('MH7 PRESERVED PREEXISTING BLENDS '+@($rescue.machine_ids).Count+'/7; no render duplication')
  }
  $maxMachines=if ($selected.name -eq 'none-scripted-baseline') {'1'} else {'7'}
  Publish 'refinery-agent-starting' @{stage='Blender-construction';model=$selected.name;complete=0;total=[int]$maxMachines}
  $args=@((Join-Path $scriptDir 'drive_refinery.py'),'--repo',$source,'--out',$results,'--report',$report,
      '--blender',$blender,'--endpoint',$endpoint,'--model',$selected.name,
      '--source-sha',$pin,'--max-machines',$maxMachines)
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
  # Start-Process on some Windows PowerShell/runner hosts returns no ExitCode
  # after the native process exits. Validate the durable written completion
  # receipt and every reported candidate before interpreting an absent code.
  $agent.WaitForExit();$agent.Refresh()
  $exitCode=$agent.ExitCode
  if ($null -eq $exitCode) {
    $receiptPath=Join-Path $report 'RESULTS.json'
    if (-not (Test-Path -LiteralPath $receiptPath)) { throw 'Agent exit code missing and RESULTS.json missing; no success claim.' }
    $receipt=Get-Content -LiteralPath $receiptPath -Raw | ConvertFrom-Json
    if (@($receipt.blocked).Count -gt 0 -or @($receipt.completed).Count -eq 0) { throw 'Agent exit code missing; outcome blocked or no completed candidates.' }
    if ($receipt.scripted_baseline_only -or $receipt.full_completion -ne $true) { throw 'Agent exit code missing; Qwen-complete seven-model receipt not verified.' }
    if (@($receipt.completed).Count -ne 7) { throw 'Agent exit code missing; not all seven candidates verified.' }
    foreach ($machine in @($receipt.completed)) {
      $candidateDir=Join-Path $report ("machines\{0}" -f $machine)
      foreach ($asset in @('CHECKPOINT.json','verified_model.json','inspection_3quarter.png',"$machine.glb", "$machine.blend")) {
        if (-not (Test-Path -LiteralPath (Join-Path $candidateDir $asset))) { throw "Agent exit code missing; candidate evidence absent for $machine : $asset" }
      }
    }
    Write-Warning 'Native process ExitCode unavailable, but RESULTS.json and each reported model read back; treating as verified candidate only.'
    $exitCode=0
    $reportState['exit_verification']='receipt_and_machine_files_verified_not_native_exit_code'
  }
  $reportState.phase='completed';$reportState['agent_exit']=$exitCode
  if ($exitCode -ne 0) {throw "Refinery agent returned $exitCode, preserve completed outputs and report blockers."}
  Publish 'refinery-finished' @{stage='candidate-models-produced';process_alive=$false;total=[int]$maxMachines;inference_model=$selected.name}
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
