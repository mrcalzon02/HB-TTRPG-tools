(() => {
  'use strict';

  const ASSETS = window.BLACKLIGHT_ASSETS;
  const pageSpeeches = ASSETS?.audio?.pageSpeeches || {};
  const pageName = (window.location.pathname.split('/').pop() || 'blacklight-corporate.html').trim();
  const speechSrc = pageName === 'blacklight-personnel.html'
    ? 'assets/blacklight/speech_4.mp3'
    : pageSpeeches[pageName];
  if (!speechSrc) return;

  const shouldAutoplay = pageName === 'blacklight-corporate.html';

  const labels = {
    'blacklight-corporate.html': {
      eyebrow: 'Corporate address',
      title: 'Play Blacklight corporate landing speech',
      button: 'Play Corporate Speech',
      note: 'Speech starts automatically when permitted by your browser. Use Play if autoplay is blocked.'
    },
    'blacklight-personnel.html': {
      eyebrow: 'Personnel address',
      title: 'Play Blacklight personnel and board speech',
      button: 'Play Personnel Speech',
      note: 'Manual playback is required by browser audio policy.'
    }
  };

  const copy = labels[pageName] || {
    eyebrow: 'Blacklight audio',
    title: 'Play Blacklight speech',
    button: 'Play Speech',
    note: 'Manual playback is required by browser audio policy.'
  };

  function injectStyles() {
    if (document.getElementById('blacklight-page-audio-style')) return;
    const style = document.createElement('style');
    style.id = 'blacklight-page-audio-style';
    style.textContent = `
      .bli-speech-panel{margin-top:16px;border:1px solid rgba(217,168,79,.28);border-radius:16px;background:rgba(0,0,0,.24);box-shadow:0 12px 34px rgba(0,0,0,.22);padding:14px;display:grid;gap:10px;max-width:760px}
      .bli-speech-panel strong{display:block;color:#f4efe5;font-size:1rem}.bli-speech-panel p{margin:0;color:#bdb4a4;font-size:.9rem;line-height:1.5}
      .bli-speech-controls{display:flex;flex-wrap:wrap;align-items:center;gap:10px}.bli-speech-button{border:1px solid rgba(217,168,79,.62);border-radius:999px;background:rgba(217,168,79,.12);color:#f4efe5;font-weight:900;letter-spacing:.06em;text-transform:uppercase;padding:9px 13px;cursor:pointer}.bli-speech-button:hover{background:rgba(217,168,79,.2)}
      .bli-speech-panel audio{width:min(100%,420px);height:34px;filter:sepia(.12) saturate(.85)}.bli-speech-status{font-size:.78rem;color:#d9a84f;font-weight:900;letter-spacing:.08em;text-transform:uppercase}
    `;
    document.head.appendChild(style);
  }

  function installPageSpeech() {
    if (pageName === 'blacklight-personnel.html') {
      const obsoleteStandaloneAddress = document.getElementById('address-04');
      obsoleteStandaloneAddress?.remove();
    }

    if (document.querySelector('.bli-speech-panel')) return;
    const hero = document.querySelector('.bli-hero > div') || document.querySelector('.bli-hero') || document.body;
    const anchor = hero.querySelector('.bli-actions');
    const panel = document.createElement('section');
    panel.className = 'bli-speech-panel';
    if (pageName === 'blacklight-personnel.html') panel.id = 'address-04';
    panel.setAttribute('aria-label', copy.title);
    panel.innerHTML = `
      <div>
        <p class="bli-eyebrow">${copy.eyebrow}</p>
        <strong>${copy.title}</strong>
        <p>${copy.note}</p>
      </div>
      <div class="bli-speech-controls">
        <button class="bli-speech-button" type="button">${copy.button}</button>
        <audio preload="${shouldAutoplay ? 'auto' : 'metadata'}"${shouldAutoplay ? ' autoplay' : ''} controls src="${speechSrc}"></audio>
        <span class="bli-speech-status" aria-live="polite">${shouldAutoplay ? 'Starting' : 'Ready'}</span>
      </div>
    `;
    if (anchor) anchor.insertAdjacentElement('afterend', panel);
    else hero.appendChild(panel);

    const button = panel.querySelector('.bli-speech-button');
    const audio = panel.querySelector('audio');
    const status = panel.querySelector('.bli-speech-status');

    button.addEventListener('click', async () => {
      try {
        if (audio.paused) {
          await audio.play();
        } else {
          audio.pause();
        }
      } catch (error) {
        status.textContent = 'Playback blocked';
      }
    });

    audio.addEventListener('play', () => {
      button.textContent = 'Pause Speech';
      status.textContent = 'Playing';
    });
    audio.addEventListener('pause', () => {
      button.textContent = copy.button;
      status.textContent = audio.currentTime > 0 ? 'Paused' : 'Ready';
    });
    audio.addEventListener('ended', () => {
      button.textContent = copy.button;
      status.textContent = 'Complete';
    });
    audio.addEventListener('error', () => {
      status.textContent = 'Audio unavailable';
    });

    if (shouldAutoplay) {
      const autoplayAttempt = audio.play();
      if (autoplayAttempt && typeof autoplayAttempt.catch === 'function') {
        autoplayAttempt.catch(() => {
          status.textContent = 'Autoplay blocked — press Play';
        });
      }
    }
  }

  function initialize() {
    injectStyles();
    installPageSpeech();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialize, { once: true });
  else initialize();
})();
