(() => {
  'use strict';

  const loaded = new Map();
  let bundlePromise = null;
  let highFantasyPromise = null;
  let worldHooksPromise = null;

  function loadStyle(href) {
    const normalized = href.split('?')[0];
    const existing = [...document.querySelectorAll('link[rel="stylesheet"]')].find(link => {
      const value = (link.getAttribute('href') || '').split('?')[0];
      return value === normalized || value.endsWith(`/${normalized}`);
    });
    if (existing) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.dataset.generatorBenchStyle = href;
    document.head.appendChild(link);
  }

  function loadScript(src) {
    if (loaded.has(src)) return loaded.get(src);
    const promise = new Promise((resolve, reject) => {
      const existing = [...document.scripts].find(script => (script.getAttribute('src') || '').split('?')[0].endsWith(src));
      if (existing?.dataset.generatorBenchLoaded === 'true' || existing?.dataset.potionFormularyLoaded === 'true') return resolve();
      const script = existing || document.createElement('script');
      script.async = false;
      script.addEventListener('load', () => {
        script.dataset.generatorBenchLoaded = 'true';
        resolve();
      }, { once: true });
      script.addEventListener('error', () => reject(new Error(`${src} could not be loaded.`)), { once: true });
      if (!existing) {
        script.src = src;
        document.body.appendChild(script);
      }
    });
    loaded.set(src, promise);
    promise.catch(() => {
      if (loaded.get(src) === promise) loaded.delete(src);
    });
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

  function loadWorldHooksBundle() {
    if (worldHooksPromise) return worldHooksPromise;
    worldHooksPromise = (async () => {
      loadStyle('world-hooks.css');
      await loadScript('world-hooks-core-data.js');
      await loadScript('world-hooks-focused-data.js');
      await loadScript('world-hooks-generator.js');
      window.HBWorldHooksGenerator?.mount();
    })();
    return worldHooksPromise;
  }

  function ensureTab(tablist, config, before = null) {
    let tab = tablist.querySelector(`[data-generator-tab="${config.key}"]`);
    if (tab) return tab;
    tab = document.createElement('button');
    tab.id = config.tabId;
    tab.className = 'generator-tab';
    tab.type = 'button';
    tab.setAttribute('role', 'tab');
    tab.setAttribute('aria-selected', 'false');
    tab.setAttribute('aria-controls', config.panelId);
    tab.dataset.generatorTab = config.key;
    tab.tabIndex = -1;
    tab.textContent = config.label;
    tablist.insertBefore(tab, before);
    return tab;
  }

  function ensurePanel(config, before = null) {
    let panel = document.getElementById(config.panelId);
    if (panel) return panel;
    panel = document.createElement('div');
    panel.id = config.panelId;
    panel.className = 'generator-panel';
    panel.setAttribute('role', 'tabpanel');
    panel.setAttribute('aria-labelledby', config.tabId);
    panel.dataset.generatorPanel = config.key;
    panel.hidden = true;
    panel.innerHTML = `<div id="${config.rootId}"><div class="module-empty">${config.placeholder}</div></div>`;
    if (before) before.before(panel);
    else document.getElementById('generator-library-panel')?.after(panel);
    return panel;
  }

  function ensureGeneratorTabs() {
    const tablist = document.querySelector('.generator-subnav');
    if (!tablist) return null;

    const kaysenderTab = tablist.querySelector('[data-generator-tab="potion-formulary"]');
    if (kaysenderTab) {
      kaysenderTab.textContent = 'Kaysender Potion Generator';
      kaysenderTab.setAttribute('aria-controls', 'potion-formulary-panel');
    }

    const kaysenderPanel = document.getElementById('potion-formulary-panel');
    const worldHooks = {
      key: 'world-hooks',
      tabId: 'world-hooks-tab',
      panelId: 'world-hooks-panel',
      rootId: 'world-hooks-root',
      label: 'World Hooks',
      placeholder: 'Open the World Hooks tab to generate campaign-scale setting foundations, mysteries, themes, conflicts, twists, limitations, environmental pressures, and long-term stakes.'
    };
    const highFantasy = {
      key: 'high-fantasy-potions',
      tabId: 'high-fantasy-potions-tab',
      panelId: 'high-fantasy-potions-panel',
      rootId: 'high-fantasy-potions-root',
      label: 'High Fantasy Potion Generator',
      placeholder: 'Open the High Fantasy Potion Generator tab to create complete generic d20-compatible potion records and assortments.'
    };

    ensureTab(tablist, worldHooks, kaysenderTab || null);
    ensurePanel(worldHooks, kaysenderPanel);
    ensureTab(tablist, highFantasy, kaysenderTab || null);
    ensurePanel(highFantasy, kaysenderPanel);

    const kaysenderRoot = document.getElementById('medicinal-potions-root');
    if (kaysenderRoot && kaysenderRoot.dataset.mounted !== 'true') {
      kaysenderRoot.innerHTML = '<div class="module-empty">Open the Kaysender Potion Generator tab to generate Medicinal, Minor, Medium, Major, Elixir, and standard open-d20 potion formulas.</div>';
    }

    return tablist;
  }

  function showLoadError(root, label, error) {
    if (root) root.innerHTML = `<div class="module-empty">${label} failed to load: ${String(error.message || error)}</div>`;
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

    if (selected === 'world-hooks') {
      const root = document.getElementById('world-hooks-root');
      if (root && root.dataset.mounted !== 'true') root.innerHTML = '<div class="module-empty">Loading World Hooks Generator…</div>';
      try {
        await loadWorldHooksBundle();
      } catch (error) {
        showLoadError(root, 'World Hooks Generator', error);
      }
    }

    if (selected === 'high-fantasy-potions') {
      const root = document.getElementById('high-fantasy-potions-root');
      if (root && root.dataset.mounted !== 'true') root.innerHTML = '<div class="module-empty">Loading High Fantasy Potion Generator…</div>';
      try {
        await loadHighFantasyBundle();
      } catch (error) {
        showLoadError(root, 'High Fantasy Potion Generator', error);
      }
    }

    if (selected === 'potion-formulary') {
      const root = document.getElementById('medicinal-potions-root');
      if (root && root.dataset.mounted !== 'true') root.innerHTML = '<div class="module-empty">Loading Kaysender Potion Generator…</div>';
      try {
        await loadBundle();
      } catch (error) {
        showLoadError(root, 'Kaysender Potion Generator', error);
      }
    }
  }

  function install() {
    const tablist = ensureGeneratorTabs();
    if (!tablist || tablist.dataset.generatorBenchInstalled === 'true') return;
    tablist.dataset.generatorBenchInstalled = 'true';
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
    const requestedTab = requested === 'world-hooks'
      ? tablist.querySelector('[data-generator-tab="world-hooks"]')
      : requested === 'high-fantasy-potions'
        ? tablist.querySelector('[data-generator-tab="high-fantasy-potions"]')
        : requested === 'kaysender-potions'
          ? tablist.querySelector('[data-generator-tab="potion-formulary"]')
          : null;
    if (requestedTab) requestAnimationFrame(() => requestedTab.click());
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, { once: true });
  else install();
})();
