[CmdletBinding()]
param([switch]$Uninstall, [switch]$RunAfterInstall)

$ErrorActionPreference = 'Stop'
$Here = Split-Path -Parent $MyInvocation.MyCommand.Path
$Program = Join-Path $Here 'spr_app.py'
$Private = Join-Path $env:LOCALAPPDATA 'SuperPositionReader'
$Venv = Join-Path $Private '.venv'
$Python = Join-Path $Venv 'Scripts\python.exe'
$PythonWindow = Join-Path $Venv 'Scripts\pythonw.exe'
$ShortcutDirectory = Join-Path $env:APPDATA 'Microsoft\Windows\Start Menu\Programs'
$ShortcutPath = Join-Path $ShortcutDirectory 'SuperPosition Reader.lnk'

if ($Uninstall) {
    if (Test-Path -LiteralPath $ShortcutPath) {
        Remove-Item -LiteralPath $ShortcutPath -Force
    }
    Write-Host 'Removed the SPR Start Menu shortcut. Voice archives, books and Python environment were preserved.'
    exit 0
}

if (-not (Test-Path -LiteralPath $Program)) { throw 'Missing SPR source files.' }
New-Item -ItemType Directory -Path $Private -Force | Out-Null

if (-not (Test-Path -LiteralPath $Python)) {
    $Launcher = Get-Command py -ErrorAction SilentlyContinue
    if ($Launcher) {
        & py -3 -m venv $Venv
    } else {
        $Launcher = Get-Command python -ErrorAction SilentlyContinue
        if (-not $Launcher) { throw 'Install Python 3.10+ from python.org before running SPR setup.' }
        & python -m venv $Venv
    }
    if ($LASTEXITCODE -ne 0) { throw 'Python virtual environment creation failed.' }
}
& $Python -m pip install --disable-pip-version-check -r (Join-Path $Here 'requirements.txt')
if ($LASTEXITCODE -ne 0) { throw 'A required Python package failed to install; no shortcut was created.' }

Push-Location $Here
try {
    & $Python -c 'import fitz, docx, webview; import spr_core, spr_app; print("SPR dependency import check passed")'
    if ($LASTEXITCODE -ne 0) { throw 'SPR dependency verification failed.' }
} finally { Pop-Location }

New-Item -ItemType Directory -Force -Path $ShortcutDirectory | Out-Null
$WshShell = New-Object -ComObject WScript.Shell
$Shortcut = $WshShell.CreateShortcut($ShortcutPath)
$Shortcut.TargetPath = $PythonWindow
$Shortcut.Arguments = '"' + $Program + '"'
$Shortcut.WorkingDirectory = $Here
$Shortcut.Description = 'SuperPosition Reader - local offline document narrator'
$Shortcut.Save()

Write-Host ''
Write-Host 'SuperPosition Reader installed as a Start Menu shortcut.'
Write-Host 'The app runs locally. Documents and audio will be stored privately in:' $Private
Write-Host 'Current engine: Windows SAPI 5. AI voice cloning is not installed by this build.'
Write-Host 'This setup requires internet for its initial Python packages; ordinary SPR reading stays offline.'
if ($RunAfterInstall) {
    Start-Process -FilePath $PythonWindow -ArgumentList ('"' + $Program + '"') -WorkingDirectory $Here
}
