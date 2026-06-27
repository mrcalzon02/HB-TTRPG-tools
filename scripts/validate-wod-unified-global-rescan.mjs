import fs from 'node:fs';
import { createWorldScanPackageFactory } from './wod-world-scan-package-factory.mjs';

const config = JSON.parse(fs.readFileSync('data/world-of-darkness/spatial-engine-config.json', 'utf8'));
const baseLocations = JSON.parse(fs.readFileSync(config.coreData.locations, 'utf8'));
const contextExpansion = JSON.parse(fs.readFileSync(config.coreData.contextExpansion, 'utf8'));
const detailDiversity = JSON.parse(fs.readFileSync(config.coreData.detailDiversity, 'utf8'));
const baseCrosslinks = JSON.parse(fs.readFileSync(config.coreData.crosslinks, 'utf8'));
const crosslinkExpansion = JSON.parse(fs.readFileSync(config.coreData.crosslinkExpansion, 'utf8'));
const ingestionSource = fs.readFileSync('scripts/ingest-wod-world-scan-rescan-v3.mjs', 'utf8');

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
  return {
    locationKey: `gmaps-${(0x10000000 + index).toString(16)}`,
    name: `Unified Server Location ${index + 1}`,
    address: `${500 + index} 9th Avenue, Seattle, WA 98104`,
    referenceUrl: `https://www.openstreetmap.org/node/${910000 + index}`,
    category: 'fitness',
    categoryLabel: 'Fitness / Gym',
    coordinates: { lat, lng },
    osmType: 'node',
    osmId: String(910000 + index),
    featureLabel: 'Fitness Centre',
    sourceTags: { leisure: 'fitness_centre', building: 'commercial' },
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
if (JSON.stringify(unifiedFactory.statusProfile) !== JSON.stringify([5, 8, 5, 3])) {
  throw new Error(`Unified server factory has the wrong status profile: ${JSON.stringify(unifiedFactory.statusProfile)}.`);
}
const packages = Array.from({ length: 24 }, (_, index) => unifiedFactory.generate(location(index)));
const catalogLines = packages.map(pkg => pkg.location.contextSnapshot.catalogLine);
const observedCatalogs = new Set(catalogLines);
const expectedCatalogs = ['vampire', 'werewolf', 'breeds', 'hunter', 'changeling', 'mage'];
if (observedCatalogs.size !== 6 || expectedCatalogs.some(line => !observedCatalogs.has(line))) {
  throw new Error(`Unified server packages did not cover all catalogs: ${JSON.stringify([...observedCatalogs])}.`);
}
if (new Set(catalogLines.slice(0, 6)).size !== 6) {
  throw new Error(`Unified server catalog rotation repeated before all catalogs were used: ${JSON.stringify(catalogLines.slice(0, 6))}.`);
}

for (const pkg of packages) {
  if (pkg.schemaVersion !== '2.1.0') throw new Error(`${pkg.packageKey} does not use package schema 2.1.0.`);
  if (!/^wodpkg-[0-9a-f]{8}$/.test(pkg.packageKey)) throw new Error(`Invalid package key ${pkg.packageKey}.`);
  if (pkg.worldSeedKey !== worldSeed.worldSeedKey) throw new Error(`${pkg.packageKey} has the wrong world seed.`);
  if (pkg.gameLine !== 'unified') throw new Error(`${pkg.packageKey} lost the Unified game-line identity.`);
  const snapshot = pkg.location.contextSnapshot;
  if (!expectedCatalogs.includes(snapshot.catalogLine)) throw new Error(`${pkg.packageKey} has invalid catalog line ${snapshot.catalogLine}.`);
  if (!snapshot.catalogLabel) throw new Error(`${pkg.packageKey} lacks its catalog label.`);
  if (snapshot.regionalTheme?.catalogLine !== snapshot.catalogLine || snapshot.regionalTheme?.catalogLabel !== snapshot.catalogLabel) {
    throw new Error(`${pkg.packageKey} does not persist matching catalog identity inside its regional-theme snapshot.`);
  }
  if (pkg.location.inventoryStatus === 'MUNDANE') {
    if (!snapshot.hiddenFunction.includes('No confirmed supernatural function')) {
      throw new Error(`${pkg.packageKey} does not preserve its mundane-site disclaimer.`);
    }
  } else if (!snapshot.hiddenFunction.includes(snapshot.catalogLabel)) {
    throw new Error(`${pkg.packageKey} does not expose its supernatural catalog label.`);
  }
  if (!/^[0-9a-f]{8}$/.test(snapshot.diversitySignature || '')) throw new Error(`${pkg.packageKey} lacks a diversity signature.`);
  if (!snapshot.regionalTheme?.id) throw new Error(`${pkg.packageKey} lacks a regional theme.`);
  for (const output of ['population', 'struggle', 'adventureHook', 'locationSeed', 'item']) {
    if (!pkg.outputs?.[output]?.id) throw new Error(`${pkg.packageKey} lacks ${output}.`);
  }
  if (pkg.source?.generatorVersion !== 'world-seeded-cross-catalog-server-rescan-3.1.0') {
    throw new Error(`${pkg.packageKey} has the wrong server generator version.`);
  }
}

const replayFactory = factory('unified');
const replay = Array.from({ length: 24 }, (_, index) => replayFactory.generate(location(index)));
for (let index = 0; index < packages.length; index += 1) {
  const left = packages[index];
  const right = replay[index];
  if (left.packageKey !== right.packageKey) throw new Error(`Package identity replay failed at ${index}.`);
  if (left.location.inventoryStatus !== right.location.inventoryStatus) throw new Error(`Status replay failed at ${index}.`);
  if (left.location.contextSnapshot.catalogLine !== right.location.contextSnapshot.catalogLine) throw new Error(`Catalog replay failed at ${index}.`);
  if (left.location.contextSnapshot.regionalTheme.catalogLine !== right.location.contextSnapshot.regionalTheme.catalogLine) throw new Error(`Persisted catalog replay failed at ${index}.`);
  if (left.location.contextSnapshot.diversitySignature !== right.location.contextSnapshot.diversitySignature) throw new Error(`Diversity replay failed at ${index}.`);
}

const vampireFactory = factory('vampire');
if (JSON.stringify(vampireFactory.statusProfile) !== JSON.stringify([12, 6, 2, 1])) {
  throw new Error(`Dedicated Vampire factory inherited Unified density: ${JSON.stringify(vampireFactory.statusProfile)}.`);
}
const vampirePackages = Array.from({ length: 8 }, (_, index) => vampireFactory.generate(location(index + 40)));
if (vampirePackages.some(pkg => pkg.location.contextSnapshot.catalogLine !== 'vampire')) {
  throw new Error('Dedicated Vampire packages escaped into another catalog.');
}

for (const marker of [
  'WOD_OVERPASS_FIXTURE',
  'WOD_REGISTRY_PATH',
  'globalViewportProcessingCap',
  'createWorldScanPackageFactory',
  'catalogCounts',
  'statusCounts',
  "generatorVersion: 'world-seeded-cross-catalog-server-rescan-3.1.0'"
]) {
  if (!ingestionSource.includes(marker)) throw new Error(`Global rescan ingestion is missing ${marker}.`);
}

console.log(JSON.stringify({
  unifiedStatusProfile: unifiedFactory.statusProfile,
  vampireStatusProfile: vampireFactory.statusProfile,
  packageCount: packages.length,
  unifiedCatalogsObserved: [...observedCatalogs].sort(),
  firstCatalogCycle: catalogLines.slice(0, 6),
  mundanePackages: packages.filter(pkg => pkg.location.inventoryStatus === 'MUNDANE').length,
  supernaturalOrAdjacentPackages: packages.filter(pkg => pkg.location.inventoryStatus !== 'MUNDANE').length,
  persistedCatalogIdentity: true,
  uniqueDiversitySignatures: new Set(packages.map(pkg => pkg.location.contextSnapshot.diversitySignature)).size,
  deterministicReplay: true,
  dedicatedVampireIsolation: true,
  packageSchemaVersion: '2.1.0',
  generatorVersion: 'world-seeded-cross-catalog-server-rescan-3.1.0'
}, null, 2));
