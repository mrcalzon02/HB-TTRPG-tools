#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import vm from 'node:vm';
import { TextEncoder, TextDecoder } from 'node:util';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const Steganalysis = require(path.join(root, 'binary-cube-steganalysis-engine.js'));
const LocalMedia = require(path.join(root, 'scientific-tools-local-media.js'));

const VERSION = '0.1.0';
const POSITIVE_THRESHOLD = 0.35;
const MIXED_THRESHOLD = 0.12;
const CHANNELS = Object.freeze(['r', 'g', 'b', 'luma']);
const TARGETS = Object.freeze(['r', 'g', 'b', 'rgb']);
const PAYLOAD_RATES = Object.freeze([0.01, 0.025, 0.05, 0.10, 0.25, 0.50, 1.00]);
const SEEDS = Object.freeze([1, 17, 257]);

function loadDemoCorpus() {
  const source = fs.readFileSync(path.join(root, 'binary-cube-media-forensics-demo-corpus.js'), 'utf8');
  const context = vm.createContext({ console, TextEncoder, TextDecoder, Uint8Array, Uint8ClampedArray, Float32Array, DataView, ArrayBuffer, Map, Set, Object, Array, Math, Promise, Number, String, Boolean, JSON, Error, TypeError });
  context.globalThis = context;
  vm.runInContext(source, context, { filename: 'binary-cube-media-forensics-demo-corpus.js' });
  if (!context.BinaryCubeMediaForensicsDemoCorpus?.buildDemoBytes) throw new Error('Known-ground-truth demonstration corpus did not expose buildDemoBytes.');
  return context.BinaryCubeMediaForensicsDemoCorpus;
}

const Corpus = loadDemoCorpus();
const cleanRaster = LocalMedia.decodePngRgba(Uint8Array.from(Corpus.buildDemoBytes('clean-control')));
const demoRaster = LocalMedia.decodePngRgba(Uint8Array.from(Corpus.buildDemoBytes('rgb-lsb')));

function clamp(value, minimum = 0, maximum = 1) {
  return Math.max(minimum, Math.min(maximum, Number(value) || 0));
}

function xorshift32(seedValue) {
  let state = (Number(seedValue) >>> 0) || 0x9e3779b9;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    state >>>= 0;
    return state / 0x100000000;
  };
}

function payloadBits(pattern, seed) {
  if (pattern === 'random') {
    const rng = xorshift32(seed ^ 0xa5a5a5a5);
    return Object.freeze({ next: () => rng() >= 0.5 ? 1 : 0, periodBits: null });
  }
  const bytes = new TextEncoder().encode(Corpus.constants.RGB_LSB_PAYLOAD);
  const bits = [];
  for (const byte of bytes) for (let bit = 7; bit >= 0; bit -= 1) bits.push((byte >>> bit) & 1);
  let cursor = 0;
  return Object.freeze({
    next: () => {
      const value = bits[cursor % bits.length];
      cursor += 1;
      return value;
    },
    periodBits: bits.length
  });
}

function resampleNearest(raster, targetWidth, targetHeight) {
  const source = raster.rgba instanceof Uint8ClampedArray ? raster.rgba : new Uint8ClampedArray(raster.rgba || []);
  const width = Math.max(1, Math.floor(targetWidth));
  const height = Math.max(1, Math.floor(targetHeight));
  const rgba = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    const sy = Math.min(raster.height - 1, Math.floor(y * raster.height / height));
    for (let x = 0; x < width; x += 1) {
      const sx = Math.min(raster.width - 1, Math.floor(x * raster.width / width));
      const sourceOffset = (sy * raster.width + sx) * 4;
      const targetOffset = (y * width + x) * 4;
      rgba[targetOffset] = source[sourceOffset];
      rgba[targetOffset + 1] = source[sourceOffset + 1];
      rgba[targetOffset + 2] = source[sourceOffset + 2];
      rgba[targetOffset + 3] = source[sourceOffset + 3];
    }
  }
  return Object.freeze({ rgba, width, height });
}

function candidateSampleIndices(width, height, target) {
  const channelOffsets = target === 'r' ? [0] : target === 'g' ? [1] : target === 'b' ? [2] : [0, 1, 2];
  const indices = [];
  for (let pixel = 0; pixel < width * height; pixel += 1) {
    const base = pixel * 4;
    for (const channel of channelOffsets) indices.push(base + channel);
  }
  return indices;
}

function shuffleInPlace(values, seed) {
  const rng = xorshift32(seed);
  for (let index = values.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(rng() * (index + 1));
    const value = values[index];
    values[index] = values[swap];
    values[swap] = value;
  }
  return values;
}

function embedLsb(raster, options) {
  const rgba = new Uint8ClampedArray(raster.rgba);
  const target = String(options.target || 'rgb').toLowerCase();
  const placement = String(options.placement || 'shuffled').toLowerCase();
  const pattern = String(options.pattern || 'random').toLowerCase();
  const rate = clamp(options.rate);
  const seed = Number(options.seed) >>> 0;
  const candidates = candidateSampleIndices(raster.width, raster.height, target);
  if (placement === 'shuffled') shuffleInPlace(candidates, seed ^ 0x6d2b79f5);
  const overwriteCount = Math.min(candidates.length, Math.max(0, Math.round(candidates.length * rate)));
  const bits = payloadBits(pattern, seed);
  let changedSamples = 0;
  for (let cursor = 0; cursor < overwriteCount; cursor += 1) {
    const index = candidates[cursor];
    const before = rgba[index];
    const after = (before & 0xfe) | bits.next();
    rgba[index] = after;
    if (after !== before) changedSamples += 1;
  }
  return Object.freeze({
    rgba,
    width: raster.width,
    height: raster.height,
    target,
    placement,
    pattern,
    seed,
    requestedPayloadRate: rate,
    candidateSamples: candidates.length,
    overwrittenSamples: overwriteCount,
    overwrittenFraction: candidates.length ? overwriteCount / candidates.length : 0,
    changedSamples,
    changedFractionOfTarget: candidates.length ? changedSamples / candidates.length : 0,
    changedFractionOfRgb: raster.width * raster.height * 3 ? changedSamples / (raster.width * raster.height * 3) : 0,
    payloadPeriodBits: bits.periodBits
  });
}

function scoreAnalysis(analysis) {
  const rs = analysis?.rs;
  const spa = analysis?.spa;
  const estimates = [rs?.valid ? rs.estimatedPayloadRate : null, spa?.valid ? spa.estimatedPayloadRate : null].filter(Number.isFinite);
  const consensus = estimates.length ? estimates.reduce((sum, value) => sum + value, 0) / estimates.length : 0;
  const agreement = estimates.length >= 2 ? 1 - Math.min(1, Math.abs(estimates[0] - estimates[1])) : 0.35;
  const positiveEvidence = clamp(consensus * agreement);
  const status = estimates.length ? (positiveEvidence >= POSITIVE_THRESHOLD ? 'positive' : positiveEvidence >= MIXED_THRESHOLD ? 'mixed' : 'negative') : 'inconclusive';
  return Object.freeze({
    positiveEvidence,
    status,
    rsEstimate: rs?.estimatedPayloadRate ?? null,
    rsValid: Boolean(rs?.valid),
    rsGroups: Number(rs?.groups || 0),
    spaEstimate: spa?.estimatedPayloadRate ?? null,
    spaValid: Boolean(spa?.valid),
    spaPairs: Number(spa?.counts?.pairs || 0),
    detectorAgreement: agreement,
    consensusPayloadEstimate: consensus,
    lsbEntropy: Number(analysis?.lsb?.entropy || 0),
    lsbOneFraction: Number(analysis?.lsb?.oneFraction || 0),
    pairChiSquareNormalized: Number(analysis?.chi?.normalized || 0),
    residualRoughness: Number(analysis?.residualRoughness || 0),
    residualCooccurrenceEntropy: Number(analysis?.residualCooccurrence?.entropy || 0)
  });
}

function evaluate(raster, channel, tileSize = null) {
  const effectiveTile = tileSize == null ? Math.max(raster.width, raster.height) : tileSize;
  const report = Steganalysis.localizedRasterAnalysis(raster.rgba, raster.width, raster.height, { channel, tileSize: effectiveTile });
  const global = scoreAnalysis(report.global);
  const tileScores = report.tiles.map(tile => scoreAnalysis(tile.analysis).positiveEvidence);
  const positiveTiles = tileScores.filter(score => score >= POSITIVE_THRESHOLD).length;
  const mixedTiles = tileScores.filter(score => score >= MIXED_THRESHOLD && score < POSITIVE_THRESHOLD).length;
  return Object.freeze({
    channel,
    tileSize: report.tileSize,
    global,
    tileCount: report.tiles.length,
    positiveTileCount: positiveTiles,
    mixedTileCount: mixedTiles,
    maxTilePositiveEvidence: tileScores.length ? Math.max(...tileScores) : 0,
    meanTilePositiveEvidence: tileScores.length ? tileScores.reduce((sum, value) => sum + value, 0) / tileScores.length : 0
  });
}

const authoritativeDemo = [];
for (const channel of CHANNELS) {
  for (const tileSize of [16, 32, 64]) {
    authoritativeDemo.push(Object.freeze({ fixtureId: 'rgb-lsb', ...evaluate(demoRaster, channel, tileSize) }));
  }
}

const cleanControl = CHANNELS.map(channel => Object.freeze({ fixtureId: 'clean-control', ...evaluate(cleanRaster, channel, 64) }));

const densitySweep = [];
for (const pattern of ['ascii-repeat', 'random']) {
  for (const placement of ['sequential', 'shuffled']) {
    for (const rate of PAYLOAD_RATES) {
      for (const seed of SEEDS) {
        const embedded = embedLsb(cleanRaster, { target: 'rgb', pattern, placement, rate, seed });
        for (const channel of CHANNELS) densitySweep.push(Object.freeze({
          pattern,
          placement,
          requestedPayloadRate: rate,
          seed,
          target: 'rgb',
          overwrittenFraction: embedded.overwrittenFraction,
          changedFractionOfTarget: embedded.changedFractionOfTarget,
          changedFractionOfRgb: embedded.changedFractionOfRgb,
          ...evaluate(embedded, channel, 64)
        }));
      }
    }
  }
}

const targetChannelSweep = [];
for (const target of TARGETS) {
  for (const rate of [0.10, 0.25, 0.50]) {
    for (const seed of SEEDS) {
      const embedded = embedLsb(cleanRaster, { target, pattern: 'random', placement: 'shuffled', rate, seed });
      for (const channel of CHANNELS) targetChannelSweep.push(Object.freeze({
        target,
        requestedPayloadRate: rate,
        seed,
        changedFractionOfTarget: embedded.changedFractionOfTarget,
        changedFractionOfRgb: embedded.changedFractionOfRgb,
        ...evaluate(embedded, channel, 64)
      }));
    }
  }
}

const geometrySweep = [];
for (const size of [32, 64, 128]) {
  const carrier = resampleNearest(cleanRaster, size, size);
  for (const rate of [0.10, 0.25]) {
    for (const seed of [1, 17]) {
      const embedded = embedLsb(carrier, { target: 'rgb', pattern: 'random', placement: 'shuffled', rate, seed });
      for (const channel of CHANNELS) geometrySweep.push(Object.freeze({
        width: size,
        height: size,
        requestedPayloadRate: rate,
        seed,
        changedFractionOfRgb: embedded.changedFractionOfRgb,
        ...evaluate(embedded, channel, size)
      }));
    }
  }
}

const localizationSweep = [];
for (const rate of [0.025, 0.10, 0.25]) {
  const embedded = embedLsb(cleanRaster, { target: 'rgb', pattern: 'random', placement: 'shuffled', rate, seed: 17 });
  for (const channel of CHANNELS) {
    for (const tileSize of [16, 32, 64]) localizationSweep.push(Object.freeze({
      requestedPayloadRate: rate,
      seed: 17,
      target: 'rgb',
      changedFractionOfRgb: embedded.changedFractionOfRgb,
      ...evaluate(embedded, channel, tileSize)
    }));
  }
}

function summarize(rows, keyFields) {
  const groups = new Map();
  for (const row of rows) {
    const key = keyFields.map(field => String(row[field])).join('|');
    const group = groups.get(key) || { values: Object.fromEntries(keyFields.map(field => [field, row[field]])), cases: 0, positive: 0, mixed: 0, negative: 0, inconclusive: 0, scores: [] };
    group.cases += 1;
    const status = row.global?.status || 'inconclusive';
    group[status] = (group[status] || 0) + 1;
    group.scores.push(Number(row.global?.positiveEvidence || 0));
    groups.set(key, group);
  }
  return Object.freeze([...groups.values()].map(group => Object.freeze({
    ...group.values,
    cases: group.cases,
    positiveRate: group.cases ? group.positive / group.cases : 0,
    mixedOrPositiveRate: group.cases ? (group.positive + group.mixed) / group.cases : 0,
    meanPositiveEvidence: group.scores.length ? group.scores.reduce((sum, value) => sum + value, 0) / group.scores.length : 0,
    maxPositiveEvidence: group.scores.length ? Math.max(...group.scores) : 0,
    minPositiveEvidence: group.scores.length ? Math.min(...group.scores) : 0
  })));
}

const densitySummary = summarize(densitySweep, ['pattern', 'placement', 'requestedPayloadRate', 'channel']);
const targetSummary = summarize(targetChannelSweep, ['target', 'requestedPayloadRate', 'channel']);
const geometrySummary = summarize(geometrySweep, ['width', 'requestedPayloadRate', 'channel']);
const localizationSummary = summarize(localizationSweep, ['requestedPayloadRate', 'channel', 'tileSize']);

const demoLuma64 = authoritativeDemo.find(row => row.channel === 'luma' && row.tileSize === 64) || null;
const bestDemoChannel64 = authoritativeDemo.filter(row => row.tileSize === 64).sort((a, b) => b.global.positiveEvidence - a.global.positiveEvidence)[0] || null;
const randomShuffledLuma = densitySummary.filter(row => row.pattern === 'random' && row.placement === 'shuffled' && row.channel === 'luma').sort((a, b) => a.requestedPayloadRate - b.requestedPayloadRate);
const firstLumaPositive = randomShuffledLuma.find(row => row.positiveRate > 0) || null;
const firstLumaMixed = randomShuffledLuma.find(row => row.mixedOrPositiveRate > 0) || null;

const output = Object.freeze({
  format: 'hb-ttrpg-rgb-lsb-steganalysis-blindspot-research',
  schemaVersion: VERSION,
  steganalysisVersion: Steganalysis.version,
  corpusVersion: Corpus.constants.DEMO_VERSION,
  detectorContract: Object.freeze({ positiveThreshold: POSITIVE_THRESHOLD, mixedThreshold: MIXED_THRESHOLD, score: 'mean(valid RS, SPA payload estimates) × RS/SPA agreement, matching Diagnostic Pipeline 0.2.x raster-steganalysis.' }),
  carrier: Object.freeze({ source: 'authoritative clean-control PNG decoded through scientific-tools-local-media.js', width: cleanRaster.width, height: cleanRaster.height, geometrySweepResampling: 'nearest-neighbor resampling of the authoritative clean control; geometry comparisons are paired within each resampled carrier and are not a natural-image benchmark.' }),
  authoritativeDemo: Object.freeze(authoritativeDemo),
  cleanControl: Object.freeze(cleanControl),
  densitySummary,
  targetSummary,
  geometrySummary,
  localizationSummary,
  diagnosis: Object.freeze({
    authoritativeDemoLumaPositiveEvidence: demoLuma64?.global.positiveEvidence ?? null,
    authoritativeDemoLumaStatus: demoLuma64?.global.status || null,
    bestAuthoritativeDemoChannel: bestDemoChannel64?.channel || null,
    bestAuthoritativeDemoChannelPositiveEvidence: bestDemoChannel64?.global.positiveEvidence ?? null,
    firstRandomShuffledLumaMixedRate: firstLumaMixed?.requestedPayloadRate ?? null,
    firstRandomShuffledLumaPositiveRate: firstLumaPositive?.requestedPayloadRate ?? null,
    originalPayloadBits: new TextEncoder().encode(Corpus.constants.RGB_LSB_PAYLOAD).length * 8,
    originalRgbCarrierBits: cleanRaster.width * cleanRaster.height * 3,
    originalNominalOverwriteFraction: (new TextEncoder().encode(Corpus.constants.RGB_LSB_PAYLOAD).length * 8) / (cleanRaster.width * cleanRaster.height * 3),
    interpretation: 'This experiment separates detector channel, overwritten payload density, actual changed-sample fraction, payload bit structure, placement, image geometry, and tile size. It intentionally does not change the production threshold or detector equations.'
  }),
  boundary: 'These are controlled synthetic measurements of the current RS/SPA ensemble, not universal steganography sensitivity claims. The authoritative RGB-LSB false negative remains a valid baseline observation.'
});

const serialized = JSON.stringify(output, null, 2) + '\n';
const jsonArg = process.argv.find(argument => argument.startsWith('--json='));
if (jsonArg) fs.writeFileSync(path.resolve(jsonArg.slice('--json='.length)), serialized);
process.stdout.write(serialized);
