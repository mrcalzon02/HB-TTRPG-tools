import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const read = file => fs.readFile(path.join(root, file), 'utf8');
const readJson = async file => JSON.parse(await read(file));
const exists = file => fs.stat(path.join(root, file)).then(() => true, () => false);

const [
  manifest,
  index,
  activeBuiltins,
  preparedBuiltins,
  adapterFactory,
  schemaBridge,
  legacyProjection,
  profileModel,
  panels,
  panelLifecycle,
  atomicPanels,
  panelBridge,
  migrations,
  registry
] = await Promise.all([
  readJson('data/kaysender/editors/p1-island-activation-manifest.json'),
  read('index.html'),
  read('kaysender-editor-builtins.js'),
  read('kaysender-editor-builtins-v3-prepared.js'),
  read('kaysender-island-v3-adapter-factory.js'),
  read('kaysender-island-v3-adapter-schema-bridge.js'),
  read('kaysender-island-v3-legacy-projection.js'),
  read('kaysender-island-v3-profile-model.js'),
  read('kaysender-island-v3-panels.js'),
  read('kaysender-island-v3-panels-lifecycle.js'),
  read('kaysender-island-v3-panels-atomic.js'),
  read('kaysender-island-v3-adapter-panels-bridge.js'),
  read('kaysender-editor-migrations.js'),
  read('kaysender-editor-adapter-registry.js')
]);

assert.equal(manifest.stage, 'P1');
assert.equal(manifest.stageId, 'floating-island-production-editor');
assert.equal(manifest.status, 'prepared-not-applied');
assert.equal(manifest.activeBranch, 'main');
assert.equal(manifest.currentRuntimeMustRemain.islandAdapterSchemaVersion, '2.0.0');
assert.equal(manifest.currentRuntimeMustRemain.loadedBuiltins, 'kaysender-editor-builtins.js');
assert.equal(manifest.currentRuntimeMustRemain.preparedBuiltinsLoaded, false);
assert.equal(manifest.currentRuntimeMustRemain.preparedAdapterLoaded, false);
assert.equal(manifest.currentRuntimeMustRemain.schemaBridgeLoaded, false);
assert.equal(manifest.currentRuntimeMustRemain.legacyProjectionLoaded, false);
assert.equal(manifest.currentRuntimeMustRemain.structuredPanelsLoaded, false);
assert.equal(manifest.currentRuntimeMustRemain.panelBridgeLoaded, false);
assert.equal(manifest.currentRuntimeMustRemain.migrationRegistered, false);

const scripts = manifest.kaysenderScriptOrder;
const position = file => {
  const indexValue = scripts.indexOf(file);
  assert.notEqual(indexValue, -1, `Activation manifest is missing ${file}.`);
  return indexValue;
};

assert.ok(position('kaysender-editor-adapter-registry.js') < position('kaysender-editor-migrations.js'));
assert.ok(position('kaysender-editor-migrations.js') < position('kaysender-editor-kernel-adapters.js'));
assert.ok(position('kaysender-editor-migrations.js') < position('kaysender-editor-builtins-v3-prepared.js'));
assert.ok(position('kaysender-island-v3-schema-validator.js') < position('kaysender-island-v3-adapter-schema-bridge.js'));
assert.ok(position('kaysender-island-v3-transformers.js') < position('kaysender-island-v3-consumer-builders.js'));
assert.ok(position('kaysender-island-v3-consumer-builders.js') < position('kaysender-island-v3-adapter-factory.js'));
assert.ok(position('kaysender-island-v3-adapter-factory.js') < position('kaysender-island-v3-adapter-schema-bridge.js'));
assert.ok(position('kaysender-island-v3-adapter-schema-bridge.js') < position('kaysender-island-v3-legacy-projection.js'));
assert.ok(position('kaysender-island-v3-legacy-projection.js') < position('kaysender-island-v3-profile-model.js'));
assert.ok(position('kaysender-island-v3-profile-model.js') < position('kaysender-island-v3-panels.js'));
assert.ok(position('kaysender-island-v3-panels.js') < position('kaysender-island-v3-panels-lifecycle.js'));
assert.ok(position('kaysender-island-v3-panels-lifecycle.js') < position('kaysender-island-v3-panels-atomic.js'));
assert.ok(position('kaysender-island-v3-panels-atomic.js') < position('kaysender-island-v3-adapter-panels-bridge.js'));
assert.ok(position('kaysender-island-v3-adapter-panels-bridge.js') < position('kaysender-editor-builtins-v3-prepared.js'));
assert.ok(position('kaysender-editor-builtins-v3-prepared.js') < position('kaysender-editor-production.js'));
assert.equal(scripts.includes('kaysender-editor-builtins.js'), false);
assert.equal(new Set(scripts).size, scripts.length);

for (const asset of manifest.cssAssets) assert.ok(await exists(asset), `Missing CSS asset ${asset}.`);
for (const asset of scripts) assert.ok(await exists(asset), `Missing script asset ${asset}.`);
for (const file of manifest.blockingValidatorsAfterActivation) assert.ok(await exists(file), `Missing validator ${file}.`);
for (const required of [
  'scripts/validate-p1-island-schema.mjs',
  'scripts/validate-p1-island-legacy-projection.mjs',
  'scripts/validate-p1-island-production-panels.mjs',
  'scripts/validate-p1-island-panel-bridge.mjs'
]) assert.ok(manifest.blockingValidatorsAfterActivation.includes(required), `Manifest omits blocking validator ${required}.`);
assert.ok(manifest.cssAssets.includes('kaysender-island-v3-panels.css'));

const registerCalls = preparedBuiltins.match(/Registry\.register\(/g) || [];
const migrationCalls = preparedBuiltins.match(/Migrations\.register\(/g) || [];
assert.equal(registerCalls.length, manifest.registrationExpectations.adapterCount);
assert.equal(migrationCalls.length, 1);
assert.ok(preparedBuiltins.includes('Registry.register(IslandFactory.createDefinition())'));
assert.ok(preparedBuiltins.includes('Migrations.register(IslandFactory.createMigrationDefinition())'));
assert.equal(preparedBuiltins.includes("currentSchemaVersion: '2.0.0'"), false);

for (const marker of [
  "id: 'settlement-editor'", "profileType: 'settlement-profile'",
  "id: 'airship-editor'", "profileType: 'airship-profile'",
  "relationship: 'parent-island'", "relationship: 'parent-settlement'"
]) {
  assert.ok(activeBuiltins.includes(marker));
  assert.ok(preparedBuiltins.includes(marker));
}

assert.ok(activeBuiltins.includes("id: 'floating-island-editor'"));
assert.ok(activeBuiltins.includes("currentSchemaVersion: '2.0.0'"));
assert.equal(activeBuiltins.includes('IslandFactory.createDefinition'), false);
assert.ok(adapterFactory.includes("const SCHEMA_VERSION = '3.0.0'"));
assert.equal(adapterFactory.includes('KaysenderEditorAdapters.register'), false);
assert.ok(schemaBridge.includes('const schema = root.KaysenderIslandV3Schema'));
assert.ok(schemaBridge.includes('const result = validateCanonical(profile)'));
assert.ok(legacyProjection.includes('const LEGACY_FIELD_MAP = Object.freeze'));
assert.ok(legacyProjection.includes('sizeClass: projectSize'));
assert.ok(legacyProjection.includes('shapeProfile: projectShape'));
assert.ok(legacyProjection.includes('mapping.apply(form, profile, LEGACY_FIELD_MAP)'));
assert.ok(profileModel.includes('class IslandProfileModel'));
assert.ok(profileModel.includes('setFields(changes = [])'));
assert.ok(profileModel.includes('removeRecord(collectionId, recordId'));
assert.ok(panels.includes('class IslandProductionPanels'));
assert.ok(panelLifecycle.includes('production-change-batch'));
assert.ok(atomicPanels.includes('AtomicIslandProductionController'));
assert.ok(panelBridge.includes('Advanced Read-Only JSON Ledger View'));
assert.ok(panelBridge.includes('profile.map = clone(session.controller?.getMap?.()'));
assert.ok(panelBridge.includes('root.KaysenderIslandV3AdapterFactory = Object.freeze'));
for (const source of [schemaBridge, legacyProjection, panelBridge]) assert.equal(source.includes('KaysenderEditorAdapters.register'), false);

assert.ok(migrations.includes('function register(definition)'));
assert.ok(registry.includes('function register(input)'));
assert.ok(registry.includes("'readProfile'"));
assert.ok(registry.includes("'applyProfileToForm'"));
assert.ok(registry.includes("'getWikiDraft'"));

assert.ok(index.includes('<script src="kaysender-editor-builtins.js"></script>'));
assert.equal(index.includes('kaysender-editor-builtins-v3-prepared.js'), false);
for (const asset of [
  'kaysender-island-v3-adapter-factory.js',
  'kaysender-island-v3-adapter-schema-bridge.js',
  'kaysender-island-v3-legacy-projection.js',
  'kaysender-island-v3-profile-model.js',
  'kaysender-island-v3-panels.js',
  'kaysender-island-v3-panels-lifecycle.js',
  'kaysender-island-v3-panels-atomic.js',
  'kaysender-island-v3-adapter-panels-bridge.js',
  'kaysender-island-v3-schema-validator.js',
  'kaysender-island-v3-adapter.css',
  'kaysender-island-v3-panels.css',
  'kaysender-surface-grid-resize.js',
  'kaysender-island-v3-consumer-builders.js'
]) assert.equal(index.includes(asset), false, `Current runtime loads ${asset}.`);

assert.equal(manifest.registrationExpectations.adapterCount, 3);
assert.equal(manifest.registrationExpectations.migrationId, 'island-2.0.0-to-3.0.0');
assert.equal(manifest.registrationExpectations.islandSchemaVersion, '3.0.0');
assert.equal(manifest.registrationExpectations.settlementSchemaVersion, '1.0.0');
assert.equal(manifest.registrationExpectations.airshipSchemaVersion, '1.0.0');
assert.equal(manifest.registrationExpectations.duplicateIslandRegistrationForbidden, true);
assert.equal(manifest.registrationExpectations.finalWrappedTransformerRequired, true);
assert.equal(manifest.registrationExpectations.schemaBridgeRequired, true);
assert.equal(manifest.registrationExpectations.legacyProjectionRequired, true);
assert.equal(manifest.registrationExpectations.structuredPanelsRequired, true);
assert.equal(manifest.registrationExpectations.panelBridgeRequired, true);

console.log('P1 Island activation manifest validation passed.');
console.log('Verified every prepared asset exists, final factory and structured-panel layering order, single built-ins replacement, registration counts, unchanged child contracts, current 2.0.0 state, and absence of prepared P1 assets from the active runtime.');
