package com.hbttrpg.livesignals;

import android.Manifest;
import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothManager;
import android.bluetooth.le.ScanCallback;
import android.bluetooth.le.ScanResult;
import android.bluetooth.le.ScanSettings;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.pm.PackageManager;
import android.hardware.Sensor;
import android.hardware.SensorEvent;
import android.hardware.SensorEventListener;
import android.hardware.SensorManager;
import android.location.Location;
import android.location.LocationListener;
import android.location.LocationManager;
import android.net.wifi.WifiManager;
import android.net.wifi.rtt.RangingRequest;
import android.net.wifi.rtt.RangingResult;
import android.net.wifi.rtt.RangingResultCallback;
import android.net.wifi.rtt.WifiRttManager;
import android.os.BatteryManager;
import android.os.Build;
import android.os.Bundle;
import android.os.PowerManager;
import android.telephony.CellIdentity;
import android.telephony.CellIdentityGsm;
import android.telephony.CellIdentityLte;
import android.telephony.CellIdentityNr;
import android.telephony.CellIdentityTdscdma;
import android.telephony.CellIdentityWcdma;
import android.telephony.CellInfo;
import android.telephony.CellInfoCdma;
import android.telephony.CellInfoGsm;
import android.telephony.CellInfoLte;
import android.telephony.CellInfoNr;
import android.telephony.CellInfoTdscdma;
import android.telephony.CellInfoWcdma;
import android.telephony.CellSignalStrength;
import android.telephony.CellSignalStrengthCdma;
import android.telephony.CellSignalStrengthGsm;
import android.telephony.CellSignalStrengthLte;
import android.telephony.CellSignalStrengthNr;
import android.telephony.CellSignalStrengthTdscdma;
import android.telephony.CellSignalStrengthWcdma;
import android.telephony.SignalStrength;
import android.telephony.TelephonyCallback;
import android.telephony.TelephonyManager;
import android.webkit.WebView;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.lang.reflect.Method;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.Executor;

final class LiveSignalsNativeBridge implements AutoCloseable {
    private static final int SENSOR_PERIOD_US = 50_000; // 20 Hz: conservative live-context default.
    private static final long LOCATION_MIN_TIME_MS = 1_000L;
    private static final float LOCATION_MIN_DISTANCE_M = 0.25f;

    private final Context context;
    private final WebView webView;
    private final Executor mainExecutor;
    private final WifiManager wifiManager;
    private final WifiRttManager wifiRttManager;
    private final TelephonyManager telephonyManager;
    private final BluetoothManager bluetoothManager;
    private final LocationManager locationManager;
    private final SensorManager sensorManager;
    private final BatteryManager batteryManager;
    private final PowerManager powerManager;

    private final Map<String, android.net.wifi.ScanResult> latestWifiTargets = new HashMap<>();
    private List<android.net.wifi.ScanResult> latestWifiResults = List.of();
    private boolean passiveStarted = false;
    private boolean wifiReceiverRegistered = false;
    private boolean telephonyRegistered = false;
    private boolean bleStarted = false;
    private boolean locationStarted = false;
    private boolean sensorsStarted = false;

    private final BroadcastReceiver wifiScanReceiver = new BroadcastReceiver() {
        @Override
        public void onReceive(Context ignored, Intent intent) {
            if (WifiManager.SCAN_RESULTS_AVAILABLE_ACTION.equals(intent.getAction())) emitWifiResults();
        }
    };

    private final ScanCallback bleCallback = new ScanCallback() {
        @Override
        public void onScanResult(int callbackType, ScanResult result) {
            if (result == null || result.getDevice() == null) return;
            JSONObject row = baseObservation("ble", "android-ble-passive-observation");
            put(row, "sourceId", "ble-" + opaqueId(result.getDevice().getAddress()));
            put(row, "rssiDbm", result.getRssi());
            put(row, "note", "BLE advertisement receive observation; Android does not expose the exact advertising-channel RF frequency for this result.");
            emit(row);
        }

        @Override
        public void onBatchScanResults(List<ScanResult> results) {
            if (results == null) return;
            for (ScanResult result : results) onScanResult(0, result);
        }

        @Override
        public void onScanFailed(int errorCode) {
            emitStatus("ble", "scan-failed", "Bluetooth passive observation failed with code " + errorCode);
        }
    };

    private final LocationListener locationListener = new LocationListener() {
        @Override
        public void onLocationChanged(Location location) {
            JSONObject row = baseObservation("gnss", "android-location");
            put(row, "latitude", location.getLatitude());
            put(row, "longitude", location.getLongitude());
            if (location.hasAltitude()) put(row, "localZ", location.getAltitude());
            if (location.hasAccuracy()) put(row, "accuracyM", location.getAccuracy());
            put(row, "note", "GNSS/location context; geographic coordinates are redacted by the web laboratory unless privacy redaction is disabled.");
            emit(row);
        }

        @Override public void onProviderEnabled(String provider) {}
        @Override public void onProviderDisabled(String provider) {}
        @Override public void onStatusChanged(String provider, int status, Bundle extras) {}
    };

    private final SensorEventListener sensorListener = new SensorEventListener() {
        @Override
        public void onSensorChanged(SensorEvent event) {
            if (event == null || event.sensor == null) return;
            int type = event.sensor.getType();
            JSONObject row;
            switch (type) {
                case Sensor.TYPE_ACCELEROMETER -> {
                    row = baseObservation("accelerometer", "android-sensor");
                    putArray(row, "accelerationMs2", event.values, 3);
                }
                case Sensor.TYPE_GYROSCOPE -> {
                    row = baseObservation("gyroscope", "android-sensor");
                    putArray(row, "rotationRadS", event.values, 3);
                }
                case Sensor.TYPE_MAGNETIC_FIELD -> {
                    row = baseObservation("magnetometer", "android-sensor");
                    putArray(row, "magneticUt", event.values, 3);
                }
                case Sensor.TYPE_PRESSURE -> {
                    row = baseObservation("barometer", "android-sensor");
                    if (event.values.length > 0) put(row, "pressureHpa", event.values[0]);
                }
                case Sensor.TYPE_ROTATION_VECTOR -> {
                    row = baseObservation("orientation", "android-sensor");
                    float[] matrix = new float[9];
                    float[] orientation = new float[3];
                    SensorManager.getRotationMatrixFromVector(matrix, event.values);
                    SensorManager.getOrientation(matrix, orientation);
                    put(row, "headingDeg", normalizeDegrees(Math.toDegrees(orientation[0])));
                    put(row, "pitchDeg", Math.toDegrees(orientation[1]));
                    put(row, "rollDeg", Math.toDegrees(orientation[2]));
                }
                default -> {
                    return;
                }
            }
            emit(row);
        }

        @Override public void onAccuracyChanged(Sensor sensor, int accuracy) {}
    };

    private final PhoneCallback phoneCallback = new PhoneCallback();

    LiveSignalsNativeBridge(Context context, WebView webView) {
        this.context = context.getApplicationContext();
        this.webView = webView;
        this.mainExecutor = context.getMainExecutor();
        this.wifiManager = this.context.getSystemService(WifiManager.class);
        this.wifiRttManager = this.context.getSystemService(WifiRttManager.class);
        this.telephonyManager = this.context.getSystemService(TelephonyManager.class);
        this.bluetoothManager = this.context.getSystemService(BluetoothManager.class);
        this.locationManager = this.context.getSystemService(LocationManager.class);
        this.sensorManager = this.context.getSystemService(SensorManager.class);
        this.batteryManager = this.context.getSystemService(BatteryManager.class);
        this.powerManager = this.context.getSystemService(PowerManager.class);
    }

    JSONObject getCapabilitiesJson() {
        JSONObject report = new JSONObject();
        JSONArray passive = new JSONArray();
        JSONArray unavailable = new JSONArray();
        JSONArray active = new JSONArray();
        JSONArray targets = new JSONArray();

        capability(passive, unavailable, "wifi", wifiManager != null && hasPermission(Manifest.permission.ACCESS_FINE_LOCATION));
        capability(passive, unavailable, "cellular", telephonyManager != null && hasPermission(Manifest.permission.READ_PHONE_STATE));
        capability(passive, unavailable, "ble", bluetoothScanner() != null && hasPermission(Manifest.permission.BLUETOOTH_SCAN));
        capability(passive, unavailable, "gnss", locationManager != null && hasPermission(Manifest.permission.ACCESS_FINE_LOCATION));
        capability(passive, unavailable, "motion", hasSensor(Sensor.TYPE_ACCELEROMETER) || hasSensor(Sensor.TYPE_GYROSCOPE) || hasSensor(Sensor.TYPE_ROTATION_VECTOR));
        capability(passive, unavailable, "magnetometer", hasSensor(Sensor.TYPE_MAGNETIC_FIELD));
        if (hasSensor(Sensor.TYPE_PRESSURE)) passive.put("barometer");

        refreshWifiTargetCache();
        if (wifiRttManager != null && wifiRttManager.isAvailable()
                && hasPermission(Manifest.permission.ACCESS_FINE_LOCATION)
                && hasPermission(Manifest.permission.NEARBY_WIFI_DEVICES)) {
            active.put("wifi-rtt-ranging");
            for (Map.Entry<String, android.net.wifi.ScanResult> entry : latestWifiTargets.entrySet()) {
                JSONObject target = new JSONObject();
                put(target, "id", entry.getKey());
                put(target, "label", "Wi-Fi RTT responder");
                put(target, "participating", true);
                put(target, "responderCapable", true);
                JSONArray methods = new JSONArray();
                methods.put("wifi-rtt-ranging");
                put(target, "methods", methods);
                targets.put(target);
            }
        }

        put(report, "bridgeId", "android-native-webview");
        put(report, "passiveChannels", passive);
        put(report, "unavailableChannels", unavailable);
        put(report, "activeMethods", active);
        put(report, "rangingTargets", targets);
        put(report, "localRuntimeHardwareAuthorized", true);
        put(report, "remoteDeviceControlAssumed", false);
        put(report, "passiveStarted", passiveStarted);
        return report;
    }

    synchronized void startPassive() {
        if (passiveStarted) return;
        passiveStarted = true;
        startWifiObservation();
        startTelephonyObservation();
        startBleObservation();
        startLocationObservation();
        startSensorObservation();
        emitStatus("bridge", "started", "Android passive multi-radio collector started.");
    }

    synchronized void stopPassive() {
        if (!passiveStarted && !wifiReceiverRegistered && !telephonyRegistered && !bleStarted && !locationStarted && !sensorsStarted) return;
        passiveStarted = false;

        if (wifiReceiverRegistered) {
            try { context.unregisterReceiver(wifiScanReceiver); } catch (Exception ignored) {}
            wifiReceiverRegistered = false;
        }
        if (telephonyRegistered && telephonyManager != null) {
            try { telephonyManager.unregisterTelephonyCallback(phoneCallback); } catch (Exception ignored) {}
            telephonyRegistered = false;
        }
        if (bleStarted && bluetoothScanner() != null) {
            try { bluetoothScanner().stopScan(bleCallback); } catch (Exception ignored) {}
            bleStarted = false;
        }
        if (locationStarted && locationManager != null) {
            try { locationManager.removeUpdates(locationListener); } catch (Exception ignored) {}
            locationStarted = false;
        }
        if (sensorsStarted && sensorManager != null) {
            sensorManager.unregisterListener(sensorListener);
            sensorsStarted = false;
        }
        emitStatus("bridge", "stopped", "Android passive multi-radio collector stopped.");
    }

    void runActiveScan(String requestId, String planJson) {
        try {
            JSONObject plan = new JSONObject(planJson == null ? "{}" : planJson);
            String method = plan.optString("method", "");
            if (!"wifi-rtt-ranging".equals(method)) {
                reject(requestId, "Native scaffold currently implements Wi-Fi RTT only; unsupported Active Scan method: " + method);
                return;
            }
            if (wifiRttManager == null || !wifiRttManager.isAvailable()) {
                reject(requestId, "Wi-Fi RTT is not available on the attached Android device right now.");
                return;
            }
            if (!hasPermission(Manifest.permission.ACCESS_FINE_LOCATION)
                    || !hasPermission(Manifest.permission.NEARBY_WIFI_DEVICES)) {
                reject(requestId, "Wi-Fi RTT permissions are not granted.");
                return;
            }

            refreshWifiTargetCache();
            JSONArray requested = plan.optJSONArray("targets");
            List<android.net.wifi.ScanResult> selected = new ArrayList<>();
            Map<String, String> bssidToTarget = new HashMap<>();
            if (requested != null) {
                for (int i = 0; i < requested.length(); i++) {
                    JSONObject target = requested.optJSONObject(i);
                    if (target == null) continue;
                    String id = target.optString("id", "");
                    android.net.wifi.ScanResult scan = latestWifiTargets.get(id);
                    if (scan != null) {
                        selected.add(scan);
                        bssidToTarget.put(scan.BSSID.toLowerCase(Locale.ROOT), id);
                    }
                }
            }
            if (selected.isEmpty()) {
                reject(requestId, "No bridge-discovered Wi-Fi RTT responders matched the active plan.");
                return;
            }

            RangingRequest request = new RangingRequest.Builder().addAccessPoints(selected).build();
            wifiRttManager.startRanging(request, mainExecutor, new RangingResultCallback() {
                @Override
                public void onRangingFailure(int code) {
                    reject(requestId, "Wi-Fi RTT ranging failed with code " + code);
                }

                @Override
                public void onRangingResults(List<RangingResult> results) {
                    JSONArray observations = new JSONArray();
                    for (RangingResult result : results) {
                        if (result.getStatus() != RangingResult.STATUS_SUCCESS || result.getMacAddress() == null) continue;
                        String id = bssidToTarget.get(result.getMacAddress().toString().toLowerCase(Locale.ROOT));
                        if (id == null) continue;
                        JSONObject row = baseObservation("wifi-rtt", "android-wifi-rtt");
                        put(row, "acquisitionMode", "active");
                        put(row, "operation", "wifi-rtt-ranging");
                        put(row, "rangingTechnology", "wifi-rtt-ranging");
                        put(row, "targetId", id);
                        put(row, "distanceM", result.getDistanceMm() / 1000.0);
                        put(row, "distanceStdDevM", result.getDistanceStdDevMm() / 1000.0);
                        put(row, "rssiDbm", result.getRssi());
                        put(row, "responderParticipating", true);
                        put(row, "remoteDeviceControlAssumed", false);
                        observations.put(row);
                    }
                    resolve(requestId, true, observations);
                }
            });
        } catch (SecurityException error) {
            reject(requestId, "Wi-Fi RTT permission/security failure: " + error.getMessage());
        } catch (Exception error) {
            reject(requestId, "Active Scan failed: " + error.getMessage());
        }
    }

    private void startWifiObservation() {
        if (wifiManager == null || !hasPermission(Manifest.permission.ACCESS_FINE_LOCATION)) {
            emitStatus("wifi", "unavailable", "Wi-Fi scan results are unavailable or permission-blocked.");
            return;
        }
        try {
            IntentFilter filter = new IntentFilter(WifiManager.SCAN_RESULTS_AVAILABLE_ACTION);
            if (Build.VERSION.SDK_INT >= 33) {
                context.registerReceiver(wifiScanReceiver, filter, Context.RECEIVER_EXPORTED);
            } else {
                context.registerReceiver(wifiScanReceiver, filter);
            }
            wifiReceiverRegistered = true;
            emitWifiResults(); // Consume cached/system-produced results immediately; never calls startScan().
        } catch (SecurityException error) {
            emitStatus("wifi", "permission-blocked", error.getMessage());
        }
    }

    private void emitWifiResults() {
        if (wifiManager == null) return;
        try {
            List<android.net.wifi.ScanResult> results = wifiManager.getScanResults();
            latestWifiResults = results == null ? List.of() : new ArrayList<>(results);
            refreshWifiTargetCache();
            for (android.net.wifi.ScanResult result : latestWifiResults) {
                JSONObject row = baseObservation("wifi", "android-wifi-system-scan-result");
                put(row, "sourceId", wifiTargetId(result));
                put(row, "ssid", result.SSID);
                put(row, "frequencyHz", result.frequency * 1_000_000L);
                put(row, "channel", frequencyMhzToChannel(result.frequency));
                put(row, "rssiDbm", result.level);
                put(row, "stale", false);
                put(row, "note", isRttResponder(result) ? "Wi-Fi observation; AP advertises RTT responder capability." : "Wi-Fi observation from system/cached scan results.");
                emit(row);
            }
        } catch (SecurityException error) {
            emitStatus("wifi", "permission-blocked", error.getMessage());
        }
    }

    private void startTelephonyObservation() {
        if (telephonyManager == null || !hasPermission(Manifest.permission.READ_PHONE_STATE)) {
            emitStatus("cellular", "unavailable", "Telephony signal callbacks are unavailable or READ_PHONE_STATE is not granted.");
            return;
        }
        try {
            telephonyManager.registerTelephonyCallback(mainExecutor, phoneCallback);
            telephonyRegistered = true;
            if (hasPermission(Manifest.permission.ACCESS_FINE_LOCATION)) {
                List<CellInfo> current = telephonyManager.getAllCellInfo();
                if (current != null) emitCellInfo(current);
            }
        } catch (SecurityException error) {
            emitStatus("cellular", "permission-blocked", error.getMessage());
        }
    }

    private final class PhoneCallback extends TelephonyCallback
            implements TelephonyCallback.SignalStrengthsListener, TelephonyCallback.CellInfoListener {
        @Override
        public void onSignalStrengthsChanged(SignalStrength signalStrength) {
            if (signalStrength == null) return;
            for (CellSignalStrength strength : signalStrength.getCellSignalStrengths()) {
                JSONObject row = cellularStrengthObservation(strength, "serving-" + strength.getClass().getSimpleName().toLowerCase(Locale.ROOT));
                put(row, "note", "Serving-network signal-strength callback; exact carrier center frequency is not inferred from this callback.");
                emit(row);
            }
        }

        @Override
        public void onCellInfoChanged(List<CellInfo> cellInfo) {
            emitCellInfo(cellInfo);
        }
    }

    private void emitCellInfo(List<CellInfo> cells) {
        if (cells == null) return;
        for (CellInfo cell : cells) {
            CellSignalStrength strength = cellStrength(cell);
            CellIdentity identity = cellIdentity(cell);
            if (strength == null) continue;
            JSONObject row = cellularStrengthObservation(strength,
                    identity == null ? "cell-unknown" : "cell-" + opaqueId(identity.toString()));
            put(row, "registered", cell.isRegistered());
            Integer channel = cellularChannel(identity);
            if (channel != null && channel != CellInfo.UNAVAILABLE) put(row, "channel", channel);
            put(row, "note", "CellInfo observation; channel number is preserved when Android exposes it. RF center frequency is left unknown rather than guessed from ARFCN/EARFCN/NRARFCN.");
            emit(row);
        }
    }

    private JSONObject cellularStrengthObservation(CellSignalStrength strength, String sourceId) {
        JSONObject row = baseObservation("cellular", "android-telephony-callback");
        put(row, "sourceId", sourceId);
        put(row, "radioTechnology", strength.getClass().getSimpleName());
        if (strength instanceof CellSignalStrengthLte lte) {
            putAvailable(row, "rssiDbm", lte.getRssi());
            putAvailable(row, "rsrpDbm", lte.getRsrp());
            putAvailable(row, "rsrqDb", lte.getRsrq());
            putAvailable(row, "sinrDb", lte.getRssnr());
        } else if (strength instanceof CellSignalStrengthNr nr) {
            putAvailable(row, "rsrpDbm", nr.getSsRsrp());
            putAvailable(row, "rsrqDb", nr.getSsRsrq());
            putAvailable(row, "sinrDb", nr.getSsSinr());
        } else if (strength instanceof CellSignalStrengthWcdma wcdma) {
            putAvailable(row, "rssiDbm", wcdma.getDbm());
        } else if (strength instanceof CellSignalStrengthGsm gsm) {
            putAvailable(row, "rssiDbm", gsm.getDbm());
        } else if (strength instanceof CellSignalStrengthTdscdma tdscdma) {
            putAvailable(row, "rssiDbm", tdscdma.getDbm());
        } else if (strength instanceof CellSignalStrengthCdma cdma) {
            putAvailable(row, "rssiDbm", cdma.getDbm());
        } else {
            putAvailable(row, "rssiDbm", strength.getDbm());
        }
        put(row, "signalLevel", strength.getLevel());
        return row;
    }

    private static CellSignalStrength cellStrength(CellInfo cell) {
        if (cell instanceof CellInfoLte x) return x.getCellSignalStrength();
        if (cell instanceof CellInfoNr x) return x.getCellSignalStrength();
        if (cell instanceof CellInfoWcdma x) return x.getCellSignalStrength();
        if (cell instanceof CellInfoGsm x) return x.getCellSignalStrength();
        if (cell instanceof CellInfoTdscdma x) return x.getCellSignalStrength();
        if (cell instanceof CellInfoCdma x) return x.getCellSignalStrength();
        return null;
    }

    private static CellIdentity cellIdentity(CellInfo cell) {
        if (cell instanceof CellInfoLte x) return x.getCellIdentity();
        if (cell instanceof CellInfoNr x) return x.getCellIdentity();
        if (cell instanceof CellInfoWcdma x) return x.getCellIdentity();
        if (cell instanceof CellInfoGsm x) return x.getCellIdentity();
        if (cell instanceof CellInfoTdscdma x) return x.getCellIdentity();
        if (cell instanceof CellInfoCdma x) return x.getCellIdentity();
        return null;
    }

    private static Integer cellularChannel(CellIdentity identity) {
        if (identity instanceof CellIdentityLte x) return x.getEarfcn();
        if (identity instanceof CellIdentityNr x) return x.getNrarfcn();
        if (identity instanceof CellIdentityWcdma x) return x.getUarfcn();
        if (identity instanceof CellIdentityGsm x) return x.getArfcn();
        if (identity instanceof CellIdentityTdscdma x) return x.getUarfcn();
        return null;
    }

    private void startBleObservation() {
        if (bluetoothScanner() == null || !hasPermission(Manifest.permission.BLUETOOTH_SCAN)) {
            emitStatus("ble", "unavailable", "Bluetooth LE receiver is unavailable or BLUETOOTH_SCAN is not granted.");
            return;
        }
        try {
            ScanSettings.Builder builder = new ScanSettings.Builder();
            boolean explicitPassiveType = trySetPassiveScanType(builder);
            builder.setScanMode(explicitPassiveType ? ScanSettings.SCAN_MODE_LOW_POWER : ScanSettings.SCAN_MODE_OPPORTUNISTIC);
            bluetoothScanner().startScan(null, builder.build(), bleCallback);
            bleStarted = true;
            emitStatus("ble", "listening", explicitPassiveType
                    ? "BLE passive scan type enabled."
                    : "BLE opportunistic receive mode enabled; it does not initiate BLE scanning.");
        } catch (SecurityException error) {
            emitStatus("ble", "permission-blocked", error.getMessage());
        }
    }

    private boolean trySetPassiveScanType(ScanSettings.Builder builder) {
        try {
            Method method = ScanSettings.Builder.class.getMethod("setScanType", int.class);
            int passive = ScanSettings.class.getField("SCAN_TYPE_PASSIVE").getInt(null);
            method.invoke(builder, passive);
            return true;
        } catch (Throwable ignored) {
            return false;
        }
    }

    private android.bluetooth.le.BluetoothLeScanner bluetoothScanner() {
        BluetoothAdapter adapter = bluetoothManager == null ? null : bluetoothManager.getAdapter();
        if (adapter == null || !adapter.isEnabled()) return null;
        try { return adapter.getBluetoothLeScanner(); }
        catch (SecurityException ignored) { return null; }
    }

    private void startLocationObservation() {
        if (locationManager == null || !hasPermission(Manifest.permission.ACCESS_FINE_LOCATION)) {
            emitStatus("gnss", "unavailable", "Fine location permission or location service unavailable.");
            return;
        }
        try {
            locationManager.requestLocationUpdates(
                    LocationManager.GPS_PROVIDER,
                    LOCATION_MIN_TIME_MS,
                    LOCATION_MIN_DISTANCE_M,
                    locationListener);
            locationStarted = true;
        } catch (SecurityException error) {
            emitStatus("gnss", "permission-blocked", error.getMessage());
        } catch (IllegalArgumentException error) {
            emitStatus("gnss", "provider-unavailable", error.getMessage());
        }
    }

    private void startSensorObservation() {
        if (sensorManager == null) return;
        registerSensor(Sensor.TYPE_ACCELEROMETER);
        registerSensor(Sensor.TYPE_GYROSCOPE);
        registerSensor(Sensor.TYPE_MAGNETIC_FIELD);
        registerSensor(Sensor.TYPE_ROTATION_VECTOR);
        registerSensor(Sensor.TYPE_PRESSURE);
        sensorsStarted = true;
    }

    private void registerSensor(int type) {
        Sensor sensor = sensorManager.getDefaultSensor(type);
        if (sensor != null) sensorManager.registerListener(sensorListener, sensor, SENSOR_PERIOD_US);
    }

    private boolean hasSensor(int type) {
        return sensorManager != null && sensorManager.getDefaultSensor(type) != null;
    }

    private void refreshWifiTargetCache() {
        if (latestWifiResults.isEmpty() && wifiManager != null && hasPermission(Manifest.permission.ACCESS_FINE_LOCATION)) {
            try {
                List<android.net.wifi.ScanResult> cached = wifiManager.getScanResults();
                latestWifiResults = cached == null ? List.of() : new ArrayList<>(cached);
            } catch (SecurityException ignored) {}
        }
        latestWifiTargets.clear();
        for (android.net.wifi.ScanResult result : latestWifiResults) {
            if (isRttResponder(result)) latestWifiTargets.put(wifiTargetId(result), result);
        }
    }

    private boolean isRttResponder(android.net.wifi.ScanResult result) {
        if (result == null) return false;
        try {
            if (result.is80211mcResponder()) return true;
            if (Build.VERSION.SDK_INT >= 35 && result.is80211azNtbResponder()) return true;
        } catch (Throwable ignored) {}
        return false;
    }

    private String wifiTargetId(android.net.wifi.ScanResult result) {
        return "wifi-" + opaqueId(result.BSSID == null ? result.toString() : result.BSSID);
    }

    private int frequencyMhzToChannel(int mhz) {
        if (mhz == 2484) return 14;
        if (mhz >= 2412 && mhz <= 2472) return (mhz - 2407) / 5;
        if (mhz >= 5000 && mhz <= 5900) return (mhz - 5000) / 5;
        if (mhz >= 5955 && mhz <= 7115) return (mhz - 5950) / 5;
        return 0;
    }

    private JSONObject baseObservation(String kind, String provenance) {
        JSONObject row = new JSONObject();
        put(row, "timestampMs", System.currentTimeMillis());
        put(row, "kind", kind);
        put(row, "adapterId", "android-native");
        put(row, "deviceId", "local-android-device");
        put(row, "provenance", provenance);
        put(row, "thermalState", thermalState());
        if (batteryManager != null) {
            int battery = batteryManager.getIntProperty(BatteryManager.BATTERY_PROPERTY_CAPACITY);
            if (battery >= 0 && battery <= 100) put(row, "batteryPercent", battery);
        }
        return row;
    }

    private void emitStatus(String channel, String state, String note) {
        JSONObject row = baseObservation(channel, "android-bridge-status");
        put(row, "note", state + ": " + (note == null ? "" : note));
        emit(row);
    }

    private String thermalState() {
        if (powerManager == null) return "unknown";
        return switch (powerManager.getCurrentThermalStatus()) {
            case PowerManager.THERMAL_STATUS_NONE -> "nominal";
            case PowerManager.THERMAL_STATUS_LIGHT -> "fair";
            case PowerManager.THERMAL_STATUS_MODERATE -> "serious";
            case PowerManager.THERMAL_STATUS_SEVERE -> "severe";
            case PowerManager.THERMAL_STATUS_CRITICAL -> "critical";
            case PowerManager.THERMAL_STATUS_EMERGENCY -> "emergency";
            case PowerManager.THERMAL_STATUS_SHUTDOWN -> "shutdown";
            default -> "unknown";
        };
    }

    private void emit(JSONObject observation) {
        if (!passiveStarted && !"android-wifi-rtt".equals(observation.optString("provenance"))) return;
        String payload = JSONObject.quote(observation.toString());
        String script = """
            (() => {
              try {
                if (window.LiveSignalsLaboratory && window.LiveSignalsLaboratory.ingestObservation) {
                  window.LiveSignalsLaboratory.ingestObservation(JSON.parse(%s));
                }
              } catch (error) {
                // No active web session yet: discard rather than queue stale RF telemetry.
              }
            })();
            """.formatted(payload);
        webView.post(() -> webView.evaluateJavascript(script, null));
    }

    private void resolve(String requestId, boolean ok, Object payload) {
        String request = JSONObject.quote(requestId);
        String body = JSONObject.quote(payload == null ? "null" : payload.toString());
        String script = "window.__liveSignalsNativeResolve && window.__liveSignalsNativeResolve("
                + request + "," + ok + "," + body + ");";
        webView.post(() -> webView.evaluateJavascript(script, null));
    }

    private void reject(String requestId, String message) {
        JSONObject error = new JSONObject();
        put(error, "error", message == null ? "Native Active Scan failed." : message);
        resolve(requestId, false, error);
    }

    private boolean hasPermission(String permission) {
        return context.checkSelfPermission(permission) == PackageManager.PERMISSION_GRANTED;
    }

    private static void capability(JSONArray available, JSONArray unavailable, String id, boolean isAvailable) {
        (isAvailable ? available : unavailable).put(id);
    }

    private static void put(JSONObject object, String key, Object value) {
        if (object == null || key == null || value == null) return;
        try { object.put(key, value); } catch (JSONException ignored) {}
    }

    private static void putAvailable(JSONObject object, String key, int value) {
        if (value != CellInfo.UNAVAILABLE) put(object, key, value);
    }

    private static void putArray(JSONObject object, String key, float[] values, int limit) {
        if (values == null) return;
        JSONArray array = new JSONArray();
        for (int i = 0; i < Math.min(limit, values.length); i++) {
            float value = values[i];
            if (!Float.isFinite(value)) continue;
            try { array.put((double) value); } catch (JSONException ignored) {}
        }
        put(object, key, array);
    }

    private static double normalizeDegrees(double value) {
        double result = value % 360.0;
        return result < 0 ? result + 360.0 : result;
    }

    private static String opaqueId(String value) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256")
                    .digest(String.valueOf(value).getBytes(StandardCharsets.UTF_8));
            StringBuilder out = new StringBuilder();
            for (int i = 0; i < 8; i++) out.append(String.format(Locale.ROOT, "%02x", digest[i] & 0xff));
            return out.toString();
        } catch (Exception ignored) {
            return Integer.toHexString(String.valueOf(value).hashCode());
        }
    }

    @Override
    public void close() {
        stopPassive();
        latestWifiTargets.clear();
        latestWifiResults = List.of();
    }
}
