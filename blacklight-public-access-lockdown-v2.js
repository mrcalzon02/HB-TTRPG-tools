(() => {
  'use strict';

  const CORPORATE_ROUTE_PARAM = 'blacklight_access';
  const CORPORATE_ROUTE_VALUE = 'corporate';
  const LOGIN_STORAGE_KEY = 'blacklight-wiki-stage-gate-complete';
  const LOGIN_SCRIPT = 'blacklight-wiki-login-gate.js';
  let loginInProgress = false;

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
    return isTopLevelToolsPage() && !isCorporateAccessRoute() && !loginComplete() && !loginInProgress;
  }

  function corporateAccessUrl() {
    return 'blacklight-corporate.html?blacklight_access=corporate#systems';
  }

  function ensureLoginGateScript() {
    if (window.BlacklightWikiLoginGate?.runGate) return Promise.resolve();
    if (document.querySelector(`script[src="${LOGIN_SCRIPT}"],script[src^="${LOGIN_SCRIPT}?"]`)) {
      return new Promise(resolve => {
        let attempts = 0;
        const timer = window.setInterval(() => {
          attempts += 1;
          if (window.BlacklightWikiLoginGate?.runGate || attempts > 80) {
            window.clearInterval(timer);
            resolve();
          }
        }, 50);
      });
    }
    return new Promise(resolve => {
      const script = document.createElement('script');
      script.src = `${LOGIN_SCRIPT}?v=5`;
      script.async = false;
      script.onload = resolve;
      script.onerror = resolve;
      document.body.appendChild(script);
    });
  }

  function makeNotice() {
    const notice = document.createElement('section');
    notice.className = 'bli-section';
    notice.dataset.blacklightPublicLockNotice = 'true';
    notice.innerHTML = `
      <div class="bli-section-head">
        <p class="bli-eyebrow">Employee systems access required</p>
        <h2>Corporate login required.</h2>
        <p>The systems directory, internal archive, operative tools, assignment generators, personnel records, field catalogs, and training references are behind the Blacklight corporate login route.</p>
        <div class="bli-actions">
          <button id="blacklight-corporate-login" class="bli-action primary" type="button">Run Corporate Login</button>
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

  function ensureBrowser(view) {
    let browser = view.querySelector('#blacklight-browser');
    if (browser) return browser;
    browser = document.createElement('section');
    browser.id = 'blacklight-browser';
    browser.className = 'blacklight-browser no-print';
    browser.hidden = true;
    view.appendChild(browser);
    return browser;
  }

  function lockBrowser(view) {
    if (loginInProgress) return;
    const browser = ensureBrowser(view);
    if (browser.dataset.blacklightLoginActive === 'true') return;
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
    if (!view || loginInProgress) return;
    const browser = ensureBrowser(view);

    loginInProgress = true;
    browser.hidden = false;
    browser.dataset.blacklightLoginActive = 'true';
    browser.innerHTML = '<p class="helper-note">Loading Blacklight corporate login…</p>';
    browser.scrollIntoView({ behavior: 'smooth', block: 'start' });

    try {
      await ensureLoginGateScript();
      const gate = window.BlacklightWikiLoginGate;
      if (gate?.runGate) {
        await gate.runGate(browser, { force: true });
      } else {
        try { sessionStorage.setItem(LOGIN_STORAGE_KEY, 'true'); } catch (_) {}
      }
      delete browser.dataset.blacklightLoginActive;
      window.location.href = corporateAccessUrl();
    } catch (error) {
      loginInProgress = false;
      delete browser.dataset.blacklightLoginActive;
      browser.hidden = false;
      browser.innerHTML = '<p class="helper-note">Corporate login failed to initialize. Refresh and try again.</p>';
      throw error;
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
