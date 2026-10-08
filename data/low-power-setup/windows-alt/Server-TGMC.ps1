#requires -Version 5.1
[CmdletBinding()]
param([ValidateSet('tyson','hamburg','ourang','vapor')][string]$Map = 'vapor')
. "$PSScriptRoot\Common.ps1"
Assert-Windows
$name = Get-MapName $Map
$program = [IO.Path]::GetFullPath("$PSScriptRoot\tools\byond\bin\dreamdaemon.exe")
$rules = @(Get-NetFirewallApplicationFilter -PolicyStore ActiveStore -Program $program -ErrorAction SilentlyContinue | Get-NetFirewallRule | Where-Object { $_.Name -like 'HB-TGMC-LocalOnly-*' -and $_.Enabled -eq 'True' -and $_.Action -eq 'Block' })
if ($rules.Count -eq 0 -or @(Get-NetFirewallProfile | Where-Object { -not $_.Enabled }).Count -gt 0) {
    throw 'Run Protect-TGMC-Host.ps1 once as Administrator and keep the firewall enabled before starting this private host.'
}
$expectedRemote = @('0.0.0.0-126.255.255.255','128.0.0.0-255.255.255.255','::2-ffff:ffff:ffff:ffff:ffff:ffff:ffff:ffff')
$protected = $false
foreach ($rule in $rules) {
    if ($rule.Direction -ne 'Inbound' -or $rule.Profile -ne 'Any') { continue }
    $actual = @(($rule | Get-NetFirewallAddressFilter).RemoteAddress)
    if ($actual.Count -eq 3 -and @(Compare-Object $expectedRemote $actual).Count -eq 0) { $protected = $true }
}
if (-not $protected) { throw 'The installed host protection rule does not match the expected address scope; inspect it before hosting.' }
$slug = @{tyson='tyson_station';hamburg='port_hamburg';ourang='ss_ourang_medan';vapor='vapor_processing'}[$Map]
& "$PSScriptRoot\Build-TGMC.ps1"
Push-Location "$PSScriptRoot\project"
try {
    New-Item -ItemType Directory -Path 'data' -Force | Out-Null
    Copy-Item -LiteralPath "_maps\$slug.json" -Destination 'data\next_map.json' -Force
    Write-Host 'TGMC: byond://127.0.0.1:14000. Close DreamDaemon to stop hosting.'
    Invoke-Native $program @('tgmc.dmb','14000','-invisible','-trusted','-console')
} finally { Pop-Location }
