$ErrorActionPreference = 'Stop'
$setupRoot = Join-Path $env:TEMP 'SimpleSoundManager-VBCable'
New-Item -ItemType Directory -Path $setupRoot -Force | Out-Null
$archivePath = Join-Path $setupRoot 'VBCABLE_Driver_Pack45.zip'
Invoke-WebRequest -Uri 'https://download.vb-audio.com/Download_CABLE/VBCABLE_Driver_Pack45.zip' -OutFile $archivePath
Expand-Archive -LiteralPath $archivePath -DestinationPath $setupRoot -Force
$installerName = if ([Environment]::Is64BitOperatingSystem) { 'VBCABLE_Setup_x64.exe' } else { 'VBCABLE_Setup.exe' }
$installerPath = Join-Path $setupRoot $installerName
$signature = Get-AuthenticodeSignature -LiteralPath $installerPath
if ($signature.Status -ne 'Valid' -or $signature.SignerCertificate.Subject -notmatch 'Vincent Burel|BUREL VINCENT|VB-Audio') {
    throw 'The downloaded audio driver did not pass the publisher signature check.'
}
$driverProcess = Start-Process -FilePath $installerPath -ArgumentList '-i','-h' -Verb RunAs -WindowStyle Hidden -Wait -PassThru
if ($driverProcess.ExitCode -notin @(0, 1, 3010)) { throw "Audio driver installer returned $($driverProcess.ExitCode)." }
