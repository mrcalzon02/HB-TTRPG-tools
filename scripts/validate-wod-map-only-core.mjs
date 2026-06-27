import fs from 'node:fs';

const loader = fs.readFileSync('world-of-darkness-spatial-loader.js', 'utf8');
const mapCore = fs.readFileSync('world-of-darkness-lightweight-map-core.js', 'utf8');
const radial = fs.readFileSync('world-of-darkness-radial-location-loader.js', 'utf8');
const compatibility = fs.readFileSync('world-of-darkness-radial-scan-compat.js', 'utf8');

const core = [
  'world-of-darkness-lightweight-map-core.js',
  'world-of-darkness-radial-location-loader.js',
  'world-of-darkness-radial-scan-compat.js'
];
const retired = [
  'world-of-darkness-named-location-bridge.js',
  'world-of-darkness-spatial-engine-inventory.js'
];
const deferred = [
  'world-of-darkness-location-package-bridge.js',
  'world-of-darkness-world-scan-overlay.js',
  'world-of-darkness-global-rescan-bridge.js',
  'world-of-darkness-context-aware-core.js',
  'world-of-darkness-context-output-normalizer.js',
  'world-of-darkness-context-aware-variants.js',
  'world-of-darkness-registry-workflow-note.js'
];

for (const file of [...core, ...deferred]) {
  if (!loader.includes(`'${file}'`)) throw new Error(`Spatial loader is missing ${file}.`);
}
for (const file of retired) {
  if (loader.includes(`'${file}'`)) throw new Error(`${file} returned to map-only startup.`);
}

if (mapCore.includes('data/world-of-darkness/')) throw new Error('Map-only core fetches Chronicle data.');
if (mapCore.includes('loadCoreData')) throw new Error('Map-only core expands Chronicle data.');
if (mapCore.includes('MutationObserver')) throw new Error('Map-only core observes the map DOM.');
for (const marker of [
  'SCRIPT_TIMEOUT_MS = 4500',
  'cdn.jsdelivr.net',
  'unpkg.com',
  'Preparing the map only. No Chronicle data is being loaded.',
  "new CustomEvent('wod:spatial-map-ready'",
  'Discover Named Locations'
]) {
  if (!mapCore.includes(marker)) throw new Error(`Map-only core is missing ${marker}.`);
}

for (const marker of [
  'MAX_VISIBLE = 90',
  '.sort((left, right) => left.distance - right.distance',
  "map.on('movestart zoomstart'",
  'wod-radial-overall',
  'wod:radial-location-ready',
  'wod:radial-load-complete',
  'wod:radial-load-cancelled',
  'return { ...payload, elements: [] }'
]) {
  if (!radial.includes(marker)) throw new Error(`Radial loader is missing ${marker}.`);
}
if (!radial.includes('for (let index = 0; index < state.rawLocations.length; index += 1)')) {
  throw new Error('Radial hydration is not sequential.');
}

for (const marker of [
  'wod:named-location-scan-complete',
  'WODLightweightSpatialCore?.setLatestScan',
  "hydrationMode: 'radial-sequential'",
  'wod-resolve-business'
]) {
  if (!compatibility.includes(marker)) throw new Error(`Compatibility bridge is missing ${marker}.`);
}

if (!loader.includes("document.addEventListener('wod:radial-load-complete'")) {
  throw new Error('Advanced Chronicle tools do not wait for radial completion.');
}

console.log(JSON.stringify({
  mapOnlyCore: core,
  retiredCore: retired,
  deferredTools: deferred,
  chronicleDataFetchesBeforeScan: 0,
  mapMutationObservers: 0,
  leafletFallbackTimeoutMs: 4500,
  radialConcurrency: 1,
  radialVisibleCap: 90
}, null, 2));
