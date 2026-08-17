param(
    [string]$OutputName = 'NetworkInvestigator-Windows-x64'
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$BuildRoot = Join-Path $Root 'build'
$Classes = Join-Path $BuildRoot 'classes'
$DistRoot = Join-Path $Root 'dist'
$Bundle = Join-Path $DistRoot 'NetworkInvestigator'
$Runtime = Join-Path $Bundle 'runtime'
$Jar = Join-Path $Bundle 'NetworkInvestigator.jar'
$Zip = Join-Path $DistRoot ($OutputName + '.zip')

function Assert-LastExitCode([string]$Step) {
    if ($LASTEXITCODE -ne 0) { throw "$Step failed with exit code $LASTEXITCODE." }
}

function Assert-PackagedFile([string]$Path, [int]$MinimumBytes = 1) {
    if (-not (Test-Path $Path -PathType Leaf)) { throw "Required packaged file is missing: $Path" }
    $item = Get-Item $Path
    if ($item.Length -lt $MinimumBytes) { throw "Required packaged file is unexpectedly small: $Path ($($item.Length) bytes)" }
}

foreach ($command in @('javac.exe','jar.exe','jlink.exe')) {
    if (-not (Get-Command $command -ErrorAction SilentlyContinue)) {
        throw "$command was not found. Build Network Investigator with a Windows JDK 21 installation on PATH."
    }
}

Remove-Item $BuildRoot -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item $Bundle -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item $Zip -Force -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Force $Classes, $Bundle, $DistRoot | Out-Null

$Sources = @(Get-ChildItem (Join-Path $Root 'src\main\java') -Recurse -Filter '*.java' | ForEach-Object FullName)
if ($Sources.Count -eq 0) { throw 'No Java sources were found.' }

& javac.exe --release 21 --add-modules jdk.httpserver -encoding UTF-8 -d $Classes @Sources
Assert-LastExitCode 'javac'

& jar.exe --create --file $Jar --main-class io.calzon.networkinvestigator.Main -C $Classes .
Assert-LastExitCode 'jar'

Copy-Item (Join-Path $Root 'web') (Join-Path $Bundle 'web') -Recurse -Force
Copy-Item (Join-Path $Root 'packaging\NetworkInvestigator.ps1') (Join-Path $Bundle 'NetworkInvestigator.ps1') -Force
Copy-Item (Join-Path $Root 'packaging\NetworkInvestigator.cmd') (Join-Path $Bundle 'NetworkInvestigator.cmd') -Force
Copy-Item (Join-Path $Root 'packaging\NetworkInvestigator-Debug.cmd') (Join-Path $Bundle 'NetworkInvestigator-Debug.cmd') -Force

& jlink.exe --add-modules 'java.base,jdk.httpserver' --strip-debug --no-header-files --no-man-pages --output $Runtime
Assert-LastExitCode 'jlink'

$Readme = @'
NETWORK INVESTIGATOR
====================

NORMAL LAUNCH
-------------
1. Extract this entire ZIP to a normal Windows folder.
2. Double-click NetworkInvestigator.cmd.
3. Your browser opens the local dashboard at http://127.0.0.1:8765/.
4. The agent begins passive collection immediately and keeps a rolling ten-minute pre-record buffer.
5. Press RECORD when something happens to preserve the preceding buffer and continue the session.
6. Use STOP LOCAL AGENT in the dashboard when you want collection to end.

IMPORTANT: Do not run NetworkInvestigator.cmd from inside Windows' ZIP preview. The runtime, JAR, web interface and launch scripts must remain together in the extracted folder.

IF THE NORMAL LAUNCH DOES NOT OPEN
----------------------------------
Run NetworkInvestigator-Debug.cmd. It keeps a diagnostic window open and reports startup errors.
Persistent launcher logs are stored under:
  %USERPROFILE%\Network Investigator\logs

Evidence is stored under your Windows user profile in:
  %USERPROFILE%\Network Investigator\recordings

The utility records system/network metadata and diagnostic probe results. It does not capture application payload contents.
The local HTTP control surface binds only to 127.0.0.1 and rejects cross-origin control requests.
'@
Set-Content -Path (Join-Path $Bundle 'README.txt') -Value $Readme -Encoding UTF8

Assert-PackagedFile $Jar 1000
Assert-PackagedFile (Join-Path $Bundle 'NetworkInvestigator.ps1') 500
Assert-PackagedFile (Join-Path $Bundle 'NetworkInvestigator.cmd') 100
Assert-PackagedFile (Join-Path $Bundle 'NetworkInvestigator-Debug.cmd') 100
Assert-PackagedFile (Join-Path $Bundle 'web\index.html') 500
Assert-PackagedFile (Join-Path $Runtime 'bin\java.exe') 1000

Compress-Archive -Path (Join-Path $Bundle '*') -DestinationPath $Zip -CompressionLevel Optimal
Assert-PackagedFile $Zip 1000000
Write-Host "Built: $Zip"
