import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import vm from 'node:vm';

const root = process.cwd();
const indexPath = path.join(root,'data','elemental-realms','wiki','wiki-index.json');
const index = JSON.parse(await fs.readFile(indexPath,'utf8'));
if (index.schemaVersion !== '1.2.0') throw new Error('Unexpected Elemental Realms wiki index schema.');
if (index.status !== 'creature-reference-pass-2-complete') throw new Error('Elemental Realms second creature pass is not marked complete.');
if (!index.sourceDocuments?.includes('source-page-references/Chronicles-of-Elemental-Realms-Swamps-Toads-Frogs-and-Salamanders.source.json')) throw new Error('Elemental Realms source receipt is not registered.');

const expectedPacks = [
  'elemental-realms-creature-core.js',
  'elemental-realms-creatures-primary.js',
  'elemental-realms-creatures-secondary.js',
  'elemental-realms-creatures-expansions.js',
  'elemental-realms-creatures-leeches.js',
  'elemental-realms-creatures-context.js'
];
if (JSON.stringify(index.packs) !== JSON.stringify(expectedPacks)) throw new Error('Elemental Realms pack order or membership is incorrect.');

const context = vm.createContext({ window:{}, console });
for (const pack of expectedPacks) {
  const source = await fs.readFile(path.join(root,pack),'utf8');
  vm.runInContext(source,context,{filename:pack});
}
const wiki = context.window.HBElementalRealmsWiki;
if (!wiki || wiki.schemaVersion !== '1.1.0') throw new Error('Elemental Realms creature registry did not initialize.');
if (!Array.isArray(wiki.categories) || wiki.categories.length !== 11) throw new Error('Expected eleven Elemental Realms wiki categories.');
if (!Array.isArray(wiki.entries) || wiki.entries.length !== 60) throw new Error(`Expected 60 creature references, found ${wiki.entries?.length ?? 0}.`);
if (!wiki.ecologyOverview?.body || wiki.ecologyOverview.body.length < 3) throw new Error('Planar swamp ecology overview is incomplete.');
if (!wiki.leechTreatise?.body || wiki.leechTreatise.body.length < 5) throw new Error('Historical leech classification treatise is incomplete.');

const allowedProvenance = new Set(['manuscript-creature','manuscript-adjacent-conversion','index-derived-conversion','new-canon-expansion']);
const allowedConfidence = new Set(['high','medium','low']);
const allowedFeedingModes = new Set(['Parasitic','Symbiotic','Facultative']);
const categoryIds = new Set(wiki.categories.map(category => category.id));
const ids = new Set();
const requiredFields = ['id','name','category','provenance','confidence','sourceBasis','summary','size','type','initiative','senses','languages','ac','touch','flatFooted','hp','hitDice','saves','speed','bab','grapple','space','reach','abilities','environment','organization','advancement','cr','combat','diet','ecology'];
const arrayFields = ['aliases','subtypes','sourcePages','skills','feats','attacks','specialAttacks','specialQualities'];

for (const entry of wiki.entries) {
  for (const field of requiredFields) if (entry[field] === undefined || entry[field] === null || entry[field] === '') throw new Error(`${entry.id || entry.name || 'Unknown entry'} is missing '${field}'.`);
  for (const field of arrayFields) if (!Array.isArray(entry[field])) throw new Error(`${entry.id}: '${field}' must be an array.`);
  if (ids.has(entry.id)) throw new Error(`Duplicate creature id '${entry.id}'.`);
  ids.add(entry.id);
  if (!categoryIds.has(entry.category)) throw new Error(`${entry.id}: unknown category '${entry.category}'.`);
  if (!allowedProvenance.has(entry.provenance)) throw new Error(`${entry.id}: unknown provenance '${entry.provenance}'.`);
  if (!allowedConfidence.has(entry.confidence)) throw new Error(`${entry.id}: unknown confidence '${entry.confidence}'.`);
  if (entry.provenance !== 'new-canon-expansion' && entry.sourcePages.length === 0) throw new Error(`${entry.id}: source-derived entry lacks source pages.`);
  if (entry.provenance === 'new-canon-expansion' && entry.sourcePages.length !== 0) throw new Error(`${entry.id}: new canon expansion must not claim manuscript pages.`);
  if (!entry.diet.includes(' ') || !entry.ecology.includes(' ')) throw new Error(`${entry.id}: diet or ecology text is too thin.`);
}

for (const categoryId of categoryIds) if (!wiki.entries.some(entry => entry.category === categoryId)) throw new Error(`Category '${categoryId}' has no creature entries.`);
for (const requiredId of ['cinder-frog','magnetic-frog-beast','snode']) if (!ids.has(requiredId)) throw new Error(`Required canon expansion '${requiredId}' is missing.`);
for (const requiredId of ['serpentarii-sagescale','abyssal-eel','great-tolmunde-flame-toad','golem-frog','stone-toad','terracore-behemoth','ethereal-swamp-toad','carnivorous-spectral-toad','para-elemental-mudpuppy','smoke-toad']) if (!ids.has(requiredId)) throw new Error(`Detailed manuscript creature '${requiredId}' is missing.`);

const requiredLeechIds = [
  'bloodreed-leech','mire-mender-leech','tideglass-leech','stoneblood-burrower','breathwick-leech','memory-leech','brine-sump-leech',
  'ember-vein-leech','cinder-suture-leech','furnace-maw-leech','ashen-brood-leech-swarm','pyroclast-lamprey','hearthshare-leech','slag-bloom-leech','dream-leech'
];
for (const requiredId of requiredLeechIds) if (!ids.has(requiredId)) throw new Error(`Required leech catalogue expansion '${requiredId}' is missing.`);

const leeches = wiki.entries.filter(entry => entry.catalogClass === 'leech');
if (leeches.length !== 15) throw new Error(`Expected 15 leech catalogue entries, found ${leeches.length}.`);
for (const entry of leeches) {
  for (const field of ['morphology','feedingMode','planeAffinity','sustenance','catalogNotes']) if (!entry[field]) throw new Error(`${entry.id}: leech catalogue field '${field}' is missing.`);
  if (!allowedFeedingModes.has(entry.feedingMode)) throw new Error(`${entry.id}: unknown leech feeding mode '${entry.feedingMode}'.`);
  if (entry.category !== 'leech-ecologies') throw new Error(`${entry.id}: leech catalogue entry is outside the leech ecology category.`);
}
const feedingModeCounts = Object.fromEntries([...allowedFeedingModes].map(mode => [mode,leeches.filter(entry => entry.feedingMode === mode).length]));
for (const mode of allowedFeedingModes) if (!feedingModeCounts[mode]) throw new Error(`Leech catalogue lacks a ${mode.toLowerCase()} feeding example.`);

const planeCounts = leeches.reduce((counts,entry) => {
  counts[entry.planeAffinity] = (counts[entry.planeAffinity] || 0) + 1;
  return counts;
},{});
const flameCount = planeCounts['Plane of Fire'] || 0;
const largestNonFlame = Math.max(...Object.entries(planeCounts).filter(([plane]) => plane !== 'Plane of Fire').map(([,count]) => count));
if (flameCount < largestNonFlame * 2) throw new Error(`Flame-aligned leech multiplicity is insufficient: ${flameCount} versus non-flame maximum ${largestNonFlame}.`);

const provenanceCounts = Object.fromEntries([...allowedProvenance].map(value => [value,wiki.entries.filter(entry => entry.provenance === value).length]));
if (provenanceCounts['manuscript-creature'] !== 10) throw new Error('Expected ten detailed manuscript creatures.');
if (provenanceCounts['new-canon-expansion'] !== 25) throw new Error('Expected twenty-five new canon expansion creatures.');
if (wiki.entries.filter(entry => entry.category === 'arthropod-ecologies').length !== 7) throw new Error('Expected seven fully statted arthropod ecology entries.');
if (wiki.entries.filter(entry => entry.category === 'leech-ecologies').length !== 15) throw new Error('Expected fifteen fully statted leech ecology entries.');
if (!index.featuredCanonExpansions?.every(id => ids.has(id))) throw new Error('Wiki index references a missing featured canon expansion.');
if (!index.featuredLeechExpansions?.every(id => ids.has(id))) throw new Error('Wiki index references a missing featured leech expansion.');
if (!index.leechCatalogPolicy?.definition || !index.leechCatalogPolicy?.classificationModel) throw new Error('Leech catalogue policy is incomplete.');

console.log('Elemental Realms wiki validation passed.');
console.log(`Verified ${wiki.entries.length} creature references across ${wiki.categories.length} categories.`);
console.log(`Provenance: ${JSON.stringify(provenanceCounts)}.`);
console.log(`Verified ${leeches.length} leech catalogue entries with feeding modes ${JSON.stringify(feedingModeCounts)}.`);
console.log(`Planar leech multiplicity: ${JSON.stringify(planeCounts)}.`);
