(function installSignalsLaboratory(root, factory) {
  'use strict';
  const api = factory(root || globalThis);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.SignalsLaboratory = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function createSignalsLaboratory(root) {
  'use strict';

  const VERSION = '0.4.0';
  const PANEL_ID = 'signals-laboratory';
  const STYLE_ID = 'signals-laboratory-style';
  const C = 299792458;
  const K_B = 1.380649e-23;
  const DEFAULT_TEMPERATURE_K = 290;
  const MAX_SWEEP_POINTS = 1024;
  const MAX_MAP_RESOLUTION = 128;
  const MIN_MAP_RESOLUTION = 12;
  const DEFAULT_DETECT_THRESHOLD_DBM = -90;
  let panel = null;
  let frameHandle = 0;
  let phase = 0;
  let current = null;
  let pointer3D = null;
  const view3D = {
    field: { yawDeg:-46, pitchDeg:28, zoom:1 },
    antenna: { yawDeg:-38, pitchDeg:24, zoom:1 },
    environment: { yawDeg:-42, pitchDeg:32, zoom:1 },
    mixer: { yawDeg:-18, pitchDeg:25, zoom:1 }
  };

  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const finite = (v, fallback = 0) => Number.isFinite(Number(v)) ? Number(v) : fallback;
  const esc = v => String(v ?? '').replace(/[&<>"']/g, ch => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[ch]));
  const freeze = value => Object.freeze(value);
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
  function wattSumDbm(values) { return milliwattsToDbm(values.reduce((sum, value) => sum + dbmToMilliwatts(value), 0)); }

  function ensureStyle() {
    if (!root?.document || root.document.getElementById(STYLE_ID)) return;
    const link = root.document.createElement('link');
    link.id = STYLE_ID;
    link.rel = 'stylesheet';
    link.href = 'signals-laboratory.css?v=20260809-signals-lab-experiments-1';
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
    return freeze({ resistance, reactance, magnitude: Math.hypot(resistance, reactance), phaseDeg: Math.atan2(reactance, resistance) * 180 / Math.PI });
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
    return freeze({ reflectionMagnitude, acceptedPowerFraction, returnLossDb: reflectionMagnitude ? -20 * Math.log10(reflectionMagnitude) : 300 });
  }
  function resonanceTransfer(frequencyHz, centerHz, q = 8) {
    const f = positive(frequencyHz, 'Frequency');
    const f0 = positive(centerHz, 'Resonant frequency');
    const detuning = f / f0 - f0 / f;
    return 1 / Math.sqrt(1 + Math.max(.01, finite(q, 8)) ** 2 * detuning ** 2);
  }
  function bandpassTuningResponse(frequencyHz, centerHz, q = 8) {
    const voltageTransfer = resonanceTransfer(frequencyHz, centerHz, q);
    return freeze({ frequencyHz, centerHz, q, voltageTransfer, responseDb: Math.min(0, db20(voltageTransfer)) });
  }
  function antennaResponse(frequencyHz, antenna) {
    const resonantHz = antenna.resonantHz || resonantFrequency(antenna.inductanceH, antenna.capacitanceF);
    const resonance = resonanceTransfer(frequencyHz, resonantHz, antenna.q);
    const match = mismatch(frequencyHz, antenna);
    const voltageTransfer = resonance * Math.sqrt(match.acceptedPowerFraction);
    return freeze({ resonantHz, resonance, mismatch: match, voltageTransfer, responseDb: db20(voltageTransfer) });
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
    return freeze({ response, fsplDb, freeSpaceDbm, receiverInputDbm, noiseFloorDbm, snrDb: receiverInputDbm - noiseFloorDbm, inReceiverBand: Math.abs(options.frequencyHz - options.receiverCenterHz) <= options.receiverBandwidthHz / 2 });
  }

  function heterodyneProducts(signalHz, localOscillatorHz) {
    const signal = positive(signalHz, 'Signal frequency');
    const lo = positive(localOscillatorHz, 'Local oscillator');
    return freeze({ signalHz: signal, localOscillatorHz: lo, differenceHz: Math.abs(signal - lo), sumHz: signal + lo });
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
      if (!map.has(key) || map.get(key).order > order) map.set(key, freeze({ frequencyHz, order, m, n, expression: `${m}·f1 ${n < 0 ? '−' : '+'} ${Math.abs(n)}·f2` }));
    }
    return freeze([...map.values()].sort((a,b) => a.frequencyHz - b.frequencyHz));
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
    const products = intermodulationProducts(carrierHz, sourceHz, 3).map(product => freeze({ ...product, inReceiverBand: Math.abs(product.frequencyHz - receiverCenterHz) <= bandwidthHz / 2 }));
    return freeze({ carrierHz, sourceHz, beatHz, modulationIndex, estimatedSidebandAmplitude: carrierAmplitude * modulationIndex / 2, products: freeze(products), inBandProducts: freeze(products.filter(item => item.inReceiverBand)) });
  }
  function inferSourceCandidates(options) {
    const observedHz = Math.max(0, finite(options.observedHz));
    const lo = options.localOscillatorHz ? positive(options.localOscillatorHz, 'Local oscillator') : null;
    const carrier = options.carrierHz ? positive(options.carrierHz, 'Carrier') : null;
    const rows = [];
    const add = (frequencyHz, mechanism, equation) => { if (frequencyHz >= 1 && !rows.some(row => Math.abs(row.frequencyHz - frequencyHz) < 1e-6 && row.mechanism === mechanism)) rows.push(freeze({ frequencyHz, mechanism, equation })); };
    if (lo) { add(lo + observedHz, 'heterodyne difference', 'fRF = fLO + fIF'); add(Math.abs(lo - observedHz), 'heterodyne image', 'fRF = |fLO − fIF|'); }
    if (carrier) { add(carrier + observedHz, 'carrier beat / sideband', 'fX = fC + fbeat'); add(Math.abs(carrier - observedHz), 'carrier beat / sideband', 'fX = |fC − fbeat|'); add(2 * carrier + observedHz, 'third-order candidate', 'fX = 2fC + fobs'); add(Math.abs(2 * carrier - observedHz), 'third-order candidate', 'fX = |2fC − fobs|'); }
    return freeze(rows.sort((a,b) => a.frequencyHz - b.frequencyHz));
  }
  function estimateRangeScenarios(options) {
    const lambda = wavelength(options.frequencyHz);
    const receivedDbm = finite(options.receivedDbm);
    return freeze((options.txPowersDbm || [-10,0,10,20,30,40,50]).map(txPowerDbm => {
      const allowedPathLossDb = txPowerDbm + finite(options.txGainDb) + finite(options.rxGainDb) - Math.max(0, finite(options.extraLossDb)) - receivedDbm;
      return freeze({ txPowerDbm, allowedPathLossDb, distanceM: lambda / (4 * Math.PI) * 10 ** (allowedPathLossDb / 20) });
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
    return freeze(logarithmicSweep(options.minHz, options.maxHz, options.points).map(frequencyHz => {
      const response = antennaResponse(frequencyHz, options.antenna);
      const impedance = seriesRlcImpedance(frequencyHz, options.antenna.resistanceOhm, options.antenna.inductanceH, options.antenna.capacitanceF);
      return freeze({ frequencyHz, responseDb: response.responseDb, impedanceMagnitudeOhm: impedance.magnitude, phaseDeg: impedance.phaseDeg, returnLossDb: response.mismatch.returnLossDb });
    }));
  }

  function vectorLength(v) { return Math.hypot(v.x, v.y, v.z); }
  function normalizeVector(v) { const length = vectorLength(v) || 1; return freeze({ x:v.x/length, y:v.y/length, z:v.z/length }); }
  function antennaAxis(azimuthDeg = 0, elevationDeg = 90) {
    const az = degToRad(azimuthDeg), el = degToRad(elevationDeg);
    return normalizeVector({ x: Math.cos(el)*Math.cos(az), y: Math.cos(el)*Math.sin(az), z: Math.sin(el) });
  }
  function halfWaveDipolePowerPattern(thetaRad) {
    const s = Math.sin(thetaRad); if (Math.abs(s) < 1e-9) return 0;
    const field = Math.cos((Math.PI/2)*Math.cos(thetaRad))/s;
    return clamp(field*field,0,1);
  }
  function monopolePowerPattern(thetaRad) { return halfWaveDipolePowerPattern(thetaRad); }
  function sourceDirectionalGainDb(source, direction) {
    const type = String(source.antennaType || 'isotropic').toLowerCase();
    if (type === 'isotropic') return finite(source.baseGainDb,0);
    const axis = antennaAxis(source.azimuthDeg, source.elevationDeg);
    const d = normalizeVector(direction);
    const theta = Math.acos(clamp(Math.abs(axis.x*d.x+axis.y*d.y+axis.z*d.z),0,1));
    const pattern = type === 'monopole' ? monopolePowerPattern(theta) : halfWaveDipolePowerPattern(theta);
    const idealPeakDb = type === 'monopole' ? 5.15 : 2.15;
    return finite(source.baseGainDb, idealPeakDb) + 10*Math.log10(Math.max(1e-8,pattern));
  }
  function mirrorPointAcrossPlane(source, reflector) {
    if (reflector.axis === 'x') return freeze({ x:2*reflector.coordinateM-source.x, y:source.y, z:source.z });
    return freeze({ x:source.x, y:2*reflector.coordinateM-source.y, z:source.z });
  }
  function crossesPlane(a,b,reflector) {
    const av = reflector.axis === 'x' ? a.x : a.y;
    const bv = reflector.axis === 'x' ? b.x : b.y;
    return (av < reflector.coordinateM && bv > reflector.coordinateM) || (av > reflector.coordinateM && bv < reflector.coordinateM);
  }
  function pathPowerDbm(source, receiver, distanceM, extraLossDb = 0, directionOverride = null) {
    const direction = directionOverride || { x:receiver.x-source.x, y:receiver.y-source.y, z:receiver.z-source.z };
    const gainDb = sourceDirectionalGainDb(source,direction);
    return finite(source.txPowerDbm)+gainDb+finite(receiver.gainDb)-freeSpacePathLossDb(source.frequencyHz,Math.max(distanceM,wavelength(source.frequencyHz)/(4*Math.PI)))-Math.max(0,finite(extraLossDb));
  }
  function reflectedPath(source, receiver, reflector) {
    const image = mirrorPointAcrossPlane(source,reflector);
    const distanceM = Math.max(.001,Math.hypot(receiver.x-image.x,receiver.y-image.y,receiver.z-image.z));
    const reflectionMagnitude = clamp(finite(reflector.reflectivity,.45),0,.9999);
    const direction = { x:image.x-source.x,y:image.y-source.y,z:image.z-source.z };
    const baseDbm = pathPowerDbm(source,receiver,distanceM,finite(reflector.reflectionLossDb),direction);
    return freeze({ distanceM,powerDbm:baseDbm+20*Math.log10(Math.max(1e-9,reflectionMagnitude)),phaseRad:-2*Math.PI*distanceM/wavelength(source.frequencyHz)+degToRad(reflector.phaseDeg),mechanism:`reflection-${reflector.axis}` });
  }
  function environmentPoint(options) {
    const source=options.source,receiver=options.receiver,reflectors=options.reflectors||[],coherence=clamp(finite(options.coherence,1),0,1);
    const directDistanceM=Math.max(.001,Math.hypot(receiver.x-source.x,receiver.y-source.y,receiver.z-source.z));
    let penetrationLossDb=0;
    for(const reflector of reflectors) if(crossesPlane(source,receiver,reflector)) penetrationLossDb+=Math.max(0,finite(reflector.penetrationLossDb));
    const directDbm=pathPowerDbm(source,receiver,directDistanceM,penetrationLossDb);
    const paths=[{distanceM:directDistanceM,powerDbm:directDbm,phaseRad:-2*Math.PI*directDistanceM/wavelength(source.frequencyHz),mechanism:'direct'}];
    for(const reflector of reflectors) if(finite(reflector.reflectivity,0)>0) paths.push(reflectedPath(source,receiver,reflector));
    let real=0,imag=0,incoherentMw=0;
    for(const path of paths){const powerMw=dbmToMilliwatts(path.powerDbm),amplitude=Math.sqrt(powerMw);real+=amplitude*Math.cos(path.phaseRad);imag+=amplitude*Math.sin(path.phaseRad);incoherentMw+=powerMw;}
    const coherentMw=real*real+imag*imag,blendedMw=coherence*coherentMw+(1-coherence)*incoherentMw;
    return freeze({powerDbm:milliwattsToDbm(blendedMw),directDbm,coherentDbm:milliwattsToDbm(coherentMw),incoherentDbm:milliwattsToDbm(incoherentMw),penetrationLossDb,paths:freeze(paths)});
  }
  function mapSummary(widthM,heightM,resolutionX,resolutionY,sampleHeightM,values,extra={}) {
    let minimumDbm=Infinity,maximumDbm=-Infinity,sumDbm=0;
    for(const value of values){minimumDbm=Math.min(minimumDbm,value);maximumDbm=Math.max(maximumDbm,value);sumDbm+=value;}
    return freeze({widthM,heightM,resolutionX,resolutionY,sampleHeightM,minimumDbm,maximumDbm,meanDbm:sumDbm/Math.max(1,values.length),fadeDepthDb:maximumDbm-minimumDbm,values,...extra});
  }
  function buildEnvironmentMap(options) {
    const widthM=positive(options.widthM,'Map width'),heightM=positive(options.heightM,'Map height');
    const resolutionX=clamp(Math.floor(finite(options.resolutionX,48)),MIN_MAP_RESOLUTION,MAX_MAP_RESOLUTION);
    const resolutionY=clamp(Math.floor(finite(options.resolutionY,resolutionX)),MIN_MAP_RESOLUTION,MAX_MAP_RESOLUTION);
    const values=new Float64Array(resolutionX*resolutionY),sampleHeightM=finite(options.sampleHeightM,1.2);
    for(let yi=0;yi<resolutionY;yi+=1){const y=-heightM/2+(yi+.5)*heightM/resolutionY;for(let xi=0;xi<resolutionX;xi+=1){const x=-widthM/2+(xi+.5)*widthM/resolutionX;values[yi*resolutionX+xi]=environmentPoint({source:options.source,receiver:{x,y,z:sampleHeightM,gainDb:finite(options.receiverGainDb)},reflectors:options.reflectors,coherence:options.coherence}).powerDbm;}}
    return mapSummary(widthM,heightM,resolutionX,resolutionY,sampleHeightM,values,{frequencyHz:options.source.frequencyHz,label:options.label||'RF environment'});
  }
  function progressiveEnvironmentMaps(options) {
    const stages=(options.resolutions||[24,48,80]).map(value=>clamp(Math.floor(finite(value,48)),MIN_MAP_RESOLUTION,MAX_MAP_RESOLUTION));
    return freeze(stages.map(resolution=>buildEnvironmentMap({...options,resolutionX:resolution,resolutionY:resolution})));
  }
  function mapWithDbOffset(map, offsetDb, label = map.label) {
    const values=Float64Array.from(map.values,value=>value+finite(offsetDb));
    return mapSummary(map.widthM,map.heightM,map.resolutionX,map.resolutionY,map.sampleHeightM,values,{frequencyHz:map.frequencyHz,label,offsetDb:finite(offsetDb)});
  }
  function combineIndependentMaps(maps,label='Independent-power composite') {
    if(!maps.length) fail('At least one map is required.');
    const first=maps[0];
    if(!maps.every(map=>map.resolutionX===first.resolutionX&&map.resolutionY===first.resolutionY&&map.widthM===first.widthM&&map.heightM===first.heightM)) fail('Composite maps must share geometry and sampling.');
    const values=new Float64Array(first.values.length);
    for(let i=0;i<values.length;i+=1) values[i]=wattSumDbm(maps.map(map=>map.values[i]));
    return mapSummary(first.widthM,first.heightM,first.resolutionX,first.resolutionY,first.sampleHeightM,values,{frequencyHz:null,label,componentCount:maps.length});
  }
  function mapStatistics(map, options={}) {
    const thresholdDbm=finite(options.thresholdDbm,DEFAULT_DETECT_THRESHOLD_DBM);
    let detectable=0,gradientTotal=0,gradientCount=0,steep=0;
    for(let yi=0;yi<map.resolutionY;yi+=1) for(let xi=0;xi<map.resolutionX;xi+=1){
      const index=yi*map.resolutionX+xi,value=map.values[index]; if(value>=thresholdDbm) detectable+=1;
      if(xi+1<map.resolutionX){const d=Math.abs(value-map.values[index+1]);gradientTotal+=d;gradientCount+=1;if(d>=finite(options.gradientThresholdDb,3))steep+=1;}
      if(yi+1<map.resolutionY){const d=Math.abs(value-map.values[index+map.resolutionX]);gradientTotal+=d;gradientCount+=1;if(d>=finite(options.gradientThresholdDb,3))steep+=1;}
    }
    return freeze({thresholdDbm,detectableAreaFraction:detectable/map.values.length,meanNeighborGradientDb:gradientTotal/Math.max(1,gradientCount),steepGradientFraction:steep/Math.max(1,gradientCount),peakDbm:map.maximumDbm,meanDbm:map.meanDbm,fadeDepthDb:map.fadeDepthDb});
  }
  function compareMaps(reference,candidate,options={}) {
    if(reference.values.length!==candidate.values.length) fail('Map comparison requires equal sampling grids.');
    let sumSq=0,maxAbs=0,meanDelta=0;
    for(let i=0;i<reference.values.length;i+=1){const d=candidate.values[i]-reference.values[i];sumSq+=d*d;maxAbs=Math.max(maxAbs,Math.abs(d));meanDelta+=d;}
    const a=mapStatistics(reference,options),b=mapStatistics(candidate,options);
    return freeze({rmsDeltaDb:Math.sqrt(sumSq/reference.values.length),maximumAbsoluteDeltaDb:maxAbs,meanDeltaDb:meanDelta/reference.values.length,peakDeltaDb:b.peakDbm-a.peakDbm,meanLevelDeltaDb:b.meanDbm-a.meanDbm,fadeDepthDeltaDb:b.fadeDepthDb-a.fadeDepthDb,detectableAreaDelta:b.detectableAreaFraction-a.detectableAreaFraction,gradientDensityDelta:b.steepGradientFraction-a.steepGradientFraction});
  }
  function mapConvergence(coarse,fine) {
    let sumSq=0,count=0;
    for(let yi=0;yi<fine.resolutionY;yi+=1) for(let xi=0;xi<fine.resolutionX;xi+=1){
      const cx=clamp(Math.floor((xi+.5)*coarse.resolutionX/fine.resolutionX),0,coarse.resolutionX-1);
      const cy=clamp(Math.floor((yi+.5)*coarse.resolutionY/fine.resolutionY),0,coarse.resolutionY-1);
      const d=fine.values[yi*fine.resolutionX+xi]-coarse.values[cy*coarse.resolutionX+cx]; sumSq+=d*d;count+=1;
    }
    return Math.sqrt(sumSq/Math.max(1,count));
  }
  function resolutionDiagnostics(map, frequenciesHz, options={}) {
    const frequencies=[...new Set((frequenciesHz||[]).filter(value=>Number.isFinite(value)&&value>0))];
    const cellWidthM=map.widthM/map.resolutionX,cellHeightM=map.heightM/map.resolutionY;
    const rows=frequencies.map(frequencyHz=>{const lambda=wavelength(frequencyHz);return freeze({frequencyHz,wavelengthM:lambda,samplesPerWavelengthX:lambda/cellWidthM,samplesPerWavelengthY:lambda/cellHeightM});});
    const shortestWavelengthM=rows.length?Math.min(...rows.map(row=>row.wavelengthM)):null;
    const minimumSamples=rows.length?Math.min(...rows.flatMap(row=>[row.samplesPerWavelengthX,row.samplesPerWavelengthY])):Infinity;
    const maximumSamples=rows.length?Math.max(...rows.flatMap(row=>[row.samplesPerWavelengthX,row.samplesPerWavelengthY])):0;
    const undersampled=minimumSamples<2;
    const oversampled=maximumSamples>32;
    const snrDb=finite(options.snrDb,20),coherence=clamp(finite(options.coherence,1),0,1),q=Math.max(.01,finite(options.q,8));
    const samplingScore=clamp(minimumSamples/4,0,1),snrScore=clamp((snrDb+5)/25,0,1),coherenceScore=.35+.65*coherence,qScore=clamp(Math.log10(q+1)/Math.log10(25),.25,1);
    const modelFidelity=clamp(finite(options.modelFidelity,.72),0,1);
    const confidence=clamp(samplingScore*snrScore*coherenceScore*(.65+.35*qScore)*modelFidelity,0,1);
    const reasons=[];
    if(undersampled) reasons.push('grid spacing is too coarse to represent the shortest active wavelength at two samples per wavelength');
    if(oversampled) reasons.push('display sampling is much denser than the fidelity justified by the current geometric propagation model');
    if(snrDb<3) reasons.push('modeled SNR suppresses confidence in fine spatial structure');
    if(coherence<.45) reasons.push('low coherence reduces stable phase-sensitive multipath detail');
    if(!reasons.length) reasons.push('sampling, modeled SNR, and coherence are mutually consistent at this abstraction level');
    return freeze({cellWidthM,cellHeightM,frequencies:freeze(rows),shortestWavelengthM,minimumSamplesPerWavelength:minimumSamples,undersampled,oversampled,effectiveConfidence:confidence,reasons:freeze(reasons)});
  }
  function wifiPreset(name='wifi-2.4') {
    const presets={'wifi-2.4':{label:'Wi‑Fi 2.4 GHz example',frequencyHz:2.437e9,txPowerDbm:20},'wifi-5':{label:'Wi‑Fi 5 GHz example',frequencyHz:5.18e9,txPowerDbm:20},'wifi-6':{label:'Wi‑Fi 6 GHz example',frequencyHz:6.2e9,txPowerDbm:20},custom:{label:'Custom RF source',frequencyHz:915e6,txPowerDbm:20}};
    return freeze({... (presets[name]||presets['wifi-2.4'])});
  }

  function productSelector(products, mode, f1, f2) {
    const target = mode === 'sum' ? f1+f2 : mode === 'im3-upper' ? Math.abs(2*f2-f1) : mode === 'im3-lower' ? Math.abs(2*f1-f2) : Math.abs(f1-f2);
    return products.reduce((best,row)=>!best||Math.abs(row.frequencyHz-target)<Math.abs(best.frequencyHz-target)?row:best,null);
  }
  function interfrequencyExperiment(options) {
    const f1=positive(options.f1Hz,'Primary frequency'),f2=positive(options.f2Hz,'Secondary frequency');
    const coupling=clamp(finite(options.coupling,.05),0,1),nonlinearity=clamp(finite(options.nonlinearity,.03),0,1),maxOrder=clamp(Math.floor(finite(options.maximumOrder,3)),2,5);
    const floorDbm=finite(options.productFloorDbm,-120),mechanism=String(options.mechanism||'receiver-front-end');
    const raw=intermodulationProducts(f1,f2,maxOrder);
    const basePower=Math.min(finite(options.f1PowerDbm,20),finite(options.f2PowerDbm,17));
    const strength=Math.max(1e-9,coupling*nonlinearity);
    const products=raw.map(row=>{
      const conversionLossDb=-20*Math.log10(strength)+Math.max(0,row.order-2)*12;
      const estimatedPowerDbm=basePower-conversionLossDb;
      return freeze({...row,estimatedPowerDbm,conversionLossDb,aboveFloor:estimatedPowerDbm>=floorDbm,propagating:mechanism==='source-nonlinearity'});
    }).filter(row=>row.aboveFloor);
    const selected=productSelector(products,options.productMode||'difference',f1,f2);
    return freeze({f1Hz:f1,f2Hz:f2,mechanism,coupling,nonlinearity,maximumOrder:maxOrder,productFloorDbm:floorDbm,products:freeze(products),selected,physicalInterpretation:mechanism==='source-nonlinearity'?'selected products are modeled as generated at the source and may be propagated through the environment':'selected products are modeled as local receiver/front-end responses and are not treated as independently radiated fields'});
  }
  function buildReceiverMixingMap(primaryMap,secondaryMap,experiment,label='Receiver mixing response') {
    if(primaryMap.values.length!==secondaryMap.values.length) fail('Receiver mixing requires matching map grids.');
    const values=new Float64Array(primaryMap.values.length);
    const strength=Math.max(1e-9,experiment.coupling*experiment.nonlinearity);
    const lossDb=-20*Math.log10(strength)+Math.max(0,(experiment.selected?.order||2)-2)*12;
    for(let i=0;i<values.length;i+=1) values[i]=Math.min(primaryMap.values[i],secondaryMap.values[i])-lossDb;
    return mapSummary(primaryMap.widthM,primaryMap.heightM,primaryMap.resolutionX,primaryMap.resolutionY,primaryMap.sampleHeightM,values,{frequencyHz:experiment.selected?.frequencyHz||Math.abs(experiment.f1Hz-experiment.f2Hz),label,detectorResponse:true,propagating:false});
  }
  function buildPropagatingProductMap(environment, primarySource, experiment) {
    if(!experiment.selected||experiment.mechanism!=='source-nonlinearity') return null;
    const productSource=freeze({...primarySource,frequencyHz:experiment.selected.frequencyHz,txPowerDbm:experiment.selected.estimatedPowerDbm});
    return buildEnvironmentMap({...environment,source:productSource,label:`Source-generated ${experiment.selected.expression}`});
  }
  function buildExperimentSuite(config, baseMap) {
    const exp=config.experiments;
    const primaryFrequency=config.environment.source.frequencyHz;
    const txResponse=bandpassTuningResponse(primaryFrequency,exp.txTuneHz,exp.txQ);
    const rxResponse=bandpassTuningResponse(primaryFrequency,exp.rxTuneHz,exp.rxQ);
    const polarizationLossDb=20*Math.log10(Math.max(1e-4,clamp(exp.polarizationAlignment,0,1)));
    const tuningOffsetDb=exp.applyTuning?Math.min(0,txResponse.responseDb)+Math.min(0,rxResponse.responseDb)+polarizationLossDb:0;
    const tunedPrimary=mapWithDbOffset(baseMap,tuningOffsetDb,'Tuned primary carrier');
    const secondarySource=freeze({...config.environment.source,x:exp.secondaryX,y:exp.secondaryY,z:exp.secondaryZ,frequencyHz:exp.secondaryHz,txPowerDbm:exp.secondaryPowerDbm,antennaType:exp.secondaryAntennaType});
    const secondaryRaw=buildEnvironmentMap({...config.environment,source:secondarySource,label:'Secondary carrier'});
    const secondaryTx=bandpassTuningResponse(exp.secondaryHz,exp.txTuneHz,exp.txQ),secondaryRx=bandpassTuningResponse(exp.secondaryHz,exp.rxTuneHz,exp.rxQ);
    const secondaryOffset=exp.applyTuning?Math.min(0,secondaryTx.responseDb)+Math.min(0,secondaryRx.responseDb)+polarizationLossDb:0;
    const secondary=mapWithDbOffset(secondaryRaw,secondaryOffset,'Tuned secondary carrier');
    const interfrequency=interfrequencyExperiment({f1Hz:primaryFrequency,f2Hz:exp.secondaryHz,f1PowerDbm:config.environment.source.txPowerDbm,f2PowerDbm:exp.secondaryPowerDbm,coupling:exp.mixCoupling,nonlinearity:exp.mixNonlinearity,maximumOrder:exp.maximumOrder,productFloorDbm:exp.productFloorDbm,productMode:exp.productMode,mechanism:exp.mixMechanism});
    const productMap=interfrequency.mechanism==='source-nonlinearity'?buildPropagatingProductMap(config.environment,config.environment.source,interfrequency):buildReceiverMixingMap(tunedPrimary,secondary,interfrequency,'Receiver-front-end product response');
    const detectorComposite=combineIndependentMaps([tunedPrimary,secondary,...(productMap?[productMap]:[])],'Detector-integrated composite');
    const narrowTx=bandpassTuningResponse(primaryFrequency,exp.txTuneHz,exp.narrowQ),narrowRx=bandpassTuningResponse(primaryFrequency,exp.rxTuneHz,exp.narrowQ);
    const broadTx=bandpassTuningResponse(primaryFrequency,exp.txTuneHz,exp.broadQ),broadRx=bandpassTuningResponse(primaryFrequency,exp.rxTuneHz,exp.broadQ);
    const narrowQMap=mapWithDbOffset(baseMap,Math.min(0,narrowTx.responseDb)+Math.min(0,narrowRx.responseDb)+polarizationLossDb,'Narrow-Q primary');
    const broadQMap=mapWithDbOffset(baseMap,Math.min(0,broadTx.responseDb)+Math.min(0,broadRx.responseDb)+polarizationLossDb,'Broad-Q primary');
    const maps={baseline:baseMap,tuned:tunedPrimary,secondary,product:productMap||tunedPrimary,composite:detectorComposite,narrow:narrowQMap,broad:broadQMap};
    const selected=maps[exp.mapMode]||tunedPrimary;
    const activeFrequencies=[primaryFrequency,exp.secondaryHz]; if(interfrequency.selected?.frequencyHz)activeFrequencies.push(interfrequency.selected.frequencyHz);
    const directSnr=finite(config.directSnrDb,20);
    const resolution=resolutionDiagnostics(selected,activeFrequencies,{snrDb:directSnr,coherence:config.environment.coherence,q:exp.rxQ,modelFidelity:.72});
    const comparisons=freeze({tunedVsUntuned:compareMaps(baseMap,tunedPrimary,{thresholdDbm:exp.detectThresholdDbm}),narrowVsBroad:compareMaps(broadQMap,narrowQMap,{thresholdDbm:exp.detectThresholdDbm}),selectedVsBaseline:compareMaps(baseMap,selected,{thresholdDbm:exp.detectThresholdDbm})});
    return freeze({txResponse,rxResponse,tuningOffsetDb,secondaryResponse:freeze({tx:secondaryTx,rx:secondaryRx,offsetDb:secondaryOffset}),interfrequency,maps:freeze(maps),selectedMap:selected,resolution,comparisons,statistics:mapStatistics(selected,{thresholdDbm:exp.detectThresholdDbm})});
  }

  function defaultEnvironmentConfig(config) {
    const source=freeze({x:0,y:0,z:1.8,frequencyHz:positive(config?.sourceHz||2.437e9,'Map source frequency'),txPowerDbm:finite(config?.txPowerDbm,20),antennaType:'dipole',azimuthDeg:0,elevationDeg:90,baseGainDb:Number.NaN});
    return freeze({widthM:24,heightM:18,resolutionX:24,resolutionY:24,sampleHeightM:1.2,receiverGainDb:0,coherence:.85,source,reflectors:freeze([])});
  }
  function defaultExperiments(environment) {
    const f=environment.source.frequencyHz;
    return freeze({applyTuning:false,txTuneHz:f,rxTuneHz:f,txQ:8,rxQ:8,polarizationAlignment:1,secondaryHz:f*1.0103,secondaryPowerDbm:17,secondaryX:3,secondaryY:-2,secondaryZ:1.8,secondaryAntennaType:'dipole',mixMechanism:'receiver-front-end',mixCoupling:.05,mixNonlinearity:.03,maximumOrder:3,productFloorDbm:-120,productMode:'difference',mapMode:'tuned',narrowQ:24,broadQ:3,detectThresholdDbm:DEFAULT_DETECT_THRESHOLD_DBM});
  }
  function analyzeConfiguration(config) {
    const direct=directReception({frequencyHz:config.sourceHz,distanceM:config.distanceM,txPowerDbm:config.txPowerDbm,txGainDb:config.txGainDb,rxGainDb:config.rxGainDb,extraLossDb:config.extraLossDb,antenna:config.antenna,receiverCenterHz:config.receiverCenterHz,receiverBandwidthHz:config.receiverBandwidthHz,noiseFigureDb:config.noiseFigureDb});
    const heterodyne=heterodyneProducts(config.sourceHz,config.localOscillatorHz);
    const probe=adjacentCarrierProbe({carrierHz:config.carrierHz,sourceHz:config.sourceHz,receiverCenterHz:config.receiverCenterHz,receiverBandwidthHz:config.receiverBandwidthHz,coupling:config.coupling,nonlinearity:config.nonlinearity,carrierAmplitude:config.carrierAmplitude,sourceAmplitude:config.sourceAmplitude});
    const sweep=sweepAntenna({minHz:config.sweepMinHz,maxHz:config.sweepMaxHz,points:config.sweepPoints,antenna:config.antenna});
    const inference=inferSourceCandidates({observedHz:config.observedHz,localOscillatorHz:config.localOscillatorHz,carrierHz:config.carrierHz});
    const ranges=estimateRangeScenarios({receivedDbm:direct.receiverInputDbm,frequencyHz:config.sourceHz,txGainDb:config.txGainDb,rxGainDb:config.rxGainDb,extraLossDb:config.extraLossDb});
    const environmentConfig=config.environment||defaultEnvironmentConfig(config);
    const environment=buildEnvironmentMap(environmentConfig);
    const experiments=buildExperimentSuite({...config,environment:environmentConfig,experiments:config.experiments||defaultExperiments(environmentConfig),directSnrDb:direct.snrDb},environment);
    return freeze({direct,heterodyne,probe,sweep,inference,ranges,environment,experiments,sourceFieldVPerM:planeWaveFieldVPerM(config.txPowerDbm,config.txGainDb,config.distanceM)});
  }

  function hz(value){const f=Math.abs(value);return f>=1e9?`${(f/1e9).toFixed(6)} GHz`:f>=1e6?`${(f/1e6).toFixed(6)} MHz`:f>=1e3?`${(f/1e3).toFixed(3)} kHz`:`${f.toFixed(3)} Hz`;}
  function eng(value,unit=''){const n=Number(value)||0,a=Math.abs(n);if(a>=1e6)return`${(n/1e6).toFixed(3)} M${unit}`;if(a>=1e3)return`${(n/1e3).toFixed(3)} k${unit}`;if(a>=1)return`${n.toFixed(3)} ${unit}`.trim();if(a>=1e-3)return`${(n*1e3).toFixed(3)} m${unit}`;if(a>=1e-6)return`${(n*1e6).toFixed(3)} µ${unit}`;return`${n.toExponential(3)} ${unit}`.trim();}
  function num(selector,scale=1){return finite(panel.querySelector(selector)?.value)*scale;}
  function checked(selector){return Boolean(panel.querySelector(selector)?.checked);}
  function value(selector,fallback=''){return panel.querySelector(selector)?.value??fallback;}
  function readConfig() {
    const inductanceH=num('#sl-inductance-uh',1e-6),capacitanceF=num('#sl-capacitance-pf',1e-12);
    const preset=wifiPreset(value('#sl-map-preset','wifi-2.4'));
    const mapFrequencyHz=value('#sl-map-preset')==='custom'?num('#sl-map-frequency-mhz',1e6):preset.frequencyHz;
    const source=freeze({x:num('#sl-map-source-x'),y:num('#sl-map-source-y'),z:num('#sl-map-source-z'),frequencyHz:mapFrequencyHz,txPowerDbm:num('#sl-map-tx-dbm'),antennaType:value('#sl-map-antenna','dipole'),azimuthDeg:num('#sl-map-azimuth'),elevationDeg:num('#sl-map-elevation'),baseGainDb:Number.NaN});
    const reflectivity=num('#sl-map-reflectivity'),penetrationLossDb=num('#sl-map-penetration-loss'),phaseDeg=num('#sl-map-reflection-phase');
    const reflectors=freeze([freeze({axis:'x',coordinateM:num('#sl-map-wall-x'),reflectivity,penetrationLossDb,phaseDeg,reflectionLossDb:0}),freeze({axis:'y',coordinateM:num('#sl-map-wall-y'),reflectivity,penetrationLossDb,phaseDeg,reflectionLossDb:0})]);
    const environment=freeze({widthM:num('#sl-map-width'),heightM:num('#sl-map-height'),resolutionX:num('#sl-map-resolution'),resolutionY:num('#sl-map-resolution'),sampleHeightM:num('#sl-map-sample-height'),receiverGainDb:0,coherence:num('#sl-map-coherence'),source,reflectors});
    const experiments=freeze({applyTuning:checked('#sl-exp-apply-tuning'),txTuneHz:num('#sl-exp-tx-tune-mhz',1e6),rxTuneHz:num('#sl-exp-rx-tune-mhz',1e6),txQ:num('#sl-exp-tx-q'),rxQ:num('#sl-exp-rx-q'),polarizationAlignment:num('#sl-exp-polarization'),secondaryHz:num('#sl-exp-secondary-mhz',1e6),secondaryPowerDbm:num('#sl-exp-secondary-power'),secondaryX:num('#sl-exp-secondary-x'),secondaryY:num('#sl-exp-secondary-y'),secondaryZ:num('#sl-exp-secondary-z'),secondaryAntennaType:value('#sl-exp-secondary-antenna','dipole'),mixMechanism:value('#sl-exp-mix-mechanism','receiver-front-end'),mixCoupling:num('#sl-exp-mix-coupling'),mixNonlinearity:num('#sl-exp-mix-nonlinearity'),maximumOrder:num('#sl-exp-max-order'),productFloorDbm:num('#sl-exp-product-floor'),productMode:value('#sl-exp-product-mode','difference'),mapMode:value('#sl-exp-map-mode','tuned'),narrowQ:num('#sl-exp-narrow-q'),broadQ:num('#sl-exp-broad-q'),detectThresholdDbm:num('#sl-exp-detect-threshold')});
    return freeze({sourceHz:num('#sl-source-mhz',1e6),txPowerDbm:num('#sl-tx-dbm'),txGainDb:num('#sl-tx-gain'),rxGainDb:num('#sl-rx-gain'),distanceM:num('#sl-distance-m'),extraLossDb:num('#sl-extra-loss'),receiverCenterHz:num('#sl-rx-center-mhz',1e6),receiverBandwidthHz:num('#sl-rx-bandwidth-khz',1e3),noiseFigureDb:num('#sl-noise-figure'),localOscillatorHz:num('#sl-lo-mhz',1e6),carrierHz:num('#sl-carrier-mhz',1e6),coupling:num('#sl-coupling'),nonlinearity:num('#sl-nonlinearity'),carrierAmplitude:num('#sl-carrier-amplitude'),sourceAmplitude:num('#sl-source-amplitude'),observedHz:num('#sl-observed-khz',1e3),sweepMinHz:num('#sl-sweep-min-mhz',1e6),sweepMaxHz:num('#sl-sweep-max-mhz',1e6),sweepPoints:num('#sl-sweep-points'),antenna:freeze({resonantHz:resonantFrequency(inductanceH,capacitanceF),resistanceOhm:num('#sl-resistance-ohm'),inductanceH,capacitanceF,q:num('#sl-q'),feedOhm:num('#sl-feed-ohm')}),environment,experiments});
  }

  function fitCanvas(canvas){const rect=canvas.getBoundingClientRect(),dpr=root.devicePixelRatio||1,w=Math.max(320,Math.floor(rect.width*dpr)),h=Math.max(200,Math.floor(rect.height*dpr));if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}return{w,h,dpr};}
  function grid(ctx,w,h){ctx.strokeStyle='rgba(150,180,200,.12)';ctx.lineWidth=1;const step=Math.max(34,Math.floor(w/14));for(let x=0;x<w;x+=step){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,h);ctx.stroke();}for(let y=0;y<h;y+=step){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke();}}
  function mapColor(value,min,max){const t=clamp((value-min)/Math.max(1e-9,max-min),0,1),hue=250-250*t;return`hsl(${hue} 86% ${38+20*t}%)`;}
  function drawMapToCanvas(canvas,map,label,source=null){if(!canvas||!map)return;const{w,h,dpr}=fitCanvas(canvas),ctx=canvas.getContext('2d');ctx.clearRect(0,0,w,h);const cellW=w/map.resolutionX,cellH=h/map.resolutionY;for(let yi=0;yi<map.resolutionY;yi+=1)for(let xi=0;xi<map.resolutionX;xi+=1){const v=map.values[yi*map.resolutionX+xi];ctx.fillStyle=mapColor(v,map.minimumDbm,map.maximumDbm);ctx.fillRect(xi*cellW,h-(yi+1)*cellH,Math.ceil(cellW)+1,Math.ceil(cellH)+1);}ctx.fillStyle='#fff';ctx.font=`${11*dpr}px sans-serif`;ctx.fillText(label||map.label||'RF map',10*dpr,18*dpr);if(source){const px=w*(source.x/map.widthM+.5),py=h*(.5-source.y/map.heightM);ctx.beginPath();ctx.arc(px,py,5*dpr,0,Math.PI*2);ctx.fill();}}
  function drawEnvironment(state){drawMapToCanvas(panel?.querySelector('#sl-environment-canvas'),state.analysis.experiments.selectedMap,`${state.analysis.experiments.selectedMap.label} · ${state.analysis.experiments.selectedMap.frequencyHz?hz(state.analysis.experiments.selectedMap.frequencyHz):'composite'}`,state.config.environment.source);}
  function drawComparison(state){const canvas=panel?.querySelector('#sl-comparison-canvas');if(!canvas||!state)return;const a=state.analysis.environment,b=state.analysis.experiments.selectedMap;if(a.values.length!==b.values.length)return;const values=new Float64Array(a.values.length);for(let i=0;i<values.length;i+=1)values[i]=b.values[i]-a.values[i];drawMapToCanvas(canvas,mapSummary(a.widthM,a.heightM,a.resolutionX,a.resolutionY,a.sampleHeightM,values,{label:'Selected − baseline dB delta'}),'Selected − baseline dB delta');}
  function drawField(state){const canvas=panel?.querySelector('#sl-field-canvas');if(!canvas||!state)return;const{w,h,dpr}=fitCanvas(canvas),ctx=canvas.getContext('2d');ctx.clearRect(0,0,w,h);grid(ctx,w,h);const cycles=clamp(2+Math.log10(Math.max(1,state.config.sourceHz/1e3)),2,10),amp=h*.18*clamp(state.analysis.direct.response.voltageTransfer*2+.08,.08,1),center=h*.5;const wave=(color,q)=>{ctx.strokeStyle=color;ctx.lineWidth=2*dpr;ctx.beginPath();for(let i=0;i<=180;i++){const t=i/180,x=w*.06+t*w*.88,y=center+Math.sin(t*cycles*Math.PI*2-phase+q)*amp*(q?Math.cos(.65):1);if(!i)ctx.moveTo(x,y);else ctx.lineTo(x,y);}ctx.stroke();};wave('#72d5ff',0);wave('#ffb86c',Math.PI/2);ctx.fillStyle='#d8e0e6';ctx.font=`${12*dpr}px sans-serif`;ctx.fillText(`E/H field · λ ${eng(wavelength(state.config.sourceHz),'m')}`,12*dpr,20*dpr);}
  function drawSweep(state){const canvas=panel?.querySelector('#sl-spectrum-canvas');if(!canvas||!state)return;const{w,h,dpr}=fitCanvas(canvas),ctx=canvas.getContext('2d'),rows=state.analysis.sweep;ctx.clearRect(0,0,w,h);grid(ctx,w,h);const min=Math.log10(rows[0].frequencyHz),max=Math.log10(rows.at(-1).frequencyHz),minDb=Math.min(-80,...rows.map(r=>r.responseDb)),maxDb=3,x=f=>35*dpr+(Math.log10(f)-min)/(max-min)*(w-50*dpr),y=v=>15*dpr+(maxDb-v)/(maxDb-minDb)*(h-38*dpr);ctx.strokeStyle='#72d5ff';ctx.lineWidth=2*dpr;ctx.beginPath();rows.forEach((r,i)=>i?ctx.lineTo(x(r.frequencyHz),y(r.responseDb)):ctx.moveTo(x(r.frequencyHz),y(r.responseDb)));ctx.stroke();}

  function lerp(a,b,t){return a+(b-a)*t;}
  function project3DPoint(point,view={}){const yaw=degToRad(view.yawDeg??-42),pitch=degToRad(view.pitchDeg??28),scale=finite(view.scale,100),originX=finite(view.originX),originY=finite(view.originY),cy=Math.cos(yaw),sy=Math.sin(yaw),cp=Math.cos(pitch),sp=Math.sin(pitch),x1=point.x*cy-point.y*sy,y1=point.x*sy+point.y*cy,z1=point.z,y2=y1*cp-z1*sp,z2=y1*sp+z1*cp;return freeze({x:originX+x1*scale,y:originY-y2*scale,depth:z2});}
  function buildFieldVolumeSamples(config,phaseValue=0){const cycles=clamp(2+Math.log10(Math.max(1,finite(config?.sourceHz,145.8e6)/1e3)),2,10),response=clamp(finite(config?.response?.voltageTransfer,.4),.05,1),rows=[];for(let i=0;i<32;i+=1){const t=i/31,x=lerp(-1,1,t),p=t*cycles*Math.PI*2-phaseValue,e=Math.sin(p)*.6*response,h=Math.sin(p+Math.PI/2)*.42*response;rows.push(freeze({t,x,e,h,pointE:freeze({x,y:e,z:0}),pointH:freeze({x,y:0,z:h})}));}return freeze(rows);}
  function buildAntennaLobeSamples(source,tuningResponse=1){const rings=[],type=String(source?.antennaType||'dipole').toLowerCase(),axis=antennaAxis(source?.azimuthDeg,source?.elevationDeg),tune=clamp(finite(tuningResponse,1),.02,1);for(let ei=0;ei<=12;ei+=1){const phi=-Math.PI/2+ei/12*Math.PI,ring=[];for(let ai=0;ai<=36;ai+=1){const az=ai/36*Math.PI*2,direction={x:Math.cos(phi)*Math.cos(az),y:Math.cos(phi)*Math.sin(az),z:Math.sin(phi)},dot=clamp(Math.abs(axis.x*direction.x+axis.y*direction.y+axis.z*direction.z),0,1),theta=Math.acos(dot),pattern=type==='isotropic'?1:type==='monopole'?monopolePowerPattern(theta):halfWaveDipolePowerPattern(theta),radius=(.08+.92*Math.sqrt(Math.max(0,pattern)))*(.25+.75*tune);ring.push(freeze({x:direction.x*radius,y:direction.y*radius,z:direction.z*radius,power:pattern,tuning:tune}));}rings.push(freeze(ring));}return freeze(rings);}
  function buildEnvironmentSurfaceMesh(environment){const vertices=[],rx=environment.resolutionX||1,ry=environment.resolutionY||1,min=finite(environment.minimumDbm),span=Math.max(1e-9,finite(environment.maximumDbm)-min);for(let yi=0;yi<ry;yi+=1)for(let xi=0;xi<rx;xi+=1){const value=environment.values[yi*rx+xi];vertices.push(freeze({xi,yi,value,x:(xi/Math.max(1,rx-1)-.5)*2,y:(yi/Math.max(1,ry-1)-.5)*2,z:((value-min)/span-.5)*1.6}));}return freeze({resolutionX:rx,resolutionY:ry,vertices:freeze(vertices)});}
  function buildMixerProductScene(analysis){const base=analysis.experiments?.interfrequency;const rows=[freeze({label:'RF',frequencyHz:base?.f1Hz||analysis.heterodyne.signalHz,order:1,amplitude:1}),freeze({label:'F2 / LO',frequencyHz:base?.f2Hz||analysis.heterodyne.localOscillatorHz,order:1,amplitude:.92})];for(const product of base?.products||analysis.probe.products||[])rows.push(freeze({label:product.expression,frequencyHz:product.frequencyHz,order:product.order,amplitude:clamp(10**((finite(product.estimatedPowerDbm,-100)+100)/40),.03,.8),inReceiverBand:product===base?.selected}));return freeze(rows.sort((a,b)=>a.frequencyHz-b.frequencyHz));}
  function draw3DAxes(ctx,view,labels=['x','y','z']){const origin=project3DPoint({x:-1.05,y:-1.05,z:-.82},view),axes=[{end:project3DPoint({x:1.1,y:-1.05,z:-.82},view),color:'rgba(255,120,120,.8)',label:labels[0]},{end:project3DPoint({x:-1.05,y:1.1,z:-.82},view),color:'rgba(120,220,255,.8)',label:labels[1]},{end:project3DPoint({x:-1.05,y:-1.05,z:1.05},view),color:'rgba(255,210,120,.8)',label:labels[2]}];ctx.lineWidth=1.5;for(const axis of axes){ctx.strokeStyle=axis.color;ctx.beginPath();ctx.moveTo(origin.x,origin.y);ctx.lineTo(axis.end.x,axis.end.y);ctx.stroke();ctx.fillStyle=axis.color;ctx.fillText(axis.label,axis.end.x+4,axis.end.y-4);}}
  function current3DView(key,baseScale,w,h){const state=view3D[key]||view3D.field,autoOrbit=Boolean(panel?.querySelector('#sl-auto-orbit')?.checked);return{originX:w*.5,originY:h*.62,scale:Math.min(w,h)*baseScale*clamp(state.zoom,.55,2.4),yawDeg:state.yawDeg+(autoOrbit?phase*2.5:0),pitchDeg:state.pitchDeg};}
  function setup3DInteraction(canvas,key){if(!canvas||canvas.dataset.sl3dReady==='1')return;canvas.dataset.sl3dReady='1';canvas.tabIndex=0;canvas.setAttribute('role','img');canvas.setAttribute('aria-label',`${key} 3D demonstration. Drag to orbit. Use mouse wheel to zoom.`);canvas.addEventListener('pointerdown',event=>{pointer3D={key,pointerId:event.pointerId,x:event.clientX,y:event.clientY};canvas.setPointerCapture?.(event.pointerId);});canvas.addEventListener('pointermove',event=>{if(!pointer3D||pointer3D.pointerId!==event.pointerId||pointer3D.key!==key)return;const view=view3D[key];view.yawDeg+=(event.clientX-pointer3D.x)*.45;view.pitchDeg=clamp(view.pitchDeg-(event.clientY-pointer3D.y)*.35,-75,75);pointer3D.x=event.clientX;pointer3D.y=event.clientY;drawAll3D(current);});const release=event=>{if(pointer3D?.pointerId===event.pointerId)pointer3D=null;};canvas.addEventListener('pointerup',release);canvas.addEventListener('pointercancel',release);canvas.addEventListener('wheel',event=>{event.preventDefault();view3D[key].zoom=clamp(view3D[key].zoom*(event.deltaY>0?.92:1.08),.55,2.4);drawAll3D(current);},{passive:false});canvas.addEventListener('keydown',event=>{const view=view3D[key];if(event.key==='ArrowLeft')view.yawDeg-=5;else if(event.key==='ArrowRight')view.yawDeg+=5;else if(event.key==='ArrowUp')view.pitchDeg=clamp(view.pitchDeg+5,-75,75);else if(event.key==='ArrowDown')view.pitchDeg=clamp(view.pitchDeg-5,-75,75);else if(event.key==='+'||event.key==='=')view.zoom=clamp(view.zoom*1.08,.55,2.4);else if(event.key==='-')view.zoom=clamp(view.zoom*.92,.55,2.4);else return;event.preventDefault();drawAll3D(current);});}
  function setupAll3DInteractions(){setup3DInteraction(panel?.querySelector('#sl-field-3d-canvas'),'field');setup3DInteraction(panel?.querySelector('#sl-antenna-3d-canvas'),'antenna');setup3DInteraction(panel?.querySelector('#sl-environment-3d-canvas'),'environment');setup3DInteraction(panel?.querySelector('#sl-mixer-3d-canvas'),'mixer');}
  function drawField3D(state){const canvas=panel?.querySelector('#sl-field-3d-canvas');if(!canvas||!state)return;const{w,h,dpr}=fitCanvas(canvas),ctx=canvas.getContext('2d');ctx.clearRect(0,0,w,h);grid(ctx,w,h);ctx.font=`${11*dpr}px sans-serif`;const view=current3DView('field',.23,w,h);draw3DAxes(ctx,view,['propagation','E','H']);const samples=buildFieldVolumeSamples({sourceHz:state.config.sourceHz,response:state.analysis.direct.response},phase);for(const [key,color] of [['pointE','rgba(114,213,255,.92)'],['pointH','rgba(255,184,108,.92)']]){ctx.strokeStyle=color;ctx.lineWidth=2*dpr;ctx.beginPath();samples.forEach((sample,index)=>{const p=project3DPoint(sample[key],view);if(!index)ctx.moveTo(p.x,p.y);else ctx.lineTo(p.x,p.y);});ctx.stroke();}ctx.fillStyle='#dfe8ee';ctx.fillText('3D field volume demonstration',12*dpr,18*dpr);}
  function drawAntenna3D(state){const canvas=panel?.querySelector('#sl-antenna-3d-canvas');if(!canvas||!state)return;const{w,h,dpr}=fitCanvas(canvas),ctx=canvas.getContext('2d');ctx.clearRect(0,0,w,h);grid(ctx,w,h);ctx.font=`${11*dpr}px sans-serif`;const view=current3DView('antenna',.22,w,h);draw3DAxes(ctx,view,['X','Y','Z']);const source=state.config.environment.source,tuning=state.analysis.experiments.txResponse.voltageTransfer,rings=buildAntennaLobeSamples(source,tuning);rings.forEach((ring,ri)=>{ctx.beginPath();ring.forEach((v,i)=>{const p=project3DPoint(v,view);if(!i)ctx.moveTo(p.x,p.y);else ctx.lineTo(p.x,p.y);});ctx.strokeStyle=`rgba(114,213,255,${.18+.62*ri/Math.max(1,rings.length-1)})`;ctx.stroke();});ctx.fillStyle='#dfe8ee';ctx.fillText(`3D antenna tuning · ${state.analysis.experiments.txResponse.responseDb.toFixed(2)} dB`,12*dpr,18*dpr);}
  function drawEnvironment3D(state){const canvas=panel?.querySelector('#sl-environment-3d-canvas');if(!canvas||!state)return;const{w,h,dpr}=fitCanvas(canvas),ctx=canvas.getContext('2d'),map=state.analysis.experiments.selectedMap,mesh=buildEnvironmentSurfaceMesh(map),view=current3DView('environment',.17,w,h);view.originY=h*.74;ctx.clearRect(0,0,w,h);grid(ctx,w,h);ctx.font=`${11*dpr}px sans-serif`;draw3DAxes(ctx,view,['X','Y','power']);for(let yi=0;yi<mesh.resolutionY;yi+=1){ctx.beginPath();for(let xi=0;xi<mesh.resolutionX;xi+=1){const p=project3DPoint(mesh.vertices[yi*mesh.resolutionX+xi],view);if(!xi)ctx.moveTo(p.x,p.y);else ctx.lineTo(p.x,p.y);}ctx.strokeStyle=`rgba(130,200,255,${.25+.45*yi/Math.max(1,mesh.resolutionY-1)})`;ctx.stroke();}ctx.fillStyle='#dfe8ee';ctx.fillText(`3D ${map.label}`,12*dpr,18*dpr);ctx.fillText(`fade ${map.fadeDepthDb.toFixed(2)} dB`,12*dpr,34*dpr);}
  function drawMixer3D(state){const canvas=panel?.querySelector('#sl-mixer-3d-canvas');if(!canvas||!state)return;const{w,h,dpr}=fitCanvas(canvas),ctx=canvas.getContext('2d'),scene=buildMixerProductScene(state.analysis);ctx.clearRect(0,0,w,h);grid(ctx,w,h);ctx.font=`${11*dpr}px sans-serif`;const minF=Math.min(...scene.map(r=>r.frequencyHz)),maxF=Math.max(...scene.map(r=>r.frequencyHz)),span=Math.max(1,maxF-minF),maxOrder=Math.max(...scene.map(r=>r.order)),view=current3DView('mixer',.2,w,h);view.originX=w*.17;view.originY=h*.82;draw3DAxes(ctx,view,['frequency','order','strength']);scene.forEach((row,index)=>{const x=(row.frequencyHz-minF)/span*2,y=(row.order-1)/Math.max(1,maxOrder-1)*1.7,z=Math.max(.05,row.amplitude)*1.25,a=project3DPoint({x,y,z:0},view),b=project3DPoint({x,y,z},view);ctx.strokeStyle=row.inReceiverBand?'rgba(156,255,156,.94)':index<2?'rgba(255,184,108,.9)':'rgba(215,168,255,.8)';ctx.lineWidth=3*dpr;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();if(index<9){ctx.fillStyle=ctx.strokeStyle;ctx.fillText(row.label,b.x+4,b.y-4);}});ctx.fillStyle='#dfe8ee';ctx.fillText(`3D ${state.analysis.experiments.interfrequency.mechanism} product space`,12*dpr,18*dpr);}
  function drawAll3D(state){if(!state)return;drawField3D(state);drawAntenna3D(state);drawEnvironment3D(state);drawMixer3D(state);}

  function comparisonRow(label,row){return`<tr><td>${esc(label)}</td><td>${row.meanLevelDeltaDb.toFixed(2)} dB</td><td>${row.peakDeltaDb.toFixed(2)} dB</td><td>${row.fadeDepthDeltaDb.toFixed(2)} dB</td><td>${(row.detectableAreaDelta*100).toFixed(1)} pp</td><td>${row.rmsDeltaDb.toFixed(2)} dB</td></tr>`;}
  function render(state){
    const target=panel.querySelector('[data-sl-results]'),a=state.analysis,c=state.config,e=a.experiments,m=e.selectedMap,r=e.resolution,inter=e.interfrequency,z=seriesRlcImpedance(c.sourceHz,c.antenna.resistanceOhm,c.antenna.inductanceH,c.antenna.capacitanceF);
    const products=(inter.products||[]).slice(0,18).map(row=>`<tr><td>${hz(row.frequencyHz)}</td><td>${row.order}</td><td>${esc(row.expression)}</td><td>${row.estimatedPowerDbm.toFixed(2)} dBm</td><td>${row.propagating?'propagating source product':'receiver-local response'}</td></tr>`).join('')||'<tr><td colspan="5">No products above the configured floor.</td></tr>';
    const resolutionRows=r.frequencies.map(row=>`<tr><td>${hz(row.frequencyHz)}</td><td>${eng(row.wavelengthM,'m')}</td><td>${row.samplesPerWavelengthX.toFixed(2)}</td><td>${row.samplesPerWavelengthY.toFixed(2)}</td></tr>`).join('');
    const comparisonRows=comparisonRow('Tuned − untuned',e.comparisons.tunedVsUntuned)+comparisonRow('Narrow-Q − broad-Q',e.comparisons.narrowVsBroad)+comparisonRow('Selected − baseline',e.comparisons.selectedVsBaseline);
    target.innerHTML=`<section class="sl-card sl-experiment-summary"><h3>Experiment matrix</h3><div class="sl-metrics"><div><span>Selected setup</span><strong>${esc(m.label)}</strong></div><div><span>Primary tuning loss</span><strong>${e.tuningOffsetDb.toFixed(2)} dB</strong></div><div><span>TX tune response</span><strong>${e.txResponse.responseDb.toFixed(2)} dB</strong></div><div><span>RX tune response</span><strong>${e.rxResponse.responseDb.toFixed(2)} dB</strong></div><div><span>Selected product</span><strong>${inter.selected?hz(inter.selected.frequencyHz):'none above floor'}</strong></div><div><span>Mixing model</span><strong>${esc(inter.mechanism)}</strong></div><div><span>Detectable map area</span><strong>${(e.statistics.detectableAreaFraction*100).toFixed(1)}%</strong></div><div><span>Mean gradient</span><strong>${e.statistics.meanNeighborGradientDb.toFixed(2)} dB/cell</strong></div></div><p>${esc(inter.physicalInterpretation)}. Independent carriers are power-combined, not phase-added across unlike frequencies.</p></section>
<section class="sl-card"><h3>Physical map resolution diagnostics</h3><div class="sl-metrics"><div><span>Display grid</span><strong>${m.resolutionX} × ${m.resolutionY}</strong></div><div><span>Cell size</span><strong>${r.cellWidthM.toFixed(3)} × ${r.cellHeightM.toFixed(3)} m</strong></div><div><span>Shortest wavelength</span><strong>${r.shortestWavelengthM?eng(r.shortestWavelengthM,'m'):'—'}</strong></div><div><span>Minimum samples / λ</span><strong>${Number.isFinite(r.minimumSamplesPerWavelength)?r.minimumSamplesPerWavelength.toFixed(2):'—'}</strong></div><div><span>Under-sampled</span><strong>${r.undersampled?'YES':'no'}</strong></div><div><span>Over-sampled vs model</span><strong>${r.oversampled?'YES':'no'}</strong></div><div><span>Effective confidence</span><strong>${(r.effectiveConfidence*100).toFixed(1)}%</strong></div></div><div class="sl-table"><table><thead><tr><th>Frequency</th><th>Wavelength</th><th>samples/λ X</th><th>samples/λ Y</th></tr></thead><tbody>${resolutionRows}</tbody></table></div><p>${r.reasons.map(esc).join('; ')}. Increasing pixel count alone is not treated as increasing physical certainty.</p></section>
<section class="sl-card"><h3>Controlled experiment comparisons</h3><div class="sl-table"><table><thead><tr><th>Comparison</th><th>Mean Δ</th><th>Peak Δ</th><th>Fade Δ</th><th>Detectable-area Δ</th><th>RMS map Δ</th></tr></thead><tbody>${comparisonRows}</tbody></table></div></section>
<section class="sl-card"><h3>Interfrequency products</h3><div class="sl-table"><table><thead><tr><th>Frequency</th><th>Order</th><th>Expression</th><th>Estimated level</th><th>Interpretation</th></tr></thead><tbody>${products}</tbody></table></div></section>
<section class="sl-card"><h3>Measurement snapshot</h3><div class="sl-metrics"><div><span>Detailed RLC resonance</span><strong>${hz(a.direct.response.resonantHz)}</strong></div><div><span>Source wavelength</span><strong>${eng(wavelength(c.sourceHz),'m')}</strong></div><div><span>Detailed antenna response</span><strong>${a.direct.response.responseDb.toFixed(2)} dB</strong></div><div><span>Impedance</span><strong>${z.magnitude.toFixed(2)} Ω ∠ ${z.phaseDeg.toFixed(1)}°</strong></div><div><span>Receiver input</span><strong>${a.direct.receiverInputDbm.toFixed(2)} dBm</strong></div><div><span>Noise floor</span><strong>${a.direct.noiseFloorDbm.toFixed(2)} dBm</strong></div><div><span>Model SNR</span><strong>${a.direct.snrDb.toFixed(2)} dB</strong></div></div></section>
<section class="sl-boundary"><strong>Physical boundary:</strong> this remains a geometric RF research model, not a full-wave Maxwell/FDTD solver. Source-side nonlinear products may be propagated only when the experiment explicitly models generation at the source. Receiver/front-end mixing products are local detector responses. Out-of-band inference still requires real coupling, leakage, beat, impedance/loading change, sideband, or nonlinear conversion above noise and calibration error. Mathematical processing alone cannot reconstruct arbitrary RF energy that never reaches or perturbs the antenna/front end.</section>`;
  }
  function update(){const config=readConfig(),analysis=analyzeConfiguration(config);current=freeze({config,analysis});render(current);drawField(current);drawSweep(current);drawEnvironment(current);drawComparison(current);drawAll3D(current);const s=panel.querySelector('[data-sl-status]');s.textContent='Experiment matrix updated.';s.dataset.kind='success';return current;}
  function animate(){if(!panel||panel.hidden){frameHandle=0;return;}if(panel.querySelector('#sl-animate')?.checked&&current){phase+=.055;drawField(current);drawAll3D(current);}frameHandle=root.requestAnimationFrame?.(animate)||0;}
  function applyMapPreset(){if(!panel)return;const name=value('#sl-map-preset','wifi-2.4'),preset=wifiPreset(name),frequency=panel.querySelector('#sl-map-frequency-mhz');if(frequency){frequency.disabled=name!=='custom';if(name!=='custom')frequency.value=String(preset.frequencyHz/1e6);}for(const id of ['#sl-exp-tx-tune-mhz','#sl-exp-rx-tune-mhz']){const input=panel.querySelector(id);if(input&&name!=='custom')input.value=String(preset.frequencyHz/1e6);}}

  function buildPanel(){
    if(!root?.document)fail('Signals Laboratory requires a browser document.');
    const existing=root.document.getElementById(PANEL_ID);if(existing){panel=existing;return panel;}ensureStyle();panel=root.document.createElement('section');panel.id=PANEL_ID;panel.className='sl-shell';panel.hidden=true;
    panel.innerHTML=`<div class="sl-backdrop" data-sl-close></div><div class="sl-panel" role="dialog" aria-modal="true" aria-labelledby="sl-title"><header class="sl-header"><div><p class="sl-eyebrow">Scientific Tools · Electromagnetic Signal Research</p><h2 id="sl-title">Signals Laboratory</h2><p>RF propagation, tunable antennas, impedance, heterodyne and interfrequency experiments, physical-resolution diagnostics, and fully 3D animated demonstrations driven by the same authoritative solver.</p></div><button class="sl-close" data-sl-close aria-label="Close Signals Laboratory">×</button></header><div class="sl-body"><aside class="sl-controls">
<section class="sl-card"><h3>RF environment mapper</h3><label>Source preset<select id="sl-map-preset"><option value="wifi-2.4">Wi‑Fi 2.4 GHz example</option><option value="wifi-5">Wi‑Fi 5 GHz example</option><option value="wifi-6">Wi‑Fi 6 GHz example</option><option value="custom">Custom RF source</option></select></label><label>Map frequency (MHz)<input id="sl-map-frequency-mhz" type="number" value="2437" disabled></label><label>Source power (dBm)<input id="sl-map-tx-dbm" type="number" value="20"></label><label>Radiator<select id="sl-map-antenna"><option value="dipole">Half-wave dipole</option><option value="monopole">Quarter-wave monopole / ideal ground plane</option><option value="isotropic">Isotropic reference</option></select></label><label>Antenna azimuth (deg)<input id="sl-map-azimuth" type="number" value="0"></label><label>Antenna elevation (deg)<input id="sl-map-elevation" type="number" value="90"></label><label>Source X (m)<input id="sl-map-source-x" type="number" value="0"></label><label>Source Y (m)<input id="sl-map-source-y" type="number" value="0"></label><label>Source height (m)<input id="sl-map-source-z" type="number" value="1.8"></label><label>Map width (m)<input id="sl-map-width" type="number" value="24"></label><label>Map height (m)<input id="sl-map-height" type="number" value="18"></label><label>Sample height (m)<input id="sl-map-sample-height" type="number" value="1.2"></label><label>Spatial resolution<input id="sl-map-resolution" type="range" min="${MIN_MAP_RESOLUTION}" max="${MAX_MAP_RESOLUTION}" step="4" value="48"></label><label>Field coherence 0–1<input id="sl-map-coherence" type="number" min="0" max="1" step=".05" value=".85"></label><label>Vertical wall X (m)<input id="sl-map-wall-x" type="number" value="6"></label><label>Horizontal wall Y (m)<input id="sl-map-wall-y" type="number" value="-4"></label><label>Wall reflectivity 0–1<input id="sl-map-reflectivity" type="number" min="0" max=".99" step=".05" value=".45"></label><label>Wall penetration loss (dB)<input id="sl-map-penetration-loss" type="number" min="0" value="5"></label><label>Reflection phase (deg)<input id="sl-map-reflection-phase" type="number" value="180"></label></section>
<section class="sl-card sl-experiment-controls"><h3>Experiment matrix</h3><label>Displayed experiment<select id="sl-exp-map-mode"><option value="baseline">Baseline untuned field</option><option value="tuned" selected>Tuned primary carrier</option><option value="secondary">Secondary carrier</option><option value="product">Selected interfrequency product</option><option value="composite">Detector-integrated composite</option><option value="narrow">Narrow-Q primary</option><option value="broad">Broad-Q primary</option></select></label><label class="sl-check"><input id="sl-exp-apply-tuning" type="checkbox"> Apply electrical tuning to RF maps</label><label>TX tuning center (MHz)<input id="sl-exp-tx-tune-mhz" type="number" value="2437"></label><label>TX Q<input id="sl-exp-tx-q" type="number" min=".1" value="8"></label><label>RX tuning center (MHz)<input id="sl-exp-rx-tune-mhz" type="number" value="2437"></label><label>RX Q<input id="sl-exp-rx-q" type="number" min=".1" value="8"></label><label>Polarization alignment 0–1<input id="sl-exp-polarization" type="number" min="0" max="1" step=".05" value="1"></label><label>Narrow-Q comparison<input id="sl-exp-narrow-q" type="number" min=".1" value="24"></label><label>Broad-Q comparison<input id="sl-exp-broad-q" type="number" min=".1" value="3"></label><label>Detection threshold (dBm)<input id="sl-exp-detect-threshold" type="number" value="-90"></label></section>
<section class="sl-card"><h3>Second carrier / interfrequency</h3><label>Secondary frequency (MHz)<input id="sl-exp-secondary-mhz" type="number" value="2462"></label><label>Secondary power (dBm)<input id="sl-exp-secondary-power" type="number" value="17"></label><label>Secondary radiator<select id="sl-exp-secondary-antenna"><option value="dipole">Half-wave dipole</option><option value="monopole">Quarter-wave monopole</option><option value="isotropic">Isotropic reference</option></select></label><label>Secondary X (m)<input id="sl-exp-secondary-x" type="number" value="3"></label><label>Secondary Y (m)<input id="sl-exp-secondary-y" type="number" value="-2"></label><label>Secondary height (m)<input id="sl-exp-secondary-z" type="number" value="1.8"></label><label>Mixing location<select id="sl-exp-mix-mechanism"><option value="receiver-front-end">Receiver/front-end nonlinear detector</option><option value="source-nonlinearity">Source-side nonlinear generation</option></select></label><label>Product selection<select id="sl-exp-product-mode"><option value="difference">|f1 − f2| difference</option><option value="sum">f1 + f2 sum</option><option value="im3-lower">2f1 − f2</option><option value="im3-upper">2f2 − f1</option></select></label><label>Mixing coupling 0–1<input id="sl-exp-mix-coupling" type="number" min="0" max="1" step=".01" value=".05"></label><label>Nonlinearity 0–1<input id="sl-exp-mix-nonlinearity" type="number" min="0" max="1" step=".01" value=".03"></label><label>Maximum IM order<input id="sl-exp-max-order" type="number" min="2" max="5" value="3"></label><label>Product floor (dBm)<input id="sl-exp-product-floor" type="number" value="-120"></label><p class="sl-hint">Receiver products are detector-response maps. Only source-generated products are treated as propagating RF.</p></section>
<section class="sl-card"><h3>Source & receiver measurement</h3><label>Source frequency (MHz)<input id="sl-source-mhz" type="number" value="145.8"></label><label>TX power (dBm)<input id="sl-tx-dbm" type="number" value="30"></label><label>TX gain (dB)<input id="sl-tx-gain" type="number" value="2.15"></label><label>RX gain (dB)<input id="sl-rx-gain" type="number" value="0"></label><label>Distance (m)<input id="sl-distance-m" type="number" min=".001" value="1000"></label><label>Extra loss (dB)<input id="sl-extra-loss" type="number" min="0" value="0"></label><label>Receiver center (MHz)<input id="sl-rx-center-mhz" type="number" value="10.7"></label><label>Receiver bandwidth (kHz)<input id="sl-rx-bandwidth-khz" type="number" value="25"></label><label>Noise figure (dB)<input id="sl-noise-figure" type="number" value="6"></label></section>
<section class="sl-card"><h3>Detailed RLC antenna</h3><label>Resistance (Ω)<input id="sl-resistance-ohm" type="number" value="50"></label><label>Inductance (µH)<input id="sl-inductance-uh" type="number" value=".120"></label><label>Capacitance (pF)<input id="sl-capacitance-pf" type="number" value="10"></label><label>Quality factor Q<input id="sl-q" type="number" value="8"></label><label>Feed impedance (Ω)<input id="sl-feed-ohm" type="number" value="50"></label></section>
<section class="sl-card"><h3>Heterodyne / carrier probe</h3><label>Local oscillator (MHz)<input id="sl-lo-mhz" type="number" value="135.1"></label><label>Known carrier (MHz)<input id="sl-carrier-mhz" type="number" value="145"></label><label>Carrier amplitude<input id="sl-carrier-amplitude" type="number" value="1"></label><label>Unknown/source amplitude<input id="sl-source-amplitude" type="number" value=".1"></label><label>Field coupling 0–1<input id="sl-coupling" type="number" min="0" max="1" value=".05"></label><label>Front-end nonlinearity<input id="sl-nonlinearity" type="number" min="0" value=".03"></label><label>Observed IF / beat (kHz)<input id="sl-observed-khz" type="number" value="800"></label></section>
<section class="sl-card"><h3>Sweep & animation</h3><label>Sweep min (MHz)<input id="sl-sweep-min-mhz" type="number" value="1"></label><label>Sweep max (MHz)<input id="sl-sweep-max-mhz" type="number" value="6500"></label><label>Sweep samples<input id="sl-sweep-points" type="number" min="16" max="${MAX_SWEEP_POINTS}" value="256"></label><label class="sl-check"><input id="sl-animate" type="checkbox" checked> Animate demonstrations</label><label class="sl-check"><input id="sl-auto-orbit" type="checkbox" checked> Auto-orbit 3D scenes</label><p class="sl-hint">3D panels: drag to orbit, wheel or +/- to zoom, arrow keys to rotate.</p><button class="sl-primary" data-sl-run>Run experiment matrix</button><div class="sl-status" data-sl-status>Ready.</div></section>
</aside><main class="sl-workspace">
<section class="sl-card sl-map-card"><div class="sl-section-head"><h3>3D selected RF experiment</h3><span>selected field / detector-response topology</span></div><canvas id="sl-environment-3d-canvas" class="sl-canvas sl-three-d"></canvas></section>
<section class="sl-card"><div class="sl-section-head"><h3>3D electromagnetic field demonstration</h3><span>orthogonal E/H field volume</span></div><canvas id="sl-field-3d-canvas" class="sl-canvas sl-three-d"></canvas></section>
<section class="sl-card"><div class="sl-section-head"><h3>3D antenna radiation / tuning</h3><span>geometry plus electrical response</span></div><canvas id="sl-antenna-3d-canvas" class="sl-canvas sl-three-d"></canvas></section>
<section class="sl-card"><div class="sl-section-head"><h3>3D interfrequency product space</h3><span>frequency × order × modeled strength</span></div><canvas id="sl-mixer-3d-canvas" class="sl-canvas sl-three-d"></canvas></section>
<section class="sl-card sl-map-card"><div class="sl-section-head"><h3>Selected experiment map</h3><span>same geometry, configurable physical mechanism</span></div><canvas id="sl-environment-canvas" class="sl-canvas sl-environment"></canvas></section>
<section class="sl-card sl-map-card"><div class="sl-section-head"><h3>Experiment delta map</h3><span>selected minus baseline, dB</span></div><canvas id="sl-comparison-canvas" class="sl-canvas sl-environment sl-comparison"></canvas></section>
<section class="sl-card"><div class="sl-section-head"><h3>Electromagnetic field visualization</h3><span>orthogonal E/H field</span></div><canvas id="sl-field-canvas" class="sl-canvas"></canvas></section>
<section class="sl-card"><div class="sl-section-head"><h3>Antenna attenuation / tuning sweep</h3><span>log-frequency response</span></div><canvas id="sl-spectrum-canvas" class="sl-canvas sl-spectrum"></canvas></section><div data-sl-results></div></main></div></div>`;
    root.document.body.appendChild(panel);
    if(root.matchMedia?.('(prefers-reduced-motion: reduce)').matches){const animateBox=panel.querySelector('#sl-animate'),orbitBox=panel.querySelector('#sl-auto-orbit');if(animateBox)animateBox.checked=false;if(orbitBox)orbitBox.checked=false;}
    setupAll3DInteractions();
    panel.querySelectorAll('[data-sl-close]').forEach(node=>node.addEventListener('click',closePanel));
    panel.querySelector('[data-sl-run]').addEventListener('click',()=>{try{update();}catch(error){const s=panel.querySelector('[data-sl-status]');s.textContent=error.message;s.dataset.kind='error';}});
    panel.querySelector('#sl-map-preset')?.addEventListener('change',applyMapPreset);
    panel.querySelector('#sl-auto-orbit')?.addEventListener('change',()=>drawAll3D(current));
    return panel;
  }
  function openPanel(options={}){const target=buildPanel();target.hidden=false;root.document.body.classList.add('sl-open');if(options.sourceMHz!==undefined)target.querySelector('#sl-source-mhz').value=String(options.sourceMHz);if(options.mapPreset){target.querySelector('#sl-map-preset').value=String(options.mapPreset);applyMapPreset();}update();if(!frameHandle&&root.requestAnimationFrame)frameHandle=root.requestAnimationFrame(animate);return target;}
  function closePanel(){if(!panel)return;panel.hidden=true;root?.document?.body?.classList.remove('sl-open');if(frameHandle&&root.cancelAnimationFrame)root.cancelAnimationFrame(frameHandle);frameHandle=0;}
  function currentState(){return freeze({panelOpen:Boolean(panel&&!panel.hidden),active:current});}

  return freeze({
    openPanel,closePanel,currentState,analyzeConfiguration,
    utilities:freeze({wavelength,resonantFrequency,seriesRlcImpedance,mismatch,resonanceTransfer,bandpassTuningResponse,antennaResponse,freeSpacePathLossDb,planeWaveFieldVPerM,thermalNoiseFloorDbm,directReception,heterodyneProducts,intermodulationProducts,adjacentCarrierProbe,inferSourceCandidates,estimateRangeScenarios,logarithmicSweep,sweepAntenna,antennaAxis,halfWaveDipolePowerPattern,monopolePowerPattern,sourceDirectionalGainDb,mirrorPointAcrossPlane,crossesPlane,pathPowerDbm,reflectedPath,environmentPoint,buildEnvironmentMap,progressiveEnvironmentMaps,mapWithDbOffset,combineIndependentMaps,mapStatistics,compareMaps,mapConvergence,resolutionDiagnostics,wifiPreset,interfrequencyExperiment,buildReceiverMixingMap,buildPropagatingProductMap,buildExperimentSuite,project3DPoint,buildFieldVolumeSamples,buildAntennaLobeSamples,buildEnvironmentSurfaceMesh,buildMixerProductScene}),
    constants:freeze({VERSION,PANEL_ID,C,K_B,DEFAULT_TEMPERATURE_K,MAX_SWEEP_POINTS,MAX_MAP_RESOLUTION,MIN_MAP_RESOLUTION,DEFAULT_DETECT_THRESHOLD_DBM})
  });
});
