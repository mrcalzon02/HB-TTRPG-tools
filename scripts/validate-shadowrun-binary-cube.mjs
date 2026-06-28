import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const scriptPath = fileURLToPath(import.meta.url);
const root = path.resolve(path.dirname(scriptPath), '..');
const require = createRequire(import.meta.url);
const engine = require(path.join(root, 'shadowrun-binary-cube-engine.js'));
const {
  FACES,
  OPPOSITE,
  RECOMMENDED_GRID_SIZES,
  SCHEMA_VERSION,
  CHECKSUM_TYPE
} = engine.constants;

let assertions = 0;
let roundTrips = 0;
const sizesCovered = new Set();
const facePairsCovered = new Set();

function check(condition, message) {
  assertions += 1;
  assert.ok(condition, message);
}

function equal(actual, expected, message) {
  assertions += 1;
  assert.equal(actual, expected, message);
}

function deepEqual(actual, expected, message) {
  assertions += 1;
  assert.deepEqual(actual, expected, message);
}

function expectThrow(callback, pattern, message) {
  assertions += 1;
  assert.throws(callback, pattern, message);
}

function legalOutputs(inputFace) {
  return FACES.filter(face => face !== inputFace && face !== OPPOSITE[inputFace]);
}

function patternedBits(length, salt = 0) {
  return Array.from({ length }, (_, index) => ((index * 7 + salt * 11 + Math.floor(index / 3)) % 2 ? '1' : '0')).join('');
}

function roundTrip(options, lengths) {
  const key = engine.createKey(options);
  const diagnostics = engine.projectionDiagnostics(key);
  check(diagnostics.collisionFree, `Point field must be collision-free for ${JSON.stringify(options)}.`);
  equal(diagnostics.pointCount, key.gridSize * key.gridSize, 'Point count must equal gridSize squared.');
  sizesCovered.add(key.gridSize);
  facePairsCovered.add(`${key.inputFace}->${key.outputFace}`);
  for (const rawLength of lengths) {
    const length = Math.max(1, Number(rawLength));
    const input = patternedBits(length, key.inputQuarterTurns + key.outputQuarterTurns + key.gridSize);
    const payload = engine.encryptBinary(input, key);
    equal(payload.schemaVersion, SCHEMA_VERSION, 'Package schema must match the engine schema.');
    equal(payload.checksumType, CHECKSUM_TYPE, 'Package must declare the corruption-detection checksum type.');
    engine.validatePackage(payload, key);
    equal(engine.decryptBinary(payload, key), input, `Round trip failed for ${JSON.stringify(options)} at ${length} bits.`);
    roundTrips += 1;
  }
  return key;
}

function validateDeterminism() {
  const options = { gridSize: 12, seed: 'deterministic-fixture', inputFace: 'left', outputFace: 'top', inputQuarterTurns: 3, outputQuarterTurns: 1, maskDensity: 0.75 };
  const first = engine.createKey(options);
  const second = engine.createKey(options);
  deepEqual(first, second, 'Identical settings and seed must produce an identical key.');
  const changed = engine.createKey({ ...options, seed: 'deterministic-fixture-changed' });
  check(first.keyId !== changed.keyId, 'Changing the seed must change the key fingerprint.');
}

function validateGridFourMatrix() {
  for (const inputFace of FACES) {
    for (const outputFace of legalOutputs(inputFace)) {
      for (let inputQuarterTurns = 0; inputQuarterTurns < 4; inputQuarterTurns += 1) {
        for (let outputQuarterTurns = 0; outputQuarterTurns < 4; outputQuarterTurns += 1) {
          for (const maskDensity of [1, 0.75, 0.5]) {
            const options = {
              gridSize: 4,
              seed: `grid4-${inputFace}-${outputFace}-${inputQuarterTurns}-${outputQuarterTurns}-${maskDensity}`,
              inputFace,
              outputFace,
              inputQuarterTurns,
              outputQuarterTurns,
              maskDensity
            };
            const key = engine.createKey(options);
            const capacity = key.mask.filter(Boolean).length;
            roundTrip(options, [1, capacity, capacity + 3]);
          }
        }
      }
    }
  }
}

function validateRecommendedSizes() {
  for (const [sizeIndex, gridSize] of RECOMMENDED_GRID_SIZES.entries()) {
    for (const [faceIndex, inputFace] of FACES.entries()) {
      for (const [outputIndex, outputFace] of legalOutputs(inputFace).entries()) {
        const maskDensity = [1, 0.75, 0.5][(sizeIndex + faceIndex + outputIndex) % 3];
        const options = {
          gridSize,
          seed: `recommended-${gridSize}-${inputFace}-${outputFace}`,
          inputFace,
          outputFace,
          inputQuarterTurns: (sizeIndex + faceIndex) % 4,
          outputQuarterTurns: (sizeIndex + outputIndex + 1) % 4,
          maskDensity
        };
        const key = engine.createKey(options);
        const capacity = key.mask.filter(Boolean).length;
        roundTrip(options, [Math.min(17, capacity), capacity + 1]);
      }
    }
  }
}

function validateFailureModes() {
  const key = engine.createKey({ gridSize: 4, seed: 'failure-key', inputFace: 'top', outputFace: 'front', maskDensity: 0.75 });
  const payload = engine.encryptBinary('001011010011101', key);
  expectThrow(() => engine.encryptBinary('00102', key), /only 0, 1/i, 'Invalid binary input must fail.');
  expectThrow(() => engine.createKey({ gridSize: 4, inputFace: 'top', outputFace: 'bottom' }), /opposite face/i, 'Opposite faces must be rejected.');

  const wrongKey = engine.createKey({ gridSize: 4, seed: 'wrong-key', inputFace: 'top', outputFace: 'front', maskDensity: 0.75 });
  expectThrow(() => engine.decryptBinary(payload, wrongKey), /different key/i, 'A wrong key must fail before decryption.');

  const damagedCiphertext = structuredClone(payload);
  damagedCiphertext.ciphertext = `${payload.ciphertext[0] === '0' ? '1' : '0'}${payload.ciphertext.slice(1)}`;
  expectThrow(() => engine.decryptBinary(damagedCiphertext, key), /checksum validation failed/i, 'A flipped ciphertext bit must be detected.');

  const damagedMetadata = structuredClone(payload);
  damagedMetadata.originalBitLength -= 1;
  expectThrow(() => engine.decryptBinary(damagedMetadata, key), /checksum validation failed|block count/i, 'Altered framing metadata must be detected.');

  const damagedKey = structuredClone(key);
  [damagedKey.rowPermutation[0], damagedKey.rowPermutation[1]] = [damagedKey.rowPermutation[1], damagedKey.rowPermutation[0]];
  expectThrow(() => engine.validateKey(damagedKey), /fingerprint does not match/i, 'Altered key material must fail fingerprint validation.');

  const duplicatePermutation = structuredClone(key);
  duplicatePermutation.rowPermutation[0] = duplicatePermutation.rowPermutation[1];
  duplicatePermutation.keyId = '';
  expectThrow(() => engine.validateKey(duplicatePermutation), /row permutation is invalid/i, 'Duplicate permutation values must fail validation.');

  const oldKey = structuredClone(key);
  oldKey.schemaVersion = '0.1.0';
  expectThrow(() => engine.validateKey(oldKey), /unsupported key schema/i, 'Unsupported key schemas must fail visibly.');

  const truncated = structuredClone(payload);
  truncated.ciphertext = truncated.ciphertext.slice(1);
  expectThrow(() => engine.decryptBinary(truncated, key), /aligned to the cube block size/i, 'Truncated ciphertext must fail block alignment.');
}

function validateLegacyFixtureAndIntegration() {
  const receiptPath = path.join(root, 'source-page-references/shadowrun-binary-cube-encryption.source.json');
  const receipt = JSON.parse(fs.readFileSync(receiptPath, 'utf8'));
  const fixture = receipt.legacySpreadsheetFixture;
  equal(fixture.gridSize, 4, 'Legacy spreadsheet fixture must preserve the 4x4 grid size.');
  equal(fixture.input, '0100100001101001', 'Legacy spreadsheet input must remain preserved.');
  deepEqual(fixture.labeledFaces, {
    bottom: '1001011010000100',
    back: '0000001111000011',
    left: '0000011000111001',
    right: '0000011011001001',
    front: '0000110000111100'
  }, 'Legacy spreadsheet face strings must remain unchanged.');

  const ui = fs.readFileSync(path.join(root, 'shadowrun-binary-cube-encryption.js'), 'utf8');
  const entry = fs.readFileSync(path.join(root, 'shadowrun-entry.js'), 'utf8');
  check(ui.includes('window.ShadowrunBinaryCubeEngine'), 'The browser interface must consume the separated engine.');
  check(!ui.includes('function createKey('), 'The browser interface must not duplicate key-generation logic.');
  check(entry.includes('shadowrun-binary-cube-engine.js'), 'The Shadowrun loader must load the pure engine.');
  check(entry.includes('shadowrun-binary-cube-encryption.js'), 'The Shadowrun loader must load the laboratory interface.');
}

validateDeterminism();
validateGridFourMatrix();
validateRecommendedSizes();
validateFailureModes();
validateLegacyFixtureAndIntegration();

for (const size of RECOMMENDED_GRID_SIZES) check(sizesCovered.has(size), `Recommended grid size ${size} was not covered.`);
for (const inputFace of FACES) {
  for (const outputFace of legalOutputs(inputFace)) check(facePairsCovered.has(`${inputFace}->${outputFace}`), `Face pair ${inputFace}->${outputFace} was not covered.`);
}

writeSummary();

function writeSummary() {
  const summary = {
    receiptType: 'shadowrunBinaryCubeValidationSummary',
    schemaVersion: SCHEMA_VERSION,
    valid: true,
    assertions,
    roundTrips,
    recommendedGridSizesCovered: [...sizesCovered].sort((a, b) => a - b),
    directedFacePairsCovered: facePairsCovered.size,
    exhaustiveGridFour: {
      inputFaces: 6,
      legalOutputFacesPerInput: 4,
      inputOrientations: 4,
      outputOrientations: 4,
      maskDensities: 3,
      payloadLengthsPerConfiguration: 3
    },
    checksumType: CHECKSUM_TYPE
  };
  const outputPath = process.argv[2] ? path.resolve(process.argv[2]) : null;
  if (outputPath) {
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, `${JSON.stringify(summary, null, 2)}\n`);
  }
  console.log('Shadowrun Binary Cube validation passed.');
  console.log(`Assertions: ${assertions}`);
  console.log(`Round trips: ${roundTrips}`);
  console.log(`Recommended sizes: ${summary.recommendedGridSizesCovered.join(', ')}`);
  console.log(`Directed legal face pairs: ${summary.directedFacePairsCovered}`);
}
