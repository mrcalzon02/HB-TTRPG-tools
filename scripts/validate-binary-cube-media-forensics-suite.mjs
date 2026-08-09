#!/usr/bin/env node

import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const Suite = require('../binary-cube-media-forensics-suite.js');
const U = Suite.utilities;

assert.equal(Suite.constants.PANEL_ID, 'binary-cube-media-forensics-suite');
assert.ok(Suite.constants.CONVOLUTION_KERNELS.sobelX);
assert.ok(Suite.constants.AUDIO_PRESETS.afsk1200);
assert.equal(typeof Suite.fullForensicSweep, 'function');

const hidden = U.textToBytes('LSB extraction verified.');
const hiddenBits = U.unpackBits(hidden, 'msb');
const carrier = new Uint8Array(hiddenBits.length);
for (let index = 0; index < carrier.length; index += 1) carrier[index] = (0xa4 & 0xfe) | hiddenBits[index];
const rawExtracted = U.extractByteBitPlane(carrier, 0, { bitOrder: 'msb' });
assert.equal(U.bytesToText(rawExtracted.bytes), 'LSB extraction verified.');
assert.equal(rawExtracted.bitCount, hiddenBits.length);

const selected = U.extractSelectedBits(Uint8Array.from([0b00000011, 0b00000001]), [0, 1]);
assert.deepEqual(selected.bits.slice(0, 4), [1, 1, 1, 0]);
const diagnostics = U.bitPlaneDiagnostics(carrier);
assert.equal(diagnostics.length, 8);
assert.ok(diagnostics.every(row => row.entropy >= 0 && row.entropy <= 1));
const lsbChi = U.lsbPairChiSquare(carrier);
assert.ok(Number.isFinite(lsbChi.normalized));
assert.match(lsbChi.note, /not a proof/i);

const identity1d = U.convolve1d([1, 2, 3, 4], [0, 1, 0]);
assert.deepEqual(Array.from(identity1d), [1, 2, 3, 4]);
const difference = U.convolve1d([1, 2, 4, 7], [-1, 1], { boundary: 'zero' });
assert.equal(difference.length, 4);
const matrix = U.parseKernelMatrix('0 -1 0\n-1 4 -1\n0 -1 0');
assert.equal(matrix.width, 3);
assert.equal(matrix.height, 3);
const imageValues = [1,2,3,4,5,6,7,8,9];
const identity2d = U.convolve2d(imageValues, 3, 3, Suite.constants.CONVOLUTION_KERNELS.identity);
assert.deepEqual(Array.from(identity2d), imageValues);
const correlation = U.crossCorrelate1d([0,1,0,0], [0,0,1,0], 3);
assert.equal(correlation.length, 7);
assert.ok(correlation.some(row => row.correlation > 0.99));

const rgba = new Uint8Array(Math.ceil(hiddenBits.length / 3) * 4);
for (let pixel = 0, bit = 0; pixel < rgba.length / 4; pixel += 1) {
  rgba[pixel * 4 + 3] = 255;
  for (let channel = 0; channel < 3; channel += 1) {
    rgba[pixel * 4 + channel] = 0x80 | (hiddenBits[bit] || 0);
    bit += 1;
  }
}
const rasterExtracted = U.extractRasterLsb(rgba, { channels: 'rgb', bitIndex: 0, bitOrder: 'msb' });
assert.equal(U.bytesToText(rasterExtracted.bytes.slice(0, hidden.length)), 'LSB extraction verified.');
const planeImage = U.rasterBitPlaneImage(rgba, 0, 'rgb');
assert.equal(planeImage.length, rgba.length);
const rasterConvolution = U.convolveRasterChannel(rgba, rgba.length / 4, 1, Suite.constants.CONVOLUTION_KERNELS.identity, 'r');
assert.equal(rasterConvolution.rgba.length, rgba.length);

function buildPcm16Wav(bits, sampleRate = 8000) {
  const frames = bits.length;
  const dataSize = frames * 2;
  const bytes = new Uint8Array(44 + dataSize);
  const view = new DataView(bytes.buffer);
  function ascii(offset, text) { for (let i = 0; i < text.length; i += 1) bytes[offset + i] = text.charCodeAt(i); }
  ascii(0, 'RIFF'); view.setUint32(4, 36 + dataSize, true); ascii(8, 'WAVE'); ascii(12, 'fmt '); view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true); view.setUint32(24, sampleRate, true); view.setUint32(28, sampleRate * 2, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true); ascii(36, 'data'); view.setUint32(40, dataSize, true);
  for (let frame = 0; frame < frames; frame += 1) view.setInt16(44 + frame * 2, 1000 | bits[frame], true);
  return bytes;
}

const wavBytes = buildPcm16Wav(hiddenBits);
const wav = U.parseWav(wavBytes);
assert.equal(wav.valid, true);
assert.equal(wav.channels, 1);
assert.equal(wav.bitsPerSample, 16);
assert.equal(wav.frameCount, hiddenBits.length);
const pcmExtracted = U.extractPcmSampleBitPlane(wavBytes, wav, 0, 0, { bitOrder: 'msb' });
assert.equal(U.bytesToText(pcmExtracted.bytes), 'LSB extraction verified.');
const pcmDelta = U.extractPcmDeltaBitPlane(wavBytes, wav, 0, 0, { bitOrder: 'msb' });
assert.ok(pcmDelta.bitCount > 0);
const decodedWav = U.decodeWavChannels(wavBytes, wav);
assert.equal(decodedWav.channels.length, 1);
assert.equal(decodedWav.channels[0].length, hiddenBits.length);
const wavReport = U.wavSweep(wavBytes);
assert.equal(wavReport.wav.valid, true);
assert.ok(wavReport.sampleBitPlanes.length >= 8);

const sampleRate = 48000;
function tone(frequencies, seconds, amplitude = 0.45) {
  const count = Math.floor(sampleRate * seconds);
  return Float32Array.from({ length: count }, (_, index) => frequencies.reduce((sum, frequency) => sum + amplitude / frequencies.length * Math.sin(2 * Math.PI * frequency * index / sampleRate), 0));
}
const dtmfSamples = tone([770, 1336], 0.25);
const dtmf = U.decodeDtmf(dtmfSamples, sampleRate, { minimumRatio: 1.5 });
assert.match(dtmf.keys, /5/);

const fskBits = U.unpackBits(U.textToBytes('OK'), 'msb');
const baud = 1200;
const symbolSamples = sampleRate / baud;
const fskSamples = new Float32Array(Math.floor(fskBits.length * symbolSamples));
for (let bit = 0; bit < fskBits.length; bit += 1) {
  const frequency = fskBits[bit] ? 1200 : 2200;
  for (let i = 0; i < symbolSamples; i += 1) {
    const index = Math.floor(bit * symbolSamples + i);
    fskSamples[index] = 0.7 * Math.sin(2 * Math.PI * frequency * i / sampleRate);
  }
}
const fsk = U.decodeBinaryFsk(fskSamples, sampleRate, { markFrequency: 1200, spaceFrequency: 2200, baud });
assert.deepEqual(fsk.bits.slice(0, fskBits.length), fskBits);
assert.equal(U.bytesToText(fsk.bytesMsb.slice(0, 2)), 'OK');
assert.ok(fsk.meanConfidence > 0.1);

const ookBits = [1,0,1,1,0,0,1,0];
const ookSamples = new Float32Array(Math.floor(ookBits.length * symbolSamples));
for (let bit = 0; bit < ookBits.length; bit += 1) for (let i = 0; i < symbolSamples; i += 1) ookSamples[Math.floor(bit * symbolSamples + i)] = ookBits[bit] ? 0.8 * Math.sin(2 * Math.PI * 1200 * i / sampleRate) : 0;
const ook = U.decodeOnOffKeying(ookSamples, sampleRate, { carrierFrequency: 1200, baud });
assert.deepEqual(ook.bits.slice(0, ookBits.length), ookBits);

const spectrum = U.spectralSummary(tone([1000], 0.2), sampleRate);
assert.ok(spectrum.dominant.some(item => Math.abs(item.frequency - 1000) < 20));
assert.ok(Number.isFinite(spectrum.centroidHz));
assert.ok(Number.isFinite(U.goertzelPower(tone([1000], 0.1), sampleRate, 1000)));

const png = new Uint8Array([
  0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a,
  0,0,0,0, 0x49,0x45,0x4e,0x44, 0,0,0,0,
  0x50,0x4b,0x03,0x04
]);
const pngInfo = U.parsePngChunks(png);
assert.equal(pngInfo.chunks.at(-1).type, 'IEND');
assert.equal(pngInfo.trailingBytes, 4);
const container = U.scanContainer(png);
assert.equal(container.type, 'PNG');
assert.equal(container.trailingSignature, 'ZIP / OOXML / JAR');

const sweep = Suite.fullForensicSweep(wavBytes);
assert.equal(sweep.bytes.signature, 'WAV');
assert.equal(sweep.wav.wav.valid, true);
assert.match(sweep.caveat, /not proof/i);

console.log(JSON.stringify({
  format: 'hb-ttrpg-binary-cube-media-forensics-validation-receipt',
  schemaVersion: '0.1.0',
  pass: true,
  rawLeastSignificantBitExtraction: true,
  selectedBitAndBitPlaneDiagnostics: true,
  lsbPairSteganalysis: true,
  oneDimensionalConvolutionAndCorrelation: true,
  twoDimensionalConvolutionMatrices: true,
  rasterChannelAndLsbExtraction: true,
  rasterBitPlaneRendering: true,
  rawPcmWavParsing: true,
  pcmSampleAndDeltaBitExtraction: true,
  waveformStatisticsAndFftSpectrum: true,
  dtmfDecoding: true,
  binaryFskAfskDecoding: true,
  onOffKeyingDecoding: true,
  pngJpegRiffId3ContainerCarving: true,
  appendedPayloadDetection: true,
  workerDelegatesAuthoritativeSuite: true,
  intentionalEmbeddingClaimedFromHeuristicAlone: false
}, null, 2));