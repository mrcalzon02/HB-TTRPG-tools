import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const loaderPath = path.join(root, 'barotrauma-rpg-tools-loader.js');
const loader = fs.readFileSync(loaderPath, 'utf8');
const runtimePaths = [...loader.matchAll(/'([^']*barotrauma-rpg-tools\.part-[^']+\.txt)'/g)].map(match => match[1]);

if (!runtimePaths.length) throw new Error('No Barotrauma runtime fragments were found in the loader.');
if (new Set(runtimePaths).size !== runtimePaths.length) throw new Error('The runtime loader contains duplicate fragment paths.');

const requiredOrder = [
  'data/barotrauma/tools/runtime/barotrauma-rpg-tools.part-06-character-inventory.txt',
  'data/barotrauma/tools/runtime/barotrauma-rpg-tools.part-06-crew-management.txt',
  'data/barotrauma/tools/runtime/barotrauma-rpg-tools.part-06-crew-patch.txt',
  'data/barotrauma/tools/runtime/barotrauma-rpg-tools.part-06-item-compatibility.txt',
  'data/barotrauma/tools/runtime/barotrauma-rpg-tools.part-06-cargo-commerce.txt',
  'data/barotrauma/tools/runtime/barotrauma-rpg-tools.part-06-commerce-stability.txt',
  'data/barotrauma/tools/runtime/barotrauma-rpg-tools.part-06-suitability-patch.txt',
  'data/barotrauma/tools/runtime/barotrauma-rpg-tools.part-06-world-state.txt',
  'data/barotrauma/tools/runtime/barotrauma-rpg-tools.part-06-world-scale-patch.txt',
  'data/barotrauma/tools/runtime/barotrauma-rpg-tools.part-06-world-commerce-patch.txt',
  'data/barotrauma/tools/runtime/barotrauma-rpg-tools.part-06-research-validation.txt',
  'data/barotrauma/tools/runtime/barotrauma-rpg-tools.part-06-world-research-patch.txt',
  'data/barotrauma/tools/runtime/barotrauma-rpg-tools.part-06.txt'
];
const orderIndexes = requiredOrder.map(relativePath => runtimePaths.indexOf(relativePath));
if (orderIndexes.some(index => index < 0)) throw new Error('One or more required inventory, crew, cargo, commerce, world-scale, research, or integration runtime fragments are not registered.');
for (let index = 1; index < orderIndexes.length; index += 1) {
  if (orderIndexes[index] <= orderIndexes[index - 1]) throw new Error(`Runtime fragment order is invalid near ${requiredOrder[index]}.`);
}

const source = runtimePaths.map(relativePath => {
  const absolutePath = path.join(root, relativePath);
  if (!fs.existsSync(absolutePath)) throw new Error(`Missing runtime fragment: ${relativePath}`);
  return fs.readFileSync(absolutePath, 'utf8');
}).join('');

new Function(source);

const jsonPaths = [
  'data/barotrauma/tools/catalog/catalog-index.json',
  'data/barotrauma/tools/submarines/submarine-roster.json',
  'data/barotrauma/tools/custom/custom-content-schema.json',
  'data/barotrauma/tools/items/item-functionality.json',
  'data/barotrauma/tools/world/world-state-schema.json',
  'data/barotrauma-tools-registry.json'
];
for (const relativePath of jsonPaths) JSON.parse(fs.readFileSync(path.join(root, relativePath), 'utf8'));

const functionality = JSON.parse(fs.readFileSync(path.join(root, 'data/barotrauma/tools/items/item-functionality.json'), 'utf8'));
if (functionality.inventoryRules?.toolbeltSlots !== 4) throw new Error('Toolbelt must provide exactly four tracked inventory slots.');
if (functionality.inventoryRules?.backpackSlots !== 4) throw new Error('Backpack must provide exactly four tracked inventory slots.');
if (functionality.inventoryRules?.backpackMobilityPenalty !== 1) throw new Error('Backpack must impose a one-point mobility penalty.');
if (!Array.isArray(functionality.vendorArchetypes) || !functionality.vendorArchetypes.some(vendor => vendor.machine)) throw new Error('At least one vending-machine archetype is required.');

const worldSchema = JSON.parse(fs.readFileSync(path.join(root, 'data/barotrauma/tools/world/world-state-schema.json'), 'utf8'));
if (worldSchema.canonicalStart !== '2175-01-01T00:00:00.000Z') throw new Error('The canonical world start must remain 2175-01-01.');
if (worldSchema.realEpoch !== '2026-06-20T08:00:00.000Z') throw new Error('The real-time epoch must remain the beginning of June 20, 2026 in Sitka.');
if (worldSchema.mapDefaults?.rings < 40 || worldSchema.mapDefaults?.rings > 50) throw new Error('Default center depth must remain within the requested forty-to-fifty-voyage range.');
if (worldSchema.mapDefaults?.minimumCenterVoyages !== worldSchema.mapDefaults?.rings) throw new Error('Every depth ring must represent one mandatory inward voyage.');
if (worldSchema.mapDefaults?.stationTarget < 180) throw new Error('The campaign-scale world must guarantee at least 180 stations.');
if (worldSchema.mapDefaults?.shellRadiusMultiplier < 24) throw new Error('The campaign-scale shell must remain at least twenty-four times the original baseline.');
if (worldSchema.mapDefaults?.totalLocations < 960) throw new Error('The campaign-scale world must default to at least 960 locations.');
if (worldSchema.mapDefaults?.minimumNodesPerRing < 8) throw new Error('Each depth ring must retain at least eight generated locations.');
if (!worldSchema.submissionKinds?.includes('research') || !worldSchema.submissionKinds?.includes('game-state')) throw new Error('World submissions must include research and full game-state records.');
if (worldSchema.researchRules?.minimumMarks < 25000 || worldSchema.researchRules?.minimumSupplies < 50) throw new Error('Over-limit R&D must retain exorbitant minimum funding requirements.');

const message = `Validated ${runtimePaths.length} runtime fragments (${source.length.toLocaleString()} characters), ${jsonPaths.length} JSON registries, inventory rules, ${worldSchema.mapDefaults.rings}-voyage world depth, ${worldSchema.mapDefaults.totalLocations} locations, ${worldSchema.mapDefaults.stationTarget} generated stations, unified submissions, and controlled R&D configuration.`;
console.log(message);

if (process.env.VALIDATION_RECEIPT) {
  const receiptPath = path.join(root, process.env.VALIDATION_RECEIPT);
  fs.mkdirSync(path.dirname(receiptPath), { recursive: true });
  fs.writeFileSync(receiptPath, `${JSON.stringify({
    status: 'passed',
    validatedAt: new Date().toISOString(),
    sourceCommit: process.env.GITHUB_SHA || '',
    runtimeFragments: runtimePaths.length,
    runtimeCharacters: source.length,
    jsonRegistries: jsonPaths.length,
    itemFunctionalitySchema: functionality.schemaVersion || '',
    worldStateSchema: worldSchema.schemaVersion || '',
    canonicalStart: worldSchema.canonicalStart,
    realEpoch: worldSchema.realEpoch,
    defaultRings: worldSchema.mapDefaults.rings,
    minimumCenterVoyages: worldSchema.mapDefaults.minimumCenterVoyages,
    defaultLocations: worldSchema.mapDefaults.totalLocations,
    guaranteedStations: worldSchema.mapDefaults.stationTarget,
    shellRadius: worldSchema.mapDefaults.shellRadius,
    shellRadiusMultiplier: worldSchema.mapDefaults.shellRadiusMultiplier,
    minimumNodesPerRing: worldSchema.mapDefaults.minimumNodesPerRing,
    researchMinimumMarks: worldSchema.researchRules.minimumMarks,
    researchMinimumSupplies: worldSchema.researchRules.minimumSupplies,
    toolbeltSlots: functionality.inventoryRules.toolbeltSlots,
    backpackSlots: functionality.inventoryRules.backpackSlots,
    backpackMobilityPenalty: functionality.inventoryRules.backpackMobilityPenalty,
    vendingMachineArchetypes: functionality.vendorArchetypes.filter(vendor => vendor.machine).length,
    message
  }, null, 2)}\n`);
}
