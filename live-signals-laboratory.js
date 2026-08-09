(function installLiveSignalsLaboratory(root, factory) {
  'use strict';
  const api = factory(root || globalThis);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.LiveSignalsLaboratory = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function createLiveSignalsLaboratory(root) {
  'use strict';

  const VERSION = '0.2.0';
  const PANEL_ID = 'live-signals-laboratory';
  const STYLE_ID = 'live-signals-laboratory-style';
  const VERIFIED_AT = '2026-08-09';
  const CURRENT_MODE = 'passive-receive-only';
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

  const freeze = value => Object.freeze(value);
  const finite = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
  const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
  const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[ch]));

  const TRANSMIT_MUTATIONS = freeze([
    'set-tx-power','set-channel','set-bandwidth','set-modulation','set-antenna-chain','set-antenna-gain',
    'packet-injection','deauthentication','continuous-transmit','beacon-spam','radio-reset','interface-down','interface-up',
    'wifi-association-change','wifi-start-scan','wifi-probe-request','bluetooth-advertise','bluetooth-connect',
    'wifi-rtt-ranging','uwb-ranging','cellular-transmit-control','uwb-transmit-control','frequency-sweep-transmit','pulse-transmit'
  ]);

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
    receiveOnly: true,
    transmitterControlsExposed: false,
    passiveTelemetryOnly: true,
    activeRangingEnabled: false,
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
    prohibitedOperations: TRANSMIT_MUTATIONS,
    privacyRedactionDefault: true,
    note: 'Current phase is passive receive-side telemetry only. No active ranging, app-initiated Wi-Fi scanning, radio mutation, transmitter sweep, pulse, or stress controls are implemented.'
  });

  const HARDWARE_PROFILES = freeze({
    'android-native': freeze({
      id:'android-native', label:'Android passive native bridge', class:'mobile',
      scope: freeze(['wifi-system-scan-results','ble-observation','cellular-signal','cell-neighbors','gnss','motion','magnetometer','barometer-conditional','light-conditional','proximity-conditional']),
      futureConditional: freeze(['wifi-rtt','uwb-ranging']),
      limitations: freeze(['Do not call WifiManager.startScan in passive phase; consume system/cached scan results and scan-completion broadcasts.','Cell signal freshness is modem/platform controlled.','Sensor availability varies by device.','RTT/UWB are reserved for a later explicitly gated active-ranging phase.']),
      preferred: true
    }),
    'ios-native': freeze({
      id:'ios-native', label:'iOS passive native bridge', class:'mobile',
      scope: freeze(['wifi-current-network','ble-observation','gnss','heading','motion','magnetometer','barometer-conditional','ibeacon-observation-conditional']),
      unavailable: freeze(['general-wifi-scan-public-api','public-cellular-signal-strength-api']),
      limitations: freeze(['Current-network Wi-Fi data requires Apple entitlement/authorization conditions.','General Wi-Fi scanning is not exposed through ordinary public app APIs.','Core Motion/Location services are capability- and permission-gated.']),
      preferred: false
    }),
    'openwrt-readonly': freeze({
      id:'openwrt-readonly', label:'OpenWrt / Linux AP read-only bridge', class:'router',
      scope: freeze(['wifi-radio-status','channel-frequency','noise-floor','station-rssi','station-rates','survey-telemetry','antenna-chain-rssi-conditional','interface-counters']),
      limitations: freeze(['Per-chain telemetry depends on driver/chipset exposure.','The bridge is read-only: no channel, power, bandwidth, chain, reset, association, or interface-state writes.']),
      preferred: true
    }),
    'browser-context': freeze({
      id:'browser-context', label:'Browser context sensors', class:'browser',
      scope: freeze(['geolocation-conditional','device-orientation-conditional','device-motion-conditional','web-bluetooth-observation-conditional']),
      limitations: freeze(['Browsers do not expose general Wi-Fi or cellular RF scan telemetry.','Web Bluetooth support is browser/platform dependent.']),
      preferred: false
    }),
    'generic-receive-json': freeze({
      id:'generic-receive-json', label:'Generic receive-only JSON bridge', class:'external',
      scope: freeze(['normalized-observation-ingest']),
      limitations: freeze(['The bridge must provide receive-side telemetry only; this laboratory rejects active/radio-mutation operations.']),
      preferred: false
    })
  });

  const FUTURE_GATED_RESEARCH = freeze([
    freeze({id:'attenuated-receiver-sweep',label:'Calibrated receiver attenuation sweep',status:'not-implemented',boundary:'Use documented receiver attenuation or external passive attenuators first; retain a known reference source and calibration chain.'}),
    freeze({id:'documented-active-ranging',label:'Standards-compliant active ranging',status:'not-implemented',boundary:'Future Wi-Fi RTT/UWB or certified ranging hardware only after capability, vendor, regional, thermal, power and permission gates are explicit.'}),
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
    freeze({id:'model-correlation',label:'8 · Simulation correlation',goal:'Compare live measurements against the Signals Simulation Laboratory without forcing the simulation to fit unsupported detail.',exit:'Residuals, assumptions and unresolved structure are recorded; empirical data remains distinct from model output.'})
  ]);

  let panel = null;
  let activeSession = null;

  function ensureStyle() {
    if (!root?.document || root.document.getElementById(STYLE_ID)) return;
    const link = root.document.createElement('link');
    link.id = STYLE_ID; link.rel = 'stylesheet'; link.href = 'live-signals-laboratory.css?v=20260809-live-signals-passive-health-2';
    root.document.head.appendChild(link);
  }

  function hardwareProfiles() { return freeze(Object.values(HARDWARE_PROFILES)); }
  function refinementStages() { return REFINEMENT_STAGES; }
  function futureGatedResearch() { return FUTURE_GATED_RESEARCH; }

  function pseudonymize(value) {
    const text = String(value ?? '');
    let hash = 2166136261;
    for (let i=0;i<text.length;i+=1) { hash ^= text.charCodeAt(i); hash = Math.imul(hash, 16777619); }
    return `anon-${(hash>>>0).toString(16).padStart(8,'0')}`;
  }

  function assertReceiveOnlyOperation(operation) {
    const op = String(operation || '').toLowerCase();
    if (TRANSMIT_MUTATIONS.includes(op)) throw new Error(`Live Signals Laboratory blocks active/radio mutation operation: ${op}`);
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
    if (input.transmitRequested || input.activeRangingRequested || input.appRequestedWifiScan) blockers.push('active probing/radio mutation was requested; current Live Signals mode is passive receive-only');
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
      add('Wi-Fi RTT / UWB active ranging','future-gated','Not enabled in passive phase','Reserved for a later documented active-ranging phase.');
    } else if (profile.id === 'ios-native') {
      add('Current Wi-Fi network','conditional','NetworkExtension NEHotspotNetwork','Entitlement and authorization conditions apply.');
      add('General Wi-Fi scan','unavailable-public-api','iOS public API boundary','Do not emulate or infer a scan list.');
      add('Bluetooth LE advertisement observations','available-with-permission','CoreBluetooth CBCentralManager','Observation only; no peripheral connection is required by the live lab.');
      add('Cellular signal strength','unavailable-public-api','iOS public API boundary','Do not fabricate modem RSSI/RSRP.');
      add('GNSS/location/heading','available-with-permission','Core Location','Accuracy, timestamp and authorization must be retained.');
      add('Motion/gyro/magnetometer','device-dependent','Core Motion','Check service availability before use.');
      add('Barometer','device-dependent','Core Motion / device hardware','Optional context channel.');
    } else if (profile.id === 'openwrt-readonly') {
      add('Radio channel/frequency/noise','bridge-dependent','OpenWrt/Linux read-only telemetry','Typical sources include iwinfo/iw/ubus observation output.');
      add('Station RSSI/rates','bridge-dependent','OpenWrt/Linux read-only telemetry','Observe only telemetry exposed by driver.');
      add('Per-chain antenna RSSI','driver-dependent','nl80211/driver telemetry','Only expose when chipset reports it; never synthesize missing chains.');
      add('Interface counters','available','router OS telemetry','Useful for context; not a direct RF power measurement.');
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
    assertReceiveOnlyOperation(raw.operation || 'observe');
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
      kind, sourceId, ssid,
      signal: freeze({
        frequencyHz, channel: raw.channel ?? null, bandwidthHz: Number.isFinite(Number(raw.bandwidthHz)) ? Number(raw.bandwidthHz) : null,
        rssiDbm, noiseDbm, snrDb,
        rsrpDbm: Number.isFinite(Number(raw.rsrpDbm)) ? Number(raw.rsrpDbm) : null,
        rsrqDb: Number.isFinite(Number(raw.rsrqDb)) ? Number(raw.rsrqDb) : null,
        sinrDb: Number.isFinite(Number(raw.sinrDb)) ? Number(raw.sinrDb) : null,
        txPowerReportedDbm: Number.isFinite(Number(raw.txPowerReportedDbm)) ? Number(raw.txPowerReportedDbm) : null,
        distanceM: Number.isFinite(Number(raw.distanceM)) ? Number(raw.distanceM) : null
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

  function createSession(options = {}) {
    const profileId = HARDWARE_PROFILES[options.profileId] ? options.profileId : 'generic-receive-json';
    const polling = safePollingConfiguration(options.polling || {}, options.capability || {});
    const preflight = safetyPreflight(options.hardwareState || {});
    if (!preflight.pass) throw new Error(`Live session preflight blocked: ${preflight.blockers.join('; ')}`);
    return {
      format:'hb-ttrpg-live-signals-session', schemaVersion:VERSION, evidenceClass:'empirical-platform-telemetry', mode:CURRENT_MODE,
      sessionId:`lsl-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`,
      startedAt:new Date().toISOString(), endedAt:null, profileId, receiveOnly:true,
      polling, preflight, observations:[], notes:[], refinementStage:'capability-inventory', receiverBaseline:null,
      privacy:freeze({redaction:polling.privacyRedaction,rawIdentifiersIncluded:polling.includeRawIdentifiers})
    };
  }

  function appendObservation(session, raw, context = {}) {
    if (!session || session.endedAt) throw new Error('No active live session.');
    assertReceiveOnlyOperation(raw.operation || 'observe');
    const observation = normalizeObservation(raw, { ...context, privacyRedaction:session.polling.privacyRedaction, adapterId:raw.adapterId || session.profileId });
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
    return freeze({
      observationCount:observations.length, kinds:freeze({...kinds}),
      medianSignal:median(values), q1Signal:percentile(values,.25), q3Signal:percentile(values,.75),
      minimumSignal:values.length?Math.min(...values):null, maximumSignal:values.length?Math.max(...values):null,
      staleFraction:observations.length?staleCount/observations.length:0,
      throttledFraction:observations.length?throttledCount/observations.length:0,
      spatialSamples:observations.filter(row=>Number.isFinite(row.position.localX)&&Number.isFinite(row.position.localY)).length,
      chainTelemetrySamples:observations.filter(row=>row.auxiliary.chainRssiDbm?.length).length,
      passiveFrequencyBins:inventory.bins.length, uniqueSources:inventory.uniqueSources
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
      refinementPlan:buildRefinementPlan(session),
      futureGatedResearch:FUTURE_GATED_RESEARCH
    }, null, 2);
  }

  function runtimeState() {
    return freeze({
      version:VERSION, verifiedAt:VERIFIED_AT, mode:CURRENT_MODE, browser:browserCapabilities(),
      safety:SAFETY_POLICY, activeSession:Boolean(activeSession),
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
    if(!activeSession){target.innerHTML='<p>No passive session is active. Run preflight, then start a receive-only session.</p>';panel.querySelector('[data-lsl-observations]').innerHTML='<tr><td colspan="6">No observations yet.</td></tr>';drawTimeSeries();drawSpatial();renderPassiveInventory();renderReceiverHealth();return;}
    const summary=summarizeSession(activeSession),plan=buildRefinementPlan(activeSession);
    target.innerHTML=`<div class="lsl-metrics"><div><span>Session</span><strong>${esc(activeSession.sessionId)}</strong></div><div><span>Mode</span><strong>${esc(activeSession.mode)}</strong></div><div><span>Profile</span><strong>${esc(activeSession.profileId)}</strong></div><div><span>Observations</span><strong>${summary.observationCount}</strong></div><div><span>Median signal</span><strong>${summary.medianSignal===null?'—':summary.medianSignal.toFixed(2)}</strong></div><div><span>Frequency bins</span><strong>${summary.passiveFrequencyBins}</strong></div><div><span>Unique sources</span><strong>${summary.uniqueSources}</strong></div><div><span>Spatial samples</span><strong>${summary.spatialSamples}</strong></div><div><span>Chain telemetry</span><strong>${summary.chainTelemetrySamples}</strong></div><div><span>Stale</span><strong>${(summary.staleFraction*100).toFixed(1)}%</strong></div></div><div class="lsl-refinement">${plan.map(stage=>`<article data-status="${stage.status}"><span>${esc(stage.label)}</span><strong>${esc(stage.status)}</strong><p>${esc(stage.goal)}</p><small>Exit: ${esc(stage.exit)}</small></article>`).join('')}</div>`;
    const rows=activeSession.observations.slice(-40).reverse();
    panel.querySelector('[data-lsl-observations]').innerHTML=rows.map(row=>`<tr><td>${new Date(row.timestampMs).toLocaleTimeString()}</td><td>${esc(row.kind)}</td><td>${row.signal.frequencyHz?`${(row.signal.frequencyHz/1e6).toFixed(3)} MHz`:'—'}</td><td>${signalValue(row)===null?'—':signalValue(row).toFixed(1)}</td><td>${esc(row.sourceId||'—')}</td><td>${esc(row.provenance)}</td></tr>`).join('')||'<tr><td colspan="6">No observations yet.</td></tr>';
    drawTimeSeries();drawSpatial();renderPassiveInventory();renderReceiverHealth();
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
    target.innerHTML=`<div class="lsl-safety ${preflight.pass?'pass':'blocked'}"><strong>${preflight.pass?'PASSIVE PREFLIGHT PASS':'SESSION BLOCKED'}</strong><span>${preflight.blockers.length?esc(preflight.blockers.join('; ')):'Receive-only mode. No active ranging, app-requested Wi-Fi scan, transmitter sweep, pulse, or radio mutation path is enabled.'}</span>${preflight.warnings.length?`<small>${esc(preflight.warnings.join('; '))}</small>`:''}</div><div class="lsl-metrics"><div><span>Wi-Fi result refresh floor</span><strong>${(polling.wifiResultPollMs/1000).toFixed(0)} s</strong></div><div><span>BLE observe window / period</span><strong>${(polling.bleObserveWindowMs/1000).toFixed(1)} / ${(polling.bleObservePeriodMs/1000).toFixed(0)} s</strong></div><div><span>Sensor rate cap</span><strong>${polling.sensorHz.toFixed(0)} Hz</strong></div><div><span>Session limit</span><strong>${polling.sessionMinutes.toFixed(0)} min</strong></div></div>`;
    return preflight;
  }

  function buildPanel() {
    if(!root?.document) throw new Error('Live Signals Laboratory requires a browser document.');
    const existing=root.document.getElementById(PANEL_ID); if(existing){panel=existing;return panel;} ensureStyle();
    panel=root.document.createElement('section');panel.id=PANEL_ID;panel.className='lsl-shell';panel.hidden=true;
    panel.innerHTML=`<div class="lsl-backdrop" data-lsl-close></div><div class="lsl-panel" role="dialog" aria-modal="true" aria-labelledby="lsl-title"><header class="lsl-header"><div><p class="lsl-eyebrow">Signals Suite · passive empirical instrumentation</p><h2 id="lsl-title">Live Signals Laboratory</h2><p>Separate from the simulation laboratory. Current phase is passive receive-side telemetry only: Wi-Fi system observations, Bluetooth/BLE advertisements, cellular telemetry, router/AP receive statistics, GNSS and mobile sensor context. Active ranging, transmitter sweeps and pulsing are reserved for later gated research.</p></div><button class="lsl-close" data-lsl-close aria-label="Close Live Signals Laboratory">×</button></header><div class="lsl-body"><aside class="lsl-controls"><section class="lsl-card lsl-lock"><h3>Passive hardware safety lock</h3><p><strong>No transmission path in this phase.</strong> The live lab rejects radio mutation, active ranging, app-initiated Wi-Fi scanning, advertising/connection requests, frequency sweeps and pulse controls.</p><label>Thermal state<select id="lsl-thermal"><option>nominal</option><option>fair</option><option>serious</option><option>severe</option><option>critical</option></select></label><label>Battery %<input id="lsl-battery" type="number" min="0" max="100" value="100"></label><label class="lsl-check"><input id="lsl-external-power" type="checkbox"> External power connected</label><label class="lsl-check"><input id="lsl-redact" type="checkbox" checked> Redact network/device identifiers and geographic coordinates</label><button class="lsl-secondary" data-lsl-preflight-button>Run passive preflight</button><div data-lsl-preflight></div></section><section class="lsl-card"><h3>Passive acquisition profile</h3><label>Hardware bridge<select id="lsl-profile">${profileOptions()}</select></label><label>Session minutes<input id="lsl-session-minutes" type="number" min="1" max="${MAX_SESSION_MINUTES}" value="${DEFAULT_SESSION_MINUTES}"></label><label>Wi-Fi result refresh floor ms<input id="lsl-wifi-ms" type="number" value="10000"></label><p class="lsl-hint">Android bridge contract: consume system/cached scan results and scan-completion broadcasts; do not invoke <code>startScan()</code> in passive mode.</p><label>BLE observe window ms<input id="lsl-ble-window-ms" type="number" value="5000"></label><label>BLE observe period ms<input id="lsl-ble-period-ms" type="number" value="${MIN_BLE_OBSERVE_PERIOD_MS}"></label><label>Cellular poll ms<input id="lsl-cell-ms" type="number" value="3000"></label><label>GNSS poll ms<input id="lsl-gnss-ms" type="number" value="1000"></label><label>Router telemetry poll ms<input id="lsl-router-ms" type="number" value="3000"></label><label>Context sensor Hz<input id="lsl-sensor-hz" type="number" min="1" max="${MAX_SENSOR_HZ}" value="${DEFAULT_SENSOR_HZ}"></label><button class="lsl-primary" data-lsl-start>Start passive session</button><button class="lsl-secondary" data-lsl-stop>Stop session</button></section><section class="lsl-card"><h3>Bridge observation ingest</h3><p>Native mobile apps or a local router bridge should send normalized passive JSON observations. Manual ingest is available for contract testing.</p><textarea id="lsl-json" rows="12" spellcheck="false">{"kind":"wifi","adapterId":"android-native","frequencyHz":2437000000,"rssiDbm":-58,"noiseDbm":-95,"sourceId":"00:11:22:33:44:55","localX":0,"localY":0,"headingDeg":0,"chainRssiDbm":[-58,-60],"provenance":"reported-by-platform"}</textarea><button class="lsl-primary" data-lsl-ingest>Ingest passive observation JSON</button><button class="lsl-secondary" data-lsl-copy>Copy session JSON</button><div class="lsl-status" data-lsl-status>Ready.</div></section></aside><main class="lsl-workspace"><section class="lsl-card"><div class="lsl-section-head"><h3>Capability matrix</h3><span>public/platform exposure, not assumed raw RF access</span></div><div data-lsl-capabilities></div></section><section class="lsl-card"><div class="lsl-section-head"><h3>Passive session & refinement procedure</h3><span>empirical telemetry remains separate from simulation</span></div><div data-lsl-session></div></section><section class="lsl-card"><div class="lsl-section-head"><h3>Passive frequency / source census</h3><span>observed information density without active probing</span></div><div data-lsl-inventory></div></section><section class="lsl-card lsl-health-card"><div class="lsl-section-head"><h3>Receiver / antenna-path cleanliness & degradation screening</h3><span>baseline-relative passive diagnostics</span></div><div data-lsl-health></div></section><section class="lsl-card"><div class="lsl-section-head"><h3>Live signal history</h3><span>RSSI / RSRP / SNR when reported</span></div><canvas id="lsl-timeseries" class="lsl-canvas"></canvas></section><section class="lsl-card"><div class="lsl-section-head"><h3>Local spatial trace</h3><span>requires measured localX/localY anchors</span></div><canvas id="lsl-spatial" class="lsl-canvas"></canvas></section><section class="lsl-card"><h3>Recent normalized observations</h3><div class="lsl-table"><table><thead><tr><th>Time</th><th>Kind</th><th>Frequency</th><th>Signal</th><th>Source</th><th>Provenance</th></tr></thead><tbody data-lsl-observations><tr><td colspan="6">No observations yet.</td></tr></tbody></table></div></section><section class="lsl-card lsl-future"><div class="lsl-section-head"><h3>Future gated attenuation / ranging research</h3><span>documented only · not implemented</span></div><div class="lsl-future-grid" data-lsl-future></div></section><section class="lsl-boundary"><strong>Measurement boundary:</strong> mobile operating systems often expose derived telemetry rather than raw spectrum/IQ data. The laboratory records what the platform or read-only hardware bridge actually reports, together with timestamps, permissions, stale state and device context. Receiver/antenna-health flags are screening evidence, not proof of hardware failure. Missing radio telemetry is marked unavailable rather than inferred. Privacy redaction is enabled by default.</section></main></div></div>`;
    root.document.body.appendChild(panel);
    panel.querySelectorAll('[data-lsl-close]').forEach(node=>node.addEventListener('click',closePanel));
    panel.querySelector('#lsl-profile')?.addEventListener('change',renderCapabilityMatrix);
    for(const id of ['#lsl-thermal','#lsl-battery','#lsl-external-power','#lsl-redact','#lsl-session-minutes','#lsl-wifi-ms','#lsl-ble-window-ms','#lsl-ble-period-ms','#lsl-cell-ms','#lsl-gnss-ms','#lsl-router-ms','#lsl-sensor-hz']) panel.querySelector(id)?.addEventListener('change',renderPreflight);
    panel.querySelector('[data-lsl-preflight-button]')?.addEventListener('click',renderPreflight);
    panel.querySelector('[data-lsl-start]')?.addEventListener('click',()=>{try{activeSession=createSession({profileId:panel.querySelector('#lsl-profile')?.value,polling:readPolling(),hardwareState:readHardwareState()});renderSession();setStatus('Passive session started. Awaiting receive-side telemetry.','success');}catch(error){setStatus(error.message,'error');}});
    panel.querySelector('[data-lsl-stop]')?.addEventListener('click',()=>{if(activeSession&&!activeSession.endedAt)activeSession.endedAt=new Date().toISOString();renderSession();setStatus('Session stopped.','success');});
    panel.querySelector('[data-lsl-ingest]')?.addEventListener('click',()=>{try{if(!activeSession)throw new Error('Start a passive session before ingesting telemetry.');const raw=JSON.parse(panel.querySelector('#lsl-json').value);appendObservation(activeSession,raw);renderSession();setStatus('Passive observation ingested.','success');}catch(error){setStatus(error.message,'error');}});
    panel.querySelector('[data-lsl-copy]')?.addEventListener('click',async()=>{try{if(!activeSession)throw new Error('No session to copy.');await root.navigator?.clipboard?.writeText(serializeSession(activeSession));setStatus('Session JSON copied.','success');}catch(error){setStatus(error.message,'error');}});
    renderCapabilityMatrix();renderPreflight();renderFutureResearch();renderSession();return panel;
  }

  function setStatus(message,kind='') { const node=panel?.querySelector('[data-lsl-status]');if(!node)return;node.textContent=message;node.dataset.kind=kind; }
  function openPanel(options={}) { const target=buildPanel();target.hidden=false;root.document.body.classList.add('lsl-open');if(options.profileId&&HARDWARE_PROFILES[options.profileId]){target.querySelector('#lsl-profile').value=options.profileId;renderCapabilityMatrix();}renderPreflight();renderFutureResearch();renderSession();return target; }
  function closePanel(){if(!panel)return;panel.hidden=true;root?.document?.body?.classList.remove('lsl-open');}
  function ingestObservation(raw,context={}){if(!activeSession)throw new Error('Start a passive session before ingesting telemetry.');const observation=appendObservation(activeSession,raw,context);if(panel&&!panel.hidden)renderSession();return observation;}
  function currentState(){return freeze({panelOpen:Boolean(panel&&!panel.hidden),activeSession:activeSession?freeze({...activeSession,observations:freeze([...activeSession.observations])}):null,runtime:runtimeState()});}

  return freeze({
    openPanel, closePanel, ingestObservation, currentState, createSession, appendObservation, summarizeSession, serializeSession,
    hardwareProfiles, capabilityMatrix, browserCapabilities, safePollingConfiguration, safetyPreflight, assertReceiveOnlyOperation,
    normalizeObservation, refinementStages, buildRefinementPlan, futureGatedResearch, passiveFrequencyInventory, chooseReferenceSeries,
    receiverHealthSnapshot, captureReceiverBaseline, receiverHealthDiagnostic,
    constants: freeze({VERSION,PANEL_ID,VERIFIED_AT,CURRENT_MODE,MAX_SESSION_MINUTES,DEFAULT_SESSION_MINUTES,MAX_SENSOR_HZ,DEFAULT_SENSOR_HZ,MIN_WIFI_RESULT_POLL_MS,MIN_BLE_OBSERVE_PERIOD_MS,MAX_BLE_OBSERVE_WINDOW_MS,MIN_CELL_POLL_MS,MIN_GNSS_POLL_MS,MIN_ROUTER_POLL_MS,MAX_OBSERVATIONS,FREQUENCY_BIN_HZ,HARDWARE_PROFILES,SAFETY_POLICY,REFINEMENT_STAGES,FUTURE_GATED_RESEARCH,RECEIVER_HEALTH_THRESHOLDS})
  });
});
