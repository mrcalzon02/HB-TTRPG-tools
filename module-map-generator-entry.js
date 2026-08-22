(() => {
  'use strict';
  const ROOT_ID = 'semantic-module-map-generator-root';
  const scripts = ['semantic-spatial-engine.js', 'semantic-content-populator.js', 'module-map-generator.js'];

  function loadScript(src) {
    if ([...document.scripts].some(script => (script.getAttribute('src') || '').split('?')[0].endsWith(src))) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.async = false;
      script.onload = resolve;
      script.onerror = () => reject(new Error(`${src} could not be loaded.`));
      document.body.appendChild(script);
    });
  }
  async function ensureRuntime() {
    for (const src of scripts) {
      if (src.includes('semantic-spatial') && window.HBSemanticSpatialEngine) continue;
      if (src.includes('semantic-content') && window.HBSemanticContentPopulator) continue;
      if (src.includes('module-map-generator') && window.generator?.module_map) continue;
      await loadScript(src);
    }
  }
  function option(value, label) { return `<option value="${value}">${label}</option>`; }
  function mount() {
    if (document.getElementById(ROOT_ID)) return;
    const host = document.getElementById('generator-library-panel') || document.getElementById('generators');
    if (!host) return;
    const section = document.createElement('section');
    section.id = ROOT_ID;
    section.className = 'registry-section no-print';
    const archetypes = [
      ['generic','Generic / custom'],['mansion','Mansion / noble estate'],['manor','Manor / estate'],['tomb','Tomb / crypt / catacomb'],
      ['sewer','Sewers / drainage network'],['fortress','Fortress / castle'],['school','School / academy'],['bunkhouse_compound','Bunkhouse compound / barracks'],
      ['arcane_university','Arcane University'],['guildhall','Guildhall'],['temple','Temple'],['warehouse','Warehouse'],['laboratory','Laboratory'],
      ['prison','Prison'],['hospital','Hospital'],['mine','Mine'],['industrial_facility','Industrial facility'],['hideout','Hideout'],['civic_building','Civic building']
    ];
    section.innerHTML = `<div class="section-heading"><p class="eyebrow">Semantic-first spatial generator</p><h2>Purpose-Aware Procedural Module Map</h2><p>The selected location purpose defines the semantic room program and access structure before geometry. A deterministic content layer then populates the generated topology while keeping rules-family provenance explicit.</p></div><div class="module-card">
      <label class="control-label">Seed<input id="smm-seed" value="module-map"></label>
      <label class="control-label">Location purpose<select id="smm-archetype">${archetypes.map(([value,label]) => option(value,label)).join('')}</select></label>
      <label class="control-label">Rules family<select id="smm-rules"><option value="open_d20">Open d20 / Hypertext d20-compatible</option><option value="world_of_darkness">World of Darkness</option><option value="blacklight_continuum">Blacklight Continuum</option><option value="kaysender">Kaysender</option></select></label>
      <label class="control-label">Danger level<input id="smm-danger" type="number" min="0" max="10" value="4"></label>
      <label class="control-label">Width<input id="smm-width" type="number" min="30" max="160" value="72"></label>
      <label class="control-label">Height<input id="smm-height" type="number" min="30" max="160" value="56"></label>
      <button id="smm-generate" class="primary-action" type="button">Generate Purpose-Aware Module Map</button>
      <pre id="smm-output" class="module-source-text" style="margin-top:12px;max-height:620px"></pre>
    </div>`;
    host.appendChild(section);
    section.querySelector('#smm-generate').onclick = () => {
      const map = window.generator.module_map.generate({
        seed: section.querySelector('#smm-seed').value,
        locationArchetype: section.querySelector('#smm-archetype').value,
        rulesTarget: section.querySelector('#smm-rules').value,
        dangerLevel: Number(section.querySelector('#smm-danger').value),
        width: Number(section.querySelector('#smm-width').value),
        height: Number(section.querySelector('#smm-height').value)
      });
      section.querySelector('#smm-output').textContent = JSON.stringify({
        seed:map.seed, locationArchetype:map.locationArchetype, semanticProgram:map.semanticProgram, size:`${map.width}x${map.height}`, deckCount:map.deckCount,
        rooms:map.spatialLayout.rooms.map(room => ({id:room.nodeId,role:room.role,label:room.label,deck:room.deck,x:room.x,y:room.y,w:room.width,h:room.height,tags:room.tags})),
        content:map.content.rooms, compatibility:map.compatibility, provenance:map.provenance, validation:map.spatialLayout.validation
      }, null, 2);
      document.dispatchEvent(new CustomEvent('module-map-generator-output', { detail: map }));
    };
    section.scrollIntoView({ behavior:'smooth', block:'start' });
  }
  ensureRuntime().then(mount).catch(error => console.error('Semantic module map generator failed to initialize.', error));
})();
