plugins {
    id("com.android.application")
}

android {
    namespace = "com.hbttrpg.livesignals"
    compileSdk = 36

    defaultConfig {
        applicationId = "com.hbttrpg.livesignals"
        minSdk = 31
        targetSdk = 36
        versionCode = 1
        versionName = "0.1.0"
    }

    buildTypes {
        release {
            isMinifyEnabled = false
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
}
