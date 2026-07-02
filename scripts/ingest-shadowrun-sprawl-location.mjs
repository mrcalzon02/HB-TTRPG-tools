import fs from 'node:fs';
import path from 'node:path';

const body = process.env.ISSUE_BODY_FILE
  ? fs.readFileSync(process.env.ISSUE_BODY_FILE, 'utf8')
  : (process.env.ISSUE_BODY || '');
const marker = '<!-- SHADOWRUN_SPRAWL_LOCATION_PATCH -->';
if (!body.includes(marker)) throw new Error('Missing Shadowrun sprawl location registry marker.');

const match = body.match(/```json\s*([\s\S]*?)```/i);
if (!match) throw new Error('Missing fenced JSON Shadowrun registry patch.');

let patch;
try {
  patch = JSON.parse(match[1]);
} catch (error) {
  throw new Error(`Shadowrun registry patch is not valid JSON: ${error.message}`);
}

if (patch?.schemaVersion !== '1.0.0') throw new Error('Unsupported Shadowrun registry schemaVersion.');
if (patch?.target !== 'data/shadowrun/sprawl_location_registry.json') throw new Error('Shadowrun registry patch target is not allowed.');
if (!/^srpoi-[0-9a-f]{8}$/.test(patch?.entryKey || '')) throw new Error('entryKey must use the srpoi-xxxxxxxx format.');
if (['__proto__', 'constructor', 'prototype'].includes(patch.entryKey)) throw new Error('Forbidden entry key.');

const entry = patch.entry;
if (!entry || typeof entry !== 'object' || Array.isArray(entry)) throw new Error('Missing Shadowrun registry entry.');
if (entry.entryKey !== patch.entryKey) throw new Error('entry.entryKey must match patch.entryKey.');
if (typeof entry.name !== 'string' || !entry.name.trim() || entry.name.length > 200) throw new Error('entry.name is required and must be 200 characters or fewer.');
if (typeof entry.address !== 'string' || entry.address.length > 500) throw new Error('entry.address must be 500 characters or fewer.');
if (!entry.coordinates || !Number.isFinite(entry.coordinates.lat) || !Number.isFinite(entry.coordinates.lng)) throw new Error('Finite coordinates are required.');
if (entry.coordinates.lat < -90 || entry.coordinates.lat > 90 || entry.coordinates.lng < -180 || entry.coordinates.lng > 180) throw new Error('Coordinates are outside valid latitude/longitude ranges.');
if (typeof entry.sourceCategory !== 'string' || !/^[a-z0-9_]{2,50}$/.test(entry.sourceCategory)) throw new Error('sourceCategory is invalid.');
if (!['balanced', 'corporate', 'street', 'matrix', 'magic', 'security', 'smuggling'].includes(entry.focus)) throw new Error('focus is invalid.');
if (!['low', 'standard', 'high', 'prime'].includes(entry.threat)) throw new Error('threat is invalid.');
if (!['STANDARD_UNCLAIMED', 'SUPPORTIVE', 'OPT_OUT'].includes(entry.workspaceStatus)) throw new Error('workspaceStatus is invalid.');

for (const field of ['sourceCategoryLabel', 'focusLabel', 'threatLabel', 'archetypeId', 'archetypeName', 'shadowCategory']) {
  if (typeof entry[field] !== 'string' || entry[field].length > 240) throw new Error(`${field} is invalid.`);
}
for (const field of ['publicFacade', 'shadowUse', 'accessVector', 'security', 'matrix', 'magical', 'complication']) {
  if (typeof entry[field] !== 'string' || entry[field].length > 6000) throw new Error(`${field} must be a string of 6000 characters or fewer.`);
}
for (const field of ['mapsUrl', 'streetViewUrl']) {
  if (typeof entry[field] !== 'string' || entry[field].length > 2000) throw new Error(`${field} is invalid.`);
  if (entry[field] && !/^https:\/\/(www\.)?google\.[^/]+\/maps\//i.test(entry[field]) && !/^https:\/\/maps\.app\.goo\.gl\//i.test(entry[field])) {
    throw new Error(`${field} must be a Google Maps URL.`);
  }
}
for (const field of ['clues', 'legwork']) {
  if (!Array.isArray(entry[field]) || entry[field].length > 12) throw new Error(`${field} must be an array with no more than 12 entries.`);
  for (const value of entry[field]) {
    if (typeof value !== 'string' || value.length > 1000) throw new Error(`${field} contains an invalid value.`);
  }
}
if (!Array.isArray(entry.relatedSites) || entry.relatedSites.length > 12) throw new Error('relatedSites must be an array with no more than 12 entries.');
for (const related of entry.relatedSites) {
  if (!related || typeof related !== 'object' || Array.isArray(related)) throw new Error('A relatedSites entry is invalid.');
  if (typeof related.siteKey !== 'string' || related.siteKey.length > 80) throw new Error('relatedSites.siteKey is invalid.');
  if (typeof related.name !== 'string' || related.name.length > 200) throw new Error('relatedSites.name is invalid.');
  if (typeof related.reason !== 'string' || related.reason.length > 500) throw new Error('relatedSites.reason is invalid.');
}
for (const field of ['savedAt', 'submittedAt']) {
  if (typeof entry[field] !== 'string' || Number.isNaN(Date.parse(entry[field]))) throw new Error(`${field} must be an ISO-compatible timestamp.`);
}

const targetPath = path.resolve(process.cwd(), patch.target);
const registry = JSON.parse(fs.readFileSync(targetPath, 'utf8'));
if (registry.schemaVersion !== '1.0.0') throw new Error('Target Shadowrun registry is not schema version 1.0.0.');
registry.entries ||= {};

const canonical = value => {
  const copy = structuredClone(value);
  delete copy.savedAt;
  delete copy.submittedAt;
  delete copy.submittedFromIssue;
  delete copy.committedAt;
  return JSON.stringify(copy);
};

const existing = registry.entries[patch.entryKey];
if (existing) {
  if (canonical(existing) !== canonical(entry)) {
    throw new Error(`Shadowrun location ${patch.entryKey} already exists with different immutable content.`);
  }
  console.log(`Shadowrun location ${patch.entryKey} already exists with identical content; no overwrite required.`);
  process.exit(0);
}

registry.entries[patch.entryKey] = {
  ...entry,
  submittedFromIssue: Number(process.env.ISSUE_NUMBER || 0),
  committedAt: new Date().toISOString()
};
registry.entries = Object.fromEntries(Object.entries(registry.entries).sort(([left], [right]) => left.localeCompare(right)));
fs.writeFileSync(targetPath, `${JSON.stringify(registry, null, 2)}\n`);
console.log(`Validated and stored Shadowrun sprawl location ${patch.entryKey}: ${entry.name}`);
