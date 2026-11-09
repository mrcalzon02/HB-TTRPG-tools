param([Parameter(Mandatory=$true)][string]$Directory)
# Isolated, dependency-free contract tests. Every API/process boundary is replaced
# before a test runs; no network request or background publisher is permitted.
$ErrorActionPreference = 'Stop'
$WarningPreference = 'SilentlyContinue'
. (Join-Path $PSScriptRoot 'worker_status.ps1')

$script:HBRealAtomic = ${function:Write-HBAtomicJson}
$script:HBRealPublish = ${function:Publish-HBStatus}
$script:HBRealStop = ${function:Stop-HBStatusPublisher}
$script:HBResults = New-Object 'System.Collections.Generic.List[object]'
$script:HBCaseNumber = 0
$script:HBTestRoot = Join-Path ([IO.Path]::GetFullPath($Directory)) ('offline-' + [Guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Force -Path $script:HBTestRoot | Out-Null

function Assert-HBTest([bool]$Condition, [string]$Message) {
    if (-not $Condition) { throw $Message }
}
function Assert-HBEqual($Actual, $Expected, [string]$Message) {
    if ($Actual -ne $Expected) { throw $Message }
}
function Reset-HBTestDoubles {
    $script:HBCalls = New-Object 'System.Collections.Generic.List[object]'
    $script:HBSleeps = New-Object 'System.Collections.Generic.List[object]'
    $script:HBEvents = New-Object 'System.Collections.Generic.List[string]'
    $script:HBApi = { param($Method,$Url,$Body) throw 'Unexpected offline API call.' }
    $script:HBMockProcess = $null
    $script:HBStartedArguments = $null
    $script:HBAtomicFailurePath = ''
    $script:HBStopOverride = $false
    $script:HBStopResult = $true
    $script:HBApiSequence = 0
}
function Invoke-HBGitHubRequest {
    param([string]$Method,[string]$Url,$Body)
    [void]$script:HBCalls.Add([pscustomobject]@{method=$Method;url=$Url;body=$Body})
    [void]$script:HBEvents.Add($Method)
    return & $script:HBApi $Method $Url $Body
}
function Publish-HBStatus {
    param([Parameter(Mandatory=$true)][string]$Directory,[int]$PublicationFailures=0)
    [void]$script:HBEvents.Add('publish')
    return & $script:HBRealPublish -Directory $Directory -PublicationFailures $PublicationFailures
}
function Stop-HBStatusPublisher {
    param([Parameter(Mandatory=$true)][string]$Directory)
    [void]$script:HBEvents.Add('stop')
    if ($script:HBStopOverride) { return $script:HBStopResult }
    return & $script:HBRealStop -Directory $Directory
}
function Write-HBAtomicJson([string]$Path,$Value) {
    if ($Path -eq $script:HBAtomicFailurePath) { throw 'Injected offline checkpoint failure.' }
    & $script:HBRealAtomic $Path $Value
}
function Start-Sleep {
    param([int]$Seconds,[int]$Milliseconds)
    [void]$script:HBSleeps.Add([pscustomobject]@{seconds=$Seconds;milliseconds=$Milliseconds})
}
function Get-Process {
    [CmdletBinding()]
    param([int]$Id)
    if ($null -eq $script:HBMockProcess) { throw 'Offline process is absent.' }
    return $script:HBMockProcess
}
function Start-Process {
    [CmdletBinding()]
    param([string]$FilePath,[string]$ArgumentList,[string]$WorkingDirectory,[string]$WindowStyle,[switch]$PassThru,
        [string]$RedirectStandardOutput,[string]$RedirectStandardError)
    if ($null -eq $script:HBMockProcess) { throw 'Starting a real process is prohibited in these offline tests.' }
    $script:HBStartedArguments = @{
        file=$FilePath;arguments=$ArgumentList;directory=$WorkingDirectory;window_style=$WindowStyle
        stdout=$RedirectStandardOutput;stderr=$RedirectStandardError
    }
    return $script:HBMockProcess
}
function New-HBTestProcess([bool[]]$WaitResults=@($true)) {
    $process = [pscustomobject]@{
        Id=43210; StartTime=[DateTime]::Parse('2026-01-01T00:00:00Z').ToUniversalTime()
        Path='offline-powershell'; HasExited=$false; WaitResults=$WaitResults
        Waits=(New-Object 'System.Collections.Generic.List[int]'); Killed=0; Disposed=0
    }
    $process | Add-Member -MemberType ScriptMethod -Name WaitForExit -Value {
        param([int]$Milliseconds)
        $index=$this.Waits.Count
        [void]$this.Waits.Add($Milliseconds)
        return $this.WaitResults[[Math]::Min($index,$this.WaitResults.Count-1)]
    }
    $process | Add-Member -MemberType ScriptMethod -Name Kill -Value { $this.Killed++ }
    $process | Add-Member -MemberType ScriptMethod -Name Dispose -Value { $this.Disposed++ }
    return $process
}
function Save-HBTestOwnership([string]$Path,$Process,[string]$Ticks='') {
    if (-not $Ticks) { $Ticks=$Process.StartTime.ToUniversalTime().Ticks.ToString() }
    Write-HBAtomicJson (Join-Path $Path 'publisher-process.json') @{pid=$Process.Id;started_ticks=$Ticks}
}
function Enable-HBTestPublication {
    $script:HBApi = {
        param($Method,$Url,$Body)
        if ($Method -eq 'GET') { return [pscustomobject]@{check_runs=@()} }
        return [pscustomobject]@{id=456;html_url='https://github.com/offline/fixture/runs/456'}
    }
}
function Invoke-HBTest([string]$Name,[scriptblock]$Body) {
    Reset-HBTestDoubles
    $script:HBCaseNumber++
    $path=Join-Path $script:HBTestRoot ('case-{0:00}' -f $script:HBCaseNumber)
    New-Item -ItemType Directory -Force -Path $path | Out-Null
    $env:GITHUB_STEP_SUMMARY=Join-Path $path 'job-summary.md'
    Initialize-HBStatus -Directory $path -Mode 'status'
    try {
        & $Body $path
        [void]$script:HBResults.Add([ordered]@{name=$Name;result='passed'})
        Write-Host "PASS $Name"
    } catch {
        [void]$script:HBResults.Add([ordered]@{name=$Name;result='failed';error=(ConvertTo-HBSafeText $_.Exception.Message 240)})
        Write-Host "FAIL $Name"
    }
}

$environmentNames=@('GITHUB_REPOSITORY','GITHUB_RUN_ID','GITHUB_RUN_ATTEMPT','GITHUB_SHA',
    'GITHUB_SERVER_URL','GITHUB_STEP_SUMMARY','RUNNER_NAME','GH_TOKEN','GITHUB_TOKEN')
$savedEnvironment=@{}
foreach ($name in $environmentNames) { $savedEnvironment[$name]=[Environment]::GetEnvironmentVariable($name,'Process') }
try {
    $env:GITHUB_REPOSITORY='offline/fixture'; $env:GITHUB_RUN_ID='123456789'; $env:GITHUB_RUN_ATTEMPT='2'
    $env:GITHUB_SHA=('a' * 40); $env:GITHUB_SERVER_URL='https://github.com'; $env:RUNNER_NAME='offline-runner'
    $env:GH_TOKEN='ghs_OFFLINE_TEST_PLACEHOLDER'; $env:GITHUB_TOKEN='github_OFFLINE_TEST_PLACEHOLDER'

    Invoke-HBTest 'Initial snapshot identifies the exact run and begins pending' {
        param($path)
        $worker=Read-HBJson (Join-Path $path 'worker-status.json')
        Assert-HBEqual $worker.repository 'offline/fixture' 'Repository identity changed.'
        Assert-HBTest ($worker.run_id -is [string]) 'Run ID must remain a string.'
        Assert-HBEqual $worker.run_attempt 2 'Run attempt was not preserved.'
        Assert-HBEqual $worker.commit ('a' * 40) 'Exact commit was not preserved.'
        Assert-HBEqual $worker.run_url 'https://github.com/offline/fixture/actions/runs/123456789' 'Run URL was incorrect.'
        Assert-HBEqual $worker.state 'running' 'Initial worker state was not running.'
        Assert-HBEqual $worker.work_result 'pending' 'Initial work result was not pending.'
        Assert-HBEqual $worker.delivery.state 'pending' 'Initial delivery was not pending.'
        Assert-HBEqual $worker.started_utc $worker.last_progress_utc 'Initial clocks disagree.'
        Assert-HBEqual $worker.progress.Count 0 'Initial progress must be empty.'
        Assert-HBEqual @($worker.errors).Count 0 'Initial errors must be an empty array.'
        Assert-HBTest ($null -eq $worker.delivery.artifact_id) 'Initial artifact ID must be null.'
    }
    Invoke-HBTest 'Snapshot writes advance their clock without fabricating work progress' {
        param($path)
        $file=Join-Path $path 'worker-status.json'
        $worker=Read-HBJson $file
        $worker.updated_utc='2020-01-01T00:00:00Z'; $worker.last_progress_utc='2020-01-01T00:00:00Z'
        Write-HBAtomicJson $file $worker
        Set-HBStatus -Directory $path -Stage 'rendering' -Progress @{process_alive=$true;cpu_seconds=10.5}
        $observed=Read-HBJson $file
        Assert-HBEqual ([DateTime]$observed.last_progress_utc).ToUniversalTime() ([DateTime]'2020-01-01T00:00:00Z').ToUniversalTime() 'A heartbeat incorrectly advanced useful progress.'
        Assert-HBTest (([DateTime]$observed.updated_utc).ToUniversalTime() -gt ([DateTime]'2020-01-01T00:00:00Z').ToUniversalTime()) 'Task observation clock did not advance.'
        Set-HBStatus -Directory $path -Progressed
        $advanced=Read-HBJson $file
        Assert-HBEqual $advanced.updated_utc $advanced.last_progress_utc 'Explicit progress did not advance its clock.'
        Assert-HBEqual $advanced.stage 'rendering' 'An omitted stage was overwritten.'
    }
    Invoke-HBTest 'Progress replaces old counters while delivery merges and errors can clear' {
        param($path)
        Set-HBStatus -Directory $path -Progress @{process_alive=$true;cpu_seconds=12} -Delivery @{artifact_id='321'} -Errors @('old failure')
        Set-HBStatus -Directory $path -Progress @{elapsed_seconds=8} -Delivery @{state='uploading'} -Errors @()
        $worker=Read-HBJson (Join-Path $path 'worker-status.json')
        Assert-HBEqual $worker.progress.Count 1 'Progress retained counters from an older observation.'
        Assert-HBEqual $worker.progress.elapsed_seconds 8 'Current counter was lost.'
        Assert-HBEqual $worker.delivery.artifact_id '321' 'Unspecified delivery fields were lost.'
        Assert-HBEqual @($worker.errors).Count 0 'An explicit empty errors array did not clear errors.'
        Set-HBStatus -Directory $path -Stage 'artifact-upload' -Progress @{}
        $worker=Read-HBJson (Join-Path $path 'worker-status.json')
        Assert-HBEqual $worker.progress.Count 0 'Stage boundary did not clear process counters.'
    }
    Invoke-HBTest 'Repeated atomic checkpoints remain valid JSON without leftover temporary files' {
        param($path)
        for ($index=0; $index -lt 8; $index++) {
            Set-HBStatus -Directory $path -Progress @{completed_units=$index}
            Assert-HBEqual (Read-HBJson (Join-Path $path 'worker-status.json')).progress.completed_units $index 'Checkpoint read did not match its committed value.'
        }
        Assert-HBEqual @(Get-ChildItem -LiteralPath $path -Filter '*.tmp').Count 0 'Atomic writes left a temporary file.'
    }
    Invoke-HBTest 'Public payload permits finite numeric counters and redacts secret-bearing text' {
        param($path)
        $worker=Read-HBJson (Join-Path $path 'worker-status.json')
        $worker.stage="render $env:GH_TOKEN"
        $worker.errors=@("Authorization: Bearer unrelated-secret $env:GITHUB_TOKEN",('long ' * 1000))
        $worker.progress=[ordered]@{process_alive=$true;elapsed_seconds=3.25;cpu_seconds=[double]::NaN;
            working_set_bytes=-1;stdout_bytes='raw output';stderr_bytes=[DateTime]::UtcNow;
            output_files=[double]::PositiveInfinity;completed_units=2;total_units=9;raw_stdout='NEVER_PUBLIC'}
        $payload=Get-HBCheckPayload -Worker $worker -PublicationFailures 2 -Create
        $encoded=$payload | ConvertTo-Json -Depth 15 -Compress
        $envelope=$payload.output.text | ConvertFrom-Json
        Assert-HBTest ([Text.Encoding]::UTF8.GetByteCount($encoded) -le 8192) 'Heartbeat exceeds its payload budget.'
        Assert-HBTest (-not $encoded.Contains($env:GH_TOKEN) -and -not $encoded.Contains($env:GITHUB_TOKEN)) 'A token leaked into the public payload.'
        Assert-HBTest (-not $encoded.Contains('unrelated-secret') -and -not $encoded.Contains('NEVER_PUBLIC')) 'Authorization or raw output leaked.'
        Assert-HBEqual @($envelope.worker.progress.PSObject.Properties).Count 4 'Unsafe or nonnumeric counters were published.'
        Assert-HBEqual $envelope.publication_failures 2 'Failure count was not exposed separately.'
        Assert-HBEqual $payload.head_sha ('a' * 40) 'Create payload lost its exact commit.'
        Assert-HBEqual $payload.external_id '123456789:2' 'Check identity does not include run attempt.'
    }
    Invoke-HBTest 'Upload reporting keeps contact and progress clocks separate without estimating transfer' {
        param($path)
        Set-HBStatus -Directory $path -Stage 'artifact-upload' -Delivery @{state='uploading'}
        $worker=Read-HBJson (Join-Path $path 'worker-status.json')
        $worker.updated_utc='2020-01-02T00:00:00Z'; $worker.last_progress_utc='2020-01-01T00:00:00Z'
        $payload=Get-HBCheckPayload $worker
        $envelope=$payload.output.text | ConvertFrom-Json
        Assert-HBEqual ([DateTime]$envelope.worker.updated_utc).ToUniversalTime() ([DateTime]'2020-01-02T00:00:00Z').ToUniversalTime() 'Reporter overwrote task observation time.'
        Assert-HBEqual ([DateTime]$envelope.worker.last_progress_utc).ToUniversalTime() ([DateTime]'2020-01-01T00:00:00Z').ToUniversalTime() 'Reporter overwrote useful progress time.'
        Assert-HBTest (([DateTime]$envelope.observed_utc).ToUniversalTime() -gt ([DateTime]$envelope.worker.updated_utc).ToUniversalTime()) 'Reporter observation time is not independent.'
        Assert-HBTest ($payload.output.summary.Contains('percentage, and ETA are unavailable')) 'Upload estimates are not explicitly unavailable.'
        Assert-HBEqual $payload.status 'in_progress' 'An active upload was marked completed.'
    }
    Invoke-HBTest 'A completed checkpoint without a valid work and artifact receipt cannot publish success' {
        param($path)
        Set-HBStatus -Directory $path -State 'completed' -WorkResult 'passed' -Delivery @{state='uploaded';artifact_id='321';url='https://example.invalid/artifact'}
        $payload=Get-HBCheckPayload (Read-HBJson (Join-Path $path 'worker-status.json'))
        Assert-HBEqual $payload.conclusion 'failure' 'An invalid artifact URL was accepted as successful completion.'
        Assert-HBEqual ($payload.output.text | ConvertFrom-Json).worker.state 'blocked' 'Public state hid an invalid receipt.'
    }
    Invoke-HBTest 'Publishing creates one exact-run check and keeps publisher and task files independent' {
        param($path)
        Enable-HBTestPublication
        $before=[IO.File]::ReadAllText((Join-Path $path 'worker-status.json'))
        Assert-HBTest (Publish-HBStatus -Directory $path) 'Initial publication failed.'
        Assert-HBEqual $script:HBCalls.Count 2 'Initial publication should reconcile then create.'
        Assert-HBEqual $script:HBCalls[0].method 'GET' 'Creation happened without reconciliation.'
        Assert-HBEqual $script:HBCalls[1].method 'POST' 'An absent check was not created.'
        Assert-HBEqual $script:HBCalls[1].body.head_sha ('a' * 40) 'Created check was not attached to the exact commit.'
        Assert-HBEqual ([IO.File]::ReadAllText((Join-Path $path 'worker-status.json'))) $before 'Publisher changed the task checkpoint.'
        $receipt=Read-HBJson (Join-Path $path 'publisher-receipt.json')
        Assert-HBEqual $receipt.check_id 456 'Check ID was not persisted independently.'
        Assert-HBEqual $receipt.state 'published' 'Successful publication receipt was missing.'
    }
    Invoke-HBTest 'A known check is patched without creating another check' {
        param($path)
        Enable-HBTestPublication
        Write-HBAtomicJson (Join-Path $path 'publisher-receipt.json') @{check_id=456;http_status=503;failures=1}
        Assert-HBTest (Publish-HBStatus -Directory $path) 'Existing check update failed.'
        Assert-HBEqual $script:HBCalls.Count 1 'Known check caused unnecessary API calls.'
        Assert-HBEqual $script:HBCalls[0].method 'PATCH' 'Known check was not patched.'
        Assert-HBTest ($null -eq (Read-HBJson (Join-Path $path 'publisher-receipt.json')).http_status) 'Recovered receipt retained an old HTTP failure.'
    }
    Invoke-HBTest 'A lost create response is reconciled by external ID before retrying' {
        param($path)
        $script:HBApi={
            param($Method,$Url,$Body)
            $script:HBApiSequence++
            switch ($script:HBApiSequence) {
                1 { return [pscustomobject]@{check_runs=@()} }
                2 { throw "Response lost after creation; token=$env:GH_TOKEN" }
                3 { return [pscustomobject]@{check_runs=@([pscustomobject]@{id=456;name='Homebrew worker status';external_id='123456789:2';html_url='https://github.com/offline/fixture/runs/456'})} }
                4 { return [pscustomobject]@{id=456;html_url='https://github.com/offline/fixture/runs/456'} }
                default { throw 'Unexpected duplicate creation.' }
            }
        }
        Assert-HBTest (-not (Publish-HBStatus -Directory $path)) 'Lost response was reported as confirmed.'
        $degraded=[IO.File]::ReadAllText((Join-Path $path 'publisher-receipt.json'))
        Assert-HBTest (-not $degraded.Contains($env:GH_TOKEN) -and -not $degraded.Contains('Response lost')) 'Raw HTTP failure was serialized.'
        Assert-HBTest (Publish-HBStatus -Directory $path -PublicationFailures 1) 'Existing remote check could not be reconciled.'
        Assert-HBEqual (($script:HBCalls | ForEach-Object {$_.method}) -join ',') 'GET,POST,GET,PATCH' 'Retry created a duplicate check.'
    }
    Invoke-HBTest 'Failed reconciliation does not guess that the remote check is absent' {
        param($path)
        $script:HBApi={param($Method,$Url,$Body) throw 'Offline outage.'}
        Assert-HBTest (-not (Publish-HBStatus -Directory $path)) 'Outage was reported as successful publication.'
        Assert-HBEqual $script:HBCalls.Count 1 'Failure caused unbounded or speculative API calls.'
        Assert-HBEqual $script:HBCalls[0].method 'GET' 'Failed reconciliation attempted creation.'
        Assert-HBEqual (Read-HBJson (Join-Path $path 'worker-status.json')).state 'running' 'Telemetry outage changed real work state.'
    }
    Invoke-HBTest 'Exhausting the bounded lookup never creates a possible duplicate' {
        param($path)
        $script:HBApi={param($Method,$Url,$Body) return [pscustomobject]@{check_runs=@(1..100 | ForEach-Object {[pscustomobject]@{name='Homebrew worker status';external_id='another-run';id=$_}})}}
        Assert-HBTest (-not (Publish-HBStatus -Directory $path)) 'Incomplete reconciliation was accepted.'
        Assert-HBEqual $script:HBCalls.Count 3 'Reconciliation was not bounded to three pages.'
        Assert-HBEqual @($script:HBCalls | Where-Object {$_.method -ne 'GET'}).Count 0 'Incomplete lookup caused a duplicate-prone creation.'
    }
    Invoke-HBTest 'A missing token degrades telemetry without making any API call' {
        param($path)
        $token=$env:GH_TOKEN
        try {
            $env:GH_TOKEN=''
            Assert-HBTest (-not (Publish-HBStatus -Directory $path)) 'Missing token was treated as publication success.'
            Assert-HBEqual $script:HBCalls.Count 0 'Missing token still attempted an API call.'
            Assert-HBEqual (Read-HBJson (Join-Path $path 'worker-status.json')).state 'running' 'Missing telemetry token blocked work.'
        } finally { $env:GH_TOKEN=$token }
    }

    Invoke-HBTest 'Final success waits for publisher shutdown and includes the finalized artifact receipt' {
        param($path)
        Enable-HBTestPublication; $script:HBStopOverride=$true
        Set-HBStatus -Directory $path -WorkResult 'passed'
        Complete-HBStatus -Directory $path -WorkOutcome success -UploadOutcome success -ArtifactId '321' -ArtifactUrl 'https://github.com/offline/fixture/actions/runs/123456789/artifacts/321' -ArtifactDigest 'sha256:offline'
        $worker=Read-HBJson (Join-Path $path 'worker-status.json')
        Assert-HBEqual $worker.state 'completed' 'Valid completion was not saved.'
        Assert-HBEqual $worker.delivery.state 'uploaded' 'Artifact receipt was not saved.'
        Assert-HBEqual $script:HBEvents[0] 'stop' 'Finalization published before stopping its publisher.'
        Assert-HBEqual $script:HBCalls[1].body.conclusion 'success' 'Valid work and artifact did not publish success.'
        Assert-HBEqual (Read-HBJson (Join-Path $path 'publisher-receipt.json')).worker_state 'completed' 'Final publisher receipt lost terminal state.'
        $summary=[IO.File]::ReadAllText($env:GITHUB_STEP_SUMMARY)
        Assert-HBTest ($summary.Contains('**completed**') -and $summary.Contains('Artifact ID: 321')) 'Human summary omitted completion or artifact receipt.'
        Assert-HBTest ($summary.Contains('pre-finalization snapshot')) 'Summary failed to explain immutable artifact timing.'
    }
    Invoke-HBTest 'A successful step cannot override a pending work checkpoint' {
        param($path)
        Enable-HBTestPublication; $script:HBStopOverride=$true
        Complete-HBStatus -Directory $path -WorkOutcome success -UploadOutcome success -ArtifactId '321' -ArtifactUrl 'https://github.com/offline/fixture/actions/runs/123456789/artifacts/321'
        $worker=Read-HBJson (Join-Path $path 'worker-status.json')
        Assert-HBEqual $worker.state 'blocked' 'Step success bypassed the work result gate.'
        Assert-HBEqual $worker.work_result 'blocked' 'Unconfirmed work was claimed passed.'
        Assert-HBEqual $worker.delivery.state 'uploaded' 'A valid evidence upload was discarded.'
    }
    Invoke-HBTest 'Missing or foreign artifact receipts block completion' {
        param($path)
        Enable-HBTestPublication; $script:HBStopOverride=$true
        foreach ($artifact in @(@{id='';url=''},@{id='0';url='https://github.com/offline/fixture/actions/runs/123456789/artifacts/0'},@{id='321';url='https://github.com/offline/fixture/actions/runs/999/artifacts/321'})) {
            Set-HBStatus -Directory $path -State running -WorkResult passed -Errors @()
            Complete-HBStatus -Directory $path -WorkOutcome success -UploadOutcome success -ArtifactId $artifact.id -ArtifactUrl $artifact.url
            $worker=Read-HBJson (Join-Path $path 'worker-status.json')
            Assert-HBEqual $worker.state 'blocked' 'Invalid artifact receipt allowed completion.'
            Assert-HBEqual $worker.delivery.state 'failed' 'Invalid artifact receipt was claimed uploaded.'
        }
    }
    Invoke-HBTest 'Failed work stays blocked even when its evidence uploads successfully' {
        param($path)
        Enable-HBTestPublication; $script:HBStopOverride=$true
        Set-HBStatus -Directory $path -WorkResult passed
        Complete-HBStatus -Directory $path -WorkOutcome failure -UploadOutcome success -ArtifactId '321' -ArtifactUrl 'https://github.com/offline/fixture/actions/runs/123456789/artifacts/321'
        $worker=Read-HBJson (Join-Path $path 'worker-status.json')
        Assert-HBEqual $worker.state 'blocked' 'Upload success hid failed work.'
        Assert-HBEqual $worker.work_result 'blocked' 'Failed step was claimed passed.'
        Assert-HBEqual $worker.delivery.state 'uploaded' 'Evidence receipt was lost.'
        Assert-HBEqual $script:HBCalls[1].body.conclusion 'failure' 'Failure check conclusion was incorrect.'
    }
    Invoke-HBTest 'Cancellation stays distinct from failure and successful work' {
        param($path)
        Enable-HBTestPublication; $script:HBStopOverride=$true
        Set-HBStatus -Directory $path -WorkResult passed
        Complete-HBStatus -Directory $path -WorkOutcome success -UploadOutcome cancelled
        $worker=Read-HBJson (Join-Path $path 'worker-status.json')
        Assert-HBEqual $worker.state 'cancelled' 'Cancelled delivery was treated as an ordinary failure.'
        Assert-HBEqual $worker.work_result 'passed' 'Upload cancellation rewrote completed work.'
        Assert-HBEqual $worker.delivery.state 'cancelled' 'Delivery cancellation was lost.'
        Assert-HBEqual $script:HBCalls[1].body.conclusion 'cancelled' 'Check did not preserve cancellation.'
    }
    Invoke-HBTest 'Final publication retries are bounded and cannot turn completed work into failure' {
        param($path)
        $script:HBStopOverride=$true
        $script:HBApi={param($Method,$Url,$Body) throw 'Offline final publication outage.'}
        Set-HBStatus -Directory $path -WorkResult passed
        Complete-HBStatus -Directory $path -WorkOutcome success -UploadOutcome success -ArtifactId '321' -ArtifactUrl 'https://github.com/offline/fixture/actions/runs/123456789/artifacts/321'
        Assert-HBEqual (Read-HBJson (Join-Path $path 'worker-status.json')).state 'completed' 'Telemetry failure changed successful work.'
        Assert-HBEqual $script:HBCalls.Count 3 'Final publication retries were not bounded.'
        Assert-HBEqual (($script:HBSleeps | ForEach-Object {$_.seconds}) -join ',') '2,5' 'Final retry backoff was unexpected.'
        Assert-HBEqual (Read-HBJson (Join-Path $path 'publisher-receipt.json')).state 'degraded' 'Outage receipt was not retained.'
        Assert-HBTest ([IO.File]::ReadAllText($env:GITHUB_STEP_SUMMARY).Contains('degraded; final local checkpoint retained')) 'Summary hid the telemetry outage.'
    }
    Invoke-HBTest 'Unconfirmed publisher shutdown suppresses competing terminal API updates' {
        param($path)
        $script:HBStopOverride=$true; $script:HBStopResult=$false
        Set-HBStatus -Directory $path -WorkResult passed
        Complete-HBStatus -Directory $path -WorkOutcome success -UploadOutcome success -ArtifactId '321' -ArtifactUrl 'https://github.com/offline/fixture/actions/runs/123456789/artifacts/321'
        Assert-HBEqual $script:HBCalls.Count 0 'Terminal API update raced an unconfirmed publisher.'
        Assert-HBEqual (Read-HBJson (Join-Path $path 'worker-status.json')).state 'completed' 'Local outcome was lost when publisher shutdown was uncertain.'
        Assert-HBTest ([IO.File]::ReadAllText($env:GITHUB_STEP_SUMMARY).Contains('shutdown could not be confirmed')) 'Summary hid shutdown uncertainty.'
    }
    Invoke-HBTest 'Failed final checkpoint never publishes the stale running snapshot as final' {
        param($path)
        $script:HBStopOverride=$true
        Set-HBStatus -Directory $path -WorkResult passed
        $script:HBAtomicFailurePath=Join-Path $path 'worker-status.json'
        Complete-HBStatus -Directory $path -WorkOutcome success -UploadOutcome success -ArtifactId '321' -ArtifactUrl 'https://github.com/offline/fixture/actions/runs/123456789/artifacts/321'
        Assert-HBEqual $script:HBCalls.Count 0 'Stale checkpoint was published by the finalizer.'
        Assert-HBEqual (Read-HBJson (Join-Path $path 'worker-status.json')).state 'running' 'Injected checkpoint failure did not preserve the old snapshot.'
        Assert-HBTest ([IO.File]::ReadAllText($env:GITHUB_STEP_SUMMARY).Contains('final snapshot could not be saved')) 'Summary falsely claimed a saved final checkpoint.'
    }

    Invoke-HBTest 'No publisher receipt permits graceful stop without touching a process' {
        param($path)
        Assert-HBTest (Stop-HBStatusPublisher -Directory $path) 'An absent publisher could not be stopped.'
        Assert-HBTest (Test-Path -LiteralPath (Join-Path $path 'publisher.stop')) 'Graceful stop flag was not saved.'
    }
    Invoke-HBTest 'A reused process ID is never waited for or killed' {
        param($path)
        $script:HBMockProcess=New-HBTestProcess
        Save-HBTestOwnership $path $script:HBMockProcess '1'
        Assert-HBTest (Stop-HBStatusPublisher -Directory $path) 'Reused process ID was not treated as an absent owner.'
        Assert-HBEqual $script:HBMockProcess.Killed 0 'An unrelated reused process was killed.'
        Assert-HBEqual $script:HBMockProcess.Waits.Count 0 'An unrelated reused process was waited for.'
        Assert-HBEqual $script:HBMockProcess.Disposed 1 'Process handle was not released.'
    }
    Invoke-HBTest 'A verified owner receives a bounded graceful join before any kill' {
        param($path)
        $script:HBMockProcess=New-HBTestProcess
        Save-HBTestOwnership $path $script:HBMockProcess
        Assert-HBTest (Stop-HBStatusPublisher -Directory $path) 'Graceful publisher shutdown was not confirmed.'
        Assert-HBEqual $script:HBMockProcess.Killed 0 'A gracefully exiting publisher was killed.'
        Assert-HBEqual ($script:HBMockProcess.Waits -join ',') '22000' 'Graceful join was not bounded.'
    }
    Invoke-HBTest 'Only the verified publisher can be terminated after bounded join expiry' {
        param($path)
        $script:HBMockProcess=New-HBTestProcess -WaitResults @($false,$true)
        Save-HBTestOwnership $path $script:HBMockProcess
        Assert-HBTest (Stop-HBStatusPublisher -Directory $path) 'Owned publisher fallback shutdown was not confirmed.'
        Assert-HBEqual $script:HBMockProcess.Killed 1 'Owned publisher termination was not limited to one process.'
        Assert-HBEqual ($script:HBMockProcess.Waits -join ',') '22000,3000' 'Shutdown waits were not bounded.'
    }
    Invoke-HBTest 'Unconfirmed termination and malformed ownership remain uncertain' {
        param($path)
        $script:HBMockProcess=New-HBTestProcess -WaitResults @($false,$false)
        Save-HBTestOwnership $path $script:HBMockProcess
        Assert-HBTest (-not (Stop-HBStatusPublisher -Directory $path)) 'Unconfirmed termination was reported as stopped.'
        [IO.File]::WriteAllText((Join-Path $path 'publisher-process.json'),'{broken-json')
        $script:HBMockProcess.Killed=0
        Assert-HBTest (-not (Stop-HBStatusPublisher -Directory $path)) 'Malformed ownership was reported as confirmed.'
        Assert-HBEqual $script:HBMockProcess.Killed 0 'Malformed ownership caused a process kill.'
    }
    Invoke-HBTest 'Startup persists only its owned process identity and keeps credentials off command lines' {
        param($path)
        $script:HBMockProcess=New-HBTestProcess
        Start-HBStatusPublisher -Directory $path
        $receipt=Read-HBJson (Join-Path $path 'publisher-process.json')
        Assert-HBEqual $receipt.pid 43210 'Startup persisted the wrong process ID.'
        Assert-HBEqual $receipt.started_ticks $script:HBMockProcess.StartTime.ToUniversalTime().Ticks.ToString() 'Startup did not capture process start time.'
        Assert-HBEqual $receipt.Count 3 'Process receipt contains data beyond identity and creation time.'
        Assert-HBTest (-not $script:HBStartedArguments.arguments.Contains($env:GH_TOKEN)) 'Token was placed on the publisher command line.'
        Assert-HBEqual $script:HBStartedArguments.directory $path 'Publisher did not use its scoped report directory.'
        Assert-HBEqual $script:HBStartedArguments.window_style 'Hidden' 'Publisher did not request its own hidden console.'
        Assert-HBTest (-not $script:HBStartedArguments.stdout -and -not $script:HBStartedArguments.stderr) 'Publisher inherited the step redirection path.'
        Assert-HBEqual $script:HBMockProcess.Disposed 1 'Startup process handle was not released.'
    }
    Invoke-HBTest 'Failed ownership persistence cannot leave an untracked publisher running' {
        param($path)
        $script:HBMockProcess=New-HBTestProcess
        $script:HBAtomicFailurePath=Join-Path $path 'publisher-process.json'
        $failed=$false
        try { Start-HBStatusPublisher -Directory $path } catch { $failed=$true }
        Assert-HBTest $failed 'Failed ownership persistence was hidden.'
        Assert-HBEqual $script:HBMockProcess.Killed 1 'Untracked spawned publisher was left running.'
        Assert-HBEqual ($script:HBMockProcess.Waits -join ',') '3000' 'Cleanup of untracked publisher was not bounded.'
        Assert-HBEqual $script:HBMockProcess.Disposed 1 'Failed startup leaked its process handle.'
    }

    Reset-HBTestDoubles
    $failed=@($script:HBResults | Where-Object {$_.result -eq 'failed'})
    Write-HBAtomicJson (Join-Path ([IO.Path]::GetFullPath($Directory)) 'worker-status-tests.json') ([ordered]@{
        schema_version=1; completed_utc=[DateTime]::UtcNow.ToString('o'); total=$script:HBResults.Count
        passed=$script:HBResults.Count-$failed.Count; failed=$failed.Count; tests=@($script:HBResults.ToArray())
    })
    if ($failed.Count -gt 0) { throw ("Offline worker status tests failed: " + (($failed | ForEach-Object {$_.name}) -join '; ')) }
    Write-Host "HB_STATUS_TESTS_PASSED tests=$($script:HBResults.Count)"
} finally {
    foreach ($name in $environmentNames) { [Environment]::SetEnvironmentVariable($name,$savedEnvironment[$name],'Process') }
}
