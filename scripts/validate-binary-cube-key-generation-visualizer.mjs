#!/usr/bin/env node

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { createRequire } from 'node:module';

const root = process.cwd();
const require = createRequire(import.meta.url);
const Engine = require(path.join(root, 'shadowrun-binary-cube-engine.js'));
const Research = require(path.join(root, 'binary-cube-key-generation-research.js'));
const worker = fs.readFileSync(path.join(root, 'binary-cube-key-generation-research-worker.js'), 'utf8');
const visualizer = fs.readFileSync(path.join(root, 'binary-cube-key-generation-visualizer.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'binary-cube-key-generation-visualizer.css'), 'utf8');
const workspace = fs.readFileSync(path.join(root, 'scientific-tools-entry.js'), 'utf8');

const expectedProfiles = [
  'direct-permutation',
  'iterative-chain',
  'random-transposition-walk',
  'local-adjacent-walk',
  'nested-permutation',
  'nested-hierarchy',
  'nested-interleaved'
];

assert.equal(Research.constants.RESEARCH_SCHEMA_VERSION, 'research-0.4.0');
assert.deepEqual([...Research.constants.PROFILES], expectedProfiles);

const seed = 'key-generation-visualizer-validation';
const gridSize = 32;
const direct = Research.generateResearchKey('direct-permutation', seed, gridSize);
const canonicalDirect = Engine.createKey({
  gridSize,
  seed,
  inputFace: 'top',
  outputFace: 'front',
  inputQuarterTurns: 0,
  outputQuarterTurns: 0,
  maskDensity: 0.75
});
assert.deepEqual(direct, canonicalDirect, 'Direct research profile must remain exactly the canonical production generator.');

for (const profile of expectedProfiles) {
  const first = Research.generateResearchKey(profile, seed, gridSize);
  const second = Research.generateResearchKey(profile, seed, gridSize);
  assert.deepEqual(first, second, `${profile} must reproduce exactly from the same seed.`);
  assert.equal(Engine.algebraicInvariant(first).collisionFree, true, `${profile} must preserve the canonical collision-free invariant.`);
}

const comparison = Research.buildComparisonSnapshot({
  seed,
  gridSize,
  profiles: ['direct-permutation', 'local-adjacent-walk', 'nested-hierarchy', 'nested-interleaved'],
  sampleResolution: 16
});
assert.equal(comparison.profiles.length, 4);
for (const snapshot of comparison.profiles) {
  assert.equal(snapshot.sampleAxisIndexes.length, 16);
  assert.equal(snapshot.depths.length, 256);
  assert.ok(snapshot.metrics.meanAbsoluteInterAxisCorrelation >= 0);
  assert.ok(snapshot.metrics.regionalPredictabilityFraction >= 0);
  assert.ok(snapshot.metrics.meanNormalizedDisplacement >= 0);
  assert.ok(snapshot.metrics.pointSurfaceRoughness >= 0);
  assert.ok(!snapshot.evaluationIgnoringAdjacency.concerns.includes('adjacency-retention'), 'Ignore-adjacency policy must remove adjacency as a rejection criterion.');
}

const localSnapshot = comparison.profiles.find(snapshot => snapshot.profile === 'local-adjacent-walk');
assert.ok(localSnapshot, 'Local adjacent walk snapshot is required for the structural counterexample.');
assert.ok(
  localSnapshot.evaluationIgnoringAdjacency.concerns.some(concern => concern !== 'adjacency-retention'),
  'Local adjacent walk must remain structurally conspicuous under at least one independent predictability probe when adjacency is ignored.'
);

for (const required of [
  "importScripts(\n  'shadowrun-binary-cube-engine.js?v=20260809-key-profile-visualizer-1',",
  "'binary-cube-key-generation-research.js?v=20260809-key-profile-visualizer-1'",
  'const Research = self.BinaryCubeKeyGenerationResearch;',
  "operation !== 'compare-profiles'",
  'Research.buildProfileSnapshot(',
  "type: 'progress'",
  "type: 'result'"
]) assert.ok(worker.includes(required), `Research worker is missing ${JSON.stringify(required)}.`);
for (const forbidden of [
  'function iterativePermutation(',
  'function randomWalkPermutation(',
  'function nestedHierarchyPermutation(',
  'function nestedInterleavedPermutation(',
  'Engine.encryptBinary('
]) assert.ok(!worker.includes(forbidden), `Research worker must not duplicate model logic: ${JSON.stringify(forbidden)}.`);

for (const required of [
  "const WORKER_URL = 'binary-cube-key-generation-research-worker.js?v=20260809-key-profile-visualizer-1';",
  'new Worker(WORKER_URL)',
  'worker.terminate()',
  'Ignore adjacency as a rejection criterion',
  'Regional predictability',
  'Axis leakage',
  'Surface roughness',
  'source-region colors',
  'actual Latin-cube point field',
  'visually chaotic cube is not proof of cryptographic security',
  'ShadowrunBinaryCubeEngine',
  'BinaryCubeKeyGenerationVisualizer = Object.freeze'
]) assert.ok(visualizer.includes(required), `3D visualizer is missing ${JSON.stringify(required)}.`);

assert.ok(css.includes('.bcg-viewport'), 'Key-generation visualizer must retain its 3D viewport styling.');
assert.ok(css.includes('.bcg-metrics'), 'Key-generation visualizer must retain its metric comparison layout.');
assert.ok(css.includes('.bcg-policy-toggle'), 'Key-generation visualizer must retain the adjacency policy control styling.');

for (const required of [
  'function loadKeyGenerationVisualizer()',
  "loadStyle('binary-cube-key-generation-visualizer.css')",
  "loadScript('binary-cube-key-generation-research.js'",
  "loadScript('binary-cube-key-generation-visualizer.js'",
  'function openKeyGenerationVisualizer(',
  'id="scientific-tools-open-key-generation-visualizer"',
  'Compare Key Generators in 3D',
  'adjacency as one diagnostic rather than an automatic failure'
]) assert.ok(workspace.includes(required), `Scientific Tools launch integration is missing ${JSON.stringify(required)}.`);

console.log(JSON.stringify({
  format: 'hb-ttrpg-binary-cube-key-generation-visualizer-validation-receipt',
  schemaVersion: '0.1.1',
  pass: true,
  researchSchemaVersion: Research.constants.RESEARCH_SCHEMA_VERSION,
  profiles: expectedProfiles,
  directProfileMatchesCanonicalGenerator: true,
  deterministicProfiles: true,
  canonicalCollisionFreeInvariant: true,
  sameSeedThreeDimensionalSnapshots: true,
  backgroundWorker: true,
  workerCancellation: true,
  adjacencyCanBeIgnoredAsGate: true,
  independentPredictabilityFlagsRemain: true,
  canonicalEngineUnmodifiedByResearchProfiles: true
}, null, 2));
