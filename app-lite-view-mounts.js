(() => {
  'use strict';

  const base = window.HBTTRPGApp;
  if (!base) return;
  let sheetPromise = null;

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

  function loadScript(src) {
    if (document.querySelector(`script[data-hb-core-view="${src}"]`)) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.async = false;
      script.dataset.hbCoreView = src;
      script.onload = resolve;
      script.onerror = () => reject(new Error(`${src} could not be loaded.`));
      document.body.appendChild(script);
    });
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

  const barotraumaImagePreloads = preloadStaticImages(BAROTRAUMA_ASSET_URLS);
  const barotraumaScriptPromise = loadScript('barotrauma-entry.js?v=5');

  async function prepareView(viewId) {
    if (viewId === 'utilities') {
      sheetPromise ||= loadScript('character-sheet-view.js');
      await sheetPromise;
      base.initializeSheet();
      return;
    }
    if (viewId === 'barotrauma') {
      await Promise.all([barotraumaScriptPromise, base.prepareView(viewId)]);
      window.BarotraumaWorkspace?.initialize();
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

  void barotraumaImagePreloads;

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
