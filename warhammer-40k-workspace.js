(() => {
  'use strict';

  const STYLE_PATH = 'warhammer-40k-workspace-v4.css?v=4';
  const UI_PATH = 'warhammer-40k-archive-ui-v4.js?v=4';
  const MAP_PATH = 'warhammer-40k-sector-map-v4.js?v=4';
  const loadedScripts = new Map();

  const state = {
    initialized: false,
    initPromise: null,
    data: null,
    ui: null,
    map: null,
    mapPromise: null,
    activeTab: 'archive'
  };

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
    const group = document.createElement('optgroup');
    group.label = label;
    nodes.forEach(node => group.append(new Option(node.name, node.id)));
    select.append(group);
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

    const registerLabel = el('label', '', 'Navis system register');
    const register = document.createElement('select');
    register.id = 'wh-node-select';
    register.append(new Option('Select a plotted contact…', ''));
    const layerNames = {
      primary: 'Primary indexed worlds and systems',
      supporting: 'Supporting mapped sites',
      provisional: 'Provisional origin candidates',
      unnamed: 'Unnamed reference-sheet bodies',
      exploratory: 'Exploratory non-canon contacts'
    };
    Object.entries(layerNames).forEach(([layer, label]) => {
      createOptionGroup(register, label, state.data.mapNodes.filter(node => node.layer === layer));
    });
    registerLabel.append(register);

    const threatLabel = el('label', '', 'Threat-state seal');
    const threatSelect = document.createElement('select');
    threatSelect.id = 'wh-threat-select';
    threatSelect.append(new Option('All threat states', 'all'));
    Object.entries(state.data.threatStates).forEach(([key, threat]) => threatSelect.append(new Option(threat.label, key)));
    threatLabel.append(threatSelect);
    registerRow.append(registerLabel, threatLabel);

    const toolbar = el('div', 'wh-toolbar');
    const focus = button('Focus Selected Contact');
    focus.disabled = true;
    const reset = button('Reset Survey View');
    const top = button('Top Projection');
    toolbar.append(focus, reset, top);

    const layers = el('div', 'wh-layers');
    const layerSpecs = [
      ['supporting', 'Supporting sites', true],
      ['provisional', 'Provisional origins', false],
      ['unnamed', 'Unnamed bodies', false],
      ['exploratory', 'Exploratory contacts', true],
      ['routes', 'Transit and survey links', true],
      ['regions', 'Sector and campaign volumes', true],
      ['hazards', 'Threat volumes', true],
      ['labels', 'Floating labels', true]
    ];
    layerSpecs.forEach(([layer, labelText, checked]) => {
      const label = document.createElement('label');
      const input = document.createElement('input');
      input.type = 'checkbox';
      input.checked = checked;
      input.dataset.mapLayer = layer;
      label.append(input, document.createTextNode(labelText));
      layers.append(label);
    });

    const status = el('div', 'wh-status', 'Awaiting Navis survey cogitator…');
    status.id = 'wh-map-status';
    status.setAttribute('role', 'status');
    controls.append(registerRow, toolbar, layers, status);

    const stage = el('div', 'wh-map-stage');
    stage.id = 'wh-map-stage';
    stage.tabIndex = 0;
    stage.setAttribute('aria-label', 'Interactive three-dimensional Cafarron Corridor survey. Drag to orbit, right-drag to pan, wheel to zoom, or use the system register.');
    const leaders = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    leaders.id = 'wh-leader-layer';
    leaders.classList.add('wh-leader-layer');
    leaders.setAttribute('aria-hidden', 'true');
    const labels = el('div', 'wh-label-layer');
    labels.id = 'wh-label-layer';
    const loading = el('div', 'wh-map-loading', 'Opening Navis Cartographica survey engine…');
    loading.id = 'wh-map-loading';
    stage.append(leaders, labels, loading);
    card.append(controls, stage);

    const details = el('aside', 'wh-map-details');
    details.id = 'wh-map-details';
    details.setAttribute('aria-live', 'polite');
    details.append(
      el('p', 'wh-kicker', 'Navis Cartographica selection'),
      el('h3', '', 'No contact selected'),
      el('p', '', 'Select a system node to display its reference-sheet docket, source state, threat seal, and map relationships.'),
      threatLegend()
    );
    layout.append(card, details);
    panel.append(layout);

    register.addEventListener('change', () => {
      focus.disabled = !register.value;
      if (register.value && state.map) state.map.selectNode(register.value, false);
    });
    focus.addEventListener('click', () => {
      if (register.value && state.map) state.map.selectNode(register.value, true);
    });
    reset.addEventListener('click', () => state.map?.reset());
    top.addEventListener('click', () => state.map?.top());
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
      await loadScript(MAP_PATH);
      const loading = document.getElementById('wh-map-loading');
      try {
        state.map = await window.CafarronSectorMap.mount({
          data: state.data,
          stage: document.getElementById('wh-map-stage'),
          labelLayer: document.getElementById('wh-label-layer'),
          leaderLayer: document.getElementById('wh-leader-layer'),
          status: document.getElementById('wh-map-status'),
          onSelect: (node, records) => state.ui.renderMapDetails(node, records)
        });
        loading?.remove();
        return state.map;
      } catch (error) {
        if (loading) loading.textContent = `Survey engine unavailable: ${error.message}`;
        const status = document.getElementById('wh-map-status');
        if (status) status.textContent = `Three-dimensional survey failed: ${error.message}`;
        throw error;
      }
    })();
    state.mapPromise.catch(() => { state.mapPromise = null; });
    return state.mapPromise;
  }

  function setActiveTab(tab) {
    state.activeTab = tab;
    document.querySelectorAll('#warhammer-40k [data-tab]').forEach(button => {
      const active = button.dataset.tab === tab;
      button.setAttribute('aria-selected', active ? 'true' : 'false');
      button.tabIndex = active ? 0 : -1;
    });
    document.querySelectorAll('#warhammer-40k [data-panel]').forEach(panel => {
      panel.hidden = panel.dataset.panel !== tab;
    });
    if (tab === 'map') void initializeMap();
    else state.map?.pause();
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
      el('p', '', 'Administratum archive · Navis Cartographica annex'),
      el('h1', '', 'Cafarron Corridor Strategic Archive')
    );
    brand.append(sigil, brandCopy);
    const actions = el('div', 'wh-actions');
    const back = button('Return to Foundry Archive', 'wh-button primary');
    back.addEventListener('click', () => window.HBTTRPGApp?.activateView?.('tools'));
    const exportButton = button('Export Registry');
    exportButton.addEventListener('click', () => window.Warhammer40KLore.exportArchive());
    actions.append(back, exportButton);
    header.append(brand, actions);

    const tabs = el('nav', 'wh-tabs');
    tabs.setAttribute('role', 'tablist');
    tabs.setAttribute('aria-label', 'Cafarron Corridor archive sections');
    [
      ['archive', 'Strategic Archive'],
      ['map', 'Three-Dimensional Sector Survey'],
      ['sources', 'Source & Normalization Docket']
    ].forEach(([key, label], index) => {
      const tab = button(label, 'wh-tab');
      tab.dataset.tab = key;
      tab.setAttribute('role', 'tab');
      tab.setAttribute('aria-selected', index === 0 ? 'true' : 'false');
      tab.tabIndex = index === 0 ? 0 : -1;
      tabs.append(tab);
    });

    const shell = el('section', 'wh-shell');
    const hero = el('section', 'wh-hero');
    const copy = el('article', 'wh-panelbox');
    copy.append(
      el('p', 'wh-kicker', 'Restricted campaign reference · reference-sheet revision 2026-08-05'),
      el('h2', '', 'Cafarron Corridor'),
      el('p', '', state.data.scopeNote),
      el('p', 'wh-note', 'Map labels are treated as floating cartographic annotations. Primary and supporting names retain adjacency priority and are displaced with leader lines rather than allowed to overlap. Exploratory, unnamed, and provisional labels yield to normal indexed names and may be suppressed at crowded camera angles.'),
      el('p', 'wh-small', 'Relative coordinates are a campaign cartographic framework. White exploratory contacts are deliberately non-canon and remain replacement-ready for the next core-world revision.')
    );
    const docket = el('aside', 'wh-panelbox');
    docket.append(el('p', 'wh-kicker', 'Revision docket'));
    const dl = el('dl', 'wh-dl');
    addDef(dl, 'Reference workbook', state.data.referenceWorkbook.title);
    addDef(dl, 'Scope date', state.data.scopeDate);
    addDef(dl, 'Indexed dockets', state.data.records.length);
    addDef(dl, 'Plotted contacts', state.data.mapNodes.length);
    addDef(dl, 'Primary contacts', state.data.kpis.primaryMapNodes);
    addDef(dl, 'Unnamed bodies', state.data.kpis.unnamedMapNodes);
    addDef(dl, 'Exploratory contacts', state.data.kpis.exploratoryMapNodes);
    addDef(dl, 'Source doctrine', 'Exact story permalink, authorial directive, or explicitly unresolved');
    docket.append(dl);
    hero.append(copy, docket);

    const archivePanel = state.ui.archivePanel();
    const mapPanel = buildMapPanel();
    const sourcePanel = state.ui.docketPanel();
    shell.append(hero, archivePanel, mapPanel, sourcePanel);
    workspace.append(header, tabs, shell);
    view.append(workspace);

    tabs.addEventListener('click', event => {
      const tab = event.target.closest('[data-tab]');
      if (tab) setActiveTab(tab.dataset.tab);
    });
    tabs.addEventListener('keydown', event => {
      if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
      const buttons = [...tabs.querySelectorAll('[data-tab]')];
      const index = buttons.indexOf(document.activeElement);
      if (index < 0) return;
      event.preventDefault();
      const next = buttons[(index + (event.key === 'ArrowRight' ? 1 : -1) + buttons.length) % buttons.length];
      next.focus();
      setActiveTab(next.dataset.tab);
    });
    state.ui.renderArchive();
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
      if (!view) throw new Error('The Cafarron Corridor workspace mount is unavailable.');
      view.replaceChildren();
      const loading = document.createElement('div');
      loading.className = 'module-empty';
      loading.textContent = 'Opening the Cafarron Corridor strategic registry…';
      view.append(loading);
      const [data] = await Promise.all([
        window.Warhammer40KLore.ready,
        loadScript(UI_PATH)
      ]);
      state.data = data;
      state.ui = window.CafarronArchiveUI.create(data, {
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
        failure.textContent = `Cafarron Corridor archive failed to open: ${error.message}`;
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
