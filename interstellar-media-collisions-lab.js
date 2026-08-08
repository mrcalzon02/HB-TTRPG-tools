(() => {
  'use strict';

  const PANEL_ID = 'interstellar-media-collisions-lab';
  const STYLE_ID = 'interstellar-media-collisions-lab-style';
  const LAMBDA = 1.097e-52;
  const C = 299792458;
  const LAMBDA_COEFFICIENT = LAMBDA * C * C / 3;
  const FACE_ORDER = ['+Z', '+X', '-X', '+Y', '-Y'];
  const DENSITY_PRESETS = Object.freeze({
    galactic: { label: 'Galactic average · 1 H-equivalent / cm³', perM3: 1e6 },
    local: { label: 'Local interstellar neutral H · 0.127 / cm³', perM3: 1.27e5 }
  });

  let activeSetting = 'scientific-tools';
  let lastRun = null;

  const esc = value => String(value ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[character]));

  function hash32(text) {
    let hash = 2166136261 >>> 0;
    const source = String(text ?? '');
    for (let index = 0; index < source.length; index += 1) {
      hash ^= source.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  function rngFrom(text) {
    let state = hash32(text) || 0x9e3779b9;
    return () => {
      state ^= state << 13;
      state ^= state >>> 17;
      state ^= state << 5;
      return (state >>> 0) / 4294967296;
    };
  }

  function physicalSideMeters(particleCount, densityPerM3) {
    return Math.cbrt(particleCount / densityPerM3);
  }

  function formatLength(meters) {
    if (meters >= 1) return `${meters.toFixed(4)} m`;
    if (meters >= 0.01) return `${(meters * 100).toFixed(3)} cm`;
    if (meters >= 0.001) return `${(meters * 1000).toFixed(3)} mm`;
    return `${meters.toExponential(3)} m`;
  }

  function formatScientific(value, digits = 3) {
    if (!Number.isFinite(value)) return '—';
    if (value === 0) return '0';
    return value.toExponential(digits);
  }

  function ensureStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const link = document.createElement('link');
    link.id = STYLE_ID;
    link.rel = 'stylesheet';
    link.href = 'interstellar-media-collisions-lab.css?v=20260808-ism-main-menu-1';
    document.head.appendChild(link);
  }

  function buildPanel() {
    if (document.getElementById(PANEL_ID)) return document.getElementById(PANEL_ID);
    const panel = document.createElement('section');
    panel.id = PANEL_ID;
    panel.className = 'ism-lab-shell';
    panel.hidden = true;
    panel.setAttribute('aria-labelledby', 'ism-lab-title');
    panel.innerHTML = `
      <div class="ism-lab-backdrop" data-ism-close></div>
      <div class="ism-lab-panel" role="dialog" aria-modal="true" aria-labelledby="ism-lab-title">
        <header class="ism-lab-header">
          <div>
            <p class="ism-lab-eyebrow">Scientific Tools · Interstellar Media Collisions</p>
            <h2 id="ism-lab-title">Vectorized Shadow Casting Laboratory</h2>
            <p class="ism-lab-subtitle">Phase-light input through literal 1:1 interstellar-medium particles with a physically bounded Λ term and a separately keyed Shadow-scattering layer.</p>
          </div>
          <button type="button" class="ism-lab-close" data-ism-close aria-label="Close Interstellar Media Collisions Lab">×</button>
        </header>

        <div class="ism-lab-layout">
          <aside class="ism-lab-controls">
            <div class="ism-lab-setting"><span>Workspace context</span><strong id="ism-setting-label">Scientific Tools</strong></div>

            <label>Phase light beam seed
              <input id="ism-beam-seed" type="text" value="phase-light-01" autocomplete="off">
            </label>
            <label>Secondary Shadow Key
              <input id="ism-shadow-key" type="text" value="shadow-key-01" autocomplete="off">
            </label>
            <label>ISM density preset
              <select id="ism-density">
                <option value="galactic">Galactic average · 1 H-equivalent / cm³</option>
                <option value="local">Local interstellar neutral H · 0.127 / cm³</option>
              </select>
            </label>
            <label>Literal ISM particles
              <select id="ism-particles">
                <option value="256">256</option>
                <option value="1024">1,024</option>
                <option value="4096" selected>4,096</option>
                <option value="16384">16,384</option>
                <option value="65536">65,536</option>
              </select>
            </label>
            <label>Phase-ray samples
              <select id="ism-rays">
                <option value="32">32</option>
                <option value="64">64</option>
                <option value="128" selected>128</option>
                <option value="256">256</option>
                <option value="512">512</option>
              </select>
            </label>
            <label>Shadow impact reflectivity randomness <output id="ism-reflectivity-value">28%</output>
              <input id="ism-reflectivity" type="range" min="0" max="100" step="1" value="28">
            </label>
            <label>Shadow coupling events / ray <output id="ism-events-value">6</output>
              <input id="ism-events" type="range" min="0" max="24" step="1" value="6">
            </label>

            <button id="ism-run" type="button" class="ism-lab-run">Cast Phase Beam</button>
            <p class="ism-lab-note"><strong>Physics boundary:</strong> literal particle coordinates and Λ scaling are physical-model quantities. Shadow coupling and keyed reflectivity are deliberate encryption/obfuscation operators and are charted separately.</p>
          </aside>

          <main class="ism-lab-stage">
            <div class="ism-lab-metrics" id="ism-metrics"></div>
            <div class="ism-lab-canvas-wrap">
              <canvas id="ism-canvas" width="900" height="560" aria-label="Projected interstellar-medium cube and phase-light trajectories"></canvas>
              <div class="ism-lab-legend"><span>● literal H-equivalent particle</span><span>— phase ray</span><span>× keyed Shadow impact</span></div>
            </div>
            <section class="ism-output-section">
              <div class="ism-output-heading"><div><p class="ism-lab-eyebrow">Concurrent detector array</p><h3>All non-input faces</h3></div><p>Input face: −Z. +Z, ±X, and ±Y are accumulated simultaneously; backscatter to −Z and retained rays are reported separately.</p></div>
              <div id="ism-face-chart" class="ism-face-chart"></div>
              <div id="ism-secondary-output" class="ism-secondary-output"></div>
            </section>
          </main>
        </div>
      </div>`;
    document.body.appendChild(panel);

    panel.querySelectorAll('[data-ism-close]').forEach(button => button.addEventListener('click', closePanel));
    panel.querySelector('#ism-run')?.addEventListener('click', run);
    panel.querySelector('#ism-reflectivity')?.addEventListener('input', event => {
      panel.querySelector('#ism-reflectivity-value').textContent = `${event.target.value}%`;
    });
    panel.querySelector('#ism-events')?.addEventListener('input', event => {
      panel.querySelector('#ism-events-value').textContent = event.target.value;
    });
    panel.addEventListener('keydown', event => {
      if (event.key === 'Escape') closePanel();
    });
    return panel;
  }

  function vectorNormalize(vector) {
    const length = Math.hypot(vector.x, vector.y, vector.z) || 1;
    return { x: vector.x / length, y: vector.y / length, z: vector.z / length };
  }

  function nextBoundary(position, direction, side) {
    const candidates = [];
    const push = (t, face) => { if (Number.isFinite(t) && t > 1e-10) candidates.push({ t, face }); };
    if (direction.x > 0) push((side - position.x) / direction.x, '+X');
    if (direction.x < 0) push((0 - position.x) / direction.x, '-X');
    if (direction.y > 0) push((side - position.y) / direction.y, '+Y');
    if (direction.y < 0) push((0 - position.y) / direction.y, '-Y');
    if (direction.z > 0) push((side - position.z) / direction.z, '+Z');
    if (direction.z < 0) push((0 - position.z) / direction.z, '-Z');
    candidates.sort((left, right) => left.t - right.t);
    return candidates[0] || { t: 0, face: 'retained' };
  }

  function reflectDirection(direction, random, strength, phase) {
    const spread = strength * (0.12 + random() * 0.88);
    const angle = phase + random() * Math.PI * 2;
    const kick = {
      x: Math.cos(angle) * spread + (random() - 0.5) * spread,
      y: Math.sin(angle) * spread + (random() - 0.5) * spread,
      z: (random() - 0.58) * spread * 0.9
    };
    return vectorNormalize({ x: direction.x + kick.x, y: direction.y + kick.y, z: direction.z + kick.z });
  }

  function simulate(config) {
    const density = DENSITY_PRESETS[config.density].perM3;
    const side = physicalSideMeters(config.particleCount, density);
    const randomParticles = rngFrom(`${config.shadowKey}|particles|${config.density}|${config.particleCount}`);
    const particles = new Array(config.particleCount);
    for (let index = 0; index < config.particleCount; index += 1) {
      particles[index] = { x: randomParticles() * side, y: randomParticles() * side, z: randomParticles() * side };
    }

    const outputs = { '+Z': 0, '+X': 0, '-X': 0, '+Y': 0, '-Y': 0, '-Z': 0, retained: 0 };
    const rays = [];
    const beamRandom = rngFrom(`${config.beamSeed}|beam|${config.rayCount}`);
    const shadowRandom = rngFrom(`${config.shadowKey}|scatter|${config.reflectivity}|${config.events}`);
    const center = side / 2;
    const aperture = side * 0.16;
    const reflectivity = config.reflectivity / 100;

    for (let rayIndex = 0; rayIndex < config.rayCount; rayIndex += 1) {
      const phase = ((rayIndex / Math.max(1, config.rayCount)) * Math.PI * 2 + beamRandom() * 0.12) % (Math.PI * 2);
      let position = {
        x: Math.max(0, Math.min(side, center + (beamRandom() - 0.5) * aperture)),
        y: Math.max(0, Math.min(side, center + (beamRandom() - 0.5) * aperture)),
        z: 0
      };
      let direction = vectorNormalize({ x: Math.cos(phase) * 0.012, y: Math.sin(phase) * 0.012, z: 1 });
      const path = [{ ...position }];
      const impacts = [];

      for (let eventIndex = 0; eventIndex < config.events; eventIndex += 1) {
        const remaining = nextBoundary(position, direction, side);
        if (!remaining.t) break;
        const progress = 0.12 + shadowRandom() * 0.62;
        const travel = remaining.t * progress;
        position = {
          x: position.x + direction.x * travel,
          y: position.y + direction.y * travel,
          z: position.z + direction.z * travel
        };
        path.push({ ...position });

        const particleIndex = Math.floor(shadowRandom() * particles.length);
        const particle = particles[particleIndex];
        const keyedImpact = shadowRandom() < reflectivity;
        impacts.push({ position: { ...position }, particleIndex, keyedImpact, particle });
        if (keyedImpact) direction = reflectDirection(direction, shadowRandom, reflectivity, phase + eventIndex * 0.37);
      }

      const boundary = nextBoundary(position, direction, side);
      if (!boundary.t) {
        outputs.retained += 1;
      } else {
        const exit = {
          x: position.x + direction.x * boundary.t,
          y: position.y + direction.y * boundary.t,
          z: position.z + direction.z * boundary.t
        };
        path.push(exit);
        outputs[boundary.face] = (outputs[boundary.face] || 0) + 1;
      }
      rays.push({ phase, path, impacts, exitFace: boundary.face || 'retained' });
    }

    const lambdaAcceleration = LAMBDA_COEFFICIENT * side;
    const lightTransit = side / C;
    const lambdaDisplacementAcrossTransit = 0.5 * lambdaAcceleration * lightTransit * lightTransit;

    return { ...config, density, side, particles, rays, outputs, lambdaAcceleration, lightTransit, lambdaDisplacementAcrossTransit };
  }

  function projection(point, side, width, height) {
    const nx = point.x / side - 0.5;
    const ny = point.y / side - 0.5;
    const nz = point.z / side - 0.5;
    return {
      x: width * 0.5 + nx * width * 0.62 + nz * width * 0.22,
      y: height * 0.54 - ny * height * 0.66 - nz * height * 0.20
    };
  }

  function draw(result) {
    const canvas = document.getElementById('ism-canvas');
    if (!canvas) return;
    const context = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    context.clearRect(0, 0, width, height);
    context.fillStyle = '#071019';
    context.fillRect(0, 0, width, height);

    const corners = [
      {x:0,y:0,z:0},{x:result.side,y:0,z:0},{x:result.side,y:result.side,z:0},{x:0,y:result.side,z:0},
      {x:0,y:0,z:result.side},{x:result.side,y:0,z:result.side},{x:result.side,y:result.side,z:result.side},{x:0,y:result.side,z:result.side}
    ].map(point => projection(point, result.side, width, height));
    const edges = [[0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],[0,4],[1,5],[2,6],[3,7]];
    context.strokeStyle = 'rgba(126,184,215,.42)';
    context.lineWidth = 1.2;
    edges.forEach(([a,b]) => {
      context.beginPath(); context.moveTo(corners[a].x,corners[a].y); context.lineTo(corners[b].x,corners[b].y); context.stroke();
    });

    const particleStride = Math.max(1, Math.floor(result.particles.length / 7000));
    context.fillStyle = 'rgba(219,235,245,.42)';
    for (let index = 0; index < result.particles.length; index += particleStride) {
      const point = projection(result.particles[index], result.side, width, height);
      context.fillRect(point.x, point.y, 1.2, 1.2);
    }

    result.rays.forEach((ray, rayIndex) => {
      context.strokeStyle = `hsla(${185 + (rayIndex % 38)}, 78%, 68%, .34)`;
      context.lineWidth = 1;
      context.beginPath();
      ray.path.forEach((point, index) => {
        const projected = projection(point, result.side, width, height);
        if (!index) context.moveTo(projected.x, projected.y); else context.lineTo(projected.x, projected.y);
      });
      context.stroke();
      ray.impacts.filter(impact => impact.keyedImpact).forEach(impact => {
        const projected = projection(impact.position, result.side, width, height);
        context.strokeStyle = 'rgba(255,190,92,.78)';
        context.beginPath();
        context.moveTo(projected.x - 2.5, projected.y - 2.5);
        context.lineTo(projected.x + 2.5, projected.y + 2.5);
        context.moveTo(projected.x + 2.5, projected.y - 2.5);
        context.lineTo(projected.x - 2.5, projected.y + 2.5);
        context.stroke();
      });
    });
  }

  function renderMetrics(result) {
    const target = document.getElementById('ism-metrics');
    if (!target) return;
    target.innerHTML = [
      ['Literal particles', result.particleCount.toLocaleString()],
      ['Physical cube edge', formatLength(result.side)],
      ['Number density', `${formatScientific(result.density)} m⁻³`],
      ['Λ coefficient', `${formatScientific(LAMBDA_COEFFICIENT)} s⁻²`],
      ['Λ acceleration @ edge', `${formatScientific(result.lambdaAcceleration)} m/s²`],
      ['Light transit time', `${formatScientific(result.lightTransit)} s`],
      ['Λ displacement / transit', `${formatScientific(result.lambdaDisplacementAcrossTransit)} m`],
      ['Shadow reflectivity', `${result.reflectivity}%`]
    ].map(([label,value]) => `<div class="ism-metric"><span>${esc(label)}</span><strong>${esc(value)}</strong></div>`).join('');
  }

  function renderOutputs(result) {
    const chart = document.getElementById('ism-face-chart');
    const secondary = document.getElementById('ism-secondary-output');
    if (!chart || !secondary) return;
    const denominator = Math.max(1, result.rayCount);
    chart.innerHTML = FACE_ORDER.map(face => {
      const count = result.outputs[face] || 0;
      const percentage = count / denominator * 100;
      return `<div class="ism-face-row"><span class="ism-face-label">${face}</span><div class="ism-face-track"><span style="width:${percentage.toFixed(3)}%"></span></div><strong>${count} · ${percentage.toFixed(2)}%</strong></div>`;
    }).join('');
    const backscatter = result.outputs['-Z'] || 0;
    const retained = result.outputs.retained || 0;
    secondary.innerHTML = `<span>Backscatter to input −Z: <strong>${backscatter}</strong></span><span>Retained/in-cube: <strong>${retained}</strong></span><span>Total rays: <strong>${result.rayCount}</strong></span>`;
  }

  function readConfig() {
    return {
      density: document.getElementById('ism-density')?.value || 'galactic',
      particleCount: Number(document.getElementById('ism-particles')?.value || 4096),
      rayCount: Number(document.getElementById('ism-rays')?.value || 128),
      reflectivity: Number(document.getElementById('ism-reflectivity')?.value || 28),
      events: Number(document.getElementById('ism-events')?.value || 6),
      beamSeed: document.getElementById('ism-beam-seed')?.value || 'phase-light-01',
      shadowKey: document.getElementById('ism-shadow-key')?.value || 'shadow-key-01',
      setting: activeSetting
    };
  }

  function run() {
    const button = document.getElementById('ism-run');
    if (button) { button.disabled = true; button.textContent = 'Casting…'; }
    try {
      lastRun = simulate(readConfig());
      renderMetrics(lastRun);
      renderOutputs(lastRun);
      draw(lastRun);
    } finally {
      if (button) { button.disabled = false; button.textContent = 'Cast Phase Beam'; }
    }
  }

  function openPanel() {
    ensureStyle();
    const panel = buildPanel();
    activeSetting = 'scientific-tools';
    const label = panel.querySelector('#ism-setting-label');
    if (label) label.textContent = 'Scientific Tools';
    panel.hidden = false;
    document.documentElement.classList.add('ism-lab-open');
    run();
    panel.querySelector('#ism-beam-seed')?.focus();
  }

  function closePanel() {
    const panel = document.getElementById(PANEL_ID);
    if (panel) panel.hidden = true;
    document.documentElement.classList.remove('ism-lab-open');
  }

  window.InterstellarMediaCollisionsLab = Object.freeze({
    constants: Object.freeze({ LAMBDA, LAMBDA_COEFFICIENT, DENSITY_PRESETS }),
    openPanel,
    closePanel,
    simulate,
    getLastRun: () => lastRun
  });
})();