(() => {
  'use strict';

  const standard = globalThis.HBStandardPotionData;
  const engine = globalThis.HBStandardPotionEngine;
  const formulary = globalThis.HBMedicinalPotionData;
  if (!standard || !engine || !formulary) return;

  const STORAGE_KEY = 'hb-ttrpg-srd-potion-shelf-v1';
  const state = { current: null };
  const esc = value => String(value ?? '').replace(/[&<>"']/g, character => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]));
  const fmt = value => Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 });
  const newSeed = () => `srd-potion-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e8).toString(36)}`;
  const options = (items, selected = 'random', randomLabel = 'Random') => `<option value="random">${esc(randomLabel)}</option>${items.map(item => `<option value="${esc(item.id)}"${item.id === selected ? ' selected' : ''}>${esc(item.label || item.name)}</option>`).join('')}`;

  function loadShelf() { try { const values = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); return Array.isArray(values) ? values : []; } catch { return []; } }
  function saveShelf(values) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(values.slice(0, 60))); } catch { /* optional */ } }

  function installPanel() {
    const tabs = document.querySelector('.potion-section-tabs');
    const module = document.querySelector('.potion-module');
    if (!tabs || !module || document.getElementById('potion-srd')) return;

    const button = document.createElement('button');
    button.className = 'potion-section-tab';
    button.type = 'button';
    button.dataset.section = 'srd';
    button.textContent = 'SRD Potions & Oils';
    const referenceButton = tabs.querySelector('[data-section="reference"]');
    tabs.insertBefore(button, referenceButton || null);

    const panel = document.createElement('section');
    panel.id = 'potion-srd';
    panel.className = 'potion-section-panel';
    panel.hidden = true;
    panel.innerHTML = `
      <div class="potion-reference-card srd-intro">
        <p class="eyebrow">Open-d20 standard table</p>
        <h3>Standard Potions and Oils</h3>
        <p>Roll directly on the SRD Minor, Medium, or Major treasure column, then turn the selected standard effect into a proprietary manufactured formula with ingredients, preparation, quality, aging, smell, flavor, and present batch condition.</p>
        <p class="helper-note">The SRD treasure columns are probability tables. They are separate from the project potency sequence Medicinal → Minor → Medium → Major → Elixir.</p>
      </div>
      <form id="srd-potion-form" class="potion-controls">
        <div class="potion-control-grid">
          <label><span>SRD treasure column</span><select class="tool-input" name="category">${standard.categories.map(item => `<option value="${item.id}">${esc(item.label)}</option>`).join('')}</select></label>
          <label><span>Exact d100 roll</span><input class="tool-input" name="roll" type="number" min="1" max="100" step="1" placeholder="Blank = seeded roll"></label>
          <label><span>Maker tradition</span><select class="tool-input" name="origin">${options(formulary.originTypes)}</select></label>
          <label><span>Batch quality</span><select class="tool-input" name="quality">${options(formulary.qualities)}</select></label>
          <label><span>Age preset</span><select class="tool-input" name="agePreset">${formulary.agePresets.map(item => `<option value="${item.id}"${item.id === 'fresh' ? ' selected' : ''}>${esc(item.label)}</option>`).join('')}</select></label>
          <label><span>Exact age in years</span><input class="tool-input" name="ageYears" type="number" min="0" step="0.01" value="0.02"></label>
          <label><span>Storage history</span><select class="tool-input" name="storage">${options(formulary.storageConditions, 'healer-cabinet')}</select></label>
          <label><span>Bottle and seal</span><select class="tool-input" name="bottle">${options(formulary.bottles)}</select></label>
          <label><span>Primary activator</span><select class="tool-input" name="activator">${options(formulary.activators)}</select></label>
          <label class="potion-seed-field"><span>Formula seed</span><input class="tool-input" name="seed" value="${newSeed()}"><button type="button" class="secondary-action" id="srd-potion-new-seed">New table seed</button></label>
        </div>
        <div class="potion-actions"><button class="primary-action" type="submit">Roll Standard Potion or Oil</button><button class="secondary-action" id="srd-potion-save" type="button">Save</button><button class="secondary-action" id="srd-potion-copy" type="button">Copy</button><button class="secondary-action" id="srd-potion-export" type="button">Export JSON</button></div>
      </form>
      <div id="srd-potion-status" class="potion-status" role="status"></div>
      <div id="srd-potion-output"></div>
      <section class="potion-reference-card srd-table-card">
        <div class="srd-table-heading"><div><p class="eyebrow">Exact d100 coverage</p><h3 id="srd-table-title">Minor Treasure Column</h3></div><a class="secondary-action srd-source-link" href="${esc(standard.source.url)}" target="_blank" rel="noopener">Open SRD Source</a></div>
        <div class="srd-table-wrap"><table class="srd-potion-table"><thead><tr><th>d100</th><th>Potion or oil</th><th>Type</th><th>Price</th></tr></thead><tbody id="srd-potion-table-body"></tbody></table></div>
      </section>
      <section class="potion-reference-card"><p class="eyebrow">Saved standard formulas</p><h3>SRD Formula Shelf</h3><div id="srd-potion-shelf"></div></section>`;
    module.appendChild(panel);

    button.addEventListener('click', () => {
      document.querySelectorAll('.potion-section-tab').forEach(tab => tab.classList.toggle('active', tab === button));
      document.querySelectorAll('.potion-section-panel').forEach(section => { section.hidden = section !== panel; });
      renderTable(document.getElementById('srd-potion-form').elements.category.value);
      renderShelf();
    });
  }

  function formValues() {
    const form = document.getElementById('srd-potion-form');
    const values = Object.fromEntries(new FormData(form).entries());
    if (!String(values.seed || '').trim()) { values.seed = newSeed(); form.elements.seed.value = values.seed; }
    if (values.roll === '') delete values.roll; else values.roll = Number(values.roll);
    if (values.ageYears === '') delete values.ageYears; else values.ageYears = Number(values.ageYears);
    return values;
  }
  function status(message, error = false) { const element = document.getElementById('srd-potion-status'); if (element) { element.textContent = message; element.classList.toggle('is-error', error); } }
  function warningClass(text) { return /unsafe|containment/i.test(text) ? 'potion-danger' : /assay|specialist|dilute|reconstitute/i.test(text) ? 'potion-caution' : 'potion-safe'; }
  function rangeText(range) { if (!range) return '—'; return range[0] === range[1] ? String(range[0]).padStart(2, '0') : `${String(range[0]).padStart(2, '0')}–${String(range[1]).padStart(2, '0')}`; }

  function renderTable(category) {
    const body = document.getElementById('srd-potion-table-body');
    const title = document.getElementById('srd-table-title');
    if (!body || !title) return;
    const definition = standard.categories.find(item => item.id === category);
    title.textContent = definition?.label || category;
    body.innerHTML = engine.rollTable(category).map(entry => `<tr${state.current?.sourceEntry.id === entry.id && state.current?.sourceEntry.treasureCategory === category ? ' class="is-current"' : ''}><td><strong>${esc(rangeText(entry.selectedRange))}</strong></td><td>${esc(entry.label)}</td><td>${esc(entry.itemType.replace(/-/g, ' / '))}</td><td>${fmt(entry.marketPriceGp)} gp</td></tr>`).join('');
  }

  function renderResult(potion) {
    const output = document.getElementById('srd-potion-output');
    if (!output) return;
    output.innerHTML = `<article class="potion-result-card srd-result-card"><header class="potion-result-header"><div><p class="eyebrow">${esc(potion.formulaIdentity.manufacturer)} · ${esc(potion.formulaIdentity.originLabel)}</p><h3>${esc(potion.formulaIdentity.name)}</h3><p><strong>Standard source effect:</strong> ${esc(potion.sourceEntry.label)}. ${esc(potion.effect.mechanics)}</p></div><div class="potion-price"><strong>${fmt(potion.value.amount)}</strong><span>appraised gp</span><small>SRD base ${fmt(potion.value.sourceMarketPriceGp)} gp</small></div></header>
      <div class="module-meta"><span class="badge">d100 ${potion.sourceEntry.roll}</span><span class="badge">${esc(potion.sourceEntry.treasureCategoryLabel)}</span><span class="badge">${esc(potion.sourceEntry.itemType)}</span><span class="badge">${esc(potion.tier.label)} formula tier</span><span class="badge">${esc(potion.batch.quality.label)}</span><span class="badge">${esc(potion.batch.ageOutcome)}</span></div>
      <div class="potion-summary-grid"><div><span>Spell level</span><strong>${potion.sourceEntry.spellLevel}</strong></div><div><span>Caster level</span><strong>${potion.sourceEntry.casterLevel}</strong></div><div><span>Current potency</span><strong>${potion.mechanics.potencyPercent}%</strong></div><div><span>Present state</span><strong>${esc(potion.batch.physicalState)}</strong></div></div>
      <div class="potion-safety-banner ${warningClass(potion.batch.safety)}"><strong>Safety:</strong> ${esc(potion.batch.safety)}</div>
      <div class="potion-detail-grid"><section class="potion-detail"><h4>SRD table position</h4><p><strong>Minor:</strong> ${esc(potion.sourceEntry.rangeLabels.minor)} · <strong>Medium:</strong> ${esc(potion.sourceEntry.rangeLabels.medium)} · <strong>Major:</strong> ${esc(potion.sourceEntry.rangeLabels.major)}</p><p><strong>Selected roll:</strong> ${potion.sourceEntry.roll} on ${esc(potion.sourceEntry.treasureCategoryLabel)}.</p><p>${esc(potion.tier.classificationNote)}</p></section>
      <section class="potion-detail"><h4>Proprietary recipe</h4><ul class="potion-ingredient-list"><li><strong>Primary ingredient</strong><span>${esc(potion.recipe.primaryIngredient.name)} · ${esc(potion.recipe.primaryIngredient.rarity)}</span></li><li><strong>Carrier</strong><span>${esc(potion.recipe.carrierBase.name)}</span></li>${potion.recipe.reagents.map(reagent => `<li><strong>Reagent</strong><span>${esc(reagent.name)}</span></li>`).join('')}<li><strong>Preparation</strong><span>${esc(potion.recipe.preparation.label)}</span></li><li><strong>Activator</strong><span>${esc(potion.recipe.primaryActivator.name)}</span></li></ul></section>
      <section class="potion-detail"><h4>Flavor</h4><p>${esc(potion.sensory.flavor)}</p><h4>Smell</h4><p>${esc(potion.sensory.smell)}</p><p>${esc(potion.sensory.linkage)}</p></section>
      <section class="potion-detail"><h4>Container and age</h4><p><strong>Bottle:</strong> ${esc(potion.batch.bottle.label)}; ${esc(potion.batch.bottle.seal)}.</p><p><strong>Storage:</strong> ${esc(potion.batch.storage.label)}. ${esc(potion.batch.storage.description)}</p><p><strong>Age:</strong> ${fmt(potion.batch.ageYears)} years against an expected shelf life of ${fmt(potion.aging.nominalShelfLifeYears)} years.</p><p>${esc(potion.aging.outcomeDescription)}</p></section>
      <section class="potion-detail potion-detail-wide"><h4>Use and administration</h4><p>${esc(potion.recipe.directions)}</p><p><strong>Unconscious creature:</strong> ${esc(potion.mechanics.unconsciousAdministration)}</p>${potion.mechanics.adverseEffect ? `<div class="potion-warning"><strong>Generated adverse effect:</strong> ${esc(potion.mechanics.adverseEffect)}</div>` : `<p><strong>Adverse-effect risk:</strong> ${Math.round(potion.mechanics.adverseRisk * 100)}%; no adverse effect manifested in this generated dose.</p>`}</section></div></article>`;
  }

  function generate() { try { state.current = engine.generate(formValues()); renderResult(state.current); renderTable(state.current.sourceEntry.treasureCategory); status(`${state.current.formulaIdentity.fullName} rolled at ${state.current.sourceEntry.roll}: ${state.current.sourceEntry.label}.`); } catch (error) { status(error.message, true); } }
  function plainText(potion) { return `${potion.formulaIdentity.fullName}\nSRD result: ${potion.sourceEntry.label}\nTable: ${potion.sourceEntry.treasureCategoryLabel}, d100 ${potion.sourceEntry.roll}\nRanges: Minor ${potion.sourceEntry.rangeLabels.minor}; Medium ${potion.sourceEntry.rangeLabels.medium}; Major ${potion.sourceEntry.rangeLabels.major}\nType: ${potion.sourceEntry.itemType}\nSpell level / caster level: ${potion.sourceEntry.spellLevel} / ${potion.sourceEntry.casterLevel}\nSRD base price: ${potion.value.sourceMarketPriceGp} gp\nAppraised batch value: ${potion.value.amount} gp\nQuality and age: ${potion.batch.quality.label}; ${potion.batch.ageYears} years; ${potion.batch.ageOutcome}\nSafety: ${potion.batch.safety}\nIngredients: ${potion.recipe.primaryIngredient.name}; ${potion.recipe.carrierBase.name}; ${potion.recipe.reagents.map(item => item.name).join(', ')}\nActivator: ${potion.recipe.primaryActivator.name}\nFlavor: ${potion.sensory.flavor}\nSmell: ${potion.sensory.smell}\nRules: ${potion.effect.mechanics}`; }
  async function copyCurrent() { if (!state.current) return; try { await navigator.clipboard.writeText(plainText(state.current)); status('Standard potion or oil copied.'); } catch { status('Clipboard access failed.', true); } }
  function exportCurrent() { if (!state.current) return; const url = URL.createObjectURL(new Blob([JSON.stringify(state.current, null, 2)], { type: 'application/json' })); const link = document.createElement('a'); link.href = url; link.download = `${state.current.formulaIdentity.id}-${state.current.sourceEntry.treasureCategory}-${state.current.sourceEntry.roll}.json`; link.click(); URL.revokeObjectURL(url); }
  function saveCurrent() { if (!state.current) return; const values = loadShelf(); values.unshift(state.current); saveShelf(values); renderShelf(); status('Standard potion or oil saved in this browser.'); }

  function renderShelf() {
    const target = document.getElementById('srd-potion-shelf');
    if (!target) return;
    const values = loadShelf();
    target.innerHTML = values.length ? `<div class="potion-shelf">${values.map((potion, index) => `<article class="potion-shelf-card"><div><h3>${esc(potion.formulaIdentity.fullName)}</h3><p>${esc(potion.sourceEntry.label)} · ${esc(potion.sourceEntry.treasureCategoryLabel)} ${potion.sourceEntry.roll} · ${fmt(potion.value.amount)} gp</p></div><div class="potion-shelf-actions"><button class="secondary-action" data-srd-load="${index}">Load</button><button class="danger-action" data-srd-delete="${index}">Delete</button></div></article>`).join('')}</div>` : '<div class="module-empty">No standard potion or oil formulas are saved.</div>';
  }

  function installControls() {
    installPanel();
    const form = document.getElementById('srd-potion-form');
    if (!form || form.dataset.installed === 'true') return;
    form.dataset.installed = 'true';
    form.addEventListener('submit', event => { event.preventDefault(); generate(); });
    form.elements.category.addEventListener('change', event => renderTable(event.target.value));
    form.elements.agePreset.addEventListener('change', event => { const preset = formulary.agePresets.find(item => item.id === event.target.value); form.elements.ageYears.value = preset?.years ?? ''; });
    document.getElementById('srd-potion-new-seed').addEventListener('click', () => { form.elements.seed.value = newSeed(); form.elements.roll.value = ''; generate(); });
    document.getElementById('srd-potion-copy').addEventListener('click', copyCurrent);
    document.getElementById('srd-potion-export').addEventListener('click', exportCurrent);
    document.getElementById('srd-potion-save').addEventListener('click', saveCurrent);
    document.getElementById('srd-potion-shelf').addEventListener('click', event => {
      const load = event.target.closest('[data-srd-load]');
      const remove = event.target.closest('[data-srd-delete]');
      const values = loadShelf();
      if (load) { state.current = values[Number(load.dataset.srdLoad)]; renderResult(state.current); renderTable(state.current.sourceEntry.treasureCategory); status(`${state.current.formulaIdentity.fullName} loaded.`); }
      if (remove) { values.splice(Number(remove.dataset.srdDelete), 1); saveShelf(values); renderShelf(); }
    });
    renderTable('minor');
    renderShelf();
    const errors = engine.validateData();
    if (errors.length) status(errors.join(' '), true); else generate();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', installControls, { once: true }); else installControls();
})();