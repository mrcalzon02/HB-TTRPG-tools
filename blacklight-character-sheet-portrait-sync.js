(() => {
  'use strict';

  function syncPortrait() {
    const form = document.getElementById('blacklight-character-form');
    const value = form?.elements?.portraitAsset?.value || '';
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
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => window.setTimeout(syncPortrait, 100), { once: true });
  else window.setTimeout(syncPortrait, 100);
})();
