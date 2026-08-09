#!/usr/bin/env node

import path from 'node:path';
import process from 'node:process';
import { createRequire } from 'node:module';

const root = process.cwd();
const require = createRequire(import.meta.url);
const EvidenceProfile = require(path.join(root, 'binary-cube-steganalysis-evidence-profile.js'));
const Pipeline = require(path.join(root, 'binary-cube-diagnostic-pipeline.js'));

const VERSION = '0.2.0';
const WIDTH = 64;
const HEIGHT = 64;
const TILE_SIZE = 32;
const INSTANCES_PER_FAMILY = 16;
const DEVELOPMENT_INSTANCE_COUNT = 12;
const FLAG_IDS = Object.freeze(Object.keys(Pipeline.constants.RASTER_UNRESOLVED_FLAG_WEIGHTS));
const EMBEDDING_SPECS = Object.freeze([
  Object.freeze({ id: 'rgb-low', target: 'rgb', payloadRate: 0.10, placement: 'shuffled' }),
  Object.freeze({ id: 'blue-medium', target: 'b', payloadRate: 0.25, placement: 'shuffled' })
]);

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

function carrierSeed(familyIndex, instance) {
  return ((familyIndex + 1) * 0x1f123bb5 ^ instance * 0x9e3779b9) >>> 0;
}

function rasterFromGenerator(generator) {
  const rgba = new Uint8ClampedArray(WIDTH * HEIGHT * 4);
  for (let y = 0; y < HEIGHT; y += 1) {
    for (let x = 0; x < WIDTH; x += 1) {
      const offset = (y * WIDTH + x) * 4;
      const value = generator(x, y);
      rgba[offset] = clampByte(value[0]);
      rgba[offset + 1] = clampByte(value[1]);
      rgba[offset + 2] = clampByte(value[2]);
      rgba[offset + 3] = 255;
    }
  }
  return Object.freeze({ rgba, width: WIDTH, height: HEIGHT });
}

function smoothField(seed) {
  const rng = xorshift32(seed);
  const phase = [rng() * Math.PI * 2, rng() * Math.PI * 2, rng() * Math.PI * 2];
  const fx = 5 + rng() * 10;
  const fy = 6 + rng() * 12;
  const cross = 10 + rng() * 15;
  const base = [42 + rng() * 35, 48 + rng() * 45, 38 + rng() * 40];
  const gx = 1.2 + rng() * 1.7;
  const gy = 1.1 + rng() * 1.8;
  return rasterFromGenerator((x, y) => [
    base[0] + gx * x + 18 * Math.sin(x / fx + phase[0]) + 11 * Math.cos(y / fy),
    base[1] + gy * y + 15 * Math.cos(x / (fx * 1.2) + phase[1]) + 9 * Math.sin((x + y) / cross),
    base[2] + 0.65 * gx * x + 0.72 * gy * y + 16 * Math.sin((x - y) / cross + phase[2])
  ]);
}

function edgeField(seed) {
  const rng = xorshift32(seed);
  const blockX = 4 + Math.floor(rng() * 12);
  const blockY = 4 + Math.floor(rng() * 12);
  const phaseX = Math.floor(rng() * blockX);
  const phaseY = Math.floor(rng() * blockY);
  const stripeWidth = 3 + Math.floor(rng() * 9);
  const stripeVertical = rng() >= 0.5;
  const edgeAmplitude = 26 + rng() * 48;
  const stripeAmplitude = 14 + rng() * 34;
  const base = [90 + rng() * 50, 92 + rng() * 48, 82 + rng() * 54];
  return rasterFromGenerator((x, y) => {
    const checker = ((Math.floor((x + phaseX) / blockX) + Math.floor((y + phaseY) / blockY)) & 1) ? edgeAmplitude : -edgeAmplitude;
    const stripeCoordinate = stripeVertical ? x : y;
    const stripe = (Math.floor(stripeCoordinate / stripeWidth) & 1) ? stripeAmplitude : -stripeAmplitude;
    return [base[0] + checker + stripe, base[1] - 0.55 * checker + 0.8 * stripe, base[2] + 0.35 * checker - stripe];
  });
}

function correlatedNoiseField(seed) {
  const rng = xorshift32(seed);
  const cell = 3 + Math.floor(rng() * 8);
  const gridWidth = Math.ceil(WIDTH / cell) + 2;
  const gridHeight = Math.ceil(HEIGHT / cell) + 2;
  const grids = Array.from({ length: 3 }, () => Float64Array.from({ length: gridWidth * gridHeight }, () => rng()));
  const interpolate = (grid, x, y) => {
    const gx = x / cell;
    const gy = y / cell;
    const x0 = Math.floor(gx); const y0 = Math.floor(gy);
    const tx = gx - x0; const ty = gy - y0;
    const index = (ix, iy) => grid[Math.min(gridHeight - 1, iy) * gridWidth + Math.min(gridWidth - 1, ix)];
    const a = index(x0, y0) * (1 - tx) + index(x0 + 1, y0) * tx;
    const b = index(x0, y0 + 1) * (1 - tx) + index(x0 + 1, y0 + 1) * tx;
    return a * (1 - ty) + b * ty;
  };
  const amplitude = 80 + rng() * 75;
  const channelMix = 0.45 + rng() * 0.35;
  return rasterFromGenerator((x, y) => {
    const shared = interpolate(grids[0], x, y);
    const g = channelMix * shared + (1 - channelMix) * interpolate(grids[1], x, y);
    const b = channelMix * shared + (1 - channelMix) * interpolate(grids[2], x, y);
    return [45 + amplitude * shared, 42 + amplitude * g, 48 + amplitude * b];
  });
}

function highFrequencyNoiseField(seed) {
  const rng = xorshift32(seed);
  const channelCorrelation = 0.18 + rng() * 0.58;
  const amplitude = 120 + rng() * 90;
  const base = 22 + rng() * 35;
  return rasterFromGenerator(() => {
    const shared = rng();
    const sample = () => channelCorrelation * shared + (1 - channelCorrelation) * rng();
    return [base + amplitude * sample(), base + 6 + amplitude * sample(), base + 12 + amplitude * sample()];
  });
}

const FAMILIES = Object.freeze([
  Object.freeze({ id: 'smooth-field', generator: smoothField }),
  Object.freeze({ id: 'edge-field', generator: edgeField }),
  Object.freeze({ id: 'correlated-noise', generator: correlatedNoiseField }),
  Object.freeze({ id: 'high-frequency-noise', generator: highFrequencyNoiseField })
]);

function targetOffsets(target) {
  return target === 'r' ? [0] : target === 'g' ? [1] : target === 'b' ? [2] : [0, 1, 2];
}

function shuffledIndices(raster, target, seed) {
  const indices = [];
  const offsets = targetOffsets(target);
  for (let pixel = 0; pixel < raster.width * raster.height; pixel += 1) {
    const base = pixel * 4;
    for (const offset of offsets) indices.push(base + offset);
  }
  const rng = xorshift32(seed);
  for (let index = indices.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(rng() * (index + 1));
    [indices[index], indices[swap]] = [indices[swap], indices[index]];
  }
  return indices;
}

function embedRandomLsb(raster, spec, seed) {
  const rgba = new Uint8ClampedArray(raster.rgba);
  const indices = shuffledIndices(raster, spec.target, seed ^ 0x6d2b79f5);
  const payloadRng = xorshift32(seed ^ 0xa5a5a5a5);
  const overwriteCount = Math.round(indices.length * spec.payloadRate);
  let changed = 0;
  for (let cursor = 0; cursor < overwriteCount; cursor += 1) {
    const index = indices[cursor];
    const before = rgba[index];
    const after = (before & 0xfe) | (payloadRng() >= 0.5 ? 1 : 0);
    rgba[index] = after;
    if (before !== after) changed += 1;
  }
  return Object.freeze({ rgba, width: raster.width, height: raster.height, changedSamples: changed, overwrittenSamples: overwriteCount });
}

function finiteNumber(value) {
  return Number.isFinite(Number(value)) ? Number(value) : null;
}

function measure(raster) {
  const profile = EvidenceProfile.profileRaster(raster.rgba, raster.width, raster.height, { channels: ['r', 'g', 'b', 'luma'], tileSize: TILE_SIZE });
  const luma = profile.channels.find(row => row.channel === 'luma')?.global || null;
  const flags = [...new Set((profile.diagnosticFlags || []).map(flag => String(flag.id || '')).filter(Boolean))].sort();
  return Object.freeze({
    flags: Object.freeze(flags),
    flagCount: flags.length,
    missRiskEvidence: Pipeline.utilities.rasterMissRiskEvidence(profile),
    lumaLegacyStatus: luma?.legacyStatus || 'inconclusive',
    lumaLegacyScalar: Number(luma?.legacyPayloadMagnitudeEvidence || 0),
    lumaPayloadEstimate: luma?.payloadEstimateConsensus ?? null,
    maximumPayloadEstimate: profile.crossChannel?.maximumPayloadEstimate ?? null,
    maximumPayloadChannel: profile.crossChannel?.maximumPayloadChannel || null,
    crossChannelPayloadRange: profile.crossChannel?.payloadEstimateRange ?? null,
    carrierContext: Object.freeze({
      lumaResidualRoughness: finiteNumber(luma?.residual?.roughness),
      lumaResidualCooccurrenceEntropy: finiteNumber(luma?.residual?.cooccurrenceEntropy),
      lumaResidualDiagonalFraction: finiteNumber(luma?.residual?.diagonalFraction),
      lumaResidualSymmetryError: finiteNumber(luma?.residual?.symmetryError),
      lumaLsbEntropy: finiteNumber(luma?.lsb?.entropy),
      lumaLsbOneFraction: finiteNumber(luma?.lsb?.oneFraction),
      lumaLsbTransitionFraction: finiteNumber(luma?.lsb?.transitionFraction),
      lumaPairChiSquare: finiteNumber(luma?.pairEqualization?.normalizedChiSquare),
      lumaEstimatorAgreement: finiteNumber(luma?.estimatorAgreement),
      lumaEstimatorSpread: finiteNumber(luma?.estimatorSpread),
      crossChannelPayloadRange: finiteNumber(profile.crossChannel?.payloadEstimateRange),
      crossChannelEstimatorAgreementRange: finiteNumber(profile.crossChannel?.estimatorAgreementRange),
      crossChannelLsbEntropyRange: finiteNumber(profile.crossChannel?.lsbEntropyRange),
      crossChannelPairChiSquareRange: finiteNumber(profile.crossChannel?.pairChiSquareRange),
      crossChannelResidualRoughnessRange: finiteNumber(profile.crossChannel?.residualRoughnessRange)
    })
  });
}

function transition(cleanFlags, embeddedFlags, flagId) {
  return Number(embeddedFlags.includes(flagId)) - Number(cleanFlags.includes(flagId));
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

function rate(count, total) {
  return total ? count / total : 0;
}

function summarizeCarrierRows(carriers) {
  const cleanRisk = carriers.map(row => row.clean.missRiskEvidence);
  const partnerDeltas = carriers.flatMap(row => row.partners.map(partner => partner.missRiskEvidenceDelta));
  const carrierMeanDeltas = carriers.map(row => mean(row.partners.map(partner => partner.missRiskEvidenceDelta)));
  const cleanFlags = {};
  const partnerTransitions = {};
  for (const flagId of FLAG_IDS) {
    const cleanHits = carriers.filter(row => row.clean.flags.includes(flagId)).length;
    let gained = 0; let lost = 0; let retained = 0; let absent = 0;
    for (const carrier of carriers) {
      for (const partner of carrier.partners) {
        const change = partner.flagChanges[flagId];
        if (change === 1) gained += 1;
        else if (change === -1) lost += 1;
        else if (carrier.clean.flags.includes(flagId)) retained += 1;
        else absent += 1;
      }
    }
    cleanFlags[flagId] = Object.freeze({ hits: cleanHits, carriers: carriers.length, rate: rate(cleanHits, carriers.length) });
    partnerTransitions[flagId] = Object.freeze({ gained, lost, retained, absent, partnerPairs: carriers.length * EMBEDDING_SPECS.length, netGainRate: rate(gained - lost, carriers.length * EMBEDDING_SPECS.length) });
  }
  return Object.freeze({
    carriers: carriers.length,
    partnerPairs: carriers.length * EMBEDDING_SPECS.length,
    cleanMissRiskEvidence: Object.freeze({ minimum: cleanRisk.length ? Math.min(...cleanRisk) : 0, median: median(cleanRisk), mean: mean(cleanRisk), maximum: cleanRisk.length ? Math.max(...cleanRisk) : 0 }),
    partnerRiskDelta: Object.freeze({ minimum: partnerDeltas.length ? Math.min(...partnerDeltas) : 0, median: median(partnerDeltas), mean: mean(partnerDeltas), maximum: partnerDeltas.length ? Math.max(...partnerDeltas) : 0, positiveRate: rate(partnerDeltas.filter(value => value > 1e-12).length, partnerDeltas.length), negativeRate: rate(partnerDeltas.filter(value => value < -1e-12).length, partnerDeltas.length) }),
    carrierMeanRiskDelta: Object.freeze({ minimum: carrierMeanDeltas.length ? Math.min(...carrierMeanDeltas) : 0, median: median(carrierMeanDeltas), mean: mean(carrierMeanDeltas), maximum: carrierMeanDeltas.length ? Math.max(...carrierMeanDeltas) : 0, positiveCarrierRate: rate(carrierMeanDeltas.filter(value => value > 1e-12).length, carrierMeanDeltas.length), nonPositiveCarrierRate: rate(carrierMeanDeltas.filter(value => value <= 1e-12).length, carrierMeanDeltas.length) }),
    cleanFlags: Object.freeze(cleanFlags),
    partnerTransitions: Object.freeze(partnerTransitions)
  });
}

function summarizeByEmbedding(carriers) {
  return Object.freeze(EMBEDDING_SPECS.map(spec => {
    const partners = carriers.map(carrier => carrier.partners.find(partner => partner.specId === spec.id)).filter(Boolean);
    const deltas = partners.map(row => row.missRiskEvidenceDelta);
    const transitions = {};
    for (const flagId of FLAG_IDS) transitions[flagId] = Object.freeze({
      gained: partners.filter(row => row.flagChanges[flagId] === 1).length,
      lost: partners.filter(row => row.flagChanges[flagId] === -1).length,
      netGainRate: rate(partners.filter(row => row.flagChanges[flagId] === 1).length - partners.filter(row => row.flagChanges[flagId] === -1).length, partners.length)
    });
    return Object.freeze({ spec, pairs: partners.length, riskDelta: Object.freeze({ mean: mean(deltas), median: median(deltas), positiveRate: rate(deltas.filter(value => value > 1e-12).length, deltas.length), negativeRate: rate(deltas.filter(value => value < -1e-12).length, deltas.length) }), flagTransitions: Object.freeze(transitions) });
  }));
}

const carriers = [];
for (let familyIndex = 0; familyIndex < FAMILIES.length; familyIndex += 1) {
  const family = FAMILIES[familyIndex];
  for (let instance = 1; instance <= INSTANCES_PER_FAMILY; instance += 1) {
    const seed = carrierSeed(familyIndex, instance);
    const raster = family.generator(seed);
    const clean = measure(raster);
    const split = instance <= DEVELOPMENT_INSTANCE_COUNT ? 'development' : 'holdout';
    const partners = EMBEDDING_SPECS.map((spec, specIndex) => {
      const embeddingSeed = (seed ^ ((specIndex + 1) * 0x85ebca6b)) >>> 0;
      const embedded = embedRandomLsb(raster, spec, embeddingSeed);
      const measurement = measure(embedded);
      const flagChanges = Object.fromEntries(FLAG_IDS.map(flagId => [flagId, transition(clean.flags, measurement.flags, flagId)]));
      return Object.freeze({
        specId: spec.id,
        target: spec.target,
        payloadRate: spec.payloadRate,
        placement: spec.placement,
        embeddingSeed,
        overwrittenSamples: embedded.overwrittenSamples,
        changedSamples: embedded.changedSamples,
        changedFractionOfTarget: embedded.overwrittenSamples ? embedded.changedSamples / embedded.overwrittenSamples : 0,
        measurement,
        missRiskEvidenceDelta: measurement.missRiskEvidence - clean.missRiskEvidence,
        lumaLegacyScalarDelta: measurement.lumaLegacyScalar - clean.lumaLegacyScalar,
        flagChanges: Object.freeze(flagChanges)
      });
    });
    carriers.push(Object.freeze({ carrierId: `${family.id}-${String(instance).padStart(2, '0')}`, familyId: family.id, instance, carrierSeed: seed, split, clean, partners: Object.freeze(partners) }));
  }
}

const development = carriers.filter(row => row.split === 'development');
const holdout = carriers.filter(row => row.split === 'holdout');
const byFamily = FAMILIES.map(family => Object.freeze({ familyId: family.id, development: summarizeCarrierRows(development.filter(row => row.familyId === family.id)), holdout: summarizeCarrierRows(holdout.filter(row => row.familyId === family.id)) }));
const report = Object.freeze({
  receipt: 'hb-ttrpg-raster-unresolved-independent-carrier-research-receipt',
  schemaVersion: VERSION,
  pipelineVersion: Pipeline.version,
  evidenceProfileVersion: EvidenceProfile.version,
  geometry: Object.freeze({ width: WIDTH, height: HEIGHT, tileSize: TILE_SIZE }),
  design: Object.freeze({
    unitOfIndependence: 'carrier-instance',
    families: Object.freeze(FAMILIES.map(row => row.id)),
    instancesPerFamily: INSTANCES_PER_FAMILY,
    developmentInstancesPerFamily: DEVELOPMENT_INSTANCE_COUNT,
    holdoutInstancesPerFamily: INSTANCES_PER_FAMILY - DEVELOPMENT_INSTANCE_COUNT,
    developmentCarrierCount: development.length,
    holdoutCarrierCount: holdout.length,
    totalCarrierCount: carriers.length,
    embeddedPartnersPerCarrier: EMBEDDING_SPECS.length,
    totalRasterCount: carriers.length * (1 + EMBEDDING_SPECS.length),
    embeddingSpecs: EMBEDDING_SPECS,
    splitRule: 'Instances 1-12 of every family are development; instances 13-16 are holdout. All derivatives remain in the same split as their clean carrier.',
    retainedCarrierContext: Object.freeze(['lumaResidualRoughness','lumaResidualCooccurrenceEntropy','lumaResidualDiagonalFraction','lumaResidualSymmetryError','lumaLsbEntropy','lumaLsbOneFraction','lumaLsbTransitionFraction','lumaPairChiSquare','lumaEstimatorAgreement','lumaEstimatorSpread','crossChannelPayloadRange','crossChannelEstimatorAgreementRange','crossChannelLsbEntropyRange','crossChannelPairChiSquareRange','crossChannelResidualRoughnessRange'])
  }),
  currentPrior: Object.freeze({ status: 'provisional-prior', fittedCases: 0, weights: Pipeline.constants.RASTER_UNRESOLVED_FLAG_WEIGHTS, aggregateMissRiskMultiplier: 0.24 }),
  development: summarizeCarrierRows(development),
  holdout: summarizeCarrierRows(holdout),
  developmentByEmbedding: summarizeByEmbedding(development),
  holdoutByEmbedding: summarizeByEmbedding(holdout),
  byFamily: Object.freeze(byFamily),
  carriers: Object.freeze(carriers),
  interpretationBoundary: 'Carrier instances are the unit of independence and holdout assignment occurs before considering embedded derivatives. Existing evidence-profile context measurements are retained for carrier-conditioning research without introducing new detector math. This experiment evaluates robustness of the existing evidence profile and provisional prior; it does not fit candidate weights, does not change production behavior, and does not establish real-world prevalence or universal steganography sensitivity.'
});

console.log(JSON.stringify(report, null, 2));