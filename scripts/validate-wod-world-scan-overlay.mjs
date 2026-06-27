import './validate-wod-map-only-core.mjs';
import fs from 'node:fs';

const config = JSON.parse(fs.readFileSync('data/world-of-darkness/spatial-engine-config.json', 'utf8'));
const generated = JSON.parse(fs.readFileSync('data/world-of-darkness/generated_location_registry.json', 'utf8'));
const influence = JSON.parse(fs.readFileSync('data/world-of-darkness/influence_overlay_registry.json', 'utf8'));
const receipt = JSON.parse(fs.readFileSync('source-page-references/chronicle-spatial-engine.source.json', 'utf8'));
const worldScan = fs.readFileSync('world-of-darkness-world-scan-overlay.js', 'utf8');

if (config.namedLocationMatching?.scanScope !== 'all-openstreetmap-nodes-ways-and-relations-with-name-tag') throw new Error('Named-location scope is invalid.');
if (config.worldScan?.localVisibleLocationCap !== 90) throw new Error('Local scan cap must remain 90.');
if (config.worldScan?.globalViewportProcessingCap !== 90) throw new Error('Global scan cap must remain 90.');
if (config.contextAwareGeneration?.effectiveLocationVariants !== 420) throw new Error('Effective location variants must remain 420.');
if (config.contextAwareGeneration?.effectiveEntriesPerOutputPool !== 16) throw new Error('Output pools must remain 16 entries.');
if (generated.schemaVersion !== '2.0.0') throw new Error('Generated registry schema is invalid.');
if (influence.schemaVersion !== '1.0.0') throw new Error('Influence registry schema is invalid.');
if (!worldScan.includes('Scan Visible Area Locally') || !worldScan.includes('Scan Visible Area Globally')) throw new Error('World scan controls are missing.');
if (!worldScan.includes('renderInfluenceOverlay')) throw new Error('Influence overlay renderer is missing.');
if (receipt.schemaVersion !== '2.8.0') throw new Error('Chronicle source receipt must use schemaVersion 2.8.0.');

for (const path of [
  receipt.spatialStageLoader,
  receipt.lightweightMapCore,
  receipt.radialLocationLoader,
  receipt.radialScanCompatibility,
  receipt.worldSeedBridge,
  receipt.worldScanOverlay,
  receipt.globalRescanBridge,
  receipt.contextAwareCore,
  receipt.contextOutputNormalizer,
  receipt.contextAwareBrowserBridge,
  ...receipt.coreDataFiles
]) {
  if (!path || !fs.existsSync(path)) throw new Error(`Governed path is missing: ${path}`);
}

console.log(JSON.stringify({
  embeddedWorlds: Object.keys(generated.worlds || {}).length,
  influenceSpheres: influence.sphereVocabulary,
  effectiveLocationVariants: config.contextAwareGeneration.effectiveLocationVariants,
  mapOnlyStartup: receipt.loadingModel.mapOnlyStartup
}, null, 2));
