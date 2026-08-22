(() => {
  'use strict';
  const ROOT_ID='semantic-module-map-generator-root';
  const scripts=['semantic-spatial-engine.js','semantic-content-populator.js','module-map-generator.js'];
  function loadScript(src){if([...document.scripts].some(s=>(s.getAttribute('src')||'').split('?')[0].endsWith(src)))return Promise.resolve();return new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=src;s.async=false;s.onload=resolve;s.onerror=()=>reject(new Error(`${src} could not be loaded.`));document.body.appendChild(s);});}
  async function ensureRuntime(){for(const src of scripts){if(src.includes('semantic-spatial')&&window.HBSemanticSpatialEngine)continue;if(src.includes('semantic-content')&&window.HBSemanticContentPopulator)continue;if(src.includes('module-map-generator')&&window.generator?.module_map)continue;await loadScript(src);}}
  const option=(value,label)=>`<option value="${value}">${label||value.replace(/-/g,' ')}</option>`;
  const autoOptions=axis=>`<option value="">Seeded random</option>${(window.generator.module_map.SITE_OPTION_CATALOG[axis]||[]).map(v=>option(v)).join('')}`;
  const list=value=>String(value||'').split(',').map(v=>v.trim()).filter(Boolean);
  function mount(){if(document.getElementById(ROOT_ID))return;const host=document.getElementById('generator-library-panel')||document.getElementById('generators');if(!host)return;const section=document.createElement('section');section.id=ROOT_ID;section.className='registry-section no-print';const archetypes=[['generic','Generic / custom'],['mansion','Mansion / noble estate'],['manor','Manor / estate'],['tomb','Tomb / crypt / catacomb'],['sewer','Sewers / drainage network'],['fortress','Fortress / castle'],['school','School / academy'],['bunkhouse_compound','Bunkhouse compound / barracks'],['arcane_university','Arcane University'],['guildhall','Guildhall'],['temple','Temple'],['warehouse','Warehouse'],['laboratory','Laboratory'],['prison','Prison'],['hospital','Hospital'],['mine','Mine'],['industrial_facility','Industrial facility'],['hideout','Hideout'],['civic_building','Civic building']];const catalog=window.generator.module_map.siteOptionCatalog();
    section.innerHTML=`<div class="section-heading"><p class="eyebrow">Layered semantic-first spatial generator</p><h2>Purpose-Aware Procedural Module Map</h2><p>Purpose establishes the base program. Ordered site-profile layers then alter scale, builder culture, current controller, occupation, environment, ecology, hazards, security, resources and condition while retaining the provenance of every earlier layer.</p></div><div class="module-card">
      <p class="helper-note"><strong>${catalog.optionCount}</strong> selectable values across <strong>${catalog.axisCount}</strong> profile axes, plus creature/hazard/treasure/social density controls. Leave a field on Seeded random to let the seed select it.</p>
      <label class="control-label">Seed<input id="smm-seed" value="module-map"></label>
      <label class="control-label">Location purpose<select id="smm-archetype">${archetypes.map(([v,l])=>option(v,l)).join('')}</select></label>
      <label class="control-label">Scale<select id="smm-scale">${autoOptions('scale')}</select></label>
      <label class="control-label">Original cultural / builder influence<select id="smm-culture">${autoOptions('originCulture')}</select></label>
      <label class="control-label">Current controller<select id="smm-controller">${autoOptions('controller')}</select></label>
      <label class="control-label">Occupation state<select id="smm-occupancy">${autoOptions('occupancyState')}</select></label>
      <label class="control-label">Biome<select id="smm-biome">${autoOptions('biome')}</select></label>
      <label class="control-label">Weather<select id="smm-weather">${autoOptions('weather')}</select></label>
      <label class="control-label">Ecology<select id="smm-ecology">${autoOptions('ecology')}</select></label>
      <details><summary>Advanced environmental, historical, and institutional layers</summary><div class="module-card">
        <label class="control-label">Climate<select id="smm-climate">${autoOptions('climate')}</select></label>
        <label class="control-label">Season<select id="smm-season">${autoOptions('season')}</select></label>
        <label class="control-label">Condition<select id="smm-condition">${autoOptions('condition')}</select></label>
        <label class="control-label">Water state<select id="smm-water">${autoOptions('waterState')}</select></label>
        <label class="control-label">Verticality<select id="smm-verticality">${autoOptions('verticality')}</select></label>
        <label class="control-label">Security model<select id="smm-security">${autoOptions('security')}</select></label>
        <label class="control-label">Defense doctrine<select id="smm-defense">${autoOptions('defenseDoctrine')}</select></label>
        <label class="control-label">Magic / technology<select id="smm-magic-tech">${autoOptions('magicTech')}</select></label>
        <label class="control-label">Wealth<select id="smm-wealth">${autoOptions('wealth')}</select></label>
        <label class="control-label">Maintenance<select id="smm-maintenance">${autoOptions('maintenance')}</select></label>
        <label class="control-label">Contamination<select id="smm-contamination">${autoOptions('contamination')}</select></label>
        <label class="control-label">Traffic<select id="smm-traffic">${autoOptions('traffic')}</select></label>
        <label class="control-label">Social mode<select id="smm-social-mode">${autoOptions('socialMode')}</select></label>
        <label class="control-label">Resource profile<select id="smm-resource">${autoOptions('resourceProfile')}</select></label>
        <label class="control-label">Secret density<select id="smm-secret-density">${autoOptions('secretDensity')}</select></label>
        <label class="control-label">Lighting<select id="smm-lighting">${autoOptions('lighting')}</select></label>
        <label class="control-label">Narrative tone<select id="smm-tone">${autoOptions('narrativeTone')}</select></label>
      </div></details>
      <label class="control-label">Preferred creature families<input id="smm-creature-preferred" placeholder="fungus, undead, beast"></label>
      <label class="control-label">Excluded creature families<input id="smm-creature-excluded" placeholder="ooze, dragon"></label>
      <label class="control-label">Preferred hazard families<input id="smm-hazard-preferred" placeholder="spores, structural, cold"></label>
      <label class="control-label">Excluded hazard families<input id="smm-hazard-excluded" placeholder="radiation, lava"></label>
      <label class="control-label">Creature density<input id="smm-creature-density" type="number" min="0" max="10" value="4"></label>
      <label class="control-label">Hazard intensity<input id="smm-hazard-intensity" type="number" min="0" max="10" value="4"></label>
      <label class="control-label">Treasure density<input id="smm-treasure-density" type="number" min="0" max="10" value="4"></label>
      <label class="control-label">Social density<input id="smm-social-density" type="number" min="0" max="10" value="4"></label>
      <label class="control-label">Rules family<select id="smm-rules"><option value="open_d20">Open d20 / Hypertext d20-compatible</option><option value="world_of_darkness">World of Darkness</option><option value="blacklight_continuum">Blacklight Continuum</option><option value="kaysender">Kaysender</option></select></label>
      <label class="control-label">Width override<input id="smm-width" type="number" min="30" max="240" placeholder="profile default"></label>
      <label class="control-label">Height override<input id="smm-height" type="number" min="30" max="240" placeholder="profile default"></label>
      <button id="smm-generate" class="primary-action" type="button">Generate Layered Site</button>
      <details><summary>Full site option catalog</summary><pre class="module-source-text" style="max-height:420px">${JSON.stringify(catalog.axes,null,2)}</pre></details>
      <pre id="smm-output" class="module-source-text" style="margin-top:12px;max-height:720px"></pre>
    </div>`;host.appendChild(section);
    section.querySelector('#smm-generate').onclick=()=>{const val=id=>section.querySelector(`#${id}`)?.value||'',num=id=>{const v=val(id);return v===''?undefined:Number(v);};const input={seed:val('smm-seed'),locationArchetype:val('smm-archetype'),siteScale:val('smm-scale')||undefined,culturalInfluence:val('smm-culture')||undefined,currentController:val('smm-controller')||undefined,occupancyState:val('smm-occupancy')||undefined,biome:val('smm-biome')||undefined,climate:val('smm-climate')||undefined,season:val('smm-season')||undefined,weather:val('smm-weather')||undefined,ecology:val('smm-ecology')||undefined,condition:val('smm-condition')||undefined,waterState:val('smm-water')||undefined,verticality:val('smm-verticality')||undefined,security:val('smm-security')||undefined,defenseDoctrine:val('smm-defense')||undefined,magicTech:val('smm-magic-tech')||undefined,wealth:val('smm-wealth')||undefined,maintenance:val('smm-maintenance')||undefined,contamination:val('smm-contamination')||undefined,traffic:val('smm-traffic')||undefined,socialMode:val('smm-social-mode')||undefined,resourceProfile:val('smm-resource')||undefined,secretDensity:val('smm-secret-density')||undefined,lighting:val('smm-lighting')||undefined,narrativeTone:val('smm-tone')||undefined,creatureDensity:num('smm-creature-density'),hazardIntensity:num('smm-hazard-intensity'),treasureDensity:num('smm-treasure-density'),socialDensity:num('smm-social-density'),rulesTarget:val('smm-rules'),width:num('smm-width'),height:num('smm-height'),sitePreferences:{creatureFamilies:{preferred:list(val('smm-creature-preferred')),exclude:list(val('smm-creature-excluded'))},hazardFamilies:{preferred:list(val('smm-hazard-preferred')),exclude:list(val('smm-hazard-excluded'))}}};const map=window.generator.module_map.generate(input);section.querySelector('#smm-output').textContent=JSON.stringify({seed:map.seed,locationArchetype:map.locationArchetype,resolvedAxes:map.siteProfile.axes,scalars:map.siteProfile.scalars,creatureFamilies:map.siteProfile.creatureFamilies,hazardFamilies:map.siteProfile.hazardFamilies,materials:map.siteProfile.materials,layers:map.siteProfile.layers,interactions:map.siteProfile.interactions,size:`${map.width}x${map.height}`,deckCount:map.deckCount,rooms:map.spatialLayout.rooms.map(r=>({id:r.nodeId,role:r.role,label:r.label,deck:r.deck,tags:r.tags,historicalUse:r.metadata?.currentUse?{originalRole:r.metadata.originalRole,originalLabel:r.metadata.originalLabel,currentUse:r.metadata.currentUse,currentUseOverlays:r.metadata.currentUseOverlays,adaptations:r.metadata.adaptations,interactionIds:r.metadata.interactionIds}:null})),content:map.content.rooms,compatibility:map.compatibility,validation:map.spatialLayout.validation},null,2);document.dispatchEvent(new CustomEvent('module-map-generator-output',{detail:map}));};section.scrollIntoView({behavior:'smooth',block:'start'});}
  ensureRuntime().then(mount).catch(error=>console.error('Semantic module map generator failed to initialize.',error));
})();
