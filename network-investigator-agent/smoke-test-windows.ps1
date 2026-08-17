param(
    [string]$Bundle = (Join-Path (Split-Path -Parent $MyInvocation.MyCommand.Path) 'dist\NetworkInvestigator'),
    [int]$Port = 18765
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$Java = Join-Path $Bundle 'runtime\bin\java.exe'
$Jar = Join-Path $Bundle 'NetworkInvestigator.jar'
$BaseUrl = "http://127.0.0.1:$Port"
$Process = $null

function Get-Status {
    Invoke-RestMethod -Uri "$BaseUrl/api/status" -Method Get -TimeoutSec 2
}

try {
    $Process = Start-Process -FilePath $Java -WorkingDirectory $Bundle -ArgumentList @('--add-modules','jdk.httpserver','-jar','NetworkInvestigator.jar',"$Port") -WindowStyle Hidden -PassThru
    $status = $null
    for ($attempt = 0; $attempt -lt 40; $attempt++) {
        Start-Sleep -Milliseconds 250
        try { $status = Get-Status; break } catch { }
    }
    if ($null -eq $status) { throw 'Agent did not become reachable during smoke test.' }
    if ($status.state -ne 'PASSIVE') { throw "Expected PASSIVE at startup, got $($status.state)." }
    if ([string]::IsNullOrWhiteSpace($status.mutationToken)) { throw 'Status did not return a mutation token.' }
    if ($null -eq $status.lanStatus -or $null -eq $status.dnsStatus -or $null -eq $status.internetStatus) { throw 'Health status fields are missing.' }

    $headers = @{ 'X-Network-Investigator-Token' = $status.mutationToken }
    Invoke-RestMethod -Uri "$BaseUrl/api/record/start" -Method Post -Headers $headers -ContentType 'text/plain' -Body '' | Out-Null
    $recording = Get-Status
    if ($recording.state -ne 'RECORDING') { throw "Expected RECORDING after start, got $($recording.state)." }

    Invoke-RestMethod -Uri "$BaseUrl/api/marker" -Method Post -Headers $headers -ContentType 'text/plain' -Body 'CI smoke-test marker' | Out-Null
    Invoke-RestMethod -Uri "$BaseUrl/api/record/stop" -Method Post -Headers $headers -ContentType 'text/plain' -Body '' | Out-Null
    $stopped = Get-Status
    if ($stopped.state -ne 'PASSIVE') { throw "Expected PASSIVE after stop, got $($stopped.state)." }

    Invoke-RestMethod -Uri "$BaseUrl/api/agent/stop" -Method Post -Headers $headers -ContentType 'text/plain' -Body '' | Out-Null
    if (-not $Process.WaitForExit(5000)) { throw 'Agent did not exit cleanly after /api/agent/stop.' }

    Write-Host 'Network Investigator Windows smoke test passed.'
} finally {
    if ($null -ne $Process -and -not $Process.HasExited) {
        Stop-Process -Id $Process.Id -Force -ErrorAction SilentlyContinue
    }
}
