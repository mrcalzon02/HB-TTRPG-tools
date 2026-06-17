import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const indexPath = path.join(root,'data','solanum-umbra','wiki','wiki-index.json');
const packPath = path.join(root,'data','solanum-umbra','wiki','native-rules-pass-1-character-creation.json');
const index = JSON.parse(await fs.readFile(indexPath,'utf8'));
const pack = JSON.parse(await fs.readFile(packPath,'utf8'));

if (index.setting !== 'Solanum Umbra' || index.schemaVersion !== '0.2.0') throw new Error('Unexpected Solanum Umbra wiki identity or schema.');
if (index.status !== 'native-system-character-creation-pass-1-complete') throw new Error('Solanum Umbra first native rules pass is not marked complete.');
if (index.mechanicsPolicy?.system !== 'Solanum Umbra native rules') throw new Error('Solanum Umbra native system policy is missing.');
if (index.mechanicsPolicy?.conversion !== 'none') throw new Error('Solanum Umbra must not be converted to another RPG system.');
if (!index.mechanicsPolicy?.ambiguityPolicy?.includes('do not silently replace')) throw new Error('Solanum Umbra ambiguity policy is missing.');
if (index.binaryPath !== 'SRC/Solanum-Umbra-TTRPG.pdf' || index.binaryTransferStatus !== 'present-in-git-and-identity-verified') throw new Error('Solanum Umbra source binary path or status is incorrect.');
if (!Array.isArray(index.packs) || index.packs.length !== 1 || index.packs[0] !== 'data/solanum-umbra/wiki/native-rules-pass-1-character-creation.json') throw new Error('Unexpected Solanum Umbra pack registration.');

if (pack.setting !== 'Solanum Umbra' || pack.schemaVersion !== '0.1.0') throw new Error('Unexpected Solanum Umbra native pack schema.');
if (pack.mechanicsPolicy !== 'native-system-preserved-no-d20-conversion') throw new Error('Native pack mechanics policy is incorrect.');
if (!Array.isArray(pack.entries) || pack.entries.length !== 7) throw new Error(`Expected seven native character-creation entries, found ${pack.entries?.length ?? 0}.`);

const entries = new Map(pack.entries.map(entry => [entry.id,entry]));
const requiredIds = [
  'solanum-character-creation-system',
  'solanum-core-attributes-derived-statistics',
  'solanum-origins-careers-skills-motivations',
  'solanum-ancestries-and-cyborg-variants',
  'solanum-full-cyberization-threshold',
  'solanum-data-seizure-progression',
  'solanum-character-sheet-schema'
];
for (const id of requiredIds) if (!entries.has(id)) throw new Error(`Missing Solanum Umbra entry '${id}'.`);

for (const entry of pack.entries) {
  for (const field of ['id','title','category','summary','sourceStatus']) if (!entry[field]) throw new Error(`Solanum Umbra entry lacks '${field}'.`);
  if (!Array.isArray(entry.body) || entry.body.length === 0) throw new Error(`${entry.id} lacks body text.`);
  if (!Array.isArray(entry.sourceRefs) || entry.sourceRefs.length === 0) throw new Error(`${entry.id} lacks page provenance.`);
  if (!Array.isArray(entry.tags) || entry.tags.length === 0) throw new Error(`${entry.id} lacks search tags.`);
  for (const ref of entry.sourceRefs) {
    if (ref.sourceId !== 'solanum-umbra-ttrpg' || ref.fileName !== 'Solanum-Umbra-TTRPG.pdf') throw new Error(`${entry.id} has an unrelated source reference.`);
    if (!Number.isInteger(ref.pageStart) || !Number.isInteger(ref.pageEnd) || ref.pageStart < 104 || ref.pageEnd > 116 || ref.pageStart > ref.pageEnd) throw new Error(`${entry.id} has an invalid first-pass page range.`);
  }
}

const creation = entries.get('solanum-character-creation-system');
if (!Array.isArray(creation.creationSequence) || creation.creationSequence.length !== 12) throw new Error('Character creation sequence must contain twelve native steps.');
const creationText = [creation.summary,...creation.body,...creation.creationSequence].join(' ');
for (const phrase of ['Roll 1d20 for Strength','Health = Constitution + Strength','Armor = Constitution + Dexterity','Initiative = Dexterity + Intelligence','SKILL = Intelligence + Wisdom','select ancestry','cybernetic body percentage']) {
  if (!creationText.toLowerCase().includes(phrase.toLowerCase())) throw new Error(`Character creation sequence lacks '${phrase}'.`);
}

const attributes = entries.get('solanum-core-attributes-derived-statistics');
const attributeTables = new Map((attributes.tables || []).map(table => [table.id,table]));
for (const [id,count] of [['solanum-six-attributes',6],['solanum-derived-statistics',4],['solanum-attribute-bonus-penalty',7]]) {
  const table = attributeTables.get(id);
  if (!table || table.rows.length !== count) throw new Error(`Attribute table '${id}' must contain ${count} rows.`);
}
const formulas = new Map(attributeTables.get('solanum-derived-statistics').rows.map(row => [row[0],row[1]]));
const expectedFormulas = new Map([['Health','CON + STR'],['Armor','CON + DEX'],['Initiative','DEX + INT'],['SKILL','INT + WIS']]);
for (const [name,formula] of expectedFormulas) if (formulas.get(name) !== formula) throw new Error(`Incorrect native formula for ${name}.`);
const ambiguousBand = attributeTables.get('solanum-attribute-bonus-penalty').rows.find(row => row[0] === '9–11');
if (!ambiguousBand || ambiguousBand[1] !== '-1 to +1' || ambiguousBand[3] !== 'Ambiguous within range') throw new Error('The source ambiguity for attribute values 9–11 must remain explicit.');

const backgrounds = entries.get('solanum-origins-careers-skills-motivations');
const backgroundTables = new Map((backgrounds.tables || []).map(table => [table.id,table]));
for (const [id,count] of [['solanum-origin-table',5],['solanum-career-list',6],['solanum-mechanic-benefits',4],['solanum-mechanic-skills',4],['solanum-motivation-table',5]]) {
  const table = backgroundTables.get(id);
  if (!table || table.rows.length !== count) throw new Error(`Background table '${id}' must contain ${count} rows.`);
}
if (!backgroundTables.get('solanum-career-list').rows.every(row => row[2].includes('Not fully specified') || row[2].includes('Example result'))) throw new Error('Incomplete career roll mapping must remain visibly unresolved.');

const ancestries = entries.get('solanum-ancestries-and-cyborg-variants');
const ancestryTables = new Map((ancestries.tables || []).map(table => [table.id,table]));
if (ancestryTables.get('solanum-ancestry-comparison')?.rows.length !== 6) throw new Error('Ancestry comparison must contain six attribute rows.');
if (ancestryTables.get('solanum-cyborg-variant-comparison')?.rows.length !== 6) throw new Error('Cyborg comparison must contain six attribute rows.');

const threshold = entries.get('solanum-full-cyberization-threshold');
if (![threshold.summary,...threshold.body].join(' ').includes('more than 49%')) throw new Error('The full-cyberization threshold must remain more than 49%.');

const seizures = entries.get('solanum-data-seizure-progression');
const seizureTable = seizures.tables?.find(table => table.id === 'solanum-data-seizure-stages');
if (!seizureTable || seizureTable.rows.length !== 6) throw new Error('Data-seizure progression must contain six stages.');
const expectedStages = [
  ['0–1 weeks','Minor Errors','+2 penalty','5%','10%'],
  ['1–2 months','Moderate Errors','+4 penalty','10%','20%'],
  ['2–6 months','Significant Errors','+6 penalty','15%','40%'],
  ['6–12 months','Severe Errors','+8 penalty','20%','60%'],
  ['12–18 months','Critical Errors','+10 penalty','30%','80%'],
  ['18+ months','Fatal Errors','+12 penalty','50%','100%']
];
for (let i = 0; i < expectedStages.length; i += 1) {
  for (let field = 0; field < expectedStages[i].length; field += 1) {
    if (seizureTable.rows[i][field] !== expectedStages[i][field]) throw new Error(`Incorrect seizure progression at row ${i + 1}, field ${field + 1}.`);
  }
}
if (seizureTable.rows[5][5] !== '100%') throw new Error('Fatal-stage action failure must remain 100%.');

const sheet = entries.get('solanum-character-sheet-schema');
if (!Array.isArray(sheet.characterSheetFields) || sheet.characterSheetFields.length !== 7) throw new Error('Native character sheet must contain seven field groups.');
if (!Array.isArray(sheet.formulaFields) || sheet.formulaFields.length !== 4) throw new Error('Native character sheet must expose four formula fields.');
for (const [field,formula] of expectedFormulas) {
  if (!sheet.formulaFields.some(record => record.field === field && record.formula === formula)) throw new Error(`Character sheet lacks formula ${field} = ${formula}.`);
}

const serialized = JSON.stringify(pack);
for (const forbidden of ['baseAttack','challengeRating','armorClass','savingThrow','spellLevel','Hypertext d20 / 3.5-compatible']) {
  if (serialized.includes(forbidden)) throw new Error(`External-system field '${forbidden}' leaked into the native Solanum pack.`);
}

console.log('Solanum Umbra native wiki validation passed.');
console.log('Verified seven native entries, six attributes, four formulas, five origins, six listed careers, qualitative ancestry and cyborg variants, the more-than-49% cyberization threshold, six data-seizure stages, and the native character-sheet schema.');
