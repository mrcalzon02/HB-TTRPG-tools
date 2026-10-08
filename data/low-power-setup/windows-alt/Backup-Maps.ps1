#requires -Version 5.1
[CmdletBinding()]
param([ValidateSet('TGMC','SS14')][string]$Environment)
. "$PSScriptRoot\Common.ps1"
Assert-Windows
if (-not $Environment) {
    if (Test-Path "$PSScriptRoot\project\tgmc.dme") { $Environment = 'TGMC' }
    elseif (Test-Path "$PSScriptRoot\project\Content.Server") { $Environment = 'SS14' }
    else { throw 'Run this helper from an installed development folder.' }
}
$stamp = (Get-Date -Format 'yyyy-MM-dd_HH-mm-ss') + '-' + [Guid]::NewGuid().ToString('N').Substring(0,8)
$stage = Join-Path $PSScriptRoot "backups\staging-$stamp"
New-Item -ItemType Directory -Path $stage -Force | Out-Null
if ($Environment -eq 'TGMC') {
    Copy-Item "$PSScriptRoot\project\_maps" $stage -Recurse
    Copy-Item "$PSScriptRoot\project\code\game\objects\machinery\doors\airlock.dm" $stage
    Copy-Item "$PSScriptRoot\project\config\dev_overrides.txt" $stage
} else {
    Copy-Item "$PSScriptRoot\project\Resources\Maps\TGMC" "$stage\TGMC" -Recurse
    Copy-Item "$PSScriptRoot\project\Resources\Prototypes\Maps\tgmc-local.yml" $stage
    Copy-Item "$PSScriptRoot\server-data" "$stage\server-data" -Recurse
}
$zip = Join-Path $PSScriptRoot "backups\maps-$stamp.zip"
Compress-Archive -Path "$stage\*" -DestinationPath $zip
(Get-FileHash -LiteralPath $zip -Algorithm SHA256).Hash.ToLowerInvariant() + '  ' + (Split-Path $zip -Leaf) | Set-Content -LiteralPath "$zip.sha256"
Remove-Item -LiteralPath $stage -Recurse -Force
Write-Host $zip
