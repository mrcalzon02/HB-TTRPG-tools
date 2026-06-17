import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const read = relativePath => fs.readFile(path.join(root, relativePath), 'utf8');
const fail = message => { throw new Error(message); };

const html = await read('index.html');
const boundary = await read('kaysender-editor-error-boundary.js');
const smoke = await read('kaysender-editor-live-smoke.js');

for (const marker of [
  'id="character-sheet"',
  'id="module-viewer-root"',
  'id="kaysender-status"',
  'id="kaysender-overview-grid"',
  'data-view="kaysender"',
  'data-view="solanum-umbra"',
  '<script src="solanum-umbra-entry.js"></script>'
]) {
  if (!html.includes(marker)) fail(`Main page lost required application anchor '${marker}'.`);
}

const orderedScripts = [
  'kaysender-editor-kernel.js',
  'kaysender-editors.js',
  'kaysender-settlement-editor.js',
  'kaysender-airship-editor.js',
  'kaysender-editor-production.js',
  'kaysender-editor-error-boundary.js',
  'kaysender-editor-live-smoke.js'
];
let previousPosition = -1;
for (const script of orderedScripts) {
  const position = html.indexOf(`<script src="${script}"></script>`);
  if (position < 0) fail(`Main page does not load '${script}'.`);
  if (position <= previousPosition) fail(`Editor runtime script '${script}' is loaded out of order.`);
  previousPosition = position;
}

for (const phrase of [
  "window.addEventListener('error'",
  "window.addEventListener('unhandledrejection'",
  'mainline-editor-diagnostics',
  'uncaught-editor-error',
  'unhandled-editor-rejection',
  'reportKaysenderEditorError'
]) {
  if (!boundary.includes(phrase)) fail(`Shared editor error boundary is missing '${phrase}'.`);
}

for (const phrase of [
  'Run P0 Live Smoke Test',
  'launchIsland',
  'launchSettlement',
  'launchAirship',
  'sourceIslandEnvelope',
  'sourceSettlementEnvelope',
  'hb-ttrpg-tools:p0-live-smoke:last-pass'
]) {
  if (!smoke.includes(phrase)) fail(`P0 browser verification harness is missing '${phrase}'.`);
}

console.log('Shared editor runtime structure validation passed.');
console.log('Verified application anchors, editor script order, visible error boundary, and browser verification chain.');
