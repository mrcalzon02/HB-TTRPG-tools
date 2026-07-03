(() => {
  'use strict';
  const query = new URLSearchParams(location.search);
  const fromInduction = query.get('from') === 'induction';
  const printRequested = query.get('print') === '1';

  function ensureEquipmentLink() {
    const actions = document.querySelector('.blacklight-sheet-header .blacklight-actions');
    if (!actions || actions.querySelector('[data-blacklight-equipment-link]')) return;
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
    ensureEquipmentLink();
    ensureTranscriptField();
    applyInductionTranscript(false);
    if (!fromInduction && !printRequested) return;
    let attempts = 0;
    const timer = setInterval(() => {
      attempts += 1;
      if (ready() || attempts >= 40) {
        clearInterval(timer);
        applyInductionTranscript(true);
        const status = document.getElementById('blacklight-load-status');
        if (fromInduction && status) status.textContent = 'Character restored with Charles’s induction transcript.';
        if (printRequested) setTimeout(() => print(), 700);
      }
    }, 100);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialize, { once: true });
  else initialize();
})();
