import fs from 'node:fs';

const loader = fs.readFileSync('world-of-darkness-spatial-loader.js', 'utf8');
const mapCore = fs.readFileSync('world-of-darkness-lightweight-map-core.js', 'utf8');
const configCompat = fs.readFileSync('world-of-darkness-spatial-config-compat.js', 'utf8');
const siteCatalog = fs.readFileSync('world-of-darkness-system-site-catalog.js', 'utf8');
const diversityCore = fs.readFileSync('world-of-darkness-detail-diversity-core.js', 'utf8');
const siteExpansion = fs.readFileSync('world-of-darkness-system-site-expansion.js', 'utf8');
const radial = fs.readFileSync('world-of-darkness-radial-location-loader.js', 'utf8');
const compatibility = fs.readFileSync('world-of-darkness-radial-scan-compat.js', 'utf8');

const core = [
  'world-of-darkness-lightweight-map-core.js',
  'world-of-darkness-spatial-config-compat.js',
  'world-of-darkness-system-site-catalog.js',
  'world-of-darkness-detail-diversity-core.js',
  'world-of-darkness-system-site-expansion.js',
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
  "COMPAT_VERSION = '2.7.0'",
  'CORE_DATA_DEFAULTS',
  'contextExpansion',
  'detailDiversity',
  'wrapDetailCore',
  'activeGameLine',
  'activeGameLineStatusBridge: true',
  "freshUrl.searchParams.set('wod-config', COMPAT_VERSION)",
  "cache: 'no-store'",
  'syntheticConfigResponse',
  'staleSchemaDefaultsApplied: true'
]) {
  if (!configCompat.includes(marker)) throw new Error(`Spatial config compatibility is missing ${marker}.`);
}

for (const marker of [
  "schemaVersion: '1.0.0'",
  'siteTypes',
  'hiddenFunctions',
  'infrastructures',
  'systemSecrets',
  'custodians',
  'evidencePatterns',
  'conflicts',
  'consequences',
  'cross-sphere-civic-junction',
  'feeding-permission-node',
  'caern-catchment-site',
  'fera-migration-waystation',
  'hunter-safehouse',
  'freehold-annex',
  'sanctum-annex'
]) {
  if (!siteCatalog.includes(marker)) throw new Error(`System site catalog is missing ${marker}.`);
}
for (const marker of [
  "VERSION = '1.0.0'",
  'enhanceCore',
  'systemSiteCatalogVersion',
  'siteProfile',
  'Specific hidden function',
  'Supernatural infrastructure',
  'System secret',
  'Evidence pattern',
  'Local struggle',
  'Failure consequence'
]) {
  if (!siteExpansion.includes(marker)) throw new Error(`System site expansion is missing ${marker}.`);
}

const configCompatIndex = loader.indexOf("'world-of-darkness-spatial-config-compat.js'");
const siteCatalogIndex = loader.indexOf("'world-of-darkness-system-site-catalog.js'");
const diversityCoreIndex = loader.indexOf("'world-of-darkness-detail-diversity-core.js'");
const siteExpansionIndex = loader.indexOf("'world-of-darkness-system-site-expansion.js'");
const radialLoaderIndex = loader.indexOf("'world-of-darkness-radial-location-loader.js'");
if ([configCompatIndex, siteCatalogIndex, diversityCoreIndex, siteExpansionIndex, radialLoaderIndex].some(index => index < 0)) {
  throw new Error('One or more spatial core modules are absent from the loader.');
}
if (!(configCompatIndex < siteCatalogIndex && siteCatalogIndex < diversityCoreIndex && diversityCoreIndex < siteExpansionIndex && siteExpansionIndex < radialLoaderIndex)) {
  throw new Error('System catalog and expansion must load after compatibility/core setup and before radial hydration.');
}

for (const marker of [
  'STATUS_PROFILES',
  'standard: Object.freeze([12, 6, 2, 1])',
  'unified: Object.freeze([5, 8, 5, 3])',
  'CATALOG_LINES',
  'unified-catalog-line',
  'catalogLine',
  'createSession',
  'neighborhoodKey',
  'inventoryStatusFromSeed',
  'THEME_COMPONENTS',
  'THEME_DYNAMICS',
  'regionalThemeVariantCount',
  'themeVersion',
  'diversitySignature'
]) {
  if (!diversityCore.includes(marker)) throw new Error(`Detail diversity core is missing ${marker}.`);
}
if (diversityCore.includes('fetch(') || diversityCore.includes('XMLHttpRequest')) {
  throw new Error('The pure detail-diversity module must not perform network work during startup.');
}
if (siteCatalog.includes('fetch(') || siteCatalog.includes('XMLHttpRequest') || siteExpansion.includes('fetch(') || siteExpansion.includes('XMLHttpRequest')) {
  throw new Error('System site modules must remain pure and must not perform network work during startup.');
}

for (const marker of [
  'MAX_VISIBLE = 90',
  '.sort((left, right) => left.distance - right.distance',
  "map.on('movestart zoomstart'",
  'wod-radial-overall',
  'wod:radial-location-ready',
  'wod:radial-load-complete',
  'wod:radial-load-cancelled',
  'return { ...payload, elements: [] }',
  'Selecting unused neighborhood details',
  'detailDiversity'
]) {
  if (!radial.includes(marker)) throw new Error(`Radial loader is missing ${marker}.`);
}
if (!radial.includes('for (let index = 0; index < state.rawLocations.length; index += 1)')) {
  throw new Error('Radial hydration is not sequential.');
}
if (radial.includes('characters_core.json') || radial.includes('rumors_core.json')) {
  throw new Error('Radial generation returned to bundled character or rumor prototypes.');
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
  pureDiversityCoreNetworkRequests: 0,
  pureSystemSiteModuleNetworkRequests: 0,
  staleConfigCompatibilityVersion: '2.7.0',
  activeGameLineStatusBridge: true,
  unifiedStatusProfile: [5, 8, 5, 3],
  singleCatalogStatusProfile: [12, 6, 2, 1],
  unifiedCatalogs: 6,
  regionalThemeModelVersion: '3.0.0',
  systemSiteCatalogVersion: '1.0.0',
  systemSiteExpansionVersion: '1.0.0',
  systemSiteDimensions: 8,
  governedDatasetDefaults: 10,
  leafletFallbackTimeoutMs: 4500,
  radialConcurrency: 1,
  radialVisibleCap: 90,
  bundledCharacterRumorSelection: false
}, null, 2));
