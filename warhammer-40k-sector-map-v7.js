(() => {
  'use strict';

  const THREE_URL = 'https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.min.js';
  const ORBIT_URL = 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js';
  const MODES = new Set(['select', 'orbit', 'pan', 'zoom']);
  const loads = new Map();
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

  function routeStyle(layer) {
    return {
      'major-warp': [0xd8b35e, 0.82, false, 0, 0],
      trade: [0x4fa3a5, 0.72, true, 2.8, 1.25],
      'local-navigation': [0x7390bd, 0.52, true, 1.35, 1.25],
      exploratory: [0xe2e5df, 0.19, true, 0.7, 1.45]
    }[layer] || [0x817963, 0.4, true, 1.2, 1.2];
  }

  function routeGroup(THREE, route, nodes) {
    const group = new THREE.Group();
    const points = route.nodeIds.map(id => nodes.get(id)).filter(Boolean);
    for (let index = 0; index < points.length - 1; index += 1) {
      const start = new THREE.Vector3(...points[index].position);
      const end = new THREE.Vector3(...points[index + 1].position);
      const distance = start.distanceTo(end);
      const middle = start.clone().add(end).multiplyScalar(0.5);
      middle.y += clamp(distance * 0.065, 2.2, 9.5);
      middle.z += (index % 2 ? -1 : 1) * clamp(distance * 0.03, 0.9, 4.8);
      const geometry = new THREE.BufferGeometry().setFromPoints(
        new THREE.QuadraticBezierCurve3(start, middle, end).getPoints(clamp(Math.round(distance * 1.4), 18, 72))
      );
      const [color, opacity, dashed, dashSize, gapSize] = routeStyle(route.layer);
      const material = dashed
        ? new THREE.LineDashedMaterial({ color, transparent: true, opacity, dashSize, gapSize })
        : new THREE.LineBasicMaterial({ color, transparent: true, opacity });
      const line = new THREE.Line(geometry, material);
      if (dashed) line.computeLineDistances();
      group.add(line);
    }
    return group;
  }

  async function mount(options) {
    const { data, chart, stage, labelLayer, leaderLayer, status, initialMode = 'orbit', onSelect } = options;
    const THREE = await three();
    const labelsEngine = window.CafarronMapLabelsV7;
    if (!labelsEngine) throw new Error('Cartographic label servitors failed to answer.');

    const mapNodes = chart.nodes(data);
    const routes = chart.routes(data);
    const nodeById = new Map(mapNodes.map(node => [node.id, node]));
    const recordById = new Map(data.records.map(record => [record.id, record]));
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x030505);
    scene.fog = new THREE.FogExp2(0x030505, 0.0021);

    const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 1200);
    const homeTarget = new THREE.Vector3(18, 0, 0);
    const homePosition = new THREE.Vector3(38, 78, 182);
    camera.position.copy(homePosition);

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputEncoding = THREE.sRGBEncoding;
    stage.insertBefore(renderer.domElement, leaderLayer);

    const controls = new THREE.OrbitControls(camera, renderer.domElement);
    Object.assign(controls, {
      enableDamping: true,
      dampingFactor: 0.022,
      rotateSpeed: 0.12,
      panSpeed: 0.135,
      zoomSpeed: 0.15,
      keyPanSpeed: 2,
      screenSpacePanning: true,
      minDistance: 18,
      maxDistance: 360
    });
    controls.target.copy(homeTarget);
    controls.update();

    scene.add(new THREE.AmbientLight(0xb8aa85, 0.72));
    const key = new THREE.DirectionalLight(0xffdfa0, 1.05);
    key.position.set(35, 55, 70);
    scene.add(key);

    const starData = [];
    for (let index = 0; index < 1000; index += 1) {
      starData.push((Math.random() - 0.5) * 440, (Math.random() - 0.5) * 240, (Math.random() - 0.5) * 280);
    }
    const starGeometry = new THREE.BufferGeometry();
    starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starData, 3));
    scene.add(new THREE.Points(starGeometry, new THREE.PointsMaterial({ color: 0xbcc5bf, size: 0.28, transparent: true, opacity: 0.46 })));

    const grid = new THREE.GridHelper(280, 28, 0x5b5139, 0x282923);
    grid.position.y = -38;
    grid.material.transparent = true;
    grid.material.opacity = 0.22;
    scene.add(grid);

    const groups = Object.fromEntries([
      'nodes', 'regions', 'hazards', 'route-major-warp', 'route-trade', 'route-local-navigation', 'route-exploratory'
    ].map(name => [name, new THREE.Group()]));
    Object.values(groups).forEach(group => scene.add(group));

    const visibility = {
      primary: true,
      supporting: true,
      'guard-origin': true,
      provisional: false,
      unnamed: false,
      exploratory: true,
      regions: false,
      hazards: false,
      labels: true,
      'route-major-warp': true,
      'route-trade': true,
      'route-local-navigation': false,
      'route-exploratory': false
    };

    let mode = MODES.has(initialMode) ? initialMode : 'orbit';
    let threat = 'all';
    let selected = '';
    let running = true;
    let raf = 0;
    let dirtyLabels = true;
    let transition = null;
    let pointerStart = null;

    const meshes = new Map();
    const pickables = [];
    const labelRecords = new Map();
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();

    const threatColor = node => data.threatStates[node.threat]?.color || data.threatStates.unsurveyed.color;
    const visibleNode = node => visibility[node.layer] !== false && (threat === 'all' || node.threat === threat);
    const canonical = node => ['primary', 'supporting', 'guard-origin'].includes(node.layer);
    const showLabel = node => visibleNode(node) && visibility.labels && (canonical(node) || node.id === selected);

    for (const node of mapNodes) {
      const scale = Math.max(0.42, Number(node.scale || 0.8));
      const color = threatColor(node);
      const exploratory = node.layer === 'exploratory';
      const guard = node.layer === 'guard-origin';
      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(scale, 18, 14),
        new THREE.MeshStandardMaterial({
          color,
          emissive: color,
          emissiveIntensity: exploratory ? 0.11 : guard ? 0.25 : 0.3,
          roughness: 0.5,
          metalness: 0.2,
          transparent: exploratory || guard,
          opacity: exploratory ? 0.58 : guard ? 0.92 : 1
        })
      );
      mesh.position.set(...node.position);
      mesh.userData.nodeId = node.id;
      groups.nodes.add(mesh);
      meshes.set(node.id, mesh);
      pickables.push(mesh);
      mesh.add(new THREE.Mesh(
        new THREE.SphereGeometry(scale * 1.62, 14, 10),
        new THREE.MeshBasicMaterial({ color, wireframe: true, transparent: true, opacity: exploratory ? 0.07 : guard ? 0.15 : 0.16 })
      ));

      const label = document.createElement('button');
      label.type = 'button';
      label.className = 'wh-map-label';
      label.dataset.nodeId = node.id;
      label.dataset.layer = node.layer;
      label.textContent = node.name;
      label.hidden = true;
      label.addEventListener('click', () => selectNode(node.id, false));
      labelLayer.appendChild(label);

      const leader = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      leader.setAttribute('stroke', data.threatStates[node.threat]?.css || '#f1f1ec');
      leader.setAttribute('stroke-width', guard ? '0.9' : exploratory ? '0.7' : '1');
      leader.setAttribute('stroke-opacity', guard ? '0.56' : exploratory ? '0.34' : '0.66');
      leader.hidden = true;
      leaderLayer.appendChild(leader);
      labelRecords.set(node.id, { node, mesh, label, leader });
    }

    routes.forEach(route => {
      const group = groups[`route-${route.layer}`];
      if (group) group.add(routeGroup(THREE, route, nodeById));
    });

    function addVolume(record, group, opacity) {
      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(1, 18, 12),
        new THREE.MeshBasicMaterial({ color: data.threatStates[record.threat]?.color || 0xb49142, wireframe: true, transparent: true, opacity })
      );
      mesh.position.set(...record.center);
      mesh.scale.set(...record.radii);
      group.add(mesh);
    }
    data.regions.forEach(record => addVolume(record, groups.regions, 0.05));
    data.hazards.forEach(record => addVolume(record, groups.hazards, 0.11));

    function description() {
      return {
        select: 'Auspex selection rite active.',
        orbit: 'Orbital rotation rite active under graduated resistance.',
        pan: 'Chart translation rite active under graduated resistance.',
        zoom: 'Magnification rite active under graduated resistance.'
      }[mode];
    }

    function updateStatus() {
      status.textContent = `${mapNodes.length} charted contacts · ${description()} Explorator designations remain sealed until selected.`;
    }

    function applyMode() {
      stage.dataset.mapMode = mode;
      controls.enabled = mode !== 'select' && !transition;
      const map = {
        orbit: [THREE.MOUSE.ROTATE, THREE.MOUSE.DOLLY, THREE.MOUSE.PAN, THREE.TOUCH.ROTATE],
        pan: [THREE.MOUSE.PAN, THREE.MOUSE.DOLLY, THREE.MOUSE.ROTATE, THREE.TOUCH.PAN],
        zoom: [THREE.MOUSE.DOLLY, THREE.MOUSE.DOLLY, THREE.MOUSE.PAN, THREE.TOUCH.PAN]
      }[mode] || [THREE.MOUSE.ROTATE, THREE.MOUSE.DOLLY, THREE.MOUSE.PAN, THREE.TOUCH.ROTATE];
      [controls.mouseButtons.LEFT, controls.mouseButtons.MIDDLE, controls.mouseButtons.RIGHT, controls.touches.ONE] = map;
      controls.touches.TWO = THREE.TOUCH.DOLLY_PAN;
      updateStatus();
    }

    function updateVisibility() {
      meshes.forEach((mesh, id) => { mesh.visible = visibleNode(nodeById.get(id)); });
      groups.regions.visible = visibility.regions;
      groups.hazards.visible = visibility.hazards;
      ['route-major-warp', 'route-trade', 'route-local-navigation', 'route-exploratory'].forEach(name => {
        groups[name].visible = visibility[name];
      });
      labelLayer.hidden = !visibility.labels;
      leaderLayer.hidden = !visibility.labels;
      dirtyLabels = true;
    }

    function project(node) {
      const vector = new THREE.Vector3(...node.position).project(camera);
      const box = stage.getBoundingClientRect();
      return { x: (vector.x * 0.5 + 0.5) * box.width, y: (-vector.y * 0.5 + 0.5) * box.height, z: vector.z };
    }

    function layoutLabels() {
      const stageBox = stage.getBoundingClientRect();
      if (!stageBox.width || !stageBox.height || !visibility.labels) return;
      const consoleElement = stage.querySelector('.wh-viewport-console');
      const topInset = Math.max(10, (consoleElement?.offsetTop || 0) + (consoleElement?.offsetHeight || 0) + 12);
      const canonicalItems = [];
      let selectedItem = null;

      labelRecords.forEach(record => {
        if (!showLabel(record.node)) {
          record.label.hidden = true;
          record.leader.hidden = true;
          return;
        }
        const point = project(record.node);
        if (point.z < -1 || point.z > 1 || point.x < -80 || point.x > stageBox.width + 80 || point.y < -80 || point.y > stageBox.height + 80) {
          record.label.hidden = true;
          record.leader.hidden = true;
          return;
        }
        record.label.hidden = false;
        record.label.style.visibility = 'hidden';
        record.label.style.left = '0px';
        record.label.style.top = '0px';
        const item = {
          ...record,
          ...point,
          labelWidth: Math.min(Math.max(record.label.offsetWidth || record.node.name.length * 7 + 18, 72), 220),
          labelHeight: Math.max(record.label.offsetHeight || 25, 24)
        };
        if (canonical(record.node)) canonicalItems.push(item);
        else if (record.node.id === selected) selectedItem = item;
      });

      const leftItems = canonicalItems.filter(item => item.x <= stageBox.width / 2);
      const rightItems = canonicalItems.filter(item => item.x > stageBox.width / 2);
      const placed = labelsEngine.place(leftItems, rightItems, selectedItem, stageBox.width, stageBox.height, topInset);
      placed.forEach(item => {
        item.label.hidden = false;
        item.label.style.visibility = 'visible';
        item.label.style.left = `${item.cx}px`;
        item.label.style.top = `${item.cy}px`;
        item.label.dataset.placement = item.placement;
        item.label.setAttribute('aria-current', item.node.id === selected ? 'true' : 'false');
        const end = labelsEngine.nearest(item.x, item.y, item.rect);
        item.leader.hidden = false;
        item.leader.setAttribute('x1', String(item.x));
        item.leader.setAttribute('y1', String(item.y));
        item.leader.setAttribute('x2', String(end.x));
        item.leader.setAttribute('y2', String(end.y));
      });
      dirtyLabels = false;
    }

    function connectedRoutes(nodeId) {
      return routes.filter(route => route.nodeIds.includes(nodeId));
    }

    function selectNode(nodeId, focus = false) {
      const node = nodeById.get(nodeId);
      if (!node) return;
      selected = nodeId;
      meshes.forEach((mesh, id) => mesh.scale.setScalar(id === nodeId ? 1.75 : 1));
      onSelect?.(node, (node.recordIds || []).map(id => recordById.get(id)).filter(Boolean), connectedRoutes(nodeId));
      dirtyLabels = true;
      if (focus) focusNode(node);
    }

    function moveTo(position, target, duration = 1650) {
      transition = {
        start: performance.now(), duration,
        fromPosition: camera.position.clone(),
        fromTarget: controls.target.clone(),
        position: position.clone(), target: target.clone()
      };
      controls.enabled = false;
    }

    function focusNode(node) {
      const target = new THREE.Vector3(...node.position);
      const direction = camera.position.clone().sub(controls.target).normalize();
      moveTo(target.clone().add(direction.multiplyScalar(clamp(camera.position.distanceTo(controls.target) * 0.52, 28, 72))), target);
    }

    function updateMove(now) {
      if (!transition) return;
      const p = clamp((now - transition.start) / transition.duration, 0, 1);
      const e = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
      camera.position.lerpVectors(transition.fromPosition, transition.position, e);
      controls.target.lerpVectors(transition.fromTarget, transition.target, e);
      controls.update();
      dirtyLabels = true;
      if (p === 1) { transition = null; applyMode(); }
    }

    function pick(event) {
      const box = renderer.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - box.left) / box.width) * 2 - 1;
      pointer.y = -((event.clientY - box.top) / box.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const hit = raycaster.intersectObjects(pickables.filter(mesh => mesh.visible), false)[0];
      if (hit?.object?.userData?.nodeId) selectNode(hit.object.userData.nodeId, false);
    }

    renderer.domElement.addEventListener('pointerdown', event => {
      pointerStart = [event.clientX, event.clientY, performance.now()];
      stage.dataset.dragging = 'true';
    });
    renderer.domElement.addEventListener('pointerup', event => {
      stage.dataset.dragging = 'false';
      if (!pointerStart) return;
      const distance = Math.hypot(event.clientX - pointerStart[0], event.clientY - pointerStart[1]);
      if (distance < 5 && performance.now() - pointerStart[2] < 650) pick(event);
      pointerStart = null;
    });
    renderer.domElement.addEventListener('pointercancel', () => { pointerStart = null; stage.dataset.dragging = 'false'; });
    controls.addEventListener('change', () => { dirtyLabels = true; });

    function resize() {
      const box = stage.getBoundingClientRect();
      const width = Math.max(1, box.width);
      const height = Math.max(1, box.height);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      leaderLayer.setAttribute('viewBox', `0 0 ${width} ${height}`);
      dirtyLabels = true;
    }

    const observer = new ResizeObserver(resize);
    observer.observe(stage);
    resize();

    function animate(now) {
      if (!running) return;
      raf = requestAnimationFrame(animate);
      updateMove(now);
      if (!transition) controls.update();
      renderer.render(scene, camera);
      if (dirtyLabels) layoutLabels();
    }

    function pause() { running = false; cancelAnimationFrame(raf); }
    function resume() { if (!running) { running = true; dirtyLabels = true; raf = requestAnimationFrame(animate); } }
    function setMode(value) { if (MODES.has(value)) { mode = value; applyMode(); } }
    function setLayer(layer, value) { if (layer in visibility) { visibility[layer] = Boolean(value); updateVisibility(); } }
    function setThreat(value) { threat = value || 'all'; updateVisibility(); }
    function reset() { moveTo(homePosition, homeTarget, 1900); }
    function top() { const target = controls.target.clone(); moveTo(new THREE.Vector3(target.x, 210, target.z + 0.01), target, 1900); }
    function dispose() {
      pause();
      observer.disconnect();
      controls.dispose();
      renderer.dispose();
      labelLayer.replaceChildren();
      leaderLayer.replaceChildren();
      renderer.domElement.remove();
    }

    applyMode();
    updateVisibility();
    raf = requestAnimationFrame(animate);
    return Object.freeze({ mapNodes, routes, selectNode, setMode, setLayer, setThreat, reset, top, pause, resume, dispose });
  }

  window.CafarronSectorMapV7 = Object.freeze({ mount });
})();
