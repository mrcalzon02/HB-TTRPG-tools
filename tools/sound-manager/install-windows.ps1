$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
$sourcePath = Join-Path $PSScriptRoot 'dist\SimpleSoundManager'
if (-not (Test-Path -LiteralPath (Join-Path $sourcePath 'SimpleSoundManager.exe'))) {
    & (Join-Path $PSScriptRoot 'build.ps1')
}
$releaseVersion = (Get-Content -LiteralPath (Join-Path $sourcePath 'version.txt') -Raw).Trim()
if ($releaseVersion -notmatch '^\d+\.\d+\.\d+$') { throw 'Invalid application release version.' }
$installPath = Join-Path $env:LOCALAPPDATA "Programs\SimpleSoundManager\releases\$releaseVersion"
$installRoot = Join-Path $env:LOCALAPPDATA 'Programs\SimpleSoundManager'
$canonicalApp = Join-Path $installRoot 'SimpleSoundManager.exe'
$launcherSource = Join-Path $PSScriptRoot 'dist\launcher\SimpleSoundManagerLauncher.exe'
if (-not (Test-Path -LiteralPath $launcherSource)) { throw 'Stable launcher is missing. Run build.ps1 first.' }
$runningApps = @(Get-Process -Name SimpleSoundManager -ErrorAction SilentlyContinue)
if ($runningApps | Where-Object { $_.Path -eq $canonicalApp }) { throw 'Quit the old root application before repairing its launcher.' }
if ($runningApps | Where-Object { $_.Path -eq (Join-Path $installPath 'SimpleSoundManager.exe') }) {
    throw 'Quit this version from its tray menu before reinstalling it.'
}
New-Item -ItemType Directory -Path $installPath -Force | Out-Null
Copy-Item -Path (Join-Path $sourcePath '*') -Destination $installPath -Recurse -Force
Copy-Item -LiteralPath $launcherSource -Destination $canonicalApp -Force
$releaseMarker = Join-Path $installRoot 'current_release.txt'
Set-Content -LiteralPath $releaseMarker -Value $releaseVersion -Encoding ASCII
$shortcutFolder = Join-Path $env:APPDATA 'Microsoft\Windows\Start Menu\Programs'
$shortcutShell = New-Object -ComObject WScript.Shell
$shortcut = $shortcutShell.CreateShortcut((Join-Path $shortcutFolder 'Simple Sound Manager.lnk'))
$shortcut.TargetPath = $canonicalApp
$shortcut.WorkingDirectory = $installRoot
$shortcut.Save()
# Repair stale app shortcuts, including taskbar pins pointing at older releases.
$shortcutLocations = @([Environment]::GetFolderPath('Desktop'), $shortcutFolder, (Join-Path $env:APPDATA 'Microsoft\Internet Explorer\Quick Launch\User Pinned'))
foreach ($shortcutLocation in $shortcutLocations) {
    if (-not (Test-Path -LiteralPath $shortcutLocation)) { continue }
    foreach ($shortcutFile in Get-ChildItem -LiteralPath $shortcutLocation -Filter '*.lnk' -Recurse -ErrorAction SilentlyContinue) {
        $appShortcut = $shortcutShell.CreateShortcut($shortcutFile.FullName)
        $oldTarget = $appShortcut.TargetPath
        if ($oldTarget -and $oldTarget.StartsWith($installRoot + '\', [StringComparison]::OrdinalIgnoreCase) -and [IO.Path]::GetFileName($oldTarget) -eq 'SimpleSoundManager.exe') {
            $appShortcut.TargetPath = $canonicalApp
            $appShortcut.WorkingDirectory = $installRoot
            $appShortcut.Save()
        }
    }
}
$startupKey = 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Run'
$existingStartup = Get-ItemProperty -LiteralPath $startupKey -Name SimpleSoundManager -ErrorAction SilentlyContinue
if ($existingStartup) {
    $startupCommand = '"' + $canonicalApp + '" --tray'
    Set-ItemProperty -LiteralPath $startupKey -Name SimpleSoundManager -Value $startupCommand
}
Write-Host "Installed to $installPath"
# This is the requested interactive application, not a background helper.
if ($runningApps.Count -eq 0) {
    Start-Process -FilePath $canonicalApp -WindowStyle Normal
} else {
    Write-Host 'Your current playback stays running. The Start Menu shortcut will open the update after you quit the old version.'
}
