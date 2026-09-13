(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./data/exo-vessel/ftl-dynamic-escape-envelope-registry.json'));
  } else {
    root.BlacklightExoFTLDynamicEscapeEnvelopeRuntime = factory(root.BLACKLIGHT_FTL_DYNAMIC_ESCAPE_ENVELOPE_REGISTRY || null);
  }
}(typeof self !== 'undefined' ? self : this, function (registry) {
  'use strict';

  const STATUS = Object.freeze({PASS:'PASS', CONDITIONAL:'CONDITIONAL', BLOCK:'BLOCK', UNRESOLVED:'UNRESOLVED', CONFLICT:'CONFLICT', SIMULATION_ONLY:'SIMULATION_ONLY'});
  const STAGES = Object.freeze(['sensor','solver','decision','command','actuate','exit','clear','margin']);
  const TIME_KEYS = Object.freeze({sensor:'sensorTime',solver:'solverTime',decision:'decisionTime',command:'commandTime',actuate:'actuationTime',exit:'exitTime',clear:'clearTime',margin:'marginTime'});
  const unique = (xs) => Array.from(new Set((xs || []).filter((x) => x !== null && x !== undefined && x !== '')));
  const finiteNN = (x) => Number.isFinite(Number(x)) && Number(x) >= 0;
  const finitePositive = (x) => Number.isFinite(Number(x)) && Number(x) > 0;

  function worse(a, b) {
    const rank = {PASS:0, CONDITIONAL:1, SIMULATION_ONLY:2, UNRESOLVED:3, BLOCK:4, CONFLICT:5};
    return (rank[b] || 0) > (rank[a] || 0) ? b : a;
  }

  function baselineTiming(context) {
    const packet = context.installationSafetyTiming || context.timingPacket || context.routeSafetyPacket?.installationSafetyTiming || null;
    const timing = packet?.timing || context.safetyState || context.timing || {};
    const out = {};
    for (const stage of STAGES) {
      const key = TIME_KEYS[stage];
      out[stage] = finiteNN(timing[key]) ? Number(timing[key]) : null;
    }
    return out;
  }

  function singleModel(stage, model, baseline) {
    model = model || {};
    const kind = model.model || model.type || 'explicitUpperTime';
    const provenance = unique(model.provenance || []);
    const pass = (time, reason) => ({stage,status:STATUS.PASS,baselineUpper:baseline,dynamicUpper:Math.max(baseline || 0,time),addedDelay:baseline === null ? null : Math.max(0,time-baseline),model:kind,reason,provenance});
    const unresolved = (reason) => ({stage,status:STATUS.UNRESOLVED,baselineUpper:baseline,dynamicUpper:null,addedDelay:null,model:kind,reason,provenance});
    const block = (reason) => ({stage,status:STATUS.BLOCK,baselineUpper:baseline,dynamicUpper:null,addedDelay:null,model:kind,reason,provenance});
    const conflict = (reason) => ({stage,status:STATUS.CONFLICT,baselineUpper:baseline,dynamicUpper:null,addedDelay:null,model:kind,reason,provenance});

    if (kind === 'explicitUpperTime' || kind === 'explicitFamilyResponse') {
      if (!finiteNN(model.upperTimeSeconds)) return unresolved('EXPLICIT_UPPER_TIME_MISSING');
      return pass(Number(model.upperTimeSeconds), kind === 'explicitFamilyResponse' ? 'FAMILY_RESPONSE_BOUND_APPLIED' : 'EXPLICIT_UPPER_TIME_APPLIED');
    }

    if (kind === 'networkPath') {
      if (!finiteNN(model.currentPathDelaySeconds) || !finiteNN(model.certifiedPathDelaySeconds)) return unresolved('NETWORK_PATH_DELAY_MISSING');
      if (baseline === null) return unresolved('CERTIFIED_STAGE_BASELINE_MISSING');
      const excess = Math.max(0, Number(model.currentPathDelaySeconds) - Number(model.certifiedPathDelaySeconds));
      return pass(baseline + excess, excess > 0 ? 'EXCESS_NETWORK_DELAY_ADDED' : 'NETWORK_PATH_WITHIN_CERTIFIED_DELAY');
    }

    if (kind === 'energyLimitedRamp') {
      if (!finiteNN(model.requiredEnergyJ) || !Number.isFinite(Number(model.availableNetPowerW))) return unresolved('ENERGY_RAMP_INPUT_MISSING');
      const energy = Number(model.requiredEnergyJ), power = Number(model.availableNetPowerW);
      if (energy === 0) return pass(0, 'ZERO_REQUIRED_ENERGY');
      if (power <= 0) return block('NONPOSITIVE_NET_POWER_FOR_REQUIRED_ENERGY');
      return pass(energy / power, 'ENERGY_OVER_NET_POWER_BOUND');
    }

    if (kind === 'forceLimitedTranslation') {
      if (!finiteNN(model.massKg) || !finiteNN(model.requiredDeltaVMps) || !Number.isFinite(Number(model.availableForceN))) return unresolved('FORCE_TRANSLATION_INPUT_MISSING');
      const mass = Number(model.massKg), dv = Number(model.requiredDeltaVMps), force = Number(model.availableForceN);
      if (dv === 0 || mass === 0) return pass(0, 'ZERO_TRANSLATIONAL_IMPULSE_REQUIRED');
      if (force <= 0) return block('NONPOSITIVE_AVAILABLE_FORCE');
      return pass(mass * dv / force, 'CONSTANT_FORCE_IMPULSE_BOUND');
    }

    if (kind === 'torqueLimitedRotation') {
      if (!finiteNN(model.momentOfInertiaKgM2) || !finiteNN(model.requiredDeltaOmegaRadS) || !Number.isFinite(Number(model.availableTorqueNm))) return unresolved('TORQUE_ROTATION_INPUT_MISSING');
      const inertia = Number(model.momentOfInertiaKgM2), dw = Number(model.requiredDeltaOmegaRadS), torque = Number(model.availableTorqueNm);
      if (dw === 0 || inertia === 0) return pass(0, 'ZERO_ROTATIONAL_IMPULSE_REQUIRED');
      if (torque <= 0) return block('NONPOSITIVE_AVAILABLE_TORQUE');
      return pass(inertia * dw / torque, 'CONSTANT_TORQUE_ANGULAR_IMPULSE_BOUND');
    }

    if (kind === 'slewLimited') {
      if (!finiteNN(model.requiredStateChange) || !Number.isFinite(Number(model.availableSlewRatePerSecond))) return unresolved('SLEW_INPUT_MISSING');
      const change = Number(model.requiredStateChange), rate = Number(model.availableSlewRatePerSecond);
      if (change === 0) return pass(0, 'ZERO_STATE_CHANGE_REQUIRED');
      if (rate <= 0) return block('NONPOSITIVE_AVAILABLE_SLEW_RATE');
      return pass(change / rate, 'STATE_CHANGE_OVER_SLEW_RATE_BOUND');
    }

    return conflict('UNKNOWN_DYNAMIC_ESCAPE_MODEL:' + kind);
  }

  function resolveStage(stage, baseline, models, required) {
    const list = Array.isArray(models) ? models : (models ? [models] : []);
    if (!list.length) {
      if (baseline === null) return {stage,status:required ? STATUS.UNRESOLVED : STATUS.PASS,baselineUpper:null,dynamicUpper:null,addedDelay:null,model:'certifiedBaseline',reason:required?'CERTIFIED_STAGE_BASELINE_MISSING':'STAGE_NOT_REQUIRED',provenance:[]};
      return {stage,status:STATUS.PASS,baselineUpper:baseline,dynamicUpper:baseline,addedDelay:0,model:'certifiedBaseline',reason:'CERTIFIED_BASELINE_RETAINED',provenance:[]};
    }
    const results = list.map((m) => singleModel(stage,m,baseline));
    let state = STATUS.PASS;
    for (const r of results) state = worse(state,r.status);
    const times = results.filter((r)=>finiteNN(r.dynamicUpper)).map((r)=>Number(r.dynamicUpper));
    const dynamic = state === STATUS.BLOCK || state === STATUS.CONFLICT || (required && state === STATUS.UNRESOLVED) ? null : (times.length ? Math.max(...times, baseline === null ? 0 : baseline) : baseline);
    const chosen = results.find((r)=>finiteNN(r.dynamicUpper) && Number(r.dynamicUpper) === dynamic) || results[0];
    return {
      stage,
      status:state,
      baselineUpper:baseline,
      dynamicUpper:dynamic,
      addedDelay:baseline !== null && dynamic !== null ? Math.max(0,dynamic-baseline) : null,
      model:results.length === 1 ? chosen.model : 'maxOfConstraints',
      reason:results.length === 1 ? chosen.reason : 'MAXIMUM_PHYSICAL_STAGE_BOUND_SELECTED',
      constraints:results,
      provenance:unique(results.flatMap((r)=>r.provenance||[]))
    };
  }

  function energyHold(context) {
    const supplied = ['protectedEnergyJ','emergencyLoadW','protectedGenerationW'].some((k)=>context[k] !== undefined && context[k] !== null);
    if (!supplied && context.requireEnergyReserve !== true) return {status:'NOT_APPLICABLE',seconds:null,reason:'ENERGY_RESERVE_NOT_REQUESTED'};
    if (!finiteNN(context.protectedEnergyJ) || !finiteNN(context.emergencyLoadW) || !finiteNN(context.protectedGenerationW)) return {status:STATUS.UNRESOLVED,seconds:null,reason:'ENERGY_RESERVE_INPUT_MISSING'};
    const deficit = Math.max(0,Number(context.emergencyLoadW)-Number(context.protectedGenerationW));
    if (deficit === 0) return {status:STATUS.PASS,seconds:null,reason:'NO_POSITIVE_POWER_DEFICIT'};
    return {status:STATUS.PASS,seconds:Number(context.protectedEnergyJ)/deficit,reason:'PROTECTED_ENERGY_OVER_POWER_DEFICIT'};
  }

  function thermalHold(context) {
    const keys = ['thermalCapacitanceJK','temperatureLimitK','temperatureInitialK','heatGenerationW','heatRejectionW'];
    const supplied = keys.some((k)=>context[k] !== undefined && context[k] !== null);
    if (!supplied && context.requireThermalReserve !== true) return {status:'NOT_APPLICABLE',seconds:null,reason:'THERMAL_RESERVE_NOT_REQUESTED'};
    if (!keys.every((k)=>finiteNN(context[k]))) return {status:STATUS.UNRESOLVED,seconds:null,reason:'THERMAL_RESERVE_INPUT_MISSING'};
    const c = Number(context.thermalCapacitanceJK), tLim = Number(context.temperatureLimitK), t0 = Number(context.temperatureInitialK), pHeat = Number(context.heatGenerationW), pReject = Number(context.heatRejectionW);
    if (t0 > tLim) return {status:STATUS.BLOCK,seconds:0,reason:'INITIAL_TEMPERATURE_ABOVE_LIMIT'};
    const net = pHeat-pReject;
    if (net <= 0) return {status:STATUS.PASS,seconds:null,reason:'NO_POSITIVE_NET_HEATING'};
    if (c <= 0) return {status:STATUS.CONFLICT,seconds:null,reason:'NONPOSITIVE_THERMAL_CAPACITANCE'};
    return {status:STATUS.PASS,seconds:c*(tLim-t0)/net,reason:'LUMPED_SHORT_TRANSIENT_THERMAL_HOLD'};
  }

  function reserveStatus(energy, thermal, intervention, advisory) {
    let state = STATUS.PASS;
    for (const r of [energy,thermal]) {
      if (r.status === STATUS.CONFLICT) state = worse(state,STATUS.CONFLICT);
      else if (r.status === STATUS.BLOCK) state = worse(state,STATUS.BLOCK);
      else if (r.status === STATUS.UNRESOLVED) state = worse(state,STATUS.UNRESOLVED);
    }
    const finiteHolds = [energy.seconds,thermal.seconds].filter(finiteNN).map(Number);
    const minimum = finiteHolds.length ? Math.min(...finiteHolds) : null;
    if (finiteNN(intervention) && minimum !== null) {
      if (minimum < Number(intervention)) state = worse(state,STATUS.BLOCK);
      else if (finiteNN(advisory) && minimum-Number(intervention) <= Number(advisory)) state = worse(state,STATUS.CONDITIONAL);
    }
    return {status:state,energyHoldSeconds:energy.seconds,thermalHoldSeconds:thermal.seconds,minimumHoldSeconds:minimum,requiredInterventionSeconds:finiteNN(intervention)?Number(intervention):null,energyReason:energy.reason,thermalReason:thermal.reason};
  }

  function resolveDynamicEscapeEnvelope(context) {
    context = context || {};
    const baseline = baselineTiming(context);
    const requiredStages = new Set(context.requiredStages || STAGES);
    const models = context.stageModels || context.responseModels || {};
    const stageResults = STAGES.map((stage)=>resolveStage(stage,baseline[stage],models[stage],requiredStages.has(stage)));
    let status = STATUS.PASS;
    for (const r of stageResults) status = worse(status,r.status);

    const dynamicTimes = stageResults.map((r)=>r.dynamicUpper);
    const interventionTimeUpper = dynamicTimes.every(finiteNN) ? dynamicTimes.reduce((a,b)=>a+Number(b),0) : null;
    const baselineTimes = STAGES.map((s)=>baseline[s]);
    const baselineInterventionTimeUpper = baselineTimes.every(finiteNN) ? baselineTimes.reduce((a,b)=>a+Number(b),0) : null;
    const dynamicPenaltySeconds = interventionTimeUpper !== null && baselineInterventionTimeUpper !== null ? Math.max(0,interventionTimeUpper-baselineInterventionTimeUpper) : null;

    const energy = energyHold(context);
    const thermal = thermalHold(context);
    const reserveHorizons = reserveStatus(energy,thermal,interventionTimeUpper,context.advisoryReserveSeconds);
    status = worse(status,reserveHorizons.status);
    if (context.simulationOnly === true && ![STATUS.BLOCK,STATUS.CONFLICT,STATUS.UNRESOLVED].includes(status)) status = STATUS.SIMULATION_ONLY;

    const added = stageResults.filter((r)=>finiteNN(r.addedDelay)).sort((a,b)=>Number(b.addedDelay)-Number(a.addedDelay));
    const reserveCandidates = [
      finiteNN(reserveHorizons.energyHoldSeconds)&&interventionTimeUpper!==null ? {kind:'energyHold',marginSeconds:Number(reserveHorizons.energyHoldSeconds)-interventionTimeUpper} : null,
      finiteNN(reserveHorizons.thermalHoldSeconds)&&interventionTimeUpper!==null ? {kind:'thermalHold',marginSeconds:Number(reserveHorizons.thermalHoldSeconds)-interventionTimeUpper} : null
    ].filter(Boolean).sort((a,b)=>a.marginSeconds-b.marginSeconds);
    const limitingConstraint = reserveCandidates.length && reserveCandidates[0].marginSeconds <= 0
      ? reserveCandidates[0]
      : (added.length && Number(added[0].addedDelay)>0 ? {kind:'stageDelay',stage:added[0].stage,addedDelaySeconds:added[0].addedDelay,model:added[0].model} : (reserveCandidates[0] || null));

    const warnings = unique([
      ...stageResults.filter((r)=>r.status!==STATUS.PASS).map((r)=>r.stage+': '+r.reason),
      reserveHorizons.status!==STATUS.PASS ? 'Reserve horizon status: '+reserveHorizons.status : null,
      dynamicPenaltySeconds>0 ? 'Current physical state increases certified intervention time by '+dynamicPenaltySeconds+' s.' : null,
      context.operatingEnvelopePacket?.status && context.operatingEnvelopePacket.status!=='PASS' ? 'Operating-envelope packet is '+context.operatingEnvelopePacket.status+'; dynamic escape timing does not override that authority.' : null,
      'Dynamic escape timing supplies machinery response burden only; family route/blocker semantics remain with family-specific route authority.'
    ]);

    return {
      schemaVersion:'1.0.0',
      status,
      family:context.family || context.request?.family || null,
      installationId:context.installationId || null,
      technologyBasis:context.technologyBasis || null,
      interventionTimeUpper,
      baselineInterventionTimeUpper,
      dynamicPenaltySeconds,
      stageResults,
      reserveHorizons,
      limitingConstraint,
      operatingEnvelope:context.operatingEnvelopePacket || null,
      maintenanceEvidence:context.maintenanceEvidencePacket || null,
      simulationOnly:context.simulationOnly===true,
      warnings,
      provenance:unique(['blacklight.ftl.dynamic-escape-envelope@1.0.0',...(context.operatingEnvelopePacket?.provenance||[]),...(context.maintenanceEvidencePacket?.provenance||[]),...(context.provenance||[])])
    };
  }

  return {STATUS,STAGES,baselineTiming,resolveStage,energyHold,thermalHold,resolveDynamicEscapeEnvelope,registry:registry||null};
}));