import fs from 'node:fs';
import path from 'node:path';

const TARGET = 'data/world-of-darkness/generated_location_registry.json';
const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter'
];
const body = process.env.ISSUE_BODY_FILE
  ? fs.readFileSync(process.env.ISSUE_BODY_FILE, 'utf8')
  : (process.env.ISSUE_BODY || '');

if (!body.includes('<!-- WOD_WORLD_SCAN_RESCAN_PATCH -->')) {
  throw new Error('Missing World of Darkness viewport-rescan marker.');
}
const match = body.match(/```json\s*([\s\S]*?)```/i);
if (!match) throw new Error('Missing fenced JSON viewport-rescan patch.');

let patch;
try {
  patch = JSON.parse(match[1]);
} catch (error) {
  throw new Error(`Viewport-rescan patch is not valid JSON: ${error.message}`);
}

if (patch?.schemaVersion !== '2.0.0') throw new Error('Unsupported viewport-rescan schemaVersion.');
if (patch?.target !== TARGET) throw new Error('Viewport-rescan target is not allowed.');
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
if (!/^wodscan-[0-9a-f]{8}$/.test(scan.scanKey || '')) throw new Error('scanKey must use wodscan-xxxxxxxx.');
if (scan.queryMode !== 'server-rescan-all-named') throw new Error('scan.queryMode must request the all-named server rescan.');
if (typeof scan.scannedAt !== 'string' || Number.isNaN(Date.parse(scan.scannedAt))) throw new Error('scan.scannedAt is invalid.');
if (!Number.isInteger(scan.zoom) || scan.zoom < 14 || scan.zoom > 24) throw new Error('scan.zoom must be between 14 and 24.');
for (const key of ['south', 'west', 'north', 'east']) {
  if (!Number.isFinite(scan.bounds?.[key])) throw new Error(`scan.bounds.${key} must be finite.`);
}
if (scan.bounds.north <= scan.bounds.south || scan.bounds.east <= scan.bounds.west) throw new Error('scan.bounds is invalid.');
if ((scan.bounds.north - scan.bounds.south) > 0.16 || (scan.bounds.east - scan.bounds.west) > 0.24) {
  throw new Error('The submitted viewport is too large for a responsible global rescan.');
}

const config = JSON.parse(fs.readFileSync('data/world-of-darkness/spatial-engine-config.json', 'utf8'));
const locationCore = JSON.parse(fs.readFileSync(config.coreData.locations, 'utf8'));
const crosslinks = JSON.parse(fs.readFileSync(config.coreData.crosslinks, 'utf8'));
const claimedRegistry = JSON.parse(fs.readFileSync(config.coreData.centralRegistry, 'utf8'));
const targetPath = path.resolve(process.cwd(), TARGET);
const registry = JSON.parse(fs.readFileSync(targetPath, 'utf8'));
if (registry.schemaVersion !== '2.0.0') throw new Error('Generated location registry must use schemaVersion 2.0.0.');
registry.worlds ||= {};

const clone = value => JSON.parse(JSON.stringify(value));
const normalize = value => String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
const humanize = value => String(value || '').replace(/[_:]+/g, ' ').replace(/\b\w/g, character => character.toUpperCase());

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

const keyFrom = (prefix, input) => `${prefix}-${hash32(input).toString(16).padStart(8, '0')}`;

function expandLocationCore(document) {
  if (Array.isArray(document.entries)) return document.entries;
  const prototypes = document.prototypes || [];
  const contexts = document.contextVariants || [];
  return prototypes.flatMap((prototype, prototypeIndex) => contexts.map((context, contextIndex) => ({
    ...prototype,
    id: `location-${String(prototypeIndex + 1).padStart(2, '0')}-${String(contextIndex + 1).padStart(2, '0')}`,
    variant: prototypeIndex * contexts.length + contextIndex + 1,
    context,
    inventoryStatus: context.inventoryStatus
  })));
}

const locationVariants = expandLocationCore(locationCore);

function featureLabel(tags = {}) {
  if (tags.amenity) return `Amenity · ${humanize(tags.amenity)}`;
  if (tags.shop) return `Shop / Retail · ${humanize(tags.shop)}`;
  if (tags.tourism) return `Tourism · ${humanize(tags.tourism)}`;
  if (tags.historic) return `Historic Site · ${humanize(tags.historic)}`;
  if (tags.leisure) return `Leisure Site · ${humanize(tags.leisure)}`;
  if (tags.natural) return `Natural Feature · ${humanize(tags.natural)}`;
  if (tags.waterway) return `Water Feature · ${humanize(tags.waterway)}`;
  if (tags.highway) return ['path', 'footway', 'cycleway', 'bridleway', 'track', 'steps'].includes(tags.highway)
    ? `Trail / Path · ${humanize(tags.highway)}`
    : `Named Road · ${humanize(tags.highway)}`;
  if (tags.railway || tags.public_transport) return `Rail / Transit · ${humanize(tags.railway || tags.public_transport)}`;
  if (tags.place) return `Named Place · ${humanize(tags.place)}`;
  if (tags.boundary) return `Named Boundary · ${humanize(tags.boundary)}`;
  if (tags.office) return `Office · ${humanize(tags.office)}`;
  if (tags.craft) return `Craft / Workshop · ${humanize(tags.craft)}`;
  if (tags.landuse) return `Named Land Area · ${humanize(tags.landuse)}`;
  if (tags.man_made || tags.power) return `Infrastructure · ${humanize(tags.man_made || tags.power)}`;
  if (tags.building) return tags.building === 'yes' ? 'Named Building' : `Named Building · ${humanize(tags.building)}`;
  return 'Named Map Feature';
}

function sourceTags(tags = {}) {
  const allowed = [
    'amenity', 'shop', 'tourism', 'historic', 'leisure', 'natural', 'waterway',
    'highway', 'railway', 'public_transport', 'place', 'boundary', 'aeroway',
    'office', 'craft', 'landuse', 'power', 'man_made', 'military', 'building',
    'religion', 'denomination', 'operator', 'brand'
  ];
  return Object.fromEntries(allowed.filter(key => tags[key] != null).map(key => [key, String(tags[key])]));
}

function addressFrom(tags = {}) {
  if (tags['addr:full']) return String(tags['addr:full']);
  return [
    [tags['addr:housenumber'], tags['addr:street']].filter(Boolean).join(' '),
    tags['addr:city'] || tags['addr:town'] || tags['addr:village'],
    tags['addr:state'],
    tags['addr:postcode']
  ].filter(Boolean).join(', ');
}

function categoryFor(tags = {}) {
  const amenity = tags.amenity;
  if (['restaurant', 'cafe', 'fast_food', 'food_court', 'ice_cream'].includes(amenity)) return 'restaurant';
  if (['bar', 'pub', 'biergarten'].includes(amenity)) return 'bar';
  if (amenity === 'nightclub') return 'night_club';
  if (amenity === 'library') return 'library';
  if (['hospital', 'clinic', 'doctors', 'dentist'].includes(amenity) || tags.healthcare) return 'hospital';
  if (amenity === 'pharmacy') return 'pharmacy';
  if (amenity === 'grave_yard') return 'cemetery';
  if (amenity === 'place_of_worship') return 'church';
  if (['bus_station', 'ferry_terminal'].includes(amenity) || tags.railway === 'station') return 'transit_station';
  if (['townhall', 'courthouse', 'police', 'fire_station', 'post_office'].includes(amenity)) return 'government';
  if (tags.shop === 'books') return 'book_store';
  if (tags.shop) return 'store';
  if (['hotel', 'motel', 'hostel', 'guest_house'].includes(tags.tourism)) return 'lodging';
  if (['park', 'garden', 'nature_reserve'].includes(tags.leisure)) return 'park';
  if (tags.office) return 'office';
  if (tags.craft || tags.landuse === 'industrial') return 'industrial';
  if (tags.highway) return ['path', 'footway', 'cycleway', 'track', 'steps'].includes(tags.highway) ? 'named_trail' : 'named_road';
  if (tags.natural) return 'natural_feature';
  if (tags.waterway) return 'water_feature';
  if (tags.historic) return 'historic_site';
  if (tags.place) return 'named_place';
  if (tags.boundary) return 'named_boundary';
  if (tags.building) return 'named_building';
  if (tags.railway || tags.public_transport) return 'transit_feature';
  if (tags.man_made || tags.power) return 'infrastructure';
  return 'other';
}

function distanceMeters(location, center) {
  const radians = degrees => degrees * Math.PI / 180;
  const lat1 = radians(center.lat);
  const lat2 = radians(location.coordinates.lat);
  const deltaLat = radians(location.coordinates.lat - center.lat);
  const deltaLng = radians(location.coordinates.lng - center.lng);
  const value = Math.sin(deltaLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

function serverLimit(bounds) {
  const area = Math.abs((bounds.north - bounds.south) * (bounds.east - bounds.west));
  if (area <= 0.0005) return 1200;
  if (area <= 0.002) return 900;
  return 600;
}

async function fetchNamedElements() {
  const bbox = [scan.bounds.south, scan.bounds.west, scan.bounds.north, scan.bounds.east]
    .map(value => Number(value).toFixed(6)).join(',');
  const limit = serverLimit(scan.bounds);
  const query = `[out:json][timeout:25];nwr["name"](${bbox});out center tags qt ${limit};`;
  let lastError;
  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { Accept: 'application/json' },
        body: new URLSearchParams({ data: query })
      });
      if (!response.ok) throw new Error(`${new URL(endpoint).hostname} returned ${response.status}`);
      const payload = await response.json();
      return { elements: payload.elements || [], limit };
    } catch (error) {
      lastError = error;
    }
  }
  throw new Error(`All Overpass endpoints failed: ${lastError?.message || 'unknown error'}`);
}

function normalizeElements(elements) {
  const center = scan.center && Number.isFinite(scan.center.lat) && Number.isFinite(scan.center.lng)
    ? scan.center
    : { lat: (scan.bounds.south + scan.bounds.north) / 2, lng: (scan.bounds.west + scan.bounds.east) / 2 };
  const unique = new Map();
  for (const element of elements) {
    const tags = element.tags || {};
    const name = String(tags.name || '').trim();
    const lat = Number(element.lat ?? element.center?.lat);
    const lng = Number(element.lon ?? element.center?.lon);
    if (!name || !Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    const osmType = element.type;
    const osmId = String(element.id);
    const identity = `${osmType}/${osmId}`;
    if (unique.has(identity)) continue;
    const address = addressFrom(tags);
    const canonical = [normalize(name), normalize(address), lat.toFixed(6), lng.toFixed(6)].join('|');
    const locationKey = `gmaps-${murmurHash3(canonical, 0x1f123bb5).toString(16).padStart(8, '0')}`;
    const location = {
      locationKey,
      name,
      address,
      referenceUrl: `https://www.openstreetmap.org/${osmType}/${osmId}`,
      category: categoryFor(tags),
      coordinates: { lat, lng },
      osmType,
      osmId,
      featureLabel: featureLabel(tags),
      sourceTags: sourceTags(tags)
    };
    location.distance = distanceMeters(location, center);
    unique.set(identity, location);
  }
  return [...unique.values()]
    .sort((a, b) => a.distance - b.distance || a.name.localeCompare(b.name))
    .slice(0, Number(config.worldScan?.localVisibleLocationCap || 90))
    .map(({ distance, ...location }) => location);
}

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

function worldSpecificContext(location) {
  const variant = locationVariants[hash32(`${worldSeed.seedValue}|${location.locationKey}|${patch.gameLine}|location-context`) % locationVariants.length];
  const status = variant.inventoryStatus;
  const strongLayer = lineLayer(patch.gameLine, variant);
  const mapping = config.businessTypeMappings?.[location.category] || `Subverted Complex (${location.category.replaceAll('_', ' ')})`;
  if (status === 'MUNDANE') return { variant, status, registry: 'No supernatural inventory entry', hiddenFunction: `No confirmed supernatural function. ${variant.context.effect}`, confidence: 'No credible supernatural evidence', catalogueNote: 'This world seed does not place the location in any supernatural inventory.' };
  if (status === 'TANGENTIAL') return { variant, status, registry: 'Peripheral association — not inventoried', hiddenFunction: `${variant.context.effect} The nearest thematic pattern resembles: ${strongLayer} The location itself is not confirmed as involved.`, confidence: 'Weak, indirect, historical, or route-adjacent evidence', catalogueNote: 'The location is peripheral to supernatural activity and is not inventoried.' };
  return { variant, status, registry: `${mapping} — ${status === 'INVENTORIED' ? 'formal inventory entry' : 'active but unregistered'}`, hiddenFunction: `${variant.context.effect} ${strongLayer}`, confidence: status === 'INVENTORIED' ? 'Formally catalogued inside this world seed' : 'Active evidence without a formal ownership record', catalogueNote: status === 'INVENTORIED' ? 'The location is recorded, monitored, claimed, or administratively recognized in this generated world.' : 'The location is used or affected but remains absent from faction inventories.' };
}

function packageFor(location) {
  const packageKey = keyFrom('wodpkg', `${worldSeed.worldSeedKey}|${location.locationKey}|${patch.gameLine}`);
  const context = worldSpecificContext(location);
  const variant = context.variant;
  return {
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
      referenceUrl: location.referenceUrl,
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
        namedFeatureClass: location.featureLabel
      },
      spatialContext: {
        source: 'OpenStreetMap / Overpass server rescan',
        osmType: location.osmType,
        osmId: location.osmId,
        osmUrl: location.referenceUrl,
        featureLabel: location.featureLabel,
        sourceTags: clone(location.sourceTags),
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
      generatorVersion: 'world-seeded-server-rescan-2.0.0'
    }
  };
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
const fetched = await fetchNamedElements();
const locations = normalizeElements(fetched.elements);
let added = 0;
let existing = 0;
let claimed = 0;
const packageKeys = [];

for (const location of locations) {
  if (claimedRegistry.entries?.[location.locationKey]) {
    claimed += 1;
    continue;
  }
  const pkg = packageFor(location);
  packageKeys.push(pkg.packageKey);
  if (world.packages[pkg.packageKey]) {
    existing += 1;
    continue;
  }
  world.packages[pkg.packageKey] = {
    ...pkg,
    submittedFromIssue: Number(process.env.ISSUE_NUMBER || 0),
    committedAt: new Date().toISOString()
  };
  added += 1;
}

world.scanCoverage[scan.scanKey] ||= {
  scanKey: scan.scanKey,
  queryMode: scan.queryMode,
  scannedAt: scan.scannedAt,
  committedAt: new Date().toISOString(),
  submittedFromIssue: Number(process.env.ISSUE_NUMBER || 0),
  gameLine: patch.gameLine,
  zoom: scan.zoom,
  bounds: clone(scan.bounds),
  center: clone(scan.center || {}),
  browserDiscoveredCount: Number(scan.browserDiscoveredCount || 0),
  serverDiscoveredCount: fetched.elements.length,
  processedCount: locations.length,
  addedCount: added,
  existingCount: existing,
  claimedExcludedCount: claimed,
  responseCapped: fetched.elements.length >= fetched.limit,
  packageKeys: [...new Set(packageKeys)].sort()
};
world.packages = Object.fromEntries(Object.entries(world.packages).sort(([a], [b]) => a.localeCompare(b)));
world.scanCoverage = Object.fromEntries(Object.entries(world.scanCoverage).sort(([a], [b]) => a.localeCompare(b)));
registry.worlds = Object.fromEntries(Object.entries(registry.worlds).sort(([a], [b]) => a.localeCompare(b)));
fs.writeFileSync(targetPath, `${JSON.stringify(registry, null, 2)}\n`);
console.log(`Server rescan ${scan.scanKey}: ${locations.length} processed, ${added} added, ${existing} existing, ${claimed} claimed exclusions.`);
