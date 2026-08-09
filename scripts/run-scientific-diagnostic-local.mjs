#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const Pipeline = require(path.join(root, 'binary-cube-diagnostic-pipeline.js'));
const LocalMedia = require(path.join(root, 'scientific-tools-local-media.js'));

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

const args = parseArgs(process.argv.slice(2));
const absolute = path.resolve(args.file);
const bytes = new Uint8Array(fs.readFileSync(absolute));
let raster = null;
try { raster = LocalMedia.decodePngRgba(bytes); } catch (error) { console.error(`[local diagnostic] PNG pixel decode unavailable: ${error.message}`); }
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
