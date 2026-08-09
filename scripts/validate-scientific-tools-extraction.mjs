#!/usr/bin/env node

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const read = relativePath => fs.readFileSync(path.join(root, relativePath), 'utf8');
const sources = Object.freeze({
  shadowrun: read('shadowrun-entry.js'),
  blacklight: read('blacklight-continuum-entry.js'),
  mounts: read('app-lite-view-mounts.js'),
  workspace: read('scientific-tools-entry.js'),
  cooperative: read('scientific-tools-cooperative-runner.js'),
  localMedia: read('scientific-tools-local-media.js'),
  cubeWorker: read('shadowrun-binary-cube-worker.js'),
  cubeWorkerClient: read('binary-cube-worker-client.js'),
  cubeLab: read('shadowrun-binary-cube-encryption.js'),
  keyResearch: read('binary-cube-key-generation-research.js'),
  keyResearchWorker: read('binary-cube-key-generation-research-worker.js'),
  keyVisualizer: read('binary-cube-key-generation-visualizer.js'),
  mediaDemos: read('binary-cube-media-forensics-demo-corpus.js'),
  steganalysisEngine: read('binary-cube-steganalysis-engine.js'),
  steganalysisEvidence: read('binary-cube-steganalysis-evidence-profile.js'),
  steganalysisWorker: read('binary-cube-steganalysis-worker.js'),
  steganalysisWorkerClient: read('binary-cube-steganalysis-worker-client.js'),
  steganalysisLab: read('binary-cube-steganalysis-lab.js'),
  calibrationRegistry: read('binary-cube-diagnostic-calibration-registry.js'),
  calibrationBaseline: read('binary-cube-diagnostic-calibration-baseline.js'),
  diagnosticPipeline: read('binary-cube-diagnostic-pipeline.js'),
  diagnosticPanel: read('binary-cube-diagnostic-pipeline-panel.js'),
  cubicDecryptorEngine: read('binary-cube-cubic-decryptor-engine.js'),
  cubicDecryptorWorker: read('binary-cube-cubic-decryptor-worker.js'),
  cubicDecryptorUi: read('binary-cube-cubic-decryptor.js'),
  diagnosticLocal: read('scripts/run-scientific-diagnostic-local.mjs'),
  calibrationRunner: read('scripts/calibrate-scientific-diagnostic-pipeline.mjs'),
  diagnosticPlan: read('docs/scientific-diagnostic-pipeline-plan.md'),
  ism: read('interstellar-media-collisions-lab.js'),
  doubleSlit: read('double-slit-lab.js')
});

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

checks.push(includes('Shadowrun retains definitive Binary Cube launch targets', sources.shadowrun, [
  "['tools','Binary Cube Encryption Laboratory'", "['tools','Binary Cube Encoder Visualizer'", 'function loadCubeTool()', 'function loadCubeVisualizer()', "loadScript('shadowrun-binary-cube-engine.js'"
]));
checks.push(excludes('Shadowrun does not absorb setting-neutral Scientific Tools', sources.shadowrun, [
  'binary-cube-key-generation-research.js', 'binary-cube-diagnostic-pipeline.js', 'binary-cube-diagnostic-calibration-registry.js', 'binary-cube-cubic-decryptor-engine.js', 'binary-cube-steganalysis-lab.js', 'interstellar-media-collisions-lab.js', 'double-slit-lab.js'
]));
checks.push(includes('Black Light delegates to centralized Scientific Tools', sources.blacklight, [
  'data-blacklight-systems-tab="science"', "prepareView('scientific-tools')", "openSharedScientificTool('openBinaryCubeVisualizer'", "openSharedScientificTool('openBinaryCubeLaboratory'", "openSharedScientificTool('openIsmSimulation'"
]));
checks.push(excludes('Black Light does not duplicate centralized runtimes', sources.blacklight, [
  'binary-cube-diagnostic-pipeline.js', 'binary-cube-diagnostic-calibration-registry.js', 'binary-cube-cubic-decryptor-engine.js', 'binary-cube-steganalysis-engine.js', 'interstellar-media-collisions-lab.js', 'double-slit-lab.js'
]));

checks.push(includes('Main menu owns one cache-refreshed Scientific Tools destination', sources.mounts, [
  "button.dataset.view = 'scientific-tools'", "card.dataset.scientificToolsCard = 'true'", 'routed Diagnostic Evaluation Pipeline', "loadScript('scientific-tools-entry.js?v=20260809-cubic-decryptor-hardening-2')", 'ensureScientificToolsView();'
]));
assert.equal(count(sources.mounts, "card.dataset.scientificToolsCard = 'true'"), 1, 'Scientific Tools must have exactly one main-menu card.');
checks.push('Main menu Scientific Tools ownership is singular');

checks.push(includes('Shared cooperative runner owns bounded deterministic scheduling', sources.cooperative, [
  'ScientificToolsCooperativeRunner', 'const DEFAULT_MAX_SLICE_MS = 8;', 'class CooperativeCancelledError extends Error', 'function createToken(', 'async function forRange(', 'now() - sliceStartedAt >= maxSliceMs', 'await yieldControl()'
]));
checks.push(excludes('Scheduler remains model-neutral', sources.cooperative, ['ShadowrunBinaryCubeEngine', 'BinaryCubeDiagnosticPipeline', 'BinaryCubeSteganalysisEngine', 'DoubleSlitExperimentLab']));

checks.push(includes('Canonical Binary Cube worker delegates to canonical engine', sources.cubeWorker, [
  'const Engine = self.ShadowrunBinaryCubeEngine;', "case 'create-key':", 'Engine.createKey(', "case 'encrypt':", 'Engine.encryptBinary(', "case 'decrypt':", 'Engine.decryptBinary(', 'Engine.validatePackage('
]));
checks.push(excludes('Canonical worker does not duplicate cube transform', sources.cubeWorker, ['function pointDepthForKey(', 'function transformBlockWithKey(', 'rowPermutation[x] + key.columnPermutation[y]']));
checks.push(includes('Worker client owns secure reseeding and cancellation', sources.cubeWorkerClient, ['new Worker(', 'const RESEED_BYTES = 16;', 'crypto.getRandomValues', 'function freshSeed(', 'worker.terminate()', 'function cancelAll(']));
checks.push(includes('Laboratory distinguishes deterministic generation from fresh reseeding', sources.cubeLab, ['data-cube-reseed', "Executor.freshSeed('binary-cube')", 'await generateKey(panel, false)', 'await generateKey(panel, true)', 'Generate Key reproduces this seed exactly.']));

checks.push(includes('Key-generation research remains above canonical engine', sources.keyResearch, [
  "const RESEARCH_SCHEMA_VERSION = 'research-0.4.0';", "'direct-permutation'", "'iterative-chain'", "'random-transposition-walk'", "'local-adjacent-walk'", "'nested-permutation'", "'nested-hierarchy'", "'nested-interleaved'", 'Engine.createKey(options)', 'function regionalPredictabilityFraction(', 'function pointSurfaceRoughness(', 'const ignoreAdjacency = options.ignoreAdjacency === true;'
]));
checks.push(excludes('Key-generation research does not own encryption', sources.keyResearch, ['function encryptBinary(', 'function decryptBinary(', 'function keyFingerprint(']));
checks.push(includes('Key research worker delegates to one model', sources.keyResearchWorker, ['const Research = self.BinaryCubeKeyGenerationResearch;', 'Research.buildProfileSnapshot(', "operation !== 'compare-profiles'", "type: 'progress'", "type: 'result'"]));
checks.push(excludes('Key research worker does not duplicate candidate generators', sources.keyResearchWorker, ['function iterativePermutation(', 'function randomWalkPermutation(', 'function nestedHierarchyPermutation(']));
checks.push(includes('3D key visualizer exposes structural comparison', sources.keyVisualizer, ['Key Generation Structure Visualizer', 'new Worker(WORKER_URL)', 'Ignore adjacency as a rejection criterion', 'Regional predictability', 'Axis leakage', 'Surface roughness', 'actual Latin-cube point field', 'visually chaotic cube is not proof of cryptographic security']));

checks.push(includes('Cubic decryptor delegates generator and cryptographic authority', sources.cubicDecryptorEngine, [
  'BinaryCubeCubicDecryptorEngine', 'Research.generateResearchKey(', 'Engine.decryptBinary(', 'function buildSearchPlan(', "'direct-permutation'", "'iterative-chain'", "'random-transposition-walk'", "'nested-permutation'", "'nested-interleaved'", 'function makeCheckpoint('
]));
checks.push(excludes('Cubic decryptor does not duplicate cube transforms or generators', sources.cubicDecryptorEngine, ['function transformBlockWithKey(', 'function iterativePermutation(', 'function randomWalkPermutation(', 'function nestedPermutation(']));
checks.push(includes('Cubic decryptor worker delegates deterministic attempts', sources.cubicDecryptorWorker, ["'binary-cube-cubic-decryptor-engine.js'", 'Cubic.attemptCandidate(', 'Cubic.makeCheckpoint(', "message.operation !== 'search'"]));
checks.push(includes('Cubic decryptor UI exposes resumable specialist search', sources.cubicDecryptorUi, ['Cubic Decryptor Tool', 'Build staged plan', 'Run / resume decryptor', 'Export checkpoint', 'Recover full plaintext', 'openInformationAnalysisSuite', 'openMediaForensicsSuite', 'regenerateKey(']));

checks.push(includes('Steganalysis engine owns quantitative math', sources.steganalysisEngine, ['BinaryCubeSteganalysisEngine', 'function rsAnalysis(', 'function samplePairAnalysisFromPairs(', 'function localizedRasterAnalysis(', 'function compareRasters(', 'function inspectJpegCoefficients(', 'function analyzeTextSteganography(', 'function rocCurve(']));
checks.push(excludes('Steganalysis engine does not become a media decoder or cipher', sources.steganalysisEngine, ['createImageBitmap(', 'decodeAudioData(', 'function encryptBinary(', 'function decryptBinary(', 'ShadowrunBinaryCubeEngine']));
checks.push(includes('Raster evidence profile preserves detector outputs as separate evidence channels', sources.steganalysisEvidence, ['BinaryCubeSteganalysisEvidenceProfile', "const DEFAULT_CHANNELS = Object.freeze(['r', 'g', 'b', 'luma']);", 'Engine.localizedRasterAnalysis(', 'legacyPayloadMagnitudeEvidence', 'diagnosticFlags', 'evidence vector rather than a new universal steganography score']));
checks.push(excludes('Raster evidence profile does not duplicate detector math', sources.steganalysisEvidence, ['function rsAnalysis(', 'function samplePairAnalysis(', 'function residualCooccurrence(']));
checks.push(includes('Steganalysis worker delegates to authoritative engine and evidence profile', sources.steganalysisWorker, ["importScripts('binary-cube-steganalysis-engine.js?v=20260809-steganalysis-1')", "importScripts('binary-cube-steganalysis-evidence-profile.js?v=20260809-raster-evidence-profile-1')", 'const Engine = self.BinaryCubeSteganalysisEngine;', 'const EvidenceProfile = self.BinaryCubeSteganalysisEvidenceProfile;', 'Engine.localizedRasterAnalysis(', 'EvidenceProfile.profileRaster(', 'Engine.compareRasters(', 'Engine.inspectJpegCoefficients(']));
checks.push(includes('Shared steganalysis worker client owns freeze-safe raster profiling', sources.steganalysisWorkerClient, ['BinaryCubeSteganalysisWorkerClient', 'new Worker(', "run('raster-evidence-profile'", 'new Uint8ClampedArray(rgbaValue)', 'transfer: [rgba.buffer]', 'worker.terminate()', 'function cancelAll(']));
checks.push(includes('Steganalysis lab reuses shared media decoding', sources.steganalysisLab, ['Advanced Steganalysis Laboratory', 'const Media = window.BinaryCubeMediaForensicsSuite;', 'Media.decodeBrowserRaster(', 'Raster RS / SPA', 'Known-cover parity', 'JPEG DCT', 'Text / Unicode', 'Batch / Evaluation', 'Measurements remain separate evidence channels']));

checks.push(includes('Calibration registry owns corpus-bounded detector reliability', sources.calibrationRegistry, [
  'BinaryCubeDiagnosticCalibrationRegistry', 'SHRINKAGE_CASES', 'MIN_MEASURED_CASES', 'priorReliability', 'blindSpots', 'function calibrateDetector(', 'balancedAccuracy', 'effectiveReliability', 'effectiveWeight', 'Calibration measurements describe detector behavior on the tested corpus only', "id: 'cubic-decryptor-search'"
]));
checks.push(includes('Measured calibration baseline preserves observed detector failure', sources.calibrationBaseline, [
  "const VERSION = '20260809-ground-truth-1';", "fixtureId: 'rgb-lsb'", "detectorId: 'raster-steganalysis'", 'observedPositive: false', 'pass: false', 'Measured false negative retained', 'Registry.buildSnapshot('
]));
checks.push(includes('Calibration runner reuses authoritative demo corpus and local decoder', sources.calibrationRunner, [
  "binary-cube-media-forensics-demo-corpus.js", 'BinaryCubeMediaForensicsDemoCorpus', 'LocalMedia.decodePngRgba(', "fixtureId: 'afsk1200'", "detectorId: 'audio-signal-forensics'", 'failed expectation is retained'
]));

checks.push(includes('Diagnostic pipeline owns routing and calibrated evidence aggregation', sources.diagnosticPipeline, [
  'BinaryCubeDiagnosticPipeline', "const VERSION = '0.3.0';", "const REPORT_SCHEMA_VERSION = '0.3.0';", "id: 'information-structure'", "id: 'media-forensic-sweep'", "id: 'audio-signal-forensics'", "id: 'raster-steganalysis'", "id: 'cubic-decryptor-search'", "id: 'binary-cube-attack-suite'", 'BinaryCubeCubicDecryptorEngine', 'recommendedAttemptBudget', 'resolveCalibrationSnapshot', 'calibrationStatus', 'calibrationCases', 'calibrationIndex', 'missRiskEvidence', 'unresolvedEvidenceIndex', 'RASTER_UNRESOLVED_FLAG_WEIGHTS', 'steganalysisWorker?.profileRaster', 'async function runConcurrent(', 'for (const stage of plan.stages)', 'presenceIndex', 'certaintyIndex', 'coverageIndex', 'missRiskIndex', 'decodeBinaryFsk', 'decodeDtmf', 'not posterior probabilities'
]));
checks.push(excludes('Diagnostic orchestrator does not duplicate specialist detector implementations', sources.diagnosticPipeline, ['function rsAnalysis(', 'function samplePairAnalysis(', 'function convolve2d(', 'function decodeBinaryFsk(', 'function decodeDtmf(', 'function encryptBinary(', 'function decryptBinary(']));
checks.push(includes('Diagnostic panel exposes calibration provenance and separated evidence ledger', sources.diagnosticPanel, [
  'Diagnostic Evaluation Pipeline', 'Asset Presence Index', 'Certainty Index', 'Coverage Index', 'Unresolved Evidence Index', 'Undetected / Miss-Risk Index', 'unresolved / miss-risk', 'Calibration provenance', 'Calibration boundary', 'calibrationStatus', 'runtime prior', 'Specialist handoff', 'Continue in Cubic Decryptor', 'openCubicDecryptor', 'Export JSON Report'
]));
checks.push(includes('Local diagnostic runner shares routed model and one local media implementation', sources.diagnosticLocal, [
  "require(path.join(root, 'scientific-tools-local-media.js'))", 'LocalMedia.decodePngRgba(', 'Pipeline.runPipeline(', '--profile=triage|thorough|exhaustive'
]));
checks.push(excludes('Local diagnostic runner does not duplicate PNG decoding', sources.diagnosticLocal, ["import zlib from 'node:zlib'", 'function decodePngRgba(', 'function paeth(']));
checks.push(includes('Shared local media helper owns Node PNG decode', sources.localMedia, ['ScientificToolsLocalMedia', "require('node:zlib')", 'function decodePngRgba(', '8-bit, non-interlaced']));
checks.push(includes('Diagnostic plan records staged local/offline architecture', sources.diagnosticPlan, ['# [SYSTEM REPORT] Scientific Diagnostic Evaluation Pipeline', 'absence of positive evidence', 'Asset Presence Index', 'Certainty Index', 'Coverage Index', 'Undetected / Miss-Risk Index', 'local Node.js runtime', 'Phase 6 — Resumable long-run jobs']));

checks.push(includes('Scientific Tools centrally loads raster evidence and calibration before routed pipeline', sources.workspace, [
  "const ASSET_VERSION = '20260809-cubic-decryptor-hardening-2';", 'function loadDiagnosticPipeline()', "loadScript('binary-cube-key-generation-research.js'", "loadScript('binary-cube-cubic-decryptor-engine.js'", "loadScript('binary-cube-steganalysis-evidence-profile.js'", "loadScript('binary-cube-steganalysis-worker-client.js'", "loadScript('binary-cube-diagnostic-calibration-registry.js'", "loadScript('binary-cube-diagnostic-calibration-baseline.js'", "loadScript('binary-cube-diagnostic-pipeline.js'", "loadScript('binary-cube-diagnostic-pipeline-panel.js'", 'Measured calibration:', 'RGB-LSB false negative', 'function loadCubicDecryptor()', 'id="scientific-tools-open-diagnostic-pipeline"', 'id="scientific-tools-open-cubic-decryptor"', 'absence of positive evidence is not evidence of absence'
]));
checks.push(includes('Scientific Tools preserves established destinations', sources.workspace, ['data-scientific-tools-tab="binary-cube"', 'data-scientific-tools-tab="decryption-dashboard"', 'data-scientific-tools-tab="ism-media-simulation"', 'data-scientific-tools-tab="double-slit"', 'id="scientific-tools-open-binary-cube-visualizer"', 'id="scientific-tools-open-binary-cube-laboratory"', 'id="scientific-tools-open-media-forensics-demos"', 'id="scientific-tools-open-ism"', 'id="scientific-tools-open-double-slit"', 'loadMediaForensicsDemoCorpus', 'openMediaForensicsDemoCorpus']));
for (const tab of ['binary-cube', 'decryption-dashboard', 'ism-media-simulation', 'double-slit']) assert.equal(count(sources.workspace, `data-scientific-tools-tab="${tab}"`), 1, `${tab} must have one owner.`);
checks.push('Scientific Tools tab ownership is singular');

checks.push(includes('Media demonstration corpus remains authoritative and launchable', sources.mediaDemos, ['BinaryCubeMediaForensicsDemoCorpus', 'buildDemoBytes', 'openPanel', 'openInAppropriateTool']));
checks.push(includes('ISM remains cooperative and model-bounded', sources.ism, ['const LAMBDA = 1.097e-52;', 'const PLANCK_LENGTH = 1.616255e-35;', 'function magneticPhysics(config)', 'async function simulateAsync(config, options = {})', 'ScientificToolsCooperativeRunner']));
checks.push(includes('Double Slit remains cooperative with hypothesis separation', sources.doubleSlit, ['function electronWavelength(kineticEv)', 'function coherentIntensityAtX(x, physics, config)', 'function registerHypothesisLayer(definition)', 'async function buildDistributionAsync(', 'ScientificToolsCooperativeRunner']));

for (const relativePath of [
  'scientific-tools-local-media.js', 'binary-cube-key-generation-visualizer.css', 'scripts/validate-binary-cube-key-generation-visualizer.mjs', 'binary-cube-decryption-dashboard.css', 'binary-cube-cryptanalytic-test-lab.css', 'binary-cube-information-analysis-suite.css', 'binary-cube-communication-capacity-analyzer.css', 'binary-cube-media-forensics-suite.css', 'binary-cube-steganalysis-engine.js', 'binary-cube-steganalysis-evidence-profile.js', 'binary-cube-steganalysis-worker.js', 'binary-cube-steganalysis-worker-client.js', 'binary-cube-steganalysis-lab.css', 'scripts/validate-binary-cube-steganalysis-lab.mjs', 'scripts/validate-diagnostic-raster-evidence-routing.mjs', 'binary-cube-diagnostic-calibration-registry.js', 'binary-cube-diagnostic-calibration-baseline.js', 'binary-cube-diagnostic-pipeline.css', 'binary-cube-cubic-decryptor.css', 'scripts/validate-binary-cube-cubic-decryptor.mjs', 'scripts/validate-scientific-diagnostic-pipeline.mjs', 'scripts/calibrate-scientific-diagnostic-pipeline.mjs', 'scripts/validate-scientific-diagnostic-calibration.mjs', 'scripts/run-scientific-diagnostic-local.mjs', 'docs/scientific-diagnostic-pipeline-plan.md', 'interstellar-media-collisions-lab.css', 'double-slit-lab.css'
]) nonEmpty(relativePath);
checks.push('Scientific Tools styles, raster evidence routing, calibration data, local runtime, plan, and validators are present');

console.log(JSON.stringify({
  format: 'hb-ttrpg-scientific-tools-main-menu-contract-receipt',
  schemaVersion: '0.19.0',
  pass: true,
  checkCount: checks.length,
  checks
}, null, 2));