#requires -version 5.1
<#
.SYNOPSIS
  One-command PRIVATE local Voicebox/NUTBUSTER owner-voice production.
.DESCRIPTION
  Run from any PowerShell shell:
    powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\voicebox\run-nutbuster-local.ps1
  Installs missing user tools with winget, clones trusted upstream into LOCALAPPDATA,
  provisions the Python 3.12 backend, prepares privately stored reference WAVs,
  generates the authored 74 lines and composes a private review pack.
  NOTHING is automatically uploaded anywhere. Export completed files manually.
#>
[CmdletBinding()]
param(
    [ValidateSet('all','preview')][string]$Scope = 'all',
    [ValidateSet('luxtts','qwen','chatterbox_turbo')][string]$Engine = 'luxtts',
    [string]$ReferenceWav = '',
    [string]$ReferenceZip = '',
    [switch]$SkipDriveUpload  # Backwards-compatible no-op; uploads are always disabled.
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
function Setup-Voicebox-PythonBackend([string]$root, [string]$python312) {
    # Equivalent to upstream Voicebox justfile's setup-python recipe for Windows,
    # without downloading the optional Just command-runner binary.
    $venvDir = Join-Path $root 'backend\venv'
    $venvPy = Join-Path $venvDir 'Scripts\python.exe'
    $isHealthy = $false
    if (Test-Path -LiteralPath $venvPy) {
        & $venvPy -c "import sys, pip; sys.exit(sys.version_info[:2] != (3,12))"
        $isHealthy = ($LASTEXITCODE -eq 0)
    }
    if ((Test-Path -LiteralPath $venvDir) -and -not $isHealthy) {
        $backup = $venvDir + '.incomplete-' + (Get-Date -Format 'yyyyMMdd-HHmmss')
        if (Test-Path -LiteralPath $backup) { throw ('Cannot preserve incomplete Python environment: ' + $backup) }
        Stage ('Preserving incomplete venv as ' + $backup)
        Rename-Item -LiteralPath $venvDir -NewName (Split-Path $backup -Leaf) -ErrorAction Stop
    }
    if (-not $isHealthy) {
        Stage 'Creating Python 3.12 virtualenv directly'
        Invoke-Checked $python312 @('-m','venv',$venvDir)
    }
    if (-not (Test-Path -LiteralPath $venvPy)) { throw ('Python venv was not created: ' + $venvPy) }
    Stage 'Updating pip in isolated Voicebox runtime'
    Invoke-Checked $venvPy @('-m','pip','install','--upgrade','pip','-q')

    $gpus = @()
    try {
        $gpus = @(Get-CimInstance Win32_VideoController -ErrorAction Stop | ForEach-Object { $_.Name })
    } catch { Stage 'GPU name detection not available; using default Python dependencies' }
    if (@($gpus | Where-Object { $_ -match 'NVIDIA' }).Count -gt 0) {
        Stage 'Installing NVIDIA CUDA PyTorch as upstream Windows setup requires'
        Invoke-Checked $venvPy @('-m','pip','install','torch','torchvision','torchaudio',
            '--index-url','https://download.pytorch.org/whl/cu128')
    } elseif (@($gpus | Where-Object { $_ -match 'Arc' }).Count -gt 0) {
        Stage 'Installing Intel Arc PyTorch/XPU as upstream Windows setup requires'
        Invoke-Checked $venvPy @('-m','pip','install','torch','torchvision','torchaudio',
            '--index-url','https://download.pytorch.org/whl/xpu')
        Invoke-Checked $venvPy @('-m','pip','install','intel-extension-for-pytorch',
            '--index-url','https://download.pytorch.org/whl/xpu')
    } else { Stage 'Using standard PyTorch dependency (CPU/other GPU)' }
    $requirements = Join-Path $root 'backend\requirements.txt'
    if (-not (Test-Path -LiteralPath $requirements)) { throw ('Missing upstream requirements: ' + $requirements) }
    Stage 'Installing upstream Voicebox Python dependencies'
    # Persist a full private pip log so wheel/pyproject build failures identify
    # their source package instead of reporting only a generic subprocess error.
    $diagDir = Join-Path $env:LOCALAPPDATA 'HB-TTRPG-tools\voicebox-production\private\diagnostics'
    New-Item -ItemType Directory -Path $diagDir -Force | Out-Null
    $pipLog = Join-Path $diagDir ('voicebox-pip-' + (Get-Date -Format 'yyyyMMdd-HHmmss') + '.log')
    Stage ('Verbose pip build report: ' + $pipLog)
    & $venvPy -m pip --log $pipLog install --verbose -r $requirements
    if ($LASTEXITCODE -ne 0) {
        Write-Host ('Build failure. Detailed private pip log: ' + $pipLog) -ForegroundColor Red
        if (Test-Path -LiteralPath $pipLog) {
            Write-Host 'Recent pip diagnostics (look above the pyproject error for the failing package):' -ForegroundColor Yellow
            Get-Content -LiteralPath $pipLog -Tail 75 | ForEach-Object { Write-Host $_ }
        }
        throw ('Voicebox dependency build failed; review the full pip log at ' + $pipLog)
    }
    Invoke-Checked $venvPy @('-m','pip','install','--no-deps','chatterbox-tts')
    Invoke-Checked $venvPy @('-m','pip','install','--no-deps','hume-tada')
    Invoke-Checked $venvPy @('-m','pip','install','--no-deps','omnivoice')
    Invoke-Checked $venvPy @('-m','pip','install','git+https://github.com/QwenLM/Qwen3-TTS.git')
    Invoke-Checked $venvPy @('-m','pip','install','pyinstaller','ruff','pytest','pytest-asyncio','openai','-q')
    Stage 'Checking upstream Voicebox API and speech inference modules'
    Invoke-Checked $venvPy @('-c','import uvicorn, fastapi, torch, sqlalchemy, zipvoice')
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


function Select-VoiceSource {
    # A ChatGPT attachment is not automatically stored in the user's Windows filesystem.
    # A standard Windows file dialog lets the owner choose the source without renaming,
    # copying into a special directory, or editing a hard-coded local path.
    Write-Host 'Select your own WAV recording or the prepared voice-reference ZIP from wherever you saved it.' -ForegroundColor Yellow
    $dialog = $null
    try {
        Add-Type -AssemblyName System.Windows.Forms -ErrorAction Stop
        $dialog = New-Object System.Windows.Forms.OpenFileDialog
        $dialog.Title = 'Locate your voice WAV or prepared Voicebox reference ZIP'
        $dialog.Filter = 'Voice recording or reference pack (*.wav;*.zip)|*.wav;*.zip|WAV recordings (*.wav)|*.wav|Reference ZIP files (*.zip)|*.zip'
        $dialog.CheckFileExists = $true
        $dialog.Multiselect = $false
        $downloads = Join-Path $env:USERPROFILE 'Downloads'
        if (Test-Path -LiteralPath $downloads) { $dialog.InitialDirectory = $downloads }
        $choice = $dialog.ShowDialog()
        if ($choice -eq [System.Windows.Forms.DialogResult]::OK -and (Test-Path -LiteralPath $dialog.FileName -PathType Leaf)) {
            return $dialog.FileName
        }
        throw 'No voice source was selected in the file picker.'
    } catch {
        Write-Host ('File picker unavailable or cancelled: ' + $_.Exception.Message) -ForegroundColor Yellow
        $manual = Read-Host 'Paste the full path to your own .wav or the reference .zip (or press Enter to cancel)'
        if ($manual) {
            $manual = $manual.Trim().Trim('"')
            if ((Test-Path -LiteralPath $manual -PathType Leaf) -and [IO.Path]::GetExtension($manual).ToLowerInvariant() -in @('.wav','.zip')) {
                return (Resolve-Path -LiteralPath $manual).Path
            }
            throw ('Selected voice-reference path is not an existing WAV or ZIP: ' + $manual)
        }
        return $null
    } finally {
        if ($null -ne $dialog) { $dialog.Dispose() }
    }
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
    if (-not $zip -and -not $ReferenceZip) { $zip = Find-VoiceSource '' 'NUTBUSTER_voice_reference_pack.zip' }
    $samples = @(Get-ChildItem -LiteralPath $references -Filter 'owner-primary-*.wav' -File -ErrorAction SilentlyContinue)
    if (-not $wav -and -not $zip -and $samples.Count -ne 3) {
        Stage 'No reference found automatically; opening the Windows file picker'
        $chosen = Select-VoiceSource
        if (-not $chosen) {
            throw 'Voice reference is still unavailable. Download your own WAV or the reference ZIP from ChatGPT onto this PC, then select it using the file picker. The original recording remains private.'
        }
        switch ([IO.Path]::GetExtension($chosen).ToLowerInvariant()) {
            '.wav' { $wav = $chosen }
            '.zip' { $zip = $chosen }
            default { throw ('Select a .wav voice recording or the prepared .zip reference package: ' + $chosen) }
        }
    }
    Stage 'Checking command-line tools'
    Refresh-Path
    $git = Ensure-Tool 'git' 'Git.Git'
    $ffmpeg = Ensure-Tool 'ffmpeg' 'Gyan.FFmpeg'
    $ffprobe = Ensure-Tool 'ffprobe' 'Gyan.FFmpeg'

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

    Stage 'Running deterministic audio-composition tests before model installation'
    Invoke-Checked $python312 @('-m','unittest','discover','-s',(Join-Path $repo 'tools\voicebox\tests'),'-p','test_*.py','-v')

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
        Stage 'Provisioning the Voicebox Python 3.12 backend without Just'
        Setup-Voicebox-PythonBackend $voicebox $python312
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

    Write-Host ('Composed ' + $expected + ' unapproved MP3s, audition reel and manifest: ' + $composed) -ForegroundColor Green
    Write-Host 'LOCAL ONLY: no automatic uploads, no Google Drive access, no credentials. Review audio and export manually.' -ForegroundColor Yellow
    exit 0
} catch {
    Write-Error ('Voicebox local production stopped at a verifiable gate: ' + $_.Exception.Message)
    exit 1
}
