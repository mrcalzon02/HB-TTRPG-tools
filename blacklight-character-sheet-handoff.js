(() => {
  'use strict';

  const parameters = new URLSearchParams(window.location.search);
  const fromInduction = parameters.get('from') === 'induction';
  const printRequested = parameters.get('print') === '1';

  function sheetReady() {
    const status = document.getElementById('blacklight-load-status');
    const archetype = document.getElementById('blacklight-archetype');
    const skills = document.querySelectorAll('#blacklight-skills input');
    return Boolean(status && archetype && archetype.options.length > 1 && skills.length === 24 && !status.textContent.includes('Loading'));
  }

  function finishHandoff() {
    const status = document.getElementById('blacklight-load-status');
    if (fromInduction && status) {
      status.textContent = 'Character completed through Blacklight Induction and restored into the printable sheet.';
    }
    if (printRequested) {
      window.setTimeout(() => window.print(), 700);
    }
  }

  function initialize() {
    if (!fromInduction && !printRequested) return;
    let attempts = 0;
    const timer = window.setInterval(() => {
      attempts += 1;
      if (sheetReady() || attempts >= 40) {
        window.clearInterval(timer);
        finishHandoff();
      }
    }, 100);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialize, { once: true });
  else initialize();
})();
