(() => {
  'use strict';

  const THREE_URL = 'https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.min.js';
  const ORBIT_URL = 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js';
  const scriptLoads = new Map();
  const VALID_MODES = new Set(['select', 'orbit', 'pan', 'zoom']);

  function loadScript(src) {
    if (scriptLoads.has(src)) return scriptLoads.get(src);
    const resolved = new URL(src, document.baseURI).href;
    const existing = [...document.scripts].find(script => script.src === resolved);
    if (existing?.dataset.cafarronLoaded === 'true') return Promise.resolve();
    const promise = new Promise((resolve, reject) => {
      const script = existing || document.createElement('script');
      let settled = false;
      const done = () => {
        if (settled) return;
        settled = true;
        script.dataset.cafarronLoaded = 'true';
        resolve();
      };
      const fail = () => {
        if (settled) return;
        settled = true;
        reject(new Error(`${src} could not be loaded.`));
      };
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

  function rectFor(cx, cy, width, height) {
    return {
      left: cx - width / 2,
      right: cx + width / 2,
      top: cy - height / 2,
      bottom: cy + height / 2
    };
  }

  function clamp(value, minimum, maximum) {
    return Math.max(minimum, Math.min(maximum, value));
  }

  function nearestPointOnRect(x, y, rect) {
    return {
      x: clamp(x, rect.left, rect.right),
      y: clamp(y, rect.top, rect.bottom)
    };
  }

  function localCandidatePositions(x, y, width, height) {
    const positions = [];
    const radii = [24, 36, 50, 68, 90, 116];
    const angles = [-32, 32, -148, 148, -78, 78, 0, 180];
    for (const radius of radii) {
      for (const degrees of angles) {
        const angle = degrees * Math.PI / 180;
        positions.push({
          cx: x + Math.cos(angle) * (radius + width * .18),
          cy: y + Math.sin(angle) * (radius + height * .18)
        });
      }
    }
    return positions;
  }

  function routeMaterial(THREE, route) {
    const authorial = route.layer === 'authorial';
    const exploratory = route.layer === 'exploratory';
    return new THREE.LineDashedMaterial({
      color: authorial ? 0xd8b35e : exploratory ? 0x9ea6a1 : 0x80785f,
      transparent: true,
      opacity: authorial ? .66 : exploratory ? .12 : .28,
      dashSize: exploratory ? 1.1 : 2,
      gapSize: exploratory ? 1.7 : 1.6
    });
  }

  function buildLine(THREE, points, material) {
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const line = new THREE.Line(geometry, material);
    line.computeLineDistances();
    return line;
  }

  async function mount(options) {
    const {
      data,
      stage,
      labelLayer,
      leaderLayer,
      status,
      onSelect,
      initialMode = 'orbit'
    } = options;
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
    controls.dampingFactor = .028;
    controls.rotateSpeed = .18;
    controls.panSpeed = .2;
    controls.zoomSpeed = .24;
    controls.keyPanSpeed = 3;
    controls.enablePan = true;
    controls.screenSpacePanning = true;
    controls.minDistance = 18;
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
    scene.add(new THREE.Points(starGeometry, new THREE.PointsMaterial({
      color: 0xbcc5bf,
      size: .28,
      transparent: true,
      opacity: .5
    })));

    const grid = new THREE.GridHelper(260, 26, 0x5b5139, 0x282923);
    grid.position.y = -34;
    grid.material.transparent = true;
    grid.material.opacity = .26;
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
      routes: false,
      regions: false,
      hazards: false,
      labels: true
    };

    let interactionMode = VALID_MODES.has(initialMode) ? initialMode : 'orbit';
    let threatFilter = 'all';
    let selectedId = '';
    let running = true;
    let frame = 0;
    let labelDirty = true;
    let transition = null;
    let pointerStart = null;

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

    function shouldShowLabel(node) {
      if (!isNodeVisible(node) || !layerVisibility.labels) return false;
      if (node.id === selectedId) return true;
      return node.layer === 'primary' || node.layer === 'supporting';
    }

    for (const node of data.mapNodes) {
      const scale = Math.max(.42, Number(node.scale || .8));
      const geometry = new THREE.SphereGeometry(scale, 18, 14);
      const color = threatColor(node);
      const exploratory = node.layer === 'exploratory';
      const material = new THREE.MeshStandardMaterial({
        color,
        emissive: color,
        emissiveIntensity: exploratory ? .12 : .3,
        roughness: .5,
        metalness: .2,
        transparent: exploratory,
        opacity: exploratory ? .62 : 1
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
        new THREE.MeshBasicMaterial({
          color,
          wireframe: true,
          transparent: true,
          opacity: exploratory ? .08 : .16
        })
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
      leader.setAttribute('stroke-width', exploratory ? '.75' : '1');
      leader.setAttribute('stroke-opacity', exploratory ? '.42' : '.66');
      leader.hidden = true;
      leaderLayer.appendChild(leader);
      labelRecords.set(node.id, { node, mesh, label, leader });
    }

    for (const route of data.routes) {
      const points = route.nodeIds
        .map(id => nodeById.get(id))
        .filter(Boolean)
        .map(node => new THREE.Vector3(...node.position));
      if (points.length < 2) continue;
      const line = buildLine(THREE, points, routeMaterial(THREE, route));
      line.userData.route = route;
      groups.routes.add(line);
    }

    function volume(record, group, opacity) {
      const geometry = new THREE.SphereGeometry(1, 22, 14);
      const color = data.threatStates[record.threat]?.color || 0xb49142;
      const material = new THREE.MeshBasicMaterial({
        color,
        wireframe: true,
        transparent: true,
        opacity
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(...record.center);
      mesh.scale.set(...record.radii);
      mesh.userData.volume = record;
      group.add(mesh);
    }
    data.regions.forEach(region => volume(region, groups.regions, .06));
    data.hazards.forEach(hazard => volume(hazard, groups.hazards, .13));

    function modeDescription() {
      return {
        select: 'Select mode: click contacts without moving the survey.',
        orbit: 'Grab / orbit mode: drag slowly around the sector.',
        pan: 'Pan mode: drag the survey plane with graduated resistance.',
        zoom: 'Zoom mode: drag vertically or use the wheel / pinch lens.'
      }[interactionMode];
    }

    function updateStatus() {
      status.textContent = `${data.mapNodes.length} plotted contacts · ${modeDescription()} Exploratory names remain sealed until selected.`;
    }

    function applyInteractionMode() {
      stage.dataset.mapMode = interactionMode;
      controls.enabled = interactionMode !== 'select' && !transition;
      if (interactionMode === 'orbit') {
        controls.mouseButtons.LEFT = THREE.MOUSE.ROTATE;
        controls.mouseButtons.MIDDLE = THREE.MOUSE.DOLLY;
        controls.mouseButtons.RIGHT = THREE.MOUSE.PAN;
        controls.touches.ONE = THREE.TOUCH.ROTATE;
        controls.touches.TWO = THREE.TOUCH.DOLLY_PAN;
      } else if (interactionMode === 'pan') {
        controls.mouseButtons.LEFT = THREE.MOUSE.PAN;
        controls.mouseButtons.MIDDLE = THREE.MOUSE.DOLLY;
        controls.mouseButtons.RIGHT = THREE.MOUSE.ROTATE;
        controls.touches.ONE = THREE.TOUCH.PAN;
        controls.touches.TWO = THREE.TOUCH.DOLLY_PAN;
      } else if (interactionMode === 'zoom') {
        controls.mouseButtons.LEFT = THREE.MOUSE.DOLLY;
        controls.mouseButtons.MIDDLE = THREE.MOUSE.DOLLY;
        controls.mouseButtons.RIGHT = THREE.MOUSE.PAN;
        controls.touches.ONE = THREE.TOUCH.PAN;
        controls.touches.TWO = THREE.TOUCH.DOLLY_PAN;
      }
      updateStatus();
    }

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

    function hideLabel(record) {
      record.label.hidden = true;
      record.leader.hidden = true;
      record.label.style.visibility = 'hidden';
      record.label.removeAttribute('data-placement');
    }

    function measureCandidate(record, projected) {
      const { node, label } = record;
      label.hidden = false;
      label.style.visibility = 'hidden';
      label.style.left = '0px';
      label.style.top = '0px';
      const width = Math.min(Math.max(label.offsetWidth || node.name.length * 7 + 18, 62), 218);
      const height = Math.max(label.offsetHeight || 25, 24);
      return { ...record, ...projected, labelWidth: width, labelHeight: height };
    }

    function placeEdgeGroup(items, side, stageWidth, stageHeight) {
      if (!items.length) return [];
      const margin = 10;
      const available = Math.max(1, stageHeight - margin * 2);
      const totalLabelHeight = items.reduce((sum, item) => sum + item.labelHeight, 0);
      const gap = items.length > 1
        ? Math.max(1, Math.min(7, (available - totalLabelHeight) / (items.length - 1)))
        : 0;
      const sorted = [...items].sort((a, b) => a.y - b.y);
      const placed = [];
      let cursor = margin;

      for (const item of sorted) {
        const ideal = clamp(item.y, margin + item.labelHeight / 2, stageHeight - margin - item.labelHeight / 2);
        const cy = Math.max(ideal, cursor + item.labelHeight / 2);
        const cx = side === 'left'
          ? margin + item.labelWidth / 2
          : stageWidth - margin - item.labelWidth / 2;
        const rect = rectFor(cx, cy, item.labelWidth, item.labelHeight);
        placed.push({ ...item, cx, cy, rect, placement: `edge-${side}` });
        cursor = rect.bottom + gap;
      }

      const overflow = placed.length ? placed[placed.length - 1].rect.bottom - (stageHeight - margin) : 0;
      if (overflow > 0) {
        for (const item of placed) {
          item.cy -= overflow;
          item.rect = rectFor(item.cx, item.cy, item.labelWidth, item.labelHeight);
        }
      }

      for (let index = placed.length - 2; index >= 0; index -= 1) {
        const current = placed[index];
        const next = placed[index + 1];
        const maximumBottom = next.rect.top - gap;
        if (current.rect.bottom > maximumBottom) {
          current.cy -= current.rect.bottom - maximumBottom;
          current.rect = rectFor(current.cx, current.cy, current.labelWidth, current.labelHeight);
        }
      }
      return placed;
    }

    function placeSelectedLocal(item, occupied, stageWidth, stageHeight) {
      const margin = 7;
      for (const position of localCandidatePositions(item.x, item.y, item.labelWidth, item.labelHeight)) {
        const rect = rectFor(position.cx, position.cy, item.labelWidth, item.labelHeight);
        const inside = rect.left >= margin && rect.top >= margin && rect.right <= stageWidth - margin && rect.bottom <= stageHeight - margin;
        if (!inside) continue;
        if (occupied.some(entry => intersectArea(expanded(rect), entry) > 0)) continue;
        return { ...item, ...position, rect, placement: 'local' };
      }
      const side = item.x <= stageWidth / 2 ? 'left' : 'right';
      return placeEdgeGroup([item], side, stageWidth, stageHeight)[0] || null;
    }

    function applyLabelPlacement(item) {
      const { node, label, leader, x, y, cx, cy, rect, placement } = item;
      label.hidden = false;
      label.style.visibility = 'visible';
      label.style.left = `${cx}px`;
      label.style.top = `${cy}px`;
      label.dataset.placement = placement;
      label.setAttribute('aria-current', node.id === selectedId ? 'true' : 'false');

      const end = nearestPointOnRect(x, y, rect);
      leader.hidden = false;
      leader.setAttribute('x1', String(x));
      leader.setAttribute('y1', String(y));
      leader.setAttribute('x2', String(end.x));
      leader.setAttribute('y2', String(end.y));
    }

    function layoutLabels() {
      if (!layerVisibility.labels) return;
      const stageRect = stage.getBoundingClientRect();
      if (!stageRect.width || !stageRect.height) return;

      const canonical = [];
      let selectedOther = null;
      for (const record of labelRecords.values()) {
        const { node } = record;
        if (!shouldShowLabel(node)) {
          hideLabel(record);
          continue;
        }
        const projected = projectNode(node);
        if (
          projected.z < -1 || projected.z > 1 ||
          projected.x < -60 || projected.x > projected.width + 60 ||
          projected.y < -60 || projected.y > projected.height + 60
        ) {
          hideLabel(record);
          continue;
        }
        const candidate = measureCandidate(record, projected);
        if (node.layer === 'primary' || node.layer === 'supporting') canonical.push(candidate);
        else if (node.id === selectedId) selectedOther = candidate;
      }

      const left = canonical.filter(item => item.x <= stageRect.width / 2);
      const right = canonical.filter(item => item.x > stageRect.width / 2);
      const edgePlacements = [
        ...placeEdgeGroup(left, 'left', stageRect.width, stageRect.height),
        ...placeEdgeGroup(right, 'right', stageRect.width, stageRect.height)
      ];
      const occupied = edgePlacements.map(item => expanded(item.rect));
      edgePlacements.forEach(applyLabelPlacement);

      if (selectedOther) {
        const placement = placeSelectedLocal(selectedOther, occupied, stageRect.width, stageRect.height);
        if (placement) applyLabelPlacement(placement);
        else hideLabel(selectedOther);
      }

      labelDirty = false;
    }

    function renderSelection(node) {
      selectedId = node.id;
      for (const [id, mesh] of nodeMeshes) {
        const selected = id === selectedId;
        mesh.scale.setScalar(selected ? 1.55 : 1);
        const record = nodeById.get(id);
        mesh.material.emissiveIntensity = selected ? .85 : (record.layer === 'exploratory' ? .12 : .3);
      }
      labelRecords.forEach((record, id) => record.label.setAttribute('aria-current', id === selectedId ? 'true' : 'false'));
      onSelect?.(node, node.recordIds.map(id => recordById.get(id)).filter(Boolean));
      labelDirty = true;
    }

    function easeGelatin(value) {
      return value < .5
        ? 4 * value * value * value
        : 1 - Math.pow(-2 * value + 2, 3) / 2;
    }

    function beginTransition(position, target, duration = 1650) {
      transition = {
        startTime: performance.now(),
        duration,
        fromPosition: camera.position.clone(),
        toPosition: position.clone(),
        fromTarget: controls.target.clone(),
        toTarget: target.clone()
      };
      controls.enabled = false;
      labelDirty = true;
    }

    function updateTransition(now) {
      if (!transition) return;
      const progress = clamp((now - transition.startTime) / transition.duration, 0, 1);
      const eased = easeGelatin(progress);
      camera.position.lerpVectors(transition.fromPosition, transition.toPosition, eased);
      controls.target.lerpVectors(transition.fromTarget, transition.toTarget, eased);
      labelDirty = true;
      if (progress >= 1) {
        transition = null;
        applyInteractionMode();
      }
    }

    function focusNode(node) {
      const target = new THREE.Vector3(...node.position);
      const direction = camera.position.clone().sub(controls.target);
      if (direction.lengthSq() < .001) direction.set(0, .35, 1);
      direction.normalize();
      const currentDistance = camera.position.distanceTo(controls.target);
      const distance = Math.max(30, currentDistance * .48);
      camera.up.set(0, 1, 0);
      beginTransition(target.clone().add(direction.multiplyScalar(distance)), target, 1550);
    }

    function selectNode(nodeId, focus = false) {
      const node = nodeById.get(nodeId);
      if (!node) return;
      renderSelection(node);
      if (focus) focusNode(node);
    }

    function pickAt(event) {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const hit = raycaster.intersectObjects(pickables.filter(mesh => mesh.visible), false)[0];
      if (hit?.object?.userData?.nodeId) selectNode(hit.object.userData.nodeId, false);
    }

    renderer.domElement.addEventListener('pointerdown', event => {
      pointerStart = { x: event.clientX, y: event.clientY, button: event.button };
      stage.dataset.dragging = 'true';
    });
    renderer.domElement.addEventListener('pointerup', event => {
      stage.dataset.dragging = 'false';
      if (!pointerStart || pointerStart.button !== 0 || event.button !== 0) {
        pointerStart = null;
        return;
      }
      const distance = Math.hypot(event.clientX - pointerStart.x, event.clientY - pointerStart.y);
      pointerStart = null;
      if (distance <= 6) pickAt(event);
    });
    renderer.domElement.addEventListener('pointercancel', () => {
      pointerStart = null;
      stage.dataset.dragging = 'false';
    });

    controls.addEventListener('start', () => {
      transition = null;
      applyInteractionMode();
      labelDirty = true;
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

    function animate(now = performance.now()) {
      if (!running) return;
      requestAnimationFrame(animate);
      updateTransition(now);
      controls.update();
      renderer.render(scene, camera);
      frame += 1;
      if (labelDirty || frame % 8 === 0) layoutLabels();
    }

    applyInteractionMode();
    updateVisibility();
    animate();

    return {
      selectNode,
      setMode(mode) {
        if (!VALID_MODES.has(mode)) return interactionMode;
        interactionMode = mode;
        transition = null;
        applyInteractionMode();
        return interactionMode;
      },
      setLayer(layer, visible) {
        if (!(layer in layerVisibility)) return;
        layerVisibility[layer] = Boolean(visible);
        updateVisibility();
      },
      setThreat(value) {
        threatFilter = value || 'all';
        updateVisibility();
      },
      reset() {
        camera.up.set(0, 1, 0);
        beginTransition(defaultPosition, defaultTarget, 1850);
      },
      top() {
        camera.up.set(0, 0, -1);
        beginTransition(new THREE.Vector3(defaultTarget.x, 230, defaultTarget.z + .01), defaultTarget, 1850);
      },
      pause() { running = false; },
      resume() {
        if (!running) {
          running = true;
          labelDirty = true;
          animate();
        }
      },
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
