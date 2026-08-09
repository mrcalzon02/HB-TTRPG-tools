(function installDiagnosticCalibrationRegistry(root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.BinaryCubeDiagnosticCalibrationRegistry = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function createDiagnosticCalibrationRegistry() {
  'use strict';

  const VERSION = '0.1.0';
  const FORMAT = 'hb-ttrpg-scientific-diagnostic-calibration-registry';
  const SCHEMA_VERSION = '0.1.0';
  const SNAPSHOT_FORMAT = 'hb-ttrpg-scientific-diagnostic-calibration-snapshot';
  const RECEIPT_FORMAT = 'hb-ttrpg-scientific-diagnostic-calibration-receipt';
  const SHRINKAGE_CASES = 8;
  const MIN_MEASURED_CASES = 12;
  const clamp = (value, minimum = 0, maximum = 1) => Math.max(minimum, Math.min(maximum, Number(value) || 0));

  const DETECTORS = Object.freeze([
    Object.freeze({ id: 'acquisition-profile', target: 'routing', priorReliability: 1, baseWeight: 1, positiveThreshold: 1, minimumSample: 1, sensitivities: ['format-signature','text-likeness','basic-byte-profile'], blindSpots: ['Does not detect concealed content; routing evidence only.'] }),
    Object.freeze({ id: 'information-structure', target: 'recoverable-structure', priorReliability: 0.78, baseWeight: 1, positiveThreshold: 0.35, minimumSample: 1024, sensitivities: ['compressible-structure','encoding-layers','language-like-content','repeating-structure','random-like-encryption-or-compression'], blindSpots: ['Strong encryption and strong compression can both look random-like.', 'Short samples weaken entropy and compression evidence.'] }),
    Object.freeze({ id: 'media-forensic-sweep', target: 'container-or-bit-signal-anomaly', priorReliability: 0.72, baseWeight: 0.9, positiveThreshold: 0.2, minimumSample: 512, sensitivities: ['appended-data','container-boundaries','packed-bitplanes','raw-pcm-wave','basic-carving'], blindSpots: ['Adaptive embedding may not create obvious raw bit-plane candidates.', 'Decoded media-domain methods are separate detectors.'] }),
    Object.freeze({ id: 'binary-cube-structure', target: 'known-binary-cube-format', priorReliability: 1, baseWeight: 1.2, positiveThreshold: 0.5, minimumSample: 1, sensitivities: ['known-binary-cube-format','cube-block-alignment','ciphertext-structure'], blindSpots: ['Recognizes the canonical artifact; does not establish plaintext recovery.'] }),
    Object.freeze({ id: 'text-unicode-steganalysis', target: 'unicode-text-concealment', priorReliability: 0.86, baseWeight: 0.8, positiveThreshold: 0.15, minimumSample: 128, sensitivities: ['zero-width-characters','bidi-controls','variation-selectors','trailing-whitespace'], blindSpots: ['Visible lexical steganography is outside this detector.', 'Legitimate control characters can create false positives.'] }),
    Object.freeze({ id: 'png-structure', target: 'png-container-concealment', priorReliability: 0.9, baseWeight: 0.9, positiveThreshold: 0.2, minimumSample: 64, sensitivities: ['png-chunks','png-text-metadata','post-iend-data'], blindSpots: ['Pixel-domain LSB hiding can leave PNG chunk structure normal.', 'Ancillary metadata may be legitimate.'] }),
    Object.freeze({ id: 'jpeg-coefficients', target: 'jpeg-coefficient-anomaly', priorReliability: 0.55, baseWeight: 1, positiveThreshold: 0.15, minimumSample: 256, sensitivities: ['jpeg-metadata','baseline-dct-coefficients','odd-even-coefficient-populations'], blindSpots: ['Current decoder intentionally refuses progressive JPEG and restart-interval cases.', 'Coefficient statistics do not identify every embedding method.'] }),
    Object.freeze({ id: 'audio-signal-forensics', target: 'encoded-audio-signal', priorReliability: 0.74, baseWeight: 1.05, positiveThreshold: 0.45, minimumSample: 2048, sensitivities: ['dtmf','binary-fsk','afsk-1200-2200','spectral-carriers'], blindSpots: ['Unknown modulation families require additional demodulators.', 'Music and ordinary tones can resemble carrier peaks without decoded symbol corroboration.'] }),
    Object.freeze({ id: 'raster-steganalysis', target: 'pixel-domain-lsb-concealment', priorReliability: 0.7, baseWeight: 1.2, positiveThreshold: 0.12, minimumSample: 4096, sensitivities: ['randomized-lsb-replacement','localized-pixel-anomalies','residual-roughness'], blindSpots: ['Low payload rates can evade RS/SPA.', 'Adaptive, transform-domain, palette, or keyed sparse embedding can violate detector assumptions.'] }),
    Object.freeze({ id: 'deobfuscation-sweep', target: 'reversible-obfuscation', priorReliability: 0.62, baseWeight: 1.1, positiveThreshold: 0.25, minimumSample: 256, sensitivities: ['common-codecs','single-byte-xor','repeating-xor','bitplanes','endianness','transposition','simple-text-ciphers'], blindSpots: ['Search space is bounded and heuristic.', 'A high-ranked candidate still requires independent format or semantic validation.'] }),
    Object.freeze({ id: 'binary-cube-attack-suite', target: 'binary-cube-cryptanalytic-recovery', priorReliability: 0.7, baseWeight: 1.2, positiveThreshold: 0.25, minimumSample: 256, sensitivities: ['binary-cube-block-structure','reversible-manipulations','single-byte-xor','crib-scoring'], blindSpots: ['A bounded attack does not exhaust the full cryptanalytic search space.', 'Candidate ranking is not proof of decryption.'] }),
    Object.freeze({ id: 'cubic-decryptor-search', target: 'binary-cube-seed-and-generator-search', priorReliability: 0.65, baseWeight: 1.25, positiveThreshold: 0.3, minimumSample: 256, sensitivities: ['candidate-key-generators','seed-ranges','orientation-variants','payload-capacity-variants','plaintext-scoring'], blindSpots: ['Search coverage is finite and depends on the declared seed/generator/framing plan.', 'Failure to find a candidate is evidence only about the explored plan.'], registeredForFutureRouting: true })
  ]);
  const BY_ID = new Map(DETECTORS.map(item => [item.id, item]));

  function detector(id) { return BY_ID.get(String(id || '')) || null; }
  function isObservedPositive(findingValue, detectorValue = null) {
    const finding = findingValue || {};
    const definition = detectorValue || detector(finding.detectorId);
    const threshold = definition?.positiveThreshold ?? 0.25;
    return Number(finding.positiveEvidence || 0) >= threshold || finding.status === 'positive';
  }

  function confusion(receiptsValue, detectorId) {
    let tp = 0; let fp = 0; let tn = 0; let fn = 0; let skipped = 0;
    for (const receipt of Array.from(receiptsValue || [])) {
      if (receipt.detectorId !== detectorId) continue;
      if (!['positive','negative'].includes(receipt.expected)) { skipped += 1; continue; }
      if (receipt.completed === false) { skipped += 1; continue; }
      const observed = Boolean(receipt.observedPositive);
      if (receipt.expected === 'positive' && observed) tp += 1;
      else if (receipt.expected === 'positive') fn += 1;
      else if (observed) fp += 1;
      else tn += 1;
    }
    return Object.freeze({ tp, fp, tn, fn, skipped, cases: tp + fp + tn + fn });
  }

  function safeRate(numerator, denominator) { return denominator ? numerator / denominator : null; }

  function calibrateDetector(detectorId, receiptsValue) {
    const definition = detector(detectorId);
    if (!definition) return null;
    const matrix = confusion(receiptsValue, detectorId);
    const sensitivity = safeRate(matrix.tp, matrix.tp + matrix.fn);
    const specificity = safeRate(matrix.tn, matrix.tn + matrix.fp);
    const precision = safeRate(matrix.tp, matrix.tp + matrix.fp);
    const observedRates = [sensitivity, specificity].filter(Number.isFinite);
    const balancedAccuracy = observedRates.length ? observedRates.reduce((sum, value) => sum + value, 0) / observedRates.length : null;
    const shrinkage = matrix.cases / (matrix.cases + SHRINKAGE_CASES);
    const empirical = balancedAccuracy == null ? definition.priorReliability : balancedAccuracy;
    const effectiveReliability = clamp(definition.priorReliability * (1 - shrinkage) + empirical * shrinkage);
    const effectiveWeight = definition.baseWeight * (0.72 + 0.28 * effectiveReliability);
    let calibrationStatus = 'prior-only';
    if (matrix.cases > 0 && matrix.cases < 4) calibrationStatus = 'sparse';
    else if (matrix.cases < MIN_MEASURED_CASES && matrix.cases > 0) calibrationStatus = 'provisional';
    else if (matrix.cases >= MIN_MEASURED_CASES) calibrationStatus = 'measured';
    return Object.freeze({ detectorId, matrix, sensitivity, specificity, precision, balancedAccuracy, shrinkage, priorReliability: definition.priorReliability, effectiveReliability, baseWeight: definition.baseWeight, effectiveWeight, calibrationStatus });
  }

  function buildSnapshot(receiptsValue = [], metadata = {}) {
    const receipts = Array.from(receiptsValue || [], receipt => Object.freeze({ ...receipt }));
    const detectors = DETECTORS.map(definition => calibrateDetector(definition.id, receipts));
    return Object.freeze({
      format: SNAPSHOT_FORMAT,
      schemaVersion: SCHEMA_VERSION,
      registryVersion: VERSION,
      generatedBy: String(metadata.generatedBy || 'runtime calibration'),
      corpusVersion: String(metadata.corpusVersion || 'unversioned'),
      receiptCount: receipts.length,
      detectors: Object.freeze(detectors),
      receipts: Object.freeze(receipts),
      boundary: 'Calibration measurements describe detector behavior on the tested corpus only. Sparse controls are shrunk toward declared priors; they are not universal false-positive or false-negative probabilities.'
    });
  }

  function calibrationFor(snapshotValue, detectorId) {
    const snapshot = snapshotValue;
    if (!snapshot?.detectors) return calibrateDetector(detectorId, []);
    return snapshot.detectors.find(item => item?.detectorId === detectorId) || calibrateDetector(detectorId, []);
  }

  function effectiveReliability(detectorId, runtimeEstimate, snapshotValue) {
    const calibration = calibrationFor(snapshotValue, detectorId);
    if (!calibration) return clamp(runtimeEstimate == null ? 0.5 : runtimeEstimate);
    const runtime = clamp(runtimeEstimate == null ? calibration.priorReliability : runtimeEstimate);
    const empiricalInfluence = calibration.calibrationStatus === 'prior-only' ? 0 : clamp(calibration.shrinkage * 0.75);
    return clamp(runtime * (1 - empiricalInfluence) + calibration.effectiveReliability * empiricalInfluence);
  }

  function effectiveWeight(detectorId, fallbackWeight, snapshotValue) {
    const calibration = calibrationFor(snapshotValue, detectorId);
    if (!calibration) return Number(fallbackWeight) || 0;
    const fallback = Number(fallbackWeight) || calibration.baseWeight;
    if (calibration.calibrationStatus === 'prior-only') return fallback;
    const influence = clamp(calibration.shrinkage * 0.6);
    return fallback * (1 - influence) + calibration.effectiveWeight * influence;
  }

  const DEFAULT_SNAPSHOT = buildSnapshot([], { generatedBy: 'registry priors', corpusVersion: 'none' });

  return Object.freeze({
    version: VERSION,
    detector,
    isObservedPositive,
    confusion,
    calibrateDetector,
    buildSnapshot,
    calibrationFor,
    effectiveReliability,
    effectiveWeight,
    defaultSnapshot: DEFAULT_SNAPSHOT,
    constants: Object.freeze({ VERSION, FORMAT, SCHEMA_VERSION, SNAPSHOT_FORMAT, RECEIPT_FORMAT, SHRINKAGE_CASES, MIN_MEASURED_CASES, DETECTORS })
  });
});
