import assert from 'node:assert/strict';
import crypto from 'node:crypto';
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
  MIN_GRID_SIZE,
  DEMONSTRATION_GRID_SIZE,
  STANDARD_TEST_GRID_SIZE,
  SCHEMA_VERSION,
  CHECKSUM_TYPE
} = engine.constants;

let assertions = 0;
let roundTrips = 0;
let knownTextControl = null;
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

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function bytesToBits(bytes) {
  return [...bytes].map(byte => byte.toString(2).padStart(8, '0')).join('');
}

function bitsToBytes(bits) {
  if (bits.length % 8 !== 0) throw new Error('Known text control did not recover complete bytes.');
  return Buffer.from(Array.from({ length: bits.length / 8 }, (_, index) => Number.parseInt(bits.slice(index * 8, index * 8 + 8), 2)));
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
              gridSize: DEMONSTRATION_GRID_SIZE,
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
  equal(MIN_GRID_SIZE, 3, 'The minimum Binary Cube key size must remain 3x3.');
  equal(DEMONSTRATION_GRID_SIZE, 4, 'The demonstration Binary Cube size must remain 4x4.');
  equal(STANDARD_TEST_GRID_SIZE, 16, 'The standard Binary Cube test size must remain 16x16.');
  const minimumKey = engine.createKey({ gridSize: MIN_GRID_SIZE, seed: 'minimum-valid-key', inputFace: 'top', outputFace: 'front' });
  equal(minimumKey.gridSize, 3, 'A 3x3 Binary Cube key must remain valid.');
  expectThrow(() => engine.createKey({ gridSize: 2, inputFace: 'top', outputFace: 'front' }), /from 3 through 60/i, 'A 2x2 key must be rejected because it collapses to a simple Latin-cipher-sized model.');

  const key = engine.createKey({ gridSize: DEMONSTRATION_GRID_SIZE, seed: 'failure-key', inputFace: 'top', outputFace: 'front', maskDensity: 0.75 });
  const payload = engine.encryptBinary('001011010011101', key);
  expectThrow(() => engine.encryptBinary('00102', key), /only 0, 1/i, 'Invalid binary input must fail.');
  expectThrow(() => engine.createKey({ gridSize: DEMONSTRATION_GRID_SIZE, inputFace: 'top', outputFace: 'bottom' }), /opposite face/i, 'Opposite faces must be rejected.');

  const wrongKey = engine.createKey({ gridSize: DEMONSTRATION_GRID_SIZE, seed: 'wrong-key', inputFace: 'top', outputFace: 'front', maskDensity: 0.75 });
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

function validateKnownLoremIpsumControl() {
  const documentPath = path.join(root, 'data/shadowrun/binary-cube/lorem-ipsum-control.txt');
  const keyPath = path.join(root, 'data/shadowrun/binary-cube/lorem-ipsum-control-key.json');
  const sourceBytes = fs.readFileSync(documentPath);
  const sourceText = sourceBytes.toString('utf8');
  const sourceBits = bytesToBits(sourceBytes);
  const key = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
  const validatedKey = engine.validateKey(key);

  equal(sourceBytes.length, 124, 'Lorem ipsum control document byte length changed.');
  equal(sha256(sourceBytes), 'bdc77e51f558cca288e3fc31a1c63549ba8662ccc7d858695b50b29a567243dd', 'Lorem ipsum control document hash changed.');
  equal(sourceBits.length, 992, 'Lorem ipsum control binary length changed.');
  equal(validatedKey.gridSize, STANDARD_TEST_GRID_SIZE, 'Known Lorem ipsum control must use the 16x16 standard test model.');
  equal(validatedKey.keyId, 'ee5ebaaf', 'Known Lorem ipsum control key changed.');
  equal(validatedKey.mask.filter(Boolean).length, 256, 'Known Lorem ipsum control key capacity changed.');

  const payload = engine.encryptBinary(sourceBits, validatedKey);
  engine.validatePackage(payload, validatedKey);
  equal(payload.originalBitLength, 992, 'Known Lorem ipsum package original length changed.');
  equal(payload.blockCount, 4, 'Known Lorem ipsum package block count changed.');
  equal(payload.ciphertext.length, 1024, 'Known Lorem ipsum ciphertext length changed.');
  equal(payload.checksum, '871d6edf', 'Known Lorem ipsum package checksum changed.');
  equal(sha256(payload.ciphertext), '27d410d413fd6cf08d4f0c0a0640902d15cd763cf5ade44babb1470a06e2c72a', 'Known Lorem ipsum ciphertext changed.');

  const recoveredBits = engine.decryptBinary(payload, validatedKey);
  const recoveredBytes = bitsToBytes(recoveredBits);
  equal(recoveredBits, sourceBits, 'Known Lorem ipsum binary did not recover exactly.');
  deepEqual(recoveredBytes, sourceBytes, 'Known Lorem ipsum bytes did not recover exactly.');
  equal(recoveredBytes.toString('utf8'), sourceText, 'Known Lorem ipsum text did not recover exactly.');
  roundTrips += 1;

  knownTextControl = {
    document: 'data/shadowrun/binary-cube/lorem-ipsum-control.txt',
    key: 'data/shadowrun/binary-cube/lorem-ipsum-control-key.json',
    model: `${STANDARD_TEST_GRID_SIZE}x${STANDARD_TEST_GRID_SIZE}`,
    keyId: validatedKey.keyId,
    sourceBytes: sourceBytes.length,
    sourceBits: sourceBits.length,
    payloadCapacity: payload.payloadCapacity,
    blockCount: payload.blockCount,
    ciphertextBits: payload.ciphertext.length,
    ciphertextSha256: sha256(payload.ciphertext),
    packageChecksum: payload.checksum,
    exactRecovery: true
  };
}

function validateLegacyFixtureAndIntegration() {
  const receiptPath = path.join(root, 'source-page-references/shadowrun-binary-cube-encryption.source.json');
  const receipt = JSON.parse(fs.readFileSync(receiptPath, 'utf8'));
  const fixture = receipt.legacySpreadsheetFixture;
  equal(fixture.gridSize, DEMONSTRATION_GRID_SIZE, 'Legacy spreadsheet fixture must preserve the 4x4 demonstration grid size.');
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
validateKnownLoremIpsumControl();
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
    minimumGridSize: MIN_GRID_SIZE,
    demonstrationGridSize: DEMONSTRATION_GRID_SIZE,
    standardTestGridSize: STANDARD_TEST_GRID_SIZE,
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
    knownTextControl,
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
  console.log(`Minimum grid size: ${MIN_GRID_SIZE}x${MIN_GRID_SIZE}`);
  console.log(`Demonstration grid size: ${DEMONSTRATION_GRID_SIZE}x${DEMONSTRATION_GRID_SIZE}`);
  console.log(`Standard test grid size: ${STANDARD_TEST_GRID_SIZE}x${STANDARD_TEST_GRID_SIZE}`);
  console.log(`Recommended sizes: ${summary.recommendedGridSizesCovered.join(', ')}`);
  console.log(`Directed legal face pairs: ${summary.directedFacePairsCovered}`);
  console.log(`Known Lorem ipsum control: ${knownTextControl.exactRecovery ? 'exact recovery' : 'failed'}`);
}
