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
    description = "Creates temporary SQLite worlds and verifies planning, accepted imports, rollback, and registry queries."
    classpath = sourceSets.main.get().runtimeClasspath
    mainClass.set("io.github.mrcalzon02.barotrauma.persistence.WorldVesselRegistry")
    args("--verify")
}

tasks.register<JavaExec>("runImportApproval") {
    group = "application"
    description = "Runs the inspection-first Barotrauma world import approval window."
    classpath = sourceSets.main.get().runtimeClasspath
    mainClass.set("io.github.mrcalzon02.barotrauma.desktop.imports.WorldImportApprovalWindow")
}

tasks.register<JavaExec>("runVesselRegistry") {
    group = "application"
    description = "Runs the read-only Barotrauma submarine, vessel, and snapshot registry."
    classpath = sourceSets.main.get().runtimeClasspath
    mainClass.set("io.github.mrcalzon02.barotrauma.desktop.registry.WorldVesselRegistryWindow")
}
