(() => {
  'use strict';

  const $ = id => document.getElementById(id);

  function waitForDependencies(attempt = 0) {
    const model = globalThis.BlacklightExoLensingModel;
    const grid = $('exo-cluster-grid');
    const oldCanvas = $('exo-cluster-volume-canvas');
    const shell = oldCanvas?.closest('.exo-cluster-map-shell');
    const routesButton = $('exo-cluster-volume-routes');
    const gravityButton = $('exo-cluster-volume-gravity');
    if (!model || !grid || !oldCanvas || !shell || !routesButton || !gravityButton) {
      if (attempt < 300) requestAnimationFrame(() => waitForDependencies(attempt + 1));
      return;
    }
    initialize({model, grid, oldCanvas, shell, routesButton, gravityButton});
  }

  function initialize({model, grid, oldCanvas, shell, routesButton, gravityButton}) {
    if ($('exo-cluster-volume-canvas-v2')) return;

    const clusterSeedInput = $('exo-cluster-seed');
    const systemSeedInput = $('exo-seed-input');
    const status = $('exo-cluster-volume-status');
    const state = {
      mode: 'routes',
      scene: null,
      streamlines: [],
      canvas: null,
      context: null,
      panX: 0,
      panY: 0,
      drag: null,
      moved: false,
      hitTargets: [],
      selected: null,
      rebuildQueued: false,
      renderQueued: false
    };

    oldCanvas.classList.add('exo-cluster-volume-canvas-retired');
    oldCanvas.setAttribute('aria-hidden', 'true');

    const canvas = document.createElement('canvas');
    canvas.id = 'exo-cluster-volume-canvas-v2';
    canvas.className = 'exo-cluster-volume-canvas-v2';
    canvas.tabIndex = 0;
    canvas.setAttribute('aria-label', 'Rigid three-dimensional cluster map with selectable aggregate gravitational-lensing nodes');
    oldCanvas.insertAdjacentElement('afterend', canvas);
    state.canvas = canvas;
    state.context = canvas.getContext('2d');

    const inspector = document.createElement('section');
    inspector.id = 'exo-cluster-lensing-inspector';
    inspector.className = 'exo-cluster-lensing-inspector';
    inspector.hidden = true;
    inspector.innerHTML = `
      <div class="exo-cluster-lensing-inspector-heading">
        <div>
          <span>Selected gravitational record</span>
          <h3 id="exo-cluster-lensing-inspector-title">No node selected</h3>
        </div>
        <button id="exo-cluster-lensing-inspector-close" class="bli-action" type="button">Clear Selection</button>
      </div>
      <p id="exo-cluster-lensing-inspector-summary"></p>
      <dl id="exo-cluster-lensing-inspector-data"></dl>
      <h4>Generating mass connections</h4>
      <ol id="exo-cluster-lensing-connections"></ol>
    `;
    canvas.insertAdjacentElement('afterend', inspector);

    $('exo-cluster-lensing-inspector-close')?.addEventListener('click', () => {
      state.selected = null;
      inspector.hidden = true;
      updateStatus();
      scheduleRender();
    });

    routesButton.addEventListener('click', () => {
      state.mode = 'routes';
      updateStatus();
      scheduleRender();
    });
    gravityButton.addEventListener('click', () => {
      state.mode = 'gravity';
      updateStatus();
      scheduleRender();
    });

    canvas.addEventListener('pointerdown', beginDrag);
    canvas.addEventListener('pointermove', continueDrag);
    canvas.addEventListener('pointerup', endDrag);
    canvas.addEventListener('pointercancel', endDrag);
    canvas.addEventListener('click', activateTarget);
    canvas.addEventListener('wheel', event => {
      event.preventDefault();
      const zoom = $('exo-cluster-camera-zoom');
      const current = Number(zoom?.value || 100);
      const next = model.clamp(current * (event.deltaY > 0 ? 0.92 : 1.08), 55, 180);
      if (zoom) {
        zoom.value = String(Math.round(next));
        zoom.dispatchEvent(new Event('input', {bubbles: true}));
      }
      scheduleRender();
    }, {passive: false});

    ['exo-cluster-camera-yaw', 'exo-cluster-camera-pitch', 'exo-cluster-camera-zoom']
      .forEach(id => $(id)?.addEventListener('input', scheduleRender));
    $('exo-cluster-camera-reset')?.addEventListener('click', () => {
      state.panX = 0;
      state.panY = 0;
      scheduleRender();
    });

    const resize = () => {
      const ratio = Math.min(2, window.devicePixelRatio || 1);
      const width = Math.max(520, shell.clientWidth - 30);
      const height = Math.max(420, Math.min(680, width * 0.58));
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      scheduleRender();
    };
    new ResizeObserver(resize).observe(shell);
    resize();

    const scheduleRebuild = () => {
      if (state.rebuildQueued) return;
      state.rebuildQueued = true;
      requestAnimationFrame(() => requestAnimationFrame(() => {
        state.rebuildQueued = false;
        rebuild();
      }));
    };
    new MutationObserver(scheduleRebuild).observe(grid, {childList: true, subtree: true});
    clusterSeedInput?.addEventListener('change', scheduleRebuild);
    systemSeedInput?.addEventListener('change', scheduleRebuild);
    $('exo-generate-cluster')?.addEventListener('click', scheduleRebuild);
    $('exo-random-cluster')?.addEventListener('click', scheduleRebuild);
    $('exo-generate-system')?.addEventListener('click', scheduleRebuild);

    function rebuild() {
      const entries = [...grid.querySelectorAll('.exo-cluster-card')].map((card, index) => {
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
      state.scene = entries.length
        ? model.buildScene(entries, clusterSeedInput?.value.trim() || 'cluster', {mergeRadiusAu: 1000})
        : null;
      state.streamlines = state.scene ? buildStreamlines(state.scene) : [];
      if (state.selected?.category === 'lensing-node') {
        state.selected = state.scene?.lensingNodes.find(node => node.id === state.selected.id) || null;
        if (state.selected) showLensingInspector(state.selected);
        else inspector.hidden = true;
      }
      updateStatus();
      scheduleRender();
    }

    function buildStreamlines(scene) {
      const rng = model.randomFor(`${clusterSeedInput?.value || 'cluster'}:aggregate-gravity-grain-v4`);
      const sources = gravitySources(scene);
      const center = weightedBarycenter(scene.entries);
      const shellRadius = scene.maxRadius * 1.18;
      const count = Math.min(210, 100 + scene.entries.length * 8);
      const lines = [];
      for (let index = 0; index < count; index += 1) {
        const direction = randomUnitVector(rng);
        const radial = shellRadius * (0.72 + rng() * 0.34);
        let point = {
          x: center.x + direction.x * radial,
          y: center.y + direction.y * radial,
          z: center.z + direction.z * radial
        };
        const points = [];
        let density = 0;
        for (let step = 0; step < 78; step += 1) {
          points.push({...point});
          const vector = gravityVector(point, sources, scene.maxRadius);
          const strength = magnitude(vector);
          if (!Number.isFinite(strength) || strength <= 0) break;
          density += strength;
          const unit = {x: vector.x / strength, y: vector.y / strength, z: vector.z / strength};
          const stepLength = scene.maxRadius * (0.014 + Math.min(0.024, Math.log1p(strength * 1e10) * 0.0021));
          point = {
            x: point.x + unit.x * stepLength,
            y: point.y + unit.y * stepLength,
            z: point.z + unit.z * stepLength
          };
          if (sources.some(source => model.distance3(point, source.position) < source.capture)) {
            points.push({...point});
            break;
          }
          if (model.distance3(point, center) > shellRadius * 1.42) break;
        }
        lines.push({points, density: density / Math.max(1, points.length)});
      }
      return lines;
    }

    function gravitySources(scene) {
      const scale = scene.maxRadius;
      return [
        ...scene.entries.map(entry => ({position: entry.position, weight: entry.mass * 1.25, capture: scale * 0.03})),
        ...scene.protostars.map(item => ({position: item.position, weight: item.mass * 0.9, capture: scale * 0.02})),
        ...scene.darkMasses.map(item => ({position: item.position, weight: item.mass * 1.1, capture: scale * 0.018})),
        ...scene.nebulae.map(item => ({position: item.position, weight: Math.sqrt(item.mass) * (0.25 + item.density * 0.3), capture: Math.max(item.radius.x, item.radius.y) * 0.22})),
        ...scene.lensingNodes.map(node => ({position: node.position, weight: node.strength * (node.anomaly ? 0.75 : 1.05), capture: scale * 0.018}))
      ];
    }

    function render() {
      state.renderQueued = false;
      const scene = state.scene;
      const context = state.context;
      if (!context) return;
      const width = canvas.width;
      const height = canvas.height;
      context.clearRect(0, 0, width, height);
      context.fillStyle = '#020202';
      context.fillRect(0, 0, width, height);
      drawBackground(context, width, height);
      state.hitTargets = [];
      if (!scene) return;
      drawNebulae(context, width, height, scene);
      if (state.mode === 'gravity') {
        drawGravityField(context, width, height);
        drawLensingNodes(context, width, height, scene);
      } else {
        drawRoutes(context, width, height, scene);
      }
      drawMassPoints(context, width, height, scene);
      drawSystems(context, width, height, scene);
      drawAxes(context, width, height);
    }

    function drawBackground(context, width, height) {
      const rng = model.randomFor(`${clusterSeedInput?.value || 'cluster'}:aggregate-volume-stars`);
      context.fillStyle = 'rgba(255,255,255,.55)';
      for (let index = 0; index < 170; index += 1) {
        context.globalAlpha = 0.12 + rng() * 0.36;
        context.beginPath();
        context.arc(rng() * width, rng() * height, 0.35 + rng() * 1.15, 0, Math.PI * 2);
        context.fill();
      }
      context.globalAlpha = 1;
    }

    function drawNebulae(context, width, height, scene) {
      const items = scene.nebulae.map(item => ({item, projected: project(item.position, width, height, scene)}))
        .sort((a, b) => a.projected.depth - b.projected.depth);
      for (const {item, projected} of items) {
        const edgeX = project({x: item.position.x + item.radius.x, y: item.position.y, z: item.position.z}, width, height, scene);
        const edgeY = project({x: item.position.x, y: item.position.y + item.radius.y, z: item.position.z}, width, height, scene);
        const radiusX = Math.max(28, Math.hypot(edgeX.x - projected.x, edgeX.y - projected.y));
        const radiusY = Math.max(18, Math.hypot(edgeY.x - projected.x, edgeY.y - projected.y));
        context.save();
        context.translate(projected.x, projected.y);
        context.scale(radiusX, radiusY);
        const gradient = context.createRadialGradient(0, 0, 0, 0, 0, 1);
        gradient.addColorStop(0, `hsla(${item.hue},70%,62%,${0.1 + item.density * 0.08})`);
        gradient.addColorStop(0.55, `hsla(${item.hue + 18},55%,38%,${0.05 + item.density * 0.05})`);
        gradient.addColorStop(1, `hsla(${item.hue},60%,30%,0)`);
        context.fillStyle = gradient;
        context.beginPath();
        context.arc(0, 0, 1, 0, Math.PI * 2);
        context.fill();
        context.restore();
      }
    }

    function drawRoutes(context, width, height, scene) {
      for (const edge of scene.edges) {
        const from = project(edge.from.position, width, height, scene);
        const to = project(edge.to.position, width, height, scene);
        context.beginPath();
        context.setLineDash(edge.bridge ? [] : [7, 6]);
        context.strokeStyle = edge.bridge ? 'rgba(240,189,88,.86)' : 'rgba(126,179,207,.52)';
        context.lineWidth = edge.bridge ? 2.4 * deviceScale() : 1.6 * deviceScale();
        context.moveTo(from.x, from.y);
        context.lineTo(to.x, to.y);
        context.stroke();
        context.setLineDash([]);
        drawOutlinedText(
          context,
          `${formatAu(edge.distance)}${edge.bridge ? ' · bridge' : ''}`,
          (from.x + to.x) / 2,
          (from.y + to.y) / 2 - 7,
          edge.bridge ? '#f0bd58' : '#a9d8ec',
          11 * deviceScale()
        );
      }
    }

    function drawGravityField(context, width, height) {
      for (const line of state.streamlines) {
        if (line.points.length < 3) continue;
        const projected = line.points.map(point => project(point, width, height, state.scene));
        const density = Math.log1p(line.density * 1e10);
        const opacity = model.clamp(0.11 + density * 0.085, 0.11, 0.66);
        const lineWidth = model.clamp(0.5 + density * 0.34, 0.55, 2.8) * deviceScale();
        context.beginPath();
        context.moveTo(projected[0].x, projected[0].y);
        for (let index = 1; index < projected.length; index += 1) {
          context.lineTo(projected[index].x, projected[index].y);
        }
        context.strokeStyle = `rgba(96,176,199,${opacity})`;
        context.lineWidth = lineWidth;
        context.lineCap = 'round';
        context.lineJoin = 'round';
        context.stroke();
        const arrowIndex = Math.max(2, Math.floor(projected.length * 0.72));
        drawArrow(context, projected[arrowIndex - 1], projected[arrowIndex], opacity);
      }
    }

    function drawLensingNodes(context, width, height, scene) {
      const nodes = scene.lensingNodes.map(node => ({node, projected: project(node.position, width, height, scene)}))
        .sort((a, b) => a.projected.depth - b.projected.depth);
      for (const {node, projected} of nodes) {
        const selected = state.selected?.category === 'lensing-node' && state.selected.id === node.id;
        const color = node.anomaly ? '#ff7fa8' : '#b885ff';
        const radius = node.displayRadius * projected.perspective * deviceScale();
        context.beginPath();
        context.arc(projected.x, projected.y, radius * 2.2, 0, Math.PI * 2);
        context.fillStyle = node.anomaly ? 'rgba(255,127,168,.12)' : 'rgba(184,133,255,.11)';
        context.fill();
        context.beginPath();
        context.arc(projected.x, projected.y, radius, 0, Math.PI * 2);
        context.fillStyle = color;
        context.shadowColor = color;
        context.shadowBlur = 12 + node.strength * 4;
        context.fill();
        context.shadowBlur = 0;
        if (node.mergedPointCount > 1 || selected) {
          context.beginPath();
          context.arc(projected.x, projected.y, radius + 5 * deviceScale(), 0, Math.PI * 2);
          context.strokeStyle = selected ? '#fff4cb' : 'rgba(224,197,255,.62)';
          context.lineWidth = selected ? 2.4 * deviceScale() : 1.2 * deviceScale();
          context.stroke();
        }
        drawOutlinedText(
          context,
          node.anomaly ? 'ANOMALY' : `L${node.connections.length}`,
          projected.x + radius + 5,
          projected.y - radius - 3,
          node.anomaly ? '#ffafc6' : '#dac0ff',
          10 * deviceScale(),
          true
        );
        state.hitTargets.push({
          object: {...node, category: 'lensing-node'},
          x: projected.x,
          y: projected.y,
          radius: radius * 1.7,
          depth: projected.depth
        });
      }
    }

    function drawMassPoints(context, width, height, scene) {
      const objects = [...scene.protostars, ...scene.darkMasses]
        .map(object => ({object, projected: project(object.position, width, height, scene)}))
        .sort((a, b) => a.projected.depth - b.projected.depth);
      for (const {object, projected} of objects) {
        const color = object.category === 'protostar' ? '#ff9d5d' : '#8aa0ad';
        const base = object.category === 'protostar' ? 5.5 : object.type === 'Compact dark remnant' ? 4.6 : 3.6;
        const radius = base * projected.perspective * deviceScale();
        context.beginPath();
        context.arc(projected.x, projected.y, radius, 0, Math.PI * 2);
        context.fillStyle = color;
        context.shadowColor = color;
        context.shadowBlur = 8;
        context.fill();
        context.shadowBlur = 0;
        if (state.mode === 'gravity' || object.category === 'protostar') {
          drawOutlinedText(context, object.name, projected.x + radius + 5, projected.y - radius - 3, '#d9d1c5', 10.5 * deviceScale());
        }
        state.hitTargets.push({object, x: projected.x, y: projected.y, radius: radius * 1.7, depth: projected.depth});
      }
    }

    function drawSystems(context, width, height, scene) {
      const selectedSeed = systemSeedInput?.value.trim();
      const systems = scene.entries.map(object => ({object, projected: project(object.position, width, height, scene)}))
        .sort((a, b) => a.projected.depth - b.projected.depth);
      for (const {object, projected} of systems) {
        const selected = object.seed === selectedSeed;
        const radius = (object.populated ? 6 : 4.7) * projected.perspective * deviceScale();
        context.beginPath();
        context.arc(projected.x, projected.y, selected ? radius * 2.8 : radius * 2.1, 0, Math.PI * 2);
        context.fillStyle = object.populated ? 'rgba(114,214,154,.09)' : 'rgba(217,168,79,.07)';
        context.fill();
        context.strokeStyle = selected ? '#fff1c7' : object.populated ? 'rgba(114,214,154,.55)' : 'rgba(217,168,79,.44)';
        context.lineWidth = selected ? 2.4 * deviceScale() : 1.2 * deviceScale();
        context.stroke();
        context.beginPath();
        context.arc(projected.x, projected.y, radius, 0, Math.PI * 2);
        context.fillStyle = object.populated ? '#72d69a' : '#d9a84f';
        context.shadowColor = context.fillStyle;
        context.shadowBlur = 9;
        context.fill();
        context.shadowBlur = 0;
        drawOutlinedText(context, object.name, projected.x + radius + 7, projected.y - radius - 3, '#eee6da', 12 * deviceScale(), true);
        state.hitTargets.push({object, x: projected.x, y: projected.y, radius: radius * 1.8, depth: projected.depth});
      }
    }

    function drawAxes(context, width, height) {
      const origin = {x: 52 * deviceScale(), y: height - 48 * deviceScale()};
      for (const [label, color, vector] of [
        ['X', '#d9a84f', {x: 30, y: 0, z: 0}],
        ['Y', '#72d69a', {x: 0, y: 30, z: 0}],
        ['Z', '#b885ff', {x: 0, y: 0, z: 30}]
      ]) {
        const rotated = rotate(vector);
        const end = {x: origin.x + rotated.x * deviceScale(), y: origin.y + rotated.y * deviceScale()};
        context.beginPath();
        context.strokeStyle = color;
        context.lineWidth = 1.4 * deviceScale();
        context.moveTo(origin.x, origin.y);
        context.lineTo(end.x, end.y);
        context.stroke();
        drawOutlinedText(context, label, end.x + 4, end.y + 4, color, 10 * deviceScale(), true);
      }
    }

    function beginDrag(event) {
      state.drag = {
        pointerId: event.pointerId,
        x: event.clientX,
        y: event.clientY,
        yaw: Number($('exo-cluster-camera-yaw')?.value || -24),
        pitch: Number($('exo-cluster-camera-pitch')?.value || 52),
        panX: state.panX,
        panY: state.panY,
        pan: event.shiftKey || event.button === 1
      };
      state.moved = false;
      canvas.setPointerCapture(event.pointerId);
    }

    function continueDrag(event) {
      if (!state.drag || state.drag.pointerId !== event.pointerId) return;
      const dx = event.clientX - state.drag.x;
      const dy = event.clientY - state.drag.y;
      if (Math.hypot(dx, dy) > 3) state.moved = true;
      if (state.drag.pan) {
        state.panX = state.drag.panX + dx;
        state.panY = state.drag.panY + dy;
      } else {
        const yaw = $('exo-cluster-camera-yaw');
        const pitch = $('exo-cluster-camera-pitch');
        if (yaw) yaw.value = String(Math.round(normalizeDegrees(state.drag.yaw + dx * 0.42)));
        if (pitch) pitch.value = String(Math.round(model.clamp(state.drag.pitch - dy * 0.3, 5, 88)));
      }
      scheduleRender();
    }

    function endDrag(event) {
      if (!state.drag || state.drag.pointerId !== event.pointerId) return;
      canvas.releasePointerCapture?.(event.pointerId);
      state.drag = null;
    }

    function activateTarget(event) {
      if (state.moved) {
        state.moved = false;
        return;
      }
      const rect = canvas.getBoundingClientRect();
      const x = (event.clientX - rect.left) * canvas.width / rect.width;
      const y = (event.clientY - rect.top) * canvas.height / rect.height;
      const target = [...state.hitTargets]
        .sort((a, b) => b.depth - a.depth)
        .find(item => Math.hypot(item.x - x, item.y - y) <= item.radius + 8);
      if (!target) return;
      state.selected = target.object;
      if (target.object.category === 'system') target.object.open?.click();
      if (target.object.category === 'lensing-node') showLensingInspector(target.object);
      else showMassInspector(target.object);
      updateStatus();
      scheduleRender();
    }

    function showLensingInspector(node) {
      inspector.hidden = false;
      $('exo-cluster-lensing-inspector-title').textContent = node.name;
      $('exo-cluster-lensing-inspector-summary').textContent = node.anomaly
        ? 'This aggregate includes the required unresolved anomaly gravitational point. Any additional listed pairs were merged into it because their calculated positions fell within 1,000 AU.'
        : 'This selectable node is the mass-weighted aggregate of the listed gravitational balance connections.';
      const data = $('exo-cluster-lensing-inspector-data');
      data.replaceChildren();
      addDatum(data, 'Relative strength', node.strength.toFixed(2));
      addDatum(data, 'Merged points', String(node.mergedPointCount));
      addDatum(data, 'Generating connections', String(node.connections.length));
      addDatum(data, 'Merge radius', '1,000 AU');
      addDatum(data, 'Cluster position', `${formatSignedAu(node.position.x)}, ${formatSignedAu(node.position.y)}, ${formatSignedAu(node.position.z)}`);
      const list = $('exo-cluster-lensing-connections');
      list.replaceChildren();
      for (const connection of node.connections) {
        const item = document.createElement('li');
        if (connection.kind === 'anomaly') {
          item.innerHTML = `<strong>Anomalous source</strong><span>Unresolved curvature with no corresponding generated mass pair.</span>`;
        } else {
          const reasons = connection.reasons?.join(', ') || 'mass influence';
          item.innerHTML = `
            <strong>${escapeHtml(connection.fromName)} ↔ ${escapeHtml(connection.toName)}</strong>
            <span>${formatMass(connection.fromMass)} + ${formatMass(connection.toMass)} · ${formatAu(connection.distanceAu)} separation · ${escapeHtml(reasons)}</span>
          `;
        }
        list.append(item);
      }
    }

    function showMassInspector(object) {
      inspector.hidden = false;
      $('exo-cluster-lensing-inspector-title').textContent = object.name || 'Cluster object';
      $('exo-cluster-lensing-inspector-summary').textContent = object.category === 'system'
        ? `${object.star || 'Stellar system'}; select its card to open the detailed solar-system view.`
        : 'Generated non-stellar or developing stellar mass contributing to the cluster gravity field.';
      const data = $('exo-cluster-lensing-inspector-data');
      data.replaceChildren();
      addDatum(data, 'Category', object.category || 'unknown');
      addDatum(data, 'Estimated mass', formatMass(object.mass));
      if (object.stage) addDatum(data, 'Development stage', object.stage);
      if (object.type) addDatum(data, 'Mass type', object.type);
      $('exo-cluster-lensing-connections').replaceChildren();
    }

    function addDatum(container, label, value) {
      const dt = document.createElement('dt');
      const dd = document.createElement('dd');
      dt.textContent = label;
      dd.textContent = value;
      container.append(dt, dd);
    }

    function updateStatus() {
      if (!status) return;
      if (!state.scene) {
        status.textContent = 'Generate a cluster to initialize the rigid three-dimensional volume.';
        return;
      }
      if (state.selected?.category === 'lensing-node') {
        status.textContent = `${state.selected.name}: ${state.selected.connections.length} generating connection${state.selected.connections.length === 1 ? '' : 's'}, relative strength ${state.selected.strength.toFixed(2)}.`;
        return;
      }
      const anomalyCount = state.scene.lensingNodes.filter(node => node.anomaly).length;
      status.textContent = state.mode === 'gravity'
        ? `${state.scene.lensingNodes.length} aggregate mass-derived lensing nodes are active, including ${anomalyCount} anomaly node. Nodes calculated within 1,000 AU are merged and remain selectable with their source connections.`
        : `${state.scene.entries.length} fixed stellar systems remain connected through nearest-neighbor routes and automatic topology bridges.`;
    }

    function scheduleRender() {
      if (state.renderQueued) return;
      state.renderQueued = true;
      requestAnimationFrame(render);
    }

    function project(point, width, height, scene) {
      const rotated = rotate(point);
      const perspective = 1 / Math.max(0.58, 1 + rotated.z / Math.max(1, scene.maxRadius) * 0.24);
      const zoom = Number($('exo-cluster-camera-zoom')?.value || 100) / 100;
      const scale = Math.min(width, height) * 0.42 * zoom / Math.max(1, scene.maxRadius);
      return {
        x: width / 2 + state.panX * deviceScale() + rotated.x * scale * perspective,
        y: height / 2 + state.panY * deviceScale() + rotated.y * scale * perspective,
        depth: rotated.z,
        perspective
      };
    }

    function rotate(point) {
      const yaw = Number($('exo-cluster-camera-yaw')?.value || -24) * Math.PI / 180;
      const pitch = Number($('exo-cluster-camera-pitch')?.value || 52) * Math.PI / 180;
      const x1 = point.x * Math.cos(yaw) - point.z * Math.sin(yaw);
      const z1 = point.x * Math.sin(yaw) + point.z * Math.cos(yaw);
      return {
        x: x1,
        y: point.y * Math.cos(pitch) - z1 * Math.sin(pitch),
        z: point.y * Math.sin(pitch) + z1 * Math.cos(pitch)
      };
    }

    rebuild();
  }

  function gravityVector(point, sources, maxRadius) {
    const softening = maxRadius * 0.035;
    return sources.reduce((vector, source) => {
      const dx = source.position.x - point.x;
      const dy = source.position.y - point.y;
      const dz = source.position.z - point.z;
      const radiusSquared = dx * dx + dy * dy + dz * dz + softening * softening;
      const factor = source.weight / Math.pow(radiusSquared, 1.5);
      vector.x += dx * factor;
      vector.y += dy * factor;
      vector.z += dz * factor;
      return vector;
    }, {x: 0, y: 0, z: 0});
  }

  function weightedBarycenter(entries) {
    const total = entries.reduce((sum, entry) => sum + entry.mass, 0) || 1;
    return entries.reduce((center, entry) => ({
      x: center.x + entry.position.x * entry.mass / total,
      y: center.y + entry.position.y * entry.mass / total,
      z: center.z + entry.position.z * entry.mass / total
    }), {x: 0, y: 0, z: 0});
  }

  function randomUnitVector(rng) {
    const z = rng() * 2 - 1;
    const angle = rng() * Math.PI * 2;
    const transverse = Math.sqrt(Math.max(0, 1 - z * z));
    return {x: Math.cos(angle) * transverse, y: Math.sin(angle) * transverse, z};
  }

  function drawArrow(context, from, to, opacity) {
    const angle = Math.atan2(to.y - from.y, to.x - from.x);
    const size = 4.5 * deviceScale();
    context.save();
    context.translate(to.x, to.y);
    context.rotate(angle);
    context.fillStyle = `rgba(154,220,234,${Math.min(1, opacity + 0.2)})`;
    context.beginPath();
    context.moveTo(0, 0);
    context.lineTo(-size, size * 0.55);
    context.lineTo(-size, -size * 0.55);
    context.closePath();
    context.fill();
    context.restore();
  }

  function drawOutlinedText(context, text, x, y, color, size, bold = false) {
    context.font = `${bold ? 800 : 700} ${size}px system-ui`;
    context.lineJoin = 'round';
    context.strokeStyle = 'rgba(2,2,2,.96)';
    context.lineWidth = Math.max(3, size * 0.35);
    context.strokeText(text, x, y);
    context.fillStyle = color;
    context.fillText(text, x, y);
  }

  function addCommas(value) {
    return Math.round(value).toLocaleString();
  }

  function formatAu(value) {
    if (!Number.isFinite(value)) return 'unknown';
    if (value >= 1000000) return `${(value / 1000000).toFixed(2)}M AU`;
    if (value >= 1000) return `${addCommas(value)} AU`;
    return `${value.toFixed(2)} AU`;
  }

  function formatSignedAu(value) {
    const prefix = value >= 0 ? '+' : '−';
    return `${prefix}${addCommas(Math.abs(value))} AU`;
  }

  function formatMass(value) {
    if (!Number.isFinite(Number(value))) return 'distributed/unknown mass';
    const number = Number(value);
    return `${number < 0.01 ? number.toFixed(4) : number.toFixed(2)} M☉`;
  }

  function magnitude(point) {
    return Math.hypot(point.x, point.y, point.z);
  }

  function normalizeDegrees(value) {
    let normalized = value;
    while (normalized > 180) normalized -= 360;
    while (normalized < -180) normalized += 360;
    return normalized;
  }

  function deviceScale() {
    return Math.min(2, window.devicePixelRatio || 1);
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  waitForDependencies();
})();
