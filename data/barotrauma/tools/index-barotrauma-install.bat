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
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -Command "$ErrorActionPreference='Stop'; $root=[IO.Path]::GetFullPath($env:BT_INSTALL).TrimEnd('\'); $out=$env:BT_INDEX_DIR; $graphicExtensions=@('.png','.jpg','.jpeg','.bmp','.gif','.tga','.tif','.tiff','.dds','.svg','.ico','.xnb'); $audioExtensions=@('.ogg','.wav','.mp3','.flac'); $fontExtensions=@('.ttf','.otf'); $videoExtensions=@('.webm','.mp4'); $files=@(Get-ChildItem -LiteralPath $root -Recurse -File -Force -ErrorAction SilentlyContinue | Sort-Object FullName); $records=@($files | ForEach-Object { [pscustomobject]@{ RelativePath=$_.FullName.Substring($root.Length).TrimStart('\').Replace('\','/'); Name=$_.Name; Extension=$_.Extension.TrimStart('.').ToLowerInvariant(); Bytes=$_.Length; ModifiedUtc=$_.LastWriteTimeUtc.ToString('o'); FullPath=$_.FullName } }); $graphics=@($records | Where-Object { $graphicExtensions -contains ('.' + $_.Extension) }); $importable=@($records | Where-Object { $extension='.' + $_.Extension; $graphicExtensions -contains $extension -or $audioExtensions -contains $extension -or $fontExtensions -contains $extension -or $videoExtensions -contains $extension } | ForEach-Object { $path=$_.RelativePath; $extension='.' + $_.Extension; $mediaType=if ($audioExtensions -contains $extension) {'audio'} elseif ($fontExtensions -contains $extension) {'font'} elseif ($videoExtensions -contains $extension) {'video'} elseif ($extension -eq '.xnb') {'compiled-content'} else {'image'}; $category=if ($path -match '(?i)^Content/Sounds/Music/') {'music'} elseif ($path -match '(?i)^Content/Sounds/Ambient/') {'ambience'} elseif ($mediaType -eq 'audio' -and $path -match '(?i)^Content/Characters/') {'creature-audio'} elseif ($mediaType -eq 'audio' -and $path -match '(?i)^Content/Sounds/UI/') {'ui-audio'} elseif ($mediaType -eq 'audio') {'sound-effects'} elseif ($path -match '(?i)^Content/BackgroundCreatures/') {'creature-elements'} elseif ($path -match '(?i)^Content/SplashScreens/' -or ($path -match '(?i)^Content/' -and $_.Name -match '(?i)(background|banner)')) {'backgrounds'} elseif ($path -match '(?i)^Content/UI/') {'ui-elements'} elseif ($path -match '(?i)^Content/Map/') {'map-elements'} elseif ($path -match '(?i)^Content/Characters/') {'creature-elements'} elseif ($path -match '(?i)^Content/Items/') {'item-elements'} elseif ($path -match '(?i)^Content/Submarines/') {'submarine-elements'} elseif ($path -match '(?i)^Content/(Effects|Particles|Lights)/') {'effects'} elseif ($mediaType -eq 'font') {'ui-elements'} elseif ($mediaType -eq 'video') {'video'} else {'other-media'}; [pscustomobject]@{ Category=$category; MediaType=$mediaType; RelativePath=$_.RelativePath; Name=$_.Name; Extension=$_.Extension; Bytes=$_.Bytes; ModifiedUtc=$_.ModifiedUtc; FullPath=$_.FullPath } }); $records | Export-Csv -LiteralPath (Join-Path $out 'all-files.csv') -NoTypeInformation -Encoding UTF8; $graphics | Export-Csv -LiteralPath (Join-Path $out 'graphical-assets.csv') -NoTypeInformation -Encoding UTF8; $importable | Sort-Object Category,RelativePath | Export-Csv -LiteralPath (Join-Path $out 'importable-assets.csv') -NoTypeInformation -Encoding UTF8; $categoryLines=@($importable | Group-Object Category | Sort-Object Name | ForEach-Object { '  ' + $_.Name + ': ' + $_.Count }); @('Barotrauma asset index',('Generated UTC: ' + [DateTime]::UtcNow.ToString('o')),('Source: ' + $root),('Total files: ' + $records.Count),('Graphical asset candidates: ' + $graphics.Count),('Categorized import candidates: ' + $importable.Count),'','Import categories:') + $categoryLines + @('','graphical-assets.csv includes common image formats, ICO, and XNB files.','importable-assets.csv also includes OGG, WAV, MP3, FLAC, TTF, OTF, WEBM, and MP4 files.','Paths in RelativePath use forward slashes for portable desktop-client resolution.') | Set-Content -LiteralPath (Join-Path $out 'index-summary.txt') -Encoding UTF8; Write-Host ('Indexed {0} files; {1} categorized import candidates.' -f $records.Count,$importable.Count)"

if errorlevel 1 (
  echo.
  echo ERROR: The Barotrauma index could not be generated.
  exit /b 1
)

echo.
echo Created:
echo   %INDEX_DIR%\all-files.csv
echo   %INDEX_DIR%\graphical-assets.csv
echo   %INDEX_DIR%\importable-assets.csv
echo   %INDEX_DIR%\index-summary.txt
echo.
echo The Barotrauma installation was only read; no game files were changed.
exit /b 0
