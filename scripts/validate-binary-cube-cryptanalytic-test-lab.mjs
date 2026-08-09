#!/usr/bin/env node

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const Engine = require('../shadowrun-binary-cube-engine.js');
const Lab = require('../binary-cube-cryptanalytic-test-lab.js');

assert.equal(Lab.constants.PANEL_ID, 'binary-cube-cryptanalytic-test-lab');
assert.equal(typeof Lab.runControlledSuite, 'function');
assert.equal(typeof Lab.utilities.affineEquivalenceProbe, 'function');
assert.equal(typeof Lab.utilities.avalancheAndTraversalProbe, 'function');
assert.equal(typeof Lab.utilities.analyzeCycles, 'function');

const scientificToolsEntry = await readFile(new URL('../scientific-tools-entry.js', import.meta.url), 'utf8');
assert.match(scientificToolsEntry, /binary-cube-cryptanalytic-test-lab\.js/);
assert.match(scientificToolsEntry, /binary-cube-cryptanalytic-test-lab\.css/);
assert.match(scientificToolsEntry, /scientific-tools-open-cryptanalytic-test-lab/);
assert.match(scientificToolsEntry, /loadCryptanalyticTestLab/);
assert.match(scientificToolsEntry, /openCryptanalyticTestLab/);
assert.match(scientificToolsEntry, /affine-equivalence\/collapse tests/);

const key = Engine.createKey({
  gridSize: 4,
  seed: 'cryptanalytic-validation-key',
  inputFace: 'top',
  outputFace: 'front',
  inputQuarterTurns: 0,
  outputQuarterTurns: 0,
  maskDensity: 1
});

const plaintextBits = '0100000101000010'; // AB
const packageObject = Engine.encryptBinary(plaintextBits, key);
const controlled = await Lab.runControlledSuite({
  key,
  plaintext: plaintextBits,
  plaintextMode: 'binary',
  maximumProbes: plaintextBits.length,
  observedCiphertext: JSON.stringify(packageObject)
});

assert.equal(controlled.keyId, key.keyId);
assert.equal(controlled.gridSize, 4);
assert.equal(controlled.plaintextBits, plaintextBits.length);
assert.equal(controlled.ciphertextBits, 16);
assert.equal(controlled.payloadCapacity, 16);
assert.equal(controlled.knownPlaintext.available, true);
assert.equal(controlled.knownPlaintext.exact, true);

// With a full mask, the current canonical projection is a pure bit permutation.
// The lab must report that fact rather than mistake geometric complexity for diffusion.
assert.equal(controlled.avalanche.probeCount, plaintextBits.length);
assert.equal(controlled.avalanche.oneHotFraction, 1);
assert.equal(controlled.avalanche.meanChangedBits, 1);
assert.equal(controlled.avalanche.expectedMappingMatchFraction, 1);
assert.equal(controlled.avalanche.uniqueInferredOutputs, plaintextBits.length);
assert.equal(controlled.affine.exact, true);

assert.ok(controlled.permutation.cycles.cycleCount >= 1);
assert.ok(controlled.permutation.cycles.longestCycle >= 1);
assert.equal(controlled.permutation.cycles.lengths.reduce((sum, length) => sum + length, 0), 16);

assert.equal(controlled.keyDifference.distance.leftLength, controlled.keyDifference.distance.rightLength);
assert.ok(controlled.keyDifference.distance.differing > 0);
assert.notEqual(controlled.keyDifference.comparisonKeyId, key.keyId);

const partialKey = Engine.createKey({
  gridSize: 4,
  seed: 'cryptanalytic-validation-partial-mask',
  inputFace: 'left',
  outputFace: 'top',
  inputQuarterTurns: 1,
  outputQuarterTurns: 3,
  maskDensity: 0.5
});
const partialBits = '10110100110100101101';
const partialAffine = Lab.utilities.affineEquivalenceProbe(partialBits, partialKey);
assert.equal(partialAffine.exact, true);

const partialAvalanche = await Lab.utilities.avalancheAndTraversalProbe(partialBits, partialKey, partialBits.length);
assert.equal(partialAvalanche.oneHotFraction, 1);
assert.equal(partialAvalanche.expectedMappingMatchFraction, 1);
assert.equal(partialAvalanche.meanChangedBits, 1);

const observedBinary = Engine.encryptBinary(partialBits, partialKey).ciphertext;
const knownBinary = Lab.utilities.knownPlaintextProbe(partialBits, partialKey, observedBinary);
assert.equal(knownBinary.available, true);
assert.equal(knownBinary.exact, true);

const alteredObserved = `${observedBinary[0] === '1' ? '0' : '1'}${observedBinary.slice(1)}`;
const knownMismatch = Lab.utilities.knownPlaintextProbe(partialBits, partialKey, alteredObserved);
assert.equal(knownMismatch.exact, false);
assert.equal(knownMismatch.distance.differing, 1);

const mapping = Lab.utilities.projectionPermutation(key);
assert.equal(mapping.length, 16);
assert.equal(new Set(mapping).size, 16);
const cycles = Lab.utilities.analyzeCycles(mapping);
assert.equal(cycles.lengths.reduce((sum, length) => sum + length, 0), 16);

console.log(JSON.stringify({
  format: 'hb-ttrpg-binary-cube-cryptanalytic-test-lab-validation-receipt',
  schemaVersion: '0.1.0',
  pass: true,
  scientificToolsLauncherIntegrated: true,
  canonicalEngineDelegation: true,
  avalancheProbe: true,
  differentialSingleBitProbe: true,
  knownPlaintextProbe: true,
  chosenPlaintextTraversalInference: true,
  keyDifferenceSensitivity: true,
  affineCollapseDetection: true,
  projectionPermutationAnalysis: true,
  cycleAnalysis: true,
  fullMaskOneBitToOneBitBehaviorDetected: true,
  partialMaskAffineOffsetBehaviorDetected: true
}, null, 2));
