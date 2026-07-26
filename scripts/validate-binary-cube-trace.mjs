#!/usr/bin/env node

import assert from 'node:assert/strict';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, '..');
const Engine = require(path.join(repositoryRoot, 'shadowrun-binary-cube-engine.js'));

const PHASES = Object.freeze([
  'source-ready',
  'block-framed',
  'mask-applied',
  'input-face-staged',
  'point-assignment',
  'point-field-loaded',
  'output-projection-selected',
  'output-face-staged',
  'encrypted-block-emitted',
  'block-complete'
]);

function bitsPattern(length, salt) {
  const source = [...String(salt)].map(character => character.charCodeAt(0).toString(2).padStart(8, '0')).join('');
  return Array.from({ length }, (_, index) => source[index % source.length]).join('');
}

const DEFINITIONS = Object.freeze([
  Object.freeze({ id: 'small-full-single-block', gridSize: 4, seed: 'visualizer-v0-small-full', inputFace: 'top', outputFace: 'front', inputQuarterTurns: 0, outputQuarterTurns: 0, maskDensity: 1, bits: '0100110011010011' }),
  Object.freeze({ id: 'small-sparse-multiblock', gridSize: 4, seed: 'visualizer-v0-small-sparse', inputFace: 'left', outputFace: 'top', inputQuarterTurns: 3, outputQuarterTurns: 1, maskDensity: 0.5, bits: bitsPattern(21, 'sparse') }),
  Object.freeze({ id: 'standard-12-multiblock', gridSize: 12, seed: 'visualizer-v0-standard-12', inputFace: 'back', outputFace: 'right', inputQuarterTurns: 2, outputQuarterTurns: 3, maskDensity: 1, bits: bitsPattern(257, 'standard') }),
  Object.freeze({ id: 'medium-20-sparse', gridSize: 20, seed: 'visualizer-v0-medium-20', inputFace: 'bottom', outputFace: 'left', inputQuarterTurns: 1, outputQuarterTurns: 2, maskDensity: 0.75, bits: bitsPattern(701, 'medium') }),
  Object.freeze({ id: 'large-64-smoke', gridSize: 64, seed: 'visualizer-v0-large-64', inputFace: 'right', outputFace: 'bottom', inputQuarterTurns: 0, outputQuarterTurns: 3, maskDensity: 0.1, bits: bitsPattern(511, 'large') }),
  Object.freeze({ id: 'byte-aligned-file-equivalent', gridSize: 12, seed: 'visualizer-v0-byte-aligned', inputFace: 'front', outputFace: 'top', inputQuarterTurns: 1, outputQuarterTurns: 0, maskDensity: 0.5, bits: [...Buffer.from('CubeV0!!', 'utf8')].map(byte => byte.toString(2).padStart(8, '0')).join('') }),
  Object.freeze({ id: 'non-byte-aligned-manual', gridSize: 4, seed: 'visualizer-v0-non-byte', inputFace: 'top', outputFace: 'left', inputQuarterTurns: 2, outputQuarterTurns: 2, maskDensity: 0.75, bits: '1011010010110' })
]);

function assertTraceStructure(trace, key) {
  const cellCount = key.gridSize * key.gridSize;
  assert.equal(Object.isFrozen(trace), true);
  assert.equal(Object.isFrozen(trace.sourceBitRange), true);
  assert.equal(Object.isFrozen(trace.pointField), true);
  assert.equal(Object.isFrozen(trace.pointField[0]), true);
  assert.equal(Object.isFrozen(trace.phases), true);
  assert.equal(Object.isFrozen(trace.phases[0]), true);
  assert.deepEqual(trace.phases.map(phase => phase.id), PHASES);
  assert.equal(trace.pointField.length, cellCount);
  assert.equal(trace.inputProjectionPointIds.length, cellCount);
  assert.equal(trace.outputProjectionPointIds.length, cellCount);
  assert.equal(trace.inputCellIndexByPoint.length, cellCount);
  assert.equal(trace.outputCellIndexByPoint.length, cellCount);
  assert.equal(trace.bitByPoint.length, cellCount);
  assert.equal(trace.sourceBitIndexByPoint.length, cellCount);
  assert.equal(trace.cellKindByPoint.length, cellCount);

  for (let pointId = 0; pointId < cellCount; pointId += 1) {
    const point = trace.pointField[pointId];
    const inputCellIndex = trace.inputCellIndexByPoint[pointId];
    const outputCellIndex = trace.outputCellIndexByPoint[pointId];
    assert.equal(point.id, pointId);
    assert.equal(point.z, Engine.pointDepth(key, point.x, point.y));
    assert.equal(trace.bitByPoint[pointId], trace.framedBlock[inputCellIndex]);
    assert.equal(trace.outputBlock[outputCellIndex], trace.bitByPoint[pointId]);
    assert.equal(trace.sourceBitIndexByPoint[pointId], trace.sourceBitIndexByInputCell[inputCellIndex]);
    assert.equal(trace.cellKindByPoint[pointId], trace.sourceBitIndexByPoint[pointId] >= 0 ? 'payload' : 'filler');
  }
}

let traceCount = 0;
let serializedTraceCount = 0;
let tamperCases = 0;
let firstSerializedTrace = null;
let firstKey = null;

for (const definition of DEFINITIONS) {
  const key = Engine.createKey(definition);
  const packageObject = Engine.encryptBinary(definition.bits, key);
  const cellCount = key.gridSize * key.gridSize;

  for (let blockIndex = 0; blockIndex < packageObject.blockCount; blockIndex += 1) {
    const trace = Engine.traceEncryptBlock(definition.bits, key, blockIndex);
    const expectedOutput = packageObject.ciphertext.slice(blockIndex * cellCount, (blockIndex + 1) * cellCount);
    assert.equal(trace.outputBlock, expectedOutput, `${definition.id} block ${blockIndex} output drifted.`);
    assert.equal(trace.keyId, key.keyId);
    assert.equal(trace.blockIndex, blockIndex);
    assert.equal(trace.sourceBitRange.consumed, trace.sourceBits.length);
    assertTraceStructure(trace, key);

    const validation = Engine.validateTransformationTrace(trace, key);
    assert.equal(validation.valid, true);
    assert.equal(validation.outputBlock, expectedOutput);
    assert.equal(validation.sourceBitCount, trace.sourceBits.length);

    const serialized = JSON.parse(JSON.stringify(trace));
    assert.equal(Engine.validateTransformationTrace(serialized, key).valid, true);
    serializedTraceCount += 1;
    traceCount += 1;

    if (!firstSerializedTrace) {
      firstSerializedTrace = serialized;
      firstKey = key;
    }
  }
}

const flip = bit => bit === '1' ? '0' : '1';
const tamperedOutput = {
  ...firstSerializedTrace,
  outputBlock: `${flip(firstSerializedTrace.outputBlock[0])}${firstSerializedTrace.outputBlock.slice(1)}`
};
assert.throws(() => Engine.validateTransformationTrace(tamperedOutput, firstKey), /output/i);
tamperCases += 1;

const tamperedSourceMapping = JSON.parse(JSON.stringify(firstSerializedTrace));
tamperedSourceMapping.sourceBitIndexByInputCell[0] = firstSerializedTrace.sourceBitRange.endExclusive + 1;
assert.throws(() => Engine.validateTransformationTrace(tamperedSourceMapping, firstKey), /source-bit index|source mapping/i);
tamperCases += 1;

const tamperedPoint = JSON.parse(JSON.stringify(firstSerializedTrace));
tamperedPoint.pointField[0].z = (tamperedPoint.pointField[0].z + 1) % firstKey.gridSize;
assert.throws(() => Engine.validateTransformationTrace(tamperedPoint, firstKey), /point field/i);
tamperCases += 1;

const tamperedPhase = JSON.parse(JSON.stringify(firstSerializedTrace));
tamperedPhase.phases[0].id = 'invented-phase';
assert.throws(() => Engine.validateTransformationTrace(tamperedPhase, firstKey), /phase sequence/i);
tamperCases += 1;

const wrongKey = Engine.createKey({
  gridSize: firstKey.gridSize,
  seed: 'visualizer-v2-wrong-trace-key',
  inputFace: firstKey.inputFace,
  outputFace: firstKey.outputFace,
  inputQuarterTurns: firstKey.inputQuarterTurns,
  outputQuarterTurns: firstKey.outputQuarterTurns,
  maskDensity: 1
});
assert.throws(() => Engine.validateTransformationTrace(firstSerializedTrace, wrongKey), /different key/i);
tamperCases += 1;

console.log(JSON.stringify({
  format: 'hb-ttrpg-shadowrun-binary-cube-v2-trace-validation-receipt',
  schemaVersion: '0.1.0',
  traceFormat: Engine.constants.TRACE_FORMAT,
  traceSchemaVersion: Engine.constants.TRACE_SCHEMA_VERSION,
  vectorCount: DEFINITIONS.length,
  traceCount,
  serializedTraceCount,
  phaseCount: PHASES.length,
  tamperCases,
  canonicalOutputMatch: true,
  immutableTrace: true,
  serializedTraceValid: true
}, null, 2));
