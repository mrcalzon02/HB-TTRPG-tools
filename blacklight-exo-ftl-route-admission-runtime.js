(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(
      require('./data/exo-vessel/ftl-route-admission-registry.json'),
      require('./blacklight-exo-ftl-maintenance-evidence-integration-runtime.js')
    );
  } else {
    root.BlacklightExoFTLRouteAdmissionRuntime = factory(
      root.BLACKLIGHT_FTL_ROUTE_ADMISSION_REGISTRY || null,
      root.BlacklightFTLMaintenanceEvidenceIntegration || null
    );
  }
}(typeof self !== 'undefined' ? self : this, function (registry, maintenanceIntegration) {
  'use strict';

  const FINAL = Object.freeze({
    ADMISSIBLE: 'ADMISSIBLE',
    MARGINAL: 'MARGINAL',
    REJECTED: 'REJECTED',
    UNRESOLVED: 'UNRESOLVED',
    OUTSIDE_MODEL_VALIDITY: 'OUTSIDE_MODEL_VALIDITY',
    CONFLICT: 'CONFLICT',
    SIMULATION_ONLY: 'SIMULATION_ONLY'
  });

  function unique(values) {
    return Array.from(new Set((values || []).filter((x) => x !== null && x !== undefined && x !== '')));
  }

  function finiteNonNegative(value) {
    return Number.isFinite(Number(value)) && Number(value) >= 0;
  }

  function maintenanceIsRequired(context) {
    if (context.maintenanceEvidenceRequired === true) return true;
    return !!(
      context.maintenanceEvidencePacket ||
      context.maintenanceEvidenceContext ||
      context.serviceEvent ||
      context.serviceEventKind ||
      context.technologyAdapter
    );
  }

  function maintenanceClass(packet, required) {
    if (!required && !packet) return 'NOT_REQUIRED';
    const status = String(packet && (packet.status || packet.maintenanceEvidence?.status || packet.maintenanceEvidence?.certification?.disposition) || 'UNRESOLVED').toUpperCase();
    if (status === 'CERTIFIED') return 'PASS';
    if (status === 'CONDITIONALLY_CERTIFIED') return 'CONDITIONAL';
    if (status === 'BLOCKED' || status === 'REJECTED') return 'BLOCK';
    if (status === 'CONFLICT') return 'CONFLICT';
    if (status === 'SIMULATION_ONLY') return 'SIMULATION_ONLY';
    return 'UNRESOLVED';
  }

  function routeClass(packet) {
    if (!packet) return 'NOT_EVALUATED';
    const status = String(packet.status || 'UNRESOLVED').toUpperCase();
    if (status === 'ADMISSIBLE') return 'PASS';
    if (status === 'MARGINAL') return 'CONDITIONAL';
    if (status === 'REJECTED' || status === 'OUTSIDE_MODEL_VALIDITY') return 'BLOCK';
    if (status === 'CONFLICT') return 'CONFLICT';
    return 'UNRESOLVED';
  }

  function resolveFreshness(context, packet, required) {
    const validity = finiteNonNegative(context.maintenanceEvidenceValiditySeconds)
      ? Number(context.maintenanceEvidenceValiditySeconds) : null;
    if (validity === null) {
      return { status: 'NOT_APPLICABLE', ageSeconds: null, validitySeconds: null, evaluationEpochSeconds: null, evidenceEpochSeconds: null };
    }

    const evaluation = finiteNonNegative(context.evaluationEpochSeconds)
      ? Number(context.evaluationEpochSeconds) : null;
    const explicitEvidenceEpoch = finiteNonNegative(context.maintenanceEvidenceEpochSeconds)
      ? Number(context.maintenanceEvidenceEpochSeconds) : null;
    const packetEpoch = packet && packet.maintenanceEvidence && packet.maintenanceEvidence.serviceEvent
      ? Number(packet.maintenanceEvidence.serviceEvent.epoch) : NaN;
    const evidenceEpoch = explicitEvidenceEpoch !== null
      ? explicitEvidenceEpoch : (finiteNonNegative(packetEpoch) ? packetEpoch : null);

    if (evaluation === null || evidenceEpoch === null) {
      return { status: required ? 'UNRESOLVED' : 'NOT_APPLICABLE', ageSeconds: null, validitySeconds: validity, evaluationEpochSeconds: evaluation, evidenceEpochSeconds: evidenceEpoch };
    }

    const age = Math.max(0, evaluation - evidenceEpoch);
    return {
      status: age > validity ? 'EXPIRED' : 'PASS',
      ageSeconds: age,
      validitySeconds: validity,
      evaluationEpochSeconds: evaluation,
      evidenceEpochSeconds: evidenceEpoch
    };
  }

  function deriveAdmission(maintenanceState, routeState, freshness, required, routePacket) {
    const reasons = [];

    if (maintenanceState === 'CONFLICT' || routeState === 'CONFLICT') {
      if (maintenanceState === 'CONFLICT') reasons.push('MAINTENANCE_CONFLICT');
      if (routeState === 'CONFLICT') reasons.push('ROUTE_CONFLICT');
      return { disposition: FINAL.CONFLICT, reasons };
    }

    if (freshness.status === 'EXPIRED') {
      reasons.push('MAINTENANCE_EVIDENCE_EXPIRED');
      return { disposition: FINAL.UNRESOLVED, reasons };
    }
    if (freshness.status === 'UNRESOLVED' && required) {
      reasons.push('MAINTENANCE_EVIDENCE_FRESHNESS_UNRESOLVED');
      return { disposition: FINAL.UNRESOLVED, reasons };
    }

    if (maintenanceState === 'BLOCK' || routeState === 'BLOCK') {
      if (maintenanceState === 'BLOCK') reasons.push('MAINTENANCE_BLOCK');
      if (routeState === 'BLOCK') reasons.push('ROUTE_BLOCK');
      if (routePacket && routePacket.status === 'OUTSIDE_MODEL_VALIDITY') {
        reasons.push('ROUTE_OUTSIDE_MODEL_VALIDITY');
        return { disposition: FINAL.OUTSIDE_MODEL_VALIDITY, reasons };
      }
      return { disposition: FINAL.REJECTED, reasons };
    }

    if (required && maintenanceState === 'UNRESOLVED') {
      reasons.push('MAINTENANCE_REQUIRED_UNRESOLVED');
      return { disposition: FINAL.UNRESOLVED, reasons };
    }
    if (routeState === 'UNRESOLVED' || routeState === 'NOT_EVALUATED') {
      reasons.push(routeState === 'NOT_EVALUATED' ? 'ROUTE_NOT_EVALUATED' : 'ROUTE_UNRESOLVED');
      return { disposition: FINAL.UNRESOLVED, reasons };
    }

    if (maintenanceState === 'SIMULATION_ONLY') {
      reasons.push('MAINTENANCE_SIMULATION_ONLY');
      return { disposition: FINAL.SIMULATION_ONLY, reasons };
    }

    if (maintenanceState === 'CONDITIONAL' || routeState === 'CONDITIONAL') {
      if (maintenanceState === 'CONDITIONAL') reasons.push('MAINTENANCE_CONDITIONAL');
      if (routeState === 'CONDITIONAL') reasons.push('ROUTE_MARGINAL');
      return { disposition: FINAL.MARGINAL, reasons };
    }

    reasons.push(required ? 'MAINTENANCE_CERTIFIED' : 'MAINTENANCE_NOT_REQUIRED');
    reasons.push('ROUTE_ADMISSIBLE');
    return { disposition: FINAL.ADMISSIBLE, reasons };
  }

  function resolveMaintenance(context, required) {
    if (context.maintenanceEvidencePacket) return context.maintenanceEvidencePacket;
    if (!required) return null;
    if (!maintenanceIntegration || typeof maintenanceIntegration.resolveIntegratedFTLMaintenanceEvidence !== 'function') {
      return {
        schemaVersion: '1.0.0',
        status: 'UNRESOLVED',
        maintenanceEvidence: { certification: { disposition: 'UNRESOLVED', reasons: ['MAINTENANCE_INTEGRATION_RUNTIME_UNAVAILABLE'] } },
        provenance: []
      };
    }
    const maintenanceContext = Object.assign({}, context.maintenanceEvidenceContext || {}, {
      adapter: (context.maintenanceEvidenceContext && context.maintenanceEvidenceContext.adapter) || context.technologyAdapter,
      technologyAdapter: (context.maintenanceEvidenceContext && context.maintenanceEvidenceContext.technologyAdapter) || context.technologyAdapter,
      family: context.family || context.request?.family || context.maintenanceEvidenceContext?.family || null,
      familyStatus: context.familyStatus || context.maintenanceEvidenceContext?.familyStatus,
      serviceEventKind: context.serviceEventKind || context.maintenanceEvidenceContext?.serviceEventKind,
      serviceEpoch: context.serviceEpoch || context.maintenanceEvidenceContext?.serviceEpoch,
      installationId: context.installationId || context.maintenanceEvidenceContext?.installationId,
      provenance: unique([...(context.maintenanceEvidenceContext?.provenance || []), ...(context.provenance || [])])
    });
    return maintenanceIntegration.resolveIntegratedFTLMaintenanceEvidence(maintenanceContext);
  }

  async function resolveRouteSafety(context) {
    if (context.routeSafetyPacket) return context.routeSafetyPacket;
    const runtime = context.routeSafetyRuntime || (typeof globalThis !== 'undefined' ? globalThis.BlacklightExoFTLRouteSafetyRuntime : null);
    if (!runtime || typeof runtime.resolveGeneratedFTLRouteSafety !== 'function') {
      return { status: 'UNRESOLVED', warnings: ['Route-safety runtime is unavailable.'], provenance: [] };
    }
    return runtime.resolveGeneratedFTLRouteSafety(context.routeSafetyContext || context);
  }

  async function resolveFTLRouteAdmission(context) {
    context = context || {};
    const required = maintenanceIsRequired(context);
    const maintenance = resolveMaintenance(context, required);
    const mClass = maintenanceClass(maintenance, required);
    const freshness = resolveFreshness(context, maintenance, required);

    // Do not spend route authority when a prior mandatory engineering gate already blocks.
    if (mClass === 'CONFLICT' || mClass === 'BLOCK' || (required && mClass === 'UNRESOLVED') || freshness.status === 'EXPIRED' || freshness.status === 'UNRESOLVED') {
      const early = deriveAdmission(mClass, 'NOT_EVALUATED', freshness, required, null);
      return {
        schemaVersion: '1.0.0',
        status: early.disposition,
        maintenanceRequired: required,
        maintenance,
        maintenanceFreshness: freshness,
        routeSafety: null,
        admission: { maintenanceClass: mClass, routeClass: 'NOT_EVALUATED', disposition: early.disposition, reasons: early.reasons },
        warnings: unique([
          'Route safety was not evaluated because a required maintenance/return-to-service gate already blocks operational admission.',
          ...(maintenance && maintenance.maintenanceEvidence && maintenance.maintenanceEvidence.certification ? maintenance.maintenanceEvidence.certification.reasons || [] : [])
        ]),
        provenance: unique([
          'blacklight.ftl.route-admission@1.0.0',
          ...(maintenance && Array.isArray(maintenance.provenance) ? maintenance.provenance.map((x) => typeof x === 'string' ? x : x.sourceId) : []),
          ...(context.provenance || [])
        ])
      };
    }

    const routeSafety = await resolveRouteSafety(context);
    const rClass = routeClass(routeSafety);
    const final = deriveAdmission(mClass, rClass, freshness, required, routeSafety);
    const warnings = unique([
      ...(routeSafety && Array.isArray(routeSafety.warnings) ? routeSafety.warnings : []),
      ...(maintenance && maintenance.maintenanceEvidence && maintenance.maintenanceEvidence.certification && Array.isArray(maintenance.maintenanceEvidence.certification.reasons)
        ? maintenance.maintenanceEvidence.certification.reasons.map((r) => 'Maintenance evidence: ' + r) : []),
      mClass === 'CONDITIONAL' && routeSafety && routeSafety.status === 'ADMISSIBLE'
        ? 'Route physics is admissible, but return-to-service evidence is conditional; final admission is MARGINAL.' : null,
      !required ? 'No maintenance event or explicit maintenance-evidence requirement was supplied; no recent service state was invented.' : null
    ]);

    return {
      schemaVersion: '1.0.0',
      status: final.disposition,
      maintenanceRequired: required,
      maintenance,
      maintenanceFreshness: freshness,
      routeSafety,
      admission: { maintenanceClass: mClass, routeClass: rClass, disposition: final.disposition, reasons: final.reasons },
      warnings,
      provenance: unique([
        'blacklight.ftl.route-admission@1.0.0',
        ...(maintenance && Array.isArray(maintenance.provenance) ? maintenance.provenance.map((x) => typeof x === 'string' ? x : x.sourceId) : []),
        ...(routeSafety && Array.isArray(routeSafety.provenance) ? routeSafety.provenance : []),
        ...(context.provenance || [])
      ])
    };
  }

  return {
    FINAL,
    resolveFTLRouteAdmission,
    maintenanceIsRequired,
    maintenanceClass,
    routeClass,
    resolveFreshness,
    registry: registry || null
  };
}));
