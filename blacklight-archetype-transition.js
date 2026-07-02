(() => {
  'use strict';

  const ENTRY_URL = 'data/blacklight-continuum/wiki/basic-archetypes.json';
  const RULES_URL = 'data/blacklight-continuum/rules/basic-character-options.json';
  const VAMPIRE_LINEAGE_URL = 'data/blacklight-continuum/rules/vampire-remainder-bloodlines.json';
  const SHAPECHANGER_VARIANT_URL = 'data/blacklight-continuum/rules/shapechanger-remainder-forms.json';
  const HARMONIC_VARIANT_URL = 'data/blacklight-continuum/rules/harmonic-compact-remainders.json';
  const TECHNOMANCER_VARIANT_URL = 'data/blacklight-continuum/rules/technomancer-awakening-practices.json';
  const STORAGE_KEY = 'hb-ttrpg-tools-blacklight-basic-character-v1';

  let archetypeWiki = null;
  let rulesData = null;
  let vampireLineageData = null;
  let shapechangerVariantData = null;
  let harmonicVariantData = null;
  let technomancerVariantData = null;

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, character => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[character]));
  }

  function injectStyles() {
    if (document.getElementById('blacklight-transition-style')) return;
    const style = document.createElement('style');
    style.id = 'blacklight-transition-style';
    style.textContent = `
      .blacklight-transition-profile{display:grid;gap:14px}
      .blacklight-transition-hero{border:1px solid rgba(200,138,53,.34);border-radius:16px;padding:15px;background:linear-gradient(120deg,rgba(89,42,122,.16),rgba(200,138,53,.08))}
      .blacklight-transition-hero h3{margin:0 0 6px}.blacklight-transition-hero p{color:var(--muted);line-height:1.58}
      .blacklight-family-catalog,.blacklight-lineage-catalog{display:grid;gap:16px}
      .blacklight-family-record,.blacklight-lineage-record{border:1px solid rgba(200,138,53,.34);border-radius:16px;padding:15px;background:rgba(255,255,255,.025)}
      .blacklight-family-record h3,.blacklight-lineage-record h3{margin:0 0 7px;color:var(--accent)}
      .blacklight-family-record>p,.blacklight-lineage-record p{color:var(--muted);line-height:1.56;margin:7px 0 12px}
      .blacklight-lineage-record summary{cursor:pointer;color:var(--accent);font-weight:900;font-size:1.02rem}
      .blacklight-lineage-record[open] summary{margin-bottom:12px}
      .blacklight-lineage-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin:12px 0}
      .blacklight-lineage-grid div{border-left:3px solid var(--accent);padding:9px 11px;background:rgba(200,138,53,.07);color:var(--muted);line-height:1.48}
      .blacklight-lineage-gift,.blacklight-lineage-bane,.blacklight-variant-method{border:1px solid var(--line);border-radius:12px;padding:11px;margin-top:9px;color:var(--muted);line-height:1.5}
      .blacklight-lineage-gift strong,.blacklight-lineage-bane strong,.blacklight-variant-method strong{color:var(--ink)}
      .blacklight-progression{display:grid;gap:8px;margin-top:10px}
      .blacklight-progression-step{border-top:1px solid var(--line);padding-top:9px;color:var(--muted);line-height:1.5}
      .blacklight-progression-step strong{color:var(--ink)}
      .blacklight-ranked-powers{display:grid;gap:8px}
      .blacklight-ranked-power{display:grid;grid-template-columns:72px minmax(150px,.55fr) minmax(0,2fr);gap:10px;padding:10px;border-top:1px solid var(--line)}
      .blacklight-ranked-power:first-child{border-top:0}
      .blacklight-ranked-power strong{color:var(--ink)}
      .blacklight-rank-badge{color:var(--accent);font-weight:900;text-transform:uppercase;letter-spacing:.08em;font-size:.72rem}
      .blacklight-ranked-power span:last-child{color:var(--muted);line-height:1.52}
      @media(max-width:900px){.blacklight-ranked-power,.blacklight-lineage-grid{grid-template-columns:1fr}}
      @media print{.blacklight-transition-hero,.blacklight-family-record,.blacklight-lineage-record{background:#fff!important;border-color:#555!important}.blacklight-transition-hero p,.blacklight-family-record>p,.blacklight-lineage-record p,.blacklight-ranked-power span:last-child{color:#222!important}.blacklight-family-record h3,.blacklight-lineage-record h3,.blacklight-ranked-power strong,.blacklight-rank-badge{color:#000!important}}
    `;
    document.head.appendChild(style);
  }

  function ensurePanel() {
    let panel = document.getElementById('blacklight-transition-panel');
    if (panel) return panel;
    const archetypePanel = document.querySelector('.blacklight-archetype-panel');
    if (!archetypePanel) return null;

    panel = document.createElement('section');
    panel.id = 'blacklight-transition-panel';
    panel.className = 'blacklight-sheet-panel';
    panel.innerHTML = `
      <div class="blacklight-section-heading">
        <div><p class="eyebrow">Complete capability catalog</p><h2>Archetype Power Families and Variants</h2></div>
        <span class="blacklight-panel-code">CAPABILITY</span>
      </div>
      <div id="blacklight-transition-profile" class="blacklight-transition-profile">
        <p class="helper-note">Select an Archetype to load its capability summary, variants, and six detailed power families.</p>
      </div>`;

    archetypePanel.insertAdjacentElement('afterend', panel);
    return panel;
  }

  function ensureDatalist(id, input) {
    let datalist = document.getElementById(id);
    if (!datalist) {
      datalist = document.createElement('datalist');
      datalist.id = id;
      input.insertAdjacentElement('afterend', datalist);
    }
    return datalist;
  }

  function ensureLineageInput() {
    const input = document.querySelector('[name="lineageVariant"]');
    if (!input) return null;
    input.id = input.id || 'blacklight-lineage';
    input.setAttribute('list', 'blacklight-lineage-options');
    ensureDatalist('blacklight-lineage-options', input);
    return input;
  }

  function restoreDynamicValues(fields) {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      const values = saved?.fields && typeof saved.fields === 'object' ? saved.fields : saved;
      if (!values || typeof values !== 'object') return;
      fields.forEach(field => {
        if (field && !field.value && values[field.name] != null) field.value = values[field.name];
      });
    } catch (_) {
      // Dynamic profile fields remain optional when local persistence is unavailable.
    }
  }

  function ensureTechnomancerFields() {
    const primary = ensureLineageInput();
    const grid = primary?.closest('.blacklight-field-grid');
    if (!primary || !grid) return [];

    const definitions = [
      ['technomancerOrder', 'Praxis Order', 'blacklight-technomancer-order-options', 'Choose a Praxis Order or enter Independent…'],
      ['technomancerCareer', 'Career Practice', 'blacklight-technomancer-career-options', 'Choose an advanced Career Practice or enter Undeclared…']
    ];

    const fields = definitions.map(([name, title, listId, placeholder]) => {
      let input = grid.querySelector(`[name="${name}"]`);
      if (!input) {
        const label = document.createElement('label');
        label.dataset.technomancerProfileField = 'true';
        label.append(document.createTextNode(title));
        input = document.createElement('input');
        input.name = name;
        input.type = 'text';
        input.placeholder = placeholder;
        input.setAttribute('list', listId);
        label.appendChild(input);
        grid.insertBefore(label, primary.closest('label')?.nextSibling || null);
      }
      ensureDatalist(listId, input);
      return input;
    });

    restoreDynamicValues(fields);
    return fields;
  }

  function variantCatalogsFor(archetypeId) {
    if (archetypeId === 'vampire' && vampireLineageData?.lineages?.length) {
      return [{
        id: 'remainder-bloodlines',
        title: 'Thirteen Remainder Bloodlines',
        eyebrow: 'Inherited undead society',
        code: '13 LINEAGES',
        legacyLabel: 'Society of Shadows legacy',
        selectionField: 'lineageVariant',
        variants: vampireLineageData.lineages
      }];
    }
    if (archetypeId === 'shapechanger' && shapechangerVariantData?.catalogs?.length) return shapechangerVariantData.catalogs;
    if (archetypeId === 'harmonic-mutant' && harmonicVariantData?.catalogs?.length) return harmonicVariantData.catalogs;
    if (archetypeId === 'technomancer' && technomancerVariantData?.catalogs?.length) return technomancerVariantData.catalogs;
    return [];
  }

  function variantFrameworkFor(archetypeId) {
    if (archetypeId === 'vampire') return vampireLineageData?.framework || '';
    if (archetypeId === 'shapechanger') return shapechangerVariantData?.framework || '';
    if (archetypeId === 'harmonic-mutant') return harmonicVariantData?.framework || '';
    if (archetypeId === 'technomancer') return technomancerVariantData?.framework || '';
    return '';
  }

  function fieldForCatalog(catalog) {
    return catalog.selectionField || 'lineageVariant';
  }

  function selectedVariantIds(archetypeId) {
    const selected = new Set();
    variantCatalogsFor(archetypeId).forEach(catalog => {
      const field = document.querySelector(`[name="${fieldForCatalog(catalog)}"]`);
      const value = field?.value?.trim().toLowerCase();
      if (!value) return;
      const match = (catalog.variants || []).find(variant =>
        variant.id.toLowerCase() === value || variant.name.toLowerCase() === value
      );
      if (match) selected.add(match.id);
    });
    return selected;
  }

  function populateDatalist(datalist, variants) {
    if (!datalist) return;
    datalist.innerHTML = '';
    (variants || []).forEach(variant => {
      const option = document.createElement('option');
      option.value = variant.name;
      option.label = variant.practice?.name || variant.method?.name || variant.gift?.name || variant.progression?.[0]?.name || '';
      datalist.appendChild(option);
    });
  }

  function setPrimaryLabel(text) {
    const input = ensureLineageInput();
    const label = input?.closest('label');
    if (!label) return;
    const textNode = [...label.childNodes].find(node => node.nodeType === Node.TEXT_NODE);
    if (textNode) textNode.nodeValue = text;
  }

  function populateVariantInputs(archetypeId) {
    const primary = ensureLineageInput();
    const extraFields = ensureTechnomancerFields();
    const extraLabels = [...document.querySelectorAll('[data-technomancer-profile-field]')];
    const catalogs = variantCatalogsFor(archetypeId);

    extraLabels.forEach(label => { label.hidden = archetypeId !== 'technomancer'; });

    if (!primary) return;
    if (archetypeId === 'technomancer') {
      setPrimaryLabel('Awakening Paradigm');
      primary.placeholder = 'Choose an Awakening Paradigm…';
      const paradigm = catalogs.find(catalog => fieldForCatalog(catalog) === 'lineageVariant');
      const order = catalogs.find(catalog => fieldForCatalog(catalog) === 'technomancerOrder');
      const career = catalogs.find(catalog => fieldForCatalog(catalog) === 'technomancerCareer');
      populateDatalist(document.getElementById('blacklight-lineage-options'), paradigm?.variants);
      populateDatalist(document.getElementById('blacklight-technomancer-order-options'), order?.variants);
      populateDatalist(document.getElementById('blacklight-technomancer-career-options'), career?.variants);
    } else {
      setPrimaryLabel('Lineage / Variant');
      const variants = catalogs.flatMap(catalog => catalog.variants || []);
      populateDatalist(document.getElementById('blacklight-lineage-options'), variants);
      if (archetypeId === 'vampire') primary.placeholder = 'Choose a Remainder Bloodline or enter Unaligned…';
      else if (archetypeId === 'shapechanger') primary.placeholder = 'Choose a Lunar Nation, Changing Form, or enter Unaligned…';
      else if (archetypeId === 'harmonic-mutant') primary.placeholder = 'Choose a Compact Remainder or enter Unaligned…';
      else primary.placeholder = 'Bloodline, shifting tradition, patron, resonance school…';
    }

    extraFields.forEach(field => {
      field.oninput = renderEntry;
      field.onchange = renderEntry;
    });
  }

  function renderPowerFamilies(archetype) {
    if (!archetype?.powerFamilies?.length) return '';
    return `
      <section>
        <div class="blacklight-section-heading"><div><p class="eyebrow">Six distinct advancement paths</p><h2>Complete Power Families</h2></div><span class="blacklight-panel-code">${archetype.powerFamilies.length} × 5</span></div>
        <div class="blacklight-family-catalog">${archetype.powerFamilies.map(family => `
          <article class="blacklight-family-record">
            <h3>${escapeHtml(family.name)}</h3>
            <p>${escapeHtml(family.description)}</p>
            <div class="blacklight-ranked-powers">${(family.abilities || []).map(ability => `
              <div class="blacklight-ranked-power">
                <span class="blacklight-rank-badge">Rank ${escapeHtml(ability.rank)}</span>
                <strong>${escapeHtml(ability.name)}</strong>
                <span>${escapeHtml(ability.effect)}</span>
              </div>`).join('')}</div>
          </article>`).join('')}</div>
      </section>`;
  }

  function renderMethod(label, method) {
    if (!method) return '';
    return `<div class="blacklight-variant-method"><strong>${escapeHtml(label)} — ${escapeHtml(method.name)}:</strong> ${escapeHtml(method.effect)}</div>`;
  }

  function renderVariantDetails(variant) {
    const skillList = variant.recommendedSkills || variant.trainedSkills || [];
    return `
      ${variant.favoredFamilies?.length ? `<p><strong>Favored power families:</strong> ${variant.favoredFamilies.map(escapeHtml).join(' · ')}</p>` : ''}
      ${skillList.length ? `<p><strong>${variant.trainedSkills ? 'Order-trained fields' : 'Recommended Skills'}:</strong> ${skillList.map(escapeHtml).join(' · ')}</p>` : ''}
      ${variant.entryRequirement ? `<p><strong>Entry requirement:</strong> ${escapeHtml(variant.entryRequirement)}</p>` : ''}
      ${renderMethod('Ruling Practice', variant.practice)}
      ${renderMethod('Order Method', variant.method)}
      ${renderMethod('Lineage Gift', variant.gift)}
      ${renderMethod('Lineage Bane', variant.bane)}
      ${variant.progression?.length ? `<div class="blacklight-progression">${variant.progression.map(step => `
        <div class="blacklight-progression-step"><strong>${escapeHtml(step.stage)} — ${escapeHtml(step.name)}:</strong> ${escapeHtml(step.effect)}</div>`).join('')}</div>` : ''}`;
  }

  function renderVariantCatalogs(archetypeId) {
    const catalogs = variantCatalogsFor(archetypeId);
    if (!catalogs.length) return '';
    const chosen = selectedVariantIds(archetypeId);
    const framework = variantFrameworkFor(archetypeId);
    return `
      <section>
        <p class="blacklight-callout">${escapeHtml(framework)}</p>
        ${catalogs.map(catalog => `
          <div class="blacklight-section-heading"><div><p class="eyebrow">${escapeHtml(catalog.eyebrow || 'Integrated variants')}</p><h2>${escapeHtml(catalog.title)}</h2></div><span class="blacklight-panel-code">${escapeHtml(catalog.code || `${(catalog.variants || []).length} VARIANTS`)}</span></div>
          <div class="blacklight-lineage-catalog">${(catalog.variants || []).map(variant => `
            <details class="blacklight-lineage-record" ${chosen.has(variant.id) ? 'open' : ''}>
              <summary>${escapeHtml(variant.name)}</summary>
              <div class="blacklight-lineage-grid">
                <div><strong>${escapeHtml(catalog.legacyLabel || 'Inherited legacy')}:</strong> ${escapeHtml(variant.legacy)}</div>
                <div><strong>Continuum translation:</strong> ${escapeHtml(variant.continuum)}</div>
              </div>
              ${renderVariantDetails(variant)}
            </details>`).join('')}</div>`).join('')}
      </section>`;
  }

  function entryIdForArchetype(archetypeId) {
    return archetypeId ? `${archetypeId}-archetype` : '';
  }

  function renderEntry() {
    const target = document.getElementById('blacklight-transition-profile');
    const archetypeId = document.getElementById('blacklight-archetype')?.value;
    if (!target || !archetypeWiki || !rulesData) return;
    populateVariantInputs(archetypeId);

    const entry = (archetypeWiki.entries || []).find(item => item.id === entryIdForArchetype(archetypeId));
    const archetype = (rulesData.archetypes || []).find(item => item.id === archetypeId);
    if (!entry || !archetype) {
      target.innerHTML = `
        <div class="blacklight-transition-hero">
          <h3>Capabilities Define the Archetype</h3>
          <p>Select an Archetype to review its Resource, Pressure, weakness, innate abilities, variants, and six complete power families.</p>
        </div>`;
      return;
    }

    target.innerHTML = `
      <div class="blacklight-transition-hero">
        <p class="eyebrow">${escapeHtml(entry.title)} capability entry</p>
        <h3>${escapeHtml(entry.summary)}</h3>
        ${(entry.body || []).map(paragraph => `<p>${escapeHtml(paragraph)}</p>`).join('')}
      </div>
      ${renderVariantCatalogs(archetypeId)}
      ${renderPowerFamilies(archetype)}`;
  }

  async function initialize() {
    injectStyles();
    const panel = ensurePanel();
    if (!panel) return;

    try {
      const [entryResponse, rulesResponse, vampireResponse, shapechangerResponse, harmonicResponse, technomancerResponse] = await Promise.all([
        fetch(ENTRY_URL, { cache: 'no-store' }),
        fetch(RULES_URL, { cache: 'no-store' }),
        fetch(VAMPIRE_LINEAGE_URL, { cache: 'no-store' }),
        fetch(SHAPECHANGER_VARIANT_URL, { cache: 'no-store' }),
        fetch(HARMONIC_VARIANT_URL, { cache: 'no-store' }),
        fetch(TECHNOMANCER_VARIANT_URL, { cache: 'no-store' })
      ]);
      if (!entryResponse.ok) throw new Error(`Archetype entry request failed with status ${entryResponse.status}.`);
      if (!rulesResponse.ok) throw new Error(`Power catalog request failed with status ${rulesResponse.status}.`);
      if (!vampireResponse.ok) throw new Error(`Vampire lineage request failed with status ${vampireResponse.status}.`);
      if (!shapechangerResponse.ok) throw new Error(`Shapechanger variant request failed with status ${shapechangerResponse.status}.`);
      if (!harmonicResponse.ok) throw new Error(`Harmonic variant request failed with status ${harmonicResponse.status}.`);
      if (!technomancerResponse.ok) throw new Error(`Technomancer practice request failed with status ${technomancerResponse.status}.`);
      archetypeWiki = await entryResponse.json();
      rulesData = await rulesResponse.json();
      vampireLineageData = await vampireResponse.json();
      shapechangerVariantData = await shapechangerResponse.json();
      harmonicVariantData = await harmonicResponse.json();
      technomancerVariantData = await technomancerResponse.json();
      renderEntry();

      const select = document.getElementById('blacklight-archetype');
      const lineageInput = ensureLineageInput();
      select?.addEventListener('change', renderEntry);
      lineageInput?.addEventListener('input', renderEntry);
      lineageInput?.addEventListener('change', renderEntry);
      if (select) new MutationObserver(() => queueMicrotask(renderEntry)).observe(select, { childList: true, subtree: true });
      window.setTimeout(renderEntry, 100);
      window.setTimeout(renderEntry, 500);
    } catch (error) {
      const target = document.getElementById('blacklight-transition-profile');
      if (target) target.innerHTML = `<p class="helper-note">The Archetype capability catalog could not be loaded: ${escapeHtml(error.message)}</p>`;
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialize, { once: true });
  else void initialize();
})();