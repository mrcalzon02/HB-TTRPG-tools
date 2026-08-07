(() => {
  'use strict';

  const THREE_URL = 'https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.min.js';
  const ORBIT_URL = 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js';
  const PLANET_PROFILE_URL = 'assets/warhammer-40k/shaders/planet-profile-v1.js?v=3';
  const PLANET_COMPOSITOR_URL = 'assets/warhammer-40k/shaders/planet-compositor-v1.js?v=3';
  const MODES = new Set(['select', 'orbit', 'pan', 'zoom']);
  const PASSIVE_DWELL = 26000;
  const PASSIVE_ORBIT_SPEED = 0.000035;
  const loads = new Map();
  let planetCompositorPromise = null;
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

  function loadScript(src) {
    if (loads.has(src)) return loads.get(src);
    const resolved = new URL(src, document.baseURI).href;
    const existing = [...document.scripts].find(script => script.src === resolved);
    if (existing?.dataset.cafarronLoaded === 'true') return Promise.resolve();
    const promise = new Promise((resolve, reject) => {
      const script = existing || document.createElement('script');
      const done = () => { script.dataset.cafarronLoaded = 'true'; resolve(); };
      script.addEventListener('load', done, { once: true });
      script.addEventListener('error', () => reject(new Error(`${src} could not be loaded.`)), { once: true });
      if (!existing) {
        script.src = src;
        script.async = false;
        script.crossOrigin = 'anonymous';
        document.head.appendChild(script);
      }
    });
    loads.set(src, promise);
    promise.catch(() => loads.delete(src));
    return promise;
  }

  async function three() {
    if (!window.THREE?.OrbitControls) {
      await loadScript(THREE_URL);
      await loadScript(ORBIT_URL);
    }
    if (!window.THREE?.OrbitControls) throw new Error('Navis survey controls failed to answer the invocation rite.');
    return window.THREE;
  }

  async function planetaryCompositor() {
    if (!planetCompositorPromise) {
      planetCompositorPromise = (async () => {
        if (!window.CafarronPlanetProfileV1) await loadScript(PLANET_PROFILE_URL);
        if (!window.CafarronPlanetCompositorV1) await loadScript(PLANET_COMPOSITOR_URL);
        const profileEngine = window.CafarronPlanetProfileV1, compositor = window.CafarronPlanetCompositorV1;
        if (!profileEngine?.createProfile || !compositor?.compose || !compositor?.materialFromTextures || !compositor?.layerMaterialsFromTextures) throw new Error('Planetary composition cogitators failed to answer.');
        return { profileEngine, compositor };
      })();
      planetCompositorPromise.catch(() => { planetCompositorPromise = null; });
    }
    return planetCompositorPromise;
  }

  function hash(value) {
    let result = 2166136261;
    for (const character of String(value || '')) {
      result ^= character.charCodeAt(0);
      result = Math.imul(result, 16777619);
    }
    return result >>> 0;
  }

  function random(seed) {
    let value = seed >>> 0;
    return () => {
      value += 0x6d2b79f5;
      let next = value;
      next = Math.imul(next ^ (next >>> 15), next | 1);
      next ^= next + Math.imul(next ^ (next >>> 7), next | 61);
      return ((next ^ (next >>> 14)) >>> 0) / 4294967296;
    };
  }

  function classifyWorldTemplate(text) {
    const value = String(text || '').toLowerCase();
    if (/forge world|forge-world|mechanicus|adeptus mechanicus|manufactorum|industrial world|industrial complex|foundry world/.test(value)) return 'forge';
    if (/desert|arid|dune|sand world|dust world|wasteland/.test(value)) return 'desert';
    if (/ice world|ice-bound|icebound|glacial|frozen world|frost world|cryogenic|polar world|tundra/.test(value)) return 'ice';
    return 'unsealed';
  }

  function registeredPlanetFallbackMaterial(THREE, fallbackColor) {
    return new THREE.MeshStandardMaterial({ color: fallbackColor, emissive: fallbackColor, emissiveIntensity: 0.12, roughness: 0.78, metalness: 0.06 });
  }

  function routeStyle(layer) { return { 'major-warp': [0xd8b35e, 0.82, false, 0, 0], trade: [0x4fa3a5, 0.72, true, 2.8, 1.25], 'local-navigation': [0x7390bd, 0.52, true, 1.35, 1.25], exploratory: [0xe2e5df, 0.19, true, 0.7, 1.45] }[layer] || [0x817963, 0.4, true, 1.2, 1.2]; }
  function routeCurves(THREE, route, nodes) { const points = route.nodeIds.map(id => nodes.get(id)).filter(Boolean), curves = []; for (let index = 0; index < points.length - 1; index += 1) { const start = new THREE.Vector3(...points[index].position), end = new THREE.Vector3(...points[index + 1].position), distance = start.distanceTo(end), middle = start.clone().add(end).multiplyScalar(0.5); middle.y += clamp(distance * 0.065, 2.2, 9.5); middle.z += (index % 2 ? -1 : 1) * clamp(distance * 0.03, 0.9, 4.8); curves.push(new THREE.QuadraticBezierCurve3(start, middle, end)); } return curves; }
  function routeGroup(THREE, route, nodes) { const group = new THREE.Group(); routeCurves(THREE, route, nodes).forEach(curve => { const geometry = new THREE.BufferGeometry().setFromPoints(curve.getPoints(48)); const [color, opacity, dashed, dashSize, gapSize] = routeStyle(route.layer); const material = dashed ? new THREE.LineDashedMaterial({ color, transparent: true, opacity, dashSize, gapSize }) : new THREE.LineBasicMaterial({ color, transparent: true, opacity }); const line = new THREE.Line(geometry, material); if (dashed) line.computeLineDistances(); group.add(line); }); return group; }

  function roman(value) {
    const numerals = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
    return numerals[value - 1] || String(value);
  }

  function systemIdentityText(node, records) { return [node.id, node.name, ...records.flatMap(record => [record.name, record.objectType, record.classification, record.environment])].join('|'); }

  function systemProfile(node, records) {
    const text = systemIdentityText(node, records), roll = random(hash(text)), recordText = text.toLowerCase();
    const starColors = [0xffd88a, 0xffb56b, 0xfff0c4, 0xc9ddff, 0xff8b58];
    const bodyColors = recordText.includes('forge') ? [0x8c3926, 0xc65a30, 0x4f5455, 0xd28a39] : recordText.includes('desert') ? [0xc79b5c, 0x9b5737, 0xd6bd7a, 0x6d4933] : recordText.includes('ice') || recordText.includes('frozen') ? [0xd9f3ff, 0x91bed0, 0xe9f6f4, 0x718da8] : recordText.includes('dead') || recordText.includes('tomb') ? [0x77756f, 0x4f5352, 0x999589, 0x343838] : [0x5d9f83, 0xc59a58, 0x738da8, 0x8c6651, 0xb8b36e];
    const template = classifyWorldTemplate(recordText), count = clamp(3 + Math.floor(roll() * 5), 3, 7), registeredIndex = Math.min(count - 1, 1 + Math.floor(roll() * Math.max(1, count - 1)));
    const baseName = String(node.name || 'Surveyed System').replace(/\s+System$/i, '').trim() || 'Surveyed';
    const namedWorlds = records.filter(record => record.category === 'world' && record.name && !/\bsystem\b/i.test(record.name)).map(record => record.name);
    const namedStations = records.filter(record => record.category === 'station' && record.name).map(record => record.name);
    const stationCount = clamp(Math.max(namedStations.length, ['primary', 'guard-origin'].includes(node.layer) ? 1 : (roll() > 0.58 ? 1 : 0)), 0, 2);
    const anchorageCount = /fleet|navy|anchorage|battlefleet|militarum|guard/.test(recordText) || node.layer === 'guard-origin' ? 1 : (roll() > 0.84 ? 1 : 0);
    const beltCount = 1 + (roll() > 0.72 ? 1 : 0);
    return {
      seed: hash(text), template, baseName,
      starColor: starColors[Math.floor(roll() * starColors.length)],
      starScale: 0.62 + roll() * 0.32,
      registeredIndex, beltCount, stationCount, anchorageCount, namedStations,
      bodies: Array.from({ length: count }, (_, index) => ({
        name: index === registeredIndex && namedWorlds[0] ? namedWorlds[0] : `${baseName} ${roman(index + 1)}`,
        radius: 1.55 + index * 1.05 + roll() * 0.22,
        scale: 0.12 + roll() * 0.18 + (index === registeredIndex ? 0.1 : 0),
        color: bodyColors[Math.floor(roll() * bodyColors.length)],
        inclination: (roll() - 0.5) * 0.18,
        phase: roll() * Math.PI * 2,
        speed: 0.00018 / Math.sqrt(index + 1),
        moons: index === registeredIndex ? Math.floor(roll() * 3) : (roll() > 0.82 ? 1 : 0)
      }))
    };
  }

  function disposeMaterial(material) {
    if (!material) return;
    const disposed = new Set();
    ['map', 'bumpMap', 'normalMap', 'roughnessMap', 'metalnessMap', 'emissiveMap', 'alphaMap'].forEach(key => { const texture = material[key]; if (texture && !disposed.has(texture)) { disposed.add(texture); texture.dispose?.(); } });
    material.dispose?.();
  }
  function disposeObject(root) { if (!root) return; root.traverse(object => { object.geometry?.dispose?.(); const materials = Array.isArray(object.material) ? object.material : [object.material]; materials.filter(Boolean).forEach(disposeMaterial); }); root.removeFromParent(); }

  async function composeRegisteredPlanet(THREE, planet, systemGroup, node, records, seed, fallbackColor, template) {
    try {
      const { profileEngine, compositor } = await planetaryCompositor();
      const profile = profileEngine.createProfile(`${node.id}|registered-world|${seed}`, systemIdentityText(node, records), template);
      const textures = await compositor.compose(THREE, profile, { width: 256, height: 128 });
      const material = compositor.materialFromTextures(THREE, textures, fallbackColor);
      const { cloudMaterial, atmosphereMaterial } = compositor.layerMaterialsFromTextures(THREE, textures);
      const radius = Number(planet.geometry?.parameters?.radius || 0.25);
      const cloudLayer = new THREE.Mesh(new THREE.SphereGeometry(radius * 1.026, 24, 18), cloudMaterial);
      const atmosphereLayer = new THREE.Mesh(new THREE.SphereGeometry(radius * 1.10, 24, 18), atmosphereMaterial);
      cloudLayer.userData.planetLayer = 'clouds';
      atmosphereLayer.userData.planetLayer = 'atmosphere';
      if (!planet.parent || !systemGroup.parent) {
        disposeMaterial(material); disposeMaterial(cloudMaterial); disposeMaterial(atmosphereMaterial);
        cloudLayer.geometry.dispose(); atmosphereLayer.geometry.dispose();
        return;
      }
      const previous = planet.material;
      planet.material = material;
      planet.add(cloudLayer, atmosphereLayer);
      planet.userData.cloudLayer = cloudLayer;
      planet.userData.planetProfile = profile;
      disposeMaterial(previous);
    } catch (error) {
      console.warn(`${template} world composition rite failed for ${node.name || node.id}; retaining geological fallback.`, error);
    }
  }

  async function mount(options) {
    const { data, chart, stage, labelLayer, leaderLayer, status, initialMode = 'orbit', onSelect, onClear, onPassiveNode, onPassiveChange } = options;
    const THREE = await three(), labelsEngine = window.CafarronMapLabelsV7;
    if (!labelsEngine?.placeLocal) throw new Error('Cartographic label servitors failed to answer the local-system placement rite.');
    const mapNodes = chart.nodes(data), routes = chart.routes(data), nodeById = new Map(mapNodes.map(node => [node.id, node])), recordById = new Map(data.records.map(record => [record.id, record])), scene = new THREE.Scene();
    scene.background = new THREE.Color(0x030505); scene.fog = new THREE.FogExp2(0x030505, 0.0021);
    const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 1200), homeTarget = new THREE.Vector3(18, 0, 0), homePosition = new THREE.Vector3(38, 78, 182); camera.position.copy(homePosition);
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' }); renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2)); renderer.outputEncoding = THREE.sRGBEncoding; stage.insertBefore(renderer.domElement, leaderLayer);
    const controls = new THREE.OrbitControls(camera, renderer.domElement); Object.assign(controls, { enableDamping: true, dampingFactor: 0.022, rotateSpeed: 0.12, panSpeed: 0.135, zoomSpeed: 0.15, keyPanSpeed: 2, screenSpacePanning: true, minDistance: 7, maxDistance: 360 }); controls.target.copy(homeTarget); controls.update();
    scene.add(new THREE.AmbientLight(0xb8aa85, 0.72)); const key = new THREE.DirectionalLight(0xffdfa0, 1.05); key.position.set(35, 55, 70); scene.add(key);
    const starData = []; for (let index = 0; index < 1000; index += 1) starData.push((Math.random() - 0.5) * 440, (Math.random() - 0.5) * 240, (Math.random() - 0.5) * 280); const starGeometry = new THREE.BufferGeometry(); starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starData, 3)); scene.add(new THREE.Points(starGeometry, new THREE.PointsMaterial({ color: 0xbcc5bf, size: 0.28, transparent: true, opacity: 0.46 })));
    const grid = new THREE.GridHelper(280, 28, 0x5b5139, 0x282923); grid.position.y = -38; grid.material.transparent = true; grid.material.opacity = 0.22; scene.add(grid);
    const groups = Object.fromEntries(['nodes', 'systems', 'ambient-traffic', 'regions', 'hazards', 'route-major-warp', 'route-trade', 'route-local-navigation', 'route-exploratory'].map(name => [name, new THREE.Group()])); Object.values(groups).forEach(group => scene.add(group));
    const visibility = { primary: true, supporting: true, 'guard-origin': true, provisional: false, unnamed: false, exploratory: true, regions: false, hazards: false, labels: true, 'route-major-warp': true, 'route-trade': true, 'route-local-navigation': false, 'route-exploratory': false };
    let mode = MODES.has(initialMode) ? initialMode : 'orbit', threat = 'all', selected = '', running = true, raf = 0, dirtyLabels = true, transition = null, pointerStart = null, passive = false, passiveDeadline = 0, passiveLastFrame = 0, passiveSequence = [], passiveIndex = -1, surveyTheatre = false, contactDocketOpen = false, fullAuspex = false, expandedSystem = null;
    const meshes = new Map(), pickables = [], labelRecords = new Map(), raycaster = new THREE.Raycaster(), pointer = new THREE.Vector2(), verticalAxis = new THREE.Vector3(0, 1, 0), ambientTraffic = [], envelopeEffects = [];
    const workspace = stage.closest('.wh-workspace'), shell = stage.closest('.wh-shell'), mapPanel = stage.closest('[data-panel="map"]'), mapLayout = stage.closest('.wh-map-layout'), mapCard = stage.closest('.wh-map-card'), details = mapLayout?.querySelector('.wh-map-details'), viewportConsole = stage.querySelector('.wh-viewport-console'), theatreToggle = stage.querySelector('#wh-survey-theatre-toggle'), fullAuspexToggle = stage.querySelector('#wh-full-auspex-toggle'), docketToggle = stage.querySelector('#wh-contact-docket-toggle'), vigilPanel = stage.querySelector('.wh-vigil-panel');
    if (!viewportConsole || !theatreToggle || !fullAuspexToggle || !docketToggle) throw new Error('Navis survey helm presentation controls are absent from the authoritative viewport.');
    stage.setAttribute('aria-label', 'Interactive three-dimensional Cafarron Corridor Navis survey. Select a contact for its docket; double-select a contact to enter local-system inspection; double-select empty survey space to restore the sector survey.');
    const threatColor = node => data.threatStates[node.threat]?.color || data.threatStates.unsurveyed.color, visibleNode = node => visibility[node.layer] !== false && (threat === 'all' || node.threat === threat), canonical = node => ['primary', 'supporting', 'guard-origin'].includes(node.layer), showLabel = node => !expandedSystem && visibleNode(node) && (passive ? node.id === selected : visibility.labels && (canonical(node) || node.id === selected));

    for (const node of mapNodes) {
      const scale = Math.max(0.42, Number(node.scale || 0.8)), color = threatColor(node), exploratory = node.layer === 'exploratory', guard = node.layer === 'guard-origin';
      const mesh = new THREE.Mesh(new THREE.SphereGeometry(scale, 18, 14), new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: exploratory ? 0.11 : guard ? 0.25 : 0.3, roughness: 0.5, metalness: 0.2, transparent: exploratory || guard, opacity: exploratory ? 0.58 : guard ? 0.92 : 1 })); mesh.position.set(...node.position); mesh.userData.nodeId = node.id; groups.nodes.add(mesh); meshes.set(node.id, mesh); pickables.push(mesh); mesh.add(new THREE.Mesh(new THREE.SphereGeometry(scale * 1.62, 14, 10), new THREE.MeshBasicMaterial({ color, wireframe: true, transparent: true, opacity: exploratory ? 0.07 : guard ? 0.15 : 0.16 })));
      const label = document.createElement('button'); label.type = 'button'; label.className = 'wh-map-label'; label.dataset.nodeId = node.id; label.dataset.layer = node.layer; label.textContent = node.name; label.hidden = true; label.addEventListener('click', () => selectNode(node.id, false)); label.addEventListener('dblclick', event => { event.preventDefault(); event.stopPropagation(); selectNode(node.id, true, false, true); }); labelLayer.appendChild(label);
      const leader = document.createElementNS('http://www.w3.org/2000/svg', 'line'); leader.hidden = true; leaderLayer.appendChild(leader); labelRecords.set(node.id, { node, mesh, label, leader });
    }

    routes.forEach(route => { const group = groups[`route-${route.layer}`]; if (group) group.add(routeGroup(THREE, route, nodeById)); const curves = routeCurves(THREE, route, nodeById), trafficCount = route.layer === 'major-warp' ? 3 : route.layer === 'trade' ? 2 : 1; curves.forEach((curve, curveIndex) => { for (let index = 0; index < trafficCount; index += 1) { const color = route.layer === 'major-warp' ? 0xe7c979 : route.layer === 'trade' ? 0x68bbb9 : route.layer === 'local-navigation' ? 0x91a9d0 : 0xd6dcd7, craft = new THREE.Mesh(new THREE.SphereGeometry(route.layer === 'major-warp' ? 0.12 : 0.085, 8, 6), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: route.layer === 'exploratory' ? 0.42 : 0.72 })); groups['ambient-traffic'].add(craft); ambientTraffic.push({ craft, curve, layer: `route-${route.layer}`, phase: (index / trafficCount + curveIndex * 0.21 + hash(route.id || route.name) * 0.000001) % 1, speed: (route.layer === 'major-warp' ? 0.000012 : route.layer === 'trade' ? 0.000008 : 0.000005) * (index % 2 ? -1 : 1) }); } }); });

    function addVolume(record, group, opacity, kind) { const color = data.threatStates[record.threat]?.color || 0xb49142, mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 18, 12), new THREE.MeshBasicMaterial({ color, wireframe: true, transparent: true, opacity })); mesh.position.set(...record.center); mesh.scale.set(...record.radii); group.add(mesh); const pulse = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 10), new THREE.MeshBasicMaterial({ color, wireframe: true, transparent: true, opacity: opacity * 0.72 })); pulse.position.copy(mesh.position); pulse.scale.copy(mesh.scale).multiplyScalar(0.72); group.add(pulse); const knotCount = kind === 'hazard' ? 9 : 5, knots = [], roll = random(hash(record.id || record.name || JSON.stringify(record.center))); for (let index = 0; index < knotCount; index += 1) { const knot = new THREE.Mesh(new THREE.SphereGeometry(kind === 'hazard' ? 0.22 : 0.14, 8, 6), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: kind === 'hazard' ? 0.38 : 0.18 })); knot.position.set(record.center[0] + (roll() - 0.5) * record.radii[0] * 1.4, record.center[1] + (roll() - 0.5) * record.radii[1] * 1.4, record.center[2] + (roll() - 0.5) * record.radii[2] * 1.4); group.add(knot); knots.push({ knot, phase: roll() * Math.PI * 2, speed: 0.00015 + roll() * 0.0002, amplitude: 0.08 + roll() * 0.2 }); } envelopeEffects.push({ mesh, pulse, knots, kind, baseOpacity: opacity, phase: roll() * Math.PI * 2 }); }
    data.regions.forEach(record => addVolume(record, groups.regions, 0.05, 'region')); data.hazards.forEach(record => addVolume(record, groups.hazards, 0.11, 'hazard'));

    function recordsFor(node) { return (node.recordIds || []).map(id => recordById.get(id)).filter(Boolean); }

    function makeSystemLabel(object, name, kind, priority = 0) {
      const label = document.createElement('div');
      label.className = 'wh-map-label';
      label.dataset.layer = 'local-system';
      label.dataset.systemObject = kind;
      label.textContent = name;
      label.hidden = true;
      label.style.pointerEvents = 'none';
      labelLayer.appendChild(label);
      const leader = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      leader.hidden = true;
      leader.setAttribute('stroke', kind === 'star' ? '#e0c77f' : '#b8aa85');
      leader.setAttribute('stroke-width', kind === 'star' ? '1.35' : '1');
      leader.setAttribute('stroke-opacity', kind === 'star' ? '0.82' : '0.62');
      leader.setAttribute('vector-effect', 'non-scaling-stroke');
      leaderLayer.appendChild(leader);
      return { object, name, kind, priority, label, leader };
    }

    function clearExpandedSystem() {
      if (!expandedSystem) return;
      expandedSystem.labels.forEach(record => { record.label.remove(); record.leader.remove(); });
      disposeObject(expandedSystem.group);
      expandedSystem = null;
      stage.dataset.viewContext = 'sector';
    }

    function expandSystem(node, records) {
      if (expandedSystem?.nodeId === node.id) return;
      clearExpandedSystem();
      const profile = systemProfile(node, records), group = new THREE.Group(), localObjects = [];
      group.position.set(...node.position); group.userData.nodeId = node.id;
      const star = new THREE.Mesh(new THREE.SphereGeometry(profile.starScale, 24, 18), new THREE.MeshBasicMaterial({ color: profile.starColor }));
      star.add(new THREE.Mesh(new THREE.SphereGeometry(profile.starScale * 1.18, 18, 12), new THREE.MeshBasicMaterial({ color: profile.starColor, transparent: true, opacity: 0.12, wireframe: true })));
      group.add(star);
      localObjects.push({ object: star, name: `${profile.baseName} Primary`, kind: 'star', priority: 100 });

      const moving = [];
      profile.bodies.forEach((body, index) => {
        const orbit = new THREE.Mesh(new THREE.RingGeometry(body.radius - 0.012, body.radius + 0.012, 72), new THREE.MeshBasicMaterial({ color: index === profile.registeredIndex ? 0xd9bc69 : 0x59645e, transparent: true, opacity: index === profile.registeredIndex ? 0.62 : 0.32, side: THREE.DoubleSide }));
        orbit.rotation.x = Math.PI / 2 + body.inclination; group.add(orbit);
        const pivot = new THREE.Group(); pivot.rotation.y = body.phase; pivot.rotation.z = body.inclination;
        const material = index === profile.registeredIndex ? registeredPlanetFallbackMaterial(THREE, body.color) : new THREE.MeshStandardMaterial({ color: body.color, roughness: 0.76, metalness: 0.08 });
        const planet = new THREE.Mesh(new THREE.SphereGeometry(body.scale, 22, 16), material); planet.position.x = body.radius;
        if (index === profile.registeredIndex && profile.template === 'unsealed') planet.add(new THREE.Mesh(new THREE.SphereGeometry(body.scale * 1.22, 16, 12), new THREE.MeshBasicMaterial({ color: 0xe0c77f, transparent: true, opacity: 0.13, wireframe: true })));
        pivot.add(planet);
        if (index === profile.registeredIndex && ['desert', 'forge', 'ice'].includes(profile.template)) void composeRegisteredPlanet(THREE, planet, group, node, records, profile.seed ^ index, body.color, profile.template);
        localObjects.push({ object: planet, name: body.name, kind: 'planet', priority: index === profile.registeredIndex ? 90 : 70 - index });
        for (let moonIndex = 0; moonIndex < body.moons; moonIndex += 1) {
          const moonPivot = new THREE.Group(); moonPivot.position.copy(planet.position); moonPivot.rotation.y = moonIndex * Math.PI + profile.seed * 0.0001;
          const moon = new THREE.Mesh(new THREE.SphereGeometry(Math.max(0.035, body.scale * 0.18), 10, 8), new THREE.MeshStandardMaterial({ color: 0xb7b5aa, roughness: 0.9 }));
          moon.position.x = body.scale * (1.7 + moonIndex * 0.7); moonPivot.add(moon); pivot.add(moonPivot);
          localObjects.push({ object: moon, name: `${body.name} · Moon ${roman(moonIndex + 1)}`, kind: 'moon', priority: 42 - moonIndex });
        }
        group.add(pivot); moving.push({ pivot, planet, speed: body.speed, moonSpeed: 0.00055 + index * 0.00008 });
      });

      const beltRoll = random(profile.seed ^ 0x42454c54);
      for (let beltIndex = 0; beltIndex < profile.beltCount; beltIndex += 1) {
        const radius = 2.15 + beltIndex * 2.35 + beltRoll() * 0.45, positions = [];
        for (let asteroid = 0; asteroid < 180; asteroid += 1) { const angle = beltRoll() * Math.PI * 2, distance = radius + (beltRoll() - 0.5) * 0.34; positions.push(Math.cos(angle) * distance, (beltRoll() - 0.5) * 0.12, Math.sin(angle) * distance); }
        const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        const belt = new THREE.Points(geometry, new THREE.PointsMaterial({ color: 0x9f9681, size: 0.038, transparent: true, opacity: 0.68 }));
        group.add(belt);
        const marker = new THREE.Object3D(); marker.position.set(radius, 0, 0); group.add(marker);
        localObjects.push({ object: marker, name: `${profile.baseName} Asteroid Belt ${roman(beltIndex + 1)}`, kind: 'asteroid-belt', priority: 34 - beltIndex });
      }

      for (let stationIndex = 0; stationIndex < profile.stationCount; stationIndex += 1) {
        const radius = 1.15 + stationIndex * 1.72, pivot = new THREE.Group(); pivot.rotation.y = profile.seed * 0.000013 + stationIndex * 2.27;
        const station = new THREE.Group(), core = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.05, 0.18), new THREE.MeshStandardMaterial({ color: 0xa39a82, emissive: 0x6d5426, emissiveIntensity: 0.28, roughness: 0.58, metalness: 0.5 })), ring = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.008, 5, 18), new THREE.MeshBasicMaterial({ color: 0xc5ab62 }));
        ring.rotation.x = Math.PI / 2; station.add(core, ring); station.position.x = radius; pivot.add(station); group.add(pivot);
        localObjects.push({ object: station, name: profile.namedStations[stationIndex] || `Orbital Station ${roman(stationIndex + 1)}`, kind: 'orbital-station', priority: 58 - stationIndex });
      }

      for (let anchorageIndex = 0; anchorageIndex < profile.anchorageCount; anchorageIndex += 1) {
        const radius = (profile.bodies.at(-1)?.radius || 6) + 0.72 + anchorageIndex * 0.8, pivot = new THREE.Group(); pivot.rotation.y = profile.seed * 0.000021 + 1.4 + anchorageIndex;
        const anchorage = new THREE.Group(); anchorage.position.x = radius;
        for (let shipIndex = 0; shipIndex < 3; shipIndex += 1) { const ship = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.15 + shipIndex * 0.02, 5), new THREE.MeshBasicMaterial({ color: 0x9fb7b2 })); ship.rotation.z = -Math.PI / 2; ship.position.set(0, (shipIndex - 1) * 0.06, (shipIndex - 1) * 0.045); anchorage.add(ship); }
        pivot.add(anchorage); group.add(pivot);
        localObjects.push({ object: anchorage, name: `Fleet Anchorage ${roman(anchorageIndex + 1)}`, kind: 'fleet-anchorage', priority: 52 - anchorageIndex });
      }

      const traffic = [], trafficCount = profile.template === 'forge' ? 8 : profile.template === 'desert' ? 4 : profile.template === 'ice' ? 5 : 3;
      for (let index = 0; index < trafficCount; index += 1) { const laneRadius = 1.1 + (index % 4) * 0.72 + (index >= 4 ? 0.22 : 0), pivot = new THREE.Group(); pivot.rotation.y = profile.seed * 0.00001 + index * (Math.PI * 2 / trafficCount); pivot.rotation.z = (index % 2 ? -1 : 1) * 0.06; const craftColor = profile.template === 'forge' ? 0xff7a35 : profile.template === 'desert' ? 0xf0c36a : profile.template === 'ice' ? 0xb9ecff : 0x9ed4d1, craft = new THREE.Mesh(new THREE.ConeGeometry(profile.template === 'forge' ? 0.035 : 0.026, profile.template === 'forge' ? 0.16 : 0.12, 5), new THREE.MeshBasicMaterial({ color: craftColor })); craft.rotation.z = -Math.PI / 2; craft.position.x = laneRadius; pivot.add(craft); group.add(pivot); traffic.push({ pivot, speed: (0.00024 + index * 0.000018) * (index % 2 ? -1 : 1) }); }

      groups.systems.add(group);
      const radius = Math.max((profile.bodies.at(-1)?.radius || 6) + (profile.anchorageCount ? 1.5 : 0), 6);
      expandedSystem = { nodeId: node.id, group, star, moving, traffic, template: profile.template, radius, labels: localObjects.map(item => makeSystemLabel(item.object, item.name, item.kind, item.priority)) };
      stage.dataset.viewContext = 'system';
      updateVisibility();
    }

    function description() { if (passive) return 'Passive Navis vigil is rotating through sanctioned contacts.'; if (expandedSystem) return 'Local-system inspection rite active.'; return { select: 'Auspex selection rite active.', orbit: 'Orbital rotation rite active under graduated resistance.', pan: 'Chart translation rite active under graduated resistance.', zoom: 'Magnification rite active under graduated resistance.' }[mode]; }
    function updateStatus() { status.textContent = expandedSystem ? `${nodeById.get(expandedSystem.nodeId)?.name || 'Inspected system'} · ${description()} Double-select empty survey space or invoke Restore Survey to return to the sector.` : `${mapNodes.length} charted contacts · ${description()} Double-select a contact for close system inspection.`; }
    function applyMode() { stage.dataset.mapMode = passive ? 'passive' : mode; controls.enabled = !passive && mode !== 'select' && !transition; const map = { orbit: [THREE.MOUSE.ROTATE, THREE.MOUSE.DOLLY, THREE.MOUSE.PAN, THREE.TOUCH.ROTATE], pan: [THREE.MOUSE.PAN, THREE.MOUSE.DOLLY, THREE.MOUSE.ROTATE, THREE.TOUCH.PAN], zoom: [THREE.MOUSE.DOLLY, THREE.MOUSE.DOLLY, THREE.MOUSE.PAN, THREE.TOUCH.PAN] }[mode] || [THREE.MOUSE.ROTATE, THREE.MOUSE.DOLLY, THREE.MOUSE.PAN, THREE.TOUCH.ROTATE]; [controls.mouseButtons.LEFT, controls.mouseButtons.MIDDLE, controls.mouseButtons.RIGHT, controls.touches.ONE] = map; controls.touches.TWO = THREE.TOUCH.DOLLY_PAN; updateStatus(); }
    function updateVisibility() {
      const inspecting = Boolean(expandedSystem);
      meshes.forEach((mesh, id) => { mesh.visible = !inspecting && visibleNode(nodeById.get(id)); });
      if (expandedSystem) expandedSystem.group.visible = true;
      grid.visible = !inspecting;
      groups.regions.visible = !inspecting && visibility.regions;
      groups.hazards.visible = !inspecting && visibility.hazards;
      ['route-major-warp', 'route-trade', 'route-local-navigation', 'route-exploratory'].forEach(name => { groups[name].visible = !inspecting && visibility[name]; });
      ambientTraffic.forEach(entry => { entry.craft.visible = !inspecting && visibility[entry.layer]; });
      labelLayer.hidden = inspecting ? false : (!visibility.labels && !passive);
      leaderLayer.hidden = !inspecting;
      if (inspecting) labelRecords.forEach(record => { record.label.hidden = true; record.leader.hidden = true; });
      dirtyLabels = true;
      updateStatus();
    }

    function project(node) { const vector = new THREE.Vector3(...node.position).project(camera), box = stage.getBoundingClientRect(); return { x: (vector.x * 0.5 + 0.5) * box.width, y: (-vector.y * 0.5 + 0.5) * box.height, z: vector.z }; }
    function projectObject(object) { const vector = object.getWorldPosition(new THREE.Vector3()).project(camera), box = stage.getBoundingClientRect(); return { x: (vector.x * 0.5 + 0.5) * box.width, y: (-vector.y * 0.5 + 0.5) * box.height, z: vector.z }; }

    function layoutSystemLabels(stageBox, topInset) {
      const candidates = [];
      expandedSystem.labels.forEach(record => {
        const point = projectObject(record.object), beyondSurvey = point.z < -1 || point.z > 1 || point.x < -60 || point.x > stageBox.width + 60 || point.y < topInset - 60 || point.y > stageBox.height + 60;
        if (beyondSurvey) { record.label.hidden = true; record.leader.hidden = true; return; }
        record.label.hidden = false; record.label.style.visibility = 'hidden'; record.label.style.left = '0px'; record.label.style.top = '0px';
        candidates.push({ ...record, ...point, labelWidth: Math.min(Math.max(record.label.offsetWidth || record.name.length * 7 + 18, 72), 210), labelHeight: Math.max(record.label.offsetHeight || 25, 24) });
      });
      const placed = labelsEngine.placeLocal(candidates, stageBox.width, stageBox.height, topInset), placedLabels = new Set(placed.map(item => item.label));
      candidates.forEach(item => { if (!placedLabels.has(item.label)) { item.label.hidden = true; item.leader.hidden = true; } });
      placed.forEach(item => {
        item.label.hidden = false; item.label.style.visibility = 'visible'; item.label.style.left = `${item.cx}px`; item.label.style.top = `${item.cy}px`; item.label.dataset.placement = item.placement;
        const edge = labelsEngine.nearest(item.x, item.y, item.rect);
        item.leader.setAttribute('x1', String(item.x)); item.leader.setAttribute('y1', String(item.y)); item.leader.setAttribute('x2', String(edge.x)); item.leader.setAttribute('y2', String(edge.y)); item.leader.hidden = Math.hypot(edge.x - item.x, edge.y - item.y) < 8;
      });
    }

    function layoutLabels() {
      const stageBox = stage.getBoundingClientRect();
      if (!stageBox.width || !stageBox.height) return;
      const topInset = Math.max(10, (viewportConsole?.offsetTop || 0) + (viewportConsole?.offsetHeight || 0) + 12);
      if (expandedSystem) { layoutSystemLabels(stageBox, topInset); dirtyLabels = false; return; }
      if (!visibility.labels && !passive) return;
      const canonicalItems = []; let selectedItem = null;
      labelRecords.forEach(record => { if (!showLabel(record.node)) { record.label.hidden = true; record.leader.hidden = true; return; } const point = project(record.node), activeVigilTarget = passive && record.node.id === selected, beyondSurvey = point.z < -1 || point.z > 1 || point.x < -80 || point.x > stageBox.width + 80 || point.y < -80 || point.y > stageBox.height + 80; if (beyondSurvey && !activeVigilTarget) { record.label.hidden = true; record.leader.hidden = true; return; } if (activeVigilTarget) { point.x = clamp(point.x, 12, stageBox.width - 12); point.y = clamp(point.y, topInset + 12, stageBox.height - 12); } record.label.hidden = false; record.label.style.visibility = 'hidden'; record.label.style.left = '0px'; record.label.style.top = '0px'; const item = { ...record, ...point, labelWidth: Math.min(Math.max(record.label.offsetWidth || record.node.name.length * 7 + 18, 72), 220), labelHeight: Math.max(record.label.offsetHeight || 25, 24) }; if (record.node.id === selected && (passive || !canonical(record.node))) selectedItem = item; else if (canonical(record.node)) canonicalItems.push(item); else if (record.node.id === selected) selectedItem = item; });
      const placed = labelsEngine.place(canonicalItems.filter(item => item.x <= stageBox.width / 2), canonicalItems.filter(item => item.x > stageBox.width / 2), selectedItem, stageBox.width, stageBox.height, topInset);
      placed.forEach(item => { item.label.hidden = false; item.label.style.visibility = 'visible'; item.label.style.left = `${item.cx}px`; item.label.style.top = `${item.cy}px`; item.label.dataset.placement = item.placement; item.label.setAttribute('aria-current', item.node.id === selected ? 'true' : 'false'); item.leader.hidden = true; }); dirtyLabels = false;
    }

    function connectedRoutes(nodeId) { return routes.filter(route => route.nodeIds.includes(nodeId)); }
    function stopPassive(reason = 'manual') { if (!passive) return; passive = false; passiveDeadline = 0; passiveLastFrame = 0; stage.dataset.passive = 'false'; dirtyLabels = true; updateVisibility(); applyMode(); onPassiveChange?.(false, reason); }
    function moveTo(position, target, duration = 1650) { transition = { start: performance.now(), duration, fromPosition: camera.position.clone(), fromTarget: controls.target.clone(), position: position.clone(), target: target.clone() }; controls.enabled = false; }
    function focusNode(node, close = false) { const target = new THREE.Vector3(...node.position), direction = camera.position.clone().sub(controls.target).normalize(); let distance; if (close && expandedSystem) { const framingDistance = expandedSystem.radius / Math.tan(THREE.MathUtils.degToRad(camera.fov * 0.5)); distance = clamp(framingDistance * 1.18, 12, 32); } else distance = clamp(camera.position.distanceTo(controls.target) * 0.52, 28, 72); moveTo(target.clone().add(direction.multiplyScalar(distance)), target, close ? 1450 : 1650); }
    function selectNode(nodeId, focus = false, preservePassive = false, close = false) { const node = nodeById.get(nodeId); if (!node) return; if (passive && !preservePassive) stopPassive('selection'); selected = nodeId; const records = recordsFor(node); if (close) expandSystem(node, records); onSelect?.(node, records, connectedRoutes(nodeId)); dirtyLabels = true; if (focus) focusNode(node, close); }
    function restoreSurvey(reason = 'restore') { if (passive) stopPassive(reason); selected = ''; pointerStart = null; transition = null; clearExpandedSystem(); updateVisibility(); dirtyLabels = true; onClear?.(reason); moveTo(homePosition, homeTarget, 1900); }
    function passiveEligibleNodes() { const preferred = mapNodes.filter(node => visibleNode(node) && ['primary', 'guard-origin', 'supporting'].includes(node.layer)); return preferred.length ? preferred : mapNodes.filter(visibleNode); }
    function rebuildPassiveSequence() { passiveSequence = [...passiveEligibleNodes()]; for (let index = passiveSequence.length - 1; index > 0; index -= 1) { const swap = Math.floor(Math.random() * (index + 1)); [passiveSequence[index], passiveSequence[swap]] = [passiveSequence[swap], passiveSequence[index]]; } if (selected && passiveSequence.length > 1 && passiveSequence[0]?.id === selected) [passiveSequence[0], passiveSequence[1]] = [passiveSequence[1], passiveSequence[0]]; passiveIndex = -1; }
    function passivePosition(node) { const target = new THREE.Vector3(...node.position), radius = 34 + Math.random() * 34, azimuth = Math.random() * Math.PI * 2, elevation = 0.22 + Math.random() * 0.42, horizontal = Math.cos(elevation) * radius; return { target, position: new THREE.Vector3(target.x + Math.cos(azimuth) * horizontal, target.y + Math.sin(elevation) * radius, target.z + Math.sin(azimuth) * horizontal) }; }
    function advancePassive(now = performance.now()) { if (!passive) return; if (!passiveSequence.length || passiveIndex >= passiveSequence.length - 1) rebuildPassiveSequence(); passiveIndex += 1; const node = passiveSequence[passiveIndex]; if (!node) return; const records = recordsFor(node); selectNode(node.id, false, true); const destination = passivePosition(node); moveTo(destination.position, destination.target, 2600); passiveDeadline = now + PASSIVE_DWELL; passiveLastFrame = now; onPassiveNode?.(node, records, PASSIVE_DWELL); refreshLayout(); updateStatus(); }
    function startPassive() { if (passive) return; if (expandedSystem) restoreSurvey('vigil'); passive = true; stage.dataset.passive = 'true'; mode = 'orbit'; rebuildPassiveSequence(); dirtyLabels = true; updateVisibility(); applyMode(); onPassiveChange?.(true, 'engaged'); advancePassive(performance.now()); }
    function updatePassive(now) { if (!passive) return; if (now >= passiveDeadline && !transition) { advancePassive(now); return; } if (transition) { passiveLastFrame = now; return; } const elapsed = clamp(now - (passiveLastFrame || now), 0, 80); passiveLastFrame = now; const offset = camera.position.clone().sub(controls.target); offset.applyAxisAngle(verticalAxis, elapsed * PASSIVE_ORBIT_SPEED); camera.position.copy(controls.target).add(offset); camera.lookAt(controls.target); dirtyLabels = true; }
    function updateMove(now) { if (!transition) return; const p = clamp((now - transition.start) / transition.duration, 0, 1), e = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2; camera.position.lerpVectors(transition.fromPosition, transition.position, e); controls.target.lerpVectors(transition.fromTarget, transition.target, e); controls.update(); dirtyLabels = true; if (p === 1) { transition = null; applyMode(); } }
    function pickNode(event) { const box = renderer.domElement.getBoundingClientRect(); pointer.x = ((event.clientX - box.left) / box.width) * 2 - 1; pointer.y = -((event.clientY - box.top) / box.height) * 2 + 1; raycaster.setFromCamera(pointer, camera); const hit = raycaster.intersectObjects(pickables.filter(mesh => mesh.visible), false)[0]; return hit?.object?.userData?.nodeId || ''; }
    renderer.domElement.addEventListener('pointerdown', event => { if (passive) stopPassive('interaction'); pointerStart = [event.clientX, event.clientY, performance.now()]; stage.dataset.dragging = 'true'; });
    renderer.domElement.addEventListener('pointerup', event => { stage.dataset.dragging = 'false'; if (!pointerStart) return; const distance = Math.hypot(event.clientX - pointerStart[0], event.clientY - pointerStart[1]); if (distance < 5 && performance.now() - pointerStart[2] < 650) { const id = pickNode(event); if (id) selectNode(id, false); } pointerStart = null; });
    renderer.domElement.addEventListener('dblclick', event => { event.preventDefault(); if (passive) stopPassive('interaction'); const id = pickNode(event); if (id) selectNode(id, true, false, true); else restoreSurvey('empty-space'); });
    renderer.domElement.addEventListener('pointercancel', () => { pointerStart = null; stage.dataset.dragging = 'false'; }); controls.addEventListener('change', () => { dirtyLabels = true; });

    function reserveViewportSpace() { if (!vigilPanel || vigilPanel.hidden) return; const stageBox = stage.getBoundingClientRect(), consoleBottom = (viewportConsole?.offsetTop || 0) + (viewportConsole?.offsetHeight || 0), available = Math.max(150, stageBox.height - consoleBottom - 28); vigilPanel.style.maxHeight = `${Math.min(stageBox.height * 0.55, available)}px`; if (stageBox.width < 720) { vigilPanel.style.left = '.7rem'; vigilPanel.style.right = '.7rem'; vigilPanel.style.width = 'auto'; } else { vigilPanel.style.left = ''; vigilPanel.style.right = ''; vigilPanel.style.width = ''; } }
    function resize() { const box = stage.getBoundingClientRect(), width = Math.max(1, box.width), height = Math.max(1, box.height); renderer.setSize(width, height, false); camera.aspect = width / height; camera.updateProjectionMatrix(); leaderLayer.setAttribute('viewBox', `0 0 ${width} ${height}`); reserveViewportSpace(); dirtyLabels = true; }
    function refreshLayout() { resize(); requestAnimationFrame(() => { resize(); requestAnimationFrame(() => { resize(); if (running) layoutLabels(); }); }); }
    theatreToggle.textContent = 'Widen Survey Theatre'; theatreToggle.disabled = false; theatreToggle.setAttribute('aria-pressed', 'false'); fullAuspexToggle.textContent = 'Invoke Full Auspex'; fullAuspexToggle.disabled = false; fullAuspexToggle.setAttribute('aria-pressed', 'false'); docketToggle.textContent = 'Unseal Contact Docket'; docketToggle.disabled = false; docketToggle.hidden = true; docketToggle.setAttribute('aria-pressed', 'false');
    function setTheatreState(active) { surveyTheatre = Boolean(active); if (!surveyTheatre) contactDocketOpen = false; workspace?.classList.toggle('wh-survey-theatre-active', surveyTheatre); mapPanel?.classList.toggle('wh-survey-theatre-active', surveyTheatre); stage.classList.toggle('wh-survey-theatre-active', surveyTheatre); if (workspace) workspace.dataset.surveyTheatre = String(surveyTheatre); if (mapPanel) mapPanel.dataset.surveyTheatre = String(surveyTheatre); if (mapLayout) mapLayout.dataset.surveyTheatre = String(surveyTheatre); stage.dataset.surveyTheatre = String(surveyTheatre); if (shell) { shell.style.width = surveyTheatre ? '100%' : ''; shell.style.maxWidth = surveyTheatre ? 'none' : ''; } if (mapLayout) mapLayout.style.gridTemplateColumns = surveyTheatre ? 'minmax(0,1fr)' : ''; if (mapCard) mapCard.style.width = surveyTheatre ? '100%' : ''; if (details) details.hidden = surveyTheatre && !contactDocketOpen; theatreToggle.textContent = surveyTheatre ? 'Restore Standard Survey' : 'Widen Survey Theatre'; theatreToggle.setAttribute('aria-pressed', surveyTheatre ? 'true' : 'false'); docketToggle.hidden = !surveyTheatre; docketToggle.textContent = contactDocketOpen ? 'Reseal Contact Docket' : 'Unseal Contact Docket'; docketToggle.setAttribute('aria-pressed', contactDocketOpen ? 'true' : 'false'); refreshLayout(); }
    function toggleContactDocket() { if (!surveyTheatre || !details) return; contactDocketOpen = !contactDocketOpen; details.hidden = !contactDocketOpen; mapLayout.dataset.contactDocket = contactDocketOpen ? 'unsealed' : 'sealed'; stage.dataset.contactDocket = contactDocketOpen ? 'unsealed' : 'sealed'; docketToggle.textContent = contactDocketOpen ? 'Reseal Contact Docket' : 'Unseal Contact Docket'; docketToggle.setAttribute('aria-pressed', contactDocketOpen ? 'true' : 'false'); refreshLayout(); }
    async function toggleFullAuspex() { try { if (document.fullscreenElement === stage) await document.exitFullscreen(); else { if (document.fullscreenElement) await document.exitFullscreen(); await stage.requestFullscreen(); } } catch (error) { status.textContent = `Full Auspex invocation denied by the host cogitator: ${error.message}`; } }
    function syncFullAuspexState() { fullAuspex = document.fullscreenElement === stage; stage.classList.toggle('wh-full-auspex-active', fullAuspex); workspace?.classList.toggle('wh-full-auspex-active', fullAuspex); stage.dataset.fullAuspex = String(fullAuspex); if (workspace) workspace.dataset.fullAuspex = String(fullAuspex); stage.style.width = fullAuspex ? '100vw' : ''; stage.style.height = fullAuspex ? '100vh' : ''; stage.style.minHeight = fullAuspex ? '100vh' : ''; fullAuspexToggle.textContent = fullAuspex ? 'Stand Down Full Auspex' : 'Invoke Full Auspex'; fullAuspexToggle.setAttribute('aria-pressed', fullAuspex ? 'true' : 'false'); refreshLayout(); }
    const handleTheatreToggle = () => setTheatreState(!surveyTheatre), handleFullAuspexToggle = () => { void toggleFullAuspex(); }; theatreToggle.addEventListener('click', handleTheatreToggle); docketToggle.addEventListener('click', toggleContactDocket); fullAuspexToggle.addEventListener('click', handleFullAuspexToggle); document.addEventListener('fullscreenchange', syncFullAuspexState); const observer = new ResizeObserver(resize); observer.observe(stage); resize();

    function animate(now) { if (!running) return; raf = requestAnimationFrame(animate); updateMove(now); updatePassive(now); if (expandedSystem) { expandedSystem.star.rotation.y = now * 0.00008; expandedSystem.moving.forEach((body, index) => { body.pivot.rotation.y += body.speed * Math.min(80, Math.max(1, now - (body.last || now))); body.last = now; body.planet.rotation.y += 0.0016 + index * 0.0002; if (body.planet.userData.cloudLayer) body.planet.userData.cloudLayer.rotation.y += 0.00032 + index * 0.00003; body.pivot.children.slice(1).forEach(moonPivot => { moonPivot.rotation.y += body.moonSpeed; }); }); expandedSystem.traffic.forEach(craft => { craft.pivot.rotation.y += craft.speed; }); dirtyLabels = true; } ambientTraffic.forEach(entry => { entry.phase = (entry.phase + entry.speed * 16 + 1) % 1; entry.craft.position.copy(entry.curve.getPoint(entry.phase)); }); envelopeEffects.forEach(effect => { const visible = effect.kind === 'hazard' ? visibility.hazards : visibility.regions; if (!visible) return; const pulse = 0.5 + 0.5 * Math.sin(now * (effect.kind === 'hazard' ? 0.0011 : 0.00055) + effect.phase); effect.pulse.scale.copy(effect.mesh.scale).multiplyScalar(0.68 + pulse * 0.16); effect.pulse.material.opacity = effect.baseOpacity * (0.35 + pulse * 0.7); effect.knots.forEach(item => { const drift = Math.sin(now * item.speed + item.phase) * item.amplitude; item.knot.position.y += drift * 0.004; item.knot.material.opacity = (effect.kind === 'hazard' ? 0.18 : 0.07) + pulse * (effect.kind === 'hazard' ? 0.28 : 0.12); }); }); if (!transition && !passive) controls.update(); renderer.render(scene, camera); if (dirtyLabels) layoutLabels(); }
    function pause() { running = false; cancelAnimationFrame(raf); }
    function resume() { if (!running) { running = true; dirtyLabels = true; passiveLastFrame = performance.now(); raf = requestAnimationFrame(animate); } }
    function setMode(value) { if (MODES.has(value)) { if (passive) stopPassive('mode'); mode = value; applyMode(); } }
    function setLayer(layer, value) { if (layer in visibility) { visibility[layer] = Boolean(value); updateVisibility(); if (passive) rebuildPassiveSequence(); } }
    function setThreat(value) { threat = value || 'all'; updateVisibility(); if (passive) rebuildPassiveSequence(); }
    function reset() { restoreSurvey('helm'); }
    function top() { if (passive) stopPassive('projection'); const target = controls.target.clone(); moveTo(new THREE.Vector3(target.x, 210, target.z + 0.01), target, 1900); }
    function dispose() { stopPassive('dispose'); pause(); observer.disconnect(); clearExpandedSystem(); theatreToggle.removeEventListener('click', handleTheatreToggle); docketToggle.removeEventListener('click', toggleContactDocket); fullAuspexToggle.removeEventListener('click', handleFullAuspexToggle); document.removeEventListener('fullscreenchange', syncFullAuspexState); if (document.fullscreenElement === stage) void document.exitFullscreen(); controls.dispose(); renderer.dispose(); labelLayer.replaceChildren(); leaderLayer.replaceChildren(); renderer.domElement.remove(); }
    stage.dataset.surveyTheatre = 'false'; stage.dataset.fullAuspex = 'false'; stage.dataset.viewContext = 'sector'; if (workspace) { workspace.dataset.surveyTheatre = 'false'; workspace.dataset.fullAuspex = 'false'; } if (mapLayout) { mapLayout.dataset.surveyTheatre = 'false'; mapLayout.dataset.contactDocket = 'sealed'; }
    applyMode(); updateVisibility(); raf = requestAnimationFrame(animate);
    return Object.freeze({ mapNodes, routes, selectNode, restoreSurvey, setMode, setLayer, setThreat, reset, top, pause, resume, dispose, refreshLayout, startPassive, stopPassive, nextPassive: () => advancePassive(performance.now()), passiveActive: () => passive, passiveDwell: PASSIVE_DWELL, surveyTheatreActive: () => surveyTheatre, fullAuspexActive: () => fullAuspex });
  }

  window.CafarronSectorMapV8 = Object.freeze({ mount });
})();
