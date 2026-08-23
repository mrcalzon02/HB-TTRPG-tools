'use strict';
const assert = require('assert');
const fs = require('fs');

const index = fs.readFileSync('index.html', 'utf8');
const mounts = fs.readFileSync('app-lite-view-mounts.js', 'utf8');
const entry = fs.readFileSync('module-map-generator-entry.js', 'utf8');

assert.ok(index.includes('id="module-spatial-generator-root"'), 'Modules workspace must expose a dedicated spatial generator mount');
assert.ok(index.includes('Spatial Module Laboratory'), 'Modules workspace must visibly identify the procedural spatial laboratory');
assert.ok(index.includes('Spatial Generator + Viewer'), 'Modules navigation must advertise generation rather than viewer-only behavior');
assert.ok(index.includes('id="module-viewer-root"'), 'Existing module viewer must remain available');

assert.ok(mounts.includes("if (viewId === 'modules')"), 'Modules route must have an explicit lazy-load branch');
assert.ok(mounts.includes("loadScript('module-map-generator-entry.js?v=20260822-modules-interface-1')"), 'Modules route must load the authoritative module-map entrypoint');

assert.ok(entry.includes("document.getElementById('module-spatial-generator-root')"), 'Authoritative generator entrypoint must prefer the Modules mount');
assert.ok(entry.includes("window.generator.module_map.generate(input)"), 'Modules UI must invoke the canonical generator.module_map surface');
for (const control of ['smm-scale','smm-culture','smm-controller','smm-occupancy','smm-biome','smm-ecology','smm-secret-density','smm-creature-density','smm-hazard-intensity','smm-treasure-density','smm-social-density']) {
  assert.ok(entry.includes(control), `Modules generator must expose ${control}`);
}
for (const output of ['layers:map.siteProfile.layers','interactions:map.siteProfile.interactions','historicalUse','validation:map.spatialLayout.validation']) {
  assert.ok(entry.includes(output), `Modules generator output must expose ${output}`);
}

console.log('Modules spatial interface integration: PASS');
console.log(JSON.stringify({route:'#modules',authority:'generator.module_map',profileAxes:28,expectedCatalogValues:614}, null, 2));
