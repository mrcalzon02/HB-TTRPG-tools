(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./data/exo-vessel/ftl-maintenance-evidence-contract.json'));
  else root.BlacklightFTLMaintenanceEvidence = factory(root.BLACKLIGHT_FTL_MAINTENANCE_EVIDENCE_CONTRACT || null);
}(typeof self !== 'undefined' ? self : this, function (contract) {
  'use strict';

  const REQUIRED_EVIDENCE = [
    'IDENTITY', 'INTERFACE', 'STATIC_HEALTH', 'DYNAMIC_HEALTH', 'CALIBRATION',
    'TIMING', 'POWER_RESERVE', 'THERMAL_RESERVE', 'SECTIONAL_TOPOLOGY',
    'FAMILY_SPECIFIC', 'PROVENANCE'
  ];

  const FAILING = new Set(['FAIL', 'CONFLICT']);
  const UNRESOLVED = new Set(['UNRESOLVED']);

  function finiteNonNegative(x) {
    return Number.isFinite(x) && x >= 0;
  }

  function semanticForFamily(family) {
    const adapters = contract && contract.familySemanticAdapters ? contract.familySemanticAdapters : {};
    for (const key of Object.keys(adapters)) {
      if ((adapters[key].families || []).includes(family)) return key;
    }
    return 'UNRESOLVED';
  }

  function normalizeEvidence(input) {
    input = input || {};
    const out = {};
    REQUIRED_EVIDENCE.forEach((key) => {
      const item = input[key] || {};
      out[key] = {
        status: item.status || 'UNRESOLVED',
        summary: item.summary || null,
        sourceIds: Array.isArray(item.sourceIds) ? item.sourceIds.slice() : [],
        measurements: item.measurements || null,
        bounds: item.bounds || null
      };
    });
    return out;
  }

  function resolveInterventionTiming(timing) {
    timing = timing || {};
    const stages = ['sensor', 'solver', 'decision', 'command', 'actuate', 'exit', 'clear', 'margin'];
    let lower = 0;
    let upper = 0;
    const unresolved = [];
    const normalized = {};

    stages.forEach((stage) => {
      const src = timing[stage] || {};
      const lo = finiteNonNegative(src.lowerSeconds) ? src.lowerSeconds : (finiteNonNegative(src.seconds) ? src.seconds : null);
      const hi = finiteNonNegative(src.upperSeconds) ? src.upperSeconds : (finiteNonNegative(src.seconds) ? src.seconds : null);
      normalized[stage] = { lowerSeconds: lo, upperSeconds: hi, sourceId: src.sourceId || null };
      if (lo === null || hi === null) unresolved.push(stage);
      else {
        lower += lo;
        upper += hi;
      }
    });

    return {
      stages: normalized,
      lowerSeconds: unresolved.length ? null : lower,
      upperSeconds: unresolved.length ? null : upper,
      unresolvedStages: unresolved,
      equation: 't_int = sum(stage times)',
      safeguard: 'Unknown stage latency is not zero latency.'
    };
  }

  function resolvePowerReserve(reserve) {
    reserve = reserve || {};
    const availableEnergyLowerJ = finiteNonNegative(reserve.availableEnergyLowerJ) ? reserve.availableEnergyLowerJ : null;
    const requiredEnergyUpperJ = finiteNonNegative(reserve.requiredEnergyUpperJ) ? reserve.requiredEnergyUpperJ : null;
    const availablePowerLowerW = finiteNonNegative(reserve.availablePowerLowerW) ? reserve.availablePowerLowerW : null;
    const requiredPowerUpperW = finiteNonNegative(reserve.requiredPowerUpperW) ? reserve.requiredPowerUpperW : null;

    const energyMarginJ = availableEnergyLowerJ !== null && requiredEnergyUpperJ !== null
      ? availableEnergyLowerJ - requiredEnergyUpperJ : null;
    const energyPass = energyMarginJ !== null ? energyMarginJ > 0 : null;
    const peakPowerPass = availablePowerLowerW !== null && requiredPowerUpperW !== null
      ? availablePowerLowerW >= requiredPowerUpperW : null;

    return {
      availableEnergyLowerJ,
      requiredEnergyUpperJ,
      energyMarginJ,
      availablePowerLowerW,
      requiredPowerUpperW,
      energyPass,
      peakPowerPass,
      status: energyPass === false || peakPowerPass === false ? 'FAIL'
        : (energyPass === true && peakPowerPass === true ? 'PASS' : 'UNRESOLVED')
    };
  }

  function resolveThermalReserve(thermal) {
    thermal = thermal || {};
    const initialK = Number.isFinite(thermal.initialK) ? thermal.initialK : null;
    const limitK = Number.isFinite(thermal.limitK) ? thermal.limitK : null;
    const heatCapacityJK = finiteNonNegative(thermal.heatCapacityJK) ? thermal.heatCapacityJK : null;
    const heatPowerW = finiteNonNegative(thermal.heatPowerW) ? thermal.heatPowerW : null;
    const rejectPowerW = finiteNonNegative(thermal.rejectPowerW) ? thermal.rejectPowerW : null;
    const durationSeconds = finiteNonNegative(thermal.durationSeconds) ? thermal.durationSeconds : null;

    let finalK = null;
    let marginK = null;
    let status = 'UNRESOLVED';
    if ([initialK, limitK, heatCapacityJK, heatPowerW, rejectPowerW, durationSeconds].every((x) => x !== null) && heatCapacityJK > 0) {
      finalK = initialK + ((heatPowerW - rejectPowerW) / heatCapacityJK) * durationSeconds;
      marginK = limitK - finalK;
      status = marginK > 0 ? 'PASS' : 'FAIL';
    }

    return {
      initialK, limitK, heatCapacityJK, heatPowerW, rejectPowerW, durationSeconds,
      finalK, marginK, status,
      equation: 'T(t) = T0 + ((P_heat - P_reject)/C_th) t',
      applicability: 'Short lumped transient with approximately constant terms.'
    };
  }

  function resolveFamily(context, intervention) {
    const family = context.family || null;
    const status = context.familyStatus || (family ? 'RESOLVED' : 'UNRESOLVED');
    const semantic = family ? semanticForFamily(family) : 'UNRESOLVED';
    const result = { status, family, semantic, authority: context.familyAuthority || null, marginSeconds: null, interventionDistanceUpper: null };

    if (status !== 'RESOLVED' || !family || intervention.upperSeconds === null) return result;

    if (semantic === 'CONTINUOUS_PROJECTED_PROGRESS') {
      const progressUpper = finiteNonNegative(context.projectedProgressUpper) ? context.projectedProgressUpper : null;
      const blockerDistanceLower = finiteNonNegative(context.blockerDistanceLower) ? context.blockerDistanceLower : null;
      if (progressUpper !== null && blockerDistanceLower !== null && progressUpper > 0) {
        result.interventionDistanceUpper = progressUpper * intervention.upperSeconds;
        result.marginSeconds = blockerDistanceLower / progressUpper - intervention.upperSeconds;
      }
    } else if (semantic === 'PRECOMMIT_ENDPOINT') {
      const predictionLowerSeconds = finiteNonNegative(context.predictionLowerSeconds) ? context.predictionLowerSeconds : null;
      if (predictionLowerSeconds !== null) result.marginSeconds = predictionLowerSeconds - intervention.upperSeconds;
    } else if (semantic === 'ANCHORED_PORTAL') {
      result.portalRule = 'Use mouth admission, synchronization, aperture/throat state, exit, clearance, and recovery evidence; no along-route hull velocity.';
    }
    return result;
  }

  function resolveDisposition(evidence, family, power, thermal, options) {
    const reasons = [];
    let disposition = 'CERTIFIED';

    for (const key of REQUIRED_EVIDENCE) {
      const status = evidence[key].status;
      if (FAILING.has(status)) {
        disposition = status === 'CONFLICT' ? 'CONFLICT' : 'BLOCKED';
        reasons.push(key + ':' + status);
      } else if (UNRESOLVED.has(status) && disposition === 'CERTIFIED') {
        disposition = 'UNRESOLVED';
        reasons.push(key + ':UNRESOLVED');
      } else if (status === 'CONDITIONAL' && disposition === 'CERTIFIED') {
        disposition = 'CONDITIONALLY_CERTIFIED';
        reasons.push(key + ':CONDITIONAL');
      }
    }

    if (power.status === 'FAIL') {
      disposition = 'BLOCKED';
      reasons.push('POWER_RESERVE:FAIL');
    } else if (power.status === 'UNRESOLVED' && disposition === 'CERTIFIED') {
      disposition = 'UNRESOLVED';
      reasons.push('POWER_RESERVE:UNRESOLVED');
    }

    if (thermal.status === 'FAIL') {
      disposition = 'BLOCKED';
      reasons.push('THERMAL_RESERVE:FAIL');
    } else if (thermal.status === 'UNRESOLVED' && disposition === 'CERTIFIED') {
      disposition = 'UNRESOLVED';
      reasons.push('THERMAL_RESERVE:UNRESOLVED');
    }

    if (family.status === 'CONFLICT') {
      disposition = 'CONFLICT';
      reasons.push('FAMILY:CONFLICT');
    } else if (options.requireFamily && family.status !== 'RESOLVED' && disposition !== 'BLOCKED' && disposition !== 'CONFLICT') {
      disposition = 'UNRESOLVED';
      reasons.push('FAMILY:UNRESOLVED');
    }

    if (family.marginSeconds !== null && family.marginSeconds <= 0) {
      disposition = 'BLOCKED';
      reasons.push('INTERVENTION_MARGIN_NONPOSITIVE');
    }

    if (options.simulationOnly && disposition !== 'BLOCKED' && disposition !== 'CONFLICT') disposition = 'SIMULATION_ONLY';
    return { disposition, reasons: Array.from(new Set(reasons)) };
  }

  function resolveFTLMaintenanceEvidence(context) {
    context = context || {};
    const evidence = normalizeEvidence(context.evidence);
    const intervention = resolveInterventionTiming(context.timing);
    const power = resolvePowerReserve(context.powerReserve);
    const thermal = resolveThermalReserve(context.thermalReserve);
    const family = resolveFamily(context, intervention);

    if (intervention.unresolvedStages.length) {
      evidence.TIMING.status = evidence.TIMING.status === 'FAIL' ? 'FAIL' : 'UNRESOLVED';
      evidence.TIMING.summary = evidence.TIMING.summary || ('Missing timing bounds for: ' + intervention.unresolvedStages.join(', '));
    }
    if (power.status !== 'PASS') evidence.POWER_RESERVE.status = power.status;
    if (thermal.status !== 'PASS') evidence.THERMAL_RESERVE.status = thermal.status;

    const certification = resolveDisposition(evidence, family, power, thermal, {
      requireFamily: context.requireFamily !== false,
      simulationOnly: !!context.simulationOnly
    });

    return {
      schemaVersion: '1.0.0',
      status: certification.disposition,
      identity: Object.assign({ installationId: String(context.installationId || 'UNRESOLVED') }, context.identity || {}),
      technologyBasis: {
        key: String(context.technologyBasis || 'UNRESOLVED'),
        status: context.technologyBasisStatus || 'UNRESOLVED',
        authority: context.technologyBasisAuthority || null
      },
      serviceEvent: {
        kind: context.serviceEventKind || 'UNKNOWN',
        epoch: context.serviceEpoch || null,
        changedDomains: Array.isArray(context.changedDomains) ? context.changedDomains.slice() : []
      },
      evidence,
      family,
      timing: intervention,
      reserves: { power, thermal },
      certification: {
        disposition: certification.disposition,
        reasons: certification.reasons,
        operatingEnvelope: context.operatingEnvelope || null
      },
      provenance: Array.isArray(context.provenance) && context.provenance.length ? context.provenance.slice() : [{
        sourceId: 'blacklight.ftl.maintenance-evidence-contract',
        status: 'DERIVED',
        scope: 'Cross-civilization service evidence resolver; generated output does not become setting-wide canon.',
        revision: '1.0.0',
        epoch: null
      }]
    };
  }

  return {
    REQUIRED_EVIDENCE: REQUIRED_EVIDENCE.slice(),
    resolveFTLMaintenanceEvidence,
    resolveInterventionTiming,
    resolvePowerReserve,
    resolveThermalReserve,
    semanticForFamily,
    contract: contract || null
  };
}));
