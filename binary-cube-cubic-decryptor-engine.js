(function installBinaryCubeCubicDecryptorEngine(root, factory) {
  'use strict';
  const Engine = root?.ShadowrunBinaryCubeEngine
    || (typeof module === 'object' && module.exports && typeof require === 'function' ? require('./shadowrun-binary-cube-engine.js') : null);
  const Research = root?.BinaryCubeKeyGenerationResearch
    || (typeof module === 'object' && module.exports && typeof require === 'function' ? require('./binary-cube-key-generation-research.js') : null);
  const api = factory(Engine, Research);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.BinaryCubeCubicDecryptorEngine = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function createBinaryCubeCubicDecryptorEngine(Engine, Research) {
  'use strict';

  if (!Engine) throw new Error('Cubic Decryptor requires ShadowrunBinaryCubeEngine.');
  if (!Research) throw new Error('Cubic Decryptor requires BinaryCubeKeyGenerationResearch.');

  const VERSION = '0.1.0';
  const PLAN_FORMAT = 'hb-ttrpg-cubic-decryptor-search-plan';
  const CHECKPOINT_FORMAT = 'hb-ttrpg-cubic-decryptor-checkpoint';
  const RESULT_FORMAT = 'hb-ttrpg-cubic-decryptor-result';
  const PACKAGE_FORMAT = Engine.constants.PACKAGE_FORMAT;
  const DEFAULT_SEED_START = 0;
  const DEFAULT_SEED_END = 65535;
  const DEFAULT_RESULT_LIMIT = 24;
  const DEFAULT_SCORE_THRESHOLD = 32;
  const DEFAULT_SEED_TEMPLATES = Object.freeze(['{n}']);
  const FIXED_SEEDS = Object.freeze([
    'shadowrun-cube-key',
    'binary-cube-profile-research',
    'binary-cube-profile-structure-demo',
    'binary-cube-key',
    'binary-cube'
  ]);
  const PROFILE_ORDER = Object.freeze([
    'direct-permutation',
    'iterative-chain',
    'random-transposition-walk',
    'nested-permutation',
    'nested-interleaved'
  ]);
  const LEGACY_PROFILES = Object.freeze(['local-adjacent-walk', 'nested-hierarchy']);
  const GRID_TIERS = Object.freeze([
    Object.freeze({ id: 'small', label: 'Small cubes', minimum: 3, maximum: 8 }),
    Object.freeze({ id: 'medium', label: 'Expanded cubes', minimum: 9, maximum: 64 }),
    Object.freeze({ id: 'large', label: 'Large cubes', minimum: 65, maximum: 1024 })
  ]);
  const FILE_SIGNATURES = Object.freeze([
    Object.freeze({ label: 'PNG', bytes: Object.freeze([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]) }),
    Object.freeze({ label: 'JPEG', bytes: Object.freeze([0xff,0xd8,0xff]) }),
    Object.freeze({ label: 'GIF', bytes: Object.freeze([0x47,0x49,0x46,0x38]) }),
    Object.freeze({ label: 'PDF', bytes: Object.freeze([0x25,0x50,0x44,0x46]) }),
    Object.freeze({ label: 'ZIP', bytes: Object.freeze([0x50,0x4b,0x03,0x04]) }),
    Object.freeze({ label: 'GZIP', bytes: Object.freeze([0x1f,0x8b]) }),
    Object.freeze({ label: '7-Zip', bytes: Object.freeze([0x37,0x7a,0xbc,0xaf,0x27,0x1c]) }),
    Object.freeze({ label: 'RAR', bytes: Object.freeze([0x52,0x61,0x72,0x21,0x1a,0x07]) }),
    Object.freeze({ label: 'ELF', bytes: Object.freeze([0x7f,0x45,0x4c,0x46]) }),
    Object.freeze({ label: 'PE/DOS', bytes: Object.freeze([0x4d,0x5a]) })
  ]);
  const COMMON_TOKENS = Object.freeze([' the ', ' and ', ' of ', ' to ', ' in ', ' is ', 'ing', 'ion', 'http', '{', '}', '[', ']', ':', ',', '\n']);

  const clamp = (value, minimum, maximum) => Math.max(minimum, Math.min(maximum, Number(value) || 0));
  function fail(message) { throw new Error(message); }
  function invariant(condition, message) { if (!condition) fail(message); }

  function fnv1a32(value) {
    let hash = 0x811c9dc5;
    const text = String(value ?? '');
    for (let index = 0; index < text.length; index += 1) {
      hash ^= text.charCodeAt(index);
      hash = Math.imul(hash, 0x01000193);
    }
    return hash >>> 0;
  }

  function asBits(value, label = 'Ciphertext') {
    const bits = String(value ?? '').replace(/\s+/g, '');
    if (!bits || /[^01]/.test(bits)) fail(`${label} must contain binary digits.`);
    return bits;
  }

  function bitsToBytes(bitsValue) {
    const bits = asBits(bitsValue, 'Plaintext bitstream');
    const bytes = new Uint8Array(Math.floor(bits.length / 8));
    for (let index = 0; index < bytes.length; index += 1) bytes[index] = parseInt(bits.slice(index * 8, index * 8 + 8), 2);
    return bytes;
  }

  function bytesToHex(bytesValue, limit = 160) {
    return Array.from(Uint8Array.from(bytesValue || []).slice(0, limit), byte => byte.toString(16).padStart(2, '0')).join(' ');
  }

  function bytesToText(bytesValue, limit = 2048) {
    const bytes = Uint8Array.from(bytesValue || []).slice(0, limit);
    if (typeof TextDecoder !== 'undefined') {
      try { return new TextDecoder('utf-8', { fatal: false }).decode(bytes); } catch (_) { /* fallback */ }
    }
    if (typeof Buffer !== 'undefined') return Buffer.from(bytes).toString('utf8');
    return Array.from(bytes, byte => (byte >= 32 && byte <= 126) || byte === 9 || byte === 10 || byte === 13 ? String.fromCharCode(byte) : '�').join('');
  }

  function entropy(bytesValue) {
    const bytes = Uint8Array.from(bytesValue || []);
    if (!bytes.length) return 0;
    const counts = new Uint32Array(256);
    for (const byte of bytes) counts[byte] += 1;
    let result = 0;
    for (const count of counts) if (count) { const p = count / bytes.length; result -= p * Math.log2(p); }
    return result;
  }

  function printableFraction(bytesValue) {
    const bytes = Uint8Array.from(bytesValue || []);
    if (!bytes.length) return 0;
    let printable = 0;
    for (const byte of bytes) if ((byte >= 32 && byte <= 126) || byte === 9 || byte === 10 || byte === 13) printable += 1;
    return printable / bytes.length;
  }

  function signature(bytesValue) {
    const bytes = Uint8Array.from(bytesValue || []);
    return FILE_SIGNATURES.find(item => item.bytes.every((byte, index) => bytes[index] === byte))?.label || null;
  }

  function scorePlaintext(bitsValue) {
    const bits = asBits(bitsValue, 'Candidate plaintext');
    const bytes = bitsToBytes(bits);
    const printable = printableFraction(bytes);
    const text = bytesToText(bytes, 4096).toLowerCase();
    const detectedSignature = signature(bytes);
    const byteEntropy = entropy(bytes);
    let tokenHits = 0;
    for (const token of COMMON_TOKENS) if (text.includes(token)) tokenHits += 1;
    const entropyStructure = Math.max(0, 1 - Math.abs(byteEntropy - 5.2) / 5.2);
    const score = Math.min(100,
      printable * 42
      + Math.min(28, tokenHits * 4)
      + (detectedSignature ? 45 : 0)
      + entropyStructure * 10
    );
    return Object.freeze({
      score,
      printableFraction: printable,
      entropy: byteEntropy,
      tokenHits,
      signature: detectedSignature,
      preview: bytesToText(bytes),
      hexPreview: bytesToHex(bytes),
      byteLength: bytes.length
    });
  }

  function parsePackage(value) {
    let object = value;
    if (typeof value === 'string') {
      try { object = JSON.parse(value); } catch (error) { fail(`Package JSON is invalid: ${error.message}`); }
    }
    if (!object || typeof object !== 'object' || Array.isArray(object) || object.format !== PACKAGE_FORMAT) return null;
    const ciphertext = asBits(object.ciphertext, 'Package ciphertext');
    return Object.freeze({ kind: 'package', package: object, bits: ciphertext, sourceName: 'Binary Cube package' });
  }

  function sourceFromRaw(bitsValue, framing = {}) {
    const bits = asBits(bitsValue, 'Raw ciphertext');
    return Object.freeze({ kind: 'raw', bits, package: null, framing: Object.freeze({ ...framing }), sourceName: String(framing.sourceName || 'raw ciphertext') });
  }

  function normalizeTemplates(value) {
    const rows = Array.isArray(value) ? value : String(value ?? '').split(/\r?\n/);
    const templates = [];
    const seen = new Set();
    for (const row of rows) {
      const template = String(row || '').trim();
      if (!template || seen.has(template)) continue;
      if (!template.includes('{n}') && !template.includes('{n8}') && !template.includes('{hex}') && !template.includes('{hex8}')) fail(`Seed template ${JSON.stringify(template)} has no supported counter placeholder.`);
      seen.add(template); templates.push(template);
    }
    return Object.freeze(templates.length ? templates : [...DEFAULT_SEED_TEMPLATES]);
  }

  function renderSeed(templateValue, counterValue) {
    const template = String(templateValue || '{n}');
    const counter = Math.max(0, Math.floor(Number(counterValue) || 0));
    return template
      .replaceAll('{n8}', String(counter).padStart(8, '0'))
      .replaceAll('{hex8}', counter.toString(16).padStart(8, '0'))
      .replaceAll('{hex}', counter.toString(16))
      .replaceAll('{n}', String(counter));
  }

  function seedCandidates(options = {}) {
    const fixed = options.includeFixedSeeds === false ? [] : [...FIXED_SEEDS];
    const templates = normalizeTemplates(options.seedTemplates || DEFAULT_SEED_TEMPLATES);
    const start = Math.max(0, Math.floor(Number(options.seedStart ?? DEFAULT_SEED_START)));
    const end = Math.max(start, Math.floor(Number(options.seedEnd ?? DEFAULT_SEED_END)));
    return Object.freeze({ fixed: Object.freeze(fixed), templates, start, end, count: fixed.length + (end - start + 1) * templates.length });
  }

  function gridSizesForTier(source, tier, options = {}) {
    const maximum = clamp(Math.floor(Number(options.maxGridSize) || 64), Engine.constants.MIN_GRID_SIZE, Engine.constants.MAX_GRID_SIZE);
    const minimum = Math.max(Engine.constants.MIN_GRID_SIZE, tier.minimum);
    const upper = Math.min(maximum, tier.maximum);
    if (upper < minimum) return Object.freeze([]);
    const metadataSize = Number(source?.package?.gridSize);
    if (source?.kind === 'package' && options.usePackageMetadata !== false && Number.isInteger(metadataSize)) {
      if (metadataSize < minimum || metadataSize > upper) return Object.freeze([]);
      return Object.freeze([metadataSize]);
    }
    const sizes = [];
    for (let gridSize = minimum; gridSize <= upper; gridSize += 1) {
      const cellCount = gridSize * gridSize;
      if (source.bits.length % cellCount === 0) sizes.push(gridSize);
    }
    return Object.freeze(sizes);
  }

  function orientationVariants(source, gridSize, options = {}) {
    const artifact = source?.package;
    if (artifact && options.usePackageMetadata !== false) {
      return Object.freeze([Object.freeze({
        inputFace: artifact.inputFace,
        outputFace: artifact.outputFace,
        inputQuarterTurns: Number(artifact.inputQuarterTurns) || 0,
        outputQuarterTurns: Number(artifact.outputQuarterTurns) || 0
      })]);
    }
    const framing = source?.framing || {};
    if (options.orientationMode !== 'all') {
      const inputFace = String(framing.inputFace || options.inputFace || 'top');
      const outputFace = String(framing.outputFace || options.outputFace || 'front');
      Engine.legalOutputFaces(inputFace).includes(outputFace) || fail('Manual raw framing requires perpendicular input/output cube faces.');
      return Object.freeze([Object.freeze({
        inputFace,
        outputFace,
        inputQuarterTurns: Number(framing.inputQuarterTurns ?? options.inputQuarterTurns) || 0,
        outputQuarterTurns: Number(framing.outputQuarterTurns ?? options.outputQuarterTurns) || 0
      })]);
    }
    const variants = [];
    for (const inputFace of Engine.constants.FACES) {
      for (const outputFace of Engine.legalOutputFaces(inputFace)) {
        for (let inputQuarterTurns = 0; inputQuarterTurns < 4; inputQuarterTurns += 1) {
          for (let outputQuarterTurns = 0; outputQuarterTurns < 4; outputQuarterTurns += 1) variants.push(Object.freeze({ inputFace, outputFace, inputQuarterTurns, outputQuarterTurns }));
        }
      }
    }
    return Object.freeze(variants);
  }

  function capacityVariants(source, gridSize, options = {}) {
    const cellCount = gridSize * gridSize;
    const packageCapacity = Number(source?.package?.payloadCapacity);
    if (source?.kind === 'package' && options.usePackageMetadata !== false && Number.isInteger(packageCapacity) && packageCapacity > 0 && packageCapacity <= cellCount) return Object.freeze([packageCapacity]);
    const manual = Number(source?.framing?.payloadCapacity ?? options.payloadCapacity);
    if (options.capacityMode !== 'exhaustive') {
      if (Number.isInteger(manual) && manual > 0 && manual <= cellCount) return Object.freeze([manual]);
      const values = [cellCount, Math.round(cellCount * 0.75), Math.round(cellCount * 0.5), Math.round(cellCount * 0.25)]
        .map(value => clamp(Math.round(value), Math.max(1, Math.round(cellCount * 0.01)), cellCount));
      return Object.freeze([...new Set(values)]);
    }
    const minimum = Math.max(1, Math.round(cellCount * 0.01));
    return Object.freeze(Array.from({ length: cellCount - minimum + 1 }, (_, index) => minimum + index));
  }

  function buildSearchPlan(sourceValue, options = {}) {
    const source = sourceValue?.kind ? sourceValue : (parsePackage(sourceValue) || sourceFromRaw(sourceValue, options));
    const seeds = seedCandidates(options);
    const profiles = PROFILE_ORDER.filter(profile => options.profiles == null || options.profiles.includes(profile));
    if (options.includeLegacyProfiles) profiles.push(...LEGACY_PROFILES.filter(profile => !profiles.includes(profile)));
    const stages = [];
    let totalAttempts = 0;
    let stageIndex = 0;
    for (const profile of profiles) {
      for (const tier of GRID_TIERS) {
        const gridSizes = gridSizesForTier(source, tier, options);
        if (!gridSizes.length) continue;
        let stageAttempts = 0;
        for (const gridSize of gridSizes) stageAttempts += orientationVariants(source, gridSize, options).length * capacityVariants(source, gridSize, options).length * seeds.count;
        if (!stageAttempts) continue;
        stages.push(Object.freeze({
          index: stageIndex++,
          id: `${profile}:${tier.id}`,
          profile,
          profileLabel: Research.constants.PROFILE_DEFINITIONS.find(item => item.id === profile)?.label || profile,
          tier: tier.id,
          tierLabel: tier.label,
          gridSizes,
          attempts: stageAttempts
        }));
        totalAttempts += stageAttempts;
      }
    }
    const normalized = {
      format: PLAN_FORMAT,
      version: VERSION,
      sourceKind: source.kind,
      ciphertextBitLength: source.bits.length,
      targetKeyId: source.package?.keyId || null,
      usePackageMetadata: options.usePackageMetadata !== false,
      orientationMode: String(options.orientationMode || 'manual'),
      capacityMode: String(options.capacityMode || 'manual'),
      maxGridSize: clamp(Math.floor(Number(options.maxGridSize) || 64), 3, 1024),
      seedStart: seeds.start,
      seedEnd: seeds.end,
      seedTemplates: [...seeds.templates],
      fixedSeeds: [...seeds.fixed],
      includeLegacyProfiles: Boolean(options.includeLegacyProfiles),
      stages: stages.map(stage => ({ id: stage.id, profile: stage.profile, tier: stage.tier, gridSizes: [...stage.gridSizes], attempts: stage.attempts })),
      totalAttempts
    };
    const planId = fnv1a32(JSON.stringify(normalized)).toString(16).padStart(8, '0');
    return Object.freeze({ ...normalized, planId, stages: Object.freeze(stages), seeds });
  }

  function densityForCapacity(gridSize, payloadCapacity) {
    const cellCount = gridSize * gridSize;
    invariant(Number.isInteger(payloadCapacity) && payloadCapacity >= 1 && payloadCapacity <= cellCount, 'Payload capacity is outside the candidate cube.');
    return payloadCapacity / cellCount;
  }

  function candidateBaseOptions(gridSize, orientation, payloadCapacity) {
    return Object.freeze({
      gridSize,
      inputFace: orientation.inputFace,
      outputFace: orientation.outputFace,
      inputQuarterTurns: orientation.inputQuarterTurns,
      outputQuarterTurns: orientation.outputQuarterTurns,
      maskDensity: densityForCapacity(gridSize, payloadCapacity)
    });
  }

  function syntheticPackage(source, key, payloadCapacity, ciphertext = null, originalBitLength = null) {
    const bits = asBits(ciphertext || source.bits, 'Raw ciphertext');
    const cellCount = key.gridSize * key.gridSize;
    invariant(bits.length % cellCount === 0, 'Raw ciphertext is not aligned to the candidate cube size.');
    const blockCount = bits.length / cellCount;
    const maximumPlaintext = blockCount * payloadCapacity;
    const requestedLength = Number(originalBitLength ?? source.framing?.originalBitLength);
    const length = Number.isInteger(requestedLength) && requestedLength >= 1 && requestedLength <= maximumPlaintext ? requestedLength : maximumPlaintext;
    const payload = {
      format: Engine.constants.PACKAGE_FORMAT,
      schemaVersion: Engine.constants.SCHEMA_VERSION,
      algorithm: Engine.constants.ALGORITHM,
      securityClassification: Engine.constants.SECURITY_CLASSIFICATION,
      keyId: key.keyId,
      keyDigestType: key.keyDigestType,
      keyDigest: key.keyDigest,
      gridSize: key.gridSize,
      inputFace: key.inputFace,
      outputFace: key.outputFace,
      inputQuarterTurns: key.inputQuarterTurns,
      outputQuarterTurns: key.outputQuarterTurns,
      originalBitLength: length,
      payloadCapacity,
      blockCount,
      ciphertext: bits,
      checksumType: Engine.constants.CHECKSUM_TYPE
    };
    payload.checksum = Engine.packageChecksum(payload);
    return payload;
  }

  function attemptCandidate(source, candidate, options = {}) {
    const baseOptions = candidateBaseOptions(candidate.gridSize, candidate.orientation, candidate.payloadCapacity);
    const key = Research.generateResearchKey(candidate.profile, candidate.seed, candidate.gridSize, baseOptions);
    const actualCapacity = key.mask.filter(Boolean).length;
    if (actualCapacity !== candidate.payloadCapacity) return null;
    const targetKeyId = source.package?.keyId || null;
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
      const cellCount = candidate.gridSize * candidate.gridSize;
      const sampleCiphertext = source.bits.slice(0, Math.min(source.bits.length, cellCount * Math.max(1, Number(options.sampleBlocks) || 1)));
      const samplePackage = syntheticPackage(source, key, candidate.payloadCapacity, sampleCiphertext, Math.min(candidate.payloadCapacity * (sampleCiphertext.length / cellCount), Number(source.framing?.originalBitLength) || Number.MAX_SAFE_INTEGER));
      plaintext = Engine.decryptBinary(samplePackage, key);
    }
    const evidence = scorePlaintext(plaintext);
    return Object.freeze({
      profile: candidate.profile,
      profileLabel: Research.constants.PROFILE_DEFINITIONS.find(item => item.id === candidate.profile)?.label || candidate.profile,
      stageId: candidate.stageId,
      gridSize: candidate.gridSize,
      seed: candidate.seed,
      seedSource: candidate.seedSource,
      inputFace: key.inputFace,
      outputFace: key.outputFace,
      inputQuarterTurns: key.inputQuarterTurns,
      outputQuarterTurns: key.outputQuarterTurns,
      payloadCapacity: actualCapacity,
      keyId: key.keyId,
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
    });
  }

  function makeCheckpoint(plan, cursor, attempts, stageId = null) {
    return Object.freeze({ format: CHECKPOINT_FORMAT, version: VERSION, planId: plan.planId, cursor: Math.max(0, Math.floor(Number(cursor) || 0)), attempts: Math.max(0, Math.floor(Number(attempts) || 0)), stageId, createdAt: new Date().toISOString() });
  }

  function validateCheckpoint(checkpointValue, plan) {
    const checkpoint = typeof checkpointValue === 'string' ? JSON.parse(checkpointValue) : checkpointValue;
    invariant(checkpoint?.format === CHECKPOINT_FORMAT, 'Checkpoint format is not recognized.');
    invariant(checkpoint.planId === plan.planId, 'Checkpoint belongs to a different deterministic search plan.');
    return Object.freeze({ ...checkpoint, cursor: Math.max(0, Math.floor(Number(checkpoint.cursor) || 0)) });
  }

  return Object.freeze({
    constants: Object.freeze({
      VERSION, PLAN_FORMAT, CHECKPOINT_FORMAT, RESULT_FORMAT, PACKAGE_FORMAT,
      DEFAULT_SEED_START, DEFAULT_SEED_END, DEFAULT_RESULT_LIMIT, DEFAULT_SCORE_THRESHOLD,
      DEFAULT_SEED_TEMPLATES, FIXED_SEEDS, PROFILE_ORDER, LEGACY_PROFILES, GRID_TIERS
    }),
    fnv1a32,
    asBits,
    bitsToBytes,
    bytesToHex,
    bytesToText,
    entropy,
    printableFraction,
    signature,
    scorePlaintext,
    parsePackage,
    sourceFromRaw,
    normalizeTemplates,
    renderSeed,
    seedCandidates,
    gridSizesForTier,
    orientationVariants,
    capacityVariants,
    buildSearchPlan,
    densityForCapacity,
    candidateBaseOptions,
    syntheticPackage,
    attemptCandidate,
    makeCheckpoint,
    validateCheckpoint
  });
});
