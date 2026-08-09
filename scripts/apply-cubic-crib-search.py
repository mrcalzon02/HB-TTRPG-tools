#!/usr/bin/env python3
from pathlib import Path

OLD_VERSION = '20260809-cubic-decryptor-hardening-3'
NEW_VERSION = '20260809-cubic-decryptor-hardening-4'


def replace_once(path, old, new, label):
    file = Path(path)
    text = file.read_text()
    if new in text and old not in text:
        return False
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected exactly one old fragment, found {count}')
    file.write_text(text.replace(old, new, 1))
    return True

engine = 'binary-cube-cubic-decryptor-engine.js'
worker = 'binary-cube-cubic-decryptor-worker.js'
ui = 'binary-cube-cubic-decryptor.js'
validator = 'scripts/validate-binary-cube-cubic-decryptor.mjs'
scientific_validator = 'scripts/validate-scientific-tools-extraction.mjs'

replace_once(engine, "  const VERSION = '0.1.0';", "  const VERSION = '0.2.0';", 'Cubic engine version')

replace_once(engine,
"""  function bitsToBytes(bitsValue) {
    const bits = asBits(bitsValue, 'Plaintext bitstream');
    const bytes = new Uint8Array(Math.floor(bits.length / 8));
    for (let index = 0; index < bytes.length; index += 1) bytes[index] = parseInt(bits.slice(index * 8, index * 8 + 8), 2);
    return bytes;
  }

  function bytesToHex(bytesValue, limit = 160) {
""",
"""  function bitsToBytes(bitsValue) {
    const bits = asBits(bitsValue, 'Plaintext bitstream');
    const bytes = new Uint8Array(Math.floor(bits.length / 8));
    for (let index = 0; index < bytes.length; index += 1) bytes[index] = parseInt(bits.slice(index * 8, index * 8 + 8), 2);
    return bytes;
  }

  function textToBytes(value) {
    const text = String(value ?? '');
    if (typeof TextEncoder !== 'undefined') return new TextEncoder().encode(text);
    if (typeof Buffer !== 'undefined') return Uint8Array.from(Buffer.from(text, 'utf8'));
    const encoded = unescape(encodeURIComponent(text));
    return Uint8Array.from(encoded, character => character.charCodeAt(0));
  }

  function bytesFromHex(value) {
    const compact = String(value ?? '').replace(/0x/gi, '').replace(/[\\s:_-]+/g, '');
    if (!compact || compact.length % 2 || /[^0-9a-f]/i.test(compact)) fail('Crib hex must contain complete hexadecimal bytes.');
    const bytes = new Uint8Array(compact.length / 2);
    for (let index = 0; index < bytes.length; index += 1) bytes[index] = parseInt(compact.slice(index * 2, index * 2 + 2), 16);
    return bytes;
  }

  function bytesToHex(bytesValue, limit = 160) {
""",
'Cubic crib byte parsing helpers')

replace_once(engine,
"""  function parsePackage(value) {
""",
"""  function normalizeCrib(options = {}) {
    const supplied = options?.cribSpec;
    if (supplied && typeof supplied === 'object' && Object.prototype.hasOwnProperty.call(supplied, 'enabled')) {
      if (!supplied.enabled) return Object.freeze({ enabled: false, mode: 'none', offsetBytes: 0, bytes: Object.freeze([]), hex: '', label: 'none' });
      const bytes = Uint8Array.from(supplied.bytes || []);
      invariant(bytes.length > 0, 'Enabled crib must contain at least one byte.');
      return Object.freeze({ enabled: true, mode: String(supplied.mode || 'hex'), offsetBytes: Math.max(0, Math.floor(Number(supplied.offsetBytes) || 0)), bytes: Object.freeze(Array.from(bytes)), hex: bytesToHex(bytes, bytes.length), label: String(supplied.label || 'known plaintext') });
    }
    const mode = String(options.cribMode || 'none').toLowerCase();
    if (!mode || mode === 'none' || mode === 'off') return Object.freeze({ enabled: false, mode: 'none', offsetBytes: 0, bytes: Object.freeze([]), hex: '', label: 'none' });
    const offsetBytes = Math.max(0, Math.floor(Number(options.cribOffsetBytes) || 0));
    let bytes;
    let label;
    if (mode === 'text') {
      const text = String(options.cribValue ?? '');
      if (!text.length) fail('Text crib is empty.');
      bytes = textToBytes(text);
      label = `UTF-8 text ${JSON.stringify(text.length > 48 ? `${text.slice(0, 48)}…` : text)}`;
    } else if (mode === 'hex') {
      bytes = bytesFromHex(options.cribValue);
      label = `hex ${bytesToHex(bytes, Math.min(bytes.length, 24))}${bytes.length > 24 ? ' …' : ''}`;
    } else if (mode === 'signature') {
      const requested = String(options.cribSignature || 'PNG');
      const found = FILE_SIGNATURES.find(item => item.label === requested);
      if (!found) fail(`Unknown file-signature crib: ${requested}`);
      bytes = Uint8Array.from(found.bytes);
      label = `${found.label} signature`;
    } else fail(`Unsupported crib mode: ${mode}`);
    invariant(bytes.length > 0, 'Enabled crib must contain at least one byte.');
    return Object.freeze({ enabled: true, mode, offsetBytes, bytes: Object.freeze(Array.from(bytes)), hex: bytesToHex(bytes, bytes.length), label });
  }

  function cribRequiredSampleBlocks(cribValue, payloadCapacity) {
    const crib = cribValue?.enabled !== undefined ? cribValue : normalizeCrib(cribValue || {});
    if (!crib.enabled) return 0;
    invariant(Number.isInteger(payloadCapacity) && payloadCapacity > 0, 'Crib sample calculation requires a positive payload capacity.');
    return Math.max(1, Math.ceil(((crib.offsetBytes + crib.bytes.length) * 8) / payloadCapacity));
  }

  function evaluateCrib(plaintextBitsValue, cribValue) {
    const crib = cribValue?.enabled !== undefined ? cribValue : normalizeCrib(cribValue || {});
    if (!crib.enabled) return Object.freeze({ enabled: false, matched: null, offsetBytes: 0, comparedBytes: 0, requiredBytes: 0, label: 'none' });
    const plaintext = bitsToBytes(plaintextBitsValue);
    const expected = Uint8Array.from(crib.bytes);
    const available = Math.max(0, Math.min(expected.length, plaintext.length - crib.offsetBytes));
    let matched = available === expected.length;
    if (matched) for (let index = 0; index < expected.length; index += 1) if (plaintext[crib.offsetBytes + index] !== expected[index]) { matched = false; break; }
    return Object.freeze({ enabled: true, matched, offsetBytes: crib.offsetBytes, comparedBytes: available, requiredBytes: expected.length, label: crib.label, expectedHex: crib.hex });
  }

  function parsePackage(value) {
""",
'Cubic crib normalization and matching')

replace_once(engine,
"""    const seeds = seedCandidates(options);
    const profiles = PROFILE_ORDER.filter(profile => options.profiles == null || options.profiles.includes(profile));
""",
"""    const seeds = seedCandidates(options);
    const crib = normalizeCrib(options);
    const profiles = PROFILE_ORDER.filter(profile => options.profiles == null || options.profiles.includes(profile));
""",
'Cubic plan crib normalization')

replace_once(engine,
"""      includeLegacyProfiles: Boolean(options.includeLegacyProfiles),
      stages: stages.map(stage => ({ id: stage.id, profile: stage.profile, tier: stage.tier, gridSizes: [...stage.gridSizes], attempts: stage.attempts })),
""",
"""      includeLegacyProfiles: Boolean(options.includeLegacyProfiles),
      crib: crib.enabled ? { mode: crib.mode, offsetBytes: crib.offsetBytes, hex: crib.hex, label: crib.label } : null,
      stages: stages.map(stage => ({ id: stage.id, profile: stage.profile, tier: stage.tier, gridSizes: [...stage.gridSizes], attempts: stage.attempts })),
""",
'Cubic Plan ID crib material')

replace_once(engine,
"""    let plaintext;
    let exactFingerprintMatch = false;
    let exactDigestMatch = false;
    if (source.kind === 'package') {
""",
"""    const crib = options.cribSpec?.enabled !== undefined ? normalizeCrib({ cribSpec: options.cribSpec }) : normalizeCrib(options);
    let plaintext;
    let exactFingerprintMatch = false;
    let exactDigestMatch = false;
    if (source.kind === 'package') {
""",
'Cubic candidate crib preparation')

replace_once(engine,
"""    } else {
      const cellCount = candidate.gridSize * candidate.gridSize;
      const sampleCiphertext = source.bits.slice(0, Math.min(source.bits.length, cellCount * Math.max(1, Number(options.sampleBlocks) || 1)));
      const samplePackage = syntheticPackage(source, key, candidate.payloadCapacity, sampleCiphertext, Math.min(candidate.payloadCapacity * (sampleCiphertext.length / cellCount), Number(source.framing?.originalBitLength) || Number.MAX_SAFE_INTEGER));
      plaintext = Engine.decryptBinary(samplePackage, key);
    }
    const evidence = scorePlaintext(plaintext);
""",
"""    } else {
      const cellCount = candidate.gridSize * candidate.gridSize;
      const requestedSampleBlocks = Math.max(1, Number(options.sampleBlocks) || 1);
      const cribSampleBlocks = cribRequiredSampleBlocks(crib, candidate.payloadCapacity);
      const sampleBlocks = Math.max(requestedSampleBlocks, cribSampleBlocks);
      const sampleCiphertext = source.bits.slice(0, Math.min(source.bits.length, cellCount * sampleBlocks));
      const samplePackage = syntheticPackage(source, key, candidate.payloadCapacity, sampleCiphertext, Math.min(candidate.payloadCapacity * (sampleCiphertext.length / cellCount), Number(source.framing?.originalBitLength) || Number.MAX_SAFE_INTEGER));
      plaintext = Engine.decryptBinary(samplePackage, key);
    }
    const cribEvidence = evaluateCrib(plaintext, crib);
    if (cribEvidence.enabled && !cribEvidence.matched && !exactFingerprintMatch) return null;
    const evidence = scorePlaintext(plaintext);
""",
'Cubic crib pre-score pruning')

replace_once(engine,
"""      identityStrength: exactDigestMatch ? 'sha256' : exactFingerprintMatch ? 'legacy-fnv1a32' : 'heuristic-raw',
      plaintextBits: plaintext,
      ...evidence,
""",
"""      identityStrength: exactDigestMatch ? 'sha256' : exactFingerprintMatch ? 'legacy-fnv1a32' : cribEvidence.matched ? 'known-plaintext-crib' : 'heuristic-raw',
      crib: cribEvidence,
      cribMatch: cribEvidence.enabled ? cribEvidence.matched : null,
      plaintextBits: plaintext,
      ...evidence,
""",
'Cubic candidate crib evidence')

replace_once(engine,
"""      DEFAULT_SEED_TEMPLATES, FIXED_SEEDS, PROFILE_ORDER, LEGACY_PROFILES, GRID_TIERS
""",
"""      DEFAULT_SEED_TEMPLATES, FIXED_SEEDS, PROFILE_ORDER, LEGACY_PROFILES, GRID_TIERS, FILE_SIGNATURES
""",
'Cubic signature crib export')

replace_once(engine,
"""    bitsToBytes,
    bytesToHex,
""",
"""    bitsToBytes,
    textToBytes,
    bytesFromHex,
    bytesToHex,
""",
'Cubic crib byte helper exports')

replace_once(engine,
"""    scorePlaintext,
    parsePackage,
""",
"""    scorePlaintext,
    normalizeCrib,
    cribRequiredSampleBlocks,
    evaluateCrib,
    parsePackage,
""",
'Cubic crib API exports')

replace_once(worker,
"""    const options = message.options || {};
    const plan = Cubic.buildSearchPlan(source, options);
""",
"""    const options = message.options || {};
    const cribSpec = Cubic.normalizeCrib(options);
    const attemptOptions = cribSpec.enabled ? { ...options, cribSpec } : options;
    const plan = Cubic.buildSearchPlan(source, options);
""",
'Cubic worker normalized crib')

replace_once(worker,
"""    if (left.exactFingerprintMatch !== right.exactFingerprintMatch) return left.exactFingerprintMatch ? -1 : 1;
    if (right.score !== left.score) return right.score - left.score;
""",
"""    if (left.exactFingerprintMatch !== right.exactFingerprintMatch) return left.exactFingerprintMatch ? -1 : 1;
    if (left.cribMatch !== right.cribMatch) return left.cribMatch ? -1 : 1;
    if (right.score !== left.score) return right.score - left.score;
""",
'Cubic worker crib priority')

replace_once(worker,
"""                }, options);
                if (candidate && (candidate.exactFingerprintMatch || candidate.score >= threshold)) {
""",
"""                }, attemptOptions);
                if (candidate && (candidate.exactFingerprintMatch || candidate.cribMatch || candidate.score >= threshold)) {
""",
'Cubic worker crib pruning retention')

replace_once(worker,
"""          : 'Raw-ciphertext candidates are ranked by lightweight structure heuristics. Use the Information & Deobfuscation Suite and known-plaintext checks before treating a candidate as a successful decryption.'
""",
"""          : cribSpec.enabled
            ? 'Raw-ciphertext candidates that fail the configured known-plaintext crib are rejected before Stage A scoring. A crib match is strong hypothesis evidence but remains conditional on the supplied plaintext assumption.'
            : 'Raw-ciphertext candidates are ranked by lightweight structure heuristics. Use the Information & Deobfuscation Suite and known-plaintext checks before treating a candidate as a successful decryption.'
""",
'Cubic worker crib boundary')

replace_once(ui,
"""      sampleBlocks: Number(panel.querySelector('#bccd-sample-blocks').value) || 1,
      maxAttemptsThisRun: Math.max(0, Math.floor(Number(panel.querySelector('#bccd-attempt-budget').value) || 0)),
""",
"""      sampleBlocks: Number(panel.querySelector('#bccd-sample-blocks').value) || 1,
      cribMode: panel.querySelector('#bccd-crib-mode').value,
      cribValue: panel.querySelector('#bccd-crib-value').value,
      cribSignature: panel.querySelector('#bccd-crib-signature').value,
      cribOffsetBytes: Math.max(0, Math.floor(Number(panel.querySelector('#bccd-crib-offset').value) || 0)),
      maxAttemptsThisRun: Math.max(0, Math.floor(Number(panel.querySelector('#bccd-attempt-budget').value) || 0)),
""",
'Cubic UI crib options')

replace_once(ui,
"""    const passCount = budget ? Math.ceil(plan.totalAttempts / budget) : 1;
    target.innerHTML = `<div class=\"bccd-plan-summary\"><div><span>Plan ID</span><strong><code>${plan.planId}</code></strong></div><div><span>Stages</span><strong>${plan.stages.length}</strong></div><div><span>Total candidates</span><strong>${plan.totalAttempts.toLocaleString()}</strong></div><div><span>Seed domain</span><strong>${plan.seedStart.toLocaleString()}…${plan.seedEnd.toLocaleString()}</strong></div><div><span>Run budget</span><strong>${budget ? `${budget.toLocaleString()} attempts · ${passCount.toLocaleString()} pass${passCount === 1 ? '' : 'es'} minimum` : 'unlimited'}</strong></div><div><span>Measured plan runtime</span><strong data-bccd-total-runtime>${measuredAttemptsPerSecond > 0 ? formatDuration(plan.totalAttempts / measuredAttemptsPerSecond) : 'measure during run'}</strong></div></div>""",
"""    const passCount = budget ? Math.ceil(plan.totalAttempts / budget) : 1;
    const cribSummary = plan.crib ? `${plan.crib.label} @ byte ${plan.crib.offsetBytes}` : 'none';
    target.innerHTML = `<div class=\"bccd-plan-summary\"><div><span>Plan ID</span><strong><code>${plan.planId}</code></strong></div><div><span>Stages</span><strong>${plan.stages.length}</strong></div><div><span>Total candidates</span><strong>${plan.totalAttempts.toLocaleString()}</strong></div><div><span>Seed domain</span><strong>${plan.seedStart.toLocaleString()}…${plan.seedEnd.toLocaleString()}</strong></div><div><span>Known plaintext crib</span><strong>${esc(cribSummary)}</strong></div><div><span>Run budget</span><strong>${budget ? `${budget.toLocaleString()} attempts · ${passCount.toLocaleString()} pass${passCount === 1 ? '' : 'es'} minimum` : 'unlimited'}</strong></div><div><span>Measured plan runtime</span><strong data-bccd-total-runtime>${measuredAttemptsPerSecond > 0 ? formatDuration(plan.totalAttempts / measuredAttemptsPerSecond) : 'measure during run'}</strong></div></div>""",
'Cubic plan crib summary')

replace_once(ui,
"""      if (a.exactFingerprintMatch !== b.exactFingerprintMatch) return a.exactFingerprintMatch ? -1 : 1;
      const aStageB = Number(a.corroboration?.candidateScore);
""",
"""      if (a.exactFingerprintMatch !== b.exactFingerprintMatch) return a.exactFingerprintMatch ? -1 : 1;
      if (a.cribMatch !== b.cribMatch) return a.cribMatch ? -1 : 1;
      const aStageB = Number(a.corroboration?.candidateScore);
""",
'Cubic UI crib candidate priority')

replace_once(ui,
"""<b>${candidate.exactDigestMatch ? 'SHA-256 KEY MATCH' : candidate.exactFingerprintMatch ? 'LEGACY KEY FINGERPRINT MATCH' : stageB ? `Stage B ${num(stageB.candidateScore, 1)}` : `Stage A ${num(candidate.score, 1)}`}</b></header><div class=\"bccd-chips\"><span>seed <code>${esc(candidate.seed)}</code></span>""",
"""<b>${candidate.exactDigestMatch ? 'SHA-256 KEY MATCH' : candidate.exactFingerprintMatch ? 'LEGACY KEY FINGERPRINT MATCH' : candidate.cribMatch ? 'KNOWN-PLAINTEXT CRIB MATCH' : stageB ? `Stage B ${num(stageB.candidateScore, 1)}` : `Stage A ${num(candidate.score, 1)}`}</b></header><div class=\"bccd-chips\"><span>seed <code>${esc(candidate.seed)}</code></span>${candidate.crib?.enabled ? `<span>crib ${candidate.crib.matched ? 'match' : 'mismatch'} @ byte ${candidate.crib.offsetBytes}</span>` : ''}""",
'Cubic candidate crib rendering')

signature_options = "${Cubic.constants.FILE_SIGNATURES.map(item => `<option value=\"${esc(item.label)}\">${esc(item.label)}</option>`).join('')}"
replace_once(ui,
"""</section><section class=\"bccd-card\"><h3>5 · Retention / stopping</h3><div class=\"bccd-grid\"><label>Raw score threshold""",
"""</section><section class=\"bccd-card\"><h3>5 · Known plaintext / crib pruning</h3><label>Crib mode<select id=\"bccd-crib-mode\"><option value=\"none\">Disabled</option><option value=\"text\">UTF-8 text at exact byte offset</option><option value=\"hex\">Hex bytes at exact byte offset</option><option value=\"signature\">Known file signature at exact byte offset</option></select></label><div class=\"bccd-grid\"><label>Byte offset<input id=\"bccd-crib-offset\" type=\"number\" min=\"0\" value=\"0\"></label><label>Known signature<select id=\"bccd-crib-signature\">""" + signature_options + """</select></label></div><label>Known text / hex bytes<textarea id=\"bccd-crib-value\" rows=\"3\" spellcheck=\"false\" placeholder=\"Text: expected prefix or fragment at the exact offset · Hex: 89504e470d0a1a0a\"></textarea></label><p class=\"bccd-muted\">For raw ciphertext, mismatching candidates are rejected before Stage A scoring. The decryptor automatically samples enough blocks to reach the crib. Because the crib changes search semantics, its mode, bytes, and offset are part of the deterministic Plan ID and therefore invalidate incompatible checkpoints.</p></section><section class=\"bccd-card\"><h3>6 · Retention / stopping</h3><div class=\"bccd-grid\"><label>Raw score threshold""",
'Cubic crib UI card')

replace_once(ui,
"""<section class=\"bccd-boundary\"><strong>Search boundary:</strong> new canonical packages carry a SHA-256 digest of canonical key material in addition to the legacy 32-bit FNV-1a keyId. SHA-256 matches are strong key-identity evidence; legacy packages fall back to FNV matching. Raw-ciphertext scores remain triage evidence only. Confirm promising plaintext with known-plaintext, file-format, or Information & Deobfuscation analysis.</section>""",
"""<section class=\"bccd-boundary\"><strong>Search boundary:</strong> new canonical packages carry a SHA-256 digest of canonical key material in addition to the legacy 32-bit FNV-1a keyId. SHA-256 matches are strong key-identity evidence; legacy packages fall back to FNV matching. A known-plaintext crib is conditional on the user's assumption: it can prune raw candidates aggressively but cannot prove that the assumption itself is correct. Raw Stage A/Stage B scores remain triage evidence.</section>""",
'Cubic crib evidence boundary')

replace_once(validator, "assert.equal(Cubic.constants.VERSION, '0.1.0');", "assert.equal(Cubic.constants.VERSION, '0.2.0');", 'Cubic validator engine version')

replace_once(validator,
"""assert.ok(Number.isFinite(informationProbe.score));

const plaintext =""",
"""assert.ok(Number.isFinite(informationProbe.score));
const textCrib = Cubic.normalizeCrib({ cribMode: 'text', cribValue: 'KNOWN', cribOffsetBytes: 3 });
assert.equal(textCrib.enabled, true);
assert.equal(textCrib.offsetBytes, 3);
assert.equal(textCrib.hex, Buffer.from('KNOWN', 'utf8').toString('hex'));
assert.equal(Cubic.normalizeCrib({ cribMode: 'signature', cribSignature: 'PNG' }).hex, '89504e470d0a1a0a');
assert.throws(() => Cubic.normalizeCrib({ cribMode: 'hex', cribValue: 'abc' }), /complete hexadecimal bytes/);

const plaintext =""",
'Cubic validator crib normalization')

replace_once(validator,
"""assert.throws(() => Cubic.validateCheckpoint(checkpoint, otherPlan), /different deterministic search plan/);

// True worker-level deterministic brute force:""",
"""assert.throws(() => Cubic.validateCheckpoint(checkpoint, otherPlan), /different deterministic search plan/);
const cribPlan = Cubic.buildSearchPlan(rawSource, { profiles: ['direct-permutation'], usePackageMetadata: false, maxGridSize: 4, seedStart: 0, seedEnd: 3, seedTemplates: ['{n}'], includeFixedSeeds: false, orientationMode: 'manual', capacityMode: 'manual', payloadCapacity: directPackage.payloadCapacity, inputFace: 'top', outputFace: 'front', cribMode: 'text', cribValue: 'H', cribOffsetBytes: 0 });
assert.notEqual(cribPlan.planId, broadPlan.planId, 'Known-plaintext assumptions must be part of the deterministic Plan ID.');
assert.throws(() => Cubic.validateCheckpoint(checkpoint, cribPlan), /different deterministic search plan/, 'A checkpoint created under different crib assumptions must be rejected.');

// True worker-level deterministic brute force:""",
'Cubic validator crib Plan ID contract')

replace_once(validator,
"""assert.equal(Cubic.validateCheckpoint(resumedWorkerResult.checkpoint, resumedWorkerResult.plan).cursor, 438);

for (const required of [
""",
"""assert.equal(Cubic.validateCheckpoint(resumedWorkerResult.checkpoint, resumedWorkerResult.plan).cursor, 438);

// Raw-ciphertext known-plaintext search: high score threshold cannot hide a correct crib match, and sample depth expands automatically.
const cribSeed = '23';
const cribText = 'KNOWN-PLAINTEXT-CRIB::opaque binary tail 0123456789';
const cribPlaintext = utf8Bits(cribText);
const cribKey = Research.generateResearchKey('iterative-chain', cribSeed, 4, workerBaseOptions);
const cribPackage = Engine.encryptBinary(cribPlaintext, cribKey);
const cribRawSource = Cubic.sourceFromRaw(cribPackage.ciphertext, { inputFace: 'top', outputFace: 'front', inputQuarterTurns: 0, outputQuarterTurns: 0, payloadCapacity: cribPackage.payloadCapacity, originalBitLength: cribPlaintext.length });
const cribSearchOptions = { profiles: ['iterative-chain'], usePackageMetadata: false, maxGridSize: 4, seedStart: 0, seedEnd: 40, seedTemplates: ['{n}'], includeFixedSeeds: false, orientationMode: 'manual', capacityMode: 'manual', inputFace: 'top', outputFace: 'front', payloadCapacity: cribPackage.payloadCapacity, originalBitLength: cribPlaintext.length, scoreThreshold: 100, resultLimit: 8, sampleBlocks: 1, cribMode: 'text', cribValue: 'KNOWN-PLAINTEXT-CRIB', cribOffsetBytes: 0, maxAttemptsThisRun: 0, progressEvery: 10 };
const cribPlanA = Cubic.buildSearchPlan(cribRawSource, cribSearchOptions);
const cribPlanB = Cubic.buildSearchPlan(cribRawSource, { ...cribSearchOptions, cribValue: 'WRONG-PLAINTEXT-CRIB' });
assert.notEqual(cribPlanA.planId, cribPlanB.planId, 'Changing crib bytes must change the deterministic Plan ID.');
const cribHarness = createWorkerHarness();
const cribResult = resultMessage(cribHarness.run({ id: 1003, operation: 'search', source: { kind: 'raw', bits: cribRawSource.bits, framing: cribRawSource.framing }, options: cribSearchOptions, resumeCursor: 0 }), 'Crib-assisted raw worker run');
assert.equal(cribResult.exhausted, true);
const cribCandidate = cribResult.candidates.find(candidate => candidate.seed === cribSeed);
assert.ok(cribCandidate, 'Known-plaintext crib must retain the correct raw candidate even when Stage A threshold is 100.');
assert.equal(cribCandidate.cribMatch, true);
assert.equal(cribCandidate.exactFingerprintMatch, false);
assert.equal(cribCandidate.identityStrength, 'known-plaintext-crib');
assert.ok(cribCandidate.plaintextBits.length >= Buffer.byteLength('KNOWN-PLAINTEXT-CRIB') * 8, 'Crib matching must automatically decrypt enough blocks to reach the known plaintext.');
const wrongCribCandidate = Cubic.attemptCandidate(cribRawSource, { stageId: 'iterative-chain:small', profile: 'iterative-chain', gridSize: 4, orientation: { inputFace: 'top', outputFace: 'front', inputQuarterTurns: 0, outputQuarterTurns: 0 }, payloadCapacity: cribPackage.payloadCapacity, seed: cribSeed, seedSource: '{n}' }, { ...cribSearchOptions, cribValue: 'DEFINITELY-WRONG-CRIB' });
assert.equal(wrongCribCandidate, null, 'A raw candidate that contradicts the configured crib must be pruned before scoring.');

for (const required of [
""",
'Cubic validator raw crib search')

replace_once(validator,
"""  'updatePlanRuntimeEstimates('
]) assert.ok(ui.includes(required), `UI is missing ${JSON.stringify(required)}`);
""",
"""  'updatePlanRuntimeEstimates(',
  'Known plaintext / crib pruning',
  'bccd-crib-mode',
  'bccd-crib-offset',
  'KNOWN-PLAINTEXT CRIB MATCH'
]) assert.ok(ui.includes(required), `UI is missing ${JSON.stringify(required)}`);
""",
'Cubic validator crib UI contract')

replace_once(validator,
"""  'attemptsPerSecond',
  \"stopReason = 'attempt-budget'\"
""",
"""  'attemptsPerSecond',
  'Cubic.normalizeCrib',
  'candidate.cribMatch',
  \"stopReason = 'attempt-budget'\"
""",
'Cubic validator crib worker contract')

replace_once(validator, "schema: '0.4.0'", "schema: '0.5.0'", 'Cubic crib receipt version')

replace_once(validator,
"""    exactPlaintextRecovery: resumedWorkerResult.exactMatch.plaintextBits === workerPlaintext
""",
"""    exactPlaintextRecovery: resumedWorkerResult.exactMatch.plaintextBits === workerPlaintext,
    cribSearch: { planId: cribPlanA.planId, recoveredSeed: cribCandidate.seed, matched: cribCandidate.cribMatch, sampleExpanded: cribCandidate.plaintextBits.length >= Buffer.byteLength('KNOWN-PLAINTEXT-CRIB') * 8 }
""",
'Cubic crib validation receipt')

replace_once('scientific-tools-entry.js', f"const ASSET_VERSION = '{OLD_VERSION}';", f"const ASSET_VERSION = '{NEW_VERSION}';", 'Scientific Tools crib cache seal')
replace_once('app-lite-view-mounts.js', f"loadScript('scientific-tools-entry.js?v={OLD_VERSION}')", f"loadScript('scientific-tools-entry.js?v={NEW_VERSION}')", 'Top-level crib cache seal')
replace_once(scientific_validator, f"loadScript('scientific-tools-entry.js?v={OLD_VERSION}')", f"loadScript('scientific-tools-entry.js?v={NEW_VERSION}')", 'Scientific Tools validator crib top cache')
replace_once(scientific_validator, f"const ASSET_VERSION = '{OLD_VERSION}';", f"const ASSET_VERSION = '{NEW_VERSION}';", 'Scientific Tools validator crib cache')
replace_once(scientific_validator, "schemaVersion: '0.20.0'", "schemaVersion: '0.21.0'", 'Scientific Tools crib ownership receipt')

print('Cubic known-plaintext crib search applied or already present.')
