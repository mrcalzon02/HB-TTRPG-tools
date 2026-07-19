plugins {
    application
}

group = "io.github.mrcalzon02"
version = "0.1.0-SNAPSHOT"

repositories {
    mavenCentral()
}

dependencies {
    implementation("org.xerial:sqlite-jdbc:3.53.1.0")
}

java {
    toolchain {
        languageVersion.set(JavaLanguageVersion.of(17))
    }
}

application {
    mainClass.set("io.github.mrcalzon02.barotrauma.desktop.BarotraumaWorldSimApplication")
}

tasks.withType<JavaCompile>().configureEach {
    options.encoding = "UTF-8"
    options.release.set(17)
}

tasks.jar {
    manifest {
        attributes["Main-Class"] = application.mainClass.get()
    }
}

tasks.register<JavaExec>("verifyWorldStore") {
    group = "verification"
    description = "Runs donor discovery, atlas-aware visual assets, procedural fallbacks, observation vocabulary, schema-015 population and territory foundations, imports, migrations, registries, clock, checkpoints, passive scheduling, station consumption, civilization frontier, fleet response transit and towing, ecology, geology, finite resource harvesting, renewable recovery, logistics, player transit, NPC voyages, routes, missions, research, encounters, and recovery contracts."
    classpath = sourceSets.main.get().runtimeClasspath
    mainClass.set("io.github.mrcalzon02.barotrauma.persistence.DesktopPersistenceVerificationSuite")
    args("--verify")
}

tasks.register<JavaExec>("verifyVisualAssets") {
    group = "verification"
    description = "Verifies donor discovery, XML style and atlas cropping, scaling, role coverage, and every procedural fallback without requiring a Barotrauma installation."
    classpath = sourceSets.main.get().runtimeClasspath
    mainClass.set("io.github.mrcalzon02.barotrauma.assets.BarotraumaAssetCatalogue")
}

tasks.register<JavaExec>("verifyObservationContract") {
    group = "verification"
    description = "Verifies the dependency-free passive observation vocabulary, population invariants, deterministic IDs, flow transitions, snapshot identity, and canonical event codec."
    classpath = sourceSets.main.get().runtimeClasspath
    mainClass.set("io.github.mrcalzon02.barotrauma.observation.ObservationContractVerification")
}

tasks.register<JavaExec>("verifyObservationFoundation") {
    group = "verification"
    description = "Verifies schema 015 observation populations, creature territories, faction presence, flows, events, snapshots, metrics, deterministic seeding, preservation, and constraints."
    classpath = sourceSets.main.get().runtimeClasspath
    mainClass.set("io.github.mrcalzon02.barotrauma.persistence.ObservationFoundationVerification")
}

tasks.register<JavaExec>("runAssetSetup") {
    group = "application"
    description = "Indexes a local Barotrauma installation for UI atlases, map markers, backgrounds, operation symbols, and independent fallback visuals."
    classpath = sourceSets.main.get().runtimeClasspath
    mainClass.set("io.github.mrcalzon02.barotrauma.desktop.assets.DonorAssetSetupWindow")
}

tasks.register<JavaExec>("runGraphicalWorldMap") {
    group = "application"
    description = "Runs the graphical Europa map using donor-backed Barotrauma backgrounds and markers or procedural fallbacks."
    classpath = sourceSets.main.get().runtimeClasspath
    mainClass.set("io.github.mrcalzon02.barotrauma.desktop.registry.DonorBackedWorldMapWindow")
}

tasks.register<JavaExec>("runImportApproval") {
    group = "application"
    description = "Runs the inspection-first Barotrauma vessel import approval window."
    classpath = sourceSets.main.get().runtimeClasspath
    mainClass.set("io.github.mrcalzon02.barotrauma.desktop.imports.WorldImportApprovalWindow")
}

tasks.register<JavaExec>("runWebWorldImport") {
    group = "application"
    description = "Runs the explicit version-22 normalized master-world import approval window."
    classpath = sourceSets.main.get().runtimeClasspath
    mainClass.set("io.github.mrcalzon02.barotrauma.desktop.imports.WebWorldImportApprovalWindow")
}

tasks.register<JavaExec>("runWorldRegistry") {
    group = "application"
    description = "Runs the live Europa world registry with passive station, NPC, mission, research, encounter, and response-transit controls."
    classpath = sourceSets.main.get().runtimeClasspath
    mainClass.set("io.github.mrcalzon02.barotrauma.desktop.registry.WorldMapRegistryWindow")
}

tasks.register<JavaExec>("runStationLogistics") {
    group = "application"
    description = "Runs the read-only station catalogue, inventory, vendor, production, freight, and treasury console."
    classpath = sourceSets.main.get().runtimeClasspath
    mainClass.set("io.github.mrcalzon02.barotrauma.desktop.logistics.StationLogisticsWindow")
}

tasks.register<JavaExec>("runCivilizationFrontier") {
    group = "application"
    description = "Runs the live station consumption and civilization-versus-fauna frontier console."
    classpath = sourceSets.main.get().runtimeClasspath
    mainClass.set("io.github.mrcalzon02.barotrauma.desktop.frontier.CivilizationFrontierWindow")
}

tasks.register<JavaExec>("runNaturalWorld") {
    group = "application"
    description = "Runs ecology, geology, finite resources, extraction, renewable recovery, fleet-response phases, transit legs, towing, and linked hazards."
    classpath = sourceSets.main.get().runtimeClasspath
    mainClass.set("io.github.mrcalzon02.barotrauma.desktop.nature.NaturalWorldAndFleetWindow")
}

tasks.register<JavaExec>("runPlayerTransit") {
    group = "application"
    description = "Runs imported player-vessel enrollment, route planning, transit resolution, docking, and freight."
    classpath = sourceSets.main.get().runtimeClasspath
    mainClass.set("io.github.mrcalzon02.barotrauma.desktop.logistics.PlayerVesselTransitWindow")
}

tasks.register<JavaExec>("runSimulationMonitor") {
    group = "application"
    description = "Runs the manual durable deterministic simulation clock monitor."
    classpath = sourceSets.main.get().runtimeClasspath
    mainClass.set("io.github.mrcalzon02.barotrauma.desktop.simulation.SimulationMonitorWindow")
}

tasks.register<JavaExec>("runCampaignMapping") {
    group = "application"
    description = "Runs the explicit multi-submarine campaign archive mapping window."
    classpath = sourceSets.main.get().runtimeClasspath
    mainClass.set("io.github.mrcalzon02.barotrauma.desktop.imports.CampaignVesselMappingWindow")
}

tasks.register<JavaExec>("runVesselRegistry") {
    group = "application"
    description = "Runs the read-only Barotrauma submarine, vessel, and snapshot registry."
    classpath = sourceSets.main.get().runtimeClasspath
    mainClass.set("io.github.mrcalzon02.barotrauma.desktop.registry.WorldVesselRegistryWindow")
}

tasks.register<JavaExec>("runSnapshotApproval") {
    group = "application"
    description = "Runs the explicit existing-vessel snapshot chronology approval window."
    classpath = sourceSets.main.get().runtimeClasspath
    mainClass.set("io.github.mrcalzon02.barotrauma.desktop.registry.VesselSnapshotApprovalWindow")
}
