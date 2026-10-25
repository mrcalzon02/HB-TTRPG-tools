#requires -version 5.1
<#
.SYNOPSIS
  Repair a partially installed local Voicebox backend in place, without deleting Torch.
.DESCRIPTION
  Installs the missing HTTP server modules, then checks actual backend imports.
  Only if the backend is still incomplete, resumes official upstream requirements.
  Writes build traces under LOCALAPPDATA, never the public Git checkout.
.EXAMPLE
  powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\voicebox\repair-local-backend.ps1
#>
[CmdletBinding()]
param([switch]$DiagnoseOnly)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Status([string]$message) { Write-Host ('[Voicebox repair] ' + $message) -ForegroundColor Cyan }
function Run-Python([string[]]$Arguments, [string]$Step) {
    Status $Step
    & $python @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw ('Failed ' + $Step + ' (exit ' + $LASTEXITCODE + '). Review the error printed above.')
    }
}
function Show-LogTail([string]$Path) {
    if (Test-Path -LiteralPath $Path) {
        Write-Host ('Detailed PRIVATE pip log: ' + $Path) -ForegroundColor Yellow
        Get-Content -LiteralPath $Path -Tail 60 | ForEach-Object { Write-Host $_ }
    }
}
try {
    if (-not $env:LOCALAPPDATA) { throw 'This repair helper requires Windows LOCALAPPDATA.' }
    $workspace = Join-Path $env:LOCALAPPDATA 'HB-TTRPG-tools\voicebox-production'
    $source = Join-Path $workspace 'source\voicebox'
    $python = Join-Path $source 'backend\venv\Scripts\python.exe'
    $requirements = Join-Path $source 'backend\requirements.txt'
    $private = Join-Path $workspace 'private\diagnostics'
    if (-not (Test-Path -LiteralPath $python -PathType Leaf)) {
        throw ('No existing Voicebox venv at ' + $python + '. This tool repairs an existing installation, it never deletes/recreates the environment.')
    }
    if (-not (Test-Path -LiteralPath $requirements -PathType Leaf)) {
        throw ('Voicebox source requirements unavailable: ' + $requirements)
    }
    New-Item -ItemType Directory -Force -Path $private | Out-Null
    $log = Join-Path $private ('voicebox-repair-' + (Get-Date -Format 'yyyyMMdd-HHmmss') + '.log')
    Status ('Reusing existing environment: ' + $python)
    Run-Python @('-m','pip','--version') 'Confirm existing pip'
    Run-Python @('-c','import sys; assert sys.version_info[:2] == (3,12), "Voicebox requires Python 3.12"') 'Validate Python version'

    $core = @('uvicorn','fastapi','sqlalchemy')
    $probe = "import importlib.util,sys; names = ['uvicorn','fastapi','sqlalchemy']; missing = [x for x in names if importlib.util.find_spec(x) is None]; print('Missing HTTP dependencies:', ', '.join(missing) if missing else 'none'); sys.exit(bool(missing))"
    Status 'Checking missing Voicebox HTTP server packages'
    & $python -c $probe
    $coreMissing = ($LASTEXITCODE -ne 0)
    if ($DiagnoseOnly) {
        Status 'DiagnoseOnly selected: no packages will be installed.'
        Run-Python @('-c','from backend.main import app; print("Voicebox backend import succeeded")') 'Full backend import check'
        exit 0
    }
    if ($coreMissing) {
        Status 'Installing missing Voicebox HTTP dependencies only; keeping existing Torch and model caches'
        # No --upgrade and no --force-reinstall: compatible installed packages are retained.
        & $python -m pip --log $log install 'uvicorn[standard]' 'fastapi' 'sqlalchemy'
        if ($LASTEXITCODE -ne 0) {
            Show-LogTail $log
            throw 'Unable to repair the HTTP dependencies. The existing environment was preserved.'
        }
    }
    Push-Location $source
    try {
        Status 'Checking the actual Voicebox backend import, not just module presence'
        & $python -c 'from backend.main import app; print("Voicebox app import OK")'
        if ($LASTEXITCODE -ne 0) {
            Status 'Other backend imports are incomplete. Resuming upstream official requirements with a private pip log.'
            # pip will reuse cached downloads and already-satisfied PyTorch packages.
            & $python -m pip --log $log install --verbose -r $requirements
            if ($LASTEXITCODE -ne 0) {
                Show-LogTail $log
                throw ('Upstream requirements failed to build; inspect ' + $log + '. Do not delete the venv or reinstall Torch without identifying the failing package.')
            }
        }
        Run-Python @('-c','from backend.main import app; print("Voicebox backend imported successfully")') 'Verify full backend import'
        Run-Python @('-m','pip','check') 'Check Python dependency compatibility'
    } finally { Pop-Location }
    Write-Host 'Voicebox dependencies are importable. Restart the HB-TTRPG Local Workbench, then Refresh Voices.' -ForegroundColor Green
    Write-Host 'No audio or credentials were uploaded; model weights and previous output remain local.' -ForegroundColor Green
    exit 0
} catch {
    Write-Error ('Voicebox repair stopped: ' + $_.Exception.Message)
    exit 1
}
