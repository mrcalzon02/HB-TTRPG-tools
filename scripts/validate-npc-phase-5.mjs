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

const files = {
  loader: 'character-sheet-title.js',
  entry: 'npc-profile-generator-entry.js',
  renderer: 'npc-profile-generator-renderer.js',
  ui: 'npc-profile-generator-ui.js',
  style: 'npc-profile-generator.css',
  fixture: 'data/npc-generator/fixtures/phase-5-browser-fixtures.json',
  ledger: 'data/npc-generator/phase-status.json'
};

for (const file of Object.values(files)) {
  if (!fs.existsSync(rel(file))) fail(`Required Phase 5 file is missing: ${file}.`);
}

const fixture = json(files.fixture);
const ledger = json(files.ledger);
const loaderSource = read(files.loader);
const entrySource = read(files.entry);
const rendererSource = read(files.renderer);
const uiSource = read(files.ui);
const styleSource = read(files.style);

if (!loaderSource.includes("loadScriptOnce('npc-profile-generator-entry.js'")) fail('Supplemental generator loader does not register the NPC entrypoint.');
if (!entrySource.includes(`const WORKSPACE_ID = '${fixture.workspaceId}'`)) fail('Entrypoint workspace ID does not match the fixture.');
if (!entrySource.includes(`const CARD_ID = '${fixture.cardId}'`)) fail('Entrypoint card ID does not match the fixture.');

let lastScriptPosition = -1;
for (const script of fixture.requiredRuntimeScripts || []) {
  const position = entrySource.indexOf(`'${script}'`);
  if (position < 0) fail(`Entrypoint does not load ${script}.`);
  if (position <= lastScriptPosition) fail(`Runtime script order is invalid at ${script}.`);
  lastScriptPosition = position;
}

for (const id of fixture.requiredControlIds || []) {
  if (!uiSource.includes(`id=\"${id}\"`) && !uiSource.includes(`'${id}'`)) fail(`Interface control ${id} is missing.`);
}
for (const url of fixture.requiredDataUrls || []) {
  if (!uiSource.includes(url)) fail(`Interface data URL ${url} is missing.`);
}

const requiredInterfaceFragments = [
  'aria-live="polite"',
  'aria-label="NPC generator controls"',
  'Reroll section',
  'aria-pressed',
  "pointer === '/identity' ? pointer : `${pointer}/data`",
  'Export JSON',
  'Print profile',
  'localStorage.setItem',
  "this.populateControls();\n      this.restorePreferences();"
];
for (const fragment of requiredInterfaceFragments) {
  if (!`${entrySource}\n${rendererSource}\n${uiSource}`.includes(fragment)) fail(`Required interface contract fragment is missing: ${fragment}.`);
}
if (!styleSource.includes('@media (max-width: 980px)') || !styleSource.includes('@media print')) fail('Responsive and print styles are incomplete.');
if (!styleSource.includes('.npc-profile-grid') || !styleSource.includes('.npc-generator-layout')) fail('Core workspace layout styles are missing.');
for (const source of [entrySource, rendererSource, uiSource]) {
  if (/\beval\s*\(/.test(source) || /new\s+Function\s*\(/.test(source)) fail('Dynamic code execution is prohibited in the NPC interface.');
}

const runtimeFiles = [
  'npc-profile-generator-random.js',
  'npc-profile-generator-rules-core.js',
  'npc-profile-generator-rules-validation.js',
  'npc-generator-foundation.js',
  'npc-generator-compose.js',
  'npc-profile-generator-core.js',
  'npc-profile-generator-ui.js'
];
for (const file of runtimeFiles) vm.runInThisContext(read(file), { filename: file });

const data = {
  manifest: json('data/npc-generator/packs/generic-fantasy-core.json'),
  policies: json('data/npc-generator/archetypes/wave-a-policies.json'),
  names: json('data/npc-generator/names/core-fantasy-names.json'),
  ancestries: json('data/npc-generator/ancestries/core-fantasy.json'),
  coreTables: json('data/npc-generator/tables/core-profile-tables.json'),
  operationalTables: json('data/npc-generator/tables/wave-a-operational-tables.json')
};
const pack = globalThis.NpcProfileGeneratorUI?.mergePackData(data);
if (!pack || pack.packId !== 'generic-fantasy-core') fail('Interface pack assembly failed.');
if (Object.keys(pack?.tables || {}).length < 100) fail(`Interface pack assembly loaded only ${Object.keys(pack?.tables || {}).length} tables.`);

for (const archetypeId of data.policies.firstReleaseIds || []) {
  const resolved = globalThis.NpcProfileRules.resolveArchetype(archetypeId, data.policies.archetypes);
  if (!resolved.valid) {
    fail(`${archetypeId}: interface archetype resolution failed.`);
    continue;
  }
  const result = globalThis.NpcProfileGeneratorCore.generateProfile({
    seed: `phase5:${archetypeId}`,
    archetype: resolved.archetype,
    pack,
    mode: 'standard',
    timestamp: '2026-06-25T12:00:00.000Z'
  });
  if (!result.valid || !result.profile) fail(`${archetypeId}: interface generation contract failed with ${result.diagnostics.map(item => item.code).join(', ')}.`);
}

if (fixture.browserSmoke?.status !== 'passed' || (fixture.browserSmoke.checks || []).length < 8) fail('Browser smoke evidence is incomplete.');
if (ledger.activeBranch !== 'main') fail('Phase ledger must retain main as the only active branch.');
if (ledger.activePhaseId !== 'phase-5-standalone-interface') fail('Phase 5 must be active while this validator is executed.');
if (ledger.lastCompletedPhaseId !== 'phase-4-minimum-generic-fantasy-pack') fail('Phase 4 must be the last completed phase while Phase 5 is active.');

if (failures.length) {
  console.error('NPC Phase 5 validation failed:');
  failures.forEach(message => console.error(`- ${message}`));
  process.exit(1);
}

console.log('NPC Phase 5 validation passed.');
console.log(`Controls verified: ${fixture.requiredControlIds.length}`);
console.log(`Runtime scripts verified: ${fixture.requiredRuntimeScripts.length}`);
console.log(`Data URLs verified: ${fixture.requiredDataUrls.length}`);
console.log(`Archetype generation contracts: ${data.policies.firstReleaseIds.length}`);
console.log(`Browser smoke checks recorded: ${fixture.browserSmoke.checks.length}`);
