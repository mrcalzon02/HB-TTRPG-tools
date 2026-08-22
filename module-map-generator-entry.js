(() => {
  'use strict';
  const ROOT_ID = 'semantic-module-map-generator-root';
  const scripts = ['semantic-spatial-engine.js', 'module-map-generator.js'];

  function loadScript(src) {
    if ([...document.scripts].some(s => (s.getAttribute('src') || '').split('?')[0].endsWith(src))) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const s = document.createElement('script'); s.src = src; s.async = false; s.onload = resolve; s.onerror = () => reject(new Error(`${src} could not be loaded.`)); document.body.appendChild(s);
    });
  }
  async function ensureRuntime() { for (const src of scripts) { if (src.includes('semantic') && window.HBSemanticSpatialEngine) continue; if (src.includes('module-map-generator') && window.generator?.module_map) continue; await loadScript(src); } }
  function mount() {
    if (document.getElementById(ROOT_ID)) return;
    const host = document.getElementById('generator-library-panel') || document.getElementById('generators'); if (!host) return;
    const section = document.createElement('section'); section.id = ROOT_ID; section.className = 'registry-section no-print';
    section.innerHTML = `<div class="section-heading"><p class="eyebrow">Semantic spatial generator</p><h2>Procedural Module Map</h2><p>Generate a deterministic room-purpose graph first, then place rooms, route corridors and doors, and emit the existing module-map-editor tile schema.</p></div><div class="module-card"><label class="control-label">Seed<input id="smm-seed" value="module-map"></label><label class="control-label">Width<input id="smm-width" type="number" min="30" max="160" value="72"></label><label class="control-label">Height<input id="smm-height" type="number" min="30" max="160" value="56"></label><button id="smm-generate" class="primary-action" type="button">Generate Semantic Module Map</button><pre id="smm-output" class="module-source-text" style="margin-top:12px;max-height:420px"></pre></div>`;
    host.appendChild(section);
    section.querySelector('#smm-generate').onclick = () => {
      const map = window.generator.module_map.generate({ seed: section.querySelector('#smm-seed').value, width: Number(section.querySelector('#smm-width').value), height: Number(section.querySelector('#smm-height').value) });
      section.querySelector('#smm-output').textContent = JSON.stringify({ seed: map.seed, size: `${map.width}x${map.height}`, rooms: map.spatialLayout.rooms.map(r => ({id:r.nodeId,role:r.role,x:r.x,y:r.y,w:r.width,h:r.height})), edges: map.spatialLayout.edges, validation: map.spatialLayout.validation }, null, 2);
      document.dispatchEvent(new CustomEvent('module-map-generator-output', { detail: map }));
    };
    section.scrollIntoView({ behavior:'smooth', block:'start' });
  }
  ensureRuntime().then(mount).catch(error => console.error('Semantic module map generator failed to initialize.', error));
})();
