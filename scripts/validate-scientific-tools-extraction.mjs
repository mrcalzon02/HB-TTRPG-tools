#!/usr/bin/env node

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const read = relativePath => fs.readFileSync(path.join(root, relativePath), 'utf8');
const source = Object.freeze({
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
  keyVisualizer: read('binary-cube-key-generation-visualizer.js'),
  keyVisualizerCss: read('binary-cube-key-generation-visualizer.css'),
  decryption: read('binary-cube-decryption-dashboard.js'),
  information: read('binary-cube-information-analysis-suite.js'),
  communication: read('binary-cube-communication-capacity-analyzer.js'),
  communicationWorker: read('binary-cube-communication-capacity-worker.js'),
  media: read('binary-cube-media-forensics-suite.js'),
  mediaWorker: read('binary-cube-media-forensics-worker.js'),
  mediaDemos: read('binary-cube-media-forensics-demo-corpus.js'),
  ism: read('interstellar-media-collisions-lab.js'),
  doubleSlit: read('double-slit-lab.js')
});

function includes(label, haystack, needles) {
  for (const needle of needles) assert.ok(haystack.includes(needle), `${label}: missing ${JSON.stringify(needle)}`);
  return label;
}
function excludes(label, haystack, needles) {
  for (const needle of needles) assert.ok(!haystack.includes(needle), `${label}: forbidden ${JSON.stringify(needle)}`);
  return label;
}
function count(haystack, needle) { return haystack.split(needle).length - 1; }
function nonEmpty(relativePath) {
  const absolutePath = path.join(root, relativePath);
  assert.ok(fs.existsSync(absolutePath), `${relativePath} is missing.`);
  assert.ok(fs.statSync(absolutePath).size > 0, `${relativePath} is empty.`);
}

const checks = [];

checks.push(includes('Shadowrun retains the definitive Binary Cube launch surface', source.shadowrun, [
  "['tools','Binary Cube Encryption Laboratory'",
  "['tools','Binary Cube Encoder Visualizer'",
  'function loadCubeTool()',
  'function loadCubeVisualizer()',
  "loadScript('shadowrun-binary-cube-engine.js'"
]));
checks.push(excludes('Shadowrun does not absorb setting-neutral research and simulation modules', source.shadowrun, [
  'binary-cube-key-generation-research.js',
  'binary-cube-key-generation-visualizer.js',
  'binary-cube-decryption-dashboard.js',
  'binary-cube-information-analysis-suite.js',
  'binary-cube-communication-capacity-analyzer.js',
  'binary-cube-media-forensics-suite.js',
  'interstellar-media-collisions-lab.js',
  'double-slit-lab.js'
]));

checks.push(includes('Black Light delegates science to the centralized workspace', source.blacklight, [
  'data-blacklight-systems-tab="science"',
  "prepareView('scientific-tools')",
  "openSharedScientificTool('openBinaryCubeVisualizer'",
  "openSharedScientificTool('openBinaryCubeLaboratory'",
  "openSharedScientificTool('openIsmSimulation'"
]));
checks.push(excludes('Black Light does not duplicate centralized implementations', source.blacklight, [
  'binary-cube-key-generation-research.js',
  'binary-cube-key-generation-visualizer.js',
  'shadowrun-binary-cube-engine.js',
  'interstellar-media-collisions-lab.js',
  'double-slit-lab.js'
]));

checks.push(includes('Main menu owns and cache-refreshes Scientific Tools', source.mounts, [
  "button.dataset.view = 'scientific-tools'",
  "card.dataset.scientificToolsCard = 'true'",
  "loadScript('scientific-tools-entry.js?v=20260809-key-profile-visualizer-1')",
  'key-generation structure comparison',
  'ensureScientificToolsView();'
]));
assert.equal(count(source.mounts, "card.dataset.scientificToolsCard = 'true'"), 1, 'Scientific Tools menu card must have one owner.');
checks.push('Main menu owns one Scientific Tools destination');

checks.push(includes('Cooperative runner preserves bounded deterministic execution', source.cooperative, [
  'ScientificToolsCooperativeRunner',
  'const DEFAULT_MAX_SLICE_MS = 8;',
  'class CooperativeCancelledError extends Error',
  'function createToken(',
  'function assertActive(',
  'async function forRange(',
  'now() - sliceStartedAt >= maxSliceMs',
  'await yieldControl()'
]));
checks.push(excludes('Cooperative runner owns scheduling rather than scientific models', source.cooperative, [
  'ShadowrunBinaryCubeEngine',
  'BinaryCubeKeyGenerationResearch',
  'DoubleSlitExperimentLab',
  'LAMBDA_COEFFICIENT'
]));

checks.push(includes('Canonical Binary Cube worker delegates heavy mathematics to the canonical engine', source.cubeWorker, [
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
checks.push(excludes('Canonical worker does not duplicate the cube transform', source.cubeWorker, [
  'function pointDepthForKey(',
  'function transformBlockWithKey(',
  'rowPermutation[x] + key.columnPermutation[y]'
]));
checks.push(includes('Worker client owns secure reseeding and cancellation', source.cubeWorkerClient, [
  'new Worker(',
  'const RESEED_BYTES = 16;',
  'crypto.getRandomValues',
  'function freshSeed(',
  'worker.terminate()',
  'function cancelAll('
]));
checks.push(includes('Laboratory distinguishes deterministic generation from fresh reseeding', source.cubeLab, [
  'data-cube-reseed',
  "Executor.freshSeed('binary-cube')",
  'await generateKey(panel, false)',
  'await generateKey(panel, true)',
  'Generate Key reproduces this seed exactly.'
]));

checks.push(includes('Shared key-generation research model covers direct, iterative, walk, and nested families', source.keyResearch, [
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
  'const ignoreAdjacency = options.ignoreAdjacency === true;',
  "concerns.push('axis-coupling')",
  "concerns.push('regional-predictability')",
  "concerns.push('short-range-displacement')",
  "concerns.push('adjacency-retention')"
]));
checks.push(excludes('Research model does not create a second encryption implementation', source.keyResearch, [
  'function encryptBinary(',
  'function decryptBinary(',
  'function keyFingerprint('
]));
checks.push(includes('Research worker delegates profile generation to the shared model', source.keyResearchWorker, [
  'const Research = self.BinaryCubeKeyGenerationResearch;',
  'Research.buildProfileSnapshot(',
  "operation !== 'compare-profiles'",
  "type: 'progress'",
  "type: 'result'"
]));
checks.push(excludes('Research worker does not duplicate candidate generators', source.keyResearchWorker, [
  'function iterativePermutation(',
  'function randomWalkPermutation(',
  'function localAdjacentWalkPermutation(',
  'function nestedHierarchyPermutation('
]));
checks.push(includes('3D research visualizer exposes same-seed structural evidence and adjacency policy controls', source.keyVisualizer, [
  'Key Generation Structure Visualizer',
  'new Worker(WORKER_URL)',
  'worker.terminate()',
  'Ignore adjacency as a rejection criterion',
  'Regional predictability',
  'Axis leakage',
  'Surface roughness',
  'source-region colors',
  'actual Latin-cube point field',
  'visually chaotic cube is not proof of cryptographic security',
  'BinaryCubeKeyGenerationVisualizer = Object.freeze'
]));
nonEmpty('binary-cube-key-generation-visualizer.css');
assert.ok(source.keyVisualizerCss.includes('.bcg-viewport') && source.keyVisualizerCss.includes('.bcg-metrics'));
checks.push('Key-generation 3D stylesheet remains authoritative');

checks.push(includes('Scientific Tools launches one shared key-generation research visualizer', source.workspace, [
  "const ASSET_VERSION = '20260809-key-profile-visualizer-1';",
  'function loadKeyGenerationVisualizer()',
  "loadStyle('binary-cube-key-generation-visualizer.css')",
  "loadScript('binary-cube-key-generation-research.js'",
  "loadScript('binary-cube-key-generation-visualizer.js'",
  'function openKeyGenerationVisualizer(',
  'id="scientific-tools-open-key-generation-visualizer"',
  'Compare Key Generators in 3D',
  'adjacency as one diagnostic rather than an automatic failure'
]));
checks.push(includes('Scientific Tools retains Binary Cube, cryptanalysis, ISM, Double Slit, and forensic demonstration launches', source.workspace, [
  'data-scientific-tools-tab="binary-cube"',
  'data-scientific-tools-tab="decryption-dashboard"',
  'data-scientific-tools-tab="ism-media-simulation"',
  'data-scientific-tools-tab="double-slit"',
  'id="scientific-tools-open-binary-cube-visualizer"',
  'id="scientific-tools-open-binary-cube-laboratory"',
  'id="scientific-tools-open-decryption-dashboard"',
  'id="scientific-tools-open-media-forensics"',
  'id="scientific-tools-open-media-forensics-demos"',
  'id="scientific-tools-open-ism"',
  'id="scientific-tools-open-double-slit"',
  'loadMediaForensicsDemoCorpus',
  'openMediaForensicsDemoCorpus'
]));
for (const tab of ['binary-cube', 'decryption-dashboard', 'ism-media-simulation', 'double-slit']) {
  assert.equal(count(source.workspace, `data-scientific-tools-tab="${tab}"`), 1, `${tab} must have one tab owner.`);
}
checks.push('Scientific Tools tab ownership is singular');

checks.push(includes('Decryption Dashboard remains a separate bounded cryptanalysis module', source.decryption, [
  'BinaryCubeDecryptionDashboard',
  'ScientificToolsCooperativeRunner',
  'async function runAttackSuite(',
  'function knownKeyDecrypt(',
  'Research boundary:'
]));
checks.push(includes('Information suite remains a separate information/deobfuscation module', source.information, [
  'BinaryCubeInformationAnalysisSuite',
  'function shannonEntropy(',
  'function mutualInformationLag(',
  'async function rankDeobfuscationCandidates('
]));
checks.push(includes('Communication Capacity worker delegates to its analyzer', source.communicationWorker, [
  'const Analyzer = self.BinaryCubeCommunicationCapacityAnalyzer;',
  'Analyzer.analyzeCommunicationCapacity(bytes, request.options || {})'
]));
checks.push(includes('Media Forensics worker delegates to its suite and retains known-ground-truth demonstrations', source.mediaWorker, [
  'const Suite = self.BinaryCubeMediaForensicsSuite;',
  'Suite.fullForensicSweep(bytes)'
]));
checks.push(includes('Media demonstration corpus remains launchable', source.mediaDemos, [
  'BinaryCubeMediaForensicsDemoCorpus',
  'openPanel',
  'openInForensics'
]));
checks.push(includes('ISM retains physical/hypothesis boundaries and cooperative execution', source.ism, [
  'const LAMBDA = 1.097e-52;',
  'const PLANCK_LENGTH = 1.616255e-35;',
  'function magneticPhysics(config)',
  'async function simulateAsync(config, options = {})',
  'ScientificToolsCooperativeRunner'
]));
checks.push(includes('Double Slit retains accepted baseline/hypothesis separation and cooperative setup', source.doubleSlit, [
  'function electronWavelength(kineticEv)',
  'function coherentIntensityAtX(x, physics, config)',
  'function registerHypothesisLayer(definition)',
  'async function buildDistributionAsync(',
  'ScientificToolsCooperativeRunner'
]));

for (const requiredFile of [
  'binary-cube-decryption-dashboard.css',
  'binary-cube-cryptanalytic-test-lab.css',
  'binary-cube-information-analysis-suite.css',
  'binary-cube-communication-capacity-analyzer.css',
  'binary-cube-media-forensics-suite.css',
  'interstellar-media-collisions-lab.css',
  'double-slit-lab.css',
  'scripts/validate-binary-cube-key-generation-visualizer.mjs'
]) nonEmpty(requiredFile);
checks.push('Scientific Tools styles and specialized key-generation validator are present');

console.log(JSON.stringify({
  format: 'hb-ttrpg-scientific-tools-main-menu-contract-receipt',
  schemaVersion: '0.13.1',
  pass: true,
  checkCount: checks.length,
  checks
}, null, 2));
