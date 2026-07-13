(() => {
  'use strict';

  const $ = id => document.getElementById(id);
  const SVG_NS = 'http://www.w3.org/2000/svg';

  function waitForSpatialLayer(attempt = 0) {
    const stage = document.querySelector('.exo-orbit-stage');
    const sourceSvg = $('exo-orbit-svg');
    const oldCanvas = $('exo-orbit-canvas-3d');
    const oldControls = $('exo-spatial-controls');
    const tableBody = $('exo-orbital-table-body');
    const seedInput = $('exo-seed-input');

    if (!stage || !sourceSvg || !oldCanvas || !oldControls || !tableBody || !seedInput) {
      if (attempt < 120) requestAnimationFrame(() => waitForSpatialLayer(attempt + 1));
      return;
    }

    initialize({stage, sourceSvg, oldCanvas, oldControls, tableBody, seedInput});
  }

  function initialize(elements) {
    if ($('exo-exclusive-view-controls')) return;

    const {stage, sourceSvg, oldCanvas, oldControls, tableBody, seedInput} = elements;
    const generateButton = $('exo-generate-system');

    const state = {
      view:'flat',
      overlays:{habitable:true, lensing:false, limits:false},
      yaw:-24,
      pitch:58,
      zoom:1,
      seed:'system',
      starMass:1,
      hzInner:.8,
      hzOuter:1.6,
      outermostAu:1,
      nearestNeighborAu:null,
      planets:[],
      moons:[],
      selectedId:'star',
      hitTargets:[],
      canvas:null,
      context:null,
      flatOverlay:null
    };

    oldControls.hidden = true;
    oldControls.setAttribute('aria-hidden', 'true');
    oldCanvas.hidden = true;
    oldCanvas.setAttribute('aria-hidden', 'true');
    oldCanvas.style.pointerEvents = 'none';
    oldCanvas.width = 1;
    oldCanvas.height = 1;

    const oldMode = $('exo-spatial-mode');
    if (oldMode) {
      oldMode.value = 'orbital';
      oldMode.dispatchEvent(new Event('change', {bubbles:true}));
    }

    injectControls();
    makeCanvas();
    makeFlatOverlay();
    bindObservers();
    rebuildSystem();
    applyView();
    renderFrame();

    function injectControls() {
      const panel = document.createElement('section');
      panel.id = 'exo-exclusive-view-controls';
      panel.className = 'exo-exclusive-view-controls';
      panel.setAttribute('aria-label', 'Projection view and overlay controls');
      panel.innerHTML = `
        <div class="exo-view-control-heading">
          <div>
            <span>Projection display</span>
            <strong>Choose one viewing plane</strong>
          </div>
          <output id="exo-exclusive-view-readout">Flat orbital projection</output>
        </div>
        <div class="exo-view-switch" role="group" aria-label="Projection view">
          <button id="exo-view-flat" class="bli-action is-active" type="button" aria-pressed="true">Flat Projection</button>
          <button id="exo-view-3d" class="bli-action" type="button" aria-pressed="false">3D Projection</button>
        </div>
        <fieldset class="exo-overlay-controls">
          <legend>Display overlays</legend>
          <label><input id="exo-overlay-habitable" type="checkbox" checked> Habitable zone</label>
          <label><input id="exo-overlay-lensing" type="checkbox"> Gravitational lensing nodes</label>
          <label><input id="exo-overlay-limits" type="checkbox"> Dalton–Zirconf outer limit</label>
        </fieldset>
        <div id="exo-camera-controls" class="exo-camera-controls" hidden>
          <label><span>Camera yaw</span><input id="exo-exclusive-yaw" type="range" min="-180" max="180" value="-24"></label>
          <label><span>Camera pitch</span><input id="exo-exclusive-pitch" type="range" min="10" max="88" value="58"></label>
          <label><span>Spatial zoom</span><input id="exo-exclusive-zoom" type="range" min="60" max="150" value="100"></label>
        </div>
        <p class="exo-orbit-architecture-note">Orbital alignment is generated per body. Regular, eccentric, inclined, and erratic orbits can coexist in the same system and are not changed by display controls.</p>
      `;

      const orbitPanel = document.querySelector('.exo-orbital-panel');
      orbitPanel?.insertBefore(panel, stage);

      $('exo-view-flat')?.addEventListener('click', () => setView('flat'));
      $('exo-view-3d')?.addEventListener('click', () => setView('3d'));
      $('exo-overlay-habitable')?.addEventListener('change', event => {
        state.overlays.habitable = event.target.checked;
        applyOverlayVisibility();
      });
      $('exo-overlay-lensing')?.addEventListener('change', event => {
        state.overlays.lensing = event.target.checked;
        drawFlatOverlays();
      });
      $('exo-overlay-limits')?.addEventListener('change', event => {
        state.overlays.limits = event.target.checked;
        drawFlatOverlays();
      });
      $('exo-exclusive-yaw')?.addEventListener('input', event => {
        state.yaw = Number(event.target.value);
      });
      $('exo-exclusive-pitch')?.addEventListener('input', event => {
        state.pitch = Number(event.target.value);
      });
      $('exo-exclusive-zoom')?.addEventListener('input', event => {
        state.zoom = Number(event.target.value) / 100;
      });
    }

    function setView(view) {
      state.view = view === '3d' ? '3d' : 'flat';
      applyView();
    }

    function applyView() {
      const flat = state.view === 'flat';
      stage.classList.toggle('exo-exclusive-flat', flat);
      stage.classList.toggle('exo-exclusive-3d', !flat);
      sourceSvg.setAttribute('aria-hidden', String(!flat));
      state.canvas.setAttribute('aria-hidden', String(flat));
      state.flatOverlay.setAttribute('aria-hidden', String(!flat));

      const flatButton = $('exo-view-flat');
      const threeButton = $('exo-view-3d');
      flatButton?.classList.toggle('is-active', flat);
      threeButton?.classList.toggle('is-active', !flat);
      flatButton?.setAttribute('aria-pressed', String(flat));
      threeButton?.setAttribute('aria-pressed', String(!flat));
      const cameras = $('exo-camera-controls');
      if (cameras) cameras.hidden = flat;
      const readout = $('exo-exclusive-view-readout');
      if (readout) readout.textContent = flat ? 'Flat orbital projection' : 'Three-dimensional orbital projection';
      applyOverlayVisibility();
    }

    function applyOverlayVisibility() {
      stage.classList.toggle('exo-hide-habitable-overlay', !state.overlays.habitable);
      drawFlatOverlays();
    }

    function makeCanvas() {
      const canvas = document.createElement('canvas');
      canvas.id = 'exo-exclusive-canvas-3d';
      canvas.className = 'exo-exclusive-canvas-3d';
      canvas.setAttribute('aria-label', 'Selectable three-dimensional orbital projection');
      canvas.tabIndex = 0;
      stage.append(canvas);
      state.canvas = canvas;
      state.context = canvas.getContext('2d');

      canvas.addEventListener('click', event => {
        if (state.view !== '3d') return;
        const rect = canvas.getBoundingClientRect();
        const x = (event.clientX - rect.left) * canvas.width / rect.width;
        const y = (event.clientY - rect.top) * canvas.height / rect.height;
        const target = [...state.hitTargets]
          .sort((a, b) => a.depth - b.depth)
          .find(item => Math.hypot(item.x - x, item.y - y) <= item.radius + 7);
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
    }

    function makeFlatOverlay() {
      const overlay = document.createElementNS(SVG_NS, 'svg');
      overlay.id = 'exo-flat-spatial-overlays';
      overlay.setAttribute('viewBox', '0 0 1000 1000');
      overlay.setAttribute('aria-label', 'Flat-projection spatial overlays');
      overlay.setAttribute('pointer-events', 'none');
      stage.append(overlay);
      state.flatOverlay = overlay;
    }

    function bindObservers() {
      const tableObserver = new MutationObserver(() => {
        requestAnimationFrame(rebuildSystem);
      });
      tableObserver.observe(tableBody, {childList:true, subtree:true});

      tableBody.addEventListener('click', () => queueMicrotask(readSelection));
      generateButton?.addEventListener('click', () => {
        requestAnimationFrame(() => requestAnimationFrame(rebuildSystem));
      });

      const clusterMap = $('exo-cluster-spatial-map');
      if (clusterMap) {
        const clusterObserver = new MutationObserver(readNearestNeighborFromMap);
        clusterObserver.observe(clusterMap, {childList:true, subtree:true});
      }
    }

    function readSelection() {
      const selected = tableBody.querySelector('tr[aria-selected="true"]');
      state.selectedId = selected?.dataset.objectId || 'star';
    }

    function rebuildSystem() {
      state.seed = seedInput.value.trim() || $('exo-summary-seed')?.textContent.trim() || 'system';
      readStarMetricsPreservingSelection();
      parseSystemRows();
      readSelection();
      readNearestNeighborFromMap();
      drawFlatOverlays();
    }

    function readStarMetricsPreservingSelection() {
      const selected = tableBody.querySelector('tr[aria-selected="true"]');
      const selectedId = selected?.dataset.objectId || null;
      document.querySelector('.exo-star-target')?.dispatchEvent(new MouseEvent('click', {bubbles:true}));
      const values = readInspectorData();
      state.starMass = Number.parseFloat(values.Mass || '') || 1;
      const hz = (values['Habitable zone'] || '').match(/[\d.]+/g)?.map(Number);
      if (hz?.length >= 2) {
        state.hzInner = hz[0];
        state.hzOuter = hz[1];
      }
      if (selectedId) {
        tableBody.querySelector(`tr[data-object-id="${escapeSelector(selectedId)}"] button`)?.click();
      }
    }

    function escapeSelector(value) {
      return globalThis.CSS?.escape ? CSS.escape(value) : String(value).replace(/["\\]/g, '\\$&');
    }

    function readInspectorData() {
      const data = $('exo-inspector-data');
      const values = {};
      if (!data) return values;
      const children = [...data.children];
      for (let index = 0; index < children.length - 1; index += 2) {
        values[children[index].textContent.trim()] = children[index + 1].textContent.trim();
      }
      return values;
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

        if (/^\d+$/.test(orbit) && / AU$/.test(distanceText)) {
          parent = {
            id,
            row,
            orbit:Number(orbit),
            name,
            kind,
            distance:Number.parseFloat(distanceText),
            periodDays:parsePeriodDays(periodText),
            color:bodyColor(kind),
            elements:orbitalElements(id, false)
          };
          planets.push(parent);
        } else if (/^\d+\.\d+$/.test(orbit) && parent) {
          moons.push({
            id,
            row,
            name,
            kind,
            parentId:parent.id,
            periodDays:parsePeriodDays(periodText),
            color:'#cbd2d8',
            orbitScale:0.025 + randomFor(`${state.seed}:${id}:scale`)() * 0.035,
            elements:orbitalElements(id, true)
          });
        } else {
          parent = null;
        }
      }

      state.planets = planets;
      state.moons = moons;
      state.outermostAu = Math.max(1, ...planets.map(planet => planet.distance));
    }

    function bodyColor(kind) {
      return ({
        Scorched:'#d36a3f', Volcanic:'#c64d2b', Barren:'#9b8a72',
        Temperate:'#5ea77b', Ocean:'#4d8fd1', 'Super-Earth':'#8eb397',
        'Mini-Neptune':'#72a5b8', 'Gas giant':'#d6a86c',
        'Ice giant':'#79a9d5', Frozen:'#b8d3de', Dwarf:'#a89d90'
      })[kind] || '#8eb397';
    }

    function orbitalElements(id, moon) {
      const rng = randomFor(`${state.seed}:${id}:orbital-elements`);
      const roll = rng();
      let profile;
      if (roll < (moon ? .72 : .62)) {
        profile = {name:'regular', eccentricity:[.004,.12], inclination:[0,8], warp:.012};
      } else if (roll < (moon ? .94 : .9)) {
        profile = {name:'irregular', eccentricity:[.1,.48], inclination:[6,38], warp:.055};
      } else {
        profile = {name:'erratic', eccentricity:[.34,.82], inclination:[28,86], warp:.18};
      }
      return {
        profile:profile.name,
        eccentricity:range(rng, profile.eccentricity[0], profile.eccentricity[1]),
        inclination:range(rng, profile.inclination[0], profile.inclination[1]) * Math.PI / 180,
        ascendingNode:rng() * Math.PI * 2,
        periapsis:rng() * Math.PI * 2,
        phase:rng() * Math.PI * 2,
        verticalWarp:(rng() - .5) * profile.warp
      };
    }

    function parsePeriodDays(text) {
      const value = Number.parseFloat(text) || 1;
      return /year/i.test(text) ? value * 365.25 : value;
    }

    function readNearestNeighborFromMap() {
      const text = $('exo-cluster-map-readout')?.textContent || '';
      const match = text.match(/([\d,.]+)(M)?\s*AU/i);
      if (!match) return;
      const value = Number(match[1].replace(/,/g, ''));
      state.nearestNeighborAu = match[2] ? value * 1000000 : value;
    }

    function drawFlatOverlays() {
      const overlay = state.flatOverlay;
      if (!overlay) return;
      overlay.replaceChildren();
      if (state.overlays.limits) drawFlatLimit(overlay);
      if (state.overlays.lensing) drawFlatLensingNodes(overlay);
    }

    function drawFlatLimit(overlay) {
      const circle = document.createElementNS(SVG_NS, 'circle');
      circle.setAttribute('cx', '500');
      circle.setAttribute('cy', '500');
      circle.setAttribute('r', '455');
      circle.setAttribute('class', 'exo-flat-limit-circle');
      overlay.append(circle);

      const label = document.createElementNS(SVG_NS, 'text');
      label.setAttribute('x', '500');
      label.setAttribute('y', '965');
      label.setAttribute('text-anchor', 'middle');
      label.setAttribute('class', 'exo-flat-overlay-label exo-flat-limit-label');
      label.textContent = `Dalton–Zirconf radius ${formatAu(daltonZirconfRadiusAu())} · compressed boundary`;
      overlay.append(label);
    }

    function drawFlatLensingNodes(overlay) {
      for (const node of sphericalLensingNodes()) {
        const x = 500 + node.x * 410;
        const y = 500 + node.y * 410;
        const circle = document.createElementNS(SVG_NS, 'circle');
        circle.setAttribute('cx', x.toFixed(2));
        circle.setAttribute('cy', y.toFixed(2));
        circle.setAttribute('r', (2.4 + node.strength * 4).toFixed(2));
        circle.setAttribute('class', 'exo-flat-lensing-node');
        circle.setAttribute('opacity', (.35 + node.strength * .6).toFixed(2));
        overlay.append(circle);
      }

      const label = document.createElementNS(SVG_NS, 'text');
      label.setAttribute('x', '26');
      label.setAttribute('y', '42');
      label.setAttribute('class', 'exo-flat-overlay-label');
      label.textContent = 'Randomized spherical gravitational-lensing nodes';
      overlay.append(label);
    }

    function sphericalLensingNodes() {
      const rng = randomFor(`${state.seed}:spherical-lensing-shell`);
      const count = 30;
      const nodes = [];
      for (let index = 0; index < count; index += 1) {
        const u = rng() * 2 - 1;
        const azimuth = rng() * Math.PI * 2;
        const radialJitter = .92 + rng() * .14;
        const transverse = Math.sqrt(Math.max(0, 1 - u * u));
        nodes.push({
          x:Math.cos(azimuth) * transverse * radialJitter,
          y:Math.sin(azimuth) * transverse * radialJitter,
          z:u * radialJitter,
          strength:.25 + rng() * .75
        });
      }
      return nodes;
    }

    function renderFrame() {
      const canvas = state.canvas;
      const context = state.context;
      if (canvas && context && state.view === '3d') {
        const width = canvas.width;
        const height = canvas.height;
        context.clearRect(0, 0, width, height);
        context.fillStyle = '#020202';
        context.fillRect(0, 0, width, height);
        drawStarfield(context, width, height);
        const scale = systemScale(width, height);
        const epoch = currentEpochDays();
        if (state.overlays.habitable) drawHabitableZone3d(context, width, height, scale);
        if (state.overlays.limits) drawLimitSphere3d(context, width, height, scale);
        if (state.overlays.lensing) drawLensingNodes3d(context, width, height, scale);
        drawSystem3d(context, width, height, scale, epoch);
      }
      requestAnimationFrame(renderFrame);
    }

    function drawSystem3d(context, width, height, scale, days) {
      const bodies = [];
      for (const planet of state.planets) {
        const orbit = [];
        for (let step = 0; step < 128; step += 1) {
          orbit.push(project(orbitPoint(planet, step / 128 * Math.PI * 2), width, height, scale));
        }
        drawPath(
          context,
          orbit,
          planet.elements.profile === 'erratic' ? 'rgba(232,130,102,.42)' :
            planet.elements.profile === 'irregular' ? 'rgba(218,178,99,.36)' :
              'rgba(217,168,79,.27)',
          planet.id === state.selectedId ? 2.2 : 1.1,
          planet.elements.profile === 'erratic' ? [5,4] : []
        );

        const anomaly = planet.elements.phase + days / Math.max(.05, planet.periodDays) * Math.PI * 2;
        const model = orbitPoint(planet, anomaly);
        const projected = project(model, width, height, scale);
        bodies.push({...projected, model, id:planet.id, row:planet.row, name:planet.name, color:planet.color, size:Math.max(4,7 * projected.perspective), kind:'planet'});

        for (const moon of state.moons.filter(item => item.parentId === planet.id)) {
          const moonAnomaly = moon.elements.phase + days / Math.max(.02, moon.periodDays) * Math.PI * 2;
          const relative = orbitPoint(moon, moonAnomaly, moon.orbitScale * state.outermostAu);
          const modelMoon = {x:model.x + relative.x, y:model.y + relative.y, z:model.z + relative.z};
          const moonProjected = project(modelMoon, width, height, scale);
          bodies.push({...moonProjected, model:modelMoon, id:moon.id, row:moon.row, name:moon.name, color:moon.color, size:Math.max(2,3.2 * moonProjected.perspective), kind:'moon'});
        }
      }

      bodies.sort((a,b) => a.z - b.z);
      state.hitTargets = [];
      for (const body of bodies) {
        context.beginPath();
        context.arc(body.x, body.y, body.size, 0, Math.PI * 2);
        context.fillStyle = body.color;
        context.shadowColor = body.color;
        context.shadowBlur = body.kind === 'planet' ? 9 : 4;
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
        state.hitTargets.push({id:body.id,row:body.row,x:body.x,y:body.y,radius:body.size,depth:body.z});
      }

      const star = project({x:0,y:0,z:0}, width, height, scale);
      const gradient = context.createRadialGradient(star.x, star.y, 1, star.x, star.y, 36);
      gradient.addColorStop(0, '#fff8d9');
      gradient.addColorStop(.28, '#ffd36b');
      gradient.addColorStop(1, 'rgba(217,168,79,0)');
      context.fillStyle = gradient;
      context.beginPath();
      context.arc(star.x, star.y, 36, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = '#ffd36b';
      context.beginPath();
      context.arc(star.x, star.y, 10, 0, Math.PI * 2);
      context.fill();
    }

    function drawHabitableZone3d(context, width, height, scale) {
      for (const [radius, stroke] of [[state.hzInner,'rgba(82,194,123,.25)'],[state.hzOuter,'rgba(82,194,123,.5)']]) {
        drawCircularPlane(context, width, height, scale, radius, stroke, [4,5]);
      }
    }

    function drawLimitSphere3d(context, width, height, scale) {
      const visualRadius = state.outermostAu * 1.12;
      for (const [inclination,node] of [[0,0],[Math.PI/2,0],[Math.PI/2,Math.PI/2]]) {
        const points = [];
        const shell = {elements:{eccentricity:0,inclination,ascendingNode:node,periapsis:0,verticalWarp:0}};
        for (let step=0; step<96; step+=1) points.push(project(orbitPoint(shell, step/96*Math.PI*2, visualRadius), width, height, scale));
        drawPath(context, points, 'rgba(87,184,214,.48)', 1.3, [7,7]);
      }
      context.fillStyle = 'rgba(133,208,229,.92)';
      context.font = '12px system-ui';
      context.fillText(`Dalton–Zirconf falloff radius: ${formatAu(daltonZirconfRadiusAu())} · compressed shell`, 18, height - 22);
    }

    function drawLensingNodes3d(context, width, height, scale) {
      const radius = state.outermostAu * 1.18;
      for (const node of sphericalLensingNodes()) {
        const projected = project({x:node.x*radius,y:node.y*radius,z:node.z*radius}, width, height, scale);
        const nodeRadius = (2.2 + node.strength * 4.5) * projected.perspective;
        context.beginPath();
        context.arc(projected.x, projected.y, nodeRadius, 0, Math.PI * 2);
        context.fillStyle = `rgba(184,133,255,${.3 + node.strength * .65})`;
        context.shadowColor = '#b885ff';
        context.shadowBlur = 8 + node.strength * 12;
        context.fill();
        context.shadowBlur = 0;
      }
      context.fillStyle = 'rgba(207,179,255,.92)';
      context.font = '12px system-ui';
      context.fillText('Randomized spherical gravitational-lensing node shell', 18, 24);
    }

    function drawCircularPlane(context, width, height, scale, radius, stroke, dash) {
      const body = {elements:{eccentricity:0,inclination:0,ascendingNode:0,periapsis:0,verticalWarp:0}};
      const points=[];
      for(let step=0;step<96;step+=1) points.push(project(orbitPoint(body,step/96*Math.PI*2,radius),width,height,scale));
      drawPath(context,points,stroke,1.2,dash);
    }

    function drawStarfield(context, width, height) {
      const rng = randomFor(`${state.seed}:exclusive-background`);
      context.fillStyle = 'rgba(255,255,255,.58)';
      for (let index=0; index<110; index+=1) {
        context.globalAlpha = .25 + rng() * .7;
        context.beginPath();
        context.arc(rng()*width, rng()*height, .35+rng()*1.2, 0, Math.PI*2);
        context.fill();
      }
      context.globalAlpha = 1;
    }

    function orbitPoint(body, anomaly, distanceOverride = null) {
      const elements = body.elements;
      const a = distanceOverride ?? body.distance;
      const e = Math.min(.9, elements.eccentricity || 0);
      const radius = a * (1 - e*e) / Math.max(.12, 1 + e * Math.cos(anomaly));
      let x = radius * Math.cos(anomaly);
      let y = radius * Math.sin(anomaly);
      let z = (elements.verticalWarp || 0) * radius * Math.sin(anomaly * 2);
      const peri = elements.periapsis || 0;
      [x,y] = [x*Math.cos(peri)-y*Math.sin(peri), x*Math.sin(peri)+y*Math.cos(peri)];
      const inclination = elements.inclination || 0;
      [y,z] = [y*Math.cos(inclination)-z*Math.sin(inclination), y*Math.sin(inclination)+z*Math.cos(inclination)];
      const node = elements.ascendingNode || 0;
      [x,y] = [x*Math.cos(node)-y*Math.sin(node), x*Math.sin(node)+y*Math.cos(node)];
      return {x,y,z};
    }

    function rotatePoint(point) {
      const yaw = state.yaw * Math.PI / 180;
      const pitch = state.pitch * Math.PI / 180;
      const x1 = point.x*Math.cos(yaw)-point.z*Math.sin(yaw);
      const z1 = point.x*Math.sin(yaw)+point.z*Math.cos(yaw);
      return {
        x:x1,
        y:point.y*Math.cos(pitch)-z1*Math.sin(pitch),
        z:point.y*Math.sin(pitch)+z1*Math.cos(pitch)
      };
    }

    function project(point, width, height, scale) {
      const rotated = rotatePoint(point);
      const perspective = 1 / Math.max(.38, 1 + rotated.z * .00115);
      return {x:width/2+rotated.x*scale*perspective,y:height/2+rotated.y*scale*perspective,z:rotated.z,perspective};
    }

    function systemScale(width, height) {
      return Math.min(width,height) * .38 * state.zoom / Math.max(.1,state.outermostAu*1.18);
    }

    function drawPath(context, points, stroke, width=1, dash=[]) {
      if (!points.length) return;
      context.beginPath();
      context.setLineDash(dash);
      context.moveTo(points[0].x, points[0].y);
      for (let index=1; index<points.length; index+=1) context.lineTo(points[index].x,points[index].y);
      context.closePath();
      context.strokeStyle=stroke;
      context.lineWidth=width;
      context.stroke();
      context.setLineDash([]);
    }

    function currentEpochDays() {
      return Number.parseFloat(($('exo-epoch')?.textContent || '').replace(/[^\d.-]/g,'')) || 0;
    }

    function daltonZirconfRadiusAu() {
      const massFactor = 10 + Math.sqrt(Math.max(.08,state.starMass)) * 6;
      const orbitBound = state.outermostAu * massFactor;
      if (Number.isFinite(state.nearestNeighborAu) && state.nearestNeighborAu > 0) return Math.min(orbitBound,state.nearestNeighborAu*.46);
      return orbitBound;
    }

    function formatAu(value) {
      if (!Number.isFinite(value)) return 'unknown';
      if (value >= 1000000) return `${(value/1000000).toFixed(2)}M AU`;
      if (value >= 1000) return `${Math.round(value).toLocaleString()} AU`;
      return `${value.toFixed(2)} AU`;
    }

    function hashString(value) {
      let hash=2166136261;
      for(const character of String(value)) {
        hash ^= character.charCodeAt(0);
        hash = Math.imul(hash,16777619);
      }
      return hash>>>0;
    }

    function randomFor(value) {
      let seed=hashString(value);
      return () => {
        seed += 0x6D2B79F5;
        let result=seed;
        result=Math.imul(result^result>>>15,result|1);
        result^=result+Math.imul(result^result>>>7,result|61);
        return ((result^result>>>14)>>>0)/4294967296;
      };
    }

    function range(rng,min,max) {
      return min+(max-min)*rng();
    }
  }

  waitForSpatialLayer();
})();