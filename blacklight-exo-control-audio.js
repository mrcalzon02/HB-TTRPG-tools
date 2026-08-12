(() => {
  'use strict';

  if (window.EXO_CONTROL_AUDIO) return;

  const MASTER_VOLUME = 0.72;
  const CONTROL_EFFECT_GAIN = 1.5;
  const MAX_ACTIVE = 48;
  const STATION_CHARACTER = Object.freeze({
    helm: Object.freeze({ gain: 0.96, rate: 1.03 }),
    navigation: Object.freeze({ gain: 0.88, rate: 1.07 }),
    gunnery: Object.freeze({ gain: 1.08, rate: 0.95 }),
    engineering: Object.freeze({ gain: 1.14, rate: 0.90 }),
    science: Object.freeze({ gain: 0.84, rate: 1.09 }),
    comms: Object.freeze({ gain: 0.90, rate: 1.06 })
  });
  // Engineering is the perceived-level reference. Ambient compensation is
  // deliberately isolated from mechanical control SFX so the other stations
  // can reach the same audible soundscape range without making their switches,
  // keys and levers disproportionately loud.
  const AMBIENT_STATION_GAIN = Object.freeze({
    helm: 1.25,
    navigation: 2.35,
    gunnery: 1.55,
    engineering: 1.00,
    science: 2.35,
    comms: 2.20
  });
  const STATION_NAMES = Object.freeze(Object.keys(STATION_CHARACTER));
  const PRELOAD_ASSETS = Object.freeze(['click', 'snap', 'snick', 'krunk', 'clickKlunk', 'slowCoinClicking', 'engineLoop', 'deng']);
  const EXTERNAL_CC0_SOURCES = Object.freeze({
    rocketEngine: Object.freeze({
      author: 'theMinesAreShakin',
      license: 'CC0',
      page: 'https://opengameart.org/content/rocket-engine',
      asset: 'https://opengameart.org/sites/default/files/rocket_engine.001.wav'
    }),
    electronicDevice: Object.freeze({
      author: 'qubodup',
      license: 'CC0',
      page: 'https://opengameart.org/content/electronic-device-loop',
      asset: 'https://opengameart.org/sites/default/files/qubodup-edev.flac'
    }),
    generatorLoop: Object.freeze({
      author: 'bart',
      license: 'CC0',
      page: 'https://opengameart.org/content/steam-boiler-sound-loop',
      asset: 'https://opengameart.org/sites/default/files/generator_loop.wav'
    }),
    waterFlow: Object.freeze({
      author: 'TyberiusGames',
      license: 'CC0',
      page: 'https://opengameart.org/content/waterflow-sound',
      asset: 'https://opengameart.org/sites/default/files/waterflow.mp3'
    })
  });
  const assets = Object.freeze({
    click: 'assets/Klick.mp3',
    snap: 'assets/Snap.mp3',
    snick: 'assets/Snick.mp3',
    sneck: 'assets/sneck.mp3',
    krunk: 'assets/Krunk.mp3',
    curlunk: 'assets/Curlunk.mp3',
    clickKlunk: 'assets/klikklunk.mp3',
    cargoThukl: 'assets/Cargothukl.mp3',
    coinClick: 'assets/Coinkilck.mp3',
    coinlerClick: 'assets/Coinlerkilck.mp3',
    slowCoinClicking: 'assets/SlowCoinliclking.mp3',
    engineLoop: 'assets/Loopable%20Angine.mp3',
    cakThumpLoop: 'assets/LoppableCakThump.mp3',
    rhythmicCrumping: 'assets/RythmicCrumping.mp3',
    thrumThump: 'assets/Thrumthump.mp3',
    urnk: 'assets/Urnk.mp3',
    deng: 'assets/deng.mp3',
    groanCliark: 'assets/GroanCliark.mp3',
    graonkerliker: 'assets/Graonkerliker.mp3',
    cc0RocketEngine: EXTERNAL_CC0_SOURCES.rocketEngine.asset,
    cc0ElectronicDevice: EXTERNAL_CC0_SOURCES.electronicDevice.asset,
    cc0GeneratorLoop: EXTERNAL_CC0_SOURCES.generatorLoop.asset,
    cc0WaterFlow: EXTERNAL_CC0_SOURCES.waterFlow.asset
  });

  const scenes = Object.freeze({
    'button-light': Object.freeze([
      { asset: 'click', gain: 0.16, rate: 1.12, stopMs: 190 }
    ]),
    'button-heavy': Object.freeze([
      { asset: 'click', gain: 0.10, rate: 0.96, stopMs: 220 },
      { asset: 'snap', gain: 0.11, rate: 1.02, delay: 18, stopMs: 260 }
    ]),
    'selector-set': Object.freeze([
      { asset: 'click', gain: 0.12, rate: 1.08, stopMs: 190 },
      { asset: 'snick', gain: 0.10, rate: 1.02, delay: 30, stopMs: 230 }
    ]),
    'rotary-detent': Object.freeze([
      { asset: 'slowCoinClicking', gain: 0.085, rate: 1.18, loop: true, stopMs: 155 },
      { asset: 'click', gain: 0.055, rate: 1.08, delay: 100, stopMs: 190 }
    ]),
    'wheel-stop': Object.freeze([
      { asset: 'slowCoinClicking', gain: 0.082, rate: 1.03, loop: true, stopMs: 245 },
      { asset: 'coinClick', gain: 0.065, rate: 1.02, delay: 155, stopMs: 220 }
    ]),
    'thumbwheel-notch': Object.freeze([
      { asset: 'coinClick', gain: 0.115, rate: 1.12, stopMs: 210 },
      { asset: 'coinlerClick', gain: 0.075, rate: 1.04, delay: 24, stopMs: 225 }
    ]),
    'toggle-flick': Object.freeze([
      { asset: 'snick', gain: 0.145, rate: 1.03, stopMs: 230 },
      { asset: 'click', gain: 0.055, rate: 0.98, delay: 22, stopMs: 185 }
    ]),
    'lever-throw': Object.freeze([
      { asset: 'snap', gain: 0.145, rate: 0.92, stopMs: 300 },
      { asset: 'krunk', gain: 0.105, rate: 1.03, delay: 52, stopMs: 360 }
    ]),
    'knife-throw': Object.freeze([
      { asset: 'graonkerliker', gain: 0.042, rate: 1.30, loop: true, stopMs: 145 },
      { asset: 'snap', gain: 0.145, rate: 0.83, delay: 28, stopMs: 310 },
      { asset: 'curlunk', gain: 0.105, rate: 0.98, delay: 78, stopMs: 390 }
    ]),
    'guard-cover': Object.freeze([
      { asset: 'groanCliark', gain: 0.032, rate: 1.42, loop: true, stopMs: 145 },
      { asset: 'snap', gain: 0.105, rate: 0.88, delay: 60, stopMs: 280 },
      { asset: 'cargoThukl', gain: 0.052, rate: 1.13, delay: 92, stopMs: 290 }
    ]),
    'breaker-throw': Object.freeze([
      { asset: 'snap', gain: 0.15, rate: 0.84, stopMs: 320 },
      { asset: 'krunk', gain: 0.13, rate: 0.92, delay: 38, stopMs: 390 },
      { asset: 'cakThumpLoop', gain: 0.025, rate: 1.25, delay: 55, loop: true, stopMs: 170 }
    ]),
    'connector-seat': Object.freeze([
      { asset: 'clickKlunk', gain: 0.165, rate: 1.04, stopMs: 420 }
    ]),
    'module-seat': Object.freeze([
      { asset: 'cargoThukl', gain: 0.105, rate: 0.93, stopMs: 380 },
      { asset: 'clickKlunk', gain: 0.135, rate: 0.96, delay: 58, stopMs: 430 }
    ]),
    'tool-snick': Object.freeze([
      { asset: 'snick', gain: 0.13, rate: 1.18, stopMs: 220 },
      { asset: 'sneck', gain: 0.075, rate: 1.10, delay: 28, stopMs: 240 }
    ]),
    'key-insert': Object.freeze([
      { asset: 'snick', gain: 0.075, rate: 1.10, stopMs: 230 },
      { asset: 'clickKlunk', gain: 0.125, rate: 1.08, delay: 30, stopMs: 420 }
    ]),
    'key-turn': Object.freeze([
      { asset: 'slowCoinClicking', gain: 0.052, rate: 0.96, loop: true, stopMs: 125 },
      { asset: 'click', gain: 0.095, rate: 0.90, delay: 72, stopMs: 220 }
    ]),
    'servo-set': Object.freeze([
      { asset: 'engineLoop', gain: 0.023, rate: 1.38, loop: true, stopMs: 175 },
      { asset: 'click', gain: 0.052, rate: 1.05, delay: 118, stopMs: 190 }
    ]),
    'yoke-return': Object.freeze([
      { asset: 'urnk', gain: 0.065, rate: 1.22, stopMs: 185 },
      { asset: 'snick', gain: 0.052, rate: 1.05, delay: 105, stopMs: 225 }
    ]),
    'meter-test': Object.freeze([
      { asset: 'click', gain: 0.075, rate: 1.18, stopMs: 190 },
      { asset: 'deng', gain: 0.048, rate: 1.16, delay: 108, stopMs: 420 }
    ]),
    'panel-latch': Object.freeze([
      { asset: 'snick', gain: 0.078, rate: 1.06, stopMs: 225 }
    ]),
    'power-contact': Object.freeze([
      { asset: 'snap', gain: 0.11, rate: 0.84, stopMs: 310 },
      { asset: 'thrumThump', gain: 0.085, rate: 1.02, delay: 54, stopMs: 470 }
    ]),
    'functional-test': Object.freeze([
      { asset: 'engineLoop', gain: 0.024, rate: 1.06, loop: true, stopMs: 610 },
      { asset: 'rhythmicCrumping', gain: 0.018, rate: 1.15, delay: 80, loop: true, stopMs: 390 },
      { asset: 'deng', gain: 0.055, rate: 1.00, delay: 455, stopMs: 430 }
    ]),
    'execute-heavy': Object.freeze([
      { asset: 'snap', gain: 0.10, rate: 0.78, stopMs: 315 },
      { asset: 'thrumThump', gain: 0.17, rate: 0.86, delay: 38, stopMs: 540 },
      { asset: 'deng', gain: 0.048, rate: 1.00, delay: 175, stopMs: 420 }
    ]),
    'electrical-confirm': Object.freeze([
      { asset: 'deng', gain: 0.058, rate: 1.08, stopMs: 420 }
    ]),
    'detent-roll-loop': Object.freeze([
      { asset: 'slowCoinClicking', gain: 0.043, rate: 1.10, loop: true }
    ]),
    'servo-loop': Object.freeze([
      { asset: 'engineLoop', gain: 0.017, rate: 1.42, loop: true }
    ]),
    'ambient-drive-rumble': Object.freeze([
      { asset: 'cc0RocketEngine', gain: 0.038, rate: 0.82, loop: true },
      { asset: 'engineLoop', gain: 0.010, rate: 0.72, loop: true }
    ]),
    'ambient-machinery': Object.freeze([
      { asset: 'cc0GeneratorLoop', gain: 0.025, rate: 0.88, loop: true },
      { asset: 'rhythmicCrumping', gain: 0.009, rate: 0.82, loop: true }
    ]),
    'ambient-capacitor-bank': Object.freeze([
      { asset: 'cc0ElectronicDevice', gain: 0.018, rate: 1.08, loop: true },
      { asset: 'engineLoop', gain: 0.006, rate: 1.46, loop: true }
    ]),
    'ambient-plasma-rectifier': Object.freeze([
      { asset: 'cc0ElectronicDevice', gain: 0.020, rate: 0.96, loop: true },
      { asset: 'engineLoop', gain: 0.008, rate: 1.24, loop: true },
      { asset: 'rhythmicCrumping', gain: 0.004, rate: 0.94, loop: true }
    ]),
    'ambient-fluid-loop': Object.freeze([
      { asset: 'cc0WaterFlow', gain: 0.022, rate: 0.82, loop: true },
      { asset: 'cakThumpLoop', gain: 0.008, rate: 0.86, loop: true }
    ]),
    'ambient-electronics': Object.freeze([
      { asset: 'cc0ElectronicDevice', gain: 0.009, rate: 1.14, loop: true },
      { asset: 'engineLoop', gain: 0.004, rate: 1.34, loop: true }
    ]),
    'ambient-rf-carrier': Object.freeze([
      { asset: 'cc0ElectronicDevice', gain: 0.011, rate: 1.34, loop: true },
      { asset: 'engineLoop', gain: 0.004, rate: 1.72, loop: true }
    ])
  });

  const active = new Set();
  const activeBaseVolumes = new WeakMap();
  const loops = new Map();
  const preloaders = new Map();
  const ambientHardware = Object.create(null);
  const ambientMix = new Map();
  let masterVolume = MASTER_VOLUME;
  let ambientUnlocked = false;
  let ambientSyncQueued = false;
  let ambientObserver = null;
  let activeAmbientStation = null;

  function clamp(value, minimum, maximum) {
    return Math.min(maximum, Math.max(minimum, value));
  }

  function hash(value) {
    let result = 2166136261;
    for (const character of String(value || '')) {
      result ^= character.charCodeAt(0);
      result = Math.imul(result, 16777619);
    }
    return result >>> 0;
  }

  function variation(seed, index) {
    const value = hash(`${seed}:${index}`) % 1001;
    return (value / 1000 - 0.5) * 0.045;
  }

  function stationFromOptions(options = {}) {
    const source = String(options.station || options.seed || options.key || '');
    const match = source.match(/(?:^|:)(helm|navigation|gunnery|engineering|science|comms)(?=:|$)/i);
    return match ? match[1].toLowerCase() : null;
  }

  function characterFor(options = {}) {
    return STATION_CHARACTER[stationFromOptions(options)] || { gain: 1, rate: 1 };
  }

  function prime() {
    PRELOAD_ASSETS.forEach(name => {
      if (preloaders.has(name) || !assets[name]) return;
      try {
        const audio = new Audio(assets[name]);
        audio.preload = 'auto';
        audio.volume = 0;
        audio.load();
        preloaders.set(name, audio);
      } catch (_) {
        // Asset priming is optional; interaction playback remains the fallback.
      }
    });
  }

  function retire(audio) {
    active.delete(audio);
    try {
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
    } catch (_) {
      // Audio cleanup is best-effort only.
    }
  }

  function enforceActiveLimit() {
    while (active.size >= MAX_ACTIVE) {
      const oldest = active.values().next().value;
      if (!oldest) break;
      retire(oldest);
    }
  }

  function startLayer(layer, options, index) {
    const source = assets[layer.asset];
    if (!source) return null;
    enforceActiveLimit();
    const audio = new Audio(source);
    const rateVariation = options.vary === false ? 0 : variation(options.seed || options.key || options.scene || '', index);
    const station = stationFromOptions(options);
    const character = characterFor(options);
    const ambientScene = String(options.scene || '').startsWith('ambient-');
    const controlEffectGain = ambientScene ? 1 : CONTROL_EFFECT_GAIN;
    const ambientGain = ambientScene ? (AMBIENT_STATION_GAIN[station] ?? 1) : 1;
    const baseVolume = clamp((layer.gain ?? 0.1) * (options.intensity ?? 1) * character.gain * controlEffectGain * ambientGain, 0, 1);
    audio.preload = 'auto';
    activeBaseVolumes.set(audio, baseVolume);
    audio.volume = clamp(baseVolume * masterVolume, 0, 1);
    audio.playbackRate = clamp(((layer.rate ?? 1) + rateVariation) * character.rate, 0.5, 2);
    audio.loop = Boolean(layer.loop);
    active.add(audio);
    audio.addEventListener('ended', () => retire(audio), { once: true });
    audio.addEventListener('error', () => retire(audio), { once: true });
    try {
      const request = audio.play();
      if (request?.catch) request.catch(() => retire(audio));
    } catch (_) {
      retire(audio);
      return null;
    }
    if (Number.isFinite(layer.stopMs) && layer.stopMs > 0) {
      window.setTimeout(() => retire(audio), layer.stopMs);
    }
    return audio;
  }

  function play(scene, options = {}) {
    const layers = scenes[scene];
    if (!layers) return [];
    const handles = [];
    layers.forEach((layer, index) => {
      const launch = () => {
        const handle = startLayer(layer, { ...options, scene }, index);
        if (handle) handles.push(handle);
      };
      if (layer.delay) window.setTimeout(launch, layer.delay);
      else launch();
    });
    return handles;
  }

  function startLoop(scene, key, options = {}) {
    if (!key) return [];
    stopLoop(key);
    const layers = scenes[scene];
    if (!layers) return [];
    const handles = [];
    layers.forEach((layer, index) => {
      const loopLayer = { ...layer, loop: true, stopMs: undefined, delay: undefined };
      const handle = startLayer(loopLayer, { ...options, scene, key }, index);
      if (handle) handles.push(handle);
    });
    if (handles.length) loops.set(key, handles);
    return handles;
  }

  function stopLoop(key) {
    const handles = loops.get(key);
    if (!handles) return;
    handles.forEach(retire);
    loops.delete(key);
  }

  function stopAll() {
    loops.forEach(handles => handles.forEach(retire));
    loops.clear();
    ambientMix.clear();
    activeAmbientStation = null;
    [...active].forEach(retire);
  }

  function setMasterVolume(value) {
    masterVolume = clamp(Number(value) || 0, 0, 1);
    active.forEach(audio => {
      const baseVolume = activeBaseVolumes.get(audio);
      if (Number.isFinite(baseVolume)) audio.volume = clamp(baseVolume * masterVolume, 0, 1);
    });
  }

  function directControlValue(block) {
    if (!block) return '';
    const node = Array.from(block.children).find(child => child.tagName === 'STRONG');
    return String(node?.textContent || '').trim().toUpperCase();
  }

  function visibleStationHardware() {
    const root = document.querySelector('#station-panel .exo-physical-controls');
    if (!root) return null;
    const station = STATION_NAMES.find(name => root.classList.contains(`station-${name}`));
    if (!station) return null;
    const values = Object.create(null);
    root.querySelectorAll('.exo-device-block[data-control-code]').forEach(block => {
      const code = block.dataset.controlCode;
      if (code) values[code] = directControlValue(block);
    });
    return { station, values };
  }

  function ambientDescriptors(station, values) {
    const result = [];
    const value = code => String(values?.[code] || '').toUpperCase();
    const numericValue = code => {
      const match = value(code).match(/-?\d+(?:\.\d+)?/);
      return match ? Number(match[0]) : NaN;
    };
    if (station === 'helm') {
      const throttle = value('HEL-THT-05');
      const gate = value('HEL-TGT-06');
      // A flight-control station never becomes acoustically dead. The quiet
      // machinery bed represents pumps, control electronics and drive support;
      // actual thrust states add the much stronger drive layer on top.
      result.push({ id: 'flight-bed', scene: 'ambient-machinery', intensity: 0.28 });
      if (gate === 'FORWARD' || gate === 'AFT') result.push({ id: 'drive', scene: 'ambient-drive-rumble', intensity: 0.95 });
      else if (throttle === 'HIGH') result.push({ id: 'drive', scene: 'ambient-drive-rumble', intensity: 0.68 });
      else if (throttle === 'NOMINAL') result.push({ id: 'drive', scene: 'ambient-drive-rumble', intensity: 0.32 });
    } else if (station === 'navigation') {
      const solver = value('NAV-SOL-02');
      const latch = value('NAV-SHL-07');
      const intensity = latch === 'RELAY' ? 1.00 : latch === 'STAGED' ? 0.90 : solver && solver !== 'STANDBY' ? 0.82 : 0.72;
      result.push({ id: 'computer', scene: 'ambient-electronics', intensity });
    } else if (station === 'gunnery') {
      const capacitor = value('GUN-CAP-05');
      const arm = value('GUN-ARM-06');
      const intensity = clamp(
        (capacitor === 'MAX' ? 0.90 : capacitor === 'READY' ? 0.52 : 0.28) + (arm === 'ARMED' ? 0.10 : 0),
        0,
        1
      );
      result.push({ id: 'capacitors', scene: 'ambient-capacitor-bank', intensity });
    } else if (station === 'engineering') {
      const rectifierFeeds = [numericValue('ENG-RFA-01'), numericValue('ENG-RFB-02'), numericValue('ENG-RFC-03'), numericValue('ENG-RFD-04')].filter(Number.isFinite);
      const busTransfer = value('ENG-BBT-05');
      const busA = value('ENG-VBA-06');
      const busB = value('ENG-VBB-07');
      const rectifierBreaker = value('ENG-B02-09');
      const coolantBreaker = value('ENG-B03-10');
      const coolant = value('ENG-CHV-16');
      const pump = value('ENG-CPS-17');
      const downstreamLoaded = rectifierBreaker === 'ON' && busTransfer !== 'ISOLATED';
      if (busTransfer && busTransfer !== 'ISOLATED') {
        const imbalance = (busA && busB && busA !== busB) ? 0.18 : 0;
        result.push({ id: 'plant', scene: 'ambient-machinery', intensity: clamp((busTransfer === 'AUXILIARY' ? 0.58 : 0.40) + imbalance, 0, 1) });
      }
      if (rectifierFeeds.length) {
        const averageFeed = rectifierFeeds.reduce((sum, feed) => sum + feed, 0) / rectifierFeeds.length;
        const feedLevel = clamp((averageFeed - 400) / 80, 0, 1);
        const spread = rectifierFeeds.length > 1 ? (Math.max(...rectifierFeeds) - Math.min(...rectifierFeeds)) / 80 : 0;
        const humIntensity = clamp(0.18 + feedLevel * 0.70 + (downstreamLoaded ? 0.12 : 0), 0, 1);
        result.push({ id: 'rectifier', scene: 'ambient-plasma-rectifier', intensity: humIntensity });
        const stressIntensity = clamp(Math.max(0, feedLevel - 0.48) * 1.52 + spread * 0.24 + (downstreamLoaded && feedLevel > 0.72 ? 0.08 : 0), 0, 0.92);
        if (stressIntensity > 0.025) result.push({ id: 'rectifier-stress', scene: 'ambient-machinery', intensity: stressIntensity });
      }
      if (coolantBreaker === 'ON' && coolant && coolant !== 'CLOSED') {
        const intensity = clamp((coolant === 'OPEN' ? 0.72 : 0.36) + (pump === 'CROSS-TIE' ? 0.12 : 0), 0, 1);
        result.push({ id: 'coolant', scene: 'ambient-fluid-loop', intensity });
      }
    } else if (station === 'science') {
      const receiver = value('SCI-RBT-01');
      const aperture = value('SCI-APM-02');
      const inhibit = value('SCI-AEI-05');
      const emitter = value('SCI-EMT-06');
      const receiverIntensity = aperture === 'HIGH GAIN' ? 0.92 : receiver && receiver !== 'STANDBY' ? 0.74 : 0.62;
      result.push({ id: 'receiver', scene: 'ambient-electronics', intensity: receiverIntensity });
      if (emitter === 'PULSE' || inhibit === 'OPEN') result.push({ id: 'emitter', scene: 'ambient-capacitor-bank', intensity: emitter === 'PULSE' ? 0.92 : 0.38 });
    } else if (station === 'comms') {
      const crypto = value('COM-CRY-06');
      const transmit = value('COM-TXK-07');
      const power = value('COM-TXP-05');
      result.push({ id: 'receiver', scene: 'ambient-electronics', intensity: 0.65 });
      if (crypto === 'SECURE') result.push({ id: 'crypto', scene: 'ambient-capacitor-bank', intensity: 0.35 });
      if (transmit === 'TRANSMIT') {
        const intensity = power === 'HIGH / NARROW' ? 1.00 : power === 'LOW / WIDE' ? 0.58 : 0.78;
        result.push({ id: 'carrier', scene: 'ambient-rf-carrier', intensity });
      }
    }
    return result;
  }

  function syncAmbientStation(station) {
    if (!ambientUnlocked || document.hidden || station !== activeAmbientStation) return;
    const desired = ambientDescriptors(station, ambientHardware[station]);
    const desiredKeys = new Set();
    desired.forEach(descriptor => {
      const key = `ambient:${station}:${descriptor.id}`;
      const signature = `${descriptor.scene}:${descriptor.intensity.toFixed(3)}`;
      desiredKeys.add(key);
      if (ambientMix.get(key) === signature) return;
      stopLoop(key);
      startLoop(descriptor.scene, key, { station, seed: key, intensity: descriptor.intensity, vary: false });
      ambientMix.set(key, signature);
    });
    [...ambientMix.keys()].forEach(key => {
      if (!key.startsWith(`ambient:${station}:`) || desiredKeys.has(key)) return;
      stopLoop(key);
      ambientMix.delete(key);
    });
  }

  function stopAmbientAll() {
    [...ambientMix.keys()].forEach(stopLoop);
    ambientMix.clear();
  }

  function activateAmbientStation(station) {
    if (activeAmbientStation === station) return;
    stopAmbientAll();
    activeAmbientStation = station;
  }

  function syncAllAmbient() {
    if (!ambientUnlocked || document.hidden) return;
    const current = visibleStationHardware();
    if (!current) return;
    activateAmbientStation(current.station);
    ambientHardware[current.station] = current.values;
    syncAmbientStation(current.station);
  }

  function rememberVisibleHardware() {
    const current = visibleStationHardware();
    if (!current) return;
    activateAmbientStation(current.station);
    ambientHardware[current.station] = current.values;
    syncAmbientStation(current.station);
  }

  function scheduleAmbientSync() {
    if (ambientSyncQueued) return;
    ambientSyncQueued = true;
    requestAnimationFrame(() => {
      ambientSyncQueued = false;
      rememberVisibleHardware();
    });
  }

  function unlockAmbient() {
    if (ambientUnlocked) return;
    ambientUnlocked = true;
    rememberVisibleHardware();
  }

  function installAmbientBindings() {
    const panel = document.getElementById('station-panel');
    if (!panel || ambientObserver) return;
    ambientObserver = new MutationObserver(scheduleAmbientSync);
    ambientObserver.observe(panel, { childList: true, subtree: true, characterData: true });
    scheduleAmbientSync();
  }

  try {
    const stored = localStorage.getItem('blacklightBackgroundAudioVolume');
    if (stored !== null && Number.isFinite(Number(stored))) masterVolume = clamp(Number(stored), 0, 1);
  } catch (_) {
    // Local storage may be unavailable in private or restricted browsing contexts.
  }

  window.EXO_CONTROL_AUDIO = Object.freeze({
    assets,
    scenes,
    externalSources: EXTERNAL_CC0_SOURCES,
    stationCharacter: STATION_CHARACTER,
    ambientStationGain: AMBIENT_STATION_GAIN,
    prime,
    play,
    startLoop,
    stopLoop,
    stopAll,
    stopAmbientAll,
    setMasterVolume,
    get masterVolume() { return masterVolume; }
  });

  prime();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', installAmbientBindings, { once: true });
  else installAmbientBindings();
  document.addEventListener('pointerdown', unlockAmbient, { once: true, capture: true });
  document.addEventListener('keydown', unlockAmbient, { once: true, capture: true });
  document.addEventListener('click', event => {
    if (!event.target.closest?.('#crew-scenario-reset')) return;
    stopAmbientAll();
    activeAmbientStation = null;
    Object.keys(ambientHardware).forEach(key => delete ambientHardware[key]);
    requestAnimationFrame(scheduleAmbientSync);
  }, true);
  document.addEventListener('blacklight-master-volume-change', event => {
    const value = Number(event.detail?.volume);
    if (Number.isFinite(value)) setMasterVolume(value);
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stopAll();
    else if (ambientUnlocked) {
      scheduleAmbientSync();
      requestAnimationFrame(syncAllAmbient);
    }
  });
  window.addEventListener('pagehide', stopAll);
})();