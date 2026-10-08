#requires -Version 5.1
[CmdletBinding()]
param([string]$Root = $PSScriptRoot)
. "$PSScriptRoot\Common.ps1"
Assert-Windows
$principal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    throw 'Run this protection helper once from an Administrator PowerShell. Run the game server later as your normal user.'
}
if (@(Get-NetFirewallProfile | Where-Object { -not $_.Enabled }).Count -gt 0) {
    throw 'All Windows Firewall profiles must already be enabled for this local-host protection.'
}
$program = [IO.Path]::GetFullPath((Join-Path $Root 'tools\byond\bin\dreamdaemon.exe'))
if (-not (Test-Path -LiteralPath $program)) { throw 'Install TGMC first.' }
$hasher = [Security.Cryptography.SHA256]::Create()
try { $key = ([BitConverter]::ToString($hasher.ComputeHash([Text.Encoding]::UTF8.GetBytes($program)))).Replace('-','').Substring(0,12) }
finally { $hasher.Dispose() }
$ruleName = "HB-TGMC-LocalOnly-$key"
# Block non-loopback peers for this executable across IPv4 and IPv6.
$remote = @('0.0.0.0-126.255.255.255','128.0.0.0-255.255.255.255','::2-ffff:ffff:ffff:ffff:ffff:ffff:ffff:ffff')
$existing = Get-NetFirewallRule -Name $ruleName -ErrorAction SilentlyContinue
if ($existing) { throw "Protection rule already exists: $ruleName. Inspect it rather than overwriting an existing rule." }
New-NetFirewallRule -Name $ruleName -DisplayName $ruleName -Direction Inbound -Action Block -Profile Any -Program $program -RemoteAddress $remote -Enabled True | Out-Null
Write-Host "Created application-scoped protection rule: $ruleName"
Write-Host 'No allow rule, port forwarding or firewall disablement was added. Test local connection before relying on it.'
