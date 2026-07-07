(() => {
  'use strict';

  const ASSETS = window.BLACKLIGHT_ASSETS;
  if (!ASSETS) return;

  function injectStyles() {
    if (document.getElementById('blacklight-corporate-media-style')) return;
    const style = document.createElement('style');
    style.id = 'blacklight-corporate-media-style';
    style.textContent = `
      .bli-directory-panel.has-promo{min-height:unset;align-content:start}.bli-promo-visual{margin:0 0 18px;overflow:hidden;border:1px solid rgba(217,168,79,.32);border-radius:18px;background:#080706;box-shadow:0 18px 45px rgba(0,0,0,.32)}
      .bli-promo-visual img{display:block;width:100%;aspect-ratio:16/9;object-fit:cover}.bli-promo-visual figcaption{padding:10px 12px;color:var(--bli-muted);font-size:.78rem;font-weight:900;letter-spacing:.08em;text-transform:uppercase;background:rgba(0,0,0,.32)}
      .bli-icon-img{width:1.05em;height:1.05em;object-fit:contain;display:block;filter:drop-shadow(0 2px 8px rgba(0,0,0,.4))}.bli-icon:has(.bli-icon-img)::before{content:none!important}
      .bli-card .bli-icon{margin-bottom:12px}.bli-action .bli-icon-img{display:inline-block;margin-right:.4em;vertical-align:-.15em}
      @media (max-width:860px){.bli-promo-visual img{max-height:320px}}
    `;
    document.head.appendChild(style);
  }

  function resolveFirst(candidates, callback) {
    const queue = [...candidates];
    const tryNext = () => {
      const src = queue.shift();
      if (!src) return callback('');
      const img = new Image();
      img.onload = () => callback(src);
      img.onerror = tryNext;
      img.src = src;
    };
    tryNext();
  }

  function installHero() {
    const hero = document.querySelector('.bli-hero');
    const panel = hero?.querySelector('.bli-directory-panel');
    if (!hero || !panel || panel.querySelector('.bli-promo-visual')) return;
    const candidates = location.pathname.includes('systems')
      ? ASSETS.corporatePromos.systemsCandidates
      : ASSETS.corporatePromos.homepageCandidates;
    resolveFirst(candidates, src => {
      if (!src) return;
      panel.classList.add('has-promo');
      const figure = document.createElement('figure');
      figure.className = 'bli-promo-visual';
      figure.innerHTML = `<img src="${src}" alt="Blacklight Intelligence promotional hero image" loading="lazy" decoding="async"><figcaption>Blacklight Intelligence promotional asset</figcaption>`;
      panel.prepend(figure);
    });
  }

  function decorateIcons() {
    const map = {
      visitors: 'user', parking: 'location', deliveries: 'cart', voice: 'play', security: 'lock', audit: 'analytics', hr: 'user', legal: 'link', ops: 'analytics', facility: 'settings', brand: 'image', wiki: 'search'
    };
    document.querySelectorAll('.bli-icon[data-icon]').forEach(node => {
      if (node.querySelector('img')) return;
      const src = ASSETS.icons[map[node.dataset.icon] || node.dataset.icon];
      if (!src) return;
      node.textContent = '';
      const img = document.createElement('img');
      img.className = 'bli-icon-img';
      img.src = src;
      img.alt = '';
      img.loading = 'lazy';
      img.decoding = 'async';
      node.appendChild(img);
    });
  }

  function decorateActions() {
    document.querySelectorAll('.bli-action.primary').forEach(action => {
      if (action.querySelector('.bli-icon-img')) return;
      const img = document.createElement('img');
      img.className = 'bli-icon-img';
      img.src = ASSETS.icons.lock;
      img.alt = '';
      img.loading = 'lazy';
      img.decoding = 'async';
      action.prepend(img);
    });
  }

  function initialize() {
    injectStyles();
    installHero();
    decorateIcons();
    decorateActions();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialize, { once: true });
  else initialize();
})();
