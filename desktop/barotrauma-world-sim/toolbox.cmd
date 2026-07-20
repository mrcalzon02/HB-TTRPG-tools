@echo off
setlocal EnableExtensions

REM Gradle-free Windows entry point for the Barotrauma desktop toolbox.
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0toolbox.ps1" %*
exit /b %ERRORLEVEL%
