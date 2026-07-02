import fs from 'node:fs';

const index = fs.readFileSync('index.html', 'utf8');
const appLite = fs.readFileSync('app-lite.js', 'utf8');
const mounts = fs.readFileSync('app-lite-view-mounts.js', 'utf8');
const loader = fs.readFileSync('character-sheet-title.js', 'utf8');
const sheetView = fs.readFileSync('character-sheet-view.js', 'utf8');

const scriptSources = [...index.matchAll(/<script\s+[^>]*src=["']([^"']+)["'][^>]*><\/script>/gi)].map(match => match[1]);
const expectedStartup = ['app-lite.js', 'app-lite-view-mounts.js', 'character-sheet-title.js', 'medicinal-potions-entry.js'];
if (JSON.stringify(scriptSources) !== JSON.stringify(expectedStartup)) {
  throw new Error(`Unexpected homepage startup scripts: ${scriptSources.join(', ')}.`);
}

for (const file of [
  'app.js',
  'module-viewer.js',
  'barotrauma-entry.js',
  'kaysender-editor-kernel.js',
  'world-of-darkness-entry.js',
  'world-of-darkness-spatial-loader.js',
  'world-of-darkness-lightweight-map-core.js',
  'world-of-darkness-spatial-engine-inventory.js',
  'shadowrun-entry.js',
  'shadowrun-sprawl-discovery-engine.js',
  'shadowrun-sprawl-discovery.js'
]) {
  if (index.includes(`src="${file}"`) || index.includes(`src='${file}'`)) {
    throw new Error(`${file} must not load directly from index.html.`);
  }
}

if (index.includes('id="character-sheet"')) throw new Error('Character sheet must remain lazy-mounted.');
if (!index.includes('id="character-sheet-mount"')) throw new Error('Character-sheet mount is missing.');
if (!appLite.includes("cache: 'force-cache'")) throw new Error('Static registry data must use browser caching.');
if (!mounts.includes("loadScript('character-sheet-view.js')")) throw new Error('Utilities do not lazy-load the character sheet.');
if (!sheetView.includes('hb:character-sheet-mounted')) throw new Error('Character-sheet mount event is missing.');
if (loader.includes('loadSupplementalGenerators()')) throw new Error('Retired eager supplemental loading returned.');
if (!loader.includes('internalSmoke')) throw new Error('Kaysender smoke loading is not gated.');

const wodBundle = loader.match(/'world-of-darkness':\s*\[([\s\S]*?)\]/)?.[1] || '';
const wodScripts = [...wodBundle.matchAll(/'([^']+\.js)'/g)].map(match => match[1]);
const expectedWod = ['world-of-darkness-entry.js', 'world-of-darkness-spatial-loader.js'];
if (JSON.stringify(wodScripts) !== JSON.stringify(expectedWod)) {
  throw new Error(`Unexpected World of Darkness tab scripts: ${wodScripts.join(', ')}.`);
}

const shadowrunBundle = loader.match(/shadowrun:\s*\[([\s\S]*?)\]/)?.[1] || '';
const shadowrunScripts = [...shadowrunBundle.matchAll(/'([^']+\.js)'/g)].map(match => match[1]);
const expectedShadowrun = ['shadowrun-entry.js'];
if (JSON.stringify(shadowrunScripts) !== JSON.stringify(expectedShadowrun)) {
  throw new Error(`Unexpected Shadowrun tab scripts: ${shadowrunScripts.join(', ')}.`);
}

console.log(JSON.stringify({
  startupScripts: scriptSources,
  worldOfDarknessTabScripts: wodScripts,
  shadowrunTabScripts: shadowrunScripts,
  characterSheetLazyMounted: true,
  eagerSupplementalLoader: false
}, null, 2));
