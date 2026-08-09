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

  function ensureStyle() {
    if (!root?.document || root.document.getElementById(STYLE_ID)) return;
    const link = root.document.createElement('link');
    link.id = STYLE_ID;
    link.rel = 'stylesheet';
    link.href = 'signals-laboratory.css?v=20260809-signals-lab-1';
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
  function analyzeConfiguration(config) {
    const direct = directReception({ frequencyHz: config.sourceHz, distanceM: config.distanceM, txPowerDbm: config.txPowerDbm, txGainDb: config.txGainDb, rxGainDb: config.rxGainDb, extraLossDb: config.extraLossDb, antenna: config.antenna, receiverCenterHz: config.receiverCenterHz, receiverBandwidthHz: config.receiverBandwidthHz, noiseFigureDb: config.noiseFigureDb });
    const heterodyne = heterodyneProducts(config.sourceHz, config.localOscillatorHz);
    const probe = adjacentCarrierProbe({ carrierHz: config.carrierHz, sourceHz: config.sourceHz, receiverCenterHz: config.receiverCenterHz, receiverBandwidthHz: config.receiverBandwidthHz, coupling: config.coupling, nonlinearity: config.nonlinearity, carrierAmplitude: config.carrierAmplitude, sourceAmplitude: config.sourceAmplitude });
    const sweep = sweepAntenna({ minHz: config.sweepMinHz, maxHz: config.sweepMaxHz, points: config.sweepPoints, antenna: config.antenna });
    const inference = inferSourceCandidates({ observedHz: config.observedHz, localOscillatorHz: config.localOscillatorHz, carrierHz: config.carrierHz });
    const ranges = estimateRangeScenarios({ receivedDbm: direct.receiverInputDbm, frequencyHz: config.sourceHz, txGainDb: config.txGainDb, rxGainDb: config.rxGainDb, extraLossDb: config.extraLossDb });
    return Object.freeze({ direct, heterodyne, probe, sweep, inference, ranges, sourceFieldVPerM: planeWaveFieldVPerM(config.txPowerDbm, config.txGainDb, config.distanceM) });
  }

  function hz(value) { const f = Math.abs(value); return f >= 1e9 ? `${(f/1e9).toFixed(6)} GHz` : f >= 1e6 ? `${(f/1e6).toFixed(6)} MHz` : f >= 1e3 ? `${(f/1e3).toFixed(3)} kHz` : `${f.toFixed(3)} Hz`; }
  function eng(value, unit='') { const n=Number(value)||0,a=Math.abs(n); if(a>=1e6)return `${(n/1e6).toFixed(3)} M${unit}`; if(a>=1e3)return `${(n/1e3).toFixed(3)} k${unit}`; if(a>=1)return `${n.toFixed(3)} ${unit}`.trim(); if(a>=1e-3)return `${(n*1e3).toFixed(3)} m${unit}`; if(a>=1e-6)return `${(n*1e6).toFixed(3)} µ${unit}`; return `${n.toExponential(3)} ${unit}`.trim(); }
  function num(selector, scale=1) { return finite(panel.querySelector(selector)?.value) * scale; }
  function readConfig() {
    const inductanceH = num('#sl-inductance-uh',1e-6), capacitanceF = num('#sl-capacitance-pf',1e-12);
    return Object.freeze({ sourceHz:num('#sl-source-mhz',1e6), txPowerDbm:num('#sl-tx-dbm'), txGainDb:num('#sl-tx-gain'), rxGainDb:num('#sl-rx-gain'), distanceM:num('#sl-distance-m'), extraLossDb:num('#sl-extra-loss'), receiverCenterHz:num('#sl-rx-center-mhz',1e6), receiverBandwidthHz:num('#sl-rx-bandwidth-khz',1e3), noiseFigureDb:num('#sl-noise-figure'), localOscillatorHz:num('#sl-lo-mhz',1e6), carrierHz:num('#sl-carrier-mhz',1e6), coupling:num('#sl-coupling'), nonlinearity:num('#sl-nonlinearity'), carrierAmplitude:num('#sl-carrier-amplitude'), sourceAmplitude:num('#sl-source-amplitude'), observedHz:num('#sl-observed-khz',1e3), sweepMinHz:num('#sl-sweep-min-mhz',1e6), sweepMaxHz:num('#sl-sweep-max-mhz',1e6), sweepPoints:num('#sl-sweep-points'), antenna:Object.freeze({ resonantHz:resonantFrequency(inductanceH,capacitanceF), resistanceOhm:num('#sl-resistance-ohm'), inductanceH, capacitanceF, q:num('#sl-q'), feedOhm:num('#sl-feed-ohm') }) });
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
  function render(state) {
    const target=panel.querySelector('[data-sl-results]'),a=state.analysis,c=state.config,z=seriesRlcImpedance(c.sourceHz,c.antenna.resistanceOhm,c.antenna.inductanceH,c.antenna.capacitanceF);
    const candidates=a.inference.map(row=>`<tr><td>${esc(hz(row.frequencyHz))}</td><td>${esc(row.mechanism)}</td><td><code>${esc(row.equation)}</code></td></tr>`).join('')||'<tr><td colspan="3">No candidates.</td></tr>';
    const products=a.probe.products.slice(0,14).map(row=>`<tr><td>${esc(hz(row.frequencyHz))}</td><td>${row.order}</td><td>${esc(row.expression)}</td><td>${row.inReceiverBand?'IN BAND':'outside'}</td></tr>`).join('');
    const ranges=a.ranges.map(row=>`<tr><td>${row.txPowerDbm} dBm</td><td>${eng(row.distanceM,'m')}</td><td>${row.allowedPathLossDb.toFixed(2)} dB</td></tr>`).join('');
    target.innerHTML=`<section class="sl-card"><h3>Measurement snapshot</h3><div class="sl-metrics"><div><span>Antenna resonance</span><strong>${hz(a.direct.response.resonantHz)}</strong></div><div><span>Source wavelength</span><strong>${eng(wavelength(c.sourceHz),'m')}</strong></div><div><span>Antenna response</span><strong>${a.direct.response.responseDb.toFixed(2)} dB</strong></div><div><span>Impedance</span><strong>${z.magnitude.toFixed(2)} Ω ∠ ${z.phaseDeg.toFixed(1)}°</strong></div><div><span>Path loss</span><strong>${a.direct.fsplDb.toFixed(2)} dB</strong></div><div><span>Receiver input</span><strong>${a.direct.receiverInputDbm.toFixed(2)} dBm</strong></div><div><span>Noise floor</span><strong>${a.direct.noiseFloorDbm.toFixed(2)} dBm</strong></div><div><span>Model SNR</span><strong>${a.direct.snrDb.toFixed(2)} dB</strong></div><div><span>Direct receiver band</span><strong>${a.direct.inReceiverBand?'yes':'no'}</strong></div><div><span>Source field</span><strong>${eng(a.sourceFieldVPerM,'V/m')}</strong></div></div></section><section class="sl-card"><h3>Heterodyne & adjacent-carrier effects</h3><p>The mixer can translate energy that actually couples into the front end; it does not create a signal that produced no physical or correlated effect at the receiver.</p><div class="sl-metrics"><div><span>|RF − LO|</span><strong>${hz(a.heterodyne.differenceHz)}</strong></div><div><span>RF + LO</span><strong>${hz(a.heterodyne.sumHz)}</strong></div><div><span>Carrier beat</span><strong>${hz(a.probe.beatHz)}</strong></div><div><span>Carrier perturbation</span><strong>${(a.probe.modulationIndex*100).toFixed(6)}%</strong></div></div><div class="sl-table"><table><thead><tr><th>Product</th><th>Order</th><th>Expression</th><th>Receiver</th></tr></thead><tbody>${products}</tbody></table></div></section><section class="sl-card"><h3>Frequency inference candidates</h3><p>Mirror/image solutions are kept rather than silently choosing one.</p><div class="sl-table"><table><thead><tr><th>Candidate</th><th>Mechanism</th><th>Equation</th></tr></thead><tbody>${candidates}</tbody></table></div></section><section class="sl-card"><h3>Range scenarios</h3><p>Amplitude does not uniquely determine range without transmitter power, gains, polarization, propagation, and loss assumptions.</p><div class="sl-table"><table><thead><tr><th>Assumed TX</th><th>Implied range</th><th>Allowed loss</th></tr></thead><tbody>${ranges}</tbody></table></div></section><section class="sl-boundary"><strong>Physical boundary:</strong> out-of-band inference requires a real coupling, leakage, beat, impedance/loading change, sideband, or nonlinear mixing mechanism above noise and calibration error. Mathematical processing alone cannot reconstruct arbitrary RF energy that never reaches or perturbs the antenna/front end.</section>`;
  }
  function update() { const config=readConfig(),analysis=analyzeConfiguration(config);current=Object.freeze({config,analysis});render(current);drawField(current);drawSweep(current);const s=panel.querySelector('[data-sl-status]');s.textContent='Model updated.';s.dataset.kind='success';return current; }
  function animate(){if(!panel||panel.hidden){frameHandle=0;return;}if(panel.querySelector('#sl-animate')?.checked&&current){phase+=.055;drawField(current);}frameHandle=root.requestAnimationFrame?.(animate)||0;}
  function buildPanel() {
    if (!root?.document) fail('Signals Laboratory requires a browser document.');
    const existing=root.document.getElementById(PANEL_ID); if(existing){panel=existing;return panel;} ensureStyle(); panel=root.document.createElement('section');panel.id=PANEL_ID;panel.className='sl-shell';panel.hidden=true;
    panel.innerHTML=`<div class="sl-backdrop" data-sl-close></div><div class="sl-panel" role="dialog" aria-modal="true" aria-labelledby="sl-title"><header class="sl-header"><div><p class="sl-eyebrow">Scientific Tools · Electromagnetic Signal Research</p><h2 id="sl-title">Signals Laboratory</h2><p>RF field visualization, antenna attenuation/tuning and impedance response, heterodyne translation, adjacent-carrier perturbation, nonlinear mixing, and bounded frequency/range inference.</p></div><button class="sl-close" data-sl-close aria-label="Close Signals Laboratory">×</button></header><div class="sl-body"><aside class="sl-controls"><section class="sl-card"><h3>Source & receiver</h3><label>Source frequency (MHz)<input id="sl-source-mhz" type="number" value="145.8"></label><label>TX power (dBm)<input id="sl-tx-dbm" type="number" value="30"></label><label>TX gain (dB)<input id="sl-tx-gain" type="number" value="2.15"></label><label>RX gain (dB)<input id="sl-rx-gain" type="number" value="0"></label><label>Distance (m)<input id="sl-distance-m" type="number" min=".001" value="1000"></label><label>Extra loss (dB)<input id="sl-extra-loss" type="number" min="0" value="0"></label><label>Receiver center (MHz)<input id="sl-rx-center-mhz" type="number" value="10.7"></label><label>Receiver bandwidth (kHz)<input id="sl-rx-bandwidth-khz" type="number" value="25"></label><label>Noise figure (dB)<input id="sl-noise-figure" type="number" value="6"></label></section><section class="sl-card"><h3>Antenna & impedance</h3><label>Resistance (Ω)<input id="sl-resistance-ohm" type="number" value="50"></label><label>Inductance (µH)<input id="sl-inductance-uh" type="number" value=".120"></label><label>Capacitance (pF)<input id="sl-capacitance-pf" type="number" value="10"></label><label>Quality factor Q<input id="sl-q" type="number" value="8"></label><label>Feed impedance (Ω)<input id="sl-feed-ohm" type="number" value="50"></label></section><section class="sl-card"><h3>Heterodyne / carrier probe</h3><label>Local oscillator (MHz)<input id="sl-lo-mhz" type="number" value="135.1"></label><label>Known carrier (MHz)<input id="sl-carrier-mhz" type="number" value="145"></label><label>Carrier amplitude<input id="sl-carrier-amplitude" type="number" value="1"></label><label>Unknown/source amplitude<input id="sl-source-amplitude" type="number" value=".1"></label><label>Field coupling 0–1<input id="sl-coupling" type="number" min="0" max="1" value=".05"></label><label>Front-end nonlinearity<input id="sl-nonlinearity" type="number" min="0" value=".03"></label><label>Observed IF / beat (kHz)<input id="sl-observed-khz" type="number" value="800"></label></section><section class="sl-card"><h3>Sweep</h3><label>Sweep min (MHz)<input id="sl-sweep-min-mhz" type="number" value="1"></label><label>Sweep max (MHz)<input id="sl-sweep-max-mhz" type="number" value="500"></label><label>Sweep samples<input id="sl-sweep-points" type="number" min="16" max="${MAX_SWEEP_POINTS}" value="256"></label><label class="sl-check"><input id="sl-animate" type="checkbox" checked> Animate E/H field</label><button class="sl-primary" data-sl-run>Update laboratory</button><div class="sl-status" data-sl-status>Ready.</div></section></aside><main class="sl-workspace"><section class="sl-card"><div class="sl-section-head"><h3>Electromagnetic field visualization</h3><span>orthogonal E/H field</span></div><canvas id="sl-field-canvas" class="sl-canvas"></canvas></section><section class="sl-card"><div class="sl-section-head"><h3>Antenna attenuation / tuning sweep</h3><span>log-frequency response</span></div><canvas id="sl-spectrum-canvas" class="sl-canvas sl-spectrum"></canvas></section><div data-sl-results></div></main></div></div>`;
    root.document.body.appendChild(panel); panel.querySelectorAll('[data-sl-close]').forEach(node=>node.addEventListener('click',closePanel)); panel.querySelector('[data-sl-run]').addEventListener('click',()=>{try{update();}catch(error){const s=panel.querySelector('[data-sl-status]');s.textContent=error.message;s.dataset.kind='error';}}); return panel;
  }
  function openPanel(options={}) { const target=buildPanel();target.hidden=false;root.document.body.classList.add('sl-open');if(options.sourceMHz!==undefined)target.querySelector('#sl-source-mhz').value=String(options.sourceMHz);update();if(!frameHandle&&root.requestAnimationFrame)frameHandle=root.requestAnimationFrame(animate);return target; }
  function closePanel(){if(!panel)return;panel.hidden=true;root?.document?.body?.classList.remove('sl-open');if(frameHandle&&root.cancelAnimationFrame)root.cancelAnimationFrame(frameHandle);frameHandle=0;}
  function currentState(){return Object.freeze({panelOpen:Boolean(panel&&!panel.hidden),active:current});}

  return Object.freeze({ openPanel, closePanel, currentState, analyzeConfiguration, utilities:Object.freeze({ wavelength,resonantFrequency,seriesRlcImpedance,mismatch,resonanceTransfer,antennaResponse,freeSpacePathLossDb,planeWaveFieldVPerM,thermalNoiseFloorDbm,directReception,heterodyneProducts,intermodulationProducts,adjacentCarrierProbe,inferSourceCandidates,estimateRangeScenarios,logarithmicSweep,sweepAntenna }), constants:Object.freeze({ PANEL_ID,C,K_B,DEFAULT_TEMPERATURE_K,MAX_SWEEP_POINTS }) });
});
