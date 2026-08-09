#!/usr/bin/env node

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { createRequire } from 'node:module';

const root = process.cwd();
const require = createRequire(import.meta.url);
const Pipeline = require(path.join(root, 'binary-cube-diagnostic-pipeline.js'));
const source = fs.readFileSync(path.join(root, 'binary-cube-diagnostic-pipeline.js'), 'utf8');
const documentation = fs.readFileSync(path.join(root, 'docs/raster-unresolved-evidence-priors.md'), 'utf8');

assert.equal(Pipeline.version, '0.3.0');
assert.equal(Pipeline.constants.REPORT_SCHEMA_VERSION, '0.3.0');

const expectedWeights = Object.freeze({
  'single-valid-estimator': 0.22,
  'estimator-disagreement': 0.18,
  'nonzero-below-legacy-threshold': 0.28,
  'localized-global-divergence': 0.04,
  'cross-channel-payload-divergence': 0.12
});

assert.deepEqual(Pipeline.constants.RASTER_UNRESOLVED_FLAG_WEIGHTS, expectedWeights, 'Raster unresolved-evidence priors changed without updating the provenance contract.');

for (const [flag, weight] of Object.entries(expectedWeights)) {
  assert.ok(documentation.includes(`\`${flag}\``), `Provenance document is missing ${flag}.`);
  assert.ok(documentation.includes(`| ${weight.toFixed(2)} |`), `Provenance document is missing the ${flag} prior weight ${weight.toFixed(2)}.`);
}

for (const required of [
  '`provisional-prior`',
  'Fitted cases: 0.',
  'not probabilities',
  'not posterior probabilities',
  'not fitted from the calibration corpus',
  '0.24 * unresolvedEvidenceIndex',
  'TP=0',
  'TN=1',
  'FN=1',
  'FP=0',
  'missRiskEvidence = 0',
  'missRiskEvidence = 0.28',
  'localized-global-divergence',
  'out-of-sample holdout'
]) assert.ok(documentation.includes(required), `Raster unresolved-evidence provenance is missing ${JSON.stringify(required)}.`);

assert.ok(source.includes('const ids = new Set('), 'Raster unresolved evidence must deduplicate repeated diagnostic flag IDs.');
assert.ok(source.includes('unresolvedRemainder *= 1 - clamp(RASTER_UNRESOLVED_FLAG_WEIGHTS[id] || 0)'), 'Raster unresolved evidence must use the documented bounded complement-product rule.');
assert.ok(source.includes('unresolvedEvidenceIndex * 0.24'), 'Aggregate Miss-Risk must retain the documented provisional unresolved-evidence multiplier.');
assert.ok(source.includes('Unresolved detector structure may raise Miss-Risk without increasing Asset Presence.'), 'Pipeline boundary must preserve Presence/Miss-Risk separation.');

const oneFlag = Pipeline.utilities.rasterMissRiskEvidence({ diagnosticFlags: [{ id: 'nonzero-below-legacy-threshold' }] });
assert.ok(Math.abs(oneFlag - 0.28) < 1e-12, 'Known below-threshold condition must retain its documented prior contribution.');

const duplicateFlag = Pipeline.utilities.rasterMissRiskEvidence({ diagnosticFlags: [
  { id: 'localized-global-divergence' },
  { id: 'localized-global-divergence' },
  { id: 'localized-global-divergence' }
] });
assert.ok(Math.abs(duplicateFlag - 0.04) < 1e-12, 'Repeated copies of one symptom must remain deduplicated.');

const combined = Pipeline.utilities.rasterMissRiskEvidence({ diagnosticFlags: [
  { id: 'nonzero-below-legacy-threshold' },
  { id: 'estimator-disagreement' }
] });
const expectedCombined = 1 - (1 - 0.28) * (1 - 0.18);
assert.ok(Math.abs(combined - expectedCombined) < 1e-12, 'Distinct unresolved flags must follow the documented complement-product aggregation.');

const unknown = Pipeline.utilities.rasterMissRiskEvidence({ diagnosticFlags: [{ id: 'future-unregistered-flag' }] });
assert.equal(unknown, 0, 'Unregistered diagnostic flags must not silently acquire unresolved-evidence weight.');

console.log(JSON.stringify({
  receipt: 'hb-ttrpg-raster-unresolved-evidence-provenance-validation-receipt',
  schemaVersion: '0.1.0',
  pass: true,
  pipelineVersion: Pipeline.version,
  modelStatus: 'provisional-prior',
  fittedCases: 0,
  aggregateMissRiskMultiplier: 0.24,
  flagWeights: expectedWeights,
  checks: Object.freeze({
    deduplicatedRepeatedFlags: true,
    distinctFlagComplementProduct: true,
    unknownFlagsHaveNoImplicitWeight: true,
    presenceBoundaryDocumented: true,
    empiricalFitClaimed: false
  }),
  boundary: 'These values are engineering priors used to retain unresolved evidence. They are not probabilities and were not fitted from the current calibration corpus.'
}, null, 2));