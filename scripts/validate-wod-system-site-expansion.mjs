import fs from 'node:fs';
import diversityCore from '../world-of-darkness-detail-diversity-core.js';
import systemSiteCatalog from '../world-of-darkness-system-site-catalog.js';
import systemSiteExpansion from '../world-of-darkness-system-site-expansion.js';

const config = JSON.parse(fs.readFileSync('data/world-of-darkness/spatial-engine-config.json', 'utf8'));
const detail = JSON.parse(fs.readFileSync(config.coreData.detailDiversity, 'utf8'));
const baseLocations = JSON.parse(fs.readFileSync(config.coreData.locations, 'utf8'));
const contextExpansion = JSON.parse(fs.readFileSync(config.coreData.contextExpansion, 'utf8'));
const expandedCore = systemSiteExpansion.enhanceCore(diversityCore, systemSiteCatalog);

const lines = ['unified', 'vampire', 'werewolf', 'breeds', 'hunter', 'changeling', 'mage'];
const fields = ['siteTypes', 'hiddenFunctions', 'infrastructures', 'systemSecrets', 'custodians', 'evidencePatterns', 'conflicts', 'consequences'];
const profileFields = ['siteType', 'hiddenFunction', 'infrastructure', 'operationalSecret', 'custodian', 'evidencePattern', 'localConflict', 'failureConsequence'];
const categories = [
  ['restaurant', 'Food / Restaurant', 'Food Venue', { amenity: 'restaurant' }],
  ['bar', 'Bar / Pub', 'Nightlife Venue', { amenity: 'bar' }],
  ['hospital', 'Healthcare', 'Healthcare Site', { amenity: 'hospital' }],
  ['office', 'Office', 'Office', { office: 'company' }],
  ['industrial', 'Craft / Industrial', 'Industrial Site', { landuse: 'industrial' }],
  ['park', 'Park / Green Space', 'Park or Green Space', { leisure: 'park' }],
  ['historic', 'Historic Site', 'Historic Site', { historic: 'building' }],
  ['transit_station', 'Transit', 'Transit Feature', { public_transport: 'station' }],
  ['church', 'Religious Site', 'Religious Site', { amenity: 'place_of_worship' }],
  ['store', 'Retail', 'Retail Location', { shop: 'convenience' }],
  ['lodging', 'Lodging', 'Lodging', { tourism: 'hotel' }],
  ['natural_feature', 'Natural Feature', 'Natural or Water Feature', { natural: 'wood' }]
];

if (systemSiteCatalog.schemaVersion !== '1.0.0') throw new Error('System site catalog must use schemaVersion 1.0.0.');
if (systemSiteExpansion.version !== '1.0.0') throw new Error('System site expansion must use version 1.0.0.');
if (expandedCore.__systemSiteExpansionVersion !== '1.0.0') throw new Error('Detail diversity core was not enhanced with system site expansion.');
if (JSON.stringify([...systemSiteCatalog.fields]) !== JSON.stringify(fields)) throw new Error('System site catalog dimensions changed unexpectedly.');

let authoredEntryCount = 0;
const combinationFloors = {};
for (const line of lines) {
  const catalog = systemSiteCatalog.lines[line];
  if (!catalog) throw new Error(`System site catalog is missing ${line}.`);
  for (const field of fields) {
    const minimum = field === 'siteTypes' ? 12 : 10;
    if (!Array.isArray(catalog[field]) || catalog[field].length < minimum) {
      throw new Error(`${line}.${field} must contain at least ${minimum} entries.`);
    }
    const ids = new Set(catalog[field].map(entry => entry.id));
    if (ids.size !== catalog[field].length) throw new Error(`${line}.${field} contains duplicate IDs.`);
    for (const entry of catalog[field]) {
      if (!entry.id || !entry.label || !entry.text) throw new Error(`${line}.${field} contains an incomplete entry.`);
      if (!Array.isArray(entry.statuses) || !entry.statuses.includes('TANGENTIAL') || !entry.statuses.includes('ACTIVE_UNREGISTERED') || !entry.statuses.includes('INVENTORIED')) {
        throw new Error(`${line}.${field}.${entry.id} does not support all supernatural inventory states.`);
      }
    }
    authoredEntryCount += catalog[field].length;
  }
  combinationFloors[line] = catalog.siteTypes.length
    * catalog.hiddenFunctions.length
    * catalog.infrastructures.length
    * catalog.systemSecrets.length
    * catalog.custodians.length
    * catalog.evidencePatterns.length
    * catalog.conflicts.length
    * catalog.consequences.length;
  if (combinationFloors[line] < 120000000) throw new Error(`${line} has fewer than 120,000,000 structural combinations.`);
}
if (authoredEntryCount < 574) throw new Error(`System site catalog has only ${authoredEntryCount} authored entries.`);

function location(index, line, world = 'wodworld-77777777') {
  const [category, categoryLabel, featureLabel, sourceTags] = categories[index % categories.length];
  return {
    entryKey: `${world}|gmaps-${(0x20000000 + index).toString(16)}`,
    osmId: String(920000 + index),
    name: `${line} System Site ${index + 1}`,
    address: `${800 + index} Chronicle Avenue`,
    lat: 47.6101 + (index % 6) * 0.0003,
    lng: -122.3311 + Math.floor(index / 6) * 0.0003,
    category,
    categoryLabel,
    featureLabel,
    sourceTags
  };
}

function generateLine(line) {
  const session = expandedCore.createSession(detail);
  return Array.from({ length: 24 }, (_, index) => {
    const inputLocation = location(index, line);
    return session.generate({
      location: inputLocation,
      line,
      inventoryStatus: 'ACTIVE_UNREGISTERED',
      seed: expandedCore.hash32(`${inputLocation.entryKey}|${line}`),
      baseLocations,
      contextExpansion
    });
  });
}

const metrics = {};
for (const line of lines) {
  const records = generateLine(line);
  const firstTwelve = records.slice(0, 12);
  const firstTen = records.slice(0, 10);
  if (new Set(firstTwelve.map(record => record.siteProfile?.siteType?.id)).size !== 12) {
    throw new Error(`${line} repeated a site archetype before twelve nearby supernatural sites were generated.`);
  }
  for (const field of profileFields.slice(1)) {
    if (new Set(firstTen.map(record => record.siteProfile?.[field]?.id)).size !== 10) {
      throw new Error(`${line} repeated ${field} before ten nearby supernatural sites were generated.`);
    }
  }
  for (const record of records) {
    if (!record.siteProfile || record.siteProfile.schemaVersion !== '1.0.0') throw new Error(`${line} record lacks a system site profile.`);
    for (const field of profileFields) {
      if (!record.siteProfile[field]?.id || !record.siteProfile[field]?.label || !record.siteProfile[field]?.text) {
        throw new Error(`${line} record lacks complete ${field} data.`);
      }
    }
    if (record.regionalTheme?.siteProfile?.combinationSignature !== record.siteProfile.combinationSignature) {
      throw new Error(`${line} record does not persist the site profile inside its regional theme snapshot.`);
    }
    if (!record.hiddenFunction.includes(record.siteProfile.siteType.label)
      || !record.hiddenFunction.includes(record.siteProfile.hiddenFunction.label)
      || !record.hiddenFunction.includes(record.siteProfile.infrastructure.label)) {
      throw new Error(`${line} record does not expose site type, hidden function, and infrastructure in its hidden-function text.`);
    }
    if (!record.operationalSecret.includes(record.siteProfile.operationalSecret.label)) throw new Error(`${line} record does not expose its system secret.`);
    if (!record.embeddedCharacter.includes(record.siteProfile.custodian.label)) throw new Error(`${line} record does not expose its custodian type.`);
    if (!record.contextEffect.includes(record.siteProfile.evidencePattern.label)) throw new Error(`${line} record does not expose its evidence pattern.`);
    if (!record.vulnerability.includes(record.siteProfile.localConflict.label)) throw new Error(`${line} record does not expose its local conflict.`);
    if (!record.mechanicalSeed.includes(record.siteProfile.failureConsequence.label)) throw new Error(`${line} record does not expose its failure consequence.`);
  }

  const replay = generateLine(line);
  for (let index = 0; index < records.length; index += 1) {
    if (records[index].siteProfile.combinationSignature !== replay[index].siteProfile.combinationSignature) {
      throw new Error(`${line} system site replay failed at ${index}.`);
    }
    if (records[index].diversitySignature !== replay[index].diversitySignature) {
      throw new Error(`${line} diversity replay failed at ${index}.`);
    }
  }

  metrics[line] = {
    structuralCombinationFloor: combinationFloors[line],
    firstTwelveUniqueSiteTypes: new Set(firstTwelve.map(record => record.siteProfile.siteType.id)).size,
    firstTenUniqueHiddenFunctions: new Set(firstTen.map(record => record.siteProfile.hiddenFunction.id)).size,
    firstTenUniqueInfrastructure: new Set(firstTen.map(record => record.siteProfile.infrastructure.id)).size,
    firstTenUniqueSecrets: new Set(firstTen.map(record => record.siteProfile.operationalSecret.id)).size,
    firstTenUniqueCustodians: new Set(firstTen.map(record => record.siteProfile.custodian.id)).size,
    firstTenUniqueEvidencePatterns: new Set(firstTen.map(record => record.siteProfile.evidencePattern.id)).size,
    firstTenUniqueConflicts: new Set(firstTen.map(record => record.siteProfile.localConflict.id)).size,
    firstTenUniqueConsequences: new Set(firstTen.map(record => record.siteProfile.failureConsequence.id)).size,
    deterministicReplay: true
  };
}

const mundaneSession = expandedCore.createSession(detail);
const mundaneLocation = location(90, 'vampire');
const mundane = mundaneSession.generate({
  location: mundaneLocation,
  line: 'vampire',
  inventoryStatus: 'MUNDANE',
  seed: expandedCore.hash32(mundaneLocation.entryKey),
  baseLocations,
  contextExpansion
});
if (mundane.siteProfile !== null) throw new Error('Mundane locations must not receive supernatural site profiles.');
if (!mundane.hiddenFunction.startsWith('No confirmed supernatural function')) throw new Error('Mundane hidden-function disclaimer was lost.');

console.log(JSON.stringify({
  catalogVersion: systemSiteCatalog.schemaVersion,
  expansionVersion: systemSiteExpansion.version,
  authoredEntryCount,
  dimensions: fields,
  minimumDedicatedLineStructuralCombinations: Math.min(...Object.values(combinationFloors)),
  metrics,
  mundaneSitesRemainMundane: true
}, null, 2));
