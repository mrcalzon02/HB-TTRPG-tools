(() => {
  'use strict';

  const $ = id => document.getElementById(id);
  const MIN_ZOOM = 35;
  const MAX_ZOOM = 800;

  function waitForView(attempt = 0) {
    const stage = document.querySelector('.exo-orbit-stage');
    const sourceSvg = $('exo-orbit-svg');
    const systemCanvas = $('exo-exclusive-canvas-3d');
    const zoom = $('exo-exclusive-zoom');
    const reset = $('exo-system-camera-reset');
    if (!stage || !sourceSvg || !systemCanvas || !zoom || !reset) {
      if (attempt < 360) requestAnimationFrame(() => waitForView(attempt + 1));
      return;
    }
    initialize({stage, sourceSvg, systemCanvas, zoom, reset});
  }

  function initialize({stage, sourceSvg, systemCanvas, zoom, reset}) {
    if ($('exo-system-focus-controls')) return;

    const state = {
      focusX: 0,
      focusY: 0,
      pointer: null,
      lastSelectedPoint: null,
      animationTimer: null
    };

    zoom.min = String(MIN_ZOOM);
    zoom.max = String(MAX_ZOOM);
    zoom.step = '1';

    const controls = document.createElement('div');
    controls.id = 'exo-system-focus-controls';
    controls.className = 'exo-system-focus-controls';
    controls.setAttribute('aria-label', 'Three-dimensional focus and zoom controls');
    controls.innerHTML = `
      <button id="exo-system-zoom-out" class="bli-action exo-focus-icon" type="button" aria-label="Zoom out">−</button>
      <output id="exo-system-focus-zoom-readout">${Math.round(Number(zoom.value) || 100)}%</output>
      <button id="exo-system-zoom-in" class="bli-action exo-focus-icon" type="button" aria-label="Zoom in">+</button>
      <button id="exo-system-center-star" class="bli-action" type="button">Center on Star</button>
    `;
    stage.append(controls);

    const focusLayers = () => [
      sourceSvg,
      $('exo-flat-spatial-overlays'),
      $('exo-system-spatial-overlay-v2'),
      systemCanvas,
      $('exo-topology-lensing-canvas'),
      $('exo-system-spatial-overlay-3d-v2')
    ].filter(Boolean);

    function isThreeDimensional() {
      return stage.classList.contains('exo-exclusive-3d');
    }

    function selectedSignature() {
      const row = document.querySelector('#exo-orbital-table-body tr[aria-selected="true"]');
      const title = $('exo-inspector-title')?.textContent.trim() || '';
      const systemNode = $('exo-system-lensing-inspector-title')?.textContent.trim() || '';
      const systemInspector = $('exo-system-lensing-inspector');
      const visibleSystemNode = systemInspector && !systemInspector.hidden ? systemNode : '';
      return `${row?.dataset.objectId || 'star'}|${title}|${visibleSystemNode}`;
    }

    function currentZoom() {
      return Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, Number(zoom.value) || 100));
    }

    function setZoom(value) {
      const next = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, value));
      zoom.value = String(Math.round(next));
      zoom.dispatchEvent(new Event('input', {bubbles: true}));
      const readout = $('exo-system-focus-zoom-readout');
      if (readout) readout.textContent = `${Math.round(next)}%`;
    }

    function animateFocus() {
      clearTimeout(state.animationTimer);
      stage.classList.add('exo-focus-animating');
      state.animationTimer = setTimeout(() => {
        stage.classList.remove('exo-focus-animating');
      }, 260);
    }

    function applyFocus() {
      const scaleCompensation = isThreeDimensional() ? 1 : currentZoom() / 100;
      const x = state.focusX / Math.max(0.01, scaleCompensation);
      const y = state.focusY / Math.max(0.01, scaleCompensation);
      for (const layer of focusLayers()) {
        layer.style.translate = `${x}px ${y}px`;
      }
    }

    function clearFocus() {
      state.focusX = 0;
      state.focusY = 0;
      state.lastSelectedPoint = null;
      animateFocus();
      applyFocus();
    }

    function focusAtClientPoint(clientX, clientY) {
      const rect = stage.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      state.focusX += centerX - clientX;
      state.focusY += centerY - clientY;
      state.lastSelectedPoint = {clientX: centerX, clientY: centerY};
      animateFocus();
      applyFocus();
    }

    function focusElement(element) {
      const rect = element?.getBoundingClientRect();
      if (!rect || (!rect.width && !rect.height)) return;
      focusAtClientPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
    }

    function centerOnStar() {
      const visual = isThreeDimensional() ? systemCanvas : sourceSvg;
      const rect = visual.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      focusAtClientPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
      state.lastSelectedPoint = null;
    }

    function objectTargetFromEvent(event) {
      return event.target instanceof Element
        ? event.target.closest('.exo-planet-target, .exo-moon-target, .exo-star-target, .exo-belt-target')
        : null;
    }

    document.addEventListener('pointerdown', event => {
      if (!stage.contains(event.target)) return;
      if (event.target instanceof Element && event.target.closest('#exo-system-focus-controls')) return;
      state.pointer = {
        id: event.pointerId,
        x: event.clientX,
        y: event.clientY,
        moved: false
      };
    }, true);

    document.addEventListener('pointermove', event => {
      if (!state.pointer || state.pointer.id !== event.pointerId) return;
      if (Math.hypot(event.clientX - state.pointer.x, event.clientY - state.pointer.y) > 4) {
        state.pointer.moved = true;
      }
    }, true);

    const finishPointer = event => {
      if (state.pointer?.id === event.pointerId && event.type === 'pointercancel') state.pointer = null;
    };
    document.addEventListener('pointercancel', finishPointer, true);

    document.addEventListener('click', event => {
      if (!stage.contains(event.target)) return;
      if (event.target instanceof Element && event.target.closest('#exo-system-focus-controls')) return;
      const moved = Boolean(state.pointer?.moved);
      state.pointer = null;
      if (moved) return;

      const directTarget = objectTargetFromEvent(event);
      if (directTarget) {
        requestAnimationFrame(() => focusElement(directTarget));
        return;
      }

      const before = selectedSignature();
      const point = {x: event.clientX, y: event.clientY};
      requestAnimationFrame(() => requestAnimationFrame(() => {
        const after = selectedSignature();
        if (after !== before) focusAtClientPoint(point.x, point.y);
      }));
    }, true);

    document.addEventListener('wheel', event => {
      if (!stage.contains(event.target)) return;
      if (event.target instanceof Element && event.target.closest('#exo-system-focus-controls')) return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      const factor = event.deltaY > 0 ? 0.88 : 1.14;
      setZoom(currentZoom() * factor);
      applyFocus();
    }, {capture: true, passive: false});

    $('exo-system-zoom-out')?.addEventListener('click', () => {
      setZoom(currentZoom() / 1.25);
      applyFocus();
    });
    $('exo-system-zoom-in')?.addEventListener('click', () => {
      setZoom(currentZoom() * 1.25);
      applyFocus();
    });
    $('exo-system-center-star')?.addEventListener('click', centerOnStar);

    zoom.addEventListener('input', () => {
      const readout = $('exo-system-focus-zoom-readout');
      if (readout) readout.textContent = `${Math.round(currentZoom())}%`;
      applyFocus();
    });

    reset.addEventListener('click', clearFocus, true);
    $('exo-view-flat')?.addEventListener('click', () => requestAnimationFrame(applyFocus));
    $('exo-view-3d')?.addEventListener('click', () => requestAnimationFrame(applyFocus));

    new MutationObserver(() => requestAnimationFrame(applyFocus))
      .observe(stage, {childList: true, subtree: false});

    applyFocus();
  }

  waitForView();
})();
