(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(
      require('./data/exo-vessel/ftl-route-predictive-closure-registry.json'),
      require('./blacklight-exo-ftl-predictive-safety-horizon-runtime.js')
    );
  } else {
    root.BlacklightExoFTLRoutePredictiveClosureRuntime = factory(
      root.BLACKLIGHT_FTL_ROUTE_PREDICTIVE_CLOSURE_REGISTRY || null,
      root.BlacklightExoFTLPredictiveSafetyHorizonRuntime || null
    );
  }
}(typeof self !== 'undefined' ? self : this, function (registry, predictiveRuntime) {
  'use strict';

  const STATUS = Object.freeze({PASS:'PASS', CONDITIONAL:'CONDITIONAL', BLOCK:'BLOCK', UNRESOLVED:'UNRESOLVED', CONFLICT:'CONFLICT', SIMULATION_ONLY:'SIMULATION_ONLY'});
  const unique = (xs) => Array.from(new Set((xs || []).filter((x) => x !== null && x !== undefined && x !== '')));
  const finiteNN = (x) => Number.isFinite(Number(x)) && Number(x) >= 0;

  function routeClass(packet) {
    const s = String(packet?.status || 'UNRESOLVED').toUpperCase();
    if (s === 'ADMISSIBLE') return 'PASS';
    if (s === 'MARGINAL') return 'CONDITIONAL';
    if (s === 'REJECTED' || s === 'OUTSIDE_MODEL_VALIDITY') return 'BLOCK';
    if (s === 'CONFLICT') return 'CONFLICT';
    return 'UNRESOLVED';
  }

  function predictiveClass(packet) {
    const s = String(packet?.status || 'UNRESOLVED').toUpperCase();
    return Object.values(STATUS).includes(s) ? s : 'UNRESOLVED';
  }

  function canonicalFamily(context, routeSafety) {
    return routeSafety?.family || context.family || context.request?.family || null;
  }

  function blockerBinding(routeSafety, context) {
    if (finiteNN(context.hazardDistanceLower)) {
      return {source:'explicit.hazardDistanceLower', distanceM:Number(context.hazardDistanceLower), kind:'CONSERVATIVE', derivedFromRouteSafety:false};
    }
    const c = routeSafety?.conservativeBlocker;
    if (c?.applicableToCertifiedBlocker !== false && finiteNN(c?.effectiveDistanceToBlockingSegmentM)) {
      return {source:'routeSafety.conservativeBlocker.effectiveDistanceToBlockingSegmentM', distanceM:Number(c.effectiveDistanceToBlockingSegmentM), kind:'CONSERVATIVE', derivedFromRouteSafety:true};
    }
    const disposition = routeSafety?.familySegmentCertification?.routeDisposition || null;
    if (finiteNN(disposition?.distanceToFirstBlockingSegmentM)) {
      const conservative = finiteNN(disposition?.nominalDistanceToFirstBlockingSegmentM) && Number(disposition.distanceToFirstBlockingSegmentM) < Number(disposition.nominalDistanceToFirstBlockingSegmentM);
      return {source:'routeSafety.familySegmentCertification.routeDisposition.distanceToFirstBlockingSegmentM', distanceM:Number(disposition.distanceToFirstBlockingSegmentM), kind:conservative?'CONSERVATIVE':'NOMINAL', derivedFromRouteSafety:true};
    }
    if (finiteNN(disposition?.nominalDistanceToFirstBlockingSegmentM)) {
      return {source:'routeSafety.familySegmentCertification.routeDisposition.nominalDistanceToFirstBlockingSegmentM', distanceM:Number(disposition.nominalDistanceToFirstBlockingSegmentM), kind:'NOMINAL', derivedFromRouteSafety:true};
    }
    return {source:null, distanceM:null, kind:'UNAVAILABLE', derivedFromRouteSafety:false};
  }

  function interventionTiming(routeSafety, context) {
    if (finiteNN(context.interventionTimeUpper)) return Number(context.interventionTimeUpper);
    const timingPacket = routeSafety?.installationSafetyTiming || context.installationSafetyTiming || context.timingPacket || null;
    const timing = timingPacket?.timing || context.safetyState || context.timing || null;
    if (!timing) return null;
    const keys = ['sensorTime','solverTime','decisionTime','commandTime','actuationTime','exitTime','clearTime','marginTime'];
    return keys.every((k) => finiteNN(timing[k])) ? keys.reduce((sum,k)=>sum+Number(timing[k]),0) : null;
  }

  function deriveStatus(routeState, predictiveState) {
    if (routeState === 'CONFLICT' || predictiveState === 'CONFLICT') return STATUS.CONFLICT;
    if (routeState === 'BLOCK' || predictiveState === 'BLOCK') return STATUS.BLOCK;
    if (routeState === 'UNRESOLVED' || predictiveState === 'UNRESOLVED') return STATUS.UNRESOLVED;
    if (predictiveState === 'SIMULATION_ONLY') return STATUS.SIMULATION_ONLY;
    if (routeState === 'CONDITIONAL' || predictiveState === 'CONDITIONAL') return STATUS.CONDITIONAL;
    return STATUS.PASS;
  }

  async function resolveRouteSafety(context) {
    if (context.routeSafetyPacket) return context.routeSafetyPacket;
    const runtime = context.routeSafetyRuntime || (typeof globalThis !== 'undefined' ? globalThis.BlacklightExoFTLRouteSafetyRuntime : null);
    if (!runtime?.resolveGeneratedFTLRouteSafety) return {status:'UNRESOLVED', warnings:['Route-safety runtime is unavailable.'], provenance:[]};
    return runtime.resolveGeneratedFTLRouteSafety(context.routeSafetyContext || context);
  }

  async function resolveFTLRoutePredictiveClosure(context) {
    context = context || {};
    const routeSafety = await resolveRouteSafety(context);
    const family = canonicalFamily(context, routeSafety);
    const routeState = routeClass(routeSafety);
    const binding = blockerBinding(routeSafety, context);
    const warnings = [];

    if (routeState === 'CONFLICT' || routeState === 'BLOCK') {
      warnings.push('Route safety itself is blocking; predictive timing is preserved as secondary evidence and may not promote the route.');
    }

    if (!predictiveRuntime?.resolvePredictiveSafetyHorizon) {
      const predictive = {schemaVersion:'1.0.1', status:'UNRESOLVED', family, warnings:['Predictive-safety runtime is unavailable.'], provenance:[]};
      return {schemaVersion:'1.0.0', status:deriveStatus(routeState,'UNRESOLVED'), family, routeSafety, predictiveSafetyHorizon:predictive, blockerBinding:binding, admissionContext:{routeSafetyPacket:routeSafety,predictiveSafetyHorizonPacket:predictive}, warnings:unique(warnings.concat(predictive.warnings)), provenance:unique(['blacklight.ftl.route-predictive-closure@1.0.0', ...(routeSafety?.provenance||[])])};
    }

    const mode = context.predictiveHorizonMode || context.decisionHorizonMode || routeSafety?.installationSafetyTiming?.timing?.decisionHorizonMode || null;
    const intervention = interventionTiming(routeSafety, context);
    const predictiveContext = Object.assign({}, context.predictiveSafetyContext || {}, {
      family,
      mode,
      decisionHorizonMode: mode,
      predictionHorizonLower: context.predictionHorizonLower ?? context.predictionTimeLower ?? context.predictiveSafetyContext?.predictionHorizonLower,
      predictionHorizonUncertaintyLower: context.predictionHorizonUncertaintyLower ?? context.predictiveSafetyContext?.predictionHorizonUncertaintyLower,
      interventionTimeUpper: intervention,
      interventionTimeUncertaintyUpper: context.interventionTimeUncertaintyUpper ?? context.predictiveSafetyContext?.interventionTimeUncertaintyUpper,
      hazardDistanceLower: binding.distanceM,
      hazardDistanceUncertaintyLower: context.hazardDistanceUncertaintyLower ?? context.predictiveSafetyContext?.hazardDistanceUncertaintyLower,
      projectedProgressRateUpper: context.projectedProgressRateUpper ?? context.projectedProgressRate ?? context.predictiveSafetyContext?.projectedProgressRateUpper,
      projectedProgressRateUncertaintyUpper: context.projectedProgressRateUncertaintyUpper ?? context.predictiveSafetyContext?.projectedProgressRateUncertaintyUpper,
      commitWindowLower: context.commitWindowLower ?? context.predictiveSafetyContext?.commitWindowLower,
      admissionValidityLower: context.admissionValidityLower ?? context.predictiveSafetyContext?.admissionValidityLower,
      closureHorizonLower: context.closureHorizonLower ?? context.predictiveSafetyContext?.closureHorizonLower,
      advisoryMarginSeconds: context.predictiveAdvisoryMarginSeconds ?? context.predictiveSafetyContext?.advisoryMarginSeconds,
      observedHazardEvidence: context.observedHazardEvidence || context.predictiveSafetyContext?.observedHazardEvidence,
      requireHazardEvidence: context.requirePredictiveHazardEvidence === true || context.predictiveSafetyContext?.requireHazardEvidence === true,
      provenance: unique(['blacklight.ftl.route-predictive-closure@1.0.0', binding.source, ...(routeSafety?.provenance||[]), ...(context.provenance||[])])
    });

    const predictive = predictiveRuntime.resolvePredictiveSafetyHorizon(predictiveContext);
    const pState = predictiveClass(predictive);
    const status = deriveStatus(routeState, pState);

    if (binding.kind === 'UNAVAILABLE' && predictive?.mode === 'CONTINUOUS_PROJECTED_PROGRESS') warnings.push('Continuous predictive closure could not obtain an authoritative route-blocker distance; no zero-distance or nominal blocker was invented.');
    if (binding.kind === 'NOMINAL') warnings.push('Predictive timing is using nominal blocker distance because no stronger conservative planning edge was available.');
    if (binding.derivedFromRouteSafety) warnings.push('Predictive hazard distance was derived from the same family-certified route packet; no independent generic hazard geometry was substituted.');

    return {
      schemaVersion:'1.0.0', status, family,
      routeSafety,
      predictiveSafetyHorizon:predictive,
      blockerBinding:binding,
      admissionContext:{routeSafetyPacket:routeSafety,predictiveSafetyHorizonPacket:predictive,predictiveSafetyHorizonRequired:true},
      warnings:unique([...warnings, ...(routeSafety?.warnings||[]), ...(predictive?.warnings||[])]),
      provenance:unique(['blacklight.ftl.route-predictive-closure@1.0.0', binding.source, ...(routeSafety?.provenance||[]), ...(predictive?.provenance||[]), ...(context.provenance||[])])
    };
  }

  return {STATUS, resolveFTLRoutePredictiveClosure, blockerBinding, interventionTiming, registry:registry||null};
}));