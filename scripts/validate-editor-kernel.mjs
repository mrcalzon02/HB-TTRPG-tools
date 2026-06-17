import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';

const root = process.cwd();
const readText = relativePath => fs.readFile(path.join(root, relativePath), 'utf8');
const readJson = async relativePath => JSON.parse(await readText(relativePath));
const fail = message => { throw new Error(message); };

const memoryStorage = new Map();
globalThis.localStorage = {
  getItem(key) { return memoryStorage.has(key) ? memoryStorage.get(key) : null; },
  setItem(key, value) { memoryStorage.set(key, String(value)); },
  removeItem(key) { memoryStorage.delete(key); }
};

await import(pathToFileURL(path.join(root, 'kaysender-editor-kernel.js')).href);
const Kernel = globalThis.KaysenderEditorKernel;
if (!Kernel) fail('Shared editor kernel did not register on globalThis.');
if (Kernel.ENVELOPE_VERSION !== '1.0.0') fail('Unexpected editor envelope version.');

const schema = await readJson('data/kaysender/schemas/editor-profile-envelope.schema.json');
const requiredEnvelopeFields = [
  'editorEnvelopeVersion', 'profileId', 'profileType', 'profileSchemaVersion',
  'revision', 'createdAt', 'updatedAt', 'provenance', 'inheritance',
  'locks', 'diagnostics', 'data'
];
for (const field of requiredEnvelopeFields) {
  if (!schema.required?.includes(field)) fail(`Envelope schema does not require '${field}'.`);
}

const nestedIsland = await readJson('data/kaysender/editors/fixtures/island-current-nested.json');
const legacyIsland = await readJson('data/kaysender/editors/fixtures/island-legacy-flat.json');

const nestedResult = Kernel.normalizeImportedRecord(nestedIsland, {
  expectedTypes: ['floating-island-foundation-profile'],
  editorId: 'settlement-editor',
  moduleId: 'settlement-generator'
});
if (!nestedResult.ok) fail(`Current nested island fixture failed import: ${nestedResult.diagnostics.map(item => item.message).join('; ')}`);
if (nestedResult.context.waterProfile !== 'reliable spring network') fail('Nested island hydrology was not adapted to waterProfile.');
if (nestedResult.context.routeAccess !== 'regular regional traffic') fail('Nested island access was not adapted to routeAccess.');
if (nestedResult.context.primaryResource !== 'skystone') fail('Nested island resources were not adapted to primaryResource.');
if (nestedResult.context.altitudeBand !== 'high altitude') fail('Nested island altitude was not adapted to altitudeBand.');
if (nestedResult.context.derivedScores.habitability !== 16) fail('Nested island settlement viability was not adapted to habitability.');
if (nestedResult.context.derivedScores.collapseRisk !== 5) fail('Nested island hazard pressure was not adapted to collapseRisk.');
if (nestedResult.context.derivedScores.routeValue !== 16) fail('Nested island route reliability was not adapted to routeValue.');
const nestedMigrationCodes = nestedResult.envelope.provenance.migrationLog.map(item => item.code);
if (nestedMigrationCodes.filter(code => code === 'nested-island-adapter').length !== 1) fail('Nested island adapter migration must be recorded exactly once.');
if (nestedMigrationCodes.filter(code => code === 'legacy-profile-wrapped').length !== 1) fail('Legacy wrapping migration must be recorded exactly once.');

const legacyResult = Kernel.normalizeImportedRecord(legacyIsland, {
  expectedTypes: ['floating-island-foundation-profile']
});
if (!legacyResult.ok) fail('Legacy flat island fixture failed import.');
for (const [field, expected] of [
  ['waterProfile', 'rain capture and small springs'],
  ['foodProfile', 'tight but stable'],
  ['routeAccess', 'major established route'],
  ['primaryResource', 'freshwater'],
  ['altitudeBand', 'middle altitude']
]) {
  if (legacyResult.context[field] !== expected) fail(`Legacy island field '${field}' was not preserved.`);
}
const legacyMigrationCodes = legacyResult.envelope.provenance.migrationLog.map(item => item.code);
if (legacyMigrationCodes.filter(code => code === 'flat-island-adapter').length !== 1) fail('Legacy island adapter migration must be recorded exactly once.');

const envelope = Kernel.createEnvelope(nestedIsland, {
  editorId: 'floating-island-editor',
  moduleId: 'floating-island-generator',
  locks: ['name', 'sizeClass']
});
const envelopeDiagnostics = Kernel.validateEnvelope(envelope, ['floating-island-foundation-profile']);
if (envelopeDiagnostics.some(item => item.severity === 'error')) fail(`Created envelope is invalid: ${envelopeDiagnostics.map(item => item.message).join('; ')}`);
if (!/^island-[a-z0-9-]+-[a-f0-9]{8,}$/.test(envelope.profileId)) fail('Stable island profile ID does not match the canonical pattern.');
if (envelope.revision !== 1 || envelope.locks.join(',') !== 'name,sizeClass') fail('Initial revision or field locks are incorrect.');

const volatileRebuild = {
  ...JSON.parse(JSON.stringify(nestedIsland)),
  generatedAt: '2099-01-01T00:00:00.000Z'
};
const unchanged = Kernel.createEnvelope(volatileRebuild, {
  existingEnvelope: envelope,
  editorId: 'floating-island-editor',
  moduleId: 'floating-island-generator',
  locks: ['sizeClass', 'name']
});
if (unchanged.revision !== 1 || unchanged.updatedAt !== envelope.updatedAt) fail('Unchanged profile validation or export advanced its revision or update timestamp.');
if (unchanged.data.generatedAt !== envelope.data.generatedAt) fail('Volatile rebuild timestamp replaced canonical data without a substantive revision.');

const revision = Kernel.createEnvelope({ ...nestedIsland, name: 'Aster Reach Revised' }, {
  existingEnvelope: unchanged,
  editorId: 'floating-island-editor',
  moduleId: 'floating-island-generator'
});
if (revision.profileId !== envelope.profileId || revision.revision !== 2 || revision.createdAt !== envelope.createdAt) fail('Changed envelope did not preserve stable identity and advance exactly one revision.');

const clone = Kernel.cloneEnvelope(revision, {
  editorId: 'floating-island-editor',
  moduleId: 'floating-island-generator'
});
if (clone.profileId === revision.profileId || clone.revision !== 1) fail('Clone did not receive a fresh identity and revision.');
if (clone.provenance.clonedFromProfileId !== revision.profileId) fail('Clone provenance does not identify its source profile.');

const canonicalReload = Kernel.normalizeImportedRecord(JSON.stringify(revision), {
  expectedTypes: ['floating-island-foundation-profile']
});
if (!canonicalReload.ok || canonicalReload.envelope.profileId !== revision.profileId) fail('Canonical envelope did not round-trip through import.');

const saveResult = Kernel.saveDraft('floating-island-editor', revision);
if (!saveResult.ok) fail('Kernel could not save a local recovery draft.');
const protectedClear = Kernel.clearDraft('floating-island-editor');
if (protectedClear.ok) fail('A non-explicit draft clear unexpectedly succeeded.');
const recoveredDraft = Kernel.loadDraft('floating-island-editor');
if (!recoveredDraft || recoveredDraft.profileId !== revision.profileId) fail('Recovery draft did not survive a non-explicit clear.');
const explicitClear = Kernel.clearDraft('floating-island-editor', true);
if (!explicitClear.ok || Kernel.loadDraft('floating-island-editor')) fail('Explicit draft clear did not remove the saved draft.');

const wrongType = Kernel.normalizeImportedRecord(nestedIsland, { expectedTypes: ['settlement-profile'] });
if (wrongType.ok || !wrongType.diagnostics.some(item => item.code === 'profile-type-mismatch')) fail('Wrong-profile import did not produce an actionable mismatch error.');

const malformed = Kernel.normalizeImportedRecord('{not valid json', { expectedTypes: ['settlement-profile'] });
if (malformed.ok || !malformed.diagnostics.some(item => item.code === 'json-parse-failed')) fail('Malformed JSON did not produce an actionable parse error.');

const productionScript = await readText('kaysender-editor-production.js');
for (const phrase of [
  'New Blank Record',
  'Load / Import Record',
  'Validate Record',
  'Save Local Draft',
  'Clone Record',
  'Randomize Unlocked Fields',
  'Export Canonical JSON',
  'Export Wiki Draft',
  'Provenance and Inheritance',
  'Diagnostics',
  'const Registry = window.KaysenderEditorAdapters',
  'const Lifecycle = window.KaysenderEditorLifecycle',
  'async function launch(editorIdOrAlias)',
  'adapter.parentImports.forEach',
  'Kernel.clearDraft(adapter.id, true)',
  'getActiveEnvelope:'
]) {
  if (!productionScript.includes(phrase)) fail(`Production shell is missing '${phrase}'.`);
}
if (productionScript.includes('const editorSpecs =')) fail('Production shell still contains the removed hardcoded editor specification table.');

const smokeScript = await readText('kaysender-editor-live-smoke.js');
for (const phrase of [
  'Run P0 Live Smoke Test',
  'launchIsland',
  'launchSettlement',
  'launchAirship',
  'kaysender-editor-panel',
  'kaysender-settlement-editor-panel',
  'kaysender-airship-editor-panel',
  'settlement-island-import',
  'airship-island-import',
  'airship-settlement-import',
  'inheritanceReference',
  'hb-ttrpg-tools:p0-live-smoke:last-pass'
]) {
  if (!smokeScript.includes(phrase)) fail(`Live browser smoke harness is missing '${phrase}'.`);
}

const html = await readText('index.html');
const kernelPosition = html.indexOf('<script src="kaysender-editor-kernel.js"></script>');
const mappingPosition = html.indexOf('<script src="kaysender-editor-field-mapping.js"></script>');
const adapterPosition = html.indexOf('<script src="kaysender-editor-adapter-registry.js"></script>');
const builtinsPosition = html.indexOf('<script src="kaysender-editor-builtins.js"></script>');
const migrationPosition = html.indexOf('<script src="kaysender-editor-migrations.js"></script>');
const kernelAdaptersPosition = html.indexOf('<script src="kaysender-editor-kernel-adapters.js"></script>');
const islandPosition = html.indexOf('<script src="kaysender-editors.js"></script>');
const settlementPosition = html.indexOf('<script src="kaysender-settlement-editor.js"></script>');
const airshipPosition = html.indexOf('<script src="kaysender-airship-editor.js"></script>');
const productionPosition = html.indexOf('<script src="kaysender-editor-production.js"></script>');
const smokePosition = html.indexOf('<script src="kaysender-editor-live-smoke.js"></script>');
const positions = [
  kernelPosition,
  mappingPosition,
  adapterPosition,
  builtinsPosition,
  migrationPosition,
  kernelAdaptersPosition,
  islandPosition,
  settlementPosition,
  airshipPosition,
  productionPosition,
  smokePosition
];
if (positions.some(position => position < 0)) fail('Main page does not load the complete P0 editor runtime.');
if (!positions.every((position, index) => index === 0 || position > positions[index - 1])) fail('P0 editor scripts are loaded in the wrong order.');

console.log('Shared editor kernel validation passed.');
console.log('Verified base envelope behavior, stable revisions, explicit-only draft deletion, nested and flat context adapters, generic production actions, adapter-driven script ordering, wrong-profile diagnostics, malformed JSON diagnostics, and the live browser smoke harness.');
