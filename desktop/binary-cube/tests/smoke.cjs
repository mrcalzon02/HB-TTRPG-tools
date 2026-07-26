'use strict';

const assert = require('node:assert/strict');
const path = require('node:path');

const repositoryRoot = path.resolve(__dirname, '..', '..', '..');
const Engine = require(path.join(repositoryRoot, 'shadowrun-binary-cube-engine.js'));
const SecureExport = require(path.join(repositoryRoot, 'shadowrun-binary-cube-secure-export.js'));

function bytesToBits(bytes) {
  return [...bytes].map(byte => byte.toString(2).padStart(8, '0')).join('');
}

function assertCompleteDepthDomain(key) {
  const sorted = [...key.depthPermutation].sort((a, b) => a - b);
  assert.equal(sorted.length, key.gridSize, 'Depth permutation length must equal the cube size.');
  for (let depth = 0; depth < key.gridSize; depth += 1) {
    assert.equal(sorted[depth], depth, `Depth ${depth} must appear exactly once.`);
  }
}

(() => {
  assert.equal(Engine.constants.MAX_GRID_SIZE, 1024, 'The expanded engine must expose the 1024 grid ceiling.');
  assert.ok(Engine.constants.RECOMMENDED_GRID_SIZES.includes(512), 'Expanded recommended grid sizes must include 512.');
  assert.ok(Engine.constants.RECOMMENDED_GRID_SIZES.includes(1024), 'Expanded recommended grid sizes must include 1024.');

  for (const gridSize of Engine.constants.RECOMMENDED_GRID_SIZES) {
    const key = Engine.createKey({
      gridSize,
      seed: `omnidirectional-size-${gridSize}`,
      inputFace: 'top',
      outputFace: 'front',
      inputQuarterTurns: gridSize % 4,
      outputQuarterTurns: (gridSize + 1) % 4,
      maskDensity: gridSize === 1024 ? 0.01 : 0.5
    });
    const invariant = Engine.assertOmnidirectionalNonConflict(key);
    assert.equal(invariant.collisionFree, true, `${gridSize} keys must remain collision-free.`);
    assert.equal(invariant.depthDomain.minimum, 0);
    assert.equal(invariant.depthDomain.maximum, gridSize - 1);
    assert.equal(invariant.depthDomain.complete, true);
    for (const face of Engine.invariantConstants.FACES) {
      assert.equal(invariant.faces[face], true, `${gridSize} key must remain collision-free on the ${face} face.`);
    }
    assertCompleteDepthDomain(key);
  }

  const exhaustiveKey = Engine.createKey({
    gridSize: 256,
    seed: 'exhaustive-six-face-projection-test',
    inputFace: 'left',
    outputFace: 'top',
    inputQuarterTurns: 2,
    outputQuarterTurns: 1,
    maskDensity: 0.25
  });
  const exhaustive = Engine.assertOmnidirectionalNonConflict(exhaustiveKey, { exhaustive: true });
  assert.equal(exhaustive.exhaustive, true);
  assert.equal(exhaustive.diagnostics.collisionFree, true);
  for (const face of Engine.invariantConstants.FACES) {
    const result = exhaustive.diagnostics.faces[face];
    assert.equal(result.uniqueCells, 256 * 256, `${face} must contain every point exactly once.`);
    assert.equal(result.expectedCells, 256 * 256, `${face} expected cell count must match the full projection.`);
  }

  const sourceBytes = Buffer.from('Binary Cube desktop smoke test: full-depth omnidirectional key.', 'utf8');
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

  const encryptedPackage = Engine.encryptBinary(sourceBits, key);
  assert.equal(Engine.decryptBinary(encryptedPackage, key), sourceBits, 'Binary Cube round trip must recover the original bits.');

  const securePackage = SecureExport.createSecureExport(encryptedPackage, key, Engine);
  assert.equal(SecureExport.isSecureExport(securePackage), true, 'Secure export must be recognized.');
  assert.equal(Object.hasOwn(securePackage, 'keyId'), false, 'Secure export must not expose the key ID.');
  assert.equal(Object.hasOwn(securePackage, 'originalBitLength'), false, 'Secure export must not expose the original bit length.');

  const reconstructedPackage = SecureExport.expandSecureExport(securePackage, key, Engine);
  assert.equal(Engine.decryptBinary(reconstructedPackage, key), sourceBits, 'Secure export reconstruction must recover the original bits.');

  const invalidDepthKey = JSON.parse(JSON.stringify(key));
  invalidDepthKey.depthPermutation[0] = invalidDepthKey.depthPermutation[1];
  delete invalidDepthKey.keyId;
  assert.throws(
    () => Engine.validateKey(invalidDepthKey),
    /depth permutation|omnidirectional|collision/i,
    'A key with a duplicated or missing depth must be rejected.'
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

  console.log('Binary Cube expanded-grid, full-depth, omnidirectional, secure-export, and round-trip smoke tests passed.');
})();
