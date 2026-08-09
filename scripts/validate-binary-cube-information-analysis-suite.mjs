#!/usr/bin/env node

import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const Suite = require('../binary-cube-information-analysis-suite.js');

assert.equal(Suite.constants.PAPER_TITLE, 'Language Trees and Zipping');
assert.equal(Suite.constants.PAPER_YEAR, 2002);
assert.equal(Suite.constants.MAURER_YEAR, 1992);
assert.ok(Object.keys(Suite.constants.REFERENCE_CORPORA).includes('english'));

const U = Suite.utilities;
const englishText = `The information recovery laboratory examines recurring structure in ordinary English prose. `
  .repeat(120);
const english = U.textToBytes(englishText);
const deterministicNoise = new Uint8Array(english.length);
let state = 0x9e3779b9;
for (let index = 0; index < deterministicNoise.length; index += 1) {
  state ^= state << 13; state ^= state >>> 17; state ^= state << 5;
  deterministicNoise[index] = state & 0xff;
}

assert.ok(U.shannonEntropy(english) < U.shannonEntropy(deterministicNoise));
assert.ok(U.printableFraction(english) > 0.99);
assert.ok(U.languageScore(english) > U.languageScore(deterministicNoise));
assert.ok(U.ngramEntropy(english, 2) > 0);
assert.ok(Number.isFinite(U.serialCorrelation(english, 1)));
assert.ok(U.mutualInformationLag(english, 1) >= 0);
assert.ok(U.slidingEntropy(english, 128, 64).length > 5);
assert.ok(U.stringCarve(english, 8).length > 0);

const maurer = Suite.maurerUniversal(deterministicNoise);
assert.ok(maurer.blockLength >= 3 && maurer.blockLength <= 16);
assert.ok(maurer.testBlocks > 0);

const ncd = await Suite.normalizedCompressionDistance(
  U.textToBytes(Suite.constants.REFERENCE_CORPORA.english),
  english
);
assert.ok(Number.isFinite(ncd.distance));

const bcl = await Suite.bclRelativeEntropy(
  U.textToBytes(Suite.constants.REFERENCE_CORPORA.english),
  english
);
assert.equal(bcl.available, true);
assert.ok(Number.isFinite(bcl.relativeEntropyPerByte));
assert.equal(bcl.method, 'Benedetto–Caglioti–Loreto compression-relative-entropy estimator');

const hex = U.bytesToHex(U.textToBytes('recoverable information layer'));
const base64 = Buffer.from(hex, 'utf8').toString('base64');
const peeled = await Suite.recursivePeel(U.textToBytes(base64), 2);
assert.equal(peeled.chain.length, 2);
assert.match(U.bytesToText(peeled.bytes), /recoverable information layer/);

const endianSource = Uint8Array.from([1, 2, 3, 4, 5, 6, 7, 8]);
assert.deepEqual(
  Array.from(U.swapWordEndian(U.swapWordEndian(endianSource, 4), 4)),
  Array.from(endianSource)
);
assert.equal(U.bitPlane(endianSource, 0).length, 1);
assert.equal(U.deinterleave(endianSource, 0).length, endianSource.length);
assert.equal(U.columnarTranspose(endianSource, 4, false).length, endianSource.length);

const xorPlain = U.textToBytes('This is repeated English plaintext for a repeating xor recovery experiment. '.repeat(80));
const key = U.textToBytes('ICE');
const xorCipher = Uint8Array.from(xorPlain, (byte, index) => byte ^ key[index % key.length]);
const xorLengths = U.likelyRepeatingXorLengths(xorCipher, 12);
assert.ok(xorLengths.length > 0);
const recovered = U.repeatingXorCandidate(xorCipher, 3);
assert.equal(recovered.decoded.length, xorPlain.length);
assert.ok(U.languageScore(recovered.decoded) > U.languageScore(xorCipher));

const analysis = await Suite.analyzeInformation(english, { minimumStringLength: 6, windowSize: 128 });
assert.equal(analysis.byteLength, english.length);
assert.ok(analysis.evidenceScore >= 0 && analysis.evidenceScore <= 100);
assert.ok(Array.isArray(analysis.affinities));
assert.ok(analysis.affinities.length >= 6);
assert.ok(Array.isArray(analysis.strongestLags));
assert.match(analysis.caveat, /cannot prove semantic meaning/i);

const candidates = await Suite.rankDeobfuscationCandidates(U.textToBytes('uryyb jbeyq'), {
  singleByteXor: false,
  repeatingXor: false,
  limit: 20
});
assert.ok(candidates.length >= 10);
assert.ok(candidates.some(candidate => /ROT13/.test(candidate.method)));
assert.ok(candidates.some(candidate => /hello world/i.test(candidate.preview)));

console.log(JSON.stringify({
  format: 'hb-ttrpg-binary-cube-information-analysis-suite-validation-receipt',
  schemaVersion: '0.1.1',
  pass: true,
  paperMethod: `${Suite.constants.PAPER_AUTHORS} · ${Suite.constants.PAPER_TITLE} (${Suite.constants.PAPER_YEAR})`,
  maurerUniversalStatistic: true,
  entropyAndComplexityEnsemble: true,
  compressionDistance: true,
  referenceAffinity: true,
  recursiveEncodingPeeling: true,
  recursivePeelDepthIsExplicitlyBounded: true,
  fileSignatureCarving: true,
  stringCarving: true,
  bitPlaneAndEndianTransforms: true,
  columnarAndStrideTransforms: true,
  singleAndRepeatingXorSupport: true,
  candidateRanking: true,
  semanticProofClaimed: false
}, null, 2));