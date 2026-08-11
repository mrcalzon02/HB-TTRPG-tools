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

assert.match(rendererSource, /const translationPoint = serialState \? pointAnchorPosition\(trace, highlightedPointId, 4\) : null/);
assert.match(rendererSource, /new Float32Array\(\[\.\.\.highlightedPosition, \.\.\.COLORS\.selected, \.\.\.translationPoint, \.\.\.COLORS\.path\]\)/);
assert.match(rendererSource, /this\.selectedPointCount = serialState \? 2 : 1/);

const key = Engine.createKey({
  gridSize: 4,
  seed: 'serial-translation-marker-contract',
  inputFace: 'top',
  outputFace: 'front',
  inputQuarterTurns: 0,
  outputQuarterTurns: 0,
  maskDensity: 1
});
const trace = Engine.traceEncryptBlock('0100110011010011', key, 0);
Engine.validateTransformationTrace(trace, key);

const inputCellIndex = 5;
const pointId = trace.inputProjectionPointIds[inputCellIndex];
const keyedTranslationPoint = Renderer.pointAnchorPosition(trace, pointId, 4);
const routeAnchors = Renderer.serialRouteAnchors(trace, pointId);
assert.deepEqual(routeAnchors[1], keyedTranslationPoint, 'The stationary marker must target the same keyed interior coordinate traversed by the moving bit.');
assert.notDeepEqual(keyedTranslationPoint, routeAnchors[0], 'The translation marker collapsed onto the input face.');
assert.notDeepEqual(keyedTranslationPoint, routeAnchors[2], 'The translation marker collapsed onto the output face.');

console.log(JSON.stringify({
  format: 'hb-ttrpg-binary-cube-serial-translation-marker-validation-receipt',
  schemaVersion: '0.1.0',
  pass: true,
  rendererVersion: Renderer.constants.RENDERER_VERSION,
  inputCellIndex,
  pointId,
  keyedTranslationPoint,
  movingBitMarkerCount: 1,
  stationaryTranslationMarkerCount: 1,
  stationaryMarkerUsesExactRouteAnchor: true,
  markerVisibleOnlyDuringSerialPlayback: true
}, null, 2));
