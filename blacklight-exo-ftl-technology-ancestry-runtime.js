(function (root) {
  'use strict';

  const REGISTRY_URL = 'data/exo-vessel/ftl-technology-ancestry-registry.json';
  const VALID_PROVENANCE = new Set(['CONFIRMED', 'DERIVED', 'PROPOSED', 'UNRESOLVED']);
  let registryPromise = null;

  function copy(value) {
    return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
  }

  function key(value) {
    return String(value || '').trim().toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  }

  function finite(value) {
    return value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value));
  }

  async function loadRegistry() {
    if (!registryPromise) {
      registryPromise = fetch(REGISTRY_URL, {cache: 'no-store'})
        .then(response => {
          if (!response.ok) throw new Error(`FTL technology ancestry registry load failed: ${response.status}`);
          return response.json();
        })
        .then(registry => {
          if (!registry || registry.registryKey !== 'blacklight.ftl.technology-ancestry') throw new Error('Invalid FTL technology ancestry registry identity.');
          return registry;
        });
    }
    return registryPromise;
  }

  function normalizeOrigin(origin, index, registry) {
    const mode = key(origin?.originMode || 'UNKNOWN');
    const provenanceStatus = key(origin?.provenanceStatus || 'UNRESOLVED');
    return {
      originId: String(origin?.originId || `origin-${index + 1}`),
      originMode: registry.originModes[mode] ? mode : 'UNKNOWN',
      technologyBasis: origin?.technologyBasis ? key(origin.technologyBasis) : null,
      namedSource: origin?.namedSource || null,
      manufacturer: origin?.manufacturer || null,
      provenanceStatus: VALID_PROVENANCE.has(provenanceStatus) ? provenanceStatus : 'UNRESOLVED',
      sourceRefs: Array.isArray(origin?.sourceRefs) ? [...origin.sourceRefs] : [],
      roles: Array.isArray(origin?.roles) ? [...origin.roles] : [],
      interfacePacket: origin?.interfacePacket && typeof origin.interfacePacket === 'object' ? copy(origin.interfacePacket) : null
    };
  }

  function basisResolution(origins) {
    const confirmed = [...new Set(origins.filter(o => o.provenanceStatus === 'CONFIRMED' && o.technologyBasis).map(o => o.technologyBasis))];
    const derived = [...new Set(origins.filter(o => o.provenanceStatus === 'DERIVED' && o.technologyBasis).map(o => o.technologyBasis))];
    if (confirmed.length === 1) return {status: 'CONFIRMED_SINGLE', bases: confirmed, selectedBasis: confirmed[0]};
    if (confirmed.length > 1) return {status: 'CONFIRMED_MULTI', bases: confirmed, selectedBasis: null};
    if (derived.length) return {status: 'DERIVED_CANDIDATE', bases: derived, selectedBasis: null};
    return {status: 'UNRESOLVED', bases: [], selectedBasis: null};
  }

  function ancestryClass(origins, basis) {
    if (!origins.length || origins.every(o => o.provenanceStatus === 'UNRESOLVED')) return 'UNRESOLVED';
    if (origins.some(o => o.originMode === 'REVERSE_ENGINEERED')) return 'REVERSE_ENGINEERED_LINEAGE';
    if (basis.status === 'CONFIRMED_MULTI') return 'MULTI_BASIS';
    if (origins.length > 1) return 'MULTI_ORIGIN';
    return 'SINGLE_ORIGIN';
  }

  function interfaceMetrics(context) {
    const p = context?.interfacePhysics || {};
    const out = {
      status: 'UNRESOLVED',
      controlCoordination: null,
      clockCoherence: null,
      thermalCompatibility: null,
      powerMargin: null,
      recoveryCutSet: null,
      warnings: []
    };

    const present = [];
    if ([p.interfaceLength, p.signalVelocity, p.responseTime].every(finite) && Number(p.signalVelocity) > 0 && Number(p.responseTime) > 0) {
      out.controlCoordination = Number(p.interfaceLength) / (Number(p.signalVelocity) * Number(p.responseTime));
      present.push('controlCoordination');
    }
    if ([p.clockJitter, p.phaseWindow].every(finite) && Number(p.phaseWindow) > 0) {
      out.clockCoherence = Number(p.clockJitter) / Number(p.phaseWindow);
      present.push('clockCoherence');
    }
    if (Array.isArray(p.thermalDomains) && p.thermalDomains.length) {
      const margins = p.thermalDomains.filter(d => [d.operating, d.minimum, d.maximum, d.referenceSpan].every(finite) && Number(d.referenceSpan) > 0)
        .map(d => Math.min((Number(d.maximum) - Number(d.operating)) / Number(d.referenceSpan), (Number(d.operating) - Number(d.minimum)) / Number(d.referenceSpan)));
      if (margins.length === p.thermalDomains.length) {
        out.thermalCompatibility = Math.min(...margins);
        present.push('thermalCompatibility');
      }
    }
    if ([p.powerAvailable, p.powerNominal, p.powerRecoveryReserved].every(finite) && Math.abs(Number(p.powerNominal)) > 0) {
      out.powerMargin = (Number(p.powerAvailable) - Number(p.powerNominal) - Number(p.powerRecoveryReserved)) / Math.abs(Number(p.powerNominal));
      present.push('powerMargin');
    }
    if (Array.isArray(p.recoveryCutSets) && p.recoveryCutSets.length && p.recoveryCutSets.every(finite)) {
      out.recoveryCutSet = Math.min(...p.recoveryCutSets.map(Number));
      present.push('recoveryCutSet');
    }

    out.status = present.length === 5 ? 'RESOLVED' : present.length ? 'PARTIAL' : 'UNRESOLVED';
    if (out.controlCoordination !== null && out.controlCoordination >= 1) out.warnings.push('Interface propagation delay is at or above the commanded response timescale; regional autonomy or slower authority loops are required.');
    if (out.clockCoherence !== null && out.clockCoherence >= 1) out.warnings.push('Timing jitter is at or above the phase/coherence window; coordinated high-authority operation is not certifiable.');
    if (out.thermalCompatibility !== null && out.thermalCompatibility <= 0) out.warnings.push('At least one coupled subsystem is outside its certified thermal/service envelope.');
    if (out.powerMargin !== null && out.powerMargin <= 0) out.warnings.push('Nominal operation consumes protected recovery power or exceeds available supply.');
    if (out.recoveryCutSet !== null && out.recoveryCutSet <= 0) out.warnings.push('At least one required recovery cut-set has no surviving authority.');
    return out;
  }

  function buildProvenance(registry, origins, basis, context) {
    return [
      {role: 'design-intent', source: registry.authority.designIntentSource.title, documentId: registry.authority.designIntentSource.documentId, revisionId: registry.authority.designIntentSource.revisionId, status: 'SOURCE'},
      {role: 'primary-authority', source: registry.authority.primary, status: 'AUTHORITY'},
      ...origins.map(o => ({role: 'technology-origin', originId: o.originId, originMode: o.originMode, technologyBasis: o.technologyBasis, provenanceStatus: o.provenanceStatus, sourceRefs: copy(o.sourceRefs)})),
      {role: 'basis-resolution', status: basis.status, bases: copy(basis.bases), selectedBasis: basis.selectedBasis},
      {role: 'transit-family-boundary', family: context?.transitFamily || 'UNRESOLVED', status: 'INPUT_ONLY', note: 'Technology ancestry does not assign transit family.'}
    ];
  }

  async function resolveFTLTechnologyAncestry(context = {}) {
    const registry = await loadRegistry();
    const origins = Array.isArray(context.origins) ? context.origins.map((o, i) => normalizeOrigin(o, i, registry)) : [];
    const basis = basisResolution(origins);
    const integration = interfaceMetrics(context);
    const warnings = [...registry.canonGuards];

    if (!origins.length) warnings.unshift('No material origin records were supplied; ancestry remains unresolved.');
    if (basis.status === 'CONFIRMED_MULTI') warnings.unshift('Multiple confirmed technology bases materially participate; do not collapse this installation to one race/manufacturer basis.');
    if (basis.status === 'DERIVED_CANDIDATE') warnings.unshift('Only derived basis candidates are available; live auto-selection must remain unresolved.');
    if (origins.some(o => o.originMode === 'UNKNOWN')) warnings.unshift('At least one material subsystem has unknown origin; owner/operator identity may not fill the gap.');

    return {
      status: basis.status === 'UNRESOLVED' ? 'UNRESOLVED' : (basis.status === 'DERIVED_CANDIDATE' ? 'MIXED' : 'READY'),
      registryVersion: registry.schemaVersion,
      ancestryClass: ancestryClass(origins, basis),
      origins,
      basisResolution: basis,
      interfaceBoundaries: copy(registry.integrationModel.interfaces),
      interfaceMetrics: integration,
      autoPopulateTechnologyBasis: basis.status === 'CONFIRMED_SINGLE' ? basis.selectedBasis : null,
      transitFamily: context.transitFamily || 'UNRESOLVED',
      manufacturerContext: context.manufacturerContext || null,
      operatorContext: context.operatorContext || null,
      provenance: buildProvenance(registry, origins, basis, context),
      canonWarnings: [...warnings, ...integration.warnings]
    };
  }

  root.BlacklightExoFTLTechnologyAncestry = Object.freeze({
    registryUrl: REGISTRY_URL,
    loadRegistry,
    resolveFTLTechnologyAncestry
  });
})(typeof window !== 'undefined' ? window : globalThis);