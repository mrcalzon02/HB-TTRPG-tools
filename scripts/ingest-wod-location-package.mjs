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

const supportedPackageSchemas = new Set(['2.0.0', '2.1.0']);
if (!supportedPackageSchemas.has(patch?.schemaVersion)) throw new Error('Unsupported patch schemaVersion.');
if (patch?.target !== 'data/world-of-darkness/generated_location_registry.json') {
  throw new Error('Package patch target is not allowed.');
}
if (!/^wodworld-[0-9a-f]{8}$/.test(patch?.worldSeed?.worldSeedKey || '')) {
  throw new Error('worldSeed.worldSeedKey must use the wodworld-xxxxxxxx format.');
}
if (!/^wodpkg-[0-9a-f]{8}$/.test(patch?.packageKey || '')) {
  throw new Error('packageKey must use the wodpkg-xxxxxxxx format.');
}
if (['__proto__', 'constructor', 'prototype'].includes(patch.worldSeed.worldSeedKey)
  || ['__proto__', 'constructor', 'prototype'].includes(patch.packageKey)) {
  throw new Error('Forbidden registry key.');
}

const worldSeed = patch.worldSeed;
if (!worldSeed || typeof worldSeed !== 'object' || Array.isArray(worldSeed)) {
  throw new Error('Missing worldSeed metadata.');
}
if (typeof worldSeed.label !== 'string' || !worldSeed.label.trim() || worldSeed.label.length > 160) {
  throw new Error('worldSeed.label is required and must be 160 characters or fewer.');
}
if (typeof worldSeed.seedValue !== 'string' || worldSeed.seedValue.length < 8 || worldSeed.seedValue.length > 256) {
  throw new Error('worldSeed.seedValue must contain between 8 and 256 characters.');
}
if (typeof worldSeed.createdAt !== 'string' || Number.isNaN(Date.parse(worldSeed.createdAt))) {
  throw new Error('worldSeed.createdAt must be an ISO-compatible timestamp.');
}

const pkg = patch.package;
if (!pkg || typeof pkg !== 'object' || Array.isArray(pkg)) throw new Error('Missing package object.');
if (!supportedPackageSchemas.has(pkg.schemaVersion)) throw new Error('Unsupported package schemaVersion.');
if (pkg.schemaVersion !== patch.schemaVersion) throw new Error('Patch and package schema versions must match.');
if (pkg.packageKey !== patch.packageKey) throw new Error('package.packageKey must match patch.packageKey.');
if (pkg.worldSeedKey !== worldSeed.worldSeedKey) throw new Error('package.worldSeedKey must match worldSeed.worldSeedKey.');
if (!/^gmaps-[0-9a-f]{8}$/.test(pkg.locationKey || '')) throw new Error('locationKey must use the gmaps-xxxxxxxx format.');
if (!['unified', 'vampire', 'werewolf', 'breeds', 'hunter', 'changeling', 'mage'].includes(pkg.gameLine)) {
  throw new Error('gameLine is invalid.');
}
if (typeof pkg.generatedAt !== 'string' || Number.isNaN(Date.parse(pkg.generatedAt))) {
  throw new Error('generatedAt must be an ISO-compatible timestamp.');
}

const location = pkg.location;
if (!location || typeof location !== 'object' || Array.isArray(location)) throw new Error('Missing location snapshot.');
if (typeof location.name !== 'string' || !location.name.trim() || location.name.length > 200) {
  throw new Error('location.name is required and must be 200 characters or fewer.');
}
if (typeof location.address !== 'string' || location.address.length > 500) {
  throw new Error('location.address must be 500 characters or fewer.');
}
if (typeof location.referenceUrl !== 'string' || location.referenceUrl.length > 2000) {
  throw new Error('location.referenceUrl must be 2000 characters or fewer.');
}
if (typeof location.category !== 'string' || !/^[a-z0-9_]{2,50}$/.test(location.category)) {
  throw new Error('location.category is invalid.');
}
if (!location.coordinates || !Number.isFinite(location.coordinates.lat) || !Number.isFinite(location.coordinates.lng)) {
  throw new Error('Finite location coordinates are required.');
}
if (location.coordinates.lat < -90 || location.coordinates.lat > 90
  || location.coordinates.lng < -180 || location.coordinates.lng > 180) {
  throw new Error('Location coordinates are outside valid ranges.');
}
if (!['MUNDANE', 'TANGENTIAL', 'ACTIVE_UNREGISTERED', 'INVENTORIED'].includes(location.inventoryStatus)) {
  throw new Error('location.inventoryStatus is invalid.');
}
if (location.claimed === true) {
  throw new Error('Claimed businesses are excluded from the world-seeded package registry until claimed-business integration is implemented.');
}
if (!location.contextSnapshot || typeof location.contextSnapshot !== 'object' || Array.isArray(location.contextSnapshot)) {
  throw new Error('location.contextSnapshot must be an object.');
}
const contextEntries = Object.entries(location.contextSnapshot);
if (contextEntries.length > 50) throw new Error('location.contextSnapshot has too many fields.');
for (const [key, value] of contextEntries) {
  if (typeof key !== 'string' || key.length > 120) throw new Error('A contextSnapshot key is invalid.');
  if (typeof value === 'string') {
    if (value.length > 6000) throw new Error(`contextSnapshot value for ${key} is too long.`);
    continue;
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`contextSnapshot value for ${key} must be a bounded string or object.`);
  }
  if (JSON.stringify(value).length > 6000) throw new Error(`contextSnapshot object for ${key} is too large.`);
}

if (location.spatialContext != null) {
  if (!location.spatialContext || typeof location.spatialContext !== 'object' || Array.isArray(location.spatialContext)) {
    throw new Error('location.spatialContext must be an object when present.');
  }
  if (JSON.stringify(location.spatialContext).length > 12000) throw new Error('location.spatialContext is too large.');
}

const requiredOutputs = ['population', 'struggle', 'adventureHook', 'locationSeed', 'item'];
if (!pkg.outputs || typeof pkg.outputs !== 'object' || Array.isArray(pkg.outputs)) {
  throw new Error('Missing outputs object.');
}
for (const outputName of requiredOutputs) {
  const output = pkg.outputs[outputName];
  if (!output || typeof output !== 'object' || Array.isArray(output)) {
    throw new Error(`Missing ${outputName} output.`);
  }
  if (typeof output.id !== 'string' || !/^[a-z0-9-]{3,100}$/.test(output.id)) {
    throw new Error(`${outputName}.id is invalid.`);
  }
  if (typeof output.title !== 'string' || !output.title.trim() || output.title.length > 240) {
    throw new Error(`${outputName}.title is invalid.`);
  }
  for (const [key, value] of Object.entries(output)) {
    if (key === 'statuses') {
      if (!Array.isArray(value)) throw new Error(`${outputName}.statuses must be an array.`);
      continue;
    }
    if (key === 'applicability') {
      if (!value || typeof value !== 'object' || Array.isArray(value) || JSON.stringify(value).length > 6000) {
        throw new Error(`${outputName}.applicability must be a bounded object.`);
      }
      continue;
    }
    if (typeof value !== 'string' || value.length > 6000) {
      throw new Error(`${outputName}.${key} must be a bounded string.`);
    }
  }
}

if (!Array.isArray(pkg.crossLinks) || pkg.crossLinks.length < 1 || pkg.crossLinks.length > 20) {
  throw new Error('crossLinks must contain between 1 and 20 entries.');
}
for (const link of pkg.crossLinks) {
  if (!link || typeof link !== 'object' || Array.isArray(link)) throw new Error('A crossLink is invalid.');
  if (typeof link.id !== 'string' || !/^[a-z0-9-]{3,100}$/.test(link.id)) throw new Error('crossLink.id is invalid.');
  if (typeof link.label !== 'string' || !link.label.trim() || link.label.length > 200) {
    throw new Error('crossLink.label is invalid.');
  }
  if (typeof link.uses !== 'string' || link.uses.length > 1000) throw new Error('crossLink.uses is invalid.');
}

if (!pkg.source || typeof pkg.source !== 'object' || Array.isArray(pkg.source)) {
  throw new Error('Missing source metadata.');
}
if (typeof pkg.source.crosslinkSchemaVersion !== 'string' || pkg.source.crosslinkSchemaVersion.length > 40) {
  throw new Error('source.crosslinkSchemaVersion is invalid.');
}
if (typeof pkg.source.generatorVersion !== 'string' || pkg.source.generatorVersion.length > 100) {
  throw new Error('source.generatorVersion is invalid.');
}
if (pkg.schemaVersion === '2.1.0') {
  if (pkg.source.detailDiversityVersion !== '1.0.0') throw new Error('Diversified packages must declare detailDiversityVersion 1.0.0.');
  if (!/^[0-9a-f]{8}$/.test(location.contextSnapshot.diversitySignature || '')) {
    throw new Error('Diversified packages require an eight-character diversitySignature.');
  }
  const theme = location.contextSnapshot.regionalTheme;
  if (!theme || typeof theme !== 'object' || Array.isArray(theme)
    || typeof theme.id !== 'string' || typeof theme.label !== 'string' || typeof theme.description !== 'string') {
    throw new Error('Diversified packages require structured regionalTheme metadata.');
  }
}

const targetPath = path.resolve(process.cwd(), patch.target);
const registry = JSON.parse(fs.readFileSync(targetPath, 'utf8'));
if (registry.schemaVersion !== '2.0.0') throw new Error('Target registry is not schema version 2.0.0.');
registry.worlds ||= {};

const existingWorld = registry.worlds[worldSeed.worldSeedKey];
if (existingWorld) {
  if (existingWorld.seedValue !== worldSeed.seedValue
    || existingWorld.label !== worldSeed.label
    || existingWorld.createdAt !== worldSeed.createdAt) {
    throw new Error(`World seed ${worldSeed.worldSeedKey} already exists with immutable metadata.`);
  }
} else {
  registry.worlds[worldSeed.worldSeedKey] = {
    worldSeedKey: worldSeed.worldSeedKey,
    label: worldSeed.label,
    seedValue: worldSeed.seedValue,
    createdAt: worldSeed.createdAt,
    source: 'embedded',
    packages: {}
  };
}

const world = registry.worlds[worldSeed.worldSeedKey];
world.packages ||= {};
const existingPackage = world.packages[patch.packageKey];
const canonicalPackage = JSON.stringify(pkg);

if (existingPackage) {
  const existingCanonical = { ...existingPackage };
  delete existingCanonical.submittedFromIssue;
  delete existingCanonical.committedAt;
  if (JSON.stringify(existingCanonical) !== canonicalPackage) {
    throw new Error(`Package ${patch.packageKey} already exists in ${worldSeed.worldSeedKey} with different immutable content. Delete it before regenerating.`);
  }
  console.log(`Package ${patch.packageKey} already exists with identical content; no overwrite required.`);
  process.exit(0);
}

world.packages[patch.packageKey] = {
  ...pkg,
  submittedFromIssue: Number(process.env.ISSUE_NUMBER || 0),
  committedAt: new Date().toISOString()
};
world.packages = Object.fromEntries(Object.entries(world.packages).sort(([a], [b]) => a.localeCompare(b)));
registry.worlds = Object.fromEntries(Object.entries(registry.worlds).sort(([a], [b]) => a.localeCompare(b)));
fs.writeFileSync(targetPath, `${JSON.stringify(registry, null, 2)}\n`);
console.log(`Validated and stored ${patch.packageKey} under ${worldSeed.worldSeedKey}: ${location.name}`);
