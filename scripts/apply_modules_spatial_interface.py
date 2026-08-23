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


old_modules = '''    <section id="modules" class="view" aria-labelledby="modules-title">
      <div class="hero-card no-print"><p class="eyebrow">Module extraction and static references</p><h2 id="modules-title">Modules</h2><p>Use the interactive viewer for extracted map data, or open either Unfazun module as its own indexed static atlas whose source text remains separate from the module runtime.</p></div>
      <nav class="top-nav no-print" aria-label="Module sections">
        <span class="nav-button active" aria-current="page">Interactive Viewer</span>
        <a class="nav-button" href="unfazun-guildhall.html">Unfazun Guildhall</a>
        <a class="nav-button" href="unfazun-arcane-university.html">Great Arcane University</a>
        <a class="nav-button" href="modules.html">Module Index</a>
      </nav>
      <div id="module-viewer-root" class="no-print"></div>
    </section>'''

new_modules = '''    <section id="modules" class="view" aria-labelledby="modules-title">
      <div class="hero-card no-print"><p class="eyebrow">Spatial generation, module extraction, and static references</p><h2 id="modules-title">Modules</h2><p>Build purpose-aware procedural sites with the shared semantic spatial engine, inspect every resolved control and historical layer, then continue into extracted module data and indexed static atlases.</p></div>
      <nav class="top-nav no-print" aria-label="Module sections">
        <span class="nav-button active" aria-current="page">Spatial Generator + Viewer</span>
        <a class="nav-button" href="spatial-generators.html">Spatial Generator Reference</a>
        <a class="nav-button" href="unfazun-guildhall.html">Unfazun Guildhall</a>
        <a class="nav-button" href="unfazun-arcane-university.html">Great Arcane University</a>
        <a class="nav-button" href="modules.html">Module Index</a>
      </nav>
      <section class="registry-section no-print" aria-labelledby="module-spatial-generator-title">
        <div class="section-heading">
          <p class="eyebrow">Authoritative procedural module generation</p>
          <h2 id="module-spatial-generator-title">Spatial Module Laboratory</h2>
          <p>The live module generator exposes purpose, scale, original builder culture, current controller, occupation, environment, ecology, hazards, security, resources, condition, secret density, compatibility, and the complete historical interaction record. Geometry remains owned by the shared semantic spatial engine.</p>
        </div>
        <div id="module-spatial-generator-root"><div class="module-empty">Open Modules to load the purpose-aware spatial generator.</div></div>
      </section>
      <section class="registry-section no-print" aria-labelledby="module-extracted-viewer-title">
        <div class="section-heading">
          <p class="eyebrow">Extracted module data</p>
          <h2 id="module-extracted-viewer-title">Interactive Module Viewer</h2>
          <p>Existing extracted and static module references remain available below the procedural generator.</p>
        </div>
        <div id="module-viewer-root"></div>
      </section>
    </section>'''

replace_once('index.html', old_modules, new_modules, 'Modules workspace integration')

replace_once(
    'app-lite-view-mounts.js',
    "  let sheetPromise = null;\n",
    "  let sheetPromise = null;\n  let moduleSpatialEntryPromise = null;\n",
    'Modules lazy-load state'
)

replace_once(
    'app-lite-view-mounts.js',
    "  async function prepareView(viewId) {\n    if (viewId === 'utilities') {",
    "  async function prepareView(viewId) {\n    if (viewId === 'modules') {\n      moduleSpatialEntryPromise ||= loadScript('module-map-generator-entry.js?v=20260822-modules-interface-1');\n      await Promise.all([moduleSpatialEntryPromise, base.prepareView(viewId)]);\n      window.initModuleViewer?.();\n      return;\n    }\n    if (viewId === 'utilities') {",
    'Modules lazy-load route'
)

old_host = "const host=document.getElementById('generator-library-panel')||document.getElementById('generators');if(!host)return;const section=document.createElement('section');"
new_host = "const host=document.getElementById('module-spatial-generator-root')||document.getElementById('generator-library-panel')||document.getElementById('generators');if(!host)return;if(host.id==='module-spatial-generator-root')host.innerHTML='';const section=document.createElement('section');"
replace_once('module-map-generator-entry.js', old_host, new_host, 'Module generator mount target')

# Make the live location explicit in the generated UI so the user can distinguish
# the integrated Modules workbench from the legacy standalone generator reference.
replace_once(
    'module-map-generator-entry.js',
    '<p class="eyebrow">Layered semantic-first spatial generator</p><h2>Purpose-Aware Procedural Module Map</h2>',
    '<p class="eyebrow">Modules Interface · layered semantic-first spatial generator</p><h2>Purpose-Aware Procedural Module Map</h2>',
    'Modules generator identity'
)

test = r'''\'use strict\';
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
'''
Path('tests/modules-spatial-interface.test.js').write_text(test, encoding='utf-8')

print('Modules spatial interface integration applied.')
