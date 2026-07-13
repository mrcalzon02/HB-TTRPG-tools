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

  function loadSpatialProjection() {
    if (!document.querySelector('link[href="blacklight-exo-spatial.css"]')) {
      const stylesheet = document.createElement('link');
      stylesheet.rel = 'stylesheet';
      stylesheet.href = 'blacklight-exo-spatial.css';
      document.head.append(stylesheet);
    }

    if (!document.querySelector('script[src="blacklight-exo-spatial.js"]')) {
      const script = document.createElement('script');
      script.src = 'blacklight-exo-spatial.js';
      script.async = false;
      document.head.append(script);
    }
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

  syncProjectionState();
  loadSpatialProjection();
})();