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
# Compile a conventional Windows executable using the .NET Framework compiler.
$compiler = Join-Path $env:WINDIR 'Microsoft.NET\Framework64\v4.0.30319\csc.exe'
if (-not (Test-Path -LiteralPath $compiler)) { $compiler = Join-Path $env:WINDIR 'Microsoft.NET\Framework\v4.0.30319\csc.exe' }
if (-not (Test-Path -LiteralPath $compiler)) { throw 'The Windows .NET Framework 4.x C# compiler is required.' }
New-Item -ItemType Directory -Path 'dist\launcher' -Force | Out-Null
& $compiler /nologo /target:winexe /platform:x64 /optimize+ /warnaserror+ "/win32icon:$PSScriptRoot\app.ico" "/out:$PSScriptRoot\dist\launcher\SimpleSoundManagerLauncher.exe" (Join-Path $PSScriptRoot 'launcher-win.cs')
if ($LASTEXITCODE -ne 0) { throw 'Windows launcher compilation failed.' }
& '.venv\Scripts\python.exe' -m unittest discover -s tests -p test_launcher.py -v
if ($LASTEXITCODE -ne 0) { throw 'Compiled launcher checks failed.' }
& '.venv\Scripts\python.exe' package.py
if ($LASTEXITCODE -ne 0) { throw 'License/source packaging failed.' }
Write-Host 'Built: dist\SimpleSoundManager\SimpleSoundManager.exe'
