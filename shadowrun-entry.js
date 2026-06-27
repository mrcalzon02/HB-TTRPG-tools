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
    ['campaign','Run Archive and After-Action Report','Store objectives, timeline, evidence, expenditures, injuries, payments, betrayals, unresolved threads, and reputation changes.']
  ];
  let active = 'all';
  const esc = value => String(value ?? '').replace(/[&<>"']/g, character => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]));
  const title = value => String(value).replace(/^./, character => character.toUpperCase());

  function style() {
    if (document.getElementById('setting-workspace-shared-style')) return;
    const node = document.createElement('style');
    node.id = 'setting-workspace-shared-style';
    node.textContent = '.setting-workspace-controls{display:grid;gap:12px;margin:18px 0}.setting-tab-row{display:flex;flex-wrap:wrap;gap:8px}.setting-tab{border:1px solid var(--line);border-radius:999px;padding:8px 12px;background:#ffffff08;color:var(--muted);font-weight:700}.setting-tab.active,.setting-tab:hover{border-color:var(--accent);color:var(--ink)}.setting-module-count{color:var(--muted);margin:8px 0 14px}';
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

  function build() {
    const main = document.querySelector('main');
    if (!main || document.getElementById(VIEW_ID)) return;
    const section = document.createElement('section');
    section.id = VIEW_ID;
    section.className = 'view';
    section.innerHTML = '<div class="hero-card no-print"><p class="eyebrow">Shadowrun campaign workspace</p><h2>Sprawl Operations and Run Planning Dashboard</h2><p>An edition-flexible predictive-support registry for locations, missions, contacts, corporations, security, the Matrix, magic, gear, pursuits, downtime, and long-term consequences.</p><p class="helper-note">Unofficial fan planning workspace; not affiliated with or endorsed by the rights holders.</p></div><div class="setting-workspace-controls no-print"><label class="control-label">Search Shadowrun modules</label><input id="shadowrun-search" class="tool-input" type="search"><div id="shadowrun-tabs" class="setting-tab-row"></div></div><p id="shadowrun-count" class="setting-module-count no-print"></p><div id="shadowrun-grid" class="module-grid no-print"></div>';
    main.appendChild(section);
    section.querySelector('#shadowrun-search').addEventListener('input', render);
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
    grid.innerHTML = visible.map((module,index) => `<article class="module-card"><div class="module-meta"><span class="badge section-${esc(module[0])}">${esc(title(module[0]))}</span><span class="badge status-planned">Planned</span><span class="badge">priority ${index + 1}</span></div><h3>${esc(module[1])}</h3><p>${esc(module[2])}</p></article>`).join('') || '<div class="module-empty">No Shadowrun modules match the current filter.</div>';
    document.getElementById('shadowrun-count').textContent = `${visible.length} of ${modules.length} modules shown.`;
  }

  function init() { style(); navigation(); build(); navigation(); }
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', init) : init();
})();
