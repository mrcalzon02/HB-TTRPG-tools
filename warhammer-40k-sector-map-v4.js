(() => {
  'use strict';

  const THREE_URL = 'https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.min.js';
  const ORBIT_URL = 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js';
  const scriptLoads = new Map();

  function loadScript(src) {
    if (scriptLoads.has(src)) return scriptLoads.get(src);
    const existing = [...document.scripts].find(script => script.src === new URL(src, document.baseURI).href);
    if (existing?.dataset.cafarronLoaded === 'true') return Promise.resolve();
    const promise = new Promise((resolve, reject) => {
      const script = existing || document.createElement('script');
      const done = () => { script.dataset.cafarronLoaded = 'true'; resolve(); };
      const fail = () => reject(new Error(`${src} could not be loaded.`));
      script.addEventListener('load', done, { once: true });
      script.addEventListener('error', fail, { once: true });
      if (!existing) {
        script.src = src;
        script.async = false;
        script.crossOrigin = 'anonymous';
        document.head.appendChild(script);
      }
    });
    scriptLoads.set(src, promise);
    promise.catch(() => scriptLoads.delete(src));
    return promise;
  }

  async function loadThree() {
    if (window.THREE?.OrbitControls) return window.THREE;
    await loadScript(THREE_URL);
    await loadScript(ORBIT_URL);
    if (!window.THREE?.OrbitControls) throw new Error('Three-dimensional survey controls failed to initialize.');
    return window.THREE;
  }

  function intersectArea(a, b) {
    const width = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left));
    const height = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
    return width * height;
  }

  function expanded(rect, padding = 5) {
    return {
      left: rect.left - padding,
      right: rect.right + padding,
      top: rect.top - padding,
      bottom: rect.bottom + padding
    };
  }

  function candidatePositions(x, y, width, height, maxRadius = 180) {
    const positions = [];
    const radii = [22, 32, 44, 58, 74, 92, 114, 140, 168, maxRadius];
    const angles = [-35, 35, -145, 145, 0, 180, -75, 75, -110, 110];
    for (const radius of radii) {
      for (const degrees of angles) {
        const angle = degrees * Math.PI / 180;
        positions.push({
          cx: x + Math.cos(angle) * (radius + width * .22),
          cy: y + Math.sin(angle) * (radius + height * .18),
          distance: radius
        });
      }
    }
    return positions;
  }

  function labelPriority(node, selectedId) {
    if (node.id === selectedId) return 1000;
    if (node.layer === 'primary') return 800;
    if (node.layer === 'supporting') return 650;
    if (node.layer === 'provisional') return 450;
    if (node.layer === 'unnamed') return 350;
    return 100;
  }

  function routeMaterial(THREE, route) {
    const authorial = route.layer === 'authorial';
    const exploratory = route.layer === 'exploratory';
    return new THREE.LineDashedMaterial({
      color: authorial ? 0xd8b35e : exploratory ? 0x9ea6a1 : 0x80785f,
      transparent: true,
      opacity: authorial ? .82 : exploratory ? .35 : .48,
      dashSize: exploratory ? 1.2 : 2.2,
      gapSize: exploratory ? 1.4 : 1.5
    });
  }

  function buildLine(THREE, points, material) {
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const line = new THREE.Line(geometry, material);
    line.computeLineDistances();
    return line;
  }

  async function mount(options) {
    const { data, stage, labelLayer, leaderLayer, status, onSelect } = options;
    const THREE = await loadThree();
    const nodeById = new Map(data.mapNodes.map(node => [node.id, node]));
    const recordById = new Map(data.records.map(record => [record.id, record]));
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x030505);
    scene.fog = new THREE.FogExp2(0x030505, .0022);

    const camera = new THREE.PerspectiveCamera(48, 1, .1, 1100);
    const defaultTarget = new THREE.Vector3(18, 0, 0);
    const defaultPosition = new THREE.Vector3(38, 72, 170);
    camera.position.copy(defaultPosition);

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputEncoding = THREE.sRGBEncoding;
    stage.insertBefore(renderer.domElement, leaderLayer);

    const controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.target.copy(defaultTarget);
    controls.enableDamping = true;
    controls.dampingFactor = .075;
    controls.enablePan = true;
    controls.screenSpacePanning = true;
    controls.minDistance = 14;
    controls.maxDistance = 340;
    controls.update();

    scene.add(new THREE.AmbientLight(0xb8aa85, .72));
    const key = new THREE.DirectionalLight(0xffdfa0, 1.05);
    key.position.set(35, 55, 70);
    scene.add(key);

    const starGeometry = new THREE.BufferGeometry();
    const starPositions = [];
    for (let index = 0; index < 950; index += 1) {
      starPositions.push(
        (Math.random() - .5) * 420,
        (Math.random() - .5) * 220,
        (Math.random() - .5) * 260
      );
    }
    starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starPositions, 3));
    scene.add(new THREE.Points(starGeometry, new THREE.PointsMaterial({ color: 0xbcc5bf, size: .28, transparent: true, opacity: .5 })));

    const grid = new THREE.GridHelper(260, 26, 0x5b5139, 0x282923);
    grid.position.y = -34;
    grid.material.transparent = true;
    grid.material.opacity = .34;
    scene.add(grid);

    const groups = {
      nodes: new THREE.Group(),
      routes: new THREE.Group(),
      regions: new THREE.Group(),
      hazards: new THREE.Group()
    };
    Object.values(groups).forEach(group => scene.add(group));

    const layerVisibility = {
      primary: true,
      supporting: true,
      provisional: false,
      unnamed: false,
      exploratory: true,
      routes: true,
      regions: true,
      hazards: true,
      labels: true
    };
    let threatFilter = 'all';
    let selectedId = '';
    let running = true;
    let frame = 0;
    let labelDirty = true;

    const nodeMeshes = new Map();
    const pickables = [];
    const labelRecords = new Map();
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();

    function threatColor(node) {
      return data.threatStates[node.threat]?.color || data.threatStates.unsurveyed.color;
    }

    function isNodeVisible(node) {
      return layerVisibility[node.layer] !== false && (threatFilter === 'all' || node.threat === threatFilter);
    }

    for (const node of data.mapNodes) {
      const scale = Math.max(.42, Number(node.scale || .8));
      const geometry = new THREE.SphereGeometry(scale, 18, 14);
      const color = threatColor(node);
      const material = new THREE.MeshStandardMaterial({
        color,
        emissive: color,
        emissiveIntensity: node.layer === 'exploratory' ? .16 : .32,
        roughness: .5,
        metalness: .2,
        transparent: node.layer === 'exploratory',
        opacity: node.layer === 'exploratory' ? .72 : 1
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(...node.position);
      mesh.userData.nodeId = node.id;
      mesh.userData.baseScale = scale;
      groups.nodes.add(mesh);
      nodeMeshes.set(node.id, mesh);
      pickables.push(mesh);

      const halo = new THREE.Mesh(
        new THREE.SphereGeometry(scale * 1.62, 14, 10),
        new THREE.MeshBasicMaterial({ color, wireframe: true, transparent: true, opacity: node.layer === 'exploratory' ? .12 : .18 })
      );
      halo.userData.nodeId = node.id;
      mesh.add(halo);

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
      leader.setAttribute('stroke-width', node.layer === 'exploratory' ? '.7' : '1');
      leader.setAttribute('stroke-opacity', node.layer === 'exploratory' ? '.38' : '.62');
      leader.hidden = true;
      leaderLayer.appendChild(leader);
      labelRecords.set(node.id, { node, mesh, label, leader });
    }

    for (const route of data.routes) {
      const points = route.nodeIds.map(id => nodeById.get(id)).filter(Boolean).map(node => new THREE.Vector3(...node.position));
      if (points.length < 2) continue;
      const line = buildLine(THREE, points, routeMaterial(THREE, route));
      line.userData.route = route;
      groups.routes.add(line);
    }

    function volume(record, group, opacity) {
      const geometry = new THREE.SphereGeometry(1, 22, 14);
      const color = data.threatStates[record.threat]?.color || 0xb49142;
      const material = new THREE.MeshBasicMaterial({ color, wireframe: true, transparent: true, opacity });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(...record.center);
      mesh.scale.set(...record.radii);
      mesh.userData.volume = record;
      group.add(mesh);
    }
    data.regions.forEach(region => volume(region, groups.regions, .08));
    data.hazards.forEach(hazard => volume(hazard, groups.hazards, .16));

    function updateVisibility() {
      for (const [id, mesh] of nodeMeshes) {
        const node = nodeById.get(id);
        mesh.visible = isNodeVisible(node);
      }
      groups.routes.visible = layerVisibility.routes;
      groups.regions.visible = layerVisibility.regions;
      groups.hazards.visible = layerVisibility.hazards;
      labelLayer.hidden = !layerVisibility.labels;
      leaderLayer.hidden = !layerVisibility.labels;
      labelDirty = true;
    }

    function projectNode(node) {
      const vector = new THREE.Vector3(...node.position).project(camera);
      const rect = stage.getBoundingClientRect();
      return {
        x: (vector.x * .5 + .5) * rect.width,
        y: (-vector.y * .5 + .5) * rect.height,
        z: vector.z,
        width: rect.width,
        height: rect.height
      };
    }

    function rectFor(cx, cy, width, height) {
      return { left: cx - width / 2, right: cx + width / 2, top: cy - height / 2, bottom: cy + height / 2 };
    }

    function withinStage(rect, width, height, margin = 6) {
      return rect.left >= margin && rect.top >= margin && rect.right <= width - margin && rect.bottom <= height - margin;
    }

    function lanePosition(item, placed, stageWidth, stageHeight, labelWidth, labelHeight) {
      const preferredRight = item.x < stageWidth / 2;
      const lanes = preferredRight ? [stageWidth - labelWidth / 2 - 10, labelWidth / 2 + 10] : [labelWidth / 2 + 10, stageWidth - labelWidth / 2 - 10];
      const step = labelHeight + 7;
      for (const laneX of lanes) {
        const origin = Math.max(labelHeight / 2 + 8, Math.min(stageHeight - labelHeight / 2 - 8, item.y));
        for (let offset = 0; offset <= stageHeight; offset += step) {
          for (const direction of [1, -1]) {
            const cy = origin + offset * direction;
            const rect = rectFor(laneX, cy, labelWidth, labelHeight);
            if (!withinStage(rect, stageWidth, stageHeight) || placed.some(entry => intersectArea(expanded(rect), entry) > 0)) continue;
            return { cx: laneX, cy, rect, lane: true };
          }
        }
      }
      return null;
    }

    function layoutLabels() {
      if (!layerVisibility.labels) return;
      const stageRect = stage.getBoundingClientRect();
      if (!stageRect.width || !stageRect.height) return;

      const candidates = [];
      for (const record of labelRecords.values()) {
        const { node, label, leader } = record;
        if (!isNodeVisible(node)) {
          label.hidden = true;
          leader.hidden = true;
          continue;
        }
        const projected = projectNode(node);
        if (projected.z < -1 || projected.z > 1 || projected.x < -60 || projected.x > projected.width + 60 || projected.y < -60 || projected.y > projected.height + 60) {
          label.hidden = true;
          leader.hidden = true;
          continue;
        }
        label.hidden = false;
        label.style.visibility = 'hidden';
        candidates.push({ ...record, ...projected, priority: labelPriority(node, selectedId) });
      }

      candidates.sort((a, b) => b.priority - a.priority || a.z - b.z);
      const placed = [];

      for (const item of candidates) {
        const { node, label, leader, x, y, width: stageWidth, height: stageHeight } = item;
        label.style.left = '0px';
        label.style.top = '0px';
        const labelWidth = Math.min(Math.max(label.offsetWidth || node.name.length * 7 + 18, 62), 220);
        const labelHeight = Math.max(label.offsetHeight || 30, 26);
        let best = null;
        let bestOverlap = Infinity;

        for (const position of candidatePositions(x, y, labelWidth, labelHeight, node.layer === 'primary' ? 210 : 170)) {
          const rect = rectFor(position.cx, position.cy, labelWidth, labelHeight);
          if (!withinStage(rect, stageWidth, stageHeight)) continue;
          const overlap = placed.reduce((sum, entry) => sum + intersectArea(expanded(rect), entry), 0);
          if (overlap === 0) {
            best = { ...position, rect };
            break;
          }
          if (overlap < bestOverlap) {
            bestOverlap = overlap;
            best = { ...position, rect };
          }
        }

        const canonical = node.layer === 'primary' || node.layer === 'supporting';
        if ((!best || bestOverlap > 0) && canonical) {
          const lane = lanePosition(item, placed, stageWidth, stageHeight, labelWidth, labelHeight);
          if (lane) best = lane;
        }

        const mustShow = canonical || node.id === selectedId;
        if (!best || (!mustShow && placed.some(entry => intersectArea(expanded(best.rect), entry) > 0))) {
          label.hidden = true;
          leader.hidden = true;
          continue;
        }

        if (mustShow && placed.some(entry => intersectArea(expanded(best.rect), entry) > 0)) {
          const lane = lanePosition(item, placed, stageWidth, stageHeight, labelWidth, labelHeight);
          if (lane) best = lane;
        }

        if (!best || placed.some(entry => intersectArea(expanded(best.rect), entry) > 0)) {
          label.hidden = true;
          leader.hidden = true;
          continue;
        }

        placed.push(expanded(best.rect));
        label.hidden = false;
        label.style.visibility = 'visible';
        label.style.left = `${best.cx}px`;
        label.style.top = `${best.cy}px`;
        label.setAttribute('aria-current', node.id === selectedId ? 'true' : 'false');

        leader.hidden = false;
        leader.setAttribute('x1', String(x));
        leader.setAttribute('y1', String(y));
        leader.setAttribute('x2', String(best.cx));
        leader.setAttribute('y2', String(best.cy));
      }
      labelDirty = false;
    }

    function renderSelection(node) {
      selectedId = node.id;
      for (const [id, mesh] of nodeMeshes) {
        const selected = id === selectedId;
        const scale = selected ? 1.55 : 1;
        mesh.scale.setScalar(scale);
        mesh.material.emissiveIntensity = selected ? .85 : (nodeById.get(id).layer === 'exploratory' ? .16 : .32);
      }
      labelRecords.forEach((record, id) => record.label.setAttribute('aria-current', id === selectedId ? 'true' : 'false'));
      onSelect?.(node, node.recordIds.map(id => recordById.get(id)).filter(Boolean));
      labelDirty = true;
    }

    function focusNode(node) {
      const target = new THREE.Vector3(...node.position);
      const direction = camera.position.clone().sub(controls.target).normalize();
      controls.target.copy(target);
      camera.position.copy(target.clone().add(direction.multiplyScalar(Math.max(28, camera.position.distanceTo(controls.target) * .42))));
      controls.update();
      labelDirty = true;
    }

    function selectNode(nodeId, focus = false) {
      const node = nodeById.get(nodeId);
      if (!node) return;
      renderSelection(node);
      if (focus) focusNode(node);
    }

    renderer.domElement.addEventListener('pointerup', event => {
      if (event.button !== 0) return;
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const hit = raycaster.intersectObjects(pickables.filter(mesh => mesh.visible), false)[0];
      if (hit?.object?.userData?.nodeId) selectNode(hit.object.userData.nodeId, false);
    });

    controls.addEventListener('change', () => { labelDirty = true; });

    function resize() {
      const width = Math.max(320, stage.clientWidth);
      const height = Math.max(420, stage.clientHeight);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      leaderLayer.setAttribute('viewBox', `0 0 ${width} ${height}`);
      labelDirty = true;
    }
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(stage);
    resize();

    function animate() {
      if (!running) return;
      requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
      frame += 1;
      if (labelDirty || frame % 10 === 0) layoutLabels();
    }
    animate();

    status.textContent = `${data.mapNodes.length} plotted contacts · canonical names float adjacent without label overlap · exploratory labels yield to canonical names`;

    return {
      selectNode,
      setLayer(layer, visible) { layerVisibility[layer] = Boolean(visible); updateVisibility(); },
      setThreat(value) { threatFilter = value || 'all'; updateVisibility(); },
      reset() {
        camera.position.copy(defaultPosition);
        controls.target.copy(defaultTarget);
        controls.update();
        labelDirty = true;
      },
      top() {
        camera.position.set(defaultTarget.x, 230, defaultTarget.z + .01);
        camera.up.set(0, 0, -1);
        controls.target.copy(defaultTarget);
        controls.update();
        setTimeout(() => camera.up.set(0, 1, 0), 0);
        labelDirty = true;
      },
      pause() { running = false; },
      resume() { if (!running) { running = true; animate(); labelDirty = true; } },
      destroy() {
        running = false;
        resizeObserver.disconnect();
        renderer.dispose();
        renderer.domElement.remove();
        labelLayer.replaceChildren();
        leaderLayer.replaceChildren();
      }
    };
  }

  window.CafarronSectorMap = Object.freeze({ mount });
})();
