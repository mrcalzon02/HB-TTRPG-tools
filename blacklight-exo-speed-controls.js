(() => {
  'use strict';

  const speed = document.getElementById('exo-speed-select');
  const toggle = document.getElementById('exo-toggle-orbits');
  const generate = document.getElementById('exo-generate-system');
  const seed = document.getElementById('exo-seed-input');
  const randomSeed = document.getElementById('exo-random-seed');

  if (!speed || !toggle) return;

  let lastActiveSpeed =
    Number(speed.value) > 0 ? speed.value : '0.0416666666667';

  const isPaused = () =>
    toggle.getAttribute('aria-pressed') === 'true';

  function createRandomSeed() {
    if (globalThis.crypto?.getRandomValues) {
      const values = new Uint32Array(2);
      globalThis.crypto.getRandomValues(values);
      return `${values[0].toString(36)}-${values[1].toString(36)}`;
    }

    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  }

  function syncProjectionState() {
    if (Number(speed.value) > 0) {
      lastActiveSpeed = speed.value;
      if (isPaused()) toggle.click();
      return;
    }

    if (!isPaused()) toggle.click();
  }

  function appendStylesheet(href) {
    if (document.querySelector(`link[href="${href}"]`)) return;
    const stylesheet = document.createElement('link');
    stylesheet.rel = 'stylesheet';
    stylesheet.href = href;
    document.head.append(stylesheet);
  }

  function appendScript(src) {
    if (document.querySelector(`script[src="${src}"]`)) return;
    const script = document.createElement('script');
    script.src = src;
    script.async = false;
    document.head.append(script);
  }

  function loadSpatialProjection() {
    appendStylesheet('blacklight-exo-spatial.css');
    appendStylesheet('blacklight-exo-view-modes.css');
    appendStylesheet('blacklight-exo-cluster-volume.css');
    appendStylesheet('blacklight-exo-layout-lensing-fixes.css');
    appendStylesheet('blacklight-exo-cluster-volume-v2.css');
    appendStylesheet('blacklight-exo-system-spatial-interactions.css');
    appendStylesheet('blacklight-exo-object-focus.css');
    appendStylesheet('blacklight-exo-example-neighborhood.css');
    appendStylesheet('blacklight-exo-example-reference-data.css');
    appendScript('blacklight-exo-spatial.js');
    appendScript('blacklight-exo-view-modes.js');
    appendScript('blacklight-exo-cluster-volume.js');
    appendScript('blacklight-exo-system-mass-calibration.js');
    appendScript('blacklight-exo-lensing-model.js');
    appendScript('blacklight-exo-lensing-volume-calibration.js');
    appendScript('blacklight-exo-lensing-midpoint-calibration.js');
    appendScript('blacklight-exo-system-mass-model.js');
    appendScript('blacklight-exo-example-neighborhood.js');
    appendScript('blacklight-exo-example-reference-data.js');
    appendScript('blacklight-exo-example-reference-presentation.js');
    appendScript('blacklight-exo-cluster-volume-v2.js');
    appendScript('blacklight-exo-lensing-topology.js');
    appendScript('blacklight-exo-system-spatial-safety.js');
    appendScript('blacklight-exo-system-spatial-interactions.js');
    appendScript('blacklight-exo-object-focus.js');
  }

  speed.addEventListener('change', syncProjectionState);

  toggle.addEventListener('click', () => {
    if (!isPaused() && Number(speed.value) === 0) {
      speed.value = lastActiveSpeed;
    }
  });

  if (randomSeed && seed) {
    randomSeed.addEventListener('click', () => {
      seed.value = createRandomSeed();
      if (generate) generate.click();
    });
  }

  if (generate) {
    generate.addEventListener('click', () => {
      queueMicrotask(syncProjectionState);
    });
  }

  if (seed) {
    seed.addEventListener('keydown', event => {
      if (event.key === 'Enter') {
        queueMicrotask(syncProjectionState);
      }
    });
  }

  // Registered before blacklight-exo-cluster.js schedules its first frame.
  // This makes the published Sol-neighborhood preset the actual startup cluster.
  requestAnimationFrame(() => {
    const clusterSeed = document.getElementById('exo-cluster-seed');
    const clusterCount = document.getElementById('exo-cluster-count');
    if (clusterSeed) clusterSeed.value = 'EXAMPLE';
    if (clusterCount) clusterCount.value = '20';
  });

  syncProjectionState();
  loadSpatialProjection();
})();
