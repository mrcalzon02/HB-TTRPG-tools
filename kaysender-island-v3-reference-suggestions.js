(() => {
  'use strict';

  const root = window;
  const panelBase = root.KaysenderIslandV3Panels;
  const surfaceBase = root.KaysenderIslandSurfaceGridController;
  const brushApi = root.KaysenderSurfaceGridBrushes;
  if (!panelBase?.IslandProductionPanels) throw new Error('Island production panels must load before reference suggestions.');
  if (!surfaceBase?.IslandSurfaceGridController || !brushApi) throw new Error('Island surface controller must load before reference suggestions.');

  const SOURCES = Object.freeze({
    'route-capability': {
      'routeNodeExport.defaultNodeId': 'routeNodes'
    },
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

  const referenceFamilies = new Set(['water', 'site', 'resource', 'hazard']);
  const clone = value => JSON.parse(JSON.stringify(value));

  function records(model, source) {
    if (source === 'mapCells') {
      return (model.get('map.cells', []) || []).map(cell => ({
        id: cell.id,
        label: `${cell.terrainType || 'unassigned'} [${cell.x},${cell.y}]${cell.active ? '' : ' inactive'}`
      }));
    }
    return model.listRecords(source).map(record => ({
      id: record.id,
      label: record.name || record.type || record.resourceType || record.role || record.status || ''
    }));
  }

  function addSuggestions(model, panel, panelId, fieldName, source) {
    panel.querySelectorAll(`[name="${fieldName}"]`).forEach((input, index) => {
      if (input.dataset.referenceSuggestions === 'true') return;
      const listId = `island-reference-${panelId}-${fieldName.replace(/[^a-z0-9]+/gi, '-')}-${index}`;
      const datalist = document.createElement('datalist');
      datalist.id = listId;
      records(model, source).forEach(record => {
        const option = document.createElement('option');
        option.value = record.id;
        option.label = record.label;
        datalist.appendChild(option);
      });
      input.setAttribute('list', listId);
      input.dataset.referenceSuggestions = 'true';
      input.insertAdjacentElement('afterend', datalist);
    });
  }

  function surfaceRecords(profile) {
    return [
      ...(profile?.hydrology?.sources || []).map(record => ({ family: 'water', record })),
      ...(profile?.sites || []).map(record => ({ family: 'site', record })),
      ...(profile?.resources?.nodes || []).map(record => ({ family: 'resource', record })),
      ...(profile?.hazards || []).map(record => ({ family: 'hazard', record }))
    ];
  }

  function recordLabel(record) {
    return record.name || record.type || record.resourceType || record.id;
  }

  class RecordBrushSurfaceController extends surfaceBase.IslandSurfaceGridController {
    constructor(options = {}) {
      super(options);
      this.recordBrushListener = event => this.syncRecordBrushes(event.detail?.profile || {});
      document.addEventListener('kaysender-island-profile-records-changed', this.recordBrushListener);
      this.syncRecordBrushes(options.profile || this.profile);
    }

    syncRecordBrushes(profileInput = this.profile) {
      const profile = clone(profileInput || {});
      const fixed = (this.palette || []).filter(brush => !referenceFamilies.has(brush.family));
      const linked = surfaceRecords(profile).map(({ family, record }) => brushApi.createReferenceBrush({
        family,
        referenceId: record.id,
        label: recordLabel(record),
        description: `Link ${record.id} to an active Island surface cell.`
      }));
      const clear = [...referenceFamilies].map(family => brushApi.createUnlinkBrush({
        family,
        label: `Clear ${family} links`
      }));
      this.palette = [...fixed, ...linked, ...clear];
      const selected = this.palette.some(brush => brush.id === this.view.brushId)
        ? this.view.brushId
        : this.palette[0]?.id || null;
      this.toolbar.setPalette(this.palette, selected);
      return this.palette.map(brush => ({ id: brush.id, family: brush.family, label: brush.label }));
    }

    replaceProfile(profile, options = {}) {
      const result = super.replaceProfile(profile, options);
      this.syncRecordBrushes(profile);
      return result;
    }

    destroy() {
      document.removeEventListener('kaysender-island-profile-records-changed', this.recordBrushListener);
      this.recordBrushListener = null;
      super.destroy();
    }
  }

  class ReferenceSuggestionPanels extends panelBase.IslandProductionPanels {
    render() {
      super.render();
      Object.entries(SOURCES).forEach(([panelId, fields]) => {
        const panel = this.root.querySelector(`[data-panel-id="${panelId}"]`);
        if (!panel) return;
        Object.entries(fields).forEach(([fieldName, source]) => {
          addSuggestions(this.model, panel, panelId, fieldName, source);
        });
      });
      document.dispatchEvent(new CustomEvent('kaysender-island-profile-records-changed', {
        detail: { profile: this.model.getProfile() }
      }));
    }
  }

  root.KaysenderIslandSurfaceGridController = Object.freeze({
    ...surfaceBase,
    IslandSurfaceGridController: RecordBrushSurfaceController,
    surfaceRecords
  });

  root.KaysenderIslandV3Panels = Object.freeze({
    ...panelBase,
    IslandProductionPanels: ReferenceSuggestionPanels,
    REFERENCE_SOURCES: SOURCES
  });
})();
