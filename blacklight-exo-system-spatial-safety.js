(() => {
  'use strict';

  for (const id of ['exo-overlay-lensing', 'exo-overlay-limits']) {
    const input = document.getElementById(id);
    if (!input) continue;
    input.checked = false;
    input.dispatchEvent(new Event('change', {bubbles: true}));
  }

  function bindReset(attempt = 0) {
    const reset = document.getElementById('exo-system-camera-reset');
    const yaw = document.getElementById('exo-exclusive-yaw');
    const pitch = document.getElementById('exo-exclusive-pitch');
    const zoom = document.getElementById('exo-exclusive-zoom');
    if (!reset || !yaw || !pitch || !zoom) {
      if (attempt < 240) requestAnimationFrame(() => bindReset(attempt + 1));
      return;
    }
    reset.addEventListener('click', () => {
      for (const [input, value] of [[yaw, '-24'], [pitch, '58'], [zoom, '100']]) {
        input.value = value;
        input.dispatchEvent(new Event('input', {bubbles: true}));
      }
    }, true);
  }

  bindReset();
})();
