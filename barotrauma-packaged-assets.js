(() => {
  'use strict';

  const ROOT = 'desktop/barotrauma-world-sim/src/main/resources/io/github/mrcalzon02/barotrauma/assets';
  const SHEETS = Object.freeze({
    interior04: `${ROOT}/retro_futurist_interior_atlas_10_images/retro_futurist_interior_atlas_04.png`,
    interior02: `${ROOT}/retro_futurist_interior_atlas_10_images/retro_futurist_interior_atlas_02.png`,
    interior06: `${ROOT}/retro_futurist_interior_atlas_10_images/retro_futurist_interior_atlas_06.png`,
    exterior01: `${ROOT}/composite_atlas_images/derelict_ships_in_stormy_industrial_wasteland.png`,
    exterior03: `${ROOT}/composite_atlas_images/futuristic_industrial_dystopia_grid.png`,
    exterior05: `${ROOT}/composite_atlas_images/futuristic_industrial_megastructure_collage.png`,
    exterior06: `${ROOT}/composite_atlas_images/futuristic_industrial_shipyard_collage.png`,
    medical: `${ROOT}/sci_fi_ui_asset_sheets_10_images/futuristic_sci_fi_medical_ui_kit.png`,
    retro: `${ROOT}/sci_fi_ui_asset_sheets_10_images/retro_futuristic_ui_assets_sprite_sheet.png`,
    hud: `${ROOT}/sci_fi_ui_asset_sheets_10_images/sci_fi_hud_elements_and_icons_sheet.png`
  });

  const SCENES = Object.freeze({
    'application-shell': { image: SHEETS.interior04, sheetWidth: 2048, sheetHeight: 768, x: 4, y: 5, width: 675, height: 376 },
    observation: { image: SHEETS.interior02, sheetWidth: 2048, sheetHeight: 768, x: 689, y: 10, width: 669, height: 369 },
    'import-review': { image: SHEETS.interior02, sheetWidth: 2048, sheetHeight: 768, x: 10, y: 389, width: 668, height: 369 },
    logistics: { image: SHEETS.interior06, sheetWidth: 2048, sheetHeight: 768, x: 713, y: 385, width: 646, height: 378 },
    registry: { image: SHEETS.interior04, sheetWidth: 2048, sheetHeight: 768, x: 686, y: 386, width: 676, height: 377 },
    'world-map': { image: SHEETS.exterior03, sheetWidth: 2048, sheetHeight: 768, x: 1368, y: 0, width: 680, height: 382 },
    'fleet-management': { image: SHEETS.exterior06, sheetWidth: 2048, sheetHeight: 768, x: 687, y: 386, width: 674, height: 375 },
    simulation: { image: SHEETS.exterior05, sheetWidth: 2048, sheetHeight: 768, x: 1367, y: 386, width: 676, height: 377 },
    recovery: { image: SHEETS.exterior01, sheetWidth: 2048, sheetHeight: 768, x: 1366, y: 385, width: 680, height: 381 }
  });

  const ICONS = Object.freeze({
    vessel: { image: SHEETS.hud, sheetWidth: 1280, sheetHeight: 360, x: 428, y: 277, width: 60, height: 29 },
    tools: { image: SHEETS.hud, sheetWidth: 1280, sheetHeight: 360, x: 1187, y: 222, width: 41, height: 41 },
    document: { image: SHEETS.retro, sheetWidth: 1280, sheetHeight: 1280, x: 1160, y: 924, width: 73, height: 64 },
    medical: { image: SHEETS.medical, sheetWidth: 1280, sheetHeight: 1280, x: 613, y: 85, width: 30, height: 34 },
    research: { image: SHEETS.medical, sheetWidth: 1280, sheetHeight: 1280, x: 747, y: 138, width: 46, height: 39 },
    mission: { image: SHEETS.retro, sheetWidth: 1280, sheetHeight: 1280, x: 1160, y: 779, width: 73, height: 64 },
    route: { image: SHEETS.hud, sheetWidth: 1280, sheetHeight: 360, x: 688, y: 89, width: 31, height: 39 },
    location: { image: SHEETS.retro, sheetWidth: 1280, sheetHeight: 1280, x: 872, y: 1069, width: 22, height: 33 },
    station: { image: SHEETS.retro, sheetWidth: 1280, sheetHeight: 1280, x: 1062, y: 1069, width: 23, height: 33 },
    crew: { image: SHEETS.retro, sheetWidth: 1280, sheetHeight: 1280, x: 1160, y: 635, width: 73, height: 63 },
    warning: { image: SHEETS.hud, sheetWidth: 1280, sheetHeight: 360, x: 1077, y: 276, width: 36, height: 33 },
    observe: { image: SHEETS.medical, sheetWidth: 1280, sheetHeight: 1280, x: 213, y: 791, width: 34, height: 33 },
    available: { image: SHEETS.medical, sheetWidth: 1280, sheetHeight: 1280, x: 650, y: 791, width: 33, height: 33 },
    planned: { image: SHEETS.medical, sheetWidth: 1280, sheetHeight: 1280, x: 322, y: 791, width: 34, height: 33 },
    download: { image: SHEETS.medical, sheetWidth: 1280, sheetHeight: 1280, x: 536, y: 733, width: 38, height: 32 },
    search: { image: SHEETS.hud, sheetWidth: 1280, sheetHeight: 360, x: 433, y: 149, width: 57, height: 59 },
    notification: { image: SHEETS.medical, sheetWidth: 1280, sheetHeight: 1280, x: 15, y: 608, width: 48, height: 21 }
  });

  const imagePromises = new Map();

  function descriptor(collection, role) {
    const value = collection[role];
    if (!value) throw new Error(`Unknown Barotrauma atlas role: ${role}`);
    return value;
  }

  function createSvg(value, className, preserveAspectRatio) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', className);
    svg.setAttribute('viewBox', `${value.x} ${value.y} ${value.width} ${value.height}`);
    svg.setAttribute('preserveAspectRatio', preserveAspectRatio);
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');

    const image = document.createElementNS('http://www.w3.org/2000/svg', 'image');
    image.setAttribute('href', value.image);
    image.setAttribute('x', '0');
    image.setAttribute('y', '0');
    image.setAttribute('width', String(value.sheetWidth));
    image.setAttribute('height', String(value.sheetHeight));
    svg.appendChild(image);
    return svg;
  }

  function createScene(role) {
    return createSvg(descriptor(SCENES, role), 'barotrauma-atlas-backdrop', 'xMidYMid slice');
  }

  function createIcon(role, className = 'barotrauma-atlas-icon') {
    return createSvg(descriptor(ICONS, role), className, 'xMidYMid meet');
  }

  function loadImage(url) {
    if (!imagePromises.has(url)) {
      imagePromises.set(url, new Promise((resolve, reject) => {
        const image = new Image();
        image.decoding = 'async';
        image.onload = () => resolve(url);
        image.onerror = () => reject(new Error(`Barotrauma atlas image could not be loaded: ${url}`));
        image.src = url;
      }));
    }
    return imagePromises.get(url);
  }

  function preload() {
    return Promise.all([...new Set([
      ...Object.values(SCENES).map(value => value.image),
      ...Object.values(ICONS).map(value => value.image)
    ])].map(loadImage));
  }

  window.BarotraumaPackagedAssets = Object.freeze({
    createScene,
    createIcon,
    preload,
    scenes: SCENES,
    icons: ICONS
  });
})();