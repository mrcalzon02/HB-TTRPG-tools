import assert from 'node:assert/strict';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const scriptPath = fileURLToPath(import.meta.url);
const root = path.resolve(path.dirname(scriptPath), '..');
const require = createRequire(import.meta.url);
const engine = require(path.join(root, 'shadowrun-binary-cube-engine.js'));
const secureExport = require(path.join(root, 'shadowrun-binary-cube-secure-export.js'));

const key = engine.createKey({
  gridSize: 12,
  seed: 'secure-export-validation',
  inputFace: 'top',
  outputFace: 'front',
  inputQuarterTurns: 1,
  outputQuarterTurns: 3,
  maskDensity: 0.75
});
const sourceBits = Array.from({ length: 5621 }, (_, index) => ((index * 13 + Math.floor(index / 5)) % 2 ? '1' : '0')).join('');
const internalPackage = engine.encryptBinary(sourceBits, key);
const exported = secureExport.createSecureExport(internalPackage, key, engine);
const serialized = JSON.stringify(exported);

for (const forbidden of [
  'keyId',
  'gridSize',
  'inputFace',
  'outputFace',
  'inputQuarterTurns',
  'outputQuarterTurns',
  'originalBitLength',
  'payloadCapacity',
  'blockCount'
]) {
  assert.equal(Object.hasOwn(exported, forbidden), false, `Secure export must not expose ${forbidden}.`);
  assert.equal(serialized.includes(`"${forbidden}"`), false, `Serialized secure export must not contain ${forbidden}.`);
}

assert.equal(exported.format, secureExport.constants.EXPORT_FORMAT);
assert.ok(exported.ciphertext.length > 0);
assert.ok(exported.framingCiphertext.length > 0);
secureExport.validateSecureExport(exported);

const restoredPackage = secureExport.expandSecureExport(exported, key, engine);
assert.equal(engine.decryptBinary(restoredPackage, key), sourceBits, 'Secure export must round-trip exactly with its matching key.');
assert.equal(restoredPackage.originalBitLength, sourceBits.length, 'Original bit length must be recovered from encrypted framing.');
assert.equal(restoredPackage.blockCount, internalPackage.blockCount, 'Block count must be inferred rather than exported.');
assert.equal(restoredPackage.payloadCapacity, internalPackage.payloadCapacity, 'Payload capacity must come from the key rather than the export.');

const damaged = structuredClone(exported);
damaged.ciphertext = `${damaged.ciphertext[0] === '0' ? '1' : '0'}${damaged.ciphertext.slice(1)}`;
assert.throws(() => secureExport.validateSecureExport(damaged), /corruption validation failed/i, 'Ciphertext damage must fail the secure export checksum.');

const wrongKey = engine.createKey({
  gridSize: 12,
  seed: 'secure-export-wrong-key',
  inputFace: 'top',
  outputFace: 'front',
  inputQuarterTurns: 1,
  outputQuarterTurns: 3,
  maskDensity: 0.75
});
assert.throws(() => secureExport.expandSecureExport(exported, wrongKey, engine), /invalid|checksum|match|align|length/i, 'A nonmatching key must not reconstruct the package.');

console.log(JSON.stringify({
  secureExportFormat: exported.format,
  forbiddenFieldsRemoved: true,
  sourceBits: sourceBits.length,
  ciphertextBits: exported.ciphertext.length,
  framingCiphertextBits: exported.framingCiphertext.length,
  exactRecovery: true
}, null, 2));
