(function installBinaryCubeEngine(root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.ShadowrunBinaryCubeEngine = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function createBinaryCubeEngine() {
  'use strict';

  const KEY_FORMAT = 'hb-ttrpg-shadowrun-binary-cube-key';
  const PACKAGE_FORMAT = 'hb-ttrpg-shadowrun-binary-cube-package';
  const SCHEMA_VERSION = '0.2.0';
  const ALGORITHM = 'latin-cube-face-permutation';
  const SECURITY_CLASSIFICATION = 'experimental-ttrpg-obfuscation-not-production-cryptography';
  const CHECKSUM_TYPE = 'fnv1a32-corruption-detection-only';
  const MIN_GRID_SIZE = 3;
  const DEMONSTRATION_GRID_SIZE = 4;
  const STANDARD_TEST_GRID_SIZE = 16;
  const MAX_GRID_SIZE = 1024;
  const FACES = Object.freeze(['top', 'bottom', 'front', 'back', 'left', 'right']);
  const OPPOSITE = Object.freeze({ top: 'bottom', bottom: 'top', front: 'back', back: 'front', left: 'right', right: 'left' });
  const AXIS_PLANES = Object.freeze(['xy', 'xz', 'yz']);
  const RECOMMENDED_GRID_SIZES = Object.freeze([4, 12, 20, 28, 36, 44, 52, 60, 64, 96, 128, 192, 256, 384, 512, 768, 1024]);

  function fail(message) {
    throw new Error(message);
  }

  function normalizeBits(value, label = 'Binary input') {
    const compact = String(value ?? '').replace(/\s+/g, '');
    if (!compact) fail(`${label} must contain at least one binary digit.`);
    if (/[^01]/.test(compact)) fail(`${label} may contain only 0, 1, and whitespace.`);
    return compact;
  }

  function fnv1a32(value) {
    let hash = 0x811c9dc5;
    const text = String(value ?? '');
    for (let index = 0; index < text.length; index += 1) {
      hash ^= text.charCodeAt(index);
      hash = Math.imul(hash, 0x01000193);
    }
    return hash >>> 0;
  }

  function hex32(value) {
    return fnv1a32(value).toString(16).padStart(8, '0');
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

  function isExactPermutation(values, size) {
    if (!Array.isArray(values) || values.length !== size) return false;
    const seen = new Uint8Array(size);
    for (let index = 0; index < values.length; index += 1) {
      const value = values[index];
      if (!Number.isInteger(value) || value < 0 || value >= size || seen[value]) return false;
      seen[value] = 1;
    }
    return true;
  }

  function normalizeQuarterTurns(value) {
    return ((Number(value) || 0) % 4 + 4) % 4;
  }

  function validateGridSize(value, label = 'Grid size') {
    const size = Number(value);
    if (!Number.isInteger(size) || size < MIN_GRID_SIZE || size > MAX_GRID_SIZE) {
      fail(`${label} must be an integer from ${MIN_GRID_SIZE} through ${MAX_GRID_SIZE}.`);
    }
    return size;
  }

  function validateFacePair(inputFace, outputFace) {
    if (!FACES.includes(inputFace) || !FACES.includes(outputFace)) fail('Input and output faces must be valid cube faces.');
    if (inputFace === outputFace) fail('The output face cannot be the same as the input face.');
    if (OPPOSITE[inputFace] === outputFace) fail('The opposite face preserves the original projection. Choose one of the four perpendicular faces.');
    return true;
  }

  function legalOutputFaces(inputFace) {
    if (!FACES.includes(inputFace)) fail('A valid input face is required.');
    return FACES.filter(face => face !== inputFace && face !== OPPOSITE[inputFace]);
  }

  function maskFromDensity(size, density, random) {
    const cellCount = size * size;
    const normalizedDensity = Math.max(0.01, Math.min(1, Number(density) || 1));
    const target = Math.max(1, Math.round(cellCount * normalizedDensity));
    const indexes = shuffle(range(cellCount), random);
    const mask = new Array(cellCount).fill(false);
    for (let index = 0; index < target; index += 1) mask[indexes[index]] = true;
    return mask;
  }

  function keyFingerprint(key) {
    const material = [
      KEY_FORMAT,
      SCHEMA_VERSION,
      key.algorithm,
      key.gridSize,
      key.seed,
      key.inputFace,
      key.outputFace,
      normalizeQuarterTurns(key.inputQuarterTurns),
      normalizeQuarterTurns(key.outputQuarterTurns),
      key.rowPermutation.join(','),
      key.columnPermutation.join(','),
      key.depthPermutation.join(','),
      key.mask.map(Boolean).map(value => value ? '1' : '0').join(''),
      key.paddingMode
    ].join('|');
    return hex32(material);
  }

  function validateKeyStructure(rawKey) {
    let key;
    try {
      key = typeof rawKey === 'string' ? JSON.parse(rawKey) : rawKey;
    } catch (error) {
      fail(`Key JSON is invalid: ${error.message}`);
    }
    if (!key || typeof key !== 'object' || Array.isArray(key)) fail('A key object is required.');
    if (key.format !== KEY_FORMAT) fail('The imported key format is not recognized.');
    if (key.schemaVersion !== SCHEMA_VERSION) fail(`Unsupported key schema version: ${key.schemaVersion || 'missing'}. Expected ${SCHEMA_VERSION}.`);
    if (key.algorithm !== ALGORITHM) fail('The key algorithm is not supported by this engine.');
    const size = validateGridSize(key.gridSize, 'The key grid size');
    validateFacePair(key.inputFace, key.outputFace);
    if (!isExactPermutation(key.rowPermutation, size)) fail('The key row permutation is invalid.');
    if (!isExactPermutation(key.columnPermutation, size)) fail('The key column permutation is invalid.');
    if (!isExactPermutation(key.depthPermutation, size)) fail('The key depth permutation is invalid.');
    if (!Array.isArray(key.mask) || key.mask.length !== size * size || !key.mask.some(Boolean)) fail('The key mask is invalid or has no payload cells.');
    if (key.paddingMode !== 'deterministic-seeded-random') fail('The key padding mode is not supported.');
    const copy = {
      ...key,
      gridSize: size,
      seed: String(key.seed ?? ''),
      inputQuarterTurns: normalizeQuarterTurns(key.inputQuarterTurns),
      outputQuarterTurns: normalizeQuarterTurns(key.outputQuarterTurns),
      mask: key.mask.map(Boolean)
    };
    const expected = keyFingerprint(copy);
    if (key.keyId && key.keyId !== expected) fail('The key fingerprint does not match its contents.');
    copy.keyId = expected;
    return copy;
  }

  function algebraicInvariantForKey(key) {
    const size = key.gridSize;
    const rowPermutationComplete = isExactPermutation(key.rowPermutation, size);
    const columnPermutationComplete = isExactPermutation(key.columnPermutation, size);
    const depthPermutationComplete = isExactPermutation(key.depthPermutation, size);
    const depthDomainComplete = depthPermutationComplete
      && Math.min(...key.depthPermutation) === 0
      && Math.max(...key.depthPermutation) === size - 1;
    const xyCollisionFree = rowPermutationComplete && columnPermutationComplete;
    const xzCollisionFree = columnPermutationComplete && depthPermutationComplete;
    const yzCollisionFree = rowPermutationComplete && depthPermutationComplete;
    const collisionFree = xyCollisionFree && xzCollisionFree && yzCollisionFree && depthDomainComplete;
    return {
      key,
      gridSize: size,
      pointCount: size * size,
      depthDomain: Object.freeze({ minimum: 0, maximum: size - 1, complete: depthDomainComplete }),
      permutations: Object.freeze({
        row: rowPermutationComplete,
        column: columnPermutationComplete,
        depth: depthPermutationComplete
      }),
      axisPlanes: Object.freeze({
        xy: xyCollisionFree,
        xz: xzCollisionFree,
        yz: yzCollisionFree
      }),
      faces: Object.freeze({
        top: xyCollisionFree,
        bottom: xyCollisionFree,
        front: xzCollisionFree,
        back: xzCollisionFree,
        left: yzCollisionFree,
        right: yzCollisionFree
      }),
      collisionFree,
      proof: 'Complete row, column, and depth permutations make the Latin-cube mapping bijective on XY, XZ, and YZ. Opposite faces are mirrored forms of the same bijections.'
    };
  }

  function pointDepth(key, x, y) {
    const latinValue = (key.rowPermutation[x] + key.columnPermutation[y]) % key.gridSize;
    return key.depthPermutation[latinValue];
  }

  function rotateCell(row, column, size, quarterTurns) {
    let nextRow = row;
    let nextColumn = column;
    for (let turn = 0; turn < normalizeQuarterTurns(quarterTurns); turn += 1) {
      [nextRow, nextColumn] = [nextColumn, size - 1 - nextRow];
    }
    return [nextRow, nextColumn];
  }

  function faceCell(point, face, size, quarterTurns = 0) {
    let row;
    let column;
    switch (face) {
      case 'top': row = point.y; column = point.x; break;
      case 'bottom': row = point.y; column = size - 1 - point.x; break;
      case 'front': row = size - 1 - point.z; column = point.x; break;
      case 'back': row = size - 1 - point.z; column = size - 1 - point.x; break;
      case 'left': row = size - 1 - point.z; column = point.y; break;
      case 'right': row = size - 1 - point.z; column = size - 1 - point.y; break;
      default: fail(`Unknown cube face: ${face}`);
    }
    return rotateCell(row, column, size, quarterTurns);
  }

  function projectionOrderForKey(key, face, quarterTurns = 0) {
    if (!FACES.includes(face)) fail(`Unknown cube face: ${face}`);
    const size = key.gridSize;
    const order = new Int32Array(size * size);
    order.fill(-1);
    for (let x = 0; x < size; x += 1) {
      for (let y = 0; y < size; y += 1) {
        const id = x * size + y;
        const point = { x, y, z: pointDepth(key, x, y) };
        const [row, column] = faceCell(point, face, size, quarterTurns);
        const index = row * size + column;
        if (order[index] !== -1) fail(`Point-field collision detected on the ${face} face at row ${row}, column ${column}.`);
        order[index] = id;
      }
    }
    return order;
  }

  function projectionDiagnosticsForKey(key) {
    const cellCount = key.gridSize * key.gridSize;
    const faces = {};
    for (const face of FACES) {
      const order = projectionOrderForKey(key, face, 0);
      let valid = true;
      for (let index = 0; index < order.length; index += 1) {
        if (order[index] < 0) { valid = false; break; }
      }
      faces[face] = { uniqueCells: valid ? cellCount : 0, expectedCells: cellCount };
    }
    return {
      gridSize: key.gridSize,
      pointCount: cellCount,
      expectedPointCount: cellCount,
      collisionFree: Object.values(faces).every(result => result.uniqueCells === result.expectedCells),
      faces
    };
  }

  function assertInvariantForKey(key, options = {}) {
    const invariant = algebraicInvariantForKey(key);
    if (!invariant.collisionFree) {
      fail('The key violates omnidirectional non-confliction. Every axis plane and all six face projections must remain collision-free.');
    }
    if (options.exhaustive === true) {
      const diagnostics = projectionDiagnosticsForKey(key);
      if (!diagnostics.collisionFree) fail('Exhaustive six-face projection validation detected a collision.');
      for (const face of FACES) {
        const result = diagnostics.faces[face];
        if (!result || result.uniqueCells !== result.expectedCells) {
          fail(`Exhaustive projection validation failed on the ${face} face.`);
        }
      }
      return Object.freeze({ ...invariant, exhaustive: true, diagnostics });
    }
    return Object.freeze({ ...invariant, exhaustive: false });
  }

  function createKey(options = {}) {
    const gridSize = validateGridSize(options.gridSize ?? DEMONSTRATION_GRID_SIZE);
    const seed = String(options.seed || 'shadowrun-cube-key');
    const inputFace = String(options.inputFace || 'top');
    const outputFace = String(options.outputFace || 'front');
    validateFacePair(inputFace, outputFace);
    const inputQuarterTurns = normalizeQuarterTurns(options.inputQuarterTurns);
    const outputQuarterTurns = normalizeQuarterTurns(options.outputQuarterTurns);
    const random = mulberry32(fnv1a32(`${seed}|${gridSize}|latin-cube-key|${SCHEMA_VERSION}`));
    const key = {
      format: KEY_FORMAT,
      schemaVersion: SCHEMA_VERSION,
      algorithm: ALGORITHM,
      securityClassification: SECURITY_CLASSIFICATION,
      gridSize,
      seed,
      inputFace,
      outputFace,
      inputQuarterTurns,
      outputQuarterTurns,
      rowPermutation: shuffle(range(gridSize), random),
      columnPermutation: shuffle(range(gridSize), random),
      depthPermutation: shuffle(range(gridSize), random),
      mask: maskFromDensity(gridSize, options.maskDensity ?? 1, random),
      paddingMode: 'deterministic-seeded-random'
    };
    key.keyId = keyFingerprint(key);
    assertInvariantForKey(key);
    return key;
  }

  function validateKey(rawKey) {
    const key = validateKeyStructure(rawKey);
    assertInvariantForKey(key);
    return key;
  }

  function algebraicInvariant(rawKey) {
    return algebraicInvariantForKey(validateKeyStructure(rawKey));
  }

  function assertOmnidirectionalNonConflict(rawKey, options = {}) {
    return assertInvariantForKey(validateKeyStructure(rawKey), options);
  }

  function buildPoints(rawKey) {
    const key = validateKey(rawKey);
    const size = key.gridSize;
    const points = new Array(size * size);
    for (let x = 0; x < size; x += 1) {
      for (let y = 0; y < size; y += 1) {
        const id = x * size + y;
        points[id] = { id, x, y, z: pointDepth(key, x, y) };
      }
    }
    return points;
  }

  function faceOrder(points, face, size, quarterTurns = 0) {
    if (!FACES.includes(face)) fail(`Unknown cube face: ${face}`);
    const order = new Array(size * size);
    for (const point of points) {
      const [row, column] = faceCell(point, face, size, quarterTurns);
      const index = row * size + column;
      if (order[index] !== undefined) fail(`Point-field collision detected on the ${face} face at row ${row}, column ${column}.`);
      order[index] = point;
    }
    if (order.some(point => !point)) fail(`The ${face} projection contains one or more empty cells.`);
    return order;
  }

  function projectionDiagnostics(rawKey) {
    const key = validateKey(rawKey);
    return {
      ...projectionDiagnosticsForKey(key),
      invariant: algebraicInvariantForKey(key)
    };
  }

  function assertProjectionUniqueness(rawPointsOrKey, maybeSize) {
    if (Array.isArray(rawPointsOrKey)) {
      const size = Number(maybeSize);
      for (const face of FACES) faceOrder(rawPointsOrKey, face, size, 0);
      return true;
    }
    assertInvariantForKey(validateKeyStructure(rawPointsOrKey), { exhaustive: true });
    return true;
  }

  function transformBlockWithKey(block, key, fromFace, fromTurns, toFace, toTurns) {
    const cellCount = key.gridSize * key.gridSize;
    if (typeof block !== 'string' || block.length !== cellCount || /[^01]/.test(block)) fail('A cube block must contain exactly gridSize squared binary digits.');
    const inputOrder = projectionOrderForKey(key, fromFace, fromTurns);
    const outputOrder = projectionOrderForKey(key, toFace, toTurns);
    const bitsByPoint = new Array(cellCount);
    for (let index = 0; index < cellCount; index += 1) bitsByPoint[inputOrder[index]] = block[index];
    const output = new Array(cellCount);
    for (let index = 0; index < cellCount; index += 1) output[index] = bitsByPoint[outputOrder[index]];
    return output.join('');
  }

  function transformBlock(block, rawKey, fromFace, fromTurns, toFace, toTurns) {
    return transformBlockWithKey(block, validateKey(rawKey), fromFace, fromTurns, toFace, toTurns);
  }

  function deterministicFiller(key, blockIndex, cellCount) {
    const random = mulberry32(fnv1a32(`${key.seed}|${key.keyId}|padding|${blockIndex}`));
    return Array.from({ length: cellCount }, () => random() >= 0.5 ? '1' : '0');
  }

  function checksumMaterial(payload) {
    return JSON.stringify({
      format: payload.format,
      schemaVersion: payload.schemaVersion,
      algorithm: payload.algorithm,
      securityClassification: payload.securityClassification,
      keyId: payload.keyId,
      gridSize: payload.gridSize,
      inputFace: payload.inputFace,
      outputFace: payload.outputFace,
      inputQuarterTurns: payload.inputQuarterTurns,
      outputQuarterTurns: payload.outputQuarterTurns,
      originalBitLength: payload.originalBitLength,
      payloadCapacity: payload.payloadCapacity,
      blockCount: payload.blockCount,
      ciphertext: payload.ciphertext
    });
  }

  function packageChecksum(payload) {
    return hex32(checksumMaterial(payload));
  }

  function encryptBinary(binary, rawKey) {
    const bits = normalizeBits(binary);
    const key = validateKey(rawKey);
    const cellCount = key.gridSize * key.gridSize;
    const payloadIndexes = [];
    for (let index = 0; index < key.mask.length; index += 1) if (key.mask[index]) payloadIndexes.push(index);
    const payloadCapacity = payloadIndexes.length;
    const blockCount = Math.ceil(bits.length / payloadCapacity);
    let cursor = 0;
    const encryptedBlocks = new Array(blockCount);
    for (let blockIndex = 0; blockIndex < blockCount; blockIndex += 1) {
      const cells = deterministicFiller(key, blockIndex, cellCount);
      for (const cellIndex of payloadIndexes) {
        if (cursor < bits.length) cells[cellIndex] = bits[cursor++];
      }
      encryptedBlocks[blockIndex] = transformBlockWithKey(cells.join(''), key, key.inputFace, key.inputQuarterTurns, key.outputFace, key.outputQuarterTurns);
    }
    const payload = {
      format: PACKAGE_FORMAT,
      schemaVersion: SCHEMA_VERSION,
      algorithm: ALGORITHM,
      securityClassification: SECURITY_CLASSIFICATION,
      keyId: key.keyId,
      gridSize: key.gridSize,
      inputFace: key.inputFace,
      outputFace: key.outputFace,
      inputQuarterTurns: key.inputQuarterTurns,
      outputQuarterTurns: key.outputQuarterTurns,
      originalBitLength: bits.length,
      payloadCapacity,
      blockCount,
      ciphertext: encryptedBlocks.join(''),
      checksumType: CHECKSUM_TYPE
    };
    payload.checksum = packageChecksum(payload);
    return payload;
  }

  function validatePackage(rawPackage, rawKey) {
    let payload;
    try {
      payload = typeof rawPackage === 'string' ? JSON.parse(rawPackage) : rawPackage;
    } catch (error) {
      fail(`Encrypted package JSON is invalid: ${error.message}`);
    }
    const key = validateKey(rawKey);
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) fail('An encrypted package object is required.');
    if (payload.format !== PACKAGE_FORMAT) fail('The encrypted package format is not recognized.');
    if (payload.schemaVersion !== SCHEMA_VERSION) fail(`Unsupported package schema version: ${payload.schemaVersion || 'missing'}. Expected ${SCHEMA_VERSION}.`);
    if (payload.algorithm !== ALGORITHM) fail('The package algorithm is not supported by this engine.');
    if (payload.keyId !== key.keyId) fail('The encrypted package requires a different key.');
    if (Number(payload.gridSize) !== key.gridSize) fail('Package and key grid sizes do not match.');
    if (payload.inputFace !== key.inputFace || payload.outputFace !== key.outputFace) fail('Package and key face selections do not match.');
    if (normalizeQuarterTurns(payload.inputQuarterTurns) !== key.inputQuarterTurns || normalizeQuarterTurns(payload.outputQuarterTurns) !== key.outputQuarterTurns) fail('Package and key orientations do not match.');
    const ciphertext = normalizeBits(payload.ciphertext, 'Ciphertext');
    const cellCount = key.gridSize * key.gridSize;
    if (ciphertext.length % cellCount !== 0) fail('Ciphertext length is not aligned to the cube block size.');
    const payloadCapacity = key.mask.filter(Boolean).length;
    if (Number(payload.payloadCapacity) !== payloadCapacity) fail('Package payload capacity does not match the key mask.');
    const blockCount = Number(payload.blockCount);
    if (!Number.isInteger(blockCount) || blockCount < 1 || blockCount * cellCount !== ciphertext.length) fail('Package block count does not match its ciphertext length.');
    const originalBitLength = Number(payload.originalBitLength);
    if (!Number.isInteger(originalBitLength) || originalBitLength < 1 || originalBitLength > blockCount * payloadCapacity) fail('The package original bit length is invalid.');
    if (blockCount !== Math.ceil(originalBitLength / payloadCapacity)) fail('Package block count does not match its original bit length and mask capacity.');
    if (payload.checksumType !== CHECKSUM_TYPE) fail('The package checksum type is missing or unsupported.');
    const normalized = {
      ...payload,
      gridSize: key.gridSize,
      inputQuarterTurns: key.inputQuarterTurns,
      outputQuarterTurns: key.outputQuarterTurns,
      originalBitLength,
      payloadCapacity,
      blockCount,
      ciphertext
    };
    const expectedChecksum = packageChecksum(normalized);
    if (payload.checksum !== expectedChecksum) fail('Package checksum validation failed. The ciphertext or framing metadata may be corrupted.');
    normalized.checksum = expectedChecksum;
    return normalized;
  }

  function decryptBinary(rawPackage, rawKey) {
    const key = validateKey(rawKey);
    const payload = validatePackage(rawPackage, key);
    const cellCount = key.gridSize * key.gridSize;
    const payloadIndexes = [];
    for (let index = 0; index < key.mask.length; index += 1) if (key.mask[index]) payloadIndexes.push(index);
    const plaintext = [];
    for (let offset = 0; offset < payload.ciphertext.length; offset += cellCount) {
      const outputBlock = payload.ciphertext.slice(offset, offset + cellCount);
      const inputBlock = transformBlockWithKey(outputBlock, key, key.outputFace, key.outputQuarterTurns, key.inputFace, key.inputQuarterTurns);
      for (const cellIndex of payloadIndexes) plaintext.push(inputBlock[cellIndex]);
    }
    return plaintext.join('').slice(0, payload.originalBitLength);
  }

  function diagnosePackage(rawPackage, rawKey) {
    const key = validateKey(rawKey);
    const payload = validatePackage(rawPackage, key);
    const cellCount = key.gridSize * key.gridSize;
    const encryptedBlock = payload.ciphertext.slice(0, cellCount);
    const inputBlock = transformBlockWithKey(encryptedBlock, key, key.outputFace, key.outputQuarterTurns, key.inputFace, key.inputQuarterTurns);
    const faces = {};
    if (key.gridSize <= 12) {
      for (const face of FACES) faces[face] = transformBlockWithKey(inputBlock, key, key.inputFace, key.inputQuarterTurns, face, 0);
    } else {
      for (const face of FACES) faces[face] = 'large-grid-projection-available';
    }
    return {
      keyId: key.keyId,
      gridSize: key.gridSize,
      pointField: projectionDiagnostics(key),
      payloadCapacity: key.mask.filter(Boolean).length,
      inactiveMaskCells: key.mask.filter(value => !value).length,
      blockCount: payload.blockCount,
      originalBitLength: payload.originalBitLength,
      ciphertextBitLength: payload.ciphertext.length,
      checksum: payload.checksum,
      checksumType: payload.checksumType,
      firstBlock: { input: inputBlock, encrypted: encryptedBlock, faces },
      omnidirectionalInvariant: assertInvariantForKey(key)
    };
  }

  return Object.freeze({
    createKey,
    validateKey,
    validatePackage,
    buildPoints,
    faceCell,
    faceOrder,
    transformBlock,
    projectionDiagnostics,
    assertProjectionUniqueness,
    encryptBinary,
    decryptBinary,
    diagnosePackage,
    packageChecksum,
    legalOutputFaces,
    algebraicInvariant,
    assertOmnidirectionalNonConflict,
    constants: Object.freeze({
      KEY_FORMAT,
      PACKAGE_FORMAT,
      SCHEMA_VERSION,
      ALGORITHM,
      SECURITY_CLASSIFICATION,
      CHECKSUM_TYPE,
      MIN_GRID_SIZE,
      DEMONSTRATION_GRID_SIZE,
      STANDARD_TEST_GRID_SIZE,
      MAX_GRID_SIZE,
      FACES,
      OPPOSITE,
      RECOMMENDED_GRID_SIZES
    }),
    invariantConstants: Object.freeze({ FACES, AXIS_PLANES })
  });
});
