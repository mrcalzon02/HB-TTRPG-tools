import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import vm from 'node:vm';

const root = process.cwd();
const kernelSource = await fs.readFile(path.join(root, 'kaysender-editor-kernel.js'), 'utf8');
const repositorySource = await fs.readFile(path.join(root, 'kaysender-editor-repository.js'), 'utf8');
const recordLibrarySource = await fs.readFile(path.join(root, 'kaysender-editor-record-library.js'), 'utf8');
const fail = message => { throw new Error(message); };
const assert = (condition, message) => { if (!condition) fail(message); };

const storageValues = new Map();
const localStorage = {
  get length() { return storageValues.size; },
  getItem: key => storageValues.has(String(key)) ? storageValues.get(String(key)) : null,
  setItem: (key, value) => storageValues.set(String(key), String(value)),
  removeItem: key => storageValues.delete(String(key)),
  key: index => Array.from(storageValues.keys())[index] ?? null,
  clear: () => storageValues.clear()
};
const crypto = {
  randomUUID: (() => {
    let counter = 1;
    return () => `00000000-0000-4000-8000-${String(counter++).padStart(12, '0')}`;
  })()
};
const context = {
  console,
  localStorage,
  crypto,
  setTimeout,
  clearTimeout
};
context.window = context;
context.globalThis = context;
vm.createContext(context);
new vm.Script(kernelSource, { filename: 'kaysender-editor-kernel.js' }).runInContext(context);
new vm.Script(repositorySource, { filename: 'kaysender-editor-repository.js' }).runInContext(context);

const Kernel = context.KaysenderEditorKernel;
const Repository = context.KaysenderEditorRepository;
assert(Kernel, 'Shared editor kernel did not initialize in the isolated validation runtime.');
assert(Repository, 'Saved record repository did not initialize in the isolated validation runtime.');

const rootData = {
  profileType: 'settlement-profile',
  schemaVersion: '1.0.0',
  name: 'Roundtrip Root',
  settlementType: 'village',
  populationScale: 'small',
  governmentType: 'council',
  derivedScores: { stability: 10 }
};

const g0 = Kernel.createEnvelope(rootData, { editorId: 'roundtrip-test', moduleId: 'roundtrip-test' });
assert(g0.provenance.generation === 0, 'New canonical record must begin at generation 0.');
assert(g0.revision === 1, 'New canonical record must begin at revision 1.');
assert(g0.provenance.parent === null, 'Generation 0 record must not have a parent.');
assert(g0.provenance.lineage.length === 0 && g0.provenance.lineageComplete === true, 'Generation 0 lineage must be complete and empty.');
assert(!Kernel.validateEnvelope(g0, ['settlement-profile']).some(item => item.severity === 'error'), 'Generation 0 record failed canonical validation.');

const revisedData = JSON.parse(JSON.stringify(g0.data));
revisedData.populationScale = 'medium';
const g0r2 = Kernel.createEnvelope(revisedData, { existingEnvelope: g0, editorId: 'roundtrip-test', moduleId: 'roundtrip-test' });
assert(g0r2.profileId === g0.profileId, 'Revision changed stable profile identity.');
assert(g0r2.revision === 2, 'Changed canonical record did not advance revision.');
assert(g0r2.provenance.generation === 0, 'Revision incorrectly advanced generation.');
assert(g0r2.provenance.lineage.length === 0, 'Revision incorrectly changed generational lineage.');

const g1 = Kernel.cloneEnvelope(g0r2, { editorId: 'roundtrip-test', moduleId: 'roundtrip-test', name: 'Roundtrip Child' });
assert(g1.profileId !== g0r2.profileId, 'Clone did not create a new stable profile identity.');
assert(g1.revision === 1, 'New clone must begin at revision 1.');
assert(g1.provenance.generation === 1, 'First clone must be generation 1.');
assert(g1.provenance.parent?.profileId === g0r2.profileId && g1.provenance.parent?.revision === g0r2.revision, 'Generation 1 immediate parent does not pin the source revision.');
assert(g1.provenance.lineage.length === 1 && g1.provenance.lineage[0].profileId === g0r2.profileId, 'Generation 1 lineage does not contain its root source.');

const g2 = Kernel.cloneEnvelope(g1, { editorId: 'roundtrip-test', moduleId: 'roundtrip-test', name: 'Roundtrip Grandchild' });
assert(g2.provenance.generation === 2, 'Second clone must be generation 2.');
assert(g2.provenance.parent?.profileId === g1.profileId, 'Generation 2 immediate parent is not generation 1.');
assert(g2.provenance.lineage.length === 2, 'Generation 2 lineage must contain exactly two ancestors.');
assert(g2.provenance.lineage[0].profileId === g0r2.profileId && g2.provenance.lineage[1].profileId === g1.profileId, 'Generation 2 lineage order is not root-to-parent.');
assert(!Kernel.validateEnvelope(g2, ['settlement-profile']).some(item => item.severity === 'error'), 'Generation 2 record failed canonical validation.');

const imported = Kernel.normalizeImportedRecord(JSON.stringify(g2), { expectedTypes: ['settlement-profile'] });
assert(imported.ok, 'Canonical generation 2 JSON failed import roundtrip.');
assert(imported.envelope.profileId === g2.profileId && imported.envelope.revision === g2.revision, 'Import roundtrip changed stable identity or revision.');
assert(imported.envelope.provenance.generation === 2, 'Import roundtrip changed generation.');
assert(imported.envelope.provenance.parent?.profileId === g1.profileId, 'Import roundtrip changed immediate parent.');
assert(imported.envelope.provenance.lineage.map(item => item.profileId).join('|') === g2.provenance.lineage.map(item => item.profileId).join('|'), 'Import roundtrip changed lineage order or identities.');
assert(imported.envelope.provenance.lineageComplete === true, 'Import roundtrip lost lineage completeness.');

assert(Repository.save(g0).ok, 'Repository failed to save generation 0 revision 1.');
assert(Repository.save(g0r2).ok, 'Repository failed to update generation 0 to revision 2.');
assert(Repository.save(g1).ok, 'Repository failed to save generation 1.');
assert(Repository.save(g2).ok, 'Repository failed to save generation 2.');

const allRecords = Repository.list({ editorId: 'roundtrip-test' });
assert(allRecords.length === 3, 'Repository index did not retain exactly the three stable generational records.');
const g2Metadata = allRecords.find(item => item.profileId === g2.profileId);
assert(g2Metadata?.generation === 2, 'Repository index lost generation 2 metadata.');
assert(g2Metadata?.lineageComplete === true, 'Repository index lost lineage completeness.');
assert(g2Metadata?.parentProfileId === g1.profileId && g2Metadata?.parentRevision === g1.revision, 'Repository index lost the immediate parent identity or revision.');
assert(g2Metadata?.rootProfileId === g0r2.profileId && g2Metadata?.rootRevision === g0r2.revision, 'Repository index lost the root identity or pinned revision.');
assert(Repository.list({ query: 'G2' }).some(item => item.profileId === g2.profileId), 'Repository findability search could not locate generation 2 by generation label.');
assert(Repository.list({ query: g1.profileId }).some(item => item.profileId === g2.profileId), 'Repository findability search could not locate generation 2 by parent identity.');
assert(Repository.list({ query: g0r2.profileId }).some(item => item.profileId === g2.profileId), 'Repository findability search could not locate generation 2 by root identity.');

const loadedG2 = Repository.load(g2.profileId);
assert(loadedG2.ok, 'Repository failed to load the saved generation 2 record.');
assert(loadedG2.envelope.profileId === g2.profileId && loadedG2.envelope.revision === g2.revision, 'Repository load changed generation 2 stable identity or revision.');
assert(loadedG2.envelope.provenance.generation === 2, 'Repository load changed generation 2 provenance.');
assert(loadedG2.envelope.provenance.parent?.profileId === g1.profileId, 'Repository load changed the immediate parent.');
assert(loadedG2.envelope.provenance.lineage.map(item => item.profileId).join('|') === g2.provenance.lineage.map(item => item.profileId).join('|'), 'Repository load changed lineage order or identities.');

const conflictingG2 = JSON.parse(JSON.stringify(g2));
conflictingG2.provenance.lineage[0].name = 'Conflicting Root Label';
assert(!Kernel.validateEnvelope(conflictingG2, ['settlement-profile']).some(item => item.severity === 'error'), 'Conflict fixture must remain a structurally valid envelope.');
const conflictResult = Repository.save(conflictingG2);
assert(conflictResult.ok === false && conflictResult.conflict === true, 'Repository did not reject same-revision provenance divergence as a conflict.');
const afterConflict = Repository.load(g2.profileId);
assert(afterConflict.ok && afterConflict.envelope.provenance.lineage[0].name === g2.provenance.lineage[0].name, 'Rejected provenance conflict altered the canonical stored record.');

const index = JSON.parse(localStorage.getItem(Repository.indexKey));
const staleG2 = index.find(item => item.profileId === g2.profileId);
assert(staleG2, 'Could not locate generation 2 metadata for stale-index repair fixture.');
delete staleG2.generation;
localStorage.setItem(Repository.indexKey, JSON.stringify(index));
const staleHealth = Repository.indexHealth();
assert(staleHealth.ok && staleHealth.stale && staleHealth.outdated.includes(g2.profileId), 'Repository health check did not detect stale provenance index metadata.');
const repair = Repository.ensureIndexCurrent({ force: true });
assert(repair.ok && repair.repaired === true, 'Repository did not rebuild stale index metadata from canonical saved records.');
const repairedG2 = Repository.list({ query: 'G2' }).find(item => item.profileId === g2.profileId);
assert(repairedG2?.generation === 2 && repairedG2?.rootProfileId === g0r2.profileId && repairedG2?.parentProfileId === g1.profileId, 'Index repair did not restore generation/root/parent metadata or findability.');

// Presentation contract: keep repository metadata visible and searchable without reopening
// canonical records during ordinary library refresh. This keeps the library fast and makes
// provenance understandable at the point where users select records.
assert(recordLibrarySource.includes("return `${record.name} · ${generationLabel(record)} · r${record.revision}${lineageWarning}`;"), 'Saved Record Library no longer presents name, generation, and revision together.');
assert(recordLibrarySource.includes("const lineageWarning = record.lineageComplete === false ? ' · lineage incomplete' : '';"), 'Saved Record Library no longer exposes incomplete lineage in record labels.');
assert(recordLibrarySource.includes("query: filters.query") && recordLibrarySource.includes("lineageComplete: filters.lineageComplete"), 'Saved Record Library no longer forwards findability filters to repository metadata search.');
assert(recordLibrarySource.includes("const parent = record.parentProfileId ?") && recordLibrarySource.includes("const root = record.rootProfileId ?"), 'Saved Record Library no longer exposes parent/root provenance in record discovery metadata.');
const refreshSource = recordLibrarySource.slice(recordLibrarySource.indexOf('function refresh()'), recordLibrarySource.indexOf('async function rebuildEnvelope()'));
assert(refreshSource.length > 0, 'Could not isolate Saved Record Library refresh implementation for integration validation.');
assert(!refreshSource.includes('Repository.load('), 'Saved Record Library refresh reopens canonical records instead of using indexed metadata.');
assert(refreshSource.includes('Repository.ensureIndexCurrent') || recordLibrarySource.includes('function repositoryHealthSummary()'), 'Saved Record Library no longer integrates repository index-health recovery into refresh.');

console.log('Editor generational provenance, repository roundtrip, and library findability contract validation passed.');
console.log(`Verified ${g0.profileId} r1 -> r2 without generation change, clone to G1/G2, repository save/index/search/load, same-revision provenance conflict rejection, stale-index repair, and library metadata/findability integration.`);
