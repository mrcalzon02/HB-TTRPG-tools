(function (root) {
  'use strict';

  const REGISTRY_URL = 'data/exo-vessel/ftl-control-embodiment-registry.json';
  const REQUIRED_CHANNELS = [
    'gravity_environment',
    'calculation_uncertainty',
    'actionable_lookahead',
    'protected_recovery',
    'hazard_observability'
  ];

  let registryPromise = null;

  function copy(value) {
    if (value === undefined) return undefined;
    return JSON.parse(JSON.stringify(value));
  }

  function normalizedKey(value) {
    return String(value || '')
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
  }

  async function loadRegistry() {
    if (!registryPromise) {
      registryPromise = fetch(REGISTRY_URL, { cache: 'no-store' })
        .then((response) => {
          if (!response.ok) throw new Error(`FTL control embodiment registry load failed: ${response.status}`);
          return response.json();
        })
        .then((registry) => {
          validateRegistry(registry);
          return registry;
        });
    }
    return registryPromise;
  }

  function validateRegistry(registry) {
    if (!registry || registry.registryKey !== 'blacklight.ftl.control-embodiment') {
      throw new Error('Invalid FTL control embodiment registry identity.');
    }

    const channels = new Set((registry.invariantSafetyChannels || []).map((entry) => entry.key));
    for (const key of REQUIRED_CHANNELS) {
      if (!channels.has(key)) throw new Error(`Missing invariant safety channel: ${key}`);
    }

    if (!registry.technologyBases || Object.keys(registry.technologyBases).length < 7) {
      throw new Error('FTL control embodiment registry must define the seven operative technology bases.');
    }
  }

  function mergeArrays(base, override) {
    const values = [];
    for (const item of [...(base || []), ...(override || [])]) {
      if (!values.includes(item)) values.push(item);
    }
    return values;
  }

  function mergeEmbodiment(base, named) {
    if (!named) return copy(base);
    const merged = copy(base || {});
    const arrayFields = [
      'navigationRepresentation',
      'sensorArchitecture',
      'controlArchitecture',
      'abortEmbodiment',
      'maintenanceDoctrine',
      'failureSignatures',
      'serviceEnvironment',
      'generatorRules'
    ];

    for (const field of arrayFields) {
      merged[field] = mergeArrays(base && base[field], named[field]);
    }

    merged.status = named.status || merged.status;
    merged.sourceStatus = named.sourceStatus || null;
    merged.transitFamilyStatus = named.transitFamilyStatus || null;
    merged.sourcePaths = copy(named.sourcePaths || []);
    merged.humanInteroperability = named.humanInteroperability || merged.humanInteroperability || 'UNRESOLVED';
    return merged;
  }

  function familyStatus(context, namedProfile) {
    const requestedFamily = String(context.transitFamily || '').trim();
    const namedFamilyStatus = namedProfile && String(namedProfile.transitFamilyStatus || '').toUpperCase();

    if (namedFamilyStatus === 'UNRESOLVED') {
      if (!requestedFamily || normalizedKey(requestedFamily) === 'UNRESOLVED') {
        return {
          family: 'UNRESOLVED',
          source: 'named-profile',
          status: 'UNRESOLVED',
          hypotheticalAssociation: false
        };
      }

      return {
        family: requestedFamily,
        source: 'caller/scenario',
        status: 'MIXED',
        hypotheticalAssociation: true
      };
    }

    return {
      family: requestedFamily || 'UNRESOLVED',
      source: requestedFamily ? 'caller-or-upstream-authority' : 'unresolved',
      status: requestedFamily ? 'RESOLVED_INPUT' : 'UNRESOLVED',
      hypotheticalAssociation: false
    };
  }

  function scalingGuidance(registry, context) {
    const scale = normalizedKey(context.vesselScale || 'UNSPECIFIED');
    const path = String(context.pathLevel || 'UNSPECIFIED');
    const condition = String(context.condition || 'nominal');

    return {
      status: registry.scalingModel.status,
      principle: registry.scalingModel.principle,
      variables: copy(registry.scalingModel.variables),
      vesselScale: scale,
      pathLevel: path,
      condition,
      requirements: [
        'Increase regional control segmentation as coordination distance and actuator count grow.',
        'Increase independent sensor ancestry before increasing high-authority transit envelope.',
        'Keep protected recovery authority regional enough that one casualty cannot consume the final escape path.',
        'Scale maintenance access and service-environment isolation with installation span and failure-domain count.',
        'Do not infer linear power, safety or maintenance scaling from vessel mass.'
      ]
    };
  }

  function buildProvenance(registry, basisKey, namedKey, family) {
    const provenance = [
      {
        role: 'design-intent',
        source: registry.designIntentSource.title,
        documentId: registry.designIntentSource.documentId,
        revisionId: registry.designIntentSource.revisionId,
        status: 'SOURCE'
      },
      {
        role: 'primary-authority',
        source: registry.authority.primary,
        status: 'AUTHORITY'
      },
      {
        role: 'technology-basis',
        source: registry.authority.technologyBasis,
        key: basisKey,
        status: 'DERIVED'
      }
    ];

    if (namedKey) {
      provenance.push({
        role: 'named-profile',
        key: namedKey,
        status: 'MIXED'
      });
    }

    provenance.push({
      role: 'transit-family-association',
      family: family.family,
      source: family.source,
      status: family.status,
      hypotheticalAssociation: family.hypotheticalAssociation
    });

    return provenance;
  }

  function canonWarnings(registry, context, namedKey, family) {
    const warnings = copy(registry.canonGuards || []);

    if (namedKey && family.hypotheticalAssociation) {
      warnings.unshift(
        `${namedKey} has no confirmed transit-family assignment in this registry; ${family.family} is a caller/scenario-selected hypothetical association and must remain MIXED provenance.`
      );
    }

    if (normalizedKey(context.namedProfile) === 'ZWLEI_MURREK') {
      warnings.unshift('Do not normalize source-local gravitic slipstream terminology into Gravitational-Plane or Hyperspatial Slipstream solely from vocabulary.');
    }

    if (normalizedKey(context.namedProfile) === 'ARNOCK') {
      warnings.unshift('Do not infer an Ar\'nock transit family or universal organic construction from biological-symbiotic evidence.');
    }

    return warnings;
  }

  async function resolveFTLControlEmbodiment(context = {}) {
    const registry = await loadRegistry();
    const basisKey = normalizedKey(context.technologyBasis);
    const namedKey = normalizedKey(context.namedProfile);
    const base = registry.technologyBases[basisKey];
    const named = namedKey ? registry.namedProfiles[namedKey] : null;

    if (!base) {
      return {
        status: 'UNRESOLVED',
        reason: `Unknown or missing technology basis: ${context.technologyBasis || '(none)'}`,
        availableTechnologyBases: Object.keys(registry.technologyBases),
        canonWarnings: copy(registry.canonGuards)
      };
    }

    if (namedKey && !named) {
      return {
        status: 'UNRESOLVED',
        reason: `Unknown named profile: ${context.namedProfile}`,
        resolvedBasis: basisKey,
        availableNamedProfiles: Object.keys(registry.namedProfiles),
        canonWarnings: copy(registry.canonGuards)
      };
    }

    const family = familyStatus(context, named);
    const embodiment = mergeEmbodiment(base, named);
    const invariantSafetyChannels = copy(registry.invariantSafetyChannels);

    return {
      status: family.hypotheticalAssociation ? 'MIXED' : (named ? named.status : base.status),
      registryVersion: registry.schemaVersion,
      resolvedBasis: basisKey,
      namedProfile: namedKey || null,
      namedProfileStatus: named ? named.sourceStatus : null,
      transitFamily: family,
      invariantSafetyChannels,
      navigationRepresentation: embodiment.navigationRepresentation,
      sensorArchitecture: embodiment.sensorArchitecture,
      controlArchitecture: embodiment.controlArchitecture,
      abortEmbodiment: embodiment.abortEmbodiment,
      maintenanceDoctrine: embodiment.maintenanceDoctrine,
      failureSignatures: embodiment.failureSignatures,
      serviceEnvironment: embodiment.serviceEnvironment,
      humanInteroperability: embodiment.humanInteroperability,
      generatorRules: embodiment.generatorRules,
      scaling: scalingGuidance(registry, context),
      manufacturerContext: context.manufacturerContext || null,
      authorityMode: context.authorityMode || 'LABELED_DERIVATION',
      provenance: buildProvenance(registry, basisKey, namedKey || null, family),
      canonWarnings: canonWarnings(registry, context, namedKey, family)
    };
  }

  root.BlackLightFTLControlEmbodiment = Object.freeze({
    registryUrl: REGISTRY_URL,
    loadRegistry,
    resolveFTLControlEmbodiment
  });
})(typeof window !== 'undefined' ? window : globalThis);
