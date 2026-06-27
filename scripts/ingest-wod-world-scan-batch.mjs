import fs from 'node:fs';
import path from 'node:path';

const TARGET = 'data/world-of-darkness/generated_location_registry.json';
const body = process.env.ISSUE_BODY_FILE
  ? fs.readFileSync(process.env.ISSUE_BODY_FILE, 'utf8')
  : (process.env.ISSUE_BODY || '');

if (!body.includes('<!-- WOD_WORLD_SCAN_BATCH_PATCH -->')) {
  throw new Error('Missing World of Darkness world-scan batch marker.');
}

const match = body.match(/```json\s*([\s\S]*?)```/i);
if (!match) throw new Error('Missing fenced JSON world-scan patch.');

let patch;
try {
  patch = JSON.parse(match[1]);
} catch (error) {
  throw new Error(`World-scan patch is not valid JSON: ${error.message}`);
}

if (patch?.schemaVersion !== '1.0.0') throw new Error('Unsupported world-scan patch schemaVersion.');
if (patch?.target !== TARGET) throw new Error('World-scan target is not allowed.');
if (!/^wodscan-[0-9a-f]{8}$/.test(patch?.scan?.scanKey || '')) throw new Error('scan.scanKey must use wodscan-xxxxxxxx.');
if (!['unified', 'vampire', 'werewolf', 'breeds', 'hunter', 'changeling', 'mage'].includes(patch?.gameLine)) {
  throw new Error('gameLine is invalid.');
}

const worldSeed = patch.worldSeed;
if (!worldSeed || typeof worldSeed !== 'object' || Array.isArray(worldSeed)) throw new Error('Missing worldSeed metadata.');
if (!/^wodworld-[0-9a-f]{8}$/.test(worldSeed.worldSeedKey || '')) throw new Error('worldSeedKey must use wodworld-xxxxxxxx.');
if (typeof worldSeed.label !== 'string' || !worldSeed.label.trim() || worldSeed.label.length > 160) throw new Error('worldSeed.label is invalid.');
if (typeof worldSeed.seedValue !== 'string' || worldSeed.seedValue.length < 8 || worldSeed.seedValue.length > 256) throw new Error('worldSeed.seedValue is invalid.');
if (typeof worldSeed.createdAt !== 'string' || Number.isNaN(Date.parse(worldSeed.createdAt))) throw new Error('worldSeed.createdAt is invalid.');

const scan = patch.scan;
if (!scan || typeof scan !== 'object' || Array.isArray(scan)) throw new Error('Missing scan metadata.');
if (typeof scan.scannedAt !== 'string' || Number.isNaN(Date.parse(scan.scannedAt))) throw new Error('scan.scannedAt is invalid.');
if (!Number.isInteger(scan.zoom) || scan.zoom < 0 || scan.zoom > 24) throw new Error('scan.zoom is invalid.');
for (const key of ['south', 'west', 'north', 'east']) {
  if (!Number.isFinite(scan.bounds?.[key])) throw new Error(`scan.bounds.${key} must be finite.`);
}
if (!Array.isArray(patch.locations) || patch.locations.length < 1 || patch.locations.length > 100) {
  throw new Error('locations must contain between 1 and 100 named locations.');
}

const config = JSON.parse(fs.readFileSync('data/world-of-darkness/spatial-engine-config.json', 'utf8'));
const locationCore = JSON.parse(fs.readFileSync(config.coreData.locations, 'utf8'));
const crosslinks = JSON.parse(fs.readFileSync(config.coreData.crosslinks, 'utf8'));
const claimedRegistry = JSON.parse(fs.readFileSync(config.coreData.centralRegistry, 'utf8'));
const targetPath = path.resolve(process.cwd(), TARGET);
const registry = JSON.parse(fs.readFileSync(targetPath, 'utf8'));

if (registry.schemaVersion !== '2.0.0') throw new Error('Generated location registry must use schemaVersion 2.0.0.');
registry.worlds ||= {};

function murmurHash3(input, seed = 0) {
  let remainder = input.length & 3;
  let bytes = input.length - remainder;
  let h1 = seed;
  const c1 = 0xcc9e2d51;
  const c2 = 0x1b873593;
  let index = 0;
  while (index < bytes) {
    let k1 = (input.charCodeAt(index) & 0xff)
      | ((input.charCodeAt(++index) & 0xff) << 8)
      | ((input.charCodeAt(++index) & 0xff) << 16)
      | ((input.charCodeAt(++index) & 0xff) << 24);
    ++index;
    k1 = Math.imul(k1, c1);
    k1 = (k1 << 15) | (k1 >>> 17);
    k1 = Math.imul(k1, c2);
    h1 ^= k1;
    h1 = (h1 << 13) | (h1 >>> 19);
    h1 = Math.imul(h1, 5) + 0xe6546b64;
  }
  let k1 = 0;
  if (remainder === 3) k1 ^= (input.charCodeAt(index + 2) & 0xff) << 16;
  if (remainder >= 2) k1 ^= (input.charCodeAt(index + 1) & 0xff) << 8;
  if (remainder >= 1) {
    k1 ^= input.charCodeAt(index) & 0xff;
    k1 = Math.imul(k1, c1);
    k1 = (k1 << 15) | (k1 >>> 17);
    k1 = Math.imul(k1, c2);
    h1 ^= k1;
  }
  h1 ^= input.length;
  h1 ^= h1 >>> 16;
  h1 = Math.imul(h1, 0x85ebca6b);
  h1 ^= h1 >>> 13;
  h1 = Math.imul(h1, 0xc2b2ae35);
  h1 ^= h1 >>> 16;
  return h1 >>> 0;
}

function hash32(input) {
  let hash = 2166136261;
  for (const character of String(input)) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

const normalize = value => String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
const keyFrom = (prefix, input) => `${prefix}-${hash32(input).toString(16).padStart(8, '0')}`;
const clone = value => JSON.parse(JSON.stringify(value));

function expandLocationCore(document) {
  if (Array.isArray(document.entries)) return document.entries;
  return (document.prototypes || []).flatMap((prototype, prototypeIndex) =>
    (document.contextVariants || []).map((context, contextIndex) => ({
      ...prototype,
      id: `location-${String(prototypeIndex + 1).padStart(2, '0')}-${String(contextIndex + 1).padStart(2, '0')}`,
      variant: prototypeIndex * document.contextVariants.length + contextIndex + 1,
      context,
      inventoryStatus: context.inventoryStatus
    }))
  );
}

const locationVariants = expandLocationCore(locationCore);

function lineLayer(line, location) {
  if (line === 'vampire') return location.kindredLayer;
  if (line === 'werewolf' || line === 'breeds') return location.umbralLayer;
  if (line === 'mage') return location.awakenedVector;
  if (line === 'hunter') return `Hunter assessment: ${location.mundaneBase.description} Every supernatural conclusion remains provisional evidence.`;
  if (line === 'changeling') return `Changeling interpretation: the mundane footprint casts a Dreaming reflection shaped by ${location.context.title.toLowerCase()}.`;
  return `${location.kindredLayer} | ${location.umbralLayer} | ${location.awakenedVector}`;
}

function selectPoolEntry(poolName, status, locationKey) {
  const eligible = (crosslinks[poolName] || []).filter(entry => Array.isArray(entry.statuses) && entry.statuses.includes(status));
  if (!eligible.length) throw new Error(`No ${poolName} content supports ${status}.`);
  return clone(eligible[hash32(`${worldSeed.seedValue}|${locationKey}|${patch.gameLine}|${poolName}`) % eligible.length]);
}

function worldSpecificContext(locationKey, category) {
  const variant = locationVariants[hash32(`${worldSeed.seedValue}|${locationKey}|${patch.gameLine}|location-context`) % locationVariants.length];
  const status = variant.inventoryStatus;
  const strongLayer = lineLayer(patch.gameLine, variant);
  const mapping = config.businessTypeMappings?.[category] || `Subverted Complex (${String(category).replaceAll('_', ' ')})`;
  if (status === 'MUNDANE') {
    return {
      variant,
      status,
      registry: 'No supernatural inventory entry',
      hiddenFunction: `No confirmed supernatural function. ${variant.context.effect}`,
      confidence: 'No credible supernatural evidence',
      catalogueNote: 'This world seed does not place the location in any supernatural inventory.'
    };
  }
  if (status === 'TANGENTIAL') {
    return {
      variant,
      status,
      registry: 'Peripheral association — not inventoried',
      hiddenFunction: `${variant.context.effect} The nearest thematic pattern resembles: ${strongLayer} The location itself is not confirmed as involved.`,
      confidence: 'Weak, indirect, historical, or route-adjacent evidence',
      catalogueNote: 'The location is peripheral to supernatural activity and is not inventoried.'
    };
  }
  return {
    variant,
    status,
    registry: `${mapping} — ${status === 'INVENTORIED' ? 'formal inventory entry' : 'active but unregistered'}`,
    hiddenFunction: `${variant.context.effect} ${strongLayer}`,
    confidence: status === 'INVENTORIED' ? 'Formally catalogued inside this world seed' : 'Active evidence without a formal ownership record',
    catalogueNote: status === 'INVENTORIED'
      ? 'The location is recorded, monitored, claimed, or administratively recognized in this generated world.'
      : 'The location is used or affected but remains absent from faction inventories.'
  };
}

function validateLocation(location) {
  if (!location || typeof location !== 'object' || Array.isArray(location)) throw new Error('A location entry is invalid.');
  if (!/^gmaps-[0-9a-f]{8}$/.test(location.locationKey || '')) throw new Error('locationKey must use gmaps-xxxxxxxx.');
  if (typeof location.name !== 'string' || !location.name.trim() || location.name.length > 200) throw new Error('location.name is invalid.');
  if (typeof location.address !== 'string' || location.address.length > 500) throw new Error('location.address is invalid.');
  if (typeof location.category !== 'string' || !/^[a-z0-9_]{2,50}$/.test(location.category)) throw new Error('location.category is invalid.');
  if (!Number.isFinite(location.coordinates?.lat) || !Number.isFinite(location.coordinates?.lng)) throw new Error('location coordinates are required.');
  if (location.coordinates.lat < -90 || location.coordinates.lat > 90 || location.coordinates.lng < -180 || location.coordinates.lng > 180) throw new Error('location coordinates are outside valid ranges.');
  if (!['node', 'way', 'relation'].includes(location.osmType)) throw new Error('location.osmType is invalid.');
  if (!/^\d+$/.test(String(location.osmId || ''))) throw new Error('location.osmId is invalid.');
  const canonical = [normalize(location.name), normalize(location.address), location.coordinates.lat.toFixed(6), location.coordinates.lng.toFixed(6)].join('|');
  const expected = `gmaps-${murmurHash3(canonical, 0x1f123bb5).toString(16).padStart(8, '0')}`;
  if (expected !== location.locationKey) throw new Error(`locationKey mismatch for ${location.name}.`);
  if (claimedRegistry.entries?.[location.locationKey]) throw new Error(`Claimed location ${location.locationKey} cannot be generated by the unclaimed world scan.`);
}

const existingWorld = registry.worlds[worldSeed.worldSeedKey];
if (existingWorld) {
  if (existingWorld.seedValue !== worldSeed.seedValue || existingWorld.label !== worldSeed.label || existingWorld.createdAt !== worldSeed.createdAt) {
    throw new Error(`World seed ${worldSeed.worldSeedKey} already exists with immutable metadata.`);
  }
} else {
  registry.worlds[worldSeed.worldSeedKey] = {
    worldSeedKey: worldSeed.worldSeedKey,
    label: worldSeed.label,
    seedValue: worldSeed.seedValue,
    createdAt: worldSeed.createdAt,
    source: 'embedded',
    packages: {},
    scanCoverage: {}
  };
}

const world = registry.worlds[worldSeed.worldSeedKey];
world.packages ||= {};
world.scanCoverage ||= {};
let added = 0;
let existing = 0;
const packageKeys = [];

for (const location of patch.locations) {
  validateLocation(location);
  const packageKey = keyFrom('wodpkg', `${worldSeed.worldSeedKey}|${location.locationKey}|${patch.gameLine}`);
  packageKeys.push(packageKey);
  if (world.packages[packageKey]) {
    existing += 1;
    continue;
  }

  const context = worldSpecificContext(location.locationKey, location.category);
  const variant = context.variant;
  const packageSnapshot = {
    schemaVersion: '2.0.0',
    packageKey,
    worldSeedKey: worldSeed.worldSeedKey,
    worldSeedLabel: worldSeed.label,
    locationKey: location.locationKey,
    gameLine: patch.gameLine,
    generatedAt: scan.scannedAt,
    location: {
      name: location.name,
      address: location.address,
      referenceUrl: location.referenceUrl || `https://www.openstreetmap.org/${location.osmType}/${location.osmId}`,
      category: location.category,
      coordinates: clone(location.coordinates),
      inventoryStatus: context.status,
      claimed: false,
      contextSnapshot: {
        inventoryLabel: context.status,
        locationVariant: `${variant.variant} of ${locationVariants.length}`,
        archetype: variant.mundaneBase.name,
        archetypeCategory: variant.mundaneBase.category,
        contextTitle: variant.context.title,
        contextEffect: variant.context.effect,
        mechanicalSeed: variant.context.mechanicalSeed,
        publicFacade: `${location.name} follows a ${variant.mundaneBase.name.toLowerCase()}-pattern ${variant.mundaneBase.category.toLowerCase()} footprint. ${variant.mundaneBase.description}`,
        hiddenFunction: context.hiddenFunction,
        evidenceConfidence: context.confidence,
        catalogueNote: context.catalogueNote,
        supernaturalRegistry: context.registry,
        namedFeatureClass: location.featureLabel || 'Named Map Feature'
      },
      spatialContext: {
        source: 'OpenStreetMap / Overpass',
        osmType: location.osmType,
        osmId: String(location.osmId),
        osmUrl: `https://www.openstreetmap.org/${location.osmType}/${location.osmId}`,
        featureLabel: location.featureLabel || 'Named Map Feature',
        sourceTags: location.sourceTags || {},
        scanKey: scan.scanKey,
        scanZoom: scan.zoom,
        scanBounds: clone(scan.bounds),
        scanCenter: clone(scan.center || {}),
        discoveredAt: scan.scannedAt
      }
    },
    outputs: {
      population: selectPoolEntry('population', context.status, location.locationKey),
      struggle: selectPoolEntry('struggles', context.status, location.locationKey),
      adventureHook: selectPoolEntry('adventureHooks', context.status, location.locationKey),
      locationSeed: selectPoolEntry('locationSeeds', context.status, location.locationKey),
      item: selectPoolEntry('items', context.status, location.locationKey)
    },
    crossLinks: clone(crosslinks.crossLinks || []),
    source: {
      crosslinkSchemaVersion: crosslinks.schemaVersion,
      generatorVersion: 'world-seeded-viewport-scan-1.0.0'
    },
    submittedFromIssue: Number(process.env.ISSUE_NUMBER || 0),
    committedAt: new Date().toISOString()
  };
  world.packages[packageKey] = packageSnapshot;
  added += 1;
}

const coverage = {
  scanKey: scan.scanKey,
  scannedAt: scan.scannedAt,
  committedAt: new Date().toISOString(),
  submittedFromIssue: Number(process.env.ISSUE_NUMBER || 0),
  gameLine: patch.gameLine,
  zoom: scan.zoom,
  bounds: clone(scan.bounds),
  center: clone(scan.center || {}),
  discoveredCount: Number(scan.discoveredCount || patch.locations.length),
  submittedCount: patch.locations.length,
  addedCount: added,
  existingCount: existing,
  responseCapped: Boolean(scan.responseCapped),
  packageKeys: [...new Set(packageKeys)].sort()
};

const previousCoverage = world.scanCoverage[scan.scanKey];
if (previousCoverage && JSON.stringify({ ...previousCoverage, committedAt: undefined, submittedFromIssue: undefined }) !== JSON.stringify({ ...coverage, committedAt: undefined, submittedFromIssue: undefined })) {
  throw new Error(`Scan coverage ${scan.scanKey} already exists with different immutable context.`);
}
world.scanCoverage[scan.scanKey] = previousCoverage || coverage;
world.packages = Object.fromEntries(Object.entries(world.packages).sort(([a], [b]) => a.localeCompare(b)));
world.scanCoverage = Object.fromEntries(Object.entries(world.scanCoverage).sort(([a], [b]) => a.localeCompare(b)));
registry.worlds = Object.fromEntries(Object.entries(registry.worlds).sort(([a], [b]) => a.localeCompare(b)));
fs.writeFileSync(targetPath, `${JSON.stringify(registry, null, 2)}\n`);
console.log(`World scan ${scan.scanKey}: added ${added}, retained ${existing}, world ${worldSeed.worldSeedKey}.`);
