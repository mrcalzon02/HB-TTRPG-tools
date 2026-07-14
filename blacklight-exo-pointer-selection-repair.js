(() => {
  'use strict';

  function initialize() {
    const stage = document.querySelector('.exo-orbit-stage');
    const svg = document.getElementById('exo-orbit-svg');
    if (!stage || !svg) {
      requestAnimationFrame(initialize);
      return;
    }
    if (stage.dataset.pointerSelectionRepair === 'true') return;
    stage.dataset.pointerSelectionRepair = 'true';

    let pointer = null;

    // The viewport drag layer registers before this repair and captures every
    // pointer immediately. Release that capture for an ordinary click. Capture
    // is restored only after the pointer has genuinely moved into a drag.
    stage.addEventListener('pointerdown', event => {
      if (event.button !== 0 && event.button !== 1) return;
      pointer = {
        id:event.pointerId,
        startX:event.clientX,
        startY:event.clientY,
        dragging:false
      };
      release(stage, event.pointerId);
    }, true);

    stage.addEventListener('pointermove', event => {
      if (!pointer || pointer.id !== event.pointerId) return;
      if (!pointer.dragging && Math.hypot(event.clientX - pointer.startX, event.clientY - pointer.startY) > 4) {
        pointer.dragging = true;
        try { stage.setPointerCapture?.(event.pointerId); } catch {}
      }
    }, true);

    const finish = event => {
      if (!pointer || pointer.id !== event.pointerId) return;
      if (!pointer.dragging) release(stage, event.pointerId);
      pointer = null;
    };
    stage.addEventListener('pointerup', finish, true);
    stage.addEventListener('pointercancel', finish, true);

    // Defensive delegation: if an SVG body's own listener was lost during a
    // published-data redraw, select the corresponding orbital-table record.
    svg.addEventListener('click', event => {
      const target = event.target instanceof Element
        ? event.target.closest('.exo-star-target,.exo-planet-target,.exo-moon-target,.exo-belt-target')
        : null;
      if (!target) return;
      const label = target.getAttribute('aria-label')?.replace(/^Select\s+/i, '').trim();
      if (!label) return;
      if (target.classList.contains('exo-star-target')) {
        target.dispatchEvent(new CustomEvent('blacklight:flat-body-selected', {bubbles:true, detail:{id:'star', name:label}}));
        return;
      }
      const rows = [...document.querySelectorAll('#exo-orbital-table-body tr')];
      const row = rows.find(item => item.cells?.[1]?.textContent.trim().replace(/^↳\s*/, '') === label);
      if (!row || row.getAttribute('aria-selected') === 'true') return;
      row.querySelector('button')?.click();
    });
  }

  function release(element, pointerId) {
    try {
      if (element.hasPointerCapture?.(pointerId)) element.releasePointerCapture(pointerId);
    } catch {}
  }

  initialize();
})();
