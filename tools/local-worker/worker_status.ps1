# Windows PowerShell 5.1-compatible status support. Dot-source; no work starts here.
$script:HBStatusSupportDirectory = $PSScriptRoot

function ConvertTo-HBMap($Value) {
    if ($null -eq $Value) { return $null }
    if ($Value -is [System.Collections.IDictionary]) {
        $map = [ordered]@{}
        foreach ($key in $Value.Keys) { $map[$key] = ConvertTo-HBMap $Value[$key] }
        return $map
    }
    if ($Value -is [pscustomobject]) {
        $map = [ordered]@{}
        foreach ($property in $Value.PSObject.Properties) { $map[$property.Name] = ConvertTo-HBMap $property.Value }
        return $map
    }
    if ($Value -is [array]) {
        $items = @()
        foreach ($item in $Value) { $items += ,(ConvertTo-HBMap $item) }
        return ,$items
    }
    return $Value
}

function Read-HBJson([string]$Path) {
    return ConvertTo-HBMap ([IO.File]::ReadAllText($Path) | ConvertFrom-Json)
}

function Write-HBAtomicJson([string]$Path, $Value) {
    $temporary = "$Path.$PID.tmp"
    $json = $Value | ConvertTo-Json -Depth 15
    [IO.File]::WriteAllText($temporary, $json, (New-Object Text.UTF8Encoding($false)))
    # Replace within the same directory; readers see a whole old or new snapshot.
    for ($attempt = 0; $attempt -lt 4; $attempt++) {
        try {
            if ([IO.File]::Exists($Path)) { [IO.File]::Replace($temporary, $Path, [System.Management.Automation.Language.NullString]::Value) }
            else { [IO.File]::Move($temporary, $Path) }
            return
        } catch {
            if ($attempt -eq 3) { throw }
            Start-Sleep -Milliseconds 50
        }
    }
}

function Initialize-HBStatus {
    param([Parameter(Mandatory=$true)][string]$Directory, [Parameter(Mandatory=$true)][string]$Mode)
    New-Item -ItemType Directory -Force -Path $Directory | Out-Null
    if ($env:GITHUB_REPOSITORY -notmatch '^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$' -or
        $env:GITHUB_RUN_ID -notmatch '^\d+$' -or $env:GITHUB_SHA -notmatch '^[0-9a-f]{40}$') {
        throw 'Worker status requires an exact GitHub repository, run ID, and commit.'
    }
    $now = [DateTime]::UtcNow.ToString('o')
    $serverUrl = $env:GITHUB_SERVER_URL
    if ([string]::IsNullOrWhiteSpace($serverUrl)) { $serverUrl = 'https://github.com' }
    $serverUrl = $serverUrl.TrimEnd('/')
    if ($serverUrl -ne 'https://github.com') { throw 'This worker status integration requires github.com.' }
    $attempt = 1
    if ($env:GITHUB_RUN_ATTEMPT -match '^\d+$') { $attempt = [int]$env:GITHUB_RUN_ATTEMPT }
    $worker = [ordered]@{
        schema_version=1; repository=$env:GITHUB_REPOSITORY; run_id=[string]$env:GITHUB_RUN_ID
        run_attempt=$attempt; commit=$env:GITHUB_SHA; runner=$env:RUNNER_NAME; mode=$Mode
        run_url="$serverUrl/$env:GITHUB_REPOSITORY/actions/runs/$env:GITHUB_RUN_ID"
        started_utc=$now; updated_utc=$now; last_progress_utc=$now
        stage='starting'; state='running'; progress=[ordered]@{}; work_result='pending'
        delivery=[ordered]@{state='pending';artifact_id=$null;url=$null;digest=$null}; errors=@()
    }
    Write-HBAtomicJson (Join-Path $Directory 'worker-status.json') $worker
}

function Set-HBStatus {
    param(
        [Parameter(Mandatory=$true)][string]$Directory,
        [string]$Stage,
        [ValidateSet('running','completed','blocked','cancelled')][string]$State,
        [ValidateSet('pending','passed','blocked','cancelled')][string]$WorkResult,
        [System.Collections.IDictionary]$Delivery,
        [System.Collections.IDictionary]$Progress,
        [AllowEmptyCollection()][string[]]$Errors,
        [switch]$Progressed
    )
    try {
        $path = Join-Path $Directory 'worker-status.json'
        $worker = Read-HBJson $path
        if ($PSBoundParameters.ContainsKey('Stage')) { $worker.stage = $Stage }
        if ($PSBoundParameters.ContainsKey('State')) { $worker.state = $State }
        if ($PSBoundParameters.ContainsKey('WorkResult')) { $worker.work_result = $WorkResult }
        if ($PSBoundParameters.ContainsKey('Delivery')) {
            foreach ($key in $Delivery.Keys) { $worker.delivery[$key] = $Delivery[$key] }
        }
        # Counters describe this observation, not a cumulative union of earlier stages.
        if ($PSBoundParameters.ContainsKey('Progress')) {
            $worker.progress = [ordered]@{}
            foreach ($key in $Progress.Keys) { $worker.progress[$key] = $Progress[$key] }
        }
        if ($PSBoundParameters.ContainsKey('Errors')) { $worker.errors = @($Errors) }
        $worker.updated_utc = [DateTime]::UtcNow.ToString('o')
        if ($Progressed) { $worker.last_progress_utc = $worker.updated_utc }
        Write-HBAtomicJson $path $worker
    } catch {
        Write-Warning 'Worker status checkpoint could not be updated; task execution continues.'
    }
}

function Start-HBStatusPublisher {
    param([Parameter(Mandatory=$true)][string]$Directory)
    $scriptPath = Join-Path $script:HBStatusSupportDirectory 'publish_status.ps1'
    if ($Directory.Contains('"') -or $scriptPath.Contains('"')) { throw 'Unsupported quote in status path.' }
    $stopPath = Join-Path $Directory 'publisher.stop'
    if (Test-Path -LiteralPath $stopPath) { Remove-Item -LiteralPath $stopPath -Force }
    $powershell = Join-Path $PSHOME 'powershell.exe'
    if (-not (Test-Path -LiteralPath $powershell)) { $powershell = (Get-Process -Id $PID).Path }
    $arguments = '-NoLogo -NoProfile -NonInteractive -ExecutionPolicy Bypass -File "{0}" -Directory "{1}"' -f $scriptPath,$Directory
    $process = Start-Process -FilePath $powershell -ArgumentList $arguments -WorkingDirectory $Directory -PassThru `
        -RedirectStandardOutput (Join-Path $Directory 'publisher.stdout.txt') `
        -RedirectStandardError (Join-Path $Directory 'publisher.stderr.txt')
    try {
        Write-HBAtomicJson (Join-Path $Directory 'publisher-process.json') ([ordered]@{
            pid=$process.Id; started_ticks=$process.StartTime.ToUniversalTime().Ticks.ToString()
            created_utc=[DateTime]::UtcNow.ToString('o')
        })
    } catch {
        # If ownership could not be persisted, do not leave an untracked publisher behind.
        try { if (-not $process.HasExited) { $process.Kill(); $process.WaitForExit(3000) | Out-Null } } catch { }
        throw 'Status publisher ownership receipt could not be saved.'
    } finally { $process.Dispose() }
}

function Stop-HBStatusPublisher {
    param([Parameter(Mandatory=$true)][string]$Directory)
    try { [IO.File]::WriteAllText((Join-Path $Directory 'publisher.stop'), 'stop') } catch { return $false }
    $processPath = Join-Path $Directory 'publisher-process.json'
    if (-not (Test-Path -LiteralPath $processPath)) { return $true }
    try { $record = Read-HBJson $processPath } catch { return $false }
    if ([string]$record.pid -notmatch '^[1-9][0-9]*$' -or [string]$record.started_ticks -notmatch '^[1-9][0-9]*$') { return $false }
    $process = $null
    try {
        try { $process = Get-Process -Id ([int]$record.pid) -ErrorAction Stop }
        catch { return $true }
        # Never stop a process merely because its ID was reused.
        if ($process.StartTime.ToUniversalTime().Ticks.ToString() -ne [string]$record.started_ticks) { return $true }
        if (-not $process.WaitForExit(22000)) {
            $process.Kill()
            if (-not $process.WaitForExit(3000)) { return $false }
        }
        return $true
    } catch { return $false }
    finally { if ($null -ne $process) { $process.Dispose() } }
}

function ConvertTo-HBSafeText([object]$Value, [int]$Limit=160) {
    $text = [string]$Value
    foreach ($secret in @($env:GH_TOKEN,$env:GITHUB_TOKEN)) {
        if (-not [string]::IsNullOrWhiteSpace($secret)) { $text = $text.Replace($secret,'[redacted]') }
    }
    $text = $text -replace '(?i)(authorization\s*[:=]\s*(?:bearer|basic)\s+)\S+','$1[redacted]'
    $text = $text -replace '(?i)(authorization|password|secret|token)\s*[:=]\s*\S+','$1=[redacted]'
    $text = $text -replace '[\r\n\t]',' '
    if ($text.Length -gt $Limit) { $text = $text.Substring(0,$Limit) }
    return $text
}

function Get-HBPublicWorker($Worker) {
    $public = [ordered]@{}
    foreach ($key in @('schema_version','repository','run_id','run_attempt','commit','runner','mode',
        'run_url','started_utc','updated_utc','last_progress_utc','stage','state','work_result')) {
        $public[$key] = $Worker[$key]
    }
    foreach ($key in @('runner','mode','stage')) { $public[$key] = ConvertTo-HBSafeText $public[$key] 96 }
    $public.progress = [ordered]@{}
    foreach ($key in @('process_alive','elapsed_seconds','cpu_seconds','working_set_bytes','stdout_bytes',
        'stderr_bytes','output_files','completed_units','total_units')) {
        if ($Worker.progress.Contains($key)) {
            $value = $Worker.progress[$key]
            if ($key -eq 'process_alive') {
                if ($value -is [bool]) { $public.progress[$key] = $value }
            } elseif ($value -is [byte] -or $value -is [sbyte] -or $value -is [int16] -or
                $value -is [uint16] -or $value -is [int32] -or $value -is [uint32] -or
                $value -is [int64] -or $value -is [uint64] -or $value -is [single] -or
                $value -is [double] -or $value -is [decimal]) {
                if ([double]$value -ge 0 -and -not [double]::IsInfinity([double]$value) -and -not [double]::IsNaN([double]$value)) {
                    $public.progress[$key] = $value
                }
            }
        }
    }
    $public.delivery = [ordered]@{}
    foreach ($key in @('state','artifact_id','url','digest')) { $public.delivery[$key] = $Worker.delivery[$key] }
    $public.errors = @($Worker.errors | Select-Object -First 3 | ForEach-Object { ConvertTo-HBSafeText $_ 180 })
    return $public
}

function Get-HBCheckPayload {
    param($Worker, [int]$PublicationFailures=0, [switch]$Create)
    $public = Get-HBPublicWorker $Worker
    $observed = [DateTime]::UtcNow.ToString('o')
    $terminal = $Worker.state -in @('completed','blocked','cancelled')
    $state = [string]$Worker.state
    $expectedArtifactUrl = "https://github.com/$($Worker.repository)/actions/runs/$($Worker.run_id)/artifacts/$($Worker.delivery.artifact_id)"
    $validCompletion = $Worker.work_result -eq 'passed' -and $Worker.delivery.state -eq 'uploaded' -and
        [string]$Worker.delivery.artifact_id -match '^[1-9][0-9]*$' -and $Worker.delivery.url -eq $expectedArtifactUrl
    if ($state -eq 'completed' -and -not $validCompletion) {
        $state='blocked'; $public.state='blocked'
        $public.errors=@($public.errors)+@('Completion has no valid work and finalized artifact receipt.')
    }
    $summary = @(
        "**$state** - stage: **$($public.stage)**",
        "Runner: $($public.runner); mode: $($public.mode); attempt: $($public.run_attempt).",
        "Reporter sampled: $observed",
        "Task snapshot: $($public.updated_utc)",
        "Last observed work progress: $($public.last_progress_utc)",
        "Work: $($public.work_result); artifact delivery: $($public.delivery.state).",
        'Reporter contact and useful work progress are separate. An old heartbeat means contact is unknown, not that the worker has died.'
    )
    if ($public.delivery.state -eq 'uploading') {
        $summary += 'Artifact upload is active. Bytes transferred, percentage, and ETA are unavailable from this reporter; household bandwidth may vary.'
    }
    if ($public.progress.Count -gt 0) {
        $summary += 'Observed process counters: ' + (($public.progress.Keys | ForEach-Object { "$($_)=$($public.progress[$_])" }) -join ', ')
    }
    if ($public.delivery.url) { $summary += "Artifact receipt: $($public.delivery.url)" }
    if ($PublicationFailures -gt 0) { $summary += "Status publication has had $PublicationFailures consecutive failed attempt(s); local work is preserved." }
    if ($terminal) { $summary += 'The artifact contains its pre-finalization snapshot. This completed check and the job summary carry the final delivery receipt.' }
    $envelope = [ordered]@{schema_version=1;observed_utc=$observed;publication_failures=$PublicationFailures;worker=$public}
    $payload = [ordered]@{
        name='Homebrew worker status'; details_url=$public.run_url
        external_id=("{0}:{1}" -f $public.run_id,$public.run_attempt)
        status=$(if ($terminal) {'completed'} else {'in_progress'})
        output=[ordered]@{
            title=("{0}: {1}" -f $state,$public.stage)
            summary=($summary -join "`n`n")
            text=($envelope | ConvertTo-Json -Depth 12 -Compress)
        }
    }
    if ($Create) { $payload.head_sha = $public.commit; $payload.started_at = $public.started_utc }
    if ($terminal) {
        $payload.conclusion = switch ($state) { 'completed' {'success'} 'cancelled' {'cancelled'} default {'failure'} }
        $payload.completed_at = $observed
    }
    $encoded = $payload | ConvertTo-Json -Depth 15 -Compress
    if ([Text.Encoding]::UTF8.GetByteCount($encoded) -gt 8192) { throw 'Status payload exceeds its 8 KiB limit.' }
    return $payload
}

function Invoke-HBGitHubRequest {
    param([string]$Method,[string]$Url,$Body)
    $headers = @{
        Authorization="Bearer $env:GH_TOKEN"; Accept='application/vnd.github+json'
        'X-GitHub-Api-Version'='2022-11-28'
    }
    $parameters = @{Method=$Method;Uri=$Url;Headers=$headers;UserAgent='Homebrew-worker-status';UseBasicParsing=$true;TimeoutSec=10;ErrorAction='Stop'}
    if ($null -ne $Body) {
        $parameters.ContentType = 'application/json; charset=utf-8'
        $parameters.Body = [Text.Encoding]::UTF8.GetBytes(($Body | ConvertTo-Json -Depth 15 -Compress))
    }
    return Invoke-RestMethod @parameters
}

function Publish-HBStatus {
    param([Parameter(Mandatory=$true)][string]$Directory,[int]$PublicationFailures=0)
    $receiptPath = Join-Path $Directory 'publisher-receipt.json'
    $receipt = [ordered]@{schema_version=1;check_id=$null;check_url=$null;last_success_utc=$null;failures=$PublicationFailures}
    if (Test-Path -LiteralPath $receiptPath) {
        try { $receipt = Read-HBJson $receiptPath } catch { }
    }
    $receipt.attempted_utc = [DateTime]::UtcNow.ToString('o')
    try {
        if ([string]::IsNullOrWhiteSpace($env:GH_TOKEN)) { throw 'Status token unavailable.' }
        $worker = Read-HBJson (Join-Path $Directory 'worker-status.json')
        if ($worker.repository -notmatch '^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$' -or $worker.commit -notmatch '^[0-9a-f]{40}$') {
            throw 'Invalid status identity.'
        }
        $base = "https://api.github.com/repos/$($worker.repository)"
        $externalId = "{0}:{1}" -f $worker.run_id,$worker.run_attempt
        if (-not $receipt.check_id) {
            # A timed-out POST may already have created the check. Reconcile before retrying.
            for ($page=1; $page -le 3 -and -not $receipt.check_id; $page++) {
                $url = "$base/commits/$($worker.commit)/check-runs?check_name=Homebrew%20worker%20status&filter=all&per_page=100&page=$page"
                $existing = Invoke-HBGitHubRequest -Method GET -Url $url -Body $null
                $match = @($existing.check_runs | Where-Object { $_.external_id -eq $externalId -and $_.name -eq 'Homebrew worker status' } | Select-Object -First 1)
                if ($match.Count -gt 0) { $receipt.check_id=$match[0].id; $receipt.check_url=$match[0].html_url }
                if (@($existing.check_runs).Count -lt 100) { break }
                if ($page -eq 3 -and -not $receipt.check_id) { throw 'Check lookup limit reached; creation deferred to avoid duplicates.' }
            }
        }
        if ($receipt.check_id) {
            $result = Invoke-HBGitHubRequest -Method PATCH -Url "$base/check-runs/$($receipt.check_id)" -Body (Get-HBCheckPayload $worker $PublicationFailures)
        } else {
            $result = Invoke-HBGitHubRequest -Method POST -Url "$base/check-runs" -Body (Get-HBCheckPayload $worker $PublicationFailures -Create)
        }
        if (-not $result.id) { throw 'Status receipt was incomplete.' }
        $receipt.check_id=$result.id; $receipt.check_url=$result.html_url
        $receipt.last_success_utc=[DateTime]::UtcNow.ToString('o')
        $receipt.state='published'; $receipt.failures=0; $receipt.error=$null; $receipt.http_status=$null
        $receipt.worker_state=$worker.state; $receipt.worker_updated_utc=$worker.updated_utc
        Write-HBAtomicJson $receiptPath $receipt
        return $true
    } catch {
        $receipt.state='degraded'; $receipt.failures=$PublicationFailures+1
        # Preserve detailed task logs locally; never serialize HTTP exceptions or credentials.
        $receipt.error='Status publication unavailable; task work and local checkpoints continue.'
        $receipt.http_status=$null
        try { if ($_.Exception.Response) { $receipt.http_status=[int]$_.Exception.Response.StatusCode } } catch { }
        try { Write-HBAtomicJson $receiptPath $receipt } catch { }
        return $false
    }
}

function Complete-HBStatus {
    param(
        [Parameter(Mandatory=$true)][string]$Directory,
        [Parameter(Mandatory=$true)][ValidateSet('success','failure','cancelled','skipped')][string]$WorkOutcome,
        [Parameter(Mandatory=$true)][ValidateSet('success','failure','cancelled','skipped')][string]$UploadOutcome,
        [string]$ArtifactId,[string]$ArtifactUrl,[string]$ArtifactDigest
    )
    $publisherStopped = Stop-HBStatusPublisher -Directory $Directory
    $worker = Read-HBJson (Join-Path $Directory 'worker-status.json')
    $expectedArtifactUrl = "https://github.com/$($worker.repository)/actions/runs/$($worker.run_id)/artifacts/$ArtifactId"
    $uploaded = $UploadOutcome -eq 'success' -and $ArtifactId -match '^[1-9][0-9]*$' -and $ArtifactUrl -eq $expectedArtifactUrl
    $cancelled = $WorkOutcome -eq 'cancelled' -or $UploadOutcome -eq 'cancelled'
    $completed = $WorkOutcome -eq 'success' -and $worker.work_result -eq 'passed' -and $uploaded
    $state = if ($completed) {'completed'} elseif ($cancelled) {'cancelled'} else {'blocked'}
    $workResult = if ($WorkOutcome -eq 'success' -and $worker.work_result -eq 'passed') {'passed'} elseif ($WorkOutcome -eq 'cancelled') {'cancelled'} else {'blocked'}
    $deliveryState = if ($uploaded) {'uploaded'} elseif ($UploadOutcome -eq 'cancelled') {'cancelled'} else {'failed'}
    $errors = @($worker.errors)
    if (-not $uploaded) { $errors += 'Artifact upload has no successful finalized receipt.' }
    if ($WorkOutcome -ne 'success') { $errors += "Worker step ended with outcome: $WorkOutcome." }
    Set-HBStatus -Directory $Directory -Stage 'finished' -State $state -WorkResult $workResult `
        -Delivery @{state=$deliveryState;artifact_id=$ArtifactId;url=$ArtifactUrl;digest=$ArtifactDigest} `
        -Errors $errors -Progressed
    $finalSnapshotReady = $false
    try {
        $saved = Read-HBJson (Join-Path $Directory 'worker-status.json')
        $finalSnapshotReady = $saved.stage -eq 'finished' -and $saved.state -eq $state -and
            $saved.work_result -eq $workResult -and $saved.delivery.state -eq $deliveryState -and
            $saved.delivery.artifact_id -eq $ArtifactId
    } catch { }
    $published = $false
    if ($publisherStopped -and $finalSnapshotReady) {
        $failures = 0
        foreach ($delay in @(0,2,5)) {
            if ($delay -gt 0) { Start-Sleep -Seconds $delay }
            if (Publish-HBStatus -Directory $Directory -PublicationFailures $failures) { $published=$true; break }
            $failures++
        }
    }
    $summary = @(
        '## Homebrew worker completion',
        "**$state** - work: $workResult; artifact delivery: $deliveryState.",
        "Run: https://github.com/$($worker.repository)/actions/runs/$($worker.run_id)",
        "Status publication: $(if ($published) {'confirmed'} elseif ($finalSnapshotReady) {'degraded; final local checkpoint retained'} else {'degraded; final snapshot could not be saved'})."
    )
    if (-not $publisherStopped) { $summary += 'Publisher shutdown could not be confirmed; a concurrent terminal publication was not attempted.' }
    if ($uploaded) {
        $summary += "Artifact ID: $ArtifactId"
        $summary += "Artifact: $ArtifactUrl"
        if ($ArtifactDigest) { $summary += "Artifact digest: $ArtifactDigest" }
    }
    if ($errors.Count -gt 0) { $summary += ($errors | ForEach-Object { '- ' + (ConvertTo-HBSafeText $_ 240) }) }
    $summary += 'The uploaded artifact contains the pre-finalization snapshot. This summary and the final status check record the upload receipt.'
    $summary += 'Heartbeat publication does not automatically resume a ChatGPT conversation.'
    $text = $summary -join "`n`n"
    [IO.File]::WriteAllText((Join-Path $Directory 'worker-completion.md'),$text,(New-Object Text.UTF8Encoding($false)))
    if ($env:GITHUB_STEP_SUMMARY) { [IO.File]::AppendAllText($env:GITHUB_STEP_SUMMARY, "$text`n", (New-Object Text.UTF8Encoding($false))) }
    Write-Host "HOME BREW WORKER $($state.ToUpperInvariant()): work=$workResult artifact=$deliveryState status_published=$published"
    # Keep this finalizer successful when only telemetry publication failed.
}
