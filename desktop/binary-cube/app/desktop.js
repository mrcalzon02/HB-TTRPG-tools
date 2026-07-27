(() => {
  'use strict';

  const PANEL_ID = 'shadowrun-binary-cube-lab';

  function applyDesktopPresentation() {
    const panel = document.getElementById(PANEL_ID);
    if (!panel) return false;

    const title = panel.querySelector('.cube-lab-header h2');
    const eyebrow = panel.querySelector('.cube-lab-header .eyebrow');
    const close = panel.querySelector('[data-cube-close]');
    const seed = panel.querySelector('#cube-seed');
    const key = panel.querySelector('#cube-key');
    const packageField = panel.querySelector('#cube-package');

    if (title) title.textContent = 'Binary Cube Encryption Laboratory';
    if (eyebrow) eyebrow.textContent = `Offline desktop utility · engine ${window.ShadowrunBinaryCubeEngine?.constants?.SCHEMA_VERSION || 'unknown'}`;

    if (seed && seed.value === 'shadowrun-matrix-demo' && !key?.value.trim() && !packageField?.value.trim()) {
      seed.value = 'binary-cube-desktop';
    }

    if (close && close.dataset.desktopCloseBound !== 'true') {
      close.dataset.desktopCloseBound = 'true';
      close.textContent = 'Close Application';
      close.addEventListener('click', event => {
        event.preventDefault();
        event.stopImmediatePropagation();
        window.close();
      }, true);
    }

    return true;
  }


  function bindArtifactHandoffs() {
    if (document.body.dataset.binaryCubeDesktopHandoffs === 'true') return;
    document.body.dataset.binaryCubeDesktopHandoffs = 'true';
    window.addEventListener('shadowrun-binary-cube-open-visualizer', async event => {
      try {
        await Promise.resolve(window.ShadowrunBinaryCubeVisualizer?.loadArtifacts(event.detail || {}));
      } catch (error) {
        window.alert(error.message);
      }
    });
    window.addEventListener('shadowrun-binary-cube-open-laboratory', async event => {
      try {
        await Promise.resolve(window.ShadowrunBinaryCubeEncryption?.loadArtifacts(event.detail || {}));
      } catch (error) {
        window.alert(error.message);
      }
    });
  }

  function initialize() {
    bindArtifactHandoffs();
    window.ShadowrunBinaryCubeEncryption?.openPanel();
    applyDesktopPresentation();

    const observer = new MutationObserver(() => {
      if (applyDesktopPresentation()) observer.disconnect();
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize, { once: true });
  } else {
    initialize();
  }
})();
