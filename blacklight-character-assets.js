(() => {
  'use strict';

  const ASSETS = window.BLACKLIGHT_ASSETS;
  if (!ASSETS) return;

  const DRAFT_KEY = 'hb-ttrpg-tools-blacklight-induction-v1';
  const SHEET_KEY = 'hb-ttrpg-tools-blacklight-basic-character-v1';
  const RANDOM_PORTRAIT_KEY = 'hb-ttrpg-tools-blacklight-random-portrait-v1';
  const PENDING_PORTRAIT_KEY = 'hb-ttrpg-tools-blacklight-pending-portrait-v1';

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, character => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[character]));
  }

  function slug(value) {
    return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  }

  function readJson(key, fallback = null) {
    try { return JSON.parse(localStorage.getItem(key) || 'null') ?? fallback; } catch (_) { return fallback; }
  }

  function writeDownload(payload, filename) {
    const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function injectStyles() {
    if (document.getElementById('blacklight-character-asset-style')) return;
    const style = document.createElement('style');
    style.id = 'blacklight-character-asset-style';
    style.textContent = `
      .blacklight-asset-icon{width:1.1em;height:1.1em;object-fit:contain;vertical-align:-.18em;margin-right:.45em;filter:drop-shadow(0 2px 8px rgba(0,0,0,.35))}
      .blacklight-portrait-module{display:grid;grid-template-columns:minmax(120px,170px) minmax(0,1fr);gap:16px;align-items:stretch;margin:18px 0;padding:14px;border:1px solid rgba(200,138,53,.34);border-radius:18px;background:linear-gradient(135deg,rgba(200,138,53,.1),rgba(11,14,20,.52));box-shadow:0 12px 30px rgba(0,0,0,.16)}
      .blacklight-portrait-preview{display:grid;place-items:center;min-height:180px;overflow:hidden;border:1px solid rgba(200,138,53,.32);border-radius:15px;background:#080a0e}
      .blacklight-portrait-preview img{width:100%;height:100%;min-height:180px;object-fit:cover;display:block}
      .blacklight-portrait-copy{display:grid;align-content:center;gap:8px}.blacklight-portrait-copy h3{margin:0}.blacklight-portrait-copy p{margin:0;color:var(--muted,#b9ae9c);line-height:1.5}
      .blacklight-portrait-copy label{display:grid;gap:6px;font-weight:800}.blacklight-portrait-copy select{width:100%;padding:10px;border:1px solid rgba(200,138,53,.35);border-radius:12px;background:#0c0f15;color:inherit}
      .blacklight-portrait-note{font-size:.82rem;color:var(--muted,#b9ae9c)}
      .blacklight-random-portrait{margin-top:14px}.blacklight-random-portrait .blacklight-portrait-preview{min-height:220px}
      @media (max-width:680px){.blacklight-portrait-module{grid-template-columns:1fr}.blacklight-portrait-preview img{max-height:320px}}
      @media print{.blacklight-portrait-module{break-inside:avoid;box-shadow:none}}
    `;
    document.head.appendChild(style);
  }

  function icon(name, alt = '') {
    const src = ASSETS.icons[name];
    return src ? `<img class="blacklight-asset-icon" src="${escapeHtml(src)}" alt="${escapeHtml(alt)}" loading="lazy" decoding="async">` : '';
  }

  function currentCreatorDraft() {
    return readJson(DRAFT_KEY, null) || {};
  }

  function currentCreatorFields() {
    const draft = currentCreatorDraft();
    const sheet = readJson(SHEET_KEY, null) || {};
    return { ...(sheet.fields || {}), ...(draft.fields || {}) };
  }

  function currentArchetypeFromDocument() {
    const checked = document.querySelector('[data-choice="archetype"]:checked');
    if (checked?.value) return checked.value;
    const formArchetype = document.querySelector('#blacklight-archetype')?.value;
    if (formArchetype) return formArchetype;
    const fields = currentCreatorFields();
    return fields.archetype || '';
  }

  function portraitOptions(archetype, currentPath = '') {
    const list = ASSETS.portraits.portraitsFor(archetype);
    if (currentPath && !list.some(item => item.path === currentPath)) {
      list.unshift({ id: 'imported-current', prefix: 'imported', archetype: 'imported', label: 'Imported / Current Portrait', path: currentPath });
    }
    return list;
  }

  function buildPortraitModule({ archetype, currentPath, selectAttribute = 'data-field', fieldName = 'portraitAsset', className = '' }) {
    const options = portraitOptions(archetype, currentPath);
    const selected = options.find(item => item.path === currentPath) || options[0];
    return `
      <section class="blacklight-portrait-module ${escapeHtml(className)}" data-blacklight-portrait-module>
        <div class="blacklight-portrait-preview"><img data-blacklight-portrait-preview src="${escapeHtml(selected?.path || '')}" alt="Selected Blacklight character portrait" loading="lazy" decoding="async"></div>
        <div class="blacklight-portrait-copy">
          <p class="eyebrow">${icon('image')}Class-filtered portrait assets</p>
          <h3>Character Portrait</h3>
          <p>Placeholder portraits remain available to every class. Prefix-matched portraits appear when the selected Archetype has a matching asset set.</p>
          <label>Portrait Asset
            <select ${selectAttribute}="${escapeHtml(fieldName)}" data-blacklight-portrait-select>
              ${options.map(item => `<option value="${escapeHtml(item.path)}" ${item.path === selected?.path ? 'selected' : ''}>${escapeHtml(item.label)}</option>`).join('')}
            </select>
          </label>
          <span class="blacklight-portrait-note">Active set: ${escapeHtml(ASSETS.portraits.normalizeArchetype(archetype) || 'placeholder only')}</span>
        </div>
      </section>`;
  }

  function updatePreview(select) {
    const module = select.closest('[data-blacklight-portrait-module]');
    const image = module?.querySelector('[data-blacklight-portrait-preview]');
    if (image) image.src = select.value;
  }

  function installCreatorImportExport() {
    const actions = document.querySelector('.creation-reader-actions');
    if (!actions) return;
    if (!document.getElementById('blacklight-creator-export')) {
      const exportButton = document.createElement('button');
      exportButton.id = 'blacklight-creator-export';
      exportButton.className = 'secondary-action';
      exportButton.type = 'button';
      exportButton.innerHTML = `${icon('download')}Export Current Character JSON`;
      const importLabel = document.createElement('label');
      importLabel.className = 'secondary-action file-action';
      importLabel.htmlFor = 'blacklight-creator-import';
      importLabel.innerHTML = `${icon('upload')}Import Character JSON`.replace('undefined', '');
      const importInput = document.createElement('input');
      importInput.id = 'blacklight-creator-import';
      importInput.type = 'file';
      importInput.accept = 'application/json';
      importInput.hidden = true;
      actions.insertBefore(exportButton, actions.querySelector('#creation-reset'));
      actions.insertBefore(importLabel, actions.querySelector('#creation-reset'));
      actions.insertBefore(importInput, actions.querySelector('#creation-reset'));
    }
    document.getElementById('blacklight-creator-export')?.addEventListener('click', exportCreatorCharacter);
    document.getElementById('blacklight-creator-import')?.addEventListener('change', event => importCreatorCharacter(event.target.files?.[0]));
  }

  function exportCreatorCharacter() {
    const draft = currentCreatorDraft();
    const sheet = readJson(SHEET_KEY, null) || {};
    const fields = { ...(sheet.fields || {}), ...(draft.fields || {}) };
    const payload = {
      schema: 'blacklight-continuum-basic-character',
      schemaVersion: '0.2.0',
      exportedFrom: 'blacklight-character-creation',
      savedAt: new Date().toISOString(),
      selectedPowers: draft.selectedPowers || sheet.selectedPowers || [],
      selectedExternalAbilities: draft.selectedExternalAbilities || [],
      signatureSkill: draft.signatureSkill || '',
      specializations: draft.specializations || [],
      induction: draft.induction || {},
      fields
    };
    writeDownload(payload, `${slug(fields.characterName) || 'blacklight-operative'}-creator.json`);
  }

  function importCreatorCharacter(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        const fields = parsed.fields && typeof parsed.fields === 'object' ? parsed.fields : parsed;
        const payload = {
          schema: 'blacklight-continuum-basic-character',
          schemaVersion: parsed.schemaVersion || '0.2.0',
          savedAt: new Date().toISOString(),
          selectedPowers: Array.isArray(parsed.selectedPowers) ? parsed.selectedPowers : [],
          fields
        };
        localStorage.setItem(SHEET_KEY, JSON.stringify(payload));
        localStorage.removeItem(DRAFT_KEY);
        location.reload();
      } catch (error) {
        alert(`Import failed: ${error.message}`);
      }
    };
    reader.readAsText(file);
  }

  function installCreatorPortrait() {
    const root = document.getElementById('creation-reader-entry');
    if (!root) return;
    const place = () => {
      const stage = root.querySelector('.creation-builder-stage');
      if (!stage || stage.querySelector('[data-blacklight-portrait-module]')) return;
      const fields = currentCreatorFields();
      const html = buildPortraitModule({ archetype: currentArchetypeFromDocument(), currentPath: fields.portraitAsset || '' });
      stage.querySelector('.creation-builder-stage-heading')?.insertAdjacentHTML('afterend', html);
    };
    place();
    const observer = new MutationObserver(place);
    observer.observe(root, { childList: true, subtree: true });
    root.addEventListener('change', event => {
      const select = event.target.closest('[data-blacklight-portrait-select]');
      if (!select) return;
      updatePreview(select);
      select.dispatchEvent(new Event('input', { bubbles: true }));
    });
  }

  function installSheetPortrait() {
    const form = document.getElementById('blacklight-character-form');
    const panel = document.querySelector('.blacklight-identity-panel');
    if (!form || !panel || panel.querySelector('[data-blacklight-portrait-module]')) return;
    let hidden = form.elements.portraitAsset;
    if (!hidden) {
      hidden = document.createElement('input');
      hidden.type = 'hidden';
      hidden.name = 'portraitAsset';
      form.appendChild(hidden);
    }
    const pending = readJson(PENDING_PORTRAIT_KEY, null);
    if (!hidden.value && pending?.path) hidden.value = pending.path;
    localStorage.removeItem(PENDING_PORTRAIT_KEY);
    const html = buildPortraitModule({ archetype: currentArchetypeFromDocument(), currentPath: hidden.value || '', selectAttribute: 'data-sheet-portrait-field', fieldName: 'portraitAsset' });
    panel.querySelector('.blacklight-section-heading')?.insertAdjacentHTML('afterend', html);
    const select = panel.querySelector('[data-blacklight-portrait-select]');
    select?.addEventListener('change', () => {
      hidden.value = select.value;
      updatePreview(select);
      form.dispatchEvent(new Event('input', { bubbles: true }));
    });
    document.getElementById('blacklight-archetype')?.addEventListener('change', () => {
      const current = hidden.value;
      panel.querySelector('[data-blacklight-portrait-module]')?.remove();
      const nextHtml = buildPortraitModule({ archetype: currentArchetypeFromDocument(), currentPath: current, selectAttribute: 'data-sheet-portrait-field', fieldName: 'portraitAsset' });
      panel.querySelector('.blacklight-section-heading')?.insertAdjacentHTML('afterend', nextHtml);
      panel.querySelector('[data-blacklight-portrait-select]')?.addEventListener('change', event => {
        hidden.value = event.target.value;
        updatePreview(event.target);
        form.dispatchEvent(new Event('input', { bubbles: true }));
      });
    });
  }

  function inferRandomArchetype() {
    const badges = [...document.querySelectorAll('.random-hero .random-badges span')].map(item => item.textContent || '');
    return badges.find(text => ASSETS.portraits.normalizeArchetype(text) && ASSETS.portraits.portraitsFor(text).length > 1) || badges.join(' ');
  }

  function storeRandomPortrait(path, archetype) {
    const record = { path, archetype, savedAt: new Date().toISOString() };
    sessionStorage.setItem(RANDOM_PORTRAIT_KEY, JSON.stringify(record));
    localStorage.setItem(PENDING_PORTRAIT_KEY, JSON.stringify(record));
  }

  function installRandomPortrait() {
    const output = document.getElementById('random-output');
    if (!output) return;
    const place = () => {
      const hero = output.querySelector('.random-hero');
      if (!hero || output.querySelector('[data-blacklight-portrait-module]')) return;
      const archetype = inferRandomArchetype();
      const stored = readJson(RANDOM_PORTRAIT_KEY, null);
      const seed = hero.querySelector('.eyebrow')?.textContent || hero.querySelector('h2')?.textContent || '';
      const picked = stored?.path ? stored : ASSETS.portraits.pickPortrait(archetype, seed);
      const html = buildPortraitModule({ archetype, currentPath: picked?.path || '', selectAttribute: 'data-random-portrait-field', fieldName: 'portraitAsset', className: 'blacklight-random-portrait' });
      hero.insertAdjacentHTML('afterend', html);
      const select = output.querySelector('[data-blacklight-portrait-select]');
      if (select) storeRandomPortrait(select.value, archetype);
    };
    const observer = new MutationObserver(place);
    observer.observe(output, { childList: true, subtree: true });
    place();
    output.addEventListener('change', event => {
      const select = event.target.closest('[data-blacklight-portrait-select]');
      if (!select) return;
      updatePreview(select);
      storeRandomPortrait(select.value, inferRandomArchetype());
    });
    ['random-transfer', 'random-export'].forEach(id => document.getElementById(id)?.addEventListener('click', () => {
      const select = output.querySelector('[data-blacklight-portrait-select]');
      if (select) storeRandomPortrait(select.value, inferRandomArchetype());
    }, { capture: true }));
  }

  function decorateButtons() {
    const map = [
      ['#random-generate', 'star'], ['#random-transfer', 'share'], ['#random-export', 'download'], ['#random-print', 'image'],
      ['#blacklight-export', 'download'], ['#blacklight-print', 'image'], ['#blacklight-reset', 'settings']
    ];
    map.forEach(([selector, iconName]) => {
      const node = document.querySelector(selector);
      if (node && !node.querySelector('.blacklight-asset-icon')) node.insertAdjacentHTML('afterbegin', icon(iconName));
    });
  }

  function initialize() {
    injectStyles();
    decorateButtons();
    installCreatorImportExport();
    installCreatorPortrait();
    installSheetPortrait();
    installRandomPortrait();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialize, { once: true });
  else initialize();
})();
