#!/usr/bin/env node

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';

const root = process.cwd();
const require = createRequire(import.meta.url);
const Registry = require(path.join(root, 'binary-cube-diagnostic-calibration-registry.js'));
const Pipeline = require(path.join(root, 'binary-cube-diagnostic-pipeline.js'));
const LocalMedia = require(path.join(root, 'scientific-tools-local-media.js'));

assert.equal(Registry.version, '0.1.0');
assert.equal(Pipeline.version, '0.2.0');
assert.equal(LocalMedia.version, '0.1.0');
assert.ok(Registry.detector('audio-signal-forensics'));
assert.ok(Registry.detector('cubic-decryptor-search')?.registeredForFutureRouting, 'Cubic Decryptor must be represented in the calibration registry before automatic exhaustive routing is enabled.');
assert.ok(Pipeline.constants.DETECTOR_DEFINITIONS.some(item => item.id === 'audio-signal-forensics'));

const synthetic = Registry.buildSnapshot([
  { detectorId: 'png-structure', expected: 'positive', observedPositive: true, completed: true },
  { detectorId: 'png-structure', expected: 'negative', observedPositive: false, completed: true }
], { corpusVersion: 'synthetic-control' });
const pngSynthetic = Registry.calibrationFor(synthetic, 'png-structure');
assert.equal(pngSynthetic.matrix.tp, 1);
assert.equal(pngSynthetic.matrix.tn, 1);
assert.equal(pngSynthetic.balancedAccuracy, 1);
assert.ok(pngSynthetic.effectiveReliability < 1, 'Sparse perfect controls must be shrunk toward the prior rather than treated as universal certainty.');
assert.equal(pngSynthetic.calibrationStatus, 'sparse');

const calibrationOutput = execFileSync(process.execPath, ['scripts/calibrate-scientific-diagnostic-pipeline.mjs'], { cwd: root, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
const calibration = JSON.parse(calibrationOutput);
assert.equal(calibration.format, 'hb-ttrpg-scientific-diagnostic-calibration-run');
assert.equal(calibration.expectationCount, 9);
assert.equal(calibration.snapshot.receipts.length, 9);
assert.ok(calibration.snapshot.receipts.every(receipt => receipt.completed), 'Every selected ground-truth calibration detector must execute on its controlled fixture.');
assert.ok(calibration.snapshot.detectors.some(item => item.detectorId === 'png-structure' && item.matrix.cases >= 3));
assert.ok(calibration.snapshot.detectors.some(item => item.detectorId === 'raster-steganalysis' && item.matrix.cases >= 2));
assert.ok(calibration.snapshot.detectors.some(item => item.detectorId === 'audio-signal-forensics' && item.matrix.cases >= 2));
const postIend = calibration.snapshot.receipts.find(item => item.fixtureId === 'post-iend' && item.detectorId === 'png-structure');
assert.equal(postIend?.pass, true, 'Post-IEND positive control must remain visible to PNG structural inspection.');
const cleanPng = calibration.snapshot.receipts.find(item => item.fixtureId === 'clean-control' && item.detectorId === 'png-structure');
assert.equal(cleanPng?.pass, true, 'Clean PNG negative control must not be called structurally concealed by the PNG detector.');

const registrySource = fs.readFileSync(path.join(root, 'binary-cube-diagnostic-calibration-registry.js'), 'utf8');
for (const required of ['SHRINKAGE_CASES', 'balancedAccuracy', 'effectiveReliability', 'effectiveWeight', 'blindSpots', 'Calibration measurements describe detector behavior on the tested corpus only']) assert.ok(registrySource.includes(required), `Calibration registry missing ${required}.`);
const pipelineSource = fs.readFileSync(path.join(root, 'binary-cube-diagnostic-pipeline.js'), 'utf8');
for (const required of ['resolveCalibrationSnapshot', 'calibrationStatus', 'calibrationCases', 'calibrationIndex', 'audio-signal-forensics', 'decodeBinaryFsk', 'decodeDtmf']) assert.ok(pipelineSource.includes(required), `Diagnostic pipeline missing calibrated routing token ${required}.`);
const localRunner = fs.readFileSync(path.join(root, 'scripts/run-scientific-diagnostic-local.mjs'), 'utf8');
assert.ok(localRunner.includes("require(path.join(root, 'scientific-tools-local-media.js'))"));
assert.ok(!localRunner.includes("import zlib from 'node:zlib'"), 'Local PNG decoding must have one shared implementation.');

console.log(JSON.stringify({
  receipt: 'hb-ttrpg-scientific-diagnostic-calibration-validation-receipt',
  schemaVersion: '0.1.0',
  registryVersion: Registry.version,
  pipelineVersion: Pipeline.version,
  corpusVersion: calibration.corpusVersion,
  expectationCount: calibration.expectationCount,
  observedPasses: calibration.passCount,
  observedFailuresRetained: calibration.failCount,
  calibratedDetectors: calibration.snapshot.detectors.filter(item => item.matrix.cases > 0).map(item => ({ id: item.detectorId, cases: item.matrix.cases, status: item.calibrationStatus, balancedAccuracy: item.balancedAccuracy, effectiveReliability: item.effectiveReliability }))
}, null, 2));
