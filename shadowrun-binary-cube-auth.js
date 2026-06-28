(function installBinaryCubeAuth(root, factory) {
  'use strict';
  const api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.ShadowrunBinaryCubeAuth = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function createBinaryCubeAuth(root) {
  'use strict';

  const ENVELOPE_FORMAT = 'hb-ttrpg-shadowrun-binary-cube-authenticated-envelope';
  const ENVELOPE_SCHEMA_VERSION = '0.1.0';
  const PACKAGE_FORMAT = 'hb-ttrpg-shadowrun-binary-cube-package';
  const SECURITY_CLASSIFICATION = 'standard-authenticated-envelope-around-experimental-ttrpg-obfuscation';
  const KDF_NAME = 'PBKDF2';
  const KDF_HASH = 'SHA-256';
  const CIPHER_NAME = 'AES-GCM';
  const KEY_LENGTH = 256;
  const TAG_LENGTH = 128;
  const DEFAULT_ITERATIONS = 310000;
  const MIN_ITERATIONS = 100000;
  const MAX_ITERATIONS = 1000000;
  const SALT_BYTES = 16;
  const IV_BYTES = 12;

  function fail(message) {
    throw new Error(message);
  }

  function cryptoApi() {
    const api = root?.crypto;
    if (!api?.subtle || typeof api.getRandomValues !== 'function') fail('Web Crypto is unavailable in this environment.');
    return api;
  }

  function textEncoder() {
    if (typeof TextEncoder !== 'undefined') return new TextEncoder();
    fail('TextEncoder is unavailable in this environment.');
  }

  function textDecoder() {
    if (typeof TextDecoder !== 'undefined') return new TextDecoder('utf-8', { fatal: true });
    fail('TextDecoder is unavailable in this environment.');
  }

  function normalizePassphrase(value) {
    const passphrase = String(value ?? '');
    if (passphrase.length < 12) fail('The authenticated envelope passphrase must contain at least 12 characters.');
    if (passphrase.length > 1024) fail('The authenticated envelope passphrase is unreasonably long.');
    return passphrase;
  }

  function randomBytes(length) {
    const bytes = new Uint8Array(length);
    cryptoApi().getRandomValues(bytes);
    return bytes;
  }

  function bytesToBase64(bytes) {
    if (!(bytes instanceof Uint8Array)) bytes = new Uint8Array(bytes);
    if (typeof btoa === 'function') {
      let binary = '';
      const chunkSize = 0x8000;
      for (let offset = 0; offset < bytes.length; offset += chunkSize) {
        binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
      }
      return btoa(binary);
    }
    if (typeof Buffer !== 'undefined') return Buffer.from(bytes).toString('base64');
    fail('Base64 encoding is unavailable in this environment.');
  }

  function base64ToBytes(value, label) {
    const encoded = String(value ?? '');
    if (!encoded || !/^[A-Za-z0-9+/]+={0,2}$/.test(encoded) || encoded.length % 4 !== 0) fail(`${label} is not valid Base64.`);
    try {
      if (typeof atob === 'function') {
        const binary = atob(encoded);
        return Uint8Array.from(binary, character => character.charCodeAt(0));
      }
      if (typeof Buffer !== 'undefined') return new Uint8Array(Buffer.from(encoded, 'base64'));
    } catch (_) {
      fail(`${label} is not valid Base64.`);
    }
    fail('Base64 decoding is unavailable in this environment.');
  }

  function normalizePackage(rawPackage) {
    let packageObject;
    try {
      packageObject = typeof rawPackage === 'string' ? JSON.parse(rawPackage) : rawPackage;
    } catch (error) {
      fail(`Binary Cube package JSON is invalid: ${error.message}`);
    }
    if (!packageObject || typeof packageObject !== 'object' || Array.isArray(packageObject)) fail('A Binary Cube package object is required.');
    if (packageObject.format !== PACKAGE_FORMAT) fail('The authenticated envelope accepts only Binary Cube package documents.');
    if (typeof packageObject.keyId !== 'string' || !packageObject.keyId) fail('The Binary Cube package is missing its key identifier.');
    return packageObject;
  }

  function normalizeIterations(value) {
    const iterations = Number(value ?? DEFAULT_ITERATIONS);
    if (!Number.isInteger(iterations) || iterations < MIN_ITERATIONS || iterations > MAX_ITERATIONS) {
      fail(`PBKDF2 iterations must be an integer from ${MIN_ITERATIONS} through ${MAX_ITERATIONS}.`);
    }
    return iterations;
  }

  function normalizeOptionalBytes(value, expectedLength, label) {
    if (value === undefined || value === null) return randomBytes(expectedLength);
    const bytes = value instanceof Uint8Array ? value : new Uint8Array(value);
    if (bytes.length !== expectedLength) fail(`${label} must contain exactly ${expectedLength} bytes.`);
    return bytes;
  }

  function associatedDataObject(envelope) {
    return {
      format: envelope.format,
      schemaVersion: envelope.schemaVersion,
      securityClassification: envelope.securityClassification,
      cubePackageFormat: envelope.cubePackageFormat,
      cubePackageSchemaVersion: envelope.cubePackageSchemaVersion,
      cubeKeyId: envelope.cubeKeyId,
      kdf: envelope.kdf,
      cipher: envelope.cipher
    };
  }

  function associatedDataBytes(envelope) {
    return textEncoder().encode(JSON.stringify(associatedDataObject(envelope)));
  }

  async function deriveKey(passphrase, salt, iterations, usages) {
    const subtle = cryptoApi().subtle;
    const baseKey = await subtle.importKey('raw', textEncoder().encode(passphrase), KDF_NAME, false, ['deriveKey']);
    return subtle.deriveKey(
      { name: KDF_NAME, hash: KDF_HASH, salt, iterations },
      baseKey,
      { name: CIPHER_NAME, length: KEY_LENGTH },
      false,
      usages
    );
  }

  function validateEnvelope(rawEnvelope) {
    let envelope;
    try {
      envelope = typeof rawEnvelope === 'string' ? JSON.parse(rawEnvelope) : rawEnvelope;
    } catch (error) {
      fail(`Authenticated envelope JSON is invalid: ${error.message}`);
    }
    if (!envelope || typeof envelope !== 'object' || Array.isArray(envelope)) fail('An authenticated envelope object is required.');
    if (envelope.format !== ENVELOPE_FORMAT) fail('The authenticated envelope format is not recognized.');
    if (envelope.schemaVersion !== ENVELOPE_SCHEMA_VERSION) fail(`Unsupported authenticated envelope schema: ${envelope.schemaVersion || 'missing'}.`);
    if (envelope.securityClassification !== SECURITY_CLASSIFICATION) fail('The authenticated envelope security classification is missing or unsupported.');
    if (envelope.cubePackageFormat !== PACKAGE_FORMAT) fail('The envelope does not contain a Binary Cube package.');
    if (typeof envelope.cubePackageSchemaVersion !== 'string' || !envelope.cubePackageSchemaVersion) fail('The envelope is missing the Binary Cube package schema version.');
    if (typeof envelope.cubeKeyId !== 'string' || !envelope.cubeKeyId) fail('The envelope is missing the Binary Cube key identifier.');
    if (envelope.kdf?.name !== KDF_NAME || envelope.kdf?.hash !== KDF_HASH) fail('The envelope key-derivation profile is unsupported.');
    const iterations = normalizeIterations(envelope.kdf.iterations);
    const salt = base64ToBytes(envelope.kdf.salt, 'Envelope salt');
    if (salt.length !== SALT_BYTES) fail(`Envelope salt must contain exactly ${SALT_BYTES} bytes.`);
    if (envelope.cipher?.name !== CIPHER_NAME || Number(envelope.cipher?.keyLength) !== KEY_LENGTH || Number(envelope.cipher?.tagLength) !== TAG_LENGTH) fail('The envelope cipher profile is unsupported.');
    const iv = base64ToBytes(envelope.cipher.iv, 'Envelope initialization vector');
    if (iv.length !== IV_BYTES) fail(`Envelope initialization vector must contain exactly ${IV_BYTES} bytes.`);
    const ciphertext = base64ToBytes(envelope.ciphertext, 'Envelope ciphertext');
    if (ciphertext.length <= TAG_LENGTH / 8) fail('Envelope ciphertext is too short to contain an authenticated payload.');
    return {
      ...envelope,
      kdf: { ...envelope.kdf, iterations },
      cipher: { ...envelope.cipher, keyLength: KEY_LENGTH, tagLength: TAG_LENGTH },
      _decoded: { salt, iv, ciphertext }
    };
  }

  async function sealPackage(rawPackage, passphraseValue, options = {}) {
    const packageObject = normalizePackage(rawPackage);
    const passphrase = normalizePassphrase(passphraseValue);
    const iterations = normalizeIterations(options.iterations);
    const salt = normalizeOptionalBytes(options.saltBytes, SALT_BYTES, 'Salt');
    const iv = normalizeOptionalBytes(options.ivBytes, IV_BYTES, 'Initialization vector');
    const envelope = {
      format: ENVELOPE_FORMAT,
      schemaVersion: ENVELOPE_SCHEMA_VERSION,
      securityClassification: SECURITY_CLASSIFICATION,
      cubePackageFormat: packageObject.format,
      cubePackageSchemaVersion: String(packageObject.schemaVersion || 'unknown'),
      cubeKeyId: packageObject.keyId,
      kdf: {
        name: KDF_NAME,
        hash: KDF_HASH,
        iterations,
        salt: bytesToBase64(salt)
      },
      cipher: {
        name: CIPHER_NAME,
        keyLength: KEY_LENGTH,
        tagLength: TAG_LENGTH,
        iv: bytesToBase64(iv)
      }
    };
    const key = await deriveKey(passphrase, salt, iterations, ['encrypt']);
    const plaintext = textEncoder().encode(JSON.stringify(packageObject));
    const encrypted = await cryptoApi().subtle.encrypt(
      { name: CIPHER_NAME, iv, additionalData: associatedDataBytes(envelope), tagLength: TAG_LENGTH },
      key,
      plaintext
    );
    envelope.ciphertext = bytesToBase64(new Uint8Array(encrypted));
    return envelope;
  }

  async function openEnvelope(rawEnvelope, passphraseValue) {
    const passphrase = normalizePassphrase(passphraseValue);
    const envelope = validateEnvelope(rawEnvelope);
    const { salt, iv, ciphertext } = envelope._decoded;
    const key = await deriveKey(passphrase, salt, envelope.kdf.iterations, ['decrypt']);
    let decrypted;
    try {
      decrypted = await cryptoApi().subtle.decrypt(
        { name: CIPHER_NAME, iv, additionalData: associatedDataBytes(envelope), tagLength: TAG_LENGTH },
        key,
        ciphertext
      );
    } catch (_) {
      fail('Authenticated envelope verification failed. The passphrase or envelope contents are incorrect.');
    }
    let packageObject;
    try {
      packageObject = JSON.parse(textDecoder().decode(decrypted));
    } catch (_) {
      fail('The authenticated envelope decrypted to an invalid Binary Cube package.');
    }
    packageObject = normalizePackage(packageObject);
    if (packageObject.keyId !== envelope.cubeKeyId) fail('The authenticated envelope key identifier does not match the decrypted package.');
    if (String(packageObject.schemaVersion || 'unknown') !== envelope.cubePackageSchemaVersion) fail('The authenticated envelope package schema does not match the decrypted package.');
    return packageObject;
  }

  function inspectEnvelope(rawEnvelope) {
    const envelope = validateEnvelope(rawEnvelope);
    return {
      format: envelope.format,
      schemaVersion: envelope.schemaVersion,
      securityClassification: envelope.securityClassification,
      cubePackageFormat: envelope.cubePackageFormat,
      cubePackageSchemaVersion: envelope.cubePackageSchemaVersion,
      cubeKeyId: envelope.cubeKeyId,
      kdf: { name: envelope.kdf.name, hash: envelope.kdf.hash, iterations: envelope.kdf.iterations, saltBytes: envelope._decoded.salt.length },
      cipher: { name: envelope.cipher.name, keyLength: envelope.cipher.keyLength, tagLength: envelope.cipher.tagLength, ivBytes: envelope._decoded.iv.length },
      ciphertextBytes: envelope._decoded.ciphertext.length
    };
  }

  return Object.freeze({
    sealPackage,
    openEnvelope,
    validateEnvelope,
    inspectEnvelope,
    constants: Object.freeze({
      ENVELOPE_FORMAT,
      ENVELOPE_SCHEMA_VERSION,
      PACKAGE_FORMAT,
      SECURITY_CLASSIFICATION,
      KDF_NAME,
      KDF_HASH,
      CIPHER_NAME,
      KEY_LENGTH,
      TAG_LENGTH,
      DEFAULT_ITERATIONS,
      MIN_ITERATIONS,
      MAX_ITERATIONS,
      SALT_BYTES,
      IV_BYTES
    })
  });
});
