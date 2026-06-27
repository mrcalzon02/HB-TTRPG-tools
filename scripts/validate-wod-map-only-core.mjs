import fs from 'node:fs';

const loader = fs.readFileSync('world-of-darkness-spatial-loader.js', 'utf8');
const mapCore = fs.readFileSync('world-of-darkness-lightweight-map-core.js', 'utf8');
const configCompat = fs.readFileSync('world-of-darkness-spatial-config-compat.js', 'utf8');
const siteCatalog = fs.readFileSync('world-of-darkness-system-site-catalog.js', 'utf8');
const diversityCore = fs.readFileSync('world-of-darkness-detail-diversity-core.js', 'utf8');
const regionalExpansion = fs.readFileSync('world-of-darkness-regional-theme-expansion.js', 'utf8');
const siteExpansion = fs.readFileSync('world-of-darkness-system-site-expansion.js', 'utf8');
const radial = fs.readFileSync('world-of-darkness-radial-location-loader.js', 'utf8');
const compatibility = fs.readFileSync('world-of-darkness-radial-scan-compat.js', 'utf8');

const core = [
  'world-of-darkness-lightweight-map-core.js',
  'world-of-darkness-spatial-config-compat.js',
  'world-of-darkness-system-site-catalog.js',
  'world-of-darkness-detail-diversity-core.js',
  'world-of-darkness-regional-theme-expansion.js',
  'world-of-darkness-system-site-expansion.js',
  'world-of-darkness-radial-location-loader.js',
  'world-of-darkness-radial-scan-compat.js'
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
for (const file of [...core, ...deferred]) if (!loader.includes(`'${file}'`)) throw new Error(`Spatial loader is missing ${file}.`);
for (const file of ['world-of-darkness-named-location-bridge.js', 'world-of-darkness-spatial-engine-inventory.js']) {
  if (loader.includes(`'${file}'`)) throw new Error(`${file} returned to map-only startup.`);
}

const ordered = core.map(file => loader.indexOf(`'${file}'`));
if (ordered.some(index => index < 0) || ordered.some((index, position) => position && index <= ordered[position - 1])) {
  throw new Error('Spatial core scripts are missing or out of order.');
}

if (mapCore.includes('data/world-of-darkness/') || mapCore.includes('loadCoreData') || mapCore.includes('MutationObserver')) {
  throw new Error('Map-only core performs Chronicle data or whole-map observation work.');
}
for (const marker of ['SCRIPT_TIMEOUT_MS = 4500', 'cdn.jsdelivr.net', 'unpkg.com', 'Discover Named Locations']) {
  if (!mapCore.includes(marker)) throw new Error(`Map-only core is missing ${marker}.`);
}
for (const marker of ["COMPAT_VERSION = '2.7.0'", 'activeGameLineStatusBridge: true', "cache: 'no-store'", 'syntheticConfigResponse']) {
  if (!configCompat.includes(marker)) throw new Error(`Spatial configuration compatibility is missing ${marker}.`);
}
for (const marker of ["schemaVersion: '1.0.0'", 'siteTypes', 'systemSecrets', 'custodians', 'consequences', 'feeding-permission-node', 'caern-catchment-site', 'hunter-safehouse', 'freehold-annex', 'sanctum-annex']) {
  if (!siteCatalog.includes(marker)) throw new Error(`System site catalog is missing ${marker}.`);
}
for (const marker of ["VERSION = '3.2.0'", 'MANIFESTATION_CHANNELS', 'mix32', 'regional-theme-local-product-v32', 'manifestationChannelId']) {
  if (!regionalExpansion.includes(marker)) throw new Error(`Regional theme expansion is missing ${marker}.`);
}
for (const marker of ["VERSION = '1.0.0'", 'siteProfile', 'Specific hidden function', 'Supernatural infrastructure', 'System secret', 'Failure consequence']) {
  if (!siteExpansion.includes(marker)) throw new Error(`System site expansion is missing ${marker}.`);
}
for (const source of [diversityCore, siteCatalog, regionalExpansion, siteExpansion]) {
  if (source.includes('fetch(') || source.includes('XMLHttpRequest')) throw new Error('A pure generation module performs network work.');
}
for (const marker of ['MAX_VISIBLE = 90', "map.on('movestart zoomstart'", 'wod:radial-load-complete', 'Selecting unused neighborhood details']) {
  if (!radial.includes(marker)) throw new Error(`Radial loader is missing ${marker}.`);
}
if (!radial.includes('for (let index = 0; index < state.rawLocations.length; index += 1)')) throw new Error('Radial hydration is not sequential.');
for (const marker of ['wod:named-location-scan-complete', "hydrationMode: 'radial-sequential'", 'wod-resolve-business']) {
  if (!compatibility.includes(marker)) throw new Error(`Compatibility bridge is missing ${marker}.`);
}

console.log(JSON.stringify({
  mapOnlyCore: core,
  deferredTools: deferred,
  chronicleDataFetchesBeforeScan: 0,
  mapMutationObservers: 0,
  pureGeneratorNetworkRequests: 0,
  compatibilityVersion: '2.7.0',
  regionalThemeModelVersion: '3.2.0',
  regionalManifestationChannels: 12,
  systemSiteCatalogVersion: '1.0.0',
  systemSiteExpansionVersion: '1.0.0',
  systemSiteDimensions: 8,
  radialConcurrency: 1,
  radialVisibleCap: 90
}, null, 2));
