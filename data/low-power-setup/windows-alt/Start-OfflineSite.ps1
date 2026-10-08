#requires -Version 5.1
[CmdletBinding()]
param([Parameter(Mandatory)][string]$SitePath,[ValidateRange(1024,65535)][int]$Port = 8765)
. "$PSScriptRoot\Common.ps1"
Assert-Windows
$site = [IO.Path]::GetFullPath($SitePath)
if (-not (Test-Path -LiteralPath (Join-Path $site 'index.html'))) { throw 'Choose an extracted HB-TTRPG site folder containing index.html.' }
if (-not (Get-Command python.exe -ErrorAction SilentlyContinue)) { throw 'Install the Development profile or official Python first.' }
Write-Host "Open http://127.0.0.1:$Port/ in your browser. Keep this terminal open; Ctrl+C stops the server."
Invoke-Native 'python.exe' @('-m','http.server',[string]$Port,'--bind','127.0.0.1','--directory',$site)
