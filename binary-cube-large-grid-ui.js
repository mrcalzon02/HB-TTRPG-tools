(() => {
  'use strict';

  const PANEL_ID = 'shadowrun-binary-cube-lab';

  function configureGridOptions(panel) {
    const engine = window.ShadowrunBinaryCubeEngine;
    const select = panel.querySelector('#cube-size');
    if (!engine || !select || select.dataset.largeGridOptions === 'true') return;
    select.dataset.largeGridOptions = 'true';

    const current = Number(select.value || engine.constants.DEMONSTRATION_GRID_SIZE);
    select.innerHTML = engine.constants.RECOMMENDED_GRID_SIZES.map(size => (
      `<option value="${size}">${size} × ${size} face · ${size * size} cells · depth 0–${size - 1}</option>`
    )).join('');

    const sizes = engine.constants.RECOMMENDED_GRID_SIZES;
    const nearest = sizes.reduce((best, size) => Math.abs(size - current) < Math.abs(best - current) ? size : best, sizes[0]);
    select.value = String(nearest);

    const note = select.closest('.cube-lab-field')?.querySelector('small');
    if (note) {
      note.textContent = `Grid sizes extend through ${engine.constants.MAX_GRID_SIZE} × ${engine.constants.MAX_GRID_SIZE}. Every key retains an exact depth permutation spanning 0 through gridSize−1; large grids require substantially more memory and processing time.`;
    }
  }

  function configureMaskOptions(panel) {
    const select = panel.querySelector('#cube-mask-density');
    if (!select || select.dataset.expandedMaskOptions === 'true') return;
    select.dataset.expandedMaskOptions = 'true';

    const current = Number(select.value || 1);
    const densities = [1, 0.99, 0.95, 0.9, 0.8, 0.75, 0.67, 0.5, 0.33, 0.25, 0.1, 0.05, 0.01];
    select.innerHTML = densities.map(density => {
      const blocked = Math.round((1 - density) * 100);
      const payload = Math.round(density * 100);
      return `<option value="${density}">${blocked}% blocked · ${payload}% payload</option>`;
    }).join('');

    const nearest = densities.reduce((best, density) => Math.abs(density - current) < Math.abs(best - current) ? density : best, densities[0]);
    select.value = String(nearest);

    const note = select.closest('.cube-lab-field')?.querySelector('small');
    if (note) {
      note.textContent = 'Expanded presets range from 0% through 99% blocked. Blocked cells receive deterministic filler, while the exact full-resolution mask remains part of the canonical JSON key.';
    }
  }

  function addInvariantNotice(panel) {
    if (panel.querySelector('[data-cube-depth-invariant]')) return;
    const warning = panel.querySelector('.cube-lab-warning');
    if (!warning) return;
    const notice = document.createElement('p');
    notice.className = 'cube-lab-warning';
    notice.dataset.cubeDepthInvariant = 'true';
    notice.innerHTML = '<strong>Depth-domain invariant:</strong> an N-sized key uses every integer depth from 0 through N−1 exactly once in its depth permutation. Depth is never reduced to an image channel, rounded, bucketed, or approximated.';
    warning.insertAdjacentElement('afterend', notice);
  }

  function enhance() {
    const panel = document.getElementById(PANEL_ID);
    if (!panel) return;
    configureGridOptions(panel);
    configureMaskOptions(panel);
    addInvariantNotice(panel);
  }

  function install() {
    enhance();
    const observer = new MutationObserver(enhance);
    observer.observe(document.documentElement, { childList: true, subtree: true });
  }

  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', install, { once: true }) : install();
})();
