(() => {
  'use strict';

  const $ = id => document.getElementById(id);
  const SVG_NS = 'http://www.w3.org/2000/svg';
  const MIN_FALLOFF_AU = 0.5;
  const MAX_FALLOFF_AU = 2.5;
  const TAU = Math.PI * 2;

  function wait(attempt = 0) {
    const model = globalThis.BlacklightExoLensingModel;
    const stage = document.querySelector('.exo-orbit-stage');
    const toggle = $('exo-overlay-limits');
    const grid = $('exo-cluster-grid');
    const table = $('exo-orbital-table-body');
    if (!model || !stage || !toggle || !grid || !table || !$('exo-exclusive-canvas-3d')) {
      if (attempt < 480) requestAnimationFrame(() => wait(attempt + 1));
      return;
    }
    initialize({model, stage, toggle, grid, table});
  }

  function initialize({model, stage, toggle:currentToggle, grid, table}) {
    if ($('exo-dz-volume-shell-canvas')) return;

    currentToggle.checked = false;
    currentToggle.dispatchEvent(new Event('change', {bubbles:true}));
    const toggle = currentToggle.cloneNode(true);
    toggle.checked = false;
    currentToggle.replaceWith(toggle);

    const canvas = document.createElement('canvas');
    canvas.id = 'exo-dz-volume-shell-canvas';
    canvas.setAttribute('aria-label', 'Three-dimensional Dalton–Zirconf density point cloud');
    canvas.setAttribute('aria-hidden', 'true');
    stage.append(canvas);
    const context = canvas.getContext('2d');

    const flat = document.createElementNS(SVG_NS, 'svg');
    flat.id = 'exo-dz-volume-flat';
    flat.setAttribute('viewBox', '0 0 1000 1000');
    flat.setAttribute('aria-label', 'Orbital-plane cross-section of the Dalton–Zirconf density cloud');
    flat.setAttribute('aria-hidden', 'true');
    stage.append(flat);

    const state = {
      enabled:false, scene:null, selected:null, radiusAu:1, baseWidthAu:MAX_FALLOFF_AU,
      externalFields:[], renderQueued:false, rebuildQueued:false, lastRender:0,
      width:1, height:1, directions:fibonacciDirections(720), radialLayers:9
    };

    toggle.addEventListener('change', event => {
      state.enabled = event.target.checked;
      updateVisibility();
      renderFlat();
      scheduleRender();
    });

    const resize = () => {
      const ratio = Math.min(1.25, window.devicePixelRatio || 1);
      const width = Math.max(480, stage.clientWidth);
      const height = Math.max(420, stage.clientHeight);
      state.width = Math.round(width * ratio);
      state.height = Math.round(height * ratio);
      canvas.width = state.width;
      canvas.height = state.height;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      scheduleRender();
    };
    new ResizeObserver(resize).observe(stage);

    const scheduleRebuild = () => {
      if (state.rebuildQueued) return;
      state.rebuildQueued = true;
      requestAnimationFrame(() => {
        state.rebuildQueued = false;
        rebuild();
      });
    };
    new MutationObserver(scheduleRebuild).observe(grid, {childList:true});
    new MutationObserver(scheduleRebuild).observe(table, {childList:true});
    document.addEventListener('blacklight:system-rendered', scheduleRebuild);
    $('exo-cluster-seed')?.addEventListener('change', scheduleRebuild);
    $('exo-view-flat')?.addEventListener('click', () => requestAnimationFrame(updateVisibility));
    $('exo-view-3d')?.addEventListener('click', () => requestAnimationFrame(updateVisibility));
    ['exo-exclusive-yaw','exo-exclusive-pitch','exo-exclusive-zoom'].forEach(id => $(id)?.addEventListener('input', scheduleRender));
    stage.addEventListener('pointermove', scheduleRender, {passive:true});
    stage.addEventListener('wheel', scheduleRender, {passive:true});

    function rebuild() {
      const entries = [...grid.querySelectorAll('.exo-cluster-card')].map((card, index) => {
        const star = card.querySelector('.exo-cluster-primary')?.textContent.trim() || '';
        const fullMass = Number(card.dataset.systemMass);
        const stellarMass = Number(card.dataset.stellarMass);
        return {
          seed:card.querySelector('.exo-cluster-seed')?.textContent.trim() || `system-${index + 1}`,
          name:card.dataset.catalogName || card.querySelector('h3')?.textContent.trim() || `System ${index + 1}`,
          star,
          mass:Number.isFinite(fullMass) && fullMass > 0 ? fullMass : Number.isFinite(stellarMass) && stellarMass > 0 ? stellarMass : model.stellarMass(star),
          populated:card.classList.contains('is-populated')
        };
      });
      state.scene = entries.length ? model.buildScene(entries, $('exo-cluster-seed')?.value.trim() || 'cluster', {mergeRadiusAu:1000}) : null;
      const seed = $('exo-seed-input')?.value.trim();
      state.selected = state.scene?.entries.find(entry => entry.seed === seed) || state.scene?.entries[0] || null;
      buildExternalFields();
      calculateBoundary();
      updateReadout();
      renderFlat();
      scheduleRender();
    }

    function buildExternalFields() {
      const fields = [];
      if (state.scene && state.selected) {
        for (const edge of state.scene.edges || []) {
          if (edge.from !== state.selected && edge.to !== state.selected) continue;
          const other = edge.from === state.selected ? edge.to : edge.from;
          fields.push({direction:unit(subtract(other.position, state.selected.position)), strength:connectionStrength(state.selected, other, edge.distance, state.scene.maxRadius), source:'adjacent-system'});
        }
        const nearestDistance = state.selected.nearest?.distance || state.scene.maxRadius * .3;
        const nearbyRadius = Math.max(1000, nearestDistance * .75);
        for (const node of state.scene.lensingNodes || []) {
          const offset = subtract(node.position, state.selected.position);
          const distance = magnitude(offset);
          if (distance <= nearbyRadius) fields.push({direction:unit(offset), strength:Math.max(.4, Number(node.strength) || .4), source:node.anomaly ? 'anomaly' : 'aggregate'});
        }
      }
      state.externalFields = fields;
    }

    function calculateBoundary() {
      const active = globalThis.BlacklightExoGetActiveSystem?.();
      const outermost = Math.max(1, ...(active?.planets || []).map(body => Number(body.distance) || 0));
      const selectedMass = state.selected?.mass || Number(active?.star?.mass) || 1;
      const orbitBound = outermost * (10 + Math.sqrt(Math.max(.08, selectedMass)) * 6);
      const neighborBound = state.selected?.nearest?.distance ? state.selected.nearest.distance * .46 : Infinity;
      state.radiusAu = Math.min(orbitBound, neighborBound);
      const stacked = state.externalFields.reduce((sum, field) => sum + field.strength, 0);
      const compression = 1 - Math.exp(-stacked / 4.2);
      state.baseWidthAu = model.clamp(MAX_FALLOFF_AU - (MAX_FALLOFF_AU - MIN_FALLOFF_AU) * compression, MIN_FALLOFF_AU, MAX_FALLOFF_AU);
    }

    function activeBodyFields(epoch) {
      const active = globalThis.BlacklightExoGetActiveSystem?.();
      if (!active) return [];
      const result = [];
      for (const body of active.planets || []) {
        const elements = elementsFor(body);
        const angle = elements.phase + epoch / Math.max(.01, Number(body.periodDays) || 1) * TAU;
        const direction = unit(orbitPoint(1, elements, angle));
        const moonMass = (body.moons || []).reduce((sum, moon) => sum + Math.max(0, Number(moon.mass) || 0), 0);
        const moonCount = (body.moons || []).length;
        const bodyMass = Math.max(0, Number(body.mass) || 0);
        const strength = .05 + Math.log10(1 + bodyMass + moonMass) * .34 + Math.log10(1 + moonCount) * .08;
        result.push({direction, strength, source:body.name});
      }
      return result;
    }

    function directionalWidth(direction, bodyFields, index) {
      let field = 0;
      for (const source of [...state.externalFields, ...bodyFields]) {
        const alignment = Math.max(0, dot(direction, source.direction));
        field += source.strength * Math.pow(alignment, 8);
      }
      const compression = field / (1 + field);
      const irregularity = (hashUnit(`${$('exo-seed-input')?.value || 'system'}:dz:${index}`) - .5) * .09;
      return model.clamp(state.baseWidthAu - (state.baseWidthAu - MIN_FALLOFF_AU) * compression * .94 + irregularity, MIN_FALLOFF_AU, MAX_FALLOFF_AU);
    }

    function renderFlat() {
      flat.replaceChildren();
      if (!state.enabled) return;
      const epoch = Number(globalThis.BlacklightExoGetProjectionEpochDays?.() ?? 0);
      const fields = activeBodyFields(epoch);
      const group = document.createElementNS(SVG_NS, 'g');
      const segments = 180;
      const layers = 13;
      for (let layer = 0; layer < layers; layer += 1) {
        const t = layer / (layers - 1) * 2 - 1;
        const points = [];
        for (let index = 0; index <= segments; index += 1) {
          const angle = index / segments * TAU;
          const direction = {x:Math.cos(angle), y:Math.sin(angle), z:0};
          const widthAu = directionalWidth(direction, fields, index);
          const visualThickness = 10 + (widthAu - MIN_FALLOFF_AU) / (MAX_FALLOFF_AU - MIN_FALLOFF_AU) * 55;
          const radius = 445 + t * visualThickness * .5;
          points.push(`${index ? 'L' : 'M'}${(500 + Math.cos(angle) * radius).toFixed(2)} ${(500 + Math.sin(angle) * radius).toFixed(2)}`);
        }
        const path = document.createElementNS(SVG_NS, 'path');
        path.setAttribute('d', `${points.join(' ')} Z`);
        path.setAttribute('fill', 'none');
        path.setAttribute('stroke', `rgba(112,204,228,${(Math.exp(-t*t*2.2)*.09).toFixed(3)})`);
        path.setAttribute('stroke-width', '1.2');
        group.append(path);
      }
      const label = document.createElementNS(SVG_NS, 'text');
      label.setAttribute('x', '500'); label.setAttribute('y', '968'); label.setAttribute('text-anchor', 'middle'); label.setAttribute('class', 'exo-dz-volume-label');
      label.textContent = `Dalton–Zirconf 3D density shell cross-section · ${formatAu(state.radiusAu)} · ±${state.baseWidthAu.toFixed(2)} AU mean depth`;
      group.append(label); flat.append(group);
    }

    function scheduleRender() {
      if (state.renderQueued) return;
      state.renderQueued = true;
      requestAnimationFrame(renderThree);
    }

    function renderThree(timestamp) {
      state.renderQueued = false;
      if (!context) return;
      context.clearRect(0, 0, canvas.width, canvas.height);
      if (!state.enabled || !stage.classList.contains('exo-exclusive-3d')) return;
      if (timestamp - state.lastRender < 80) { scheduleRender(); return; }
      state.lastRender = timestamp;

      const camera = globalThis.BlacklightExoCameraState || {
        yaw:Number($('exo-exclusive-yaw')?.value || -24) * Math.PI / 180,
        pitch:Number($('exo-exclusive-pitch')?.value || 58) * Math.PI / 180,
        zoom:Number($('exo-exclusive-zoom')?.value || 100) / 100
      };
      const epoch = Number(globalThis.BlacklightExoGetProjectionEpochDays?.() ?? 0);
      const bodyFields = activeBodyFields(epoch);
      const width = canvas.width, height = canvas.height;
      const baseRadius = Math.min(width, height) * .42 * Math.min(12, Math.max(.15, camera.zoom));
      const points = [];
      for (let index = 0; index < state.directions.length; index += 1) {
        const direction = state.directions[index];
        const localWidth = directionalWidth(direction, bodyFields, index);
        const thickness = 7 + (localWidth - MIN_FALLOFF_AU) / (MAX_FALLOFF_AU - MIN_FALLOFF_AU) * 58;
        const compression = 1 - (localWidth - MIN_FALLOFF_AU) / (MAX_FALLOFF_AU - MIN_FALLOFF_AU);
        for (let layer = 0; layer < state.radialLayers; layer += 1) {
          const t = layer / (state.radialLayers - 1) * 2 - 1;
          const radius = baseRadius + t * thickness * .5;
          const rotated = rotate(direction, camera.yaw, camera.pitch);
          const depthNorm = rotated.z;
          const perspective = .82 + (depthNorm + 1) * .12;
          const jitter = (hashUnit(`${index}:${layer}:cloud`) - .5) * 1.6;
          points.push({
            x:width / 2 + rotated.x * radius * perspective + jitter,
            y:height / 2 + rotated.y * radius * perspective + jitter,
            z:depthNorm,
            alpha:(.012 + Math.exp(-t*t*2.5) * (.035 + compression * .035)) * (.55 + (depthNorm + 1) * .32),
            size:.55 + (depthNorm + 1) * .48 + compression * .22
          });
        }
      }
      points.sort((a, b) => a.z - b.z);
      for (const point of points) {
        if (point.x < -5 || point.y < -5 || point.x > width + 5 || point.y > height + 5) continue;
        context.beginPath();
        context.arc(point.x, point.y, point.size, 0, TAU);
        context.fillStyle = `rgba(113,207,231,${point.alpha.toFixed(3)})`;
        context.fill();
      }
      context.fillStyle = 'rgba(158,224,240,.94)';
      context.font = `${12 * Math.min(1.25, window.devicePixelRatio || 1)}px system-ui`;
      context.fillText(`Dalton–Zirconf volumetric point cloud · ${formatAu(state.radiusAu)} · local depth ±${MIN_FALLOFF_AU.toFixed(1)}–${MAX_FALLOFF_AU.toFixed(1)} AU`, 18, height - 22);
      scheduleRender();
    }

    function updateVisibility() {
      const three = stage.classList.contains('exo-exclusive-3d');
      canvas.style.display = state.enabled && three ? 'block' : 'none';
      flat.style.display = state.enabled && !three ? 'block' : 'none';
      canvas.setAttribute('aria-hidden', String(!state.enabled || !three));
      flat.setAttribute('aria-hidden', String(!state.enabled || three));
      if (state.enabled) scheduleRender();
    }

    function updateReadout() {
      let output = $('exo-dz-falloff-readout');
      if (!output) {
        output = document.createElement('span'); output.id = 'exo-dz-falloff-readout'; output.className = 'exo-dz-falloff-readout'; toggle.closest('fieldset')?.append(output);
      }
      output.textContent = `${formatAu(state.radiusAu)} radius · volumetric ±${state.baseWidthAu.toFixed(2)} AU mean depth`;
      output.title = 'A three-dimensional point-cloud shell. Aligned external systems, anomaly fields, planets, and moon-system masses compress local shell depth toward ±0.5 AU; sparse directions expand toward ±2.5 AU.';
    }

    resize();
    rebuild();
    updateVisibility();
  }

  function fibonacciDirections(count) {
    const points = [];
    const golden = Math.PI * (3 - Math.sqrt(5));
    for (let index = 0; index < count; index += 1) {
      const y = 1 - index / (count - 1) * 2;
      const radius = Math.sqrt(Math.max(0, 1 - y * y));
      const angle = golden * index;
      points.push({x:Math.cos(angle) * radius, y, z:Math.sin(angle) * radius});
    }
    return points;
  }

  function elementsFor(object) {
    return {
      eccentricity:Math.min(.85, Math.abs(Number(object.eccentricity) || 0)),
      inclination:(Number(object.inclination) || 0) * Math.PI / 180,
      ascendingNode:(Number(object.ascendingNode) || 0) * Math.PI / 180,
      periapsis:(Number(object.argumentOfPeriapsis) || 0) * Math.PI / 180,
      phase:Number(object.phase) || 0
    };
  }
  function orbitPoint(radius, elements, angle) {
    const e = elements.eccentricity;
    const r = radius * (1 - e * e) / Math.max(.15, 1 + e * Math.cos(angle));
    const x = r * Math.cos(angle + elements.periapsis), y = r * Math.sin(angle + elements.periapsis);
    const ci = Math.cos(elements.inclination), si = Math.sin(elements.inclination);
    const y1 = y * ci, z1 = y * si;
    const cn = Math.cos(elements.ascendingNode), sn = Math.sin(elements.ascendingNode);
    return {x:x * cn - y1 * sn, y:x * sn + y1 * cn, z:z1};
  }
  function rotate(point, yaw, pitch) {
    const x1 = point.x * Math.cos(yaw) - point.z * Math.sin(yaw);
    const z1 = point.x * Math.sin(yaw) + point.z * Math.cos(yaw);
    return {x:x1, y:point.y * Math.cos(pitch) - z1 * Math.sin(pitch), z:point.y * Math.sin(pitch) + z1 * Math.cos(pitch)};
  }
  function connectionStrength(a, b, distance, maxRadius) { const massTerm = Math.sqrt(Math.max(.001, a.mass * b.mass)); const distanceTerm = 1 / Math.pow(.08 + distance / Math.max(1, maxRadius), .8); return .45 + Math.min(3.5, massTerm * distanceTerm); }
  function subtract(a, b) { return {x:a.x - b.x, y:a.y - b.y, z:a.z - b.z}; }
  function magnitude(point) { return Math.hypot(point.x, point.y, point.z); }
  function unit(point) { const length = magnitude(point) || 1; return {x:point.x / length, y:point.y / length, z:point.z / length}; }
  function dot(a, b) { return a.x * b.x + a.y * b.y + a.z * b.z; }
  function hashUnit(value) { let hash = 2166136261; for (const character of String(value)) { hash ^= character.charCodeAt(0); hash = Math.imul(hash, 16777619); } return (hash >>> 0) / 4294967295; }
  function formatAu(value) { if (!Number.isFinite(value)) return 'unknown'; if (value >= 1000000) return `${(value / 1000000).toFixed(2)}M AU`; if (value >= 1000) return `${Math.round(value).toLocaleString()} AU`; return `${value.toFixed(2)} AU`; }

  wait();
})();
