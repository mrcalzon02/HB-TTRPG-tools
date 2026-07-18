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
    description = "Creates a temporary SQLite world and verifies migration, duplicate, and import-plan contracts."
    classpath = sourceSets.main.get().runtimeClasspath
    mainClass.set("io.github.mrcalzon02.barotrauma.persistence.SqliteWorldStore")
    args("--verify")
}
