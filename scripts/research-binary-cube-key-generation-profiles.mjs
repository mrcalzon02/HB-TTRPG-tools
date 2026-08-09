#!/usr/bin/env node

import assert from 'node:assert/strict';
import path from 'node:path';
import process from 'node:process';
import { createRequire } from 'node:module';
import { performance } from 'node:perf_hooks';

const require = createRequire(import.meta.url);
const Engine = require(path.join(process.cwd(), 'shadowrun-binary-cube-engine.js'));

const PROFILE_VERSION = 'research-0.1.0';
const PROFILES = Object.freeze(['direct-permutation', 'iterative-chain', 'random-transposition-walk', 'nested-permutation']);
const GRID_SIZES = Object.freeze([12, 64, 128]);
const SEEDS_PER_GRID = 12;
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
  throw new Error(`Unsupported research profile: ${profile}`);
}

function generateResearchKey(profile, seed, gridSize) {
  const options = { ...BASE_OPTIONS, gridSize, seed };
  if (profile === 'direct-permutation') return Engine.createKey(options);

  // The canonical engine remains authoritative for key structure, fingerprinting,
  // masks, face legality, and collision-free validation. This research harness
  // changes only how the three complete permutations are proposed, while holding
  // the canonical direct-generator mask constant for a fair profile comparison.
  const template = Engine.createKey(options);
  const proposed = profilePermutations(profile, seed, gridSize);
  return Engine.validateKey({
    ...template,
    ...proposed,
    keyId: undefined
  });
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

function mean(values) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function keyMetrics(key) {
  const axes = [key.rowPermutation, key.columnPermutation, key.depthPermutation].map(permutationMetrics);
  const keys = Object.keys(axes[0]);
  return Object.fromEntries(keys.map(metric => [metric, mean(axes.map(axis => axis[metric]))]));
}

function keyDifferenceFraction(left, right) {
  assert.equal(left.gridSize, right.gridSize, 'Key comparison requires equal grid sizes.');
  const axes = ['rowPermutation', 'columnPermutation', 'depthPermutation'];
  let changed = 0;
  let total = 0;
  for (const axis of axes) {
    for (let index = 0; index < left[axis].length; index += 1) {
      total += 1;
      if (left[axis][index] !== right[axis][index]) changed += 1;
    }
  }
  for (let index = 0; index < left.mask.length; index += 1) {
    total += 1;
    if (Boolean(left.mask[index]) !== Boolean(right.mask[index])) changed += 1;
  }
  return changed / total;
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

function round(value, digits = 6) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

const rows = [];
for (const profile of PROFILES) {
  for (const gridSize of GRID_SIZES) {
    const metricRows = [];
    const avalancheRows = [];
    const overlapRows = [];
    const generationMilliseconds = [];
    const keys = [];

    for (let seedIndex = 0; seedIndex < SEEDS_PER_GRID; seedIndex += 1) {
      const seed = `profile-research-${gridSize}-${seedIndex}`;
      const started = performance.now();
      const key = generateResearchKey(profile, seed, gridSize);
      generationMilliseconds.push(performance.now() - started);
      const repeated = generateResearchKey(profile, seed, gridSize);
      assert.deepEqual(repeated, key, `${profile} is not deterministic at ${gridSize} for seed ${seed}.`);
      assert.equal(Engine.algebraicInvariant(key).collisionFree, true, `${profile} violated the canonical algebraic invariant at ${gridSize}.`);
      if (gridSize === GRID_SIZES[0]) Engine.assertProjectionUniqueness(key);

      const mutated = generateResearchKey(profile, `${seed}!`, gridSize);
      avalancheRows.push(keyDifferenceFraction(key, mutated));
      metricRows.push(keyMetrics(key));
      if (keys.length) overlapRows.push(permutationOverlapFraction(keys[keys.length - 1], key));
      keys.push(key);
    }

    const metricNames = Object.keys(metricRows[0]);
    rows.push(Object.freeze({
      profile,
      gridSize,
      keysTested: keys.length,
      deterministic: true,
      collisionFree: true,
      exhaustiveSixFaceCheck: gridSize === GRID_SIZES[0],
      meanGenerationMilliseconds: round(mean(generationMilliseconds), 4),
      seedMutationDifferenceFraction: round(mean(avalancheRows)),
      neighboringSeedPermutationOverlapFraction: round(mean(overlapRows)),
      metrics: Object.freeze(Object.fromEntries(metricNames.map(name => [name, round(mean(metricRows.map(row => row[name])))])))
    }));
  }
}

const byProfile = Object.fromEntries(PROFILES.map(profile => {
  const profileRows = rows.filter(row => row.profile === profile);
  return [profile, Object.freeze({
    seedMutationDifferenceFraction: round(mean(profileRows.map(row => row.seedMutationDifferenceFraction))),
    neighboringSeedPermutationOverlapFraction: round(mean(profileRows.map(row => row.neighboringSeedPermutationOverlapFraction))),
    meanNormalizedDisplacement: round(mean(profileRows.map(row => row.metrics.meanNormalizedDisplacement))),
    rmsNormalizedDisplacement: round(mean(profileRows.map(row => row.metrics.rmsNormalizedDisplacement))),
    adjacentPreservationFraction: round(mean(profileRows.map(row => row.metrics.adjacentPreservationFraction))),
    longestCycleFraction: round(mean(profileRows.map(row => row.metrics.longestCycleFraction))),
    fixedPointFraction: round(mean(profileRows.map(row => row.metrics.fixedPointFraction))),
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
  comparisonBoundary: 'Research-only candidate permutation generators. The canonical engine remains unchanged. The mask is held to the canonical direct-generator mask for each seed so this run isolates permutation-generation behavior.',
  aggregate: byProfile,
  rows
}, null, 2));
