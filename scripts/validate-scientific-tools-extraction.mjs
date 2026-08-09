#!/usr/bin/env node

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const read = relativePath => fs.readFileSync(path.join(root, relativePath), 'utf8');

const shadowrun = read('shadowrun-entry.js');
const blacklight = read('blacklight-continuum-entry.js');
const mounts = read('app-lite-view-mounts.js');
const workspace = read('scientific-tools-entry.js');
const cooperative = read('scientific-tools-cooperative-runner.js');
const ism = read('interstellar-media-collisions-lab.js');
const ismCss = read('interstellar-media-collisions-lab.css');
const doubleSlit = read('double-slit-lab.js');
const doubleSlitCss = read('double-slit-lab.css');

function includes(label, source, values) {
  for (const value of values) assert.ok(source.includes(value), `${label}: missing ${JSON.stringify(value)}`);
  return label;
}
function excludes(label, source, values) {
  for (const value of values) assert.ok(!source.includes(value), `${label}: forbidden placement/coupling ${JSON.stringify(value)}`);
  return label;
}
function count(source, needle) { return source.split(needle).length - 1; }

const checks = [];

checks.push(includes('Shadowrun retains the definitive Binary Cube launch targets', shadowrun, [
  "['tools','Binary Cube Encryption Laboratory'",
  "['tools','Binary Cube Encoder Visualizer'",
  'function loadCubeTool()',
  'function loadCubeVisualizer()',
  "loadScript('shadowrun-binary-cube-engine.js'",
  "loadScript('shadowrun-binary-cube-visualizer.js'"
]));
checks.push(excludes('Scientific simulation implementations are not embedded inside Shadowrun', shadowrun, [
  'interstellar-media-collisions-lab.js',
  'double-slit-lab.js',
  'DoubleSlitExperimentLab'
]));

checks.push(includes('Black Light delegates to the shared Scientific Tools workspace', blacklight, [
  'data-blacklight-systems-tab="science"',
  "prepareView('scientific-tools')",
  "openSharedScientificTool('openBinaryCubeVisualizer'",
  "openSharedScientificTool('openBinaryCubeLaboratory'",
  "openSharedScientificTool('openIsmSimulation'"
]));
checks.push(excludes('Black Light does not duplicate scientific runtimes', blacklight, [
  'interstellar-media-collisions-lab.js',
  'double-slit-lab.js',
  'shadowrun-binary-cube-engine.js'
]));

checks.push(includes('Main menu cache-refreshes the cooperative Scientific Tools entry', mounts, [
  "button.dataset.view = 'scientific-tools'",
  "button.textContent = 'Scientific Tools'",
  "card.dataset.scientificToolsCard = 'true'",
  "if (viewId === 'scientific-tools')",
  "loadScript('scientific-tools-entry.js?v=20260809-cooperative-science-1')",
  'ensureScientificToolsView();'
]));
assert.equal(count(mounts, "card.dataset.scientificToolsCard = 'true'"), 1, 'The main menu must own exactly one Scientific Tools card.');
checks.push('Main menu owns one Scientific Tools destination');

checks.push(includes('Shared cooperative runner provides deterministic yielding and cancellation', cooperative, [
  'ScientificToolsCooperativeRunner',
  'class CooperativeCancelledError extends Error',
  'function createToken(',
  'function assertActive(',
  'function yieldControl()',
  'async function forRange(',
  'chunkSize',
  'await yieldControl()'
]));
checks.push(excludes('Cooperative runner does not own scientific model logic', cooperative, [
  'LAMBDA_COEFFICIENT',
  'DoubleSlitExperimentLab',
  'ShadowrunBinaryCubeEngine'
]));

checks.push(includes('Scientific Tools loads the cooperative scheduler before scientific runtimes', workspace, [
  "const ASSET_VERSION = '20260809-cooperative-science-1';",
  'function loadCooperativeRunner()',
  "loadScript('scientific-tools-cooperative-runner.js'",
  'await loadCooperativeRunner();',
  "loadScript('interstellar-media-collisions-lab.js'",
  "loadScript('double-slit-lab.js'",
  'ScientificToolsCooperativeRunner loads before Scientific Tools runtimes',
  'deterministic operation order',
  'bounded work slices'
]));

checks.push(includes('Scientific Tools owns one Binary Cube, ISM, and Double Slit destination', workspace, [
  'data-scientific-tools-tab="binary-cube"',
  'data-scientific-tools-tab="ism-media-simulation"',
  'data-scientific-tools-tab="double-slit"',
  'id="scientific-tools-open-binary-cube-visualizer"',
  'id="scientific-tools-open-binary-cube-laboratory"',
  'id="scientific-tools-open-ism"',
  'id="scientific-tools-open-double-slit"',
  'loadDoubleSlitLab',
  'openDoubleSlitLab'
]));
assert.equal(count(workspace, 'data-scientific-tools-tab="binary-cube"'), 1);
assert.equal(count(workspace, 'data-scientific-tools-tab="ism-media-simulation"'), 1);
assert.equal(count(workspace, 'data-scientific-tools-tab="double-slit"'), 1);
checks.push('Scientific Tools tab ownership is singular');

checks.push(includes('ISM preserves physical, foam, and Shadow model boundaries', ism, [
  'const LAMBDA = 1.097e-52;',
  'const PLANCK_LENGTH = 1.616255e-35;',
  'const FOAM_MODELS = Object.freeze({',
  'function magneticPhysics(config)',
  'function quantumFoamPhysics(config, side, density)',
  'function applyFoamKick(direction, random, rmsAngle)',
  'Shadow impact reflectivity randomness',
  'window.InterstellarMediaCollisionsLab = Object.freeze'
]));
checks.push(includes('ISM heavy setup is cooperatively incremental and cancellable', ism, [
  'ScientificToolsCooperativeRunner',
  'const PARTICLE_CHUNK = 512;',
  'const RAY_CHUNK = 4;',
  'function createSimulationContext(config)',
  'function simulateRay(context, rayIndex)',
  'async function simulateAsync(config, options = {})',
  'async function prepareSceneAsync(result, options = {})',
  'taskRunner.forRange({',
  "runner().createToken('ISM phase beam cast')",
  "cooperativeToken?.cancel?.('superseded by newer cast')",
  "cooperativeToken?.cancel?.('laboratory closed')",
  "['Execution', 'deterministic cooperative slices']"
]));
checks.push(excludes('ISM remains independent of Double Slit and Binary Cube implementations', ism, [
  'DoubleSlitExperimentLab',
  'ShadowrunBinaryCubeEngine',
  'ShadowrunBinaryCubeEncryption'
]));

checks.push(includes('Double Slit preserves accepted baseline and hypothesis separation', doubleSlit, [
  "const PANEL_ID = 'double-slit-lab';",
  'function electronWavelength(kineticEv)',
  'function coherentIntensityAtX(x, physics, config)',
  'const envelope = Math.pow(sinc(beta), 2);',
  '1 + physics.visibility * Math.cos(phase)',
  "config.mode === 'classical'",
  'function registerHypothesisLayer(definition)',
  'window.DoubleSlitExperimentLab = Object.freeze'
]));
checks.push(includes('Double Slit heavy setup and detector updates are cooperatively incremental', doubleSlit, [
  'ScientificToolsCooperativeRunner',
  'const MAX_ACTIVE_EVENT_VISUALS = 64;',
  'const DISTRIBUTION_CHUNK = 64;',
  'async function buildDistributionAsync(',
  'async function paintDetectorBaseAsync(token)',
  'async function addAmplitudeFieldAsync(token)',
  'hitBins',
  'scheduleUiRefresh()',
  "refreshToken?.cancel?.('superseded by newer experiment settings')",
  "refreshToken?.cancel?.('laboratory closed')",
  'deterministic cooperative slices'
]));
checks.push(excludes('Double Slit does not absorb ISM or Binary Cube model logic', doubleSlit, [
  'InterstellarMediaCollisionsLab',
  'ShadowrunBinaryCubeEngine',
  'PLANCK_LENGTH',
  'LAMBDA_COEFFICIENT'
]));

assert.ok(ismCss.includes('.ism-lab-panel'), 'ISM stylesheet must retain authoritative panel styling.');
assert.ok(ismCss.includes('.ism-face-chart'), 'ISM stylesheet must retain concurrent detector styling.');
checks.push('ISM stylesheet remains authoritative');
assert.ok(doubleSlitCss.includes('.dsl-panel'), 'Double Slit stylesheet must retain authoritative panel styling.');
assert.ok(doubleSlitCss.includes('.dsl-viewport'), 'Double Slit stylesheet must retain the 3D viewport styling.');
assert.ok(doubleSlitCss.includes('.dsl-chart'), 'Double Slit stylesheet must retain detector cross-section styling.');
checks.push('Double Slit stylesheet remains authoritative');

console.log(JSON.stringify({
  format: 'hb-ttrpg-scientific-tools-main-menu-contract-receipt',
  schemaVersion: '0.6.0',
  pass: true,
  checkCount: checks.length,
  checks
}, null, 2));