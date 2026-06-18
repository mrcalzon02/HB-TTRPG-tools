(() => {
  'use strict';

  const root = typeof window !== 'undefined' ? window : globalThis;
  const clone = value => value === undefined ? undefined : JSON.parse(JSON.stringify(value));
  const number = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
  const sum = values => values.reduce((total, value) => total + number(value), 0);
  const unique = values => [...new Set((values || []).filter(Boolean).map(String))];

  function diagnostic(severity, code, path, message, referenceId = null) {
    return { severity, code, path, message, ...(referenceId ? { referenceId } : {}) };
  }

  function entityIndexes(profile) {
    const entries = {
      cells: profile.map?.cells || [],
      waterSources: profile.hydrology?.sources || [],
      reservoirs: profile.hydrology?.reservoirs || [],
      resourceNodes: profile.resources?.nodes || [],
      altitudeSegments: profile.motion?.altitudeTimeline || [],
      driftSegments: profile.motion?.driftTimeline || [],
      faultZones: profile.stability?.faultZones || [],
      fractureEvents: profile.stability?.fractureEvents || [],
      landingZones: profile.approaches?.landingZones || [],
      approachCorridors: profile.approaches?.approachCorridors || [],
      sites: profile.sites || [],
      hazards: profile.hazards || [],
      habitats: profile.ecology?.habitats || [],
      speciesSlots: profile.ecology?.speciesSlots || [],
      settlementSlots: profile.settlementCapacity?.settlementSlots || [],
      routeNodes: profile.routeNodeExport?.nodes || []
    };
    return Object.fromEntries(Object.entries(entries).map(([key, records]) => [key, new Map(records.map(record => [record.id, record]))]));
  }

  function duplicateDiagnostics(profile) {
    const groups = [
      ['map.cells', profile.map?.cells || []],
      ['hydrology.sources', profile.hydrology?.sources || []],
      ['hydrology.reservoirs', profile.hydrology?.reservoirs || []],
      ['resources.nodes', profile.resources?.nodes || []],
      ['motion.altitudeTimeline', profile.motion?.altitudeTimeline || []],
      ['motion.driftTimeline', profile.motion?.driftTimeline || []],
      ['stability.faultZones', profile.stability?.faultZones || []],
      ['stability.fractureEvents', profile.stability?.fractureEvents || []],
      ['approaches.landingZones', profile.approaches?.landingZones || []],
      ['approaches.approachCorridors', profile.approaches?.approachCorridors || []],
      ['sites', profile.sites || []],
      ['hazards', profile.hazards || []],
      ['ecology.habitats', profile.ecology?.habitats || []],
      ['ecology.speciesSlots', profile.ecology?.speciesSlots || []],
      ['settlementCapacity.settlementSlots', profile.settlementCapacity?.settlementSlots || []],
      ['routeNodeExport.nodes', profile.routeNodeExport?.nodes || []]
    ];
    const diagnostics = [];
    for (const [path, records] of groups) {
      const seen = new Set();
      records.forEach((record, index) => {
        if (!record?.id) return;
        if (seen.has(record.id)) diagnostics.push(diagnostic('error', 'duplicate-entity-id', `${path}[${index}].id`, `Entity ID ${record.id} is duplicated.`, record.id));
        seen.add(record.id);
      });
    }
    return diagnostics;
  }

  function referenceDiagnostics(profile, indexes = entityIndexes(profile)) {
    const diagnostics = [];
    const check = (exists, code, path, id, label) => {
      if (id && !exists.has(id)) diagnostics.push(diagnostic('error', code, path, `${label} reference ${id} does not exist.`, id));
    };
    const checkMany = (ids, exists, code, path, label) => (ids || []).forEach(id => check(exists, code, path, id, label));

    checkMany(profile.map?.activeCellIds, indexes.cells, 'broken-cell-reference', 'map.activeCellIds', 'Active cell');
    (profile.map?.cells || []).forEach((cell, index) => {
      checkMany(cell.siteIds, indexes.sites, 'broken-site-reference', `map.cells[${index}].siteIds`, 'Site');
      checkMany(cell.resourceNodeIds, indexes.resourceNodes, 'broken-resource-reference', `map.cells[${index}].resourceNodeIds`, 'Resource node');
      checkMany(cell.hazardIds, indexes.hazards, 'broken-hazard-reference', `map.cells[${index}].hazardIds`, 'Hazard');
      check(indexes.waterSources, 'broken-water-reference', `map.cells[${index}].waterCatchmentId`, cell.waterCatchmentId, 'Water source');
    });
    (profile.hydrology?.sources || []).forEach((item, index) => check(indexes.cells, 'broken-cell-reference', `hydrology.sources[${index}].mapCellId`, item.mapCellId, 'Cell'));
    (profile.hydrology?.reservoirs || []).forEach((item, index) => check(indexes.cells, 'broken-cell-reference', `hydrology.reservoirs[${index}].mapCellId`, item.mapCellId, 'Cell'));
    (profile.resources?.nodes || []).forEach((item, index) => check(indexes.cells, 'broken-cell-reference', `resources.nodes[${index}].mapCellId`, item.mapCellId, 'Cell'));
    (profile.stability?.faultZones || []).forEach((item, index) => checkMany(item.cellIds, indexes.cells, 'broken-cell-reference', `stability.faultZones[${index}].cellIds`, 'Cell'));
    (profile.stability?.fractureEvents || []).forEach((item, index) => check(indexes.faultZones, 'broken-fault-zone-reference', `stability.fractureEvents[${index}].faultZoneId`, item.faultZoneId, 'Fault zone'));
    (profile.approaches?.landingZones || []).forEach((item, index) => check(indexes.cells, 'broken-cell-reference', `approaches.landingZones[${index}].mapCellId`, item.mapCellId, 'Cell'));
    (profile.approaches?.approachCorridors || []).forEach((item, index) => {
      check(indexes.landingZones, 'broken-landing-zone-reference', `approaches.approachCorridors[${index}].landingZoneId`, item.landingZoneId, 'Landing zone');
      checkMany(item.hazardIds, indexes.hazards, 'broken-hazard-reference', `approaches.approachCorridors[${index}].hazardIds`, 'Hazard');
    });
    (profile.sites || []).forEach((item, index) => check(indexes.cells, 'broken-cell-reference', `sites[${index}].mapCellId`, item.mapCellId, 'Cell'));
    (profile.hazards || []).forEach((item, index) => checkMany(item.cellIds, indexes.cells, 'broken-cell-reference', `hazards[${index}].cellIds`, 'Cell'));
    (profile.ecology?.habitats || []).forEach((item, index) => checkMany(item.cellIds, indexes.cells, 'broken-cell-reference', `ecology.habitats[${index}].cellIds`, 'Cell'));
    (profile.ecology?.speciesSlots || []).forEach((item, index) => check(indexes.habitats, 'broken-habitat-reference', `ecology.speciesSlots[${index}].habitatId`, item.habitatId, 'Habitat'));
    (profile.settlementCapacity?.settlementSlots || []).forEach((item, index) => {
      check(indexes.cells, 'broken-cell-reference', `settlementCapacity.settlementSlots[${index}].mapCellId`, item.mapCellId, 'Cell');
      checkMany(item.waterSourceIds, indexes.waterSources, 'broken-water-reference', `settlementCapacity.settlementSlots[${index}].waterSourceIds`, 'Water source');
      checkMany(item.landingZoneIds, indexes.landingZones, 'broken-landing-zone-reference', `settlementCapacity.settlementSlots[${index}].landingZoneIds`, 'Landing zone');
    });
    (profile.routeNodeExport?.nodes || []).forEach((item, index) => {
      check(indexes.cells, 'broken-cell-reference', `routeNodeExport.nodes[${index}].mapCellId`, item.mapCellId, 'Cell');
      checkMany(item.landingZoneIds, indexes.landingZones, 'broken-landing-zone-reference', `routeNodeExport.nodes[${index}].landingZoneIds`, 'Landing zone');
    });
    check(indexes.routeNodes, 'broken-route-node-reference', 'routeNodeExport.defaultNodeId', profile.routeNodeExport?.defaultNodeId, 'Route node');
    checkMany(profile.visibility?.playerKnownSiteIds, indexes.sites, 'broken-site-reference', 'visibility.playerKnownSiteIds', 'Site');
    checkMany(profile.visibility?.gmOnlySiteIds, indexes.sites, 'broken-site-reference', 'visibility.gmOnlySiteIds', 'Site');
    checkMany(profile.visibility?.playerKnownHazardIds, indexes.hazards, 'broken-hazard-reference', 'visibility.playerKnownHazardIds', 'Hazard');
    checkMany(profile.visibility?.gmOnlyHazardIds, indexes.hazards, 'broken-hazard-reference', 'visibility.gmOnlyHazardIds', 'Hazard');
    return diagnostics;
  }

  function geometryDiagnostics(profile) {
    const diagnostics = [];
    const plan = number(profile.geometry?.planAreaKm2);
    const usable = number(profile.geometry?.usableAreaKm2);
    const flat = number(profile.geometry?.flatAreaKm2);
    const arable = number(profile.geometry?.arableAreaKm2);
    if (usable > plan || flat > usable || arable > flat) diagnostics.push(diagnostic('error', 'geometry-area-order-invalid', 'geometry', 'Plan, usable, flat, and arable areas are not internally ordered.'));
    const active = new Set(profile.map?.activeCellIds || []);
    const activeArea = sum((profile.map?.cells || []).filter(cell => active.has(cell.id)).map(cell => cell.areaKm2));
    const tolerance = Math.max(0.1, plan * 0.02);
    if (Math.abs(activeArea - plan) > tolerance) diagnostics.push(diagnostic('error', 'map-area-mismatch', 'map.cells', `Active cell area ${activeArea} km² does not reconcile with plan area ${plan} km² within ${tolerance} km².`));
    return diagnostics;
  }

  function compositionDiagnostics(profile) {
    const total = sum([
      profile.composition?.ordinaryRockPercent,
      profile.composition?.floatstonePercent,
      profile.composition?.soilSedimentPercent,
      profile.composition?.cavernVoidPercent
    ]);
    return Math.abs(total - 100) > 0.1
      ? [diagnostic('error', 'composition-total-invalid', 'composition', `Composition totals ${total}% instead of 100%.`)]
      : [];
  }

  function hydrologyDiagnostics(profile) {
    const diagnostics = [];
    (profile.hydrology?.reservoirs || []).forEach((reservoir, index) => {
      if (number(reservoir.currentVolumeM3) > number(reservoir.capacityM3)) {
        diagnostics.push(diagnostic('error', 'reservoir-over-capacity', `hydrology.reservoirs[${index}].currentVolumeM3`, `Reservoir ${reservoir.id} exceeds its declared capacity.`));
      }
    });
    return diagnostics;
  }

  function settlementDiagnostics(profile) {
    const capacity = profile.settlementCapacity || {};
    const binding = Math.min(number(capacity.waterLimitedPopulation), number(capacity.foodLimitedPopulation), number(capacity.landLimitedPopulation));
    return number(capacity.sustainablePopulation) !== binding
      ? [diagnostic('error', 'settlement-capacity-mismatch', 'settlementCapacity.sustainablePopulation', `Sustainable population must equal the binding minimum of ${binding} without an explicit supported-import exception.`)]
      : [];
  }

  function resourceDiagnostics(profile) {
    const diagnostics = [];
    if (number(profile.resources?.currentAnnualExtractionTons) > number(profile.resources?.annualSafeExtractionTons)) {
      diagnostics.push(diagnostic('warning', 'resource-overextraction', 'resources.currentAnnualExtractionTons', 'Current extraction exceeds the declared annual safe extraction total.'));
      const faultCells = new Set((profile.stability?.faultZones || []).flatMap(zone => zone.cellIds || []));
      const stressedCells = new Set((profile.resources?.nodes || []).filter(node => faultCells.has(node.mapCellId)).map(node => node.mapCellId));
      (profile.stability?.faultZones || []).forEach((zone, index) => {
        if ((zone.cellIds || []).some(id => stressedCells.has(id))) {
          diagnostics.push(diagnostic('warning', 'fracture-pressure-increased', `stability.faultZones[${index}]`, `Overextraction may increase pressure on fault zone ${zone.id}; the aggregate v3 extraction ledger does not identify which node absorbed the excess.`, zone.id));
        }
      });
    }
    return diagnostics;
  }

  function timelineDiagnostics(segments = [], path) {
    const diagnostics = [];
    segments.forEach((segment, index) => {
      if (number(segment.endDay) <= number(segment.startDay)) diagnostics.push(diagnostic('error', 'timeline-range-invalid', `${path}[${index}]`, `Timeline segment ${segment.id} must end after it starts.`));
      if (segment.minimumAltitudeM !== undefined && number(segment.minimumAltitudeM) > number(segment.maximumAltitudeM)) diagnostics.push(diagnostic('error', 'altitude-range-invalid', `${path}[${index}]`, `Altitude segment ${segment.id} has minimum above maximum.`));
      if (index > 0) {
        const previous = segments[index - 1];
        if (number(segment.startDay) <= number(previous.endDay)) diagnostics.push(diagnostic('error', 'timeline-segment-overlap', `${path}[${index}]`, `Timeline segment ${segment.id} overlaps ${previous.id}.`));
        if (number(segment.startDay) > number(previous.endDay) + 1) diagnostics.push(diagnostic('warning', 'timeline-gap-unknown', `${path}[${index}]`, `Timeline gap before ${segment.id} must remain explicitly unknown.`));
      }
    });
    return diagnostics;
  }

  function visibilityDiagnostics(profile) {
    const diagnostics = [];
    const playerSites = new Set(profile.visibility?.playerKnownSiteIds || []);
    const gmSites = new Set(profile.visibility?.gmOnlySiteIds || []);
    const playerHazards = new Set(profile.visibility?.playerKnownHazardIds || []);
    const gmHazards = new Set(profile.visibility?.gmOnlyHazardIds || []);
    if ([...playerSites].some(id => gmSites.has(id))) diagnostics.push(diagnostic('error', 'visibility-classification-conflict', 'visibility.playerKnownSiteIds', 'A site cannot be both player-known and GM-only.'));
    if ([...playerHazards].some(id => gmHazards.has(id))) diagnostics.push(diagnostic('error', 'visibility-classification-conflict', 'visibility.gmOnlyHazardIds', 'A hazard cannot be both player-known and GM-only.'));

    const playerText = [profile.outputs?.playerSafeSummary, ...(profile.visibility?.publicFacts || [])].filter(Boolean).join(' ').toLowerCase();
    for (const secret of profile.visibility?.gmSecrets || []) {
      if (secret && playerText.includes(String(secret).toLowerCase())) diagnostics.push(diagnostic('error', 'gm-secret-leaked-to-player-output', 'outputs.playerSafeSummary', 'Player-safe output contains GM-only secret text.'));
    }
    for (const id of [...gmSites, ...gmHazards]) {
      if (id && playerText.includes(String(id).toLowerCase())) diagnostics.push(diagnostic('error', 'gm-only-id-leaked-to-player-output', 'outputs.playerSafeSummary', `Player-safe output contains GM-only ID ${id}.`, id));
    }
    return diagnostics;
  }

  function validate(profileInput) {
    const profile = clone(profileInput || {});
    const indexes = entityIndexes(profile);
    return [
      ...duplicateDiagnostics(profile),
      ...referenceDiagnostics(profile, indexes),
      ...geometryDiagnostics(profile),
      ...compositionDiagnostics(profile),
      ...hydrologyDiagnostics(profile),
      ...settlementDiagnostics(profile),
      ...resourceDiagnostics(profile),
      ...timelineDiagnostics(profile.motion?.altitudeTimeline || [], 'motion.altitudeTimeline'),
      ...timelineDiagnostics(profile.motion?.driftTimeline || [], 'motion.driftTimeline'),
      ...visibilityDiagnostics(profile)
    ];
  }

  function recalculateDerived(profileInput) {
    const profile = clone(profileInput || {});
    const diagnostics = validate(profile);
    const brokenReferenceIds = unique(diagnostics.filter(item => item.code.startsWith('broken-')).map(item => item.referenceId));
    const has = code => diagnostics.some(item => item.code === code);
    return {
      geometryReconciles: !has('geometry-area-order-invalid'),
      compositionReconciles: !has('composition-total-invalid'),
      mapAreaReconciles: !has('map-area-mismatch'),
      waterCapacityReconciles: !has('reservoir-over-capacity') && !has('broken-water-reference'),
      foodCapacityReconciles: number(profile.foodCapacity?.sustainablePopulation) === number(profile.settlementCapacity?.foodLimitedPopulation),
      settlementCapacityReconciles: !has('settlement-capacity-mismatch'),
      brokenReferenceIds,
      warnings: unique([
        ...(profile.derived?.warnings || []),
        ...diagnostics.filter(item => item.severity === 'warning').map(item => item.message)
      ])
    };
  }

  function applyDerived(profileInput) {
    const profile = clone(profileInput || {});
    profile.derived = recalculateDerived(profile);
    return profile;
  }

  root.KaysenderIslandV3Domain = Object.freeze({
    applyDerived,
    duplicateDiagnostics,
    entityIndexes,
    recalculateDerived,
    referenceDiagnostics,
    timelineDiagnostics,
    validate,
    visibilityDiagnostics
  });
})();
