/* Dedicated Binary Cube execution worker.
 * Heavy canonical engine calls run off the browser main thread so slow hardware
 * may take longer without making the page unresponsive. The worker never
 * reimplements the Binary Cube mathematics; it imports and calls the canonical engine.
 */
'use strict';

importScripts('shadowrun-binary-cube-engine.js?v=20260809-v14-binary-cube-worker');

const Engine = self.ShadowrunBinaryCubeEngine;
if (!Engine) throw new Error('Canonical Binary Cube engine did not initialize inside the worker.');

function progress(id, stage, fraction, detail = '') {
  self.postMessage({ type: 'progress', id, stage, fraction, detail });
}

function keySummary(key) {
  return {
    keyId: key.keyId,
    gridSize: key.gridSize,
    payloadCells: key.mask.filter(Boolean).length,
    totalCells: key.mask.length,
    inputFace: key.inputFace,
    outputFace: key.outputFace
  };
}

function diagnosticSummary(packageObject, key, options = {}) {
  const exhaustive = options.exhaustive === true;
  const smallGrid = key.gridSize <= 12;
  const invariant = Engine.algebraicInvariant(key);
  let diagnostics = null;

  if (exhaustive || smallGrid) diagnostics = Engine.diagnosePackage(packageObject, key);

  return {
    keyId: key.keyId,
    gridSize: key.gridSize,
    pointCount: key.gridSize * key.gridSize,
    collisionFree: exhaustive || smallGrid ? Boolean(diagnostics?.pointField?.collisionFree) : Boolean(invariant.collisionFree),
    exhaustive,
    payloadCapacity: packageObject.payloadCapacity,
    inactiveMaskCells: key.mask.length - key.mask.filter(Boolean).length,
    blockCount: packageObject.blockCount,
    originalBitLength: packageObject.originalBitLength,
    ciphertextBitLength: packageObject.ciphertext.length,
    checksum: packageObject.checksum,
    checksumType: packageObject.checksumType,
    firstBlockFaces: diagnostics?.firstBlock?.faces || null
  };
}

function parseKeyJson(value) {
  return Engine.validateKey(typeof value === 'string' ? JSON.parse(value) : value);
}

function parsePackageJson(value, key) {
  return Engine.validatePackage(typeof value === 'string' ? JSON.parse(value) : value, key);
}

function execute(id, operation, payload = {}) {
  switch (operation) {
    case 'create-key': {
      progress(id, 'Generating deterministic key', 0.05);
      const key = Engine.createKey(payload.options || {});
      progress(id, 'Key generated', 0.35);
      if (payload.exhaustive !== false) {
        progress(id, 'Checking all six face projections', 0.4);
        Engine.assertProjectionUniqueness(key);
      }
      progress(id, 'Serializing key', 0.95);
      return { keyJson: JSON.stringify(key, null, 2), summary: keySummary(key) };
    }

    case 'validate-key': {
      progress(id, 'Validating key structure', 0.15);
      const key = parseKeyJson(payload.keyJson);
      if (payload.exhaustive === true) {
        progress(id, 'Checking all six face projections', 0.45);
        Engine.assertProjectionUniqueness(key);
      }
      progress(id, 'Key validation complete', 1);
      return { keyJson: JSON.stringify(key, null, 2), summary: keySummary(key) };
    }

    case 'encrypt': {
      progress(id, 'Preparing key', 0.03);
      const key = payload.keyJson
        ? parseKeyJson(payload.keyJson)
        : Engine.createKey(payload.options || {});
      progress(id, 'Encrypting canonical cube blocks', 0.18);
      const packageObject = Engine.encryptBinary(payload.bits, key);
      progress(id, 'Building package diagnostics', 0.72);
      const diagnostics = diagnosticSummary(packageObject, key, { exhaustive: payload.exhaustive === true });
      progress(id, 'Serializing result', 0.96);
      return {
        keyJson: JSON.stringify(key, null, 2),
        packageJson: JSON.stringify(packageObject, null, 2),
        keySummary: keySummary(key),
        diagnostics
      };
    }

    case 'decrypt': {
      progress(id, 'Validating key', 0.05);
      const key = parseKeyJson(payload.keyJson);
      progress(id, 'Validating encrypted package', 0.18);
      const packageObject = parsePackageJson(payload.packageJson, key);
      progress(id, 'Recovering source bits', 0.38);
      const plaintext = Engine.decryptBinary(packageObject, key);
      progress(id, 'Building package diagnostics', 0.75);
      const diagnostics = diagnosticSummary(packageObject, key, { exhaustive: payload.exhaustive === true });
      progress(id, 'Serializing result', 0.96);
      return {
        keyJson: JSON.stringify(key, null, 2),
        packageJson: JSON.stringify(packageObject, null, 2),
        plaintext,
        keySummary: keySummary(key),
        diagnostics
      };
    }

    case 'validate-pair': {
      progress(id, 'Validating key', 0.05);
      const key = parseKeyJson(payload.keyJson);
      progress(id, 'Validating package checksum and framing', 0.22);
      const packageObject = parsePackageJson(payload.packageJson, key);
      progress(id, payload.exhaustive === false ? 'Checking algebraic invariant' : 'Checking all six face projections', 0.45);
      const diagnostics = diagnosticSummary(packageObject, key, { exhaustive: payload.exhaustive !== false });
      progress(id, 'Validation complete', 1);
      return {
        keyJson: JSON.stringify(key, null, 2),
        packageJson: JSON.stringify(packageObject, null, 2),
        keySummary: keySummary(key),
        diagnostics
      };
    }

    default:
      throw new Error(`Unknown Binary Cube worker operation: ${operation}`);
  }
}

self.addEventListener('message', event => {
  const request = event.data || {};
  const id = request.id;
  if (!Number.isInteger(id)) return;
  try {
    const result = execute(id, String(request.operation || ''), request.payload || {});
    self.postMessage({ type: 'result', id, result });
  } catch (error) {
    self.postMessage({
      type: 'error',
      id,
      error: {
        name: error?.name || 'Error',
        message: error?.message || String(error),
        stack: error?.stack || ''
      }
    });
  }
});
