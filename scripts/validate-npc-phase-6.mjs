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
  'npc-profile-generator-core.js',
  'npc-profile-generator-depth-data.js'
];
for (const file of runtimeFiles) vm.runInThisContext(read(file), { filename: file });

const Random = globalThis.NpcProfileRandom;
const Rules = globalThis.NpcProfileRules;
const Core = globalThis.NpcProfileGeneratorCore;
const DepthData = globalThis.NpcProfileGeneratorDepthData;
const fixture = json('data/npc-generator/fixtures/phase-6-depth-fixtures.json');
const manifest = json('data/npc-generator/packs/generic-fantasy-core.json');
const policies = json('data/npc-generator/archetypes/wave-a-policies.json');
const names = json('data/npc-generator/names/core-fantasy-names.json');
const ancestries = json('data/npc-generator/ancestries/core-fantasy.json');
const coreTables = json('data/npc-generator/tables/core-profile-tables.json');
const operational = json('data/npc-generator/tables/wave-a-operational-tables.json');
const componentManifest = json('data/npc-generator/tables/deep-profile-tables.json');
const components = fixture.requiredComponentFiles.slice(1).map(json);
const ledger = json('data/npc-generator/phase-status.json');

if (!Random || !Rules || !Core || !DepthData) fail('A Phase 6 runtime module failed to initialize.');
if (componentManifest.componentCount !== 5) fail(`Deep component manifest reports ${componentManifest.componentCount}; expected 5.`);
for (const file of fixture.requiredComponentFiles) if (!fs.existsSync(rel(file))) fail(`Deep profile component is missing: ${file}.`);
for (const file of manifest.dataFiles?.deepProfile || []) if (!fs.existsSync(rel(file))) fail(`Pack manifest deep-profile file is missing: ${file}.`);

const pack = {
  packId: manifest.packId,
  version: manifest.version,
  tables: {},
  ageRanges: ancestries.ageRanges || {},
  sectionFields: {}
};
[names.tables, ancestries.tables, coreTables.tables, operational.tables].forEach(source => {
  Object.entries(source || {}).forEach(([id, entries]) => { pack.tables[id] = entries; });
});
Object.entries(coreTables.sectionFields || {}).forEach(([id, fields]) => { pack.sectionFields[id] = [...fields]; });
DepthData.mergeTables(pack, components);

const deepTableCount = components.reduce((total, component) => total + Object.keys(component.tables || {}).length, 0);
if (deepTableCount < 30) fail(`Only ${deepTableCount} deep tables were loaded.`);
const depthFieldCount = components.reduce((total, component) => total + Object.values(component.sectionFields || {}).reduce((sum, fields) => sum + fields.length, 0), 0);
if (depthFieldCount < 25) fail(`Only ${depthFieldCount} depth-aware fields were loaded.`);

function hasValue(value) {
  if (value === undefined || value === null || value === '') return false;
  if (Array.isArray(value)) return value.length > 0;
  if (value && typeof value === 'object' && 'state' in value) return value.state !== 'present' || !('value' in value) || hasValue(value.value);
  return true;
}

function characterizationCount(profile) {
  let count = 0;
  Object.values(profile.identity || {}).forEach(value => { if (hasValue(value)) count += 1; });
  for (const sectionId of ['appearance', 'personality', 'motivations', 'background']) {
    Object.values(profile.sections?.[sectionId]?.data || {}).forEach(value => { if (hasValue(value)) count += 1; });
  }
  return count;
}

function assertFields(profile, map, label) {
  for (const [sectionId, fields] of Object.entries(map || {})) {
    const data = profile.sections?.[sectionId]?.data || {};
    for (const field of fields) if (!hasValue(data[field])) fail(`${label}: ${sectionId}.${field} is missing or empty.`);
  }
}

function assertFieldsAbsent(profile, map, label) {
  for (const [sectionId, fields] of Object.entries(map || {})) {
    const data = profile.sections?.[sectionId]?.data || {};
    for (const field of fields) if (field in data) fail(`${label}: ${sectionId}.${field} should not be generated at this depth.`);
  }
}

let generated = 0;
for (const archetypeId of fixture.archetypeIds) {
  const resolved = Rules.resolveArchetype(archetypeId, policies.archetypes);
  if (!resolved.valid) {
    fail(`${archetypeId}: archetype resolution failed.`);
    continue;
  }
  for (let index = 0; index < fixture.seedsPerArchetype; index += 1) {
    const seed = `phase6:${archetypeId}:${index}`;
    const profiles = {};
    for (const mode of fixture.modes) {
      const result = Core.generateProfile({ seed, archetype: resolved.archetype, pack, mode, timestamp: fixture.timestamp });
      generated += 1;
      if (!result.valid || !result.profile) fail(`${archetypeId} ${index} ${mode}: generation failed with ${result.diagnostics.map(item => item.code).join(', ')}.`);
      if (result.profile?.generator?.mode !== mode) fail(`${archetypeId} ${index}: receipt mode was ${result.profile?.generator?.mode}; expected ${mode}.`);
      const errors = result.diagnostics.filter(item => item.severity === 'error');
      const warnings = result.diagnostics.filter(item => item.severity === 'warning');
      if (errors.length || warnings.length) fail(`${archetypeId} ${index} ${mode}: diagnostics ${result.diagnostics.map(item => item.code).join(', ')}.`);
      profiles[mode] = result.profile;
      const count = characterizationCount(result.profile);
      if (count < fixture.minimumCharacterizationFields[mode]) fail(`${archetypeId} ${index} ${mode}: only ${count} characterization fields.`);
    }

    const quickCount = characterizationCount(profiles.quick);
    const standardCount = characterizationCount(profiles.standard);
    const deepCount = characterizationCount(profiles.deep);
    if (!(quickCount < standardCount && standardCount < deepCount)) fail(`${archetypeId} ${index}: detail counts were not monotonic (${quickCount}, ${standardCount}, ${deepCount}).`);

    for (const field of fixture.quickIdentityNullFields) if (profiles.quick.identity[field] !== null) fail(`${archetypeId} ${index}: quick identity ${field} should be null.`);
    for (const field of fixture.standardIdentityRequiredFields) if (!hasValue(profiles.standard.identity[field])) fail(`${archetypeId} ${index}: standard identity ${field} is missing.`);
    for (const field of fixture.deepIdentityRequiredCollections) if (!hasValue(profiles.deep.identity[field])) fail(`${archetypeId} ${index}: deep identity ${field} is empty.`);
    assertFields(profiles.standard, fixture.standardSectionFields, `${archetypeId} ${index} standard`);
    assertFieldsAbsent(profiles.standard, fixture.deepSectionFields, `${archetypeId} ${index} standard`);
    assertFields(profiles.deep, fixture.standardSectionFields, `${archetypeId} ${index} deep-standard`);
    assertFields(profiles.deep, fixture.deepSectionFields, `${archetypeId} ${index} deep`);
    assertFieldsAbsent(profiles.quick, fixture.standardSectionFields, `${archetypeId} ${index} quick-standard`);
    assertFieldsAbsent(profiles.quick, fixture.deepSectionFields, `${archetypeId} ${index} quick-deep`);

    const repeat = Core.generateProfile({ seed, archetype: resolved.archetype, pack, mode: 'deep', timestamp: fixture.timestamp });
    if (JSON.stringify(profiles.deep) !== JSON.stringify(repeat.profile)) fail(`${archetypeId} ${index}: deep generation was not deterministic.`);
  }
}

const expected = fixture.archetypeIds.length * fixture.seedsPerArchetype * fixture.modes.length;
if (generated !== expected) fail(`Generated ${generated} profiles; expected ${expected}.`);
if (ledger.activeBranch !== 'main') fail('Phase ledger must retain main as the only active branch.');
if (ledger.activePhaseId !== 'phase-6-deep-identity-background-motivation') fail('Phase 6 must be active.');
if (ledger.lastCompletedPhaseId !== 'phase-5-standalone-interface') fail('Phase 5 must be the last completed phase.');

if (failures.length) {
  console.error('NPC Phase 6 validation failed:');
  failures.forEach(message => console.error(`- ${message}`));
  process.exit(1);
}

console.log('NPC Phase 6 validation passed.');
console.log(`Deep tables loaded: ${deepTableCount}`);
console.log(`Depth-aware fields loaded: ${depthFieldCount}`);
console.log(`Archetypes tested: ${fixture.archetypeIds.length}`);
console.log(`Profiles generated: ${generated}`);
console.log('Quick, Standard, and Deep detail growth and deterministic output verified.');
