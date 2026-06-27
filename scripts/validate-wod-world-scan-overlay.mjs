import fs from 'node:fs';

const configPath = 'data/world-of-darkness/spatial-engine-config.json';
const generatedRegistryPath = 'data/world-of-darkness/generated_location_registry.json';
const influenceRegistryPath = 'data/world-of-darkness/influence_overlay_registry.json';
const sourceReceiptPath = 'source-page-references/chronicle-spatial-engine.source.json';
const namedBridgePath = 'world-of-darkness-named-location-bridge.js';
const worldScanPath = 'world-of-darkness-world-scan-overlay.js';
const globalRescanPath = 'world-of-darkness-global-rescan-bridge.js';
const loaderPath = 'character-sheet-title.js';

const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const generatedRegistry = JSON.parse(fs.readFileSync(generatedRegistryPath, 'utf8'));
const influenceRegistry = JSON.parse(fs.readFileSync(influenceRegistryPath, 'utf8'));
const sourceReceipt = JSON.parse(fs.readFileSync(sourceReceiptPath, 'utf8'));
const namedBridge = fs.readFileSync(namedBridgePath, 'utf8');
const worldScan = fs.readFileSync(worldScanPath, 'utf8');
const globalRescan = fs.readFileSync(globalRescanPath, 'utf8');
const loader = fs.readFileSync(loaderPath, 'utf8');

if (config.schemaVersion !== '2.4.0') throw new Error('Spatial engine config must use schemaVersion 2.4.0.');
if (config.namedLocationMatching?.scanScope !== 'all-openstreetmap-nodes-ways-and-relations-with-name-tag') {
  throw new Error('Named-location scan scope is not configured for all named OSM elements.');
}
if (config.worldScan?.localVisibleLocationCap !== 90) throw new Error('Local world-scan cap must remain 90.');
if (config.worldScan?.globalViewportProcessingCap !== 90) throw new Error('Global viewport processing cap must remain 90.');
if (config.worldScan?.globalSubmissionModel !== 'compact-viewport-manifest-with-server-side-all-named-rescan') {
  throw new Error('Global scans must use the compact server-rescan submission model.');
}
if (config.coreData?.influenceOverlayRegistry !== influenceRegistryPath) throw new Error('Influence overlay registry is not registered in coreData.');
if (!namedBridge.includes('nwr["name"](${bbox})')) throw new Error('Named-location bridge does not issue the all-name Overpass query.');
if (!namedBridge.includes('wod:named-location-scan-complete')) throw new Error('Named-location bridge does not publish completed scans.');
if (!namedBridge.includes('wod:spatial-map-ready')) throw new Error('Named-location bridge does not expose the map instance.');
if (!worldScan.includes('Scan Visible Area Locally') || !worldScan.includes('Scan Visible Area Globally')) {
  throw new Error('Local and global world-scan controls are missing.');
}
if (!worldScan.includes('renderInfluenceOverlay')) throw new Error('Influence overlay renderer is missing.');
if (!globalRescan.includes('WOD_WORLD_SCAN_RESCAN_PATCH')) throw new Error('Compact global rescan marker is missing.');
if (!globalRescan.includes('server-rescan-all-named')) throw new Error('Compact global rescan query mode is missing.');
if (!loader.includes('script.async = false')) throw new Error('Supplemental runtime loading is not ordered.');
const namedIndex = loader.indexOf('world-of-darkness-named-location-bridge.js');
const spatialIndex = loader.indexOf('world-of-darkness-spatial-engine-inventory.js');
const packageIndex = loader.indexOf('world-of-darkness-location-package-bridge.js');
const overlayIndex = loader.indexOf('world-of-darkness-world-scan-overlay.js');
const rescanIndex = loader.indexOf('world-of-darkness-global-rescan-bridge.js');
if (!(namedIndex >= 0 && namedIndex < spatialIndex && spatialIndex < packageIndex && packageIndex < overlayIndex && overlayIndex < rescanIndex)) {
  throw new Error('World of Darkness runtime load order must be named bridge, spatial engine, package bridge, world-scan overlay, then compact global rescan bridge.');
}

if (generatedRegistry.schemaVersion !== '2.0.0' || generatedRegistry.registryType !== 'chronicle-world-seeded-location-packages') {
  throw new Error('Generated world registry schema is invalid.');
}
for (const [worldSeedKey, world] of Object.entries(generatedRegistry.worlds || {})) {
  if (!/^wodworld-[0-9a-f]{8}$/.test(worldSeedKey)) throw new Error(`Invalid world key ${worldSeedKey}.`);
  if (world.worldSeedKey !== worldSeedKey) throw new Error(`World ${worldSeedKey} has a mismatched key.`);
  if (world.scanCoverage != null && (typeof world.scanCoverage !== 'object' || Array.isArray(world.scanCoverage))) {
    throw new Error(`World ${worldSeedKey} scanCoverage must be an object.`);
  }
}

if (influenceRegistry.schemaVersion !== '1.0.0') throw new Error('Influence overlay registry schemaVersion is invalid.');
if (influenceRegistry.registryType !== 'chronicle-supernatural-influence-overlays') throw new Error('Influence overlay registry type is invalid.');
if (!Array.isArray(influenceRegistry.sphereVocabulary) || !influenceRegistry.sphereVocabulary.includes('kindred') || !influenceRegistry.sphereVocabulary.includes('awakened')) {
  throw new Error('Influence overlay sphere vocabulary is incomplete.');
}
if (!influenceRegistry.worlds || typeof influenceRegistry.worlds !== 'object' || Array.isArray(influenceRegistry.worlds)) {
  throw new Error('Influence overlay worlds must be an object.');
}

if (sourceReceipt.schemaVersion !== '2.4.0') throw new Error('Chronicle source receipt must use schemaVersion 2.4.0.');
const governedPaths = [
  sourceReceipt.namedLocationBridge,
  sourceReceipt.governedRuntime,
  sourceReceipt.worldSeedBridge,
  sourceReceipt.worldScanOverlay,
  sourceReceipt.globalRescanBridge,
  sourceReceipt.globalRescanWorkflow
];
for (const governedPath of governedPaths) {
  if (typeof governedPath !== 'string' || !fs.existsSync(governedPath)) {
    throw new Error(`Governed Chronicle path is missing: ${governedPath}`);
  }
}
if (!sourceReceipt.coreDataFiles.includes(influenceRegistryPath)) throw new Error('Source receipt does not include the influence overlay registry.');

console.log(JSON.stringify({
  namedLocationScope: config.namedLocationMatching.scanScope,
  localWorldScanCap: config.worldScan.localVisibleLocationCap,
  globalViewportProcessingCap: config.worldScan.globalViewportProcessingCap,
  globalSubmissionModel: config.worldScan.globalSubmissionModel,
  runtimeOrder: ['named-location-bridge', 'spatial-engine', 'location-package-bridge', 'world-scan-overlay', 'global-rescan-bridge'],
  governedPaths,
  embeddedWorlds: Object.keys(generatedRegistry.worlds || {}).length,
  influenceSpheres: influenceRegistry.sphereVocabulary,
  provisionalRadii: config.influenceOverlay.statusRadiusMeters
}, null, 2));
