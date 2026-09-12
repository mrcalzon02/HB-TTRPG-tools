(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(
      require('./data/exo-vessel/ftl-route-admission-registry.json'),
      require('./blacklight-exo-ftl-maintenance-evidence-integration-runtime.js'),
      require('./blacklight-exo-ftl-operating-envelope-runtime.js')
    );
  } else {
    root.BlacklightExoFTLRouteAdmissionRuntime = factory(
      root.BLACKLIGHT_FTL_ROUTE_ADMISSION_REGISTRY || null,
      root.BlacklightFTLMaintenanceEvidenceIntegration || null,
      root.BlacklightExoFTLOperatingEnvelopeRuntime || null
    );
  }
}(typeof self !== 'undefined' ? self : this, function (registry, maintenanceIntegration, operatingEnvelopeRuntime) {
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
    return !!(context.maintenanceEvidencePacket || context.maintenanceEvidenceContext || context.serviceEvent || context.serviceEventKind || context.technologyAdapter);
  }

  function envelopeIsRequired(context) {
    if (context.operatingEnvelopeRequired === true) return true;
    return !!(context.operatingEnvelopePacket || context.operatingEnvelopeCertificate || context.operatingDemand || context.requestedOperatingPoint);
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

  function envelopeClass(packet, required) {
    if (!required && !packet) return 'NOT_REQUIRED';
    const status = String(packet && packet.status || 'UNRESOLVED').toUpperCase();
    if (status === 'PASS' || status === 'CERTIFIED') return 'PASS';
    if (status === 'CONDITIONAL' || status === 'CONDITIONALLY_CERTIFIED') return 'CONDITIONAL';
    if (status === 'BLOCK' || status === 'BLOCKED' || status === 'REJECTED') return 'BLOCK';
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
    const validity = finiteNonNegative(context.maintenanceEvidenceValiditySeconds) ? Number(context.maintenanceEvidenceValiditySeconds) : null;
    if (validity === null) return { status: 'NOT_APPLICABLE', ageSeconds: null, validitySeconds: null, evaluationEpochSeconds: null, evidenceEpochSeconds: null };
    const evaluation = finiteNonNegative(context.evaluationEpochSeconds) ? Number(context.evaluationEpochSeconds) : null;
    const explicitEvidenceEpoch = finiteNonNegative(context.maintenanceEvidenceEpochSeconds) ? Number(context.maintenanceEvidenceEpochSeconds) : null;
    const packetEpoch = packet && packet.maintenanceEvidence && packet.maintenanceEvidence.serviceEvent ? Number(packet.maintenanceEvidence.serviceEvent.epoch) : NaN;
    const evidenceEpoch = explicitEvidenceEpoch !== null ? explicitEvidenceEpoch : (finiteNonNegative(packetEpoch) ? packetEpoch : null);
    if (evaluation === null || evidenceEpoch === null) return { status: required ? 'UNRESOLVED' : 'NOT_APPLICABLE', ageSeconds: null, validitySeconds: validity, evaluationEpochSeconds: evaluation, evidenceEpochSeconds: evidenceEpoch };
    const age = Math.max(0, evaluation - evidenceEpoch);
    return { status: age > validity ? 'EXPIRED' : 'PASS', ageSeconds: age, validitySeconds: validity, evaluationEpochSeconds: evaluation, evidenceEpochSeconds: evidenceEpoch };
  }

  function deriveAdmission(maintenanceState, envelopeState, routeState, freshness, maintenanceRequired, envelopeRequired, routePacket) {
    const reasons = [];
    if (maintenanceState === 'CONFLICT' || envelopeState === 'CONFLICT' || routeState === 'CONFLICT') {
      if (maintenanceState === 'CONFLICT') reasons.push('MAINTENANCE_CONFLICT');
      if (envelopeState === 'CONFLICT') reasons.push('OPERATING_ENVELOPE_CONFLICT');
      if (routeState === 'CONFLICT') reasons.push('ROUTE_CONFLICT');
      return { disposition: FINAL.CONFLICT, reasons };
    }
    if (freshness.status === 'EXPIRED') return { disposition: FINAL.UNRESOLVED, reasons: ['MAINTENANCE_EVIDENCE_EXPIRED'] };
    if (freshness.status === 'UNRESOLVED' && maintenanceRequired) return { disposition: FINAL.UNRESOLVED, reasons: ['MAINTENANCE_EVIDENCE_FRESHNESS_UNRESOLVED'] };
    if (maintenanceState === 'BLOCK' || envelopeState === 'BLOCK' || routeState === 'BLOCK') {
      if (maintenanceState === 'BLOCK') reasons.push('MAINTENANCE_BLOCK');
      if (envelopeState === 'BLOCK') reasons.push('OPERATING_ENVELOPE_BLOCK');
      if (routeState === 'BLOCK') reasons.push('ROUTE_BLOCK');
      if (routePacket && routePacket.status === 'OUTSIDE_MODEL_VALIDITY') {
        reasons.push('ROUTE_OUTSIDE_MODEL_VALIDITY');
        return { disposition: FINAL.OUTSIDE_MODEL_VALIDITY, reasons };
      }
      return { disposition: FINAL.REJECTED, reasons };
    }
    if (maintenanceRequired && maintenanceState === 'UNRESOLVED') return { disposition: FINAL.UNRESOLVED, reasons: ['MAINTENANCE_REQUIRED_UNRESOLVED'] };
    if (envelopeRequired && envelopeState === 'UNRESOLVED') return { disposition: FINAL.UNRESOLVED, reasons: ['OPERATING_ENVELOPE_REQUIRED_UNRESOLVED'] };
    if (routeState === 'UNRESOLVED' || routeState === 'NOT_EVALUATED') return { disposition: FINAL.UNRESOLVED, reasons: [routeState === 'NOT_EVALUATED' ? 'ROUTE_NOT_EVALUATED' : 'ROUTE_UNRESOLVED'] };
    if (maintenanceState === 'SIMULATION_ONLY' || envelopeState === 'SIMULATION_ONLY') {
      if (maintenanceState === 'SIMULATION_ONLY') reasons.push('MAINTENANCE_SIMULATION_ONLY');
      if (envelopeState === 'SIMULATION_ONLY') reasons.push('OPERATING_ENVELOPE_SIMULATION_ONLY');
      return { disposition: FINAL.SIMULATION_ONLY, reasons };
    }
    if (maintenanceState === 'CONDITIONAL' || envelopeState === 'CONDITIONAL' || routeState === 'CONDITIONAL') {
      if (maintenanceState === 'CONDITIONAL') reasons.push('MAINTENANCE_CONDITIONAL');
      if (envelopeState === 'CONDITIONAL') reasons.push('OPERATING_ENVELOPE_CONDITIONAL');
      if (routeState === 'CONDITIONAL') reasons.push('ROUTE_MARGINAL');
      return { disposition: FINAL.MARGINAL, reasons };
    }
    reasons.push(maintenanceRequired ? 'MAINTENANCE_CERTIFIED' : 'MAINTENANCE_NOT_REQUIRED');
    reasons.push(envelopeRequired ? 'OPERATING_ENVELOPE_PASS' : 'OPERATING_ENVELOPE_NOT_REQUIRED');
    reasons.push('ROUTE_ADMISSIBLE');
    return { disposition: FINAL.ADMISSIBLE, reasons };
  }

  function resolveMaintenance(context, required) {
    if (context.maintenanceEvidencePacket) return context.maintenanceEvidencePacket;
    if (!required) return null;
    if (!maintenanceIntegration || typeof maintenanceIntegration.resolveIntegratedFTLMaintenanceEvidence !== 'function') {
      return { schemaVersion: '1.0.0', status: 'UNRESOLVED', maintenanceEvidence: { certification: { disposition: 'UNRESOLVED', reasons: ['MAINTENANCE_INTEGRATION_RUNTIME_UNAVAILABLE'] } }, provenance: [] };
    }
    const maintenanceContext = Object.assign({}, context.maintenanceEvidenceContext || {}, {
      adapter: context.maintenanceEvidenceContext?.adapter || context.technologyAdapter,
      technologyAdapter: context.maintenanceEvidenceContext?.technologyAdapter || context.technologyAdapter,
      family: context.family || context.request?.family || context.maintenanceEvidenceContext?.family || null,
      familyStatus: context.familyStatus || context.maintenanceEvidenceContext?.familyStatus,
      serviceEventKind: context.serviceEventKind || context.maintenanceEvidenceContext?.serviceEventKind,
      serviceEpoch: context.serviceEpoch || context.maintenanceEvidenceContext?.serviceEpoch,
      installationId: context.installationId || context.maintenanceEvidenceContext?.installationId,
      provenance: unique([...(context.maintenanceEvidenceContext?.provenance || []), ...(context.provenance || [])])
    });
    return maintenanceIntegration.resolveIntegratedFTLMaintenanceEvidence(maintenanceContext);
  }

  function resolveEnvelope(context, required) {
    if (context.operatingEnvelopePacket) return context.operatingEnvelopePacket;
    if (!required) return null;
    if (!operatingEnvelopeRuntime || typeof operatingEnvelopeRuntime.resolveFTLOperatingEnvelope !== 'function') {
      return { schemaVersion: '1.0.0', status: 'UNRESOLVED', dimensions: [], coupledConstraints: [], warnings: ['Operating-envelope runtime is unavailable.'], provenance: [] };
    }
    return operatingEnvelopeRuntime.resolveFTLOperatingEnvelope({
      operatingEnvelopeCertificate: context.operatingEnvelopeCertificate,
      operatingDemand: context.operatingDemand || context.requestedOperatingPoint,
      installationId: context.installationId,
      technologyBasis: context.technologyBasis,
      family: context.family || context.request?.family || null,
      familyStatus: context.familyStatus,
      provenance: context.provenance || []
    });
  }

  async function resolveRouteSafety(context) {
    if (context.routeSafetyPacket) return context.routeSafetyPacket;
    const runtime = context.routeSafetyRuntime || (typeof globalThis !== 'undefined' ? globalThis.BlacklightExoFTLRouteSafetyRuntime : null);
    if (!runtime || typeof runtime.resolveGeneratedFTLRouteSafety !== 'function') return { status: 'UNRESOLVED', warnings: ['Route-safety runtime is unavailable.'], provenance: [] };
    return runtime.resolveGeneratedFTLRouteSafety(context.routeSafetyContext || context);
  }

  async function resolveFTLRouteAdmission(context) {
    context = context || {};
    const maintenanceRequired = maintenanceIsRequired(context);
    const envelopeRequired = envelopeIsRequired(context);
    const maintenance = resolveMaintenance(context, maintenanceRequired);
    const envelope = resolveEnvelope(context, envelopeRequired);
    const mClass = maintenanceClass(maintenance, maintenanceRequired);
    const eClass = envelopeClass(envelope, envelopeRequired);
    const freshness = resolveFreshness(context, maintenance, maintenanceRequired);

    const earlyBlock = mClass === 'CONFLICT' || mClass === 'BLOCK' || (maintenanceRequired && mClass === 'UNRESOLVED') ||
      eClass === 'CONFLICT' || eClass === 'BLOCK' || (envelopeRequired && eClass === 'UNRESOLVED') ||
      freshness.status === 'EXPIRED' || freshness.status === 'UNRESOLVED';

    if (earlyBlock) {
      const early = deriveAdmission(mClass, eClass, 'NOT_EVALUATED', freshness, maintenanceRequired, envelopeRequired, null);
      return {
        schemaVersion: '1.1.0', status: early.disposition,
        maintenanceRequired, operatingEnvelopeRequired: envelopeRequired,
        maintenance, maintenanceFreshness: freshness, operatingEnvelope: envelope, routeSafety: null,
        admission: { maintenanceClass: mClass, operatingEnvelopeClass: eClass, routeClass: 'NOT_EVALUATED', disposition: early.disposition, reasons: early.reasons },
        warnings: unique([
          'Route safety was not evaluated because a prior required engineering gate blocks operational admission.',
          ...(envelope && Array.isArray(envelope.warnings) ? envelope.warnings : []),
          ...(maintenance && maintenance.maintenanceEvidence?.certification ? maintenance.maintenanceEvidence.certification.reasons || [] : [])
        ]),
        provenance: unique(['blacklight.ftl.route-admission@1.1.0', ...(maintenance?.provenance || []).map((x) => typeof x === 'string' ? x : x.sourceId), ...(envelope?.provenance || []), ...(context.provenance || [])])
      };
    }

    const routeSafety = await resolveRouteSafety(context);
    const rClass = routeClass(routeSafety);
    const final = deriveAdmission(mClass, eClass, rClass, freshness, maintenanceRequired, envelopeRequired, routeSafety);
    const warnings = unique([
      ...(routeSafety?.warnings || []),
      ...(envelope?.warnings || []),
      ...(maintenance?.maintenanceEvidence?.certification?.reasons || []).map((r) => 'Maintenance evidence: ' + r),
      eClass === 'CONDITIONAL' && routeSafety?.status === 'ADMISSIBLE' ? 'Route physics is admissible, but the requested operating point lies inside an authority-defined envelope advisory margin; final admission is MARGINAL.' : null,
      mClass === 'CONDITIONAL' && routeSafety?.status === 'ADMISSIBLE' ? 'Route physics is admissible, but return-to-service evidence is conditional; final admission is MARGINAL.' : null,
      !maintenanceRequired ? 'No maintenance event or explicit maintenance-evidence requirement was supplied; no recent service state was invented.' : null,
      !envelopeRequired ? 'No certified operating-envelope comparison was requested or supplied; no capability envelope was invented.' : null
    ]);

    return {
      schemaVersion: '1.1.0', status: final.disposition,
      maintenanceRequired, operatingEnvelopeRequired: envelopeRequired,
      maintenance, maintenanceFreshness: freshness, operatingEnvelope: envelope, routeSafety,
      admission: { maintenanceClass: mClass, operatingEnvelopeClass: eClass, routeClass: rClass, disposition: final.disposition, reasons: final.reasons },
      warnings,
      provenance: unique(['blacklight.ftl.route-admission@1.1.0', ...(maintenance?.provenance || []).map((x) => typeof x === 'string' ? x : x.sourceId), ...(envelope?.provenance || []), ...(routeSafety?.provenance || []), ...(context.provenance || [])])
    };
  }

  return { FINAL, resolveFTLRouteAdmission, maintenanceIsRequired, envelopeIsRequired, maintenanceClass, envelopeClass, routeClass, resolveFreshness, registry: registry || null };
}));
