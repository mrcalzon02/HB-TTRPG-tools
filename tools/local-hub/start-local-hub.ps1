#requires -version 5.1
<#
.SYNOPSIS
    Open the complete local HB-TTRPG archive, with optional private Voicebox narration.
.EXAMPLE
    powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\local-hub\start-local-hub.ps1
#>
[CmdletBinding()]
param([ValidateRange(1024,65535)][int]$Port=17861, [switch]$NoBrowser)
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
$repo = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$server = Join-Path $PSScriptRoot 'server.py'
if (-not $env:LOCALAPPDATA) { throw 'LOCALAPPDATA was not found; this launcher requires Windows.' }
$workspace = Join-Path $env:LOCALAPPDATA 'HB-TTRPG-tools\voicebox-production'
$private = Join-Path $workspace 'private'
$voicebox = Join-Path $workspace 'source\voicebox'
if ([IO.Path]::GetFullPath($private).TrimEnd('\').StartsWith(
      [IO.Path]::GetFullPath($repo).TrimEnd('\') + '\',
      [StringComparison]::OrdinalIgnoreCase)) {
  throw 'Private output may not live inside the public Git checkout.'
}
New-Item -ItemType Directory -Path $private -Force | Out-Null
$python = $null
$cmd = Get-Command py -ErrorAction SilentlyContinue
if ($cmd) {
  $candidate = & py -3.12 -c 'import sys; print(sys.executable)' 2>$null
  if ($LASTEXITCODE -eq 0 -and $candidate -and (Test-Path -LiteralPath $candidate)) {
    $python = [string]$candidate
  }
}
if (-not $python) {
  foreach ($name in @('python3','python')) {
    $cmd = Get-Command $name -ErrorAction SilentlyContinue
    if (-not $cmd) { continue }
    $ok = & $cmd.Source -c 'import sys; print(sys.version_info >= (3,10))' 2>$null
    if ($LASTEXITCODE -eq 0 -and $ok -eq 'True') { $python=$cmd.Source; break }
  }
}
if (-not $python) {
  throw 'Python 3.10+ is required for the local archive. The speech engine is optional. Install Python 3.12 from python.org or winget and rerun.'
}
$url = "http://127.0.0.1:$Port/__local/"
Write-Host "HB-TTRPG local web archive: $url" -ForegroundColor Cyan
Write-Host "Private generation directory: $private" -ForegroundColor Gray
Write-Host 'Leave this window open while using the archive; Ctrl+C stops the server.' -ForegroundColor Yellow
$argsForServer = @($server,'--root',$repo,'--private',$private,'--voicebox',$voicebox,'--port',[string]$Port)
if (-not $NoBrowser) { $argsForServer += '--open-browser' }
& $python @argsForServer
if ($LASTEXITCODE -ne 0) { throw "HB-TTRPG local server exited with code $LASTEXITCODE" }
