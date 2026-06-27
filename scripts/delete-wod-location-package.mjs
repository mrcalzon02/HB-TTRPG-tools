import fs from 'node:fs';
import path from 'node:path';

const worldSeedKey = String(process.env.WORLD_SEED_KEY || '').trim();
const packageKey = String(process.env.PACKAGE_KEY || '').trim();

if (!/^wodworld-[0-9a-f]{8}$/.test(worldSeedKey)) {
  throw new Error('WORLD_SEED_KEY must use the wodworld-xxxxxxxx format.');
}
if (!/^wodpkg-[0-9a-f]{8}$/.test(packageKey)) {
  throw new Error('PACKAGE_KEY must use the wodpkg-xxxxxxxx format.');
}

const targetPath = path.resolve(process.cwd(), 'data/world-of-darkness/generated_location_registry.json');
const registry = JSON.parse(fs.readFileSync(targetPath, 'utf8'));
if (registry.schemaVersion !== '2.0.0') throw new Error('Target registry is not schema version 2.0.0.');

const world = registry.worlds?.[worldSeedKey];
if (!world) throw new Error(`Embedded world seed ${worldSeedKey} does not exist.`);
if (!world.packages?.[packageKey]) throw new Error(`Package ${packageKey} does not exist under ${worldSeedKey}.`);

delete world.packages[packageKey];
world.packages = Object.fromEntries(Object.entries(world.packages).sort(([a], [b]) => a.localeCompare(b)));
fs.writeFileSync(targetPath, `${JSON.stringify(registry, null, 2)}\n`);
console.log(`Deleted immutable package ${packageKey} from ${worldSeedKey}. The embedded world seed remains available for regeneration.`);
