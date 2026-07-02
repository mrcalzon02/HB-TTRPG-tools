(() => {
  'use strict';

  const ASSET_VERSION = '20260702-5';
  const SOURCES = [
    { src: 'world-of-darkness-intensity-control.js', ready: () => Boolean(window.WODSupernaturalIntensity) },
    { src: 'spatial-submission-handoff.js', ready: () => Boolean(window.HBSpatialSubmissionHandoff) }
  ];

  function existingScript(src) {
    return [...document.scripts].find(script => (script.getAttribute('src') || '').split('?')[0].endsWith(src));
  }

  function loadScript(source) {
    if (source.ready()) return Promise.resolve();
    const existing = existingScript(source.src);
    return new Promise((resolve, reject) => {
      const script = existing || document.createElement('script');
      script.addEventListener('load', () => source.ready() ? resolve() : reject(new Error(`${source.src} loaded without exposing its expected API.`)), { once: true });
      script.addEventListener('error', () => reject(new Error(`${source.src} could not be loaded.`)), { once: true });
      if (!existing) {
        script.src = `${source.src}?v=${ASSET_VERSION}`;
        script.async = false;
        script.dataset.wodRegistryWorkflow = 'true';
        document.body.appendChild(script);
      }
    });
  }

  Promise.all(SOURCES.map(loadScript)).catch(error => {
    const status = document.getElementById('wod-spatial-loader-status') || document.getElementById('wod-visible-business-status');
    if (status) status.textContent = `A Chronicle workspace enhancement failed to load: ${error.message}`;
  });
})();
