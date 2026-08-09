(function installLiveSignalsLaboratory(root, factory) {
  'use strict';
  const api = factory(root || globalThis);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.LiveSignalsLaboratory = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function createLiveSignalsLaboratory(root) {
  'use strict';

  const VERSION = '0.1.0';
  const PANEL_ID = 'live-signals-laboratory';
  const STYLE_ID = 'live-signals-laboratory-style';
  const VERIFIED_AT = '2026-08-09';
  const MAX_SESSION_MINUTES = 60;
  const DEFAULT_SESSION_MINUTES = 15;
  const MAX_SENSOR_HZ = 50;
  const DEFAULT_SENSOR_HZ = 20;
  const MIN_WIFI_SCAN_INTERVAL_MS = 30000;
  const MIN_BLE_SCAN_PERIOD_MS = 30000;
  const MAX_BLE_SCAN_WINDOW_MS = 10000;
  const MIN_CELL_POLL_MS = 2000;
  const MIN_GNSS_POLL_MS = 1000;
  const MIN_ROUTER_POLL_MS = 2000;
  const MAX_OBSERVATIONS = 12000;

  const freeze = value => Object.freeze(value);
  const finite = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
  const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
  const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[ch]));

  const TRANSMIT_MUTATIONS = freeze([
    'set-tx-power','set-channel','set-bandwidth','set-modulation','set-antenna-chain','set-antenna-gain',
    'packet-injection','deauthentication','continuous-transmit','beacon-spam','radio-reset','interface-down','interface-up',
    'wifi-association-change','bluetooth-advertise','cellular-transmit-control','uwb-transmit-control'
  ]);

  const SAFETY_POLICY = freeze({
    receiveOnly: true,
    transmitterControlsExposed: false,
    passiveTelemetryOnly: true,
    maximumSessionMinutes: MAX_SESSION_MINUTES,
    defaultSessionMinutes: DEFAULT_SESSION_MINUTES,
    maximumSensorHz: MAX_SENSOR_HZ,
    defaultSensorHz: DEFAULT_SENSOR_HZ,
    minimumWifiScanIntervalMs: MIN_WIFI_SCAN_INTERVAL_MS,
    minimumBleScanPeriodMs: MIN_BLE_SCAN_PERIOD_MS,
    maximumBleScanWindowMs: MAX_BLE_SCAN_WINDOW_MS,
    minimumCellPollMs: MIN_CELL_POLL_MS,
    minimumGnssPollMs: MIN_GNSS_POLL_MS,
    minimumRouterPollMs: MIN_ROUTER_POLL_MS,
    stopThermalStates: freeze(['critical','emergency','shutdown']),
    reduceThermalStates: freeze(['serious','severe']),
    minimumBatteryPercentWithoutExternalPower: 15,
    prohibitedOperations: TRANSMIT_MUTATIONS,
    privacyRedactionDefault: true,
    note: 'Read-only telemetry and receive-side measurement only. No radio mutation or transmitter stress controls are implemented.'
  });

  const HARDWARE_PROFILES = freeze({
    'android-native': freeze({
      id:'android-native', label:'Android native bridge', class:'mobile',
      scope: freeze(['wifi-scan','wifi-rtt-conditional','ble-scan','cellular-signal','cell-neighbors','gnss','motion','magnetometer','barometer-conditional','light-conditional','proximity-conditional','uwb-ranging-conditional']),
      limitations: freeze(['Wi-Fi scans require permissions/location state and are platform-throttled.','Cell signal freshness is modem/platform controlled.','Sensor availability varies by device.','Wi-Fi RTT and UWB are conditional hardware capabilities.']),
      preferred: true
    }),
    'ios-native': freeze({
      id:'ios-native', label:'iOS native bridge', class:'mobile',
      scope: freeze(['wifi-current-network','ble-scan','gnss','heading','motion','magnetometer','barometer-conditional','ibeacon-ranging-conditional']),
      unavailable: freeze(['general-wifi-scan-public-api','public-cellular-signal-strength-api']),
      limitations: freeze(['Current-network Wi-Fi data requires Apple entitlement/authorization conditions.','General Wi-Fi scanning is not exposed through ordinary public app APIs.','Core Motion/Location services are capability- and permission-gated.']),
      preferred: false
    }),
    'openwrt-readonly': freeze({
      id:'openwrt-readonly', label:'OpenWrt / Linux AP read-only bridge', class:'router',
      scope: freeze(['wifi-radio-status','channel-frequency','noise-floor','station-rssi','station-rates','survey-telemetry','antenna-chain-rssi-conditional','interface-counters']),
      limitations: freeze(['Per-chain telemetry depends on driver/chipset exposure.','The live lab accepts read-only bridge output only; radio configuration remains outside the module.']),
      preferred: true
    }),
    'browser-context': freeze({
      id:'browser-context', label:'Browser context sensors', class:'browser',
      scope: freeze(['geolocation-conditional','device-orientation-conditional','device-motion-conditional','web-bluetooth-conditional']),
      limitations: freeze(['Browsers do not expose general Wi-Fi or cellular RF scan telemetry.','Web Bluetooth support is browser/platform dependent.']),
      preferred: false
    }),
    'generic-receive-json': freeze({
      id:'generic-receive-json', label:'Generic receive-only JSON bridge', class:'external',
      scope: freeze(['normalized-observation-ingest']),
      limitations: freeze(['The bridge must provide telemetry; this laboratory does not configure or key an external transmitter.']),
      preferred: false
    })
  });

  const REFINEMENT_STAGES = freeze([
    freeze({id:'capability-inventory',label:'0 · Capability inventory',goal:'Discover exactly which radios, telemetry fields, sensors, rates, permissions and platform limits are available before collecting data.',exit:'Every requested channel is marked available, conditional, unavailable, or permission-blocked.'}),
    freeze({id:'hardware-baseline',label:'1 · Hardware baseline',goal:'Record battery/external-power state, thermal state, device orientation, time source and idle telemetry without movement.',exit:'No thermal stop condition; timestamps are monotonic; baseline age/freshness is characterized.'}),
    freeze({id:'stationary-repeatability',label:'2 · Stationary repeatability',goal:'Collect repeated passive samples at one fixed pose to measure RSSI/signal variance and platform update cadence.',exit:'Median, spread and stale-sample fraction are stable enough to distinguish noise from movement effects.'}),
    freeze({id:'orientation-sweep',label:'3 · Orientation sweep',goal:'Rotate the receiver/device through controlled orientations without moving its position.',exit:'Orientation-linked signal changes can be separated from positional changes and sensor heading quality is understood.'}),
    freeze({id:'spatial-traverse',label:'4 · Spatial traverse',goal:'Move the receiver along a measured route while recording local position, orientation and passive signal telemetry.',exit:'Path contains repeatable spatial anchors and no hardware safety guard was exceeded.'}),
    freeze({id:'cross-instrument',label:'5 · Cross-instrument comparison',goal:'Repeat selected points with a second device or router telemetry source to estimate device-specific offsets.',exit:'Per-device bias/variance is characterized instead of assuming RSSI values are interchangeable.'}),
    freeze({id:'model-correlation',label:'6 · Simulation correlation',goal:'Compare live measurements against the Signals Simulation Laboratory without forcing the simulation to fit unsupported detail.',exit:'Residuals, assumptions and unresolved structure are recorded; empirical data remains distinct from model output.'})
  ]);

  let panel = null;
  let activeSession = null;

  function ensureStyle() {
    if (!root?.document || root.document.getElementById(STYLE_ID)) return;
    const link = root.document.createElement('link');
    link.id = STYLE_ID; link.rel = 'stylesheet'; link.href = 'live-signals-laboratory.css?v=20260809-live-signals-1';
    root.document.head.appendChild(link);
  }

  function hardwareProfiles() { return freeze(Object.values(HARDWARE_PROFILES)); }
  function refinementStages() { return REFINEMENT_STAGES; }

  function pseudonymize(value) {
    const text = String(value ?? '');
    let hash = 2166136261;
    for (let i=0;i<text.length;i+=1) { hash ^= text.charCodeAt(i); hash = Math.imul(hash, 16777619); }
    return `anon-${(hash>>>0).toString(16).padStart(8,'0')}`;
  }

  function assertReceiveOnlyOperation(operation) {
    const op = String(operation || '').toLowerCase();
    if (TRANSMIT_MUTATIONS.includes(op)) throw new Error(`Live Signals Laboratory blocks transmitter/radio mutation operation: ${op}`);
    return true;
  }

  function safePollingConfiguration(input = {}, capability = {}) {
    const deviceSensorMax = finite(capability.maxSensorHz, MAX_SENSOR_HZ) > 0 ? finite(capability.maxSensorHz, MAX_SENSOR_HZ) : MAX_SENSOR_HZ;
    return freeze({
      sessionMinutes: clamp(finite(input.sessionMinutes, DEFAULT_SESSION_MINUTES), 1, MAX_SESSION_MINUTES),
      wifiScanIntervalMs: Math.max(MIN_WIFI_SCAN_INTERVAL_MS, finite(input.wifiScanIntervalMs, MIN_WIFI_SCAN_INTERVAL_MS)),
      bleScanPeriodMs: Math.max(MIN_BLE_SCAN_PERIOD_MS, finite(input.bleScanPeriodMs, MIN_BLE_SCAN_PERIOD_MS)),
      bleScanWindowMs: clamp(finite(input.bleScanWindowMs, 5000), 1000, MAX_BLE_SCAN_WINDOW_MS),
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
    if (input.transmitRequested) blockers.push('transmit/radio mutation was requested; live laboratory is receive-only');
    return freeze({ pass:blockers.length===0, thermalState:thermal, batteryPercent, externalPower, reduceDutyCycle:reduceThermal, blockers:freeze(blockers), warnings:freeze(warnings) });
  }

  function capabilityMatrix(profileId = 'android-native', runtime = {}) {
    const profile = HARDWARE_PROFILES[profileId] || HARDWARE_PROFILES['generic-receive-json'];
    const rows = [];
    const add = (capability, status, source, note='') => rows.push(freeze({capability,status,source,note}));
    if (profile.id === 'android-native') {
      add('Wi-Fi scan RSSI/frequency','available-with-permission','Android WifiManager','Public scan results; OS throttling applies.');
      add('Wi-Fi RTT ranging','conditional','Android WifiRttManager','Only supported devices/APs; permissions/location state required.');
      add('Bluetooth LE scan RSSI','available-with-permission','Android BluetoothLeScanner','Passive advertisement discovery; scan failures/rate limits must be honored.');
      add('Cellular serving/neighbour signal','available-with-permission','Android TelephonyManager','CellInfo and cached modem signal data; freshness varies.');
      add('GNSS/location','available-with-permission','Android location stack','Use accuracy and timestamp with every sample.');
      add('Motion/orientation/magnetic field','device-dependent','Android SensorManager','Inventory actual sensor list and max rates at runtime.');
      add('Pressure/light/proximity','device-dependent','Android SensorManager','Do not assume presence.');
      add('UWB ranging','device-dependent','Android UWB/ranging APIs','Optional; not required for baseline live lab.');
    } else if (profile.id === 'ios-native') {
      add('Current Wi-Fi network','conditional','NetworkExtension NEHotspotNetwork','Entitlement and authorization conditions apply.');
      add('General Wi-Fi scan','unavailable-public-api','iOS public API boundary','Do not emulate or infer a scan list.');
      add('Bluetooth LE scan RSSI','available-with-permission','CoreBluetooth CBCentralManager','Advertising peripherals only.');
      add('Cellular signal strength','unavailable-public-api','iOS public API boundary','Do not fabricate modem RSSI/RSRP.');
      add('GNSS/location/heading','available-with-permission','Core Location','Accuracy, timestamp and authorization must be retained.');
      add('Motion/gyro/magnetometer','device-dependent','Core Motion','Check service availability before use.');
      add('Barometer','device-dependent','Core Motion / device hardware','Optional context channel.');
    } else if (profile.id === 'openwrt-readonly') {
      add('Radio channel/frequency/noise','bridge-dependent','OpenWrt/Linux read-only telemetry','Typical sources include iwinfo/iw/ubus output.');
      add('Station RSSI/rates','bridge-dependent','OpenWrt/Linux read-only telemetry','Observe only associated-station telemetry exposed by driver.');
      add('Per-chain antenna RSSI','driver-dependent','nl80211/driver telemetry','Only expose when chipset reports it; never synthesize missing chains.');
      add('Interface counters','available','router OS telemetry','Useful for context; not a direct RF power measurement.');
    } else if (profile.id === 'browser-context') {
      add('Geolocation', runtime.geolocation ? 'browser-available' : 'unavailable', 'Web Geolocation','Context only; not an RF sensor.');
      add('Device orientation', runtime.deviceOrientation ? 'browser-available' : 'unavailable', 'DeviceOrientation event','Permission/platform dependent.');
      add('Device motion', runtime.deviceMotion ? 'browser-available' : 'unavailable', 'DeviceMotion event','Permission/platform dependent.');
      add('Web Bluetooth', runtime.webBluetooth ? 'browser-available' : 'unavailable', 'Web Bluetooth','Browser support varies; not a general RF spectrum API.');
      add('Wi-Fi/cellular scan','unavailable-web-api','Browser security boundary','Requires native/router bridge.');
    } else {
      add('Normalized telemetry','available','JSON bridge contract','Bridge is responsible for hardware access and must remain receive-only.');
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
        magneticUt: Array.isArray(raw.magneticUt) ? freeze(raw.magneticUt.slice(0,3).map(Number)) : null,
        pressureHpa: Number.isFinite(Number(raw.pressureHpa)) ? Number(raw.pressureHpa) : null,
        lightLux: Number.isFinite(Number(raw.lightLux)) ? Number(raw.lightLux) : null,
        accelerationMs2: Array.isArray(raw.accelerationMs2) ? freeze(raw.accelerationMs2.slice(0,3).map(Number)) : null,
        rotationRadS: Array.isArray(raw.rotationRadS) ? freeze(raw.rotationRadS.slice(0,3).map(Number)) : null,
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
    for (const value of [observation.signal.rssiDbm, observation.signal.rsrpDbm, observation.signal.snrDb]) if (Number.isFinite(value)) return value;
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

  function createSession(options = {}) {
    const profileId = HARDWARE_PROFILES[options.profileId] ? options.profileId : 'generic-receive-json';
    const polling = safePollingConfiguration(options.polling || {}, options.capability || {});
    const preflight = safetyPreflight(options.hardwareState || {});
    if (!preflight.pass) throw new Error(`Live session preflight blocked: ${preflight.blockers.join('; ')}`);
    return {
      format:'hb-ttrpg-live-signals-session', schemaVersion:VERSION, evidenceClass:'empirical-platform-telemetry',
      sessionId:`lsl-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`,
      startedAt:new Date().toISOString(), endedAt:null, profileId, receiveOnly:true,
      polling, preflight, observations:[], notes:[], refinementStage:'capability-inventory',
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
    return freeze({
      observationCount:observations.length, kinds:freeze({...kinds}),
      medianSignal:median(values), q1Signal:percentile(values,.25), q3Signal:percentile(values,.75),
      minimumSignal:values.length?Math.min(...values):null, maximumSignal:values.length?Math.max(...values):null,
      staleFraction:observations.length?staleCount/observations.length:0,
      throttledFraction:observations.length?throttledCount/observations.length:0,
      spatialSamples:observations.filter(row=>Number.isFinite(row.position.localX)&&Number.isFinite(row.position.localY)).length,
      chainTelemetrySamples:observations.filter(row=>row.auxiliary.chainRssiDbm?.length).length
    });
  }

  function buildRefinementPlan(session) {
    const summary = summarizeSession(session);
    const stages = REFINEMENT_STAGES.map(stage => {
      let status = 'pending';
      if (stage.id==='capability-inventory') status='ready';
      if (stage.id==='hardware-baseline' && summary.observationCount>=5) status='ready';
      if (stage.id==='stationary-repeatability' && summary.observationCount>=20) status='ready';
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
      refinementPlan:buildRefinementPlan(session)
    }, null, 2);
  }

  function runtimeState() {
    return freeze({
      version:VERSION, verifiedAt:VERIFIED_AT, browser:browserCapabilities(),
      safety:SAFETY_POLICY, activeSession:Boolean(activeSession),
      activeSummary:activeSession?summarizeSession(activeSession):null
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
    if(data.length<2){ctx.fillStyle='#9eabb5';ctx.fillText('Waiting for signal-bearing observations…',12*dpr,22*dpr);return;}
    const min=Math.min(...data.map(row=>row.value)),max=Math.max(...data.map(row=>row.value)),span=Math.max(1,max-min);
    ctx.strokeStyle='#72d5ff';ctx.lineWidth=2*dpr;ctx.beginPath();data.forEach((row,i)=>{const x=10*dpr+i/(data.length-1)*(w-20*dpr),y=h-15*dpr-(row.value-min)/span*(h-35*dpr);if(!i)ctx.moveTo(x,y);else ctx.lineTo(x,y);});ctx.stroke();
    ctx.fillStyle='#dfe8ee';ctx.fillText(`Signal history · ${min.toFixed(1)} to ${max.toFixed(1)} dB-scale values`,12*dpr,18*dpr);
  }

  function drawSpatial() {
    const canvas=panel?.querySelector('#lsl-spatial'); if(!canvas)return;
    const {w,h,dpr}=fitCanvas(canvas),ctx=canvas.getContext('2d'),rows=(activeSession?.observations||[]).filter(row=>Number.isFinite(row.position.localX)&&Number.isFinite(row.position.localY)&&Number.isFinite(signalValue(row)));
    ctx.clearRect(0,0,w,h);ctx.fillStyle='#081016';ctx.fillRect(0,0,w,h);ctx.font=`${11*dpr}px sans-serif`;
    if(!rows.length){ctx.fillStyle='#9eabb5';ctx.fillText('Add localX/localY to observations to build a live spatial trace.',12*dpr,22*dpr);return;}
    const xs=rows.map(r=>r.position.localX),ys=rows.map(r=>r.position.localY),vs=rows.map(signalValue),xmin=Math.min(...xs),xmax=Math.max(...xs),ymin=Math.min(...ys),ymax=Math.max(...ys),vmin=Math.min(...vs),vmax=Math.max(...vs),xspan=Math.max(.01,xmax-xmin),yspan=Math.max(.01,ymax-ymin),vspan=Math.max(1,vmax-vmin);
    for(const row of rows.slice(-1000)){const x=20*dpr+(row.position.localX-xmin)/xspan*(w-40*dpr),y=h-20*dpr-(row.position.localY-ymin)/yspan*(h-40*dpr),t=(signalValue(row)-vmin)/vspan;ctx.fillStyle=`hsl(${240-240*t} 85% ${45+12*t}%)`;ctx.beginPath();ctx.arc(x,y,3*dpr,0,Math.PI*2);ctx.fill();}
    ctx.fillStyle='#dfe8ee';ctx.fillText(`Local spatial trace · ${rows.length} positioned samples`,12*dpr,18*dpr);
  }

  function profileOptions() { return hardwareProfiles().map(profile=>`<option value="${profile.id}"${profile.id==='android-native'?' selected':''}>${esc(profile.label)}</option>`).join(''); }

  function renderCapabilityMatrix() {
    if(!panel)return;
    const profileId=panel.querySelector('#lsl-profile')?.value||'android-native',matrix=capabilityMatrix(profileId,browserCapabilities()),target=panel.querySelector('[data-lsl-capabilities]');
    target.innerHTML=`<div class="lsl-profile-note"><strong>${esc(matrix.profile.label)}</strong><span>${esc(matrix.profile.class)} · verified capability assumptions ${VERIFIED_AT}</span></div><div class="lsl-table"><table><thead><tr><th>Capability</th><th>Status</th><th>Source/API</th><th>Boundary</th></tr></thead><tbody>${matrix.rows.map(row=>`<tr><td>${esc(row.capability)}</td><td><span class="lsl-badge" data-status="${esc(row.status)}">${esc(row.status)}</span></td><td>${esc(row.source)}</td><td>${esc(row.note)}</td></tr>`).join('')}</tbody></table></div>`;
  }

  function renderSession() {
    if(!panel)return;
    const target=panel.querySelector('[data-lsl-session]');
    if(!activeSession){target.innerHTML='<p>No passive session is active. Run preflight, then start a session.</p>';drawTimeSeries();drawSpatial();return;}
    const summary=summarizeSession(activeSession),plan=buildRefinementPlan(activeSession);
    target.innerHTML=`<div class="lsl-metrics"><div><span>Session</span><strong>${esc(activeSession.sessionId)}</strong></div><div><span>Profile</span><strong>${esc(activeSession.profileId)}</strong></div><div><span>Observations</span><strong>${summary.observationCount}</strong></div><div><span>Median signal</span><strong>${summary.medianSignal===null?'—':summary.medianSignal.toFixed(2)}</strong></div><div><span>Spatial samples</span><strong>${summary.spatialSamples}</strong></div><div><span>Chain telemetry</span><strong>${summary.chainTelemetrySamples}</strong></div><div><span>Stale</span><strong>${(summary.staleFraction*100).toFixed(1)}%</strong></div><div><span>Throttled</span><strong>${(summary.throttledFraction*100).toFixed(1)}%</strong></div></div><div class="lsl-refinement">${plan.map(stage=>`<article data-status="${stage.status}"><span>${esc(stage.label)}</span><strong>${esc(stage.status)}</strong><p>${esc(stage.goal)}</p><small>Exit: ${esc(stage.exit)}</small></article>`).join('')}</div>`;
    const rows=activeSession.observations.slice(-40).reverse();
    panel.querySelector('[data-lsl-observations]').innerHTML=rows.map(row=>`<tr><td>${new Date(row.timestampMs).toLocaleTimeString()}</td><td>${esc(row.kind)}</td><td>${row.signal.frequencyHz?`${(row.signal.frequencyHz/1e6).toFixed(3)} MHz`:'—'}</td><td>${signalValue(row)===null?'—':signalValue(row).toFixed(1)}</td><td>${esc(row.sourceId||'—')}</td><td>${esc(row.provenance)}</td></tr>`).join('')||'<tr><td colspan="6">No observations yet.</td></tr>';
    drawTimeSeries();drawSpatial();
  }

  function readPolling() {
    return safePollingConfiguration({
      sessionMinutes:finite(panel.querySelector('#lsl-session-minutes')?.value,DEFAULT_SESSION_MINUTES),
      wifiScanIntervalMs:finite(panel.querySelector('#lsl-wifi-ms')?.value,MIN_WIFI_SCAN_INTERVAL_MS),
      bleScanPeriodMs:finite(panel.querySelector('#lsl-ble-period-ms')?.value,MIN_BLE_SCAN_PERIOD_MS),
      bleScanWindowMs:finite(panel.querySelector('#lsl-ble-window-ms')?.value,5000),
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
      transmitRequested:false
    };
  }

  function renderPreflight() {
    const preflight=safetyPreflight(readHardwareState()),polling=readPolling(),target=panel.querySelector('[data-lsl-preflight]');
    target.innerHTML=`<div class="lsl-safety ${preflight.pass?'pass':'blocked'}"><strong>${preflight.pass?'PASSIVE PREFLIGHT PASS':'SESSION BLOCKED'}</strong><span>${preflight.blockers.length?esc(preflight.blockers.join('; ')):'Receive-only mode; no transmitter controls are exposed.'}</span>${preflight.warnings.length?`<small>${esc(preflight.warnings.join('; '))}</small>`:''}</div><div class="lsl-metrics"><div><span>Wi-Fi scan floor</span><strong>${(polling.wifiScanIntervalMs/1000).toFixed(0)} s</strong></div><div><span>BLE window / period</span><strong>${(polling.bleScanWindowMs/1000).toFixed(1)} / ${(polling.bleScanPeriodMs/1000).toFixed(0)} s</strong></div><div><span>Sensor rate cap</span><strong>${polling.sensorHz.toFixed(0)} Hz</strong></div><div><span>Session limit</span><strong>${polling.sessionMinutes.toFixed(0)} min</strong></div></div>`;
    return preflight;
  }

  function buildPanel() {
    if(!root?.document) throw new Error('Live Signals Laboratory requires a browser document.');
    const existing=root.document.getElementById(PANEL_ID); if(existing){panel=existing;return panel;} ensureStyle();
    panel=root.document.createElement('section');panel.id=PANEL_ID;panel.className='lsl-shell';panel.hidden=true;
    panel.innerHTML=`<div class="lsl-backdrop" data-lsl-close></div><div class="lsl-panel" role="dialog" aria-modal="true" aria-labelledby="lsl-title"><header class="lsl-header"><div><p class="lsl-eyebrow">Signals Suite · empirical receive-side instrumentation</p><h2 id="lsl-title">Live Signals Laboratory</h2><p>Separate from the simulation laboratory. Ingest passive Wi-Fi, Bluetooth/BLE, cellular, router/AP, ranging and mobile sensor telemetry through capability-aware bridges, refine experimental procedures, and preserve hardware/platform limits.</p></div><button class="lsl-close" data-lsl-close aria-label="Close Live Signals Laboratory">×</button></header><div class="lsl-body"><aside class="lsl-controls"><section class="lsl-card lsl-lock"><h3>Hardware safety lock</h3><p><strong>Receive-only is mandatory.</strong> This module does not expose TX power, channel, antenna-chain selection, modulation, packet injection, deauthentication or continuous-transmit controls.</p><label>Thermal state<select id="lsl-thermal"><option>nominal</option><option>fair</option><option>serious</option><option>severe</option><option>critical</option></select></label><label>Battery %<input id="lsl-battery" type="number" min="0" max="100" value="100"></label><label class="lsl-check"><input id="lsl-external-power" type="checkbox"> External power connected</label><label class="lsl-check"><input id="lsl-redact" type="checkbox" checked> Redact network/device identifiers and geographic coordinates</label><button class="lsl-secondary" data-lsl-preflight-button>Run passive preflight</button><div data-lsl-preflight></div></section><section class="lsl-card"><h3>Acquisition profile</h3><label>Hardware bridge<select id="lsl-profile">${profileOptions()}</select></label><label>Session minutes<input id="lsl-session-minutes" type="number" min="1" max="${MAX_SESSION_MINUTES}" value="${DEFAULT_SESSION_MINUTES}"></label><label>Wi-Fi scan interval ms<input id="lsl-wifi-ms" type="number" value="${MIN_WIFI_SCAN_INTERVAL_MS}"></label><label>BLE scan window ms<input id="lsl-ble-window-ms" type="number" value="5000"></label><label>BLE scan period ms<input id="lsl-ble-period-ms" type="number" value="${MIN_BLE_SCAN_PERIOD_MS}"></label><label>Cellular poll ms<input id="lsl-cell-ms" type="number" value="3000"></label><label>GNSS poll ms<input id="lsl-gnss-ms" type="number" value="1000"></label><label>Router telemetry poll ms<input id="lsl-router-ms" type="number" value="3000"></label><label>Context sensor Hz<input id="lsl-sensor-hz" type="number" min="1" max="${MAX_SENSOR_HZ}" value="${DEFAULT_SENSOR_HZ}"></label><button class="lsl-primary" data-lsl-start>Start passive session</button><button class="lsl-secondary" data-lsl-stop>Stop session</button></section><section class="lsl-card"><h3>Bridge observation ingest</h3><p>Native mobile apps or a local router bridge should send normalized JSON observations. Manual ingest is available now for contract testing.</p><textarea id="lsl-json" rows="12" spellcheck="false">{"kind":"wifi","adapterId":"android-native","frequencyHz":2437000000,"rssiDbm":-58,"sourceId":"00:11:22:33:44:55","localX":0,"localY":0,"headingDeg":0,"provenance":"reported-by-platform"}</textarea><button class="lsl-primary" data-lsl-ingest>Ingest observation JSON</button><button class="lsl-secondary" data-lsl-copy>Copy session JSON</button><div class="lsl-status" data-lsl-status>Ready.</div></section></aside><main class="lsl-workspace"><section class="lsl-card"><div class="lsl-section-head"><h3>Capability matrix</h3><span>actual public/platform exposure, not assumed raw RF access</span></div><div data-lsl-capabilities></div></section><section class="lsl-card"><div class="lsl-section-head"><h3>Passive session & refinement procedure</h3><span>empirical telemetry remains separate from simulation</span></div><div data-lsl-session></div></section><section class="lsl-card"><div class="lsl-section-head"><h3>Live signal history</h3><span>RSSI / RSRP / SNR when reported</span></div><canvas id="lsl-timeseries" class="lsl-canvas"></canvas></section><section class="lsl-card"><div class="lsl-section-head"><h3>Local spatial trace</h3><span>requires measured localX/localY anchors</span></div><canvas id="lsl-spatial" class="lsl-canvas"></canvas></section><section class="lsl-card"><h3>Recent normalized observations</h3><div class="lsl-table"><table><thead><tr><th>Time</th><th>Kind</th><th>Frequency</th><th>Signal</th><th>Source</th><th>Provenance</th></tr></thead><tbody data-lsl-observations><tr><td colspan="6">No observations yet.</td></tr></tbody></table></div></section><section class="lsl-boundary"><strong>Measurement boundary:</strong> mobile operating systems often expose derived telemetry rather than raw spectrum/IQ data. The laboratory records what the platform or read-only hardware bridge actually reports, together with timestamps, permissions, stale/throttled state and device context. Missing radio telemetry is marked unavailable rather than inferred. Passive measurements can still contain sensitive network/location information, so identifier/location redaction is enabled by default.</section></main></div></div>`;
    root.document.body.appendChild(panel);
    panel.querySelectorAll('[data-lsl-close]').forEach(node=>node.addEventListener('click',closePanel));
    panel.querySelector('#lsl-profile')?.addEventListener('change',renderCapabilityMatrix);
    for(const id of ['#lsl-thermal','#lsl-battery','#lsl-external-power','#lsl-redact','#lsl-session-minutes','#lsl-wifi-ms','#lsl-ble-window-ms','#lsl-ble-period-ms','#lsl-cell-ms','#lsl-gnss-ms','#lsl-router-ms','#lsl-sensor-hz']) panel.querySelector(id)?.addEventListener('change',renderPreflight);
    panel.querySelector('[data-lsl-preflight-button]')?.addEventListener('click',renderPreflight);
    panel.querySelector('[data-lsl-start]')?.addEventListener('click',()=>{try{activeSession=createSession({profileId:panel.querySelector('#lsl-profile')?.value,polling:readPolling(),hardwareState:readHardwareState()});renderSession();setStatus('Passive session started. Awaiting receive-side telemetry.','success');}catch(error){setStatus(error.message,'error');}});
    panel.querySelector('[data-lsl-stop]')?.addEventListener('click',()=>{if(activeSession&&!activeSession.endedAt)activeSession.endedAt=new Date().toISOString();renderSession();setStatus('Session stopped.','success');});
    panel.querySelector('[data-lsl-ingest]')?.addEventListener('click',()=>{try{if(!activeSession)throw new Error('Start a passive session before ingesting telemetry.');const raw=JSON.parse(panel.querySelector('#lsl-json').value);appendObservation(activeSession,raw);renderSession();setStatus('Observation ingested.','success');}catch(error){setStatus(error.message,'error');}});
    panel.querySelector('[data-lsl-copy]')?.addEventListener('click',async()=>{try{if(!activeSession)throw new Error('No session to copy.');await root.navigator?.clipboard?.writeText(serializeSession(activeSession));setStatus('Session JSON copied.','success');}catch(error){setStatus(error.message,'error');}});
    renderCapabilityMatrix();renderPreflight();renderSession();return panel;
  }

  function setStatus(message,kind='') { const node=panel?.querySelector('[data-lsl-status]');if(!node)return;node.textContent=message;node.dataset.kind=kind; }
  function openPanel(options={}) { const target=buildPanel();target.hidden=false;root.document.body.classList.add('lsl-open');if(options.profileId&&HARDWARE_PROFILES[options.profileId]){target.querySelector('#lsl-profile').value=options.profileId;renderCapabilityMatrix();}renderPreflight();renderSession();return target; }
  function closePanel(){if(!panel)return;panel.hidden=true;root?.document?.body?.classList.remove('lsl-open');}
  function ingestObservation(raw,context={}){if(!activeSession)throw new Error('Start a passive session before ingesting telemetry.');const observation=appendObservation(activeSession,raw,context);if(panel&&!panel.hidden)renderSession();return observation;}
  function currentState(){return freeze({panelOpen:Boolean(panel&&!panel.hidden),activeSession:activeSession?freeze({...activeSession,observations:freeze([...activeSession.observations])}):null,runtime:runtimeState()});}

  return freeze({
    openPanel, closePanel, ingestObservation, currentState, createSession, appendObservation, summarizeSession, serializeSession,
    hardwareProfiles, capabilityMatrix, browserCapabilities, safePollingConfiguration, safetyPreflight, assertReceiveOnlyOperation,
    normalizeObservation, refinementStages, buildRefinementPlan,
    constants: freeze({VERSION,PANEL_ID,VERIFIED_AT,MAX_SESSION_MINUTES,DEFAULT_SESSION_MINUTES,MAX_SENSOR_HZ,DEFAULT_SENSOR_HZ,MIN_WIFI_SCAN_INTERVAL_MS,MIN_BLE_SCAN_PERIOD_MS,MAX_BLE_SCAN_WINDOW_MS,MIN_CELL_POLL_MS,MIN_GNSS_POLL_MS,MIN_ROUTER_POLL_MS,MAX_OBSERVATIONS,HARDWARE_PROFILES,SAFETY_POLICY,REFINEMENT_STAGES})
  });
});
