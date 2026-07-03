(() => {
  'use strict';
  const query = new URLSearchParams(location.search);
  const fromInduction = query.get('from') === 'induction';
  const fromRandom = query.get('from') === 'random';
  const printRequested = query.get('print') === '1';

  function ensureNavigationLinks() {
    const actions = document.querySelector('.blacklight-sheet-header .blacklight-actions');
    if (!actions) return;

    if (!actions.querySelector('[data-blacklight-random-link]')) {
      const link = document.createElement('a');
      link.className = 'secondary-action';
      link.href = 'blacklight-random-character.html';
      link.dataset.blacklightRandomLink = 'true';
      link.textContent = 'Random Character Generator';
      const returnLink = actions.querySelector('a[href*="index.html"]');
      if (returnLink) returnLink.insertAdjacentElement('beforebegin', link);
      else actions.appendChild(link);
    }

    if (!actions.querySelector('[data-blacklight-equipment-link]')) {
      const link = document.createElement('a');
      link.className = 'secondary-action';
      link.href = 'blacklight-equipment-catalog.html';
      link.target = '_blank';
      link.rel = 'noopener';
      link.dataset.blacklightEquipmentLink = 'true';
      link.textContent = 'Open Equipment Catalog';
      const returnLink = actions.querySelector('a[href*="index.html"]');
      if (returnLink) returnLink.insertAdjacentElement('beforebegin', link);
      else actions.appendChild(link);
    }
  }

  function ensureTranscriptField() {
    const form = document.getElementById('blacklight-character-form');
    const grid = form?.elements.missionRecord?.closest('.blacklight-field-grid');
    if (!form || !grid) return null;
    let field = form.elements.inductionTranscript;
    if (!field) {
      const label = document.createElement('label');
      label.className = 'blacklight-wide-label';
      label.style.gridColumn = '1 / -1';
      label.textContent = 'Charles Induction Transcript';
      field = document.createElement('textarea');
      field.name = 'inductionTranscript';
      field.rows = 12;
      label.appendChild(field);
      grid.appendChild(label);
    }
    return field;
  }

  function applyInductionTranscript(saveToSheet = false) {
    const field = ensureTranscriptField();
    if (!field || !fromInduction) return;
    const transcript = localStorage.getItem('hb-ttrpg-tools-blacklight-charles-induction-transcript-v1') || '';
    if (!transcript) return;
    field.value = transcript;
    if (saveToSheet) field.dispatchEvent(new Event('input', { bubbles: true }));
  }

  function ready() {
    return document.querySelectorAll('#blacklight-skills input').length === 24 && document.getElementById('blacklight-archetype')?.options.length > 1;
  }

  function initialize() {
    ensureNavigationLinks();
    ensureTranscriptField();
    applyInductionTranscript(false);
    if (!fromInduction && !fromRandom && !printRequested) return;
    let attempts = 0;
    const timer = setInterval(() => {
      attempts += 1;
      if (ready() || attempts >= 40) {
        clearInterval(timer);
        applyInductionTranscript(true);
        const status = document.getElementById('blacklight-load-status');
        if (fromInduction && status) status.textContent = 'Character restored with Charles’s induction transcript.';
        if (fromRandom && status) status.textContent = 'Randomly generated operative transferred and restored. Review any fields you want to personalize.';
        if (printRequested) setTimeout(() => print(), 700);
      }
    }, 100);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialize, { once: true });
  else initialize();
})();
