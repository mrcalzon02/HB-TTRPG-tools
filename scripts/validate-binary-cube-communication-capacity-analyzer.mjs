#!/usr/bin/env node

import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const Analyzer = require('../binary-cube-communication-capacity-analyzer.js');

assert.equal(Analyzer.constants.PAPER_YEAR, 1999);
assert.match(Analyzer.constants.PAPER_TITLE, /bottlenose dolphin whistle repertoires/i);
assert.equal(Analyzer.constants.HUMAN_ZIPF_REFERENCE, -1.00);
assert.equal(Analyzer.constants.ADULT_DOLPHIN_ZIPF_REFERENCE, -0.95);
assert.equal(Analyzer.constants.INFANT_DOLPHIN_ZIPF_REFERENCE, -0.82);
assert.equal(Analyzer.constants.RANDOM_ZIPF_REFERENCE, -0.09);

const syntheticZipf = [];
for (let rank = 1; rank <= 40; rank += 1) {
  const count = Math.max(1, Math.floor(4000 / rank));
  for (let index = 0; index < count; index += 1) syntheticZipf.push(`s${rank}`);
}
const zipf = Analyzer.zipfAnalysis(syntheticZipf);
assert.ok(zipf.slope < -0.85 && zipf.slope > -1.15, `Synthetic Zipf slope was ${zipf.slope}`);
assert.ok(zipf.r2 > 0.95);
assert.ok(zipf.firstOrderAdequate);

const patterned = [];
for (let index = 0; index < 4000; index += 1) {
  const phase = index % 12;
  patterned.push(phase < 5 ? 'A' : phase < 9 ? 'B' : phase < 11 ? 'C' : 'D');
}
const shuffled = Analyzer.utilities.deterministicShuffle(patterned, 123456);
const patternedProfile = Analyzer.entropyOrderProfile(patterned, 4);
const shuffledProfile = Analyzer.entropyOrderProfile(shuffled, 4);
assert.ok(patternedProfile.rows[2].entropy < shuffledProfile.rows[2].entropy);
assert.ok(patternedProfile.sequentialDrop > shuffledProfile.sequentialDrop);

const surrogate = Analyzer.surrogateSequenceTest(patterned, 3, 12);
assert.equal(surrogate.replicateCount, 12);
assert.ok(surrogate.sequentialDropDelta > 0);

const sufficiency = Analyzer.sampleSufficiency(patterned, 4);
assert.equal(sufficiency.length, 4);
assert.equal(sufficiency[0].adequate, true);
assert.ok(sufficiency.every(row => row.observations > 0));

const miPattern = Analyzer.lagMutualInformation(patterned, 1);
const miShuffle = Analyzer.lagMutualInformation(shuffled, 1);
assert.ok(miPattern > miShuffle);

const text = `the quick brown fox jumps over the lazy dog and the quick blue bird follows the fox. `.repeat(400);
const bytes = Analyzer.utilities.textToBytes(text);
const report = Analyzer.analyzeCommunicationCapacity(bytes, {
  modes: ['bytes', 'characters', 'words'],
  maximumOrder: 4,
  shuffleReplicates: 8
});
assert.equal(report.byteLength, bytes.length);
assert.equal(report.paper.year, 1999);
assert.ok(report.reports.length >= 3);
assert.ok(report.best);
assert.match(report.caveat, /undersampled/i);
assert.ok(report.reports.every(item => item.evidenceScore >= 0 && item.evidenceScore <= 100));
assert.ok(report.reports.some(item => item.mode === 'words'));
assert.ok(report.reports.every(item => Array.isArray(item.sufficiency)));

const wordReport = report.reports.find(item => item.mode === 'words');
assert.ok(wordReport.zipf.repertoireSize >= 8);
assert.ok(wordReport.entropyProfile.rows.length === 5);
assert.match(wordReport.caveat, /not proof/i);

console.log(JSON.stringify({
  format: 'hb-ttrpg-binary-cube-communication-capacity-validation-receipt',
  schemaVersion: '0.1.0',
  pass: true,
  paperGrounding: `${Analyzer.constants.PAPER_AUTHORS} · ${Analyzer.constants.PAPER_YEAR}`,
  zipfSlope: true,
  humanAndDolphinReferenceSlopes: true,
  zeroFirstHigherOrderEntropy: true,
  entropyOrderSlope: true,
  sequentialConditionalEntropy: true,
  shuffledSurrogateBaseline: true,
  lagMutualInformation: true,
  sampleSufficiencyWarnings: true,
  multipleSymbolizations: true,
  semanticMeaningClaimed: false
}, null, 2));