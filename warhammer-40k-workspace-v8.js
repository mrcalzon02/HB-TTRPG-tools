(() => {
  'use strict';

  const STYLE_PATH = 'warhammer-40k-workspace-v8.css?v=10';
  const UI_PATH = 'warhammer-40k-archive-ui-v6.js?v=7';
  const CHART_PATH = 'warhammer-40k-sector-chart-v7.js?v=7';
  const LABELS_PATH = 'warhammer-40k-map-labels-v7.js?v=7';
  const ASSAY_PATH = 'warhammer-40k-survey-assay-v8.js?v=8';
  const ORRERY_PATH = 'warhammer-40k-system-orrery-v1.js?v=1';
  const MAP_PATH = 'warhammer-40k-sector-map-v8.js?v=13';
  const loadedScripts = new Map();

  const state = {
    initialized: false,
    initPromise: null,
    data: null,
    chart: null,
    mapNodes: [],
    routes: [],
    ui: null,
    map: null,
    mapPromise: null,
    orrery: null,
    activeTab: 'archive',
    mapMode: 'orbit',
    vigilActive: false,
    vigilProfile: null,
    vigilCycle: 0,
    vigilTimer: 0,
    selectedNodeId: '',
    selectedNodeName: '',
    selectedRecordId: '',
    preambleSealed: false
  };

  function updateCommandLitany() {
    const register = document.getElementById('wh-command-register');
    const contact = document.getElementById('wh-command-contact');
    const rite = document.getElementById('wh-command-rite');
    const docket = document.getElementById('wh-command-docket');
    const preambleToggle = document.getElementById('wh-command-preamble-toggle');
    const recall = document.getElementById('wh-command-recall');
    const unseal = document.getElementById('wh-command-unseal-docket');
    const registerNames = {
      archive: 'Administratum Index',
      map: 'Navis Cartographica',
      seals: 'Archivum Seals'
    };
    const mapRites = {
      select: 'Auspex selection rite',
      orbit: 'Orbital rotation rite',
      pan: 'Chart translation rite',
      zoom: 'Magnification rite'
    };
    if (register) register.textContent = registerNames[state.activeTab] || 'Cafarron Corridor';
    if (contact) contact.textContent = state.selectedNodeName || 'No contact locked';
    if (docket) docket.textContent = state.selectedRecordId ? 'Attached docket ready' : 'No docket locked';
    if (rite) {
      rite.textContent = state.vigilActive
        ? 'Navis Vigil engaged · designation leaders sealed'
        : state.activeTab === 'map'
          ? `${mapRites[state.mapMode] || mapRites.orbit} active`
          : state.activeTab === 'seals'
            ? 'Archivum ordinances unsealed'
            : 'Administratum query channels open';
    }
    if (preambleToggle) {
      preambleToggle.textContent = state.preambleSealed ? 'Unseal Command Preamble' : 'Seal Command Preamble';
      preambleToggle.setAttribute('aria-pressed', state.preambleSealed ? 'true' : 'false');
    }
    if (recall) recall.disabled = !state.selectedNodeId;
    if (unseal) unseal.disabled = !state.selectedRecordId;
  }

  function loadScript(src) {
    const resolved = new URL(src, document.baseURI).href;
    if (loadedScripts.has(resolved)) return loadedScripts.get(resolved);
    const existing = [...document.scripts].find(script => script.src === resolved);
    if (existing?.dataset.cafarronWorkspaceLoaded === 'true') return Promise.resolve();
    const promise = new Promise((resolve, reject) => {
      const script = existing || document.createElement('script');
      let settled = false;
      const done = () => {
        if (settled) return;
        settled = true;
        script.dataset.cafarronWorkspaceLoaded = 'true';
        resolve();
      };
      const fail = () => {
        if (settled) return;
        settled = true;
        reject(new Error(`${src} could not be loaded.`));
      };
      script.addEventListener('load', done, { once: true });
      script.addEventListener('error', fail, { once: true });
      if (!existing) {
        script.src = src;
        script.async = false;
        document.body.appendChild(script);
      }
    });
    loadedScripts.set(resolved, promise);
    promise.catch(() => loadedScripts.delete(resolved));
    return promise;
  }

  function ensureStyle() {
    const resolved = new URL(STYLE_PATH, document.baseURI).href;
    if ([...document.styleSheets].some(sheet => sheet.href === resolved)) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = STYLE_PATH;
    link.dataset.cafarronWorkspaceStyle = 'true';
    document.head.appendChild(link);
  }

  function createOptionGroup(select, label, nodes) {
    if (!nodes.length) return;
    const group = document.createElement('optgroup');
    group.label = label;
    nodes.forEach(node => group.append(new Option(node.name, node.id)));
    select.append(group);
  }

  function routeLegend() {
    const { el } = state.ui;
    const legend = el('section', 'wh-route-legend');
    legend.append(el('h4', '', 'Navis and Munitorum Route Seals'));
    const items = [
      ['major-warp', 'Primary warp corridor', 'Gold solid arc — principal translation route.'],
      ['trade', 'Munitorum trade lane', 'Teal dashed arc — tithe, fuel, food, troops, or war matériel.'],
      ['local-navigation', 'Local approach chart', 'Blue dashed arc — orbital or system approach relationship.'],
      ['exploratory', 'Explorator approach', 'White faint arc — unratified frontier contact.']
    ];
    for (const [kind, title, text] of items) {
      const item = el('div', 'wh-route-legend-item');
      item.append(el('span', `wh-route-sample ${kind}`), el('span', '', `${title} — ${text}`));
      legend.append(item);
    }
    return legend;
  }

  function appendConnectedRoutes(routes) {
    const { el, addDef, diegeticText } = state.ui;
    const panel = document.getElementById('wh-map-details');
    if (!panel) return;
    const section = el('section', 'wh-linked');
    section.append(el('h4', '', 'Sanctioned Connections'));
    if (!routes.length) {
      section.append(el('p', 'wh-pending', 'No sanctioned corridor is entered for this contact under the present Navis seal.'));
    } else {
      for (const route of routes) {
        const article = el('article', 'wh-route-docket');
        article.append(el('h5', '', route.name));
        const details = el('dl', 'wh-definition');
        addDef(details, 'Route order', diegeticText(route.kind));
        addDef(details, 'Issuing authority', diegeticText(route.authority));
        addDef(details, 'Licensed traffic', diegeticText(route.traffic));
        addDef(details, 'Present standing', diegeticText(route.status));
        article.append(details);
        section.append(article);
      }
    }
    panel.append(section, routeLegend());
  }

  function mountSystemOrrery(node, records) {
    const panel = document.getElementById('wh-map-details');
    if (!panel || !window.CafarronSystemOrreryV1) return;
    state.orrery?.dispose?.();

    const section = document.createElement('section');
    section.className = 'wh-system-orrery';
    section.setAttribute('aria-label', `${node.name} local system orrery`);
    section.style.cssText = 'display:grid;gap:.45rem;padding:.7rem;border:1px solid rgba(198,171,104,.32);background:linear-gradient(160deg,rgba(36,31,21,.72),rgba(3,5,5,.94));';

    const heading = document.createElement('div');
    heading.style.cssText = 'display:flex;flex-wrap:wrap;justify-content:space-between;gap:.35rem;align-items:baseline;';
    const title = document.createElement('h4');
    title.textContent = 'Local System Orrery';
    const seal = document.createElement('span');
    seal.textContent = 'Registered contact highlighted';
    seal.style.cssText = 'color:#cdbb8b;font:700 .6rem/1.3 ui-monospace,monospace;letter-spacing:.06em;text-transform:uppercase;';
    heading.append(title, seal);

    const host = document.createElement('div');
    host.className = 'wh-system-orrery-host';
    host.style.cssText = 'position:relative;width:100%;height:14rem;overflow:hidden;border:1px solid rgba(224,199,127,.22);background:#020404;';
    const note = document.createElement('p');
    note.className = 'wh-small';
    note.textContent = 'Cartographica reconstruction · primary star, registered orbital bodies, and attached satellites.';
    note.style.margin = '0';

    section.append(heading, host, note);
    panel.insertBefore(section, panel.children[2] || null);
    state.orrery = window.CafarronSystemOrreryV1.mount({ host, node, records });
  }

  function vigilElements() {
    return {
      panel: document.getElementById('wh-vigil-panel'),
      title: document.getElementById('wh-vigil-title'),
      classLine: document.getElementById('wh-vigil-class'),
      facts: document.getElementById('wh-vigil-facts'),
      seal: document.getElementById('wh-vigil-seal'),
      progress: document.getElementById('wh-vigil-progress')
    };
  }

  function renderVigilFacts() {
    if (!state.vigilProfile) return;
    const assay = window.CafarronSurveyAssayV8;
    const { facts } = vigilElements();
    if (!facts || !assay) return;
    const selection = assay.factSet(state.vigilProfile, state.vigilCycle, 7);
    const fragment = document.createDocumentFragment();
    for (const fact of selection) {
      const row = document.createElement('div');
      row.className = 'wh-vigil-fact';
      const dt = document.createElement('dt');
      dt.textContent = fact.label;
      const dd = document.createElement('dd');
      dd.textContent = fact.value;
      row.append(dt, dd);
      fragment.append(row);
    }
    facts.replaceChildren(fragment);
  }

  function beginFactRotation() {
    window.clearInterval(state.vigilTimer);
    state.vigilTimer = window.setInterval(() => {
      if (!state.vigilActive || !state.vigilProfile) return;
      state.vigilCycle += 1;
      renderVigilFacts();
    }, 7600);
  }

  function showVigilNode(node, records, dwell) {
    const assay = window.CafarronSurveyAssayV8;
    if (!assay) return;
    state.vigilProfile = assay.profile(node, records);
    state.vigilCycle = 0;
    const { panel, title, classLine, seal, progress } = vigilElements();
    if (!panel) return;
    panel.hidden = false;
    title.textContent = state.vigilProfile.name;
    classLine.textContent = state.vigilProfile.classification;
    const threat = state.data.threatStates[node.threat];
    seal.textContent = threat?.label || 'Strategic seal attached';
    seal.style.setProperty('--vigil-color', threat?.css || '#d7b35f');
    progress.style.setProperty('--vigil-dwell', `${Math.max(1, dwell || 26000)}ms`);
    progress.classList.remove('active');
    void progress.offsetWidth;
    progress.classList.add('active');
    renderVigilFacts();
    beginFactRotation();
  }

  function setVigilState(active) {
    state.vigilActive = Boolean(active);
    const toggle = document.getElementById('wh-vigil-toggle');
    const next = document.getElementById('wh-vigil-next');
    const panel = document.getElementById('wh-vigil-panel');
    if (toggle) {
      toggle.textContent = active ? 'Cease Vigil' : 'Commence Vigil';
      toggle.setAttribute('aria-pressed', active ? 'true' : 'false');
    }
    if (next) next.disabled = !active;
    if (!active) {
      window.clearInterval(state.vigilTimer);
      state.vigilTimer = 0;
      state.vigilProfile = null;
      if (panel) panel.hidden = true;
    }
    updateCommandLitany();
  }

  function buildVigilPanel() {
    const { el } = state.ui;
    const panel = el('section', 'wh-vigil-panel');
    panel.id = 'wh-vigil-panel';
    panel.hidden = true;
    panel.setAttribute('aria-live', 'polite');
    panel.append(
      el('p', 'wh-kicker', 'Navis Cartographica Passive Vigil'),
      el('h3', '', 'Awaiting Contact'),
      el('p', 'wh-vigil-class', 'Survey classification sealed')
    );
    panel.querySelector('h3').id = 'wh-vigil-title';
    panel.querySelector('.wh-vigil-class').id = 'wh-vigil-class';
    const seal = el('div', 'wh-vigil-seal', 'Strategic seal attached');
    seal.id = 'wh-vigil-seal';
    const facts = document.createElement('dl');
    facts.className = 'wh-vigil-facts';
    facts.id = 'wh-vigil-facts';
    const meter = el('div', 'wh-vigil-meter');
    const progress = el('span', 'wh-vigil-progress');
    progress.id = 'wh-vigil-progress';
    meter.append(progress);
    panel.append(seal, facts, meter);
    return panel;
  }

  function buildMapPanel() {
    const { el, button, threatLegend } = state.ui;
    const panel = el('section');
    panel.dataset.panel = 'map';
    panel.hidden = true;

    const layout = el('div', 'wh-map-layout');
    const card = el('section', 'wh-map-card');
    const controls = el('div', 'wh-map-controls');
    const registerRow = el('div', 'wh-map-control-grid');
    const registerLabel = el('label', '', 'Navis contact register');
    const register = document.createElement('select');
    register.id = 'wh-node-select';
    register.append(new Option('Choose a charted contact…', ''));
    const layerNames = {
      primary: 'Primary Imperial worlds and systems',
      supporting: 'Supporting navigation sites',
      'guard-origin': 'Astra Militarum origin systems',
      provisional: 'Restricted holding designations',
      unnamed: 'Unnumbered celestial bodies',
      exploratory: 'Explorator contacts'
    };
    Object.entries(layerNames).forEach(([layer, label]) => {
      createOptionGroup(register, label, state.mapNodes.filter(node => node.layer === layer));
    });
    registerLabel.append(register);

    const threatLabel = el('label', '', 'Strategic threat seal');
    const threatSelect = document.createElement('select');
    threatSelect.id = 'wh-threat-select';
    threatSelect.append(new Option('All strategic seals', 'all'));
    Object.entries(state.data.threatStates).forEach(([key, threat]) => {
      if (key !== 'unassigned') threatSelect.append(new Option(threat.label, key));
    });
    threatLabel.append(threatSelect);
    registerRow.append(registerLabel, threatLabel);

    const layers = el('div', 'wh-layers');
    const layerSpecs = [
      ['supporting', 'Supporting sites', true],
      ['guard-origin', 'Astra Militarum origin systems', true],
      ['provisional', 'Restricted designations', false],
      ['unnamed', 'Unnumbered bodies', false],
      ['exploratory', 'Explorator contacts', true],
      ['route-major-warp', 'Primary warp corridors', true],
      ['route-trade', 'Munitorum trade lanes', true],
      ['route-local-navigation', 'Local approach charts', false],
      ['route-exploratory', 'Explorator approaches', false],
      ['regions', 'Sector volumes', false],
      ['hazards', 'Threat volumes', false],
      ['labels', 'Floating system designations', true]
    ];
    layerSpecs.forEach(([layer, text, checked]) => {
      const label = document.createElement('label');
      const input = document.createElement('input');
      input.type = 'checkbox';
      input.checked = checked;
      input.dataset.mapLayer = layer;
      label.append(input, document.createTextNode(text));
      layers.append(label);
    });

    const status = el('div', 'wh-status', 'Awaiting the Navis survey cogitator…');
    status.id = 'wh-map-status';
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');
    controls.append(registerRow, layers, status);

    const stage = el('div', 'wh-map-stage');
    stage.id = 'wh-map-stage';
    stage.tabIndex = 0;
    stage.dataset.mapMode = state.mapMode;
    stage.setAttribute('aria-label', 'Interactive three-dimensional Cafarron Corridor Navis survey. Helm controls remain fixed within the viewport.');

    const viewportConsole = el('section', 'wh-viewport-console');
    viewportConsole.setAttribute('aria-label', 'Navis survey helm');
    const navigationHead = el('div', 'wh-navigation-head');
    navigationHead.append(el('p', 'wh-kicker', 'Navis Survey Helm'), el('span', 'wh-mode-readout', 'Orbital rotation rite · graduated resistance active'));

    const modebar = el('div', 'wh-modebar');
    modebar.setAttribute('role', 'toolbar');
    modebar.setAttribute('aria-label', 'Auspex interaction rites');
    const modeSpecs = [
      ['select', 'Auspex Select', 'Select contacts without moving the survey.'],
      ['orbit', 'Orbital Rotation', 'Rotate slowly around the three-dimensional sector.'],
      ['pan', 'Chart Translation', 'Move the survey laterally under graduated resistance.'],
      ['zoom', 'Magnification', 'Adjust survey depth under graduated resistance.']
    ];
    modeSpecs.forEach(([mode, label, title]) => {
      const control = button(label, 'wh-mode-button');
      control.dataset.mapMode = mode;
      control.title = title;
      control.setAttribute('aria-pressed', mode === state.mapMode ? 'true' : 'false');
      modebar.append(control);
    });

    const viewActions = el('div', 'wh-viewport-actions');
    const focus = button('Center Auspex', 'wh-viewport-button');
    focus.disabled = true;
    const reset = button('Restore Survey', 'wh-viewport-button');
    const top = button('Zenith Projection', 'wh-viewport-button');
    const vigil = button('Commence Vigil', 'wh-viewport-button wh-vigil-toggle');
    vigil.id = 'wh-vigil-toggle';
    vigil.setAttribute('aria-pressed', 'false');
    const nextVigil = button('Advance Vigil', 'wh-viewport-button');
    nextVigil.id = 'wh-vigil-next';
    nextVigil.disabled = true;
    const theatreToggle = button('Widen Survey Theatre', 'wh-viewport-button');
    theatreToggle.id = 'wh-survey-theatre-toggle';
    theatreToggle.disabled = true;
    theatreToggle.setAttribute('aria-pressed', 'false');
    const fullAuspexToggle = button('Invoke Full Auspex', 'wh-viewport-button');
    fullAuspexToggle.id = 'wh-full-auspex-toggle';
    fullAuspexToggle.disabled = true;
    fullAuspexToggle.setAttribute('aria-pressed', 'false');
    const docketToggle = button('Unseal Contact Docket', 'wh-viewport-button');
    docketToggle.id = 'wh-contact-docket-toggle';
    docketToggle.disabled = true;
    docketToggle.hidden = true;
    docketToggle.setAttribute('aria-pressed', 'false');
    viewActions.append(focus, reset, top, vigil, nextVigil, theatreToggle, fullAuspexToggle, docketToggle);
    viewportConsole.append(navigationHead, modebar, viewActions);

    const leaders = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    leaders.id = 'wh-leader-layer';
    leaders.classList.add('wh-leader-layer');
    leaders.setAttribute('aria-hidden', 'true');
    const labels = el('div', 'wh-label-layer');
    labels.id = 'wh-label-layer';
    const loading = el('div', 'wh-map-loading', 'Invoking the Navis Cartographica survey engine…');
    loading.id = 'wh-map-loading';
    stage.append(leaders, labels, loading, viewportConsole, buildVigilPanel());
    card.append(controls, stage);

    const details = el('aside', 'wh-map-details');
    details.id = 'wh-map-details';
    details.setAttribute('aria-live', 'polite');
    details.append(
      el('p', 'wh-kicker', 'Navis Cartographica Auspex Lock'),
      el('h3', '', 'No contact selected'),
      el('p', '', 'Select a system contact to consult its attached dockets, threat seal, sanctioned connections, and survey assays.'),
      threatLegend(),
      routeLegend()
    );
    layout.append(card, details);
    panel.append(layout);

    function setMode(mode) {
      state.mapMode = mode;
      modebar.querySelectorAll('[data-map-mode]').forEach(control => {
        control.setAttribute('aria-pressed', control.dataset.mapMode === mode ? 'true' : 'false');
      });
      const readout = viewportConsole.querySelector('.wh-mode-readout');
      const readouts = {
        select: 'Auspex selection rite · survey movement sealed',
        orbit: 'Orbital rotation rite · graduated resistance active',
        pan: 'Chart translation rite · graduated resistance active',
        zoom: 'Magnification rite · graduated resistance active'
      };
      if (readout) readout.textContent = readouts[mode] || readouts.orbit;
      state.map?.setMode(mode);
      updateCommandLitany();
    }

    modebar.addEventListener('click', event => {
      const control = event.target.closest('[data-map-mode]');
      if (control) setMode(control.dataset.mapMode);
    });
    register.addEventListener('change', () => {
      focus.disabled = !register.value;
      if (register.value && state.map) state.map.selectNode(register.value, false);
    });
    focus.addEventListener('click', () => {
      if (register.value && state.map) state.map.selectNode(register.value, true);
    });
    reset.addEventListener('click', () => state.map?.reset());
    top.addEventListener('click', () => state.map?.top());
    vigil.addEventListener('click', async () => {
      const map = await initializeMap();
      if (map.passiveActive()) map.stopPassive('helm');
      else map.startPassive();
    });
    nextVigil.addEventListener('click', () => state.map?.nextPassive());
    threatSelect.addEventListener('change', () => state.map?.setThreat(threatSelect.value));
    layers.addEventListener('change', event => {
      const input = event.target.closest('[data-map-layer]');
      if (input) state.map?.setLayer(input.dataset.mapLayer, input.checked);
    });
    return panel;
  }

  async function initializeMap() {
    if (state.map) {
      state.map.resume();
      return state.map;
    }
    if (state.mapPromise) return state.mapPromise;
    state.mapPromise = (async () => {
      await Promise.all([loadScript(ASSAY_PATH), loadScript(ORRERY_PATH), loadScript(MAP_PATH)]);
      const loading = document.getElementById('wh-map-loading');
      try {
        state.map = await window.CafarronSectorMapV8.mount({
          data: state.data,
          chart: state.chart,
          stage: document.getElementById('wh-map-stage'),
          labelLayer: document.getElementById('wh-label-layer'),
          leaderLayer: document.getElementById('wh-leader-layer'),
          status: document.getElementById('wh-map-status'),
          initialMode: state.mapMode,
          onSelect: (node, records, routes) => {
            state.selectedNodeId = node.id;
            state.selectedNodeName = node.name;
            state.selectedRecordId = records[0]?.id || '';
            state.ui.renderMapDetails(node, records);
            mountSystemOrrery(node, records);
            appendConnectedRoutes(routes);
            const register = document.getElementById('wh-node-select');
            if (register) {
              register.value = node.id;
              const focus = document.querySelector('.wh-viewport-actions button');
              if (focus) focus.disabled = false;
            }
            updateCommandLitany();
          },
          onPassiveNode: showVigilNode,
          onPassiveChange: active => setVigilState(active)
        });
        loading?.remove();
        return state.map;
      } catch (error) {
        if (loading) loading.textContent = `Navis survey engine unavailable: ${error.message}`;
        const mapStatus = document.getElementById('wh-map-status');
        if (mapStatus) mapStatus.textContent = `Survey rite failed: ${error.message}`;
        throw error;
      }
    })();
    state.mapPromise.catch(() => { state.mapPromise = null; });
    return state.mapPromise;
  }

  function setActiveTab(tab) {
    state.activeTab = tab;
    document.querySelectorAll('#warhammer-40k [data-tab]').forEach(control => {
      const active = control.dataset.tab === tab;
      control.setAttribute('aria-selected', active ? 'true' : 'false');
      control.tabIndex = active ? 0 : -1;
    });
    document.querySelectorAll('#warhammer-40k [data-panel]').forEach(panel => {
      panel.hidden = panel.dataset.panel !== tab;
    });
    if (tab === 'map') void initializeMap();
    else state.map?.pause();
    updateCommandLitany();
  }

  function buildWorkspace(view) {
    const { el, button, addDef } = state.ui;
    view.replaceChildren();
    view.setAttribute('aria-labelledby', 'wh-workspace-title');
    const workspace = el('div', 'wh-workspace');
    const header = el('header', 'wh-command');
    const brand = el('div', 'wh-brand');
    const sigil = el('div', 'wh-sigil', 'I');
    sigil.setAttribute('aria-hidden', 'true');
    const brandCopy = document.createElement('div');
    brandCopy.append(
      el('p', '', 'Adeptus Administratum · Navis Cartographica Annex'),
      el('h1', '', 'Cafarron Corridor Strategic Archive')
    );
    brand.append(sigil, brandCopy);

    const actions = el('div', 'wh-actions');
    const back = button('Return to Master Cogitator', 'wh-button primary');
    back.addEventListener('click', () => window.HBTTRPGApp?.activateView?.('tools'));
    const exportButton = button('Issue Registry Data-Slate');
    exportButton.addEventListener('click', () => window.Warhammer40KLore.exportArchive());
    actions.append(back, exportButton);
    header.append(brand, actions);

    const tabs = el('nav', 'wh-tabs');
    tabs.setAttribute('role', 'tablist');
    tabs.setAttribute('aria-label', 'Cafarron Corridor cogitator registers');
    [['archive', 'Administratum Index'], ['map', 'Navis Cartographica'], ['seals', 'Archivum Seals']].forEach(([key, label], index) => {
      const tab = button(label, 'wh-tab');
      tab.dataset.tab = key;
      tab.setAttribute('role', 'tab');
      tab.setAttribute('aria-selected', index === 0 ? 'true' : 'false');
      tab.tabIndex = index === 0 ? 0 : -1;
      tabs.append(tab);
    });

    const commandRibbon = el('section', 'wh-command-ribbon');
    commandRibbon.setAttribute('aria-label', 'Cafarron command litany');
    const commandReadouts = el('div', 'wh-command-readouts');
    const commandFields = [
      ['Active Register', 'wh-command-register', 'Administratum Index'],
      ['Navis Lock', 'wh-command-contact', 'No contact locked'],
      ['Machine Rite', 'wh-command-rite', 'Administratum query channels open'],
      ['Docket Seal', 'wh-command-docket', 'No docket locked']
    ];
    commandFields.forEach(([label, id, value]) => {
      const field = el('div', 'wh-command-readout');
      const heading = el('span', 'wh-command-readout-label', label);
      const output = el('strong', 'wh-command-readout-value', value);
      output.id = id;
      field.append(heading, output);
      commandReadouts.append(field);
    });
    const commandRites = el('div', 'wh-command-rites');
    const preambleToggle = button('Seal Command Preamble', 'wh-button');
    preambleToggle.id = 'wh-command-preamble-toggle';
    preambleToggle.setAttribute('aria-pressed', 'false');
    const recallLock = button('Recall Navis Lock', 'wh-button');
    recallLock.id = 'wh-command-recall';
    recallLock.disabled = true;
    const unsealDocket = button('Unseal Selected Docket', 'wh-button');
    unsealDocket.id = 'wh-command-unseal-docket';
    unsealDocket.disabled = true;
    commandRites.append(preambleToggle, recallLock, unsealDocket);
    commandRibbon.append(commandReadouts, commandRites);

    const shell = el('section', 'wh-shell');
    const hero = el('section', 'wh-hero');
    hero.id = 'wh-command-preamble';
    const copy = el('article', 'wh-panelbox');
    copy.append(
      el('p', 'wh-kicker', 'Segmentum Command Access · Cafarron Corridor'),
      el('h2', '', 'By Writ of the Sector Archive'),
      el('p', '', 'This cogitator contains the registered worlds, moons, systems, military formations, navigation contacts, threat seals, and sanctioned routes of the Cafarron Corridor.'),
      el('p', 'wh-note', 'The Navis Cartographica vigil may be engaged within the three-dimensional survey. It will passively inspect sanctioned contacts, orbit each selected body, and recite rotating stellar, planetary, census, and navigation assays.'),
      el('p', 'wh-small', 'Explorator contacts remain under temporary Cartographica designations until the Sector Chronicler issues permanent names.')
    );
    const docket = el('aside', 'wh-panelbox');
    docket.append(el('p', 'wh-kicker', 'Cogitator Census'));
    const dl = el('dl', 'wh-dl');
    addDef(dl, 'Archive register', 'Cafarron Corridor Administratum Master Register');
    addDef(dl, 'Docket date', state.data.scopeDate);
    addDef(dl, 'Sealed dockets', state.data.records.length);
    addDef(dl, 'Charted contacts', state.mapNodes.length);
    addDef(dl, 'Astra Militarum origin systems', state.mapNodes.filter(node => node.layer === 'guard-origin').length);
    addDef(dl, 'Primary warp corridors', state.routes.filter(route => route.layer === 'major-warp').length);
    addDef(dl, 'Munitorum trade lanes', state.routes.filter(route => route.layer === 'trade').length);
    addDef(dl, 'Passive vigil', 'Available through the Navis survey helm');
    docket.append(dl);
    hero.append(copy, docket);

    preambleToggle.addEventListener('click', () => {
      state.preambleSealed = !state.preambleSealed;
      hero.hidden = state.preambleSealed;
      workspace.dataset.preambleSeal = state.preambleSealed ? 'sealed' : 'unsealed';
      updateCommandLitany();
    });
    recallLock.addEventListener('click', () => {
      if (!state.selectedNodeId) return;
      setActiveTab('map');
      void initializeMap().then(map => map.selectNode(state.selectedNodeId, true));
    });
    unsealDocket.addEventListener('click', () => {
      if (state.selectedRecordId) state.ui.openEntry(state.selectedRecordId);
    });

    const archivePanel = state.ui.archivePanel();
    const mapPanel = buildMapPanel();
    const sealsPanel = state.ui.sealsPanel();
    shell.append(hero, archivePanel, mapPanel, sealsPanel);
    workspace.dataset.preambleSeal = 'unsealed';
    workspace.append(header, tabs, commandRibbon, shell);
    view.append(workspace);

    tabs.addEventListener('click', event => {
      const tab = event.target.closest('[data-tab]');
      if (tab) setActiveTab(tab.dataset.tab);
    });
    tabs.addEventListener('keydown', event => {
      if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
      const controls = [...tabs.querySelectorAll('[data-tab]')];
      const index = controls.indexOf(document.activeElement);
      if (index < 0) return;
      event.preventDefault();
      const next = controls[(index + (event.key === 'ArrowRight' ? 1 : -1) + controls.length) % controls.length];
      next.focus();
      setActiveTab(next.dataset.tab);
    });
    state.ui.renderArchive();
    updateCommandLitany();
  }

  async function initialize() {
    if (state.initialized) {
      document.body.classList.add('warhammer-archive-active');
      if (state.activeTab === 'map') state.map?.resume();
      return;
    }
    if (state.initPromise) return state.initPromise;
    state.initPromise = (async () => {
      ensureStyle();
      const view = document.getElementById('warhammer-40k');
      if (!view) throw new Error('The Cafarron Corridor cogitator mount is unavailable.');
      view.replaceChildren();
      const loading = document.createElement('div');
      loading.className = 'module-empty';
      loading.textContent = 'Invoking the Cafarron Corridor strategic cogitator…';
      view.append(loading);
      await Promise.all([loadScript(UI_PATH), loadScript(CHART_PATH), loadScript(LABELS_PATH), loadScript(ASSAY_PATH)]);
      state.data = await window.Warhammer40KLore.ready;
      state.chart = window.CafarronSectorChartV7;
      state.mapNodes = state.chart.nodes(state.data);
      state.routes = state.chart.routes(state.data);
      state.ui = window.CafarronArchiveUIV6.create(state.data, {
        mapNodes: state.mapNodes,
        routes: state.routes,
        exportArchive: () => window.Warhammer40KLore.exportArchive(),
        locate: nodeId => {
          setActiveTab('map');
          void initializeMap().then(map => map.selectNode(nodeId, true));
        }
      });
      buildWorkspace(view);
      state.initialized = true;
      document.body.classList.add('warhammer-archive-active');
    })();
    state.initPromise.catch(error => {
      const view = document.getElementById('warhammer-40k');
      if (view) {
        view.replaceChildren();
        const failure = document.createElement('div');
        failure.className = 'module-empty';
        failure.textContent = `The Cafarron Corridor cogitator failed to answer: ${error.message}`;
        view.append(failure);
      }
      state.initPromise = null;
    });
    return state.initPromise;
  }

  document.addEventListener('hb:view-activated', event => {
    const active = event.detail?.viewId === 'warhammer-40k';
    document.body.classList.toggle('warhammer-archive-active', active);
    if (!active) state.map?.pause();
    else if (state.activeTab === 'map') state.map?.resume();
  });

  window.Warhammer40KWorkspace = Object.freeze({ initialize });
})();