param(
    [Parameter(Mandatory=$true)][string]$InputPath,
    [Parameter(Mandatory=$true)][string]$OutputPath,
    [ValidateRange(-10,10)][int]$Rate = 0,
    [string]$VoiceName = ""
)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Speech
$speaker = New-Object System.Speech.Synthesis.SpeechSynthesizer
try {
    $speaker.Rate = $Rate
    if ($VoiceName) { $speaker.SelectVoice($VoiceName) }
    $spokenText = [System.IO.File]::ReadAllText($InputPath, [System.Text.Encoding]::UTF8)
    if ([string]::IsNullOrWhiteSpace($spokenText)) { throw "Input is empty" }
    $speaker.SetOutputToWaveFile($OutputPath)
    $speaker.Speak($spokenText)
} finally {
    $speaker.Dispose()
}
