#!/usr/bin/env node

import assert from 'node:assert/strict';
import path from 'node:path';
import process from 'node:process';
import { createRequire } from 'node:module';
import { performance } from 'node:perf_hooks';

const require = createRequire(import.meta.url);
const Engine = require(path.join(process.cwd(), 'shadowrun-binary-cube-engine.js'));

const PROFILE_VERSION = 'research-0.2.0';
const PROFILES = Object.freeze([
  'direct-permutation',
  'iterative-chain',
  'random-transposition-walk',
  'nested-permutation',
  'nested-hierarchy'
]);
const GRID_SIZES = Object.freeze([12, 64, 128]);
const SEEDS_PER_GRID = 16;
const BASE_OPTIONS = Object.freeze({
  inputFace: 'top',
  outputFace: 'front',
  inputQuarterTurns: 0,
  outputQuarterTurns: 0,
  maskDensity: 0.75
});

function fnv1a32(value) {
  let hash = 0x811c9dc5;
  const text = String(value ?? '');
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function mulberry32(seed) {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let result = state;
    result = Math.imul(result ^ (result >>> 15), result | 1);
    result ^= result + Math.imul(result ^ (result >>> 7), result | 61);
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
  };
}

function range(size) {
  return Array.from({ length: size }, (_, index) => index);
}

function shuffle(values, random) {
  const output = [...values];
  for (let index = output.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [output[index], output[swapIndex]] = [output[swapIndex], output[index]];
  }
  return output;
}

function assertPermutation(values, size, label) {
  assert.equal(values.length, size, `${label} has the wrong length.`);
  const sorted = [...values].sort((a, b) => a - b);
  for (let index = 0; index < size; index += 1) assert.equal(sorted[index], index, `${label} is not a complete permutation.`);
  return values;
}

function iterativePermutation(size, seed, domain) {
  const output = range(size);
  let state = fnv1a32(`${seed}|${size}|iterative-chain|${domain}|${PROFILE_VERSION}`);
  const rounds = Math.max(8 * size, 96);
  for (let step = 0; step < rounds; step += 1) {
    state = fnv1a32(`${state}|${domain}|a|${step}`);
    const left = state % size;
    state = fnv1a32(`${state}|${domain}|b|${step}`);
    const right = state % size;
    [output[left], output[right]] = [output[right], output[left]];
  }
  return assertPermutation(output, size, `${domain} iterative permutation`);
}

function randomWalkPermutation(size, seed, domain) {
  const output = range(size);
  const random = mulberry32(fnv1a32(`${seed}|${size}|random-transposition-walk|${domain}|${PROFILE_VERSION}`));
  const steps = Math.max(24 * size, 256);
  for (let step = 0; step < steps; step += 1) {
    const left = Math.floor(random() * size);
    let right = Math.floor(random() * (size - 1));
    if (right >= left) right += 1;
    [output[left], output[right]] = [output[right], output[left]];
  }
  return assertPermutation(output, size, `${domain} random-walk permutation`);
}

function composePermutations(outer, inner) {
  assert.equal(outer.length, inner.length, 'Permutation composition requires equal domains.');
  return inner.map(value => outer[value]);
}

function nestedPermutation(size, seed, domain) {
  const levels = ['outer', 'middle', 'inner'];
  let output = range(size);
  for (const level of levels) {
    const random = mulberry32(fnv1a32(`${seed}|${size}|nested-permutation|${domain}|${level}|${PROFILE_VERSION}`));
    const child = shuffle(range(size), random);
    output = composePermutations(output, child);
  }
  return assertPermutation(output, size, `${domain} nested permutation`);
}

function nestedHierarchyPermutation(size, seed, domain) {
  function recurse(values, nodePath) {
    if (values.length <= 4) {
      const random = mulberry32(fnv1a32(`${seed}|${size}|nested-hierarchy|${domain}|${nodePath}|leaf|${PROFILE_VERSION}`));
      return shuffle(values, random);
    }
    const split = Math.ceil(values.length / 2);
    const left = recurse(values.slice(0, split), `${nodePath}L`);
    const right = recurse(values.slice(split), `${nodePath}R`);
    const random = mulberry32(fnv1a32(`${seed}|${size}|nested-hierarchy|${domain}|${nodePath}|branch|${PROFILE_VERSION}`));
    return random() < 0.5 ? [...left, ...right] : [...right, ...left];
  }
  return assertPermutation(recurse(range(size), 'root'), size, `${domain} nested hierarchy permutation`);
}

function profilePermutations(profile, seed, size) {
  if (profile === 'iterative-chain') {
    return {
      rowPermutation: iterativePermutation(size, seed, 'row'),
      columnPermutation: iterativePermutation(size, seed, 'column'),
      depthPermutation: iterativePermutation(size, seed, 'depth')
    };
  }
  if (profile === 'random-transposition-walk') {
    return {
      rowPermutation: randomWalkPermutation(size, seed, 'row'),
      columnPermutation: randomWalkPermutation(size, seed, 'column'),
      depthPermutation: randomWalkPermutation(size, seed, 'depth')
    };
  }
  if (profile === 'nested-permutation') {
    return {
      rowPermutation: nestedPermutation(size, seed, 'row'),
      columnPermutation: nestedPermutation(size, seed, 'column'),
      depthPermutation: nestedPermutation(size, seed, 'depth')
    };
  }
  if (profile === 'nested-hierarchy') {
    return {
      rowPermutation: nestedHierarchyPermutation(size, seed, 'row'),
      columnPermutation: nestedHierarchyPermutation(size, seed, 'column'),
      depthPermutation: nestedHierarchyPermutation(size, seed, 'depth')
    };
  }
  throw new Error(`Unsupported research profile: ${profile}`);
}

function generateResearchKey(profile, seed, gridSize) {
  const options = { ...BASE_OPTIONS, gridSize, seed };
  if (profile === 'direct-permutation') return Engine.createKey(options);

  // The canonical engine remains authoritative for key structure, fingerprinting,
  // masks, face legality, and collision-free validation. Candidate profiles alter
  // only the proposed complete row/column/depth permutations. The canonical direct
  // generator's mask is deliberately held constant for a same-seed profile comparison.
  const template = Engine.createKey(options);
  const proposed = profilePermutations(profile, seed, gridSize);
  return Engine.validateKey({ ...template, ...proposed, keyId: undefined });
}

function cycleMetrics(permutation) {
  const visited = new Uint8Array(permutation.length);
  const lengths = [];
  for (let start = 0; start < permutation.length; start += 1) {
    if (visited[start]) continue;
    let cursor = start;
    let length = 0;
    while (!visited[cursor]) {
      visited[cursor] = 1;
      length += 1;
      cursor = permutation[cursor];
    }
    lengths.push(length);
  }
  return {
    cycleCount: lengths.length,
    longestCycleFraction: Math.max(...lengths) / permutation.length,
    singletonCycleFraction: lengths.filter(length => length === 1).length / permutation.length
  };
}

function permutationMetrics(permutation) {
  const size = permutation.length;
  let displacement = 0;
  let squaredDisplacement = 0;
  let adjacentPreserved = 0;
  let fixed = 0;
  for (let index = 0; index < size; index += 1) {
    const delta = Math.abs(permutation[index] - index);
    displacement += delta;
    squaredDisplacement += delta * delta;
    if (delta === 0) fixed += 1;
    if (index + 1 < size && Math.abs(permutation[index + 1] - permutation[index]) === 1) adjacentPreserved += 1;
  }
  return {
    fixedPointFraction: fixed / size,
    meanNormalizedDisplacement: displacement / (size * Math.max(1, size - 1)),
    rmsNormalizedDisplacement: Math.sqrt(squaredDisplacement / size) / Math.max(1, size - 1),
    adjacentPreservationFraction: adjacentPreserved / Math.max(1, size - 1),
    ...cycleMetrics(permutation)
  };
}

function pearson(left, right) {
  assert.equal(left.length, right.length, 'Correlation requires equal vectors.');
  if (!left.length) return 0;
  const leftMean = mean(left);
  const rightMean = mean(right);
  let covariance = 0;
  let leftVariance = 0;
  let rightVariance = 0;
  for (let index = 0; index < left.length; index += 1) {
    const a = left[index] - leftMean;
    const b = right[index] - rightMean;
    covariance += a * b;
    leftVariance += a * a;
    rightVariance += b * b;
  }
  return leftVariance && rightVariance ? covariance / Math.sqrt(leftVariance * rightVariance) : 0;
}

function mean(values) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function keyMetrics(key) {
  const permutations = [key.rowPermutation, key.columnPermutation, key.depthPermutation];
  const axes = permutations.map(permutationMetrics);
  const keys = Object.keys(axes[0]);
  const correlations = [
    Math.abs(pearson(permutations[0], permutations[1])),
    Math.abs(pearson(permutations[0], permutations[2])),
    Math.abs(pearson(permutations[1], permutations[2]))
  ];
  return {
    ...Object.fromEntries(keys.map(metric => [metric, mean(axes.map(axis => axis[metric]))])),
    meanAbsoluteInterAxisCorrelation: mean(correlations)
  };
}

function permutationOverlapFraction(left, right) {
  const axes = ['rowPermutation', 'columnPermutation', 'depthPermutation'];
  let same = 0;
  let total = 0;
  for (const axis of axes) {
    for (let index = 0; index < left[axis].length; index += 1) {
      total += 1;
      if (left[axis][index] === right[axis][index]) same += 1;
    }
  }
  return same / total;
}

function maskDifferenceFraction(left, right) {
  assert.equal(left.mask.length, right.mask.length, 'Mask comparison requires equal domains.');
  let changed = 0;
  for (let index = 0; index < left.mask.length; index += 1) if (Boolean(left.mask[index]) !== Boolean(right.mask[index])) changed += 1;
  return changed / Math.max(1, left.mask.length);
}

function bitDifferenceFraction(leftValue, rightValue) {
  const left = String(leftValue || '');
  const right = String(rightValue || '');
  assert.equal(left.length, right.length, 'Bit comparison requires equal lengths.');
  let changed = 0;
  for (let index = 0; index < left.length; index += 1) if (left[index] !== right[index]) changed += 1;
  return changed / Math.max(1, left.length);
}

function researchPayload(gridSize) {
  const length = Math.min(4096, Math.max(512, gridSize * gridSize * 2));
  const random = mulberry32(fnv1a32(`binary-cube-profile-research-payload|${gridSize}|v1`));
  return Array.from({ length }, () => random() >= 0.5 ? '1' : '0').join('');
}

function round(value, digits = 6) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

const rows = [];
for (const profile of PROFILES) {
  for (const gridSize of GRID_SIZES) {
    const metricRows = [];
    const permutationMutationRows = [];
    const maskMutationRows = [];
    const ciphertextMutationRows = [];
    const neighboringOverlapRows = [];
    const directOverlapRows = [];
    const directCiphertextDifferenceRows = [];
    const generationMilliseconds = [];
    const keyIds = new Set();
    const keys = [];
    const payload = researchPayload(gridSize);

    for (let seedIndex = 0; seedIndex < SEEDS_PER_GRID; seedIndex += 1) {
      const seed = `profile-research-${gridSize}-${seedIndex}`;
      const started = performance.now();
      const key = generateResearchKey(profile, seed, gridSize);
      generationMilliseconds.push(performance.now() - started);
      const repeated = generateResearchKey(profile, seed, gridSize);
      assert.deepEqual(repeated, key, `${profile} is not deterministic at ${gridSize} for seed ${seed}.`);
      assert.equal(Engine.algebraicInvariant(key).collisionFree, true, `${profile} violated the canonical algebraic invariant at ${gridSize}.`);
      if (gridSize === GRID_SIZES[0]) Engine.assertProjectionUniqueness(key);
      keyIds.add(key.keyId);

      const mutated = generateResearchKey(profile, `${seed}!`, gridSize);
      const direct = generateResearchKey('direct-permutation', seed, gridSize);
      permutationMutationRows.push(1 - permutationOverlapFraction(key, mutated));
      maskMutationRows.push(maskDifferenceFraction(key, mutated));
      directOverlapRows.push(permutationOverlapFraction(key, direct));

      const encrypted = Engine.encryptBinary(payload, key);
      const mutatedEncrypted = Engine.encryptBinary(payload, mutated);
      const directEncrypted = Engine.encryptBinary(payload, direct);
      ciphertextMutationRows.push(bitDifferenceFraction(encrypted.ciphertext, mutatedEncrypted.ciphertext));
      directCiphertextDifferenceRows.push(bitDifferenceFraction(encrypted.ciphertext, directEncrypted.ciphertext));

      metricRows.push(keyMetrics(key));
      if (keys.length) neighboringOverlapRows.push(permutationOverlapFraction(keys[keys.length - 1], key));
      keys.push(key);
    }

    assert.equal(keyIds.size, SEEDS_PER_GRID, `${profile} produced a repeated key ID at grid ${gridSize}.`);
    const metricNames = Object.keys(metricRows[0]);
    const expectedRandomPositionOverlap = 1 / gridSize;
    const expectedRandomAdjacentPreservation = 2 / gridSize;
    rows.push(Object.freeze({
      profile,
      gridSize,
      keysTested: keys.length,
      uniqueKeyIds: keyIds.size,
      deterministic: true,
      collisionFree: true,
      exhaustiveSixFaceCheck: gridSize === GRID_SIZES[0],
      meanGenerationMilliseconds: round(mean(generationMilliseconds), 4),
      permutationSeedMutationDifferenceFraction: round(mean(permutationMutationRows)),
      maskSeedMutationDifferenceFraction: round(mean(maskMutationRows)),
      ciphertextSeedMutationDifferenceFraction: round(mean(ciphertextMutationRows)),
      neighboringSeedPermutationOverlapFraction: round(mean(neighboringOverlapRows)),
      directSameSeedPermutationOverlapFraction: round(mean(directOverlapRows)),
      directSameSeedCiphertextDifferenceFraction: round(mean(directCiphertextDifferenceRows)),
      expectedRandomPositionOverlap: round(expectedRandomPositionOverlap),
      expectedRandomAdjacentPreservation: round(expectedRandomAdjacentPreservation),
      metrics: Object.freeze({
        ...Object.fromEntries(metricNames.map(name => [name, round(mean(metricRows.map(row => row[name])))])),
        adjacentPreservationVsRandomRatio: round(mean(metricRows.map(row => row.adjacentPreservationFraction)) / expectedRandomAdjacentPreservation),
        fixedPointVsRandomRatio: round(mean(metricRows.map(row => row.fixedPointFraction)) / expectedRandomPositionOverlap)
      })
    }));
  }
}

const byProfile = Object.fromEntries(PROFILES.map(profile => {
  const profileRows = rows.filter(row => row.profile === profile);
  return [profile, Object.freeze({
    permutationSeedMutationDifferenceFraction: round(mean(profileRows.map(row => row.permutationSeedMutationDifferenceFraction))),
    maskSeedMutationDifferenceFraction: round(mean(profileRows.map(row => row.maskSeedMutationDifferenceFraction))),
    ciphertextSeedMutationDifferenceFraction: round(mean(profileRows.map(row => row.ciphertextSeedMutationDifferenceFraction))),
    neighboringSeedPermutationOverlapFraction: round(mean(profileRows.map(row => row.neighboringSeedPermutationOverlapFraction))),
    directSameSeedPermutationOverlapFraction: round(mean(profileRows.map(row => row.directSameSeedPermutationOverlapFraction))),
    directSameSeedCiphertextDifferenceFraction: round(mean(profileRows.map(row => row.directSameSeedCiphertextDifferenceFraction))),
    meanNormalizedDisplacement: round(mean(profileRows.map(row => row.metrics.meanNormalizedDisplacement))),
    rmsNormalizedDisplacement: round(mean(profileRows.map(row => row.metrics.rmsNormalizedDisplacement))),
    adjacentPreservationFraction: round(mean(profileRows.map(row => row.metrics.adjacentPreservationFraction))),
    adjacentPreservationVsRandomRatio: round(mean(profileRows.map(row => row.metrics.adjacentPreservationVsRandomRatio))),
    longestCycleFraction: round(mean(profileRows.map(row => row.metrics.longestCycleFraction))),
    fixedPointFraction: round(mean(profileRows.map(row => row.metrics.fixedPointFraction))),
    fixedPointVsRandomRatio: round(mean(profileRows.map(row => row.metrics.fixedPointVsRandomRatio))),
    meanAbsoluteInterAxisCorrelation: round(mean(profileRows.map(row => row.metrics.meanAbsoluteInterAxisCorrelation))),
    meanGenerationMilliseconds: round(mean(profileRows.map(row => row.meanGenerationMilliseconds)), 4)
  })];
}));

console.log(JSON.stringify({
  format: 'hb-ttrpg-binary-cube-key-generation-profile-research-receipt',
  schemaVersion: PROFILE_VERSION,
  pass: true,
  canonicalEngineSchemaVersion: Engine.constants.SCHEMA_VERSION,
  profiles: PROFILES,
  gridSizes: GRID_SIZES,
  seedsPerGrid: SEEDS_PER_GRID,
  totalKeysValidated: PROFILES.length * GRID_SIZES.length * SEEDS_PER_GRID,
  comparisonBoundary: 'Research-only candidate permutation generators. The canonical engine remains unchanged. The direct generator mask is held constant across profiles for a given seed. Mutation tests separately report permutation, mask, and actual ciphertext bit differences.',
  interpretationBoundary: 'Permutation composition can collapse to another ordinary permutation. Extra generation steps are not treated as added security unless they produce independently useful measurable behavior without introducing structure.',
  aggregate: byProfile,
  rows
}, null, 2));
