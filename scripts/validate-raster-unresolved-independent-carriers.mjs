#!/usr/bin/env node

import assert from 'node:assert/strict';
import path from 'node:path';
import process from 'node:process';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';

const root = process.cwd();
const require = createRequire(import.meta.url);
const Pipeline = require(path.join(root, 'binary-cube-diagnostic-pipeline.js'));

const output = execFileSync(process.execPath, ['scripts/research-raster-unresolved-independent-carriers.mjs'], {
  cwd: root,
  encoding: 'utf8',
  maxBuffer: 64 * 1024 * 1024
});
const report = JSON.parse(output);

assert.equal(report.receipt, 'hb-ttrpg-raster-unresolved-independent-carrier-research-receipt');
assert.equal(report.schemaVersion, '0.2.0');
assert.equal(report.pipelineVersion, Pipeline.version);
assert.equal(report.currentPrior.status, 'provisional-prior');
assert.equal(report.currentPrior.fittedCases, 0);
assert.deepEqual(report.currentPrior.weights, Pipeline.constants.RASTER_UNRESOLVED_FLAG_WEIGHTS);
assert.equal(report.currentPrior.aggregateMissRiskMultiplier, 0.24);

const expectedContext = Object.freeze([
  'lumaResidualRoughness',
  'lumaResidualCooccurrenceEntropy',
  'lumaResidualDiagonalFraction',
  'lumaResidualSymmetryError',
  'lumaLsbEntropy',
  'lumaLsbOneFraction',
  'lumaLsbTransitionFraction',
  'lumaPairChiSquare',
  'lumaEstimatorAgreement',
  'lumaEstimatorSpread',
  'crossChannelPayloadRange',
  'crossChannelEstimatorAgreementRange',
  'crossChannelLsbEntropyRange',
  'crossChannelPairChiSquareRange',
  'crossChannelResidualRoughnessRange'
]);

assert.equal(report.design.unitOfIndependence, 'carrier-instance');
assert.deepEqual(report.design.families, ['smooth-field', 'edge-field', 'correlated-noise', 'high-frequency-noise']);
assert.equal(report.design.instancesPerFamily, 16);
assert.equal(report.design.developmentInstancesPerFamily, 12);
assert.equal(report.design.holdoutInstancesPerFamily, 4);
assert.equal(report.design.developmentCarrierCount, 48);
assert.equal(report.design.holdoutCarrierCount, 16);
assert.equal(report.design.totalCarrierCount, 64);
assert.equal(report.design.embeddedPartnersPerCarrier, 2);
assert.equal(report.design.totalRasterCount, 192);
assert.deepEqual(report.design.retainedCarrierContext, expectedContext);
assert.equal(report.carriers.length, 64);
assert.equal(report.development.carriers, 48);
assert.equal(report.holdout.carriers, 16);
assert.equal(report.development.partnerPairs, 96);
assert.equal(report.holdout.partnerPairs, 32);
assert.equal(report.byFamily.length, 4);
assert.equal(report.developmentByEmbedding.length, 2);
assert.equal(report.holdoutByEmbedding.length, 2);
assert.match(report.interpretationBoundary, /does not fit candidate weights/i);
assert.match(report.interpretationBoundary, /does not change production behavior/i);
assert.match(report.interpretationBoundary, /without introducing new detector math/i);

const developmentIds = new Set(report.carriers.filter(row => row.split === 'development').map(row => row.carrierId));
const holdoutIds = new Set(report.carriers.filter(row => row.split === 'holdout').map(row => row.carrierId));
for (const id of developmentIds) assert.ok(!holdoutIds.has(id), `Carrier ${id} leaked across the development/holdout split.`);
assert.equal(developmentIds.size, 48);
assert.equal(holdoutIds.size, 16);

function assertContext(context, label) {
  assert.ok(context && typeof context === 'object', `${label} must retain a carrier-context object.`);
  assert.deepEqual(Object.keys(context), expectedContext, `${label} carrier-context fields drifted.`);
  for (const key of expectedContext) {
    const value = context[key];
    assert.ok(value === null || Number.isFinite(value), `${label}.${key} must be finite or explicitly null.`);
  }
}

for (const carrier of report.carriers) {
  assert.equal(carrier.partners.length, 2, `${carrier.carrierId} must have exactly two standardized embedded partners.`);
  assert.equal(carrier.split, carrier.instance <= 12 ? 'development' : 'holdout');
  assert.ok(Number.isFinite(carrier.clean.missRiskEvidence), `${carrier.carrierId} clean prior response must be finite.`);
  assert.ok(carrier.clean.missRiskEvidence >= 0 && carrier.clean.missRiskEvidence <= 1, `${carrier.carrierId} clean prior response must be bounded.`);
  assertContext(carrier.clean.carrierContext, `${carrier.carrierId}.clean`);
  for (const partner of carrier.partners) {
    assert.ok(['rgb-low', 'blue-medium'].includes(partner.specId));
    assert.ok(Number.isFinite(partner.missRiskEvidenceDelta));
    assert.ok(Number.isFinite(partner.lumaLegacyScalarDelta));
    assert.equal(Object.keys(partner.flagChanges).length, Object.keys(Pipeline.constants.RASTER_UNRESOLVED_FLAG_WEIGHTS).length);
    assertContext(partner.measurement.carrierContext, `${carrier.carrierId}.${partner.specId}`);
  }
}

const expectedFlags = Object.keys(Pipeline.constants.RASTER_UNRESOLVED_FLAG_WEIGHTS).sort();
for (const section of [report.development, report.holdout]) {
  assert.deepEqual(Object.keys(section.cleanFlags).sort(), expectedFlags);
  assert.deepEqual(Object.keys(section.partnerTransitions).sort(), expectedFlags);
  for (const field of ['minimum', 'median', 'mean', 'maximum']) {
    assert.ok(Number.isFinite(section.cleanMissRiskEvidence[field]));
    assert.ok(Number.isFinite(section.partnerRiskDelta[field]));
    assert.ok(Number.isFinite(section.carrierMeanRiskDelta[field]));
  }
  assert.ok(section.cleanMissRiskEvidence.minimum >= 0 && section.cleanMissRiskEvidence.maximum <= 1);
  assert.ok(section.partnerRiskDelta.positiveRate >= 0 && section.partnerRiskDelta.positiveRate <= 1);
  assert.ok(section.partnerRiskDelta.negativeRate >= 0 && section.partnerRiskDelta.negativeRate <= 1);
  assert.ok(section.carrierMeanRiskDelta.positiveCarrierRate >= 0 && section.carrierMeanRiskDelta.positiveCarrierRate <= 1);
  assert.ok(section.carrierMeanRiskDelta.nonPositiveCarrierRate >= 0 && section.carrierMeanRiskDelta.nonPositiveCarrierRate <= 1);
}

for (const row of report.byFamily) {
  assert.equal(row.development.carriers, 12, `${row.familyId} development split must contain 12 independent carriers.`);
  assert.equal(row.holdout.carriers, 4, `${row.familyId} holdout split must contain 4 independent carriers.`);
  assert.equal(row.development.partnerPairs, 24);
  assert.equal(row.holdout.partnerPairs, 8);
}

const compactFamily = report.byFamily.map(row => Object.freeze({
  familyId: row.familyId,
  development: Object.freeze({
    cleanMeanRisk: row.development.cleanMissRiskEvidence.mean,
    meanPartnerRiskDelta: row.development.partnerRiskDelta.mean,
    positivePartnerRate: row.development.partnerRiskDelta.positiveRate,
    positiveCarrierMeanRate: row.development.carrierMeanRiskDelta.positiveCarrierRate,
    flagNetGainRate: Object.fromEntries(Object.entries(row.development.partnerTransitions).map(([flagId, value]) => [flagId, value.netGainRate]))
  }),
  holdout: Object.freeze({
    cleanMeanRisk: row.holdout.cleanMissRiskEvidence.mean,
    meanPartnerRiskDelta: row.holdout.partnerRiskDelta.mean,
    positivePartnerRate: row.holdout.partnerRiskDelta.positiveRate,
    positiveCarrierMeanRate: row.holdout.carrierMeanRiskDelta.positiveCarrierRate,
    flagNetGainRate: Object.fromEntries(Object.entries(row.holdout.partnerTransitions).map(([flagId, value]) => [flagId, value.netGainRate]))
  })
}));

console.log(JSON.stringify({
  receipt: 'hb-ttrpg-raster-unresolved-independent-carrier-validation-receipt',
  schemaVersion: '0.2.0',
  pass: true,
  pipelineVersion: report.pipelineVersion,
  evidenceProfileVersion: report.evidenceProfileVersion,
  modelStatus: report.currentPrior.status,
  fittedCases: report.currentPrior.fittedCases,
  design: report.design,
  development: report.development,
  holdout: report.holdout,
  byEmbedding: Object.freeze({ development: report.developmentByEmbedding, holdout: report.holdoutByEmbedding }),
  byFamily: Object.freeze(compactFamily),
  carrierContextRetained: true,
  splitLeakageDetected: false,
  productionWeightsChanged: false,
  boundary: report.interpretationBoundary
}, null, 2));