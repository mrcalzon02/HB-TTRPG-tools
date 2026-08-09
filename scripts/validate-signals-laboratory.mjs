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
  antenna
});
assert.equal(analysis.heterodyne.differenceHz, 10.7e6);
assert.equal(analysis.probe.beatHz, 800e3);
assert.equal(analysis.sweep.length, 128);
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

console.log(JSON.stringify({
  format: 'hb-ttrpg-signals-laboratory-validation-receipt',
  schemaVersion: '0.1.0',
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
  physicalCouplingBoundaryPresent: true
}, null, 2));
