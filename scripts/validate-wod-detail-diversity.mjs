import fs from 'node:fs';
import diversityCore from '../world-of-darkness-detail-diversity-core.js';

const config = JSON.parse(fs.readFileSync('data/world-of-darkness/spatial-engine-config.json', 'utf8'));
const detail = JSON.parse(fs.readFileSync(config.coreData.detailDiversity, 'utf8'));
const baseLocations = JSON.parse(fs.readFileSync(config.coreData.locations, 'utf8'));
const contextExpansion = JSON.parse(fs.readFileSync(config.coreData.contextExpansion, 'utf8'));

if (config.schemaVersion !== '2.6.0') throw new Error('Spatial config must use schemaVersion 2.6.0.');
if (detail.schemaVersion !== '1.0.0') throw new Error('Detail diversity schema must use version 1.0.0.');
if (detail.neighborhoodCellDegrees !== 0.015) throw new Error('Neighborhood diversity cell changed unexpectedly.');

const pools = detail.pools || {};
const expectedMinimums = {
  publicFacadeOpeners: 16,
  facadeDetails: 24,
  operationalPressures: 24,
  mechanicalComplications: 24,
  tenures: 12,
  aestheticProfiles: 24,
  behavioralTells: 24,
  temporalObjects: 24,
  anchorBehaviors: 12,
  traumaEvents: 24,
  secretOperations: 24,
  vulnerabilities: 24,
  sensoryConditions: 24,
  sensoryConsequences: 24,
  mediaSources: 16,
  mediaEvents: 24,
  mediaInstructions: 16,
  rumorSources: 16,
  rumorClaims: 24,
  rumorConsequences: 16
};
for (const [pool, minimum] of Object.entries(expectedMinimums)) {
  if (!Array.isArray(pools[pool]) || pools[pool].length < minimum) {
    throw new Error(`${pool} must contain at least ${minimum} entries.`);
  }
}
for (const status of ['MUNDANE', 'TANGENTIAL', 'ACTIVE_UNREGISTERED', 'INVENTORIED']) {
  if (!Array.isArray(pools.statusManifestations?.[status]) || pools.statusManifestations[status].length < 12) {
    throw new Error(`${status} needs at least 12 manifestations.`);
  }
}
for (const line of ['unified', 'vampire', 'werewolf', 'breeds', 'hunter', 'changeling', 'mage']) {
  if (!Array.isArray(pools.regionalThemes?.[line]) || pools.regionalThemes[line].length < 6) throw new Error(`${line} lacks regional themes.`);
  if (!Array.isArray(pools.characterAlignments?.[line]) || pools.characterAlignments[line].length < 12) throw new Error(`${line} lacks character alignments.`);
  if (!Array.isArray(pools.lineManifestations?.[line]) || pools.lineManifestations[line].length < 8) throw new Error(`${line} lacks manifestations.`);
}

const session = diversityCore.createSession(detail);
const records = [];
for (let index = 0; index < 24; index += 1) {
  const lat = 47.604 + (index % 6) * 0.0004;
  const lng = -122.329 + Math.floor(index / 6) * 0.0004;
  const location = {
    entryKey: `gmaps-seattle-fitness-${String(index).padStart(2, '0')}`,
    osmId: String(900000 + index),
    name: `Seattle Fitness Test ${index + 1}`,
    address: `${500 + index} 9th Avenue, Seattle, WA 98104`,
    lat,
    lng,
    category: 'fitness',
    categoryLabel: 'Fitness / Gym',
    featureLabel: 'Fitness Centre',
    sourceTags: { leisure: 'fitness_centre', building: 'commercial' }
  };
  records.push(session.generate({
    location,
    line: 'unified',
    inventoryStatus: 'ACTIVE_UNREGISTERED',
    seed: diversityCore.hash32(location.entryKey),
    baseLocations,
    contextExpansion
  }));
}

const themes = new Set(records.map(record => record.regionalTheme.id));
if (themes.size !== 1) throw new Error(`Nearby Seattle records should share one regional theme; found ${themes.size}.`);

const exactUnique = ['publicFacade', 'embeddedCharacter', 'temporalAnchor', 'traumaticCatalyst', 'operationalSecret', 'vulnerability', 'sensoryAnchor', 'mediaFeed', 'rumor', 'mechanicalSeed', 'diversitySignature'];
for (const field of exactUnique) {
  const unique = new Set(records.map(record => record[field]));
  if (unique.size !== records.length) throw new Error(`${field} repeated inside the 24-location Seattle sample (${unique.size}/${records.length} unique).`);
}
const hiddenUnique = new Set(records.map(record => record.hiddenFunction)).size;
if (hiddenUnique < 20) throw new Error(`Hidden functions are insufficiently diverse (${hiddenUnique}/24 unique).`);

const secondSession = diversityCore.createSession(detail);
const replay = records.map((_, index) => {
  const lat = 47.604 + (index % 6) * 0.0004;
  const lng = -122.329 + Math.floor(index / 6) * 0.0004;
  const location = {
    entryKey: `gmaps-seattle-fitness-${String(index).padStart(2, '0')}`,
    osmId: String(900000 + index),
    name: `Seattle Fitness Test ${index + 1}`,
    address: `${500 + index} 9th Avenue, Seattle, WA 98104`,
    lat,
    lng,
    category: 'fitness',
    categoryLabel: 'Fitness / Gym',
    featureLabel: 'Fitness Centre',
    sourceTags: { leisure: 'fitness_centre', building: 'commercial' }
  };
  return secondSession.generate({
    location,
    line: 'unified',
    inventoryStatus: 'ACTIVE_UNREGISTERED',
    seed: diversityCore.hash32(location.entryKey),
    baseLocations,
    contextExpansion
  });
});
for (let index = 0; index < records.length; index += 1) {
  if (records[index].diversitySignature !== replay[index].diversitySignature) throw new Error(`Deterministic replay failed at record ${index}.`);
}

console.log(JSON.stringify({
  sampleSize: records.length,
  sharedRegionalTheme: records[0].regionalTheme,
  exactUniqueFields: exactUnique,
  hiddenFunctionUniqueCount: hiddenUnique,
  publicFacadeCombinations: config.contextAwareGeneration.detailDiversity.minimumPublicFacadeCombinations,
  sensoryCombinations: config.contextAwareGeneration.detailDiversity.minimumSensoryCombinations,
  mediaCombinations: config.contextAwareGeneration.detailDiversity.minimumMediaCombinations,
  rumorCombinations: config.contextAwareGeneration.detailDiversity.minimumRumorCombinations,
  characterPresentationsPerLine: config.contextAwareGeneration.detailDiversity.minimumCharacterPresentationCombinationsPerGameLine,
  deterministicReplay: true
}, null, 2));
