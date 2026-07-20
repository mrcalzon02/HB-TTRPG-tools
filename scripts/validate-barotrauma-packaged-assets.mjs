import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');
const fail = message => { throw new Error(message); };

const browserRuntime = read('barotrauma-packaged-assets.js');
const browserStyles = read('barotrauma-packaged-assets.css');
const landing = read('barotrauma.html');
const viewMounts = read('app-lite-view-mounts.js');
const desktopCatalogue = read('desktop/barotrauma-world-sim/src/main/java/io/github/mrcalzon02/barotrauma/assets/BarotraumaAssetCatalogue.java');

for (const forbidden of ['BarotraumaDonorAssets', 'donorRoot', 'steamapps/common/Barotrauma', 'Content/UI']) {
  if (browserRuntime.includes(forbidden)) fail(`Browser asset runtime contains forbidden local-installation reference: ${forbidden}`);
}

for (const required of [
  'scene-atlas-exterior.tsv',
  'scene-atlas-interior.tsv',
  'ui-atlas-reviewed/medical-ui.tsv',
  'ui-atlas-reviewed/retro-futuristic-ui.tsv',
  'ui-atlas-reviewed/hud-elements.tsv',
  'ui-atlas-reviewed/game-hud-icons.tsv',
  'MutationObserver',
  'ResizeObserver',
  'drawImage'
]) {
  if (!browserRuntime.includes(required)) fail(`Browser asset runtime lacks ${required}.`);
}

if (!landing.includes('barotrauma-packaged-assets.css') || !landing.includes('barotrauma-packaged-assets.js')) {
  fail('Dedicated Barotrauma landing page does not load the packaged asset runtime.');
}
if (!viewMounts.includes("viewId === 'barotrauma'")
    || !viewMounts.includes("loadStyle('barotrauma-packaged-assets.css')")
    || !viewMounts.includes("loadScript('barotrauma-packaged-assets.js')")) {
  fail('Live workspace does not lazily load the packaged Barotrauma asset runtime.');
}
if (!browserStyles.includes('.barotrauma-atlas-backdrop')
    || !browserStyles.includes('.barotrauma-atlas-icon')) {
  fail('Packaged browser asset styles are incomplete.');
}

const sceneMaps = [
  'desktop/barotrauma-world-sim/src/main/resources/io/github/mrcalzon02/barotrauma/assets/scene-atlas-exterior.tsv',
  'desktop/barotrauma-world-sim/src/main/resources/io/github/mrcalzon02/barotrauma/assets/scene-atlas-interior.tsv'
];
const uiMaps = [
  'desktop/barotrauma-world-sim/src/main/resources/io/github/mrcalzon02/barotrauma/assets/ui-atlas-reviewed/medical-ui.tsv',
  'desktop/barotrauma-world-sim/src/main/resources/io/github/mrcalzon02/barotrauma/assets/ui-atlas-reviewed/retro-futuristic-ui.tsv',
  'desktop/barotrauma-world-sim/src/main/resources/io/github/mrcalzon02/barotrauma/assets/ui-atlas-reviewed/hud-elements.tsv',
  'desktop/barotrauma-world-sim/src/main/resources/io/github/mrcalzon02/barotrauma/assets/ui-atlas-reviewed/game-hud-icons.tsv'
];

function semantics(files, column) {
  const result = new Set();
  for (const file of files) {
    const lines = read(file).trim().split(/\r?\n/);
    const header = lines.shift().split('\t');
    const index = header.indexOf(column);
    if (index < 0) fail(`${file} lacks ${column}.`);
    for (const line of lines) {
      const value = line.split('\t')[index];
      if (value) result.add(value);
    }
  }
  return result;
}

const sceneSemantics = semantics(sceneMaps, 'semantic_name');
const uiSemantics = semantics(uiMaps, 'semantic_name');
const requiredScenes = [
  'interior-command-observation-room',
  'exterior-floodlit-megastructure-basin',
  'exterior-flooded-repair-basin',
  'interior-operations-table-room',
  'interior-panoramic-command-room',
  'interior-white-lit-laboratory-bay',
  'interior-planning-room',
  'exterior-dense-flooded-megacity',
  'exterior-broken-battleship-in-rain'
];
const requiredUi = [
  'medical-large-panel',
  'medical-grid-panel',
  'medical-teal-pill-button',
  'medical-save-icon',
  'medical-message-icon',
  'medical-atom-symbol',
  'medical-kit-symbol',
  'medical-observation-card',
  'retro-ui-favorite-tab',
  'retro-ui-map-pin-gold',
  'retro-ui-map-pin-star',
  'retro-ui-map-pin-diamond',
  'retro-ui-flag-button',
  'retro-ui-crew-button',
  'retro-ui-document-button',
  'hud-elements-submarine',
  'hud-elements-shuttle-a',
  'hud-elements-navigation-arrow',
  'hud-elements-warning-icon',
  'hud-elements-mountain-icon',
  'hud-elements-gear-icon',
  'game-hud-backpack'
];
for (const semantic of requiredScenes) if (!sceneSemantics.has(semantic)) fail(`Missing scene semantic ${semantic}.`);
for (const semantic of requiredUi) if (!uiSemantics.has(semantic)) fail(`Missing UI semantic ${semantic}.`);

for (const required of ['PACKAGED_ATLAS', 'packagedSceneRoles()', 'packagedUiRoles()', 'loadPackaged(role)']) {
  if (!desktopCatalogue.includes(required)) fail(`Desktop catalogue lacks ${required}.`);
}
const donorIndex = desktopCatalogue.indexOf('Optional<Candidate> donor = donors.activeDonor()');
const packagedIndex = desktopCatalogue.indexOf('SceneAtlasIndex.BackgroundRole sceneRole = PACKAGED_SCENE_ROLES.get(role)');
if (donorIndex < 0 || packagedIndex < 0 || donorIndex >= packagedIndex) {
  fail('Desktop catalogue no longer resolves local assets before packaged atlas assets.');
}

console.log('Barotrauma browser packaged assets and desktop three-tier visual resolution validation passed.');
