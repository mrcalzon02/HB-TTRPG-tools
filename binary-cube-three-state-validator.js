(function installBinaryCubeThreeStateValidator(root, factory) {
  'use strict';
  const api = factory(
    typeof module === 'object' && module.exports
      ? require('./shadowrun-binary-cube-engine.js')
      : root && root.ShadowrunBinaryCubeEngine,
    typeof module === 'object' && module.exports
      ? require('./binary-cube-pre-entry-mask.js')
      : root && root.BinaryCubePreEntryMask
  );
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.BinaryCubeThreeStateValidator = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function createBinaryCubeThreeStateValidator(engine, preEntryMask) {
  'use strict';

  if (!engine) throw new Error('BinaryCubeThreeStateValidator requires ShadowrunBinaryCubeEngine.');

  const PROTOCOL_ID = 'binary-cube-three-state-validation-v1';
  const SCHEMA_VERSION = '1.1.0';

  function deepClone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function nowMs() {
    if (typeof performance !== 'undefined' && performance && typeof performance.now === 'function') return performance.now();
    if (typeof process !== 'undefined' && process.hrtime && typeof process.hrtime.bigint === 'function') return Number(process.hrtime.bigint()) / 1e6;
    return Date.now();
  }

  function normalizeBits(value, label = 'Test payload') {
    const compact = String(value ?? '').replace(/\s+/g, '');
    if (!compact) throw new Error(`${label} must contain at least one binary digit.`);
    if (/[^01]/.test(compact)) throw new Error(`${label} may contain only 0, 1, and whitespace.`);
    return compact;
  }

  function materializePayload(spec) {
    if (!spec || typeof spec !== 'object' || Array.isArray(spec)) throw new Error('A test payload specification object is required.');
    if (spec.type === 'literal') return normalizeBits(spec.value, 'Literal test payload');
    if (spec.type === 'repeat') {
      const pattern = normalizeBits(spec.pattern, 'Repeat pattern');
      const count = Number(spec.count);
      if (!Number.isInteger(count) || count < 1 || count > 1000000) throw new Error('Repeat count must be an integer from 1 through 1000000.');
      return pattern.repeat(count);
    }
    throw new Error(`Unsupported test payload type: ${spec.type || '(missing)'}.`);
  }

  function binaryEntropy(bits) {
    if (!bits.length) return 0;
    const ones = bits.split('').reduce((sum, bit) => sum + (bit === '1' ? 1 : 0), 0);
    const zeros = bits.length - ones;
    const terms = [zeros, ones]
      .filter(count => count > 0)
      .map(count => {
        const probability = count / bits.length;
        return -probability * Math.log2(probability);
      });
    return terms.reduce((sum, term) => sum + term, 0);
  }

  function bitStatistics(value) {
    const bits = normalizeBits(value, 'Statistics input');
    let ones = 0;
    let transitions = 0;
    let longestRun = 1;
    let currentRun = 1;
    for (let index = 0; index < bits.length; index += 1) {
      if (bits[index] === '1') ones += 1;
      if (index > 0) {
        if (bits[index] !== bits[index - 1]) {
          transitions += 1;
          currentRun = 1;
        } else {
          currentRun += 1;
          if (currentRun > longestRun) longestRun = currentRun;
        }
      }
    }
    return {
      bitLength: bits.length,
      zeros: bits.length - ones,
      ones,
      oneRatio: ones / bits.length,
      transitions,
      transitionRate: bits.length > 1 ? transitions / (bits.length - 1) : 0,
      longestRun,
      binaryEntropy: binaryEntropy(bits)
    };
  }

  function alignedHamming(leftValue, rightValue) {
    const left = normalizeBits(leftValue, 'Hamming left input');
    const right = normalizeBits(rightValue, 'Hamming right input');
    const comparedBits = Math.min(left.length, right.length);
    let differentBits = 0;
    for (let index = 0; index < comparedBits; index += 1) if (left[index] !== right[index]) differentBits += 1;
    return {
      comparedBits,
      differentBits,
      ratio: comparedBits ? differentBits / comparedBits : 0,
      lengthDelta: right.length - left.length
    };
  }

  function keySummary(key) {
    return {
      keyId: key.keyId,
      keyDigestType: key.keyDigestType,
      keyDigest: key.keyDigest,
      gridSize: key.gridSize,
      seed: key.seed,
      inputFace: key.inputFace,
      outputFace: key.outputFace,
      inputQuarterTurns: key.inputQuarterTurns,
      outputQuarterTurns: key.outputQuarterTurns,
      payloadCells: Array.isArray(key.mask) ? key.mask.filter(Boolean).length : null,
      maskCells: Array.isArray(key.mask) ? key.mask.length : null,
      maskDensity: Array.isArray(key.mask) && key.mask.length ? key.mask.filter(Boolean).length / key.mask.length : null
    };
  }

  function capturePreEncryption(testCase) {
    const started = nowMs();
    if (!testCase || typeof testCase !== 'object' || Array.isArray(testCase)) throw new Error('A three-state test case object is required.');
    const bits = materializePayload(testCase.payload);
    let maskResult = null;
    if (testCase.preEntryMaskOptions) {
      if (!preEntryMask) throw new Error('This host cannot execute the requested pre-entry mask because BinaryCubePreEntryMask is unavailable.');
      maskResult = preEntryMask.applyMask(bits, testCase.preEntryMaskOptions);
    }
    const cubeInputBits = maskResult ? maskResult.maskedBits : bits;
    const key = engine.createKey(testCase.keyOptions || {});
    const validatedKey = engine.validateKey(key);
    const capture = {
      protocolId: PROTOCOL_ID,
      schemaVersion: SCHEMA_VERSION,
      state: 'pre-encryption',
      ordinal: 1,
      testId: String(testCase.id || 'unnamed-test'),
      description: String(testCase.description || ''),
      passed: true,
      source: {
        bits,
        sha256: engine.sha256Hex(bits),
        statistics: bitStatistics(bits)
      },
      preEntryMask: maskResult ? {
        applied: true,
        descriptor: maskResult.descriptor,
        statistics: maskResult.statistics,
        sourceToMaskedHamming: alignedHamming(bits, maskResult.maskedBits)
      } : { applied: false, descriptor: null },
      cubeInput: {
        bits: cubeInputBits,
        sha256: engine.sha256Hex(cubeInputBits),
        statistics: bitStatistics(cubeInputBits)
      },
      key: validatedKey,
      keySummary: keySummary(validatedKey),
      effectiveConfiguration: {
        gridSize: validatedKey.gridSize,
        seed: validatedKey.seed,
        inputFace: validatedKey.inputFace,
        outputFace: validatedKey.outputFace,
        inputQuarterTurns: validatedKey.inputQuarterTurns,
        outputQuarterTurns: validatedKey.outputQuarterTurns,
        maskDensity: validatedKey.mask.filter(Boolean).length / validatedKey.mask.length,
        preEntryMaskMethod: maskResult ? maskResult.descriptor.method : 'none'
      }
    };
    capture.durationMs = nowMs() - started;
    return capture;
  }

  function scrambleQuality(sourceBits, ciphertext) {
    const sourceStats = bitStatistics(sourceBits);
    const cipherStats = bitStatistics(ciphertext);
    const hamming = alignedHamming(sourceBits, ciphertext);
    const exactPlaintextEquality = sourceBits === ciphertext;
    const plaintextSubstringExposure = sourceBits.length >= 8 && ciphertext.includes(sourceBits);
    const warnings = [];
    if (exactPlaintextEquality) warnings.push({severity:'critical',code:'ciphertext-equals-plaintext',message:'Ciphertext is exactly equal to the normalized plaintext.'});
    if (plaintextSubstringExposure) warnings.push({severity:'high',code:'plaintext-substring-exposed',message:'The complete plaintext appears as a contiguous substring of the ciphertext.'});
    if (hamming.comparedBits >= 16 && hamming.ratio < 0.25) warnings.push({severity:'warning',code:'low-aligned-hamming-distance',message:'Aligned plaintext/ciphertext difference is below 25% across the comparable prefix.'});
    if (cipherStats.bitLength >= 32 && cipherStats.binaryEntropy < 0.5) warnings.push({severity:'warning',code:'low-ciphertext-binary-entropy',message:'Ciphertext binary entropy is below 0.5 bits per symbol.'});
    if (cipherStats.bitLength >= 32 && (cipherStats.transitionRate < 0.1 || cipherStats.transitionRate > 0.9)) warnings.push({severity:'warning',code:'extreme-transition-rate',message:'Ciphertext transition rate is unusually low or high for this test package.'});
    return {
      scramblingObserved: !exactPlaintextEquality && !plaintextSubstringExposure,
      exactPlaintextEquality,
      plaintextSubstringExposure,
      alignedHamming: hamming,
      sourceStatistics: sourceStats,
      ciphertextStatistics: cipherStats,
      warnings
    };
  }

  function captureEncrypted(preCapture, suppliedPackage) {
    const started = nowMs();
    if (!preCapture || preCapture.state !== 'pre-encryption') throw new Error('Encrypted-state capture requires a valid pre-encryption capture.');
    const cubeInputBits = preCapture.cubeInput ? preCapture.cubeInput.bits : preCapture.source.bits;
    const packageObject = suppliedPackage ? deepClone(suppliedPackage) : engine.encryptBinary(cubeInputBits, preCapture.key);
    const validatedPackage = engine.validatePackage(packageObject, preCapture.key);
    const replay = engine.encryptBinary(cubeInputBits, preCapture.key);
    const deterministicReplay = JSON.stringify(replay) === JSON.stringify(validatedPackage);
    const keyBinding = validatedPackage.keyId === preCapture.key.keyId && validatedPackage.keyDigest === preCapture.key.keyDigest;
    const quality = scrambleQuality(preCapture.source.bits, validatedPackage.ciphertext);
    const cubeInputQuality = cubeInputBits === preCapture.source.bits ? null : scrambleQuality(cubeInputBits, validatedPackage.ciphertext);
    const methodValidity = {
      canonicalPackageValidation: true,
      keyBinding,
      deterministicReplay,
      algorithm: validatedPackage.algorithm,
      packageFormat: validatedPackage.format,
      schemaVersion: validatedPackage.schemaVersion,
      cubeInputSha256: engine.sha256Hex(cubeInputBits)
    };
    const methodValid = methodValidity.canonicalPackageValidation && methodValidity.keyBinding && methodValidity.deterministicReplay;
    const capture = {
      protocolId: PROTOCOL_ID,
      schemaVersion: SCHEMA_VERSION,
      state: 'encrypted',
      ordinal: 2,
      testId: preCapture.testId,
      passed: methodValid && quality.scramblingObserved,
      methodValid,
      scramblingObserved: quality.scramblingObserved,
      status: methodValid ? (quality.scramblingObserved ? 'valid-scrambled' : 'valid-with-scrambling-weakness') : 'invalid-method-state',
      package: validatedPackage,
      packageSha256: engine.sha256Hex(JSON.stringify(validatedPackage)),
      methodValidity,
      scramblingQuality: quality,
      cubeInputScramblingQuality: cubeInputQuality
    };
    capture.durationMs = nowMs() - started;
    return capture;
  }

  function captureRecovered(preCapture, encryptedCapture, suppliedKey) {
    const started = nowMs();
    if (!preCapture || preCapture.state !== 'pre-encryption') throw new Error('Recovered-state capture requires the original pre-encryption capture.');
    if (!encryptedCapture || encryptedCapture.state !== 'encrypted') throw new Error('Recovered-state capture requires an encrypted-state capture.');
    const key = suppliedKey || preCapture.key;
    const validatedKey = engine.validateKey(key);
    engine.validatePackage(encryptedCapture.package, validatedKey);
    const recoveredCubeInput = engine.decryptBinary(encryptedCapture.package, validatedKey);
    const expectedCubeInput = preCapture.cubeInput ? preCapture.cubeInput.bits : preCapture.source.bits;
    const exactCubeInputMatch = recoveredCubeInput === expectedCubeInput;
    let bits = recoveredCubeInput;
    if (preCapture.preEntryMask && preCapture.preEntryMask.applied) {
      if (!preEntryMask) throw new Error('This host cannot remove the captured pre-entry mask because BinaryCubePreEntryMask is unavailable.');
      bits = preEntryMask.removeMask(recoveredCubeInput, preCapture.preEntryMask.descriptor).bits;
    }
    const digest = engine.sha256Hex(bits);
    const exactPayloadMatch = bits === preCapture.source.bits;
    const exactLengthMatch = bits.length === preCapture.source.bits.length;
    const exactDigestMatch = digest === preCapture.source.sha256;
    const capture = {
      protocolId: PROTOCOL_ID,
      schemaVersion: SCHEMA_VERSION,
      state: 'recovered',
      ordinal: 3,
      testId: preCapture.testId,
      passed: exactCubeInputMatch && exactPayloadMatch && exactLengthMatch && exactDigestMatch,
      recovered: {
        bits,
        sha256: digest,
        statistics: bitStatistics(bits),
        cubeInputBits: recoveredCubeInput
      },
      equivalence: {
        exactCubeInputMatch,
        exactPayloadMatch,
        exactLengthMatch,
        exactDigestMatch,
        expectedBitLength: preCapture.source.bits.length,
        recoveredBitLength: bits.length
      }
    };
    capture.durationMs = nowMs() - started;
    return capture;
  }

  function runCase(testCase) {
    const started = nowMs();
    try {
      const preEncryption = capturePreEncryption(testCase);
      const encrypted = captureEncrypted(preEncryption);
      const recovered = captureRecovered(preEncryption, encrypted);
      return {
        ok: preEncryption.passed && encrypted.passed && recovered.passed,
        protocolId: PROTOCOL_ID,
        schemaVersion: SCHEMA_VERSION,
        testId: preEncryption.testId,
        preEncryption,
        encrypted,
        recovered,
        weaknessCount: encrypted.scramblingQuality.warnings.length,
        weaknesses: encrypted.scramblingQuality.warnings,
        durationMs: nowMs() - started
      };
    } catch (error) {
      return {
        ok: false,
        protocolId: PROTOCOL_ID,
        schemaVersion: SCHEMA_VERSION,
        testId: String(testCase && testCase.id || 'unnamed-test'),
        error: { name: error.name, message: error.message },
        durationMs: nowMs() - started
      };
    }
  }

  function mutateForNegativeCase(baseRun, negativeCase) {
    const mutation = negativeCase.mutation || {};
    const packageObject = deepClone(baseRun.encrypted.package);
    let key = deepClone(baseRun.preEncryption.key);
    switch (mutation.type) {
      case 'flip-ciphertext-bit': {
        const index = Math.max(0, Math.min(packageObject.ciphertext.length - 1, Number(mutation.index) || 0));
        packageObject.ciphertext = packageObject.ciphertext.slice(0, index) + (packageObject.ciphertext[index] === '1' ? '0' : '1') + packageObject.ciphertext.slice(index + 1);
        break;
      }
      case 'truncate-ciphertext': {
        const bits = Math.max(1, Number(mutation.bits) || 1);
        packageObject.ciphertext = packageObject.ciphertext.slice(0, Math.max(0, packageObject.ciphertext.length - bits));
        break;
      }
      case 'tamper-checksum':
        packageObject.checksum = packageObject.checksum === '00000000' ? 'ffffffff' : '00000000';
        break;
      case 'tamper-package-key-id':
        packageObject.keyId = packageObject.keyId === '00000000' ? 'ffffffff' : '00000000';
        break;
      case 'tamper-package-format':
        packageObject.format = 'invalid-binary-cube-package';
        break;
      case 'alternate-valid-key':
        key = engine.createKey({
          gridSize: key.gridSize,
          seed: `${key.seed}-alternate`,
          inputFace: key.inputFace,
          outputFace: key.outputFace,
          inputQuarterTurns: key.inputQuarterTurns,
          outputQuarterTurns: key.outputQuarterTurns,
          maskDensity: key.mask.filter(Boolean).length / key.mask.length
        });
        break;
      case 'tamper-key-id':
        key.keyId = key.keyId === '00000000' ? 'ffffffff' : '00000000';
        break;
      case 'tamper-key-digest':
        key.keyDigest = key.keyDigest === '0'.repeat(64) ? 'f'.repeat(64) : '0'.repeat(64);
        break;
      case 'empty-key-mask':
        key.mask = key.mask.map(() => false);
        break;
      case 'duplicate-row-permutation':
        if (key.rowPermutation.length > 1) key.rowPermutation[1] = key.rowPermutation[0];
        break;
      default:
        throw new Error(`Unsupported negative-test mutation: ${mutation.type || '(missing)'}.`);
    }
    return { package: packageObject, key };
  }

  function runNegativeCase(negativeCase, positiveCaseById) {
    const started = nowMs();
    try {
      if (negativeCase.stage === 'pre-encryption') {
        let rejected = false;
        let message = '';
        try { capturePreEncryption({ id: negativeCase.id, ...(negativeCase.case || {}) }); }
        catch (error) { rejected = true; message = error.message; }
        return { ok: rejected, testId: negativeCase.id, expectedStage: 'pre-encryption', rejected, rejectionMessage: message, durationMs: nowMs() - started };
      }

      const baseCase = positiveCaseById.get(negativeCase.baseCaseId);
      if (!baseCase) throw new Error(`Negative case ${negativeCase.id} references missing positive case ${negativeCase.baseCaseId}.`);
      const baseRun = runCase(baseCase);
      if (!baseRun.preEncryption || !baseRun.encrypted) throw new Error(`Base case ${negativeCase.baseCaseId} did not produce three-state captures.`);
      const mutated = mutateForNegativeCase(baseRun, negativeCase);
      let rejected = false;
      let message = '';
      try {
        if (negativeCase.stage === 'encrypted') {
          captureEncrypted(baseRun.preEncryption, mutated.package);
        } else if (negativeCase.stage === 'recovered') {
          const mutatedEncrypted = { ...baseRun.encrypted, package: mutated.package };
          captureRecovered(baseRun.preEncryption, mutatedEncrypted, mutated.key);
        } else {
          throw new Error(`Unsupported negative-test stage ${negativeCase.stage}.`);
        }
      } catch (error) {
        rejected = true;
        message = error.message;
      }
      return { ok: rejected, testId: negativeCase.id, expectedStage: negativeCase.stage, rejected, rejectionMessage: message, mutation: negativeCase.mutation, durationMs: nowMs() - started };
    } catch (error) {
      return { ok: false, testId: negativeCase.id, expectedStage: negativeCase.stage, rejected: false, harnessError: { name: error.name, message: error.message }, durationMs: nowMs() - started };
    }
  }

  function runSuite(catalog) {
    const started = nowMs();
    if (!catalog || catalog.protocolId !== PROTOCOL_ID) throw new Error(`Test package catalog must use protocolId ${PROTOCOL_ID}.`);
    const positiveCases = Array.isArray(catalog.positiveCases) ? catalog.positiveCases : [];
    const negativeCases = Array.isArray(catalog.negativeCases) ? catalog.negativeCases : [];
    const positiveCaseById = new Map(positiveCases.map(testCase => [testCase.id, testCase]));
    const positiveResults = positiveCases.map(runCase);
    const negativeResults = negativeCases.map(testCase => runNegativeCase(testCase, positiveCaseById));
    const positiveFailures = positiveResults.filter(result => !result.ok);
    const negativeFailures = negativeResults.filter(result => !result.ok);
    const weaknessFindings = positiveResults.flatMap(result => (result.weaknesses || []).map(weakness => ({ testId: result.testId, ...weakness })));
    return {
      ok: positiveFailures.length === 0 && negativeFailures.length === 0,
      protocolId: PROTOCOL_ID,
      schemaVersion: SCHEMA_VERSION,
      capabilityId: catalog.capabilityId,
      positiveCaseCount: positiveResults.length,
      positivePassed: positiveResults.length - positiveFailures.length,
      negativeCaseCount: negativeResults.length,
      negativePassed: negativeResults.length - negativeFailures.length,
      weaknessCount: weaknessFindings.length,
      weaknessFindings,
      positiveResults,
      negativeResults,
      durationMs: nowMs() - started
    };
  }

  return Object.freeze({
    PROTOCOL_ID,
    SCHEMA_VERSION,
    materializePayload,
    bitStatistics,
    alignedHamming,
    capturePreEncryption,
    captureEncrypted,
    captureRecovered,
    runCase,
    runNegativeCase,
    runSuite
  });
});