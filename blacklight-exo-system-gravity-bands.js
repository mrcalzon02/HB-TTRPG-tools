(() => {
  'use strict';

  const $ = id => document.getElementById(id);
  const EARTHS_PER_SOLAR_MASS = 332946.0487;
  const SOL_MASSES = new Map([
    ['Mercury',0.0553],['Venus',0.815],['Earth',1],['Mars',0.1074],
    ['Jupiter',317.83],['Saturn',95.16],['Uranus',14.536],['Neptune',17.147]
  ]);

  function waitForDependencies(attempt = 0) {
    const model = globalThis.BlacklightExoLensingModel;
    const stage = document.querySelector('.exo-orbit-stage');
    const toggle = $('exo-overlay-lensing');
    const topologyCanvas = $('exo-topology-lensing-canvas');
    const table = $('exo-orbital-table-body');
    const grid = $('exo-cluster-grid');
    if (!model || !stage || !toggle || !topologyCanvas || !table || !grid) {
      if (attempt < 480) requestAnimationFrame(() => waitForDependencies(attempt + 1));
      return;
    }
    initialize({model, stage, toggle, topologyCanvas, table, grid});
  }

  function initialize({model, stage, toggle, topologyCanvas, table, grid}) {
    if ($('exo-system-gravity-gradient-canvas')) return;

    const authority = globalThis.BlacklightExoAuthority;
    const flatOverlay = $('exo-flat-spatial-overlays');
    const seedInput = $('exo-seed-input');
    const clusterSeed = $('exo-cluster-seed');
    const fieldset = toggle.closest('fieldset');
    if (!seedInput || !fieldset) return;

    const switcher = document.createElement('div');
    switcher.id = 'exo-system-gravity-display-switch';
    switcher.className = 'exo-system-gravity-display-switch';
    switcher.setAttribute('role', 'group');
    switcher.setAttribute('aria-label', 'System gravity display');
    switcher.innerHTML = `
      <button id="exo-system-gravity-nodes" class="bli-action is-active" type="button" aria-pressed="true">Lensing Nodes</button>
      <button id="exo-system-gravity-bands" class="bli-action" type="button" aria-pressed="false">Gravity Gradient Bands</button>
    `;
    fieldset.append(switcher);

    const summary = document.createElement('span');
    summary.id = 'exo-system-gradient-summary';
    summary.className = 'exo-system-gradient-summary';
    summary.hidden = true;
    summary.textContent = 'Logarithmically normalized gravity gradients; published masses take precedence.';
    fieldset.append(summary);

    const canvas = document.createElement('canvas');
    canvas.id = 'exo-system-gravity-gradient-canvas';
    canvas.className = 'exo-system-gravity-gradient-canvas';
    canvas.hidden = true;
    canvas.setAttribute('aria-label', 'System gravity-gradient band overlay');
    canvas.setAttribute('aria-hidden', 'true');
    stage.append(canvas);
    const context = canvas.getContext('2d');

    const state = {
      mode:'nodes',
      enabled:Boolean(toggle.checked),
      sources:[],
      externalCount:0,
      maximumDistanceAu:1,
      renderQueued:false,
      rebuildQueued:false
    };

    $('exo-system-gravity-nodes')?.addEventListener('click', () => setMode('nodes'));
    $('exo-system-gravity-bands')?.addEventListener('click', () => setMode('bands'));
    toggle.addEventListener('change', event => {
      state.enabled = event.target.checked;
      updateVisibility();
    });

    const resize = () => {
      const ratio = Math.min(2, window.devicePixelRatio || 1);
      const width = Math.max(480, stage.clientWidth);
      const height = Math.max(420, stage.clientHeight);
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      syncTransform();
      scheduleRender();
    };
    new ResizeObserver(resize).observe(stage);
    resize();

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
    seedInput.addEventListener('change', scheduleRebuild);
    clusterSeed?.addEventListener('change', scheduleRebuild);
    $('exo-generate-system')?.addEventListener('click', scheduleRebuild);
    $('exo-generate-cluster')?.addEventListener('click', scheduleRebuild);
    $('exo-random-cluster')?.addEventListener('click', scheduleRebuild);
    $('exo-view-flat')?.addEventListener('click', () => requestAnimationFrame(updateVisibility));
    $('exo-view-3d')?.addEventListener('click', () => requestAnimationFrame(updateVisibility));
    ['exo-exclusive-yaw','exo-exclusive-pitch','exo-exclusive-zoom']
      .forEach(id => $(id)?.addEventListener('input', scheduleRender));
    stage.addEventListener('pointermove', syncTransform, true);
    stage.addEventListener('wheel', syncTransform, true);
    $('exo-system-camera-reset')?.addEventListener('click', () => requestAnimationFrame(() => {
      syncTransform();
      scheduleRender();
    }));

    function setMode(mode) {
      state.mode = mode === 'bands' ? 'bands' : 'nodes';
      const bands = state.mode === 'bands';
      $('exo-system-gravity-nodes')?.classList.toggle('is-active', !bands);
      $('exo-system-gravity-bands')?.classList.toggle('is-active', bands);
      $('exo-system-gravity-nodes')?.setAttribute('aria-pressed', String(!bands));
      $('exo-system-gravity-bands')?.setAttribute('aria-pressed', String(bands));
      stage.classList.toggle('exo-system-gravity-gradient-active', bands);
      updateVisibility();
    }

    function rebuild() {
      state.sources = [];
      state.externalCount = 0;
      const seed = seedInput.value.trim();
      const record = authority?.getSystem(seed) || null;
      const measured = globalThis.BlacklightExoSystemMasses?.get(seed);
      const stellarMass = Number(record?.stellarMassSolar) || Number(measured?.stellarMassSolar) || 1;
      state.sources.push(makeSource({x:0,y:0,z:0}, stellarMass, 0.075, 'Primary star', 'published-or-generated-star'));

      const localBodies = localPlanetSources(record, seed);
      state.maximumDistanceAu = Math.max(1, ...localBodies.map(item => item.distanceAu));
      for (const body of localBodies) {
        const radius = compressedRadius(body.distanceAu, state.maximumDistanceAu);
        const angle = hashUnit(`${seed}:${body.name}:gravity-angle`) * Math.PI * 2;
        const inclination = (hashUnit(`${seed}:${body.name}:gravity-inclination`) - 0.5) * 0.16;
        state.sources.push(makeSource(
          {x:Math.cos(angle) * radius, y:Math.sin(angle) * radius, z:inclination},
          body.massSolar,
          0.025 + Math.min(0.035, Math.pow(body.massSolar * EARTHS_PER_SOLAR_MASS, 0.2) * 0.006),
          body.name,
          body.provenance
        ));
      }

      const scene = buildClusterScene();
      if (scene) appendExternalSources(scene, seed);
      updateSummary(record, localBodies);
      scheduleRender();
    }

    function localPlanetSources(record, seed) {
      const bodies = [];
      const seen = new Set();
      for (const planet of record?.confirmedPlanets || []) {
        if (!Number.isFinite(planet.semiMajorAu) || !Number.isFinite(planet.massEarth)) continue;
        bodies.push({
          name:planet.name,
          distanceAu:planet.semiMajorAu,
          massSolar:planet.massEarth / EARTHS_PER_SOLAR_MASS,
          provenance:'published'
        });
        seen.add(normalizeName(planet.name));
      }

      for (const row of table.querySelectorAll('tr')) {
        const orbit = row.cells?.[0]?.textContent.trim() || '';
        if (!/^\d+$/.test(orbit)) continue;
        const name = row.cells?.[1]?.textContent.trim().replace(/^↳\s*/, '') || `Planet ${orbit}`;
        if (seen.has(normalizeName(name))) continue;
        const distanceText = row.cells?.[3]?.textContent.trim() || '';
        const distanceAu = / AU$/.test(distanceText) ? Number.parseFloat(distanceText) : NaN;
        if (!Number.isFinite(distanceAu)) continue;
        const classText = row.cells?.[2]?.textContent.trim() || '';
        const solMass = SOL_MASSES.get(name);
        const massEarth = solMass ?? estimateEarthMass(classText, `${seed}:${name}`);
        bodies.push({
          name,
          distanceAu,
          massSolar:massEarth / EARTHS_PER_SOLAR_MASS,
          provenance:solMass !== undefined ? 'published' : 'rng-supplement-class-estimate'
        });
      }
      return bodies;
    }

    function estimateEarthMass(classText, seed) {
      const rng = hashUnit(seed);
      if (/gas giant/i.test(classText)) return 60 + rng * 260;
      if (/ice giant/i.test(classText)) return 10 + rng * 18;
      if (/super[- ]?earth|large terrestrial/i.test(classText)) return 2 + rng * 8;
      if (/dwarf|minor/i.test(classText)) return 0.002 + rng * 0.08;
      if (/terrestrial|rocky|ocean|desert|barren/i.test(classText)) return 0.08 + rng * 1.8;
      return 0.1 + rng * 5;
    }

    function buildClusterScene() {
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
      return entries.length
        ? model.buildScene(entries, clusterSeed?.value.trim() || 'cluster', {mergeRadiusAu:1000})
        : null;
    }

    function appendExternalSources(scene, seed) {
      const selected = scene.entries.find(entry => entry.seed === seed) || scene.entries[0];
      if (!selected) return;
      for (const edge of scene.edges || []) {
        if (edge.from !== selected && edge.to !== selected) continue;
        const other = edge.from === selected ? edge.to : edge.from;
        const direction = unit(subtract(other.position, selected.position));
        const relativeDistance = edge.distance / Math.max(1, scene.maxRadius);
        const tidalWeight = Math.sqrt(Math.max(1e-8, selected.mass * other.mass)) /
          Math.pow(0.18 + relativeDistance, 1.6) * 0.00022;
        state.sources.push(makeSource(
          {x:direction.x * 1.42, y:direction.y * 1.42, z:direction.z * 1.42},
          tidalWeight,
          0.22,
          `External field: ${other.name}`,
          edge.bridge ? 'cluster-bridge-field' : 'nearest-neighbor-field'
        ));
        state.externalCount += 1;
      }
      const anomaly = (scene.lensingNodes || []).find(node => node.anomaly);
      if (anomaly) {
        const direction = unit(subtract(anomaly.position, selected.position));
        state.sources.push(makeSource(
          {x:direction.x * 1.18, y:direction.y * 1.18, z:direction.z * 1.18},
          Math.max(0.00001, anomaly.strength * 0.00008),
          0.16,
          'Cluster anomaly field',
          'anomaly'
        ));
        state.externalCount += 1;
      }
    }

    function makeSource(position, physicalMassSolar, softening, name, provenance) {
      const normalizedWeight = Math.pow(Math.max(1e-12, physicalMassSolar), 0.42);
      return {position, physicalMassSolar, weight:normalizedWeight, softening, name, provenance};
    }

    function compressedRadius(distanceAu, maximumAu) {
      return 0.13 + Math.log1p(distanceAu) / Math.log1p(Math.max(1.01, maximumAu)) * 0.72;
    }

    function updateSummary(record, bodies) {
      summary.textContent = `${bodies.length} local mass source${bodies.length === 1 ? '' : 's'} · ${state.externalCount} external field${state.externalCount === 1 ? '' : 's'}`;
      summary.title = record
        ? 'Published masses and orbits take precedence. Missing local masses are class-derived deterministic supplements. Field intensity is logarithmically normalized for visibility.'
        : 'Generated system masses are class-derived deterministic supplements. Field intensity is logarithmically normalized for visibility.';
    }

    function updateVisibility() {
      const visible = state.enabled && state.mode === 'bands';
      canvas.hidden = !visible;
      canvas.setAttribute('aria-hidden', String(!visible));
      summary.hidden = state.mode !== 'bands';
      if (visible) {
        syncTransform();
        scheduleRender();
      } else {
        context.clearRect(0, 0, canvas.width, canvas.height);
      }
    }

    function syncTransform() {
      const isThree = stage.classList.contains('exo-exclusive-3d');
      const source = isThree ? topologyCanvas : flatOverlay;
      canvas.style.transform = source?.style.transform || '';
      canvas.style.translate = source?.style.translate || '';
      scheduleRender();
    }

    function scheduleRender() {
      if (state.renderQueued || !state.enabled || state.mode !== 'bands') return;
      state.renderQueued = true;
      requestAnimationFrame(render);
    }

    function render() {
      state.renderQueued = false;
      if (!state.enabled || state.mode !== 'bands' || !context) return;
      const width = canvas.width;
      const height = canvas.height;
      context.clearRect(0, 0, width, height);
      if (!state.sources.length) return;
      const isThree = stage.classList.contains('exo-exclusive-3d');
      drawHeatMap(width, height, isThree);
      drawLegend(width, height, isThree);
    }

    function drawHeatMap(width, height, isThree) {
      const ratio = width / Math.max(1, height);
      const sampleHeight = 64;
      const sampleWidth = Math.max(78, Math.round(sampleHeight * ratio));
      const offscreen = document.createElement('canvas');
      offscreen.width = sampleWidth;
      offscreen.height = sampleHeight;
      const off = offscreen.getContext('2d');
      const image = off.createImageData(sampleWidth, sampleHeight);
      const logs = new Float64Array(sampleWidth * sampleHeight);
      const slices = isThree ? [-0.34, 0, 0.34] : [0];
      let cursor = 0;
      for (let y = 0; y < sampleHeight; y += 1) {
        for (let x = 0; x < sampleWidth; x += 1) {
          let combined = 0;
          for (const depth of slices) {
            const point = normalizedWorldPoint(x, y, sampleWidth, sampleHeight, depth, isThree);
            combined += fieldMagnitude(point);
          }
          logs[cursor] = Math.log10(1 + combined / slices.length * 18);
          cursor += 1;
        }
      }
      const sorted = [...logs].sort((a, b) => a - b);
      const low = sorted[Math.floor(sorted.length * 0.05)] || 0;
      const high = sorted[Math.floor(sorted.length * 0.985)] || low + 1;
      for (let index = 0; index < logs.length; index += 1) {
        const normalized = model.clamp((logs[index] - low) / Math.max(1e-9, high - low), 0, 1);
        const band = Math.floor(normalized * 13) / 12;
        const [red, green, blue] = bandColor(band);
        const offset = index * 4;
        image.data[offset] = red;
        image.data[offset + 1] = green;
        image.data[offset + 2] = blue;
        image.data[offset + 3] = Math.round((0.04 + band * 0.48) * 255);
      }
      off.putImageData(image, 0, 0);
      context.save();
      context.imageSmoothingEnabled = true;
      context.globalCompositeOperation = 'screen';
      context.drawImage(offscreen, 0, 0, width, height);
      context.restore();
    }

    function normalizedWorldPoint(x, y, sampleWidth, sampleHeight, depth, isThree) {
      const nx = (x + 0.5) / sampleWidth * 2 - 1;
      const ny = (y + 0.5) / sampleHeight * 2 - 1;
      const point = {x:nx * 1.15, y:ny * 1.15, z:depth};
      return isThree ? inverseRotate(point) : point;
    }

    function fieldMagnitude(point) {
      let gx = 0;
      let gy = 0;
      let gz = 0;
      for (const item of state.sources) {
        const dx = item.position.x - point.x;
        const dy = item.position.y - point.y;
        const dz = item.position.z - point.z;
        const distanceSquared = dx * dx + dy * dy + dz * dz + item.softening * item.softening;
        const distance = Math.sqrt(distanceSquared);
        const scalar = item.weight / (distanceSquared * Math.max(0.08, distance));
        gx += dx * scalar;
        gy += dy * scalar;
        gz += dz * scalar;
      }
      return Math.hypot(gx, gy, gz);
    }

    function bandColor(value) {
      const stops = [
        [0.00,8,17,38],
        [0.18,17,58,104],
        [0.34,31,126,166],
        [0.52,66,185,176],
        [0.68,196,205,100],
        [0.84,234,128,62],
        [1.00,255,232,197]
      ];
      for (let index = 1; index < stops.length; index += 1) {
        if (value <= stops[index][0]) {
          const left = stops[index - 1];
          const right = stops[index];
          const t = (value - left[0]) / Math.max(1e-9, right[0] - left[0]);
          return [
            Math.round(left[1] + (right[1] - left[1]) * t),
            Math.round(left[2] + (right[2] - left[2]) * t),
            Math.round(left[3] + (right[3] - left[3]) * t)
          ];
        }
      }
      return stops.at(-1).slice(1);
    }

    function drawLegend(width, height, isThree) {
      const ratio = Math.min(2, window.devicePixelRatio || 1);
      const x = 18 * ratio;
      const y = 24 * ratio;
      outlinedText('GRAVITY GRADIENT BANDS', x, y, '#dceff3', 11 * ratio, true);
      const colors = ['#081126','#113a68','#1f7ea6','#42b9b0','#c4cd64','#ea803e','#ffe8c5'];
      const cell = 20 * ratio;
      colors.forEach((color, index) => {
        context.fillStyle = color;
        context.globalAlpha = 0.76;
        context.fillRect(x + index * cell, y + 10 * ratio, cell, 7 * ratio);
      });
      context.globalAlpha = 1;
      outlinedText('weaker', x, y + 31 * ratio, '#9eb0b5', 8.5 * ratio);
      outlinedText('stronger', x + colors.length * cell - 35 * ratio, y + 31 * ratio, '#edcfb1', 8.5 * ratio);
      outlinedText(
        `${isThree ? 'Projected 3D field slices' : 'Orbital-plane field'} · logarithmic display normalization · not a second mass model`,
        18 * ratio,
        height - 17 * ratio,
        '#9fc8d3',
        9.5 * ratio
      );
    }

    function inverseRotate(point) {
      const yaw = Number($('exo-exclusive-yaw')?.value || -24) * Math.PI / 180;
      const pitch = Number($('exo-exclusive-pitch')?.value || 58) * Math.PI / 180;
      const y = point.y * Math.cos(pitch) + point.z * Math.sin(pitch);
      const z1 = -point.y * Math.sin(pitch) + point.z * Math.cos(pitch);
      return {
        x:point.x * Math.cos(yaw) + z1 * Math.sin(yaw),
        y,
        z:-point.x * Math.sin(yaw) + z1 * Math.cos(yaw)
      };
    }

    function outlinedText(text, x, y, color, size, bold = false) {
      context.font = `${bold ? 800 : 650} ${size}px system-ui`;
      context.lineWidth = Math.max(2, size * 0.22);
      context.strokeStyle = 'rgba(0,0,0,.88)';
      context.strokeText(text, x, y);
      context.fillStyle = color;
      context.fillText(text, x, y);
    }

    function normalizeName(value) {
      return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
    }

    function subtract(a, b) {
      return {x:a.x - b.x, y:a.y - b.y, z:a.z - b.z};
    }

    function unit(point) {
      const length = Math.hypot(point.x, point.y, point.z) || 1;
      return {x:point.x / length, y:point.y / length, z:point.z / length};
    }

    function hashUnit(value) {
      let hash = 2166136261;
      for (const character of String(value)) {
        hash ^= character.charCodeAt(0);
        hash = Math.imul(hash, 16777619);
      }
      return (hash >>> 0) / 4294967295;
    }

    rebuild();
    updateVisibility();
  }

  waitForDependencies();
})();
