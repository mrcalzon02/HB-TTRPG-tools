(() => {
  'use strict';
  const ROOT_ID = 'alien-vessel-generator-root';
  const scripts = ['semantic-spatial-engine.js', 'vessel-hull-envelope.js', 'alien-vessel-generator.js'];
  function loadScript(src) {
    if ([...document.scripts].some(s => (s.getAttribute('src') || '').split('?')[0].endsWith(src))) return Promise.resolve();
    return new Promise((resolve, reject) => { const s=document.createElement('script'); s.src=src; s.async=false; s.onload=resolve; s.onerror=()=>reject(new Error(`${src} could not be loaded.`)); document.body.appendChild(s); });
  }
  async function ensureRuntime() {
    for (const src of scripts) {
      if (src.includes('semantic') && window.HBSemanticSpatialEngine) continue;
      if (src.includes('hull-envelope') && window.HBVesselHullEnvelope) continue;
      if (src.includes('alien-vessel-generator') && window.generator?.alien_vessel) continue;
      await loadScript(src);
    }
  }
  function mount() {
    if (document.getElementById(ROOT_ID)) return;
    const host=document.getElementById('generator-library-panel') || document.getElementById('generators'); if(!host) return;
    const section=document.createElement('section'); section.id=ROOT_ID; section.className='registry-section no-print';
    section.innerHTML=`<div class="section-heading"><p class="eyebrow">Shared semantic spatial engine</p><h2>Alien Vessel Generator</h2><p>Build a purpose-first Alpthon reconnaissance vessel, then wrap the connected multi-deck interior in a selectable continuous outer hull skin.</p></div><div class="module-card"><label class="control-label">Seed<input id="avg-seed" value="alpthon-recon-01"></label><label class="control-label">Profile<select id="avg-profile"><option value="recon">Recon vessel</option><option value="damaged_recon">Damaged recon vessel</option></select></label><label class="control-label">Hull shape<select id="avg-hull-shape"><option value="connected-skin">Connected skin / organic wrap</option><option value="oval">Oval / elliptical</option><option value="capsule">Capsule / pill</option><option value="rectangle">Rectangular / box</option><option value="square">Square / cube</option><option value="circle">Circular / cylindrical</option></select></label><label class="control-label">Hull tightness<select id="avg-hull-tightness"><option value="skin-tight">Skin-tight · 1 cell</option><option value="tight">Tight · 2 cells</option><option value="close">Close · 3 cells</option><option value="standard" selected>Standard · 4 cells</option><option value="loose">Loose · 7 cells</option><option value="very-loose">Very loose · 10 cells</option></select></label><button id="avg-generate" class="primary-action" type="button">Generate Alien Vessel</button><pre id="avg-output" class="module-source-text" style="margin-top:12px;max-height:620px"></pre></div>`;
    host.appendChild(section);
    section.querySelector('#avg-generate').onclick=()=>{
      const result=window.generator.alien_vessel.generate({
        seed:section.querySelector('#avg-seed').value,
        profile:section.querySelector('#avg-profile').value,
        hullShape:section.querySelector('#avg-hull-shape').value,
        hullTightness:section.querySelector('#avg-hull-tightness').value
      });
      section.querySelector('#avg-output').textContent=JSON.stringify({
        faction:result.faction,vesselType:result.vesselType,profile:result.profile,seed:result.seed,decks:result.deckCount,
        hull:{shape:result.hull.shape,tightness:result.hull.tightness,clearance:result.hull.clearance,bounds:result.hull.bounds,surface:result.hull.surface,validation:result.hull.validation},
        compartments:result.semanticSummary,connectors:result.spatialLayout.connectors,damage:result.damage,validation:result.validation
      },null,2);
      document.dispatchEvent(new CustomEvent('alien-vessel-generator-output',{detail:result}));
    };
    section.scrollIntoView({behavior:'smooth',block:'start'});
  }
  ensureRuntime().then(mount).catch(error=>console.error('Alien vessel generator failed to initialize.',error));
})();
