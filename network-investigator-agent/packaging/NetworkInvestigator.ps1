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

function Get-NetworkInvestigatorStatus {
    try {
        return Invoke-RestMethod -Uri $StatusUrl -Method Get -TimeoutSec 1
    } catch {
        return $null
    }
}

function Test-NetworkInvestigatorStatus($Status) {
    return $null -ne $Status `
        -and ($Status.state -in @('PASSIVE','RECORDING','FINALIZING')) `
        -and -not [string]::IsNullOrWhiteSpace($Status.mutationToken)
}

function Test-NetworkInvestigatorDashboard {
    try {
        $response = Invoke-WebRequest -Uri $AgentUrl -Method Get -UseBasicParsing -TimeoutSec 2
        return $response.StatusCode -eq 200 `
            -and $response.Content -match '<title>Network Investigator</title>' `
            -and $response.Content -match 'id="record-button"'
    } catch {
        return $false
    }
}

function Test-NetworkInvestigator {
    $status = Get-NetworkInvestigatorStatus
    return (Test-NetworkInvestigatorStatus $status) -and (Test-NetworkInvestigatorDashboard)
}

function Stop-StalePassiveAgent($Status) {
    if (-not (Test-NetworkInvestigatorStatus $Status)) { return }
    if ($Status.state -eq 'RECORDING') {
        throw 'An existing Network Investigator agent is actively RECORDING but its dashboard files are unavailable. It was left running to protect the recording. Run NetworkInvestigator-Debug.cmd for recovery details rather than killing the active session.'
    }

    Write-Host 'A Network Investigator agent is responding, but its dashboard is unavailable. Restarting that passive/stale instance from this extracted bundle...'
    $headers = @{ 'X-Network-Investigator-Token' = $Status.mutationToken }
    Invoke-RestMethod -Uri "http://127.0.0.1:$Port/api/agent/stop" -Method Post -Headers $headers -ContentType 'text/plain' -Body '' -TimeoutSec 2 | Out-Null

    for ($attempt = 0; $attempt -lt 40; $attempt++) {
        Start-Sleep -Milliseconds 125
        if ($null -eq (Get-NetworkInvestigatorStatus)) { return }
    }
    throw 'The stale local agent accepted the stop request but remained bound to the diagnostic port.'
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

    $existingStatus = Get-NetworkInvestigatorStatus
    if ((Test-NetworkInvestigatorStatus $existingStatus) -and -not (Test-NetworkInvestigatorDashboard)) {
        Stop-StalePassiveAgent $existingStatus
    }

    if (-not (Test-NetworkInvestigator)) {
        New-Item -ItemType Directory -Force $LogRoot | Out-Null
        $stamp = Get-Date -Format 'yyyy-MM-dd_HH-mm-ss'
        $StdoutLog = Join-Path $LogRoot "launcher-$stamp.stdout.log"
        $StderrLog = Join-Path $LogRoot "launcher-$stamp.stderr.log"

        Write-Host "Starting Network Investigator on 127.0.0.1:$Port ..."
        $startArguments = @{
            FilePath = $Java
            WorkingDirectory = $PSScriptRoot
            ArgumentList = @('--add-modules','jdk.httpserver','-jar','NetworkInvestigator.jar',"$Port")
            WindowStyle = 'Hidden'
            RedirectStandardOutput = $StdoutLog
            RedirectStandardError = $StderrLog
            PassThru = $true
        }
        $StartedProcess = Start-Process @startArguments

        $ready = $false
        for ($attempt = 0; $attempt -lt 60; $attempt++) {
            Start-Sleep -Milliseconds 250
            if ($StartedProcess.HasExited) { break }
            if (Test-NetworkInvestigator) { $ready = $true; break }
        }

        if (-not $ready) {
            $exitDescription = if ($StartedProcess.HasExited) { "Java exited with code $($StartedProcess.ExitCode)." } else { 'Java remained running but the complete local dashboard never became reachable.' }
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
