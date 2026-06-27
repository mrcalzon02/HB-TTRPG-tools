import './validate-wod-map-only-core.mjs';
import fs from 'node:fs';

const config = JSON.parse(fs.readFileSync('data/world-of-darkness/spatial-engine-config.json', 'utf8'));
const generated = JSON.parse(fs.readFileSync('data/world-of-darkness/generated_location_registry.json', 'utf8'));
const influence = JSON.parse(fs.readFileSync('data/world-of-darkness/influence_overlay_registry.json', 'utf8'));
const receipt = JSON.parse(fs.readFileSync('source-page-references/chronicle-spatial-engine.source.json', 'utf8'));
const worldScan = fs.readFileSync('world-of-darkness-world-scan-overlay.js', 'utf8');

if (config.schemaVersion !== '2.6.0') throw new Error('Spatial configuration must use schemaVersion 2.6.0.');
if (config.namedLocationMatching?.scanScope !== 'all-openstreetmap-nodes-ways-and-relations-with-name-tag') throw new Error('Named-location scope is invalid.');
if (config.worldScan?.localVisibleLocationCap !== 90) throw new Error('Local scan cap must remain 90.');
if (config.worldScan?.globalViewportProcessingCap !== 90) throw new Error('Global scan cap must remain 90.');
if (config.contextAwareGeneration?.effectiveLocationVariants !== 420) throw new Error('Effective location variants must remain 420.');
if (config.contextAwareGeneration?.effectiveEntriesPerOutputPool !== 16) throw new Error('Output pools must remain 16 entries.');
if (config.contextAwareGeneration?.detailDiversity?.legacyCharacterPrototypeUse !== false) throw new Error('Legacy character prototype selection returned.');
if (config.contextAwareGeneration?.detailDiversity?.legacyRumorBundleUse !== false) throw new Error('Legacy rumor bundle selection returned.');
if (config.contextAwareGeneration?.lineDensityProfiles?.unified?.supernaturalOrAdjacentPercent !== 76.19) throw new Error('Unified density must remain 76.19% supernatural or adjacent.');
if (config.contextAwareGeneration?.lineDensityProfiles?.singleCatalog?.supernaturalOrAdjacentPercent !== 42.86) throw new Error('Single-catalog density must remain 42.86% supernatural or adjacent.');
const expectedCatalogs = ['vampire', 'werewolf', 'breeds', 'hunter', 'changeling', 'mage'];
if (JSON.stringify(config.contextAwareGeneration?.unifiedCatalogMode?.catalogs) !== JSON.stringify(expectedCatalogs)) throw new Error('Unified mode must declare all six catalogs.');
if (generated.schemaVersion !== '2.0.0') throw new Error('Generated registry schema is invalid.');
if (influence.schemaVersion !== '1.0.0') throw new Error('Influence registry schema is invalid.');
if (!worldScan.includes('Scan Visible Area Locally') || !worldScan.includes('Scan Visible Area Globally')) throw new Error('World scan controls are missing.');
if (!worldScan.includes('renderInfluenceOverlay')) throw new Error('Influence overlay renderer is missing.');
if (receipt.schemaVersion !== '2.9.0') throw new Error('Chronicle source receipt must use schemaVersion 2.9.0.');
if (receipt.generatedPackageSchemaVersion !== '2.1.0') throw new Error('Chronicle receipt must record package schemaVersion 2.1.0.');
if (receipt.detailDiversity?.legacyCharacterPrototypeSelection !== false) throw new Error('Receipt does not retire bundled character selection.');
if (receipt.detailDiversity?.legacyRumorBundleSelection !== false) throw new Error('Receipt does not retire bundled rumor selection.');
if (receipt.detailDiversity?.minimumCharacterPresentationCombinationsPerGameLine !== 82944) throw new Error('Receipt has the wrong character-combination floor.');
if (receipt.loadingModel?.staleConfigCompatibilityVersion !== '2.7.0') throw new Error('Receipt does not record compatibility version 2.7.0.');
if (receipt.loadingModel?.activeGameLineStatusBridge !== true) throw new Error('Receipt does not record the active-game-line status bridge.');
if (receipt.unifiedCatalogGeneration?.unifiedStatusProfile?.supernaturalOrAdjacentPercent !== 76.19) throw new Error('Receipt does not record Unified density.');
if (receipt.unifiedCatalogGeneration?.singleCatalogStatusProfile?.supernaturalOrAdjacentPercent !== 42.86) throw new Error('Receipt does not preserve single-catalog density.');
if (JSON.stringify(receipt.unifiedCatalogGeneration?.catalogs) !== JSON.stringify(expectedCatalogs)) throw new Error('Receipt does not record all Unified catalogs.');

const expectedCore = [
  'world-of-darkness-lightweight-map-core.js',
  'world-of-darkness-spatial-config-compat.js',
  'world-of-darkness-detail-diversity-core.js',
  'world-of-darkness-radial-location-loader.js',
  'world-of-darkness-radial-scan-compat.js'
];
if (JSON.stringify(receipt.loadingModel?.spatialCoreOnExplicitOpen) !== JSON.stringify(expectedCore)) {
  throw new Error('Receipt does not record the active diversified map core.');
}

for (const path of [
  receipt.spatialStageLoader,
  receipt.lightweightMapCore,
  receipt.spatialConfigCompatibility,
  receipt.detailDiversityCore,
  receipt.radialLocationLoader,
  receipt.radialScanCompatibility,
  receipt.worldSeedBridge,
  receipt.worldScanOverlay,
  receipt.globalRescanBridge,
  receipt.contextAwareCore,
  receipt.contextOutputNormalizer,
  receipt.contextAwareBrowserBridge,
  receipt.contextAwareServerEnricher,
  receipt.detailDiversityValidator,
  ...receipt.coreDataFiles
]) {
  if (!path || !fs.existsSync(path)) throw new Error(`Governed path is missing: ${path}`);
}

console.log(JSON.stringify({
  embeddedWorlds: Object.keys(generated.worlds || {}).length,
  influenceSpheres: influence.sphereVocabulary,
  effectiveLocationVariants: config.contextAwareGeneration.effectiveLocationVariants,
  generatedPackageSchemaVersion: receipt.generatedPackageSchemaVersion,
  staleConfigCompatibilityVersion: receipt.loadingModel.staleConfigCompatibilityVersion,
  activeGameLineStatusBridge: receipt.loadingModel.activeGameLineStatusBridge,
  unifiedSupernaturalOrAdjacentPercent: receipt.unifiedCatalogGeneration.unifiedStatusProfile.supernaturalOrAdjacentPercent,
  singleCatalogSupernaturalOrAdjacentPercent: receipt.unifiedCatalogGeneration.singleCatalogStatusProfile.supernaturalOrAdjacentPercent,
  unifiedCatalogs: receipt.unifiedCatalogGeneration.catalogs,
  mapOnlyStartup: receipt.loadingModel.mapOnlyStartup,
  detailDiversity: receipt.detailDiversity
}, null, 2));
