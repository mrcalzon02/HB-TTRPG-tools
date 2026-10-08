#requires -Version 5.1
[CmdletBinding()]
param([ValidateSet('tyson','hamburg','ourang','vapor')][string]$Map = 'vapor')
. "$PSScriptRoot\Common.ps1"
Assert-Windows
Use-SS14Environment $PSScriptRoot
$name = Get-MapName $Map
Write-Host "For paused editing enter: mapping 1000 Maps/TGMC/$name.yml false"
Write-Host 'Save: savemap 1000 my-map-edited.yml. F5 entities; F6 tiles; F7 admin tools.'
Push-Location "$PSScriptRoot\project"
try {
    Invoke-Native 'dotnet.exe' @('run','--project','Content.Client','--configuration','Tools','--no-build','--no-restore','--','--username','Mapper','--connect','--connect-address','127.0.0.1:1212','--cvar','display.vsync=false','--cvar','display.max_fps=30','--cvar','discord.enabled=false')
} finally { Pop-Location }
