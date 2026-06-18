import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const read = file => fs.readFile(path.join(root, file), 'utf8');
const readJson = async file => JSON.parse(await read(file));

const [manifest, index, activeBuiltins, preparedBuiltins, adapterFactory, migrations, registry] = await Promise.all([
  readJson('data/kaysender/editors/p1-island-activation-manifest.json'),
  read('index.html'),
  read('kaysender-editor-builtins.js'),
  read('kaysender-editor-builtins-v3-prepared.js'),
  read('kaysender-island-v3-adapter-factory.js'),
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
assert.ok(position('kaysender-island-v3-transformers.js') < position('kaysender-island-v3-consumer-builders.js'));
assert.ok(position('kaysender-island-v3-consumer-builders.js') < position('kaysender-island-v3-adapter-factory.js'));
assert.ok(position('kaysender-island-v3-adapter-factory.js') < position('kaysender-editor-builtins-v3-prepared.js'));
assert.ok(position('kaysender-editor-builtins-v3-prepared.js') < position('kaysender-editor-production.js'));
assert.equal(scripts.includes('kaysender-editor-builtins.js'), false, 'Activation manifest loads both active and prepared built-ins.');
assert.equal(new Set(scripts).size, scripts.length, 'Activation manifest contains duplicate scripts.');

for (const asset of [
  'kaysender-surface-grid-editor.css',
  'kaysender-surface-grid-resize.css',
  'kaysender-island-v3-adapter.css'
]) assert.ok(manifest.cssAssets.includes(asset));

for (const file of manifest.blockingValidatorsAfterActivation) {
  assert.ok(file.startsWith('scripts/validate-p1-'));
  assert.ok(await fs.stat(path.join(root, file)).then(() => true, () => false), `Activation validator does not exist: ${file}`);
}

const registerCalls = preparedBuiltins.match(/Registry\.register\(/g) || [];
const migrationCalls = preparedBuiltins.match(/Migrations\.register\(/g) || [];
assert.equal(registerCalls.length, manifest.registrationExpectations.adapterCount);
assert.equal(migrationCalls.length, 1);
assert.ok(preparedBuiltins.includes('Registry.register(IslandFactory.createDefinition())'));
assert.ok(preparedBuiltins.includes('Migrations.register(IslandFactory.createMigrationDefinition())'));
assert.ok(preparedBuiltins.includes("id: 'settlement-editor'"));
assert.ok(preparedBuiltins.includes("currentSchemaVersion: '1.0.0'"));
assert.ok(preparedBuiltins.includes("id: 'airship-editor'"));
assert.equal(preparedBuiltins.includes("currentSchemaVersion: '2.0.0'"), false);

for (const marker of [
  "id: 'settlement-editor'",
  "profileType: 'settlement-profile'",
  "id: 'airship-editor'",
  "profileType: 'airship-profile'",
  "relationship: 'parent-island'",
  "relationship: 'parent-settlement'"
]) {
  assert.ok(activeBuiltins.includes(marker), `Active built-ins missing ${marker}.`);
  assert.ok(preparedBuiltins.includes(marker), `Prepared built-ins changed ${marker}.`);
}

assert.ok(activeBuiltins.includes("id: 'floating-island-editor'"));
assert.ok(activeBuiltins.includes("currentSchemaVersion: '2.0.0'"));
assert.equal(activeBuiltins.includes('IslandFactory.createDefinition'), false);
assert.ok(adapterFactory.includes("currentSchemaVersion: SCHEMA_VERSION"));
assert.ok(adapterFactory.includes("const SCHEMA_VERSION = '3.0.0'"));
assert.ok(adapterFactory.includes("id: 'island-2.0.0-to-3.0.0'"));
assert.equal(adapterFactory.includes('KaysenderEditorAdapters.register'), false);
assert.equal(adapterFactory.includes('KaysenderEditorMigrations.register'), false);

assert.ok(migrations.includes('function register(definition)'));
assert.ok(registry.includes('function register(input)'));
assert.ok(registry.includes("'readProfile'"));
assert.ok(registry.includes("'applyProfileToForm'"));
assert.ok(registry.includes("'getWikiDraft'"));

assert.ok(index.includes('<script src="kaysender-editor-builtins.js"></script>'));
assert.equal(index.includes('kaysender-editor-builtins-v3-prepared.js'), false);
for (const asset of [
  'kaysender-island-v3-adapter-factory.js',
  'kaysender-island-v3-adapter.css',
  'kaysender-surface-grid-resize.js',
  'kaysender-island-v3-consumer-builders.js'
]) assert.equal(index.includes(asset), false, `Current runtime prematurely loads ${asset}.`);

assert.equal(manifest.registrationExpectations.adapterCount, 3);
assert.equal(manifest.registrationExpectations.migrationId, 'island-2.0.0-to-3.0.0');
assert.equal(manifest.registrationExpectations.islandAdapterId, 'floating-island-editor');
assert.equal(manifest.registrationExpectations.islandSchemaVersion, '3.0.0');
assert.equal(manifest.registrationExpectations.settlementSchemaVersion, '1.0.0');
assert.equal(manifest.registrationExpectations.airshipSchemaVersion, '1.0.0');
assert.equal(manifest.registrationExpectations.duplicateIslandRegistrationForbidden, true);
assert.equal(manifest.registrationExpectations.finalWrappedTransformerRequired, true);

console.log('P1 Island activation manifest validation passed.');
console.log('Verified dependency order, single built-ins replacement, exact adapter and migration registration counts, unchanged Settlement and Airship contracts, current 2.0.0 rollback state, validator existence, and absence of prepared P1 assets from the active runtime.');
