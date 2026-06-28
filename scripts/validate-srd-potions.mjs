import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const standard = require('../medicinal-potions-srd-data.js');
const formulary = require('../medicinal-potions-data.js');
const baseEngine = require('../medicinal-potions-engine.js');
const engine = require('../medicinal-potions-srd-engine.js');

assert.deepEqual(baseEngine.validateData(), []);
assert.deepEqual(engine.validateData(), []);
assert.equal(standard.entries.length, 85);
assert.match(standard.source.url, /d20srd\.org\/srd\/magicItems\/potionsAndOils\.htm/);
assert.match(standard.source.license, /Open Game License/);
assert.equal(formulary.tiers[0].id, 'medicinal');

const expected = [
  ['minor', 1, 'cure-light-wounds'],
  ['minor', 100, 'undetectable-alignment'],
  ['medium', 1, 'bless-weapon'],
  ['medium', 100, 'water-walk'],
  ['major', 1, 'blur'],
  ['major', 100, 'magic-vestment-5']
];
for (const [category, roll, id] of expected) assert.equal(engine.entryFor(category, roll).id, id);

for (const category of standard.categories.map(item => item.id)) {
  const table = engine.rollTable(category);
  const coverage = new Set();
  for (const entry of table) for (let roll = entry.selectedRange[0]; roll <= entry.selectedRange[1]; roll += 1) coverage.add(roll);
  assert.equal(coverage.size, 100);
  for (let roll = 1; roll <= 100; roll += 1) {
    const potion = engine.generate({ seed: `${category}-${roll}`, category, roll, ageYears: 0.02 });
    assert.equal(potion.sourceEntry.roll, roll);
    assert.equal(potion.sourceEntry.treasureCategory, category);
    assert.equal(potion.sourceEntry.id, engine.entryFor(category, roll).id);
    assert.ok(potion.formulaIdentity.manufacturer);
    assert.ok(potion.formulaIdentity.name);
    assert.ok(potion.recipe.primaryIngredient.name);
    assert.ok(potion.recipe.reagents.length);
    assert.ok(potion.sensory.flavor.length > 40);
    assert.ok(potion.sensory.smell.length > 40);
    assert.ok(potion.value.sourceMarketPriceGp > 0);
    assert.ok(potion.value.amount > 0);
  }
}

const deterministicA = engine.generate({ seed: 'standard-determinism', category: 'major', roll: 77, ageYears: 8 });
const deterministicB = engine.generate({ seed: 'standard-determinism', category: 'major', roll: 77, ageYears: 8 });
const scrub = potion => ({ ...potion, generatedAt: null });
assert.deepEqual(scrub(deterministicA), scrub(deterministicB));

const fresh = engine.generate({ seed: 'standard-lineage', category: 'major', roll: 100, ageYears: 0.02 });
const century = engine.generate({ seed: 'standard-lineage', category: 'major', roll: 100, ageYears: 100 });
assert.equal(fresh.formulaIdentity.id, century.formulaIdentity.id);
assert.equal(fresh.formulaIdentity.name, century.formulaIdentity.name);
assert.equal(fresh.sourceEntry.id, century.sourceEntry.id);
assert.deepEqual(fresh.recipe.primaryIngredient, century.recipe.primaryIngredient);
assert.deepEqual(fresh.recipe.reagents, century.recipe.reagents);
assert.notEqual(fresh.batch.ageBand, century.batch.ageBand);

const oil = engine.generate({ seed: 'oil-use', category: 'minor', roll: 26 });
assert.equal(oil.sourceEntry.itemType, 'oil');
assert.match(oil.mechanics.administration, /Apply/i);
const potion = engine.generate({ seed: 'potion-use', category: 'minor', roll: 1 });
assert.equal(potion.sourceEntry.itemType, 'potion');
assert.match(potion.mechanics.administration, /Drink/i);

assert.equal(engine.entryFor('minor', 1).marketPriceGp, 50);
assert.equal(engine.entryFor('medium', 56).marketPriceGp, 750);
assert.equal(engine.entryFor('major', 100).marketPriceGp, 3000);

const entryLoader = fs.readFileSync(new URL('../medicinal-potions-entry.js', import.meta.url), 'utf8');
for (const file of [
  'medicinal-potions-srd-core-data.js',
  'medicinal-potions-srd-entries-a.js',
  'medicinal-potions-srd-entries-b.js',
  'medicinal-potions-srd-entries-c.js',
  'medicinal-potions-srd-entries-d.js',
  'medicinal-potions-srd-data.js',
  'medicinal-potions-srd-engine.js',
  'medicinal-potions-srd-module.js'
]) assert.ok(entryLoader.includes(file), `Potion loader is missing ${file}.`);

console.log(`Standard potion validation passed: ${standard.entries.length} entries with exact d100 coverage in all three SRD treasure columns.`);
