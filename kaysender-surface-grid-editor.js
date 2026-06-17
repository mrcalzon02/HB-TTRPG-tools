(() => {
  'use strict';

  const DEFAULT_CELL = Object.freeze({
    areaKm2: 0,
    terrainType: 'unassigned',
    elevationM: 0,
    slopeClass: 'unknown',
    usablePercent: 0,
    arablePercent: 0,
    waterCatchmentId: null,
    siteIds: Object.freeze([]),
    resourceNodeIds: Object.freeze([]),
    hazardIds: Object.freeze([]),
    active: false
  });

  const clone = value => JSON.parse(JSON.stringify(value));
  const coordinateKey = (x, y) => `${x},${y}`;
  const defaultCellId = (x, y) => `cell-${x}-${y}`;
  const clampInteger = (value, minimum = 0) => Math.max(minimum, Math.floor(Number(value) || 0));
  const slug = value => String(value || 'unassigned').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'unassigned';

  function normalizeCell(input = {}, x = 0, y = 0) {
    return {
      ...clone(DEFAULT_CELL),
      ...clone(input),
      id: String(input.id || defaultCellId(x, y)),
      x: clampInteger(input.x ?? x),
      y: clampInteger(input.y ?? y),
      areaKm2: Math.max(0, Number(input.areaKm2) || 0),
      elevationM: Number(input.elevationM) || 0,
      usablePercent: Math.max(0, Math.min(100, Number(input.usablePercent) || 0)),
      arablePercent: Math.max(0, Math.min(100, Number(input.arablePercent) || 0)),
      siteIds: [...new Set(input.siteIds || [])],
      resourceNodeIds: [...new Set(input.resourceNodeIds || [])],
      hazardIds: [...new Set(input.hazardIds || [])],
      active: Boolean(input.active)
    };
  }

  class SurfaceGridModel {
    constructor(input = {}) {
      this.columns = clampInteger(input.columns, 1);
      this.rows = clampInteger(input.rows, 1);
      this.listeners = new Set();
      this.cellsByCoordinate = new Map();
      this.cellsById = new Map();
      const activeIds = new Set(input.activeCellIds || []);
      for (const source of input.cells || []) {
        const cell = normalizeCell({ ...source, active: source.active ?? activeIds.has(source.id) }, source.x, source.y);
        this.#store(cell);
      }
    }

    #store(cell) {
      const existingAtCoordinate = this.cellsByCoordinate.get(coordinateKey(cell.x, cell.y));
      if (existingAtCoordinate && existingAtCoordinate.id !== cell.id) this.cellsById.delete(existingAtCoordinate.id);
      const existingById = this.cellsById.get(cell.id);
      if (existingById && coordinateKey(existingById.x, existingById.y) !== coordinateKey(cell.x, cell.y)) {
        this.cellsByCoordinate.delete(coordinateKey(existingById.x, existingById.y));
      }
      this.cellsByCoordinate.set(coordinateKey(cell.x, cell.y), cell);
      this.cellsById.set(cell.id, cell);
      return cell;
    }

    #emit(type, detail = {}) {
      const event = Object.freeze({ type, model: this, ...detail });
      this.listeners.forEach(listener => {
        try {
          listener(event);
        } catch (error) {
          console.error('Surface grid listener failed.', error);
        }
      });
    }

    subscribe(listener) {
      if (typeof listener !== 'function') throw new Error('Surface grid listener must be a function.');
      this.listeners.add(listener);
      return () => this.listeners.delete(listener);
    }

    inBounds(x, y) {
      return Number.isInteger(x) && Number.isInteger(y) && x >= 0 && y >= 0 && x < this.columns && y < this.rows;
    }

    getCell(x, y) {
      if (!this.inBounds(x, y)) return null;
      const existing = this.cellsByCoordinate.get(coordinateKey(x, y));
      return existing ? clone(existing) : normalizeCell({}, x, y);
    }

    getCellById(id) {
      const cell = this.cellsById.get(id);
      return cell ? clone(cell) : null;
    }

    setCell(x, y, patch = {}, options = {}) {
      if (!this.inBounds(x, y)) throw new Error(`Surface cell ${x},${y} is outside the ${this.columns}×${this.rows} grid.`);
      const current = this.getCell(x, y);
      const next = normalizeCell({
        ...current,
        ...clone(patch),
        x,
        y,
        id: patch.id || current.id || defaultCellId(x, y),
        active: options.activate ?? patch.active ?? true
      }, x, y);
      this.#store(next);
      this.#emit('cell-changed', { cell: clone(next), previous: current });
      return clone(next);
    }

    eraseCell(x, y, options = {}) {
      if (!this.inBounds(x, y)) return null;
      const current = this.getCell(x, y);
      const next = normalizeCell({
        id: options.preserveId === false ? defaultCellId(x, y) : current.id,
        x,
        y,
        areaKm2: options.areaKm2 ?? current.areaKm2,
        active: false
      }, x, y);
      this.#store(next);
      this.#emit('cell-erased', { cell: clone(next), previous: current });
      return clone(next);
    }

    moveCell(fromX, fromY, toX, toY) {
      if (!this.inBounds(fromX, fromY) || !this.inBounds(toX, toY)) throw new Error('Surface cell move is outside the grid.');
      const source = this.getCell(fromX, fromY);
      const destination = this.getCell(toX, toY);
      this.setCell(toX, toY, { ...source, x: toX, y: toY }, { activate: source.active });
      this.eraseCell(fromX, fromY, { preserveId: false, areaKm2: destination.areaKm2 });
      this.#emit('cell-moved', { from: { x: fromX, y: fromY }, to: { x: toX, y: toY }, cell: this.getCell(toX, toY) });
    }

    resize(columns, rows, options = {}) {
      const nextColumns = clampInteger(columns, 1);
      const nextRows = clampInteger(rows, 1);
      const removed = [];
      if (options.preserve !== false) {
        for (const cell of this.cellsByCoordinate.values()) {
          if (cell.x >= nextColumns || cell.y >= nextRows) removed.push(clone(cell));
        }
      } else {
        removed.push(...this.listCells({ includeInactive: true }));
      }
      if (options.preserve === false) {
        this.cellsByCoordinate.clear();
        this.cellsById.clear();
      } else {
        removed.forEach(cell => {
          this.cellsByCoordinate.delete(coordinateKey(cell.x, cell.y));
          this.cellsById.delete(cell.id);
        });
      }
      const previous = { columns: this.columns, rows: this.rows };
      this.columns = nextColumns;
      this.rows = nextRows;
      this.#emit('grid-resized', { previous, current: { columns: this.columns, rows: this.rows }, removed });
      return removed;
    }

    listCells(options = {}) {
      const includeInactive = options.includeInactive === true;
      const cells = [];
      for (let y = 0; y < this.rows; y += 1) {
        for (let x = 0; x < this.columns; x += 1) {
          const cell = this.getCell(x, y);
          if (includeInactive || cell.active) cells.push(cell);
        }
      }
      return cells;
    }

    validate() {
      const diagnostics = [];
      const ids = new Set();
      for (const cell of this.listCells({ includeInactive: true })) {
        if (ids.has(cell.id)) diagnostics.push({ severity: 'error', code: 'duplicate-cell-id', message: `Cell ID ${cell.id} is duplicated.`, path: `map.cells[${cell.x},${cell.y}].id` });
        ids.add(cell.id);
        if (cell.active && cell.areaKm2 <= 0) diagnostics.push({ severity: 'warning', code: 'active-cell-area-missing', message: `Active cell ${cell.id} has no surface area.`, path: `map.cells[${cell.x},${cell.y}].areaKm2` });
        if (cell.arablePercent > cell.usablePercent) diagnostics.push({ severity: 'warning', code: 'arable-exceeds-usable', message: `Cell ${cell.id} has more arable area than usable area.`, path: `map.cells[${cell.x},${cell.y}].arablePercent` });
      }
      return diagnostics;
    }

    toMap() {
      const cells = this.listCells({ includeInactive: true });
      return {
        columns: this.columns,
        rows: this.rows,
        activeCellIds: cells.filter(cell => cell.active).map(cell => cell.id),
        cells: cells.map(({ active, ...cell }) => cell)
      };
    }
  }

  class SurfaceGridView {
    constructor(options = {}) {
      if (!options.root || !(options.root instanceof Element)) throw new Error('Surface grid view requires a root Element.');
      if (!(options.model instanceof SurfaceGridModel)) throw new Error('Surface grid view requires a SurfaceGridModel.');
      this.root = options.root;
      this.model = options.model;
      this.palette = [...(options.palette || [])];
      this.brushId = options.brushId || this.palette[0]?.id || null;
      this.selected = options.selected || { x: 0, y: 0 };
      this.compatibility = typeof options.compatibility === 'function' ? options.compatibility : () => true;
      this.onSelectionChange = typeof options.onSelectionChange === 'function' ? options.onSelectionChange : null;
      this.onCellChange = typeof options.onCellChange === 'function' ? options.onCellChange : null;
      this.unsubscribe = this.model.subscribe(event => {
        this.render();
        this.onCellChange?.(event);
      });
      this.render();
    }

    getBrush() {
      return this.palette.find(brush => brush.id === this.brushId) || null;
    }

    setBrush(brushId) {
      if (!this.palette.some(brush => brush.id === brushId)) throw new Error(`Unknown surface brush ${brushId}.`);
      this.brushId = brushId;
      this.render();
    }

    setPalette(palette = [], brushId = null) {
      this.palette = [...palette];
      this.brushId = brushId || this.palette.find(item => item.id === this.brushId)?.id || this.palette[0]?.id || null;
      this.render();
    }

    select(x, y, focus = false) {
      if (!this.model.inBounds(x, y)) return;
      this.selected = { x, y };
      this.render();
      this.onSelectionChange?.(this.model.getCell(x, y));
      if (focus) this.root.querySelector(`[data-surface-x="${x}"][data-surface-y="${y}"]`)?.focus();
    }

    applyBrush(x, y) {
      const brush = this.getBrush();
      const cell = this.model.getCell(x, y);
      if (!brush || !this.compatibility(cell, brush)) return false;
      const patch = typeof brush.apply === 'function' ? brush.apply(clone(cell), this.model) : clone(brush.patch || {});
      this.model.setCell(x, y, patch, { activate: brush.activate ?? true });
      this.select(x, y);
      return true;
    }

    erase(x, y) {
      this.model.eraseCell(x, y);
      this.select(x, y);
    }

    #keyboard(event, x, y) {
      const moves = {
        ArrowLeft: [-1, 0],
        ArrowRight: [1, 0],
        ArrowUp: [0, -1],
        ArrowDown: [0, 1]
      };
      if (moves[event.key]) {
        event.preventDefault();
        const [dx, dy] = moves[event.key];
        this.select(x + dx, y + dy, true);
        return;
      }
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        this.applyBrush(x, y);
      }
      if (event.key === 'Delete' || event.key === 'Backspace') {
        event.preventDefault();
        this.erase(x, y);
      }
    }

    render() {
      const brush = this.getBrush();
      this.root.classList.add('kaysender-surface-grid');
      this.root.style.setProperty('--surface-grid-columns', String(this.model.columns));
      this.root.replaceChildren();
      for (let y = 0; y < this.model.rows; y += 1) {
        for (let x = 0; x < this.model.columns; x += 1) {
          const cell = this.model.getCell(x, y);
          const compatible = !brush || this.compatibility(cell, brush);
          const button = document.createElement('button');
          button.type = 'button';
          button.className = [
            'kaysender-surface-cell',
            cell.active ? 'active' : 'inactive',
            `terrain-${slug(cell.terrainType)}`,
            this.selected.x === x && this.selected.y === y ? 'selected' : '',
            compatible ? '' : 'incompatible'
          ].filter(Boolean).join(' ');
          button.dataset.surfaceX = String(x);
          button.dataset.surfaceY = String(y);
          button.dataset.cellId = cell.id;
          button.setAttribute('aria-label', `${cell.id}, ${cell.terrainType}, ${cell.active ? 'active surface' : 'inactive space'}, coordinate ${x},${y}`);
          button.title = `${cell.id} [${x},${y}] · ${cell.terrainType} · ${cell.areaKm2} km²${compatible ? '' : ' · selected brush is incompatible'}`;
          button.innerHTML = `<span class="surface-cell-code">${cell.active ? String(cell.terrainType || '?').slice(0, 2).toUpperCase() : '·'}</span><span class="surface-cell-coordinate">${x},${y}</span>`;
          button.addEventListener('click', () => this.applyBrush(x, y));
          button.addEventListener('contextmenu', event => {
            event.preventDefault();
            this.erase(x, y);
          });
          button.addEventListener('focus', () => {
            if (this.selected.x !== x || this.selected.y !== y) this.select(x, y);
          });
          button.addEventListener('keydown', event => this.#keyboard(event, x, y));
          this.root.appendChild(button);
        }
      }
    }

    destroy() {
      this.unsubscribe?.();
      this.root.replaceChildren();
      this.root.classList.remove('kaysender-surface-grid');
    }
  }

  function createModelFromProfile(profile) {
    return new SurfaceGridModel(profile?.map || profile || {});
  }

  function mount(root, options = {}) {
    const model = options.model instanceof SurfaceGridModel
      ? options.model
      : createModelFromProfile(options.profile || options.map || {});
    return new SurfaceGridView({ ...options, root, model });
  }

  const api = Object.freeze({
    DEFAULT_CELL,
    SurfaceGridModel,
    SurfaceGridView,
    createModelFromProfile,
    mount,
    normalizeCell
  });

  window.KaysenderSurfaceGridEditor = api;
  if (typeof globalThis !== 'undefined') globalThis.KaysenderSurfaceGridEditor = api;
})();
