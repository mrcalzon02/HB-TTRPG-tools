import path from 'node:path';
import { pathToFileURL } from 'node:url';

const root = process.cwd();
const fail = message => { throw new Error(message); };
const clone = value => JSON.parse(JSON.stringify(value));

const memoryStorage = new Map();
globalThis.localStorage = {
  getItem(key) { return memoryStorage.has(key) ? memoryStorage.get(key) : null; },
  setItem(key, value) { memoryStorage.set(key, String(value)); },
  removeItem(key) { memoryStorage.delete(key); }
};

await import(pathToFileURL(path.join(root, 'kaysender-editor-kernel.js')).href);
const Kernel = globalThis.KaysenderEditorKernel;
if (!Kernel) fail('Shared editor kernel did not register on globalThis.');

const island = {
  name: 'Aster Reach',
  profileType: 'floating-island-foundation-profile',
  schemaVersion: '2.0.0',
  classification: { sizeClass: 'regional', shapeProfile: 'irregular', currentUse: 'settled' },
  geometry: { lengthKm: 22, widthKm: 13 },
  hydrology: { profile: 'reliable spring network' },
  derivedScores: { settlementViability: 16 }
};

const rootEnvelope = Kernel.createEnvelope(island, {
  editorId: 'floating-island-editor',
  moduleId: 'floating-island-generator'
});
if (rootEnvelope.provenance.generation !== 0) fail('Root envelope did not start at generation 0.');
if (rootEnvelope.provenance.parent !== null) fail('Root envelope unexpectedly has a provenance parent.');
if (rootEnvelope.provenance.lineage.length !== 0) fail('Root envelope unexpectedly has provenance lineage entries.');
if (rootEnvelope.provenance.lineageComplete !== true) fail('Root envelope lineage is not marked complete.');

const revisedRoot = Kernel.createEnvelope({ ...clone(island), name: 'Aster Reach Revised' }, {
  existingEnvelope: rootEnvelope,
  editorId: 'floating-island-editor',
  moduleId: 'floating-island-generator'
});
if (revisedRoot.profileId !== rootEnvelope.profileId || revisedRoot.revision !== 2) fail('Same-profile revision identity behavior regressed.');
if (JSON.stringify(revisedRoot.provenance.lineage) !== JSON.stringify(rootEnvelope.provenance.lineage)) fail('Same-profile revision mutated root lineage.');
if (revisedRoot.provenance.generation !== 0 || revisedRoot.provenance.parent !== null) fail('Same-profile revision mutated root generation or parent.');

const generationOne = Kernel.cloneEnvelope(revisedRoot, {
  editorId: 'floating-island-editor',
  moduleId: 'floating-island-generator',
  name: 'Aster Reach Branch'
});
if (generationOne.profileId === revisedRoot.profileId) fail('Generation 1 clone did not receive a fresh profile identity.');
if (generationOne.provenance.generation !== 1) fail('Generation 1 clone has the wrong generation number.');
if (generationOne.provenance.lineage.length !== 1) fail('Generation 1 clone must contain exactly one lineage snapshot.');
if (generationOne.provenance.parent?.profileId !== revisedRoot.profileId || generationOne.provenance.parent?.revision !== revisedRoot.revision) fail('Generation 1 parent snapshot does not identify the exact source revision.');
if (JSON.stringify(generationOne.provenance.parent) !== JSON.stringify(generationOne.provenance.lineage[0])) fail('Generation 1 parent is not the final lineage entry.');

const revisedGenerationOne = Kernel.createEnvelope({ ...clone(generationOne.data), name: 'Aster Reach Branch Revised' }, {
  existingEnvelope: generationOne,
  editorId: 'floating-island-editor',
  moduleId: 'floating-island-generator'
});
if (revisedGenerationOne.revision !== 2 || revisedGenerationOne.provenance.generation !== 1) fail('Generation 1 revision mutated generational identity.');
if (JSON.stringify(revisedGenerationOne.provenance.lineage) !== JSON.stringify(generationOne.provenance.lineage)) fail('Generation 1 revision mutated ancestry.');

const generationTwo = Kernel.cloneEnvelope(revisedGenerationOne, {
  editorId: 'floating-island-editor',
  moduleId: 'floating-island-generator',
  name: 'Aster Reach Branch Two'
});
if (generationTwo.provenance.generation !== 2) fail('Generation 2 clone has the wrong generation number.');
if (generationTwo.provenance.lineage.length !== 2) fail('Generation 2 clone must contain exactly two lineage snapshots.');
if (generationTwo.provenance.lineage[0].profileId !== revisedRoot.profileId) fail('Generation 2 lost the root ancestry snapshot.');
if (generationTwo.provenance.lineage[0].revision !== revisedRoot.revision) fail('Generation 2 root snapshot changed revision.');
if (generationTwo.provenance.lineage[1].profileId !== revisedGenerationOne.profileId || generationTwo.provenance.lineage[1].revision !== revisedGenerationOne.revision) fail('Generation 2 immediate ancestor snapshot is incorrect.');
if (JSON.stringify(generationTwo.provenance.parent) !== JSON.stringify(generationTwo.provenance.lineage[1])) fail('Generation 2 parent is not the final lineage entry.');

const roundTrip = Kernel.normalizeImportedRecord(JSON.stringify(generationTwo), {
  expectedTypes: ['floating-island-foundation-profile']
});
if (!roundTrip.ok) fail(`Generation 2 canonical round-trip failed: ${roundTrip.diagnostics.map(item => item.message).join('; ')}`);
for (const field of ['generation', 'parent', 'lineage', 'lineageComplete']) {
  if (JSON.stringify(roundTrip.envelope.provenance[field]) !== JSON.stringify(generationTwo.provenance[field])) fail(`Canonical round-trip mutated provenance.${field}.`);
}

const saved = Kernel.saveDraft('provenance-validator', generationTwo);
if (!saved.ok) fail('Generation 2 draft save failed.');
const recovered = Kernel.loadDraft('provenance-validator');
if (!recovered) fail('Generation 2 draft recovery failed.');
for (const field of ['generation', 'parent', 'lineage', 'lineageComplete']) {
  if (JSON.stringify(recovered.provenance[field]) !== JSON.stringify(generationTwo.provenance[field])) fail(`Draft persistence mutated provenance.${field}.`);
}
Kernel.clearDraft('provenance-validator', true);

const malformed = clone(generationTwo);
malformed.provenance.generation = 3;
const malformedDiagnostics = Kernel.validateEnvelope(malformed, ['floating-island-foundation-profile']);
if (!malformedDiagnostics.some(item => item.code === 'provenance-lineage-length-mismatch')) fail('Malformed generation/lineage length was not detected.');

const parentMismatch = clone(generationTwo);
parentMismatch.provenance.parent.revision += 1;
const mismatchDiagnostics = Kernel.validateEnvelope(parentMismatch, ['floating-island-foundation-profile']);
if (!mismatchDiagnostics.some(item => item.code === 'provenance-parent-lineage-mismatch')) fail('Parent/lineage mismatch was not detected.');

const legacyClone = clone(generationOne);
delete legacyClone.provenance.generation;
delete legacyClone.provenance.parent;
delete legacyClone.provenance.lineage;
delete legacyClone.provenance.lineageComplete;
const legacyResult = Kernel.normalizeImportedRecord(legacyClone, {
  expectedTypes: ['floating-island-foundation-profile']
});
if (!legacyResult.ok) fail('Legacy clone compatibility normalization should remain loadable.');
if (legacyResult.envelope.provenance.generation !== null || legacyResult.envelope.provenance.lineageComplete !== false) fail('Legacy clone ancestry was fabricated instead of being marked incomplete.');
if (!legacyResult.diagnostics.some(item => item.code === 'provenance-lineage-incomplete')) fail('Legacy incomplete ancestry did not emit an actionable warning.');

console.log('Generational provenance validation passed.');
console.log('Verified G0 -> G1 -> G2 lineage, same-profile revision preservation, exact source revisions, canonical round-trip, local draft persistence, malformed ancestry detection, and non-fabricating legacy compatibility.');
