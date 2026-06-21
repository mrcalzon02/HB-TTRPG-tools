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
  'data/barotrauma/tools/runtime/barotrauma-rpg-tools.part-06.txt'
];
const orderIndexes = requiredOrder.map(relativePath => runtimePaths.indexOf(relativePath));
if (orderIndexes.some(index => index < 0)) throw new Error('One or more required inventory, crew, cargo, commerce, or suitability runtime fragments are not registered.');
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
  'data/barotrauma-tools-registry.json'
];
for (const relativePath of jsonPaths) JSON.parse(fs.readFileSync(path.join(root, relativePath), 'utf8'));

const functionality = JSON.parse(fs.readFileSync(path.join(root, 'data/barotrauma/tools/items/item-functionality.json'), 'utf8'));
if (functionality.inventoryRules?.toolbeltSlots !== 4) throw new Error('Toolbelt must provide exactly four tracked inventory slots.');
if (functionality.inventoryRules?.backpackSlots !== 4) throw new Error('Backpack must provide exactly four tracked inventory slots.');
if (functionality.inventoryRules?.backpackMobilityPenalty !== 1) throw new Error('Backpack must impose a one-point mobility penalty.');
if (!Array.isArray(functionality.vendorArchetypes) || !functionality.vendorArchetypes.some(vendor => vendor.machine)) throw new Error('At least one vending-machine archetype is required.');

const message = `Validated ${runtimePaths.length} runtime fragments (${source.length.toLocaleString()} characters), ${jsonPaths.length} JSON registries, inventory expansion rules, and station-vendor configuration.`;
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
    toolbeltSlots: functionality.inventoryRules.toolbeltSlots,
    backpackSlots: functionality.inventoryRules.backpackSlots,
    backpackMobilityPenalty: functionality.inventoryRules.backpackMobilityPenalty,
    vendingMachineArchetypes: functionality.vendorArchetypes.filter(vendor => vendor.machine).length,
    message
  }, null, 2)}\n`);
}
