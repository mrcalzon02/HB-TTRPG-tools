#!/usr/bin/env node

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import vm from 'node:vm';
import { webcrypto } from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const root = process.cwd();
const read = relativePath => fs.readFileSync(path.join(root, relativePath), 'utf8');
const workerClientSource = read('binary-cube-worker-client.js');
const laboratorySource = read('shadowrun-binary-cube-encryption.js');

for (const marker of [
  'const RESEED_BYTES = 16;',
  'crypto.getRandomValues',
  'function freshSeed(',
  'freshSeed,',
  'reseedBytes: RESEED_BYTES'
]) assert.ok(workerClientSource.includes(marker), `Binary Cube worker client is missing reseed contract marker ${marker}`);

for (const marker of [
  'data-cube-reseed',
  '>Reseed Key</button>',
  "Executor.freshSeed('binary-cube')",
  "panel.querySelector('#cube-seed').value = generatedSeed;",
  "panel.querySelector('#cube-key').value = '';",
  "panel.querySelector('#cube-package').value = '';",
  "panel.querySelector('#cube-decrypted').value = '';",
  "setTransportArtifact(panel, 'internal-package', null);",
  "runBackground(panel, 'create-key'",
  'await generateKey(panel, false)',
  'await generateKey(panel, true)',
  'reseedKey: () => generateKey(buildPanel(), true)'
]) assert.ok(laboratorySource.includes(marker), `Binary Cube laboratory is missing reseed contract marker ${marker}`);

assert.ok(laboratorySource.includes('Generate Key reproduces this seed exactly.'), 'The deterministic Generate Key behavior must remain explicit.');
assert.ok(!workerClientSource.includes('Math.random'), 'Secure reseeding must not silently fall back to Math.random().');

const context = vm.createContext({
  console,
  crypto: webcrypto,
  performance,
  setInterval,
  clearInterval,
  setTimeout,
  clearTimeout,
  URL,
  document: { baseURI: 'https://example.invalid/' }
});
context.window = context;
context.globalThis = context;
vm.runInContext(workerClientSource, context, { filename: 'binary-cube-worker-client.js' });
const client = context.ShadowrunBinaryCubeWorkerClient;
assert.ok(client, 'Binary Cube worker client did not expose its API.');
assert.equal(client.reseedBytes, 16, 'Reseeding must use exactly 16 random bytes.');

const seeds = Array.from({ length: 8 }, () => client.freshSeed('binary-cube'));
for (const seed of seeds) assert.match(seed, /^binary-cube-[0-9a-f]{32}$/, 'Fresh Binary Cube seed has an unexpected representation.');
assert.equal(new Set(seeds).size, seeds.length, 'Fresh Binary Cube seed samples unexpectedly repeated.');

const require = createRequire(import.meta.url);
const enginePath = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'shadowrun-binary-cube-engine.js');
const Engine = require(enginePath);
const options = { gridSize: 12, inputFace: 'top', outputFace: 'front', inputQuarterTurns: 0, outputQuarterTurns: 0, maskDensity: 0.75 };
const fixedA = Engine.createKey({ ...options, seed: 'binary-cube-reseed-fixed-vector' });
const fixedB = Engine.createKey({ ...options, seed: 'binary-cube-reseed-fixed-vector' });
assert.deepEqual(fixedB, fixedA, 'Generate Key must remain deterministic for an unchanged seed and settings.');

const reseededKeys = seeds.slice(0, 4).map(seed => Engine.createKey({ ...options, seed }));
assert.equal(new Set(reseededKeys.map(key => key.keyId)).size, reseededKeys.length, 'Fresh seeds must produce distinct canonical key fingerprints in this validation sample.');
for (const key of reseededKeys) assert.equal(Engine.algebraicInvariant(key).collisionFree, true, 'Reseeded canonical key violated the collision-free invariant.');

console.log(JSON.stringify({
  format: 'hb-ttrpg-binary-cube-reseed-validation-receipt',
  schemaVersion: '0.1.0',
  pass: true,
  entropyBytesPerReseed: client.reseedBytes,
  sampledFreshSeeds: seeds.length,
  deterministicGeneratePreserved: fixedA.keyId === fixedB.keyId,
  distinctReseededKeyIds: reseededKeys.length,
  collisionFreeReseededKeys: true
}, null, 2));
