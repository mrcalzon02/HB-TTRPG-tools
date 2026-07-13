(() => {
  'use strict';

  const speed = document.getElementById('exo-speed-select');
  const toggle = document.getElementById('exo-toggle-orbits');
  const generate = document.getElementById('exo-generate-system');
  const seed = document.getElementById('exo-seed-input');

  if (!speed || !toggle) return;

  let lastActiveSpeed =
    Number(speed.value) > 0 ? speed.value : '0.0416666666667';

  const isPaused = () =>
    toggle.getAttribute('aria-pressed') === 'true';

  function syncProjectionState() {
    if (Number(speed.value) > 0) {
      lastActiveSpeed = speed.value;
      if (isPaused()) toggle.click();
      return;
    }

    if (!isPaused()) toggle.click();
  }

  speed.addEventListener('change', syncProjectionState);

  toggle.addEventListener('click', () => {
    if (!isPaused() && Number(speed.value) === 0) {
      speed.value = lastActiveSpeed;
    }
  });

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
})();
