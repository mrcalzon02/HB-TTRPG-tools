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
const controllerSource = fs.readFileSync(path.join(repositoryRoot, 'shadowrun-binary-cube-visualizer.js'), 'utf8');
const rendererSource = fs.readFileSync(path.join(repositoryRoot, 'binary-cube-visualizer-renderer.js'), 'utf8');

const GRID_SIZE = 4;
const CELL_COUNT = GRID_SIZE * GRID_SIZE;
const SERIAL_BIT_DURATION_MS = 1400;
const DEMONSTRATION_SEED = 'binary-cube-demonstration-flat-z-ripple-v1';
const identity = Array.from({ length: GRID_SIZE }, (_, index) => index);
const fullMask = new Array(CELL_COUNT).fill(true);

const baseKey = Engine.createKey({
  gridSize: GRID_SIZE,
  seed: DEMONSTRATION_SEED,
  inputFace: 'top',
  outputFace: 'front',
  inputQuarterTurns: 0,
  outputQuarterTurns: 0,
  maskDensity: 1
});
const key = Engine.validateKey({
  ...baseKey,
  keyId: undefined,
  keyDigestType: undefined,
  keyDigest: undefined,
  seed: DEMONSTRATION_SEED,
  rowPermutation: [...identity],
  columnPermutation: [...identity],
  depthPermutation: [...identity],
  mask: fullMask,
  demonstrationOnly: true,
  demonstrationPattern: 'flat-z-ripple',
  demonstrationFormula: 'z=(x+y) mod gridSize'
});

assert.equal(key.demonstrationOnly, true);
assert.equal(key.demonstrationPattern, 'flat-z-ripple');
assert.equal(key.demonstrationFormula, 'z=(x+y) mod gridSize');
assert.deepEqual(key.rowPermutation, identity);
assert.deepEqual(key.columnPermutation, identity);
assert.deepEqual(key.depthPermutation, identity);
assert.ok(key.mask.every(Boolean));
for (const point of key.pointField || Engine.buildPointField?.(key) || []) {
  assert.equal(point.z, (point.x + point.y) % GRID_SIZE, `Flat Z ripple formula drifted at (${point.x}, ${point.y}, ${point.z}).`);
}

const bits = Array.from({ length: CELL_COUNT }, (_, index) => index % 2 ? '1' : '0').join('');
const trace = Engine.traceEncryptBlock(bits, key, 0);
Engine.validateTransformationTrace(trace, key);
assert.equal(trace.cellCount, CELL_COUNT);
assert.equal(trace.pointField.length, CELL_COUNT);

for (const name of ['serialPlaybackState', 'serialPointTraceTime', 'serialRouteAnchors', 'tweenPointAcrossSerialRoute']) {
  assert.equal(typeof Renderer[name], 'function', `Renderer serial demonstration API is missing ${name}.`);
}

function distance(a, b) {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

function subtract(a, b) {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

function dot(a, b) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function mix(a, b, t) {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

function polylineArcLocation(anchors, position) {
  let totalLength = 0;
  const segmentLengths = [];
  for (let index = 0; index < anchors.length - 1; index += 1) {
    const length = distance(anchors[index], anchors[index + 1]);
    segmentLengths.push(length);
    totalLength += length;
  }
  let traversed = 0;
  let best = { error: Infinity, arc: 0 };
  for (let index = 0; index < segmentLengths.length; index += 1) {
    const start = anchors[index];
    const end = anchors[index + 1];
    const vector = subtract(end, start);
    const lengthSquared = dot(vector, vector);
    const raw = lengthSquared > 0 ? dot(subtract(position, start), vector) / lengthSquared : 0;
    const t = Math.max(0, Math.min(1, raw));
    const projection = mix(start, end, t);
    const error = distance(position, projection);
    if (error < best.error) best = { error, arc: traversed + segmentLengths[index] * t };
    traversed += segmentLengths[index];
  }
  return { ...best, totalLength };
}

const representativeInputIndices = [0, 1, GRID_SIZE - 1, GRID_SIZE, CELL_COUNT - 1];
const serialReceipts = [];
for (const inputCellIndex of representativeInputIndices) {
  const pointId = trace.inputProjectionPointIds[inputCellIndex];
  const anchors = Renderer.serialRouteAnchors(trace, pointId);
  assert.equal(anchors.length, 4, `Serial route for input ${inputCellIndex} must have four exact anchors.`);
  assert.deepEqual(anchors[0], Renderer.pointAnchorPosition(trace, pointId, 3));
  assert.deepEqual(anchors[1], Renderer.pointAnchorPosition(trace, pointId, 4));
  assert.deepEqual(anchors[2], Renderer.pointAnchorPosition(trace, pointId, 7));
  assert.deepEqual(anchors[3], Renderer.pointAnchorPosition(trace, pointId, 9));
  assert.deepEqual(Renderer.tweenPointAcrossSerialRoute(trace, pointId, 0), anchors[0]);
  assert.deepEqual(Renderer.tweenPointAcrossSerialRoute(trace, pointId, 1), anchors[3]);

  let previousArc = -1;
  let maximumStep = 0;
  let previousPosition = null;
  for (let sample = 0; sample <= 100; sample += 1) {
    const progress = sample / 100;
    const position = Renderer.tweenPointAcrossSerialRoute(trace, pointId, progress);
    assert.equal(position.length, 3);
    assert.ok(position.every(Number.isFinite), `Serial route produced a non-finite coordinate at input ${inputCellIndex}, progress ${progress}.`);
    const arc = polylineArcLocation(anchors, position);
    assert.ok(arc.error < 1e-7, `Serial tween left its exact keyed polyline at input ${inputCellIndex}, progress ${progress}.`);
    assert.ok(arc.arc + 1e-9 >= previousArc, `Serial tween moved backward along its keyed route at input ${inputCellIndex}, progress ${progress}.`);
    previousArc = arc.arc;
    if (previousPosition) maximumStep = Math.max(maximumStep, distance(previousPosition, position));
    previousPosition = position;
  }
  const totalRouteLength = polylineArcLocation(anchors, anchors.at(-1)).totalLength;
  assert.ok(maximumStep < totalRouteLength * 0.08, `Serial route contains a visible jump at input ${inputCellIndex}.`);

  const midpointTime = (inputCellIndex + 0.5) / CELL_COUNT;
  const serialState = Renderer.serialPlaybackState(trace, midpointTime);
  assert.equal(serialState.inputCellIndex, inputCellIndex);
  assert.equal(serialState.activePointId, pointId);
  assert.ok(Math.abs(serialState.localTraceTime - 0.5) < 1e-9);
  assert.ok(Math.abs(Renderer.serialPointTraceTime(trace, pointId, midpointTime) - 0.5) < 1e-9);
  if (inputCellIndex > 0) {
    const previousPointId = trace.inputProjectionPointIds[inputCellIndex - 1];
    assert.equal(Renderer.serialPointTraceTime(trace, previousPointId, midpointTime), 1);
  }
  if (inputCellIndex + 1 < CELL_COUNT) {
    const nextPointId = trace.inputProjectionPointIds[inputCellIndex + 1];
    assert.equal(Renderer.serialPointTraceTime(trace, nextPointId, midpointTime), 0);
  }

  serialReceipts.push(Object.freeze({
    inputCellIndex,
    pointId,
    keyedPoint: trace.pointField[pointId],
    outputCellIndex: trace.outputCellIndexByPoint[pointId],
    anchorCount: anchors.length,
    maximumSampleStep: maximumStep
  }));
}

for (let inputCellIndex = 0; inputCellIndex < CELL_COUNT; inputCellIndex += 1) {
  const start = Renderer.serialPlaybackState(trace, inputCellIndex / CELL_COUNT);
  const middle = Renderer.serialPlaybackState(trace, (inputCellIndex + 0.5) / CELL_COUNT);
  assert.equal(start.inputCellIndex, inputCellIndex);
  assert.equal(middle.inputCellIndex, inputCellIndex);
  assert.equal(start.activePointId, trace.inputProjectionPointIds[inputCellIndex]);
  assert.equal(middle.activePointId, trace.inputProjectionPointIds[inputCellIndex]);
}

assert.match(controllerSource, /SERIAL_BIT_DURATION_MS\s*=\s*1400/);
assert.match(controllerSource, /activeTrace\.cellCount\s*\*\s*SERIAL_BIT_DURATION_MS/);
assert.match(controllerSource, /const effectiveSpeed = viewportSerial \? 1 : playbackSpeed/);
assert.match(controllerSource, /1\.4-second-per-bit demonstration/);
assert.match(controllerSource, /DEMONSTRATION ONLY · Flat Z Ripple/);
assert.match(controllerSource, /demonstrationPattern:\s*'flat-z-ripple'/);
assert.match(controllerSource, /demonstrationFormula:\s*'z=\(x\+y\) mod gridSize'/);
assert.match(rendererSource, /SERIAL BIT/);
assert.match(rendererSource, /serialPathVertices/);
assert.match(rendererSource, /\[3, 4, 7, 9\]/);
assert.match(rendererSource, /if \(inputCellIndex < serialState\.inputCellIndex\) return mix\(COLORS\.dim, outputColor, 0\.34\)/);
assert.match(rendererSource, /if \(inputCellIndex > serialState\.inputCellIndex\) return mix\(COLORS\.dim, inputColor, 0\.24\)/);

console.log(JSON.stringify({
  format: 'hb-ttrpg-binary-cube-serial-demonstration-validation-receipt',
  schemaVersion: '0.2.0',
  rendererVersion: Renderer.constants.RENDERER_VERSION,
  gridSize: GRID_SIZE,
  cellCount: CELL_COUNT,
  serialBitDurationMilliseconds: SERIAL_BIT_DURATION_MS,
  serialBlockDurationMilliseconds: CELL_COUNT * SERIAL_BIT_DURATION_MS,
  demonstrationOnly: key.demonstrationOnly,
  demonstrationPattern: key.demonstrationPattern,
  demonstrationFormula: key.demonstrationFormula,
  exactRouteAnchorPhases: [3, 4, 7, 9],
  oneBitAtATime: true,
  smoothMonotonicTweening: true,
  exactKeyedRoute: true,
  playbackSpeedOverrideDisabled: true,
  futureInputContextDimmed: true,
  completedOutputContextDimmed: true,
  activeBitFocusPreserved: true,
  testedRoutes: serialReceipts,
  pass: true
}, null, 2));
