import fs from 'node:fs';

const index = fs.readFileSync('index.html', 'utf8');
const appLite = fs.readFileSync('app-lite.js', 'utf8');
const mounts = fs.readFileSync('app-lite-view-mounts.js', 'utf8');
const loader = fs.readFileSync('character-sheet-title.js', 'utf8');
const sheetView = fs.readFileSync('character-sheet-view.js', 'utf8');
const wodSpatialLoader = fs.readFileSync('world-of-darkness-spatial-loader.js', 'utf8');
const wodRadialLoader = fs.readFileSync('world-of-darkness-radial-location-loader.js', 'utf8');

const scriptSources = [...index.matchAll(/<script\s+[^>]*src=["']([^"']+)["'][^>]*><\/script>/gi)].map(match => match[1]);
const allowedStartupScripts = ['app-lite.js', 'app-lite-view-mounts.js', 'character-sheet-title.js'];
if (JSON.stringify(scriptSources) !== JSON.stringify(allowedStartupScripts)) {
  throw new Error(`Homepage startup scripts must be exactly ${allowedStartupScripts.join(', ')}; found ${scriptSources.join(', ')}.`);
}

const forbiddenStartupScripts = [
  'app.js',
  'module-viewer.js',
  'barotrauma-entry.js',
  'solanum-umbra-entry.js',
  'kaysender-wiki.js',
  'kaysender-editor-kernel.js',
  'kaysender-editor-live-smoke.js',
  'world-of-darkness-entry.js',
  'world-of-darkness-spatial-loader.js',
  'world-of-darkness-radial-location-loader.js',
  'world-of-darkness-spatial-engine-inventory.js',
  'shadowrun-entry.js'
];
for (const script of forbiddenStartupScripts) {
  const expression = new RegExp(`<script\\s+[^>]*src=["'][^"']*${script.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^"']*["']`, 'i');
  if (expression.test(index)) throw new Error(`${script} must not be loaded directly by index.html.`);
}

if (index.includes('id="character-sheet"')) throw new Error('The complete character sheet must not be present in the initial HTML.');
if (!index.includes('id="character-sheet-mount"')) throw new Error('The lazy character-sheet mount is missing.');
if (appLite.includes("fetch(KAYSENDER_REGISTRY_URL, { cache: 'no-store' })")) throw new Error('Static Kaysender registry data must use browser caching.');
if (!appLite.includes("cache: 'force-cache'")) throw new Error('The lazy Kaysender registry loader must use force-cache.');
if (!mounts.includes("loadScript('character-sheet-view.js')")) throw new Error('Utilities must lazy-load the character-sheet view.');
if (!sheetView.includes('hb:character-sheet-mounted')) throw new Error('The character-sheet mount completion event is missing.');

const requiredBundles = {
  modules: ['module-viewer.js'],
  barotrauma: ['barotrauma-entry.js'],
  kaysender: ['kaysender-editor-kernel.js', 'kaysender-tools.js'],
  generators: ['spell-creator-entry.js', 'npc-profile-generator-entry.js'],
  'world-of-darkness': ['world-of-darkness-entry.js', 'world-of-darkness-spatial-loader.js'],
  shadowrun: ['shadowrun-entry.js'],
  'solanum-umbra': ['solanum-umbra-entry.js']
};
for (const [bundle, scripts] of Object.entries(requiredBundles)) {
  if (!loader.includes(`${bundle.includes('-') ? `'${bundle}'` : bundle}:`)) throw new Error(`Lazy bundle ${bundle} is missing.`);
  for (const script of scripts) if (!loader.includes(`'${script}'`)) throw new Error(`${script} is missing from the ${bundle} lazy bundle.`);
}

const wodBundleMatch = loader.match(/'world-of-darkness':\s*\[([\s\S]*?)\]/);
if (!wodBundleMatch) throw new Error('The World of Darkness bundle could not be inspected.');
const wodInitialScripts = [...wodBundleMatch[1].matchAll(/'([^']+\.js)'/g)].map(match => match[1]);
const expectedWodInitial = ['world-of-darkness-entry.js', 'world-of-darkness-spatial-loader.js'];
if (JSON.stringify(wodInitialScripts) !== JSON.stringify(expectedWodInitial)) {
  throw new Error(`World of Darkness initial bundle must contain only ${expectedWodInitial.join(', ')}; found ${wodInitialScripts.join(', ')}.`);
}

const spatialCore = [
  'world-of-darkness-named-location-bridge.js',
  'world-of-darkness-radial-location-loader.js',
  'world-of-darkness-spatial-engine-inventory.js'
];
const spatialEnhancements = [
  'world-of-darkness-location-package-bridge.js',
  'world-of-darkness-world-scan-overlay.js',
  'world-of-darkness-global-rescan-bridge.js',
  'world-of-darkness-context-aware-core.js',
  'world-of-darkness-context-output-normalizer.js',
  'world-of-darkness-context-aware-variants.js',
  'world-of-darkness-registry-workflow-note.js'
];
for (const script of [...spatialCore, ...spatialEnhancements]) {
  if (!wodSpatialLoader.includes(`'${script}'`)) throw new Error(`${script} is missing from the staged spatial loader.`);
}
for (const script of spatialCore) {
  if (wodBundleMatch[1].includes(script)) throw new Error(`${script} must not load merely by opening the World of Darkness tab.`);
}
if (!wodSpatialLoader.includes('Open Chronicle Spatial Engine')) throw new Error('The explicit Chronicle Spatial Engine launcher is missing.');
if (!wodSpatialLoader.includes('Load Chronicle Tools Now')) throw new Error('The advanced Chronicle override control is missing.');
if (!wodSpatialLoader.includes("document.addEventListener('wod:radial-load-complete'")) throw new Error('Advanced tools must wait for the radial pass by default.');
if (!wodSpatialLoader.includes('requestIdleCallback')) throw new Error('Advanced Chronicle layers must be scheduled after the radial pass.');
if (!wodSpatialLoader.includes('wod:spatial-stack-ready')) throw new Error('The staged spatial stack completion event is missing.');

const radialRequirements = [
  'MAX_VISIBLE = 90',
  'STEP_DELAY_MS',
  '.sort((left, right) => left.distance - right.distance',
  "map.on('movestart zoomstart'",
  'wod-radial-overall',
  'Waiting in radial queue',
  'wod:radial-location-ready',
  'wod:radial-load-complete',
  'wod:radial-load-cancelled'
];
for (const requirement of radialRequirements) {
  if (!wodRadialLoader.includes(requirement)) throw new Error(`Radial location loader is missing required contract marker: ${requirement}`);
}
if (!wodRadialLoader.includes('for (let index = 0; index < state.rawLocations.length; index += 1)')) {
  throw new Error('Radial location hydration must process the ordered queue sequentially.');
}
if (!wodRadialLoader.includes('return { ...payload, elements: [] }')) {
  throw new Error('The legacy all-at-once location renderer is not being suppressed.');
}

if (loader.includes('loadSupplementalGenerators()')) throw new Error('The retired eager supplemental loader returned.');
if (!loader.includes('internalSmoke')) throw new Error('Kaysender live smoke loading must remain explicitly gated.');
if (!loader.includes("new URLSearchParams(location.search).get('p0-smoke') === '1'")) throw new Error('Kaysender live smoke must require the internal query flag or webdriver mode.');
if (!loader.includes("document.addEventListener('click'")) throw new Error('The delegated view-triggered loader is missing.');

console.log(JSON.stringify({
  startupScriptCount: scriptSources.length,
  startupScripts: scriptSources,
  characterSheetInInitialHtml: false,
  lazyBundles: Object.keys(requiredBundles),
  worldOfDarknessInitialScripts: wodInitialScripts,
  worldOfDarknessSpatialCoreScripts: spatialCore,
  worldOfDarknessDeferredEnhancements: spatialEnhancements,
  radialHydrationConcurrency: 1,
  radialVisibleLocationCap: 90,
  radialCancelOnMapMove: true,
  kaysenderSmokeNormalStartup: false
}, null, 2));
