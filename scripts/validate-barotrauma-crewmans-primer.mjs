import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const fail = message => {
  throw new Error(message);
};
const readJson = relativePath => {
  const absolutePath = path.join(root, relativePath);
  if (!fs.existsSync(absolutePath)) fail(`Missing required file: ${relativePath}`);
  try {
    return JSON.parse(fs.readFileSync(absolutePath, 'utf8'));
  } catch (error) {
    fail(`Invalid JSON in ${relativePath}: ${error.message}`);
  }
};
const readText = relativePath => {
  const absolutePath = path.join(root, relativePath);
  if (!fs.existsSync(absolutePath)) fail(`Missing required file: ${relativePath}`);
  return fs.readFileSync(absolutePath, 'utf8');
};
const requireString = (value, label) => {
  if (typeof value !== 'string' || !value.trim()) fail(`${label} must be a non-empty string.`);
};
const requireArray = (value, label, minimum = 0) => {
  if (!Array.isArray(value) || value.length < minimum) fail(`${label} must be an array with at least ${minimum} item(s).`);
};

const indexPath = 'data/barotrauma/wiki/crewmans-primer-index.json';
const registryPath = 'data/barotrauma-tools-registry.json';
const runtimePath = 'barotrauma-entry.js';
const sitePath = 'index.html';

const index = readJson(indexPath);
requireString(index.id, 'Primer index id');
if (index.id !== 'barotrauma-crewmans-primer') fail(`Unexpected Primer index id: ${index.id}`);
requireString(index.title, 'Primer title');
requireString(index.edition, 'Primer edition');
requireString(index.description, 'Primer description');
requireArray(index.packs, 'Primer packs', 1);
requireArray(index.readingOrder, 'Primer reading order', 1);
requireArray(index.categories, 'Primer categories', 1);

const entries = [];
for (const packName of index.packs) {
  requireString(packName, 'Primer pack name');
  const packPath = path.posix.join('data/barotrauma/wiki', packName);
  const pack = readJson(packPath);
  if (pack.primerId !== index.id) fail(`${packName} has mismatched primerId.`);
  requireArray(pack.entries, `${packName} entries`, 1);
  entries.push(...pack.entries);
}

if (entries.length !== index.entryCount) {
  fail(`Primer entryCount is ${index.entryCount}, but ${entries.length} entries were loaded.`);
}

const byId = new Map();
const sectionNumbers = new Set();
for (const [position, entry] of entries.entries()) {
  requireString(entry.id, `Entry ${position + 1} id`);
  if (byId.has(entry.id)) fail(`Duplicate Primer entry id: ${entry.id}`);
  byId.set(entry.id, entry);

  requireString(entry.sectionNumber, `${entry.id} sectionNumber`);
  if (sectionNumbers.has(entry.sectionNumber)) fail(`Duplicate Primer section number: ${entry.sectionNumber}`);
  sectionNumbers.add(entry.sectionNumber);

  requireString(entry.category, `${entry.id} category`);
  if (!index.categories.includes(entry.category)) fail(`${entry.id} uses unregistered category: ${entry.category}`);
  requireString(entry.title, `${entry.id} title`);
  requireString(entry.subtitle, `${entry.id} subtitle`);
  requireString(entry.summary, `${entry.id} summary`);
  requireArray(entry.body, `${entry.id} body`, 1);
  requireArray(entry.doctrine, `${entry.id} doctrine`, 1);
  requireArray(entry.procedures, `${entry.id} procedures`, 1);
  requireArray(entry.warnings, `${entry.id} warnings`, 1);
  requireArray(entry.fieldNotes, `${entry.id} fieldNotes`, 1);
  requireArray(entry.relatedEntries, `${entry.id} relatedEntries`, 1);

  for (const procedure of entry.procedures) {
    requireString(procedure.title, `${entry.id} procedure title`);
    requireArray(procedure.steps, `${entry.id} procedure steps`, 1);
    procedure.steps.forEach((step, stepIndex) => requireString(step, `${entry.id} procedure step ${stepIndex + 1}`));
  }

  if (entry.footnotes !== undefined) {
    requireArray(entry.footnotes, `${entry.id} footnotes`, 0);
    for (const footnote of entry.footnotes) {
      requireString(footnote.title, `${entry.id} footnote title`);
      requireString(footnote.text, `${entry.id} footnote text`);
    }
  }
}

const orderSet = new Set(index.readingOrder);
if (orderSet.size !== index.readingOrder.length) fail('Primer readingOrder contains duplicate IDs.');
if (index.readingOrder.length !== entries.length) {
  fail(`Primer readingOrder has ${index.readingOrder.length} IDs for ${entries.length} entries.`);
}
for (const id of index.readingOrder) {
  if (!byId.has(id)) fail(`Primer readingOrder references missing entry: ${id}`);
}
for (const id of byId.keys()) {
  if (!orderSet.has(id)) fail(`Primer entry is missing from readingOrder: ${id}`);
}
for (const entry of entries) {
  for (const relatedId of entry.relatedEntries) {
    if (!byId.has(relatedId)) fail(`${entry.id} references missing related entry: ${relatedId}`);
    if (relatedId === entry.id) fail(`${entry.id} links to itself as a related entry.`);
  }
}

const requiredEntries = [
  'weapons-and-line-of-fire',
  'assistant-and-clown-question',
  'two-calls-below-the-ice',
  'medical-and-biosecurity',
  'emergency-priority-ladder',
  'incident-reports-and-memory'
];
for (const id of requiredEntries) {
  if (!byId.has(id)) fail(`Missing required Primer section: ${id}`);
}

const weaponsText = JSON.stringify(byId.get('weapons-and-line-of-fire'));
if (!weaponsText.includes("Never fire through a crew member's occupied space.")) {
  fail('The strict line-of-fire doctrine is missing from the weapons section.');
}
const cultText = JSON.stringify(byId.get('two-calls-below-the-ice'));
if (!cultText.includes('Children of the Honkmother') || !cultText.includes('Church of the Husk')) {
  fail('The comparative Honkmother and Husk reference is incomplete.');
}
const clownText = JSON.stringify(byId.get('assistant-and-clown-question'));
if (!clownText.includes('prank') || !clownText.includes('operational')) {
  fail('The assistant and clown conduct section is missing its operational-hazard standard.');
}

const registry = readJson(registryPath);
const module = (registry.modules || []).find(item => item.id === index.id);
if (!module) fail('The Crewman\'s Primer is not registered in the Barotrauma module registry.');
if (module.status !== 'alpha') fail(`Crewman's Primer registry status must be alpha, found: ${module.status}`);
if (module.launchTarget !== 'crewmans-primer') fail('Crewman\'s Primer launchTarget is not configured.');
if (module.wikiIndex !== indexPath) fail('Crewman\'s Primer wikiIndex does not point to the canonical index.');
if (module.entryCount !== entries.length) fail('Crewman\'s Primer registry entryCount does not match loaded entries.');

const runtime = readText(runtimePath);
for (const marker of [
  "const PRIMER_INDEX_URL = 'data/barotrauma/wiki/crewmans-primer-index.json'",
  'async function openPrimer()',
  'function renderPrimer(',
  'function renderPrimerEntry(',
  "module.launchTarget === 'crewmans-primer'"
]) {
  if (!runtime.includes(marker)) fail(`Barotrauma runtime is missing required Primer marker: ${marker}`);
}

const site = readText(sitePath);
if (!site.includes('id="barotrauma"')) fail('The Barotrauma workspace section is missing from index.html.');
if (!site.includes('<script src="barotrauma-entry.js"></script>')) fail('barotrauma-entry.js is not loaded by index.html.');

console.log(`Validated The Europan Crewman's Primer: ${entries.length} entries across ${index.packs.length} packs, ${index.categories.length} categories, all cross-links resolved.`);
