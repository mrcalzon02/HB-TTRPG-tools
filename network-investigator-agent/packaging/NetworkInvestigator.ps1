Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$AgentUrl = 'http://127.0.0.1:8765/'
$StatusUrl = 'http://127.0.0.1:8765/api/status'
$Java = Join-Path $PSScriptRoot 'runtime\bin\javaw.exe'
$Jar = Join-Path $PSScriptRoot 'NetworkInvestigator.jar'

function Test-NetworkInvestigator {
    try {
        $status = Invoke-RestMethod -Uri $StatusUrl -Method Get -TimeoutSec 1
        return ($status.state -in @('PASSIVE','RECORDING','FINALIZING')) -and -not [string]::IsNullOrWhiteSpace($status.mutationToken)
    } catch {
        return $false
    }
}

if (-not (Test-Path $Java)) { throw "Bundled Java runtime is missing: $Java" }
if (-not (Test-Path $Jar)) { throw "Network Investigator JAR is missing: $Jar" }

if (-not (Test-NetworkInvestigator)) {
    Start-Process -FilePath $Java -WorkingDirectory $PSScriptRoot -ArgumentList @('--add-modules','jdk.httpserver','-jar','NetworkInvestigator.jar') | Out-Null
    $ready = $false
    for ($attempt = 0; $attempt -lt 40; $attempt++) {
        Start-Sleep -Milliseconds 250
        if (Test-NetworkInvestigator) { $ready = $true; break }
    }
    if (-not $ready) { throw 'Network Investigator did not start or did not bind to 127.0.0.1:8765.' }
}

Start-Process $AgentUrl | Out-Null
