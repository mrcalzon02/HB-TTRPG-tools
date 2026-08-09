#!/usr/bin/env python3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

def read(path):
    return (ROOT / path).read_text(encoding='utf-8')

def write(path, text):
    (ROOT / path).write_text(text, encoding='utf-8')

def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f'{label}: expected exactly one match, found {count}')
    return text.replace(old, new, 1)

# Canonical package checksum remains the accepted V0 corruption checksum. The later
# SHA-256 key identity is validated independently and must not rewrite historical
# package checksums. Accept the short-lived digest-aware checksum for imports.
path = 'shadowrun-binary-cube-engine.js'
text = read(path)
old = """  function checksumMaterial(payload) {
    return JSON.stringify({
      format: payload.format,
      schemaVersion: payload.schemaVersion,
      algorithm: payload.algorithm,
      securityClassification: payload.securityClassification,
      keyId: payload.keyId,
      keyDigestType: payload.keyDigestType,
      keyDigest: payload.keyDigest,
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
"""
new = """  function checksumMaterial(payload) {
    // V0/V1 package checksum contract. SHA-256 key identity is intentionally
    // validated separately so additive identity metadata does not invalidate
    // accepted historical packages or secure exports.
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

  function digestAwareChecksumMaterial(payload) {
    // Compatibility reader for the short-lived additive-key-identity checksum
    // profile emitted before the V0 checksum boundary was restored.
    return JSON.stringify({
      format: payload.format,
      schemaVersion: payload.schemaVersion,
      algorithm: payload.algorithm,
      securityClassification: payload.securityClassification,
      keyId: payload.keyId,
      keyDigestType: payload.keyDigestType,
      keyDigest: payload.keyDigest,
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

  function digestAwarePackageChecksum(payload) {
    return hex32(digestAwareChecksumMaterial(payload));
  }
"""
text = replace_once(text, old, new, 'engine checksum material')
old = """    const expectedChecksum = packageChecksum(normalized);
    if (payload.checksum !== expectedChecksum) fail('Package checksum validation failed. The ciphertext or framing metadata may be corrupted.');
    normalized.checksum = expectedChecksum;
    return normalized;
"""
new = """    const expectedChecksum = packageChecksum(normalized);
    const digestAwareChecksum = digestAwarePackageChecksum(normalized);
    if (payload.checksum !== expectedChecksum && payload.checksum !== digestAwareChecksum) fail('Package checksum validation failed. The ciphertext or framing metadata may be corrupted.');
    // Preserve the accepted input checksum on validation. New packages emit the
    // stable V0 checksum; the digest-aware value remains import-only compatibility.
    normalized.checksum = String(payload.checksum);
    return normalized;
"""
text = replace_once(text, old, new, 'engine compatibility checksum validation')
write(path, text)

# Secure exports deliberately omit public key/framing metadata. Reconstruct strong
# key identity from the supplied key so both stable and transient package checksums
# can be validated without exposing that identity in the secure-export artifact.
path = 'shadowrun-binary-cube-secure-export.js'
text = read(path)
old = """      securityClassification: Engine.constants.SECURITY_CLASSIFICATION,
      keyId: key.keyId,
      gridSize: key.gridSize,
"""
new = """      securityClassification: Engine.constants.SECURITY_CLASSIFICATION,
      keyId: key.keyId,
      keyDigestType: key.keyDigestType,
      keyDigest: key.keyDigest,
      gridSize: key.gridSize,
"""
text = replace_once(text, old, new, 'secure export reconstructed key identity')
write(path, text)

# V0 golden evidence is a historical transform/package contract. Project additive
# SHA-256 identity metadata away before hashing so the old evidence continues to
# prove transformation stability, while current runtime assertions verify the
# strong identity exists and validates.
path = 'scripts/validate-binary-cube-baseline.mjs'
text = read(path)
needle = """function diagnosticSummary(key) {
"""
insert = """function legacyIdentityProjection(value) {
  const projected = JSON.parse(JSON.stringify(value));
  delete projected.keyDigestType;
  delete projected.keyDigest;
  return projected;
}

function diagnosticSummary(key) {
"""
text = replace_once(text, needle, insert, 'baseline legacy projection helper')
old = """  const key = Engine.createKey(options);
  const packageObject = Engine.encryptBinary(definition.bits, key);
  const recoveredBits = Engine.decryptBinary(packageObject, key);
  assert.equal(recoveredBits, definition.bits, `${definition.id} failed its round trip.`);
"""
new = """  const key = Engine.createKey(options);
  const packageObject = Engine.encryptBinary(definition.bits, key);
  const recoveredBits = Engine.decryptBinary(packageObject, key);
  assert.equal(recoveredBits, definition.bits, `${definition.id} failed its round trip.`);
  assert.equal(key.keyDigestType, Engine.constants.KEY_DIGEST_TYPE, `${definition.id} is missing the current SHA-256 key identity type.`);
  assert.match(key.keyDigest, /^[0-9a-f]{64}$/, `${definition.id} is missing the current SHA-256 key identity.`);
  assert.equal(packageObject.keyDigestType, key.keyDigestType, `${definition.id} package key identity type drifted.`);
  assert.equal(packageObject.keyDigest, key.keyDigest, `${definition.id} package key identity drifted.`);
"""
text = replace_once(text, old, new, 'baseline strong identity assertions')
old = """    key,
    pointCoordinates,
"""
new = """    key: legacyIdentityProjection(key),
    pointCoordinates,
"""
text = replace_once(text, old, new, 'baseline key evidence projection')
old = """    package: packageObject,
    recoveredBits,
"""
new = """    package: legacyIdentityProjection(packageObject),
    recoveredBits,
"""
text = replace_once(text, old, new, 'baseline package evidence projection')
# Add explicit acceptance test for the transient digest-aware checksum profile.
needle = """function validateNegativeCases(evidence) {
"""
insert = """function fnv1a32Text(value) {
  let hash = 0x811c9dc5;
  const text = String(value ?? '');
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

function transientDigestAwareChecksum(payload) {
  return fnv1a32Text(JSON.stringify({
    format: payload.format,
    schemaVersion: payload.schemaVersion,
    algorithm: payload.algorithm,
    securityClassification: payload.securityClassification,
    keyId: payload.keyId,
    keyDigestType: payload.keyDigestType,
    keyDigest: payload.keyDigest,
    gridSize: payload.gridSize,
    inputFace: payload.inputFace,
    outputFace: payload.outputFace,
    inputQuarterTurns: payload.inputQuarterTurns,
    outputQuarterTurns: payload.outputQuarterTurns,
    originalBitLength: payload.originalBitLength,
    payloadCapacity: payload.payloadCapacity,
    blockCount: payload.blockCount,
    ciphertext: payload.ciphertext
  }));
}

function validateChecksumCompatibility() {
  const definition = DEFINITIONS[0];
  const key = Engine.createKey(optionsFrom(definition));
  const stablePackage = Engine.encryptBinary(definition.bits, key);
  assert.equal(stablePackage.checksum, GOLDEN.vectors[definition.id].checksum, 'New packages must retain the accepted V0 corruption checksum.');
  const transientPackage = { ...stablePackage, checksum: transientDigestAwareChecksum(stablePackage) };
  assert.notEqual(transientPackage.checksum, stablePackage.checksum, 'Compatibility fixture must exercise the transient digest-aware checksum profile.');
  assert.equal(Engine.decryptBinary(transientPackage, key), definition.bits, 'Transient digest-aware packages must remain import-compatible.');
}

function validateNegativeCases(evidence) {
"""
text = replace_once(text, needle, insert, 'baseline checksum compatibility test')
needle = """  validateGoldenEvidence(evidence);
  validateGeometryContracts(evidence);
"""
replacement = """  validateGoldenEvidence(evidence);
  validateChecksumCompatibility();
  validateGeometryContracts(evidence);
"""
text = replace_once(text, needle, replacement, 'baseline compatibility invocation')
write(path, text)

print('Applied Binary Cube stable-checksum and secure-export compatibility repair.')
