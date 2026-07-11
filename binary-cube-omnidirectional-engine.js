(function installOmnidirectionalBinaryCubeEngine(root, factory) {
  'use strict';
  const base = typeof module === 'object' && module.exports
    ? require('./binary-cube-large-grid-engine.js')
    : root?.ShadowrunBinaryCubeEngine;
  const api = factory(base);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.ShadowrunBinaryCubeEngine = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function createOmnidirectionalBinaryCubeEngine(Base) {
  'use strict';

  if (!Base) throw new Error('The large-grid Binary Cube engine must load before the omnidirectional invariant layer.');

  const FACES = Object.freeze(['top', 'bottom', 'front', 'back', 'left', 'right']);
  const AXIS_PLANES = Object.freeze(['xy', 'xz', 'yz']);

  function fail(message) {
    throw new Error(message);
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

  function algebraicInvariant(rawKey) {
    const key = Base.validateKey(rawKey);
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

  function assertOmnidirectionalNonConflict(rawKey, options = {}) {
    const invariant = algebraicInvariant(rawKey);
    if (!invariant.collisionFree) {
      fail('The key violates omnidirectional non-confliction. Every axis plane and all six face projections must remain collision-free.');
    }

    if (options.exhaustive === true) {
      const diagnostics = Base.projectionDiagnostics(invariant.key);
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
    const key = Base.createKey(options);
    assertOmnidirectionalNonConflict(key);
    return key;
  }

  function validateKey(rawKey) {
    const key = Base.validateKey(rawKey);
    assertOmnidirectionalNonConflict(key);
    return key;
  }

  function validatePackage(rawPackage, rawKey) {
    const key = validateKey(rawKey);
    return Base.validatePackage(rawPackage, key);
  }

  function encryptBinary(binary, rawKey) {
    const key = validateKey(rawKey);
    return Base.encryptBinary(binary, key);
  }

  function decryptBinary(rawPackage, rawKey) {
    const key = validateKey(rawKey);
    return Base.decryptBinary(rawPackage, key);
  }

  function diagnosePackage(rawPackage, rawKey) {
    const key = validateKey(rawKey);
    const diagnosis = Base.diagnosePackage(rawPackage, key);
    return {
      ...diagnosis,
      omnidirectionalInvariant: assertOmnidirectionalNonConflict(key)
    };
  }

  function projectionDiagnostics(rawKey) {
    const key = validateKey(rawKey);
    const diagnostics = Base.projectionDiagnostics(key);
    return {
      ...diagnostics,
      invariant: algebraicInvariant(key)
    };
  }

  function assertProjectionUniqueness(rawPointsOrKey, maybeSize) {
    if (Array.isArray(rawPointsOrKey)) return Base.assertProjectionUniqueness(rawPointsOrKey, maybeSize);
    assertOmnidirectionalNonConflict(rawPointsOrKey, { exhaustive: true });
    return true;
  }

  return Object.freeze({
    ...Base,
    createKey,
    validateKey,
    validatePackage,
    encryptBinary,
    decryptBinary,
    diagnosePackage,
    projectionDiagnostics,
    assertProjectionUniqueness,
    algebraicInvariant,
    assertOmnidirectionalNonConflict,
    invariantConstants: Object.freeze({ FACES, AXIS_PLANES })
  });
});
