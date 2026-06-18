(() => {
  'use strict';

  const root = window;
  const panelsApi = root.KaysenderIslandV3Panels;
  const surfaceApi = root.KaysenderIslandSurfaceGridController;
  const brushApi = root.KaysenderSurfaceGridBrushes;
  const modelApi = root.KaysenderIslandV3ProfileModel;
  if (!panelsApi?.IslandProductionPanels) throw new Error('Island production panels are unavailable.');
  if (!surfaceApi?.IslandSurfaceGridController || !brushApi || !modelApi) throw new Error('Island reference dependencies are unavailable.');

  const SINGLE = Object.freeze({
    'route-capability': { 'routeNodeExport.defaultNodeId': 'routeNodes' },
    waterSources: { mapCellId: 'mapCells' },
    reservoirs: { mapCellId: 'mapCells' },
    resourceNodes: { mapCellId: 'mapCells' },
    fractureEvents: { faultZoneId: 'faultZones' },
    landingZones: { mapCellId: 'mapCells' },
    approachCorridors: { landingZoneId: 'landingZones' },
    sites: { mapCellId: 'mapCells' },
    speciesSlots: { habitatId: 'habitats' },
    settlementSlots: { mapCellId: 'mapCells' },
    routeNodes: { mapCellId: 'mapCells' }
  });

  const MANY = Object.freeze({
    visibility: {
      'visibility.playerKnownSiteIds': 'sites',
      'visibility.gmOnlySiteIds': 'sites',
      'visibility.playerKnownHazardIds': 'hazards',
      'visibility.gmOnlyHazardIds': 'hazards'
    },
    approachCorridors: { hazardIds: 'hazards' },
    faultZones: { cellIds: 'mapCells' },
    hazards: { cellIds: 'mapCells' },
    habitats: { cellIds: 'mapCells' },
    settlementSlots: { waterSourceIds: 'waterSources', landingZoneIds: 'landingZones' },
    routeNodes: { landingZoneIds: 'landingZones' }
  });

  const referenceFamilies = new Set(['water', 'site', 'resource', 'hazard']);
  const clone = value => JSON.parse(JSON.stringify(value));
  const unique = values => [...new Set((values || []).map(value => String(value).trim()).filter(Boolean))];
  const pathPattern = /\b[a-z][A-Za-z0-9]*(?:(?:\.[A-Za-z][A-Za-z0-9]*)|(?:\[\d+\]))+\b/g;

  function sourceRecords(model, source) {
    if (source === 'mapCells') {
      return (model.get('map.cells', []) || []).map(cell => ({
        id: cell.id,
        label: `${cell.terrainType || 'unassigned'} [${cell.x},${cell.y}]${cell.active ? '' : ' · inactive'}`
      }));
    }
    return model.listRecords(source).map(record => ({
      id: record.id,
      label: record.name || record.type || record.resourceType || record.role || record.status || 'Unnamed record'
    }));
  }

  function addDatalist(model, panel, panelId, fieldName, source) {
    panel.querySelectorAll(`[name="${fieldName}"]`).forEach((input, index) => {
      if (input.dataset.referenceSuggestions === 'true') return;
      const list = document.createElement('datalist');
      list.id = `island-ref-${panelId}-${fieldName.replace(/[^a-z0-9]+/gi, '-')}-${index}`;
      sourceRecords(model, source).forEach(record => {
        const option = document.createElement('option');
        option.value = record.id;
        option.label = record.label;
        list.appendChild(option);
      });
      input.dataset.referenceSuggestions = 'true';
      input.setAttribute('list', list.id);
      input.insertAdjacentElement('afterend', list);
    });
  }

  function readIds(input) {
    return unique(String(input.value || '').split(','));
  }

  function writeIds(input, ids) {
    input.value = unique(ids).join(', ');
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function addPicker(model, panel, fieldName, source) {
    panel.querySelectorAll(`[name="${fieldName}"]`).forEach(input => {
      if (input.dataset.referencePicker === 'true') return;
      input.dataset.referencePicker = 'true';

      const picker = document.createElement('fieldset');
      picker.className = 'island-reference-picker';
      const legend = document.createElement('legend');
      legend.textContent = 'Linked records';
      const choices = document.createElement('div');
      choices.className = 'island-reference-picker-choices';

      sourceRecords(model, source).forEach(record => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'island-reference-choice';
        button.dataset.referenceId = record.id;
        const identity = document.createElement('strong');
        identity.textContent = record.id;
        const label = document.createElement('span');
        label.textContent = record.label;
        button.append(identity, label);
        const refresh = () => {
          const selected = readIds(input).includes(record.id);
          button.classList.toggle('selected', selected);
          button.setAttribute('aria-pressed', selected ? 'true' : 'false');
        };
        button.addEventListener('click', () => {
          const ids = readIds(input);
          writeIds(input, ids.includes(record.id) ? ids.filter(id => id !== record.id) : [...ids, record.id]);
          refresh();
        });
        input.addEventListener('input', refresh);
        refresh();
        choices.appendChild(button);
      });

      const clear = document.createElement('button');
      clear.type = 'button';
      clear.className = 'island-reference-clear';
      clear.textContent = 'Clear links';
      clear.addEventListener('click', () => writeIds(input, []));
      picker.append(legend, choices, clear);
      input.insertAdjacentElement('afterend', picker);
    });
  }

  function focusTarget(element) {
    if (!element) return false;
    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    if (typeof element.focus === 'function') element.focus({ preventScroll: true });
    element.classList.add('island-reference-target');
    root.setTimeout(() => element.classList.remove('island-reference-target'), 1800);
    return true;
  }

  function focusMapPath(session, path) {
    const match = path.match(/^map\.cells\[(\d+)\](?:\.(.+))?$/);
    if (!match) return false;
    const profile = session.productionController?.getProfile?.() || session.profile || {};
    const cell = profile.map?.cells?.[Number(match[1])];
    if (!cell) return false;
    session.controller?.select?.(cell.id);
    const inspector = session.controller?.inspector?.root || session.workspace?.querySelector?.('.kaysender-surface-inspector');
    return focusTarget(inspector?.querySelector?.(`[name="${match[2] || 'id'}"]`) || inspector);
  }

  function focusCollectionPath(session, path) {
    const profile = session.productionController?.getProfile?.() || session.profile || {};
    for (const [panelId, definition] of Object.entries(modelApi.COLLECTIONS)) {
      const prefix = `${definition.path}[`;
      if (!path.startsWith(prefix)) continue;
      const remainder = path.slice(prefix.length);
      const closing = remainder.indexOf(']');
      if (closing < 0) return false;
      const index = Number(remainder.slice(0, closing));
      const fieldName = remainder.slice(closing + 1).replace(/^\./, '') || definition.idField;
      const record = modelApi.getAt(profile, definition.path, [])[index];
      if (!record) return false;
      const panel = session.productionRoot?.querySelector?.(`[data-panel-id="${panelId}"]`);
      if (!panel) return false;
      panel.open = true;
      const card = panel.querySelector(`[data-record-id="${record.id}"]`);
      return focusTarget(card?.querySelector?.(`[name="${fieldName}"]`) || card || panel);
    }
    return false;
  }

  function focusScalarPath(session, path) {
    const definition = panelsApi.SCALAR_PANELS?.find(panel => panel.fields.some(field => field.path === path));
    if (!definition) return false;
    const panel = session.productionRoot?.querySelector?.(`[data-panel-id="${definition.id}"]`);
    if (!panel) return false;
    panel.open = true;
    return focusTarget(panel.querySelector(`[name="${path}"]`) || panel);
  }

  function focusReferencePath(session, path) {
    return focusMapPath(session, path) || focusCollectionPath(session, path) || focusScalarPath(session, path);
  }

  function enhanceDiagnosticEntry(entry, session) {
    if (!(entry instanceof HTMLElement) || entry.dataset.referenceNavigation === 'true') return;
    const paths = unique((entry.textContent.match(pathPattern) || []).filter(path => path.includes('.') || path.includes('[')));
    if (!paths.length) return;
    entry.dataset.referenceNavigation = 'true';
    const actions = document.createElement('div');
    actions.className = 'island-reference-repair-actions';
    paths.forEach(path => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'island-reference-repair-button';
      button.textContent = `Go to ${path}`;
      button.addEventListener('click', () => {
        if (!focusReferencePath(session, path)) {
          button.disabled = true;
          button.textContent = `Unavailable: ${path}`;
        }
      });
      actions.appendChild(button);
    });
    entry.appendChild(actions);
  }

  function installDiagnosticNavigation(panelRoot) {
    const editorPanel = panelRoot.closest('.editor-panel') || document.getElementById('kaysender-editor-panel');
    const session = root.KaysenderIslandV3AdapterFactory?.getSession?.(editorPanel);
    if (!session?.diagnosticList || session.diagnosticList.dataset.referenceObserver === 'true') return;
    session.diagnosticList.dataset.referenceObserver = 'true';
    session.diagnosticList.querySelectorAll('li').forEach(entry => enhanceDiagnosticEntry(entry, session));
    const observer = new MutationObserver(records => {
      records.forEach(record => record.addedNodes.forEach(node => {
        if (node instanceof HTMLElement && node.matches('li')) enhanceDiagnosticEntry(node, session);
        node.querySelectorAll?.('li').forEach(entry => enhanceDiagnosticEntry(entry, session));
      }));
    });
    observer.observe(session.diagnosticList, { childList: true, subtree: true });
    session.referenceNavigationObserver = observer;
  }

  function markLiveWorkspace(panelRoot) {
    const workspace = panelRoot.closest('.island-v3-workspace');
    if (!workspace) return;
    workspace.dataset.preparedRuntime = 'active-production';
    const heading = workspace.querySelector(':scope > .section-heading');
    const eyebrow = heading?.querySelector('.eyebrow');
    const title = heading?.querySelector('h3');
    const note = heading?.querySelector('.helper-note');
    if (eyebrow) eyebrow.textContent = 'P1 Production Profile 3.0.0';
    if (title) title.textContent = 'Floating Island Production Editor';
    if (note) note.textContent = 'Structured ledgers and the surface grid are authoritative. Linked-record controls and diagnostic navigation replace manual ID hunting.';
    const stage = document.querySelector('#kaysender-mainline-editor-shell .mainline-editor-stage');
    if (stage) stage.textContent = 'P1 Floating Island Production Editor';
  }

  function surfaceRecords(profile) {
    return [
      ...(profile?.hydrology?.sources || []).map(record => ({ family: 'water', record })),
      ...(profile?.sites || []).map(record => ({ family: 'site', record })),
      ...(profile?.resources?.nodes || []).map(record => ({ family: 'resource', record })),
      ...(profile?.hazards || []).map(record => ({ family: 'hazard', record }))
    ];
  }

  class LiveSurfaceController extends surfaceApi.IslandSurfaceGridController {
    constructor(options = {}) {
      super(options);
      this.profileListener = event => this.syncRecordBrushes(event.detail?.profile || {});
      document.addEventListener('kaysender-island-profile-records-changed', this.profileListener);
      this.syncRecordBrushes(options.profile || this.profile);
    }

    syncRecordBrushes(profileInput = this.profile) {
      const fixed = (this.palette || []).filter(brush => !referenceFamilies.has(brush.family));
      const linked = surfaceRecords(profileInput || {}).map(({ family, record }) => brushApi.createReferenceBrush({
        family,
        referenceId: record.id,
        label: record.name || record.type || record.resourceType || record.id
      }));
      const clear = [...referenceFamilies].map(family => brushApi.createUnlinkBrush({ family, label: `Clear ${family} links` }));
      this.palette = [...fixed, ...linked, ...clear];
      const selected = this.palette.some(brush => brush.id === this.view.brushId) ? this.view.brushId : this.palette[0]?.id;
      this.toolbar.setPalette(this.palette, selected);
      return this.palette;
    }

    replaceProfile(profile, options = {}) {
      const result = super.replaceProfile(profile, options);
      this.syncRecordBrushes(profile);
      return result;
    }

    destroy() {
      document.removeEventListener('kaysender-island-profile-records-changed', this.profileListener);
      super.destroy();
    }
  }

  class LiveReferencePanels extends panelsApi.IslandProductionPanels {
    render() {
      super.render();
      markLiveWorkspace(this.root);
      Object.entries(SINGLE).forEach(([panelId, fields]) => {
        const panel = this.root.querySelector(`[data-panel-id="${panelId}"]`);
        if (panel) Object.entries(fields).forEach(([field, source]) => addDatalist(this.model, panel, panelId, field, source));
      });
      Object.entries(MANY).forEach(([panelId, fields]) => {
        const panel = this.root.querySelector(`[data-panel-id="${panelId}"]`);
        if (panel) Object.entries(fields).forEach(([field, source]) => addPicker(this.model, panel, field, source));
      });
      installDiagnosticNavigation(this.root);
      document.dispatchEvent(new CustomEvent('kaysender-island-profile-records-changed', {
        detail: { profile: clone(this.model.getProfile()) }
      }));
    }
  }

  root.KaysenderIslandSurfaceGridController = Object.freeze({ ...surfaceApi, IslandSurfaceGridController: LiveSurfaceController });
  root.KaysenderIslandV3Panels = Object.freeze({
    ...panelsApi,
    IslandProductionPanels: LiveReferencePanels,
    REFERENCE_SOURCES: SINGLE,
    REFERENCE_PICKERS: MANY,
    focusReferencePath
  });
})();
