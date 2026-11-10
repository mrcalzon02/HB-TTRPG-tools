# FMPL v0.4.1 Super Greeble on the OLD-CORE30 runner.
# New derivative, immutable exact V04 source, one job, one canonical 45deg camera.
$ErrorActionPreference='Stop'
$ProgressPreference='SilentlyContinue'
if($env:RUNNER_NAME -ne 'OLD-CORE30-homebrew' -or $env:HB_MODE -ne 'fmpl-super-greeble'){
  throw 'Super Greeble requires the designated one-job self-hosted worker'
}
$root='D:\Runner\actions-runner'
$blender='C:\Program Files\Blender Foundation\Blender 5.2\blender.exe'
$python='C:\Program Files\Blender Foundation\Blender 5.2\5.2\python\bin\python.exe'
$git='C:\Program Files\Git\cmd\git.exe'
foreach($tool in @($blender,$python,$git)){
  if(-not (Test-Path -LiteralPath $tool -PathType Leaf)){throw "Existing tool missing: $tool"}
}
if(-not (Test-Path -LiteralPath (Join-Path $root '.runner') -PathType Leaf)){throw 'Runner configuration absent'}
$report=if($env:HB_REPORT_DIR){$env:HB_REPORT_DIR}else{
  Join-Path $root ("_homebrew\reports\{0}-{1}" -f $env:GITHUB_RUN_ID,$env:GITHUB_RUN_ATTEMPT)
}
$out=Join-Path $report 'fmpl-super-greeble'
$support=Join-Path $out 'support'
New-Item -ItemType Directory -Force -Path $report,$out,$support | Out-Null
"HB_REPORT_DIR=$report" | Out-File $env:GITHUB_ENV -Append -Encoding utf8
$state=[ordered]@{
 schema='fmpl.super-greeble.run.v1'
 run_id=$env:GITHUB_RUN_ID;runner=$env:RUNNER_NAME
 stage='preflight';status='running';error=$null
 started_utc=[DateTime]::UtcNow.ToString('o')
 source_sha256=$null;fmpl_pin=$null;private_donor='not-checked'
 source_preserved=$false;model_reopened=$false;glb_reimported=$false
 single_angle=$true;animation_frames=0;game_integrated=$false
 owner_visual_approval=$false
}
function Checkpoint([string]$stage){
  $state.stage=$stage
  $temp=Join-Path $report 'fmpl-super-greeble-status.tmp'
  $state | ConvertTo-Json -Depth 12 | Set-Content -LiteralPath $temp -Encoding utf8
  Move-Item -LiteralPath $temp -Destination (Join-Path $report 'fmpl-super-greeble-status.json') -Force
  Write-Host ('FMPL_SUPER_GREEBLE_STAGE '+$stage)
  if($env:HB_STATUS_SCRIPT -and (Test-Path -LiteralPath $env:HB_STATUS_SCRIPT)){
    try{
      . $env:HB_STATUS_SCRIPT
      Set-HBStatus -Directory $report -Stage ('fmpl-super-'+$stage) -Progress @{stage=$stage} -Progressed
    }catch{Write-Warning 'Live FMPL telemetry delayed; checkpoint remains local'}
  }
}
function Native([string]$exe,[string[]]$args){
  & $exe @args
  if($LASTEXITCODE -ne 0){throw "FMPL preflight command failed code $LASTEXITCODE"}
}
function Logged([string]$exe,[string[]]$args,[string]$log){
  $stdout=$log+'.stdout.txt'
  $stderr=$log+'.stderr.txt'
  $previous=$ErrorActionPreference
  $exitCode=-1
  try{
    $ErrorActionPreference='Continue'
    & $exe @args 1> $stdout 2> $stderr
    $exitCode=$LASTEXITCODE
  }finally{
    $ErrorActionPreference=$previous
  }
  if(Test-Path -LiteralPath $stdout){
    Get-Content -LiteralPath $stdout | Out-File -LiteralPath $log -Encoding utf8
  }
  if(Test-Path -LiteralPath $stderr){
    Get-Content -LiteralPath $stderr | Out-File -LiteralPath $log -Encoding utf8 -Append
  }
  if(Test-Path -LiteralPath $log){
    @(Get-Content -LiteralPath $log -Tail 45 -ErrorAction SilentlyContinue) | ForEach-Object {Write-Host $_}
  }
  if($exitCode -ne 0){
    $tail=@(Get-Content -LiteralPath $log -Tail 45 -ErrorAction SilentlyContinue) -join [Environment]::NewLine
    throw ("FMPL native stage failed "+$exitCode+" at "+$log+[Environment]::NewLine+$tail)
  }
}
function DownloadPinned([string]$repository,[string]$pin,[string]$relative,[string]$dest){
  if($pin -notmatch '^[a-f0-9]{40}$' -or $relative.Contains('..')){
    throw 'Unsafe GitHub pinned file reference'
  }
  New-Item -ItemType Directory -Force -Path (Split-Path -Parent $dest) | Out-Null
  $uri="https://raw.githubusercontent.com/$repository/$pin/$relative"
  $ok=$false
  foreach($delay in @(0,3,8)){
    if($delay -gt 0){Start-Sleep -Seconds $delay}
    try{
      Invoke-WebRequest -UseBasicParsing -Uri $uri -OutFile $dest -TimeoutSec 35
      if((Get-Item -LiteralPath $dest).Length -lt 10){throw 'Incomplete source'}
      $ok=$true;break
    }catch{Write-Warning ("Pinned FMPL reference retrieval retry: "+$relative)}
  }
  if(-not $ok){throw "Pinned reference unavailable "+$relative}
}
function FileHash([string]$file){
  if(-not (Test-Path -LiteralPath $file -PathType Leaf)){throw "Missing actual source $file"}
  return (Get-FileHash -LiteralPath $file -Algorithm SHA256).Hash.ToLowerInvariant()
}
try{
  Checkpoint 'preflight'
  if(@(Get-Process -Name blender -ErrorAction SilentlyContinue).Count -gt 0){
    throw 'Blender is already running: refuse competing renderer'
  }
  if((Get-CimInstance Win32_OperatingSystem).FreePhysicalMemory -lt 6*1024*1024){
    throw 'Less than 6GiB of available memory'
  }
  if((Get-PSDrive D).Free -lt 4GB){throw 'Insufficient D drive free space'}
  Native $python @('--version')
  Checkpoint 'pin-canonical-fmpl'
  $contract=Join-Path $support 'fmpl-consumer.json'
  DownloadPinned $env:GITHUB_REPOSITORY $env:GITHUB_SHA 'fmpl-consumer.json' $contract
  $cfg=Get-Content -LiteralPath $contract -Raw | ConvertFrom-Json
  if($cfg.schema -ne 'fmpl.consumer.v1' -or $cfg.module_repo -ne 'mrcalzon02/Tech-Priests'
       -or $cfg.module_version -ne '0.4.1'){
    throw 'Super Greeble requires pinned FMPL v0.4.1'
  }
  $pin=[string]$cfg.module_commit
  $state.fmpl_pin=$pin
  $fmpl=Join-Path $root ("_homebrew\fmpl-production\checkouts\tech-priests-"+$pin)
  if(-not (Test-Path -LiteralPath (Join-Path $fmpl '.git'))){
    New-Item -ItemType Directory -Force -Path $fmpl | Out-Null
    Native $git @('-C',$fmpl,'init')
    Native $git @('-C',$fmpl,'remote','add','origin','https://github.com/mrcalzon02/Tech-Priests.git')
    Native $git @('-C',$fmpl,'sparse-checkout','init','--no-cone')
  }
  Native $git @('-C',$fmpl,'sparse-checkout','set','/tools/fmpl/','/art/source-to-3d/shared-parts/','/art/source-to-3d/martian-bunker/src/v10/textures/')
  Native $git @('-C',$fmpl,'fetch','--filter=blob:none','--no-tags','--depth','1','origin',$pin)
  Native $git @('-C',$fmpl,'checkout','--detach',$pin)
  $head=(& $git -C $fmpl rev-parse HEAD).Trim()
  if($LASTEXITCODE -ne 0 -or $head -ne $pin){throw 'Pinned FMPL checkout mismatch'}
  Checkpoint 'registry-and-python-preflight'
  Native $python @((Join-Path $fmpl 'tools\fmpl\fmpl.py'),'validate','--root',$fmpl)
  Native $python @('-m','unittest','discover','-s',(Join-Path $fmpl 'tools\fmpl'),'-p','test_*.py')
  Native $python @((Join-Path $fmpl 'tools\fmpl\fmpl_consumer.py'),'--config',$contract,'--library-root',$fmpl)
  $build=Join-Path $fmpl 'tools\fmpl\production_smoke\super_greeble.py'
  $verify=Join-Path $fmpl 'tools\fmpl\production_smoke\verify_super_greeble.py'
  $pack=Join-Path $fmpl 'tools\fmpl\production_smoke\pack_super_greeble.py'
  Native $python @('-m','py_compile',$build,$verify,$pack)
  Checkpoint 'immutable-v04-model'
  $ledger=Get-Content -LiteralPath (Join-Path $fmpl 'tools\fmpl\checkpoints.json') -Raw | ConvertFrom-Json
  $sourceEvents=@($ledger.events | Where-Object {$_.event_id -eq 'fmpl-water-purifier-pipe-camera-42722511833-1'})
  if($sourceEvents.Count -ne 1){throw 'No canonical V04 source receipt in pinned FMPL'}
  $hash=[string]$sourceEvents[0].source_sha256
  $state.source_sha256=$hash
  $source=Join-Path $root '_homebrew\reports\42722511833-1\fmpl-production\water-purifier-fmpl-process.blend'
  if((FileHash $source) -ne $hash){throw 'Original machine source hash differs; no derivative will be created'}
  Checkpoint 'private-greebles-source-probe'
  # Only the exact previously authorized cache paths; no broad filesystem scan.
  $private=$env:FMPL_GREEBLES_BLEND
  if(-not $private){
    $candidate='D:\AI-Relocation\FMPL\sources\Greebles.blend'
    if(Test-Path -LiteralPath $candidate -PathType Leaf){$private=$candidate}
  }
  if($private -and (Test-Path -LiteralPath $private -PathType Leaf)){
    Native $python @((Join-Path $fmpl 'tools\fmpl\greebles\probe_source.py'),'--source',$private)
    $state.private_donor='verified-private-source; no unapproved donor geometry exported'
  }else{
    $private=''
    $state.private_donor='not locally cached; using only verified FMPL procedural machinery and materials'
  }
  Checkpoint 'super-greeble-model-construction'
  $scene=Join-Path $out 'water-purifier-fmpl-super.blend'
  $glb=Join-Path $out 'water-purifier-fmpl-super.glb'
  $idle=Join-Path $out 'super-greeble-idle.png'
  $working=Join-Path $out 'super-greeble-working.png'
  $receipt=Join-Path $out 'super-greeble-build.json'
  $readback=Join-Path $out 'super-greeble-verification.json'
  $modelArgs=@('--background','--threads','6','--python-exit-code','1',
    '--python',$build,'--','--source',$source,'--expected-sha',$hash,
    '--fmpl-root',$fmpl,'--out',$scene,'--glb',$glb,
    '--idle-preview',$idle,'--working-preview',$working,'--report',$receipt)
  if($private){$modelArgs+=@('--greebles-source',$private)}
  Logged $blender $modelArgs (Join-Path $out 'super-greeble-build.log')
  if(-not (Test-Path -LiteralPath $receipt -PathType Leaf)){
    throw 'No actual Blender Super Greeble construction receipt'
  }
  Checkpoint 'independent-blender-glb-reopen'
  Logged $blender @('--background','--threads','4','--python-exit-code','1',
      '--python',$verify,'--','--source',$source,'--blend',$scene,'--glb',$glb,
      '--build-receipt',$receipt,'--idle-preview',$idle,'--working-preview',$working,
      '--out',$readback) (Join-Path $out 'super-greeble-verify.log')
  $qa=Get-Content -LiteralPath $readback -Raw | ConvertFrom-Json
  if($qa.passed -ne $true -or $qa.original_meshes_preserved -ne 50 -or
      $qa.previous_process_meshes_preserved -ne 136 -or
      $qa.new_mechanical_detail_meshes -lt 85 -or
      $qa.source_pipe_annuli_preserved -ne $true){
    throw 'Super Greeble native mesh, source, port or material roundtrip was not proven'
  }
  $state.source_preserved=$true
  $state.model_reopened=$true
  $state.glb_reimported=$true
  Checkpoint 'single-angle-animated-sprite-capture'
  $tanks='mrcalzon02/Tanks-for-bob-Fork'
  $module=Get-Content -LiteralPath (Join-Path $fmpl 'tools\fmpl\FMPL.json') -Raw | ConvertFrom-Json
  $tanksPin=[string]$module.external_refs.'Tanks-for-bob-Fork'
  $spriteTools=Join-Path $support 'sprite-tools'
  foreach($script in @('render_sprite_frames.py','verify_sprite_master.py')){
    DownloadPinned $tanks $tanksPin ("tools/art/"+$script) (Join-Path $spriteTools $script)
  }
  $profile=Join-Path $out 'sprite-profile.json'
  $cfg=[ordered]@{
    schema=1;asset='fmpl-water-purifier-super-greeble';source='water-purifier-fmpl-super.blend'
    adapter=$null;source_size=256;sizes=@(64,128,256);samples=12;seed=4362
    columns=4;fps=8;directions=@(0);pivot=@(0,0,0)
    exclude_rotation=@();hide_render=@();animated_lights=@()
    states=[ordered]@{idle=@(1);working=@(1,13,25,37,49,61,73,85)}
  }
  $cfg | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $profile -Encoding ascii
  $sprites=Join-Path $out 'sprites'
  Logged $blender @('--background','--threads','4',$scene,'--python-exit-code','1',
      '--python',(Join-Path $spriteTools 'render_sprite_frames.py'),
      '--','--config',$profile,'--out',$sprites) (Join-Path $out 'sprite-render.log')
  Logged $blender @('--background','--threads','4',(Join-Path $sprites 'master.blend'),
      '--python-exit-code','1','--python',(Join-Path $spriteTools 'verify_sprite_master.py'),
      '--',$sprites) (Join-Path $out 'sprite-master-readback.log')
  Checkpoint 'native-idle-and-eight-working-atlases'
  Logged $blender @('--background','--threads','4','--python-exit-code','1',
      '--python',$pack,'--','--out',$sprites) (Join-Path $out 'sprite-pack.log')
  $spriteQa=Get-Content -LiteralPath (Join-Path $sprites 'super-greeble-qa.json') -Raw | ConvertFrom-Json
  if($spriteQa.passed -ne $true -or $spriteQa.unique_source_frames -ne 9 -or
      @($spriteQa.outputs).Count -ne 6 -or
      @($spriteQa.directions).Count -ne 1){
    throw 'One-angle animation frames or six sprite atlases incomplete'
  }
  $state.animation_frames=8
  Checkpoint 'final-proof-receipt'
  $built=Get-Content -LiteralPath $receipt -Raw | ConvertFrom-Json
  $final=[ordered]@{
    schema='fmpl.super-greeble.production-proof.v1'
    status='technically-verified-visual-review-pending'
    fmpl_pin=$pin;source_model_sha256=$hash
    refined_blend_sha256=$built.derived_blend_sha256
    exported_glb_sha256=$built.derived_glb_sha256
    new_mechanical_meshes=$qa.new_mechanical_detail_meshes
    glb_meshes=$qa.glb_meshes_reimported
    static_directions=1;working_animation_frames=8
    alpha_atlases=6;atlas_sizes=@(64,128,256)
    donor_status=$state.private_donor
    source_provenance_safe=$true
    actual_native_factorio_ports_verified=$false
    owner_visual_approval=$false
    game_integrated=$false
    github_run_url="https://github.com/$env:GITHUB_REPOSITORY/actions/runs/$env:GITHUB_RUN_ID"
  }
  $final | ConvertTo-Json -Depth 10 | Set-Content -LiteralPath (Join-Path $report 'FMPL_SUPER_GREEBLE_RESULTS.json') -Encoding utf8
  $final | ConvertTo-Json -Depth 10 | Set-Content -LiteralPath (Join-Path $out 'FMPL_SUPER_GREEBLE_RESULTS.json') -Encoding utf8
  $state.status='passed'
  Checkpoint 'verified-super-greeble-candidate'
  if($env:HB_STATUS_SCRIPT -and (Test-Path -LiteralPath $env:HB_STATUS_SCRIPT)){
    try{
      . $env:HB_STATUS_SCRIPT
      Set-HBStatus -Directory $report -Stage 'fmpl-verified-super-greeble-candidate' -WorkResult 'passed' -Progress @{new_meshes=$qa.new_mechanical_detail_meshes;working_frames=8;atlases=6} -Progressed
    }catch{Write-Warning 'Status telemetry delayed; native proof and Actions result remain authoritative'}
  }
  Write-Host ("FMPL_SUPER_GREEBLE_PASS new="+$qa.new_mechanical_detail_meshes+" single_angle=1 frames=8 native_atlases=6")
  exit 0
}catch{
  $state.status='blocked'
  $state.error=$_.Exception.Message
  Checkpoint 'blocked'
  Write-Host ('FMPL_SUPER_GREEBLE_BLOCKED '+$state.error)
  exit 1
}finally{
  $state.finished_utc=[DateTime]::UtcNow.ToString('o')
  Checkpoint $state.stage
}
