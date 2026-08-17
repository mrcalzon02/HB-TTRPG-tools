param(
    [ValidateRange(1024, 65535)]
    [int]$Port = 8765,
    [switch]$NoBrowser,
    [switch]$KeepWindow
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$AgentUrl = "http://127.0.0.1:$Port/"
$StatusUrl = "http://127.0.0.1:$Port/api/status"
$Java = Join-Path $PSScriptRoot 'runtime\bin\java.exe'
$Jar = Join-Path $PSScriptRoot 'NetworkInvestigator.jar'
$Web = Join-Path $PSScriptRoot 'web\index.html'
$DataRoot = Join-Path $env:USERPROFILE 'Network Investigator'
$LogRoot = Join-Path $DataRoot 'logs'
$StartedProcess = $null
$StdoutLog = $null
$StderrLog = $null

function Test-NetworkInvestigator {
    try {
        $status = Invoke-RestMethod -Uri $StatusUrl -Method Get -TimeoutSec 1
        return ($status.state -in @('PASSIVE','RECORDING','FINALIZING')) -and -not [string]::IsNullOrWhiteSpace($status.mutationToken)
    } catch {
        return $false
    }
}

function Get-LogTail([string]$Path) {
    if ([string]::IsNullOrWhiteSpace($Path) -or -not (Test-Path $Path)) { return '' }
    return ((Get-Content $Path -Tail 20 -ErrorAction SilentlyContinue) -join [Environment]::NewLine)
}

try {
    if (-not (Test-Path $Java)) {
        throw "Bundled Java runtime is missing: $Java. Extract the entire Network Investigator ZIP before launching it."
    }
    if (-not (Test-Path $Jar)) {
        throw "Network Investigator JAR is missing: $Jar. Extract the entire Network Investigator ZIP before launching it."
    }
    if (-not (Test-Path $Web)) {
        throw "Network Investigator web interface is missing: $Web. Extract the entire Network Investigator ZIP before launching it."
    }

    if (-not (Test-NetworkInvestigator)) {
        New-Item -ItemType Directory -Force $LogRoot | Out-Null
        $stamp = Get-Date -Format 'yyyy-MM-dd_HH-mm-ss'
        $StdoutLog = Join-Path $LogRoot "launcher-$stamp.stdout.log"
        $StderrLog = Join-Path $LogRoot "launcher-$stamp.stderr.log"

        Write-Host "Starting Network Investigator on 127.0.0.1:$Port ..."
        $StartedProcess = Start-Process \
            -FilePath $Java \
            -WorkingDirectory $PSScriptRoot \
            -ArgumentList @('--add-modules','jdk.httpserver','-jar','NetworkInvestigator.jar',"$Port") \
            -WindowStyle Hidden \
            -RedirectStandardOutput $StdoutLog \
            -RedirectStandardError $StderrLog \
            -PassThru

        $ready = $false
        for ($attempt = 0; $attempt -lt 60; $attempt++) {
            Start-Sleep -Milliseconds 250
            if ($StartedProcess.HasExited) { break }
            if (Test-NetworkInvestigator) { $ready = $true; break }
        }

        if (-not $ready) {
            $exitDescription = if ($StartedProcess.HasExited) { "Java exited with code $($StartedProcess.ExitCode)." } else { 'Java remained running but the local dashboard never became reachable.' }
            $stderrTail = Get-LogTail $StderrLog
            $stdoutTail = Get-LogTail $StdoutLog
            $details = @($exitDescription, "Error log: $StderrLog")
            if (-not [string]::IsNullOrWhiteSpace($stderrTail)) { $details += "`nJava error output:`n$stderrTail" }
            if (-not [string]::IsNullOrWhiteSpace($stdoutTail)) { $details += "`nJava output:`n$stdoutTail" }
            throw ($details -join [Environment]::NewLine)
        }
    }

    Write-Host "Network Investigator is running: $AgentUrl"
    Write-Host "Evidence folder: $DataRoot"
    if (-not $NoBrowser) {
        Start-Process -FilePath $AgentUrl | Out-Null
    }

    if ($KeepWindow) {
        Write-Host ''
        Write-Host 'The local agent continues running after this launcher closes.'
    }
    exit 0
} catch {
    Write-Host ''
    Write-Host 'NETWORK INVESTIGATOR FAILED TO START' -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    Write-Host ''
    Write-Host "Diagnostic logs: $LogRoot"
    if ($KeepWindow) {
        Write-Host ''
        Read-Host 'Press Enter to close'
    }
    exit 1
}
