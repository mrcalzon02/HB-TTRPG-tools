import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import vm from 'node:vm';

const root = process.cwd();
const read = file => fs.readFile(path.join(root, file), 'utf8');
const json = async file => JSON.parse(await read(file));
const clone = value => JSON.parse(JSON.stringify(value));

const files = [
  'kaysender-island-v3-schema-validator.js',
  'kaysender-island-v3-domain.js',
  'kaysender-island-v3-transformers.js',
  'kaysender-island-v3-consumer-builders.js',
  'kaysender-island-v3-adapter-factory.js',
  'kaysender-island-v3-adapter-schema-bridge.js',
  'kaysender-island-v3-legacy-projection.js'
];
const [sources, index, config, valid, fractured, v2] = await Promise.all([
  Promise.all(files.map(read)),
  read('index.html'),
  json('data/kaysender/editors/floating-island-editor.json'),
  json('data/kaysender/editors/fixtures/p1-floating-island-production-valid.json'),
  json('data/kaysender/editors/fixtures/p1-floating-island-production-edge-fractured.json'),
  json('data/kaysender/editors/fixtures/p1-island-v2-migration-source.json')
]);

const context = {
  window: {
    KaysenderIslandSurfaceGridController: { IslandSurfaceGridController: function IslandSurfaceGridController() {} },
    KaysenderEditorLifecycle: {}
  },
  globalThis: {}, console, JSON, Math, Number, String, Boolean,
  Set, Map, WeakMap, Object, Array, Error, RegExp
};
context.globalThis = context;
vm.createContext(context);
sources.forEach(source => vm.runInContext(source, context));

const factory = context.window.KaysenderIslandV3AdapterFactory;
assert.ok(factory?.LEGACY_FIELD_MAP);
const migrated = clone(context.window.KaysenderIslandV3Transformers.migrateV2ToV3(v2).data);
const profiles = [valid, fractured, migrated, clone(factory.createBlankProfile())];
const selects = config.controls.filter(control => control.type === 'select');
const readPath = (source, pathValue) => String(pathValue).split('.').reduce((value, key) => value == null ? undefined : value[key], source);

for (const profile of profiles) {
  for (const control of selects) {
    const sourcePath = factory.LEGACY_FIELD_MAP[control.id];
    const value = typeof sourcePath === 'function' ? sourcePath(profile) : readPath(profile, sourcePath);
    assert.notEqual(value, undefined, `${profile.name}: missing projection for ${control.id}.`);
    assert.ok(control.options.includes(value), `${profile.name}: invalid ${control.id} projection '${value}'.`);
  }
}

const blank = profiles.at(-1);
assert.equal(factory.projectSize(blank), 'rocklet');
assert.equal(factory.projectShape(blank), 'irregular oval');
assert.equal(factory.LEGACY_FIELD_MAP.currentUse(valid), 'agricultural colony');
assert.equal(factory.LEGACY_FIELD_MAP.approachProfile(valid), 'storm-shear approach');
assert.equal(factory.LEGACY_FIELD_MAP.waterProfile(valid), 'lake or deep reservoir');
assert.equal(factory.LEGACY_FIELD_MAP.dominantWildlife(valid), 'large herd animals');

const definition = factory.createDefinition({ openLegacy: () => {} });
assert.equal(definition.fieldMap, factory.LEGACY_FIELD_MAP);
assert.equal(factory.activationBundle({ openLegacy: () => {} }).loadOrder.at(-1), 'kaysender-island-v3-legacy-projection.js');
assert.equal(sources.at(-1).includes('.innerHTML'), false);
assert.equal(index.includes('kaysender-island-v3-legacy-projection.js'), false);

console.log('P1 Island legacy projection validation passed.');
console.log(`Verified ${selects.length} select projections across valid, fractured, migrated, and blank Island profiles.`);
