import fs from 'node:fs';
import path from 'node:path';

const body = process.env.ISSUE_BODY_FILE
  ? fs.readFileSync(process.env.ISSUE_BODY_FILE, 'utf8')
  : (process.env.ISSUE_BODY || '');
const marker = '<!-- WOD_LOCATION_PACKAGE_PATCH -->';
if (!body.includes(marker)) throw new Error('Missing Chronicle location package marker.');

const match = body.match(/```json\s*([\s\S]*?)```/i);
if (!match) throw new Error('Missing fenced JSON package patch.');

let patch;
try {
  patch = JSON.parse(match[1]);
} catch (error) {
  throw new Error(`Package patch is not valid JSON: ${error.message}`);
}

if (patch?.schemaVersion !== '1.0.0') throw new Error('Unsupported patch schemaVersion.');
if (patch?.target !== 'data/world-of-darkness/generated_location_registry.json') {
  throw new Error('Package patch target is not allowed.');
}
if (!/^wodpkg-[0-9a-f]{8}$/.test(patch?.packageKey || '')) {
  throw new Error('packageKey must use the wodpkg-xxxxxxxx format.');
}
if (['__proto__', 'constructor', 'prototype'].includes(patch.packageKey)) {
  throw new Error('Forbidden package key.');
}

const pkg = patch.package;
if (!pkg || typeof pkg !== 'object' || Array.isArray(pkg)) throw new Error('Missing package object.');
if (pkg.schemaVersion !== '1.0.0') throw new Error('Unsupported package schemaVersion.');
if (pkg.packageKey !== patch.packageKey) throw new Error('package.packageKey must match patch.packageKey.');
if (!/^gmaps-[0-9a-f]{8}$/.test(pkg.locationKey || '')) throw new Error('locationKey must use the gmaps-xxxxxxxx format.');
if (!Number.isInteger(pkg.runIndex) || pkg.runIndex < 1 || pkg.runIndex > 9999) throw new Error('runIndex must be an integer from 1 through 9999.');
if (!['unified', 'vampire', 'werewolf', 'breeds', 'hunter', 'changeling', 'mage'].includes(pkg.gameLine)) {
  throw new Error('gameLine is invalid.');
}
if (typeof pkg.generatedAt !== 'string' || Number.isNaN(Date.parse(pkg.generatedAt))) {
  throw new Error('generatedAt must be an ISO-compatible timestamp.');
}

const location = pkg.location;
if (!location || typeof location !== 'object' || Array.isArray(location)) throw new Error('Missing location snapshot.');
if (typeof location.name !== 'string' || !location.name.trim() || location.name.length > 200) throw new Error('location.name is required and must be 200 characters or fewer.');
if (typeof location.address !== 'string' || location.address.length > 500) throw new Error('location.address must be 500 characters or fewer.');
if (typeof location.referenceUrl !== 'string' || location.referenceUrl.length > 2000) throw new Error('location.referenceUrl must be 2000 characters or fewer.');
if (typeof location.category !== 'string' || !/^[a-z0-9_]{2,50}$/.test(location.category)) throw new Error('location.category is invalid.');
if (!location.coordinates || !Number.isFinite(location.coordinates.lat) || !Number.isFinite(location.coordinates.lng)) throw new Error('Finite location coordinates are required.');
if (location.coordinates.lat < -90 || location.coordinates.lat > 90 || location.coordinates.lng < -180 || location.coordinates.lng > 180) throw new Error('Location coordinates are outside valid ranges.');
if (!['MUNDANE', 'TANGENTIAL', 'ACTIVE_UNREGISTERED', 'INVENTORIED'].includes(location.inventoryStatus)) {
  throw new Error('location.inventoryStatus is invalid.');
}
if (!location.contextSnapshot || typeof location.contextSnapshot !== 'object' || Array.isArray(location.contextSnapshot)) {
  throw new Error('location.contextSnapshot must be an object.');
}
const contextEntries = Object.entries(location.contextSnapshot);
if (contextEntries.length > 50) throw new Error('location.contextSnapshot has too many fields.');
for (const [key, value] of contextEntries) {
  if (typeof key !== 'string' || key.length > 120) throw new Error('A contextSnapshot key is invalid.');
  if (typeof value !== 'string' || value.length > 6000) throw new Error(`contextSnapshot value for ${key} is invalid.`);
}

const requiredOutputs = ['population', 'struggle', 'adventureHook', 'locationSeed', 'item'];
if (!pkg.outputs || typeof pkg.outputs !== 'object' || Array.isArray(pkg.outputs)) throw new Error('Missing outputs object.');
for (const outputName of requiredOutputs) {
  const output = pkg.outputs[outputName];
  if (!output || typeof output !== 'object' || Array.isArray(output)) throw new Error(`Missing ${outputName} output.`);
  if (typeof output.id !== 'string' || !/^[a-z0-9-]{3,100}$/.test(output.id)) throw new Error(`${outputName}.id is invalid.`);
  if (typeof output.title !== 'string' || !output.title.trim() || output.title.length > 240) throw new Error(`${outputName}.title is invalid.`);
  for (const [key, value] of Object.entries(output)) {
    if (key === 'statuses') continue;
    if (typeof value !== 'string' || value.length > 6000) throw new Error(`${outputName}.${key} must be a bounded string.`);
  }
}

if (!Array.isArray(pkg.crossLinks) || pkg.crossLinks.length < 1 || pkg.crossLinks.length > 20) {
  throw new Error('crossLinks must contain between 1 and 20 entries.');
}
for (const link of pkg.crossLinks) {
  if (!link || typeof link !== 'object' || Array.isArray(link)) throw new Error('A crossLink is invalid.');
  if (typeof link.id !== 'string' || !/^[a-z0-9-]{3,100}$/.test(link.id)) throw new Error('crossLink.id is invalid.');
  if (typeof link.label !== 'string' || !link.label.trim() || link.label.length > 200) throw new Error('crossLink.label is invalid.');
  if (typeof link.uses !== 'string' || link.uses.length > 1000) throw new Error('crossLink.uses is invalid.');
}

if (!pkg.source || typeof pkg.source !== 'object' || Array.isArray(pkg.source)) throw new Error('Missing source metadata.');
if (typeof pkg.source.crosslinkSchemaVersion !== 'string' || pkg.source.crosslinkSchemaVersion.length > 40) throw new Error('source.crosslinkSchemaVersion is invalid.');
if (typeof pkg.source.generatorVersion !== 'string' || pkg.source.generatorVersion.length > 40) throw new Error('source.generatorVersion is invalid.');

const targetPath = path.resolve(process.cwd(), patch.target);
const registry = JSON.parse(fs.readFileSync(targetPath, 'utf8'));
registry.entries ||= {};
const existing = registry.entries[patch.packageKey];

const canonicalPackage = JSON.stringify(pkg);
if (existing) {
  const existingPackage = { ...existing };
  delete existingPackage.submittedFromIssue;
  delete existingPackage.committedAt;
  if (JSON.stringify(existingPackage) !== canonicalPackage) {
    throw new Error(`Package ${patch.packageKey} already exists with different immutable content.`);
  }
  console.log(`Package ${patch.packageKey} already exists with identical content; no overwrite required.`);
  process.exit(0);
}

registry.entries[patch.packageKey] = {
  ...pkg,
  submittedFromIssue: Number(process.env.ISSUE_NUMBER || 0),
  committedAt: new Date().toISOString()
};
registry.entries = Object.fromEntries(Object.entries(registry.entries).sort(([a], [b]) => a.localeCompare(b)));
fs.writeFileSync(targetPath, `${JSON.stringify(registry, null, 2)}\n`);
console.log(`Validated and stored ${patch.packageKey}: ${location.name} run ${pkg.runIndex}`);
