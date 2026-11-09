# FMPL production smoke: reuse one OLD-CORE30 job. Never modify source scenes or game.
$ErrorActionPreference='Stop'
$ProgressPreference='SilentlyContinue'
if($env:RUNNER_NAME -ne 'OLD-CORE30-homebrew' -or $env:HB_MODE -ne 'fmpl-production'){throw 'Wrong FMPL worker or mode'}
$root='D:\Runner\actions-runner'
if(-not (Test-Path -LiteralPath (Join-Path $root '.runner'))){throw 'Runner config missing'}
$blender='C:\Program Files\Blender Foundation\Blender 5.2\blender.exe'
$python='C:\Program Files\Blender Foundation\Blender 5.2\5.2\python\bin\python.exe'
$git='C:\Program Files\Git\cmd\git.exe'
foreach($t in @($blender,$python,$git)){if(-not (Test-Path -LiteralPath $t -PathType Leaf)){throw "Missing existing tool: $t"}}
$report=if($env:HB_REPORT_DIR){$env:HB_REPORT_DIR}else{Join-Path $root ("_homebrew\reports\{0}-{1}" -f $env:GITHUB_RUN_ID,$env:GITHUB_RUN_ATTEMPT)}
$out=Join-Path $report 'fmpl-production'
$support=Join-Path $out 'support'
New-Item -ItemType Directory -Force -Path $report,$out,$support | Out-Null
"HB_REPORT_DIR=$report" | Out-File $env:GITHUB_ENV -Append -Encoding utf8
$state=[ordered]@{schema='fmpl.production-run.v1';status='running';phase='preflight';started_utc=[DateTime]::UtcNow.ToString('o');repo_commit=$env:GITHUB_SHA;fmpl_sha=$null;candidate_sha=$null;error=$null;private_greebles='not-tested';owner_approved=$false;native_game_verified=$false}
function Checkpoint([string]$phase){
  $state.phase=$phase
  $p=Join-Path $report 'fmpl-worker-status.json.tmp'
  $state | ConvertTo-Json -Depth 9 | Set-Content -LiteralPath $p -Encoding utf8
  Move-Item -LiteralPath $p -Destination (Join-Path $report 'fmpl-worker-status.json') -Force
  Write-Host ('FMPL_PHASE '+$phase)
  if($env:HB_STATUS_SCRIPT -and (Test-Path -LiteralPath $env:HB_STATUS_SCRIPT -PathType Leaf)){
    try{
      . $env:HB_STATUS_SCRIPT
      Set-HBStatus -Directory $report -Stage ("fmpl-"+$phase) -Progress @{phase=$phase} -Progressed
    }catch{Write-Warning 'Live FMPL status publication delayed; stage receipt remains local'}
  }
}
function Native([string]$exe,[string[]]$commands){
  & $exe @commands
  if($LASTEXITCODE -ne 0){throw "Native step failed $LASTEXITCODE : $exe"}
}
function Logged([string]$exe,[string[]]$commands,[string]$log){
  & $exe @commands *>&1 | Tee-Object -FilePath $log
  $code=$LASTEXITCODE
  if($code -ne 0){
    $tail=@(Get-Content -LiteralPath $log -Tail 28 -ErrorAction SilentlyContinue) -join [Environment]::NewLine
    throw ("FMPL native step exited "+$code+" in "+$log+[Environment]::NewLine+$tail)
  }
}
function GetPinned([string]$repository,[string]$pin,[string]$relative,[string]$dest,[string]$hash=''){
  if($relative.Contains('..') -or $pin -notmatch '^[0-9a-f]{40}$'){throw 'Invalid pin/source'}
  $url="https://raw.githubusercontent.com/$repository/$pin/$relative"
  New-Item -ItemType Directory -Force -Path (Split-Path -Parent $dest) | Out-Null
  $ok=$false
  foreach($delay in @(0,3,8)){
    if($delay -gt 0){Start-Sleep -Seconds $delay}
    try{
      Invoke-WebRequest -UseBasicParsing -Uri $url -OutFile $dest -TimeoutSec 40
      if((Get-Item -LiteralPath $dest).Length -lt 5){throw 'Empty source'}
      if($hash -and (Get-FileHash -LiteralPath $dest -Algorithm SHA256).Hash.ToLowerInvariant() -ne $hash){throw 'Source hash mismatch'}
      $ok=$true;break
    }catch{Write-Warning ("FMPL retry "+$relative)}
  }
  if(-not $ok){throw "Pinned download failed: $relative"}
}
try{
  Checkpoint 'environment'
  Native $python @('--version')
  if(@(Get-Process -Name blender -ErrorAction SilentlyContinue).Count -gt 0){throw 'Blender occupied; no competing renderer'}
  if((Get-CimInstance Win32_OperatingSystem).FreePhysicalMemory -lt 6*1024*1024){throw 'Low free RAM'}
  if((Get-PSDrive D).Free -lt 4GB){throw 'Low D drive space'}
  Checkpoint 'get-pinned-fmpl'
  $consumer=Join-Path $support 'fmpl-consumer.json'
  GetPinned $env:GITHUB_REPOSITORY $env:GITHUB_SHA 'fmpl-consumer.json' $consumer
  $cfg=Get-Content -LiteralPath $consumer -Raw | ConvertFrom-Json
  if($cfg.schema -ne 'fmpl.consumer.v1' -or $cfg.module_repo -ne 'mrcalzon02/Tech-Priests'){throw 'Invalid consumer'}
  $pin=[string]$cfg.module_commit
  $state.fmpl_sha=$pin
  $fmpl=Join-Path $root ("_homebrew\fmpl-production\checkouts\tech-priests-"+$pin)
  if(-not (Test-Path -LiteralPath (Join-Path $fmpl '.git'))){
    New-Item -ItemType Directory -Force -Path $fmpl | Out-Null
    Native $git @('-C',$fmpl,'init')
    Native $git @('-C',$fmpl,'remote','add','origin','https://github.com/mrcalzon02/Tech-Priests.git')
    Native $git @('-C',$fmpl,'sparse-checkout','init','--no-cone')
  }
  # Sparse checkout by itself does not reduce transferred blobs.
  # Partial-clone filter is mandatory for the large Tech-Priests source tree.
  Native $git @('-C',$fmpl,'sparse-checkout','set','/tools/fmpl/','/art/source-to-3d/shared-parts/','/art/source-to-3d/martian-bunker/src/v10/textures/')
  Native $git @('-C',$fmpl,'fetch','--filter=blob:none','--no-tags','--depth','1','origin',$pin)
  Native $git @('-C',$fmpl,'checkout','--detach',$pin)
  $head=(& $git -C $fmpl rev-parse HEAD).Trim()
  if($LASTEXITCODE -ne 0 -or $head -ne $pin){throw 'FMPL checkout does not match exact consumer revision'}
  Checkpoint 'registry-and-tests'
  Native $python @((Join-Path $fmpl 'tools\fmpl\fmpl.py'),'validate','--root',$fmpl)
  Native $python @('-m','unittest','discover','-s',(Join-Path $fmpl 'tools\fmpl'),'-p','test_*.py')
  Native $python @((Join-Path $fmpl 'tools\fmpl\fmpl_consumer.py'),'--config',$consumer,'--library-root',$fmpl)
  Native $python @('-c','from PIL import Image; print("PILLOW_READY",Image.__version__)')
  $ledger=Get-Content -LiteralPath (Join-Path $fmpl 'tools\fmpl\checkpoints.json') -Raw | ConvertFrom-Json
  $event=@($ledger.events | Where-Object {$_.event_id -eq 'hb-mh7-water-purifier-42698350899-1'})
  if($event.Count -ne 1){throw 'Pinned Water Purifier source receipt absent'}
  $hash=[string]$event[0].source_sha256
  $state.candidate_sha=$hash
  $candidate=Join-Path $root '_homebrew\refinery-mh7\goal-pilot\goal-04-controls_service\water-purifier-pilot.blend'
  if(-not (Test-Path -LiteralPath $candidate -PathType Leaf)){throw 'Water Purifier verified candidate absent'}
  if((Get-FileHash -LiteralPath $candidate -Algorithm SHA256).Hash.ToLowerInvariant() -ne $hash){throw 'Source Blender candidate changed'}
  Checkpoint 'pinned-reference-and-export-scripts'
  $tanks='mrcalzon02/Tanks-for-bob-Fork'
  $tanksPin='3f38f801631a88460bca5599616edb0173f4a970'
  $jig=Join-Path $support 'factorio-fluid-interface-reference.blend'
  GetPinned $tanks $tanksPin 'models/reference/factorio-fluid-interface/factorio-fluid-interface-reference.blend' $jig 'af6d1d74f0439b327b0b4e496386aa35fdac0859c177b55707dbfb5243e691ca'
  $jigHelper=Join-Path $support 'append_reference.py'
  GetPinned $tanks $tanksPin 'models/reference/factorio-fluid-interface/append_reference.py' $jigHelper
  $export=Join-Path $support 'sprite-tools'
  foreach($name in @('export_sprites.py','render_sprite_frames.py','verify_sprite_master.py')){
    GetPinned $tanks $tanksPin ("tools/art/"+$name) (Join-Path $export $name)
  }
  if($env:FMPL_GREEBLES_BLEND -and (Test-Path -LiteralPath $env:FMPL_GREEBLES_BLEND -PathType Leaf)){
    Native $python @((Join-Path $fmpl 'tools\fmpl\greebles\probe_source.py'),'--source',$env:FMPL_GREEBLES_BLEND)
    $state.private_greebles='pinned-source-probed; not merged into this machine'
  }else{$state.private_greebles='private donor not cached locally; skipped'}
  Checkpoint 'blender-pbr-and-fluid'
  $build=Join-Path $fmpl 'tools\fmpl\production_smoke\blender_build.py'
  $verify=Join-Path $fmpl 'tools\fmpl\production_smoke\verify_build.py'
  $scene=Join-Path $out 'water-purifier-fmpl-test.blend'
  $glb=Join-Path $out 'water-purifier-fmpl-test.glb'
  $preview=Join-Path $out 'water-purifier-fmpl-preview.png'
  $receipt=Join-Path $out 'build-receipt.json'
  $proof=Join-Path $out 'roundtrip-verification.json'
  Logged $blender @('--background','--threads','6','--python-exit-code','1','--python',$build,'--',
     '--source',$candidate,'--expected-sha',$hash,'--fmpl-root',$fmpl,
     '--pipe-reference',$jig,'--pipe-helper',$jigHelper,'--out',$scene,'--glb',$glb,
     '--preview',$preview,'--report',$receipt) (Join-Path $out 'blender-build.log')
  if(-not (Test-Path -LiteralPath $receipt)){throw 'Blender scene produced no build receipt'}
  Checkpoint 'native-reopen-glb-reimport'
  Logged $blender @('--background','--threads','4','--python-exit-code','1','--python',$verify,
     '--','--blend',$scene,'--glb',$glb,'--build-report',$receipt,'--out',$proof) (Join-Path $out 'roundtrip.log')
  $roundtrip=Get-Content -LiteralPath $proof -Raw | ConvertFrom-Json
  if($roundtrip.passed -ne $true){throw 'Independent GLB readback failed'}
  Checkpoint 'four-direction-sprite-export'
  $profile=Join-Path $out 'sprite-profile.json'
  $p=[ordered]@{schema=1;asset='fmpl-water-purifier';source='water-purifier-fmpl-test.blend';adapter=$null;
    source_size=256;sizes=@(64,128,256);samples=12;seed=4362;columns=4;fps=8;
    directions=@(0,90,180,270);pivot=@(0,0,0);exclude_rotation=@();hide_render=@();animated_lights=@();
    states=@{idle=@(1)}}
  $p | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $profile -Encoding utf8
  $sprites=Join-Path $out 'sprites'
  Logged $python @((Join-Path $export 'export_sprites.py'),'--config',$profile,'--out',$sprites,'--blender',$blender) (Join-Path $out 'sprite-export.log')
  $qa=Get-Content -LiteralPath (Join-Path $sprites 'qa.json') -Raw | ConvertFrom-Json
  $reopen=Get-Content -LiteralPath (Join-Path $sprites 'reopen-qa.json') -Raw | ConvertFrom-Json
  if($qa.passed -ne $true -or $qa.capture_count -ne 4 -or $qa.atlas_count -ne 3 -or $reopen.passed -ne $true){
    throw 'Four direction frames / alpha / atlas / master readback failed'
  }
  Checkpoint 'final-receipt'
  $b=Get-Content -LiteralPath $receipt -Raw | ConvertFrom-Json
  $result=[ordered]@{schema='fmpl.production-test.v1';status='candidate-production-proof';
    fmpl_commit=$pin;candidate_sha256=$hash;derived_blend_sha256=$b.derivative_blend_sha256;
    glb_sha256=$b.exported_glb_sha256;pbr_presets=$b.pbr_presets_imported;
    four_direction_frames=4;atlases=3;sizes=@(64,128,256);
    native_blend_reopened=$true;glb_reimported=$true;pipe_reference_count=2;
    external_greebles=$state.private_greebles;owner_approved=$false;native_ports_verified=$false;game_integrated=$false}
  $result | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath (Join-Path $report 'FMPL_PRODUCTION_RESULTS.json') -Encoding utf8
  $result | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath (Join-Path $out 'FMPL_PRODUCTION_RESULTS.json') -Encoding utf8
  $state.status='passed'
  Checkpoint 'candidate-produced-and-audited'
  Write-Host 'FMPL_PRODUCTION_PASS: real Blender source, 7 PBR materials, 2 pipe jigs, GLB, four directions, 3 atlases'
  exit 0
}catch{
  $state.status='blocked';$state.error=$_.Exception.Message
  Checkpoint 'blocked'
  Write-Host ('FMPL_PRODUCTION_BLOCKED '+$state.error)
  exit 1
}finally{
  $state.finished_utc=[DateTime]::UtcNow.ToString('o')
  Checkpoint $state.phase
}
