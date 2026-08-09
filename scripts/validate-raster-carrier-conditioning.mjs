#!/usr/bin/env node

import assert from 'node:assert/strict';
import path from 'node:path';
import process from 'node:process';
import { execFileSync } from 'node:child_process';

const root = process.cwd();
const EXPECTED_FEATURES = Object.freeze([
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

const output = execFileSync(process.execPath, ['scripts/analyze-raster-carrier-conditioning.mjs'], {
  cwd: root,
  encoding: 'utf8',
  maxBuffer: 96 * 1024 * 1024
});
const report = JSON.parse(output);

assert.equal(report.receipt, 'hb-ttrpg-raster-carrier-conditioning-research-receipt');
assert.equal(report.schemaVersion, '0.1.0');
assert.equal(report.sourceCorpusSchemaVersion, '0.2.0');
assert.equal(report.modelStatus, 'provisional-prior');
assert.equal(report.productionWeightsChanged, false);
assert.equal(report.design.developmentCarriers, 48);
assert.equal(report.design.holdoutCarriers, 16);
assert.deepEqual(report.design.contextFeatures, EXPECTED_FEATURES);
assert.equal(report.features.length, EXPECTED_FEATURES.length);
assert.equal(report.rankedReplicatedSaturation.length, EXPECTED_FEATURES.length);
assert.deepEqual(report.features.map(row => row.feature), EXPECTED_FEATURES);
assert.deepEqual([...report.rankedReplicatedSaturation.map(row => row.feature)].sort(), [...EXPECTED_FEATURES].sort());
assert.match(report.design.thresholdRule, /development clean carriers only/i);
assert.match(report.design.thresholdRule, /applied unchanged to holdout/i);
assert.match(report.boundary, /not a fitted detector/i);
assert.match(report.boundary, /no production weight or threshold changes/i);

function boundedCorrelation(value, label) {
  assert.ok(value === null || Number.isFinite(value), `${label} must be finite or explicitly null.`);
  if (value !== null) assert.ok(value >= -1 - 1e-12 && value <= 1 + 1e-12, `${label} must be in [-1, 1].`);
}

function validateGroup(group, expectedMaximum, label) {
  assert.ok(group && typeof group === 'object', `${label} group is missing.`);
  assert.ok(Number.isInteger(group.carriers) && group.carriers >= 0 && group.carriers <= expectedMaximum, `${label}.carriers is invalid.`);
  for (const field of ['cleanRiskMean','cleanRiskMedian','cleanFlagCountMean','meanPartnerRiskDelta','medianPartnerRiskDelta']) {
    assert.ok(group[field] === null || Number.isFinite(group[field]), `${label}.${field} must be finite or null.`);
  }
  for (const field of ['positiveCarrierDeltaRate','nonPositiveCarrierDeltaRate']) assert.ok(Number.isFinite(group[field]) && group[field] >= 0 && group[field] <= 1, `${label}.${field} must be bounded.`);
  if (group.carriers > 0) assert.ok(Math.abs(group.positiveCarrierDeltaRate + group.nonPositiveCarrierDeltaRate - 1) < 1e-12, `${label} positive/nonpositive carrier rates must sum to one.`);
  const familyCount = Object.values(group.familyCounts || {}).reduce((sum, value) => sum + Number(value || 0), 0);
  assert.equal(familyCount, group.carriers, `${label} family counts must account for every carrier.`);
}

validateGroup(report.developmentOverall, 48, 'developmentOverall');
validateGroup(report.holdoutOverall, 16, 'holdoutOverall');
assert.equal(report.developmentOverall.carriers, 48);
assert.equal(report.holdoutOverall.carriers, 16);

for (const row of report.features) {
  assert.ok(Number.isFinite(row.developmentMedianThreshold), `${row.feature}: development median threshold must be finite.`);
  assert.equal(row.development.split.threshold, row.developmentMedianThreshold, `${row.feature}: development split must use the declared development threshold.`);
  assert.equal(row.holdout.split.threshold, row.developmentMedianThreshold, `${row.feature}: holdout must use the unchanged development-derived threshold.`);

  for (const [splitName, expectedCases] of [['development', 48], ['holdout', 16]]) {
    const split = row[splitName];
    const correlation = split.correlation;
    assert.ok(Number.isInteger(correlation.cases) && correlation.cases > 0 && correlation.cases <= expectedCases, `${row.feature}.${splitName}: correlation case count is invalid.`);
    for (const field of ['pearsonCleanRisk','spearmanCleanRisk','pearsonMeanPartnerDelta','spearmanMeanPartnerDelta','spearmanCleanFlagCount']) boundedCorrelation(correlation[field], `${row.feature}.${splitName}.${field}`);
    validateGroup(split.split.low, expectedCases, `${row.feature}.${splitName}.low`);
    validateGroup(split.split.high, expectedCases, `${row.feature}.${splitName}.high`);
    assert.equal(split.split.low.carriers + split.split.high.carriers, correlation.cases, `${row.feature}.${splitName}: low/high strata must account for every finite-feature case.`);
  }

  const replicated = row.replicatedSaturation;
  for (const field of ['cleanRiskSupport','deltaSuppressionSupport','score']) assert.ok(Number.isFinite(replicated[field]) && replicated[field] >= 0 && replicated[field] <= 1 + 1e-12, `${row.feature}.replicatedSaturation.${field} must be bounded.`);
  assert.ok(Math.abs(replicated.score - (replicated.cleanRiskSupport + replicated.deltaSuppressionSupport) / 2) < 1e-12, `${row.feature}: replicated saturation score must follow the declared average rule.`);
  assert.match(replicated.interpretation, /research ranking only/i);
}

for (let index = 1; index < report.rankedReplicatedSaturation.length; index += 1) {
  assert.ok(report.rankedReplicatedSaturation[index - 1].score + 1e-12 >= report.rankedReplicatedSaturation[index].score, 'Replicated saturation ranking must be sorted descending by score.');
}

const top = report.rankedReplicatedSaturation.slice(0, 8).map(rank => {
  const feature = report.features.find(row => row.feature === rank.feature);
  return Object.freeze({
    feature: rank.feature,
    score: rank.score,
    cleanRiskSupport: rank.cleanRiskSupport,
    deltaSuppressionSupport: rank.deltaSuppressionSupport,
    development: Object.freeze({
      spearmanCleanRisk: feature.development.correlation.spearmanCleanRisk,
      spearmanMeanPartnerDelta: feature.development.correlation.spearmanMeanPartnerDelta,
      threshold: feature.developmentMedianThreshold,
      lowCleanRiskMean: feature.development.split.low.cleanRiskMean,
      highCleanRiskMean: feature.development.split.high.cleanRiskMean,
      lowMeanPartnerDelta: feature.development.split.low.meanPartnerRiskDelta,
      highMeanPartnerDelta: feature.development.split.high.meanPartnerRiskDelta
    }),
    holdout: Object.freeze({
      spearmanCleanRisk: feature.holdout.correlation.spearmanCleanRisk,
      spearmanMeanPartnerDelta: feature.holdout.correlation.spearmanMeanPartnerDelta,
      threshold: feature.holdout.split.threshold,
      lowCleanRiskMean: feature.holdout.split.low.cleanRiskMean,
      highCleanRiskMean: feature.holdout.split.high.cleanRiskMean,
      lowMeanPartnerDelta: feature.holdout.split.low.meanPartnerRiskDelta,
      highMeanPartnerDelta: feature.holdout.split.high.meanPartnerRiskDelta
    })
  });
});

console.log(JSON.stringify({
  receipt: 'hb-ttrpg-raster-carrier-conditioning-validation-receipt',
  schemaVersion: '0.1.0',
  pass: true,
  sourceCorpusSchemaVersion: report.sourceCorpusSchemaVersion,
  pipelineVersion: report.pipelineVersion,
  evidenceProfileVersion: report.evidenceProfileVersion,
  modelStatus: report.modelStatus,
  developmentCarriers: report.design.developmentCarriers,
  holdoutCarriers: report.design.holdoutCarriers,
  featureCount: report.features.length,
  topReplicatedSaturationFeatures: Object.freeze(top),
  productionWeightsChanged: false,
  boundary: report.boundary
}, null, 2));