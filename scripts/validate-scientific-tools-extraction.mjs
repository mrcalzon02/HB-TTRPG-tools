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
const communicationCapacity = read('binary-cube-communication-capacity-analyzer.js');
const communicationCapacityCss = read('binary-cube-communication-capacity-analyzer.css');
const communicationCapacityWorker = read('binary-cube-communication-capacity-worker.js');
const mediaForensics = read('binary-cube-media-forensics-suite.js');
const mediaForensicsCss = read('binary-cube-media-forensics-suite.css');
const mediaForensicsWorker = read('binary-cube-media-forensics-worker.js');
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
  'binary-cube-communication-capacity-analyzer.js',
  'binary-cube-media-forensics-suite.js',
  'DoubleSlitExperimentLab',
  'BinaryCubeDecryptionDashboard',
  'BinaryCubeInformationAnalysisSuite',
  'BinaryCubeCommunicationCapacityAnalyzer',
  'BinaryCubeMediaForensicsSuite'
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
  'binary-cube-communication-capacity-analyzer.js',
  'binary-cube-media-forensics-suite.js',
  'shadowrun-binary-cube-engine.js'
]));

checks.push(includes('Main menu cache-refreshes the current Scientific Tools entry', mounts, [
  "button.dataset.view = 'scientific-tools'",
  "button.textContent = 'Scientific Tools'",
  "card.dataset.scientificToolsCard = 'true'",
  'Decryption Dashboard',
  'Information & Deobfuscation Analysis Suite',
  'Communication Capacity Analyzer',
  'Steganography, Signal & Media Forensics Suite',
  "if (viewId === 'scientific-tools')",
  "loadScript('scientific-tools-entry.js?v=20260809-media-forensics-1')",
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
  'BinaryCubeInformationAnalysisSuite',
  'BinaryCubeCommunicationCapacityAnalyzer',
  'BinaryCubeMediaForensicsSuite'
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
  "const ASSET_VERSION = '20260809-media-forensics-1';",
  'function loadCooperativeRunner()',
  "loadScript('scientific-tools-cooperative-runner.js'",
  'await loadCooperativeRunner();',
  "loadScript('binary-cube-decryption-dashboard.js'",
  "loadScript('binary-cube-information-analysis-suite.js'",
  "loadScript('binary-cube-communication-capacity-analyzer.js'",
  "loadScript('binary-cube-media-forensics-suite.js'",
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
  'id="scientific-tools-open-communication-capacity"',
  'id="scientific-tools-open-media-forensics"',
  'id="scientific-tools-open-ism"',
  'id="scientific-tools-open-double-slit"',
  'loadDecryptionDashboard',
  'openDecryptionDashboard',
  'loadInformationAnalysisSuite',
  'openInformationAnalysisSuite',
  'loadCommunicationCapacityAnalyzer',
  'openCommunicationCapacityAnalyzer',
  'loadMediaForensicsSuite',
  'openMediaForensicsSuite',
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

checks.push(includes('Communication Capacity Analyzer implements the McCowan-Hanser-Doyle information-theory family', communicationCapacity, [
  'BinaryCubeCommunicationCapacityAnalyzer',
  'const PAPER_YEAR = 1999;',
  "const HUMAN_ZIPF_REFERENCE = -1.00;",
  "const ADULT_DOLPHIN_ZIPF_REFERENCE = -0.95;",
  "const INFANT_DOLPHIN_ZIPF_REFERENCE = -0.82;",
  "const RANDOM_ZIPF_REFERENCE = -0.09;",
  'function zipfAnalysis(',
  'function conditionalEntropy(',
  'function entropyOrderProfile(',
  'function surrogateSequenceTest(',
  'function sampleSufficiency(',
  'function lagMutualInformation(',
  'function analyzeCommunicationCapacity(',
  'function analyzeCommunicationCapacityAsync(',
  'function cancelActiveAnalysis(',
  'new root.Worker(',
  'WORKER_HEARTBEAT_MS',
  'still working',
  'Adult dolphin whistles',
  'undersampled',
  'not proof of language'
]));
checks.push(excludes('Communication Capacity Analyzer does not duplicate Binary Cube encryption or unrelated scientific models', communicationCapacity, [
  'ShadowrunBinaryCubeEngine.encryptBinary',
  'Engine.encryptBinary(',
  'Engine.transformBlock(',
  'InterstellarMediaCollisionsLab',
  'DoubleSlitExperimentLab',
  'PLANCK_LENGTH',
  'LAMBDA_COEFFICIENT'
]));
checks.push(includes('Communication Capacity worker delegates the full statistical model to the authoritative analyzer', communicationCapacityWorker, [
  "importScripts('binary-cube-communication-capacity-analyzer.js?v=20260809-communication-capacity-2')",
  'const Analyzer = self.BinaryCubeCommunicationCapacityAnalyzer;',
  'Analyzer.analyzeCommunicationCapacity(bytes, request.options || {})',
  "type: 'progress'",
  "type: 'result'"
]));
checks.push(excludes('Communication Capacity worker does not duplicate statistical model mathematics', communicationCapacityWorker, [
  'function zipfAnalysis(',
  'function conditionalEntropy(',
  'function entropyOrderProfile(',
  'function surrogateSequenceTest(',
  'function sampleSufficiency('
]));
assert.ok(communicationCapacityCss.includes('.bcca-panel'), 'Communication Capacity Analyzer stylesheet must retain authoritative panel styling.');
assert.ok(communicationCapacityCss.includes('.bcca-metrics'), 'Communication Capacity Analyzer stylesheet must retain metric styling.');
assert.ok(communicationCapacityCss.includes('.bcca-table'), 'Communication Capacity Analyzer stylesheet must retain table styling.');
checks.push('Communication Capacity Analyzer stylesheet remains authoritative');

checks.push(includes('Media Forensics Suite covers steganography, convolution, raster, audio, and container recovery', mediaForensics, [
  'BinaryCubeMediaForensicsSuite',
  'Steganography, Signal & Media Forensics Suite',
  'function extractByteBitPlane(',
  'function extractSelectedBits(',
  'function bitPlaneDiagnostics(',
  'function lsbPairChiSquare(',
  'function bitAutocorrelation(',
  'function parseKernelMatrix(',
  'function convolve1d(',
  'function crossCorrelate1d(',
  'function convolve2d(',
  'function extractRasterLsb(',
  'function rasterBitPlaneImage(',
  'function convolveRasterChannel(',
  'function parseWav(',
  'function decodeWavChannels(',
  'function extractPcmSampleBitPlane(',
  'function extractPcmDeltaBitPlane(',
  'function fftReal(',
  'function spectralSummary(',
  'function goertzelPower(',
  'function decodeDtmf(',
  'function decodeBinaryFsk(',
  'function decodeOnOffKeying(',
  'function parsePngChunks(',
  'function parseJpegSegments(',
  'function parseId3v2(',
  'function scanContainer(',
  'function fullForensicSweep(',
  'function fullForensicSweepAsync(',
  'new root.Worker(',
  'WORKER_HEARTBEAT_MS',
  'not proof of intentional hiding'
]));
checks.push(excludes('Media Forensics Suite remains independent from encryption and unrelated scientific models', mediaForensics, [
  'ShadowrunBinaryCubeEngine.encryptBinary',
  'Engine.encryptBinary(',
  'Engine.transformBlock(',
  'InterstellarMediaCollisionsLab',
  'DoubleSlitExperimentLab',
  'PLANCK_LENGTH',
  'LAMBDA_COEFFICIENT'
]));
checks.push(includes('Media Forensics worker delegates its model to the authoritative suite', mediaForensicsWorker, [
  "importScripts('binary-cube-media-forensics-suite.js?v=20260809-media-forensics-1')",
  'const Suite = self.BinaryCubeMediaForensicsSuite;',
  'Suite.fullForensicSweep(bytes)',
  "operation !== 'full-sweep'",
  "type: 'progress'",
  "type: 'result'"
]));
checks.push(excludes('Media Forensics worker does not duplicate steganography, convolution, or audio mathematics', mediaForensicsWorker, [
  'function extractByteBitPlane(',
  'function convolve1d(',
  'function convolve2d(',
  'function decodeDtmf(',
  'function decodeBinaryFsk(',
  'function parseWav('
]));
assert.ok(mediaForensicsCss.includes('.bmfs-panel'), 'Media Forensics stylesheet must retain authoritative panel styling.');
assert.ok(mediaForensicsCss.includes('.bmfs-tab-strip'), 'Media Forensics stylesheet must retain internal tool navigation.');
assert.ok(mediaForensicsCss.includes('.bmfs-metrics'), 'Media Forensics stylesheet must retain forensic metric styling.');
checks.push('Media Forensics Suite stylesheet remains authoritative');

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
  'BinaryCubeCommunicationCapacityAnalyzer',
  'BinaryCubeMediaForensicsSuite',
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
  'BinaryCubeCommunicationCapacityAnalyzer',
  'BinaryCubeMediaForensicsSuite',
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
  schemaVersion: '0.11.0',
  pass: true,
  checkCount: checks.length,
  checks
}, null, 2));