(() => {
  'use strict';

  const AU_PER_LIGHT_YEAR = 63241.077;
  const MERGE_RADIUS_AU = 1000;
  const PRESET_SEED = 'EXAMPLE';

  // Approximate J2000 equatorial positions and contemporary distance estimates.
  // This is a cartographic preset, not a precision astrometric catalogue.
  const NEIGHBORHOOD = [
    {name:'Sol', star:'G2V yellow dwarf', mass:1.0000, ra:0, dec:0, distanceLy:0, note:'Solar System origin'},
    {name:'Alpha Centauri', star:'G2V + K1V + M5.5V triple', mass:2.17, ra:219.9021, dec:-60.8339, distanceLy:4.367},
    {name:"Barnard's Star", star:'M4V red dwarf', mass:0.162, ra:269.4521, dec:4.6934, distanceLy:5.963},
    {name:'Luhman 16', star:'L7.5 + T0.5 brown-dwarf binary', mass:0.060, ra:162.3281, dec:-53.3195, distanceLy:6.503},
    {name:'Wolf 359', star:'M6V red dwarf', mass:0.090, ra:164.1205, dec:7.0147, distanceLy:7.856},
    {name:'Lalande 21185', star:'M2V red dwarf', mass:0.389, ra:165.8342, dec:35.9699, distanceLy:8.307},
    {name:'Sirius', star:'A1V + DA2 binary', mass:3.08, ra:101.2872, dec:-16.7161, distanceLy:8.60},
    {name:'Luyten 726-8', star:'M5.5V + M6V binary', mass:0.20, ra:24.7554, dec:-17.9503, distanceLy:8.73},
    {name:'Ross 154', star:'M3.5V red dwarf', mass:0.17, ra:282.4558, dec:-23.8361, distanceLy:9.69},
    {name:'Ross 248', star:'M6V red dwarf', mass:0.12, ra:355.4779, dec:44.1767, distanceLy:10.32},
    {name:'Epsilon Eridani', star:'K2V orange dwarf', mass:0.82, ra:53.2327, dec:-9.4583, distanceLy:10.48},
    {name:'Lacaille 9352', star:'M0.5V red dwarf', mass:0.49, ra:346.4668, dec:-35.8531, distanceLy:10.72},
    {name:'Ross 128', star:'M4V red dwarf', mass:0.17, ra:176.9350, dec:0.8040, distanceLy:11.03},
    {name:'EZ Aquarii', star:'M-dwarf triple system', mass:0.33, ra:339.6380, dec:-15.3000, distanceLy:11.11},
    {name:'61 Cygni', star:'K5V + K7V binary', mass:1.33, ra:316.7248, dec:38.7494, distanceLy:11.40},
    {name:'Procyon', star:'F5IV-V + DQZ white dwarf binary', mass:2.10, ra:114.8255, dec:5.2250, distanceLy:11.46},
    {name:'Struve 2398', star:'M3V + M3.5V binary', mass:0.60, ra:280.6958, dec:59.6300, distanceLy:11.52},
    {name:'Groombridge 34', star:'M1.5V + M3.5V binary', mass:0.58, ra:4.5954, dec:44.0228, distanceLy:11.62},
    {name:'Epsilon Indi', star:'K5V + brown-dwarf pair', mass:0.80, ra:330.8408, dec:-56.7859, distanceLy:11.87},
    {name:'Tau Ceti', star:'G8V yellow dwarf', mass:0.78, ra:26.0170, dec:-15.9375, distanceLy:11.91}
  ];

  const $ = id => document.getElementById(id);

  function waitForDependencies(attempt = 0) {
    const model = globalThis.BlacklightExoLensingModel;
    const grid = $('exo-cluster-grid');
    const seedInput = $('exo-cluster-seed');
    if (!model || !model.systemMassCalibrated || !grid || !seedInput) {
      if (attempt < 480) requestAnimationFrame(() => waitForDependencies(attempt + 1));
      return;
    }
    initialize(model, grid, seedInput);
  }

  function initialize(base, grid, seedInput) {
    if (base.exampleNeighborhoodCalibrated) return;
    const originalBuildScene = base.buildScene;

    function buildScene(entries, clusterSeed, options = {}) {
      if (String(clusterSeed || '').trim().toUpperCase() !== PRESET_SEED) {
        return originalBuildScene(entries, clusterSeed, options);
      }

      const mapped = entries.slice(0, NEIGHBORHOOD.length).map((entry, index) => {
        const preset = NEIGHBORHOOD[index];
        const measured = globalThis.BlacklightExoSystemMasses?.get(entry.seed);
        const orbitingMass = measured
          ? measured.planetaryMassSolar + measured.beltMassSolar
          : Number(entry.planetaryMass) || 0;
        return {
          ...entry,
          name: preset.name,
          star: preset.star,
          stellarMass: preset.mass,
          planetaryMass: orbitingMass,
          mass: preset.mass + orbitingMass,
          realNeighborhood: true,
          catalogDistanceLy: preset.distanceLy,
          catalogRaDeg: preset.ra,
          catalogDecDeg: preset.dec
        };
      });

      const scene = originalBuildScene(mapped, PRESET_SEED, options);
      applyFixedGeometry(scene, base, options);
      scene.realNeighborhoodPreset = true;
      scene.astrometryFrame = 'Approximate heliocentric J2000 equatorial Cartesian';
      scene.astrometrySource = 'Gaia EDR3 GCNS and SIMBAD-derived rough reference values';
      return scene;
    }

    globalThis.BlacklightExoLensingModel = Object.freeze({
      ...base,
      buildScene,
      exampleNeighborhoodCalibrated: true,
      EXAMPLE_NEIGHBORHOOD: NEIGHBORHOOD.map(item => ({...item}))
    });

    const forcePresetCount = () => {
      if (seedInput.value.trim().toUpperCase() !== PRESET_SEED) return;
      seedInput.value = PRESET_SEED;
      const count = $('exo-cluster-count');
      if (count) count.value = '20';
    };
    $('exo-generate-cluster')?.addEventListener('click', forcePresetCount, true);
    seedInput.addEventListener('keydown', event => {
      if (event.key === 'Enter') forcePresetCount();
    }, true);

    new MutationObserver(() => applyPresetCards(grid, seedInput))
      .observe(grid, {childList: true, subtree: true});
    document.addEventListener('blacklight:system-mass-measured', () => applyPresetCards(grid, seedInput));
    requestAnimationFrame(() => applyPresetCards(grid, seedInput));
  }

  function applyPresetCards(grid, seedInput) {
    if (seedInput.value.trim().toUpperCase() !== PRESET_SEED) return;
    const cards = [...grid.querySelectorAll('.exo-cluster-card')];
    if (!cards.length) return;

    cards.slice(0, NEIGHBORHOOD.length).forEach((card, index) => {
      const preset = NEIGHBORHOOD[index];
      if (!preset || card.dataset.realNeighborhood === 'true') return;
      const seed = card.querySelector('.exo-cluster-seed')?.textContent.trim() || '';
      const measured = globalThis.BlacklightExoSystemMasses?.get(seed);
      const orbitingSolar = measured
        ? measured.planetaryMassSolar + measured.beltMassSolar
        : 0;
      const totalMass = preset.mass + orbitingSolar;

      card.dataset.realNeighborhood = 'true';
      card.dataset.catalogName = preset.name;
      card.dataset.stellarMass = String(preset.mass);
      card.dataset.planetaryMass = String(orbitingSolar);
      card.dataset.systemMass = String(totalMass);
      card.dataset.distanceLy = String(preset.distanceLy);
      card.querySelector('h3').textContent = preset.name;
      card.querySelector('.exo-cluster-primary').textContent = preset.star;

      const populated = index === 0;
      card.classList.toggle('is-populated', populated);
      const badge = card.querySelector('.exo-population-badge');
      if (badge) {
        badge.className = `exo-population-badge ${populated ? 'populated' : 'unpopulated'}`;
        badge.textContent = populated ? 'Populated · Earth' : 'No confirmed population';
      }

      const metrics = card.querySelector('.exo-cluster-metrics');
      if (metrics) {
        metrics.dataset.realPreset = 'true';
        metrics.replaceChildren(
          metric('Distance', preset.distanceLy ? `${preset.distanceLy.toFixed(2)} ly` : 'Origin'),
          metric('Stellar mass', `${preset.mass.toFixed(preset.mass < 0.1 ? 3 : 2)} M☉`),
          metric('Generated orbiting mass', measured ? `${(measured.planetMassEarth + measured.moonMassEarth).toFixed(2)} M⊕` : 'Pending'),
          metric('Total modeled mass', `${totalMass.toFixed(totalMass >= 1 ? 6 : 7)} M☉`)
        );
      }

      const note = document.createElement('p');
      note.className = 'exo-real-neighborhood-note';
      note.textContent = 'Approximate real astrometry; opened planetary system remains a generated EXO scenario.';
      card.querySelector('.exo-cluster-seed')?.insertAdjacentElement('beforebegin', note);
    });

    const systems = $('exo-cluster-summary-systems');
    const populated = $('exo-cluster-summary-populated');
    const habitable = $('exo-cluster-summary-habitable');
    const status = $('exo-cluster-status');
    if (systems) systems.textContent = String(Math.min(cards.length, NEIGHBORHOOD.length));
    if (populated) populated.textContent = '1';
    if (habitable) habitable.textContent = '1';
    if (status) {
      status.textContent = 'EXAMPLE preset: approximate Sol-centered nearby stellar neighborhood. Positions and stellar masses are fixed; planetary interiors remain generated scenarios.';
      status.dataset.state = 'ready';
    }
  }

  function metric(label, value) {
    const wrapper = document.createElement('div');
    const dt = document.createElement('dt');
    const dd = document.createElement('dd');
    dt.textContent = label;
    dd.textContent = value;
    wrapper.append(dt, dd);
    return wrapper;
  }

  function applyFixedGeometry(scene, model, options) {
    const oldMax = Math.max(1, scene.maxRadius || 1);
    scene.entries.forEach((entry, index) => {
      const preset = NEIGHBORHOOD[index];
      entry.position = equatorialPosition(preset.ra, preset.dec, preset.distanceLy);
      entry.name = preset.name;
      entry.star = preset.star;
      entry.stellarMass = preset.mass;
      entry.mass = Number(entry.mass) || preset.mass;
    });

    const newMax = Math.max(1, ...scene.entries.map(entry => magnitude(entry.position)));
    const scale = newMax / oldMax;
    for (const collection of [scene.protostars, scene.darkMasses, scene.nebulae]) {
      for (const item of collection || []) item.position = scalePoint(item.position, scale);
    }
    for (const nebula of scene.nebulae || []) {
      if (!nebula.radius) continue;
      nebula.radius = {
        x: nebula.radius.x * scale,
        y: nebula.radius.y * scale,
        z: nebula.radius.z * scale
      };
    }

    scene.maxRadius = newMax;
    scene.clusterDiameterAu = maximumPairDistance(scene.entries.map(entry => entry.position));
    scene.edges = connectedNearestGraph(scene.entries, model.distance3);
    scene.lensingNodes = rebuildLensingNodes(scene, model, scale, Number(options.mergeRadiusAu) || MERGE_RADIUS_AU);
  }

  function rebuildLensingNodes(scene, model, scale, mergeRadiusAu) {
    const sources = sourceIndex(scene, model);
    const pairs = new Map();
    for (const node of scene.lensingNodes || []) {
      for (const connection of node.connections || []) {
        const a = resolveSource(connection.fromId, connection.fromName, connection.fromPosition, connection.fromMass, connection.fromWeight, sources, scale);
        const b = resolveSource(connection.toId, connection.toName, connection.toPosition, connection.toMass, connection.toWeight, sources, scale);
        if (!a || !b || a.id === b.id) continue;
        const key = [a.id, b.id].sort().join('::');
        if (!pairs.has(key)) pairs.set(key, {a, b, anomaly: Boolean(node.anomaly), reasons: new Set()});
        const pair = pairs.get(key);
        pair.anomaly ||= Boolean(node.anomaly);
        for (const reason of connection.reasons || ['mass influence']) pair.reasons.add(reason);
      }
    }

    const raw = [...pairs.values()].map((pair, index) => {
      const weightA = balanceWeight(pair.a);
      const weightB = balanceWeight(pair.b);
      const fraction = boundedFraction(weightA, weightB);
      const distanceAu = distance3(pair.a.position, pair.b.position);
      return {
        id: `example-derived-${index + 1}`,
        anomaly: pair.anomaly,
        position: interpolate(pair.a.position, pair.b.position, fraction),
        rawStrength: pairInfluence(pair.a, pair.b, scene.maxRadius),
        connections: [{
          kind:'derived',
          fromId:pair.a.id,
          fromName:pair.a.name,
          fromCategory:pair.a.category,
          fromMass:pair.a.mass,
          fromPosition:{...pair.a.position},
          fromWeight:weightA,
          toId:pair.b.id,
          toName:pair.b.name,
          toCategory:pair.b.category,
          toMass:pair.b.mass,
          toPosition:{...pair.b.position},
          toWeight:weightB,
          distanceAu,
          balanceFractionFromA:fraction,
          midpointOffsetAu:Math.abs(fraction - 0.5) * distanceAu,
          dominantSource:weightA >= weightB ? pair.a.name : pair.b.name,
          reasons:[...pair.reasons, 'EXAMPLE fixed-neighborhood geometry']
        }]
      };
    });
    return mergeNearby(raw, mergeRadiusAu);
  }

  function sourceIndex(scene, model) {
    const map = new Map();
    const add = source => map.set(source.id, source);
    for (const entry of scene.entries || []) add({
      id:`system:${entry.seed}`, category:'system', name:entry.name, mass:entry.mass,
      effectiveMass:entry.mass, sizeFactor:model.volumeFactor?.(entry.star || '') || 1,
      position:entry.position
    });
    for (const item of scene.protostars || []) add({
      id:item.id, category:item.category, name:item.name, mass:item.mass,
      effectiveMass:item.mass * 0.88, sizeFactor:1.08, position:item.position
    });
    for (const item of scene.darkMasses || []) add({
      id:item.id, category:item.category, name:item.name, mass:item.mass,
      effectiveMass:item.mass, sizeFactor:1, position:item.position
    });
    for (const item of scene.nebulae || []) add({
      id:item.id, category:item.category, name:item.name, mass:item.mass,
      effectiveMass:Math.sqrt(item.mass) * (0.35 + item.density * 0.65),
      sizeFactor:1.3, position:item.position
    });
    return map;
  }

  function resolveSource(id, name, storedPosition, mass, storedWeight, sources, scale) {
    if (id && sources.has(id)) return sources.get(id);
    if (!storedPosition) return null;
    return {
      id:id || `unresolved:${name}`,
      category:id?.startsWith('anomaly') ? 'anomaly-source' : 'unresolved',
      name:name || 'Unresolved curvature source',
      mass:Math.max(0.00001, Number(mass) || 0.00001),
      effectiveMass:Math.max(0.00001, Number(storedWeight) || Number(mass) || 0.00001),
      sizeFactor:1,
      position:scalePoint(storedPosition, scale)
    };
  }

  function connectedNearestGraph(entries, distanceFunction) {
    const edges = new Map();
    const keyFor = (a, b) => [a.index, b.index].sort((x, y) => x - y).join(':');
    for (const entry of entries) {
      let nearest = null;
      for (const candidate of entries) {
        if (candidate === entry) continue;
        const distance = distanceFunction(entry.position, candidate.position);
        if (!nearest || distance < nearest.distance) nearest = {candidate, distance};
      }
      entry.nearest = nearest;
      if (nearest) edges.set(keyFor(entry, nearest.candidate), {
        key:keyFor(entry, nearest.candidate), from:entry, to:nearest.candidate,
        distance:nearest.distance, bridge:false
      });
    }
    while (components(entries, [...edges.values()]).length > 1) {
      const groups = components(entries, [...edges.values()]);
      let bridge = null;
      for (let left = 0; left < groups.length; left += 1) {
        for (let right = left + 1; right < groups.length; right += 1) {
          for (const from of groups[left]) for (const to of groups[right]) {
            const distance = distanceFunction(from.position, to.position);
            if (!bridge || distance < bridge.distance) bridge = {from, to, distance};
          }
        }
      }
      if (!bridge) break;
      const key = keyFor(bridge.from, bridge.to);
      edges.set(key, {...bridge, key, bridge:true});
    }
    return [...edges.values()];
  }

  function components(entries, edges) {
    const parent = new Map(entries.map(entry => [entry.index, entry.index]));
    const find = value => {
      if (parent.get(value) !== value) parent.set(value, find(parent.get(value)));
      return parent.get(value);
    };
    for (const edge of edges) {
      const a = find(edge.from.index);
      const b = find(edge.to.index);
      if (a !== b) parent.set(b, a);
    }
    const groups = new Map();
    for (const entry of entries) {
      const root = find(entry.index);
      if (!groups.has(root)) groups.set(root, []);
      groups.get(root).push(entry);
    }
    return [...groups.values()];
  }

  function mergeNearby(nodes, radius) {
    if (!nodes.length) return [];
    const parent = nodes.map((_, index) => index);
    const find = index => parent[index] === index ? index : (parent[index] = find(parent[index]));
    const union = (a, b) => {
      const left = find(a);
      const right = find(b);
      if (left !== right) parent[right] = left;
    };
    for (let left = 0; left < nodes.length; left += 1) {
      for (let right = left + 1; right < nodes.length; right += 1) {
        if (distance3(nodes[left].position, nodes[right].position) <= radius) union(left, right);
      }
    }
    const groups = new Map();
    nodes.forEach((node, index) => {
      const root = find(index);
      if (!groups.has(root)) groups.set(root, []);
      groups.get(root).push(node);
    });
    const merged = [...groups.values()].map(group => {
      const total = group.reduce((sum, node) => sum + node.rawStrength, 0) || 1;
      const position = group.reduce((point, node) => ({
        x:point.x + node.position.x * node.rawStrength / total,
        y:point.y + node.position.y * node.rawStrength / total,
        z:point.z + node.position.z * node.rawStrength / total
      }), {x:0, y:0, z:0});
      return {
        id:`example-aggregate-${hashString(group.map(node => node.id).sort().join('|')).toString(36)}`,
        position,
        rawStrength:group.reduce((sum, node) => sum + node.rawStrength, 0),
        anomaly:group.some(node => node.anomaly),
        mergedPointCount:group.length,
        connections:group.flatMap(node => node.connections),
        placementMethod:'fixed real-neighborhood bounded midpoint'
      };
    });
    const maximum = Math.max(...merged.map(node => node.rawStrength), 1e-9);
    merged.sort((a, b) => b.rawStrength - a.rawStrength);
    merged.forEach((node, index) => {
      const normalized = Math.sqrt(node.rawStrength / maximum);
      node.strength = 0.25 + normalized * 2.75;
      node.displayRadius = 3.5 + Math.log2(node.connections.length + 1) * 1.7 + normalized * 4.2;
      node.name = node.anomaly
        ? (node.connections.length > 1 ? 'Anomalous Aggregate Lensing Node' : 'Anomaly Gravitational Point')
        : `Aggregate Lensing Node ${String(index + 1).padStart(2, '0')}`;
    });
    return merged;
  }

  function equatorialPosition(raDeg, decDeg, distanceLy) {
    if (!distanceLy) return {x:0, y:0, z:0};
    const ra = raDeg * Math.PI / 180;
    const dec = decDeg * Math.PI / 180;
    const distance = distanceLy * AU_PER_LIGHT_YEAR;
    return {
      x:distance * Math.cos(dec) * Math.cos(ra),
      y:distance * Math.cos(dec) * Math.sin(ra),
      z:distance * Math.sin(dec)
    };
  }

  function balanceWeight(source) {
    return Math.pow(Math.max(1e-9, source.effectiveMass || source.mass || 1), 0.56) *
      Math.pow(Math.max(0.2, source.sizeFactor || 1), 0.44);
  }

  function boundedFraction(weightA, weightB) {
    return clamp(0.5 + 0.22 * Math.tanh(Math.log(weightB / weightA) / 1.8), 0.28, 0.72);
  }

  function pairInfluence(a, b, maxRadius) {
    const normalized = distance3(a.position, b.position) / Math.max(1, maxRadius);
    return Math.sqrt(balanceWeight(a) * balanceWeight(b)) / Math.pow(0.035 + normalized, 1.18);
  }

  function interpolate(a, b, amount) {
    return {x:a.x + (b.x-a.x)*amount, y:a.y + (b.y-a.y)*amount, z:a.z + (b.z-a.z)*amount};
  }
  function distance3(a, b) { return Math.hypot(a.x-b.x, a.y-b.y, a.z-b.z); }
  function magnitude(point) { return Math.hypot(point.x, point.y, point.z); }
  function scalePoint(point, scale) { return {x:point.x*scale, y:point.y*scale, z:point.z*scale}; }
  function maximumPairDistance(points) {
    let maximum = 0;
    for (let a = 0; a < points.length; a += 1) for (let b = a + 1; b < points.length; b += 1) {
      maximum = Math.max(maximum, distance3(points[a], points[b]));
    }
    return maximum;
  }
  function clamp(value, minimum, maximum) { return Math.min(maximum, Math.max(minimum, value)); }
  function hashString(value) {
    let hash = 2166136261;
    for (const character of String(value)) {
      hash ^= character.charCodeAt(0);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  waitForDependencies();
})();
