(function installShadowrunBinaryCubeVisualizer(root, factory) {
  'use strict';
  const api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.ShadowrunBinaryCubeVisualizer = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function createShadowrunBinaryCubeVisualizer(root) {
  'use strict';

  const PANEL_ID = 'shadowrun-binary-cube-visualizer';
  const MAX_STATIC_GRID_SIZE = 64;
  const DEFAULT_SEED = 'binary-cube-visualizer-static-demo';
  const Engine = root?.ShadowrunBinaryCubeEngine;
  const RendererApi = root?.BinaryCubeVisualizerRenderer;
  const FACES = Engine?.constants?.FACES || Object.freeze(['top', 'bottom', 'front', 'back', 'left', 'right']);
  let renderer = null;
  let activeKey = null;
  let activeKeyOrigin = null;
  let pickRole = 'input';
  let draftDirection = {
    inputFace: 'top',
    outputFace: 'front',
    inputQuarterTurns: 0,
    outputQuarterTurns: 0
  };

  function fail(message) {
    throw new Error(message);
  }

  function requireDependencies() {
    if (!Engine) fail('The canonical Binary Cube engine must load before the visualizer.');
    if (!RendererApi?.createRenderer) fail('The Binary Cube WebGL renderer must load before the visualizer.');
  }

  function title(value) {
    return String(value).replace(/^./, character => character.toUpperCase());
  }

  function normalizeQuarterTurns(value) {
    return ((Number(value) || 0) % 4 + 4) % 4;
  }

  function setStatus(panel, message, type = '') {
    const node = panel.querySelector('[data-cube-visualizer-status]');
    if (!node) return;
    node.textContent = message;
    node.classList.toggle('success', type === 'success');
    node.classList.toggle('error', type === 'error');
  }

  function parseKey(panel) {
    const raw = panel.querySelector('[data-cube-visualizer-key]').value.trim();
    if (!raw) fail('Key JSON is empty. Generate a scene or paste a canonical Binary Cube key.');
    try {
      return Engine.validateKey(JSON.parse(raw));
    } catch (error) {
      fail(`Key JSON could not be loaded: ${error.message}`);
    }
  }

  function legalOutputFaces(inputFace = draftDirection.inputFace) {
    return Engine.legalOutputFaces(inputFace);
  }

  function rendererDirectionState() {
    return {
      ...draftDirection,
      legalOutputFaces: legalOutputFaces(draftDirection.inputFace)
    };
  }

  function updateDirectionSummary(panel) {
    const node = panel.querySelector('[data-cube-visualizer-direction-summary]');
    if (!node) return;
    const legal = legalOutputFaces().map(title).join(', ');
    const loaded = activeKey
      ? `Loaded key ${activeKey.keyId}: ${title(activeKey.inputFace)} ${activeKey.inputQuarterTurns * 90}° → ${title(activeKey.outputFace)} ${activeKey.outputQuarterTurns * 90}°.`
      : 'No canonical key is loaded.';
    node.textContent = `Draft direction: ${title(draftDirection.inputFace)} ${draftDirection.inputQuarterTurns * 90}° inward → ${title(draftDirection.outputFace)} ${draftDirection.outputQuarterTurns * 90}° outward. Legal outputs: ${legal}. ${loaded}`;
  }

  function setPickRole(panel, role) {
    if (role !== 'input' && role !== 'output') fail('Face-picking role must be input or output.');
    pickRole = role;
    panel.querySelectorAll('[data-cube-visualizer-pick-role]').forEach(button => {
      const active = button.dataset.cubeVisualizerPickRole === role;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    panel.querySelector('[data-cube-visualizer-pick-instruction]').textContent = `Cube clicks now select the ${role} face.`;
  }

  function rebuildOutputOptions(panel, preferredFace = draftDirection.outputFace) {
    const select = panel.querySelector('[data-cube-visualizer-output-face]');
    const legal = legalOutputFaces(draftDirection.inputFace);
    const selected = legal.includes(preferredFace) ? preferredFace : legal[0];
    select.replaceChildren(...legal.map(face => {
      const option = document.createElement('option');
      option.value = face;
      option.textContent = title(face);
      option.selected = face === selected;
      return option;
    }));
    draftDirection.outputFace = selected;
  }

  function syncControlsFromKey(panel, key) {
    panel.querySelector('[data-cube-visualizer-size]').value = String(key.gridSize);
    panel.querySelector('[data-cube-visualizer-seed]').value = key.seed;
    panel.querySelector('[data-cube-visualizer-input-face]').value = key.inputFace;
    draftDirection = {
      inputFace: key.inputFace,
      outputFace: key.outputFace,
      inputQuarterTurns: key.inputQuarterTurns,
      outputQuarterTurns: key.outputQuarterTurns
    };
    rebuildOutputOptions(panel, key.outputFace);
    panel.querySelector('[data-cube-visualizer-input-turns]').value = String(key.inputQuarterTurns);
    panel.querySelector('[data-cube-visualizer-output-turns]').value = String(key.outputQuarterTurns);
  }

  function readDraftFromControls(panel) {
    const inputFace = panel.querySelector('[data-cube-visualizer-input-face]').value;
    const inputQuarterTurns = normalizeQuarterTurns(panel.querySelector('[data-cube-visualizer-input-turns]').value);
    const outputQuarterTurns = normalizeQuarterTurns(panel.querySelector('[data-cube-visualizer-output-turns]').value);
    draftDirection.inputFace = inputFace;
    rebuildOutputOptions(panel, panel.querySelector('[data-cube-visualizer-output-face]').value);
    draftDirection.outputFace = panel.querySelector('[data-cube-visualizer-output-face]').value;
    draftDirection.inputQuarterTurns = inputQuarterTurns;
    draftDirection.outputQuarterTurns = outputQuarterTurns;
    return draftDirection;
  }

  function applyDraftDirection(panel, message) {
    renderer?.setDirectionState(rendererDirectionState());
    updateDirectionSummary(panel);
    if (message) setStatus(panel, message);
  }

  function markDraftChanged(panel, reason) {
    readDraftFromControls(panel);
    applyDraftDirection(
      panel,
      `${reason} The loaded canonical key JSON remains unchanged. Generate a new canonical draft key to apply this direction.`
    );
  }

  function renderKey(panel, key, origin = 'generated') {
    const validated = Engine.validateKey(key);
    if (validated.gridSize > MAX_STATIC_GRID_SIZE) {
      fail(`The V4 detailed point renderer accepts grids through ${MAX_STATIC_GRID_SIZE} × ${MAX_STATIC_GRID_SIZE}. Full-resolution encoding remains available in the laboratory; larger rendering tiers are scheduled for V9.`);
    }
    const points = Engine.buildPoints(validated);
    renderer.setScene({ gridSize: validated.gridSize, points });
    activeKey = validated;
    activeKeyOrigin = origin;
    syncControlsFromKey(panel, validated);
    renderer.setDirectionState(rendererDirectionState());
    panel.querySelector('[data-cube-visualizer-key]').value = JSON.stringify(validated, null, 2);
    panel.querySelector('[data-cube-visualizer-summary]').textContent = `Key ${validated.keyId} · ${validated.gridSize} × ${validated.gridSize} · ${points.length.toLocaleString()} exact keyed points`;
    updateDirectionSummary(panel);
    const originText = origin === 'imported' ? 'Imported canonical key' : 'Generated canonical key';
    setStatus(panel, `${originText} ${validated.keyId} rendered with explicit input and output direction. Camera movement changes only the view.`, 'success');
  }

  function generateKey(panel) {
    readDraftFromControls(panel);
    const gridSize = Number(panel.querySelector('[data-cube-visualizer-size]').value);
    const seed = panel.querySelector('[data-cube-visualizer-seed]').value.trim() || DEFAULT_SEED;
    const key = Engine.createKey({
      gridSize,
      seed,
      ...draftDirection,
      maskDensity: 1
    });
    renderKey(panel, key, 'generated');
  }

  function handleFaceClick(panel, face) {
    if (!FACES.includes(face)) return;
    if (pickRole === 'input') {
      panel.querySelector('[data-cube-visualizer-input-face]').value = face;
      draftDirection.inputFace = face;
      rebuildOutputOptions(panel, draftDirection.outputFace);
      draftDirection.outputFace = panel.querySelector('[data-cube-visualizer-output-face]').value;
      setPickRole(panel, 'output');
      applyDraftDirection(panel, `${title(face)} selected as the draft input face. Choose one of its four legal perpendicular output faces.`);
      return;
    }
    const legal = legalOutputFaces();
    if (!legal.includes(face)) {
      setStatus(panel, `${title(face)} cannot be the output face for ${title(draftDirection.inputFace)} input. Select a perpendicular face.`, 'error');
      return;
    }
    panel.querySelector('[data-cube-visualizer-output-face]').value = face;
    draftDirection.outputFace = face;
    applyDraftDirection(panel, `${title(face)} selected as the draft output face. The loaded canonical key remains unchanged until you generate a new key.`);
  }

  function installRenderer(panel) {
    if (renderer) return;
    const canvas = panel.querySelector('[data-cube-visualizer-canvas]');
    const labelLayer = panel.querySelector('[data-cube-visualizer-label-layer]');
    const fallback = panel.querySelector('[data-cube-visualizer-fallback]');
    try {
      renderer = RendererApi.createRenderer({
        canvas,
        labelLayer,
        onFaceClick: face => handleFaceClick(panel, face)
      });
      fallback.hidden = true;
    } catch (error) {
      fallback.hidden = false;
      fallback.textContent = `${error.message} The canonical key and trace data remain available as JSON, but this browser cannot display the V4 scene.`;
      setStatus(panel, error.message, 'error');
      throw error;
    }
  }

  function bind(panel) {
    if (panel.dataset.cubeVisualizerBound === 'true') return;
    panel.dataset.cubeVisualizerBound = 'true';

    panel.querySelector('[data-cube-visualizer-close]').addEventListener('click', () => {
      panel.hidden = true;
    });
    panel.querySelector('[data-cube-visualizer-generate]').addEventListener('click', () => {
      try {
        generateKey(panel);
      } catch (error) {
        setStatus(panel, error.message, 'error');
      }
    });
    panel.querySelector('[data-cube-visualizer-load]').addEventListener('click', () => {
      try {
        renderKey(panel, parseKey(panel), 'imported');
      } catch (error) {
        setStatus(panel, error.message, 'error');
      }
    });
    panel.querySelectorAll('[data-cube-visualizer-pick-role]').forEach(button => {
      button.addEventListener('click', () => setPickRole(panel, button.dataset.cubeVisualizerPickRole));
    });
    panel.querySelector('[data-cube-visualizer-input-face]').addEventListener('change', () => markDraftChanged(panel, 'Input face draft changed.'));
    panel.querySelector('[data-cube-visualizer-output-face]').addEventListener('change', () => markDraftChanged(panel, 'Output face draft changed.'));
    panel.querySelector('[data-cube-visualizer-input-turns]').addEventListener('change', () => markDraftChanged(panel, 'Input orientation draft changed.'));
    panel.querySelector('[data-cube-visualizer-output-turns]').addEventListener('change', () => markDraftChanged(panel, 'Output orientation draft changed.'));
    panel.querySelector('[data-cube-visualizer-reset-camera]').addEventListener('click', () => renderer?.resetCamera());
    panel.querySelectorAll('[data-cube-visualizer-camera]').forEach(button => {
      button.addEventListener('click', () => {
        try {
          renderer?.setCameraPreset(button.dataset.cubeVisualizerCamera);
        } catch (error) {
          setStatus(panel, error.message, 'error');
        }
      });
    });
  }

  function faceOptions(selected) {
    return FACES.map(face => `<option value="${face}"${face === selected ? ' selected' : ''}>${title(face)}</option>`).join('');
  }

  function turnOptions(selected) {
    return [0, 1, 2, 3].map(turns => `<option value="${turns}"${turns === selected ? ' selected' : ''}>${turns * 90}°</option>`).join('');
  }

  function buildPanel() {
    requireDependencies();
    let panel = document.getElementById(PANEL_ID);
    if (panel) return panel;
    const host = document.getElementById('shadowrun') || document.querySelector('main') || document.body;
    panel = document.createElement('section');
    panel.id = PANEL_ID;
    panel.className = 'cube-visualizer-panel';
    panel.innerHTML = `
      <div class="cube-visualizer-header">
        <div>
          <p class="eyebrow">V4 directional environment · selectable faces</p>
          <h2>Binary Cube Encoder Visualizer</h2>
          <p>This stage renders a real keyed point field with selectable input and output faces, legal-pair enforcement, orientation overlays, and explicit inward/outward arrows. It does not animate bits yet.</p>
        </div>
        <button type="button" class="layout-button" data-cube-visualizer-close>Close Visualizer</button>
      </div>
      <p class="cube-visualizer-warning"><strong>Draft safety:</strong> clicking faces or changing orientation updates only the visible direction draft. An imported key is never silently mutated. Use <em>Generate Canonical Draft Key</em> to create and render a new validated key with the draft direction.</p>
      <div class="cube-visualizer-layout">
        <aside class="cube-visualizer-controls">
          <div class="cube-visualizer-field">
            <label for="cube-visualizer-seed">Key seed</label>
            <input id="cube-visualizer-seed" type="text" value="${DEFAULT_SEED}" spellcheck="false" data-cube-visualizer-seed>
          </div>
          <div class="cube-visualizer-field">
            <label for="cube-visualizer-size">Detailed grid size</label>
            <select id="cube-visualizer-size" data-cube-visualizer-size>
              <option value="4">4 × 4</option>
              <option value="12">12 × 12</option>
              <option value="20">20 × 20</option>
              <option value="28">28 × 28</option>
              <option value="36">36 × 36</option>
              <option value="44">44 × 44</option>
              <option value="52">52 × 52</option>
              <option value="60">60 × 60</option>
              <option value="64">64 × 64</option>
            </select>
          </div>
          <fieldset class="cube-visualizer-direction-controls">
            <legend>Encoding direction draft</legend>
            <div class="cube-visualizer-face-row">
              <div class="cube-visualizer-field">
                <label for="cube-visualizer-input-face">Input face</label>
                <select id="cube-visualizer-input-face" data-cube-visualizer-input-face>${faceOptions('top')}</select>
              </div>
              <div class="cube-visualizer-field">
                <label for="cube-visualizer-input-turns">Input orientation</label>
                <select id="cube-visualizer-input-turns" data-cube-visualizer-input-turns>${turnOptions(0)}</select>
              </div>
            </div>
            <div class="cube-visualizer-face-row">
              <div class="cube-visualizer-field">
                <label for="cube-visualizer-output-face">Output face</label>
                <select id="cube-visualizer-output-face" data-cube-visualizer-output-face></select>
              </div>
              <div class="cube-visualizer-field">
                <label for="cube-visualizer-output-turns">Output orientation</label>
                <select id="cube-visualizer-output-turns" data-cube-visualizer-output-turns>${turnOptions(0)}</select>
              </div>
            </div>
            <div class="cube-visualizer-pick-controls" role="group" aria-label="Cube face click mode">
              <button type="button" class="layout-button active" aria-pressed="true" data-cube-visualizer-pick-role="input">Pick Input Face</button>
              <button type="button" class="layout-button" aria-pressed="false" data-cube-visualizer-pick-role="output">Pick Output Face</button>
            </div>
            <small data-cube-visualizer-pick-instruction>Cube clicks now select the input face.</small>
            <p class="cube-visualizer-direction-summary" data-cube-visualizer-direction-summary></p>
          </fieldset>
          <div class="cube-visualizer-actions">
            <button type="button" class="link-button" data-cube-visualizer-generate>Generate Canonical Draft Key</button>
            <button type="button" class="layout-button" data-cube-visualizer-load>Load Key JSON</button>
          </div>
          <div class="cube-visualizer-field">
            <label for="cube-visualizer-key">Canonical key JSON</label>
            <textarea id="cube-visualizer-key" spellcheck="false" data-cube-visualizer-key></textarea>
          </div>
          <div>
            <strong>Camera presets</strong>
            <div class="cube-visualizer-camera-controls">
              <button type="button" class="layout-button" data-cube-visualizer-reset-camera>Perspective</button>
              <button type="button" class="layout-button" data-cube-visualizer-camera="front">Front</button>
              <button type="button" class="layout-button" data-cube-visualizer-camera="back">Back</button>
              <button type="button" class="layout-button" data-cube-visualizer-camera="left">Left</button>
              <button type="button" class="layout-button" data-cube-visualizer-camera="right">Right</button>
              <button type="button" class="layout-button" data-cube-visualizer-camera="top">Top</button>
              <button type="button" class="layout-button" data-cube-visualizer-camera="bottom">Bottom</button>
            </div>
          </div>
          <div class="cube-visualizer-status" role="status" aria-live="polite" data-cube-visualizer-status>Preparing the canonical demonstration key.</div>
        </aside>
        <div class="cube-visualizer-scene-shell">
          <canvas class="cube-visualizer-canvas" aria-label="Manipulatable three-dimensional Binary Cube point field with selectable faces" data-cube-visualizer-canvas></canvas>
          <div class="cube-visualizer-label-layer" aria-hidden="true" data-cube-visualizer-label-layer></div>
          <div class="cube-visualizer-fallback" hidden data-cube-visualizer-fallback></div>
          <div class="cube-visualizer-scene-overlay">
            <div class="cube-visualizer-summary" data-cube-visualizer-summary>No key loaded.</div>
            <div class="cube-visualizer-help">Click a face to select · Drag to orbit · Shift-drag or right-drag to pan · Wheel to zoom</div>
          </div>
        </div>
      </div>
    `;
    host.appendChild(panel);
    rebuildOutputOptions(panel, 'front');
    bind(panel);
    installRenderer(panel);
    setPickRole(panel, 'input');
    generateKey(panel);
    return panel;
  }

  function openPanel() {
    const panel = buildPanel();
    panel.hidden = false;
    panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    renderer?.render();
    return panel;
  }

  function currentState() {
    const direction = renderer?.getDirectionState?.() || rendererDirectionState();
    return Object.freeze({
      panelOpen: Boolean(document.getElementById(PANEL_ID) && !document.getElementById(PANEL_ID).hidden),
      keyId: activeKey?.keyId || null,
      keyOrigin: activeKeyOrigin,
      gridSize: activeKey?.gridSize || null,
      activeInputFace: activeKey?.inputFace || null,
      activeOutputFace: activeKey?.outputFace || null,
      activeInputQuarterTurns: activeKey?.inputQuarterTurns ?? null,
      activeOutputQuarterTurns: activeKey?.outputQuarterTurns ?? null,
      draftInputFace: direction.inputFace,
      draftOutputFace: direction.outputFace,
      draftInputQuarterTurns: direction.inputQuarterTurns,
      draftOutputQuarterTurns: direction.outputQuarterTurns,
      legalOutputFaces: Object.freeze([...direction.legalOutputFaces]),
      pickRole,
      rendererVersion: RendererApi?.constants?.RENDERER_VERSION || null
    });
  }

  return Object.freeze({ openPanel, currentState, constants: Object.freeze({ PANEL_ID, MAX_STATIC_GRID_SIZE }) });
});
