#requires -Version 5.1
[CmdletBinding()]
param([string]$Destination = "$env:USERPROFILE\HB-map-dev\ss14-windows",[switch]$CheckOnly)
. "$PSScriptRoot\Common.ps1"
Assert-Windows
Assert-Bundle $PSScriptRoot
foreach ($tool in 'git.exe','python.exe') {
    if (-not (Get-Command $tool -ErrorAction SilentlyContinue)) { throw "Missing $tool. Run Install-Applications.ps1 -Profile Development, then reopen PowerShell." }
}
Invoke-Native 'python.exe' @('--version')
if ($CheckOnly) { Write-Host 'Bundle and prerequisites checked; no installation performed.'; return }
$root = New-SetupRoot $Destination
$manifest = Get-Content -Encoding UTF8 -Raw "$PSScriptRoot\downloads.json" | ConvertFrom-Json
$sdk = Save-VerifiedDownload $manifest.dotnet "$root\downloads"
Expand-Archive -LiteralPath $sdk -DestinationPath "$root\tools\dotnet"
Invoke-Native 'git.exe' @('-c','core.longpaths=true','clone','https://github.com/space-wizards/space-station-14.git',"$root\project")
Invoke-Native 'git.exe' @('-C',"$root\project",'checkout','--detach','07c0caa76bf941d2a5ed53b827c0bc25f16eb162')
Invoke-Native 'git.exe' @('-C',"$root\project",'config','core.longpaths','true')
Invoke-Native 'git.exe' @('-C',"$root\project",'submodule','update','--init','--recursive')
Copy-Item -Path "$PSScriptRoot\payload\ss14\*" -Destination "$root\project" -Recurse -Force
foreach ($name in 'Common.ps1','Build-SS14.ps1','Edit-SS14.ps1','Server-SS14.ps1','Backup-Maps.ps1') {
    Copy-Item -LiteralPath (Join-Path $PSScriptRoot $name) -Destination $root
}
Use-SS14Environment $root
Push-Location "$root\project"
try { Invoke-Native 'python.exe' @('RUN_THIS.py') } finally { Pop-Location }
& "$root\Build-SS14.ps1"
Write-Host "SS14 mapping environment installed: $root"
Write-Host 'Start Server-SS14.ps1, then Edit-SS14.ps1 -Map vapor in another terminal.'
