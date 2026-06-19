import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const root = process.cwd();
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const json = file => JSON.parse(read(file));
const exists = file => fs.existsSync(path.join(root, file));
const fail = message => { throw new Error(message); };
const hash = text => crypto.createHash('sha256').update(text).digest('hex');

const indexPath = 'data/barotrauma/wiki/crewmans-primer-index.json';
const sourceJsonPath = 'data/barotrauma/wiki/crewmans-primer-source.json';
const index = json(indexPath);
if (index.id !== 'barotrauma-crewmans-primer') fail('Unexpected Primer id.');
if (index.schemaVersion !== '2.1.0') fail('Primer must use schema 2.1.0.');
if (index.sourceMode !== 'full-manuscript-transcription') fail('Primer is not marked as a full manuscript transcription.');
if (index.entryCount !== 198 || index.readingOrder?.length !== 198) fail('Primer must declare exactly 198 source-title entries.');
if (index.readingOrder[0] !== 'foreword' || index.readingOrder.at(-1) !== 'final-caution') fail('Primer source-title order is incomplete.');
if (index.blockCount !== 2321 || index.bodyTextUnitCount !== 3751 || index.sourceNonEmptyParagraphCount !== 3952) fail('Primer source counts do not match the approved conversion.');
if (index.textSequenceSha256 !== 'd1b84f0c414bd28dac5d83735822966f2a55d3091a74c2be81e7387582bda129') fail('Primer source sequence hash is incorrect.');

const parts = Array.from({ length: 8 }, (_, index) =>
  `data/barotrauma/wiki/source/crewmans-primer-compact-part-${String(index).padStart(2, '0')}.b64`
);
const encoded = parts.map(file => {
  if (!exists(file)) fail(`Missing Primer source segment: ${file}`);
  return read(file).replace(/\s+/g, '');
}).join('');
if (encoded.length !== 95872) fail(`Primer source bundle has unexpected length ${encoded.length}.`);
if (hash(encoded) !== '8f56d15084d4a1b48d26931cc8e1f54fceea2d2273b978ed4e33debd57d6c0b7') fail('Primer source bundle checksum is incorrect.');

if (exists(sourceJsonPath)) {
  const source = json(sourceJsonPath);
  if (!Array.isArray(source.entries) || source.entries.length !== 198) fail(`Generated Primer source must contain 198 entries; found ${source.entries?.length ?? 'none'}.`);
  if (source.entries[0]?.id !== 'foreword' || source.entries.at(-1)?.id !== 'final-caution') fail('Generated Primer source order is incomplete.');
}

const registry = json('data/barotrauma-tools-registry.json');
const module = registry.modules?.find(item => item.id === index.id);
if (!module || module.status !== 'available' || module.launchTarget !== 'crewmans-primer' || module.wikiIndex !== indexPath || module.entryCount !== 198) fail('Primer registry metadata is incomplete.');
if (module.sourceActionLabel !== 'Open Source Document Viewer') fail('Primer source viewer action is not registered.');
if (!Array.isArray(module.viewerModes) || !module.viewerModes.includes('wikiEntries') || !module.viewerModes.includes('sourceDocument')) fail('Primer viewer modes are not registered.');

const dashboardRuntime = read('barotrauma-entry.js');
for (const marker of [
  'crewmans-primer-source.json',
  'Expected 198 source-titled entries',
  'Source Document Viewer'
]) {
  if (!dashboardRuntime.includes(marker)) fail(`Primer dashboard runtime is missing ${marker}.`);
}
if (dashboardRuntime.includes('bzip2-wasm') || dashboardRuntime.includes('cdn.jsdelivr.net')) fail('Primer dashboard runtime must not depend on an external decompression CDN.');

const standalonePage = read('barotrauma-primer.html');
for (const marker of [
  'barotrauma-primer.html?mode=wiki',
  'barotrauma-primer.html?mode=source',
  'vendor/bzip2-browser.js',
  'barotrauma-primer-page.js',
  'THE EUROPAN CREWMAN’S PRIMER'
]) {
  if (!standalonePage.includes(marker)) fail(`Standalone Primer page is missing ${marker}.`);
}
if (standalonePage.indexOf('vendor/bzip2-browser.js') > standalonePage.indexOf('barotrauma-primer-page.js')) {
  fail('The local BZip2 decoder must load before the standalone Primer runtime.');
}

const standaloneRuntime = read('barotrauma-primer-page.js');
for (const marker of [
  'crewmans-primer-source.json',
  'sourceParts',
  'rebuildSourceFromTrackedBundle',
  '95872',
  'window.bzip2',
  'tracked-source-bundle',
  'Expected 198 source-defined entries',
  "entries[0]?.id !== 'foreword'",
  "entries.at(-1)?.id !== 'final-caution'",
  'function renderWiki(',
  'function renderSource(',
  'function appendBlocks('
]) {
  if (!standaloneRuntime.includes(marker)) fail(`Standalone Primer runtime is missing ${marker}.`);
}
if (standaloneRuntime.includes('cdn.jsdelivr.net') || standaloneRuntime.includes('bzip2-wasm')) {
  fail('Standalone Primer runtime must use only the local tracked source fallback.');
}

const decoderPath = 'vendor/bzip2-browser.js';
if (!exists(decoderPath)) fail(`Missing local Primer source decoder: ${decoderPath}`);
const decoder = read(decoderPath);
for (const marker of ['global.bzip2 = bzip2', 'bzip2.array', 'bzip2.simple', 'bzip2.decompress']) {
  if (!decoder.includes(marker)) fail(`Local Primer source decoder is missing ${marker}.`);
}

const characterSheetRuntime = read('character-sheet-title.js');
for (const marker of [
  'barotrauma-primer.html?mode=wiki',
  'barotrauma-primer.html?mode=source',
  'forcePrimerNavigation',
  'window.location.assign(destination)'
]) {
  if (!characterSheetRuntime.includes(marker)) fail(`Always-loaded Primer navigation is missing ${marker}.`);
}

const nativeLinkGuard = read('barotrauma-primer-click-fix.js');
for (const marker of [
  'barotrauma-primer.html?mode=wiki',
  'barotrauma-primer.html?mode=source',
  'data-primer-native-link',
  'replaceWith(link)'
]) {
  if (!nativeLinkGuard.includes(marker)) fail(`Primer native-link upgrade is missing ${marker}.`);
}

const builder = read('scripts/build-barotrauma-primer-source.mjs');
for (const marker of ['bzip2', 'crewmans-primer-source.json', 'Expected ${expectedEntries} Primer entries']) {
  if (!builder.includes(marker)) fail(`Primer source builder is missing ${marker}.`);
}

const browserVerification = read('scripts/run-barotrauma-primer-browser-verification.mjs');
for (const marker of [
  'forceMissingGeneratedJson',
  'Generated Primer JSON fallback',
  'rebuilt from tracked source',
  'nativeWikiLink',
  'nativeSourceLink',
  'Expected 198 continuous source sections',
  'Expected 198 source table-of-contents entries',
  'THE CROUCHING FALLACY',
  'THE CHILDREN OF THE HONKMOTHER',
  'sourceToWikiNavigation'
]) {
  if (!browserVerification.includes(marker)) fail(`Primer browser verification is missing ${marker}.`);
}

const site = read('index.html');
if (!site.includes('id="barotrauma"') || !site.includes('<script src="barotrauma-entry.js"></script>')) fail('Barotrauma workspace or dashboard runtime include is missing.');

console.log(`Validated Crewman's Primer: 198 titled entries, native dashboard links, standalone wiki and source pages, an exact 8-part source bundle, and a local browser fallback that survives a missing generated JSON file.`);
