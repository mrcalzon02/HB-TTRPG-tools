# Single bounded OLD-CORE30 one-tile Workbench graphics verification. No inference.
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
if ($env:RUNNER_NAME -ne 'OLD-CORE30-homebrew') { throw 'Not the approved old-core30 runner.' }
if ($env:HB_MODE -ne 'workbench-size') { throw 'Wrong runner mode.' }
$root='D:\Runner\actions-runner'
if (-not (Test-Path -LiteralPath "$root\.runner")) { throw 'Runner config not found.' }
$report=$env:HB_REPORT_DIR
if (-not $report) { $report=Join-Path $root ("_homebrew\reports\{0}-{1}" -f $env:GITHUB_RUN_ID,$env:GITHUB_RUN_ATTEMPT) }
$inputs=Join-Path $report 'workbench-one-tile'
$assets=Join-Path $inputs 'graphics\entity\workbench-v8-one-tile'
New-Item -ItemType Directory -Force -Path $inputs,$assets | Out-Null
"HB_REPORT_DIR=$report" | Out-File -FilePath $env:GITHUB_ENV -Append -Encoding utf8
$reportFile=Join-Path $report 'workbench-one-tile-run-report.json'
$repo='mrcalzon02/Tanks-for-bob-Fork'
$revision='3f38f801631a88460bca5599616edb0173f4a970'
function Download-Pinned([string]$relative,[string]$dest,[string]$sha,[int]$attempts=3) {
  $url="https://raw.githubusercontent.com/$repo/$revision/$relative"
  $parent=Split-Path -Parent $dest
  New-Item -ItemType Directory -Force -Path $parent | Out-Null
  $fetched=$false
  foreach ($delay in @(0,2,6)) {
    if ($delay -gt 0) { Start-Sleep -Seconds $delay }
    try {
      Invoke-WebRequest -UseBasicParsing -Uri $url -OutFile $dest -TimeoutSec 35
      if ((Get-Item -LiteralPath $dest).Length -lt 5) { throw 'Empty download' }
      if ($sha) {
        $actual=(Get-FileHash -LiteralPath $dest -Algorithm SHA256).Hash.ToLowerInvariant()
        if ($actual -ne $sha) { throw "Hash mismatch $relative" }
      }
      $fetched=$true;break
    } catch { Write-Warning "Download retry: $relative" }
  }
  if (-not $fetched) { throw "Pinned source retrieval failed: $relative" }
}
$record=[ordered]@{schema='workbench-one-tile-run-v1';runner=$env:RUNNER_NAME;source_commit=$revision;started_utc=[DateTime]::UtcNow.ToString('o');status='running';total_files=0;test_mode='one bounded graphics audit';game_visual_review='not_performed'}
$code=1
try {
  $python=$null
  foreach ($candidate in @('C:\Program Files\Blender Foundation\Blender 5.2\5.2\python\bin\python.exe','C:\Program Files\Python313\python.exe')) {
    if (Test-Path -LiteralPath $candidate -PathType Leaf) { $python=$candidate;break }
  }
  if (-not $python) { $cmd=Get-Command python -CommandType Application -ErrorAction SilentlyContinue; if ($cmd) { $python=$cmd.Source } }
  if (-not $python) { throw 'No existing usable Python interpreter (read-only test; no install).' }
  $record.python=$python
  & $python --version
  if ($LASTEXITCODE -ne 0) { throw 'Python executable failed version smoke test.' }
  $sourceRoot='tanks_for_bob_fork_1.8.102'
  $manifestPath=Join-Path $assets 'manifest.json'
  Download-Pinned "$sourceRoot/graphics/entity/workbench-v8-one-tile/manifest.json" $manifestPath $null
  $manifest=Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json
  $record.scale=$manifest.scale; $record.shift=$manifest.shift
  foreach ($dir in @('north','east','south','west')) {
    $entry=$manifest.per_direction.$dir
    foreach ($kind in @('idle','working')) {
      $name="$kind-$dir.png"
      $hash=if ($kind -eq 'idle') {$entry.idle_png_sha256} else {$entry.working_atlas_sha256}
      Download-Pinned "$sourceRoot/graphics/entity/workbench-v8-one-tile/$name" (Join-Path $assets $name) $hash
      $record.total_files++
    }
  }
  Download-Pinned "$sourceRoot/data-final-fixes.lua" (Join-Path $inputs 'data-final-fixes.lua') $null
  Download-Pinned "$sourceRoot/info.json" (Join-Path $inputs 'info.json') $null
  # Independent verification is a verified script from the running HB repository commit.
  $validator=Join-Path $inputs 'verify_one_tile.py'
  $validatorUri="https://raw.githubusercontent.com/$env:GITHUB_REPOSITORY/$env:GITHUB_SHA/tools/local-worker/verify_one_tile.py"
  Invoke-WebRequest -UseBasicParsing -Uri $validatorUri -OutFile $validator -TimeoutSec 30
  $verifyPath=Join-Path $report 'workbench-one-tile-verification.json'
  & $python $validator --assets $assets --lua (Join-Path $inputs 'data-final-fixes.lua') --info (Join-Path $inputs 'info.json') --out $verifyPath
  if ($LASTEXITCODE -ne 0 -or -not (Test-Path -LiteralPath $verifyPath)) { throw 'One-tile sprite audit failed.' }
  $validation=Get-Content -LiteralPath $verifyPath -Raw | ConvertFrom-Json
  if ($validation.passed -ne $true -or $validation.total_verified_cells -ne 384) { throw 'Sprite QA result not accepted.' }
  # Copy genuine Blender comparison proofs as visual evidence, not synthetic success.
  foreach ($suffix in @('rest','impact')) {
    $name="workbench_v7_one_tile_${suffix}_proof.png"
    Download-Pinned "docs/art/workbench-v8-one-tile/$name" (Join-Path $report $name) $null
  }
  # Optional read-only Factorio executable/version inventory. Never launch a save or change mods.
  $factorioPaths=@('C:\Program Files\Factorio\bin\x64\factorio.exe','C:\Program Files (x86)\Steam\steamapps\common\Factorio\bin\x64\factorio.exe','D:\SteamLibrary\steamapps\common\Factorio\bin\x64\factorio.exe')
  $found=@($factorioPaths | Where-Object {Test-Path -LiteralPath $_ -PathType Leaf})
  $record.factorio_executable_found=($found.Count -gt 0)
  $record.test_result='384 cells verified, all four idle frames within one tile, unchanged gameplay properties'
  $record.status='passed';$code=0
  Write-Host 'WORKBENCH_ONE_TILE_RUN_PASS: 1x1 selection, 384 exact alpha-verified frames, real V7 proof.'
} catch {
  $record.status='blocked';$record.error=$_.Exception.Message
  Write-Host ('WORKBENCH_ONE_TILE_RUN_BLOCKED: '+$record.error)
} finally {
  $record.finished_utc=[DateTime]::UtcNow.ToString('o')
  $record | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath $reportFile -Encoding utf8
  $summary=@('# Workbench V8 one-tile sprite check','',"Status: **$($record.status)**", "Pinned source: $revision", '', 'Art-only; graphical-client appearance still requires native review.')
  if ($record.error) {$summary+="Blocker: $($record.error)"}
  $summary | Set-Content -LiteralPath (Join-Path $report 'workbench-one-tile-summary.md') -Encoding utf8
}
exit $code
