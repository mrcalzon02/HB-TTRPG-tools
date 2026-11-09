# FMPL atlas-only recovery. Uses EXACT native Blender and sprite checkpoints
# from an earlier verified run; never rebuilds a model or touches the old report.
$ErrorActionPreference='Stop'
$ProgressPreference='SilentlyContinue'
if($env:RUNNER_NAME -ne 'OLD-CORE30-homebrew' -or $env:HB_MODE -ne 'fmpl-atlas-resume'){
  throw 'Unapproved FMPL atlas recovery runner/mode'
}
$root='D:\Runner\actions-runner'
if(-not (Test-Path -LiteralPath (Join-Path $root '.runner'))){throw 'Runner config missing'}
$blender='C:\Program Files\Blender Foundation\Blender 5.2\blender.exe'
$python='C:\Program Files\Blender Foundation\Blender 5.2\5.2\python\bin\python.exe'
foreach($tool in @($blender,$python)){
  if(-not (Test-Path -LiteralPath $tool -PathType Leaf)){throw 'Existing Blender/Python missing'}
}
$sourceRun=42721689714
$prior=Join-Path $root ("_homebrew\reports\{0}-1\fmpl-production" -f $sourceRun)
$report=if($env:HB_REPORT_DIR){$env:HB_REPORT_DIR}else{
  Join-Path $root ("_homebrew\reports\{0}-{1}" -f $env:GITHUB_RUN_ID,$env:GITHUB_RUN_ATTEMPT)
}
$out=Join-Path $report 'fmpl-production'
New-Item -ItemType Directory -Force -Path $report | Out-Null
"HB_REPORT_DIR=$report" | Out-File $env:GITHUB_ENV -Append -Encoding utf8
$state=[ordered]@{
 schema='fmpl.atlas-recovery.v1';runner=$env:RUNNER_NAME
 source_run=$sourceRun;started_utc=[DateTime]::UtcNow.ToString('o')
 status='running';phase='preflight';error=$null;fmpl_commit=$null
 source_blend_verified=$false;glb_verified=$false;master_verified=$false
 output_verified=$false;game_integrated=$false;owner_approved=$false
}
function Checkpoint([string]$phase){
  $state.phase=$phase
  $temp=Join-Path $report 'fmpl-atlas-recovery-status.json.tmp'
  $state | ConvertTo-Json -Depth 9 | Set-Content -LiteralPath $temp -Encoding utf8
  Move-Item -LiteralPath $temp -Destination (Join-Path $report 'fmpl-atlas-recovery-status.json') -Force
  Write-Host ('FMPL_ATLAS_RESUME_PHASE '+$phase)
  if($env:HB_STATUS_SCRIPT -and (Test-Path -LiteralPath $env:HB_STATUS_SCRIPT)){
    try{
      . $env:HB_STATUS_SCRIPT
      Set-HBStatus -Directory $report -Stage ('fmpl-'+$phase) -Progress @{phase=$phase;source_run=$sourceRun} -Progressed
    }catch{Write-Warning 'Status update deferred, local receipt preserved'}
  }
}
function Verify-Hash([string]$file,[string]$expected){
  if(-not (Test-Path -LiteralPath $file -PathType Leaf)){throw "Missing immutable checkpoint: $file"}
  if($expected -notmatch '^[0-9a-fA-F]{64}$'){throw 'Invalid checkpoint SHA256'}
  $actual=(Get-FileHash -LiteralPath $file -Algorithm SHA256).Hash.ToLowerInvariant()
  if($actual -ne $expected.ToLowerInvariant()){throw "Immutable checkpoint changed: $file"}
}
function Download-Pinned([string]$pin,[string]$relative,[string]$dest){
  if($pin -notmatch '^[a-f0-9]{40}$' -or $relative.Contains('..')){throw 'Unsafe pinned file'}
  $uri="https://raw.githubusercontent.com/mrcalzon02/Tech-Priests/$pin/$relative"
  $fetched=$false
  foreach($delay in @(0,3,8)){
    if($delay -gt 0){Start-Sleep -Seconds $delay}
    try{
      Invoke-WebRequest -UseBasicParsing -Uri $uri -OutFile $dest -TimeoutSec 30
      if((Get-Item -LiteralPath $dest).Length -lt 250){throw 'Incomplete source'}
      $fetched=$true
      break
    }catch{Write-Warning 'Pinned FMPL packer fetch retry'}
  }
  if(-not $fetched){throw 'Pinned atlas packer download failed'}
}
try{
  Checkpoint 'preflight'
  if(@(Get-Process -Name blender -ErrorAction SilentlyContinue).Count -gt 0){
    throw 'Concurrent Blender process: refuse interference'
  }
  if(-not (Test-Path -LiteralPath $prior -PathType Container)){
    throw 'Earlier saved Blender/checkpoint source missing: no reconstruction attempted'
  }
  if(Test-Path -LiteralPath $out){throw 'Atlas recovery destination already exists'}
  if((Get-PSDrive D).Free -lt 2GB){throw 'Insufficient local output space'}
  Checkpoint 'acquire-current-pinned-packer'
  $consumer=Join-Path $report 'fmpl-consumer.json'
  Invoke-WebRequest -UseBasicParsing -Uri ("https://raw.githubusercontent.com/{0}/{1}/fmpl-consumer.json" -f $env:GITHUB_REPOSITORY,$env:GITHUB_SHA) -OutFile $consumer -TimeoutSec 30
  $cfg=Get-Content -LiteralPath $consumer -Raw | ConvertFrom-Json
  if($cfg.schema -ne 'fmpl.consumer.v1' -or $cfg.module_version -ne '0.4.0' -or
     $cfg.module_repo -ne 'mrcalzon02/Tech-Priests'){
    throw 'FMPL canonical consumer contract mismatch'
  }
  $pin=[string]$cfg.module_commit
  $state.fmpl_commit=$pin
  $packer=Join-Path $report 'fmpl-native-atlas-packer.py'
  Download-Pinned $pin 'tools/fmpl/production_smoke/pack_blender_atlases.py' $packer
  Checkpoint 'copy-hash-pinned-native-checkpoints'
  # Copy-on-write into this run only. Past run's .blend / GLB / frames remain untouched.
  Copy-Item -LiteralPath $prior -Destination $out -Recurse -Force
  $scene=Join-Path $out 'water-purifier-fmpl-process.blend'
  $glb=Join-Path $out 'water-purifier-fmpl-process.glb'
  $build=Get-Content -LiteralPath (Join-Path $out 'process-construction-receipt.json') -Raw | ConvertFrom-Json
  $independent=Get-Content -LiteralPath (Join-Path $out 'process-independent-readback.json') -Raw | ConvertFrom-Json
  if($build.source_mesh_count -ne 50 -or $build.process_meshes_added -lt 130 -or
     $build.grid_aligned_model_ports -ne $true -or $independent.passed -ne $true -or
     $independent.preserved_original_meshes -ne 50 -or $independent.reimported_glb_meshes -lt 170 -or
     $independent.one_canonical_factorio_camera -ne $true){
    throw 'Saved original Blender and full-bore pipe/camera acceptance is incomplete'
  }
  if(@($independent.centered_mating_faces).Count -ne 2){throw 'Missing true connected pipe annuli'}
  foreach($c in @($independent.centered_mating_faces)){
    if([double]$c.max_contact_residual_tiles -gt 0.00001 -or [int]$c.fastener_count -ne 8){
      throw 'Boiler-standard open bore and flange fitting verification not preserved'
    }
  }
  Verify-Hash $scene ([string]$build.derived_blend_sha256)
  Verify-Hash $glb ([string]$build.glb_sha256)
  Verify-Hash (Join-Path $out 'process-idle.png') ([string]$build.idle_render_sha256)
  Verify-Hash (Join-Path $out 'process-agitating.png') ([string]$build.active_render_sha256)
  $state.source_blend_verified=$true
  $state.glb_verified=$true
  $sprites=Join-Path $out 'sprites'
  $capture=Get-Content -LiteralPath (Join-Path $sprites 'capture.json') -Raw | ConvertFrom-Json
  $reopen=Get-Content -LiteralPath (Join-Path $sprites 'reopen-qa.json') -Raw | ConvertFrom-Json
  if(@($capture.config.directions).Count -ne 1 -or [int]$capture.config.directions[0] -ne 0 -or
     @($capture.frames).Count -ne 1 -or [bool]$reopen.passed -ne $true){
    throw 'Not a source-verified single-view Blender master'
  }
  Verify-Hash (Join-Path $sprites 'master.blend') ([string]$capture.master_sha256)
  foreach($frame in @($capture.frames)){
    Verify-Hash (Join-Path $sprites ([string]$frame.path)) ([string]$frame.sha256)
  }
  $state.master_verified=$true
  Checkpoint 'pack-only-single-angle'
  & $blender '--background' '--threads' '4' '--python-exit-code' '1' '--python' $packer '--' '--out' $sprites 2>&1 |
    Out-File -LiteralPath (Join-Path $out 'atlas-only-run.log') -Encoding utf8
  if($LASTEXITCODE -ne 0){
    $tail=@(Get-Content -LiteralPath (Join-Path $out 'atlas-only-run.log') -Tail 35) -join [Environment]::NewLine
    throw ("Blender native atlas pack failed: "+$tail)
  }
  $qa=Get-Content -LiteralPath (Join-Path $sprites 'qa.json') -Raw | ConvertFrom-Json
  if($qa.passed -ne $true -or [int]$qa.capture_count -ne 1 -or [int]$qa.direction_count -ne 1 -or
     [int]$qa.atlas_count -ne 3 -or @($qa.sheets).Count -ne 3){
    throw 'Native one-angle atlas failed frame/size/alpha checks'
  }
  foreach($sheet in @($qa.sheets)){
    Verify-Hash (Join-Path $sprites ([string]$sheet.path)) ([string]$sheet.sha256)
  }
  $state.output_verified=$true
  $result=[ordered]@{
    schema='fmpl.atlas-recovery-receipt.v1';status='verified-model-and-single-static-angle'
    source_run=$sourceRun;source_model_sha256=$build.derived_blend_sha256
    source_glb_sha256=$build.glb_sha256;source_meshes=50
    process_meshes=$build.process_meshes_added;glb_meshes=$independent.reimported_glb_meshes
    model_ports=@($independent.centered_mating_faces)
    camera='boiler-45deg-elevation-zero-azimuth'
    production_orientations=1;atlas_sizes=@(64,128,256)
    frame_source_sha256=$capture.master_sha256;fmpl_commit=$pin
    human_visual_review=$false;native_factorio_fluidbox_verified=$false
    game_integrated=$false;item_icon_accepted=$false
    github_previous_run_url="https://github.com/mrcalzon02/HB-TTRPG-tools/actions/runs/$sourceRun"
  }
  $result | ConvertTo-Json -Depth 12 | Set-Content -LiteralPath (Join-Path $report 'FMPL_ATLAS_RECOVERY_RESULTS.json') -Encoding utf8
  $state.status='passed'
  Checkpoint 'verified-native-atlas-delivered'
  if($env:HB_STATUS_SCRIPT -and (Test-Path -LiteralPath $env:HB_STATUS_SCRIPT)){
    . $env:HB_STATUS_SCRIPT
    Set-HBStatus -Directory $report -Stage 'fmpl-verified-native-atlas-delivered' -WorkResult 'passed' -Progress @{frames=1;atlases=3} -Progressed
  }
  Write-Host 'FMPL_ATLAS_RECOVERY_PASS: 1 canonical 45-degree frame, 64/128/256 real RGBA sprites; zero model rebuild'
  exit 0
}catch{
  $state.status='blocked'
  $state.error=$_.Exception.Message
  Checkpoint 'blocked'
  Write-Host ('FMPL_ATLAS_RECOVERY_BLOCKED '+$state.error)
  exit 1
}finally{
  $state.finished_utc=[DateTime]::UtcNow.ToString('o')
  Checkpoint $state.phase
}
