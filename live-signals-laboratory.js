(function installLiveSignalsLaboratory(root, factory) {
  'use strict';
  const api = factory(root || globalThis);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.LiveSignalsLaboratory = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function createLiveSignalsLaboratory(root) {
  'use strict';

  const VERSION = '0.3.0';
  const PANEL_ID = 'live-signals-laboratory';
  const STYLE_ID = 'live-signals-laboratory-style';
  const VERIFIED_AT = '2026-08-09';
  const CURRENT_MODE = 'passive-default-active-ranging-gated';
  const MAX_SESSION_MINUTES = 60;
  const DEFAULT_SESSION_MINUTES = 15;
  const MAX_SENSOR_HZ = 50;
  const DEFAULT_SENSOR_HZ = 20;
  const MIN_WIFI_RESULT_POLL_MS = 5000;
  const MIN_BLE_OBSERVE_PERIOD_MS = 30000;
  const MAX_BLE_OBSERVE_WINDOW_MS = 10000;
  const MIN_CELL_POLL_MS = 2000;
  const MIN_GNSS_POLL_MS = 1000;
  const MIN_ROUTER_POLL_MS = 2000;
  const MAX_OBSERVATIONS = 12000;
  const FREQUENCY_BIN_HZ = 1e6;
  const MAX_ACTIVE_TARGETS = 8;
  const MAX_ACTIVE_SAMPLES_PER_TARGET = 5;
  const MIN_ACTIVE_SAMPLE_INTERVAL_MS = 750;
  const MAX_ACTIVE_BURST_SECONDS = 30;

  const freeze = value => Object.freeze(value);
  const finite = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
  const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
  const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[ch]));

  const UNSAFE_RADIO_MUTATIONS = freeze([
    'set-tx-power','set-channel','set-bandwidth','set-modulation','set-antenna-chain','set-antenna-gain',
    'packet-injection','deauthentication','continuous-transmit','beacon-spam','radio-reset','interface-down','interface-up',
    'wifi-association-change','wifi-start-scan','wifi-probe-request','bluetooth-advertise','bluetooth-connect',
    'cellular-transmit-control','uwb-transmit-control','frequency-sweep-transmit','pulse-transmit','subnet-sweep','broadcast-ping-sweep'
  ]);

  const ACTIVE_SCAN_METHODS = freeze({
    'wifi-rtt-ranging': freeze({id:'wifi-rtt-ranging',label:'Wi-Fi RTT',measurement:'distance',targetClass:'participating-access-point-or-peer',requiresAuthorization:true}),
    'uwb-ranging': freeze({id:'uwb-ranging',label:'UWB ranging',measurement:'distance-angle-when-reported',targetClass:'paired-participating-peer',requiresAuthorization:true}),
    'ble-ranging': freeze({id:'ble-ranging',label:'Bluetooth ranging / channel sounding',measurement:'distance-or-rssi-range-when-supported',targetClass:'participating-peer',requiresAuthorization:true}),
    'authorized-network-rtt': freeze({id:'authorized-network-rtt',label:'Authorized network RTT',measurement:'latency-context-not-rf-distance',targetClass:'explicit-owned-or-authorized-endpoint',requiresAuthorization:true})
  });

  const ACTIVE_SCAN_POLICY = freeze({
    enabled:true,
    separateFromPassive:true,
    authorizedTargetsOnly:true,
    capabilityReportedMethodsOnly:true,
    arbitraryFrequencySelection:false,
    transmitterPowerMutation:false,
    channelMutation:false,
    maximumTargets:MAX_ACTIVE_TARGETS,
    maximumSamplesPerTarget:MAX_ACTIVE_SAMPLES_PER_TARGET,
    minimumSampleIntervalMs:MIN_ACTIVE_SAMPLE_INTERVAL_MS,
    maximumBurstSeconds:MAX_ACTIVE_BURST_SECONDS,
    note:'Active Scan is limited to standards/platform-supported ranging or explicit authorized endpoint RTT. It does not expose arbitrary RF emission, power control, channel control, packet injection, subnet sweeps, or frequency sweeps.'
  });

  const CHANNEL_CATALOG = freeze({
    wifi:freeze({id:'wifi',label:'Wi-Fi receiver',kinds:freeze(['wifi','wifi-scan','wifi-current-network'])}),
    cellular:freeze({id:'cellular',label:'Cellular receiver',kinds:freeze(['cellular','cell','lte','nr','gsm','wcdma','cdma'])}),
    ble:freeze({id:'ble',label:'Bluetooth / BLE receiver',kinds:freeze(['ble','bluetooth'])}),
    gnss:freeze({id:'gnss',label:'GNSS / location',kinds:freeze(['gnss','location'])}),
    motion:freeze({id:'motion',label:'Motion / orientation',kinds:freeze(['motion','orientation','accelerometer','gyroscope'])}),
    magnetometer:freeze({id:'magnetometer',label:'Magnetometer',kinds:freeze(['magnetometer','magnetic'])}),
    barometer:freeze({id:'barometer',label:'Barometer',kinds:freeze(['barometer','pressure'])}),
    router:freeze({id:'router',label:'Router / AP telemetry',kinds:freeze(['router','station','survey'])}),
    ranging:freeze({id:'ranging',label:'Active ranging results',kinds:freeze(['range','ranging','wifi-rtt','uwb-range','ble-range','network-rtt'])})
  });

  const RECEIVER_HEALTH_THRESHOLDS = freeze({
    minimumReferenceSamples: 12,
    preferredReferenceSamples: 30,
    chainImbalanceWatchDb: 5,
    chainImbalanceSuspectDb: 8,
    signalIqrWatchDb: 4,
    signalIqrSuspectDb: 7,
    noiseIqrWatchDb: 3,
    noiseIqrSuspectDb: 6,
    baselineLossWatchDb: 4,
    baselineLossSuspectDb: 7,
    baselineNoiseRiseWatchDb: 3,
    baselineNoiseRiseSuspectDb: 6,
    staleFractionWatch: .20,
    staleFractionSuspect: .50
  });

  const SAFETY_POLICY = freeze({
    mode: CURRENT_MODE,
    defaultAcquisitionMode:'passive',
    receiveOnly: false,
    transmitterControlsExposed: false,
    passiveTelemetryOnly: false,
    passiveModeReceiveOnly:true,
    activeRangingEnabled: true,
    activeScanPolicy:ACTIVE_SCAN_POLICY,
    appRequestedWifiScanEnabled: false,
    maximumSessionMinutes: MAX_SESSION_MINUTES,
    defaultSessionMinutes: DEFAULT_SESSION_MINUTES,
    maximumSensorHz: MAX_SENSOR_HZ,
    defaultSensorHz: DEFAULT_SENSOR_HZ,
    minimumWifiResultPollMs: MIN_WIFI_RESULT_POLL_MS,
    minimumBleObservePeriodMs: MIN_BLE_OBSERVE_PERIOD_MS,
    maximumBleObserveWindowMs: MAX_BLE_OBSERVE_WINDOW_MS,
    minimumCellPollMs: MIN_CELL_POLL_MS,
    minimumGnssPollMs: MIN_GNSS_POLL_MS,
    minimumRouterPollMs: MIN_ROUTER_POLL_MS,
    stopThermalStates: freeze(['critical','emergency','shutdown']),
    reduceThermalStates: freeze(['serious','severe']),
    minimumBatteryPercentWithoutExternalPower: 15,
    prohibitedOperations: UNSAFE_RADIO_MUTATIONS,
    privacyRedactionDefault: true,
    note: 'Passive Scan remains receive-only. Active Scan is a separate gated ranging/authorized-RTT path; arbitrary transmitter control, app-requested Wi-Fi discovery scans, frequency sweeps, pulse transmission, packet injection and radio mutation remain blocked.'
  });

  const HARDWARE_PROFILES = freeze({
    'android-native': freeze({
      id:'android-native', label:'Android passive native bridge', class:'mobile',
      scope: freeze(['wifi-system-scan-results','ble-observation','cellular-signal','cell-neighbors','gnss','motion','magnetometer','barometer-conditional','light-conditional','proximity-conditional']),
      expectedPassiveChannels: freeze(['wifi','cellular','ble','gnss','motion','magnetometer']),
      activeMethods: freeze(['wifi-rtt-ranging','uwb-ranging','ble-ranging']),
      limitations: freeze(['Do not call WifiManager.startScan in passive phase; consume system/cached scan results and scan-completion broadcasts.','Cell signal freshness is modem/platform controlled and requires a native TelephonyManager bridge.','BLE observation requires the native Bluetooth scan permission/API path.','Wi-Fi RTT/UWB/Bluetooth ranging are capability- and peer-dependent and only belong to the separate Active Scan path.']),
      preferred: true
    }),
    'ios-native': freeze({
      id:'ios-native', label:'iOS passive native bridge', class:'mobile',
      scope: freeze(['wifi-current-network','ble-observation','gnss','heading','motion','magnetometer','barometer-conditional','ibeacon-observation-conditional']),
      expectedPassiveChannels: freeze(['wifi','ble','gnss','motion','magnetometer']),
      activeMethods: freeze(['uwb-ranging']),
      unavailable: freeze(['general-wifi-scan-public-api','public-cellular-signal-strength-api']),
      limitations: freeze(['Current-network Wi-Fi data requires Apple entitlement/authorization conditions.','General Wi-Fi scanning is not exposed through ordinary public app APIs.','Core Motion/Location services are capability- and permission-gated.']),
      preferred: false
    }),
    'openwrt-readonly': freeze({
      id:'openwrt-readonly', label:'OpenWrt / Linux AP read-only bridge', class:'router',
      scope: freeze(['wifi-radio-status','channel-frequency','noise-floor','station-rssi','station-rates','survey-telemetry','antenna-chain-rssi-conditional','interface-counters']),
      expectedPassiveChannels: freeze(['wifi','router']),
      activeMethods: freeze(['authorized-network-rtt','wifi-rtt-ranging']),
      limitations: freeze(['Per-chain telemetry depends on driver/chipset exposure.','The bridge is read-only: no channel, power, bandwidth, chain, reset, association, or interface-state writes.']),
      preferred: true
    }),
    'browser-context': freeze({
      id:'browser-context', label:'Browser context sensors', class:'browser',
      scope: freeze(['geolocation-conditional','device-orientation-conditional','device-motion-conditional','web-bluetooth-observation-conditional']),
      expectedPassiveChannels: freeze(['gnss','motion']),
      activeMethods: freeze([]),
      limitations: freeze(['Browsers do not expose general Wi-Fi or cellular RF scan telemetry.','Web Bluetooth support is browser/platform dependent.']),
      preferred: false
    }),
    'generic-receive-json': freeze({
      id:'generic-receive-json', label:'Generic receive-only JSON bridge', class:'external',
      scope: freeze(['normalized-observation-ingest']),
      expectedPassiveChannels: freeze([]),
      activeMethods: freeze(['authorized-network-rtt']),
      limitations: freeze(['The bridge must provide receive-side telemetry only; this laboratory rejects active/radio-mutation operations.']),
      preferred: false
    })
  });

  const FUTURE_GATED_RESEARCH = freeze([
    freeze({id:'attenuated-receiver-sweep',label:'Calibrated receiver attenuation sweep',status:'not-implemented',boundary:'Use documented receiver attenuation or external passive attenuators first; retain a known reference source and calibration chain.'}),
    freeze({id:'controlled-frequency-sweep',label:'Controlled attenuated frequency sweep',status:'not-implemented',boundary:'No universal safe frequency/power range is assumed. Future transmit experiments require an exact certified hardware/regulatory profile and must remain inside device-authorized bands, power and duty-cycle limits.'}),
    freeze({id:'hybrid-attenuation-correlation',label:'Hybrid attenuation / multi-receiver correlation',status:'not-implemented',boundary:'Future phase may correlate multiple receivers and documented transmitter states; it does not belong to the passive acquisition engine.'})
  ]);

  const REFINEMENT_STAGES = freeze([
    freeze({id:'capability-inventory',label:'0 · Capability inventory',goal:'Discover exactly which passive radio telemetry, sensors, rates, permissions and platform limits are available before collecting data.',exit:'Every requested channel is marked available, conditional, unavailable, or permission-blocked.'}),
    freeze({id:'hardware-baseline',label:'1 · Hardware baseline',goal:'Record battery/external-power state, thermal state, device orientation, time source and idle telemetry without movement.',exit:'No thermal stop condition; timestamps are monotonic; baseline age/freshness is characterized.'}),
    freeze({id:'passive-spectrum-census',label:'2 · Passive signal census',goal:'Inventory observed signal families, center frequencies, source counts, noise/SNR fields and platform update density without active probing.',exit:'Observed frequency/source bins are stable enough to define useful reference channels.'}),
    freeze({id:'stationary-repeatability',label:'3 · Stationary repeatability',goal:'Collect repeated passive samples at one fixed pose to measure RSSI/signal variance and platform update cadence.',exit:'Median, spread and stale-sample fraction are stable enough to distinguish noise from movement effects.'}),
    freeze({id:'receiver-health-baseline',label:'4 · Receiver / antenna health baseline',goal:'Capture a stable reference source and evaluate sensitivity, receive-chain balance, noise stability and repeatability.',exit:'A baseline contains enough same-source samples to support later degradation comparisons.'}),
    freeze({id:'orientation-sweep',label:'5 · Orientation sweep',goal:'Rotate the receiver/device through controlled orientations without moving its position.',exit:'Orientation-linked signal changes can be separated from positional or long-term receiver changes.'}),
    freeze({id:'spatial-traverse',label:'6 · Spatial traverse',goal:'Move the receiver along a measured route while recording local position, orientation and passive signal telemetry.',exit:'Path contains repeatable spatial anchors and no hardware safety guard was exceeded.'}),
    freeze({id:'cross-instrument',label:'7 · Cross-instrument comparison',goal:'Repeat selected points with a second device or router telemetry source to estimate device-specific offsets.',exit:'Per-device bias/variance is characterized instead of assuming RSSI values are interchangeable.'}),
    freeze({id:'active-ranging-map',label:'8 · Gated active ranging map',goal:'Use only standards-supported ranging or explicitly authorized endpoint RTT against capability-reported targets while passive receivers continue recording context.',exit:'Ranging observations identify their technology, target authorization, uncertainty and local pose; no arbitrary RF sweep or radio mutation occurs.'}),
    freeze({id:'model-correlation',label:'9 · Simulation correlation',goal:'Compare live measurements against the Signals Simulation Laboratory without forcing the simulation to fit unsupported detail.',exit:'Residuals, assumptions and unresolved structure are recorded; empirical data remains distinct from model output.'})
  ]);

  let panel = null;
  let activeSession = null;
  let hardwareBridge = null;
  let bridgeCapabilityReport = null;

  function ensureStyle() {
    if (!root?.document || root.document.getElementById(STYLE_ID)) return;
    const link = root.document.createElement('link');
    link.id = STYLE_ID; link.rel = 'stylesheet'; link.href = 'live-signals-laboratory.css?v=20260809-live-signals-active-ranging-3';
    root.document.head.appendChild(link);
  }

  function hardwareProfiles() { return freeze(Object.values(HARDWARE_PROFILES)); }
  function refinementStages() { return REFINEMENT_STAGES; }
  function futureGatedResearch() { return FUTURE_GATED_RESEARCH; }
  function activeScanMethods() { return freeze(Object.values(ACTIVE_SCAN_METHODS)); }

  function registerHardwareBridge(bridge) {
    if (!bridge || typeof bridge !== 'object') throw new Error('Hardware bridge must be an object.');
    hardwareBridge = bridge;
    const report = typeof bridge.getCapabilities === 'function' ? bridge.getCapabilities() : bridge.capabilities || null;
    if (report && typeof report.then !== 'function') bridgeCapabilityReport = freeze({...report});
    return hardwareBridgeStatus();
  }

  function unregisterHardwareBridge() { hardwareBridge = null; bridgeCapabilityReport = null; return hardwareBridgeStatus(); }

  function hardwareBridgeStatus() {
    return freeze({
      connected:Boolean(hardwareBridge),
      id:String(hardwareBridge?.id || bridgeCapabilityReport?.bridgeId || 'none'),
      capabilities:bridgeCapabilityReport ? freeze({...bridgeCapabilityReport}) : null
    });
  }

  async function refreshHardwareBridgeCapabilities() {
    if (!hardwareBridge) return hardwareBridgeStatus();
    const report = typeof hardwareBridge.getCapabilities === 'function' ? await hardwareBridge.getCapabilities() : hardwareBridge.capabilities || {};
    bridgeCapabilityReport = freeze({...report});
    return hardwareBridgeStatus();
  }

  function pseudonymize(value) {
    const text = String(value ?? '');
    let hash = 2166136261;
    for (let i=0;i<text.length;i+=1) { hash ^= text.charCodeAt(i); hash = Math.imul(hash, 16777619); }
    return `anon-${(hash>>>0).toString(16).padStart(8,'0')}`;
  }

  function assertReceiveOnlyOperation(operation) {
    const op = String(operation || '').toLowerCase();
    if (UNSAFE_RADIO_MUTATIONS.includes(op) || ACTIVE_SCAN_METHODS[op]) throw new Error(`Live Signals Laboratory blocks active/radio mutation operation in Passive Scan: ${op}`);
    return true;
  }

  function assertActiveScanOperation(operation) {
    const op = String(operation || '').toLowerCase();
    if (UNSAFE_RADIO_MUTATIONS.includes(op)) throw new Error(`Live Signals Laboratory blocks unsafe radio mutation operation: ${op}`);
    if (!ACTIVE_SCAN_METHODS[op]) throw new Error(`Active Scan method is not allowlisted: ${op}`);
    return true;
  }

  function safePollingConfiguration(input = {}, capability = {}) {
    const deviceSensorMax = finite(capability.maxSensorHz, MAX_SENSOR_HZ) > 0 ? finite(capability.maxSensorHz, MAX_SENSOR_HZ) : MAX_SENSOR_HZ;
    const wifiResultPollMs = Math.max(MIN_WIFI_RESULT_POLL_MS, finite(input.wifiResultPollMs ?? input.wifiScanIntervalMs, 10000));
    return freeze({
      sessionMinutes: clamp(finite(input.sessionMinutes, DEFAULT_SESSION_MINUTES), 1, MAX_SESSION_MINUTES),
      wifiResultPollMs,
      appRequestedWifiScan:false,
      bleObservePeriodMs: Math.max(MIN_BLE_OBSERVE_PERIOD_MS, finite(input.bleObservePeriodMs ?? input.bleScanPeriodMs, MIN_BLE_OBSERVE_PERIOD_MS)),
      bleObserveWindowMs: clamp(finite(input.bleObserveWindowMs ?? input.bleScanWindowMs, 5000), 1000, MAX_BLE_OBSERVE_WINDOW_MS),
      cellPollMs: Math.max(MIN_CELL_POLL_MS, finite(input.cellPollMs, 3000)),
      gnssPollMs: Math.max(MIN_GNSS_POLL_MS, finite(input.gnssPollMs, 1000)),
      routerPollMs: Math.max(MIN_ROUTER_POLL_MS, finite(input.routerPollMs, 3000)),
      sensorHz: clamp(finite(input.sensorHz, DEFAULT_SENSOR_HZ), 1, Math.min(MAX_SENSOR_HZ, deviceSensorMax)),
      privacyRedaction: input.privacyRedaction !== false,
      includeRawIdentifiers: input.includeRawIdentifiers === true && input.privacyRedaction === false
    });
  }

  function safetyPreflight(input = {}) {
    const thermal = String(input.thermalState || 'nominal').toLowerCase();
    const batteryPercent = clamp(finite(input.batteryPercent, 100), 0, 100);
    const externalPower = Boolean(input.externalPower);
    const stopThermal = SAFETY_POLICY.stopThermalStates.includes(thermal);
    const reduceThermal = SAFETY_POLICY.reduceThermalStates.includes(thermal);
    const lowBattery = !externalPower && batteryPercent < SAFETY_POLICY.minimumBatteryPercentWithoutExternalPower;
    const blockers = [];
    const warnings = [];
    if (stopThermal) blockers.push(`thermal state ${thermal} requires acquisition stop`);
    if (lowBattery) blockers.push(`battery ${batteryPercent.toFixed(0)}% is below passive-session floor without external power`);
    if (reduceThermal) warnings.push(`thermal state ${thermal} requires reduced sampling duty cycle`);
    if (input.transmitRequested || input.activeRangingRequested || input.appRequestedWifiScan) blockers.push('active probing was requested during Passive Scan preflight; use the separate Active Scan control.');
    return freeze({ pass:blockers.length===0, thermalState:thermal, batteryPercent, externalPower, reduceDutyCycle:reduceThermal, blockers:freeze(blockers), warnings:freeze(warnings) });
  }

  function capabilityMatrix(profileId = 'android-native', runtime = {}) {
    const profile = HARDWARE_PROFILES[profileId] || HARDWARE_PROFILES['generic-receive-json'];
    const rows = [];
    const add = (capability, status, source, note='') => rows.push(freeze({capability,status,source,note}));
    if (profile.id === 'android-native') {
      add('Wi-Fi system/cached scan results','available-with-permission','Android WifiManager','Passive phase consumes results/broadcasts produced by the system; the bridge must not call startScan().');
      add('Bluetooth LE advertisement observations','available-with-permission','Android BluetoothLeScanner','No advertising or GATT connection is requested by this laboratory.');
      add('Cellular serving/neighbour signal','available-with-permission','Android TelephonyManager','CellInfo and cached modem signal data; freshness varies.');
      add('GNSS/location','available-with-permission','Android location stack','Use accuracy and timestamp with every sample.');
      add('Motion/orientation/magnetic field','device-dependent','Android SensorManager','Inventory actual sensor list and max rates at runtime.');
      add('Pressure/light/proximity','device-dependent','Android SensorManager','Do not assume presence.');
      add('Wi-Fi RTT active ranging','active-scan-conditional','Android WifiRttManager / RangingManager','Separate Active Scan only; supported AP/peer and permissions required.');
      add('UWB / Bluetooth ranging','active-scan-conditional','Android RangingManager / UWB APIs','Separate Active Scan only; capability and participating peer required.');
    } else if (profile.id === 'ios-native') {
      add('Current Wi-Fi network','conditional','NetworkExtension NEHotspotNetwork','Entitlement and authorization conditions apply.');
      add('General Wi-Fi scan','unavailable-public-api','iOS public API boundary','Do not emulate or infer a scan list.');
      add('Bluetooth LE advertisement observations','available-with-permission','CoreBluetooth CBCentralManager','Observation only; no peripheral connection is required by the live lab.');
      add('Cellular signal strength','unavailable-public-api','iOS public API boundary','Do not fabricate modem RSSI/RSRP.');
      add('GNSS/location/heading','available-with-permission','Core Location','Accuracy, timestamp and authorization must be retained.');
      add('Motion/gyro/magnetometer','device-dependent','Core Motion','Check service availability before use.');
      add('Barometer','device-dependent','Core Motion / device hardware','Optional context channel.');
      add('Nearby UWB ranging','active-scan-conditional','Nearby Interaction / UWB hardware','Separate Active Scan only; participating paired peer and device support required.');
    } else if (profile.id === 'openwrt-readonly') {
      add('Radio channel/frequency/noise','bridge-dependent','OpenWrt/Linux read-only telemetry','Typical sources include iwinfo/iw/ubus observation output.');
      add('Station RSSI/rates','bridge-dependent','OpenWrt/Linux read-only telemetry','Observe only telemetry exposed by driver.');
      add('Per-chain antenna RSSI','driver-dependent','nl80211/driver telemetry','Only expose when chipset reports it; never synthesize missing chains.');
      add('Interface counters','available','router OS telemetry','Useful for context; not a direct RF power measurement.');
      add('Authorized endpoint / RTT ranging','active-scan-conditional','Bridge-declared capability','Only explicit owned/authorized targets; no subnet sweep or radio configuration mutation.');
      add('Radio configuration writes','blocked','Live Signals safety boundary','No channel/power/bandwidth/antenna/interface mutation path exists in the live lab.');
    } else if (profile.id === 'browser-context') {
      add('Geolocation', runtime.geolocation ? 'browser-available' : 'unavailable', 'Web Geolocation','Context only; not an RF sensor.');
      add('Device orientation', runtime.deviceOrientation ? 'browser-available' : 'unavailable', 'DeviceOrientation event','Permission/platform dependent.');
      add('Device motion', runtime.deviceMotion ? 'browser-available' : 'unavailable', 'DeviceMotion event','Permission/platform dependent.');
      add('Web Bluetooth observation', runtime.webBluetooth ? 'browser-available' : 'unavailable', 'Web Bluetooth','Browser support varies; not a general RF spectrum API.');
      add('Wi-Fi/cellular scan','unavailable-web-api','Browser security boundary','Requires native/router bridge.');
    } else {
      add('Normalized receive telemetry','available','JSON bridge contract','Bridge is responsible for hardware access and must remain passive/receive-only.');
    }
    return freeze({ profile, rows:freeze(rows) });
  }

  function browserCapabilities() {
    return freeze({
      geolocation: Boolean(root?.navigator?.geolocation),
      webBluetooth: Boolean(root?.navigator?.bluetooth),
      deviceOrientation: Boolean(root && 'DeviceOrientationEvent' in root),
      deviceMotion: Boolean(root && 'DeviceMotionEvent' in root),
      batteryApi: Boolean(root?.navigator?.getBattery)
    });
  }

  function normalizeObservation(raw = {}, context = {}) {
    const acquisitionMode = String(raw.acquisitionMode || context.acquisitionMode || 'passive').toLowerCase();
    if (raw.operation && raw.operation !== 'observe') {
      if (acquisitionMode === 'active') assertActiveScanOperation(raw.operation);
      else assertReceiveOnlyOperation(raw.operation);
    }
    const timestampMs = Number.isFinite(Number(raw.timestampMs)) ? Number(raw.timestampMs) : Date.now();
    const kind = String(raw.kind || raw.type || 'unknown').toLowerCase();
    const frequencyHz = Number.isFinite(Number(raw.frequencyHz)) ? Number(raw.frequencyHz) : null;
    const rssiDbm = Number.isFinite(Number(raw.rssiDbm ?? raw.levelDbm)) ? Number(raw.rssiDbm ?? raw.levelDbm) : null;
    const noiseDbm = Number.isFinite(Number(raw.noiseDbm)) ? Number(raw.noiseDbm) : null;
    const snrDb = Number.isFinite(Number(raw.snrDb)) ? Number(raw.snrDb) : (rssiDbm!==null && noiseDbm!==null ? rssiDbm-noiseDbm : null);
    const redact = context.privacyRedaction !== false;
    const sourceIdRaw = raw.sourceId ?? raw.bssid ?? raw.address ?? raw.cellId ?? raw.station ?? null;
    const sourceId = sourceIdRaw === null ? null : (redact ? pseudonymize(sourceIdRaw) : String(sourceIdRaw));
    const ssid = raw.ssid == null ? null : (redact ? '[redacted-ssid]' : String(raw.ssid));
    return freeze({
      timestampMs,
      ageMs: Math.max(0, finite(context.nowMs, Date.now()) - timestampMs),
      adapterId: String(raw.adapterId || context.adapterId || 'unknown-adapter'),
      deviceId: String(raw.deviceId || context.deviceId || 'local-device'),
      kind, sourceId, ssid, acquisitionMode,
      signal: freeze({
        frequencyHz, channel: raw.channel ?? null, bandwidthHz: Number.isFinite(Number(raw.bandwidthHz)) ? Number(raw.bandwidthHz) : null,
        rssiDbm, noiseDbm, snrDb,
        rsrpDbm: Number.isFinite(Number(raw.rsrpDbm)) ? Number(raw.rsrpDbm) : null,
        rsrqDb: Number.isFinite(Number(raw.rsrqDb)) ? Number(raw.rsrqDb) : null,
        sinrDb: Number.isFinite(Number(raw.sinrDb)) ? Number(raw.sinrDb) : null,
        txPowerReportedDbm: Number.isFinite(Number(raw.txPowerReportedDbm)) ? Number(raw.txPowerReportedDbm) : null,
        distanceM: Number.isFinite(Number(raw.distanceM)) ? Number(raw.distanceM) : null
      }),
      ranging: freeze({
        technology: raw.rangingTechnology == null ? null : String(raw.rangingTechnology),
        targetId: raw.targetId == null ? sourceId : (redact ? pseudonymize(raw.targetId) : String(raw.targetId)),
        distanceM: Number.isFinite(Number(raw.distanceM)) ? Number(raw.distanceM) : null,
        distanceStdDevM: Number.isFinite(Number(raw.distanceStdDevM)) ? Number(raw.distanceStdDevM) : null,
        azimuthDeg: Number.isFinite(Number(raw.azimuthDeg)) ? Number(raw.azimuthDeg) : null,
        elevationDeg: Number.isFinite(Number(raw.elevationDeg)) ? Number(raw.elevationDeg) : null,
        roundTripTimeNs: Number.isFinite(Number(raw.roundTripTimeNs)) ? Number(raw.roundTripTimeNs) : null,
        latencyMs: Number.isFinite(Number(raw.latencyMs)) ? Number(raw.latencyMs) : null,
        targetLocalX: Number.isFinite(Number(raw.targetLocalX)) ? Number(raw.targetLocalX) : null,
        targetLocalY: Number.isFinite(Number(raw.targetLocalY)) ? Number(raw.targetLocalY) : null,
        targetLocalZ: Number.isFinite(Number(raw.targetLocalZ)) ? Number(raw.targetLocalZ) : null,
        authorized: raw.authorized === true
      }),
      position: freeze({
        localX: Number.isFinite(Number(raw.localX)) ? Number(raw.localX) : null,
        localY: Number.isFinite(Number(raw.localY)) ? Number(raw.localY) : null,
        localZ: Number.isFinite(Number(raw.localZ)) ? Number(raw.localZ) : null,
        latitude: redact ? null : (Number.isFinite(Number(raw.latitude)) ? Number(raw.latitude) : null),
        longitude: redact ? null : (Number.isFinite(Number(raw.longitude)) ? Number(raw.longitude) : null),
        accuracyM: Number.isFinite(Number(raw.accuracyM)) ? Number(raw.accuracyM) : null
      }),
      orientation: freeze({
        headingDeg: Number.isFinite(Number(raw.headingDeg)) ? Number(raw.headingDeg) : null,
        pitchDeg: Number.isFinite(Number(raw.pitchDeg)) ? Number(raw.pitchDeg) : null,
        rollDeg: Number.isFinite(Number(raw.rollDeg)) ? Number(raw.rollDeg) : null
      }),
      auxiliary: freeze({
        magneticUt: Array.isArray(raw.magneticUt) ? freeze(raw.magneticUt.slice(0,3).map(Number).filter(Number.isFinite)) : null,
        pressureHpa: Number.isFinite(Number(raw.pressureHpa)) ? Number(raw.pressureHpa) : null,
        lightLux: Number.isFinite(Number(raw.lightLux)) ? Number(raw.lightLux) : null,
        accelerationMs2: Array.isArray(raw.accelerationMs2) ? freeze(raw.accelerationMs2.slice(0,3).map(Number).filter(Number.isFinite)) : null,
        rotationRadS: Array.isArray(raw.rotationRadS) ? freeze(raw.rotationRadS.slice(0,3).map(Number).filter(Number.isFinite)) : null,
        chainRssiDbm: Array.isArray(raw.chainRssiDbm) ? freeze(raw.chainRssiDbm.map(Number).filter(Number.isFinite)) : null
      }),
      provenance: String(raw.provenance || 'reported-by-platform'),
      quality: freeze({
        stale: Boolean(raw.stale), throttled: Boolean(raw.throttled),
        accuracy: raw.accuracy ?? null, permissionState: raw.permissionState ?? null,
        thermalState: raw.thermalState ?? null, batteryPercent: Number.isFinite(Number(raw.batteryPercent)) ? Number(raw.batteryPercent) : null
      }),
      note: raw.note == null ? '' : String(raw.note)
    });
  }

  function signalValue(observation) {
    for (const value of [observation?.signal?.rssiDbm, observation?.signal?.rsrpDbm, observation?.signal?.snrDb]) if (Number.isFinite(value)) return value;
    return null;
  }

  function median(values) {
    const clean = values.filter(Number.isFinite).sort((a,b)=>a-b);
    if (!clean.length) return null;
    const mid = Math.floor(clean.length/2);
    return clean.length%2 ? clean[mid] : (clean[mid-1]+clean[mid])/2;
  }

  function percentile(values, p) {
    const clean = values.filter(Number.isFinite).sort((a,b)=>a-b);
    if (!clean.length) return null;
    const index = (clean.length-1)*clamp(p,0,1), lo=Math.floor(index), hi=Math.ceil(index);
    return lo===hi ? clean[lo] : clean[lo]+(clean[hi]-clean[lo])*(index-lo);
  }

  function iqr(values) {
    const q1 = percentile(values,.25), q3 = percentile(values,.75);
    return q1===null || q3===null ? null : q3-q1;
  }

  function standardDeviation(values) {
    const clean = values.filter(Number.isFinite);
    if (clean.length < 2) return null;
    const mean = clean.reduce((sum,v)=>sum+v,0)/clean.length;
    return Math.sqrt(clean.reduce((sum,v)=>sum+(v-mean)**2,0)/(clean.length-1));
  }

  function frequencyBin(frequencyHz, binHz = FREQUENCY_BIN_HZ) {
    if (!Number.isFinite(frequencyHz)) return null;
    return Math.round(frequencyHz / binHz) * binHz;
  }

  function observationReferenceKey(observation) {
    const bin = frequencyBin(observation?.signal?.frequencyHz);
    return [observation?.deviceId||'device', observation?.kind||'unknown', observation?.sourceId||'unknown-source', bin??'unknown-frequency'].join('|');
  }

  function passiveFrequencyInventory(session, options = {}) {
    const observations = session?.observations || [];
    const binHz = Math.max(1e3, finite(options.binHz, FREQUENCY_BIN_HZ));
    const groups = new Map();
    for (const row of observations) {
      const bin = frequencyBin(row.signal.frequencyHz, binHz);
      const key = `${row.kind}|${bin ?? 'unknown'}`;
      if (!groups.has(key)) groups.set(key, {kind:row.kind, frequencyHz:bin, rows:[], sources:new Set()});
      const group = groups.get(key); group.rows.push(row); if (row.sourceId) group.sources.add(row.sourceId);
    }
    const bins = [...groups.values()].map(group => {
      const signals = group.rows.map(signalValue).filter(Number.isFinite);
      const noises = group.rows.map(row=>row.signal.noiseDbm).filter(Number.isFinite);
      const snrs = group.rows.map(row=>row.signal.snrDb).filter(Number.isFinite);
      return freeze({
        kind:group.kind, frequencyHz:group.frequencyHz, observations:group.rows.length, uniqueSources:group.sources.size,
        medianSignal:median(signals), signalIqrDb:iqr(signals), medianNoiseDbm:median(noises), medianSnrDb:median(snrs),
        firstTimestampMs:Math.min(...group.rows.map(row=>row.timestampMs)), lastTimestampMs:Math.max(...group.rows.map(row=>row.timestampMs))
      });
    }).sort((a,b)=>(a.frequencyHz??Infinity)-(b.frequencyHz??Infinity)||a.kind.localeCompare(b.kind));
    return freeze({
      binHz, bins:freeze(bins), totalObservations:observations.length,
      signalBearingObservations:observations.filter(row=>Number.isFinite(signalValue(row))).length,
      uniqueSources:new Set(observations.map(row=>row.sourceId).filter(Boolean)).size,
      kinds:freeze([...new Set(observations.map(row=>row.kind))].sort())
    });
  }

  function chooseReferenceSeries(session, options = {}) {
    const afterTimestampMs = Number.isFinite(Number(options.afterTimestampMs)) ? Number(options.afterTimestampMs) : null;
    const rows = (session?.observations || []).filter(row=>Number.isFinite(signalValue(row)) && (afterTimestampMs===null || row.timestampMs>afterTimestampMs));
    const requestedKey = options.referenceKey || null;
    const groups = new Map();
    for (const row of rows) {
      const key = observationReferenceKey(row);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(row);
    }
    let key = requestedKey;
    if (!key || !groups.has(key)) key = [...groups.entries()].sort((a,b)=>b[1].length-a[1].length)[0]?.[0] || null;
    return freeze({ key, rows:freeze(key ? [...(groups.get(key)||[])] : []) });
  }

  function chainSpreadDb(observation) {
    const values = observation?.auxiliary?.chainRssiDbm || [];
    return values.length >= 2 ? Math.max(...values)-Math.min(...values) : null;
  }

  function receiverHealthSnapshot(session, options = {}) {
    const thresholds = {...RECEIVER_HEALTH_THRESHOLDS,...(options.thresholds||{})};
    const selected = chooseReferenceSeries(session, options);
    const rows = selected.rows;
    const signals = rows.map(signalValue).filter(Number.isFinite);
    const noises = rows.map(row=>row.signal.noiseDbm).filter(Number.isFinite);
    const snrs = rows.map(row=>row.signal.snrDb).filter(Number.isFinite);
    const chainSpreads = rows.map(chainSpreadDb).filter(Number.isFinite);
    const staleFraction = rows.length ? rows.filter(row=>row.quality.stale).length/rows.length : 0;
    return freeze({
      format:'hb-ttrpg-live-signals-receiver-health-snapshot', schemaVersion:VERSION,
      referenceKey:selected.key, sampleCount:rows.length,
      medianSignal:median(signals), signalIqrDb:iqr(signals), signalStdDevDb:standardDeviation(signals),
      medianNoiseDbm:median(noises), noiseIqrDb:iqr(noises), medianSnrDb:median(snrs),
      medianChainImbalanceDb:median(chainSpreads), chainSamples:chainSpreads.length,
      staleFraction,
      firstTimestampMs:rows.length?Math.min(...rows.map(row=>row.timestampMs)):null,
      lastTimestampMs:rows.length?Math.max(...rows.map(row=>row.timestampMs)):null,
      thresholds:freeze({...thresholds})
    });
  }

  function captureReceiverBaseline(session, options = {}) {
    const snapshot = receiverHealthSnapshot(session, options);
    if (snapshot.sampleCount < snapshot.thresholds.minimumReferenceSamples) throw new Error(`Receiver baseline needs at least ${snapshot.thresholds.minimumReferenceSamples} same-source samples; found ${snapshot.sampleCount}.`);
    const baseline = freeze({
      format:'hb-ttrpg-live-signals-receiver-baseline', schemaVersion:VERSION, capturedAt:new Date().toISOString(),
      profileId:session.profileId, referenceKey:snapshot.referenceKey, captureTimestampMs:snapshot.lastTimestampMs ?? Date.now(), snapshot,
      boundary:'Baseline is only comparable when source, geometry, orientation and device configuration are materially equivalent.'
    });
    session.receiverBaseline = baseline;
    return baseline;
  }

  function receiverHealthDiagnostic(session, options = {}) {
    const baseline = options.baseline || session?.receiverBaseline || null;
    const referenceKey = options.referenceKey || baseline?.referenceKey || null;
    const afterTimestampMs = baseline && options.includeBaselineSamples !== true ? baseline.captureTimestampMs : options.afterTimestampMs;
    const current = receiverHealthSnapshot(session, {...options,referenceKey,afterTimestampMs});
    const t = current.thresholds;
    const flags = [];
    const addFlag=(id,severity,detail,confounders=[])=>flags.push(freeze({id,severity,detail,confounders:freeze(confounders)}));
    if (current.sampleCount < t.minimumReferenceSamples) {
      return freeze({state:'insufficient-data',confidenceFraction:clamp(current.sampleCount/t.minimumReferenceSamples,0,1),current,baseline,flags:freeze([]),antennaDegradationEvidenceCount:0,cleanlinessState:'unresolved',boundary:'Not enough repeated same-source observations to distinguish receiver degradation from ordinary field variation.'});
    }
    if (Number.isFinite(current.medianChainImbalanceDb)) {
      if (current.medianChainImbalanceDb >= t.chainImbalanceSuspectDb) addFlag('chain-imbalance','suspect',`Median per-chain RSSI spread ${current.medianChainImbalanceDb.toFixed(2)} dB exceeds suspect threshold.`,['MIMO spatial fading','antenna orientation','driver chain reporting differences']);
      else if (current.medianChainImbalanceDb >= t.chainImbalanceWatchDb) addFlag('chain-imbalance','watch',`Median per-chain RSSI spread ${current.medianChainImbalanceDb.toFixed(2)} dB is elevated.`,['MIMO spatial fading','antenna orientation']);
    }
    if (Number.isFinite(current.signalIqrDb)) {
      if (current.signalIqrDb >= t.signalIqrSuspectDb) addFlag('repeatability','suspect',`Same-source signal IQR ${current.signalIqrDb.toFixed(2)} dB is unstable.`,['moving source','multipath motion','scheduler/scan cadence']);
      else if (current.signalIqrDb >= t.signalIqrWatchDb) addFlag('repeatability','watch',`Same-source signal IQR ${current.signalIqrDb.toFixed(2)} dB is elevated.`,['multipath motion','source power variability']);
    }
    if (Number.isFinite(current.noiseIqrDb)) {
      if (current.noiseIqrDb >= t.noiseIqrSuspectDb) addFlag('noise-instability','suspect',`Noise-floor IQR ${current.noiseIqrDb.toFixed(2)} dB is unstable.`,['real interference','AGC changes','driver noise reporting']);
      else if (current.noiseIqrDb >= t.noiseIqrWatchDb) addFlag('noise-instability','watch',`Noise-floor IQR ${current.noiseIqrDb.toFixed(2)} dB is elevated.`,['real interference','AGC changes']);
    }
    if (current.staleFraction >= t.staleFractionSuspect) addFlag('telemetry-staleness','suspect',`${(current.staleFraction*100).toFixed(1)}% of reference samples are stale.`,['platform caching','power saving']);
    else if (current.staleFraction >= t.staleFractionWatch) addFlag('telemetry-staleness','watch',`${(current.staleFraction*100).toFixed(1)}% of reference samples are stale.`,['platform caching','power saving']);

    let sensitivityLossDb = null, noiseRiseDb = null;
    if (baseline?.snapshot && baseline.referenceKey === current.referenceKey) {
      if (Number.isFinite(baseline.snapshot.medianSignal) && Number.isFinite(current.medianSignal)) {
        sensitivityLossDb = baseline.snapshot.medianSignal-current.medianSignal;
        if (sensitivityLossDb >= t.baselineLossSuspectDb) addFlag('baseline-sensitivity-loss','suspect',`Reference signal is ${sensitivityLossDb.toFixed(2)} dB weaker than captured baseline.`,['changed source power','changed path/position','case/body orientation','firmware calibration']);
        else if (sensitivityLossDb >= t.baselineLossWatchDb) addFlag('baseline-sensitivity-loss','watch',`Reference signal is ${sensitivityLossDb.toFixed(2)} dB weaker than captured baseline.`,['changed source power','changed path/position','orientation']);
      }
      if (Number.isFinite(baseline.snapshot.medianNoiseDbm) && Number.isFinite(current.medianNoiseDbm)) {
        noiseRiseDb = current.medianNoiseDbm-baseline.snapshot.medianNoiseDbm;
        if (noiseRiseDb >= t.baselineNoiseRiseSuspectDb) addFlag('baseline-noise-rise','suspect',`Reported noise floor is ${noiseRiseDb.toFixed(2)} dB higher than baseline.`,['environmental interference','AGC/reporting changes']);
        else if (noiseRiseDb >= t.baselineNoiseRiseWatchDb) addFlag('baseline-noise-rise','watch',`Reported noise floor is ${noiseRiseDb.toFixed(2)} dB higher than baseline.`,['environmental interference']);
      }
    }

    const suspect = flags.filter(flag=>flag.severity==='suspect');
    const watch = flags.filter(flag=>flag.severity==='watch');
    const antennaIndicators = flags.filter(flag=>['chain-imbalance','baseline-sensitivity-loss','repeatability'].includes(flag.id));
    const cleanlinessIndicators = flags.filter(flag=>['noise-instability','baseline-noise-rise','telemetry-staleness'].includes(flag.id));
    const confidenceFraction = clamp(current.sampleCount/t.preferredReferenceSamples,0,1) * (1-clamp(current.staleFraction,0,.75));
    return freeze({
      state:suspect.length?'degradation-suspect':watch.length?'watch':'clean-reference',
      confidenceFraction,current,baseline,sensitivityLossDb,noiseRiseDb,flags:freeze(flags),
      antennaDegradationEvidenceCount:antennaIndicators.length,
      cleanlinessState:cleanlinessIndicators.some(flag=>flag.severity==='suspect')?'degraded-suspect':cleanlinessIndicators.length?'watch':'clean-reference',
      boundary:'This is a passive receiver/antenna-path screening diagnostic, not a hardware-failure diagnosis. Persistent results should be repeated with fixed geometry/orientation and a second receiver or known reference source.'
    });
  }

  function channelIdForObservation(observation) {
    const kind = String(observation?.kind || '').toLowerCase();
    for (const channel of Object.values(CHANNEL_CATALOG)) if (channel.kinds.includes(kind)) return channel.id;
    if (observation?.acquisitionMode === 'active' && Number.isFinite(observation?.ranging?.distanceM)) return 'ranging';
    return 'unknown';
  }

  function expectedPassiveChannels(profileId) {
    return freeze([...(HARDWARE_PROFILES[profileId]?.expectedPassiveChannels || [])]);
  }

  function channelCoverage(session, capabilityReport = bridgeCapabilityReport) {
    const profileId = session?.profileId || 'android-native';
    const expected = new Set(expectedPassiveChannels(profileId));
    const reportedAvailable = new Set((capabilityReport?.passiveChannels || []).map(String));
    const reportedUnavailable = new Set((capabilityReport?.unavailableChannels || []).map(String));
    const counts = new Map();
    for (const row of session?.observations || []) {
      const id = channelIdForObservation(row);
      counts.set(id, (counts.get(id) || 0) + 1);
    }
    const ids = new Set([...expected, ...reportedAvailable, ...reportedUnavailable, ...counts.keys()]);
    ids.delete('unknown');
    return freeze([...ids].map(id => {
      const samples = counts.get(id) || 0;
      let status = samples > 0 ? 'observing' : reportedUnavailable.has(id) ? 'unavailable' : reportedAvailable.has(id) ? 'bridge-available-no-samples' : expected.has(id) ? 'expected-no-samples' : 'optional-no-samples';
      return freeze({id,label:CHANNEL_CATALOG[id]?.label || id,status,samples,expected:expected.has(id),bridgeAvailable:reportedAvailable.has(id)});
    }).sort((a,b)=>Number(b.expected)-Number(a.expected)||a.label.localeCompare(b.label)));
  }

  function normalizeActiveCapabilityReport(report = {}) {
    const methods = [...new Set((report.activeMethods || []).map(String).filter(id=>ACTIVE_SCAN_METHODS[id]))];
    const targets = (report.authorizedTargets || []).map(target=>freeze({
      id:String(target.id || target.targetId || ''),
      label:String(target.label || target.id || target.targetId || 'target'),
      authorized:target.authorized === true,
      methods:freeze((target.methods || methods).map(String).filter(id=>methods.includes(id)))
    })).filter(target=>target.id);
    return freeze({bridgeId:String(report.bridgeId || report.id || 'unknown-bridge'),passiveChannels:freeze([...(report.passiveChannels||[]).map(String)]),activeMethods:freeze(methods),authorizedTargets:freeze(targets)});
  }

  function activeScanPreflight(input = {}, capabilityReport = bridgeCapabilityReport || {}) {
    const base = safetyPreflight({thermalState:input.thermalState,batteryPercent:input.batteryPercent,externalPower:input.externalPower});
    const normalized = normalizeActiveCapabilityReport(capabilityReport);
    const method = String(input.method || normalized.activeMethods[0] || '');
    const blockers = [...base.blockers];
    const warnings = [...base.warnings];
    if (!ACTIVE_SCAN_METHODS[method]) blockers.push('no supported allowlisted Active Scan method is selected');
    if (method && !normalized.activeMethods.includes(method)) blockers.push(`connected bridge does not report Active Scan capability ${method}`);
    if (input.targetsAuthorized !== true) blockers.push('Active Scan requires explicit owned/authorized target confirmation');
    if (!normalized.authorizedTargets.some(target=>target.authorized && target.methods.includes(method))) blockers.push('bridge reports no authorized participating target for the selected method');
    if (base.reduceDutyCycle) warnings.push('thermal state requests minimum active sample count and maximum interval');
    return freeze({pass:blockers.length===0,method,capabilities:normalized,blockers:freeze(blockers),warnings:freeze(warnings),thermalState:base.thermalState,batteryPercent:base.batteryPercent,externalPower:base.externalPower});
  }

  function buildActiveScanPlan(input = {}, capabilityReport = bridgeCapabilityReport || {}) {
    const preflight = activeScanPreflight(input, capabilityReport);
    if (!preflight.pass) throw new Error(`Active Scan preflight blocked: ${preflight.blockers.join('; ')}`);
    assertActiveScanOperation(preflight.method);
    const authorized = preflight.capabilities.authorizedTargets.filter(target=>target.authorized && target.methods.includes(preflight.method));
    const requestedIds = new Set((input.targetIds || []).map(String).filter(Boolean));
    const targets = authorized.filter(target=>!requestedIds.size || requestedIds.has(target.id)).slice(0, MAX_ACTIVE_TARGETS);
    if (!targets.length) throw new Error('No authorized targets remain after Active Scan target selection.');
    const samplesPerTarget = clamp(Math.floor(finite(input.samplesPerTarget, 3)),1,MAX_ACTIVE_SAMPLES_PER_TARGET);
    const sampleIntervalMs = Math.max(MIN_ACTIVE_SAMPLE_INTERVAL_MS, finite(input.sampleIntervalMs, 1000));
    const maximumSamplesByTime = Math.max(1, Math.floor(MAX_ACTIVE_BURST_SECONDS * 1000 / (targets.length * sampleIntervalMs)));
    const clampedSamples = Math.min(samplesPerTarget, maximumSamplesByTime);
    return freeze({
      format:'hb-ttrpg-live-signals-active-scan-plan',schemaVersion:VERSION,method:preflight.method,
      measurement:ACTIVE_SCAN_METHODS[preflight.method].measurement,
      targets:freeze(targets),samplesPerTarget:clampedSamples,sampleIntervalMs,
      maximumBurstSeconds:MAX_ACTIVE_BURST_SECONDS,authorizedTargetsOnly:true,
      estimatedBurstSeconds:targets.length*clampedSamples*sampleIntervalMs/1000,
      arbitraryFrequencySelection:false,transmitterPowerMutation:false,channelMutation:false
    });
  }

  async function runActiveScan(session, input = {}, bridge = hardwareBridge) {
    if (!session || session.endedAt) throw new Error('Start a live session before running Active Scan.');
    if (!bridge || typeof bridge.runActiveScan !== 'function') throw new Error('No native/router hardware bridge with runActiveScan() is connected.');
    if (!bridgeCapabilityReport) await refreshHardwareBridgeCapabilities();
    const plan = buildActiveScanPlan(input, bridgeCapabilityReport || {});
    const startedAt = new Date().toISOString();
    const results = await bridge.runActiveScan(plan);
    const rows = Array.isArray(results) ? results : Array.isArray(results?.observations) ? results.observations : [];
    const accepted = [];
    for (const raw of rows) {
      const targetId = String(raw.targetId || raw.sourceId || '');
      const target = plan.targets.find(item=>item.id===targetId);
      if (!target) continue;
      const observation = appendObservation(session,{...raw,kind:raw.kind||'ranging',acquisitionMode:'active',operation:plan.method,authorized:true,rangingTechnology:raw.rangingTechnology||plan.method},{acquisitionMode:'active'});
      accepted.push(observation);
    }
    const record = freeze({startedAt,endedAt:new Date().toISOString(),plan,resultCount:accepted.length});
    session.activeBursts.push(record);
    return freeze({record,observations:freeze(accepted)});
  }

  function activeRangeSummary(session) {
    const rows=(session?.observations||[]).filter(row=>row.acquisitionMode==='active' && Number.isFinite(row.ranging?.distanceM));
    const technologies={};
    for(const row of rows){const key=row.ranging.technology||'unknown';if(!technologies[key])technologies[key]=[];technologies[key].push(row.ranging.distanceM);}
    const byTechnology={};
    for(const [key,values] of Object.entries(technologies)) byTechnology[key]=freeze({samples:values.length,medianDistanceM:median(values),minimumDistanceM:Math.min(...values),maximumDistanceM:Math.max(...values)});
    return freeze({sampleCount:rows.length,burstCount:session?.activeBursts?.length||0,byTechnology:freeze(byTechnology),positionedRangeSamples:rows.filter(row=>Number.isFinite(row.position.localX)&&Number.isFinite(row.position.localY)).length});
  }

  function createSession(options = {}) {
    const profileId = HARDWARE_PROFILES[options.profileId] ? options.profileId : 'generic-receive-json';
    const polling = safePollingConfiguration(options.polling || {}, options.capability || {});
    const preflight = safetyPreflight(options.hardwareState || {});
    if (!preflight.pass) throw new Error(`Live session preflight blocked: ${preflight.blockers.join('; ')}`);
    return {
      format:'hb-ttrpg-live-signals-session', schemaVersion:VERSION, evidenceClass:'empirical-platform-telemetry', mode:CURRENT_MODE,
      sessionId:`lsl-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`,
      startedAt:new Date().toISOString(), endedAt:null, profileId, receiveOnly:true,
      polling, preflight, observations:[], activeBursts:[], notes:[], refinementStage:'capability-inventory', receiverBaseline:null,
      privacy:freeze({redaction:polling.privacyRedaction,rawIdentifiersIncluded:polling.includeRawIdentifiers})
    };
  }

  function appendObservation(session, raw, context = {}) {
    if (!session || session.endedAt) throw new Error('No active live session.');
    const acquisitionMode = String(raw.acquisitionMode || context.acquisitionMode || 'passive').toLowerCase();
    if (raw.operation && raw.operation !== 'observe') {
      if (acquisitionMode === 'active') assertActiveScanOperation(raw.operation);
      else assertReceiveOnlyOperation(raw.operation);
    }
    const observation = normalizeObservation(raw, { ...context, acquisitionMode, privacyRedaction:session.polling.privacyRedaction, adapterId:raw.adapterId || session.profileId });
    const preflight = safetyPreflight({
      thermalState: observation.quality.thermalState || session.preflight.thermalState,
      batteryPercent: observation.quality.batteryPercent ?? session.preflight.batteryPercent,
      externalPower: session.preflight.externalPower
    });
    if (!preflight.pass) throw new Error(`Acquisition stopped by hardware guard: ${preflight.blockers.join('; ')}`);
    session.observations.push(observation);
    if (session.observations.length > MAX_OBSERVATIONS) session.observations.splice(0, session.observations.length - MAX_OBSERVATIONS);
    return observation;
  }

  function summarizeSession(session) {
    const observations = session?.observations || [];
    const values = observations.map(signalValue).filter(Number.isFinite);
    const kinds = {};
    for (const observation of observations) kinds[observation.kind]=(kinds[observation.kind]||0)+1;
    const staleCount = observations.filter(row=>row.quality.stale).length;
    const throttledCount = observations.filter(row=>row.quality.throttled).length;
    const inventory = passiveFrequencyInventory(session);
    const coverage = channelCoverage(session);
    const activeRanges = activeRangeSummary(session);
    return freeze({
      observationCount:observations.length, kinds:freeze({...kinds}),
      medianSignal:median(values), q1Signal:percentile(values,.25), q3Signal:percentile(values,.75),
      minimumSignal:values.length?Math.min(...values):null, maximumSignal:values.length?Math.max(...values):null,
      staleFraction:observations.length?staleCount/observations.length:0,
      throttledFraction:observations.length?throttledCount/observations.length:0,
      spatialSamples:observations.filter(row=>Number.isFinite(row.position.localX)&&Number.isFinite(row.position.localY)).length,
      chainTelemetrySamples:observations.filter(row=>row.auxiliary.chainRssiDbm?.length).length,
      passiveFrequencyBins:inventory.bins.length, uniqueSources:inventory.uniqueSources,
      expectedChannels:coverage.filter(row=>row.expected).length, observingChannels:coverage.filter(row=>row.status==='observing').length,
      activeRangeSamples:activeRanges.sampleCount, activeBurstCount:activeRanges.burstCount
    });
  }

  function buildRefinementPlan(session) {
    const summary = summarizeSession(session);
    const inventory = passiveFrequencyInventory(session);
    const health = receiverHealthDiagnostic(session);
    const stages = REFINEMENT_STAGES.map(stage => {
      let status = 'pending';
      if (stage.id==='capability-inventory') status='ready';
      if (stage.id==='hardware-baseline' && summary.observationCount>=5) status='ready';
      if (stage.id==='passive-spectrum-census' && inventory.bins.length>=2) status='ready';
      if (stage.id==='stationary-repeatability' && summary.observationCount>=20) status='ready';
      if (stage.id==='receiver-health-baseline' && health.current.sampleCount>=RECEIVER_HEALTH_THRESHOLDS.minimumReferenceSamples) status=session.receiverBaseline?'complete':'ready';
      if (stage.id==='orientation-sweep' && session.observations.some(row=>Number.isFinite(row.orientation.headingDeg))) status='ready';
      if (stage.id==='spatial-traverse' && summary.spatialSamples>=10) status='ready';
      if (stage.id==='cross-instrument' && new Set(session.observations.map(row=>row.deviceId)).size>=2) status='ready';
      if (stage.id==='active-ranging-map' && activeRangeSummary(session).sampleCount>=3) status='ready';
      if (stage.id==='model-correlation' && summary.spatialSamples>=20) status='ready';
      return freeze({...stage,status});
    });
    return freeze(stages);
  }

  function serializeSession(session) {
    return JSON.stringify({
      ...session,
      summary:summarizeSession(session),
      passiveInventory:passiveFrequencyInventory(session),
      receiverHealth:receiverHealthDiagnostic(session),
      channelCoverage:channelCoverage(session),
      activeRanges:activeRangeSummary(session),
      refinementPlan:buildRefinementPlan(session),
      futureGatedResearch:FUTURE_GATED_RESEARCH
    }, null, 2);
  }

  function runtimeState() {
    return freeze({
      version:VERSION, verifiedAt:VERIFIED_AT, mode:CURRENT_MODE, browser:browserCapabilities(),
      safety:SAFETY_POLICY, activeScan:ACTIVE_SCAN_POLICY, bridge:hardwareBridgeStatus(), activeSession:Boolean(activeSession),
      activeSummary:activeSession?summarizeSession(activeSession):null,
      receiverHealth:activeSession?receiverHealthDiagnostic(activeSession):null
    });
  }

  function fitCanvas(canvas) {
    const rect=canvas.getBoundingClientRect(),dpr=root.devicePixelRatio||1,w=Math.max(320,Math.floor(rect.width*dpr)),h=Math.max(220,Math.floor(rect.height*dpr));
    if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;} return {w,h,dpr};
  }

  function drawTimeSeries() {
    const canvas=panel?.querySelector('#lsl-timeseries'); if(!canvas)return;
    const {w,h,dpr}=fitCanvas(canvas),ctx=canvas.getContext('2d'),rows=activeSession?.observations||[];
    ctx.clearRect(0,0,w,h);ctx.fillStyle='#081016';ctx.fillRect(0,0,w,h);ctx.font=`${11*dpr}px sans-serif`;
    ctx.strokeStyle='rgba(160,185,200,.15)';for(let i=1;i<6;i+=1){const y=i*h/6;ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke();}
    const data=rows.map((row,index)=>({index,value:signalValue(row)})).filter(row=>Number.isFinite(row.value)).slice(-600);
    if(data.length<2){ctx.fillStyle='#9eabb5';ctx.fillText('Waiting for signal-bearing passive observations…',12*dpr,22*dpr);return;}
    const min=Math.min(...data.map(row=>row.value)),max=Math.max(...data.map(row=>row.value)),span=Math.max(1,max-min);
    ctx.strokeStyle='#72d5ff';ctx.lineWidth=2*dpr;ctx.beginPath();data.forEach((row,i)=>{const x=10*dpr+i/(data.length-1)*(w-20*dpr),y=h-15*dpr-(row.value-min)/span*(h-35*dpr);if(!i)ctx.moveTo(x,y);else ctx.lineTo(x,y);});ctx.stroke();
    ctx.fillStyle='#dfe8ee';ctx.fillText(`Passive signal history · ${min.toFixed(1)} to ${max.toFixed(1)} dB-scale values`,12*dpr,18*dpr);
  }

  function drawSpatial() {
    const canvas=panel?.querySelector('#lsl-spatial'); if(!canvas)return;
    const {w,h,dpr}=fitCanvas(canvas),ctx=canvas.getContext('2d'),rows=(activeSession?.observations||[]).filter(row=>Number.isFinite(row.position.localX)&&Number.isFinite(row.position.localY)&&Number.isFinite(signalValue(row)));
    ctx.clearRect(0,0,w,h);ctx.fillStyle='#081016';ctx.fillRect(0,0,w,h);ctx.font=`${11*dpr}px sans-serif`;
    if(!rows.length){ctx.fillStyle='#9eabb5';ctx.fillText('Add localX/localY to passive observations to build a live spatial trace.',12*dpr,22*dpr);return;}
    const xs=rows.map(r=>r.position.localX),ys=rows.map(r=>r.position.localY),vs=rows.map(signalValue),xmin=Math.min(...xs),xmax=Math.max(...xs),ymin=Math.min(...ys),ymax=Math.max(...ys),vmin=Math.min(...vs),vmax=Math.max(...vs),xspan=Math.max(.01,xmax-xmin),yspan=Math.max(.01,ymax-ymin),vspan=Math.max(1,vmax-vmin);
    for(const row of rows.slice(-1000)){const x=20*dpr+(row.position.localX-xmin)/xspan*(w-40*dpr),y=h-20*dpr-(row.position.localY-ymin)/yspan*(h-40*dpr),t=(signalValue(row)-vmin)/vspan;ctx.fillStyle=`hsl(${240-240*t} 85% ${45+12*t}%)`;ctx.beginPath();ctx.arc(x,y,3*dpr,0,Math.PI*2);ctx.fill();}
    ctx.fillStyle='#dfe8ee';ctx.fillText(`Local passive spatial trace · ${rows.length} positioned samples`,12*dpr,18*dpr);
  }

  function profileOptions() { return hardwareProfiles().map(profile=>`<option value="${profile.id}"${profile.id==='android-native'?' selected':''}>${esc(profile.label)}</option>`).join(''); }

  function renderCapabilityMatrix() {
    if(!panel)return;
    const profileId=panel.querySelector('#lsl-profile')?.value||'android-native',matrix=capabilityMatrix(profileId,browserCapabilities()),target=panel.querySelector('[data-lsl-capabilities]');
    target.innerHTML=`<div class="lsl-profile-note"><strong>${esc(matrix.profile.label)}</strong><span>${esc(matrix.profile.class)} · passive capability assumptions verified ${VERIFIED_AT}</span></div><div class="lsl-table"><table><thead><tr><th>Capability</th><th>Status</th><th>Source/API</th><th>Boundary</th></tr></thead><tbody>${matrix.rows.map(row=>`<tr><td>${esc(row.capability)}</td><td><span class="lsl-badge" data-status="${esc(row.status)}">${esc(row.status)}</span></td><td>${esc(row.source)}</td><td>${esc(row.note)}</td></tr>`).join('')}</tbody></table></div>`;
  }

  function renderChannelCoverage() {
    const target=panel?.querySelector('[data-lsl-channels]'); if(!target)return;
    const coverage=channelCoverage(activeSession||{profileId:panel.querySelector('#lsl-profile')?.value||'android-native',observations:[]});
    const bridge=hardwareBridgeStatus();
    target.innerHTML=`<div class="lsl-profile-note"><strong>${bridge.connected?`Bridge: ${esc(bridge.id)}`:'No native/router bridge connected'}</strong><span>missing expected channels are treated as acquisition gaps, not absence of RF energy</span></div><div class="lsl-channel-grid">${coverage.map(row=>`<article data-status="${esc(row.status)}"><span>${esc(row.label)}</span><strong>${esc(row.status)}</strong><small>${row.samples} samples${row.expected?' · expected':''}</small></article>`).join('')}</div>`;
  }

  function renderActiveScan() {
    const target=panel?.querySelector('[data-lsl-active]'); if(!target)return;
    const bridge=hardwareBridgeStatus(), report=bridgeCapabilityReport ? normalizeActiveCapabilityReport(bridgeCapabilityReport) : null;
    const methods=report?.activeMethods||[];
    const ranges=activeRangeSummary(activeSession);
    target.innerHTML=`<div class="lsl-active-status"><strong>${bridge.connected?'Hardware bridge connected':'Active Scan awaiting native/router bridge'}</strong><span>${methods.length?`Available: ${methods.map(id=>ACTIVE_SCAN_METHODS[id]?.label||id).join(', ')}`:'No active ranging capabilities reported yet.'}</span></div><div class="lsl-metrics"><div><span>Active bursts</span><strong>${ranges.burstCount}</strong></div><div><span>Range samples</span><strong>${ranges.sampleCount}</strong></div><div><span>Positioned ranges</span><strong>${ranges.positionedRangeSamples}</strong></div><div><span>Policy</span><strong>authorized targets only</strong></div></div>${Object.keys(ranges.byTechnology).length?`<div class="lsl-table"><table><thead><tr><th>Technology</th><th>Samples</th><th>Median distance</th><th>Range</th></tr></thead><tbody>${Object.entries(ranges.byTechnology).map(([id,row])=>`<tr><td>${esc(id)}</td><td>${row.samples}</td><td>${row.medianDistanceM.toFixed(2)} m</td><td>${row.minimumDistanceM.toFixed(2)}–${row.maximumDistanceM.toFixed(2)} m</td></tr>`).join('')}</tbody></table></div>`:''}`;
    drawActiveRangeMap();
  }

  function drawActiveRangeMap() {
    const canvas=panel?.querySelector('#lsl-active-map'); if(!canvas)return;
    const {w,h,dpr}=fitCanvas(canvas),ctx=canvas.getContext('2d');
    ctx.clearRect(0,0,w,h);ctx.fillStyle='#081016';ctx.fillRect(0,0,w,h);ctx.font=`${11*dpr}px sans-serif`;
    const rows=(activeSession?.observations||[]).filter(row=>row.acquisitionMode==='active'&&Number.isFinite(row.ranging?.distanceM)&&Number.isFinite(row.position.localX)&&Number.isFinite(row.position.localY));
    if(!rows.length){ctx.fillStyle='#9eabb5';ctx.fillText('Active range constraints will appear here when the native/router bridge returns authorized ranging results.',12*dpr,22*dpr);return;}
    const extents=[];for(const row of rows){const r=row.ranging.distanceM;extents.push(row.position.localX-r,row.position.localX+r,row.position.localY-r,row.position.localY+r);if(Number.isFinite(row.ranging.targetLocalX))extents.push(row.ranging.targetLocalX);if(Number.isFinite(row.ranging.targetLocalY))extents.push(row.ranging.targetLocalY);}
    const min=Math.min(...extents),max=Math.max(...extents),span=Math.max(1,max-min),px=v=>20*dpr+(v-min)/span*(Math.min(w,h)-40*dpr);
    for(const row of rows.slice(-120)){const cx=px(row.position.localX),cy=h-px(row.position.localY),rr=row.ranging.distanceM/span*(Math.min(w,h)-40*dpr);ctx.strokeStyle='rgba(114,213,255,.24)';ctx.beginPath();ctx.arc(cx,cy,rr,0,Math.PI*2);ctx.stroke();ctx.fillStyle='#72d5ff';ctx.beginPath();ctx.arc(cx,cy,2.5*dpr,0,Math.PI*2);ctx.fill();if(Number.isFinite(row.ranging.targetLocalX)&&Number.isFinite(row.ranging.targetLocalY)){ctx.fillStyle='#ffd166';ctx.beginPath();ctx.arc(px(row.ranging.targetLocalX),h-px(row.ranging.targetLocalY),4*dpr,0,Math.PI*2);ctx.fill();}}
    ctx.fillStyle='#dfe8ee';ctx.fillText(`Active ranging constraints · ${rows.length} samples`,12*dpr,18*dpr);ctx.fillStyle='#9eabb5';ctx.fillText('Circles are distance constraints, not automatically solved target positions.',12*dpr,34*dpr);
  }

  function renderPassiveInventory() {
    if(!panel)return;
    const target=panel.querySelector('[data-lsl-inventory]');
    if(!activeSession){target.innerHTML='<p>Start a passive session to inventory observed frequencies and sources.</p>';return;}
    const inventory=passiveFrequencyInventory(activeSession);
    target.innerHTML=`<div class="lsl-metrics"><div><span>Frequency bins</span><strong>${inventory.bins.length}</strong></div><div><span>Unique sources</span><strong>${inventory.uniqueSources}</strong></div><div><span>Signal-bearing observations</span><strong>${inventory.signalBearingObservations}</strong></div><div><span>Signal families</span><strong>${esc(inventory.kinds.join(', ')||'—')}</strong></div></div><div class="lsl-table"><table><thead><tr><th>Kind</th><th>Frequency bin</th><th>Observations</th><th>Sources</th><th>Median signal</th><th>IQR</th><th>Noise</th><th>SNR</th></tr></thead><tbody>${inventory.bins.map(row=>`<tr><td>${esc(row.kind)}</td><td>${row.frequencyHz?`${(row.frequencyHz/1e6).toFixed(3)} MHz`:'unknown'}</td><td>${row.observations}</td><td>${row.uniqueSources}</td><td>${row.medianSignal===null?'—':row.medianSignal.toFixed(1)}</td><td>${row.signalIqrDb===null?'—':row.signalIqrDb.toFixed(1)+' dB'}</td><td>${row.medianNoiseDbm===null?'—':row.medianNoiseDbm.toFixed(1)+' dBm'}</td><td>${row.medianSnrDb===null?'—':row.medianSnrDb.toFixed(1)+' dB'}</td></tr>`).join('')||'<tr><td colspan="8">No frequency-tagged observations yet.</td></tr>'}</tbody></table></div>`;
  }

  function renderReceiverHealth() {
    if(!panel)return;
    const target=panel.querySelector('[data-lsl-health]');
    if(!activeSession){target.innerHTML='<p>Start a passive session and gather repeated observations from one stable source to evaluate receiver/antenna-path health.</p>';return;}
    const health=receiverHealthDiagnostic(activeSession),c=health.current;
    target.innerHTML=`<div class="lsl-health" data-state="${esc(health.state)}"><div><span>Diagnostic state</span><strong>${esc(health.state)}</strong></div><div><span>Confidence</span><strong>${(health.confidenceFraction*100).toFixed(0)}%</strong></div><div><span>Reference samples</span><strong>${c.sampleCount}</strong></div><div><span>Reference</span><strong>${esc(c.referenceKey||'—')}</strong></div><div><span>Signal median / IQR</span><strong>${c.medianSignal===null?'—':c.medianSignal.toFixed(1)} / ${c.signalIqrDb===null?'—':c.signalIqrDb.toFixed(1)} dB</strong></div><div><span>Noise median / IQR</span><strong>${c.medianNoiseDbm===null?'—':c.medianNoiseDbm.toFixed(1)} / ${c.noiseIqrDb===null?'—':c.noiseIqrDb.toFixed(1)} dB</strong></div><div><span>Chain imbalance</span><strong>${c.medianChainImbalanceDb===null?'—':c.medianChainImbalanceDb.toFixed(1)+' dB'}</strong></div><div><span>Baseline sensitivity loss</span><strong>${health.sensitivityLossDb===null?'—':health.sensitivityLossDb.toFixed(1)+' dB'}</strong></div><div><span>Receive-chain cleanliness</span><strong>${esc(health.cleanlinessState)}</strong></div><div><span>Antenna-path indicators</span><strong>${health.antennaDegradationEvidenceCount}</strong></div></div><p class="lsl-hint">${esc(health.boundary)}</p>${health.flags.length?`<div class="lsl-health-flags">${health.flags.map(flag=>`<article data-severity="${flag.severity}"><strong>${esc(flag.id)} · ${esc(flag.severity)}</strong><p>${esc(flag.detail)}</p><small>Confounders: ${esc(flag.confounders.join(', ')||'none listed')}</small></article>`).join('')}</div>`:'<p>No current passive health flags at this reference condition.</p>'}<button class="lsl-secondary" data-lsl-capture-baseline>Capture current receiver baseline</button>`;
    target.querySelector('[data-lsl-capture-baseline]')?.addEventListener('click',()=>{try{captureReceiverBaseline(activeSession);renderReceiverHealth();renderSession();setStatus('Receiver/antenna reference baseline captured.','success');}catch(error){setStatus(error.message,'error');}});
  }

  function renderFutureResearch() {
    const target=panel?.querySelector('[data-lsl-future]'); if(!target)return;
    target.innerHTML=FUTURE_GATED_RESEARCH.map(item=>`<article><span>${esc(item.label)}</span><strong>${esc(item.status)}</strong><p>${esc(item.boundary)}</p></article>`).join('');
  }

  function renderSession() {
    if(!panel)return;
    const target=panel.querySelector('[data-lsl-session]');
    if(!activeSession){target.innerHTML='<p>No passive session is active. Run preflight, then start a receive-only session.</p>';panel.querySelector('[data-lsl-observations]').innerHTML='<tr><td colspan="6">No observations yet.</td></tr>';drawTimeSeries();drawSpatial();renderPassiveInventory();renderReceiverHealth();renderChannelCoverage();renderActiveScan();return;}
    const summary=summarizeSession(activeSession),plan=buildRefinementPlan(activeSession);
    target.innerHTML=`<div class="lsl-metrics"><div><span>Session</span><strong>${esc(activeSession.sessionId)}</strong></div><div><span>Mode</span><strong>${esc(activeSession.mode)}</strong></div><div><span>Profile</span><strong>${esc(activeSession.profileId)}</strong></div><div><span>Observations</span><strong>${summary.observationCount}</strong></div><div><span>Median signal</span><strong>${summary.medianSignal===null?'—':summary.medianSignal.toFixed(2)}</strong></div><div><span>Frequency bins</span><strong>${summary.passiveFrequencyBins}</strong></div><div><span>Unique sources</span><strong>${summary.uniqueSources}</strong></div><div><span>Spatial samples</span><strong>${summary.spatialSamples}</strong></div><div><span>Chain telemetry</span><strong>${summary.chainTelemetrySamples}</strong></div><div><span>Stale</span><strong>${(summary.staleFraction*100).toFixed(1)}%</strong></div></div><div class="lsl-refinement">${plan.map(stage=>`<article data-status="${stage.status}"><span>${esc(stage.label)}</span><strong>${esc(stage.status)}</strong><p>${esc(stage.goal)}</p><small>Exit: ${esc(stage.exit)}</small></article>`).join('')}</div>`;
    const rows=activeSession.observations.slice(-40).reverse();
    panel.querySelector('[data-lsl-observations]').innerHTML=rows.map(row=>`<tr><td>${new Date(row.timestampMs).toLocaleTimeString()}</td><td>${esc(row.kind)}</td><td>${row.signal.frequencyHz?`${(row.signal.frequencyHz/1e6).toFixed(3)} MHz`:'—'}</td><td>${signalValue(row)===null?'—':signalValue(row).toFixed(1)}</td><td>${esc(row.sourceId||'—')}</td><td>${esc(row.provenance)}</td></tr>`).join('')||'<tr><td colspan="6">No observations yet.</td></tr>';
    drawTimeSeries();drawSpatial();renderPassiveInventory();renderReceiverHealth();renderChannelCoverage();renderActiveScan();
  }

  function readPolling() {
    return safePollingConfiguration({
      sessionMinutes:finite(panel.querySelector('#lsl-session-minutes')?.value,DEFAULT_SESSION_MINUTES),
      wifiResultPollMs:finite(panel.querySelector('#lsl-wifi-ms')?.value,10000),
      bleObservePeriodMs:finite(panel.querySelector('#lsl-ble-period-ms')?.value,MIN_BLE_OBSERVE_PERIOD_MS),
      bleObserveWindowMs:finite(panel.querySelector('#lsl-ble-window-ms')?.value,5000),
      cellPollMs:finite(panel.querySelector('#lsl-cell-ms')?.value,3000),
      gnssPollMs:finite(panel.querySelector('#lsl-gnss-ms')?.value,1000),
      routerPollMs:finite(panel.querySelector('#lsl-router-ms')?.value,3000),
      sensorHz:finite(panel.querySelector('#lsl-sensor-hz')?.value,DEFAULT_SENSOR_HZ),
      privacyRedaction:Boolean(panel.querySelector('#lsl-redact')?.checked)
    });
  }

  function readHardwareState() {
    return {
      thermalState:panel.querySelector('#lsl-thermal')?.value||'nominal',
      batteryPercent:finite(panel.querySelector('#lsl-battery')?.value,100),
      externalPower:Boolean(panel.querySelector('#lsl-external-power')?.checked),
      transmitRequested:false, activeRangingRequested:false, appRequestedWifiScan:false
    };
  }

  function renderPreflight() {
    const preflight=safetyPreflight(readHardwareState()),polling=readPolling(),target=panel.querySelector('[data-lsl-preflight]');
    target.innerHTML=`<div class="lsl-safety ${preflight.pass?'pass':'blocked'}"><strong>${preflight.pass?'PASSIVE PREFLIGHT PASS':'SESSION BLOCKED'}</strong><span>${preflight.blockers.length?esc(preflight.blockers.join('; ')):'Passive Scan preflight passed. Active Scan remains separate and capability/authorization gated; arbitrary RF sweeps and radio mutation remain blocked.'}</span>${preflight.warnings.length?`<small>${esc(preflight.warnings.join('; '))}</small>`:''}</div><div class="lsl-metrics"><div><span>Wi-Fi result refresh floor</span><strong>${(polling.wifiResultPollMs/1000).toFixed(0)} s</strong></div><div><span>BLE observe window / period</span><strong>${(polling.bleObserveWindowMs/1000).toFixed(1)} / ${(polling.bleObservePeriodMs/1000).toFixed(0)} s</strong></div><div><span>Sensor rate cap</span><strong>${polling.sensorHz.toFixed(0)} Hz</strong></div><div><span>Session limit</span><strong>${polling.sessionMinutes.toFixed(0)} min</strong></div></div>`;
    return preflight;
  }

  function buildPanel() {
    if(!root?.document) throw new Error('Live Signals Laboratory requires a browser document.');
    const existing=root.document.getElementById(PANEL_ID); if(existing){panel=existing;return panel;} ensureStyle();
    panel=root.document.createElement('section');panel.id=PANEL_ID;panel.className='lsl-shell';panel.hidden=true;
    panel.innerHTML=`<div class="lsl-backdrop" data-lsl-close></div><div class="lsl-panel" role="dialog" aria-modal="true" aria-labelledby="lsl-title"><header class="lsl-header"><div><p class="lsl-eyebrow">Signals Suite · empirical multi-radio instrumentation</p><h2 id="lsl-title">Live Signals Laboratory</h2><p>Separate from the simulation laboratory. Passive Scan continuously gathers available Wi-Fi, cellular, Bluetooth/BLE, router and sensor telemetry. Active Scan is a separate gated ranging path for standards-supported participating devices or explicit authorized endpoints; arbitrary transmitter sweeps remain outside this mode.</p></div><button class="lsl-close" data-lsl-close aria-label="Close Live Signals Laboratory">×</button></header><div class="lsl-body"><aside class="lsl-controls"><section class="lsl-card lsl-lock"><h3>Hardware safety lock</h3><p><strong>Passive Scan is receive-only.</strong> Active Scan is separate and may only invoke an allowlisted ranging/authorized-RTT capability reported by the connected bridge. Power/channel mutation, packet injection, subnet sweeps, arbitrary frequency sweeps and pulse controls remain blocked.</p><label>Thermal state<select id="lsl-thermal"><option>nominal</option><option>fair</option><option>serious</option><option>severe</option><option>critical</option></select></label><label>Battery %<input id="lsl-battery" type="number" min="0" max="100" value="100"></label><label class="lsl-check"><input id="lsl-external-power" type="checkbox"> External power connected</label><label class="lsl-check"><input id="lsl-redact" type="checkbox" checked> Redact network/device identifiers and geographic coordinates</label><button class="lsl-secondary" data-lsl-preflight-button>Run passive preflight</button><div data-lsl-preflight></div></section><section class="lsl-card"><h3>Passive acquisition profile</h3><label>Hardware bridge<select id="lsl-profile">${profileOptions()}</select></label><label>Session minutes<input id="lsl-session-minutes" type="number" min="1" max="${MAX_SESSION_MINUTES}" value="${DEFAULT_SESSION_MINUTES}"></label><label>Wi-Fi result refresh floor ms<input id="lsl-wifi-ms" type="number" value="10000"></label><p class="lsl-hint">Android bridge contract: consume system/cached scan results and scan-completion broadcasts; do not invoke <code>startScan()</code> in passive mode.</p><label>BLE observe window ms<input id="lsl-ble-window-ms" type="number" value="5000"></label><label>BLE observe period ms<input id="lsl-ble-period-ms" type="number" value="${MIN_BLE_OBSERVE_PERIOD_MS}"></label><label>Cellular poll ms<input id="lsl-cell-ms" type="number" value="3000"></label><label>GNSS poll ms<input id="lsl-gnss-ms" type="number" value="1000"></label><label>Router telemetry poll ms<input id="lsl-router-ms" type="number" value="3000"></label><label>Context sensor Hz<input id="lsl-sensor-hz" type="number" min="1" max="${MAX_SENSOR_HZ}" value="${DEFAULT_SENSOR_HZ}"></label><button class="lsl-primary" data-lsl-start>Start Passive Scan</button><button class="lsl-active-button" data-lsl-active-scan>Run Active Scan</button><button class="lsl-secondary" data-lsl-stop>Stop session</button><div class="lsl-active-controls"><label>Active method<select id="lsl-active-method"><option value="auto">Auto from bridge</option><option value="wifi-rtt-ranging">Wi-Fi RTT</option><option value="uwb-ranging">UWB ranging</option><option value="ble-ranging">Bluetooth ranging</option><option value="authorized-network-rtt">Authorized network RTT</option></select></label><label>Authorized target IDs (comma separated)<input id="lsl-active-targets" type="text" placeholder="AP-lab-1, peer-2"></label><label>Samples per target<input id="lsl-active-samples" type="number" min="1" max="${MAX_ACTIVE_SAMPLES_PER_TARGET}" value="3"></label><label>Sample interval ms<input id="lsl-active-interval" type="number" min="${MIN_ACTIVE_SAMPLE_INTERVAL_MS}" value="1000"></label><label class="lsl-check"><input id="lsl-active-authorized" type="checkbox"> I own/control or have permission to range these targets</label></div></section><section class="lsl-card"><h3>Bridge observation ingest</h3><p>Native mobile apps or a local router bridge should send normalized passive JSON observations. Manual ingest is available for contract testing.</p><textarea id="lsl-json" rows="12" spellcheck="false">{"kind":"wifi","adapterId":"android-native","frequencyHz":2437000000,"rssiDbm":-58,"noiseDbm":-95,"sourceId":"00:11:22:33:44:55","localX":0,"localY":0,"headingDeg":0,"chainRssiDbm":[-58,-60],"provenance":"reported-by-platform"}</textarea><button class="lsl-primary" data-lsl-ingest>Ingest passive observation JSON</button><button class="lsl-secondary" data-lsl-copy>Copy session JSON</button><div class="lsl-status" data-lsl-status>Ready.</div></section></aside><main class="lsl-workspace"><section class="lsl-card lsl-channel-card"><div class="lsl-section-head"><h3>Receiver channel coverage</h3><span>Wi-Fi · cellular · Bluetooth/BLE · sensors · router telemetry</span></div><div data-lsl-channels></div></section><section class="lsl-card"><div class="lsl-section-head"><h3>Capability matrix</h3><span>public/platform exposure, not assumed raw RF access</span></div><div data-lsl-capabilities></div></section><section class="lsl-card"><div class="lsl-section-head"><h3>Passive session & refinement procedure</h3><span>empirical telemetry remains separate from simulation</span></div><div data-lsl-session></div></section><section class="lsl-card"><div class="lsl-section-head"><h3>Passive frequency / source census</h3><span>observed information density without active probing</span></div><div data-lsl-inventory></div></section><section class="lsl-card lsl-health-card"><div class="lsl-section-head"><h3>Receiver / antenna-path cleanliness & degradation screening</h3><span>baseline-relative passive diagnostics</span></div><div data-lsl-health></div></section><section class="lsl-card lsl-active-card"><div class="lsl-section-head"><h3>Active ranging / ping-back mapping</h3><span>separate gated path · participating/authorized targets only</span></div><div data-lsl-active></div><canvas id="lsl-active-map" class="lsl-canvas"></canvas></section><section class="lsl-card"><div class="lsl-section-head"><h3>Live signal history</h3><span>RSSI / RSRP / SNR when reported</span></div><canvas id="lsl-timeseries" class="lsl-canvas"></canvas></section><section class="lsl-card"><div class="lsl-section-head"><h3>Local spatial trace</h3><span>requires measured localX/localY anchors</span></div><canvas id="lsl-spatial" class="lsl-canvas"></canvas></section><section class="lsl-card"><h3>Recent normalized observations</h3><div class="lsl-table"><table><thead><tr><th>Time</th><th>Kind</th><th>Frequency</th><th>Signal</th><th>Source</th><th>Provenance</th></tr></thead><tbody data-lsl-observations><tr><td colspan="6">No observations yet.</td></tr></tbody></table></div></section><section class="lsl-card lsl-future"><div class="lsl-section-head"><h3>Future attenuation / sweep research</h3><span>still gated · not implemented</span></div><div class="lsl-future-grid" data-lsl-future></div></section><section class="lsl-boundary"><strong>Measurement boundary:</strong> mobile operating systems often expose derived telemetry rather than raw spectrum/IQ data. The laboratory records what the platform or read-only hardware bridge actually reports, together with timestamps, permissions, stale state and device context. Receiver/antenna-health flags are screening evidence, not proof of hardware failure. Missing expected radio channels are surfaced as acquisition gaps rather than interpreted as absent RF energy. Active network RTT is latency context and is not treated as direct RF distance unless the ranging technology reports distance. Privacy redaction is enabled by default.</section></main></div></div>`;
    root.document.body.appendChild(panel);
    panel.querySelectorAll('[data-lsl-close]').forEach(node=>node.addEventListener('click',closePanel));
    panel.querySelector('#lsl-profile')?.addEventListener('change',renderCapabilityMatrix);
    for(const id of ['#lsl-thermal','#lsl-battery','#lsl-external-power','#lsl-redact','#lsl-session-minutes','#lsl-wifi-ms','#lsl-ble-window-ms','#lsl-ble-period-ms','#lsl-cell-ms','#lsl-gnss-ms','#lsl-router-ms','#lsl-sensor-hz']) panel.querySelector(id)?.addEventListener('change',renderPreflight);
    panel.querySelector('[data-lsl-preflight-button]')?.addEventListener('click',renderPreflight);
    panel.querySelector('[data-lsl-start]')?.addEventListener('click',()=>{try{activeSession=createSession({profileId:panel.querySelector('#lsl-profile')?.value,polling:readPolling(),hardwareState:readHardwareState()});renderSession();setStatus('Passive Scan started. Waiting for all available receiver channels; missing expected channels will be flagged.','success');}catch(error){setStatus(error.message,'error');}});
    panel.querySelector('[data-lsl-active-scan]')?.addEventListener('click',async()=>{try{if(!activeSession)throw new Error('Start Passive Scan first so active ranging has synchronized passive context.');if(!hardwareBridge){const embedded=root.LiveSignalsHardwareBridge||root.AndroidLiveSignalsBridge||null;if(embedded)registerHardwareBridge(embedded);}if(!hardwareBridge)throw new Error('Active Scan requires a connected native/router hardware bridge. The browser alone cannot access Android TelephonyManager or hardware ranging APIs.');await refreshHardwareBridgeCapabilities();const methodValue=panel.querySelector('#lsl-active-method')?.value||'auto';const method=methodValue==='auto'?(bridgeCapabilityReport?.activeMethods||[])[0]:methodValue;const targetIds=String(panel.querySelector('#lsl-active-targets')?.value||'').split(',').map(v=>v.trim()).filter(Boolean);const result=await runActiveScan(activeSession,{method,targetIds,samplesPerTarget:finite(panel.querySelector('#lsl-active-samples')?.value,3),sampleIntervalMs:finite(panel.querySelector('#lsl-active-interval')?.value,1000),targetsAuthorized:Boolean(panel.querySelector('#lsl-active-authorized')?.checked),...readHardwareState()});renderSession();setStatus(`Active Scan completed: ${result.observations.length} authorized ranging observations.`, 'success');}catch(error){setStatus(error.message,'error');}});
    panel.querySelector('[data-lsl-stop]')?.addEventListener('click',()=>{if(activeSession&&!activeSession.endedAt)activeSession.endedAt=new Date().toISOString();renderSession();setStatus('Session stopped.','success');});
    panel.querySelector('[data-lsl-ingest]')?.addEventListener('click',()=>{try{if(!activeSession)throw new Error('Start a passive session before ingesting telemetry.');const raw=JSON.parse(panel.querySelector('#lsl-json').value);appendObservation(activeSession,raw);renderSession();setStatus('Passive observation ingested.','success');}catch(error){setStatus(error.message,'error');}});
    panel.querySelector('[data-lsl-copy]')?.addEventListener('click',async()=>{try{if(!activeSession)throw new Error('No session to copy.');await root.navigator?.clipboard?.writeText(serializeSession(activeSession));setStatus('Session JSON copied.','success');}catch(error){setStatus(error.message,'error');}});
    const embeddedBridge=root.LiveSignalsHardwareBridge||root.AndroidLiveSignalsBridge||null;if(embeddedBridge)registerHardwareBridge(embeddedBridge);
    renderCapabilityMatrix();renderPreflight();renderFutureResearch();renderSession();if(hardwareBridge)refreshHardwareBridgeCapabilities().then(()=>renderSession()).catch(()=>{});return panel;
  }

  function setStatus(message,kind='') { const node=panel?.querySelector('[data-lsl-status]');if(!node)return;node.textContent=message;node.dataset.kind=kind; }
  function openPanel(options={}) { const target=buildPanel();target.hidden=false;root.document.body.classList.add('lsl-open');if(options.profileId&&HARDWARE_PROFILES[options.profileId]){target.querySelector('#lsl-profile').value=options.profileId;renderCapabilityMatrix();}renderPreflight();renderFutureResearch();renderSession();return target; }
  function closePanel(){if(!panel)return;panel.hidden=true;root?.document?.body?.classList.remove('lsl-open');}
  function ingestObservation(raw,context={}){if(!activeSession)throw new Error('Start a passive session before ingesting telemetry.');const observation=appendObservation(activeSession,raw,context);if(panel&&!panel.hidden)renderSession();return observation;}
  function currentState(){return freeze({panelOpen:Boolean(panel&&!panel.hidden),activeSession:activeSession?freeze({...activeSession,observations:freeze([...activeSession.observations])}):null,runtime:runtimeState()});}

  return freeze({
    openPanel, closePanel, ingestObservation, currentState, createSession, appendObservation, summarizeSession, serializeSession,
    hardwareProfiles, capabilityMatrix, browserCapabilities, safePollingConfiguration, safetyPreflight, assertReceiveOnlyOperation, assertActiveScanOperation,
    activeScanMethods, activeScanPreflight, buildActiveScanPlan, runActiveScan, registerHardwareBridge, unregisterHardwareBridge, hardwareBridgeStatus, refreshHardwareBridgeCapabilities,
    normalizeObservation, refinementStages, buildRefinementPlan, futureGatedResearch, passiveFrequencyInventory, chooseReferenceSeries,
    receiverHealthSnapshot, captureReceiverBaseline, receiverHealthDiagnostic, channelCoverage, expectedPassiveChannels, activeRangeSummary,
    constants: freeze({VERSION,PANEL_ID,VERIFIED_AT,CURRENT_MODE,MAX_SESSION_MINUTES,DEFAULT_SESSION_MINUTES,MAX_SENSOR_HZ,DEFAULT_SENSOR_HZ,MIN_WIFI_RESULT_POLL_MS,MIN_BLE_OBSERVE_PERIOD_MS,MAX_BLE_OBSERVE_WINDOW_MS,MIN_CELL_POLL_MS,MIN_GNSS_POLL_MS,MIN_ROUTER_POLL_MS,MAX_OBSERVATIONS,FREQUENCY_BIN_HZ,MAX_ACTIVE_TARGETS,MAX_ACTIVE_SAMPLES_PER_TARGET,MIN_ACTIVE_SAMPLE_INTERVAL_MS,MAX_ACTIVE_BURST_SECONDS,HARDWARE_PROFILES,SAFETY_POLICY,ACTIVE_SCAN_POLICY,ACTIVE_SCAN_METHODS,CHANNEL_CATALOG,REFINEMENT_STAGES,FUTURE_GATED_RESEARCH,RECEIVER_HEALTH_THRESHOLDS})
  });
});
