(function (root, factory) {
  var replay = null;
  if (typeof module === 'object' && module.exports) {
    replay = require('./blacklight-exo-ftl-event-replay-runtime.js');
  } else {
    replay = root.BlacklightFTLEventReplay;
  }
  var api = factory(replay);
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.BlacklightZwleiMurrekTransitCase = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (Replay) {
  'use strict';

  if (!Replay) throw new Error('BlacklightFTLEventReplay is required.');

  var VERSION = '1.0.0';
  var CASE_ID = 'NRS-MURREK-TRANSIT-CASE';
  var EPOCHS = Object.freeze({
    E0_ARCHIVE_BASELINE: 0,
    E1_UNTOUCHED_PHYSICAL_SURVEY: 1,
    E2_POST_ACCESS_STATE: 2,
    E3_POST_STIMULATION_STATE: 3,
    E4_POST_REPAIR_OR_REGROWTH: 4
  });
  var HYPOTHESES = Object.freeze([
    'H1_SLIPSTREAM_OPERATOR_WITH_GRAVITIC_CONTROL',
    'H2_GRAVITIC_PLANE_OPERATOR_WITH_LOCAL_SLIPSTREAM_TERMINOLOGY',
    'H3_HYBRID_CONTROL_ARCHITECTURE',
    'H4_LOCAL_TRANSITIONAL_OR_SUBFTL_EFFECT'
  ]);
  var HYPOTHESIS_TO_FAMILY = Object.freeze({
    H1_SLIPSTREAM_OPERATOR_WITH_GRAVITIC_CONTROL: 'slipstream-shear',
    H2_GRAVITIC_PLANE_OPERATOR_WITH_LOCAL_SLIPSTREAM_TERMINOLOGY: 'gravitational-plane-skimmer',
    H3_HYBRID_CONTROL_ARCHITECTURE: null,
    H4_LOCAL_TRANSITIONAL_OR_SUBFTL_EFFECT: null
  });

  function clone(value) {
    if (value === undefined) return undefined;
    return JSON.parse(JSON.stringify(value));
  }

  function objectFromArray(items, keyName) {
    var out = {};
    (items || []).forEach(function (item) {
      if (item && item[keyName]) out[item[keyName]] = clone(item);
    });
    return out;
  }

  function assertSeed(seed) {
    if (!seed || seed.recordType !== 'zwleiMurrekTransitCaseSeed') {
      throw new Error('Expected zwleiMurrekTransitCaseSeed input.');
    }
    if (!seed.subject || seed.subject.familyAutoSelection !== false || seed.subject.consolidatedFamily !== 'UNRESOLVED') {
      throw new Error('Mur\'rek case seed must preserve unresolved family and disable auto-selection.');
    }
    return seed;
  }

  function createMurrekInitialState(seed) {
    seed = assertSeed(seed);
    var familyHypotheses = HYPOTHESES.map(function (id) {
      return {
        family: HYPOTHESIS_TO_FAMILY[id],
        hypothesisId: id,
        state: 'ADMISSIBLE',
        support: 'NO_OPERATOR_LEVEL_MEASUREMENT_EVIDENCE',
        status: 'DERIVED'
      };
    });

    return Replay.createInitialState(CASE_ID, {
      currentEpoch: EPOCHS.E0_ARCHIVE_BASELINE,
      lastSequence: -1,
      eventCount: 0,
      eventDigest: 'GENESIS',
      observations: [],
      instrumentInstances: objectFromArray(seed.instrumentInstances, 'instrumentId'),
      compartments: objectFromArray(seed.compartmentSeeds, 'compartmentId'),
      serviceEdges: [],
      unknownVolumes: [],
      telemetry: [],
      interventions: [],
      familyHypotheses: familyHypotheses,
      familyState: {
        classification: 'CANDIDATE_SET',
        family: null,
        status: 'UNRESOLVED'
      },
      provenanceGraph: {
        roots: {
          'blacklight-archive-zwlei-murrek-no-return-signal-derelict.html': {
            events: [],
            sourceType: 'NAMED_SOURCE'
          },
          'The different lightspeed methods': {
            events: [],
            sourceType: 'DESIGN_SOURCE',
            documentId: seed.authority && seed.authority.designSource && seed.authority.designSource.documentId || null,
            revisionId: seed.authority && seed.authority.designSource && seed.authority.designSource.revisionId || null
          }
        },
        edges: []
      },
      supersessions: {},
      warnings: [
        'Source assertions are not field observations.',
        'No Mur\'rek transit-family mapping is established by this seed.'
      ],
      eventIds: []
    });
  }

  function normalizeEpoch(epoch) {
    if (Number.isInteger(epoch)) return epoch;
    if (typeof epoch === 'string' && Object.prototype.hasOwnProperty.call(EPOCHS, epoch)) return EPOCHS[epoch];
    throw new Error('Unknown Mur\'rek case epoch: ' + epoch);
  }

  function nextSequence(state, epoch) {
    epoch = normalizeEpoch(epoch);
    return epoch === state.currentEpoch ? state.lastSequence + 1 : 0;
  }

  function buildCaseInitializationEvent(seed, meta) {
    seed = assertSeed(seed);
    meta = meta || {};
    if (!meta.recordedAt) {
      return {
        executable: false,
        reason: 'recordedAt is required; runtime will not fabricate an initialization timestamp.',
        proposal: {
          eventId: 'MRK-E000',
          caseId: CASE_ID,
          epoch: EPOCHS.E0_ARCHIVE_BASELINE,
          sequence: 0,
          eventType: 'CASE_INITIALIZED',
          observedAt: null,
          authoritySnapshot: {
            status: 'MIXED',
            familyConclusion: 'UNRESOLVED',
            sourceAssertionCount: (seed.sourceAssertions || []).length
          },
          provenanceRoots: ['blacklight-archive-zwlei-murrek-no-return-signal-derelict.html', 'The different lightspeed methods'],
          payload: {
            sourceAssertions: clone(seed.sourceAssertions || []),
            caseState: clone(seed.caseState || {}),
            note: 'Archive-derived case initialization only; no physical survey implied.'
          },
          status: 'DERIVED'
        }
      };
    }
    var proposal = buildCaseInitializationEvent(seed, {}).proposal;
    proposal.observedAt = String(meta.recordedAt);
    return { executable: true, event: proposal };
  }

  function initializeMurrekCase(seed, meta) {
    var state = createMurrekInitialState(seed);
    var built = buildCaseInitializationEvent(seed, meta);
    if (!built.executable) return { state: state, initialized: false, proposal: built.proposal, reason: built.reason };
    var result = Replay.appendTransitEvent(state, built.event, { narrativeSafe: true });
    return {
      state: result.state,
      initialized: result.accepted,
      event: result.event,
      warnings: result.warnings,
      errors: result.errors
    };
  }

  function validateMeasurementPacket(packet) {
    var errors = [];
    if (!packet || typeof packet !== 'object') return ['Measurement packet is required.'];
    if (!packet.packetId || !/^MRK-M\d{3,}$/.test(packet.packetId)) errors.push('packetId must use MRK-M### or later form.');
    if (packet.packetId === 'MRK-M000') errors.push('MRK-M000 is the NOT_OBSERVED placeholder and cannot enter the evidence ledger.');
    if (packet.observed !== true) errors.push('Only observed=true packets can become PASSIVE_MEASUREMENT events.');
    if (!packet.instrumentId) errors.push('instrumentId is required.');
    if (!packet.compartmentId) errors.push('compartmentId is required.');
    if (!packet.channel) errors.push('channel is required.');
    if (!packet.values || typeof packet.values !== 'object' || Array.isArray(packet.values) || Object.keys(packet.values).length === 0) errors.push('Observed packet values must be a non-empty object.');
    if (!packet.uncertainty || typeof packet.uncertainty !== 'object') errors.push('uncertainty decomposition is required.');
    if (!packet.calibrationRef) errors.push('calibrationRef is required.');
    if (!Array.isArray(packet.provenanceRoots) || packet.provenanceRoots.length === 0) errors.push('At least one provenance root is required.');
    if (!packet.observedAt) errors.push('observedAt is required and is never fabricated by this runtime.');
    if (!packet.epoch) errors.push('epoch is required.');
    return errors;
  }

  function appendMeasurement(state, packet, authoritySnapshot) {
    var errors = validateMeasurementPacket(packet);
    if (errors.length) return { accepted: false, state: clone(state), errors: errors, warnings: [] };
    var epoch = normalizeEpoch(packet.epoch);
    var instrument = state.instrumentInstances && state.instrumentInstances[packet.instrumentId];
    var compartment = state.compartments && state.compartments[packet.compartmentId];
    if (!instrument) errors.push('Unknown instrumentId for this case: ' + packet.instrumentId);
    if (!compartment) errors.push('Unknown compartmentId for this case: ' + packet.compartmentId);
    if (errors.length) return { accepted: false, state: clone(state), errors: errors, warnings: [] };

    var event = {
      eventId: packet.eventId || ('MRK-E-MEAS-' + packet.packetId.replace('MRK-M', '')),
      caseId: state.caseId || CASE_ID,
      epoch: epoch,
      sequence: nextSequence(state, epoch),
      eventType: 'PASSIVE_MEASUREMENT',
      observedAt: String(packet.observedAt),
      authoritySnapshot: clone(authoritySnapshot || {
        status: 'MIXED',
        familyConclusion: 'UNRESOLVED',
        familyAutoSelection: false
      }),
      provenanceRoots: clone(packet.provenanceRoots),
      payload: {
        observation: {
          packetId: packet.packetId,
          observed: true,
          epoch: epoch,
          epochLabel: packet.epoch,
          instrumentId: packet.instrumentId,
          compartmentId: packet.compartmentId,
          channel: packet.channel,
          values: clone(packet.values),
          uncertainty: clone(packet.uncertainty),
          covarianceGroup: packet.covarianceGroup || null,
          calibrationRef: packet.calibrationRef,
          detectability: clone(packet.detectability || null),
          saturation: clone(packet.saturation || null),
          damageContext: clone(packet.damageContext || null),
          interpretationBoundary: packet.interpretationBoundary || 'Observed measurement only; family interpretation occurs downstream.'
        }
      },
      status: packet.status || 'MIXED'
    };
    return Replay.appendTransitEvent(state, event, { narrativeSafe: true });
  }

  function appendCalibration(state, record, authoritySnapshot) {
    record = record || {};
    var errors = [];
    if (!record.instrumentId) errors.push('instrumentId is required.');
    if (!record.calibrationId) errors.push('calibrationId is required.');
    if (!record.recordedAt) errors.push('recordedAt is required.');
    if (!record.epoch) errors.push('epoch is required.');
    if (!Array.isArray(record.provenanceRoots) || !record.provenanceRoots.length) errors.push('provenanceRoots are required.');
    if (errors.length) return { accepted: false, state: clone(state), errors: errors, warnings: [] };
    var epoch = normalizeEpoch(record.epoch);
    var event = {
      eventId: record.eventId || ('MRK-E-CAL-' + record.calibrationId),
      caseId: state.caseId || CASE_ID,
      epoch: epoch,
      sequence: nextSequence(state, epoch),
      eventType: 'CALIBRATION_RECORDED',
      observedAt: String(record.recordedAt),
      authoritySnapshot: clone(authoritySnapshot || { status: 'DERIVED', familyConclusion: 'UNRESOLVED' }),
      provenanceRoots: clone(record.provenanceRoots),
      payload: clone(record),
      status: record.status || 'DERIVED'
    };
    return Replay.appendTransitEvent(state, event, { narrativeSafe: true });
  }

  function passiveSurveyAdmission(state) {
    var instruments = state.instrumentInstances || {};
    var calibrated = Object.keys(instruments).filter(function (id) {
      var rec = instruments[id] || {};
      return rec.calibrationId || rec.calibrationState === 'CERTIFIED_FOR_CASE';
    });
    var hasBaselineEpoch = state.currentEpoch >= EPOCHS.E1_UNTOUCHED_PHYSICAL_SURVEY;
    var hasObservedPacket = (state.observations || []).some(function (o) { return o && o.observed === true; });
    return {
      admitted: calibrated.length > 0 && hasBaselineEpoch && hasObservedPacket,
      calibratedInstrumentIds: calibrated,
      hasBaselineEpoch: hasBaselineEpoch,
      hasObservedPacket: hasObservedPacket,
      familyConclusion: 'UNRESOLVED',
      note: 'Admission means a physical survey record exists; it does not identify a transit family.'
    };
  }

  function lowAuthorityTestAdmission(state, context) {
    context = context || {};
    var passive = passiveSurveyAdmission(state);
    var checks = {
      passiveBaselineComplete: passive.admitted,
      vaneGeometrySurveyed: context.vaneGeometrySurveyed === true,
      fluidHazardsBounded: context.fluidHazardsBounded === true,
      independentAbortAuthority: context.independentAbortAuthority === true,
      commonSafeEnvelopeNonEmpty: context.commonSafeEnvelopeNonEmpty === true,
      protectedRecoveryReserveExcluded: context.protectedRecoveryReserveExcluded === true,
      hazardObservabilityMaintained: context.hazardObservabilityMaintained === true
    };
    var admitted = Object.keys(checks).every(function (k) { return checks[k] === true; });
    return {
      admitted: admitted,
      checks: checks,
      familyConclusion: 'UNRESOLVED',
      rejectionRule: 'Any false or unknown gate rejects active testing; no gate may be inferred from source terminology.'
    };
  }

  function deriveDiscriminationInput(state) {
    var observations = (state.observations || []).filter(function (o) { return o && o.observed === true; });
    var covarianceGroups = {};
    observations.forEach(function (o) {
      var key = o.covarianceGroup || ('UNDECLARED:' + (o.instrumentId || 'UNKNOWN'));
      if (!covarianceGroups[key]) covarianceGroups[key] = [];
      covarianceGroups[key].push(o.packetId || null);
    });
    return {
      caseId: state.caseId,
      classificationState: 'CANDIDATE_SET',
      familyConclusion: 'UNRESOLVED',
      familyAutoSelection: false,
      hypotheses: HYPOTHESES.slice(),
      operatorEvidencePacketIds: observations.map(function (o) { return o.packetId; }),
      covarianceGroups: covarianceGroups,
      sourceAssertionsAreMeasurements: false,
      promotionRule: 'At least two provenance-independent operator-level discriminator groups surviving damage, detectability, covariance, and contradiction review, unless a higher-authority named source directly identifies the mechanism.'
    };
  }

  function exportMurrekEvidence(state, options) {
    var packet = Replay.exportTransitEvidencePacket(state, { narrativeSafe: !options || options.narrativeSafe !== false });
    packet.murrek = {
      caseId: CASE_ID,
      classificationState: 'CANDIDATE_SET',
      consolidatedFamily: 'UNRESOLVED',
      familyAutoSelection: false,
      discriminationInput: deriveDiscriminationInput(state)
    };
    return packet;
  }

  return Object.freeze({
    VERSION: VERSION,
    CASE_ID: CASE_ID,
    EPOCHS: EPOCHS,
    HYPOTHESES: HYPOTHESES,
    createMurrekInitialState: createMurrekInitialState,
    buildCaseInitializationEvent: buildCaseInitializationEvent,
    initializeMurrekCase: initializeMurrekCase,
    validateMeasurementPacket: validateMeasurementPacket,
    appendMeasurement: appendMeasurement,
    appendCalibration: appendCalibration,
    passiveSurveyAdmission: passiveSurveyAdmission,
    lowAuthorityTestAdmission: lowAuthorityTestAdmission,
    deriveDiscriminationInput: deriveDiscriminationInput,
    exportMurrekEvidence: exportMurrekEvidence,
    normalizeEpoch: normalizeEpoch
  });
});