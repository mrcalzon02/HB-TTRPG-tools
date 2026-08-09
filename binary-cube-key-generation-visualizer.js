(() => {
  'use strict';

  const PANEL_ID = 'binary-cube-key-generation-visualizer';
  const WORKER_URL = 'binary-cube-key-generation-research-worker.js?v=20260809-key-profile-visualizer-1';
  const THREE_URL = 'https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.min.js';
  const ORBIT_URL = 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js';
  const Research = window.BinaryCubeKeyGenerationResearch;
  const SeedSource = window.ShadowrunBinaryCubeWorkerClient;

  if (!Research) throw new Error('Key Generation Structure Visualizer requires BinaryCubeKeyGenerationResearch.');

  const PROFILE_PRESETS = Object.freeze({
    contrasts: Object.freeze(['direct-permutation', 'random-transposition-walk', 'local-adjacent-walk', 'nested-hierarchy', 'nested-interleaved']),
    all: Research.constants.PROFILES,
    walks: Object.freeze(['direct-permutation', 'random-transposition-walk', 'local-adjacent-walk']),
    nested: Object.freeze(['direct-permutation', 'nested-permutation', 'nested-hierarchy', 'nested-interleaved']),
    viable: Object.freeze(['direct-permutation', 'iterative-chain', 'random-transposition-walk', 'nested-permutation', 'nested-interleaved'])
  });

  let panel = null;
  let scene = null;
  let camera = null;
  let renderer = null;
  let controls = null;
  let comparisonRoot = null;
  let animationFrame = null;
  let resizeObserver = null;
  let activeWorker = null;
  let workerRequestId = 0;
  let workerHeartbeat = 0;
  let workerStartedAt = 0;
  let lastProgress = { stage: '', fraction: 0, detail: '' };
  let currentSnapshot = null;
  let ignoreAdjacency = false;
  let renderMode = 'mesh';
  let autoRotate = false;
  const scriptPromises = new Map();

  function fail(message) { throw new Error(message); }
  function clamp(value, minimum, maximum) { return Math.max(minimum, Math.min(maximum, value)); }
  function escapeHtml(value) { return String(value ?? '').replace(/[&<>'"]/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character])); }
  function percent(value, digits = 1) { return `${(Number(value || 0) * 100).toFixed(digits)}%`; }
  function fixed(value, digits = 3) { return Number(value || 0).toFixed(digits); }

  function normalizedUrl(value) {
    const url = new URL(value, document.baseURI);
    url.search = '';
    url.hash = '';
    return url.href;
  }

  function loadExternalScript(src, ready) {
    if (ready()) return Promise.resolve();
    if (scriptPromises.has(src)) return scriptPromises.get(src);
    const promise = new Promise((resolve, reject) => {
      const normalized = normalizedUrl(src);
      const existing = [...document.scripts].find(script => normalizedUrl(script.src || '') === normalized);
      const script = existing || document.createElement('script');
      const finish = () => ready() ? resolve() : reject(new Error(`${src} loaded without its expected API.`));
      script.addEventListener('load', finish, { once: true });
      script.addEventListener('error', () => reject(new Error(`${src} failed to load.`)), { once: true });
      if (!existing) {
        script.src = src;
        script.async = false;
        document.head.appendChild(script);
      } else if (ready()) resolve();
    });
    scriptPromises.set(src, promise);
    promise.catch(() => scriptPromises.delete(src));
    return promise;
  }

  async function ensureThree() {
    await loadExternalScript(THREE_URL, () => Boolean(window.THREE));
    await loadExternalScript(ORBIT_URL, () => Boolean(window.THREE?.OrbitControls));
  }

  function setStatus(message, type = '') {
    const node = panel?.querySelector('[data-bcg-status]');
    if (!node) return;
    node.textContent = message;
    node.classList.toggle('error', type === 'error');
    node.classList.toggle('success', type === 'success');
  }

  function setBusy(busy) {
    if (!panel) return;
    panel.dataset.bcgBusy = busy ? 'true' : 'false';
    panel.querySelectorAll('[data-bcg-run],[data-bcg-reseed]').forEach(control => { control.disabled = busy; });
    const cancel = panel.querySelector('[data-bcg-cancel]');
    if (cancel) cancel.disabled = !busy;
  }

  function currentProfiles() {
    const preset = panel?.querySelector('[data-bcg-preset]')?.value || 'contrasts';
    return PROFILE_PRESETS[preset] || PROFILE_PRESETS.contrasts;
  }

  function stopHeartbeat() {
    if (workerHeartbeat) window.clearInterval(workerHeartbeat);
    workerHeartbeat = 0;
  }

  function cancelWorker(reason = 'cancelled') {
    stopHeartbeat();
    if (!activeWorker) return false;
    activeWorker.terminate();
    activeWorker = null;
    workerRequestId += 1;
    setBusy(false);
    setStatus(`Key-generation comparison ${reason}.`, 'success');
    return true;
  }

  function runWorkerComparison(payload) {
    cancelWorker('superseded');
    const requestId = ++workerRequestId;
    const worker = new Worker(WORKER_URL);
    activeWorker = worker;
    workerStartedAt = performance.now();
    lastProgress = { stage: 'Starting research worker', fraction: 0, detail: '' };
    setBusy(true);
    setStatus('Starting background key-generation comparison…');

    workerHeartbeat = window.setInterval(() => {
      if (activeWorker !== worker || requestId !== workerRequestId) return;
      const elapsedSeconds = Math.max(0, (performance.now() - workerStartedAt) / 1000);
      const percentage = Math.round(clamp(lastProgress.fraction || 0, 0, 1) * 100);
      setStatus(`${lastProgress.stage || 'Background worker active'} · ${percentage}% · ${elapsedSeconds.toFixed(0)}s elapsed${lastProgress.detail ? ` · ${lastProgress.detail}` : ''}`);
    }, 1000);

    return new Promise((resolve, reject) => {
      worker.addEventListener('message', event => {
        if (activeWorker !== worker || requestId !== workerRequestId) return;
        const message = event.data || {};
        if (message.id !== requestId) return;
        if (message.type === 'progress') {
          lastProgress = message;
          const percentage = Math.round(clamp(message.fraction || 0, 0, 1) * 100);
          setStatus(`${message.stage} · ${percentage}%${message.detail ? ` · ${message.detail}` : ''}`);
          return;
        }
        stopHeartbeat();
        worker.terminate();
        activeWorker = null;
        setBusy(false);
        if (message.type === 'result') resolve(message.result);
        else {
          const error = new Error(message.error?.message || 'Key-generation research worker failed.');
          error.name = message.error?.name || 'Error';
          reject(error);
        }
      });
      worker.addEventListener('error', event => {
        if (activeWorker !== worker || requestId !== workerRequestId) return;
        stopHeartbeat();
        worker.terminate();
        activeWorker = null;
        setBusy(false);
        reject(new Error(event.message || 'Key-generation research worker failed.'));
      }, { once: true });
      worker.postMessage({ id: requestId, operation: 'compare-profiles', payload });
    });
  }

  function disposeMaterial(material) {
    if (!material) return;
    if (Array.isArray(material)) material.forEach(disposeMaterial);
    else {
      if (material.map?.dispose) material.map.dispose();
      material.dispose?.();
    }
  }

  function disposeObject(object) {
    object.traverse?.(child => {
      child.geometry?.dispose?.();
      disposeMaterial(child.material);
    });
  }

  function clearComparisonScene() {
    if (!comparisonRoot) return;
    while (comparisonRoot.children.length) {
      const child = comparisonRoot.children.pop();
      disposeObject(child);
    }
  }

  function textSprite(text, subtitle = '') {
    const canvas = document.createElement('canvas');
    canvas.width = 768;
    canvas.height = 150;
    const context = canvas.getContext('2d');
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = 'rgba(8,12,20,.82)';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.strokeStyle = 'rgba(255,255,255,.18)';
    context.lineWidth = 3;
    context.strokeRect(2, 2, canvas.width - 4, canvas.height - 4);
    context.fillStyle = '#f4f7fb';
    context.font = '700 42px system-ui, sans-serif';
    context.textAlign = 'center';
    context.fillText(text, canvas.width / 2, 62);
    context.fillStyle = '#aeb9ca';
    context.font = '500 27px system-ui, sans-serif';
    context.fillText(subtitle, canvas.width / 2, 110);
    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false });
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(3.15, 0.62, 1);
    return sprite;
  }

  function depthColor(depthNormalized) {
    const color = new THREE.Color();
    color.setHSL(0.66 - clamp(depthNormalized, 0, 1) * 0.62, 0.78, 0.58);
    return color;
  }

  function regionColor(xNormalized, yNormalized) {
    const regionX = Math.min(3, Math.floor(clamp(xNormalized, 0, 0.999999) * 4));
    const regionY = Math.min(1, Math.floor(clamp(yNormalized, 0, 0.999999) * 2));
    const region = regionY * 4 + regionX;
    const color = new THREE.Color();
    color.setHSL((region / 8 + 0.08) % 1, 0.68, 0.58);
    return color;
  }

  function buildProfileGroup(snapshot, index, count) {
    const group = new THREE.Group();
    group.userData.profile = snapshot.profile;
    const sample = snapshot.sampleAxisIndexes;
    const sampleSize = sample.length;
    const gridSize = snapshot.gridSize;
    const cubeSize = count <= 4 ? 2.7 : 2.25;
    const positions = [];
    const colors = [];
    const linePositions = [];
    const pointAt = (xIndex, yIndex) => {
      const x = sample[xIndex];
      const y = sample[yIndex];
      const depth = snapshot.depths[xIndex * sampleSize + yIndex];
      return {
        x: (x / Math.max(1, gridSize - 1) - 0.5) * cubeSize,
        y: (y / Math.max(1, gridSize - 1) - 0.5) * cubeSize,
        z: (depth / Math.max(1, gridSize - 1) - 0.5) * cubeSize,
        xn: x / Math.max(1, gridSize - 1),
        yn: y / Math.max(1, gridSize - 1),
        zn: depth / Math.max(1, gridSize - 1)
      };
    };

    for (let xIndex = 0; xIndex < sampleSize; xIndex += 1) {
      for (let yIndex = 0; yIndex < sampleSize; yIndex += 1) {
        const point = pointAt(xIndex, yIndex);
        positions.push(point.x, point.y, point.z);
        const color = renderMode === 'regions' ? regionColor(point.xn, point.yn) : depthColor(point.zn);
        colors.push(color.r, color.g, color.b);
        if (renderMode !== 'points') {
          if (xIndex + 1 < sampleSize) {
            const next = pointAt(xIndex + 1, yIndex);
            linePositions.push(point.x, point.y, point.z, next.x, next.y, next.z);
          }
          if (yIndex + 1 < sampleSize) {
            const next = pointAt(xIndex, yIndex + 1);
            linePositions.push(point.x, point.y, point.z, next.x, next.y, next.z);
          }
        }
      }
    }

    const pointsGeometry = new THREE.BufferGeometry();
    pointsGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    pointsGeometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    const pointsMaterial = new THREE.PointsMaterial({ size: count <= 4 ? 0.055 : 0.042, vertexColors: true, transparent: true, opacity: 0.94, sizeAttenuation: true });
    group.add(new THREE.Points(pointsGeometry, pointsMaterial));

    if (linePositions.length) {
      const lineGeometry = new THREE.BufferGeometry();
      lineGeometry.setAttribute('position', new THREE.Float32BufferAttribute(linePositions, 3));
      const lineMaterial = new THREE.LineBasicMaterial({ color: 0xd7e1ef, transparent: true, opacity: renderMode === 'regions' ? 0.16 : 0.22 });
      group.add(new THREE.LineSegments(lineGeometry, lineMaterial));
    }

    const box = new THREE.BoxGeometry(cubeSize, cubeSize, cubeSize);
    const edges = new THREE.EdgesGeometry(box);
    box.dispose();
    group.add(new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0x78879b, transparent: true, opacity: 0.32 })));

    const evaluation = ignoreAdjacency ? snapshot.evaluationIgnoringAdjacency : snapshot.evaluation;
    const warningCount = evaluation.concerns.length;
    const label = textSprite(snapshot.profileDefinition?.label || snapshot.profile, warningCount ? `${warningCount} structural flag${warningCount === 1 ? '' : 's'}` : 'no current structural flags');
    label.position.set(0, cubeSize * 0.78, 0);
    group.add(label);
    return group;
  }

  function layoutComparison(snapshot) {
    clearComparisonScene();
    if (!snapshot?.profiles?.length) return;
    const count = snapshot.profiles.length;
    const columns = Math.ceil(Math.sqrt(count));
    const rows = Math.ceil(count / columns);
    const spacingX = count <= 4 ? 4.2 : 3.55;
    const spacingY = count <= 4 ? 4.0 : 3.45;
    snapshot.profiles.forEach((profileSnapshot, index) => {
      const column = index % columns;
      const row = Math.floor(index / columns);
      const group = buildProfileGroup(profileSnapshot, index, count);
      group.position.set((column - (columns - 1) / 2) * spacingX, ((rows - 1) / 2 - row) * spacingY, 0);
      comparisonRoot.add(group);
    });
    resetCamera();
  }

  function resetCamera() {
    if (!camera || !controls || !currentSnapshot) return;
    const count = currentSnapshot.profiles.length;
    const columns = Math.ceil(Math.sqrt(count));
    const rows = Math.ceil(count / columns);
    const extentX = columns * (count <= 4 ? 4.2 : 3.55);
    const extentY = rows * (count <= 4 ? 4.0 : 3.45);
    const distance = Math.max(10, Math.max(extentX, extentY) * 1.45);
    camera.position.set(distance * 0.18, distance * 0.12, distance);
    controls.target.set(0, 0, 0);
    controls.update();
  }

  function resizeRenderer() {
    if (!renderer || !camera || !panel) return;
    const viewport = panel.querySelector('[data-bcg-viewport]');
    if (!viewport) return;
    const width = Math.max(320, viewport.clientWidth || 800);
    const height = Math.max(360, Math.min(720, width * 0.63));
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }

  function renderLoop() {
    if (!panel || panel.hidden || !renderer) {
      animationFrame = null;
      return;
    }
    controls.autoRotate = autoRotate && !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    controls.autoRotateSpeed = 0.75;
    controls.update();
    renderer.render(scene, camera);
    animationFrame = requestAnimationFrame(renderLoop);
  }

  function ensureRenderLoop() {
    if (!animationFrame) animationFrame = requestAnimationFrame(renderLoop);
  }

  function buildScene() {
    if (renderer || !panel) return;
    const viewport = panel.querySelector('[data-bcg-viewport]');
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x090d14);
    camera = new THREE.PerspectiveCamera(38, 1, 0.1, 200);
    renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    viewport.appendChild(renderer.domElement);
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.07;
    controls.minDistance = 4;
    controls.maxDistance = 80;
    comparisonRoot = new THREE.Group();
    scene.add(comparisonRoot);
    const ambient = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambient);
    resizeObserver = new ResizeObserver(resizeRenderer);
    resizeObserver.observe(viewport);
    resizeRenderer();
    resetCamera();
  }

  function metricCard(snapshot) {
    const evaluation = ignoreAdjacency ? snapshot.evaluationIgnoringAdjacency : snapshot.evaluation;
    const concerns = evaluation.concerns.length
      ? evaluation.concerns.map(item => item.replaceAll('-', ' ')).join(' · ')
      : 'none in current structural probes';
    const adjacencyNote = ignoreAdjacency ? 'reported only; not gated' : 'included in structural flags';
    return `<article class="bcg-metric-card ${evaluation.concerns.length ? 'warning' : ''}">
      <header><strong>${escapeHtml(snapshot.profileDefinition?.label || snapshot.profile)}</strong><span>${escapeHtml(snapshot.profileDefinition?.disposition || 'research')}</span></header>
      <div class="bcg-key-id">key ${escapeHtml(snapshot.keyId)}</div>
      <dl>
        <div><dt>Axis leakage</dt><dd>${fixed(snapshot.metrics.meanAbsoluteInterAxisCorrelation)}</dd></div>
        <div><dt>Regional predictability</dt><dd>${percent(snapshot.metrics.regionalPredictabilityFraction)}</dd></div>
        <div><dt>Mean displacement</dt><dd>${percent(snapshot.metrics.meanNormalizedDisplacement)}</dd></div>
        <div><dt>Surface roughness</dt><dd>${percent(snapshot.metrics.pointSurfaceRoughness)}</dd></div>
        <div><dt>Fixed-point excess</dt><dd>${fixed(snapshot.metrics.fixedPointVsRandomRatio, 2)}× random</dd></div>
        <div><dt>Adjacency</dt><dd>${fixed(snapshot.metrics.adjacentPreservationVsRandomRatio, 2)}× random</dd></div>
      </dl>
      <p><strong>Flags:</strong> ${escapeHtml(concerns)}</p>
      <p class="bcg-adjacency-note">Adjacency: ${escapeHtml(adjacencyNote)}.</p>
    </article>`;
  }

  function renderMetrics() {
    if (!panel) return;
    const node = panel.querySelector('[data-bcg-metrics]');
    if (!currentSnapshot?.profiles?.length) {
      node.innerHTML = '<p>No comparison has been generated yet.</p>';
      return;
    }
    node.innerHTML = currentSnapshot.profiles.map(metricCard).join('');
    const policy = panel.querySelector('[data-bcg-policy]');
    if (policy) policy.textContent = ignoreAdjacency
      ? 'Predictability-first evaluation: adjacency is displayed but does not create a structural flag.'
      : 'Full structural evaluation: adjacency can create a flag alongside independent predictability probes.';
  }

  async function generateComparison() {
    if (!panel) return;
    const seed = panel.querySelector('[data-bcg-seed]').value.trim() || 'binary-cube-profile-structure-demo';
    const gridSize = Number(panel.querySelector('[data-bcg-size]').value || 64);
    const sampleResolution = Math.min(40, Math.max(12, Number(panel.querySelector('[data-bcg-sample]').value || 32)));
    const profiles = [...currentProfiles()];
    try {
      const snapshot = await runWorkerComparison({ seed, gridSize, sampleResolution, profiles });
      currentSnapshot = snapshot;
      layoutComparison(snapshot);
      renderMetrics();
      setStatus(`${profiles.length} deterministic profile snapshots generated from the same seed at ${gridSize} × ${gridSize}.`, 'success');
    } catch (error) {
      if (error?.name === 'AbortError') return;
      setStatus(error.message, 'error');
    }
  }

  function reseedAndGenerate() {
    if (!SeedSource?.freshSeed) {
      setStatus('Secure shared Binary Cube reseeding is unavailable. Reload the page so binary-cube-worker-client.js can initialize.', 'error');
      return;
    }
    panel.querySelector('[data-bcg-seed]').value = SeedSource.freshSeed('binary-cube-profile');
    void generateComparison();
  }

  function createPanel() {
    if (panel) return panel;
    panel = document.createElement('section');
    panel.id = PANEL_ID;
    panel.className = 'bcg-shell';
    panel.hidden = true;
    panel.innerHTML = `
      <div class="bcg-dialog" role="dialog" aria-modal="true" aria-labelledby="bcg-title">
        <header class="bcg-header">
          <div><p class="bcg-eyebrow">Binary Cube research · shared canonical validation</p><h2 id="bcg-title">Key Generation Structure Visualizer</h2></div>
          <button type="button" class="bcg-close" data-bcg-close aria-label="Close key generation structure visualizer">×</button>
        </header>
        <p class="bcg-intro">Compare several deterministic key-generation procedures using the same seed. Each miniature 3D cube is the actual Latin-cube point field <code>z = depth[(row[x] + column[y]) mod N]</code> sampled from a canonically validated research key. Smooth sheets, bands, blocks, or coupled structures can therefore be seen rather than inferred only from one statistic.</p>
        <div class="bcg-controls">
          <label>Key seed<input type="text" data-bcg-seed value="binary-cube-profile-structure-demo"></label>
          <label>Grid size<select data-bcg-size><option value="12">12 × 12</option><option value="32">32 × 32</option><option value="64" selected>64 × 64</option><option value="96">96 × 96</option><option value="128">128 × 128</option></select></label>
          <label>Comparison set<select data-bcg-preset><option value="contrasts" selected>Structural contrasts</option><option value="all">All seven profiles</option><option value="walks">Walk families</option><option value="nested">Nested families</option><option value="viable">Baseline + current candidates</option></select></label>
          <label>3D sample resolution<select data-bcg-sample><option value="16">16 × 16</option><option value="24">24 × 24</option><option value="32" selected>32 × 32</option><option value="40">40 × 40</option></select></label>
          <label>Render<select data-bcg-render><option value="mesh" selected>Point field + neighbor mesh</option><option value="points">Point field only</option><option value="regions">Source-region colors + mesh</option></select></label>
        </div>
        <div class="bcg-actions">
          <button type="button" class="primary-action" data-bcg-run>Generate Comparison</button>
          <button type="button" class="secondary-action" data-bcg-reseed>Reseed + Generate</button>
          <button type="button" class="secondary-action" data-bcg-reset-camera>Reset Camera</button>
          <button type="button" class="secondary-action" data-bcg-auto-rotate>Auto Rotate: Off</button>
          <button type="button" class="secondary-action" data-bcg-cancel disabled>Cancel active calculation</button>
        </div>
        <label class="bcg-policy-toggle"><input type="checkbox" data-bcg-ignore-adjacency> Ignore adjacency as a rejection criterion <span>Adjacency remains visible, but only independent predictability and coupling probes can flag a profile.</span></label>
        <p class="bcg-policy" data-bcg-policy>Full structural evaluation: adjacency can create a flag alongside independent predictability probes.</p>
        <p class="bcg-status" data-bcg-status role="status" aria-live="polite">Ready to generate deterministic comparison snapshots.</p>
        <div class="bcg-viewport" data-bcg-viewport aria-label="Interactive 3D comparison of Binary Cube key-generation point fields"></div>
        <div class="bcg-legend"><span><i class="bcg-gradient"></i>Depth color runs from low to high cube depth.</span><span>Drag to orbit · wheel to zoom · right-drag to pan.</span><span>Region mode colors original X/Y neighborhoods so preserved blocks remain visually traceable.</span></div>
        <section class="bcg-analysis">
          <h3>Predictability diagnostics</h3>
          <p>Adjacency is only one clue. Axis leakage asks whether one generated axis predicts another; regional predictability measures how much knowing the source region reduces uncertainty about the destination region; fixed-point excess and displacement expose keys that stay too close to identity; surface roughness describes how abruptly the actual 3D point field changes between neighboring source cells.</p>
          <div class="bcg-metrics" data-bcg-metrics><p>No comparison has been generated yet.</p></div>
        </section>
        <div class="bcg-boundary"><strong>Research boundary:</strong> a visually chaotic cube is not proof of cryptographic security, and visible adjacency is not automatically a defect. These views are diagnostic evidence for structure and predictability. Canonical Binary Cube encryption, decryption, fingerprints, masks, and collision proofs remain owned by <code>ShadowrunBinaryCubeEngine</code>; research profiles do not replace the production generator.</div>
      </div>`;
    document.body.appendChild(panel);

    panel.querySelector('[data-bcg-close]').addEventListener('click', closePanel);
    panel.addEventListener('click', event => { if (event.target === panel) closePanel(); });
    panel.querySelector('[data-bcg-run]').addEventListener('click', () => void generateComparison());
    panel.querySelector('[data-bcg-reseed]').addEventListener('click', reseedAndGenerate);
    panel.querySelector('[data-bcg-cancel]').addEventListener('click', () => cancelWorker('cancelled by user'));
    panel.querySelector('[data-bcg-reset-camera]').addEventListener('click', resetCamera);
    panel.querySelector('[data-bcg-auto-rotate]').addEventListener('click', event => {
      autoRotate = !autoRotate;
      event.currentTarget.textContent = `Auto Rotate: ${autoRotate ? 'On' : 'Off'}`;
      ensureRenderLoop();
    });
    panel.querySelector('[data-bcg-render]').addEventListener('change', event => {
      renderMode = event.target.value;
      if (currentSnapshot) layoutComparison(currentSnapshot);
    });
    panel.querySelector('[data-bcg-ignore-adjacency]').addEventListener('change', event => {
      ignoreAdjacency = event.target.checked;
      if (currentSnapshot) layoutComparison(currentSnapshot);
      renderMetrics();
    });
    panel.querySelector('[data-bcg-preset]').addEventListener('change', () => void generateComparison());
    panel.querySelector('[data-bcg-size]').addEventListener('change', () => void generateComparison());
    return panel;
  }

  async function openPanel(options = {}) {
    createPanel();
    await ensureThree();
    buildScene();
    panel.hidden = false;
    if (options.seed) panel.querySelector('[data-bcg-seed]').value = String(options.seed);
    if (options.gridSize) panel.querySelector('[data-bcg-size]').value = String(options.gridSize);
    resizeRenderer();
    ensureRenderLoop();
    if (!currentSnapshot || options.regenerate) await generateComparison();
    panel.querySelector('[data-bcg-seed]').focus();
    return panel;
  }

  function closePanel() {
    if (!panel) return;
    cancelWorker('cancelled on close');
    panel.hidden = true;
    if (animationFrame) cancelAnimationFrame(animationFrame);
    animationFrame = null;
  }

  window.BinaryCubeKeyGenerationVisualizer = Object.freeze({
    openPanel,
    closePanel,
    regenerate: generateComparison,
    getSnapshot: () => currentSnapshot
  });
})();
