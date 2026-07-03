import fs from 'node:fs';
import vm from 'node:vm';

const read = path => fs.readFileSync(path, 'utf8');
const source = JSON.parse(read('data/blacklight-continuum/wiki/veteran-reintroduction.json'));
const optionSource = read('blacklight-veteran-reorientation-options.js');
const context = { globalThis: {} };
vm.createContext(context);
vm.runInContext(optionSource, context, { filename: 'blacklight-veteran-reorientation-options.js' });
const enhancements = context.globalThis.BLACKLIGHT_VETERAN_REORIENTATION_ENHANCEMENTS;

if (!enhancements || typeof enhancements !== 'object') throw new Error('Enhancement library did not register.');
if (enhancements.schemaVersion !== '2.0.0') throw new Error('Expected enhancement schema 2.0.0.');

const entries = source.entries || [];
if (entries.length !== 24) throw new Error(`Expected 24 veteran stages, found ${entries.length}.`);
const promptOverrides = enhancements.promptOverrides || {};
const stageExpansions = enhancements.stageExpansions || {};
const preserved = new Set(enhancements.preservedTextPromptIds || []);
const expectedPreserved = new Set(['charlesSavedMe', 'charlesNeverAnswered']);
if (preserved.size !== 2 || [...expectedPreserved].some(id => !preserved.has(id))) throw new Error('Only the two Charles sheet-transfer prompts may remain text.');

const sourcePrompts = entries.flatMap(entry => (entry.prompts || []).map(prompt => ({ entry, prompt })));
const sourceTextPrompts = sourcePrompts.filter(({ prompt }) => ['text', 'textarea'].includes(prompt.type));
const replaceableTextPrompts = sourceTextPrompts.filter(({ prompt }) => !preserved.has(prompt.id));
if (replaceableTextPrompts.length !== 35) throw new Error(`Expected 35 replaced freeform prompts, found ${replaceableTextPrompts.length}.`);
if (Object.keys(promptOverrides).length !== 35) throw new Error(`Expected 35 prompt overrides, found ${Object.keys(promptOverrides).length}.`);

for (const { entry, prompt } of sourcePrompts) {
  const override = promptOverrides[prompt.id];
  const merged = override ? { ...prompt, ...override } : prompt;
  if (['text', 'textarea'].includes(merged.type) && !preserved.has(merged.id)) {
    throw new Error(`${entry.id}/${merged.id} remains freeform without permission.`);
  }
  if (preserved.has(merged.id) && merged.type !== 'textarea') {
    throw new Error(`${merged.id} must remain a textarea for direct character-sheet transfer.`);
  }
  if (override) {
    if (!['radio', 'checkboxes'].includes(override.type)) throw new Error(`${prompt.id} override is not a bubble selection.`);
    if (!Array.isArray(override.options) || override.options.length < 8) throw new Error(`${prompt.id} needs at least eight broad options.`);
    const values = new Set();
    for (const option of override.options) {
      if (!option || typeof option !== 'object') throw new Error(`${prompt.id} contains a non-structured option.`);
      for (const key of ['value', 'label', 'detail', 'response']) {
        if (!String(option[key] || '').trim()) throw new Error(`${prompt.id} option is missing ${key}.`);
      }
      if (values.has(option.value)) throw new Error(`${prompt.id} contains duplicate option value ${option.value}.`);
      values.add(option.value);
    }
    if (!String(override.responseContext || '').trim()) throw new Error(`${prompt.id} is missing response context.`);
  }
}

for (const entry of entries) {
  const expansion = stageExpansions[entry.id];
  if (!expansion || !Array.isArray(expansion.sections) || expansion.sections.length !== 3) {
    throw new Error(`${entry.id} does not have three expanded guidance sections.`);
  }
  for (const section of expansion.sections) {
    if (!String(section.title || '').trim() || String(section.text || '').trim().length < 80) {
      throw new Error(`${entry.id} contains an incomplete expanded guidance section.`);
    }
  }
}

const html = read('blacklight-veteran-reintroduction.html');
const optionsIndex = html.indexOf('blacklight-veteran-reorientation-options.js');
const engineIndex = html.indexOf('blacklight-veteran-reintroduction.js');
if (optionsIndex < 0 || engineIndex < 0 || optionsIndex > engineIndex) throw new Error('Enhancement library must load before the veteran engine.');

const engine = read('blacklight-veteran-reintroduction.js');
for (const required of [
  'applyEnhancements', 'migrateLegacyAnswers', 'legacyAnswers', 'optionResponse',
  'renderOrientationExpansion', 'veteran-preserved-text', 'buildRecord',
  "schemaVersion: '2.0.0'", 'One current response per field'
]) {
  if (!engine.includes(required)) throw new Error(`Veteran engine is missing ${required}.`);
}

const css = read('blacklight-veteran-reintroduction.css');
for (const required of ['.veteran-orientation-expansion', '.veteran-choice-copy', '.veteran-legacy-answer', '.veteran-preserved-text']) {
  if (!css.includes(required)) throw new Error(`Veteran stylesheet is missing ${required}.`);
}

console.log(`Validated ${entries.length} expanded stages, ${replaceableTextPrompts.length} bubble replacements, ${Object.values(promptOverrides).reduce((sum, prompt) => sum + prompt.options.length, 0)} customized options, and ${preserved.size} preserved sheet-transfer text prompts.`);
