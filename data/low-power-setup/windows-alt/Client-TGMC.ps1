#requires -Version 5.1
[CmdletBinding()]
param()
. "$PSScriptRoot\Common.ps1"
Assert-Windows
& "$PSScriptRoot\tools\byond\bin\dreamseeker.exe" 'byond://127.0.0.1:14000'
