(() => {
  'use strict';

  const $ = id => document.getElementById(id);
  const SVG_NS = 'http://www.w3.org/2000/svg';
  const MIN_FALLOFF_AU = 0.5;
  const MAX_FALLOFF_AU = 2.5;

  function waitForDependencies(attempt = 0) {
    const model = globalThis.BlacklightExoLensingModel;
    const stage = document.querySelector('.exo-orbit-stage');
    const sourceSvg = $('exo-orbit-svg');
    const flatOverlay = $('exo-flat-spatial-overlays');
    const systemCanvas = $('exo-exclusive-canvas-3d');
    const controls = $('exo-exclusive-view-controls');
    const tableBody = $('exo-orbital-table-body');
    const seedInput = $('exo-seed-input');
    const clusterSeedInput = $('exo-cluster-seed');
    const clusterGrid = $('exo-cluster-grid');
    const topologyCanvas = $('exo-topology-lensing-canvas');

    if (!model || !model.volumeCalibrated || !stage || !sourceSvg || !flatOverlay ||
        !systemCanvas || !controls || !tableBody || !seedInput || !clusterSeedInput ||
        !clusterGrid || !topologyCanvas) {
      if (attempt < 360) requestAnimationFrame(() => waitForDependencies(attempt + 1));
      return;
    }

    initialize({
      model,
      stage,
      sourceSvg,
      flatOverlay,
      systemCanvas,
      controls,
      tableBody,
      seedInput,
      clusterSeedInput,
      clusterGrid
    });
  }

  function initialize(elements) {
    if ($('exo-system-spatial-overlay-v2')) return;

    const {
      model,
      stage,
      sourceSvg,
      flatOverlay,
      systemCanvas,
      controls,
      tableBody,
      seedInput,
      clusterSeedInput,
      clusterGrid
    } = elements;

    const state = {
      lensing: false,
      limits: false,
      panX: 0,
      panY: 0,
      flatZoom: 1,
      drag: null,
      moved: false,
      suppressClick: false,
      scene: null,
      selectedSystem: null,
      planets: [],
      moons: [],
      outermostAu: 1,
      dzRadiusAu: 1,
      falloffWidthAu: MAX_FALLOFF_AU,
      nodes: [],
      flatHitTargets: [],
      threeHitTargets: [],
      flatSvg: null,
      canvas: null,
      context: null,
      renderQueued: false,
      rebuildQueued: false,
      selectedNode: null
    };

    const lensingToggle = replaceCheckbox('exo-overlay-lensing');
    const limitsToggle = replaceCheckbox('exo-overlay-limits');
    state.lensing = Boolean(lensingToggle?.checked);
    state.limits = Boolean(limitsToggle?.checked);

    createResetButton();
    createOverlays();
    createInspector();
    bindControls();
    bindViewportInteractions();
    bindRebuilds();
    rebuild();

    function replaceCheckbox(id) {
      const current = $(id);
      if (!current) return null;
      const replacement = current.cloneNode(true);
      current.replaceWith(replacement);
      return replacement;
    }

    function createResetButton() {
      if ($('exo-system-camera-reset')) return;
      const button = document.createElement('button');
      button.id = 'exo-system-camera-reset';
      button.className = 'bli-action';
      button.type = 'button';
      button.textContent = 'Reset Viewport';
      controls.querySelector('.exo-view-switch')?.append(button);
    }

    function createOverlays() {
      const flatSvg = document.createElementNS(SVG_NS, 'svg');
      flatSvg.id = 'exo-system-spatial-overlay-v2';
      flatSvg.setAttribute('viewBox', '0 0 1000 1000');
      flatSvg.setAttribute('aria-label', 'Interactive system lensing and Dalton–Zirconf density overlays');
      flatSvg.setAttribute('aria-hidden', 'false');
      stage.append(flatSvg);
      state.flatSvg = flatSvg;

      const canvas = document.createElement('canvas');
      canvas.id = 'exo-system-spatial-overlay-3d-v2';
      canvas.className = 'exo-system-spatial-overlay-3d-v2';
      canvas.setAttribute('aria-label', 'Three-dimensional system lensing and falloff overlays');
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
    }

    function createInspector() {
      const inspector = document.createElement('section');
      inspector.id = 'exo-system-lensing-inspector';
      inspector.className = 'exo-system-lensing-inspector';
      inspector.hidden = true;
      inspector.innerHTML = `
        <div class="exo-system-lensing-inspector-heading">
          <div>
            <span>Selected system-space record</span>
            <h3 id="exo-system-lensing-inspector-title">No lensing node selected</h3>
          </div>
          <button id="exo-system-lensing-inspector-close" class="bli-action" type="button">Clear Selection</button>
        </div>
        <p id="exo-system-lensing-inspector-summary"></p>
        <dl id="exo-system-lensing-inspector-data"></dl>
        <div id="exo-system-lensing-inspector-actions"></div>
      `;
      controls.insertAdjacentElement('afterend', inspector);
      $('exo-system-lensing-inspector-close')?.addEventListener('click', () => {
        state.selectedNode = null;
        inspector.hidden = true;
        scheduleRender();
      });
    }

    function bindControls() {
      lensingToggle?.addEventListener('change', event => {
        state.lensing = event.target.checked;
        if (!state.lensing) {
          state.selectedNode = null;
          const inspector = $('exo-system-lensing-inspector');
          if (inspector) inspector.hidden = true;
        }
        renderFlat();
        scheduleRender();
      });
      limitsToggle?.addEventListener('change', event => {
        state.limits = event.target.checked;
        renderFlat();
        scheduleRender();
      });
      $('exo-view-flat')?.addEventListener('click', () => requestAnimationFrame(updateView));
      $('exo-view-3d')?.addEventListener('click', () => requestAnimationFrame(updateView));
      ['exo-exclusive-yaw', 'exo-exclusive-pitch', 'exo-exclusive-zoom']
        .forEach(id => $(id)?.addEventListener('input', () => {
          state.flatZoom = Number($('exo-exclusive-zoom')?.value || 100) / 100;
          applyViewportTransform();
          scheduleRender();
        }));
      $('exo-system-camera-reset')?.addEventListener('click', resetViewport);
    }

    function bindViewportInteractions() {
      stage.addEventListener('pointerdown', event => {
        if (event.button !== 0 && event.button !== 1) return;
        const isThree = isThreeDimensional();
        state.drag = {
          pointerId: event.pointerId,
          startX: event.clientX,
          startY: event.clientY,
          panX: state.panX,
          panY: state.panY,
          yaw: Number($('exo-exclusive-yaw')?.value || -24),
          pitch: Number($('exo-exclusive-pitch')?.value || 58),
          pan: !isThree || event.shiftKey || event.button === 1
        };
        state.moved = false;
        stage.setPointerCapture?.(event.pointerId);
        stage.classList.add('exo-viewport-grabbing');
      }, true);

      stage.addEventListener('pointermove', event => {
        if (!state.drag || state.drag.pointerId !== event.pointerId) return;
        const dx = event.clientX - state.drag.startX;
        const dy = event.clientY - state.drag.startY;
        if (Math.hypot(dx, dy) > 3) state.moved = true;

        if (state.drag.pan) {
          state.panX = state.drag.panX + dx;
          state.panY = state.drag.panY + dy;
          applyViewportTransform();
          scheduleRender();
          return;
        }

        const yaw = $('exo-exclusive-yaw');
        const pitch = $('exo-exclusive-pitch');
        if (yaw) {
          yaw.value = String(Math.round(normalizeDegrees(state.drag.yaw + dx * 0.42)));
          yaw.dispatchEvent(new Event('input', {bubbles: true}));
        }
        if (pitch) {
          pitch.value = String(Math.round(model.clamp(state.drag.pitch - dy * 0.3, 10, 88)));
          pitch.dispatchEvent(new Event('input', {bubbles: true}));
        }
      }, true);

      const finishDrag = event => {
        if (!state.drag || state.drag.pointerId !== event.pointerId) return;
        stage.releasePointerCapture?.(event.pointerId);
        state.suppressClick = state.moved;
        state.drag = null;
        stage.classList.remove('exo-viewport-grabbing');
      };
      stage.addEventListener('pointerup', finishDrag, true);
      stage.addEventListener('pointercancel', finishDrag, true);

      stage.addEventListener('wheel', event => {
        event.preventDefault();
        const zoom = $('exo-exclusive-zoom');
        const current = Number(zoom?.value || 100);
        const next = model.clamp(current * (event.deltaY > 0 ? 0.92 : 1.08), 60, 150);
        if (zoom) {
          zoom.value = String(Math.round(next));
          zoom.dispatchEvent(new Event('input', {bubbles: true}));
        }
        state.flatZoom = next / 100;
        applyViewportTransform();
        scheduleRender();
      }, {passive: false, capture: true});

      stage.addEventListener('click', event => {
        if (state.suppressClick) {
          state.suppressClick = false;
          event.preventDefault();
          event.stopImmediatePropagation();
          return;
        }
        if (!state.lensing) return;
        const target = findNodeAtEvent(event);
        if (!target) return;
        event.preventDefault();
        event.stopImmediatePropagation();
        selectNode(target.node);
      }, true);
    }

    function bindRebuilds() {
      const scheduleRebuild = () => {
        if (state.rebuildQueued) return;
        state.rebuildQueued = true;
        requestAnimationFrame(() => requestAnimationFrame(() => {
          state.rebuildQueued = false;
          rebuild();
        }));
      };
      new MutationObserver(scheduleRebuild).observe(tableBody, {childList: true, subtree: true});
      new MutationObserver(scheduleRebuild).observe(clusterGrid, {childList: true, subtree: true});
      seedInput.addEventListener('change', scheduleRebuild);
      clusterSeedInput.addEventListener('change', scheduleRebuild);
      $('exo-generate-system')?.addEventListener('click', scheduleRebuild);
      $('exo-generate-cluster')?.addEventListener('click', scheduleRebuild);
      $('exo-random-cluster')?.addEventListener('click', scheduleRebuild);
    }

    function rebuild() {
      const entries = readClusterEntries();
      state.scene = entries.length
        ? model.buildScene(entries, clusterSeedInput.value.trim() || 'cluster', {mergeRadiusAu: 1000})
        : null;
      state.selectedSystem = state.scene?.entries.find(entry => entry.seed === seedInput.value.trim()) || state.scene?.entries[0] || null;
      readSystemBodies();
      buildSystemNodes();
      calculateFalloff();
      updateFalloffReadout();
      if (state.selectedNode) {
        const replacement = state.nodes.find(node => node.id === state.selectedNode.id);
        state.selectedNode = replacement || null;
        if (replacement) selectNode(replacement);
        else {
          const inspector = $('exo-system-lensing-inspector');
          if (inspector) inspector.hidden = true;
        }
      }
      renderFlat();
      updateView();
      scheduleRender();
    }

    function readClusterEntries() {
      return [...clusterGrid.querySelectorAll('.exo-cluster-card')].map((card, index) => {
        const star = card.querySelector('.exo-cluster-primary')?.textContent.trim() || '';
        return {
          seed: card.querySelector('.exo-cluster-seed')?.textContent.trim() || `system-${index + 1}`,
          name: card.querySelector('h3')?.textContent.trim() || `System ${index + 1}`,
          star,
          mass: model.stellarMass(star),
          populated: card.classList.contains('is-populated'),
          card,
          open: card.querySelector('.exo-cluster-open')
        };
      });
    }

    function readSystemBodies() {
      const planets = [];
      const moons = [];
      let parent = null;
      for (const row of tableBody.querySelectorAll('tr')) {
        const orbit = row.cells?.[0]?.textContent.trim() || '';
        const name = row.cells?.[1]?.textContent.trim().replace(/^↳\s*/, '') || orbit;
        const distanceText = row.cells?.[3]?.textContent.trim() || '';
        if (/^\d+$/.test(orbit) && / AU$/.test(distanceText)) {
          parent = {
            id: row.dataset.objectId || `planet-${orbit}`,
            name,
            distance: Number.parseFloat(distanceText) || 0,
            row
          };
          planets.push(parent);
        } else if (/^\d+\.\d+$/.test(orbit) && parent) {
          moons.push({
            id: row.dataset.objectId || `moon-${orbit}`,
            name,
            parentId: parent.id,
            row
          });
        } else {
          parent = null;
        }
      }
      state.planets = planets;
      state.moons = moons;
      state.outermostAu = Math.max(1, ...planets.map(planet => planet.distance));
    }

    function buildSystemNodes() {
      const nodes = [];
      const selected = state.selectedSystem;
      const scene = state.scene;
      if (selected && scene) {
        const connectedEdges = scene.edges.filter(edge => edge.from === selected || edge.to === selected);
        for (const edge of connectedEdges) {
          const other = edge.from === selected ? edge.to : edge.from;
          const direction = unitVector(subtract(other.position, selected.position));
          const strength = connectionStrength(selected, other, edge.distance, scene.maxRadius);
          nodes.push({
            id: `adjacent:${other.seed}`,
            category: 'adjacent-system',
            designation: `Interstellar Lensing Node — ${selected.name} ↔ ${other.name}`,
            label: `↔ ${other.name}`,
            direction,
            strength,
            connectedSystem: other,
            separationAu: edge.distance,
            bridge: Boolean(edge.bridge)
          });
        }

        const nearestDistance = selected.nearest?.distance || scene.maxRadius * 0.3;
        const nearbyRadius = Math.max(1000, nearestDistance * 0.75);
        for (const clusterNode of scene.lensingNodes) {
          const offset = subtract(clusterNode.position, selected.position);
          const distance = magnitude(offset);
          if (distance > nearbyRadius) continue;
          nodes.push({
            id: `aggregate:${clusterNode.id}`,
            category: clusterNode.anomaly ? 'cluster-anomaly' : 'cluster-aggregate',
            designation: clusterNode.name,
            label: clusterNode.anomaly ? 'ANOMALY' : `L${clusterNode.connections.length}`,
            direction: unitVector(offset),
            strength: Math.max(0.4, clusterNode.strength),
            clusterNode,
            separationAu: distance
          });
        }
      }

      const rng = model.randomFor(`${seedInput.value.trim()}:local-lensing-assets-v3`);
      state.planets.forEach((planet, index) => {
        nodes.push({
          id: `minor:${planet.id}`,
          category: 'minor',
          designation: `Planet-linked Minor Lensing Node — ${planet.name}`,
          label: `P${index + 1}`,
          direction: randomUnitVector(rng),
          strength: 0.28 + rng() * 0.34,
          planet
        });
      });
      const mirageCount = state.moons.length > 10
        ? Math.min(2, Math.ceil((state.moons.length - 10) / 10))
        : 0;
      for (let index = 0; index < mirageCount; index += 1) {
        nodes.push({
          id: `mirage:${index + 1}`,
          category: 'mirage',
          designation: `Moon-density Mirage Node ${index + 1}`,
          label: `M${index + 1}`,
          direction: randomUnitVector(rng),
          strength: 0.2 + rng() * 0.25
        });
      }
      state.nodes = nodes;
    }

    function calculateFalloff() {
      const selectedMass = state.selectedSystem?.mass || 1;
      const orbitBound = state.outermostAu * (10 + Math.sqrt(Math.max(0.08, selectedMass)) * 6);
      const neighborBound = state.selectedSystem?.nearest?.distance
        ? state.selectedSystem.nearest.distance * 0.46
        : Infinity;
      state.dzRadiusAu = Math.min(orbitBound, neighborBound);

      const majorNodes = state.nodes.filter(node =>
        node.category === 'adjacent-system' ||
        node.category === 'cluster-aggregate' ||
        node.category === 'cluster-anomaly'
      );
      const stackedStrength = majorNodes.reduce((sum, node) => sum + Math.max(0, node.strength), 0);
      const compression = 1 - Math.exp(-stackedStrength / 4.2);
      state.falloffWidthAu = model.clamp(
        MAX_FALLOFF_AU - (MAX_FALLOFF_AU - MIN_FALLOFF_AU) * compression,
        MIN_FALLOFF_AU,
        MAX_FALLOFF_AU
      );
    }

    function updateFalloffReadout() {
      let output = $('exo-dz-falloff-readout');
      if (!output) {
        output = document.createElement('span');
        output.id = 'exo-dz-falloff-readout';
        output.className = 'exo-dz-falloff-readout';
        limitsToggle?.closest('fieldset')?.append(output);
      }
      output.textContent = `${formatAu(state.dzRadiusAu)} radius · ±${state.falloffWidthAu.toFixed(2)} AU density falloff`;
      output.title = 'The transition half-width narrows toward ±0.5 AU where gravitational fields stack and widens toward ±2.5 AU where the primary star dominates.';
    }

    function renderFlat() {
      const svg = state.flatSvg;
      if (!svg) return;
      svg.replaceChildren();
      state.flatHitTargets = [];
      if (state.limits) drawFlatFalloff(svg);
      if (state.lensing) drawFlatNodes(svg);
    }

    function drawFlatFalloff(svg) {
      const group = document.createElementNS(SVG_NS, 'g');
      group.setAttribute('class', 'exo-dz-flat-falloff');
      const layers = 18;
      for (let layer = 0; layer < layers; layer += 1) {
        const t = layer / (layers - 1);
        const path = document.createElementNS(SVG_NS, 'path');
        path.setAttribute('d', flatFalloffPath(t));
        path.setAttribute('fill', 'none');
        path.setAttribute('stroke', `rgba(91,184,213,${(0.035 + (1 - t) * 0.21).toFixed(3)})`);
        path.setAttribute('stroke-width', String(1.25 + (1 - t) * 1.1));
        group.append(path);
      }
      const inner = document.createElementNS(SVG_NS, 'path');
      inner.setAttribute('d', flatFalloffPath(0));
      inner.setAttribute('class', 'exo-dz-falloff-inner');
      group.append(inner);

      const label = document.createElementNS(SVG_NS, 'text');
      label.setAttribute('x', '500');
      label.setAttribute('y', '968');
      label.setAttribute('text-anchor', 'middle');
      label.setAttribute('class', 'exo-flat-overlay-label exo-flat-limit-label');
      label.textContent = `Dalton–Zirconf ${formatAu(state.dzRadiusAu)} · ±${state.falloffWidthAu.toFixed(2)} AU field-shaped falloff`;
      group.append(label);
      svg.append(group);
    }

    function flatFalloffPath(layerFraction) {
      const points = [];
      const segments = 192;
      for (let index = 0; index <= segments; index += 1) {
        const angle = index / segments * Math.PI * 2;
        const direction = {x: Math.cos(angle), y: Math.sin(angle), z: 0};
        const localWidthAu = directionalFalloffWidth(direction, angle);
        const visualWidth = model.clamp(localWidthAu * 2 / Math.max(1, state.dzRadiusAu) * 455, 7, 82);
        const radius = 455 - visualWidth / 2 + visualWidth * layerFraction;
        points.push({x: 500 + Math.cos(angle) * radius, y: 500 + Math.sin(angle) * radius});
      }
      return points.map((point, index) => `${index ? 'L' : 'M'}${point.x.toFixed(2)} ${point.y.toFixed(2)}`).join(' ') + ' Z';
    }

    function drawFlatNodes(svg) {
      const group = document.createElementNS(SVG_NS, 'g');
      group.setAttribute('class', 'exo-system-flat-lensing-nodes');
      for (const node of state.nodes) {
        const radial = node.category === 'minor' ? 0.68 : node.category === 'mirage' ? 1.05 : 0.96;
        const x = 500 + node.direction.x * 410 * radial;
        const y = 500 + node.direction.y * 410 * radial;
        const radius = nodeRadius(node, 1);
        const halo = document.createElementNS(SVG_NS, 'circle');
        halo.setAttribute('cx', x.toFixed(2));
        halo.setAttribute('cy', y.toFixed(2));
        halo.setAttribute('r', (radius * 2.1).toFixed(2));
        halo.setAttribute('class', `exo-system-node-halo ${node.category}`);
        group.append(halo);
        const circle = document.createElementNS(SVG_NS, 'circle');
        circle.setAttribute('cx', x.toFixed(2));
        circle.setAttribute('cy', y.toFixed(2));
        circle.setAttribute('r', radius.toFixed(2));
        circle.setAttribute('class', `exo-system-node-core ${node.category}`);
        group.append(circle);
        if (node.category === 'adjacent-system') {
          const text = document.createElementNS(SVG_NS, 'text');
          text.setAttribute('x', (x + radius + 7).toFixed(2));
          text.setAttribute('y', (y - radius - 3).toFixed(2));
          text.setAttribute('class', 'exo-system-node-label');
          text.textContent = node.label;
          group.append(text);
        }
        state.flatHitTargets.push({node, x, y, radius: Math.max(10, radius * 1.8)});
      }
      const label = document.createElementNS(SVG_NS, 'text');
      label.setAttribute('x', '26');
      label.setAttribute('y', '42');
      label.setAttribute('class', 'exo-flat-overlay-label');
      const adjacent = state.nodes.filter(node => node.category === 'adjacent-system').length;
      label.textContent = `${adjacent} adjacent-system lensing connection${adjacent === 1 ? '' : 's'} · select a node for designation`;
      group.append(label);
      svg.append(group);
    }

    function renderThree() {
      state.renderQueued = false;
      const canvas = state.canvas;
      const context = state.context;
      if (!canvas || !context || !isThreeDimensional()) {
        context?.clearRect(0, 0, canvas?.width || 0, canvas?.height || 0);
        return;
      }
      const width = canvas.width;
      const height = canvas.height;
      context.clearRect(0, 0, width, height);
      state.threeHitTargets = [];
      const camera = cameraState();
      const scale = Math.min(width, height) * 0.38 * camera.zoom / Math.max(0.1, state.outermostAu * 1.18);
      if (state.limits) drawThreeFalloff(context, width, height, scale, camera);
      if (state.lensing) drawThreeNodes(context, width, height, scale, camera);
    }

    function drawThreeFalloff(context, width, height, scale, camera) {
      const visualRadius = state.outermostAu * 1.12;
      const orientations = [
        {inclination: 0, node: 0},
        {inclination: Math.PI / 2, node: 0},
        {inclination: Math.PI / 2, node: Math.PI / 2}
      ];
      const layers = 15;
      for (const orientation of orientations) {
        for (let layer = 0; layer < layers; layer += 1) {
          const t = layer / (layers - 1);
          const points = [];
          for (let step = 0; step <= 128; step += 1) {
            const angle = step / 128 * Math.PI * 2;
            const direction = ringDirection(angle, orientation);
            const localWidthAu = directionalFalloffWidth(direction, angle + orientation.node);
            const visualWidth = model.clamp(
              localWidthAu * 2 / Math.max(1, state.dzRadiusAu) * visualRadius,
              visualRadius * 0.018,
              visualRadius * 0.22
            );
            const radius = visualRadius - visualWidth / 2 + visualWidth * t;
            points.push(project3(directionScale(direction, radius), width, height, scale, camera));
          }
          drawCanvasPath(
            context,
            points,
            `rgba(91,184,213,${0.03 + (1 - t) * 0.16})`,
            0.8 + (1 - t) * 0.8
          );
        }
      }
      context.fillStyle = 'rgba(143,211,229,.94)';
      context.font = `${12 * deviceScale()}px system-ui`;
      context.fillText(
        `Dalton–Zirconf ${formatAu(state.dzRadiusAu)} · ±${state.falloffWidthAu.toFixed(2)} AU density transition`,
        18,
        height - 22
      );
    }

    function drawThreeNodes(context, width, height, scale, camera) {
      const shellRadius = state.outermostAu * 1.18;
      const projected = state.nodes.map(node => {
        const radial = node.category === 'minor' ? 0.68 : node.category === 'mirage' ? 1.05 : 0.96;
        const point = directionScale(node.direction, shellRadius * radial);
        return {node, projected: project3(point, width, height, scale, camera)};
      }).sort((left, right) => left.projected.depth - right.projected.depth);

      for (const {node, projected: point} of projected) {
        const radius = nodeRadius(node, point.perspective) * deviceScale();
        const color = nodeColor(node);
        context.beginPath();
        context.arc(point.x, point.y, radius * 2.15, 0, Math.PI * 2);
        context.fillStyle = withAlpha(color, 0.11);
        context.fill();
        context.beginPath();
        context.arc(point.x, point.y, radius, 0, Math.PI * 2);
        context.fillStyle = color;
        context.shadowColor = color;
        context.shadowBlur = node.category === 'adjacent-system' ? 16 : 10;
        context.fill();
        context.shadowBlur = 0;
        if (state.selectedNode?.id === node.id) {
          context.beginPath();
          context.arc(point.x, point.y, radius + 5 * deviceScale(), 0, Math.PI * 2);
          context.strokeStyle = '#fff4cb';
          context.lineWidth = 2.2 * deviceScale();
          context.stroke();
        }
        if (node.category === 'adjacent-system') {
          drawOutlinedText(context, node.label, point.x + radius + 6, point.y - radius - 3, '#e1cbff', 10.5 * deviceScale());
        }
        state.threeHitTargets.push({node, x: point.x, y: point.y, radius: Math.max(10, radius * 1.8), depth: point.depth});
      }
    }

    function directionalFalloffWidth(direction, phase) {
      const major = state.nodes.filter(node =>
        node.category === 'adjacent-system' ||
        node.category === 'cluster-aggregate' ||
        node.category === 'cluster-anomaly'
      );
      let field = 0;
      for (const node of major) {
        const alignment = Math.max(0, dot(direction, node.direction));
        field += node.strength * Math.pow(alignment, 6);
      }
      const localCompression = field / (1 + field);
      const seedPhase = hashUnit(`${seedInput.value.trim()}:dz:${Math.round(phase * 1000)}`);
      const irregularity = (seedPhase - 0.5) * 0.12;
      return model.clamp(
        state.falloffWidthAu - (state.falloffWidthAu - MIN_FALLOFF_AU) * localCompression * 0.82 + irregularity,
        MIN_FALLOFF_AU,
        MAX_FALLOFF_AU
      );
    }

    function updateView() {
      const isThree = isThreeDimensional();
      state.flatSvg.setAttribute('aria-hidden', String(isThree));
      state.canvas.setAttribute('aria-hidden', String(!isThree));
      state.flatSvg.style.display = isThree ? 'none' : 'block';
      state.canvas.style.display = isThree ? 'block' : 'none';
      applyViewportTransform();
      renderFlat();
      scheduleRender();
    }

    function applyViewportTransform() {
      const isThree = isThreeDimensional();
      const flatTransform = `translate(${state.panX}px, ${state.panY}px) scale(${state.flatZoom})`;
      const threeTransform = `translate(${state.panX}px, ${state.panY}px)`;
      sourceSvg.style.transform = isThree ? '' : flatTransform;
      flatOverlay.style.transform = isThree ? '' : flatTransform;
      state.flatSvg.style.transform = isThree ? '' : flatTransform;
      systemCanvas.style.transform = isThree ? threeTransform : '';
      const topologyCanvas = $('exo-topology-lensing-canvas');
      if (topologyCanvas) topologyCanvas.style.transform = isThree ? threeTransform : '';
      state.canvas.style.transform = isThree ? threeTransform : '';
    }

    function resetViewport() {
      state.panX = 0;
      state.panY = 0;
      state.flatZoom = 1;
      applyViewportTransform();
      scheduleRender();
    }

    function findNodeAtEvent(event) {
      if (isThreeDimensional()) {
        const rect = state.canvas.getBoundingClientRect();
        const x = (event.clientX - rect.left) * state.canvas.width / rect.width;
        const y = (event.clientY - rect.top) * state.canvas.height / rect.height;
        return [...state.threeHitTargets]
          .sort((left, right) => right.depth - left.depth)
          .find(target => Math.hypot(target.x - x, target.y - y) <= target.radius + 7);
      }
      const rect = state.flatSvg.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width * 1000;
      const y = (event.clientY - rect.top) / rect.height * 1000;
      return state.flatHitTargets.find(target => Math.hypot(target.x - x, target.y - y) <= target.radius + 7);
    }

    function selectNode(node) {
      state.selectedNode = node;
      const inspector = $('exo-system-lensing-inspector');
      if (!inspector) return;
      inspector.hidden = false;
      $('exo-system-lensing-inspector-title').textContent = node.designation;
      const summary = $('exo-system-lensing-inspector-summary');
      const data = $('exo-system-lensing-inspector-data');
      const actions = $('exo-system-lensing-inspector-actions');
      data.replaceChildren();
      actions.replaceChildren();

      if (node.category === 'adjacent-system') {
        summary.textContent = `This major lensing point is generated by the gravitational relationship between the current primary and ${node.connectedSystem.name}.`;
        addDatum(data, 'Node type', 'Adjacent-system connection');
        addDatum(data, 'Connected system', node.connectedSystem.name);
        addDatum(data, 'Connected primary', node.connectedSystem.star || 'Unknown stellar classification');
        addDatum(data, 'Separation', formatAu(node.separationAu));
        addDatum(data, 'Relative field strength', node.strength.toFixed(2));
        addDatum(data, 'Route basis', node.bridge ? 'Automatic topology bridge' : 'Nearest-neighbor route');
        const open = document.createElement('button');
        open.className = 'bli-action';
        open.type = 'button';
        open.textContent = `Open ${node.connectedSystem.name}`;
        open.addEventListener('click', () => node.connectedSystem.open?.click());
        actions.append(open);
      } else if (node.category === 'cluster-aggregate' || node.category === 'cluster-anomaly') {
        summary.textContent = node.category === 'cluster-anomaly'
          ? 'This is the nearby unresolved cluster anomaly or an aggregate containing it.'
          : 'This nearby aggregate cluster node contributes to compression of the local Dalton–Zirconf falloff gradient.';
        addDatum(data, 'Node type', node.category === 'cluster-anomaly' ? 'Cluster anomaly' : 'Aggregate cluster lensing node');
        addDatum(data, 'Generating connections', String(node.clusterNode?.connections.length || 0));
        addDatum(data, 'Distance from system', formatAu(node.separationAu));
        addDatum(data, 'Relative field strength', node.strength.toFixed(2));
      } else if (node.category === 'minor') {
        summary.textContent = `Minor local lensing node associated with the orbital mass architecture of ${node.planet.name}.`;
        addDatum(data, 'Node type', 'Planet-linked minor node');
        addDatum(data, 'Planet', node.planet.name);
        addDatum(data, 'Relative field strength', node.strength.toFixed(2));
      } else {
        summary.textContent = 'A mirage node produced by the system’s unusually dense moon population.';
        addDatum(data, 'Node type', 'Moon-density mirage');
        addDatum(data, 'System moon count', String(state.moons.length));
        addDatum(data, 'Relative field strength', node.strength.toFixed(2));
      }
      scheduleRender();
    }

    function addDatum(container, label, value) {
      const dt = document.createElement('dt');
      const dd = document.createElement('dd');
      dt.textContent = label;
      dd.textContent = value;
      container.append(dt, dd);
    }

    function cameraState() {
      return {
        yaw: Number($('exo-exclusive-yaw')?.value || -24) * Math.PI / 180,
        pitch: Number($('exo-exclusive-pitch')?.value || 58) * Math.PI / 180,
        zoom: Number($('exo-exclusive-zoom')?.value || 100) / 100
      };
    }

    function project3(point, width, height, scale, camera) {
      const rotated = rotatePoint(point, camera.yaw, camera.pitch);
      const perspective = 1 / Math.max(0.38, 1 + rotated.z * 0.00115);
      return {
        x: width / 2 + rotated.x * scale * perspective,
        y: height / 2 + rotated.y * scale * perspective,
        depth: rotated.z,
        perspective
      };
    }

    function ringDirection(angle, orientation) {
      let point = {x: Math.cos(angle), y: Math.sin(angle), z: 0};
      point = rotateX(point, orientation.inclination);
      point = rotateZ(point, orientation.node);
      return point;
    }

    function nodeRadius(node, perspective) {
      const base = node.category === 'adjacent-system' ? 6.1
        : node.category === 'cluster-anomaly' ? 6.4
          : node.category === 'cluster-aggregate' ? 5.4
            : node.category === 'mirage' ? 4.1
              : 2.9;
      return base * (0.82 + Math.sqrt(Math.max(0.1, node.strength)) * 0.38) * perspective;
    }

    function nodeColor(node) {
      if (node.category === 'adjacent-system') return '#c39aff';
      if (node.category === 'cluster-anomaly') return '#ff7fa8';
      if (node.category === 'cluster-aggregate') return '#a56ee8';
      if (node.category === 'mirage') return '#f0c6ff';
      return '#78b7dc';
    }

    function connectionStrength(a, b, distance, maxRadius) {
      const massTerm = Math.sqrt(Math.max(0.001, a.mass * b.mass));
      const distanceTerm = 1 / Math.pow(0.08 + distance / Math.max(1, maxRadius), 0.8);
      const volumeTerm = Math.sqrt(
        (model.volumeFactor?.(a.star || '') || 1) *
        (model.volumeFactor?.(b.star || '') || 1)
      );
      return 0.45 + Math.min(3.5, massTerm * distanceTerm * volumeTerm);
    }

    function drawCanvasPath(context, points, stroke, width) {
      if (!points.length) return;
      context.beginPath();
      context.moveTo(points[0].x, points[0].y);
      for (let index = 1; index < points.length; index += 1) {
        context.lineTo(points[index].x, points[index].y);
      }
      context.closePath();
      context.strokeStyle = stroke;
      context.lineWidth = width * deviceScale();
      context.stroke();
    }

    function drawOutlinedText(context, text, x, y, color, size) {
      context.font = `800 ${size}px system-ui`;
      context.lineJoin = 'round';
      context.strokeStyle = 'rgba(2,2,2,.96)';
      context.lineWidth = Math.max(3, size * 0.35);
      context.strokeText(text, x, y);
      context.fillStyle = color;
      context.fillText(text, x, y);
    }

    function scheduleRender() {
      if (state.renderQueued) return;
      state.renderQueued = true;
      requestAnimationFrame(renderThree);
    }

    function isThreeDimensional() {
      return stage.classList.contains('exo-exclusive-3d');
    }
  }

  function rotatePoint(point, yaw, pitch) {
    const x1 = point.x * Math.cos(yaw) - point.z * Math.sin(yaw);
    const z1 = point.x * Math.sin(yaw) + point.z * Math.cos(yaw);
    return {
      x: x1,
      y: point.y * Math.cos(pitch) - z1 * Math.sin(pitch),
      z: point.y * Math.sin(pitch) + z1 * Math.cos(pitch)
    };
  }

  function rotateX(point, angle) {
    return {
      x: point.x,
      y: point.y * Math.cos(angle) - point.z * Math.sin(angle),
      z: point.y * Math.sin(angle) + point.z * Math.cos(angle)
    };
  }

  function rotateZ(point, angle) {
    return {
      x: point.x * Math.cos(angle) - point.y * Math.sin(angle),
      y: point.x * Math.sin(angle) + point.y * Math.cos(angle),
      z: point.z
    };
  }

  function randomUnitVector(rng) {
    const z = rng() * 2 - 1;
    const angle = rng() * Math.PI * 2;
    const transverse = Math.sqrt(Math.max(0, 1 - z * z));
    return {x: Math.cos(angle) * transverse, y: Math.sin(angle) * transverse, z};
  }

  function subtract(a, b) {
    return {x: a.x - b.x, y: a.y - b.y, z: a.z - b.z};
  }

  function magnitude(point) {
    return Math.hypot(point.x, point.y, point.z);
  }

  function unitVector(point) {
    const length = magnitude(point) || 1;
    return {x: point.x / length, y: point.y / length, z: point.z / length};
  }

  function directionScale(direction, amount) {
    return {x: direction.x * amount, y: direction.y * amount, z: direction.z * amount};
  }

  function dot(a, b) {
    return a.x * b.x + a.y * b.y + a.z * b.z;
  }

  function hashUnit(value) {
    let hash = 2166136261;
    for (const character of String(value)) {
      hash ^= character.charCodeAt(0);
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0) / 4294967295;
  }

  function normalizeDegrees(value) {
    let normalized = value;
    while (normalized > 180) normalized -= 360;
    while (normalized < -180) normalized += 360;
    return normalized;
  }

  function withAlpha(hex, alpha) {
    const value = hex.replace('#', '');
    const red = Number.parseInt(value.slice(0, 2), 16);
    const green = Number.parseInt(value.slice(2, 4), 16);
    const blue = Number.parseInt(value.slice(4, 6), 16);
    return `rgba(${red},${green},${blue},${alpha})`;
  }

  function formatAu(value) {
    if (!Number.isFinite(value)) return 'unknown';
    if (value >= 1000000) return `${(value / 1000000).toFixed(2)}M AU`;
    if (value >= 1000) return `${Math.round(value).toLocaleString()} AU`;
    return `${value.toFixed(2)} AU`;
  }

  function deviceScale() {
    return Math.min(2, window.devicePixelRatio || 1);
  }

  waitForDependencies();
})();
