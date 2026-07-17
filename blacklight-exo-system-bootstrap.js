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

  const loadStyle = href => new Promise((resolve, reject) => {
    if (document.querySelector(`link[href="${href}"]`)) {
      resolve();
      return;
    }
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.onload = resolve;
    link.onerror = () => reject(new Error(`Unable to load ${href}`));
    document.head.append(link);
  });

  async function start() {
    const generate = document.getElementById('exo-generate-system');
    if (generate) generate.disabled = true;
    try {
      const catalogue = await Promise.resolve(globalThis.BlacklightExoMoonCatalogReady);
      if (!catalogue || catalogue.status !== 'ready' || Number(catalogue.moons) < 400) {
        throw new Error(catalogue?.error || `complete moon catalogue validation failed (${catalogue?.moons || 0} records)`);
      }
      await loadStyle('blacklight-exo-orbital-layout.css');
      await loadStyle('blacklight-exo-campaign-facilities.css');
      await loadStyle('blacklight-exo-jump-calculator.css');
      await load('blacklight-exo-ecology-core.js');
      await load('blacklight-exo-imagery-definitions.js');
      await load('blacklight-exo-imagery-runtime.js');
      await load('blacklight-exo-imagery-terrestrial.js');
      await load('blacklight-exo-imagery-exotic.js');
      await load('blacklight-exo-imagery.js');
      await load('blacklight-exo-orbital-layout.js');
      await load('blacklight-exo-sol-campaign-data.js');
      await load('blacklight-exo-solar-system-v6.js');
      await load('blacklight-exo-solar-ecology-integration.js');
      await load('blacklight-exo-speed-controls.js');
      await load('blacklight-exo-cluster.js');
      await load('blacklight-exo-cluster-ecology-integration.js');

      await load('blacklight-exo-ftl-physics-definitions.js');
      await load('blacklight-exo-ftl-operational-definitions.js');
      await load('blacklight-exo-ftl-runtime.js');
      await load('blacklight-exo-ftl-core.js');
      await load('blacklight-exo-ftl-engineering-extension.js');
      await load('blacklight-exo-ftl-path-level-core.js');
      await load('blacklight-exo-ftl-path-level-paths-physical.js');
      await load('blacklight-exo-ftl-path-level-paths-dimensional.js');
      await load('blacklight-exo-ftl-path-level-paths-discrete.js');
      await load('blacklight-exo-ftl-path-level-runtime.js');
      await load('blacklight-exo-ftl-path-level-engineering.js');
      await load('blacklight-exo-ftl-path-level-controller.js');
      await load('blacklight-exo-cluster-spatial.js');
      await load('blacklight-exo-jump-calculator-core.js');
      await load('blacklight-exo-jump-calculator-ui.js');

      await load('blacklight-exo-government-handoff.js');
      await load('blacklight-exo-ftl-handoff.js');
    } catch (error) {
      console.error('[Blacklight EXO] System bootstrap failed:', error);
      const empty = document.getElementById('exo-orbit-empty');
      if (empty) empty.textContent = `The complete Solar System catalogue could not initialize: ${error.message}`;
      const status = document.getElementById('exo-cluster-status');
      if (status) status.textContent = 'Complete published Solar System and Blacklight campaign data are unavailable; rendering was stopped rather than showing a partial record.';
    } finally {
      if (generate) generate.disabled = false;
    }
  }

  start();
})();
