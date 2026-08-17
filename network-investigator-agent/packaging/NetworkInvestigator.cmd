@echo off
setlocal
cd /d "%~dp0"

if not exist "%~dp0NetworkInvestigator.ps1" goto :incomplete
if not exist "%~dp0NetworkInvestigator.jar" goto :incomplete
if not exist "%~dp0runtime\bin\java.exe" goto :incomplete
if not exist "%~dp0web\index.html" goto :incomplete

powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0NetworkInvestigator.ps1" %*
set "NI_EXIT=%ERRORLEVEL%"
if not "%NI_EXIT%"=="0" (
  echo.
  echo Network Investigator failed to launch.
  echo Diagnostic logs are stored under:
  echo   %USERPROFILE%\Network Investigator\logs
  echo.
  echo You can also run NetworkInvestigator-Debug.cmd for a persistent diagnostic window.
  pause
)
exit /b %NI_EXIT%

:incomplete
echo.
echo NETWORK INVESTIGATOR CANNOT START
echo ---------------------------------
echo Required files are missing from this folder.
echo Extract the ENTIRE Network Investigator ZIP to a normal folder before running it.
echo Do not run NetworkInvestigator.cmd from inside the ZIP preview.
echo.
pause
exit /b 2
