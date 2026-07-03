(() => {
  'use strict';

  const STORAGE_KEYS = [
    'hb-ttrpg-tools-blacklight-induction-v1',
    'hb-ttrpg-tools-blacklight-charles-induction-log-v1',
    'hb-ttrpg-tools-blacklight-charles-induction-transcript-v1'
  ];

  document.addEventListener('click', event => {
    const button = event.target.closest('#creation-reset');
    if (!button) return;

    event.preventDefault();
    event.stopImmediatePropagation();
    if (!window.confirm('Clear the entire character creation induction and begin again?')) return;

    STORAGE_KEYS.forEach(key => localStorage.removeItem(key));
    window.location.reload();
  }, true);
})();
