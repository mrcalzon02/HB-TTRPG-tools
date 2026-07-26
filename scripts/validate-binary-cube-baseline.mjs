#!/usr/bin/env node

import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, '..');
const Engine = require(path.join(repositoryRoot, 'shadowrun-binary-cube-engine.js'));

/*
V0 GOLDEN CONTRACT / V1 CANONICAL AUTHORITY

The Binary Cube computational authority is now exactly one file:
- shadowrun-binary-cube-engine.js

That file owns grid sizes through 1024, key generation and validation, the Latin-cube
point field, all six projections, block transformation, padding, package framing,
checksums, diagnostics, algebraic proof, and exhaustive omnidirectional validation.
No runtime script is permitted to replace window.ShadowrunBinaryCubeEngine after it
loads. The visualizer must consume this authority rather than reproduce the algorithm.

Current browser order:
1. shadowrun-binary-cube-engine.js
2. binary-cube-large-grid-ui.js
3. shadowrun-binary-cube-auth.js
4. shadowrun-binary-cube-encryption.js
5. shadowrun-binary-cube-editor.js
6. shadowrun-binary-cube-auth-ui.js
7. shadowrun-binary-cube-secure-export.js where the host requires it

The accepted V0 evidence below was generated before consolidation. Unchanged digests
prove that V1 preserves keys, point identities, projection order, framed blocks,
ciphertext, package checksums, recovered plaintext, and six-face diagnostics.
*/

const GOLDEN = Object.freeze({
  vectors: Object.freeze({
    'small-full-single-block': Object.freeze({ keyId: '0b918514', checksum: '45a58289', evidence: 'd5dcb45bc41334c482dd7451146b44dba17f74e76ae4160c998da5be039d5b7c' }),
    'small-sparse-multiblock': Object.freeze({ keyId: 'ad83c683', checksum: '12cb08ee', evidence: 'eb73f2fcb0cec9537dd227cd88e74a7a22e7c6d71f789807e8e3b2e2118c8265' }),
    'standard-12-multiblock': Object.freeze({ keyId: '689bd727', checksum: '618bc3ee', evidence: '104e6d983df0740ea5191b970b06e61355bfa3164da79308369afdebb9689c30' }),
    'medium-20-sparse': Object.freeze({ keyId: 'e52f7110', checksum: 'db308ab2', evidence: '8b4fafc0be9a06162193fa3bb980d40047d9acf709bff572915db9e6043c58a4' }),
    'large-64-smoke': Object.freeze({ keyId: '1507bbf1', checksum: '5a23a638', evidence: 'cd4d8efee96895e7dcb0bb26d697f1d40516219b3f91becb25fd9b087cbe5677' }),
    'byte-aligned-file-equivalent': Object.freeze({ keyId: 'f2353d8a', checksum: '917a0e7c', evidence: '3ab57d02ea980eba20805ef9484e6252dbb44d87adf3ca29691fbe7793cedca8' }),
    'non-byte-aligned-manual': Object.freeze({ keyId: '79002a45', checksum: '94cfaefd', evidence: '9d7d63e14b2eeccba2bf416b31d7fec2c2567f53d18481bd31ebfc0f37761c2b' })
  }),
  faceOrientationCases: 384,
  faceOrientationEvidence: 'f95492f783893654b7b4a52f532276a4056c7d9480d483599309d5866faa2900',
  completeEvidence: 'a16da1b364c2a437b36446d009597f0344ce01098b3ed612704557e7f41c3ed9'
});

const VECTOR_FORMAT = 'hb-ttrpg-shadowrun-binary-cube-v0-golden-vectors';
const VECTOR_SCHEMA_VERSION = '0.1.0';
const FACE_MATRIX_BITS = '0110100110010110';
const { FACES, OPPOSITE, SCHEMA_VERSION, ALGORITHM } = Engine.constants;

function bitsPattern(length, salt) {
  const source = [...String(salt)].map(character => character.charCodeAt(0).toString(2).padStart(8, '0')).join('');
  return Array.from({ length }, (_, index) => source[index % source.length]).join('');
}

const DEFINITIONS = Object.freeze([
  Object.freeze({ id: 'small-full-single-block', gridSize: 4, seed: 'visualizer-v0-small-full', inputFace: 'top', outputFace: 'front', inputQuarterTurns: 0, outputQuarterTurns: 0, maskDensity: 1, bits: '0100110011010011' }),
  Object.freeze({ id: 'small-sparse-multiblock', gridSize: 4, seed: 'visualizer-v0-small-sparse', inputFace: 'left', outputFace: 'top', inputQuarterTurns: 3, outputQuarterTurns: 1, maskDensity: 0.5, bits: bitsPattern(21, 'sparse') }),
  Object.freeze({ id: 'standard-12-multiblock', gridSize: 12, seed: 'visualizer-v0-standard-12', inputFace: 'back', outputFace: 'right', inputQuarterTurns: 2, outputQuarterTurns: 3, maskDensity: 1, bits: bitsPattern(257, 'standard') }),
  Object.freeze({ id: 'medium-20-sparse', gridSize: 20, seed: 'visualizer-v0-medium-20', inputFace: 'bottom', outputFace: 'left', inputQuarterTurns: 1, outputQuarterTurns: 2, maskDensity: 0.75, bits: bitsPattern(701, 'medium') }),
  Object.freeze({ id: 'large-64-smoke', gridSize: 64, seed: 'visualizer-v0-large-64', inputFace: 'right', outputFace: 'bottom', inputQuarterTurns: 0, outputQuarterTurns: 3, maskDensity: 0.1, bits: bitsPattern(511, 'large') }),
  Object.freeze({ id: 'byte-aligned-file-equivalent', gridSize: 12, seed: 'visualizer-v0-byte-aligned', inputFace: 'front', outputFace: 'top', inputQuarterTurns: 1, outputQuarterTurns: 0, maskDensity: 0.5, bits: [...Buffer.from('CubeV0!!', 'utf8')].map(byte => byte.toString(2).padStart(8, '0')).join('') }),
  Object.freeze({ id: 'non-byte-aligned-manual', gridSize: 4, seed: 'visualizer-v0-non-byte', inputFace: 'top', outputFace: 'left', inputQuarterTurns: 2, outputQuarterTurns: 2, maskDensity: 0.75, bits: '1011010010110' })
]);

function optionsFrom(definition) {
  return {
    gridSize: definition.gridSize,
    seed: definition.seed,
    inputFace: definition.inputFace,
    outputFace: definition.outputFace,
    inputQuarterTurns: definition.inputQuarterTurns,
    outputQuarterTurns: definition.outputQuarterTurns,
    maskDensity: definition.maskDensity
  };
}

function diagnosticSummary(key) {
  const diagnostics = Engine.projectionDiagnostics(key);
  const invariant = diagnostics.invariant || Engine.algebraicInvariant(key);
  return {
    gridSize: diagnostics.gridSize,
    pointCount: diagnostics.pointCount,
    expectedPointCount: diagnostics.expectedPointCount,
    collisionFree: diagnostics.collisionFree,
    faces: Object.fromEntries(FACES.map(face => [face, {
      uniqueCells: diagnostics.faces[face].uniqueCells,
      expectedCells: diagnostics.faces[face].expectedCells
    }])),
    invariant: {
      depthDomain: {
        minimum: invariant.depthDomain.minimum,
        maximum: invariant.depthDomain.maximum,
        complete: invariant.depthDomain.complete
      },
      permutations: {
        row: invariant.permutations.row,
        column: invariant.permutations.column,
        depth: invariant.permutations.depth
      },
      axisPlanes: {
        xy: invariant.axisPlanes.xy,
        xz: invariant.axisPlanes.xz,
        yz: invariant.axisPlanes.yz
      },
      faces: Object.fromEntries(FACES.map(face => [face, invariant.faces[face]])),
      collisionFree: invariant.collisionFree
    }
  };
}

function buildVector(definition) {
  const options = optionsFrom(definition);
  const key = Engine.createKey(options);
  const packageObject = Engine.encryptBinary(definition.bits, key);
  const recoveredBits = Engine.decryptBinary(packageObject, key);
  assert.equal(recoveredBits, definition.bits, `${definition.id} failed its round trip.`);

  const pointCoordinates = Engine.buildPoints(key);
  const inputProjection = Engine.faceOrder(pointCoordinates, key.inputFace, key.gridSize, key.inputQuarterTurns);
  const outputProjection = Engine.faceOrder(pointCoordinates, key.outputFace, key.gridSize, key.outputQuarterTurns);
  const cellCount = key.gridSize * key.gridSize;
  const framedInputBlocks = [];
  const encryptedBlocks = [];

  for (let offset = 0; offset < packageObject.ciphertext.length; offset += cellCount) {
    const encryptedBlock = packageObject.ciphertext.slice(offset, offset + cellCount);
    encryptedBlocks.push(encryptedBlock);
    framedInputBlocks.push(Engine.transformBlock(
      encryptedBlock,
      key,
      key.outputFace,
      key.outputQuarterTurns,
      key.inputFace,
      key.inputQuarterTurns
    ));
  }

  return {
    id: definition.id,
    options,
    inputBits: definition.bits,
    key,
    pointCoordinates,
    inputProjectionPointIds: inputProjection.map(point => point.id),
    outputProjectionPointIds: outputProjection.map(point => point.id),
    framedInputBlocks,
    encryptedBlocks,
    package: packageObject,
    recoveredBits,
    diagnostics: diagnosticSummary(key)
  };
}

function buildFaceOrientationMatrix() {
  const matrix = [];
  for (const inputFace of FACES) {
    for (const outputFace of Engine.legalOutputFaces(inputFace)) {
      for (let inputQuarterTurns = 0; inputQuarterTurns < 4; inputQuarterTurns += 1) {
        for (let outputQuarterTurns = 0; outputQuarterTurns < 4; outputQuarterTurns += 1) {
          const key = Engine.createKey({
            gridSize: 4,
            seed: `visualizer-v0-face-matrix|${inputFace}|${outputFace}|${inputQuarterTurns}|${outputQuarterTurns}`,
            inputFace,
            outputFace,
            inputQuarterTurns,
            outputQuarterTurns,
            maskDensity: 1
          });
          const packageObject = Engine.encryptBinary(FACE_MATRIX_BITS, key);
          assert.equal(Engine.decryptBinary(packageObject, key), FACE_MATRIX_BITS);
          matrix.push({
            inputFace,
            outputFace,
            inputQuarterTurns,
            outputQuarterTurns,
            keyId: key.keyId,
            ciphertext: packageObject.ciphertext,
            checksum: packageObject.checksum
          });
        }
      }
    }
  }
  return matrix;
}

function buildEvidence() {
  return {
    format: VECTOR_FORMAT,
    schemaVersion: VECTOR_SCHEMA_VERSION,
    engineSchemaVersion: SCHEMA_VERSION,
    algorithm: ALGORITHM,
    generatedBy: 'scripts/validate-binary-cube-baseline.mjs --write',
    vectors: DEFINITIONS.map(buildVector),
    faceOrientationMatrix: buildFaceOrientationMatrix()
  };
}

function sha256(value) {
  return crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function assertThrows(action, pattern, label) {
  assert.throws(action, error => {
    assert.match(error.message, pattern, `${label} rejected for an unexpected reason.`);
    return true;
  }, label);
}

function validateNegativeCases(evidence) {
  const source = evidence.vectors[0];
  const key = Engine.validateKey(source.key);
  const packageObject = Engine.validatePackage(source.package, key);

  const wrongKey = Engine.createKey({ ...source.options, seed: `${source.options.seed}-wrong-key` });
  assertThrows(() => Engine.decryptBinary(packageObject, wrongKey), /different key/i, 'Wrong-key validation');

  const alteredCiphertext = {
    ...packageObject,
    ciphertext: `${packageObject.ciphertext[0] === '1' ? '0' : '1'}${packageObject.ciphertext.slice(1)}`
  };
  assertThrows(() => Engine.validatePackage(alteredCiphertext, key), /checksum validation failed/i, 'Ciphertext corruption validation');

  const alteredMetadata = { ...packageObject, originalBitLength: packageObject.originalBitLength - 1 };
  assertThrows(() => Engine.validatePackage(alteredMetadata, key), /(block count|checksum validation failed)/i, 'Metadata corruption validation');

  const invalidDepthKey = JSON.parse(JSON.stringify(key));
  invalidDepthKey.depthPermutation[0] = invalidDepthKey.depthPermutation[1];
  delete invalidDepthKey.keyId;
  assertThrows(() => Engine.validateKey(invalidDepthKey), /depth permutation|omnidirectional|collision/i, 'Invalid-depth validation');

  for (const inputFace of FACES) {
    assert.deepEqual(
      Engine.legalOutputFaces(inputFace),
      FACES.filter(face => face !== inputFace && face !== OPPOSITE[inputFace]),
      `${inputFace} legal output faces changed.`
    );
  }
}

function validateGoldenEvidence(evidence) {
  assert.equal(evidence.vectors.length, DEFINITIONS.length);
  assert.equal(evidence.faceOrientationMatrix.length, GOLDEN.faceOrientationCases);

  for (const vector of evidence.vectors) {
    const expected = GOLDEN.vectors[vector.id];
    assert.ok(expected, `Unexpected vector ${vector.id}.`);
    assert.equal(vector.key.keyId, expected.keyId, `${vector.id} key identity drifted.`);
    assert.equal(vector.package.checksum, expected.checksum, `${vector.id} package checksum drifted.`);
    assert.equal(sha256(vector), expected.evidence, `${vector.id} evidence drifted.`);
    assert.equal(vector.recoveredBits, vector.inputBits, `${vector.id} did not round trip.`);
    assert.equal(vector.diagnostics.collisionFree, true, `${vector.id} has a projection collision.`);
    assert.equal(vector.diagnostics.invariant.collisionFree, true, `${vector.id} violates its algebraic invariant.`);
    assert.equal(vector.pointCoordinates.length, vector.key.gridSize * vector.key.gridSize, `${vector.id} point count is incomplete.`);
  }

  assert.equal(sha256(evidence.faceOrientationMatrix), GOLDEN.faceOrientationEvidence, 'Face/orientation evidence drifted.');
  assert.equal(sha256(evidence), GOLDEN.completeEvidence, 'Complete Binary Cube evidence drifted.');
}

function writeExpandedEvidence(evidence, outputPath) {
  const resolved = path.resolve(repositoryRoot, outputPath);
  fs.mkdirSync(path.dirname(resolved), { recursive: true });
  fs.writeFileSync(resolved, `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');
  return resolved;
}

function main() {
  assert.equal(Engine.constants.MAX_GRID_SIZE, 1024);
  assert.equal(typeof Engine.assertOmnidirectionalNonConflict, 'function');
  assert.equal(typeof Engine.algebraicInvariant, 'function');

  const evidence = buildEvidence();
  validateNegativeCases(evidence);
  validateGoldenEvidence(evidence);

  const expandedIndex = process.argv.indexOf('--write-expanded');
  if (expandedIndex >= 0) {
    const outputPath = process.argv[expandedIndex + 1];
    if (!outputPath) throw new Error('--write-expanded requires an output path.');
    const resolved = writeExpandedEvidence(evidence, outputPath);
    console.log(`Expanded Binary Cube evidence written: ${path.relative(repositoryRoot, resolved)}`);
  }

  console.log(JSON.stringify({
    format: 'hb-ttrpg-shadowrun-binary-cube-v1-validation-receipt',
    schemaVersion: '0.1.0',
    engineSchemaVersion: SCHEMA_VERSION,
    algorithm: ALGORITHM,
    engineAuthority: 'shadowrun-binary-cube-engine.js',
    vectorCount: evidence.vectors.length,
    faceOrientationCaseCount: evidence.faceOrientationMatrix.length,
    representativeGridSizes: evidence.vectors.map(vector => vector.key.gridSize),
    keyIds: evidence.vectors.map(vector => vector.key.keyId),
    checksums: evidence.vectors.map(vector => vector.package.checksum),
    completeEvidenceSha256: sha256(evidence),
    roundTripValid: true,
    collisionFree: true,
    negativeValidationCasesPassed: 4
  }, null, 2));
}

main();
