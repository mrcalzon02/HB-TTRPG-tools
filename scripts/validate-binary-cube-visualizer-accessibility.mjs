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
const rendererSource = fs.readFileSync(path.join(repositoryRoot, 'binary-cube-visualizer-renderer.js'), 'utf8');
const styleSource = fs.readFileSync(path.join(repositoryRoot, 'binary-cube-visualizer.css'), 'utf8');
const entrySource = fs.readFileSync(path.join(repositoryRoot, 'shadowrun-entry.js'), 'utf8');
const checklistSource = fs.readFileSync(path.join(repositoryRoot, 'docs/binary-cube-v10-accessibility-checklist.md'), 'utf8');

assert.equal(Renderer.constants.RENDERER_VERSION, '0.5.0');
assert.deepEqual(Visualizer.constants.DISPLAY_MODES, ['auto', '3d', '2d']);
assert.equal(typeof Visualizer.utilities.resolvePresentedTraceTime, 'function');
assert.equal(typeof Visualizer.utilities.traceTranscriptEntries, 'function');
assert.equal(typeof Visualizer.utilities.twoDimensionalTraceMap, 'function');

assert.equal(Visualizer.utilities.resolvePresentedTraceTime(0.38, 10, false), 0.38);
assert.equal(Visualizer.utilities.resolvePresentedTraceTime(0.38, 10, true), 3 / 9);
assert.equal(Visualizer.utilities.resolvePresentedTraceTime(1, 10, true), 1);

const key = Engine.createKey({
  gridSize: 4,
  seed: 'binary-cube-v10-accessibility',
  inputFace: 'top',
  outputFace: 'front',
  inputQuarterTurns: 0,
  outputQuarterTurns: 1,
  maskDensity: 0.75
});
const bits = '01001100110100110101';
const packageObject = Engine.encryptBinary(bits, key);
const trace = Engine.traceEncryptBlock(bits, key, 0);
Engine.validateTransformationTrace(trace, key);
assert.equal(trace.outputBlock, packageObject.ciphertext.slice(0, trace.cellCount));

const transcript = Visualizer.utilities.traceTranscriptEntries(trace, 3, 4);
assert.equal(transcript.length, 10);
assert.equal(transcript.filter(entry => entry.state === 'active').length, 1);
assert.equal(transcript[4].state, 'active');
assert.match(transcript[4].selectedSummary, /Selected point P3/);
assert.equal(Object.isFrozen(transcript), true);
assert.equal(transcript.every(Object.isFrozen), true);

const fallbackMap = Visualizer.utilities.twoDimensionalTraceMap(trace, 3);
assert.equal(fallbackMap.gridSize, 4);
assert.equal(fallbackMap.inputCells.length, 16);
assert.equal(fallbackMap.outputCells.length, 16);
assert.equal(fallbackMap.inputCells.filter(cell => cell.selected).length, 1);
assert.equal(fallbackMap.outputCells.filter(cell => cell.selected).length, 1);
assert.equal(fallbackMap.selected.pointId, 3);
assert.equal(fallbackMap.inputCells[fallbackMap.selected.inputCellIndex].pointId, 3);
assert.equal(fallbackMap.outputCells[fallbackMap.selected.outputCellIndex].pointId, 3);
assert.equal(fallbackMap.selected.packageOutputIndex, fallbackMap.selected.outputCellIndex);
assert.equal(fallbackMap.selected.bit, trace.bitByPoint[3]);

for (const token of [
  'prefers-reduced-motion: reduce',
  'data-cube-visualizer-reduced-motion',
  'data-cube-visualizer-display-mode',
  'data-cube-accessibility-live',
  'data-cube-trace-transcript',
  'data-cube-visualizer-2d',
  'handleKeyboardShortcut',
  'KEYBOARD_FACE_KEYS',
  'KEYBOARD_CAMERA_KEYS',
  'aria-valuetext',
  'resolvePresentedTraceTime',
  'traceTranscriptEntries',
  'twoDimensionalTraceMap',
  'rendererAvailable',
  'effectiveDisplayMode'
]) assert.match(controllerSource, new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));

for (const shortcut of ['KeyI', 'KeyO', 'Space', 'ArrowLeft', 'ArrowRight', 'Home', 'End', 'PageUp', 'PageDown', 'BracketLeft', 'BracketRight', 'KeyR', 'KeyD']) {
  assert.match(controllerSource, new RegExp(`case '${shortcut}'`));
}

assert.match(controllerSource, /role="status" aria-live="polite" aria-atomic="true"/);
assert.match(controllerSource, /data-state-symbol="\$\{token\}"/);
assert.match(controllerSource, /WebGL 3D is unavailable/);
assert.equal(/catch \(error\)[\s\S]{0,600}throw error;/.test(controllerSource.slice(controllerSource.indexOf('function installRenderer'), controllerSource.indexOf('async function importPlainFile'))), false, 'Renderer initialization failure must not abort the V10 2D fallback.');
assert.equal(controllerSource.includes('Engine.transformBlock'), false);
for (const forbidden of ['ShadowrunBinaryCubeEngine', 'encryptBinary', 'decryptBinary', 'traceEncryptBlock', 'transformBlock']) {
  assert.equal(rendererSource.includes(forbidden), false, `Renderer must not contain canonical engine operation ${forbidden}.`);
}

for (const selector of [
  '.cube-accessibility-panel',
  '.cube-visualizer-2d',
  '.cube-2d-cell',
  '.cube-trace-transcript',
  '.cube-sr-only',
  ':focus-visible',
  '.cube-reduced-motion',
  '@media (prefers-reduced-motion:reduce)',
  'repeating-linear-gradient',
  'content:"★"'
]) assert.match(styleSource, new RegExp(selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));

assert.match(entrySource, /ASSET_VERSION = '20260726-3'/);
assert.match(entrySource, /keyboard controls, reduced-motion phases, non-color state markers, trace transcripts/);
for (const heading of ['Keyboard operation', 'Reduced motion', 'Non-color distinctions', 'Live announcements', 'Trace transcript', '2D fallback']) assert.match(checklistSource, new RegExp(heading, 'i'));

console.log(JSON.stringify({
  format: 'hb-ttrpg-shadowrun-binary-cube-v10-accessibility-validation-receipt',
  schemaVersion: '0.1.0',
  rendererVersion: Renderer.constants.RENDERER_VERSION,
  displayModes: Visualizer.constants.DISPLAY_MODES,
  transcriptPhases: transcript.length,
  exactTwoDimensionalInputCells: fallbackMap.inputCells.length,
  exactTwoDimensionalOutputCells: fallbackMap.outputCells.length,
  reducedMotionDiscretePhase: true,
  fullKeyboardSurfacePresent: true,
  nonColorMarkersPresent: true,
  liveRegionPresent: true,
  rendererFailureIsNonFatal: true,
  canonicalPackageParity: true,
  rendererAlgorithmIsolation: true
}, null, 2));
