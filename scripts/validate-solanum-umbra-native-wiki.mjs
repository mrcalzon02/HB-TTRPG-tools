import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const index = JSON.parse(await fs.readFile(path.join(root,'data','solanum-umbra','wiki','wiki-index.json'),'utf8'));

if (index.setting !== 'Solanum Umbra' || index.schemaVersion !== '0.5.0' || index.status !== 'native-foundation-import-active') throw new Error('Unexpected Solanum Umbra wiki identity, schema, or status.');
if (index.mechanicsPolicy?.system !== 'Solanum Umbra native rules' || index.mechanicsPolicy?.conversion !== 'none') throw new Error('Solanum Umbra must preserve native mechanics without external conversion.');
if (!index.mechanicsPolicy?.ambiguityPolicy?.includes('unclear') || !index.mechanicsPolicy?.ambiguityPolicy?.includes('conflicting')) throw new Error('Solanum ambiguity policy is incomplete.');
if (index.binaryPath !== 'SRC/Solanum-Umbra-TTRPG.pdf' || index.binaryTransferStatus !== 'present-in-git-and-identity-verified') throw new Error('Solanum source binary state is incorrect.');

const expectedPacks = [
  'data/solanum-umbra/wiki/native-rules-pass-1-character-creation.json',
  'data/solanum-umbra/wiki/native-rules-pass-2-career-talents-backgrounds.json',
  'data/solanum-umbra/wiki/native-rules-pass-3-crafting-resources.json',
  'data/solanum-umbra/wiki/native-rules-pass-4-combat-cover-vehicles.json',
  'data/solanum-umbra/wiki/native-rules-pass-5-entity-generator.json',
  'data/solanum-umbra/wiki/native-enemies-pass-1-synthesis-forces.json',
  'data/solanum-umbra/wiki/native-rules-pass-6-cybernetics-biotics-degradation.json',
  'data/solanum-umbra/wiki/native-rules-pass-7-advancement-equipment.json'
];
if (!Array.isArray(index.packs) || index.packs.length !== expectedPacks.length) throw new Error('Unexpected Solanum pack count.');
for (let i = 0; i < expectedPacks.length; i += 1) if (index.packs[i] !== expectedPacks[i]) throw new Error(`Unexpected Solanum pack at position ${i + 1}.`);

const packs = [];
for (const packPath of expectedPacks) {
  const pack = JSON.parse(await fs.readFile(path.join(root,packPath),'utf8'));
  if (pack.setting !== 'Solanum Umbra' || pack.schemaVersion !== '0.1.0' || pack.mechanicsPolicy !== 'native-system-preserved-no-external-conversion') throw new Error(`Invalid native pack contract: ${packPath}.`);
  if (!Array.isArray(pack.entries) || pack.entries.length === 0) throw new Error(`Empty native pack: ${packPath}.`);
  packs.push(pack);
}

const allEntries = packs.flatMap(pack => pack.entries);
if (allEntries.length !== 36) throw new Error(`Expected 36 imported entries, found ${allEntries.length}.`);
const entries = new Map();
for (const entry of allEntries) {
  if (entries.has(entry.id)) throw new Error(`Duplicate Solanum entry '${entry.id}'.`);
  entries.set(entry.id,entry);
  for (const field of ['id','title','category','summary','sourceStatus']) if (!entry[field]) throw new Error(`${entry.id || 'unknown'} lacks '${field}'.`);
  if (!Array.isArray(entry.body) || entry.body.length === 0 || !Array.isArray(entry.tags) || entry.tags.length === 0) throw new Error(`${entry.id} lacks body text or tags.`);
  if (!Array.isArray(entry.sourceRefs) || entry.sourceRefs.length === 0) throw new Error(`${entry.id} lacks provenance.`);
  for (const ref of entry.sourceRefs) {
    if (ref.sourceId !== 'solanum-umbra-ttrpg' || ref.fileName !== 'Solanum-Umbra-TTRPG.pdf') throw new Error(`${entry.id} has unrelated provenance.`);
    if (!Number.isInteger(ref.pageStart) || !Number.isInteger(ref.pageEnd) || ref.pageStart < 1 || ref.pageEnd > 248 || ref.pageStart > ref.pageEnd) throw new Error(`${entry.id} has an invalid page range.`);
  }
}

function maps(entry) { return new Map((entry.tables || []).map(table => [table.id,table])); }
function requireTable(map,id,count) {
  const table = map.get(id);
  if (!table || !Array.isArray(table.columns) || !Array.isArray(table.rows) || table.rows.length !== count) throw new Error(`Table '${id}' must contain ${count} rows.`);
  for (const row of table.rows) if (!Array.isArray(row) || row.length !== table.columns.length) throw new Error(`Malformed row in '${id}'.`);
  return table;
}

const requiredIds = [
  'solanum-character-creation-system','solanum-core-attributes-derived-statistics','solanum-origins-careers-skills-motivations','solanum-ancestries-and-cyborg-variants','solanum-full-cyberization-threshold','solanum-data-seizure-progression','solanum-character-sheet-schema',
  'solanum-career-talent-system','solanum-background-generation-system','solanum-native-action-and-equipment-requirements','solanum-item-creation-system','solanum-crafting-support-modifiers','solanum-resource-and-communications-tiers',
  'solanum-core-combat-system','solanum-native-skills-actions','solanum-action-economy-grid-zoc','solanum-melee-combat-modes','solanum-ranged-cover-camouflage','solanum-vehicle-combat-framework','solanum-fay-entity-generator',
  'solanum-unit-zero-forces','solanum-techno-phantom-collective','solanum-bio-machine-juggernauts','solanum-anarchic-swarm','solanum-synthesis-enemy-role-roster',
  'solanum-cybernetic-replacement-framework','solanum-biotic-enhancement-catalogue','solanum-secure-cybernetic-interfaces','solanum-long-term-cybernetic-degradation',
  'solanum-profession-advancement-tree','solanum-knife-catalogue','solanum-firearms-catalogue','solanum-healing-items-catalogue','solanum-armor-and-pack-catalogue','solanum-communications-and-resource-catalogue','solanum-trade-and-synthesis-salvage'
];
for (const id of requiredIds) if (!entries.has(id)) throw new Error(`Missing Solanum entry '${id}'.`);

const creation = entries.get('solanum-character-creation-system');
if (creation.creationSequence?.length !== 12) throw new Error('Character creation must contain twelve steps.');
const creationText = [creation.summary,...creation.body,...creation.creationSequence].join(' ').toLowerCase();
for (const phrase of ['roll 1d20 for strength','health = constitution + strength','armor = constitution + dexterity','initiative = dexterity + intelligence','skill = intelligence + wisdom']) if (!creationText.includes(phrase)) throw new Error(`Character creation lacks '${phrase}'.`);

const attributes = maps(entries.get('solanum-core-attributes-derived-statistics'));
requireTable(attributes,'solanum-six-attributes',6);
const derived = requireTable(attributes,'solanum-derived-statistics',4);
requireTable(attributes,'solanum-attribute-bonus-penalty',7);
const formulaMap = new Map(derived.rows.map(row => [row[0],row[1]]));
for (const [name,formula] of [['Health','CON + STR'],['Armor','CON + DEX'],['Initiative','DEX + INT'],['SKILL','INT + WIS']]) if (formulaMap.get(name) !== formula) throw new Error(`Incorrect native formula for ${name}.`);
const ambiguousBand = attributes.get('solanum-attribute-bonus-penalty').rows.find(row => row[0] === '9–11');
if (!ambiguousBand || ambiguousBand[1] !== '-1 to +1' || ambiguousBand[3] !== 'Ambiguous within range') throw new Error('Attribute 9–11 ambiguity was lost.');

const originTables = maps(entries.get('solanum-origins-careers-skills-motivations'));
for (const [id,count] of [['solanum-origin-table',5],['solanum-career-list',6],['solanum-mechanic-benefits',4],['solanum-mechanic-skills',4],['solanum-motivation-table',5]]) requireTable(originTables,id,count);
const seizure = requireTable(maps(entries.get('solanum-data-seizure-progression')),'solanum-data-seizure-stages',6);
if (seizure.rows[5][0] !== '18+ months' || seizure.rows[5][5] !== '100%') throw new Error('Fatal data-seizure stage is incorrect.');
if (![entries.get('solanum-full-cyberization-threshold').summary,...entries.get('solanum-full-cyberization-threshold').body].join(' ').includes('more than 49%')) throw new Error('The 49% threshold was lost.');
if (entries.get('solanum-character-sheet-schema').characterSheetFields?.length !== 7) throw new Error('Character sheet schema is incomplete.');

const career = entries.get('solanum-career-talent-system');
const careerTables = maps(career);
let careerResults = 0;
for (const family of ['hunter','mechanic','medic','scavenger','warlord']) {
  careerResults += requireTable(careerTables,`solanum-${family}-minor-talents`,7).rows.length;
  careerResults += requireTable(careerTables,`solanum-${family}-major-talents`,5).rows.length;
}
if (careerTables.size !== 10 || careerResults !== 60) throw new Error('Career talent counts are incorrect.');
const careerText = [career.summary,...career.body].join(' ');
if (!careerText.includes('Trader') || !careerText.includes('no Trader Minor or Major Talent table') || !careerText.includes('-4 penalty')) throw new Error('Trader omission or untrained rule was lost.');
const backgrounds = maps(entries.get('solanum-background-generation-system'));
for (const [id,count] of [['solanum-upbringing',7],['solanum-key-life-events',7],['solanum-personal-relationships',7],['solanum-deep-motivations',5],['solanum-fears-flaws',5],['solanum-significant-possessions',7]]) requireTable(backgrounds,id,count);

const crafting = entries.get('solanum-item-creation-system');
const craftingTables = maps(crafting);
for (const [id,count] of [['solanum-crafting-technology',6],['solanum-crafting-resource-availability',5],['solanum-crafting-complexity-time',5],['solanum-crafting-outcomes',5]]) requireTable(craftingTables,id,count);
if (crafting.procedure?.length !== 6 || crafting.workedExample?.finalResult !== '22' || crafting.workedExample?.outcome !== 'Exceptional Success') throw new Error('Crafting procedure or example is incorrect.');
if (![crafting.summary,...crafting.body].join(' ').includes('adds them to the d20 result')) throw new Error('Crafting ambiguity was lost.');
const support = maps(entries.get('solanum-crafting-support-modifiers'));
for (const [id,count] of [['solanum-crafting-mentors',4],['solanum-crafting-tools',4],['solanum-crafting-skill-level',5],['solanum-crafting-workshops',5],['solanum-crafting-materials',5]]) requireTable(support,id,count);

const coreCombat = entries.get('solanum-core-combat-system');
if (!coreCombat.formulas?.some(record => record.formula === 'd20 + Initiative Stat') || ![coreCombat.summary,...coreCombat.body].join(' ').includes('one action per turn')) throw new Error('Core combat rules are incomplete.');
requireTable(maps(entries.get('solanum-native-skills-actions')),'solanum-skill-action-pairings',20);
const zoc = maps(entries.get('solanum-action-economy-grid-zoc'));
requireTable(zoc,'solanum-grid-movement',3);
if (!requireTable(zoc,'solanum-zone-control',6).rows.some(row => row[0] === 'Tie' && row[1] === 'Not defined in source')) throw new Error('Zone-of-control ambiguity was lost.');
const melee = entries.get('solanum-melee-combat-modes');
requireTable(maps(melee),'solanum-melee-direct-formulas',3);
requireTable(maps(melee),'solanum-melee-primary-stat-method',3);
if (melee.sourceStatus !== 'source-native-mechanics-with-explicit-conflict') throw new Error('Melee conflict is no longer explicit.');
const ranged = maps(entries.get('solanum-ranged-cover-camouflage'));
for (const [id,count] of [['solanum-ranged-tech-ranges',6],['solanum-cover-camouflage-modifiers',6],['solanum-cover-defensive-values',6],['solanum-cover-economy',4]]) requireTable(ranged,id,count);
if (!ranged.get('solanum-ranged-tech-ranges').rows[5][2].includes('unresolved')) throw new Error('Advanced Tech range ambiguity was lost.');
const vehicles = maps(entries.get('solanum-vehicle-combat-framework'));
requireTable(vehicles,'solanum-vehicle-combat-summary',7);
requireTable(vehicles,'solanum-vehicle-weapon-tiers',6);

const entity = entries.get('solanum-fay-entity-generator');
if (entity.generationSequence?.length !== 7) throw new Error('Entity generator sequence is incomplete.');
const entityTables = maps(entity);
for (const [id,count] of [['solanum-entity-type',10],['solanum-entity-size',8],['solanum-entity-appearance',12],['solanum-entity-behavior',10],['solanum-entity-abilities',12],['solanum-entity-weakness',8],['solanum-entity-motivation',10]]) requireTable(entityTables,id,count);

const roster = entries.get('solanum-synthesis-enemy-role-roster');
if (roster.enemyProfiles?.length !== 36) throw new Error('Expected 36 enemy profiles.');
const factionCounts = new Map();
const roles = new Set();
for (const profile of roster.enemyProfiles) {
  for (const field of ['faction','role','name','design','strength','weakness']) if (!profile[field]) throw new Error(`Enemy profile lacks '${field}'.`);
  factionCounts.set(profile.faction,(factionCounts.get(profile.faction) || 0) + 1);
  roles.add(profile.role);
}
if (factionCounts.size !== 4 || [...factionCounts.values()].some(count => count !== 9) || roles.size !== 9) throw new Error('Enemy faction or role counts are incorrect.');
if (roster.enemyProfiles.filter(profile => profile.name === 'The Devourers').length !== 2) throw new Error('Duplicated Devourer names must remain faction-separated.');

const cyber = entries.get('solanum-cybernetic-replacement-framework');
const cyberTables = maps(cyber);
for (const [id,count] of [['solanum-cybernetic-tech-levels',5],['solanum-cybernetic-body-part-costs',8],['solanum-cybernetic-installation',5],['solanum-prosthetic-performance',5],['solanum-cybernetic-body-percentage',5],['solanum-biotic-power-requirements',5]]) requireTable(cyberTables,id,count);
const upperArm = cyberTables.get('solanum-cybernetic-body-part-costs').rows.find(row => row[0] === 'Upper Arm');
if (!upperArm || upperArm[4] !== '7,500' || cyber.workedExample?.sourceFinalCost !== '7,500 credits' || !cyber.workedExample?.formulaStatus?.includes('inconsistent')) throw new Error('Cybernetic cost conflict or example is incorrect.');
if (cyber.sourceStatus !== 'source-native-mechanics-with-explicit-conflict') throw new Error('Cybernetic formula conflict is no longer explicit.');
const enhancements = requireTable(maps(entries.get('solanum-biotic-enhancement-catalogue')),'solanum-biotic-enhancements',12);
if (!enhancements.rows.some(row => row[0] === 'Temporal Manipulator' && row[6] === '75,000-150,000')) throw new Error('Temporal Manipulator record is incorrect.');
requireTable(maps(entries.get('solanum-secure-cybernetic-interfaces')),'solanum-cybernetic-security-practices',6);
const degradation = entries.get('solanum-long-term-cybernetic-degradation');
const degradationTable = requireTable(maps(degradation),'solanum-cybernetic-degradation',21);
if (degradation.procedure?.length !== 6 || degradationTable.rows[20][2] !== 'Fatal System Failure' || !degradation.body.join(' ').includes('once every 1d6 years')) throw new Error('Long-term degradation system is incomplete.');

const advancement = maps(entries.get('solanum-profession-advancement-tree'));
const novice = requireTable(advancement,'solanum-novice-progression',6);
const expert = requireTable(advancement,'solanum-expert-progression',6);
requireTable(advancement,'solanum-advancement-summary',4);
if (novice.rows[5][2] !== '38,500' || !novice.rows[5][3].includes('Transition to Expert')) throw new Error('Novice-to-Expert progression is incorrect.');
if (expert.rows[5][2] !== '60,500' || !expert.rows[5][3].includes('Transition to Master')) throw new Error('Expert-to-Master progression is incorrect.');

const knives = requireTable(maps(entries.get('solanum-knife-catalogue')),'solanum-knives',6);
if (knives.rows[5][3] !== '2d6' || knives.rows[5][5] !== '+3 melee defense') throw new Error('Advanced knife values are incorrect.');
const firearms = maps(entries.get('solanum-firearms-catalogue'));
const pistols = requireTable(firearms,'solanum-pistols',6);
const rifles = requireTable(firearms,'solanum-rifles',6);
if (pistols.rows[5][3] !== '3d6' || rifles.rows[5][3] !== '4d6' || rifles.rows[5][2] !== '1,500') throw new Error('Advanced firearm values are incorrect.');
const healing = requireTable(maps(entries.get('solanum-healing-items-catalogue')),'solanum-healing-items',6);
if (healing.rows[5][3] !== 'Heals 5d6 HP' || healing.rows[5][4] !== '+4 recovery rate') throw new Error('Advanced healing values are incorrect.');
const armor = maps(entries.get('solanum-armor-and-pack-catalogue'));
for (const id of ['solanum-head-armor','solanum-body-armor','solanum-arm-armor','solanum-hand-armor','solanum-foot-armor','solanum-packs']) requireTable(armor,id,6);
if (armor.get('solanum-body-armor').rows[5][2] !== '+7 body defense; active shields and environmental protection') throw new Error('Advanced body armor value is incorrect.');
const detailedResources = maps(entries.get('solanum-communications-and-resource-catalogue'));
requireTable(detailedResources,'solanum-detailed-communications',6);
requireTable(detailedResources,'solanum-detailed-resources',6);
const trade = maps(entries.get('solanum-trade-and-synthesis-salvage'));
requireTable(trade,'solanum-trade-goods',6);
const salvage = requireTable(trade,'solanum-synthesis-salvage',6);
if (salvage.rows[5][1] !== '1,500' || !salvage.rows[5][2].includes('integrated AI')) throw new Error('Advanced Synthesis salvage value is incorrect.');

const serialized = JSON.stringify(packs);
for (const forbidden of ['baseAttack','challengeRating','savingThrow','spellLevel','Hypertext d20 / 3.5-compatible']) if (serialized.includes(forbidden)) throw new Error(`External-system field '${forbidden}' leaked into Solanum data.`);

if (index.completedScope?.wikiEntries !== 36 || index.completedScope?.nativePacks !== 8 || index.completedScope?.professionAdvancementTracks !== 2 || index.completedScope?.generalEquipmentEntries !== 7) throw new Error('Solanum index completed scope does not match imported data.');

console.log('Solanum Umbra native wiki validation passed.');
console.log('Verified eight native packs, thirty-six entries, character creation, careers, advancement, cybernetics, crafting, equipment, combat, vehicles, entity generation, four enemy factions, and thirty-six force roles.');
