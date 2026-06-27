import fs from 'node:fs';
import diversityCore from '../world-of-darkness-detail-diversity-core.js';
import regionalThemeExpansion from '../world-of-darkness-regional-theme-expansion.js';
import regionalLegacyQualifier from '../world-of-darkness-regional-legacy-qualifier.js';

const regionalCore = regionalThemeExpansion.enhanceCore(diversityCore);
const expandedCore = regionalLegacyQualifier.enhanceCore(regionalCore);
const config = JSON.parse(fs.readFileSync('data/world-of-darkness/spatial-engine-config.json', 'utf8'));
const detail = JSON.parse(fs.readFileSync(config.coreData.detailDiversity, 'utf8'));
const baseLocations = JSON.parse(fs.readFileSync(config.coreData.locations, 'utf8'));
const contextExpansion = JSON.parse(fs.readFileSync(config.coreData.contextExpansion, 'utf8'));
const expectedCatalogs = ['vampire', 'werewolf', 'breeds', 'hunter', 'changeling', 'mage'];
const lines = ['unified', ...expectedCatalogs];

if (config.schemaVersion !== '2.6.0' || detail.schemaVersion !== '1.0.0') throw new Error('Spatial or detail schema version changed unexpectedly.');
if (regionalThemeExpansion.version !== '3.2.0' || regionalCore.__regionalThemeExpansionVersion !== '3.2.0') throw new Error('Regional theme expansion 3.2.0 is not active.');
if (regionalLegacyQualifier.version !== '1.0.0' || expandedCore.__regionalLegacyQualifierVersion !== '1.0.0') throw new Error('Regional legacy qualifier 1.0.0 is not active.');
if (expandedCore.regionalThemeManifestationChannels?.length !== 12) throw new Error('Regional theme expansion must expose twelve manifestation channels.');
if (expandedCore.legacyThemeFrequencyDenominator !== 32 || expandedCore.themeDistrictMultiplier !== 4) throw new Error('Regional legacy frequency or district size changed.');

const expectedStandardProfile = [12, 6, 2, 1];
const expectedUnifiedProfile = [5, 8, 5, 3];
if (JSON.stringify(expandedCore.statusProfile('vampire')) !== JSON.stringify(expectedStandardProfile)) throw new Error('Single-catalog density profile changed.');
if (JSON.stringify(expandedCore.statusProfile('unified')) !== JSON.stringify(expectedUnifiedProfile)) throw new Error('Unified density profile changed.');

function statusCounts(line) {
  const counts = { MUNDANE: 0, TANGENTIAL: 0, ACTIVE_UNREGISTERED: 0, INVENTORIED: 0 };
  for (let seed = 0; seed < 21; seed += 1) counts[expandedCore.inventoryStatusFromSeed(seed, line)] += 1;
  return counts;
}
const standardCounts = statusCounts('vampire');
const unifiedCounts = statusCounts('unified');
if (JSON.stringify(Object.values(standardCounts)) !== JSON.stringify(expectedStandardProfile)) throw new Error(`Single-catalog status distribution is invalid: ${JSON.stringify(standardCounts)}.`);
if (JSON.stringify(Object.values(unifiedCounts)) !== JSON.stringify(expectedUnifiedProfile)) throw new Error(`Unified status distribution is invalid: ${JSON.stringify(unifiedCounts)}.`);
if (config.contextAwareGeneration?.lineDensityProfiles?.unified?.supernaturalOrAdjacentPercent !== 76.19) throw new Error('Unified supernatural density changed.');
if (config.contextAwareGeneration?.lineDensityProfiles?.singleCatalog?.supernaturalOrAdjacentPercent !== 42.86) throw new Error('Single-catalog supernatural density changed.');
if (JSON.stringify([...expandedCore.catalogLines]) !== JSON.stringify(expectedCatalogs)) throw new Error('Unified catalog list is incomplete.');

const pools = detail.pools || {};
const poolMinimums = {
  publicFacadeOpeners: 16, facadeDetails: 24, operationalPressures: 24, mechanicalComplications: 24,
  tenures: 12, aestheticProfiles: 24, behavioralTells: 24, temporalObjects: 24, anchorBehaviors: 12,
  traumaEvents: 24, secretOperations: 24, vulnerabilities: 24, sensoryConditions: 24,
  sensoryConsequences: 24, mediaSources: 16, mediaEvents: 24, mediaInstructions: 16,
  rumorSources: 16, rumorClaims: 24, rumorConsequences: 16
};
for (const [pool, minimum] of Object.entries(poolMinimums)) {
  if (!Array.isArray(pools[pool]) || pools[pool].length < minimum) throw new Error(`${pool} must contain at least ${minimum} entries.`);
}
for (const status of ['MUNDANE', 'TANGENTIAL', 'ACTIVE_UNREGISTERED', 'INVENTORIED']) {
  if (!Array.isArray(pools.statusManifestations?.[status]) || pools.statusManifestations[status].length < 12) throw new Error(`${status} needs at least 12 manifestations.`);
}
for (const line of lines) {
  if (!Array.isArray(pools.regionalThemes?.[line]) || pools.regionalThemes[line].length < 6) throw new Error(`${line} lacks legacy regional themes.`);
  if (!Array.isArray(pools.characterAlignments?.[line]) || pools.characterAlignments[line].length < 12) throw new Error(`${line} lacks character alignments.`);
  if (!Array.isArray(pools.lineManifestations?.[line]) || pools.lineManifestations[line].length < 8) throw new Error(`${line} lacks manifestations.`);
  const variants = expandedCore.regionalThemeVariantCount(line, pools.regionalThemes[line].length);
  if (variants < 27648) throw new Error(`${line} must provide at least 27,648 regional theme variants; found ${variants}.`);
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
for (const line of lines) {
  const sampled = sampleThemes(line, 384);
  const counts = new Map();
  for (const theme of sampled) counts.set(theme.id, (counts.get(theme.id) || 0) + 1);
  const unique = counts.size;
  const maximumRecurrence = Math.max(...counts.values());
  const legacyCount = sampled.filter(theme => String(theme.themeSource).startsWith('legacy-rare')).length;
  const qualifiedLegacyCount = sampled.filter(theme => theme.themeSource === 'legacy-rare-qualified').length;
  if (unique < 330) throw new Error(`${line} regional themes are repeating too often across separated areas (${unique}/384 unique).`);
  if (maximumRecurrence > 3) throw new Error(`${line} has an exact regional theme recurring ${maximumRecurrence} times in 384 separated areas.`);
  if (legacyCount > 24) throw new Error(`${line} legacy regional themes are appearing too frequently (${legacyCount}/384).`);
  if (legacyCount !== qualifiedLegacyCount) throw new Error(`${line} emitted an unqualified legacy regional theme.`);
  if (sampled.some(theme => theme.themeVersion !== '3.2.0')) throw new Error(`${line} emitted a regional theme outside model 3.2.0.`);
  themeMetrics[line] = {
    variantCount: expandedCore.regionalThemeVariantCount(line, pools.regionalThemes[line].length),
    sampled: sampled.length,
    unique,
    maximumRecurrence,
    legacyCount,
    qualifiedLegacyCount
  };
}

const vampireThemes = sampleThemes('vampire', 768, { columns: 32, latBase: 34.1, lngBase: -116.8 });
const anarchNightRouteCount = vampireThemes.filter(theme => theme.legacyBaseId === 'anarch-night-route').length;
const anarchVisibleExpressions = new Set(vampireThemes.filter(theme => theme.legacyBaseId === 'anarch-night-route').map(theme => theme.id)).size;
if (anarchNightRouteCount > 8) throw new Error(`Anarch Night Route family is still too frequent (${anarchNightRouteCount}/768 separated Vampire areas).`);
if (anarchNightRouteCount > 1 && anarchVisibleExpressions < 2) throw new Error('Repeated Anarch Night Route family results are not visibly qualified by different channels.');

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
    ...themeLocation(index),
    entryKey: `gmaps-district-${districtIndex}-${index}`,
    lat: coordinates.lat,
    lng: coordinates.lng
  }, 'vampire'));
  if (cells.every(theme => theme.themeSource === 'compositional-product-space')) coherentDistrict = cells;
}
if (!coherentDistrict) throw new Error('Could not find a product-space district sample for coherence testing.');
if (new Set(coherentDistrict.map(theme => theme.familyId)).size !== 1) throw new Error('Nearby neighborhood cells lost their shared supernatural family.');
if (new Set(coherentDistrict.map(theme => theme.id)).size < 3) throw new Error('Nearby neighborhood cells are not varying their exact regional expression enough.');

const baselineWorldThemes = sampleThemes('unified', 96, { worldSeedKey: 'wodworld-11111111', columns: 16, latBase: 25.1, lngBase: -80.2 });
const alternateWorldThemes = sampleThemes('unified', 96, { worldSeedKey: 'wodworld-22222222', columns: 16, latBase: 25.1, lngBase: -80.2 });
const worldSpecificDifferences = baselineWorldThemes.filter((theme, index) => theme.id !== alternateWorldThemes[index].id).length;
if (worldSpecificDifferences < 80) throw new Error(`Regional themes are insufficiently world-seed-specific (${worldSpecificDifferences}/96 differ).`);

function seattleLocation(index) {
  return {
    entryKey: `gmaps-seattle-fitness-${String(index).padStart(2, '0')}`,
    osmId: String(900000 + index),
    name: `Seattle Fitness Test ${index + 1}`,
    address: `${500 + index} 9th Avenue, Seattle, WA 98104`,
    lat: 47.604 + (index % 6) * 0.0004,
    lng: -122.329 + Math.floor(index / 6) * 0.0004,
    category: 'fitness',
    categoryLabel: 'Fitness / Gym',
    featureLabel: 'Fitness Centre',
    sourceTags: { leisure: 'fitness_centre', building: 'commercial' }
  };
}

function generateSeattle() {
  const session = expandedCore.createSession(detail);
  return Array.from({ length: 24 }, (_, index) => {
    const location = seattleLocation(index);
    return session.generate({
      location,
      line: 'unified',
      inventoryStatus: 'ACTIVE_UNREGISTERED',
      seed: expandedCore.hash32(location.entryKey),
      baseLocations,
      contextExpansion
    });
  });
}

const records = generateSeattle();
if (new Set(records.map(record => record.regionalTheme.id)).size !== 1) throw new Error('Nearby Seattle records must share one exact regional theme.');
if (new Set(records.slice(0, 6).map(record => record.catalogLine)).size !== 6) throw new Error('Unified catalog rotation repeated before all six catalogs were used.');
for (const record of records) {
  if (!record.catalogLabel || !record.hiddenFunction.includes(record.catalogLabel)) throw new Error(`Unified record ${record.diversitySignature} does not identify its catalog lens.`);
  if (record.regionalTheme?.catalogLine !== record.catalogLine || record.regionalTheme?.catalogLabel !== record.catalogLabel) throw new Error(`Unified record ${record.diversitySignature} does not persist catalog identity.`);
  if (record.regionalTheme?.themeVersion !== '3.2.0' || !record.regionalTheme?.manifestationChannelId) throw new Error(`Unified record ${record.diversitySignature} lacks regional theme 3.2 metadata.`);
}

const exactUnique = ['publicFacade', 'embeddedCharacter', 'temporalAnchor', 'traumaticCatalyst', 'operationalSecret', 'vulnerability', 'sensoryAnchor', 'mediaFeed', 'rumor', 'mechanicalSeed', 'diversitySignature'];
for (const field of exactUnique) {
  const unique = new Set(records.map(record => record[field]));
  if (unique.size !== records.length) throw new Error(`${field} repeated inside the 24-location Seattle sample (${unique.size}/${records.length} unique).`);
}
const hiddenUnique = new Set(records.map(record => record.hiddenFunction)).size;
if (hiddenUnique < 20) throw new Error(`Hidden functions are insufficiently diverse (${hiddenUnique}/24 unique).`);

const replay = generateSeattle();
for (let index = 0; index < records.length; index += 1) {
  if (records[index].diversitySignature !== replay[index].diversitySignature) throw new Error(`Deterministic replay failed at record ${index}.`);
  if (records[index].catalogLine !== replay[index].catalogLine) throw new Error(`Unified catalog replay failed at record ${index}.`);
  if (records[index].regionalTheme.id !== replay[index].regionalTheme.id) throw new Error(`Regional theme replay failed at record ${index}.`);
}

console.log(JSON.stringify({
  sampleSize: records.length,
  sharedRegionalTheme: records[0].regionalTheme,
  regionalThemeModel: {
    version: '3.2.0',
    legacyQualifierVersion: regionalLegacyQualifier.version,
    compositionalVariantsPerCatalog: 27648,
    manifestationChannels: expandedCore.regionalThemeManifestationChannels.length,
    legacyFrequencyDenominator: expandedCore.legacyThemeFrequencyDenominator,
    metrics: themeMetrics,
    anarchNightRouteFamilyCount: anarchNightRouteCount,
    anarchNightRouteVisibleExpressions: anarchVisibleExpressions,
    coherentDistrictFamily: coherentDistrict[0].familyId,
    coherentDistrictUniqueExpressions: new Set(coherentDistrict.map(theme => theme.id)).size,
    worldSpecificDifferences
  },
  unifiedStatusCounts: unifiedCounts,
  standardStatusCounts: standardCounts,
  unifiedCatalogsObserved: [...new Set(records.map(record => record.catalogLine))].sort(),
  exactUniqueFields: exactUnique,
  hiddenFunctionUniqueCount: hiddenUnique,
  deterministicReplay: true
}, null, 2));
