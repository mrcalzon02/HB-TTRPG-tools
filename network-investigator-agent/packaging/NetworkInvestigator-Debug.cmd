@echo off
setlocal
cd /d "%~dp0"

echo NETWORK INVESTIGATOR - DEBUG LAUNCH
echo ===================================
echo.
echo This window will remain open so startup errors are visible.
echo.
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0NetworkInvestigator.ps1" -KeepWindow %*
set "NI_EXIT=%ERRORLEVEL%"
echo.
if not "%NI_EXIT%"=="0" (
  echo Network Investigator failed to launch with exit code %NI_EXIT%.
  echo Diagnostic logs are stored under:
  echo   %USERPROFILE%\Network Investigator\logs
) else (
  echo Network Investigator launcher completed successfully.
)
echo.
pause
exit /b %NI_EXIT%
