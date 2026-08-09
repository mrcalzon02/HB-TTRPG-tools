(() => {
  'use strict';

  const base = window.HBTTRPGApp;
  if (!base) return;

  let sheetPromise = null;
  let barotraumaEntryPromise = null;
  let shadowrunEntryPromise = null;
  let scientificToolsEntryPromise = null;
  let warhammerLorePromise = null;
  let warhammerWorkspacePromise = null;
  let warhammerPlanetProfilePromise = null;
  let warhammerPlanetCompositorPromise = null;
  let warhammerLogisticsPromise = null;
  let barotraumaImagePreloads = null;
  const loadedScripts = new Map();

  const BAROTRAUMA_ASSET_URLS = Object.freeze([
    'desktop/barotrauma-world-sim/src/main/resources/io/github/mrcalzon02/barotrauma/assets/retro_futurist_interior_atlas_10_images/retro_futurist_interior_atlas_04.png',
    'desktop/barotrauma-world-sim/src/main/resources/io/github/mrcalzon02/barotrauma/assets/retro_futurist_interior_atlas_10_images/retro_futurist_interior_atlas_02.png',
    'desktop/barotrauma-world-sim/src/main/resources/io/github/mrcalzon02/barotrauma/assets/retro_futurist_interior_atlas_10_images/retro_futurist_interior_atlas_06.png',
    'desktop/barotrauma-world-sim/src/main/resources/io/github/mrcalzon02/barotrauma/assets/composite_atlas_images/futuristic_industrial_dystopia_grid.png',
    'desktop/barotrauma-world-sim/src/main/resources/io/github/mrcalzon02/barotrauma/assets/composite_atlas_images/futuristic_industrial_shipyard_collage.png',
    'desktop/barotrauma-world-sim/src/main/resources/io/github/mrcalzon02/barotrauma/assets/composite_atlas_images/futuristic_industrial_megastructure_collage.png',
    'desktop/barotrauma-world-sim/src/main/resources/io/github/mrcalzon02/barotrauma/assets/composite_atlas_images/derelict_ships_in_stormy_industrial_wasteland.png',
    'desktop/barotrauma-world-sim/src/main/resources/io/github/mrcalzon02/barotrauma/assets/sci_fi_ui_asset_sheets_10_images/sci_fi_hud_elements_and_icons_sheet.png',
    'desktop/barotrauma-world-sim/src/main/resources/io/github/mrcalzon02/barotrauma/assets/sci_fi_ui_asset_sheets_10_images/retro_futuristic_ui_assets_sprite_sheet.png',
    'desktop/barotrauma-world-sim/src/main/resources/io/github/mrcalzon02/barotrauma/assets/sci_fi_ui_asset_sheets_10_images/futuristic_sci_fi_medical_ui_kit.png'
  ]);

  function resolvedScriptSource(value) {
    if (!value) return '';
    return new URL(String(value), document.baseURI).href;
  }

  function existingScript(src) {
    const resolved = resolvedScriptSource(src);
    return [...document.scripts].find(script => resolvedScriptSource(script.getAttribute('src')) === resolved);
  }

  function loadScript(src) {
    const resolved = resolvedScriptSource(src);
    if (loadedScripts.has(resolved)) return loadedScripts.get(resolved);
    const existing = existingScript(src);
    if (existing?.dataset.hbLoaded === 'true') return Promise.resolve();

    const promise = new Promise((resolve, reject) => {
      const script = existing || document.createElement('script');
      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        script.dataset.hbLoaded = 'true';
        resolve();
      };
      const fail = () => {
        if (settled) return;
        settled = true;
        reject(new Error(`${src} could not be loaded.`));
      };
      script.addEventListener('load', finish, { once: true });
      script.addEventListener('error', fail, { once: true });
      if (!existing) {
        script.src = src;
        script.async = false;
        script.dataset.hbCoreView = src;
        document.body.appendChild(script);
      } else if (script.dataset.hbLoaded === 'true') finish();
    });

    loadedScripts.set(resolved, promise);
    promise.catch(() => {
      if (loadedScripts.get(resolved) === promise) loadedScripts.delete(resolved);
    });
    return promise;
  }

  function preloadStaticImages(urls) {
    return urls.map((src, index) => {
      const image = new Image();
      image.decoding = 'async';
      image.fetchPriority = index === 0 ? 'high' : 'low';
      image.src = src;
      return image;
    });
  }

  function preloadBarotraumaImages() {
    barotraumaImagePreloads ||= preloadStaticImages(BAROTRAUMA_ASSET_URLS);
    return barotraumaImagePreloads;
  }

  function ensureScientificToolsView() {
    const primaryNav = document.querySelector('.top-nav[aria-label="Primary"]');
    if (primaryNav && !primaryNav.querySelector('[data-view="scientific-tools"]')) {
      const button = document.createElement('button');
      button.className = 'nav-button';
      button.type = 'button';
      button.dataset.view = 'scientific-tools';
      button.textContent = 'Scientific Tools';
      const searchLink = primaryNav.querySelector('a[href="#foundry-search"]');
      primaryNav.insertBefore(button, searchLink || null);
    }

    const menuGrid = document.querySelector('#tools .menu-grid');
    if (menuGrid && !menuGrid.querySelector('[data-scientific-tools-card="true"]')) {
      const card = document.createElement('article');
      card.className = 'menu-card';
      card.dataset.scientificToolsCard = 'true';
      const title = document.createElement('h3');
      title.textContent = 'Scientific Tools';
      const copy = document.createElement('p');
      copy.textContent = 'Setting-neutral experimental systems, including the shared Binary Cube Laboratory, Encoder Visualizer, Decryption Dashboard, ISM Media Simulation, and quantum experiment tools.';
      const button = document.createElement('button');
      button.className = 'link-button';
      button.type = 'button';
      button.dataset.view = 'scientific-tools';
      button.textContent = 'Open Scientific Tools';
      card.append(title, copy, button);
      menuGrid.appendChild(card);
    }

    let view = document.getElementById('scientific-tools');
    if (!view) {
      view = document.createElement('section');
      view.id = 'scientific-tools';
      view.className = 'view';
      view.setAttribute('aria-labelledby', 'scientific-tools-title');
      const title = document.createElement('h2');
      title.id = 'scientific-tools-title';
      title.className = 'module-empty';
      title.textContent = 'Loading Scientific Tools…';
      view.appendChild(title);
      document.querySelector('main')?.appendChild(view);
    }
    return view;
  }

  function ensureWarhammerLoreView() {
    const primaryNav = document.querySelector('.top-nav[aria-label="Primary"]');
    if (primaryNav && !primaryNav.querySelector('[data-view="warhammer-40k"]')) {
      const button = document.createElement('button');
      button.className = 'nav-button';
      button.type = 'button';
      button.dataset.view = 'warhammer-40k';
      button.textContent = 'Warhammer 40K Lore';
      const searchLink = primaryNav.querySelector('a[href="#foundry-search"]');
      primaryNav.insertBefore(button, searchLink || null);
    }

    const menuGrid = document.querySelector('#tools .menu-grid');
    if (menuGrid && !menuGrid.querySelector('[data-warhammer-40k-card="true"]')) {
      const card = document.createElement('article');
      card.className = 'menu-card';
      card.dataset.warhammer40kCard = 'true';
      const title = document.createElement('h3');
      title.textContent = 'Warhammer 40,000 Lore Archive';
      const copy = document.createElement('p');
      copy.textContent = 'Enter the restricted Cafarron Corridor strategic archive and its three-dimensional Navis survey.';
      const button = document.createElement('button');
      button.className = 'link-button';
      button.type = 'button';
      button.dataset.view = 'warhammer-40k';
      button.textContent = 'Enter Restricted Archive';
      card.append(title, copy, button);
      menuGrid.appendChild(card);
    }

    let view = document.getElementById('warhammer-40k');
    if (!view) {
      view = document.createElement('section');
      view.id = 'warhammer-40k';
      view.className = 'view';
      view.setAttribute('aria-labelledby', 'warhammer-40k-title');
      const title = document.createElement('h2');
      title.id = 'warhammer-40k-title';
      title.className = 'module-empty';
      title.textContent = 'Invoking Cafarron Corridor cogitator…';
      view.appendChild(title);
      document.querySelector('main')?.appendChild(view);
    }
    return view;
  }

  async function prepareView(viewId) {
    if (viewId === 'utilities') {
      sheetPromise ||= loadScript('character-sheet-view.js');
      await sheetPromise;
      base.initializeSheet();
      return;
    }
    if (viewId === 'barotrauma') {
      preloadBarotraumaImages();
      barotraumaEntryPromise ||= loadScript('barotrauma-entry.js?v=9');
      await Promise.all([barotraumaEntryPromise, base.prepareView(viewId)]);
      window.BarotraumaWorkspace?.initialize?.();
      return;
    }
    if (viewId === 'shadowrun') {
      shadowrunEntryPromise ||= loadScript('shadowrun-entry.js?v=20260809-binary-cube-unified');
      await Promise.all([shadowrunEntryPromise, base.prepareView(viewId)]);
      return;
    }
    if (viewId === 'scientific-tools') {
      ensureScientificToolsView();
      scientificToolsEntryPromise ||= loadScript('scientific-tools-entry.js?v=20260809-decryption-dashboard-1');
      await scientificToolsEntryPromise;
      window.ScientificToolsWorkspace?.initialize?.();
      return;
    }
    if (viewId === 'warhammer-40k') {
      ensureWarhammerLoreView();
      warhammerLorePromise ||= loadScript('warhammer-40k-wiki-v6.js?v=6');
      warhammerPlanetProfilePromise ||= loadScript('assets/warhammer-40k/shaders/planet-profile-v1.js?v=8');
      warhammerPlanetCompositorPromise ||= warhammerPlanetProfilePromise.then(() => loadScript('assets/warhammer-40k/shaders/planet-compositor-v1.js?v=10'));
      warhammerLogisticsPromise ||= loadScript('assets/warhammer-40k/imperial-logistics-v1.js?v=2');
      await Promise.all([warhammerLorePromise, warhammerPlanetCompositorPromise, warhammerLogisticsPromise]);
      warhammerWorkspacePromise ||= loadScript('warhammer-40k-workspace-v8.js?v=26');
      await Promise.all([warhammerWorkspacePromise, base.prepareView(viewId)]);
      await window.Warhammer40KWorkspace?.initialize?.();
      return;
    }
    return base.prepareView(viewId);
  }

  function setActiveView(viewId) {
    const view = document.getElementById(viewId);
    if (!view?.classList.contains('view')) throw new Error(`The ${viewId} workspace did not create an activatable view.`);
    document.querySelectorAll('.view').forEach(candidate => candidate.classList.toggle('active', candidate === view));
    document.querySelectorAll('[data-view]').forEach(control => control.classList.toggle('active', control.dataset.view === viewId));
    if (location.hash !== `#${viewId}`) history.replaceState(null, '', `#${viewId}`);
    document.dispatchEvent(new CustomEvent('hb:view-activated', { detail: { viewId } }));
    return view;
  }

  async function activateView(viewId) {
    const normalized = String(viewId || '').trim();
    if (!normalized) return null;
    await prepareView(normalized);
    return setActiveView(normalized);
  }

  function reportActivationFailure(viewId, error) {
    console.error(`${viewId} workspace could not be activated.`, error);
    const status = document.querySelector('[role="status"]');
    if (status) status.textContent = `${viewId} workspace could not be loaded: ${error.message}`;
  }

  async function activateHashView() {
    const params = new URLSearchParams(location.search);
    const requestedView = String(params.get('view') || '').trim();
    const requestedTab = String(params.get('tab') || '').trim().toLowerCase();
    const rawHash = location.hash.replace(/^#/, '');
    const mapHashRoute = rawHash === 'warhammer-40k-map';
    const viewId = requestedView || (mapHashRoute ? 'warhammer-40k' : rawHash);
    const tabId = requestedTab || (mapHashRoute ? 'map' : '');
    if (!viewId || !document.querySelector(`[data-view="${CSS.escape(viewId)}"]`)) return;
    await activateView(viewId);
    if (viewId === 'warhammer-40k' && tabId === 'map') {
      const mapTab = document.querySelector('#warhammer-40k [data-tab="map"]');
      if (!mapTab) throw new Error('The Navis Cartographica register did not initialize.');
      mapTab.click();
      if (mapHashRoute && location.hash !== '#warhammer-40k-map') history.replaceState(null, '', '#warhammer-40k-map');
    }
  }

  ensureScientificToolsView();
  ensureWarhammerLoreView();

  document.addEventListener('click', event => {
    const control = event.target.closest('[data-view]');
    if (!control) return;
    const viewId = control.dataset.view;
    if (!viewId) return;
    event.preventDefault();
    void activateView(viewId).catch(error => reportActivationFailure(viewId, error));
  });

  document.addEventListener('hb:view-activated', event => {
    if (event.detail?.viewId === 'modules') window.initModuleViewer?.();
  });

  window.HBTTRPGApp = Object.freeze({ ...base, prepareView, activateView });

  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', () => {
        void activateHashView().catch(error => reportActivationFailure('route', error));
      }, { once: true })
    : void activateHashView().catch(error => reportActivationFailure('route', error));

  void loadScript('shadowrun-binary-cube-engine.js')
    .then(() => loadScript('binary-cube-worker-client.js?v=20260809-v14-binary-cube-worker'))
    .then(() => loadScript('shadowrun-binary-cube-encryption.js?v=20260809-v14-binary-cube-worker'))
    .then(() => loadScript('binary-cube-large-grid-ui.js'))
    .catch(error => { console.error('Canonical Binary Cube engine, background executor, laboratory, or expanded-grid interface support could not be loaded.', error); });
  void loadScript('binary-cube-desktop-link.js')
    .catch(error => { console.error('Binary Cube desktop download links could not be loaded.', error); });
  void loadScript('shadowrun-binary-cube-secure-export.js')
    .catch(error => { console.error('Binary Cube secure export controls could not be loaded.', error); });
})();