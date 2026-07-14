(() => {
  'use strict';

  const load = src => new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.async = false;
    script.onload = resolve;
    script.onerror = () => reject(new Error(`Unable to load ${src}`));
    document.head.append(script);
  });

  async function start() {
    const generate = document.getElementById('exo-generate-system');
    if (generate) generate.disabled = true;
    try {
      const catalogue = await Promise.resolve(globalThis.BlacklightExoMoonCatalogReady);
      if (!catalogue || catalogue.status !== 'ready' || Number(catalogue.moons) < 400) {
        throw new Error(catalogue?.error || `complete moon catalogue validation failed (${catalogue?.moons || 0} records)`);
      }
      await load('blacklight-exo-solar-system.js');
      await load('blacklight-exo-speed-controls.js');
      await load('blacklight-exo-cluster.js');
    } catch (error) {
      console.error('[Blacklight EXO] System bootstrap failed:', error);
      const empty = document.getElementById('exo-orbit-empty');
      if (empty) empty.textContent = `The complete Solar System catalogue could not initialize: ${error.message}`;
      const status = document.getElementById('exo-cluster-status');
      if (status) status.textContent = 'Complete published Solar System data is unavailable; rendering was stopped rather than showing a truncated record.';
    } finally {
      if (generate) generate.disabled = false;
    }
  }

  start();
})();
