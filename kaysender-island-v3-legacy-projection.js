(() => {
  'use strict';

  const root = typeof window !== 'undefined' ? window : globalThis;
  const base = root.KaysenderIslandV3AdapterFactory;
  if (!base?.LEGACY_FIELD_MAP) throw new Error('Island v3 legacy projection requires the schema-enforcing adapter bridge.');

  const SIZE_OPTIONS = Object.freeze([
    'loose floatstone ore cluster', 'debris raft', 'rocklet', 'small isle', 'village island',
    'township island', 'fortress island', 'city-bearing island', 'regional island', 'minor floating subcontinent'
  ]);
  const SHAPE_OPTIONS = Object.freeze([
    'loose cluster', 'narrow shard', 'irregular oval', 'broad tabular plateau', 'crescent shelf',
    'split twin-mass', 'terraced cone', 'ring island', 'long ridge', 'fractured archipelago'
  ]);

  function projectSize(profile) {
    const value = profile.classification?.sizeClass;
    if (SIZE_OPTIONS.includes(value)) return value;
    const area = Number(profile.geometry?.planAreaKm2 || 0);
    const thickness = Number(profile.geometry?.meanThicknessM || 0);
    if (area < 0.03) return 'loose floatstone ore cluster';
    if (area < 0.3) return 'debris raft';
    if (area < 1.5) return 'rocklet';
    if (area < 8) return 'small isle';
    if (area < 40) return 'village island';
    if (area < 180) return thickness > 900 ? 'fortress island' : 'township island';
    if (area < 900) return 'city-bearing island';
    if (area < 12000) return 'regional island';
    return 'minor floating subcontinent';
  }

  function projectShape(profile) {
    const value = profile.classification?.shapeProfile;
    if (SHAPE_OPTIONS.includes(value)) return value;
    const terrain = (profile.map?.cells || []).map(cell => String(cell.terrainType || '').toLowerCase()).join(' ');
    if (/fragment|debris|cluster/.test(terrain)) return 'loose cluster';
    if (/shard|needle/.test(terrain)) return 'narrow shard';
    if (/split|twin/.test(terrain)) return 'split twin-mass';
    if (/terrace|cone/.test(terrain)) return 'terraced cone';
    if (/ring|caldera/.test(terrain)) return 'ring island';
    if (/ridge/.test(terrain)) return 'long ridge';
    if (/fracture|archipelago/.test(terrain)) return 'fractured archipelago';
    const length = Number(profile.geometry?.lengthKm || 1);
    const width = Number(profile.geometry?.widthKm || 1);
    if (length >= width * 2.5) return 'long ridge';
    return 'irregular oval';
  }

  const LEGACY_FIELD_MAP = Object.freeze({
    ...base.LEGACY_FIELD_MAP,
    sizeClass: projectSize,
    shapeProfile: projectShape
  });

  function applyProfileToForm({ form, profile, mapping, fallback }) {
    const applied = mapping?.apply
      ? mapping.apply(form, profile, LEGACY_FIELD_MAP)
      : fallback?.(form, base.PROFILE_TYPE, profile) || [];
    const panel = form?.closest?.('.editor-panel') || document.getElementById('kaysender-editor-panel');
    if (panel) base.ensureSession(panel, profile);
    return applied;
  }

  function createDefinition(options = {}) {
    return Object.freeze({
      ...base.createDefinition(options),
      fieldMap: LEGACY_FIELD_MAP,
      applyProfileToForm
    });
  }

  function activationBundle(options = {}) {
    const previous = base.activationBundle(options);
    return Object.freeze({
      adapter: createDefinition(options),
      migration: previous.migration,
      loadOrder: Object.freeze([
        ...previous.loadOrder,
        'kaysender-island-v3-legacy-projection.js'
      ])
    });
  }

  root.KaysenderIslandV3AdapterFactory = Object.freeze({
    ...base,
    LEGACY_FIELD_MAP,
    SHAPE_OPTIONS,
    SIZE_OPTIONS,
    activationBundle,
    applyProfileToForm,
    createDefinition,
    projectShape,
    projectSize
  });
})();
