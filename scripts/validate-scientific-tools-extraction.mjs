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
const cubeWorker = read('shadowrun-binary-cube-worker.js');
const cubeWorkerClient = read('binary-cube-worker-client.js');
const cubeLab = read('shadowrun-binary-cube-encryption.js');
const decryption = read('binary-cube-decryption-dashboard.js');
const decryptionCss = read('binary-cube-decryption-dashboard.css');
const informationSuite = read('binary-cube-information-analysis-suite.js');
const informationSuiteCss = read('binary-cube-information-analysis-suite.css');
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
checks.push(excludes('Scientific simulation and cryptanalysis implementations are not embedded inside Shadowrun', shadowrun, [
  'interstellar-media-collisions-lab.js',
  'double-slit-lab.js',
  'binary-cube-decryption-dashboard.js',
  'binary-cube-information-analysis-suite.js',
  'DoubleSlitExperimentLab',
  'BinaryCubeDecryptionDashboard',
  'BinaryCubeInformationAnalysisSuite'
]));

checks.push(includes('Black Light delegates to the shared Scientific Tools workspace', blacklight, [
  'data-blacklight-systems-tab="science"',
  "prepareView('scientific-tools')",
  "openSharedScientificTool('openBinaryCubeVisualizer'",
  "openSharedScientificTool('openBinaryCubeLaboratory'",
  "openSharedScientificTool('openIsmSimulation'"
]));
checks.push(excludes('Black Light does not duplicate scientific or cryptanalysis runtimes', blacklight, [
  'interstellar-media-collisions-lab.js',
  'double-slit-lab.js',
  'binary-cube-decryption-dashboard.js',
  'binary-cube-information-analysis-suite.js',
  'shadowrun-binary-cube-engine.js'
]));

checks.push(includes('Main menu cache-refreshes the current Scientific Tools entry', mounts, [
  "button.dataset.view = 'scientific-tools'",
  "button.textContent = 'Scientific Tools'",
  "card.dataset.scientificToolsCard = 'true'",
  'Decryption Dashboard',
  'Information & Deobfuscation Analysis Suite',
  "if (viewId === 'scientific-tools')",
  "loadScript('scientific-tools-entry.js?v=20260809-information-analysis-1')",
  'ensureScientificToolsView();'
]));
checks.push(includes('Main runtime preloads freeze-safe Binary Cube execution before the laboratory', mounts, [
  "loadScript('shadowrun-binary-cube-engine.js')",
  "loadScript('binary-cube-worker-client.js?v=20260809-v15-binary-cube-worker-liveness')",
  "loadScript('shadowrun-binary-cube-encryption.js?v=20260809-v14-binary-cube-worker')",
  "loadScript('binary-cube-large-grid-ui.js')"
]));
assert.equal(count(mounts, "card.dataset.scientificToolsCard = 'true'"), 1, 'The main menu must own exactly one Scientific Tools card.');
checks.push('Main menu owns one Scientific Tools destination');

checks.push(includes('Shared cooperative runner provides deterministic time-budget yielding and cancellation', cooperative, [
  'ScientificToolsCooperativeRunner',
  'const DEFAULT_MAX_SLICE_MS = 8;',
  'class CooperativeCancelledError extends Error',
  'function createToken(',
  'function assertActive(',
  'function yieldControl()',
  'function normalizedSliceBudget(',
  'async function forRange(',
  'const maxSliceMs = normalizedSliceBudget(options.maxSliceMs);',
  'now() - sliceStartedAt >= maxSliceMs',
  'assertActive(token);',
  'await yieldControl()',
  'DEFAULT_MAX_SLICE_MS'
]));
checks.push(excludes('Cooperative runner does not own scientific model logic', cooperative, [
  'LAMBDA_COEFFICIENT',
  'DoubleSlitExperimentLab',
  'ShadowrunBinaryCubeEngine',
  'BinaryCubeDecryptionDashboard',
  'BinaryCubeInformationAnalysisSuite'
]));

checks.push(includes('Binary Cube worker delegates all heavy mathematics to the canonical engine', cubeWorker, [
  "importScripts('shadowrun-binary-cube-engine.js?v=20260809-v14-binary-cube-worker')",
  'const Engine = self.ShadowrunBinaryCubeEngine;',
  "case 'create-key':",
  'Engine.createKey(',
  'Engine.assertProjectionUniqueness(key)',
  "case 'encrypt':",
  'Engine.encryptBinary(',
  "case 'decrypt':",
  'Engine.decryptBinary(',
  "case 'validate-pair':",
  'Engine.validatePackage(',
  'Engine.algebraicInvariant(key)',
  "type: 'progress'"
]));
checks.push(excludes('Binary Cube worker does not duplicate the canonical cube transform', cubeWorker, [
  'function pointDepthForKey(',
  'function computeBlockTransformation(',
  'function transformBlockWithKey(',
  'latinValue =',
  'rowPermutation[x] + key.columnPermutation[y]'
]));

checks.push(includes('Binary Cube worker client keeps heavy work off the browser main thread, reports liveness, and can terminate it', cubeWorkerClient, [
  'new Worker(',
  'pending = new Map()',
  'const HEARTBEAT_INTERVAL_MS = 1000;',
  "message.type === 'progress'",
  'elapsedMilliseconds:',
  'still working',
  'worker.terminate()',
  'function cancelAll(',
  'function isBusy()',
  'ShadowrunBinaryCubeWorkerClient'
]));

checks.push(includes('Binary Cube laboratory routes expensive user actions through the background worker', cubeLab, [
  'const Executor = window.ShadowrunBinaryCubeWorkerClient;',
  'Slow-hardware execution:',
  'async function runBackground(',
  "runBackground(panel, 'create-key'",
  "runBackground(panel, 'encrypt'",
  "runBackground(panel, 'decrypt'",
  "runBackground(panel, 'validate-pair'",
  'Cancel active operation',
  'cancelActiveOperation(',
  'Routine encrypt/decrypt uses the algebraic collision-free invariant',
  'Validate Pair'
]));
checks.push(excludes('Binary Cube laboratory no longer performs the primary expensive encode/decode path synchronously', cubeLab, [
  'Engine.encryptBinary(panel.querySelector',
  'Engine.decryptBinary(packageObject, key)',
  'Engine.diagnosePackage(packageObject, keyObject)',
  'Engine.assertProjectionUniqueness(key);'
]));

checks.push(includes('Scientific Tools loads the cooperative scheduler before scientific runtimes', workspace, [
  "const ASSET_VERSION = '20260809-information-analysis-1';",
  'function loadCooperativeRunner()',
  "loadScript('scientific-tools-cooperative-runner.js'",
  'await loadCooperativeRunner();',
  "loadScript('binary-cube-decryption-dashboard.js'",
  "loadScript('binary-cube-information-analysis-suite.js'",
  "loadScript('interstellar-media-collisions-lab.js'",
  "loadScript('double-slit-lab.js'",
  'ScientificToolsCooperativeRunner loads before Scientific Tools runtimes',
  'deterministic operation order',
  'bounded work slices'
]));

checks.push(includes('Scientific Tools owns one Binary Cube, Decryption Dashboard, ISM, and Double Slit destination', workspace, [
  'data-scientific-tools-tab="binary-cube"',
  'data-scientific-tools-tab="decryption-dashboard"',
  'data-scientific-tools-tab="ism-media-simulation"',
  'data-scientific-tools-tab="double-slit"',
  'id="scientific-tools-open-binary-cube-visualizer"',
  'id="scientific-tools-open-binary-cube-laboratory"',
  'id="scientific-tools-open-decryption-dashboard"',
  'id="scientific-tools-open-information-analysis"',
  'id="scientific-tools-open-ism"',
  'id="scientific-tools-open-double-slit"',
  'loadDecryptionDashboard',
  'openDecryptionDashboard',
  'loadInformationAnalysisSuite',
  'openInformationAnalysisSuite',
  'loadDoubleSlitLab',
  'openDoubleSlitLab'
]));
assert.equal(count(workspace, 'data-scientific-tools-tab="binary-cube"'), 1);
assert.equal(count(workspace, 'data-scientific-tools-tab="decryption-dashboard"'), 1);
assert.equal(count(workspace, 'data-scientific-tools-tab="ism-media-simulation"'), 1);
assert.equal(count(workspace, 'data-scientific-tools-tab="double-slit"'), 1);
checks.push('Scientific Tools tab ownership is singular');

checks.push(includes('Decryption Dashboard exposes bounded Binary Cube cryptanalysis tools', decryption, [
  'BinaryCubeDecryptionDashboard',
  'Decryption Dashboard',
  'Binary Cube Cryptanalysis',
  'ScientificToolsCooperativeRunner',
  'function candidateGridSizes(',
  'function autocorrelation(',
  'function transformSquareBlock(',
  'async function runAttackSuite(',
  'function compareSources(',
  'function knownKeyDecrypt(',
  'single-byte XOR',
  'Research boundary:'
]));
checks.push(includes('Decryption Dashboard delegates authoritative known-key decryption to the canonical engine', decryption, [
  'const Engine = canonicalEngine();',
  'Engine.validateKey(keyValue)',
  'Engine.decryptBinary(packageObject, key)',
  'ShadowrunBinaryCubeSecureExport',
  'expandSecureExport'
]));
checks.push(excludes('Decryption Dashboard does not reconstruct the encoder or absorb unrelated scientific models', decryption, [
  'ShadowrunBinaryCubeEngine.encryptBinary',
  'Engine.transformBlock',
  'InterstellarMediaCollisionsLab',
  'DoubleSlitExperimentLab',
  'PLANCK_LENGTH',
  'LAMBDA_COEFFICIENT'
]));
assert.ok(decryptionCss.includes('.bdd-panel'), 'Decryption Dashboard stylesheet must retain authoritative panel styling.');
assert.ok(decryptionCss.includes('.bdd-results'), 'Decryption Dashboard stylesheet must retain ranked-result styling.');
assert.ok(decryptionCss.includes('.bdd-metric-grid'), 'Decryption Dashboard stylesheet must retain diagnostics styling.');
checks.push('Decryption Dashboard stylesheet remains authoritative');

checks.push(includes('Information analysis suite combines paper-grounded and broad deobfuscation evidence', informationSuite, [
  'BinaryCubeInformationAnalysisSuite',
  "const PAPER_TITLE = 'Language Trees and Zipping';",
  'const PAPER_YEAR = 2002;',
  "const MAURER_TITLE = 'A Universal Statistical Test for Random Bit Generators';",
  'function shannonEntropy(',
  'function minEntropy(',
  'function ngramEntropy(',
  'function mutualInformationLag(',
  'function slidingEntropy(',
  'function maurerUniversal(',
  'async function normalizedCompressionDistance(',
  'async function bclRelativeEntropy(',
  'Benedetto–Caglioti–Loreto compression-relative-entropy estimator',
  'function stringCarve(',
  'function fileSignatures(',
  'async function recursivePeel(',
  'function repeatingXorCandidate(',
  'function likelyRepeatingXorLengths(',
  'function bitPlane(',
  'function swapWordEndian(',
  'function columnarTranspose(',
  'function strideExtract(',
  'async function rankDeobfuscationCandidates(',
  'cannot prove semantic meaning'
]));
checks.push(excludes('Information analysis suite remains independent from canonical encryption and unrelated science models', informationSuite, [
  'ShadowrunBinaryCubeEngine.encryptBinary',
  'Engine.encryptBinary(',
  'Engine.transformBlock(',
  'InterstellarMediaCollisionsLab',
  'DoubleSlitExperimentLab',
  'PLANCK_LENGTH',
  'LAMBDA_COEFFICIENT'
]));
assert.ok(informationSuiteCss.includes('.bias-panel'), 'Information Analysis Suite stylesheet must retain authoritative panel styling.');
assert.ok(informationSuiteCss.includes('.bias-candidate'), 'Information Analysis Suite stylesheet must retain candidate styling.');
assert.ok(informationSuiteCss.includes('.bias-metric-grid'), 'Information Analysis Suite stylesheet must retain evidence metrics.');
checks.push('Information Analysis Suite stylesheet remains authoritative');

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
checks.push(excludes('ISM remains independent of Double Slit, cryptanalysis, and Binary Cube implementations', ism, [
  'DoubleSlitExperimentLab',
  'BinaryCubeDecryptionDashboard',
  'BinaryCubeInformationAnalysisSuite',
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
checks.push(excludes('Double Slit does not absorb ISM, cryptanalysis, or Binary Cube model logic', doubleSlit, [
  'InterstellarMediaCollisionsLab',
  'BinaryCubeDecryptionDashboard',
  'BinaryCubeInformationAnalysisSuite',
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
  schemaVersion: '0.9.1',
  pass: true,
  checkCount: checks.length,
  checks
}, null, 2));