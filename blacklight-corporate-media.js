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
      .bli-promo-track{position:relative}.bli-promo-slide{display:none;margin:0}.bli-promo-slide.is-active{display:block}.bli-promo-slide img{display:block;width:100%;aspect-ratio:16/9;object-fit:cover}.bli-promo-visual figcaption{padding:10px 12px;color:var(--bli-muted);font-size:.78rem;font-weight:900;letter-spacing:.08em;text-transform:uppercase;background:rgba(0,0,0,.32)}
      .bli-promo-dots{display:flex;gap:7px;align-items:center;justify-content:center;padding:10px 12px;background:rgba(0,0,0,.22)}.bli-promo-dot{width:8px;height:8px;border:1px solid rgba(217,168,79,.7);border-radius:999px;background:transparent;cursor:pointer;padding:0}.bli-promo-dot.is-active{background:#d9a84f}.bli-promo-dot:focus-visible{outline:2px solid #f4efe5;outline-offset:3px}
      .bli-icon-img{width:1.05em;height:1.05em;object-fit:contain;display:block;filter:drop-shadow(0 2px 8px rgba(0,0,0,.4))}.bli-icon:has(.bli-icon-img)::before{content:none!important}
      .bli-card .bli-icon{margin-bottom:12px}.bli-action .bli-icon-img{display:inline-block;margin-right:.4em;vertical-align:-.15em}
      @media (max-width:860px){.bli-promo-slide img{max-height:320px}}
    `;
    document.head.appendChild(style);
  }

  function normalizePromo(item) {
    if (!item) return null;
    if (typeof item === 'string') return { src: item, label: 'Blacklight Intelligence promotional asset' };
    if (item.src || item.path) return { src: item.src || item.path, label: item.label || 'Blacklight Intelligence promotional asset' };
    return null;
  }

  function resolvePromos(candidates, callback) {
    const promos = (candidates || []).map(normalizePromo).filter(Boolean);
    if (!promos.length) return callback([]);
    let pending = promos.length;
    const resolved = [];
    promos.forEach(promo => {
      const img = new Image();
      img.onload = () => {
        resolved.push(promo);
        pending -= 1;
        if (!pending) callback(resolved);
      };
      img.onerror = () => {
        pending -= 1;
        if (!pending) callback(resolved);
      };
      img.src = promo.src;
    });
  }

  function installCarousel(figure, promos) {
    const slides = Array.from(figure.querySelectorAll('.bli-promo-slide'));
    const dots = Array.from(figure.querySelectorAll('.bli-promo-dot'));
    if (slides.length < 2) return;
    let active = 0;
    const show = index => {
      active = (index + slides.length) % slides.length;
      slides.forEach((slide, slideIndex) => slide.classList.toggle('is-active', slideIndex === active));
      dots.forEach((dot, dotIndex) => dot.classList.toggle('is-active', dotIndex === active));
    };
    dots.forEach((dot, index) => dot.addEventListener('click', () => show(index)));
    window.setInterval(() => show(active + 1), 6500);
  }

  function installHero() {
    const hero = document.querySelector('.bli-hero');
    const panel = hero?.querySelector('.bli-directory-panel');
    if (!hero || !panel || panel.querySelector('.bli-promo-visual')) return;
    const candidates = location.pathname.includes('systems')
      ? ASSETS.corporatePromos.systemsCandidates
      : ASSETS.corporatePromos.homepageCandidates;
    resolvePromos(candidates, promos => {
      if (!promos.length) return;
      panel.classList.add('has-promo');
      const figure = document.createElement('figure');
      figure.className = 'bli-promo-visual bli-promo-carousel';
      const slides = promos.map((promo, index) => `<div class="bli-promo-slide${index === 0 ? ' is-active' : ''}"><img src="${promo.src}" alt="Blacklight Intelligence promotional image" loading="lazy" decoding="async"><figcaption>${promo.label}</figcaption></div>`).join('');
      const dots = promos.length > 1 ? `<div class="bli-promo-dots" aria-label="Promotional image carousel controls">${promos.map((_, index) => `<button class="bli-promo-dot${index === 0 ? ' is-active' : ''}" type="button" aria-label="Show promotional image ${index + 1}"></button>`).join('')}</div>` : '';
      figure.innerHTML = `<div class="bli-promo-track">${slides}</div>${dots}`;
      panel.prepend(figure);
      installCarousel(figure, promos);
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