import fs from 'node:fs';
import { createWorldScanPackageFactory } from './wod-world-scan-package-factory.mjs';

const config = JSON.parse(fs.readFileSync('data/world-of-darkness/spatial-engine-config.json', 'utf8'));
const baseLocations = JSON.parse(fs.readFileSync(config.coreData.locations, 'utf8'));
const contextExpansion = JSON.parse(fs.readFileSync(config.coreData.contextExpansion, 'utf8'));
const detailDiversity = JSON.parse(fs.readFileSync(config.coreData.detailDiversity, 'utf8'));
const baseCrosslinks = JSON.parse(fs.readFileSync(config.coreData.crosslinks, 'utf8'));
const crosslinkExpansion = JSON.parse(fs.readFileSync(config.coreData.crosslinkExpansion, 'utf8'));
const ingestionSource = fs.readFileSync('scripts/ingest-wod-world-scan-rescan-v4.mjs', 'utf8');
const workflowSource = fs.readFileSync('.github/workflows/ingest-wod-world-scan-batch.yml', 'utf8');

const worldSeed = {
  worldSeedKey: 'wodworld-1234abcd',
  label: 'Unified Global Rescan Validation',
  seedValue: 'unified-global-rescan-validation-seed',
  createdAt: '2026-06-27T00:00:00.000Z'
};
const generatedAt = '2026-06-27T01:00:00.000Z';
const expectedCatalogs = ['vampire', 'werewolf', 'breeds', 'hunter', 'changeling', 'mage'];

function location(index) {
  const categories = [
    ['fitness', 'Fitness / Gym', 'Fitness Centre', { leisure: 'fitness_centre' }],
    ['restaurant', 'Food / Restaurant', 'Food Venue', { amenity: 'restaurant' }],
    ['hospital', 'Healthcare', 'Healthcare Site', { amenity: 'hospital' }],
    ['office', 'Office', 'Office', { office: 'company' }],
    ['park', 'Park / Green Space', 'Park or Green Space', { leisure: 'park' }],
    ['historic', 'Historic Site', 'Historic Site', { historic: 'building' }]
  ];
  const [category, categoryLabel, featureLabel, sourceTags] = categories[index % categories.length];
  return {
    locationKey: `gmaps-${(0x10000000 + index).toString(16)}`,
    name: `Unified Server Location ${index + 1}`,
    address: `${500 + index} 9th Avenue, Seattle, WA 98104`,
    referenceUrl: `https://www.openstreetmap.org/node/${910000 + index}`,
    category,
    categoryLabel,
    coordinates: {
      lat: 47.604 + (index % 6) * 0.0004,
      lng: -122.329 + Math.floor(index / 6) * 0.0004
    },
    osmType: 'node',
    osmId: String(910000 + index),
    featureLabel,
    sourceTags,
    scanKey: 'wodscan-1234abcd',
    scanZoom: 17,
    scanBounds: { south: 47.60, west: -122.34, north: 47.62, east: -122.31 },
    scanCenter: { lat: 47.61, lng: -122.325 }
  };
}

function factory(gameLine) {
  return createWorldScanPackageFactory({
    worldSeed,
    gameLine,
    generatedAt,
    baseLocations,
    contextExpansion,
    detailDiversity,
    baseCrosslinks,
    crosslinkExpansion
  });
}

const unifiedFactory = factory('unified');
if (JSON.stringify(unifiedFactory.statusProfile) !== JSON.stringify([5, 8, 5, 3])) throw new Error('Unified server status profile changed.');
if (unifiedFactory.regionalThemeVersion !== '3.2.0') throw new Error('Unified server factory lacks regional theme version 3.2.0.');
if (unifiedFactory.systemSiteCatalogVersion !== '1.0.0') throw new Error('Unified server factory lacks system site catalog version 1.0.0.');

const packages = Array.from({ length: 24 }, (_, index) => unifiedFactory.generate(location(index)));
const catalogLines = packages.map(pkg => pkg.location.contextSnapshot.catalogLine);
if (new Set(catalogLines).size !== 6 || expectedCatalogs.some(line => !catalogLines.includes(line))) throw new Error('Unified packages did not cover all six catalogs.');
if (new Set(catalogLines.slice(0, 6)).size !== 6) throw new Error('Unified catalog rotation repeated before all six catalogs were used.');

const supernaturalPackages = [];
const mundanePackages = [];
for (const pkg of packages) {
  if (pkg.schemaVersion !== '2.1.0' || !/^wodpkg-[0-9a-f]{8}$/.test(pkg.packageKey)) throw new Error(`Invalid package identity ${pkg.packageKey}.`);
  const snapshot = pkg.location.contextSnapshot;
  if (!expectedCatalogs.includes(snapshot.catalogLine) || !snapshot.catalogLabel) throw new Error(`${pkg.packageKey} lacks catalog identity.`);
  if (snapshot.regionalTheme?.themeVersion !== '3.2.0' || !snapshot.regionalTheme?.manifestationChannelId) throw new Error(`${pkg.packageKey} lacks regional theme 3.2.0.`);
  if (snapshot.regionalTheme.catalogLine !== snapshot.catalogLine) throw new Error(`${pkg.packageKey} does not persist catalog identity in its theme.`);

  if (pkg.location.inventoryStatus === 'MUNDANE') {
    mundanePackages.push(pkg);
    if (!snapshot.hiddenFunction.includes('No confirmed supernatural function') || snapshot.siteProfile !== null) throw new Error(`${pkg.packageKey} assigned supernatural structure to a mundane site.`);
  } else {
    supernaturalPackages.push(pkg);
    if (!snapshot.siteProfile || snapshot.siteProfile.schemaVersion !== '1.0.0') throw new Error(`${pkg.packageKey} lacks a system site profile.`);
    const pairs = [
      ['siteType', snapshot.siteType],
      ['hiddenFunction', snapshot.systemHiddenFunction],
      ['infrastructure', snapshot.supernaturalInfrastructure],
      ['operationalSecret', snapshot.systemSecret],
      ['custodian', snapshot.custodianType],
      ['evidencePattern', snapshot.evidencePattern],
      ['localConflict', snapshot.localConflict],
      ['failureConsequence', snapshot.failureConsequence]
    ];
    for (const [profileField, directField] of pairs) {
      if (!snapshot.siteProfile[profileField]?.id || snapshot.siteProfile[profileField].id !== directField?.id) throw new Error(`${pkg.packageKey} does not preserve ${profileField}.`);
    }
    if (snapshot.regionalTheme?.siteProfile?.combinationSignature !== snapshot.siteProfile.combinationSignature) throw new Error(`${pkg.packageKey} does not preserve its profile inside the regional theme.`);
  }

  if (pkg.source?.generatorVersion !== 'world-seeded-system-site-server-rescan-3.2.0') throw new Error(`${pkg.packageKey} has the wrong generator version.`);
  if (pkg.source?.regionalThemeVersion !== '3.2.0') throw new Error(`${pkg.packageKey} has the wrong regional theme version.`);
  if (pkg.source?.systemSiteCatalogVersion !== '1.0.0' || pkg.source?.systemSiteExpansionVersion !== '1.0.0') throw new Error(`${pkg.packageKey} has the wrong system site versions.`);
  for (const output of ['population', 'struggle', 'adventureHook', 'locationSeed', 'item']) if (!pkg.outputs?.[output]?.id) throw new Error(`${pkg.packageKey} lacks ${output}.`);
}
if (supernaturalPackages.length !== 18 || mundanePackages.length !== 6) throw new Error(`Expected 18 supernatural-or-adjacent and 6 mundane packages; found ${supernaturalPackages.length} and ${mundanePackages.length}.`);
if (new Set(supernaturalPackages.map(pkg => pkg.location.contextSnapshot.siteProfile.combinationSignature)).size !== supernaturalPackages.length) throw new Error('A complete system-site combination repeated inside the clustered sample.');

const replayFactory = factory('unified');
const replay = Array.from({ length: 24 }, (_, index) => replayFactory.generate(location(index)));
for (let index = 0; index < packages.length; index += 1) {
  const left = packages[index].location.contextSnapshot;
  const right = replay[index].location.contextSnapshot;
  if (packages[index].packageKey !== replay[index].packageKey
    || left.regionalTheme.id !== right.regionalTheme.id
    || left.siteProfile?.combinationSignature !== right.siteProfile?.combinationSignature
    || left.diversitySignature !== right.diversitySignature) throw new Error(`Global deterministic replay failed at ${index}.`);
}

const vampireFactory = factory('vampire');
if (JSON.stringify(vampireFactory.statusProfile) !== JSON.stringify([12, 6, 2, 1])) throw new Error('Dedicated Vampire generation inherited Unified density.');
if (Array.from({ length: 8 }, (_, index) => vampireFactory.generate(location(index + 40))).some(pkg => pkg.location.contextSnapshot.catalogLine !== 'vampire')) throw new Error('Dedicated Vampire packages escaped into another catalog.');

for (const marker of [
  "await import('./ingest-wod-world-scan-rescan-v3.mjs')",
  "generatorVersion = 'world-seeded-system-site-server-rescan-3.2.0'",
  "regionalThemeVersion = '3.2.0'",
  "systemSiteCatalogVersion = '1.0.0'",
  'systemSiteProfileCount',
  'systemSiteCombinationSignatures'
]) if (!ingestionSource.includes(marker)) throw new Error(`Global v4 ingestion is missing ${marker}.`);
if (!workflowSource.includes('node scripts/ingest-wod-world-scan-rescan-v4.mjs')) throw new Error('Production workflow does not invoke v4.');
if (workflowSource.includes('run: node scripts/ingest-wod-world-scan-rescan-v3.mjs')) throw new Error('Production workflow directly invokes v3 instead of v4 certification.');

console.log(JSON.stringify({
  unifiedStatusProfile: unifiedFactory.statusProfile,
  vampireStatusProfile: vampireFactory.statusProfile,
  packageCount: packages.length,
  supernaturalOrAdjacentPackages: supernaturalPackages.length,
  mundanePackages: mundanePackages.length,
  unifiedCatalogsObserved: [...new Set(catalogLines)].sort(),
  uniqueRegionalThemes: new Set(packages.map(pkg => pkg.location.contextSnapshot.regionalTheme.id)).size,
  uniqueSystemSiteCombinations: new Set(supernaturalPackages.map(pkg => pkg.location.contextSnapshot.siteProfile.combinationSignature)).size,
  persistedSystemSiteDimensions: 8,
  deterministicReplay: true,
  dedicatedVampireIsolation: true,
  packageSchemaVersion: '2.1.0',
  generatorVersion: 'world-seeded-system-site-server-rescan-3.2.0',
  regionalThemeVersion: '3.2.0',
  systemSiteCatalogVersion: '1.0.0'
}, null, 2));
