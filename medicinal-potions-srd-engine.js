(() => {
  'use strict';

  const standard = globalThis.HBStandardPotionData || (typeof require === 'function' ? require('./medicinal-potions-srd-data.js') : null);
  const formulary = globalThis.HBMedicinalPotionData || (typeof require === 'function' ? require('./medicinal-potions-data.js') : null);
  const baseEngine = globalThis.HBMedicinalPotionEngine || (typeof require === 'function' ? require('./medicinal-potions-engine.js') : null);
  if (!standard || !formulary || !baseEngine) throw new Error('Standard potion data, formulary data, and the base engine must load before the SRD engine.');

  const tierRank = Object.fromEntries(formulary.tiers.map(tier => [tier.id, tier.rank]));
  const qualityRank = Object.fromEntries(formulary.qualities.map((quality, index) => [quality.id, index]));
  const { createRng, hashSeed } = baseEngine;

  function channel(seed, name) { return createRng(`${seed}::srd::${name}`); }
  function pick(list, rng) { if (!list.length) return null; return list[Math.min(list.length - 1, Math.floor(rng() * list.length))]; }
  function weightedPick(list, rng, weight = item => item.weight ?? 1) {
    if (!list.length) return null;
    const weights = list.map(item => Math.max(0, Number(weight(item) || 0)));
    const total = weights.reduce((sum, value) => sum + value, 0);
    if (total <= 0) return pick(list, rng);
    let cursor = rng() * total;
    for (let index = 0; index < list.length; index += 1) {
      cursor -= weights[index];
      if (cursor <= 0) return list[index];
    }
    return list[list.length - 1];
  }

  const byId = (list, id) => list.find(item => item.id === id) || null;
  const round = (value, places = 2) => Math.round(value * (10 ** places)) / (10 ** places);
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const titleCase = value => String(value).replace(/\b\w/g, character => character.toUpperCase());
  const slug = value => String(value).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  function roman(number) {
    const values = [[10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];
    let remaining = Math.max(1, Math.min(39, number));
    let output = '';
    for (const [value, symbol] of values) {
      while (remaining >= value) { output += symbol; remaining -= value; }
    }
    return output;
  }

  function requestedOrWeighted(list, id, rng, weight) {
    if (id && id !== 'random') return byId(list, id) || weightedPick(list, rng, weight);
    return weightedPick(list, rng, weight);
  }

  function rollFor(seed, explicitRoll) {
    const parsed = Number(explicitRoll);
    if (Number.isInteger(parsed) && parsed >= 1 && parsed <= 100) return parsed;
    return 1 + Math.floor(channel(seed, 'table-roll')() * 100);
  }

  function entryFor(category, roll) {
    const entry = standard.entries.find(item => {
      const range = item.ranges[category];
      return range && roll >= range[0] && roll <= range[1];
    });
    if (!entry) throw new Error(`No SRD potion or oil entry covers ${category} roll ${roll}.`);
    return entry;
  }

  function chooseOrigin(seed, tier, requestedId) {
    return requestedOrWeighted(formulary.originTypes, requestedId, channel(seed, 'origin'), origin => origin.weight * Number(origin.tierWeights[tier.id] || 0));
  }

  function chooseQuality(seed, origin, requestedId) {
    if (requestedId && requestedId !== 'random') return byId(formulary.qualities, requestedId) || formulary.qualities[2];
    return weightedPick(formulary.qualities, channel(seed, 'quality'), quality => {
      const distance = qualityRank[quality.id] - 2;
      return quality.weight * Math.max(0.15, 1 + distance * origin.qualityBias * 0.22);
    });
  }

  function tagWeight(item, entry, match = 3, miss = 0.55) { return item.tags?.some(tag => entry.tags.includes(tag)) ? match : miss; }
  function chooseIngredient(seed, entry) { return weightedPick(standard.ingredients, channel(seed, 'ingredient'), ingredient => tagWeight(ingredient, entry, 5, 0.35) / Math.max(0.6, ingredient.value)); }
  function chooseBase(seed, tier, entry) {
    const eligible = formulary.bases.filter(base => !base.minTier || tier.rank >= tierRank[base.minTier]);
    return weightedPick(eligible, channel(seed, 'base'), base => (base.weight || 1) * (base.tags.includes('universal') ? 1.8 : tagWeight(base, entry, 3, 0.7)));
  }
  function choosePreparation(seed, tier, origin) {
    const eligible = formulary.preparations.filter(method => tier.rank >= tierRank[method.minTier]);
    return weightedPick(eligible, channel(seed, 'preparation'), method => (method.weight || 1) * (origin.preferredPreparations.includes(method.id) ? 4 : 0.8));
  }
  function chooseReagents(seed, tier, entry) {
    const rng = channel(seed, 'reagents');
    const [minimum, maximum] = tier.reagentCount;
    const count = minimum + Math.floor(rng() * (maximum - minimum + 1));
    const available = [...formulary.reagents, ...standard.reagents];
    const selected = [];
    while (selected.length < count && available.length) {
      const chosen = weightedPick(available, rng, reagent => (reagent.weight || 1) * tagWeight(reagent, entry, 3.5, 0.65));
      selected.push(chosen);
      available.splice(available.findIndex(item => item.id === chosen.id), 1);
    }
    return selected;
  }
  function chooseActivator(seed, tier, entry, requestedId) {
    const eligible = formulary.activators.filter(activator => tier.rank >= tierRank[activator.minTier]);
    if (requestedId && requestedId !== 'random') { const requested = byId(eligible, requestedId); if (requested) return requested; }
    return weightedPick(eligible, channel(seed, 'activator'), activator => (activator.weight || 1) * (activator.tags.includes('universal') ? 1.8 : tagWeight(activator, entry, 3, 0.65)));
  }
  function chooseBottle(seed, tier, requestedId) { return requestedOrWeighted(formulary.bottles, requestedId, channel(seed, 'bottle'), bottle => bottle.weight * (1 + tier.rank * bottle.preservation * 0.08)); }
  function chooseStorage(seed, requestedId) { return requestedOrWeighted(formulary.storageConditions, requestedId, channel(seed, 'storage')); }
  function resolveItemType(seed, entry) { if (entry.itemType !== 'potion-or-oil') return entry.itemType; return channel(seed, 'item-type')() < 0.5 ? 'potion' : 'oil'; }
  function resolveAgeYears(seed, options) {
    const explicit = Number(options.ageYears);
    if (Number.isFinite(explicit) && explicit >= 0) return round(explicit, 3);
    const preset = byId(formulary.agePresets, options.agePreset);
    if (preset && preset.years !== null) return preset.years;
    return pick([0.03, 0.25, 0.75, 2, 8, 25, 100, 250], channel(seed, 'age-years'));
  }
  function average(list, accessor, fallback = 0) { if (!list.length) return fallback; return list.reduce((sum, item) => sum + accessor(item), 0) / list.length; }
  function ageBand(ratio) { if (ratio <= 0.2) return 'fresh'; if (ratio <= 1) return 'mature'; if (ratio <= 5) return 'aged'; return 'decayed'; }
  function chooseAgeOutcome(band, score, magic) {
    const eligible = formulary.ageOutcomes[band].filter(outcome => score >= (outcome.minScore ?? -99) && score <= (outcome.maxScore ?? 999) && magic >= (outcome.minMagic ?? 0));
    if (eligible.length) return [...eligible].sort((a, b) => (b.minScore ?? -99) - (a.minScore ?? -99))[0];
    return formulary.ageOutcomes[band][formulary.ageOutcomes[band].length - 1];
  }
  function evaluateAge(seed, ageYears, tier, quality, ingredient, base, reagents, preparation, activator, bottle, storage) {
    const reagentStability = average(reagents, item => item.stability, 0);
    const preservationMultiplier = quality.shelf * base.shelf * preparation.shelf * activator.shelf * storage.shelf * (1 + bottle.preservation * 0.18);
    const shelfLifeYears = Math.max(0.05, tier.baseShelfLifeYears * preservationMultiplier);
    const ratio = ageYears / shelfLifeYears;
    const band = ageBand(ratio);
    const pressure = band === 'fresh' ? 0 : band === 'mature' ? 2 : band === 'aged' ? 6 + Math.log2(Math.max(1, ratio)) : 11 + Math.log2(Math.max(1, ratio));
    const die = 1 + Math.floor(channel(seed, `age-outcome-${ageYears}`)() * 20);
    const score = round(die + quality.stability + ingredient.stability + base.stability + reagentStability + preparation.stability + activator.stability + bottle.preservation + storage.stability - pressure, 1);
    const magic = preparation.magic + activator.magic + bottle.magic + storage.magic;
    return { years: ageYears, nominalShelfLifeYears: round(shelfLifeYears, 2), ageRatio: round(ratio, 2), band, bandLabel: titleCase(band), stabilityDie: die, stabilityScore: score, magicalPreservation: magic, outcome: chooseAgeOutcome(band, score, magic) };
  }

  function token(seed, key, offset = '') { return pick(formulary.nameParts[key], channel(seed, `name-${key}-${offset}`)); }
  function manufacturerName(seed, origin) {
    const values = { given: token(seed, 'given'), surname: token(seed, 'surname'), surname2: token(seed, 'surname', 'second'), place: token(seed, 'place'), plant: token(seed, 'plant'), color: token(seed, 'color'), epithet: token(seed, 'epithet'), omen: token(seed, 'omen'), animal: token(seed, 'animal'), spirit: token(seed, 'spirit'), saint: token(seed, 'saint'), virtue: token(seed, 'virtue'), ordinal: token(seed, 'ordinal') };
    return pick(origin.makerPatterns, channel(seed, 'manufacturer-name')).replace(/\{([a-zA-Z0-9]+)\}/g, (_, key) => values[key] ?? key);
  }
  function productName(seed, origin, entry, ingredient, itemType) {
    const number = 10 + Math.floor(channel(seed, 'name-number')() * 90);
    const code = entry.label.replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase();
    const form = itemType === 'oil' ? 'Oil' : 'Potion';
    const ingredientName = titleCase(ingredient.name);
    const names = {
      'village-healer': `${ingredientName} ${entry.label} ${form}`,
      apothecary: `${entry.label} Compound No. ${number}`,
      physician: `${entry.label} Preparation ${roman(Math.ceil(number / 4))}`,
      witch: `${token(seed, 'omen')} ${ingredientName} ${form}`,
      shaman: `${token(seed, 'animal')}'s ${entry.label} Medicine`,
      monastic: `Saint ${token(seed, 'saint')}'s ${entry.label} ${form}`,
      guild: `${entry.label}, Guild Formula ${number}`,
      military: `${code}-${number} ${entry.label} Service ${form}`,
      itinerant: `${token(seed, 'epithet')}'s Celebrated ${entry.label}`,
      'high-alchemist': `${token(seed, 'color')} ${entry.label} Quintessence ${roman(Math.ceil(number / 4))}`
    };
    return names[origin.id] || `${ingredientName} ${entry.label} ${form}`;
  }
  function sensoryProfile(ingredient, base, reagents, age) {
    const profile = byId(formulary.sensoryProfiles, ingredient.sensory) || formulary.sensoryProfiles[0];
    const supporting = reagents.slice(0, 2);
    const flavor = [profile.flavor, base.flavor, ...supporting.map(item => item.flavor), age.outcome.flavor].filter(Boolean).join('; ');
    const smell = [profile.smell, base.smell, ...supporting.map(item => item.smell), age.outcome.smell].filter(Boolean).join('; ');
    return { profileId: profile.id, tags: [...profile.tags], flavor: `${titleCase(flavor)}.`, smell: `${titleCase(smell)}.`, linkage: `Both flavor and smell originate with ${ingredient.name}; the carrier, supporting reagents, and ${age.band} aging state modify the same sensory family.` };
  }
  function potency(quality, reagents, activator, age) { return round(quality.potency * reagents.reduce((total, reagent) => total * reagent.potency, 1) * activator.potency * age.outcome.potency, 2); }
  function appraisedValue(entry, origin, quality, ingredient, reagents, bottle, age) {
    const raw = entry.marketPriceGp * origin.prestige * quality.value * ingredient.value * average(reagents, item => item.value, 1) * bottle.value * age.outcome.value;
    const step = raw < 100 ? 5 : raw < 1000 ? 25 : 100;
    return Math.max(step, Math.round(raw / step) * step);
  }
  function rangeLabel(range) { if (!range) return '—'; return range[0] === range[1] ? String(range[0]).padStart(2, '0') : `${String(range[0]).padStart(2, '0')}–${String(range[1]).padStart(2, '0')}`; }

  function generate(options = {}) {
    const seed = String(options.seed || `srd-potion-${Date.now()}-${Math.floor(Math.random() * 1e9)}`);
    const category = standard.categories.some(item => item.id === options.category) ? options.category : 'minor';
    const roll = rollFor(seed, options.roll);
    const entry = entryFor(category, roll);
    const tier = byId(formulary.tiers, entry.homebrewTier);
    const origin = chooseOrigin(seed, tier, options.origin);
    const quality = chooseQuality(seed, origin, options.quality);
    const ingredient = chooseIngredient(seed, entry);
    const base = chooseBase(seed, tier, entry);
    const preparation = choosePreparation(seed, tier, origin);
    const reagents = chooseReagents(seed, tier, entry);
    const activator = chooseActivator(seed, tier, entry, options.activator);
    const bottle = chooseBottle(seed, tier, options.bottle);
    const storage = chooseStorage(seed, options.storage);
    const itemType = resolveItemType(seed, entry);
    const ageYears = resolveAgeYears(seed, options);
    const age = evaluateAge(seed, ageYears, tier, quality, ingredient, base, reagents, preparation, activator, bottle, storage);
    const potencyMultiplier = potency(quality, reagents, activator, age);
    const adverseRisk = clamp(quality.risk + activator.risk + age.outcome.risk, 0, 1);
    const adverseTriggered = channel(seed, `adverse-${ageYears}`)() < adverseRisk;
    const adverseEffect = adverseTriggered ? pick(formulary.adverseEffects, channel(seed, `adverse-effect-${ageYears}`)) : null;
    const manufacturer = manufacturerName(seed, origin);
    const product = productName(seed, origin, entry, ingredient, itemType);
    const sensory = sensoryProfile(ingredient, base, reagents, age);
    const formulaId = `srd-${slug(entry.id)}-${slug(origin.id)}-${hashSeed(`${seed}:formula`).toString(36)}`;
    const sourceRule = `Duplicates ${entry.label} at caster level ${entry.casterLevel} as a level ${entry.spellLevel} spell effect.`;
    const administration = itemType === 'oil' ? standard.rules.oilActivation : standard.rules.potionActivation;
    const finalValue = appraisedValue(entry, origin, quality, ingredient, reagents, bottle, age);

    return {
      schemaVersion: standard.schemaVersion,
      generator: 'hb-standard-potion-and-oil-generator',
      seed,
      generatedAt: new Date().toISOString(),
      formulaIdentity: { id: formulaId, name: product, fullName: `${manufacturer} — ${product}`, manufacturer, originId: origin.id, originLabel: origin.label, originDescription: origin.description },
      sourceEntry: { id: entry.id, label: entry.label, itemType, tableItemType: entry.itemType, treasureCategory: category, treasureCategoryLabel: byId(standard.categories, category).label, roll, ranges: { ...entry.ranges }, rangeLabels: { minor: rangeLabel(entry.ranges.minor), medium: rangeLabel(entry.ranges.medium), major: rangeLabel(entry.ranges.major) }, spellLevel: entry.spellLevel, casterLevel: entry.casterLevel, marketPriceGp: entry.marketPriceGp, family: entry.family, tags: [...entry.tags], sourceTitle: standard.source.title, sourceUrl: standard.source.url, license: standard.source.license },
      tier: { id: tier.id, label: tier.label, rank: tier.rank, healingDie: tier.healingDie, activation: administration, scope: tier.scope, classificationNote: `The homebrew ${tier.label} classification is inferred from spell level ${entry.spellLevel}; the SRD spell effect remains authoritative.` },
      effect: { id: entry.id, label: entry.label, commonName: entry.label, formalName: entry.label, mechanics: `${sourceRule} ${administration}` },
      batch: { quality: { id: quality.id, label: quality.label, description: quality.description }, form: itemType, ageYears, ageBand: age.band, ageBandLabel: age.bandLabel, ageOutcome: age.outcome.label, physicalState: age.outcome.state, safety: age.outcome.safety, requiresReconstitution: Boolean(age.outcome.requiresReconstitution), bottle: { id: bottle.id, label: bottle.label, seal: bottle.seal }, storage: { id: storage.id, label: storage.label, description: storage.description } },
      recipe: { primaryIngredient: { id: ingredient.id, name: ingredient.name, rarity: ingredient.rarity }, carrierBase: { id: base.id, name: base.name }, reagents: reagents.map(reagent => ({ id: reagent.id, name: reagent.name, tags: [...reagent.tags] })), preparation: { id: preparation.id, label: preparation.label, description: preparation.description }, primaryActivator: { id: activator.id, name: activator.name, instruction: activator.instruction }, directions: `Prepare ${ingredient.name} by ${preparation.label}, combine it with ${base.name}, then incorporate ${reagents.map(item => item.name).join(', ')}. Finish as a one-ounce ${itemType} in ${bottle.label}. Activation: ${activator.instruction} ${administration}` },
      aging: { nominalShelfLifeYears: age.nominalShelfLifeYears, ageRatio: age.ageRatio, stabilityDie: age.stabilityDie, stabilityScore: age.stabilityScore, magicalPreservation: age.magicalPreservation, outcomeId: age.outcome.id, outcomeDescription: `${age.outcome.label}: the batch is now ${age.outcome.state}.`, warning: age.outcome.safety },
      sensory,
      mechanics: { sourceRule, sourceSpellLevel: entry.spellLevel, sourceCasterLevel: entry.casterLevel, sourceMarketPriceGp: entry.marketPriceGp, potencyMultiplier, potencyPercent: Math.round(potencyMultiplier * 100), adverseRisk: round(adverseRisk, 2), adverseTriggered, adverseEffect, administration, unconsciousAdministration: standard.rules.unconsciousAdministration },
      value: { amount: finalValue, currency: 'gp', sourceMarketPriceGp: entry.marketPriceGp, basis: 'The SRD market price is retained as the canonical base. Manufacturer prestige, quality, ingredients, container, and present aging outcome modify the generated batch appraisal.' },
      tags: [...new Set(['srd', itemType, category, tier.id, origin.id, quality.id, age.band, age.outcome.id, entry.family, ...entry.tags, ...sensory.tags])]
    };
  }

  function rollTable(category) {
    if (!standard.categories.some(item => item.id === category)) throw new Error(`Unknown SRD treasure category ${category}.`);
    return standard.entries.filter(entry => entry.ranges[category]).map(entry => ({ ...entry, selectedRange: [...entry.ranges[category]] }));
  }

  function validateData() {
    const errors = [];
    for (const category of standard.categories.map(item => item.id)) {
      const coverage = new Map();
      for (const entry of standard.entries) {
        const range = entry.ranges[category];
        if (!range) continue;
        if (!Array.isArray(range) || range.length !== 2 || range[0] < 1 || range[1] > 100 || range[0] > range[1]) { errors.push(`${entry.id} has an invalid ${category} range.`); continue; }
        for (let roll = range[0]; roll <= range[1]; roll += 1) { if (coverage.has(roll)) errors.push(`${category} roll ${roll} is covered by both ${coverage.get(roll)} and ${entry.id}.`); coverage.set(roll, entry.id); }
      }
      for (let roll = 1; roll <= 100; roll += 1) if (!coverage.has(roll)) errors.push(`${category} roll ${roll} is uncovered.`);
    }
    for (const entry of standard.entries) {
      if (![1, 2, 3].includes(entry.spellLevel)) errors.push(`${entry.id} has invalid spell level ${entry.spellLevel}.`);
      if (entry.homebrewTier !== ({1: 'minor', 2: 'medium', 3: 'major'})[entry.spellLevel]) errors.push(`${entry.id} has an inconsistent homebrew tier.`);
      if (!['potion', 'oil', 'potion-or-oil'].includes(entry.itemType)) errors.push(`${entry.id} has invalid item type.`);
    }
    return errors;
  }

  const api = Object.freeze({ generate, rollTable, entryFor, validateData });
  globalThis.HBStandardPotionEngine = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})();