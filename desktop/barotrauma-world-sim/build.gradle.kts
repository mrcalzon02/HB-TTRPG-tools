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
    description = "Runs the complete vessel, chronology, campaign, migration, normalized-world, and registry contract chain."
    classpath = sourceSets.main.get().runtimeClasspath
    mainClass.set("io.github.mrcalzon02.barotrauma.persistence.DesktopPersistenceVerificationSuite")
    args("--verify")
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
    description = "Runs the read-only normalized master-world, location, station, and scheduler registry."
    classpath = sourceSets.main.get().runtimeClasspath
    mainClass.set("io.github.mrcalzon02.barotrauma.desktop.registry.WorldMapRegistryWindow")
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
