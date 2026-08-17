@echo off
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0NetworkInvestigator.ps1"
if errorlevel 1 (
  echo.
  echo Network Investigator failed to launch.
  pause
)
