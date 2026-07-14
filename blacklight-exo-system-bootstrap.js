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
      await Promise.resolve(globalThis.BlacklightExoMoonCatalogReady);
      await load('blacklight-exo-solar-system.js');
      await load('blacklight-exo-speed-controls.js');
      await load('blacklight-exo-cluster.js');
    } catch (error) {
      console.error('[Blacklight EXO] System bootstrap failed:', error);
      const empty = document.getElementById('exo-orbit-empty');
      if (empty) empty.textContent = `The Solar System catalogue could not initialize: ${error.message}`;
    } finally {
      if (generate) generate.disabled = false;
    }
  }

  start();
})();
