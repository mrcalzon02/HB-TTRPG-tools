param([int]$AppProcessId, [string]$PackageRoot, [string]$LogPath)
$ErrorActionPreference = 'Stop'
try {
    if (Get-Process -Id $AppProcessId -ErrorAction SilentlyContinue) {
        Wait-Process -Id $AppProcessId -Timeout 120 -ErrorAction Stop
    }
    & (Join-Path $PackageRoot 'install-windows.ps1') *>> $LogPath
} catch {
    $_ | Out-File -LiteralPath $LogPath -Append
    Add-Type -AssemblyName System.Windows.Forms
    [System.Windows.Forms.MessageBox]::Show("Sound Manager update failed. Your previous version is still available from the Start Menu. Details: $LogPath", 'Simple Sound Manager update') | Out-Null
    exit 1
}
