#requires -Version 5.1
[CmdletBinding()]
param([ValidateSet('tyson','hamburg','ourang','vapor')][string]$Map = 'vapor')
. "$PSScriptRoot\Common.ps1"
Assert-Windows
$name = Get-MapName $Map
Use-TGMCEnvironment $PSScriptRoot
Push-Location "$PSScriptRoot\project"
try {
    & "$PSScriptRoot\tools\StrongDMM\StrongDMM.exe" "$PSScriptRoot\project\tgmc.dme" "$PSScriptRoot\project\_maps\map_files\$name\$name.dmm"
} finally { Pop-Location }
