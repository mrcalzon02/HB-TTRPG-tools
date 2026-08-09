#!/usr/bin/env node

import assert from 'node:assert/strict';
import path from 'node:path';
import process from 'node:process';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';

const root = process.cwd();
const require = createRequire(import.meta.url);
const Pipeline = require(path.join(root, 'binary-cube-diagnostic-pipeline.js'));

const output = execFileSync(process.execPath, ['scripts/research-raster-unresolved-evidence-corpus.mjs'], {
  cwd: root,
  encoding: 'utf8',
  maxBuffer: 64 * 1024 * 1024
});
const report = JSON.parse(output);

assert.equal(report.receipt, 'hb-ttrpg-raster-unresolved-evidence-corpus-research-receipt');
assert.equal(report.schemaVersion, '0.1.0');
assert.equal(report.diagnosticPipelineVersion, Pipeline.version);
assert.equal(report.currentPrior.status, 'provisional-prior');
assert.equal(report.currentPrior.fittedCases, 0);
assert.equal(report.currentPrior.aggregateMissRiskMultiplier, 0.24);
assert.deepEqual(report.currentPrior.weights, Pipeline.constants.RASTER_UNRESOLVED_FLAG_WEIGHTS);
assert.equal(report.design.coverFamilies.length, 4);
assert.deepEqual(report.design.targets, ['r', 'g', 'b', 'rgb']);
assert.deepEqual(report.design.payloadRates, [0.025, 0.1, 0.25, 0.5]);
assert.deepEqual(report.design.placements, ['sequential', 'shuffled']);
assert.deepEqual(report.design.seeds, [1, 257]);
assert.equal(report.design.cleanCases, 4);
assert.equal(report.design.embeddedCases, 256);
assert.equal(report.design.totalCases, 260);
assert.equal(report.rows.length, 260);
assert.equal(report.byCover.length, 4);
assert.equal(report.byRate.length, 4);
assert.equal(report.byTarget.length, 4);
assert.equal(report.byPlacement.length, 2);
assert.match(report.interpretationBoundary, /does not fit or change production weights/i);
assert.match(report.interpretationBoundary, /not independent real-world samples/i);

const expectedFlags = Object.keys(Pipeline.constants.RASTER_UNRESOLVED_FLAG_WEIGHTS).sort();
assert.deepEqual(report.flagContrasts.map(row => row.flagId).sort(), expectedFlags);
for (const row of report.flagContrasts) {
  for (const field of ['cleanRate', 'embeddedRate']) {
    assert.ok(Number.isFinite(row[field]) && row[field] >= 0 && row[field] <= 1, `${row.flagId}.${field} must be a bounded measured rate.`);
  }
  assert.ok(Number.isFinite(row.rateDifference) && row.rateDifference >= -1 && row.rateDifference <= 1, `${row.flagId}.rateDifference must be finite and bounded.`);
}

for (const group of [...report.byCover, ...report.byRate, ...report.byTarget, ...report.byPlacement]) {
  const summary = group.embedded;
  assert.ok(summary.cases > 0, 'Every requested embedded subgroup must contain cases.');
  assert.ok(summary.missRiskEvidence.minimum >= 0 && summary.missRiskEvidence.maximum <= 1, 'Miss-risk evidence summaries must remain bounded.');
}

assert.ok(report.rows.every(row => Array.isArray(row.measurement.flags)), 'Every research case must retain its diagnostic flag vector.');
assert.ok(report.rows.every(row => Number.isFinite(row.measurement.missRiskEvidence)), 'Every research case must retain a finite current-prior response.');
assert.ok(report.rows.filter(row => !row.expectedPositive).every(row => row.payloadRate === 0), 'Clean controls must not be mislabeled with payload density.');
assert.ok(report.rows.filter(row => row.expectedPositive).every(row => row.payloadRate > 0), 'Embedded controls must carry a positive requested payload density.');

const compact = Object.freeze({
  receipt: 'hb-ttrpg-raster-unresolved-evidence-corpus-validation-receipt',
  schemaVersion: '0.1.0',
  pass: true,
  pipelineVersion: report.diagnosticPipelineVersion,
  evidenceProfileVersion: report.evidenceProfileVersion,
  modelStatus: report.currentPrior.status,
  fittedCases: report.currentPrior.fittedCases,
  design: report.design,
  clean: report.clean,
  embedded: report.embedded,
  flagContrasts: report.flagContrasts,
  byCover: report.byCover.map(row => Object.freeze({
    coverId: row.coverId,
    coverClass: row.coverClass,
    cleanAnyFlagRate: row.clean.anyFlag.rate,
    embeddedAnyFlagRate: row.embedded.anyFlag.rate,
    cleanMeanMissRiskEvidence: row.clean.missRiskEvidence.mean,
    embeddedMeanMissRiskEvidence: row.embedded.missRiskEvidence.mean
  })),
  byRate: report.byRate.map(row => Object.freeze({
    payloadRate: row.payloadRate,
    anyFlagRate: row.embedded.anyFlag.rate,
    lumaMixedOrPositiveRate: row.embedded.lumaMixedOrPositive.rate,
    meanMissRiskEvidence: row.embedded.missRiskEvidence.mean
  })),
  boundary: report.interpretationBoundary
});

console.log(JSON.stringify(compact, null, 2));