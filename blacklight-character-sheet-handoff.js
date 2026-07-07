(() => {
  'use strict';
  const query = new URLSearchParams(location.search);
  const fromInduction = query.get('from') === 'induction';
  const fromRandom = query.get('from') === 'random';
  const fromVeteran = query.get('from') === 'veteran';
  const printRequested = query.get('print') === '1';
  const SHEET_KEY = 'hb-ttrpg-tools-blacklight-basic-character-v1';

  function readJson(key) {
    try {
      return JSON.parse(localStorage.getItem(key) || 'null');
    } catch (_) {
      return null;
    }
  }

  function storedSheetField(name) {
    const sheet = readJson(SHEET_KEY);
    return sheet?.fields?.[name] || '';
  }

  function insertBeforeReturnLink(actions, link) {
    const returnLink = actions.querySelector('a[href*="index.html"]');
    if (returnLink) returnLink.insertAdjacentElement('beforebegin', link);
    else actions.appendChild(link);
  }

  function ensureNavigationLinks() {
    const actions = document.querySelector('.blacklight-sheet-header .blacklight-actions');
    if (!actions) return;

    if (!actions.querySelector('[data-blacklight-veteran-link]')) {
      const link = document.createElement('a');
      link.className = 'secondary-action';
      link.href = 'blacklight-veteran-reintroduction.html';
      link.dataset.blacklightVeteranLink = 'true';
      link.textContent = 'Veteran Reorientation';
      insertBeforeReturnLink(actions, link);
    }

    if (!actions.querySelector('[data-blacklight-mission-link]')) {
      const link = document.createElement('a');
      link.className = 'secondary-action';
      link.href = 'blacklight-mission-generator.html';
      link.dataset.blacklightMissionLink = 'true';
      link.textContent = 'Mission Generator';
      insertBeforeReturnLink(actions, link);
    }

    if (!actions.querySelector('[data-blacklight-random-link]')) {
      const link = document.createElement('a');
      link.className = 'secondary-action';
      link.href = 'blacklight-random-character.html';
      link.dataset.blacklightRandomLink = 'true';
      link.textContent = 'Random Character Generator';
      insertBeforeReturnLink(actions, link);
    }

    if (!actions.querySelector('[data-blacklight-equipment-link]')) {
      const link = document.createElement('a');
      link.className = 'secondary-action';
      link.href = 'blacklight-equipment-catalog.html';
      link.target = '_blank';
      link.rel = 'noopener';
      link.dataset.blacklightEquipmentLink = 'true';
      link.textContent = 'Open Equipment Catalog';
      insertBeforeReturnLink(actions, link);
    }
  }

  function campaignLogGrid() {
    const form = document.getElementById('blacklight-character-form');
    return form?.elements.missionRecord?.closest('.blacklight-field-grid') || null;
  }

  function ensureLongRecordField(name, labelText, rows = 12) {
    const form = document.getElementById('blacklight-character-form');
    const grid = campaignLogGrid();
    if (!form || !grid) return null;
    let field = form.elements[name];
    if (!field) {
      const label = document.createElement('label');
      label.className = 'blacklight-wide-label';
      label.style.gridColumn = '1 / -1';
      label.textContent = labelText;
      field = document.createElement('textarea');
      field.name = name;
      field.rows = rows;
      label.appendChild(field);
      grid.appendChild(label);
    }
    return field;
  }

  function ensureTranscriptField() {
    return ensureLongRecordField('inductionTranscript', 'Charles Induction Transcript', 12);
  }

  function ensureVeteranRecordField() {
    return ensureLongRecordField('veteranContinuityRecord', 'BlackLight Veteran Continuity Record', 18);
  }

  function restoreStoredField(field, name) {
    if (!field || field.value) return;
    const value = storedSheetField(name);
    if (value) field.value = value;
  }

  function syncPortraitPreview(saveToSheet = false) {
    const form = document.getElementById('blacklight-character-form');
    const value = form?.elements?.portraitAsset?.value || storedSheetField('portraitAsset');
    const module = document.querySelector('[data-blacklight-portrait-module]');
    const select = module?.querySelector('[data-blacklight-portrait-select]');
    const image = module?.querySelector('[data-blacklight-portrait-preview]');
    if (!value || !select || !image) return;
    if (![...select.options].some(option => option.value === value)) {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = 'Imported / Saved Portrait';
      select.prepend(option);
    }
    select.value = value;
    image.src = value;
    if (saveToSheet) form?.dispatchEvent(new Event('input', { bubbles: true }));
  }

  function applyInductionTranscript(saveToSheet = false) {
    const field = ensureTranscriptField();
    if (!field) return;
    restoreStoredField(field, 'inductionTranscript');
    if (!fromInduction) return;
    const transcript = localStorage.getItem('hb-ttrpg-tools-blacklight-charles-induction-transcript-v1') || '';
    if (!transcript) return;
    field.value = transcript;
    if (saveToSheet) field.dispatchEvent(new Event('input', { bubbles: true }));
  }

  function applyVeteranRecord(saveToSheet = false) {
    const field = ensureVeteranRecordField();
    if (!field) return;
    restoreStoredField(field, 'veteranContinuityRecord');
    if (!fromVeteran) return;
    try {
      const record = readJson('hb-ttrpg-tools-blacklight-veteran-reorientation-record-v1');
      const transcript = record?.plainText || '';
      if (!transcript) return;
      field.value = transcript;
      if (saveToSheet) field.dispatchEvent(new Event('input', { bubbles: true }));
    } catch (_) {
      // The handoff summary remains in the stored sheet if the standalone record cannot be parsed.
    }
  }

  function ready() {
    return document.querySelectorAll('#blacklight-skills input').length === 24 && document.getElementById('blacklight-archetype')?.options.length > 1;
  }

  function initialize() {
    ensureNavigationLinks();
    ensureTranscriptField();
    ensureVeteranRecordField();
    applyInductionTranscript(false);
    applyVeteranRecord(false);
    syncPortraitPreview(false);
    if (!fromInduction && !fromRandom && !fromVeteran && !printRequested) {
      window.setTimeout(() => syncPortraitPreview(false), 300);
      return;
    }
    let attempts = 0;
    const timer = setInterval(() => {
      attempts += 1;
      if (ready() || attempts >= 40) {
        clearInterval(timer);
        applyInductionTranscript(true);
        applyVeteranRecord(true);
        syncPortraitPreview(true);
        const status = document.getElementById('blacklight-load-status');
        if (fromInduction && status) status.textContent = 'Character restored with Charles’s induction transcript.';
        if (fromRandom && status) status.textContent = 'Randomly generated operative transferred and restored. Review any fields you want to personalize.';
        if (fromVeteran && status) status.textContent = 'Veteran continuity record attached without replacing existing statistics, powers, or equipment.';
        if (printRequested) setTimeout(() => print(), 700);
      }
    }, 100);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialize, { once: true });
  else initialize();
})();
