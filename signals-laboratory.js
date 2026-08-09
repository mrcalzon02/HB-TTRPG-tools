(function installSignalsLaboratory(root, factory) {
  'use strict';
  const api = factory(root || globalThis);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.SignalsLaboratory = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function createSignalsLaboratory(root) {
  'use strict';

  const PANEL_ID = 'signals-laboratory';
  const STYLE_ID = 'signals-laboratory-style';
  const C = 299792458;
  const K_B = 1.380649e-23;
  const DEFAULT_TEMPERATURE_K = 290;
  const MAX_SWEEP_POINTS = 1024;
  const MAX_MAP_RESOLUTION = 128;
  const MIN_MAP_RESOLUTION = 12;
  let panel = null;
  let frameHandle = 0;
  let phase = 0;
  let current = null;

  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const finite = (v, fallback = 0) => Number.isFinite(Number(v)) ? Number(v) : fallback;
  const esc = v => String(v ?? '').replace(/[&<>"']/g, ch => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[ch]));
  function fail(message) { throw new Error(message); }
  function positive(value, label) {
    const n = Number(value);
    if (!Number.isFinite(n) || n <= 0) fail(`${label} must be greater than zero.`);
    return n;
  }
  function db20(value) { return 20 * Math.log10(Math.max(Number.MIN_VALUE, Math.abs(value))); }
  function fromDb(value) { return 10 ** (Number(value) / 10); }
  function dbmToMilliwatts(dbm) { return 10 ** (finite(dbm) / 10); }
  function milliwattsToDbm(mw) { return 10 * Math.log10(Math.max(Number.MIN_VALUE, finite(mw))); }
  function degToRad(value) { return finite(value) * Math.PI / 180; }

  function ensureStyle() {
    if (!root?.document || root.document.getElementById(STYLE_ID)) return;
    const link = root.document.createElement('link');
    link.id = STYLE_ID;
    link.rel = 'stylesheet';
    link.href = 'signals-laboratory.css?v=20260809-signals-lab-2';
    root.document.head.appendChild(link);
  }

  function wavelength(frequencyHz) { return C / positive(frequencyHz, 'Frequency'); }
  function resonantFrequency(inductanceH, capacitanceF) {
    return 1 / (2 * Math.PI * Math.sqrt(positive(inductanceH, 'Inductance') * positive(capacitanceF, 'Capacitance')));
  }
  function seriesRlcImpedance(frequencyHz, resistanceOhm, inductanceH, capacitanceF) {
    const omega = 2 * Math.PI * positive(frequencyHz, 'Frequency');
    const resistance = positive(resistanceOhm, 'Resistance');
    const reactance = omega * positive(inductanceH, 'Inductance') - 1 / (omega * positive(capacitanceF, 'Capacitance'));
    return Object.freeze({ resistance, reactance, magnitude: Math.hypot(resistance, reactance), phaseDeg: Math.atan2(reactance, resistance) * 180 / Math.PI });
  }
  function mismatch(frequencyHz, antenna) {
    const z = seriesRlcImpedance(frequencyHz, antenna.resistanceOhm, antenna.inductanceH, antenna.capacitanceF);
    const z0 = positive(antenna.feedOhm || 50, 'Feed impedance');
    const numRe = z.resistance - z0;
    const denRe = z.resistance + z0;
    const denominator = denRe * denRe + z.reactance * z.reactance;
    const gammaRe = (numRe * denRe + z.reactance * z.reactance) / denominator;
    const gammaIm = (z.reactance * denRe - numRe * z.reactance) / denominator;
    const reflectionMagnitude = clamp(Math.hypot(gammaRe, gammaIm), 0, 1);
    const acceptedPowerFraction = clamp(1 - reflectionMagnitude ** 2, 0, 1);
    return Object.freeze({ reflectionMagnitude, acceptedPowerFraction, returnLossDb: reflectionMagnitude ? -20 * Math.log10(reflectionMagnitude) : 300 });
  }
  function resonanceTransfer(frequencyHz, centerHz, q = 8) {
    const f = positive(frequencyHz, 'Frequency');
    const f0 = positive(centerHz, 'Resonant frequency');
    const detuning = f / f0 - f0 / f;
    return 1 / Math.sqrt(1 + Math.max(.01, finite(q, 8)) ** 2 * detuning ** 2);
  }
  function antennaResponse(frequencyHz, antenna) {
    const resonantHz = antenna.resonantHz || resonantFrequency(antenna.inductanceH, antenna.capacitanceF);
    const resonance = resonanceTransfer(frequencyHz, resonantHz, antenna.q);
    const match = mismatch(frequencyHz, antenna);
    const voltageTransfer = resonance * Math.sqrt(match.acceptedPowerFraction);
    return Object.freeze({ resonantHz, resonance, mismatch: match, voltageTransfer, responseDb: db20(voltageTransfer) });
  }
  function freeSpacePathLossDb(frequencyHz, distanceM) {
    return 20 * Math.log10(4 * Math.PI * positive(distanceM, 'Distance') / wavelength(frequencyHz));
  }
  function planeWaveFieldVPerM(txPowerDbm, txGainDb, distanceM) {
    const watts = 10 ** ((finite(txPowerDbm) - 30) / 10);
    return Math.sqrt(30 * watts * fromDb(finite(txGainDb))) / positive(distanceM, 'Distance');
  }
  function thermalNoiseFloorDbm(bandwidthHz, noiseFigureDb = 0, temperatureK = DEFAULT_TEMPERATURE_K) {
    const watts = K_B * positive(temperatureK, 'Temperature') * positive(bandwidthHz, 'Bandwidth');
    return 10 * Math.log10(watts / 1e-3) + finite(noiseFigureDb);
  }
  function directReception(options) {
    const response = antennaResponse(options.frequencyHz, options.antenna);
    const fsplDb = freeSpacePathLossDb(options.frequencyHz, options.distanceM);
    const freeSpaceDbm = finite(options.txPowerDbm) + finite(options.txGainDb) + finite(options.rxGainDb) - fsplDb - Math.max(0, finite(options.extraLossDb));
    const receiverInputDbm = freeSpaceDbm + Math.min(0, response.responseDb);
    const noiseFloorDbm = thermalNoiseFloorDbm(options.receiverBandwidthHz, options.noiseFigureDb, options.temperatureK || DEFAULT_TEMPERATURE_K);
    return Object.freeze({ response, fsplDb, freeSpaceDbm, receiverInputDbm, noiseFloorDbm, snrDb: receiverInputDbm - noiseFloorDbm, inReceiverBand: Math.abs(options.frequencyHz - options.receiverCenterHz) <= options.receiverBandwidthHz / 2 });
  }

  function heterodyneProducts(signalHz, localOscillatorHz) {
    const signal = positive(signalHz, 'Signal frequency');
    const lo = positive(localOscillatorHz, 'Local oscillator');
    return Object.freeze({ signalHz: signal, localOscillatorHz: lo, differenceHz: Math.abs(signal - lo), sumHz: signal + lo });
  }
  function intermodulationProducts(f1Value, f2Value, maximumOrder = 3) {
    const f1 = positive(f1Value, 'Tone 1');
    const f2 = positive(f2Value, 'Tone 2');
    const limit = clamp(Math.floor(finite(maximumOrder, 3)), 2, 5);
    const map = new Map();
    for (let m = -limit; m <= limit; m += 1) for (let n = -limit; n <= limit; n += 1) {
      const order = Math.abs(m) + Math.abs(n);
      if (!order || order > limit) continue;
      const frequencyHz = Math.abs(m * f1 + n * f2);
      if (frequencyHz < 1) continue;
      const key = Math.round(frequencyHz * 1e3) / 1e3;
      if (!map.has(key) || map.get(key).order > order) map.set(key, Object.freeze({ frequencyHz, order, m, n, expression: `${m}·f1 ${n < 0 ? '−' : '+'} ${Math.abs(n)}·f2` }));
    }
    return Object.freeze([...map.values()].sort((a,b) => a.frequencyHz - b.frequencyHz));
  }
  function adjacentCarrierProbe(options) {
    const carrierHz = positive(options.carrierHz, 'Carrier');
    const sourceHz = positive(options.sourceHz, 'Source');
    const receiverCenterHz = positive(options.receiverCenterHz, 'Receiver center');
    const bandwidthHz = positive(options.receiverBandwidthHz, 'Receiver bandwidth');
    const coupling = clamp(finite(options.coupling, .02), 0, 1);
    const nonlinearity = Math.max(0, finite(options.nonlinearity, .02));
    const carrierAmplitude = Math.max(1e-12, finite(options.carrierAmplitude, 1));
    const sourceAmplitude = Math.max(0, finite(options.sourceAmplitude, .1));
    const beatHz = Math.abs(sourceHz - carrierHz);
    const modulationIndex = clamp(coupling * nonlinearity * sourceAmplitude / carrierAmplitude, 0, 1);
    const products = intermodulationProducts(carrierHz, sourceHz, 3).map(product => Object.freeze({ ...product, inReceiverBand: Math.abs(product.frequencyHz - receiverCenterHz) <= bandwidthHz / 2 }));
    return Object.freeze({ carrierHz, sourceHz, beatHz, modulationIndex, estimatedSidebandAmplitude: carrierAmplitude * modulationIndex / 2, products: Object.freeze(products), inBandProducts: Object.freeze(products.filter(item => item.inReceiverBand)) });
  }
  function inferSourceCandidates(options) {
    const observedHz = Math.max(0, finite(options.observedHz));
    const lo = options.localOscillatorHz ? positive(options.localOscillatorHz, 'Local oscillator') : null;
    const carrier = options.carrierHz ? positive(options.carrierHz, 'Carrier') : null;
    const rows = [];
    const add = (frequencyHz, mechanism, equation) => { if (frequencyHz >= 1 && !rows.some(row => Math.abs(row.frequencyHz - frequencyHz) < 1e-6 && row.mechanism === mechanism)) rows.push(Object.freeze({ frequencyHz, mechanism, equation })); };
    if (lo) { add(lo + observedHz, 'heterodyne difference', 'fRF = fLO + fIF'); add(Math.abs(lo - observedHz), 'heterodyne image', 'fRF = |fLO − fIF|'); }
    if (carrier) { add(carrier + observedHz, 'carrier beat / sideband', 'fX = fC + fbeat'); add(Math.abs(carrier - observedHz), 'carrier beat / sideband', 'fX = |fC − fbeat|'); add(2 * carrier + observedHz, 'third-order candidate', 'fX = 2fC + fobs'); add(Math.abs(2 * carrier - observedHz), 'third-order candidate', 'fX = |2fC − fobs|'); }
    return Object.freeze(rows.sort((a,b) => a.frequencyHz - b.frequencyHz));
  }
  function estimateRangeScenarios(options) {
    const lambda = wavelength(options.frequencyHz);
    const receivedDbm = finite(options.receivedDbm);
    return Object.freeze((options.txPowersDbm || [-10,0,10,20,30,40,50]).map(txPowerDbm => {
      const allowedPathLossDb = txPowerDbm + finite(options.txGainDb) + finite(options.rxGainDb) - Math.max(0, finite(options.extraLossDb)) - receivedDbm;
      return Object.freeze({ txPowerDbm, allowedPathLossDb, distanceM: lambda / (4 * Math.PI) * 10 ** (allowedPathLossDb / 20) });
    }));
  }
  function logarithmicSweep(minHzValue, maxHzValue, pointsValue = 256) {
    const minHz = positive(minHzValue, 'Sweep minimum');
    const maxHz = positive(maxHzValue, 'Sweep maximum');
    if (maxHz <= minHz) fail('Sweep maximum must exceed the minimum.');
    const points = clamp(Math.floor(finite(pointsValue, 256)), 16, MAX_SWEEP_POINTS);
    const a = Math.log(minHz), span = Math.log(maxHz) - a;
    return Array.from({ length: points }, (_, index) => Math.exp(a + span * index / (points - 1)));
  }
  function sweepAntenna(options) {
    return Object.freeze(logarithmicSweep(options.minHz, options.maxHz, options.points).map(frequencyHz => {
      const response = antennaResponse(frequencyHz, options.antenna);
      const impedance = seriesRlcImpedance(frequencyHz, options.antenna.resistanceOhm, options.antenna.inductanceH, options.antenna.capacitanceF);
      return Object.freeze({ frequencyHz, responseDb: response.responseDb, impedanceMagnitudeOhm: impedance.magnitude, phaseDeg: impedance.phaseDeg, returnLossDb: response.mismatch.returnLossDb });
    }));
  }

  function vectorLength(v) { return Math.hypot(v.x, v.y, v.z); }
  function normalizeVector(v) {
    const length = vectorLength(v) || 1;
    return Object.freeze({ x: v.x / length, y: v.y / length, z: v.z / length });
  }
  function antennaAxis(azimuthDeg = 0, elevationDeg = 90) {
    const az = degToRad(azimuthDeg), el = degToRad(elevationDeg);
    return normalizeVector({ x: Math.cos(el) * Math.cos(az), y: Math.cos(el) * Math.sin(az), z: Math.sin(el) });
  }
  function halfWaveDipolePowerPattern(thetaRad) {
    const s = Math.sin(thetaRad);
    if (Math.abs(s) < 1e-9) return 0;
    const field = Math.cos((Math.PI / 2) * Math.cos(thetaRad)) / s;
    return clamp(field * field, 0, 1);
  }
  function monopolePowerPattern(thetaRad) {
    return halfWaveDipolePowerPattern(thetaRad);
  }
  function sourceDirectionalGainDb(source, direction) {
    const type = String(source.antennaType || 'isotropic').toLowerCase();
    if (type === 'isotropic') return finite(source.baseGainDb, 0);
    const axis = antennaAxis(source.azimuthDeg, source.elevationDeg);
    const d = normalizeVector(direction);
    const theta = Math.acos(clamp(Math.abs(axis.x * d.x + axis.y * d.y + axis.z * d.z), 0, 1));
    const pattern = type === 'monopole' ? monopolePowerPattern(theta) : halfWaveDipolePowerPattern(theta);
    const idealPeakDb = type === 'monopole' ? 5.15 : 2.15;
    return finite(source.baseGainDb, idealPeakDb) + 10 * Math.log10(Math.max(1e-8, pattern));
  }
  function mirrorPointAcrossPlane(source, reflector) {
    if (reflector.axis === 'x') return Object.freeze({ x: 2 * reflector.coordinateM - source.x, y: source.y, z: source.z });
    return Object.freeze({ x: source.x, y: 2 * reflector.coordinateM - source.y, z: source.z });
  }
  function crossesPlane(a, b, reflector) {
    const av = reflector.axis === 'x' ? a.x : a.y;
    const bv = reflector.axis === 'x' ? b.x : b.y;
    return (av < reflector.coordinateM && bv > reflector.coordinateM) || (av > reflector.coordinateM && bv < reflector.coordinateM);
  }
  function pathPowerDbm(source, receiver, distanceM, extraLossDb = 0, directionOverride = null) {
    const direction = directionOverride || { x: receiver.x - source.x, y: receiver.y - source.y, z: receiver.z - source.z };
    const gainDb = sourceDirectionalGainDb(source, direction);
    return finite(source.txPowerDbm) + gainDb + finite(receiver.gainDb) - freeSpacePathLossDb(source.frequencyHz, Math.max(distanceM, wavelength(source.frequencyHz) / (4 * Math.PI))) - Math.max(0, finite(extraLossDb));
  }
  function reflectedPath(source, receiver, reflector) {
    const image = mirrorPointAcrossPlane(source, reflector);
    const distanceM = Math.max(.001, Math.hypot(receiver.x - image.x, receiver.y - image.y, receiver.z - image.z));
    const reflectionMagnitude = clamp(finite(reflector.reflectivity, .45), 0, .9999);
    const direction = { x: image.x - source.x, y: image.y - source.y, z: image.z - source.z };
    const baseDbm = pathPowerDbm(source, receiver, distanceM, finite(reflector.reflectionLossDb), direction);
    const reflectedDbm = baseDbm + 20 * Math.log10(Math.max(1e-9, reflectionMagnitude));
    return Object.freeze({ distanceM, powerDbm: reflectedDbm, phaseRad: -2 * Math.PI * distanceM / wavelength(source.frequencyHz) + degToRad(reflector.phaseDeg), mechanism: `reflection-${reflector.axis}` });
  }
  function environmentPoint(options) {
    const source = options.source;
    const receiver = options.receiver;
    const reflectors = options.reflectors || [];
    const coherence = clamp(finite(options.coherence, 1), 0, 1);
    const directDistanceM = Math.max(.001, Math.hypot(receiver.x - source.x, receiver.y - source.y, receiver.z - source.z));
    let penetrationLossDb = 0;
    for (const reflector of reflectors) if (crossesPlane(source, receiver, reflector)) penetrationLossDb += Math.max(0, finite(reflector.penetrationLossDb));
    const directDbm = pathPowerDbm(source, receiver, directDistanceM, penetrationLossDb);
    const paths = [{ distanceM: directDistanceM, powerDbm: directDbm, phaseRad: -2 * Math.PI * directDistanceM / wavelength(source.frequencyHz), mechanism: 'direct' }];
    for (const reflector of reflectors) if (finite(reflector.reflectivity, 0) > 0) paths.push(reflectedPath(source, receiver, reflector));
    let real = 0, imag = 0, incoherentMw = 0;
    for (const path of paths) {
      const powerMw = dbmToMilliwatts(path.powerDbm);
      const amplitude = Math.sqrt(powerMw);
      real += amplitude * Math.cos(path.phaseRad);
      imag += amplitude * Math.sin(path.phaseRad);
      incoherentMw += powerMw;
    }
    const coherentMw = real * real + imag * imag;
    const blendedMw = coherence * coherentMw + (1 - coherence) * incoherentMw;
    return Object.freeze({ powerDbm: milliwattsToDbm(blendedMw), directDbm, coherentDbm: milliwattsToDbm(coherentMw), incoherentDbm: milliwattsToDbm(incoherentMw), penetrationLossDb, paths: Object.freeze(paths) });
  }
  function buildEnvironmentMap(options) {
    const widthM = positive(options.widthM, 'Map width');
    const heightM = positive(options.heightM, 'Map height');
    const resolutionX = clamp(Math.floor(finite(options.resolutionX, 48)), MIN_MAP_RESOLUTION, MAX_MAP_RESOLUTION);
    const resolutionY = clamp(Math.floor(finite(options.resolutionY, resolutionX)), MIN_MAP_RESOLUTION, MAX_MAP_RESOLUTION);
    const values = new Float64Array(resolutionX * resolutionY);
    let minimumDbm = Infinity, maximumDbm = -Infinity, sumDbm = 0;
    const sampleHeightM = finite(options.sampleHeightM, 1.2);
    for (let yIndex = 0; yIndex < resolutionY; yIndex += 1) {
      const y = -heightM / 2 + (yIndex + .5) * heightM / resolutionY;
      for (let xIndex = 0; xIndex < resolutionX; xIndex += 1) {
        const x = -widthM / 2 + (xIndex + .5) * widthM / resolutionX;
        const point = environmentPoint({ source: options.source, receiver: { x, y, z: sampleHeightM, gainDb: finite(options.receiverGainDb) }, reflectors: options.reflectors, coherence: options.coherence });
        const index = yIndex * resolutionX + xIndex;
        values[index] = point.powerDbm;
        minimumDbm = Math.min(minimumDbm, point.powerDbm);
        maximumDbm = Math.max(maximumDbm, point.powerDbm);
        sumDbm += point.powerDbm;
      }
    }
    return Object.freeze({ widthM, heightM, resolutionX, resolutionY, sampleHeightM, minimumDbm, maximumDbm, meanDbm: sumDbm / values.length, fadeDepthDb: maximumDbm - minimumDbm, values });
  }
  function progressiveEnvironmentMaps(options) {
    const stages = (options.resolutions || [24, 48, 80]).map(value => clamp(Math.floor(finite(value, 48)), MIN_MAP_RESOLUTION, MAX_MAP_RESOLUTION));
    return Object.freeze(stages.map(resolution => buildEnvironmentMap({ ...options, resolutionX: resolution, resolutionY: resolution })));
  }
  function wifiPreset(name = 'wifi-2.4') {
    const presets = {
      'wifi-2.4': { label: 'Wi‑Fi 2.4 GHz example', frequencyHz: 2.437e9, txPowerDbm: 20 },
      'wifi-5': { label: 'Wi‑Fi 5 GHz example', frequencyHz: 5.18e9, txPowerDbm: 20 },
      'wifi-6': { label: 'Wi‑Fi 6 GHz example', frequencyHz: 6.2e9, txPowerDbm: 20 },
      custom: { label: 'Custom RF source', frequencyHz: 915e6, txPowerDbm: 20 }
    };
    return Object.freeze({ ...(presets[name] || presets['wifi-2.4']) });
  }

  function defaultEnvironmentConfig(config) {
    const source = Object.freeze({ x:0, y:0, z:1.8, frequencyHz:positive(config?.sourceHz || 2.437e9, 'Map source frequency'), txPowerDbm:finite(config?.txPowerDbm, 20), antennaType:'dipole', azimuthDeg:0, elevationDeg:90, baseGainDb:Number.NaN });
    return Object.freeze({ widthM:24, heightM:18, resolutionX:24, resolutionY:24, sampleHeightM:1.2, receiverGainDb:0, coherence:.85, source, reflectors:Object.freeze([]) });
  }
  function analyzeConfiguration(config) {
    const direct = directReception({ frequencyHz: config.sourceHz, distanceM: config.distanceM, txPowerDbm: config.txPowerDbm, txGainDb: config.txGainDb, rxGainDb: config.rxGainDb, extraLossDb: config.extraLossDb, antenna: config.antenna, receiverCenterHz: config.receiverCenterHz, receiverBandwidthHz: config.receiverBandwidthHz, noiseFigureDb: config.noiseFigureDb });
    const heterodyne = heterodyneProducts(config.sourceHz, config.localOscillatorHz);
    const probe = adjacentCarrierProbe({ carrierHz: config.carrierHz, sourceHz: config.sourceHz, receiverCenterHz: config.receiverCenterHz, receiverBandwidthHz: config.receiverBandwidthHz, coupling: config.coupling, nonlinearity: config.nonlinearity, carrierAmplitude: config.carrierAmplitude, sourceAmplitude: config.sourceAmplitude });
    const sweep = sweepAntenna({ minHz: config.sweepMinHz, maxHz: config.sweepMaxHz, points: config.sweepPoints, antenna: config.antenna });
    const inference = inferSourceCandidates({ observedHz: config.observedHz, localOscillatorHz: config.localOscillatorHz, carrierHz: config.carrierHz });
    const ranges = estimateRangeScenarios({ receivedDbm: direct.receiverInputDbm, frequencyHz: config.sourceHz, txGainDb: config.txGainDb, rxGainDb: config.rxGainDb, extraLossDb: config.extraLossDb });
    const environment = buildEnvironmentMap(config.environment || defaultEnvironmentConfig(config));
    return Object.freeze({ direct, heterodyne, probe, sweep, inference, ranges, environment, sourceFieldVPerM: planeWaveFieldVPerM(config.txPowerDbm, config.txGainDb, config.distanceM) });
  }

  function hz(value) { const f = Math.abs(value); return f >= 1e9 ? `${(f/1e9).toFixed(6)} GHz` : f >= 1e6 ? `${(f/1e6).toFixed(6)} MHz` : f >= 1e3 ? `${(f/1e3).toFixed(3)} kHz` : `${f.toFixed(3)} Hz`; }
  function eng(value, unit='') { const n=Number(value)||0,a=Math.abs(n); if(a>=1e6)return `${(n/1e6).toFixed(3)} M${unit}`; if(a>=1e3)return `${(n/1e3).toFixed(3)} k${unit}`; if(a>=1)return `${n.toFixed(3)} ${unit}`.trim(); if(a>=1e-3)return `${(n*1e3).toFixed(3)} m${unit}`; if(a>=1e-6)return `${(n*1e6).toFixed(3)} µ${unit}`; return `${n.toExponential(3)} ${unit}`.trim(); }
  function num(selector, scale=1) { return finite(panel.querySelector(selector)?.value) * scale; }
  function readConfig() {
    const inductanceH = num('#sl-inductance-uh',1e-6), capacitanceF = num('#sl-capacitance-pf',1e-12);
    const preset = wifiPreset(panel.querySelector('#sl-map-preset')?.value || 'wifi-2.4');
    const mapFrequencyHz = panel.querySelector('#sl-map-preset')?.value === 'custom' ? num('#sl-map-frequency-mhz', 1e6) : preset.frequencyHz;
    const mapTxPowerDbm = num('#sl-map-tx-dbm');
    const source = Object.freeze({
      x: num('#sl-map-source-x'), y: num('#sl-map-source-y'), z: num('#sl-map-source-z'),
      frequencyHz: mapFrequencyHz, txPowerDbm: mapTxPowerDbm,
      antennaType: panel.querySelector('#sl-map-antenna')?.value || 'dipole',
      azimuthDeg: num('#sl-map-azimuth'), elevationDeg: num('#sl-map-elevation'),
      baseGainDb: Number.NaN
    });
    const reflectivity = num('#sl-map-reflectivity');
    const penetrationLossDb = num('#sl-map-penetration-loss');
    const phaseDeg = num('#sl-map-reflection-phase');
    const reflectors = Object.freeze([
      Object.freeze({ axis:'x', coordinateM:num('#sl-map-wall-x'), reflectivity, penetrationLossDb, phaseDeg, reflectionLossDb:0 }),
      Object.freeze({ axis:'y', coordinateM:num('#sl-map-wall-y'), reflectivity, penetrationLossDb, phaseDeg, reflectionLossDb:0 })
    ]);
    return Object.freeze({
      sourceHz:num('#sl-source-mhz',1e6), txPowerDbm:num('#sl-tx-dbm'), txGainDb:num('#sl-tx-gain'), rxGainDb:num('#sl-rx-gain'), distanceM:num('#sl-distance-m'), extraLossDb:num('#sl-extra-loss'), receiverCenterHz:num('#sl-rx-center-mhz',1e6), receiverBandwidthHz:num('#sl-rx-bandwidth-khz',1e3), noiseFigureDb:num('#sl-noise-figure'), localOscillatorHz:num('#sl-lo-mhz',1e6), carrierHz:num('#sl-carrier-mhz',1e6), coupling:num('#sl-coupling'), nonlinearity:num('#sl-nonlinearity'), carrierAmplitude:num('#sl-carrier-amplitude'), sourceAmplitude:num('#sl-source-amplitude'), observedHz:num('#sl-observed-khz',1e3), sweepMinHz:num('#sl-sweep-min-mhz',1e6), sweepMaxHz:num('#sl-sweep-max-mhz',1e6), sweepPoints:num('#sl-sweep-points'),
      antenna:Object.freeze({ resonantHz:resonantFrequency(inductanceH,capacitanceF), resistanceOhm:num('#sl-resistance-ohm'), inductanceH, capacitanceF, q:num('#sl-q'), feedOhm:num('#sl-feed-ohm') }),
      environment:Object.freeze({ widthM:num('#sl-map-width'), heightM:num('#sl-map-height'), resolutionX:num('#sl-map-resolution'), resolutionY:num('#sl-map-resolution'), sampleHeightM:num('#sl-map-sample-height'), receiverGainDb:0, coherence:num('#sl-map-coherence'), source, reflectors })
    });
  }
  function fitCanvas(canvas) { const rect=canvas.getBoundingClientRect(),dpr=root.devicePixelRatio||1,w=Math.max(320,Math.floor(rect.width*dpr)),h=Math.max(200,Math.floor(rect.height*dpr)); if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;} return {w,h,dpr}; }
  function grid(ctx,w,h){ctx.strokeStyle='rgba(150,180,200,.12)';ctx.lineWidth=1;const step=Math.max(34,Math.floor(w/14));for(let x=0;x<w;x+=step){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,h);ctx.stroke();}for(let y=0;y<h;y+=step){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke();}}
  function drawField(state) {
    const canvas=panel?.querySelector('#sl-field-canvas'); if(!canvas||!state)return; const {w,h,dpr}=fitCanvas(canvas),ctx=canvas.getContext('2d'); ctx.clearRect(0,0,w,h); grid(ctx,w,h);
    const cycles=clamp(2+Math.log10(Math.max(1,state.config.sourceHz/1e3)),2,10),amp=h*.18*clamp(state.analysis.direct.response.voltageTransfer*2+.08,.08,1); const center=h*.5;
    const wave=(color,quadrature)=>{ctx.strokeStyle=color;ctx.lineWidth=2*dpr;ctx.beginPath();for(let i=0;i<=180;i++){const t=i/180,x=w*.06+t*w*.88,y=center+Math.sin(t*cycles*Math.PI*2-phase+quadrature)*amp*(quadrature?Math.cos(.65):1);if(!i)ctx.moveTo(x,y);else ctx.lineTo(x,y);}ctx.stroke();}; wave('#72d5ff',0); wave('#ffb86c',Math.PI/2);
    ctx.strokeStyle='#f2f6f8';ctx.lineWidth=4*dpr;ctx.beginPath();ctx.moveTo(w*.5,h*.18);ctx.lineTo(w*.5,h*.82);ctx.stroke();ctx.fillStyle='#d8e0e6';ctx.font=`${12*dpr}px sans-serif`;ctx.fillText(`E/H field · λ ${eng(wavelength(state.config.sourceHz),'m')}`,12*dpr,20*dpr);
  }
  function drawSweep(state) {
    const canvas=panel?.querySelector('#sl-spectrum-canvas'); if(!canvas||!state)return; const {w,h,dpr}=fitCanvas(canvas),ctx=canvas.getContext('2d'),rows=state.analysis.sweep; ctx.clearRect(0,0,w,h);grid(ctx,w,h); const min=Math.log10(rows[0].frequencyHz),max=Math.log10(rows.at(-1).frequencyHz),minDb=Math.min(-80,...rows.map(r=>r.responseDb)),maxDb=3; const x=f=>35*dpr+(Math.log10(f)-min)/(max-min)*(w-50*dpr),y=v=>15*dpr+(maxDb-v)/(maxDb-minDb)*(h-38*dpr);ctx.strokeStyle='#72d5ff';ctx.lineWidth=2*dpr;ctx.beginPath();rows.forEach((r,i)=>i?ctx.lineTo(x(r.frequencyHz),y(r.responseDb)):ctx.moveTo(x(r.frequencyHz),y(r.responseDb)));ctx.stroke();
    for(const [label,f,color] of [['SRC',state.config.sourceHz,'#ff8a8a'],['RX',state.config.receiverCenterHz,'#9cff9c'],['LO',state.config.localOscillatorHz,'#ffd166'],['C',state.config.carrierHz,'#d7a8ff']]) if(f>=rows[0].frequencyHz&&f<=rows.at(-1).frequencyHz){const px=x(f);ctx.strokeStyle=color;ctx.beginPath();ctx.moveTo(px,8*dpr);ctx.lineTo(px,h-20*dpr);ctx.stroke();ctx.fillStyle=color;ctx.font=`${10*dpr}px sans-serif`;ctx.fillText(label,px+2*dpr,14*dpr);}
  }
  function mapColor(value, min, max) {
    const t = clamp((value - min) / Math.max(1e-9, max - min), 0, 1);
    const hue = 250 - 250 * t;
    return `hsl(${hue} 86% ${38 + 20 * t}%)`;
  }
  function drawEnvironment(state) {
    const canvas=panel?.querySelector('#sl-environment-canvas'); if(!canvas||!state)return;
    const {w,h,dpr}=fitCanvas(canvas),ctx=canvas.getContext('2d'),map=state.analysis.environment,env=state.config.environment;
    ctx.clearRect(0,0,w,h);
    const cellW=w/map.resolutionX,cellH=h/map.resolutionY;
    for(let yi=0;yi<map.resolutionY;yi+=1)for(let xi=0;xi<map.resolutionX;xi+=1){const value=map.values[yi*map.resolutionX+xi];ctx.fillStyle=mapColor(value,map.minimumDbm,map.maximumDbm);ctx.fillRect(xi*cellW,h-(yi+1)*cellH,Math.ceil(cellW)+1,Math.ceil(cellH)+1);}
    const px=x=>w*(x/map.widthM+.5),py=y=>h*(.5-y/map.heightM);
    ctx.lineWidth=2*dpr;ctx.strokeStyle='rgba(255,255,255,.82)';
    for(const reflector of env.reflectors){ctx.beginPath();if(reflector.axis==='x'){ctx.moveTo(px(reflector.coordinateM),0);ctx.lineTo(px(reflector.coordinateM),h);}else{ctx.moveTo(0,py(reflector.coordinateM));ctx.lineTo(w,py(reflector.coordinateM));}ctx.stroke();}
    ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(px(env.source.x),py(env.source.y),5*dpr,0,Math.PI*2);ctx.fill();ctx.font=`${11*dpr}px sans-serif`;ctx.fillText(`${env.source.antennaType} · ${hz(env.source.frequencyHz)}`,10*dpr,18*dpr);
  }
  function render(state) {
    const target=panel.querySelector('[data-sl-results]'),a=state.analysis,c=state.config,z=seriesRlcImpedance(c.sourceHz,c.antenna.resistanceOhm,c.antenna.inductanceH,c.antenna.capacitanceF),m=a.environment;
    const candidates=a.inference.map(row=>`<tr><td>${esc(hz(row.frequencyHz))}</td><td>${esc(row.mechanism)}</td><td><code>${esc(row.equation)}</code></td></tr>`).join('')||'<tr><td colspan="3">No candidates.</td></tr>';
    const products=a.probe.products.slice(0,14).map(row=>`<tr><td>${esc(hz(row.frequencyHz))}</td><td>${row.order}</td><td>${esc(row.expression)}</td><td>${row.inReceiverBand?'IN BAND':'outside'}</td></tr>`).join('');
    const ranges=a.ranges.map(row=>`<tr><td>${row.txPowerDbm} dBm</td><td>${eng(row.distanceM,'m')}</td><td>${row.allowedPathLossDb.toFixed(2)} dB</td></tr>`).join('');
    target.innerHTML=`<section class="sl-card"><h3>Environment map summary</h3><div class="sl-metrics"><div><span>Map frequency</span><strong>${hz(c.environment.source.frequencyHz)}</strong></div><div><span>Source geometry</span><strong>${esc(c.environment.source.antennaType)}</strong></div><div><span>Resolution</span><strong>${m.resolutionX} × ${m.resolutionY}</strong></div><div><span>Strongest cell</span><strong>${m.maximumDbm.toFixed(2)} dBm</strong></div><div><span>Weakest cell</span><strong>${m.minimumDbm.toFixed(2)} dBm</strong></div><div><span>Mean map level</span><strong>${m.meanDbm.toFixed(2)} dBm</strong></div><div><span>Multipath fade span</span><strong>${m.fadeDepthDb.toFixed(2)} dB</strong></div><div><span>Coherence</span><strong>${(c.environment.coherence*100).toFixed(1)}%</strong></div></div><p>Wi‑Fi presets are convenience source profiles only. The mapper uses one generalized radiating-source contract, so the same solver can be applied to other RF frequencies, powers, antenna orientations and reflector configurations within the model's far-field approximation.</p></section><section class="sl-card"><h3>Measurement snapshot</h3><div class="sl-metrics"><div><span>Antenna resonance</span><strong>${hz(a.direct.response.resonantHz)}</strong></div><div><span>Source wavelength</span><strong>${eng(wavelength(c.sourceHz),'m')}</strong></div><div><span>Antenna response</span><strong>${a.direct.response.responseDb.toFixed(2)} dB</strong></div><div><span>Impedance</span><strong>${z.magnitude.toFixed(2)} Ω ∠ ${z.phaseDeg.toFixed(1)}°</strong></div><div><span>Path loss</span><strong>${a.direct.fsplDb.toFixed(2)} dB</strong></div><div><span>Receiver input</span><strong>${a.direct.receiverInputDbm.toFixed(2)} dBm</strong></div><div><span>Noise floor</span><strong>${a.direct.noiseFloorDbm.toFixed(2)} dBm</strong></div><div><span>Model SNR</span><strong>${a.direct.snrDb.toFixed(2)} dB</strong></div><div><span>Direct receiver band</span><strong>${a.direct.inReceiverBand?'yes':'no'}</strong></div><div><span>Source field</span><strong>${eng(a.sourceFieldVPerM,'V/m')}</strong></div></div></section><section class="sl-card"><h3>Heterodyne & adjacent-carrier effects</h3><p>The mixer can translate energy that actually couples into the front end; it does not create a signal that produced no physical or correlated effect at the receiver.</p><div class="sl-metrics"><div><span>|RF − LO|</span><strong>${hz(a.heterodyne.differenceHz)}</strong></div><div><span>RF + LO</span><strong>${hz(a.heterodyne.sumHz)}</strong></div><div><span>Carrier beat</span><strong>${hz(a.probe.beatHz)}</strong></div><div><span>Carrier perturbation</span><strong>${(a.probe.modulationIndex*100).toFixed(6)}%</strong></div></div><div class="sl-table"><table><thead><tr><th>Product</th><th>Order</th><th>Expression</th><th>Receiver</th></tr></thead><tbody>${products}</tbody></table></div></section><section class="sl-card"><h3>Frequency inference candidates</h3><p>Mirror/image solutions are kept rather than silently choosing one.</p><div class="sl-table"><table><thead><tr><th>Candidate</th><th>Mechanism</th><th>Equation</th></tr></thead><tbody>${candidates}</tbody></table></div></section><section class="sl-card"><h3>Range scenarios</h3><p>Amplitude does not uniquely determine range without transmitter power, gains, polarization, propagation, and loss assumptions.</p><div class="sl-table"><table><thead><tr><th>Assumed TX</th><th>Implied range</th><th>Allowed loss</th></tr></thead><tbody>${ranges}</tbody></table></div></section><section class="sl-boundary"><strong>Physical boundary:</strong> the RF environment map is a deterministic research model using free-space loss, idealized monopole/dipole patterns, infinite-plane single-bounce reflections, configurable wall penetration, and coherent/incoherent path combination. It is not a full-wave Maxwell/FDTD solver. Out-of-band inference still requires a real coupling, leakage, beat, impedance/loading change, sideband, or nonlinear mixing mechanism above noise and calibration error. Mathematical processing alone cannot reconstruct arbitrary RF energy that never reaches or perturbs the antenna/front end.</section>`;
  }
  function update() { const config=readConfig(),analysis=analyzeConfiguration(config);current=Object.freeze({config,analysis});render(current);drawField(current);drawSweep(current);drawEnvironment(current);const s=panel.querySelector('[data-sl-status]');s.textContent='Model updated.';s.dataset.kind='success';return current; }
  function animate(){if(!panel||panel.hidden){frameHandle=0;return;}if(panel.querySelector('#sl-animate')?.checked&&current){phase+=.055;drawField(current);}frameHandle=root.requestAnimationFrame?.(animate)||0;}
  function applyMapPreset() {
    if (!panel) return;
    const name=panel.querySelector('#sl-map-preset')?.value||'wifi-2.4',preset=wifiPreset(name),frequency=panel.querySelector('#sl-map-frequency-mhz');
    if (frequency) { frequency.disabled=name!=='custom'; if(name!=='custom') frequency.value=String(preset.frequencyHz/1e6); }
  }
  function buildPanel() {
    if (!root?.document) fail('Signals Laboratory requires a browser document.');
    const existing=root.document.getElementById(PANEL_ID); if(existing){panel=existing;return panel;} ensureStyle(); panel=root.document.createElement('section');panel.id=PANEL_ID;panel.className='sl-shell';panel.hidden=true;
    panel.innerHTML=`<div class="sl-backdrop" data-sl-close></div><div class="sl-panel" role="dialog" aria-modal="true" aria-labelledby="sl-title"><header class="sl-header"><div><p class="sl-eyebrow">Scientific Tools · Electromagnetic Signal Research</p><h2 id="sl-title">Signals Laboratory</h2><p>RF field visualization, antenna attenuation/tuning and impedance response, heterodyne translation, adjacent-carrier perturbation, nonlinear mixing, plus monopole/dipole RF environment mapping with coherent reflection and progressive spatial resolution.</p></div><button class="sl-close" data-sl-close aria-label="Close Signals Laboratory">×</button></header><div class="sl-body"><aside class="sl-controls"><section class="sl-card"><h3>RF environment mapper</h3><label>Source preset<select id="sl-map-preset"><option value="wifi-2.4">Wi‑Fi 2.4 GHz example</option><option value="wifi-5">Wi‑Fi 5 GHz example</option><option value="wifi-6">Wi‑Fi 6 GHz example</option><option value="custom">Custom RF source</option></select></label><label>Map frequency (MHz)<input id="sl-map-frequency-mhz" type="number" value="2437" disabled></label><label>Source power (dBm)<input id="sl-map-tx-dbm" type="number" value="20"></label><label>Radiator<select id="sl-map-antenna"><option value="dipole">Half-wave dipole</option><option value="monopole">Quarter-wave monopole / ideal ground plane</option><option value="isotropic">Isotropic reference</option></select></label><label>Antenna azimuth (deg)<input id="sl-map-azimuth" type="number" value="0"></label><label>Antenna elevation (deg)<input id="sl-map-elevation" type="number" value="90"></label><label>Source X (m)<input id="sl-map-source-x" type="number" value="0"></label><label>Source Y (m)<input id="sl-map-source-y" type="number" value="0"></label><label>Source height (m)<input id="sl-map-source-z" type="number" value="1.8"></label><label>Map width (m)<input id="sl-map-width" type="number" value="24"></label><label>Map height (m)<input id="sl-map-height" type="number" value="18"></label><label>Sample height (m)<input id="sl-map-sample-height" type="number" value="1.2"></label><label>Spatial resolution<input id="sl-map-resolution" type="range" min="${MIN_MAP_RESOLUTION}" max="${MAX_MAP_RESOLUTION}" step="4" value="48"></label><label>Field coherence 0–1<input id="sl-map-coherence" type="number" min="0" max="1" step=".05" value=".85"></label><label>Vertical wall X (m)<input id="sl-map-wall-x" type="number" value="6"></label><label>Horizontal wall Y (m)<input id="sl-map-wall-y" type="number" value="-4"></label><label>Wall reflectivity 0–1<input id="sl-map-reflectivity" type="number" min="0" max=".99" step=".05" value=".45"></label><label>Wall penetration loss (dB)<input id="sl-map-penetration-loss" type="number" min="0" value="5"></label><label>Reflection phase (deg)<input id="sl-map-reflection-phase" type="number" value="180"></label><p class="sl-hint">Increase resolution gradually to inspect fine multipath structure without changing the propagation model.</p></section><section class="sl-card"><h3>Source & receiver</h3><label>Source frequency (MHz)<input id="sl-source-mhz" type="number" value="145.8"></label><label>TX power (dBm)<input id="sl-tx-dbm" type="number" value="30"></label><label>TX gain (dB)<input id="sl-tx-gain" type="number" value="2.15"></label><label>RX gain (dB)<input id="sl-rx-gain" type="number" value="0"></label><label>Distance (m)<input id="sl-distance-m" type="number" min=".001" value="1000"></label><label>Extra loss (dB)<input id="sl-extra-loss" type="number" min="0" value="0"></label><label>Receiver center (MHz)<input id="sl-rx-center-mhz" type="number" value="10.7"></label><label>Receiver bandwidth (kHz)<input id="sl-rx-bandwidth-khz" type="number" value="25"></label><label>Noise figure (dB)<input id="sl-noise-figure" type="number" value="6"></label></section><section class="sl-card"><h3>Antenna & impedance</h3><label>Resistance (Ω)<input id="sl-resistance-ohm" type="number" value="50"></label><label>Inductance (µH)<input id="sl-inductance-uh" type="number" value=".120"></label><label>Capacitance (pF)<input id="sl-capacitance-pf" type="number" value="10"></label><label>Quality factor Q<input id="sl-q" type="number" value="8"></label><label>Feed impedance (Ω)<input id="sl-feed-ohm" type="number" value="50"></label></section><section class="sl-card"><h3>Heterodyne / carrier probe</h3><label>Local oscillator (MHz)<input id="sl-lo-mhz" type="number" value="135.1"></label><label>Known carrier (MHz)<input id="sl-carrier-mhz" type="number" value="145"></label><label>Carrier amplitude<input id="sl-carrier-amplitude" type="number" value="1"></label><label>Unknown/source amplitude<input id="sl-source-amplitude" type="number" value=".1"></label><label>Field coupling 0–1<input id="sl-coupling" type="number" min="0" max="1" value=".05"></label><label>Front-end nonlinearity<input id="sl-nonlinearity" type="number" min="0" value=".03"></label><label>Observed IF / beat (kHz)<input id="sl-observed-khz" type="number" value="800"></label></section><section class="sl-card"><h3>Sweep</h3><label>Sweep min (MHz)<input id="sl-sweep-min-mhz" type="number" value="1"></label><label>Sweep max (MHz)<input id="sl-sweep-max-mhz" type="number" value="6500"></label><label>Sweep samples<input id="sl-sweep-points" type="number" min="16" max="${MAX_SWEEP_POINTS}" value="256"></label><label class="sl-check"><input id="sl-animate" type="checkbox" checked> Animate E/H field</label><button class="sl-primary" data-sl-run>Update laboratory</button><div class="sl-status" data-sl-status>Ready.</div></section></aside><main class="sl-workspace"><section class="sl-card sl-map-card"><div class="sl-section-head"><h3>RF environment / Wi‑Fi-scale field map</h3><span>direct + single-bounce multipath</span></div><canvas id="sl-environment-canvas" class="sl-canvas sl-environment"></canvas></section><section class="sl-card"><div class="sl-section-head"><h3>Electromagnetic field visualization</h3><span>orthogonal E/H field</span></div><canvas id="sl-field-canvas" class="sl-canvas"></canvas></section><section class="sl-card"><div class="sl-section-head"><h3>Antenna attenuation / tuning sweep</h3><span>log-frequency response</span></div><canvas id="sl-spectrum-canvas" class="sl-canvas sl-spectrum"></canvas></section><div data-sl-results></div></main></div></div>`;
    root.document.body.appendChild(panel); panel.querySelectorAll('[data-sl-close]').forEach(node=>node.addEventListener('click',closePanel)); panel.querySelector('[data-sl-run]').addEventListener('click',()=>{try{update();}catch(error){const s=panel.querySelector('[data-sl-status]');s.textContent=error.message;s.dataset.kind='error';}}); panel.querySelector('#sl-map-preset')?.addEventListener('change',()=>{applyMapPreset();}); return panel;
  }
  function openPanel(options={}) { const target=buildPanel();target.hidden=false;root.document.body.classList.add('sl-open');if(options.sourceMHz!==undefined)target.querySelector('#sl-source-mhz').value=String(options.sourceMHz);if(options.mapPreset){target.querySelector('#sl-map-preset').value=String(options.mapPreset);applyMapPreset();}update();if(!frameHandle&&root.requestAnimationFrame)frameHandle=root.requestAnimationFrame(animate);return target; }
  function closePanel(){if(!panel)return;panel.hidden=true;root?.document?.body?.classList.remove('sl-open');if(frameHandle&&root.cancelAnimationFrame)root.cancelAnimationFrame(frameHandle);frameHandle=0;}
  function currentState(){return Object.freeze({panelOpen:Boolean(panel&&!panel.hidden),active:current});}

  return Object.freeze({
    openPanel, closePanel, currentState, analyzeConfiguration,
    utilities:Object.freeze({ wavelength,resonantFrequency,seriesRlcImpedance,mismatch,resonanceTransfer,antennaResponse,freeSpacePathLossDb,planeWaveFieldVPerM,thermalNoiseFloorDbm,directReception,heterodyneProducts,intermodulationProducts,adjacentCarrierProbe,inferSourceCandidates,estimateRangeScenarios,logarithmicSweep,sweepAntenna,antennaAxis,halfWaveDipolePowerPattern,monopolePowerPattern,sourceDirectionalGainDb,mirrorPointAcrossPlane,crossesPlane,pathPowerDbm,reflectedPath,environmentPoint,buildEnvironmentMap,progressiveEnvironmentMaps,wifiPreset }),
    constants:Object.freeze({ PANEL_ID,C,K_B,DEFAULT_TEMPERATURE_K,MAX_SWEEP_POINTS,MAX_MAP_RESOLUTION,MIN_MAP_RESOLUTION })
  });
});
