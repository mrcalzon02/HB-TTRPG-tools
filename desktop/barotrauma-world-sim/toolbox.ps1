param(
    [ValidateSet('setup','build','verify','package','run','observer','asset-setup','world-map','observation','frontier','natural-world','logistics','player-transit','simulation-monitor','web-import','import-approval','campaign-mapping','vessel-registry','snapshot-approval')]
    [string]$Command = 'build'
)

$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$sourceRoot = Join-Path $projectRoot 'src/main/java'
$resourceRoot = Join-Path $projectRoot 'src/main/resources'
$buildRoot = Join-Path $projectRoot 'build/no-gradle'
$classesRoot = Join-Path $buildRoot 'classes'
$temporaryRoot = Join-Path $buildRoot 'temp'
$libraryRoot = Join-Path $projectRoot 'lib'
$applicationJar = Join-Path $buildRoot 'barotrauma-world-sim.jar'
$releasePropertiesPath = Join-Path $projectRoot 'release.properties'
$packageInputRoot = Join-Path $buildRoot 'package-input'
$appImageRoot = Join-Path $buildRoot 'observer-app-image'
$releaseRoot = Join-Path $buildRoot 'release'
$sqliteVersion = '3.53.1.0'
$sqliteSha256 = '28aceecfcc9535645bd19fa988385703c7b89982c1506a6855f5942b4032eca6'
$sqliteJar = Join-Path $libraryRoot "sqlite-jdbc-$sqliteVersion.jar"
$mavenRoot = 'https://repo.maven.apache.org/maven2'

function Resolve-JdkTool([string]$name) {
    $tool = Get-Command $name -ErrorAction SilentlyContinue
    if ($null -ne $tool) { return $tool.Source }

    $executable = if ($IsWindows -or $env:OS -eq 'Windows_NT') { "$name.exe" } else { $name }
    $jdkHomes = @()
    if ($env:JAVA_HOME) { $jdkHomes += $env:JAVA_HOME }
    if ($env:ProgramFiles) {
        $javaRoot = Join-Path $env:ProgramFiles 'Java'
        if (Test-Path -LiteralPath $javaRoot) {
            $jdkHomes += Get-ChildItem -LiteralPath $javaRoot -Directory |
                Sort-Object Name -Descending |
                ForEach-Object FullName
        }
    }
    foreach ($jdkHome in $jdkHomes) {
        $candidate = Join-Path $jdkHome "bin/$executable"
        if (Test-Path -LiteralPath $candidate -PathType Leaf) { return $candidate }
    }
    throw "$name was not found. Install a JDK 17 or newer and reopen the terminal."
}

function Download-Verified([string]$url, [string]$destination, [string]$expectedSha256) {
    if (Test-Path -LiteralPath $destination -PathType Leaf) {
        $existingHash = (Get-FileHash -LiteralPath $destination -Algorithm SHA256).Hash.ToLowerInvariant()
        if ($existingHash -ne $expectedSha256) {
            throw "Checksum verification failed for existing dependency $destination"
        }
        return
    }
    New-Item -ItemType Directory -Path (Split-Path -Parent $destination) -Force | Out-Null
    $temporary = "$destination.download"
    try {
        Invoke-WebRequest -UseBasicParsing -Uri $url -OutFile $temporary
        $actual = (Get-FileHash -LiteralPath $temporary -Algorithm SHA256).Hash.ToLowerInvariant()
        if ($actual -ne $expectedSha256) { throw "Checksum verification failed for $url" }
        Move-Item -LiteralPath $temporary -Destination $destination -Force
        Write-Host "Verified dependency: $([IO.Path]::GetFileName($destination))"
    } finally {
        if (Test-Path -LiteralPath $temporary) { Remove-Item -LiteralPath $temporary -Force }
    }
}

function Ensure-Dependencies {
    Download-Verified "$mavenRoot/org/xerial/sqlite-jdbc/$sqliteVersion/sqlite-jdbc-$sqliteVersion.jar" `
        $sqliteJar $sqliteSha256
}

function Build-Application {
    $javac = Resolve-JdkTool 'javac'
    $jarTool = Resolve-JdkTool 'jar'
    if (Test-Path -LiteralPath $classesRoot) { Remove-Item -LiteralPath $classesRoot -Recurse -Force }
    New-Item -ItemType Directory -Path $classesRoot -Force | Out-Null
    $sources = @(Get-ChildItem -LiteralPath $sourceRoot -Recurse -Filter '*.java' | ForEach-Object FullName)
    if ($sources.Count -eq 0) { throw 'No Java sources were found.' }
    & $javac -encoding UTF-8 --release 17 -d $classesRoot $sources
    if ($LASTEXITCODE -ne 0) { throw "Java compilation failed with exit code $LASTEXITCODE." }
    if (Test-Path -LiteralPath $resourceRoot) {
        Copy-Item -Path (Join-Path $resourceRoot '*') -Destination $classesRoot -Recurse -Force
    }
    New-Item -ItemType Directory -Path $buildRoot -Force | Out-Null
    & $jarTool --create --file $applicationJar --main-class io.github.mrcalzon02.barotrauma.desktop.BarotraumaWorldSimApplication -C $classesRoot .
    if ($LASTEXITCODE -ne 0) { throw "JAR packaging failed with exit code $LASTEXITCODE." }
    Write-Host "Built $applicationJar"
}

function Read-ReleaseProperties {
    if (-not (Test-Path -LiteralPath $releasePropertiesPath -PathType Leaf)) {
        throw "Release manifest not found: $releasePropertiesPath"
    }
    $values = ConvertFrom-StringData (Get-Content -LiteralPath $releasePropertiesPath -Raw)
    foreach ($required in @('version','tag','title','assetBaseName')) {
        if ([string]::IsNullOrWhiteSpace($values[$required])) {
            throw "Release manifest is missing $required."
        }
    }
    return [pscustomobject]@{
        Version = $values['version'].Trim()
        Tag = $values['tag'].Trim()
        Title = $values['title'].Trim()
        AssetBaseName = $values['assetBaseName'].Trim()
    }
}

function Package-Application {
    if (-not ($IsWindows -or $env:OS -eq 'Windows_NT')) {
        throw 'The MSI package command must run on Windows.'
    }
    Ensure-Dependencies
    Build-Application
    $jpackage = Resolve-JdkTool 'jpackage'
    $release = Read-ReleaseProperties
    $applicationName = 'Barotrauma World Observer'
    $observerMain = 'io.github.mrcalzon02.barotrauma.desktop.BarotraumaWorldObserverApplication'

    foreach ($path in @($packageInputRoot, $appImageRoot, $releaseRoot)) {
        if (Test-Path -LiteralPath $path) { Remove-Item -LiteralPath $path -Recurse -Force }
        New-Item -ItemType Directory -Path $path -Force | Out-Null
    }
    Copy-Item -LiteralPath $applicationJar -Destination $packageInputRoot -Force
    Copy-Item -LiteralPath $sqliteJar -Destination $packageInputRoot -Force

    $commonArguments = @(
        '--input', $packageInputRoot,
        '--name', $applicationName,
        '--main-jar', (Split-Path -Leaf $applicationJar),
        '--main-class', $observerMain,
        '--app-version', $release.Version,
        '--vendor', "Calzon's TTRPG Foundry",
        '--description', 'Living standalone observer for passive Barotrauma world simulation, NPC voyages, stations, trade, hazards, migration, settlement, and committed evidence.',
        '--java-options', '--enable-native-access=ALL-UNNAMED'
    )

    $appImageArguments = @(
        '--type', 'app-image',
        '--dest', $appImageRoot
    ) + $commonArguments
    & $jpackage @appImageArguments
    if ($LASTEXITCODE -ne 0) { throw "Observer app-image packaging failed with exit code $LASTEXITCODE." }

    $launcher = Join-Path $appImageRoot "$applicationName/$applicationName.exe"
    if (-not (Test-Path -LiteralPath $launcher -PathType Leaf)) {
        throw "Packaged World Observer executable was not found: $launcher"
    }
    & $launcher '--verify-launch'
    if ($LASTEXITCODE -ne 0) {
        throw "Packaged World Observer executable smoke test failed with exit code $LASTEXITCODE."
    }
    Write-Host "Verified double-clickable observer launcher: $launcher"

    $arguments = @(
        '--type', 'msi',
        '--dest', $releaseRoot
    ) + $commonArguments + @(
        '--win-dir-chooser',
        '--win-menu',
        '--win-menu-group', "Calzon's TTRPG Foundry",
        '--win-shortcut',
        '--win-per-user-install'
    )
    & $jpackage @arguments
    if ($LASTEXITCODE -ne 0) { throw "MSI packaging failed with exit code $LASTEXITCODE." }

    $generated = Get-ChildItem -LiteralPath $releaseRoot -Filter '*.msi' -File |
        Sort-Object LastWriteTimeUtc -Descending |
        Select-Object -First 1
    if ($null -eq $generated) { throw 'jpackage completed without creating an MSI.' }
    $assetName = "$($release.AssetBaseName)-$($release.Version)-Windows-x64.msi"
    $assetPath = Join-Path $releaseRoot $assetName
    if ($generated.FullName -ne $assetPath) {
        Move-Item -LiteralPath $generated.FullName -Destination $assetPath -Force
    }
    $hash = (Get-FileHash -LiteralPath $assetPath -Algorithm SHA256).Hash.ToLowerInvariant()
    $checksumPath = "$assetPath.sha256"
    Set-Content -LiteralPath $checksumPath -Value "$hash  $assetName" -Encoding ascii -NoNewline
    Write-Host "Packaged $assetPath"
    Write-Host "SHA-256 $hash"
}

function Runtime-Classpath {
    return "$applicationJar$([IO.Path]::PathSeparator)$sqliteJar"
}

function Runtime-JavaOptions {
    New-Item -ItemType Directory -Path $temporaryRoot -Force | Out-Null
    return @('--enable-native-access=ALL-UNNAMED', "-Djava.io.tmpdir=$temporaryRoot",
        "-Dorg.sqlite.tmpdir=$temporaryRoot")
}

function Run-Class([string]$mainClass, [string[]]$arguments = @()) {
    $java = Resolve-JdkTool 'java'
    Ensure-Dependencies
    Build-Application
    $javaOptions = Runtime-JavaOptions
    & $java @javaOptions -cp (Runtime-Classpath) $mainClass @arguments
    if ($LASTEXITCODE -ne 0) { throw "$mainClass failed with exit code $LASTEXITCODE." }
}

$entryPoints = @{
    'run' = 'io.github.mrcalzon02.barotrauma.desktop.BarotraumaWorldSimApplication'
    'observer' = 'io.github.mrcalzon02.barotrauma.desktop.BarotraumaWorldObserverApplication'
    'asset-setup' = 'io.github.mrcalzon02.barotrauma.desktop.assets.DonorAssetSetupWindow'
    'world-map' = 'io.github.mrcalzon02.barotrauma.desktop.registry.WorldMapRegistryWindow'
    'observation' = 'io.github.mrcalzon02.barotrauma.desktop.observation.ObservationFoundationWindow'
    'frontier' = 'io.github.mrcalzon02.barotrauma.desktop.frontier.CivilizationFrontierWindow'
    'natural-world' = 'io.github.mrcalzon02.barotrauma.desktop.nature.NaturalWorldAndFleetWindow'
    'logistics' = 'io.github.mrcalzon02.barotrauma.desktop.logistics.StationLogisticsWindow'
    'player-transit' = 'io.github.mrcalzon02.barotrauma.desktop.logistics.PlayerVesselTransitWindow'
    'simulation-monitor' = 'io.github.mrcalzon02.barotrauma.desktop.simulation.SimulationMonitorWindow'
    'web-import' = 'io.github.mrcalzon02.barotrauma.desktop.imports.WebWorldImportApprovalWindow'
    'import-approval' = 'io.github.mrcalzon02.barotrauma.desktop.imports.WorldImportApprovalWindow'
    'campaign-mapping' = 'io.github.mrcalzon02.barotrauma.desktop.imports.CampaignVesselMappingWindow'
    'vessel-registry' = 'io.github.mrcalzon02.barotrauma.desktop.registry.WorldVesselRegistryWindow'
    'snapshot-approval' = 'io.github.mrcalzon02.barotrauma.desktop.registry.VesselSnapshotApprovalWindow'
}

switch ($Command) {
    'setup' { Ensure-Dependencies }
    'build' { Build-Application }
    'package' { Package-Application }
    'verify' {
        Run-Class 'io.github.mrcalzon02.barotrauma.persistence.DesktopPersistenceVerificationSuite' @('--verify')
        $java = Resolve-JdkTool 'java'
        $javaOptions = Runtime-JavaOptions
        $classpath = Runtime-Classpath
        $verifications = @(
            [pscustomobject]@{ MainClass='io.github.mrcalzon02.barotrauma.domain.identity.IdentityContracts'; Arguments=@() },
            [pscustomobject]@{ MainClass='io.github.mrcalzon02.barotrauma.desktop.session.DesktopWorldSession'; Arguments=@() },
            [pscustomobject]@{ MainClass='io.github.mrcalzon02.barotrauma.desktop.BarotraumaWorldObserverApplication'; Arguments=@('--verify-launch') },
            [pscustomobject]@{ MainClass='io.github.mrcalzon02.barotrauma.desktop.registry.WorldObserverProjectionVerification'; Arguments=@() },
            [pscustomobject]@{ MainClass='io.github.mrcalzon02.barotrauma.desktop.registry.WorldObserverInspectorVerification'; Arguments=@() },
            [pscustomobject]@{ MainClass='io.github.mrcalzon02.barotrauma.desktop.registry.WorldObserverNaturalLayerVerification'; Arguments=@() },
            [pscustomobject]@{ MainClass='io.github.mrcalzon02.barotrauma.desktop.registry.WorldObserverCivilLayerVerification'; Arguments=@() },
            [pscustomobject]@{ MainClass='io.github.mrcalzon02.barotrauma.desktop.registry.WorldObserverLevelOfDetailVerification'; Arguments=@() },
            [pscustomobject]@{ MainClass='io.github.mrcalzon02.barotrauma.desktop.registry.WorldObserverTimelineVerification'; Arguments=@() },
            [pscustomobject]@{ MainClass='io.github.mrcalzon02.barotrauma.desktop.registry.WorldObserverNavigationVerification'; Arguments=@() },
            [pscustomobject]@{ MainClass='io.github.mrcalzon02.barotrauma.desktop.registry.WorldObserverHistoryVerification'; Arguments=@() },
            [pscustomobject]@{ MainClass='io.github.mrcalzon02.barotrauma.simulation.ManualWorldStepServiceVerification'; Arguments=@() },
            [pscustomobject]@{ MainClass='io.github.mrcalzon02.barotrauma.simulation.PassiveWorldCatchUpPolicyVerification'; Arguments=@() },
            [pscustomobject]@{ MainClass='io.github.mrcalzon02.barotrauma.simulation.PassiveWorldRestartCatchUpVerification'; Arguments=@() },
            [pscustomobject]@{ MainClass='io.github.mrcalzon02.barotrauma.simulation.PassiveWorldRuntimeOwnershipVerification'; Arguments=@() },
            [pscustomobject]@{ MainClass='io.github.mrcalzon02.barotrauma.desktop.registry.WorldObserverUnattendedSoakVerification'; Arguments=@() },
            [pscustomobject]@{ MainClass='io.github.mrcalzon02.barotrauma.compatibility.web.WebSuiteV22Inspector'; Arguments=@('--verify') },
            [pscustomobject]@{ MainClass='io.github.mrcalzon02.barotrauma.compatibility.official.BarotraumaSaveInspector'; Arguments=@('--verify') },
            [pscustomobject]@{ MainClass='io.github.mrcalzon02.barotrauma.persistence.WorldStorageContracts'; Arguments=@() }
        )
        foreach ($verification in $verifications) {
            & $java @javaOptions -cp $classpath $verification.MainClass @($verification.Arguments)
            if ($LASTEXITCODE -ne 0) {
                throw "$($verification.MainClass) failed with exit code $LASTEXITCODE."
            }
        }
        Write-Host 'Complete Gradle-free desktop and Living World Observer verification passed.'
    }
    default { Run-Class $entryPoints[$Command] }
}
