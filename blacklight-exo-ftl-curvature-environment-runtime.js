(function (root) {
  'use strict';

  const REGISTRY_URL = 'data/exo-vessel/ftl-curvature-environment-registry.json';
  const G = 6.67430e-11;
  const C = 299792458;
  const C2 = C * C;
  let registryPromise = null;

  function finite(value) {
    return value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value));
  }

  function copy(value) {
    return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
  }

  function vector(value) {
    if (!value || !['x', 'y', 'z'].every(axis => finite(value[axis]))) return null;
    return {x: Number(value.x), y: Number(value.y), z: Number(value.z)};
  }

  function add(a, b) {
    return {x: a.x + b.x, y: a.y + b.y, z: a.z + b.z};
  }

  function subtract(a, b) {
    return {x: a.x - b.x, y: a.y - b.y, z: a.z - b.z};
  }

  function scale(v, k) {
    return {x: v.x * k, y: v.y * k, z: v.z * k};
  }

  function dot(a, b) {
    return a.x * b.x + a.y * b.y + a.z * b.z;
  }

  function magnitude(v) {
    return Math.hypot(v.x, v.y, v.z);
  }

  function zeroMatrix() {
    return [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
  }

  function addMatrixInPlace(a, b) {
    for (let i = 0; i < 3; i += 1) {
      for (let j = 0; j < 3; j += 1) a[i][j] += b[i][j];
    }
  }

  function tidalTensorPointMass(massKg, displacement) {
    const r = magnitude(displacement);
    if (!(r > 0)) return null;
    const n = scale(displacement, 1 / r);
    const components = [n.x, n.y, n.z];
    const factor = G * massKg / (r ** 3);
    const tensor = zeroMatrix();
    for (let i = 0; i < 3; i += 1) {
      for (let j = 0; j < 3; j += 1) {
        tensor[i][j] = factor * (3 * components[i] * components[j] - (i === j ? 1 : 0));
      }
    }
    return tensor;
  }

  function frobenius(matrix) {
    let sum = 0;
    for (const row of matrix) for (const value of row) sum += value * value;
    return Math.sqrt(sum);
  }

  // Jacobi diagonalization for a real symmetric 3x3 tensor. This avoids
  // importing a numerical library for the small eigensystem used by route sensing.
  function symmetricEigenvalues3(matrix) {
    const a = matrix.map(row => row.slice());
    for (let iteration = 0; iteration < 32; iteration += 1) {
      let p = 0;
      let q = 1;
      let largest = Math.abs(a[p][q]);
      for (const [i, j] of [[0, 2], [1, 2]]) {
        const candidate = Math.abs(a[i][j]);
        if (candidate > largest) {
          largest = candidate;
          p = i;
          q = j;
        }
      }
      if (largest <= 1e-18 * Math.max(1, Math.abs(a[0][0]), Math.abs(a[1][1]), Math.abs(a[2][2]))) break;
      const phi = 0.5 * Math.atan2(2 * a[p][q], a[q][q] - a[p][p]);
      const c = Math.cos(phi);
      const s = Math.sin(phi);
      const app = c * c * a[p][p] - 2 * s * c * a[p][q] + s * s * a[q][q];
      const aqq = s * s * a[p][p] + 2 * s * c * a[p][q] + c * c * a[q][q];
      for (let k = 0; k < 3; k += 1) {
        if (k === p || k === q) continue;
        const akp = a[k][p];
        const akq = a[k][q];
        a[k][p] = a[p][k] = c * akp - s * akq;
        a[k][q] = a[q][k] = s * akp + c * akq;
      }
      a[p][p] = app;
      a[q][q] = aqq;
      a[p][q] = a[q][p] = 0;
    }
    return [a[0][0], a[1][1], a[2][2]].sort((x, y) => y - x);
  }

  function lenseThirringPrecession(angularMomentum, displacement) {
    const r = magnitude(displacement);
    if (!(r > 0)) return null;
    const n = scale(displacement, 1 / r);
    const coefficient = G / (C2 * (r ** 3));
    // Standard weak-field gyroscope precession vector:
    // Omega_LT = G/(c^2 r^3) [3 n (J·n) - J].
    return scale(subtract(scale(n, 3 * dot(angularMomentum, n)), angularMomentum), coefficient);
  }

  async function loadRegistry() {
    if (!registryPromise) {
      registryPromise = fetch(REGISTRY_URL, {cache: 'no-store'})
        .then(response => {
          if (!response.ok) throw new Error(`FTL curvature environment registry load failed: ${response.status}`);
          return response.json();
        })
        .then(registry => {
          if (!registry || registry.registryKey !== 'blacklight.ftl.curvature-environment') {
            throw new Error('Invalid FTL curvature environment registry identity.');
          }
          return registry;
        });
    }
    return registryPromise;
  }

  function normalizeSource(source, index) {
    const position = vector(source?.positionM);
    if (!finite(source?.massKg) || Number(source.massKg) <= 0 || !position) return null;
    return {
      sourceId: String(source.sourceId || `source-${index + 1}`),
      massKg: Number(source.massKg),
      positionM: position,
      velocityMPerS: vector(source.velocityMPerS),
      angularMomentumKgM2PerS: vector(source.angularMomentumKgM2PerS),
      physicalRadiusM: finite(source.physicalRadiusM) && Number(source.physicalRadiusM) > 0 ? Number(source.physicalRadiusM) : null,
      provenanceStatus: String(source.provenanceStatus || 'UNRESOLVED').toUpperCase()
    };
  }

  function unresolved(reason, registry, context) {
    return {
      schemaVersion: '1.0.0',
      status: 'UNRESOLVED',
      referenceFrame: context?.referenceFrame || 'UNRESOLVED',
      fieldPoint: vector(context?.fieldPoint),
      sources: [],
      metrics: {
        potentialM2PerS2: null,
        accelerationMPerS2: null,
        accelerationMagnitudeMPerS2: null,
        tidalTensorPerS2: null,
        tidalFrobeniusPerS2: null,
        maxTidalEigenvaluePerS2: null,
        minimumSchwarzschildRadiusRatio: null,
        maxSingleSourceKretschmannPerM4: null,
        maxSingleSourceCurvatureScalePerM2: null,
        lenseThirringRadPerS: null,
        dimensionlessPotentialDepth: null
      },
      validity: {
        weakFieldApproximation: null,
        slowSourceMotion: null,
        pointMassApproximation: null,
        notes: [reason]
      },
      uncertainty: context?.uncertainty ? copy(context.uncertainty) : null,
      provenance: [
        {role: 'registry', source: REGISTRY_URL, status: registry?.status || 'UNRESOLVED'},
        {role: 'resolution', status: 'UNRESOLVED', reason}
      ]
    };
  }

  async function resolveFTLCurvatureEnvironment(context = {}) {
    const registry = await loadRegistry();
    const fieldPoint = vector(context.fieldPoint);
    if (!fieldPoint) return unresolved('Missing or invalid SI field point.', registry, context);
    if (!Array.isArray(context.sources) || !context.sources.length) return unresolved('No gravitational source records supplied.', registry, context);

    const sources = context.sources.map(normalizeSource).filter(Boolean);
    if (sources.length !== context.sources.length) return unresolved('At least one gravitational source lacks a positive mass or finite SI position.', registry, context);

    let rawPotential = 0;
    let acceleration = {x: 0, y: 0, z: 0};
    const tidal = zeroMatrix();
    let minimumSchwarzschildRadiusRatio = Infinity;
    let maxKretschmann = 0;
    let lenseThirring = {x: 0, y: 0, z: 0};
    let anyAngularMomentum = false;
    let hardInvalid = false;
    let pointMassKnown = true;
    let pointMassValid = true;
    let sourceMotionKnown = true;
    let maxSourceBeta = 0;
    const notes = [];
    const sourceDiagnostics = [];

    for (const source of sources) {
      const displacement = subtract(fieldPoint, source.positionM);
      const r = magnitude(displacement);
      if (!(r > 0)) {
        hardInvalid = true;
        notes.push(`${source.sourceId}: field point coincides with point-source location.`);
        continue;
      }

      const rs = 2 * G * source.massKg / C2;
      const ratio = r / rs;
      minimumSchwarzschildRadiusRatio = Math.min(minimumSchwarzschildRadiusRatio, ratio);
      const kretschmann = 48 * G * G * source.massKg * source.massKg / ((C ** 4) * (r ** 6));
      maxKretschmann = Math.max(maxKretschmann, kretschmann);
      rawPotential -= G * source.massKg / r;
      acceleration = add(acceleration, scale(displacement, -G * source.massKg / (r ** 3)));
      const sourceTidal = tidalTensorPointMass(source.massKg, displacement);
      if (sourceTidal) addMatrixInPlace(tidal, sourceTidal);

      if (source.physicalRadiusM === null) {
        pointMassKnown = false;
      } else if (r <= source.physicalRadiusM) {
        pointMassValid = false;
        hardInvalid = true;
        notes.push(`${source.sourceId}: point-mass exterior model evaluated at or inside the declared physical radius.`);
      }

      if (source.velocityMPerS) {
        const beta = magnitude(source.velocityMPerS) / C;
        maxSourceBeta = Math.max(maxSourceBeta, beta);
      } else {
        sourceMotionKnown = false;
      }

      if (source.angularMomentumKgM2PerS) {
        const omega = lenseThirringPrecession(source.angularMomentumKgM2PerS, displacement);
        if (omega) {
          lenseThirring = add(lenseThirring, omega);
          anyAngularMomentum = true;
        }
      }

      sourceDiagnostics.push({
        sourceId: source.sourceId,
        distanceM: r,
        schwarzschildRadiusM: rs,
        schwarzschildRadiusRatio: ratio,
        singleSourceKretschmannPerM4: kretschmann
      });
    }

    if (hardInvalid && !Number.isFinite(minimumSchwarzschildRadiusRatio)) {
      return unresolved('Physical environment could not be evaluated at the requested point.', registry, context);
    }

    const referencePotential = finite(context.potentialReferenceM2PerS2) ? Number(context.potentialReferenceM2PerS2) : 0;
    const relativePotential = rawPotential - referencePotential;
    const dimensionlessPotentialDepth = Math.abs(relativePotential) / C2;
    const eigenvalues = symmetricEigenvalues3(tidal);
    const maxAbsEigenvalue = eigenvalues.reduce((selected, value) => Math.abs(value) > Math.abs(selected) ? value : selected, eigenvalues[0] || 0);

    // These are conservative engineering gates, not fundamental constants. Their
    // identity is returned so callers cannot mistake them for a law of nature.
    const weakFieldPotentialLimit = finite(context.validityThresholds?.dimensionlessPotentialMax)
      ? Number(context.validityThresholds.dimensionlessPotentialMax) : 1e-2;
    const compactnessRatioMin = finite(context.validityThresholds?.schwarzschildRatioMin)
      ? Number(context.validityThresholds.schwarzschildRatioMin) : 100;
    const slowMotionBetaMax = finite(context.validityThresholds?.sourceBetaMax)
      ? Number(context.validityThresholds.sourceBetaMax) : 1e-2;

    const weakFieldApproximation = dimensionlessPotentialDepth < weakFieldPotentialLimit && minimumSchwarzschildRadiusRatio > compactnessRatioMin;
    const slowSourceMotion = sourceMotionKnown ? maxSourceBeta < slowMotionBetaMax : null;
    const pointMassApproximation = pointMassKnown ? pointMassValid : null;
    if (!weakFieldApproximation) notes.push('Weak-field engineering gate failed; use a relativistic field model before transit certification.');
    if (slowSourceMotion === false) notes.push('Slow-source-motion engineering gate failed; post-Newtonian or numerical-relativity treatment is required.');
    if (pointMassApproximation === null) notes.push('At least one source lacks a physical radius; exterior point-mass validity cannot be fully certified.');
    if (slowSourceMotion === null) notes.push('At least one source lacks a velocity record; slow-motion validity remains unresolved.');
    if (!anyAngularMomentum) notes.push('No source angular momentum supplied; frame-dragging output remains unresolved rather than zero.');

    let status = 'RESOLVED';
    if (hardInvalid || weakFieldApproximation === false || slowSourceMotion === false || pointMassApproximation === false) status = 'OUTSIDE_MODEL_VALIDITY';
    else if (slowSourceMotion === null || pointMassApproximation === null) status = 'PARTIAL';

    return {
      schemaVersion: '1.0.0',
      status,
      referenceFrame: String(context.referenceFrame || 'declared weak-field coordinate frame'),
      fieldPoint,
      sources: copy(sources),
      metrics: {
        potentialM2PerS2: relativePotential,
        rawPotentialZeroAtInfinityM2PerS2: rawPotential,
        potentialReferenceM2PerS2: referencePotential,
        accelerationMPerS2: acceleration,
        accelerationMagnitudeMPerS2: magnitude(acceleration),
        tidalTensorPerS2: tidal,
        principalTidalEigenvaluesPerS2: eigenvalues,
        tidalFrobeniusPerS2: frobenius(tidal),
        maxTidalEigenvaluePerS2: maxAbsEigenvalue,
        minimumSchwarzschildRadiusRatio: Number.isFinite(minimumSchwarzschildRadiusRatio) ? minimumSchwarzschildRadiusRatio : null,
        maxSingleSourceKretschmannPerM4: maxKretschmann,
        maxSingleSourceCurvatureScalePerM2: Math.sqrt(maxKretschmann),
        lenseThirringRadPerS: anyAngularMomentum ? lenseThirring : null,
        dimensionlessPotentialDepth
      },
      validity: {
        weakFieldApproximation,
        slowSourceMotion,
        pointMassApproximation,
        thresholds: {
          status: 'PROPOSED_ENGINEERING_GATE',
          dimensionlessPotentialMax: weakFieldPotentialLimit,
          schwarzschildRatioMin: compactnessRatioMin,
          sourceBetaMax: slowMotionBetaMax
        },
        notes
      },
      uncertainty: context.uncertainty ? copy(context.uncertainty) : null,
      sourceDiagnostics,
      provenance: [
        {role: 'registry', source: REGISTRY_URL, status: registry.status},
        {role: 'primary-authority', source: registry.authority.primary, status: 'AUTHORITY'},
        {role: 'design-intent', source: registry.authority.designIntentSource.title, documentId: registry.authority.designIntentSource.documentId, revisionId: registry.authority.designIntentSource.revisionId, status: 'SOURCE'},
        {role: 'physical-model', status: 'DERIVED', model: 'weak-field Newtonian potential/acceleration/tidal tensor with single-source Schwarzschild curvature diagnostics'},
        {role: 'reference-potential', status: finite(context.potentialReferenceM2PerS2) ? 'INPUT' : 'MODEL_CONVENTION', valueM2PerS2: referencePotential, note: finite(context.potentialReferenceM2PerS2) ? 'Caller-supplied reference.' : 'Zero-at-infinity convention for the isolated point-source weak-field model.'}
      ]
    };
  }

  root.BlacklightExoFTLCurvatureEnvironment = Object.freeze({
    registryUrl: REGISTRY_URL,
    constants: Object.freeze({G_m3KgS2: G, c_mPerS: C}),
    loadRegistry,
    resolveFTLCurvatureEnvironment
  });
})(typeof window !== 'undefined' ? window : globalThis);
