import fs from 'node:fs';
import diversityCore from '../world-of-darkness-detail-diversity-core.js';
import regionalThemeExpansion from '../world-of-darkness-regional-theme-expansion.js';

const expandedCore = regionalThemeExpansion.enhanceCore(diversityCore);
const config = JSON.parse(fs.readFileSync('data/world-of-darkness/spatial-engine-config.json', 'utf8'));
const detail = JSON.parse(fs.readFileSync(config.coreData.detailDiversity, 'utf8'));
const baseLocations = JSON.parse(fs.readFileSync(config.coreData.locations, 'utf8'));
const contextExpansion = JSON.parse(fs.readFileSync(config.coreData.contextExpansion, 'utf8'));

if (config.schemaVersion !== '2.6.0') throw new Error('Spatial config must use schemaVersion 2.6.0.');
if (detail.schemaVersion !== '1.0.0') throw new Error('Detail diversity schema must use version 1.0.0.');
if (detail.neighborhoodCellDegrees !== 0.015) throw new Error('Neighborhood diversity cell changed unexpectedly.');
if (regionalThemeExpansion.version !== '3.1.0' || expandedCore.__regionalThemeExpansionVersion !== '3.1.0') {
  throw new Error('Regional theme expansion 3.1.0 is not active.');
}

const expectedStandardProfile = [12, 6, 2, 1];
const expectedUnifiedProfile = [5, 8, 5, 3];
if (JSON.stringify(expandedCore.statusProfile('vampire')) !== JSON.stringify(expectedStandardProfile)) throw new Error('Single-catalog density profile changed unexpectedly.');
if (JSON.stringify(expandedCore.statusProfile('unified')) !== JSON.stringify(expectedUnifiedProfile)) throw new Error('Unified density profile changed unexpectedly.');

function countStatuses(line) {
  const counts = { MUNDANE: 0, TANGENTIAL: 0, ACTIVE_UNREGISTERED: 0, INVENTORIED: 0 };
  for (let seed = 0; seed < 21; seed += 1) counts[expandedCore.inventoryStatusFromSeed(seed, line)] += 1;
  return counts;
}

const standardCounts = countStatuses('vampire');
const unifiedCounts = countStatuses('unified');
if (JSON.stringify(Object.values(standardCounts)) !== JSON.stringify(expectedStandardProfile)) throw new Error(`Single-catalog status distribution is invalid: ${JSON.stringify(standardCounts)}.`);
if (JSON.stringify(Object.values(unifiedCounts)) !== JSON.stringify(expectedUnifiedProfile)) throw new Error(`Unified status distribution is invalid: ${JSON.stringify(unifiedCounts)}.`);
if (config.contextAwareGeneration?.lineDensityProfiles?.unified?.supernaturalOrAdjacentPercent !== 76.19) throw new Error('Unified supernatural-or-adjacent percentage must remain 76.19%.');
if (config.contextAwareGeneration?.lineDensityProfiles?.singleCatalog?.supernaturalOrAdjacentPercent !== 42.86) throw new Error('Single-catalog supernatural-or-adjacent percentage must remain 42.86%.');

const expectedCatalogs = ['vampire', 'werewolf', 'breeds', 'hunter', 'changeling', 'mage'];
if (JSON.stringify([...expandedCore.catalogLines]) !== JSON.stringify(expectedCatalogs)) throw new Error('Unified catalog list is incomplete.');
if (JSON.stringify(config.contextAwareGeneration?.unifiedCatalogMode?.catalogs) !== JSON.stringify(expectedCatalogs)) throw new Error('Spatial configuration does not declare all six Unified catalogs.');
if (expandedCore.legacyThemeFrequencyDenominator !== 32) throw new Error('Legacy regional themes must remain limited to one result in 32 neighborhood selections.');
if (expandedCore.themeDistrictMultiplier !== 4) throw new Error('Regional theme families must remain stable across four neighborhood cells per district axis.');

const pools = detail.pools || {};
const expectedMinimums = {
  publicFacadeOpeners: 16, facadeDetails: 24, operationalPressures: 24, mechanicalComplications: 24,
  tenures: 12, aestheticProfiles: 24, behavioralTells: 24, temporalObjects: 24, anchorBehaviors: 12,
  traumaEvents: 24, secretOperations: 24, vulnerabilities: 24, sensoryConditions: 24,
  sensoryConsequences: 24, mediaSources: 16, mediaEvents: 24, mediaInstructions: 16,
  rumorSources: 16, rumorClaims: 24, rumorConsequences: 16
};
for (const [pool, minimum] of Object.entries(expectedMinimums)) {
  if (!Array.isArray(pools[pool]) || pools[pool].length < minimum) throw new Error(`${pool} must contain at least ${minimum} entries.`);
}
for (const status of ['MUNDANE', 'TANGENTIAL', 'ACTIVE_UNREGISTERED', 'INVENTORIED']) {
  if (!Array.isArray(pools.statusManifestations?.[status]) || pools.statusManifestations[status].length < 12) throw new Error(`${status} needs at least 12 manifestations.`);
}
for (const line of ['unified', ...expectedCatalogs]) {
  if (!Array.isArray(pools.regionalThemes?.[line]) || pools.regionalThemes[line].length < 6) throw new Error(`${line} lacks legacy regional themes.`);
  if (!Array.isArray(pools.characterAlignments?.[line]) || pools.characterAlignments[line].length < 12) throw new Error(`${line} lacks character alignments.`);
  if (!Array.isArray(pools.lineManifestations?.[line]) || pools.lineManifestations[line].length < 8) throw new Error(`${line} lacks manifestations.`);
  const variantCount = expandedCore.regionalThemeVariantCount(line, pools.regionalThemes[line].length);
  if (variantCount < 2300) throw new Error(`${line} must provide at least 2,300 regional theme variants; found ${variantCount}.`);
}

function themeLocation(index, options = {}) {
  const columns = Number(options.columns || 24);
  const spacing = Number(options.spacing || 0.021);
  const latBase = Number(options.latBase || 31.2);
  const lngBase = Number(options.lngBase || -121.4);
  return {
    entryKey: options.worldSeedKey ? `${options.worldSeedKey}|gmaps-theme-${String(index).padStart(4, '0')}` : `gmaps-theme-${String(index).padStart(4, '0')}`,
    osmId: String(7000000 + index),
    name: `Regional Theme Sample ${index + 1}`,
    address: `${index + 1} Theme Test Way`,
    lat: latBase + (index % columns) * spacing,
    lng: lngBase + Math.floor(index / columns) * spacing,
    category: 'other',
    categoryLabel: 'Other Named Location',
    featureLabel: 'Named Map Feature',
    sourceTags: { building: 'yes' }
  };
}

function sampleThemes(line, count, options = {}) {
  const session = expandedCore.createSession(detail);
  return Array.from({ length: count }, (_, index) => session.themeFor(themeLocation(index, options), line));
}

const themeMetrics = {};
for (const line of ['unified', ...expectedCatalogs]) {
  const sampled = sampleThemes(line, 384);
  const counts = new Map();
  for (const theme of sampled) counts.set(theme.id, (counts.get(theme.id) || 0) + 1);
  const unique = counts.size;
  const maximumRecurrence = Math.max(...counts.values());
  const legacyCount = sampled.filter(theme => theme.themeSource === 'legacy-rare').length;
  if (unique < 330) throw new Error(`${line} regional themes are repeating too often across separated areas (${unique}/384 unique).`);
  if (maximumRecurrence > 3) throw new Error(`${line} has an exact regional theme recurring ${maximumRecurrence} times in 384 separated areas.`);
  if (legacyCount > 24) throw new Error(`${line} legacy regional themes are appearing too frequently (${legacyCount}/384).`);
  if (sampled.some(theme => theme.themeVersion !== '3.1.0')) throw new Error(`${line} emitted a regional theme outside model 3.1.0.`);
  themeMetrics[line] = {
    variantCount: expandedCore.regionalThemeVariantCount(line, pools.regionalThemes[line].length),
    sampled: sampled.length,
    unique,
    maximumRecurrence,
    legacyCount
  };
}

const vampireThemes = sampleThemes('vampire', 768, { columns: 32, latBase: 34.1, lngBase: -116.8 });
const anarchNightRouteCount = vampireThemes.filter(theme => theme.id === 'anarch-night-route').length;
if (anarchNightRouteCount > 8) throw new Error(`Anarch Night Route is still too frequent (${anarchNightRouteCount}/768 separated Vampire areas).`);

let coherentDistrict = null;
for (let districtIndex = 0; districtIndex < 128 && !coherentDistrict; districtIndex += 1) {
  const latBase = 40 + districtIndex * 0.25;
  const lngBase = -100 - districtIndex * 0.25;
  const session = expandedCore.createSession(detail);
  const cells = [
    { lat: latBase + 0.002, lng: lngBase + 0.002 },
    { lat: latBase + 0.018, lng: lngBase + 0.002 },
    { lat: latBase + 0.002, lng: lngBase + 0.018 },
    { lat: latBase + 0.018, lng: lngBase + 0.018 }
  ].map((coordinates, index) => session.themeFor({
    ...themeLocation(index), entryKey: `gmaps-district-${districtIndex}-${index}`, lat: coordinates.lat, lng: coordinates.lng
  }, 'vampire'));
  if (cells.every(theme => theme.themeSource === 'compositional-product-space')) coherentDistrict = cells;
}
if (!coherentDistrict) throw new Error('Could not find a product-space district sample for regional coherence testing.');
if (new Set(coherentDistrict.map(theme => theme.familyId)).size !== 1) throw new Error('Nearby neighborhood cells inside one district lost their shared supernatural family.');
if (new Set(coherentDistrict.map(theme => theme.id)).size < 3) throw new Error('Nearby neighborhood cells are not varying their exact regional expression enough.');

const baselineWorldThemes = sampleThemes('unified', 96, { worldSeedKey: 'wodworld-11111111', columns: 16, latBase: 25.1, lngBase: -80.2 });
const alternateWorldThemes = sampleThemes('unified', 96, { worldSeedKey: 'wodworld-22222222', columns: 16, latBase: 25.1, lngBase: -80.2 });
const worldSpecificDifferences = baselineWorldThemes.filter((theme, index) => theme.id !== alternateWorldThemes[index].id).length;
if (worldSpecificDifferences < 80) throw new Error(`Regional themes are insufficiently world-seed-specific (${worldSpecificDifferences}/96 differ).`);

const session = expandedCore.createSession(detail);
const records = [];
for (let index = 0; index < 24; index += 1) {
  const lat = 47.604 + (index % 6) * 0.0004;
  const lng = -122.329 + Math.floor(index / 6) * 0.0004;
  const location = {
    entryKey: `gmaps-seattle-fitness-${String(index).padStart(2, '0')}`,
    osmId: String(900000 + index),
    name: `Seattle Fitness Test ${index + 1}`,
    address: `${500 + index} 9th Avenue, Seattle, WA 98104`,
    lat, lng,
    category: 'fitness', categoryLabel: 'Fitness / Gym', featureLabel: 'Fitness Centre',
    sourceTags: { leisure: 'fitness_centre', building: 'commercial' }
  };
  records.push(session.generate({
    location, line: 'unified', inventoryStatus: 'ACTIVE_UNREGISTERED',
    seed: expandedCore.hash32(location.entryKey), baseLocations, contextExpansion
  }));
}

const themes = new Set(records.map(record => record.regionalTheme.id));
if (themes.size !== 1) throw new Error(`Nearby Seattle records should share one regional theme; found ${themes.size}.`);
const observedCatalogs = new Set(records.map(record => record.catalogLine));
if (observedCatalogs.size !== expectedCatalogs.length || expectedCatalogs.some(line => !observedCatalogs.has(line))) throw new Error(`Unified sample did not include all six catalogs: ${JSON.stringify([...observedCatalogs])}.`);
if (new Set(records.slice(0, 6).map(record => record.catalogLine)).size !== 6) throw new Error('Unified catalog anti-repeat failed before all six catalogs were used.');
for (const record of records) {
  if (!record.catalogLabel || !record.hiddenFunction.includes(record.catalogLabel)) throw new Error(`Unified record ${record.diversitySignature} does not identify its catalog lens.`);
  if (record.regionalTheme?.catalogLine !== record.catalogLine || record.regionalTheme?.catalogLabel !== record.catalogLabel) throw new Error(`Unified record ${record.diversitySignature} does not persist catalog identity.`);
  if (record.regionalTheme?.themeVersion !== '3.1.0' || !record.regionalTheme?.variationCount) throw new Error(`Unified record ${record.diversitySignature} lacks regional theme 3.1 metadata.`);
}

const exactUnique = ['publicFacade', 'embeddedCharacter', 'temporalAnchor', 'traumaticCatalyst', 'operationalSecret', 'vulnerability', 'sensoryAnchor', 'mediaFeed', 'rumor', 'mechanicalSeed', 'diversitySignature'];
for (const field of exactUnique) {
  const unique = new Set(records.map(record => record[field]));
  if (unique.size !== records.length) throw new Error(`${field} repeated inside the 24-location Seattle sample (${unique.size}/${records.length} unique).`);
}
const hiddenUnique = new Set(records.map(record => record.hiddenFunction)).size;
if (hiddenUnique < 20) throw new Error(`Hidden functions are insufficiently diverse (${hiddenUnique}/24 unique).`);

const secondSession = expandedCore.createSession(detail);
const replay = records.map((_, index) => {
  const lat = 47.604 + (index % 6) * 0.0004;
  const lng = -122.329 + Math.floor(index / 6) * 0.0004;
  const location = {
    entryKey: `gmaps-seattle-fitness-${String(index).padStart(2, '0')}`,
    osmId: String(900000 + index),
    name: `Seattle Fitness Test ${index + 1}`,
    address: `${500 + index} 9th Avenue, Seattle, WA 98104`,
    lat, lng,
    category: 'fitness', categoryLabel: 'Fitness / Gym', featureLabel: 'Fitness Centre',
    sourceTags: { leisure: 'fitness_centre', building: 'commercial' }
  };
  return secondSession.generate({
    location, line: 'unified', inventoryStatus: 'ACTIVE_UNREGISTERED',
    seed: expandedCore.hash32(location.entryKey), baseLocations, contextExpansion
  });
});
for (let index = 0; index < records.length; index += 1) {
  if (records[index].diversitySignature !== replay[index].diversitySignature) throw new Error(`Deterministic replay failed at record ${index}.`);
  if (records[index].catalogLine !== replay[index].catalogLine) throw new Error(`Unified catalog replay failed at record ${index}.`);
  if (records[index].regionalTheme.id !== replay[index].regionalTheme.id) throw new Error(`Regional theme replay failed at record ${index}.`);
}

console.log(JSON.stringify({
  sampleSize: records.length,
  sharedRegionalTheme: records[0].regionalTheme,
  regionalThemeModel: {
    version: '3.1.0', compositionalVariantsPerCatalog: 2304,
    legacyFrequencyDenominator: expandedCore.legacyThemeFrequencyDenominator,
    districtMultiplier: expandedCore.themeDistrictMultiplier,
    metrics: themeMetrics,
    anarchNightRouteCount, anarchNightRouteSampleSize: vampireThemes.length,
    coherentDistrictFamily: coherentDistrict[0].familyId,
    coherentDistrictUniqueExpressions: new Set(coherentDistrict.map(theme => theme.id)).size,
    worldSpecificDifferences, worldSpecificSampleSize: baselineWorldThemes.length
  },
  unifiedStatusCounts: unifiedCounts,
  standardStatusCounts: standardCounts,
  unifiedSupernaturalOrAdjacentPercent: 76.19,
  singleCatalogSupernaturalOrAdjacentPercent: 42.86,
  unifiedCatalogsObserved: [...observedCatalogs].sort(),
  firstCatalogCycle: records.slice(0, 6).map(record => record.catalogLine),
  persistedCatalogIdentity: true,
  exactUniqueFields: exactUnique,
  hiddenFunctionUniqueCount: hiddenUnique,
  publicFacadeCombinations: config.contextAwareGeneration.detailDiversity.minimumPublicFacadeCombinations,
  sensoryCombinations: config.contextAwareGeneration.detailDiversity.minimumSensoryCombinations,
  mediaCombinations: config.contextAwareGeneration.detailDiversity.minimumMediaCombinations,
  rumorCombinations: config.contextAwareGeneration.detailDiversity.minimumRumorCombinations,
  characterPresentationsPerLine: config.contextAwareGeneration.detailDiversity.minimumCharacterPresentationCombinationsPerGameLine,
  deterministicReplay: true
}, null, 2));
