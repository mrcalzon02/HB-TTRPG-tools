#!/usr/bin/env node

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { createRequire } from 'node:module';

const root = process.cwd();
const require = createRequire(import.meta.url);
const Pipeline = require(path.join(root, 'binary-cube-diagnostic-pipeline.js'));

assert.equal(Pipeline.version, '0.1.0');
assert.equal(Pipeline.constants.REPORT_SCHEMA_VERSION, '0.1.0');
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

const png = Uint8Array.from(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl7ZDMAAAAASUVORK5CYII=', 'base64'));
const pngClass = Pipeline.classifyAsset(png);
assert.equal(pngClass.classId, 'raster-image');
assert.equal(pngClass.subtype, 'png');
const pngPlan = Pipeline.buildPlan(png, { profile: 'thorough', classification: pngClass });
const pngScheduled = pngPlan.detectors.filter(item => item.applicable).map(item => item.id);
assert.ok(pngScheduled.includes('png-structure'));
assert.ok(pngScheduled.includes('raster-steganalysis'));
assert.ok(!pngScheduled.includes('text-unicode-steganalysis'));

const fakeCubeArtifact = new TextEncoder().encode(JSON.stringify({
  format: 'hb-ttrpg-shadowrun-binary-cube-package',
  schemaVersion: '0.2.0',
  gridSize: 4,
  ciphertext: '0101010101010101'
}));
const cubeClass = Pipeline.classifyAsset(fakeCubeArtifact);
assert.equal(cubeClass.classId, 'binary-cube-artifact');
const cubePlan = Pipeline.buildPlan(fakeCubeArtifact, { profile: 'exhaustive', classification: cubeClass });
const cubeScheduled = cubePlan.detectors.filter(item => item.applicable).map(item => item.id);
assert.ok(cubeScheduled.includes('binary-cube-structure'));
assert.ok(cubeScheduled.includes('binary-cube-attack-suite'));

const progress = [];
const textReport = await Pipeline.runPipeline(text, { profile: 'triage', sourceName: 'control.txt', mimeType: 'text/plain', onProgress: update => progress.push(update) });
assert.equal(textReport.format, Pipeline.constants.REPORT_FORMAT);
assert.equal(textReport.completed, true);
assert.ok(textReport.findings.length >= 3);
assert.ok(progress.length > 1);
assert.equal(progress.at(-1).fraction, 1);
for (const name of ['presenceIndex', 'certaintyIndex', 'coverageIndex', 'missRiskIndex']) {
  assert.ok(textReport.indices[name] >= 0 && textReport.indices[name] <= 1, `${name} escaped normalized range.`);
}
assert.match(textReport.indices.boundary, /not posterior probabilities/i);
for (let index = 1; index < textReport.findings.length; index += 1) assert.ok(textReport.findings[index - 1].order <= textReport.findings[index].order, 'Finding order must remain deterministic.');

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
const plan = fs.readFileSync(path.join(root, 'docs/scientific-diagnostic-pipeline-plan.md'), 'utf8');

for (const required of [
  "id: 'information-structure'",
  "id: 'media-forensic-sweep'",
  "id: 'raster-steganalysis'",
  "id: 'binary-cube-attack-suite'",
  'async function runConcurrent(',
  'for (const stage of plan.stages)',
  'presenceIndex',
  'certaintyIndex',
  'coverageIndex',
  'missRiskIndex',
  'not posterior probabilities'
]) assert.ok(source.includes(required), `Pipeline source missing ${JSON.stringify(required)}.`);
assert.ok(!source.includes('Steganography Probability'));

for (const required of ['Diagnostic Evaluation Pipeline', 'Asset Presence Index', 'Certainty Index', 'Coverage Index', 'Undetected / Miss-Risk Index', 'Specialist handoff', 'Export JSON Report']) assert.ok(panel.includes(required), `Pipeline panel missing ${JSON.stringify(required)}.`);
assert.ok(css.includes('.bcdp-index-grid'));
assert.ok(cli.includes("scientific-tools-local-media.js"));
assert.ok(cli.includes('LocalMedia.decodePngRgba'));
assert.ok(cli.includes('Pipeline.runPipeline'));
assert.ok(cli.includes('fileURLToPath(import.meta.url)'));
assert.ok(plan.startsWith('# [SYSTEM REPORT] Scientific Diagnostic Evaluation Pipeline'));
assert.match(plan, /absence of positive evidence/i);
assert.match(plan, /local Node\.js runtime/i);

console.log(JSON.stringify({
  format: 'hb-ttrpg-scientific-diagnostic-pipeline-validation-receipt',
  schemaVersion: '0.1.0',
  pass: true,
  profiles: Object.keys(Pipeline.constants.PROFILES),
  deterministicStageOrder: true,
  concurrentWithinStage: true,
  automaticRouting: true,
  evidenceIndicesAreNotProbabilities: true,
  unresolvedMethodsIncreaseMissRisk: true,
  localNodeRunner: true,
  localPngPixelDecoder: true,
  findings: textReport.findings.length
}, null, 2));
