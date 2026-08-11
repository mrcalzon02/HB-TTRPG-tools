# Live Signals Android Bridge

This Android companion hosts the HB-TTRPG Scientific Tools site inside a restricted WebView and exposes native Android signal telemetry to the separate Live Signals Laboratory.

## Current scope

The companion is instrumentation-only. It does not expose arbitrary transmitter control, channel/power mutation, packet injection, deauthentication, subnet sweeping, or arbitrary frequency sweeps.

Passive foreground collection currently includes:

- system/cached Wi-Fi scan results and scan-result broadcasts; it never calls `WifiManager.startScan()`
- cellular serving-signal and visible-cell callbacks through `TelephonyCallback`
- Bluetooth LE receive observations using an explicit passive scan type when available, with opportunistic receive mode as the compatibility fallback
- GNSS/location context
- accelerometer, gyroscope, rotation-vector orientation, magnetometer, and barometer when present
- battery and Android thermal state context

Active Scan currently implements only Wi-Fi RTT. Nearby responder-capable APs are discovered from Android Wi-Fi scan results and returned to the web laboratory as `rangingTargets`. The attached Android device is the operator-authorized instrument; the bridge does not assume administrative control of the responder.

## Measurement honesty

The bridge records only fields Android actually exposes.

Wi-Fi scan results include a center frequency, so `frequencyHz` is emitted.

BLE scan callbacks do not identify which advertising-channel RF frequency produced an individual result, so the bridge does not invent a 2.4 GHz channel value.

Cellular observations preserve Android-reported LTE/NR signal metrics, normalized radio technology, registration state, ARFCN/EARFCN/UARFCN/NRARFCN-style channel number and channel-number type, LTE/NR band identifiers, LTE bandwidth when the platform exposes it, and the age of the modem's `CellInfo` sample relative to Android elapsed realtime. The bridge deliberately keeps modem-sample age separate from the observation receipt timestamp. It does not guess a physical center frequency from a cellular channel number without an explicit band/channel conversion model.

## Build

The project uses Android tooling available on current GitHub-hosted runners and contains no third-party radio libraries:

- Android Gradle Plugin 9.3.1
- compile/target SDK 36
- min SDK 31
- Java 17

Open `android/live-signals-bridge` in Android Studio with JDK 17 and the Android 36 SDK installed. The repository does not currently commit a Gradle wrapper JAR, so either let Android Studio configure the project or use a compatible installed Gradle.

API 36 is intentionally used for the reproducible CI build because the current GitHub Android SDK repository does not yet publish `platforms;android-37` to the hosted runner. The collector does not currently depend on an API newer than 36.

## Runtime lifecycle

The privileged WebView is restricted to `https://mrcalzon02.github.io/HB-TTRPG-tools/`. External URLs are opened outside the WebView and never inherit the JavaScript bridge.

The Activity starts passive collectors while the companion is foregrounded so hardware capability discovery is available as the page initializes, and it still stops them on pause/destroy. Live Signals Laboratory 0.4 also calls `bridge.startPassive()` when a Passive Scan session begins and `bridge.stopPassive()` when that session ends. The native methods are idempotent, so the web session becomes the authoritative in-app acquisition lifetime without creating a second collector path.

Observations emitted before a web session exists are discarded rather than queued as stale RF telemetry. When Android runtime permissions are granted after first launch, the Activity restarts the native collectors and refreshes the web capability report so newly available cellular/BLE/Wi-Fi/location channels become visible immediately.

## Native bridge API

The WebView installs `window.AndroidLiveSignalsBridge` with:

```text
getCapabilities() -> capability object
startPassive() -> true
stopPassive() -> true
runActiveScan(plan) -> Promise<observations[]>
```

Passive native observations are pushed to:

```text
LiveSignalsLaboratory.ingestObservation(observation)
```

Wi-Fi RTT observations retain the active technology, responder ID, distance, distance standard deviation, RSSI, and the explicit boundary that remote-device control is not assumed.
