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
const DETECTOR_DERIVED = Object.freeze([
  'lumaEstimatorAgreement',
  'lumaEstimatorSpread',
  'crossChannelPayloadRange',
  'crossChannelEstimatorAgreementRange'
]);
const CARRIER_CONTEXT = Object.freeze(EXPECTED_FEATURES.filter(feature => !DETECTOR_DERIVED.includes(feature)));

const output = execFileSync(process.execPath, ['scripts/analyze-raster-carrier-conditioning.mjs'], {
  cwd: root,
  encoding: 'utf8',
  maxBuffer: 96 * 1024 * 1024
});
const report = JSON.parse(output);

assert.equal(report.receipt, 'hb-ttrpg-raster-carrier-conditioning-research-receipt');
assert.equal(report.schemaVersion, '0.2.0');
assert.equal(report.sourceCorpusSchemaVersion, '0.2.0');
assert.equal(report.modelStatus, 'provisional-prior');
assert.equal(report.productionWeightsChanged, false);
assert.equal(report.design.developmentCarriers, 48);
assert.equal(report.design.holdoutCarriers, 16);
assert.deepEqual(report.design.contextFeatures, EXPECTED_FEATURES);
assert.equal(report.features.length, EXPECTED_FEATURES.length);
assert.equal(report.rankedReplicatedSaturation.length, EXPECTED_FEATURES.length);
assert.equal(report.rankedNonCircularCarrierContext.length, CARRIER_CONTEXT.length);
assert.equal(report.rankedDetectorDerived.length, DETECTOR_DERIVED.length);
assert.deepEqual(report.features.map(row => row.feature), EXPECTED_FEATURES);
assert.deepEqual([...report.rankedReplicatedSaturation.map(row => row.feature)].sort(), [...EXPECTED_FEATURES].sort());
assert.deepEqual([...report.rankedNonCircularCarrierContext.map(row => row.feature)].sort(), [...CARRIER_CONTEXT].sort());
assert.deepEqual([...report.rankedDetectorDerived.map(row => row.feature)].sort(), [...DETECTOR_DERIVED].sort());
for (const feature of CARRIER_CONTEXT) assert.equal(report.design.featureClassification[feature], 'carrier-context', `${feature} must remain eligible only as non-circular carrier context.`);
for (const feature of DETECTOR_DERIVED) assert.equal(report.design.featureClassification[feature], 'detector-derived', `${feature} must remain excluded from independent carrier normalization.`);
assert.match(report.design.thresholdRule, /development clean carriers only/i);
assert.match(report.design.thresholdRule, /applied unchanged to holdout/i);
assert.match(report.design.candidateRule, /Only carrier-context features/i);
assert.match(report.design.candidateRule, /cannot be promoted as independent carrier normalization context/i);
assert.match(report.boundary, /not a fitted detector/i);
assert.match(report.boundary, /no production weight or threshold changes/i);
assert.match(report.boundary, /Detector-derived payload and estimator measurements are explicitly excluded/i);

function boundedCorrelation(value, label) {
  assert.ok(value === null || Number.isFinite(value), `${label} must be finite or explicitly null.`);
  if (value !== null) assert.ok(value >= -1 - 1e-12 && value <= 1 + 1e-12, `${label} must be in [-1, 1].`);
}

function validateGroup(group, expectedMaximum, label) {
  assert.ok(group && typeof group === 'object', `${label} group is missing.`);
  assert.ok(Number.isInteger(group.carriers) && group.carriers >= 0 && group.carriers <= expectedMaximum, `${label}.carriers is invalid.`);
  for (const field of ['cleanRiskMean','cleanRiskMedian','cleanFlagCountMean','meanPartnerRiskDelta','medianPartnerRiskDelta']) assert.ok(group[field] === null || Number.isFinite(group[field]), `${label}.${field} must be finite or null.`);
  for (const field of ['positiveCarrierDeltaRate','nonPositiveCarrierDeltaRate']) assert.ok(Number.isFinite(group[field]) && group[field] >= 0 && group[field] <= 1, `${label}.${field} must be bounded.`);
  if (group.carriers > 0) assert.ok(Math.abs(group.positiveCarrierDeltaRate + group.nonPositiveCarrierDeltaRate - 1) < 1e-12, `${label} positive/nonpositive carrier rates must sum to one.`);
  const familyCount = Object.values(group.familyCounts || {}).reduce((sum, value) => sum + Number(value || 0), 0);
  assert.equal(familyCount, group.carriers, `${label} family counts must account for every carrier.`);
}

function validateCorrelation(correlation, expectedMaximum, label) {
  assert.ok(Number.isInteger(correlation.cases) && correlation.cases > 0 && correlation.cases <= expectedMaximum, `${label}: correlation case count is invalid.`);
  for (const field of ['pearsonCleanRisk','spearmanCleanRisk','pearsonMeanPartnerDelta','spearmanMeanPartnerDelta','spearmanCleanFlagCount']) boundedCorrelation(correlation[field], `${label}.${field}`);
}

validateGroup(report.developmentOverall, 48, 'developmentOverall');
validateGroup(report.holdoutOverall, 16, 'holdoutOverall');
assert.equal(report.developmentOverall.carriers, 48);
assert.equal(report.holdoutOverall.carriers, 16);

for (const row of report.features) {
  assert.equal(row.classification, report.design.featureClassification[row.feature]);
  assert.ok(Number.isFinite(row.developmentMedianThreshold), `${row.feature}: development median threshold must be finite.`);
  assert.equal(row.development.split.threshold, row.developmentMedianThreshold, `${row.feature}: development split must use the declared development threshold.`);
  assert.equal(row.holdout.split.threshold, row.developmentMedianThreshold, `${row.feature}: holdout must use the unchanged development-derived threshold.`);

  for (const [splitName, expectedCases, expectedFamilyCases] of [['development', 48, 12], ['holdout', 16, 4]]) {
    const split = row[splitName];
    validateCorrelation(split.correlation, expectedCases, `${row.feature}.${splitName}`);
    validateGroup(split.split.low, expectedCases, `${row.feature}.${splitName}.low`);
    validateGroup(split.split.high, expectedCases, `${row.feature}.${splitName}.high`);
    assert.equal(split.split.low.carriers + split.split.high.carriers, split.correlation.cases, `${row.feature}.${splitName}: low/high strata must account for every finite-feature case.`);
    assert.equal(split.byFamily.length, 4, `${row.feature}.${splitName}: every procedural family must be retained.`);
    for (const family of split.byFamily) {
      assert.ok(family.familyId, `${row.feature}.${splitName}: family id is missing.`);
      validateCorrelation(family.correlation, expectedFamilyCases, `${row.feature}.${splitName}.${family.familyId}`);
      assert.equal(family.correlation.cases, expectedFamilyCases, `${row.feature}.${splitName}.${family.familyId}: family case count drifted.`);
    }
  }

  const replicated = row.replicatedSaturation;
  for (const field of ['cleanRiskSupport','deltaSuppressionSupport','score']) assert.ok(Number.isFinite(replicated[field]) && replicated[field] >= 0 && replicated[field] <= 1 + 1e-12, `${row.feature}.replicatedSaturation.${field} must be bounded.`);
  assert.ok(Math.abs(replicated.score - (replicated.cleanRiskSupport + replicated.deltaSuppressionSupport) / 2) < 1e-12, `${row.feature}: replicated saturation score must follow the declared average rule.`);
  assert.match(replicated.interpretation, /research ranking only/i);

  const familyReplication = row.familyDirectionalReplication;
  assert.equal(familyReplication.testedFamilies, 4);
  assert.ok(Number.isInteger(familyReplication.replicatedFamilyCount) && familyReplication.replicatedFamilyCount >= 0 && familyReplication.replicatedFamilyCount <= 4);
  assert.ok(Number.isFinite(familyReplication.replicatedFamilyRate) && familyReplication.replicatedFamilyRate >= 0 && familyReplication.replicatedFamilyRate <= 1);
  assert.equal(familyReplication.replicatedFamilies.length, familyReplication.replicatedFamilyCount);
  assert.equal(familyReplication.families.length, 4);
  assert.match(familyReplication.boundary, /descriptive evidence against pure between-family confounding/i);
  for (const family of familyReplication.families) {
    assert.equal(typeof family.development, 'boolean');
    assert.equal(typeof family.holdout, 'boolean');
    assert.equal(family.replicated, family.development && family.holdout);
    validateCorrelation(family.developmentCorrelation, 12, `${row.feature}.familyReplication.${family.familyId}.development`);
    validateCorrelation(family.holdoutCorrelation, 4, `${row.feature}.familyReplication.${family.familyId}.holdout`);
  }
}

function validateDescending(rows, label) {
  for (let index = 1; index < rows.length; index += 1) assert.ok(rows[index - 1].score + 1e-12 >= rows[index].score, `${label} must be sorted descending by score.`);
}
validateDescending(report.rankedReplicatedSaturation, 'Overall replicated saturation ranking');
validateDescending(report.rankedNonCircularCarrierContext, 'Non-circular carrier-context ranking');
validateDescending(report.rankedDetectorDerived, 'Detector-derived ranking');
for (const row of report.rankedNonCircularCarrierContext) assert.equal(row.classification, 'carrier-context');
for (const row of report.rankedDetectorDerived) assert.equal(row.classification, 'detector-derived');

const topNonCircular = report.rankedNonCircularCarrierContext.slice(0, 8).map(rank => {
  const feature = report.features.find(row => row.feature === rank.feature);
  return Object.freeze({
    feature: rank.feature,
    classification: rank.classification,
    score: rank.score,
    cleanRiskSupport: rank.cleanRiskSupport,
    deltaSuppressionSupport: rank.deltaSuppressionSupport,
    familyDirectionalReplication: rank.familyDirectionalReplication,
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

const topDetectorDerived = report.rankedDetectorDerived.map(rank => Object.freeze({ feature: rank.feature, classification: rank.classification, score: rank.score }));

console.log(JSON.stringify({
  receipt: 'hb-ttrpg-raster-carrier-conditioning-validation-receipt',
  schemaVersion: '0.2.0',
  pass: true,
  sourceCorpusSchemaVersion: report.sourceCorpusSchemaVersion,
  pipelineVersion: report.pipelineVersion,
  evidenceProfileVersion: report.evidenceProfileVersion,
  modelStatus: report.modelStatus,
  developmentCarriers: report.design.developmentCarriers,
  holdoutCarriers: report.design.holdoutCarriers,
  featureCount: report.features.length,
  nonCircularCarrierContextCount: report.rankedNonCircularCarrierContext.length,
  detectorDerivedCount: report.rankedDetectorDerived.length,
  topNonCircularCarrierContext: Object.freeze(topNonCircular),
  excludedDetectorDerived: Object.freeze(topDetectorDerived),
  productionWeightsChanged: false,
  boundary: report.boundary
}, null, 2));