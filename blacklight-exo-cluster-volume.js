(() => {
  'use strict';

  const $ = id => document.getElementById(id);
  const LIGHT_SECONDS_PER_AU = 499.004783836;
  const AU_PER_LIGHT_YEAR = 63241.077084;

  function waitForCluster(attempt = 0) {
    const grid = $('exo-cluster-grid');
    const oldMap = $('exo-cluster-spatial-map');
    const shell = oldMap?.closest('.exo-cluster-map-shell');
    if (!grid || !oldMap || !shell) {
      if (attempt < 240) requestAnimationFrame(() => waitForCluster(attempt + 1));
      return;
    }
    initialize({grid, oldMap, shell});
  }

  function initialize({grid, oldMap, shell}) {
    if ($('exo-cluster-volume-canvas')) return;

    const clusterSeedInput = $('exo-cluster-seed');
    const systemSeedInput = $('exo-seed-input');
    const generateClusterButton = $('exo-generate-cluster');
    const randomClusterButton = $('exo-random-cluster');
    const generateSystemButton = $('exo-generate-system');
    const heading = shell.querySelector('.exo-cluster-map-heading');
    const compatibilityReadout = $('exo-cluster-map-readout');

    const state = {
      mode:'routes',
      yaw:-24,
      pitch:52,
      zoom:1,
      panX:0,
      panY:0,
      entries:[],
      edges:[],
      nebulae:[],
      protostars:[],
      darkMasses:[],
      lensingNodes:[],
      streamlines:[],
      maxRadius:1,
      clusterDiameterAu:0,
      selectedNearestAu:null,
      selectedObject:null,
      canvas:null,
      context:null,
      hitTargets:[],
      renderQueued:false,
      rebuildQueued:false,
      drag:null
    };

    oldMap.classList.add('exo-cluster-map-retired');
    oldMap.setAttribute('aria-hidden', 'true');

    injectInterface();
    bindObservers();
    rebuildData();

    function injectInterface() {
      if (heading) {
        const title = heading.querySelector('strong');
        const eyebrow = heading.querySelector('span');
        if (eyebrow) eyebrow.textContent = 'Rigid three-dimensional cluster volume';
        if (title) title.textContent = 'Connected routes and gravity-lensing field';
      }

      const controls = document.createElement('section');
      controls.id = 'exo-cluster-volume-controls';
      controls.className = 'exo-cluster-volume-controls';
      controls.setAttribute('aria-label', 'Three-dimensional cluster map controls');
      controls.innerHTML = `
        <div class="exo-cluster-volume-mode" role="group" aria-label="Cluster display mode">
          <button id="exo-cluster-volume-routes" class="bli-action is-active" type="button" aria-pressed="true">Connected Routes</button>
          <button id="exo-cluster-volume-gravity" class="bli-action" type="button" aria-pressed="false">Gravity Lensing Field</button>
        </div>
        <div class="exo-cluster-camera-grid">
          <label><span>Camera yaw</span><input id="exo-cluster-camera-yaw" type="range" min="-180" max="180" value="-24"></label>
          <label><span>Camera pitch</span><input id="exo-cluster-camera-pitch" type="range" min="5" max="88" value="52"></label>
          <label><span>Volume zoom</span><input id="exo-cluster-camera-zoom" type="range" min="55" max="180" value="100"></label>
          <button id="exo-cluster-camera-reset" class="bli-action" type="button">Reset Viewport</button>
        </div>
        <div class="exo-cluster-volume-key">
          <span><i class="star"></i> Stellar system</span>
          <span><i class="proto"></i> Protostar</span>
          <span><i class="nebula"></i> Nebular mass field</span>
          <span><i class="dark"></i> Non-stellar mass</span>
          <span><i class="lens"></i> Lensing concentration</span>
        </div>
      `;
      heading?.insertAdjacentElement('afterend', controls);

      const canvas = document.createElement('canvas');
      canvas.id = 'exo-cluster-volume-canvas';
      canvas.className = 'exo-cluster-volume-canvas';
      canvas.setAttribute('aria-label', 'Fixed three-dimensional stellar cluster map');
      canvas.tabIndex = 0;
      oldMap.insertAdjacentElement('afterend', canvas);
      state.canvas = canvas;
      state.context = canvas.getContext('2d');

      const gauge = document.createElement('section');
      gauge.id = 'exo-cluster-light-gauge';
      gauge.className = 'exo-cluster-light-gauge';
      gauge.setAttribute('aria-label', 'Light-speed distance reference');
      gauge.innerHTML = `
        <div class="exo-light-gauge-heading">
          <div><span>Light-speed reference</span><strong>AU converted to light-travel time</strong></div>
          <output id="exo-light-gauge-selected">Select a system</output>
        </div>
        <div class="exo-light-gauge-track" aria-hidden="true">
          <span id="exo-light-gauge-year" class="exo-light-gauge-year"></span>
          <i>1 light-year · 63,241 AU</i>
        </div>
        <div class="exo-light-gauge-readouts">
          <span><strong id="exo-light-gauge-cluster-au">0 AU</strong> cluster span</span>
          <span><strong id="exo-light-gauge-cluster-time">0 years</strong> light-crossing time</span>
          <span><strong>1 AU</strong> = 8m 19s at light speed</span>
        </div>
      `;
      canvas.insertAdjacentElement('afterend', gauge);

      const status = document.createElement('p');
      status.id = 'exo-cluster-volume-status';
      status.className = 'exo-cluster-volume-status';
      status.setAttribute('aria-live', 'polite');
      gauge.insertAdjacentElement('afterend', status);

      $('exo-cluster-volume-routes')?.addEventListener('click', () => setMode('routes'));
      $('exo-cluster-volume-gravity')?.addEventListener('click', () => setMode('gravity'));
      $('exo-cluster-camera-yaw')?.addEventListener('input', event => {
        state.yaw = Number(event.target.value);
        scheduleRender();
      });
      $('exo-cluster-camera-pitch')?.addEventListener('input', event => {
        state.pitch = Number(event.target.value);
        scheduleRender();
      });
      $('exo-cluster-camera-zoom')?.addEventListener('input', event => {
        state.zoom = Number(event.target.value) / 100;
        scheduleRender();
      });
      $('exo-cluster-camera-reset')?.addEventListener('click', resetCamera);

      canvas.addEventListener('pointerdown', beginDrag);
      canvas.addEventListener('pointermove', continueDrag);
      canvas.addEventListener('pointerup', endDrag);
      canvas.addEventListener('pointercancel', endDrag);
      canvas.addEventListener('wheel', event => {
        event.preventDefault();
        state.zoom = clamp(state.zoom * (event.deltaY > 0 ? .92 : 1.08), .55, 1.8);
        const zoom = $('exo-cluster-camera-zoom');
        if (zoom) zoom.value = String(Math.round(state.zoom * 100));
        scheduleRender();
      }, {passive:false});
      canvas.addEventListener('click', activateHitTarget);

      const resize = () => {
        const ratio = Math.min(2, window.devicePixelRatio || 1);
        const width = Math.max(520, shell.clientWidth - 30);
        const height = Math.max(420, Math.min(650, width * .55));
        canvas.width = Math.round(width * ratio);
        canvas.height = Math.round(height * ratio);
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
        scheduleRender();
      };
      new ResizeObserver(resize).observe(shell);
      resize();
    }

    function setMode(mode) {
      state.mode = mode === 'gravity' ? 'gravity' : 'routes';
      const routes = state.mode === 'routes';
      $('exo-cluster-volume-routes')?.classList.toggle('is-active', routes);
      $('exo-cluster-volume-gravity')?.classList.toggle('is-active', !routes);
      $('exo-cluster-volume-routes')?.setAttribute('aria-pressed', String(routes));
      $('exo-cluster-volume-gravity')?.setAttribute('aria-pressed', String(!routes));
      updateStatus();
      scheduleRender();
    }

    function resetCamera() {
      state.yaw = -24;
      state.pitch = 52;
      state.zoom = 1;
      state.panX = 0;
      state.panY = 0;
      const yaw = $('exo-cluster-camera-yaw');
      const pitch = $('exo-cluster-camera-pitch');
      const zoom = $('exo-cluster-camera-zoom');
      if (yaw) yaw.value = '-24';
      if (pitch) pitch.value = '52';
      if (zoom) zoom.value = '100';
      scheduleRender();
    }

    function beginDrag(event) {
      state.drag = {
        pointerId:event.pointerId,
        x:event.clientX,
        y:event.clientY,
        yaw:state.yaw,
        pitch:state.pitch,
        panX:state.panX,
        panY:state.panY,
        pan:event.shiftKey || event.button === 1
      };
      state.canvas.setPointerCapture(event.pointerId);
    }

    function continueDrag(event) {
      if (!state.drag || state.drag.pointerId !== event.pointerId) return;
      const dx = event.clientX - state.drag.x;
      const dy = event.clientY - state.drag.y;
      if (state.drag.pan) {
        state.panX = state.drag.panX + dx;
        state.panY = state.drag.panY + dy;
      } else {
        state.yaw = normalizeDegrees(state.drag.yaw + dx * .42);
        state.pitch = clamp(state.drag.pitch - dy * .3, 5, 88);
        const yaw = $('exo-cluster-camera-yaw');
        const pitch = $('exo-cluster-camera-pitch');
        if (yaw) yaw.value = String(Math.round(state.yaw));
        if (pitch) pitch.value = String(Math.round(state.pitch));
      }
      scheduleRender();
    }

    function endDrag(event) {
      if (!state.drag || state.drag.pointerId !== event.pointerId) return;
      state.canvas.releasePointerCapture?.(event.pointerId);
      state.drag = null;
    }

    function activateHitTarget(event) {
      if (state.drag) return;
      const rect = state.canvas.getBoundingClientRect();
      const scaleX = state.canvas.width / rect.width;
      const scaleY = state.canvas.height / rect.height;
      const x = (event.clientX - rect.left) * scaleX;
      const y = (event.clientY - rect.top) * scaleY;
      const target = [...state.hitTargets]
        .sort((a, b) => a.depth - b.depth)
        .find(item => Math.hypot(item.x - x, item.y - y) <= item.radius + 8);
      if (!target) return;
      state.selectedObject = target.object;
      if (target.object.category === 'system') target.object.open?.click();
      updateStatus();
      scheduleRender();
    }

    function bindObservers() {
      const observer = new MutationObserver(scheduleRebuild);
      observer.observe(grid, {childList:true, subtree:true});
      clusterSeedInput?.addEventListener('change', scheduleRebuild);
      systemSeedInput?.addEventListener('change', scheduleRebuild);
      generateClusterButton?.addEventListener('click', scheduleRebuild);
      randomClusterButton?.addEventListener('click', scheduleRebuild);
      generateSystemButton?.addEventListener('click', () => requestAnimationFrame(scheduleRebuild));
    }

    function scheduleRebuild() {
      if (state.rebuildQueued) return;
      state.rebuildQueued = true;
      requestAnimationFrame(() => requestAnimationFrame(() => {
        state.rebuildQueued = false;
        rebuildData();
      }));
    }

    function rebuildData() {
      state.entries = readEntries();
      if (!state.entries.length) {
        state.edges = [];
        state.nebulae = [];
        state.protostars = [];
        state.darkMasses = [];
        state.lensingNodes = [];
        state.streamlines = [];
        updateGauge();
        updateStatus();
        scheduleRender();
        return;
      }

      positionEntries();
      state.edges = connectedNearestGraph(state.entries);
      buildMassAssets();
      state.streamlines = buildStreamlines();
      state.selectedNearestAu = selectedNearestDistance();
      updateGauge();
      updateStatus();
      scheduleRender();
    }

    function readEntries() {
      return [...grid.querySelectorAll('.exo-cluster-card')].map((card, index) => {
        const seed = card.querySelector('.exo-cluster-seed')?.textContent.trim() || `system-${index + 1}`;
        const name = card.querySelector('h3')?.textContent.trim() || `System ${index + 1}`;
        const star = card.querySelector('.exo-cluster-primary')?.textContent.trim() || '';
        return {
          category:'system',
          card,
          index,
          seed,
          name,
          star,
          mass:stellarMass(star),
          populated:card.classList.contains('is-populated'),
          open:card.querySelector('.exo-cluster-open'),
          position:null,
          nearest:null
        };
      });
    }

    function stellarMass(text) {
      const classification = text.match(/\b(WD|SG|[MKGFAB])\b/i)?.[1]?.toUpperCase();
      return ({M:.32, K:.7, G:1, F:1.3, A:2.05, B:5.2, WD:.72, SG:1.65})[classification] || 1;
    }

    function positionEntries() {
      const baseSeed = clusterSeedInput?.value.trim() || 'cluster';
      const count = state.entries.length;
      const goldenAngle = Math.PI * (3 - Math.sqrt(5));
      let maximum = 1;

      state.entries.forEach((entry, index) => {
        const rng = randomFor(`${baseSeed}:${entry.seed}:rigid-cluster-position-v3`);
        const shellFraction = Math.pow((index + .72) / Math.max(1, count), .58);
        const radius = 90000 + shellFraction * 360000 + (rng() - .5) * 44000;
        const zUnit = 1 - 2 * ((index + .5) / count);
        const transverse = Math.sqrt(Math.max(.035, 1 - zUnit * zUnit));
        const angle = index * goldenAngle + (rng() - .5) * .55;
        entry.position = {
          x:Math.cos(angle) * transverse * radius,
          y:Math.sin(angle) * transverse * radius,
          z:(zUnit + (rng() - .5) * .25) * radius
        };
        maximum = Math.max(maximum, magnitude(entry.position));
      });

      state.maxRadius = maximum;
      state.clusterDiameterAu = maximumPairDistance(state.entries.map(entry => entry.position));
    }

    function connectedNearestGraph(entries) {
      const edges = new Map();
      const edgeKey = (a, b) => [a.index, b.index].sort((x, y) => x - y).join(':');

      for (const entry of entries) {
        let nearest = null;
        for (const candidate of entries) {
          if (candidate === entry) continue;
          const distance = distance3(entry.position, candidate.position);
          if (!nearest || distance < nearest.distance) nearest = {candidate, distance};
        }
        entry.nearest = nearest;
        if (nearest) {
          const key = edgeKey(entry, nearest.candidate);
          if (!edges.has(key)) edges.set(key, {
            key,
            from:entry,
            to:nearest.candidate,
            distance:nearest.distance,
            bridge:false
          });
        }
      }

      while (components(entries, [...edges.values()]).length > 1) {
        const groups = components(entries, [...edges.values()]);
        let bridge = null;
        for (let left = 0; left < groups.length; left += 1) {
          for (let right = left + 1; right < groups.length; right += 1) {
            for (const from of groups[left]) {
              for (const to of groups[right]) {
                const distance = distance3(from.position, to.position);
                if (!bridge || distance < bridge.distance) bridge = {from, to, distance};
              }
            }
          }
        }
        if (!bridge) break;
        const key = edgeKey(bridge.from, bridge.to);
        edges.set(key, {...bridge, key, bridge:true});
      }
      return [...edges.values()];
    }

    function components(entries, edges) {
      const parent = new Map(entries.map(entry => [entry.index, entry.index]));
      const find = index => {
        let current = index;
        while (parent.get(current) !== current) current = parent.get(current);
        let walker = index;
        while (parent.get(walker) !== walker) {
          const next = parent.get(walker);
          parent.set(walker, current);
          walker = next;
        }
        return current;
      };
      const union = (a, b) => {
        const rootA = find(a);
        const rootB = find(b);
        if (rootA !== rootB) parent.set(rootB, rootA);
      };
      edges.forEach(edge => union(edge.from.index, edge.to.index));
      const groups = new Map();
      entries.forEach(entry => {
        const root = find(entry.index);
        if (!groups.has(root)) groups.set(root, []);
        groups.get(root).push(entry);
      });
      return [...groups.values()];
    }

    function buildMassAssets() {
      const baseSeed = clusterSeedInput?.value.trim() || 'cluster';
      const rng = randomFor(`${baseSeed}:cluster-mass-assets-v3`);
      const nebulaCount = clamp(Math.round(state.entries.length / 5) + 1, 2, 5);
      state.nebulae = [];
      state.protostars = [];
      state.darkMasses = [];

      for (let index = 0; index < nebulaCount; index += 1) {
        const position = randomPosition(rng, state.maxRadius * (.36 + rng() * .42));
        state.nebulae.push({
          category:'nebula',
          name:`Nebular Mass Field ${index + 1}`,
          position,
          radius:{
            x:state.maxRadius * (.11 + rng() * .13),
            y:state.maxRadius * (.07 + rng() * .12),
            z:state.maxRadius * (.08 + rng() * .14)
          },
          mass:35 + rng() * 280,
          density:.25 + rng() * .75,
          hue:190 + rng() * 90
        });
      }

      const protostarCount = clamp(Math.ceil(state.entries.length / 6), 1, 4);
      for (let index = 0; index < protostarCount; index += 1) {
        const host = state.nebulae[index % state.nebulae.length];
        const offset = randomUnitVector(rng);
        const offsetLength = Math.min(host.radius.x, host.radius.y) * (.18 + rng() * .48);
        state.protostars.push({
          category:'protostar',
          name:`Protostar ${String.fromCharCode(65 + index)}`,
          position:{
            x:host.position.x + offset.x * offsetLength,
            y:host.position.y + offset.y * offsetLength,
            z:host.position.z + offset.z * offsetLength
          },
          mass:.15 + rng() * 2.1,
          stage:pick(rng, ['Class 0 collapse', 'Class I envelope', 'Accretion-disk dominant'])
        });
      }

      const darkTypes = [
        ['Brown dwarf', .015, .075],
        ['Rogue planetary aggregate', .0004, .012],
        ['Cometary mass cloud', .0001, .004],
        ['Compact dark remnant', .45, 1.35]
      ];
      const darkCount = clamp(Math.ceil(state.entries.length / 3), 3, 8);
      for (let index = 0; index < darkCount; index += 1) {
        const [type, minMass, maxMass] = pick(rng, darkTypes);
        state.darkMasses.push({
          category:'dark-mass',
          name:`${type} ${index + 1}`,
          type,
          position:randomPosition(rng, state.maxRadius * (.42 + rng() * .52)),
          mass:minMass + rng() * (maxMass - minMass)
        });
      }

      const barycenter = weightedBarycenter(state.entries);
      const lensCount = clamp(Math.ceil(state.entries.length * .75), 4, 10);
      state.lensingNodes = [];
      for (let index = 0; index < lensCount; index += 1) {
        const direction = randomUnitVector(rng);
        const radial = state.maxRadius * (.12 + rng() * .58);
        state.lensingNodes.push({
          category:'lensing',
          name:`Cluster Lensing Point ${index + 1}`,
          position:{
            x:barycenter.x + direction.x * radial,
            y:barycenter.y + direction.y * radial,
            z:barycenter.z + direction.z * radial
          },
          strength:.55 + rng() * 1.7
        });
      }
    }

    function buildStreamlines() {
      const seed = clusterSeedInput?.value.trim() || 'cluster';
      const rng = randomFor(`${seed}:rigid-gravity-grain-v3`);
      const sources = gravitySources();
      const center = weightedBarycenter(state.entries);
      const shellRadius = state.maxRadius * 1.18;
      const count = Math.min(190, 92 + state.entries.length * 8);
      const lines = [];

      for (let index = 0; index < count; index += 1) {
        const direction = randomUnitVector(rng);
        const radial = shellRadius * (.72 + rng() * .34);
        let point = {
          x:center.x + direction.x * radial,
          y:center.y + direction.y * radial,
          z:center.z + direction.z * radial
        };
        const points = [];
        let density = 0;
        for (let step = 0; step < 76; step += 1) {
          points.push({...point});
          const vector = gravityVector(point, sources);
          const strength = magnitude(vector);
          if (!Number.isFinite(strength) || strength <= 0) break;
          density += strength;
          const unit = {x:vector.x / strength, y:vector.y / strength, z:vector.z / strength};
          const stepLength = state.maxRadius * (.014 + Math.min(.023, Math.log1p(strength * 1e10) * .0021));
          point = {
            x:point.x + unit.x * stepLength,
            y:point.y + unit.y * stepLength,
            z:point.z + unit.z * stepLength
          };
          if (sources.some(source => distance3(point, source.position) < source.capture)) {
            points.push({...point});
            break;
          }
          if (distance3(point, center) > shellRadius * 1.4) break;
        }
        lines.push({
          points,
          density:density / Math.max(1, points.length),
          phase:rng()
        });
      }
      return lines;
    }

    function gravitySources() {
      const scale = state.maxRadius;
      return [
        ...state.entries.map(entry => ({position:entry.position, weight:entry.mass * 1.25, capture:scale * .03})),
        ...state.protostars.map(item => ({position:item.position, weight:item.mass * .9, capture:scale * .02})),
        ...state.darkMasses.map(item => ({position:item.position, weight:item.mass * 1.1, capture:scale * .018})),
        ...state.nebulae.map(item => ({position:item.position, weight:Math.sqrt(item.mass) * .16, capture:Math.max(item.radius.x, item.radius.y) * .22})),
        ...state.lensingNodes.map(item => ({position:item.position, weight:item.strength * .82, capture:scale * .02}))
      ];
    }

    function gravityVector(point, sources) {
      const softening = state.maxRadius * .035;
      return sources.reduce((vector, source) => {
        const dx = source.position.x - point.x;
        const dy = source.position.y - point.y;
        const dz = source.position.z - point.z;
        const radiusSquared = dx * dx + dy * dy + dz * dz + softening * softening;
        const inverseRadiusCubed = 1 / Math.pow(radiusSquared, 1.5);
        const factor = source.weight * inverseRadiusCubed;
        vector.x += dx * factor;
        vector.y += dy * factor;
        vector.z += dz * factor;
        return vector;
      }, {x:0, y:0, z:0});
    }

    function render() {
      const canvas = state.canvas;
      const context = state.context;
      if (!canvas || !context) return;
      const width = canvas.width;
      const height = canvas.height;
      context.clearRect(0, 0, width, height);
      context.fillStyle = '#020202';
      context.fillRect(0, 0, width, height);
      drawBackground(context, width, height);
      state.hitTargets = [];

      drawNebulae(context, width, height);
      if (state.mode === 'gravity') drawGravityField(context, width, height);
      else drawRoutes(context, width, height);
      drawMassPoints(context, width, height);
      drawSystems(context, width, height);
      drawOrientationAxes(context, width, height);
    }

    function drawBackground(context, width, height) {
      const rng = randomFor(`${clusterSeedInput?.value || 'cluster'}:volume-stars`);
      context.fillStyle = 'rgba(255,255,255,.55)';
      for (let index = 0; index < 160; index += 1) {
        context.globalAlpha = .12 + rng() * .35;
        context.beginPath();
        context.arc(rng() * width, rng() * height, .35 + rng() * 1.15, 0, Math.PI * 2);
        context.fill();
      }
      context.globalAlpha = 1;
    }

    function drawNebulae(context, width, height) {
      const items = state.nebulae.map(item => ({item, projected:project(item.position, width, height)}))
        .sort((a, b) => a.projected.depth - b.projected.depth);
      for (const {item, projected} of items) {
        const edgeX = project({x:item.position.x + item.radius.x, y:item.position.y, z:item.position.z}, width, height);
        const edgeY = project({x:item.position.x, y:item.position.y + item.radius.y, z:item.position.z}, width, height);
        const radiusX = Math.max(28, Math.hypot(edgeX.x - projected.x, edgeX.y - projected.y));
        const radiusY = Math.max(18, Math.hypot(edgeY.x - projected.x, edgeY.y - projected.y));
        context.save();
        context.translate(projected.x, projected.y);
        context.scale(radiusX, radiusY);
        const gradient = context.createRadialGradient(0, 0, 0, 0, 0, 1);
        gradient.addColorStop(0, `hsla(${item.hue},70%,62%,${.11 + item.density * .08})`);
        gradient.addColorStop(.55, `hsla(${item.hue + 18},55%,38%,${.06 + item.density * .05})`);
        gradient.addColorStop(1, `hsla(${item.hue},60%,30%,0)`);
        context.fillStyle = gradient;
        context.beginPath();
        context.arc(0, 0, 1, 0, Math.PI * 2);
        context.fill();
        context.restore();
      }
    }

    function drawRoutes(context, width, height) {
      for (const edge of state.edges) {
        const from = project(edge.from.position, width, height);
        const to = project(edge.to.position, width, height);
        context.beginPath();
        context.setLineDash(edge.bridge ? [] : [7, 6]);
        context.strokeStyle = edge.bridge ? 'rgba(240,189,88,.86)' : 'rgba(126,179,207,.52)';
        context.lineWidth = edge.bridge ? 2.4 : 1.6;
        context.moveTo(from.x, from.y);
        context.lineTo(to.x, to.y);
        context.stroke();
        context.setLineDash([]);

        const mx = (from.x + to.x) / 2;
        const my = (from.y + to.y) / 2;
        drawOutlinedText(
          context,
          `${formatAu(edge.distance)}${edge.bridge ? ' · bridge' : ''}`,
          mx,
          my - 7,
          edge.bridge ? '#f0bd58' : '#a9d8ec',
          11 * deviceScale()
        );
      }
    }

    function drawGravityField(context, width, height) {
      for (const line of state.streamlines) {
        if (line.points.length < 3) continue;
        const projected = line.points.map(point => project(point, width, height));
        const density = Math.log1p(line.density * 1e10);
        const opacity = clamp(.12 + density * .085, .12, .66);
        const lineWidth = clamp(.55 + density * .34, .6, 2.8) * deviceScale();
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
        const arrowIndex = Math.max(2, Math.floor(projected.length * .72));
        drawArrow(context, projected[arrowIndex - 1], projected[arrowIndex], opacity);
      }
    }

    function drawArrow(context, from, to, opacity) {
      const angle = Math.atan2(to.y - from.y, to.x - from.x);
      const size = 4.5 * deviceScale();
      context.save();
      context.translate(to.x, to.y);
      context.rotate(angle);
      context.fillStyle = `rgba(154,220,234,${clamp(opacity + .2, 0, 1)})`;
      context.beginPath();
      context.moveTo(0, 0);
      context.lineTo(-size, size * .55);
      context.lineTo(-size, -size * .55);
      context.closePath();
      context.fill();
      context.restore();
    }

    function drawMassPoints(context, width, height) {
      const objects = [
        ...state.protostars,
        ...state.darkMasses,
        ...state.lensingNodes
      ].map(object => ({object, projected:project(object.position, width, height)}))
        .sort((a, b) => a.projected.depth - b.projected.depth);

      for (const {object, projected} of objects) {
        let color;
        let radius;
        if (object.category === 'protostar') {
          color = '#ff9d5d';
          radius = 5.5;
        } else if (object.category === 'lensing') {
          color = '#b885ff';
          radius = 4.5 + object.strength * 1.8;
        } else {
          color = '#8aa0ad';
          radius = object.type === 'Compact dark remnant' ? 4.6 : 3.6;
        }
        radius *= projected.perspective * deviceScale();
        context.beginPath();
        context.arc(projected.x, projected.y, radius * 2.1, 0, Math.PI * 2);
        context.fillStyle = hexToRgba(color, object.category === 'lensing' ? .11 : .055);
        context.fill();
        context.beginPath();
        context.arc(projected.x, projected.y, radius, 0, Math.PI * 2);
        context.fillStyle = color;
        context.shadowColor = color;
        context.shadowBlur = object.category === 'lensing' ? 14 : 8;
        context.fill();
        context.shadowBlur = 0;
        if (state.mode === 'gravity' || object.category === 'protostar') {
          drawOutlinedText(context, object.name, projected.x + radius + 5, projected.y - radius - 3, '#d9d1c5', 10.5 * deviceScale());
        }
        state.hitTargets.push({
          object,
          x:projected.x,
          y:projected.y,
          radius:radius * 1.6,
          depth:projected.depth
        });
      }
    }

    function drawSystems(context, width, height) {
      const selectedSeed = systemSeedInput?.value.trim();
      const systems = state.entries.map(object => ({object, projected:project(object.position, width, height)}))
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
        state.hitTargets.push({object, x:projected.x, y:projected.y, radius:radius * 1.8, depth:projected.depth});
      }
    }

    function drawOrientationAxes(context, width, height) {
      const origin = {x:52 * deviceScale(), y:height - 48 * deviceScale()};
      const axes = [
        ['X', '#d9a84f', {x:30, y:0, z:0}],
        ['Y', '#72d69a', {x:0, y:30, z:0}],
        ['Z', '#b885ff', {x:0, y:0, z:30}]
      ];
      for (const [label, color, vector] of axes) {
        const rotated = rotate(vector);
        const end = {x:origin.x + rotated.x * deviceScale(), y:origin.y + rotated.y * deviceScale()};
        context.beginPath();
        context.strokeStyle = color;
        context.lineWidth = 1.4 * deviceScale();
        context.moveTo(origin.x, origin.y);
        context.lineTo(end.x, end.y);
        context.stroke();
        drawOutlinedText(context, label, end.x + 4, end.y + 4, color, 10 * deviceScale(), true);
      }
    }

    function updateGauge() {
      const selectedSeed = systemSeedInput?.value.trim();
      const selectedEntry = state.entries.find(entry => entry.seed === selectedSeed) || state.entries[0];
      state.selectedNearestAu = selectedEntry?.nearest?.distance || null;
      const selected = $('exo-light-gauge-selected');
      if (selected) {
        selected.textContent = selectedEntry && state.selectedNearestAu
          ? `${selectedEntry.name}: ${formatAu(state.selectedNearestAu)} · ${formatLightTime(state.selectedNearestAu)}`
          : 'Select a system';
      }
      const clusterAu = $('exo-light-gauge-cluster-au');
      const clusterTime = $('exo-light-gauge-cluster-time');
      if (clusterAu) clusterAu.textContent = formatAu(state.clusterDiameterAu);
      if (clusterTime) clusterTime.textContent = formatLightTime(state.clusterDiameterAu);
      const yearMark = $('exo-light-gauge-year');
      if (yearMark) {
        const percent = state.clusterDiameterAu > 0
          ? clamp(AU_PER_LIGHT_YEAR / state.clusterDiameterAu * 100, 1.5, 100)
          : 0;
        yearMark.style.width = `${percent}%`;
      }
      if (compatibilityReadout) {
        compatibilityReadout.textContent = state.selectedNearestAu
          ? `Selected system nearest neighbor: ${formatAu(state.selectedNearestAu)}`
          : `${state.entries.length} systems positioned`;
      }
    }

    function updateStatus() {
      const status = $('exo-cluster-volume-status');
      if (!status) return;
      const bridgeCount = state.edges.filter(edge => edge.bridge).length;
      if (state.selectedObject) {
        const object = state.selectedObject;
        const detail = object.category === 'system'
          ? `${object.star || 'stellar system'} · nearest neighbor ${formatAu(object.nearest?.distance)}`
          : object.category === 'nebula'
            ? `${object.mass.toFixed(1)} estimated solar masses across a distributed field`
            : object.category === 'protostar'
              ? `${object.stage} · ${object.mass.toFixed(2)} estimated solar masses`
              : object.category === 'lensing'
                ? `${object.strength.toFixed(2)} relative curvature concentration`
                : `${object.type} · ${object.mass.toFixed(3)} estimated solar masses`;
        status.textContent = `${object.name}: ${detail}.`;
        return;
      }
      status.textContent = state.mode === 'gravity'
        ? `${state.entries.length} fixed stellar systems, ${state.protostars.length} protostars, ${state.nebulae.length} nebular mass fields, ${state.darkMasses.length} non-stellar masses, and ${state.lensingNodes.length} lensing concentrations are contributing to the static cluster gravity field.`
        : `${state.entries.length} fixed stellar systems are connected through nearest-neighbor routes with ${bridgeCount} automatic topology bridge${bridgeCount === 1 ? '' : 's'} preventing detached branches.`;
    }

    function selectedNearestDistance() {
      const selectedSeed = systemSeedInput?.value.trim();
      return state.entries.find(entry => entry.seed === selectedSeed)?.nearest?.distance || null;
    }

    function scheduleRender() {
      if (state.renderQueued) return;
      state.renderQueued = true;
      requestAnimationFrame(() => {
        state.renderQueued = false;
        render();
      });
    }

    function project(point, width, height) {
      const rotated = rotate(point);
      const perspective = 1 / Math.max(.58, 1 + rotated.z / Math.max(1, state.maxRadius) * .24);
      const scale = Math.min(width, height) * .42 * state.zoom / Math.max(1, state.maxRadius);
      return {
        x:width / 2 + state.panX * deviceScale() + rotated.x * scale * perspective,
        y:height / 2 + state.panY * deviceScale() + rotated.y * scale * perspective,
        depth:rotated.z,
        perspective
      };
    }

    function rotate(point) {
      const yaw = state.yaw * Math.PI / 180;
      const pitch = state.pitch * Math.PI / 180;
      const x1 = point.x * Math.cos(yaw) - point.z * Math.sin(yaw);
      const z1 = point.x * Math.sin(yaw) + point.z * Math.cos(yaw);
      const y2 = point.y * Math.cos(pitch) - z1 * Math.sin(pitch);
      const z2 = point.y * Math.sin(pitch) + z1 * Math.cos(pitch);
      return {x:x1, y:y2, z:z2};
    }

    function weightedBarycenter(entries) {
      const total = entries.reduce((sum, entry) => sum + entry.mass, 0) || 1;
      return entries.reduce((center, entry) => ({
        x:center.x + entry.position.x * entry.mass / total,
        y:center.y + entry.position.y * entry.mass / total,
        z:center.z + entry.position.z * entry.mass / total
      }), {x:0, y:0, z:0});
    }

    function randomPosition(rng, radius) {
      const direction = randomUnitVector(rng);
      const radial = radius * Math.pow(rng(), 1 / 3);
      return {x:direction.x * radial, y:direction.y * radial, z:direction.z * radial};
    }

    function randomUnitVector(rng) {
      const z = rng() * 2 - 1;
      const angle = rng() * Math.PI * 2;
      const transverse = Math.sqrt(Math.max(0, 1 - z * z));
      return {x:Math.cos(angle) * transverse, y:Math.sin(angle) * transverse, z};
    }

    function maximumPairDistance(points) {
      let maximum = 0;
      for (let left = 0; left < points.length; left += 1) {
        for (let right = left + 1; right < points.length; right += 1) {
          maximum = Math.max(maximum, distance3(points[left], points[right]));
        }
      }
      return maximum;
    }

    function drawOutlinedText(context, text, x, y, color, size, bold = false) {
      context.font = `${bold ? 800 : 700} ${size}px system-ui`;
      context.textAlign = 'left';
      context.textBaseline = 'alphabetic';
      context.lineJoin = 'round';
      context.strokeStyle = '#020202';
      context.lineWidth = Math.max(3, size * .34);
      context.strokeText(text, x, y);
      context.fillStyle = color;
      context.fillText(text, x, y);
    }

    function formatAu(value) {
      if (!Number.isFinite(value)) return 'unknown';
      if (value >= 1000000) return `${(value / 1000000).toFixed(2)}M AU`;
      if (value >= 1000) return `${Math.round(value).toLocaleString()} AU`;
      return `${value.toFixed(2)} AU`;
    }

    function formatLightTime(au) {
      if (!Number.isFinite(au) || au <= 0) return 'unknown';
      const seconds = au * LIGHT_SECONDS_PER_AU;
      const yearSeconds = 365.25 * 86400;
      if (seconds >= yearSeconds) {
        const years = seconds / yearSeconds;
        return `${years.toFixed(years >= 10 ? 1 : 2)} light-years of travel`;
      }
      if (seconds >= 86400) return `${(seconds / 86400).toFixed(1)} light-days`;
      if (seconds >= 3600) return `${(seconds / 3600).toFixed(1)} light-hours`;
      return `${(seconds / 60).toFixed(1)} light-minutes`;
    }

    function hexToRgba(hex, alpha) {
      const value = hex.replace('#', '');
      const number = Number.parseInt(value.length === 3 ? value.split('').map(char => char + char).join('') : value, 16);
      const red = number >> 16 & 255;
      const green = number >> 8 & 255;
      const blue = number & 255;
      return `rgba(${red},${green},${blue},${alpha})`;
    }

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

    function pick(rng, list) {
      return list[Math.floor(rng() * list.length)];
    }

    function distance3(a, b) {
      return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
    }

    function magnitude(point) {
      return Math.hypot(point.x, point.y, point.z);
    }

    function clamp(value, min, max) {
      return Math.max(min, Math.min(max, value));
    }

    function normalizeDegrees(value) {
      let normalized = value % 360;
      if (normalized > 180) normalized -= 360;
      if (normalized < -180) normalized += 360;
      return normalized;
    }

    function deviceScale() {
      return Math.min(2, window.devicePixelRatio || 1);
    }
  }

  waitForCluster();
})();
