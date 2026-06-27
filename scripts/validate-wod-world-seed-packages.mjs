import fs from 'node:fs';

const config = JSON.parse(fs.readFileSync('data/world-of-darkness/spatial-engine-config.json', 'utf8'));
const baseCrosslinks = JSON.parse(fs.readFileSync(config.coreData.crosslinks, 'utf8'));
const expansion = JSON.parse(fs.readFileSync(config.coreData.crosslinkExpansion, 'utf8'));
const detailDiversity = JSON.parse(fs.readFileSync(config.coreData.detailDiversity, 'utf8'));
const registry = JSON.parse(fs.readFileSync(config.coreData.generatedLocationRegistry, 'utf8'));

if (config.schemaVersion !== '2.6.0') throw new Error('Spatial engine config must use schemaVersion 2.6.0.');
if (detailDiversity.schemaVersion !== '1.0.0') throw new Error('Detail diversity data must use schemaVersion 1.0.0.');
if (registry.schemaVersion !== '2.0.0') throw new Error('Generated location registry must use schemaVersion 2.0.0.');
if (registry.registryType !== 'chronicle-world-seeded-location-packages') throw new Error('Generated location registry type is invalid.');
if (!registry.worlds || typeof registry.worlds !== 'object' || Array.isArray(registry.worlds)) throw new Error('Generated location registry worlds must be an object.');

const statuses = ['MUNDANE', 'TANGENTIAL', 'ACTIVE_UNREGISTERED', 'INVENTORIED'];
const pools = ['population', 'struggles', 'adventureHooks', 'locationSeeds', 'items'];
const requiredPackageOutputs = ['population', 'struggle', 'adventureHook', 'locationSeed', 'item'];
const effectivePools = {};
for (const poolName of pools) {
  const basePool = baseCrosslinks[poolName];
  const addedPool = expansion[poolName];
  if (!Array.isArray(basePool) || basePool.length !== 8) throw new Error(`${poolName} base pool must contain exactly 8 entries.`);
  if (!Array.isArray(addedPool) || addedPool.length !== 8) throw new Error(`${poolName} expansion pool must contain exactly 8 entries.`);
  const pool = [...basePool, ...addedPool];
  if (pool.length !== 16) throw new Error(`${poolName} effective pool must contain exactly 16 entries.`);
  const ids = new Set();
  for (const entry of pool) {
    if (!entry.id || ids.has(entry.id)) throw new Error(`${poolName} contains a missing or duplicate id: ${entry.id}.`);
    ids.add(entry.id);
  }
  for (const status of statuses) {
    const statusEntries = pool.filter(entry => Array.isArray(entry.statuses) && entry.statuses.includes(status));
    if (statusEntries.length !== 4) throw new Error(`${poolName} must contain 4 entries supporting ${status}; found ${statusEntries.length}.`);
  }
  effectivePools[poolName] = pool;
}

if (!Array.isArray(baseCrosslinks.crossLinks) || baseCrosslinks.crossLinks.length < 1) {
  throw new Error('crossLinks must contain at least one linked generator.');
}

let diversifiedPackages = 0;
let matrixEnrichedPackages = 0;
let legacyPackages = 0;
for (const [worldSeedKey, world] of Object.entries(registry.worlds)) {
  if (!/^wodworld-[0-9a-f]{8}$/.test(worldSeedKey)) throw new Error(`Invalid embedded world key: ${worldSeedKey}.`);
  if (world.worldSeedKey !== worldSeedKey) throw new Error(`Embedded world ${worldSeedKey} has a mismatched worldSeedKey.`);
  if (typeof world.seedValue !== 'string' || world.seedValue.length < 8) throw new Error(`Embedded world ${worldSeedKey} has an invalid seedValue.`);
  if (!world.packages || typeof world.packages !== 'object' || Array.isArray(world.packages)) throw new Error(`Embedded world ${worldSeedKey} packages must be an object.`);

  for (const [packageKey, pkg] of Object.entries(world.packages)) {
    if (!/^wodpkg-[0-9a-f]{8}$/.test(packageKey)) throw new Error(`Invalid package key ${packageKey}.`);
    if (pkg.packageKey !== packageKey) throw new Error(`Package ${packageKey} has a mismatched packageKey.`);
    if (pkg.worldSeedKey !== worldSeedKey) throw new Error(`Package ${packageKey} points to the wrong world seed.`);
    if (pkg.location?.claimed === true) throw new Error(`Claimed location package ${packageKey} is not permitted in this registry.`);
    if (!statuses.includes(pkg.location?.inventoryStatus)) throw new Error(`Package ${packageKey} has an invalid inventory status.`);
    for (const outputName of requiredPackageOutputs) {
      if (!pkg.outputs?.[outputName]?.id) throw new Error(`Package ${packageKey} lacks ${outputName}.`);
    }

    if (pkg.source?.detailDiversityVersion === '1.0.0' || pkg.schemaVersion === '2.1.0') {
      diversifiedPackages += 1;
      if (pkg.schemaVersion !== '2.1.0') throw new Error(`Diversified package ${packageKey} must use schemaVersion 2.1.0.`);
      const snapshot = pkg.location?.contextSnapshot || {};
      if (!/^[0-9a-f]{8}$/.test(snapshot.diversitySignature || '')) throw new Error(`Diversified package ${packageKey} lacks a valid diversity signature.`);
      if (!snapshot.regionalTheme?.id || !snapshot.regionalTheme?.label || !snapshot.regionalTheme?.description) {
        throw new Error(`Diversified package ${packageKey} lacks regional-theme metadata.`);
      }
      for (const field of ['publicFacade', 'hiddenFunction', 'mechanicalSeed', 'associatedCharacter', 'temporalAnchor', 'traumaticCatalyst', 'operationalSecret', 'vulnerability', 'sensoryAnchor', 'mediaFeed', 'streetRumor']) {
        if (typeof snapshot[field] !== 'string' || !snapshot[field].trim()) throw new Error(`Diversified package ${packageKey} lacks ${field}.`);
      }
      if (pkg.source.generatorVersion !== 'world-seeded-diversified-location-package-3.0.0') {
        throw new Error(`Diversified package ${packageKey} has the wrong generator version.`);
      }
      continue;
    }

    if (pkg.source?.contextResolverVersion === '1.0.0') {
      matrixEnrichedPackages += 1;
      if (pkg.source.effectiveLocationVariants !== 420) throw new Error(`Matrix-enriched package ${packageKey} does not declare 420 effective variants.`);
      if (pkg.source.effectiveEntriesPerOutputPool !== 16) throw new Error(`Matrix-enriched package ${packageKey} does not declare 16 entries per output pool.`);
      if (!pkg.location?.contextAwareness?.selectedContextId) throw new Error(`Matrix-enriched package ${packageKey} lacks context-awareness metadata.`);
    } else legacyPackages += 1;
  }
}

console.log(JSON.stringify({
  schemaVersion: registry.schemaVersion,
  embeddedWorlds: Object.keys(registry.worlds).length,
  effectiveContentPools: Object.fromEntries(pools.map(poolName => [poolName, effectivePools[poolName].length])),
  entriesPerStatusPerPool: 4,
  linkedGenerators: baseCrosslinks.crossLinks.length,
  supportedStatuses: statuses,
  diversifiedPackages,
  matrixEnrichedPackages,
  legacyPackages
}, null, 2));
