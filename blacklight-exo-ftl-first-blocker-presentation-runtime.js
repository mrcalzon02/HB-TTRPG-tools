(() => {
  'use strict';

  const REGISTRY_URL = 'data/exo-vessel/ftl-first-blocker-presentation-registry.json';
  const BLOCKING = new Set(['REJECTED', 'UNRESOLVED', 'OUTSIDE_MODEL_VALIDITY', 'CONFLICT']);
  let registryPromise = null;

  const deepFreeze = value => {
    if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
    Object.freeze(value);
    Object.values(value).forEach(deepFreeze);
    return value;
  };

  const finite = value => value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value));
  const numberOrNull = value => finite(value) ? Number(value) : null;
  const unique = values => [...new Set((values || []).filter(value => value !== null && value !== undefined && value !== '').map(String))];

  async function loadRegistry() {
    if (!registryPromise) {
      registryPromise = fetch(REGISTRY_URL, {cache: 'no-store'}).then(response => {
        if (!response.ok) throw new Error(`Unable to load ${REGISTRY_URL}: HTTP ${response.status}`);
        return response.json();
      }).catch(error => {
        registryPromise = null;
        throw error;
      });
    }
    return registryPromise;
  }

  function efficiency(segment, key) {
    const response = segment?.certificate?.familyResponse || {};
    return numberOrNull(response[key]);
  }

  function environmentSummary(segment) {
    const packet = segment?.environmentPacket;
    if (!packet || typeof packet !== 'object') return null;
    return {
      potentialDepthNormalized: numberOrNull(packet.potentialDepthNormalized ?? packet.gravityPotentialNormalized),
      accelerationNormalized: numberOrNull(packet.accelerationNormalized ?? packet.gravityAccelerationNormalized),
      tidalNormalized: numberOrNull(packet.tidalNormalized ?? packet.tidalTensorNormalized),
      curvatureNormalized: numberOrNull(packet.curvatureNormalized ?? packet.curvatureScaleNormalized),
      massModelUncertaintyNormalized: numberOrNull(packet.massModelUncertaintyNormalized ?? packet.uncertaintyNormalized),
      familyBoundaryHazard: numberOrNull(packet.familyBoundaryHazard),
      sourceStatus: packet.status || null
    };
  }

  function uncertaintySummary(segment) {
    const packet = segment?.uncertaintyPacket;
    if (!packet || typeof packet !== 'object') return null;
    const covariance = packet.covariance || packet.diagonalCovariance || null;
    return {
      status: packet.status || null,
      trace: numberOrNull(packet.trace ?? packet.covarianceTrace),
      covariance,
      provenance: unique(packet.provenance)
    };
  }

  function normalizedSegment(segment) {
    const start = numberOrNull(segment?.fractionStart);
    const end = numberOrNull(segment?.fractionEnd);
    if (start === null || end === null || start < 0 || end > 1 || end < start) {
      throw new Error(`Invalid route fractions for segment ${segment?.index ?? 'unknown'}.`);
    }
    const status = segment?.status || 'UNRESOLVED';
    return {
      index: Number.isInteger(segment?.index) ? segment.index : 0,
      fractionStart: start,
      fractionEnd: end,
      fractionSpan: end - start,
      status,
      blocking: BLOCKING.has(status),
      reasons: unique(segment?.reasons),
      gravityEfficiency: efficiency(segment, 'gravityEfficiency'),
      calculationEfficiency: efficiency(segment, 'calculationEfficiency'),
      interventionReachable: segment?.interventionReach?.reachable ?? null,
      interventionReach: segment?.interventionReach || null,
      environment: environmentSummary(segment),
      uncertainty: uncertaintySummary(segment),
      provenance: unique(segment?.provenance)
    };
  }

  function certifiedFirstBlocker(packet, segments) {
    const disposition = packet?.routeDisposition || {};
    const namedIndex = Number.isInteger(disposition.firstBlockingSegmentIndex) ? disposition.firstBlockingSegmentIndex : null;
    const named = namedIndex === null ? null : segments.find(segment => segment.index === namedIndex) || null;
    const calculated = segments.filter(segment => segment.blocking).sort((a, b) => a.fractionStart - b.fractionStart || a.index - b.index)[0] || null;
    const conflict = named && calculated && named.index !== calculated.index;
    return {named, calculated, selected: named || calculated, conflict};
  }

  function conservativeSummary(disposition) {
    const source = disposition?.conservativeBlocker;
    if (!source || typeof source !== 'object') return null;
    const applicability = source.applicabilityResolution || null;
    return {
      source: source.source || null,
      hazardKey: source.hazardKey || null,
      applicableToCertifiedBlocker: source.applicableToCertifiedBlocker === true,
      applicabilityStatus: source.applicabilityStatus || applicability?.status || null,
      applicabilityRelationship: source.applicabilityRelationship || applicability?.relationship || null,
      applicabilityRecordId: source.applicabilityRecordId || applicability?.record?.recordId || null,
      applicabilityScopeType: applicability?.scopeResolution?.selectedScopeType || null,
      applicabilitySourceTitle: applicability?.record?.source?.title || null,
      applicabilitySourceDocumentId: applicability?.record?.source?.documentId || null,
      applicabilitySourceRevisionId: applicability?.record?.source?.revisionId || null,
      familyMatch: source.familyMatch === true,
      nominalBlockingFraction: numberOrNull(source.nominalBlockingFraction),
      nominalTopologyBoundaryFraction: numberOrNull(source.nominalTopologyBoundaryFraction),
      earliestPlausibleTopologyBoundaryFraction: numberOrNull(source.earliestPlausibleTopologyBoundaryFraction),
      boundaryFractionSigmaUpperBound: numberOrNull(source.boundaryFractionSigmaUpperBound),
      effectiveBlockingFraction: numberOrNull(source.effectiveBlockingFraction),
      nominalDistanceM: numberOrNull(disposition.nominalDistanceToFirstBlockingSegmentM),
      effectiveDistanceM: numberOrNull(disposition.distanceToFirstBlockingSegmentM),
      nominalTimeS: numberOrNull(disposition.nominalTimeToFirstBlockingSegmentS),
      effectiveTimeS: numberOrNull(disposition.timeToFirstBlockingSegmentS),
      interventionReachable: disposition.interventionReachable ?? source.interventionReachable ?? null,
      reason: source.reason || null,
      provenance: unique([...(source.provenance || []), ...(applicability?.provenance || [])])
    };
  }

  async function resolveFTLFirstBlockerPresentation(context = {}) {
    const registry = context.registry || await loadRegistry();
    const packet = context.familySegmentCertification || context.packet;
    if (!packet || !Array.isArray(packet.segments)) throw new Error('familySegmentCertification with segment certificates is required.');

    const segments = packet.segments.map(normalizedSegment).sort((a, b) => a.fractionStart - b.fractionStart || a.index - b.index);
    const first = certifiedFirstBlocker(packet, segments);
    const disposition = packet.routeDisposition || {};
    const conservative = conservativeSummary(disposition);
    const warnings = unique([
      ...(packet.warnings || []),
      first.conflict ? 'Route disposition and segment ordering disagree about the first blocking interval. Presentation is marked CONFLICT rather than choosing silently.' : null,
      conservative && conservative.applicabilityStatus === 'CONFLICT' ? 'Topology-hazard applicability authority is conflicting; presentation retains the nominal blocker.' : null,
      conservative && conservative.applicabilityStatus === 'UNRESOLVED' ? 'Topology-hazard applicability is unresolved; topology evidence is displayed without blocker promotion.' : null,
      conservative && !conservative.applicableToCertifiedBlocker ? 'Topology-boundary uncertainty is shown as evidence only; it has not been authorized by a REQUIRED_PHYSICAL_PRECURSOR relationship to move the certified blocker.' : null
    ]);
    const status = first.conflict ? 'CONFLICT' : (packet.status || disposition.worstStatus || 'UNRESOLVED');
    const firstBlocker = first.selected ? {
      segmentIndex: first.selected.index,
      fractionStart: first.selected.fractionStart,
      fractionEnd: first.selected.fractionEnd,
      status: first.selected.status,
      distanceM: numberOrNull(disposition.distanceToFirstBlockingSegmentM),
      timeS: numberOrNull(disposition.timeToFirstBlockingSegmentS),
      nominalDistanceM: numberOrNull(disposition.nominalDistanceToFirstBlockingSegmentM ?? disposition.distanceToFirstBlockingSegmentM),
      nominalTimeS: numberOrNull(disposition.nominalTimeToFirstBlockingSegmentS ?? disposition.timeToFirstBlockingSegmentS),
      interventionReachable: disposition.interventionReachable ?? first.selected.interventionReachable ?? null,
      conservativeEnvelope: conservative,
      reasons: first.selected.reasons,
      gravityEfficiency: first.selected.gravityEfficiency,
      calculationEfficiency: first.selected.calculationEfficiency,
      environment: first.selected.environment,
      uncertainty: first.selected.uncertainty
    } : null;

    return deepFreeze({
      schemaVersion: '1.2.0',
      status,
      family: packet.family || null,
      path: packet.path || null,
      corridor: {
        conjunctive: true,
        segmentCount: segments.length,
        blockingSegmentCount: segments.filter(segment => segment.blocking).length,
        segments
      },
      firstBlocker,
      presentationRules: registry.presentationRules || [],
      warnings,
      provenance: unique([REGISTRY_URL, ...(conservative?.provenance || []), ...(packet.provenance || [])]),
      canonSafeguards: registry.canonSafeguards || []
    });
  }

  globalThis.BlacklightExoFTLFirstBlockerPresentationRuntime = deepFreeze({
    REGISTRY_URL,
    BLOCKING_STATES: [...BLOCKING],
    loadRegistry,
    resolveFTLFirstBlockerPresentation
  });
})();
