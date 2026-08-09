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
const keyResearch = read('binary-cube-key-generation-research.js');
const keyResearchWorker = read('binary-cube-key-generation-research-worker.js');
const keyVisualizer = read('binary-cube-key-generation-visualizer.js');
const mediaDemos = read('binary-cube-media-forensics-demo-corpus.js');
const steganalysisEngine = read('binary-cube-steganalysis-engine.js');
const steganalysisWorker = read('binary-cube-steganalysis-worker.js');
const steganalysisLab = read('binary-cube-steganalysis-lab.js');
const ism = read('interstellar-media-collisions-lab.js');
const doubleSlit = read('double-slit-lab.js');

function includes(label, source, values) {
  for (const value of values) assert.ok(source.includes(value), `${label}: missing ${JSON.stringify(value)}`);
  return label;
}
function excludes(label, source, values) {
  for (const value of values) assert.ok(!source.includes(value), `${label}: forbidden ${JSON.stringify(value)}`);
  return label;
}
function count(source, needle) { return source.split(needle).length - 1; }
function nonEmpty(relativePath) {
  const absolutePath = path.join(root, relativePath);
  assert.ok(fs.existsSync(absolutePath), `${relativePath} is missing.`);
  assert.ok(fs.statSync(absolutePath).size > 0, `${relativePath} is empty.`);
}

const checks = [];

checks.push(includes('Shadowrun retains the definitive Binary Cube launch targets', shadowrun, [
  "['tools','Binary Cube Encryption Laboratory'",
  "['tools','Binary Cube Encoder Visualizer'",
  'function loadCubeTool()',
  'function loadCubeVisualizer()',
  "loadScript('shadowrun-binary-cube-engine.js'"
]));
checks.push(excludes('Shadowrun does not absorb setting-neutral research/simulation implementations', shadowrun, [
  'binary-cube-key-generation-research.js',
  'binary-cube-key-generation-visualizer.js',
  'binary-cube-decryption-dashboard.js',
  'binary-cube-information-analysis-suite.js',
  'binary-cube-communication-capacity-analyzer.js',
  'binary-cube-media-forensics-suite.js',
  'binary-cube-steganalysis-engine.js',
  'binary-cube-steganalysis-lab.js',
  'interstellar-media-collisions-lab.js',
  'double-slit-lab.js'
]));

checks.push(includes('Black Light delegates to centralized Scientific Tools', blacklight, [
  'data-blacklight-systems-tab="science"',
  "prepareView('scientific-tools')",
  "openSharedScientificTool('openBinaryCubeVisualizer'",
  "openSharedScientificTool('openBinaryCubeLaboratory'",
  "openSharedScientificTool('openIsmSimulation'"
]));
checks.push(excludes('Black Light does not duplicate centralized runtimes', blacklight, [
  'binary-cube-key-generation-research.js',
  'binary-cube-key-generation-visualizer.js',
  'shadowrun-binary-cube-engine.js',
  'binary-cube-steganalysis-engine.js',
  'binary-cube-steganalysis-lab.js',
  'interstellar-media-collisions-lab.js',
  'double-slit-lab.js'
]));

checks.push(includes('Main menu owns and cache-refreshes Scientific Tools', mounts, [
  "button.dataset.view = 'scientific-tools'",
  "card.dataset.scientificToolsCard = 'true'",
  'key-generation structure comparison',
  'Advanced Steganalysis Laboratory',
  "loadScript('scientific-tools-entry.js?v=20260809-steganalysis-1')",
  'ensureScientificToolsView();'
]));
assert.equal(count(mounts, "card.dataset.scientificToolsCard = 'true'"), 1, 'Scientific Tools must have exactly one main-menu card.');
checks.push('Main menu owns one Scientific Tools destination');

checks.push(includes('Shared cooperative runner owns bounded deterministic scheduling', cooperative, [
  'ScientificToolsCooperativeRunner',
  'const DEFAULT_MAX_SLICE_MS = 8;',
  'class CooperativeCancelledError extends Error',
  'function createToken(',
  'async function forRange(',
  'now() - sliceStartedAt >= maxSliceMs',
  'await yieldControl()'
]));
checks.push(excludes('Scheduler remains model-neutral', cooperative, [
  'ShadowrunBinaryCubeEngine',
  'BinaryCubeKeyGenerationResearch',
  'BinaryCubeSteganalysisEngine',
  'DoubleSlitExperimentLab',
  'LAMBDA_COEFFICIENT'
]));

checks.push(includes('Canonical Binary Cube worker delegates to the canonical engine', cubeWorker, [
  'const Engine = self.ShadowrunBinaryCubeEngine;',
  "case 'create-key':",
  'Engine.createKey(',
  "case 'encrypt':",
  'Engine.encryptBinary(',
  "case 'decrypt':",
  'Engine.decryptBinary(',
  "case 'validate-pair':",
  'Engine.validatePackage('
]));
checks.push(excludes('Canonical worker does not duplicate the cube transform', cubeWorker, [
  'function pointDepthForKey(',
  'function transformBlockWithKey(',
  'rowPermutation[x] + key.columnPermutation[y]'
]));
checks.push(includes('Worker client owns secure reseeding and cancellation', cubeWorkerClient, [
  'new Worker(',
  'const RESEED_BYTES = 16;',
  'crypto.getRandomValues',
  'function freshSeed(',
  'worker.terminate()',
  'function cancelAll('
]));
checks.push(includes('Laboratory distinguishes deterministic generation from fresh reseeding', cubeLab, [
  'data-cube-reseed',
  "Executor.freshSeed('binary-cube')",
  'await generateKey(panel, false)',
  'await generateKey(panel, true)',
  'Generate Key reproduces this seed exactly.'
]));

checks.push(includes('Key-generation research remains a shared candidate model above the canonical engine', keyResearch, [
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
  'const ignoreAdjacency = options.ignoreAdjacency === true;'
]));
checks.push(excludes('Research model does not own encryption/decryption', keyResearch, [
  'function encryptBinary(',
  'function decryptBinary(',
  'function keyFingerprint('
]));
checks.push(includes('Research worker delegates candidate snapshots to the shared model', keyResearchWorker, [
  'const Research = self.BinaryCubeKeyGenerationResearch;',
  'Research.buildProfileSnapshot(',
  "operation !== 'compare-profiles'",
  "type: 'progress'",
  "type: 'result'"
]));
checks.push(excludes('Research worker does not duplicate candidate generators', keyResearchWorker, [
  'function iterativePermutation(',
  'function randomWalkPermutation(',
  'function localAdjacentWalkPermutation(',
  'function nestedHierarchyPermutation('
]));
checks.push(includes('3D key-generation visualizer exposes same-seed structural comparison', keyVisualizer, [
  'Key Generation Structure Visualizer',
  'new Worker(WORKER_URL)',
  'worker.terminate()',
  'Ignore adjacency as a rejection criterion',
  'Regional predictability',
  'Axis leakage',
  'Surface roughness',
  'actual Latin-cube point field',
  'visually chaotic cube is not proof of cryptographic security',
  'BinaryCubeKeyGenerationVisualizer = Object.freeze'
]));

checks.push(includes('Advanced steganalysis engine owns quantitative and parity math', steganalysisEngine, [
  'BinaryCubeSteganalysisEngine',
  'function rsAnalysis(',
  'function samplePairAnalysisFromPairs(',
  'function localizedRasterAnalysis(',
  'function residualCooccurrence(',
  'function compareRasters(',
  'function inspectJpegCoefficients(',
  'function analyzeTextSteganography(',
  'function confusionMetrics(',
  'function rocCurve(',
  'function regressionMetrics(',
  'function recoveredBitMetrics('
]));
checks.push(excludes('Steganalysis engine does not become a second media decoder or Binary Cube cipher', steganalysisEngine, [
  'createImageBitmap(',
  'decodeAudioData(',
  'function encryptBinary(',
  'function decryptBinary(',
  'ShadowrunBinaryCubeEngine'
]));
checks.push(includes('Steganalysis worker delegates heavy analysis to one engine', steganalysisWorker, [
  "importScripts('binary-cube-steganalysis-engine.js?v=20260809-steganalysis-1')",
  'const Engine = self.BinaryCubeSteganalysisEngine;',
  'Engine.localizedRasterAnalysis(',
  'Engine.compareRasters(',
  'Engine.inspectJpegCoefficients(',
  'Engine.analyzeRasterRegion('
]));
checks.push(excludes('Steganalysis worker does not duplicate detector implementations', steganalysisWorker, [
  'function rsAnalysis(',
  'function samplePairAnalysis(',
  'function compareRasters(',
  'function inspectJpegCoefficients('
]));
checks.push(includes('Steganalysis lab reuses shared media decoding and worker-backed detector execution', steganalysisLab, [
  'Advanced Steganalysis Laboratory',
  'const Engine = window.BinaryCubeSteganalysisEngine;',
  'const Media = window.BinaryCubeMediaForensicsSuite;',
  'Media.decodeBrowserRaster(',
  'new Worker(new URL(WORKER_URL, document.baseURI).href)',
  "runWorker('localized-raster'",
  "runWorker('compare-raster'",
  "runWorker('jpeg-coefficients'",
  'Raster RS / SPA',
  'Known-cover parity',
  'JPEG DCT',
  'Text / Unicode',
  'Batch / Evaluation',
  'ROC AUC',
  'Measurements remain separate evidence channels'
]));
checks.push(excludes('Steganalysis UI does not invent a single opaque probability', steganalysisLab, [
  'Steganography Probability'
]));

checks.push(includes('Scientific Tools owns one launch for the key-generation visualizer and steganalysis lab', workspace, [
  "const ASSET_VERSION = '20260809-steganalysis-1';",
  'function loadKeyGenerationVisualizer()',
  "loadStyle('binary-cube-key-generation-visualizer.css')",
  "loadScript('binary-cube-key-generation-research.js'",
  "loadScript('binary-cube-key-generation-visualizer.js'",
  'function openKeyGenerationVisualizer(',
  'id="scientific-tools-open-key-generation-visualizer"',
  'Compare Key Generators in 3D',
  'adjacency as one diagnostic rather than an automatic failure',
  'function loadSteganalysisLab()',
  "loadStyle('binary-cube-steganalysis-lab.css')",
  "loadScript('binary-cube-steganalysis-engine.js'",
  "loadScript('binary-cube-steganalysis-lab.js'",
  'function openSteganalysisLab(',
  'id="scientific-tools-open-steganalysis"',
  'Open Advanced Steganalysis Laboratory'
]));
checks.push(includes('Scientific Tools preserves its established destinations and demo corpus', workspace, [
  'data-scientific-tools-tab="binary-cube"',
  'data-scientific-tools-tab="decryption-dashboard"',
  'data-scientific-tools-tab="ism-media-simulation"',
  'data-scientific-tools-tab="double-slit"',
  'id="scientific-tools-open-binary-cube-visualizer"',
  'id="scientific-tools-open-binary-cube-laboratory"',
  'id="scientific-tools-open-decryption-dashboard"',
  'id="scientific-tools-open-media-forensics-demos"',
  'id="scientific-tools-open-ism"',
  'id="scientific-tools-open-double-slit"',
  'loadMediaForensicsDemoCorpus',
  'openMediaForensicsDemoCorpus'
]));
for (const tab of ['binary-cube', 'decryption-dashboard', 'ism-media-simulation', 'double-slit']) {
  assert.equal(count(workspace, `data-scientific-tools-tab="${tab}"`), 1, `${tab} must have one owner.`);
}
checks.push('Scientific Tools tab ownership is singular');

checks.push(includes('Media demonstration corpus remains launchable', mediaDemos, [
  'BinaryCubeMediaForensicsDemoCorpus',
  'openPanel',
  'openInAppropriateTool'
]));
checks.push(includes('ISM remains cooperatively executed and model-bounded', ism, [
  'const LAMBDA = 1.097e-52;',
  'const PLANCK_LENGTH = 1.616255e-35;',
  'function magneticPhysics(config)',
  'async function simulateAsync(config, options = {})',
  'ScientificToolsCooperativeRunner'
]));
checks.push(includes('Double Slit remains cooperatively executed with hypothesis separation', doubleSlit, [
  'function electronWavelength(kineticEv)',
  'function coherentIntensityAtX(x, physics, config)',
  'function registerHypothesisLayer(definition)',
  'async function buildDistributionAsync(',
  'ScientificToolsCooperativeRunner'
]));

for (const relativePath of [
  'binary-cube-key-generation-visualizer.css',
  'scripts/validate-binary-cube-key-generation-visualizer.mjs',
  'binary-cube-decryption-dashboard.css',
  'binary-cube-cryptanalytic-test-lab.css',
  'binary-cube-information-analysis-suite.css',
  'binary-cube-communication-capacity-analyzer.css',
  'binary-cube-media-forensics-suite.css',
  'binary-cube-steganalysis-lab.css',
  'scripts/validate-binary-cube-steganalysis-lab.mjs',
  'interstellar-media-collisions-lab.css',
  'double-slit-lab.css'
]) nonEmpty(relativePath);
checks.push('Scientific Tools styles and specialized validators are present');

console.log(JSON.stringify({
  format: 'hb-ttrpg-scientific-tools-main-menu-contract-receipt',
  schemaVersion: '0.14.0',
  pass: true,
  checkCount: checks.length,
  checks
}, null, 2));
