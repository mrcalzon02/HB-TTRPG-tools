import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(scriptDir, '..');

const paths = {
  profileSchema: path.join(root, 'data/schemas/npc-profile.schema.json'),
  archetypeSchema: path.join(root, 'data/schemas/npc-archetype.schema.json'),
  packSchema: path.join(root, 'data/schemas/npc-generator-pack.schema.json'),
  profileFixtures: path.join(root, 'data/npc-generator/fixtures/phase-1-profile-fixtures.json'),
  archetypePackFixtures: path.join(root, 'data/npc-generator/fixtures/phase-1-archetype-pack-fixtures.json'),
  phaseStatus: path.join(root, 'data/npc-generator/phase-status.json')
};

const semver = /^\d+\.\d+\.\d+$/;
const stableId = /^[a-z0-9][a-z0-9-]{2,63}$/;
const profileId = /^npc-[a-z0-9][a-z0-9-]{7,63}$/;
const sectionStates = new Set(['present', 'none', 'unknown', 'not-applicable']);
const requiredSections = [
  'appearance',
  'mechanics',
  'socialEconomic',
  'residence',
  'workContext',
  'familyHousehold',
  'personality',
  'motivations',
  'background',
  'affiliationsRelationships',
  'possessionsResources',
  'secretsProblemsHooks'
];

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    throw new Error(`${path.relative(root, filePath)} could not be parsed: ${error.message}`);
  }
}

function diagnostic(code, pathValue, message) {
  return { code, path: pathValue, message };
}

function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function validateSchemaDocument(schema, expectedTitle) {
  const errors = [];
  if (schema.$schema !== 'https://json-schema.org/draft/2020-12/schema') {
    errors.push(diagnostic('SCHEMA_DRAFT_INVALID', '/$schema', `${expectedTitle} must declare JSON Schema 2020-12.`));
  }
  if (schema.title !== expectedTitle) {
    errors.push(diagnostic('SCHEMA_TITLE_INVALID', '/title', `Expected schema title ${expectedTitle}.`));
  }
  if (schema.type !== 'object') {
    errors.push(diagnostic('SCHEMA_ROOT_TYPE_INVALID', '/type', `${expectedTitle} must validate an object root.`));
  }
  if (!Array.isArray(schema.required) || !schema.required.length) {
    errors.push(diagnostic('SCHEMA_REQUIRED_EMPTY', '/required', `${expectedTitle} must define root required fields.`));
  }
  return errors;
}

function validateSectionEnvelope(section, sectionPath) {
  const errors = [];
  if (!isObject(section)) {
    return [diagnostic('SECTION_NOT_OBJECT', sectionPath, 'Section must be an object envelope.')];
  }
  if (!sectionStates.has(section.state)) {
    errors.push(diagnostic('SECTION_STATE_INVALID', `${sectionPath}/state`, `Unsupported section state: ${section.state}`));
    return errors;
  }
  if (section.state === 'present' && !isObject(section.data)) {
    errors.push(diagnostic('SECTION_PRESENT_DATA_MISSING', `${sectionPath}/data`, 'Present sections require a data object.'));
  }
  if (section.state === 'not-applicable' && typeof section.reason !== 'string') {
    errors.push(diagnostic('SECTION_NOT_APPLICABLE_REASON_MISSING', `${sectionPath}/reason`, 'Not-applicable sections require a reason.'));
  }
  if (section.substituteSection && !/^[a-z][A-Za-z0-9]*$/.test(section.substituteSection)) {
    errors.push(diagnostic('SECTION_SUBSTITUTE_ID_INVALID', `${sectionPath}/substituteSection`, 'Substitute section must use a stable camelCase ID.'));
  }
  return errors;
}

function validateProfileStructure(profile) {
  const errors = [];
  const required = [
    'profileType',
    'schemaVersion',
    'profileId',
    'revision',
    'createdAt',
    'updatedAt',
    'generator',
    'archetype',
    'identity',
    'sections',
    'locks',
    'diagnostics',
    'provenance'
  ];

  if (!isObject(profile)) return [diagnostic('PROFILE_NOT_OBJECT', '/', 'Profile must be an object.')];
  for (const key of required) {
    if (!(key in profile)) errors.push(diagnostic('PROFILE_REQUIRED_FIELD', `/${key}`, `Missing required profile field ${key}.`));
  }
  if (profile.profileType !== 'npcProfile') errors.push(diagnostic('PROFILE_TYPE_INVALID', '/profileType', 'profileType must be npcProfile.'));
  if (!semver.test(profile.schemaVersion || '')) errors.push(diagnostic('PROFILE_SCHEMA_VERSION_INVALID', '/schemaVersion', 'schemaVersion must be semantic version text.'));
  if (!profileId.test(profile.profileId || '')) errors.push(diagnostic('PROFILE_ID_INVALID', '/profileId', 'profileId must be a stable npc-* ID.'));
  if (!Number.isInteger(profile.revision) || profile.revision < 1) errors.push(diagnostic('PROFILE_REVISION_INVALID', '/revision', 'revision must be an integer of at least 1.'));

  if (!isObject(profile.generator)) {
    errors.push(diagnostic('GENERATOR_RECEIPT_MISSING', '/generator', 'Generator receipt must be an object.'));
  } else {
    if (profile.generator.generatorId !== 'universal-npc-profile-generator') {
      errors.push(diagnostic('GENERATOR_ID_INVALID', '/generator/generatorId', 'Unexpected generator ID.'));
    }
    for (const key of ['generatorVersion', 'packVersion']) {
      if (!semver.test(profile.generator[key] || '')) errors.push(diagnostic('GENERATOR_VERSION_INVALID', `/generator/${key}`, `${key} must be semantic version text.`));
    }
    if (!stableId.test(profile.generator.packId || '')) errors.push(diagnostic('GENERATOR_PACK_ID_INVALID', '/generator/packId', 'packId is invalid.'));
    if (typeof profile.generator.seed !== 'string' || !profile.generator.seed.length) errors.push(diagnostic('GENERATOR_SEED_MISSING', '/generator/seed', 'A non-empty seed is required.'));
  }

  if (!isObject(profile.archetype) || !stableId.test(profile.archetype.id || '')) {
    errors.push(diagnostic('PROFILE_ARCHETYPE_INVALID', '/archetype/id', 'A stable archetype ID is required.'));
  }

  if (!isObject(profile.identity)) {
    errors.push(diagnostic('PROFILE_IDENTITY_MISSING', '/identity', 'Identity must be an object.'));
  } else {
    for (const key of ['fullName', 'ancestryId', 'ageBand', 'pronouns', 'languages']) {
      if (!(key in profile.identity)) errors.push(diagnostic('IDENTITY_REQUIRED_FIELD', `/identity/${key}`, `Missing identity field ${key}.`));
    }
  }

  if (!isObject(profile.sections)) {
    errors.push(diagnostic('PROFILE_SECTIONS_MISSING', '/sections', 'Profile sections must be an object.'));
  } else {
    for (const key of requiredSections) {
      if (!(key in profile.sections)) {
        errors.push(diagnostic('PROFILE_SECTION_MISSING', `/sections/${key}`, `Missing canonical section ${key}.`));
      } else {
        errors.push(...validateSectionEnvelope(profile.sections[key], `/sections/${key}`));
      }
    }
    if (profile.sections.extensions !== undefined) {
      if (!isObject(profile.sections.extensions)) {
        errors.push(diagnostic('PROFILE_EXTENSIONS_INVALID', '/sections/extensions', 'extensions must be an object.'));
      } else {
        for (const [key, value] of Object.entries(profile.sections.extensions)) {
          errors.push(...validateSectionEnvelope(value, `/sections/extensions/${key}`));
        }
      }
    }
  }

  if (!Array.isArray(profile.locks)) errors.push(diagnostic('PROFILE_LOCKS_INVALID', '/locks', 'locks must be an array.'));
  if (!Array.isArray(profile.diagnostics)) errors.push(diagnostic('PROFILE_DIAGNOSTICS_INVALID', '/diagnostics', 'diagnostics must be an array.'));
  if (!isObject(profile.provenance)) errors.push(diagnostic('PROFILE_PROVENANCE_INVALID', '/provenance', 'provenance must be an object.'));

  return errors;
}

function validateProfileSemantics(profile) {
  const errors = [];
  const archetypeId = profile?.archetype?.id;
  const sections = profile?.sections || {};
  const work = sections.workContext;
  const family = sections.familyHousehold;
  const extensions = sections.extensions || {};

  if (archetypeId === 'marginalized-beggar') {
    if (work?.state !== 'not-applicable' || work?.substituteSection !== 'streetTerritory' || extensions.streetTerritory?.state !== 'present') {
      errors.push(diagnostic(
        'BEGGAR_WORKPLACE_CONTRADICTION',
        '/sections/workContext',
        'Beggar profiles must mark normal workplace not applicable and provide a present streetTerritory substitute.'
      ));
    }
  }

  if (profile?.identity?.ageBand === 'child' && Number(family?.data?.childCount || 0) > 0) {
    errors.push(diagnostic(
      'CHILD_PARENTAGE_CONTRADICTION',
      '/sections/familyHousehold/data/childCount',
      'Child profiles cannot have their own children under the core ancestry rules.'
    ));
  }

  if (archetypeId === 'commercial-craft-worker') {
    if (work?.state !== 'present' || work?.data?.kind !== 'craft-practice' || !isObject(work?.data?.workshop)) {
      errors.push(diagnostic('CRAFT_PRACTICE_MISSING', '/sections/workContext', 'Craft workers require a craft-practice work context and explicit workshop state.'));
    }
  }

  if (archetypeId === 'military-soldier') {
    const required = ['organization', 'unit', 'rank', 'commander', 'dutyStation'];
    if (work?.state !== 'present' || work?.data?.kind !== 'military-assignment') {
      errors.push(diagnostic('SOLDIER_ASSIGNMENT_MISSING', '/sections/workContext', 'Soldiers require a military-assignment work context.'));
    } else {
      for (const key of required) {
        if (!work.data[key]) errors.push(diagnostic('SOLDIER_ASSIGNMENT_FIELD_MISSING', `/sections/workContext/data/${key}`, `Soldier assignment requires ${key}.`));
      }
    }
  }

  if (archetypeId === 'elite-noble') {
    const data = work?.data || {};
    if (work?.state !== 'present' || data.kind !== 'estate-court-role') {
      errors.push(diagnostic('NOBLE_ROLE_MISSING', '/sections/workContext', 'Nobles require an estate-court-role work context.'));
    } else {
      if (!data.house && !data.houseException) errors.push(diagnostic('NOBLE_HOUSE_MISSING', '/sections/workContext/data/house', 'Nobles require a house or explicit house exception.'));
      if (!data.title && !data.titleException) errors.push(diagnostic('NOBLE_TITLE_MISSING', '/sections/workContext/data/title', 'Nobles require a title or explicit title exception.'));
      if (!data.estate && !data.estateException && !data.courtRole) errors.push(diagnostic('NOBLE_ESTATE_ROLE_MISSING', '/sections/workContext/data', 'Nobles require an estate, court role, or explicit exception.'));
    }
  }

  return errors;
}

function validateArchetype(record) {
  const errors = [];
  if (!isObject(record)) return [diagnostic('ARCHETYPE_NOT_OBJECT', '/', 'Archetype must be an object.')];
  if (record.archetypeType !== 'npcArchetype') errors.push(diagnostic('ARCHETYPE_TYPE_INVALID', '/archetypeType', 'archetypeType must be npcArchetype.'));
  if (!semver.test(record.schemaVersion || '')) errors.push(diagnostic('ARCHETYPE_SCHEMA_VERSION_INVALID', '/schemaVersion', 'schemaVersion must be semantic version text.'));
  if (!stableId.test(record.id || '')) errors.push(diagnostic('ARCHETYPE_ID_INVALID', '/id', 'Archetype ID is invalid.'));
  if (!isObject(record.sectionPolicies)) errors.push(diagnostic('ARCHETYPE_POLICIES_MISSING', '/sectionPolicies', 'sectionPolicies must be an object.'));

  for (const [sectionId, policy] of Object.entries(record.sectionPolicies || {})) {
    if (!isObject(policy) || typeof policy.policy !== 'string') {
      errors.push(diagnostic('ARCHETYPE_POLICY_INVALID', `/sectionPolicies/${sectionId}`, 'Section policy must be an object with a policy.'));
      continue;
    }
    if (policy.policy === 'weighted-none' && (!Number.isInteger(policy.noneWeight) || policy.noneWeight < 0 || policy.noneWeight > 100)) {
      errors.push(diagnostic('ARCHETYPE_NONE_WEIGHT_RANGE', `/sectionPolicies/${sectionId}/noneWeight`, 'noneWeight must be an integer from 0 to 100.'));
    }
    if (policy.policy === 'substitute' && !policy.substituteSection) {
      errors.push(diagnostic('ARCHETYPE_SUBSTITUTE_MISSING', `/sectionPolicies/${sectionId}/substituteSection`, 'Substitute policies require substituteSection.'));
    }
    if (['not-applicable', 'prohibited'].includes(policy.policy) && !policy.reason) {
      errors.push(diagnostic('ARCHETYPE_POLICY_REASON_MISSING', `/sectionPolicies/${sectionId}/reason`, `${policy.policy} policies require a reason.`));
    }
  }

  const specializedIds = new Set((record.specializedSections || []).map(section => section.id));
  for (const [sectionId, policy] of Object.entries(record.sectionPolicies || {})) {
    if (policy.substituteSection && !specializedIds.has(policy.substituteSection)) {
      errors.push(diagnostic('ARCHETYPE_SUBSTITUTE_UNKNOWN', `/sectionPolicies/${sectionId}/substituteSection`, `Unknown substitute section ${policy.substituteSection}.`));
    }
  }

  return errors;
}

function validatePack(record) {
  const errors = [];
  if (!isObject(record)) return [diagnostic('PACK_NOT_OBJECT', '/', 'Pack must be an object.')];
  if (record.packType !== 'npcGeneratorPack') errors.push(diagnostic('PACK_TYPE_INVALID', '/packType', 'packType must be npcGeneratorPack.'));
  if (!stableId.test(record.packId || '')) errors.push(diagnostic('PACK_ID_INVALID', '/packId', 'packId must be a stable lowercase ID.'));
  if (!semver.test(record.schemaVersion || '') || !semver.test(record.version || '')) errors.push(diagnostic('PACK_VERSION_INVALID', '/version', 'Pack schema and version must use semantic versions.'));
  if (record?.protectedIdPolicy?.allowCoreOverrides !== false) {
    errors.push(diagnostic('PACK_CORE_OVERRIDE_FORBIDDEN', '/protectedIdPolicy/allowCoreOverrides', 'Data packs may not override protected core IDs.'));
  }
  return errors;
}

function codeSet(errors) {
  return new Set(errors.map(error => error.code));
}

function assertExpectedCodes(fixture, errors, failures) {
  const actual = codeSet(errors);
  for (const expected of fixture.expectedCodes || []) {
    if (!actual.has(expected)) failures.push(`${fixture.id}: expected diagnostic ${expected}, received ${[...actual].join(', ') || 'none'}.`);
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

const profileFixtures = readJson(paths.profileFixtures);
for (const fixture of profileFixtures.valid || []) {
  const errors = [...validateProfileStructure(fixture.profile), ...validateProfileSemantics(fixture.profile)];
  if (errors.length) failures.push(`${fixture.id}: valid profile failed with ${errors.map(error => error.code).join(', ')}.`);
}
for (const fixture of profileFixtures.invalid || []) {
  const errors = [...validateProfileStructure(fixture.profile), ...validateProfileSemantics(fixture.profile)];
  if (!errors.length) failures.push(`${fixture.id}: invalid profile unexpectedly passed.`);
  assertExpectedCodes(fixture, errors, failures);
}

const apFixtures = readJson(paths.archetypePackFixtures);
for (const fixture of apFixtures.archetypes?.valid || []) {
  const errors = validateArchetype(fixture.record);
  if (errors.length) failures.push(`${fixture.id}: valid archetype failed with ${errors.map(error => error.code).join(', ')}.`);
}
for (const fixture of apFixtures.archetypes?.invalid || []) {
  const errors = validateArchetype(fixture.record);
  if (!errors.length) failures.push(`${fixture.id}: invalid archetype unexpectedly passed.`);
  assertExpectedCodes(fixture, errors, failures);
}
for (const fixture of apFixtures.packs?.valid || []) {
  const errors = validatePack(fixture.record);
  if (errors.length) failures.push(`${fixture.id}: valid pack failed with ${errors.map(error => error.code).join(', ')}.`);
}
for (const fixture of apFixtures.packs?.invalid || []) {
  const errors = validatePack(fixture.record);
  if (!errors.length) failures.push(`${fixture.id}: invalid pack unexpectedly passed.`);
  assertExpectedCodes(fixture, errors, failures);
}

const phaseStatus = readJson(paths.phaseStatus);
if (phaseStatus.activeBranch !== 'main') failures.push('Phase ledger must retain main as the only active branch.');
if (phaseStatus.activePhaseId !== 'phase-1-canonical-schemas-fixtures') failures.push('Phase 1 must remain active until its complete fixture matrix and validator evidence are recorded.');
if (phaseStatus.lastCompletedPhaseId !== 'phase-0-specification-architecture') failures.push('Phase 0 must be recorded as the last completed phase.');

if (failures.length) {
  console.error('NPC Phase 1 validation failed:');
  failures.forEach(failure => console.error(`- ${failure}`));
  process.exit(1);
}

const validProfileCount = profileFixtures.valid?.length || 0;
const invalidProfileCount = profileFixtures.invalid?.length || 0;
const validArchetypeCount = apFixtures.archetypes?.valid?.length || 0;
const invalidArchetypeCount = apFixtures.archetypes?.invalid?.length || 0;
const validPackCount = apFixtures.packs?.valid?.length || 0;
const invalidPackCount = apFixtures.packs?.invalid?.length || 0;

console.log('NPC Phase 1 validation passed.');
console.log(`Schemas: ${schemas.length}`);
console.log(`Profiles: ${validProfileCount} valid, ${invalidProfileCount} expected-invalid`);
console.log(`Archetypes: ${validArchetypeCount} valid, ${invalidArchetypeCount} expected-invalid`);
console.log(`Packs: ${validPackCount} valid, ${invalidPackCount} expected-invalid`);
