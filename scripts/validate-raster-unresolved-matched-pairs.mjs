#!/usr/bin/env node

import assert from 'node:assert/strict';
import path from 'node:path';
import process from 'node:process';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';

const root = process.cwd();
const require = createRequire(import.meta.url);
const Pipeline = require(path.join(root, 'binary-cube-diagnostic-pipeline.js'));

const output = execFileSync(process.execPath, ['scripts/analyze-raster-unresolved-matched-pairs.mjs'], {
  cwd: root,
  encoding: 'utf8',
  maxBuffer: 64 * 1024 * 1024
});
const report = JSON.parse(output);

assert.equal(report.receipt, 'hb-ttrpg-raster-unresolved-evidence-matched-pair-research-receipt');
assert.equal(report.schemaVersion, '0.1.0');
assert.equal(report.pipelineVersion, Pipeline.version);
assert.equal(report.sourceCaseCount, 260);
assert.equal(report.pairCount, 256);
assert.equal(report.pairs.length, 256);
assert.equal(report.currentPrior.status, 'provisional-prior');
assert.equal(report.currentPrior.fittedCases, 0);
assert.deepEqual(report.currentPrior.weights, Pipeline.constants.RASTER_UNRESOLVED_FLAG_WEIGHTS);
assert.equal(report.byCover.length, 4);
assert.equal(report.byRate.length, 4);
assert.equal(report.byTarget.length, 4);
assert.equal(report.byPlacement.length, 2);
assert.match(report.interpretationBoundary, /reducing but not eliminating carrier confounding/i);
assert.match(report.interpretationBoundary, /No production weights or Presence thresholds are changed/i);

for (const row of report.pairs) {
  assert.ok(row.coverId, 'Every pair must identify its carrier baseline.');
  assert.ok(Array.isArray(row.cleanFlags) && Array.isArray(row.embeddedFlags), 'Every pair must preserve clean and embedded flag vectors.');
  assert.ok(Number.isFinite(row.cleanMissRiskEvidence) && Number.isFinite(row.embeddedMissRiskEvidence) && Number.isFinite(row.missRiskEvidenceDelta), 'Every pair must have finite prior response values.');
  assert.ok(Math.abs((row.embeddedMissRiskEvidence - row.cleanMissRiskEvidence) - row.missRiskEvidenceDelta) < 1e-12, 'Pair risk delta must equal embedded minus clean prior response.');
}

const expectedFlags = Object.keys(Pipeline.constants.RASTER_UNRESOLVED_FLAG_WEIGHTS).sort();
assert.deepEqual(Object.keys(report.overall.flags).sort(), expectedFlags);
for (const [flagId, summary] of Object.entries(report.overall.flags)) {
  assert.equal(summary.pairs, 256, `${flagId} matched summary must cover every embedded case.`);
  assert.equal(summary.gained + summary.lost + summary.retained + summary.absent, 256, `${flagId} matched transition accounting must be exhaustive.`);
  for (const field of ['gainRate', 'lossRate', 'activationGivenCleanOff', 'retentionGivenCleanOn']) assert.ok(Number.isFinite(summary[field]) && summary[field] >= 0 && summary[field] <= 1, `${flagId}.${field} must be bounded.`);
  assert.ok(Number.isFinite(summary.netGainRate) && summary.netGainRate >= -1 && summary.netGainRate <= 1, `${flagId}.netGainRate must be bounded.`);
}

const risk = report.overall.missRiskEvidenceDelta;
assert.equal(risk.positivePairs + risk.negativePairs + risk.unchangedPairs, 256, 'Matched risk-delta accounting must cover every pair.');
for (const value of [risk.minimum, risk.median, risk.mean, risk.maximum, report.overall.lumaLegacyScalarDelta.minimum, report.overall.lumaLegacyScalarDelta.median, report.overall.lumaLegacyScalarDelta.mean, report.overall.lumaLegacyScalarDelta.maximum]) assert.ok(Number.isFinite(value), 'Matched summary values must be finite.');

const compact = Object.freeze({
  receipt: 'hb-ttrpg-raster-unresolved-evidence-matched-pair-validation-receipt',
  schemaVersion: '0.1.0',
  pass: true,
  pipelineVersion: report.pipelineVersion,
  modelStatus: report.currentPrior.status,
  fittedCases: report.currentPrior.fittedCases,
  pairCount: report.pairCount,
  overall: report.overall,
  byCover: report.byCover.map(row => Object.freeze({
    coverId: row.coverId,
    pairs: row.summary.pairs,
    meanRiskDelta: row.summary.missRiskEvidenceDelta.mean,
    medianRiskDelta: row.summary.missRiskEvidenceDelta.median,
    positiveRiskDeltaRate: row.summary.missRiskEvidenceDelta.positiveRate,
    negativeRiskDeltaRate: row.summary.missRiskEvidenceDelta.negativeRate,
    flagNetGainRate: Object.fromEntries(Object.entries(row.summary.flags).map(([flagId, value]) => [flagId, value.netGainRate]))
  })),
  byRate: report.byRate.map(row => Object.freeze({
    payloadRate: row.payloadRate,
    pairs: row.summary.pairs,
    meanRiskDelta: row.summary.missRiskEvidenceDelta.mean,
    positiveRiskDeltaRate: row.summary.missRiskEvidenceDelta.positiveRate,
    flagNetGainRate: Object.fromEntries(Object.entries(row.summary.flags).map(([flagId, value]) => [flagId, value.netGainRate]))
  })),
  byTarget: report.byTarget.map(row => Object.freeze({
    target: row.target,
    pairs: row.summary.pairs,
    meanRiskDelta: row.summary.missRiskEvidenceDelta.mean,
    positiveRiskDeltaRate: row.summary.missRiskEvidenceDelta.positiveRate
  })),
  byPlacement: report.byPlacement.map(row => Object.freeze({
    placement: row.placement,
    pairs: row.summary.pairs,
    meanRiskDelta: row.summary.missRiskEvidenceDelta.mean,
    positiveRiskDeltaRate: row.summary.missRiskEvidenceDelta.positiveRate
  })),
  boundary: report.interpretationBoundary
});

console.log(JSON.stringify(compact, null, 2));