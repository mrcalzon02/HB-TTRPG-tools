(() => {
  'use strict';

  const base = window.HBTTRPGApp;
  if (!base) return;

  let sheetPromise = null;
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

  function normalizedScriptSource(value) {
    return String(value || '').split('?')[0].replace(/^\.\//, '');
  }

  function existingScript(src) {
    const normalized = normalizedScriptSource(src);
    return [...document.scripts].find(script => {
      const value = normalizedScriptSource(script.getAttribute('src'));
      return value === normalized || value.endsWith(`/${normalized}`);
    });
  }

  function loadScript(src) {
    if (loadedScripts.has(src)) return loadedScripts.get(src);

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
      }
    });

    loadedScripts.set(src, promise);
    promise.catch(() => {
      if (loadedScripts.get(src) === promise) loadedScripts.delete(src);
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

  async function prepareView(viewId) {
    if (viewId === 'utilities') {
      sheetPromise ||= loadScript('character-sheet-view.js');
      await sheetPromise;
      base.initializeSheet();
      return;
    }
    if (viewId === 'barotrauma') {
      preloadBarotraumaImages();
      await base.prepareView(viewId);
      await window.BarotraumaWorkspace?.initialize?.();
      return;
    }
    return base.prepareView(viewId);
  }

  document.addEventListener('hb:view-activated', event => {
    if (event.detail?.viewId === 'modules') window.initModuleViewer?.();
  });

  window.HBTTRPGApp = Object.freeze({
    ...base,
    prepareView
  });

  void loadScript('binary-cube-large-grid-engine.js')
    .then(() => loadScript('binary-cube-omnidirectional-engine.js'))
    .then(() => loadScript('binary-cube-large-grid-ui.js'))
    .catch(error => {
      console.error('Binary Cube large-grid or omnidirectional invariant support could not be loaded.', error);
    });

  void loadScript('binary-cube-desktop-link.js').catch(error => {
    console.error('Binary Cube desktop download links could not be loaded.', error);
  });

  void loadScript('shadowrun-binary-cube-secure-export.js').catch(error => {
    console.error('Binary Cube secure export controls could not be loaded.', error);
  });
})();