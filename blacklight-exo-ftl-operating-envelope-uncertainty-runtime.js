(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./data/exo-vessel/ftl-operating-envelope-uncertainty-registry.json'));
  } else {
    root.BlacklightExoFTLOperatingEnvelopeUncertaintyRuntime = factory(root.BLACKLIGHT_FTL_OPERATING_ENVELOPE_UNCERTAINTY_REGISTRY || null);
  }
}(typeof self !== 'undefined' ? self : this, function (registry) {
  'use strict';

  const STATUS = Object.freeze({
    PASS: 'PASS',
    BLOCK: 'BLOCK',
    UNRESOLVED: 'UNRESOLVED',
    CONFLICT: 'CONFLICT',
    SIMULATION_ONLY: 'SIMULATION_ONLY'
  });

  function finite(value) {
    return Number.isFinite(Number(value));
  }

  function unique(values) {
    return Array.from(new Set((values || []).filter((x) => x !== null && x !== undefined && x !== '')));
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
    return { lower, upper };
  }

  function normalizeUncertainty(raw, expectedUnit) {
    if (raw === null || raw === undefined) {
      return { status: STATUS.PASS, type: 'none', lower: 0, upper: 0, normalized: null, reason: 'NO_UNCERTAINTY_DECLARED' };
    }
    if (typeof raw !== 'object') {
      return { status: STATUS.CONFLICT, type: null, lower: null, upper: null, normalized: null, reason: 'UNCERTAINTY_NOT_OBJECT' };
    }
    const type = raw.type || null;
    const unit = raw.unit || expectedUnit || null;
    if (expectedUnit && raw.unit && expectedUnit !== raw.unit) {
      return { status: STATUS.UNRESOLVED, type, lower: null, upper: null, normalized: raw, reason: 'UNCERTAINTY_UNIT_MISMATCH_REQUIRES_NORMALIZATION' };
    }
    if (type === 'deterministicBound') {
      const symmetric = finite(raw.absolute) ? Number(raw.absolute) : null;
      const lower = finite(raw.lower) ? Number(raw.lower) : symmetric;
      const upper = finite(raw.upper) ? Number(raw.upper) : symmetric;
      if (lower === null || upper === null || lower < 0 || upper < 0) {
        return { status: STATUS.CONFLICT, type, lower: null, upper: null, normalized: raw, reason: 'DETERMINISTIC_BOUND_MALFORMED' };
      }
      return { status: STATUS.PASS, type, lower, upper, normalized: Object.assign({}, raw, { unit }), reason: 'DETERMINISTIC_BOUND_ACCEPTED' };
    }
    if (type === 'standardUncertainty') {
      if (!finite(raw.standardUncertainty) || Number(raw.standardUncertainty) < 0) {
        return { status: STATUS.CONFLICT, type, lower: null, upper: null, normalized: raw, reason: 'STANDARD_UNCERTAINTY_MISSING_OR_NEGATIVE' };
      }
      if (!finite(raw.coverageFactor) || Number(raw.coverageFactor) < 0 || !raw.distributionModel) {
        return { status: STATUS.UNRESOLVED, type, lower: null, upper: null, normalized: raw, reason: 'STANDARD_UNCERTAINTY_REQUIRES_EXPLICIT_COVERAGE_AND_DISTRIBUTION' };
      }
      const expanded = Number(raw.standardUncertainty) * Number(raw.coverageFactor);
      return {
        status: STATUS.PASS,
        type,
        lower: expanded,
        upper: expanded,
        normalized: Object.assign({}, raw, { unit }),
        reason: 'STANDARD_UNCERTAINTY_CONVERTED_WITH_EXPLICIT_COVERAGE'
      };
    }
    return { status: STATUS.UNRESOLVED, type, lower: null, upper: null, normalized: raw, reason: 'UNCERTAINTY_TYPE_UNSUPPORTED' };
  }

  function applyUncertaintyToBand(band, uncertainty, role) {
    if (!band || !finite(band.lower) || !finite(band.upper)) return null;
    if (!uncertainty || uncertainty.status !== STATUS.PASS || !finite(uncertainty.lower) || !finite(uncertainty.upper)) return null;
    if (role === 'certificate') {
      return {
        lower: Number(band.lower) + Number(uncertainty.lower),
        upper: Number(band.upper) - Number(uncertainty.upper)
      };
    }
    return {
      lower: Number(band.lower) - Number(uncertainty.lower),
      upper: Number(band.upper) + Number(uncertainty.upper)
    };
  }

  function evaluateDimension(key, certificateSpec, requestSpec) {
    certificateSpec = certificateSpec || {};
    requestSpec = requestSpec || {};
    const unit = certificateSpec.unit || requestSpec.unit || null;
    const certifiedNominal = normalizeBand(certificateSpec.certified || certificateSpec.band || certificateSpec.range);
    const requestedNominal = normalizeBand(requestSpec.requested || requestSpec.band || requestSpec.range || requestSpec.value);
    const certifiedUncertainty = normalizeUncertainty(certificateSpec.uncertainty, unit);
    const requestedUncertainty = normalizeUncertainty(requestSpec.uncertainty, unit);
    const provenance = unique([...(certificateSpec.provenance || []), ...(requestSpec.provenance || [])]);

    if (!requestedNominal) {
      return {
        key, unit, certifiedNominal, requestedNominal: null, certifiedEffective: null, requestedEffective: null,
        certifiedUncertainty: certifiedUncertainty.normalized, requestedUncertainty: requestedUncertainty.normalized,
        status: 'NOT_REQUESTED', signedMargin: null, reason: 'DIMENSION_NOT_REQUESTED', provenance
      };
    }
    if (!certifiedNominal) {
      return {
        key, unit, certifiedNominal: null, requestedNominal, certifiedEffective: null, requestedEffective: null,
        certifiedUncertainty: certifiedUncertainty.normalized, requestedUncertainty: requestedUncertainty.normalized,
        status: STATUS.UNRESOLVED, signedMargin: null, reason: 'CERTIFIED_BOUND_MISSING', provenance
      };
    }
    if (certificateSpec.unit && requestSpec.unit && certificateSpec.unit !== requestSpec.unit) {
      return {
        key, unit: certificateSpec.unit, certifiedNominal, requestedNominal, certifiedEffective: null, requestedEffective: null,
        certifiedUncertainty: certifiedUncertainty.normalized, requestedUncertainty: requestedUncertainty.normalized,
        status: STATUS.UNRESOLVED, signedMargin: null, reason: 'UNIT_MISMATCH_REQUIRES_EXPLICIT_NORMALIZATION', provenance
      };
    }
    if (!finite(certifiedNominal.lower) || !finite(certifiedNominal.upper) || !finite(requestedNominal.lower) || !finite(requestedNominal.upper)) {
      return {
        key, unit, certifiedNominal, requestedNominal, certifiedEffective: null, requestedEffective: null,
        certifiedUncertainty: certifiedUncertainty.normalized, requestedUncertainty: requestedUncertainty.normalized,
        status: STATUS.UNRESOLVED, signedMargin: null, reason: 'NOMINAL_BOUND_INCOMPLETE', provenance
      };
    }
    if (certifiedNominal.lower > certifiedNominal.upper || requestedNominal.lower > requestedNominal.upper) {
      return {
        key, unit, certifiedNominal, requestedNominal, certifiedEffective: null, requestedEffective: null,
        certifiedUncertainty: certifiedUncertainty.normalized, requestedUncertainty: requestedUncertainty.normalized,
        status: STATUS.CONFLICT, signedMargin: null, reason: 'MALFORMED_NOMINAL_INTERVAL', provenance
      };
    }
    if (certificateSpec.uncertaintyRequired === true && certificateSpec.uncertainty === undefined) {
      return {
        key, unit, certifiedNominal, requestedNominal, certifiedEffective: null, requestedEffective: null,
        certifiedUncertainty: null, requestedUncertainty: requestedUncertainty.normalized,
        status: STATUS.UNRESOLVED, signedMargin: null, reason: 'CERTIFICATE_UNCERTAINTY_REQUIRED_BUT_MISSING', provenance
      };
    }
    if (requestSpec.uncertaintyRequired === true && requestSpec.uncertainty === undefined) {
      return {
        key, unit, certifiedNominal, requestedNominal, certifiedEffective: null, requestedEffective: null,
        certifiedUncertainty: certifiedUncertainty.normalized, requestedUncertainty: null,
        status: STATUS.UNRESOLVED, signedMargin: null, reason: 'REQUEST_UNCERTAINTY_REQUIRED_BUT_MISSING', provenance
      };
    }
    if (certifiedUncertainty.status !== STATUS.PASS || requestedUncertainty.status !== STATUS.PASS) {
      const unresolved = certifiedUncertainty.status === STATUS.UNRESOLVED || requestedUncertainty.status === STATUS.UNRESOLVED;
      return {
        key, unit, certifiedNominal, requestedNominal, certifiedEffective: null, requestedEffective: null,
        certifiedUncertainty: certifiedUncertainty.normalized, requestedUncertainty: requestedUncertainty.normalized,
        status: unresolved ? STATUS.UNRESOLVED : STATUS.CONFLICT, signedMargin: null,
        reason: certifiedUncertainty.status !== STATUS.PASS ? certifiedUncertainty.reason : requestedUncertainty.reason,
        provenance
      };
    }

    const certifiedEffective = applyUncertaintyToBand(certifiedNominal, certifiedUncertainty, 'certificate');
    const requestedEffective = applyUncertaintyToBand(requestedNominal, requestedUncertainty, 'request');
    if (!certifiedEffective || !requestedEffective) {
      return {
        key, unit, certifiedNominal, requestedNominal, certifiedEffective, requestedEffective,
        certifiedUncertainty: certifiedUncertainty.normalized, requestedUncertainty: requestedUncertainty.normalized,
        status: STATUS.UNRESOLVED, signedMargin: null, reason: 'EFFECTIVE_INTERVAL_UNRESOLVED', provenance
      };
    }
    if (certifiedEffective.lower > certifiedEffective.upper) {
      return {
        key, unit, certifiedNominal, requestedNominal, certifiedEffective, requestedEffective,
        certifiedUncertainty: certifiedUncertainty.normalized, requestedUncertainty: requestedUncertainty.normalized,
        status: STATUS.CONFLICT, signedMargin: null, reason: 'CERTIFIED_UNCERTAINTY_CONSUMES_CERTIFIED_INTERVAL', provenance
      };
    }
    const signedMargin = Math.min(
      requestedEffective.lower - certifiedEffective.lower,
      certifiedEffective.upper - requestedEffective.upper
    );
    return {
      key, unit, certifiedNominal, requestedNominal, certifiedEffective, requestedEffective,
      certifiedUncertainty: certifiedUncertainty.normalized, requestedUncertainty: requestedUncertainty.normalized,
      status: signedMargin < 0 ? STATUS.BLOCK : STATUS.PASS,
      signedMargin,
      reason: signedMargin < 0 ? 'UNCERTAINTY_EXPANDED_REQUEST_OUTSIDE_CONTRACTED_CERTIFIED_INTERVAL' : 'UNCERTAINTY_AWARE_INTERVAL_INSIDE_CERTIFIED_REGION',
      provenance
    };
  }

  function validateCovarianceMatrix(matrix, tolerance) {
    const tol = finite(tolerance) ? Math.abs(Number(tolerance)) : 1e-10;
    if (!Array.isArray(matrix) || matrix.length === 0 || !matrix.every((row) => Array.isArray(row) && row.length === matrix.length)) {
      return { status: STATUS.CONFLICT, reason: 'COVARIANCE_MATRIX_NOT_SQUARE', matrix: null };
    }
    const n = matrix.length;
    const A = matrix.map((row) => row.map((x) => Number(x)));
    if (!A.every((row) => row.every((x) => Number.isFinite(x)))) {
      return { status: STATUS.CONFLICT, reason: 'COVARIANCE_MATRIX_NONFINITE', matrix: null };
    }
    for (let i = 0; i < n; i += 1) {
      if (A[i][i] < -tol) return { status: STATUS.CONFLICT, reason: 'COVARIANCE_NEGATIVE_DIAGONAL', matrix: A };
      for (let j = i + 1; j < n; j += 1) {
        const scale = Math.max(1, Math.abs(A[i][j]), Math.abs(A[j][i]));
        if (Math.abs(A[i][j] - A[j][i]) > tol * scale) {
          return { status: STATUS.CONFLICT, reason: 'COVARIANCE_MATRIX_NOT_SYMMETRIC', matrix: A };
        }
      }
    }

    const L = Array.from({ length: n }, () => Array(n).fill(0));
    for (let i = 0; i < n; i += 1) {
      let diag = A[i][i];
      for (let k = 0; k < i; k += 1) diag -= L[i][k] * L[i][k];
      if (diag < -tol) return { status: STATUS.CONFLICT, reason: 'COVARIANCE_NOT_POSITIVE_SEMIDEFINITE', matrix: A };
      if (Math.abs(diag) <= tol) {
        L[i][i] = 0;
        for (let j = i + 1; j < n; j += 1) {
          let residual = A[j][i];
          for (let k = 0; k < i; k += 1) residual -= L[j][k] * L[i][k];
          if (Math.abs(residual) > tol * Math.max(1, Math.abs(A[j][i]))) {
            return { status: STATUS.CONFLICT, reason: 'COVARIANCE_NOT_POSITIVE_SEMIDEFINITE', matrix: A };
          }
        }
      } else {
        L[i][i] = Math.sqrt(diag);
        for (let j = i + 1; j < n; j += 1) {
          let residual = A[j][i];
          for (let k = 0; k < i; k += 1) residual -= L[j][k] * L[i][k];
          L[j][i] = residual / L[i][i];
        }
      }
    }
    return { status: STATUS.PASS, reason: 'COVARIANCE_MATRIX_VALID', matrix: A };
  }

  function evaluateCovarianceConstraint(spec, request) {
    spec = spec || {};
    request = request || {};
    const id = spec.id || 'unnamed-covariance-constraint';
    const modelId = spec.covarianceModelId || null;
    const provenance = unique([...(spec.provenance || []), ...(request.provenance || [])]);
    const models = request.covarianceModels || {};
    const model = modelId ? models[modelId] : null;
    const variables = Object.keys(spec.coefficients || {});
    const empty = { id, modelId, variables, meanDemand: null, directionalVariance: null, directionalSigma: null, coverageFactor: null, confidenceDemand: null, limit: finite(spec.limit) ? Number(spec.limit) : null, margin: null, provenance };

    if (!modelId || !model) return Object.assign({}, empty, { status: STATUS.UNRESOLVED, reason: 'COVARIANCE_MODEL_MISSING' });
    if (!finite(spec.limit)) return Object.assign({}, empty, { status: STATUS.CONFLICT, reason: 'COVARIANCE_CONSTRAINT_LIMIT_MISSING' });
    if (!Array.isArray(model.variables) || !Array.isArray(model.mean) || model.variables.length !== model.mean.length) {
      return Object.assign({}, empty, { status: STATUS.CONFLICT, reason: 'COVARIANCE_VARIABLE_OR_MEAN_SHAPE_INVALID' });
    }
    if (!finite(model.coverageFactor) || Number(model.coverageFactor) < 0 || !model.distributionModel) {
      return Object.assign({}, empty, { status: STATUS.UNRESOLVED, reason: 'COVARIANCE_REQUIRES_EXPLICIT_COVERAGE_AND_DISTRIBUTION' });
    }
    if (model.normalizedUnits !== true) {
      return Object.assign({}, empty, { status: STATUS.UNRESOLVED, reason: 'COVARIANCE_UNITS_NOT_EXPLICITLY_NORMALIZED' });
    }
    const matrixValidation = validateCovarianceMatrix(model.matrix, model.tolerance);
    if (matrixValidation.status !== STATUS.PASS) {
      return Object.assign({}, empty, { status: matrixValidation.status, reason: matrixValidation.reason, coverageFactor: Number(model.coverageFactor) });
    }

    const index = new Map(model.variables.map((name, i) => [name, i]));
    for (const variable of variables) {
      if (!index.has(variable)) return Object.assign({}, empty, { status: STATUS.UNRESOLVED, reason: 'COVARIANCE_VARIABLE_MISSING:' + variable, coverageFactor: Number(model.coverageFactor) });
    }
    const a = model.variables.map((name) => finite(spec.coefficients[name]) ? Number(spec.coefficients[name]) : 0);
    if (variables.some((name) => !finite(spec.coefficients[name]))) {
      return Object.assign({}, empty, { status: STATUS.CONFLICT, reason: 'COVARIANCE_COEFFICIENT_NONFINITE', coverageFactor: Number(model.coverageFactor) });
    }
    const mu = model.mean.map((x) => Number(x));
    if (!mu.every(Number.isFinite)) return Object.assign({}, empty, { status: STATUS.CONFLICT, reason: 'COVARIANCE_MEAN_NONFINITE', coverageFactor: Number(model.coverageFactor) });

    let meanDemand = finite(spec.constant) ? Number(spec.constant) : 0;
    for (let i = 0; i < a.length; i += 1) meanDemand += a[i] * mu[i];
    let variance = 0;
    for (let i = 0; i < a.length; i += 1) {
      for (let j = 0; j < a.length; j += 1) variance += a[i] * matrixValidation.matrix[i][j] * a[j];
    }
    const tol = finite(model.tolerance) ? Math.abs(Number(model.tolerance)) : 1e-10;
    if (variance < -tol) return Object.assign({}, empty, { status: STATUS.CONFLICT, reason: 'DIRECTIONAL_VARIANCE_NEGATIVE', meanDemand, directionalVariance: variance, coverageFactor: Number(model.coverageFactor) });
    variance = Math.max(0, variance);
    const sigma = Math.sqrt(variance);
    const k = Number(model.coverageFactor);
    const confidenceDemand = meanDemand + k * sigma;
    const limit = Number(spec.limit);
    const margin = limit - confidenceDemand;
    return {
      id, modelId, variables,
      status: margin < 0 ? STATUS.BLOCK : STATUS.PASS,
      meanDemand,
      directionalVariance: variance,
      directionalSigma: sigma,
      coverageFactor: k,
      confidenceDemand,
      limit,
      margin,
      reason: margin < 0 ? 'COVARIANCE_AWARE_CONFIDENCE_DEMAND_EXCEEDS_LIMIT' : 'COVARIANCE_AWARE_CONFIDENCE_DEMAND_WITHIN_LIMIT',
      provenance
    };
  }

  function reduceStatus(dimensions, covarianceConstraints, simulationOnly) {
    const states = [...dimensions, ...covarianceConstraints].map((x) => x.status);
    if (states.includes(STATUS.CONFLICT)) return STATUS.CONFLICT;
    if (states.includes(STATUS.BLOCK)) return STATUS.BLOCK;
    if (states.includes(STATUS.UNRESOLVED)) return STATUS.UNRESOLVED;
    if (simulationOnly) return STATUS.SIMULATION_ONLY;
    return STATUS.PASS;
  }

  function resolveFTLOperatingEnvelopeUncertainty(context) {
    context = context || {};
    const certificate = context.operatingEnvelopeCertificate || context.certificate || {};
    const request = context.operatingDemand || context.requestedOperatingPoint || context.request || {};
    const certificateDimensions = certificate.dimensions || {};
    const requestDimensions = request.dimensions || request;
    const keys = unique([...Object.keys(certificateDimensions), ...Object.keys(requestDimensions || {})]);
    const dimensions = keys.map((key) => evaluateDimension(key, certificateDimensions[key], requestDimensions[key]));
    const covarianceSpecs = (certificate.coupledConstraints || []).filter((x) => x && x.uncertaintyMethod === 'covariance');
    const covarianceConstraints = covarianceSpecs.map((spec) => evaluateCovarianceConstraint(spec, request));
    const status = reduceStatus(dimensions.filter((x) => x.status !== 'NOT_REQUESTED'), covarianceConstraints, certificate.simulationOnly === true);
    const warnings = unique([
      ...dimensions.filter((x) => x.status !== STATUS.PASS && x.status !== 'NOT_REQUESTED').map((x) => x.key + ': ' + x.reason),
      ...covarianceConstraints.filter((x) => x.status !== STATUS.PASS).map((x) => x.id + ': ' + x.reason),
      'Uncertainty-aware certification does not produce a probability of safe transit.',
      'Missing covariance is not interpreted as zero covariance or statistical independence.',
      'This layer constrains installation operating-envelope evidence and does not replace family-specific route physics.'
    ]);
    return {
      schemaVersion: '1.0.0',
      status,
      dimensions,
      covarianceConstraints,
      warnings,
      provenance: unique([
        'blacklight.ftl.operating-envelope.uncertainty@1.0.0',
        ...(certificate.provenance || []),
        ...(request.provenance || []),
        ...(context.provenance || [])
      ])
    };
  }

  return {
    STATUS,
    normalizeBand,
    normalizeUncertainty,
    applyUncertaintyToBand,
    evaluateDimension,
    validateCovarianceMatrix,
    evaluateCovarianceConstraint,
    resolveFTLOperatingEnvelopeUncertainty,
    registry: registry || null
  };
}));
