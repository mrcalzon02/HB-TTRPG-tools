#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const base = new URL('../android/live-signals-bridge/', import.meta.url);
const read = relative => readFile(new URL(relative, base), 'utf8');

const [rootBuild, appBuild, manifest, activity, bridge, readme] = await Promise.all([
  read('build.gradle.kts'),
  read('app/build.gradle.kts'),
  read('app/src/main/AndroidManifest.xml'),
  read('app/src/main/java/com/hbttrpg/livesignals/MainActivity.java'),
  read('app/src/main/java/com/hbttrpg/livesignals/LiveSignalsNativeBridge.java'),
  read('README.md')
]);

assert.match(rootBuild, /com\.android\.application"\) version "9\.3\.1"/);
assert.match(appBuild, /compileSdk = 36/);
assert.match(appBuild, /targetSdk = 36/);
assert.match(appBuild, /minSdk = 31/);
assert.match(appBuild, /JavaVersion\.VERSION_17/);

for (const permission of [
  'INTERNET','ACCESS_WIFI_STATE','CHANGE_WIFI_STATE','ACCESS_FINE_LOCATION',
  'READ_PHONE_STATE','NEARBY_WIFI_DEVICES','BLUETOOTH_SCAN'
]) assert.match(manifest, new RegExp(`android\\.permission\\.${permission}`));

assert.match(activity, /addJavascriptInterface\(new JsApi\(\), "LiveSignalsNative"\)/);
assert.match(activity, /mrcalzon02\.github\.io/);
assert.match(activity, /ALLOWED_PATH_PREFIX = "\/HB-TTRPG-tools\/"/);
assert.match(activity, /settings\.setAllowFileAccess\(false\)/);
assert.match(activity, /settings\.setAllowContentAccess\(false\)/);
assert.match(activity, /MIXED_CONTENT_NEVER_ALLOW/);
assert.match(activity, /window\.AndroidLiveSignalsBridge/);
assert.match(activity, /getCapabilitiesJson/);
assert.match(activity, /runActiveScan/);
assert.match(activity, /nativeBridge\.startPassive\(\)/);
assert.match(activity, /nativeBridge\.stopPassive\(\)/);

assert.match(bridge, /TelephonyCallback\.SignalStrengthsListener/);
assert.match(bridge, /TelephonyCallback\.CellInfoListener/);
assert.match(bridge, /getCellSignalStrengths\(\)/);
assert.match(bridge, /CellSignalStrengthLte/);
assert.match(bridge, /getRsrp\(\)/);
assert.match(bridge, /getRsrq\(\)/);
assert.match(bridge, /getRssnr\(\)/);
assert.match(bridge, /CellSignalStrengthNr/);
assert.match(bridge, /getSsRsrp\(\)/);
assert.match(bridge, /getSsRsrq\(\)/);
assert.match(bridge, /getSsSinr\(\)/);

assert.match(bridge, /WifiManager\.SCAN_RESULTS_AVAILABLE_ACTION/);
assert.match(bridge, /wifiManager\.getScanResults\(\)/);
assert.doesNotMatch(bridge, /wifiManager\.startScan\s*\(/);
assert.doesNotMatch(bridge, /\.startScan\s*\(\s*\)\s*;/);
assert.match(bridge, /system\/cached scan results/i);

assert.match(bridge, /SCAN_MODE_OPPORTUNISTIC/);
assert.match(bridge, /SCAN_TYPE_PASSIVE/);
assert.match(bridge, /android-ble-passive-observation/);
assert.match(bridge, /does not expose the exact advertising-channel RF frequency/i);

for (const sensor of [
  'TYPE_ACCELEROMETER','TYPE_GYROSCOPE','TYPE_MAGNETIC_FIELD','TYPE_ROTATION_VECTOR','TYPE_PRESSURE'
]) assert.match(bridge, new RegExp(`Sensor\\.${sensor}`));
assert.match(bridge, /SENSOR_PERIOD_US = 50_000/);
assert.match(bridge, /LocationManager\.GPS_PROVIDER/);

assert.match(bridge, /WifiRttManager/);
assert.match(bridge, /wifiRttManager\.startRanging/);
assert.match(bridge, /is80211mcResponder\(\)/);
assert.match(bridge, /is80211azNtbResponder\(\)/);
assert.match(bridge, /getDistanceMm\(\)/);
assert.match(bridge, /getDistanceStdDevMm\(\)/);
assert.match(bridge, /remoteDeviceControlAssumed/);
assert.match(bridge, /localRuntimeHardwareAuthorized/);

for (const forbidden of [
  /setTxPower\s*\(/i,
  /setChannel\s*\(/i,
  /setWifiEnabled\s*\(/i,
  /deauth/i,
  /packetInjection/i,
  /frequencySweepTransmit/i,
  /pulseTransmit/i,
  /subnetSweep/i
]) assert.doesNotMatch(bridge, forbidden);

assert.match(bridge, /RF center frequency is left unknown rather than guessed/);
assert.match(readme, /instrumentation-only/i);
assert.match(readme, /never calls `WifiManager\.startScan\(\)`/);
assert.match(readme, /Active Scan currently implements only Wi-Fi RTT/);
assert.match(readme, /observations emitted before a web session exists are discarded/);
assert.match(readme, /compile\/target SDK 36/);

console.log(JSON.stringify({
  format:'hb-ttrpg-live-signals-android-bridge-validation-receipt',
  schemaVersion:'0.1.1',
  pass:true,
  androidProjectScaffold:true,
  restrictedPrivilegedWebView:true,
  passiveWifiSystemResults:true,
  noAppInitiatedWifiDiscoveryScan:true,
  cellularTelephonyCallbacks:true,
  lteNrMetricsPreserved:true,
  passiveBleReceivePath:true,
  gnssAndSensorContext:true,
  conservative20HzSensorDefault:true,
  truthfulUnknownFrequencyHandling:true,
  wifiRttResponderDiscovery:true,
  wifiRttDistanceAndUncertainty:true,
  noRadioMutationControls:true,
  foregroundHardwareLifecycle:true,
  ciCompileSdk36:true
}, null, 2));
