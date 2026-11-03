@echo off
setlocal
title SuperPosition Reader - Sphinx Neural Voice Setup
set "SCRIPT=%~dp0_internal\install-neural-windows.ps1"
if not exist "%SCRIPT%" (
  set "SCRIPT=%~dp0install-neural-windows.ps1"
)
if not exist "%SCRIPT%" (
  echo Neural installation helper not found.
  echo Extract the complete SPR portable ZIP before running this shortcut.
  pause
  exit /b 1
)
echo Installing SPR's optional local LuxTTS engine.
echo This needs Python 3.11, Git, an initial internet connection, and several gigabytes.
echo All downloaded models and generated audio are kept in your Windows user profile.
echo.
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT%"
set "STATUS=%ERRORLEVEL%"
echo.
if not "%STATUS%"=="0" (
  echo Neural setup was not completed. See the error above.
) else (
  echo Neural setup finished. Restart SuperPosition Reader to select the Sphinx voice.
)
pause
exit /b %STATUS%
