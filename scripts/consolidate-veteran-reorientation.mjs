import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dataPath = path.join(root, 'data/blacklight-continuum/wiki/veteran-reintroduction.json');
const htmlPath = path.join(root, 'blacklight-veteran-reintroduction.html');
const rendererPath = path.join(root, 'blacklight-veteran-reintroduction.js');
const mutatorPaths = [
  'blacklight-veteran-reorientation-options.js',
  'blacklight-veteran-expanded-stage-bodies.js',
  'blacklight-veteran-charles-dialogue.js',
  'blacklight-veteran-eva-fiscal-speech.js'
].map(file => path.join(root, file));
const dataUrl = 'data/blacklight-continuum/wiki/veteran-reintroduction.json';

function read(file) {
  return fs.readFileSync(file, 'utf8');
}

function write(file, content) {
  fs.writeFileSync(file, content, 'utf8');
}

function evaluate(file) {
  vm.runInThisContext(read(file), { filename: file });
}

const baseData = JSON.parse(read(dataPath));
const originalFetch = globalThis.fetch;
globalThis.fetch = async resource => {
  const url = typeof resource === 'string' ? resource : String(resource?.url || '');
  if (!url.includes(dataUrl)) throw new Error(`Unexpected migration fetch: ${url}`);
  return new Response(JSON.stringify(baseData), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
};

for (const file of mutatorPaths) {
  if (!fs.existsSync(file)) throw new Error(`Required migration input is missing: ${path.basename(file)}`);
  evaluate(file);
}

const response = await globalThis.fetch(dataUrl, { cache: 'no-store' });
if (!response.ok) throw new Error(`Migration fetch failed with status ${response.status}.`);
const canonicalData = await response.json();

const enhancements = globalThis.BLACKLIGHT_VETERAN_REORIENTATION_ENHANCEMENTS;
if (!enhancements || typeof enhancements !== 'object') {
  throw new Error('Veteran reorientation enhancements were not loaded.');
}
canonicalData.interactionSchemaVersion = enhancements.schemaVersion || '2.0.0';
canonicalData.preservedTextPromptIds = Array.isArray(enhancements.preservedTextPromptIds)
  ? enhancements.preservedTextPromptIds
  : [];
const promptOverrides = enhancements.promptOverrides || {};
const stageExpansions = enhancements.stageExpansions || {};
for (const entry of canonicalData.entries || []) {
  if (stageExpansions[entry.id]) entry.orientationExpansion = stageExpansions[entry.id];
  for (const prompt of entry.prompts || []) {
    const override = promptOverrides[prompt.id];
    if (override) Object.assign(prompt, override);
  }
}

globalThis.fetch = originalFetch;
delete globalThis.BLACKLIGHT_VETERAN_REORIENTATION_ENHANCEMENTS;
delete globalThis.__BLACKLIGHT_VETERAN_BODY_PATCHED__;
delete globalThis.__BLACKLIGHT_VETERAN_CHARLES_DIALOGUE_PATCHED__;
delete globalThis.__BLACKLIGHT_EVA_FISCAL_PATCHED__;
delete globalThis.__BLACKLIGHT_CHARLES_SOURCE_DIALOGUE__;

if (!Array.isArray(canonicalData.entries) || canonicalData.entries.length !== 24) {
  throw new Error(`Expected 24 canonical stages; found ${canonicalData.entries?.length ?? 0}.`);
}
const first = canonicalData.entries[0];
if (first?.id !== 'returning-operative' || first.body?.length !== 9) {
  throw new Error('Reorientation One did not resolve to the required nine-paragraph canonical body.');
}
const requiredOpening = 'The room resembles the induction room used for new personnel, but the chair is already adjusted to you.';
const requiredClosing = 'The reorientation begins only when the returning operative answers back and forces the archive to carry a version of events Charles did not get to author alone.';
if (!first.body[0].startsWith(requiredOpening) || !first.body[8].endsWith(requiredClosing)) {
  throw new Error('Reorientation One does not match the final live-page wording.');
}
const company = canonicalData.entries.find(entry => entry.id === 'company-introduction');
if (!company?.body?.some(paragraph => paragraph.startsWith('Eva did not begin with myth, power, or victory.'))) {
  throw new Error('Eva Frost fiscal speech was not consolidated into the canonical company-introduction body.');
}

write(dataPath, `${JSON.stringify(canonicalData, null, 2)}\n`);

let html = read(htmlPath);
for (const file of mutatorPaths.map(file => path.basename(file))) {
  const scriptTag = new RegExp(`\\s*<script src=["']${file.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}["']><\\/script>`, 'g');
  html = html.replace(scriptTag, '');
}
write(htmlPath, html.replace(/\n{3,}/g, '\n\n'));

let renderer = read(rendererPath);
const enhancementFunction = /\n  function applyEnhancements\(source\) \{[\s\S]*?\n  \}\n\n  function migrateLegacyAnswers\(\) \{/;
if (!enhancementFunction.test(renderer)) {
  throw new Error('Could not locate applyEnhancements() in the renderer.');
}
renderer = renderer.replace(enhancementFunction, '\n  function migrateLegacyAnswers() {');
const enhancedLoad = 'state.source = applyEnhancements(await response.json());';
if (!renderer.includes(enhancedLoad)) {
  throw new Error('Could not locate the enhanced data load in the renderer.');
}
renderer = renderer.replace(enhancedLoad, 'state.source = await response.json();');
write(rendererPath, renderer);

for (const file of mutatorPaths) fs.unlinkSync(file);

const remainingHtml = read(htmlPath);
for (const file of mutatorPaths.map(file => path.basename(file))) {
  if (remainingHtml.includes(file)) throw new Error(`HTML still references removed mutator ${file}.`);
}
const remainingRenderer = read(rendererPath);
if (remainingRenderer.includes('applyEnhancements') || remainingRenderer.includes('BLACKLIGHT_VETERAN_REORIENTATION_ENHANCEMENTS')) {
  throw new Error('Renderer still contains enhancement-layer behavior.');
}

const residualMutators = [];
for (const dirent of fs.readdirSync(root, { withFileTypes: true })) {
  if (!dirent.isFile() || !dirent.name.endsWith('.js')) continue;
  const file = path.join(root, dirent.name);
  const source = read(file);
  if (source.includes(dataUrl) && dirent.name !== 'blacklight-veteran-reintroduction.js') {
    residualMutators.push(dirent.name);
  }
}
if (residualMutators.length) {
  throw new Error(`Residual veteran data mutators remain: ${residualMutators.join(', ')}`);
}

console.log(`Consolidated ${canonicalData.entries.length} stages into ${path.relative(root, dataPath)}.`);
console.log('Removed four runtime data-mutator scripts and simplified the renderer to direct JSON loading.');
