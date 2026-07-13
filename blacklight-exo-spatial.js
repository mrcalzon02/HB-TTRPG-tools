(() => {
  'use strict';

  const $ = id => document.getElementById(id);
  const stage = document.querySelector('.exo-orbit-stage');
  const sourceSvg = $('exo-orbit-svg');
  const tableBody = $('exo-orbital-table-body');
  const seedInput = $('exo-seed-input');
  const generateButton = $('exo-generate-system');
  const clusterGrid = $('exo-cluster-grid');

  if (!stage || !sourceSvg || !tableBody || !seedInput) return;

  const state = {
    mode: 'combined',
    architecture: 'mixed',
    yaw: -24,
    pitch: 58,
    zoom: 1,
    seed: '',
    starMass: 1,
    hzInner: 0.8,
    hzOuter: 1.6,
    outermostAu: 1,
    nearestNeighborAu: null,
    planets: [],
    moons: [],
    canvas: null,
    context: null,
    selectedId: 'star',
    hitTargets: [],
    clusterMap: null,
    clusterResizeObserver: null
  };

  function hashString(value) {
    let hash = 2166136261;
    for (const character of String(value)) {
      hash ^= character.charCodeAt(0);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  function randomFor(value) {
    let seed = hashString(value);
    return () => {
      seed += 0x6D2B79F5;
      let result = seed;
      result = Math.imul(result ^ result >>> 15, result | 1);
      result ^= result + Math.imul(result ^ result >>> 7, result | 61);
      return ((result ^ result >>> 14) >>> 0) / 4294967296;
    };
  }

  function parseInspectorData() {
    const data = $('exo-inspector-data');
    const values = {};
    if (!data) return values;
    const children = [...data.children];
    for (let index = 0; index < children.length - 1; index += 2) {
      values[children[index].textContent.trim()] =
        children[index + 1].textContent.trim();
    }
    return values;
  }

  function readStarMetrics() {
    const currentSelection = $('exo-selection-name')?.textContent || '';
    const starTarget = document.querySelector('.exo-star-target');
    if (starTarget && !/primary star/i.test(currentSelection)) {
      starTarget.dispatchEvent(new MouseEvent('click', {bubbles:true}));
    }

    const values = parseInspectorData();
    const mass = Number.parseFloat(values.Mass || '') || state.starMass || 1;
    const hzValues = (values['Habitable zone'] || '').match(/[\d.]+/g)?.map(Number);
    if (hzValues?.length >= 2) {
      state.hzInner = hzValues[0];
      state.hzOuter = hzValues[1];
    }
    state.starMass = mass;
  }

  function architectureRanges() {
    if (state.architecture === 'regular') {
      return {eccentricity:[0.005, 0.13], inclination:[0, 9]};
    }
    if (state.architecture === 'erratic') {
      return {eccentricity:[0.28, 0.82], inclination:[18, 86]};
    }
    return {eccentricity:[0.04, 0.48], inclination:[0, 42]};
  }

  function orbitalElements(id, index) {
    const rng = randomFor(`${state.seed}:${id}:${state.architecture}`);
    const ranges = architectureRanges();
    const eccentricity =
      ranges.eccentricity[0] +
      rng() * (ranges.eccentricity[1] - ranges.eccentricity[0]);
    const inclination =
      ranges.inclination[0] +
      rng() * (ranges.inclination[1] - ranges.inclination[0]);
    return {
      eccentricity,
      inclination: inclination * Math.PI / 180,
      ascendingNode: rng() * Math.PI * 2,
      periapsis: rng() * Math.PI * 2,
      phase: rng() * Math.PI * 2,
      verticalWarp: (rng() - 0.5) * (state.architecture === 'erratic' ? 0.22 : 0.05),
      index
    };
  }

  function parseSystemRows() {
    const planets = [];
    const moons = [];
    let parent = null;

    for (const row of [...tableBody.querySelectorAll('tr')]) {
      const cells = row.cells;
      if (!cells?.length) continue;
      const orbit = cells[0].textContent.trim();
      const name = cells[1]?.textContent.trim().replace(/^↳\s*/, '') || orbit;
      const kind = cells[2]?.textContent.trim() || '';
      const distanceText = cells[3]?.textContent.trim() || '';
      const periodText = cells[4]?.textContent.trim() || '';
      const id = row.dataset.objectId || `row-${orbit}`;
      const bodyColors = {
        Scorched:'#d36a3f',
        Volcanic:'#c64d2b',
        Barren:'#9b8a72',
        Temperate:'#5ea77b',
        Ocean:'#4d8fd1',
        'Super-Earth':'#8eb397',
        'Mini-Neptune':'#72a5b8',
        'Gas giant':'#d6a86c',
        'Ice giant':'#79a9d5',
        Frozen:'#b8d3de',
        Dwarf:'#a89d90'
      };
      const color = bodyColors[kind] || '#8eb397';

      if (/^\d+$/.test(orbit) && / AU$/.test(distanceText)) {
        const distance = Number.parseFloat(distanceText);
        const periodDays = parsePeriodDays(periodText);
        parent = {
          id,
          row,
          orbit:Number(orbit),
          name,
          kind,
          distance,
          periodDays,
          color,
          elements:orbitalElements(id, planets.length)
        };
        planets.push(parent);
      } else if (/^\d+\.\d+$/.test(orbit) && parent) {
        const periodDays = parsePeriodDays(periodText);
        const rng = randomFor(`${state.seed}:${id}:moon`);
        const moon = {
          id,
          row,
          orbit,
          name,
          kind,
          parentId:parent.id,
          periodDays,
          color: '#cbd2d8',
          orbitScale:0.025 + rng() * 0.035,
          elements: {
            eccentricity:rng() * 0.25,
            inclination:rng() * Math.PI * 0.45,
            ascendingNode:rng() * Math.PI * 2,
            periapsis:rng() * Math.PI * 2,
            phase:rng() * Math.PI * 2
          }
        };
        moons.push(moon);
      } else {
        parent = null;
      }
    }

    state.planets = planets;
    state.moons = moons;
    state.outermostAu = Math.max(1, ...planets.map(planet => planet.distance));
  }

  function parsePeriodDays(text) {
    const value = Number.parseFloat(text) || 1;
    if (/year/i.test(text)) return value * 365.25;
    return value;
  }

  function makeControls() {
    if ($('exo-spatial-controls')) return;

    const panel = document.createElement('section');
    panel.id = 'exo-spatial-controls';
    panel.className = 'exo-spatial-controls';
    panel.setAttribute('aria-label', 'Three-dimensional projection controls');
    panel.innerHTML = `
      <div class="exo-spatial-control-heading">
        <div>
          <span>Spatial projection</span>
          <strong>3D system geometry</strong>
        </div>
        <output id="exo-spatial-readout">Combined map</output>
      </div>
      <div class="exo-spatial-control-grid">
        <label>
          <span>Map mode</span>
          <select id="exo-spatial-mode">
            <option value="orbital">3D orbital projection</option>
            <option value="lensing">Gravitational lensing nodes</option>
            <option value="limits">Outer-system limits</option>
            <option value="combined" selected>Combined spatial map</option>
          </select>
        </label>
        <label>
          <span>Orbit architecture</span>
          <select id="exo-orbit-architecture">
            <option value="regular">Regular / aligned</option>
            <option value="mixed" selected>Mixed eccentricity</option>
            <option value="erratic">Erratic / strongly misaligned</option>
          </select>
        </label>
        <label>
          <span>Camera yaw</span>
          <input id="exo-camera-yaw" type="range" min="-180" max="180" value="-24">
        </label>
        <label>
          <span>Camera pitch</span>
          <input id="exo-camera-pitch" type="range" min="10" max="88" value="58">
        </label>
        <label>
          <span>Spatial zoom</span>
          <input id="exo-camera-zoom" type="range" min="60" max="150" value="100">
        </label>
      </div>
      <div class="exo-spatial-key">
        <span><i class="orbit"></i>Orbital plane</span>
        <span><i class="lensing"></i>Lensing node</span>
        <span><i class="falloff"></i>Dalton–Zirconf radius</span>
      </div>
    `;

    const orbitPanel = document.querySelector('.exo-orbital-panel');
    orbitPanel?.insertBefore(panel, stage);

    $('exo-spatial-mode')?.addEventListener('change', event => {
      state.mode = event.target.value;
      updateSpatialReadout();
    });
    $('exo-orbit-architecture')?.addEventListener('change', event => {
      state.architecture = event.target.value;
      rebuildSystem();
    });
    $('exo-camera-yaw')?.addEventListener('input', event => {
      state.yaw = Number(event.target.value);
    });
    $('exo-camera-pitch')?.addEventListener('input', event => {
      state.pitch = Number(event.target.value);
    });
    $('exo-camera-zoom')?.addEventListener('input', event => {
      state.zoom = Number(event.target.value) / 100;
    });
  }

  function makeCanvas() {
    if (state.canvas) return;
    const canvas = document.createElement('canvas');
    canvas.id = 'exo-orbit-canvas-3d';
    canvas.className = 'exo-orbit-canvas-3d';
    canvas.setAttribute('aria-label', 'Interactive three-dimensional orbital projection');
    canvas.tabIndex = 0;
    stage.append(canvas);
    state.canvas = canvas;
    state.context = canvas.getContext('2d');

    canvas.addEventListener('click', event => {
      const rect = canvas.getBoundingClientRect();
      const x = (event.clientX - rect.left) * canvas.width / rect.width;
      const y = (event.clientY - rect.top) * canvas.height / rect.height;
      const target = [...state.hitTargets]
        .sort((a, b) => a.distance - b.distance)
        .find(item => Math.hypot(item.x - x, item.y - y) <= item.radius + 6);
      if (target) {
        target.row?.querySelector('button')?.click();
        state.selectedId = target.id;
      }
    });

    const resize = () => {
      const ratio = Math.min(2, window.devicePixelRatio || 1);
      const width = Math.max(480, stage.clientWidth);
      const height = Math.max(420, stage.clientHeight);
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
    };
    new ResizeObserver(resize).observe(stage);
    resize();

    sourceSvg.classList.add('exo-source-svg-hidden');
  }

  function rebuildSystem() {
    const priorSelection = state.selectedId;
    state.seed = seedInput.value.trim() || $('exo-summary-seed')?.textContent.trim() || 'system';
    readStarMetrics();
    parseSystemRows();
    updateSpatialReadout();

    if (priorSelection && priorSelection !== 'star') {
      const row = tableBody.querySelector(
        `tr[data-object-id="${CSS.escape(priorSelection)}"]`
      );
      row?.querySelector('button')?.click();
      state.selectedId = priorSelection;
    }
  }

  function currentEpochDays() {
    return Number.parseFloat(($('exo-epoch')?.textContent || '').replace(/[^\d.-]/g, '')) || 0;
  }

  function rotatePoint(point) {
    const yaw = state.yaw * Math.PI / 180;
    const pitch = state.pitch * Math.PI / 180;

    const x1 = point.x * Math.cos(yaw) - point.z * Math.sin(yaw);
    const z1 = point.x * Math.sin(yaw) + point.z * Math.cos(yaw);
    const y2 = point.y * Math.cos(pitch) - z1 * Math.sin(pitch);
    const z2 = point.y * Math.sin(pitch) + z1 * Math.cos(pitch);
    return {x:x1, y:y2, z:z2};
  }

  function project(point, width, height, scale) {
    const rotated = rotatePoint(point);
    const perspective = 1 / Math.max(0.38, 1 + rotated.z * 0.00115);
    return {
      x:width / 2 + rotated.x * scale * perspective,
      y:height / 2 + rotated.y * scale * perspective,
      z:rotated.z,
      perspective
    };
  }

  function orbitPoint(body, anomaly, distanceOverride = null) {
    const elements = body.elements;
    const a = distanceOverride ?? body.distance;
    const e = Math.min(0.9, elements.eccentricity || 0);
    const radius = a * (1 - e * e) / Math.max(0.12, 1 + e * Math.cos(anomaly));
    let x = radius * Math.cos(anomaly);
    let y = radius * Math.sin(anomaly);
    let z = (elements.verticalWarp || 0) * radius * Math.sin(anomaly * 2);

    const periapsis = elements.periapsis || 0;
    const xp = x * Math.cos(periapsis) - y * Math.sin(periapsis);
    const yp = x * Math.sin(periapsis) + y * Math.cos(periapsis);
    x = xp;
    y = yp;

    const inclination = elements.inclination || 0;
    const yi = y * Math.cos(inclination) - z * Math.sin(inclination);
    const zi = y * Math.sin(inclination) + z * Math.cos(inclination);
    y = yi;
    z = zi;

    const node = elements.ascendingNode || 0;
    const xn = x * Math.cos(node) - y * Math.sin(node);
    const yn = x * Math.sin(node) + y * Math.cos(node);
    return {x:xn, y:yn, z};
  }

  function scaleForSystem(width, height) {
    const modelRadius = state.outermostAu * 1.18;
    return Math.min(width, height) * 0.38 * state.zoom / Math.max(0.1, modelRadius);
  }

  function drawPath(context, points, stroke, width = 1, dash = []) {
    if (!points.length) return;
    context.beginPath();
    context.setLineDash(dash);
    context.moveTo(points[0].x, points[0].y);
    for (let index = 1; index < points.length; index += 1) {
      context.lineTo(points[index].x, points[index].y);
    }
    context.closePath();
    context.strokeStyle = stroke;
    context.lineWidth = width;
    context.stroke();
    context.setLineDash([]);
  }

  function drawOrbitalGeometry(context, width, height, scale, days) {
    const renderBodies = [];

    for (const planet of state.planets) {
      const orbit = [];
      for (let step = 0; step < 128; step += 1) {
        orbit.push(project(
          orbitPoint(planet, step / 128 * Math.PI * 2),
          width,
          height,
          scale
        ));
      }
      const selected = planet.id === state.selectedId;
      drawPath(
        context,
        orbit,
        selected ? 'rgba(255,215,125,.78)' : 'rgba(217,168,79,.28)',
        selected ? 2.2 : 1.1
      );

      const anomaly =
        planet.elements.phase +
        days / Math.max(0.05, planet.periodDays) * Math.PI * 2;
      const modelPoint = orbitPoint(planet, anomaly);
      const projected = project(modelPoint, width, height, scale);
      renderBodies.push({
        ...projected,
        modelPoint,
        id:planet.id,
        row:planet.row,
        color:planet.color || '#8eb397',
        name:planet.name,
        size:Math.max(4, 7 * projected.perspective),
        kind:'planet'
      });

      for (const moon of state.moons.filter(item => item.parentId === planet.id)) {
        const moonAnomaly =
          moon.elements.phase +
          days / Math.max(0.02, moon.periodDays) * Math.PI * 2;
        const moonRelative = orbitPoint(moon, moonAnomaly, moon.orbitScale * state.outermostAu);
        const moonPoint = {
          x:modelPoint.x + moonRelative.x,
          y:modelPoint.y + moonRelative.y,
          z:modelPoint.z + moonRelative.z
        };
        const moonProjected = project(moonPoint, width, height, scale);
        renderBodies.push({
          ...moonProjected,
          modelPoint:moonPoint,
          id:moon.id,
          row:moon.row,
          color:moon.color,
          name:moon.name,
          size:Math.max(2, 3.2 * moonProjected.perspective),
          kind:'moon'
        });
      }
    }

    renderBodies.sort((a, b) => a.z - b.z);
    state.hitTargets = [];

    for (const body of renderBodies) {
      context.beginPath();
      context.arc(body.x, body.y, body.size, 0, Math.PI * 2);
      context.fillStyle = body.color;
      context.shadowColor = body.color;
      context.shadowBlur = body.kind === 'planet' ? 10 : 4;
      context.fill();
      context.shadowBlur = 0;

      if (body.id === state.selectedId) {
        context.beginPath();
        context.arc(body.x, body.y, body.size + 5, 0, Math.PI * 2);
        context.strokeStyle = '#f0bd58';
        context.lineWidth = 2;
        context.stroke();
      }

      if (body.kind === 'planet') {
        context.fillStyle = 'rgba(244,239,229,.88)';
        context.font = `${Math.max(10, 12 * body.perspective)}px system-ui`;
        context.fillText(body.name, body.x + body.size + 5, body.y - 4);
      }

      state.hitTargets.push({
        id:body.id,
        row:body.row,
        x:body.x,
        y:body.y,
        radius:body.size,
        distance:body.z
      });
    }

    const star = project({x:0,y:0,z:0}, width, height, scale);
    const gradient = context.createRadialGradient(
      star.x, star.y, 1,
      star.x, star.y, 35
    );
    gradient.addColorStop(0, '#fff8d9');
    gradient.addColorStop(0.28, '#ffd36b');
    gradient.addColorStop(1, 'rgba(217,168,79,0)');
    context.fillStyle = gradient;
    context.beginPath();
    context.arc(star.x, star.y, 35, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = '#ffd36b';
    context.beginPath();
    context.arc(star.x, star.y, 10, 0, Math.PI * 2);
    context.fill();
  }

  function daltonZirconfRadiusAu() {
    const massFactor = 10 + Math.sqrt(Math.max(0.08, state.starMass)) * 6;
    const orbitBound = state.outermostAu * massFactor;
    if (Number.isFinite(state.nearestNeighborAu) && state.nearestNeighborAu > 0) {
      return Math.min(orbitBound, state.nearestNeighborAu * 0.46);
    }
    return orbitBound;
  }

  function drawLimitSphere(context, width, height, scale) {
    const visualRadius = state.outermostAu * 1.12;
    const rings = [
      {inclination:0, node:0},
      {inclination:Math.PI / 2, node:0},
      {inclination:Math.PI / 2, node:Math.PI / 2}
    ];

    for (const ring of rings) {
      const body = {
        elements:{
          eccentricity:0,
          inclination:ring.inclination,
          ascendingNode:ring.node,
          periapsis:0
        }
      };
      const points = [];
      for (let step = 0; step < 96; step += 1) {
        points.push(project(
          orbitPoint(body, step / 96 * Math.PI * 2, visualRadius),
          width,
          height,
          scale
        ));
      }
      drawPath(context, points, 'rgba(87,184,214,.42)', 1.3, [7, 7]);
    }

    const radius = daltonZirconfRadiusAu();
    context.fillStyle = 'rgba(133,208,229,.92)';
    context.font = '12px system-ui';
    context.fillText(
      `Dalton–Zirconf falloff radius: ${formatAu(radius)} (compressed shell)`,
      18,
      height - 22
    );
  }

  function drawLensingNodes(context, width, height, scale) {
    const radius = state.outermostAu * 1.17;
    const nodeCount = 24;
    const rng = randomFor(`${state.seed}:lensing`);
    const nodeBody = {
      elements:{
        eccentricity:0.08,
        inclination:Math.PI * 0.42,
        ascendingNode:Math.PI * 0.16,
        periapsis:0
      }
    };

    for (let index = 0; index < nodeCount; index += 1) {
      const anomaly = index / nodeCount * Math.PI * 2;
      const point = project(
        orbitPoint(nodeBody, anomaly, radius),
        width,
        height,
        scale
      );
      const strength =
        0.38 +
        0.62 * Math.abs(Math.cos(anomaly + state.starMass));
      const nodeRadius = 2.2 + strength * 3.8;
      context.beginPath();
      context.arc(point.x, point.y, nodeRadius, 0, Math.PI * 2);
      context.fillStyle = `rgba(184,133,255,${0.35 + strength * 0.55})`;
      context.shadowColor = '#b885ff';
      context.shadowBlur = 10 + rng() * 9;
      context.fill();
      context.shadowBlur = 0;

      if (index % 4 === 0) {
        context.strokeStyle = 'rgba(184,133,255,.28)';
        context.lineWidth = 1;
        context.beginPath();
        context.moveTo(width / 2, height / 2);
        context.lineTo(point.x, point.y);
        context.stroke();
      }
    }

    context.fillStyle = 'rgba(207,179,255,.92)';
    context.font = '12px system-ui';
    context.fillText(
      `${nodeCount} projected gravitational-lensing alignment nodes`,
      18,
      24
    );
  }

  function drawHabitableShell(context, width, height, scale) {
    const body = {
      elements:{
        eccentricity:0,
        inclination:0,
        ascendingNode:0,
        periapsis:0
      }
    };
    for (const [radius, stroke] of [
      [state.hzInner, 'rgba(82,194,123,.24)'],
      [state.hzOuter, 'rgba(82,194,123,.42)']
    ]) {
      const points = [];
      for (let step = 0; step < 96; step += 1) {
        points.push(project(
          orbitPoint(body, step / 96 * Math.PI * 2, radius),
          width,
          height,
          scale
        ));
      }
      drawPath(context, points, stroke, 1.2, [4, 5]);
    }
  }

  function renderSpatialFrame() {
    const canvas = state.canvas;
    const context = state.context;
    if (!canvas || !context) {
      requestAnimationFrame(renderSpatialFrame);
      return;
    }

    const width = canvas.width;
    const height = canvas.height;
    context.clearRect(0, 0, width, height);
    context.fillStyle = '#020202';
    context.fillRect(0, 0, width, height);

    drawStars(context, width, height);

    const scale = scaleForSystem(width, height);
    const days = currentEpochDays();

    drawHabitableShell(context, width, height, scale);

    if (state.mode === 'limits' || state.mode === 'combined') {
      drawLimitSphere(context, width, height, scale);
    }
    if (state.mode === 'lensing' || state.mode === 'combined') {
      drawLensingNodes(context, width, height, scale);
    }
    drawOrbitalGeometry(context, width, height, scale, days);

    requestAnimationFrame(renderSpatialFrame);
  }

  function drawStars(context, width, height) {
    const rng = randomFor(`${state.seed}:background`);
    context.fillStyle = 'rgba(255,255,255,.56)';
    for (let index = 0; index < 120; index += 1) {
      const x = rng() * width;
      const y = rng() * height;
      const radius = 0.35 + rng() * 1.2;
      context.globalAlpha = 0.25 + rng() * 0.65;
      context.beginPath();
      context.arc(x, y, radius, 0, Math.PI * 2);
      context.fill();
    }
    context.globalAlpha = 1;
  }

  function formatAu(value) {
    if (!Number.isFinite(value)) return 'unknown';
    if (value >= 1000000) return `${(value / 1000000).toFixed(2)}M AU`;
    if (value >= 1000) return `${Math.round(value).toLocaleString()} AU`;
    return `${value.toFixed(2)} AU`;
  }

  function updateSpatialReadout() {
    const labels = {
      orbital:'3D orbital projection',
      lensing:'Gravitational lensing radius map',
      limits:'Outer-system limits map',
      combined:'Combined spatial map'
    };
    const output = $('exo-spatial-readout');
    if (output) output.textContent = labels[state.mode] || labels.combined;
  }

  function selectedFromDom() {
    const selectedRow = tableBody.querySelector('tr[aria-selected="true"]');
    state.selectedId = selectedRow?.dataset.objectId || 'star';
  }

  function observeSystem() {
    const observer = new MutationObserver(() => {
      queueMicrotask(() => {
        selectedFromDom();
        rebuildSystem();
      });
    });
    observer.observe(tableBody, {childList:true, subtree:true});
    tableBody.addEventListener('click', () => {
      queueMicrotask(selectedFromDom);
    });
    generateButton?.addEventListener('click', () => {
      requestAnimationFrame(() => requestAnimationFrame(rebuildSystem));
    });
  }

  function createClusterMap() {
    if (!clusterGrid || $('exo-cluster-spatial-map')) return;
    const section = clusterGrid.closest('.exo-cluster-section');
    const status = $('exo-cluster-status');
    const wrapper = document.createElement('div');
    wrapper.className = 'exo-cluster-map-shell';
    wrapper.innerHTML = `
      <div class="exo-cluster-map-heading">
        <div>
          <span>Relative stellar proximity</span>
          <strong>Nearest-neighbor AU map</strong>
        </div>
        <output id="exo-cluster-map-readout">Awaiting cluster data</output>
      </div>
      <svg id="exo-cluster-spatial-map" viewBox="0 0 1000 520" role="img" aria-label="Stellar cluster nearest-neighbor distance map"></svg>
    `;
    section?.insertBefore(wrapper, status || clusterGrid);
    state.clusterMap = $('exo-cluster-spatial-map');
  }

  function clusterEntries() {
    return [...clusterGrid.querySelectorAll('.exo-cluster-card')].map((card, index) => {
      const seed = card.querySelector('.exo-cluster-seed')?.textContent.trim() || `system-${index}`;
      const name = card.querySelector('h3')?.textContent.trim() || `System ${index + 1}`;
      const star = card.querySelector('.exo-cluster-primary')?.textContent.trim() || '';
      const populated = card.classList.contains('is-populated');
      return {
        card,
        seed,
        name,
        star,
        populated,
        index,
        open:card.querySelector('.exo-cluster-open')
      };
    });
  }

  function clusterPosition(entry, count) {
    const rng = randomFor(`${$('exo-cluster-seed')?.value || 'cluster'}:${entry.seed}:position`);
    const angle = (entry.index / Math.max(1, count)) * Math.PI * 2 + (rng() - 0.5) * 0.7;
    const radialAu = 50000 + rng() * 360000;
    const verticalAu = (rng() - 0.5) * 180000;
    return {
      x:Math.cos(angle) * radialAu,
      y:Math.sin(angle) * radialAu,
      z:verticalAu
    };
  }

  function renderClusterMap() {
    const svg = state.clusterMap;
    if (!svg) return;
    const entries = clusterEntries();
    svg.replaceChildren();
    if (!entries.length) return;

    entries.forEach(entry => {
      entry.position = clusterPosition(entry, entries.length);
    });

    let maximumRadius = 1;
    for (const entry of entries) {
      maximumRadius = Math.max(
        maximumRadius,
        Math.hypot(entry.position.x, entry.position.y)
      );
    }

    const projected = entries.map(entry => ({
      ...entry,
      px:500 + entry.position.x / maximumRadius * 410,
      py:260 + entry.position.y / maximumRadius * 205 -
        entry.position.z / maximumRadius * 80
    }));

    const uniqueLines = new Map();
    let selectedDistance = null;

    for (const entry of projected) {
      let nearest = null;
      for (const candidate of projected) {
        if (candidate === entry) continue;
        const distance = Math.hypot(
          entry.position.x - candidate.position.x,
          entry.position.y - candidate.position.y,
          entry.position.z - candidate.position.z
        );
        if (!nearest || distance < nearest.distance) {
          nearest = {candidate, distance};
        }
      }
      entry.nearestAu = nearest?.distance || null;
      if (entry.seed === seedInput.value.trim()) {
        selectedDistance = entry.nearestAu;
      }
      if (nearest) {
        const key = [entry.index, nearest.candidate.index].sort((a,b) => a-b).join(':');
        if (!uniqueLines.has(key)) {
          uniqueLines.set(key, {from:entry, to:nearest.candidate, distance:nearest.distance});
        }
      }
    }

    state.nearestNeighborAu = selectedDistance;

    for (const lineData of uniqueLines.values()) {
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', lineData.from.px);
      line.setAttribute('y1', lineData.from.py);
      line.setAttribute('x2', lineData.to.px);
      line.setAttribute('y2', lineData.to.py);
      line.setAttribute('class', 'exo-neighbor-line');
      svg.append(line);

      const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      label.setAttribute('x', (lineData.from.px + lineData.to.px) / 2);
      label.setAttribute('y', (lineData.from.py + lineData.to.py) / 2 - 6);
      label.setAttribute('class', 'exo-neighbor-label');
      label.textContent = formatAu(lineData.distance);
      svg.append(label);
    }

    for (const entry of projected) {
      const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      group.setAttribute('class', `exo-cluster-map-node${entry.populated ? ' is-populated' : ''}`);
      group.setAttribute('tabindex', '0');
      group.setAttribute('role', 'button');
      group.setAttribute('aria-label', `Open ${entry.name}; nearest neighbor ${formatAu(entry.nearestAu)}`);

      const halo = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      halo.setAttribute('cx', entry.px);
      halo.setAttribute('cy', entry.py);
      halo.setAttribute('r', entry.seed === seedInput.value.trim() ? 16 : 11);
      halo.setAttribute('class', 'exo-cluster-map-halo');

      const core = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      core.setAttribute('cx', entry.px);
      core.setAttribute('cy', entry.py);
      core.setAttribute('r', entry.populated ? 6 : 4.5);
      core.setAttribute('class', 'exo-cluster-map-core');

      const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      label.setAttribute('x', entry.px + 10);
      label.setAttribute('y', entry.py - 10);
      label.setAttribute('class', 'exo-cluster-map-system-label');
      label.textContent = entry.name;

      const activate = () => entry.open?.click();
      group.addEventListener('click', activate);
      group.addEventListener('keydown', event => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          activate();
        }
      });
      group.append(halo, core, label);
      svg.append(group);
    }

    const readout = $('exo-cluster-map-readout');
    if (readout) {
      readout.textContent =
        selectedDistance ?
          `Selected system nearest neighbor: ${formatAu(selectedDistance)}` :
          `${entries.length} systems positioned`;
    }
  }

  function observeCluster() {
    if (!clusterGrid) return;
    const observer = new MutationObserver(() => {
      requestAnimationFrame(renderClusterMap);
    });
    observer.observe(clusterGrid, {childList:true, subtree:true});
    seedInput.addEventListener('change', renderClusterMap);
    generateButton?.addEventListener('click', () => {
      requestAnimationFrame(renderClusterMap);
    });
    renderClusterMap();
  }

  makeControls();
  makeCanvas();
  createClusterMap();
  observeSystem();
  observeCluster();
  rebuildSystem();
  renderSpatialFrame();
})();