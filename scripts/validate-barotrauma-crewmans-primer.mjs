import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const root = process.cwd();
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const json = file => JSON.parse(read(file));
const fail = message => { throw new Error(message); };
const hash = text => crypto.createHash('sha256').update(text).digest('hex');

const indexPath = 'data/barotrauma/wiki/crewmans-primer-index.json';
const index = json(indexPath);
if (index.id !== 'barotrauma-crewmans-primer') fail('Unexpected Primer id.');
if (index.schemaVersion !== '2.1.0') fail('Primer must use schema 2.1.0.');
if (index.sourceMode !== 'full-manuscript-transcription' || index.sourceFaithful !== true) fail('Primer is not marked as a source-faithful manuscript transcription.');
if (index.entryCount !== 198 || index.readingOrder?.length !== 198) fail('Primer must declare exactly 198 source-title entries.');
if (index.readingOrder[0] !== 'foreword' || index.readingOrder.at(-1) !== 'final-caution') fail('Primer source-title order is incomplete.');
if (index.blockCount !== 2321 || index.bodyTextUnitCount !== 3751 || index.sourceNonEmptyParagraphCount !== 3952) fail('Primer source counts do not match the approved conversion.');
if (index.textSequenceSha256 !== 'd1b84f0c414bd28dac5d83735822966f2a55d3091a74c2be81e7387582bda129') fail('Primer source sequence hash is incorrect.');

const parts = Array.from({ length: 8 }, (_, i) => `data/barotrauma/wiki/source/crewmans-primer-compact-part-${String(i).padStart(2, '0')}.b64`);
const encoded = parts.map(file => {
  if (!fs.existsSync(path.join(root, file))) fail(`Missing Primer source segment: ${file}`);
  return read(file).trim();
}).join('');
if (encoded.length !== 95872) fail(`Primer source bundle has unexpected length ${encoded.length}.`);
if (hash(encoded) !== '8f56d15084d4a1b48d26931cc8e1f54fceea2d2273b978ed4e33debd57d6c0b7') fail('Primer source bundle checksum is incorrect.');

const registry = json('data/barotrauma-tools-registry.json');
const module = registry.modules?.find(item => item.id === index.id);
if (!module || module.status !== 'available' || module.launchTarget !== 'crewmans-primer' || module.wikiIndex !== indexPath || module.entryCount !== 198) fail('Primer registry metadata is incomplete.');

const runtime = read('barotrauma-entry.js');
for (const marker of ['crewmans-primer-compact-part-', 'bzip2-wasm@1.0.1', 'function renderBlocks(', 'Expected 198 source-titled entries']) if (!runtime.includes(marker)) fail(`Primer runtime is missing ${marker}.`);
const site = read('index.html');
if (!site.includes('id="barotrauma"') || !site.includes('<script src="barotrauma-entry.js"></script>')) fail('Barotrauma workspace or runtime include is missing.');

console.log(`Validated Crewman's Primer source bundle: 198 titled entries, 8 source segments, ${index.sourceNonEmptyParagraphCount} preserved source text units.`);
