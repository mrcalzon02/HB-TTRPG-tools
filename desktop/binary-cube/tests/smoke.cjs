'use strict';

const assert = require('node:assert/strict');
const path = require('node:path');

const repositoryRoot = path.resolve(__dirname, '..', '..', '..');
const Engine = require(path.join(repositoryRoot, 'shadowrun-binary-cube-engine.js'));
const SecureExport = require(path.join(repositoryRoot, 'shadowrun-binary-cube-secure-export.js'));

function bytesToBits(bytes) {
  return [...bytes].map(byte => byte.toString(2).padStart(8, '0')).join('');
}

const sourceBytes = Buffer.from('Binary Cube desktop smoke test: Shadowrun + Blacklight.', 'utf8');
const sourceBits = bytesToBits(sourceBytes);
const key = Engine.createKey({
  gridSize: 12,
  seed: 'binary-cube-desktop-smoke-test',
  inputFace: 'top',
  outputFace: 'front',
  inputQuarterTurns: 1,
  outputQuarterTurns: 3,
  maskDensity: 0.75
});

Engine.assertProjectionUniqueness(key);

const encryptedPackage = Engine.encryptBinary(sourceBits, key);
assert.equal(Engine.decryptBinary(encryptedPackage, key), sourceBits, 'Binary Cube round trip must recover the original bits.');

const securePackage = SecureExport.createSecureExport(encryptedPackage, key, Engine);
assert.equal(SecureExport.isSecureExport(securePackage), true, 'Secure export must be recognized.');
assert.equal(Object.hasOwn(securePackage, 'keyId'), false, 'Secure export must not expose the key ID.');
assert.equal(Object.hasOwn(securePackage, 'originalBitLength'), false, 'Secure export must not expose the original bit length.');

const reconstructedPackage = SecureExport.expandSecureExport(securePackage, key, Engine);
assert.equal(Engine.decryptBinary(reconstructedPackage, key), sourceBits, 'Secure export reconstruction must recover the original bits.');

const wrongKey = Engine.createKey({
  gridSize: 12,
  seed: 'intentionally-wrong-key',
  inputFace: 'top',
  outputFace: 'front',
  inputQuarterTurns: 1,
  outputQuarterTurns: 3,
  maskDensity: 0.75
});

assert.throws(
  () => SecureExport.expandSecureExport(securePackage, wrongKey, Engine),
  /invalid|checksum|key|length|aligned|block/i,
  'A mismatched key must not successfully reconstruct the secure export.'
);

console.log('Binary Cube desktop smoke test passed.');
