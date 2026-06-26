import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const rel = value => path.join(root, value);
const runtimeFiles = [
  'npc-profile-generator-random.js',
  'npc-profile-generator-rules-core.js',
  'npc-profile-generator-rules-validation.js',
  'npc-generator-foundation.js',
  'npc-generator-compose.js',
  'npc-profile-generator-core.js'
];

for (const file of runtimeFiles) {
  vm.runInThisContext(fs.readFileSync(rel(file), 'utf8'), { filename: file });
}

const Random = globalThis.NpcProfileRandom;
const Rules = globalThis.NpcProfileRules;
const Core = globalThis.NpcProfileGeneratorCore;
const policies = JSON.parse(fs.readFileSync(rel('data/npc-generator/archetypes/wave-a-policies.json'), 'utf8'));
const fixtures = JSON.parse(fs.readFileSync(rel('data/npc-generator/fixtures/phase-3-generation-fixtures.json'), 'utf8'));
const ledger = JSON.parse(fs.readFileSync(rel('data/npc-generator/phase-status.json'), 'utf8'));
const failures = [];

const fail = message => failures.push(message);
const clone = value => JSON.parse(JSON.stringify(value));
const codes = diagnostics => new Set((diagnostics || []).map(item => item.code));

if (!Random || Random.VERSION !== '0.1.0') fail('Deterministic random module is missing or has the wrong version.');
if (!Core || Core.VERSION !== '0.1.0') fail('Generator core is missing or has the wrong version.');
if (!Rules) fail('Applicability rules are unavailable.');

function archetype(id) {
  const result = Rules.resolveArchetype(id, policies.archetypes);
  if (!result.valid) fail(`${id}: archetype resolution failed with ${result.diagnostics.map(item => item.code).join(', ')}.`);
  return result.archetype;
}

function generate(id, seed, extra = {}, pack = fixtures.pack) {
  return Core.generateProfile({
    seed,
    archetype: archetype(id),
    pack,
    timestamp: fixtures.timestamp,
    ...extra
  });
}

for (const test of fixtures.tests || []) {
  if (test.type === 'same-seed') {
    const first = generate(test.targetId, test.seed);
    const second = generate(test.targetId, test.seed);
    if (!first.valid || !second.valid) fail(`${test.id}: generation was not valid.`);
    if (JSON.stringify(first.profile) !== JSON.stringify(second.profile)) fail(`${test.id}: identical inputs did not produce byte-equivalent profiles.`);
    if (first.profile.profileId !== second.profile.profileId) fail(`${test.id}: profile IDs were not stable.`);
  }

  if (test.type === 'different-seed') {
    const first = generate(test.targetId, test.seedA);
    const second = generate(test.targetId, test.seedB);
    if (JSON.stringify(first.profile) === JSON.stringify(second.profile)) fail(`${test.id}: different seeds produced identical profiles.`);
    if (first.profile.identity.fullName === second.profile.identity.fullName) fail(`${test.id}: fixture seeds did not change the generated identity.`);
  }

  if (test.type === 'section-reroll') {
    const first = generate(test.targetId, test.seed);
    const rerolled = generate(test.targetId, test.seed, { rerollCounters: { [test.sectionId]: test.counter } });
    if (JSON.stringify(first.profile.sections[test.sectionId]) === JSON.stringify(rerolled.profile.sections[test.sectionId])) {
      fail(`${test.id}: rerolled section did not change.`);
    }
    if (JSON.stringify(first.profile.identity) !== JSON.stringify(rerolled.profile.identity)) fail(`${test.id}: identity changed during an unrelated section reroll.`);
    for (const [sectionId, section] of Object.entries(first.profile.sections)) {
      if (sectionId === test.sectionId) continue;
      if (JSON.stringify(section) !== JSON.stringify(rerolled.profile.sections[sectionId])) fail(`${test.id}: unrelated section ${sectionId} changed.`);
    }
  }

  if (test.type === 'lock') {
    const first = generate(test.targetId, test.seed);
    const rerolled = generate(test.targetId, test.seed, {
      previousProfile: first.profile,
      rerollCounters: { [test.sectionId]: test.counter },
      locks: test.locks
    });
    for (const pointer of test.locks) {
      if (JSON.stringify(Core.pointerGet(first.profile, pointer)) !== JSON.stringify(Core.pointerGet(rerolled.profile, pointer))) {
        fail(`${test.id}: locked path ${pointer} was not preserved.`);
      }
    }
    if (JSON.stringify(first.profile.identity) === JSON.stringify(rerolled.profile.identity)) fail(`${test.id}: locked reroll changed nothing; fixture does not prove partial preservation.`);
  }

  if (test.type === 'weighted-choice') {
    const first = Random.create(test.seed).weightedChoice(test.entries);
    const second = Random.create(test.seed).weightedChoice(test.entries);
    if (first !== second) fail(`${test.id}: weighted choice was not reproducible.`);
    if (!test.entries.some(entry => entry.value === first)) fail(`${test.id}: weighted choice returned an unknown value.`);
  }

  if (test.type === 'missing-table') {
    const pack = clone(fixtures.pack);
    delete pack.tables[test.removeTable];
    const result = generate(test.targetId, test.seed, {}, pack);
    if (!codes(result.diagnostics).has(test.expectedCode)) fail(`${test.id}: missing table did not produce ${test.expectedCode}.`);
    if (result.profile.sections.appearance.state !== 'present') fail(`${test.id}: fallback generation did not preserve the section.`);
  }

  if (test.type === 'specialized-required') {
    const result = generate(test.targetId, test.seed);
    if (!result.valid) fail(`${test.id}: specialized generation was invalid: ${result.diagnostics.map(item => item.code).join(', ')}.`);
    const data = result.profile.sections.workContext?.data;
    if (data?.kind !== test.expectedKind) fail(`${test.id}: work context kind was ${data?.kind}; expected ${test.expectedKind}.`);
    for (const field of test.requiredFields || []) if (data?.[field] === undefined || data?.[field] === null) fail(`${test.id}: missing generated field ${field}.`);
  }

  if (test.type === 'substitute') {
    const result = generate(test.targetId, test.seed);
    const work = result.profile.sections.workContext;
    const extension = result.profile.sections.extensions?.[test.substituteSection];
    if (work?.state !== 'not-applicable' || work?.substituteSection !== test.substituteSection) fail(`${test.id}: canonical substitution was not recorded.`);
    if (extension?.state !== 'present' || !Object.keys(extension.data || {}).length) fail(`${test.id}: substitute section was not generated.`);
  }
}

const missingArchetype = Core.generateProfile({
  seed: 'missing',
  archetypeId: 'does-not-exist',
  archetypes: policies.archetypes,
  pack: fixtures.pack,
  timestamp: fixtures.timestamp
});
if (missingArchetype.valid || !codes(missingArchetype.diagnostics).has('GENERATOR_ARCHETYPE_UNAVAILABLE')) {
  fail('Missing archetype fallback did not produce a recoverable error result.');
}

if (ledger.activeBranch !== 'main') fail('Phase ledger must retain main as the only active branch.');
if (ledger.activePhaseId !== 'phase-3-deterministic-generation-core') fail('Phase 3 must be active.');
if (ledger.lastCompletedPhaseId !== 'phase-2-archetype-applicability-engine') fail('Phase 2 must be the last completed phase.');
if (ledger.phases?.find(item => item.id === 'phase-2-archetype-applicability-engine')?.status !== 'gate-passed') fail('Phase 2 must remain gate-passed.');
if (ledger.phases?.find(item => item.id === 'phase-3-deterministic-generation-core')?.status !== 'active') fail('Phase 3 must remain active until its receipt is written.');

if (failures.length) {
  console.error('NPC Phase 3 validation failed:');
  failures.forEach(message => console.error(`- ${message}`));
  process.exit(1);
}

console.log('NPC Phase 3 validation passed.');
console.log(`Runtime files: ${runtimeFiles.length}`);
console.log(`Generation fixtures: ${fixtures.tests?.length || 0}`);
console.log('Determinism, isolated rerolls, locks, weighted choices, fallbacks, specialized sections, and substitutions verified.');
