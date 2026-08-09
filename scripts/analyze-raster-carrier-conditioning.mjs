#!/usr/bin/env node

import path from 'node:path';
import process from 'node:process';
import { execFileSync } from 'node:child_process';

const root = process.cwd();
const CONTEXT_FEATURES = Object.freeze([
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
const FEATURE_CLASSIFICATION = Object.freeze({
  lumaResidualRoughness: 'carrier-context',
  lumaResidualCooccurrenceEntropy: 'carrier-context',
  lumaResidualDiagonalFraction: 'carrier-context',
  lumaResidualSymmetryError: 'carrier-context',
  lumaLsbEntropy: 'carrier-context',
  lumaLsbOneFraction: 'carrier-context',
  lumaLsbTransitionFraction: 'carrier-context',
  lumaPairChiSquare: 'carrier-context',
  lumaEstimatorAgreement: 'detector-derived',
  lumaEstimatorSpread: 'detector-derived',
  crossChannelPayloadRange: 'detector-derived',
  crossChannelEstimatorAgreementRange: 'detector-derived',
  crossChannelLsbEntropyRange: 'carrier-context',
  crossChannelPairChiSquareRange: 'carrier-context',
  crossChannelResidualRoughnessRange: 'carrier-context'
});

function finite(value) {
  return Number.isFinite(Number(value));
}

function mean(valuesValue) {
  const values = Array.from(valuesValue || []).filter(finite).map(Number);
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
}

function median(valuesValue) {
  const values = Array.from(valuesValue || []).filter(finite).map(Number).sort((a, b) => a - b);
  if (!values.length) return null;
  const middle = Math.floor(values.length / 2);
  return values.length % 2 ? values[middle] : (values[middle - 1] + values[middle]) / 2;
}

function variance(valuesValue, average = null) {
  const values = Array.from(valuesValue || []).filter(finite).map(Number);
  if (!values.length) return 0;
  const mu = average == null ? mean(values) : average;
  return mean(values.map(value => (value - mu) ** 2)) || 0;
}

function pearson(xValue, yValue) {
  const pairs = Array.from(xValue || []).map((x, index) => [Number(x), Number(yValue?.[index])]).filter(([x, y]) => finite(x) && finite(y));
  if (pairs.length < 3) return null;
  const xs = pairs.map(pair => pair[0]);
  const ys = pairs.map(pair => pair[1]);
  const mx = mean(xs); const my = mean(ys);
  const vx = variance(xs, mx); const vy = variance(ys, my);
  if (vx <= 1e-18 || vy <= 1e-18) return 0;
  let covariance = 0;
  for (let index = 0; index < pairs.length; index += 1) covariance += (xs[index] - mx) * (ys[index] - my);
  covariance /= pairs.length;
  return covariance / Math.sqrt(vx * vy);
}

function ranks(valuesValue) {
  const values = Array.from(valuesValue || []).map(Number);
  const rows = values.map((value, index) => ({ value, index })).sort((a, b) => a.value - b.value || a.index - b.index);
  const result = new Array(values.length);
  for (let cursor = 0; cursor < rows.length;) {
    let end = cursor + 1;
    while (end < rows.length && rows[end].value === rows[cursor].value) end += 1;
    const rank = (cursor + end - 1) / 2 + 1;
    for (let index = cursor; index < end; index += 1) result[rows[index].index] = rank;
    cursor = end;
  }
  return result;
}

function spearman(xValue, yValue) {
  const pairs = Array.from(xValue || []).map((x, index) => [Number(x), Number(yValue?.[index])]).filter(([x, y]) => finite(x) && finite(y));
  if (pairs.length < 3) return null;
  return pearson(ranks(pairs.map(pair => pair[0])), ranks(pairs.map(pair => pair[1])));
}

function carrierRows(carriers) {
  return carriers.map(carrier => Object.freeze({
    carrierId: carrier.carrierId,
    familyId: carrier.familyId,
    split: carrier.split,
    cleanRisk: Number(carrier.clean.missRiskEvidence),
    cleanFlagCount: Number(carrier.clean.flagCount || carrier.clean.flags?.length || 0),
    meanPartnerRiskDelta: mean(carrier.partners.map(partner => partner.missRiskEvidenceDelta)) || 0,
    positivePartnerCount: carrier.partners.filter(partner => partner.missRiskEvidenceDelta > 1e-12).length,
    context: carrier.clean.carrierContext || {}
  }));
}

function groupSummary(rows) {
  const risk = rows.map(row => row.cleanRisk);
  const deltas = rows.map(row => row.meanPartnerRiskDelta);
  const flagCounts = rows.map(row => row.cleanFlagCount);
  return Object.freeze({
    carriers: rows.length,
    cleanRiskMean: mean(risk),
    cleanRiskMedian: median(risk),
    cleanFlagCountMean: mean(flagCounts),
    meanPartnerRiskDelta: mean(deltas),
    medianPartnerRiskDelta: median(deltas),
    positiveCarrierDeltaRate: rows.length ? rows.filter(row => row.meanPartnerRiskDelta > 1e-12).length / rows.length : 0,
    nonPositiveCarrierDeltaRate: rows.length ? rows.filter(row => row.meanPartnerRiskDelta <= 1e-12).length / rows.length : 0,
    familyCounts: Object.freeze(Object.fromEntries([...new Set(rows.map(row => row.familyId))].sort().map(familyId => [familyId, rows.filter(row => row.familyId === familyId).length])))
  });
}

function correlationSummary(rows, feature) {
  const selected = rows.filter(row => finite(row.context?.[feature]));
  const x = selected.map(row => row.context[feature]);
  const risk = selected.map(row => row.cleanRisk);
  const delta = selected.map(row => row.meanPartnerRiskDelta);
  const flags = selected.map(row => row.cleanFlagCount);
  return Object.freeze({
    cases: selected.length,
    pearsonCleanRisk: pearson(x, risk),
    spearmanCleanRisk: spearman(x, risk),
    pearsonMeanPartnerDelta: pearson(x, delta),
    spearmanMeanPartnerDelta: spearman(x, delta),
    spearmanCleanFlagCount: spearman(x, flags)
  });
}

function medianSplit(rows, feature, threshold) {
  const selected = rows.filter(row => finite(row.context?.[feature]));
  const low = selected.filter(row => Number(row.context[feature]) < threshold);
  const high = selected.filter(row => Number(row.context[feature]) >= threshold);
  return Object.freeze({ threshold, low: groupSummary(low), high: groupSummary(high) });
}

function replicatedSaturationScore(development, holdout) {
  const devRisk = Number(development?.spearmanCleanRisk || 0);
  const holdRisk = Number(holdout?.spearmanCleanRisk || 0);
  const devDelta = Number(development?.spearmanMeanPartnerDelta || 0);
  const holdDelta = Number(holdout?.spearmanMeanPartnerDelta || 0);
  const cleanRiskSupport = devRisk > 0 && holdRisk > 0 ? Math.min(devRisk, holdRisk) : 0;
  const deltaSuppressionSupport = devDelta < 0 && holdDelta < 0 ? Math.min(-devDelta, -holdDelta) : 0;
  return Object.freeze({
    cleanRiskSupport,
    deltaSuppressionSupport,
    score: (cleanRiskSupport + deltaSuppressionSupport) / 2,
    interpretation: 'Higher score means the feature is positively associated with clean unresolved baseline and negatively associated with embedding-induced risk delta in both development and holdout. It is a research ranking only, not a fitted correction.'
  });
}

function familyCorrelations(rows, feature) {
  const familyIds = [...new Set(rows.map(row => row.familyId))].sort();
  return Object.freeze(familyIds.map(familyId => Object.freeze({
    familyId,
    correlation: correlationSummary(rows.filter(row => row.familyId === familyId), feature)
  })));
}

function familyDirectionalReplication(developmentFamilies, holdoutFamilies) {
  const holdoutByFamily = new Map(holdoutFamilies.map(row => [row.familyId, row.correlation]));
  const rows = developmentFamilies.map(row => {
    const development = row.correlation;
    const holdout = holdoutByFamily.get(row.familyId) || null;
    const developmentDirection = Number(development?.spearmanCleanRisk || 0) > 0 && Number(development?.spearmanMeanPartnerDelta || 0) < 0;
    const holdoutDirection = Number(holdout?.spearmanCleanRisk || 0) > 0 && Number(holdout?.spearmanMeanPartnerDelta || 0) < 0;
    return Object.freeze({ familyId: row.familyId, development: developmentDirection, holdout: holdoutDirection, replicated: developmentDirection && holdoutDirection, developmentCorrelation: development, holdoutCorrelation: holdout });
  });
  const replicatedFamilies = rows.filter(row => row.replicated).map(row => row.familyId);
  return Object.freeze({
    testedFamilies: rows.length,
    replicatedFamilyCount: replicatedFamilies.length,
    replicatedFamilyRate: rows.length ? replicatedFamilies.length / rows.length : 0,
    replicatedFamilies: Object.freeze(replicatedFamilies),
    families: Object.freeze(rows),
    boundary: 'Within-family holdout contains only four carriers per family. Directional replication is descriptive evidence against pure between-family confounding, not a stable per-family calibration estimate.'
  });
}

const output = execFileSync(process.execPath, ['scripts/research-raster-unresolved-independent-carriers.mjs'], {
  cwd: root,
  encoding: 'utf8',
  maxBuffer: 96 * 1024 * 1024
});
const corpus = JSON.parse(output);
const rows = carrierRows(corpus.carriers);
const developmentRows = rows.filter(row => row.split === 'development');
const holdoutRows = rows.filter(row => row.split === 'holdout');

const features = CONTEXT_FEATURES.map(feature => {
  const developmentValues = developmentRows.map(row => row.context?.[feature]).filter(finite).map(Number);
  const threshold = median(developmentValues);
  const developmentCorrelation = correlationSummary(developmentRows, feature);
  const holdoutCorrelation = correlationSummary(holdoutRows, feature);
  const developmentFamilies = familyCorrelations(developmentRows, feature);
  const holdoutFamilies = familyCorrelations(holdoutRows, feature);
  return Object.freeze({
    feature,
    classification: FEATURE_CLASSIFICATION[feature],
    developmentMedianThreshold: threshold,
    development: Object.freeze({ correlation: developmentCorrelation, split: medianSplit(developmentRows, feature, threshold), byFamily: developmentFamilies }),
    holdout: Object.freeze({ correlation: holdoutCorrelation, split: medianSplit(holdoutRows, feature, threshold), byFamily: holdoutFamilies }),
    replicatedSaturation: replicatedSaturationScore(developmentCorrelation, holdoutCorrelation),
    familyDirectionalReplication: familyDirectionalReplication(developmentFamilies, holdoutFamilies)
  });
});

const ranked = [...features].sort((a, b) => b.replicatedSaturation.score - a.replicatedSaturation.score || a.feature.localeCompare(b.feature));
const nonCircularRanked = ranked.filter(row => row.classification === 'carrier-context');
const detectorDerivedRanked = ranked.filter(row => row.classification === 'detector-derived');

const report = Object.freeze({
  receipt: 'hb-ttrpg-raster-carrier-conditioning-research-receipt',
  schemaVersion: '0.2.0',
  sourceCorpusSchemaVersion: corpus.schemaVersion,
  pipelineVersion: corpus.pipelineVersion,
  evidenceProfileVersion: corpus.evidenceProfileVersion,
  modelStatus: corpus.currentPrior.status,
  productionWeightsChanged: false,
  design: Object.freeze({
    developmentCarriers: developmentRows.length,
    holdoutCarriers: holdoutRows.length,
    contextFeatures: CONTEXT_FEATURES,
    featureClassification: FEATURE_CLASSIFICATION,
    thresholdRule: 'Median threshold is computed from development clean carriers only and applied unchanged to holdout clean carriers.',
    targetSignals: Object.freeze(['high clean unresolved baseline', 'suppressed embedded-minus-clean risk delta']),
    candidateRule: 'Only carrier-context features are eligible for the non-circular candidate ranking. Detector-derived payload/estimator features remain diagnostic evidence and cannot be promoted as independent carrier normalization context.'
  }),
  developmentOverall: groupSummary(developmentRows),
  holdoutOverall: groupSummary(holdoutRows),
  features: Object.freeze(features),
  rankedReplicatedSaturation: Object.freeze(ranked.map(row => Object.freeze({ feature: row.feature, classification: row.classification, ...row.replicatedSaturation }))),
  rankedNonCircularCarrierContext: Object.freeze(nonCircularRanked.map(row => Object.freeze({ feature: row.feature, classification: row.classification, ...row.replicatedSaturation, familyDirectionalReplication: Object.freeze({ testedFamilies: row.familyDirectionalReplication.testedFamilies, replicatedFamilyCount: row.familyDirectionalReplication.replicatedFamilyCount, replicatedFamilyRate: row.familyDirectionalReplication.replicatedFamilyRate, replicatedFamilies: row.familyDirectionalReplication.replicatedFamilies }) }))),
  rankedDetectorDerived: Object.freeze(detectorDerivedRanked.map(row => Object.freeze({ feature: row.feature, classification: row.classification, ...row.replicatedSaturation }))),
  boundary: 'This analysis evaluates whether existing evidence-profile measurements can identify carrier regimes where the provisional unresolved score is naturally high or insensitive to embedding. Development medians define descriptive strata and are applied unchanged to holdout. Detector-derived payload and estimator measurements are explicitly excluded from the non-circular carrier-context candidate ranking. Within-family direction checks reduce but do not eliminate family confounding. The ranking is not a fitted detector, no production weight or threshold changes are made, and family-correlated context features may still be proxies rather than causal normalization variables.'
});

console.log(JSON.stringify(report, null, 2));