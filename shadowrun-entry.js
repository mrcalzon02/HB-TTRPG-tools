(() => {
  'use strict';

  const VIEW_ID = 'shadowrun';
  const modules = [
    ['generators','Sprawl, District, and Neighborhood Generator','Create a metro sprawl, district identity, security tier, communities, corporate footprint, gangs, magical character, and street conflicts.'],
    ['generators','Shadowrun Mission and Complication Generator','Build a complete run with employer, objective, target, opposition, hidden truth, legwork routes, complications, payment, and fallout.'],
    ['generators','Mr. Johnson and Employer Generator','Create an employer persona, public identity, real sponsor, negotiation posture, withheld information, leverage, and betrayal risk.'],
    ['tools','Fixer and Contact Network Editor','Track contacts, loyalty, connection, specialties, neighborhoods, favors, availability, and evolving risk.'],
    ['generators','Runner Team and Specialist NPC Generator','Create allied or rival runners with archetypes, capabilities, signature gear, reputations, motives, and tensions.'],
    ['generators','Megacorporation, Syndicate, and Faction Generator','Create a corporate division or faction, public business, hidden program, resources, rivals, local assets, and deniable operations.'],
    ['tools','Facility, Security, and Response Planner','Design physical, Matrix, magical, social, and emergency security layers with escalation procedures and exploitable gaps.'],
    ['generators','Matrix Host and Network Topology Generator','Create host purpose, architecture, personas, files, patrol patterns, IC posture, spiders, alarms, and offline dependencies.'],
    ['tools','Legwork, Lead, and Evidence Board','Organize sources, questions, facts, confidence, misinformation, costs, burned contacts, and remaining approaches.'],
    ['generators','Gear, Vendor, and Black-Market Generator','Create vendors, stock, availability, price pressure, counterfeit risk, strings attached, attention, and delivery complications.'],
    ['tools','Vehicle, Drone, and Rigger Garage Planner','Track vehicles, drones, software, modifications, maintenance, damage, ammunition, storage, licenses, and readiness.'],
    ['generators','Astral Site, Magical Threat, and Ritual Generator','Create magical locations, background conditions, spirits, wards, practitioners, rituals, astral hazards, and material consequences.'],
    ['generators','Chase, Heat, and Pursuit Generator','Build pursuit across physical or Matrix spaces with pursuers, routes, obstacles, escalation, collateral damage, and escape conditions.'],
    ['generators','Street Rumor, Newsfeed, and Data Leak Generator','Produce street rumors, corporate news, leaked documents, gang chatter, propaganda, and hidden signals.'],
    ['campaign','Lifestyle, Downtime, and Recovery Manager','Track living costs, healing, repair, training, contact maintenance, side jobs, legal trouble, and personal consequences.'],
    ['campaign','Campaign Clocks and Consequence Dashboard','Track corporate retaliation, police heat, gang hostility, contact strain, media exposure, magical fallout, and team debt.'],
    ['reference','Edition and House-Rule Profile','Record selected edition, terminology, dice assumptions, Matrix model, magic options, availability rules, and house conversions.'],
    ['campaign','Run Archive and After-Action Report','Store objectives, timeline, evidence, expenditures, injuries, payments, betrayals, unresolved threads, and reputation changes.'],
    ['tools','Binary Cube Encryption Laboratory','Develop and test a binary face-projection permutation using a keyed 3D point field, reversible cube orientation, padding, data-entry masks, diagnostics, and exportable key packages.','shadowrun-binary-cube-encryption','prototype']
  ];
  let active = 'all';
  let cubeToolPromise = null;
  const loadedCubeScripts = new Map();
  const esc = value => String(value ?? '').replace(/[&<>"']/g, character => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]));
  const title = value => String(value).replace(/^./, character => character.toUpperCase());

  function style() {
    if (document.getElementById('setting-workspace-shared-style')) return;
    const node = document.createElement('style');
    node.id = 'setting-workspace-shared-style';
    node.textContent = '.setting-workspace-controls{display:grid;gap:12px;margin:18px 0}.setting-tab-row{display:flex;flex-wrap:wrap;gap:8px}.setting-tab{border:1px solid var(--line);border-radius:999px;padding:8px 12px;background:#ffffff08;color:var(--muted);font-weight:700}.setting-tab.active,.setting-tab:hover{border-color:var(--accent);color:var(--ink)}.setting-module-count{color:var(--muted);margin:8px 0 14px}.shadowrun-module-action{margin-top:12px}';
    document.head.appendChild(node);
  }

  function switchView() {
    document.querySelectorAll('.view').forEach(view => view.classList.toggle('active', view.id === VIEW_ID));
    document.querySelectorAll('.nav-button').forEach(button => button.classList.toggle('active', button.dataset.view === VIEW_ID));
  }

  function bind() {
    document.querySelectorAll(`[data-view="${VIEW_ID}"]`).forEach(button => {
      if (button.dataset.shadowrunBound) return;
      button.dataset.shadowrunBound = 'true';
      button.addEventListener('click', event => { event.preventDefault(); switchView(); });
    });
  }

  function navigation() {
    const nav = document.querySelector('.top-nav');
    if (nav && !nav.querySelector(`[data-view="${VIEW_ID}"]`)) {
      const button = document.createElement('button');
      button.className = 'nav-button';
      button.dataset.view = VIEW_ID;
      button.textContent = 'Shadowrun';
      nav.appendChild(button);
    }
    const menu = document.querySelector('#tools .menu-grid');
    if (menu && !menu.querySelector('[data-shadowrun-card]')) {
      const card = document.createElement('article');
      card.className = 'menu-card';
      card.dataset.shadowrunCard = 'true';
      card.innerHTML = '<h3>Shadowrun Workspace</h3><p>Sprawls, runs, Johnsons, contacts, Matrix hosts, facilities, magic, equipment, heat, downtime, and campaign consequences.</p><button class="link-button" data-view="shadowrun">Open Shadowrun</button>';
      menu.appendChild(card);
    }
    bind();
  }

  function loadCubeScript(src) {
    if (loadedCubeScripts.has(src)) return loadedCubeScripts.get(src);
    const promise = new Promise((resolve, reject) => {
      const existing = [...document.scripts].find(script => (script.getAttribute('src') || '').split('?')[0].endsWith(src));
      if (existing?.dataset.shadowrunCubeLoaded === 'true') return resolve();
      const script = existing || document.createElement('script');
      script.addEventListener('load', () => {
        script.dataset.shadowrunCubeLoaded = 'true';
        resolve();
      }, { once: true });
      script.addEventListener('error', () => reject(new Error(`${src} could not be loaded.`)), { once: true });
      if (!existing) {
        script.src = src;
        script.async = false;
        script.dataset.shadowrunCubeTool = 'true';
        document.body.appendChild(script);
      }
    });
    loadedCubeScripts.set(src, promise);
    promise.catch(() => loadedCubeScripts.delete(src));
    return promise;
  }

  function loadCubeTool() {
    if (window.ShadowrunBinaryCubeEngine && window.ShadowrunBinaryCubeEncryption) return Promise.resolve(window.ShadowrunBinaryCubeEncryption);
    if (cubeToolPromise) return cubeToolPromise;
    cubeToolPromise = (async () => {
      await loadCubeScript('shadowrun-binary-cube-engine.js');
      if (!window.ShadowrunBinaryCubeEngine) throw new Error('The Binary Cube engine loaded without exposing its API.');
      await loadCubeScript('shadowrun-binary-cube-encryption.js');
      if (!window.ShadowrunBinaryCubeEncryption) throw new Error('The Binary Cube laboratory loaded without exposing its interface.');
      return window.ShadowrunBinaryCubeEncryption;
    })();
    cubeToolPromise.catch(() => { cubeToolPromise = null; });
    return cubeToolPromise;
  }

  async function openTool(button) {
    button.disabled = true;
    button.setAttribute('aria-busy', 'true');
    const original = button.textContent;
    button.textContent = 'Loading Laboratory…';
    try {
      const api = await loadCubeTool();
      if (!api?.openPanel) throw new Error('The Binary Cube Encryption Laboratory loaded without an open-panel interface.');
      api.openPanel();
    } catch (error) {
      alert(error.message);
    } finally {
      button.disabled = false;
      button.removeAttribute('aria-busy');
      button.textContent = original;
    }
  }

  function build() {
    const main = document.querySelector('main');
    if (!main || document.getElementById(VIEW_ID)) return;
    const section = document.createElement('section');
    section.id = VIEW_ID;
    section.className = 'view';
    section.innerHTML = '<div class="hero-card no-print"><p class="eyebrow">Shadowrun campaign workspace</p><h2>Sprawl Operations and Run Planning Dashboard</h2><p>An edition-flexible predictive-support registry for locations, missions, contacts, corporations, security, the Matrix, magic, gear, pursuits, downtime, and long-term consequences.</p><p class="helper-note">Unofficial fan planning workspace; not affiliated with or endorsed by the rights holders.</p></div><div class="setting-workspace-controls no-print"><label class="control-label">Search Shadowrun modules</label><input id="shadowrun-search" class="tool-input" type="search"><div id="shadowrun-tabs" class="setting-tab-row"></div></div><p id="shadowrun-count" class="setting-module-count no-print"></p><div id="shadowrun-grid" class="module-grid no-print"></div>';
    main.appendChild(section);
    section.querySelector('#shadowrun-search').addEventListener('input', render);
    section.querySelector('#shadowrun-grid').addEventListener('click', event => {
      const button = event.target.closest('[data-shadowrun-open="shadowrun-binary-cube-encryption"]');
      if (button) void openTool(button);
    });
    tabs(); render(); bind();
  }

  function tabs() {
    const target = document.getElementById('shadowrun-tabs');
    if (!target) return;
    target.innerHTML = '';
    [['all','All Modules'],['generators','Generators'],['tools','Tools'],['campaign','Campaign'],['reference','Reference']].forEach(([id,label]) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `setting-tab ${active === id ? 'active' : ''}`;
      button.textContent = label;
      button.addEventListener('click', () => { active = id; tabs(); render(); });
      target.appendChild(button);
    });
  }

  function render() {
    const grid = document.getElementById('shadowrun-grid');
    if (!grid) return;
    const query = (document.getElementById('shadowrun-search')?.value || '').toLowerCase();
    const visible = modules.filter(module => (active === 'all' || module[0] === active) && module.join(' ').toLowerCase().includes(query));
    grid.innerHTML = visible.map((module,index) => {
      const status = module[4] || 'planned';
      const action = module[3] ? `<button type="button" class="link-button shadowrun-module-action" data-shadowrun-open="${esc(module[3])}">Open Laboratory</button>` : '';
      return `<article class="module-card"${module[3] ? ` data-shadowrun-module="${esc(module[3])}"` : ''}><div class="module-meta"><span class="badge section-${esc(module[0])}">${esc(title(module[0]))}</span><span class="badge status-${esc(status)}">${esc(title(status))}</span><span class="badge">priority ${index + 1}</span></div><h3>${esc(module[1])}</h3><p>${esc(module[2])}</p>${action}</article>`;
    }).join('') || '<div class="module-empty">No Shadowrun modules match the current filter.</div>';
    document.getElementById('shadowrun-count').textContent = `${visible.length} of ${modules.length} modules shown.`;
  }

  function init() { style(); navigation(); build(); navigation(); }
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', init) : init();
})();
