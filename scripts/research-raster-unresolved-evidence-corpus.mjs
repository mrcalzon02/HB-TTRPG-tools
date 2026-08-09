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
const EvidenceProfile = require(path.join(root, 'binary-cube-steganalysis-evidence-profile.js'));
const Pipeline = require(path.join(root, 'binary-cube-diagnostic-pipeline.js'));
const LocalMedia = require(path.join(root, 'scientific-tools-local-media.js'));

const VERSION = '0.1.0';
const WIDTH = 64;
const HEIGHT = 64;
const TILE_SIZE = 32;
const TARGETS = Object.freeze(['r', 'g', 'b', 'rgb']);
const PAYLOAD_RATES = Object.freeze([0.025, 0.10, 0.25, 0.50]);
const PLACEMENTS = Object.freeze(['sequential', 'shuffled']);
const SEEDS = Object.freeze([1, 257]);
const FLAG_IDS = Object.freeze(Object.keys(Pipeline.constants.RASTER_UNRESOLVED_FLAG_WEIGHTS));

function loadDemoCorpus() {
  const source = fs.readFileSync(path.join(root, 'binary-cube-media-forensics-demo-corpus.js'), 'utf8');
  const context = vm.createContext({ console, TextEncoder, TextDecoder, Uint8Array, Uint8ClampedArray, Float32Array, DataView, ArrayBuffer, Map, Set, Object, Array, Math, Promise, Number, String, Boolean, JSON, Error, TypeError });
  context.globalThis = context;
  vm.runInContext(source, context, { filename: 'binary-cube-media-forensics-demo-corpus.js' });
  if (!context.BinaryCubeMediaForensicsDemoCorpus?.buildDemoBytes) throw new Error('Known-ground-truth demonstration corpus did not expose buildDemoBytes.');
  return context.BinaryCubeMediaForensicsDemoCorpus;
}

function clampByte(value) {
  return Math.max(0, Math.min(255, Math.round(Number(value) || 0)));
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

function rasterFromGenerator(generator) {
  const rgba = new Uint8ClampedArray(WIDTH * HEIGHT * 4);
  for (let y = 0; y < HEIGHT; y += 1) {
    for (let x = 0; x < WIDTH; x += 1) {
      const pixel = y * WIDTH + x;
      const offset = pixel * 4;
      const value = generator(x, y, pixel);
      rgba[offset] = clampByte(value[0]);
      rgba[offset + 1] = clampByte(value[1]);
      rgba[offset + 2] = clampByte(value[2]);
      rgba[offset + 3] = 255;
    }
  }
  return Object.freeze({ rgba, width: WIDTH, height: HEIGHT });
}

function resampleNearest(raster, width = WIDTH, height = HEIGHT) {
  const rgba = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    const sy = Math.min(raster.height - 1, Math.floor(y * raster.height / height));
    for (let x = 0; x < width; x += 1) {
      const sx = Math.min(raster.width - 1, Math.floor(x * raster.width / width));
      const sourceOffset = (sy * raster.width + sx) * 4;
      const targetOffset = (y * width + x) * 4;
      rgba[targetOffset] = raster.rgba[sourceOffset];
      rgba[targetOffset + 1] = raster.rgba[sourceOffset + 1];
      rgba[targetOffset + 2] = raster.rgba[sourceOffset + 2];
      rgba[targetOffset + 3] = raster.rgba[sourceOffset + 3];
    }
  }
  return Object.freeze({ rgba, width, height });
}

function buildCoverFamilies() {
  const Corpus = loadDemoCorpus();
  const canonical = LocalMedia.decodePngRgba(Uint8Array.from(Corpus.buildDemoBytes('clean-control')));
  const noiseRng = xorshift32(0x71c4a91d);
  return Object.freeze([
    Object.freeze({ id: 'canonical-clean', classId: 'fixture-derived', raster: resampleNearest(canonical) }),
    Object.freeze({ id: 'smooth-gradient', classId: 'synthetic-smooth', raster: rasterFromGenerator((x, y) => [
      32 + x * 2.7 + 14 * Math.sin(y / 7),
      40 + y * 2.4 + 12 * Math.cos(x / 9),
      28 + (x + y) * 1.45 + 10 * Math.sin((x + y) / 11)
    ]) }),
    Object.freeze({ id: 'structured-edges', classId: 'synthetic-edges', raster: rasterFromGenerator((x, y) => {
      const checker = ((Math.floor(x / 8) + Math.floor(y / 8)) & 1) ? 42 : -34;
      const stripe = (x % 16 < 8) ? 24 : -18;
      return [116 + checker + stripe, 128 - checker / 2 + stripe, 104 + checker / 3 - stripe];
    }) }),
    Object.freeze({ id: 'colored-noise', classId: 'synthetic-noise', raster: rasterFromGenerator(() => {
      const shared = noiseRng() * 150;
      return [44 + shared + noiseRng() * 55, 36 + shared + noiseRng() * 70, 52 + shared + noiseRng() * 45];
    }) })
  ]);
}

function targetOffsets(target) {
  return target === 'r' ? [0] : target === 'g' ? [1] : target === 'b' ? [2] : [0, 1, 2];
}

function candidateSampleIndices(width, height, target) {
  const offsets = targetOffsets(target);
  const indices = [];
  for (let pixel = 0; pixel < width * height; pixel += 1) {
    const base = pixel * 4;
    for (const channel of offsets) indices.push(base + channel);
  }
  return indices;
}

function shuffleInPlace(values, seed) {
  const rng = xorshift32(seed);
  for (let index = values.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(rng() * (index + 1));
    [values[index], values[swap]] = [values[swap], values[index]];
  }
  return values;
}

function embedRandomLsb(raster, { target, rate, placement, seed }) {
  const rgba = new Uint8ClampedArray(raster.rgba);
  const candidates = candidateSampleIndices(raster.width, raster.height, target);
  if (placement === 'shuffled') shuffleInPlace(candidates, seed ^ 0x6d2b79f5);
  const payloadRng = xorshift32(seed ^ 0xa5a5a5a5);
  const overwriteCount = Math.max(0, Math.min(candidates.length, Math.round(candidates.length * rate)));
  let changedSamples = 0;
  for (let cursor = 0; cursor < overwriteCount; cursor += 1) {
    const index = candidates[cursor];
    const before = rgba[index];
    const after = (before & 0xfe) | (payloadRng() >= 0.5 ? 1 : 0);
    rgba[index] = after;
    if (after !== before) changedSamples += 1;
  }
  return Object.freeze({
    rgba,
    width: raster.width,
    height: raster.height,
    target,
    rate,
    placement,
    seed,
    overwrittenSamples: overwriteCount,
    changedSamples,
    changedFractionOfTarget: candidates.length ? changedSamples / candidates.length : 0,
    changedFractionOfRgb: raster.width * raster.height * 3 ? changedSamples / (raster.width * raster.height * 3) : 0
  });
}

function measureRaster(raster) {
  const profile = EvidenceProfile.profileRaster(raster.rgba, raster.width, raster.height, { channels: ['r', 'g', 'b', 'luma'], tileSize: TILE_SIZE });
  const flags = [...new Set((profile.diagnosticFlags || []).map(flag => String(flag.id || '')).filter(Boolean))].sort();
  const luma = profile.channels.find(record => record.channel === 'luma')?.global || null;
  return Object.freeze({
    flags: Object.freeze(flags),
    missRiskEvidence: Pipeline.utilities.rasterMissRiskEvidence(profile),
    lumaLegacyStatus: luma?.legacyStatus || 'inconclusive',
    lumaLegacyScalar: Number(luma?.legacyPayloadMagnitudeEvidence || 0),
    lumaPayloadEstimate: luma?.payloadEstimateConsensus ?? null,
    maximumPayloadEstimate: profile.crossChannel?.maximumPayloadEstimate ?? null,
    maximumPayloadChannel: profile.crossChannel?.maximumPayloadChannel || null,
    crossChannelPayloadRange: profile.crossChannel?.payloadEstimateRange ?? null
  });
}

function rate(count, total) {
  return total ? count / total : 0;
}

function mean(values) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function median(valuesValue) {
  const values = [...valuesValue].sort((a, b) => a - b);
  if (!values.length) return 0;
  const middle = Math.floor(values.length / 2);
  return values.length % 2 ? values[middle] : (values[middle - 1] + values[middle]) / 2;
}

function summarize(rows, expectedPositive) {
  const selected = rows.filter(row => row.expectedPositive === expectedPositive);
  const miss = selected.map(row => row.measurement.missRiskEvidence);
  const flagSummary = {};
  for (const flagId of FLAG_IDS) {
    const hits = selected.filter(row => row.measurement.flags.includes(flagId)).length;
    flagSummary[flagId] = Object.freeze({ hits, cases: selected.length, rate: rate(hits, selected.length) });
  }
  const anyFlagHits = selected.filter(row => row.measurement.flags.length > 0).length;
  const positiveLegacy = selected.filter(row => ['mixed', 'positive'].includes(row.measurement.lumaLegacyStatus)).length;
  return Object.freeze({
    cases: selected.length,
    anyFlag: Object.freeze({ hits: anyFlagHits, rate: rate(anyFlagHits, selected.length) }),
    lumaMixedOrPositive: Object.freeze({ hits: positiveLegacy, rate: rate(positiveLegacy, selected.length) }),
    missRiskEvidence: Object.freeze({ minimum: miss.length ? Math.min(...miss) : 0, median: median(miss), mean: mean(miss), maximum: miss.length ? Math.max(...miss) : 0 }),
    flags: Object.freeze(flagSummary)
  });
}

const covers = buildCoverFamilies();
const rows = [];

for (const cover of covers) {
  rows.push(Object.freeze({
    caseId: `${cover.id}:clean`,
    coverId: cover.id,
    coverClass: cover.classId,
    expectedPositive: false,
    target: null,
    payloadRate: 0,
    placement: null,
    seed: null,
    changedFractionOfTarget: 0,
    changedFractionOfRgb: 0,
    measurement: measureRaster(cover.raster)
  }));

  for (const target of TARGETS) {
    for (const payloadRate of PAYLOAD_RATES) {
      for (const placement of PLACEMENTS) {
        for (const seed of SEEDS) {
          const embedded = embedRandomLsb(cover.raster, { target, rate: payloadRate, placement, seed });
          rows.push(Object.freeze({
            caseId: `${cover.id}:${target}:${payloadRate}:${placement}:${seed}`,
            coverId: cover.id,
            coverClass: cover.classId,
            expectedPositive: true,
            target,
            payloadRate,
            placement,
            seed,
            changedFractionOfTarget: embedded.changedFractionOfTarget,
            changedFractionOfRgb: embedded.changedFractionOfRgb,
            measurement: measureRaster(embedded)
          }));
        }
      }
    }
  }
}

const cleanSummary = summarize(rows, false);
const embeddedSummary = summarize(rows, true);
const byCover = covers.map(cover => Object.freeze({
  coverId: cover.id,
  coverClass: cover.classId,
  clean: summarize(rows.filter(row => row.coverId === cover.id), false),
  embedded: summarize(rows.filter(row => row.coverId === cover.id), true)
}));
const byRate = PAYLOAD_RATES.map(payloadRate => Object.freeze({
  payloadRate,
  embedded: summarize(rows.filter(row => row.payloadRate === payloadRate), true)
}));
const byTarget = TARGETS.map(target => Object.freeze({
  target,
  embedded: summarize(rows.filter(row => row.target === target), true)
}));
const byPlacement = PLACEMENTS.map(placement => Object.freeze({
  placement,
  embedded: summarize(rows.filter(row => row.placement === placement), true)
}));

const flagContrasts = FLAG_IDS.map(flagId => Object.freeze({
  flagId,
  cleanRate: cleanSummary.flags[flagId].rate,
  embeddedRate: embeddedSummary.flags[flagId].rate,
  rateDifference: embeddedSummary.flags[flagId].rate - cleanSummary.flags[flagId].rate,
  cleanHits: cleanSummary.flags[flagId].hits,
  embeddedHits: embeddedSummary.flags[flagId].hits
}));

const report = Object.freeze({
  receipt: 'hb-ttrpg-raster-unresolved-evidence-corpus-research-receipt',
  schemaVersion: VERSION,
  evidenceProfileVersion: EvidenceProfile.version,
  diagnosticPipelineVersion: Pipeline.version,
  geometry: Object.freeze({ width: WIDTH, height: HEIGHT, tileSize: TILE_SIZE }),
  design: Object.freeze({
    coverFamilies: Object.freeze(covers.map(cover => Object.freeze({ id: cover.id, classId: cover.classId }))),
    targets: TARGETS,
    payloadRates: PAYLOAD_RATES,
    placements: PLACEMENTS,
    seeds: SEEDS,
    payloadPattern: 'deterministic pseudorandom LSB replacement',
    cleanCases: cleanSummary.cases,
    embeddedCases: embeddedSummary.cases,
    totalCases: rows.length
  }),
  currentPrior: Object.freeze({
    status: 'provisional-prior',
    fittedCases: 0,
    weights: Pipeline.constants.RASTER_UNRESOLVED_FLAG_WEIGHTS,
    aggregateMissRiskMultiplier: 0.24
  }),
  clean: cleanSummary,
  embedded: embeddedSummary,
  flagContrasts: Object.freeze(flagContrasts),
  byCover: Object.freeze(byCover),
  byRate: Object.freeze(byRate),
  byTarget: Object.freeze(byTarget),
  byPlacement: Object.freeze(byPlacement),
  rows: Object.freeze(rows),
  interpretationBoundary: 'This is a controlled synthetic characterization of the existing evidence profile and provisional miss-risk priors. It does not fit or change production weights, does not convert evidence indices into probabilities, and does not establish universal steganography sensitivity. Synthetic transformations of one carrier family are not independent real-world samples.'
});

console.log(JSON.stringify(report, null, 2));