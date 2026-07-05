(() => {
  'use strict';

  const PANEL_ID = 'blacklight-systems-sublevel-panel';
  const BODY_ID = 'blacklight-systems-sublevel-body';
  const SYSTEM_SELECTORS = ['#blacklight-continuum #blacklight-corporate-systems', 'body.blacklight-corp-body main #systems'];

  function isPublicLocked() {
    try {
      const params = new URLSearchParams(window.location.search);
      return !document.body.classList.contains('blacklight-corp-body') && params.get('blacklight_access') !== 'corporate';
    } catch (_) {
      return !document.body.classList.contains('blacklight-corp-body');
    }
  }

  function injectStyles() {
    if (document.getElementById('blacklight-systems-subpanel-style')) return;
    const style = document.createElement('style');
    style.id = 'blacklight-systems-subpanel-style';
    style.textContent = `
      .blacklight-systems-launch-card{border:1px solid rgba(217,168,79,.34);border-radius:24px;padding:22px;background:linear-gradient(145deg,rgba(217,168,79,.10),rgba(255,255,255,.02)),rgba(8,8,10,.78);box-shadow:0 22px 70px rgba(0,0,0,.32);margin:0 0 24px}
      .blacklight-systems-launch-card h2{margin:.25rem 0 .75rem}.blacklight-systems-launch-card p{color:var(--bli-muted,var(--muted));line-height:1.6;max-width:860px}
      .blacklight-systems-subpanel{position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.72);backdrop-filter:blur(10px);padding:clamp(14px,3vw,34px);overflow:auto}
      .blacklight-systems-subpanel[hidden]{display:none!important}
      .blacklight-systems-subpanel-shell{width:min(1240px,100%);margin:0 auto;border:1px solid rgba(217,168,79,.38);border-radius:28px;background:radial-gradient(circle at top left,rgba(217,168,79,.13),transparent 28rem),linear-gradient(180deg,rgba(13,12,11,.98),rgba(5,5,7,.98));box-shadow:0 28px 90px rgba(0,0,0,.62);overflow:hidden}
      .blacklight-systems-subpanel-header{display:flex;justify-content:space-between;gap:18px;align-items:flex-start;padding:22px;border-bottom:1px solid rgba(217,168,79,.24);background:rgba(255,255,255,.025)}
      .blacklight-systems-subpanel-header p{margin:.25rem 0 0;color:var(--bli-muted,var(--muted));line-height:1.55}.blacklight-systems-subpanel-title{margin:0;font-size:clamp(1.55rem,3vw,2.5rem)}
      .blacklight-systems-subpanel-close{border:1px solid rgba(217,168,79,.45);border-radius:999px;background:rgba(217,168,79,.12);color:var(--bli-ink,var(--ink));font-weight:900;padding:9px 13px;cursor:pointer;white-space:nowrap}
      .blacklight-systems-subpanel-body{padding:22px}.blacklight-systems-subpanel-body .bli-section{margin:0}.blacklight-systems-subpanel-body .bli-section-head{margin-bottom:18px}
      body.blacklight-systems-panel-open{overflow:hidden}
      @media(max-width:760px){.blacklight-systems-subpanel-header{display:grid}.blacklight-systems-subpanel-close{justify-self:start}}
    `;
    document.head.appendChild(style);
  }

  function systemsSection() {
    for (const selector of SYSTEM_SELECTORS) {
      const found = document.querySelector(selector);
      if (found && !found.closest(`#${PANEL_ID}`)) return found;
    }
    return null;
  }

  function workspaceShell(section) {
    return section.closest('#blacklight-continuum')?.querySelector('.bli-shell')
      || document.querySelector('body.blacklight-corp-body main.bli-shell')
      || section.parentElement;
  }

  function ensurePanel(anchor) {
    let panel = document.getElementById(PANEL_ID);
    if (panel) return panel;
    panel = document.createElement('section');
    panel.id = PANEL_ID;
    panel.className = 'blacklight-systems-subpanel';
    panel.hidden = true;
    panel.setAttribute('aria-hidden', 'true');
    panel.innerHTML = `
      <div class="blacklight-systems-subpanel-shell" role="dialog" aria-modal="true" aria-labelledby="blacklight-systems-subpanel-title">
        <header class="blacklight-systems-subpanel-header">
          <div>
            <p class="bli-eyebrow">Authorized systems sublevel</p>
            <h2 id="blacklight-systems-subpanel-title" class="blacklight-systems-subpanel-title">Operational records and support interfaces</h2>
            <p>This panel is the cleared employee systems layer. It is intentionally separated from the public corporate page flow.</p>
          </div>
          <button class="blacklight-systems-subpanel-close" type="button" data-blacklight-close-systems>Close Systems Panel</button>
        </header>
        <div id="${BODY_ID}" class="blacklight-systems-subpanel-body"></div>
      </div>`;
    (anchor.closest('#blacklight-continuum') || document.body).appendChild(panel);
    panel.querySelector('[data-blacklight-close-systems]')?.addEventListener('click', closePanel);
    panel.addEventListener('click', event => {
      if (event.target === panel) closePanel();
    });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && !panel.hidden) closePanel();
    });
    return panel;
  }

  function openPanel() {
    const panel = document.getElementById(PANEL_ID);
    if (!panel) return;
    panel.hidden = false;
    panel.setAttribute('aria-hidden', 'false');
    document.body.classList.add('blacklight-systems-panel-open');
    panel.querySelector('[data-blacklight-close-systems]')?.focus?.();
  }

  function closePanel() {
    const panel = document.getElementById(PANEL_ID);
    if (!panel) return;
    panel.hidden = true;
    panel.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('blacklight-systems-panel-open');
  }

  function ensureLauncher(shell) {
    let launcher = shell.querySelector('[data-blacklight-systems-launch-card]');
    if (launcher) return launcher;
    launcher = document.createElement('section');
    launcher.className = 'blacklight-systems-launch-card';
    launcher.dataset.blacklightSystemsLaunchCard = 'true';
    launcher.innerHTML = `
      <p class="bli-eyebrow">Cleared employee systems</p>
      <h2>Authorized systems directory</h2>
      <p>Open the internal systems layer for archive records, operative sheets, induction systems, assignment tools, field catalogs, training examples, and support references.</p>
      <div class="bli-actions"><button class="bli-action primary" type="button" data-blacklight-open-systems-panel>Open Systems Panel</button></div>`;
    shell.prepend(launcher);
    launcher.querySelector('[data-blacklight-open-systems-panel]')?.addEventListener('click', openPanel);
    return launcher;
  }

  function wireSystemLinks() {
    document.querySelectorAll('a[href="#blacklight-corporate-systems"], a[href="#systems"]').forEach(link => {
      link.addEventListener('click', event => {
        if (isPublicLocked()) return;
        event.preventDefault();
        openPanel();
      });
    });
  }

  function install() {
    if (isPublicLocked()) return;
    injectStyles();
    const section = systemsSection();
    if (!section) return;
    const shell = workspaceShell(section);
    const panel = ensurePanel(section);
    const panelBody = panel.querySelector(`#${BODY_ID}`);
    if (!panelBody.contains(section)) panelBody.appendChild(section);
    ensureLauncher(shell);
    wireSystemLinks();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', install, { once: true });
  } else {
    install();
  }

  const observer = new MutationObserver(install);
  observer.observe(document.documentElement, { childList: true, subtree: true });
})();
