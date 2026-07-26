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
const entrySource = fs.readFileSync(path.join(repositoryRoot, 'shadowrun-entry.js'), 'utf8');
const styleSource = fs.readFileSync(path.join(repositoryRoot, 'binary-cube-visualizer.css'), 'utf8');

assert.equal(typeof Renderer.createRenderer, 'function');
assert.equal(typeof Renderer.normalizePointCoordinates, 'function');
assert.equal(Renderer.constants.RENDERER_VERSION, '0.2.0');
assert.equal(typeof Renderer.rayBoxFace, 'function');

const gridSizes = [4, 12, 64];
const receipts = [];
for (const gridSize of gridSizes) {
  const key = Engine.createKey({
    gridSize,
    seed: `visualizer-v3-shell-${gridSize}`,
    inputFace: 'top',
    outputFace: 'front',
    inputQuarterTurns: 0,
    outputQuarterTurns: 0,
    maskDensity: 1
  });
  const points = Engine.buildPoints(key);
  assert.equal(points.length, gridSize * gridSize);

  const normalized = points.map(point => Renderer.normalizePointCoordinates(point, gridSize));
  assert.equal(normalized.every(Object.isFrozen), true, `${gridSize} normalized coordinates must be immutable.`);
  assert.equal(normalized.every(position => position.length === 3 && position.every(value => value >= -1 && value <= 1)), true);
  assert.equal(new Set(normalized.map(position => position.join('|'))).size, points.length, `${gridSize} scene points must remain unique.`);

  for (let axis = 0; axis < 3; axis += 1) {
    const values = normalized.map(position => position[axis]);
    assert.equal(Math.min(...values), -1, `${gridSize} axis ${axis} must reach the negative cube boundary.`);
    assert.equal(Math.max(...values), 1, `${gridSize} axis ${axis} must reach the positive cube boundary.`);
  }

  for (let pointId = 0; pointId < points.length; pointId += 1) {
    const point = points[pointId];
    assert.equal(point.id, pointId);
    assert.equal(point.z, Engine.pointDepth(key, point.x, point.y));
  }

  receipts.push(Object.freeze({ gridSize, keyId: key.keyId, pointCount: points.length }));
}

const faceRays = [
  [[0, 0, 4], [0, 0, -1], 'front'],
  [[0, 0, -4], [0, 0, 1], 'back'],
  [[4, 0, 0], [-1, 0, 0], 'right'],
  [[-4, 0, 0], [1, 0, 0], 'left'],
  [[0, 4, 0], [0, -1, 0], 'top'],
  [[0, -4, 0], [0, 1, 0], 'bottom']
];
for (const [origin, direction, expectedFace] of faceRays) {
  assert.equal(Renderer.rayBoxFace(origin, direction), expectedFace, `${expectedFace} face picking changed.`);
}
assert.equal(Renderer.rayBoxFace([4, 4, 4], [1, 0, 0]), null, 'A ray pointing away from the cube must miss.');

for (const forbidden of ['ShadowrunBinaryCubeEngine', 'encryptBinary', 'decryptBinary', 'traceEncryptBlock', 'transformBlock']) {
  assert.equal(rendererSource.includes(forbidden), false, `Renderer must not contain canonical engine operation ${forbidden}.`);
}
assert.match(rendererSource, /getContext\('webgl2'/);
assert.match(rendererSource, /gl\.drawArrays\(gl\.POINTS/);
assert.match(rendererSource, /gl\.drawArrays\(gl\.LINES/);
assert.match(rendererSource, /ResizeObserver/);
assert.match(rendererSource, /pointerdown/);
assert.match(rendererSource, /wheel/);
assert.match(rendererSource, /setDirectionState/);
assert.match(rendererSource, /pickFaceAt/);
assert.match(rendererSource, /gl\.drawArrays\(gl\.TRIANGLES/);
for (const preset of ['front', 'back', 'left', 'right', 'top', 'bottom', 'perspective']) {
  assert.match(rendererSource, new RegExp(`${preset}:`), `Renderer is missing the ${preset} camera preset.`);
}

assert.match(controllerSource, /Engine\.validateKey/);
assert.match(controllerSource, /Engine\.createKey/);
assert.match(controllerSource, /Engine\.buildPoints/);
assert.match(controllerSource, /renderer\.setScene/);
assert.equal(controllerSource.includes('Engine.encryptBinary'), false, 'V3 controller must not calculate encryption.');
assert.equal(controllerSource.includes('Engine.transformBlock'), false, 'V3 controller must not calculate block transformations.');
assert.match(controllerSource, /MAX_STATIC_GRID_SIZE = 64/);
assert.match(controllerSource, /WebGL renderer/);
assert.match(controllerSource, /Camera movement changes only the view/);
assert.match(controllerSource, /Engine\.legalOutputFaces/);
assert.match(controllerSource, /onFaceClick/);
assert.match(controllerSource, /Generate Canonical Draft Key/);
assert.match(controllerSource, /imported key is never silently mutated/i);

for (const asset of ['binary-cube-visualizer.css', 'binary-cube-visualizer-renderer.js', 'shadowrun-binary-cube-visualizer.js']) {
  assert.match(entrySource, new RegExp(asset.replaceAll('.', '\\.')));
}
assert.match(entrySource, /shadowrun-binary-cube-visualizer/);
assert.match(entrySource, /Open Visualizer/);
assert.match(entrySource, /loadCubeVisualizer/);
assert.match(entrySource, /loadStyle/);

for (const selector of ['cube-visualizer-canvas', 'cube-visualizer-label-layer', 'cube-visualizer-face-label', 'cube-visualizer-direction-label', 'cube-visualizer-fallback']) {
  assert.match(styleSource, new RegExp(`\\.${selector}`));
}
assert.match(styleSource, /@media \(max-width:900px\)/);
assert.match(styleSource, /touch-action:none/);

console.log(JSON.stringify({
  format: 'hb-ttrpg-shadowrun-binary-cube-v4-shell-validation-receipt',
  schemaVersion: '0.1.0',
  rendererVersion: Renderer.constants.RENDERER_VERSION,
  rendererAuthority: 'binary-cube-visualizer-renderer.js',
  controllerAuthority: 'shadowrun-binary-cube-visualizer.js',
  detailedGridLimit: 64,
  testedScenes: receipts,
  exactCanonicalPoints: true,
  rendererAlgorithmIsolation: true,
  cameraPresets: 7,
  responsiveFallbackPresent: true,
  directionalArrowsPresent: true,
  directFacePickingPresent: true,
  legalPairEnforcementPresent: true,
  animationPresent: false
}, null, 2));
