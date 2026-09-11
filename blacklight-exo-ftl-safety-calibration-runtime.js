(() => {
  'use strict';

  const STATUS = Object.freeze({
    READY: 'READY',
    UNRESOLVED: 'UNRESOLVED',
    CONFLICT: 'CONFLICT'
  });

  const FAMILIES = Object.freeze([
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

  const PATHS = Object.freeze(['p0', 'p1', 'p2', 'p3', 'p4', 'p5', 'p6']);

  const isObject = (value) => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
  const finite = (value) => value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value));

  function deepClone(value) {
    if (Array.isArray(value)) return value.map(deepClone);
    if (!isObject(value)) return value;
    const out = {};
    Object.entries(value).forEach(([key, child]) => {
      out[key] = deepClone(child);
    });
    return out;
  }

  function deepFreeze(value) {
    if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
    Object.freeze(value);
    Object.getOwnPropertyNames(value).forEach((key) => deepFreeze(value[key]));
    return value;
  }

  function canonicalPath(path) {
    if (path === null || path === undefined) return null;
    const normalized = String(path).trim().toLowerCase();
    return PATHS.includes(normalized) ? normalized : null;
  }

  function validateCoefficientSet(set) {
    if (!isObject(set)) return false;
    return ['a', 'b', 'c', 'n', 'd', 'e', 'k', 'miscalculationAmplification'].every((key) => finite(set[key]));
  }

  function validateProfile(profile) {
    const errors = [];
    if (!isObject(profile)) return {valid: false, errors: ['Profile is not an object.']};
    if (!profile.profileId) errors.push('profileId is required.');
    if (!profile.profileVersion) errors.push('profileVersion is required.');
    ['referenceScales', 'severityWeights', 'familyCoefficients', 'thresholds', 'maturityModifiers'].forEach((key) => {
      if (!isObject(profile[key])) errors.push(`${key} is required.`);
    });

    const referenceKeys = ['potential', 'acceleration', 'tidal', 'curvature', 'massUncertainty'];
    if (isObject(profile.referenceScales)) {
      referenceKeys.forEach((key) => {
        if (!finite(profile.referenceScales[key]) || Number(profile.referenceScales[key]) <= 0) {
          errors.push(`referenceScales.${key} must be a positive finite number.`);
        }
      });
    }

    if (isObject(profile.severityWeights)) {
      referenceKeys.forEach((key) => {
        if (!finite(profile.severityWeights[key]) || Number(profile.severityWeights[key]) < 0) {
          errors.push(`severityWeights.${key} must be a non-negative finite number.`);
        }
      });
    }

    if (isObject(profile.familyCoefficients)) {
      FAMILIES.forEach((family) => {
        if (!validateCoefficientSet(profile.familyCoefficients[family])) {
          errors.push(`familyCoefficients.${family} is incomplete.`);
        }
      });
    }

    if (isObject(profile.maturityModifiers)) {
      PATHS.forEach((path) => {
        const m = profile.maturityModifiers[path];
        if (!isObject(m)) {
          errors.push(`maturityModifiers.${path} is required.`);
          return;
        }
        ['lookaheadFactor', 'covarianceFactor', 'recoveryFactor', 'redundancyFactor'].forEach((key) => {
          if (!finite(m[key]) || Number(m[key]) <= 0) errors.push(`maturityModifiers.${path}.${key} must be positive.`);
        });
      });
    }

    return {valid: errors.length === 0, errors};
  }

  function selectProfile(registry, requestedProfileId, requestedProfileVersion) {
    if (!registry || !Array.isArray(registry.profiles)) {
      return {profile: null, status: STATUS.UNRESOLVED, reason: 'Calibration registry is missing profiles.'};
    }
    const id = requestedProfileId || registry.selectionRules?.defaultProfileId;
    if (!id) return {profile: null, status: STATUS.UNRESOLVED, reason: 'No profile ID requested and registry has no default.'};

    const candidates = registry.profiles.filter((profile) => profile.profileId === id);
    if (!candidates.length) return {profile: null, status: STATUS.UNRESOLVED, reason: `Calibration profile not found: ${id}`};

    if (requestedProfileVersion) {
      const exact = candidates.find((profile) => profile.profileVersion === requestedProfileVersion);
      return exact
        ? {profile: exact, status: STATUS.READY, reason: null}
        : {profile: null, status: STATUS.UNRESOLVED, reason: `Calibration profile ${id}@${requestedProfileVersion} not found.`};
    }

    if (candidates.length > 1) {
      return {profile: null, status: STATUS.CONFLICT, reason: `Multiple versions of ${id} exist; an explicit version is required for deterministic replay.`};
    }
    return {profile: candidates[0], status: STATUS.READY, reason: null};
  }

  function deepMerge(target, source) {
    if (!isObject(source)) return target;
    Object.entries(source).forEach(([key, value]) => {
      if (isObject(value)) {
        target[key] = deepMerge(isObject(target[key]) ? target[key] : {}, value);
      } else if (value !== undefined) {
        target[key] = deepClone(value);
      }
    });
    return target;
  }

  function resolveNamedOverrides(profile, context = {}) {
    const requestedIds = new Set(Array.isArray(context.namedOverrideIds) ? context.namedOverrideIds : []);
    const embedded = Array.isArray(profile.namedOverrides) ? profile.namedOverrides : [];
    const external = Array.isArray(context.namedOverrides) ? context.namedOverrides : [];
    const candidates = [...embedded, ...external].filter((override) => {
      if (!override || !override.overrideId) return false;
      if (requestedIds.size) return requestedIds.has(override.overrideId);
      return Boolean(override.autoApply === true);
    });

    const applied = [];
    const ignored = [];
    const warnings = [];
    let conflict = false;
    let unresolved = false;
    let output = deepClone(profile);

    candidates
      .sort((a, b) => Number(b.authorityRank || 0) - Number(a.authorityRank || 0))
      .forEach((override) => {
        if (override.status === 'UNRESOLVED') {
          unresolved = true;
          ignored.push(override.overrideId);
          warnings.push(`${override.overrideId}: named-source calibration remains unresolved; generic coefficients were not promoted to named canon.`);
          return;
        }
        if (!['CONFIRMED', 'DERIVED', 'PROPOSED'].includes(override.status)) {
          ignored.push(override.overrideId);
          warnings.push(`${override.overrideId}: unsupported override status ${override.status}.`);
          return;
        }
        if (!isObject(override.values) || !Object.keys(override.values).length) {
          ignored.push(override.overrideId);
          warnings.push(`${override.overrideId}: no values supplied.`);
          return;
        }
        if (applied.length && Number(override.authorityRank || 0) === Number(applied[applied.length - 1].authorityRank || 0)) {
          const previous = applied[applied.length - 1];
          if (JSON.stringify(previous.values) !== JSON.stringify(override.values)) {
            conflict = true;
            warnings.push(`${override.overrideId}: conflicts with equally ranked override ${previous.overrideId}; deterministic merge refused.`);
            ignored.push(override.overrideId);
            return;
          }
        }
        output = deepMerge(output, override.values);
        applied.push(override);
      });

    return {profile: output, applied, ignored, warnings, conflict, unresolved};
  }

  function buildProfileIdentity(profile) {
    return {
      profileId: profile.profileId,
      profileVersion: profile.profileVersion,
      status: profile.status,
      canonReach: profile.scope?.canonReach || null
    };
  }

  function buildCertificationCalibration(profile, context = {}) {
    const path = canonicalPath(context.path);
    const maturityModifier = path ? deepClone(profile.maturityModifiers?.[path] || null) : null;
    return {
      profileId: profile.profileId,
      profileVersion: profile.profileVersion,
      status: profile.status,
      referenceScales: deepClone(profile.referenceScales),
      severityWeights: deepClone(profile.severityWeights),
      familyCoefficients: deepClone(profile.familyCoefficients),
      thresholds: deepClone(profile.thresholds),
      maturityModifier,
      scalingModel: deepClone(profile.scalingModel),
      provenance: [
        ...(Array.isArray(profile.provenance) ? profile.provenance : []),
        ...(Array.isArray(context.provenance) ? context.provenance : [])
      ],
      calibrationPolicy: profile.authority?.coefficientPolicy || null
    };
  }

  function resolveFTLSafetyCalibrationProfile(context = {}) {
    const selected = selectProfile(context.registry, context.requestedProfileId, context.requestedProfileVersion);
    if (!selected.profile) {
      return deepFreeze({
        status: selected.status,
        profile: null,
        profileIdentity: null,
        appliedOverrides: [],
        ignoredOverrides: [],
        maturityModifier: null,
        warnings: [selected.reason],
        provenance: Array.isArray(context.provenance) ? [...context.provenance] : []
      });
    }

    const initialValidation = validateProfile(selected.profile);
    if (!initialValidation.valid) {
      return deepFreeze({
        status: STATUS.UNRESOLVED,
        profile: null,
        profileIdentity: buildProfileIdentity(selected.profile),
        appliedOverrides: [],
        ignoredOverrides: [],
        maturityModifier: null,
        warnings: initialValidation.errors,
        provenance: Array.isArray(selected.profile.provenance) ? [...selected.profile.provenance] : []
      });
    }

    const overrideResolution = resolveNamedOverrides(selected.profile, context);
    if (overrideResolution.conflict) {
      return deepFreeze({
        status: STATUS.CONFLICT,
        profile: null,
        profileIdentity: buildProfileIdentity(selected.profile),
        appliedOverrides: overrideResolution.applied.map((x) => x.overrideId),
        ignoredOverrides: overrideResolution.ignored,
        maturityModifier: null,
        warnings: overrideResolution.warnings,
        provenance: Array.isArray(selected.profile.provenance) ? [...selected.profile.provenance] : []
      });
    }

    const finalValidation = validateProfile(overrideResolution.profile);
    if (!finalValidation.valid) {
      return deepFreeze({
        status: STATUS.UNRESOLVED,
        profile: null,
        profileIdentity: buildProfileIdentity(selected.profile),
        appliedOverrides: overrideResolution.applied.map((x) => x.overrideId),
        ignoredOverrides: overrideResolution.ignored,
        maturityModifier: null,
        warnings: [...overrideResolution.warnings, ...finalValidation.errors],
        provenance: Array.isArray(selected.profile.provenance) ? [...selected.profile.provenance] : []
      });
    }

    const calibration = buildCertificationCalibration(overrideResolution.profile, context);
    const path = canonicalPath(context.path);
    const warnings = [...overrideResolution.warnings];
    if (context.path && !path) warnings.push(`Unknown Path maturity: ${context.path}; no maturity modifier applied.`);
    if (overrideResolution.unresolved) warnings.push('At least one requested named-source override remains unresolved. Generic coefficients remain simulation-only for that named scope.');

    return deepFreeze({
      status: overrideResolution.unresolved ? STATUS.UNRESOLVED : STATUS.READY,
      profile: calibration,
      profileIdentity: buildProfileIdentity(overrideResolution.profile),
      appliedOverrides: overrideResolution.applied.map((x) => x.overrideId),
      ignoredOverrides: overrideResolution.ignored,
      maturityModifier: calibration.maturityModifier,
      warnings,
      provenance: calibration.provenance
    });
  }

  globalThis.BlacklightExoFTLSafetyCalibrationRuntime = deepFreeze({
    STATUS,
    FAMILIES,
    PATHS,
    validateProfile,
    resolveFTLSafetyCalibrationProfile,
    buildCertificationCalibration
  });
})();
