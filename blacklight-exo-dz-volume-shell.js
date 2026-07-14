(() => {
  'use strict';

  const $ = id => document.getElementById(id);
  const SVG_NS = 'http://www.w3.org/2000/svg';
  const MIN_FALLOFF_AU = 0.5;
  const MAX_FALLOFF_AU = 2.5;

  function waitForSystem(attempt = 0) {
    const model = globalThis.BlacklightExoLensingModel;
    const stage = document.querySelector('.exo-orbit-stage');
    const oldToggle = $('exo-overlay-limits');
    const oldOverlay = $('exo-system-spatial-overlay-3d-v2');
    const flatReference = $('exo-system-spatial-overlay-v2');
    const table = $('exo-orbital-table-body');
    const grid = $('exo-cluster-grid');
    if (!model || !stage || !oldToggle || !oldOverlay || !flatReference || !table || !grid) {
      if (attempt < 420) requestAnimationFrame(() => waitForSystem(attempt + 1));
      return;
    }
    initialize({model, stage, oldToggle, oldOverlay, flatReference, table, grid});
  }

  function initialize({model, stage, oldToggle, oldOverlay, flatReference, table, grid}) {
    if ($('exo-dz-volume-shell-canvas')) return;

    oldToggle.checked = false;
    oldToggle.dispatchEvent(new Event('change', {bubbles:true}));
    const toggle = oldToggle.cloneNode(true);
    toggle.checked = false;
    oldToggle.replaceWith(toggle);

    const canvas = document.createElement('canvas');
    canvas.id = 'exo-dz-volume-shell-canvas';
    canvas.setAttribute('aria-label', 'Volumetric spherical Dalton–Zirconf density falloff shell');
    canvas.setAttribute('aria-hidden', 'true');
    stage.append(canvas);
    const context = canvas.getContext('2d');

    const flat = document.createElementNS(SVG_NS, 'svg');
    flat.id = 'exo-dz-volume-flat';
    flat.setAttribute('viewBox', '0 0 1000 1000');
    flat.setAttribute('aria-label', 'Flat cross-section of the Dalton–Zirconf density shell');
    flat.setAttribute('aria-hidden', 'true');
    stage.append(flat);

    const state = {
      enabled:false,
      scene:null,
      selected:null,
      outermostAu:1,
      dzRadiusAu:1,
      baseWidthAu:MAX_FALLOFF_AU,
      fieldDirections:[],
      points:buildFibonacciSphere(720),
      renderQueued:false,
      rebuildQueued:false
    };

    toggle.addEventListener('change', event => {
      state.enabled = event.target.checked;
      updateVisibility();
      renderFlat();
      scheduleRender();
    });

    const resize = () => {
      const ratio = Math.min(2, window.devicePixelRatio || 1);
      const width = Math.max(480, stage.clientWidth);
      const height = Math.max(420, stage.clientHeight);
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      syncTransforms();
      scheduleRender();
    };
    new ResizeObserver(resize).observe(stage);

    const scheduleRebuild = () => {
      if (state.rebuildQueued) return;
      state.rebuildQueued = true;
      requestAnimationFrame(() => requestAnimationFrame(() => {
        state.rebuildQueued = false;
        rebuild();
      }));
    };

    new MutationObserver(scheduleRebuild).observe(table, {childList:true});
    new MutationObserver(scheduleRebuild).observe(grid, {childList:true});
    $('exo-seed-input')?.addEventListener('change', scheduleRebuild);
    $('exo-cluster-seed')?.addEventListener('change', scheduleRebuild);
    $('exo-generate-system')?.addEventListener('click', scheduleRebuild);
    $('exo-generate-cluster')?.addEventListener('click', scheduleRebuild);
    $('exo-random-cluster')?.addEventListener('click', scheduleRebuild);
    $('exo-view-flat')?.addEventListener('click', () => requestAnimationFrame(updateVisibility));
    $('exo-view-3d')?.addEventListener('click', () => requestAnimationFrame(updateVisibility));
    ['exo-exclusive-yaw','exo-exclusive-pitch','exo-exclusive-zoom']
      .forEach(id => $(id)?.addEventListener('input', scheduleRender));
    stage.addEventListener('pointermove', syncTransforms, true);
    stage.addEventListener('wheel', syncTransforms, true);
    $('exo-system-camera-reset')?.addEventListener('click', () => requestAnimationFrame(() => {
      syncTransforms();
      scheduleRender();
    }));

    function rebuild() {
      const entries = [...grid.querySelectorAll('.exo-cluster-card')].map((card, index) => {
        const star = card.querySelector('.exo-cluster-primary')?.textContent.trim() || '';
        const fullMass = Number(card.dataset.systemMass);
        const stellarMass = Number(card.dataset.stellarMass);
        return {
          seed:card.querySelector('.exo-cluster-seed')?.textContent.trim() || `system-${index + 1}`,
          name:card.dataset.catalogName || card.querySelector('h3')?.textContent.trim() || `System ${index + 1}`,
          star,
          mass:Number.isFinite(fullMass) && fullMass > 0
            ? fullMass
            : Number.isFinite(stellarMass) && stellarMass > 0
              ? stellarMass
              : model.stellarMass(star),
          populated:card.classList.contains('is-populated')
        };
      });
      state.scene = entries.length
        ? model.buildScene(entries, $('exo-cluster-seed')?.value.trim() || 'cluster', {mergeRadiusAu:1000})
        : null;
      state.selected = state.scene?.entries.find(entry => entry.seed === $('exo-seed-input')?.value.trim()) || state.scene?.entries[0] || null;
      state.outermostAu = readOutermostAu(table);
      calculateBoundary();
      updateReadout();
      renderFlat();
      updateVisibility();
      scheduleRender();
    }

    function calculateBoundary() {
      const selectedMass = state.selected?.mass || 1;
      const orbitBound = state.outermostAu * (10 + Math.sqrt(Math.max(0.08, selectedMass)) * 6);
      const neighborBound = state.selected?.nearest?.distance
        ? state.selected.nearest.distance * 0.46
        : Infinity;
      state.dzRadiusAu = Math.min(orbitBound, neighborBound);
      const fields = [];

      if (state.scene && state.selected) {
        for (const edge of state.scene.edges || []) {
          if (edge.from !== state.selected && edge.to !== state.selected) continue;
          const other = edge.from === state.selected ? edge.to : edge.from;
          const direction = unit(subtract(other.position, state.selected.position));
          fields.push({direction, strength:connectionStrength(state.selected, other, edge.distance, state.scene.maxRadius)});
        }
        const nearestDistance = state.selected.nearest?.distance || state.scene.maxRadius * 0.3;
        const nearbyRadius = Math.max(1000, nearestDistance * 0.75);
        for (const node of state.scene.lensingNodes || []) {
          const offset = subtract(node.position, state.selected.position);
          const distance = magnitude(offset);
          if (distance > nearbyRadius) continue;
          fields.push({direction:unit(offset), strength:Math.max(0.4, Number(node.strength) || 0.4)});
        }
      }

      state.fieldDirections = fields;
      const stacked = fields.reduce((sum, field) => sum + field.strength, 0);
      const compression = 1 - Math.exp(-stacked / 4.2);
      state.baseWidthAu = model.clamp(
        MAX_FALLOFF_AU - (MAX_FALLOFF_AU - MIN_FALLOFF_AU) * compression,
        MIN_FALLOFF_AU,
        MAX_FALLOFF_AU
      );
    }

    function directionalWidth(direction, index) {
      let field = 0;
      for (const source of state.fieldDirections) {
        const alignment = Math.max(0, dot(direction, source.direction));
        field += source.strength * Math.pow(alignment, 6);
      }
      const localCompression = field / (1 + field);
      const irregularity = (hashUnit(`${$('exo-seed-input')?.value || 'system'}:dz-volume:${index}`) - 0.5) * 0.12;
      return model.clamp(
        state.baseWidthAu - (state.baseWidthAu - MIN_FALLOFF_AU) * localCompression * 0.82 + irregularity,
        MIN_FALLOFF_AU,
        MAX_FALLOFF_AU
      );
    }

    function renderFlat() {
      flat.replaceChildren();
      if (!state.enabled) return;
      const defs = document.createElementNS(SVG_NS, 'defs');
      const gradient = document.createElementNS(SVG_NS, 'radialGradient');
      gradient.id = 'exo-dz-volume-flat-gradient';
      for (const [offset, color, opacity] of [
        ['0%','#62bfd8','0'],
        ['72%','#62bfd8','0'],
        ['82%','#72cbe1','.08'],
        ['90%','#8ed9ea','.24'],
        ['96%','#78c9df','.10'],
        ['100%','#62bfd8','0']
      ]) {
        const stop = document.createElementNS(SVG_NS, 'stop');
        stop.setAttribute('offset', offset);
        stop.setAttribute('stop-color', color);
        stop.setAttribute('stop-opacity', opacity);
        gradient.append(stop);
      }
      defs.append(gradient);
      flat.append(defs);

      const disc = document.createElementNS(SVG_NS, 'circle');
      disc.setAttribute('cx', '500');
      disc.setAttribute('cy', '500');
      disc.setAttribute('r', '456');
      disc.setAttribute('fill', 'url(#exo-dz-volume-flat-gradient)');
      flat.append(disc);

      const shell = document.createElementNS(SVG_NS, 'path');
      shell.setAttribute('d', flatShellPath());
      shell.setAttribute('fill', 'none');
      shell.setAttribute('stroke', 'rgba(143,217,235,.42)');
      shell.setAttribute('stroke-width', '2');
      shell.setAttribute('stroke-dasharray', '4 8');
      flat.append(shell);

      const label = document.createElementNS(SVG_NS, 'text');
      label.setAttribute('x', '500');
      label.setAttribute('y', '968');
      label.setAttribute('text-anchor', 'middle');
      label.setAttribute('class', 'exo-dz-volume-label');
      label.textContent = `Dalton–Zirconf spherical field · ${formatAu(state.dzRadiusAu)} · ±${state.baseWidthAu.toFixed(2)} AU average falloff`;
      flat.append(label);
    }

    function flatShellPath() {
      const points = [];
      const segments = 192;
      for (let index = 0; index <= segments; index += 1) {
        const angle = index / segments * Math.PI * 2;
        const direction = {x:Math.cos(angle), y:Math.sin(angle), z:0};
        const width = directionalWidth(direction, index);
        const radius = 443 + width / MAX_FALLOFF_AU * 11;
        points.push(`${index ? 'L' : 'M'}${(500 + Math.cos(angle) * radius).toFixed(2)} ${(500 + Math.sin(angle) * radius).toFixed(2)}`);
      }
      return `${points.join(' ')} Z`;
    }

    function scheduleRender() {
      if (state.renderQueued) return;
      state.renderQueued = true;
      requestAnimationFrame(renderThree);
    }

    function renderThree() {
      state.renderQueued = false;
      context.clearRect(0, 0, canvas.width, canvas.height);
      syncTransforms();
      if (!state.enabled || !stage.classList.contains('exo-exclusive-3d')) return;

      const width = canvas.width;
      const height = canvas.height;
      const camera = cameraState();
      const visualRadius = state.outermostAu * 1.12;
      const scale = Math.min(width, height) * 0.38 * camera.zoom / Math.max(0.1, state.outermostAu * 1.18);
      drawSoftProjectedShell(width, height, visualRadius, scale, camera);

      const samples = [];
      const layers = 7;
      for (let pointIndex = 0; pointIndex < state.points.length; pointIndex += 1) {
        const direction = state.points[pointIndex];
        const widthAu = directionalWidth(direction, pointIndex);
        const visualWidth = model.clamp(
          widthAu * 2 / Math.max(1, state.dzRadiusAu) * visualRadius,
          visualRadius * 0.025,
          visualRadius * 0.24
        );
        for (let layer = 0; layer < layers; layer += 1) {
          const t = layer / (layers - 1);
          const jitter = (hashUnit(`${pointIndex}:${layer}:${$('exo-seed-input')?.value || 'system'}`) - 0.5) * visualWidth * 0.18;
          const radius = visualRadius - visualWidth / 2 + visualWidth * t + jitter;
          const projected = project3(scaleDirection(direction, radius), width, height, scale, camera);
          const density = Math.pow(1 - t, 1.35) * (0.62 + 0.38 * Math.max(0, direction.z));
          samples.push({projected, density, t});
        }
      }
      samples.sort((left, right) => left.projected.depth - right.projected.depth);

      for (const sample of samples) {
        const alpha = 0.012 + sample.density * 0.058;
        const radius = (0.45 + sample.density * 1.35) * deviceScale() * sample.projected.perspective;
        context.beginPath();
        context.arc(sample.projected.x, sample.projected.y, radius, 0, Math.PI * 2);
        context.fillStyle = `rgba(111,207,231,${alpha.toFixed(3)})`;
        context.fill();
      }

      context.save();
      context.font = `800 ${12 * deviceScale()}px system-ui`;
      context.fillStyle = 'rgba(158,222,238,.95)';
      context.shadowColor = '#020202';
      context.shadowBlur = 6;
      context.fillText(
        `Dalton–Zirconf spherical density field · ${formatAu(state.dzRadiusAu)} · ±${state.baseWidthAu.toFixed(2)} AU average transition`,
        18 * deviceScale(),
        height - 22 * deviceScale()
      );
      context.restore();
    }

    function drawSoftProjectedShell(width, height, visualRadius, scale, camera) {
      const center = project3({x:0,y:0,z:0}, width, height, scale, camera);
      const edge = project3({x:visualRadius,y:0,z:0}, width, height, scale, camera);
      const radius = Math.max(10, Math.hypot(edge.x - center.x, edge.y - center.y));
      const gradient = context.createRadialGradient(center.x, center.y, radius * 0.70, center.x, center.y, radius * 1.08);
      gradient.addColorStop(0, 'rgba(91,184,213,0)');
      gradient.addColorStop(0.58, 'rgba(91,184,213,0)');
      gradient.addColorStop(0.76, 'rgba(91,184,213,.018)');
      gradient.addColorStop(0.88, 'rgba(119,207,229,.065)');
      gradient.addColorStop(0.96, 'rgba(119,207,229,.025)');
      gradient.addColorStop(1, 'rgba(91,184,213,0)');
      context.beginPath();
      context.arc(center.x, center.y, radius * 1.08, 0, Math.PI * 2);
      context.fillStyle = gradient;
      context.fill();
    }

    function updateVisibility() {
      const three = stage.classList.contains('exo-exclusive-3d');
      canvas.setAttribute('aria-hidden', String(!state.enabled || !three));
      flat.setAttribute('aria-hidden', String(!state.enabled || three));
      syncTransforms();
      renderFlat();
      scheduleRender();
    }

    function syncTransforms() {
      canvas.style.transform = oldOverlay.style.transform;
      canvas.style.translate = oldOverlay.style.translate;
      flat.style.transform = flatReference.style.transform;
      flat.style.translate = flatReference.style.translate;
    }

    function updateReadout() {
      let output = $('exo-dz-falloff-readout');
      if (!output) {
        output = document.createElement('span');
        output.id = 'exo-dz-falloff-readout';
        output.className = 'exo-dz-falloff-readout';
        toggle.closest('fieldset')?.append(output);
      }
      output.textContent = `${formatAu(state.dzRadiusAu)} radius · spherical ±${state.baseWidthAu.toFixed(2)} AU density falloff`;
      output.title = 'This is a volumetric spherical transition. Local gravitational-field stacking compresses the shell toward ±0.5 AU; weaker external fields widen it toward ±2.5 AU.';
    }

    function cameraState() {
      return {
        yaw:Number($('exo-exclusive-yaw')?.value || -24) * Math.PI / 180,
        pitch:Number($('exo-exclusive-pitch')?.value || 58) * Math.PI / 180,
        zoom:Number($('exo-exclusive-zoom')?.value || 100) / 100
      };
    }

    function project3(point, width, height, scale, camera) {
      const rotated = rotatePoint(point, camera.yaw, camera.pitch);
      const perspective = 1 / Math.max(0.38, 1 + rotated.z * 0.00115);
      return {
        x:width / 2 + rotated.x * scale * perspective,
        y:height / 2 + rotated.y * scale * perspective,
        depth:rotated.z,
        perspective
      };
    }

    resize();
    rebuild();
  }

  function readOutermostAu(table) {
    const distances = [];
    for (const row of table.querySelectorAll('tr')) {
      const orbit = row.cells?.[0]?.textContent.trim() || '';
      const distance = row.cells?.[3]?.textContent.trim() || '';
      if (/^\d+$/.test(orbit) && / AU$/.test(distance)) distances.push(Number.parseFloat(distance) || 0);
    }
    return Math.max(1, ...distances);
  }

  function buildFibonacciSphere(count) {
    const points = [];
    const golden = Math.PI * (3 - Math.sqrt(5));
    for (let index = 0; index < count; index += 1) {
      const y = 1 - index / Math.max(1, count - 1) * 2;
      const radius = Math.sqrt(Math.max(0, 1 - y * y));
      const theta = golden * index;
      points.push({x:Math.cos(theta) * radius, y, z:Math.sin(theta) * radius});
    }
    return points;
  }

  function connectionStrength(a, b, distance, maxRadius) {
    const massTerm = Math.sqrt(Math.max(0.001, a.mass * b.mass));
    const distanceTerm = 1 / Math.pow(0.08 + distance / Math.max(1, maxRadius), 0.8);
    return 0.45 + Math.min(3.5, massTerm * distanceTerm);
  }

  function rotatePoint(point, yaw, pitch) {
    const x1 = point.x * Math.cos(yaw) - point.z * Math.sin(yaw);
    const z1 = point.x * Math.sin(yaw) + point.z * Math.cos(yaw);
    return {
      x:x1,
      y:point.y * Math.cos(pitch) - z1 * Math.sin(pitch),
      z:point.y * Math.sin(pitch) + z1 * Math.cos(pitch)
    };
  }

  function subtract(a, b) {
    return {x:a.x - b.x, y:a.y - b.y, z:a.z - b.z};
  }

  function unit(point) {
    const length = magnitude(point) || 1;
    return {x:point.x / length, y:point.y / length, z:point.z / length};
  }

  function scaleDirection(direction, amount) {
    return {x:direction.x * amount, y:direction.y * amount, z:direction.z * amount};
  }

  function magnitude(point) {
    return Math.hypot(point.x, point.y, point.z);
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

  function formatAu(value) {
    if (!Number.isFinite(value)) return 'unknown';
    if (value >= 1000000) return `${(value / 1000000).toFixed(2)}M AU`;
    if (value >= 1000) return `${Math.round(value).toLocaleString()} AU`;
    return `${value.toFixed(2)} AU`;
  }

  function deviceScale() {
    return Math.min(2, window.devicePixelRatio || 1);
  }

  waitForSystem();
})();
