import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { webcrypto } from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

if (!globalThis.crypto) Object.defineProperty(globalThis, 'crypto', { value: webcrypto });

const scriptPath = fileURLToPath(import.meta.url);
const root = path.resolve(path.dirname(scriptPath), '..');
const require = createRequire(import.meta.url);
const engine = require(path.join(root, 'shadowrun-binary-cube-engine.js'));
const auth = require(path.join(root, 'shadowrun-binary-cube-auth.js'));

let assertions = 0;

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

async function expectReject(callback, pattern, message) {
  assertions += 1;
  await assert.rejects(callback, pattern, message);
}

const passphrase = 'correct horse battery staple 2049';
const wrongPassphrase = 'incorrect horse battery staple 2049';
const key = engine.createKey({
  gridSize: 4,
  seed: 'authenticated-envelope-validation',
  inputFace: 'left',
  outputFace: 'top',
  inputQuarterTurns: 3,
  outputQuarterTurns: 1,
  maskDensity: 0.75
});
const packageObject = engine.encryptBinary('010010000110100100101101001011011', key);
const deterministicOptions = {
  iterations: 100000,
  saltBytes: new Uint8Array(16).fill(0x11),
  ivBytes: new Uint8Array(12).fill(0x22)
};

const envelope = await auth.sealPackage(packageObject, passphrase, deterministicOptions);
const validated = auth.validateEnvelope(envelope);
const summary = auth.inspectEnvelope(envelope);
const opened = await auth.openEnvelope(envelope, passphrase);

check(Object.isFrozen(auth), 'Authenticated-envelope API must be frozen.');
equal(envelope.format, auth.constants.ENVELOPE_FORMAT, 'Envelope format identifier is incorrect.');
equal(envelope.schemaVersion, auth.constants.ENVELOPE_SCHEMA_VERSION, 'Envelope schema version is incorrect.');
equal(envelope.cubeKeyId, key.keyId, 'Envelope did not preserve the Binary Cube key identifier.');
equal(envelope.kdf.name, 'PBKDF2', 'Envelope did not use PBKDF2.');
equal(envelope.kdf.hash, 'SHA-256', 'Envelope did not use SHA-256 for PBKDF2.');
equal(envelope.kdf.iterations, 100000, 'Envelope did not preserve the requested validation iteration count.');
equal(envelope.cipher.name, 'AES-GCM', 'Envelope did not use AES-GCM.');
equal(envelope.cipher.keyLength, 256, 'Envelope did not use a 256-bit AES key.');
equal(envelope.cipher.tagLength, 128, 'Envelope did not use a 128-bit authentication tag.');
equal(validated._decoded.salt.length, 16, 'Envelope salt length is incorrect.');
equal(validated._decoded.iv.length, 12, 'Envelope initialization-vector length is incorrect.');
check(validated._decoded.ciphertext.length > 16, 'Envelope ciphertext must include content plus an authentication tag.');
equal(summary.cubeKeyId, key.keyId, 'Envelope inspection reported the wrong key identifier.');
deepEqual(opened, packageObject, 'Authenticated envelope did not recover the exact Binary Cube package.');

const serialized = JSON.stringify(envelope);
check(!serialized.includes(passphrase), 'Envelope serialized the passphrase.');
check(!serialized.includes(key.seed), 'Envelope exposed the Binary Cube key seed.');
check(!serialized.includes(packageObject.ciphertext), 'Envelope exposed the unwrapped Binary Cube ciphertext string.');

const deterministicAgain = await auth.sealPackage(packageObject, passphrase, deterministicOptions);
deepEqual(deterministicAgain, envelope, 'Fixed salt and IV did not produce a stable validation fixture.');
const randomFirst = await auth.sealPackage(packageObject, passphrase, { iterations: 100000 });
const randomSecond = await auth.sealPackage(packageObject, passphrase, { iterations: 100000 });
check(randomFirst.kdf.salt !== randomSecond.kdf.salt, 'Independent envelopes reused the same random salt.');
check(randomFirst.cipher.iv !== randomSecond.cipher.iv, 'Independent envelopes reused the same random initialization vector.');
check(randomFirst.ciphertext !== randomSecond.ciphertext, 'Independent envelopes produced identical ciphertext.');

auth.validateEnvelope(randomFirst);
auth.validateEnvelope(randomSecond);
await expectReject(() => auth.openEnvelope(envelope, wrongPassphrase), /verification failed/i, 'Wrong passphrase must fail authenticated decryption.');

const tamperedCiphertext = structuredClone(envelope);
tamperedCiphertext.ciphertext = `${tamperedCiphertext.ciphertext[0] === 'A' ? 'B' : 'A'}${tamperedCiphertext.ciphertext.slice(1)}`;
await expectReject(() => auth.openEnvelope(tamperedCiphertext, passphrase), /verification failed/i, 'Ciphertext modification must fail authenticated decryption.');

const tamperedKeyId = structuredClone(envelope);
tamperedKeyId.cubeKeyId = 'tampered-key-id';
await expectReject(() => auth.openEnvelope(tamperedKeyId, passphrase), /verification failed/i, 'Associated key-identifier modification must fail authenticated decryption.');

const tamperedIterations = structuredClone(envelope);
tamperedIterations.kdf.iterations += 1;
await expectReject(() => auth.openEnvelope(tamperedIterations, passphrase), /verification failed/i, 'Associated KDF metadata modification must fail authenticated decryption.');

const unsupportedSchema = structuredClone(envelope);
unsupportedSchema.schemaVersion = '9.9.9';
assertions += 1;
assert.throws(() => auth.validateEnvelope(unsupportedSchema), /unsupported authenticated envelope schema/i);

const malformedSalt = structuredClone(envelope);
malformedSalt.kdf.salt = '!!!!';
assertions += 1;
assert.throws(() => auth.validateEnvelope(malformedSalt), /not valid Base64/i);

const shortSalt = structuredClone(envelope);
shortSalt.kdf.salt = 'AAAA';
assertions += 1;
assert.throws(() => auth.validateEnvelope(shortSalt), /exactly 16 bytes/i);

const unsupportedCipher = structuredClone(envelope);
unsupportedCipher.cipher.name = 'AES-CBC';
assertions += 1;
assert.throws(() => auth.validateEnvelope(unsupportedCipher), /cipher profile is unsupported/i);

await expectReject(() => auth.sealPackage(packageObject, 'too short'), /at least 12 characters/i, 'Short passphrases must be rejected.');
await expectReject(() => auth.sealPackage({ format: 'wrong', keyId: key.keyId }, passphrase), /accepts only Binary Cube package/i, 'Non-Binary-Cube packages must be rejected.');
await expectReject(() => auth.sealPackage(packageObject, passphrase, { iterations: 99999 }), /iterations must be an integer/i, 'Iteration counts below the supported floor must be rejected.');
await expectReject(() => auth.sealPackage(packageObject, passphrase, { saltBytes: new Uint8Array(15) }), /exactly 16 bytes/i, 'Invalid explicit salt lengths must be rejected.');
await expectReject(() => auth.sealPackage(packageObject, passphrase, { ivBytes: new Uint8Array(11) }), /exactly 12 bytes/i, 'Invalid explicit IV lengths must be rejected.');

const ui = fs.readFileSync(path.join(root, 'shadowrun-binary-cube-auth-ui.js'), 'utf8');
const entry = fs.readFileSync(path.join(root, 'shadowrun-entry.js'), 'utf8');
check(ui.includes('window.ShadowrunBinaryCubeAuth'), 'Authenticated-envelope browser controls must consume the authentication API.');
check(ui.includes('passphrase is used only in memory'), 'Authentication interface must state the passphrase storage boundary.');
check(entry.includes('shadowrun-binary-cube-auth.js'), 'Shadowrun loader must load the authentication engine.');
check(entry.includes('shadowrun-binary-cube-auth-ui.js'), 'Shadowrun loader must load the authentication interface.');

const result = {
  receiptType: 'shadowrunBinaryCubeAuthValidationSummary',
  schemaVersion: auth.constants.ENVELOPE_SCHEMA_VERSION,
  valid: true,
  assertions,
  profile: {
    kdf: `${auth.constants.KDF_NAME}-${auth.constants.KDF_HASH}`,
    defaultIterations: auth.constants.DEFAULT_ITERATIONS,
    cipher: `${auth.constants.CIPHER_NAME}-${auth.constants.KEY_LENGTH}`,
    tagLength: auth.constants.TAG_LENGTH,
    saltBytes: auth.constants.SALT_BYTES,
    ivBytes: auth.constants.IV_BYTES
  },
  validatedKeyId: key.keyId,
  deterministicFixtureCiphertextBytes: validated._decoded.ciphertext.length
};

const outputPath = process.argv[2] ? path.resolve(process.argv[2]) : null;
if (outputPath) {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(result, null, 2)}\n`);
}

console.log('Shadowrun Binary Cube authenticated-envelope validation passed.');
console.log(`Assertions: ${assertions}`);
console.log(`Profile: ${result.profile.kdf} + ${result.profile.cipher}`);
