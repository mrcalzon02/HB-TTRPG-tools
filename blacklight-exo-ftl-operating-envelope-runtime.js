(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./data/exo-vessel/ftl-operating-envelope-registry.json'));
  } else {
    root.BlacklightExoFTLOperatingEnvelopeRuntime = factory(root.BLACKLIGHT_FTL_OPERATING_ENVELOPE_REGISTRY || null);
  }
}(typeof self !== 'undefined' ? self : this, function (registry) {
  'use strict';

  const STATUS = Object.freeze({
    PASS: 'PASS',
    CONDITIONAL: 'CONDITIONAL',
    BLOCK: 'BLOCK',
    UNRESOLVED: 'UNRESOLVED',
    CONFLICT: 'CONFLICT',
    SIMULATION_ONLY: 'SIMULATION_ONLY'
  });

  function unique(values) {
    return Array.from(new Set((values || []).filter((x) => x !== null && x !== undefined && x !== '')));
  }

  function finite(value) {
    return Number.isFinite(Number(value));
  }

  function normalizeBand(raw) {
    if (raw === null || raw === undefined) return null;
    if (finite(raw)) {
      const x = Number(raw);
      return { lower: x, upper: x };
    }
    if (typeof raw !== 'object') return null;
    const lower = finite(raw.lower) ? Number(raw.lower) : (finite(raw.min) ? Number(raw.min) : null);
    const upper = finite(raw.upper) ? Number(raw.upper) : (finite(raw.max) ? Number(raw.max) : null);
    if (lower === null || upper === null) return { lower, upper };
    return { lower, upper };
  }

  function normalizeDimension(key, spec, request) {
    spec = spec || {};
    request = request || {};
    const required = spec.required === true;
    const certified = normalizeBand(spec.certified || spec.band || spec.range);
    const requested = normalizeBand(request.requested || request.band || request.range || request.value);
    const certifiedUnit = spec.unit || null;
    const requestedUnit = request.unit || certifiedUnit || null;
    const provenance = unique([...(spec.provenance || []), ...(request.provenance || [])]);

    if (!requested) {
      return {
        key, required, unit: certifiedUnit || requestedUnit, certified, requested: null,
        status: required ? STATUS.UNRESOLVED : 'NOT_REQUESTED', signedMargin: null,
        normalizedMargin: null, advisoryMarginFraction: finite(spec.advisoryMarginFraction) ? Number(spec.advisoryMarginFraction) : null,
        reason: required ? 'REQUIRED_REQUEST_DIMENSION_MISSING' : 'DIMENSION_NOT_REQUESTED', provenance
      };
    }

    if (!certified) {
      return {
        key, required, unit: certifiedUnit || requestedUnit, certified: null, requested,
        status: STATUS.UNRESOLVED, signedMargin: null, normalizedMargin: null,
        advisoryMarginFraction: finite(spec.advisoryMarginFraction) ? Number(spec.advisoryMarginFraction) : null,
        reason: 'CERTIFIED_BOUND_MISSING', provenance
      };
    }

    if (certified.lower === null || certified.upper === null || requested.lower === null || requested.upper === null) {
      return {
        key, required, unit: certifiedUnit || requestedUnit, certified, requested,
        status: STATUS.UNRESOLVED, signedMargin: null, normalizedMargin: null,
        advisoryMarginFraction: finite(spec.advisoryMarginFraction) ? Number(spec.advisoryMarginFraction) : null,
        reason: 'BOUND_INCOMPLETE', provenance
      };
    }

    if (certified.lower > certified.upper || requested.lower > requested.upper) {
      return {
        key, required, unit: certifiedUnit || requestedUnit, certified, requested,
        status: STATUS.CONFLICT, signedMargin: null, normalizedMargin: null,
        advisoryMarginFraction: finite(spec.advisoryMarginFraction) ? Number(spec.advisoryMarginFraction) : null,
        reason: 'MALFORMED_INTERVAL', provenance
      };
    }

    if (certifiedUnit && requestedUnit && certifiedUnit !== requestedUnit) {
      return {
        key, required, unit: certifiedUnit, certified, requested,
        status: STATUS.UNRESOLVED, signedMargin: null, normalizedMargin: null,
        advisoryMarginFraction: finite(spec.advisoryMarginFraction) ? Number(spec.advisoryMarginFraction) : null,
        reason: 'UNIT_MISMATCH_REQUIRES_EXPLICIT_NORMALIZATION', provenance
      };
    }

    const signedMargin = Math.min(requested.lower - certified.lower, certified.upper - requested.upper);
    const span = certified.upper - certified.lower;
    const normalizedMargin = span > 0 ? signedMargin / span : (signedMargin >= 0 ? 0 : null);
    if (signedMargin < 0) {
      return {
        key, required, unit: certifiedUnit || requestedUnit, certified, requested,
        status: STATUS.BLOCK, signedMargin, normalizedMargin,
        advisoryMarginFraction: finite(spec.advisoryMarginFraction) ? Number(spec.advisoryMarginFraction) : null,
        reason: 'REQUEST_OUTSIDE_CERTIFIED_INTERVAL', provenance
      };
    }

    const advisory = finite(spec.advisoryMarginFraction) ? Number(spec.advisoryMarginFraction) : null;
    const status = advisory !== null && normalizedMargin !== null && normalizedMargin <= advisory
      ? STATUS.CONDITIONAL : STATUS.PASS;
    return {
      key, required, unit: certifiedUnit || requestedUnit, certified, requested,
      status, signedMargin, normalizedMargin, advisoryMarginFraction: advisory,
      reason: status === STATUS.CONDITIONAL ? 'REQUEST_INSIDE_ADVISORY_BOUNDARY_MARGIN' : 'REQUEST_INSIDE_CERTIFIED_INTERVAL', provenance
    };
  }

  function evaluateCoupledConstraint(spec, dimensionMap) {
    const id = spec.id || 'unnamed-coupled-constraint';
    const coefficients = spec.coefficients || {};
    const variables = Object.keys(coefficients);
    const provenance = unique(spec.provenance || []);
    if (!finite(spec.limit)) {
      return { id, status: STATUS.CONFLICT, lhsWorstCase: null, limit: null, reason: 'COUPLED_LIMIT_MISSING_OR_NONFINITE', variables, provenance };
    }
    let lhs = finite(spec.constant) ? Number(spec.constant) : 0;
    for (const key of variables) {
      const coefficient = Number(coefficients[key]);
      const dimension = dimensionMap[key];
      if (!finite(coefficient)) {
        return { id, status: STATUS.CONFLICT, lhsWorstCase: null, limit: Number(spec.limit), reason: 'NONFINITE_COEFFICIENT:' + key, variables, provenance };
      }
      if (!dimension || !dimension.requested || !finite(dimension.requested.lower) || !finite(dimension.requested.upper)) {
        return { id, status: STATUS.UNRESOLVED, lhsWorstCase: null, limit: Number(spec.limit), reason: 'REQUEST_VARIABLE_MISSING:' + key, variables, provenance };
      }
      const lo = Number(dimension.requested.lower);
      const hi = Number(dimension.requested.upper);
      lhs += Math.max(coefficient * lo, coefficient * hi);
    }
    const limit = Number(spec.limit);
    const margin = limit - lhs;
    if (margin < 0) {
      return { id, status: STATUS.BLOCK, lhsWorstCase: lhs, limit, reason: 'COUPLED_CONSTRAINT_EXCEEDED', variables, provenance };
    }
    const advisory = finite(spec.advisoryMargin) ? Number(spec.advisoryMargin) : null;
    return {
      id,
      status: advisory !== null && margin <= advisory ? STATUS.CONDITIONAL : STATUS.PASS,
      lhsWorstCase: lhs,
      limit,
      reason: advisory !== null && margin <= advisory ? 'COUPLED_CONSTRAINT_INSIDE_ADVISORY_MARGIN' : 'COUPLED_CONSTRAINT_SATISFIED',
      variables,
      provenance
    };
  }

  function reduceStatus(dimensionResults, coupledResults, simulationOnly) {
    const states = [...dimensionResults, ...coupledResults].map((x) => x.status);
    if (states.includes(STATUS.CONFLICT)) return STATUS.CONFLICT;
    if (states.includes(STATUS.BLOCK)) return STATUS.BLOCK;
    if (states.includes(STATUS.UNRESOLVED)) return STATUS.UNRESOLVED;
    if (simulationOnly) return STATUS.SIMULATION_ONLY;
    if (states.includes(STATUS.CONDITIONAL)) return STATUS.CONDITIONAL;
    return STATUS.PASS;
  }

  function resolveFTLOperatingEnvelope(context) {
    context = context || {};
    const certificate = context.operatingEnvelopeCertificate || context.certificate || {};
    const request = context.operatingDemand || context.requestedOperatingPoint || context.request || {};
    const certificateDimensions = certificate.dimensions || {};
    const requestDimensions = request.dimensions || request;
    const keys = unique([...Object.keys(certificateDimensions), ...Object.keys(requestDimensions || {})]);
    const dimensions = keys.map((key) => normalizeDimension(key, certificateDimensions[key], requestDimensions[key]));
    const dimensionMap = Object.fromEntries(dimensions.map((x) => [x.key, x]));
    const coupledSpecs = certificate.coupledConstraints || [];
    const coupledConstraints = coupledSpecs.map((spec) => evaluateCoupledConstraint(spec, dimensionMap));
    const status = reduceStatus(dimensions, coupledConstraints, certificate.simulationOnly === true);
    const warnings = unique([
      ...dimensions.filter((x) => x.status !== STATUS.PASS && x.status !== 'NOT_REQUESTED').map((x) => x.key + ': ' + x.reason),
      ...coupledConstraints.filter((x) => x.status !== STATUS.PASS).map((x) => x.id + ': ' + x.reason),
      status === STATUS.PASS ? null : 'Certified operating-envelope compatibility is not a full family-specific route-safety determination.',
      'Environmental envelope checks constrain installation certification and do not replace family-specific route physics.'
    ]);

    return {
      schemaVersion: '1.0.0',
      status,
      certificateId: certificate.certificateId || null,
      installationId: certificate.installationId || context.installationId || null,
      technologyBasis: certificate.technologyBasis || context.technologyBasis || null,
      familyStatus: certificate.familyStatus || context.familyStatus || null,
      family: certificate.family || context.family || null,
      dimensions,
      coupledConstraints,
      warnings,
      provenance: unique([
        'blacklight.ftl.operating-envelope@1.0.0',
        ...(certificate.provenance || []),
        ...(request.provenance || []),
        ...(context.provenance || [])
      ])
    };
  }

  return {
    STATUS,
    normalizeBand,
    normalizeDimension,
    evaluateCoupledConstraint,
    resolveFTLOperatingEnvelope,
    registry: registry || null
  };
}));
