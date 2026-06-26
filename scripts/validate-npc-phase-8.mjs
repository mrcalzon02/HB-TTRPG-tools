import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const rel = value => path.join(root, value);
const read = value => fs.readFileSync(rel(value), 'utf8');
const json = value => JSON.parse(read(value));
const failures = [];
const fail = message => failures.push(message);

const runtimeFiles = [
  'npc-profile-generator-random.js',
  'npc-profile-generator-rules-core.js',
  'npc-profile-generator-rules-validation.js',
  'npc-generator-foundation.js',
  'npc-generator-compose.js',
  'npc-generator-operations.js',
  'npc-profile-generator-core.js'
];
for (const file of runtimeFiles) vm.runInThisContext(read(file), { filename: file });

const Rules = globalThis.NpcProfileRules;
const Foundation = globalThis.NpcProfileGeneratorFoundation;
const Assembly = globalThis.NpcProfileGeneratorAssembly;
const Core = globalThis.NpcProfileGeneratorCore;
const fixture = json('data/npc-generator/fixtures/phase-8-operation-matrix.json');
const manifest = json('data/npc-generator/packs/generic-fantasy-core.json');
const policies = json('data/npc-generator/archetypes/wave-a-policies.json');
const names = json('data/npc-generator/names/core-fantasy-names.json');
const ancestries = json('data/npc-generator/ancestries/core-fantasy.json');
const coreTables = json('data/npc-generator/tables/core-profile-tables.json');
const baseOperations = json('data/npc-generator/tables/wave-a-operational-tables.json');
const components = fixture.operationFiles.map(json);
const ledger = json('data/npc-generator/phase-status.json');

const pack = {
  packId: manifest.packId,
  version: manifest.version,
  tables: {},
  ageRanges: ancestries.ageRanges || {},
  sectionFields: coreTables.sectionFields || {},
  operationModules: {}
};
for (const source of [names.tables, ancestries.tables, coreTables.tables, baseOperations.tables]) {
  for (const [id, entries] of Object.entries(source || {})) pack.tables[id] = entries;
}
for (const component of components) {
  for (const [id, module] of Object.entries(component.modules || {})) {
    if (pack.operationModules[id]) fail(`Duplicate operation module ${id}.`);
    pack.operationModules[id] = module;
  }
  for (const [id, entries] of Object.entries(component.tables || {})) {
    if (pack.tables[id]) fail(`Duplicate operation table ${id}.`);
    pack.tables[id] = entries;
  }
}

function clone(value) { return JSON.parse(JSON.stringify(value)); }
function hasValue(value) {
  if (value === undefined || value === null || value === '') return false;
  if (Array.isArray(value)) return value.length > 0;
  if (value && typeof value === 'object' && 'state' in value) return value.state !== 'present' || !('value' in value) || hasValue(value.value);
  return true;
}
function containsForbidden(value) {
  if (!value || typeof value !== 'object') return false;
  if (Array.isArray(value)) return value.some(containsForbidden);
  return Object.entries(value).some(([key, entry]) => fixture.forbiddenKeys.includes(key) || containsForbidden(entry));
}
function target(profile, descriptor) {
  if (descriptor.id === 'workContext') return profile.sections?.workContext || null;
  return profile.sections?.extensions?.[descriptor.id] || null;
}
function targetPointer(descriptor) {
  return descriptor.id === 'workContext' ? '/sections/workContext' : `/sections/extensions/${descriptor.id}`;
}
function counterKey(descriptor) {
  return descriptor.id === 'workContext' ? 'workContext' : `extension:${descriptor.id}`;
}
function stripTargetSections(profile, descriptor) {
  const sections = clone(profile.sections || {});
  if (descriptor.id === 'workContext') delete sections.workContext;
  else if (sections.extensions) {
    delete sections.extensions[descriptor.id];
    if (!Object.keys(sections.extensions).length) delete sections.extensions;
  }
  return sections;
}
function fieldsFor(module, mode) {
  return (module.fields || []).filter(field => Foundation.fieldIncluded(field, mode));
}
function assertNoOperationFields(envelope, module, label) {
  if (!envelope) return;
  if (envelope.operationModule) fail(`${label}: Quick output contains an operation marker.`);
  for (const field of module.fields || []) if (field.id in (envelope.data || {})) fail(`${label}: Quick output contains ${field.id}.`);
}
function assertFields(envelope, module, mode, label) {
  if (!envelope || envelope.state !== 'present') {
    fail(`${label}: operation target is absent.`);
    return;
  }
  if (envelope.operationModule?.id !== label.split(' ')[0]) fail(`${label}: operation marker is missing or incorrect.`);
  const eligible = new Set(fieldsFor(module, mode).map(field => field.id));
  for (const field of module.fields || []) {
    const present = Object.prototype.hasOwnProperty.call(envelope.data || {}, field.id);
    if (eligible.has(field.id)) {
      if (!present || !hasValue(envelope.data[field.id])) fail(`${label}: required field ${field.id} is missing or empty.`);
    } else if (present) fail(`${label}: field ${field.id} appears before its minimum depth.`);
  }
}

const moduleIds = Object.keys(pack.operationModules).sort();
const expectedIds = Object.keys(fixture.targets).sort();
if (JSON.stringify(moduleIds) !== JSON.stringify(expectedIds)) fail(`Operation module coverage mismatch. Found ${moduleIds.join(', ')}.`);
for (const [archetypeId, module] of Object.entries(pack.operationModules)) {
  if (!Array.isArray(module.fields) || !module.fields.length) fail(`${archetypeId}: module has no fields.`);
  for (const field of module.fields || []) {
    if (!Array.isArray(pack.tables[field.tableId]) || !pack.tables[field.tableId].length) fail(`${archetypeId}: table ${field.tableId} is missing or empty.`);
  }
}
for (const file of manifest.dataFiles?.operationDepth || []) if (!fs.existsSync(rel(file))) fail(`Pack manifest operation file is missing: ${file}.`);

let generated = 0;
let deterministicRepeats = 0;
let rerollChanges = 0;
for (const [archetypeId, descriptor] of Object.entries(fixture.targets)) {
  const resolved = Rules.resolveArchetype(archetypeId, policies.archetypes);
  if (!resolved.valid) {
    fail(`${archetypeId}: archetype resolution failed.`);
    continue;
  }
  const module = pack.operationModules[archetypeId];
  if (module.targetKind !== descriptor.kind) fail(`${archetypeId}: target kind ${module.targetKind} does not match ${descriptor.kind}.`);

  for (let index = 0; index < fixture.seedsPerArchetype; index += 1) {
    const seed = `phase8:${archetypeId}:${index}`;
    for (const mode of fixture.modes) {
      const config = { seed, archetype: resolved.archetype, pack, mode, timestamp: fixture.timestamp };
      const base = Assembly.generateProfile(config);
      const result = Core.generateProfile(config);
      generated += 1;
      const label = `${archetypeId} ${mode} ${index}`;
      if (!result.valid || !result.profile) fail(`${label}: generation failed with ${result.diagnostics.map(item => item.code).join(', ')}.`);
      const errors = result.diagnostics.filter(item => item.severity === 'error');
      const warnings = result.diagnostics.filter(item => item.severity === 'warning');
      if (errors.length || warnings.length) fail(`${label}: diagnostics ${result.diagnostics.map(item => item.code).join(', ')}.`);
      if (containsForbidden(result.profile)) fail(`${label}: forbidden normal-workplace key found.`);

      const enrichedTarget = target(result.profile, descriptor);
      const baseTarget = target(base.profile, descriptor);
      if (mode === 'quick') {
        if (descriptor.kind === 'new-extension' && enrichedTarget) fail(`${label}: new operation extension should not exist in Quick mode.`);
        else assertNoOperationFields(enrichedTarget, module, label);
      } else {
        assertFields(enrichedTarget, module, mode, label);
        if (baseTarget) {
          for (const [key, value] of Object.entries(baseTarget.data || {})) {
            if (JSON.stringify(enrichedTarget.data?.[key]) !== JSON.stringify(value)) fail(`${label}: base operational field ${key} was overwritten.`);
          }
        }
      }

      if (mode === 'deep') {
        const repeat = Core.generateProfile(config);
        deterministicRepeats += 1;
        if (JSON.stringify(result.profile) !== JSON.stringify(repeat.profile)) fail(`${label}: Deep operation generation is not deterministic.`);
      }
    }
  }

  const seed = `phase8:reroll:${archetypeId}`;
  const baseConfig = { seed, archetype: resolved.archetype, pack, mode: 'deep', timestamp: fixture.timestamp };
  const original = Core.generateProfile(baseConfig);
  const originalTarget = target(original.profile, descriptor);
  const lockField = fieldsFor(module, 'standard')[0] || fieldsFor(module, 'deep')[0];
  const lockPointer = `${targetPointer(descriptor)}/data/${lockField.id}`;
  let changed = false;
  for (let counter = 1; counter <= 6 && !changed; counter += 1) {
    const rerolled = Core.generateProfile({
      ...baseConfig,
      previousProfile: original.profile,
      locks: [lockPointer],
      rerollCounters: { [counterKey(descriptor)]: counter }
    });
    const rerolledTarget = target(rerolled.profile, descriptor);
    if (JSON.stringify(Foundation.pointerGet(rerolled.profile, lockPointer)) !== JSON.stringify(Foundation.pointerGet(original.profile, lockPointer))) fail(`${archetypeId}: locked operation field was not preserved.`);
    if (JSON.stringify(stripTargetSections(rerolled.profile, descriptor)) !== JSON.stringify(stripTargetSections(original.profile, descriptor))) fail(`${archetypeId}: operation reroll changed unrelated sections.`);
    if (JSON.stringify(rerolledTarget) !== JSON.stringify(originalTarget)) changed = true;
  }
  if (!changed) fail(`${archetypeId}: operation reroll did not change the target after six counters.`);
  else rerollChanges += 1;
}

const expectedGenerated = expectedIds.length * fixture.seedsPerArchetype * fixture.modes.length;
if (generated !== expectedGenerated) fail(`Generated ${generated} profiles; expected ${expectedGenerated}.`);
if (ledger.activeBranch !== 'main') fail('Phase ledger must retain main as the only active branch.');
if (ledger.activePhaseId !== 'phase-8-archetype-specific-modules') fail('Phase 8 must be active.');
if (ledger.lastCompletedPhaseId !== 'phase-7-family-household-relationships') fail('Phase 7 must be the last completed phase.');

if (failures.length) {
  console.error('NPC Phase 8 validation failed:');
  failures.forEach(message => console.error(`- ${message}`));
  process.exit(1);
}

console.log('NPC Phase 8 validation passed.');
console.log(`Operation modules verified: ${moduleIds.length}`);
console.log(`Operation tables verified: ${components.reduce((sum, component) => sum + Object.keys(component.tables || {}).length, 0)}`);
console.log(`Profiles generated: ${generated}`);
console.log(`Deterministic Deep repeats: ${deterministicRepeats}`);
console.log(`Archetype reroll changes observed: ${rerollChanges}`);
