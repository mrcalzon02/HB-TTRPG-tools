#requires -version 5.1
<#
.SYNOPSIS
    Register the HB-TTRPG local workbench in the current Windows user's Start Menu.
.DESCRIPTION
    Creates only one per-user shortcut. Does not start a background service,
    install models, upload files, or modify security/antivirus configuration.
.EXAMPLE
    powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\local-hub\install-windows.ps1
.EXAMPLE
    powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\local-hub\install-windows.ps1 -Uninstall
#>
[CmdletBinding()]
param([switch]$Uninstall)
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
if (-not $env:APPDATA) { throw 'Windows APPDATA is required for a per-user Start Menu shortcut.' }
$repo = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$launcher = Join-Path $PSScriptRoot 'start-local-hub.ps1'
$programs = Join-Path $env:APPDATA 'Microsoft\Windows\Start Menu\Programs'
$shortcut = Join-Path $programs 'HB-TTRPG Local Workbench.lnk'
if ($Uninstall) {
    if (Test-Path -LiteralPath $shortcut) {
        Remove-Item -LiteralPath $shortcut -Force
        Write-Host "Removed only the local workbench Start Menu shortcut: $shortcut" -ForegroundColor Green
    } else { Write-Host 'The workbench shortcut is not currently installed.' }
    exit 0
}
if (-not (Test-Path -LiteralPath $launcher -PathType Leaf)) { throw 'Local workbench launcher is missing.' }
New-Item -ItemType Directory -Path $programs -Force | Out-Null
$powershell = Join-Path $PSHOME 'powershell.exe'
if (-not (Test-Path -LiteralPath $powershell)) { throw 'The Windows PowerShell executable is missing.' }
# Do not silently replace a shortcut owned by another application.
if (Test-Path -LiteralPath $shortcut) {
    $shell = New-Object -ComObject WScript.Shell
    $existing = $shell.CreateShortcut($shortcut)
    if ($existing.Arguments -notlike '*start-local-hub.ps1*') {
        throw "Shortcut collision at $shortcut; refusing to overwrite an unrelated shortcut."
    }
}
$shell = New-Object -ComObject WScript.Shell
$link = $shell.CreateShortcut($shortcut)
$link.TargetPath = $powershell
$link.Arguments = '-NoProfile -STA -ExecutionPolicy Bypass -File "' + $launcher + '"'
$link.WorkingDirectory = $repo
$link.Description = 'Open the locally hosted HB-TTRPG archive and private narration studio'
$link.IconLocation = $powershell + ',0'
$link.Save()
if (-not (Test-Path -LiteralPath $shortcut)) { throw 'Windows did not save the local workbench shortcut.' }
Write-Host ('Installed the per-user Start Menu shortcut: ' + $shortcut) -ForegroundColor Green
Write-Host 'Launch from Start > HB-TTRPG Local Workbench. Keep its PowerShell window open while browsing.'
Write-Host 'No models or audio were uploaded, and no service was installed to run at startup.'
