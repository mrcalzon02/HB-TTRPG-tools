(() => {
  'use strict';

  const loaded = new Map();
  let bundlePromise = null;
  let highFantasyPromise = null;

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
      loadStyle('medicinal-potions-srd.css');
      for (const src of [
        'medicinal-potions-core-data.js',
        'medicinal-potions-effects-data.js',
        'medicinal-potions-sensory-data.js',
        'medicinal-potions-compounds-data.js',
        'medicinal-potions-process-data.js',
        'medicinal-potions-formula-data.js',
        'medicinal-potions-aging-data.js',
        'medicinal-potions-data.js',
        'medicinal-potions-engine.js',
        'medicinal-potions-module.js',
        'medicinal-potions-srd-core-data.js',
        'medicinal-potions-srd-entries-a.js',
        'medicinal-potions-srd-entries-b.js',
        'medicinal-potions-srd-entries-c.js',
        'medicinal-potions-srd-entries-d.js',
        'medicinal-potions-srd-data.js',
        'medicinal-potions-srd-engine.js',
        'medicinal-potions-srd-module.js'
      ]) await loadScript(src);
    })();
    return bundlePromise;
  }

  function loadHighFantasyBundle() {
    if (highFantasyPromise) return highFantasyPromise;
    highFantasyPromise = (async () => {
      loadStyle('high-fantasy-potions.css');
      await loadScript('high-fantasy-potions.js');
      window.HBHighFantasyPotionGenerator?.mount();
    })();
    return highFantasyPromise;
  }

  function ensurePotionTabs() {
    const tablist = document.querySelector('.generator-subnav');
    if (!tablist) return null;

    const kaysenderTab = tablist.querySelector('[data-generator-tab="potion-formulary"]');
    if (kaysenderTab) {
      kaysenderTab.textContent = 'Kaysender Potion Generator';
      kaysenderTab.setAttribute('aria-controls', 'potion-formulary-panel');
    }

    let highFantasyTab = tablist.querySelector('[data-generator-tab="high-fantasy-potions"]');
    if (!highFantasyTab) {
      highFantasyTab = document.createElement('button');
      highFantasyTab.id = 'high-fantasy-potions-tab';
      highFantasyTab.className = 'generator-tab';
      highFantasyTab.type = 'button';
      highFantasyTab.setAttribute('role', 'tab');
      highFantasyTab.setAttribute('aria-selected', 'false');
      highFantasyTab.setAttribute('aria-controls', 'high-fantasy-potions-panel');
      highFantasyTab.dataset.generatorTab = 'high-fantasy-potions';
      highFantasyTab.tabIndex = -1;
      highFantasyTab.textContent = 'High Fantasy Potion Generator';
      tablist.insertBefore(highFantasyTab, kaysenderTab || null);
    }

    let highFantasyPanel = document.getElementById('high-fantasy-potions-panel');
    if (!highFantasyPanel) {
      highFantasyPanel = document.createElement('div');
      highFantasyPanel.id = 'high-fantasy-potions-panel';
      highFantasyPanel.className = 'generator-panel';
      highFantasyPanel.setAttribute('role', 'tabpanel');
      highFantasyPanel.setAttribute('aria-labelledby', 'high-fantasy-potions-tab');
      highFantasyPanel.dataset.generatorPanel = 'high-fantasy-potions';
      highFantasyPanel.hidden = true;
      highFantasyPanel.innerHTML = '<div id="high-fantasy-potions-root"><div class="module-empty">Open the High Fantasy Potion Generator tab to create complete generic d20-compatible potion records and assortments.</div></div>';
      const kaysenderPanel = document.getElementById('potion-formulary-panel');
      if (kaysenderPanel) kaysenderPanel.before(highFantasyPanel);
      else document.getElementById('generator-library-panel')?.after(highFantasyPanel);
    }

    const kaysenderRoot = document.getElementById('medicinal-potions-root');
    if (kaysenderRoot && kaysenderRoot.dataset.mounted !== 'true') {
      kaysenderRoot.innerHTML = '<div class="module-empty">Open the Kaysender Potion Generator tab to generate Medicinal, Minor, Medium, Major, Elixir, and standard open-d20 potion formulas.</div>';
    }

    return tablist;
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

    if (selected === 'high-fantasy-potions') {
      const root = document.getElementById('high-fantasy-potions-root');
      if (root && root.dataset.mounted !== 'true') root.innerHTML = '<div class="module-empty">Loading High Fantasy Potion Generator…</div>';
      try {
        await loadHighFantasyBundle();
      } catch (error) {
        if (root) root.innerHTML = `<div class="module-empty">High Fantasy Potion Generator failed to load: ${String(error.message || error)}</div>`;
      }
    }

    if (selected === 'potion-formulary') {
      const root = document.getElementById('medicinal-potions-root');
      if (root && root.dataset.mounted !== 'true') root.innerHTML = '<div class="module-empty">Loading Kaysender Potion Generator…</div>';
      try {
        await loadBundle();
      } catch (error) {
        if (root) root.innerHTML = `<div class="module-empty">Kaysender Potion Generator failed to load: ${String(error.message || error)}</div>`;
      }
    }
  }

  function install() {
    const tablist = ensurePotionTabs();
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

    const requested = new URLSearchParams(location.search).get('generator');
    const requestedTab = requested === 'high-fantasy-potions'
      ? tablist.querySelector('[data-generator-tab="high-fantasy-potions"]')
      : requested === 'kaysender-potions'
        ? tablist.querySelector('[data-generator-tab="potion-formulary"]')
        : null;
    if (requestedTab) requestAnimationFrame(() => requestedTab.click());
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, { once: true });
  else install();
})();