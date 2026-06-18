(() => {
  'use strict';

  const root = typeof window !== 'undefined' ? window : globalThis;
  const clone = value => JSON.parse(JSON.stringify(value));
  const unique = values => [...new Set((values || []).filter(Boolean).map(String))];
  const normalizeText = value => String(value || '').trim();

  const TERRAIN_PRESETS = Object.freeze([
    { id: 'terrain-plateau', label: 'Plateau', code: 'PL', terrainType: 'plateau', slopeClass: 'gentle', usablePercent: 78, arablePercent: 34 },
    { id: 'terrain-pasture', label: 'Pasture', code: 'PA', terrainType: 'pasture', slopeClass: 'gentle', usablePercent: 88, arablePercent: 62 },
    { id: 'terrain-forest', label: 'Forest', code: 'FO', terrainType: 'forest', slopeClass: 'mixed', usablePercent: 58, arablePercent: 18 },
    { id: 'terrain-wet-basin', label: 'Wet Basin', code: 'WB', terrainType: 'wet basin', slopeClass: 'basin', usablePercent: 66, arablePercent: 46 },
    { id: 'terrain-ridge', label: 'Ridge', code: 'RI', terrainType: 'ridge', slopeClass: 'steep', usablePercent: 24, arablePercent: 3 },
    { id: 'terrain-cliff-shelf', label: 'Cliff Shelf', code: 'CS', terrainType: 'cliff shelf', slopeClass: 'mixed shelf', usablePercent: 42, arablePercent: 5 },
    { id: 'terrain-ravine', label: 'Ravine', code: 'RA', terrainType: 'ravine', slopeClass: 'steep', usablePercent: 14, arablePercent: 1 },
    { id: 'terrain-quarry', label: 'Quarry', code: 'QU', terrainType: 'quarry', slopeClass: 'excavated', usablePercent: 31, arablePercent: 0 },
    { id: 'terrain-ruins', label: 'Ruins', code: 'RU', terrainType: 'ruins', slopeClass: 'irregular', usablePercent: 36, arablePercent: 2 },
    { id: 'terrain-scarlands', label: 'Scarlands', code: 'SC', terrainType: 'mining scarlands', slopeClass: 'broken', usablePercent: 18, arablePercent: 0 },
    { id: 'terrain-cavern-mouth', label: 'Cavern Mouth', code: 'CM', terrainType: 'cavern mouth', slopeClass: 'broken', usablePercent: 12, arablePercent: 0 },
    { id: 'terrain-unstable-edge', label: 'Unstable Edge', code: 'UE', terrainType: 'unstable edge', slopeClass: 'vertical fracture', usablePercent: 4, arablePercent: 0 }
  ]);

  const ELEVATION_PRESETS = Object.freeze([
    { id: 'elevation-low', label: 'Low Surface', code: 'L', elevationM: -120, mode: 'relative' },
    { id: 'elevation-level', label: 'Level Surface', code: '0', elevationM: 0, mode: 'relative' },
    { id: 'elevation-raised', label: 'Raised Surface', code: 'H', elevationM: 120, mode: 'relative' },
    { id: 'elevation-high-ridge', label: 'High Ridge', code: 'HR', elevationM: 320, mode: 'relative' }
  ]);

  const SLOPE_PRESETS = Object.freeze([
    { id: 'slope-flat', label: 'Flat', code: 'F', slopeClass: 'flat' },
    { id: 'slope-gentle', label: 'Gentle', code: 'G', slopeClass: 'gentle' },
    { id: 'slope-mixed', label: 'Mixed', code: 'M', slopeClass: 'mixed' },
    { id: 'slope-steep', label: 'Steep', code: 'S', slopeClass: 'steep' },
    { id: 'slope-vertical', label: 'Vertical Fracture', code: 'V', slopeClass: 'vertical fracture' }
  ]);

  function terrainBrush(preset) {
    return Object.freeze({
      id: preset.id,
      family: 'terrain',
      label: preset.label,
      code: preset.code,
      description: `Activate the cell as ${preset.terrainType}. Exact values remain editable in the cell inspector.`,
      activate: true,
      patch: {
        terrainType: preset.terrainType,
        slopeClass: preset.slopeClass,
        usablePercent: preset.usablePercent,
        arablePercent: preset.arablePercent
      }
    });
  }

  function elevationBrush(preset, meanAltitudeM = 0) {
    return Object.freeze({
      id: preset.id,
      family: 'elevation',
      label: preset.label,
      code: preset.code,
      description: 'Apply an elevation band while preserving terrain and linked records.',
      activate: true,
      apply(cell) {
        return {
          elevationM: preset.mode === 'relative' ? Number(meanAltitudeM || 0) + preset.elevationM : preset.elevationM
        };
      }
    });
  }

  function slopeBrush(preset) {
    return Object.freeze({
      id: preset.id,
      family: 'slope',
      label: preset.label,
      code: preset.code,
      description: `Set slope class to ${preset.slopeClass}.`,
      activate: true,
      patch: { slopeClass: preset.slopeClass }
    });
  }

  function outlineBrushes() {
    return [
      Object.freeze({
        id: 'outline-activate',
        family: 'outline',
        label: 'Activate Surface',
        code: '+',
        description: 'Add this coordinate to the active Island surface without replacing its stable cell ID.',
        activate: true,
        patch: {}
      }),
      Object.freeze({
        id: 'outline-deactivate',
        family: 'outline',
        label: 'Deactivate Surface',
        code: '−',
        description: 'Remove this coordinate from the active Island outline while retaining its stable identity for recovery.',
        activate: false,
        apply(cell) {
          return {
            terrainType: 'unassigned',
            slopeClass: 'unknown',
            usablePercent: 0,
            arablePercent: 0,
            waterCatchmentId: null,
            siteIds: [],
            resourceNodeIds: [],
            hazardIds: []
          };
        }
      })
    ];
  }

  function createReferenceBrush(options = {}) {
    const family = normalizeText(options.family);
    const referenceId = normalizeText(options.referenceId);
    const label = normalizeText(options.label || referenceId);
    if (!['water', 'site', 'resource', 'hazard'].includes(family)) throw new Error(`Unsupported Island reference brush family '${family}'.`);
    if (!referenceId) throw new Error('Island reference brush requires a referenceId.');
    const field = {
      water: 'waterCatchmentId',
      site: 'siteIds',
      resource: 'resourceNodeIds',
      hazard: 'hazardIds'
    }[family];
    return Object.freeze({
      id: options.id || `${family}-link-${referenceId}`,
      family,
      label,
      code: normalizeText(options.code || label.slice(0, 2).toUpperCase()),
      description: options.description || `Link ${label} to an active Island surface cell.`,
      activate: true,
      requiresActiveCell: true,
      referenceId,
      apply(cell) {
        if (family === 'water') return { [field]: referenceId };
        return { [field]: unique([...(cell[field] || []), referenceId]) };
      }
    });
  }

  function createUnlinkBrush(options = {}) {
    const family = normalizeText(options.family);
    const referenceId = normalizeText(options.referenceId);
    if (!['water', 'site', 'resource', 'hazard'].includes(family)) throw new Error(`Unsupported Island unlink brush family '${family}'.`);
    const field = {
      water: 'waterCatchmentId',
      site: 'siteIds',
      resource: 'resourceNodeIds',
      hazard: 'hazardIds'
    }[family];
    return Object.freeze({
      id: options.id || `${family}-unlink-${referenceId || 'all'}`,
      family,
      label: options.label || `Remove ${family}`,
      code: options.code || '×',
      description: options.description || `Remove ${referenceId || `all ${family} references`} from the selected cell.`,
      activate: true,
      requiresActiveCell: true,
      apply(cell) {
        if (family === 'water') return { [field]: null };
        const current = cell[field] || [];
        return { [field]: referenceId ? current.filter(id => id !== referenceId) : [] };
      }
    });
  }

  function evaluateCompatibility(cell, brush, context = {}) {
    const reasons = [];
    if (!cell || !brush) return { compatible: false, reasons: ['Cell and brush are required.'] };
    if (brush.requiresActiveCell && !cell.active) reasons.push('This brush requires an active Island surface cell.');
    if (brush.family !== 'outline' && context.lockedCellIds?.includes(cell.id)) reasons.push('This cell is locked.');
    if (brush.family === 'water' && ['vertical fracture', 'steep'].includes(cell.slopeClass) && context.allowSteepWater !== true) {
      reasons.push('Water catchments require a basin, flat, gentle, or deliberately overridden cell.');
    }
    if (brush.family === 'site' && cell.terrainType === 'unstable edge' && context.allowUnstableSites !== true) {
      reasons.push('Sites cannot be placed on an unstable edge without an explicit override.');
    }
    if (brush.family === 'resource' && cell.terrainType === 'wet basin' && context.allowWetExtraction !== true) {
      reasons.push('Resource extraction in a wet basin requires an explicit override.');
    }
    if (typeof brush.compatibility === 'function') {
      const result = brush.compatibility(clone(cell), context);
      if (result === false) reasons.push('The selected brush rejected this cell.');
      if (typeof result === 'string' && result) reasons.push(result);
      if (Array.isArray(result)) reasons.push(...result.filter(Boolean));
    }
    return { compatible: reasons.length === 0, reasons };
  }

  function isCompatible(cell, brush, context = {}) {
    return evaluateCompatibility(cell, brush, context).compatible;
  }

  function createDefaultPalette(options = {}) {
    const meanAltitudeM = Number(options.meanAltitudeM || 0);
    return Object.freeze([
      ...outlineBrushes(),
      ...TERRAIN_PRESETS.map(terrainBrush),
      ...ELEVATION_PRESETS.map(preset => elevationBrush(preset, meanAltitudeM)),
      ...SLOPE_PRESETS.map(slopeBrush)
    ]);
  }

  function groupPalette(palette = []) {
    return palette.reduce((groups, brush) => {
      const family = brush.family || 'other';
      if (!groups[family]) groups[family] = [];
      groups[family].push(brush);
      return groups;
    }, {});
  }

  const api = Object.freeze({
    TERRAIN_PRESETS,
    ELEVATION_PRESETS,
    SLOPE_PRESETS,
    createDefaultPalette,
    createReferenceBrush,
    createUnlinkBrush,
    evaluateCompatibility,
    groupPalette,
    isCompatible,
    outlineBrushes,
    terrainBrush,
    elevationBrush,
    slopeBrush
  });

  root.KaysenderSurfaceGridBrushes = api;
})();
