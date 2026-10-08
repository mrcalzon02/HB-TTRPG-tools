#requires -Version 5.1
[CmdletBinding()]
param([ValidateSet('tyson','hamburg','ourang','vapor')][string]$Map = 'vapor',[switch]$Play)
. "$PSScriptRoot\Common.ps1"
Assert-Windows
Use-SS14Environment $PSScriptRoot
$name = Get-MapName $Map
$prototype = 'TGMCMappingsDepot'
if ($Play) { $prototype = 'TGMC' + $name.Replace('_','') }
Push-Location "$PSScriptRoot\project"
try {
    Write-Host 'Local SS14 host: 127.0.0.1:1212. Wait for Ready, then launch Edit-SS14.ps1. Ctrl+C stops it.'
    Invoke-Native 'dotnet.exe' @('run','--project','Content.Server','--configuration','Tools','--no-build','--no-restore','--','--data-dir',"$PSScriptRoot\server-data",'--cvar','net.bindto=127.0.0.1','--cvar','net.port=1212','--cvar','status.bind=127.0.0.1:1212','--cvar','hub.advertise=false','--cvar','auth.mode=0','--cvar',"game.map=$prototype",'--cvar','game.defaultpreset=Sandbox','--cvar','game.lobbyenabled=false')
} finally { Pop-Location }
