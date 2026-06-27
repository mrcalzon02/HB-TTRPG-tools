import fs from 'node:fs';

const config = JSON.parse(fs.readFileSync('data/world-of-darkness/spatial-engine-config.json', 'utf8'));
const crosslinks = JSON.parse(fs.readFileSync(config.coreData.crosslinks, 'utf8'));
const registry = JSON.parse(fs.readFileSync(config.coreData.generatedLocationRegistry, 'utf8'));

if (registry.schemaVersion !== '2.0.0') throw new Error('Generated location registry must use schemaVersion 2.0.0.');
if (registry.registryType !== 'chronicle-world-seeded-location-packages') throw new Error('Generated location registry type is invalid.');
if (!registry.worlds || typeof registry.worlds !== 'object' || Array.isArray(registry.worlds)) throw new Error('Generated location registry worlds must be an object.');

const statuses = ['MUNDANE', 'TANGENTIAL', 'ACTIVE_UNREGISTERED', 'INVENTORIED'];
const pools = ['population', 'struggles', 'adventureHooks', 'locationSeeds', 'items'];
for (const poolName of pools) {
  const pool = crosslinks[poolName];
  if (!Array.isArray(pool) || !pool.length) throw new Error(`${poolName} must be a non-empty array.`);
  for (const status of statuses) {
    if (!pool.some(entry => Array.isArray(entry.statuses) && entry.statuses.includes(status))) {
      throw new Error(`${poolName} has no entry supporting ${status}.`);
    }
  }
}

if (!Array.isArray(crosslinks.crossLinks) || crosslinks.crossLinks.length < 1) {
  throw new Error('crossLinks must contain at least one linked generator.');
}

for (const [worldSeedKey, world] of Object.entries(registry.worlds)) {
  if (!/^wodworld-[0-9a-f]{8}$/.test(worldSeedKey)) throw new Error(`Invalid embedded world key: ${worldSeedKey}.`);
  if (world.worldSeedKey !== worldSeedKey) throw new Error(`Embedded world ${worldSeedKey} has a mismatched worldSeedKey.`);
  if (typeof world.seedValue !== 'string' || world.seedValue.length < 8) throw new Error(`Embedded world ${worldSeedKey} has an invalid seedValue.`);
  if (!world.packages || typeof world.packages !== 'object' || Array.isArray(world.packages)) throw new Error(`Embedded world ${worldSeedKey} packages must be an object.`);

  for (const [packageKey, pkg] of Object.entries(world.packages)) {
    if (!/^wodpkg-[0-9a-f]{8}$/.test(packageKey)) throw new Error(`Invalid package key ${packageKey}.`);
    if (pkg.packageKey !== packageKey) throw new Error(`Package ${packageKey} has a mismatched packageKey.`);
    if (pkg.worldSeedKey !== worldSeedKey) throw new Error(`Package ${packageKey} points to the wrong world seed.`);
    if (pkg.location?.claimed === true) throw new Error(`Claimed business package ${packageKey} is not permitted in this registry.`);
  }
}

console.log(JSON.stringify({
  schemaVersion: registry.schemaVersion,
  embeddedWorlds: Object.keys(registry.worlds).length,
  contentPools: Object.fromEntries(pools.map(poolName => [poolName, crosslinks[poolName].length])),
  linkedGenerators: crosslinks.crossLinks.length,
  supportedStatuses: statuses
}, null, 2));
