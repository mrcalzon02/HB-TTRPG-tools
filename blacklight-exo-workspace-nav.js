(() => {
  'use strict';

  const modules = [
    ['Overview','blacklight-exo-operations.html'],
    ['Sector','blacklight-exo-stellar-sector.html'],
    ['System','blacklight-exo-solar-system.html'],
    ['Dossier','blacklight-exo-species-civilization.html'],
    ['Ecology','blacklight-exo-alien-ecology.html'],
    ['Governments','blacklight-exo-stellar-government.html'],
    ['FTL','blacklight-exo-ftl.html'],
    ['Vessel Engineering','blacklight-exo-vessel.html'],
    ['Crew Operations','blacklight-exo-crew-operations.html'],
    ['Deployment Health','blacklight-exo-deployment-health.html']
  ];

  function pageName() {
    const pathname = location.pathname.split('/').filter(Boolean).pop() || 'blacklight-exo-operations.html';
    return pathname.split('?')[0].split('#')[0];
  }

  function ensureStyle() {
    if (document.getElementById('exo-workspace-nav-style')) return;
    const style = document.createElement('style');
    style.id = 'exo-workspace-nav-style';
    style.textContent = '.exo-workspace-nav{width:calc(100% - 24px);margin:8px auto 0}@media(max-width:760px){.exo-workspace-nav{width:calc(100% - 12px);margin-top:6px}}';
    document.head.append(style);
  }

  function markCurrent(nav) {
    const current = pageName();
    for (const link of nav.querySelectorAll('a[href]')) {
      const href = link.getAttribute('href')?.split('?')[0].split('#')[0];
      if (href === current) link.setAttribute('aria-current','page');
      else link.removeAttribute('aria-current');
    }
  }

  function normalizeGlobalTopbar() {
    const nav = document.querySelector('.bli-topbar .bli-nav');
    if (!nav) return;
    for (const link of [...nav.querySelectorAll('a[href]')]) {
      const href = link.getAttribute('href') || '';
      if (href.startsWith('blacklight-exo-')) link.remove();
    }
    const globals = [
      ['Black Archive','blacklight-systems-black.html'],
      ['Systems Gateway','blacklight-corporate-systems.html']
    ];
    for (const [label,href] of globals) {
      if (nav.querySelector(`a[href="${href}"]`)) continue;
      const link = document.createElement('a');
      link.href = href;
      link.textContent = label;
      nav.append(link);
    }
  }

  function buildNavigation() {
    const nav = document.createElement('nav');
    nav.className = 'bli-system-nav exo-workspace-nav';
    nav.setAttribute('aria-label','EXO subsystem navigation');
    for (const [label,href] of modules) {
      const link = document.createElement('a');
      link.href = href;
      link.textContent = label;
      nav.append(link);
    }
    markCurrent(nav);
    return nav;
  }

  function install() {
    ensureStyle();
    normalizeGlobalTopbar();
    const existing = document.querySelector('.bli-system-nav');
    if (existing) {
      markCurrent(existing);
      return existing;
    }
    const header = document.querySelector('.bli-topbar');
    if (!header) return null;
    const nav = buildNavigation();
    header.insertAdjacentElement('afterend',nav);
    return nav;
  }

  globalThis.BlacklightExoWorkspaceNavigation = Object.freeze({modules:Object.freeze(modules.map(row=>Object.freeze([...row]))),install});
  install();
})();
