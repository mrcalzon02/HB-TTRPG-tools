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
  let renderer = null;
  let activeKey = null;

  function fail(message) {
    throw new Error(message);
  }

  function requireDependencies() {
    if (!Engine) fail('The canonical Binary Cube engine must load before the visualizer.');
    if (!RendererApi?.createRenderer) fail('The Binary Cube WebGL renderer must load before the visualizer.');
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

  function renderKey(panel, key) {
    const validated = Engine.validateKey(key);
    if (validated.gridSize > MAX_STATIC_GRID_SIZE) {
      fail(`The V3 detailed point renderer accepts grids through ${MAX_STATIC_GRID_SIZE} × ${MAX_STATIC_GRID_SIZE}. Full-resolution encoding remains available in the laboratory; larger rendering tiers are scheduled for V9.`);
    }
    const points = Engine.buildPoints(validated);
    renderer.setScene({ gridSize: validated.gridSize, points });
    activeKey = validated;
    panel.querySelector('[data-cube-visualizer-key]').value = JSON.stringify(validated, null, 2);
    panel.querySelector('[data-cube-visualizer-summary]').textContent = `Key ${validated.keyId} · ${validated.gridSize} × ${validated.gridSize} · ${points.length.toLocaleString()} exact keyed points`;
    setStatus(panel, `Rendered the complete keyed point field for ${validated.keyId}. Camera movement changes only the view.`, 'success');
  }

  function generateKey(panel) {
    const gridSize = Number(panel.querySelector('[data-cube-visualizer-size]').value);
    const seed = panel.querySelector('[data-cube-visualizer-seed]').value.trim() || DEFAULT_SEED;
    const key = Engine.createKey({
      gridSize,
      seed,
      inputFace: 'top',
      outputFace: 'front',
      inputQuarterTurns: 0,
      outputQuarterTurns: 0,
      maskDensity: 1
    });
    renderKey(panel, key);
  }

  function installRenderer(panel) {
    if (renderer) return;
    const canvas = panel.querySelector('[data-cube-visualizer-canvas]');
    const labelLayer = panel.querySelector('[data-cube-visualizer-label-layer]');
    const fallback = panel.querySelector('[data-cube-visualizer-fallback]');
    try {
      renderer = RendererApi.createRenderer({ canvas, labelLayer });
      fallback.hidden = true;
    } catch (error) {
      fallback.hidden = false;
      fallback.textContent = `${error.message} The canonical key and trace data remain available as JSON, but this browser cannot display the V3 scene.`;
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
        renderKey(panel, parseKey(panel));
      } catch (error) {
        setStatus(panel, error.message, 'error');
      }
    });
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
          <p class="eyebrow">V3 static environment · canonical point field</p>
          <h2>Binary Cube Encoder Visualizer</h2>
          <p>This stage renders a real keyed three-dimensional point field. It does not animate bits yet and it never calculates encryption inside the renderer.</p>
        </div>
        <button type="button" class="layout-button" data-cube-visualizer-close>Close Visualizer</button>
      </div>
      <p class="cube-visualizer-warning"><strong>Truthful geometry:</strong> the points are the exact <code>(x, y, z)</code> identities returned by the canonical engine. Orbit, pan, zoom, and camera presets alter only the view—not the key, face orientation, package, or transformation trace.</p>
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
          <div class="cube-visualizer-actions">
            <button type="button" class="link-button" data-cube-visualizer-generate>Generate Real Scene</button>
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
          <canvas class="cube-visualizer-canvas" aria-label="Manipulatable three-dimensional Binary Cube point field" data-cube-visualizer-canvas></canvas>
          <div class="cube-visualizer-label-layer" aria-hidden="true" data-cube-visualizer-label-layer></div>
          <div class="cube-visualizer-fallback" hidden data-cube-visualizer-fallback></div>
          <div class="cube-visualizer-scene-overlay">
            <div class="cube-visualizer-summary" data-cube-visualizer-summary>No key loaded.</div>
            <div class="cube-visualizer-help">Drag to orbit · Shift-drag or right-drag to pan · Wheel to zoom</div>
          </div>
        </div>
      </div>
    `;
    host.appendChild(panel);
    bind(panel);
    installRenderer(panel);
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
    return Object.freeze({
      panelOpen: Boolean(document.getElementById(PANEL_ID) && !document.getElementById(PANEL_ID).hidden),
      keyId: activeKey?.keyId || null,
      gridSize: activeKey?.gridSize || null,
      rendererVersion: RendererApi?.constants?.RENDERER_VERSION || null
    });
  }

  return Object.freeze({ openPanel, currentState, constants: Object.freeze({ PANEL_ID, MAX_STATIC_GRID_SIZE }) });
});
