# TP-MH7 Water Purifier: one bounded inference-guided construction pilot.
# Resumable measured native-source inspection; retain all existing verified goals and evidence.
# This is a tool-owning GitHub Actions runner under the existing single concurrency group.
# No installs, no changed user ACLs, no model downloads and no desktop Ollama takeover.
$ErrorActionPreference='Stop'
$ProgressPreference='SilentlyContinue'
if ($env:RUNNER_NAME -ne 'OLD-CORE30-homebrew') { throw 'MH7 goal pilot refused a non-designated runner.' }
if ($env:HB_MODE -ne 'refinery-pilot') { throw 'MH7 goal pilot requires explicit refinery-pilot mode.' }
$root='D:\Runner\actions-runner'
if (-not (Test-Path -LiteralPath (Join-Path $root '.runner') -PathType Leaf)) { throw 'Expected local runner configuration missing.' }
$report=if ($env:HB_REPORT_DIR) {$env:HB_REPORT_DIR} else {Join-Path $root ("_homebrew\reports\{0}-{1}" -f $env:GITHUB_RUN_ID,$env:GITHUB_RUN_ATTEMPT)}
$source=Join-Path $root '_homebrew\refinery-mh7\checkout\Tech-Priests'
$output=Join-Path $root '_homebrew\refinery-mh7\goal-pilot'
$baseline=Join-Path $root '_homebrew\refinery-mh7\output\machines\water-purifier\water-purifier.blend'
$baselineCp=Join-Path $root '_homebrew\refinery-mh7\output\machines\water-purifier\CHECKPOINT.json'
$toolsDir=Join-Path $report 'goal-pilot-sources'
New-Item -ItemType Directory -Force -Path $report,$toolsDir,$output | Out-Null
$env:HB_REPORT_DIR=$report
"HB_REPORT_DIR=$report" | Out-File -FilePath $env:GITHUB_ENV -Append -Encoding utf8
$summary=@{order='TP-MH7';target='water-purifier';mode='goal-pilot';start_utc=[DateTime]::UtcNow.ToString('o');phase='preflight';model=$null;error=$null;blender=$null;inference_api='http://127.0.0.1:11435';candidate_path=$null}
function Checkpoint([string]$phase) {
  $summary.phase=$phase
  $temp=Join-Path $report 'pilot-worker-status.json.tmp'
  ($summary | ConvertTo-Json -Depth 7) | Set-Content -LiteralPath $temp -Encoding utf8
  Move-Item -LiteralPath $temp -Destination (Join-Path $report 'pilot-worker-status.json') -Force
  Write-Host ('TPMH7_GOAL_PILOT_PHASE '+$phase)
}
function Native([string]$exe,[string[]]$args) {
  & $exe @args
  if($LASTEXITCODE -ne 0) {throw "Command failed (exit=$LASTEXITCODE): $exe"}
}
try {
  Checkpoint 'resolve-existing-tools'
  $blender='C:\Program Files\Blender Foundation\Blender 5.2\blender.exe'
  $python='C:\Program Files\Blender Foundation\Blender 5.2\5.2\python\bin\python.exe'
  $git='C:\Program Files\Git\cmd\git.exe'
  foreach($t in @($blender,$python,$git)) {if(-not (Test-Path -LiteralPath $t -PathType Leaf)) {throw "Missing existing runner tool: $t"}}
  Native $python @('--version')
  $summary.blender=$blender
  if (@(Get-Process -Name blender -ErrorAction SilentlyContinue).Count -gt 0) {throw 'Other Blender process exists: refusing overlapping renderer.'}
  $os=Get-CimInstance Win32_OperatingSystem
  if ($os.FreePhysicalMemory -lt (6*1024*1024)) {throw 'Less than 6GiB free RAM on the runner.'}
  if((Get-PSDrive -Name D).Free -lt 4GB) {throw 'Insufficient D: disk space for saved native scenes.'}
  Checkpoint 'verify-preserved-baseline'
  if(-not (Test-Path -LiteralPath $baseline -PathType Leaf) -or -not (Test-Path -LiteralPath $baselineCp -PathType Leaf)) {throw 'Original saved Water Purifier and checkpoint are missing.'}
  $cp=Get-Content -LiteralPath $baselineCp -Raw | ConvertFrom-Json
  $baselineHash=(Get-FileHash -LiteralPath $baseline -Algorithm SHA256).Hash.ToLowerInvariant()
  if ($cp.state -ne 'model_verified' -or $cp.blend_sha256 -ne $baselineHash) {throw 'Saved Water Purifier source does not match durable checkpoint.'}
  $pin='23204d88d55cb22314e56ba962fe3ce3f357dfa3'
  if(-not (Test-Path -LiteralPath (Join-Path $source '.git'))) {throw 'Pinned Tech-Priests source checkout is missing; do not rebuild or overwrite unrelated checkout.'}
  $head=(& $git -C $source rev-parse HEAD).Trim()
  if ($head -ne $pin) {throw "Wrong pinned Tech-Priests checkout $head; refusing geometry edits."}
  $validator=Join-Path $source 'docs\art\metallic-hydrogen-chain\validate_packet.py'
  Native $python @($validator)
  Checkpoint 'probe-external-qwen'
  # Only use the separately owner-started isolated service, never desktop API 11434.
  $endpoint='http://127.0.0.1:11435'
  try {$tags=Invoke-RestMethod -Uri "$endpoint/api/tags" -TimeoutSec 6}
  catch {throw 'Owner-started Ollama endpoint 11435 is not running. No model or Blender work started.'}
  try {$ps=Invoke-RestMethod -Uri "$endpoint/api/ps" -TimeoutSec 6}
  catch {throw 'Ollama /api/ps failed; refusing shared or unknown service.'}
  $busyModels=@($ps.models | Where-Object {$_ -and $_.name})
  if ($busyModels.Count -gt 0) {throw 'Inference model already loaded by another owner process; refusing to compete.'}
  $selected=@($tags.models | Where-Object {$_.name -match '(?i)qwen.*coder' -and $_.size -gt 0 -and $_.size -le 10GB} | Sort-Object size -Descending | Select-Object -First 1)
  if($selected.Count -eq 0) {throw 'No installed Qwen Coder <=10GiB exposed by isolated owner service. No model downloaded.'}
  $model=$selected[0].name
  $summary.model=$model
  Checkpoint 'qwen-structured-smoke'
  $smoke=@{model=$model;prompt='Return exactly the JSON object {"ready":true,"answer":42}';format='json';stream=$false;keep_alive='30s';options=@{temperature=0;num_ctx=2048;num_predict=64;num_thread=8}} | ConvertTo-Json -Depth 6
  try {
    $res=Invoke-RestMethod -Method Post -Uri "$endpoint/api/generate" -ContentType 'application/json' -Body $smoke -TimeoutSec 300
    $parsed=$res.response | ConvertFrom-Json
    if($res.done -ne $true -or $parsed.ready -ne $true -or [int]$parsed.answer -ne 42) {throw 'Qwen returned an invalid smoke response'}
    Write-Host ('TPMH7_QWEN_READY '+$model)
  } catch {throw ('Qwen smoke test failed; no Blender edits: '+$_.Exception.Message)}
  Checkpoint 'fetch-trusted-pilot-sources'
  [Net.ServicePointManager]::SecurityProtocol=[Net.SecurityProtocolType]::Tls12
  foreach($name in @('goal_water_purifier.py','refine_existing_purifier.py','verify_machine.py','inspect_baseline.py')) {
    $uri="https://raw.githubusercontent.com/$env:GITHUB_REPOSITORY/$env:GITHUB_SHA/tools/refinery-agent/$name"
    $dest=Join-Path $toolsDir $name
    $found=$false
    foreach($wait in @(0,2,5)) {
      if($wait -gt 0) {Start-Sleep -Seconds $wait}
      try {Invoke-WebRequest -UseBasicParsing -Uri $uri -OutFile $dest -TimeoutSec 25
           if((Get-Item -LiteralPath $dest).Length -lt 300) {throw 'Truncated helper'}
           $found=$true;break} catch {Write-Warning "Pinned helper request failed $name"}
    }
    if(-not $found) {throw "Unable to fetch pinned goal-pilot source: $name"}
  }
  $summary.candidate_path=$output
  Checkpoint 'run-one-water-purifier-pilot'
  $args=@((Join-Path $toolsDir 'goal_water_purifier.py'),
      '--baseline',$baseline,'--baseline-checkpoint',$baselineCp,
      '--repo',$source,'--out',$output,'--report',$report,
      '--blender',$blender,'--endpoint',$endpoint,'--model',$model,'--source-sha',$pin)
  $log=Join-Path $report 'pilot-controller.log'
  # Direct native invocation retains LASTEXITCODE on Windows PowerShell;
  # the controller records per-goal durable progress and model/render evidence.
  & $python @args *>&1 | Tee-Object -FilePath $log
  $code=$LASTEXITCODE
  if($code -ne 0) {throw "Goal pilot exited $code. See controller log and preserved checkpoints."}
  $receipt=Join-Path $report 'GOAL_RESULTS.json'
  if(-not (Test-Path -LiteralPath $receipt)) {throw 'Controller returned zero without verified result receipt.'}
  $result=Get-Content -LiteralPath $receipt -Raw | ConvertFrom-Json
  if($result.state -ne 'candidate_goal_pilot' -or $result.qwen_goals_completed -ne 4 -or
     $result.human_visual_approval -ne $false -or $result.game_integrated -ne $false) {
    throw 'Unexpected controller result. Not accepting inference-only completion claims.'
  }
  Checkpoint 'candidate-saved-awaiting-human-review'
  Write-Host ('TPMH7_GOAL_PILOT_SAVED model='+$model)
  exit 0
} catch {
  $summary.error=$_.Exception.Message
  Checkpoint 'blocked'
  Write-Host ('TPMH7_GOAL_PILOT_BLOCKED '+$summary.error)
  exit 1
}
