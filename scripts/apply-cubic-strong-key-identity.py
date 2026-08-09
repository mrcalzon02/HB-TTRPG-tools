#!/usr/bin/env python3
from pathlib import Path


def replace_once(path, old, new, label):
    text = Path(path).read_text()
    if new in text and old not in text:
        return False
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected exactly one old fragment, found {count}')
    Path(path).write_text(text.replace(old, new, 1))
    return True


engine = 'shadowrun-binary-cube-engine.js'
cubic = 'binary-cube-cubic-decryptor-engine.js'
ui = 'binary-cube-cubic-decryptor.js'
validator = 'scripts/validate-binary-cube-cubic-decryptor.mjs'

replace_once(engine,
"  const CHECKSUM_TYPE = 'fnv1a32-corruption-detection-only';\n  const TRACE_FORMAT = 'hb-ttrpg-shadowrun-binary-cube-transformation-trace';",
"  const CHECKSUM_TYPE = 'fnv1a32-corruption-detection-only';\n  const KEY_DIGEST_TYPE = 'sha256-canonical-key-material-v1';\n  const TRACE_FORMAT = 'hb-ttrpg-shadowrun-binary-cube-transformation-trace';",
'canonical digest constant')

replace_once(engine,
"""  function keyFingerprint(key) {
    const material = [
      KEY_FORMAT,
      SCHEMA_VERSION,
      key.algorithm,
      key.gridSize,
      key.seed,
      key.inputFace,
      key.outputFace,
      normalizeQuarterTurns(key.inputQuarterTurns),
      normalizeQuarterTurns(key.outputQuarterTurns),
      key.rowPermutation.join(','),
      key.columnPermutation.join(','),
      key.depthPermutation.join(','),
      key.mask.map(Boolean).map(value => value ? '1' : '0').join(''),
      key.paddingMode
    ].join('|');
    return hex32(material);
  }
""",
"""  const SHA256_CONSTANTS = Object.freeze([
    0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,
    0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,
    0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,
    0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,
    0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,
    0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,
    0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,
    0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2
  ]);

  function utf8Bytes(value) {
    const text = String(value ?? '');
    if (typeof TextEncoder !== 'undefined') return new TextEncoder().encode(text);
    if (typeof Buffer !== 'undefined') return Uint8Array.from(Buffer.from(text, 'utf8'));
    const encoded = encodeURIComponent(text);
    const bytes = [];
    for (let index = 0; index < encoded.length; index += 1) {
      if (encoded[index] === '%') {
        bytes.push(parseInt(encoded.slice(index + 1, index + 3), 16));
        index += 2;
      } else bytes.push(encoded.charCodeAt(index));
    }
    return Uint8Array.from(bytes);
  }

  function rotateRight32(value, count) {
    return (value >>> count) | (value << (32 - count));
  }

  function sha256Hex(value) {
    const input = utf8Bytes(value);
    const bitLength = input.length * 8;
    const totalLength = Math.ceil((input.length + 9) / 64) * 64;
    const bytes = new Uint8Array(totalLength);
    bytes.set(input);
    bytes[input.length] = 0x80;
    const high = Math.floor(bitLength / 0x100000000) >>> 0;
    const low = bitLength >>> 0;
    for (let index = 0; index < 4; index += 1) {
      bytes[totalLength - 8 + index] = (high >>> (24 - index * 8)) & 0xff;
      bytes[totalLength - 4 + index] = (low >>> (24 - index * 8)) & 0xff;
    }
    const hash = [0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19];
    const words = new Uint32Array(64);
    for (let offset = 0; offset < bytes.length; offset += 64) {
      for (let index = 0; index < 16; index += 1) {
        const base = offset + index * 4;
        words[index] = ((bytes[base] << 24) | (bytes[base + 1] << 16) | (bytes[base + 2] << 8) | bytes[base + 3]) >>> 0;
      }
      for (let index = 16; index < 64; index += 1) {
        const w15 = words[index - 15];
        const w2 = words[index - 2];
        const sigma0 = rotateRight32(w15, 7) ^ rotateRight32(w15, 18) ^ (w15 >>> 3);
        const sigma1 = rotateRight32(w2, 17) ^ rotateRight32(w2, 19) ^ (w2 >>> 10);
        words[index] = (words[index - 16] + sigma0 + words[index - 7] + sigma1) >>> 0;
      }
      let [a,b,c,d,e,f,g,h] = hash;
      for (let index = 0; index < 64; index += 1) {
        const sum1 = rotateRight32(e, 6) ^ rotateRight32(e, 11) ^ rotateRight32(e, 25);
        const choose = (e & f) ^ (~e & g);
        const temp1 = (h + sum1 + choose + SHA256_CONSTANTS[index] + words[index]) >>> 0;
        const sum0 = rotateRight32(a, 2) ^ rotateRight32(a, 13) ^ rotateRight32(a, 22);
        const majority = (a & b) ^ (a & c) ^ (b & c);
        const temp2 = (sum0 + majority) >>> 0;
        h = g; g = f; f = e; e = (d + temp1) >>> 0; d = c; c = b; b = a; a = (temp1 + temp2) >>> 0;
      }
      hash[0] = (hash[0] + a) >>> 0;
      hash[1] = (hash[1] + b) >>> 0;
      hash[2] = (hash[2] + c) >>> 0;
      hash[3] = (hash[3] + d) >>> 0;
      hash[4] = (hash[4] + e) >>> 0;
      hash[5] = (hash[5] + f) >>> 0;
      hash[6] = (hash[6] + g) >>> 0;
      hash[7] = (hash[7] + h) >>> 0;
    }
    return hash.map(value => value.toString(16).padStart(8, '0')).join('');
  }

  function keyIdentityMaterial(key) {
    return [
      KEY_FORMAT,
      SCHEMA_VERSION,
      key.algorithm,
      key.gridSize,
      key.seed,
      key.inputFace,
      key.outputFace,
      normalizeQuarterTurns(key.inputQuarterTurns),
      normalizeQuarterTurns(key.outputQuarterTurns),
      key.rowPermutation.join(','),
      key.columnPermutation.join(','),
      key.depthPermutation.join(','),
      key.mask.map(Boolean).map(value => value ? '1' : '0').join(''),
      key.paddingMode
    ].join('|');
  }

  function keyFingerprint(key) {
    return hex32(keyIdentityMaterial(key));
  }

  function keyDigest(key) {
    return sha256Hex(keyIdentityMaterial(key));
  }
""",
'canonical SHA-256 implementation')

replace_once(engine,
"""    const expected = keyFingerprint(copy);
    if (key.keyId && key.keyId !== expected) fail('The key fingerprint does not match its contents.');
    copy.keyId = expected;
    return copy;
""",
"""    const expectedId = keyFingerprint(copy);
    const expectedDigest = keyDigest(copy);
    if (key.keyId && key.keyId !== expectedId) fail('The key fingerprint does not match its contents.');
    const suppliedDigestType = String(key.keyDigestType || '');
    const suppliedDigest = String(key.keyDigest || '').toLowerCase();
    if (key.keyId && (suppliedDigestType || suppliedDigest)) {
      if (!suppliedDigestType || !suppliedDigest) fail('The key digest metadata is incomplete.');
      if (suppliedDigestType !== KEY_DIGEST_TYPE) fail('The key digest type is not supported.');
      if (!/^[0-9a-f]{64}$/.test(suppliedDigest) || suppliedDigest !== expectedDigest) fail('The key SHA-256 digest does not match its contents.');
    }
    copy.keyId = expectedId;
    copy.keyDigestType = KEY_DIGEST_TYPE;
    copy.keyDigest = expectedDigest;
    return copy;
""",
'canonical key validation')

replace_once(engine,
"""    key.keyId = keyFingerprint(key);
    assertInvariantForKey(key);
""",
"""    key.keyId = keyFingerprint(key);
    key.keyDigestType = KEY_DIGEST_TYPE;
    key.keyDigest = keyDigest(key);
    assertInvariantForKey(key);
""",
'canonical key creation digest')

replace_once(engine,
"""      keyId: payload.keyId,
      gridSize: payload.gridSize,
""",
"""      keyId: payload.keyId,
      keyDigestType: payload.keyDigestType,
      keyDigest: payload.keyDigest,
      gridSize: payload.gridSize,
""",
'package checksum digest fields')

replace_once(engine,
"""      keyId: key.keyId,
      gridSize: key.gridSize,
""",
"""      keyId: key.keyId,
      keyDigestType: key.keyDigestType,
      keyDigest: key.keyDigest,
      gridSize: key.gridSize,
""",
'package encryption digest fields')

replace_once(engine,
"""    if (payload.keyId !== key.keyId) fail('The encrypted package requires a different key.');
    if (Number(payload.gridSize) !== key.gridSize) fail('Package and key grid sizes do not match.');
""",
"""    if (payload.keyId !== key.keyId) fail('The encrypted package requires a different key.');
    const suppliedPackageDigestType = String(payload.keyDigestType || '');
    const suppliedPackageDigest = String(payload.keyDigest || '').toLowerCase();
    if (suppliedPackageDigestType || suppliedPackageDigest) {
      if (!suppliedPackageDigestType || !suppliedPackageDigest) fail('The encrypted package key digest metadata is incomplete.');
      if (suppliedPackageDigestType !== KEY_DIGEST_TYPE) fail('The encrypted package key digest type is not supported.');
      if (!/^[0-9a-f]{64}$/.test(suppliedPackageDigest) || suppliedPackageDigest !== key.keyDigest) fail('The encrypted package requires a different SHA-256 key identity.');
    }
    if (Number(payload.gridSize) !== key.gridSize) fail('Package and key grid sizes do not match.');
""",
'package digest validation')

replace_once(engine,
"""    return {
      keyId: key.keyId,
      gridSize: key.gridSize,
""",
"""    return {
      keyId: key.keyId,
      keyDigestType: payload.keyDigestType || null,
      keyDigest: payload.keyDigest || null,
      identityStrength: payload.keyDigest ? 'sha256' : 'legacy-fnv1a32',
      gridSize: key.gridSize,
""",
'package diagnostic identity')

replace_once(engine,
"""    packageChecksum,
    legalOutputFaces,
""",
"""    packageChecksum,
    sha256Hex,
    keyIdentityMaterial,
    keyDigest,
    legalOutputFaces,
""",
'canonical digest exports')

replace_once(engine,
"""      SECURITY_CLASSIFICATION,
      CHECKSUM_TYPE,
      TRACE_FORMAT,
""",
"""      SECURITY_CLASSIFICATION,
      CHECKSUM_TYPE,
      KEY_DIGEST_TYPE,
      TRACE_FORMAT,
""",
'canonical digest constant export')

replace_once(cubic,
"""      keyId: key.keyId,
      gridSize: key.gridSize,
""",
"""      keyId: key.keyId,
      keyDigestType: key.keyDigestType,
      keyDigest: key.keyDigest,
      gridSize: key.gridSize,
""",
'Cubic synthetic package digest')

replace_once(cubic,
"""    const targetKeyId = source.package?.keyId || null;
    if (targetKeyId && key.keyId !== targetKeyId) return null;

    let plaintext;
    let exactFingerprintMatch = false;
    if (source.kind === 'package') {
      exactFingerprintMatch = Boolean(targetKeyId && key.keyId === targetKeyId);
      plaintext = Engine.decryptBinary(source.package, key);
    } else {
""",
"""    const targetKeyId = source.package?.keyId || null;
    const targetKeyDigest = String(source.package?.keyDigest || '').toLowerCase() || null;
    const targetKeyDigestType = source.package?.keyDigestType || null;
    if (targetKeyId && key.keyId !== targetKeyId) return null;
    if (targetKeyDigestType && targetKeyDigestType !== Engine.constants.KEY_DIGEST_TYPE) return null;
    if (targetKeyDigest && key.keyDigest !== targetKeyDigest) return null;

    let plaintext;
    let exactFingerprintMatch = false;
    let exactDigestMatch = false;
    if (source.kind === 'package') {
      exactDigestMatch = Boolean(targetKeyDigest && key.keyDigest === targetKeyDigest);
      exactFingerprintMatch = exactDigestMatch || Boolean(!targetKeyDigest && targetKeyId && key.keyId === targetKeyId);
      plaintext = Engine.decryptBinary(source.package, key);
    } else {
""",
'Cubic digest prefilter')

replace_once(cubic,
"""      keyId: key.keyId,
      exactFingerprintMatch,
      plaintextBits: plaintext,
      ...evidence,
      caveat: exactFingerprintMatch
        ? 'The package key fingerprint matches this generated key. The fingerprint is FNV-1a corruption-detection metadata, not a cryptographic proof against deliberate collisions.'
        : 'Raw-ciphertext ranking is heuristic. A readable or structured preview is evidence to investigate, not proof that the candidate key is correct.'
""",
"""      keyId: key.keyId,
      keyDigestType: key.keyDigestType,
      keyDigest: key.keyDigest,
      exactFingerprintMatch,
      exactDigestMatch,
      identityStrength: exactDigestMatch ? 'sha256' : exactFingerprintMatch ? 'legacy-fnv1a32' : 'heuristic-raw',
      plaintextBits: plaintext,
      ...evidence,
      caveat: exactDigestMatch
        ? 'The package SHA-256 canonical key digest matches this generated key. This is collision-resistant key-identity evidence; plaintext meaning and the experimental cipher security model remain separate questions.'
        : exactFingerprintMatch
          ? 'The legacy package key fingerprint matches this generated key. The fingerprint is FNV-1a corruption-detection metadata, not a cryptographic proof against deliberate collisions.'
          : 'Raw-ciphertext ranking is heuristic. A readable or structured preview is evidence to investigate, not proof that the candidate key is correct.'
""",
'Cubic candidate identity evidence')

replace_once(ui,
"""<b>${candidate.exactFingerprintMatch ? 'KEY FINGERPRINT MATCH' : `score ${num(candidate.score, 1)}`}</b>""",
"""<b>${candidate.exactDigestMatch ? 'SHA-256 KEY MATCH' : candidate.exactFingerprintMatch ? 'LEGACY KEY FINGERPRINT MATCH' : `score ${num(candidate.score, 1)}`}</b>""",
'Cubic candidate identity label')

replace_once(ui,
"""<div><span>Key fingerprint</span><strong><code>${esc(artifact.keyId || 'missing')}</code></strong></div><div><span>Geometry</span>""",
"""<div><span>Key fingerprint</span><strong><code>${esc(artifact.keyId || 'missing')}</code></strong></div><div><span>Strong key identity</span><strong><code>${esc(artifact.keyDigest ? `SHA-256 ${artifact.keyDigest.slice(0, 16)}…` : 'legacy package · unavailable')}</code></strong></div><div><span>Geometry</span>""",
'Cubic source strong identity display')

replace_once(ui,
"""<section class=\"bccd-boundary\"><strong>Search boundary:</strong> a canonical package fingerprint is 32-bit FNV-1a corruption metadata, not a collision-resistant cryptographic identity. Raw-ciphertext scores are triage evidence only. Confirm promising plaintext with known-plaintext, file-format, or Information & Deobfuscation analysis.</section>""",
"""<section class=\"bccd-boundary\"><strong>Search boundary:</strong> new canonical packages carry a SHA-256 digest of canonical key material in addition to the legacy 32-bit FNV-1a keyId. SHA-256 matches are strong key-identity evidence; legacy packages fall back to FNV matching. Raw-ciphertext scores remain triage evidence only. Confirm promising plaintext with known-plaintext, file-format, or Information & Deobfuscation analysis.</section>""",
'Cubic UI identity boundary')

replace_once(validator,
"""import vm from 'node:vm';
import { createRequire } from 'node:module';
""",
"""import vm from 'node:vm';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
""",
'Cubic validator crypto import')

replace_once(validator,
"""assert.equal(Cubic.constants.VERSION, '0.1.0');
assert.deepEqual(Cubic.constants.PROFILE_ORDER, [
""",
"""assert.equal(Cubic.constants.VERSION, '0.1.0');
assert.equal(Engine.constants.KEY_DIGEST_TYPE, 'sha256-canonical-key-material-v1');
assert.equal(Engine.sha256Hex('abc'), 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
assert.deepEqual(Cubic.constants.PROFILE_ORDER, [
""",
'Cubic validator SHA vector')

replace_once(validator,
"""  assert.equal(candidate.keyId, key.keyId, `${profile} key fingerprint must recover`);
  recovered.push({ profile, keyId: candidate.keyId, score: candidate.score });
""",
"""  assert.equal(candidate.keyId, key.keyId, `${profile} key fingerprint must recover`);
  assert.equal(key.keyDigestType, Engine.constants.KEY_DIGEST_TYPE, `${profile} key must carry the canonical digest type`);
  assert.match(key.keyDigest, /^[0-9a-f]{64}$/, `${profile} key digest must be lowercase SHA-256 hex`);
  const nodeDigest = createHash('sha256').update(Engine.keyIdentityMaterial(key), 'utf8').digest('hex');
  assert.equal(key.keyDigest, nodeDigest, `${profile} key digest must match Node SHA-256`);
  assert.equal(candidate.exactDigestMatch, true, `${profile} package candidate must use SHA-256 identity`);
  assert.equal(candidate.keyDigest, key.keyDigest, `${profile} key digest must recover`);
  recovered.push({ profile, keyId: candidate.keyId, keyDigest: candidate.keyDigest, score: candidate.score });
""",
'Cubic validator digest recovery')

replace_once(validator,
"""const directKey = Engine.createKey({ gridSize: 4, seed: '3', inputFace: 'top', outputFace: 'front', maskDensity: 0.75 });
const shortPlaintext = '01001000';
""",
"""const directKey = Engine.createKey({ gridSize: 4, seed: '3', inputFace: 'top', outputFace: 'front', maskDensity: 0.75 });
const tamperedDigestKey = { ...directKey, keyDigest: `${directKey.keyDigest.slice(0, -1)}${directKey.keyDigest.endsWith('0') ? '1' : '0'}` };
assert.throws(() => Engine.validateKey(tamperedDigestKey), /SHA-256 digest/);
const legacyKey = { ...directKey };
delete legacyKey.keyDigest;
delete legacyKey.keyDigestType;
const normalizedLegacyKey = Engine.validateKey(legacyKey);
assert.equal(normalizedLegacyKey.keyId, directKey.keyId, 'Legacy keyId must remain stable');
assert.equal(normalizedLegacyKey.keyDigest, directKey.keyDigest, 'Legacy keys must gain the deterministic strong digest when validated');
const shortPlaintext = '01001000';
""",
'Cubic validator legacy key compatibility')

replace_once(validator,
"""const directPackage = Engine.encryptBinary(shortPlaintext, directKey);
const rawSource = Cubic.sourceFromRaw(directPackage.ciphertext, {
""",
"""const directPackage = Engine.encryptBinary(shortPlaintext, directKey);
assert.equal(directPackage.keyDigestType, Engine.constants.KEY_DIGEST_TYPE);
assert.equal(directPackage.keyDigest, directKey.keyDigest);
const legacyPackage = { ...directPackage };
delete legacyPackage.keyDigestType;
delete legacyPackage.keyDigest;
legacyPackage.checksum = Engine.packageChecksum(legacyPackage);
assert.equal(Engine.decryptBinary(legacyPackage, legacyKey), shortPlaintext, 'Legacy package without SHA-256 metadata must remain decryptable');
const rawSource = Cubic.sourceFromRaw(directPackage.ciphertext, {
""",
'Cubic validator legacy package compatibility')

replace_once(validator,
"""assert.equal(resumedWorkerResult.exactMatch.keyId, workerKey.keyId);
assert.equal(resumedWorkerResult.exactMatch.plaintextBits, workerPlaintext);
""",
"""assert.equal(resumedWorkerResult.exactMatch.keyId, workerKey.keyId);
assert.equal(resumedWorkerResult.exactMatch.keyDigest, workerKey.keyDigest);
assert.equal(resumedWorkerResult.exactMatch.exactDigestMatch, true);
assert.equal(resumedWorkerResult.exactMatch.identityStrength, 'sha256');
assert.equal(resumedWorkerResult.exactMatch.plaintextBits, workerPlaintext);
""",
'Cubic validator worker digest match')

replace_once(validator,
"""  'KEY FINGERPRINT MATCH'
]) assert.ok(ui.includes(required), `UI is missing ${JSON.stringify(required)}`);
""",
"""  'SHA-256 KEY MATCH',
  'LEGACY KEY FINGERPRINT MATCH'
]) assert.ok(ui.includes(required), `UI is missing ${JSON.stringify(required)}`);
""",
'Cubic validator UI identity labels')

replace_once(validator,
"""    recoveredKeyId: resumedWorkerResult.exactMatch.keyId,
    exactPlaintextRecovery: resumedWorkerResult.exactMatch.plaintextBits === workerPlaintext
""",
"""    recoveredKeyId: resumedWorkerResult.exactMatch.keyId,
    recoveredKeyDigest: resumedWorkerResult.exactMatch.keyDigest,
    strongIdentityMatch: resumedWorkerResult.exactMatch.exactDigestMatch,
    exactPlaintextRecovery: resumedWorkerResult.exactMatch.plaintextBits === workerPlaintext
""",
'Cubic validator receipt strong identity')

print('Strong key identity migration applied or already present.')
