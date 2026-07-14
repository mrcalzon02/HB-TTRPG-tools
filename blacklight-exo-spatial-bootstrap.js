(() => {
  'use strict';

  const $ = id => document.getElementById(id);

  function initialize() {
    const stage = document.querySelector('.exo-orbit-stage');
    const grid = $('exo-cluster-grid');
    if (!stage || !grid) {
      requestAnimationFrame(initialize);
      return;
    }

    if (!$('exo-spatial-controls')) {
      const controls = document.createElement('section');
      controls.id = 'exo-spatial-controls';
      controls.hidden = true;
      controls.setAttribute('aria-hidden', 'true');
      controls.dataset.compatibilityBootstrap = 'true';
      stage.insertAdjacentElement('beforebegin', controls);
    }

    if (!$('exo-orbit-canvas-3d')) {
      const canvas = document.createElement('canvas');
      canvas.id = 'exo-orbit-canvas-3d';
      canvas.hidden = true;
      canvas.width = 1;
      canvas.height = 1;
      canvas.style.display = 'none';
      canvas.style.pointerEvents = 'none';
      canvas.setAttribute('aria-hidden', 'true');
      canvas.dataset.compatibilityBootstrap = 'true';
      stage.append(canvas);
    }

    if (!$('exo-cluster-spatial-map')) {
      const section = grid.closest('.exo-cluster-section');
      const status = $('exo-cluster-status');
      if (section) {
        const wrapper = document.createElement('div');
        wrapper.className = 'exo-cluster-map-shell';
        wrapper.dataset.compatibilityBootstrap = 'true';
        wrapper.innerHTML = `
          <div class="exo-cluster-map-heading">
            <div>
              <span>Relative stellar proximity</span>
              <strong>Cluster volume initializing</strong>
            </div>
            <output id="exo-cluster-map-readout">Awaiting authoritative cluster volume</output>
          </div>
          <svg id="exo-cluster-spatial-map" viewBox="0 0 1000 520" aria-hidden="true"></svg>
        `;
        section.insertBefore(wrapper, status || grid);
      }
    }

    document.dispatchEvent(new CustomEvent('blacklight:spatial-bootstrap-ready'));
  }

  initialize();
})();
