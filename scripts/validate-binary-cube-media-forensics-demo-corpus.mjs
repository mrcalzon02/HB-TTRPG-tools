#!/usr/bin/env node

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import zlib from 'node:zlib';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const root = process.cwd();
const require = createRequire(import.meta.url);
const Suite = require(path.join(root, 'binary-cube-media-forensics-suite.js'));

await import(`${pathToFileURL(path.join(root, 'binary-cube-media-forensics-demo-corpus.js')).href}?validation=${Date.now()}`);
const Corpus = globalThis.BinaryCubeMediaForensicsDemoCorpus;
assert.ok(Corpus, 'Demonstration corpus did not expose BinaryCubeMediaForensicsDemoCorpus.');
assert.equal(Corpus.demos.length, 5, 'Expected five known-ground-truth demonstration files.');

const expectedSizes = Object.freeze({
  'clean-control': 12420,
  'rgb-lsb': 12420,
  'post-iend': 24840,
  afsk1200: 5244,
  dtmf: 16684
});

const generated = new Map();
for (const demo of Corpus.demos) {
  const bytes = Corpus.buildDemoBytes(demo.id);
  generated.set(demo.id, bytes);
  assert.equal(bytes.length, expectedSizes[demo.id], `${demo.id} deterministic byte length changed.`);
  if (demo.mimeType === 'image/png') assert.deepEqual(Array.from(bytes.slice(0, 8)), [137, 80, 78, 71, 13, 10, 26, 10], `${demo.id} is not a PNG.`);
  if (demo.mimeType === 'audio/wav') assert.equal(Buffer.from(bytes.slice(0, 12)).toString('ascii'), 'RIFF' + Buffer.from(bytes.slice(4, 8)).toString('ascii') + 'WAVE', `${demo.id} is not a RIFF/WAVE fixture.`);
}

function pngToRgba(bytesValue) {
  const bytes = Buffer.from(bytesValue);
  assert.deepEqual(Array.from(bytes.subarray(0, 8)), [137, 80, 78, 71, 13, 10, 26, 10]);
  let offset = 8;
  let width = 0;
  let height = 0;
  const idat = [];
  while (offset + 12 <= bytes.length) {
    const length = bytes.readUInt32BE(offset);
    const type = bytes.subarray(offset + 4, offset + 8).toString('ascii');
    const data = bytes.subarray(offset + 8, offset + 8 + length);
    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      assert.equal(data[8], 8);
      assert.equal(data[9], 2, 'Demo PNG must remain 8-bit RGB.');
    } else if (type === 'IDAT') idat.push(data);
    offset += 12 + length;
    if (type === 'IEND') break;
  }
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const rgba = new Uint8ClampedArray(width * height * 4);
  const rowBytes = width * 3;
  for (let y = 0; y < height; y += 1) {
    const row = y * (rowBytes + 1);
    assert.equal(raw[row], 0, 'Demo PNG row filters are expected to remain filter type 0.');
    for (let x = 0; x < width; x += 1) {
      const source = row + 1 + x * 3;
      const target = (y * width + x) * 4;
      rgba[target] = raw[source];
      rgba[target + 1] = raw[source + 1];
      rgba[target + 2] = raw[source + 2];
      rgba[target + 3] = 255;
    }
  }
  return { width, height, rgba };
}

const clean = generated.get('clean-control');
const cleanScan = Suite.utilities.scanContainer(clean);
assert.equal(cleanScan.type, 'PNG');
assert.equal(cleanScan.trailingBytes, 0, 'Clean PNG must remain a negative control with no post-IEND payload.');

const postIend = generated.get('post-iend');
const postScan = Suite.utilities.scanContainer(postIend);
assert.equal(postScan.type, 'PNG');
assert.equal(postScan.trailingBytes, clean.length, 'Post-IEND fixture must append exactly one complete clean PNG.');
assert.equal(postScan.trailingSignature, 'PNG', 'Post-IEND fixture must expose a trailing PNG signature.');

const lsbRaster = pngToRgba(generated.get('rgb-lsb'));
const lsbExtraction = Suite.utilities.extractRasterLsb(lsbRaster.rgba, { channels: 'rgb', bitIndex: 0, bitOrder: 'msb' });
const lsbPrefix = Buffer.from(lsbExtraction.bytes.slice(0, Corpus.constants.RGB_LSB_PAYLOAD.length)).toString('utf8');
assert.equal(lsbPrefix, Corpus.constants.RGB_LSB_PAYLOAD, 'RGB-LSB fixture did not recover its known ground-truth payload.');

const afsk = generated.get('afsk1200');
const afskWav = Suite.utilities.parseWav(afsk);
assert.ok(afskWav?.valid, 'AFSK fixture is not a valid WAVE file.');
const afskDecoded = Suite.utilities.decodeWavChannels(afsk, afskWav).channels[0];
const afskResult = Suite.utilities.decodeBinaryFsk(afskDecoded, afskWav.sampleRate, { markFrequency: 1200, spaceFrequency: 2200, baud: 1200 });
assert.equal(Buffer.from(afskResult.bytesMsb).toString('ascii'), Corpus.constants.AFSK_PAYLOAD, 'AFSK demonstration did not round-trip through the authoritative decoder.');
assert.ok(afskResult.meanConfidence > 0.8, 'AFSK ground-truth carrier confidence unexpectedly fell below 80%.');

const dtmf = generated.get('dtmf');
const dtmfWav = Suite.utilities.parseWav(dtmf);
assert.ok(dtmfWav?.valid, 'DTMF fixture is not a valid WAVE file.');
const dtmfDecoded = Suite.utilities.decodeWavChannels(dtmf, dtmfWav).channels[0];
const dtmfResult = Suite.utilities.decodeDtmf(dtmfDecoded, dtmfWav.sampleRate);
assert.equal(dtmfResult.keys, Corpus.constants.DTMF_PAYLOAD, 'DTMF demonstration did not round-trip through the authoritative decoder.');

const source = fs.readFileSync(path.join(root, 'binary-cube-media-forensics-demo-corpus.js'), 'utf8');
for (const required of [
  'Open in ${esc(demo.tool)}',
  'Save demonstration file',
  "suite.openPanel({ bytes: loaded.bytes, sourceName: loaded.demo.downloadName })",
  "suitePanel.querySelector('[data-bmfs-run]')?.click()",
  "suitePanel.querySelector('[data-bmfs-extract]')?.click()",
  "suitePanel.querySelector('[data-bmfs-audio-decode]')?.click()"
]) assert.ok(source.includes(required), `Demonstration corpus UI/integration is missing ${JSON.stringify(required)}.`);

console.log(JSON.stringify({
  receipt: 'hb-ttrpg-binary-cube-media-forensics-demo-corpus-validation-receipt',
  schema: '0.1.0',
  demos: Corpus.demos.map(demo => ({ id: demo.id, bytes: expectedSizes[demo.id], workflow: demo.workflow })),
  recovered: {
    rgbLsb: lsbPrefix.trim(),
    afsk: Buffer.from(afskResult.bytesMsb).toString('ascii'),
    afskConfidence: afskResult.meanConfidence,
    dtmf: dtmfResult.keys,
    postIendTrailingBytes: postScan.trailingBytes,
    postIendTrailingSignature: postScan.trailingSignature
  }
}, null, 2));
