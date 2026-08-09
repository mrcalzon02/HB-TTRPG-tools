#!/usr/bin/env node

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import vm from 'node:vm';
import { TextEncoder, TextDecoder } from 'node:util';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const root = process.cwd();
const Evidence = require(path.join(root, 'binary-cube-steganalysis-evidence-profile.js'));
const LocalMedia = require(path.join(root, 'scientific-tools-local-media.js'));

function loadDemoCorpus() {
  const source = fs.readFileSync(path.join(root, 'binary-cube-media-forensics-demo-corpus.js'), 'utf8');
  const context = vm.createContext({ console, TextEncoder, TextDecoder, Uint8Array, Uint8ClampedArray, Float32Array, DataView, ArrayBuffer, Map, Set, Object, Array, Math, Promise, Number, String, Boolean, JSON, Error, TypeError });
  context.globalThis = context;
  vm.runInContext(source, context, { filename: 'binary-cube-media-forensics-demo-corpus.js' });
  return context.BinaryCubeMediaForensicsDemoCorpus;
}

const Corpus = loadDemoCorpus();
assert.equal(Evidence.version, '0.1.0');
assert.deepEqual(Array.from(Evidence.constants.DEFAULT_CHANNELS), ['r','g','b','luma']);
assert.equal(Evidence.constants.LEGACY_MIXED_THRESHOLD, 0.12);
assert.equal(Evidence.constants.LEGACY_POSITIVE_THRESHOLD, 0.35);

const clean = LocalMedia.decodePngRgba(Uint8Array.from(Corpus.buildDemoBytes('clean-control')));
const hidden = LocalMedia.decodePngRgba(Uint8Array.from(Corpus.buildDemoBytes('rgb-lsb')));
const cleanProfile = Evidence.profileRaster(clean.rgba, clean.width, clean.height, { tileSize: 32 });
const hiddenProfile = Evidence.profileRaster(hidden.rgba, hidden.width, hidden.height, { tileSize: 32 });

for (const profile of [cleanProfile, hiddenProfile]) {
  assert.equal(profile.format, 'hb-ttrpg-steganalysis-raster-evidence-profile');
  assert.equal(profile.schemaVersion, '0.1.0');
  assert.equal(profile.channels.length, 4);
  assert.ok(profile.channels.every(row => ['r','g','b','luma'].includes(row.channel)));
  assert.ok(profile.channels.every(row => row.localization.count === 4), '64×64 controls at tileSize 32 must yield four tiles per channel.');
  assert.ok(Number.isFinite(profile.crossChannel.payloadEstimateRange));
  assert.match(profile.boundary, /evidence vector rather than a new universal steganography score/i);
  for (const row of profile.channels) {
    assert.ok(row.global.legacyPayloadMagnitudeEvidence >= 0 && row.global.legacyPayloadMagnitudeEvidence <= 1);
    assert.ok(Number.isFinite(row.global.lsb.entropy));
    assert.ok(Number.isFinite(row.global.pairEqualization.normalizedChiSquare));
    assert.ok(Number.isFinite(row.global.residual.roughness));
    assert.ok(Number.isFinite(row.global.residual.cooccurrenceEntropy));
  }
}

const hiddenLuma = hiddenProfile.channels.find(row => row.channel === 'luma');
assert.equal(hiddenLuma.global.legacyStatus, 'negative', 'Known RGB-LSB false negative must remain negative under the retained legacy comparison scalar.');
assert.ok(hiddenLuma.global.legacyPayloadMagnitudeEvidence < 0.12);
assert.ok(hiddenProfile.diagnosticFlags.some(flag => flag.id === 'nonzero-below-legacy-threshold'), 'Evidence profile should preserve nonzero estimator output below the legacy threshold as an unresolved diagnostic flag, not erase it as a clean negative.');

const source = fs.readFileSync(path.join(root, 'binary-cube-steganalysis-evidence-profile.js'), 'utf8');
for (const required of [
  "Engine.localizedRasterAnalysis",
  "payloadEstimation: 'RS/SPA payload estimates remain estimator outputs",
  "channelComparison: 'R/G/B/luma differences are diagnostic structure",
  "localization: 'Tile extrema are exploratory measurements subject to multiple-comparison effects",
  "residuals: 'LSB entropy, pair equalization, residual roughness, and co-occurrence remain separate forensic features",
  "evidence vector rather than a new universal steganography score"
]) assert.ok(source.includes(required), `Evidence profile missing boundary/delegation token ${required}.`);
for (const forbidden of [
  'function rsAnalysis(',
  'function samplePairAnalysis(',
  'function rsGroupCounts(',
  'function residualCooccurrence(',
  'function lsbPairChiSquare('
]) assert.ok(!source.includes(forbidden), `Evidence profile must not duplicate specialist detector math: ${forbidden}`);

console.log(JSON.stringify({
  receipt: 'hb-ttrpg-steganalysis-raster-evidence-profile-validation-receipt',
  schemaVersion: '0.1.0',
  pass: true,
  clean: {
    crossChannel: cleanProfile.crossChannel,
    flags: cleanProfile.diagnosticFlags
  },
  knownRgbLsb: {
    crossChannel: hiddenProfile.crossChannel,
    lumaLegacyScalar: hiddenLuma.global.legacyPayloadMagnitudeEvidence,
    lumaLegacyStatus: hiddenLuma.global.legacyStatus,
    flags: hiddenProfile.diagnosticFlags
  },
  productionThresholdsChanged: false,
  detectorMathDuplicated: false,
  boundary: hiddenProfile.boundary
}, null, 2));
