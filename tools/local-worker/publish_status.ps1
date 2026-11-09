param(
    [Parameter(Mandatory=$true)][string]$Directory,
    [ValidateRange(10,120)][int]$HeartbeatSeconds=30,
    [ValidateRange(30,7200)][int]$MaxLifetimeSeconds=2100
)
$ErrorActionPreference='Stop'
$ProgressPreference='SilentlyContinue'
. (Join-Path $PSScriptRoot 'worker_status.ps1')
[Net.ServicePointManager]::SecurityProtocol=[Net.SecurityProtocolType]::Tls12
$watch=[Diagnostics.Stopwatch]::StartNew()
$nextAttempt=0.0
$lastAttempt=-100.0
$lastStage=''
$failures=0
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
            if (Publish-HBStatus -Directory $Directory -PublicationFailures $failures) {
                $failures=0; $lastStage=$stageKey
                $nextAttempt=$watch.Elapsed.TotalSeconds+$HeartbeatSeconds
                if ($terminal) { break }
            } else {
                $failures++
                $backoff=[Math]::Min(116,10*[Math]::Pow(2,[Math]::Min($failures-1,4)))
                $nextAttempt=$watch.Elapsed.TotalSeconds+$backoff+(Get-Random -Minimum 0 -Maximum 5)
            }
        }
    } catch {
        # Telemetry never stops or reruns the actual task. The reader will label old data stale.
        $nextAttempt=$watch.Elapsed.TotalSeconds+30
    }
    Start-Sleep -Seconds 1
}
Write-Host 'Status publisher stopped. Task processes were not modified.'
