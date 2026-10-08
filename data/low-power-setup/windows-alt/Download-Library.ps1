#requires -Version 5.1
[CmdletBinding(SupportsShouldProcess)]
param([ValidateSet('Books','Music','Games — DOS and adventures','Games — homebrew ROMs','Games — MAME','Offline references')][string]$Category = 'Books',[string]$Destination = "$env:USERPROFILE\HB-library-downloads")
. "$PSScriptRoot\Common.ps1"
Assert-Windows
Assert-Bundle $PSScriptRoot
$catalog = Get-Content -Encoding UTF8 -Raw -LiteralPath "$PSScriptRoot\catalog\catalog.json" | ConvertFrom-Json
$root = [IO.Path]::GetFullPath($Destination)
foreach ($item in $catalog.items | Where-Object { $_.category -eq $Category }) {
    if ($item.download -notmatch '^https://') { Write-Warning "Manual source visit needed: $($item.name)"; continue }
    if ($item.local -notmatch '^Juneau-Kit/(.+)$') { Write-Warning "No portable file destination recorded: $($item.name)"; continue }
    $relative = $Matches[1]
    if ($relative -match '(^|/)\.\.(/|$)') { throw 'Unsafe relative catalog path.' }
    $file = [IO.Path]::GetFullPath((Join-Path $root $relative))
    if (-not $file.StartsWith($root.TrimEnd('\') + '\',[StringComparison]::OrdinalIgnoreCase)) { throw 'Unsafe catalog destination.' }
    if (Test-Path -LiteralPath $file) { Write-Warning "Already exists; leaving intact: $file"; continue }
    if ($PSCmdlet.ShouldProcess($item.name, "Download to $file")) {
        New-Item -ItemType Directory -Path (Split-Path $file -Parent) -Force | Out-Null
        [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
        Invoke-WebRequest -UseBasicParsing -Uri $item.download -OutFile "$file.partial"
        if ($item.sha256) {
            if ((Get-FileHash -LiteralPath "$file.partial" -Algorithm SHA256).Hash.ToLowerInvariant() -ne $item.sha256) { throw "Checksum mismatch: $($item.name)" }
        } elseif ($item.notes -match 'Source MD5: ([0-9a-f]{32})') {
            if ((Get-FileHash -LiteralPath "$file.partial" -Algorithm MD5).Hash.ToLowerInvariant() -ne $Matches[1]) { throw "Checksum mismatch: $($item.name)" }
        } else { Write-Warning "No recorded checksum for $($item.name); verify with the source." }
        Move-Item -LiteralPath "$file.partial" -Destination $file
    }
}
# ZIPs remain zipped. Extract appropriate games manually; keep MAME ROMs zipped.
