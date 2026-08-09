#!/usr/bin/env node

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const read = relativePath => fs.readFileSync(path.join(root, relativePath), 'utf8');
const exists = relativePath => fs.existsSync(path.join(root, relativePath));

const sources = Object.freeze({
  shadowrun: read('shadowrun-entry.js'),
  blacklight: read('blacklight-continuum-entry.js'),
  mounts: read('app-lite-view-mounts.js'),
  workspace: read('scientific-tools-entry.js'),
  cooperative: read('scientific-tools-cooperative-runner.js'),
  cubeWorker: read('shadowrun-binary-cube-worker.js'),
  cubeWorkerClient: read('binary-cube-worker-client.js'),
  cubeLab: read('shadowrun-binary-cube-encryption.js'),
  keyResearch: read('binary-cube-key-generation-research.js'),
  keyResearchWorker: read('binary-cube-key-generation-research-worker.js'),
  keyResearchVisualizer: read('binary-cube-key-generation-visualizer.js'),
  keyResearchCss: read('binary-cube-key-generation-visualizer.css'),
  decryption: read('binary-cube-decryption-dashboard.js'),
  decryptionCss: read('binary-cube-decryption-dashboard.css'),
  cryptanalytic: read('binary-cube-cryptanalytic-test-lab.js'),
  information: read('binary-cube-information-analysis-suite.js'),
  informationCss: read('binary-cube-information-analysis-suite.css'),
  communication: read('binary-cube-communication-capacity-analyzer.js'),
  communicationCss: read('binary-cube-communication-capacity-analyzer.css'),
  communicationWorker: read('binary-cube-communication-capacity-worker.js'),
  media: read('binary-cube-media-forensics-suite.js'),
  mediaCss: read('binary-cube-media-forensics-suite.css'),
  mediaWorker: read('binary-cube-media-forensics-worker.js'),
  mediaDemos: read('binary-cube-media-forensics-demo-corpus.js'),
  ism: read('interstellar-media-collisions-lab.js'),
  ismCss: read('interstellar-media-collisions-lab.css'),
  doubleSlit: read('double-slit-lab.js'),
  doubleSlitCss: read('double-slit-lab.css')
});

function includes(label, source, values) {
  for (const value of values) assert.ok(source.includes(value), `${label}: missing ${JSON.stringify(value)}`);
  return label;
}
function excludes(label, source, values) {
  for (const value of values) assert.ok(!source.includes(value), `${label}: forbidden placement/coupling ${JSON.stringify(value)}`);
  return label;
}
function count(source, needle) { return source.split(needle).length - 1; }
function nonEmpty(label, relativePath) {
  assert.ok(exists(relativePath), `${label}: ${relativePath} is missing.`);
  assert.ok(fs.statSync(path.join(root, relativePath)).size > 0, `${label}: ${relativePath} is empty.`);
  return label;
}

const checks = [];

checks.push(includes('Shadowrun retains the definitive Binary Cube launch targets', sources.shadowrun, [
  "['tools','Binary Cube Encryption Laboratory'",
  "['tools','Binary Cube Encoder Visualizer'",
  'function loadCubeTool()',
  'function loadCubeVisualizer()',
  "loadScript('shadowrun-binary-cube-engine.js'",
  "loadScript('shadowrun-binary-cube-visualizer.js'"
]));
checks.push(excludes('Scientific research and simulation implementations are not embedded inside Shadowrun', sources.shadowrun, [
  'binary-cube-key-generation-research.js',
  'binary-cube-key-generation-visualizer.js',
  'interstellar-media-collisions-lab.js',
  'double-slit-lab.js',
  'binary-cube-decryption-dashboard.js',
  'binary-cube-information-analysis-suite.js',
  'binary-cube-communication-capacity-analyzer.js',
  'binary-cube-media-forensics-suite.js'
]));

checks.push(includes('Black Light delegates to the shared Scientific Tools workspace', sources.blacklight, [
  'data-blacklight-systems-tab="science"',
  "prepareView('scientific-tools')",
  "openSharedScientificTool('openBinaryCubeVisualizer'",
  "openSharedScientificTool('openBinaryCubeLaboratory'",
  "openSharedScientificTool('openIsmSimulation'"
]));
checks.push(excludes('Black Light does not duplicate Scientific Tools runtimes', sources.blacklight, [
  'binary-cube-key-generation-research.js',
  'binary-cube-key-generation-visualizer.js',
  'interstellar-media-collisions-lab.js',
  'double-slit-lab.js',
  'binary-cube-decryption-dashboard.js',
  'binary-cube-information-analysis-suite.js',
  'binary-cube-communication-capacity-analyzer.js',
  'binary-cube-media-forensics-suite.js',
  'shadowrun-binary-cube-engine.js'
]));

checks.push(includes('Main menu owns and lazy-loads one Scientific Tools destination', sources.mounts, [
  "button.dataset.view = 'scientific-tools'",
  "button.textContent = 'Scientific Tools'",
  "card.dataset.scientificToolsCard = 'true'",
  "if (viewId === 'scientific-tools')",
  'ensureScientificToolsView();'
]));
assert.equal(count(sources.mounts, "card.dataset.scientificToolsCard = 'true'"), 1, 'The main menu must own exactly one Scientific Tools card.');
checks.push('Main menu owns one Scientific Tools card');
checks.push(includes('Main runtime preloads freeze-safe Binary Cube execution before the laboratory', sources.mounts, [
  "loadScript('shadowrun-binary-cube-engine.js')",
  "loadScript('binary-cube-worker-client.js?v=20260809-v16-binary-cube-reseed')",
  "loadScript('shadowrun-binary-cube-encryption.js?v=20260809-v16-binary-cube-reseed')",
  "loadScript('binary-cube-large-grid-ui.js')"
]));

checks.push(includes('Shared cooperative runner provides deterministic time-budget yielding and cancellation', sources.cooperative, [
  'ScientificToolsCooperativeRunner',
  'const DEFAULT_MAX_SLICE_MS = 8;',
  'class CooperativeCancelledError extends Error',
  'function createToken(',
  'function assertActive(',
  'function yieldControl()',
  'async function forRange(',
  'now() - sliceStartedAt >= maxSliceMs',
  'await yieldControl()'
]));
checks.push(excludes('Cooperative runner does not own scientific model logic', sources.cooperative, [
  'LAMBDA_COEFFICIENT',
  'DoubleSlitExperimentLab',
  'ShadowrunBinaryCubeEngine',
  'BinaryCubeKeyGenerationResearch',
  'BinaryCubeDecryptionDashboard'
]));

checks.push(includes('Binary Cube worker delegates heavy operations to the canonical engine', sources.cubeWorker, [
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
  'Engine.validatePackage('
]));
checks.push(excludes('Binary Cube worker does not duplicate canonical cube mathematics', sources.cubeWorker, [
  'function pointDepthForKey(',
  'function transformBlockWithKey(',
  'rowPermutation[x] + key.columnPermutation[y]'
]));
checks.push(includes('Binary Cube worker client owns secure reseeding and cancellable background execution', sources.cubeWorkerClient, [
  'new Worker(',
  'const HEARTBEAT_INTERVAL_MS = 1000;',
  'const RESEED_BYTES = 16;',
  'crypto.getRandomValues',
  'function freshSeed(',
  'worker.terminate()',
  'function cancelAll(',
  'ShadowrunBinaryCubeWorkerClient'
]));
checks.push(includes('Binary Cube laboratory keeps deterministic generation separate from fresh reseeding', sources.cubeLab, [
  'const Executor = window.ShadowrunBinaryCubeWorkerClient;',
  'data-cube-reseed',
  "Executor.freshSeed('binary-cube')",
  'await generateKey(panel, false)',
  'await generateKey(panel, true)',
  'Generate Key reproduces this seed exactly.',
  'Current encrypted package invalidated by key reseed.',
  'Cancel active operation'
]));

checks.push(includes('Key-generation research is one shared model above the canonical engine', sources.keyResearch, [
  "const RESEARCH_SCHEMA_VERSION = 'research-0.4.0';",
  "'direct-permutation'",
  "'iterative-chain'",
  "'random-transposition-walk'",
  "'local-adjacent-walk'",
  "'nested-permutation'",
  "'nested-hierarchy'",
  "'nested-interleaved'",
  'Engine.createKey(options)',
  'Engine.validateKey({ ...template, ...proposed, keyId: undefined })',
  'function regionalPredictabilityFraction(',
  'function pointSurfaceRoughness(',
  'function evaluateMetrics(metrics, options = {})',
  'const ignoreAdjacency = options.ignoreAdjacency === true;',
  "concerns.push('axis-coupling')",
  "concerns.push('regional-predictability')",
  "concerns.push('short-range-displacement')",
  "concerns.push('adjacency-retention')",
  'buildComparisonSnapshot',
  'runResearchMatrix'
]));
checks.push(excludes('Key-generation research does not create a second encryption implementation', sources.keyResearch, [
  'function encryptBinary(',
  'function decryptBinary(',
  'function projectionOrderForKey(',
  'function keyFingerprint('
]));
checks.push(includes('Key-generation research worker delegates to the shared research model', sources.keyResearchWorker, [
  "'binary-cube-key-generation-research.js?v=20260809-key-profile-visualizer-1'",
  'const Research = self.BinaryCubeKeyGenerationResearch;',
  'Research.buildProfileSnapshot(',
  "operation !== 'compare-profiles'",
  "type: 'progress'",
  "type: 'result'"
]));
checks.push(excludes('Key-generation worker does not duplicate candidate algorithms', sources.keyResearchWorker, [
  'function iterativePermutation(',
  'function randomWalkPermutation(',
  'function localAdjacentWalkPermutation(',
  'function nestedHierarchyPermutation(',
  'function nestedInterleavedPermutation('
]));
checks.push(includes('3D key-generation visualizer exposes same-seed structural comparison and adjacency policy control', sources.keyResearchVisualizer, [
  'Key Generation Structure Visualizer',
  "const WORKER_URL = 'binary-cube-key-generation-research-worker.js?v=20260809-key-profile-visualizer-1';",
  'new Worker(WORKER_URL)',
  'worker.terminate()',
  'Ignore adjacency as a rejection criterion',
  'Regional predictability',
  'Axis leakage',
  'Surface roughness',
  'source-region colors',
  'actual Latin-cube point field',
  'visual chaos is not proof of cryptographic security',
  'BinaryCubeKeyGenerationVisualizer = Object.freeze'
]));
assert.ok(sources.keyResearchCss.includes('.bcg-viewport'), 'Key-generation visualizer stylesheet must retain its 3D viewport.');
assert.ok(sources.keyResearchCss.includes('.bcg-metrics'), 'Key-generation visualizer stylesheet must retain its metric layout.');
checks.push('Key-generation visualizer stylesheet remains authoritative');

checks.push(includes('Scientific Tools loads the cooperative scheduler and key-generation research launch path', sources.workspace, [
  "const ASSET_VERSION = '20260809-key-profile-visualizer-1';",
  'function loadCooperativeRunner()',
  "loadScript('scientific-tools-cooperative-runner.js'",
  'await loadCooperativeRunner();',
  'function loadKeyGenerationVisualizer()',
  "loadStyle('binary-cube-key-generation-visualizer.css')",
  "loadScript('binary-cube-key-generation-research.js'",
  "loadScript('binary-cube-key-generation-visualizer.js'",
  'function openKeyGenerationVisualizer(',
  'id="scientific-tools-open-key-generation-visualizer"',
  'Compare Key Generators in 3D',
  'adjacency as one diagnostic rather than an automatic failure',
  "loadScript('binary-cube-decryption-dashboard.js'",
  "loadScript('binary-cube-information-analysis-suite.js'",
  "loadScript('binary-cube-communication-capacity-analyzer.js'",
  "loadScript('binary-cube-media-forensics-suite.js'",
  "loadScript('interstellar-media-collisions-lab.js'",
  "loadScript('double-slit-lab.js'"
]));
checks.push(includes('Scientific Tools preserves all four top-level destinations and centralized forensic demonstrations', sources.workspace, [
  'data-scientific-tools-tab="binary-cube"',
  'data-scientific-tools-tab="decryption-dashboard"',
  'data-scientific-tools-tab="ism-media-simulation"',
  'data-scientific-tools-tab="double-slit"',
  'id="scientific-tools-open-binary-cube-visualizer"',
  'id="scientific-tools-open-binary-cube-laboratory"',
  'id="scientific-tools-open-key-generation-visualizer"',
  'id="scientific-tools-open-decryption-dashboard"',
  'id="scientific-tools-open-media-forensics"',
  'id="scientific-tools-open-media-forensics-demos"',
  'id="scientific-tools-open-ism"',
  'id="scientific-tools-open-double-slit"',
  'loadMediaForensicsDemoCorpus',
  'openMediaForensicsDemoCorpus'
]));
for (const tab of ['binary-cube', 'decryption-dashboard', 'ism-media-simulation', 'double-slit']) {
  assert.equal(count(sources.workspace, `data-scientific-tools-tab="${tab}"`), 1, `${tab} tab must have one owner.`);
}
checks.push('Scientific Tools tab ownership is singular');

checks.push(includes('Decryption Dashboard retains bounded Cube-specific attack tools', sources.decryption, [
  'BinaryCubeDecryptionDashboard',
  'ScientificToolsCooperativeRunner',
  'async function runAttackSuite(',
  'function knownKeyDecrypt(',
  'single-byte XOR',
  'Research boundary:'
]));
checks.push(excludes('Decryption Dashboard does not reconstruct canonical encryption', sources.decryption, [
  'ShadowrunBinaryCubeEngine.encryptBinary',
  'Engine.transformBlock',
  'InterstellarMediaCollisionsLab',
  'DoubleSlitExperimentLab'
]));
assert.ok(sources.decryptionCss.includes('.bdd-panel') && sources.decryptionCss.includes('.bdd-results'), 'Decryption Dashboard stylesheet contract changed.');
checks.push('Decryption Dashboard stylesheet remains authoritative');

checks.push(includes('Cryptanalytic Test Lab retains controlled structural and algebraic probes', sources.cryptanalytic, [
  'BinaryCubeCryptanalyticTestLab',
  'avalancheAndTraversalProbe',
  'basisRecoveryProbe',
  'deterministicRepeatProbe',
  'repeatedBlockProbe',
  'lengthOracleProbe',
  'equivalentKeyProbe',
  'projectionPermutation'
]));

checks.push(includes('Information analysis suite retains paper-grounded and broad deobfuscation evidence', sources.information, [
  'BinaryCubeInformationAnalysisSuite',
  "const PAPER_TITLE = 'Language Trees and Zipping';",
  "const MAURER_TITLE = 'A Universal Statistical Test for Random Bit Generators';",
  'function shannonEntropy(',
  'function mutualInformationLag(',
  'async function normalizedCompressionDistance(',
  'async function recursivePeel(',
  'async function rankDeobfuscationCandidates(',
  'cannot prove semantic meaning'
]));
assert.ok(sources.informationCss.includes('.bias-panel') && sources.informationCss.includes('.bias-candidate'), 'Information Analysis stylesheet contract changed.');
checks.push('Information Analysis Suite stylesheet remains authoritative');

checks.push(includes('Communication Capacity Analyzer and worker retain one authoritative statistical model', sources.communication, [
  'BinaryCubeCommunicationCapacityAnalyzer',
  'function zipfAnalysis(',
  'function conditionalEntropy(',
  'function entropyOrderProfile(',
  'function lagMutualInformation(',
  'function analyzeCommunicationCapacity('
]));
checks.push(includes('Communication Capacity worker delegates to the analyzer', sources.communicationWorker, [
  'const Analyzer = self.BinaryCubeCommunicationCapacityAnalyzer;',
  'Analyzer.analyzeCommunicationCapacity(bytes, request.options || {})'
]));
assert.ok(sources.communicationCss.includes('.bcca-panel') && sources.communicationCss.includes('.bcca-metrics'), 'Communication Capacity stylesheet contract changed.');
checks.push('Communication Capacity stylesheet remains authoritative');

checks.push(includes('Media Forensics Suite retains steganography, signal, raster, and container analysis', sources.media, [
  'BinaryCubeMediaForensicsSuite',
  'function extractByteBitPlane(',
  'function convolve1d(',
  'function convolve2d(',
  'function parseWav(',
  'function fftReal(',
  'function decodeDtmf(',
  'function decodeBinaryFsk(',
  'function scanContainer(',
  'function fullForensicSweepAsync('
]));
checks.push(includes('Media Forensics worker delegates to its authoritative suite', sources.mediaWorker, [
  'const Suite = self.BinaryCubeMediaForensicsSuite;',
  'Suite.fullForensicSweep(bytes)'
]));
checks.push(includes('Media Forensics demonstration corpus remains available as known-ground-truth controls', sources.mediaDemos, [
  'BinaryCubeMediaForensicsDemoCorpus',
  'openPanel',
  'openInForensics'
]));
assert.ok(sources.mediaCss.includes('.bmfs-panel') && sources.mediaCss.includes('.bmfs-tab-strip'), 'Media Forensics stylesheet contract changed.');
checks.push('Media Forensics Suite stylesheet remains authoritative');

checks.push(includes('ISM preserves physical, quantum-foam, Shadow, and cooperative execution boundaries', sources.ism, [
  'const LAMBDA = 1.097e-52;',
  'const PLANCK_LENGTH = 1.616255e-35;',
  'function magneticPhysics(config)',
  'function quantumFoamPhysics(config, side, density)',
  'async function simulateAsync(config, options = {})',
  'async function prepareSceneAsync(result, options = {})',
  'ScientificToolsCooperativeRunner',
  'window.InterstellarMediaCollisionsLab = Object.freeze'
]));
checks.push(excludes('ISM remains independent from Cube and Double Slit implementations', sources.ism, [
  'DoubleSlitExperimentLab',
  'ShadowrunBinaryCubeEngine',
  'BinaryCubeKeyGenerationResearch',
  'BinaryCubeDecryptionDashboard'
]));
assert.ok(sources.ismCss.includes('.ism-lab-panel') && sources.ismCss.includes('.ism-face-chart'), 'ISM stylesheet contract changed.');
checks.push('ISM stylesheet remains authoritative');

checks.push(includes('Double Slit preserves accepted baseline, hypothesis separation, and cooperative setup', sources.doubleSlit, [
  "const PANEL_ID = 'double-slit-lab';",
  'function electronWavelength(kineticEv)',
  'function coherentIntensityAtX(x, physics, config)',
  'function registerHypothesisLayer(definition)',
  'ScientificToolsCooperativeRunner',
  'async function buildDistributionAsync(',
  'async function paintDetectorBaseAsync(token)',
  'window.DoubleSlitExperimentLab = Object.freeze'
]));
checks.push(excludes('Double Slit remains independent from ISM and Cube model logic', sources.doubleSlit, [
  'InterstellarMediaCollisionsLab',
  'ShadowrunBinaryCubeEngine',
  'BinaryCubeKeyGenerationResearch',
  'PLANCK_LENGTH'
]));
assert.ok(sources.doubleSlitCss.includes('.dsl-panel') && sources.doubleSlitCss.includes('.dsl-viewport') && sources.doubleSlitCss.includes('.dsl-chart'), 'Double Slit stylesheet contract changed.');
checks.push('Double Slit stylesheet remains authoritative');

checks.push(nonEmpty('Key-generation research visualizer validation script exists', 'scripts/validate-binary-cube-key-generation-visualizer.mjs'));

console.log(JSON.stringify({
  format: 'hb-ttrpg-scientific-tools-main-menu-contract-receipt',
  schemaVersion: '0.13.0',
  pass: true,
  checkCount: checks.length,
  checks
}, null, 2));
