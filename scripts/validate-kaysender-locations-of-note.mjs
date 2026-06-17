import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const index = JSON.parse(await fs.readFile(path.join(root,'data','kaysender','wiki','wiki-index.json'),'utf8'));
const packPath = 'data/kaysender/wiki/locations-of-note-mad-martikens-menagerie.json';
const tablePackPath = 'data/kaysender/wiki/locations-of-note-mad-martikens-menagerie-tables.json';
const receiptPath = 'source-page-references/Mad-Martikens-Menagerie-of-Magical-Services.source.json';
const pack = JSON.parse(await fs.readFile(path.join(root,packPath),'utf8'));
const tablePack = JSON.parse(await fs.readFile(path.join(root,tablePackPath),'utf8'));
const receipt = JSON.parse(await fs.readFile(path.join(root,receiptPath),'utf8'));

if (index.setting !== 'Kaysender' || index.schemaVersion !== '0.7.0') throw new Error('Unexpected Kaysender wiki identity or schema.');
for (const requiredPack of [packPath,tablePackPath]) if (!index.packs?.includes(requiredPack)) throw new Error(`Kaysender wiki does not load '${requiredPack}'.`);
if (!index.sourceDocuments?.includes(receiptPath)) throw new Error('Kaysender wiki does not register the Mad Martiken source receipt.');
if (index.packs.indexOf(tablePackPath) < index.packs.indexOf(packPath)) throw new Error('Mad Martiken structured-table override must load after the source-complete location pack.');
if (index.packs.at(-1) !== tablePackPath) throw new Error('Mad Martiken table override must remain the final current Kaysender pack.');

if (pack.setting !== 'Kaysender' || pack.schemaVersion !== '0.1.0') throw new Error('Unexpected Mad Martiken pack schema.');
if (!Array.isArray(pack.entries) || pack.entries.length !== 1) throw new Error('Expected exactly one Mad Martiken Locations of Note entry.');
const entry = pack.entries[0];
if (entry.id !== 'mad-martikens-menagerie-of-magical-services') throw new Error('Unexpected Mad Martiken entry id.');
if (entry.category !== 'Locations of Note') throw new Error('Mad Martiken must be filed under Locations of Note.');
if (entry.sourceStatus !== 'source-integrated-conversion') throw new Error('Mad Martiken entry must identify its source-integrated conversion status.');
if (!Array.isArray(entry.sections) || entry.sections.length < 20) throw new Error('Mad Martiken entry does not contain the complete expanded section set.');
if (!Array.isArray(entry.statBlocks) || entry.statBlocks.length !== 1) throw new Error('Mad Martiken entry must include one proprietor stat block.');

if (tablePack.setting !== 'Kaysender' || tablePack.schemaVersion !== '0.1.0') throw new Error('Unexpected Mad Martiken table-pack schema.');
if (!Array.isArray(tablePack.entries) || tablePack.entries.length !== 1 || tablePack.entries[0].id !== entry.id) throw new Error('Mad Martiken table pack must override exactly the location entry.');
const mergedTables = tablePack.entries[0].tables;
if (!Array.isArray(mergedTables) || mergedTables.length !== 6) throw new Error(`Expected six structured Mad Martiken tables, found ${mergedTables?.length ?? 0}.`);

const sectionMap = new Map(entry.sections.map(section => [section.heading,section]));
const requiredSections = [
  'Mad Martiken, the wizard',
  'Storefront and atmosphere',
  'The illusionary structure and the reality bubble',
  'Interior oddities',
  'Consultation and visualization ritual',
  'Advertised service prices and standard 3.5 coinage',
  'Expanded service and surcharge price table',
  'Functional modification benchmarks',
  'The price beyond gold and risky lineages',
  'Mutation trigger procedure',
  'Mutation trigger quick-reference table',
  'General Mutagenic Effects — d20',
  'Draconic Modifications — d12',
  'Arachnid Modifications — d10',
  'Pixie and Fae Modifications — d8',
  'Aquatic and Shark Modifications — d8',
  'Rare Catastrophic Mutation — d6',
  'Aftercare, stabilization, and reversal',
  'Case file: Dolomedes and the feline eyes',
  'Case file: Soba, copper wings, and red draconic lineage',
  'Using the Menagerie as a campaign location'
];
for (const heading of requiredSections) {
  const section = sectionMap.get(heading);
  if (!section || !Array.isArray(section.body) || section.body.length === 0) throw new Error(`Missing or empty Mad Martiken section '${heading}'.`);
}

const sourceTableCounts = new Map([
  ['General Mutagenic Effects — d20',20],
  ['Draconic Modifications — d12',12],
  ['Arachnid Modifications — d10',10],
  ['Pixie and Fae Modifications — d8',8],
  ['Aquatic and Shark Modifications — d8',8],
  ['Rare Catastrophic Mutation — d6',6]
]);
for (const [heading,count] of sourceTableCounts) {
  const section = sectionMap.get(heading);
  if (section.sectionType !== 'source-table') throw new Error(`${heading} must remain marked as a source table.`);
  if (section.body.length !== count) throw new Error(`${heading} must contain ${count} results, found ${section.body.length}.`);
  for (let roll = 1; roll <= count; roll += 1) if (!section.body[roll - 1].startsWith(`${roll} —`)) throw new Error(`${heading} is out of roll order at ${roll}.`);
}

const tableMap = new Map(mergedTables.map(table => [table.id,table]));
for (const id of ['martiken-advertised-services','martiken-expanded-pricing','martiken-functional-benchmarks','martiken-trigger-reference','martiken-source-table-index','martiken-aftercare-pricing']) {
  const table = tableMap.get(id);
  if (!table || !Array.isArray(table.columns) || table.columns.length < 3 || !Array.isArray(table.rows) || table.rows.length === 0) throw new Error(`Structured table '${id}' is incomplete.`);
  for (const row of table.rows) if (!Array.isArray(row) || row.length !== table.columns.length) throw new Error(`Structured table '${id}' has a malformed row.`);
}
if (tableMap.get('martiken-advertised-services').rows.length !== 3) throw new Error('Advertised service table must contain the three source tiers.');
if (tableMap.get('martiken-expanded-pricing').rows.length < 9) throw new Error('Expanded pricing table is too short.');
if (tableMap.get('martiken-functional-benchmarks').rows.length < 10) throw new Error('Functional modification table is too short.');
if (tableMap.get('martiken-trigger-reference').rows.length !== 3) throw new Error('Mutation trigger table must contain Minor, Major, and Extreme rows.');
if (tableMap.get('martiken-source-table-index').rows.length !== 6) throw new Error('Source mutation table index must contain six tables.');
if (tableMap.get('martiken-aftercare-pricing').rows.length !== 5) throw new Error('Aftercare pricing table must contain five service rows.');

const allText = [
  entry.title,
  entry.summary,
  ...(entry.body || []),
  ...entry.sections.flatMap(section => [section.heading,...section.body]),
  ...mergedTables.flatMap(table => [table.title,...table.columns,...table.rows.flat()]),
  ...(entry.tags || [])
].join(' ');
for (const phrase of [
  'Be whatever you want to be',
  'baby kraken',
  'memories of wood',
  'screws driven into nothing',
  'The Mirror of Becoming',
  'Whispering Furniture',
  'mummified pixie',
  '500 gp',
  '1,000 gp',
  '5,000 gp',
  'Dragonkind',
  'Arachnids',
  'Pixies and Fae',
  'Sharks and Aquatic Essences',
  'Cat’s eyes',
  'twenty to fifty years',
  'Tiamat',
  'sewer line',
  'bird droppings',
  'entirely illusionary'
]) if (!allText.toLowerCase().includes(phrase.toLowerCase())) throw new Error(`Mad Martiken integration is missing '${phrase}'.`);

const pricingText = [
  ...sectionMap.get('Expanded service and surcharge price table').body,
  ...tableMap.get('martiken-expanded-pricing').rows.flat(),
  ...tableMap.get('martiken-functional-benchmarks').rows.flat(),
  ...tableMap.get('martiken-aftercare-pricing').rows.flat()
].join(' ');
for (const amount of ['50 gp','500 gp','1,000 gp','1,500 gp','2,000 gp','2,500 gp','5,000 gp','10,000 gp','12,000 gp','25,000 gp','35,000 gp']) if (!pricingText.includes(amount)) throw new Error(`Expanded pricing lacks '${amount}'.`);
const triggerText = sectionMap.get('Mutation trigger quick-reference table').body.join(' ');
for (const chance of ['25%','15%','5%']) if (!triggerText.includes(chance)) throw new Error(`Trigger reference lacks '${chance}'.`);

if (!Array.isArray(entry.sourceRefs) || entry.sourceRefs.length !== 5) throw new Error('Mad Martiken entry must contain five page-range source references.');
const coveredPages = new Set();
for (const ref of entry.sourceRefs) {
  if (ref.sourceId !== 'mad-martikens-menagerie-of-magical-services') throw new Error('Mad Martiken entry contains an unrelated source reference.');
  if (!Number.isInteger(ref.pageStart) || !Number.isInteger(ref.pageEnd) || ref.pageStart < 1 || ref.pageEnd > 14 || ref.pageStart > ref.pageEnd) throw new Error('Mad Martiken source page range is invalid.');
  for (let page = ref.pageStart; page <= ref.pageEnd; page += 1) coveredPages.add(page);
}
for (let page = 1; page <= 14; page += 1) if (!coveredPages.has(page)) throw new Error(`Mad Martiken source page ${page} is not represented.`);

const stat = entry.statBlocks[0];
for (const field of ['title','ruleset','conversionStatus','statType','size','creatureType','alignment','challengeRating','hitDice','hitPoints','initiative','baseAttackGrapple','attack','fullAttack','spaceReach','environment','organization','treasure','advancement']) if (!stat[field]) throw new Error(`Mad Martiken stat block lacks '${field}'.`);
if (stat.title !== 'Mad Martiken, Menagerie Proprietor' || stat.challengeRating !== '15') throw new Error('Mad Martiken proprietor stat identity or challenge rating is incorrect.');
if (!Array.isArray(stat.specialAttacks) || stat.specialAttacks.length < 3 || !Array.isArray(stat.specialQualities) || stat.specialQualities.length < 4) throw new Error('Mad Martiken stat block lacks signature abilities.');

if (receipt.schemaVersion !== '1.0.0' || receipt.sourceId !== 'mad-martikens-menagerie-of-magical-services') throw new Error('Mad Martiken source receipt identity mismatch.');
if (receipt.pages !== 14 || receipt.bytes !== 212449 || receipt.sha256 !== '3ce56fc43563b00a8a9cd34e828f4e2e0c0e2e7a0a66c4767f80d155d293e8dc') throw new Error('Mad Martiken source receipt metadata mismatch.');
if (receipt.integrationStatus !== 'kaysender-locations-of-note-complete' || receipt.integratedEntryId !== entry.id) throw new Error('Mad Martiken source receipt integration state mismatch.');
if (receipt.integratedScope?.category !== 'Locations of Note' || receipt.integratedScope?.sourceMutationTables !== 6 || receipt.integratedScope?.expandedRulesTables !== 6 || receipt.integratedScope?.sourceCaseStudies !== 2) throw new Error('Mad Martiken source receipt scope is incomplete.');

console.log('Kaysender Locations of Note validation passed.');
console.log('Verified Mad Martiken’s Menagerie, all fourteen source pages, three advertised service tiers, six expanded rules tables, six source mutation tables, three trigger severities, two case files, and the proprietor stat block.');
