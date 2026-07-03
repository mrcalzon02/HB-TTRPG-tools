(() => {
  'use strict';

  const DRAFT_KEY = 'hb-ttrpg-tools-blacklight-induction-v1';
  const SHEET_KEY = 'hb-ttrpg-tools-blacklight-basic-character-v1';
  const TRANSCRIPT_KEY = 'hb-ttrpg-tools-blacklight-charles-induction-transcript-v1';

  function mergeTranscript(key) {
    try {
      const record = JSON.parse(localStorage.getItem(key) || 'null');
      if (!record || typeof record !== 'object') return;
      record.fields = record.fields && typeof record.fields === 'object' ? record.fields : {};
      record.fields.inductionTranscript = localStorage.getItem(TRANSCRIPT_KEY) || '';
      localStorage.setItem(key, JSON.stringify(record));
    } catch (_) {
      // Character creation remains usable without local persistence.
    }
  }

  function synchronize() {
    mergeTranscript(DRAFT_KEY);
    mergeTranscript(SHEET_KEY);
  }

  function initialize() {
    const root = document.getElementById('creation-reader-entry');
    if (!root) return;
    root.addEventListener('input', () => window.setTimeout(synchronize, 900));
    root.addEventListener('change', () => window.setTimeout(synchronize, 50));
    window.setInterval(synchronize, 1500);
    synchronize();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialize, { once: true });
  else initialize();
})();
