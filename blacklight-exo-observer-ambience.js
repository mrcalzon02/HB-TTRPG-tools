(() => {
  "use strict";

  if (window.EXO_OBSERVER_AMBIENCE) return;

  // Observer Mode reference texture: low, indistinct human activity rather than
  // foreground dialogue. This CC0 recording is intentionally long so the loop
  // does not call attention to itself during autonomous demonstrations.
  const AMBIENCE_URL = "https://commons.wikimedia.org/wiki/Special:Redirect/file/Cafe_ambiance.ogg";
  const AMBIENCE_GAIN = 0.1365;
  const FADE_IN_MS = 2600;
  const FADE_OUT_MS = 1250;

  let audio = null;
  let masterVolume = readMasterVolume();
  let fadeFrame = 0;
  let fadeToken = 0;
  let active = false;
  let randomizedStart = false;

  const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));

  function readMasterVolume() {
    const live = Number(window.EXO_CONTROL_AUDIO?.masterVolume);
    if (Number.isFinite(live)) return clamp(live);
    const stored = Number.parseFloat(localStorage.getItem("blacklightBackgroundMusicVolume"));
    return Number.isFinite(stored) ? clamp(stored) : 0.75;
  }

  function targetVolume() {
    return clamp(masterVolume) * AMBIENCE_GAIN;
  }

  function ensureAudio() {
    if (audio) return audio;
    audio = document.createElement("audio");
    audio.id = "exo-observer-crew-ambience";
    audio.loop = true;
    audio.preload = "metadata";
    audio.volume = 0;
    audio.src = AMBIENCE_URL;
    audio.setAttribute("aria-hidden", "true");
    audio.dataset.source = "Wikimedia Commons · Cafe ambiance.ogg · CC0";
    audio.addEventListener("loadedmetadata", () => {
      if (!randomizedStart && Number.isFinite(audio.duration) && audio.duration > 45) {
        randomizedStart = true;
        audio.currentTime = Math.random() * Math.max(1, audio.duration - 20);
      }
    });
    audio.addEventListener("error", () => {
      console.warn("Observer crew ambience could not be loaded; Observer Mode will continue without the crowd bed.");
    });
    document.body.appendChild(audio);
    return audio;
  }

  function cancelFade() {
    fadeToken++;
    if (fadeFrame) cancelAnimationFrame(fadeFrame);
    fadeFrame = 0;
  }

  function fadeTo(destination, duration, { pauseWhenSilent = false } = {}) {
    const node = ensureAudio();
    cancelFade();
    const token = fadeToken;
    const start = node.volume;
    const end = clamp(destination);
    const started = performance.now();

    const tick = now => {
      if (token !== fadeToken) return;
      const t = clamp((now - started) / Math.max(1, duration));
      const eased = t * t * (3 - 2 * t);
      node.volume = clamp(start + (end - start) * eased);
      if (t < 1) {
        fadeFrame = requestAnimationFrame(tick);
        return;
      }
      fadeFrame = 0;
      node.volume = end;
      if (pauseWhenSilent && end <= 0.0001) node.pause();
    };
    fadeFrame = requestAnimationFrame(tick);
  }

  async function start() {
    active = true;
    masterVolume = readMasterVolume();
    const node = ensureAudio();
    try {
      await node.play();
      if (!active) {
        node.pause();
        return;
      }
      fadeTo(targetVolume(), FADE_IN_MS);
    } catch (_) {
      // The Observer eye is a user gesture, so this should normally succeed.
      // If a browser still blocks remote media, Observer Mode itself remains usable.
    }
  }

  function stop() {
    active = false;
    if (!audio) return;
    fadeTo(0, FADE_OUT_MS, { pauseWhenSilent: true });
  }

  function setMasterVolume(value) {
    const next = Number(value);
    masterVolume = Number.isFinite(next) ? clamp(next) : readMasterVolume();
    if (active && audio && !audio.paused) fadeTo(targetVolume(), 320);
  }

  document.addEventListener("blacklight-master-volume-change", event => {
    setMasterVolume(event.detail?.volume);
  });

  window.addEventListener("exo:observer-mode", event => {
    if (event.detail?.active) void start();
    else stop();
  });

  window.addEventListener("pagehide", () => {
    cancelFade();
    audio?.pause();
  });

  window.EXO_OBSERVER_AMBIENCE = Object.freeze({
    start,
    stop,
    setMasterVolume,
    get active() { return active; },
    get source() { return AMBIENCE_URL; },
    get gain() { return AMBIENCE_GAIN; }
  });
})();
