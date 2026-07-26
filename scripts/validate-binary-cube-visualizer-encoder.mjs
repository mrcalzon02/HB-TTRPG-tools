#!/usr/bin/env node

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, '..');
const Engine = require(path.join(repositoryRoot, 'shadowrun-binary-cube-engine.js'));
globalThis.ShadowrunBinaryCubeEngine = Engine;
const Visualizer = require(path.join(repositoryRoot, 'shadowrun-binary-cube-visualizer.js'));

const visualizerSource = fs.readFileSync(path.join(repositoryRoot, 'shadowrun-binary-cube-visualizer.js'), 'utf8');
const laboratorySource = fs.readFileSync(path.join(repositoryRoot, 'shadowrun-binary-cube-encryption.js'), 'utf8');
const entrySource = fs.readFileSync(path.join(repositoryRoot, 'shadowrun-entry.js'), 'utf8');
const styleSource = fs.readFileSync(path.join(repositoryRoot, 'binary-cube-visualizer.css'), 'utf8');

assert.equal(typeof Visualizer.utilities?.bytesToBits, 'function');
assert.equal(typeof Visualizer.utilities?.bitsToBytes, 'function');
assert.equal(typeof Visualizer.utilities?.normalizeCustomMask, 'function');
assert.deepEqual(Visualizer.constants.MASK_MODES, ['1', '0.75', '0.5', 'custom']);

const byteFixture = new Uint8Array([0, 1, 65, 127, 128, 254, 255]);
const byteBits = Visualizer.utilities.bytesToBits(byteFixture);
assert.equal(byteBits, '00000000000000010100000101111111100000001111111011111111');
assert.deepEqual(Array.from(Visualizer.utilities.bitsToBytes(byteBits)), Array.from(byteFixture));
assert.equal(Visualizer.utilities.normalizeCustomMask('1010\n0101\n1010\n0101', 16), '1010010110100101');
assert.throws(() => Visualizer.utilities.normalizeCustomMask('0000000000000000', 16), /at least one payload cell/i);
assert.throws(() => Visualizer.utilities.normalizeCustomMask('1010', 16), /exactly 16/i);

function customMaskKey(options, maskBits) {
  const base = Engine.createKey({ ...options, maskDensity: 1 });
  return Engine.validateKey({ ...base, keyId: undefined, mask: [...maskBits].map(bit => bit === '1') });
}

const definitions = Object.freeze([
  Object.freeze({
    id: 'v7-full-4-multiblock',
    bits: '010011001101001101001100110100110100110011010011',
    key: Engine.createKey({ gridSize: 4, seed: 'binary-cube-v7-full', inputFace: 'top', outputFace: 'front', inputQuarterTurns: 0, outputQuarterTurns: 0, maskDensity: 1 })
  }),
  Object.freeze({
    id: 'v7-sparse-4',
    bits: '101101001011010010101001101',
    key: Engine.createKey({ gridSize: 4, seed: 'binary-cube-v7-sparse', inputFace: 'left', outputFace: 'top', inputQuarterTurns: 3, outputQuarterTurns: 1, maskDensity: 0.5 })
  }),
  Object.freeze({
    id: 'v7-custom-4',
    bits: '11100010101101011001',
    key: customMaskKey({ gridSize: 4, seed: 'binary-cube-v7-custom', inputFace: 'back', outputFace: 'right', inputQuarterTurns: 2, outputQuarterTurns: 3 }, '1010101010101010')
  }),
  Object.freeze({
    id: 'v7-file-derived',
    bits: Visualizer.utilities.bytesToBits(new Uint8Array([0, 255, 65, 10, 200])),
    key: Engine.createKey({ gridSize: 4, seed: 'binary-cube-v7-file', inputFace: 'bottom', outputFace: 'left', inputQuarterTurns: 1, outputQuarterTurns: 2, maskDensity: 0.75 })
  }),
  Object.freeze({
    id: 'v7-standard-12',
    bits: Array.from({ length: 239 }, (_, index) => index % 5 === 0 || index % 7 === 0 ? '1' : '0').join(''),
    key: Engine.createKey({ gridSize: 12, seed: 'binary-cube-v7-standard', inputFace: 'front', outputFace: 'top', inputQuarterTurns: 2, outputQuarterTurns: 1, maskDensity: 1 })
  })
]);

const receipts = [];
for (const definition of definitions) {
  const key = Engine.validateKey(definition.key);
  const packageObject = Engine.encryptBinary(definition.bits, key);
  const validatedPackage = Engine.validatePackage(packageObject, key);
  const cellCount = key.gridSize * key.gridSize;
  const traces = [];

  for (let blockIndex = 0; blockIndex < packageObject.blockCount; blockIndex += 1) {
    const trace = Engine.traceEncryptBlock(definition.bits, key, blockIndex);
    const validation = Engine.validateTransformationTrace(trace, key);
    const expectedCiphertextBlock = packageObject.ciphertext.slice(blockIndex * cellCount, (blockIndex + 1) * cellCount);
    assert.equal(validation.valid, true);
    assert.equal(trace.blockIndex, blockIndex);
    assert.equal(trace.outputBlock, expectedCiphertextBlock, `${definition.id} trace ${blockIndex} does not match its package ciphertext slice.`);
    assert.equal(trace.sourceBitRange.start, blockIndex * packageObject.payloadCapacity);
    traces.push(trace);
  }

  assert.equal(traces.map(trace => trace.outputBlock).join(''), packageObject.ciphertext, `${definition.id} traces do not reconstruct the complete package ciphertext.`);
  const recovered = Engine.decryptBinary(validatedPackage, key);
  assert.equal(recovered, definition.bits, `${definition.id} did not recover its exact source bits.`);
  const reencrypted = Engine.encryptBinary(recovered, key);
  assert.deepEqual(reencrypted, packageObject, `${definition.id} decrypt/re-encrypt did not reproduce the exact package JSON.`);
  assert.equal(Engine.packageChecksum(packageObject), packageObject.checksum);

  receipts.push(Object.freeze({
    id: definition.id,
    keyId: key.keyId,
    gridSize: key.gridSize,
    payloadCapacity: packageObject.payloadCapacity,
    originalBitLength: packageObject.originalBitLength,
    blockCount: packageObject.blockCount,
    ciphertextBitLength: packageObject.ciphertext.length,
    checksum: packageObject.checksum,
    traceCount: traces.length,
    exactRoundTrip: true
  }));
}

for (const operation of ['Engine.encryptBinary', 'Engine.validatePackage', 'Engine.decryptBinary', 'Engine.traceEncryptBlock', 'Engine.validateTransformationTrace']) {
  assert.match(visualizerSource, new RegExp(operation.replace('.', '\\.')), `V7 visualizer is missing canonical operation ${operation}.`);
}
assert.equal(visualizerSource.includes('Engine.transformBlock'), false, 'The V7 visualizer must not reconstruct block transformations.');
assert.match(visualizerSource, /buildTraceCollection/);
assert.match(visualizerSource, /traces\.map\(trace => trace\.outputBlock\)\.join\(''\)/);
assert.match(visualizerSource, /JSON\.stringify\(reencrypted\) === JSON\.stringify\(packageObject\)/);
assert.match(visualizerSource, /data-cube-encoder-block/);
assert.match(visualizerSource, /data-cube-encoder-file/);
assert.match(visualizerSource, /data-cube-encoder-import-package/);
assert.match(visualizerSource, /loadArtifacts/);
assert.match(visualizerSource, /currentArtifacts/);
assert.match(visualizerSource, /shadowrun-binary-cube-open-laboratory/);

for (const selector of ['#cube-input', '#cube-package', '#cube-key', '#cube-decrypted', '#cube-status', '.cube-lab-output']) {
  assert.match(laboratorySource, new RegExp(selector.replace('.', '\\.')), `Laboratory compatibility selector ${selector} is missing.`);
}
assert.match(laboratorySource, /loadArtifacts/);
assert.match(laboratorySource, /currentArtifacts/);
assert.match(laboratorySource, /shadowrun-binary-cube-open-visualizer/);
assert.match(laboratorySource, /data-cube-open-visualizer/);
assert.match(laboratorySource, /Engine\.encryptBinary/);
assert.match(laboratorySource, /Engine\.decryptBinary/);

assert.match(entrySource, /ASSET_VERSION = '20260726-2'/);
assert.match(entrySource, /shadowrun-binary-cube-open-laboratory/);
assert.match(entrySource, /shadowrun-binary-cube-open-visualizer/);
assert.match(entrySource, /api\.loadArtifacts/);

for (const selector of ['cube-encoder-panel', 'cube-encoder-header', 'cube-encoder-output-grid', 'cube-encoder-package-summary', 'cube-encoder-roundtrip', 'cube-visualizer-file-button', 'cube-encoder-block-field']) {
  assert.match(styleSource, new RegExp(`\\.${selector}`), `V7 styling is missing .${selector}.`);
}

console.log(JSON.stringify({
  format: 'hb-ttrpg-shadowrun-binary-cube-v7-encoder-validation-receipt',
  schemaVersion: '0.1.0',
  packageSchemaVersion: Engine.constants.SCHEMA_VERSION,
  testedPackages: receipts,
  exactPackageParity: true,
  exactChecksumParity: true,
  allBlockTracesMatchCiphertext: true,
  exactDecryptReencryptRoundTrip: true,
  manualInputSupported: true,
  fileByteConversionSupported: true,
  generatedAndImportedKeysSupported: true,
  densityAndCustomMasksSupported: true,
  selectedBlockAnimationBoundaryPresent: true,
  bidirectionalLaboratoryHandoffPresent: true,
  visualizerAlgorithmReconstruction: false
}, null, 2));
