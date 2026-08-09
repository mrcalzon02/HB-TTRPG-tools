#!/usr/bin/env node

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const root = process.cwd();
const Engine = require(path.join(root, 'shadowrun-binary-cube-engine.js'));
const Research = require(path.join(root, 'binary-cube-key-generation-research.js'));
const Cubic = require(path.join(root, 'binary-cube-cubic-decryptor-engine.js'));
const Information = require(path.join(root, 'binary-cube-information-analysis-suite.js'));
const ui = fs.readFileSync(path.join(root, 'binary-cube-cubic-decryptor.js'), 'utf8');
const workerPath = path.join(root, 'binary-cube-cubic-decryptor-worker.js');
const worker = fs.readFileSync(workerPath, 'utf8');
const css = fs.readFileSync(path.join(root, 'binary-cube-cubic-decryptor.css'), 'utf8');

function utf8Bits(value) {
  return Array.from(Buffer.from(String(value), 'utf8'), byte => byte.toString(2).padStart(8, '0')).join('');
}

function createWorkerHarness() {
  const messages = [];
  let messageListener = null;
  const sandbox = {
    console,
    TextDecoder,
    TextEncoder,
    Uint8Array,
    Uint16Array,
    Uint32Array,
    Int8Array,
    Int16Array,
    Int32Array,
    Float32Array,
    Float64Array,
    ArrayBuffer,
    DataView
  };
  const context = vm.createContext(sandbox);
  context.self = context;
  context.postMessage = message => messages.push(message);
  context.addEventListener = (type, listener) => {
    if (type === 'message') messageListener = listener;
  };
  context.importScripts = (...urls) => {
    for (const url of urls) {
      const clean = String(url).split('?')[0];
      const filename = path.join(root, clean);
      vm.runInContext(fs.readFileSync(filename, 'utf8'), context, { filename });
    }
  };
  vm.runInContext(worker, context, { filename: workerPath });
  assert.equal(typeof messageListener, 'function', 'Cubic worker must register a message listener');
  return Object.freeze({
    run(message) {
      messages.length = 0;
      messageListener({ data: message });
      return [...messages];
    }
  });
}

function resultMessage(messages, label) {
  const row = [...messages].reverse().find(message => message?.type === 'result');
  assert.ok(row, `${label} did not emit a result message`);
  return row.result;
}

assert.equal(Cubic.constants.VERSION, '0.1.0');
assert.equal(Engine.constants.KEY_DIGEST_TYPE, 'sha256-canonical-key-material-v1');
assert.equal(Engine.sha256Hex('abc'), 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
assert.deepEqual(Cubic.constants.PROFILE_ORDER, [
  'direct-permutation',
  'iterative-chain',
  'random-transposition-walk',
  'nested-permutation',
  'nested-interleaved'
]);
const searchableResearchProfiles = Research.constants.PROFILE_DEFINITIONS
  .filter(profile => profile.disposition !== 'rejected')
  .map(profile => profile.id);
assert.deepEqual(
  Cubic.constants.PROFILE_ORDER,
  searchableResearchProfiles,
  'Every non-rejected Binary Cube key-generation profile must be searchable by the Cubic Decryptor or explicitly rejected in the research registry.'
);
assert.equal(Cubic.renderSeed('seed-{n8}-{hex8}', 42), 'seed-00000042-0000002a');
assert.throws(() => Cubic.normalizeTemplates(['no-counter']), /counter placeholder/);
const informationProbe = Information.utilities.candidateScore(Uint8Array.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a,0,0,0,0]));
assert.ok(informationProbe.signatures.some(item => item.label === 'PNG'), 'Stage B authority must recognize a canonical PNG signature.');
assert.ok(Number.isFinite(informationProbe.score));

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
  assert.equal(key.keyDigestType, Engine.constants.KEY_DIGEST_TYPE, `${profile} key must carry the canonical digest type`);
  assert.match(key.keyDigest, /^[0-9a-f]{64}$/, `${profile} key digest must be lowercase SHA-256 hex`);
  const nodeDigest = createHash('sha256').update(Engine.keyIdentityMaterial(key), 'utf8').digest('hex');
  assert.equal(key.keyDigest, nodeDigest, `${profile} key digest must match Node SHA-256`);
  assert.equal(candidate.exactDigestMatch, true, `${profile} package candidate must use SHA-256 identity`);
  assert.equal(candidate.keyDigest, key.keyDigest, `${profile} key digest must recover`);
  recovered.push({ profile, keyId: candidate.keyId, keyDigest: candidate.keyDigest, score: candidate.score });
}

const directKey = Engine.createKey({ gridSize: 4, seed: '3', inputFace: 'top', outputFace: 'front', maskDensity: 0.75 });
const tamperedDigestKey = { ...directKey, keyDigest: `${directKey.keyDigest.slice(0, -1)}${directKey.keyDigest.endsWith('0') ? '1' : '0'}` };
assert.throws(() => Engine.validateKey(tamperedDigestKey), /SHA-256 digest/);
const legacyKey = { ...directKey };
delete legacyKey.keyDigest;
delete legacyKey.keyDigestType;
const normalizedLegacyKey = Engine.validateKey(legacyKey);
assert.equal(normalizedLegacyKey.keyId, directKey.keyId, 'Legacy keyId must remain stable');
assert.equal(normalizedLegacyKey.keyDigest, directKey.keyDigest, 'Legacy keys must gain the deterministic strong digest when validated');
const shortPlaintext = '01001000';
const directPackage = Engine.encryptBinary(shortPlaintext, directKey);
assert.equal(directPackage.keyDigestType, Engine.constants.KEY_DIGEST_TYPE);
assert.equal(directPackage.keyDigest, directKey.keyDigest);
const legacyPackage = { ...directPackage };
delete legacyPackage.keyDigestType;
delete legacyPackage.keyDigest;
legacyPackage.checksum = Engine.packageChecksum(legacyPackage);
assert.equal(Engine.decryptBinary(legacyPackage, legacyKey), shortPlaintext, 'Legacy package without SHA-256 metadata must remain decryptable');
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

// True worker-level deterministic brute force: the correct key is deliberately beyond the first run budget.
const workerSeed = '437';
const workerPlaintext = utf8Bits('Cubic worker resume fixture · deterministic brute force');
const workerBaseOptions = { inputFace: 'top', outputFace: 'front', inputQuarterTurns: 0, outputQuarterTurns: 0, maskDensity: 0.75 };
const workerKey = Research.generateResearchKey('iterative-chain', workerSeed, 4, workerBaseOptions);
const workerPackage = Engine.encryptBinary(workerPlaintext, workerKey);
const workerSearchOptions = {
  profiles: ['iterative-chain'],
  usePackageMetadata: true,
  maxGridSize: 8,
  seedStart: 0,
  seedEnd: 500,
  seedTemplates: ['{n}'],
  includeFixedSeeds: false,
  orientationMode: 'manual',
  capacityMode: 'manual',
  stopOnFingerprint: true,
  resultLimit: 8,
  scoreThreshold: 100,
  sampleBlocks: 1,
  progressEvery: 25,
  maxAttemptsThisRun: 200
};

const firstHarness = createWorkerHarness();
const firstMessages = firstHarness.run({
  id: 1001,
  operation: 'search',
  source: { kind: 'package', package: workerPackage },
  options: workerSearchOptions,
  resumeCursor: 0
});
const firstWorkerResult = resultMessage(firstMessages, 'First bounded worker run');
assert.equal(firstWorkerResult.plan.totalAttempts, 501, 'Worker fixture should enumerate seeds 0 through 500 exactly once');
assert.equal(firstWorkerResult.cursor, 200, 'First bounded worker run must stop at the exact deterministic cursor budget');
assert.equal(firstWorkerResult.attemptsThisRun, 200, 'First bounded worker run must execute exactly its attempt budget');
assert.equal(firstWorkerResult.stoppedEarly, true);
assert.equal(firstWorkerResult.stopReason, 'attempt-budget');
assert.equal(firstWorkerResult.exactMatch, null, 'Late worker fixture key must not be found before resume');
const restoredCheckpoint = Cubic.validateCheckpoint(firstWorkerResult.checkpoint, firstWorkerResult.plan);
assert.equal(restoredCheckpoint.cursor, 200);

// Destroy the first harness, create a fresh worker context, and resume only from the serialized deterministic cursor.
const resumedHarness = createWorkerHarness();
const resumedMessages = resumedHarness.run({
  id: 1002,
  operation: 'search',
  source: { kind: 'package', package: workerPackage },
  options: { ...workerSearchOptions, maxAttemptsThisRun: 300 },
  resumeCursor: restoredCheckpoint.cursor
});
const resumedWorkerResult = resultMessage(resumedMessages, 'Resumed worker run');
assert.equal(resumedWorkerResult.planId, firstWorkerResult.planId, 'Attempt budget must not alter deterministic Plan ID');
assert.equal(resumedWorkerResult.stopReason, 'fingerprint-match');
assert.equal(resumedWorkerResult.stoppedEarly, true);
assert.ok(resumedWorkerResult.exactMatch, 'Fresh worker must recover the late key after checkpoint resume');
assert.equal(resumedWorkerResult.exactMatch.seed, workerSeed);
assert.equal(resumedWorkerResult.exactMatch.keyId, workerKey.keyId);
assert.equal(resumedWorkerResult.exactMatch.keyDigest, workerKey.keyDigest);
assert.equal(resumedWorkerResult.exactMatch.exactDigestMatch, true);
assert.equal(resumedWorkerResult.exactMatch.identityStrength, 'sha256');
assert.equal(resumedWorkerResult.exactMatch.plaintextBits, workerPlaintext);
assert.equal(resumedWorkerResult.cursor, 438, 'Resume must continue from cursor 200 and stop immediately after seed 437');
assert.equal(resumedWorkerResult.attemptsThisRun, 238, 'Resumed worker must not replay the first 200 candidate attempts');
assert.equal(Cubic.validateCheckpoint(resumedWorkerResult.checkpoint, resumedWorkerResult.plan).cursor, 438);

for (const required of [
  'Cubic Decryptor Tool',
  'Build staged plan',
  'Run / resume decryptor',
  'deterministic cursor',
  'BinaryCubeKeyGenerationResearch',
  'openInformationAnalysisSuite',
  'openMediaForensicsSuite',
  'SHA-256 KEY MATCH',
  'LEGACY KEY FINGERPRINT MATCH',
  'Corroborate retained candidates',
  'Stage B specialist corroboration',
  'Information.utilities.candidateScore',
  'Information.analyzeInformation'
]) assert.ok(ui.includes(required), `UI is missing ${JSON.stringify(required)}`);
for (const required of [
  "importScripts(",
  "'binary-cube-key-generation-research.js'",
  "'binary-cube-cubic-decryptor-engine.js'",
  "operation !== 'search'",
  'Cubic.attemptCandidate',
  'Cubic.makeCheckpoint',
  'maxAttemptsThisRun',
  "stopReason = 'attempt-budget'"
]) assert.ok(worker.includes(required), `Worker is missing ${JSON.stringify(required)}`);
assert.ok(css.length > 1000, 'Cubic Decryptor stylesheet is unexpectedly empty');

console.log(JSON.stringify({
  receipt: 'hb-ttrpg-binary-cube-cubic-decryptor-validation-receipt',
  schema: '0.3.0',
  pass: true,
  recovered,
  rawRoundTrip: true,
  generatorCompatibilityContract: searchableResearchProfiles,
  deterministicPlanId: broadPlan.planId,
  broadStageCount: broadPlan.stages.length,
  workerEnumeration: {
    planId: firstWorkerResult.planId,
    totalAttempts: firstWorkerResult.plan.totalAttempts,
    firstRunCursor: firstWorkerResult.cursor,
    resumedCursor: resumedWorkerResult.cursor,
    resumedAttempts: resumedWorkerResult.attemptsThisRun,
    recoveredSeed: resumedWorkerResult.exactMatch.seed,
    recoveredKeyId: resumedWorkerResult.exactMatch.keyId,
    recoveredKeyDigest: resumedWorkerResult.exactMatch.keyDigest,
    strongIdentityMatch: resumedWorkerResult.exactMatch.exactDigestMatch,
    exactPlaintextRecovery: resumedWorkerResult.exactMatch.plaintextBits === workerPlaintext
  }
}, null, 2));
