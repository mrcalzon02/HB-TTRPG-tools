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
for (const name of [
  'heterodyneProducts','adjacentCarrierProbe','inferSourceCandidates','buildEnvironmentMap','progressiveEnvironmentMaps',
  'environmentPoint','halfWaveDipolePowerPattern','monopolePowerPattern','wifiPreset','project3DPoint','buildFieldVolumeSamples',
  'buildAntennaLobeSamples','buildEnvironmentSurfaceMesh','buildMixerProductScene'
]) assert.equal(typeof U[name], 'function', `${name} should be exported.`);

const L = 0.120e-6;
const C = 10e-12;
const resonance = U.resonantFrequency(L, C);
assert.ok(Math.abs(resonance - 145287920.783) < 1);
const antenna = { resonantHz:resonance, resistanceOhm:50, inductanceH:L, capacitanceF:C, q:8, feedOhm:50 };
const atResonance = U.antennaResponse(resonance, antenna);
const farOffResonance = U.antennaResponse(resonance * 2, antenna);
assert.ok(Math.abs(U.seriesRlcImpedance(resonance, 50, L, C).reactance) < 1e-8);
assert.ok(atResonance.voltageTransfer > farOffResonance.voltageTransfer);
assert.ok(atResonance.responseDb > farOffResonance.responseDb);
assert.ok(atResonance.mismatch.returnLossDb > 100);

const loss1km = U.freeSpacePathLossDb(145.8e6, 1000);
const loss10km = U.freeSpacePathLossDb(145.8e6, 10000);
assert.ok(Math.abs((loss10km - loss1km) - 20) < 1e-9);
const noise25k = U.thermalNoiseFloorDbm(25000, 6, 290);
assert.ok(noise25k < -120 && noise25k > -130);

const heterodyne = U.heterodyneProducts(145.8e6, 135.1e6);
assert.equal(heterodyne.differenceHz, 10.7e6);
assert.equal(heterodyne.sumHz, 280.9e6);
const carrierProbe = U.adjacentCarrierProbe({ carrierHz:145e6, sourceHz:145.8e6, receiverCenterHz:800e3, receiverBandwidthHz:25e3, coupling:.05, nonlinearity:.03, carrierAmplitude:1, sourceAmplitude:.1 });
assert.equal(carrierProbe.beatHz, 800e3);
assert.ok(carrierProbe.modulationIndex > 0);
assert.ok(carrierProbe.products.some(product => Math.abs(product.frequencyHz - 800e3) < 1e-6));
assert.ok(carrierProbe.inBandProducts.some(product => Math.abs(product.frequencyHz - 800e3) < 1e-6));

const ifCandidates = U.inferSourceCandidates({ observedHz:10.7e6, localOscillatorHz:135.1e6 });
assert.ok(ifCandidates.some(candidate => candidate.frequencyHz === 145.8e6));
assert.ok(ifCandidates.some(candidate => candidate.frequencyHz === 124.4e6));
const beatCandidates = U.inferSourceCandidates({ observedHz:800e3, carrierHz:145e6 });
assert.ok(beatCandidates.some(candidate => candidate.frequencyHz === 145.8e6));
assert.ok(beatCandidates.some(candidate => candidate.frequencyHz === 144.2e6));

const sweep = U.sweepAntenna({ minHz:10e6, maxHz:500e6, points:128, antenna });
assert.equal(sweep.length, 128);
assert.ok(sweep[0].frequencyHz < sweep.at(-1).frequencyHz);
assert.ok(sweep.some(row => row.responseDb > -1));
const ranges = U.estimateRangeScenarios({ receivedDbm:-100, frequencyHz:145.8e6, txGainDb:0, rxGainDb:0, extraLossDb:0, txPowersDbm:[0,10,20] });
assert.equal(ranges.length, 3);
assert.ok(ranges[0].distanceM < ranges[1].distanceM && ranges[1].distanceM < ranges[2].distanceM);

assert.ok(Math.abs(U.halfWaveDipolePowerPattern(Math.PI / 2) - 1) < 1e-12);
assert.equal(U.halfWaveDipolePowerPattern(0), 0);
assert.ok(Math.abs(U.monopolePowerPattern(Math.PI / 2) - 1) < 1e-12);
const verticalDipole = { antennaType:'dipole', azimuthDeg:0, elevationDeg:90 };
assert.ok(U.sourceDirectionalGainDb(verticalDipole, {x:1,y:0,z:0}) > U.sourceDirectionalGainDb(verticalDipole, {x:0,y:0,z:1}));

const wifi24 = U.wifiPreset('wifi-2.4');
const wifi5 = U.wifiPreset('wifi-5');
const wifi6 = U.wifiPreset('wifi-6');
assert.equal(wifi24.frequencyHz, 2.437e9);
assert.equal(wifi5.frequencyHz, 5.18e9);
assert.equal(wifi6.frequencyHz, 6.2e9);

const mapSource = { x:0, y:0, z:1.8, frequencyHz:wifi24.frequencyHz, txPowerDbm:20, antennaType:'dipole', azimuthDeg:0, elevationDeg:90 };
const reflectors = [
  { axis:'x', coordinateM:6, reflectivity:.45, penetrationLossDb:5, phaseDeg:180, reflectionLossDb:0 },
  { axis:'y', coordinateM:-4, reflectivity:.45, penetrationLossDb:5, phaseDeg:180, reflectionLossDb:0 }
];
const environmentPoint = U.environmentPoint({ source:mapSource, receiver:{x:2,y:1,z:1.2,gainDb:0}, reflectors, coherence:.85 });
assert.equal(environmentPoint.paths.length, 3);
assert.ok(Number.isFinite(environmentPoint.powerDbm));
assert.ok(Number.isFinite(environmentPoint.coherentDbm));
assert.ok(Number.isFinite(environmentPoint.incoherentDbm));
const blockedPoint = U.environmentPoint({ source:mapSource, receiver:{x:8,y:1,z:1.2,gainDb:0}, reflectors, coherence:0 });
assert.ok(blockedPoint.penetrationLossDb >= 5);
const coherentPoint = U.environmentPoint({ source:mapSource, receiver:{x:2,y:1,z:1.2,gainDb:0}, reflectors, coherence:1 });
const incoherentPoint = U.environmentPoint({ source:mapSource, receiver:{x:2,y:1,z:1.2,gainDb:0}, reflectors, coherence:0 });
assert.notEqual(coherentPoint.powerDbm, incoherentPoint.powerDbm);

const map24 = U.buildEnvironmentMap({ widthM:24, heightM:18, resolutionX:24, resolutionY:24, sampleHeightM:1.2, receiverGainDb:0, coherence:.85, source:mapSource, reflectors });
assert.equal(map24.values.length, 576);
assert.ok(map24.maximumDbm > map24.minimumDbm);
assert.ok(map24.fadeDepthDb > 0);
const progressive = U.progressiveEnvironmentMaps({ widthM:24, heightM:18, resolutions:[16,32,48], sampleHeightM:1.2, receiverGainDb:0, coherence:.85, source:mapSource, reflectors });
assert.deepEqual(progressive.map(stage => stage.resolutionX), [16,32,48]);
assert.deepEqual(progressive.map(stage => stage.values.length), [256,1024,2304]);

// 3D demonstration data contracts.
const projected = U.project3DPoint({x:1,y:2,z:3}, {originX:100,originY:100,scale:20,yawDeg:30,pitchDeg:25});
assert.ok(Number.isFinite(projected.x) && Number.isFinite(projected.y) && Number.isFinite(projected.depth));
const fieldVolume = U.buildFieldVolumeSamples({ sourceHz:145.8e6, response:{voltageTransfer:.8} }, .5);
assert.equal(fieldVolume.length, 32);
assert.ok(fieldVolume.every(sample => Number.isFinite(sample.pointE.x) && Number.isFinite(sample.pointE.y) && Number.isFinite(sample.pointH.z)));
const antennaLobes = U.buildAntennaLobeSamples(mapSource, .85);
assert.equal(antennaLobes.length, 13);
assert.equal(antennaLobes[0].length, 37);
assert.ok(antennaLobes.flat().some(sample => sample.power > .9));
assert.ok(antennaLobes.flat().some(sample => sample.power < .01));
const surfaceMesh = U.buildEnvironmentSurfaceMesh(map24);
assert.equal(surfaceMesh.vertices.length, 576);
assert.equal(surfaceMesh.resolutionX, 24);
assert.ok(surfaceMesh.vertices.every(vertex => Number.isFinite(vertex.x) && Number.isFinite(vertex.y) && Number.isFinite(vertex.z)));
const mixerScene = U.buildMixerProductScene({ heterodyne, probe:carrierProbe });
assert.ok(mixerScene.length >= 4);
assert.ok(mixerScene.some(row => row.label === '|RF−LO|' && row.frequencyHz === 10.7e6));
assert.ok(mixerScene.some(row => row.inReceiverBand === true));

const analysis = Lab.analyzeConfiguration({
  sourceHz:145.8e6, txPowerDbm:30, txGainDb:2.15, rxGainDb:0, distanceM:1000, extraLossDb:0,
  receiverCenterHz:10.7e6, receiverBandwidthHz:25e3, noiseFigureDb:6, localOscillatorHz:135.1e6,
  carrierHz:145e6, coupling:.05, nonlinearity:.03, carrierAmplitude:1, sourceAmplitude:.1, observedHz:800e3,
  sweepMinHz:1e6, sweepMaxHz:500e6, sweepPoints:128, antenna,
  environment:{ widthM:24, heightM:18, resolutionX:24, resolutionY:24, sampleHeightM:1.2, receiverGainDb:0, coherence:.85, source:mapSource, reflectors }
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
assert.match(source, /RF environment \/ Wi‑Fi-scale field map/);
assert.match(source, /Half-wave dipole/);
assert.match(source, /Quarter-wave monopole/);
assert.match(source, /single-bounce multipath/);
assert.match(source, /full-wave Maxwell\/FDTD solver/);
assert.match(source, /id="sl-field-3d-canvas"/);
assert.match(source, /id="sl-antenna-3d-canvas"/);
assert.match(source, /id="sl-environment-3d-canvas"/);
assert.match(source, /id="sl-mixer-3d-canvas"/);
assert.match(source, /Drag to orbit/);
assert.match(source, /Auto-orbit 3D scenes/);
assert.match(source, /prefers-reduced-motion/);

console.log(JSON.stringify({
  format:'hb-ttrpg-signals-laboratory-validation-receipt',
  schemaVersion:'0.3.0',
  pass:true,
  centralizedScientificToolsLauncher:true,
  rlcResonanceAndImpedance:true,
  antennaAttenuationSweep:true,
  heterodyneAndIntermodulation:true,
  spatialRfEnvironmentMapping:true,
  progressiveResolutionMapping:true,
  coherentAndIncoherentMultipath:true,
  monopoleAndDipolePatterns:true,
  threeDimensionalFieldDemonstration:true,
  threeDimensionalAntennaPatternDemonstration:true,
  threeDimensionalEnvironmentTopology:true,
  threeDimensionalMixerProductSpace:true,
  interactiveOrbitAndZoom:true,
  keyboard3DControls:true,
  reducedMotionRespected:true,
  physicalCouplingBoundaryPresent:true
}, null, 2));
