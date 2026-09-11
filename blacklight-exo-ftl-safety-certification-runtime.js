(() => {
  'use strict';

  const FAMILY_KEYS = Object.freeze([
    'metric-compression',
    'gravitational-plane',
    'slipstream-shear',
    'q-lattice',
    'n-manifold',
    'fold-jump',
    'wormhole-gate',
    'phase-displacement',
    'inertial-torch'
  ]);

  const STATUS = Object.freeze({
    ADMISSIBLE: 'ADMISSIBLE',
    MARGINAL: 'MARGINAL',
    REJECTED: 'REJECTED',
    UNRESOLVED: 'UNRESOLVED'
  });

  const NONLOCAL_DECISION_FAMILIES = new Set(['fold-jump', 'q-lattice', 'phase-displacement']);

  const finite = (value) => value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value));
  const num = (value) => Number(value);
  const clamp01 = (value) => Math.max(0, Math.min(1, num(value)));

  function deepFreeze(value) {
    if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
    Object.freeze(value);
    Object.getOwnPropertyNames(value).forEach((key) => deepFreeze(value[key]));
    return value;
  }

  function requireFamily(family) {
    if (!FAMILY_KEYS.includes(family)) {
      throw new Error(`Unknown FTL family: ${family}`);
    }
    return family;
  }

  function normalizeEnvironmentPacket(packet = {}) {
    const p = packet || {};
    return {
      epoch: p.epoch ?? null,
      potentialMagnitude: finite(p.potentialMagnitude) ? num(p.potentialMagnitude) : null,
      accelerationMagnitude: finite(p.accelerationMagnitude) ? num(p.accelerationMagnitude) : null,
      tidalTensorNorm: finite(p.tidalTensorNorm) ? num(p.tidalTensorNorm) : null,
      curvatureNorm: finite(p.curvatureNorm) ? num(p.curvatureNorm) : null,
      massModelUncertainty: finite(p.massModelUncertainty) ? Math.max(0, num(p.massModelUncertainty)) : null,
      hiddenMassProbability: finite(p.hiddenMassProbability) ? clamp01(p.hiddenMassProbability) : null,
      familyBoundaryHazard: finite(p.familyBoundaryHazard) ? Math.max(0, num(p.familyBoundaryHazard)) : null,
      provenance: Array.isArray(p.provenance) ? [...p.provenance] : [],
      unresolved: Array.isArray(p.unresolved) ? [...p.unresolved] : []
    };
  }

  function normalizeUncertainty(packet = {}) {
    const u = packet || {};
    const keys = [
      'ephemerisCovariance',
      'massModelCovariance',
      'clockCovariance',
      'sensorCovariance',
      'registrationCovariance',
      'modelCovariance',
      'commonCauseCovariance'
    ];
    const out = {};
    keys.forEach((key) => {
      out[key] = finite(u[key]) ? Math.max(0, num(u[key])) : null;
    });
    out.provenance = Array.isArray(u.provenance) ? [...u.provenance] : [];
    return out;
  }

  function calibrationReady(profile = {}) {
    const required = ['referenceScales', 'severityWeights', 'familyCoefficients', 'thresholds'];
    return required.every((key) => profile && typeof profile[key] === 'object' && profile[key] !== null);
  }

  function computeSeverity(environment, calibrationProfile) {
    if (!calibrationReady(calibrationProfile)) {
      return {value: null, status: STATUS.UNRESOLVED, reason: 'No complete labeled calibration profile supplied.'};
    }

    const refs = calibrationProfile.referenceScales;
    const w = calibrationProfile.severityWeights;
    const requiredInputs = [
      ['potentialMagnitude', 'potential'],
      ['accelerationMagnitude', 'acceleration'],
      ['tidalTensorNorm', 'tidal'],
      ['curvatureNorm', 'curvature'],
      ['massModelUncertainty', 'massUncertainty']
    ];
    for (const [input, ref] of requiredInputs) {
      if (!finite(environment[input]) || !finite(refs[ref]) || num(refs[ref]) === 0) {
        return {value: null, status: STATUS.UNRESOLVED, reason: `Missing measured environment term or reference scale: ${input}/${ref}.`};
      }
    }

    const value =
      num(w.potential) * Math.abs(environment.potentialMagnitude / num(refs.potential)) +
      num(w.acceleration) * Math.abs(environment.accelerationMagnitude / num(refs.acceleration)) +
      num(w.tidal) * Math.abs(environment.tidalTensorNorm / num(refs.tidal)) +
      num(w.curvature) * Math.abs(environment.curvatureNorm / num(refs.curvature)) +
      num(w.massUncertainty) * Math.abs(environment.massModelUncertainty / num(refs.massUncertainty));

    if (!Number.isFinite(value)) {
      return {value: null, status: STATUS.UNRESOLVED, reason: 'Calibration profile contains non-numeric severity weights.'};
    }
    return {value, status: STATUS.ADMISSIBLE, reason: null};
  }

  function computeFamilyResponse(family, severity, environment, uncertainty, calibrationProfile) {
    if (severity.value === null || !calibrationReady(calibrationProfile)) {
      return {
        gravityEfficiency: null,
        calculationEfficiency: null,
        miscalculationAmplification: null,
        sourceBurdenMultiplier: null,
        status: STATUS.UNRESOLVED,
        reasons: [severity.reason || 'Family response cannot be evaluated.']
      };
    }

    const c = calibrationProfile.familyCoefficients[family];
    if (!c) {
      return {
        gravityEfficiency: null,
        calculationEfficiency: null,
        miscalculationAmplification: null,
        sourceBurdenMultiplier: null,
        status: STATUS.UNRESOLVED,
        reasons: [`Calibration profile has no coefficients for ${family}.`]
      };
    }

    const values = ['a', 'b', 'c', 'n', 'd', 'e', 'k', 'miscalculationAmplification'];
    if (!values.every((key) => finite(c[key]))) {
      return {
        gravityEfficiency: null,
        calculationEfficiency: null,
        miscalculationAmplification: null,
        sourceBurdenMultiplier: null,
        status: STATUS.UNRESOLVED,
        reasons: [`Calibration coefficients for ${family} are incomplete.`]
      };
    }

    const G = severity.value;
    const U = finite(environment.massModelUncertainty) ? environment.massModelUncertainty : 0;
    const B = finite(environment.familyBoundaryHazard) ? environment.familyBoundaryHazard : 0;
    const penalty = num(c.a) * G + num(c.b) * G * G + num(c.c) * Math.pow(G, num(c.n)) + num(c.d) * U + num(c.e) * B;
    const gravityEfficiency = Math.exp(-Math.max(0, penalty));

    const covarianceTerms = [
      uncertainty.ephemerisCovariance,
      uncertainty.massModelCovariance,
      uncertainty.clockCovariance,
      uncertainty.sensorCovariance,
      uncertainty.registrationCovariance,
      uncertainty.modelCovariance,
      uncertainty.commonCauseCovariance
    ].filter(finite).map(num);
    const covarianceTraceProxy = covarianceTerms.length ? covarianceTerms.reduce((a, b) => a + b, 0) : null;
    const A = Math.max(0, num(c.miscalculationAmplification));
    const calculationEfficiency = covarianceTraceProxy === null ? null : Math.exp(-Math.max(0, num(c.k)) * A * A * covarianceTraceProxy);

    return {
      gravityEfficiency,
      calculationEfficiency,
      miscalculationAmplification: A,
      sourceBurdenMultiplier: gravityEfficiency > 0 ? 1 / gravityEfficiency : Infinity,
      status: calculationEfficiency === null ? STATUS.UNRESOLVED : STATUS.ADMISSIBLE,
      reasons: calculationEfficiency === null ? ['No bounded uncertainty packet was supplied for calculation-efficiency evaluation.'] : []
    };
  }

  function computeLookaheadMargin({family, routeCandidate = {}, safetyState = {}}) {
    requireFamily(family);
    const times = [
      'sensorTime',
      'solverTime',
      'decisionTime',
      'commandTime',
      'actuationTime',
      'exitTime',
      'clearTime',
      'marginTime'
    ];

    if (!times.every((key) => finite(safetyState[key])) || !finite(safetyState.predictionTime)) {
      return {predictionDistance: null, interventionDistance: null, margin: null, status: STATUS.UNRESOLVED, reason: 'Timing chain is incomplete.'};
    }

    const interventionTime = times.reduce((sum, key) => sum + Math.max(0, num(safetyState[key])), 0);
    const predictionTime = Math.max(0, num(safetyState.predictionTime));

    if (NONLOCAL_DECISION_FAMILIES.has(family) && safetyState.decisionHorizonMode === 'PRECOMMIT') {
      const margin = predictionTime - interventionTime;
      return {
        predictionDistance: null,
        interventionDistance: null,
        predictionTime,
        interventionTime,
        margin,
        status: margin > 0 ? STATUS.ADMISSIBLE : STATUS.REJECTED,
        reason: margin > 0 ? null : 'Precommit decision horizon is shorter than the complete intervention chain.'
      };
    }

    if (!finite(routeCandidate.projectedProgressRate)) {
      return {predictionDistance: null, interventionDistance: null, predictionTime, interventionTime, margin: null, status: STATUS.UNRESOLVED, reason: 'Projected progress rate is not defined for this route representation.'};
    }

    const v = Math.max(0, num(routeCandidate.projectedProgressRate));
    const predictionDistance = v * predictionTime;
    const interventionDistance = v * interventionTime;
    const margin = predictionDistance - interventionDistance;
    return {
      predictionDistance,
      interventionDistance,
      predictionTime,
      interventionTime,
      margin,
      status: margin > 0 ? STATUS.ADMISSIBLE : STATUS.REJECTED,
      reason: margin > 0 ? null : 'Actionable lookahead margin is non-positive.'
    };
  }

  function evaluateHazardObservability(requiredHazards = [], measurementPacket = {}) {
    const observed = new Set(Array.isArray(measurementPacket.observableHazards) ? measurementPacket.observableHazards : []);
    const independentGuards = new Set(Array.isArray(measurementPacket.independentGuardHazards) ? measurementPacket.independentGuardHazards : []);
    const lost = [];
    const guardCovered = [];

    requiredHazards.forEach((hazard) => {
      if (observed.has(hazard)) return;
      if (independentGuards.has(hazard)) guardCovered.push(hazard);
      else lost.push(hazard);
    });

    return {
      required: [...requiredHazards],
      observed: [...observed],
      independentGuardCovered: guardCovered,
      lost,
      status: lost.length ? STATUS.REJECTED : STATUS.ADMISSIBLE
    };
  }

  function evaluateRecovery(recoveryState = {}) {
    const total = finite(recoveryState.totalAuthority) ? Math.max(0, num(recoveryState.totalAuthority)) : null;
    const protectedReserve = finite(recoveryState.protectedReserve) ? Math.max(0, num(recoveryState.protectedReserve)) : null;
    const required = finite(recoveryState.requiredRecoveryAuthority) ? Math.max(0, num(recoveryState.requiredRecoveryAuthority)) : null;
    if (total === null || protectedReserve === null || required === null) {
      return {availableForNominalUse: null, margin: null, status: STATUS.UNRESOLVED, reason: 'Recovery authority is incompletely measured.'};
    }
    const availableForNominalUse = Math.max(0, total - protectedReserve);
    const margin = protectedReserve - required;
    return {
      availableForNominalUse,
      protectedReserve,
      required,
      margin,
      status: margin >= 0 ? STATUS.ADMISSIBLE : STATUS.REJECTED,
      reason: margin >= 0 ? null : 'Protected recovery reserve is smaller than the certified recovery requirement.'
    };
  }

  function chooseOverallStatus(parts, thresholds = {}) {
    if (parts.some((p) => p && p.status === STATUS.REJECTED)) return STATUS.REJECTED;
    if (parts.some((p) => p && p.status === STATUS.UNRESOLVED)) return STATUS.UNRESOLVED;
    const marginalLimit = finite(thresholds.marginalLookaheadMargin) ? num(thresholds.marginalLookaheadMargin) : null;
    const lookahead = parts.find((p) => p && Object.prototype.hasOwnProperty.call(p, 'margin') && Object.prototype.hasOwnProperty.call(p, 'predictionTime'));
    if (marginalLimit !== null && lookahead && finite(lookahead.margin) && lookahead.margin <= marginalLimit) return STATUS.MARGINAL;
    return STATUS.ADMISSIBLE;
  }

  function resolveTransitSafetyCertificate(context = {}) {
    const family = requireFamily(context.family);
    const environment = normalizeEnvironmentPacket(context.environmentPacket);
    const uncertainty = normalizeUncertainty(context.measurementPacket?.uncertainty || context.uncertaintyPacket);
    const calibrationProfile = context.calibrationProfile || {};
    const severity = computeSeverity(environment, calibrationProfile);
    const familyResponse = computeFamilyResponse(family, severity, environment, uncertainty, calibrationProfile);
    const lookahead = computeLookaheadMargin({
      family,
      routeCandidate: context.routeCandidate || {},
      safetyState: context.safetyState || {}
    });
    const requiredHazards = Array.isArray(context.requiredHazards) ? context.requiredHazards : [];
    const observability = evaluateHazardObservability(requiredHazards, context.measurementPacket || {});
    const recovery = evaluateRecovery(context.recoveryState || {});

    const status = chooseOverallStatus([severity, familyResponse, lookahead, observability, recovery], calibrationProfile.thresholds || {});
    const reasons = [];
    [severity, familyResponse, lookahead, observability, recovery].forEach((part) => {
      if (!part) return;
      if (part.reason) reasons.push(part.reason);
      if (Array.isArray(part.reasons)) reasons.push(...part.reasons);
      if (Array.isArray(part.lost) && part.lost.length) reasons.push(`Required hazard observability lost: ${part.lost.join(', ')}`);
    });

    const certificate = {
      certificateId: context.certificateId ?? null,
      subjectId: context.subjectId ?? null,
      family,
      path: context.path ?? null,
      sharedTier: context.sharedTier ?? null,
      authoritySnapshot: context.authoritySnapshot ?? null,
      environmentEpoch: environment.epoch,
      environmentState: environment,
      uncertaintyState: uncertainty,
      environmentSeverity: severity,
      familyResponse,
      sensorLookahead: lookahead,
      hazardObservability: observability,
      recoveryReserve: recovery,
      commonCauseRisk: uncertainty.commonCauseCovariance,
      status,
      reasons: [...new Set(reasons)],
      routeAdjustments: status === STATUS.ADMISSIBLE ? [] : ['reduce authority/speed if physically meaningful', 'select a lower-hazard route', 'improve measurement covariance', 'restore independent hazard observability', 'increase protected recovery margin', 'reject transit if no certified solution exists'],
      provenance: [
        ...(Array.isArray(context.provenance) ? context.provenance : []),
        ...environment.provenance,
        ...uncertainty.provenance
      ],
      canonStatus: 'MIXED'
    };

    return deepFreeze(certificate);
  }

  globalThis.BlacklightExoFTLSafetyCertificationRuntime = deepFreeze({
    FAMILY_KEYS,
    STATUS,
    resolveTransitSafetyCertificate,
    normalizeEnvironmentPacket,
    normalizeUncertainty,
    computeLookaheadMargin,
    evaluateHazardObservability,
    evaluateRecovery
  });
})();
