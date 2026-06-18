(() => {
  'use strict';

  const root = window;
  const base = root.KaysenderIslandV3Panels;
  if (!base?.IslandProductionPanels) throw new Error('Island production panels must load before reference pickers.');

  const PICKERS = Object.freeze({
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
    settlementSlots: {
      waterSourceIds: 'waterSources',
      landingZoneIds: 'landingZones'
    },
    routeNodes: { landingZoneIds: 'landingZones' }
  });

  const unique = values => [...new Set((values || []).map(value => String(value).trim()).filter(Boolean))];

  function availableRecords(model, source) {
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

  function readIds(input) {
    return unique(String(input.value || '').split(','));
  }

  function writeIds(input, ids) {
    input.value = unique(ids).join(', ');
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function mountPicker(model, input, source) {
    if (input.dataset.referencePicker === 'true') return;
    input.dataset.referencePicker = 'true';

    const picker = document.createElement('fieldset');
    picker.className = 'island-reference-picker';
    picker.dataset.referenceField = input.name;

    const legend = document.createElement('legend');
    legend.textContent = 'Linked records';
    picker.appendChild(legend);

    const choices = document.createElement('div');
    choices.className = 'island-reference-picker-choices';
    const records = availableRecords(model, source);

    records.forEach(record => {
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
        const current = readIds(input);
        writeIds(input, current.includes(record.id)
          ? current.filter(id => id !== record.id)
          : [...current, record.id]);
        refresh();
      });
      input.addEventListener('input', refresh);
      refresh();
      choices.appendChild(button);
    });

    if (!records.length) {
      const empty = document.createElement('p');
      empty.className = 'helper-note';
      empty.textContent = 'No compatible records are available yet.';
      choices.appendChild(empty);
    }

    const clear = document.createElement('button');
    clear.type = 'button';
    clear.className = 'island-reference-clear';
    clear.textContent = 'Clear links';
    clear.addEventListener('click', () => {
      writeIds(input, []);
      choices.querySelectorAll('.island-reference-choice').forEach(button => {
        button.classList.remove('selected');
        button.setAttribute('aria-pressed', 'false');
      });
    });

    picker.append(choices, clear);
    input.insertAdjacentElement('afterend', picker);
  }

  class ReferencePickerPanels extends base.IslandProductionPanels {
    render() {
      super.render();
      Object.entries(PICKERS).forEach(([panelId, fields]) => {
        const panel = this.root.querySelector(`[data-panel-id="${panelId}"]`);
        if (!panel) return;
        Object.entries(fields).forEach(([fieldName, source]) => {
          panel.querySelectorAll(`[name="${fieldName}"]`).forEach(input => mountPicker(this.model, input, source));
        });
      });
    }
  }

  root.KaysenderIslandV3Panels = Object.freeze({
    ...base,
    IslandProductionPanels: ReferencePickerPanels,
    REFERENCE_PICKERS: PICKERS
  });
})();
