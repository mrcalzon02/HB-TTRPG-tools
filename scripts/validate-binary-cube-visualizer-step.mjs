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

const rendererSource = fs.readFileSync(path.join(repositoryRoot, 'binary-cube-visualizer-renderer.js'), 'utf8');
const controllerSource = fs.readFileSync(path.join(repositoryRoot, 'shadowrun-binary-cube-visualizer.js'), 'utf8');
const styleSource = fs.readFileSync(path.join(repositoryRoot, 'binary-cube-visualizer.css'), 'utf8');

assert.equal(Renderer.constants.RENDERER_VERSION, '0.3.0');
assert.equal(typeof Engine.traceEncryptBlock, 'function');
assert.equal(typeof Engine.validateTransformationTrace, 'function');

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

const definitions = Object.freeze([
  Object.freeze({
    id: 'v5-full-4',
    gridSize: 4,
    seed: 'binary-cube-v5-full',
    inputFace: 'top',
    outputFace: 'front',
    inputQuarterTurns: 0,
    outputQuarterTurns: 0,
    maskDensity: 1,
    bits: '0100110011010011'
  }),
  Object.freeze({
    id: 'v5-sparse-4',
    gridSize: 4,
    seed: 'binary-cube-v5-sparse',
    inputFace: 'left',
    outputFace: 'top',
    inputQuarterTurns: 3,
    outputQuarterTurns: 1,
    maskDensity: 0.5,
    bits: '101101001011010010101'
  }),
  Object.freeze({
    id: 'v5-full-12',
    gridSize: 12,
    seed: 'binary-cube-v5-standard',
    inputFace: 'back',
    outputFace: 'right',
    inputQuarterTurns: 2,
    outputQuarterTurns: 3,
    maskDensity: 1,
    bits: Array.from({ length: 144 }, (_, index) => index % 3 === 0 ? '1' : '0').join('')
  })
]);

const receipts = [];
for (const definition of definitions) {
  const key = Engine.createKey(definition);
  const trace = Engine.traceEncryptBlock(definition.bits, key, 0);
  const validation = Engine.validateTransformationTrace(trace, key);
  const packageObject = Engine.encryptBinary(definition.bits, key);
  const expectedOutput = packageObject.ciphertext.slice(0, key.gridSize * key.gridSize);

  assert.equal(validation.valid, true);
  assert.equal(trace.outputBlock, expectedOutput, `${definition.id} trace output changed.`);
  assert.deepEqual(trace.phases.map(phase => phase.id), PHASES);
  assert.equal(trace.pointField.length, trace.cellCount);
  assert.equal(trace.inputProjectionPointIds.length, trace.cellCount);
  assert.equal(trace.outputProjectionPointIds.length, trace.cellCount);

  let payloadPointCount = 0;
  let fillerPointCount = 0;
  for (let pointId = 0; pointId < trace.cellCount; pointId += 1) {
    const inputIndex = trace.inputCellIndexByPoint[pointId];
    const outputIndex = trace.outputCellIndexByPoint[pointId];
    const point = trace.pointField[pointId];
    assert.equal(trace.inputProjectionPointIds[inputIndex], pointId, `${definition.id} input inverse mapping changed at point ${pointId}.`);
    assert.equal(trace.outputProjectionPointIds[outputIndex], pointId, `${definition.id} output inverse mapping changed at point ${pointId}.`);
    assert.equal(trace.framedBlock[inputIndex], trace.bitByPoint[pointId], `${definition.id} framed point bit changed at point ${pointId}.`);
    assert.equal(trace.outputBlock[outputIndex], trace.bitByPoint[pointId], `${definition.id} output point bit changed at point ${pointId}.`);
    assert.equal(point.z, Engine.pointDepth(key, point.x, point.y), `${definition.id} point depth changed at point ${pointId}.`);
    if (trace.cellKindByPoint[pointId] === 'payload') {
      payloadPointCount += 1;
      assert.ok(trace.sourceBitIndexByPoint[pointId] >= trace.sourceBitRange.start);
      assert.ok(trace.sourceBitIndexByPoint[pointId] < trace.sourceBitRange.endExclusive);
    } else {
      fillerPointCount += 1;
      assert.equal(trace.sourceBitIndexByPoint[pointId], -1);
    }
  }

  assert.equal(payloadPointCount, trace.sourceBitRange.consumed);
  assert.equal(payloadPointCount + fillerPointCount, trace.cellCount);
  receipts.push(Object.freeze({
    id: definition.id,
    keyId: key.keyId,
    gridSize: key.gridSize,
    cellCount: trace.cellCount,
    sourceBitsConsumed: trace.sourceBitRange.consumed,
    payloadPoints: payloadPointCount,
    fillerPoints: fillerPointCount,
    outputBlock: trace.outputBlock
  }));
}

for (const forbidden of ['ShadowrunBinaryCubeEngine', 'encryptBinary', 'decryptBinary', 'traceEncryptBlock', 'transformBlock']) {
  assert.equal(rendererSource.includes(forbidden), false, `Renderer must not contain canonical engine operation ${forbidden}.`);
}
assert.match(rendererSource, /setTraceState/);
assert.match(rendererSource, /clearTraceState/);
assert.match(rendererSource, /getTraceState/);
assert.match(rendererSource, /selectedPointBuffer/);
assert.match(rendererSource, /phaseIndex < 4/);
assert.match(rendererSource, /phaseIndex < 6/);

assert.match(controllerSource, /Engine\.traceEncryptBlock/);
assert.match(controllerSource, /Engine\.validateTransformationTrace/);
assert.equal(controllerSource.includes('Engine.transformBlock'), false, 'The V5 controller must not reconstruct a block transformation.');
assert.match(controllerSource, /MAX_MANUAL_TRACE_GRID_SIZE = 12/);
assert.match(controllerSource, /data-cube-trace-first/);
assert.match(controllerSource, /data-cube-trace-previous/);
assert.match(controllerSource, /data-cube-trace-next/);
assert.match(controllerSource, /data-cube-trace-last/);
assert.match(controllerSource, /data-cube-trace-restart/);
assert.match(controllerSource, /selectedSourceBitIndex/);
assert.match(controllerSource, /selectedInputCellIndex/);
assert.match(controllerSource, /selectedOutputCellIndex/);
assert.match(controllerSource, /selectedFinalOutputIndex/);
assert.match(controllerSource, /selectedFinalBit/);

for (const selector of [
  'cube-trace-panel',
  'cube-trace-phase-bar',
  'cube-trace-counters',
  'cube-trace-stage',
  'cube-trace-cell',
  'cube-trace-inspector-panel',
  'cube-visualizer-phase-label'
]) {
  assert.match(styleSource, new RegExp(`\\.${selector}`), `V5 styling is missing .${selector}.`);
}

console.log(JSON.stringify({
  format: 'hb-ttrpg-shadowrun-binary-cube-v5-step-validation-receipt',
  schemaVersion: '0.1.0',
  rendererVersion: Renderer.constants.RENDERER_VERSION,
  phaseCount: PHASES.length,
  detailedTraceGridLimit: 12,
  testedTraces: receipts,
  exactSourcePointOutputMapping: true,
  exactCanonicalOutput: true,
  rendererAlgorithmIsolation: true,
  deterministicManualControlsPresent: true,
  pointInspectorPresent: true,
  interpolationPresent: false
}, null, 2));
