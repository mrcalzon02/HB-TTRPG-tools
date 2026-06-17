import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import vm from 'node:vm';

const root = process.cwd();
const readJson = async relativePath => JSON.parse(await fs.readFile(path.join(root, relativePath), 'utf8'));
const source = await fs.readFile(path.join(root, 'kaysender-editor-migrations.js'), 'utf8');
const context = {
  window: {},
  console
};
vm.createContext(context);
vm.runInContext(source, context, { filename: 'kaysender-editor-migrations.js' });

const migrations = context.window.KaysenderEditorMigrations;
assert.ok(migrations, 'Migration registry was not exposed.');
assert.equal(typeof migrations.register, 'function');
assert.equal(typeof migrations.migrate, 'function');
assert.equal(typeof migrations.list, 'function');

const profileType = 'floating-island-foundation-profile';
const legacy = await readJson('data/kaysender/editors/fixtures/island-legacy-flat.json');
const nested = await readJson('data/kaysender/editors/fixtures/island-current-nested.json');

const migrated = migrations.migrate(legacy, profileType);
assert.equal(migrated.changed, true, 'Legacy flat island fixture was not migrated.');
assert.deepEqual(migrated.applied, ['island-legacy-flat-to-1.0.0']);
assert.equal(migrated.data.schemaVersion, '1.0.0');
assert.equal(migrated.data.profileType, profileType);
assert.equal(migrated.data.name, legacy.name);
assert.equal(migrated.data.classification.currentUse, legacy.settlementFootprint);
assert.equal(migrated.data.geometry.lengthKm, legacy.lengthKm);
assert.equal(migrated.data.geometry.widthKm, legacy.widthKm);
assert.equal(migrated.data.hydrology.profile, legacy.waterProfile);
assert.equal(migrated.data.access.routeTraffic, legacy.routeAccess);
assert.equal(migrated.data.resources.mineralPresence, legacy.primaryResource);
assert.equal(migrated.data.compatibility.foodProfile, legacy.foodProfile);
assert.equal(migrated.data.compatibility.factionPressure, legacy.factionPressure);
assert.equal(migrated.data.compatibility.threatClock, legacy.threatClock);
assert.deepEqual(migrated.data.derivedScores, legacy.derivedScores);
assert.deepEqual(migrated.data.outputs, legacy.outputs);
assert.equal('lengthKm' in migrated.data, false, 'Migrated profile retained obsolete flat geometry fields.');
assert.equal('waterProfile' in migrated.data, false, 'Migrated profile retained obsolete flat hydrology fields.');
assert.equal('routeAccess' in migrated.data, false, 'Migrated profile retained obsolete flat access fields.');
assert.equal(migrated.log[0].fromVersion, 'legacy-flat');
assert.equal(migrated.log[0].toVersion, '1.0.0');

const idempotent = migrations.migrate(migrated.data, profileType);
assert.equal(idempotent.changed, false, 'Canonical migrated profile was migrated a second time.');
assert.deepEqual(idempotent.data, migrated.data);

const current = migrations.migrate(nested, profileType);
assert.equal(current.changed, false, 'Current nested island fixture should not be rewritten.');
assert.deepEqual(current.data, nested);

const catalogue = migrations.list(profileType);
assert.ok(catalogue.some(item => item.id === 'island-legacy-flat-to-1.0.0'));

console.log('Editor migration validation passed.');
console.log('Verified flat Island conversion, canonical nested preservation, migration logging, field cleanup, and idempotence.');
