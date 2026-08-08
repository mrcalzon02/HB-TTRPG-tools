(() => {
  'use strict';

  const VIEW_ID = 'shadowrun';
  const ASSET_VERSION = '20260730-v13';
  const modules = [
    ['generators','Street View Sprawl Discovery','Generate nearby Shadowrun-ready sites from a real-world origin with deterministic coordinates, Street View links, world-seeded run hooks, danger scaling, security posture, Matrix surfaces, magical texture, local saves, and global registry submission.','shadowrun-sprawl-discovery','prototype','Open Discovery'],
    ['generators','Shadowrun Mission and Complication Generator','Build a complete run with employer, objective, target, opposition, hidden truth, legwork routes, complications, payment, and fallout.'],
    ['generators','Mr. Johnson and Employer Generator','Create an employer persona, public identity, real sponsor, negotiation posture, withheld information, leverage, and betrayal risk.'],
    ['tools','Fixer and Contact Network Editor','Track contacts, loyalty, connection, specialties, neighborhoods, favors, availability, and evolving risk.'],
    ['generators','Runner Team and Specialist NPC Generator','Create allied or rival runners with archetypes, capabilities, signature gear, reputations, motives, and tensions.'],
    ['generators','Mid-Market Supplier Company Generator','Create volatile second-tier suppliers, component houses, contractors, firmware shops, warehousers, and desperate subcontractors that serve larger corporate procurement chains and may collapse between runs.','shadowrun-midmarket-company-generator','prototype','Open Generator'],
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
    ['science','Binary Cube Encryption Laboratory','Develop and test the Binary Cube encoding and traversal system independently from the extracted Shadow/ISM collision simulator.','shadowrun-binary-cube-encryption','available','Open Laboratory'],
    ['science','Binary Cube Encoder Visualizer','Visualize canonical Binary Cube packages, mappings, traces, and reversible multi-block playback without owning the extracted Shadow/ISM simulation.','shadowrun-binary-cube-visualizer','available','Open Visualizer'],
    ['science','Interstellar Media Collisions Lab','Cast phase-light vectors through literal 1:1 interstellar-medium particles, apply physically bounded Λ scaling, add a deterministic secondary Shadow Key reflectivity layer, and chart all five non-input faces concurrently.','interstellar-media-collisions-lab','available','Open Collisions Lab'],
    ['tools','Polyaminal Fold Ladder Compression Research','Investigate recursive anchor/swing folding, stage-gated codecs, deterministic binary packing, measurable compression behavior, and eventual handoff into the Binary Cube pipeline.',null,'research']
  ];

  let active = 'all';
  let cubeToolPromise = null;
  let cubeVisualizerPromise = null;
  let sprawlToolPromise = null;
  let midmarketToolPromise = null;
  let interstellarLabPromise = null;
  let cubeHandoffsBound = false;
  const scriptPromises = new Map();
  const stylePromises = new Map();
  const esc = value => String(value ?? '').replace(/[&<>"']/g, character => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[character]));
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
      card.innerHTML = '<h3>Shadowrun Workspace</h3><p>Sprawls, runs, Johnsons, contacts, Matrix hosts, facilities, magic, equipment, heat, downtime, campaign consequences, and scientific tools.</p><button class="link-button" data-view="shadowrun">Open Shadowrun</button>';
      menu.appendChild(card);
    }
    bind();
  }

  function normalizedAsset(value) { return String(value || '').split('?')[0].replace(/^\.\//, ''); }
  function existingScript(src) {
    const normalized = normalizedAsset(src);
    return [...document.scripts].find(script => {
      const value = normalizedAsset(script.getAttribute('src'));
      return value === normalized || value.endsWith(`/${normalized}`);
    });
  }
  function existingStyle(href) {
    const normalized = normalizedAsset(href);
    return [...document.querySelectorAll('link[rel="stylesheet"]')].find(link => {
      const value = normalizedAsset(link.getAttribute('href'));
      return value === normalized || value.endsWith(`/${normalized}`);
    });
  }

  function loadStyle(href) {
    if (stylePromises.has(href)) return stylePromises.get(href);
    const existing = existingStyle(href);
    if (existing?.dataset.shadowrunStyleLoaded === 'true') return Promise.resolve();
    const promise = new Promise((resolve, reject) => {
      const link = existing || document.createElement('link');
      let settled = false;
      const finish = () => { if (settled) return; settled = true; link.dataset.shadowrunStyleLoaded = 'true'; resolve(); };
      const fail = () => { if (settled) return; settled = true; reject(new Error(`${href} could not be loaded.`)); };
      link.addEventListener('load', finish, { once: true });
      link.addEventListener('error', fail, { once: true });
      if (!existing) {
        link.rel = 'stylesheet';
        link.href = `${href}?v=${ASSET_VERSION}`;
        link.dataset.shadowrunToolStyle = 'true';
        document.head.appendChild(link);
      } else if (link.sheet) finish();
    });
    stylePromises.set(href, promise);
    promise.catch(() => stylePromises.delete(href));
    return promise;
  }

  function loadScript(src, ready = () => false) {
    if (ready()) return Promise.resolve();
    if (scriptPromises.has(src)) return scriptPromises.get(src);
    const promise = new Promise((resolve, reject) => {
      const existing = existingScript(src);
      const script = existing || document.createElement('script');
      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timeout);
        if (!ready()) return reject(new Error(`${src} loaded without exposing its expected API.`));
        script.dataset.shadowrunToolLoaded = 'true';
        resolve();
      };
      const fail = () => { if (settled) return; settled = true; window.clearTimeout(timeout); reject(new Error(`${src} could not be loaded.`)); };
      const timeout = window.setTimeout(() => ready() ? finish() : fail(), 10000);
      script.addEventListener('load', finish, { once: true });
      script.addEventListener('error', fail, { once: true });
      if (!existing) {
        script.src = `${src}?v=${ASSET_VERSION}`;
        script.async = false;
        script.dataset.shadowrunTool = 'true';
        document.body.appendChild(script);
      } else if (ready()) finish();
    });
    scriptPromises.set(src, promise);
    promise.catch(() => scriptPromises.delete(src));
    return promise;
  }

  function canonicalCubeEngineReady() {
    return Boolean(window.ShadowrunBinaryCubeEngine
      && window.ShadowrunBinaryCubeEngine.constants?.MAX_GRID_SIZE === 1024
      && typeof window.ShadowrunBinaryCubeEngine.assertOmnidirectionalNonConflict === 'function'
      && typeof window.ShadowrunBinaryCubeEngine.traceEncryptBlock === 'function');
  }

  function loadCubeTool() {
    if (canonicalCubeEngineReady() && window.ShadowrunBinaryCubeAuth && window.ShadowrunBinaryCubeEncryption && window.ShadowrunBinaryCubeEditor && window.ShadowrunBinaryCubeAuthUI) return Promise.resolve(window.ShadowrunBinaryCubeEncryption);
    if (cubeToolPromise) return cubeToolPromise;
    cubeToolPromise = (async () => {
      await loadScript('shadowrun-binary-cube-engine.js', canonicalCubeEngineReady);
      await loadScript('binary-cube-large-grid-ui.js', () => Boolean(window.BinaryCubeLargeGridUI));
      await loadScript('shadowrun-binary-cube-auth.js', () => Boolean(window.ShadowrunBinaryCubeAuth));
      await loadScript('shadowrun-binary-cube-encryption.js', () => Boolean(window.ShadowrunBinaryCubeEncryption));
      await loadScript('shadowrun-binary-cube-editor.js', () => Boolean(window.ShadowrunBinaryCubeEditor));
      await loadScript('shadowrun-binary-cube-auth-ui.js', () => Boolean(window.ShadowrunBinaryCubeAuthUI));
      await loadScript('shadowrun-binary-cube-secure-export.js', () => Boolean(window.ShadowrunBinaryCubeSecureExport));
      return window.ShadowrunBinaryCubeEncryption;
    })();
    cubeToolPromise.catch(() => { cubeToolPromise = null; });
    return cubeToolPromise;
  }

  function loadCubeVisualizer() {
    if (canonicalCubeEngineReady() && window.BinaryCubeVisualizerRenderer && window.ShadowrunBinaryCubeVisualizer) return Promise.resolve(window.ShadowrunBinaryCubeVisualizer);
    if (cubeVisualizerPromise) return cubeVisualizerPromise;
    cubeVisualizerPromise = (async () => {
      await loadStyle('binary-cube-visualizer.css');
      await loadScript('shadowrun-binary-cube-engine.js', canonicalCubeEngineReady);
      await loadScript('shadowrun-binary-cube-auth.js', () => Boolean(window.ShadowrunBinaryCubeAuth));
      await loadScript('shadowrun-binary-cube-secure-export.js', () => Boolean(window.ShadowrunBinaryCubeSecureExport));
      await loadScript('binary-cube-visualizer-renderer.js', () => Boolean(window.BinaryCubeVisualizerRenderer));
      await loadScript('shadowrun-binary-cube-visualizer.js', () => Boolean(window.ShadowrunBinaryCubeVisualizer));
      return window.ShadowrunBinaryCubeVisualizer;
    })();
    cubeVisualizerPromise.catch(() => { cubeVisualizerPromise = null; });
    return cubeVisualizerPromise;
  }

  function loadSprawlTool() {
    if (sprawlToolPromise) return sprawlToolPromise;
    sprawlToolPromise = (async () => {
      await loadScript('shadowrun-sprawl-discovery-engine.js', () => Boolean(window.ShadowrunSprawlDiscoveryEngine));
      await loadScript('shadowrun-sprawl-discovery.js', () => Boolean(window.ShadowrunSprawlDiscovery));
      await loadScript('shadowrun-sprawl-scan-recovery.js', () => Boolean(window.__shadowrunSprawlScanRecoveryInstalled));
      await loadScript('shadowrun-danger-intensity-control.js', () => Boolean(window.ShadowrunDangerIntensity));
      await loadScript('spatial-submission-handoff.js', () => Boolean(window.HBSpatialSubmissionHandoff));
      await loadScript('shadowrun-sprawl-seed-workspace.js', () => Boolean(window.ShadowrunSprawlSeedWorkspace));
      return window.ShadowrunSprawlDiscovery;
    })();
    sprawlToolPromise.catch(() => { sprawlToolPromise = null; });
    return sprawlToolPromise;
  }

  function loadMidmarketCompanyTool() {
    if (window.ShadowrunMidmarketCompanyGenerator) return Promise.resolve(window.ShadowrunMidmarketCompanyGenerator);
    if (midmarketToolPromise) return midmarketToolPromise;
    midmarketToolPromise = loadScript('shadowrun-midmarket-company-generator.js', () => Boolean(window.ShadowrunMidmarketCompanyGenerator)).then(() => window.ShadowrunMidmarketCompanyGenerator);
    midmarketToolPromise.catch(() => { midmarketToolPromise = null; });
    return midmarketToolPromise;
  }

  function loadInterstellarMediaLab() {
    if (window.InterstellarMediaCollisionsLab) return Promise.resolve(window.InterstellarMediaCollisionsLab);
    if (interstellarLabPromise) return interstellarLabPromise;
    interstellarLabPromise = loadScript('interstellar-media-collisions-lab.js', () => Boolean(window.InterstellarMediaCollisionsLab)).then(() => window.InterstellarMediaCollisionsLab);
    interstellarLabPromise.catch(() => { interstellarLabPromise = null; });
    return interstellarLabPromise;
  }

  function bindCubeHandoffs() {
    if (cubeHandoffsBound) return;
    cubeHandoffsBound = true;
    window.addEventListener('shadowrun-binary-cube-open-laboratory', async event => {
      try {
        const api = await loadCubeTool();
        if (typeof api?.loadArtifacts !== 'function') throw new Error('The Binary Cube laboratory does not expose artifact loading.');
        await Promise.resolve(api.loadArtifacts(event.detail || {}));
      } catch (error) { alert(error.message); }
    });
    window.addEventListener('shadowrun-binary-cube-open-visualizer', async event => {
      try {
        const api = await loadCubeVisualizer();
        if (typeof api?.loadArtifacts !== 'function') throw new Error('The Binary Cube visualizer does not expose artifact loading.');
        await Promise.resolve(api.loadArtifacts(event.detail || {}));
      } catch (error) { alert(error.message); }
    });
  }

  function toolLabel(toolId) {
    if (toolId === 'shadowrun-sprawl-discovery') return 'Discovery';
    if (toolId === 'shadowrun-midmarket-company-generator') return 'Generator';
    if (toolId === 'shadowrun-binary-cube-visualizer') return 'Visualizer';
    if (toolId === 'interstellar-media-collisions-lab') return 'Collisions Lab';
    return 'Laboratory';
  }

  function loadTool(toolId) {
    if (toolId === 'shadowrun-sprawl-discovery') return loadSprawlTool();
    if (toolId === 'shadowrun-binary-cube-encryption') return loadCubeTool();
    if (toolId === 'shadowrun-binary-cube-visualizer') return loadCubeVisualizer();
    if (toolId === 'shadowrun-midmarket-company-generator') return loadMidmarketCompanyTool();
    if (toolId === 'interstellar-media-collisions-lab') return loadInterstellarMediaLab();
    return Promise.reject(new Error(`No loader is registered for ${toolId}.`));
  }

  async function openTool(button) {
    const toolId = button.dataset.shadowrunOpen;
    button.disabled = true;
    button.setAttribute('aria-busy', 'true');
    const original = button.textContent;
    try {
      button.textContent = `Loading ${toolLabel(toolId)}…`;
      const api = await loadTool(toolId);
      if (!api?.openPanel) throw new Error(`${toolLabel(toolId)} loaded without an open-panel interface.`);
      if (toolId === 'interstellar-media-collisions-lab') api.openPanel({ setting: 'shadowrun' });
      else api.openPanel();
    } catch (error) { alert(error.message); }
    finally {
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
    section.innerHTML = '<div class="hero-card no-print"><p class="eyebrow">Shadowrun campaign workspace</p><h2>Sprawl Operations and Run Planning Dashboard</h2><p>An edition-flexible predictive-support registry for locations, missions, contacts, corporations, security, the Matrix, magic, gear, pursuits, downtime, long-term consequences, and isolated scientific experiments.</p><p class="helper-note">Unofficial fan planning workspace; not affiliated with or endorsed by the rights holders.</p></div><div class="setting-workspace-controls no-print"><label class="control-label">Search Shadowrun modules</label><input id="shadowrun-search" class="tool-input" type="search"><div id="shadowrun-tabs" class="setting-tab-row"></div></div><p id="shadowrun-count" class="setting-module-count no-print"></p><div id="shadowrun-grid" class="module-grid no-print"></div>';
    main.appendChild(section);
    section.querySelector('#shadowrun-search').addEventListener('input', render);
    section.querySelector('#shadowrun-grid').addEventListener('click', event => {
      const button = event.target.closest('[data-shadowrun-open]');
      if (button) void openTool(button);
    });
    tabs(); render(); bind();
  }

  function tabs() {
    const target = document.getElementById('shadowrun-tabs');
    if (!target) return;
    target.innerHTML = '';
    [['all','All Modules'],['generators','Generators'],['tools','Tools'],['science','Scientific Tools'],['campaign','Campaign'],['reference','Reference']].forEach(([id,label]) => {
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
      const action = module[3] ? `<button type="button" class="link-button shadowrun-module-action" data-shadowrun-open="${esc(module[3])}">${esc(module[5] || 'Open Tool')}</button>` : '';
      return `<article class="module-card"${module[3] ? ` data-shadowrun-module="${esc(module[3])}"` : ''}><div class="module-meta"><span class="badge section-${esc(module[0])}">${esc(title(module[0] === 'science' ? 'Scientific Tools' : module[0]))}</span><span class="badge status-${esc(status)}">${esc(title(status))}</span><span class="badge">priority ${index + 1}</span></div><h3>${esc(module[1])}</h3><p>${esc(module[2])}</p>${action}</article>`;
    }).join('') || '<div class="module-empty">No Shadowrun modules match the current filter.</div>';
    document.getElementById('shadowrun-count').textContent = `${visible.length} of ${modules.length} modules shown.`;
  }

  function init() {
    style(); navigation(); build(); navigation(); bindCubeHandoffs();
  }

  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', init) : init();
})();