#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import zlib from 'node:zlib';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const Pipeline = require(path.join(root, 'binary-cube-diagnostic-pipeline.js'));

function usage() {
  console.error('Usage: node scripts/run-scientific-diagnostic-local.mjs <file> [--profile=triage|thorough|exhaustive] [--json=<report.json>]');
  process.exit(2);
}

function parseArgs(argv) {
  const values = { file: '', profile: 'thorough', json: '' };
  for (const argument of argv) {
    if (argument.startsWith('--profile=')) values.profile = argument.slice('--profile='.length);
    else if (argument.startsWith('--json=')) values.json = argument.slice('--json='.length);
    else if (!values.file) values.file = argument;
    else usage();
  }
  if (!values.file) usage();
  return values;
}

function u32be(bytes, offset) { return ((bytes[offset] << 24) | (bytes[offset + 1] << 16) | (bytes[offset + 2] << 8) | bytes[offset + 3]) >>> 0; }
function paeth(a, b, c) { const p = a + b - c; const pa = Math.abs(p - a); const pb = Math.abs(p - b); const pc = Math.abs(p - c); return pa <= pb && pa <= pc ? a : pb <= pc ? b : c; }

function decodePngRgba(bytesValue) {
  const bytes = Buffer.from(bytesValue);
  const signature = Buffer.from([137,80,78,71,13,10,26,10]);
  if (bytes.length < 33 || !bytes.subarray(0, 8).equals(signature)) return null;
  let offset = 8;
  let width = 0; let height = 0; let bitDepth = 0; let colorType = -1; let interlace = 0;
  const idat = [];
  while (offset + 12 <= bytes.length) {
    const length = u32be(bytes, offset); offset += 4;
    const type = bytes.subarray(offset, offset + 4).toString('ascii'); offset += 4;
    if (offset + length + 4 > bytes.length) throw new Error('PNG chunk exceeds file boundary.');
    const data = bytes.subarray(offset, offset + length); offset += length + 4;
    if (type === 'IHDR') { width = u32be(data, 0); height = u32be(data, 4); bitDepth = data[8]; colorType = data[9]; interlace = data[12]; }
    else if (type === 'IDAT') idat.push(data);
    else if (type === 'IEND') break;
  }
  if (!width || !height) throw new Error('PNG IHDR is missing.');
  if (bitDepth !== 8 || interlace !== 0 || ![0,2,4,6].includes(colorType)) return null;
  const channels = colorType === 0 ? 1 : colorType === 2 ? 3 : colorType === 4 ? 2 : 4;
  const stride = width * channels;
  const inflated = zlib.inflateSync(Buffer.concat(idat));
  const expected = height * (stride + 1);
  if (inflated.length < expected) throw new Error('PNG decompressed scanline data is shorter than expected.');
  const raw = Buffer.alloc(height * stride);
  let sourceOffset = 0;
  for (let y = 0; y < height; y += 1) {
    const filter = inflated[sourceOffset++];
    const row = inflated.subarray(sourceOffset, sourceOffset + stride); sourceOffset += stride;
    const outRow = raw.subarray(y * stride, (y + 1) * stride);
    const prior = y ? raw.subarray((y - 1) * stride, y * stride) : null;
    for (let x = 0; x < stride; x += 1) {
      const left = x >= channels ? outRow[x - channels] : 0;
      const up = prior ? prior[x] : 0;
      const upLeft = prior && x >= channels ? prior[x - channels] : 0;
      const value = row[x];
      if (filter === 0) outRow[x] = value;
      else if (filter === 1) outRow[x] = (value + left) & 0xff;
      else if (filter === 2) outRow[x] = (value + up) & 0xff;
      else if (filter === 3) outRow[x] = (value + Math.floor((left + up) / 2)) & 0xff;
      else if (filter === 4) outRow[x] = (value + paeth(left, up, upLeft)) & 0xff;
      else throw new Error(`Unsupported PNG filter ${filter}.`);
    }
  }
  const rgba = new Uint8ClampedArray(width * height * 4);
  for (let pixel = 0; pixel < width * height; pixel += 1) {
    const source = pixel * channels; const target = pixel * 4;
    if (colorType === 0) { rgba[target] = rgba[target + 1] = rgba[target + 2] = raw[source]; rgba[target + 3] = 255; }
    else if (colorType === 2) { rgba[target] = raw[source]; rgba[target + 1] = raw[source + 1]; rgba[target + 2] = raw[source + 2]; rgba[target + 3] = 255; }
    else if (colorType === 4) { rgba[target] = rgba[target + 1] = rgba[target + 2] = raw[source]; rgba[target + 3] = raw[source + 1]; }
    else { rgba[target] = raw[source]; rgba[target + 1] = raw[source + 1]; rgba[target + 2] = raw[source + 2]; rgba[target + 3] = raw[source + 3]; }
  }
  return Object.freeze({ width, height, rgba, source: 'Node built-in PNG decoder (8-bit, non-interlaced)' });
}

const args = parseArgs(process.argv.slice(2));
const absolute = path.resolve(args.file);
const bytes = new Uint8Array(fs.readFileSync(absolute));
let raster = null;
try { raster = decodePngRgba(bytes); } catch (error) { console.error(`[local diagnostic] PNG pixel decode unavailable: ${error.message}`); }
const report = await Pipeline.runPipeline(bytes, {
  sourceName: path.basename(absolute),
  profile: args.profile,
  raster,
  onProgress(update) {
    const percent = Math.round((Number(update.fraction) || 0) * 100);
    process.stderr.write(`\r[local diagnostic] ${String(update.label || 'working').padEnd(56).slice(0,56)} ${String(percent).padStart(3)}%`);
  }
});
process.stderr.write('\n');
const serialized = JSON.stringify(report, (key, value) => {
  if (value instanceof Uint8Array || value instanceof Uint8ClampedArray) return { type: value.constructor.name, length: value.length };
  if (value instanceof ArrayBuffer) return { type: 'ArrayBuffer', byteLength: value.byteLength };
  return value;
}, 2);
if (args.json) fs.writeFileSync(path.resolve(args.json), serialized + '\n');
process.stdout.write(serialized + '\n');
