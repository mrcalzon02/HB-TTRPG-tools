(() => {
  'use strict';

  const root = window;
  const base = root.KaysenderIslandSurfaceGridController;
  const brushApi = root.KaysenderSurfaceGridBrushes;
  if (!base?.IslandSurfaceGridController || !brushApi) {
    throw new Error('Island surface controller and brush API must load before record brushes.');
  }

  const clone = value => JSON.parse(JSON.stringify(value));
  const families = new Set(['water', 'site', 'resource', 'hazard']);

  function recordLabel(record) {
    return record.name || record.type || record.resourceType || record.id;
  }

  function referenceRecords(profile) {
    return [
      ...(profile.hydrology?.sources || []).map(record => ({ family: 'water', record })),
      ...(profile.sites || []).map(record => ({ family: 'site', record })),
      ...(profile.resources?.nodes || []).map(record => ({ family: 'resource', record })),
      ...(profile.hazards || []).map(record => ({ family: 'hazard', record }))
    ];
  }

  class RecordBrushIslandSurfaceController extends base.IslandSurfaceGridController {
    constructor(options = {}) {
      super(options);
      this.syncRecordBrushes(options.profile || this.profile);
    }

    syncRecordBrushes(profileInput = this.profile) {
      const profile = clone(profileInput || {});
      const fixed = this.palette.filter(brush => !families.has(brush.family));
      const references = referenceRecords(profile).map(({ family, record }) => brushApi.createReferenceBrush({
        family,
        referenceId: record.id,
        label: recordLabel(record),
        description: `Link ${record.id} to an active Island surface cell.`
      }));
      const unlink = [...families].map(family => brushApi.createUnlinkBrush({
        family,
        label: `Clear ${family} links`
      }));
      this.palette = [...fixed, ...references, ...unlink];
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
  }

  root.KaysenderIslandSurfaceGridController = Object.freeze({
    ...base,
    IslandSurfaceGridController: RecordBrushIslandSurfaceController,
    referenceRecords
  });
})();
