#!/usr/bin/env node
/** Portable, read-only public context handoff validation and compaction.
 * Does not write files, execute tasks, call networks, save memory or dispatch runners.
 * Input JSON may contain private data: the caller controls its storage and sharing.
 */
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';


const FORMAT = 'hb-agent-handoff/1';
const ENGRAM = 'blacklight.charles';
const INDEX = 'skills/index.json';
const ID = /^[a-z][a-z0-9._-]{0,63}$/;

function invalid(message) { throw new Error('[agent-handoff] ' + message); }
function record(value, label, required, optional = []) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) invalid(label + ' must be an object');
  const permitted = new Set([...required, ...optional]);
  for (const field of required) if (!Object.hasOwn(value, field)) invalid(label + ' missing ' + field);
  for (const field of Object.keys(value)) if (!permitted.has(field)) invalid(label + ' has unexpected field ' + field);
}
function text(value, label, max = 1024) {
  if (typeof value !== 'string' || !value.trim() || value.length > max) invalid(label + ' must be nonblank text, up to ' + max + ' characters');
}
function id(value, label) {
  if (typeof value !== 'string' || !ID.test(value)) invalid(label + ' is not a safe stable ID');
}
function list(value, label, max = 64, min = 0) {
  if (!Array.isArray(value) || value.length < min || value.length > max) invalid(label + ' must be an array of ' + min + '–' + max + ' items');
}
function oneOf(value, allowed, label) {
  if (!allowed.includes(value)) invalid(label + ' has invalid value');
}
function distinct(items, label) {
  const ids = items.map(item => item.id);
  if (new Set(ids).size !== ids.length) invalid(label + ' contains duplicate IDs');
}
function validateHandoff(input) {
  record(input, 'handoff', ['format', 'engram', 'task', 'checkpoint', 'evidence', 'optionalContext', 'authority'], ['sourcePins', 'reopenings']);
  if (input.format !== FORMAT) invalid('unsupported handoff format');
  record(input.engram, 'engram', ['id', 'registry', 'selection']);
  if (input.engram.id !== ENGRAM || input.engram.registry !== INDEX || input.engram.selection !== 'optional-on-demand')
    invalid('mandatory Charles engram and skill index binding is missing or altered');
  record(input.authority, 'authority',
    ['stateOwner', 'grantsTools', 'grantsPrivateRunnerDispatch', 'grantsPersistentMemory', 'authorizationSource']);
  if (input.authority.stateOwner !== 'host' || input.authority.grantsTools !== false ||
      input.authority.grantsPrivateRunnerDispatch !== false || input.authority.grantsPersistentMemory !== false ||
      input.authority.authorizationSource !== 'host-policy')
    invalid('handoff is not an authorization token, private runner dispatch, or persistent memory grant');
  record(input.task, 'task', ['id', 'objective', 'project', 'status', 'steps']);
  id(input.task.id, 'task.id');
  text(input.task.objective, 'task.objective');
  text(input.task.project, 'task.project', 200);
  oneOf(input.task.status, ['planned', 'active', 'blocked', 'completed'], 'task.status');
  list(input.task.steps, 'task.steps', 64, 1);
  for (const step of input.task.steps) {
    record(step, 'task.step', ['id', 'title', 'status', 'evidenceIds']);
    id(step.id, 'step.id');
    text(step.title, 'step.title', 280);
    oneOf(step.status, ['pending', 'active', 'blocked', 'completed'], 'step.status');
    list(step.evidenceIds, 'step.evidenceIds', 64);
    if (new Set(step.evidenceIds).size !== step.evidenceIds.length) invalid('duplicate step evidence IDs');
    for (const ref of step.evidenceIds) id(ref, 'step.evidenceIds[]');
  }
  distinct(input.task.steps, 'task.steps');
  record(input.checkpoint, 'checkpoint', ['summary', 'nextAction', 'blockers', 'uncertainties']);
  text(input.checkpoint.summary, 'checkpoint.summary', 2000);
  text(input.checkpoint.nextAction, 'checkpoint.nextAction', 512);
  for (const key of ['blockers', 'uncertainties']) {
    list(input.checkpoint[key], 'checkpoint.' + key, 20);
    input.checkpoint[key].forEach((value, position) => text(value, 'checkpoint.' + key + '[' + position + ']', 512));
  }
  if (input.task.status === 'blocked' && !input.checkpoint.blockers.length) invalid('blocked task must state an explicit blocker');
  list(input.evidence, 'evidence', 64);
  for (const item of input.evidence) {
    record(item, 'evidence item', ['id', 'kind', 'reference', 'outcome'], ['note']);
    id(item.id, 'evidence.id');
    oneOf(item.kind, ['source', 'git-commit', 'test-result', 'host-observation'], 'evidence.kind');
    text(item.reference, 'evidence.reference', 500);
    oneOf(item.outcome, ['observed-pass', 'observed-fail', 'unverified'], 'evidence.outcome');
    if (item.note !== undefined) { if (typeof item.note !== 'string' || item.note.length > 500) invalid('evidence.note is invalid'); }
  }
  distinct(input.evidence, 'evidence');
  const evidenceById = new Map(input.evidence.map(item => [item.id, item]));
  for (const step of input.task.steps) {
    for (const ref of step.evidenceIds) if (!evidenceById.has(ref)) invalid('step references missing evidence ' + ref);
    if (step.status === 'completed' && !step.evidenceIds.some(ref => evidenceById.get(ref).outcome === 'observed-pass'))
      invalid('completed step requires at least one declared observed-pass evidence record');
  }
  if (input.task.status === 'completed' &&
      (input.task.steps.some(step => step.status !== 'completed') || input.checkpoint.blockers.length))
    invalid('completed task cannot include pending steps or unresolved blockers');
  list(input.optionalContext, 'optionalContext', 64);
  for (const part of input.optionalContext) {
    record(part, 'optionalContext item', ['id', 'priority', 'text']);
    id(part.id, 'optionalContext.id');
    if (!Number.isInteger(part.priority) || part.priority < 0 || part.priority > 3)
      invalid('optionalContext.priority must be 0–3');
    text(part.text, 'optionalContext.text', 8192);
  }
  distinct(input.optionalContext, 'optionalContext');
  if (input.sourcePins !== undefined) {
    list(input.sourcePins, 'sourcePins', 64);
    for (const pin of input.sourcePins) {
      record(pin, 'source pin', ['id', 'reference', 'algorithm', 'revision']);
      id(pin.id, 'sourcePins.id');
      text(pin.reference, 'sourcePins.reference', 500);
      oneOf(pin.algorithm, ['sha256', 'git-sha1'], 'sourcePins.algorithm');
      const pattern = pin.algorithm === 'sha256' ? /^[a-f0-9]{64}$/ : /^[a-f0-9]{40}$/;
      if (typeof pin.revision !== 'string' || !pattern.test(pin.revision))
        invalid('sourcePins.revision must be a lowercase digest with the declared algorithm length');
    }
    distinct(input.sourcePins, 'sourcePins');
  }
  if (input.reopenings !== undefined) {
    list(input.reopenings, 'reopenings', 64);
    const events = new Set(), requests = new Map(), reviewed = new Set();
    for (const event of input.reopenings) {
      if (!event || typeof event !== 'object' || Array.isArray(event))
        invalid('reopening event must be an object');
      if (event.eventType === 'request') {
        record(event, 'reopening request', ['eventType', 'id', 'stepId', 'reason', 'priorEvidenceIds']);
        id(event.id, 'reopening.id');
        id(event.stepId, 'reopening.stepId');
        text(event.reason, 'reopening.reason', 1000);
        list(event.priorEvidenceIds, 'reopening.priorEvidenceIds', 64, 1);
        if (new Set(event.priorEvidenceIds).size !== event.priorEvidenceIds.length)
          invalid('reopening request duplicates historical evidence');
        for (const ref of event.priorEvidenceIds) {
          id(ref, 'reopening.priorEvidenceIds[]');
          if (!evidenceById.has(ref)) invalid('reopening refers to missing historical evidence: ' + ref);
        }
        if (!input.task.steps.some(step => step.id === event.stepId))
          invalid('reopening request refers to a nonexistent step: ' + event.stepId);
        requests.set(event.id, event);
      } else if (event.eventType === 'review-claim') {
        record(event, 'reopening review claim',
          ['eventType', 'id', 'stepId', 'requestId', 'reviewEvidenceId', 'reviewReference']);
        id(event.id, 'reopening.id');
        id(event.stepId, 'reopening.stepId');
        id(event.requestId, 'reopening.requestId');
        id(event.reviewEvidenceId, 'reopening.reviewEvidenceId');
        text(event.reviewReference, 'reopening.reviewReference', 500);
        const request = requests.get(event.requestId);
        if (!request || request.stepId !== event.stepId)
          invalid('reopening review claim has no matching earlier request');
        if (reviewed.has(event.requestId)) invalid('reopening request has duplicate review claims');
        const evidence = evidenceById.get(event.reviewEvidenceId);
        if (!evidence || evidence.kind !== 'host-observation' || evidence.outcome !== 'observed-pass')
          invalid('reopening review claim requires a declared passing host-observation evidence record');
        reviewed.add(event.requestId);
      } else invalid('unrecognized reopening event type');
      if (events.has(event.id)) invalid('reopening event IDs must be unique');
      events.add(event.id);
    }
    const outstanding = new Set();
    for (const request of requests.values()) {
      if (!reviewed.has(request.id)) {
        if (outstanding.has(request.stepId)) invalid('multiple pending reopening requests for the same step');
        outstanding.add(request.stepId);
      }
    }
  }
  return Object.freeze({
    valid: true, steps: input.task.steps.length, evidence: input.evidence.length,
    reopeningEvents: (input.reopenings || []).length, reviewClaimsAuthenticity: 'self-declared-not-host-verified',
    optionalContext: input.optionalContext.length, evidenceOrigin: 'self-declared-not-host-verified',
    executionPermission: false
  });
}
function compactHandoff(input, maxChars = 8000) {
  const plan = budgetPlan(input, maxChars);
  if (plan.finalChars > maxChars)
    invalid('BUDGET_TOO_SMALL: mandatory engram, authority, task, evidence, source pins and checkpoint cannot be dropped; shortfall=' + plan.shortfallChars);
  validateHandoff(plan.copy);
  return Object.freeze({
    handoff: plan.copy, chars: plan.finalChars, maxChars,
    omittedIds: plan.omittedIds, mandatoryChars: plan.mandatoryChars,
    reducedByChars: plan.initialChars - plan.finalChars,
    tokenEstimate: 'not-provided; maxChars measures UTF-16 code units only',
    evidenceOrigin: 'self-declared-not-host-verified'
  });
}


function checkBudget(value) {
  if (!Number.isInteger(value) || value < 512 || value > 65536)
    invalid('maxChars must be an integer between 512 and 65536; it counts UTF-16 string characters, not tokens');
}
function budgetPlan(input, maxChars) {
  validateHandoff(input);
  checkBudget(maxChars);
  const copy = JSON.parse(JSON.stringify(input));
  const initialChars = JSON.stringify(copy).length;
  const mandatory = { ...copy, optionalContext: [] };
  const mandatoryChars = JSON.stringify(mandatory).length;
  const candidates = [...copy.optionalContext].sort((a, b) => b.priority - a.priority || a.id.localeCompare(b.id));
  const omittedIds = [];
  while (JSON.stringify(copy).length > maxChars && candidates.length) {
    const item = candidates.shift();
    copy.optionalContext = copy.optionalContext.filter(entry => entry.id !== item.id);
    omittedIds.push(item.id);
  }
  const finalChars = JSON.stringify(copy).length;
  return { copy, maxChars, initialChars, mandatoryChars, finalChars, omittedIds,
    status: mandatoryChars > maxChars ? 'insufficient-mandatory-budget'
      : initialChars > maxChars ? 'compacted' : 'fits',
    shortfallChars: Math.max(0, mandatoryChars - maxChars) };
}
/**
 * Read-only diagnostics: there is deliberately no tokenizer or host source check.
 * Only public IDs and count metadata are returned, not task/private text.
 */
function diagnoseHandoff(input, maxChars = 8000) {
  const plan = budgetPlan(input, maxChars);
  const declaredPassIds = input.evidence.filter(e => e.outcome === 'observed-pass').map(e => e.id);
  const pendingReviewIds = input.evidence.filter(e => e.outcome !== 'observed-pass').map(e => e.id);
  return Object.freeze({
    status: plan.status, maxChars: plan.maxChars, initialChars: plan.initialChars,
    mandatoryChars: plan.mandatoryChars, compactedChars: plan.finalChars,
    shortfallChars: plan.shortfallChars, omittedOptionalIds: plan.omittedIds,
    retainedOptionalIds: plan.copy.optionalContext.map(x => x.id),
    taskStatus: input.task.status, completedStepIds: input.task.steps.filter(x => x.status === 'completed').map(x => x.id),
    blockers: input.checkpoint.blockers.length, uncertainties: input.checkpoint.uncertainties.length,
    declaredPassEvidenceIds: declaredPassIds, nonPassingEvidenceIds: pendingReviewIds,
    sourcePinIds: (input.sourcePins || []).map(x => x.id),
    reopeningRequestIds: (input.reopenings || []).filter(x => x.eventType === 'request').map(x => x.id),
    reopeningReviewClaimIds: (input.reopenings || []).filter(x => x.eventType === 'review-claim').map(x => x.id),
    pendingReopeningRequestIds: (input.reopenings || []).filter(x => x.eventType === 'request' &&
      !(input.reopenings || []).some(y => y.eventType === 'review-claim' && y.requestId === x.id)).map(x => x.id),
    reopeningHostReviewVerified: false,
    sourceFreshness: 'not-checked',
    evidenceOrigin: 'self-declared-not-host-verified',
    tokenEstimate: 'not-provided; UTF-16 characters are not model tokens',
    grantsExecution: false
  });
}
/** Compare two descriptions of the SAME scoped task. Does not change either. */
function reconcileHandoffs(previous, current) {
  validateHandoff(previous);
  validateHandoff(current);
  const conflicts = [];
  for (const key of ['id', 'project', 'objective']) {
    if (previous.task[key] !== current.task[key]) conflicts.push('task.' + key + ' changed');
  }
  if (previous.task.status === 'active' && current.task.status === 'planned')
    conflicts.push('active task reverted silently to planned');

  const beforeSteps = new Map(previous.task.steps.map(x => [x.id, x]));
  const nextSteps = new Map(current.task.steps.map(x => [x.id, x]));
  const beforeEvidence = new Map(previous.evidence.map(x => [x.id, x]));
  const nextEvidence = new Map(current.evidence.map(x => [x.id, x]));
  for (const [evidenceId, entry] of beforeEvidence) {
    const next = nextEvidence.get(evidenceId);
    if (!next || JSON.stringify(entry) !== JSON.stringify(next))
      conflicts.push('existing evidence removed or rewritten: ' + evidenceId);
  }

  // Reopening journal entries are immutable and append-only across checkpoints.
  for (const [position, entry] of (previous.reopenings || []).entries()) {
    if (JSON.stringify(entry) !== JSON.stringify((current.reopenings || [])[position]))
      conflicts.push('reopening journal reordered, removed or altered at position ' + position);
  }
  const oldEvents = new Map((previous.reopenings || []).map(x => [x.id, x]));
  const allEvents = new Map((current.reopenings || []).map(x => [x.id, x]));
  for (const [eventId, entry] of oldEvents) {
    const next = allEvents.get(eventId);
    if (!next || JSON.stringify(entry) !== JSON.stringify(next))
      conflicts.push('reopening history removed or rewritten: ' + eventId);
  }
  const newEvents = (current.reopenings || []).filter(x => !oldEvents.has(x.id));
  const newRequests = newEvents.filter(x => x.eventType === 'request');
  const newClaims = newEvents.filter(x => x.eventType === 'review-claim');
  const reopened = new Map();
  for (const request of newRequests) {
    const original = beforeSteps.get(request.stepId);
    if (!original || original.status !== 'completed')
      conflicts.push('reopening request must target an already completed step: ' + request.stepId);
    else if (JSON.stringify(original.evidenceIds) !== JSON.stringify(request.priorEvidenceIds))
      conflicts.push('reopening request must preserve the exact prior evidence ID list: ' + request.stepId);
  }
  for (const claim of newClaims) {
    const request = allEvents.get(claim.requestId);
    const original = beforeSteps.get(claim.stepId);
    const next = nextSteps.get(claim.stepId);
    if (!request || request.eventType !== 'request' ||
        !original || original.status !== 'completed' ||
        !next || next.status === 'completed' ||
        JSON.stringify(request.priorEvidenceIds) !== JSON.stringify(original.evidenceIds)) {
      conflicts.push('reopening claim has no valid completed-step transition and historical evidence snapshot: ' + claim.stepId);
      continue;
    }
    if (beforeEvidence.has(claim.reviewEvidenceId))
      conflicts.push('reopening must cite newly added review evidence: ' + claim.reviewEvidenceId);
    if (!next.evidenceIds.includes(claim.reviewEvidenceId))
      conflicts.push('reopened step must link its review evidence: ' + claim.stepId);
    if (reopened.has(claim.stepId))
      conflicts.push('multiple reopening claims for one step in the same transition: ' + claim.stepId);
    reopened.set(claim.stepId, claim.id);
  }

  const changedStepIds = [];
  for (const original of previous.task.steps) {
    const next = nextSteps.get(original.id);
    if (!next) { conflicts.push('step removed: ' + original.id); continue; }
    if (original.title !== next.title) conflicts.push('step title changed: ' + original.id);
    if (original.status === 'completed' && next.status !== 'completed' && !reopened.has(original.id))
      conflicts.push('completed step reopened without a new review-claim event: ' + original.id);
    if (original.status === 'active' && next.status === 'pending')
      conflicts.push('active step silently reverted: ' + original.id);
    if (original.status !== next.status) changedStepIds.push(original.id);
    for (const ref of original.evidenceIds) {
      if (!next.evidenceIds.includes(ref)) conflicts.push('step evidence removed: ' + original.id + '/' + ref);
    }
  }
  if (previous.task.status === 'completed' && current.task.status !== 'completed') {
    if (!reopened.size || current.task.status === 'planned')
      conflicts.push('completed task reverted without a new reviewed-claim transition');
  }
  const beforePins = new Map((previous.sourcePins || []).map(x => [x.id, x]));
  const nextPins = new Map((current.sourcePins || []).map(x => [x.id, x]));
  const changedSourcePinIds = [];
  for (const [pinId, entry] of beforePins) {
    const next = nextPins.get(pinId);
    if (!next) { conflicts.push('source pin removed: ' + pinId); continue; }
    if (entry.reference !== next.reference || entry.algorithm !== next.algorithm)
      conflicts.push('source pin identity rewritten: ' + pinId);
    if (entry.revision !== next.revision) changedSourcePinIds.push(pinId);
  }
  if (conflicts.length) invalid('RECONCILE_CONFLICT: ' + conflicts.join('; '));
  const pendingRequests = (current.reopenings || []).filter(x => x.eventType === 'request' &&
    !(current.reopenings || []).some(y => y.eventType === 'review-claim' && y.requestId === x.id));
  return Object.freeze({
    compatible: true,
    reconciliationStatus: newClaims.length ? 'review-claim-unverified' :
      newRequests.length ? 'review-requested' : 'compatible',
    reviewRequired: newRequests.length > 0 || newClaims.length > 0,
    pendingReopeningRequestIds: pendingRequests.map(x => x.id),
    newReopeningRequestIds: newRequests.map(x => x.id),
    reviewClaimIds: newClaims.map(x => x.id),
    reopenedStepIds: [...reopened.keys()],
    hostReviewVerified: false,
    reopeningAuthorization: 'self-declared-not-host-authenticated',
    taskId: current.task.id, taskStatus: current.task.status,
    changedStepIds,
    addedStepIds: current.task.steps.filter(x => !beforeSteps.has(x.id)).map(x => x.id),
    addedEvidenceIds: current.evidence.filter(x => !beforeEvidence.has(x.id)).map(x => x.id),
    changedSourcePinIds,
    addedSourcePinIds: (current.sourcePins || []).filter(x => !beforePins.has(x.id)).map(x => x.id),
    sourceRecheckRequired: changedSourcePinIds.length > 0 ||
      (current.sourcePins || []).some(x => !beforePins.has(x.id)),
    evidenceOrigin: 'self-declared-not-host-verified',
    executionVerified: false, permissionsGranted: false
  });
}
/**
 * Caller supplies purported observations; equality is only a comparison.
 * No network call or authenticated host verification occurs here.
 */
function compareSourcePins(input, observations = []) {
  validateHandoff(input);
  list(observations, 'observations', 64);
  const pins = new Map((input.sourcePins || []).map(x => [x.id, x]));
  const found = new Map();
  for (const observation of observations) {
    record(observation, 'source observation', ['id', 'algorithm', 'revision']);
    id(observation.id, 'observation.id');
    const pinned = pins.get(observation.id);
    if (!pinned) invalid('observation has no registered source pin: ' + observation.id);
    if (found.has(observation.id)) invalid('duplicate observation ID: ' + observation.id);
    if (observation.algorithm !== pinned.algorithm) invalid('observation algorithm mismatch: ' + observation.id);
    const pattern = pinned.algorithm === 'sha256' ? /^[a-f0-9]{64}$/ : /^[a-f0-9]{40}$/;
    if (typeof observation.revision !== 'string' || !pattern.test(observation.revision))
      invalid('observation revision has incorrect digest format: ' + observation.id);
    found.set(observation.id, observation);
  }
  const matchingIds = [], differingIds = [], uncheckedIds = [];
  for (const [key, pin] of pins) {
    const observed = found.get(key);
    if (!observed) uncheckedIds.push(key);
    else if (observed.revision === pin.revision) matchingIds.push(key);
    else differingIds.push(key);
  }
  return Object.freeze({
    comparison: pins.size === 0 ? 'no-pins' : differingIds.length ? 'revision-difference' : uncheckedIds.length ? 'incomplete' : 'declared-revisions-match',
    matchingIds, differingIds, uncheckedIds,
    freshnessVerified: false,
    observationsOrigin: 'caller-supplied-not-host-authenticated',
    grantsExecution: false
  });
}

export { validateHandoff, compactHandoff, diagnoseHandoff, reconcileHandoffs, compareSourcePins };

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [command, source = '-', limit] = process.argv.slice(2);
  try {
    if (!['validate', 'compact', 'diagnose', 'reconcile', 'compare-sources'].includes(command))
      throw new Error('Usage: node scripts/agent-handoff.mjs validate|compact|diagnose source.json [maxChars] OR reconcile|compare-sources source.json second.json');
    const input = JSON.parse(readFileSync(source === '-' ? 0 : source, 'utf8'));
    let result;
    if (command === 'validate') result = validateHandoff(input);
    else if (command === 'compact') result = compactHandoff(input, limit === undefined ? 8000 : Number(limit));
    else if (command === 'diagnose') result = diagnoseHandoff(input, limit === undefined ? 8000 : Number(limit));
    else {
      if (!limit || limit === '-') invalid('a second JSON file path is required for ' + command);
      const secondary = JSON.parse(readFileSync(limit, 'utf8'));
      result = command === 'reconcile' ? reconcileHandoffs(input, secondary) : compareSourcePins(input, secondary);
    }
    process.stdout.write(JSON.stringify(result, null, 2) + '\n');
  } catch (error) {
    process.stderr.write(String(error.message) + '\n');
    process.exitCode = 1;
  }
}
