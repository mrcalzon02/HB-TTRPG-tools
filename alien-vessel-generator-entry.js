(() => {
  'use strict';
  const ROOT_ID = 'alien-vessel-generator-root';
  const STYLE_ID = 'alien-vessel-generator-workspace-style';
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

  function styleOnce() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
#${ROOT_ID}{min-width:0;margin:0}
#${ROOT_ID} .alien-vessel-workspace{display:grid;grid-template-columns:minmax(260px,340px) minmax(0,1fr);gap:14px;align-items:start}
#${ROOT_ID} .alien-vessel-controls,#${ROOT_ID} .alien-vessel-result{min-width:0;margin:0}
#${ROOT_ID} .alien-vessel-controls{display:grid;gap:11px;align-content:start}
#${ROOT_ID} .alien-vessel-controls .section-heading{margin-bottom:2px}
#${ROOT_ID} .alien-vessel-controls .section-heading h2{margin-bottom:5px}
#${ROOT_ID} .alien-vessel-controls .section-heading p:last-child{margin-bottom:0}
#${ROOT_ID} .control-label{display:grid;gap:5px}
#${ROOT_ID} .alien-vessel-actions{display:grid;grid-template-columns:1fr;gap:8px;margin-top:2px}
#${ROOT_ID} .alien-vessel-result{display:grid;grid-template-rows:auto minmax(0,1fr);gap:10px}
#${ROOT_ID} .alien-vessel-result-head{display:flex;align-items:end;justify-content:space-between;gap:12px;flex-wrap:wrap}
#${ROOT_ID} .alien-vessel-result-head h3{margin:0}
#${ROOT_ID} .alien-vessel-result-head p{margin:0;color:var(--muted);font-size:.82rem}
#${ROOT_ID} #avg-output{box-sizing:border-box;width:100%;min-height:58vh;max-height:calc(100vh - 190px);margin:0;overflow:auto;white-space:pre;padding:14px}
@media(max-width:900px){#${ROOT_ID} .alien-vessel-workspace{grid-template-columns:1fr}#${ROOT_ID} #avg-output{min-height:320px;max-height:none}}
`;
    document.head.appendChild(style);
  }

  function mount() {
    if (document.getElementById(ROOT_ID)) return;
    const host=document.getElementById('module-spatial-generator-root') || document.getElementById('generator-library-panel') || document.getElementById('generators');
    if(!host) return;
    styleOnce();
    const section=document.createElement('section');
    section.id=ROOT_ID;
    section.className='registry-section no-print';
    section.innerHTML=`
      <div class="alien-vessel-workspace">
        <div class="module-card alien-vessel-controls">
          <div class="section-heading"><p class="eyebrow">Modules Interface · shared semantic spatial engine</p><h2>Alien Vessel Generator</h2><p>Configure the vessel here; generated structure stays visible alongside the controls on desktop.</p></div>
          <label class="control-label">Seed<input id="avg-seed" value="alpthon-recon-01"></label>
          <label class="control-label">Profile<select id="avg-profile"><option value="recon">Recon vessel</option><option value="damaged_recon">Damaged recon vessel</option></select></label>
          <label class="control-label">Hull shape<select id="avg-hull-shape"><option value="connected-skin">Connected skin / organic wrap</option><option value="oval">Oval / elliptical</option><option value="capsule">Capsule / pill</option><option value="rectangle">Rectangular / box</option><option value="square">Square / cube</option><option value="circle">Circular / cylindrical</option></select></label>
          <label class="control-label">Hull tightness<select id="avg-hull-tightness"><option value="skin-tight">Skin-tight · 1 cell</option><option value="tight">Tight · 2 cells</option><option value="close">Close · 3 cells</option><option value="standard" selected>Standard · 4 cells</option><option value="loose">Loose · 7 cells</option><option value="very-loose">Very loose · 10 cells</option></select></label>
          <div class="alien-vessel-actions"><button id="avg-generate" class="primary-action" type="button">Generate Alien Vessel</button></div>
        </div>
        <section class="module-card alien-vessel-result" aria-labelledby="avg-result-title">
          <div class="alien-vessel-result-head"><h3 id="avg-result-title">Generated Vessel</h3><p>Topology, hull, compartments, connectors, damage, and validation.</p></div>
          <pre id="avg-output" class="module-source-text">Generate a vessel to inspect its structured result.</pre>
        </section>
      </div>`;
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
