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
const manifestPath = path.join(root, 'data/shadowrun/binary-cube/text-control-manifest.json');
const referencePath = path.join(root, 'data/shadowrun/binary-cube/text-control-reference-summary.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const reference = JSON.parse(fs.readFileSync(referencePath, 'utf8'));
const decoder = new TextDecoder('utf-8', { fatal: true });

let assertions = 0;
let roundTrips = 0;
let sourceBytes = 0;
let encryptedBits = 0;
const documentResults = [];
const keyResults = [];
const matrixResults = [];

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

function digest(bytes) {
  return crypto.createHash('sha256').update(bytes).digest('hex');
}

function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function bytesToBits(bytes) {
  return [...bytes].map(byte => byte.toString(2).padStart(8, '0')).join('');
}

function bitsToBytes(bits) {
  if (typeof bits !== 'string' || /[^01]/.test(bits)) throw new Error('Recovered binary must contain only 0 and 1.');
  if (bits.length % 8 !== 0) throw new Error('Recovered text binary must be aligned to complete bytes.');
  return Buffer.from(Array.from({ length: bits.length / 8 }, (_, index) => Number.parseInt(bits.slice(index * 8, index * 8 + 8), 2)));
}

function expectedBlocks(bitLength, payloadCapacity) {
  return Math.ceil(bitLength / payloadCapacity);
}

check(manifest.receiptType === 'shadowrunBinaryCubeTextControlManifest', 'Text-control receipt type must be recognized.');
equal(manifest.schemaVersion, '0.1.0', 'Text-control manifest schema must remain pinned.');
equal(manifest.encoding, 'UTF-8', 'Text-control encoding must be UTF-8.');
equal(manifest.lineEndingPolicy, 'LF only', 'Text-control line endings must be LF-only.');
check(manifest.terminalLineFeedRequired === true, 'Every control document must require a terminal line feed.');
check(Array.isArray(manifest.documents) && manifest.documents.length === 5, 'Exactly five initial text control documents are required.');
check(Array.isArray(manifest.knownControlKeys) && manifest.knownControlKeys.length === 8, 'Exactly eight known control keys are required.');
equal(manifest.batchPolicy.expectedRoundTrips, manifest.documents.length * manifest.knownControlKeys.length, 'Manifest round-trip count must equal the full document-by-key matrix.');

check(reference.receiptType === 'shadowrunBinaryCubeTextControlReferenceSummary', 'Reference execution receipt type must be recognized.');
equal(reference.schemaVersion, manifest.schemaVersion, 'Reference execution schema must match the control manifest.');
equal(reference.classification, 'independent-reference-execution-not-main-ci-evidence', 'Reference execution must not be misclassified as main CI evidence.');
equal(reference.documentCount, manifest.documents.length, 'Reference document count must match the manifest.');
equal(reference.controlKeyCount, manifest.knownControlKeys.length, 'Reference key count must match the manifest.');
equal(reference.roundTrips, manifest.batchPolicy.expectedRoundTrips, 'Reference round-trip count must match the full matrix.');

const documents = new Map();
const documentIds = new Set();
const documentPaths = new Set();
for (const document of manifest.documents) {
  check(typeof document.id === 'string' && document.id.length > 0, 'Every document must have an identifier.');
  check(!documentIds.has(document.id), `Duplicate document identifier: ${document.id}.`);
  documentIds.add(document.id);
  check(typeof document.path === 'string' && document.path.startsWith('data/shadowrun/binary-cube/text-controls/'), `Document path is outside the control directory: ${document.path}.`);
  check(!documentPaths.has(document.path), `Duplicate document path: ${document.path}.`);
  documentPaths.add(document.path);

  const absolutePath = path.join(root, document.path);
  check(fs.existsSync(absolutePath), `Control document is missing: ${document.path}.`);
  const bytes = fs.readFileSync(absolutePath);
  check(!bytes.includes(13), `${document.id} contains a carriage return; LF-only controls are required.`);
  check(bytes.length > 0 && bytes.at(-1) === 10, `${document.id} must end in a line feed.`);
  equal(bytes.length, document.expectedUtf8Bytes, `${document.id} UTF-8 byte length changed.`);
  equal(bytes.length * 8, document.expectedBitLength, `${document.id} bit length changed.`);
  equal(digest(bytes), document.sha256, `${document.id} SHA-256 changed.`);
  const text = decoder.decode(bytes);
  deepEqual(Buffer.from(text, 'utf8'), bytes, `${document.id} UTF-8 decode and re-encode changed bytes.`);

  sourceBytes += bytes.length;
  documents.set(document.id, { ...document, bytes, bits: bytesToBits(bytes), text });
  documentResults.push({
    id: document.id,
    utf8Bytes: bytes.length,
    bitLength: bytes.length * 8,
    sha256: document.sha256
  });
}

const keys = new Map();
const keyProfileIds = new Set();
const expectedKeyIds = new Set();
for (const profile of manifest.knownControlKeys) {
  check(typeof profile.id === 'string' && profile.id.length > 0, 'Every control key profile must have an identifier.');
  check(!keyProfileIds.has(profile.id), `Duplicate control key profile: ${profile.id}.`);
  keyProfileIds.add(profile.id);
  check(!expectedKeyIds.has(profile.expectedKeyId), `Duplicate expected control key identifier: ${profile.expectedKeyId}.`);
  expectedKeyIds.add(profile.expectedKeyId);
  check(engine.constants.RECOMMENDED_GRID_SIZES.includes(profile.options.gridSize), `${profile.id} must use a recommended grid size.`);

  const key = engine.createKey(profile.options);
  const duplicate = engine.createKey(profile.options);
  equal(key.keyId, profile.expectedKeyId, `${profile.id} generated an unexpected key identifier.`);
  equal(key.mask.filter(Boolean).length, profile.expectedPayloadCapacity, `${profile.id} generated an unexpected payload capacity.`);
  deepEqual(duplicate, key, `${profile.id} was not deterministic.`);
  equal(engine.validateKey(JSON.parse(JSON.stringify(key))).keyId, key.keyId, `${profile.id} failed serialized key validation.`);
  check(engine.projectionDiagnostics(key).collisionFree, `${profile.id} did not produce collision-free face projections.`);

  keys.set(profile.id, key);
  keyResults.push({
    id: profile.id,
    keyId: key.keyId,
    gridSize: key.gridSize,
    payloadCapacity: key.mask.filter(Boolean).length,
    inputFace: key.inputFace,
    outputFace: key.outputFace
  });
}

for (const document of documents.values()) {
  for (const profile of manifest.knownControlKeys) {
    const key = keys.get(profile.id);
    const packageOne = engine.encryptBinary(document.bits, key);
    const packageTwo = engine.encryptBinary(document.bits, key);
    const serializedPackage = JSON.stringify(packageOne);
    const parsedPackage = JSON.parse(serializedPackage);
    const validatedPackage = engine.validatePackage(parsedPackage, key);
    const recoveredBits = engine.decryptBinary(validatedPackage, key);
    const recoveredBytes = bitsToBytes(recoveredBits);
    const recoveredText = decoder.decode(recoveredBytes);

    equal(document.bits.length, document.expectedBitLength, `${document.id} source binary length changed before ${profile.id}.`);
    equal(packageOne.keyId, profile.expectedKeyId, `${document.id} package used the wrong key identifier under ${profile.id}.`);
    equal(packageOne.originalBitLength, document.expectedBitLength, `${document.id} original bit length was not framed under ${profile.id}.`);
    equal(packageOne.payloadCapacity, profile.expectedPayloadCapacity, `${document.id} payload capacity changed under ${profile.id}.`);
    equal(packageOne.blockCount, expectedBlocks(document.expectedBitLength, profile.expectedPayloadCapacity), `${document.id} block count changed under ${profile.id}.`);
    deepEqual(packageTwo, packageOne, `${document.id} encryption was not deterministic under ${profile.id}.`);
    deepEqual(parsedPackage, packageOne, `${document.id} package JSON serialization changed data under ${profile.id}.`);
    equal(validatedPackage.checksum, packageOne.checksum, `${document.id} package checksum changed during validation under ${profile.id}.`);
    equal(recoveredBits, document.bits, `${document.id} binary was not recovered exactly under ${profile.id}.`);
    deepEqual(recoveredBytes, document.bytes, `${document.id} bytes were not recovered exactly under ${profile.id}.`);
    equal(recoveredText, document.text, `${document.id} text was not recovered exactly under ${profile.id}.`);
    equal(digest(recoveredBytes), document.sha256, `${document.id} recovered SHA-256 changed under ${profile.id}.`);

    encryptedBits += packageOne.ciphertext.length;
    roundTrips += 1;
    matrixResults.push({
      documentId: document.id,
      controlKeyId: profile.id,
      keyId: key.keyId,
      sourceBits: document.bits.length,
      payloadCapacity: packageOne.payloadCapacity,
      blockCount: packageOne.blockCount,
      ciphertextBits: packageOne.ciphertext.length,
      packageChecksum: packageOne.checksum,
      recoveredSha256: digest(recoveredBytes),
      exactRecovery: true
    });
  }
}

equal(roundTrips, manifest.batchPolicy.expectedRoundTrips, 'Executed text-control round trips did not match the manifest matrix.');
equal(matrixResults.length, roundTrips, 'Every round trip must produce one evidence row.');
check(matrixResults.every(result => result.exactRecovery), 'Every text-control matrix row must recover exactly.');
equal(sourceBytes, reference.sourceBytesPerCorpusPass, 'Corpus source byte total changed from the independent reference execution.');
equal(sourceBytes * 8, reference.sourceBitsPerCorpusPass, 'Corpus source bit total changed from the independent reference execution.');
equal(encryptedBits, reference.encryptedBits, 'Aggregate ciphertext bit total changed from the independent reference execution.');
equal(roundTrips, reference.exactByteRecoveries, 'Exact byte recovery count changed from the independent reference execution.');
equal(roundTrips, reference.exactTextRecoveries, 'Exact text recovery count changed from the independent reference execution.');
equal(digest(Buffer.from(canonicalJson(matrixResults), 'utf8')), reference.matrixCanonicalSha256, 'The full deterministic control matrix changed from the independent reference execution.');

const summary = {
  receiptType: 'shadowrunBinaryCubeTextControlValidationSummary',
  schemaVersion: manifest.schemaVersion,
  valid: true,
  encoding: manifest.encoding,
  documents: documentResults,
  knownControlKeys: keyResults,
  documentCount: documentResults.length,
  controlKeyCount: keyResults.length,
  assertions,
  roundTrips,
  sourceBytes,
  sourceBitsPerFullCorpusPass: sourceBytes * 8,
  encryptedBits,
  exactByteRecoveries: roundTrips,
  exactTextRecoveries: roundTrips,
  matrixCanonicalSha256: digest(Buffer.from(canonicalJson(matrixResults), 'utf8')),
  matrix: matrixResults
};

const outputPath = process.argv[2] ? path.resolve(process.argv[2]) : null;
if (outputPath) {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(summary, null, 2)}\n`);
}

console.log('Shadowrun Binary Cube text-control validation passed.');
console.log(`Documents: ${summary.documentCount}`);
console.log(`Known control keys: ${summary.controlKeyCount}`);
console.log(`Assertions: ${assertions}`);
console.log(`Exact UTF-8 round trips: ${roundTrips}`);
console.log(`Source bytes per corpus pass: ${sourceBytes}`);
console.log(`Ciphertext bits produced: ${encryptedBits}`);
console.log(`Matrix SHA-256: ${summary.matrixCanonicalSha256}`);
