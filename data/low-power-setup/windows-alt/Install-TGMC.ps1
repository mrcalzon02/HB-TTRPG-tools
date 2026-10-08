#requires -Version 5.1
[CmdletBinding()]
param([string]$Destination = "$env:USERPROFILE\HB-map-dev\tgmc-windows",[switch]$CheckOnly)
. "$PSScriptRoot\Common.ps1"
Assert-Windows
Assert-Bundle $PSScriptRoot
foreach ($tool in 'git.exe','python.exe') {
    if (-not (Get-Command $tool -ErrorAction SilentlyContinue)) { throw "Missing $tool. Run Install-Applications.ps1 -Profile Development first, then reopen PowerShell." }
}
Invoke-Native 'python.exe' @('--version')
if ($CheckOnly) { Write-Host 'Bundle and prerequisites checked; no installation performed.'; return }
$root = New-SetupRoot $Destination
$manifest = Get-Content -Encoding UTF8 -Raw "$PSScriptRoot\downloads.json" | ConvertFrom-Json
$byond = Save-VerifiedDownload $manifest.byond "$root\downloads"
$strong = Save-VerifiedDownload $manifest.strongdmm "$root\downloads"
$node = Save-VerifiedDownload $manifest.node "$root\downloads"
$rustg = Save-VerifiedDownload $manifest.rustg "$root\downloads"
Expand-Archive -LiteralPath $byond -DestinationPath "$root\tools"
Expand-Archive -LiteralPath $strong -DestinationPath "$root\tools\StrongDMM"
Expand-Archive -LiteralPath $node -DestinationPath "$root\tools"
Invoke-Native 'git.exe' @('-c','core.longpaths=true','clone','https://github.com/tgstation/TerraGov-Marine-Corps.git',"$root\project")
Invoke-Native 'git.exe' @('-C',"$root\project",'checkout','--detach','d17228095d2bbc94359acaf7421119a60c672261')
Invoke-Native 'git.exe' @('-C',"$root\project",'config','core.longpaths','true')
Invoke-Native 'git.exe' @('-C',"$root\project",'submodule','update','--init','--recursive')
Copy-Item -Path "$PSScriptRoot\payload\tgmc\*" -Destination "$root\project" -Recurse -Force
Copy-Item -LiteralPath $rustg -Destination "$root\project\rust_g.dll"
Invoke-Native 'python.exe' @('-m','venv',"$root\tools\python")
Invoke-Native "$root\tools\python\Scripts\python.exe" @('-m','pip','install','bidict==0.23.1','Pillow==10.4.0')
foreach ($name in 'Common.ps1','Build-TGMC.ps1','Edit-TGMC.ps1','Server-TGMC.ps1','Client-TGMC.ps1','Protect-TGMC-Host.ps1','Backup-Maps.ps1') {
    Copy-Item -LiteralPath (Join-Path $PSScriptRoot $name) -Destination $root
}
Use-TGMCEnvironment $root
& "$root\Build-TGMC.ps1"
Write-Host "TGMC mapping environment installed: $root"
Write-Host 'Use Edit-TGMC.ps1 -Map vapor; see START-HERE.md for local hosting.'
