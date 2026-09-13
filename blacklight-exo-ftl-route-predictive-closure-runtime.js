(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(
      require('./data/exo-vessel/ftl-route-predictive-closure-registry.json'),
      require('./blacklight-exo-ftl-predictive-safety-horizon-runtime.js'),
      require('./blacklight-exo-ftl-dynamic-escape-envelope-runtime.js')
    );
  } else {
    root.BlacklightExoFTLRoutePredictiveClosureRuntime = factory(
      root.BLACKLIGHT_FTL_ROUTE_PREDICTIVE_CLOSURE_REGISTRY || null,
      root.BlacklightExoFTLPredictiveSafetyHorizonRuntime || null,
      root.BlacklightExoFTLDynamicEscapeEnvelopeRuntime || null
    );
  }
}(typeof self !== 'undefined' ? self : this, function (registry, predictiveRuntime, dynamicEscapeRuntime) {
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

  function escapeClass(packet, required) {
    if (!required && !packet) return 'NOT_REQUIRED';
    const s = String(packet?.status || 'UNRESOLVED').toUpperCase();
    return Object.values(STATUS).includes(s) ? s : 'UNRESOLVED';
  }

  function canonicalFamily(context, routeSafety) {
    return routeSafety?.family || context.family || context.request?.family || null;
  }

  function dynamicEscapeIsRequired(context) {
    if (context.dynamicEscapeRequired === true) return true;
    if (context.requireEnergyReserve === true || context.requireThermalReserve === true) return true;
    if (Array.isArray(context.requiredDynamicEscapeStages)) return true;
    if (context.dynamicEscapeSimulationOnly === true) return true;
    const directKeys = ['stageModels','responseModels','protectedEnergyJ','emergencyLoadW','protectedGenerationW','thermalCapacitanceJK','temperatureLimitK','temperatureInitialK','heatGenerationW','heatRejectionW','dynamicEscapeAdvisoryReserveSeconds'];
    return !!(context.dynamicEscapeEnvelopePacket || context.dynamicEscapeContext || directKeys.some((k)=>context[k] !== undefined && context[k] !== null));
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

  function deriveStatus(routeState, predictiveState, escapeState) {
    const states = [routeState, predictiveState, escapeState].filter((x)=>x && x!=='NOT_REQUIRED');
    if (states.includes('CONFLICT')) return STATUS.CONFLICT;
    if (states.includes('BLOCK')) return STATUS.BLOCK;
    if (states.includes('UNRESOLVED')) return STATUS.UNRESOLVED;
    if (states.includes('SIMULATION_ONLY')) return STATUS.SIMULATION_ONLY;
    if (states.includes('CONDITIONAL')) return STATUS.CONDITIONAL;
    return STATUS.PASS;
  }

  async function resolveRouteSafety(context) {
    if (context.routeSafetyPacket) return context.routeSafetyPacket;
    const runtime = context.routeSafetyRuntime || (typeof globalThis !== 'undefined' ? globalThis.BlacklightExoFTLRouteSafetyRuntime : null);
    if (!runtime?.resolveGeneratedFTLRouteSafety) return {status:'UNRESOLVED', warnings:['Route-safety runtime is unavailable.'], provenance:[]};
    return runtime.resolveGeneratedFTLRouteSafety(context.routeSafetyContext || context);
  }

  function resolveDynamicEscape(routeSafety, context, family, required) {
    if (context.dynamicEscapeEnvelopePacket) return context.dynamicEscapeEnvelopePacket;
    if (!required) return null;
    if (!dynamicEscapeRuntime?.resolveDynamicEscapeEnvelope) {
      return {schemaVersion:'1.0.0',status:'UNRESOLVED',family,warnings:['Dynamic-escape runtime is unavailable.'],provenance:[]};
    }
    const nested = context.dynamicEscapeContext || {};
    return dynamicEscapeRuntime.resolveDynamicEscapeEnvelope(Object.assign({}, nested, {
      family,
      installationId: context.installationId || nested.installationId,
      technologyBasis: context.technologyBasis || nested.technologyBasis,
      routeSafetyPacket: routeSafety,
      installationSafetyTiming: context.installationSafetyTiming || routeSafety?.installationSafetyTiming || nested.installationSafetyTiming,
      timingPacket: context.timingPacket || nested.timingPacket,
      safetyState: context.safetyState || nested.safetyState,
      timing: context.timing || nested.timing,
      stageModels: context.stageModels || context.responseModels || nested.stageModels || nested.responseModels,
      requiredStages: context.requiredDynamicEscapeStages || nested.requiredStages,
      protectedEnergyJ: context.protectedEnergyJ ?? nested.protectedEnergyJ,
      emergencyLoadW: context.emergencyLoadW ?? nested.emergencyLoadW,
      protectedGenerationW: context.protectedGenerationW ?? nested.protectedGenerationW,
      requireEnergyReserve: context.requireEnergyReserve === true || nested.requireEnergyReserve === true,
      thermalCapacitanceJK: context.thermalCapacitanceJK ?? nested.thermalCapacitanceJK,
      temperatureLimitK: context.temperatureLimitK ?? nested.temperatureLimitK,
      temperatureInitialK: context.temperatureInitialK ?? nested.temperatureInitialK,
      heatGenerationW: context.heatGenerationW ?? nested.heatGenerationW,
      heatRejectionW: context.heatRejectionW ?? nested.heatRejectionW,
      requireThermalReserve: context.requireThermalReserve === true || nested.requireThermalReserve === true,
      advisoryReserveSeconds: context.dynamicEscapeAdvisoryReserveSeconds ?? nested.advisoryReserveSeconds,
      operatingEnvelopePacket: context.operatingEnvelopePacket || nested.operatingEnvelopePacket,
      maintenanceEvidencePacket: context.maintenanceEvidencePacket || nested.maintenanceEvidencePacket,
      simulationOnly: context.dynamicEscapeSimulationOnly === true || nested.simulationOnly === true,
      provenance: unique([...(nested.provenance||[]),...(context.provenance||[])])
    }));
  }

  async function resolveFTLRoutePredictiveClosure(context) {
    context = context || {};
    const routeSafety = await resolveRouteSafety(context);
    const family = canonicalFamily(context, routeSafety);
    const routeState = routeClass(routeSafety);
    const binding = blockerBinding(routeSafety, context);
    const warnings = [];
    const escapeRequired = dynamicEscapeIsRequired(context);
    const dynamicEscape = resolveDynamicEscape(routeSafety,context,family,escapeRequired);
    const escapeState = escapeClass(dynamicEscape,escapeRequired);

    if (routeState === 'CONFLICT' || routeState === 'BLOCK') {
      warnings.push('Route safety itself is blocking; predictive timing is preserved as secondary evidence and may not promote the route.');
    }
    if (escapeState === 'BLOCK') warnings.push('Current machinery state cannot complete the required dynamic escape response under the supplied physical bounds.');
    if (escapeState === 'UNRESOLVED' && escapeRequired) warnings.push('Dynamic escape evidence is required but cannot produce a bounded current intervention time.');

    if (!predictiveRuntime?.resolvePredictiveSafetyHorizon) {
      const predictive = {schemaVersion:'1.0.1', status:'UNRESOLVED', family, warnings:['Predictive-safety runtime is unavailable.'], provenance:[]};
      return {schemaVersion:'1.1.0', status:deriveStatus(routeState,'UNRESOLVED',escapeState), family, routeSafety, dynamicEscapeEnvelope:dynamicEscape, predictiveSafetyHorizon:predictive, blockerBinding:binding, admissionContext:{routeSafetyPacket:routeSafety,dynamicEscapeEnvelopePacket:dynamicEscape,predictiveSafetyHorizonPacket:predictive}, warnings:unique(warnings.concat(predictive.warnings)), provenance:unique(['blacklight.ftl.route-predictive-closure@1.1.0', ...(dynamicEscape?.provenance||[]), ...(routeSafety?.provenance||[])])};
    }

    const mode = context.predictiveHorizonMode || context.decisionHorizonMode || routeSafety?.installationSafetyTiming?.timing?.decisionHorizonMode || null;
    const staticIntervention = interventionTiming(routeSafety, context);
    const intervention = finiteNN(dynamicEscape?.interventionTimeUpper) ? Number(dynamicEscape.interventionTimeUpper) : staticIntervention;
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
      provenance: unique(['blacklight.ftl.route-predictive-closure@1.1.0', binding.source, ...(dynamicEscape?.provenance||[]), ...(routeSafety?.provenance||[]), ...(context.provenance||[])])
    });

    const predictive = predictiveRuntime.resolvePredictiveSafetyHorizon(predictiveContext);
    const pState = predictiveClass(predictive);
    const status = deriveStatus(routeState, pState, escapeState);

    if (binding.kind === 'UNAVAILABLE' && predictive?.mode === 'CONTINUOUS_PROJECTED_PROGRESS') warnings.push('Continuous predictive closure could not obtain an authoritative route-blocker distance; no zero-distance or nominal blocker was invented.');
    if (binding.kind === 'NOMINAL') warnings.push('Predictive timing is using nominal blocker distance because no stronger conservative planning edge was available.');
    if (binding.derivedFromRouteSafety) warnings.push('Predictive hazard distance was derived from the same family-certified route packet; no independent generic hazard geometry was substituted.');
    if (finiteNN(dynamicEscape?.dynamicPenaltySeconds) && Number(dynamicEscape.dynamicPenaltySeconds)>0) warnings.push('Predictive closure uses current degraded-state intervention time, '+dynamicEscape.dynamicPenaltySeconds+' s slower than the certified baseline.');

    return {
      schemaVersion:'1.1.0', status, family,
      routeSafety,
      dynamicEscapeEnvelope:dynamicEscape,
      predictiveSafetyHorizon:predictive,
      blockerBinding:binding,
      admissionContext:{routeSafetyPacket:routeSafety,dynamicEscapeEnvelopePacket:dynamicEscape,predictiveSafetyHorizonPacket:predictive,predictiveSafetyHorizonRequired:true},
      warnings:unique([...warnings, ...(routeSafety?.warnings||[]), ...(dynamicEscape?.warnings||[]), ...(predictive?.warnings||[])]),
      provenance:unique(['blacklight.ftl.route-predictive-closure@1.1.0', binding.source, ...(routeSafety?.provenance||[]), ...(dynamicEscape?.provenance||[]), ...(predictive?.provenance||[]), ...(context.provenance||[])])
    };
  }

  return {STATUS, resolveFTLRoutePredictiveClosure, blockerBinding, interventionTiming, dynamicEscapeIsRequired, resolveDynamicEscape, registry:registry||null};
}));