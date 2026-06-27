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

function location(index) {
  const lat = 47.604 + (index % 6) * 0.0004;
  const lng = -122.329 + Math.floor(index / 6) * 0.0004;
  const categories = [
    ['fitness', 'Fitness / Gym', 'Fitness Centre', { leisure: 'fitness_centre', building: 'commercial' }],
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
    category, categoryLabel,
    coordinates: { lat, lng },
    osmType: 'node',
    osmId: String(910000 + index),
    featureLabel, sourceTags,
    scanKey: 'wodscan-1234abcd',
    scanZoom: 17,
    scanBounds: { south: 47.60, west: -122.34, north: 47.62, east: -122.31 },
    scanCenter: { lat: 47.61, lng: -122.325 }
  };
}

function factory(gameLine) {
  return createWorldScanPackageFactory({
    worldSeed, gameLine, generatedAt, baseLocations, contextExpansion,
    detailDiversity, baseCrosslinks, crosslinkExpansion
  });
}

const unifiedFactory = factory('unified');
if (JSON.stringify(unifiedFactory.statusProfile) !== JSON.stringify([5, 8, 5, 3])) throw new Error(`Unified server factory has the wrong status profile: ${JSON.stringify(unifiedFactory.statusProfile)}.`);
if (unifiedFactory.regionalThemeVersion !== '3.1.0') throw new Error('Unified server factory lacks regional theme version 3.1.0.');
if (unifiedFactory.systemSiteCatalogVersion !== '1.0.0') throw new Error('Unified server factory lacks system site catalog version 1.0.0.');

const packages = Array.from({ length: 24 }, (_, index) => unifiedFactory.generate(location(index)));
const catalogLines = packages.map(pkg => pkg.location.contextSnapshot.catalogLine);
const observedCatalogs = new Set(catalogLines);
const expectedCatalogs = ['vampire', 'werewolf', 'breeds', 'hunter', 'changeling', 'mage'];
if (observedCatalogs.size !== 6 || expectedCatalogs.some(line => !observedCatalogs.has(line))) throw new Error(`Unified server packages did not cover all catalogs: ${JSON.stringify([...observedCatalogs])}.`);
if (new Set(catalogLines.slice(0, 6)).size !== 6) throw new Error(`Unified server catalog rotation repeated before all catalogs were used: ${JSON.stringify(catalogLines.slice(0, 6))}.`);

const supernaturalPackages = [];
const mundanePackages = [];
for (const pkg of packages) {
  if (pkg.schemaVersion !== '2.1.0') throw new Error(`${pkg.packageKey} does not use package schema 2.1.0.`);
  if (!/^wodpkg-[0-9a-f]{8}$/.test(pkg.packageKey)) throw new Error(`Invalid package key ${pkg.packageKey}.`);
  if (pkg.worldSeedKey !== worldSeed.worldSeedKey) throw new Error(`${pkg.packageKey} has the wrong world seed.`);
  if (pkg.gameLine !== 'unified') throw new Error(`${pkg.packageKey} lost the Unified game-line identity.`);
  const snapshot = pkg.location.contextSnapshot;
  if (!expectedCatalogs.includes(snapshot.catalogLine)) throw new Error(`${pkg.packageKey} has invalid catalog line ${snapshot.catalogLine}.`);
  if (!snapshot.catalogLabel) throw new Error(`${pkg.packageKey} lacks its catalog label.`);
  if (snapshot.regionalTheme?.catalogLine !== snapshot.catalogLine || snapshot.regionalTheme?.catalogLabel !== snapshot.catalogLabel) throw new Error(`${pkg.packageKey} does not persist matching catalog identity inside its regional-theme snapshot.`);
  if (snapshot.regionalTheme?.themeVersion !== '3.1.0') throw new Error(`${pkg.packageKey} lacks regional theme model 3.1.0.`);

  if (pkg.location.inventoryStatus === 'MUNDANE') {
    mundanePackages.push(pkg);
    if (!snapshot.hiddenFunction.includes('No confirmed supernatural function')) throw new Error(`${pkg.packageKey} lost its mundane-site disclaimer.`);
    if (snapshot.siteProfile !== null) throw new Error(`${pkg.packageKey} assigned a supernatural site profile to a mundane location.`);
  } else {
    supernaturalPackages.push(pkg);
    if (!snapshot.hiddenFunction.includes(snapshot.catalogLabel)) throw new Error(`${pkg.packageKey} does not expose its supernatural catalog label.`);
    if (!snapshot.siteProfile || snapshot.siteProfile.schemaVersion !== '1.0.0') throw new Error(`${pkg.packageKey} lacks a complete system site profile.`);
    const pairs = [
      ['siteType', snapshot.siteType], ['hiddenFunction', snapshot.systemHiddenFunction],
      ['infrastructure', snapshot.supernaturalInfrastructure], ['operationalSecret', snapshot.systemSecret],
      ['custodian', snapshot.custodianType], ['evidencePattern', snapshot.evidencePattern],
      ['localConflict', snapshot.localConflict], ['failureConsequence', snapshot.failureConsequence]
    ];
    for (const [profileField, directField] of pairs) {
      const profileValue = snapshot.siteProfile[profileField];
      if (!profileValue?.id || !directField?.id || profileValue.id !== directField.id) throw new Error(`${pkg.packageKey} does not preserve matching ${profileField} data.`);
    }
    if (snapshot.regionalTheme?.siteProfile?.combinationSignature !== snapshot.siteProfile.combinationSignature) throw new Error(`${pkg.packageKey} does not preserve its site profile inside the regional theme snapshot.`);
  }

  if (!/^[0-9a-f]{8}$/.test(snapshot.diversitySignature || '')) throw new Error(`${pkg.packageKey} lacks a diversity signature.`);
  if (!snapshot.regionalTheme?.id) throw new Error(`${pkg.packageKey} lacks a regional theme.`);
  for (const output of ['population', 'struggle', 'adventureHook', 'locationSeed', 'item']) {
    if (!pkg.outputs?.[output]?.id) throw new Error(`${pkg.packageKey} lacks ${output}.`);
  }
  if (pkg.source?.generatorVersion !== 'world-seeded-system-site-server-rescan-3.2.0') throw new Error(`${pkg.packageKey} has the wrong server generator version.`);
  if (pkg.source?.regionalThemeVersion !== '3.1.0') throw new Error(`${pkg.packageKey} has the wrong regional theme version.`);
  if (pkg.source?.systemSiteCatalogVersion !== '1.0.0' || pkg.source?.systemSiteExpansionVersion !== '1.0.0') throw new Error(`${pkg.packageKey} has the wrong system site versions.`);
}
if (supernaturalPackages.length !== 18 || mundanePackages.length !== 6) throw new Error(`Unified sample expected 18 supernatural-or-adjacent and 6 mundane packages; found ${supernaturalPackages.length} and ${mundanePackages.length}.`);
if (new Set(supernaturalPackages.map(pkg => pkg.location.contextSnapshot.siteProfile.combinationSignature)).size !== supernaturalPackages.length) throw new Error('Unified global packages repeated a complete system-site combination inside the clustered sample.');

const replayFactory = factory('unified');
const replay = Array.from({ length: 24 }, (_, index) => replayFactory.generate(location(index)));
for (let index = 0; index < packages.length; index += 1) {
  const left = packages[index];
  const right = replay[index];
  if (left.packageKey !== right.packageKey) throw new Error(`Package identity replay failed at ${index}.`);
  if (left.location.inventoryStatus !== right.location.inventoryStatus) throw new Error(`Status replay failed at ${index}.`);
  if (left.location.contextSnapshot.catalogLine !== right.location.contextSnapshot.catalogLine) throw new Error(`Catalog replay failed at ${index}.`);
  if (left.location.contextSnapshot.regionalTheme.id !== right.location.contextSnapshot.regionalTheme.id) throw new Error(`Regional theme replay failed at ${index}.`);
  if (left.location.contextSnapshot.siteProfile?.combinationSignature !== right.location.contextSnapshot.siteProfile?.combinationSignature) throw new Error(`System-site replay failed at ${index}.`);
  if (left.location.contextSnapshot.diversitySignature !== right.location.contextSnapshot.diversitySignature) throw new Error(`Diversity replay failed at ${index}.`);
}

const vampireFactory = factory('vampire');
if (JSON.stringify(vampireFactory.statusProfile) !== JSON.stringify([12, 6, 2, 1])) throw new Error(`Dedicated Vampire factory inherited Unified density: ${JSON.stringify(vampireFactory.statusProfile)}.`);
const vampirePackages = Array.from({ length: 8 }, (_, index) => vampireFactory.generate(location(index + 40)));
if (vampirePackages.some(pkg => pkg.location.contextSnapshot.catalogLine !== 'vampire')) throw new Error('Dedicated Vampire packages escaped into another catalog.');

for (const marker of [
  "await import('./ingest-wod-world-scan-rescan-v3.mjs')",
  "generatorVersion = 'world-seeded-system-site-server-rescan-3.2.0'",
  "regionalThemeVersion = '3.1.0'",
  "systemSiteCatalogVersion = '1.0.0'",
  "systemSiteExpansionVersion = '1.0.0'",
  'systemSiteProfileCount', 'systemSiteCombinationSignatures'
]) {
  if (!ingestionSource.includes(marker)) throw new Error(`Global v4 rescan ingestion is missing ${marker}.`);
}
if (!workflowSource.includes('node scripts/ingest-wod-world-scan-rescan-v4.mjs')) throw new Error('Production workflow does not invoke global rescan v4.');
if (workflowSource.includes('run: node scripts/ingest-wod-world-scan-rescan-v3.mjs')) throw new Error('Production workflow directly invokes legacy v3 instead of v4 certification.');

console.log(JSON.stringify({
  unifiedStatusProfile: unifiedFactory.statusProfile,
  vampireStatusProfile: vampireFactory.statusProfile,
  packageCount: packages.length,
  supernaturalOrAdjacentPackages: supernaturalPackages.length,
  mundanePackages: mundanePackages.length,
  unifiedCatalogsObserved: [...observedCatalogs].sort(),
  firstCatalogCycle: catalogLines.slice(0, 6),
  uniqueRegionalThemes: new Set(packages.map(pkg => pkg.location.contextSnapshot.regionalTheme.id)).size,
  uniqueSystemSiteCombinations: new Set(supernaturalPackages.map(pkg => pkg.location.contextSnapshot.siteProfile.combinationSignature)).size,
  persistedCatalogIdentity: true,
  persistedSystemSiteDimensions: 8,
  deterministicReplay: true,
  dedicatedVampireIsolation: true,
  packageSchemaVersion: '2.1.0',
  generatorVersion: 'world-seeded-system-site-server-rescan-3.2.0',
  regionalThemeVersion: '3.1.0',
  systemSiteCatalogVersion: '1.0.0',
  systemSiteExpansionVersion: '1.0.0'
}, null, 2));
