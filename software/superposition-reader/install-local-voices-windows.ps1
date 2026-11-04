# Optional, user-initiated local voice setup for SuperPosition Reader on Windows.
# No model/runtime is copied into the public source repository.
[CmdletBinding()]
param(
    [Parameter(Mandatory=$true)][string]$DataDir,
    [Parameter(Mandatory=$true)][ValidateSet("kokoro","piper")][string]$Engine,
    [Parameter(Mandatory=$true)][string]$Voice
)
$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

$allowedPiper = @(
    "en_GB-alan-low","en_GB-alan-medium",
    "en_GB-northern_english_male-medium","en_GB-alba-medium",
    "en_GB-cori-medium","en_GB-cori-high",
    "en_GB-jenny_dioco-medium","en_GB-southern_english_female-low",
    "en_GB-aru-medium","en_GB-semaine-medium","en_GB-vctk-medium"
)
if ($Engine -eq "kokoro" -and $Voice -ne "kokoro-british") {
    throw "Unknown Kokoro voice package"
}
if ($Engine -eq "piper" -and $Voice -cnotin $allowedPiper) {
    throw "Unknown Piper voice model"
}
$root = Join-Path (Join-Path $DataDir "local-voices") ""
$venv = Join-Path $root ".venv"
$python = Join-Path $venv "Scripts\python.exe"
New-Item -ItemType Directory -Force -Path $root | Out-Null
if (-not (Test-Path $python)) {
    Write-Output "Creating isolated SPR local-voice Python environment"
    $created = $false
    $launcher = Get-Command py -ErrorAction SilentlyContinue
    if ($launcher) {
        foreach ($version in @("-3.12", "-3.11")) {
            & py $version -m venv $venv
            if ($LASTEXITCODE -eq 0 -and (Test-Path $python)) {
                $created = $true
                break
            }
        }
    }
    if (-not $created) {
        $command = Get-Command python -ErrorAction SilentlyContinue
        if (-not $command) { throw "Python 3.11 or 3.12 is required for local voices" }
        & python -m venv $venv
        if ($LASTEXITCODE -ne 0 -or -not (Test-Path $python)) {
            throw "Unable to create the isolated Python environment"
        }
    }
}
$dependencies = if ($Engine -eq "kokoro") { @("kokoro-onnx>=0.4,<1", "soundfile>=0.12,<1") } else { @("piper-tts>=1.3,<2") }
Write-Output "Installing local synthesis packages: $($dependencies -join ', ')"
& $python -m pip install --disable-pip-version-check @dependencies
if ($LASTEXITCODE -ne 0) { throw "Local voice engine package installation failed" }

function Download-Model([string]$Url, [string]$Destination, [long]$MinimumBytes = 1000) {
    if ((Test-Path $Destination) -and (Get-Item $Destination).Length -ge $MinimumBytes) {
        Write-Output "Reusing downloaded model: $(Split-Path $Destination -Leaf)"
        return
    }
    $partial = $Destination + ".partial"
    Remove-Item $partial -ErrorAction SilentlyContinue
    try {
        Write-Output "Downloading $(Split-Path $Destination -Leaf)"
        Invoke-WebRequest -Uri $Url -OutFile $partial -UseBasicParsing -MaximumRedirection 10
        if ((Get-Item $partial).Length -lt $MinimumBytes) {
            throw "Model download is incomplete or unexpectedly small"
        }
        Move-Item -Path $partial -Destination $Destination -Force
    } finally {
        Remove-Item $partial -ErrorAction SilentlyContinue
    }
}
if ($Engine -eq "kokoro") {
    $modelFolder = Join-Path $root "models\kokoro"
    New-Item -ItemType Directory -Force -Path $modelFolder | Out-Null
    $release = "https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0"
    Download-Model "$release/kokoro-v1.0.int8.onnx" (Join-Path $modelFolder "kokoro-v1.0.int8.onnx") 10000000
    Download-Model "$release/voices-v1.0.bin" (Join-Path $modelFolder "voices-v1.0.bin") 1000000
} else {
    $modelFolder = Join-Path $root "models\piper"
    New-Item -ItemType Directory -Force -Path $modelFolder | Out-Null
    if ($Voice -notmatch '^en_GB-([a-z_]+)-(low|medium|high)$') {
        throw "Invalid Piper model identifier"
    }
    $speaker = $Matches[1]
    $quality = $Matches[2]
    $base = "https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_GB/$speaker/$quality"
    Download-Model "$base/$Voice.onnx" (Join-Path $modelFolder "$Voice.onnx") 100000
    Download-Model "$base/$Voice.onnx.json" (Join-Path $modelFolder "$Voice.onnx.json") 100
    try {
        Download-Model "$base/MODEL_CARD" (Join-Path $modelFolder "$Voice.MODEL_CARD") 10
    } catch {
        Write-Output "Warning: license card unavailable; verify licensing at rhasspy/piper-voices before redistribution"
    }
}
Write-Output "Installed $Engine package $Voice in private SPR data."
