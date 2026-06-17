import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const indexPath = path.join(root,'data','solanum-umbra','wiki','wiki-index.json');
const index = JSON.parse(await fs.readFile(indexPath,'utf8'));

if (index.setting !== 'Solanum Umbra' || index.schemaVersion !== '0.4.0') throw new Error('Unexpected Solanum Umbra wiki identity or schema.');
if (index.status !== 'native-foundation-import-active') throw new Error('Solanum Umbra native foundation import is not marked active.');
if (index.mechanicsPolicy?.system !== 'Solanum Umbra native rules' || index.mechanicsPolicy?.conversion !== 'none') throw new Error('Solanum Umbra must preserve its native rules without external conversion.');
if (!index.mechanicsPolicy?.ambiguityPolicy?.includes('unclear') || !index.mechanicsPolicy?.ambiguityPolicy?.includes('conflicting')) throw new Error('Solanum Umbra ambiguity policy is incomplete.');
if (index.binaryPath !== 'SRC/Solanum-Umbra-TTRPG.pdf' || index.binaryTransferStatus !== 'present-in-git-and-identity-verified') throw new Error('Solanum Umbra source binary path or status is incorrect.');

const expectedPacks = [
  'data/solanum-umbra/wiki/native-rules-pass-1-character-creation.json',
  'data/solanum-umbra/wiki/native-rules-pass-2-career-talents-backgrounds.json',
  'data/solanum-umbra/wiki/native-rules-pass-3-crafting-resources.json',
  'data/solanum-umbra/wiki/native-rules-pass-4-combat-cover-vehicles.json',
  'data/solanum-umbra/wiki/native-rules-pass-5-entity-generator.json',
  'data/solanum-umbra/wiki/native-enemies-pass-1-synthesis-forces.json',
  'data/solanum-umbra/wiki/native-rules-pass-6-cybernetics-biotics-degradation.json'
];
if (!Array.isArray(index.packs) || index.packs.length !== expectedPacks.length) throw new Error('Unexpected Solanum Umbra pack count.');
for (let i = 0; i < expectedPacks.length; i += 1) if (index.packs[i] !== expectedPacks[i]) throw new Error(`Unexpected Solanum pack ordering at ${i + 1}.`);

const packs = [];
for (const packPath of expectedPacks) {
  const pack = JSON.parse(await fs.readFile(path.join(root,packPath),'utf8'));
  if (pack.setting !== 'Solanum Umbra' || pack.schemaVersion !== '0.1.0') throw new Error(`Unexpected schema in ${packPath}.`);
  if (pack.mechanicsPolicy !== 'native-system-preserved-no-external-conversion') throw new Error(`Native mechanics policy missing from ${packPath}.`);
  if (!Array.isArray(pack.entries) || pack.entries.length === 0) throw new Error(`No entries found in ${packPath}.`);
  packs.push(pack);
}

const allEntries = packs.flatMap(pack => pack.entries);
if (allEntries.length !== 29) throw new Error(`Expected 29 imported entries, found ${allEntries.length}.`);
const entries = new Map();
for (const entry of allEntries) {
  if (entries.has(entry.id)) throw new Error(`Duplicate Solanum entry id '${entry.id}'.`);
  entries.set(entry.id,entry);
  for (const field of ['id','title','category','summary','sourceStatus']) if (!entry[field]) throw new Error(`${entry.id || 'unknown'} lacks '${field}'.`);
  if (!Array.isArray(entry.body) || entry.body.length === 0) throw new Error(`${entry.id} lacks body text.`);
  if (!Array.isArray(entry.sourceRefs) || entry.sourceRefs.length === 0) throw new Error(`${entry.id} lacks page provenance.`);
  if (!Array.isArray(entry.tags) || entry.tags.length === 0) throw new Error(`${entry.id} lacks search tags.`);
  for (const ref of entry.sourceRefs) {
    if (ref.sourceId !== 'solanum-umbra-ttrpg' || ref.fileName !== 'Solanum-Umbra-TTRPG.pdf') throw new Error(`${entry.id} has unrelated provenance.`);
    if (!Number.isInteger(ref.pageStart) || !Number.isInteger(ref.pageEnd) || ref.pageStart < 1 || ref.pageEnd > 248 || ref.pageStart > ref.pageEnd) throw new Error(`${entry.id} has an invalid page range.`);
  }
}

const requiredIds = [
  'solanum-character-creation-system','solanum-core-attributes-derived-statistics','solanum-origins-careers-skills-motivations','solanum-ancestries-and-cyborg-variants','solanum-full-cyberization-threshold','solanum-data-seizure-progression','solanum-character-sheet-schema',
  'solanum-career-talent-system','solanum-background-generation-system','solanum-native-action-and-equipment-requirements',
  'solanum-item-creation-system','solanum-crafting-support-modifiers','solanum-resource-and-communications-tiers',
  'solanum-core-combat-system','solanum-native-skills-actions','solanum-action-economy-grid-zoc','solanum-melee-combat-modes','solanum-ranged-cover-camouflage','solanum-vehicle-combat-framework',
  'solanum-fay-entity-generator','solanum-unit-zero-forces','solanum-techno-phantom-collective','solanum-bio-machine-juggernauts','solanum-anarchic-swarm','solanum-synthesis-enemy-role-roster',
  'solanum-cybernetic-replacement-framework','solanum-biotic-enhancement-catalogue','solanum-secure-cybernetic-interfaces','solanum-long-term-cybernetic-degradation'
];
for (const id of requiredIds) if (!entries.has(id)) throw new Error(`Missing required Solanum entry '${id}'.`);

function tableMap(entry) {
  return new Map((entry.tables || []).map(table => [table.id,table]));
}
function requireTable(map,id,rows) {
  const table = map.get(id);
  if (!table || !Array.isArray(table.columns) || !Array.isArray(table.rows) || table.rows.length !== rows) throw new Error(`Table '${id}' must contain ${rows} rows.`);
  for (const row of table.rows) if (!Array.isArray(row) || row.length !== table.columns.length) throw new Error(`Malformed row in '${id}'.`);
  return table;
}

const creation = entries.get('solanum-character-creation-system');
if (!Array.isArray(creation.creationSequence) || creation.creationSequence.length !== 12) throw new Error('Character creation must contain twelve steps.');
const creationText = [creation.summary,...creation.body,...creation.creationSequence].join(' ').toLowerCase();
for (const phrase of ['roll 1d20 for strength','health = constitution + strength','armor = constitution + dexterity','initiative = dexterity + intelligence','skill = intelligence + wisdom','cybernetic body percentage']) if (!creationText.includes(phrase)) throw new Error(`Character creation lacks '${phrase}'.`);

const attributes = tableMap(entries.get('solanum-core-attributes-derived-statistics'));
requireTable(attributes,'solanum-six-attributes',6);
const derived = requireTable(attributes,'solanum-derived-statistics',4);
requireTable(attributes,'solanum-attribute-bonus-penalty',7);
const formulas = new Map(derived.rows.map(row => [row[0],row[1]]));
const expectedFormulas = new Map([['Health','CON + STR'],['Armor','CON + DEX'],['Initiative','DEX + INT'],['SKILL','INT + WIS']]);
for (const [name,formula] of expectedFormulas) if (formulas.get(name) !== formula) throw new Error(`Incorrect native formula for ${name}.`);
const ambiguousBand = attributes.get('solanum-attribute-bonus-penalty').rows.find(row => row[0] === '9–11');
if (!ambiguousBand || ambiguousBand[1] !== '-1 to +1' || ambiguousBand[3] !== 'Ambiguous within range') throw new Error('Attribute 9–11 ambiguity was lost.');

const backgrounds = tableMap(entries.get('solanum-origins-careers-skills-motivations'));
requireTable(backgrounds,'solanum-origin-table',5);
requireTable(backgrounds,'solanum-career-list',6);
requireTable(backgrounds,'solanum-mechanic-benefits',4);
requireTable(backgrounds,'solanum-mechanic-skills',4);
requireTable(backgrounds,'solanum-motivation-table',5);

const seizureTable = requireTable(tableMap(entries.get('solanum-data-seizure-progression')),'solanum-data-seizure-stages',6);
if (seizureTable.rows[0][0] !== '0–1 weeks' || seizureTable.rows[5][0] !== '18+ months' || seizureTable.rows[5][5] !== '100%') throw new Error('Data-seizure progression endpoints are incorrect.');
if (![entries.get('solanum-full-cyberization-threshold').summary,...entries.get('solanum-full-cyberization-threshold').body].join(' ').includes('more than 49%')) throw new Error('The more-than-49% threshold was lost.');

const sheet = entries.get('solanum-character-sheet-schema');
if (sheet.characterSheetFields?.length !== 7 || sheet.formulaFields?.length !== 4) throw new Error('Native character sheet schema is incomplete.');

const career = entries.get('solanum-career-talent-system');
const careerTables = tableMap(career);
const careerFamilies = ['hunter','mechanic','medic','scavenger','warlord'];
let careerRows = 0;
for (const family of careerFamilies) {
  careerRows += requireTable(careerTables,`solanum-${family}-minor-talents`,7).rows.length;
  careerRows += requireTable(careerTables,`solanum-${family}-major-talents`,5).rows.length;
}
if (careerRows !== 60 || careerTables.size !== 10) throw new Error('Career talent families must contain 10 tables and 60 results.');
const careerText = [career.summary,...career.body].join(' ');
if (!careerText.includes('Trader') || !careerText.includes('no Trader Minor or Major Talent table') || !careerText.includes('-4 penalty')) throw new Error('Trader omission or untrained penalty was lost.');

const deepBackgrounds = tableMap(entries.get('solanum-background-generation-system'));
for (const [id,count] of [['solanum-upbringing',7],['solanum-key-life-events',7],['solanum-personal-relationships',7],['solanum-deep-motivations',5],['solanum-fears-flaws',5],['solanum-significant-possessions',7]]) requireTable(deepBackgrounds,id,count);

const crafting = entries.get('solanum-item-creation-system');
const craftingTables = tableMap(crafting);
requireTable(craftingTables,'solanum-crafting-technology',6);
requireTable(craftingTables,'solanum-crafting-resource-availability',5);
requireTable(craftingTables,'solanum-crafting-complexity-time',5);
requireTable(craftingTables,'solanum-crafting-outcomes',5);
if (crafting.procedure?.length !== 6 || crafting.workedExample?.finalResult !== '22' || crafting.workedExample?.outcome !== 'Exceptional Success') throw new Error('Crafting procedure or worked example is incorrect.');
if (![crafting.summary,...crafting.body].join(' ').includes('adds them to the d20 result')) throw new Error('Crafting modifier ambiguity was lost.');
const supportTables = tableMap(entries.get('solanum-crafting-support-modifiers'));
for (const [id,count] of [['solanum-crafting-mentors',4],['solanum-crafting-tools',4],['solanum-crafting-skill-level',5],['solanum-crafting-workshops',5],['solanum-crafting-materials',5]]) requireTable(supportTables,id,count);

const coreCombat = entries.get('solanum-core-combat-system');
if (!coreCombat.formulas?.some(record => record.formula === 'd20 + Initiative Stat')) throw new Error('Native initiative formula is missing.');
if (![coreCombat.summary,...coreCombat.body].join(' ').includes('one action per turn')) throw new Error('One-action turn rule is missing.');
requireTable(tableMap(entries.get('solanum-native-skills-actions')),'solanum-skill-action-pairings',20);
const zocTables = tableMap(entries.get('solanum-action-economy-grid-zoc'));
requireTable(zocTables,'solanum-grid-movement',3);
const zoc = requireTable(zocTables,'solanum-zone-control',6);
if (!zoc.rows.some(row => row[0] === 'Tie' && row[1] === 'Not defined in source')) throw new Error('Zone-of-control tie ambiguity was lost.');
const melee = entries.get('solanum-melee-combat-modes');
requireTable(tableMap(melee),'solanum-melee-direct-formulas',3);
requireTable(tableMap(melee),'solanum-melee-primary-stat-method',3);
if (melee.sourceStatus !== 'source-native-mechanics-with-explicit-conflict') throw new Error('Melee rule conflict is no longer explicit.');
const ranged = tableMap(entries.get('solanum-ranged-cover-camouflage'));
requireTable(ranged,'solanum-ranged-tech-ranges',6);
requireTable(ranged,'solanum-cover-camouflage-modifiers',6);
requireTable(ranged,'solanum-cover-defensive-values',6);
requireTable(ranged,'solanum-cover-economy',4);
if (!ranged.get('solanum-ranged-tech-ranges').rows[5][2].includes('unresolved')) throw new Error('Advanced Tech range ambiguity was lost.');
const vehicle = tableMap(entries.get('solanum-vehicle-combat-framework'));
requireTable(vehicle,'solanum-vehicle-combat-summary',7);
requireTable(vehicle,'solanum-vehicle-weapon-tiers',6);

const entity = entries.get('solanum-fay-entity-generator');
if (entity.generationSequence?.length !== 7) throw new Error('Entity generator sequence must contain seven rolls.');
const entityTables = tableMap(entity);
for (const [id,count] of [['solanum-entity-type',10],['solanum-entity-size',8],['solanum-entity-appearance',12],['solanum-entity-behavior',10],['solanum-entity-abilities',12],['solanum-entity-weakness',8],['solanum-entity-motivation',10]]) requireTable(entityTables,id,count);

const factionIds = ['solanum-unit-zero-forces','solanum-techno-phantom-collective','solanum-bio-machine-juggernauts','solanum-anarchic-swarm'];
for (const id of factionIds) if (entries.get(id).category !== 'Enemy Factions') throw new Error(`${id} is not filed as an enemy faction.`);
const roster = entries.get('solanum-synthesis-enemy-role-roster');
if (!Array.isArray(roster.enemyProfiles) || roster.enemyProfiles.length !== 36) throw new Error('Expected 36 native enemy profiles.');
const factionCounts = new Map();
const roles = new Set();
for (const profile of roster.enemyProfiles) {
  for (const field of ['faction','role','name','design','strength','weakness']) if (!profile[field]) throw new Error(`Enemy profile lacks '${field}'.`);
  factionCounts.set(profile.faction,(factionCounts.get(profile.faction) || 0) + 1);
  roles.add(profile.role);
}
if (factionCounts.size !== 4 || [...factionCounts.values()].some(count => count !== 9)) throw new Error('Each of four force families must contain nine roles.');
if (roles.size !== 9) throw new Error('Enemy roster must contain nine recurring battlefield roles.');
if (roster.enemyProfiles.filter(profile => profile.name === 'The Devourers').length !== 2) throw new Error('The duplicated Devourer name must remain faction-separated.');

const cyber = entries.get('solanum-cybernetic-replacement-framework');
const cyberTables = tableMap(cyber);
requireTable(cyberTables,'solanum-cybernetic-tech-levels',5);
const bodyParts = requireTable(cyberTables,'solanum-cybernetic-body-part-costs',8);
requireTable(cyberTables,'solanum-cybernetic-installation',5);
requireTable(cyberTables,'solanum-prosthetic-performance',5);
requireTable(cyberTables,'solanum-cybernetic-body-percentage',5);
requireTable(cyberTables,'solanum-biotic-power-requirements',5);
const eliteUpperArm = bodyParts.rows.find(row => row[0] === 'Upper Arm');
if (!eliteUpperArm || eliteUpperArm[4] !== '7,500') throw new Error('Elite upper-arm cost must remain 7,500 credits.');
if (cyber.workedExample?.sourceFinalCost !== '7,500 credits' || !cyber.workedExample?.formulaStatus?.includes('inconsistent')) throw new Error('Cybernetic cost conflict or worked example was lost.');
if (cyber.sourceStatus !== 'source-native-mechanics-with-explicit-conflict') throw new Error('Cybernetic formula conflict must remain explicit.');

const enhancements = requireTable(tableMap(entries.get('solanum-biotic-enhancement-catalogue')),'solanum-biotic-enhancements',12);
if (!enhancements.rows.some(row => row[0] === 'Temporal Manipulator' && row[6] === '75,000-150,000')) throw new Error('Temporal Manipulator catalogue record is incorrect.');
if (!enhancements.rows.some(row => row[0] === 'Quantum Processor Unit' && row[1] === 'Elite')) throw new Error('Quantum Processor catalogue record is missing.');

const security = entries.get('solanum-secure-cybernetic-interfaces');
requireTable(tableMap(security),'solanum-cybernetic-security-practices',6);
const securityText = [security.summary,...security.body].join(' ').toLowerCase();
for (const phrase of ['wireless','direct physical cables','isolated data-interface terminals','social stigma']) if (!securityText.includes(phrase)) throw new Error(`Cybernetic security entry lacks '${phrase}'.`);

const degradation = entries.get('solanum-long-term-cybernetic-degradation');
const degradationTable = requireTable(tableMap(degradation),'solanum-cybernetic-degradation',21);
if (degradation.procedure?.length !== 6) throw new Error('Cybernetic degradation procedure must contain six steps.');
if (degradationTable.rows[0][0] !== '0-10' || degradationTable.rows[20][2] !== 'Fatal System Failure') throw new Error('Cybernetic degradation endpoints are incorrect.');
if (!degradation.body.join(' ').includes('once every 1d6 years')) throw new Error('The 40+ recurring degradation schedule was lost.');
if (degradationTable.rows.filter(row => row[0] === '40+').length !== 5) throw new Error('The 40+ degradation band must contain five outcomes.');

const serialized = JSON.stringify(packs);
for (const forbidden of ['baseAttack','challengeRating','savingThrow','spellLevel','Hypertext d20 / 3.5-compatible']) if (serialized.includes(forbidden)) throw new Error(`External-system field '${forbidden}' leaked into Solanum data.`);

if (index.completedScope?.wikiEntries !== 29 || index.completedScope?.nativePacks !== 7 || index.completedScope?.namedForceRoles !== 36 || index.completedScope?.bioticEnhancements !== 12 || index.completedScope?.degradationOutcomes !== 21) throw new Error('Solanum index completed scope does not match imported data.');

console.log('Solanum Umbra native wiki validation passed.');
console.log('Verified seven native packs, twenty-nine entries, character and career systems, crafting, combat and vehicles, entity generation, four enemy factions, thirty-six force roles, cybernetic replacement, twelve enhancements, and twenty-one long-term degradation outcomes.');
