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
const Baseline = require(path.join(root, 'binary-cube-diagnostic-calibration-baseline.js'));
const Pipeline = require(path.join(root, 'binary-cube-diagnostic-pipeline.js'));
const LocalMedia = require(path.join(root, 'scientific-tools-local-media.js'));

assert.equal(Registry.version, '0.1.0');
assert.equal(Baseline.version, '20260809-ground-truth-1');
assert.equal(Baseline.sourcePipelineVersion, '0.2.0');
assert.equal(Baseline.sourceRegistryVersion, '0.1.0');
assert.equal(Pipeline.version, '0.2.0');
assert.equal(LocalMedia.version, '0.1.0');
assert.equal(Baseline.receipts.length, 9);
assert.equal(Baseline.observedPassCount, 8);
assert.equal(Baseline.observedFailureCount, 1);
assert.ok(Registry.detector('audio-signal-forensics'));
assert.ok(Registry.detector('cubic-decryptor-search')?.registeredForFutureRouting, 'Cubic Decryptor must be represented in the calibration registry before automatic exhaustive routing is enabled.');
assert.ok(Pipeline.constants.DETECTOR_DEFINITIONS.some(item => item.id === 'audio-signal-forensics'));

const retainedMiss = Baseline.receipts.find(item => item.fixtureId === 'rgb-lsb' && item.detectorId === 'raster-steganalysis');
assert.ok(retainedMiss, 'Measured RGB-LSB raster receipt is missing from the committed baseline.');
assert.equal(retainedMiss.expected, 'positive');
assert.equal(retainedMiss.observedPositive, false);
assert.equal(retainedMiss.pass, false);
assert.match(retainedMiss.note || '', /false negative retained/i);
const rasterBaseline = Registry.calibrationFor(Baseline.snapshot, 'raster-steganalysis');
assert.equal(rasterBaseline.matrix.tp, 0);
assert.equal(rasterBaseline.matrix.tn, 1);
assert.equal(rasterBaseline.matrix.fn, 1);
assert.equal(rasterBaseline.matrix.fp, 0);
assert.equal(rasterBaseline.balancedAccuracy, 0.5);
assert.ok(rasterBaseline.effectiveReliability < Registry.detector('raster-steganalysis').priorReliability, 'Measured false negative should lower effective raster-detector reliability.');

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

const baselineByKey = new Map(Baseline.receipts.map(receipt => [`${receipt.fixtureId}:${receipt.detectorId}`, receipt]));
for (const measured of calibration.snapshot.receipts) {
  const baseline = baselineByKey.get(`${measured.fixtureId}:${measured.detectorId}`);
  assert.ok(baseline, `Fresh calibration emitted unversioned expectation ${measured.fixtureId}:${measured.detectorId}. Bump the committed baseline version before changing the corpus contract.`);
  assert.equal(measured.expected, baseline.expected, `Ground-truth expectation changed for ${measured.fixtureId}:${measured.detectorId}; version the calibration baseline explicitly.`);
  assert.equal(measured.observedPositive, baseline.observedPositive, `Detector outcome drifted for ${measured.fixtureId}:${measured.detectorId}. Review the scientific change and intentionally refresh the baseline if correct.`);
  assert.equal(measured.pass, baseline.pass, `Calibration pass/fail drifted for ${measured.fixtureId}:${measured.detectorId}.`);
}
assert.equal(calibration.passCount, Baseline.observedPassCount, 'Fresh calibration pass count drifted from committed baseline.');
assert.equal(calibration.failCount, Baseline.observedFailureCount, 'Fresh calibration failure count drifted from committed baseline.');

const registrySource = fs.readFileSync(path.join(root, 'binary-cube-diagnostic-calibration-registry.js'), 'utf8');
for (const required of ['SHRINKAGE_CASES', 'balancedAccuracy', 'effectiveReliability', 'effectiveWeight', 'blindSpots', 'Calibration measurements describe detector behavior on the tested corpus only']) assert.ok(registrySource.includes(required), `Calibration registry missing ${required}.`);
const baselineSource = fs.readFileSync(path.join(root, 'binary-cube-diagnostic-calibration-baseline.js'), 'utf8');
for (const required of ["20260809-ground-truth-1", 'Measured false negative retained', 'observedPositive: false', 'Registry.buildSnapshot(']) assert.ok(baselineSource.includes(required), `Calibration baseline missing ${required}.`);
const pipelineSource = fs.readFileSync(path.join(root, 'binary-cube-diagnostic-pipeline.js'), 'utf8');
for (const required of ['resolveCalibrationSnapshot', 'calibrationStatus', 'calibrationCases', 'calibrationIndex', 'audio-signal-forensics', 'decodeBinaryFsk', 'decodeDtmf']) assert.ok(pipelineSource.includes(required), `Diagnostic pipeline missing calibrated routing token ${required}.`);
const localRunner = fs.readFileSync(path.join(root, 'scripts/run-scientific-diagnostic-local.mjs'), 'utf8');
assert.ok(localRunner.includes("require(path.join(root, 'scientific-tools-local-media.js'))"));
assert.ok(!localRunner.includes("import zlib from 'node:zlib'"), 'Local PNG decoding must have one shared implementation.');

console.log(JSON.stringify({
  receipt: 'hb-ttrpg-scientific-diagnostic-calibration-validation-receipt',
  schemaVersion: '0.2.0',
  registryVersion: Registry.version,
  baselineVersion: Baseline.version,
  pipelineVersion: Pipeline.version,
  corpusVersion: calibration.corpusVersion,
  expectationCount: calibration.expectationCount,
  observedPasses: calibration.passCount,
  observedFailuresRetained: calibration.failCount,
  retainedRasterFalseNegative: true,
  calibratedDetectors: calibration.snapshot.detectors.filter(item => item.matrix.cases > 0).map(item => ({ id: item.detectorId, cases: item.matrix.cases, status: item.calibrationStatus, balancedAccuracy: item.balancedAccuracy, effectiveReliability: item.effectiveReliability }))
}, null, 2));
