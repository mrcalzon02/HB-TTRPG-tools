(() => {
  'use strict';

  const CORPORATE_ROUTE_PARAM = 'blacklight_access';
  const CORPORATE_ROUTE_VALUE = 'corporate';
  const LOGIN_STORAGE_KEY = 'blacklight-wiki-stage-gate-complete';

  function isCorporateAccessRoute() {
    try {
      return new URLSearchParams(window.location.search).get(CORPORATE_ROUTE_PARAM) === CORPORATE_ROUTE_VALUE;
    } catch (_) {
      return false;
    }
  }

  function loginComplete() {
    try {
      return sessionStorage.getItem(LOGIN_STORAGE_KEY) === 'true';
    } catch (_) {
      return false;
    }
  }

  function isTopLevelToolsPage() {
    return !document.body.classList.contains('blacklight-corp-body');
  }

  function shouldLockPublicView() {
    return isTopLevelToolsPage() && !isCorporateAccessRoute() && !loginComplete();
  }

  function corporateAccessUrl() {
    return 'index.html?blacklight_access=corporate#blacklight-continuum';
  }

  function makeNotice() {
    const notice = document.createElement('section');
    notice.className = 'bli-section';
    notice.dataset.blacklightPublicLockNotice = 'true';
    notice.innerHTML = `
      <div class="bli-section-head">
        <p class="bli-eyebrow">Employee systems access required</p>
        <h2>Authorized systems are behind corporate login.</h2>
        <p>The systems directory, internal archive, operative tools, assignment generators, personnel records, field catalogs, and training references are not published from the public top-level workspace.</p>
        <div class="bli-actions">
          <button id="blacklight-corporate-login" class="bli-action primary" type="button">Open Corporate Login</button>
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

  async function routeThroughLoginGate() {
    const view = document.getElementById('blacklight-continuum');
    const browser = view?.querySelector('#blacklight-browser') || document.getElementById('blacklight-browser');
    if (!browser) return;

    browser.hidden = false;
    browser.scrollIntoView({ behavior: 'smooth', block: 'start' });

    const gate = window.BlacklightWikiLoginGate;
    if (gate?.runGate) {
      await gate.runGate(browser, { force: !gate.isUnlocked?.() });
    }

    if (loginComplete() || gate?.isUnlocked?.()) {
      window.location.href = corporateAccessUrl();
    }
  }

  function interceptPublicAccess(event) {
    const target = event.target.closest?.('button, a');
    if (!target) return;

    if (target.matches('#blacklight-corporate-login')) {
      event.preventDefault();
      event.stopImmediatePropagation();
      void routeThroughLoginGate();
      return;
    }

    if (!shouldLockPublicView()) return;

    const blocked = target.matches('#blacklight-open-wiki, #blacklight-open-corporate, #blacklight-open-facility, #blacklight-open-archive-card')
      || String(target.getAttribute('href') || '').includes('blacklight_entry=')
      || String(target.getAttribute('href') || '').includes('blacklight_search=')
      || String(target.getAttribute('href') || '') === '#blacklight-corporate-systems';
    if (!blocked) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    lockSystemsDirectory();
    void routeThroughLoginGate();
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
