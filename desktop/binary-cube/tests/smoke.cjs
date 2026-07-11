'use strict';

const assert = require('node:assert/strict');
const path = require('node:path');

const repositoryRoot = path.resolve(__dirname, '..', '..', '..');
const Engine = require(path.join(repositoryRoot, 'binary-cube-large-grid-engine.js'));
const SecureExport = require(path.join(repositoryRoot, 'shadowrun-binary-cube-secure-export.js'));
const KeyImage = require(path.join(repositoryRoot, 'binary-cube-key-image.js'));

function bytesToBits(bytes) {
  return [...bytes].map(byte => byte.toString(2).padStart(8, '0')).join('');
}

(async () => {
  assert.equal(Engine.constants.MAX_GRID_SIZE, 1024, 'The expanded engine must expose the 1024 grid ceiling.');
  assert.ok(Engine.constants.RECOMMENDED_GRID_SIZES.includes(512), 'Expanded recommended grid sizes must include 512.');
  assert.ok(Engine.constants.RECOMMENDED_GRID_SIZES.includes(1024), 'Expanded recommended grid sizes must include 1024.');

  const sourceBytes = Buffer.from('Binary Cube desktop smoke test: Shadowrun + Blacklight + lossless key PNG.', 'utf8');
  const sourceBits = bytesToBits(sourceBytes);
  const key = Engine.createKey({
    gridSize: 64,
    seed: 'binary-cube-desktop-smoke-test',
    inputFace: 'top',
    outputFace: 'front',
    inputQuarterTurns: 1,
    outputQuarterTurns: 3,
    maskDensity: 0.33
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

  const keyPng = await KeyImage.encodeKeyPng(key, Engine);
  assert.ok(keyPng.length > key.gridSize * key.gridSize, 'The PNG must contain raster and embedded canonical key data.');
  assert.equal(keyPng[24], 16, 'The key PNG must retain 16-bit channel depth.');
  assert.equal(keyPng[25], 2, 'The key PNG must use truecolor RGB rather than a palette.');

  const recoveredKey = await KeyImage.decodeKeyPng(keyPng, Engine);
  assert.deepEqual(recoveredKey, key, 'The lossless PNG must reconstruct the exact canonical key.');

  const damagedPng = new Uint8Array(keyPng);
  damagedPng[damagedPng.length - 1] ^= 1;
  await assert.rejects(
    () => KeyImage.decodeKeyPng(damagedPng, Engine),
    /CRC|invalid|missing|match|altered/i,
    'A modified PNG must be rejected rather than approximately imported.'
  );

  const wrongKey = Engine.createKey({
    gridSize: 64,
    seed: 'intentionally-wrong-key',
    inputFace: 'top',
    outputFace: 'front',
    inputQuarterTurns: 1,
    outputQuarterTurns: 3,
    maskDensity: 0.33
  });

  assert.throws(
    () => SecureExport.expandSecureExport(securePackage, wrongKey, Engine),
    /invalid|checksum|key|length|aligned|block/i,
    'A mismatched key must not successfully reconstruct the secure export.'
  );

  const expandedKey = Engine.createKey({
    gridSize: 128,
    seed: 'expanded-grid-generation-test',
    inputFace: 'left',
    outputFace: 'top',
    maskDensity: 0.01
  });
  assert.equal(expandedKey.mask.length, 128 * 128, 'Expanded keys must preserve an exact full-grid mask.');
  assert.ok(expandedKey.mask.some(Boolean), 'Even a 99% blocked mask must preserve payload cells.');

  console.log('Binary Cube desktop, expanded-grid, secure-export, and lossless PNG smoke tests passed.');
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
