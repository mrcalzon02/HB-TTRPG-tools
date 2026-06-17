import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const indexPath = path.join(root,'data','kaysender','wiki','wiki-index.json');
const conversationPackPath = 'data/kaysender/wiki/locations-of-note-mad-martikens-menagerie-conversations.json';
const tablePackPath = 'data/kaysender/wiki/locations-of-note-mad-martikens-menagerie-tables.json';
const rendererPath = path.join(root,'kaysender-wiki.js');

const index = JSON.parse(await fs.readFile(indexPath,'utf8'));
const pack = JSON.parse(await fs.readFile(path.join(root,conversationPackPath),'utf8'));
const renderer = await fs.readFile(rendererPath,'utf8');

if (index.setting !== 'Kaysender' || index.schemaVersion !== '0.7.0') throw new Error('Unexpected Kaysender wiki identity or schema.');
if (!index.packs?.includes(conversationPackPath)) throw new Error('Kaysender wiki does not load the Mad Martiken conversation archive.');
if (index.packs.indexOf(conversationPackPath) < index.packs.indexOf(tablePackPath)) throw new Error('Mad Martiken conversation archive must load after the structured table pack.');

if (pack.setting !== 'Kaysender' || pack.schemaVersion !== '0.1.0') throw new Error('Unexpected Mad Martiken conversation-pack schema.');
if (!Array.isArray(pack.entries) || pack.entries.length !== 1) throw new Error('Expected one Mad Martiken conversation override entry.');
const entry = pack.entries[0];
if (entry.id !== 'mad-martikens-menagerie-of-magical-services') throw new Error('Conversation archive overrides the wrong entry.');
if (entry.conversationExpansionVersion !== '1.0.0') throw new Error('Unexpected Martiken conversation archive version.');
if (entry.conversationProvenance !== 'new-canon-expansion') throw new Error('Conversation archive must remain labeled new-canon-expansion.');

const policies = entry.servicePolicies || {};
for (const field of ['adultEventRule','permanenceRule','componentRule','customerComponentRule','layeringRule']) {
  if (!policies[field]) throw new Error(`Martiken service policies lack '${field}'.`);
}
const policyText = Object.values(policies).join(' ');
for (const phrase of ['consenting adults','seventy-two-hour reflection period','sympathetic inventory conduit','seventy-five percent','forty percent','stable for at least thirty days']) {
  if (!policyText.toLowerCase().includes(phrase.toLowerCase())) throw new Error(`Martiken service policies lack '${phrase}'.`);
}

if (!Array.isArray(entry.conversationRecords) || entry.conversationRecords.length !== 12) throw new Error(`Expected twelve Martiken conversations, found ${entry.conversationRecords?.length ?? 0}.`);
const expectedIds = [
  'martiken-conversation-illicit-parties',
  'martiken-conversation-premium-revels',
  'martiken-conversation-price-justification',
  'martiken-conversation-house-inventory',
  'martiken-conversation-customer-components',
  'martiken-conversation-peacock-client',
  'martiken-conversation-moon-pool',
  'martiken-conversation-borrowed-horns',
  'martiken-conversation-blessing-or-graft',
  'martiken-conversation-layering',
  'martiken-conversation-permanence',
  'martiken-conversation-energy-reserve'
];
const recordMap = new Map(entry.conversationRecords.map(record => [record.id,record]));
for (const id of expectedIds) if (!recordMap.has(id)) throw new Error(`Missing Martiken conversation '${id}'.`);

for (const record of entry.conversationRecords) {
  if (!record.id || !record.title || !record.context) throw new Error('Martiken conversation lacks identity or context.');
  if (!Array.isArray(record.participants) || !record.participants.includes('The Chronicler') || !record.participants.includes('Mad Martiken')) throw new Error(`${record.id} lacks the required participants.`);
  if (!Array.isArray(record.exchanges) || record.exchanges.length < 5) throw new Error(`${record.id} is not a substantial conversation.`);
  if (!record.exchanges.some(exchange => exchange.speaker === 'Mad Martiken') || !record.exchanges.some(exchange => exchange.speaker === 'The Chronicler')) throw new Error(`${record.id} lacks two-sided dialogue.`);
  for (const exchange of record.exchanges) if (!exchange.speaker || !exchange.text) throw new Error(`${record.id} contains an incomplete exchange.`);
  if (!Array.isArray(record.mechanicalNotes) || record.mechanicalNotes.length < 3) throw new Error(`${record.id} lacks mechanical notes.`);
}

const dialogueText = entry.conversationRecords.flatMap(record => [
  record.title,
  record.context,
  ...record.exchanges.flatMap(exchange => [exchange.speaker,exchange.text]),
  ...record.mechanicalNotes
]).join(' ');
for (const phrase of [
  'Costume parties, forbidden masquerades',
  'adult revels',
  'All consenting adults',
  'I am mad, not irresponsible',
  'Temporary work must fail on time',
  'The client sees smoke. The ingredient sees invoices.',
  'Seventy-five percent of the ingredient’s value',
  'Lady Auvrena',
  'Three Gentlemen of the Moon Pool',
  'The second visualization says',
  'Wait thirty days',
  'Seventy-two hours after the final visualization',
  '12 Transfiguration Reserve points'
]) if (!dialogueText.toLowerCase().includes(phrase.toLowerCase())) throw new Error(`Conversation archive lacks '${phrase}'.`);

if (!Array.isArray(entry.supplementalTables) || entry.supplementalTables.length !== 4) throw new Error('Expected four conversation-expansion tables.');
const tables = new Map(entry.supplementalTables.map(table => [table.id,table]));
const expectedTables = new Map([
  ['martiken-premium-event-packages',5],
  ['martiken-component-discount-rules',6],
  ['martiken-layering-compatibility',6],
  ['martiken-transfiguration-reserve',7]
]);
for (const [id,rowCount] of expectedTables) {
  const table = tables.get(id);
  if (!table || !Array.isArray(table.columns) || table.columns.length < 4 || !Array.isArray(table.rows) || table.rows.length !== rowCount) throw new Error(`Supplemental table '${id}' is incomplete.`);
  for (const row of table.rows) if (!Array.isArray(row) || row.length !== table.columns.length) throw new Error(`Supplemental table '${id}' has a malformed row.`);
}

const eventText = tables.get('martiken-premium-event-packages').rows.flat().join(' ');
for (const phrase of ['750 gp per guest','1,000 gp per guest','1,500 gp per guest','2,500 gp per guest','10,000 gp venue fee','consenting adults','consent-dismissal phrase']) if (!eventText.includes(phrase)) throw new Error(`Premium event table lacks '${phrase}'.`);
const componentText = tables.get('martiken-component-discount-rules').rows.flat().join(' ');
for (const phrase of ['75% of accepted market value','40% of base service price','+2 on Martiken’s Heal or Spellcraft check','House conduit permits remote use']) if (!componentText.includes(phrase)) throw new Error(`Component table lacks '${phrase}'.`);
const layeringText = tables.get('martiken-layering-compatibility').rows.flat().join(' ');
for (const phrase of ['Revision within 30 days','Second unrelated permanent graft','Third unrelated permanent graft','Extreme triggers on natural 1–2','Directly conflicting body plans']) if (!layeringText.includes(phrase)) throw new Error(`Layering table lacks '${phrase}'.`);
const reserveText = tables.get('martiken-transfiguration-reserve').rows.flat().join(' ');
for (const phrase of ['12 Transfiguration Reserve points','Temporary cosmetic alteration','Permanent minor function','Major reversal or containment','Each point below zero adds +5%']) if (!`${dialogueText} ${reserveText}`.includes(phrase)) throw new Error(`Reserve rules lack '${phrase}'.`);

for (const requiredRendererText of ['function renderConversations','function renderTables','function renderServicePolicies','entry.conversationRecords','entry.supplementalTables','wiki-reference-table','wiki-dialogue-line']) {
  if (!renderer.includes(requiredRendererText)) throw new Error(`Kaysender wiki renderer lacks '${requiredRendererText}'.`);
}

console.log('Kaysender Mad Martiken conversation validation passed.');
console.log('Verified twelve proprietor conversations, adult-only consent policy, premium event pricing, house-bound components, customer component credits, low-severity case histories, permanent reflection, layering penalties, and the Menagerie’s daily transfiguration reserve.');
