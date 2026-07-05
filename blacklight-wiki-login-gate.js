(() => {
  'use strict';

  const STORAGE_KEY = 'blacklight-wiki-stage-gate-complete';
  let sequencePromise = null;

  function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  function isUnlocked() {
    try {
      return sessionStorage.getItem(STORAGE_KEY) === 'true';
    } catch (_) {
      return false;
    }
  }

  function markUnlocked() {
    try {
      sessionStorage.setItem(STORAGE_KEY, 'true');
    } catch (_) {
      // Session storage is only a convenience for this fictional interface.
    }
  }

  function injectGateStyles() {
    if (document.getElementById('blacklight-wiki-login-gate-style')) return;
    const style = document.createElement('style');
    style.id = 'blacklight-wiki-login-gate-style';
    style.textContent = `
      .blacklight-login-gate{position:relative;overflow:hidden;border:1px solid rgba(121,242,255,.32);border-radius:22px;background:radial-gradient(circle at top left,rgba(121,242,255,.13),transparent 24rem),radial-gradient(circle at bottom right,rgba(200,138,53,.10),transparent 26rem),linear-gradient(180deg,rgba(5,8,14,.96),rgba(3,5,10,.98));padding:24px;min-height:420px;box-shadow:inset 0 0 40px rgba(121,242,255,.05)}
      .blacklight-login-gate::before{content:"";position:absolute;inset:0;background-image:linear-gradient(rgba(121,242,255,.05) 1px,transparent 1px),linear-gradient(90deg,rgba(121,242,255,.05) 1px,transparent 1px);background-size:24px 24px;mask-image:linear-gradient(180deg,rgba(0,0,0,.8),rgba(0,0,0,.2));pointer-events:none}
      .blacklight-login-gate::after{content:"";position:absolute;inset:-40% 0 auto 0;height:40%;background:linear-gradient(180deg,transparent,rgba(121,242,255,.12),transparent);animation:blacklightLoginScan 3.4s linear infinite;pointer-events:none}
      @keyframes blacklightLoginScan{from{transform:translateY(-20%)}to{transform:translateY(260%)}}
      .blacklight-login-shell{position:relative;z-index:1;width:min(720px,100%);margin:0 auto}.blacklight-login-kicker{color:var(--accent);font-size:.78rem;font-weight:800;text-transform:uppercase;letter-spacing:.14em;margin-bottom:10px}.blacklight-login-title{font-size:clamp(1.8rem,4vw,3rem);line-height:1;margin:0 0 12px}.blacklight-login-subtitle{color:var(--muted);margin:0 0 20px;line-height:1.6}.blacklight-login-panel{border:1px solid rgba(121,242,255,.22);border-radius:18px;background:rgba(255,255,255,.03);padding:18px;backdrop-filter:blur(8px)}
      .blacklight-login-fields{display:grid;gap:12px;margin-bottom:16px}.blacklight-login-field{display:grid;gap:6px}.blacklight-login-field label{font-size:.78rem;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--corp-cyan,#79f2ff)}.blacklight-login-field input{width:100%;box-sizing:border-box;background:#0c1119;border:1px solid rgba(121,242,255,.18);color:var(--ink);border-radius:12px;padding:12px 14px;font-family:ui-monospace,SFMono-Regular,Consolas,monospace;letter-spacing:.08em}
      .blacklight-login-status{border:1px solid var(--line);border-radius:14px;padding:12px 14px;background:rgba(255,255,255,.025);color:var(--muted);min-height:48px;white-space:pre-line}.blacklight-login-progress{margin-top:14px;height:10px;border-radius:999px;background:rgba(255,255,255,.06);overflow:hidden;border:1px solid rgba(121,242,255,.12)}.blacklight-login-progress span{display:block;height:100%;width:0%;background:linear-gradient(90deg,rgba(121,242,255,.55),rgba(200,138,53,.65));box-shadow:0 0 14px rgba(121,242,255,.35);transition:width .35s ease}.blacklight-login-message{margin-top:16px;padding:14px;border-left:3px solid rgba(121,242,255,.8);background:rgba(121,242,255,.08);color:var(--ink);min-height:52px;opacity:0;transform:translateY(6px);transition:opacity .35s ease,transform .35s ease;white-space:pre-line}.blacklight-login-message.visible{opacity:1;transform:translateY(0)}.blacklight-login-footer{margin-top:14px;font-size:.82rem;color:var(--muted)}
    `;
    document.head.appendChild(style);
  }

  async function typeValue(input, text, speed) {
    input.value = '';
    for (const character of text) {
      input.value += character;
      await delay(speed);
    }
  }

  async function typeText(node, text, speed) {
    node.textContent = '';
    for (const character of text) {
      node.textContent += character;
      await delay(speed);
    }
  }

  async function runGate(browser, options = {}) {
    if (isUnlocked() && !options.force) return;
    if (sequencePromise) return sequencePromise;

    sequencePromise = (async () => {
      injectGateStyles();
      browser.hidden = false;
      browser.innerHTML = `
        <section class="blacklight-login-gate" aria-label="Black Light Industries information database login">
          <div class="blacklight-login-shell">
            <div class="blacklight-login-kicker">Black Light Industries secure archive</div>
            <h2 class="blacklight-login-title">Information Database Login</h2>
            <p class="blacklight-login-subtitle">Internal records interface. Cached operator route detected. Stand by while the access fields populate.</p>
            <div class="blacklight-login-panel">
              <div class="blacklight-login-fields">
                <div class="blacklight-login-field"><label for="blacklight-login-user">Username</label><input id="blacklight-login-user" type="text" readonly value=""></div>
                <div class="blacklight-login-field"><label for="blacklight-login-pass">Password</label><input id="blacklight-login-pass" type="text" readonly value=""></div>
              </div>
              <div id="blacklight-login-status" class="blacklight-login-status">Standing by…</div>
              <div class="blacklight-login-progress"><span id="blacklight-login-progress-bar"></span></div>
              <div id="blacklight-login-message" class="blacklight-login-message"></div>
              <div class="blacklight-login-footer">Archive route: <strong>BLACKLIGHT.CONTINUUM.INTERNAL</strong></div>
            </div>
          </div>
        </section>`;

      const user = browser.querySelector('#blacklight-login-user');
      const pass = browser.querySelector('#blacklight-login-pass');
      const status = browser.querySelector('#blacklight-login-status');
      const bar = browser.querySelector('#blacklight-login-progress-bar');
      const message = browser.querySelector('#blacklight-login-message');
      const progress = value => { if (bar) bar.style.width = `${value}%`; };

      status.textContent = 'Locating cached operator route…';
      progress(8);
      await delay(450);
      await typeValue(user, 'C0-ARCHIVE-OPERATOR', 32);
      status.textContent = 'Username field populated.\nClearance route: C-0 / Corporate Baseline.';
      progress(30);
      await delay(350);
      await typeValue(pass, 'charles//handled', 38);
      status.textContent = 'Password field populated.\nPreparing fictional archive handoff.';
      progress(52);
      await delay(450);
      status.textContent = 'Routing to Black Light Industries information database…';
      progress(70);
      await delay(650);
      status.textContent = 'Archive route accepted.\nPreparing internal records interface…';
      progress(100);
      await delay(500);
      message.classList.add('visible');
      await typeText(message, "I see you. I'll handle this.\n— Charles", 26);
      await delay(950);

      markUnlocked();
      sequencePromise = null;
    })();

    return sequencePromise;
  }

  window.BlacklightWikiLoginGate = Object.freeze({ runGate, isUnlocked, markUnlocked });

  function shouldGateClick(event) {
    if (isUnlocked()) return null;
    const workspace = document.getElementById('blacklight-continuum');
    if (!workspace) return null;
    const button = event.target.closest?.('button');
    if (!button || !workspace.contains(button)) return null;
    if (button.dataset.blacklightGateReplay === 'true') return null;
    if (button.closest('#blacklight-browser')) return null;
    return button;
  }

  document.addEventListener('click', event => {
    const button = shouldGateClick(event);
    if (!button) return;
    const browser = document.getElementById('blacklight-browser');
    if (!browser) return;

    event.preventDefault();
    event.stopImmediatePropagation();

    browser.hidden = false;
    browser.scrollIntoView({ behavior: 'smooth', block: 'start' });
    void runGate(browser).then(() => {
      button.dataset.blacklightGateReplay = 'true';
      button.click();
      delete button.dataset.blacklightGateReplay;
    });
  }, true);
})();
