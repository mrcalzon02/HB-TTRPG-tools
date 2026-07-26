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
const Renderer = require(path.join(repositoryRoot, 'binary-cube-visualizer-renderer.js'));
globalThis.ShadowrunBinaryCubeEngine = Engine;
globalThis.BinaryCubeVisualizerRenderer = Renderer;
const Visualizer = require(path.join(repositoryRoot, 'shadowrun-binary-cube-visualizer.js'));
const controllerSource = fs.readFileSync(path.join(repositoryRoot, 'shadowrun-binary-cube-visualizer.js'), 'utf8');
const styleSource = fs.readFileSync(path.join(repositoryRoot, 'binary-cube-visualizer.css'), 'utf8');

const {
  describeTraceBlock,
  locateSourceBit,
  locateCiphertextBit,
  sequenceBlockIndex,
  effectivePlaybackMode
} = Visualizer.utilities;

for (const operation of [describeTraceBlock, locateSourceBit, locateCiphertextBit, sequenceBlockIndex, effectivePlaybackMode]) {
  assert.equal(typeof operation, 'function', 'The V8 inspection utility boundary is incomplete.');
}
assert.deepEqual(Visualizer.constants.PLAYBACK_SCOPES, ['selected-bit', 'selected-row', 'selected-block', 'all-blocks', 'overview-only']);

const baseKey = Engine.createKey({
  gridSize: 4,
  seed: 'binary-cube-v8-multi-block',
  inputFace: 'left',
  outputFace: 'top',
  inputQuarterTurns: 3,
  outputQuarterTurns: 1,
  maskDensity: 1
});
const maskBits = '1010101010101010';
const key = Engine.validateKey({ ...baseKey, keyId: undefined, mask: [...maskBits].map(bit => bit === '1') });
const bits = Array.from({ length: 37 }, (_, index) => ((index * 5 + 3) % 7 < 3 ? '1' : '0')).join('');
const packageObject = Engine.encryptBinary(bits, key);
const traces = Object.freeze(Array.from({ length: packageObject.blockCount }, (_, blockIndex) => {
  const trace = Engine.traceEncryptBlock(bits, key, blockIndex);
  Engine.validateTransformationTrace(trace, key);
  return trace;
}));

assert.equal(packageObject.payloadCapacity, 8);
assert.equal(packageObject.blockCount, 5);
assert.equal(traces.map(trace => trace.outputBlock).join(''), packageObject.ciphertext);
assert.equal(Engine.decryptBinary(packageObject, key), bits);

const descriptors = traces.map(trace => describeTraceBlock(trace, packageObject));
for (let blockIndex = 0; blockIndex < descriptors.length; blockIndex += 1) {
  const descriptor = descriptors[blockIndex];
  const trace = traces[blockIndex];
  assert.equal(descriptor.blockIndex, blockIndex);
  assert.equal(descriptor.validated, true);
  assert.equal(descriptor.sourceStart, trace.sourceBitRange.start);
  assert.equal(descriptor.sourceEndExclusive, trace.sourceBitRange.endExclusive);
  assert.equal(descriptor.sourceBitsConsumed, trace.sourceBitRange.consumed);
  assert.equal(descriptor.ciphertextStart, blockIndex * trace.cellCount);
  assert.equal(descriptor.ciphertextEndExclusive, (blockIndex + 1) * trace.cellCount);
  assert.equal(descriptor.totalFillerCells, trace.cellCount - trace.sourceBitRange.consumed);
  assert.equal(descriptor.partialPayloadFillerCells, packageObject.payloadCapacity - trace.sourceBitRange.consumed);
  assert.equal(descriptor.maskFillerCells, trace.cellCount - packageObject.payloadCapacity);
  assert.equal(descriptor.finalPartialBlock, blockIndex === packageObject.blockCount - 1 && trace.sourceBitRange.consumed < packageObject.payloadCapacity);
  if (blockIndex > 0) {
    assert.equal(descriptors[blockIndex - 1].sourceEndExclusive, descriptor.sourceStart, 'Source ranges must be contiguous.');
    assert.equal(descriptors[blockIndex - 1].ciphertextEndExclusive, descriptor.ciphertextStart, 'Ciphertext ranges must be contiguous.');
  }
}

const finalDescriptor = descriptors.at(-1);
assert.equal(finalDescriptor.finalPartialBlock, true);
assert.equal(finalDescriptor.sourceBitsConsumed, 5);
assert.equal(finalDescriptor.partialPayloadFillerCells, 3);
assert.equal(finalDescriptor.maskFillerCells, 8);
assert.equal(finalDescriptor.totalFillerCells, 11);

const sourceOutputIndexes = new Set();
for (let sourceBitIndex = 0; sourceBitIndex < bits.length; sourceBitIndex += 1) {
  const location = locateSourceBit(traces, sourceBitIndex);
  const trace = traces[location.blockIndex];
  assert.ok(sourceBitIndex >= trace.sourceBitRange.start && sourceBitIndex < trace.sourceBitRange.endExclusive);
  assert.equal(trace.sourceBitIndexByPoint[location.pointId], sourceBitIndex);
  assert.equal(trace.inputProjectionPointIds[location.inputCellIndex], location.pointId);
  assert.equal(trace.outputProjectionPointIds[location.outputCellIndex], location.pointId);
  assert.equal(location.ciphertextIndex, location.blockIndex * trace.cellCount + location.outputCellIndex);
  assert.equal(packageObject.ciphertext[location.ciphertextIndex], bits[sourceBitIndex]);
  assert.equal(sourceOutputIndexes.has(location.ciphertextIndex), false, `Source bit ${sourceBitIndex} collided at ciphertext index ${location.ciphertextIndex}.`);
  sourceOutputIndexes.add(location.ciphertextIndex);
}
assert.equal(sourceOutputIndexes.size, bits.length);

for (let ciphertextIndex = 0; ciphertextIndex < packageObject.ciphertext.length; ciphertextIndex += 1) {
  const location = locateCiphertextBit(traces, ciphertextIndex);
  const trace = traces[location.blockIndex];
  assert.equal(location.outputCellIndex, ciphertextIndex % trace.cellCount);
  assert.equal(trace.outputProjectionPointIds[location.outputCellIndex], location.pointId);
  assert.equal(trace.outputBlock[location.outputCellIndex], packageObject.ciphertext[ciphertextIndex]);
  assert.equal(location.sourceBitIndex, trace.sourceBitIndexByPoint[location.pointId]);
  if (location.sourceBitIndex >= 0) assert.equal(bits[location.sourceBitIndex], packageObject.ciphertext[ciphertextIndex]);
}

assert.equal(sequenceBlockIndex(0, 1, 5, false), 1);
assert.equal(sequenceBlockIndex(4, 1, 5, false), null);
assert.equal(sequenceBlockIndex(4, 1, 5, true), 0);
assert.equal(sequenceBlockIndex(0, -1, 5, false), null);
assert.equal(sequenceBlockIndex(0, -1, 5, true), 4);
assert.equal(effectivePlaybackMode('selected-bit', 'all'), 'selected');
assert.equal(effectivePlaybackMode('selected-row', 'all'), 'row');
assert.equal(effectivePlaybackMode('selected-block', 'row'), 'row');
assert.equal(effectivePlaybackMode('all-blocks', 'selected'), 'selected');
assert.equal(effectivePlaybackMode('overview-only', 'selected'), 'all');

for (const selector of [
  'data-cube-encoder-block-timeline',
  'data-cube-encoder-previous-block',
  'data-cube-encoder-next-block',
  'data-cube-encoder-range-inspector',
  'data-cube-encoder-source-jump',
  'data-cube-encoder-ciphertext-jump',
  'data-cube-trace-scope'
]) assert.match(controllerSource, new RegExp(selector), `The V8 controller is missing ${selector}.`);
for (const selector of ['cube-block-timeline', 'cube-block-marker', 'cube-block-range-inspector', 'cube-bit-jump-controls', 'partial-filler']) {
  assert.match(styleSource, new RegExp(`\\.${selector}`), `V8 styling is missing .${selector}.`);
}
assert.equal(controllerSource.includes('Engine.transformBlock'), false, 'V8 must inspect canonical traces rather than reconstruct transformations.');

console.log(JSON.stringify({
  format: 'hb-ttrpg-shadowrun-binary-cube-v8-sequencing-validation-receipt',
  schemaVersion: '0.1.0',
  keyId: key.keyId,
  sourceBitLength: bits.length,
  payloadCapacity: packageObject.payloadCapacity,
  blockCount: packageObject.blockCount,
  ciphertextBitLength: packageObject.ciphertext.length,
  finalPartialBlock: finalDescriptor,
  sourceBitsUniquelyLocated: sourceOutputIndexes.size,
  ciphertextBitsInspected: packageObject.ciphertext.length,
  playbackScopes: Visualizer.constants.PLAYBACK_SCOPES,
  exactPackageStatePreserved: true,
  rendererAlgorithmIsolationPreserved: true
}, null, 2));
