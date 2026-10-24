# Create a source-development workspace outside the public Foundry repo.
# Requires upstream Git, Python 3.12, Bun, Rust/Cargo, just, and Tauri build prerequisites.
[CmdletBinding()]
param(
    [switch] $Run,
    [string] $Workspace = (Join-Path $env:LOCALAPPDATA 'HB-TTRPG-tools\voicebox\source')
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
if ([Environment]::OSVersion.Platform -ne [PlatformID]::Win32NT) {
    throw 'This helper targets Windows PowerShell. See tools/voicebox/README.md for Unix instructions.'
}
foreach ($command in @('git', 'just', 'bun', 'cargo')) {
    if (-not (Get-Command $command -ErrorAction SilentlyContinue)) {
        throw "Missing prerequisite '$command'. Follow the upstream Voicebox README and Tauri prerequisites before retrying."
    }
}
if (-not ((Get-Command 'py' -ErrorAction SilentlyContinue) -or (Get-Command 'python' -ErrorAction SilentlyContinue))) {
    throw 'Missing Python. Install Python 3.12 and see upstream Voicebox setup instructions.'
}
$source = Join-Path $Workspace 'voicebox'
New-Item -ItemType Directory -Path $Workspace -Force | Out-Null
if (-not (Test-Path -LiteralPath $source)) {
    & git clone 'https://github.com/jamiepine/voicebox.git' $source
    if ($LASTEXITCODE -ne 0) { throw "Git clone failed ($LASTEXITCODE)." }
} elseif (-not (Test-Path -LiteralPath (Join-Path $source '.git'))) {
    throw "Existing path is not a Git checkout: $source. Refusing to overwrite it."
} else {
    Write-Host "Reusing existing source checkout without resetting or pulling: $source"
}
Push-Location $source
try {
    Write-Host 'Running upstream setup (creates backend/venv and installs dependencies)...'
    & just setup
    if ($LASTEXITCODE -ne 0) { throw "Upstream 'just setup' failed ($LASTEXITCODE)." }
    Write-Host "Source environment ready: $source"
    if ($Run) {
        Write-Host 'Starting upstream developer app (may keep this terminal occupied)...'
        & just dev
        if ($LASTEXITCODE -ne 0) { throw "Upstream 'just dev' failed ($LASTEXITCODE)." }
    } else {
        Write-Host "To start it later: Set-Location '$source'; just dev"
    }
} finally {
    Pop-Location
}
