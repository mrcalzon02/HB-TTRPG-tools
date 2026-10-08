#requires -Version 5.1
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
function Assert-Windows {
    if ([Environment]::OSVersion.Platform -ne 'Win32NT' -or -not [Environment]::Is64BitOperatingSystem) {
        throw 'This alternative configuration requires x64 Windows.'
    }
}
function Invoke-Native {
    param([string]$Command, [string[]]$Arguments)
    & $Command @Arguments
    if ($LASTEXITCODE -ne 0) { throw "$Command failed (exit $LASTEXITCODE)." }
}
function Assert-Bundle {
    param([string]$Bundle)
    foreach ($line in Get-Content -Encoding UTF8 -LiteralPath (Join-Path $Bundle 'SHA256SUMS')) {
        if ($line -notmatch '^([0-9a-f]{64})  (.+)$') { throw 'Invalid bundle checksum record.' }
        $expected = $Matches[1]; $relative = $Matches[2]
        if ($relative -match '(^|[\/])\.\.([\/]|$)') { throw 'Invalid bundle member path.' }
        $file = Join-Path $Bundle $relative
        if (-not (Test-Path -LiteralPath $file -PathType Leaf)) { throw "Missing bundle file: $relative" }
        if ((Get-FileHash -LiteralPath $file -Algorithm SHA256).Hash.ToLowerInvariant() -ne $expected) {
            throw "Bundle checksum mismatch: $relative"
        }
    }
}
function New-SetupRoot {
    param([string]$Destination)
    $full = [IO.Path]::GetFullPath($Destination)
    if (Test-Path -LiteralPath $full) { throw "Destination exists: $full. Choose a NEW folder; maps are never overwritten." }
    New-Item -ItemType Directory -Path $full | Out-Null
    foreach ($name in 'tools','downloads','server-data','backups') {
        New-Item -ItemType Directory -Path (Join-Path $full $name) | Out-Null
    }
    return $full
}
function Save-VerifiedDownload {
    param($Artifact,[string]$Directory)
    $file = Join-Path $Directory $Artifact.file
    if (-not (Test-Path -LiteralPath $file)) {
        [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
        Invoke-WebRequest -UseBasicParsing -Uri $Artifact.url -OutFile "$file.partial"
        Move-Item -LiteralPath "$file.partial" -Destination $file
    }
    if ((Get-FileHash -LiteralPath $file -Algorithm $Artifact.algorithm).Hash.ToLowerInvariant() -ne $Artifact.hash.ToLowerInvariant()) {
        throw "Download checksum mismatch: $file"
    }
    return $file
}
function Get-MapName {
    param([string]$Map)
    switch ($Map) {
        'tyson' { return 'Tyson_Station' }
        'hamburg' { return 'Port_Hamburg' }
        'ourang' { return 'SS_Ourang_Medan' }
        'vapor' { return 'Vapor_Processing' }
        default { throw 'Choose tyson, hamburg, ourang or vapor.' }
    }
}
function Use-TGMCEnvironment {
    param([string]$Root)
    $env:PATH = (Join-Path $Root 'tools\byond\bin') + ';' + (Join-Path $Root 'tools\node-v22.11.0-win-x64') + ';' + $env:PATH
    $env:npm_config_cache = Join-Path $Root 'tools\npm-cache'
    $env:COREPACK_HOME = Join-Path $Root 'tools\corepack'
}
function Use-SS14Environment {
    param([string]$Root)
    $env:DOTNET_ROOT = Join-Path $Root 'tools\dotnet'
    $env:PATH = $env:DOTNET_ROOT + ';' + $env:PATH
    $env:DOTNET_CLI_HOME = Join-Path $Root 'tools\dotnet-home'
    $env:NUGET_PACKAGES = Join-Path $Root 'tools\nuget-packages'
    $env:DOTNET_CLI_TELEMETRY_OPTOUT = '1'
    $env:DOTNET_NOLOGO = '1'
    $env:DOTNET_PROCESSOR_COUNT = '2'
}
