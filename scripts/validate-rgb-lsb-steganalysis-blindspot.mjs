#!/usr/bin/env node

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { execFileSync } from 'node:child_process';

const root = process.cwd();
const researchPath = path.join(root, 'scripts/research-rgb-lsb-steganalysis-blindspot.mjs');
const output = execFileSync(process.execPath, [researchPath], { cwd: root, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
const report = JSON.parse(output);

assert.equal(report.format, 'hb-ttrpg-rgb-lsb-steganalysis-blindspot-research');
assert.equal(report.schemaVersion, '0.1.0');
assert.equal(report.detectorContract.positiveThreshold, 0.35);
assert.equal(report.detectorContract.mixedThreshold, 0.12);
assert.equal(report.authoritativeDemo.length, 12, 'Authoritative demo must be measured in four channels across three tile sizes.');
assert.equal(report.cleanControl.length, 4, 'Clean control must be measured in all four detector channels.');
assert.equal(report.densitySummary.length, 112, 'Density sweep must retain pattern × placement × rate × detector-channel cells.');
assert.equal(report.targetSummary.length, 48, 'Target-channel sweep must retain target × rate × detector-channel cells.');
assert.equal(report.geometrySummary.length, 24, 'Geometry sweep must retain size × rate × detector-channel cells.');
assert.equal(report.localizationSummary.length, 36, 'Localization sweep must retain rate × detector-channel × tile-size cells.');
assert.ok(report.diagnosis.originalNominalOverwriteFraction > 0 && report.diagnosis.originalNominalOverwriteFraction < 0.05, 'The original demonstration should remain a low-density carrier overwrite.');
assert.ok(report.diagnosis.authoritativeDemoLumaPositiveEvidence < 0.12, 'The known RGB-LSB luma false negative must remain visible rather than being threshold-tuned into a pass.');
assert.equal(report.diagnosis.authoritativeDemoLumaStatus, 'negative');

for (const collection of [report.authoritativeDemo, report.cleanControl, report.densitySummary, report.targetSummary, report.geometrySummary, report.localizationSummary]) {
  for (const row of collection) {
    const score = row.global?.positiveEvidence ?? row.meanPositiveEvidence;
    if (score != null) assert.ok(Number.isFinite(score) && score >= 0 && score <= 1, 'Every reported positive-evidence score must remain normalized.');
  }
}

const source = fs.readFileSync(researchPath, 'utf8');
for (const required of [
  "const POSITIVE_THRESHOLD = 0.35;",
  "const MIXED_THRESHOLD = 0.12;",
  "Corpus.buildDemoBytes('clean-control')",
  "Corpus.buildDemoBytes('rgb-lsb')",
  "Steganalysis.localizedRasterAnalysis",
  "pattern === 'random'",
  "placement === 'shuffled'",
  "TARGETS = Object.freeze(['r', 'g', 'b', 'rgb'])",
  "CHANNELS = Object.freeze(['r', 'g', 'b', 'luma'])",
  "PAYLOAD_RATES = Object.freeze([0.01, 0.025, 0.05, 0.10, 0.25, 0.50, 1.00])",
  "intentionally does not change the production threshold or detector equations"
]) assert.ok(source.includes(required), `Research sweep missing contract token ${required}.`);

const compact = {
  receipt: 'hb-ttrpg-rgb-lsb-steganalysis-blindspot-validation-receipt',
  schemaVersion: '0.1.0',
  pass: true,
  authoritativeDemo: {
    nominalOverwriteFraction: report.diagnosis.originalNominalOverwriteFraction,
    lumaPositiveEvidence: report.diagnosis.authoritativeDemoLumaPositiveEvidence,
    lumaStatus: report.diagnosis.authoritativeDemoLumaStatus,
    bestChannel: report.diagnosis.bestAuthoritativeDemoChannel,
    bestChannelPositiveEvidence: report.diagnosis.bestAuthoritativeDemoChannelPositiveEvidence
  },
  randomShuffledLumaThresholds: {
    firstMixedRate: report.diagnosis.firstRandomShuffledLumaMixedRate,
    firstPositiveRate: report.diagnosis.firstRandomShuffledLumaPositiveRate
  },
  selectedDensityRows: report.densitySummary.filter(row => row.pattern === 'random' && row.placement === 'shuffled' && row.channel === 'luma'),
  selectedTargetRows: report.targetSummary.filter(row => row.requestedPayloadRate === 0.25),
  geometryLumaRows: report.geometrySummary.filter(row => row.channel === 'luma'),
  boundary: report.boundary
};

console.log(JSON.stringify(compact, null, 2));
