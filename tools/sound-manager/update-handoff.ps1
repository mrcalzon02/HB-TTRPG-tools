param([int]$AppProcessId, [string]$PackageRoot, [string]$InstallerPath, [string]$LogPath)
$ErrorActionPreference = 'Stop'
try {
    if (Get-Process -Id $AppProcessId -ErrorAction SilentlyContinue) {
        Wait-Process -Id $AppProcessId -Timeout 120 -ErrorAction Stop
    }
    if ($InstallerPath) {
        if (-not (Test-Path -LiteralPath $InstallerPath -PathType Leaf) -or -not $InstallerPath.EndsWith('-Setup.exe', [StringComparison]::OrdinalIgnoreCase)) {
            throw 'The verified Sound Manager installer is missing.'
        }
        $installer = Start-Process -FilePath $InstallerPath -ArgumentList '/SILENT', '/NORESTART', '/CLOSEAPPLICATIONS' -Wait -PassThru
        if ($installer.ExitCode -ne 0) { throw "Windows installer failed with code $($installer.ExitCode)." }
        $app = Join-Path $env:LOCALAPPDATA 'Programs\SimpleSoundManager\SimpleSoundManager.exe'
        if (-not (Test-Path -LiteralPath $app -PathType Leaf)) { throw 'The newly installed launcher was not found.' }
        Start-Process -FilePath $app -WindowStyle Normal
        Remove-Item -LiteralPath $InstallerPath -Force -ErrorAction SilentlyContinue
    } elseif ($PackageRoot) {
        # Compatibility with old published ZIP-only releases.
        & (Join-Path $PackageRoot 'install-windows.ps1') *>> $LogPath
    } else {
        throw 'No Sound Manager update package was provided.'
    }
} catch {
    $_ | Out-File -LiteralPath $LogPath -Append
    Add-Type -AssemblyName System.Windows.Forms
    [System.Windows.Forms.MessageBox]::Show("Sound Manager update failed. The previous version is still installed. Details: $LogPath", 'Simple Sound Manager update') | Out-Null
    exit 1
}
