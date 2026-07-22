(() => {
  'use strict';

  if (window.BLACKLIGHT_BACKGROUND_AUDIO_INSTALLED) return;
  window.BLACKLIGHT_BACKGROUND_AUDIO_INSTALLED = true;

  const STORAGE = Object.freeze({
    volume: 'blacklightBackgroundMusicVolume',
    paused: 'blacklightBackgroundMusicPaused',
    time: 'blacklightBackgroundMusicTime',
    updated: 'blacklightBackgroundMusicUpdated'
  });
  const DEFAULT_VOLUME = 0.75;
  const SAVE_INTERVAL_MS = 1000;
  const trackUrl = 'https://cdn1.suno.ai/f02fe8ca-e7ea-4608-95c0-1c7d795637b1.mp3';

  function clamp(value, minimum, maximum) {
    return Math.min(maximum, Math.max(minimum, value));
  }

  function readNumber(key, fallback) {
    const value = Number.parseFloat(localStorage.getItem(key));
    return Number.isFinite(value) ? value : fallback;
  }

  function readBoolean(key, fallback) {
    const value = localStorage.getItem(key);
    if (value === null) return fallback;
    return value === 'true';
  }

  function formatTime(value) {
    if (!Number.isFinite(value) || value < 0) return '0:00';
    const seconds = Math.floor(value % 60).toString().padStart(2, '0');
    const minutes = Math.floor(value / 60);
    return `${minutes}:${seconds}`;
  }

  function installStyles() {
    if (document.getElementById('blacklight-background-audio-style')) return;
    const style = document.createElement('style');
    style.id = 'blacklight-background-audio-style';
    style.textContent = `
      .blacklight-background-audio-bar{position:fixed;right:16px;bottom:16px;z-index:2147483000;width:min(360px,calc(100vw - 24px));box-sizing:border-box;border:1px solid rgba(217,168,79,.55);border-radius:18px;background:linear-gradient(145deg,rgba(21,19,16,.97),rgba(4,4,4,.98));box-shadow:0 18px 48px rgba(0,0,0,.48),inset 0 1px rgba(255,255,255,.04);color:#f4efe5;font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;padding:12px;display:grid;gap:9px;backdrop-filter:blur(16px)}
      .blacklight-background-audio-head{display:flex;align-items:center;gap:10px;min-width:0}.blacklight-background-audio-play{width:38px;height:38px;flex:0 0 auto;border:1px solid rgba(217,168,79,.72);border-radius:999px;background:rgba(217,168,79,.14);color:#f4efe5;font-size:1rem;font-weight:900;cursor:pointer}.blacklight-background-audio-play:hover{background:rgba(217,168,79,.25)}
      .blacklight-background-audio-copy{min-width:0;display:grid;gap:2px;flex:1}.blacklight-background-audio-copy strong{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:.9rem;letter-spacing:.02em}.blacklight-background-audio-status{color:#d9a84f;font-size:.67rem;font-weight:900;letter-spacing:.09em;text-transform:uppercase}
      .blacklight-background-audio-time{font-variant-numeric:tabular-nums;color:#d9d1c0;font-size:.74rem;white-space:nowrap}.blacklight-background-audio-seek{width:100%;accent-color:#d9a84f;cursor:pointer}.blacklight-background-audio-lower{display:grid;grid-template-columns:auto 1fr auto;gap:8px;align-items:center;color:#bdb4a4;font-size:.72rem}.blacklight-background-audio-volume{width:100%;min-width:80px;accent-color:#d9a84f;cursor:pointer}.blacklight-background-audio-mute{border:0;background:transparent;color:#d9d1c0;padding:2px;cursor:pointer;font-size:.95rem}
      .blacklight-background-audio-bar[data-blocked="true"]{border-color:rgba(217,168,79,.9);box-shadow:0 18px 48px rgba(0,0,0,.48),0 0 24px rgba(217,168,79,.16)}
      @media(max-width:520px){.blacklight-background-audio-bar{right:12px;bottom:12px;width:calc(100vw - 24px)}}
      @media print{.blacklight-background-audio-bar{display:none!important}}
    `;
    document.head.appendChild(style);
  }

  function installPlayer() {
    if (document.getElementById('blacklight-background-audio-bar')) return;
    installStyles();

    const storedVolume = clamp(readNumber(STORAGE.volume, DEFAULT_VOLUME), 0, 1);
    const userPaused = readBoolean(STORAGE.paused, false);
    const savedTime = Math.max(0, readNumber(STORAGE.time, 0));
    const savedAt = Math.max(0, readNumber(STORAGE.updated, Date.now()));

    const audio = document.createElement('audio');
    audio.id = 'blacklight-background-music';
    audio.loop = true;
    audio.autoplay = !userPaused;
    audio.preload = 'auto';
    audio.volume = storedVolume;
    audio.setAttribute('aria-hidden', 'true');

    const bar = document.createElement('section');
    bar.id = 'blacklight-background-audio-bar';
    bar.className = 'blacklight-background-audio-bar';
    bar.setAttribute('aria-label', 'Blacklight background music controls');
    bar.innerHTML = `
      <div class="blacklight-background-audio-head">
        <button class="blacklight-background-audio-play" type="button" aria-label="Pause background music">▶</button>
        <div class="blacklight-background-audio-copy"><strong>Starry Cereal</strong><span class="blacklight-background-audio-status" aria-live="polite">Loading background music</span></div>
        <span class="blacklight-background-audio-time">0:00 / 0:00</span>
      </div>
      <input class="blacklight-background-audio-seek" type="range" min="0" max="1000" value="0" aria-label="Background music position">
      <div class="blacklight-background-audio-lower">
        <button class="blacklight-background-audio-mute" type="button" aria-label="Mute background music">🔊</button>
        <input class="blacklight-background-audio-volume" type="range" min="0" max="1" step="0.01" value="${storedVolume}" aria-label="Background music volume">
        <span class="blacklight-background-audio-volume-label">${Math.round(storedVolume * 100)}%</span>
      </div>
    `;

    const playButton = bar.querySelector('.blacklight-background-audio-play');
    const status = bar.querySelector('.blacklight-background-audio-status');
    const timer = bar.querySelector('.blacklight-background-audio-time');
    const seek = bar.querySelector('.blacklight-background-audio-seek');
    const muteButton = bar.querySelector('.blacklight-background-audio-mute');
    const volume = bar.querySelector('.blacklight-background-audio-volume');
    const volumeLabel = bar.querySelector('.blacklight-background-audio-volume-label');
    let lastAudibleVolume = storedVolume || DEFAULT_VOLUME;
    let lastSave = 0;
    let seeking = false;

    function saveState(force = false) {
      const now = Date.now();
      if (!force && now - lastSave < SAVE_INTERVAL_MS) return;
      lastSave = now;
      localStorage.setItem(STORAGE.volume, String(audio.volume));
      localStorage.setItem(STORAGE.paused, String(audio.paused));
      localStorage.setItem(STORAGE.time, String(audio.currentTime || 0));
      localStorage.setItem(STORAGE.updated, String(now));
    }

    function updateControls() {
      const duration = Number.isFinite(audio.duration) ? audio.duration : 0;
      const current = Number.isFinite(audio.currentTime) ? audio.currentTime : 0;
      timer.textContent = `${formatTime(current)} / ${formatTime(duration)}`;
      if (!seeking) seek.value = duration > 0 ? String(Math.round((current / duration) * 1000)) : '0';
      playButton.textContent = audio.paused ? '▶' : 'Ⅱ';
      playButton.setAttribute('aria-label', audio.paused ? 'Play background music' : 'Pause background music');
      muteButton.textContent = audio.volume === 0 ? '🔇' : audio.volume < 0.45 ? '🔉' : '🔊';
      volume.value = String(audio.volume);
      volumeLabel.textContent = `${Math.round(audio.volume * 100)}%`;
      if (!audio.paused) saveState();
    }

    async function requestPlayback() {
      try {
        await audio.play();
        bar.dataset.blocked = 'false';
        status.textContent = 'Background music playing';
        localStorage.setItem(STORAGE.paused, 'false');
      } catch (_) {
        bar.dataset.blocked = 'true';
        status.textContent = 'Press play to start music';
      }
      updateControls();
    }

    function restorePosition() {
      if (!Number.isFinite(audio.duration) || audio.duration <= 0) return;
      const elapsedWhileNavigating = userPaused ? 0 : Math.max(0, (Date.now() - savedAt) / 1000);
      audio.currentTime = (savedTime + elapsedWhileNavigating) % audio.duration;
    }

    playButton.addEventListener('click', () => {
      if (audio.paused) void requestPlayback();
      else {
        audio.pause();
        status.textContent = 'Background music paused';
        localStorage.setItem(STORAGE.paused, 'true');
        saveState(true);
      }
    });

    seek.addEventListener('pointerdown', () => { seeking = true; });
    seek.addEventListener('pointerup', () => { seeking = false; });
    seek.addEventListener('input', () => {
      const duration = Number.isFinite(audio.duration) ? audio.duration : 0;
      if (duration > 0) audio.currentTime = (Number(seek.value) / 1000) * duration;
      updateControls();
      saveState(true);
    });

    volume.addEventListener('input', () => {
      audio.volume = clamp(Number(volume.value), 0, 1);
      if (audio.volume > 0) lastAudibleVolume = audio.volume;
      localStorage.setItem(STORAGE.volume, String(audio.volume));
      updateControls();
    });

    muteButton.addEventListener('click', () => {
      if (audio.volume > 0) {
        lastAudibleVolume = audio.volume;
        audio.volume = 0;
      } else {
        audio.volume = clamp(lastAudibleVolume || DEFAULT_VOLUME, 0.01, 1);
      }
      localStorage.setItem(STORAGE.volume, String(audio.volume));
      updateControls();
    });

    audio.addEventListener('loadedmetadata', () => {
      restorePosition();
      updateControls();
      if (!userPaused) void requestPlayback();
      else status.textContent = 'Background music paused';
    }, { once: true });
    audio.addEventListener('play', () => {
      status.textContent = 'Background music playing';
      bar.dataset.blocked = 'false';
      updateControls();
    });
    audio.addEventListener('pause', () => updateControls());
    audio.addEventListener('timeupdate', updateControls);
    audio.addEventListener('volumechange', updateControls);
    audio.addEventListener('error', () => {
      status.textContent = 'Background track unavailable';
      bar.dataset.blocked = 'true';
    });

    audio.src = trackUrl;
    document.body.append(audio, bar);
    window.addEventListener('pagehide', () => saveState(true));
    window.addEventListener('beforeunload', () => saveState(true));

    const resumeOnInteraction = () => {
      if (!userPaused && audio.paused) void requestPlayback();
    };
    document.addEventListener('pointerdown', resumeOnInteraction, { once: true, capture: true });
    document.addEventListener('keydown', resumeOnInteraction, { once: true, capture: true });

    updateControls();
    if (!userPaused) void requestPlayback();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', installPlayer, { once: true });
  else installPlayer();
})();
