import './validate-wod-map-only-core.mjs';
import fs from 'node:fs';

const config = JSON.parse(fs.readFileSync('data/world-of-darkness/spatial-engine-config.json', 'utf8'));
const generated = JSON.parse(fs.readFileSync('data/world-of-darkness/generated_location_registry.json', 'utf8'));
const influence = JSON.parse(fs.readFileSync('data/world-of-darkness/influence_overlay_registry.json', 'utf8'));
const receipt = JSON.parse(fs.readFileSync('source-page-references/chronicle-spatial-engine.source.json', 'utf8'));
const worldScan = fs.readFileSync('world-of-darkness-world-scan-overlay.js', 'utf8');
const globalWorkflow = fs.readFileSync('.github/workflows/ingest-wod-world-scan-batch.yml', 'utf8');

if (config.schemaVersion !== '2.6.0') throw new Error('Spatial configuration must use schemaVersion 2.6.0.');
if (config.namedLocationMatching?.scanScope !== 'all-openstreetmap-nodes-ways-and-relations-with-name-tag') throw new Error('Named-location scope is invalid.');
if (config.worldScan?.localVisibleLocationCap !== 90 || config.worldScan?.globalViewportProcessingCap !== 90) throw new Error('World-scan caps must remain 90.');
if (config.contextAwareGeneration?.effectiveLocationVariants !== 420 || config.contextAwareGeneration?.effectiveEntriesPerOutputPool !== 16) throw new Error('Context and output counts changed unexpectedly.');
if (config.contextAwareGeneration?.detailDiversity?.legacyCharacterPrototypeUse !== false || config.contextAwareGeneration?.detailDiversity?.legacyRumorBundleUse !== false) throw new Error('Legacy bundled profile selection returned.');
if (config.contextAwareGeneration?.lineDensityProfiles?.unified?.supernaturalOrAdjacentPercent !== 76.19) throw new Error('Unified density changed.');
if (config.contextAwareGeneration?.lineDensityProfiles?.singleCatalog?.supernaturalOrAdjacentPercent !== 42.86) throw new Error('Single-catalog density changed.');
const expectedCatalogs = ['vampire', 'werewolf', 'breeds', 'hunter', 'changeling', 'mage'];
if (JSON.stringify(config.contextAwareGeneration?.unifiedCatalogMode?.catalogs) !== JSON.stringify(expectedCatalogs)) throw new Error('Unified mode does not declare all six catalogs.');
if (generated.schemaVersion !== '2.0.0' || influence.schemaVersion !== '1.0.0') throw new Error('Registry schema is invalid.');
if (!worldScan.includes('Scan Visible Area Locally') || !worldScan.includes('Scan Visible Area Globally') || !worldScan.includes('renderInfluenceOverlay')) throw new Error('World-scan or influence controls are missing.');

if (!globalWorkflow.includes('node scripts/ingest-wod-world-scan-rescan-v4.mjs')) throw new Error('Production global scan workflow does not invoke rescan-v4.');
if (globalWorkflow.includes('run: node scripts/ingest-wod-world-scan-rescan-v3.mjs') || globalWorkflow.includes('node scripts/enrich-wod-location-context.mjs')) throw new Error('Production workflow bypasses v4 or rewrites completed packages.');
if (!globalWorkflow.includes('immutable regional and system-site packages')) throw new Error('Production workflow does not identify its immutable transaction.');

if (receipt.schemaVersion !== '2.9.0' || receipt.generatedPackageSchemaVersion !== '2.1.0') throw new Error('Chronicle receipt schema is invalid.');
if (receipt.detailDiversity?.legacyCharacterPrototypeSelection !== false || receipt.detailDiversity?.legacyRumorBundleSelection !== false) throw new Error('Receipt does not retire bundled profiles.');
if (receipt.detailDiversity?.minimumCharacterPresentationCombinationsPerGameLine !== 82944) throw new Error('Receipt has the wrong character-combination floor.');
if (receipt.loadingModel?.staleConfigCompatibilityVersion !== '2.7.0' || receipt.loadingModel?.activeGameLineStatusBridge !== true) throw new Error('Receipt lacks the active compatibility contract.');
if (receipt.unifiedCatalogGeneration?.unifiedStatusProfile?.supernaturalOrAdjacentPercent !== 76.19 || receipt.unifiedCatalogGeneration?.singleCatalogStatusProfile?.supernaturalOrAdjacentPercent !== 42.86) throw new Error('Receipt has the wrong density profiles.');
if (JSON.stringify(receipt.unifiedCatalogGeneration?.catalogs) !== JSON.stringify(expectedCatalogs)) throw new Error('Receipt does not record all Unified catalogs.');
if (receipt.unifiedCatalogGeneration?.globalIngestion?.generatorVersion !== 'world-seeded-system-site-server-rescan-3.2.0' || receipt.unifiedCatalogGeneration?.globalIngestion?.wrapper !== 'scripts/ingest-wod-world-scan-rescan-v4.mjs') throw new Error('Receipt does not record system-site v4 global ingestion.');
if (receipt.unifiedCatalogGeneration?.globalIngestion?.onePassImmutablePackageTransaction !== true) throw new Error('Receipt does not prohibit post-ingestion rewriting.');
if (receipt.regionalThemeGeneration?.version !== '3.2.0' || receipt.regionalThemeGeneration?.legacyQualifierVersion !== '1.0.0') throw new Error('Receipt does not record the regional model and qualifier versions.');
if (receipt.regionalThemeGeneration?.minimumVariantsPerCatalog !== 27648 || receipt.regionalThemeGeneration?.manifestationChannels !== 12) throw new Error('Receipt does not record the complete regional product space.');
if (receipt.regionalThemeGeneration?.legacyThemeFrequencyDenominator !== 32 || receipt.regionalThemeGeneration?.exactThemeRecurrenceCeiling !== 3) throw new Error('Receipt does not record regional rarity limits.');
if (receipt.systemSiteGeneration?.catalogVersion !== '1.0.0' || receipt.systemSiteGeneration?.expansionVersion !== '1.0.0') throw new Error('Receipt does not record system-site versions.');
if (receipt.systemSiteGeneration?.authoredEntries !== 588 || receipt.systemSiteGeneration?.dimensions !== 8 || receipt.systemSiteGeneration?.minimumDedicatedLineStructuralCombinations !== 144000000) throw new Error('Receipt has incomplete system-site counts.');

const expectedCore = [
  'world-of-darkness-lightweight-map-core.js',
  'world-of-darkness-spatial-config-compat.js',
  'world-of-darkness-system-site-catalog.js',
  'world-of-darkness-detail-diversity-core.js',
  'world-of-darkness-regional-theme-expansion.js',
  'world-of-darkness-regional-legacy-qualifier.js',
  'world-of-darkness-system-site-expansion.js',
  'world-of-darkness-radial-location-loader.js',
  'world-of-darkness-radial-scan-compat.js'
];
if (JSON.stringify(receipt.loadingModel?.spatialCoreOnExplicitOpen) !== JSON.stringify(expectedCore)) throw new Error('Receipt does not record the active map core.');

for (const governedPath of [
  receipt.spatialStageLoader,
  receipt.lightweightMapCore,
  receipt.spatialConfigCompatibility,
  receipt.systemSiteCatalog,
  receipt.detailDiversityCore,
  receipt.regionalThemeExpansion,
  receipt.regionalLegacyQualifier,
  receipt.systemSiteExpansion,
  receipt.radialLocationLoader,
  receipt.radialScanCompatibility,
  receipt.worldSeedBridge,
  receipt.worldScanOverlay,
  receipt.globalRescanBridge,
  receipt.globalRescanPackageFactory,
  receipt.globalRescanIngestion,
  receipt.globalRescanValidator,
  receipt.systemSiteValidator,
  receipt.contextAwareCore,
  receipt.contextOutputNormalizer,
  receipt.contextAwareBrowserBridge,
  receipt.contextAwareServerEnricher,
  receipt.detailDiversityValidator,
  ...receipt.coreDataFiles
]) if (!governedPath || !fs.existsSync(governedPath)) throw new Error(`Governed path is missing: ${governedPath}`);

console.log(JSON.stringify({
  embeddedWorlds: Object.keys(generated.worlds || {}).length,
  influenceSpheres: influence.sphereVocabulary,
  effectiveLocationVariants: config.contextAwareGeneration.effectiveLocationVariants,
  regionalThemeVersion: receipt.regionalThemeGeneration.version,
  regionalLegacyQualifierVersion: receipt.regionalThemeGeneration.legacyQualifierVersion,
  regionalThemeVariantsPerCatalog: receipt.regionalThemeGeneration.minimumVariantsPerCatalog,
  regionalManifestationChannels: receipt.regionalThemeGeneration.manifestationChannels,
  systemSiteAuthoredEntries: receipt.systemSiteGeneration.authoredEntries,
  systemSiteCombinationFloor: receipt.systemSiteGeneration.minimumDedicatedLineStructuralCombinations,
  globalGeneratorVersion: receipt.unifiedCatalogGeneration.globalIngestion.generatorVersion,
  productionWorkflowUsesV4: true
}, null, 2));
