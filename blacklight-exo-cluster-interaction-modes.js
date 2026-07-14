(() => {
  'use strict';

  const $ = id => document.getElementById(id);

  function wait(attempt = 0) {
    const controls = $('exo-cluster-volume-controls');
    const shell = $('exo-cluster-volume-canvas-v2')?.closest('.exo-cluster-map-shell');
    const modeGroup = controls?.querySelector('.exo-cluster-volume-mode');
    const cameraGrid = controls?.querySelector('.exo-cluster-camera-grid');
    if (!controls || !shell || !modeGroup || !cameraGrid) {
      if (attempt < 480) requestAnimationFrame(() => wait(attempt + 1));
      return;
    }
    initialize({shell, modeGroup});
  }

  function initialize({shell, modeGroup}) {
    if ($('exo-cluster-interaction-control')) return;
    let mode = 'select';

    const panel = document.createElement('section');
    panel.id = 'exo-cluster-interaction-control';
    panel.className = 'exo-interaction-control exo-cluster-interaction-control';
    panel.setAttribute('aria-labelledby', 'exo-cluster-interaction-heading');
    panel.innerHTML = `
      <div class="exo-interaction-heading">
        <div><span>Pointer interaction</span><strong id="exo-cluster-interaction-heading">Select objects</strong></div>
        <output id="exo-cluster-interaction-readout">Click a stellar system, non-stellar mass, or lensing concentration.</output>
      </div>
      <div class="exo-interaction-switch" role="group" aria-label="Sector-map pointer mode">
        <button id="exo-cluster-mode-select" class="bli-action is-active" type="button" aria-pressed="true">Select</button>
        <button id="exo-cluster-mode-pan" class="bli-action" type="button" aria-pressed="false">Pan</button>
        <button id="exo-cluster-mode-rotate" class="bli-action" type="button" aria-pressed="false">Rotate View</button>
      </div>`;
    modeGroup.insertAdjacentElement('afterend', panel);

    $('exo-cluster-mode-select')?.addEventListener('click', () => setMode('select'));
    $('exo-cluster-mode-pan')?.addEventListener('click', () => setMode('pan'));
    $('exo-cluster-mode-rotate')?.addEventListener('click', () => setMode('rotate'));

    shell.addEventListener('pointerdown', event => {
      const canvas = event.target.closest?.('#exo-cluster-volume-canvas-v2, #exo-cluster-gravity-band-canvas');
      if (!canvas) return;
      if (mode === 'select') {
        event.stopPropagation();
        return;
      }
      try {
        Object.defineProperties(event, {
          shiftKey:{configurable:true, value:mode === 'pan'},
          button:{configurable:true, value:mode === 'pan' ? 1 : 0}
        });
      } catch {
        if (mode === 'pan') {
          event.preventDefault();
          setText($('exo-cluster-interaction-readout'), 'Pan mode could not initialize for this pointer. Use middle-drag as a fallback.');
        }
      }
      shell.classList.add('exo-viewport-grabbing');
    }, true);

    const finish = event => {
      if (!event.target.closest?.('#exo-cluster-volume-canvas-v2, #exo-cluster-gravity-band-canvas')) return;
      shell.classList.remove('exo-viewport-grabbing');
    };
    shell.addEventListener('pointerup', finish, true);
    shell.addEventListener('pointercancel', finish, true);

    $('exo-cluster-camera-reset')?.addEventListener('click', () => setMode('select'));

    globalThis.BlacklightExoClusterInteraction = {setMode, getMode:() => mode};
    setMode('select');

    function setMode(nextMode) {
      mode = ['select','pan','rotate'].includes(nextMode) ? nextMode : 'select';
      const labels = {
        select:['Select objects','Click a stellar system, non-stellar mass, or lensing concentration.'],
        pan:['Pan sector','Drag to move the cluster camera without changing yaw or pitch.'],
        rotate:['Rotate viewpoint','Drag horizontally and vertically to change camera yaw and pitch.']
      };
      for (const name of ['select','pan','rotate']) {
        const button = $(`exo-cluster-mode-${name}`);
        const active = name === mode;
        button?.classList.toggle('is-active', active);
        button?.setAttribute('aria-pressed', String(active));
      }
      shell.dataset.interactionMode = mode;
      setText($('exo-cluster-interaction-heading'), labels[mode][0]);
      setText($('exo-cluster-interaction-readout'), labels[mode][1]);
      globalThis.BlacklightExoClusterInteractionMode = mode;
      document.dispatchEvent(new CustomEvent('blacklight:cluster-interaction-mode', {detail:{mode}}));
    }
  }

  function setText(node, value) {
    if (node && node.textContent !== String(value)) node.textContent = String(value);
  }

  wait();
})();
