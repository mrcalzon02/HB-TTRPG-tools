#!/usr/bin/env node

import path from 'node:path';
import process from 'node:process';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';

const root = process.cwd();
const require = createRequire(import.meta.url);
const Pipeline = require(path.join(root, 'binary-cube-diagnostic-pipeline.js'));
const FLAG_IDS = Object.freeze(Object.keys(Pipeline.constants.RASTER_UNRESOLVED_FLAG_WEIGHTS));

function mean(values) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function median(valuesValue) {
  const values = [...valuesValue].sort((a, b) => a - b);
  if (!values.length) return 0;
  const middle = Math.floor(values.length / 2);
  return values.length % 2 ? values[middle] : (values[middle - 1] + values[middle]) / 2;
}

function rate(count, total) {
  return total ? count / total : 0;
}

function summarizePairs(rows) {
  const riskDeltas = rows.map(row => row.missRiskEvidenceDelta);
  const legacyDeltas = rows.map(row => row.lumaLegacyScalarDelta);
  const flagSummary = {};
  for (const flagId of FLAG_IDS) {
    const gained = rows.filter(row => row.flagChanges[flagId] === 1).length;
    const lost = rows.filter(row => row.flagChanges[flagId] === -1).length;
    const retained = rows.filter(row => row.cleanFlags.includes(flagId) && row.embeddedFlags.includes(flagId)).length;
    const absent = rows.filter(row => !row.cleanFlags.includes(flagId) && !row.embeddedFlags.includes(flagId)).length;
    const cleanOff = rows.filter(row => !row.cleanFlags.includes(flagId)).length;
    const cleanOn = rows.filter(row => row.cleanFlags.includes(flagId)).length;
    flagSummary[flagId] = Object.freeze({
      gained,
      lost,
      retained,
      absent,
      pairs: rows.length,
      gainRate: rate(gained, rows.length),
      lossRate: rate(lost, rows.length),
      netGainRate: rate(gained - lost, rows.length),
      activationGivenCleanOff: rate(gained, cleanOff),
      retentionGivenCleanOn: rate(retained, cleanOn)
    });
  }
  return Object.freeze({
    pairs: rows.length,
    missRiskEvidenceDelta: Object.freeze({
      minimum: riskDeltas.length ? Math.min(...riskDeltas) : 0,
      median: median(riskDeltas),
      mean: mean(riskDeltas),
      maximum: riskDeltas.length ? Math.max(...riskDeltas) : 0,
      positivePairs: riskDeltas.filter(value => value > 1e-12).length,
      negativePairs: riskDeltas.filter(value => value < -1e-12).length,
      unchangedPairs: riskDeltas.filter(value => Math.abs(value) <= 1e-12).length,
      positiveRate: rate(riskDeltas.filter(value => value > 1e-12).length, rows.length),
      negativeRate: rate(riskDeltas.filter(value => value < -1e-12).length, rows.length)
    }),
    lumaLegacyScalarDelta: Object.freeze({
      minimum: legacyDeltas.length ? Math.min(...legacyDeltas) : 0,
      median: median(legacyDeltas),
      mean: mean(legacyDeltas),
      maximum: legacyDeltas.length ? Math.max(...legacyDeltas) : 0
    }),
    flags: Object.freeze(flagSummary)
  });
}

function grouped(rows, key, values) {
  return Object.freeze(values.map(value => Object.freeze({ [key]: value, summary: summarizePairs(rows.filter(row => row[key] === value)) })));
}

const output = execFileSync(process.execPath, ['scripts/research-raster-unresolved-evidence-corpus.mjs'], {
  cwd: root,
  encoding: 'utf8',
  maxBuffer: 64 * 1024 * 1024
});
const corpus = JSON.parse(output);
const cleanByCover = new Map(corpus.rows.filter(row => !row.expectedPositive).map(row => [row.coverId, row]));
const pairs = corpus.rows.filter(row => row.expectedPositive).map(row => {
  const clean = cleanByCover.get(row.coverId);
  if (!clean) throw new Error(`Missing clean baseline for ${row.coverId}.`);
  const cleanFlags = [...new Set(clean.measurement.flags)].sort();
  const embeddedFlags = [...new Set(row.measurement.flags)].sort();
  const flagChanges = {};
  for (const flagId of FLAG_IDS) flagChanges[flagId] = Number(embeddedFlags.includes(flagId)) - Number(cleanFlags.includes(flagId));
  return Object.freeze({
    caseId: row.caseId,
    coverId: row.coverId,
    coverClass: row.coverClass,
    target: row.target,
    payloadRate: row.payloadRate,
    placement: row.placement,
    seed: row.seed,
    changedFractionOfTarget: row.changedFractionOfTarget,
    changedFractionOfRgb: row.changedFractionOfRgb,
    cleanFlags: Object.freeze(cleanFlags),
    embeddedFlags: Object.freeze(embeddedFlags),
    flagChanges: Object.freeze(flagChanges),
    cleanMissRiskEvidence: clean.measurement.missRiskEvidence,
    embeddedMissRiskEvidence: row.measurement.missRiskEvidence,
    missRiskEvidenceDelta: row.measurement.missRiskEvidence - clean.measurement.missRiskEvidence,
    cleanLumaLegacyScalar: clean.measurement.lumaLegacyScalar,
    embeddedLumaLegacyScalar: row.measurement.lumaLegacyScalar,
    lumaLegacyScalarDelta: row.measurement.lumaLegacyScalar - clean.measurement.lumaLegacyScalar
  });
});

const coverIds = corpus.design.coverFamilies.map(row => row.id);
const report = Object.freeze({
  receipt: 'hb-ttrpg-raster-unresolved-evidence-matched-pair-research-receipt',
  schemaVersion: '0.1.0',
  sourceCorpusSchemaVersion: corpus.schemaVersion,
  sourceCaseCount: corpus.design.totalCases,
  pairCount: pairs.length,
  pipelineVersion: Pipeline.version,
  currentPrior: corpus.currentPrior,
  overall: summarizePairs(pairs),
  byCover: grouped(pairs, 'coverId', coverIds),
  byRate: grouped(pairs, 'payloadRate', corpus.design.payloadRates),
  byTarget: grouped(pairs, 'target', corpus.design.targets),
  byPlacement: grouped(pairs, 'placement', corpus.design.placements),
  pairs: Object.freeze(pairs),
  interpretationBoundary: 'Matched comparisons subtract each carrier class clean baseline from its embedded variants, reducing but not eliminating carrier confounding. The four clean carrier baselines are still too few for empirical production fitting, and repeated seeded variants are not independent real-world samples. No production weights or Presence thresholds are changed by this analysis.'
});

console.log(JSON.stringify(report, null, 2));