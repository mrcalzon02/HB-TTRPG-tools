import fs from 'node:fs';
import path from 'node:path';

const TARGET = 'data/world-of-darkness/generated_location_registry.json';
const body = process.env.ISSUE_BODY_FILE
  ? fs.readFileSync(process.env.ISSUE_BODY_FILE, 'utf8')
  : (process.env.ISSUE_BODY || '');
if (!body.includes('<!-- WOD_WORLD_SCAN_RESCAN_PATCH -->')) throw new Error('Missing World of Darkness viewport-rescan marker.');
const match = body.match(/```json\s*([\s\S]*?)```/i);
if (!match) throw new Error('Missing fenced JSON viewport-rescan patch.');
const patch = JSON.parse(match[1]);
if (patch?.target !== TARGET) throw new Error('Viewport-rescan target is not allowed.');
if (!/^wodworld-[0-9a-f]{8}$/.test(patch?.worldSeed?.worldSeedKey || '')) throw new Error('World seed key is invalid.');
if (!/^wodscan-[0-9a-f]{8}$/.test(patch?.scan?.scanKey || '')) throw new Error('Scan key is invalid.');

await import('./ingest-wod-world-scan-rescan-v3.mjs');

const registryPath = path.resolve(process.cwd(), process.env.WOD_REGISTRY_PATH || TARGET);
const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
const world = registry.worlds?.[patch.worldSeed.worldSeedKey];
const coverage = world?.scanCoverage?.[patch.scan.scanKey];
if (!world || !coverage) throw new Error('The v3 ingestion completed without producing the expected world scan coverage record.');

const packageKeys = Array.isArray(coverage.packageKeys) ? coverage.packageKeys : [];
const packages = packageKeys.map(packageKey => world.packages?.[packageKey]).filter(Boolean);
const supernaturalPackages = packages.filter(pkg => pkg.location?.inventoryStatus !== 'MUNDANE');
const siteProfiles = supernaturalPackages.map(pkg => pkg.location?.contextSnapshot?.siteProfile).filter(Boolean);
if (siteProfiles.length !== supernaturalPackages.length) {
  throw new Error(`System-site profiles are incomplete (${siteProfiles.length}/${supernaturalPackages.length}).`);
}

coverage.generatorVersion = 'world-seeded-system-site-server-rescan-3.2.0';
coverage.regionalThemeVersion = '3.2.0';
coverage.systemSiteCatalogVersion = '1.0.0';
coverage.systemSiteExpansionVersion = '1.0.0';
coverage.systemSiteProfileCount = siteProfiles.length;
coverage.systemSiteDimensions = 8;
coverage.systemSiteCombinationSignatures = [...new Set(siteProfiles.map(profile => profile.combinationSignature).filter(Boolean))];
coverage.certifiedAt = new Date().toISOString();

fs.writeFileSync(registryPath, `${JSON.stringify(registry, null, 2)}\n`);
console.log(JSON.stringify({
  worldSeedKey: patch.worldSeed.worldSeedKey,
  scanKey: patch.scan.scanKey,
  packageCount: packages.length,
  supernaturalPackageCount: supernaturalPackages.length,
  systemSiteProfileCount: siteProfiles.length,
  uniqueSystemSiteCombinations: coverage.systemSiteCombinationSignatures.length,
  generatorVersion: coverage.generatorVersion,
  regionalThemeVersion: coverage.regionalThemeVersion,
  systemSiteCatalogVersion: coverage.systemSiteCatalogVersion,
  systemSiteExpansionVersion: coverage.systemSiteExpansionVersion,
  registryPath
}, null, 2));
