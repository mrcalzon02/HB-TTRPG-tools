(() => {
  'use strict';
  const ROOT_ID = 'alien-vessel-generator-root';
  const scripts = ['semantic-spatial-engine.js', 'alien-vessel-generator.js'];
  function loadScript(src) {
    if ([...document.scripts].some(s => (s.getAttribute('src') || '').split('?')[0].endsWith(src))) return Promise.resolve();
    return new Promise((resolve, reject) => { const s=document.createElement('script'); s.src=src; s.async=false; s.onload=resolve; s.onerror=()=>reject(new Error(`${src} could not be loaded.`)); document.body.appendChild(s); });
  }
  async function ensureRuntime() { for (const src of scripts) { if (src.includes('semantic') && window.HBSemanticSpatialEngine) continue; if (src.includes('alien-vessel-generator') && window.generator?.alien_vessel) continue; await loadScript(src); } }
  function mount() {
    if (document.getElementById(ROOT_ID)) return;
    const host=document.getElementById('generator-library-panel') || document.getElementById('generators'); if(!host) return;
    const section=document.createElement('section'); section.id=ROOT_ID; section.className='registry-section no-print';
    section.innerHTML=`<div class="section-heading"><p class="eyebrow">Shared semantic spatial engine</p><h2>Alien Vessel Generator</h2><p>Build a purpose-first Alpthon reconnaissance vessel with command, bio-printing, habitation, recreation, grow labs, cargo, engineering, mechanical, and life-support spaces across connected decks.</p></div><div class="module-card"><label class="control-label">Seed<input id="avg-seed" value="alpthon-recon-01"></label><label class="control-label">Profile<select id="avg-profile"><option value="recon">Recon vessel</option><option value="damaged_recon">Damaged recon vessel</option></select></label><button id="avg-generate" class="primary-action" type="button">Generate Alien Vessel</button><pre id="avg-output" class="module-source-text" style="margin-top:12px;max-height:520px"></pre></div>`;
    host.appendChild(section);
    section.querySelector('#avg-generate').onclick=()=>{ const result=window.generator.alien_vessel.generate({seed:section.querySelector('#avg-seed').value,profile:section.querySelector('#avg-profile').value}); section.querySelector('#avg-output').textContent=JSON.stringify({faction:result.faction,vesselType:result.vesselType,profile:result.profile,seed:result.seed,decks:result.deckCount,compartments:result.semanticSummary,connectors:result.spatialLayout.connectors,damage:result.damage,validation:result.validation},null,2); document.dispatchEvent(new CustomEvent('alien-vessel-generator-output',{detail:result})); };
    section.scrollIntoView({behavior:'smooth',block:'start'});
  }
  ensureRuntime().then(mount).catch(error=>console.error('Alien vessel generator failed to initialize.',error));
})();
