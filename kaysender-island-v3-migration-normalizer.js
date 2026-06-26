(() => {
  'use strict';
  const root = typeof window !== 'undefined' ? window : globalThis;
  const source = root.KaysenderIslandV3Transformers;
  const domain = root.KaysenderIslandV3Domain;
  if (!source || !domain) {
    console.error('Island migration normalizer could not start: transformer or domain runtime is missing.');
    return;
  }

  const clone = value => value === undefined ? undefined : JSON.parse(JSON.stringify(value));
  const number = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
  const round = (value, digits = 6) => Number(number(value).toFixed(digits));

  function normalizeMigratedCellAreas(profileInput) {
    const profile = clone(profileInput || {});
    const planArea = Math.max(0.001, number(profile.geometry?.planAreaKm2, 0.001));
    const activeIds = new Set(profile.map?.activeCellIds || []);
    const activeCells = (profile.map?.cells || []).filter(cell => activeIds.has(cell.id));
    if (!activeCells.length) return profile;

    const currentArea = activeCells.reduce((sum, cell) => sum + Math.max(0, number(cell.areaKm2)), 0);
    const equalShare = planArea / activeCells.length;
    const scale = currentArea > 0 ? planArea / currentArea : 0;

    activeCells.forEach(cell => {
      cell.areaKm2 = round(currentArea > 0 ? Math.max(0, number(cell.areaKm2)) * scale : equalShare);
    });

    const normalizedTotal = activeCells.reduce((sum, cell) => sum + number(cell.areaKm2), 0);
    const correction = round(planArea - normalizedTotal);
    const finalCell = activeCells.at(-1);
    finalCell.areaKm2 = round(Math.max(0, number(finalCell.areaKm2) + correction));

    profile.derived = profile.derived || {};
    profile.derived.warnings = [...new Set([
      ...(profile.derived.warnings || []),
      'Migrated v2 cell areas were proportionally normalized to the declared Island plan area.'
    ])];

    const recalculated = domain.applyDerived(profile);
    recalculated.outputs = recalculated.outputs || {};
    recalculated.outputs.downstreamExports = source.buildDownstreamExports(recalculated, {});
    return recalculated;
  }

  function migrateV2ToV3(input) {
    const result = source.migrateV2ToV3(input);
    return {
      ...result,
      data: normalizeMigratedCellAreas(result.data),
      log: [
        ...(result.log || []),
        {
          code: 'island-v3-migrated-cell-area-normalization',
          message: 'Normalized migrated active-cell areas to the declared Island plan area without changing stable cell IDs or relative distribution.',
          fromVersion: '2.0.0',
          toVersion: '3.0.0'
        }
      ]
    };
  }

  root.KaysenderIslandV3Transformers = Object.freeze({
    ...source,
    migrateV2ToV3,
    normalizeMigratedCellAreas
  });
})();
