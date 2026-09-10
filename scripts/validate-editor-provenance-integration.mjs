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

if (!unresolvedImplementation.includes('Kernel.createEnvelope(')) {
  fail('Unresolved parent recovery is not visibly routed through the canonical Kernel.createEnvelope() authority.');
}

if (!production.includes('Kernel.validateEnvelope(placeholder')) {
  fail('Unresolved parent placeholder is not explicitly validated before being persisted into editor dataset state.');
}

console.log('Editor provenance integration validation passed.');
console.log('Verified kernel authority, repository metadata, visible provenance UI, canonical unresolved-parent construction, and placeholder validation.');
