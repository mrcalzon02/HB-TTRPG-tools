(() => {
  'use strict';

  const pageName = (window.location.pathname.split('/').pop() || '').toLowerCase();
  if (!pageName.startsWith('blacklight-')) return;
  if (window.BLACKLIGHT_BACKGROUND_AUDIO_BOOTSTRAPPED) return;
  window.BLACKLIGHT_BACKGROUND_AUDIO_BOOTSTRAPPED = true;

  const existing = [...document.scripts].find(script =>
    (script.getAttribute('src') || '').split('?')[0].endsWith('blacklight-background-audio.js')
  );
  if (existing) return;

  const bootstrapUrl = document.currentScript?.src || window.location.href;
  const script = document.createElement('script');
  script.src = new URL('blacklight-background-audio.js', bootstrapUrl).href;
  script.async = false;
  (document.head || document.documentElement).appendChild(script);
})();
