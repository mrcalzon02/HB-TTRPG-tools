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

assert.equal(Renderer.constants.RENDERER_VERSION, '0.6.0');
assert.deepEqual(Renderer.constants.PLAYBACK_MODES, ['all', 'selected', 'row']);
assert.equal(typeof Renderer.resolveTraceTimeline, 'function');
assert.equal(typeof Renderer.pointAnchorPosition, 'function');
assert.equal(typeof Renderer.tracePointPosition, 'function');

const definitions = Object.freeze([
  Object.freeze({ id: 'v6-full-4', gridSize: 4, seed: 'binary-cube-v6-full', inputFace: 'top', outputFace: 'front', inputQuarterTurns: 0, outputQuarterTurns: 0, maskDensity: 1, bits: '0100110011010011' }),
  Object.freeze({ id: 'v6-sparse-4', gridSize: 4, seed: 'binary-cube-v6-sparse', inputFace: 'left', outputFace: 'top', inputQuarterTurns: 3, outputQuarterTurns: 1, maskDensity: 0.5, bits: '101101001011010010101' }),
  Object.freeze({ id: 'v6-full-12', gridSize: 12, seed: 'binary-cube-v6-standard', inputFace: 'back', outputFace: 'right', inputQuarterTurns: 2, outputQuarterTurns: 3, maskDensity: 1, bits: Array.from({ length: 144 }, (_, index) => index % 3 === 0 ? '1' : '0').join('') })
]);

const sampledTimes = Object.freeze([0, 0.03, 0.125, 0.25, 0.38, 0.5, 0.625, 0.76, 0.9, 1]);
const receipts = [];

for (const definition of definitions) {
  const key = Engine.createKey(definition);
  const trace = Engine.traceEncryptBlock(definition.bits, key, 0);
  Engine.validateTransformationTrace(trace, key);
  const packageObject = Engine.encryptBinary(definition.bits, key);
  assert.equal(trace.outputBlock, packageObject.ciphertext.slice(0, trace.cellCount), `${definition.id} canonical output changed.`);
  assert.deepEqual(trace.phases.map(phase => phase.id), PHASES);

  const payloadPoint = trace.sourceBitIndexByPoint.findIndex(value => value >= 0);
  const selectedPoint = payloadPoint >= 0 ? payloadPoint : 0;
  const pointIds = [...new Set([0, selectedPoint, trace.cellCount - 1])];

  for (let phaseIndex = 0; phaseIndex < trace.phases.length; phaseIndex += 1) {
    const boundaryTime = phaseIndex / (trace.phases.length - 1);
    const timeline = Renderer.resolveTraceTimeline(boundaryTime, trace.phases.length);
    assert.equal(timeline.phaseIndex, phaseIndex);
    for (const pointId of pointIds) {
      assert.deepEqual(
        Renderer.tracePointPosition(trace, pointId, boundaryTime, selectedPoint, 'all'),
        Renderer.pointAnchorPosition(trace, pointId, phaseIndex),
        `${definition.id} phase ${phaseIndex} point ${pointId} boundary drifted.`
      );
    }
  }

  for (const playbackMode of Renderer.constants.PLAYBACK_MODES) {
    for (const time of sampledTimes) {
      const timeline = Renderer.resolveTraceTimeline(time, trace.phases.length);
      assert.ok(timeline.phaseIndex >= 0 && timeline.phaseIndex < trace.phases.length);
      assert.ok(timeline.nextPhaseIndex >= timeline.phaseIndex && timeline.nextPhaseIndex < trace.phases.length);
      assert.ok(timeline.segmentProgress >= 0 && timeline.segmentProgress <= 1);
      for (const pointId of pointIds) {
        const position = Renderer.tracePointPosition(trace, pointId, time, selectedPoint, playbackMode);
        assert.equal(position.length, 3);
        assert.ok(position.every(Number.isFinite), `${definition.id} ${playbackMode} point ${pointId} produced a non-finite coordinate.`);
        assert.deepEqual(position, Renderer.tracePointPosition(trace, pointId, time, selectedPoint, playbackMode), `${definition.id} ${playbackMode} point ${pointId} was not deterministic.`);
      }
    }
  }

  const movingTime = 0.38;
  const movingTimeline = Renderer.resolveTraceTimeline(movingTime, trace.phases.length);
  const selectedPosition = Renderer.tracePointPosition(trace, selectedPoint, movingTime, selectedPoint, 'selected');
  assert.notDeepEqual(selectedPosition, Renderer.pointAnchorPosition(trace, selectedPoint, movingTimeline.phaseIndex), `${definition.id} selected point did not move.`);

  const unselectedPoint = pointIds.find(pointId => pointId !== selectedPoint) ?? ((selectedPoint + 1) % trace.cellCount);
  assert.deepEqual(
    Renderer.tracePointPosition(trace, unselectedPoint, movingTime, selectedPoint, 'selected'),
    Renderer.pointAnchorPosition(trace, unselectedPoint, movingTimeline.phaseIndex),
    `${definition.id} selected-only mode moved an unselected point.`
  );

  const selectedInputRow = Math.floor(trace.inputCellIndexByPoint[selectedPoint] / trace.gridSize);
  const sameRowPoint = trace.inputCellIndexByPoint.findIndex((inputIndex, pointId) => pointId !== selectedPoint && Math.floor(inputIndex / trace.gridSize) === selectedInputRow);
  const differentRowPoint = trace.inputCellIndexByPoint.findIndex(inputIndex => Math.floor(inputIndex / trace.gridSize) !== selectedInputRow);
  if (sameRowPoint >= 0) {
    assert.notDeepEqual(
      Renderer.tracePointPosition(trace, sameRowPoint, movingTime, selectedPoint, 'row'),
      Renderer.pointAnchorPosition(trace, sameRowPoint, movingTimeline.phaseIndex),
      `${definition.id} row mode did not move the selected input row.`
    );
  }
  if (differentRowPoint >= 0) {
    assert.deepEqual(
      Renderer.tracePointPosition(trace, differentRowPoint, movingTime, selectedPoint, 'row'),
      Renderer.pointAnchorPosition(trace, differentRowPoint, movingTimeline.phaseIndex),
      `${definition.id} row mode moved a point outside the selected input row.`
    );
  }

  const sourceAnchor = Renderer.pointAnchorPosition(trace, selectedPoint, 0);
  const inputAnchor = Renderer.pointAnchorPosition(trace, selectedPoint, 3);
  const pointAnchor = Renderer.pointAnchorPosition(trace, selectedPoint, 4);
  const outputAnchor = Renderer.pointAnchorPosition(trace, selectedPoint, 7);
  const finalAnchor = Renderer.pointAnchorPosition(trace, selectedPoint, 9);
  assert.notDeepEqual(sourceAnchor, inputAnchor);
  assert.notDeepEqual(inputAnchor, pointAnchor);
  assert.notDeepEqual(pointAnchor, outputAnchor);
  assert.notDeepEqual(outputAnchor, finalAnchor);

  const replayTime = 0.463;
  const firstReplayPosition = Renderer.tracePointPosition(trace, selectedPoint, replayTime, selectedPoint, 'all');
  for (const time of [0.8, 0.2, 1, 0, 0.61]) Renderer.tracePointPosition(trace, selectedPoint, time, selectedPoint, 'all');
  assert.deepEqual(Renderer.tracePointPosition(trace, selectedPoint, replayTime, selectedPoint, 'all'), firstReplayPosition, `${definition.id} accumulated animation drift.`);

  receipts.push(Object.freeze({
    id: definition.id,
    keyId: key.keyId,
    gridSize: key.gridSize,
    cellCount: trace.cellCount,
    selectedPoint,
    outputBlock: trace.outputBlock,
    sampledTimes: sampledTimes.length,
    playbackModes: Renderer.constants.PLAYBACK_MODES.length
  }));
}

for (const forbidden of ['ShadowrunBinaryCubeEngine', 'encryptBinary', 'decryptBinary', 'traceEncryptBlock', 'transformBlock']) {
  assert.equal(rendererSource.includes(forbidden), false, `Renderer must not contain canonical engine operation ${forbidden}.`);
}
assert.match(rendererSource, /setTraceTimelineState/);
assert.match(rendererSource, /resolveTraceTimeline/);
assert.match(rendererSource, /tracePointPosition/);
assert.match(rendererSource, /selectedPathBuffer/);
assert.match(rendererSource, /gl\.LINE_STRIP/);

assert.match(controllerSource, /requestAnimationFrame/);
assert.match(controllerSource, /cancelAnimationFrame/);
assert.match(controllerSource, /PLAYBACK_DURATION_MS = 18000/);
assert.match(controllerSource, /data-cube-trace-play/);
assert.match(controllerSource, /data-cube-trace-reverse-play/);
assert.match(controllerSource, /data-cube-trace-pause/);
assert.match(controllerSource, /data-cube-trace-timeline/);
assert.match(controllerSource, /data-cube-trace-speed/);
assert.match(controllerSource, /data-cube-trace-mode/);
assert.match(controllerSource, /data-cube-trace-markers/);
assert.equal(controllerSource.includes('Engine.transformBlock'), false, 'The V6 controller must not reconstruct block transformations.');

for (const selector of ['cube-trace-timeline', 'cube-trace-markers', 'cube-trace-marker', 'cube-trace-playback-options', 'motion-muted', 'cohort']) {
  assert.match(styleSource, new RegExp(`\\.${selector}`), `V6 styling is missing .${selector}.`);
}

console.log(JSON.stringify({
  format: 'hb-ttrpg-shadowrun-binary-cube-v6-animation-validation-receipt',
  schemaVersion: '0.1.0',
  rendererVersion: Renderer.constants.RENDERER_VERSION,
  phaseCount: PHASES.length,
  playbackDurationMilliseconds: 18000,
  playbackSpeeds: [0.25, 0.5, 1, 2],
  playbackModes: Renderer.constants.PLAYBACK_MODES,
  testedTraces: receipts,
  exactCanonicalOutput: true,
  phaseBoundaryExactness: true,
  forwardReverseDeterminism: true,
  cumulativeDrift: false,
  stablePauseModel: true,
  rendererAlgorithmIsolation: true
}, null, 2));
