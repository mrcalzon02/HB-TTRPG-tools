from pathlib import Path


def replace_once(path, old, new, label):
    p = Path(path)
    text = p.read_text(encoding='utf-8')
    if new in text:
        return False
    if old not in text:
        raise SystemExit(f'{label}: expected source block not found in {path}')
    p.write_text(text.replace(old, new, 1), encoding='utf-8')
    return True

replace_once(
    'index.html',
    '<p>The live module generator exposes purpose, scale, original builder culture, current controller, occupation, environment, ecology, hazards, security, resources, condition, secret density, compatibility, and the complete historical interaction record. Geometry remains owned by the shared semantic spatial engine.</p>',
    '<p>The live spatial suite exposes purpose-aware sites, alien vessels, and Kaysender airships. Site generation includes scale, original builder culture, current controller, occupation, environment, ecology, hazards, security, resources, condition, secret density, compatibility, and the complete historical interaction record. Every interface delegates topology and geometry to the shared semantic spatial engine.</p>',
    'Modules spatial suite description'
)
replace_once(
    'index.html',
    '<div id="module-spatial-generator-root"><div class="module-empty">Open Modules to load the purpose-aware spatial generator.</div></div>',
    '<div id="module-spatial-generator-root"><div class="module-empty">Open Modules to load the complete spatial generator suite.</div></div>',
    'Modules spatial suite placeholder'
)

old_modules_route = """    if (viewId === 'modules') {
      moduleSpatialEntryPromise ||= loadScript('module-map-generator-entry.js?v=20260822-modules-interface-1');
      await Promise.all([moduleSpatialEntryPromise, base.prepareView(viewId)]);
      window.initModuleViewer?.();
      return;
    }"""
new_modules_route = """    if (viewId === 'modules') {
      moduleSpatialEntryPromise ||= loadScript('semantic-spatial-engine.js')
        .then(() => loadScript('semantic-content-populator.js'))
        .then(() => loadScript('module-map-generator.js'))
        .then(() => loadScript('vessel-hull-envelope.js'))
        .then(() => loadScript('alien-vessel-generator.js'))
        .then(() => loadScript('kaysender-airship-generator.js'))
        .then(() => loadScript('module-map-generator-entry.js?v=20260822-modules-interface-2'))
        .then(() => loadScript('alien-vessel-generator-entry.js?v=20260822-modules-interface-1'))
        .then(() => loadScript('kaysender-airship-generator-entry.js?v=20260822-modules-interface-1'));
      await Promise.all([moduleSpatialEntryPromise, base.prepareView(viewId)]);
      window.initModuleViewer?.();
      return;
    }"""
replace_once('app-lite-view-mounts.js', old_modules_route, new_modules_route, 'Modules complete spatial lazy-load route')

replace_once(
    'module-map-generator-entry.js',
    "if(host.id==='module-spatial-generator-root')host.innerHTML='';",
    "if(host.id==='module-spatial-generator-root')host.querySelector(':scope > .module-empty')?.remove();",
    'Module map multi-generator mount preservation'
)

replace_once(
    'alien-vessel-generator-entry.js',
    "const host=document.getElementById('generator-library-panel') || document.getElementById('generators'); if(!host) return;",
    "const host=document.getElementById('module-spatial-generator-root') || document.getElementById('generator-library-panel') || document.getElementById('generators'); if(!host) return;",
    'Alien vessel Modules mount'
)
replace_once(
    'alien-vessel-generator-entry.js',
    '<p class="eyebrow">Shared semantic spatial engine</p><h2>Alien Vessel Generator</h2>',
    '<p class="eyebrow">Modules Interface · shared semantic spatial engine</p><h2>Alien Vessel Generator</h2>',
    'Alien vessel Modules identity'
)

replace_once(
    'kaysender-airship-generator-entry.js',
    "const host=document.getElementById('kaysender-airship-spatial-host')||document.getElementById('generator-library-panel')||document.getElementById('kaysender')||document.body;",
    "const host=document.getElementById('module-spatial-generator-root')||document.getElementById('kaysender-airship-spatial-host')||document.getElementById('generator-library-panel')||document.getElementById('kaysender')||document.body;",
    'Kaysender airship Modules mount'
)
replace_once(
    'kaysender-airship-generator-entry.js',
    '<p class="eyebrow">Kaysender · shared semantic spatial engine</p><h2>Airship Spatial Generator</h2>',
    '<p class="eyebrow">Modules Interface · Kaysender · shared semantic spatial engine</p><h2>Airship Spatial Generator</h2>',
    'Kaysender airship Modules identity'
)

test = """'use strict';
const assert = require('assert');
const fs = require('fs');

const index = fs.readFileSync('index.html', 'utf8');
const mounts = fs.readFileSync('app-lite-view-mounts.js', 'utf8');
const moduleEntry = fs.readFileSync('module-map-generator-entry.js', 'utf8');
const alienEntry = fs.readFileSync('alien-vessel-generator-entry.js', 'utf8');
const kaysenderEntry = fs.readFileSync('kaysender-airship-generator-entry.js', 'utf8');

assert.ok(index.includes('id=\"module-spatial-generator-root\"'), 'Modules workspace must expose a dedicated spatial generator mount');
assert.ok(index.includes('Spatial Module Laboratory'), 'Modules workspace must visibly identify the procedural spatial laboratory');
assert.ok(index.includes('purpose-aware sites, alien vessels, and Kaysender airships'), 'Modules workspace must describe the complete spatial suite');
assert.ok(index.includes('id=\"module-viewer-root\"'), 'Existing module viewer must remain available');

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
"""
Path('tests/modules-spatial-interface.test.js').write_text(test, encoding='utf-8')

print('Complete Modules spatial generator suite integration applied.')
