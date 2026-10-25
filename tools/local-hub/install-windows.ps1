#requires -version 5.1
<#
.SYNOPSIS
    Install the single-window local archive shortcut (current Windows user).
.DESCRIPTION
    Uses a private Python environment and opens the native WebView window.
    It does not create a service, console window, or independent HTTP daemon.
#>
[CmdletBinding()]
param([switch]$Uninstall)
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
if (-not $env:APPDATA -or -not $env:LOCALAPPDATA) { throw 'Windows per-user folders are unavailable.' }

$repo = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$gui = Join-Path $PSScriptRoot 'desktop.py'
$programs = Join-Path $env:APPDATA 'Microsoft\Windows\Start Menu\Programs'
$shortcut = Join-Path $programs 'HB-TTRPG Local Workbench.lnk'

if ($Uninstall) {
    if (Test-Path -LiteralPath $shortcut) {
        $shell = New-Object -ComObject WScript.Shell
        $old = $shell.CreateShortcut($shortcut)
        if ($old.Arguments -notlike '*desktop.py*' -and $old.Arguments -notlike '*start-local-hub.ps1*') {
            throw 'The shortcut is not the HB-TTRPG workbench; refusing removal.'
        }
        Remove-Item -LiteralPath $shortcut -Force
        Write-Host "Removed local workbench shortcut: $shortcut"
    }
    exit 0
}
if (-not (Test-Path -LiteralPath $gui -PathType Leaf)) { throw 'Local desktop.py is missing.' }

$python = $null
if (Get-Command py -ErrorAction SilentlyContinue) {
    foreach ($version in @('-3.12','-3')) {
        $candidate = & py $version -c 'import sys; print(sys.executable if sys.version_info >= (3,10) else "")' 2>$null
        if ($LASTEXITCODE -eq 0 -and $candidate -and (Test-Path -LiteralPath $candidate)) {
            $python = [string]$candidate
            break
        }
    }
}
if (-not $python) {
    foreach ($name in @('python3','python')) {
        $command = Get-Command $name -ErrorAction SilentlyContinue
        if (-not $command) { continue }
        $candidate = & $command.Source -c 'import sys; print(sys.executable if sys.version_info >= (3,10) else "")' 2>$null
        if ($LASTEXITCODE -eq 0 -and $candidate -and (Test-Path -LiteralPath $candidate)) {
            $python = [string]$candidate
            break
        }
    }
}
if (-not $python) { throw 'Python 3.10+ is required. Install Python 3.12 and run this installer again.' }

$venv = Join-Path $env:LOCALAPPDATA 'HB-TTRPG-tools\desktop-venv'
$venvPy = Join-Path $venv 'Scripts\python.exe'
$venvPyw = Join-Path $venv 'Scripts\pythonw.exe'
if (-not (Test-Path -LiteralPath $venvPy)) {
    & $python -m venv $venv
    if ($LASTEXITCODE -ne 0) { throw 'Could not create the private desktop Python environment.' }
}
& $venvPy -m pip install 'pywebview>=5,<7'
if ($LASTEXITCODE -ne 0) { throw 'Could not install the native window dependency pywebview.' }
if (-not (Test-Path -LiteralPath $venvPyw)) { throw 'The Python GUI interpreter pythonw.exe was not found.' }

New-Item -ItemType Directory -Path $programs -Force | Out-Null
$shell = New-Object -ComObject WScript.Shell
if (Test-Path -LiteralPath $shortcut) {
    $old = $shell.CreateShortcut($shortcut)
    if ($old.Arguments -notlike '*desktop.py*' -and $old.Arguments -notlike '*start-local-hub.ps1*') {
        throw "Shortcut collision at $shortcut; refusing overwrite."
    }
}
$link = $shell.CreateShortcut($shortcut)
$link.TargetPath = $venvPyw
$link.Arguments = '"' + $gui + '"'
$link.WorkingDirectory = $repo
$link.Description = 'HB-TTRPG archive and private narration in one window'
$link.IconLocation = (Join-Path $env:WINDIR 'System32\shell32.dll') + ',14'
$link.Save()
if (-not (Test-Path -LiteralPath $shortcut)) { throw 'The shortcut was not saved.' }
Write-Host "Installed HB-TTRPG Local Workbench: $shortcut" -ForegroundColor Green
Write-Host 'Close its native window to stop its internal localhost server; no console to close.'
