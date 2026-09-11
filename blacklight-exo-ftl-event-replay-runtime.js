(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.BlacklightFTLEventReplay = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var VERSION = '1.0.0';
  var VALID_STATUS = new Set(['CONFIRMED', 'DERIVED', 'PROPOSED', 'UNRESOLVED', 'MIXED']);
  var VALID_EVENTS = new Set([
    'CASE_INITIALIZED',
    'PASSIVE_MEASUREMENT',
    'CALIBRATION_RECORDED',
    'ACCESS_CHANGED',
    'SAMPLE_COLLECTED',
    'LOW_AUTHORITY_TEST',
    'ABORT_TRIGGERED',
    'REPAIR_OR_REGROWTH',
    'TRANSLATION_REVISED',
    'EVIDENCE_SUPERSEDED',
    'FAMILY_HYPOTHESIS_UPDATED',
    'RECERTIFICATION_RECORDED'
  ]);
  var FAMILIES = Object.freeze([
    'metric-compression',
    'gravitational-plane-skimmer',
    'slipstream-shear',
    'q-lattice',
    'n-manifold',
    'fold-jump',
    'wormhole-gate',
    'phase-displacement'
  ]);

  function clone(value) {
    if (value === undefined) return undefined;
    return JSON.parse(JSON.stringify(value));
  }

  function canonicalize(value) {
    if (value === null || typeof value !== 'object') return JSON.stringify(value);
    if (Array.isArray(value)) return '[' + value.map(canonicalize).join(',') + ']';
    var keys = Object.keys(value).sort();
    return '{' + keys.map(function (key) {
      return JSON.stringify(key) + ':' + canonicalize(value[key]);
    }).join(',') + '}';
  }

  // Deterministic integrity checksum for replay mutation detection. This is not a
  // cryptographic signature and must never be presented as provenance proof.
  function fnv1a32(text) {
    var hash = 0x811c9dc5;
    for (var i = 0; i < text.length; i += 1) {
      hash ^= text.charCodeAt(i);
      hash = Math.imul(hash, 0x01000193) >>> 0;
    }
    return ('00000000' + hash.toString(16)).slice(-8);
  }

  function eventDigest(previousDigest, event) {
    var stripped = clone(event);
    delete stripped.eventDigest;
    delete stripped.previousEventDigest;
    return fnv1a32(String(previousDigest || 'GENESIS') + '|' + canonicalize(stripped));
  }

  function createInitialState(caseId, seed) {
    seed = seed || {};
    return {
      runtimeVersion: VERSION,
      caseId: String(caseId || seed.caseId || ''),
      currentEpoch: Number.isInteger(seed.currentEpoch) ? seed.currentEpoch : 0,
      lastSequence: Number.isInteger(seed.lastSequence) ? seed.lastSequence : -1,
      eventCount: Number.isInteger(seed.eventCount) ? seed.eventCount : 0,
      eventDigest: seed.eventDigest || 'GENESIS',
      observations: clone(seed.observations || []),
      instrumentInstances: clone(seed.instrumentInstances || {}),
      compartments: clone(seed.compartments || {}),
      serviceEdges: clone(seed.serviceEdges || []),
      unknownVolumes: clone(seed.unknownVolumes || []),
      telemetry: clone(seed.telemetry || []),
      interventions: clone(seed.interventions || []),
      familyHypotheses: clone(seed.familyHypotheses || FAMILIES.map(function (family) {
        return { family: family, state: 'ADMISSIBLE', support: null, status: 'DERIVED' };
      })),
      familyState: clone(seed.familyState || { classification: 'UNRESOLVED', family: null, status: 'UNRESOLVED' }),
      provenanceGraph: clone(seed.provenanceGraph || { roots: {}, edges: [] }),
      supersessions: clone(seed.supersessions || {}),
      warnings: clone(seed.warnings || []),
      eventIds: clone(seed.eventIds || [])
    };
  }

  function validateEventShape(event) {
    var errors = [];
    var required = ['eventId', 'caseId', 'epoch', 'sequence', 'eventType', 'observedAt', 'authoritySnapshot', 'provenanceRoots', 'payload', 'status'];
    required.forEach(function (key) {
      if (event == null || event[key] === undefined || event[key] === null) errors.push('Missing required field: ' + key);
    });
    if (event && !VALID_EVENTS.has(event.eventType)) errors.push('Unknown eventType: ' + event.eventType);
    if (event && !VALID_STATUS.has(event.status)) errors.push('Unknown status: ' + event.status);
    if (event && !Number.isInteger(event.epoch)) errors.push('epoch must be an integer');
    if (event && !Number.isInteger(event.sequence)) errors.push('sequence must be an integer');
    if (event && !Array.isArray(event.provenanceRoots)) errors.push('provenanceRoots must be an array');
    return errors;
  }

  function addProvenance(state, event) {
    event.provenanceRoots.forEach(function (rootId) {
      if (!state.provenanceGraph.roots[rootId]) state.provenanceGraph.roots[rootId] = { events: [] };
      if (state.provenanceGraph.roots[rootId].events.indexOf(event.eventId) === -1) {
        state.provenanceGraph.roots[rootId].events.push(event.eventId);
      }
    });
  }

  function applyEvent(state, event, warnings) {
    var payload = event.payload || {};
    switch (event.eventType) {
      case 'CASE_INITIALIZED':
        if (state.eventCount !== 0) warnings.push('CASE_INITIALIZED received after case history already exists.');
        break;
      case 'PASSIVE_MEASUREMENT':
        state.observations.push(clone(payload.observation || payload));
        break;
      case 'CALIBRATION_RECORDED':
        if (payload.instrumentId) state.instrumentInstances[payload.instrumentId] = clone(payload);
        else warnings.push('Calibration event lacks instrumentId; retained in intervention history only.');
        break;
      case 'ACCESS_CHANGED':
        state.interventions.push(clone({ eventId: event.eventId, type: event.eventType, epoch: event.epoch, payload: payload }));
        if (Array.isArray(payload.unknownVolumes)) state.unknownVolumes = clone(payload.unknownVolumes);
        break;
      case 'SAMPLE_COLLECTED':
      case 'LOW_AUTHORITY_TEST':
      case 'ABORT_TRIGGERED':
      case 'REPAIR_OR_REGROWTH':
      case 'RECERTIFICATION_RECORDED':
        state.interventions.push(clone({ eventId: event.eventId, type: event.eventType, epoch: event.epoch, payload: payload }));
        break;
      case 'TRANSLATION_REVISED':
        state.telemetry.push(clone(payload.translation || payload));
        break;
      case 'EVIDENCE_SUPERSEDED':
        if (!payload.supersedesEventId) warnings.push('Supersession event lacks supersedesEventId.');
        else state.supersessions[payload.supersedesEventId] = event.eventId;
        break;
      case 'FAMILY_HYPOTHESIS_UPDATED':
        if (payload.family && FAMILIES.indexOf(payload.family) !== -1) {
          state.familyHypotheses = state.familyHypotheses.map(function (entry) {
            return entry.family === payload.family ? Object.assign({}, entry, clone(payload)) : entry;
          });
        } else {
          warnings.push('Family hypothesis update omitted or named an unrecognized family.');
        }
        break;
      default:
        warnings.push('Event retained but has no state reducer: ' + event.eventType);
    }
    addProvenance(state, event);
  }

  function appendTransitEvent(inputState, inputEvent, options) {
    options = options || {};
    var state = clone(inputState || createInitialState(inputEvent && inputEvent.caseId));
    var event = clone(inputEvent || {});
    var warnings = [];
    var errors = validateEventShape(event);

    if (!errors.length && state.caseId && event.caseId !== state.caseId) errors.push('Event caseId does not match state caseId.');
    if (!errors.length && state.eventIds.indexOf(event.eventId) !== -1) errors.push('Duplicate eventId: ' + event.eventId);
    if (!errors.length) {
      if (event.epoch < state.currentEpoch) errors.push('Event epoch moves backward.');
      if (event.epoch === state.currentEpoch && event.sequence <= state.lastSequence) errors.push('Event sequence is not monotonic within the current epoch.');
      if (event.epoch > state.currentEpoch && event.sequence < 0) errors.push('New epoch sequence must be non-negative.');
    }

    if (errors.length) return { state: state, event: event, accepted: false, warnings: warnings, errors: errors };

    event.previousEventDigest = state.eventDigest;
    event.eventDigest = eventDigest(state.eventDigest, event);
    applyEvent(state, event, warnings);
    state.caseId = state.caseId || event.caseId;
    state.currentEpoch = event.epoch;
    state.lastSequence = event.sequence;
    state.eventCount += 1;
    state.eventDigest = event.eventDigest;
    state.eventIds.push(event.eventId);

    if (event.eventType === 'REPAIR_OR_REGROWTH') {
      state.warnings.push('Geometry-dependent calibration may be stale after repair or regrowth; recertification required before reuse.');
    }
    if (options.narrativeSafe && state.familyState.classification !== 'CONFIRMED_BY_OPERATOR_EVIDENCE' && state.familyState.classification !== 'CONFIRMED_BY_NAMED_SOURCE') {
      state.familyState = { classification: state.familyState.classification || 'UNRESOLVED', family: null, status: state.familyState.status || 'UNRESOLVED' };
    }

    return { state: state, event: event, accepted: true, warnings: warnings, errors: [] };
  }

  function replayTransitEvents(initialState, events, options) {
    options = options || {};
    var mode = options.mode || 'STRICT';
    var state = clone(initialState || createInitialState(events && events[0] && events[0].caseId));
    var acceptedEvents = [];
    var rejectedEvents = [];
    var warnings = [];

    (events || []).forEach(function (event) {
      var result = appendTransitEvent(state, event, { narrativeSafe: mode === 'NARRATIVE_SAFE' });
      if (result.accepted) {
        state = result.state;
        acceptedEvents.push(result.event);
        warnings = warnings.concat(result.warnings);
      } else {
        rejectedEvents.push({ event: clone(event), errors: result.errors });
        if (mode === 'STRICT') throw new Error('FTL replay rejected event ' + (event && event.eventId ? event.eventId : '<unknown>') + ': ' + result.errors.join('; '));
      }
    });

    return { state: state, acceptedEvents: acceptedEvents, rejectedEvents: rejectedEvents, warnings: warnings };
  }

  function deriveTransitCaseState(inputState) {
    var state = clone(inputState);
    var provenanceCounts = {};
    Object.keys((state && state.provenanceGraph && state.provenanceGraph.roots) || {}).forEach(function (key) {
      provenanceCounts[key] = state.provenanceGraph.roots[key].events.length;
    });
    return {
      caseId: state.caseId,
      familyState: clone(state.familyState),
      familyHypotheses: clone(state.familyHypotheses),
      unresolvedFamily: !state.familyState || !state.familyState.family,
      eventCount: state.eventCount,
      currentEpoch: state.currentEpoch,
      provenanceRootEventCounts: provenanceCounts,
      disclosureState: (!state.familyState || !state.familyState.family) ? 'FAMILY_NAME_WITHHELD' : 'FAMILY_NAME_EARNED',
      warnings: clone(state.warnings || [])
    };
  }

  function compareTransitEpochs(state, epochA, epochB, model) {
    model = model || function (x) { return x; };
    var observations = (state && state.observations) || [];
    var a = observations.filter(function (o) { return o.epoch === epochA; });
    var b = observations.filter(function (o) { return o.epoch === epochB; });
    return {
      epochA: epochA,
      epochB: epochB,
      pre: clone(a),
      post: clone(b),
      modelNote: 'Residual calculation requires domain-specific measurement matching and covariance supplied by the caller.',
      modeledPre: clone(a.map(model)),
      interventionWarning: ((state && state.interventions) || []).some(function (i) { return i.epoch > epochA && i.epoch <= epochB; })
    };
  }

  function exportTransitEvidencePacket(state, options) {
    options = options || {};
    var safe = options.narrativeSafe !== false;
    var derived = deriveTransitCaseState(state);
    if (safe && derived.unresolvedFamily) derived.familyHypotheses = derived.familyHypotheses.map(function (h) {
      return { family: null, state: h.state, support: h.support, status: h.status };
    });
    return {
      runtimeVersion: VERSION,
      caseId: state.caseId,
      currentEpoch: state.currentEpoch,
      eventDigest: state.eventDigest,
      observations: clone(state.observations),
      instrumentInstances: clone(state.instrumentInstances),
      compartments: clone(state.compartments),
      serviceEdges: clone(state.serviceEdges),
      unknownVolumes: clone(state.unknownVolumes),
      telemetry: clone(state.telemetry),
      interventions: clone(state.interventions),
      provenanceGraph: clone(state.provenanceGraph),
      familyState: safe && derived.unresolvedFamily ? { classification: state.familyState.classification, family: null, status: state.familyState.status } : clone(state.familyState),
      familyHypotheses: derived.familyHypotheses,
      warnings: clone(state.warnings)
    };
  }

  return Object.freeze({
    VERSION: VERSION,
    FAMILIES: FAMILIES,
    createInitialState: createInitialState,
    appendTransitEvent: appendTransitEvent,
    replayTransitEvents: replayTransitEvents,
    deriveTransitCaseState: deriveTransitCaseState,
    compareTransitEpochs: compareTransitEpochs,
    exportTransitEvidencePacket: exportTransitEvidencePacket,
    canonicalize: canonicalize,
    eventDigest: eventDigest
  });
});
