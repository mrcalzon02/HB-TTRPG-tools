import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const rel = value => path.join(root, value);
const rulesPaths = [rel('npc-profile-generator-rules-core.js'), rel('npc-profile-generator-rules-validation.js')];
const policyPath = rel('data/npc-generator/archetypes/wave-a-policies.json');
const fixturePath = rel('data/npc-generator/fixtures/phase-2-rules-fixtures.json');
const ledgerPath = rel('data/npc-generator/phase-status.json');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function fail(message, failures) {
  failures.push(message);
}

function codes(diagnostics) {
  return new Set((diagnostics || []).map(item => item.code));
}

function requireCodes(caseId, expected, diagnostics, failures) {
  const actual = codes(diagnostics);
  for (const code of expected || []) {
    if (!actual.has(code)) fail(`${caseId}: expected diagnostic ${code}; received ${[...actual].join(', ') || 'none'}.`, failures);
  }
}

function recordSet(name, pack, fixtures) {
  if (!name) return pack.archetypes;
  return [...pack.archetypes, ...(fixtures.additionalRecordSets?.[name] || [])];
}

const failures = [];
for (const rulesPath of rulesPaths) {
  const source = fs.readFileSync(rulesPath, 'utf8');
  vm.runInThisContext(source, { filename: rulesPath });
}
const Rules = globalThis.NpcProfileRules;

if (!Rules) fail('Rules engine did not attach globalThis.NpcProfileRules.', failures);
if (Rules?.ENGINE_ID !== 'universal-npc-applicability-engine') fail('Unexpected applicability engine ID.', failures);
if (Rules?.VERSION !== '0.1.0') fail(`Unexpected applicability engine version ${Rules?.VERSION}.`, failures);

const pack = readJson(policyPath);
const fixtures = readJson(fixturePath);
const ledger = readJson(ledgerPath);

if (pack.recordType !== 'npcArchetypePolicyPack') fail('Policy file has an unexpected recordType.', failures);
if (pack.archetypeCount !== pack.archetypes?.length) fail('archetypeCount does not match archetype array length.', failures);
if (pack.archetypes?.length !== 12) fail(`Expected 12 Wave A policy records including base-person; received ${pack.archetypes?.length || 0}.`, failures);

const requiredIds = new Set([
  'civilian-general',
  'civilian-laborer',
  'commercial-craft-worker',
  'commercial-merchant',
  'commercial-banker',
  'marginalized-beggar',
  'authority-city-guard',
  'military-soldier',
  'criminal-thief',
  'criminal-bandit',
  'elite-noble'
]);
const actualFirstRelease = new Set(pack.firstReleaseIds || []);
for (const id of requiredIds) if (!actualFirstRelease.has(id)) fail(`Missing first-release archetype ${id}.`, failures);
if (actualFirstRelease.size !== requiredIds.size) fail('firstReleaseIds contains unexpected or duplicate entries.', failures);

for (const record of pack.archetypes || []) {
  const result = Rules.resolveArchetype(record.id, pack.archetypes);
  if (!result.archetype) fail(`${record.id}: failed to resolve.`, failures);
  if (!result.valid) fail(`${record.id}: resolution produced ${result.diagnostics.map(item => item.code).join(', ')}.`, failures);
}

for (const test of fixtures.inheritanceCases || []) {
  const result = Rules.resolveArchetype(test.targetId, pack.archetypes);
  if (!result.valid) {
    fail(`${test.id}: could not resolve ${test.targetId}: ${result.diagnostics.map(item => item.code).join(', ')}.`, failures);
    continue;
  }
  const archetype = result.archetype;
  if (JSON.stringify(archetype.inheritanceChain) !== JSON.stringify(test.expectedChain)) {
    fail(`${test.id}: inheritance chain ${JSON.stringify(archetype.inheritanceChain)} did not match ${JSON.stringify(test.expectedChain)}.`, failures);
  }
  for (const [sectionId, expectedPolicy] of Object.entries(test.expectedPolicies || {})) {
    const actual = archetype.sectionPolicies?.[sectionId]?.policy;
    if (actual !== expectedPolicy) fail(`${test.id}: ${sectionId} policy was ${actual}; expected ${expectedPolicy}.`, failures);
  }
  const specializedIds = new Set((archetype.specializedSections || []).map(section => section.id));
  for (const id of test.expectedSpecializedSections || []) {
    if (!specializedIds.has(id)) fail(`${test.id}: missing inherited specialized section ${id}.`, failures);
  }
}

for (const test of fixtures.applicabilityCases || []) {
  const records = recordSet(test.records, pack, fixtures);
  const resolved = Rules.resolveArchetype(test.targetId, records);
  if (!resolved.archetype) {
    fail(`${test.id}: target ${test.targetId} did not resolve.`, failures);
    continue;
  }
  const applicability = Rules.resolveApplicability(resolved.archetype, { rollForSection: test.rolls || {} });
  if (!applicability.valid) fail(`${test.id}: applicability errors ${applicability.diagnostics.map(item => item.code).join(', ')}.`, failures);
  for (const [sectionId, expectedState] of Object.entries(test.expectedStates || {})) {
    const actual = applicability.sections?.[sectionId]?.state;
    if (actual !== expectedState) fail(`${test.id}: ${sectionId} state was ${actual}; expected ${expectedState}.`, failures);
  }
  for (const [sectionId, expectedSubstitute] of Object.entries(test.expectedSubstitutions || {})) {
    const actual = applicability.sections?.[sectionId]?.substituteSection;
    if (actual !== expectedSubstitute) fail(`${test.id}: ${sectionId} substitute was ${actual}; expected ${expectedSubstitute}.`, failures);
  }
  for (const sectionId of test.expectedDerived || []) {
    if (applicability.sections?.[sectionId]?.derived !== true) fail(`${test.id}: ${sectionId} was not marked derived.`, failures);
  }
  for (const sectionId of test.expectedProhibited || []) {
    if (applicability.sections?.[sectionId]?.prohibited !== true) fail(`${test.id}: ${sectionId} was not marked prohibited.`, failures);
  }
}

for (const test of fixtures.profileValidationCases || []) {
  const records = recordSet(test.records, pack, fixtures);
  const resolved = Rules.resolveArchetype(test.targetId, records);
  if (!resolved.archetype) {
    fail(`${test.id}: target ${test.targetId} did not resolve.`, failures);
    continue;
  }
  const validation = Rules.validateProfileAgainstArchetype(test.profile, resolved.archetype);
  if (validation.valid !== test.expectedValid) {
    fail(`${test.id}: valid=${validation.valid}; expected ${test.expectedValid}; diagnostics ${validation.diagnostics.map(item => item.code).join(', ')}.`, failures);
  }
  requireCodes(test.id, test.expectedCodes, validation.diagnostics, failures);
}

for (const test of fixtures.invalidGraphs || []) {
  const result = Rules.resolveArchetype(test.targetId, test.records);
  requireCodes(test.id, test.expectedCodes, result.diagnostics, failures);
  if (result.valid) fail(`${test.id}: invalid graph unexpectedly resolved as valid.`, failures);
}

const coverageRecords = [
  ...(pack.archetypes || []),
  ...Object.values(fixtures.additionalRecordSets || {}).flat()
];
const policyCoverage = new Set();
for (const record of coverageRecords) {
  for (const policy of Object.values(record.sectionPolicies || {})) policyCoverage.add(policy.policy);
}
for (const policy of fixtures.expectedPolicyCoverage || []) {
  if (!policyCoverage.has(policy)) fail(`Policy coverage missing ${policy}.`, failures);
}
for (const policy of Rules.POLICY_TYPES || []) {
  if (!policyCoverage.has(policy)) fail(`Engine policy type ${policy} lacks a fixture.`, failures);
}

if (ledger.activeBranch !== 'main') fail('Phase ledger must retain main as the only active branch.', failures);
if (ledger.activePhaseId !== 'phase-2-archetype-applicability-engine') fail('Phase 2 must be the active phase.', failures);
if (ledger.lastCompletedPhaseId !== 'phase-1-canonical-schemas-fixtures') fail('Phase 1 must be the last completed phase.', failures);
const phase1 = ledger.phases?.find(item => item.id === 'phase-1-canonical-schemas-fixtures');
const phase2 = ledger.phases?.find(item => item.id === 'phase-2-archetype-applicability-engine');
if (phase1?.status !== 'gate-passed') fail('Phase 1 must remain gate-passed.', failures);
if (phase2?.status !== 'active') fail('Phase 2 must remain active until its exit gate is recorded.', failures);

if (failures.length) {
  console.error('NPC Phase 2 validation failed:');
  failures.forEach(message => console.error(`- ${message}`));
  process.exit(1);
}

console.log('NPC Phase 2 validation passed.');
console.log(`Archetypes resolved: ${pack.archetypes.length}`);
console.log(`Inheritance cases: ${fixtures.inheritanceCases?.length || 0}`);
console.log(`Applicability cases: ${fixtures.applicabilityCases?.length || 0}`);
console.log(`Profile validation cases: ${fixtures.profileValidationCases?.length || 0}`);
console.log(`Invalid graph cases: ${fixtures.invalidGraphs?.length || 0}`);
console.log(`Policy types covered: ${policyCoverage.size}`);
