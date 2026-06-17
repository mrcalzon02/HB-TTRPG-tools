import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const indexPath = path.join(root,'data','kaysender','wiki','wiki-index.json');
const classPackPath = path.join(root,'data','kaysender','wiki','converted-rules-pass-5-warlock-of-the-swamp.json');
const displayPackPath = path.join(root,'data','kaysender','wiki','converted-rules-pass-5b-warlock-of-the-swamp-display.json');
const relicCataloguePath = path.join(root,'data','kaysender','wiki','converted-rules-pass-5c-divine-compromise-relic-catalogue.json');

const index = JSON.parse(await fs.readFile(indexPath,'utf8'));
const classPack = JSON.parse(await fs.readFile(classPackPath,'utf8'));
const displayPack = JSON.parse(await fs.readFile(displayPackPath,'utf8'));
const relicCatalogue = JSON.parse(await fs.readFile(relicCataloguePath,'utf8'));

if (index.setting !== 'Kaysender' || index.schemaVersion !== '0.7.0') throw new Error('Unexpected Kaysender wiki index identity or schema.');
const requiredPacks = [
  'data/kaysender/wiki/converted-rules-pass-5-warlock-of-the-swamp.json',
  'data/kaysender/wiki/converted-rules-pass-5b-warlock-of-the-swamp-display.json',
  'data/kaysender/wiki/converted-rules-pass-5c-divine-compromise-relic-catalogue.json'
];
for (const pack of requiredPacks) if (!index.packs?.includes(pack)) throw new Error(`Kaysender wiki index is missing '${pack}'.`);
for (let i = 1; i < requiredPacks.length; i += 1) {
  if (index.packs.indexOf(requiredPacks[i]) < index.packs.indexOf(requiredPacks[i - 1])) throw new Error('Warlock class, display, and relic catalogue packs are in the wrong order.');
}

if (classPack.setting !== 'Kaysender' || classPack.schemaVersion !== '0.1.0') throw new Error('Unexpected Warlock of the Swamp pack schema.');
if (!Array.isArray(classPack.entries) || classPack.entries.length !== 4) throw new Error('Expected four primary Warlock of the Swamp wiki entries.');
const entries = new Map(classPack.entries.map(entry => [entry.id,entry]));
for (const id of ['warlock-of-the-swamp-class','warlock-of-the-swamp-invocations','lady-of-the-swamp','divine-compromise-artifacts']) {
  if (!entries.has(id)) throw new Error(`Missing required Warlock of the Swamp entry '${id}'.`);
}

const classEntry = entries.get('warlock-of-the-swamp-class');
if (classEntry.category !== 'Rules') throw new Error('Warlock of the Swamp must be a Rules entry.');
if (!Array.isArray(classEntry.classProgression) || classEntry.classProgression.length !== 20) throw new Error('Warlock of the Swamp must have twenty structured class levels.');
for (let i = 0; i < classEntry.classProgression.length; i += 1) {
  const row = classEntry.classProgression[i];
  if (row.level !== i + 1) throw new Error(`Warlock progression is out of sequence at row ${i + 1}.`);
  for (const field of ['baseAttack','fortitude','reflex','will','eldritchBlast','invocationsKnown','maximumBrood','special']) {
    if (row[field] === undefined || row[field] === null || row[field] === '') throw new Error(`Warlock level ${row.level} lacks '${field}'.`);
  }
  if (!Array.isArray(row.special) || row.special.length === 0) throw new Error(`Warlock level ${row.level} must list class features.`);
}

const expectedBab = ['+0','+1','+2','+3','+3','+4','+5','+6/+1','+6/+1','+7/+2','+8/+3','+9/+4','+9/+4','+10/+5','+11/+6/+1','+12/+7/+2','+12/+7/+2','+13/+8/+3','+14/+9/+4','+15/+10/+5'];
const expectedFortRef = ['+0','+0','+1','+1','+1','+2','+2','+2','+3','+3','+3','+4','+4','+4','+5','+5','+5','+6','+6','+6'];
const expectedWill = ['+2','+3','+3','+4','+4','+5','+5','+6','+6','+7','+7','+8','+8','+9','+9','+10','+10','+11','+11','+12'];
const expectedBlast = ['1d6','1d6','2d6','2d6','3d6','3d6','4d6','4d6','5d6','5d6','6d6','6d6','6d6','7d6','7d6','7d6','8d6','8d6','8d6','9d6'];
const expectedInvocations = [1,2,2,3,3,4,4,5,5,6,7,7,8,8,9,10,10,11,11,12];
for (let i = 0; i < 20; i += 1) {
  const row = classEntry.classProgression[i];
  if (row.baseAttack !== expectedBab[i]) throw new Error(`Incorrect BAB at Warlock level ${i + 1}.`);
  if (row.fortitude !== expectedFortRef[i] || row.reflex !== expectedFortRef[i]) throw new Error(`Incorrect poor-save progression at Warlock level ${i + 1}.`);
  if (row.will !== expectedWill[i]) throw new Error(`Incorrect Will progression at Warlock level ${i + 1}.`);
  if (row.eldritchBlast !== expectedBlast[i]) throw new Error(`Incorrect eldritch blast at Warlock level ${i + 1}.`);
  if (row.invocationsKnown !== expectedInvocations[i]) throw new Error(`Incorrect invocations known at Warlock level ${i + 1}.`);
}

const allClassText = [
  classEntry.summary,
  ...(classEntry.body || []),
  ...(classEntry.sections || []).flatMap(section => [section.heading,...(section.body || [])]),
  ...classEntry.classProgression.flatMap(row => row.special)
].join(' ');
for (const phrase of [
  "Maximum Pact Favor equals 3 + Charisma modifier + one-half class level",
  'Pact Debt ranges from 0 to 6',
  'Call Swamp Brood',
  'Dream Step',
  'Mire Passage',
  'Bog Between Worlds',
  'Reedway Transit',
  'Minor Entreaty',
  'Greater Entreaty',
  'Living Pact',
  "Lady's Emissary",
  'Compromise Ward'
]) if (!allClassText.includes(phrase)) throw new Error(`Warlock class is missing required concept '${phrase}'.`);

const classSource = classEntry.sourceRefs?.find(ref => ref.url === 'https://srd.dndtools.org/srd/classes/baseCarc/warlock.html');
if (!classSource) throw new Error('Warlock class does not preserve its external mechanical reference.');
if (classEntry.sourceStatus !== 'derived-tool-output') throw new Error('Warlock class source status must identify it as derived homebrew output.');

const invocationEntry = entries.get('warlock-of-the-swamp-invocations');
const gradeExpectations = {least:6,lesser:6,greater:5,dark:5};
for (const [grade,count] of Object.entries(gradeExpectations)) {
  const list = invocationEntry.invocationGrades?.[grade];
  if (!Array.isArray(list) || list.length !== count) throw new Error(`Expected ${count} ${grade} swamp invocations.`);
  for (const invocation of list) {
    if (!invocation.name || !Number.isInteger(invocation.equivalentLevel) || !invocation.effect) throw new Error(`${grade} invocation is incomplete.`);
  }
}
for (const requiredName of ["Swarmkeeper's Hand","Leechkeeper's Mercy","Brood Gate","Blackwater Procession","The Lady Arbitrates"]) {
  if (!Object.values(invocationEntry.invocationGrades).flat().some(invocation => invocation.name === requiredName)) throw new Error(`Missing swamp invocation '${requiredName}'.`);
}

const ladyEntry = entries.get('lady-of-the-swamp');
const ladyText = [ladyEntry.summary,...(ladyEntry.body || []),...(ladyEntry.sections || []).flatMap(section => [section.heading,...(section.body || [])])].join(' ');
for (const phrase of ['outsider','clerics','ongoing relationship','bargains with resident gods','Divine bargaining dreams']) {
  if (!ladyText.toLowerCase().includes(phrase.toLowerCase())) throw new Error(`Lady of the Swamp lore is missing '${phrase}'.`);
}

const baseArtifactEntry = entries.get('divine-compromise-artifacts');
if (!Array.isArray(baseArtifactEntry.compromiseArtifacts) || baseArtifactEntry.compromiseArtifacts.length !== 8) throw new Error('Expected the eight founding structured divine compromise artifacts in the primary class pack.');
for (const artifact of baseArtifactEntry.compromiseArtifacts) if (!artifact.name || !artifact.effect) throw new Error('Founding divine compromise artifact is incomplete.');
const baseArtifactText = [
  baseArtifactEntry.summary,
  ...(baseArtifactEntry.body || []),
  ...(baseArtifactEntry.sections || []).flatMap(section => [section.heading,...(section.body || [])]),
  ...baseArtifactEntry.compromiseArtifacts.flatMap(artifact => [artifact.name,artifact.effect])
].join(' ');

if (displayPack.setting !== 'Kaysender' || displayPack.schemaVersion !== '0.1.0') throw new Error('Unexpected display-override pack schema.');
const displayEntries = new Map((displayPack.entries || []).map(entry => [entry.id,entry]));
for (const id of ['warlock-of-the-swamp-invocations','divine-compromise-artifacts']) {
  const entry = displayEntries.get(id);
  if (!entry || !Array.isArray(entry.sections) || entry.sections.length < 5) throw new Error(`Display override '${id}' is incomplete.`);
  if (entry.sections.some(section => !section.heading || !Array.isArray(section.body) || section.body.length === 0)) throw new Error(`Display override '${id}' has an empty section.`);
}
const displayArtifactEntry = displayEntries.get('divine-compromise-artifacts');
const displayArtifactText = displayArtifactEntry.sections.flatMap(section => [section.heading,...section.body]).join(' ');

if (relicCatalogue.setting !== 'Kaysender' || relicCatalogue.schemaVersion !== '0.1.0') throw new Error('Unexpected expanded relic catalogue schema.');
if (!Array.isArray(relicCatalogue.entries) || relicCatalogue.entries.length !== 1 || relicCatalogue.entries[0].id !== 'divine-compromise-artifacts') throw new Error('Expanded relic catalogue must override exactly the divine-compromise-artifacts entry.');
const expandedArtifactEntry = relicCatalogue.entries[0];
if (expandedArtifactEntry.relicCatalogueVersion !== '1.0.0') throw new Error('Unexpected relic catalogue version.');
if (expandedArtifactEntry.cataloguePolicy?.relicCount !== 32) throw new Error('Relic catalogue policy must record thirty-two relics.');
if (!expandedArtifactEntry.cataloguePolicy?.adjudication || !expandedArtifactEntry.cataloguePolicy?.termsWarning) throw new Error('Relic catalogue policy lacks adjudication or unknown-terms guidance.');
if (!Array.isArray(expandedArtifactEntry.compromiseArtifacts) || expandedArtifactEntry.compromiseArtifacts.length !== 32) throw new Error(`Expected 32 expanded divine compromise relics, found ${expandedArtifactEntry.compromiseArtifacts?.length ?? 0}.`);
if (!Array.isArray(expandedArtifactEntry.sections) || expandedArtifactEntry.sections.length < 7) throw new Error('Expanded relic catalogue lacks rendered thematic sections.');
const relicNames = new Set();
for (const relic of expandedArtifactEntry.compromiseArtifacts) {
  for (const field of ['name','classification','effect','warning','whisperedTerms']) if (!relic[field]) throw new Error(`Expanded relic '${relic.name || 'unknown'}' lacks '${field}'.`);
  if (relicNames.has(relic.name)) throw new Error(`Duplicate expanded relic '${relic.name}'.`);
  relicNames.add(relic.name);
}
for (const requiredArtifact of [
  'Sombrero of Tuesdays',
  'Seven-Course Chalupa Reliquary',
  'Spleen Warranty Tag',
  'Cloak of Uninvisibility',
  'Epsom Salts of ‘Do Not Put This in Your Bath Water’'
]) if (!relicNames.has(requiredArtifact)) throw new Error(`Missing expanded compromise relic '${requiredArtifact}'.`);

const relicText = [
  baseArtifactText,
  displayArtifactText,
  expandedArtifactEntry.cataloguePolicy.adjudication,
  expandedArtifactEntry.cataloguePolicy.termsWarning,
  ...expandedArtifactEntry.compromiseArtifacts.flatMap(relic => [relic.name,relic.classification,relic.effect,relic.warning,relic.whisperedTerms]),
  ...expandedArtifactEntry.sections.flatMap(section => [section.heading,...section.body])
].join(' ');
for (const phrase of [
  'Every Thursday',
  'war priest of Torm',
  'seven-course assortment',
  'total ego dissolution',
  'sudden progenation',
  'cranial removal',
  'correctly visible',
  'untethered from reality',
  'wear it at all times',
  'must not be placed in bath water',
  'permanently destroy the recipient’s ability to experience good luck',
  'cannot discuss the terms and conditions'
]) if (!relicText.includes(phrase)) throw new Error(`Merged relic record is missing '${phrase}'.`);

for (const entry of classPack.entries) {
  if (!entry.id || !entry.title || !entry.category || !entry.summary) throw new Error('Warlock pack entry lacks core wiki fields.');
  if (!Array.isArray(entry.sections) || entry.sections.length === 0) throw new Error(`${entry.id} lacks rendered sections.`);
  if (!Array.isArray(entry.tags) || entry.tags.length === 0) throw new Error(`${entry.id} lacks search tags.`);
  if (!Array.isArray(entry.relatedEntries)) throw new Error(`${entry.id} relatedEntries must be an array.`);
}

console.log('Kaysender Warlock of the Swamp validation passed.');
console.log('Verified twenty levels, retained warlock progression, Pact Favor and Debt, brood maintenance, Dream Step, four invocation grades, Lady patron lore, and thirty-two divine compromise relics.');
