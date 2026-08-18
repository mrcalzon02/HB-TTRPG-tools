param(
    [string]$Bundle = (Join-Path (Split-Path -Parent $MyInvocation.MyCommand.Path) 'dist\NetworkInvestigator'),
    [int]$Port = 18765
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$BaseUrl = "http://127.0.0.1:$Port"
$HumanBundle = Join-Path $env:RUNNER_TEMP 'Network Investigator Human Launch Test'
$WrongWorkingDirectory = Join-Path $env:RUNNER_TEMP 'Network Investigator Wrong Working Directory'
$Launcher = Join-Path $HumanBundle 'NetworkInvestigator.cmd'
$DebugLauncher = Join-Path $HumanBundle 'NetworkInvestigator-Debug.cmd'
$AgentStarted = $false
$StaleProcess = $null

function Get-Status {
    Invoke-RestMethod -Uri "$BaseUrl/api/status" -Method Get -TimeoutSec 2
}

function Wait-ForStatus([int]$Attempts = 40) {
    for ($attempt = 0; $attempt -lt $Attempts; $attempt++) {
        try { return Get-Status } catch { Start-Sleep -Milliseconds 250 }
    }
    return $null
}

function Get-Dashboard {
    Invoke-WebRequest -Uri "$BaseUrl/" -Method Get -UseBasicParsing -TimeoutSec 2
}

function Assert-Dashboard {
    $response = Get-Dashboard
    if ($response.StatusCode -ne 200) { throw "Dashboard returned HTTP $($response.StatusCode)." }
    if ($response.Content -notmatch '<title>Network Investigator</title>') { throw 'Dashboard HTML is missing the Network Investigator title.' }
    if ($response.Content -notmatch 'id="record-button"') { throw 'Dashboard HTML is missing the RECORD control.' }
}

function Stop-AgentIfRunning {
    try {
        $status = Get-Status
        if (-not [string]::IsNullOrWhiteSpace($status.mutationToken)) {
            $headers = @{ 'X-Network-Investigator-Token' = $status.mutationToken }
            Invoke-RestMethod -Uri "$BaseUrl/api/agent/stop" -Method Post -Headers $headers -ContentType 'text/plain' -Body '' -TimeoutSec 2 | Out-Null
        }
    } catch { }
}

try {
    Remove-Item $HumanBundle -Recurse -Force -ErrorAction SilentlyContinue
    Remove-Item $WrongWorkingDirectory -Recurse -Force -ErrorAction SilentlyContinue
    Copy-Item $Bundle $HumanBundle -Recurse -Force
    New-Item -ItemType Directory -Force $WrongWorkingDirectory | Out-Null

    foreach ($required in @(
        $Launcher,
        $DebugLauncher,
        (Join-Path $HumanBundle 'NetworkInvestigator.ps1'),
        (Join-Path $HumanBundle 'NetworkInvestigator.jar'),
        (Join-Path $HumanBundle 'runtime\bin\java.exe'),
        (Join-Path $HumanBundle 'web\index.html')
    )) {
        if (-not (Test-Path $required -PathType Leaf)) { throw "Human-launch bundle is missing $required" }
        if ((Get-Item $required).Length -le 0) { throw "Human-launch bundle contains an empty file: $required" }
    }

    # Reproduce the real-world failure that previously escaped CI: the API is alive,
    # but the process was started from a directory that has no web/ tree, so GET /
    # returns Not found. The human launcher must recognize and repair this stale state.
    $Java = Join-Path $HumanBundle 'runtime\bin\java.exe'
    $Jar = Join-Path $HumanBundle 'NetworkInvestigator.jar'
    $staleArguments = "--add-modules jdk.httpserver -jar `"$Jar`" $Port"
    $StaleProcess = Start-Process -FilePath $Java -WorkingDirectory $WrongWorkingDirectory -ArgumentList $staleArguments -WindowStyle Hidden -PassThru
    $staleStatus = Wait-ForStatus
    if ($null -eq $staleStatus) { throw 'Could not reproduce stale API-only agent state.' }

    $staleDashboardFailed = $false
    try {
        $staleResponse = Get-Dashboard
        $staleDashboardFailed = $staleResponse.StatusCode -ne 200 -or $staleResponse.Content -notmatch '<title>Network Investigator</title>'
    } catch {
        $staleDashboardFailed = $true
    }
    if (-not $staleDashboardFailed) { throw 'Regression fixture failed: wrong-working-directory agent unexpectedly served the dashboard.' }

    Write-Host "Testing the same CMD launcher a user double-clicks from: $HumanBundle"
    Write-Host 'The launcher must repair the intentionally reproduced API-alive / dashboard-404 stale instance.'
    Push-Location $HumanBundle
    try {
        & $Launcher -NoBrowser -Port $Port
        $launchExit = $LASTEXITCODE
    } finally {
        Pop-Location
    }
    if ($launchExit -ne 0) { throw "NetworkInvestigator.cmd exited $launchExit during human-launch smoke test." }

    $status = Wait-ForStatus
    if ($null -eq $status) { throw 'Agent did not become reachable after the packaged CMD launcher returned success.' }
    $AgentStarted = $true
    if ($status.state -ne 'PASSIVE') { throw "Expected PASSIVE at startup, got $($status.state)." }
    if ([string]::IsNullOrWhiteSpace($status.mutationToken)) { throw 'Status did not return a mutation token.' }
    if ($null -eq $status.lanStatus -or $null -eq $status.dnsStatus -or $null -eq $status.internetStatus) { throw 'Health status fields are missing.' }
    Assert-Dashboard

    # A second launcher invocation must attach to the healthy existing local agent instead of failing or spawning a competing listener.
    Push-Location $HumanBundle
    try {
        & $Launcher -NoBrowser -Port $Port
        $secondLaunchExit = $LASTEXITCODE
    } finally {
        Pop-Location
    }
    if ($secondLaunchExit -ne 0) { throw "Second NetworkInvestigator.cmd invocation exited $secondLaunchExit." }
    Assert-Dashboard

    $headers = @{ 'X-Network-Investigator-Token' = $status.mutationToken }
    Invoke-RestMethod -Uri "$BaseUrl/api/record/start" -Method Post -Headers $headers -ContentType 'text/plain' -Body '' | Out-Null
    $recording = Get-Status
    if ($recording.state -ne 'RECORDING') { throw "Expected RECORDING after start, got $($recording.state)." }

    Invoke-RestMethod -Uri "$BaseUrl/api/marker" -Method Post -Headers $headers -ContentType 'text/plain' -Body 'CI human-launch smoke-test marker' | Out-Null
    Invoke-RestMethod -Uri "$BaseUrl/api/record/stop" -Method Post -Headers $headers -ContentType 'text/plain' -Body '' | Out-Null
    $stopped = Get-Status
    if ($stopped.state -ne 'PASSIVE') { throw "Expected PASSIVE after stop, got $($stopped.state)." }

    Invoke-RestMethod -Uri "$BaseUrl/api/agent/stop" -Method Post -Headers $headers -ContentType 'text/plain' -Body '' | Out-Null
    $AgentStarted = $false
    $stoppedCleanly = $false
    for ($attempt = 0; $attempt -lt 20; $attempt++) {
        Start-Sleep -Milliseconds 250
        try { Get-Status | Out-Null } catch { $stoppedCleanly = $true; break }
    }
    if (-not $stoppedCleanly) { throw 'Agent remained reachable after /api/agent/stop.' }

    Write-Host 'Network Investigator human-launch and stale-dashboard recovery smoke test passed.'
} finally {
    if ($AgentStarted) { Stop-AgentIfRunning }
    if ($null -ne $StaleProcess -and -not $StaleProcess.HasExited) {
        Stop-Process -Id $StaleProcess.Id -Force -ErrorAction SilentlyContinue
    }
}
