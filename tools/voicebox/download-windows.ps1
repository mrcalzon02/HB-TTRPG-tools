# Download an official Voicebox MSI (Windows x64) without installing it by default.
# Launch installer only when explicitly asked: -LaunchInstaller
[CmdletBinding()]
param(
    [switch] $LaunchInstaller,
    [string] $DownloadDirectory = (Join-Path $env:LOCALAPPDATA 'HB-TTRPG-tools\voicebox\downloads')
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

if ([Environment]::OSVersion.Platform -ne [PlatformID]::Win32NT) {
    throw 'This helper is for Windows only. See tools/voicebox/README.md.'
}
if (-not [Environment]::Is64BitOperatingSystem -or $env:PROCESSOR_ARCHITECTURE -eq 'ARM64') {
    throw 'This helper supports Windows x64 MSI only. Use the upstream download page for other architectures.'
}
$releaseApi = 'https://api.github.com/repos/jamiepine/voicebox/releases/latest'
Write-Host "Looking up upstream release: $releaseApi"
$release = Invoke-RestMethod -Uri $releaseApi -Headers @{ 'User-Agent' = 'HB-TTRPG-tools-Voicebox-Downloader'; 'Accept' = 'application/vnd.github+json' }
$matches = @($release.assets | Where-Object { $_.name -match '^Voicebox_[0-9][^/]*_x64_en-US\.msi$' })
if ($matches.Count -ne 1) {
    throw "Expected exactly one official Windows x64 MSI in release '$($release.tag_name)', found $($matches.Count). Open https://github.com/jamiepine/voicebox/releases instead."
}
$asset = $matches[0]
$downloadUri = [uri]$asset.browser_download_url
if ($downloadUri.Scheme -ne 'https' -or $downloadUri.Host -ne 'github.com' -or
    -not $downloadUri.AbsolutePath.StartsWith('/jamiepine/voicebox/releases/download/', [StringComparison]::Ordinal)) {
    throw "Unrecognized upstream asset URL: $downloadUri"
}
New-Item -ItemType Directory -Path $DownloadDirectory -Force | Out-Null
$destination = Join-Path $DownloadDirectory $asset.name
Write-Host "Upstream release: $($release.tag_name)"
Write-Host "Asset: $($asset.name)"
Write-Host "URL: $downloadUri"
Write-Host "Downloading to: $destination"
Invoke-WebRequest -Uri $downloadUri.AbsoluteUri -OutFile $destination
if ((Get-Item -LiteralPath $destination).Length -ne [long]$asset.size) {
    throw 'Downloaded file size differs from the official GitHub release asset size; do not install.'
}
$hash = Get-FileHash -LiteralPath $destination -Algorithm SHA256
Write-Host "SHA-256 (local fingerprint, not an independently verified publisher signature): $($hash.Hash)"
Write-Host "Downloaded: $destination"
if ($LaunchInstaller) {
    Write-Host 'Launching the downloaded official MSI via Windows Installer...'
    $proc = Start-Process -FilePath 'msiexec.exe' -ArgumentList @('/i', ('"' + $destination + '"')) -Wait -PassThru
    if ($proc.ExitCode -notin @(0, 3010)) {
        throw "Windows Installer returned exit code $($proc.ExitCode)."
    }
    Write-Host "Windows Installer finished (code $($proc.ExitCode)). Start Voicebox from the Start menu."
} else {
    Write-Host 'Installer NOT launched. Inspect the file, then run again with -LaunchInstaller if approved.'
}
