import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import vm from 'node:vm';

const root = process.cwd();
const kernelSource = await fs.readFile(path.join(root, 'kaysender-editor-kernel.js'), 'utf8');
const fail = message => { throw new Error(message); };
const assert = (condition, message) => { if (!condition) fail(message); };

const storageValues = new Map();
const localStorage = {
  getItem: key => storageValues.has(key) ? storageValues.get(key) : null,
  setItem: (key, value) => storageValues.set(String(key), String(value)),
  removeItem: key => storageValues.delete(String(key))
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

const Kernel = context.KaysenderEditorKernel;
assert(Kernel, 'Shared editor kernel did not initialize in the isolated validation runtime.');

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

console.log('Editor generational provenance roundtrip validation passed.');
console.log(`Verified ${g0.profileId} r1 -> r2 without generation change, clone to G1, clone to G2, and canonical JSON import with pinned root/parent ancestry preserved.`);
