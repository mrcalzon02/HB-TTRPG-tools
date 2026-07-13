(() => {
  'use strict';

  const SVG_NS = 'http://www.w3.org/2000/svg';
  const $ = id => document.getElementById(id);

  function waitForClusterMap(attempt = 0) {
    const oldMap = $('exo-cluster-spatial-map');
    const grid = $('exo-cluster-grid');
    const shell = oldMap?.closest('.exo-cluster-map-shell');
    if (!oldMap || !grid || !shell) {
      if (attempt < 180) requestAnimationFrame(() => waitForClusterMap(attempt + 1));
      return;
    }
    initialize({oldMap, grid, shell});
  }

  function initialize({oldMap, grid, shell}) {
    if ($('exo-cluster-connected-map')) return;

    const clusterSeedInput = $('exo-cluster-seed');
    const systemSeedInput = $('exo-seed-input');
    const state = {
      mode:'routes',
      entries:[],
      projected:[],
      edges:[],
      lensingNodes:[],
      selectedNearestAu:null,
      maxRadius:1,
      renderQueued:false
    };

    const visibleReadout = shell.querySelector('.exo-cluster-map-heading output');
    if (visibleReadout) {
      visibleReadout.id = 'exo-cluster-network-readout';
      visibleReadout.textContent = 'Building connected topology…';
    }

    const compatibilityReadout = document.createElement('output');
    compatibilityReadout.id = 'exo-cluster-map-readout';
    compatibilityReadout.hidden = true;
    shell.append(compatibilityReadout);

    const map = document.createElementNS(SVG_NS, 'svg');
    map.id = 'exo-cluster-connected-map';
    map.setAttribute('viewBox', '0 0 1000 520');
    map.setAttribute('role', 'img');
    map.setAttribute('aria-label', 'Connected stellar cluster route and gravitational lensing map');
    oldMap.replaceWith(map);

    injectControls();
    bindObservers();
    scheduleRender();

    function injectControls() {
      const heading = shell.querySelector('.exo-cluster-map-heading');
      if (!heading || $('exo-cluster-map-modes')) return;

      const controls = document.createElement('div');
      controls.id = 'exo-cluster-map-modes';
      controls.className = 'exo-cluster-map-modes';
      controls.setAttribute('role', 'group');
      controls.setAttribute('aria-label', 'Cluster map mode');
      controls.innerHTML = `
        <button id="exo-cluster-mode-routes" class="bli-action is-active" type="button" aria-pressed="true">Connected Routes</button>
        <button id="exo-cluster-mode-gravity" class="bli-action" type="button" aria-pressed="false">Gravity Lensing Field</button>
      `;
      heading.insertAdjacentElement('afterend', controls);

      $('exo-cluster-mode-routes')?.addEventListener('click', () => setMode('routes'));
      $('exo-cluster-mode-gravity')?.addEventListener('click', () => setMode('gravity'));
    }

    function setMode(mode) {
      state.mode = mode === 'gravity' ? 'gravity' : 'routes';
      const routes = state.mode === 'routes';
      $('exo-cluster-mode-routes')?.classList.toggle('is-active', routes);
      $('exo-cluster-mode-gravity')?.classList.toggle('is-active', !routes);
      $('exo-cluster-mode-routes')?.setAttribute('aria-pressed', String(routes));
      $('exo-cluster-mode-gravity')?.setAttribute('aria-pressed', String(!routes));
      render();
    }

    function bindObservers() {
      const observer = new MutationObserver(scheduleRender);
      observer.observe(grid, {childList:true, subtree:true});
      clusterSeedInput?.addEventListener('change', scheduleRender);
      systemSeedInput?.addEventListener('change', scheduleRender);
      $('exo-generate-cluster')?.addEventListener('click', scheduleRender);
      $('exo-random-cluster')?.addEventListener('click', scheduleRender);
      $('exo-generate-system')?.addEventListener('click', scheduleRender);
      window.addEventListener('resize', scheduleRender, {passive:true});
    }

    function scheduleRender() {
      if (state.renderQueued) return;
      state.renderQueued = true;
      requestAnimationFrame(() => requestAnimationFrame(() => {
        state.renderQueued = false;
        render();
      }));
    }

    function render() {
      state.entries = readEntries();
      map.replaceChildren();
      if (!state.entries.length) {
        updateReadout('Awaiting cluster data');
        return;
      }

      positionEntries();
      state.edges = connectedNearestGraph(state.entries);
      state.lensingNodes = buildLensingNodes(state.entries);
      state.selectedNearestAu = selectedNearestDistance();

      makeDefinitions();
      drawBackdrop();
      if (state.mode === 'gravity') renderGravityMode();
      else renderRouteMode();
      updateCompatibilityReadout();
    }

    function readEntries() {
      return [...grid.querySelectorAll('.exo-cluster-card')].map((card, index) => {
        const seed = card.querySelector('.exo-cluster-seed')?.textContent.trim() || `system-${index + 1}`;
        const name = card.querySelector('h3')?.textContent.trim() || `System ${index + 1}`;
        const star = card.querySelector('.exo-cluster-primary')?.textContent.trim() || '';
        return {
          card,
          index,
          seed,
          name,
          star,
          mass:stellarMass(star),
          populated:card.classList.contains('is-populated'),
          open:card.querySelector('.exo-cluster-open'),
          position:null,
          projected:null,
          nearest:null
        };
      });
    }

    function stellarMass(starText) {
      const classification = starText.match(/\b(WD|SG|[MKGFAB])\b/i)?.[1]?.toUpperCase();
      return ({M:.32, K:.7, G:1, F:1.3, A:2.05, B:5.2, WD:.72, SG:1.65})[classification] || 1;
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

    function positionEntries() {
      const baseSeed = clusterSeedInput?.value.trim() || 'cluster';
      const count = state.entries.length;
      const goldenAngle = Math.PI * (3 - Math.sqrt(5));
      let maximum = 1;

      state.entries.forEach((entry, index) => {
        const rng = randomFor(`${baseSeed}:${entry.seed}:cluster-position-v2`);
        const shellFraction = Math.pow((index + .65) / Math.max(1, count), .58);
        const radius = 85000 + shellFraction * 330000 + (rng() - .5) * 42000;
        const zUnit = 1 - 2 * ((index + .5) / count);
        const transverse = Math.sqrt(Math.max(.03, 1 - zUnit * zUnit));
        const angle = index * goldenAngle + (rng() - .5) * .58;
        entry.position = {
          x:Math.cos(angle) * transverse * radius,
          y:Math.sin(angle) * transverse * radius,
          z:(zUnit + (rng() - .5) * .28) * radius
        };
        maximum = Math.max(maximum, magnitude(entry.position));
      });

      state.maxRadius = maximum;
      state.projected = state.entries.map(entry => {
        const projected = projectClusterPoint(entry.position, maximum);
        entry.projected = projected;
        return entry;
      });
    }

    function projectClusterPoint(point, maximum = state.maxRadius) {
      const yaw = -22 * Math.PI / 180;
      const pitch = 52 * Math.PI / 180;
      const x1 = point.x * Math.cos(yaw) - point.z * Math.sin(yaw);
      const z1 = point.x * Math.sin(yaw) + point.z * Math.cos(yaw);
      const y2 = point.y * Math.cos(pitch) - z1 * Math.sin(pitch);
      const z2 = point.y * Math.sin(pitch) + z1 * Math.cos(pitch);
      const perspective = 1 / Math.max(.62, 1 + z2 / Math.max(1, maximum) * .22);
      return {
        x:500 + x1 / Math.max(1, maximum) * 405 * perspective,
        y:260 + y2 / Math.max(1, maximum) * 205 * perspective,
        z:z2,
        perspective
      };
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
          if (!edges.has(key)) {
            edges.set(key, {
              key,
              from:entry,
              to:nearest.candidate,
              distance:nearest.distance,
              bridge:false
            });
          }
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

    function selectedNearestDistance() {
      const selectedSeed = systemSeedInput?.value.trim();
      return state.entries.find(entry => entry.seed === selectedSeed)?.nearest?.distance || null;
    }

    function buildLensingNodes(entries) {
      const baseSeed = clusterSeedInput?.value.trim() || 'cluster';
      const rng = randomFor(`${baseSeed}:cluster-lensing-field-v1`);
      const count = Math.max(4, Math.min(10, Math.ceil(entries.length * .8)));
      const barycenter = weightedBarycenter(entries);
      const nodes = [];

      for (let index = 0; index < count; index += 1) {
        let position;
        let anchors;
        if (index === 0) {
          position = {
            x:barycenter.x + (rng() - .5) * state.maxRadius * .16,
            y:barycenter.y + (rng() - .5) * state.maxRadius * .16,
            z:barycenter.z + (rng() - .5) * state.maxRadius * .2
          };
          anchors = ['cluster barycenter'];
        } else {
          const first = entries[Math.floor(rng() * entries.length)];
          let second = entries[Math.floor(rng() * entries.length)];
          if (second === first) second = entries[(first.index + 1) % entries.length];
          const mix = .25 + rng() * .5;
          const separation = distance3(first.position, second.position);
          const offset = Math.max(18000, separation * (.08 + rng() * .16));
          const direction = randomUnitVector(rng);
          position = {
            x:first.position.x * (1 - mix) + second.position.x * mix + direction.x * offset,
            y:first.position.y * (1 - mix) + second.position.y * mix + direction.y * offset,
            z:first.position.z * (1 - mix) + second.position.z * mix + direction.z * offset
          };
          anchors = [first.name, second.name];
        }
        const localDensity = entries.reduce((sum, entry) => {
          const distance = Math.max(14000, distance3(position, entry.position));
          return sum + entry.mass / (distance * distance);
        }, 0);
        nodes.push({
          id:`cluster-lens-${index + 1}`,
          name:`Lensing Point ${index + 1}`,
          position,
          strength:.65 + rng() * 1.25 + Math.min(1.2, localDensity * 2.5e10),
          anchors,
          projected:projectClusterPoint(position)
        });
      }
      return nodes;
    }

    function weightedBarycenter(entries) {
      const total = entries.reduce((sum, entry) => sum + entry.mass, 0) || 1;
      return entries.reduce((center, entry) => ({
        x:center.x + entry.position.x * entry.mass / total,
        y:center.y + entry.position.y * entry.mass / total,
        z:center.z + entry.position.z * entry.mass / total
      }), {x:0, y:0, z:0});
    }

    function randomUnitVector(rng) {
      const z = rng() * 2 - 1;
      const angle = rng() * Math.PI * 2;
      const transverse = Math.sqrt(Math.max(0, 1 - z * z));
      return {x:Math.cos(angle) * transverse, y:Math.sin(angle) * transverse, z};
    }

    function makeDefinitions() {
      const defs = svg('defs');
      const arrow = svg('marker', {
        id:'exo-gravity-flow-arrow',
        viewBox:'0 0 10 10',
        refX:'8',
        refY:'5',
        markerWidth:'5',
        markerHeight:'5',
        orient:'auto-start-reverse'
      });
      arrow.append(svg('path', {d:'M 0 0 L 10 5 L 0 10 z', class:'exo-gravity-arrow-head'}));
      defs.append(arrow);
      map.append(defs);
    }

    function drawBackdrop() {
      const group = svg('g', {class:'exo-cluster-backdrop'});
      const rng = randomFor(`${clusterSeedInput?.value || 'cluster'}:map-stars`);
      for (let index = 0; index < 130; index += 1) {
        group.append(svg('circle', {
          cx:(20 + rng() * 960).toFixed(1),
          cy:(20 + rng() * 480).toFixed(1),
          r:(.25 + rng() * 1.05).toFixed(2),
          opacity:(.12 + rng() * .32).toFixed(2)
        }));
      }
      map.append(group);
    }

    function renderRouteMode() {
      const routes = svg('g', {class:'exo-connected-route-layer'});
      for (const edge of state.edges) {
        const line = svg('line', {
          x1:edge.from.projected.x,
          y1:edge.from.projected.y,
          x2:edge.to.projected.x,
          y2:edge.to.projected.y,
          class:edge.bridge ? 'exo-component-bridge' : 'exo-nearest-route'
        });
        routes.append(line);

        const label = svg('text', {
          x:(edge.from.projected.x + edge.to.projected.x) / 2,
          y:(edge.from.projected.y + edge.to.projected.y) / 2 - 7,
          class:edge.bridge ? 'exo-route-label bridge' : 'exo-route-label'
        });
        label.textContent = `${formatAu(edge.distance)}${edge.bridge ? ' · topology bridge' : ''}`;
        routes.append(label);
      }
      map.append(routes);
      drawStarNodes();

      const bridgeCount = state.edges.filter(edge => edge.bridge).length;
      updateReadout(
        `Connected topology · ${state.entries.length} systems · ${bridgeCount} automatic bridge${bridgeCount === 1 ? '' : 's'}`
      );
      drawLegend([
        ['nearest', 'Nearest-neighbor route'],
        ['bridge', 'Automatic component bridge'],
        ['populated', 'Populated system']
      ]);
    }

    function renderGravityMode() {
      const field = svg('g', {class:'exo-gravity-field-layer'});
      for (const streamline of gravityStreamlines()) {
        if (streamline.points.length < 3) continue;
        const d = pathData(streamline.points);
        field.append(svg('path', {
          d,
          class:'exo-gravity-streamline-back',
          opacity:(streamline.opacity * .22).toFixed(3),
          'stroke-width':(streamline.width * 3.4).toFixed(2)
        }));
        field.append(svg('path', {
          d,
          class:'exo-gravity-streamline',
          opacity:streamline.opacity.toFixed(3),
          'stroke-width':streamline.width.toFixed(2),
          'marker-end':'url(#exo-gravity-flow-arrow)'
        }));
      }
      map.append(field);
      drawLensingNodes();
      drawStarNodes();
      updateReadout(
        `Gravity field · ${state.lensingNodes.length} cluster lensing concentrations · stars and lens nodes both influence flow`
      );
      drawLegend([
        ['flow', 'Gravity-flow direction'],
        ['lens', 'Cluster lensing concentration'],
        ['populated', 'Populated system']
      ]);
    }

    function gravityStreamlines() {
      const seed = clusterSeedInput?.value.trim() || 'cluster';
      const rng = randomFor(`${seed}:gravity-wood-grain-v2`);
      const sources = [
        ...state.entries.map(entry => ({
          position:entry.position,
          weight:entry.mass * 1.15,
          capture:state.maxRadius * .035
        })),
        ...state.lensingNodes.map(node => ({
          position:node.position,
          weight:node.strength * .72,
          capture:state.maxRadius * .025
        }))
      ];
      const lines = [];
      const center = weightedBarycenter(state.entries);
      const shellRadius = state.maxRadius * 1.12;
      const lineCount = Math.min(170, 88 + state.entries.length * 7);

      for (let index = 0; index < lineCount; index += 1) {
        const direction = randomUnitVector(rng);
        const jitter = .72 + rng() * .34;
        let point = {
          x:center.x + direction.x * shellRadius * jitter,
          y:center.y + direction.y * shellRadius * jitter,
          z:center.z + direction.z * shellRadius * jitter
        };
        const modelPoints = [];
        let densityTotal = 0;
        let depthTotal = 0;

        for (let step = 0; step < 72; step += 1) {
          modelPoints.push({...point});
          const fieldVector = gravityVector(point, sources);
          const strength = magnitude(fieldVector);
          if (!Number.isFinite(strength) || strength <= 0) break;
          densityTotal += strength;
          depthTotal += point.z / state.maxRadius;
          const unit = {
            x:fieldVector.x / strength,
            y:fieldVector.y / strength,
            z:fieldVector.z / strength
          };
          const stepLength = state.maxRadius * (.016 + Math.min(.022, Math.log1p(strength * 1e10) * .002));
          point = {
            x:point.x + unit.x * stepLength,
            y:point.y + unit.y * stepLength,
            z:point.z + unit.z * stepLength
          };
          if (sources.some(source => distance3(point, source.position) < source.capture)) {
            modelPoints.push({...point});
            break;
          }
          if (distance3(point, center) > shellRadius * 1.35) break;
        }

        const points = modelPoints.map(model => projectClusterPoint(model));
        const averageDensity = densityTotal / Math.max(1, modelPoints.length);
        const depth = depthTotal / Math.max(1, modelPoints.length);
        lines.push({
          points,
          opacity:Math.max(.12, Math.min(.68, .19 + Math.log1p(averageDensity * 1e10) * .09 + (depth + 1) * .035)),
          width:Math.max(.55, Math.min(2.8, .65 + Math.log1p(averageDensity * 1e10) * .38))
        });
      }
      return lines;
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

    function drawLensingNodes() {
      const group = svg('g', {class:'exo-cluster-lensing-layer'});
      for (const node of [...state.lensingNodes].sort((a, b) => a.projected.z - b.projected.z)) {
        const radius = 6 + node.strength * 3.1;
        group.append(svg('circle', {
          cx:node.projected.x,
          cy:node.projected.y,
          r:radius * 2.1,
          class:'exo-cluster-lens-halo',
          opacity:Math.min(.72, .24 + node.strength * .17)
        }));
        group.append(svg('circle', {
          cx:node.projected.x,
          cy:node.projected.y,
          r:radius,
          class:'exo-cluster-lens-core'
        }));
        const label = svg('text', {
          x:node.projected.x + radius + 7,
          y:node.projected.y - radius - 3,
          class:'exo-cluster-lens-label'
        });
        label.textContent = `L${node.id.split('-').at(-1)} · ${node.strength.toFixed(2)} curvature`;
        group.append(label);
      }
      map.append(group);
    }

    function drawStarNodes() {
      const group = svg('g', {class:'exo-connected-star-layer'});
      const selectedSeed = systemSeedInput?.value.trim();
      const entries = [...state.entries].sort((a, b) => a.projected.z - b.projected.z);
      for (const entry of entries) {
        const selected = entry.seed === selectedSeed;
        const node = svg('g', {
          class:`exo-connected-star${entry.populated ? ' is-populated' : ''}${selected ? ' is-selected' : ''}`,
          tabindex:'0',
          role:'button',
          'aria-label':`Open ${entry.name}; nearest neighbor ${formatAu(entry.nearest?.distance)}`
        });
        const haloRadius = (selected ? 16 : 11) * entry.projected.perspective;
        const coreRadius = (entry.populated ? 6 : 4.6) * entry.projected.perspective;
        node.append(
          svg('circle', {
            cx:entry.projected.x,
            cy:entry.projected.y,
            r:haloRadius,
            class:'exo-connected-star-halo'
          }),
          svg('circle', {
            cx:entry.projected.x,
            cy:entry.projected.y,
            r:coreRadius,
            class:'exo-connected-star-core'
          })
        );
        const label = svg('text', {
          x:entry.projected.x + 10,
          y:entry.projected.y - 10,
          class:'exo-connected-star-label'
        });
        label.textContent = entry.name;
        node.append(label);
        const activate = () => entry.open?.click();
        node.addEventListener('click', activate);
        node.addEventListener('keydown', event => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            activate();
          }
        });
        group.append(node);
      }
      map.append(group);
    }

    function drawLegend(items) {
      const legend = svg('g', {class:'exo-cluster-map-legend'});
      items.forEach(([kind, label], index) => {
        const y = 486 - index * 22;
        if (kind === 'nearest' || kind === 'bridge' || kind === 'flow') {
          legend.append(svg('line', {
            x1:26,
            y1:y,
            x2:58,
            y2:y,
            class:`exo-legend-sample ${kind}`
          }));
        } else {
          legend.append(svg('circle', {
            cx:42,
            cy:y,
            r:kind === 'lens' ? 6 : 5,
            class:`exo-legend-dot ${kind}`
          }));
        }
        const text = svg('text', {x:68, y:y + 4, class:'exo-cluster-legend-label'});
        text.textContent = label;
        legend.append(text);
      });
      map.append(legend);
    }

    function updateCompatibilityReadout() {
      const selected = state.selectedNearestAu;
      compatibilityReadout.textContent = selected
        ? `Selected system nearest neighbor: ${formatAu(selected)}`
        : `${state.entries.length} systems positioned`;
    }

    function updateReadout(message) {
      const output = $('exo-cluster-network-readout');
      if (output) output.textContent = message;
    }

    function pathData(points) {
      return points.map((point, index) => `${index ? 'L' : 'M'} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`).join(' ');
    }

    function svg(tag, attributes = {}) {
      const element = document.createElementNS(SVG_NS, tag);
      for (const [key, value] of Object.entries(attributes)) element.setAttribute(key, String(value));
      return element;
    }

    function distance3(a, b) {
      return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
    }

    function magnitude(point) {
      return Math.hypot(point.x, point.y, point.z);
    }

    function formatAu(value) {
      if (!Number.isFinite(value)) return 'unknown';
      if (value >= 1000000) return `${(value / 1000000).toFixed(2)}M AU`;
      if (value >= 1000) return `${Math.round(value).toLocaleString()} AU`;
      return `${value.toFixed(2)} AU`;
    }
  }

  waitForClusterMap();
})();
