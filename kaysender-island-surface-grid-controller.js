(() => {
  'use strict';

  const root = typeof window !== 'undefined' ? window : globalThis;
  const clone = value => JSON.parse(JSON.stringify(value));

  const BRUSH_FIELDS = Object.freeze({
    outline: ['active'],
    terrain: ['terrainType', 'slopeClass', 'usablePercent', 'arablePercent'],
    elevation: ['elevationM'],
    slope: ['slopeClass'],
    water: ['waterCatchmentId'],
    site: ['siteIds'],
    resource: ['resourceNodeIds'],
    hazard: ['hazardIds']
  });

  function normalizeLockPath(path) {
    return String(path || '')
      .replace(/^data\./, '')
      .replace(/\[(\d+)\]/g, '.$1')
      .replace(/\.+/g, '.')
      .replace(/^\.|\.$/g, '');
  }

  function normalizedLocks(locks = []) {
    return [...new Set((locks || []).map(normalizeLockPath).filter(Boolean))];
  }

  function createLockMatcher(locks = []) {
    const normalized = normalizedLocks(locks);
    return path => {
      const target = normalizeLockPath(path);
      return normalized.some(lock => target === lock || target.startsWith(`${lock}.`) || lock.startsWith(`${target}.`));
    };
  }

  function hasParentLock(locks = [], path = '') {
    const target = normalizeLockPath(path);
    return normalizedLocks(locks).some(lock => target === lock || target.startsWith(`${lock}.`));
  }

  function ensureDependencies() {
    const dependencies = {
      grid: root.KaysenderSurfaceGridEditor,
      brushes: root.KaysenderSurfaceGridBrushes,
      toolbar: root.KaysenderSurfaceGridToolbar,
      inspector: root.KaysenderSurfaceCellInspector,
      lifecycle: root.KaysenderEditorLifecycle
    };
    const missing = Object.entries(dependencies).filter(([, value]) => !value).map(([name]) => name);
    if (missing.length) throw new Error(`Island surface editor dependencies are missing: ${missing.join(', ')}.`);
    return dependencies;
  }

  class IslandSurfaceGridController {
    constructor(options = {}) {
      const deps = ensureDependencies();
      if (!options.editorId) throw new Error('Island surface editor requires an editorId.');
      if (!options.gridRoot || !options.toolbarRoot || !options.inspectorRoot) {
        throw new Error('Island surface editor requires grid, toolbar, and inspector root elements.');
      }
      this.editorId = options.editorId;
      this.gridRoot = options.gridRoot;
      this.toolbarRoot = options.toolbarRoot;
      this.inspectorRoot = options.inspectorRoot;
      this.profile = clone(options.profile || {});
      this.getLocks = typeof options.getLocks === 'function' ? options.getLocks : () => options.locks || [];
      this.onProfileChange = typeof options.onProfileChange === 'function' ? options.onProfileChange : null;
      this.onDiagnostics = typeof options.onDiagnostics === 'function' ? options.onDiagnostics : null;
      this.onSelectionChange = typeof options.onSelectionChange === 'function' ? options.onSelectionChange : null;
      this.onInspectorChange = typeof options.onInspectorChange === 'function' ? options.onInspectorChange : null;
      this.compatibilityContext = typeof options.compatibilityContext === 'function'
        ? options.compatibilityContext
        : () => options.compatibilityContext || {};
      this.deps = deps;
      this.lockMatcher = createLockMatcher(this.getLocks());
      this.model = deps.grid.createModelFromProfile(this.profile);
      this.palette = options.palette || deps.brushes.createDefaultPalette({ meanAltitudeM: this.profile.motion?.meanAltitudeM || 0 });
      this.selectedCell = this.model.getCell(0, 0);
      this.#mount();
    }

    #refreshLocks() {
      this.lockMatcher = createLockMatcher(this.getLocks());
    }

    #explicitCellLock(cell) {
      return hasParentLock(this.getLocks(), `map.cells.${cell.id}`);
    }

    #lockedBrushPaths(cell, brush) {
      this.#refreshLocks();
      return (BRUSH_FIELDS[brush.family] || [])
        .map(field => `map.cells.${cell.id}.${field}`)
        .filter(path => this.lockMatcher(path));
    }

    #compatibility(cell, brush) {
      const lockedPaths = this.#lockedBrushPaths(cell, brush);
      if (lockedPaths.length) {
        this.onDiagnostics?.(lockedPaths.map(path => ({
          severity: 'warning',
          code: 'surface-brush-field-locked',
          message: `The selected ${brush.family || 'surface'} brush would change a locked field.`,
          path
        })));
        return false;
      }
      const result = this.deps.brushes.evaluateCompatibility(cell, brush, clone(this.compatibilityContext() || {}));
      if (!result.compatible) this.onDiagnostics?.(result.reasons.map(message => ({
        severity: 'warning',
        code: 'surface-brush-incompatible',
        message,
        path: `map.cells.${cell.id}`
      })));
      return result.compatible;
    }

    #fieldLocked(path) {
      this.#refreshLocks();
      return this.lockMatcher(path);
    }

    #diagnosticsForCell(cell) {
      const diagnostics = this.model.validate().filter(item => item.path.includes(`[${cell.x},${cell.y}]`));
      if (this.#explicitCellLock(cell)) diagnostics.unshift({
        severity: 'info',
        code: 'surface-cell-locked',
        message: 'This cell is locked by the active profile envelope.',
        path: `map.cells.${cell.id}`
      });
      return diagnostics;
    }

    #writeProfile(event, message = 'Island surface map changed.') {
      this.profile.map = this.model.toMap();
      this.deps.lifecycle.markDirty(this.editorId, message);
      const payload = {
        event,
        profile: clone(this.profile),
        map: clone(this.profile.map),
        diagnostics: clone(this.model.validate())
      };
      this.onProfileChange?.(payload);
      this.onDiagnostics?.(payload.diagnostics);
      return payload;
    }

    #mount() {
      this.view = new this.deps.grid.SurfaceGridView({
        root: this.gridRoot,
        model: this.model,
        palette: this.palette,
        compatibility: (cell, brush) => this.#compatibility(cell, brush),
        onSelectionChange: cell => {
          this.selectedCell = cell;
          this.inspector?.select(cell);
          this.onSelectionChange?.(clone(cell));
        },
        onCellChange: event => this.#writeProfile(event)
      });
      this.toolbar = new this.deps.toolbar.SurfaceGridToolbar({
        root: this.toolbarRoot,
        view: this.view,
        brushApi: this.deps.brushes,
        palette: this.palette
      });
      this.inspector = new this.deps.inspector.SurfaceCellInspector({
        root: this.inspectorRoot,
        model: this.model,
        selected: this.selectedCell,
        isFieldLocked: path => this.#fieldLocked(path),
        diagnosticsProvider: cell => this.#diagnosticsForCell(cell),
        onChange: event => {
          this.selectedCell = clone(event.cell);
          this.onInspectorChange?.(clone(event));
        }
      });
    }

    addReferenceBrush(options = {}) {
      const brush = this.deps.brushes.createReferenceBrush(options);
      this.palette = [...this.palette.filter(item => item.id !== brush.id), brush];
      this.toolbar.setPalette(this.palette, brush.id);
      return brush;
    }

    removeReferenceBrush(options = {}) {
      const brush = this.deps.brushes.createUnlinkBrush(options);
      this.palette = [...this.palette.filter(item => item.id !== brush.id), brush];
      this.toolbar.setPalette(this.palette, brush.id);
      return brush;
    }

    selectCell(x, y) {
      this.view.select(x, y, true);
      return this.model.getCell(x, y);
    }

    resize(columns, rows, options = {}) {
      const removed = this.model.resize(columns, rows, { preserve: options.preserve !== false });
      return {
        removed: clone(removed),
        profile: this.getProfile(),
        map: this.getMap(),
        diagnostics: this.validate()
      };
    }

    replaceProfile(profile, options = {}) {
      const nextProfile = clone(profile || {});
      const previousSelection = this.selectedCell ? { x: this.selectedCell.x, y: this.selectedCell.y } : { x: 0, y: 0 };
      this.destroy();
      this.profile = nextProfile;
      this.model = this.deps.grid.createModelFromProfile(this.profile);
      this.palette = options.palette || this.deps.brushes.createDefaultPalette({ meanAltitudeM: this.profile.motion?.meanAltitudeM || 0 });
      this.selectedCell = this.model.getCell(
        Math.min(previousSelection.x, this.model.columns - 1),
        Math.min(previousSelection.y, this.model.rows - 1)
      );
      this.#mount();
      return this.getProfile();
    }

    getProfile() {
      this.profile.map = this.model.toMap();
      return clone(this.profile);
    }

    getMap() {
      return clone(this.model.toMap());
    }

    validate() {
      return clone(this.model.validate());
    }

    destroy() {
      this.inspector?.destroy();
      this.toolbar?.destroy();
      this.view?.destroy();
      this.inspector = null;
      this.toolbar = null;
      this.view = null;
    }
  }

  root.KaysenderIslandSurfaceGridController = Object.freeze({
    BRUSH_FIELDS,
    IslandSurfaceGridController,
    createLockMatcher,
    hasParentLock,
    normalizeLockPath,
    normalizedLocks
  });
})();
