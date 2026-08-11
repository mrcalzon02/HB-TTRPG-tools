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

Cellular callbacks preserve LTE/NR signal metrics and ARFCN/EARFCN/NRARFCN-style channel numbers when Android exposes them. The bridge does not guess a center frequency from a channel number without an explicit band/channel conversion model.

## Build

The project targets current Android tooling and contains no third-party radio libraries:

- Android Gradle Plugin 9.3.1
- compile/target SDK 37
- min SDK 31
- Java 17

Open `android/live-signals-bridge` in Android Studio with JDK 17 and the Android 37 SDK installed. The repository does not currently commit a Gradle wrapper JAR, so either let Android Studio configure the project or use a compatible installed Gradle.

## Runtime lifecycle

The privileged WebView is restricted to `https://mrcalzon02.github.io/HB-TTRPG-tools/`. External URLs are opened outside the WebView and never inherit the JavaScript bridge.

In this first packaged scaffold, passive collectors start while the companion Activity is foregrounded and stop on pause/destroy. The Live Signals web session determines whether observations are retained; observations emitted before a web session exists are discarded rather than queued as stale data.

A later authoritative web-runtime revision should call `bridge.startPassive()` and `bridge.stopPassive()` directly from the Live Signals session controls so hardware duty cycle exactly follows the web session.

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
