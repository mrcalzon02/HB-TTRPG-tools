import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const manifestPath = path.join(root, 'data/kaysender/generators/crafting/crafting-generator.json');

function fail(message) {
  throw new Error(message);
}

async function readJson(relativeOrAbsolutePath) {
  const absolute = path.isAbsolute(relativeOrAbsolutePath)
    ? relativeOrAbsolutePath
    : path.join(root, relativeOrAbsolutePath);
  const raw = await fs.readFile(absolute, 'utf8');
  return JSON.parse(raw);
}

function requireString(record, key, context) {
  if (typeof record[key] !== 'string' || !record[key].trim()) {
    fail(`${context} is missing required string field '${key}'.`);
  }
}

function countBy(list, key) {
  return list.reduce((counts, entry) => {
    const value = entry[key] ?? 'unknown';
    counts[value] = (counts[value] || 0) + 1;
    return counts;
  }, {});
}

async function main() {
  const manifest = await readJson(manifestPath);
  if (!Array.isArray(manifest.packs) || !manifest.packs.length) fail('Crafting manifest has no data packs.');
  if (!Array.isArray(manifest.complexities) || !manifest.complexities.length) fail('Crafting manifest has no complexity table.');
  if (!Array.isArray(manifest.scales) || !manifest.scales.length) fail('Crafting manifest has no scale table.');
  if (!Array.isArray(manifest.generatorModes) || !manifest.generatorModes.length) fail('Crafting manifest has no generator modes.');

  const packs = await Promise.all(manifest.packs.map(readJson));
  const templates = packs.flatMap(pack => pack.templates || []);
  const materialSets = packs.flatMap(pack => pack.materialSets || []);
  const powerSources = packs.flatMap(pack => pack.powerSources || []);
  const complexityIds = new Set(manifest.complexities.map(entry => entry.id));
  const scaleIds = new Set(manifest.scales.map(entry => entry.id));
  const modeIds = new Set(manifest.generatorModes.filter(entry => entry.id !== 'all').map(entry => entry.id));
  const materialIds = new Set(materialSets.map(entry => entry.id));
  const materialTags = new Set(materialSets.flatMap(entry => entry.tags || []));
  const powerIds = new Set(powerSources.map(entry => entry.id));

  if (templates.length < 42) fail(`Expected at least 42 crafting patterns; found ${templates.length}.`);

  const seenTemplateIds = new Set();
  for (const template of templates) {
    const context = `Template '${template.id || 'unknown'}'`;
    for (const key of [
      'id', 'mode', 'category', 'label', 'scale', 'defaultComplexity', 'minimumComplexity',
      'slotUse', 'primarySkill', 'researchSkill', 'testSkill', 'activation', 'maintenance', 'restrictions'
    ]) requireString(template, key, context);

    if (seenTemplateIds.has(template.id)) fail(`Duplicate template id '${template.id}'.`);
    seenTemplateIds.add(template.id);
    if (!modeIds.has(template.mode)) fail(`${context} uses unknown mode '${template.mode}'.`);
    if (!scaleIds.has(template.scale)) fail(`${context} uses unknown scale '${template.scale}'.`);
    if (!complexityIds.has(template.defaultComplexity)) fail(`${context} uses unknown default complexity '${template.defaultComplexity}'.`);
    if (!complexityIds.has(template.minimumComplexity)) fail(`${context} uses unknown minimum complexity '${template.minimumComplexity}'.`);
    if (!Number.isFinite(template.baseMarketPrice) || template.baseMarketPrice <= 0) fail(`${context} has invalid baseMarketPrice.`);
    if (!Number.isFinite(template.baseWeight) || template.baseWeight < 0) fail(`${context} has invalid baseWeight.`);
    if (!Array.isArray(template.effects) || !template.effects.length || template.effects.some(effect => typeof effect !== 'string' || !effect.trim())) {
      fail(`${context} must contain at least one non-empty effect.`);
    }
    if (!Array.isArray(template.materialTags) || !template.materialTags.length) fail(`${context} has no material tags.`);
    if (!template.materialTags.some(tag => materialIds.has(tag) || materialTags.has(tag))) {
      fail(`${context} has no resolvable material reference: ${template.materialTags.join(', ')}.`);
    }
    if (!Array.isArray(template.powerTags) || !template.powerTags.length) fail(`${context} has no power tags.`);
    const unresolvedPower = template.powerTags.filter(tag => !powerIds.has(tag));
    if (unresolvedPower.length) fail(`${context} has unresolved power source(s): ${unresolvedPower.join(', ')}.`);
  }

  const requiredModes = ['personal-equipment', 'weapon-armor', 'ship-module', 'ship-weapon', 'ship-core'];
  const counts = countBy(templates, 'mode');
  for (const mode of requiredModes) {
    if (!counts[mode]) fail(`No templates found for required generator mode '${mode}'.`);
  }

  const runtimePath = path.join(root, 'kaysender-crafting-generator.js');
  const schemaPath = path.join(root, 'data/kaysender/schemas/crafting-project.schema.json');
  await fs.access(runtimePath);
  await readJson(schemaPath);

  console.log('Crafting data validation passed.');
  console.log(`Templates: ${templates.length}`);
  console.log(`Modes: ${JSON.stringify(counts)}`);
  console.log(`Material profiles: ${materialSets.length}`);
  console.log(`Power profiles: ${powerSources.length}`);
}

main().catch(error => {
  console.error(`Crafting data validation failed: ${error.message}`);
  process.exitCode = 1;
});
