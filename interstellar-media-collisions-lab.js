(() => {
  'use strict';

  const PANEL_ID = 'interstellar-media-collisions-lab';
  const STYLE_ID = 'interstellar-media-collisions-lab-style';
  const THREE_URL = 'https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.min.js';
  const ORBIT_CONTROLS_URL = 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js';
  const LAMBDA = 1.097e-52;
  const C = 299792458;
  const LAMBDA_COEFFICIENT = LAMBDA * C * C / 3;
  const PROTON_CHARGE = 1.602176634e-19;
  const PROTON_MASS = 1.67262192369e-27;
  const EV_TO_JOULE = 1.602176634e-19;
  const PLANCK_LENGTH = 1.616255e-35;
  const FACE_ORDER = ['+Z', '+X', '-X', '+Y', '-Y'];
  const DENSITY_PRESETS = Object.freeze({
    galactic: { label: 'Galactic average · 1 H-equivalent / cm³', perM3: 1e6 },
    local: { label: 'Local interstellar neutral H · 0.127 / cm³', perM3: 1.27e5 }
  });
  const FOAM_MODELS = Object.freeze({
    off: { label: 'Off', alpha: null },
    constrained: { label: 'Constraint-scale benchmark · α = 0.72', alpha: 0.72 },
    holographic: { label: 'Holographic benchmark · α = 2/3', alpha: 2 / 3 },
    randomWalk: { label: 'Random-walk benchmark · α = 1/2', alpha: 0.5 },
    custom: { label: 'Custom α', alpha: null }
  });
  const FOAM_PROPAGATION_CAP_RADIANS = 0.35;

  let activeSetting = 'scientific-tools';
  let lastRun = null;
  let castToken = 0;
  let viewportState = null;
  const scriptPromises = new Map();

  const esc = value => String(value ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[character]));
  const clamp = (value, minimum, maximum) => Math.max(minimum, Math.min(maximum, value));

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

  function gaussian(random) {
    const u1 = Math.max(Number.MIN_VALUE, random());
    const u2 = random();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(Math.PI * 2 * u2);
  }

  function physicalSideMeters(particleCount, densityPerM3) {
    return Math.cbrt(particleCount / densityPerM3);
  }

  function formatLength(meters) {
    const absolute = Math.abs(meters);
    if (!Number.isFinite(meters)) return '—';
    if (absolute >= 1.495978707e10) return `${(meters / 1.495978707e11).toFixed(4)} AU`;
    if (absolute >= 1000) return `${(meters / 1000).toFixed(3)} km`;
    if (absolute >= 1) return `${meters.toFixed(4)} m`;
    if (absolute >= 0.01) return `${(meters * 100).toFixed(3)} cm`;
    if (absolute >= 0.001) return `${(meters * 1000).toFixed(3)} mm`;
    return `${meters.toExponential(3)} m`;
  }

  function formatScientific(value, digits = 3) {
    if (!Number.isFinite(value)) return '—';
    if (value === 0) return '0';
    return value.toExponential(digits);
  }

  function normalizedScriptUrl(value) {
    return new URL(String(value || ''), document.baseURI).href;
  }

  function loadExternalScript(src) {
    const resolved = normalizedScriptUrl(src);
    if (scriptPromises.has(resolved)) return scriptPromises.get(resolved);
    const existing = [...document.scripts].find(script => script.src === resolved);
    if (existing?.dataset.ismLoaded === 'true') return Promise.resolve();

    const promise = new Promise((resolve, reject) => {
      const script = existing || document.createElement('script');
      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        script.dataset.ismLoaded = 'true';
        resolve();
      };
      const fail = () => {
        if (settled) return;
        settled = true;
        reject(new Error(`${src} could not be loaded.`));
      };
      script.addEventListener('load', finish, { once: true });
      script.addEventListener('error', fail, { once: true });
      if (!existing) {
        script.src = src;
        script.async = false;
        script.crossOrigin = 'anonymous';
        script.dataset.ismAsset = 'true';
        document.head.appendChild(script);
      } else if (window.THREE) {
        finish();
      }
    });

    scriptPromises.set(resolved, promise);
    promise.catch(() => scriptPromises.delete(resolved));
    return promise;
  }

  async function ensureThree() {
    if (!window.THREE) await loadExternalScript(THREE_URL);
    if (!window.THREE?.OrbitControls) await loadExternalScript(ORBIT_CONTROLS_URL);
    if (!window.THREE?.OrbitControls) throw new Error('Three-dimensional ISM viewport controls could not be loaded.');
    return window.THREE;
  }

  function ensureStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const link = document.createElement('link');
    link.id = STYLE_ID;
    link.rel = 'stylesheet';
    link.href = 'interstellar-media-collisions-lab.css?v=20260809-ism-quantum-foam-1';
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
            <p class="ism-lab-subtitle">Phase-light input through literal 1:1 interstellar-medium particles with a physically bounded Λ term, a charged-proton Lorentz-response layer, an explicit quantum-foam hypothesis layer, and a separately keyed Shadow-scattering layer.</p>
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

            <div class="ism-control-group">
              <p class="ism-control-group-title">Charged-particle magnetic response</p>
              <label>Interstellar magnetic field <output id="ism-field-strength-value">0.38 nT · 3.8 μG</output>
                <input id="ism-field-strength" type="range" min="0" max="2" step="0.01" value="0.38">
              </label>
              <label>Field azimuth, cube frame <output id="ism-field-azimuth-value">125°</output>
                <input id="ism-field-azimuth" type="range" min="0" max="360" step="1" value="125">
              </label>
              <label>Field elevation, cube frame <output id="ism-field-elevation-value">37°</output>
                <input id="ism-field-elevation" type="range" min="-90" max="90" step="1" value="37">
              </label>
              <label>Proton kinetic energy
                <select id="ism-proton-energy">
                  <option value="1000">1 keV</option>
                  <option value="10000">10 keV</option>
                  <option value="100000">100 keV</option>
                  <option value="1000000" selected>1 MeV</option>
                  <option value="10000000">10 MeV</option>
                  <option value="100000000">100 MeV</option>
                </select>
              </label>
            </div>

            <div class="ism-control-group">
              <p class="ism-control-group-title">Quantum-foam hypothesis layer</p>
              <label>Foam accumulation model
                <select id="ism-foam-model">
                  <option value="off">Off</option>
                  <option value="constrained" selected>Constraint-scale benchmark · α = 0.72</option>
                  <option value="holographic">Holographic benchmark · α = 2/3</option>
                  <option value="randomWalk">Random-walk benchmark · α = 1/2</option>
                  <option value="custom">Custom α</option>
                </select>
              </label>
              <label>Quantum foam seed
                <input id="ism-foam-seed" type="text" value="foam-seed-01" autocomplete="off">
              </label>
              <label>Custom accumulation exponent α <output id="ism-foam-alpha-value">0.720</output>
                <input id="ism-foam-alpha" type="range" min="0.5" max="1" step="0.005" value="0.72">
              </label>
              <label>Exploratory foam gain <output id="ism-foam-gain-value">10^0 · physical baseline</output>
                <input id="ism-foam-gain" type="range" min="0" max="24" step="1" value="0">
              </label>
              <p class="ism-lab-note"><strong>Hypothesis boundary:</strong> spacetime foam has no established proton-force law. This laboratory maps the α-model path-length uncertainty δℓ ≈ ℓ^(1−α)ℓP^α into a zero-mean stochastic angular-jitter proxy. Gain above 10^0 is a numerical sensitivity test, not a physical prediction.</p>
            </div>

            <label>Shadow impact reflectivity randomness <output id="ism-reflectivity-value">28%</output>
              <input id="ism-reflectivity" type="range" min="0" max="100" step="1" value="28">
            </label>
            <label>Shadow coupling events / ray <output id="ism-events-value">6</output>
              <input id="ism-events" type="range" min="0" max="24" step="1" value="6">
            </label>

            <button id="ism-run" type="button" class="ism-lab-run">Cast Phase Beam</button>
            <p class="ism-lab-note"><strong>Physics boundary:</strong> the magnetic term is the Lorentz response of a proton test trajectory in a uniform ISM field. A real photon is not classically bent by that field. Λ and magnetic quantities are physical-model terms; the foam layer is an explicitly labeled phenomenological hypothesis; Shadow coupling remains a separate deterministic experimental operator. The foam density output is only the geometric sensitivity n ∝ L⁻³, not evidence that dark energy couples to baryonic density.</p>
          </aside>

          <main class="ism-lab-stage">
            <div class="ism-lab-metrics" id="ism-metrics"></div>
            <div class="ism-lab-canvas-wrap">
              <div class="ism-viewport-toolbar" aria-label="Three-dimensional viewport controls">
                <span>Drag: orbit · Wheel: zoom · Right-drag: pan</span>
                <button id="ism-reset-view" type="button">Reset view</button>
                <button id="ism-auto-orbit" type="button" aria-pressed="false">Auto orbit</button>
              </div>
              <div id="ism-viewport" class="ism-lab-viewport" role="img" aria-label="Interactive three-dimensional interstellar-medium cube, magnetic field vector, particles, quantum-foam hypothesis perturbations, and phase trajectories"></div>
              <div class="ism-lab-legend"><span>● literal H-equivalent particle</span><span>— magnetized proton-response trajectory</span><span>➜ ISM magnetic field</span><span>◆ visible foam-jitter sample</span><span>× keyed Shadow impact</span></div>
            </div>
            <section class="ism-output-section">
              <div class="ism-output-heading"><div><p class="ism-lab-eyebrow">Concurrent detector array</p><h3>All non-input faces</h3></div><p>Input face: −Z. +Z, ±X, and ±Y are accumulated simultaneously; backscatter to −Z and retained rays are reported separately. During a cast, detector counts advance in the same order as the displayed trajectories.</p></div>
              <div id="ism-face-chart" class="ism-face-chart"></div>
              <div id="ism-secondary-output" class="ism-secondary-output"></div>
            </section>
          </main>
        </div>
      </div>`;
    document.body.appendChild(panel);

    panel.querySelectorAll('[data-ism-close]').forEach(button => button.addEventListener('click', closePanel));
    panel.querySelector('#ism-run')?.addEventListener('click', () => void run());
    panel.querySelector('#ism-reset-view')?.addEventListener('click', resetCamera);
    panel.querySelector('#ism-auto-orbit')?.addEventListener('click', event => {
      if (!viewportState?.controls) return;
      const enabled = !viewportState.controls.autoRotate;
      viewportState.controls.autoRotate = enabled;
      viewportState.controls.autoRotateSpeed = 0.8;
      event.currentTarget.setAttribute('aria-pressed', enabled ? 'true' : 'false');
      event.currentTarget.textContent = enabled ? 'Stop orbit' : 'Auto orbit';
      startRenderLoop();
    });

    const bindRangeOutput = (inputId, outputId, formatter) => {
      const input = panel.querySelector(`#${inputId}`);
      const output = panel.querySelector(`#${outputId}`);
      input?.addEventListener('input', event => {
        if (output) output.textContent = formatter(Number(event.target.value));
      });
    };
    bindRangeOutput('ism-reflectivity', 'ism-reflectivity-value', value => `${value}%`);
    bindRangeOutput('ism-events', 'ism-events-value', value => String(value));
    bindRangeOutput('ism-field-strength', 'ism-field-strength-value', value => `${value.toFixed(2)} nT · ${(value * 10).toFixed(1)} μG`);
    bindRangeOutput('ism-field-azimuth', 'ism-field-azimuth-value', value => `${value.toFixed(0)}°`);
    bindRangeOutput('ism-field-elevation', 'ism-field-elevation-value', value => `${value.toFixed(0)}°`);
    bindRangeOutput('ism-foam-alpha', 'ism-foam-alpha-value', value => value.toFixed(3));
    bindRangeOutput('ism-foam-gain', 'ism-foam-gain-value', value => value === 0 ? '10^0 · physical baseline' : `10^${value} · exploratory`);

    panel.addEventListener('keydown', event => {
      if (event.key === 'Escape') closePanel();
    });
    return panel;
  }

  function vectorNormalize(vector) {
    const length = Math.hypot(vector.x, vector.y, vector.z) || 1;
    return { x: vector.x / length, y: vector.y / length, z: vector.z / length };
  }

  function vectorDot(left, right) {
    return left.x * right.x + left.y * right.y + left.z * right.z;
  }

  function vectorCross(left, right) {
    return {
      x: left.y * right.z - left.z * right.y,
      y: left.z * right.x - left.x * right.z,
      z: left.x * right.y - left.y * right.x
    };
  }

  function vectorScale(vector, scalar) {
    return { x: vector.x * scalar, y: vector.y * scalar, z: vector.z * scalar };
  }

  function vectorAdd(...vectors) {
    return vectors.reduce((result, vector) => ({
      x: result.x + vector.x,
      y: result.y + vector.y,
      z: result.z + vector.z
    }), { x: 0, y: 0, z: 0 });
  }

  function rotateAroundAxis(vector, axis, angle) {
    const cosine = Math.cos(angle);
    const sine = Math.sin(angle);
    const dot = vectorDot(axis, vector);
    const cross = vectorCross(axis, vector);
    return vectorNormalize({
      x: vector.x * cosine + cross.x * sine + axis.x * dot * (1 - cosine),
      y: vector.y * cosine + cross.y * sine + axis.y * dot * (1 - cosine),
      z: vector.z * cosine + cross.z * sine + axis.z * dot * (1 - cosine)
    });
  }

  function fieldDirection(azimuthDegrees, elevationDegrees) {
    const azimuth = azimuthDegrees * Math.PI / 180;
    const elevation = elevationDegrees * Math.PI / 180;
    const planar = Math.cos(elevation);
    return vectorNormalize({
      x: Math.cos(azimuth) * planar,
      y: Math.sin(elevation),
      z: Math.sin(azimuth) * planar
    });
  }

  function protonKinematics(energyEv) {
    const kineticJoules = Math.max(0, energyEv) * EV_TO_JOULE;
    const restEnergy = PROTON_MASS * C * C;
    const gamma = 1 + kineticJoules / restEnergy;
    const betaSquared = Math.max(0, 1 - 1 / (gamma * gamma));
    return {
      energyEv,
      kineticJoules,
      gamma,
      speed: C * Math.sqrt(betaSquared)
    };
  }

  function magneticPhysics(config) {
    const proton = protonKinematics(config.protonEnergyEv);
    const bTesla = Math.max(0, config.fieldStrengthNt) * 1e-9;
    const direction = fieldDirection(config.fieldAzimuthDeg, config.fieldElevationDeg);
    const gyroAngularFrequency = bTesla > 0 ? PROTON_CHARGE * bTesla / (proton.gamma * PROTON_MASS) : 0;
    const gyroRadius90 = bTesla > 0 && proton.speed > 0
      ? proton.gamma * PROTON_MASS * proton.speed / (PROTON_CHARGE * bTesla)
      : Infinity;
    const magneticAcceleration90 = proton.speed * gyroAngularFrequency;
    return { ...proton, bTesla, direction, gyroAngularFrequency, gyroRadius90, magneticAcceleration90 };
  }

  function foamAlpha(config) {
    if (config.foamModel === 'off') return null;
    if (config.foamModel === 'custom') return clamp(config.foamAlpha, 0.5, 1);
    return FOAM_MODELS[config.foamModel]?.alpha ?? 0.72;
  }

  function quantumFoamPhysics(config, side, density) {
    const alpha = foamAlpha(config);
    if (alpha == null) {
      return {
        enabled: false,
        model: 'off',
        alpha: null,
        gain: 1,
        baselineDistanceRms: 0,
        baselineFractionRms: 0,
        appliedDistanceRms: 0,
        sigmaAngle: 0,
        propagationSigma: 0,
        propagationCapped: false,
        transverseShiftRms: 0,
        baselineDensityFractionRms: 0,
        appliedDensityFractionRms: 0,
        baselineDensityDeltaRms: 0,
        appliedDensityDeltaRms: 0
      };
    }

    const gain = Math.pow(10, clamp(config.foamGainDecades, 0, 24));
    const baselineDistanceRms = Math.pow(side, 1 - alpha) * Math.pow(PLANCK_LENGTH, alpha);
    const baselineFractionRms = baselineDistanceRms / side;
    const appliedDistanceRms = baselineDistanceRms * gain;
    const sigmaAngle = appliedDistanceRms / side;
    const propagationSigma = Math.min(sigmaAngle, FOAM_PROPAGATION_CAP_RADIANS);
    const baselineDensityFractionRms = 3 * baselineFractionRms;
    const appliedDensityFractionRms = baselineDensityFractionRms * gain;

    return {
      enabled: true,
      model: config.foamModel,
      alpha,
      gain,
      baselineDistanceRms,
      baselineFractionRms,
      appliedDistanceRms,
      sigmaAngle,
      propagationSigma,
      propagationCapped: sigmaAngle > FOAM_PROPAGATION_CAP_RADIANS,
      transverseShiftRms: side * sigmaAngle,
      baselineDensityFractionRms,
      appliedDensityFractionRms,
      baselineDensityDeltaRms: density * baselineDensityFractionRms,
      appliedDensityDeltaRms: density * appliedDensityFractionRms
    };
  }

  function tangentBasis(direction) {
    const reference = Math.abs(direction.z) < 0.82
      ? { x: 0, y: 0, z: 1 }
      : { x: 0, y: 1, z: 0 };
    const first = vectorNormalize(vectorCross(direction, reference));
    const second = vectorNormalize(vectorCross(direction, first));
    return { first, second };
  }

  function applyFoamKick(direction, random, rmsAngle) {
    if (!(rmsAngle > 0)) return { direction, angle: 0 };
    const axisSigma = rmsAngle / Math.sqrt(2);
    const firstAngle = gaussian(random) * axisSigma;
    const secondAngle = gaussian(random) * axisSigma;
    const angle = Math.hypot(firstAngle, secondAngle);
    if (!(angle > 1e-15)) return { direction, angle };

    const { first, second } = tangentBasis(direction);
    const tangent = vectorNormalize(vectorAdd(
      vectorScale(first, firstAngle),
      vectorScale(second, secondAngle)
    ));
    const boundedAngle = Math.min(angle, FOAM_PROPAGATION_CAP_RADIANS);
    return {
      direction: vectorNormalize(vectorAdd(
        vectorScale(direction, Math.cos(boundedAngle)),
        vectorScale(tangent, Math.sin(boundedAngle))
      )),
      angle
    };
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

  function advanceMagnetic(position, direction, pathLength, physics) {
    if (!(pathLength > 0) || !(physics.speed > 0) || !(physics.gyroAngularFrequency > 0)) {
      return {
        position: {
          x: position.x + direction.x * pathLength,
          y: position.y + direction.y * pathLength,
          z: position.z + direction.z * pathLength
        },
        direction,
        samples: []
      };
    }

    const totalTime = pathLength / physics.speed;
    const totalTheta = physics.gyroAngularFrequency * totalTime;
    const steps = clamp(Math.ceil(Math.abs(totalTheta) / 0.04), 1, 12);
    const stepLength = pathLength / steps;
    const stepTime = totalTime / steps;
    let currentPosition = { ...position };
    let currentDirection = { ...direction };
    const samples = [];

    for (let index = 0; index < steps; index += 1) {
      const theta = physics.gyroAngularFrequency * stepTime;
      if (Math.abs(theta) < 1e-6) {
        currentPosition = {
          x: currentPosition.x + currentDirection.x * stepLength,
          y: currentPosition.y + currentDirection.y * stepLength,
          z: currentPosition.z + currentDirection.z * stepLength
        };
        currentDirection = rotateAroundAxis(currentDirection, physics.direction, -theta);
      } else {
        const parallelScale = vectorDot(currentDirection, physics.direction);
        const parallel = vectorScale(physics.direction, parallelScale);
        const perpendicular = vectorAdd(currentDirection, vectorScale(parallel, -1));
        const fieldCrossPerpendicular = vectorCross(physics.direction, perpendicular);
        const sinFactor = Math.sin(theta) / physics.gyroAngularFrequency;
        const curveFactor = (1 - Math.cos(theta)) / physics.gyroAngularFrequency;
        const displacement = vectorScale(vectorAdd(
          vectorScale(parallel, stepTime),
          vectorScale(perpendicular, sinFactor),
          vectorScale(fieldCrossPerpendicular, -curveFactor)
        ), physics.speed);
        currentPosition = vectorAdd(currentPosition, displacement);
        currentDirection = rotateAroundAxis(currentDirection, physics.direction, -theta);
      }
      samples.push({ ...currentPosition });
    }

    return { position: currentPosition, direction: currentDirection, samples };
  }

  function simulate(config) {
    const density = DENSITY_PRESETS[config.density].perM3;
    const side = physicalSideMeters(config.particleCount, density);
    const randomParticles = rngFrom(`ism-physical-particles|${config.density}|${config.particleCount}`);
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
    const magnetics = magneticPhysics(config);
    const foam = quantumFoamPhysics(config, side, density);
    const foamKickCount = Math.max(1, config.events + 1);
    const foamKickSigma = foam.propagationSigma / Math.sqrt(foamKickCount);

    for (let rayIndex = 0; rayIndex < config.rayCount; rayIndex += 1) {
      const phase = ((rayIndex / Math.max(1, config.rayCount)) * Math.PI * 2 + beamRandom() * 0.12) % (Math.PI * 2);
      const foamRandom = rngFrom(`${config.foamSeed}|foam|${config.foamModel}|${foam.alpha}|${config.foamGainDecades}|${rayIndex}`);
      let position = {
        x: clamp(center + (beamRandom() - 0.5) * aperture, 0, side),
        y: clamp(center + (beamRandom() - 0.5) * aperture, 0, side),
        z: 0
      };
      let direction = vectorNormalize({ x: Math.cos(phase) * 0.012, y: Math.sin(phase) * 0.012, z: 1 });
      const path = [{ ...position }];
      const impacts = [];
      const foamEvents = [];
      let foamKickSquares = 0;

      const initialFoam = applyFoamKick(direction, foamRandom, foamKickSigma);
      direction = initialFoam.direction;
      foamKickSquares += initialFoam.angle * initialFoam.angle;
      foamEvents.push({ position: { ...position }, angle: initialFoam.angle });

      for (let eventIndex = 0; eventIndex < config.events; eventIndex += 1) {
        const remaining = nextBoundary(position, direction, side);
        if (!remaining.t) break;
        const progress = 0.12 + shadowRandom() * 0.62;
        const travel = remaining.t * progress;
        const advanced = advanceMagnetic(position, direction, travel, magnetics);
        position = advanced.position;
        direction = advanced.direction;
        advanced.samples.forEach(sample => path.push(sample));
        if (!advanced.samples.length) path.push({ ...position });

        const particleIndex = Math.floor(shadowRandom() * particles.length);
        const particle = particles[particleIndex];
        const keyedImpact = shadowRandom() < reflectivity;
        impacts.push({ position: { ...position }, particleIndex, keyedImpact, particle });
        if (keyedImpact) direction = reflectDirection(direction, shadowRandom, reflectivity, phase + eventIndex * 0.37);

        const foamKick = applyFoamKick(direction, foamRandom, foamKickSigma);
        direction = foamKick.direction;
        foamKickSquares += foamKick.angle * foamKick.angle;
        foamEvents.push({ position: { ...position }, angle: foamKick.angle });
      }

      const boundary = nextBoundary(position, direction, side);
      if (!boundary.t) {
        outputs.retained += 1;
      } else {
        const advanced = advanceMagnetic(position, direction, boundary.t, magnetics);
        position = advanced.position;
        direction = advanced.direction;
        advanced.samples.forEach(sample => path.push(sample));
        if (!advanced.samples.length) path.push({ ...position });
        outputs[boundary.face] = (outputs[boundary.face] || 0) + 1;
      }
      rays.push({
        phase,
        path,
        impacts,
        foamEvents,
        foamAppliedRmsAngle: Math.sqrt(foamKickSquares),
        exitFace: boundary.face || 'retained'
      });
    }

    const lambdaAcceleration = LAMBDA_COEFFICIENT * side;
    const lightTransit = side / C;
    const lambdaDisplacementAcrossTransit = 0.5 * lambdaAcceleration * lightTransit * lightTransit;
    const magneticDeflectionAcrossCube = Number.isFinite(magnetics.gyroRadius90)
      ? side * side / (2 * magnetics.gyroRadius90)
      : 0;
    const magneticToLambdaAcceleration = lambdaAcceleration > 0
      ? magnetics.magneticAcceleration90 / lambdaAcceleration
      : Infinity;
    const magneticToFoamShift = foam.transverseShiftRms > 0
      ? magneticDeflectionAcrossCube / foam.transverseShiftRms
      : Infinity;

    return {
      ...config,
      density,
      side,
      particles,
      rays,
      outputs,
      magnetics,
      foam,
      lambdaAcceleration,
      lightTransit,
      lambdaDisplacementAcrossTransit,
      magneticDeflectionAcrossCube,
      magneticToLambdaAcceleration,
      magneticToFoamShift
    };
  }

  function toScenePoint(point, side, THREE) {
    return new THREE.Vector3(
      point.x / side - 0.5,
      point.y / side - 0.5,
      point.z / side - 0.5
    );
  }

  function disposeMaterial(material) {
    if (!material) return;
    if (Array.isArray(material)) material.forEach(disposeMaterial);
    else material.dispose?.();
  }

  function disposeObject(object) {
    object?.traverse?.(node => {
      node.geometry?.dispose?.();
      disposeMaterial(node.material);
    });
  }

  function clearGroup(group) {
    if (!group) return;
    while (group.children.length) {
      const child = group.children.pop();
      disposeObject(child);
    }
  }

  function resizeViewport() {
    if (!viewportState) return;
    const { host, renderer, camera } = viewportState;
    const width = Math.max(1, host.clientWidth);
    const height = Math.max(320, host.clientHeight);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.render(viewportState.scene, camera);
  }

  function resetCamera() {
    if (!viewportState) return;
    viewportState.camera.position.set(1.35, 0.95, 1.55);
    viewportState.controls.target.set(0, 0, 0);
    viewportState.controls.update();
    viewportState.renderer.render(viewportState.scene, viewportState.camera);
  }

  function renderLoopFrame() {
    if (!viewportState) return;
    const panel = document.getElementById(PANEL_ID);
    if (!panel || panel.hidden) {
      viewportState.renderRaf = 0;
      return;
    }
    viewportState.controls.update();
    viewportState.renderer.render(viewportState.scene, viewportState.camera);
    viewportState.renderRaf = requestAnimationFrame(renderLoopFrame);
  }

  function startRenderLoop() {
    if (!viewportState || viewportState.renderRaf) return;
    viewportState.renderRaf = requestAnimationFrame(renderLoopFrame);
  }

  function stopRenderLoop() {
    if (!viewportState?.renderRaf) return;
    cancelAnimationFrame(viewportState.renderRaf);
    viewportState.renderRaf = 0;
  }

  async function ensureViewport() {
    const THREE = await ensureThree();
    const host = document.getElementById('ism-viewport');
    if (!host) return null;
    if (viewportState?.host === host) {
      resizeViewport();
      startRenderLoop();
      return viewportState;
    }

    if (viewportState) {
      stopRenderLoop();
      viewportState.resizeObserver?.disconnect?.();
      viewportState.controls?.dispose?.();
      viewportState.renderer?.dispose?.();
    }

    host.replaceChildren();
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x071019);
    scene.fog = new THREE.FogExp2(0x071019, 0.24);
    const camera = new THREE.PerspectiveCamera(46, 1, 0.01, 20);
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputEncoding = THREE.sRGBEncoding;
    host.appendChild(renderer.domElement);

    const controls = new THREE.OrbitControls(camera, renderer.domElement);
    Object.assign(controls, {
      enableDamping: true,
      dampingFactor: 0.06,
      rotateSpeed: 0.55,
      panSpeed: 0.5,
      zoomSpeed: 0.75,
      minDistance: 0.75,
      maxDistance: 5,
      screenSpacePanning: true
    });

    const worldGroup = new THREE.Group();
    const rayGroup = new THREE.Group();
    worldGroup.add(rayGroup);
    scene.add(worldGroup);

    viewportState = {
      THREE,
      host,
      scene,
      camera,
      renderer,
      controls,
      worldGroup,
      rayGroup,
      renderRaf: 0,
      resizeObserver: null
    };
    resetCamera();

    if (window.ResizeObserver) {
      viewportState.resizeObserver = new ResizeObserver(resizeViewport);
      viewportState.resizeObserver.observe(host);
    } else {
      window.addEventListener('resize', resizeViewport);
    }
    resizeViewport();
    startRenderLoop();
    return viewportState;
  }

  function addFieldGuide(result) {
    if (!viewportState) return;
    const { THREE, worldGroup } = viewportState;
    const direction = new THREE.Vector3(
      result.magnetics.direction.x,
      result.magnetics.direction.y,
      result.magnetics.direction.z
    ).normalize();
    const origin = new THREE.Vector3(-0.38, -0.38, -0.38);
    const arrow = new THREE.ArrowHelper(direction, origin, 0.72, 0xd6a85f, 0.09, 0.045);
    arrow.userData.ismKind = 'field-guide';
    worldGroup.add(arrow);
  }

  function prepareScene(result) {
    if (!viewportState) return;
    const { THREE, worldGroup } = viewportState;
    clearGroup(worldGroup);

    const rayGroup = new THREE.Group();
    viewportState.rayGroup = rayGroup;
    worldGroup.add(rayGroup);

    const box = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1)),
      new THREE.LineBasicMaterial({ color: 0x5d8da8, transparent: true, opacity: 0.72 })
    );
    worldGroup.add(box);

    const axes = new THREE.AxesHelper(0.36);
    axes.position.set(-0.5, -0.5, -0.5);
    worldGroup.add(axes);

    const particleStride = Math.max(1, Math.floor(result.particles.length / 24000));
    const particlePositions = [];
    for (let index = 0; index < result.particles.length; index += particleStride) {
      const point = toScenePoint(result.particles[index], result.side, THREE);
      particlePositions.push(point.x, point.y, point.z);
    }
    const particleGeometry = new THREE.BufferGeometry();
    particleGeometry.setAttribute('position', new THREE.Float32BufferAttribute(particlePositions, 3));
    const particles = new THREE.Points(
      particleGeometry,
      new THREE.PointsMaterial({ color: 0xdbeaf2, size: 0.006, transparent: true, opacity: 0.52, sizeAttenuation: true })
    );
    worldGroup.add(particles);

    addFieldGuide(result);
    viewportState.renderer.render(viewportState.scene, viewportState.camera);
  }

  function addRayVisual(result, ray, rayIndex) {
    if (!viewportState) return;
    const { THREE, rayGroup } = viewportState;
    const points = ray.path.map(point => toScenePoint(point, result.side, THREE));
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const color = new THREE.Color().setHSL((0.50 + (rayIndex % 38) / 210) % 1, 0.72, 0.66);
    const line = new THREE.Line(
      geometry,
      new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.66 })
    );
    rayGroup.add(line);

    if (result.foam.enabled && result.foam.propagationSigma > 1e-8) {
      const foamPositions = [];
      ray.foamEvents.forEach(event => {
        if (!(event.angle > 1e-8)) return;
        const point = toScenePoint(event.position, result.side, THREE);
        foamPositions.push(point.x, point.y, point.z);
      });
      if (foamPositions.length) {
        const foamGeometry = new THREE.BufferGeometry();
        foamGeometry.setAttribute('position', new THREE.Float32BufferAttribute(foamPositions, 3));
        rayGroup.add(new THREE.Points(
          foamGeometry,
          new THREE.PointsMaterial({ color: 0xb98cff, size: 0.021, transparent: true, opacity: 0.88, sizeAttenuation: true })
        ));
      }
    }

    const keyed = ray.impacts.filter(impact => impact.keyedImpact);
    if (keyed.length) {
      const impactPositions = [];
      keyed.forEach(impact => {
        const point = toScenePoint(impact.position, result.side, THREE);
        impactPositions.push(point.x, point.y, point.z);
      });
      const impactGeometry = new THREE.BufferGeometry();
      impactGeometry.setAttribute('position', new THREE.Float32BufferAttribute(impactPositions, 3));
      rayGroup.add(new THREE.Points(
        impactGeometry,
        new THREE.PointsMaterial({ color: 0xffbd5c, size: 0.025, transparent: true, opacity: 0.92, sizeAttenuation: true })
      ));
    }
  }

  function renderMetrics(result) {
    const target = document.getElementById('ism-metrics');
    if (!target) return;
    const energyLabel = result.protonEnergyEv >= 1e6
      ? `${(result.protonEnergyEv / 1e6).toFixed(result.protonEnergyEv >= 1e8 ? 0 : 1)} MeV`
      : `${(result.protonEnergyEv / 1e3).toFixed(0)} keV`;
    const bMicrogauss = result.fieldStrengthNt * 10;
    const foamLabel = result.foam.enabled
      ? `${FOAM_MODELS[result.foam.model]?.label || 'Custom'}${result.foam.model === 'custom' ? ` · α = ${result.foam.alpha.toFixed(3)}` : ''}`
      : 'Off';
    const foamRatio = Number.isFinite(result.magneticToFoamShift) ? formatScientific(result.magneticToFoamShift) : '∞';
    target.innerHTML = [
      ['Literal particles', result.particleCount.toLocaleString()],
      ['Physical cube edge', formatLength(result.side)],
      ['Number density', `${formatScientific(result.density)} m⁻³`],
      ['ISM magnetic field', `${result.fieldStrengthNt.toFixed(2)} nT · ${bMicrogauss.toFixed(1)} μG`],
      ['Proton kinetic energy', energyLabel],
      ['Proton speed', `${formatScientific(result.magnetics.speed)} m/s`],
      ['90° proton gyroradius', Number.isFinite(result.magnetics.gyroRadius90) ? formatLength(result.magnetics.gyroRadius90) : '∞'],
      ['Magnetic shift / cube', formatLength(result.magneticDeflectionAcrossCube)],
      ['Magnetic acceleration', `${formatScientific(result.magnetics.magneticAcceleration90)} m/s²`],
      ['aB / aΛ @ edge', Number.isFinite(result.magneticToLambdaAcceleration) ? formatScientific(result.magneticToLambdaAcceleration) : '∞'],
      ['Λ acceleration @ edge', `${formatScientific(result.lambdaAcceleration)} m/s²`],
      ['Λ displacement / transit', `${formatScientific(result.lambdaDisplacementAcrossTransit)} m`],
      ['Quantum foam model', foamLabel],
      ['Baseline foam δℓ', formatLength(result.foam.baselineDistanceRms)],
      ['Applied foam θ RMS', `${formatScientific(result.foam.sigmaAngle)} rad`],
      ['Foam transverse shift', formatLength(result.foam.transverseShiftRms)],
      ['Magnetic / foam shift', foamRatio],
      ['Baseline |Δn| proxy', `${formatScientific(result.foam.baselineDensityDeltaRms)} m⁻³`],
      ['Applied |Δn| / n proxy', formatScientific(result.foam.appliedDensityFractionRms)],
      ['Foam gain', `10^${result.foamGainDecades}${result.foam.propagationCapped ? ' · propagation capped' : ''}`]
    ].map(([label, value]) => `<div class="ism-metric"><span>${esc(label)}</span><strong>${esc(value)}</strong></div>`).join('');
  }

  function renderOutputs(result, visibleRayCount = result.rayCount) {
    const chart = document.getElementById('ism-face-chart');
    const secondary = document.getElementById('ism-secondary-output');
    if (!chart || !secondary) return;
    const clampedVisible = clamp(visibleRayCount, 0, result.rayCount);
    const outputs = { '+Z': 0, '+X': 0, '-X': 0, '+Y': 0, '-Y': 0, '-Z': 0, retained: 0 };
    for (let index = 0; index < clampedVisible; index += 1) {
      const face = result.rays[index]?.exitFace || 'retained';
      outputs[face] = (outputs[face] || 0) + 1;
    }
    const denominator = Math.max(1, clampedVisible);
    chart.innerHTML = FACE_ORDER.map(face => {
      const count = outputs[face] || 0;
      const percentage = count / denominator * 100;
      return `<div class="ism-face-row"><span class="ism-face-label">${face}</span><div class="ism-face-track"><span style="width:${percentage.toFixed(3)}%"></span></div><strong>${count} · ${percentage.toFixed(2)}%</strong></div>`;
    }).join('');
    const backscatter = outputs['-Z'] || 0;
    const retained = outputs.retained || 0;
    secondary.innerHTML = `<span>Backscatter to input −Z: <strong>${backscatter}</strong></span><span>Retained/in-cube: <strong>${retained}</strong></span><span>Cast progress: <strong>${clampedVisible}/${result.rayCount}</strong></span><span>Physical light transit: <strong>${esc(formatScientific(result.lightTransit))} s</strong></span><span>Foam θ RMS: <strong>${esc(formatScientific(result.foam.sigmaAngle))} rad</strong></span>`;
  }

  function readConfig() {
    return {
      density: document.getElementById('ism-density')?.value || 'galactic',
      particleCount: Number(document.getElementById('ism-particles')?.value || 4096),
      rayCount: Number(document.getElementById('ism-rays')?.value || 128),
      reflectivity: Number(document.getElementById('ism-reflectivity')?.value || 28),
      events: Number(document.getElementById('ism-events')?.value || 6),
      fieldStrengthNt: Number(document.getElementById('ism-field-strength')?.value || 0.38),
      fieldAzimuthDeg: Number(document.getElementById('ism-field-azimuth')?.value || 125),
      fieldElevationDeg: Number(document.getElementById('ism-field-elevation')?.value || 37),
      protonEnergyEv: Number(document.getElementById('ism-proton-energy')?.value || 1e6),
      foamModel: document.getElementById('ism-foam-model')?.value || 'constrained',
      foamSeed: document.getElementById('ism-foam-seed')?.value || 'foam-seed-01',
      foamAlpha: Number(document.getElementById('ism-foam-alpha')?.value || 0.72),
      foamGainDecades: Number(document.getElementById('ism-foam-gain')?.value || 0),
      beamSeed: document.getElementById('ism-beam-seed')?.value || 'phase-light-01',
      shadowKey: document.getElementById('ism-shadow-key')?.value || 'shadow-key-01',
      setting: activeSetting
    };
  }

  function animateCast(result, token) {
    const button = document.getElementById('ism-run');
    const start = performance.now();
    const duration = 1250;
    let visible = 0;

    renderOutputs(result, 0);

    return new Promise(resolve => {
      const frame = now => {
        if (token !== castToken) return resolve(false);
        const elapsed = now - start;
        const targetVisible = Math.min(result.rayCount, Math.floor((elapsed / duration) * result.rayCount) + 1);
        while (visible < targetVisible) {
          addRayVisual(result, result.rays[visible], visible);
          visible += 1;
        }
        renderOutputs(result, visible);
        if (button) button.textContent = `Casting ${visible}/${result.rayCount}`;

        if (visible < result.rayCount) {
          requestAnimationFrame(frame);
          return;
        }
        resolve(true);
      };
      requestAnimationFrame(frame);
    });
  }

  async function run() {
    const button = document.getElementById('ism-run');
    const token = ++castToken;
    if (button) {
      button.disabled = true;
      button.textContent = 'Preparing 3D cast…';
    }

    try {
      await ensureViewport();
      if (token !== castToken) return;
      lastRun = simulate(readConfig());
      renderMetrics(lastRun);
      prepareScene(lastRun);
      const completed = await animateCast(lastRun, token);
      if (!completed || token !== castToken) return;
    } catch (error) {
      console.error('ISM phase-beam cast failed.', error);
      const secondary = document.getElementById('ism-secondary-output');
      if (secondary) secondary.innerHTML = `<span class="ism-error">Cast failed: ${esc(error.message)}</span>`;
    } finally {
      if (token === castToken && button) {
        button.disabled = false;
        button.textContent = 'Cast Phase Beam';
      }
    }
  }

  async function openPanel() {
    ensureStyle();
    const panel = buildPanel();
    activeSetting = 'scientific-tools';
    const label = panel.querySelector('#ism-setting-label');
    if (label) label.textContent = 'Scientific Tools';
    panel.hidden = false;
    document.documentElement.classList.add('ism-lab-open');
    try {
      await ensureViewport();
      await run();
    } catch (error) {
      console.error('ISM laboratory could not initialize its 3D viewport.', error);
    }
    panel.querySelector('#ism-beam-seed')?.focus();
    return panel;
  }

  function closePanel() {
    castToken += 1;
    const panel = document.getElementById(PANEL_ID);
    if (panel) panel.hidden = true;
    document.documentElement.classList.remove('ism-lab-open');
    stopRenderLoop();
  }

  window.InterstellarMediaCollisionsLab = Object.freeze({
    constants: Object.freeze({
      LAMBDA,
      LAMBDA_COEFFICIENT,
      DENSITY_PRESETS,
      PROTON_CHARGE,
      PROTON_MASS,
      PLANCK_LENGTH,
      FOAM_MODELS
    }),
    openPanel,
    closePanel,
    simulate,
    getLastRun: () => lastRun
  });
})();
