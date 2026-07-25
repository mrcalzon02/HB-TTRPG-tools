#!/usr/bin/env node

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, '..');
const Engine = require(path.join(repositoryRoot, 'binary-cube-omnidirectional-engine.js'));

/*
V0 BASELINE CONTRACT

Current runtime authorities and baseline blobs:
- shadowrun-binary-cube-engine.js: de9c3bb36d713688de0f2b4d9fcb8df3325df6b0
  Original engine; replaced at runtime and scheduled for consolidation/retirement in V1.
- binary-cube-large-grid-engine.js: c6b33ba3a863b26b24c14dfbcf4c994013ad4d8b
  Current large-grid computational base through grid size 1024.
- binary-cube-omnidirectional-engine.js: 5b3b08074c071001c3c015bf3b11d04e33257782
  Current final browser authority; wraps the large-grid engine with invariant enforcement.
- binary-cube-large-grid-ui.js: 9bc4a5c566b5b25aa0432366cf8086afb2925f53
  Grid/mask control enhancement only.
- shadowrun-binary-cube-encryption.js: fd372cd8b84dfb5867118d367a4ed04348053b87
  Canonical laboratory panel and local state hb-ttrpg-shadowrun-binary-cube-v2.
- shadowrun-binary-cube-editor.js: ae3e622cdef0314172d884a4c735b67b99ee56b5
  Validated custom permutation/mask editor.
- shadowrun-binary-cube-auth.js: ea281e238c0b482e83b22fad28303dec45dda8c4
  PBKDF2-SHA-256/AES-GCM authenticated envelope authority.
- shadowrun-binary-cube-auth-ui.js: 6956d2967963838b2b39a66f8a5784e18a8bcc61
  Auth UI and local envelope state hb-ttrpg-shadowrun-binary-cube-auth-envelope-v1.
- shadowrun-binary-cube-secure-export.js: 17967cbf8ea80b5953aa3ea175cfd5f887dd6093
  Metadata-minimized secure export authority.
- binary-cube-desktop-link.js: 8980edb726f05fa626e4fd076ced71a95c2a24a3
  Desktop navigation enhancement.
- shadowrun-entry.js: 29a775f80f88e42c94dd83841039c46353c8cc92
  Shadowrun launcher and on-demand bundle authority.
- app-lite-view-mounts.js: 4f138cb3523feefb2b2294dee7f90ad8c2320c71
  Shared eager Binary Cube enhancements.

Current Shadowrun load order:
1. shadowrun-binary-cube-engine.js
2. binary-cube-large-grid-engine.js
3. binary-cube-omnidirectional-engine.js
4. binary-cube-large-grid-ui.js
5. shadowrun-binary-cube-auth.js
6. shadowrun-binary-cube-encryption.js
7. shadowrun-binary-cube-editor.js
8. shadowrun-binary-cube-auth-ui.js

Compatibility boundaries locked by this validator:
- key format hb-ttrpg-shadowrun-binary-cube-key, schema 0.2.0
- package format hb-ttrpg-shadowrun-binary-cube-package, schema 0.2.0
- algorithm latin-cube-face-permutation
- checksum fnv1a32-corruption-detection-only
- deterministic-seeded-random padding
- grid sizes 3 through 1024
- exactly four perpendicular output faces for every input face
- complete row/column/depth permutations and depth domain 0 through N-1
- collision-free XY, XZ, YZ, and all six face projections
- stable key IDs, point identities, projection order, framed blocks, ciphertext,
  package checksums, and recovered plaintext
- wrong-key, altered-ciphertext, and altered-metadata rejection

The visualizer must consume this engine contract. It must never implement a second
encoding algorithm. V1 remains closed until this validator passes against the real
repository runtime. Use --write-expanded <path> to emit full human-readable evidence.
*/

const GOLDEN_DIGESTS = Object.freeze({
  "format": "hb-ttrpg-shadowrun-binary-cube-v0-golden-digests",
  "schemaVersion": "0.1.0",
  "engineSchemaVersion": "0.2.0",
  "algorithm": "latin-cube-face-permutation",
  "generatedBy": "scripts/validate-binary-cube-baseline.mjs --write",
  "vectors": [
    {
      "id": "small-full-single-block",
      "keyId": "0b918514",
      "packageChecksum": "45a58289",
      "evidenceSha256": "d5dcb45bc41334c482dd7451146b44dba17f74e76ae4160c998da5be039d5b7c"
    },
    {
      "id": "small-sparse-multiblock",
      "keyId": "ad83c683",
      "packageChecksum": "12cb08ee",
      "evidenceSha256": "eb73f2fcb0cec9537dd227cd88e74a7a22e7c6d71f789807e8e3b2e2118c8265"
    },
    {
      "id": "standard-12-multiblock",
      "keyId": "689bd727",
      "packageChecksum": "618bc3ee",
      "evidenceSha256": "104e6d983df0740ea5191b970b06e61355bfa3164da79308369afdebb9689c30"
    },
    {
      "id": "medium-20-sparse",
      "keyId": "e52f7110",
      "packageChecksum": "db308ab2",
      "evidenceSha256": "8b4fafc0be9a06162193fa3bb980d40047d9acf709bff572915db9e6043c58a4"
    },
    {
      "id": "large-64-smoke",
      "keyId": "1507bbf1",
      "packageChecksum": "5a23a638",
      "evidenceSha256": "cd4d8efee96895e7dcb0bb26d697f1d40516219b3f91becb25fd9b087cbe5677"
    },
    {
      "id": "byte-aligned-file-equivalent",
      "keyId": "f2353d8a",
      "packageChecksum": "917a0e7c",
      "evidenceSha256": "3ab57d02ea980eba20805ef9484e6252dbb44d87adf3ca29691fbe7793cedca8"
    },
    {
      "id": "non-byte-aligned-manual",
      "keyId": "79002a45",
      "packageChecksum": "94cfaefd",
      "evidenceSha256": "9d7d63e14b2eeccba2bf416b31d7fec2c2567f53d18481bd31ebfc0f37761c2b"
    }
  ],
  "faceOrientationMatrix": {
    "caseCount": 384,
    "evidenceSha256": "f95492f783893654b7b4a52f532276a4056c7d9480d483599309d5866faa2900"
  },
  "completeEvidenceSha256": "a16da1b364c2a437b36446d009597f0344ce01098b3ed612704557e7f41c3ed9"
});

const VECTOR_FORMAT = 'hb-ttrpg-shadowrun-binary-cube-v0-golden-vectors';
const VECTOR_SCHEMA_VERSION = '0.1.0';
const FACE_MATRIX_BITS = '0110100110010110';
const { FACES, OPPOSITE, SCHEMA_VERSION, ALGORITHM } = Engine.constants;

function bitsPattern(length, salt) {
  const source = [...String(salt)].map(character => character.charCodeAt(0).toString(2).padStart(8, '0')).join('');
  return Array.from({ length }, (_, index) => source[index % source.length]).join('');
}

const VECTOR_DEFINITIONS = Object.freeze([
  Object.freeze({
    id: 'small-full-single-block',
    gridSize: 4,
    seed: 'visualizer-v0-small-full',
    inputFace: 'top',
    outputFace: 'front',
    inputQuarterTurns: 0,
    outputQuarterTurns: 0,
    maskDensity: 1,
    bits: '0100110011010011'
  }),
  Object.freeze({
    id: 'small-sparse-multiblock',
    gridSize: 4,
    seed: 'visualizer-v0-small-sparse',
    inputFace: 'left',
    outputFace: 'top',
    inputQuarterTurns: 3,
    outputQuarterTurns: 1,
    maskDensity: 0.5,
    bits: bitsPattern(21, 'sparse')
  }),
  Object.freeze({
    id: 'standard-12-multiblock',
    gridSize: 12,
    seed: 'visualizer-v0-standard-12',
    inputFace: 'back',
    outputFace: 'right',
    inputQuarterTurns: 2,
    outputQuarterTurns: 3,
    maskDensity: 1,
    bits: bitsPattern(257, 'standard')
  }),
  Object.freeze({
    id: 'medium-20-sparse',
    gridSize: 20,
    seed: 'visualizer-v0-medium-20',
    inputFace: 'bottom',
    outputFace: 'left',
    inputQuarterTurns: 1,
    outputQuarterTurns: 2,
    maskDensity: 0.75,
    bits: bitsPattern(701, 'medium')
  }),
  Object.freeze({
    id: 'large-64-smoke',
    gridSize: 64,
    seed: 'visualizer-v0-large-64',
    inputFace: 'right',
    outputFace: 'bottom',
    inputQuarterTurns: 0,
    outputQuarterTurns: 3,
    maskDensity: 0.1,
    bits: bitsPattern(511, 'large')
  }),
  Object.freeze({
    id: 'byte-aligned-file-equivalent',
    gridSize: 12,
    seed: 'visualizer-v0-byte-aligned',
    inputFace: 'front',
    outputFace: 'top',
    inputQuarterTurns: 1,
    outputQuarterTurns: 0,
    maskDensity: 0.5,
    bits: [...Buffer.from('CubeV0!!', 'utf8')].map(byte => byte.toString(2).padStart(8, '0')).join('')
  }),
  Object.freeze({
    id: 'non-byte-aligned-manual',
    gridSize: 4,
    seed: 'visualizer-v0-non-byte',
    inputFace: 'top',
    outputFace: 'left',
    inputQuarterTurns: 2,
    outputQuarterTurns: 2,
    maskDensity: 0.75,
    bits: '1011010010110'
  })
]);

function optionsFromDefinition(definition) {
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

function buildVectorEvidence(definition) {
  const options = optionsFromDefinition(definition);
  const key = Engine.createKey(options);
  const packageObject = Engine.encryptBinary(definition.bits, key);
  const recoveredBits = Engine.decryptBinary(packageObject, key);
  assert.equal(recoveredBits, definition.bits, `${definition.id} failed its immediate round trip.`);

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
    vectors: VECTOR_DEFINITIONS.map(buildVectorEvidence),
    faceOrientationMatrix: buildFaceOrientationMatrix()
  };
}

function assertRejects(action, messagePattern, label) {
  assert.throws(action, error => {
    assert.match(error.message, messagePattern, `${label} rejected for an unexpected reason.`);
    return true;
  }, label);
}

function runNegativeTests(evidence) {
  const source = evidence.vectors[0];
  const key = Engine.validateKey(source.key);
  const packageObject = Engine.validatePackage(source.package, key);

  const wrongKey = Engine.createKey({
    ...source.options,
    seed: `${source.options.seed}-wrong-key`
  });
  assertRejects(
    () => Engine.decryptBinary(packageObject, wrongKey),
    /different key/i,
    'Wrong-key package validation'
  );

  const alteredCiphertext = {
    ...packageObject,
    ciphertext: `${packageObject.ciphertext[0] === '1' ? '0' : '1'}${packageObject.ciphertext.slice(1)}`
  };
  assertRejects(
    () => Engine.validatePackage(alteredCiphertext, key),
    /checksum validation failed/i,
    'Altered-ciphertext validation'
  );

  const alteredMetadata = {
    ...packageObject,
    originalBitLength: packageObject.originalBitLength - 1
  };
  assertRejects(
    () => Engine.validatePackage(alteredMetadata, key),
    /(block count|checksum validation failed)/i,
    'Altered-metadata validation'
  );

  for (const inputFace of FACES) {
    assert.deepEqual(
      Engine.legalOutputFaces(inputFace),
      FACES.filter(face => face !== inputFace && face !== OPPOSITE[inputFace]),
      `${inputFace} legal output faces changed.`
    );
  }
}

function validateEvidenceShape(evidence) {
  assert.equal(evidence.format, VECTOR_FORMAT);
  assert.equal(evidence.schemaVersion, VECTOR_SCHEMA_VERSION);
  assert.equal(evidence.engineSchemaVersion, SCHEMA_VERSION);
  assert.equal(evidence.algorithm, ALGORITHM);
  assert.equal(evidence.vectors.length, VECTOR_DEFINITIONS.length);
  assert.equal(evidence.faceOrientationMatrix.length, 6 * 4 * 4 * 4);

  for (const vector of evidence.vectors) {
    assert.equal(vector.recoveredBits, vector.inputBits, `${vector.id} fixture does not round trip.`);
    assert.equal(vector.diagnostics.collisionFree, true, `${vector.id} fixture is not collision-free.`);
    assert.equal(vector.diagnostics.invariant.collisionFree, true, `${vector.id} invariant is not collision-free.`);
    assert.equal(vector.pointCoordinates.length, vector.key.gridSize * vector.key.gridSize, `${vector.id} point count is incomplete.`);
  }
}

function sha256(value) {
  return crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function digestEvidence(evidence) {
  return {
    format: 'hb-ttrpg-shadowrun-binary-cube-v0-golden-digests',
    schemaVersion: VECTOR_SCHEMA_VERSION,
    engineSchemaVersion: evidence.engineSchemaVersion,
    algorithm: evidence.algorithm,
    generatedBy: 'scripts/validate-binary-cube-baseline.mjs --write',
    vectors: evidence.vectors.map(vector => ({
      id: vector.id,
      keyId: vector.key.keyId,
      packageChecksum: vector.package.checksum,
      evidenceSha256: sha256(vector)
    })),
    faceOrientationMatrix: {
      caseCount: evidence.faceOrientationMatrix.length,
      evidenceSha256: sha256(evidence.faceOrientationMatrix)
    },
    completeEvidenceSha256: sha256(evidence)
  };
}

function writeExpandedEvidence(evidence, outputPath) {
  const resolved = path.resolve(repositoryRoot, outputPath);
  fs.mkdirSync(path.dirname(resolved), { recursive: true });
  fs.writeFileSync(resolved, `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');
  return resolved;
}

function main() {
  const printDigests = process.argv.includes('--print-digests');
  const expandedIndex = process.argv.indexOf('--write-expanded');
  const expandedPath = expandedIndex >= 0 ? process.argv[expandedIndex + 1] : null;
  if (expandedIndex >= 0 && !expandedPath) throw new Error('--write-expanded requires an output path.');
  const actual = buildEvidence();
  validateEvidenceShape(actual);
  runNegativeTests(actual);

  const actualDigests = digestEvidence(actual);
  assert.deepEqual(actualDigests, GOLDEN_DIGESTS, 'Binary Cube behavior drifted from the accepted V0 golden evidence.');
  if (printDigests) console.log(JSON.stringify(actualDigests, null, 2));

  if (expandedPath) {
    const resolved = writeExpandedEvidence(actual, expandedPath);
    console.log(`Expanded Binary Cube evidence written: ${path.relative(repositoryRoot, resolved)}`);
  }

  const receipt = {
    format: 'hb-ttrpg-shadowrun-binary-cube-v0-validation-receipt',
    schemaVersion: '0.1.0',
    engineSchemaVersion: SCHEMA_VERSION,
    algorithm: ALGORITHM,
    vectorCount: actual.vectors.length,
    faceOrientationCaseCount: actual.faceOrientationMatrix.length,
    representativeGridSizes: actual.vectors.map(vector => vector.key.gridSize),
    keyIds: actual.vectors.map(vector => vector.key.keyId),
    checksums: actual.vectors.map(vector => vector.package.checksum),
    roundTripValid: true,
    collisionFree: true,
    negativeValidationCasesPassed: 3
  };

  console.log(JSON.stringify(receipt, null, 2));
}

main();
