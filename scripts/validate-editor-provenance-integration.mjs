import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const readText = relativePath => fs.readFile(path.join(root, relativePath), 'utf8');
const fail = message => { throw new Error(message); };

const production = await readText('kaysender-editor-production.js');
const library = await readText('kaysender-editor-record-library.js');
const repository = await readText('kaysender-editor-repository.js');
const kernel = await readText('kaysender-editor-kernel.js');

function assertBrowserScriptSyntax(name, source) {
  try {
    // These runtime files are classic browser scripts, not ES modules. Compiling
    // their complete source catches truncation, brace/template-literal damage,
    // and other syntax regressions without executing application side effects.
    new Function(source);
  } catch (error) {
    fail(`${name} does not parse as a classic browser script: ${error.message}`);
  }
}

for (const [name, source] of [
  ['kaysender-editor-production.js', production],
  ['kaysender-editor-record-library.js', library],
  ['kaysender-editor-repository.js', repository],
  ['kaysender-editor-kernel.js', kernel]
]) {
  assertBrowserScriptSyntax(name, source);
}

for (const phrase of [
  'validateGenerationalProvenance',
  'normalizeGenerationalProvenance',
  'generation',
  'lineageComplete'
]) {
  if (!kernel.includes(phrase)) fail(`Shared editor kernel is missing generational provenance authority '${phrase}'.`);
}

for (const phrase of [
  'Generation',
  'Immediate Parent',
  'Lineage',
  'provenanceIdentity'
]) {
  if (!library.includes(phrase)) fail(`Saved Record Library is missing provenance usability marker '${phrase}'.`);
}

for (const phrase of [
  'generation',
  'lineageComplete',
  'rootProfileId',
  'parentProfileId'
]) {
  if (!repository.includes(phrase)) fail(`Saved record repository index is missing provenance metadata '${phrase}'.`);
}

const unresolvedStart = production.indexOf('function unresolvedParentEnvelope(reference)');
const unresolvedEnd = production.indexOf('\n  function preserveUnresolvedParent', unresolvedStart);
if (unresolvedStart < 0 || unresolvedEnd < 0) {
  fail('Could not locate the unresolved parent recovery implementation.');
}

const unresolvedImplementation = production.slice(unresolvedStart, unresolvedEnd);
const manuallyBuildsEnvelope = [
  'editorEnvelopeVersion:',
  'profileId:',
  'profileSchemaVersion:',
  'provenance:',
  'inheritance:',
  'locks:',
  'diagnostics:',
  'data:'
].every(marker => unresolvedImplementation.includes(marker));

if (manuallyBuildsEnvelope && !unresolvedImplementation.includes('Kernel.createEnvelope(')) {
  fail(
    'Unresolved inherited-parent recovery manually constructs a canonical envelope instead of using Kernel.createEnvelope(). ' +
    'This duplicates envelope authority and can drift from generational provenance requirements.'
  );
}

for (const phrase of [
  'Kernel.createEnvelope(',
  'profileId: reference.profileId',
  'profileType: reference.profileType',
  "origin: 'unresolved-inheritance-reference'",
  'placeholder.revision = reference.revision',
  'placeholder.createdAt = timestamp',
  'placeholder.updatedAt = timestamp'
]) {
  if (!unresolvedImplementation.includes(phrase)) {
    fail(`Unresolved parent construction is missing pinned canonical behavior '${phrase}'.`);
  }
}

const preserveStart = production.indexOf('function preserveUnresolvedParent(panel, definition, reference)');
const preserveEnd = production.indexOf('\n  function applyEnvelope', preserveStart);
if (preserveStart < 0 || preserveEnd < 0) {
  fail('Could not locate unresolved parent persistence behavior.');
}
const preserveImplementation = production.slice(preserveStart, preserveEnd);
const validatePosition = preserveImplementation.indexOf('Kernel.validateEnvelope(placeholder');
const persistPosition = preserveImplementation.indexOf('panel.dataset[definition.envelopeDatasetKey] = JSON.stringify(placeholder)');
if (validatePosition < 0) {
  fail('Unresolved parent placeholder is not explicitly validated before persistence.');
}
if (persistPosition < 0) {
  fail('Could not locate unresolved parent placeholder persistence.');
}
if (validatePosition > persistPosition) {
  fail('Unresolved parent placeholder is persisted before canonical validation runs.');
}
if (!preserveImplementation.includes("item.severity === 'error'")) {
  fail('Unresolved parent persistence does not test canonical validation for blocking errors.');
}
if (!preserveImplementation.includes('return false;') || !preserveImplementation.includes('return true;')) {
  fail('Unresolved parent persistence does not expose success/failure to its caller.');
}
if (!production.includes('const preserved = preserveUnresolvedParent(')) {
  fail('Production recovery does not observe unresolved parent preservation success/failure.');
}
if (!production.includes("'unresolved-parent-preservation-failed'")) {
  fail('Production recovery does not expose failed unresolved-parent preservation as an actionable diagnostic.');
}

const provenanceStart = production.indexOf('function refreshProvenance(adapter, panel)');
const provenanceEnd = production.indexOf('\n  function renderLifecycleState', provenanceStart);
if (provenanceStart < 0 || provenanceEnd < 0) {
  fail('Could not locate the active editor provenance presentation.');
}
const provenancePresentation = production.slice(provenanceStart, provenanceEnd);
for (const phrase of [
  'generation',
  'lineageComplete',
  'parent',
  'lineage'
]) {
  if (!provenancePresentation.includes(phrase)) {
    fail(
      `Active editor provenance presentation is missing '${phrase}'. ` +
      'The production shell must expose the same generation, root/parent, and lineage-health concepts as the Saved Record Library.'
    );
  }
}
if (!provenancePresentation.includes('revision')) {
  fail('Active editor provenance presentation must retain revision information alongside generation so the two concepts remain distinct.');
}

console.log('Editor provenance integration validation passed.');
console.log('Verified parseable browser scripts, kernel authority, repository metadata, visible library provenance, canonical unresolved-parent recovery, and matching active-editor generation/lineage visibility.');
