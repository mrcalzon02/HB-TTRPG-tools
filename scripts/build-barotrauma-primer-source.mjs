import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const sourceDirectory = path.join(root, 'data/barotrauma/wiki/source');
const outputPath = path.join(root, 'data/barotrauma/wiki/crewmans-primer-source.json');
const expectedEncodedLength = 95872;
const expectedEncodedSha256 = '8f56d15084d4a1b48d26931cc8e1f54fceea2d2273b978ed4e33debd57d6c0b7';
const expectedEntries = 198;

const parts = Array.from(
  { length: 8 },
  (_, index) => path.join(sourceDirectory, `crewmans-primer-compact-part-${String(index).padStart(2, '0')}.b64`)
);

for (const file of parts) {
  if (!fs.existsSync(file)) {
    throw new Error(`Missing Crewman's Primer source segment: ${path.relative(root, file)}`);
  }
}

const encoded = parts.map(file => fs.readFileSync(file, 'utf8').replace(/\s+/g, '')).join('');
if (encoded.length !== expectedEncodedLength) {
  throw new Error(`Unexpected Primer source bundle length: ${encoded.length}; expected ${expectedEncodedLength}.`);
}

const encodedSha256 = crypto.createHash('sha256').update(encoded, 'utf8').digest('hex');
if (encodedSha256 !== expectedEncodedSha256) {
  throw new Error(`Primer source bundle checksum mismatch: ${encodedSha256}.`);
}

const compressed = Buffer.from(encoded, 'base64');
const decompressed = spawnSync('bzip2', ['-dc'], {
  input: compressed,
  maxBuffer: 8 * 1024 * 1024
});
if (decompressed.status !== 0) {
  throw new Error(`Unable to decompress Primer source bundle: ${decompressed.stderr.toString('utf8').trim()}`);
}

let source;
try {
  source = JSON.parse(decompressed.stdout.toString('utf8'));
} catch (error) {
  throw new Error(`Decompressed Primer source is not valid JSON: ${error.message}`);
}

if (!Array.isArray(source.entries) || source.entries.length !== expectedEntries) {
  throw new Error(`Expected ${expectedEntries} Primer entries; found ${source.entries?.length ?? 'none'}.`);
}

fs.writeFileSync(outputPath, `${JSON.stringify(source, null, 2)}\n`, 'utf8');
console.log(`Built ${path.relative(root, outputPath)} with ${source.entries.length} source-defined entries.`);
