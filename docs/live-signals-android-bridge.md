# Live Signals Android Bridge

Status: bridge contract / implementation scaffold for Live Signals Laboratory 0.3.x.

The GitHub Pages runtime cannot directly call Android telephony or hardware-ranging APIs. Android hardware acquisition therefore belongs in a native companion/WebView bridge which reports normalized observations to `LiveSignalsLaboratory`.

## Trust model

The Android device hosting or driving the Live Signals runtime is treated as operator-authorized instrumentation. The laboratory therefore does **not** require a second manual checkbox to authorize use of that phone's own Wi-Fi, Bluetooth, UWB, cellular receiver, GNSS, or sensor hardware.

Nearby devices are not treated as equipment the laboratory controls. Active ranging may use a nearby device only when a documented platform/standards ranging mechanism exposes that device as a capable/participating responder or when the bridge presents a deliberately selected network endpoint. This permits ordinary ranging behavior without implying administrative control, association changes, configuration access, packet injection, deauthentication, or interference with the responder.

For Wi-Fi RTT specifically, Android can identify RTT-capable access points from scan results and range them without the phone joining those APs. The native bridge should therefore discover responder-capable APs through the Android API and report them as `rangingTargets`; a hand-maintained authorization list is not the normal workflow.

## Required passive receiver channels

An Android bridge should inventory each channel independently and report availability rather than treating the phone as one generic RF receiver.

- `wifi` — consume `WifiManager` system/cached scan results and `SCAN_RESULTS_AVAILABLE_ACTION`. Passive mode must not call `WifiManager.startScan()`.
- `cellular` — register `TelephonyCallback.SignalStrengthsListener` for serving-network signal changes and, when permissions permit, `TelephonyCallback.CellInfoListener` for visible serving/neighbour cells. Preserve LTE/NR/GSM/WCDMA-specific values such as RSRP, RSRQ, RSSI and SINR when Android reports them; do not collapse everything to one fabricated RSSI.
- `ble` — prefer true passive BLE scan type when the platform exposes it; otherwise `SCAN_MODE_OPPORTUNISTIC` is the passive fallback because it listens for scan results without initiating a BLE scan itself. No advertising or GATT connection belongs to Passive Scan.
- `gnss` — location/accuracy/time context when permitted.
- `motion` — accelerometer, gyroscope and orientation context when present.
- `magnetometer` — magnetic-field context when present.
- optional `barometer`, light and proximity channels — capability dependent.

The bridge capability report should therefore look conceptually like:

```json
{
  "bridgeId": "android-native",
  "passiveChannels": ["wifi", "cellular", "ble", "gnss", "motion", "magnetometer"],
  "unavailableChannels": [],
  "activeMethods": ["wifi-rtt-ranging"],
  "rangingTargets": [
    {
      "id": "opaque-rtt-ap-id",
      "label": "RTT responder",
      "participating": true,
      "responderCapable": true,
      "methods": ["wifi-rtt-ranging"]
    }
  ]
}
```

If cellular service exists but no cellular observations are emitted, the web laboratory displays `bridge-available-no-samples` instead of silently looking like there is no cellular RF activity.

## Normalized passive observations

Every bridge observation is delivered to `LiveSignalsLaboratory.ingestObservation(...)`. Examples:

```json
{
  "kind": "cellular",
  "adapterId": "android-native",
  "sourceId": "cell-opaque-id",
  "frequencyHz": 1900000000,
  "rsrpDbm": -96,
  "rsrqDb": -11,
  "sinrDb": 17,
  "provenance": "android-telephony-callback"
}
```

```json
{
  "kind": "ble",
  "adapterId": "android-native",
  "sourceId": "ble-address-or-platform-id",
  "frequencyHz": 2440000000,
  "rssiDbm": -67,
  "provenance": "android-ble-passive-observation"
}
```

Privacy redaction remains enabled by default in the web laboratory, so the native collector should not assume raw identifiers will be retained.

## Android permissions/capability boundary

The collector must request only permissions required for enabled channels and must report permission denial as a channel state rather than retrying aggressively.

Typical channel requirements include:

- cellular visible-cell information: `READ_PHONE_STATE` and `ACCESS_FINE_LOCATION` where required by `CellInfoListener`;
- Wi-Fi scan results: Android permission requirements applicable to `WifiManager.getScanResults()` on the device/API level;
- Bluetooth observation on Android 12+: `BLUETOOTH_SCAN`, plus location handling appropriate to whether the application derives physical location;
- GNSS/location: normal Android location permissions.

The exact runtime permission set must be derived from target SDK/device API level and the enabled measurements rather than hard-coded as universally sufficient.

## Active Scan bridge contract

Active Scan is separate from Passive Scan. The web laboratory only accepts bridge-reported methods from this allowlist:

- `wifi-rtt-ranging`
- `uwb-ranging`
- `ble-ranging`
- `authorized-network-rtt` (legacy method ID; displayed as Selected network RTT)

The bridge exposes a method only when the attached device supports it. Targets are reported through `rangingTargets` (the runtime also accepts the older `activeTargets` / `authorizedTargets` field names for compatibility).

For standards-based ranging, targets should be generated from actual platform capability/participation information. Examples include Wi-Fi scan results advertising IEEE 802.11mc/802.11az RTT support, or a UWB/Bluetooth peer that has entered the required ranging session. A target is not a claim that the laboratory owns or administers the responder; it means the platform reports that the responder can participate in the requested ranging mechanism.

`runActiveScan(plan)` receives only those bridge-reported responders/endpoints, capped by the web laboratory's target/sample/time limits. If the optional target-ID field is left blank, the bridge may use all eligible responders within the plan limits. If IDs are supplied, they filter the bridge-discovered set rather than creating arbitrary new targets.

Active Scan does **not** authorize arbitrary RF transmission or remote-device control. The bridge must not expose transmitter-power changes, channel changes, modulation changes, packet injection, deauthentication, subnet/broadcast ping sweeps, arbitrary frequency sweeps or pulse transmission.

`authorized-network-rtt` is latency context only; ordinary IP round-trip time is not converted into RF distance.

## Hardware health and duty-cycle behavior

The bridge should include battery and thermal state with observations when available. The web laboratory already blocks or reduces acquisition at configured thermal/battery thresholds. Native collectors should also stop their callbacks/scans when the web session ends and avoid holding radios/sensors at unnecessarily high duty cycles.

## Integration interface

The web runtime recognizes either `window.LiveSignalsHardwareBridge` or `window.AndroidLiveSignalsBridge` and expects:

```text
getCapabilities() -> capability report or Promise<capability report>
runActiveScan(plan) -> observations[] or Promise<observations[]>
```

Passive collectors push observations independently through `LiveSignalsLaboratory.ingestObservation(observation)` while a Live Signals session is running.

The packaged Android companion/WebView host should implement this contract using `TelephonyManager`, `WifiManager`, `BluetoothLeScanner`, location and `SensorManager`, then add Wi-Fi RTT/UWB/Bluetooth ranging adapters only on devices that report those capabilities.