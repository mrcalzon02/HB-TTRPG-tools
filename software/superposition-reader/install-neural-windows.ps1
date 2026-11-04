[CmdletBinding()]
param([switch]$CpuOnly, [switch]$SkipPreview)

$ErrorActionPreference = 'Stop'
$Here = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot = if (Test-Path -LiteralPath (Join-Path $Here 'spr_examples\bdo-current.epub')) {
    $Here
} else {
    (Resolve-Path (Join-Path $Here '..\..')).Path
}
$Private = Join-Path $env:LOCALAPPDATA 'SuperPositionReader\neural'
$Venv = Join-Path $Private '.venv'
$Python = Join-Path $Venv 'Scripts\python.exe'
$Upstream = Join-Path $Private 'LuxTTS'
$Models = Join-Path $Private 'models'
$CpuFlag = Join-Path $Private 'force-cpu.txt'
$Preview = Join-Path $Private 'sphinx-audition'
$Recording = Join-Path $Here 'assets\voice\sphinx-original.mp3'

if (-not (Test-Path -LiteralPath $Recording)) {
    throw 'Original Sphinx MP3 is missing. Update your HB-TTRPG-tools checkout.'
}
New-Item -ItemType Directory -Path $Private, $Models -Force | Out-Null
if (-not (Test-Path -LiteralPath $Python)) {
    $PyLauncher = Get-Command py -ErrorAction SilentlyContinue
    if ($PyLauncher) {
        & py -3.11 -m venv $Venv
        if ($LASTEXITCODE -ne 0) { throw 'Python 3.11 is required for this isolated neural runtime.' }
    } else {
        throw 'Install Python 3.11 from python.org before installing the optional SPR neural engine.'
    }
}
& $Python -m pip --version
if ($LASTEXITCODE -ne 0) { throw 'Isolated Python environment is damaged.' }

if (-not (Test-Path -LiteralPath (Join-Path $Upstream 'zipvoice\luxvoice.py'))) {
    if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
        throw 'Git is required to retrieve the Apache-2.0 LuxTTS source.'
    }
    & git clone --depth 1 https://github.com/ysharma3501/LuxTTS.git $Upstream
    if ($LASTEXITCODE -ne 0) { throw 'Failed to clone the LuxTTS source.' }
}
& $Python -m pip install --disable-pip-version-check --upgrade pip
if ($LASTEXITCODE -ne 0) { throw 'Failed upgrading isolated pip.' }

if ($CpuOnly) {
    & $Python -m pip install --index-url https://download.pytorch.org/whl/cpu torch torchaudio
    if ($LASTEXITCODE -ne 0) { throw 'CPU PyTorch installation failed.' }
    Set-Content -LiteralPath $CpuFlag -Value 'User selected CPU-only narration.' -Encoding UTF8
} else {
    & $Python -m pip install --index-url https://download.pytorch.org/whl/cu128 torch torchaudio
    if ($LASTEXITCODE -ne 0) { throw 'CUDA 12.8 PyTorch installation failed. Rerun with -CpuOnly for fallback.' }
    if (Test-Path -LiteralPath $CpuFlag) { Remove-Item -LiteralPath $CpuFlag -Force }
}
& $Python -m pip install -r (Join-Path $Upstream 'requirements.txt') soundfile librosa faster-whisper scipy
if ($LASTEXITCODE -ne 0) { throw 'LuxTTS dependency installation failed. Existing cache is retained.' }
& $Python -m pip install --no-deps -e $Upstream
if ($LASTEXITCODE -ne 0) { throw 'LuxTTS package registration failed.' }

$env:HF_HOME = $Models
& $Python -c "from zipvoice.luxvoice import LuxTTS; from faster_whisper import WhisperModel; import torch, soundfile; print('SPR neural and English speech QA imports ready; GPU:', torch.cuda.is_available())"
if ($LASTEXITCODE -ne 0) { throw 'Neural package import check failed.' }

if (-not $SkipPreview) {
    New-Item -ItemType Directory -Path $Preview -Force | Out-Null
    $Args = @((Join-Path $Here 'spr_luxtts_worker.py'), '--trial',
              '--reference', $Recording, '--output', $Preview, '--repo-root', $RepoRoot)
    if ($CpuOnly) { $Args += '--cpu' }
    & $Python @Args
    if ($LASTEXITCODE -ne 0) {
        throw "SPR neural trial failed. The model and files remain installed for diagnosis in $Private."
    }
    Write-Host 'Actual Sphinx-cloned narration examples saved in:' $Preview
}
Write-Host 'SPR neural backend is installed under:' $Private
Write-Host 'Launch SuperPosition Reader again; select SPR Neural — LuxTTS.'
Write-Host 'The model and generated WAVs stay local after this first download.'
