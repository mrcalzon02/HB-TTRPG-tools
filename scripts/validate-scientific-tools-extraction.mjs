#!/usr/bin/env node

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

const root = process.cwd();
const read = relativePath => fs.readFileSync(path.join(root, relativePath), 'utf8');
const sources = Object.freeze({
  shadowrun: read('shadowrun-entry.js'),
  blacklight: read('blacklight-continuum-entry.js'),
  mounts: read('app-lite-view-mounts.js'),
  workspace: read('scientific-tools-entry.js'),
  cooperative: read('scientific-tools-cooperative-runner.js'),
  help: read('scientific-tools-help.js'),
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
  cubicDecryptorPool: read('binary-cube-cubic-decryptor-worker-pool.js'),
  cubicDecryptorWebGpu: read('binary-cube-cubic-decryptor-webgpu.js'),
  cubicDecryptorWorker: read('binary-cube-cubic-decryptor-worker.js'),
  cubicDecryptorUi: read('binary-cube-cubic-decryptor.js'),
  diagnosticLocal: read('scripts/run-scientific-diagnostic-local.mjs'),
  calibrationRunner: read('scripts/calibrate-scientific-diagnostic-pipeline.mjs'),
  diagnosticPlan: read('docs/scientific-diagnostic-pipeline-plan.md'),
  pageShell: read('scientific-laboratory-page.js'),
  signalsPage: read('signals-laboratory.html'),
  liveSignalsPage: read('live-signals-laboratory.html'),
  audioPage: read('audio-laboratory.html'),
  ismPage: read('interstellar-media-collisions-laboratory.html'),
  doubleSlitPage: read('double-slit-laboratory.html'),
  gravityPage: read('gravitational-simulation-laboratory.html'),
  ism: read('interstellar-media-collisions-lab.js'),
  doubleSlit: read('double-slit-lab.js'),
  gravity: read('gravitational-simulation-lab.js')
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

const Gravity = require('../gravitational-simulation-lab.js');
const gravitySphere = Gravity.normalizeBody({name:'sphere',shape:'sphere',massMode:'mass',massKg:5e20,dimensionsM:{x:2000,y:2000,z:2000},rotationDeg:{x:0,y:0,z:0},position:{x:0,y:0,z:0},velocity:{x:0,y:0,z:0}});
const gravityCube = Gravity.normalizeBody({name:'cube',shape:'cube',massMode:'mass',massKg:1e20,dimensionsM:{x:2000,y:3000,z:4000},rotationDeg:{x:10,y:20,z:30},position:{x:-5000,y:0,z:0},velocity:{x:0,y:0,z:0}});
const gravityTorus = Gravity.normalizeBody({name:'torus',shape:'torus',massMode:'mass',massKg:2e20,dimensionsM:{x:3000,y:3000,z:1000},rotationDeg:{x:40,y:0,z:10},position:{x:5000,y:0,z:0},velocity:{x:0,y:0,z:0}});
assert.ok(Math.abs(Gravity.bodyVolumeM3(gravitySphere) - 4/3*Math.PI*1e9) < 1e-3);
const gravitySamples = Gravity.buildMassSamples(gravityCube,4);
assert.ok(gravitySamples.length > 0);
assert.ok(Math.abs(gravitySamples.reduce((sum,row)=>sum+row.massKg,0)-gravityCube.massKg)/gravityCube.massKg < 1e-12);
const gravityField = Gravity.fieldAccelerationFromBody(gravitySphere,{x:10000,y:0,z:0},{model:'extended',resolution:4,farFieldFactor:0});
const gravityExpected = Gravity.constants.G*gravitySphere.massKg/1e8;
assert.ok(Math.abs(Math.abs(gravityField.x)-gravityExpected)/gravityExpected < 1e-12);
const gravityAcc = Gravity.accelerations([gravityCube,gravityTorus],{model:'extended',resolution:4,farFieldFactor:0});
const gravityResidual = Math.hypot(gravityCube.massKg*gravityAcc[0].x+gravityTorus.massKg*gravityAcc[1].x,gravityCube.massKg*gravityAcc[0].y+gravityTorus.massKg*gravityAcc[1].y,gravityCube.massKg*gravityAcc[0].z+gravityTorus.massKg*gravityAcc[1].z);
assert.ok(gravityResidual < 1e-6);
const gravityGeometry = Gravity.geometryDiagnostics([gravityCube,gravityTorus],{model:'extended',resolution:4,farFieldFactor:0});
assert.ok(Number.isFinite(gravityGeometry.farFieldDelta) && Number.isFinite(gravityGeometry.convergence));
const gravityL4 = Gravity.restrictedThreeBodyState(Gravity.constants.EARTH_MASS,Gravity.constants.MOON_MASS,Gravity.constants.MOON_DISTANCE_M,'L4');
const gravityL1 = Gravity.restrictedThreeBodyState(Gravity.constants.EARTH_MASS,Gravity.constants.MOON_MASS,Gravity.constants.MOON_DISTANCE_M,'L1');
assert.ok(Math.abs(Math.hypot(gravityL4.position.x-gravityL4.x1,gravityL4.position.y)-gravityL4.separationM)/gravityL4.separationM < 1e-12);
assert.ok(Math.abs(Math.hypot(gravityL4.position.x-gravityL4.x2,gravityL4.position.y)-gravityL4.separationM)/gravityL4.separationM < 1e-12);
assert.ok(gravityL1.position.x>gravityL1.x1 && gravityL1.position.x<gravityL1.x2);
assert.ok(Math.abs(Gravity.effectiveRotatingAccelerationX(gravityL1.position.x,Gravity.constants.EARTH_MASS,Gravity.constants.MOON_MASS,gravityL1.x1,gravityL1.x2,gravityL1.omega)) < 1e-8);
const gravityPotential = Gravity.potentialFromBody(gravitySphere,{x:10000,y:0,z:0},{model:'extended'});
assert.ok(Math.abs(gravityPotential + Gravity.constants.G*gravitySphere.massKg/10000)/Math.abs(gravityPotential) < 1e-12);
const gravityTidal = Gravity.tidalTensorFromBody(gravitySphere,{x:10000,y:0,z:0},{model:'extended'});
assert.ok(Math.abs(gravityTidal[0]+gravityTidal[3]+gravityTidal[5]) < Gravity.tidalFrobeniusNorm(gravityTidal)*1e-12);
const gravityCollisionA = Gravity.normalizeBody({name:'A',shape:'sphere',massMode:'mass',massKg:2e10,dimensionsM:{x:2000,y:2000,z:2000},rotationDeg:{x:0,y:0,z:0},position:{x:-900,y:0,z:0},velocity:{x:10,y:0,z:0}});
const gravityCollisionB = Gravity.normalizeBody({name:'B',shape:'sphere',massMode:'mass',massKg:3e10,dimensionsM:{x:2000,y:2000,z:2000},rotationDeg:{x:0,y:0,z:0},position:{x:900,y:0,z:0},velocity:{x:-5,y:0,z:0}});
const gravityMerge = Gravity.mergeCollisionBodies(gravityCollisionA,gravityCollisionB);
assert.equal(gravityMerge.audit.massRelativeError,0);
assert.ok(gravityMerge.audit.momentumResidual < 1e-6);
const gravityElastic = Gravity.elasticSphereCollisionResult(gravityCollisionA,gravityCollisionB);
assert.equal(gravityElastic.valid,true);
assert.ok(Math.abs(gravityElastic.audit.kineticRelativeError) < 1e-12);
const gravityCollisionCube = Gravity.normalizeBody({name:'Cube',shape:'cube',massMode:'mass',massKg:1e10,dimensionsM:{x:2000,y:2000,z:2000},rotationDeg:{x:0,y:0,z:0},position:{x:0,y:0,z:0},velocity:{x:0,y:0,z:0}});
assert.equal(Gravity.elasticSphereCollisionResult(gravityCollisionA,gravityCollisionCube).valid,false);
const gravityRelCentral = Gravity.normalizeBody({name:'central',shape:'sphere',massMode:'mass',massKg:10*Gravity.constants.SUN_MASS,dimensionsM:{x:60000,y:60000,z:60000},rotationDeg:{x:0,y:0,z:0},position:{x:0,y:0,z:0},velocity:{x:0,y:0,z:0}});
const gravityRs = Gravity.schwarzschildRadius(gravityRelCentral.massKg);
const gravityRelA = 250*gravityRs, gravityRelE = .3, gravityRelRp = gravityRelA*(1-gravityRelE);
const gravityRelMu = Gravity.constants.G*gravityRelCentral.massKg;
const gravityRelVp = Math.sqrt(gravityRelMu*(1+gravityRelE)/(gravityRelA*(1-gravityRelE)));
const gravityRelTarget = Gravity.normalizeBody({name:'tracer',shape:'sphere',massMode:'mass',massKg:1,dimensionsM:{x:2,y:2,z:2},rotationDeg:{x:0,y:0,z:0},position:{x:gravityRelRp,y:0,z:0},velocity:{x:0,y:gravityRelVp,z:0}});
const gravityRelDiag = Gravity.schwarzschildDiagnostics(gravityRelCentral,gravityRelTarget);
const gravityRelCorrection = Gravity.schwarzschild1PNCorrection(gravityRelCentral,gravityRelTarget);
assert.equal(gravityRelDiag.valid,true);
assert.ok(Math.abs(gravityRelDiag.rOverRs-175) < 1e-9);
const gravityExpectedPrecession = 6*Math.PI*gravityRelMu/(gravityRelA*(1-gravityRelE*gravityRelE)*Gravity.constants.C*Gravity.constants.C);
assert.ok(Math.abs(gravityRelDiag.periapsisAdvanceRad-gravityExpectedPrecession)/gravityExpectedPrecession < 1e-10);
assert.ok(Number.isFinite(gravityRelCorrection.acceleration.x) && Number.isFinite(gravityRelCorrection.acceleration.y) && Number.isFinite(gravityRelCorrection.acceleration.z));
assert.ok(gravityRelDiag.staticClockRate > 0 && gravityRelDiag.staticClockRate < 1);
const gravityGeometryEuclid = Gravity.intrinsicGeometryDiagnostics('euclidean',1e6,5e5,5e5);
const gravityGeometrySphere = Gravity.intrinsicGeometryDiagnostics('spherical',1e6,5e5,5e5);
const gravityGeometryHyperbolic = Gravity.intrinsicGeometryDiagnostics('hyperbolic',1e6,5e5,5e5);
assert.equal(gravityGeometryEuclid.circle.circumferenceRatio,1);
assert.equal(gravityGeometryEuclid.circle.areaRatio,1);
assert.ok(Math.abs(gravityGeometryEuclid.triangle.angleSumRad-Math.PI) < 1e-15);
assert.ok(gravityGeometrySphere.gaussianCurvature > 0);
assert.ok(gravityGeometrySphere.circle.circumferenceRatio < 1 && gravityGeometrySphere.circle.areaRatio < 1 && gravityGeometrySphere.triangle.excessRad > 0);
assert.ok(gravityGeometryHyperbolic.gaussianCurvature < 0);
assert.ok(gravityGeometryHyperbolic.circle.circumferenceRatio > 1 && gravityGeometryHyperbolic.circle.areaRatio > 1 && gravityGeometryHyperbolic.triangle.excessRad < 0);
assert.equal(gravityGeometrySphere.physicalGravityCoupling,false);
const gravityYukawaDistance = 1e8, gravityYukawaAlpha = .02, gravityYukawaLambda = 5e7;
const gravityYukawaPotentialMultiplier = Gravity.yukawaPotentialMultiplier(gravityYukawaDistance,gravityYukawaAlpha,gravityYukawaLambda);
const gravityYukawaForceMultiplier = Gravity.yukawaForceMultiplier(gravityYukawaDistance,gravityYukawaAlpha,gravityYukawaLambda);
assert.ok(Math.abs(gravityYukawaPotentialMultiplier-(1+gravityYukawaAlpha*Math.exp(-gravityYukawaDistance/gravityYukawaLambda))) < 1e-15);
assert.ok(Math.abs(gravityYukawaForceMultiplier-(1+gravityYukawaAlpha*Math.exp(-gravityYukawaDistance/gravityYukawaLambda)*(1+gravityYukawaDistance/gravityYukawaLambda))) < 1e-15);
const gravityHypA = Gravity.normalizeBody({name:'HA',shape:'sphere',massMode:'mass',massKg:1e20,dimensionsM:{x:2e6,y:2e6,z:2e6},rotationDeg:{x:0,y:0,z:0},position:{x:0,y:0,z:0},velocity:{x:0,y:0,z:0}});
const gravityHypB = Gravity.normalizeBody({name:'HB',shape:'sphere',massMode:'mass',massKg:1e20,dimensionsM:{x:2e6,y:2e6,z:2e6},rotationDeg:{x:0,y:0,z:0},position:{x:gravityYukawaDistance,y:0,z:0},velocity:{x:0,y:0,z:0}});
const gravityHypBase = Gravity.pairForce(gravityHypA,gravityHypB,{model:'point',hypothesisMode:'off'});
const gravityHypModified = Gravity.pairForce(gravityHypA,gravityHypB,{model:'point',hypothesisMode:'yukawa',hypothesisAlpha:gravityYukawaAlpha,hypothesisLambdaM:gravityYukawaLambda});
assert.ok(Math.abs(Math.hypot(gravityHypModified.force.x,gravityHypModified.force.y,gravityHypModified.force.z)/Math.hypot(gravityHypBase.force.x,gravityHypBase.force.y,gravityHypBase.force.z)-gravityYukawaForceMultiplier) < 1e-12);

const checks = [];

checks.push(includes('Shadowrun retains definitive Binary Cube launch targets', sources.shadowrun, [
  "['tools','Binary Cube Encryption Laboratory'", "['tools','Binary Cube Encoder Visualizer'", 'function loadCubeTool()', 'function loadCubeVisualizer()', 'function loadContextualHelp()', "loadScript('scientific-tools-help.js'", "loadStyle('scientific-tools-help.css'", "loadScript('shadowrun-binary-cube-engine.js'"
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
  "button.dataset.view = 'scientific-tools'", "card.dataset.scientificToolsCard = 'true'", 'routed Diagnostic Evaluation Pipeline', "loadScript('scientific-tools-entry.js?v=20260809-scientific-help-1')", 'ensureScientificToolsView();'
]));
assert.equal(count(sources.mounts, "card.dataset.scientificToolsCard = 'true'"), 1, 'Scientific Tools must have exactly one main-menu card.');
checks.push('Main menu Scientific Tools ownership is singular');

checks.push(includes('Shared cooperative runner owns bounded deterministic scheduling', sources.cooperative, [
  'ScientificToolsCooperativeRunner', 'const DEFAULT_MAX_SLICE_MS = 8;', 'class CooperativeCancelledError extends Error', 'function createToken(', 'async function forRange(', 'now() - sliceStartedAt >= maxSliceMs', 'await yieldControl()'
]));
checks.push(excludes('Scheduler remains model-neutral', sources.cooperative, ['ShadowrunBinaryCubeEngine', 'BinaryCubeDiagnosticPipeline', 'BinaryCubeSteganalysisEngine', 'DoubleSlitExperimentLab']));
checks.push(includes('Shared Scientific Tools help owns crypto/stego explanations and accessible callouts', sources.help, [
  'ScientificToolsHelp', "const VERSION = '0.1.0';", 'Help · How this tool works', 'Recommended workflow', 'What the outputs mean', 'Evidence boundary', 'MutationObserver', 'aria-describedby', "setAttribute('role', 'tooltip')", 'sth-section-callout', 'WebGPU acceleration', 'CPU-equivalent path', 'shadowrun-binary-cube-lab', 'shadowrun-binary-cube-visualizer', 'binary-cube-key-generation-visualizer', 'binary-cube-decryption-dashboard', 'binary-cube-cryptanalytic-test-lab', 'binary-cube-information-analysis-suite', 'binary-cube-communication-capacity-analyzer', 'binary-cube-media-forensics-suite', 'binary-cube-steganalysis-lab', 'binary-cube-diagnostic-pipeline-panel', 'binary-cube-cubic-decryptor', 'signals-laboratory'
]));
checks.push(excludes('Shared help runtime remains explanatory rather than cryptographic authority', sources.help, ['function encryptBinary(', 'function decryptBinary(', 'function generateResearchKey(', 'function rsAnalysis(', 'function samplePairAnalysis(']));

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
checks.push(includes('Cubic worker pool owns deterministic ordinal sharding without cryptographic duplication', sources.cubicDecryptorPool, ['BinaryCubeCubicDecryptorWorkerPool', 'function partitionRun(', 'function startSearch(', 'resumeCursor', 'maxAttemptsThisRun', 'earliest exact identity match', 'Cubic.makeCheckpoint(']));
checks.push(excludes('Cubic worker pool does not own key generation or decryption', sources.cubicDecryptorPool, ['generateResearchKey(', 'Engine.decryptBinary(', 'function transformBlockWithKey(']));
checks.push(includes('Cubic WebGPU accelerator owns Stage A statistics only', sources.cubicDecryptorWebGpu, ['BinaryCubeCubicDecryptorWebGPU', 'atomicAdd', 'histogramBatch(', 'scoreCandidates(', 'verifyParity(', 'Cubic.entropyFromCounts(', 'Cubic.scorePlaintextFromMetrics(', 'Cubic.completeCandidateEvidence(']));
checks.push(excludes('Cubic WebGPU accelerator does not own keys or decryption', sources.cubicDecryptorWebGpu, ['generateResearchKey(', 'Engine.decryptBinary(', 'transformBlockWithKey(', 'iterativePermutation(']));
checks.push(includes('Cubic decryptor worker delegates deterministic attempts and parity-gated acceleration', sources.cubicDecryptorWorker, ["'binary-cube-cubic-decryptor-engine.js'", 'binary-cube-cubic-decryptor-webgpu.js', 'Cubic.prepareCandidate(', 'Cubic.completeCandidateEvidence(', 'WebGPU.createAccelerator(', 'accelerator.verifyParity()', 'Cubic.makeCheckpoint(', "message.operation !== 'search'"]));
checks.push(includes('Cubic decryptor UI exposes resumable specialist search', sources.cubicDecryptorUi, ['Cubic Decryptor Tool', 'Build staged plan', 'Run / resume decryptor', 'GPU acceleration', 'bccd-acceleration-mode', 'WebGPU Stage A batch size', 'Export checkpoint', 'Recover full plaintext', 'openInformationAnalysisSuite', 'openMediaForensicsSuite', 'regenerateKey(']));

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
  "const ASSET_VERSION = '20260809-scientific-help-1';", 'function loadDiagnosticPipeline()', "loadScript('binary-cube-key-generation-research.js'", "loadScript('binary-cube-cubic-decryptor-engine.js'", "loadScript('binary-cube-cubic-decryptor-worker-pool.js'", "loadScript('binary-cube-steganalysis-evidence-profile.js'", "loadScript('binary-cube-steganalysis-worker-client.js'", "loadScript('binary-cube-diagnostic-calibration-registry.js'", "loadScript('binary-cube-diagnostic-calibration-baseline.js'", "loadScript('binary-cube-diagnostic-pipeline.js'", "loadScript('binary-cube-diagnostic-pipeline-panel.js'", 'Measured calibration:', 'RGB-LSB false negative', 'function loadCubicDecryptor()', 'function loadHelpSystem()', "loadStyle('scientific-tools-help.css')", "loadScript('scientific-tools-help.js'", 'id="scientific-tools-open-diagnostic-pipeline"', 'id="scientific-tools-open-cubic-decryptor"', 'absence of positive evidence is not evidence of absence'
]));
checks.push(includes('Scientific Tools preserves established destinations and page-first laboratories', sources.workspace, ['data-scientific-tools-tab="binary-cube"', 'data-scientific-tools-tab="decryption-dashboard"', 'data-scientific-tools-tab="signals-laboratory"', 'data-scientific-tools-tab="ism-media-simulation"', 'data-scientific-tools-tab="double-slit"', 'data-scientific-tools-tab="gravity"', 'id="scientific-tools-open-binary-cube-visualizer"', 'id="scientific-tools-open-binary-cube-laboratory"', 'id="scientific-tools-open-media-forensics-demos"', 'href="signals-laboratory.html"', 'href="live-signals-laboratory.html"', 'href="audio-laboratory.html"', 'href="interstellar-media-collisions-laboratory.html"', 'href="double-slit-laboratory.html"', 'href="gravitational-simulation-laboratory.html"', 'loadMediaForensicsDemoCorpus', 'openMediaForensicsDemoCorpus']));
checks.push(excludes('Scientific simulation launchers no longer bind modal-only hub controls', sources.workspace, ['id="scientific-tools-open-signals-laboratory"', 'id="scientific-tools-open-live-signals-laboratory"', 'id="scientific-tools-open-ism"', 'id="scientific-tools-open-double-slit"']));
for (const tab of ['binary-cube', 'decryption-dashboard', 'signals-laboratory', 'ism-media-simulation', 'double-slit', 'gravity']) assert.equal(count(sources.workspace, `data-scientific-tools-tab="${tab}"`), 1, `${tab} must have one owner.`);
checks.push('Scientific Tools tab ownership is singular');

checks.push(includes('Dedicated laboratory page shell promotes canonical runtimes into document flow', sources.pageShell, ['ScientificLaboratoryPageConfig', 'function promoteToPage(', "root.replaceChildren(shell)", "document.body.classList.add('scientific-lab-page-ready')"]));
for (const [label, page, runtime] of [
  ['Signals', sources.signalsPage, 'signals-laboratory.js'],
  ['Live Signals', sources.liveSignalsPage, 'live-signals-laboratory.js'],
  ['Audio', sources.audioPage, 'audio-laboratory.js'],
  ['ISM', sources.ismPage, 'interstellar-media-collisions-lab.js'],
  ['Double Slit', sources.doubleSlitPage, 'double-slit-lab.js']
]) {
  checks.push(includes(`${label} has a dedicated laboratory page`, page, [runtime, 'scientific-laboratory-page.js', 'ScientificLaboratoryPageConfig']));
}
checks.push(includes('Gravity laboratory is page-native and scientifically bounded', sources.gravityPage, ['gravitational-simulation-lab.js', 'gravitational-simulation-root']));
checks.push(includes('Gravity foundation exposes N-body state, extended geometry, integration, diagnostics, and explicit model boundaries', sources.gravity, ['const G = 6.67430e-11;', 'const MAX_BODIES = 12;', 'function buildMassSamples(body', 'function pairForce(a,b', 'function accelerations(bodies', 'function stepSimulation(dt)', 'function diagnostics(bodies', 'function geometryDiagnostics(bodies', 'Extended Geometry · analytic sphere + quadrature solids', 'function restrictedThreeBodyState(', 'function collinearLagrangeX(', 'earth-moon-l4', 'gravity-view-frame', 'Co-rotating with bodies 1–2', 'function potentialFromBody(', 'function tidalTensorFromBody(', 'gravity-potential-map', 'gravity-tidal-map', 'function mergeCollisionBodies(', 'function elasticSphereCollisionResult(', 'gravity-collision-model', 'Perfectly inelastic merge', 'Frictionless elastic hard spheres', 'const C = 299792458;', 'function schwarzschildRadius(', 'function schwarzschild1PNCorrection(', 'gravity-relativity', 'compact-precession', 'Schwarzschild 1PN test-particle correction', 'function intrinsicGeometryDiagnostics(', 'function geodesicCircleMetrics(', 'function equilateralGeodesicTriangle(', 'gravity-geometry-model', 'Intrinsic Geometry Laboratory · GRAV-07', 'physicalGravityCoupling:false', 'function yukawaPotentialMultiplier(', 'function yukawaForceMultiplier(', 'gravity-hypothesis', 'Yukawa fifth-force sensitivity · phenomenological', 'HYPOTHESIS ACTIVE', 'gravity-layer-register', 'No fictional Blacklight gravity layer is exposed', 'non-Euclidean']));
checks.push(includes('Gravity viewport exposes a deforming potential-well sheet rather than a flat-grid-only metaphor', sources.gravity, ['function updatePotentialWellSheet(extent)', 'new THREE.PlaneGeometry(10,10,36,36)', 'id="gravity-well-sheet"', 'id="gravity-well-depth"', 'Embedding-style Newtonian potential visualization enabled', 'not literal spacetime curvature']));

checks.push(includes('Media demonstration corpus remains authoritative and launchable', sources.mediaDemos, ['BinaryCubeMediaForensicsDemoCorpus', 'buildDemoBytes', 'openPanel', 'openInAppropriateTool']));
checks.push(includes('ISM remains cooperative and model-bounded', sources.ism, ['const LAMBDA = 1.097e-52;', 'const PLANCK_LENGTH = 1.616255e-35;', 'function magneticPhysics(config)', 'async function simulateAsync(config, options = {})', 'ScientificToolsCooperativeRunner']));
checks.push(includes('Double Slit remains cooperative with hypothesis separation', sources.doubleSlit, ['function electronWavelength(kineticEv)', 'function coherentIntensityAtX(x, physics, config)', 'function registerHypothesisLayer(definition)', 'async function buildDistributionAsync(', 'ScientificToolsCooperativeRunner']));

for (const relativePath of [
  'scientific-tools-local-media.js', 'scientific-tools-help.js', 'scientific-tools-help.css', 'scientific-laboratory-page.js', 'scientific-laboratory-page.css', 'signals-laboratory.html', 'live-signals-laboratory.html', 'audio-laboratory.html', 'interstellar-media-collisions-laboratory.html', 'double-slit-laboratory.html', 'gravitational-simulation-laboratory.html', 'gravitational-simulation-lab.js', 'gravitational-simulation-lab.css', 'scripts/validate-scientific-tools-help.mjs', 'binary-cube-key-generation-visualizer.css', 'scripts/validate-binary-cube-key-generation-visualizer.mjs', 'binary-cube-decryption-dashboard.css', 'binary-cube-cryptanalytic-test-lab.css', 'binary-cube-information-analysis-suite.css', 'binary-cube-communication-capacity-analyzer.css', 'binary-cube-media-forensics-suite.css', 'binary-cube-steganalysis-engine.js', 'binary-cube-steganalysis-evidence-profile.js', 'binary-cube-steganalysis-worker.js', 'binary-cube-steganalysis-worker-client.js', 'binary-cube-steganalysis-lab.css', 'scripts/validate-binary-cube-steganalysis-lab.mjs', 'scripts/validate-diagnostic-raster-evidence-routing.mjs', 'binary-cube-diagnostic-calibration-registry.js', 'binary-cube-diagnostic-calibration-baseline.js', 'binary-cube-diagnostic-pipeline.css', 'binary-cube-cubic-decryptor.css', 'scripts/validate-binary-cube-cubic-decryptor.mjs', 'scripts/validate-scientific-diagnostic-pipeline.mjs', 'scripts/calibrate-scientific-diagnostic-pipeline.mjs', 'scripts/validate-scientific-diagnostic-calibration.mjs', 'scripts/run-scientific-diagnostic-local.mjs', 'docs/scientific-diagnostic-pipeline-plan.md', 'interstellar-media-collisions-lab.css', 'double-slit-lab.css'
]) nonEmpty(relativePath);
checks.push('Scientific Tools styles, raster evidence routing, calibration data, local runtime, plan, and validators are present');

console.log(JSON.stringify({
  format: 'hb-ttrpg-scientific-tools-main-menu-contract-receipt',
  schemaVersion: '0.34.0',
  pass: true,
  checkCount: checks.length,
  checks
}, null, 2));