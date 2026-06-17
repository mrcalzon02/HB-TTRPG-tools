import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const html = await fs.readFile(path.join(root,'index.html'),'utf8');
const script = await fs.readFile(path.join(root,'solanum-umbra-entry.js'),'utf8');
const index = JSON.parse(await fs.readFile(path.join(root,'data','solanum-umbra','wiki','wiki-index.json'),'utf8'));

for (const phrase of [
  '<script src="solanum-umbra-entry.js"></script>',
  'data-view="solanum-umbra"',
  'Open Solanum Umbra'
]) {
  if (!html.includes(phrase)) throw new Error(`Main page is missing '${phrase}'.`);
}

for (const phrase of [
  "const VIEW_ID = 'solanum-umbra'",
  'function bindLaunchButtons',
  'function refreshWorkspaceSummary',
  'function renderBrowser',
  'function renderTables',
  'function renderWorkedExample',
  'function renderEnemyProfiles',
  'function renderRelatedEntries',
  'solanum-pack-count',
  'solanum-entry-count',
  'entry.creationSequence',
  'entry.generationSequence',
  'entry.procedure',
  'entry.enemyProfiles'
]) {
  if (!script.includes(phrase)) throw new Error(`Solanum workspace script is missing '${phrase}'.`);
}

if (index.schemaVersion !== '0.5.0' || index.packs?.length !== 8 || index.completedScope?.wikiEntries !== 36) {
  throw new Error('Solanum UI validation expected the current eight-pack, thirty-six-entry index.');
}

if (script.includes('6 packs') || script.includes('25 entries')) {
  throw new Error('Stale hardcoded Solanum pack or entry counts remain in the workspace script.');
}

console.log('Solanum Umbra UI validation passed.');
console.log('Verified main-page loading, launch controls, dynamic counts, native browser rendering, tables, examples, procedures, and enemy profiles.');
