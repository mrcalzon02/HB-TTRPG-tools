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
const Pool = require(path.join(root, 'binary-cube-cubic-decryptor-worker-pool.js'));
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

function createWorkerAdapter() {
  const harness = createWorkerHarness();
  const listeners = { message: [], error: [] };
  let terminated = false;
  return {
    addEventListener(type, listener) { if (listeners[type]) listeners[type].push(listener); },
    postMessage(message) {
      queueMicrotask(() => {
        if (terminated) return;
        try {
          const rows = harness.run(message);
          for (const row of rows) {
            if (terminated) break;
            for (const listener of listeners.message) listener({ data: row });
          }
        } catch (error) {
          if (!terminated) for (const listener of listeners.error) listener({ message: error.message, error });
        }
      });
    },
    terminate() { terminated = true; }
  };
}

function resultMessage(messages, label) {
  const row = [...messages].reverse().find(message => message?.type === 'result');
  assert.ok(row, `${label} did not emit a result message`);
  return row.result;
}

assert.equal(Cubic.constants.VERSION, '0.2.0');
assert.equal(Pool.constants.VERSION, '0.1.0');
assert.equal(Pool.resolveWorkerCount(0, 8), 4);
assert.equal(Pool.resolveWorkerCount(6, 8), 6);
const partitionProbe = Pool.partitionRun(501, 200, 238, 4);
assert.deepEqual(partitionProbe.map(row => [row.startCursor, row.endCursorExclusive]), [[200,260],[260,320],[320,379],[379,438]]);
assert.equal(partitionProbe.reduce((sum, row) => sum + row.attemptLimit, 0), 238);
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
const textCrib = Cubic.normalizeCrib({ cribMode: 'text', cribValue: 'KNOWN', cribOffsetBytes: 3 });
assert.equal(textCrib.enabled, true);
assert.equal(textCrib.offsetBytes, 3);
assert.equal(textCrib.hex, Buffer.from('KNOWN', 'utf8').toString('hex'));
assert.equal(Cubic.normalizeCrib({ cribMode: 'signature', cribSignature: 'PNG' }).hex, '89504e470d0a1a0a');
assert.throws(() => Cubic.normalizeCrib({ cribMode: 'hex', cribValue: 'abc' }), /complete hexadecimal bytes/);

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
const cribPlan = Cubic.buildSearchPlan(rawSource, { profiles: ['direct-permutation'], usePackageMetadata: false, maxGridSize: 4, seedStart: 0, seedEnd: 3, seedTemplates: ['{n}'], includeFixedSeeds: false, orientationMode: 'manual', capacityMode: 'manual', payloadCapacity: directPackage.payloadCapacity, inputFace: 'top', outputFace: 'front', cribMode: 'text', cribValue: 'H', cribOffsetBytes: 0 });
assert.notEqual(cribPlan.planId, broadPlan.planId, 'Known-plaintext assumptions must be part of the deterministic Plan ID.');
assert.throws(() => Cubic.validateCheckpoint(checkpoint, cribPlan), /different deterministic search plan/, 'A checkpoint created under different crib assumptions must be rejected.');

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
assert.ok(Number.isFinite(firstWorkerResult.attemptsPerSecond) && firstWorkerResult.attemptsPerSecond >= 0, 'Bounded worker result must expose measured attempts/second.');
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

// Four-worker deterministic pool: bounded prefix then fresh pooled resume must preserve the same global cursor semantics.
const poolPlan = Cubic.buildSearchPlan(Cubic.parsePackage(workerPackage), workerSearchOptions);
const singleWorkerPlanId = poolPlan.planId;
const poolPlanDifferentWorkerHint = Cubic.buildSearchPlan(Cubic.parsePackage(workerPackage), { ...workerSearchOptions, workerCount: 8 });
assert.equal(poolPlanDifferentWorkerHint.planId, singleWorkerPlanId, 'Worker count must never enter the deterministic Cubic Plan ID.');
const firstPoolSearch = Pool.startSearch({
  plan: poolPlan,
  source: { kind: 'package', package: workerPackage },
  options: { ...workerSearchOptions, maxAttemptsThisRun: 200 },
  resumeCursor: 0,
  workerCount: 4,
  hardwareConcurrency: 8,
  requestId: 'pool-first',
  workerFactory: () => createWorkerAdapter()
});
const firstPoolResult = await firstPoolSearch.promise;
assert.equal(firstPoolResult.workerCount, 4);
assert.equal(firstPoolResult.cursor, 200);
assert.equal(firstPoolResult.attemptsThisRun, 200);
assert.equal(firstPoolResult.stopReason, 'attempt-budget');
assert.equal(firstPoolResult.exactMatch, null);
assert.deepEqual(firstPoolResult.shards.map(row => row.startCursor), [0,50,100,150]);
assert.deepEqual(firstPoolResult.shards.map(row => row.endCursorExclusive), [50,100,150,200]);
assert.equal(Cubic.validateCheckpoint(firstPoolResult.checkpoint, poolPlan).cursor, 200);

const resumedPoolSearch = Pool.startSearch({
  plan: poolPlan,
  source: { kind: 'package', package: workerPackage },
  options: { ...workerSearchOptions, maxAttemptsThisRun: 300 },
  resumeCursor: firstPoolResult.checkpoint.cursor,
  workerCount: 4,
  hardwareConcurrency: 8,
  requestId: 'pool-resume',
  workerFactory: () => createWorkerAdapter()
});
const resumedPoolResult = await resumedPoolSearch.promise;
assert.equal(resumedPoolResult.planId, singleWorkerPlanId);
assert.equal(resumedPoolResult.workerCount, 4);
assert.equal(resumedPoolResult.stopReason, 'fingerprint-match');
assert.ok(resumedPoolResult.exactMatch);
assert.equal(resumedPoolResult.exactMatch.seed, workerSeed);
assert.equal(resumedPoolResult.exactMatch.ordinal, 437);
assert.equal(resumedPoolResult.exactMatch.keyDigest, workerKey.keyDigest);
assert.equal(resumedPoolResult.cursor, 438, 'Parallel exact-match resolution must commit only the contiguous searched prefix through the earliest exact ordinal.');
assert.equal(resumedPoolResult.attemptsThisRun, 238, 'Four-worker resume must search each ordinal in the committed prefix exactly once for this fixture.');
assert.equal(Cubic.validateCheckpoint(resumedPoolResult.checkpoint, poolPlan).cursor, 438);

// Disabling stop-on-identity must preserve the entire assigned pooled interval even when an exact key is observed.
const nonStoppingSeed = '7';
const nonStoppingKey = Research.generateResearchKey('direct-permutation', nonStoppingSeed, 4, workerBaseOptions);
const nonStoppingPackage = Engine.encryptBinary(workerPlaintext, nonStoppingKey);
const nonStoppingOptions = { ...workerSearchOptions, profiles: ['direct-permutation'], seedStart: 0, seedEnd: 20, stopOnFingerprint: false, maxAttemptsThisRun: 20 };
const nonStoppingPlan = Cubic.buildSearchPlan(Cubic.parsePackage(nonStoppingPackage), nonStoppingOptions);
const nonStoppingPool = Pool.startSearch({
  plan: nonStoppingPlan,
  source: { kind: 'package', package: nonStoppingPackage },
  options: nonStoppingOptions,
  resumeCursor: 0,
  workerCount: 4,
  hardwareConcurrency: 8,
  requestId: 'pool-no-early-stop',
  workerFactory: () => createWorkerAdapter()
});
const nonStoppingPoolResult = await nonStoppingPool.promise;
assert.ok(nonStoppingPoolResult.exactMatch, 'The pool must still report an observed exact key identity when stop-on-identity is disabled.');
assert.equal(nonStoppingPoolResult.exactMatch.seed, nonStoppingSeed);
assert.equal(nonStoppingPoolResult.cursor, 20, 'stopOnFingerprint=false must complete the entire assigned interval instead of truncating at the exact key.');
assert.equal(nonStoppingPoolResult.attemptsThisRun, 20);
assert.equal(nonStoppingPoolResult.stopReason, 'attempt-budget');

// Raw-ciphertext known-plaintext search: high score threshold cannot hide a correct crib match, and sample depth expands automatically.
const cribSeed = '23';
const cribText = 'KNOWN-PLAINTEXT-CRIB::opaque binary tail 0123456789';
const cribPlaintext = utf8Bits(cribText);
const cribKey = Research.generateResearchKey('iterative-chain', cribSeed, 4, workerBaseOptions);
const cribPackage = Engine.encryptBinary(cribPlaintext, cribKey);
const cribRawSource = Cubic.sourceFromRaw(cribPackage.ciphertext, { inputFace: 'top', outputFace: 'front', inputQuarterTurns: 0, outputQuarterTurns: 0, payloadCapacity: cribPackage.payloadCapacity, originalBitLength: cribPlaintext.length });
const cribSearchOptions = { profiles: ['iterative-chain'], usePackageMetadata: false, maxGridSize: 4, seedStart: 0, seedEnd: 40, seedTemplates: ['{n}'], includeFixedSeeds: false, orientationMode: 'manual', capacityMode: 'manual', inputFace: 'top', outputFace: 'front', payloadCapacity: cribPackage.payloadCapacity, originalBitLength: cribPlaintext.length, scoreThreshold: 100, resultLimit: 8, sampleBlocks: 1, cribMode: 'text', cribValue: 'KNOWN-PLAINTEXT-CRIB', cribOffsetBytes: 0, maxAttemptsThisRun: 0, progressEvery: 10 };
const cribPlanA = Cubic.buildSearchPlan(cribRawSource, cribSearchOptions);
const cribPlanB = Cubic.buildSearchPlan(cribRawSource, { ...cribSearchOptions, cribValue: 'WRONG-PLAINTEXT-CRIB' });
assert.notEqual(cribPlanA.planId, cribPlanB.planId, 'Changing crib bytes must change the deterministic Plan ID.');
const cribHarness = createWorkerHarness();
const cribResult = resultMessage(cribHarness.run({ id: 1003, operation: 'search', source: { kind: 'raw', bits: cribRawSource.bits, framing: cribRawSource.framing }, options: cribSearchOptions, resumeCursor: 0 }), 'Crib-assisted raw worker run');
assert.equal(cribResult.exhausted, true);
const cribCandidate = cribResult.candidates.find(candidate => candidate.seed === cribSeed);
assert.ok(cribCandidate, 'Known-plaintext crib must retain the correct raw candidate even when Stage A threshold is 100.');
assert.equal(cribCandidate.cribMatch, true);
assert.equal(cribCandidate.exactFingerprintMatch, false);
assert.equal(cribCandidate.identityStrength, 'known-plaintext-crib');
assert.ok(cribCandidate.plaintextBits.length >= Buffer.byteLength('KNOWN-PLAINTEXT-CRIB') * 8, 'Crib matching must automatically decrypt enough blocks to reach the known plaintext.');
const wrongCribCandidate = Cubic.attemptCandidate(cribRawSource, { stageId: 'iterative-chain:small', profile: 'iterative-chain', gridSize: 4, orientation: { inputFace: 'top', outputFace: 'front', inputQuarterTurns: 0, outputQuarterTurns: 0 }, payloadCapacity: cribPackage.payloadCapacity, seed: cribSeed, seedSource: '{n}' }, { ...cribSearchOptions, cribValue: 'DEFINITELY-WRONG-CRIB' });
assert.equal(wrongCribCandidate, null, 'A raw candidate that contradicts the configured crib must be pruned before scoring.');

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
  'Information.analyzeInformation',
  'bccd-attempt-budget',
  'Attempts / second',
  'Estimated remaining',
  'formatDuration(',
  'updatePlanRuntimeEstimates(',
  'Known plaintext / crib pruning',
  'bccd-crib-mode',
  'bccd-crib-offset',
  'KNOWN-PLAINTEXT CRIB MATCH',
  'indexedDB.open',
  'hb-ttrpg-cubic-decryptor-autosave',
  'sourceIdentity(',
  'restoreAutosaveForSource',
  'candidateAutosaveSnapshot',
  'Clear saved local session',
  'Autosave interrupted search to this browser',
  'does not persist the source ciphertext itself',
  'AUTOSAVE_MAX_PLAINTEXT_BITS = 65536',
  'BinaryCubeCubicDecryptorWorkerPool',
  'bccd-worker-count',
  'Parallel workers',
  'Pool.startSearch',
  'deterministic shard',
  'Benchmark 1 / 2 / 4 / 8 workers',
  'benchmarkWorkers(',
  'Apply recommendation',
  'Efficiency'
]) assert.ok(ui.includes(required), `UI is missing ${JSON.stringify(required)}`);
assert.ok(!ui.includes('localStorage'), 'Cubic long-run autosave must use IndexedDB rather than localStorage.');
for (const required of [
  "importScripts(",
  "'binary-cube-key-generation-research.js'",
  "'binary-cube-cubic-decryptor-engine.js'",
  "operation !== 'search'",
  'Cubic.attemptCandidate',
  'Cubic.makeCheckpoint',
  'maxAttemptsThisRun',
  'attemptsPerSecond',
  'Cubic.normalizeCrib',
  'rankedCandidate.cribMatch',
  'ordinal',
  "stopReason = 'attempt-budget'"
]) assert.ok(worker.includes(required), `Worker is missing ${JSON.stringify(required)}`);
assert.ok(css.length > 1000, 'Cubic Decryptor stylesheet is unexpectedly empty');

console.log(JSON.stringify({
  receipt: 'hb-ttrpg-binary-cube-cubic-decryptor-validation-receipt',
  schema: '0.8.0',
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
    exactPlaintextRecovery: resumedWorkerResult.exactMatch.plaintextBits === workerPlaintext,
    cribSearch: { planId: cribPlanA.planId, recoveredSeed: cribCandidate.seed, matched: cribCandidate.cribMatch, sampleExpanded: cribCandidate.plaintextBits.length >= Buffer.byteLength('KNOWN-PLAINTEXT-CRIB') * 8 },
    workerPool: { workerCount: resumedPoolResult.workerCount, firstRunCursor: firstPoolResult.cursor, resumedCursor: resumedPoolResult.cursor, recoveredOrdinal: resumedPoolResult.exactMatch.ordinal, deterministicPlanId: resumedPoolResult.planId === singleWorkerPlanId, nonStoppingExactCursor: nonStoppingPoolResult.cursor }
  }
}, null, 2));
