import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const rel = value => path.join(root, value);
const paths = {
  profileSchema: rel('data/schemas/npc-profile.schema.json'),
  archetypeSchema: rel('data/schemas/npc-archetype.schema.json'),
  packSchema: rel('data/schemas/npc-generator-pack.schema.json'),
  profileFixtures: [
    rel('data/npc-generator/fixtures/phase-1-profile-fixtures.json'),
    rel('data/npc-generator/fixtures/phase-1-supplemental-profile-fixtures.json')
  ],
  archetypePackFixtures: rel('data/npc-generator/fixtures/phase-1-archetype-pack-fixtures.json'),
  phaseStatus: rel('data/npc-generator/phase-status.json')
};

const SEMVER = /^\d+\.\d+\.\d+$/;
const STABLE_ID = /^[a-z0-9][a-z0-9-]{2,63}$/;
const PROFILE_ID = /^npc-[a-z0-9][a-z0-9-]{7,63}$/;
const CAMEL_ID = /^[a-z][A-Za-z0-9]*$/;
const SECTION_STATES = new Set(['present', 'none', 'unknown', 'not-applicable']);
const AGE_BANDS = new Set(['child', 'adolescent', 'adult', 'middle-aged', 'elderly', 'ageless', 'unknown']);
const MODES = new Set(['quick', 'standard', 'deep', 'manual', 'imported']);
const CANONICAL_SECTIONS = [
  'appearance', 'mechanics', 'socialEconomic', 'residence', 'workContext',
  'familyHousehold', 'personality', 'motivations', 'background',
  'affiliationsRelationships', 'possessionsResources', 'secretsProblemsHooks'
];

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    throw new Error(`${path.relative(root, filePath)} could not be parsed: ${error.message}`);
  }
}

function issue(code, at, message) {
  return { code, path: at, message };
}

function object(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function nonEmpty(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function validateSchemaDocument(schema, title) {
  const errors = [];
  if (schema.$schema !== 'https://json-schema.org/draft/2020-12/schema') {
    errors.push(issue('SCHEMA_DRAFT_INVALID', '/$schema', `${title} must declare JSON Schema 2020-12.`));
  }
  if (schema.title !== title) errors.push(issue('SCHEMA_TITLE_INVALID', '/title', `Expected schema title ${title}.`));
  if (schema.type !== 'object') errors.push(issue('SCHEMA_ROOT_TYPE_INVALID', '/type', `${title} must validate an object root.`));
  if (!Array.isArray(schema.required) || !schema.required.length) {
    errors.push(issue('SCHEMA_REQUIRED_EMPTY', '/required', `${title} must define root required fields.`));
  }
  if (!object(schema.properties) || !object(schema.$defs)) {
    errors.push(issue('SCHEMA_CONTRACT_INCOMPLETE', '/', `${title} must define properties and reusable definitions.`));
  }
  return errors;
}

function validateSection(section, at) {
  const errors = [];
  if (!object(section)) return [issue('SECTION_NOT_OBJECT', at, 'Section must be an object envelope.')];
  if (!SECTION_STATES.has(section.state)) {
    return [issue('SECTION_STATE_INVALID', `${at}/state`, `Unsupported section state: ${section.state}`)];
  }
  if (section.state === 'present' && !object(section.data)) {
    errors.push(issue('SECTION_PRESENT_DATA_MISSING', `${at}/data`, 'Present sections require a data object.'));
  }
  if (section.state === 'not-applicable' && !nonEmpty(section.reason)) {
    errors.push(issue('SECTION_NOT_APPLICABLE_REASON_MISSING', `${at}/reason`, 'Not-applicable sections require a reason.'));
  }
  if (section.substituteSection && !CAMEL_ID.test(section.substituteSection)) {
    errors.push(issue('SECTION_SUBSTITUTE_ID_INVALID', `${at}/substituteSection`, 'Substitute section must use a stable camelCase ID.'));
  }
  return errors;
}

function validateProfileStructure(profile) {
  const errors = [];
  const required = [
    'profileType', 'schemaVersion', 'profileId', 'revision', 'createdAt', 'updatedAt',
    'generator', 'archetype', 'identity', 'sections', 'locks', 'diagnostics', 'provenance'
  ];
  if (!object(profile)) return [issue('PROFILE_NOT_OBJECT', '/', 'Profile must be an object.')];

  for (const key of required) {
    if (!(key in profile)) errors.push(issue('PROFILE_REQUIRED_FIELD', `/${key}`, `Missing required profile field ${key}.`));
  }
  if (profile.profileType !== 'npcProfile') errors.push(issue('PROFILE_TYPE_INVALID', '/profileType', 'profileType must be npcProfile.'));
  if (!SEMVER.test(profile.schemaVersion || '')) errors.push(issue('PROFILE_SCHEMA_VERSION_INVALID', '/schemaVersion', 'schemaVersion must be semantic version text.'));
  if (!PROFILE_ID.test(profile.profileId || '')) errors.push(issue('PROFILE_ID_INVALID', '/profileId', 'profileId must be a stable npc-* ID.'));
  if (!Number.isInteger(profile.revision) || profile.revision < 1) errors.push(issue('PROFILE_REVISION_INVALID', '/revision', 'revision must be an integer of at least 1.'));
  for (const key of ['createdAt', 'updatedAt']) {
    if (!nonEmpty(profile[key]) || Number.isNaN(Date.parse(profile[key]))) errors.push(issue('PROFILE_TIMESTAMP_INVALID', `/${key}`, `${key} must be an ISO-compatible timestamp.`));
  }

  const receipt = profile.generator;
  if (!object(receipt)) {
    errors.push(issue('GENERATOR_RECEIPT_MISSING', '/generator', 'Generator receipt must be an object.'));
  } else {
    if (receipt.generatorId !== 'universal-npc-profile-generator') errors.push(issue('GENERATOR_ID_INVALID', '/generator/generatorId', 'Unexpected generator ID.'));
    for (const key of ['generatorVersion', 'packVersion']) {
      if (!SEMVER.test(receipt[key] || '')) errors.push(issue('GENERATOR_VERSION_INVALID', `/generator/${key}`, `${key} must be semantic version text.`));
    }
    if (!STABLE_ID.test(receipt.packId || '')) errors.push(issue('GENERATOR_PACK_ID_INVALID', '/generator/packId', 'packId is invalid.'));
    if (!nonEmpty(receipt.seed)) errors.push(issue('GENERATOR_SEED_MISSING', '/generator/seed', 'A non-empty seed is required.'));
    if (!MODES.has(receipt.mode)) errors.push(issue('GENERATOR_MODE_INVALID', '/generator/mode', 'Unsupported generation mode.'));
  }

  if (!object(profile.archetype) || !STABLE_ID.test(profile.archetype.id || '')) {
    errors.push(issue('PROFILE_ARCHETYPE_INVALID', '/archetype/id', 'A stable archetype ID is required.'));
  }
  if (!object(profile.identity)) {
    errors.push(issue('PROFILE_IDENTITY_MISSING', '/identity', 'Identity must be an object.'));
  } else {
    for (const key of ['fullName', 'ancestryId', 'ageBand', 'pronouns', 'languages']) {
      if (!(key in profile.identity)) errors.push(issue('IDENTITY_REQUIRED_FIELD', `/identity/${key}`, `Missing identity field ${key}.`));
    }
    if (!nonEmpty(profile.identity.fullName)) errors.push(issue('IDENTITY_NAME_INVALID', '/identity/fullName', 'fullName must be non-empty.'));
    if (!AGE_BANDS.has(profile.identity.ageBand)) errors.push(issue('IDENTITY_AGE_BAND_INVALID', '/identity/ageBand', 'Unsupported age band.'));
    if (!Array.isArray(profile.identity.languages) || !profile.identity.languages.length) errors.push(issue('IDENTITY_LANGUAGES_INVALID', '/identity/languages', 'At least one language is required.'));
    if (profile.identity.age !== null && profile.identity.age !== undefined && (!Number.isInteger(profile.identity.age) || profile.identity.age < 0)) {
      errors.push(issue('IDENTITY_AGE_INVALID', '/identity/age', 'Age must be null or a nonnegative integer.'));
    }
  }

  if (!object(profile.sections)) {
    errors.push(issue('PROFILE_SECTIONS_MISSING', '/sections', 'Profile sections must be an object.'));
  } else {
    for (const key of CANONICAL_SECTIONS) {
      if (!(key in profile.sections)) errors.push(issue('PROFILE_SECTION_MISSING', `/sections/${key}`, `Missing canonical section ${key}.`));
      else errors.push(...validateSection(profile.sections[key], `/sections/${key}`));
    }
    if (profile.sections.extensions !== undefined) {
      if (!object(profile.sections.extensions)) errors.push(issue('PROFILE_EXTENSIONS_INVALID', '/sections/extensions', 'extensions must be an object.'));
      else {
        for (const [key, value] of Object.entries(profile.sections.extensions)) {
          if (!CAMEL_ID.test(key)) errors.push(issue('PROFILE_EXTENSION_ID_INVALID', `/sections/extensions/${key}`, 'Extension IDs must use camelCase.'));
          errors.push(...validateSection(value, `/sections/extensions/${key}`));
        }
      }
    }
  }

  if (!Array.isArray(profile.locks)) errors.push(issue('PROFILE_LOCKS_INVALID', '/locks', 'locks must be an array.'));
  else {
    for (const lock of profile.locks) {
      if (typeof lock !== 'string' || !/^\/(identity|sections|archetype)(\/.*)?$/.test(lock)) errors.push(issue('PROFILE_LOCK_PATH_INVALID', '/locks', `Invalid lock path ${lock}.`));
    }
  }
  if (!Array.isArray(profile.diagnostics)) errors.push(issue('PROFILE_DIAGNOSTICS_INVALID', '/diagnostics', 'diagnostics must be an array.'));
  if (!object(profile.provenance)) errors.push(issue('PROFILE_PROVENANCE_INVALID', '/provenance', 'provenance must be an object.'));
  else {
    if (!['generator', 'user', 'import', 'migration'].includes(profile.provenance.createdBy)) errors.push(issue('PROFILE_PROVENANCE_CREATOR_INVALID', '/provenance/createdBy', 'Unsupported provenance creator.'));
    for (const key of ['sourcePackIds', 'sourceEntryIds']) {
      if (!Array.isArray(profile.provenance[key])) errors.push(issue('PROFILE_PROVENANCE_SOURCE_INVALID', `/provenance/${key}`, `${key} must be an array.`));
    }
  }
  return errors;
}

function requireWorkFields(errors, work, kind, fields, code) {
  if (work?.state !== 'present' || work?.data?.kind !== kind) {
    errors.push(issue(code, '/sections/workContext', `Expected ${kind} work context.`));
    return;
  }
  for (const field of fields) {
    if (work.data[field] === undefined || work.data[field] === null || work.data[field] === '') {
      errors.push(issue(`${code}_FIELD_MISSING`, `/sections/workContext/data/${field}`, `${kind} requires ${field}.`));
    }
  }
}

function validateProfileSemantics(profile) {
  const errors = [];
  const id = profile?.archetype?.id;
  const sections = profile?.sections || {};
  const work = sections.workContext;
  const family = sections.familyHousehold;
  const background = sections.background;
  const ext = sections.extensions || {};

  if (id === 'marginalized-beggar' && (work?.state !== 'not-applicable' || work?.substituteSection !== 'streetTerritory' || ext.streetTerritory?.state !== 'present')) {
    errors.push(issue('BEGGAR_WORKPLACE_CONTRADICTION', '/sections/workContext', 'Beggar profiles must replace a normal workplace with present streetTerritory data.'));
  }
  if (profile?.identity?.ageBand === 'child' && Number(family?.data?.childCount || 0) > 0) {
    errors.push(issue('CHILD_PARENTAGE_CONTRADICTION', '/sections/familyHousehold/data/childCount', 'Child profiles cannot have their own children under core ancestry rules.'));
  }

  if (id === 'civilian-laborer') requireWorkFields(errors, work, 'labor-assignment', ['laborType', 'hiringModel', 'workSite', 'payStability'], 'LABOR_ASSIGNMENT_MISSING');
  if (id === 'commercial-craft-worker') {
    requireWorkFields(errors, work, 'craft-practice', ['trade', 'standing', 'workshop', 'tools'], 'CRAFT_PRACTICE_MISSING');
    if (work?.data?.workshop && !SECTION_STATES.has(work.data.workshop.state)) errors.push(issue('CRAFT_WORKSHOP_STATE_INVALID', '/sections/workContext/data/workshop/state', 'Workshop must use an explicit state.'));
  }
  if (id === 'criminal-thief') {
    requireWorkFields(errors, work, 'criminal-operation', ['method', 'preferredTargets', 'operatingTerritory', 'fence', 'safehouse', 'tools'], 'THIEF_OPERATION_CONTRADICTION');
  }
  if (id === 'criminal-bandit') requireWorkFields(errors, work, 'outlaw-operation', ['gangStatus', 'leader', 'camp', 'territory', 'targetType'], 'BANDIT_OPERATION_MISSING');
  if (id === 'authority-city-guard') requireWorkFields(errors, work, 'duty-assignment', ['authority', 'station', 'jurisdiction', 'rank', 'shift', 'commander', 'patrolArea'], 'GUARD_ASSIGNMENT_MISSING');
  if (id === 'commercial-banker') requireWorkFields(errors, work, 'financial-operation', ['operatingModel', 'position', 'accessibleCapital', 'clients', 'security', 'currentRisk'], 'BANKER_OPERATION_MISSING');
  if (id === 'military-soldier') {
    requireWorkFields(errors, work, 'military-assignment', ['organization', 'unit', 'rank', 'commander', 'dutyStation'], 'SOLDIER_ASSIGNMENT');
  }
  if (id === 'elite-noble') {
    if (work?.state !== 'present' || work?.data?.kind !== 'estate-court-role') errors.push(issue('NOBLE_ROLE_MISSING', '/sections/workContext', 'Nobles require an estate-court-role work context.'));
    else {
      const data = work.data;
      if (!data.house && !data.houseException) errors.push(issue('NOBLE_HOUSE_MISSING', '/sections/workContext/data/house', 'Nobles require a house or explicit exception.'));
      if (!data.title && !data.titleException) errors.push(issue('NOBLE_TITLE_MISSING', '/sections/workContext/data/title', 'Nobles require a title or explicit exception.'));
      if (!data.estate && !data.estateException && !data.courtRole) errors.push(issue('NOBLE_ESTATE_ROLE_MISSING', '/sections/workContext/data', 'Nobles require an estate, court role, or explicit exception.'));
    }
  }
  if (id === 'civilian-refugee') {
    if (background?.state !== 'present' || !background.data?.displacementCause || !background.data?.formerOccupation) {
      errors.push(issue('REFUGEE_BACKGROUND_MISSING', '/sections/background', 'Refugee profiles require displacement cause and former occupation.'));
    }
  }
  if (id === 'civilian-child-dependent') {
    if (profile.identity?.ageBand !== 'child' || !family?.data?.guardian || family?.data?.dependentStatus !== 'minor') {
      errors.push(issue('CHILD_DEPENDENT_CONTEXT_MISSING', '/sections/familyHousehold', 'Child dependents require child age band, guardian, and minor status.'));
    }
    if (work?.state !== 'not-applicable' || work?.substituteSection !== 'schoolingAndSupervision' || ext.schoolingAndSupervision?.state !== 'present') {
      errors.push(issue('CHILD_SUPERVISION_MISSING', '/sections/workContext', 'Child dependents require schoolingAndSupervision substitution.'));
    }
  }
  if (id === 'military-veteran') {
    if (work?.state !== 'not-applicable' || work?.substituteSection !== 'formerService' || ext.formerService?.state !== 'present') {
      errors.push(issue('VETERAN_FORMER_SERVICE_MISSING', '/sections/workContext', 'Retired veterans require formerService substitution.'));
    }
  }
  return errors;
}

function validateArchetype(record) {
  const errors = [];
  if (!object(record)) return [issue('ARCHETYPE_NOT_OBJECT', '/', 'Archetype must be an object.')];
  if (record.archetypeType !== 'npcArchetype') errors.push(issue('ARCHETYPE_TYPE_INVALID', '/archetypeType', 'archetypeType must be npcArchetype.'));
  if (!SEMVER.test(record.schemaVersion || '')) errors.push(issue('ARCHETYPE_SCHEMA_VERSION_INVALID', '/schemaVersion', 'schemaVersion must be semantic version text.'));
  if (!STABLE_ID.test(record.id || '')) errors.push(issue('ARCHETYPE_ID_INVALID', '/id', 'Archetype ID is invalid.'));
  if (!object(record.sectionPolicies)) errors.push(issue('ARCHETYPE_POLICIES_MISSING', '/sectionPolicies', 'sectionPolicies must be an object.'));

  const specialized = new Set((record.specializedSections || []).map(section => section.id));
  for (const [sectionId, policy] of Object.entries(record.sectionPolicies || {})) {
    if (!object(policy) || !nonEmpty(policy.policy)) {
      errors.push(issue('ARCHETYPE_POLICY_INVALID', `/sectionPolicies/${sectionId}`, 'Section policy must be an object with a policy.'));
      continue;
    }
    if (policy.policy === 'weighted-none' && (!Number.isInteger(policy.noneWeight) || policy.noneWeight < 0 || policy.noneWeight > 100)) {
      errors.push(issue('ARCHETYPE_NONE_WEIGHT_RANGE', `/sectionPolicies/${sectionId}/noneWeight`, 'noneWeight must be 0 through 100.'));
    }
    if (policy.policy === 'substitute' && !policy.substituteSection) errors.push(issue('ARCHETYPE_SUBSTITUTE_MISSING', `/sectionPolicies/${sectionId}/substituteSection`, 'Substitute policies require substituteSection.'));
    if (['not-applicable', 'prohibited'].includes(policy.policy) && !nonEmpty(policy.reason)) errors.push(issue('ARCHETYPE_POLICY_REASON_MISSING', `/sectionPolicies/${sectionId}/reason`, `${policy.policy} policies require a reason.`));
    if (policy.substituteSection && !specialized.has(policy.substituteSection)) errors.push(issue('ARCHETYPE_SUBSTITUTE_UNKNOWN', `/sectionPolicies/${sectionId}/substituteSection`, `Unknown substitute section ${policy.substituteSection}.`));
  }
  for (const section of record.specializedSections || []) {
    if (!CAMEL_ID.test(section.id || '')) errors.push(issue('ARCHETYPE_SPECIALIZED_ID_INVALID', '/specializedSections', 'Specialized section IDs must use camelCase.'));
    if (!Array.isArray(section.fields) || !section.fields.length) errors.push(issue('ARCHETYPE_SPECIALIZED_FIELDS_EMPTY', `/specializedSections/${section.id}/fields`, 'Specialized sections need fields.'));
  }
  return errors;
}

function validatePack(record) {
  const errors = [];
  if (!object(record)) return [issue('PACK_NOT_OBJECT', '/', 'Pack must be an object.')];
  if (record.packType !== 'npcGeneratorPack') errors.push(issue('PACK_TYPE_INVALID', '/packType', 'packType must be npcGeneratorPack.'));
  if (!STABLE_ID.test(record.packId || '')) errors.push(issue('PACK_ID_INVALID', '/packId', 'packId must be a stable lowercase ID.'));
  if (!SEMVER.test(record.schemaVersion || '') || !SEMVER.test(record.version || '')) errors.push(issue('PACK_VERSION_INVALID', '/version', 'Pack schema and version must use semantic versions.'));
  if (record?.protectedIdPolicy?.allowCoreOverrides !== false) errors.push(issue('PACK_CORE_OVERRIDE_FORBIDDEN', '/protectedIdPolicy/allowCoreOverrides', 'Data packs may not override protected core IDs.'));
  if (!Array.isArray(record.archetypeFiles)) errors.push(issue('PACK_ARCHETYPE_FILES_INVALID', '/archetypeFiles', 'archetypeFiles must be an array.'));
  if (!object(record.dataFiles) || !Object.keys(record.dataFiles).length) errors.push(issue('PACK_DATA_FILES_INVALID', '/dataFiles', 'dataFiles must be a non-empty object.'));
  return errors;
}

function assertExpected(fixture, errors, failures) {
  const codes = new Set(errors.map(error => error.code));
  for (const expected of fixture.expectedCodes || []) {
    if (!codes.has(expected)) failures.push(`${fixture.id}: expected ${expected}; received ${[...codes].join(', ') || 'none'}.`);
  }
}

const schemas = [
  [readJson(paths.profileSchema), 'Universal NPC Profile'],
  [readJson(paths.archetypeSchema), 'Universal NPC Archetype'],
  [readJson(paths.packSchema), 'Universal NPC Generator Data Pack']
];
const failures = [];
for (const [schema, title] of schemas) {
  for (const error of validateSchemaDocument(schema, title)) failures.push(`${title}: ${error.code} ${error.message}`);
}

const fixtureSets = paths.profileFixtures.map(readJson);
const validProfiles = fixtureSets.flatMap(set => set.valid || []);
const invalidProfiles = fixtureSets.flatMap(set => set.invalid || []);
for (const fixture of validProfiles) {
  const errors = [...validateProfileStructure(fixture.profile), ...validateProfileSemantics(fixture.profile)];
  if (errors.length) failures.push(`${fixture.id}: valid profile failed with ${errors.map(error => error.code).join(', ')}.`);
}
for (const fixture of invalidProfiles) {
  const errors = [...validateProfileStructure(fixture.profile), ...validateProfileSemantics(fixture.profile)];
  if (!errors.length) failures.push(`${fixture.id}: invalid profile unexpectedly passed.`);
  assertExpected(fixture, errors, failures);
}

const requiredValidFixtures = new Set([
  'valid-beggar-no-business', 'valid-craft-worker-no-workshop', 'valid-soldier-unit-rank',
  'valid-noble-house-estate', 'valid-civilian-laborer', 'valid-craft-worker-with-workshop',
  'valid-thief-safehouse-fence', 'valid-bandit-camp-territory', 'valid-city-guard-patrol',
  'valid-banker-institution', 'valid-refugee-former-occupation', 'valid-child-dependent',
  'valid-elderly-retired-veteran'
]);
const presentValidIds = new Set(validProfiles.map(fixture => fixture.id));
for (const id of requiredValidFixtures) if (!presentValidIds.has(id)) failures.push(`Required Phase 1 fixture missing: ${id}.`);

const ap = readJson(paths.archetypePackFixtures);
for (const fixture of ap.archetypes?.valid || []) {
  const errors = validateArchetype(fixture.record);
  if (errors.length) failures.push(`${fixture.id}: valid archetype failed with ${errors.map(error => error.code).join(', ')}.`);
}
for (const fixture of ap.archetypes?.invalid || []) {
  const errors = validateArchetype(fixture.record);
  if (!errors.length) failures.push(`${fixture.id}: invalid archetype unexpectedly passed.`);
  assertExpected(fixture, errors, failures);
}
for (const fixture of ap.packs?.valid || []) {
  const errors = validatePack(fixture.record);
  if (errors.length) failures.push(`${fixture.id}: valid pack failed with ${errors.map(error => error.code).join(', ')}.`);
}
for (const fixture of ap.packs?.invalid || []) {
  const errors = validatePack(fixture.record);
  if (!errors.length) failures.push(`${fixture.id}: invalid pack unexpectedly passed.`);
  assertExpected(fixture, errors, failures);
}

const ledger = readJson(paths.phaseStatus);
if (ledger.activeBranch !== 'main') failures.push('Phase ledger must retain main as the only active branch.');
const phase1 = ledger.phases?.find(phase => phase.id === 'phase-1-canonical-schemas-fixtures');
if (!phase1 || !['active', 'gate-passed'].includes(phase1.status)) failures.push('Phase 1 must be active or gate-passed.');
if (ledger.lastCompletedPhaseId && Number(ledger.phases?.find(p => p.id === ledger.lastCompletedPhaseId)?.sequence ?? -1) < 0) failures.push('lastCompletedPhaseId must reference a known phase.');

if (failures.length) {
  console.error('NPC Phase 1 validation failed:');
  failures.forEach(failure => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('NPC Phase 1 validation passed.');
console.log(`Schemas: ${schemas.length}`);
console.log(`Profiles: ${validProfiles.length} valid, ${invalidProfiles.length} expected-invalid`);
console.log(`Archetypes: ${ap.archetypes?.valid?.length || 0} valid, ${ap.archetypes?.invalid?.length || 0} expected-invalid`);
console.log(`Packs: ${ap.packs?.valid?.length || 0} valid, ${ap.packs?.invalid?.length || 0} expected-invalid`);
