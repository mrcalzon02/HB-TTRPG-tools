(function installBinaryCubeKeyGenerationResearch(root, factory) {
  'use strict';
  const Engine = root?.ShadowrunBinaryCubeEngine
    || (typeof module === 'object' && module.exports && typeof require === 'function'
      ? require('./shadowrun-binary-cube-engine.js')
      : null);
  const api = factory(Engine);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.BinaryCubeKeyGenerationResearch = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function createBinaryCubeKeyGenerationResearch(Engine) {
  'use strict';

  if (!Engine) throw new Error('Binary Cube key-generation research requires ShadowrunBinaryCubeEngine.');

  const RESEARCH_SCHEMA_VERSION = 'research-0.4.0';
  const PROFILE_DEFINITIONS = Object.freeze([
    Object.freeze({ id: 'direct-permutation', label: 'Direct permutation', family: 'baseline', disposition: 'baseline', note: 'Canonical compatibility generator.' }),
    Object.freeze({ id: 'iterative-chain', label: 'Iterative chain', family: 'iterative', disposition: 'candidate', note: 'History-dependent deterministic transposition chain.' }),
    Object.freeze({ id: 'random-transposition-walk', label: 'Global random walk', family: 'walk', disposition: 'candidate', note: 'Global seeded transposition walk through permutation space.' }),
    Object.freeze({ id: 'local-adjacent-walk', label: 'Local adjacent walk', family: 'walk', disposition: 'rejected', note: 'Nearest-neighbor walk retained for structural counterexamples.' }),
    Object.freeze({ id: 'nested-permutation', label: 'Nested permutation composition', family: 'nested', disposition: 'research', note: 'Composes complete domain-separated permutations.' }),
    Object.freeze({ id: 'nested-hierarchy', label: 'Nested hierarchy', family: 'nested', disposition: 'rejected', note: 'Recursive block hierarchy retained as a structural counterexample.' }),
    Object.freeze({ id: 'nested-interleaved', label: 'Nested interleaved hierarchy', family: 'nested', disposition: 'research', note: 'Recursive child derivation with interleaved branch merge.' })
  ]);
  const PROFILES = Object.freeze(PROFILE_DEFINITIONS.map(profile => profile.id));
  const DEFAULT_BASE_OPTIONS = Object.freeze({
    inputFace: 'top',
    outputFace: 'front',
    inputQuarterTurns: 0,
    outputQuarterTurns: 0,
    maskDensity: 0.75
  });

  function fail(message) { throw new Error(message); }
  function invariant(condition, message) { if (!condition) fail(message); }

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

  function range(size) { return Array.from({ length: size }, (_, index) => index); }

  function shuffle(values, random) {
    const output = [...values];
    for (let index = output.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(random() * (index + 1));
      [output[index], output[swapIndex]] = [output[swapIndex], output[index]];
    }
    return output;
  }

  function assertPermutation(values, size, label) {
    invariant(Array.isArray(values) && values.length === size, `${label} has the wrong length.`);
    const seen = new Uint8Array(size);
    for (const value of values) {
      invariant(Number.isInteger(value) && value >= 0 && value < size && !seen[value], `${label} is not a complete permutation.`);
      seen[value] = 1;
    }
    return values;
  }

  function iterativePermutation(size, seed, domain) {
    const output = range(size);
    let state = fnv1a32(`${seed}|${size}|iterative-chain|${domain}|${RESEARCH_SCHEMA_VERSION}`);
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
    const random = mulberry32(fnv1a32(`${seed}|${size}|random-transposition-walk|${domain}|${RESEARCH_SCHEMA_VERSION}`));
    const steps = Math.max(24 * size, 256);
    for (let step = 0; step < steps; step += 1) {
      const left = Math.floor(random() * size);
      let right = Math.floor(random() * Math.max(1, size - 1));
      if (right >= left) right += 1;
      [output[left], output[right]] = [output[right], output[left]];
    }
    return assertPermutation(output, size, `${domain} global random-walk permutation`);
  }

  function localAdjacentWalkPermutation(size, seed, domain) {
    const output = range(size);
    const random = mulberry32(fnv1a32(`${seed}|${size}|local-adjacent-walk|${domain}|${RESEARCH_SCHEMA_VERSION}`));
    let walker = Math.floor(random() * size);
    const steps = Math.max(64 * size, 1024);
    for (let step = 0; step < steps; step += 1) {
      const direction = random() < 0.5 ? -1 : 1;
      let neighbor = walker + direction;
      if (neighbor < 0) neighbor = Math.min(1, size - 1);
      if (neighbor >= size) neighbor = Math.max(0, size - 2);
      [output[walker], output[neighbor]] = [output[neighbor], output[walker]];
      walker = neighbor;
    }
    return assertPermutation(output, size, `${domain} local-adjacent-walk permutation`);
  }

  function composePermutations(outer, inner) {
    invariant(outer.length === inner.length, 'Permutation composition requires equal domains.');
    return inner.map(value => outer[value]);
  }

  function nestedPermutation(size, seed, domain) {
    let output = range(size);
    for (const level of ['outer', 'middle', 'inner']) {
      const random = mulberry32(fnv1a32(`${seed}|${size}|nested-permutation|${domain}|${level}|${RESEARCH_SCHEMA_VERSION}`));
      output = composePermutations(output, shuffle(range(size), random));
    }
    return assertPermutation(output, size, `${domain} nested permutation`);
  }

  function nestedHierarchyPermutation(size, seed, domain) {
    function recurse(values, nodePath) {
      if (values.length <= 4) {
        const random = mulberry32(fnv1a32(`${seed}|${size}|nested-hierarchy|${domain}|${nodePath}|leaf|${RESEARCH_SCHEMA_VERSION}`));
        return shuffle(values, random);
      }
      const split = Math.ceil(values.length / 2);
      const left = recurse(values.slice(0, split), `${nodePath}L`);
      const right = recurse(values.slice(split), `${nodePath}R`);
      const random = mulberry32(fnv1a32(`${seed}|${size}|nested-hierarchy|${domain}|${nodePath}|branch|${RESEARCH_SCHEMA_VERSION}`));
      return random() < 0.5 ? [...left, ...right] : [...right, ...left];
    }
    return assertPermutation(recurse(range(size), 'root'), size, `${domain} nested hierarchy permutation`);
  }

  function nestedInterleavedPermutation(size, seed, domain) {
    function recurse(values, nodePath) {
      if (values.length <= 4) {
        const random = mulberry32(fnv1a32(`${seed}|${size}|nested-interleaved|${domain}|${nodePath}|leaf|${RESEARCH_SCHEMA_VERSION}`));
        return shuffle(values, random);
      }
      const split = Math.ceil(values.length / 2);
      const left = recurse(values.slice(0, split), `${nodePath}L`);
      const right = recurse(values.slice(split), `${nodePath}R`);
      const random = mulberry32(fnv1a32(`${seed}|${size}|nested-interleaved|${domain}|${nodePath}|merge|${RESEARCH_SCHEMA_VERSION}`));
      const merged = [];
      let leftIndex = 0;
      let rightIndex = 0;
      while (leftIndex < left.length || rightIndex < right.length) {
        const chooseLeft = rightIndex >= right.length || (leftIndex < left.length && random() < 0.5);
        merged.push(chooseLeft ? left[leftIndex++] : right[rightIndex++]);
      }
      return merged;
    }
    return assertPermutation(recurse(range(size), 'root'), size, `${domain} nested interleaved permutation`);
  }

  function profilePermutations(profile, seed, size) {
    const builders = {
      'iterative-chain': iterativePermutation,
      'random-transposition-walk': randomWalkPermutation,
      'local-adjacent-walk': localAdjacentWalkPermutation,
      'nested-permutation': nestedPermutation,
      'nested-hierarchy': nestedHierarchyPermutation,
      'nested-interleaved': nestedInterleavedPermutation
    };
    const builder = builders[profile];
    if (!builder) fail(`Unsupported research profile: ${profile}`);
    return {
      rowPermutation: builder(size, seed, 'row'),
      columnPermutation: builder(size, seed, 'column'),
      depthPermutation: builder(size, seed, 'depth')
    };
  }

  function normalizeGridSize(value) {
    const gridSize = Number(value);
    invariant(Number.isInteger(gridSize) && gridSize >= Engine.constants.MIN_GRID_SIZE && gridSize <= Engine.constants.MAX_GRID_SIZE, `Grid size must be ${Engine.constants.MIN_GRID_SIZE}-${Engine.constants.MAX_GRID_SIZE}.`);
    return gridSize;
  }

  function generateResearchKey(profileValue, seedValue, gridSizeValue, baseOptions = {}) {
    const profile = String(profileValue || 'direct-permutation');
    invariant(PROFILES.includes(profile), `Unsupported research profile: ${profile}`);
    const gridSize = normalizeGridSize(gridSizeValue);
    const seed = String(seedValue ?? 'binary-cube-profile-research');
    const options = { ...DEFAULT_BASE_OPTIONS, ...baseOptions, gridSize, seed };
    if (profile === 'direct-permutation') return Engine.createKey(options);
    const template = Engine.createKey(options);
    const proposed = profilePermutations(profile, seed, gridSize);
    return Engine.validateKey({ ...template, ...proposed, keyId: undefined });
  }

  function pointDepthForKey(key, x, y) {
    const latinValue = (key.rowPermutation[x] + key.columnPermutation[y]) % key.gridSize;
    return key.depthPermutation[latinValue];
  }

  function mean(values) { return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0; }
  function round(value, digits = 6) { const factor = 10 ** digits; return Math.round(value * factor) / factor; }

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

  function regionalPredictabilityFraction(permutation, regionCountValue = 8) {
    const size = permutation.length;
    const regionCount = Math.max(2, Math.min(size, Math.round(regionCountValue) || 8));
    const counts = Array.from({ length: regionCount }, () => new Uint32Array(regionCount));
    const sourceCounts = new Uint32Array(regionCount);
    const destinationCounts = new Uint32Array(regionCount);
    const regionOf = value => Math.min(regionCount - 1, Math.floor(value * regionCount / size));
    for (let source = 0; source < size; source += 1) {
      const sourceRegion = regionOf(source);
      const destinationRegion = regionOf(permutation[source]);
      counts[sourceRegion][destinationRegion] += 1;
      sourceCounts[sourceRegion] += 1;
      destinationCounts[destinationRegion] += 1;
    }
    let mutualInformation = 0;
    let destinationEntropy = 0;
    for (let destination = 0; destination < regionCount; destination += 1) {
      const probability = destinationCounts[destination] / size;
      if (probability > 0) destinationEntropy -= probability * Math.log2(probability);
    }
    for (let source = 0; source < regionCount; source += 1) {
      for (let destination = 0; destination < regionCount; destination += 1) {
        const joint = counts[source][destination] / size;
        if (!joint) continue;
        const sourceProbability = sourceCounts[source] / size;
        const destinationProbability = destinationCounts[destination] / size;
        mutualInformation += joint * Math.log2(joint / (sourceProbability * destinationProbability));
      }
    }
    return destinationEntropy > 0 ? mutualInformation / destinationEntropy : 0;
  }

  function permutationMetrics(permutation) {
    const size = permutation.length;
    let displacement = 0;
    let squaredDisplacement = 0;
    let adjacentPreserved = 0;
    let adjacentDestinationDistance = 0;
    let fixed = 0;
    for (let index = 0; index < size; index += 1) {
      const delta = Math.abs(permutation[index] - index);
      displacement += delta;
      squaredDisplacement += delta * delta;
      if (delta === 0) fixed += 1;
      if (index + 1 < size) {
        const neighborDistance = Math.abs(permutation[index + 1] - permutation[index]);
        adjacentDestinationDistance += neighborDistance;
        if (neighborDistance === 1) adjacentPreserved += 1;
      }
    }
    return {
      fixedPointFraction: fixed / size,
      meanNormalizedDisplacement: displacement / (size * Math.max(1, size - 1)),
      rmsNormalizedDisplacement: Math.sqrt(squaredDisplacement / size) / Math.max(1, size - 1),
      adjacentPreservationFraction: adjacentPreserved / Math.max(1, size - 1),
      meanNeighborDestinationDistanceNormalized: adjacentDestinationDistance / (Math.max(1, size - 1) * Math.max(1, size - 1)),
      regionalPredictabilityFraction: regionalPredictabilityFraction(permutation),
      ...cycleMetrics(permutation)
    };
  }

  function pearson(left, right) {
    invariant(left.length === right.length, 'Correlation requires equal vectors.');
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

  function pointSurfaceRoughness(key) {
    const size = key.gridSize;
    let total = 0;
    let count = 0;
    for (let x = 0; x < size; x += 1) {
      for (let y = 0; y < size; y += 1) {
        const depth = pointDepthForKey(key, x, y);
        if (x + 1 < size) { total += Math.abs(depth - pointDepthForKey(key, x + 1, y)); count += 1; }
        if (y + 1 < size) { total += Math.abs(depth - pointDepthForKey(key, x, y + 1)); count += 1; }
      }
    }
    return count ? total / (count * Math.max(1, size - 1)) : 0;
  }

  function keyMetrics(keyValue) {
    const key = Engine.validateKey(keyValue);
    const permutations = [key.rowPermutation, key.columnPermutation, key.depthPermutation];
    const axes = permutations.map(permutationMetrics);
    const metricNames = Object.keys(axes[0]);
    const correlations = [
      Math.abs(pearson(permutations[0], permutations[1])),
      Math.abs(pearson(permutations[0], permutations[2])),
      Math.abs(pearson(permutations[1], permutations[2]))
    ];
    const expectedRandomPositionOverlap = 1 / key.gridSize;
    const expectedRandomAdjacentPreservation = 2 / key.gridSize;
    const averaged = Object.fromEntries(metricNames.map(metric => [metric, mean(axes.map(axis => axis[metric]))]));
    return {
      ...averaged,
      adjacentPreservationVsRandomRatio: averaged.adjacentPreservationFraction / expectedRandomAdjacentPreservation,
      fixedPointVsRandomRatio: averaged.fixedPointFraction / expectedRandomPositionOverlap,
      meanAbsoluteInterAxisCorrelation: mean(correlations),
      pointSurfaceRoughness: pointSurfaceRoughness(key)
    };
  }

  function evaluateMetrics(metrics, options = {}) {
    const ignoreAdjacency = options.ignoreAdjacency === true;
    const concerns = [];
    if (metrics.meanAbsoluteInterAxisCorrelation > 0.25) concerns.push('axis-coupling');
    if (metrics.regionalPredictabilityFraction > 0.25) concerns.push('regional-predictability');
    if (metrics.fixedPointVsRandomRatio > 4) concerns.push('fixed-position-concentration');
    if (metrics.meanNormalizedDisplacement < 0.15) concerns.push('short-range-displacement');
    if (!ignoreAdjacency && metrics.adjacentPreservationVsRandomRatio > 2) concerns.push('adjacency-retention');
    return Object.freeze({
      ignoreAdjacency,
      concerns: Object.freeze(concerns),
      classification: concerns.length ? 'structurally-conspicuous' : 'no-obvious-structure-in-current-probes',
      boundary: 'This is a structural diagnostic, not a cryptographic security proof.'
    });
  }

  function sampleAxisIndexes(size, sampleResolution) {
    const count = Math.max(2, Math.min(size, Math.round(sampleResolution) || Math.min(size, 32)));
    const output = [];
    for (let index = 0; index < count; index += 1) output.push(Math.round(index * (size - 1) / Math.max(1, count - 1)));
    return output;
  }

  function buildProfileSnapshot(profile, seed, gridSize, options = {}) {
    const key = generateResearchKey(profile, seed, gridSize, options.baseOptions || {});
    const metrics = keyMetrics(key);
    const axisIndexes = sampleAxisIndexes(key.gridSize, options.sampleResolution || 32);
    const depths = [];
    for (const x of axisIndexes) {
      for (const y of axisIndexes) depths.push(pointDepthForKey(key, x, y));
    }
    return Object.freeze({
      profile,
      profileDefinition: PROFILE_DEFINITIONS.find(candidate => candidate.id === profile),
      seed: key.seed,
      gridSize: key.gridSize,
      keyId: key.keyId,
      sampleAxisIndexes: Object.freeze(axisIndexes),
      depths: Object.freeze(depths),
      metrics: Object.freeze(Object.fromEntries(Object.entries(metrics).map(([name, value]) => [name, round(value)]))),
      evaluation: evaluateMetrics(metrics, { ignoreAdjacency: false }),
      evaluationIgnoringAdjacency: evaluateMetrics(metrics, { ignoreAdjacency: true })
    });
  }

  function buildComparisonSnapshot(options = {}) {
    const seed = String(options.seed ?? 'binary-cube-profile-structure-demo');
    const gridSize = normalizeGridSize(options.gridSize ?? 64);
    const profiles = Array.isArray(options.profiles) && options.profiles.length ? options.profiles.map(String) : PROFILES;
    profiles.forEach(profile => invariant(PROFILES.includes(profile), `Unsupported research profile: ${profile}`));
    return Object.freeze({
      format: 'hb-ttrpg-binary-cube-key-generation-structure-snapshot',
      schemaVersion: RESEARCH_SCHEMA_VERSION,
      seed,
      gridSize,
      profiles: Object.freeze(profiles.map(profile => buildProfileSnapshot(profile, seed, gridSize, options))),
      interpretationBoundary: 'Adjacency is reported as a structural clue, not an automatic failure. Predictability, axis leakage, fixed-position concentration, displacement, regional retention, and direct cryptanalytic evidence must be considered separately.'
    });
  }

  function permutationOverlapFraction(left, right) {
    let same = 0;
    let total = 0;
    for (const axis of ['rowPermutation', 'columnPermutation', 'depthPermutation']) {
      for (let index = 0; index < left[axis].length; index += 1) {
        total += 1;
        if (left[axis][index] === right[axis][index]) same += 1;
      }
    }
    return same / Math.max(1, total);
  }

  function maskDifferenceFraction(left, right) {
    invariant(left.mask.length === right.mask.length, 'Mask comparison requires equal domains.');
    let changed = 0;
    for (let index = 0; index < left.mask.length; index += 1) if (Boolean(left.mask[index]) !== Boolean(right.mask[index])) changed += 1;
    return changed / Math.max(1, left.mask.length);
  }

  function bitDifferenceFraction(leftValue, rightValue) {
    const left = String(leftValue || '');
    const right = String(rightValue || '');
    invariant(left.length === right.length, 'Bit comparison requires equal lengths.');
    let changed = 0;
    for (let index = 0; index < left.length; index += 1) if (left[index] !== right[index]) changed += 1;
    return changed / Math.max(1, left.length);
  }

  function researchPayload(gridSize) {
    const length = Math.min(4096, Math.max(512, gridSize * gridSize * 2));
    const random = mulberry32(fnv1a32(`binary-cube-profile-research-payload|${gridSize}|v1`));
    return Array.from({ length }, () => random() >= 0.5 ? '1' : '0').join('');
  }

  function nowMilliseconds() { return globalThis.performance?.now?.() ?? Date.now(); }

  function runResearchMatrix(options = {}) {
    const profiles = Array.isArray(options.profiles) && options.profiles.length ? options.profiles.map(String) : PROFILES;
    const gridSizes = Array.isArray(options.gridSizes) && options.gridSizes.length ? options.gridSizes.map(normalizeGridSize) : [12, 64, 128];
    const seedsPerGrid = Math.max(1, Math.round(Number(options.seedsPerGrid) || 16));
    const exhaustiveGridSize = Math.min(...gridSizes);
    const rows = [];

    for (const profile of profiles) {
      invariant(PROFILES.includes(profile), `Unsupported research profile: ${profile}`);
      for (const gridSize of gridSizes) {
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

        for (let seedIndex = 0; seedIndex < seedsPerGrid; seedIndex += 1) {
          const seed = `profile-research-${gridSize}-${seedIndex}`;
          const started = nowMilliseconds();
          const key = generateResearchKey(profile, seed, gridSize);
          generationMilliseconds.push(nowMilliseconds() - started);
          const repeated = generateResearchKey(profile, seed, gridSize);
          invariant(JSON.stringify(repeated) === JSON.stringify(key), `${profile} is not deterministic at ${gridSize} for seed ${seed}.`);
          invariant(Engine.algebraicInvariant(key).collisionFree === true, `${profile} violated the canonical algebraic invariant at ${gridSize}.`);
          if (gridSize === exhaustiveGridSize) Engine.assertProjectionUniqueness(key);
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

        invariant(keyIds.size === seedsPerGrid, `${profile} produced a repeated key ID at grid ${gridSize}.`);
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
          exhaustiveSixFaceCheck: gridSize === exhaustiveGridSize,
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
            ...Object.fromEntries(metricNames.map(name => [name, round(mean(metricRows.map(row => row[name])))]))
          })
        }));
      }
    }

    const aggregate = Object.fromEntries(profiles.map(profile => {
      const profileRows = rows.filter(row => row.profile === profile);
      const metricNames = Object.keys(profileRows[0].metrics);
      return [profile, Object.freeze({
        permutationSeedMutationDifferenceFraction: round(mean(profileRows.map(row => row.permutationSeedMutationDifferenceFraction))),
        maskSeedMutationDifferenceFraction: round(mean(profileRows.map(row => row.maskSeedMutationDifferenceFraction))),
        ciphertextSeedMutationDifferenceFraction: round(mean(profileRows.map(row => row.ciphertextSeedMutationDifferenceFraction))),
        neighboringSeedPermutationOverlapFraction: round(mean(profileRows.map(row => row.neighboringSeedPermutationOverlapFraction))),
        directSameSeedPermutationOverlapFraction: round(mean(profileRows.map(row => row.directSameSeedPermutationOverlapFraction))),
        directSameSeedCiphertextDifferenceFraction: round(mean(profileRows.map(row => row.directSameSeedCiphertextDifferenceFraction))),
        meanGenerationMilliseconds: round(mean(profileRows.map(row => row.meanGenerationMilliseconds)), 4),
        ...Object.fromEntries(metricNames.map(name => [name, round(mean(profileRows.map(row => row.metrics[name])))]))
      })];
    }));

    return Object.freeze({
      format: 'hb-ttrpg-binary-cube-key-generation-profile-research-receipt',
      schemaVersion: RESEARCH_SCHEMA_VERSION,
      pass: true,
      canonicalEngineSchemaVersion: Engine.constants.SCHEMA_VERSION,
      profiles: Object.freeze([...profiles]),
      gridSizes: Object.freeze([...gridSizes]),
      seedsPerGrid,
      totalKeysValidated: profiles.length * gridSizes.length * seedsPerGrid,
      comparisonBoundary: 'Research-only candidate permutation generators. The canonical engine remains unchanged. The direct generator mask is held constant across profiles for a given seed. Mutation tests separately report permutation, mask, ciphertext, and structural predictability.',
      interpretationBoundary: 'Adjacency is a diagnostic rather than an automatic rejection rule. Axis leakage, regional predictability, fixed-position concentration, displacement, surface structure, cross-seed overlap, and direct cryptanalytic evidence are evaluated independently.',
      aggregate: Object.freeze(aggregate),
      rows: Object.freeze(rows)
    });
  }

  return Object.freeze({
    constants: Object.freeze({
      RESEARCH_SCHEMA_VERSION,
      PROFILE_DEFINITIONS,
      PROFILES,
      DEFAULT_BASE_OPTIONS
    }),
    fnv1a32,
    mulberry32,
    generateResearchKey,
    pointDepth: (key, x, y) => pointDepthForKey(Engine.validateKey(key), Number(x), Number(y)),
    permutationMetrics,
    regionalPredictabilityFraction,
    keyMetrics,
    evaluateMetrics,
    buildProfileSnapshot,
    buildComparisonSnapshot,
    runResearchMatrix
  });
});
