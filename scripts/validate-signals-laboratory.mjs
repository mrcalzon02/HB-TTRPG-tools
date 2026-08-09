#!/usr/bin/env node

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const Lab = require('../signals-laboratory.js');
const U = Lab.utilities;

assert.equal(Lab.constants.PANEL_ID, 'signals-laboratory');
assert.equal(typeof Lab.openPanel, 'function');
assert.equal(typeof Lab.analyzeConfiguration, 'function');
assert.equal(typeof U.heterodyneProducts, 'function');
assert.equal(typeof U.adjacentCarrierProbe, 'function');
assert.equal(typeof U.inferSourceCandidates, 'function');
assert.equal(typeof U.buildEnvironmentMap, 'function');
assert.equal(typeof U.progressiveEnvironmentMaps, 'function');
assert.equal(typeof U.environmentPoint, 'function');
assert.equal(typeof U.halfWaveDipolePowerPattern, 'function');
assert.equal(typeof U.monopolePowerPattern, 'function');
assert.equal(typeof U.wifiPreset, 'function');

const L = 0.120e-6;
const C = 10e-12;
const resonance = U.resonantFrequency(L, C);
assert.ok(Math.abs(resonance - 145287920.783) < 1, 'RLC resonance should match the analytic value.');

const antenna = {
  resonantHz: resonance,
  resistanceOhm: 50,
  inductanceH: L,
  capacitanceF: C,
  q: 8,
  feedOhm: 50
};
const atResonance = U.antennaResponse(resonance, antenna);
const farOffResonance = U.antennaResponse(resonance * 2, antenna);
assert.ok(Math.abs(U.seriesRlcImpedance(resonance, 50, L, C).reactance) < 1e-8);
assert.ok(atResonance.voltageTransfer > farOffResonance.voltageTransfer);
assert.ok(atResonance.responseDb > farOffResonance.responseDb);
assert.ok(atResonance.mismatch.returnLossDb > 100);

const loss1km = U.freeSpacePathLossDb(145.8e6, 1000);
const loss10km = U.freeSpacePathLossDb(145.8e6, 10000);
assert.ok(Math.abs((loss10km - loss1km) - 20) < 1e-9, 'Free-space loss should rise by 20 dB for a tenfold range increase.');

const noise25k = U.thermalNoiseFloorDbm(25000, 6, 290);
assert.ok(noise25k < -120 && noise25k > -130, '25 kHz, 290 K, NF=6 dB noise floor should be physically plausible.');

const heterodyne = U.heterodyneProducts(145.8e6, 135.1e6);
assert.equal(heterodyne.differenceHz, 10.7e6);
assert.equal(heterodyne.sumHz, 280.9e6);

const carrierProbe = U.adjacentCarrierProbe({
  carrierHz: 145e6,
  sourceHz: 145.8e6,
  receiverCenterHz: 800e3,
  receiverBandwidthHz: 25e3,
  coupling: 0.05,
  nonlinearity: 0.03,
  carrierAmplitude: 1,
  sourceAmplitude: 0.1
});
assert.equal(carrierProbe.beatHz, 800e3);
assert.ok(carrierProbe.modulationIndex > 0);
assert.ok(carrierProbe.products.some(product => Math.abs(product.frequencyHz - 800e3) < 1e-6));
assert.ok(carrierProbe.inBandProducts.some(product => Math.abs(product.frequencyHz - 800e3) < 1e-6));

const ifCandidates = U.inferSourceCandidates({ observedHz: 10.7e6, localOscillatorHz: 135.1e6 });
assert.ok(ifCandidates.some(candidate => candidate.frequencyHz === 145.8e6));
assert.ok(ifCandidates.some(candidate => candidate.frequencyHz === 124.4e6));
const beatCandidates = U.inferSourceCandidates({ observedHz: 800e3, carrierHz: 145e6 });
assert.ok(beatCandidates.some(candidate => candidate.frequencyHz === 145.8e6));
assert.ok(beatCandidates.some(candidate => candidate.frequencyHz === 144.2e6));

const sweep = U.sweepAntenna({ minHz: 10e6, maxHz: 500e6, points: 128, antenna });
assert.equal(sweep.length, 128);
assert.ok(sweep[0].frequencyHz < sweep.at(-1).frequencyHz);
assert.ok(sweep.some(row => row.responseDb > -1));

const ranges = U.estimateRangeScenarios({ receivedDbm: -100, frequencyHz: 145.8e6, txGainDb: 0, rxGainDb: 0, extraLossDb: 0, txPowersDbm: [0, 10, 20] });
assert.equal(ranges.length, 3);
assert.ok(ranges[0].distanceM < ranges[1].distanceM && ranges[1].distanceM < ranges[2].distanceM);

assert.ok(Math.abs(U.halfWaveDipolePowerPattern(Math.PI / 2) - 1) < 1e-12);
assert.equal(U.halfWaveDipolePowerPattern(0), 0);
assert.ok(Math.abs(U.monopolePowerPattern(Math.PI / 2) - 1) < 1e-12);
const verticalDipole = { antennaType:'dipole', azimuthDeg:0, elevationDeg:90 };
assert.ok(U.sourceDirectionalGainDb(verticalDipole, { x:1, y:0, z:0 }) > U.sourceDirectionalGainDb(verticalDipole, { x:0, y:0, z:1 }));

const wifi24 = U.wifiPreset('wifi-2.4');
const wifi5 = U.wifiPreset('wifi-5');
const wifi6 = U.wifiPreset('wifi-6');
assert.equal(wifi24.frequencyHz, 2.437e9);
assert.equal(wifi5.frequencyHz, 5.18e9);
assert.equal(wifi6.frequencyHz, 6.2e9);

const mapSource = {
  x: 0,
  y: 0,
  z: 1.8,
  frequencyHz: wifi24.frequencyHz,
  txPowerDbm: 20,
  antennaType: 'dipole',
  azimuthDeg: 0,
  elevationDeg: 90
};
const reflectors = [
  { axis:'x', coordinateM:6, reflectivity:.45, penetrationLossDb:5, phaseDeg:180, reflectionLossDb:0 },
  { axis:'y', coordinateM:-4, reflectivity:.45, penetrationLossDb:5, phaseDeg:180, reflectionLossDb:0 }
];
const environmentPoint = U.environmentPoint({ source:mapSource, receiver:{ x:2, y:1, z:1.2, gainDb:0 }, reflectors, coherence:.85 });
assert.equal(environmentPoint.paths.length, 3);
assert.ok(Number.isFinite(environmentPoint.powerDbm));
assert.ok(Number.isFinite(environmentPoint.coherentDbm));
assert.ok(Number.isFinite(environmentPoint.incoherentDbm));

const blockedPoint = U.environmentPoint({ source:mapSource, receiver:{ x:8, y:1, z:1.2, gainDb:0 }, reflectors, coherence:0 });
assert.ok(blockedPoint.penetrationLossDb >= 5, 'Crossing the configured vertical reflector should incur penetration loss.');

const coherentPoint = U.environmentPoint({ source:mapSource, receiver:{ x:2, y:1, z:1.2, gainDb:0 }, reflectors, coherence:1 });
const incoherentPoint = U.environmentPoint({ source:mapSource, receiver:{ x:2, y:1, z:1.2, gainDb:0 }, reflectors, coherence:0 });
assert.notEqual(coherentPoint.powerDbm, incoherentPoint.powerDbm, 'Coherent and incoherent path combination should differ in a multipath environment.');

const map24 = U.buildEnvironmentMap({ widthM:24, heightM:18, resolutionX:24, resolutionY:24, sampleHeightM:1.2, receiverGainDb:0, coherence:.85, source:mapSource, reflectors });
assert.equal(map24.values.length, 24 * 24);
assert.ok(map24.maximumDbm > map24.minimumDbm);
assert.ok(map24.fadeDepthDb > 0);
const progressive = U.progressiveEnvironmentMaps({ widthM:24, heightM:18, resolutions:[16,32,48], sampleHeightM:1.2, receiverGainDb:0, coherence:.85, source:mapSource, reflectors });
assert.deepEqual(progressive.map(stage => stage.resolutionX), [16,32,48]);
assert.deepEqual(progressive.map(stage => stage.values.length), [256,1024,2304]);

const analysis = Lab.analyzeConfiguration({
  sourceHz: 145.8e6,
  txPowerDbm: 30,
  txGainDb: 2.15,
  rxGainDb: 0,
  distanceM: 1000,
  extraLossDb: 0,
  receiverCenterHz: 10.7e6,
  receiverBandwidthHz: 25e3,
  noiseFigureDb: 6,
  localOscillatorHz: 135.1e6,
  carrierHz: 145e6,
  coupling: 0.05,
  nonlinearity: 0.03,
  carrierAmplitude: 1,
  sourceAmplitude: 0.1,
  observedHz: 800e3,
  sweepMinHz: 1e6,
  sweepMaxHz: 500e6,
  sweepPoints: 128,
  antenna,
  environment: { widthM:24, heightM:18, resolutionX:24, resolutionY:24, sampleHeightM:1.2, receiverGainDb:0, coherence:.85, source:mapSource, reflectors }
});
assert.equal(analysis.heterodyne.differenceHz, 10.7e6);
assert.equal(analysis.probe.beatHz, 800e3);
assert.equal(analysis.sweep.length, 128);
assert.equal(analysis.environment.values.length, 576);
assert.ok(Number.isFinite(analysis.direct.snrDb));
assert.ok(analysis.sourceFieldVPerM > 0);

const entry = await readFile(new URL('../scientific-tools-entry.js', import.meta.url), 'utf8');
assert.match(entry, /data-scientific-tools-tab="signals-laboratory"/);
assert.match(entry, /id="scientific-tools-open-signals-laboratory"/);
assert.match(entry, /function loadSignalsLaboratory\(/);
assert.match(entry, /function openSignalsLaboratory\(/);
assert.match(entry, /loadStyle\('signals-laboratory\.css'\)/);
assert.match(entry, /loadScript\('signals-laboratory\.js'/);
assert.match(entry, /signal processing can exploit a weak field or correlated perturbation/i);

const source = await readFile(new URL('../signals-laboratory.js', import.meta.url), 'utf8');
assert.match(source, /Physical boundary:/);
assert.match(source, /Mathematical processing alone cannot reconstruct arbitrary RF energy/);
assert.match(source, /heterodyne image/);
assert.match(source, /third-order candidate/);
assert.match(source, /RF environment \/ Wi‑Fi-scale field map/);
assert.match(source, /Half-wave dipole/);
assert.match(source, /Quarter-wave monopole/);
assert.match(source, /single-bounce multipath/);
assert.match(source, /full-wave Maxwell\/FDTD solver/);

console.log(JSON.stringify({
  format: 'hb-ttrpg-signals-laboratory-validation-receipt',
  schemaVersion: '0.2.0',
  pass: true,
  centralizedScientificToolsLauncher: true,
  rlcResonanceAndImpedance: true,
  antennaAttenuationSweep: true,
  freeSpacePathLossScaling: true,
  thermalNoiseFloor: true,
  heterodyneSumDifference: true,
  adjacentCarrierBeatAndSideband: true,
  nonlinearIntermodulationProducts: true,
  mirrorFrequencyCandidatesRetained: true,
  rangeInferenceIsScenarioBounded: true,
  monopoleAndDipolePatterns: true,
  wifiFrequencyPresets: true,
  spatialRfEnvironmentMapping: true,
  progressiveResolutionMapping: true,
  coherentAndIncoherentMultipath: true,
  singleBounceReflectivity: true,
  wallPenetrationAttenuation: true,
  generalizedRadiatingSourceContract: true,
  physicalCouplingBoundaryPresent: true
}, null, 2));
