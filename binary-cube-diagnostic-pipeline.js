(function installBinaryCubeDiagnosticPipeline(root, factory) {
  'use strict';
  const api = factory(root || globalThis);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.BinaryCubeDiagnosticPipeline = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function createBinaryCubeDiagnosticPipeline(root) {
  'use strict';

  const VERSION = '0.1.0';
  const REPORT_FORMAT = 'hb-ttrpg-scientific-diagnostic-pipeline-report';
  const REPORT_SCHEMA_VERSION = '0.1.0';
  const MAX_INPUT_BYTES = 64 * 1024 * 1024;
  const PROFILES = Object.freeze({
    triage: Object.freeze({ id: 'triage', label: 'Triage', deep: false, exhaustive: false, concurrency: 2, candidateLimit: 12 }),
    thorough: Object.freeze({ id: 'thorough', label: 'Thorough', deep: true, exhaustive: false, concurrency: 2, candidateLimit: 40 }),
    exhaustive: Object.freeze({ id: 'exhaustive', label: 'Exhaustive', deep: true, exhaustive: true, concurrency: 2, candidateLimit: 80 })
  });

  const MAGIC = Object.freeze([
    Object.freeze({ id: 'png', label: 'PNG image', bytes: Object.freeze([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]), classId: 'raster-image', mime: 'image/png' }),
    Object.freeze({ id: 'jpeg', label: 'JPEG image', bytes: Object.freeze([0xff,0xd8,0xff]), classId: 'raster-image', mime: 'image/jpeg' }),
    Object.freeze({ id: 'gif', label: 'GIF image', bytes: Object.freeze([0x47,0x49,0x46,0x38]), classId: 'raster-image', mime: 'image/gif' }),
    Object.freeze({ id: 'riff', label: 'RIFF container', bytes: Object.freeze([0x52,0x49,0x46,0x46]), classId: 'media-container', mime: 'application/riff' }),
    Object.freeze({ id: 'pdf', label: 'PDF document', bytes: Object.freeze([0x25,0x50,0x44,0x46]), classId: 'document', mime: 'application/pdf' }),
    Object.freeze({ id: 'zip', label: 'ZIP-family archive', bytes: Object.freeze([0x50,0x4b,0x03,0x04]), classId: 'archive', mime: 'application/zip' }),
    Object.freeze({ id: 'gzip', label: 'GZIP stream', bytes: Object.freeze([0x1f,0x8b]), classId: 'archive', mime: 'application/gzip' }),
    Object.freeze({ id: '7zip', label: '7-Zip archive', bytes: Object.freeze([0x37,0x7a,0xbc,0xaf,0x27,0x1c]), classId: 'archive', mime: 'application/x-7z-compressed' }),
    Object.freeze({ id: 'rar', label: 'RAR archive', bytes: Object.freeze([0x52,0x61,0x72,0x21,0x1a,0x07]), classId: 'archive', mime: 'application/vnd.rar' }),
    Object.freeze({ id: 'elf', label: 'ELF executable', bytes: Object.freeze([0x7f,0x45,0x4c,0x46]), classId: 'executable', mime: 'application/x-elf' }),
    Object.freeze({ id: 'pe', label: 'PE / DOS executable', bytes: Object.freeze([0x4d,0x5a]), classId: 'executable', mime: 'application/vnd.microsoft.portable-executable' })
  ]);

  const DETECTOR_DEFINITIONS = Object.freeze([
    Object.freeze({ id: 'acquisition-profile', stage: 0, order: 0, family: 'acquisition', independenceGroup: 'format', cost: 'low', profiles: ['triage','thorough','exhaustive'] }),
    Object.freeze({ id: 'information-structure', stage: 1, order: 10, family: 'information', independenceGroup: 'statistics', cost: 'medium', profiles: ['triage','thorough','exhaustive'] }),
    Object.freeze({ id: 'media-forensic-sweep', stage: 1, order: 20, family: 'media', independenceGroup: 'bit-container-signal', cost: 'medium', profiles: ['triage','thorough','exhaustive'] }),
    Object.freeze({ id: 'binary-cube-structure', stage: 2, order: 30, family: 'binary-cube', independenceGroup: 'known-format', cost: 'medium', profiles: ['triage','thorough','exhaustive'] }),
    Object.freeze({ id: 'text-unicode-steganalysis', stage: 2, order: 40, family: 'text', independenceGroup: 'unicode', cost: 'low', profiles: ['triage','thorough','exhaustive'] }),
    Object.freeze({ id: 'png-structure', stage: 2, order: 50, family: 'raster', independenceGroup: 'container-metadata', cost: 'low', profiles: ['triage','thorough','exhaustive'] }),
    Object.freeze({ id: 'jpeg-coefficients', stage: 2, order: 60, family: 'raster', independenceGroup: 'coefficient-domain', cost: 'high', profiles: ['thorough','exhaustive'] }),
    Object.freeze({ id: 'raster-steganalysis', stage: 2, order: 70, family: 'raster', independenceGroup: 'pixel-domain', cost: 'high', profiles: ['thorough','exhaustive'] }),
    Object.freeze({ id: 'deobfuscation-sweep', stage: 3, order: 80, family: 'deobfuscation', independenceGroup: 'transform-search', cost: 'high', profiles: ['thorough','exhaustive'] }),
    Object.freeze({ id: 'binary-cube-attack-suite', stage: 3, order: 90, family: 'binary-cube', independenceGroup: 'cryptanalytic-attack', cost: 'high', profiles: ['exhaustive'] })
  ]);

  const clamp = (value, minimum = 0, maximum = 1) => Math.max(minimum, Math.min(maximum, Number(value) || 0));
  const asBytes = value => value instanceof Uint8Array ? value : value instanceof ArrayBuffer ? new Uint8Array(value) : ArrayBuffer.isView(value) ? new Uint8Array(value.buffer, value.byteOffset, value.byteLength) : Uint8Array.from(value || []);
  function fail(message) { throw new Error(message); }

  function optionalRequire(path) {
    if (typeof module !== 'object' || !module.exports || typeof require !== 'function') return null;
    try { return require(path); } catch (_) { return null; }
  }

  function dependencies() {
    return Object.freeze({
      information: root?.BinaryCubeInformationAnalysisSuite || optionalRequire('./binary-cube-information-analysis-suite.js'),
      media: root?.BinaryCubeMediaForensicsSuite || optionalRequire('./binary-cube-media-forensics-suite.js'),
      steganalysis: root?.BinaryCubeSteganalysisEngine || optionalRequire('./binary-cube-steganalysis-engine.js'),
      cubeDashboard: root?.BinaryCubeDecryptionDashboard || optionalRequire('./binary-cube-decryption-dashboard.js'),
      runner: root?.ScientificToolsCooperativeRunner || null
    });
  }

  function bytesStartWith(bytes, signature) {
    if (bytes.length < signature.length) return false;
    for (let index = 0; index < signature.length; index += 1) if (bytes[index] !== signature[index]) return false;
    return true;
  }

  function decodeText(bytes) {
    if (typeof TextDecoder !== 'undefined') {
      try { return new TextDecoder('utf-8', { fatal: false }).decode(bytes); } catch (_) { /* fallback below */ }
    }
    if (typeof Buffer !== 'undefined') return Buffer.from(bytes).toString('utf8');
    return Array.from(bytes, byte => byte >= 32 && byte <= 126 || byte === 9 || byte === 10 || byte === 13 ? String.fromCharCode(byte) : '�').join('');
  }

  function printableFraction(bytesValue) {
    const bytes = asBytes(bytesValue);
    if (!bytes.length) return 0;
    let printable = 0;
    for (const byte of bytes) if ((byte >= 32 && byte <= 126) || byte === 9 || byte === 10 || byte === 13) printable += 1;
    return printable / bytes.length;
  }

  function byteEntropy(bytesValue) {
    const bytes = asBytes(bytesValue);
    if (!bytes.length) return 0;
    const counts = new Uint32Array(256);
    for (const byte of bytes) counts[byte] += 1;
    let entropy = 0;
    for (const count of counts) if (count) { const p = count / bytes.length; entropy -= p * Math.log2(p); }
    return entropy;
  }

  function bitOneFraction(bytesValue) {
    const bytes = asBytes(bytesValue);
    if (!bytes.length) return 0;
    let ones = 0;
    for (const byte of bytes) {
      let value = byte;
      while (value) { ones += value & 1; value >>>= 1; }
    }
    return ones / (bytes.length * 8);
  }

  function uniqueByteFraction(bytesValue) {
    const bytes = asBytes(bytesValue);
    if (!bytes.length) return 0;
    const seen = new Uint8Array(256);
    let unique = 0;
    for (const byte of bytes) if (!seen[byte]) { seen[byte] = 1; unique += 1; }
    return unique / 256;
  }

  function parseKnownArtifact(bytesValue) {
    const bytes = asBytes(bytesValue);
    const text = decodeText(bytes).trim();
    if (!text.startsWith('{')) return null;
    try {
      const object = JSON.parse(text);
      if (!object || typeof object !== 'object' || Array.isArray(object)) return null;
      if (object.format === 'hb-ttrpg-shadowrun-binary-cube-package') return Object.freeze({ kind: 'binary-cube-package', object });
      if (object.format === 'hb-ttrpg-binary-cube-secure-export') return Object.freeze({ kind: 'binary-cube-secure-export', object });
      return null;
    } catch (_) { return null; }
  }

  function classifyAsset(bytesValue, hints = {}) {
    const bytes = asBytes(bytesValue);
    if (!bytes.length) fail('Diagnostic pipeline input is empty.');
    if (bytes.length > MAX_INPUT_BYTES) fail(`Diagnostic pipeline input exceeds ${MAX_INPUT_BYTES.toLocaleString()} bytes.`);
    const artifact = parseKnownArtifact(bytes);
    if (artifact) return Object.freeze({ classId: 'binary-cube-artifact', subtype: artifact.kind, label: artifact.kind.replaceAll('-', ' '), mime: 'application/json', confidence: 1, artifact: artifact.object, reasons: Object.freeze(['Recognized canonical Binary Cube artifact format.']) });
    const magic = MAGIC.find(item => bytesStartWith(bytes, item.bytes));
    if (magic) {
      let subtype = magic.id;
      let label = magic.label;
      let mime = magic.mime;
      if (magic.id === 'riff' && bytes.length >= 12 && String.fromCharCode(...bytes.slice(8,12)) === 'WAVE') { subtype = 'wav'; label = 'RIFF/WAVE audio'; mime = 'audio/wav'; }
      return Object.freeze({ classId: subtype === 'wav' ? 'audio' : magic.classId, subtype, label, mime, confidence: 0.99, artifact: null, reasons: Object.freeze([`Magic signature matched ${label}.`]) });
    }
    const suppliedMime = String(hints.mimeType || '').toLowerCase();
    if (suppliedMime.startsWith('image/')) return Object.freeze({ classId: 'raster-image', subtype: suppliedMime.slice(6), label: suppliedMime, mime: suppliedMime, confidence: 0.7, artifact: null, reasons: Object.freeze(['Caller supplied an image MIME type without a recognized magic signature.']) });
    if (suppliedMime.startsWith('audio/')) return Object.freeze({ classId: 'audio', subtype: suppliedMime.slice(6), label: suppliedMime, mime: suppliedMime, confidence: 0.7, artifact: null, reasons: Object.freeze(['Caller supplied an audio MIME type without a recognized magic signature.']) });
    const printable = printableFraction(bytes);
    if (printable >= 0.88) return Object.freeze({ classId: 'text', subtype: 'utf8-like', label: 'Text-like data', mime: suppliedMime || 'text/plain', confidence: clamp(0.55 + printable * 0.4), artifact: null, reasons: Object.freeze([`${(printable * 100).toFixed(1)}% of bytes are printable/control text characters.`]) });
    return Object.freeze({ classId: 'opaque-binary', subtype: 'raw', label: 'Opaque binary data', mime: suppliedMime || 'application/octet-stream', confidence: 0.55, artifact: null, reasons: Object.freeze(['No supported magic signature or strong text classification matched.']) });
  }

  function applicability(definition, classification, options, deps) {
    const profile = options.profile;
    if (!definition.profiles.includes(profile.id)) return Object.freeze({ applicable: false, weight: 0, reason: `Not selected by ${profile.label} profile.` });
    switch (definition.id) {
      case 'acquisition-profile': return Object.freeze({ applicable: true, weight: 1, reason: 'Always records source identity, size, and type evidence.' });
      case 'information-structure': return Object.freeze({ applicable: Boolean(deps.information?.analyzeInformation), weight: 1, reason: deps.information?.analyzeInformation ? 'General statistical/compression evidence applies to all byte streams.' : 'Information Analysis Suite is unavailable.' });
      case 'media-forensic-sweep': return Object.freeze({ applicable: Boolean(deps.media?.fullForensicSweepAsync || deps.media?.fullForensicSweep), weight: 0.9, reason: deps.media ? 'Byte planes, container carving, and WAVE parsing apply to arbitrary files.' : 'Media Forensics Suite is unavailable.' });
      case 'binary-cube-structure': return Object.freeze({ applicable: classification.classId === 'binary-cube-artifact' && Boolean(deps.cubeDashboard?.analyzeSource), weight: 1.2, reason: classification.classId === 'binary-cube-artifact' ? 'Recognized Binary Cube artifact receives canonical dashboard diagnostics.' : 'Not a recognized Binary Cube artifact.' });
      case 'text-unicode-steganalysis': return Object.freeze({ applicable: classification.classId === 'text' && Boolean(deps.steganalysis?.analyzeTextSteganography), weight: 0.8, reason: classification.classId === 'text' ? 'Text-like material can contain zero-width, bidi, variation-selector, or whitespace concealment.' : 'Not text-like material.' });
      case 'png-structure': return Object.freeze({ applicable: classification.subtype === 'png' && Boolean(deps.steganalysis?.inspectPngMetadata), weight: 0.9, reason: classification.subtype === 'png' ? 'PNG chunk and trailing-data structure is directly inspectable.' : 'Not a PNG.' });
      case 'jpeg-coefficients': return Object.freeze({ applicable: classification.subtype === 'jpeg' && Boolean(deps.steganalysis?.inspectJpegCoefficients), weight: 1, reason: classification.subtype === 'jpeg' ? 'JPEG coefficient-domain structure is applicable.' : 'Not a JPEG.' });
      case 'raster-steganalysis': return Object.freeze({ applicable: classification.classId === 'raster-image', weight: 1.2, reason: options.raster ? 'Decoded pixel raster supplied; RS/SPA/localized pixel tests can run.' : 'Raster image detected, but decoded pixels are not available in this runtime.' });
      case 'deobfuscation-sweep': return Object.freeze({ applicable: Boolean(deps.information?.rankDeobfuscationCandidates), weight: 1.1, reason: deps.information?.rankDeobfuscationCandidates ? 'Thorough profile tests reversible encodings and obfuscation hypotheses.' : 'Deobfuscation engine unavailable.' });
      case 'binary-cube-attack-suite': return Object.freeze({ applicable: classification.classId === 'binary-cube-artifact' && Boolean(deps.cubeDashboard?.runAttackSuite), weight: 1.2, reason: classification.classId === 'binary-cube-artifact' ? 'Exhaustive profile runs bounded Binary Cube cryptanalytic attacks.' : 'Not a Binary Cube artifact.' });
      default: return Object.freeze({ applicable: false, weight: 0, reason: 'Unknown detector.' });
    }
  }

  function normalizeProfile(profileValue) {
    const id = String(profileValue || 'thorough').toLowerCase();
    return PROFILES[id] || PROFILES.thorough;
  }

  function buildPlan(bytesValue, optionsValue = {}) {
    const bytes = asBytes(bytesValue);
    const profile = normalizeProfile(optionsValue.profile);
    const options = { ...optionsValue, profile };
    const classification = options.classification || classifyAsset(bytes, options);
    const deps = dependencies();
    const detectors = DETECTOR_DEFINITIONS.map(definition => {
      const app = applicability(definition, classification, options, deps);
      return Object.freeze({ ...definition, ...app });
    });
    return Object.freeze({ profile, classification, detectors: Object.freeze(detectors), stages: Object.freeze([...new Set(detectors.filter(item => item.applicable).map(item => item.stage))].sort((a,b) => a-b)) });
  }

  function finding(definition, values = {}) {
    return Object.freeze({
      detectorId: definition.id,
      family: definition.family,
      independenceGroup: definition.independenceGroup,
      stage: definition.stage,
      order: definition.order,
      status: values.status || 'informational',
      positiveEvidence: clamp(values.positiveEvidence || 0),
      negativeEvidence: clamp(values.negativeEvidence || 0),
      reliability: clamp(values.reliability == null ? 0.7 : values.reliability),
      sampleSufficiency: clamp(values.sampleSufficiency == null ? 1 : values.sampleSufficiency),
      sensitivity: Object.freeze(Array.from(values.sensitivity || [])),
      metrics: Object.freeze(values.metrics || {}),
      notes: Object.freeze(Array.from(values.notes || [])),
      raw: values.raw ?? null
    });
  }

  function sampleSufficiency(bytesLength, target = 4096) { return clamp(Math.log2(Math.max(2, bytesLength)) / Math.log2(Math.max(4, target))); }

  async function executeDetector(definition, context) {
    const { bytes, classification, options, deps, sourceName } = context;
    if (context.token?.cancelled) { const error = new Error(context.token.reason || 'Diagnostic pipeline cancelled.'); error.name = 'AbortError'; throw error; }
    if (definition.id === 'acquisition-profile') {
      return finding(definition, { status: 'informational', reliability: 1, sampleSufficiency: 1, metrics: { sourceName, byteLength: bytes.length, classId: classification.classId, subtype: classification.subtype, classifierConfidence: classification.confidence, entropy: byteEntropy(bytes), printableFraction: printableFraction(bytes), bitOneFraction: bitOneFraction(bytes), uniqueByteFraction: uniqueByteFraction(bytes) }, notes: classification.reasons, sensitivity: ['format-signature', 'text-likeness', 'basic-byte-profile'] });
    }
    if (definition.id === 'information-structure') {
      const analysis = await deps.information.analyzeInformation(bytes, { windowSize: options.windowSize || 256, minimumStringLength: options.minimumStringLength || 5 });
      const randomLike = String(analysis.evidenceClass || '').includes('random-like');
      const positive = randomLike ? 0.28 : clamp(analysis.evidenceScore / 100);
      const negative = randomLike ? 0.05 : clamp((35 - analysis.evidenceScore) / 100);
      return finding(definition, { status: positive >= 0.65 ? 'positive' : positive >= 0.35 ? 'mixed' : randomLike ? 'inconclusive' : 'negative', positiveEvidence: positive, negativeEvidence: negative, reliability: 0.78, sampleSufficiency: sampleSufficiency(bytes.length, 8192), metrics: { evidenceScore: analysis.evidenceScore, evidenceClass: analysis.evidenceClass, entropy: analysis.entropy, compressionRatio: analysis.compressionRatio, printableFraction: analysis.printableFraction, encodingLayers: analysis.encodingLayers, signatureCount: analysis.signatures.length, stringCount: analysis.strings.length, strongestLags: analysis.strongestLags.slice(0,4) }, notes: [analysis.caveat], sensitivity: ['compressible-structure', 'encoding-layers', 'language-like-content', 'repeating-structure', 'random-like-encryption-or-compression'], raw: analysis });
    }
    if (definition.id === 'media-forensic-sweep') {
      const report = deps.media.fullForensicSweepAsync ? await deps.media.fullForensicSweepAsync(bytes, { onProgress: update => context.emitSubprogress?.(definition, update.fraction || 0, update.stage || 'Media forensic sweep') }) : deps.media.fullForensicSweep(bytes);
      const container = report.bytes?.container || {};
      const candidates = report.bytes?.candidates || [];
      const signatureCandidates = candidates.filter(candidate => candidate.signature).length;
      const readableCandidates = candidates.filter(candidate => Number(candidate.printable) >= 0.75).length;
      const trailing = Number(container.trailingBytes || 0);
      const positive = clamp((trailing ? 0.7 : 0) + Math.min(0.25, signatureCandidates * 0.08) + Math.min(0.15, readableCandidates * 0.03));
      return finding(definition, { status: positive >= 0.6 ? 'positive' : positive >= 0.2 ? 'mixed' : 'negative', positiveEvidence: positive, negativeEvidence: positive < 0.2 ? 0.35 : 0.05, reliability: 0.72, sampleSufficiency: sampleSufficiency(bytes.length, 4096), metrics: { detectedContainer: container.type || null, trailingBytes: trailing, trailingSignature: container.trailingSignature || null, packedCandidateCount: candidates.length, signatureCandidateCount: signatureCandidates, readableCandidateCount: readableCandidates, wavDetected: Boolean(report.wav) }, notes: [report.caveat], sensitivity: ['appended-data', 'container-boundaries', 'packed-bitplanes', 'raw-pcm-wave', 'basic-carving'], raw: report });
    }
    if (definition.id === 'binary-cube-structure') {
      const source = deps.cubeDashboard.parseSourceBytes(bytes, sourceName);
      const analysis = deps.cubeDashboard.analyzeSource(source);
      return finding(definition, { status: 'positive', positiveEvidence: 1, negativeEvidence: 0, reliability: 1, sampleSufficiency: 1, metrics: { sourceKind: source.kind, bitLength: source.bits.length, candidateGridSizes: analysis.candidateGridSizes || analysis.gridCandidates || [], byteEntropy: analysis.byteEntropy, oneDensity: analysis.oneDensity }, notes: ['Recognized Binary Cube artifact is positive format evidence; this does not mean its plaintext has been recovered.'], sensitivity: ['known-binary-cube-format', 'cube-block-alignment', 'ciphertext-structure'], raw: analysis });
    }
    if (definition.id === 'text-unicode-steganalysis') {
      const report = deps.steganalysis.analyzeTextSteganography(decodeText(bytes));
      const count = Array.isArray(report.suspicious) ? report.suspicious.length : Object.values(report.counts || {}).reduce((sum, value) => sum + (Number(value) || 0), 0);
      const positive = clamp(count / 6);
      return finding(definition, { status: count ? 'positive' : 'negative', positiveEvidence: positive, negativeEvidence: count ? 0 : 0.55, reliability: 0.86, sampleSufficiency: sampleSufficiency(bytes.length, 1024), metrics: { suspiciousFindingCount: count, counts: report.counts }, notes: [report.caveat || 'Unicode control characters may be legitimate; inspect context before inferring concealment.'], sensitivity: ['zero-width-characters', 'bidi-controls', 'variation-selectors', 'trailing-whitespace'], raw: report });
    }
    if (definition.id === 'png-structure') {
      const report = deps.steganalysis.inspectPngMetadata(bytes);
      const textChunks = report.textChunks?.length || 0;
      const trailing = report.trailingBytes || 0;
      const positive = clamp((trailing ? 0.75 : 0) + Math.min(0.25, textChunks * 0.08));
      return finding(definition, { status: positive >= 0.6 ? 'positive' : textChunks ? 'mixed' : 'negative', positiveEvidence: positive, negativeEvidence: positive ? 0.05 : 0.45, reliability: 0.9, sampleSufficiency: 1, metrics: { valid: report.valid, chunkCount: report.chunks?.length || 0, textChunkCount: textChunks, trailingBytes: trailing }, notes: ['Ancillary metadata is not inherently covert; trailing bytes and unexpected chunk contents require contextual review.'], sensitivity: ['png-chunks', 'png-text-metadata', 'post-iend-data'], raw: report });
    }
    if (definition.id === 'jpeg-coefficients') {
      const metadata = deps.steganalysis.inspectJpegMetadata(bytes);
      const coefficients = deps.steganalysis.inspectJpegCoefficients(bytes);
      const supported = coefficients.supported === true;
      let imbalance = 0;
      if (supported) imbalance = Math.max(0, ...coefficients.components.map(component => Number(component.oddEvenImbalance || 0)));
      const positive = supported ? clamp((0.08 - imbalance) / 0.08) * 0.2 : 0;
      return finding(definition, { status: supported ? (positive > 0.15 ? 'mixed' : 'informational') : 'inconclusive', positiveEvidence: positive, negativeEvidence: 0, reliability: supported ? 0.55 : 0.2, sampleSufficiency: supported ? sampleSufficiency(coefficients.components.reduce((sum, component) => sum + (component.blocks || 0), 0), 2048) : 0.2, metrics: { metadataSegmentCount: metadata.segments?.length || 0, coefficientDecodeSupported: supported, reason: coefficients.reason || null, componentCount: coefficients.components?.length || 0, maximumOddEvenImbalance: imbalance }, notes: [coefficients.caveat || coefficients.reason || 'JPEG coefficient statistics are a forensic feature set, not a specific embedding verdict.'], sensitivity: ['jpeg-metadata', 'baseline-dct-coefficients', 'odd-even-coefficient-populations'], raw: { metadata, coefficients } });
    }
    if (definition.id === 'raster-steganalysis') {
      if (!options.raster) return finding(definition, { status: 'inconclusive', reliability: 0.1, sampleSufficiency: 0, notes: ['Pixel-domain detectors were applicable but could not run because this runtime did not provide decoded pixels.'], sensitivity: ['lsb-replacement', 'localized-pixel-anomalies'] });
      const raster = options.raster;
      const report = deps.steganalysis.localizedRasterAnalysis(raster.rgba, raster.width, raster.height, { tileSize: options.tileSize || 64, channel: options.rasterChannel || 'luma' });
      const rs = report.global?.rs;
      const spa = report.global?.spa;
      const estimates = [rs?.valid ? rs.estimatedPayloadRate : null, spa?.valid ? spa.estimatedPayloadRate : null].filter(value => Number.isFinite(value));
      const consensus = estimates.length ? estimates.reduce((sum, value) => sum + value, 0) / estimates.length : 0;
      const agreement = estimates.length >= 2 ? 1 - Math.min(1, Math.abs(estimates[0] - estimates[1])) : 0.35;
      const positive = clamp(consensus * agreement);
      return finding(definition, { status: estimates.length ? (positive >= 0.35 ? 'positive' : positive >= 0.12 ? 'mixed' : 'negative') : 'inconclusive', positiveEvidence: positive, negativeEvidence: estimates.length && positive < 0.12 ? 0.35 : 0, reliability: clamp(0.45 + agreement * 0.4), sampleSufficiency: sampleSufficiency(raster.width * raster.height, 65536), metrics: { width: raster.width, height: raster.height, rsEstimate: rs?.estimatedPayloadRate ?? null, spaEstimate: spa?.estimatedPayloadRate ?? null, detectorAgreement: agreement, consensusPayloadEstimate: consensus, tileCount: report.tiles?.length || 0 }, notes: ['RS/SPA payload estimates apply to specific randomized LSB-replacement assumptions and are not universal steganography probabilities.'], sensitivity: ['randomized-lsb-replacement', 'localized-pixel-anomalies', 'residual-roughness'], raw: report });
    }
    if (definition.id === 'deobfuscation-sweep') {
      const candidates = await deps.information.rankDeobfuscationCandidates(bytes, { token: context.token, limit: options.profile.candidateLimit, singleByteXor: true, repeatingXor: true, onProgress: update => context.emitSubprogress?.(definition, update.fraction || 0, update.label || 'Deobfuscation sweep') });
      const best = candidates[0] || null;
      const strong = best ? clamp((best.score - 55) / 45) : 0;
      return finding(definition, { status: strong >= 0.5 ? 'positive' : best ? 'mixed' : 'negative', positiveEvidence: strong, negativeEvidence: best && best.score < 40 ? 0.25 : 0.05, reliability: 0.62, sampleSufficiency: sampleSufficiency(bytes.length, 4096), metrics: { candidateCount: candidates.length, topMethod: best?.method || null, topScore: best?.score || 0, topPrintable: best?.printable || 0, topUtf8: best?.utf8 || 0, topSignatureCount: best?.signatures?.length || 0 }, notes: ['Candidate ranking is a search heuristic. A high-ranked reversible transform requires semantic or format corroboration before it is called recovery.'], sensitivity: ['common-codecs', 'single-byte-xor', 'repeating-xor', 'bitplanes', 'endianness', 'transposition', 'simple-text-ciphers'], raw: candidates });
    }
    if (definition.id === 'binary-cube-attack-suite') {
      const source = deps.cubeDashboard.parseSourceBytes(bytes, sourceName);
      const results = await deps.cubeDashboard.runAttackSuite(source, { token: context.token, resultLimit: options.profile.candidateLimit, singleByteXor: true, onProgress: update => context.emitSubprogress?.(definition, update.fraction || 0, update.label || 'Binary Cube attack suite') });
      const best = results[0] || null;
      const positive = best ? clamp((Number(best.score || 0) - 55) / 45) : 0;
      return finding(definition, { status: positive >= 0.55 ? 'positive' : results.length ? 'mixed' : 'negative', positiveEvidence: positive, negativeEvidence: results.length ? 0 : 0.2, reliability: 0.7, sampleSufficiency: sampleSufficiency(source.bits.length / 8, 4096), metrics: { resultCount: results.length, topMethod: best?.method || null, topScore: best?.score || 0 }, notes: ['Attack-suite candidates are evidence-ranking aids and do not prove decryption without an independent correctness check.'], sensitivity: ['binary-cube-block-structure', 'reversible-manipulations', 'single-byte-xor', 'crib-scoring'], raw: results });
    }
    return finding(definition, { status: 'inconclusive', reliability: 0, sampleSufficiency: 0, notes: ['Detector is not implemented.'] });
  }

  function aggregateEvidence(plan, findings, errors = []) {
    const planned = plan.detectors.filter(item => item.applicable);
    const plannedWeight = planned.reduce((sum, item) => sum + item.weight, 0) || 1;
    const completedIds = new Set(findings.filter(item => item.status !== 'error' && item.sampleSufficiency > 0).map(item => item.detectorId));
    const completedWeight = planned.filter(item => completedIds.has(item.id)).reduce((sum, item) => sum + item.weight, 0);
    const coverageIndex = clamp(completedWeight / plannedWeight);
    let positiveWeight = 0;
    let negativeWeight = 0;
    let evidenceWeight = 0;
    let sufficiencyWeight = 0;
    let inconclusiveWeight = 0;
    const groups = new Set();
    for (const item of findings) {
      const planItem = planned.find(candidate => candidate.id === item.detectorId);
      const weight = (planItem?.weight || 0.5) * item.reliability * item.sampleSufficiency;
      evidenceWeight += weight;
      positiveWeight += weight * item.positiveEvidence;
      negativeWeight += weight * item.negativeEvidence;
      sufficiencyWeight += (planItem?.weight || 0.5) * item.sampleSufficiency;
      if (item.status === 'inconclusive' || item.status === 'error') inconclusiveWeight += planItem?.weight || 0.5;
      if (item.independenceGroup && (item.positiveEvidence > 0.15 || item.negativeEvidence > 0.15)) groups.add(item.independenceGroup);
    }
    const denominator = Math.max(1e-9, positiveWeight + negativeWeight);
    const presenceIndex = denominator ? clamp(positiveWeight / denominator) : 0;
    const signedEvidence = evidenceWeight ? (positiveWeight - negativeWeight) / evidenceWeight : 0;
    const conclusionAgreement = clamp(Math.abs(signedEvidence));
    const sampleIndex = clamp(sufficiencyWeight / plannedWeight);
    const independenceIndex = clamp(groups.size / 4);
    const certaintyIndex = clamp(coverageIndex * 0.38 + sampleIndex * 0.22 + conclusionAgreement * 0.22 + independenceIndex * 0.18);
    const randomLike = findings.some(item => item.detectorId === 'information-structure' && String(item.metrics?.evidenceClass || '').includes('random-like'));
    const inconclusiveIndex = clamp(inconclusiveWeight / plannedWeight);
    const errorIndex = clamp(errors.length / Math.max(1, planned.length));
    const missRiskIndex = clamp((1 - coverageIndex) * 0.42 + inconclusiveIndex * 0.28 + (randomLike ? 0.18 : 0) + errorIndex * 0.22 + (presenceIndex > 0.35 && certaintyIndex < 0.55 ? 0.12 : 0));
    let classification = 'no-positive-evidence-under-tested-methods';
    if (presenceIndex >= 0.72 && certaintyIndex >= 0.55) classification = 'strong-positive-evidence';
    else if (presenceIndex >= 0.5) classification = 'moderate-or-mixed-positive-evidence';
    else if (missRiskIndex >= 0.55) classification = 'inconclusive-with-material-miss-risk';
    else if (certaintyIndex < 0.35) classification = 'low-certainty-inconclusive';
    return Object.freeze({
      presenceIndex,
      certaintyIndex,
      coverageIndex,
      missRiskIndex,
      sampleIndex,
      independenceIndex,
      classification,
      boundary: 'These are calibrated evidence indices, not posterior probabilities. A low presence index means the selected methods produced little positive evidence; it does not prove absence. Miss-risk rises when applicable methods could not run, detectors are inconclusive, samples are weak, or the input remains random-like/opaque.'
    });
  }

  async function runConcurrent(taskItems, concurrency, worker) {
    const results = new Array(taskItems.length);
    let cursor = 0;
    const count = Math.max(1, Math.min(taskItems.length || 1, concurrency || 1));
    const runners = Array.from({ length: count }, async () => {
      while (true) {
        const index = cursor++;
        if (index >= taskItems.length) return;
        results[index] = await worker(taskItems[index], index);
      }
    });
    await Promise.all(runners);
    return results;
  }

  async function runPipeline(bytesValue, optionsValue = {}) {
    const bytes = asBytes(bytesValue);
    const sourceName = String(optionsValue.sourceName || 'diagnostic-input');
    const profile = normalizeProfile(optionsValue.profile);
    const options = { ...optionsValue, profile };
    const classification = classifyAsset(bytes, options);
    const plan = buildPlan(bytes, { ...options, classification });
    const deps = dependencies();
    const token = options.token || deps.runner?.createToken?.(`Diagnostic pipeline · ${sourceName}`) || { cancelled: false, cancel(reason) { this.cancelled = true; this.reason = reason; } };
    const onProgress = typeof options.onProgress === 'function' ? options.onProgress : null;
    const findings = [];
    const errors = [];
    const applicable = plan.detectors.filter(item => item.applicable);
    const totalWeight = applicable.reduce((sum, item) => sum + item.weight, 0) || 1;
    let completedWeight = 0;
    const emit = (definition, fraction = 0, label = '') => {
      const currentWeight = definition?.weight || 0;
      onProgress?.(Object.freeze({ stage: definition?.stage ?? 0, detectorId: definition?.id || null, label: label || definition?.id || 'Diagnostic pipeline', fraction: clamp((completedWeight + currentWeight * clamp(fraction)) / totalWeight), completedWeight, totalWeight }));
    };
    const context = { bytes, classification, options, deps, sourceName, token, emitSubprogress: emit };
    for (const stage of plan.stages) {
      if (token.cancelled) { const error = new Error(token.reason || 'Diagnostic pipeline cancelled.'); error.name = 'AbortError'; throw error; }
      const stageItems = applicable.filter(item => item.stage === stage).sort((a,b) => a.order - b.order);
      const stageResults = await runConcurrent(stageItems, profile.concurrency, async definition => {
        emit(definition, 0, `Starting ${definition.id}`);
        try {
          const result = await executeDetector(definition, context);
          return { definition, result, error: null };
        } catch (error) {
          if (token.cancelled || error?.name === 'AbortError') throw error;
          return { definition, result: null, error };
        }
      });
      for (const row of stageResults) {
        completedWeight += row.definition.weight;
        if (row.error) {
          errors.push(Object.freeze({ detectorId: row.definition.id, name: row.error.name || 'Error', message: row.error.message || String(row.error) }));
          findings.push(finding(row.definition, { status: 'error', reliability: 0, sampleSufficiency: 0, notes: [row.error.message || String(row.error)] }));
        } else findings.push(row.result);
        emit(row.definition, 1, `${row.definition.id} complete`);
      }
    }
    findings.sort((a,b) => a.order - b.order || a.detectorId.localeCompare(b.detectorId));
    const indices = aggregateEvidence(plan, findings, errors);
    onProgress?.(Object.freeze({ stage: 99, detectorId: null, label: 'Diagnostic pipeline complete', fraction: 1, completedWeight: totalWeight, totalWeight }));
    return Object.freeze({
      format: REPORT_FORMAT,
      schemaVersion: REPORT_SCHEMA_VERSION,
      pipelineVersion: VERSION,
      source: Object.freeze({ sourceName, byteLength: bytes.length, mimeType: String(options.mimeType || classification.mime || '') }),
      profile: Object.freeze({ id: profile.id, label: profile.label, deep: profile.deep, exhaustive: profile.exhaustive }),
      classification,
      plan,
      indices,
      findings: Object.freeze(findings),
      errors: Object.freeze(errors),
      completed: true
    });
  }

  return Object.freeze({
    version: VERSION,
    runPipeline,
    buildPlan,
    classifyAsset,
    aggregateEvidence,
    utilities: Object.freeze({ asBytes, decodeText, printableFraction, byteEntropy, bitOneFraction, uniqueByteFraction, parseKnownArtifact }),
    constants: Object.freeze({ VERSION, REPORT_FORMAT, REPORT_SCHEMA_VERSION, MAX_INPUT_BYTES, PROFILES, MAGIC, DETECTOR_DEFINITIONS })
  });
});
