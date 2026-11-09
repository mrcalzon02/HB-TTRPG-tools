param(
    [Parameter(Mandatory=$true)][string]$Directory,
    [ValidateRange(10,120)][int]$HeartbeatSeconds=30,
    [ValidateRange(30,7200)][int]$MaxLifetimeSeconds=2100
)
$ErrorActionPreference='Stop'
$ProgressPreference='SilentlyContinue'
. (Join-Path $PSScriptRoot 'worker_status.ps1')
[Net.ServicePointManager]::SecurityProtocol=[Net.SecurityProtocolType]::Tls12
function Write-HBPublisherEvent([string]$Event,[string]$ExceptionType='') {
    try {
        $path=Join-Path $Directory 'publisher-events.txt'
        if ((Test-Path -LiteralPath $path) -and (Get-Item -LiteralPath $path).Length -ge 65536) { return }
        $entry=[ordered]@{recorded_utc=[DateTime]::UtcNow.ToString('o');event=$Event;pid=$PID;exception_type=$ExceptionType}
        [IO.File]::AppendAllText($path,(($entry | ConvertTo-Json -Compress)+"`n"),(New-Object Text.UTF8Encoding($false)))
    } catch { }
}
$watch=[Diagnostics.Stopwatch]::StartNew()
$nextAttempt=0.0
$lastAttempt=-100.0
$lastStage=''
$failures=0
$nextDiagnostic=0.0
Write-HBPublisherEvent 'started'
while ($watch.Elapsed.TotalSeconds -lt $MaxLifetimeSeconds) {
    if (Test-Path -LiteralPath (Join-Path $Directory 'publisher.stop')) { break }
    try {
        $worker=Read-HBJson (Join-Path $Directory 'worker-status.json')
        $terminal=$worker.state -in @('completed','blocked','cancelled')
        $stageKey="$($worker.stage):$($worker.state):$($worker.delivery.state)"
        $elapsed=$watch.Elapsed.TotalSeconds
        $stageChanged=$stageKey -ne $lastStage -and ($elapsed-$lastAttempt) -ge 10
        if ($elapsed -ge $nextAttempt -or ($failures -eq 0 -and $stageChanged)) {
            $lastAttempt=$elapsed
            Write-HBPublisherEvent 'publication-attempt'
            if (Publish-HBStatus -Directory $Directory -PublicationFailures $failures) {
                Write-HBPublisherEvent 'published'
                $failures=0; $lastStage=$stageKey
                $nextAttempt=$watch.Elapsed.TotalSeconds+$HeartbeatSeconds
                if ($terminal) { break }
            } else {
                Write-HBPublisherEvent 'publication-unavailable'
                $failures++
                $backoff=[Math]::Min(116,10*[Math]::Pow(2,[Math]::Min($failures-1,4)))
                $nextAttempt=$watch.Elapsed.TotalSeconds+$backoff+(Get-Random -Minimum 0 -Maximum 5)
            }
        }
    } catch {
        # Telemetry never stops or reruns the actual task. The reader will label old data stale.
        if ($watch.Elapsed.TotalSeconds -ge $nextDiagnostic) {
            Write-HBPublisherEvent 'local-observation-error' $_.Exception.GetType().FullName
            $nextDiagnostic=$watch.Elapsed.TotalSeconds+30
        }
        $nextAttempt=$watch.Elapsed.TotalSeconds+30
    }
    Start-Sleep -Seconds 1
}
Write-HBPublisherEvent 'stopped'
Write-Host 'Status publisher stopped. Task processes were not modified.'
