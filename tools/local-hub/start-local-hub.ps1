#requires -version 5.1
<#
.SYNOPSIS
    Start one-window HB-TTRPG workbench or the optional legacy headless server.
.EXAMPLE
    powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\local-hub\start-local-hub.ps1
.EXAMPLE
    powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\local-hub\start-local-hub.ps1 -NoBrowser
#>
[CmdletBinding()]
param([ValidateRange(1024,65535)][int]$Port=17861, [switch]$NoBrowser)
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
$repo = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
if (-not $env:LOCALAPPDATA) { throw 'LOCALAPPDATA is unavailable; use start-local-hub.sh on Linux.' }
$workspace = Join-Path $env:LOCALAPPDATA 'HB-TTRPG-tools\voicebox-production'
$private = Join-Path $workspace 'private'
$voicebox = Join-Path $workspace 'source\voicebox'

if (-not $NoBrowser) {
    $gui = Join-Path $PSScriptRoot 'desktop.py'
    $venvGui = Join-Path $env:LOCALAPPDATA 'HB-TTRPG-tools\desktop-venv\Scripts\pythonw.exe'
    if (-not (Test-Path -LiteralPath $venvGui)) {
        throw 'First run tools/local-hub/install-windows.ps1 to install the desktop UI.'
    }
    # pythonw owns the HTTP thread. PowerShell exits immediately; no server child
    # is left behind when the window closes.
    $arguments = ('"{0}" --port {1}' -f $gui, $Port)
    Start-Process -FilePath $venvGui -ArgumentList $arguments -WorkingDirectory $repo
    return
}

# Explicit headless compatibility mode for diagnostics/automation only.
$python = Join-Path $env:LOCALAPPDATA 'HB-TTRPG-tools\desktop-venv\Scripts\python.exe'
if (-not (Test-Path -LiteralPath $python)) {
    $candidate = Get-Command python -ErrorAction SilentlyContinue
    if (-not $candidate) { throw 'Python 3.10+ is required for headless mode.' }
    $python = $candidate.Source
}
New-Item -ItemType Directory -Path $private -Force | Out-Null
& $python (Join-Path $PSScriptRoot 'server.py') --root $repo --private $private --voicebox $voicebox --port $Port
if ($LASTEXITCODE -ne 0) { throw "Local server exited with code $LASTEXITCODE" }
