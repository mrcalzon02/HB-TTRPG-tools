plugins {
    application
}

group = "io.github.mrcalzon02"
version = "0.1.0-SNAPSHOT"

repositories {
    mavenCentral()
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
