(() => {
  'use strict';

  const STORAGE_KEY = 'blacklight-tiered-access-level';
  const ORDER = ['public', 'white', 'blue', 'green', 'black'];
  const LEVELS = {
    public: {
      label: 'Level 0 / Public Corporate',
      short: 'Public',
      heading: 'Public-facing corporate information',
      description: 'Public relations, product positioning, leadership visibility, visitor-safe corporate communications, and general Blacklight Intelligence information.',
      button: 'Public View',
      requirements: []
    },
    white: {
      label: 'Level 1 / White Card Employee',
      short: 'White',
      heading: 'Employee baseline and ordinary internal systems',
      description: 'Standard employee access for basic internal routing, general personnel tools, common support references, and ordinary workplace systems.',
      button: 'Authenticate White Card',
      requirements: ['Username', 'Password']
    },
    blue: {
      label: 'Level 2 / Blue Card Corporate Client',
      short: 'Blue',
      heading: 'Corporate client operations and security protocols',
      description: 'Client operations, secure deployment references, assignment generators, contract-sensitive records, product behavior concerns, and baseline security procedures.',
      button: 'Authenticate Blue Card',
      requirements: ['Username', 'Password', 'Security card tap', 'PIN']
    },
    green: {
      label: 'Level 3 / Green Card Restricted Support',
      short: 'Green',
      heading: 'Restricted support infrastructure',
      description: 'Facilities, restricted IT, logistics, emergency support, sealed work orders, Green task fragments, and support-visible Black-area maintenance boundaries.',
      button: 'Authenticate Green Card',
      requirements: ['Username', 'Password', 'Security card tap', 'PIN', 'Fingerprint imprint', 'Route authorization']
    },
    black: {
      label: 'Level 4 / Black Card Archive',
      short: 'Black',
      heading: 'Black Archive, supernatural records, and operational truth',
      description: 'Black-level operational archives, supernatural court records, vampire and fae material, entity catalogs, relic and containment records, Charles-sealed interpretation, and direct Blacklight hidden-system files.',
      button: 'Authenticate Black Card',
      requirements: ['Username', 'Password', 'Security card tap', 'PIN', 'Fingerprint imprint', 'Retinal scan', 'Voiceprint', 'Charles review', 'Board-sealed archive acknowledgement']
    }
  };

  const RULES = [
    { level: 'black', match: ['court', 'vampiric', 'vampire', 'fae', 'gaian', 'spirit', 'entity catalog', 'thing in the room', 'relic', 'supernatural', 'containment', 'black archive', 'internal archive', 'charles-tier'] },
    { level: 'green', match: ['facility', 'facilities', 'emergency', 'equipment', 'armor', 'arms', 'field technology', 'combat', 'soak', 'social conflict', 'training', 'support'] },
    { level: 'blue', match: ['mission', 'assignment', 'client', 'contract', 'npc', 'generator', 'operative record', 'character sheet', 'person we are sending', 'reorientation', 'continuity', 'induction'] },
    { level: 'white', match: ['personnel', 'hr', 'employee', 'corporate standards', 'directory'] }
  ];

  function currentLevel() {
    try {
      return sessionStorage.getItem(STORAGE_KEY) || 'public';
    } catch (_) {
      return 'public';
    }
  }

  function setLevel(level) {
    try { sessionStorage.setItem(STORAGE_KEY, level); } catch (_) {}
    document.dispatchEvent(new CustomEvent('blacklight:access-level-changed', { detail: { level } }));
  }

  function rank(level) {
    return ORDER.indexOf(level);
  }

  function canAccess(level) {
    return rank(currentLevel()) >= rank(level);
  }

  function classifyText(text) {
    const value = String(text || '').toLowerCase();
    for (const rule of RULES) {
      if (rule.match.some(term => value.includes(term))) return rule.level;
    }
    return 'white';
  }

  function cardText(card) {
    return [card.textContent, ...Array.from(card.querySelectorAll('a')).map(link => link.getAttribute('href') || '')].join(' ');
  }

  function systemsRoot() {
    return document.querySelector('#blacklight-systems-sublevel-body #blacklight-corporate-systems')
      || document.querySelector('#blacklight-systems-sublevel-body #systems')
      || document.querySelector('#blacklight-corporate-systems')
      || document.querySelector('body.blacklight-corp-body #systems');
  }

  function ensureStyles() {
    if (document.getElementById('blacklight-tiered-access-style')) return;
    const style = document.createElement('style');
    style.id = 'blacklight-tiered-access-style';
    style.textContent = `
      .blacklight-access-console{border:1px solid rgba(217,168,79,.38);border-radius:22px;padding:18px;margin:0 0 20px;background:linear-gradient(145deg,rgba(217,168,79,.12),rgba(255,255,255,.025)),rgba(5,6,9,.78);box-shadow:0 18px 60px rgba(0,0,0,.28)}
      .blacklight-access-console h3{margin:.25rem 0 .5rem}.blacklight-access-console p{color:var(--bli-muted,var(--muted));line-height:1.55}.blacklight-access-current{display:inline-flex;align-items:center;border:1px solid rgba(217,168,79,.48);border-radius:999px;padding:6px 10px;background:rgba(217,168,79,.12);font-weight:900;color:var(--bli-ink,var(--ink));margin:.4rem 0 1rem}
      .blacklight-access-levels{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:10px}.blacklight-access-level-card{border:1px solid rgba(255,255,255,.12);border-radius:16px;padding:12px;background:rgba(255,255,255,.035)}.blacklight-access-level-card.active{border-color:rgba(217,168,79,.75);background:rgba(217,168,79,.10)}
      .blacklight-access-level-card h4{margin:0 0 .35rem}.blacklight-access-level-card ul{margin:.5rem 0 .75rem;padding-left:1.1rem;color:var(--bli-muted,var(--muted));font-size:.86rem}.blacklight-access-level-card li{margin:.2rem 0}.blacklight-access-level-card button{border:1px solid rgba(217,168,79,.44);border-radius:999px;background:rgba(217,168,79,.16);color:var(--bli-ink,var(--ink));font-weight:900;padding:8px 10px;cursor:pointer}
      .blacklight-tier-section{border:1px solid rgba(217,168,79,.22);border-radius:20px;padding:16px;margin:14px 0;background:rgba(255,255,255,.018)}.blacklight-tier-section.locked{filter:saturate(.55);opacity:.82}.blacklight-tier-section h3{margin:.2rem 0 .4rem}.blacklight-tier-section>p{color:var(--bli-muted,var(--muted));line-height:1.55;margin-top:0}.blacklight-tier-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:14px}.blacklight-lock-card{border:1px dashed rgba(217,168,79,.35);border-radius:16px;padding:14px;background:rgba(0,0,0,.22);color:var(--bli-muted,var(--muted))}.blacklight-lock-card strong{color:var(--bli-ink,var(--ink));display:block;margin-bottom:.4rem}
      .blacklight-access-card-lock{margin-top:10px;border-left:3px solid rgba(217,168,79,.7);padding:9px 10px;background:rgba(217,168,79,.08);color:var(--bli-muted,var(--muted));font-size:.86rem}.blacklight-access-auth-overlay{position:fixed;inset:0;z-index:10000;display:grid;place-items:center;background:rgba(0,0,0,.76);backdrop-filter:blur(10px);padding:18px}.blacklight-access-auth-box{width:min(680px,100%);border:1px solid rgba(217,168,79,.5);border-radius:24px;background:radial-gradient(circle at top left,rgba(217,168,79,.16),transparent 22rem),linear-gradient(180deg,rgba(11,12,15,.98),rgba(3,4,7,.98));box-shadow:0 28px 90px rgba(0,0,0,.65);padding:22px}.blacklight-access-auth-box h3{margin:.1rem 0 .5rem}.blacklight-access-auth-status{border:1px solid rgba(255,255,255,.13);border-radius:14px;background:rgba(255,255,255,.035);padding:12px;min-height:72px;white-space:pre-line;color:var(--bli-muted,var(--muted))}.blacklight-access-progress{height:10px;border-radius:999px;background:rgba(255,255,255,.08);overflow:hidden;margin:14px 0;border:1px solid rgba(217,168,79,.22)}.blacklight-access-progress span{display:block;width:0%;height:100%;background:linear-gradient(90deg,rgba(217,168,79,.72),rgba(121,242,255,.62));transition:width .35s ease}.blacklight-access-auth-actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:14px}.blacklight-access-auth-actions button{border:1px solid rgba(217,168,79,.44);border-radius:999px;background:rgba(217,168,79,.15);color:var(--bli-ink,var(--ink));font-weight:900;padding:9px 12px;cursor:pointer}
    `;
    document.head.appendChild(style);
  }

  function makeConsole() {
    const console = document.createElement('section');
    console.className = 'blacklight-access-console';
    console.dataset.blacklightAccessConsole = 'true';
    console.innerHTML = `
      <p class="bli-eyebrow">Nested clearance console</p>
      <h3>Blacklight tiered access route</h3>
      <p>Begin at Level 0 public corporate information, then authenticate deeper into employee, client, restricted support, and Black Archive records. Supernatural, court, vampire, fae, relic, and entity records remain locked behind Black Card access.</p>
      <div class="blacklight-access-current" data-blacklight-current-access></div>
      <div class="blacklight-access-levels">
        ${ORDER.map(level => `<article class="blacklight-access-level-card" data-blacklight-level-card="${level}"><h4>${LEVELS[level].label}</h4><p>${LEVELS[level].description}</p><ul>${LEVELS[level].requirements.map(req => `<li>${req}</li>`).join('') || '<li>No login required</li>'}</ul>${level === 'public' ? '<button type="button" data-blacklight-auth-level="public">Return to Public</button>' : `<button type="button" data-blacklight-auth-level="${level}">${LEVELS[level].button}</button>`}</article>`).join('')}
      </div>`;
    console.querySelectorAll('[data-blacklight-auth-level]').forEach(button => {
      button.addEventListener('click', () => authenticate(button.dataset.blacklightAuthLevel));
    });
    return console;
  }

  function makeTierSection(level) {
    const section = document.createElement('section');
    section.className = 'blacklight-tier-section';
    section.dataset.blacklightTierSection = level;
    section.innerHTML = `<h3>${LEVELS[level].heading}</h3><p>${LEVELS[level].description}</p><div class="blacklight-tier-grid" data-blacklight-tier-grid="${level}"></div>`;
    return section;
  }

  function preserveOriginalHeader(root) {
    const header = root.querySelector(':scope > .bli-section-head');
    if (header) header.hidden = true;
  }

  function organizeCards() {
    const root = systemsRoot();
    if (!root || root.dataset.blacklightTiered === 'true') return;
    ensureStyles();
    preserveOriginalHeader(root);
    root.dataset.blacklightTiered = 'true';

    const originalGrids = Array.from(root.querySelectorAll(':scope > .module-grid, :scope > .bli-card-grid'));
    const cards = originalGrids.flatMap(grid => Array.from(grid.children).filter(child => child.matches('article, .module-card, .bli-card')));
    originalGrids.forEach(grid => grid.remove());

    const console = makeConsole();
    root.appendChild(console);

    const tierSections = new Map();
    ORDER.forEach(level => {
      const section = makeTierSection(level);
      tierSections.set(level, section);
      root.appendChild(section);
    });

    cards.forEach(card => {
      const level = classifyText(cardText(card));
      card.dataset.blacklightRequiredLevel = level;
      const grid = tierSections.get(level).querySelector('[data-blacklight-tier-grid]');
      grid.appendChild(card);
    });

    ORDER.forEach(level => {
      const grid = tierSections.get(level).querySelector('[data-blacklight-tier-grid]');
      if (!grid.children.length) {
        const empty = document.createElement('div');
        empty.className = 'blacklight-lock-card';
        empty.innerHTML = `<strong>No records currently assigned.</strong> This clearance band is reserved for future Blacklight routing.`;
        grid.appendChild(empty);
      }
    });

    updateAccessVisibility();
  }

  function updateAccessVisibility() {
    const level = currentLevel();
    document.querySelectorAll('[data-blacklight-current-access]').forEach(node => { node.textContent = `Current access: ${LEVELS[level].label}`; });
    document.querySelectorAll('[data-blacklight-level-card]').forEach(card => card.classList.toggle('active', card.dataset.blacklightLevelCard === level));
    document.querySelectorAll('[data-blacklight-tier-section]').forEach(section => {
      const required = section.dataset.blacklightTierSection;
      const allowed = canAccess(required);
      section.classList.toggle('locked', !allowed);
      section.querySelectorAll('article').forEach(card => lockCard(card, required, allowed));
    });
  }

  function lockCard(card, level, allowed) {
    const existing = card.querySelector(':scope > .blacklight-access-card-lock');
    card.querySelectorAll('a, button').forEach(control => {
      if (control.closest('.blacklight-access-card-lock')) return;
      control.disabled = !allowed && control.tagName === 'BUTTON';
      if (!allowed && control.tagName === 'A') {
        control.dataset.originalHref ||= control.getAttribute('href') || '';
        control.removeAttribute('href');
      } else if (allowed && control.tagName === 'A' && control.dataset.originalHref) {
        control.setAttribute('href', control.dataset.originalHref);
      }
    });
    if (!allowed && !existing) {
      const lock = document.createElement('div');
      lock.className = 'blacklight-access-card-lock';
      lock.innerHTML = `Locked. ${LEVELS[level].label} required.`;
      card.appendChild(lock);
    }
    if (allowed && existing) existing.remove();
  }

  function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async function authenticate(level) {
    if (level === 'public') {
      setLevel('public');
      updateAccessVisibility();
      return;
    }
    ensureStyles();
    const overlay = document.createElement('div');
    overlay.className = 'blacklight-access-auth-overlay';
    overlay.innerHTML = `
      <div class="blacklight-access-auth-box" role="dialog" aria-modal="true">
        <p class="bli-eyebrow">${LEVELS[level].label}</p>
        <h3>${LEVELS[level].button}</h3>
        <p>${LEVELS[level].description}</p>
        <div class="blacklight-access-auth-status" data-blacklight-auth-status>Standing by…</div>
        <div class="blacklight-access-progress"><span data-blacklight-auth-progress></span></div>
        <div class="blacklight-access-auth-actions"><button type="button" data-blacklight-auth-cancel>Cancel</button></div>
      </div>`;
    document.body.appendChild(overlay);
    const status = overlay.querySelector('[data-blacklight-auth-status]');
    const bar = overlay.querySelector('[data-blacklight-auth-progress]');
    let cancelled = false;
    overlay.querySelector('[data-blacklight-auth-cancel]').addEventListener('click', () => { cancelled = true; overlay.remove(); });

    const steps = stepsFor(level);
    for (let index = 0; index < steps.length; index += 1) {
      if (cancelled) return;
      status.textContent = steps[index];
      bar.style.width = `${Math.round(((index + 1) / steps.length) * 100)}%`;
      await delay(level === 'black' ? 650 : level === 'green' ? 520 : 430);
    }
    if (cancelled) return;
    setLevel(level);
    status.textContent = `${LEVELS[level].label} accepted.\nRouting permissions into authorized systems directory.`;
    await delay(650);
    overlay.remove();
    updateAccessVisibility();
  }

  function stepsFor(level) {
    const common = ['Username accepted.', 'Password accepted.'];
    if (level === 'white') return common.concat(['White Card baseline session opened.']);
    if (level === 'blue') return common.concat(['Security card reader contact confirmed.', 'PIN accepted.', 'Blue Card corporate-client session opened.']);
    if (level === 'green') return common.concat(['Security card reader contact confirmed.', 'PIN accepted.', 'Fingerprint imprint matched.', 'Green support route authorization checked.', 'Green Card restricted-support session opened.']);
    return common.concat(['Security card reader contact confirmed.', 'PIN accepted.', 'Fingerprint imprint matched.', 'Retinal scan matched.', 'Voiceprint matched.', 'Charles review in progress.', 'Board-sealed archive acknowledgement accepted.', 'Black Card archive session opened.']);
  }

  function install() {
    organizeCards();
    updateAccessVisibility();
  }

  document.addEventListener('blacklight:access-level-changed', updateAccessVisibility);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, { once: true });
  else install();
  const observer = new MutationObserver(install);
  observer.observe(document.documentElement, { childList: true, subtree: true });
})();
