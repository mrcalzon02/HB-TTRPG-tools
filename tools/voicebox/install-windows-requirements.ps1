#requires -version 5.1
<#
.SYNOPSIS
  Repair Voicebox's Windows-only pyopenjtalk wheel-build failure without dropping Japanese G2P.
.DESCRIPTION
  Keep upstream requirements untouched. Install pyopenjtalk-plus's prebuilt
  Python 3.12 Windows wheel and use uv's supported transitive dependency
  override to avoid recompiling pyopenjtalk 0.4.1. Preserve existing Torch.
#>
[CmdletBinding()]
param(
    [Parameter(Mandatory=$true)][string]$Python,
    [Parameter(Mandatory=$true)][string]$Requirements
)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
function Require-Success([string]$Action) {
    if ($LASTEXITCODE -ne 0) {
        throw ('Voicebox dependencies: ' + $Action + ' failed with exit code ' + $LASTEXITCODE)
    }
}
try {
    if (-not (Test-Path -LiteralPath $Python -PathType Leaf)) { throw ('Python missing: ' + $Python) }
    if (-not (Test-Path -LiteralPath $Requirements -PathType Leaf)) { throw ('Requirements missing: ' + $Requirements) }
    $overrides = Join-Path $PSScriptRoot 'windows-pyopenjtalk-overrides.txt'
    if (-not (Test-Path -LiteralPath $overrides -PathType Leaf)) { throw ('Override file missing: ' + $overrides) }
    if (-not $env:LOCALAPPDATA) { throw 'Windows LOCALAPPDATA required.' }
    $diag = Join-Path $env:LOCALAPPDATA 'HB-TTRPG-tools\voicebox-production\private\diagnostics'
    New-Item -ItemType Directory -Force -Path $diag | Out-Null
    $log = Join-Path $diag ('voicebox-windows-wheels-' + (Get-Date -Format 'yyyyMMdd-HHmmss') + '.txt')
    & $Python -c 'import sys,platform; assert sys.version_info[:2] == (3,12); assert platform.system() == "Windows"'
    Require-Success 'Verify Python 3.12 on Windows'
    & $Python -m uv --version *> $null
    if ($LASTEXITCODE -ne 0) {
        Write-Host '[Voicebox] Installing the uv dependency resolver in the existing environment.' -ForegroundColor Cyan
        & $Python -m pip install uv
        Require-Success 'Install uv'
    }
    Write-Host '[Voicebox] Installing official Voicebox requirements with Japanese G2P Windows wheel.' -ForegroundColor Cyan
    Write-Host '[Voicebox] Existing PyTorch and model files are preserved; no repository source files modified.' -ForegroundColor Gray
    $transcribing = $false
    try {
        try {
            Start-Transcript -Path $log -Append -ErrorAction Stop | Out-Null
            $transcribing = $true
        } catch { Write-Warning ('Console log capture unavailable: ' + $_.Exception.Message) }
        & $Python -m uv pip install --python $Python --no-python-downloads --override $overrides --only-binary pyopenjtalk-plus -r $Requirements 'pyopenjtalk-plus==0.4.1.post10'
        Require-Success 'Install supported Windows dependencies'
        & $Python -c 'import pyopenjtalk; print("Japanese phonemes:", pyopenjtalk.g2p("こんにちは"))'
        Require-Success 'Verify Japanese pronunciation support'
        & $Python -c 'import uvicorn,fastapi,sqlalchemy,torch,zipvoice; print("Voicebox core modules ready")'
        Require-Success 'Verify Voicebox core modules'
    } finally {
        if ($transcribing) { Stop-Transcript -ErrorAction SilentlyContinue | Out-Null }
    }
    Write-Host ('[Voicebox] Requirements installed and checked. Private diagnostic file: ' + $log) -ForegroundColor Green
    exit 0
} catch {
    Write-Error ('Voicebox Windows dependency repair failed: ' + $_.Exception.Message)
    exit 1
}
