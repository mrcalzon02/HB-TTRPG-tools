@echo off
setlocal EnableExtensions

REM Run this from Windows CMD or double-click it from the repo root.
REM It scans the local assets folder, writes manifests, commits the current repo state, and pushes main.

cd /d "%~dp0"

echo.
echo === HB TTRPG Tools: asset scan and GitHub push ===
echo Working directory: %CD%
echo.

if not exist ".git" (
  echo ERROR: This script must live at the base level of a Git repository.
  echo No .git folder was found at: %CD%
  exit /b 1
)

where git >nul 2>nul
if errorlevel 1 (
  echo ERROR: Git was not found on PATH.
  echo Install Git for Windows, reopen CMD, then run this again.
  exit /b 1
)

set "PYTHON_CMD="
where py >nul 2>nul
if not errorlevel 1 set "PYTHON_CMD=py -3"
if not defined PYTHON_CMD (
  where python >nul 2>nul
  if not errorlevel 1 set "PYTHON_CMD=python"
)
if not defined PYTHON_CMD (
  echo ERROR: Python was not found on PATH.
  echo Install Python 3, reopen CMD, then run this again.
  exit /b 1
)

for /f "usebackq delims=" %%B in (`git rev-parse --abbrev-ref HEAD`) do set "CURRENT_BRANCH=%%B"
if not "%CURRENT_BRANCH%"=="main" (
  echo ERROR: Current branch is "%CURRENT_BRANCH%".
  echo This repo workflow expects exactly one active branch: main.
  echo Switch to main, then run this again.
  exit /b 1
)

echo Using Python command: %PYTHON_CMD%
echo.
echo === Scanning assets ===
%PYTHON_CMD% tools\build_asset_manifest.py --root . --assets assets --out asset-manifest.json --markdown asset-manifest.md --js-out asset-manifest.js --print-summary
if errorlevel 1 (
  echo ERROR: Asset manifest scan failed.
  exit /b 1
)

echo.
echo === Staging repository changes ===
git add -A
if errorlevel 1 (
  echo ERROR: git add failed.
  exit /b 1
)

git diff --cached --quiet
if errorlevel 1 (
  echo.
  echo === Committing changes ===
  git commit -m "Update generated asset manifest"
  if errorlevel 1 (
    echo ERROR: git commit failed.
    exit /b 1
  )
) else (
  echo No local changes to commit after scan.
)

echo.
echo === Pushing main to GitHub ===
git push origin main
if errorlevel 1 (
  echo ERROR: git push failed.
  echo Check your GitHub login/token, remote origin, and network connection.
  exit /b 1
)

echo.
echo Done. Asset manifest generated, repository committed if needed, and main pushed to GitHub.
exit /b 0
