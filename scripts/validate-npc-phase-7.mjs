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

const fixture = json('data/npc-generator/fixtures/phase-7-kinship-matrix.json');
for (const file of fixture.requiredRuntimeFiles) {
  if (!fs.existsSync(rel(file))) fail(`Missing runtime file ${file}.`);
  else vm.runInThisContext(read(file), { filename: file });
}
for (const file of fixture.requiredDataFiles) if (!fs.existsSync(rel(file))) fail(`Missing data file ${file}.`);

const Core = globalThis.NpcProfileGeneratorCore;
const H = globalThis.NpcProfileHouseholdCore;
if (!Core || !H) fail('Household runtime did not initialize.');

const names = json('data/npc-generator/names/core-fantasy-names.json');
const ancestries = json('data/npc-generator/ancestries/core-fantasy.json');
const core = json('data/npc-generator/tables/core-profile-tables.json');
const rulesFile = json('data/npc-generator/tables/ancestry-household-rules.json');
const status = json('data/npc-generator/tables/household-status-tables.json');
const obligations = json('data/npc-generator/tables/household-obligation-tables.json');
const relationships = json('data/npc-generator/tables/relationship-network-tables.json');
const ledger = json('data/npc-generator/phase-status.json');

const pack = {
  packId: 'phase-7-kinship-pack',
  version: '0.1.0',
  tables: {},
  sectionFields: core.sectionFields,
  ageRanges: ancestries.ageRanges,
  ancestryRules: {},
  defaultAncestryRule: rulesFile.defaultRule
};
for (const source of [names.tables, ancestries.tables, core.tables, status.tables, obligations.tables, relationships.tables]) {
  for (const [id, entries] of Object.entries(source || {})) pack.tables[id] = entries;
}
for (const entry of rulesFile.entries || []) pack.ancestryRules[entry.id] = entry;

const sectionIds = globalThis.NpcProfileGeneratorFoundation.CANONICAL_SECTIONS;
const archetype = {
  id: 'phase-7-test-person',
  label: 'Phase 7 Test Person',
  parentId: null,
  tags: ['fixture'],
  inheritanceChain: ['phase-7-test-person'],
  sectionPolicies: Object.fromEntries(sectionIds.map(id => [id, { policy: 'required' }])),
  specializedSections: []
};

function clone(value) { return JSON.parse(JSON.stringify(value)); }
function hasValue(value) {
  if (value === undefined || value === null || value === '') return false;
  if (Array.isArray(value)) return value.length > 0;
  return true;
}
function scenarioAge(rule, scenario) {
  if (scenario === 'early-life') return Math.max(0, Number(rule.adultThreshold) - 1);
  if (scenario === 'elder') return Math.min(Number(rule.maxAge), Number(rule.elderThreshold) + Math.max(1, Math.floor((Number(rule.maxAge) - Number(rule.elderThreshold)) / 3)));
  return Number(rule.adultThreshold) + Math.max(1, Math.floor((Number(rule.elderThreshold) - Number(rule.adultThreshold)) / 3));
}
function generate(ancestryId, age, mode, seed, extra = {}) {
  return Core.generateProfile({
    seed,
    archetype,
    pack,
    mode,
    timestamp: fixture.timestamp,
    options: { identity: { ancestryId, age, ...(extra.identity || {}) } },
    rerollCounters: extra.rerollCounters || {},
    previousProfile: extra.previousProfile,
    locks: extra.locks || []
  });
}
function collectNames(value, output = []) {
  if (Array.isArray(value)) value.forEach(entry => collectNames(entry, output));
  else if (value && typeof value === 'object') {
    if (typeof value.name === 'string') output.push(value.name);
    Object.values(value).forEach(entry => collectNames(entry, output));
  }
  return output;
}
function validateParent(record, profileAge, rule, label) {
  if (record.state === 'unknown') return;
  if (record.state === 'living') {
    const gap = record.age - profileAge;
    if (gap < rule.parentGapMin || gap > rule.parentGapMax) fail(`${label}: living parent gap ${gap} is outside configured bounds.`);
    if (record.age > rule.maxAge) fail(`${label}: living parent exceeds ancestry maximum age.`);
    return;
  }
  if (record.state === 'deceased') {
    const gap = record.wouldBeAge - profileAge;
    if (gap < rule.parentGapMin || gap > rule.parentGapMax) fail(`${label}: deceased parent hypothetical gap ${gap} is outside configured bounds.`);
    if (record.ageAtDeath < gap || record.ageAtDeath > rule.maxAge) fail(`${label}: age at death is implausible.`);
    return;
  }
  fail(`${label}: parent state ${record.state} is unsupported.`);
}

let profilesGenerated = 0;
let deterministicRepeats = 0;
let familyRerollChanges = 0;
let relationshipRerollChanges = 0;
const observedStates = new Set();

for (const ancestryId of fixture.ancestries) {
  const rule = pack.ancestryRules[ancestryId];
  if (!rule) {
    fail(`Missing ancestry rule ${ancestryId}.`);
    continue;
  }

  for (const scenario of fixture.scenarios) {
    const age = scenarioAge(rule, scenario);
    for (const mode of fixture.modes) {
      for (let index = 0; index < fixture.seedsPerScenario; index += 1) {
        const seed = `phase7:${ancestryId}:${scenario}:${mode}:${index}`;
        const result = generate(ancestryId, age, mode, seed);
        profilesGenerated += 1;
        const label = `${ancestryId} ${scenario} ${mode} ${index}`;
        if (!result.valid || !result.profile) {
          fail(`${label}: generation failed with ${result.diagnostics.map(item => item.code).join(', ')}.`);
          continue;
        }
        const errors = result.diagnostics.filter(item => item.severity === 'error');
        const warnings = result.diagnostics.filter(item => item.severity === 'warning');
        if (errors.length || warnings.length) fail(`${label}: diagnostics ${result.diagnostics.map(item => item.code).join(', ')}.`);

        const profile = result.profile;
        const family = profile.sections.familyHousehold.data;
        const network = profile.sections.affiliationsRelationships.data;
        if (profile.identity.age !== age) fail(`${label}: explicit age was not preserved.`);
        if (profile.identity.ageBand !== H.stageForAge(age, rule)) fail(`${label}: life-stage classification is incorrect.`);
        if (family.lifeStage !== profile.identity.ageBand) fail(`${label}: household life stage disagrees with identity.`);
        if (family.siblingCount !== (family.siblings?.length || 0) && mode !== 'quick') fail(`${label}: sibling count does not match records.`);
        if (family.childCount !== (family.children?.length || 0) && mode !== 'quick') fail(`${label}: descendant count does not match records.`);
        if (family.dependentCount !== (family.dependents?.length || 0) && mode !== 'quick') fail(`${label}: dependent count does not match records.`);

        observedStates.add(family.partner?.state || family.maritalState);
        (family.parents || []).forEach((parent, parentIndex) => validateParent(parent, age, rule, `${label} parent ${parentIndex}`));
        for (const sibling of family.siblings || []) {
          if (Math.abs(sibling.age - age) > rule.siblingSpread) fail(`${label}: sibling age spread is too large.`);
          if (sibling.age < 0 || sibling.age > rule.maxAge) fail(`${label}: sibling age is outside ancestry limits.`);
        }
        for (const descendant of family.children || []) {
          if (descendant.age < 0 || descendant.age > age - rule.parentGapMin) fail(`${label}: descendant age is implausible.`);
        }
        if (family.partner?.state === 'present') {
          if (family.partner.age < rule.adultThreshold) fail(`${label}: partner is below ancestry adult threshold.`);
          if (Math.abs(family.partner.age - age) > rule.partnerSpread) fail(`${label}: partner age spread is too large.`);
        }

        if (scenario === 'early-life') {
          if (family.maritalState !== 'not-applicable' || family.childCount !== 0 || family.dependentCount !== 0) fail(`${label}: early-life household restrictions failed.`);
          if (mode !== 'quick') {
            if (family.partner?.state !== 'not-applicable') fail(`${label}: early-life partner state must be not-applicable.`);
            if (!family.guardian || family.guardian.age < age + rule.parentGapMin) fail(`${label}: guardian age is implausible.`);
          }
        }

        if (mode !== 'quick') for (const field of fixture.requiredStandardFields) if (!(field in family)) fail(`${label}: missing standard household field ${field}.`);
        if (mode === 'deep') for (const field of fixture.requiredDeepFields) if (!(field in family)) fail(`${label}: missing deep household field ${field}.`);
        for (const field of fixture.relationshipFields[mode]) if (!hasValue(network[field])) fail(`${label}: missing relationship field ${field}.`);

        const namesFound = collectNames({ family, network });
        if (new Set(namesFound).size !== namesFound.length) fail(`${label}: generated relationship names are not unique.`);

        if (mode === 'deep') {
          const repeat = generate(ancestryId, age, mode, seed);
          deterministicRepeats += 1;
          if (JSON.stringify(profile) !== JSON.stringify(repeat.profile)) fail(`${label}: household generation is not deterministic.`);
        }
      }
    }
  }

  const rerollAge = scenarioAge(rule, 'working-age');
  const base = generate(ancestryId, rerollAge, 'deep', `phase7:reroll:${ancestryId}`);
  const previous = clone(base.profile);
  const familyReroll = generate(ancestryId, rerollAge, 'deep', `phase7:reroll:${ancestryId}`, {
    previousProfile: previous,
    rerollCounters: { familyHousehold: 1 },
    locks: ['/sections/familyHousehold/data/householdType']
  });
  if (familyReroll.profile.sections.familyHousehold.data.householdType !== previous.sections.familyHousehold.data.householdType) fail(`${ancestryId}: family lock was not preserved.`);
  if (JSON.stringify(familyReroll.profile.sections.affiliationsRelationships) !== JSON.stringify(previous.sections.affiliationsRelationships)) fail(`${ancestryId}: family reroll changed relationship network.`);
  if (JSON.stringify(familyReroll.profile.sections.familyHousehold) !== JSON.stringify(previous.sections.familyHousehold)) familyRerollChanges += 1;

  const relationshipReroll = generate(ancestryId, rerollAge, 'deep', `phase7:reroll:${ancestryId}`, {
    previousProfile: previous,
    rerollCounters: { affiliationsRelationships: 1 }
  });
  if (JSON.stringify(relationshipReroll.profile.sections.familyHousehold) !== JSON.stringify(previous.sections.familyHousehold)) fail(`${ancestryId}: relationship reroll changed family household.`);
  if (JSON.stringify(relationshipReroll.profile.sections.affiliationsRelationships) !== JSON.stringify(previous.sections.affiliationsRelationships)) relationshipRerollChanges += 1;

  for (let index = 0; index < 20; index += 1) {
    const automatic = Core.generateProfile({
      seed: `phase7:auto:${ancestryId}:${index}`,
      archetype,
      pack,
      mode: 'standard',
      timestamp: fixture.timestamp,
      options: { identity: { ancestryId, ageBand: 'adult' } }
    });
    const range = H.rangesFor(rule).adult;
    if (automatic.profile.identity.age < range[0] || automatic.profile.identity.age > range[1]) fail(`${ancestryId}: automatic adult age is outside ancestry range.`);
    if (automatic.profile.identity.ageBand !== 'adult') fail(`${ancestryId}: automatic adult life stage was not retained.`);
  }
}

const expectedProfiles = fixture.ancestries.length * fixture.scenarios.length * fixture.modes.length * fixture.seedsPerScenario;
if (profilesGenerated !== expectedProfiles) fail(`Generated ${profilesGenerated} profiles; expected ${expectedProfiles}.`);
if (!observedStates.has('not-applicable')) fail('No explicit not-applicable relationship state was observed.');
if (![...observedStates].some(state => state === 'none' || state === 'unknown')) fail('No explicit none or unknown relationship outcome was observed.');
if (!familyRerollChanges) fail('No family reroll changed generated household content.');
if (!relationshipRerollChanges) fail('No relationship reroll changed generated network content.');
if (ledger.activeBranch !== 'main') fail('Phase ledger must retain main as the only active branch.');
if (ledger.activePhaseId !== 'phase-7-family-household-relationships') fail('Phase 7 must be active.');
if (ledger.lastCompletedPhaseId !== 'phase-6-deep-identity-background-motivation') fail('Phase 6 must be the last completed phase.');

if (failures.length) {
  console.error('NPC Phase 7 validation failed:');
  failures.forEach(message => console.error(`- ${message}`));
  process.exit(1);
}

console.log('NPC Phase 7 validation passed.');
console.log(`Profiles generated: ${profilesGenerated}`);
console.log(`Deterministic deep repeats: ${deterministicRepeats}`);
console.log(`Family reroll changes observed: ${familyRerollChanges}`);
console.log(`Relationship reroll changes observed: ${relationshipRerollChanges}`);
console.log(`Explicit states observed: ${[...observedStates].sort().join(', ')}`);
