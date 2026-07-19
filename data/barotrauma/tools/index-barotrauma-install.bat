@echo off
setlocal EnableExtensions

REM Read-only indexer for a local Barotrauma installation.
REM Optional: drag the Barotrauma folder onto this file, or pass it as argument 1.

set "BT_INSTALL=%~1"
set "INDEX_DIR=%~dp0asset-index"

if defined BT_INSTALL goto validate_install

if exist "%ProgramFiles(x86)%\Steam\steamapps\common\Barotrauma\Content" (
  set "BT_INSTALL=%ProgramFiles(x86)%\Steam\steamapps\common\Barotrauma"
  goto validate_install
)

if exist "%ProgramFiles%\Steam\steamapps\common\Barotrauma\Content" (
  set "BT_INSTALL=%ProgramFiles%\Steam\steamapps\common\Barotrauma"
  goto validate_install
)

for /f "tokens=2,*" %%A in ('reg query "HKCU\Software\Valve\Steam" /v SteamPath 2^>nul ^| find /i "SteamPath"') do set "STEAM_HOME=%%B"
if defined STEAM_HOME if exist "%STEAM_HOME%\steamapps\common\Barotrauma\Content" set "BT_INSTALL=%STEAM_HOME%\steamapps\common\Barotrauma"

if not defined BT_INSTALL (
  echo Barotrauma was not found in the usual Steam location.
  set /p "BT_INSTALL=Paste the full Barotrauma install folder here: "
)

:validate_install
if not exist "%BT_INSTALL%\Content" (
  echo.
  echo ERROR: No Content folder was found at:
  echo   "%BT_INSTALL%"
  echo.
  echo Run this file again and pass the folder containing Barotrauma.exe.
  exit /b 1
)

where powershell.exe >nul 2>nul
if errorlevel 1 (
  echo ERROR: Windows PowerShell is required to create the CSV indexes.
  exit /b 1
)

if not exist "%INDEX_DIR%" mkdir "%INDEX_DIR%"
if errorlevel 1 (
  echo ERROR: Could not create index output folder:
  echo   %INDEX_DIR%
  exit /b 1
)

echo.
echo === Barotrauma installation index ===
echo Source: "%BT_INSTALL%"
echo Output: "%INDEX_DIR%"
echo.

set "BT_INDEX_DIR=%INDEX_DIR%"
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -Command "$ErrorActionPreference='Stop'; $root=[IO.Path]::GetFullPath($env:BT_INSTALL).TrimEnd('\'); $out=$env:BT_INDEX_DIR; $graphicExtensions=@('.png','.jpg','.jpeg','.bmp','.gif','.tga','.tif','.tiff','.dds','.svg','.xnb'); $files=@(Get-ChildItem -LiteralPath $root -Recurse -File -Force -ErrorAction SilentlyContinue | Sort-Object FullName); $records=@($files | ForEach-Object { [pscustomobject]@{ RelativePath=$_.FullName.Substring($root.Length).TrimStart('\').Replace('\','/'); Name=$_.Name; Extension=$_.Extension.TrimStart('.').ToLowerInvariant(); Bytes=$_.Length; ModifiedUtc=$_.LastWriteTimeUtc.ToString('o'); FullPath=$_.FullName } }); $graphics=@($records | Where-Object { $graphicExtensions -contains ('.' + $_.Extension) }); $records | Export-Csv -LiteralPath (Join-Path $out 'all-files.csv') -NoTypeInformation -Encoding UTF8; $graphics | Export-Csv -LiteralPath (Join-Path $out 'graphical-assets.csv') -NoTypeInformation -Encoding UTF8; @('Barotrauma asset index',('Generated UTC: ' + [DateTime]::UtcNow.ToString('o')),('Source: ' + $root),('Total files: ' + $records.Count),('Graphical asset candidates: ' + $graphics.Count),'','graphical-assets.csv includes PNG, JPG, JPEG, BMP, GIF, TGA, TIF, TIFF, DDS, SVG, and XNB files.','Paths in RelativePath use forward slashes for later web-tool imports.') | Set-Content -LiteralPath (Join-Path $out 'index-summary.txt') -Encoding UTF8; Write-Host ('Indexed {0} files; {1} graphical asset candidates.' -f $records.Count,$graphics.Count)"

if errorlevel 1 (
  echo.
  echo ERROR: The Barotrauma index could not be generated.
  exit /b 1
)

echo.
echo Created:
echo   %INDEX_DIR%\all-files.csv
echo   %INDEX_DIR%\graphical-assets.csv
echo   %INDEX_DIR%\index-summary.txt
echo.
echo The Barotrauma installation was only read; no game files were changed.
exit /b 0
