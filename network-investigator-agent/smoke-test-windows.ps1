param(
    [string]$Bundle = (Join-Path (Split-Path -Parent $MyInvocation.MyCommand.Path) 'dist\NetworkInvestigator'),
    [int]$Port = 18765
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$BaseUrl = "http://127.0.0.1:$Port"
$HumanBundle = Join-Path $env:RUNNER_TEMP 'Network Investigator Human Launch Test'
$Launcher = Join-Path $HumanBundle 'NetworkInvestigator.cmd'
$DebugLauncher = Join-Path $HumanBundle 'NetworkInvestigator-Debug.cmd'
$AgentStarted = $false

function Get-Status {
    Invoke-RestMethod -Uri "$BaseUrl/api/status" -Method Get -TimeoutSec 2
}

function Wait-ForStatus([int]$Attempts = 40) {
    for ($attempt = 0; $attempt -lt $Attempts; $attempt++) {
        try { return Get-Status } catch { Start-Sleep -Milliseconds 250 }
    }
    return $null
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
    Copy-Item $Bundle $HumanBundle -Recurse -Force

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

    Write-Host "Testing the same CMD launcher a user double-clicks from: $HumanBundle"
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

    # A second launcher invocation must attach to the existing local agent instead of failing or spawning a competing listener.
    Push-Location $HumanBundle
    try {
        & $Launcher -NoBrowser -Port $Port
        $secondLaunchExit = $LASTEXITCODE
    } finally {
        Pop-Location
    }
    if ($secondLaunchExit -ne 0) { throw "Second NetworkInvestigator.cmd invocation exited $secondLaunchExit." }

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

    Write-Host 'Network Investigator human-launch Windows smoke test passed.'
} finally {
    if ($AgentStarted) { Stop-AgentIfRunning }
}
