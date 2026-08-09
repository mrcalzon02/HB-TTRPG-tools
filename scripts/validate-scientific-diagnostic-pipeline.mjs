#!/usr/bin/env node

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { createRequire } from 'node:module';

const root = process.cwd();
const require = createRequire(import.meta.url);
const Pipeline = require(path.join(root, 'binary-cube-diagnostic-pipeline.js'));
const Engine = require(path.join(root, 'shadowrun-binary-cube-engine.js'));
const Research = require(path.join(root, 'binary-cube-key-generation-research.js'));

assert.equal(Pipeline.version, '0.3.0');
assert.equal(Pipeline.constants.REPORT_SCHEMA_VERSION, '0.3.0');
assert.deepEqual(Object.keys(Pipeline.constants.PROFILES), ['triage', 'thorough', 'exhaustive']);

const text = new TextEncoder().encode('Ordinary control text with repeated language structure and no intentional hidden payload. '.repeat(24));
const textClass = Pipeline.classifyAsset(text, { mimeType: 'text/plain' });
assert.equal(textClass.classId, 'text');
const textPlan = Pipeline.buildPlan(text, { profile: 'thorough', classification: textClass });
const textScheduled = textPlan.detectors.filter(item => item.applicable).map(item => item.id);
assert.ok(textScheduled.includes('information-structure'));
assert.ok(textScheduled.includes('media-forensic-sweep'));
assert.ok(textScheduled.includes('text-unicode-steganalysis'));
assert.ok(textScheduled.includes('deobfuscation-sweep'));
assert.ok(!textScheduled.includes('png-structure'));
assert.ok(textPlan.detectors.every(item => 'calibration' in item));

const png = Uint8Array.from(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl7ZDMAAAAASUVORK5CYII=', 'base64'));
const pngClass = Pipeline.classifyAsset(png);
assert.equal(pngClass.classId, 'raster-image');
assert.equal(pngClass.subtype, 'png');
const pngPlan = Pipeline.buildPlan(png, { profile: 'thorough', classification: pngClass });
const pngScheduled = pngPlan.detectors.filter(item => item.applicable).map(item => item.id);
assert.ok(pngScheduled.includes('png-structure'));
assert.ok(pngScheduled.includes('raster-steganalysis'));
assert.ok(!pngScheduled.includes('text-unicode-steganalysis'));

const wavStub = Uint8Array.from([0x52,0x49,0x46,0x46,0,0,0,0,0x57,0x41,0x56,0x45]);
const wavClass = Pipeline.classifyAsset(wavStub, { mimeType: 'audio/wav' });
assert.equal(wavClass.classId, 'audio');
assert.equal(wavClass.subtype, 'wav');
const wavPlan = Pipeline.buildPlan(wavStub, { profile: 'thorough', classification: wavClass });
assert.ok(wavPlan.detectors.some(item => item.id === 'audio-signal-forensics' && item.applicable));

const fakeCubeArtifact = new TextEncoder().encode(JSON.stringify({ format: 'hb-ttrpg-shadowrun-binary-cube-package', schemaVersion: '0.2.0', gridSize: 4, ciphertext: '0101010101010101' }));
const cubeClass = Pipeline.classifyAsset(fakeCubeArtifact);
assert.equal(cubeClass.classId, 'binary-cube-artifact');
const cubePlan = Pipeline.buildPlan(fakeCubeArtifact, { profile: 'exhaustive', classification: cubeClass });
const cubeScheduled = cubePlan.detectors.filter(item => item.applicable).map(item => item.id);
assert.ok(cubeScheduled.includes('binary-cube-structure'));
assert.ok(cubeScheduled.includes('cubic-decryptor-search'));
assert.ok(!cubeScheduled.includes('binary-cube-attack-suite'), 'Canonical packages must route to the Cubic Decryptor rather than the legacy dashboard attack suite when Cubic is available.');

const cubicPlaintext = Array.from(Buffer.from('Diagnostic Cubic routing fixture', 'utf8'), byte => byte.toString(2).padStart(8, '0')).join('');
const cubicKey = Research.generateResearchKey('iterative-chain', '437', 4, { inputFace: 'top', outputFace: 'front', inputQuarterTurns: 0, outputQuarterTurns: 0, maskDensity: 0.75 });
const cubicPackage = Engine.encryptBinary(cubicPlaintext, cubicKey);
const cubicBytes = new TextEncoder().encode(JSON.stringify(cubicPackage));
const cubicReport = await Pipeline.runPipeline(cubicBytes, { profile: 'exhaustive', sourceName: 'cubic-package.json', cubicSeedEnd: 500, cubicAttemptBudget: 128 });
assert.equal(cubicReport.profile.id, 'exhaustive');
assert.deepEqual(cubicReport.plan.profile, Pipeline.constants.PROFILES.exhaustive, 'runPipeline must preserve the requested Exhaustive routing profile.');
const cubicFinding = cubicReport.findings.find(item => item.detectorId === 'cubic-decryptor-search');
assert.ok(cubicFinding, 'Exhaustive canonical-package diagnostics must construct a Cubic Decryptor search plan.');
assert.equal(cubicFinding.status, 'inconclusive');
assert.equal(cubicFinding.metrics.identityStrength, 'sha256');
assert.equal(cubicFinding.metrics.seedEnd, 500);
assert.ok(cubicFinding.metrics.planId);
assert.ok(cubicFinding.metrics.totalAttempts >= 501);
assert.ok(cubicFinding.metrics.recommendedAttemptBudget > 0 && cubicFinding.metrics.recommendedAttemptBudget <= 128);
assert.ok(cubicFinding.metrics.fullPlanCoverageFraction < 1);
assert.ok(cubicFinding.missRiskEvidence > 0.5, 'An unexecuted Cubic search domain must remain explicit miss-risk.');
assert.ok(!cubicReport.findings.some(item => item.detectorId === 'binary-cube-attack-suite'), 'Canonical package execution must not duplicate the legacy dashboard attack suite.');

const progress = [];
const textReport = await Pipeline.runPipeline(text, { profile: 'triage', sourceName: 'control.txt', mimeType: 'text/plain', onProgress: update => progress.push(update) });
assert.equal(textReport.profile.id, 'triage');
assert.deepEqual(textReport.plan.profile, Pipeline.constants.PROFILES.triage, 'runPipeline must preserve the requested Triage routing profile instead of silently re-normalizing it to Thorough.');
assert.ok(!textReport.plan.detectors.find(item => item.id === 'deobfuscation-sweep').applicable, 'Triage execution must not schedule Thorough-only deobfuscation.');
assert.equal(textReport.format, Pipeline.constants.REPORT_FORMAT);
assert.equal(textReport.completed, true);
assert.ok(textReport.findings.length >= 3);
assert.ok(progress.length > 1);
assert.equal(progress.at(-1).fraction, 1);
assert.equal(textReport.calibration.registryVersion, '0.1.0');
for (const name of ['presenceIndex', 'certaintyIndex', 'coverageIndex', 'missRiskIndex', 'calibrationIndex']) assert.ok(textReport.indices[name] >= 0 && textReport.indices[name] <= 1, `${name} escaped normalized range.`);
assert.match(textReport.indices.boundary, /not posterior probabilities/i);
for (let index = 1; index < textReport.findings.length; index += 1) assert.ok(textReport.findings[index - 1].order <= textReport.findings[index].order, 'Finding order must remain deterministic.');
assert.ok(textReport.findings.every(item => typeof item.calibrationStatus === 'string'));

const pngReport = await Pipeline.runPipeline(png, { profile: 'thorough', sourceName: 'control.png' });
const rasterFinding = pngReport.findings.find(item => item.detectorId === 'raster-steganalysis');
assert.ok(rasterFinding);
assert.equal(rasterFinding.status, 'inconclusive');
assert.equal(rasterFinding.sampleSufficiency, 0);
assert.ok(pngReport.indices.coverageIndex < 1, 'A routed detector that could not run must reduce coverage.');
assert.ok(pngReport.indices.missRiskIndex > 0, 'An unresolved applicable detector must leave residual miss-risk.');

const source = fs.readFileSync(path.join(root, 'binary-cube-diagnostic-pipeline.js'), 'utf8');
const panel = fs.readFileSync(path.join(root, 'binary-cube-diagnostic-pipeline-panel.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'binary-cube-diagnostic-pipeline.css'), 'utf8');
const cli = fs.readFileSync(path.join(root, 'scripts/run-scientific-diagnostic-local.mjs'), 'utf8');
const localMedia = fs.readFileSync(path.join(root, 'scientific-tools-local-media.js'), 'utf8');
const plan = fs.readFileSync(path.join(root, 'docs/scientific-diagnostic-pipeline-plan.md'), 'utf8');

for (const required of ["id: 'information-structure'", "id: 'media-forensic-sweep'", "id: 'audio-signal-forensics'", "id: 'raster-steganalysis'", "id: 'cubic-decryptor-search'", "id: 'binary-cube-attack-suite'", 'BinaryCubeCubicDecryptorEngine', 'recommendedAttemptBudget', 'resolveCalibrationSnapshot', 'calibrationStatus', 'calibrationIndex', 'async function runConcurrent(', 'for (const stage of plan.stages)', 'decodeBinaryFsk', 'decodeDtmf', 'not posterior probabilities']) assert.ok(source.includes(required), `Pipeline source missing ${JSON.stringify(required)}.`);
assert.ok(!source.includes('Steganography Probability'));
for (const required of ['Diagnostic Evaluation Pipeline', 'Asset Presence Index', 'Certainty Index', 'Coverage Index', 'Undetected / Miss-Risk Index', 'Specialist handoff', 'Continue in Cubic Decryptor', 'openCubicDecryptor', 'Export JSON Report']) assert.ok(panel.includes(required), `Pipeline panel missing ${JSON.stringify(required)}.`);
assert.ok(css.includes('.bcdp-index-grid'));
assert.ok(cli.includes("scientific-tools-local-media.js"));
assert.ok(cli.includes('LocalMedia.decodePngRgba'));
assert.ok(localMedia.includes('function decodePngRgba('));
assert.ok(plan.startsWith('# [SYSTEM REPORT] Scientific Diagnostic Evaluation Pipeline'));
assert.match(plan, /absence of positive evidence/i);
assert.match(plan, /local Node\.js runtime/i);

console.log(JSON.stringify({ format: 'hb-ttrpg-scientific-diagnostic-pipeline-validation-receipt', schemaVersion: '0.3.0', pass: true, profiles: Object.keys(Pipeline.constants.PROFILES), deterministicStageOrder: true, concurrentWithinStage: true, automaticRouting: true, calibratedDetectorLedger: true, audioSignalRouting: true, cubicSearchRouting: true, cubicSearchPlanId: cubicFinding.metrics.planId, cubicSearchBudget: cubicFinding.metrics.recommendedAttemptBudget, evidenceIndicesAreNotProbabilities: true, unresolvedMethodsIncreaseMissRisk: true, localNodeRunner: true, sharedLocalPngPixelDecoder: true, findings: textReport.findings.length }, null, 2));
