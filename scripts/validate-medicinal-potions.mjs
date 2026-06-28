import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import fs from 'node:fs';

const require = createRequire(import.meta.url);
const data = require('../medicinal-potions-data.js');
const engine = require('../medicinal-potions-engine.js');

assert.deepEqual(engine.validateData(), []);
assert.deepEqual(data.tiers.map(tier => tier.id), ['medicinal', 'minor', 'medium', 'major', 'elixir']);
assert.deepEqual(Object.fromEntries(data.tiers.map(tier => [tier.id, tier.healingDie])), {
  medicinal: null,
  minor: '1d4',
  medium: '1d6',
  major: '1d10',
  elixir: '1d20'
});
assert.ok(data.effects.filter(effect => effect.minTier === 'medicinal').length >= 15, 'Medicinal needs broad everyday coverage.');
assert.ok(data.originTypes.length >= 8, 'Manufacturer-origin naming coverage is too narrow.');

const deterministicA = engine.generate({ seed: 'same-formula', tier: 'medicinal', ageYears: 0.02 });
const deterministicB = engine.generate({ seed: 'same-formula', tier: 'medicinal', ageYears: 0.02 });
const scrub = potion => ({ ...potion, generatedAt: null });
assert.deepEqual(scrub(deterministicA), scrub(deterministicB), 'Seeded generation must be deterministic.');

const fresh = engine.generate({ seed: 'lineage-test', tier: 'medicinal', ageYears: 0.02, storage: 'healer-cabinet' });
const century = engine.generate({ seed: 'lineage-test', tier: 'medicinal', ageYears: 100, storage: 'healer-cabinet' });
assert.equal(fresh.formulaIdentity.id, century.formulaIdentity.id);
assert.equal(fresh.formulaIdentity.name, century.formulaIdentity.name);
assert.equal(fresh.formulaIdentity.manufacturer, century.formulaIdentity.manufacturer);
assert.deepEqual(fresh.recipe, century.recipe, 'Aging must change the batch, not silently replace the formula.');
assert.notEqual(fresh.batch.ageBand, century.batch.ageBand);
assert.notEqual(fresh.batch.ageOutcome, century.batch.ageOutcome);

for (const tier of data.tiers) {
  for (let index = 0; index < 50; index += 1) {
    const potion = engine.generate({ seed: `${tier.id}-${index}`, tier: tier.id });
    assert.equal(potion.tier.id, tier.id);
    assert.ok(potion.formulaIdentity.name);
    assert.ok(potion.formulaIdentity.manufacturer);
    assert.ok(potion.recipe.primaryIngredient.name);
    assert.ok(potion.recipe.carrierBase.name);
    assert.ok(potion.recipe.reagents.length >= tier.reagentCount[0]);
    assert.ok(potion.recipe.primaryActivator.name);
    assert.ok(potion.sensory.flavor.length > 40);
    assert.ok(potion.sensory.smell.length > 40);
    assert.ok(Number.isFinite(potion.value.amount) && potion.value.amount > 0);
  }
}

const centuryOutcomes = new Set();
for (let index = 0; index < 500; index += 1) {
  const potion = engine.generate({ seed: `century-${index}`, tier: 'medicinal', ageYears: 100 });
  centuryOutcomes.add(potion.aging.outcomeId);
}
assert.ok([...centuryOutcomes].some(id => ['relic-distillate', 'ancient-resin'].includes(id)), 'Century-old coverage should include preserved or dried distillates.');
assert.ok(centuryOutcomes.has('corrupted-sludge'), 'Century-old coverage should include corrupted sludge.');

const origins = new Map();
for (const origin of data.originTypes) {
  const potion = engine.generate({ seed: `origin-${origin.id}`, tier: origin.id === 'high-alchemist' ? 'elixir' : 'medicinal', origin: origin.id });
  origins.set(origin.id, potion.formulaIdentity.name);
}
assert.ok(new Set(origins.values()).size >= Math.floor(data.originTypes.length * 0.8), 'Origin naming grammars are not producing enough distinct formula names.');

console.log(`Potion formulary validation passed: ${data.tiers.length} tiers, ${data.effects.length} effects, ${data.originTypes.length} origin traditions, ${data.ingredients.length} primary ingredients.`);

const indexHtml = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
assert.match(indexHtml, /data-generator-tab="potion-formulary"/);
assert.match(indexHtml, /id="medicinal-potions-root"/);
assert.match(indexHtml, /medicinal-potions-entry\.js/);
const entry = fs.readFileSync(new URL('../medicinal-potions-entry.js', import.meta.url), 'utf8');
for (const file of ['medicinal-potions-core-data.js', 'medicinal-potions-effects-data.js', 'medicinal-potions-sensory-data.js', 'medicinal-potions-compounds-data.js', 'medicinal-potions-process-data.js', 'medicinal-potions-formula-data.js', 'medicinal-potions-aging-data.js', 'medicinal-potions-data.js', 'medicinal-potions-engine.js', 'medicinal-potions-module.js']) assert.ok(entry.includes(file), `Loader is missing ${file}.`);