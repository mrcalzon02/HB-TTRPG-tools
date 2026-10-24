#requires -version 5.1
<#
.SYNOPSIS
  One-command local Voicebox/NUTBUSTER owner-voice production and Google Drive upload.
.DESCRIPTION
  Run from any PowerShell shell:
    powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\voicebox\run-nutbuster-local.ps1
  Installs missing user tools with winget, clones trusted upstream into LOCALAPPDATA,
  provisions the Python 3.12 backend, prepares privately stored reference WAVs,
  generates the authored 74 lines, composes a private review pack, and uploads
  ONLY that composed pack into the owner's NUTBUSTER Drive folder using rclone.
  First Google Drive authorization may open a browser. No public GitHub audio upload.
#>
[CmdletBinding()]
param(
    [ValidateSet('all','preview')][string]$Scope = 'all',
    [ValidateSet('luxtts','qwen','chatterbox_turbo')][string]$Engine = 'luxtts',
    [string]$ReferenceWav = '',
    [string]$ReferenceZip = '',
    [string]$DriveRemote = 'nutbuster-drive',
    [string]$DriveFolderId = '1IwvPgWwzabBliPODifPDdT61WqJhfmxu',
    [switch]$SkipDriveUpload
)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Stage([string]$message) {
    Write-Host ('[' + (Get-Date -Format 'HH:mm:ss') + '] ' + $message) -ForegroundColor Cyan
}
function Invoke-Checked([string]$program, [string[]]$arguments) {
    & $program @arguments
    if ($LASTEXITCODE -ne 0) {
        throw ('Command failed (exit ' + $LASTEXITCODE + '): ' + $program + ' ' + ($arguments -join ' '))
    }
}
function Refresh-Path {
    $machine = [Environment]::GetEnvironmentVariable('Path','Machine')
    $user = [Environment]::GetEnvironmentVariable('Path','User')
    $extras = @(
        (Join-Path $env:LOCALAPPDATA 'Microsoft\WinGet\Links'),
        (Join-Path $env:LOCALAPPDATA 'Programs\Git\cmd'),
        (Join-Path $env:ProgramFiles 'Git\cmd'),
        (Join-Path $env:LOCALAPPDATA 'Programs\Python\Python312'),
        (Join-Path $env:LOCALAPPDATA 'Programs\Python\Python312\Scripts')
    )
    $env:PATH = (($extras + @($env:PATH,$user,$machine)) | Where-Object { $_ }) -join ';'
}
function Find-Exe([string]$name) {
    $cmd = Get-Command $name -ErrorAction SilentlyContinue
    if ($cmd) { return $cmd.Source }
    return $null
}
function Ensure-Tool([string]$command, [string]$package) {
    $found = Find-Exe $command
    if ($found) { return $found }
    if (-not (Find-Exe 'winget')) {
        throw ('Missing ' + $command + ' and winget. Install Windows App Installer to enable the automatic bootstrap.')
    }
    Stage ('Installing ' + $package + ' with Windows Package Manager')
    Invoke-Checked 'winget' @('install','--exact','--id',$package,'--accept-package-agreements','--accept-source-agreements','--silent')
    Refresh-Path
    $found = Find-Exe $command
    if (-not $found) {
        throw ('Installed ' + $package + ' but ' + $command + ' is not visible in this terminal. Open a fresh PowerShell window and rerun the SAME command.')
    }
    return $found
}
function Get-Python312 {
    $launcher = Find-Exe 'py'
    if ($launcher) {
        $candidate = (& $launcher -3.12 -c 'import sys; print(sys.executable)' 2>$null)
        if ($LASTEXITCODE -eq 0 -and $candidate -and (Test-Path $candidate)) {
            return [string]$candidate
        }
    }
    foreach ($candidate in @(
        (Join-Path $env:LOCALAPPDATA 'Programs\Python\Python312\python.exe'),
        (Join-Path $env:ProgramFiles 'Python312\python.exe')
    )) {
        if (Test-Path $candidate) { return $candidate }
    }
    $python = Find-Exe 'python'
    if ($python) {
        $version = (& $python -c 'import sys; print(str(sys.version_info[0])+"."+str(sys.version_info[1]))' 2>$null)
        if ($LASTEXITCODE -eq 0 -and $version -eq '3.12') { return $python }
    }
    return $null
}
function Find-VoiceSource([string]$value,[string]$filename) {
    if ($value) {
        if (-not (Test-Path -LiteralPath $value -PathType Leaf)) { throw ('Specified voice source missing: ' + $value) }
        return (Resolve-Path -LiteralPath $value).Path
    }
    foreach ($folder in @((Join-Path $env:USERPROFILE 'Downloads'),(Join-Path $env:USERPROFILE 'Documents'))) {
        $candidate = Join-Path $folder $filename
        if (Test-Path -LiteralPath $candidate -PathType Leaf) { return $candidate }
    }
    return $null
}

try {
    $repo = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
    $batch = Join-Path $repo 'tools\voicebox\nutbuster_batch.py'
    $composer = Join-Path $repo 'tools\voicebox\compose_nutbuster.py'
    if (-not (Test-Path $batch) -or -not (Test-Path $composer)) {
        throw 'Run the latest HB-TTRPG-tools main checkout; missing Voicebox batch/composition scripts.'
    }
    if (-not $env:LOCALAPPDATA) { throw 'Windows LOCALAPPDATA is required for private production storage.' }
    $workspace = Join-Path $env:LOCALAPPDATA 'HB-TTRPG-tools\voicebox-production'
    $references = Join-Path $workspace 'private\references'
    $sources = Join-Path $workspace 'source'
    $voicebox = Join-Path $sources 'voicebox'
    $nutbuster = Join-Path $sources 'NUTBUSTER-R'
    $outRoot = Join-Path $workspace 'private\generated'
    foreach ($folder in @($references,$sources,$outRoot)) {
        New-Item -ItemType Directory -Force -Path $folder | Out-Null
    }
    $runId = (Get-Date -Format 'yyyyMMdd-HHmmss') + '-' + $Scope + '-' + $Engine
    $rendered = Join-Path $outRoot $runId
    $composed = Join-Path $outRoot ($runId + '-composed')
    if ((Test-Path $rendered) -or (Test-Path $composed)) {
        throw 'Private production run ID collision. No previous take will be overwritten.'
    }
    Stage 'Looking for your voice reference WAV or previously downloaded reference ZIP'
    $wav = Find-VoiceSource $ReferenceWav 'For those not yet born.wav'
    $zip = Find-VoiceSource $ReferenceZip 'owner-voicebox-reference-segments.zip'
    $samples = @(Get-ChildItem -LiteralPath $references -Filter 'owner-primary-*.wav' -File -ErrorAction SilentlyContinue)
    if (-not $wav -and -not $zip -and $samples.Count -ne 3) {
        throw 'Voice reference not found. Download "For those not yet born.wav" or "owner-voicebox-reference-segments.zip" from this ChatGPT conversation into Windows Downloads, then rerun the SAME command. No source voice is stored in public GitHub.'
    }
    Stage 'Checking command-line tools'
    Refresh-Path
    $git = Ensure-Tool 'git' 'Git.Git'
    $ffmpeg = Ensure-Tool 'ffmpeg' 'Gyan.FFmpeg'
    $ffprobe = Ensure-Tool 'ffprobe' 'Gyan.FFmpeg'
    $just = Ensure-Tool 'just' 'Casey.Just'
    if (-not $SkipDriveUpload) { $rclone = Ensure-Tool 'rclone' 'Rclone.Rclone' }

    $python312 = Get-Python312
    if (-not $python312) {
        Stage 'Installing Python 3.12 (required by upstream Voicebox)'
        if (-not (Find-Exe 'winget')) { throw 'Python 3.12 is absent and winget is unavailable' }
        Invoke-Checked 'winget' @('install','--exact','--id','Python.Python.3.12','--accept-package-agreements','--accept-source-agreements','--silent')
        Refresh-Path
        $python312 = Get-Python312
        if (-not $python312) { throw 'Python 3.12 installed but unavailable in this shell. Open a fresh PowerShell terminal and rerun the SAME command.' }
    }

    if ($wav) {
        Stage 'Creating three short 24-kHz WAV references from the original recording (privately)'
        $segments = @(@(0,20),@(27,20),@(54,20))
        for ($i=0;$i -lt $segments.Count;$i++) {
            $dest = Join-Path $references ('owner-primary-{0:D2}.wav' -f ($i+1))
            Invoke-Checked $ffmpeg @('-nostdin','-hide_banner','-loglevel','error','-y','-ss',[string]$segments[$i][0],'-t',[string]$segments[$i][1],'-i',$wav,'-ac','1','-ar','24000','-c:a','pcm_s16le',$dest)
        }
    } elseif ($zip -and $samples.Count -ne 3) {
        Stage 'Extracting the privately downloaded three-sample reference ZIP'
        $staging = Join-Path $workspace 'private\reference-zip-staging'
        if (Test-Path $staging) { throw ('Reference staging already exists; inspect before retry: ' + $staging) }
        New-Item -ItemType Directory -Path $staging | Out-Null
        try {
            Expand-Archive -LiteralPath $zip -DestinationPath $staging
            $extracted = @(Get-ChildItem -LiteralPath $staging -Recurse -File -Filter 'owner-primary-*.wav')
            if ($extracted.Count -ne 3) { throw 'Reference ZIP must contain three owner-primary-NN.wav files' }
            foreach ($file in $extracted) { Copy-Item -LiteralPath $file.FullName -Destination (Join-Path $references $file.Name) -ErrorAction Stop }
        } finally { Remove-Item -LiteralPath $staging -Recurse -Force -ErrorAction SilentlyContinue }
    }
    $samples = @(Get-ChildItem -LiteralPath $references -File -Filter 'owner-primary-*.wav')
    if ($samples.Count -ne 3) { throw 'Private voice reference preparation failed: expected three WAV segments.' }

    if (-not $SkipDriveUpload) {
        Stage 'Checking Google Drive OAuth access before expensive voice generation'
        $remotes = @(& $rclone listremotes)
        if ($LASTEXITCODE -ne 0) { throw 'rclone cannot read its configuration.' }
        if ($remotes -notcontains ($DriveRemote + ':')) {
            Stage ('First-run browser authorization for Google Drive remote ' + $DriveRemote)
            Write-Host 'If prompted, sign into the Google account that owns the NUTBUSTER Drive folder.'
            Invoke-Checked $rclone @('config','create',$DriveRemote,'drive','scope','drive','root_folder_id',$DriveFolderId)
        }
        & $rclone lsd ($DriveRemote + ':') --drive-root-folder-id $DriveFolderId
        if ($LASTEXITCODE -ne 0) {
            Stage 'The Google Drive remote is not yet authorized for this folder. Opening interactive rclone configuration for sign-in/repair.'
            Invoke-Checked $rclone @('config')
            Invoke-Checked $rclone @('lsd',($DriveRemote + ':'),'--drive-root-folder-id',$DriveFolderId)
        }
    }

    Stage 'Preparing Voicebox and NUTBUSTER source repositories outside the public checkout'
    if (-not (Test-Path (Join-Path $voicebox '.git'))) {
        if (Test-Path $voicebox) { throw ('Non-git Voicebox source directory exists: ' + $voicebox) }
        Invoke-Checked $git @('clone','--depth','1','https://github.com/jamiepine/voicebox.git',$voicebox)
    }
    if (-not (Test-Path (Join-Path $nutbuster '.git'))) {
        if (Test-Path $nutbuster) { throw ('Non-git NUTBUSTER source directory exists: ' + $nutbuster) }
        Invoke-Checked $git @('clone','--depth','1','https://github.com/mrcalzon02/NUTBUSTER-R.git',$nutbuster)
    }
    Stage 'Recording source revisions (no automatic reset of existing checkouts)'
    Invoke-Checked $git @('-C',$voicebox,'rev-parse','HEAD')
    Invoke-Checked $git @('-C',$nutbuster,'rev-parse','HEAD')

    $backendPy = Join-Path $voicebox 'backend\venv\Scripts\python.exe'
    $backendOkay = $false
    if (Test-Path $backendPy) {
        & $backendPy -c 'import uvicorn, fastapi, torch, sqlalchemy, zipvoice'
        $backendOkay = ($LASTEXITCODE -eq 0)
    }
    if (-not $backendOkay) {
        Stage 'Installing the Voicebox Python 3.12 backend using upstream just setup-python'
        Push-Location $voicebox
        try { Invoke-Checked $just @('setup-python') }
        finally { Pop-Location }
    }
    if (-not (Test-Path $backendPy)) { throw ('Voicebox virtualenv did not produce ' + $backendPy) }
    Stage 'Compiling and checking Voicebox backend Python modules'
    Invoke-Checked $backendPy @('-m','compileall','-q',(Join-Path $voicebox 'backend'))

    Stage ('Generating ' + $Scope + ' NUTBUSTER lines with ' + $Engine + ' (model weights are downloaded on first use)')
    Invoke-Checked $backendPy @($batch,'--nutbuster',$nutbuster,'--references',$references,
        '--voicebox-source',$voicebox,'--scope',$Scope,'--engine',$Engine,'--output',$rendered)
    Stage 'Validating all rendered clips and composing normalized MP3 review pack plus audition reel'
    Invoke-Checked $backendPy @($composer,'--nutbuster',$nutbuster,'--rendered',$rendered,
        '--output',$composed,'--scope',$Scope)
    $manifest = Join-Path $composed 'composition.json'
    if (-not (Test-Path $manifest)) { throw 'Composition did not create its validation manifest.' }
    $receipt = Get-Content -LiteralPath $manifest -Raw | ConvertFrom-Json
    $expected = if ($Scope -eq 'all') { 74 } else { 6 }
    if ($receipt.lineCount -ne $expected -or $receipt.status -ne 'needs-auditory-review') {
        throw 'Composed output does not match the expected unapproved take count/status.'
    }

    if (-not $SkipDriveUpload) {
        $uploadSubdir = 'Voicebox-Original/' + $runId
        $destination = $DriveRemote + ':' + $uploadSubdir
        Stage ('Uploading ONLY composed audio, audition and manifest into NUTBUSTER Drive folder: ' + $uploadSubdir)
        Invoke-Checked $rclone @('copy',$composed,$destination,'--drive-root-folder-id',$DriveFolderId,'--progress','--create-empty-src-dirs')
        Stage 'Verifying uploaded files against the private local composition'
        Invoke-Checked $rclone @('check',$composed,$destination,'--drive-root-folder-id',$DriveFolderId,'--one-way')
        Write-Host ('Google Drive folder: https://drive.google.com/drive/folders/' + $DriveFolderId)
        Write-Host ('Uploaded subfolder: ' + $uploadSubdir)
    }
    Write-Host ('Composed ' + $expected + ' unapproved MP3s, audition reel and manifest: ' + $composed) -ForegroundColor Green
    Write-Host 'Source recording and voice profile are NOT uploaded. Auditory/device review is still required.' -ForegroundColor Yellow
    exit 0
} catch {
    Write-Error ('Voicebox local production stopped at a verifiable gate: ' + $_.Exception.Message)
    exit 1
}
