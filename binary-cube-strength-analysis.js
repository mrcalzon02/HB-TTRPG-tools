(function installBinaryCubeStrengthAnalysis(root, factory) {
  'use strict';
  const api = factory(typeof module === 'object' && module.exports ? require('./shadowrun-binary-cube-engine.js') : root && root.ShadowrunBinaryCubeEngine);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.BinaryCubeStrengthAnalysis = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function createBinaryCubeStrengthAnalysis(engine) {
  'use strict';
  if (!engine) throw new Error('BinaryCubeStrengthAnalysis requires ShadowrunBinaryCubeEngine.');
  const ANALYSIS_ID = 'binary-cube-perturbation-strength-v1';
  const SCHEMA_VERSION = '1.0.0';

  function normalizeBits(value) {
    const bits = String(value ?? '').replace(/\s+/g, '');
    if (!bits || /[^01]/.test(bits)) throw new Error('Strength-analysis bits must contain only 0 and 1 after whitespace removal.');
    return bits;
  }
  function hamming(left, right) {
    const length = Math.min(left.length, right.length);
    let different = 0;
    for (let index = 0; index < length; index += 1) if (left[index] !== right[index]) different += 1;
    return { comparedBits:length, differentBits:different, ratio:length ? different / length : 0, lengthDelta:right.length - left.length };
  }
  function flipBit(bits, index) {
    return bits.slice(0, index) + (bits[index] === '1' ? '0' : '1') + bits.slice(index + 1);
  }
  function sampleIndexes(length, maximum) {
    const count = Math.max(1, Math.min(length, Number(maximum) || 32));
    if (count === length) return Array.from({length}, (_, index) => index);
    const indexes = new Set([0, length - 1]);
    for (let step = 0; step < count; step += 1) indexes.add(Math.min(length - 1, Math.floor(step * (length - 1) / Math.max(1, count - 1))));
    return [...indexes].sort((a,b) => a-b).slice(0, count);
  }
  function windowDiffusion(left, right, windowSize) {
    const windows = [];
    const length = Math.min(left.length, right.length);
    for (let start = 0; start < length; start += windowSize) {
      const end = Math.min(length, start + windowSize);
      const metric = hamming(left.slice(start, end), right.slice(start, end));
      windows.push({index:windows.length,start,end,...metric});
    }
    return windows;
  }
  function summarize(values) {
    if (!values.length) return {count:0,min:0,max:0,mean:0};
    const sum = values.reduce((total, value) => total + value, 0);
    return {count:values.length,min:Math.min(...values),max:Math.max(...values),mean:sum / values.length};
  }
  function runPerturbationAnalysis(request = {}) {
    if (!request || typeof request !== 'object' || Array.isArray(request)) throw new Error('Strength analysis requires a request object.');
    const bits = normalizeBits(request.bits);
    const keyOptions = request.keyOptions || {};
    const key = engine.createKey(keyOptions);
    engine.validateKey(key);
    const baselinePackage = engine.encryptBinary(bits, key);
    engine.validatePackage(baselinePackage, key);
    const baselineCiphertext = baselinePackage.ciphertext;
    const indexes = sampleIndexes(bits.length, request.maxPlaintextBitFlips || 32);
    const windowSize = key.gridSize * key.gridSize;
    const plaintextPerturbations = indexes.map(index => {
      const changedBits = flipBit(bits, index);
      const changedPackage = engine.encryptBinary(changedBits, key);
      const overall = hamming(baselineCiphertext, changedPackage.ciphertext);
      return {sourceBitIndex:index,overall,subcubeWindows:windowDiffusion(baselineCiphertext, changedPackage.ciphertext, windowSize)};
    });
    const alternateKey = engine.createKey({...keyOptions, seed:`${String(key.seed)}::key-perturbation`});
    const alternatePackage = engine.encryptBinary(bits, alternateKey);
    const keyPerturbation = {overall:hamming(baselineCiphertext, alternatePackage.ciphertext),subcubeWindows:windowDiffusion(baselineCiphertext, alternatePackage.ciphertext, windowSize),alternateKeyId:alternateKey.keyId};
    const ratios = plaintextPerturbations.map(item => item.overall.ratio);
    const summary = summarize(ratios);
    const findings = [];
    if (summary.count && summary.mean < 0.25) findings.push({severity:'high',code:'weak-plaintext-perturbation-diffusion',message:'Mean ciphertext change after sampled one-bit plaintext changes is below 25%.'});
    if (summary.count && summary.min === 0) findings.push({severity:'critical',code:'undiffused-plaintext-bit',message:'At least one sampled plaintext bit change produced no ciphertext change in the comparable output.'});
    if (keyPerturbation.overall.ratio < 0.25) findings.push({severity:'high',code:'weak-key-perturbation-diffusion',message:'A deterministic seed perturbation changed less than 25% of comparable ciphertext bits.'});
    return {
      ok:true, analysisId:ANALYSIS_ID, schemaVersion:SCHEMA_VERSION,
      securityClassification:'experimental-ttrpg-obfuscation-not-production-cryptography',
      configuration:{gridSize:key.gridSize,inputFace:key.inputFace,outputFace:key.outputFace,inputQuarterTurns:key.inputQuarterTurns,outputQuarterTurns:key.outputQuarterTurns,maskDensity:key.mask.filter(Boolean).length/key.mask.length,keyId:key.keyId},
      source:{bitLength:bits.length,sha256:engine.sha256Hex(bits)},
      baseline:{ciphertextBits:baselineCiphertext.length,packageChecksum:baselinePackage.checksum},
      plaintextPerturbation:{sampledBitCount:indexes.length,ratioSummary:summary,cases:plaintextPerturbations},
      keyPerturbation,
      subcubeWindowDefinition:{windowBits:windowSize,note:'Analysis partitions ciphertext into gridSize^2 windows to reveal localized diffusion. These windows are diagnostic regions, not a second encryption algorithm.'},
      findings
    };
  }
  return Object.freeze({ANALYSIS_ID,SCHEMA_VERSION,hamming,windowDiffusion,runPerturbationAnalysis});
});
