#requires -Version 5.1
[CmdletBinding(SupportsShouldProcess)]
param([ValidateSet('Essentials','Utilities','Retro','Emulators','Development')][string[]]$Profile = @('Essentials'))
. "$PSScriptRoot\Common.ps1"
Assert-Windows
Assert-Bundle $PSScriptRoot
if (-not (Get-Command winget.exe -ErrorAction SilentlyContinue)) {
    throw 'Install/update Microsoft App Installer to obtain winget, or use the official source links in the guide.'
}
$profiles = Get-Content -Encoding UTF8 -Raw -LiteralPath "$PSScriptRoot\profiles.json" | ConvertFrom-Json
foreach ($name in $Profile) {
    foreach ($id in $profiles.$name) {
        if ($PSCmdlet.ShouldProcess($id, 'Install from the Windows Package Manager winget source')) {
            Invoke-Native 'winget.exe' @('install','--id',$id,'--exact','--source','winget')
        }
    }
}
# License/source agreement prompts remain interactive; no acceptance flags are supplied.
