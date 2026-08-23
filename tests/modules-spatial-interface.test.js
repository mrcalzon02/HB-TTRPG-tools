'use strict';
const assert = require('assert');
const fs = require('fs');

const index = fs.readFileSync('index.html', 'utf8');
const mounts = fs.readFileSync('app-lite-view-mounts.js', 'utf8');
const moduleEntry = fs.readFileSync('module-map-generator-entry.js', 'utf8');
const alienEntry = fs.readFileSync('alien-vessel-generator-entry.js', 'utf8');
const kaysenderEntry = fs.readFileSync('kaysender-airship-generator-entry.js', 'utf8');

assert.ok(index.includes('id="module-spatial-generator-root"'), 'Modules workspace must expose a dedicated spatial generator mount');
assert.ok(index.includes('Spatial Module Laboratory'), 'Modules workspace must visibly identify the procedural spatial laboratory');
assert.ok(index.includes('purpose-aware sites, alien vessels, and Kaysender airships'), 'Modules workspace must describe the complete spatial suite');
assert.ok(index.includes('id="module-viewer-root"'), 'Existing module viewer must remain available');

assert.ok(mounts.includes("if (viewId === 'modules')"), 'Modules route must have an explicit lazy-load branch');
for (const dependency of ['semantic-spatial-engine.js','semantic-content-populator.js','module-map-generator.js','vessel-hull-envelope.js','alien-vessel-generator.js','kaysender-airship-generator.js','module-map-generator-entry.js?v=20260822-modules-interface-2','alien-vessel-generator-entry.js?v=20260822-modules-interface-1','kaysender-airship-generator-entry.js?v=20260822-modules-interface-1']) {
  assert.ok(mounts.includes(dependency), `Modules route must load ${dependency}`);
}

assert.ok(moduleEntry.includes("document.getElementById('module-spatial-generator-root')"), 'Module-map entrypoint must prefer the Modules mount');
assert.ok(moduleEntry.includes("window.generator.module_map.generate(input)"), 'Modules site UI must invoke canonical generator.module_map');
assert.ok(moduleEntry.includes("querySelector(':scope > .module-empty')?.remove()"), 'Module-map mount must preserve sibling spatial interfaces');
for (const control of ['smm-scale','smm-culture','smm-controller','smm-occupancy','smm-biome','smm-ecology','smm-secret-density','smm-creature-density','smm-hazard-intensity','smm-treasure-density','smm-social-density']) {
  assert.ok(moduleEntry.includes(control), `Modules site generator must expose ${control}`);
}
for (const output of ['layers:map.siteProfile.layers','interactions:map.siteProfile.interactions','historicalUse','validation:map.spatialLayout.validation']) {
  assert.ok(moduleEntry.includes(output), `Modules site generator output must expose ${output}`);
}

assert.ok(alienEntry.includes("document.getElementById('module-spatial-generator-root')"), 'Alien vessel entrypoint must mount into Modules');
assert.ok(alienEntry.includes('window.generator.alien_vessel.generate'), 'Alien vessel UI must invoke canonical generator.alien_vessel');
for (const control of ['avg-profile','avg-hull-shape','avg-hull-tightness']) assert.ok(alienEntry.includes(control), `Alien vessel UI must expose ${control}`);

assert.ok(kaysenderEntry.includes("document.getElementById('module-spatial-generator-root')"), 'Kaysender airship entrypoint must mount into Modules');
assert.ok(kaysenderEntry.includes('window.generator.kaysender_airship.generate'), 'Kaysender airship UI must invoke canonical generator.kaysender_airship');
for (const control of ['kas-profile-json','kas-class','kas-culture','kas-core','kas-purpose','kas-crew','kas-cargo','kas-armament','kas-defense','kas-condition','kas-faction']) assert.ok(kaysenderEntry.includes(control), `Kaysender airship UI must expose ${control}`);

console.log('Modules complete spatial interface integration: PASS');
console.log(JSON.stringify({route:'#modules',authorities:['generator.module_map','generator.alien_vessel','generator.kaysender_airship'],profileAxes:28,expectedCatalogValues:614}, null, 2));
