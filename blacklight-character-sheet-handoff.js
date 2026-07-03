(() => {
  'use strict';
  const query = new URLSearchParams(location.search);
  const fromInduction = query.get('from') === 'induction';
  const printRequested = query.get('print') === '1';

  function addTranscript() {
    const form = document.getElementById('blacklight-character-form');
    const grid = form?.elements.missionRecord?.closest('.blacklight-field-grid');
    if (!form || !grid) return;
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
    field.value = localStorage.getItem('hb-ttrpg-tools-blacklight-charles-induction-transcript-v1') || field.value;
  }

  function ready() {
    return document.querySelectorAll('#blacklight-skills input').length === 24 && document.getElementById('blacklight-archetype')?.options.length > 1;
  }

  function initialize() {
    addTranscript();
    if (!fromInduction && !printRequested) return;
    let attempts = 0;
    const timer = setInterval(() => {
      addTranscript();
      attempts += 1;
      if (ready() || attempts >= 40) {
        clearInterval(timer);
        const status = document.getElementById('blacklight-load-status');
        if (fromInduction && status) status.textContent = 'Character restored with Charles’s induction transcript.';
        if (printRequested) setTimeout(() => print(), 700);
      }
    }, 100);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialize, { once: true });
  else initialize();
})();
