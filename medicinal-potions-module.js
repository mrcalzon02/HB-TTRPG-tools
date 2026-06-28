(() => {
  'use strict';
  const data = globalThis.HBMedicinalPotionData;
  const engine = globalThis.HBMedicinalPotionEngine;
  if (!data || !engine) return;

  const STORE = 'hb-ttrpg-potion-formulary-v2';
  const state = { current: null };
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fmt = value => Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 });
  const seed = () => `formula-${Date.now().toString(36)}-${Math.floor(Math.random()*1e8).toString(36)}`;
  const options = (items, selected='random', random='Random') => `<option value="random">${esc(random)}</option>${items.map(x=>`<option value="${esc(x.id)}"${x.id===selected?' selected':''}>${esc(x.label||x.name)}</option>`).join('')}`;
  const shelf = () => { try { const value=JSON.parse(localStorage.getItem(STORE)||'[]'); return Array.isArray(value)?value:[]; } catch { return []; } };
  const saveShelf = value => { try { localStorage.setItem(STORE, JSON.stringify(value.slice(0,60))); } catch {} };

  function mount() {
    const root=document.getElementById('medicinal-potions-root');
    if (!root || root.dataset.mounted) return root;
    root.dataset.mounted='true';
    root.innerHTML=`<section class="potion-module">
      <header class="potion-module-heading"><div><p class="eyebrow">Medicinal through Elixir · formula-first generator</p><h2>Potion Formulary</h2><p>Generate a proprietary formula and a specific historical batch. Manufacturer tradition, naming grammar, ingredients, preparation and activator define the formula; quality, bottle, storage and elapsed age define the surviving batch.</p></div><span class="badge status-active">schema ${esc(data.schemaVersion)}</span></header>
      <div class="potion-section-tabs" role="tablist"><button class="potion-section-tab active" data-section="generate">Generate Batch</button><button class="potion-section-tab" data-section="aging">Aging Laboratory</button><button class="potion-section-tab" data-section="reference">Rules Reference</button><button class="potion-section-tab" data-section="saved">Saved Formulas</button></div>
      <section id="potion-generate" class="potion-section-panel"><form id="potion-form" class="potion-controls"><div class="potion-control-grid">
        <label><span>Potency tier</span><select class="tool-input" name="tier">${options(data.tiers,'medicinal','Random tier')}</select></label>
        <label><span>Treatment purpose</span><select class="tool-input" name="effect" id="potion-effect"></select></label>
        <label><span>Maker tradition</span><select class="tool-input" name="origin">${options(data.originTypes)}</select></label>
        <label><span>Batch quality</span><select class="tool-input" name="quality">${options(data.qualities)}</select></label>
        <label><span>Age preset</span><select class="tool-input" name="agePreset">${data.agePresets.map(x=>`<option value="${x.id}"${x.id==='fresh'?' selected':''}>${esc(x.label)}</option>`).join('')}</select></label>
        <label><span>Exact age in years</span><input class="tool-input" name="ageYears" type="number" min="0" step="0.01" value="0.02"></label>
        <label><span>Storage history</span><select class="tool-input" name="storage">${options(data.storageConditions,'healer-cabinet')}</select></label>
        <label><span>Bottle and seal</span><select class="tool-input" name="bottle">${options(data.bottles)}</select></label>
        <label><span>Primary activator</span><select class="tool-input" name="activator">${options(data.activators)}</select></label>
        <label class="potion-seed-field"><span>Formula seed</span><input class="tool-input" name="seed" value="${seed()}"><button type="button" class="secondary-action" id="potion-new-seed">New formula seed</button></label>
      </div><div class="potion-actions"><button class="primary-action" type="submit">Generate Potion Batch</button><button class="secondary-action" id="potion-save" type="button">Save</button><button class="secondary-action" id="potion-copy" type="button">Copy</button><button class="secondary-action" id="potion-export" type="button">Export JSON</button></div>
      <p class="helper-note"><strong>Medicinal</strong> is the common household and village tier below Minor. Minor, Medium, Major and Elixir use the project healing benchmarks 1d4, 1d6, 1d10 and 1d20 where healing applies.</p></form><div id="potion-status" class="potion-status" role="status"></div><div id="potion-output"></div></section>
      <section id="potion-aging" class="potion-section-panel" hidden></section><section id="potion-reference" class="potion-section-panel" hidden></section><section id="potion-saved" class="potion-section-panel" hidden></section>
    </section>`;
    return root;
  }

  function rank(id){ return data.tiers.find(x=>x.id===id)?.rank ?? 0; }
  function refreshEffects(){
    const form=document.getElementById('potion-form'), select=document.getElementById('potion-effect'); if(!form||!select)return;
    const current=select.value, tier=rank(form.elements.tier.value);
    const eligible=data.effects.filter(x=>tier>=rank(x.minTier)&&tier<=rank(x.maxTier));
    select.innerHTML=options(eligible,eligible.some(x=>x.id===current)?current:'random','Random compatible purpose');
  }
  function readForm(){
    const form=document.getElementById('potion-form'); const value=Object.fromEntries(new FormData(form).entries());
    if(!value.seed.trim()){ value.seed=seed(); form.elements.seed.value=value.seed; }
    if(value.ageYears!=='') value.ageYears=Number(value.ageYears); else delete value.ageYears;
    return value;
  }
  function status(message,error=false){ const el=document.getElementById('potion-status'); if(el){el.textContent=message;el.classList.toggle('is-error',error);} }
  function warningClass(text){ return /unsafe|containment/i.test(text)?'potion-danger':/assay|specialist|dilute|reconstitute/i.test(text)?'potion-caution':'potion-safe'; }

  function render(p){
    const out=document.getElementById('potion-output'); if(!out)return;
    const die=p.tier.healingDie||'Condition-specific; no standard healing die';
    out.innerHTML=`<article class="potion-result-card"><header class="potion-result-header"><div><p class="eyebrow">${esc(p.formulaIdentity.manufacturer)} · ${esc(p.formulaIdentity.originLabel)}</p><h3>${esc(p.formulaIdentity.name)}</h3><p>${esc(p.effect.label)} — ${esc(p.effect.mechanics)}</p></div><div class="potion-price"><strong>${fmt(p.value.amount)}</strong><span>${esc(p.value.currency)}</span></div></header>
      <div class="module-meta"><span class="badge">${esc(p.tier.label)}</span><span class="badge">${esc(p.batch.quality.label)}</span><span class="badge">${esc(p.batch.ageBandLabel)}</span><span class="badge">${esc(p.batch.ageOutcome)}</span></div>
      <div class="potion-summary-grid"><div><span>Tier benchmark</span><strong>${esc(die)}</strong></div><div><span>Current potency</span><strong>${p.mechanics.potencyPercent}%</strong></div><div><span>Elapsed age</span><strong>${fmt(p.batch.ageYears)} years</strong></div><div><span>Present state</span><strong>${esc(p.batch.physicalState)}</strong></div></div>
      <div class="potion-safety-banner ${warningClass(p.batch.safety)}"><strong>Safety:</strong> ${esc(p.batch.safety)}</div>
      <div class="potion-detail-grid"><section class="potion-detail"><h4>Formula identity</h4><p><strong>Formal name:</strong> ${esc(p.formulaIdentity.fullName)}</p><p>${esc(p.formulaIdentity.originDescription)}</p><p><code>${esc(p.formulaIdentity.id)}</code></p></section>
      <section class="potion-detail"><h4>Recipe</h4><ul class="potion-ingredient-list"><li><strong>Primary ingredient</strong><span>${esc(p.recipe.primaryIngredient.name)} · ${esc(p.recipe.primaryIngredient.rarity)}</span></li><li><strong>Carrier</strong><span>${esc(p.recipe.carrierBase.name)}</span></li>${p.recipe.reagents.map(x=>`<li><strong>Reagent</strong><span>${esc(x.name)}</span></li>`).join('')}<li><strong>Preparation</strong><span>${esc(p.recipe.preparation.label)}</span></li><li><strong>Activator</strong><span>${esc(p.recipe.primaryActivator.name)}</span></li></ul></section>
      <section class="potion-detail"><h4>Flavor</h4><p>${esc(p.sensory.flavor)}</p><h4>Smell</h4><p>${esc(p.sensory.smell)}</p><p>${esc(p.sensory.linkage)}</p></section>
      <section class="potion-detail"><h4>Batch history</h4><p><strong>Bottle:</strong> ${esc(p.batch.bottle.label)}; ${esc(p.batch.bottle.seal)}.</p><p><strong>Storage:</strong> ${esc(p.batch.storage.label)}. ${esc(p.batch.storage.description)}</p><p><strong>Expected shelf life:</strong> ${fmt(p.aging.nominalShelfLifeYears)} years.</p><p>${esc(p.aging.outcomeDescription)}</p></section>
      <section class="potion-detail potion-detail-wide"><h4>Preparation and administration</h4><p>${esc(p.recipe.directions)}</p>${p.mechanics.adverseEffect?`<div class="potion-warning"><strong>Generated adverse effect:</strong> ${esc(p.mechanics.adverseEffect)}</div>`:`<p><strong>Adverse-effect risk:</strong> ${Math.round(p.mechanics.adverseRisk*100)}%; no adverse effect manifested in this generated dose.</p>`}</section></div></article>`;
  }

  function generate(){ try{ state.current=engine.generate(readForm()); render(state.current); status(`${state.current.formulaIdentity.fullName} generated as ${state.current.batch.ageOutcome}.`); }catch(error){status(error.message,true);} }
  function text(p){return `${p.formulaIdentity.fullName}\nTier: ${p.tier.label}${p.tier.healingDie?` (${p.tier.healingDie})`:''}\nEffect: ${p.effect.mechanics}\nQuality: ${p.batch.quality.label}\nAge: ${p.batch.ageYears} years — ${p.batch.ageOutcome}\nState: ${p.batch.physicalState}\nSafety: ${p.batch.safety}\nIngredients: ${p.recipe.primaryIngredient.name}; ${p.recipe.carrierBase.name}; ${p.recipe.reagents.map(x=>x.name).join(', ')}\nActivator: ${p.recipe.primaryActivator.name}\nFlavor: ${p.sensory.flavor}\nSmell: ${p.sensory.smell}\nValue: ${p.value.amount} ${p.value.currency}`;}
  async function copy(){if(!state.current)return;try{await navigator.clipboard.writeText(text(state.current));status('Potion copied.');}catch{status('Clipboard access failed.',true);}}
  function exportJson(){if(!state.current)return;const url=URL.createObjectURL(new Blob([JSON.stringify(state.current,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=`${state.current.formulaIdentity.id}-${state.current.batch.ageYears}y.json`;a.click();URL.revokeObjectURL(url);}
  function save(){if(!state.current)return;const values=shelf();values.unshift(state.current);saveShelf(values);renderSaved();status('Potion saved in this browser.');}

  function renderAging(){
    const panel=document.getElementById('potion-aging'), series=engine.ageSeries(readForm(),[0.02,0.75,8,25,100]);
    panel.innerHTML=`<div class="potion-reference-card aging-intro"><h3>${esc(series[0].formulaIdentity.fullName)}</h3><p>The formula and recipe remain fixed; the same batch lineage is examined across time.</p></div><div class="potion-aging-grid">${series.map(p=>`<article class="potion-age-card"><span class="badge">${fmt(p.batch.ageYears)} years</span><h3>${esc(p.batch.ageOutcome)}</h3><p><strong>${esc(p.batch.ageBandLabel)}</strong> · ${esc(p.batch.physicalState)}</p><p>Potency ${p.mechanics.potencyPercent}% · ${fmt(p.value.amount)} ${esc(p.value.currency)}</p><p><strong>Safety:</strong> ${esc(p.batch.safety)}</p><p><strong>Smell:</strong> ${esc(p.sensory.smell)}</p></article>`).join('')}</div>`;
  }
  function renderReference(){
    const panel=document.getElementById('potion-reference');
    panel.innerHTML=`<div class="potion-reference-grid"><article class="potion-reference-card potion-reference-wide"><h3>Potency hierarchy</h3>${data.tiers.map(x=>`<div class="reference-row"><strong>${esc(x.label)}</strong><span>${x.healingDie?`${esc(x.healingDie)} benchmark · `:'No standard healing die · '}${esc(x.scope)}</span></div>`).join('')}</article><article class="potion-reference-card"><h3>Medicinal tier</h3><p>Common, condition-specific medicine made by physicians, witches, shamans, village healers and herbalists. It is slower and narrower than a magical combat potion, not automatically trivial.</p></article><article class="potion-reference-card"><h3>Formula versus batch</h3><p>The stable formula includes maker, name, effect, ingredients, recipe and activator. The batch adds quality, bottle, storage, exact age, potency drift and safety.</p></article><article class="potion-reference-card potion-reference-wide"><h3>Maker traditions</h3>${data.originTypes.map(x=>`<div class="reference-row"><strong>${esc(x.label)}</strong><span>${esc(x.description)}</span></div>`).join('')}</article></div>`;
  }
  function renderSaved(){
    const panel=document.getElementById('potion-saved'), values=shelf();
    panel.innerHTML=values.length?`<div class="potion-shelf">${values.map((p,i)=>`<article class="potion-shelf-card"><div><h3>${esc(p.formulaIdentity.fullName)}</h3><p>${esc(p.tier.label)} · ${esc(p.batch.ageOutcome)} · ${fmt(p.value.amount)} ${esc(p.value.currency)}</p></div><div class="potion-shelf-actions"><button class="secondary-action" data-load="${i}">Load</button><button class="danger-action" data-delete="${i}">Delete</button></div></article>`).join('')}</div>`:'<div class="module-empty">No saved potion formulas.</div>';
  }
  function section(id){
    document.querySelectorAll('.potion-section-tab').forEach(x=>x.classList.toggle('active',x.dataset.section===id));
    document.querySelectorAll('.potion-section-panel').forEach(x=>x.hidden=x.id!==`potion-${id}`);
    if(id==='aging')renderAging(); if(id==='reference')renderReference(); if(id==='saved')renderSaved();
  }
  function install(){
    mount(); refreshEffects();
    const form=document.getElementById('potion-form');
    form.addEventListener('submit',e=>{e.preventDefault();generate();});
    form.elements.tier.addEventListener('change',refreshEffects);
    form.elements.agePreset.addEventListener('change',e=>{const p=data.agePresets.find(x=>x.id===e.target.value);form.elements.ageYears.value=p?.years??'';});
    document.getElementById('potion-new-seed').onclick=()=>{form.elements.seed.value=seed();generate();};
    document.getElementById('potion-save').onclick=save; document.getElementById('potion-copy').onclick=copy; document.getElementById('potion-export').onclick=exportJson;
    document.querySelectorAll('.potion-section-tab').forEach(x=>x.onclick=()=>section(x.dataset.section));
    document.getElementById('potion-saved').onclick=e=>{const load=e.target.closest('[data-load]'), del=e.target.closest('[data-delete]');const values=shelf();if(load){state.current=values[Number(load.dataset.load)];render(state.current);section('generate');}if(del){values.splice(Number(del.dataset.delete),1);saveShelf(values);renderSaved();}};
    const errors=engine.validateData(); if(errors.length)status(errors.join(' '),true); else generate();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();