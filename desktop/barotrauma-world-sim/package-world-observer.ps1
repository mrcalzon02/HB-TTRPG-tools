param()

$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$sourceRoot = Join-Path $projectRoot 'src/main/java'
$resourceRoot = Join-Path $projectRoot 'src/main/resources'
$buildRoot = Join-Path $projectRoot 'build/world-observer'
$classesRoot = Join-Path $buildRoot 'classes'
$inputRoot = Join-Path $buildRoot 'input'
$appImageRoot = Join-Path $buildRoot 'app-image'
$releaseRoot = Join-Path $buildRoot 'release'
$libRoot = Join-Path $buildRoot 'lib'
$manifestPath = Join-Path $projectRoot 'observer-release.properties'
$mainClass = 'io.github.mrcalzon02.barotrauma.desktop.observation.ObservationFoundationWindow'
$sqliteVersion = '3.53.1.0'
$sqliteSha256 = '28aceecfcc9535645bd19fa988385703c7b89982c1506a6855f5942b4032eca6'
$sqliteJar = Join-Path $libRoot "sqlite-jdbc-$sqliteVersion.jar"
$mavenRoot = 'https://repo.maven.apache.org/maven2'

function Resolve-JdkTool([string]$name) {
    $tool = Get-Command $name -ErrorAction SilentlyContinue
    if ($null -ne $tool) { return $tool.Source }
    $exe = if ($env:OS -eq 'Windows_NT') { "$name.exe" } else { $name }
    if ($env:JAVA_HOME) {
        $candidate = Join-Path $env:JAVA_HOME "bin/$exe"
        if (Test-Path -LiteralPath $candidate -PathType Leaf) { return $candidate }
    }
    throw "$name was not found. A JDK with jpackage is required."
}

function Download-Verified([string]$url, [string]$destination, [string]$expectedSha256) {
    New-Item -ItemType Directory -Path (Split-Path -Parent $destination) -Force | Out-Null
    if (Test-Path -LiteralPath $destination -PathType Leaf) {
        $existing = (Get-FileHash -LiteralPath $destination -Algorithm SHA256).Hash.ToLowerInvariant()
        if ($existing -eq $expectedSha256) { return }
        Remove-Item -LiteralPath $destination -Force
    }
    $temp = "$destination.download"
    Invoke-WebRequest -UseBasicParsing -Uri $url -OutFile $temp
    $actual = (Get-FileHash -LiteralPath $temp -Algorithm SHA256).Hash.ToLowerInvariant()
    if ($actual -ne $expectedSha256) { throw "Checksum verification failed for $url" }
    Move-Item -LiteralPath $temp -Destination $destination -Force
}

if ($env:OS -ne 'Windows_NT') { throw 'World Observer packaging must run on Windows.' }
$manifest = ConvertFrom-StringData (Get-Content -LiteralPath $manifestPath -Raw)
foreach ($required in @('version','tag','title','assetBaseName')) {
    if ([string]::IsNullOrWhiteSpace($manifest[$required])) { throw "Observer release manifest is missing $required." }
}

foreach ($path in @($classesRoot, $inputRoot, $appImageRoot, $releaseRoot)) {
    if (Test-Path -LiteralPath $path) { Remove-Item -LiteralPath $path -Recurse -Force }
    New-Item -ItemType Directory -Path $path -Force | Out-Null
}

Download-Verified "$mavenRoot/org/xerial/sqlite-jdbc/$sqliteVersion/sqlite-jdbc-$sqliteVersion.jar" $sqliteJar $sqliteSha256
$javac = Resolve-JdkTool 'javac'
$jarTool = Resolve-JdkTool 'jar'
$jpackage = Resolve-JdkTool 'jpackage'

$sources = @(Get-ChildItem -LiteralPath $sourceRoot -Recurse -Filter '*.java' -File | ForEach-Object FullName)
if ($sources.Count -eq 0) { throw 'No Java sources were found.' }
& $javac -encoding UTF-8 --release 17 -d $classesRoot $sources
if ($LASTEXITCODE -ne 0) { throw "Java compilation failed with exit code $LASTEXITCODE." }
if (Test-Path -LiteralPath $resourceRoot) {
    Copy-Item -Path (Join-Path $resourceRoot '*') -Destination $classesRoot -Recurse -Force
}

$appJar = Join-Path $inputRoot 'barotrauma-world-observer.jar'
& $jarTool --create --file $appJar --main-class $mainClass -C $classesRoot .
if ($LASTEXITCODE -ne 0) { throw "JAR packaging failed with exit code $LASTEXITCODE." }
Copy-Item -LiteralPath $sqliteJar -Destination $inputRoot -Force

& $jpackage `
    --type app-image `
    --dest $appImageRoot `
    --input $inputRoot `
    --name 'Barotrauma World Observer' `
    --main-jar 'barotrauma-world-observer.jar' `
    --main-class $mainClass `
    --app-version $manifest.version `
    --vendor "Calzon's TTRPG Foundry" `
    --description 'Standalone Barotrauma campaign world observer.' `
    --java-options '--enable-native-access=ALL-UNNAMED'
if ($LASTEXITCODE -ne 0) { throw "jpackage failed with exit code $LASTEXITCODE." }

$appDir = Join-Path $appImageRoot 'Barotrauma World Observer'
$launcher = Join-Path $appDir 'Barotrauma World Observer.exe'
if (-not (Test-Path -LiteralPath $launcher -PathType Leaf)) { throw "Expected launcher was not created: $launcher" }

$assetName = "$($manifest.assetBaseName)-$($manifest.version)-Windows-x64.zip"
$assetPath = Join-Path $releaseRoot $assetName
Compress-Archive -LiteralPath (Join-Path $appDir '*') -DestinationPath $assetPath -CompressionLevel Optimal
$hash = (Get-FileHash -LiteralPath $assetPath -Algorithm SHA256).Hash.ToLowerInvariant()
Set-Content -LiteralPath "$assetPath.sha256" -Value "$hash  $assetName" -Encoding ascii -NoNewline
Write-Host "Packaged functional World Observer: $assetPath"
Write-Host "Launcher inside archive: Barotrauma World Observer.exe"
