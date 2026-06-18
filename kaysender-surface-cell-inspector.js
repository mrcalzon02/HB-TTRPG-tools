(() => {
  'use strict';

  const root = typeof window !== 'undefined' ? window : globalThis;
  const clone = value => JSON.parse(JSON.stringify(value));
  const uniqueTextList = value => [...new Set(String(value || '').split(',').map(item => item.trim()).filter(Boolean))];
  const numeric = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
  const clamp = (value, minimum, maximum) => Math.max(minimum, Math.min(maximum, numeric(value, minimum)));

  const FIELD_DEFINITIONS = Object.freeze([
    { id: 'id', label: 'Stable Cell ID', type: 'text', readOnly: true },
    { id: 'x', label: 'Grid X', type: 'number', readOnly: true },
    { id: 'y', label: 'Grid Y', type: 'number', readOnly: true },
    { id: 'active', label: 'Active Island Surface', type: 'checkbox' },
    { id: 'areaKm2', label: 'Cell Area (km²)', type: 'number', min: 0, step: 0.01 },
    { id: 'terrainType', label: 'Terrain Type', type: 'text' },
    { id: 'elevationM', label: 'Elevation (m)', type: 'number', step: 1 },
    { id: 'slopeClass', label: 'Slope Class', type: 'text' },
    { id: 'usablePercent', label: 'Usable Surface (%)', type: 'number', min: 0, max: 100, step: 0.1 },
    { id: 'arablePercent', label: 'Arable Surface (%)', type: 'number', min: 0, max: 100, step: 0.1 },
    { id: 'waterCatchmentId', label: 'Water Catchment ID', type: 'text' },
    { id: 'siteIds', label: 'Site IDs', type: 'list' },
    { id: 'resourceNodeIds', label: 'Resource Node IDs', type: 'list' },
    { id: 'hazardIds', label: 'Hazard IDs', type: 'list' }
  ]);

  function normalizePatch(input = {}) {
    const patch = {};
    if ('active' in input) patch.active = Boolean(input.active);
    if ('areaKm2' in input) patch.areaKm2 = Math.max(0, numeric(input.areaKm2));
    if ('terrainType' in input) patch.terrainType = String(input.terrainType || 'unassigned').trim() || 'unassigned';
    if ('elevationM' in input) patch.elevationM = numeric(input.elevationM);
    if ('slopeClass' in input) patch.slopeClass = String(input.slopeClass || 'unknown').trim() || 'unknown';
    if ('usablePercent' in input) patch.usablePercent = clamp(input.usablePercent, 0, 100);
    if ('arablePercent' in input) patch.arablePercent = clamp(input.arablePercent, 0, 100);
    if ('waterCatchmentId' in input) patch.waterCatchmentId = String(input.waterCatchmentId || '').trim() || null;
    if ('siteIds' in input) patch.siteIds = Array.isArray(input.siteIds) ? [...new Set(input.siteIds.map(String).filter(Boolean))] : uniqueTextList(input.siteIds);
    if ('resourceNodeIds' in input) patch.resourceNodeIds = Array.isArray(input.resourceNodeIds) ? [...new Set(input.resourceNodeIds.map(String).filter(Boolean))] : uniqueTextList(input.resourceNodeIds);
    if ('hazardIds' in input) patch.hazardIds = Array.isArray(input.hazardIds) ? [...new Set(input.hazardIds.map(String).filter(Boolean))] : uniqueTextList(input.hazardIds);
    return patch;
  }

  function inspectorState(cell, options = {}) {
    if (!cell) return { cell: null, fields: [], diagnostics: [] };
    const diagnostics = typeof options.diagnosticsProvider === 'function'
      ? options.diagnosticsProvider(clone(cell)) || []
      : [];
    const fields = FIELD_DEFINITIONS.map(definition => {
      const path = `map.cells.${cell.id}.${definition.id}`;
      const locked = typeof options.isFieldLocked === 'function' ? Boolean(options.isFieldLocked(path, cell, definition)) : false;
      return {
        ...definition,
        path,
        locked,
        value: Array.isArray(cell[definition.id]) ? cell[definition.id].join(', ') : cell[definition.id]
      };
    });
    return { cell: clone(cell), fields, diagnostics: clone(diagnostics) };
  }

  function applyInspectorPatch(model, cell, input = {}) {
    if (!model || !cell) throw new Error('Surface cell inspector requires a model and selected cell.');
    const patch = normalizePatch(input);
    const activate = 'active' in patch ? patch.active : cell.active;
    delete patch.active;
    return model.setCell(cell.x, cell.y, patch, { activate });
  }

  class SurfaceCellInspector {
    constructor(options = {}) {
      if (!options.root || !(options.root instanceof Element)) throw new Error('Surface cell inspector requires a root Element.');
      if (!options.model || typeof options.model.getCell !== 'function') throw new Error('Surface cell inspector requires a surface-grid model.');
      this.root = options.root;
      this.model = options.model;
      this.isFieldLocked = options.isFieldLocked || null;
      this.diagnosticsProvider = options.diagnosticsProvider || (cell => this.model.validate().filter(item => item.path.includes(`[${cell.x},${cell.y}]`)));
      this.onChange = typeof options.onChange === 'function' ? options.onChange : null;
      this.selected = options.selected || { x: 0, y: 0 };
      this.unsubscribe = this.model.subscribe(event => {
        if (['cell-changed', 'cell-erased', 'cell-moved', 'grid-resized'].includes(event.type)) this.render();
      });
      this.render();
    }

    select(cellOrCoordinates) {
      if (!cellOrCoordinates) return;
      const x = Number(cellOrCoordinates.x);
      const y = Number(cellOrCoordinates.y);
      if (!this.model.inBounds(x, y)) return;
      this.selected = { x, y };
      this.render();
    }

    getSelectedCell() {
      return this.model.getCell(this.selected.x, this.selected.y);
    }

    #fieldControl(field) {
      const wrapper = document.createElement('label');
      wrapper.className = `surface-inspector-field field-${field.id}${field.locked ? ' locked' : ''}`;
      const caption = document.createElement('span');
      caption.textContent = field.label;
      wrapper.appendChild(caption);

      const input = document.createElement('input');
      input.name = field.id;
      input.type = field.type === 'list' ? 'text' : field.type;
      input.readOnly = Boolean(field.readOnly);
      input.disabled = Boolean(field.locked);
      if (field.type === 'checkbox') input.checked = Boolean(field.value);
      else input.value = field.value ?? '';
      if (field.min !== undefined) input.min = String(field.min);
      if (field.max !== undefined) input.max = String(field.max);
      if (field.step !== undefined) input.step = String(field.step);
      input.dataset.fieldPath = field.path;
      if (field.type === 'list') input.placeholder = 'Comma-separated stable IDs';
      wrapper.appendChild(input);

      if (field.locked) {
        const status = document.createElement('small');
        status.textContent = 'Locked by the active profile envelope';
        wrapper.appendChild(status);
      }
      return wrapper;
    }

    #readForm(form) {
      const data = new FormData(form);
      const active = form.elements.namedItem('active');
      return {
        active: Boolean(active?.checked),
        areaKm2: data.get('areaKm2'),
        terrainType: data.get('terrainType'),
        elevationM: data.get('elevationM'),
        slopeClass: data.get('slopeClass'),
        usablePercent: data.get('usablePercent'),
        arablePercent: data.get('arablePercent'),
        waterCatchmentId: data.get('waterCatchmentId'),
        siteIds: data.get('siteIds'),
        resourceNodeIds: data.get('resourceNodeIds'),
        hazardIds: data.get('hazardIds')
      };
    }

    render() {
      this.root.classList.add('kaysender-surface-inspector');
      this.root.replaceChildren();
      const cell = this.getSelectedCell();
      if (!cell) {
        const empty = document.createElement('p');
        empty.textContent = 'Select a valid Island surface cell.';
        this.root.appendChild(empty);
        return;
      }
      const state = inspectorState(cell, {
        isFieldLocked: this.isFieldLocked,
        diagnosticsProvider: this.diagnosticsProvider
      });

      const heading = document.createElement('div');
      heading.className = 'surface-inspector-heading';
      const identity = document.createElement('strong');
      identity.textContent = cell.id;
      const coordinate = document.createElement('small');
      coordinate.textContent = `coordinate ${cell.x},${cell.y} · ${cell.active ? 'active surface' : 'inactive space'}`;
      heading.append(identity, coordinate);
      this.root.appendChild(heading);

      const form = document.createElement('form');
      form.className = 'surface-inspector-form';
      state.fields.forEach(field => form.appendChild(this.#fieldControl(field)));

      const actions = document.createElement('div');
      actions.className = 'surface-inspector-actions';
      const apply = document.createElement('button');
      apply.type = 'submit';
      apply.textContent = 'Apply Cell Changes';
      actions.appendChild(apply);
      const erase = document.createElement('button');
      erase.type = 'button';
      erase.textContent = 'Erase Cell Content';
      erase.addEventListener('click', () => {
        const previous = this.getSelectedCell();
        const next = this.model.eraseCell(previous.x, previous.y);
        this.onChange?.({ type: 'inspector-erased', previous, cell: next });
      });
      actions.appendChild(erase);
      form.appendChild(actions);

      form.addEventListener('submit', event => {
        event.preventDefault();
        const previous = this.getSelectedCell();
        const next = applyInspectorPatch(this.model, previous, this.#readForm(form));
        this.onChange?.({ type: 'inspector-applied', previous, cell: next });
      });
      this.root.appendChild(form);

      const diagnostics = document.createElement('div');
      diagnostics.className = 'surface-inspector-diagnostics';
      const title = document.createElement('strong');
      title.textContent = 'Cell Diagnostics';
      diagnostics.appendChild(title);
      if (state.diagnostics.length === 0) {
        const clear = document.createElement('p');
        clear.textContent = 'No cell-specific diagnostics.';
        diagnostics.appendChild(clear);
      } else {
        const list = document.createElement('ul');
        state.diagnostics.forEach(item => {
          const entry = document.createElement('li');
          entry.className = `severity-${item.severity || 'info'}`;
          entry.textContent = `${item.code || 'diagnostic'}: ${item.message || ''}`;
          list.appendChild(entry);
        });
        diagnostics.appendChild(list);
      }
      this.root.appendChild(diagnostics);
    }

    destroy() {
      this.unsubscribe?.();
      this.root.replaceChildren();
      this.root.classList.remove('kaysender-surface-inspector');
    }
  }

  const api = Object.freeze({
    FIELD_DEFINITIONS,
    SurfaceCellInspector,
    applyInspectorPatch,
    inspectorState,
    normalizePatch
  });

  root.KaysenderSurfaceCellInspector = api;
})();
