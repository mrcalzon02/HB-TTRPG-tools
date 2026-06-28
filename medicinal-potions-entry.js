(() => {
  'use strict';

  const loaded = new Map();
  let bundlePromise = null;

  function loadStyle(href) {
    if (document.querySelector(`link[data-potion-formulary-style="${href}"]`)) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.dataset.potionFormularyStyle = href;
    document.head.appendChild(link);
  }

  function loadScript(src) {
    if (loaded.has(src)) return loaded.get(src);
    const promise = new Promise((resolve, reject) => {
      const existing = [...document.scripts].find(script => (script.getAttribute('src') || '').split('?')[0].endsWith(src));
      if (existing?.dataset.potionFormularyLoaded === 'true') return resolve();
      const script = existing || document.createElement('script');
      script.async = false;
      script.addEventListener('load', () => {
        script.dataset.potionFormularyLoaded = 'true';
        resolve();
      }, { once: true });
      script.addEventListener('error', () => reject(new Error(`${src} could not be loaded.`)), { once: true });
      if (!existing) {
        script.src = src;
        document.body.appendChild(script);
      }
    });
    loaded.set(src, promise);
    return promise;
  }

  function loadBundle() {
    if (bundlePromise) return bundlePromise;
    bundlePromise = (async () => {
      loadStyle('medicinal-potions.css');
      for (const src of ['medicinal-potions-core-data.js', 'medicinal-potions-effects-data.js', 'medicinal-potions-sensory-data.js', 'medicinal-potions-compounds-data.js', 'medicinal-potions-process-data.js', 'medicinal-potions-formula-data.js', 'medicinal-potions-aging-data.js', 'medicinal-potions-data.js', 'medicinal-potions-engine.js', 'medicinal-potions-module.js']) await loadScript(src);
    })();
    return bundlePromise;
  }

  async function activateTab(button) {
    const selected = button.dataset.generatorTab;
    document.querySelectorAll('[data-generator-tab]').forEach(tab => {
      const active = tab === button;
      tab.classList.toggle('active', active);
      tab.setAttribute('aria-selected', String(active));
      tab.tabIndex = active ? 0 : -1;
    });
    document.querySelectorAll('[data-generator-panel]').forEach(panel => {
      panel.hidden = panel.dataset.generatorPanel !== selected;
    });
    if (selected === 'potion-formulary') {
      const root = document.getElementById('medicinal-potions-root');
      if (root) root.innerHTML = '<div class="module-empty">Loading Potion Formulary…</div>';
      try {
        await loadBundle();
      } catch (error) {
        if (root) root.innerHTML = `<div class="module-empty">Potion Formulary failed to load: ${String(error.message || error)}</div>`;
      }
    }
  }

  function install() {
    const tablist = document.querySelector('.generator-subnav');
    if (!tablist || tablist.dataset.potionFormularyInstalled === 'true') return;
    tablist.dataset.potionFormularyInstalled = 'true';
    tablist.addEventListener('click', event => {
      const button = event.target.closest('[data-generator-tab]');
      if (button) void activateTab(button);
    });
    tablist.addEventListener('keydown', event => {
      if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
      const tabs = [...tablist.querySelectorAll('[data-generator-tab]')];
      const current = tabs.indexOf(document.activeElement);
      if (current < 0) return;
      event.preventDefault();
      const direction = event.key === 'ArrowRight' ? 1 : -1;
      const next = tabs[(current + direction + tabs.length) % tabs.length];
      next.focus();
      void activateTab(next);
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, { once: true });
  else install();
})();