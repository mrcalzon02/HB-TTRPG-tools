#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const moduleMap = require('../module-map-generator.js');

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const BATCH_ID = process.env.BATCH_ID || '2026-08-22-purpose-aware-variety-01';
const OUT = path.join(ROOT, 'artifacts', 'spatial-site-batch', BATCH_ID);
const CASES_DIR = path.join(OUT, 'cases');
const RULES = ['open_d20', 'world_of_darkness', 'blacklight_continuum', 'kaysender'];
const sourceCommit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim();

const sha256 = text => crypto.createHash('sha256').update(text).digest('hex');
const slug = value => String(value).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const count = (items, fn) => (items || []).reduce((n, item) => n + Number(fn(item) || 0), 0);
const uniq = values => [...new Set(values.filter(v => v != null && v !== ''))].sort();
const clone = value => JSON.parse(JSON.stringify(value));

function curated(id, locationArchetype, overrides) {
  return {
    id,
    kind: 'curated',
    input: {
      seed: `archive-${BATCH_ID}-${id}`,
      locationArchetype,
      rulesTarget: RULES[CURATED.length % RULES.length],
      adventurePurpose: overrides.adventurePurpose || 'exploration',
      ...overrides,
    },
  };
}

const CURATED = [];
function addCurated(id, archetype, overrides) {
  const rulesTarget = RULES[CURATED.length % RULES.length];
  CURATED.push({ id, kind: 'curated', input: { seed: `archive-${BATCH_ID}-${id}`, locationArchetype: archetype, rulesTarget, adventurePurpose: 'exploration', ...overrides } });
}

addCurated('generic-neutral-urban', 'generic', {
  siteScale: 'standard', culturalInfluence: 'culture-neutral', currentController: 'civilian-residents', occupancyState: 'active',
  biome: 'urban', climate: 'temperate', season: 'late-summer', weather: 'overcast', ecology: 'urban-vermin',
  creatureFamilies: ['humanoid', 'urban-pest'], hazardFamilies: ['fire', 'security'], creatureDensity: 4, hazardIntensity: 3,
  condition: 'serviceable', maintenance: 'routine', security: 'watched', defenseDoctrine: 'passive', magicTech: 'low-magic',
  wealth: 'modest', traffic: 'busy', socialMode: 'public', resourceProfile: 'trade-goods', secretDensity: 'scarce',
  lighting: 'windows', waterState: 'dry', verticality: 'flat', contamination: 'dust', narrativeTone: 'neutral', dangerLevel: 3,
});

addCurated('dwarven-bandit-mansion', 'mansion', {
  siteScale: 'large', culturalInfluence: 'dwarven', currentController: 'bandits', occupancyState: 'occupied',
  biome: 'alpine', climate: 'alpine', season: 'deep-winter', weather: 'snow', ecology: 'scavenger',
  creatureFamilies: ['humanoid', 'sentry-animal'], hazardFamilies: ['cold', 'traps', 'structural'], creatureDensity: 7, hazardIntensity: 6,
  condition: 'patched', maintenance: 'jury-rigged', security: 'improvised', defenseDoctrine: 'chokepoints', magicTech: 'runic',
  wealth: 'plundered', traffic: 'night-active', socialMode: 'criminal', resourceProfile: 'contraband', secretDensity: 'high',
  lighting: 'hearths', waterState: 'icebound', verticality: 'split-level', contamination: 'smoke', narrativeTone: 'lawless', dangerLevel: 7,
});

addCurated('elven-outlaw-manor', 'manor', {
  siteScale: 'sprawling', culturalInfluence: 'elven', currentController: 'outlaws', occupancyState: 'repurposed',
  biome: 'temperate-forest', climate: 'temperate', season: 'harvest', weather: 'fog', ecology: 'overgrown',
  creatureFamilies: ['humanoid', 'fey', 'nonhostile-wildlife'], hazardFamilies: ['traps', 'unstable-magic'], creatureDensity: 6, hazardIntensity: 5,
  condition: 'weathered', maintenance: 'deferred', security: 'hidden', defenseDoctrine: 'hidden-defense', magicTech: 'druidic',
  wealth: 'affluent', traffic: 'light', socialMode: 'criminal', resourceProfile: 'luxury-goods', secretDensity: 'very-high',
  lighting: 'moonlight', waterState: 'damp', verticality: 'terraced', contamination: 'mold', narrativeTone: 'mysterious', dangerLevel: 6,
});

addCurated('ancient-desert-tomb', 'tomb', {
  siteScale: 'monumental', culturalInfluence: 'ancient-unknown', currentController: 'adventuring-company', occupancyState: 'reclaimed',
  biome: 'hot-desert', climate: 'arid', season: 'dry-season', weather: 'sandstorm', ecology: 'undead',
  creatureFamilies: ['undead', 'spirit', 'ambusher'], hazardFamilies: ['curse', 'traps', 'dust'], creatureDensity: 8, hazardIntensity: 9,
  condition: 'ruin', maintenance: 'abandoned', security: 'decayed', defenseDoctrine: 'traps', magicTech: 'ancient-tech',
  wealth: 'legendary', traffic: 'rare', socialMode: 'transient', resourceProfile: 'artifacts', secretDensity: 'labyrinthine',
  lighting: 'darkness', waterState: 'dry', verticality: 'deep', contamination: 'dust', narrativeTone: 'haunted', dangerLevel: 9,
  adventurePurpose: 'relic-recovery',
});

addCurated('criminal-urban-sewer', 'sewer', {
  siteScale: 'sprawling', culturalInfluence: 'human', currentController: 'criminal-syndicate', occupancyState: 'active',
  biome: 'urban', climate: 'maritime', season: 'storm-season', weather: 'heavy-rain', ecology: 'urban-vermin',
  creatureFamilies: ['humanoid', 'vermin', 'aquatic'], hazardFamilies: ['sewage', 'disease', 'flood'], creatureDensity: 8, hazardIntensity: 8,
  condition: 'worn', maintenance: 'poor', security: 'layered', defenseDoctrine: 'chokepoints', magicTech: 'none',
  wealth: 'modest', traffic: 'night-active', socialMode: 'criminal', resourceProfile: 'contraband', secretDensity: 'high',
  lighting: 'intermittent', waterState: 'flowing-channel', verticality: 'deep', contamination: 'sewage', narrativeTone: 'oppressive', dangerLevel: 8,
});

addCurated('dwarven-goblin-fortress', 'fortress', {
  siteScale: 'fortified-complex', culturalInfluence: 'dwarven', currentController: 'goblin-clan', occupancyState: 'occupied',
  biome: 'cavern', climate: 'geothermal', season: 'late-autumn', weather: 'fog', ecology: 'fungal',
  creatureFamilies: ['humanoid', 'fungus', 'cave-fauna'], hazardFamilies: ['spores', 'structural', 'traps'], creatureDensity: 9, hazardIntensity: 9,
  condition: 'damaged', maintenance: 'jury-rigged', security: 'improvised', defenseDoctrine: 'layered-defense', magicTech: 'runic',
  wealth: 'plundered', traffic: 'busy', socialMode: 'hostile-occupation', resourceProfile: 'weapons', secretDensity: 'very-high',
  lighting: 'fungal-glow', waterState: 'dripping', verticality: 'cavern-tiered', contamination: 'spores', narrativeTone: 'lawless', dangerLevel: 9,
  adventurePurpose: 'infiltration',
});

addCurated('occupied-human-school', 'school', {
  siteScale: 'large', culturalInfluence: 'human', currentController: 'military-garrison', occupancyState: 'occupied',
  biome: 'ruined-city', climate: 'continental', season: 'first-frost', weather: 'cold-snap', ecology: 'urban-vermin',
  creatureFamilies: ['humanoid', 'sentry-animal'], hazardFamilies: ['security', 'fire', 'sharp-debris'], creatureDensity: 6, hazardIntensity: 6,
  condition: 'patched', maintenance: 'routine', security: 'military', defenseDoctrine: 'patrols', magicTech: 'mixed-tech',
  wealth: 'modest', traffic: 'military-regulated', socialMode: 'military', resourceProfile: 'medical', secretDensity: 'low',
  lighting: 'emergency', waterState: 'dry', verticality: 'low-rise', contamination: 'smoke', narrativeTone: 'militarized', dangerLevel: 7,
});

addCurated('necromancer-arcane-university', 'arcane_university', {
  siteScale: 'campus', culturalInfluence: 'elven', currentController: 'necromancers', occupancyState: 'haunted',
  biome: 'arcane-wilds', climate: 'magically-temperate', season: 'late-autumn', weather: 'magical-storm', ecology: 'undead',
  creatureFamilies: ['undead', 'aberration', 'spirit'], hazardFamilies: ['necrotic', 'unstable-magic', 'curse'], creatureDensity: 9, hazardIntensity: 10,
  condition: 'damaged', maintenance: 'ritual-dependent', security: 'magical', defenseDoctrine: 'wards', magicTech: 'necromantic',
  wealth: 'legendary', traffic: 'rare', socialMode: 'scholarly', resourceProfile: 'magical-components', secretDensity: 'labyrinthine',
  lighting: 'magical', waterState: 'damp', verticality: 'multi-level', contamination: 'necrotic', narrativeTone: 'haunted', dangerLevel: 10,
  adventurePurpose: 'occult-investigation',
});

addCurated('syndicate-guildhall', 'guildhall', {
  siteScale: 'standard', culturalInfluence: 'mixed-cosmopolitan', currentController: 'criminal-syndicate', occupancyState: 'active',
  biome: 'urban', climate: 'temperate', season: 'late-summer', weather: 'drizzle', ecology: 'urban-vermin',
  creatureFamilies: ['humanoid', 'urban-pest'], hazardFamilies: ['traps', 'security'], creatureDensity: 5, hazardIntensity: 5,
  condition: 'maintained', maintenance: 'good', security: 'layered', defenseDoctrine: 'hidden-defense', magicTech: 'common-magic',
  wealth: 'wealthy', traffic: 'busy', socialMode: 'mercantile', resourceProfile: 'trade-goods', secretDensity: 'high',
  lighting: 'oil-lamps', waterState: 'dry', verticality: 'low-rise', contamination: 'none', narrativeTone: 'paranoid', dangerLevel: 6,
});

addCurated('dragonkin-cult-temple', 'temple', {
  siteScale: 'monumental', culturalInfluence: 'dragonkin', currentController: 'cult', occupancyState: 'occupied',
  biome: 'volcanic', climate: 'volcanic', season: 'storm-season', weather: 'ashfall', ecology: 'elemental',
  creatureFamilies: ['fiend', 'elemental', 'dragon'], hazardFamilies: ['lava', 'magical', 'ritual'], creatureDensity: 8, hazardIntensity: 10,
  condition: 'serviceable', maintenance: 'ritual-dependent', security: 'paranoid', defenseDoctrine: 'wards', magicTech: 'elemental',
  wealth: 'opulent', traffic: 'processional', socialMode: 'religious', resourceProfile: 'ritual-goods', secretDensity: 'high',
  lighting: 'braziers', waterState: 'geothermal', verticality: 'towered', contamination: 'ash', narrativeTone: 'sacred', dangerLevel: 10,
});

addCurated('coastal-refugee-warehouse', 'warehouse', {
  siteScale: 'large', culturalInfluence: 'culture-neutral', currentController: 'refugees', occupancyState: 'occupied',
  biome: 'coastal', climate: 'maritime', season: 'storm-season', weather: 'heavy-rain', ecology: 'wetland',
  creatureFamilies: ['humanoid', 'aquatic', 'plague-carrier'], hazardFamilies: ['flood', 'disease', 'structural'], creatureDensity: 5, hazardIntensity: 7,
  condition: 'worn', maintenance: 'deferred', security: 'low', defenseDoctrine: 'passive', magicTech: 'none',
  wealth: 'poor', traffic: 'crowded', socialMode: 'communal', resourceProfile: 'food', secretDensity: 'scarce',
  lighting: 'daylight', waterState: 'partially-flooded', verticality: 'low-rise', contamination: 'salt', narrativeTone: 'desperate', dangerLevel: 6,
});

addCurated('gnomish-salvage-laboratory', 'laboratory', {
  siteScale: 'large', culturalInfluence: 'gnomish', currentController: 'salvagers', occupancyState: 'partially-collapsed',
  biome: 'badlands', climate: 'semi-arid', season: 'dry-season', weather: 'dust-storm', ecology: 'construct',
  creatureFamilies: ['construct', 'scavenger', 'vermin'], hazardFamilies: ['mechanical', 'chemical', 'structural'], creatureDensity: 6, hazardIntensity: 9,
  condition: 'partial-collapse', maintenance: 'failing', security: 'decayed', defenseDoctrine: 'ruined-defense', magicTech: 'clockwork',
  wealth: 'resource-rich', traffic: 'light', socialMode: 'industrial', resourceProfile: 'industrial-parts', secretDensity: 'moderate',
  lighting: 'intermittent', waterState: 'dry', verticality: 'split-level', contamination: 'chemical', narrativeTone: 'industrial', dangerLevel: 9,
});

addCurated('halfling-quarantine-bunkhouse', 'bunkhouse_compound', {
  siteScale: 'campus', culturalInfluence: 'halfling', currentController: 'plague-survivors', occupancyState: 'quarantined',
  biome: 'grassland', climate: 'continental', season: 'early-autumn', weather: 'overcast', ecology: 'plague',
  creatureFamilies: ['humanoid', 'domestic', 'plague-carrier'], hazardFamilies: ['disease', 'biological', 'contamination'], creatureDensity: 7, hazardIntensity: 8,
  condition: 'patched', maintenance: 'jury-rigged', security: 'controlled', defenseDoctrine: 'chokepoints', magicTech: 'low-magic',
  wealth: 'poor', traffic: 'crowded', socialMode: 'quarantine', resourceProfile: 'medical', secretDensity: 'low',
  lighting: 'hearths', waterState: 'rain-capture', verticality: 'flat', contamination: 'disease', narrativeTone: 'desperate', dangerLevel: 8,
});

addCurated('escaped-prisoner-prison', 'prison', {
  siteScale: 'large', culturalInfluence: 'human', currentController: 'escaped-prisoners', occupancyState: 'repurposed',
  biome: 'urban', climate: 'continental', season: 'late-autumn', weather: 'steady-rain', ecology: 'urban-vermin',
  creatureFamilies: ['humanoid', 'urban-pest'], hazardFamilies: ['security', 'fire', 'traps'], creatureDensity: 8, hazardIntensity: 8,
  condition: 'damaged', maintenance: 'poor', security: 'improvised', defenseDoctrine: 'chokepoints', magicTech: 'none',
  wealth: 'impoverished', traffic: 'busy', socialMode: 'hostile-occupation', resourceProfile: 'weapons', secretDensity: 'high',
  lighting: 'emergency', waterState: 'damp', verticality: 'multi-level', contamination: 'smoke', narrativeTone: 'tense', dangerLevel: 9,
});

addCurated('urban-plague-hospital', 'hospital', {
  siteScale: 'large', culturalInfluence: 'human', currentController: 'plague-survivors', occupancyState: 'quarantined',
  biome: 'ruined-city', climate: 'temperate', season: 'late-spring', weather: 'drizzle', ecology: 'plague',
  creatureFamilies: ['humanoid', 'plague-carrier', 'vermin'], hazardFamilies: ['disease', 'biological', 'toxic'], creatureDensity: 7, hazardIntensity: 9,
  condition: 'worn', maintenance: 'failing', security: 'controlled', defenseDoctrine: 'chokepoints', magicTech: 'alchemical',
  wealth: 'modest', traffic: 'crowded', socialMode: 'quarantine', resourceProfile: 'medical', secretDensity: 'moderate',
  lighting: 'emergency', waterState: 'dry', verticality: 'low-rise', contamination: 'disease', narrativeTone: 'tragic', dangerLevel: 9,
});

addCurated('orcish-mine-dwarven-hold', 'mine', {
  siteScale: 'subterranean-complex', culturalInfluence: 'orcish', currentController: 'dwarven-hold', occupancyState: 'occupied',
  biome: 'underdark', climate: 'geothermal', season: 'deep-winter', weather: 'fog', ecology: 'subterranean',
  creatureFamilies: ['cave-fauna', 'deep-dweller', 'humanoid'], hazardFamilies: ['cave-in', 'gas', 'darkness'], creatureDensity: 8, hazardIntensity: 9,
  condition: 'worn', maintenance: 'routine', security: 'hardened', defenseDoctrine: 'chokepoints', magicTech: 'runic',
  wealth: 'resource-rich', traffic: 'shift-work', socialMode: 'industrial', resourceProfile: 'ore', secretDensity: 'high',
  lighting: 'crystal-glow', waterState: 'dripping', verticality: 'shafted', contamination: 'dust', narrativeTone: 'austere', dangerLevel: 8,
});

addCurated('flooded-gnomish-industrial', 'industrial_facility', {
  siteScale: 'megastructure', culturalInfluence: 'gnomish', currentController: 'occupation-force', occupancyState: 'partially-flooded',
  biome: 'riverine', climate: 'humid-subtropical', season: 'wet-season', weather: 'monsoon-rain', ecology: 'invasive',
  creatureFamilies: ['construct', 'vermin', 'aquatic'], hazardFamilies: ['industrial', 'flood', 'electrical'], creatureDensity: 7, hazardIntensity: 10,
  condition: 'heavily-damaged', maintenance: 'failing', security: 'military', defenseDoctrine: 'layered-defense', magicTech: 'arcane-industrial',
  wealth: 'resource-rich', traffic: 'military-regulated', socialMode: 'hostile-occupation', resourceProfile: 'industrial-parts', secretDensity: 'moderate',
  lighting: 'electric', waterState: 'flooded', verticality: 'multi-level', contamination: 'industrial-waste', narrativeTone: 'oppressive', dangerLevel: 10,
});

addCurated('goblinoid-outlaw-hideout', 'hideout', {
  siteScale: 'small', culturalInfluence: 'goblinoid', currentController: 'outlaws', occupancyState: 'active',
  biome: 'boreal-forest', climate: 'subarctic', season: 'deep-winter', weather: 'heavy-snow', ecology: 'woodland',
  creatureFamilies: ['humanoid', 'sentry-animal', 'scavenger'], hazardFamilies: ['traps', 'cold', 'smoke'], creatureDensity: 7, hazardIntensity: 7,
  condition: 'patched', maintenance: 'jury-rigged', security: 'hidden', defenseDoctrine: 'hidden-defense', magicTech: 'low-magic',
  wealth: 'poor', traffic: 'night-active', socialMode: 'criminal', resourceProfile: 'contraband', secretDensity: 'very-high',
  lighting: 'hearths', waterState: 'icebound', verticality: 'split-level', contamination: 'smoke', narrativeTone: 'lawless', dangerLevel: 8,
});

addCurated('rebel-civic-building', 'civic_building', {
  siteScale: 'large', culturalInfluence: 'mixed-cosmopolitan', currentController: 'rebels', occupancyState: 'occupied',
  biome: 'ruined-city', climate: 'continental', season: 'late-autumn', weather: 'smoke-haze', ecology: 'urban-vermin',
  creatureFamilies: ['humanoid', 'urban-pest'], hazardFamilies: ['security', 'fire', 'structural'], creatureDensity: 8, hazardIntensity: 7,
  condition: 'damaged', maintenance: 'poor', security: 'improvised', defenseDoctrine: 'mobile-defense', magicTech: 'mixed-tech',
  wealth: 'modest', traffic: 'busy', socialMode: 'communal', resourceProfile: 'weapons', secretDensity: 'high',
  lighting: 'emergency', waterState: 'dry', verticality: 'low-rise', contamination: 'smoke', narrativeTone: 'hopeful', dangerLevel: 8,
});

const STRESS_ARCHETYPES = ['fortress', 'mansion', 'tomb', 'sewer', 'arcane_university', 'warehouse', 'laboratory', 'prison', 'hospital', 'mine', 'industrial_facility', 'hideout', 'civic_building'];
const STRESS = STRESS_ARCHETYPES.map((locationArchetype, index) => ({
  id: `seeded-random-${String(index + 1).padStart(2, '0')}-${slug(locationArchetype)}`,
  kind: 'seeded-random',
  input: {
    seed: `archive-${BATCH_ID}-seeded-random-${String(index + 1).padStart(2, '0')}`,
    locationArchetype,
    rulesTarget: RULES[(CURATED.length + index) % RULES.length],
    dangerLevel: 2 + (index * 3) % 9,
    creatureDensity: (index * 7 + 3) % 11,
    hazardIntensity: (index * 5 + 4) % 11,
    treasureDensity: (index * 3 + 2) % 11,
    socialDensity: (index * 9 + 1) % 11,
    sitePreferences: {
      originCulture: { preferred: index % 3 === 0 ? ['dwarven', 'elven', 'human', 'culture-neutral'] : ['mixed-cosmopolitan', 'gnomish', 'orcish', 'ancient-unknown'] },
      controller: { preferred: index % 2 === 0 ? ['bandits', 'refugees', 'military-garrison', 'goblin-clan'] : ['cult', 'criminal-syndicate', 'adventuring-company', 'plague-survivors'] },
      ecology: { preferred: ['fungal', 'overgrown', 'urban-vermin', 'subterranean', 'magical', 'wetland'] },
      creatureFamilies: { exclude: index % 2 === 0 ? ['dragon'] : ['celestial'] },
      hazardFamilies: { exclude: index % 2 === 0 ? ['lava'] : ['vacuum'] },
    },
  },
}));

const CASES = [...CURATED, ...STRESS];
if (CASES.length !== 32) throw new Error(`Expected 32 cases, found ${CASES.length}`);

function compactGenerated(generated) {
  return {
    schemaVersion: generated.schemaVersion,
    generator: generated.generator,
    seed: generated.seed,
    width: generated.width,
    height: generated.height,
    deckCount: generated.deckCount,
    locationArchetype: generated.locationArchetype,
    semanticProgram: generated.semanticProgram,
    siteProfile: generated.siteProfile,
    spatialLayout: generated.spatialLayout,
    content: generated.content,
    compatibility: generated.compatibility,
    provenance: generated.provenance,
  };
}

function metrics(result) {
  const layout = result.spatialLayout || {};
  const contentRooms = result.content?.rooms || [];
  const profileRoles = result.siteProfile?.roles || [];
  return {
    rooms: (layout.rooms || []).length,
    corridors: (layout.corridors || []).length,
    doors: (layout.doors || []).length,
    connectors: (layout.connectors || []).length,
    decks: layout.deckCount || result.deckCount || 1,
    interactions: (result.siteProfile?.interactions || []).length,
    profileLayers: (result.siteProfile?.layers || []).length,
    historicallyAdaptedRoleTemplates: profileRoles.filter(r => r.metadata?.adaptations?.length).length,
    currentUseRoleTemplates: profileRoles.filter(r => r.metadata?.currentUse).length,
    currentUseOverlayRoleTemplates: profileRoles.filter(r => r.metadata?.currentUseOverlays?.length).length,
    occupants: count(contentRooms, room => room.occupants?.length),
    socialEncounters: count(contentRooms, room => room.socialEncounters?.length),
    traps: count(contentRooms, room => room.traps?.length),
    hazards: count(contentRooms, room => room.hazards?.length),
    securityEntries: count(contentRooms, room => room.security?.length),
    treasureEntries: count(contentRooms, room => room.treasure?.length),
    evidenceEntries: count(contentRooms, room => room.evidence?.length),
    objectives: count(contentRooms, room => room.objectives?.length),
    narrativeDiscoveries: count(contentRooms, room => room.narrativeDiscoveries?.length),
    secretAccessEntries: count(contentRooms, room => room.secretAccess?.length),
  };
}

function safeValidation(result) {
  const validation = result.spatialLayout?.validation || {};
  return {
    ok: validation.ok === true,
    errors: clone(validation.errors || []),
    warnings: clone(validation.warnings || []),
  };
}

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(CASES_DIR, { recursive: true });

const manifestCases = [];
const failures = [];
const generatedResults = [];

for (let index = 0; index < CASES.length; index += 1) {
  const testCase = CASES[index];
  const caseNumber = String(index + 1).padStart(3, '0');
  const filename = `${caseNumber}-${slug(testCase.id)}.json`;
  const casePath = path.join(CASES_DIR, filename);
  let artifact;
  try {
    const first = compactGenerated(moduleMap.generate(clone(testCase.input)));
    const second = compactGenerated(moduleMap.generate(clone(testCase.input)));
    const firstSerialized = JSON.stringify(first);
    const secondSerialized = JSON.stringify(second);
    const deterministic = firstSerialized === secondSerialized;
    const validation = safeValidation(first);
    const caseMetrics = metrics(first);
    const ok = deterministic && validation.ok;

    artifact = {
      schemaVersion: '1.0.0',
      recordType: 'spatial-site-generation-test-artifact',
      batchId: BATCH_ID,
      sourceCommit,
      caseNumber: index + 1,
      caseId: testCase.id,
      caseKind: testCase.kind,
      input: clone(testCase.input),
      acceptance: { ok, deterministic, topologyValid: validation.ok },
      validation,
      metrics: caseMetrics,
      result: first,
    };
    generatedResults.push({ testCase, artifact });
    if (!ok) failures.push({ caseId: testCase.id, deterministic, validation });
  } catch (error) {
    artifact = {
      schemaVersion: '1.0.0',
      recordType: 'spatial-site-generation-test-artifact',
      batchId: BATCH_ID,
      sourceCommit,
      caseNumber: index + 1,
      caseId: testCase.id,
      caseKind: testCase.kind,
      input: clone(testCase.input),
      acceptance: { ok: false, deterministic: false, topologyValid: false },
      error: { name: error?.name || 'Error', message: error?.message || String(error), stack: error?.stack || null },
    };
    failures.push({ caseId: testCase.id, error: artifact.error });
  }

  const pretty = `${JSON.stringify(artifact, null, 2)}\n`;
  fs.writeFileSync(casePath, pretty);
  manifestCases.push({
    caseNumber: index + 1,
    caseId: testCase.id,
    caseKind: testCase.kind,
    file: `cases/${filename}`,
    sha256: sha256(pretty),
    bytes: Buffer.byteLength(pretty),
    ok: artifact.acceptance.ok,
    deterministic: artifact.acceptance.deterministic,
    topologyValid: artifact.acceptance.topologyValid,
    archetype: testCase.input.locationArchetype,
    rulesTarget: testCase.input.rulesTarget,
    culture: artifact.result?.siteProfile?.axes?.originCulture || null,
    controller: artifact.result?.siteProfile?.axes?.controller || null,
    occupancyState: artifact.result?.siteProfile?.axes?.occupancyState || null,
    biome: artifact.result?.siteProfile?.axes?.biome || null,
    ecology: artifact.result?.siteProfile?.axes?.ecology || null,
    rooms: artifact.metrics?.rooms || 0,
    decks: artifact.metrics?.decks || 0,
    interactions: artifact.metrics?.interactions || 0,
  });
}

const allArtifacts = generatedResults.map(item => item.artifact);
const catalog = moduleMap.siteOptionCatalog();
const curatedArchetypes = uniq(CURATED.map(item => item.input.locationArchetype));
const availableArchetypes = uniq(Object.keys(moduleMap.SITE_ARCHETYPES || {}));
const acceptance = {
  ok: failures.length === 0 && manifestCases.length === 32 && curatedArchetypes.length === availableArchetypes.length,
  totalCases: manifestCases.length,
  passedCases: manifestCases.filter(item => item.ok).length,
  failedCases: failures.length,
  deterministicCases: manifestCases.filter(item => item.deterministic).length,
  topologyValidCases: manifestCases.filter(item => item.topologyValid).length,
  curatedCases: CURATED.length,
  seededRandomCases: STRESS.length,
  curatedArchetypeCoverage: curatedArchetypes.length,
  availableArchetypes: availableArchetypes.length,
};

const summary = {
  schemaVersion: '1.0.0',
  recordType: 'spatial-site-generation-batch-summary',
  batchId: BATCH_ID,
  sourceCommit,
  runner: 'scripts/archive_spatial_site_batch.mjs',
  acceptance,
  catalog: { axisCount: catalog.axisCount, optionCount: catalog.optionCount, version: catalog.version },
  coverage: {
    archetypes: uniq(manifestCases.map(item => item.archetype)),
    rulesTargets: uniq(manifestCases.map(item => item.rulesTarget)),
    cultures: uniq(manifestCases.map(item => item.culture)),
    controllers: uniq(manifestCases.map(item => item.controller)),
    occupancyStates: uniq(manifestCases.map(item => item.occupancyState)),
    biomes: uniq(manifestCases.map(item => item.biome)),
    ecologies: uniq(manifestCases.map(item => item.ecology)),
  },
  aggregate: {
    totalRooms: allArtifacts.reduce((n, a) => n + (a.metrics?.rooms || 0), 0),
    totalCorridors: allArtifacts.reduce((n, a) => n + (a.metrics?.corridors || 0), 0),
    totalDoors: allArtifacts.reduce((n, a) => n + (a.metrics?.doors || 0), 0),
    totalConnectors: allArtifacts.reduce((n, a) => n + (a.metrics?.connectors || 0), 0),
    totalInteractions: allArtifacts.reduce((n, a) => n + (a.metrics?.interactions || 0), 0),
    totalHazards: allArtifacts.reduce((n, a) => n + (a.metrics?.hazards || 0), 0),
    totalOccupants: allArtifacts.reduce((n, a) => n + (a.metrics?.occupants || 0), 0),
    totalNarrativeDiscoveries: allArtifacts.reduce((n, a) => n + (a.metrics?.narrativeDiscoveries || 0), 0),
    totalArtifactBytes: manifestCases.reduce((n, item) => n + item.bytes, 0),
  },
  failures,
};

const manifest = {
  schemaVersion: '1.0.0',
  recordType: 'spatial-site-generation-batch-manifest',
  batchId: BATCH_ID,
  sourceCommit,
  caseCount: manifestCases.length,
  cases: manifestCases,
};

fs.writeFileSync(path.join(OUT, 'summary.json'), `${JSON.stringify(summary, null, 2)}\n`);
fs.writeFileSync(path.join(OUT, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
fs.writeFileSync(path.join(OUT, 'inputs.json'), `${JSON.stringify(CASES, null, 2)}\n`);
fs.writeFileSync(path.join(OUT, 'failures.json'), `${JSON.stringify(failures, null, 2)}\n`);

const rows = manifestCases.map(item => `| ${String(item.caseNumber).padStart(2, '0')} | ${item.caseId} | ${item.archetype} | ${item.culture || '—'} | ${item.controller || '—'} | ${item.ecology || '—'} | ${item.rulesTarget} | ${item.rooms} | ${item.interactions} | ${item.ok ? 'PASS' : 'FAIL'} |`);
const readme = `# Spatial Site Generation Batch Archive\n\nBatch: **${BATCH_ID}**  \nSource commit tested: **${sourceCommit}**  \nCases: **${acceptance.totalCases}** (${acceptance.curatedCases} curated + ${acceptance.seededRandomCases} seeded-random)  \nAcceptance: **${acceptance.ok ? 'PASS' : 'FAIL'}**\n\nThis archive preserves purpose-aware site generation results without the redundant rendered \`cells\` grid. Every case retains its input, resolved layered site profile, historical interactions, semantic program, spatial topology, populated content, compatibility/provenance, validation result, metrics, and deterministic re-generation check. The workflow also runs the normal spatial regression suites before creating this archive.\n\n## Coverage\n\n- Archetypes: ${summary.coverage.archetypes.length}/${availableArchetypes.length}\n- Rules targets: ${summary.coverage.rulesTargets.join(', ')}\n- Cultures observed: ${summary.coverage.cultures.length}\n- Controllers observed: ${summary.coverage.controllers.length}\n- Biomes observed: ${summary.coverage.biomes.length}\n- Ecologies observed: ${summary.coverage.ecologies.length}\n- Catalog breadth at test time: ${catalog.axisCount} axes / ${catalog.optionCount} selectable values\n\n## Aggregate output\n\n- Rooms: ${summary.aggregate.totalRooms}\n- Corridors: ${summary.aggregate.totalCorridors}\n- Doors: ${summary.aggregate.totalDoors}\n- Inter-deck connectors: ${summary.aggregate.totalConnectors}\n- Historical interactions: ${summary.aggregate.totalInteractions}\n- Populated hazard entries: ${summary.aggregate.totalHazards}\n- Populated occupant entries: ${summary.aggregate.totalOccupants}\n- Narrative discoveries: ${summary.aggregate.totalNarrativeDiscoveries}\n- Per-case JSON bytes: ${summary.aggregate.totalArtifactBytes}\n\n## Case results\n\n| # | Case | Archetype | Builder culture | Current controller | Ecology | Rules | Rooms | Interactions | Status |\n|---:|---|---|---|---|---|---|---:|---:|---|\n${rows.join('\n')}\n\n## Files\n\n- \`summary.json\` — aggregate acceptance and coverage.\n- \`manifest.json\` — per-artifact paths, SHA-256 hashes, sizes, and headline dimensions.\n- \`inputs.json\` — exact 32 input specifications.\n- \`failures.json\` — empty on a clean batch; otherwise preserves errors/validation failures.\n- \`cases/*.json\` — the 32 archived generator artifacts.\n`;
fs.writeFileSync(path.join(OUT, 'README.md'), readme);

console.log(JSON.stringify(summary, null, 2));
if (!acceptance.ok) console.error(`Spatial batch completed with ${failures.length} failure(s); artifacts were still archived for diagnosis.`);
