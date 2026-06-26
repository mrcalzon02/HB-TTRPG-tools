import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const rel = value => path.join(root, value);
const runtimeFiles = [
  'npc-profile-generator-random.js',
  'npc-profile-generator-rules-core.js',
  'npc-profile-generator-rules-validation.js',
  'npc-generator-foundation.js',
  'npc-generator-compose.js',
  'npc-profile-generator-core.js'
];
for (const file of runtimeFiles) vm.runInThisContext(fs.readFileSync(rel(file), 'utf8'), { filename: file });

const Rules = globalThis.NpcProfileRules;
const Core = globalThis.NpcProfileGeneratorCore;
const manifest = JSON.parse(fs.readFileSync(rel('data/npc-generator/packs/generic-fantasy-core.json'), 'utf8'));
const policies = JSON.parse(fs.readFileSync(rel('data/npc-generator/archetypes/wave-a-policies.json'), 'utf8'));
const names = JSON.parse(fs.readFileSync(rel('data/npc-generator/names/core-fantasy-names.json'), 'utf8'));
const ancestries = JSON.parse(fs.readFileSync(rel('data/npc-generator/ancestries/core-fantasy.json'), 'utf8'));
const coreTables = JSON.parse(fs.readFileSync(rel('data/npc-generator/tables/core-profile-tables.json'), 'utf8'));
const operations = JSON.parse(fs.readFileSync(rel('data/npc-generator/tables/wave-a-operational-tables.json'), 'utf8'));
const matrix = JSON.parse(fs.readFileSync(rel('data/npc-generator/fixtures/phase-4-generation-matrix.json'), 'utf8'));
const ledger = JSON.parse(fs.readFileSync(rel('data/npc-generator/phase-status.json'), 'utf8'));
const failures = [];
const fail = message => failures.push(message);

const sources = [names.tables, ancestries.tables, coreTables.tables, operations.tables];
const tables = {};
for (const source of sources) {
  for (const [id, entries] of Object.entries(source || {})) {
    if (id in tables) fail(`Duplicate table ID ${id}.`);
    tables[id] = entries;
  }
}
const pack = {
  packId: manifest.packId,
  version: manifest.version,
  tables,
  ageRanges: ancestries.ageRanges,
  sectionFields: coreTables.sectionFields
};

function requiredTableIds() {
  const ids = new Set();
  for (const fields of Object.values(coreTables.sectionFields || {})) {
    for (const field of fields || []) if (field.tableId) ids.add(field.tableId);
  }
  for (const archetype of policies.archetypes || []) {
    for (const section of archetype.specializedSections || []) {
      for (const field of section.fields || []) if (field.tableId) ids.add(field.tableId);
    }
  }
  return ids;
}

for (const id of requiredTableIds()) {
  if (!Array.isArray(tables[id]) || !tables[id].length) fail(`Required table ${id} is missing or empty.`);
}
for (const [id, entries] of Object.entries(tables)) {
  if (!Array.isArray(entries) || !entries.length) fail(`Table ${id} is empty or malformed.`);
  if (entries.some(entry => entry === undefined || entry === null || entry === '')) fail(`Table ${id} contains an empty entry.`);
}

for (const group of Object.values(manifest.dataFiles || {})) {
  for (const file of group || []) if (!fs.existsSync(rel(file))) fail(`Manifest data file ${file} does not exist.`);
}
for (const file of manifest.archetypeFiles || []) if (!fs.existsSync(rel(file))) fail(`Manifest archetype file ${file} does not exist.`);

function findUndefined(value, at = '/') {
  const found = [];
  if (value === undefined) return [at];
  if (Array.isArray(value)) {
    value.forEach((entry, index) => found.push(...findUndefined(entry, `${at}/${index}`)));
  } else if (value && typeof value === 'object') {
    for (const [key, entry] of Object.entries(value)) found.push(...findUndefined(entry, `${at}/${key}`));
  }
  return found;
}

function containsForbiddenKey(value, forbidden) {
  if (!value || typeof value !== 'object') return false;
  if (Array.isArray(value)) return value.some(entry => containsForbiddenKey(entry, forbidden));
  return Object.entries(value).some(([key, entry]) => forbidden.has(key) || containsForbiddenKey(entry, forbidden));
}

function fieldPresent(value) {
  if (value === undefined || value === null || value === '') return false;
  if (Array.isArray(value)) return value.length > 0;
  if (value && typeof value === 'object' && 'state' in value) {
    return value.state === 'present' && ('value' in value ? fieldPresent(value.value) : true);
  }
  return true;
}

function validateSpecialized(profile, archetype, label) {
  const policy = archetype.sectionPolicies?.workContext;
  let definition = null;
  let data = null;
  if (policy?.substituteSection) {
    definition = (archetype.specializedSections || []).find(section => section.id === policy.substituteSection);
    data = profile.sections.extensions?.[policy.substituteSection]?.data;
    if (profile.sections.workContext?.state !== 'not-applicable') fail(`${label}: substituted work context was not marked not-applicable.`);
    if (!data) fail(`${label}: substitute ${policy.substituteSection} was not generated.`);
  } else if (policy?.policy === 'required' && (archetype.specializedSections || []).length === 1) {
    definition = archetype.specializedSections[0];
    data = profile.sections.workContext?.data;
    if (profile.sections.workContext?.state !== 'present') fail(`${label}: required work context was not present.`);
  }
  if (!definition || !data) return;
  for (const field of definition.fields || []) {
    if (field.policy === 'required' && !fieldPresent(data[field.id])) fail(`${label}: required specialized field ${definition.id}.${field.id} was empty.`);
  }
}

const allIds = new Set();
let generatedCount = 0;
for (const archetypeId of matrix.archetypeIds || []) {
  const resolved = Rules.resolveArchetype(archetypeId, policies.archetypes);
  if (!resolved.valid) {
    fail(`${archetypeId}: policy resolution failed.`);
    continue;
  }
  const namesSeen = new Set();
  const profilesSeen = new Set();
  for (let index = 0; index < matrix.seedsPerArchetype; index += 1) {
    const seed = `phase4:${archetypeId}:${index}`;
    const result = Core.generateProfile({
      seed,
      archetype: resolved.archetype,
      pack,
      timestamp: matrix.timestamp
    });
    const label = `${archetypeId} seed ${index}`;
    generatedCount += 1;
    if (!result.valid) fail(`${label}: generation failed with ${result.diagnostics.map(item => item.code).join(', ')}.`);
    const errorDiagnostics = result.diagnostics.filter(item => item.severity === 'error');
    const warningDiagnostics = result.diagnostics.filter(item => item.severity === 'warning');
    if (errorDiagnostics.length) fail(`${label}: error diagnostics ${errorDiagnostics.map(item => item.code).join(', ')}.`);
    if (warningDiagnostics.length) fail(`${label}: warning diagnostics ${warningDiagnostics.map(item => item.code).join(', ')}.`);
    if (findUndefined(result.profile).length) fail(`${label}: profile contains undefined values.`);
    const serialized = JSON.stringify(result.profile);
    if (serialized.includes('Unresolved ')) fail(`${label}: profile contains unresolved fallback text.`);
    if (containsForbiddenKey(result.profile, new Set(matrix.forbiddenFieldNames || []))) fail(`${label}: profile contains a forbidden normal-workplace field.`);
    if (allIds.has(result.profile.profileId)) fail(`${label}: duplicate profile ID ${result.profile.profileId}.`);
    allIds.add(result.profile.profileId);
    namesSeen.add(result.profile.identity.fullName);
    profilesSeen.add(serialized);
    validateSpecialized(result.profile, resolved.archetype, label);
  }
  if (namesSeen.size < matrix.minimumDistinctNamesPerArchetype) fail(`${archetypeId}: only ${namesSeen.size} distinct names.`);
  if (profilesSeen.size < matrix.minimumDistinctProfilesPerArchetype) fail(`${archetypeId}: only ${profilesSeen.size} distinct profiles.`);
}

const expectedCount = (matrix.archetypeIds?.length || 0) * Number(matrix.seedsPerArchetype || 0);
if (generatedCount !== expectedCount) fail(`Generated ${generatedCount} profiles; expected ${expectedCount}.`);
if (allIds.size !== expectedCount) fail(`Stable ID count ${allIds.size} does not match expected ${expectedCount}.`);
if (manifest.packId !== 'generic-fantasy-core' || manifest.version !== '0.1.0') fail('Unexpected pack identity or version.');
if (ledger.activeBranch !== 'main') fail('Phase ledger must retain main as the only active branch.');
if (ledger.activePhaseId !== 'phase-4-minimum-generic-fantasy-pack') fail('Phase 4 must be active.');
if (ledger.lastCompletedPhaseId !== 'phase-3-deterministic-generation-core') fail('Phase 3 must be the last completed phase.');
if (ledger.phases?.find(item => item.id === 'phase-3-deterministic-generation-core')?.status !== 'gate-passed') fail('Phase 3 must remain gate-passed.');
if (ledger.phases?.find(item => item.id === 'phase-4-minimum-generic-fantasy-pack')?.status !== 'active') fail('Phase 4 must remain active until its receipt is written.');

if (failures.length) {
  console.error('NPC Phase 4 validation failed:');
  failures.forEach(message => console.error(`- ${message}`));
  process.exit(1);
}

console.log('NPC Phase 4 validation passed.');
console.log(`Tables loaded: ${Object.keys(tables).length}`);
console.log(`Required table references: ${requiredTableIds().size}`);
console.log(`Archetypes tested: ${matrix.archetypeIds.length}`);
console.log(`Profiles generated: ${generatedCount}`);
console.log(`Unique profile IDs: ${allIds.size}`);
