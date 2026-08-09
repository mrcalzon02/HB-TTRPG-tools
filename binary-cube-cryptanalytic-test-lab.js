(function installBinaryCubeCryptanalyticTestLab(root, factory) {
  'use strict';
  const api = factory(root || globalThis);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.BinaryCubeCryptanalyticTestLab = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function createBinaryCubeCryptanalyticTestLab(root) {
  'use strict';

  const PANEL_ID = 'binary-cube-cryptanalytic-test-lab';
  const STYLE_ID = 'binary-cube-cryptanalytic-test-lab-style';
  const MAX_TEST_BITS = 32768;
  const MAX_PROBES = 256;
  const DEFAULT_PROBES = 64;
  let panel = null;
  let activeRunToken = 0;

  const esc = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
  const clamp = (value, minimum, maximum) => Math.max(minimum, Math.min(maximum, value));
  function fail(message) { throw new Error(message); }
  function engine() { return root?.ShadowrunBinaryCubeEngine || null; }
  function runner() { return root?.ScientificToolsCooperativeRunner || null; }

  function ensureStyle() {
    if (!root?.document || root.document.getElementById(STYLE_ID)) return;
    const link = root.document.createElement('link');
    link.id = STYLE_ID;
    link.rel = 'stylesheet';
    link.href = 'binary-cube-cryptanalytic-test-lab.css?v=20260809-cryptanalytic-tests-2';
    root.document.head.appendChild(link);
  }

  function normalizeBits(value, label = 'Binary input') {
    const bits = String(value ?? '').replace(/\s+/g, '');
    if (!bits) fail(`${label} is empty.`);
    if (/[^01]/.test(bits)) fail(`${label} may contain only 0 and 1.`);
    if (bits.length > MAX_TEST_BITS) fail(`${label} exceeds the ${MAX_TEST_BITS.toLocaleString()}-bit controlled-test limit.`);
    return bits;
  }

  function bytesToBits(bytesValue) {
    let bits = '';
    for (const byte of Uint8Array.from(bytesValue || [])) bits += byte.toString(2).padStart(8, '0');
    if (bits.length > MAX_TEST_BITS) fail(`Plaintext exceeds the ${MAX_TEST_BITS.toLocaleString()}-bit controlled-test limit.`);
    return bits;
  }

  function textToBits(value) {
    const text = String(value ?? '');
    if (!text) fail('Plaintext is empty.');
    const bytes = typeof TextEncoder !== 'undefined'
      ? new TextEncoder().encode(text)
      : Uint8Array.from(unescape(encodeURIComponent(text)), character => character.charCodeAt(0));
    return bytesToBits(bytes);
  }

  function hexToBits(value) {
    const compact = String(value ?? '').replace(/0x/gi, '').replace(/[\s:_-]+/g, '');
    if (!compact || compact.length % 2 || /[^0-9a-f]/i.test(compact)) fail('Hex plaintext must contain complete hexadecimal bytes.');
    const bytes = new Uint8Array(compact.length / 2);
    for (let index = 0; index < bytes.length; index += 1) bytes[index] = parseInt(compact.slice(index * 2, index * 2 + 2), 16);
    return bytesToBits(bytes);
  }

  function parsePlaintext(value, mode = 'text') {
    if (mode === 'binary') return normalizeBits(value, 'Plaintext bits');
    if (mode === 'hex') return hexToBits(value);
    return textToBits(value);
  }

  function parseObservedCiphertext(value) {
    const raw = String(value ?? '').trim();
    if (!raw) return null;
    const Engine = engine();
    try {
      const object = JSON.parse(raw);
      if (object?.format === Engine?.constants?.PACKAGE_FORMAT && typeof object.ciphertext === 'string') {
        return Object.freeze({ bits: normalizeBits(object.ciphertext, 'Observed package ciphertext'), kind: 'canonical-package' });
      }
    } catch (_) { /* continue */ }
    const compact = raw.replace(/\s+/g, '');
    if (/^[01]+$/.test(compact)) return Object.freeze({ bits: normalizeBits(compact, 'Observed ciphertext'), kind: 'binary' });
    const hex = raw.replace(/0x/gi, '').replace(/[\s:_-]+/g, '');
    if (hex.length >= 2 && hex.length % 2 === 0 && /^[0-9a-f]+$/i.test(hex)) return Object.freeze({ bits: hexToBits(raw), kind: 'hex' });
    fail('Observed ciphertext must be canonical Binary Cube package JSON, binary bits, or hex bytes.');
  }

  function xorBits(leftValue, rightValue) {
    const left = String(leftValue || '');
    const right = String(rightValue || '');
    if (left.length !== right.length) fail('Bitstrings must have equal length for XOR analysis.');
    let output = '';
    for (let index = 0; index < left.length; index += 1) output += left[index] === right[index] ? '0' : '1';
    return output;
  }

  function hamming(leftValue, rightValue, captureLimit = 256) {
    const left = String(leftValue || '');
    const right = String(rightValue || '');
    const length = Math.min(left.length, right.length);
    let differing = 0;
    const positions = [];
    for (let index = 0; index < length; index += 1) {
      if (left[index] !== right[index]) {
        differing += 1;
        if (positions.length < captureLimit) positions.push(index);
      }
    }
    differing += Math.abs(left.length - right.length);
    const denominator = Math.max(left.length, right.length);
    return Object.freeze({ differing, fraction: denominator ? differing / denominator : 0, compared: length, leftLength: left.length, rightLength: right.length, positions: Object.freeze(positions) });
  }

  function flipBit(bits, indexValue) {
    const index = Number(indexValue);
    if (!Number.isInteger(index) || index < 0 || index >= bits.length) fail('Flip index is outside the plaintext.');
    return `${bits.slice(0, index)}${bits[index] === '1' ? '0' : '1'}${bits.slice(index + 1)}`;
  }

  function oneHotBits(length, index) {
    if (!Number.isInteger(index) || index < 0 || index >= length) fail('One-hot index is outside the vector.');
    return `${'0'.repeat(index)}1${'0'.repeat(length - index - 1)}`;
  }

  function sampleIndexes(lengthValue, maximumValue) {
    const length = Math.max(0, Math.floor(Number(lengthValue) || 0));
    const maximum = clamp(Math.floor(Number(maximumValue) || DEFAULT_PROBES), 1, MAX_PROBES);
    if (length <= maximum) return Array.from({ length }, (_, index) => index);
    const indexes = [];
    for (let index = 0; index < maximum; index += 1) indexes.push(Math.floor(index * (length - 1) / Math.max(1, maximum - 1)));
    return Array.from(new Set(indexes));
  }

  function validatedKey(rawKey) {
    const Engine = engine();
    if (!Engine?.validateKey || !Engine?.encryptBinary || !Engine?.projectionOrder) fail('The canonical Binary Cube engine is not loaded.');
    let value = rawKey;
    if (typeof rawKey === 'string') {
      try { value = JSON.parse(rawKey); } catch (error) { fail(`Key JSON is invalid: ${error.message}`); }
    }
    return Engine.validateKey(value);
  }

  function encryptBits(bits, key) {
    return engine().encryptBinary(bits, key).ciphertext;
  }

  function projectionPermutation(key) {
    const Engine = engine();
    const inputOrder = Array.from(Engine.projectionOrder(key, key.inputFace, key.inputQuarterTurns));
    const outputOrder = Array.from(Engine.projectionOrder(key, key.outputFace, key.outputQuarterTurns));
    const outputIndexByPoint = new Int32Array(outputOrder.length);
    outputOrder.forEach((pointId, outputIndex) => { outputIndexByPoint[pointId] = outputIndex; });
    return Object.freeze(inputOrder.map(pointId => outputIndexByPoint[pointId]));
  }

  function analyzeCycles(mappingValue) {
    const mapping = Array.from(mappingValue || []);
    const visited = new Uint8Array(mapping.length);
    const lengths = [];
    for (let start = 0; start < mapping.length; start += 1) {
      if (visited[start]) continue;
      let cursor = start;
      let length = 0;
      while (!visited[cursor]) {
        visited[cursor] = 1;
        length += 1;
        cursor = mapping[cursor];
      }
      lengths.push(length);
    }
    lengths.sort((left, right) => right - left);
    return Object.freeze({ cycleCount: lengths.length, fixedPoints: lengths.filter(length => length === 1).length, longestCycle: lengths[0] || 0, meanCycle: lengths.length ? mapping.length / lengths.length : 0, lengths: Object.freeze(lengths.slice(0, 24)) });
  }

  async function avalancheAndTraversalProbe(plaintextBits, key, maximumProbes = DEFAULT_PROBES) {
    const baseCiphertext = encryptBits(plaintextBits, key);
    const indexes = sampleIndexes(plaintextBits.length, maximumProbes);
    const payloadIndexes = key.mask.map(Boolean).map((enabled, index) => enabled ? index : -1).filter(index => index >= 0);
    const cellCount = key.gridSize * key.gridSize;
    const payloadCapacity = payloadIndexes.length;
    const permutation = projectionPermutation(key);
    const rows = [];
    let totalChanged = 0;
    let oneHot = 0;
    let expectedMatches = 0;
    let crossBlockChanges = 0;
    let totalChanges = 0;
    const inferredOutputs = new Set();
    for (let probeIndex = 0; probeIndex < indexes.length; probeIndex += 1) {
      const sourceBit = indexes[probeIndex];
      const mutated = flipBit(plaintextBits, sourceBit);
      const ciphertext = encryptBits(mutated, key);
      const distance = hamming(baseCiphertext, ciphertext);
      const blockIndex = Math.floor(sourceBit / payloadCapacity);
      const payloadOffset = sourceBit % payloadCapacity;
      const inputCell = payloadIndexes[payloadOffset];
      const expectedOutput = blockIndex * cellCount + permutation[inputCell];
      const inferredOutput = distance.differing === 1 ? distance.positions[0] : null;
      let outsideBlock = 0;
      for (const outputPosition of distance.positions) if (Math.floor(outputPosition / cellCount) !== blockIndex) outsideBlock += 1;
      totalChanged += distance.differing;
      totalChanges += distance.differing;
      crossBlockChanges += outsideBlock;
      if (distance.differing === 1) {
        oneHot += 1;
        inferredOutputs.add(inferredOutput);
        if (inferredOutput === expectedOutput) expectedMatches += 1;
      }
      rows.push(Object.freeze({ sourceBit, sourceBlock: blockIndex, changedBits: distance.differing, changedFraction: distance.fraction, crossBlockChangedBits: outsideBlock, inferredOutput, expectedOutput, expectedMatch: inferredOutput === expectedOutput }));
      if (probeIndex % 8 === 7 && runner()?.yieldControl) await runner().yieldControl();
    }
    const meanChanged = indexes.length ? totalChanged / indexes.length : 0;
    return Object.freeze({
      baseCiphertext,
      probeCount: indexes.length,
      meanChangedBits: meanChanged,
      meanChangedFraction: baseCiphertext.length ? meanChanged / baseCiphertext.length : 0,
      oneHotFraction: indexes.length ? oneHot / indexes.length : 0,
      uniqueInferredOutputs: inferredOutputs.size,
      expectedMappingMatchFraction: oneHot ? expectedMatches / oneHot : 0,
      crossBlockDiffusionFraction: totalChanges ? crossBlockChanges / totalChanges : 0,
      rows: Object.freeze(rows)
    });
  }

  function affineEquivalenceProbe(plaintextBits, key) {
    const zero = '0'.repeat(plaintextBits.length);
    const q = Array.from({ length: plaintextBits.length }, (_, index) => ((index * 17 + 5) % 29) < 13 ? '1' : '0').join('');
    const pxq = xorBits(plaintextBits, q);
    const eP = encryptBits(plaintextBits, key);
    const eQ = encryptBits(q, key);
    const eZero = encryptBits(zero, key);
    const ePXQ = encryptBits(pxq, key);
    const reconstructed = xorBits(xorBits(eP, eQ), eZero);
    const distance = hamming(reconstructed, ePXQ);
    return Object.freeze({ exact: distance.differing === 0, distance, testedBits: plaintextBits.length, ciphertextBits: eP.length });
  }

  async function basisRecoveryProbe(plaintextBits, key, maximumBasis = MAX_PROBES) {
    const length = plaintextBits.length;
    const indexes = sampleIndexes(length, maximumBasis);
    const zero = '0'.repeat(length);
    const eZero = encryptBits(zero, key);
    const basis = [];
    const activeOutputPositions = new Set();
    let oneHotColumns = 0;
    for (let basisIndex = 0; basisIndex < indexes.length; basisIndex += 1) {
      const sourceBit = indexes[basisIndex];
      const delta = xorBits(encryptBits(oneHotBits(length, sourceBit), key), eZero);
      const positions = [];
      for (let outputIndex = 0; outputIndex < delta.length; outputIndex += 1) {
        if (delta[outputIndex] === '1') {
          positions.push(outputIndex);
          activeOutputPositions.add(outputIndex);
        }
      }
      if (positions.length === 1) oneHotColumns += 1;
      basis.push(Object.freeze({ sourceBit, delta, weight: positions.length, positions: Object.freeze(positions.slice(0, 32)) }));
      if (basisIndex % 8 === 7 && runner()?.yieldControl) await runner().yieldControl();
    }

    const complete = indexes.length === length;
    let reconstructed = eZero;
    if (complete) {
      for (const column of basis) if (plaintextBits[column.sourceBit] === '1') reconstructed = xorBits(reconstructed, column.delta);
    }
    const actual = encryptBits(plaintextBits, key);
    const reconstructionDistance = complete ? hamming(reconstructed, actual) : null;
    const staticOutputPositions = Math.max(0, eZero.length - activeOutputPositions.size);
    return Object.freeze({
      complete,
      coveredInputBits: indexes.length,
      inputBits: length,
      ciphertextBits: eZero.length,
      oneHotColumnFraction: basis.length ? oneHotColumns / basis.length : 0,
      uniqueInfluencedOutputs: activeOutputPositions.size,
      staticOutputPositions,
      staticOutputFraction: eZero.length ? staticOutputPositions / eZero.length : 0,
      reconstructionExact: complete ? reconstructionDistance.differing === 0 : null,
      reconstructionDistance,
      basis: Object.freeze(basis)
    });
  }

  function deterministicRepeatProbe(plaintextBits, key) {
    const first = encryptBits(plaintextBits, key);
    const second = encryptBits(plaintextBits, key);
    const distance = hamming(first, second);
    return Object.freeze({ exactRepeat: distance.differing === 0, distance, ciphertextBits: first.length });
  }

  function repeatedBlockProbe(key) {
    const payloadCapacity = key.mask.filter(Boolean).length;
    const cellCount = key.gridSize * key.gridSize;
    const block = Array.from({ length: payloadCapacity }, (_, index) => ((index * 11 + 3) % 17) < 8 ? '1' : '0').join('');
    const ciphertext = encryptBits(block + block, key);
    const first = ciphertext.slice(0, cellCount);
    const second = ciphertext.slice(cellCount, cellCount * 2);
    const distance = hamming(first, second);
    return Object.freeze({ payloadCapacity, ciphertextBlockBits: cellCount, identicalCiphertextBlocks: distance.differing === 0, distance });
  }

  function lengthOracleProbe(key) {
    const payloadCapacity = key.mask.filter(Boolean).length;
    const lengths = Array.from(new Set([1, Math.max(1, payloadCapacity - 1), payloadCapacity, payloadCapacity + 1, payloadCapacity * 2, payloadCapacity * 2 + 1]));
    const rows = lengths.map(length => {
      const bits = '0'.repeat(length);
      const packageObject = engine().encryptBinary(bits, key);
      return Object.freeze({ plaintextBits: length, ciphertextBits: packageObject.ciphertext.length, blockCount: packageObject.blockCount });
    });
    return Object.freeze({ payloadCapacity, rows: Object.freeze(rows) });
  }

  function deriveComparisonKey(key) {
    const Engine = engine();
    const density = key.mask.filter(Boolean).length / key.mask.length;
    return Engine.createKey({
      gridSize: key.gridSize,
      seed: `${key.seed}|cryptanalytic-key-difference`,
      inputFace: key.inputFace,
      outputFace: key.outputFace,
      inputQuarterTurns: key.inputQuarterTurns,
      outputQuarterTurns: key.outputQuarterTurns,
      maskDensity: density
    });
  }

  function keyDifferenceProbe(plaintextBits, key) {
    const comparisonKey = deriveComparisonKey(key);
    const primaryCiphertext = encryptBits(plaintextBits, key);
    const comparisonCiphertext = encryptBits(plaintextBits, comparisonKey);
    return Object.freeze({ comparisonKeyId: comparisonKey.keyId, comparisonSeed: comparisonKey.seed, distance: hamming(primaryCiphertext, comparisonCiphertext) });
  }

  function deriveLatinShiftEquivalentKey(key, shiftValue = 1) {
    const Engine = engine();
    const size = key.gridSize;
    const shift = ((Number(shiftValue) || 0) % size + size) % size;
    const candidate = {
      ...key,
      keyId: undefined,
      rowPermutation: key.rowPermutation.map(value => (value + shift) % size),
      columnPermutation: key.columnPermutation.map(value => (value - shift + size) % size)
    };
    return Engine.validateKey(candidate);
  }

  function equivalentKeyProbe(plaintextBits, key) {
    if (key.gridSize < 2) return Object.freeze({ available: false });
    const equivalentKey = deriveLatinShiftEquivalentKey(key, 1);
    const primaryMapping = projectionPermutation(key);
    const equivalentMapping = projectionPermutation(equivalentKey);
    const mappingDistance = hamming(primaryMapping.map(value => value.toString(2).padStart(32, '0')).join(''), equivalentMapping.map(value => value.toString(2).padStart(32, '0')).join(''));
    const primaryCiphertext = encryptBits(plaintextBits, key);
    const equivalentCiphertext = encryptBits(plaintextBits, equivalentKey);
    const ciphertextDistance = hamming(primaryCiphertext, equivalentCiphertext);
    const fullMask = key.mask.every(Boolean);
    return Object.freeze({
      available: true,
      originalKeyId: key.keyId,
      equivalentKeyId: equivalentKey.keyId,
      distinctKeyId: equivalentKey.keyId !== key.keyId,
      projectionEquivalent: mappingDistance.differing === 0,
      mappingDistance,
      ciphertextEquivalent: ciphertextDistance.differing === 0,
      ciphertextDistance,
      fullMask,
      nominalEquivalentGeometryCount: key.gridSize
    });
  }

  function knownPlaintextProbe(plaintextBits, key, observedValue) {
    const generated = encryptBits(plaintextBits, key);
    if (!observedValue) return Object.freeze({ available: false, generatedCiphertextBits: generated.length });
    const observed = parseObservedCiphertext(observedValue);
    const distance = hamming(generated, observed.bits);
    return Object.freeze({ available: true, observedKind: observed.kind, exact: distance.differing === 0, distance, generatedCiphertextBits: generated.length });
  }

  async function runControlledSuite(options = {}) {
    const key = validatedKey(options.key);
    const plaintextBits = parsePlaintext(options.plaintext, options.plaintextMode || 'text');
    const maximumProbes = options.maximumProbes;
    const avalanche = await avalancheAndTraversalProbe(plaintextBits, key, maximumProbes);
    const affine = affineEquivalenceProbe(plaintextBits, key);
    const basisRecovery = await basisRecoveryProbe(plaintextBits, key, maximumProbes);
    const deterministicRepeat = deterministicRepeatProbe(plaintextBits, key);
    const repeatedBlock = repeatedBlockProbe(key);
    const lengthOracle = lengthOracleProbe(key);
    const keyDifference = keyDifferenceProbe(plaintextBits, key);
    const equivalentKey = equivalentKeyProbe(plaintextBits, key);
    const mapping = projectionPermutation(key);
    const cycles = analyzeCycles(mapping);
    const knownPlaintext = knownPlaintextProbe(plaintextBits, key, options.observedCiphertext);
    return Object.freeze({
      keyId: key.keyId,
      gridSize: key.gridSize,
      plaintextBits: plaintextBits.length,
      ciphertextBits: avalanche.baseCiphertext.length,
      payloadCapacity: key.mask.filter(Boolean).length,
      avalanche,
      affine,
      basisRecovery,
      deterministicRepeat,
      repeatedBlock,
      lengthOracle,
      keyDifference,
      equivalentKey,
      permutation: Object.freeze({ mappingSize: mapping.length, cycles }),
      knownPlaintext
    });
  }

  function formatPercent(value) { return `${(Number(value || 0) * 100).toFixed(3)}%`; }
  function formatNumber(value, digits = 3) { return Number(value || 0).toFixed(digits); }

  function renderResults(result) {
    const target = panel?.querySelector('[data-bcatl-results]');
    if (!target) return;
    const avalancheRows = result.avalanche.rows.slice(0, 24).map(row => `<tr><td>${row.sourceBit}</td><td>${row.sourceBlock}</td><td>${row.changedBits}</td><td>${row.crossBlockChangedBits}</td><td>${row.inferredOutput ?? '—'}</td><td>${row.expectedOutput}</td><td>${row.expectedMatch ? 'yes' : 'no'}</td></tr>`).join('');
    const known = result.knownPlaintext.available
      ? `<div><span>Known-plaintext match</span><strong>${result.knownPlaintext.exact ? 'Exact' : formatPercent(1 - result.knownPlaintext.distance.fraction)}</strong></div>`
      : '<div><span>Known-plaintext match</span><strong>No observed sample</strong></div>';
    const collapse = result.affine.exact && result.avalanche.oneHotFraction === 1
      ? 'This tested configuration behaved as an affine one-bit-to-one-bit mapping with a fixed offset. That is strong evidence that, at this fixed length and key, the transformation can be modeled as a permutation/injection plus deterministic filler rather than a diffusive cipher.'
      : result.affine.exact
        ? 'The affine identity held exactly for the tested vectors. The transformation may admit a substantially simpler algebraic model for this fixed key and message length.'
        : 'The affine identity did not hold exactly for the tested vectors; a simple affine collapse was not demonstrated by this probe.';
    const basisFinding = result.basisRecovery.complete
      ? `A complete ${result.basisRecovery.coveredInputBits}-vector chosen-plaintext basis was acquired. Reconstruction of the supplied plaintext ciphertext was ${result.basisRecovery.reconstructionExact ? 'exact' : 'not exact'}. ${result.basisRecovery.staticOutputPositions} output positions were invariant across the complete basis.`
      : `${result.basisRecovery.coveredInputBits} of ${result.basisRecovery.inputBits} input basis vectors were sampled. ${formatPercent(result.basisRecovery.oneHotColumnFraction)} of sampled basis columns changed exactly one output bit.`;
    const equivalentFinding = result.equivalentKey.projectionEquivalent
      ? `A Latin-shifted key with a different fingerprint produced the same projection mapping. This demonstrates at least a ${result.equivalentKey.nominalEquivalentGeometryCount}-member geometric equivalence class for this grid construction. ${result.equivalentKey.fullMask ? `With a full mask, ciphertext equivalence was ${result.equivalentKey.ciphertextEquivalent ? 'exact' : 'not exact'}.` : 'With inactive mask cells, deterministic filler can distinguish ciphertext baselines even when payload geometry is equivalent.'}`
      : 'The tested Latin row/column counter-shift did not preserve the projection mapping.';

    target.innerHTML = `
      <div class="bcatl-metric-grid">
        <div><span>Plaintext bits</span><strong>${result.plaintextBits.toLocaleString()}</strong></div>
        <div><span>Ciphertext bits</span><strong>${result.ciphertextBits.toLocaleString()}</strong></div>
        <div><span>Mean avalanche</span><strong>${formatPercent(result.avalanche.meanChangedFraction)}</strong></div>
        <div><span>Mean changed bits</span><strong>${formatNumber(result.avalanche.meanChangedBits)}</strong></div>
        <div><span>One-hot influence probes</span><strong>${formatPercent(result.avalanche.oneHotFraction)}</strong></div>
        <div><span>Cross-block diffusion</span><strong>${formatPercent(result.avalanche.crossBlockDiffusionFraction)}</strong></div>
        <div><span>Traversal-map agreement</span><strong>${formatPercent(result.avalanche.expectedMappingMatchFraction)}</strong></div>
        <div><span>Affine identity</span><strong>${result.affine.exact ? 'Exact' : `${result.affine.distance.differing} differing bits`}</strong></div>
        <div><span>Basis recovery</span><strong>${result.basisRecovery.complete ? (result.basisRecovery.reconstructionExact ? 'Exact' : 'Incomplete model') : `${result.basisRecovery.coveredInputBits}/${result.basisRecovery.inputBits}`}</strong></div>
        <div><span>Static output surface</span><strong>${formatPercent(result.basisRecovery.staticOutputFraction)}</strong></div>
        <div><span>Deterministic repeat</span><strong>${result.deterministicRepeat.exactRepeat ? 'Identical' : 'Varies'}</strong></div>
        <div><span>Repeated full block</span><strong>${result.repeatedBlock.identicalCiphertextBlocks ? 'Identical ciphertext' : formatPercent(result.repeatedBlock.distance.fraction)}</strong></div>
        <div><span>Equivalent geometry key</span><strong>${result.equivalentKey.projectionEquivalent ? 'Found' : 'Not found'}</strong></div>
        <div><span>Key-difference Hamming</span><strong>${formatPercent(result.keyDifference.distance.fraction)}</strong></div>
        ${known}
        <div><span>Projection cycles</span><strong>${result.permutation.cycles.cycleCount}</strong></div>
        <div><span>Longest cycle</span><strong>${result.permutation.cycles.longestCycle}</strong></div>
        <div><span>Fixed points</span><strong>${result.permutation.cycles.fixedPoints}</strong></div>
      </div>
      <section class="bcatl-finding"><h3>Equivalent-function / affine collapse</h3><p>${esc(collapse)}</p></section>
      <section class="bcatl-finding"><h3>Chosen-plaintext basis / codebook recovery</h3><p>${esc(basisFinding)}</p></section>
      <section class="bcatl-finding"><h3>Equivalent-key geometry</h3><p>${esc(equivalentFinding)}</p><p>Original key ${esc(result.equivalentKey.originalKeyId || '—')} · shifted key ${esc(result.equivalentKey.equivalentKeyId || '—')}.</p></section>
      <section class="bcatl-finding"><h3>Block locality and deterministic leakage</h3><p>Cross-block differential influence: ${formatPercent(result.avalanche.crossBlockDiffusionFraction)}. Re-encrypting identical plaintext under the same key produced ${result.deterministicRepeat.exactRepeat ? 'identical ciphertext' : 'different ciphertext'}. Two identical payload-capacity blocks produced ${result.repeatedBlock.identicalCiphertextBlocks ? 'identical ciphertext blocks' : `a ${formatPercent(result.repeatedBlock.distance.fraction)} block distance`}.</p></section>
      <section class="bcatl-finding"><h3>Ciphertext length oracle</h3><div class="bcatl-table-scroll"><table><thead><tr><th>Plaintext bits</th><th>Ciphertext bits</th><th>Blocks</th></tr></thead><tbody>${result.lengthOracle.rows.map(row => `<tr><td>${row.plaintextBits}</td><td>${row.ciphertextBits}</td><td>${row.blockCount}</td></tr>`).join('')}</tbody></table></div></section>
      <section class="bcatl-finding"><h3>Chosen-plaintext traversal inference</h3><p>${result.avalanche.probeCount} single-bit perturbations were encrypted under the same key. ${result.avalanche.uniqueInferredOutputs} unique one-bit output positions were inferred.</p><div class="bcatl-table-scroll"><table><thead><tr><th>Input bit</th><th>Source block</th><th>Changed bits</th><th>Cross-block</th><th>Inferred position</th><th>Expected position</th><th>Match</th></tr></thead><tbody>${avalancheRows}</tbody></table></div></section>
      <section class="bcatl-finding"><h3>Permutation / cycle structure</h3><p>Geometric cell mapping contains ${result.permutation.cycles.cycleCount} cycles; longest ${result.permutation.cycles.longestCycle}; mean ${formatNumber(result.permutation.cycles.meanCycle)} cells. Largest cycle lengths: ${esc(result.permutation.cycles.lengths.join(', ') || 'none')}.</p></section>
      <section class="bcatl-boundary"><strong>Interpretation boundary:</strong> these are controlled measurements of the current Binary Cube implementation, not a proof of general cryptographic security or insecurity. Equivalent-key geometry, basis reconstruction, determinism, avalanche, affine consistency, one-hot influence, key sensitivity, and cycle structure should be evaluated across many keys, grid sizes, masks, plaintext lengths, and adversarial samples.</section>`;
  }

  function setStatus(message, kind = '') {
    const node = panel?.querySelector('[data-bcatl-status]');
    if (!node) return;
    node.textContent = message;
    node.dataset.kind = kind;
  }

  async function executeSuite() {
    const runToken = ++activeRunToken;
    const button = panel.querySelector('[data-bcatl-run]');
    button.disabled = true;
    setStatus('Running controlled cryptanalysis…');
    try {
      const result = await runControlledSuite({
        key: panel.querySelector('#bcatl-key').value,
        plaintext: panel.querySelector('#bcatl-plaintext').value,
        plaintextMode: panel.querySelector('#bcatl-plaintext-mode').value,
        observedCiphertext: panel.querySelector('#bcatl-observed').value,
        maximumProbes: panel.querySelector('#bcatl-probes').value
      });
      if (runToken !== activeRunToken) return null;
      renderResults(result);
      setStatus('Controlled cryptanalysis complete.', 'success');
      return result;
    } catch (error) {
      if (runToken === activeRunToken) setStatus(error.message, 'error');
      throw error;
    } finally {
      if (runToken === activeRunToken) button.disabled = false;
    }
  }

  function buildPanel() {
    if (!root?.document) fail('The Cryptanalytic Test Lab requires a browser document.');
    const existing = root.document.getElementById(PANEL_ID);
    if (existing) { panel = existing; return panel; }
    ensureStyle();
    panel = root.document.createElement('section');
    panel.id = PANEL_ID;
    panel.className = 'bcatl-shell';
    panel.hidden = true;
    panel.innerHTML = `
      <div class="bcatl-backdrop" data-bcatl-close></div>
      <div class="bcatl-panel" role="dialog" aria-modal="true" aria-labelledby="bcatl-title">
        <header class="bcatl-header"><div><p class="bcatl-eyebrow">Scientific Tools · Binary Cube Adversarial Testing</p><h2 id="bcatl-title">Cryptanalytic Test Lab</h2><p>Controlled tests for diffusion, differential behavior, known/chosen plaintext relationships, basis recovery, deterministic leakage, equivalent keys, traversal inference, permutation cycles, and algebraic collapse. Encryption is always delegated to the canonical Binary Cube engine.</p></div><button type="button" class="bcatl-close" data-bcatl-close aria-label="Close Cryptanalytic Test Lab">×</button></header>
        <div class="bcatl-body">
          <aside class="bcatl-controls">
            <section class="bcatl-card"><h3>Controlled input</h3><label>Canonical key JSON<textarea id="bcatl-key" rows="10" spellcheck="false" placeholder="Paste a Binary Cube key JSON"></textarea></label><label>Plaintext format<select id="bcatl-plaintext-mode"><option value="text" selected>Text</option><option value="binary">Binary bits</option><option value="hex">Hex bytes</option></select></label><label>Plaintext<textarea id="bcatl-plaintext" rows="7" spellcheck="false" placeholder="Known or chosen plaintext"></textarea></label><label>Single-bit / basis probes<input id="bcatl-probes" type="number" min="1" max="${MAX_PROBES}" value="${DEFAULT_PROBES}"></label><label>Optional observed ciphertext<textarea id="bcatl-observed" rows="6" spellcheck="false" placeholder="Canonical package JSON, binary ciphertext, or hex for known-plaintext comparison"></textarea></label><button type="button" class="bcatl-primary" data-bcatl-run>Run controlled tests</button><div class="bcatl-status" data-bcatl-status role="status" aria-live="polite">Ready.</div></section>
            <section class="bcatl-card"><h3>Method coverage</h3><div class="bcatl-methods"><span><strong>Here:</strong> avalanche, differential bit flips, cross-block diffusion, known plaintext, chosen plaintext, basis/codebook recovery, deterministic repeats, repeated-block leakage, length oracle, key-difference sensitivity, equivalent-key geometry, traversal inference, affine-equivalence/collapse, projection permutation and cycle analysis.</span><span><strong>Decryption Dashboard:</strong> structural transforms, Hamming/XOR comparison, autocorrelation, entropy, repeated-key relationships.</span><span><strong>Information Suite:</strong> mutual information, n-grams, higher-order entropy, compression and de-obfuscation.</span><span><strong>Media Forensics:</strong> convolution matrices, spatial/cross-correlation, FFT/spectral probes, steganographic bit planes and signal extraction.</span></div></section>
          </aside>
          <main class="bcatl-results" data-bcatl-results><section class="bcatl-card"><h3>Why these tests matter</h3><p>They test whether geometric complexity produces genuine diffusion and nonlinear dependence, or whether the full cube can be reduced to a simpler equivalent mapping. Basis recovery and equivalent-key tests go further: they ask whether chosen plaintext can reconstruct the transform and whether nominally distinct keys actually describe the same geometry.</p></section></main>
        </div>
      </div>`;
    root.document.body.appendChild(panel);
    panel.querySelectorAll('[data-bcatl-close]').forEach(node => node.addEventListener('click', closePanel));
    panel.querySelector('[data-bcatl-run]').addEventListener('click', () => void executeSuite().catch(error => console.error(error)));
    return panel;
  }

  function openPanel(options = {}) {
    const target = buildPanel();
    target.hidden = false;
    root.document.body.classList.add('bcatl-open');
    if (options.key) target.querySelector('#bcatl-key').value = typeof options.key === 'string' ? options.key : JSON.stringify(options.key, null, 2);
    if (options.plaintext !== undefined) target.querySelector('#bcatl-plaintext').value = String(options.plaintext);
    if (options.plaintextMode) target.querySelector('#bcatl-plaintext-mode').value = String(options.plaintextMode);
    if (options.observedCiphertext) target.querySelector('#bcatl-observed').value = typeof options.observedCiphertext === 'string' ? options.observedCiphertext : JSON.stringify(options.observedCiphertext, null, 2);
    return target;
  }

  function closePanel() {
    if (!panel) return;
    activeRunToken += 1;
    panel.hidden = true;
    root?.document?.body?.classList.remove('bcatl-open');
  }

  function currentState() {
    return Object.freeze({ panelOpen: Boolean(panel && !panel.hidden), activeRunToken });
  }

  return Object.freeze({
    openPanel,
    closePanel,
    currentState,
    runControlledSuite,
    utilities: Object.freeze({
      parsePlaintext,
      parseObservedCiphertext,
      xorBits,
      hamming,
      flipBit,
      oneHotBits,
      sampleIndexes,
      projectionPermutation,
      analyzeCycles,
      avalancheAndTraversalProbe,
      affineEquivalenceProbe,
      basisRecoveryProbe,
      deterministicRepeatProbe,
      repeatedBlockProbe,
      lengthOracleProbe,
      keyDifferenceProbe,
      deriveLatinShiftEquivalentKey,
      equivalentKeyProbe,
      knownPlaintextProbe
    }),
    constants: Object.freeze({ PANEL_ID, MAX_TEST_BITS, MAX_PROBES, DEFAULT_PROBES })
  });
});
