(() => {
  'use strict';

  const RESOURCE_ROOT = 'desktop/barotrauma-world-sim/src/main/resources/io/github/mrcalzon02/barotrauma/assets';
  const CLASSPATH_ROOT = '/io/github/mrcalzon02/barotrauma/assets';

  const SCENE_MAPS = [
    `${RESOURCE_ROOT}/scene-atlas-exterior.tsv`,
    `${RESOURCE_ROOT}/scene-atlas-interior.tsv`
  ];

  const UI_SHEETS = [
    {
      id: 'medical-ui',
      map: `${RESOURCE_ROOT}/ui-atlas-reviewed/medical-ui.tsv`,
      image: `${RESOURCE_ROOT}/sci_fi_ui_asset_sheets_10_images/futuristic_sci_fi_medical_ui_kit.png`
    },
    {
      id: 'retro-futuristic-ui',
      map: `${RESOURCE_ROOT}/ui-atlas-reviewed/retro-futuristic-ui.tsv`,
      image: `${RESOURCE_ROOT}/sci_fi_ui_asset_sheets_10_images/retro_futuristic_ui_assets_sprite_sheet.png`
    },
    {
      id: 'hud-elements',
      map: `${RESOURCE_ROOT}/ui-atlas-reviewed/hud-elements.tsv`,
      image: `${RESOURCE_ROOT}/sci_fi_ui_asset_sheets_10_images/sci_fi_hud_elements_and_icons_sheet.png`
    },
    {
      id: 'game-hud-icons',
      map: `${RESOURCE_ROOT}/ui-atlas-reviewed/game-hud-icons.tsv`,
      image: `${RESOURCE_ROOT}/sci_fi_ui_asset_sheets_10_images/sci_fi_game_hud_icon_atlas.png`
    }
  ];

  const SCENE_ROLES = Object.freeze({
    'application-shell': 'interior-command-observation-room',
    'world-map': 'exterior-floodlit-megastructure-basin',
    'fleet-management': 'exterior-flooded-repair-basin',
    logistics: 'interior-operations-table-room',
    observation: 'interior-panoramic-command-room',
    'import-review': 'interior-white-lit-laboratory-bay',
    registry: 'interior-planning-room',
    simulation: 'exterior-dense-flooded-megacity',
    recovery: 'exterior-broken-battleship-in-rain'
  });

  const UI_ROLES = Object.freeze({
    panel: 'medical-large-panel',
    'inner-panel': 'medical-grid-panel',
    button: 'medical-teal-pill-button',
    tab: 'retro-ui-favorite-tab',
    location: 'retro-ui-map-pin-gold',
    station: 'retro-ui-map-pin-star',
    vessel: 'hud-elements-submarine',
    shuttle: 'hud-elements-shuttle-a',
    route: 'hud-elements-navigation-arrow',
    warning: 'hud-elements-warning-icon',
    save: 'medical-save-icon',
    notification: 'medical-message-icon',
    mission: 'retro-ui-flag-button',
    research: 'medical-atom-symbol',
    cargo: 'game-hud-backpack',
    crew: 'retro-ui-crew-button',
    geology: 'hud-elements-mountain-icon',
    tools: 'hud-elements-gear-icon',
    document: 'retro-ui-document-button',
    medical: 'medical-kit-symbol',
    observe: 'medical-observation-card'
  });

  const MODULE_PRESENTATION = Object.freeze({
    'barotrauma-crewmans-primer': { scene: 'observation', ui: 'document' },
    'barotrauma-cult-faction-dossiers': { scene: 'registry', ui: 'crew' },
    'barotrauma-submarine-operations-console': { scene: 'fleet-management', ui: 'tools' },
    'barotrauma-crew-roster-generator': { scene: 'registry', ui: 'crew' },
    'barotrauma-mission-contract-generator': { scene: 'simulation', ui: 'mission' },
    'barotrauma-emergency-cascade-generator': { scene: 'recovery', ui: 'warning' },
    'barotrauma-creature-threat-catalogue': { scene: 'recovery', ui: 'warning' },
    'barotrauma-depth-detective': { scene: 'observation', ui: 'observe' },
    'barotrauma-outpost-wreck-generator': { scene: 'world-map', ui: 'station' },
    'barotrauma-campaign-logbook': { scene: 'logistics', ui: 'document' }
  });

  const imagePromises = new Map();
  const renderStates = new WeakMap();
  let catalogPromise = null;

  const resizeObserver = typeof ResizeObserver === 'function'
    ? new ResizeObserver(entries => entries.forEach(entry => renderCanvas(entry.target)))
    : null;

  function parseTsv(text) {
    const lines = String(text).replace(/^\uFEFF/, '').split(/\r?\n/).filter(line => line.trim());
    if (!lines.length) return [];
    const header = lines.shift().split('\t');
    return lines.map(line => {
      const values = line.split('\t');
      return Object.fromEntries(header.map((key, index) => [key, values[index] ?? '']));
    });
  }

  async function fetchText(url) {
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) throw new Error(`${url} returned ${response.status}.`);
    return response.text();
  }

  function repositoryResource(classpathResource) {
    if (!classpathResource.startsWith(CLASSPATH_ROOT)) {
      throw new Error(`Unsupported packaged resource path: ${classpathResource}`);
    }
    return `${RESOURCE_ROOT}${classpathResource.slice(CLASSPATH_ROOT.length)}`;
  }

  async function loadCatalog() {
    if (catalogPromise) return catalogPromise;
    catalogPromise = (async () => {
      const sceneRows = (await Promise.all(SCENE_MAPS.map(fetchText))).flatMap(parseTsv);
      const scenes = new Map(sceneRows.map(row => [row.semantic_name, {
        image: repositoryResource(row.resource),
        x: Number(row.x), y: Number(row.y),
        width: Number(row.width), height: Number(row.height),
        semanticName: row.semantic_name
      }]));

      const uiRows = await Promise.all(UI_SHEETS.map(async sheet => ({
        sheet,
        rows: parseTsv(await fetchText(sheet.map))
      })));
      const ui = new Map();
      uiRows.forEach(({ sheet, rows }) => rows.forEach(row => {
        if (row.status !== 'approved' || !row.semantic_name) return;
        ui.set(row.semantic_name, {
          image: sheet.image,
          x: Number(row.x), y: Number(row.y),
          width: Number(row.width), height: Number(row.height),
          semanticName: row.semantic_name,
          sheetId: sheet.id
        });
      }));

      return Object.freeze({ scenes, ui });
    })();
    return catalogPromise;
  }

  function loadImage(url) {
    if (!imagePromises.has(url)) {
      imagePromises.set(url, new Promise((resolve, reject) => {
        const image = new Image();
        image.decoding = 'async';
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error(`Packaged image could not be loaded: ${url}`));
        image.src = url;
      }));
    }
    return imagePromises.get(url);
  }

  function drawCrop(context, image, crop, width, height, mode) {
    let destinationX = 0;
    let destinationY = 0;
    let destinationWidth = width;
    let destinationHeight = height;

    if (mode !== 'stretch') {
      const factor = mode === 'cover'
        ? Math.max(width / crop.width, height / crop.height)
        : Math.min(width / crop.width, height / crop.height);
      destinationWidth = crop.width * factor;
      destinationHeight = crop.height * factor;
      destinationX = (width - destinationWidth) / 2;
      destinationY = (height - destinationHeight) / 2;
    }

    context.drawImage(image,
      crop.x, crop.y, crop.width, crop.height,
      destinationX, destinationY, destinationWidth, destinationHeight);
  }

  async function renderCanvas(canvas) {
    const state = renderStates.get(canvas);
    if (!state) return;
    const width = Math.max(1, Math.round(canvas.clientWidth || Number(canvas.dataset.width) || 64));
    const height = Math.max(1, Math.round(canvas.clientHeight || Number(canvas.dataset.height) || 64));
    const ratio = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
    const pixelWidth = Math.round(width * ratio);
    const pixelHeight = Math.round(height * ratio);
    if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
      canvas.width = pixelWidth;
      canvas.height = pixelHeight;
    }
    const context = canvas.getContext('2d');
    if (!context) return;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.clearRect(0, 0, width, height);
    try {
      const image = await loadImage(state.descriptor.image);
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = 'high';
      drawCrop(context, image, state.descriptor, width, height, state.mode);
      canvas.dataset.barotraumaAssetReady = 'true';
    } catch (error) {
      canvas.dataset.barotraumaAssetReady = 'false';
      canvas.closest('.barotrauma-atlas-surface')?.classList.add('barotrauma-atlas-error');
      console.error(error);
    }
  }

  function attachRenderer(canvas, descriptor, mode) {
    renderStates.set(canvas, { descriptor, mode });
    resizeObserver?.observe(canvas);
    void renderCanvas(canvas);
  }

  function ensureBackdrop(target, descriptor) {
    target.classList.add('barotrauma-atlas-surface');
    let canvas = Array.from(target.children).find(child => child.classList?.contains('barotrauma-atlas-backdrop'));
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.className = 'barotrauma-atlas-backdrop';
      canvas.setAttribute('aria-hidden', 'true');
      target.prepend(canvas);
    }
    if (canvas.dataset.barotraumaSemantic !== descriptor.semanticName) {
      canvas.dataset.barotraumaSemantic = descriptor.semanticName;
      attachRenderer(canvas, descriptor, 'cover');
    }
  }

  function ensureIcon(target, descriptor) {
    target.classList.add('barotrauma-atlas-surface');
    let canvas = Array.from(target.children).find(child => child.classList?.contains('barotrauma-atlas-icon'));
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.className = 'barotrauma-atlas-icon';
      canvas.dataset.width = '64';
      canvas.dataset.height = '64';
      canvas.setAttribute('aria-hidden', 'true');
      const backdrop = Array.from(target.children).find(child => child.classList?.contains('barotrauma-atlas-backdrop'));
      target.insertBefore(canvas, backdrop?.nextSibling || target.firstChild);
    }
    if (canvas.dataset.barotraumaSemantic !== descriptor.semanticName) {
      canvas.dataset.barotraumaSemantic = descriptor.semanticName;
      attachRenderer(canvas, descriptor, 'contain');
    }
  }

  function seedAutomaticRoles(root) {
    const liveHero = root.querySelector?.('#barotrauma > .hero-card');
    if (liveHero) {
      liveHero.dataset.barotraumaScene ||= 'application-shell';
      liveHero.dataset.barotraumaUi ||= 'vessel';
    }
    const landingHero = root.querySelector?.('.workspace-hero[data-workspace-code="EUR"]');
    if (landingHero) {
      landingHero.dataset.barotraumaScene ||= 'application-shell';
      landingHero.dataset.barotraumaUi ||= 'vessel';
    }
    root.querySelectorAll?.('#barotrauma-overview-grid .module-card[data-module-id]').forEach(card => {
      const presentation = MODULE_PRESENTATION[card.dataset.moduleId];
      if (!presentation) return;
      card.dataset.barotraumaScene ||= presentation.scene;
      card.dataset.barotraumaUi ||= presentation.ui;
    });
  }

  async function decorate(root = document) {
    const catalog = await loadCatalog();
    seedAutomaticRoles(root);

    root.querySelectorAll?.('[data-barotrauma-scene]').forEach(target => {
      const semanticName = SCENE_ROLES[target.dataset.barotraumaScene] || target.dataset.barotraumaScene;
      const descriptor = catalog.scenes.get(semanticName);
      if (descriptor) ensureBackdrop(target, descriptor);
    });

    root.querySelectorAll?.('[data-barotrauma-ui]').forEach(target => {
      const semanticName = UI_ROLES[target.dataset.barotraumaUi] || target.dataset.barotraumaUi;
      const descriptor = catalog.ui.get(semanticName);
      if (descriptor) ensureIcon(target, descriptor);
    });
  }

  const mutationObserver = new MutationObserver(records => {
    if (records.some(record => record.addedNodes.length)) void decorate(document);
  });

  function start() {
    mutationObserver.observe(document.documentElement, { childList: true, subtree: true });
    void decorate(document);
  }

  window.BarotraumaPackagedAssets = Object.freeze({
    decorate,
    loadCatalog,
    sceneRoles: SCENE_ROLES,
    uiRoles: UI_ROLES
  });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
