(() => {
  'use strict';

  const root = typeof window !== 'undefined' ? window : globalThis;
  const base = root.KaysenderIslandV3Transformers;
  if (!base) throw new Error('KaysenderIslandV3Transformers must load before the Island v3 consumer builders.');

  const clone = value => value === undefined ? undefined : JSON.parse(JSON.stringify(value));
  const number = value => Number.isFinite(Number(value)) ? Number(value) : 0;
  const unique = values => [...new Set((values || []).filter(Boolean).map(String))];
  const joinReadable = values => {
    const items = unique(values);
    if (!items.length) return 'none';
    if (items.length === 1) return items[0];
    return `${items.slice(0, -1).join(', ')} and ${items.at(-1)}`;
  };
  const capitalize = value => {
    const text = String(value || 'unknown');
    return text.charAt(0).toUpperCase() + text.slice(1);
  };

  function bindingConstraint(capacity = {}) {
    return [
      ['water', number(capacity.waterLimitedPopulation)],
      ['food', number(capacity.foodLimitedPopulation)],
      ['land', number(capacity.landLimitedPopulation)]
    ].sort((a, b) => a[1] - b[1])[0]?.[0] || 'unknown';
  }

  function populationConstraints(profile, payload) {
    const binding = bindingConstraint(profile.settlementCapacity);
    const occupied = payload.settlementSlots.filter(slot => slot.status === 'occupied');
    const severeCells = unique(payload.knownHazards
      .filter(hazard => ['major', 'critical'].includes(hazard.severity) && hazard.status === 'active')
      .flatMap(hazard => hazard.cellIds));
    const constraints = [
      `${capitalize(binding)} capacity is the binding population limit at ${profile.settlementCapacity.sustainablePopulation} people.`
    ];
    if (occupied.length) {
      constraints.push(`Occupied settlement slots are locally capped as follows: ${occupied.map(slot => `${slot.id} — ${slot.maximumPopulation} people`).join('; ')}.`);
    }
    constraints.push(`Emergency population above ${profile.settlementCapacity.sustainablePopulation} requires temporary stores, imports, rationing, or displacement into non-settlement areas.`);
    if (severeCells.length) constraints.push(`Residential expansion requires explicit mitigation in cells affected by active major or critical hazards: ${joinReadable(severeCells)}.`);
    return constraints;
  }

  function settlementConstraints(payload) {
    const slot = payload.selectedSettlementSlot;
    const landingLimits = payload.referencedLandingZones
      .filter(zone => zone.weatherLimit)
      .map(zone => `${zone.name || zone.id} — ${zone.weatherLimit}`);
    return [
      `Keep ${slot.id} within its ${slot.maximumFootprintKm2} km² footprint unless the parent Island adds or revises a slot.`,
      `Use only referenced water sources ${joinReadable(slot.waterSourceIds)} and landing zones ${joinReadable(slot.landingZoneIds)}.`,
      landingLimits.length ? `Landing constraints: ${landingLimits.join('; ')}.` : 'No landing-zone weather limit is recorded in this payload.',
      'Exclude hidden parent records from this standard settlement payload.'
    ];
  }

  function ecologyConstraints(profile, payload) {
    const habitatIds = payload.habitats.map(item => item.id);
    const speciesIds = payload.speciesSlots.map(item => item.id);
    const cellIds = payload.habitatCells.map(item => item.id);
    return [
      `Retain habitat IDs ${joinReadable(habitatIds)} and species-slot IDs ${joinReadable(speciesIds)}.`,
      `Habitat coverage is limited to source cells ${joinReadable(cellIds)}.`,
      `Current extraction is ${profile.resources.currentAnnualExtractionTons} of ${profile.resources.annualSafeExtractionTons} safe annual tons; downstream ecology must preserve that pressure context.`,
      'Hidden parent sites and secrets are excluded from this standard ecology payload.'
    ];
  }

  function routeConstraints(profile, payload) {
    const nodeNames = payload.nodes.map(node => node.name || node.id);
    const hazards = payload.knownApproachHazards.map(hazard => `${hazard.name || hazard.id} (${hazard.severity}, ${hazard.status})`);
    return [
      `This payload exposes ${payload.nodes.length} route ${payload.nodes.length === 1 ? 'node' : 'nodes'}: ${joinReadable(nodeNames)}.`,
      'Use the source altitude and drift timelines rather than treating the Island as stationary.',
      hazards.length ? `Approach hazards: ${hazards.join('; ')}.` : 'No player-known approach hazard is exported for these corridors.',
      `Maximum daily arrivals cannot exceed ${profile.routeNodeExport.routeCapability.maximumDailyArrivals} without a parent Island revision.`,
      'Hidden parent records are excluded from this standard route payload.'
    ];
  }

  function buildPopulationPayload(profile, source = {}) {
    const result = clone(base.buildPopulationPayload(profile, source));
    result.payload.constraints = populationConstraints(profile, result.payload);
    return result;
  }

  function buildSettlementPayload(profile, settlementSlotId = '', source = {}) {
    const result = clone(base.buildSettlementPayload(profile, settlementSlotId, source));
    result.payload.designConstraints = settlementConstraints(result.payload);
    return result;
  }

  function buildEcologyPayload(profile, source = {}) {
    const result = clone(base.buildEcologyPayload(profile, source));
    result.payload.ecologicalConstraints = ecologyConstraints(profile, result.payload);
    return result;
  }

  function buildRoutePayload(profile, source = {}) {
    const result = clone(base.buildRoutePayload(profile, source));
    result.payload.routingConstraints = routeConstraints(profile, result.payload);
    return result;
  }

  function buildDownstreamPayloads(profile, source = {}, settlementSlotId = '') {
    return {
      population: buildPopulationPayload(profile, source),
      settlement: profile.settlementCapacity?.settlementSlots?.length ? buildSettlementPayload(profile, settlementSlotId, source) : null,
      ecology: buildEcologyPayload(profile, source),
      route: buildRoutePayload(profile, source)
    };
  }

  function buildDownstreamExports(profile, source = {}) {
    const legacy = clone(base.buildDownstreamExports(profile, source));
    const payloads = buildDownstreamPayloads(profile, source);
    legacy.population = payloads.population?.payload || {};
    legacy.settlement = payloads.settlement?.payload || {};
    legacy.ecology = payloads.ecology?.payload || {};
    legacy.route = payloads.route?.payload || {};
    return legacy;
  }

  function migrateV2ToV3(input) {
    const result = clone(base.migrateV2ToV3(input));
    result.data.outputs.downstreamExports = buildDownstreamExports(result.data, {});
    return result;
  }

  root.KaysenderIslandV3Transformers = Object.freeze({
    ...base,
    buildDownstreamExports,
    buildDownstreamPayloads,
    buildEcologyPayload,
    buildPopulationPayload,
    buildRoutePayload,
    buildSettlementPayload,
    migrateV2ToV3,
    populationConstraints,
    settlementConstraints,
    ecologyConstraints,
    routeConstraints
  });
})();
