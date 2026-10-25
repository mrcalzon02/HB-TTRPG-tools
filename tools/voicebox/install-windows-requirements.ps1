#requires -version 5.1
<#
.SYNOPSIS
  Install English-only Voicebox requirements in its existing private Windows environment.
.DESCRIPTION
  Preserve the source checkout and model cache. No Japanese or Chinese
  pronunciation extras, native pyopenjtalk compilation, or cloud uploads.
  Reuses installed Torch; no forced package reinstalls.
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
        throw ('Voicebox English dependencies: ' + $Action + ' failed with exit code ' + $LASTEXITCODE)
    }
}
try {
    if (-not (Test-Path -LiteralPath $Python -PathType Leaf)) { throw ('Python missing: ' + $Python) }
    if (-not (Test-Path -LiteralPath $Requirements -PathType Leaf)) { throw ('Upstream requirements missing: ' + $Requirements) }
    $prepare = Join-Path $PSScriptRoot 'prepare_english_requirements.py'
    if (-not (Test-Path -LiteralPath $prepare -PathType Leaf)) { throw ('English requirements builder missing: ' + $prepare) }
    if (-not $env:LOCALAPPDATA) { throw 'Windows LOCALAPPDATA required.' }
    $diag = Join-Path $env:LOCALAPPDATA 'HB-TTRPG-tools\voicebox-production\private\diagnostics'
    New-Item -ItemType Directory -Force -Path $diag | Out-Null
    $label = Get-Date -Format 'yyyyMMdd-HHmmss-fffffff'
    $localRequirements = Join-Path $diag ('voicebox-english-' + $label + '.txt')
    $pipLog = Join-Path $diag ('voicebox-english-pip-' + $label + '.log')
    & $Python -c "import sys,platform; assert sys.version_info[:2] == (3,12); assert platform.system() == 'Windows'"
    Require-Success 'Verify Python 3.12 on Windows'

    Write-Host '[Voicebox] Deriving English-only requirements without modifying upstream.' -ForegroundColor Cyan
    & $Python $prepare --input $Requirements --output $localRequirements
    Require-Success 'Generate English-only requirements'
    Write-Host ('[Voicebox] Installing English speech dependencies from ' + $localRequirements) -ForegroundColor Cyan
    Write-Host '[Voicebox] Existing PyTorch and cached model weights are preserved.' -ForegroundColor Gray
    # Use the same virtualenv's pip, retaining already-satisfied dependencies.
    # No --force-reinstall, --upgrade or --ignore-installed.
    & $Python -m pip --log $pipLog install --verbose -r $localRequirements
    if ($LASTEXITCODE -ne 0) {
        Write-Host ('[Voicebox] Dependency install failed. Private diagnostic log: ' + $pipLog) -ForegroundColor Red
        if (Test-Path -LiteralPath $pipLog) {
            Get-Content -LiteralPath $pipLog -Tail 70 | ForEach-Object { Write-Host $_ }
        }
        throw ('English-only Voicebox installation failed; see ' + $pipLog)
    }
    & $Python -c 'from misaki import en'
    Require-Success 'Verify English pronunciation dependencies'
    & $Python -c 'import uvicorn,fastapi,sqlalchemy,torch,zipvoice'
    Require-Success 'Verify core Voicebox imports'
    Write-Host '[Voicebox] English-only dependencies installed. No audio or credentials uploaded.' -ForegroundColor Green
    exit 0
} catch {
    Write-Error ('Voicebox English dependency setup stopped: ' + $_.Exception.Message)
    exit 1
}
