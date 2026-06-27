import fs from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const resolver = require('../world-of-darkness-context-aware-core.js');
const config = JSON.parse(fs.readFileSync('data/world-of-darkness/spatial-engine-config.json', 'utf8'));
const datasets = {
  baseLocations: JSON.parse(fs.readFileSync(config.coreData.locations, 'utf8')),
  contextExpansion: JSON.parse(fs.readFileSync(config.coreData.contextExpansion, 'utf8')),
  baseCrosslinks: JSON.parse(fs.readFileSync(config.coreData.crosslinks, 'utf8')),
  crosslinkExpansion: JSON.parse(fs.readFileSync(config.coreData.crosslinkExpansion, 'utf8'))
};

function sample({ id, gameLine, status, category, featureLabel, sourceTags }) {
  return {
    schemaVersion: '2.0.0',
    packageKey: `wodpkg-${id.padEnd(8, '0').slice(0, 8)}`,
    worldSeedKey: 'wodworld-1234abcd',
    worldSeedLabel: 'Validation World',
    locationKey: `gmaps-${id.padEnd(8, '0').slice(0, 8)}`,
    gameLine,
    generatedAt: '2026-06-27T00:00:00.000Z',
    location: {
      name: `${gameLine} ${featureLabel}`,
      address: '100 Validation Way',
      category,
      coordinates: { lat: 57.05, lng: -135.33 },
      inventoryStatus: status,
      claimed: false,
      contextSnapshot: {},
      spatialContext: {
        featureLabel,
        sourceTags,
        source: 'validation'
      }
    },
    outputs: {},
    source: {}
  };
}

const cases = [
  sample({ id: '10000001', gameLine: 'vampire', status: 'TANGENTIAL', category: 'bar', featureLabel: 'Amenity · Bar', sourceTags: { amenity: 'bar' } }),
  sample({ id: '10000002', gameLine: 'werewolf', status: 'TANGENTIAL', category: 'park', featureLabel: 'Park / Green Space', sourceTags: { leisure: 'park', natural: 'wood' } }),
  sample({ id: '10000003', gameLine: 'breeds', status: 'ACTIVE_UNREGISTERED', category: 'natural_feature', featureLabel: 'Natural Feature · Wetland', sourceTags: { natural: 'wetland' } }),
  sample({ id: '10000004', gameLine: 'hunter', status: 'TANGENTIAL', category: 'transit_station', featureLabel: 'Rail / Transit · Station', sourceTags: { railway: 'station', public_transport: 'station' } }),
  sample({ id: '10000005', gameLine: 'changeling', status: 'TANGENTIAL', category: 'park', featureLabel: 'Leisure Site · Playground', sourceTags: { leisure: 'playground' } }),
  sample({ id: '10000006', gameLine: 'mage', status: 'TANGENTIAL', category: 'library', featureLabel: 'Library', sourceTags: { amenity: 'library' } }),
  sample({ id: '10000007', gameLine: 'unified', status: 'INVENTORIED', category: 'government', featureLabel: 'Town Hall / Government', sourceTags: { amenity: 'townhall' } })
];

const enriched = cases.map(pkg => resolver.enrichPackage(pkg, datasets, {
  generatorVersion: 'validation-4.0.0',
  enrichedAt: '2026-06-27T00:00:00.000Z'
}));

for (let index = 0; index < cases.length; index += 1) {
  const original = cases[index];
  const result = enriched[index];
  if (result.location.inventoryStatus !== original.location.inventoryStatus) {
    throw new Error(`${original.gameLine} validation changed inventory status.`);
  }
  if (result.source.effectiveLocationVariants !== 420) throw new Error(`${original.gameLine} did not declare 420 effective variants.`);
  if (result.source.effectiveEntriesPerOutputPool !== 16) throw new Error(`${original.gameLine} did not declare 16 entries per output pool.`);
  if (!/^\d+ of 420$/.test(result.location.contextSnapshot.locationVariant || '')) throw new Error(`${original.gameLine} has an invalid effective variant label.`);
  if (!result.location.contextAwareness?.selectedContextId) throw new Error(`${original.gameLine} lacks a selected context id.`);
  if (!result.location.contextAwareness?.matchedHooks?.length) throw new Error(`${original.gameLine} did not match any real-world or setting hook.`);
  for (const key of ['population', 'struggle', 'adventureHook', 'locationSeed']) {
    if (!result.outputs?.[key]?.id) throw new Error(`${original.gameLine} lacks ${key}.`);
  }
  if (!(result.outputs?.item?.id || result.outputs?.items?.id)) throw new Error(`${original.gameLine} lacks item output.`);

  const repeated = resolver.enrichPackage(original, datasets, {
    generatorVersion: 'validation-4.0.0',
    enrichedAt: '2026-06-27T00:00:00.000Z'
  });
  if (JSON.stringify(result) !== JSON.stringify(repeated)) throw new Error(`${original.gameLine} enrichment is not deterministic.`);
}

const selectedContextIds = enriched.map(pkg => pkg.location.contextAwareness.selectedContextId);
const addedContextIds = new Set(datasets.contextExpansion.contextVariants.map(context => context.id));
const expansionSelections = selectedContextIds.filter(id => addedContextIds.has(id));
if (new Set(selectedContextIds).size < 5) throw new Error(`Context-aware samples produced insufficient variety: ${selectedContextIds.join(', ')}.`);
if (expansionSelections.length < 6) throw new Error(`Context-aware samples did not prefer enough expansion contexts: ${selectedContextIds.join(', ')}.`);

const werewolfPark = enriched.find(pkg => pkg.gameLine === 'werewolf');
const changelingPark = enriched.find(pkg => pkg.gameLine === 'changeling');
if (werewolfPark.location.contextAwareness.selectedContextId === changelingPark.location.contextAwareness.selectedContextId) {
  throw new Error('Werewolf and Changeling park contexts should diverge under the same real-world feature family.');
}
const outputIds = pkg => [
  pkg.outputs.population?.id,
  pkg.outputs.struggle?.id,
  pkg.outputs.adventureHook?.id,
  pkg.outputs.locationSeed?.id,
  pkg.outputs.item?.id || pkg.outputs.items?.id
];
const werewolfOutputs = outputIds(werewolfPark);
const changelingOutputs = outputIds(changelingPark);
if (werewolfOutputs.every((id, index) => id === changelingOutputs[index])) {
  throw new Error('Werewolf and Changeling park packages did not diverge across any linked output pool.');
}

console.log(JSON.stringify({
  effectiveLocationVariants: 420,
  effectiveEntriesPerOutputPool: 16,
  samples: enriched.map(pkg => ({
    gameLine: pkg.gameLine,
    feature: pkg.location.contextAwareness.namedFeatureClass,
    category: pkg.location.contextAwareness.realWorldCategory,
    context: pkg.location.contextAwareness.selectedContextId,
    variant: pkg.location.contextSnapshot.locationVariant,
    population: pkg.outputs.population.id,
    hook: pkg.outputs.adventureHook.id,
    seed: pkg.outputs.locationSeed.id,
    matchedHooks: pkg.location.contextAwareness.matchedHooks
  }))
}, null, 2));
