(() => {
  'use strict';

  const root = typeof window !== 'undefined' ? window : globalThis;
  const clone = value => value === undefined ? undefined : JSON.parse(JSON.stringify(value));
  const integer = (value, fallback = 1) => Math.max(1, Math.trunc(Number.isFinite(Number(value)) ? Number(value) : fallback));
  const unique = values => [...new Set((values || []).filter(Boolean).map(String))];
  const sum = values => values.reduce((total, value) => total + (Number(value) || 0), 0);

  function normalizeProfile(input = {}) {
    const profile = clone(input || {});
    profile.map = profile.map || { columns: 1, rows: 1, activeCellIds: [], cells: [] };
    profile.map.columns = integer(profile.map.columns);
    profile.map.rows = integer(profile.map.rows);
    profile.map.activeCellIds = unique(profile.map.activeCellIds);
    profile.map.cells = Array.isArray(profile.map.cells) ? profile.map.cells : [];
    return profile;
  }

  function cellRemovalSet(profile, columns, rows, preserve = true) {
    const map = profile.map;
    const nextColumns = integer(columns, map.columns);
    const nextRows = integer(rows, map.rows);
    const removedCells = preserve
      ? map.cells.filter(cell => Number(cell.x) >= nextColumns || Number(cell.y) >= nextRows)
      : [...map.cells];
    return {
      nextColumns,
      nextRows,
      removedCells: clone(removedCells),
      removedCellIds: new Set(removedCells.map(cell => cell.id))
    };
  }

  function collectCellReferences(profileInput, cellIdsInput) {
    const profile = normalizeProfile(profileInput);
    const cellIds = new Set(cellIdsInput || []);
    const direct = [];
    const dependent = [];
    const addDirect = (kind, entity, path, affectedCellIds, relation = 'direct-cell-reference') => {
      const affected = unique(affectedCellIds).filter(id => cellIds.has(id));
      if (!affected.length) return;
      direct.push({
        kind,
        entityId: entity?.id || null,
        path,
        affectedCellIds: affected,
        relation
      });
    };
    const addDependent = (kind, entity, path, dependencyIds, affectedCellIds, relation) => {
      const affected = unique(affectedCellIds).filter(id => cellIds.has(id));
      if (!affected.length) return;
      dependent.push({
        kind,
        entityId: entity?.id || null,
        path,
        dependencyIds: unique(dependencyIds),
        affectedCellIds: affected,
        relation
      });
    };

    (profile.hydrology?.sources || []).forEach((item, index) => addDirect('water-source', item, `hydrology.sources[${index}].mapCellId`, [item.mapCellId]));
    (profile.hydrology?.reservoirs || []).forEach((item, index) => addDirect('reservoir', item, `hydrology.reservoirs[${index}].mapCellId`, [item.mapCellId]));
    (profile.resources?.nodes || []).forEach((item, index) => addDirect('resource-node', item, `resources.nodes[${index}].mapCellId`, [item.mapCellId]));
    (profile.stability?.faultZones || []).forEach((item, index) => addDirect('fault-zone', item, `stability.faultZones[${index}].cellIds`, item.cellIds));
    (profile.approaches?.landingZones || []).forEach((item, index) => addDirect('landing-zone', item, `approaches.landingZones[${index}].mapCellId`, [item.mapCellId]));
    (profile.sites || []).forEach((item, index) => addDirect('site', item, `sites[${index}].mapCellId`, [item.mapCellId]));
    (profile.hazards || []).forEach((item, index) => addDirect('hazard', item, `hazards[${index}].cellIds`, item.cellIds));
    (profile.ecology?.habitats || []).forEach((item, index) => addDirect('habitat', item, `ecology.habitats[${index}].cellIds`, item.cellIds));
    (profile.settlementCapacity?.settlementSlots || []).forEach((item, index) => addDirect('settlement-slot', item, `settlementCapacity.settlementSlots[${index}].mapCellId`, [item.mapCellId]));
    (profile.routeNodeExport?.nodes || []).forEach((item, index) => addDirect('route-node', item, `routeNodeExport.nodes[${index}].mapCellId`, [item.mapCellId]));

    const waterById = new Map((profile.hydrology?.sources || []).map(item => [item.id, item]));
    const landingById = new Map((profile.approaches?.landingZones || []).map(item => [item.id, item]));
    const faultById = new Map((profile.stability?.faultZones || []).map(item => [item.id, item]));
    const habitatById = new Map((profile.ecology?.habitats || []).map(item => [item.id, item]));

    (profile.settlementCapacity?.settlementSlots || []).forEach((item, index) => {
      const waterDependencies = (item.waterSourceIds || []).map(id => waterById.get(id)).filter(Boolean);
      addDependent(
        'settlement-slot-water-dependency',
        item,
        `settlementCapacity.settlementSlots[${index}].waterSourceIds`,
        waterDependencies.map(entry => entry.id),
        waterDependencies.map(entry => entry.mapCellId),
        'depends-on-water-source-anchored-in-removed-cell'
      );
      const landingDependencies = (item.landingZoneIds || []).map(id => landingById.get(id)).filter(Boolean);
      addDependent(
        'settlement-slot-landing-dependency',
        item,
        `settlementCapacity.settlementSlots[${index}].landingZoneIds`,
        landingDependencies.map(entry => entry.id),
        landingDependencies.map(entry => entry.mapCellId),
        'depends-on-landing-zone-anchored-in-removed-cell'
      );
    });

    (profile.routeNodeExport?.nodes || []).forEach((item, index) => {
      const landingDependencies = (item.landingZoneIds || []).map(id => landingById.get(id)).filter(Boolean);
      addDependent(
        'route-node-landing-dependency',
        item,
        `routeNodeExport.nodes[${index}].landingZoneIds`,
        landingDependencies.map(entry => entry.id),
        landingDependencies.map(entry => entry.mapCellId),
        'depends-on-landing-zone-anchored-in-removed-cell'
      );
    });

    (profile.approaches?.approachCorridors || []).forEach((item, index) => {
      const landing = landingById.get(item.landingZoneId);
      if (!landing) return;
      addDependent(
        'approach-corridor-landing-dependency',
        item,
        `approaches.approachCorridors[${index}].landingZoneId`,
        [landing.id],
        [landing.mapCellId],
        'depends-on-landing-zone-anchored-in-removed-cell'
      );
    });

    (profile.stability?.fractureEvents || []).forEach((item, index) => {
      const fault = faultById.get(item.faultZoneId);
      if (!fault) return;
      addDependent(
        'fracture-event-fault-dependency',
        item,
        `stability.fractureEvents[${index}].faultZoneId`,
        [fault.id],
        fault.cellIds,
        'depends-on-fault-zone-covering-removed-cell'
      );
    });

    (profile.ecology?.speciesSlots || []).forEach((item, index) => {
      const habitat = habitatById.get(item.habitatId);
      if (!habitat) return;
      addDependent(
        'species-slot-habitat-dependency',
        item,
        `ecology.speciesSlots[${index}].habitatId`,
        [habitat.id],
        habitat.cellIds,
        'depends-on-habitat-covering-removed-cell'
      );
    });

    return {
      direct,
      dependent,
      all: [...direct, ...dependent]
    };
  }

  function buildResizePlan(profileInput, columns, rows, options = {}) {
    const profile = normalizeProfile(profileInput);
    const preserve = options.preserve !== false;
    const removal = cellRemovalSet(profile, columns, rows, preserve);
    const removedCellIds = [...removal.removedCellIds];
    const references = collectCellReferences(profile, removedCellIds);
    const activeIds = new Set(profile.map.activeCellIds);
    const removedActiveCellIds = removedCellIds.filter(id => activeIds.has(id));
    const removedOutgoingReferences = {
      waterSourceIds: unique(removal.removedCells.map(cell => cell.waterCatchmentId)),
      siteIds: unique(removal.removedCells.flatMap(cell => cell.siteIds || [])),
      resourceNodeIds: unique(removal.removedCells.flatMap(cell => cell.resourceNodeIds || [])),
      hazardIds: unique(removal.removedCells.flatMap(cell => cell.hazardIds || []))
    };
    const changed = removal.nextColumns !== profile.map.columns || removal.nextRows !== profile.map.rows || preserve === false;
    const sourceSignature = [
      `${profile.map.columns}x${profile.map.rows}`,
      ...profile.map.cells.map(cell => `${cell.id}@${cell.x},${cell.y}`)
    ].join('|');
    const plan = {
      version: '1.0.0',
      sourceDimensions: { columns: profile.map.columns, rows: profile.map.rows },
      targetDimensions: { columns: removal.nextColumns, rows: removal.nextRows },
      preserve,
      changed,
      direction: removal.nextColumns >= profile.map.columns && removal.nextRows >= profile.map.rows ? 'expand-or-equal' : 'shrink-or-reshape',
      sourceSignature,
      removedCells: removal.removedCells,
      removedCellIds,
      removedActiveCellIds,
      removedAreaKm2: sum(removal.removedCells.map(cell => cell.areaKm2)),
      removedOutgoingReferences,
      references,
      affectedEntityIds: unique(references.all.map(item => item.entityId)),
      requiresConfirmation: removal.removedCells.length > 0,
      recoverySnapshot: {
        sourceDimensions: { columns: profile.map.columns, rows: profile.map.rows },
        targetDimensions: { columns: removal.nextColumns, rows: removal.nextRows },
        removedCells: removal.removedCells,
        removedActiveCellIds,
        removedOutgoingReferences,
        references
      }
    };
    return clone(plan);
  }

  function planMatchesMap(plan, mapInput) {
    const map = mapInput || {};
    const signature = [
      `${integer(map.columns)}x${integer(map.rows)}`,
      ...(map.cells || []).map(cell => `${cell.id}@${cell.x},${cell.y}`)
    ].join('|');
    return plan?.sourceSignature === signature;
  }

  function summarizeResizePlan(plan) {
    const directCount = plan?.references?.direct?.length || 0;
    const dependentCount = plan?.references?.dependent?.length || 0;
    return {
      changed: Boolean(plan?.changed),
      removedCellCount: plan?.removedCells?.length || 0,
      removedActiveCellCount: plan?.removedActiveCellIds?.length || 0,
      removedAreaKm2: Number(plan?.removedAreaKm2 || 0),
      directReferenceCount: directCount,
      dependentReferenceCount: dependentCount,
      affectedEntityCount: plan?.affectedEntityIds?.length || 0,
      requiresConfirmation: Boolean(plan?.requiresConfirmation)
    };
  }

  class SurfaceGridResizePanel {
    constructor(options = {}) {
      if (!options.root || !(options.root instanceof Element)) throw new Error('Surface resize panel requires a root Element.');
      if (typeof options.profileProvider !== 'function') throw new Error('Surface resize panel requires a profileProvider function.');
      if (typeof options.onCommit !== 'function') throw new Error('Surface resize panel requires an onCommit callback.');
      this.root = options.root;
      this.profileProvider = options.profileProvider;
      this.onCommit = options.onCommit;
      this.onPreview = typeof options.onPreview === 'function' ? options.onPreview : null;
      this.onCancel = typeof options.onCancel === 'function' ? options.onCancel : null;
      this.plan = null;
      this.statusMessage = '';
      this.render();
    }

    preview(columns, rows, options = {}) {
      this.plan = buildResizePlan(this.profileProvider(), columns, rows, options);
      this.statusMessage = this.plan.changed ? 'Resize preview ready.' : 'The requested dimensions match the current grid.';
      this.onPreview?.(clone(this.plan));
      this.render();
      return clone(this.plan);
    }

    cancel() {
      const previous = clone(this.plan);
      this.plan = null;
      this.statusMessage = 'Resize preview cancelled. No grid data changed.';
      this.onCancel?.(previous);
      this.render();
    }

    commit(confirmed = false) {
      if (!this.plan || !this.plan.changed) return { applied: false, reason: 'no-resize-plan' };
      if (this.plan.requiresConfirmation && !confirmed) {
        this.statusMessage = 'Confirm the destructive resize before applying it.';
        this.render();
        return { applied: false, requiresConfirmation: true, plan: clone(this.plan) };
      }
      const result = this.onCommit({ ...clone(this.plan), confirmed: true });
      this.statusMessage = result?.applied === false ? 'Resize was not applied.' : 'Resize applied. Removed records remain available in the recovery report.';
      if (result?.applied !== false) this.plan = null;
      this.render();
      return result;
    }

    render() {
      const profile = normalizeProfile(this.profileProvider());
      this.root.classList.add('kaysender-surface-resize');
      this.root.replaceChildren();

      const heading = document.createElement('div');
      heading.className = 'surface-resize-heading';
      const title = document.createElement('strong');
      title.textContent = 'Resize Surface Grid';
      const current = document.createElement('small');
      current.textContent = `current ${profile.map.columns} × ${profile.map.rows}`;
      heading.append(title, current);
      this.root.appendChild(heading);

      const form = document.createElement('form');
      form.className = 'surface-resize-form';
      const columnLabel = document.createElement('label');
      columnLabel.textContent = 'Columns';
      const columnInput = document.createElement('input');
      columnInput.type = 'number';
      columnInput.name = 'columns';
      columnInput.min = '1';
      columnInput.step = '1';
      columnInput.value = String(this.plan?.targetDimensions?.columns || profile.map.columns);
      columnLabel.appendChild(columnInput);
      const rowLabel = document.createElement('label');
      rowLabel.textContent = 'Rows';
      const rowInput = document.createElement('input');
      rowInput.type = 'number';
      rowInput.name = 'rows';
      rowInput.min = '1';
      rowInput.step = '1';
      rowInput.value = String(this.plan?.targetDimensions?.rows || profile.map.rows);
      rowLabel.appendChild(rowInput);
      form.append(columnLabel, rowLabel);

      const actions = document.createElement('div');
      actions.className = 'surface-resize-actions';
      const previewButton = document.createElement('button');
      previewButton.type = 'submit';
      previewButton.textContent = 'Preview Resize';
      actions.appendChild(previewButton);
      if (this.plan) {
        const cancelButton = document.createElement('button');
        cancelButton.type = 'button';
        cancelButton.textContent = 'Cancel Preview';
        cancelButton.addEventListener('click', () => this.cancel());
        actions.appendChild(cancelButton);
      }
      form.appendChild(actions);
      form.addEventListener('submit', event => {
        event.preventDefault();
        this.preview(columnInput.value, rowInput.value, { preserve: true });
      });
      this.root.appendChild(form);

      if (this.plan) {
        const summary = summarizeResizePlan(this.plan);
        const preview = document.createElement('section');
        preview.className = `surface-resize-preview${this.plan.requiresConfirmation ? ' destructive' : ''}`;
        const previewTitle = document.createElement('strong');
        previewTitle.textContent = `${this.plan.sourceDimensions.columns} × ${this.plan.sourceDimensions.rows} → ${this.plan.targetDimensions.columns} × ${this.plan.targetDimensions.rows}`;
        preview.appendChild(previewTitle);

        const metrics = document.createElement('p');
        metrics.textContent = `${summary.removedCellCount} cells removed; ${summary.removedActiveCellCount} active; ${summary.removedAreaKm2} km²; ${summary.directReferenceCount} direct and ${summary.dependentReferenceCount} dependent ledger references.`;
        preview.appendChild(metrics);

        if (this.plan.removedCells.length) {
          const list = document.createElement('ul');
          this.plan.removedCells.forEach(cell => {
            const item = document.createElement('li');
            item.textContent = `${cell.id} at ${cell.x},${cell.y} — ${cell.terrainType || 'unassigned'} — ${cell.areaKm2 || 0} km²`;
            list.appendChild(item);
          });
          preview.appendChild(list);
        }

        if (this.plan.references.all.length) {
          const referenceTitle = document.createElement('strong');
          referenceTitle.textContent = 'Affected ledger references';
          preview.appendChild(referenceTitle);
          const referenceList = document.createElement('ul');
          this.plan.references.all.forEach(reference => {
            const item = document.createElement('li');
            item.textContent = `${reference.kind}: ${reference.entityId || 'unnamed'} at ${reference.path} (${reference.relation})`;
            referenceList.appendChild(item);
          });
          preview.appendChild(referenceList);
        }

        const confirmation = document.createElement('label');
        confirmation.className = 'surface-resize-confirmation';
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = !this.plan.requiresConfirmation;
        checkbox.disabled = !this.plan.requiresConfirmation;
        const confirmationText = document.createElement('span');
        confirmationText.textContent = this.plan.requiresConfirmation
          ? 'I understand that these cells will be removed and their ledger references must be repaired or reassigned.'
          : 'No cells will be removed.';
        confirmation.append(checkbox, confirmationText);
        preview.appendChild(confirmation);

        const apply = document.createElement('button');
        apply.type = 'button';
        apply.textContent = 'Apply Resize';
        apply.disabled = !this.plan.changed || (this.plan.requiresConfirmation && !checkbox.checked);
        checkbox.addEventListener('change', () => {
          apply.disabled = !this.plan.changed || (this.plan.requiresConfirmation && !checkbox.checked);
        });
        apply.addEventListener('click', () => this.commit(checkbox.checked));
        preview.appendChild(apply);
        this.root.appendChild(preview);
      }

      const status = document.createElement('p');
      status.className = 'surface-resize-status';
      status.setAttribute('role', 'status');
      status.textContent = this.statusMessage || 'Preview dimensions before applying a resize.';
      this.root.appendChild(status);
    }

    destroy() {
      this.plan = null;
      this.root.replaceChildren();
      this.root.classList.remove('kaysender-surface-resize');
    }
  }

  root.KaysenderSurfaceGridResize = Object.freeze({
    SurfaceGridResizePanel,
    buildResizePlan,
    collectCellReferences,
    planMatchesMap,
    summarizeResizePlan
  });
})();
