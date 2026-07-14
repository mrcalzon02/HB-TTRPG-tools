(() => {
  'use strict';

  const $ = id => document.getElementById(id);
  const MARGIN = 12;
  const DESKTOP_PIN_WIDTH = 760;
  const docks = [];
  let updateQueued = false;

  function wait(attempt = 0) {
    const systemStage = document.querySelector('.exo-orbit-stage');
    const systemPanel = document.querySelector('#exo-exclusive-view-controls > .exo-interaction-control') || $('exo-system-focus-controls');
    const clusterPanel = $('exo-cluster-interaction-control');
    const clusterCanvas = $('exo-cluster-volume-canvas-v2');
    const clusterGradient = $('exo-cluster-gravity-band-canvas');
    const clusterShell = clusterCanvas?.closest('.exo-cluster-map-shell');

    if (!systemStage || !systemPanel || !clusterPanel || !clusterCanvas || !clusterGradient || !clusterShell) {
      if (attempt < 600) requestAnimationFrame(() => wait(attempt + 1));
      return;
    }

    initializeSystemDock(systemPanel, systemStage);
    initializeClusterDock(clusterPanel, clusterShell, clusterCanvas, clusterGradient);
    bindViewportUpdates();
    scheduleUpdate();
  }

  function initializeSystemDock(panel, stage) {
    if (panel.dataset.previewDock === 'system') return;
    panel.id = 'exo-system-focus-controls';
    panel.dataset.previewDock = 'system';
    panel.classList.add('exo-preview-interaction-overlay', 'exo-system-preview-interaction-overlay');
    stage.classList.add('exo-preview-dock-host');
    stage.append(panel);
    docks.push(createDockRecord(panel, stage, () => stage, [stage]));
  }

  function initializeClusterDock(panel, shell, baseCanvas, gradientCanvas) {
    if (panel.dataset.previewDock === 'cluster') return;
    panel.dataset.previewDock = 'cluster';
    panel.classList.add('exo-preview-interaction-overlay', 'exo-cluster-preview-interaction-overlay');
    shell.classList.add('exo-preview-dock-host');
    shell.append(panel);
    docks.push(createDockRecord(
      panel,
      shell,
      () => gradientCanvas.hidden ? baseCanvas : gradientCanvas,
      [baseCanvas, gradientCanvas]
    ));
  }

  function createDockRecord(panel, home, getPreview, observedElements) {
    const record = {panel, home, getPreview, resizeObserver:null};
    record.resizeObserver = new ResizeObserver(scheduleUpdate);
    for (const element of [...observedElements, panel]) record.resizeObserver.observe(element);
    return record;
  }

  function bindViewportUpdates() {
    window.addEventListener('scroll', scheduleUpdate, {passive:true});
    window.addEventListener('resize', scheduleUpdate, {passive:true});
    window.visualViewport?.addEventListener('resize', scheduleUpdate, {passive:true});
    window.visualViewport?.addEventListener('scroll', scheduleUpdate, {passive:true});
    document.addEventListener('blacklight:system-rendered', scheduleUpdate);
    document.addEventListener('blacklight:cluster-interaction-mode', scheduleUpdate);
    $('exo-view-flat')?.addEventListener('click', scheduleUpdate);
    $('exo-view-3d')?.addEventListener('click', scheduleUpdate);
    $('exo-cluster-volume-routes')?.addEventListener('click', scheduleUpdate);
    $('exo-cluster-volume-gravity')?.addEventListener('click', scheduleUpdate);
    $('exo-cluster-volume-gradient')?.addEventListener('click', scheduleUpdate);
  }

  function scheduleUpdate() {
    if (updateQueued) return;
    updateQueued = true;
    requestAnimationFrame(() => {
      updateQueued = false;
      for (const dock of docks) positionDock(dock);
    });
  }

  function positionDock(dock) {
    const preview = dock.getPreview();
    if (!preview) return;
    const {panel} = dock;
    const previewRect = preview.getBoundingClientRect();
    const viewportHeight = window.visualViewport?.height || window.innerHeight;
    const viewportWidth = window.visualViewport?.width || window.innerWidth;
    const previewVisible = previewRect.bottom > MARGIN && previewRect.top < viewportHeight - MARGIN;

    if (!previewVisible || viewportWidth < DESKTOP_PIN_WIDTH) {
      returnHome(dock, preview, 'top');
      return;
    }

    const panelRect = panel.getBoundingClientRect();
    const panelHeight = Math.min(panelRect.height || 220, Math.max(140, previewRect.height - MARGIN * 2));
    const canPin = previewRect.top < MARGIN && previewRect.bottom > panelHeight + MARGIN;

    if (canPin) {
      pinToViewport(dock, previewRect, panelRect.width || 230, viewportWidth, viewportHeight);
      return;
    }

    if (previewRect.bottom <= panelHeight + MARGIN && previewRect.bottom > MARGIN) {
      returnHome(dock, preview, 'bottom');
      return;
    }

    returnHome(dock, preview, 'top');
  }

  function pinToViewport(dock, previewRect, panelWidth, viewportWidth, viewportHeight) {
    const {panel} = dock;
    if (panel.parentElement !== document.body) document.body.append(panel);
    panel.classList.add('is-viewport-pinned');
    panel.classList.remove('is-preview-bottom');
    const left = Math.min(
      viewportWidth - panelWidth - MARGIN,
      Math.max(MARGIN, previewRect.right - panelWidth - MARGIN)
    );
    panel.style.left = `${Math.round(left)}px`;
    panel.style.right = 'auto';
    panel.style.top = `${MARGIN}px`;
    panel.style.bottom = 'auto';
    panel.style.maxHeight = `${Math.max(150, viewportHeight - MARGIN * 2)}px`;
  }

  function returnHome(dock, preview, placement) {
    const {panel, home} = dock;
    if (panel.parentElement !== home) home.append(panel);
    panel.classList.remove('is-viewport-pinned');
    panel.classList.toggle('is-preview-bottom', placement === 'bottom');
    panel.style.left = 'auto';
    panel.style.right = `${MARGIN}px`;
    panel.style.bottom = 'auto';
    panel.style.maxHeight = '';

    const previewTop = offsetTopWithin(preview, home);
    const panelHeight = panel.offsetHeight || 220;
    const top = placement === 'bottom'
      ? Math.max(previewTop + MARGIN, previewTop + preview.offsetHeight - panelHeight - MARGIN)
      : previewTop + MARGIN;
    panel.style.top = `${Math.round(top)}px`;
  }

  function offsetTopWithin(element, ancestor) {
    let top = 0;
    let node = element;
    while (node && node !== ancestor) {
      top += node.offsetTop || 0;
      node = node.offsetParent;
    }
    if (node === ancestor) return top;
    const elementRect = element.getBoundingClientRect();
    const ancestorRect = ancestor.getBoundingClientRect();
    return elementRect.top - ancestorRect.top + ancestor.scrollTop;
  }

  wait();
})();
