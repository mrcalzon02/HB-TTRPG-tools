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
  'data/barotrauma/tools/runtime/barotrauma-rpg-tools.part-06-faction-seeding.txt',
  'data/barotrauma/tools/runtime/barotrauma-rpg-tools.part-06-faction-stability.txt',
  'data/barotrauma/tools/runtime/barotrauma-rpg-tools.part-06-location-levels.txt',
  'data/barotrauma/tools/runtime/barotrauma-rpg-tools.part-06-location-level-stability.txt',
  'data/barotrauma/tools/runtime/barotrauma-rpg-tools.part-06-location-level-polish.txt',
  'data/barotrauma/tools/runtime/barotrauma-rpg-tools.part-06-research-validation.txt',
  'data/barotrauma/tools/runtime/barotrauma-rpg-tools.part-06-world-research-patch.txt',
  'data/barotrauma/tools/runtime/barotrauma-rpg-tools.part-06-route-crossing-core.txt',
  'data/barotrauma/tools/runtime/barotrauma-rpg-tools.part-06-route-crossing-ui.txt',
  'data/barotrauma/tools/runtime/barotrauma-rpg-tools.part-06-route-crossing-stability.txt',
  'data/barotrauma/tools/runtime/barotrauma-rpg-tools.part-06-creature-encounters-core.txt',
  'data/barotrauma/tools/runtime/barotrauma-rpg-tools.part-06-creature-encounters-ui.txt',
  'data/barotrauma/tools/runtime/barotrauma-rpg-tools.part-06-expedition-integration-core.txt',
  'data/barotrauma/tools/runtime/barotrauma-rpg-tools.part-06-expedition-map-ui.txt',
  'data/barotrauma/tools/runtime/barotrauma-rpg-tools.part-06-expedition-integration-stability.txt',
  'data/barotrauma/tools/runtime/barotrauma-rpg-tools.part-06-expedition-integration-fix.txt',
  'data/barotrauma/tools/runtime/barotrauma-rpg-tools.part-06-expedition-group-stability.txt',
  'data/barotrauma/tools/runtime/barotrauma-rpg-tools.part-06.txt'
];
const orderIndexes = requiredOrder.map(relativePath => runtimePaths.indexOf(relativePath));
if (orderIndexes.some(index => index < 0)) throw new Error('One or more required inventory, crew, cargo, commerce, world, faction, location, research, crossing, creature, expedition, or integration runtime fragments are not registered.');
for (let index = 1; index < orderIndexes.length; index += 1) {
  if (orderIndexes[index] <= orderIndexes[index - 1]) throw new Error(`Runtime fragment order is invalid near ${requiredOrder[index]}.`);
}

const source = runtimePaths.map(relativePath => {
  const absolutePath = path.join(root, relativePath);
  if (!fs.existsSync(absolutePath)) throw new Error(`Missing runtime fragment: ${relativePath}`);
  return fs.readFileSync(absolutePath, 'utf8');
}).join('');

new Function(source);

const requiredRuntimeMarkers = [
  ['normalizeManagedExpedition', 'Managed submarine, crew, and group integration is missing.'],
  ['generateValidCrossing', 'Graph-backed route crossing generation is missing.'],
  ['managed-sub-location-marker', 'Managed submarine world-map location marker is missing.'],
  ["frame.addEventListener('wheel'", 'Pointer-centered world-map wheel zoom is missing.'],
  ['mapEdgeTooltipHtml', 'World-map route hover information is missing.'],
  ['stationDetailsHtml', 'Station click-detail information is missing.'],
  ['declareManagedSubmarineLostWithAllHands', 'Lost-with-all-hands handling is missing.'],
  ['selectQuarterSalvage', 'Deterministic quarter-salvage selection is missing.'],
  ['recoverableMarks', 'Wreck value recovery is missing.'],
  ['creaturePoolForLevel', 'Depth-gated creature pools are missing.'],
  ['drawCreatureEncounter', 'Creature encounter generation is missing.'],
  ['creatureSeverityProfile', 'Creature severity progression is missing.'],
  ['creatureFailureApplied', 'Creature failure consequences are missing.'],
  ['Enable Level 10 ending creatures', 'The endgame creature-pool control is missing.']
];
for (const [marker, error] of requiredRuntimeMarkers) if (!source.includes(marker)) throw new Error(error);

const jsonPaths = [
  'data/barotrauma/tools/catalog/catalog-index.json',
  'data/barotrauma/tools/submarines/submarine-roster.json',
  'data/barotrauma/tools/custom/custom-content-schema.json',
  'data/barotrauma/tools/items/item-functionality.json',
  'data/barotrauma/tools/world/world-state-schema.json',
  'data/barotrauma/tools/factions/faction-registry.json',
  'data/barotrauma/tools/locations/location-level-registry.json',
  'data/barotrauma/tools/creatures/creature-registry.json',
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
if (!worldSchema.submissionKinds?.includes('research') || !worldSchema.submissionKinds?.includes('faction') || !worldSchema.submissionKinds?.includes('game-state')) throw new Error('World submissions must include research, faction, and full game-state records.');
if (worldSchema.researchRules?.minimumMarks < 25000 || worldSchema.researchRules?.minimumSupplies < 50) throw new Error('Over-limit R&D must retain exorbitant minimum funding requirements.');

const factions = JSON.parse(fs.readFileSync(path.join(root, 'data/barotrauma/tools/factions/faction-registry.json'), 'utf8'));
if (!Array.isArray(factions.districts) || factions.districts.length < 8) throw new Error('Faction seeding requires at least eight operational districts.');
if (!Array.isArray(factions.umbrellas) || factions.umbrellas.length < 8) throw new Error('Faction seeding requires Coalition, Separatist, Union, corporate, independent, criminal, and cult umbrellas.');
if (!Array.isArray(factions.organizations) || factions.organizations.length < 30) throw new Error('Faction seeding requires at least thirty operational organizations.');
const requiredUmbrellas = ['europan-coalition', 'jovian-separatists', 'standard-union-208', 'corporate-enclaves', 'criminal-cartels', 'children-of-the-honkmother', 'church-of-the-husk'];
for (const id of requiredUmbrellas) if (!factions.umbrellas.some(item => item.id === id)) throw new Error(`Missing required umbrella faction: ${id}`);
if (!factions.organizations.some(item => item.id === 'the-combine')) throw new Error('The Primer-backed Combine must remain in the criminal faction seed.');
if (!factions.organizations.some(item => item.parent === 'standard-union-208' && item.station)) throw new Error('Union 208 must retain station-based chapters and representation.');
if (!factions.organizations.some(item => item.parent === 'corporate-enclaves' && item.type.includes('distributor'))) throw new Error('Material distributors must remain represented in the faction registry.');
if (!factions.organizations.some(item => item.parent === 'children-of-the-honkmother' && item.hidden) || !factions.organizations.some(item => item.parent === 'church-of-the-husk' && item.hidden)) throw new Error('Both cults require hidden operational subsets.');

const locations = JSON.parse(fs.readFileSync(path.join(root, 'data/barotrauma/tools/locations/location-level-registry.json'), 'utf8'));
if (!Array.isArray(locations.levels) || locations.levels.length !== 10) throw new Error('The location registry must contain exactly ten levels.');
if (!Array.isArray(locations.locations) || locations.locations.length !== 48) throw new Error('The location registry must contain exactly the forty-eight requested location types.');
for (let level = 1; level <= 10; level += 1) if (!locations.levels.some(item => item.level === level)) throw new Error(`Missing location level ${level}.`);
if (locations.locations.filter(item => item.unique).length !== 1 || locations.locations.find(item => item.unique)?.id !== 'eye-of-europa') throw new Error('Eye of Europa must be the only unique location.');
if (locations.locations.find(item => item.id === 'eye-of-europa')?.level !== 10) throw new Error('Eye of Europa must remain Level 10.');
if (locations.locations.some(item => item.level === 6 && item.stationEligible)) throw new Error('Level 6 must remain completely derelict and non-commercial.');
if (locations.locations.some(item => item.level === 9 && item.stationEligible)) throw new Error('Level 9 must remain precursor ruins or dead zones rather than ordinary stations.');
if (locations.locations.some(item => !item.encounterEligible)) throw new Error('Every listed location type must be available to the encounter generator.');
for (const item of locations.locations) {
  if (!item.id || !item.name || !item.lore || !item.encounter || !item.reward || !item.failure) throw new Error(`Incomplete location lore or encounter profile: ${item.id || item.name || 'unknown'}`);
  if (!Array.isArray(item.shops) || !Array.isArray(item.services) || !Array.isArray(item.hazards)) throw new Error(`Location shops, services, and hazards must be arrays: ${item.id}`);
}
const levelForRing = (ring, rings) => ring === 0 ? 10 : Math.min(9, Math.max(1, 1 + Math.floor((rings - ring) * 9 / rings)));
if (levelForRing(48, 48) !== 1) throw new Error('The outermost ring must be Level 1.');
if (levelForRing(1, 48) !== 9) throw new Error('The innermost non-core ring must be Level 9.');
if (levelForRing(0, 48) !== 10) throw new Error('Ring zero must be Level 10.');

const creatures = JSON.parse(fs.readFileSync(path.join(root, 'data/barotrauma/tools/creatures/creature-registry.json'), 'utf8'));
const allowedCreatureClasses = new Set(['small','large','abyssal','ending']);
if (creatures.source?.url !== 'https://barotraumagame.com/wiki/Creatures') throw new Error('Creature registry must retain the official wiki source URL.');
if (!Array.isArray(creatures.creatures) || creatures.creatures.length < 35) throw new Error('Creature encounter registry must contain a substantial official-wiki selection.');
if (!Array.isArray(creatures.progression) || creatures.progression.length < 6) throw new Error('Creature severity progression must cover all ten location levels.');
const creatureIds = creatures.creatures.map(item => item.id);
if (new Set(creatureIds).size !== creatureIds.length) throw new Error('Creature identifiers must be unique.');
for (const creature of creatures.creatures) {
  if (!creature.id || !creature.name || !creature.wikiTitle) throw new Error(`Incomplete creature identity: ${creature.id || creature.name || 'unknown'}`);
  if (!allowedCreatureClasses.has(creature.officialClass)) throw new Error(`Unsupported official creature class: ${creature.officialClass}`);
  if (creature.minLevel < 1 || creature.maxLevel > 10 || creature.minLevel > creature.maxLevel) throw new Error(`Invalid creature level range: ${creature.name}`);
  if (creature.officialClass === 'small' && creature.canEnterSubmarine !== true) throw new Error(`Official Small creature must remain boarding-capable: ${creature.name}`);
  if (['large','abyssal'].includes(creature.officialClass) && creature.canEnterSubmarine !== false) throw new Error(`Official ${creature.officialClass} creature must remain external-only: ${creature.name}`);
  if (creature.officialClass === 'abyssal' && creature.minLevel < 8) throw new Error(`Abyssal creature unlocked before Level 8: ${creature.name}`);
  if (creature.officialClass === 'ending' && (!creature.endingOnly || creature.minLevel !== 10 || creature.maxLevel !== 10)) throw new Error(`Ending creature is not hard-locked to Level 10: ${creature.name}`);
}
for (let level = 1; level <= 10; level += 1) {
  if (!creatures.progression.some(item => level >= item.minLevel && level <= item.maxLevel)) throw new Error(`Creature severity progression does not cover Level ${level}.`);
  const available = creatures.creatures.filter(item => level >= item.minLevel && level <= item.maxLevel && (!item.endingOnly || level === 10));
  if (!available.length) throw new Error(`No creatures are available at Level ${level}.`);
  if (level < 10 && available.some(item => item.officialClass === 'ending' || item.endingOnly)) throw new Error(`Ending creatures leaked into Level ${level}.`);
}

const message = `Validated ${runtimePaths.length} runtime fragments (${source.length.toLocaleString()} characters), ${jsonPaths.length} JSON registries, ${worldSchema.mapDefaults.rings}-voyage world depth, ${worldSchema.mapDefaults.totalLocations} locations, ${worldSchema.mapDefaults.stationTarget} stations, ${factions.districts.length} districts, ${factions.umbrellas.length} umbrella factions, ${factions.organizations.length} operational organizations, ${locations.levels.length} location levels, ${locations.locations.length} station/encounter types, ${creatures.creatures.length} creature profiles, six depth-severity bands, Level 10 ending locks, linked managed expeditions, pointer-centered map zoom, route inspection, lost-with-all-hands wrecks, quarter-salvage, unified submissions, and controlled R&D.`;
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
    factionRegistrySchema: factions.schemaVersion || '',
    locationLevelRegistrySchema: locations.schemaVersion || '',
    creatureRegistrySchema: creatures.schemaVersion || '',
    creatureProfiles: creatures.creatures.length,
    creatureSeverityBands: creatures.progression.length,
    endingCreatureProfiles: creatures.creatures.filter(item => item.endingOnly).length,
    abyssalCreatureProfiles: creatures.creatures.filter(item => item.officialClass === 'abyssal').length,
    canonicalStart: worldSchema.canonicalStart,
    realEpoch: worldSchema.realEpoch,
    defaultRings: worldSchema.mapDefaults.rings,
    minimumCenterVoyages: worldSchema.mapDefaults.minimumCenterVoyages,
    defaultLocations: worldSchema.mapDefaults.totalLocations,
    guaranteedStations: worldSchema.mapDefaults.stationTarget,
    shellRadius: worldSchema.mapDefaults.shellRadius,
    shellRadiusMultiplier: worldSchema.mapDefaults.shellRadiusMultiplier,
    operationalDistricts: factions.districts.length,
    umbrellaFactions: factions.umbrellas.length,
    operationalOrganizations: factions.organizations.length,
    locationLevels: locations.levels.length,
    locationTypes: locations.locations.length,
    stationLocationTypes: locations.locations.filter(item => item.stationEligible).length,
    encounterLocationTypes: locations.locations.filter(item => item.encounterEligible).length,
    researchMinimumMarks: worldSchema.researchRules.minimumMarks,
    researchMinimumSupplies: worldSchema.researchRules.minimumSupplies,
    toolbeltSlots: functionality.inventoryRules.toolbeltSlots,
    backpackSlots: functionality.inventoryRules.backpackSlots,
    backpackMobilityPenalty: functionality.inventoryRules.backpackMobilityPenalty,
    vendingMachineArchetypes: functionality.vendorArchetypes.filter(vendor => vendor.machine).length,
    expeditionIntegrationVersion: '1.0.0',
    message
  }, null, 2)}\n`);
}
