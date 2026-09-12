(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./data/exo-vessel/arnock-maintenance-fabrication-registry.json'));
  else root.BlacklightArnockServiceDocumentation = factory(root.BLACKLIGHT_ARNOCK_MAINTENANCE_FABRICATION_REGISTRY || null);
}(typeof self !== 'undefined' ? self : this, function (registry) {
  'use strict';

  const DEFAULT_TECH_BASIS = 'SOLID_STATE_ELECTROMECHANICAL_MODULAR';
  const DEFAULT_COMPUTE = 'solid-state silicon';

  function uniq(items) {
    return Array.from(new Set((items || []).filter(Boolean)));
  }

  function hasAny(tags, candidates) {
    const s = new Set((tags || []).map(String));
    return candidates.some((x) => s.has(x));
  }

  function tool(required, className, notes) {
    return { class: className, required: !!required, notes: notes || null };
  }

  function resolveTooling(context) {
    const tags = uniq([].concat(context.tags || [], context.functions || [], context.interfaces || []));
    const tools = [
      tool(true, 'identity-provenance', 'Capture module identity, revision, calibration state, installation ancestry, and service history before disturbance.'),
      tool(hasAny(tags, ['power','electrical','compute','control','sensor','actuator','propulsion','ftl']), 'electrical-characterization', 'Controlled power-up, insulation/leakage, IV/load response, and interface verification.'),
      tool(hasAny(tags, ['piezoelectric','vibration','alignment','structural','actuator','sensor']), 'piezo-resonance', 'Measure impedance/phase, resonance, anti-resonance, damping, and response symmetry where the module contains piezoelectric functions.'),
      tool(hasAny(tags, ['power','compute','control','actuator','propulsion','ftl','thermal','cooling']), 'thermal', 'Cold self-test is insufficient where load heating or coolant coupling affects serviceability.'),
      tool(hasAny(tags, ['mechanical','structural','alignment','actuator','propulsion','ftl']), 'mechanical-metrology', 'Verify datums, geometry, preload evidence, and temperature-dependent alignment.'),
      tool(hasAny(tags, ['compute','control','data','timing','reference','navigation','propulsion','ftl']), 'bus-timing-protocol', 'Electrical continuity does not establish deterministic response or certified latency.'),
      tool(hasAny(tags, ['fabrication','depot','foundry','remanufacture']), 'fabrication-joining', 'Required only when the service scope crosses the field-replaceable functional-module boundary.'),
      tool(true, 'clean-handling', 'Protect solid-state integrated modules and service interfaces from ESD and contamination.'),
      tool(hasAny(tags, ['food','feedstock','medical','life-support','environmental','biological']), 'biological-support', 'Secondary support tooling. Do not select this class merely because the system is Ar\'nock.')
    ];
    return tools;
  }

  function resolveServiceBoundary(context) {
    const replaceable = uniq(context.fieldReplaceable || ['complete functional module']);
    const bay = uniq(context.bayService || ['alignment', 'calibration', 'thermal validation', 'timing validation']);
    const depot = uniq(context.depotService || ['deep characterization', 'controlled internal reconstruction where process knowledge exists']);
    const foundry = uniq(context.foundryService || ['integrated substrate/material-process remanufacture']);
    return { field: replaceable, bay, depot, foundry };
  }

  function resolveTransitRecertification(context) {
    const tags = uniq([].concat(context.tags || [], context.functions || []));
    const triggerDomains = registry && registry.propulsionTransitRecertification ? registry.propulsionTransitRecertification.triggerDomains : [];
    const affected = [];
    const mapping = {
      sensor: 'family-required sensing', navigation: 'family-required sensing', solver: 'solver timing', compute: 'solver timing',
      command: 'command propagation', data: 'command propagation', timing: 'command propagation', actuator: 'actuator response',
      field: 'effect-former geometry', propulsion: 'effect-former geometry', ftl: 'effect-former geometry', exit: 'exit or de-transit machinery',
      recovery: 'protected recovery reserve', power: 'sectional power or cooling', cooling: 'sectional power or cooling',
      structural: 'structural alignment', alignment: 'structural alignment', calibration: 'reference/calibration state', reference: 'reference/calibration state'
    };
    tags.forEach((t) => { if (mapping[t]) affected.push(mapping[t]); });
    const filtered = uniq(affected).filter((x) => !triggerDomains.length || triggerDomains.includes(x));
    const required = !!context.touchesTransitSafety || filtered.length > 0 && hasAny(tags, ['propulsion','ftl','field','exit','recovery','navigation','reference']);
    return {
      required,
      familyStatus: context.family ? 'RESOLVED' : (required ? 'UNRESOLVED' : 'NOT_APPLICABLE'),
      family: context.family || null,
      affectedDomains: filtered,
      timingImpactSeconds: Number.isFinite(context.timingImpactSeconds) && context.timingImpactSeconds >= 0 ? context.timingImpactSeconds : null,
      notes: required && !context.family ? 'Transit recertification is required, but family-specific procedure remains unresolved until family identity is independently established.' : null
    };
  }

  function resolveAcceptance(context, transit) {
    const staticTests = !!context.staticTests;
    const dynamicTests = !!context.dynamicTests;
    const thermalSoak = !!context.thermalSoak;
    const timingTests = !!context.timingTests;
    const evidenceComplete = !!context.evidenceComplete;
    const recertificationComplete = transit.required ? !!context.recertificationComplete : null;
    let status = 'UNRESOLVED';
    if (context.rejected) status = 'REJECTED';
    else if (evidenceComplete && staticTests && dynamicTests && thermalSoak && timingTests && (!transit.required || recertificationComplete)) status = 'ACCEPTED';
    else if (staticTests || dynamicTests || thermalSoak || timingTests) status = 'CONDITIONAL';
    return { status, evidenceComplete, staticTests, dynamicTests, thermalSoak, timingTests, recertificationComplete };
  }

  function resolveArnockServicePacket(context) {
    context = context || {};
    const transit = resolveTransitRecertification(context);
    const biologicalException = context.biologicalExceptionSource ? {
      source: String(context.biologicalExceptionSource),
      scope: String(context.biologicalExceptionScope || 'subsystem-specific biological exception')
    } : null;

    return {
      schemaVersion: '1.0.0',
      species: "Ar'nock",
      systemIdentity: {
        systemId: String(context.systemId || 'UNRESOLVED'),
        name: String(context.name || 'Unresolved Ar\'nock system'),
        function: String(context.function || 'UNRESOLVED'),
        status: context.status || 'UNRESOLVED',
        manufacturer: context.manufacturer || null,
        installationId: context.installationId || null,
        hardwareRevision: context.hardwareRevision || null,
        logicRevision: context.logicRevision || null
      },
      technologyBasis: {
        primaryBasis: DEFAULT_TECH_BASIS,
        computeSubstrate: DEFAULT_COMPUTE,
        serviceModel: 'functional-module',
        piezoelectricRoles: uniq(context.piezoelectricRoles || []),
        biologicalException
      },
      serviceBoundary: resolveServiceBoundary(context),
      interfaces: {
        mechanicalDatum: context.mechanicalDatum || null,
        power: context.powerInterface || null,
        dataControl: context.dataControlInterface || null,
        thermal: context.thermalInterface || null,
        environmentalBoundary: context.environmentalBoundary || null,
        calibrationIdentity: context.calibrationIdentity || null,
        fluid: context.fluidInterface || null,
        referenceTiming: context.referenceTiming || null
      },
      tools: resolveTooling(context),
      inspectionEvidence: Array.isArray(context.inspectionEvidence) ? context.inspectionEvidence.slice() : [],
      calibration: {
        status: context.calibrationStatus || 'UNRESOLVED',
        identity: context.calibrationIdentity || null,
        epoch: context.calibrationEpoch || null,
        referenceState: context.referenceState || null,
        crossCovarianceStatus: context.crossCovarianceStatus || 'UNKNOWN'
      },
      transitRecertification: transit,
      acceptance: resolveAcceptance(context, transit),
      failureSignatures: uniq(context.failureSignatures || []),
      provenance: Array.isArray(context.provenance) && context.provenance.length ? context.provenance.slice() : [{
        source: 'blacklight.arnock.maintenance-fabrication',
        status: 'DERIVED',
        scope: 'Generated service packet from authoritative Ar\'nock maintenance/fabrication grammar.',
        notes: 'Generated values do not become setting-wide canon.'
      }]
    };
  }

  return {
    resolveArnockServicePacket,
    resolveTooling,
    resolveServiceBoundary,
    resolveTransitRecertification,
    registry: registry || null
  };
}));
