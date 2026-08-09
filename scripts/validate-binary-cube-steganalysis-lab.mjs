#!/usr/bin/env node

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { createRequire } from 'node:module';

const root = process.cwd();
const require = createRequire(import.meta.url);
const Engine = require(path.join(root, 'binary-cube-steganalysis-engine.js'));
assert.equal(Engine.version, '0.1.0');

function rng(seed = 0x12345678) {
  let state = seed >>> 0;
  return () => {
    state ^= state << 13; state ^= state >>> 17; state ^= state << 5; state >>>= 0;
    return state / 0x100000000;
  };
}

const random = rng();
const clean = [];
let value = 96;
for (let index = 0; index < 32768; index += 1) {
  value = Math.max(8, Math.min(247, value + (random() < 0.5 ? -1 : 1) * (random() < 0.88 ? 1 : 2)));
  clean.push(value);
}
const stego = clean.slice();
const payloadRate = 0.62;
for (let index = 0; index < stego.length; index += 1) {
  if (random() < payloadRate) {
    const bit = random() < 0.5 ? 0 : 1;
    stego[index] = (stego[index] & 0xfe) | bit;
  }
}

const rs = Engine.rsAnalysis(stego);
assert.ok(rs.groups > 1000, 'RS analysis did not form enough groups.');
assert.ok(rs.estimatedPayloadRate == null || (rs.estimatedPayloadRate >= 0 && rs.estimatedPayloadRate <= 1), 'RS estimate escaped normalized payload range.');
const spa = Engine.samplePairAnalysis(stego);
assert.ok(spa.counts.pairs > 1000, 'SPA did not inspect enough pairs.');
assert.ok(spa.estimatedPayloadRate == null || (spa.estimatedPayloadRate >= 0 && spa.estimatedPayloadRate <= 1), 'SPA estimate escaped normalized payload range.');
assert.equal(typeof rs.caveat, 'string');
assert.equal(typeof spa.caveat, 'string');

const width = 128; const height = 64;
const rgba = new Uint8ClampedArray(width * height * 4);
for (let pixel = 0; pixel < width * height; pixel += 1) {
  const base = pixel * 4;
  const sample = stego[pixel % stego.length];
  rgba[base] = sample; rgba[base + 1] = sample; rgba[base + 2] = sample; rgba[base + 3] = 255;
}
const localized = Engine.localizedRasterAnalysis(rgba, width, height, { tileSize: 32, channel: 'r' });
assert.equal(localized.tiles.length, 8, 'Localized analysis tile count changed.');
assert.ok(localized.global.rs.groups > 0);
assert.ok(localized.tiles.every(tile => Number.isFinite(tile.analysis.chi.normalized)));
assert.ok(localized.tiles.every(tile => Number.isFinite(tile.analysis.residualCooccurrence.entropy)));

const suspect = new Uint8ClampedArray(rgba);
suspect[0] ^= 1;
suspect[(10 * width + 12) * 4 + 2] ^= 1;
const comparison = Engine.compareRasters(rgba, suspect, width, height);
assert.equal(comparison.changedPixels, 2);
assert.equal(comparison.changedSamples, 2);
assert.equal(comparison.channels.r.lsbFlips, 1);
assert.equal(comparison.channels.b.lsbFlips, 1);
assert.equal(comparison.channels.r.bitPlaneFlips[0], 1);
assert.equal(comparison.channels.b.bitPlaneFlips[0], 1);
assert.ok(comparison.psnr > 40);
assert.ok(comparison.ssim > 0.99);
assert.equal(comparison.changedMask[0], 255);

const textReport = Engine.analyzeTextSteganography(`alpha\u200bbeta\u202egamma\ufe0f\ntrail   `);
assert.equal(textReport.counts.zeroWidth, 1);
assert.equal(textReport.counts.bidiControls, 1);
assert.equal(textReport.counts.variationSelectors, 1);
assert.equal(textReport.counts.trailingWhitespaceLines, 1);
assert.ok(textReport.suspicious.length >= 3);

const confusion = Engine.confusionMetrics([0, 0, 1, 1], [0, 1, 1, 1]);
assert.equal(confusion.tp, 2); assert.equal(confusion.fp, 1); assert.equal(confusion.tn, 1); assert.equal(confusion.fn, 0);
assert.ok(confusion.mcc > 0);
const roc = Engine.rocCurve([0, 0, 1, 1], [0.05, 0.2, 0.8, 0.95]);
assert.ok(roc.auc > 0.9);
const regression = Engine.regressionMetrics([0.1, 0.2, 0.3], [0.11, 0.18, 0.33]);
assert.ok(regression.mae > 0 && regression.rmse > 0);
const bitMetrics = Engine.recoveredBitMetrics(Uint8Array.from([0xaa, 0x55]), Uint8Array.from([0xaa, 0x54]));
assert.equal(bitMetrics.longestCorrectPrefixBytes, 1);
assert.ok(bitMetrics.bitErrorRate > 0);

const png = Uint8Array.from([
  137,80,78,71,13,10,26,10,
  0,0,0,7, 116,69,88,116, 75,101,121,0,86,97,108, 0,0,0,0,
  0,0,0,0, 73,69,78,68, 0,0,0,0
]);
const pngMeta = Engine.inspectPngMetadata(png);
assert.equal(pngMeta.valid, true);
assert.equal(pngMeta.textChunks.length, 1);
assert.equal(pngMeta.textChunks[0].keyword, 'Key');

const progressiveStub = Uint8Array.from([
  0xff,0xd8,
  0xff,0xc2,0x00,0x0b, 8,0,8,0,8,1,1,0x11,0,
  0xff,0xda,0x00,0x08, 1,1,0,0,63,0,
  0xff,0xd9
]);
const progressive = Engine.inspectJpegCoefficients(progressiveStub);
assert.equal(progressive.valid, true);
assert.equal(progressive.supported, false);
assert.match(progressive.reason, /Progressive JPEG/);

const engineSource = fs.readFileSync(path.join(root, 'binary-cube-steganalysis-engine.js'), 'utf8');
for (const required of [
  'function rsAnalysis(',
  'function samplePairAnalysisFromPairs(',
  'function localizedRasterAnalysis(',
  'function compareRasters(',
  'function residualCooccurrence(',
  'function inspectJpegCoefficients(',
  'function analyzeTextSteganography(',
  'function rocCurve(',
  'p = z/(z-1/2)'
]) {
  if (required === 'p = z/(z-1/2)') continue;
  assert.ok(engineSource.includes(required), `Steganalysis engine missing ${required}.`);
}
assert.ok(engineSource.includes('z / (z - 0.5)'), 'RS estimator must retain the published rescaling relation.');
assert.ok(engineSource.includes('(2 * counts.c0 - counts.c1) / 4'), 'SPA m=0 quadratic coefficient is missing.');

const labSource = fs.readFileSync(path.join(root, 'binary-cube-steganalysis-lab.js'), 'utf8');
for (const required of [
  'Advanced Steganalysis Laboratory',
  'RS + SPA + localization',
  'Known-cover parity',
  'JPEG DCT',
  'Text / Unicode',
  'Batch / Evaluation',
  "runWorker('localized-raster'",
  "runWorker('compare-raster'",
  "runWorker('jpeg-coefficients'",
  'ROC AUC',
  'Measurements remain separate evidence channels'
]) assert.ok(labSource.includes(required), `Steganalysis lab missing ${JSON.stringify(required)}.`);
assert.ok(!labSource.includes('Steganography Probability'), 'Lab must not collapse evidence into an opaque steganography probability.');

const workerSource = fs.readFileSync(path.join(root, 'binary-cube-steganalysis-worker.js'), 'utf8');
assert.ok(workerSource.includes("importScripts('binary-cube-steganalysis-engine.js?v=20260809-steganalysis-1')"));
assert.ok(workerSource.includes('Engine.localizedRasterAnalysis'));
assert.ok(workerSource.includes('Engine.compareRasters'));
assert.ok(workerSource.includes('Engine.inspectJpegCoefficients'));

console.log(JSON.stringify({
  receipt: 'hb-ttrpg-binary-cube-steganalysis-validation-receipt',
  schema: '0.1.0',
  rs: { valid: rs.valid, estimate: rs.estimatedPayloadRate, groups: rs.groups },
  spa: { valid: spa.valid, estimate: spa.estimatedPayloadRate, pairs: spa.counts.pairs },
  localizedTiles: localized.tiles.length,
  comparison: { changedPixels: comparison.changedPixels, psnr: comparison.psnr, ssim: comparison.ssim },
  evaluation: { rocAuc: roc.auc, mcc: confusion.mcc },
  progressiveJpegRefusal: progressive.reason
}, null, 2));
