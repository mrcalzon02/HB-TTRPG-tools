(() => {
  'use strict';

  if (window.EXO_CONTROL_AUDIO) return;

  const MASTER_VOLUME = 0.72;
  const MAX_ACTIVE = 28;
  const STATION_CHARACTER = Object.freeze({
    helm: Object.freeze({ gain: 0.96, rate: 1.03 }),
    navigation: Object.freeze({ gain: 0.88, rate: 1.07 }),
    gunnery: Object.freeze({ gain: 1.08, rate: 0.95 }),
    engineering: Object.freeze({ gain: 1.14, rate: 0.90 }),
    science: Object.freeze({ gain: 0.84, rate: 1.09 }),
    comms: Object.freeze({ gain: 0.90, rate: 1.06 })
  });
  const PRELOAD_ASSETS = Object.freeze(['click', 'snap', 'snick', 'krunk', 'clickKlunk', 'slowCoinClicking', 'engineLoop', 'deng']);
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
    graonkerliker: 'assets/Graonkerliker.mp3'
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
    ])
  });

  const active = new Set();
  const loops = new Map();
  const preloaders = new Map();
  let masterVolume = MASTER_VOLUME;

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
    const character = characterFor(options);
    audio.preload = 'auto';
    audio.volume = clamp((layer.gain ?? 0.1) * (options.intensity ?? 1) * character.gain * masterVolume, 0, 1);
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
    if (!key) return;
    stopLoop(key);
    const layers = scenes[scene];
    if (!layers) return;
    const handles = [];
    layers.forEach((layer, index) => {
      const loopLayer = { ...layer, loop: true, stopMs: undefined, delay: undefined };
      const handle = startLayer(loopLayer, { ...options, scene, key }, index);
      if (handle) handles.push(handle);
    });
    if (handles.length) loops.set(key, handles);
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
    [...active].forEach(retire);
  }

  function setMasterVolume(value) {
    masterVolume = clamp(Number(value) || 0, 0, 1);
  }

  window.EXO_CONTROL_AUDIO = Object.freeze({
    assets,
    scenes,
    stationCharacter: STATION_CHARACTER,
    prime,
    play,
    startLoop,
    stopLoop,
    stopAll,
    setMasterVolume,
    get masterVolume() { return masterVolume; }
  });

  prime();
  document.addEventListener('visibilitychange', () => { if (document.hidden) stopAll(); });
  window.addEventListener('pagehide', stopAll);
})();
