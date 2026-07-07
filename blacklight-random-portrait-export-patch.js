(() => {
  'use strict';

  const SHEET_KEY = 'hb-ttrpg-tools-blacklight-basic-character-v1';
  const RANDOM_PORTRAIT_KEY = 'hb-ttrpg-tools-blacklight-random-portrait-v1';
  const PENDING_PORTRAIT_KEY = 'hb-ttrpg-tools-blacklight-pending-portrait-v1';

  function readJson(key) {
    try { return JSON.parse(localStorage.getItem(key) || sessionStorage.getItem(key) || 'null'); } catch (_) { return null; }
  }

  function selectedPortrait() {
    const select = document.querySelector('#random-output [data-blacklight-portrait-select]');
    const stored = readJson(RANDOM_PORTRAIT_KEY) || readJson(PENDING_PORTRAIT_KEY) || {};
    const path = select?.value || stored.path || '';
    if (!path) return null;
    return { path, archetype: stored.archetype || '', savedAt: new Date().toISOString() };
  }

  function withPortraitPayload(value) {
    const portrait = selectedPortrait();
    if (!portrait) return value;
    try {
      const payload = JSON.parse(String(value));
      payload.fields = payload.fields && typeof payload.fields === 'object' ? payload.fields : {};
      payload.fields.portraitAsset = portrait.path;
      payload.portraitAsset = portrait;
      return JSON.stringify(payload, null, 2);
    } catch (_) {
      return value;
    }
  }

  function primeExportPatch() {
    const OriginalBlob = window.Blob;
    window.Blob = function patchedBlob(parts, options) {
      const nextParts = Array.isArray(parts) && options?.type === 'application/json'
        ? parts.map(part => typeof part === 'string' ? withPortraitPayload(part) : part)
        : parts;
      return new OriginalBlob(nextParts, options);
    };
    window.setTimeout(() => { window.Blob = OriginalBlob; }, 0);
  }

  function primeTransferPatch() {
    const originalSetItem = localStorage.setItem.bind(localStorage);
    localStorage.setItem = (key, value) => {
      if (key === SHEET_KEY) originalSetItem(key, withPortraitPayload(value));
      else originalSetItem(key, value);
    };
    window.setTimeout(() => { localStorage.setItem = originalSetItem; }, 0);
  }

  function initialize() {
    document.getElementById('random-export')?.addEventListener('click', primeExportPatch, { capture: true });
    document.getElementById('random-transfer')?.addEventListener('click', primeTransferPatch, { capture: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialize, { once: true });
  else initialize();
})();
