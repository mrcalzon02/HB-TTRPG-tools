(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./data/exo-vessel/ftl-predictive-safety-horizon-registry.json'));
  } else {
    root.BlacklightExoFTLPredictiveSafetyHorizonRuntime = factory(root.BLACKLIGHT_FTL_PREDICTIVE_SAFETY_HORIZON_REGISTRY || null);
  }
}(typeof self !== 'undefined' ? self : this, function (registry) {
  'use strict';

  const STATUS = Object.freeze({PASS:'PASS', CONDITIONAL:'CONDITIONAL', BLOCK:'BLOCK', UNRESOLVED:'UNRESOLVED', CONFLICT:'CONFLICT', SIMULATION_ONLY:'SIMULATION_ONLY'});

  function unique(values) { return Array.from(new Set((values || []).filter((x) => x !== null && x !== undefined && x !== ''))); }
  function finiteNonNegative(value) { return Number.isFinite(Number(value)) && Number(value) >= 0; }
  function finitePositive(value) { return Number.isFinite(Number(value)) && Number(value) > 0; }
  function numberOrNull(value) { return Number.isFinite(Number(value)) ? Number(value) : null; }
  function subtractFloorZero(base, uncertainty) {
    if (!finiteNonNegative(base)) return null;
    const u = finiteNonNegative(uncertainty) ? Number(uncertainty) : 0;
    return Math.max(0, Number(base) - u);
  }
  function addUncertainty(base, uncertainty) {
    if (!finiteNonNegative(base)) return null;
    const u = finiteNonNegative(uncertainty) ? Number(uncertainty) : 0;
    return Number(base) + u;
  }

  function familyProfile(family) {
    const key = family || null;
    return key && registry && registry.familyProfiles ? registry.familyProfiles[key] || null : null;
  }

  function inferMode(context, profile) {
    const explicit = context.mode || context.horizonMode || context.decisionHorizonMode;
    if (explicit === 'CONTINUOUS_PROJECTED_PROGRESS' || explicit === 'PRECOMMIT' || explicit === 'PORTAL_ADMISSION') return explicit;
    return profile && profile.mode ? profile.mode : 'UNRESOLVED';
  }

  function interventionUpper(context) {
    if (finiteNonNegative(context.interventionTimeUpper)) return Number(context.interventionTimeUpper);
    const timing = context.installationSafetyTiming || context.timingPacket || context.routeSafetyContext?.installationSafetyTiming;
    if (timing && timing.timing) {
      const t = timing.timing;
      const keys = ['sensorTime','solverTime','decisionTime','commandTime','actuationTime','exitTime','clearTime','marginTime'];
      if (keys.every((k) => finiteNonNegative(t[k]))) return keys.reduce((sum, k) => sum + Number(t[k]), 0);
    }
    const direct = context.safetyState || context.timing || null;
    if (direct) {
      const keys = ['sensorTime','solverTime','decisionTime','commandTime','actuationTime','exitTime','clearTime','marginTime'];
      if (keys.every((k) => finiteNonNegative(direct[k]))) return keys.reduce((sum, k) => sum + Number(direct[k]), 0);
    }
    return null;
  }

  function resolvePredictiveSafetyHorizon(context) {
    context = context || {};
    const family = context.family || context.request?.family || null;
    const profile = familyProfile(family);
    const mode = inferMode(context, profile);
    const unresolved = [];
    const warnings = [];

    if (!family) unresolved.push('family');
    else if (!profile) unresolved.push('familyProfile');
    if (mode === 'UNRESOLVED') unresolved.push('mode');

    const rawPrediction = numberOrNull(context.predictionHorizonLower ?? context.predictionTimeLower ?? context.predictionTime);
    const rawIntervention = interventionUpper(context);
    const predictionU = numberOrNull(context.predictionHorizonUncertaintyLower ?? context.predictionUncertaintyLower);
    const interventionU = numberOrNull(context.interventionTimeUncertaintyUpper ?? context.interventionUncertaintyUpper);
    const rawHazardDistance = numberOrNull(context.hazardDistanceLower ?? context.distanceToHazardLower ?? context.distanceToFirstBlockingSegmentM);
    const hazardDistanceU = numberOrNull(context.hazardDistanceUncertaintyLower ?? context.hazardLocalizationUncertaintyLower);
    const rawProgress = numberOrNull(context.projectedProgressRateUpper ?? context.projectedProgressRate ?? context.progressRateUpper);
    const progressU = numberOrNull(context.projectedProgressRateUncertaintyUpper ?? context.progressRateUncertaintyUpper);
    const commitWindow = numberOrNull(context.commitWindowLower);
    const admissionValidity = numberOrNull(context.admissionValidityLower);
    const closureHorizon = numberOrNull(context.closureHorizonLower);
    const advisory = numberOrNull(context.advisoryMarginSeconds);

    if (!finiteNonNegative(rawPrediction)) unresolved.push('predictionHorizonLower');
    if (!finiteNonNegative(rawIntervention)) unresolved.push('interventionTimeUpper');

    const predictionEff = subtractFloorZero(rawPrediction, predictionU);
    const interventionEff = addUncertainty(rawIntervention, interventionU);
    const hazardDistanceEff = subtractFloorZero(rawHazardDistance, hazardDistanceU);
    const progressEff = finitePositive(rawProgress) ? Number(rawProgress) + (finiteNonNegative(progressU) ? Number(progressU) : 0) : null;

    let encounterTime = null;
    if (mode === 'CONTINUOUS_PROJECTED_PROGRESS') {
      const hasDistance = finiteNonNegative(rawHazardDistance);
      const hasProgress = finitePositive(rawProgress);
      if (hasDistance !== hasProgress) unresolved.push(hasDistance ? 'projectedProgressRateUpper' : 'hazardDistanceLower');
      if (hazardDistanceEff !== null && progressEff !== null && progressEff > 0) encounterTime = hazardDistanceEff / progressEff;
    }

    let available = predictionEff;
    if (mode === 'CONTINUOUS_PROJECTED_PROGRESS' && encounterTime !== null) available = Math.min(available, encounterTime);
    if (mode === 'PRECOMMIT' && finiteNonNegative(commitWindow)) available = Math.min(available, Number(commitWindow));
    if (mode === 'PORTAL_ADMISSION') {
      const candidates = [available];
      if (finiteNonNegative(admissionValidity)) candidates.push(Number(admissionValidity));
      if (finiteNonNegative(closureHorizon)) candidates.push(Number(closureHorizon));
      available = Math.min.apply(null, candidates.filter((x) => Number.isFinite(x)));
    }

    const observedHazards = unique(context.observedHazardEvidence || context.observableHazards || context.measurementPacket?.observableHazards || []);
    const requiredHazards = unique(profile?.requiredHazardEvidence || []);
    const missingHazards = requiredHazards.filter((h) => !observedHazards.includes(h));
    if (context.requireHazardEvidence === true && missingHazards.length) unresolved.push(...missingHazards.map((h) => 'hazardEvidence:' + h));

    if (context.predictionHorizonStatisticalUncertainty && !context.predictionCoverageFactor) {
      unresolved.push('predictionCoverageFactor');
      warnings.push('A statistical prediction uncertainty was supplied without an explicit coverage factor/model; it was not converted into a hard safety bound.');
    }
    if (context.hiddenMassProbability !== undefined && !finiteNonNegative(context.hiddenMassDistanceBound)) {
      warnings.push('Hidden-mass probability was preserved as model evidence only; it was not converted into a hazard distance without an explicit physical mapping.');
    }
    if (context.endpointOccupancyProbability !== undefined && context.endpointClearanceCertified !== true) {
      warnings.push('Endpoint occupancy probability is not an empty-volume certificate.');
    }

    const effectiveUnresolved = unique(unresolved);
    let status = STATUS.UNRESOLVED;
    let margin = null;

    if (!effectiveUnresolved.length && predictionEff !== null && interventionEff !== null && available !== null) {
      margin = available - interventionEff;
      if (context.conflict === true) status = STATUS.CONFLICT;
      else if (margin < 0) status = STATUS.BLOCK;
      else if (context.simulationOnly === true) status = STATUS.SIMULATION_ONLY;
      else if (finiteNonNegative(advisory) && margin < advisory) status = STATUS.CONDITIONAL;
      else status = STATUS.PASS;
    }

    if (status === STATUS.BLOCK) warnings.push('Conservative predictive time is shorter than the certified intervention upper bound.');
    if (status === STATUS.CONDITIONAL) warnings.push('Predictive margin is nonnegative but lies inside an explicitly supplied advisory margin.');
    if (status === STATUS.UNRESOLVED) warnings.push('Required predictive-horizon evidence is incomplete; no nominal or zero substitute was invented.');

    return {
      schemaVersion: '1.0.0',
      status,
      family,
      mode,
      inputs: {
        predictionHorizonLower: rawPrediction,
        predictionHorizonUncertaintyLower: predictionU,
        interventionTimeUpper: rawIntervention,
        interventionTimeUncertaintyUpper: interventionU,
        hazardDistanceLower: rawHazardDistance,
        hazardDistanceUncertaintyLower: hazardDistanceU,
        projectedProgressRateUpper: rawProgress,
        projectedProgressRateUncertaintyUpper: progressU,
        commitWindowLower: commitWindow,
        admissionValidityLower: admissionValidity,
        closureHorizonLower: closureHorizon,
        advisoryMarginSeconds: advisory,
        simulationOnly: context.simulationOnly === true
      },
      effective: {
        predictionHorizonLower: predictionEff,
        interventionTimeUpper: interventionEff,
        hazardDistanceLower: hazardDistanceEff,
        projectedProgressRateUpper: progressEff,
        encounterTimeLower: encounterTime,
        availableTimeLower: available
      },
      marginSeconds: margin,
      requiredHazardEvidence: requiredHazards,
      observedHazardEvidence: observedHazards,
      unresolvedInputs: effectiveUnresolved,
      warnings: unique(warnings),
      provenance: unique(['blacklight.ftl.predictive-safety-horizon@1.0.0', ...(context.provenance || [])])
    };
  }

  return { STATUS, resolvePredictiveSafetyHorizon, registry: registry || null };
}));
