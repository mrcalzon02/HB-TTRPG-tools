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
  const TRACE_FORMAT = 'hb-ttrpg-shadowrun-binary-cube-transformation-trace';
  const TRACE_SCHEMA_VERSION = '0.1.0';
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

  function pointDepthForKey(key, x, y) {
    const latinValue = (key.rowPermutation[x] + key.columnPermutation[y]) % key.gridSize;
    return key.depthPermutation[latinValue];
  }

  function validateCoordinate(value, size, label) {
    const coordinate = Number(value);
    if (!Number.isInteger(coordinate) || coordinate < 0 || coordinate >= size) {
      fail(`${label} must be an integer from 0 through ${size - 1}.`);
    }
    return coordinate;
  }

  function pointDepth(rawKey, xValue, yValue) {
    const key = validateKey(rawKey);
    const x = validateCoordinate(xValue, key.gridSize, 'X coordinate');
    const y = validateCoordinate(yValue, key.gridSize, 'Y coordinate');
    return pointDepthForKey(key, x, y);
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
        const point = { x, y, z: pointDepthForKey(key, x, y) };
        const [row, column] = faceCell(point, face, size, quarterTurns);
        const index = row * size + column;
        if (order[index] !== -1) fail(`Point-field collision detected on the ${face} face at row ${row}, column ${column}.`);
        order[index] = id;
      }
    }
    return order;
  }

  function projectionOrder(rawKey, face, quarterTurns = 0) {
    return projectionOrderForKey(validateKey(rawKey), face, quarterTurns);
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
        points[id] = { id, x, y, z: pointDepthForKey(key, x, y) };
      }
    }
    return points;
  }

  function buildPointsById(rawKey, pointIdsValue) {
    const key = validateKey(rawKey);
    const size = key.gridSize;
    const pointCount = size * size;
    const pointIds = Array.from(pointIdsValue || []);
    const seen = new Uint8Array(pointCount);
    return pointIds.map((pointIdValue, index) => {
      const pointId = Number(pointIdValue);
      if (!Number.isInteger(pointId) || pointId < 0 || pointId >= pointCount) fail(`Point ID at sample index ${index} must be an integer from 0 through ${pointCount - 1}.`);
      if (seen[pointId]) fail(`Point ID ${pointId} appears more than once in the sampled point request.`);
      seen[pointId] = 1;
      const x = Math.floor(pointId / size);
      const y = pointId % size;
      return { id: pointId, x, y, z: pointDepthForKey(key, x, y) };
    });
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

  function computeBlockTransformation(block, key, fromFace, fromTurns, toFace, toTurns) {
    const cellCount = key.gridSize * key.gridSize;
    if (typeof block !== 'string' || block.length !== cellCount || /[^01]/.test(block)) fail('A cube block must contain exactly gridSize squared binary digits.');
    const inputOrder = projectionOrderForKey(key, fromFace, fromTurns);
    const outputOrder = projectionOrderForKey(key, toFace, toTurns);
    const bitsByPoint = new Array(cellCount);
    const inputCellIndexByPoint = new Int32Array(cellCount);
    const outputCellIndexByPoint = new Int32Array(cellCount);
    for (let inputCellIndex = 0; inputCellIndex < cellCount; inputCellIndex += 1) {
      const pointId = inputOrder[inputCellIndex];
      bitsByPoint[pointId] = block[inputCellIndex];
      inputCellIndexByPoint[pointId] = inputCellIndex;
    }
    const output = new Array(cellCount);
    for (let outputCellIndex = 0; outputCellIndex < cellCount; outputCellIndex += 1) {
      const pointId = outputOrder[outputCellIndex];
      output[outputCellIndex] = bitsByPoint[pointId];
      outputCellIndexByPoint[pointId] = outputCellIndex;
    }
    return {
      inputOrder,
      outputOrder,
      bitsByPoint,
      inputCellIndexByPoint,
      outputCellIndexByPoint,
      outputBlock: output.join('')
    };
  }

  function transformBlockWithKey(block, key, fromFace, fromTurns, toFace, toTurns) {
    return computeBlockTransformation(block, key, fromFace, fromTurns, toFace, toTurns).outputBlock;
  }

  function transformBlock(block, rawKey, fromFace, fromTurns, toFace, toTurns) {
    return transformBlockWithKey(block, validateKey(rawKey), fromFace, fromTurns, toFace, toTurns);
  }

  function deterministicFillerForKey(key, blockIndex, cellCount) {
    const random = mulberry32(fnv1a32(`${key.seed}|${key.keyId}|padding|${blockIndex}`));
    return Array.from({ length: cellCount }, () => random() >= 0.5 ? '1' : '0');
  }

  function deterministicFiller(rawKey, blockIndexValue, cellCountValue) {
    const key = validateKey(rawKey);
    const blockIndex = Number(blockIndexValue);
    if (!Number.isInteger(blockIndex) || blockIndex < 0) fail('Block index must be a non-negative integer.');
    const defaultCellCount = key.gridSize * key.gridSize;
    const cellCount = cellCountValue === undefined ? defaultCellCount : Number(cellCountValue);
    if (!Number.isInteger(cellCount) || cellCount < 1) fail('Filler cell count must be a positive integer.');
    return deterministicFillerForKey(key, blockIndex, cellCount);
  }

  function payloadIndexesForKey(key) {
    const indexes = [];
    for (let index = 0; index < key.mask.length; index += 1) if (key.mask[index]) indexes.push(index);
    return indexes;
  }

  function framePayloadBlockForKey(bits, key, blockIndex, sourceOffset) {
    const cellCount = key.gridSize * key.gridSize;
    const payloadIndexes = payloadIndexesForKey(key);
    const deterministicFillerBits = deterministicFillerForKey(key, blockIndex, cellCount);
    const cells = [...deterministicFillerBits];
    const sourceBitIndexByInputCell = new Int32Array(cellCount);
    sourceBitIndexByInputCell.fill(-1);
    let cursor = sourceOffset;
    for (const cellIndex of payloadIndexes) {
      if (cursor >= bits.length) break;
      cells[cellIndex] = bits[cursor];
      sourceBitIndexByInputCell[cellIndex] = cursor;
      cursor += 1;
    }
    return {
      blockIndex,
      sourceOffset,
      nextSourceOffset: cursor,
      payloadIndexes,
      deterministicFillerBits,
      sourceBitIndexByInputCell,
      framedBlock: cells.join('')
    };
  }

  function frozenArray(values) {
    return Object.freeze(Array.from(values));
  }

  function frozenPointField(key) {
    const points = new Array(key.gridSize * key.gridSize);
    for (let x = 0; x < key.gridSize; x += 1) {
      for (let y = 0; y < key.gridSize; y += 1) {
        const id = x * key.gridSize + y;
        points[id] = Object.freeze({ id, x, y, z: pointDepthForKey(key, x, y) });
      }
    }
    return Object.freeze(points);
  }

  function tracePhases(frame, key, transformation) {
    return Object.freeze([
      Object.freeze({ id: 'source-ready', sourceStart: frame.sourceOffset, sourceEndExclusive: frame.nextSourceOffset }),
      Object.freeze({ id: 'block-framed', cellCount: key.gridSize * key.gridSize, blockIndex: frame.blockIndex }),
      Object.freeze({ id: 'mask-applied', payloadCellCount: frame.payloadIndexes.length }),
      Object.freeze({ id: 'input-face-staged', face: key.inputFace, quarterTurns: key.inputQuarterTurns }),
      Object.freeze({ id: 'point-assignment', pointCount: transformation.bitsByPoint.length }),
      Object.freeze({ id: 'point-field-loaded', pointCount: transformation.bitsByPoint.length }),
      Object.freeze({ id: 'output-projection-selected', face: key.outputFace, quarterTurns: key.outputQuarterTurns }),
      Object.freeze({ id: 'output-face-staged', cellCount: transformation.outputBlock.length }),
      Object.freeze({ id: 'encrypted-block-emitted', bitLength: transformation.outputBlock.length }),
      Object.freeze({ id: 'block-complete', blockIndex: frame.blockIndex })
    ]);
  }

  function buildEncryptionTrace(bits, key, frame, transformation) {
    const cellCount = key.gridSize * key.gridSize;
    const sourceBitIndexByPoint = new Int32Array(cellCount);
    sourceBitIndexByPoint.fill(-1);
    const cellKindByPoint = new Array(cellCount);
    for (let pointId = 0; pointId < cellCount; pointId += 1) {
      const inputCellIndex = transformation.inputCellIndexByPoint[pointId];
      const sourceBitIndex = frame.sourceBitIndexByInputCell[inputCellIndex];
      sourceBitIndexByPoint[pointId] = sourceBitIndex;
      cellKindByPoint[pointId] = sourceBitIndex >= 0 ? 'payload' : 'filler';
    }
    return Object.freeze({
      format: TRACE_FORMAT,
      schemaVersion: TRACE_SCHEMA_VERSION,
      algorithm: ALGORITHM,
      keyId: key.keyId,
      gridSize: key.gridSize,
      blockIndex: frame.blockIndex,
      sourceBitRange: Object.freeze({
        start: frame.sourceOffset,
        endExclusive: frame.nextSourceOffset,
        consumed: frame.nextSourceOffset - frame.sourceOffset
      }),
      sourceBits: bits.slice(frame.sourceOffset, frame.nextSourceOffset),
      inputFace: key.inputFace,
      outputFace: key.outputFace,
      inputQuarterTurns: key.inputQuarterTurns,
      outputQuarterTurns: key.outputQuarterTurns,
      cellCount,
      payloadCapacity: frame.payloadIndexes.length,
      mask: frozenArray(key.mask),
      payloadCellIndexes: frozenArray(frame.payloadIndexes),
      deterministicFillerBits: frozenArray(frame.deterministicFillerBits),
      sourceBitIndexByInputCell: frozenArray(frame.sourceBitIndexByInputCell),
      framedBlock: frame.framedBlock,
      pointField: frozenPointField(key),
      inputProjectionPointIds: frozenArray(transformation.inputOrder),
      outputProjectionPointIds: frozenArray(transformation.outputOrder),
      inputCellIndexByPoint: frozenArray(transformation.inputCellIndexByPoint),
      outputCellIndexByPoint: frozenArray(transformation.outputCellIndexByPoint),
      bitByPoint: frozenArray(transformation.bitsByPoint),
      sourceBitIndexByPoint: frozenArray(sourceBitIndexByPoint),
      cellKindByPoint: frozenArray(cellKindByPoint),
      outputBlock: transformation.outputBlock,
      phases: tracePhases(frame, key, transformation),
      validation: Object.freeze({ collisionFree: true, canonicalEngine: true })
    });
  }

  function traceEncryptBlock(binary, rawKey, blockIndexValue = 0, sourceOffsetValue) {
    const bits = normalizeBits(binary);
    const key = validateKey(rawKey);
    const blockIndex = Number(blockIndexValue);
    if (!Number.isInteger(blockIndex) || blockIndex < 0) fail('Trace block index must be a non-negative integer.');
    const payloadCapacity = key.mask.filter(Boolean).length;
    const defaultSourceOffset = blockIndex * payloadCapacity;
    const sourceOffset = sourceOffsetValue === undefined ? defaultSourceOffset : Number(sourceOffsetValue);
    if (!Number.isInteger(sourceOffset) || sourceOffset < 0 || sourceOffset >= bits.length) fail('Trace source offset must identify an existing source bit.');
    const frame = framePayloadBlockForKey(bits, key, blockIndex, sourceOffset);
    const transformation = computeBlockTransformation(
      frame.framedBlock,
      key,
      key.inputFace,
      key.inputQuarterTurns,
      key.outputFace,
      key.outputQuarterTurns
    );
    return buildEncryptionTrace(bits, key, frame, transformation);
  }

  function validateTransformationTrace(rawTrace, rawKey) {
    let trace;
    try {
      trace = typeof rawTrace === 'string' ? JSON.parse(rawTrace) : rawTrace;
    } catch (error) {
      fail(`Transformation trace JSON is invalid: ${error.message}`);
    }
    const key = validateKey(rawKey);
    if (!trace || typeof trace !== 'object' || Array.isArray(trace)) fail('A transformation trace object is required.');
    if (trace.format !== TRACE_FORMAT) fail('The transformation trace format is not recognized.');
    if (trace.schemaVersion !== TRACE_SCHEMA_VERSION) fail(`Unsupported transformation trace schema: ${trace.schemaVersion || 'missing'}.`);
    if (trace.algorithm !== ALGORITHM) fail('The transformation trace algorithm is not supported.');
    if (trace.keyId !== key.keyId) fail('The transformation trace requires a different key.');
    if (Number(trace.gridSize) !== key.gridSize) fail('Trace and key grid sizes do not match.');
    if (trace.inputFace !== key.inputFace || trace.outputFace !== key.outputFace) fail('Trace and key face selections do not match.');
    if (normalizeQuarterTurns(trace.inputQuarterTurns) !== key.inputQuarterTurns || normalizeQuarterTurns(trace.outputQuarterTurns) !== key.outputQuarterTurns) fail('Trace and key orientations do not match.');
    const blockIndex = Number(trace.blockIndex);
    if (!Number.isInteger(blockIndex) || blockIndex < 0) fail('The transformation trace block index is invalid.');
    const cellCount = key.gridSize * key.gridSize;
    if (Number(trace.cellCount) !== cellCount) fail('The transformation trace cell count is invalid.');
    const expectedPayloadIndexes = payloadIndexesForKey(key);
    if (Number(trace.payloadCapacity) !== expectedPayloadIndexes.length) fail('The transformation trace payload capacity does not match the key mask.');
    const requiredArrays = [
      'mask',
      'payloadCellIndexes',
      'deterministicFillerBits',
      'sourceBitIndexByInputCell',
      'pointField',
      'inputProjectionPointIds',
      'outputProjectionPointIds',
      'inputCellIndexByPoint',
      'outputCellIndexByPoint',
      'bitByPoint',
      'sourceBitIndexByPoint',
      'cellKindByPoint',
      'phases'
    ];
    for (const field of requiredArrays) if (!Array.isArray(trace[field])) fail(`The transformation trace ${field} field is invalid.`);
    for (const field of ['mask', 'deterministicFillerBits', 'sourceBitIndexByInputCell', 'pointField', 'inputProjectionPointIds', 'outputProjectionPointIds', 'inputCellIndexByPoint', 'outputCellIndexByPoint', 'bitByPoint', 'sourceBitIndexByPoint', 'cellKindByPoint']) {
      if (trace[field].length !== cellCount) fail(`The transformation trace ${field} length does not match the cube grid.`);
    }
    if (JSON.stringify(trace.payloadCellIndexes) !== JSON.stringify(expectedPayloadIndexes)) fail('The transformation trace payload-cell order does not match the key mask.');
    if (trace.framedBlock.length !== cellCount || /[^01]/.test(trace.framedBlock)) fail('The transformation trace framed block is invalid.');
    if (trace.outputBlock.length !== cellCount || /[^01]/.test(trace.outputBlock)) fail('The transformation trace output block is invalid.');
    if (typeof trace.sourceBits !== 'string' || !trace.sourceBits || /[^01]/.test(trace.sourceBits)) fail('The transformation trace source bits are invalid.');
    const sourceStart = Number(trace.sourceBitRange?.start);
    const sourceEndExclusive = Number(trace.sourceBitRange?.endExclusive);
    const sourceConsumed = Number(trace.sourceBitRange?.consumed);
    if (!Number.isInteger(sourceStart) || sourceStart < 0 || !Number.isInteger(sourceEndExclusive) || sourceEndExclusive <= sourceStart) fail('The transformation trace source range is invalid.');
    if (sourceEndExclusive - sourceStart !== sourceConsumed || sourceConsumed !== trace.sourceBits.length) fail('The transformation trace source range does not match its source bits.');
    if (JSON.stringify(trace.mask.map(Boolean)) !== JSON.stringify(key.mask)) fail('The transformation trace mask does not match the key.');
    const expectedFiller = deterministicFillerForKey(key, blockIndex, cellCount);
    if (JSON.stringify(trace.deterministicFillerBits) !== JSON.stringify(expectedFiller)) fail('The transformation trace filler does not match the canonical block filler.');

    const reconstructedInput = [...expectedFiller];
    for (let inputCellIndex = 0; inputCellIndex < cellCount; inputCellIndex += 1) {
      const sourceBitIndex = Number(trace.sourceBitIndexByInputCell[inputCellIndex]);
      if (!Number.isInteger(sourceBitIndex) || sourceBitIndex < -1) fail('The transformation trace contains an invalid source-bit index.');
      if (sourceBitIndex >= 0) {
        if (sourceBitIndex < sourceStart || sourceBitIndex >= sourceEndExclusive) fail('The transformation trace source-bit index falls outside its source range.');
        if (!key.mask[inputCellIndex]) fail('The transformation trace assigns source data to an inactive mask cell.');
        reconstructedInput[inputCellIndex] = trace.sourceBits[sourceBitIndex - sourceStart];
      }
    }
    if (reconstructedInput.join('') !== trace.framedBlock) fail('The transformation trace source mapping does not reconstruct its framed block.');

    const transformation = computeBlockTransformation(
      trace.framedBlock,
      key,
      key.inputFace,
      key.inputQuarterTurns,
      key.outputFace,
      key.outputQuarterTurns
    );
    if (trace.outputBlock !== transformation.outputBlock) fail('The transformation trace output does not match the canonical block transformation.');
    if (JSON.stringify(trace.inputProjectionPointIds) !== JSON.stringify(Array.from(transformation.inputOrder))) fail('The trace input projection order is invalid.');
    if (JSON.stringify(trace.outputProjectionPointIds) !== JSON.stringify(Array.from(transformation.outputOrder))) fail('The trace output projection order is invalid.');
    if (JSON.stringify(trace.inputCellIndexByPoint) !== JSON.stringify(Array.from(transformation.inputCellIndexByPoint))) fail('The trace input-cell point mapping is invalid.');
    if (JSON.stringify(trace.outputCellIndexByPoint) !== JSON.stringify(Array.from(transformation.outputCellIndexByPoint))) fail('The trace output-cell point mapping is invalid.');
    if (JSON.stringify(trace.bitByPoint) !== JSON.stringify(transformation.bitsByPoint)) fail('The trace point-bit assignment is invalid.');

    for (let pointId = 0; pointId < cellCount; pointId += 1) {
      const point = trace.pointField[pointId];
      const x = Math.floor(pointId / key.gridSize);
      const y = pointId % key.gridSize;
      if (!point || point.id !== pointId || point.x !== x || point.y !== y || point.z !== pointDepthForKey(key, x, y)) fail(`The transformation trace point field is invalid at point ${pointId}.`);
      const inputCellIndex = transformation.inputCellIndexByPoint[pointId];
      const expectedSourceBitIndex = Number(trace.sourceBitIndexByInputCell[inputCellIndex]);
      if (Number(trace.sourceBitIndexByPoint[pointId]) !== expectedSourceBitIndex) fail(`The transformation trace source mapping is invalid at point ${pointId}.`);
      const expectedKind = expectedSourceBitIndex >= 0 ? 'payload' : 'filler';
      if (trace.cellKindByPoint[pointId] !== expectedKind) fail(`The transformation trace cell kind is invalid at point ${pointId}.`);
    }

    const phaseIds = trace.phases.map(phase => phase?.id);
    const expectedPhaseIds = ['source-ready', 'block-framed', 'mask-applied', 'input-face-staged', 'point-assignment', 'point-field-loaded', 'output-projection-selected', 'output-face-staged', 'encrypted-block-emitted', 'block-complete'];
    if (JSON.stringify(phaseIds) !== JSON.stringify(expectedPhaseIds)) fail('The transformation trace phase sequence is invalid.');
    return Object.freeze({
      valid: true,
      keyId: key.keyId,
      blockIndex,
      cellCount,
      sourceBitCount: sourceConsumed,
      outputBlock: trace.outputBlock,
      phaseCount: expectedPhaseIds.length
    });
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
    const payloadCapacity = payloadIndexesForKey(key).length;
    const blockCount = Math.ceil(bits.length / payloadCapacity);
    let cursor = 0;
    const encryptedBlocks = new Array(blockCount);
    for (let blockIndex = 0; blockIndex < blockCount; blockIndex += 1) {
      const frame = framePayloadBlockForKey(bits, key, blockIndex, cursor);
      cursor = frame.nextSourceOffset;
      encryptedBlocks[blockIndex] = transformBlockWithKey(frame.framedBlock, key, key.inputFace, key.inputQuarterTurns, key.outputFace, key.outputQuarterTurns);
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
    buildPointsById,
    pointDepth,
    faceCell,
    faceOrder,
    projectionOrder,
    transformBlock,
    deterministicFiller,
    traceEncryptBlock,
    validateTransformationTrace,
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
      TRACE_FORMAT,
      TRACE_SCHEMA_VERSION,
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
