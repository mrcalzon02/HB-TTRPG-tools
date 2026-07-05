(() => {
  'use strict';

  const CORPORATE_ROUTE_PARAM = 'blacklight_access';
  const CORPORATE_ROUTE_VALUE = 'corporate';

  function isCorporateAccessRoute() {
    try {
      return new URLSearchParams(window.location.search).get(CORPORATE_ROUTE_PARAM) === CORPORATE_ROUTE_VALUE;
    } catch (_) {
      return false;
    }
  }

  function isTopLevelToolsPage() {
    return !document.body.classList.contains('blacklight-corp-body');
  }

  function shouldLockPublicView() {
    return isTopLevelToolsPage() && !isCorporateAccessRoute();
  }

  function makeNotice() {
    const notice = document.createElement('section');
    notice.className = 'bli-section';
    notice.dataset.blacklightPublicLockNotice = 'true';
    notice.innerHTML = `
      <div class="bli-section-head">
        <p class="bli-eyebrow">Employee systems access required</p>
        <h2>Authorized systems are not published from this page.</h2>
        <p>The systems directory, internal archive, operative tools, assignment generators, personnel records, field catalogs, and training references are restricted to the corporate access route.</p>
        <div class="bli-actions">
          <a class="bli-action primary" href="blacklight-corporate.html">Open Blacklight Corporate Login</a>
        </div>
      </div>`;
    return notice;
  }

  function removeDirectAccessElements(view) {
    const selectors = [
      'a[href="#blacklight-corporate-systems"]',
      '#blacklight-open-wiki',
      '#blacklight-open-corporate',
      '#blacklight-open-facility',
      '#blacklight-open-archive-card',
      '[data-blacklight-internal-archive-card]',
      '[data-blacklight-character-sheet-card]',
      '[data-blacklight-character-creation-card]',
      '[data-blacklight-random-character-card]',
      '[data-blacklight-veteran-card]',
      '[data-blacklight-mission-generator-card]',
      '[data-blacklight-npc-generator-card]',
      '[data-blacklight-entity-catalog-card]',
      '[data-blacklight-court-catalog-card]',
      '[data-blacklight-gaian-spirit-card]',
      '[data-blacklight-equipment-card]',
      '[data-blacklight-combat-example-card]',
      '[data-blacklight-social-conflict-card]'
    ];

    selectors.forEach(selector => {
      view.querySelectorAll(selector).forEach(element => element.remove());
    });

    view.querySelectorAll('a[href*="blacklight_entry="], a[href*="blacklight_search="]').forEach(element => element.remove());
  }

  function lockBrowser(view) {
    const browser = view.querySelector('#blacklight-browser');
    if (!browser) return;
    browser.hidden = true;
    browser.innerHTML = '';
  }

  function lockSystemsDirectory() {
    if (!shouldLockPublicView()) return;
    const view = document.getElementById('blacklight-continuum');
    if (!view) return;

    removeDirectAccessElements(view);

    const systems = view.querySelector('#blacklight-corporate-systems');
    if (systems) systems.remove();

    const shell = view.querySelector('.bli-shell');
    if (shell && !shell.querySelector('[data-blacklight-public-lock-notice]')) {
      shell.prepend(makeNotice());
    }

    lockBrowser(view);
  }

  function interceptPublicAccess(event) {
    if (!shouldLockPublicView()) return;
    const target = event.target.closest?.('button, a');
    if (!target) return;
    const blocked = target.matches('#blacklight-open-wiki, #blacklight-open-corporate, #blacklight-open-facility, #blacklight-open-archive-card')
      || String(target.getAttribute('href') || '').includes('blacklight_entry=')
      || String(target.getAttribute('href') || '').includes('blacklight_search=')
      || String(target.getAttribute('href') || '') === '#blacklight-corporate-systems';
    if (!blocked) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    lockSystemsDirectory();
  }

  document.addEventListener('click', interceptPublicAccess, true);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', lockSystemsDirectory, { once: true });
  } else {
    lockSystemsDirectory();
  }

  const observer = new MutationObserver(lockSystemsDirectory);
  observer.observe(document.documentElement, { childList: true, subtree: true });
})();
