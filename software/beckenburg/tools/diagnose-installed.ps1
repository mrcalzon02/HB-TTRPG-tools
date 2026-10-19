# Collect diagnostic evidence from an already-installed Beckenburg Windows build.
# Read-only: does not modify the installer, game files, or saved profiles.
# This script does not upload anything or request administrator rights.
param(
    [string]$Executable = '',
    [switch]$NoLaunch
)
$ErrorActionPreference='Stop'
$now=Get-Date
$folder=Join-Path $env:USERPROFILE ('.beckenburg\diagnostics\external-'+$now.ToString('yyyyMMdd-HHmmss'))
New-Item -ItemType Directory -Path $folder -Force | Out-Null
$summary=New-Object System.Collections.Generic.List[string]
$summary.Add('Beckenburg external Windows diagnostic report')
$summary.Add('Time: '+$now.ToString('o'))
$summary.Add('Windows: '+[Environment]::OSVersion.VersionString)
$summary.Add('PowerShell: '+$PSVersionTable.PSVersion.ToString())
$candidates=New-Object System.Collections.Generic.List[string]
if ($Executable) { $candidates.Add($Executable) }
if ($env:LOCALAPPDATA) { $candidates.Add((Join-Path $env:LOCALAPPDATA 'Programs\Beckenburg\Beckenburg.exe')) }
if ($env:ProgramFiles) { $candidates.Add((Join-Path $env:ProgramFiles 'Beckenburg\Beckenburg.exe')) }
$program86=[Environment]::GetEnvironmentVariable('ProgramFiles(x86)')
if ($program86) { $candidates.Add((Join-Path $program86 'Beckenburg\Beckenburg.exe')) }
$found=$candidates | Where-Object { Test-Path -LiteralPath $_ -PathType Leaf } | Select-Object -First 1
if ($found) {
    $binary=Get-Item -LiteralPath $found
    $summary.Add('Executable: '+$binary.FullName)
    $summary.Add('Modified: '+$binary.LastWriteTime.ToString('o'))
    $summary.Add('Size: '+$binary.Length)
    $summary.Add('SHA256: '+(Get-FileHash -LiteralPath $found -Algorithm SHA256).Hash)
    $summary.Add('Product version: '+$binary.VersionInfo.ProductVersion)
    $summary.Add('File version: '+$binary.VersionInfo.FileVersion)
} else {
    $summary.Add('Executable not automatically located; use -Executable "C:\path\Beckenburg.exe"')
}
# Existing diagnostic files produced by newer game builds; never include profile.properties.
$diagnostics=Join-Path $env:USERPROFILE '.beckenburg\diagnostics'
if (Test-Path -LiteralPath $diagnostics) {
    Get-ChildItem -LiteralPath $diagnostics -File -ErrorAction SilentlyContinue |
        Where-Object { $_.Name -match '^(session-|crash-)' } |
        Sort-Object LastWriteTime -Descending | Select-Object -First 6 |
        ForEach-Object {
            $target=Join-Path $folder $_.Name
            if ($_.FullName -ne $target) {
                $raw=Get-Content -LiteralPath $_.FullName -Raw -ErrorAction SilentlyContinue
                if ($null -ne $raw) {
                    $redacted=$raw.Replace($env:USERPROFILE,'<USER_HOME>')
                    Set-Content -LiteralPath $target -Value $redacted -Encoding UTF8
                }
            }
        }
}
if (-not $NoLaunch -and $found) {
    Write-Host 'Starting Beckenburg. Close the game (or acknowledge its crash) to finish diagnostics.'
    $out=Join-Path $folder 'launcher-stdout.txt'
    $err=Join-Path $folder 'launcher-stderr.txt'
    try {
        $process=Start-Process -FilePath $found -PassThru -Wait -RedirectStandardOutput $out -RedirectStandardError $err
        $summary.Add('Launch exit code: '+$process.ExitCode)
    } catch {
        $summary.Add('Launch exception: '+$_)
    }
}
try {
    $since=(Get-Date).AddHours(-3)
    $events=Get-WinEvent -FilterHashtable @{LogName='Application';StartTime=$since;Id=1000,1001,1002} -MaxEvents 100 -ErrorAction Stop |
        Where-Object { $_.Message -match '(?i)beckenburg|javaw?\.exe' } |
        Select-Object -First 12 TimeCreated,Id,ProviderName,Message
    if ($events) {
        $eventText=($events | Format-List | Out-String).Replace($env:USERPROFILE,'<USER_HOME>')
        Set-Content -LiteralPath (Join-Path $folder 'windows-application-events.txt') -Value $eventText -Encoding UTF8
        $summary.Add('Matching Windows Application events: '+@($events).Count)
    } else { $summary.Add('No matching Windows crash events found in last 3 hours') }
} catch { $summary.Add('Windows Application event query unavailable: '+$_) }
$summaryText=($summary -join [Environment]::NewLine).Replace($env:USERPROFILE,'<USER_HOME>')
Set-Content -LiteralPath (Join-Path $folder 'diagnostics-summary.txt') -Value $summaryText -Encoding UTF8
$bundle=$folder+'.zip'
Compress-Archive -LiteralPath (Join-Path $folder '*') -DestinationPath $bundle -CompressionLevel Optimal -Force
Write-Host $summaryText
Write-Host ('Local diagnostics archive: '+$bundle)
Write-Host 'No files were uploaded and no save data was modified.'
