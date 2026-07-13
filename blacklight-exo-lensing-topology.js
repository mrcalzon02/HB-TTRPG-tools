(() => {
  'use strict';

  const $ = id => document.getElementById(id);
  const SVG_NS = 'http://www.w3.org/2000/svg';

  function waitForInterface(attempt = 0) {
    const model = globalThis.BlacklightExoLensingModel;
    const stage = document.querySelector('.exo-orbit-stage');
    const flatOverlay = $('exo-flat-spatial-overlays');
    const sourceTable = $('exo-orbital-table-body');
    const seedInput = $('exo-seed-input');
    const clusterGrid = $('exo-cluster-grid');
    const clusterSeedInput = $('exo-cluster-seed');
    const oldToggle = $('exo-overlay-lensing');
    const systemCanvas = $('exo-exclusive-canvas-3d');

    if (!model || !stage || !flatOverlay || !sourceTable || !seedInput ||
        !clusterGrid || !clusterSeedInput || !oldToggle || !systemCanvas) {
      if (attempt < 300) requestAnimationFrame(() => waitForInterface(attempt + 1));
      return;
    }

    initialize({
      model,
      stage,
      flatOverlay,
      sourceTable,
      seedInput,
      clusterGrid,
      clusterSeedInput,
      oldToggle
    });
  }

  function initialize(elements) {
    if ($('exo-topology-lensing-canvas')) return;

    const {
      model,
      stage,
      flatOverlay,
      sourceTable,
      seedInput,
      clusterGrid,
      clusterSeedInput,
      oldToggle
    } = elements;

    const state = {
      enabled: false,
      planets: 0,
      moons: 0,
      connectionCount: 0,
      nearbyClusterNodes: 0,
      majorDescriptors: [],
      minorCount: 0,
      mirageCount: 0,
      nodes: [],
      canvas: null,
      context: null,
      flatGroup: null,
      renderQueued: false,
      rebuildQueued: false
    };

    const replacementToggle = oldToggle.cloneNode(true);
    replacementToggle.checked = false;
    oldToggle.replaceWith(replacementToggle);

    const summary = document.createElement('span');
    summary.id = 'exo-lensing-node-summary';
    summary.className = 'exo-lensing-node-summary';
    replacementToggle.closest('fieldset')?.append(summary);

    const canvas = document.createElement('canvas');
    canvas.id = 'exo-topology-lensing-canvas';
    canvas.className = 'exo-topology-lensing-canvas';
    canvas.setAttribute('aria-label', 'System gravitational-lensing topology overlay');
    canvas.setAttribute('aria-hidden', 'true');
    stage.append(canvas);
    state.canvas = canvas;
    state.context = canvas.getContext('2d');

    const resize = () => {
      const ratio = Math.min(2, window.devicePixelRatio || 1);
      const width = Math.max(480, stage.clientWidth);
      const height = Math.max(420, stage.clientHeight);
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      scheduleRender();
    };
    new ResizeObserver(resize).observe(stage);
    resize();

    replacementToggle.addEventListener('change', event => {
      state.enabled = event.target.checked;
      updateVisibility();
      drawFlatOverlay();
      scheduleRender();
    });

    const scheduleRebuild = () => {
      if (state.rebuildQueued) return;
      state.rebuildQueued = true;
      requestAnimationFrame(() => requestAnimationFrame(() => {
        state.rebuildQueued = false;
        rebuildModel();
      }));
    };

    new MutationObserver(scheduleRebuild).observe(sourceTable, {childList: true, subtree: true});
    new MutationObserver(scheduleRebuild).observe(clusterGrid, {childList: true, subtree: true});
    new MutationObserver(() => {
      if (!state.enabled || !stage.classList.contains('exo-exclusive-flat')) return;
      if (!flatOverlay.querySelector('#exo-topology-flat-lensing-group')) {
        requestAnimationFrame(drawFlatOverlay);
      }
    }).observe(flatOverlay, {childList: true});

    $('exo-generate-system')?.addEventListener('click', scheduleRebuild);
    $('exo-generate-cluster')?.addEventListener('click', scheduleRebuild);
    $('exo-random-cluster')?.addEventListener('click', scheduleRebuild);
    seedInput.addEventListener('change', scheduleRebuild);
    clusterSeedInput.addEventListener('change', scheduleRebuild);
    $('exo-view-flat')?.addEventListener('click', updateVisibility);
    $('exo-view-3d')?.addEventListener('click', updateVisibility);
    ['exo-exclusive-yaw', 'exo-exclusive-pitch', 'exo-exclusive-zoom']
      .forEach(id => $(id)?.addEventListener('input', scheduleRender));

    function rebuildModel() {
      const counts = readSystemCounts();
      state.planets = counts.planets;
      state.moons = counts.moons;
      state.minorCount = counts.planets;
      state.mirageCount = counts.moons > 10
        ? Math.min(2, Math.ceil((counts.moons - 10) / 10))
        : 0;

      const topology = deriveClusterTopology();
      state.connectionCount = topology.connectionCount;
      state.nearbyClusterNodes = topology.nearbyClusterNodes.length;
      state.majorDescriptors = topology.majorDescriptors;
      state.nodes = buildSystemNodes();

      summary.textContent = `${state.majorDescriptors.length} major · ${state.minorCount} minor · ${state.mirageCount} mirage`;
      summary.title = `${state.connectionCount} connected-system nodes + ${state.nearbyClusterNodes} nearby aggregate cluster-lensing nodes; ${state.planets} planet-linked minor nodes; ${state.moons} moons.`;

      drawFlatOverlay();
      scheduleRender();
    }

    function readSystemCounts() {
      let planets = 0;
      let moons = 0;
      for (const row of sourceTable.querySelectorAll('tr')) {
        const orbit = row.cells?.[0]?.textContent.trim() || '';
        if (/^\d+$/.test(orbit)) planets += 1;
        else if (/^\d+\.\d+$/.test(orbit)) moons += 1;
      }
      return {planets, moons};
    }

    function deriveClusterTopology() {
      const entries = [...clusterGrid.querySelectorAll('.exo-cluster-card')].map((card, index) => {
        const star = card.querySelector('.exo-cluster-primary')?.textContent.trim() || '';
        return {
          seed: card.querySelector('.exo-cluster-seed')?.textContent.trim() || `system-${index + 1}`,
          name: card.querySelector('h3')?.textContent.trim() || `System ${index + 1}`,
          star,
          mass: model.stellarMass(star),
          populated: card.classList.contains('is-populated')
        };
      });

      if (!entries.length) {
        return {connectionCount: 0, nearbyClusterNodes: [], majorDescriptors: []};
      }

      const scene = model.buildScene(
        entries,
        clusterSeedInput.value.trim() || 'cluster',
        {mergeRadiusAu: 1000}
      );
      const selected = scene.entries.find(entry => entry.seed === seedInput.value.trim()) || scene.entries[0];
      const connectedEdges = scene.edges.filter(edge => edge.from === selected || edge.to === selected);
      const nearestDistance = selected.nearest?.distance || scene.maxRadius * 0.3;
      const nearbyRadius = Math.max(1000, nearestDistance * 0.75);
      const nearbyClusterNodes = scene.lensingNodes.filter(node =>
        model.distance3(node.position, selected.position) <= nearbyRadius
      );

      const connectedDescriptors = connectedEdges.map(edge => {
        const other = edge.from === selected ? edge.to : edge.from;
        const massFactor = Math.sqrt(Math.max(0.001, selected.mass * other.mass));
        const distanceFactor = 1 / Math.max(0.15, edge.distance / Math.max(1, scene.maxRadius));
        return {
          id: `connection:${other.seed}`,
          label: `Connected system: ${other.name}`,
          strength: 0.6 + Math.min(2.4, Math.sqrt(massFactor * distanceFactor)),
          source: 'connected-system'
        };
      });

      const clusterDescriptors = nearbyClusterNodes.map(node => ({
        id: `cluster-node:${node.id}`,
        label: `${node.name} (${node.connections.length} generating connection${node.connections.length === 1 ? '' : 's'})`,
        strength: Math.max(0.55, node.strength),
        source: node.anomaly ? 'cluster-anomaly' : 'cluster-aggregate'
      }));

      return {
        connectionCount: connectedEdges.length,
        nearbyClusterNodes,
        majorDescriptors: [...connectedDescriptors, ...clusterDescriptors]
      };
    }

    function buildSystemNodes() {
      const nodes = [];
      const majorMaximum = Math.max(1, ...state.majorDescriptors.map(item => item.strength));
      for (const descriptor of state.majorDescriptors) {
        const rng = model.randomFor(`${seedInput.value.trim()}:${descriptor.id}:major-node`);
        const direction = randomUnitVector(rng);
        const radial = 0.9 + rng() * 0.14;
        nodes.push({
          category: 'major',
          label: descriptor.label,
          source: descriptor.source,
          x: direction.x * radial,
          y: direction.y * radial,
          z: direction.z * radial,
          strength: 0.45 + 0.55 * Math.sqrt(descriptor.strength / majorMaximum)
        });
      }

      appendGeneratedNodes(nodes, 'minor', state.minorCount, 0.58, 0.84, 0.28, 0.62);
      appendGeneratedNodes(nodes, 'mirage', state.mirageCount, 1.04, 1.13, 0.18, 0.4);
      return nodes;
    }

    function appendGeneratedNodes(nodes, category, count, radiusMin, radiusMax, strengthMin, strengthMax) {
      const rng = model.randomFor(`${seedInput.value.trim()}:${category}:system-lensing-v2`);
      for (let index = 0; index < count; index += 1) {
        const direction = randomUnitVector(rng);
        const radial = radiusMin + (radiusMax - radiusMin) * rng();
        nodes.push({
          category,
          label: category === 'minor' ? `Planet-linked minor node ${index + 1}` : `Moon-density mirage node ${index + 1}`,
          x: direction.x * radial,
          y: direction.y * radial,
          z: direction.z * radial,
          strength: strengthMin + (strengthMax - strengthMin) * rng()
        });
      }
    }

    function drawFlatOverlay() {
      state.flatGroup?.remove();
      state.flatGroup = null;
      if (!state.enabled || !stage.classList.contains('exo-exclusive-flat')) return;

      const group = document.createElementNS(SVG_NS, 'g');
      group.id = 'exo-topology-flat-lensing-group';
      for (const node of state.nodes) {
        const circle = document.createElementNS(SVG_NS, 'circle');
        circle.setAttribute('cx', (500 + node.x * 405).toFixed(2));
        circle.setAttribute('cy', (500 + node.y * 405).toFixed(2));
        circle.setAttribute('r', flatRadius(node).toFixed(2));
        circle.setAttribute('class', `exo-topology-node ${node.category}`);
        circle.setAttribute('opacity', (0.3 + node.strength * 0.65).toFixed(2));
        group.append(circle);
        if (node.category === 'mirage') {
          const echo = circle.cloneNode(false);
          echo.setAttribute('cx', (500 + node.x * 405 + 8).toFixed(2));
          echo.setAttribute('cy', (500 + node.y * 405 - 5).toFixed(2));
          echo.classList.add('echo');
          group.append(echo);
        }
      }

      const label = document.createElementNS(SVG_NS, 'text');
      label.setAttribute('x', '26');
      label.setAttribute('y', '42');
      label.setAttribute('class', 'exo-flat-overlay-label');
      label.textContent = `Lensing topology: ${state.majorDescriptors.length} major · ${state.minorCount} minor · ${state.mirageCount} mirage`;
      group.append(label);
      flatOverlay.append(group);
      state.flatGroup = group;
    }

    function flatRadius(node) {
      if (node.category === 'major') return 4.2 + node.strength * 4.8;
      if (node.category === 'mirage') return 3.8 + node.strength * 3;
      return 2.2 + node.strength * 3.2;
    }

    function render3d() {
      state.renderQueued = false;
      const context = state.context;
      if (!context || !state.enabled || !stage.classList.contains('exo-exclusive-3d')) {
        context?.clearRect(0, 0, state.canvas.width, state.canvas.height);
        return;
      }

      const width = state.canvas.width;
      const height = state.canvas.height;
      context.clearRect(0, 0, width, height);
      const yaw = Number($('exo-exclusive-yaw')?.value || -24) * Math.PI / 180;
      const pitch = Number($('exo-exclusive-pitch')?.value || 58) * Math.PI / 180;
      const zoom = Number($('exo-exclusive-zoom')?.value || 100) / 100;
      const scale = Math.min(width, height) * 0.37 * zoom;
      const projected = state.nodes.map(node => {
        const rotated = rotate(node, yaw, pitch);
        const perspective = 1 / Math.max(0.58, 1 + rotated.z * 0.28);
        return {
          ...node,
          x2: width / 2 + rotated.x * scale * perspective,
          y2: height / 2 + rotated.y * scale * perspective,
          depth: rotated.z,
          perspective
        };
      }).sort((a, b) => a.depth - b.depth);

      for (const node of projected) drawCanvasNode(context, node);
      context.fillStyle = 'rgba(221,204,245,.94)';
      context.font = `${12 * Math.min(2, window.devicePixelRatio || 1)}px system-ui`;
      context.fillText(`${state.majorDescriptors.length} major · ${state.minorCount} minor · ${state.mirageCount} mirage nodes`, 18, 24);
    }

    function drawCanvasNode(context, node) {
      const ratio = Math.min(2, window.devicePixelRatio || 1);
      const base = node.category === 'major' ? 5.2 : node.category === 'mirage' ? 4.2 : 2.8;
      const radius = base * node.perspective * ratio;
      const color = node.category === 'major' ? '#b885ff' : node.category === 'mirage' ? '#f0c6ff' : '#78b7dc';
      context.beginPath();
      context.arc(node.x2, node.y2, radius * 2.1, 0, Math.PI * 2);
      context.fillStyle = hexToRgba(color, node.category === 'minor' ? 0.07 : 0.12);
      context.fill();
      context.beginPath();
      context.arc(node.x2, node.y2, radius, 0, Math.PI * 2);
      context.fillStyle = color;
      context.shadowColor = color;
      context.shadowBlur = node.category === 'major' ? 14 : 8;
      context.fill();
      context.shadowBlur = 0;
      if (node.category === 'mirage') {
        context.globalAlpha = 0.38;
        context.beginPath();
        context.arc(node.x2 + radius * 2.2, node.y2 - radius * 1.3, radius * 0.8, 0, Math.PI * 2);
        context.fill();
        context.globalAlpha = 1;
      }
    }

    function updateVisibility() {
      requestAnimationFrame(() => {
        const is3d = stage.classList.contains('exo-exclusive-3d');
        state.canvas.style.display = state.enabled && is3d ? 'block' : 'none';
        state.canvas.setAttribute('aria-hidden', String(!(state.enabled && is3d)));
        if (!is3d) drawFlatOverlay();
        scheduleRender();
      });
    }

    function scheduleRender() {
      if (state.renderQueued) return;
      state.renderQueued = true;
      requestAnimationFrame(render3d);
    }

    rebuildModel();
    updateVisibility();
  }

  function randomUnitVector(rng) {
    const z = rng() * 2 - 1;
    const angle = rng() * Math.PI * 2;
    const transverse = Math.sqrt(Math.max(0, 1 - z * z));
    return {x: Math.cos(angle) * transverse, y: Math.sin(angle) * transverse, z};
  }

  function rotate(point, yaw, pitch) {
    const x1 = point.x * Math.cos(yaw) - point.z * Math.sin(yaw);
    const z1 = point.x * Math.sin(yaw) + point.z * Math.cos(yaw);
    return {
      x: x1,
      y: point.y * Math.cos(pitch) - z1 * Math.sin(pitch),
      z: point.y * Math.sin(pitch) + z1 * Math.cos(pitch)
    };
  }

  function hexToRgba(hex, alpha) {
    const value = hex.replace('#', '');
    const red = Number.parseInt(value.slice(0, 2), 16);
    const green = Number.parseInt(value.slice(2, 4), 16);
    const blue = Number.parseInt(value.slice(4, 6), 16);
    return `rgba(${red},${green},${blue},${alpha})`;
  }

  waitForInterface();
})();
