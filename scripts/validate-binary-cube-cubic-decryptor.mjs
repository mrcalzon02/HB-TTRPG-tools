#!/usr/bin/env node

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const root = process.cwd();
const Engine = require(path.join(root, 'shadowrun-binary-cube-engine.js'));
const Research = require(path.join(root, 'binary-cube-key-generation-research.js'));
const Cubic = require(path.join(root, 'binary-cube-cubic-decryptor-engine.js'));
const ui = fs.readFileSync(path.join(root, 'binary-cube-cubic-decryptor.js'), 'utf8');
const worker = fs.readFileSync(path.join(root, 'binary-cube-cubic-decryptor-worker.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'binary-cube-cubic-decryptor.css'), 'utf8');

assert.equal(Cubic.constants.VERSION, '0.1.0');
assert.deepEqual(Cubic.constants.PROFILE_ORDER, [
  'direct-permutation',
  'iterative-chain',
  'random-transposition-walk',
  'nested-permutation',
  'nested-interleaved'
]);
assert.equal(Cubic.renderSeed('seed-{n8}-{hex8}', 42), 'seed-00000042-0000002a');
assert.throws(() => Cubic.normalizeTemplates(['no-counter']), /counter placeholder/);

const plaintext = '01001000011001010110110001101100011011110010000001000011011101010110001001100101'; // Hello Cube
const recovered = [];
for (let index = 0; index < Cubic.constants.PROFILE_ORDER.length; index += 1) {
  const profile = Cubic.constants.PROFILE_ORDER[index];
  const seed = String(7 + index);
  const baseOptions = { inputFace: 'top', outputFace: 'front', inputQuarterTurns: 0, outputQuarterTurns: 0, maskDensity: 0.75 };
  const key = Research.generateResearchKey(profile, seed, 4, baseOptions);
  const encrypted = Engine.encryptBinary(plaintext, key);
  const source = Cubic.parsePackage(encrypted);
  const planOptions = {
    profiles: [profile],
    usePackageMetadata: true,
    maxGridSize: 8,
    seedStart: 0,
    seedEnd: 16,
    seedTemplates: ['{n}'],
    includeFixedSeeds: false,
    orientationMode: 'manual',
    capacityMode: 'manual'
  };
  const planA = Cubic.buildSearchPlan(source, planOptions);
  const planB = Cubic.buildSearchPlan(source, planOptions);
  assert.equal(planA.planId, planB.planId, `${profile} search plan must be deterministic`);
  assert.deepEqual(planA.stages.map(stage => stage.id), [`${profile}:small`]);
  assert.deepEqual(planA.stages[0].gridSizes, [4]);
  const candidate = Cubic.attemptCandidate(source, {
    stageId: planA.stages[0].id,
    profile,
    gridSize: 4,
    orientation: Cubic.orientationVariants(source, 4, planOptions)[0],
    payloadCapacity: encrypted.payloadCapacity,
    seed,
    seedSource: '{n}'
  });
  assert.ok(candidate, `${profile} candidate should match the package fingerprint`);
  assert.equal(candidate.exactFingerprintMatch, true, `${profile} fingerprint should match`);
  assert.equal(candidate.plaintextBits, plaintext, `${profile} plaintext must recover exactly`);
  assert.equal(candidate.keyId, key.keyId, `${profile} key fingerprint must recover`);
  recovered.push({ profile, keyId: candidate.keyId, score: candidate.score });
}

const directKey = Engine.createKey({ gridSize: 4, seed: '3', inputFace: 'top', outputFace: 'front', maskDensity: 0.75 });
const shortPlaintext = '01001000';
const directPackage = Engine.encryptBinary(shortPlaintext, directKey);
const rawSource = Cubic.sourceFromRaw(directPackage.ciphertext, {
  inputFace: 'top', outputFace: 'front', inputQuarterTurns: 0, outputQuarterTurns: 0,
  payloadCapacity: directPackage.payloadCapacity, originalBitLength: shortPlaintext.length
});
const rawCandidate = Cubic.attemptCandidate(rawSource, {
  stageId: 'direct-permutation:small', profile: 'direct-permutation', gridSize: 4,
  orientation: { inputFace: 'top', outputFace: 'front', inputQuarterTurns: 0, outputQuarterTurns: 0 },
  payloadCapacity: directPackage.payloadCapacity, seed: '3', seedSource: '{n}'
}, { sampleBlocks: 1 });
assert.equal(rawCandidate.plaintextBits, shortPlaintext, 'Raw-framing candidate must decrypt through the canonical engine');

const broadPlan = Cubic.buildSearchPlan(rawSource, {
  profiles: ['direct-permutation', 'iterative-chain'], usePackageMetadata: false, maxGridSize: 16,
  seedStart: 0, seedEnd: 3, seedTemplates: ['{n}'], includeFixedSeeds: false,
  orientationMode: 'manual', capacityMode: 'manual', payloadCapacity: directPackage.payloadCapacity,
  inputFace: 'top', outputFace: 'front'
});
assert.equal(broadPlan.stages[0].profile, 'direct-permutation');
assert.ok(broadPlan.stages.some(stage => stage.profile === 'iterative-chain'));
assert.ok(broadPlan.stages.every(stage => stage.gridSizes.every(size => rawSource.bits.length % (size * size) === 0)));

const checkpoint = Cubic.makeCheckpoint(broadPlan, 12, 12, broadPlan.stages[0].id);
assert.equal(Cubic.validateCheckpoint(checkpoint, broadPlan).cursor, 12);
const otherPlan = Cubic.buildSearchPlan(rawSource, { ...broadPlan, seedEnd: 4, profiles: ['direct-permutation'], seedTemplates: ['{n}'], includeFixedSeeds: false, maxGridSize: 16, usePackageMetadata: false, payloadCapacity: directPackage.payloadCapacity, inputFace: 'top', outputFace: 'front' });
assert.throws(() => Cubic.validateCheckpoint(checkpoint, otherPlan), /different deterministic search plan/);

for (const required of [
  'Cubic Decryptor Tool',
  'Build staged plan',
  'Run / resume decryptor',
  'deterministic cursor',
  'BinaryCubeKeyGenerationResearch',
  'openInformationAnalysisSuite',
  'openMediaForensicsSuite',
  'KEY FINGERPRINT MATCH'
]) assert.ok(ui.includes(required), `UI is missing ${JSON.stringify(required)}`);
for (const required of [
  "importScripts(",
  "'binary-cube-key-generation-research.js'",
  "'binary-cube-cubic-decryptor-engine.js'",
  "operation !== 'search'",
  'Cubic.attemptCandidate',
  'Cubic.makeCheckpoint'
]) assert.ok(worker.includes(required), `Worker is missing ${JSON.stringify(required)}`);
assert.ok(css.length > 1000, 'Cubic Decryptor stylesheet is unexpectedly empty');

console.log(JSON.stringify({
  receipt: 'hb-ttrpg-binary-cube-cubic-decryptor-validation-receipt',
  schema: '0.1.0',
  pass: true,
  recovered,
  rawRoundTrip: true,
  deterministicPlanId: broadPlan.planId,
  broadStageCount: broadPlan.stages.length
}, null, 2));
