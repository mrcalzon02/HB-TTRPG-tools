(() => {
  'use strict';

  const $ = id => document.getElementById(id);
  const MIN_ZOOM = 10;
  const MAX_ZOOM = 50000;

  function wait(attempt = 0) {
    const stage = document.querySelector('.exo-orbit-stage');
    const sourceSvg = $('exo-orbit-svg');
    const canvas = $('exo-exclusive-canvas-3d');
    const zoom = $('exo-exclusive-zoom');
    const reset = $('exo-system-camera-reset');
    if (!stage || !sourceSvg || !canvas || !zoom || !reset) {
      if (attempt < 480) requestAnimationFrame(() => wait(attempt + 1));
      return;
    }
    initialize({stage, sourceSvg, canvas, zoom, reset});
  }

  function initialize({stage, sourceSvg, canvas, zoom, reset}) {
    if ($('exo-system-focus-controls')) return;
    const state = {focusX:0, focusY:0, pointer:null, pending:null, animationTimer:null};
    zoom.min = String(MIN_ZOOM);
    zoom.max = String(MAX_ZOOM);
    zoom.step = '1';

    const layers = () => [sourceSvg, $('exo-flat-spatial-overlays'), $('exo-system-spatial-overlay-v2'), canvas, $('exo-topology-lensing-canvas'), $('exo-system-spatial-overlay-3d-v2'), $('exo-dz-volume-shell-canvas'), $('exo-dz-volume-flat')].filter(Boolean);
    const is3d = () => stage.classList.contains('exo-exclusive-3d');
    const currentZoom = () => Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, Number(zoom.value) || 100));

    function formatZoom(value) {
      return value >= 1000 ? `${(value / 100).toFixed(value >= 10000 ? 0 : 1)}×` : `${Math.round(value)}%`;
    }

    const controls = document.createElement('div');
    controls.id = 'exo-system-focus-controls';
    controls.className = 'exo-system-focus-controls';
    controls.setAttribute('aria-label', 'Three-dimensional focus and zoom controls');
    controls.innerHTML = `
      <button id="exo-system-zoom-out" class="bli-action exo-focus-icon" type="button" aria-label="Zoom out">−</button>
      <output id="exo-system-focus-zoom-readout">${formatZoom(currentZoom())}</output>
      <button id="exo-system-zoom-in" class="bli-action exo-focus-icon" type="button" aria-label="Zoom in">+</button>
      <button id="exo-system-center-star" class="bli-action" type="button">Center on Star</button>`;
    stage.append(controls);

    function setZoom(value) {
      const next = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, value));
      zoom.value = String(Math.round(next));
      zoom.dispatchEvent(new Event('input', {bubbles:true}));
      setText($('exo-system-focus-zoom-readout'), formatZoom(next));
    }

    function animateFocus() {
      clearTimeout(state.animationTimer);
      stage.classList.add('exo-focus-animating');
      state.animationTimer = setTimeout(() => stage.classList.remove('exo-focus-animating'), 440);
    }

    function applyFocus() {
      const compensation = is3d() ? 1 : currentZoom() / 100;
      const x = state.focusX / Math.max(.01, compensation);
      const y = state.focusY / Math.max(.01, compensation);
      for (const layer of layers()) layer.style.translate = `${x}px ${y}px`;
    }

    function clearFocus() {
      state.focusX = 0;
      state.focusY = 0;
      animateFocus();
      applyFocus();
    }

    function focusAt(clientX, clientY) {
      const rect = stage.getBoundingClientRect();
      state.focusX += rect.left + rect.width / 2 - clientX;
      state.focusY += rect.top + rect.height / 2 - clientY;
      animateFocus();
      applyFocus();
    }

    function focusElement(element) {
      const rect = element?.getBoundingClientRect();
      if (rect && (rect.width || rect.height)) focusAt(rect.left + rect.width / 2, rect.top + rect.height / 2);
    }

    function centerStar() {
      clearFocus();
    }

    function signature() {
      const row = document.querySelector('#exo-orbital-table-body tr[aria-selected="true"]');
      return `${row?.dataset.objectId || 'star'}|${$('exo-inspector-title')?.textContent.trim() || ''}`;
    }

    document.addEventListener('pointerdown', event => {
      if (!stage.contains(event.target) || event.target.closest?.('#exo-system-focus-controls')) return;
      state.pointer = {id:event.pointerId, x:event.clientX, y:event.clientY, moved:false};
    }, true);
    document.addEventListener('pointermove', event => {
      if (state.pointer?.id === event.pointerId && Math.hypot(event.clientX - state.pointer.x, event.clientY - state.pointer.y) > 4) state.pointer.moved = true;
    }, true);
    document.addEventListener('pointercancel', event => { if (state.pointer?.id === event.pointerId) state.pointer = null; }, true);

    document.addEventListener('click', event => {
      if (!stage.contains(event.target) || event.target.closest?.('#exo-system-focus-controls')) return;
      const moved = Boolean(state.pointer?.moved);
      state.pointer = null;
      if (moved) return;
      const direct = event.target.closest?.('.exo-planet-target, .exo-moon-target, .exo-star-target, .exo-belt-target');
      if (direct) {
        requestAnimationFrame(() => focusElement(direct));
        return;
      }
      if (event.target === canvas) {
        const before = signature();
        const point = {x:event.clientX, y:event.clientY};
        const pending = {before, point};
        state.pending = pending;
        requestAnimationFrame(() => requestAnimationFrame(() => {
          if (state.pending !== pending) return;
          if (signature() !== before) focusAt(point.x, point.y);
          state.pending = null;
        }));
      }
    }, true);

    document.addEventListener('wheel', event => {
      if (!stage.contains(event.target) || event.target.closest?.('#exo-system-focus-controls')) return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      setZoom(currentZoom() * (event.deltaY > 0 ? .82 : 1.22));
      applyFocus();
    }, {capture:true, passive:false});

    $('exo-system-zoom-out')?.addEventListener('click', () => { setZoom(currentZoom() / 1.6); applyFocus(); });
    $('exo-system-zoom-in')?.addEventListener('click', () => { setZoom(currentZoom() * 1.6); applyFocus(); });
    $('exo-system-center-star')?.addEventListener('click', centerStar);
    zoom.addEventListener('input', () => { setText($('exo-system-focus-zoom-readout'), formatZoom(currentZoom())); applyFocus(); });
    reset.addEventListener('click', clearFocus, true);
    $('exo-view-flat')?.addEventListener('click', () => requestAnimationFrame(applyFocus));
    $('exo-view-3d')?.addEventListener('click', () => requestAnimationFrame(applyFocus));
    new MutationObserver(() => requestAnimationFrame(applyFocus)).observe(stage, {childList:true, subtree:false});
    applyFocus();
  }

  function setText(node, value) { if (node && node.textContent !== String(value)) node.textContent = String(value); }
  wait();
})();
