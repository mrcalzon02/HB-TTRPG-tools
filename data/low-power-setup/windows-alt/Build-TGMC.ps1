#requires -Version 5.1
[CmdletBinding()]
param()
. "$PSScriptRoot\Common.ps1"
Assert-Windows
Use-TGMCEnvironment $PSScriptRoot
Push-Location "$PSScriptRoot\project"
try {
    # Use the pinned portable Node directly; this avoids a second bootstrap download.
    Invoke-Native "$PSScriptRoot\tools\node-v22.11.0-win-x64\node.exe" @('tools\build\build.js')
} finally { Pop-Location }
