import fs from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const resolver = require('../world-of-darkness-context-aware-core.js');
const config = JSON.parse(fs.readFileSync('data/world-of-darkness/spatial-engine-config.json', 'utf8'));
const registryPath = config.coreData.generatedLocationRegistry;
const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
const datasets = {
  baseLocations: JSON.parse(fs.readFileSync(config.coreData.locations, 'utf8')),
  contextExpansion: JSON.parse(fs.readFileSync(config.coreData.contextExpansion, 'utf8')),
  baseCrosslinks: JSON.parse(fs.readFileSync(config.coreData.crosslinks, 'utf8')),
  crosslinkExpansion: JSON.parse(fs.readFileSync(config.coreData.crosslinkExpansion, 'utf8'))
};

const issueNumber = Number(process.env.ISSUE_NUMBER || process.argv.find(argument => argument.startsWith('--issue='))?.split('=')[1] || 0);
if (!Number.isInteger(issueNumber) || issueNumber < 1) {
  throw new Error('A positive ISSUE_NUMBER or --issue=<number> is required so existing immutable packages are not rewritten.');
}

let enrichedCount = 0;
let preservedDiversifiedCount = 0;
const enrichedKeys = [];
const preservedDiversifiedKeys = [];
for (const world of Object.values(registry.worlds || {})) {
  for (const [packageKey, pkg] of Object.entries(world.packages || {})) {
    if (Number(pkg.submittedFromIssue || 0) !== issueNumber) continue;
    if (pkg.source?.detailDiversityVersion === '1.0.0') {
      preservedDiversifiedCount += 1;
      preservedDiversifiedKeys.push(packageKey);
      continue;
    }
    if (pkg.source?.contextResolverVersion === '1.0.0') continue;
    const enriched = resolver.enrichPackage(pkg, datasets, {
      generatorVersion: 'context-aware-global-ingestion-4.0.0',
      enrichedAt: new Date().toISOString()
    });
    if (enriched.outputs?.items) {
      enriched.outputs.item = enriched.outputs.items;
      delete enriched.outputs.items;
    }
    world.packages[packageKey] = enriched;
    enrichedCount += 1;
    enrichedKeys.push(packageKey);
  }
}

if (enrichedCount) fs.writeFileSync(registryPath, `${JSON.stringify(registry, null, 2)}\n`);
console.log(JSON.stringify({
  issueNumber,
  enrichedCount,
  enrichedKeys,
  preservedDiversifiedCount,
  preservedDiversifiedKeys,
  effectiveLocationVariants: datasets.baseLocations.prototypes.length * (datasets.baseLocations.contextVariants.length + datasets.contextExpansion.contextVariants.length),
  effectiveEntriesPerOutputPool: datasets.baseCrosslinks.population.length + datasets.crosslinkExpansion.population.length
}, null, 2));
