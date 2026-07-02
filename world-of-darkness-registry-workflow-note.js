(() => {
  'use strict';

  const SOURCE = 'spatial-submission-handoff.js';

  function loadHandoff() {
    if (window.HBSpatialSubmissionHandoff) return Promise.resolve(window.HBSpatialSubmissionHandoff);
    const existing = [...document.scripts].find(script => (script.getAttribute('src') || '').split('?')[0].endsWith(SOURCE));
    if (existing?.dataset.hbSpatialSubmissionLoaded === 'true') return Promise.resolve(window.HBSpatialSubmissionHandoff);
    return new Promise((resolve, reject) => {
      const script = existing || document.createElement('script');
      script.addEventListener('load', () => {
        script.dataset.hbSpatialSubmissionLoaded = 'true';
        resolve(window.HBSpatialSubmissionHandoff);
      }, { once: true });
      script.addEventListener('error', () => reject(new Error(`${SOURCE} could not be loaded.`)), { once: true });
      if (!existing) {
        script.src = SOURCE;
        script.async = false;
        script.dataset.wodRegistryWorkflow = 'true';
        document.body.appendChild(script);
      }
    });
  }

  void loadHandoff().catch(error => {
    const status = document.getElementById('wod-spatial-loader-status') || document.getElementById('wod-visible-business-status');
    if (status) status.textContent = `Global registry handoff failed to load: ${error.message}`;
  });
})();
