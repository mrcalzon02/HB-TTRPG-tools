(() => {
  'use strict';

  const root = window;
  const base = root.KaysenderIslandV3Panels;
  if (!base?.IslandProductionPanels) throw new Error('Island production panels must load before reference suggestions.');

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

  class ReferenceSuggestionPanels extends base.IslandProductionPanels {
    render() {
      super.render();
      Object.entries(SOURCES).forEach(([panelId, fields]) => {
        const panel = this.root.querySelector(`[data-panel-id="${panelId}"]`);
        if (!panel) return;
        Object.entries(fields).forEach(([fieldName, source]) => {
          addSuggestions(this.model, panel, panelId, fieldName, source);
        });
      });
    }
  }

  root.KaysenderIslandV3Panels = Object.freeze({
    ...base,
    IslandProductionPanels: ReferenceSuggestionPanels,
    REFERENCE_SOURCES: SOURCES
  });
})();
