$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
if (-not (Test-Path -LiteralPath '.venv\Scripts\python.exe')) {
    python -m venv .venv
    if ($LASTEXITCODE -ne 0) { throw 'Python environment creation failed.' }
}
& '.venv\Scripts\python.exe' -m pip install -r requirements.txt pyinstaller
if ($LASTEXITCODE -ne 0) { throw 'Dependency installation failed.' }
& '.venv\Scripts\python.exe' -m unittest discover -s tests -v
if ($LASTEXITCODE -ne 0) { throw 'Audio checks failed.' }
& '.venv\Scripts\python.exe' make-icon.py
if ($LASTEXITCODE -ne 0) { throw 'Application icon generation failed.' }
& '.venv\Scripts\python.exe' -m PyInstaller --clean --noconfirm --onedir --windowed --name SimpleSoundManager --icon app.ico --add-data 'app-icon.svg;.' --add-data 'windows-audio-setup.ps1;.' --add-data 'update-handoff.ps1;.' --collect-data soundcard --copy-metadata SoundCard --copy-metadata pycaw --copy-metadata PySide6 run.py
if ($LASTEXITCODE -ne 0) { throw 'Application build failed.' }
& '.venv\Scripts\python.exe' -m PyInstaller --clean --noconfirm --onefile --windowed --name SimpleSoundManagerLauncher --icon app.ico --distpath dist\launcher --workpath build\launcher launcher.py
if ($LASTEXITCODE -ne 0) { throw 'Stable launcher build failed.' }
& '.venv\Scripts\python.exe' package.py
if ($LASTEXITCODE -ne 0) { throw 'License/source packaging failed.' }
Write-Host 'Built: dist\SimpleSoundManager\SimpleSoundManager.exe'
