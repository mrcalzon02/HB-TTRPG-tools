#requires -Version 5.1
[CmdletBinding()]
param()
. "$PSScriptRoot\Common.ps1"
Assert-Windows
Use-SS14Environment $PSScriptRoot
Push-Location "$PSScriptRoot\project"
try {
    foreach ($project in 'Content.Server','Content.Client') {
        Invoke-Native 'dotnet.exe' @('build',$project,'--configuration','Tools','--maxcpucount:1','-p:UseSharedCompilation=false')
    }
} finally { Pop-Location }
