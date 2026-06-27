import fs from 'node:fs';
import path from 'node:path';
import { createWorldScanPackageFactory } from './wod-world-scan-package-factory.mjs';

const TARGET = 'data/world-of-darkness/generated_location_registry.json';
const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter'
];
const GAME_LINES = new Set(['unified', 'vampire', 'werewolf', 'breeds', 'hunter', 'changeling', 'mage']);
const CATEGORY_LABELS = Object.freeze({
  restaurant: 'Food / Restaurant', bar: 'Bar / Pub', night_club: 'Night Club',
  book_store: 'Book Store', library: 'Library', hospital: 'Healthcare', pharmacy: 'Pharmacy',
  cemetery: 'Cemetery', park: 'Park / Green Space', store: 'Retail', lodging: 'Lodging',
  church: 'Religious Site', transit_station: 'Transit', government: 'Civic / Government',
  office: 'Office', industrial: 'Craft / Industrial', natural_feature: 'Natural Feature',
  road: 'Road / Route', education: 'Education', historic: 'Historic Site',
  fitness: 'Fitness / Gym', sports: 'Sports / Recreation', other: 'Other Named Location'
});

const body = process.env.ISSUE_BODY_FILE
  ? fs.readFileSync(process.env.ISSUE_BODY_FILE, 'utf8')
  : (process.env.ISSUE_BODY || '');
if (!body.includes('<!-- WOD_WORLD_SCAN_RESCAN_PATCH -->')) throw new Error('Missing World of Darkness viewport-rescan marker.');
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
if (!GAME_LINES.has(patch?.gameLine)) throw new Error('gameLine is invalid.');

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
const baseLocations = JSON.parse(fs.readFileSync(config.coreData.locations, 'utf8'));
const contextExpansion = JSON.parse(fs.readFileSync(config.coreData.contextExpansion, 'utf8'));
const detailDiversity = JSON.parse(fs.readFileSync(config.coreData.detailDiversity, 'utf8'));
const baseCrosslinks = JSON.parse(fs.readFileSync(config.coreData.crosslinks, 'utf8'));
const crosslinkExpansion = JSON.parse(fs.readFileSync(config.coreData.crosslinkExpansion, 'utf8'));
const claimedRegistry = JSON.parse(fs.readFileSync(config.coreData.centralRegistry, 'utf8'));
const registryPath = path.resolve(process.cwd(), process.env.WOD_REGISTRY_PATH || TARGET);
const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
if (registry.schemaVersion !== '2.0.0') throw new Error('Generated location registry must use schemaVersion 2.0.0.');
registry.worlds ||= {};

const clone = value => JSON.parse(JSON.stringify(value));
const normalize = value => String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
const humanize = value => String(value || '').replace(/[_:]+/g, ' ').replace(/\b\w/g, character => character.toUpperCase());

function murmurHash3(input, seed = 0) {
  let remainder = input.length & 3;
  const bytes = input.length - remainder;
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

function featureLabel(tags = {}) {
  if (tags.leisure === 'fitness_centre' || tags.amenity === 'gym') return 'Fitness Centre';
  if (tags.leisure === 'sports_centre' || tags.leisure === 'stadium' || tags.sport) return 'Sports Facility';
  if (['restaurant', 'cafe', 'fast_food'].includes(tags.amenity)) return 'Food Venue';
  if (['bar', 'pub', 'nightclub'].includes(tags.amenity)) return 'Nightlife Venue';
  if (tags.shop) return `Retail Location · ${humanize(tags.shop)}`;
  if (tags.office) return `Office · ${humanize(tags.office)}`;
  if (tags.tourism) return `Tourism Location · ${humanize(tags.tourism)}`;
  if (tags.amenity === 'place_of_worship') return 'Religious Site';
  if (tags.amenity === 'grave_yard' || tags.landuse === 'cemetery') return 'Cemetery';
  if (['school', 'college', 'university'].includes(tags.amenity)) return 'Education Site';
  if (tags.railway || tags.public_transport) return 'Transit Feature';
  if (tags.highway) return 'Named Road or Path';
  if (['park', 'garden', 'nature_reserve'].includes(tags.leisure)) return 'Park or Green Space';
  if (tags.natural || tags.waterway) return 'Natural or Water Feature';
  if (tags.historic) return 'Historic Site';
  if (tags.building) return tags.building === 'yes' ? 'Named Building' : `Named Building · ${humanize(tags.building)}`;
  if (tags.place) return 'Named Place';
  return 'Named Map Feature';
}

function categoryFor(tags = {}) {
  const amenity = tags.amenity;
  if (tags.leisure === 'fitness_centre' || amenity === 'gym') return 'fitness';
  if (tags.leisure === 'sports_centre' || tags.leisure === 'stadium' || tags.sport) return 'sports';
  if (['restaurant', 'cafe', 'fast_food', 'food_court', 'ice_cream'].includes(amenity)) return 'restaurant';
  if (['bar', 'pub', 'biergarten'].includes(amenity)) return 'bar';
  if (amenity === 'nightclub') return 'night_club';
  if (amenity === 'library') return 'library';
  if (['hospital', 'clinic', 'doctors', 'dentist'].includes(amenity) || tags.healthcare) return 'hospital';
  if (amenity === 'pharmacy') return 'pharmacy';
  if (amenity === 'grave_yard' || tags.landuse === 'cemetery') return 'cemetery';
  if (amenity === 'place_of_worship') return 'church';
  if (['school', 'college', 'university', 'kindergarten'].includes(amenity)) return 'education';
  if (['bus_station', 'ferry_terminal'].includes(amenity) || tags.railway || tags.public_transport) return 'transit_station';
  if (['townhall', 'courthouse', 'police', 'fire_station', 'post_office'].includes(amenity)) return 'government';
  if (tags.shop === 'books') return 'book_store';
  if (tags.shop) return 'store';
  if (['hotel', 'motel', 'hostel', 'guest_house'].includes(tags.tourism)) return 'lodging';
  if (tags.office) return 'office';
  if (tags.craft || tags.industrial || tags.man_made || tags.landuse === 'industrial') return 'industrial';
  if (['park', 'garden', 'nature_reserve'].includes(tags.leisure)) return 'park';
  if (tags.natural || tags.waterway) return 'natural_feature';
  if (tags.highway) return 'road';
  if (tags.historic) return 'historic';
  return 'other';
}

function sourceTags(tags = {}) {
  const allowed = [
    'amenity', 'shop', 'tourism', 'historic', 'leisure', 'sport', 'healthcare', 'natural', 'waterway',
    'highway', 'railway', 'public_transport', 'place', 'boundary', 'aeroway', 'office', 'craft',
    'landuse', 'power', 'man_made', 'military', 'building', 'religion', 'denomination', 'operator', 'brand'
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
  const fixturePath = process.env.WOD_OVERPASS_FIXTURE;
  if (fixturePath) {
    const payload = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
    return { elements: Array.isArray(payload) ? payload : payload.elements || [], limit: Number(payload.limit || 9999), fixture: true };
  }

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
      return { elements: payload.elements || [], limit, fixture: false };
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
    const name = String(tags.name || tags.brand || tags.operator || '').trim();
    const lat = Number(element.lat ?? element.center?.lat);
    const lng = Number(element.lon ?? element.center?.lon);
    if (!name || !Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    const osmType = String(element.type || 'node');
    const osmId = String(element.id);
    const identity = `${osmType}/${osmId}`;
    if (unique.has(identity)) continue;
    const address = addressFrom(tags);
    const canonical = [normalize(name), normalize(address), lat.toFixed(6), lng.toFixed(6)].join('|');
    const locationKey = `gmaps-${murmurHash3(canonical, 0x1f123bb5).toString(16).padStart(8, '0')}`;
    const category = categoryFor(tags);
    const location = {
      locationKey,
      name,
      address,
      referenceUrl: `https://www.openstreetmap.org/${osmType}/${osmId}`,
      category,
      categoryLabel: CATEGORY_LABELS[category] || CATEGORY_LABELS.other,
      coordinates: { lat, lng },
      osmType,
      osmId,
      featureLabel: featureLabel(tags),
      sourceTags: sourceTags(tags),
      source: 'OpenStreetMap / Overpass server rescan',
      scanKey: scan.scanKey,
      scanZoom: scan.zoom,
      scanBounds: clone(scan.bounds),
      scanCenter: clone(center)
    };
    location.distance = distanceMeters(location, center);
    unique.set(identity, location);
  }
  return [...unique.values()]
    .sort((left, right) => left.distance - right.distance || left.name.localeCompare(right.name))
    .slice(0, Number(config.worldScan?.globalViewportProcessingCap || 90))
    .map(({ distance, ...location }) => location);
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
const packageFactory = createWorldScanPackageFactory({
  worldSeed,
  gameLine: patch.gameLine,
  generatedAt: scan.scannedAt,
  baseLocations,
  contextExpansion,
  detailDiversity,
  baseCrosslinks,
  crosslinkExpansion
});

let added = 0;
let existing = 0;
let claimed = 0;
const packageKeys = [];
const catalogCounts = {};
const statusCounts = {};

for (const location of locations) {
  if (claimedRegistry.entries?.[location.locationKey]) {
    claimed += 1;
    continue;
  }
  const pkg = packageFactory.generate(location);
  packageKeys.push(pkg.packageKey);
  const snapshot = pkg.location.contextSnapshot;
  catalogCounts[snapshot.catalogLine] = (catalogCounts[snapshot.catalogLine] || 0) + 1;
  statusCounts[pkg.location.inventoryStatus] = (statusCounts[pkg.location.inventoryStatus] || 0) + 1;
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
  bounds: clone(scan.bounds),
  center: clone(scan.center || {}),
  zoom: scan.zoom,
  gameLine: patch.gameLine,
  serverResultCount: fetched.elements.length,
  normalizedResultCount: locations.length,
  processingCap: Number(config.worldScan?.globalViewportProcessingCap || 90),
  overpassLimit: fetched.limit,
  responseCapReached: fetched.elements.length >= fetched.limit,
  fixture: fetched.fixture,
  packageKeys,
  catalogCounts,
  statusCounts,
  generatorVersion: 'world-seeded-cross-catalog-server-rescan-3.1.0'
};

world.packages = Object.fromEntries(Object.entries(world.packages).sort(([left], [right]) => left.localeCompare(right)));
world.scanCoverage = Object.fromEntries(Object.entries(world.scanCoverage).sort(([left], [right]) => left.localeCompare(right)));
registry.worlds = Object.fromEntries(Object.entries(registry.worlds).sort(([left], [right]) => left.localeCompare(right)));
fs.writeFileSync(registryPath, `${JSON.stringify(registry, null, 2)}\n`);

console.log(JSON.stringify({
  worldSeedKey: worldSeed.worldSeedKey,
  scanKey: scan.scanKey,
  gameLine: patch.gameLine,
  discovered: fetched.elements.length,
  normalized: locations.length,
  added,
  existing,
  claimed,
  packageCount: packageKeys.length,
  catalogCounts,
  statusCounts,
  statusProfile: packageFactory.statusProfile,
  responseCapReached: fetched.elements.length >= fetched.limit,
  fixture: fetched.fixture,
  registryPath
}, null, 2));
