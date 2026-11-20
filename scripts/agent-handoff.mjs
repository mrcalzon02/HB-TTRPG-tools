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
  record(input, 'handoff', ['format', 'engram', 'task', 'checkpoint', 'evidence', 'optionalContext', 'authority'], ['sourcePins']);
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
  return Object.freeze({
    valid: true, steps: input.task.steps.length, evidence: input.evidence.length,
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
  if (previous.task.status === 'completed' && current.task.status !== 'completed')
    conflicts.push('completed task reverted without a reviewed new task');
  if (previous.task.status === 'active' && current.task.status === 'planned')
    conflicts.push('active task reverted silently to planned');
  const nextSteps = new Map(current.task.steps.map(x => [x.id, x]));
  const changedStepIds = [];
  for (const before of previous.task.steps) {
    const after = nextSteps.get(before.id);
    if (!after) { conflicts.push('step removed: ' + before.id); continue; }
    if (before.title !== after.title) conflicts.push('step title changed: ' + before.id);
    if (before.status === 'completed' && after.status !== 'completed')
      conflicts.push('completed step reopened without a reviewed new task: ' + before.id);
    if (before.status === 'active' && after.status === 'pending')
      conflicts.push('active step silently reverted: ' + before.id);
    if (before.status !== after.status) changedStepIds.push(before.id);
    for (const ref of before.evidenceIds) {
      if (!after.evidenceIds.includes(ref)) conflicts.push('step evidence removed: ' + before.id + '/' + ref);
    }
  }
  const beforeEvidence = new Map(previous.evidence.map(x => [x.id, x]));
  const nextEvidence = new Map(current.evidence.map(x => [x.id, x]));
  for (const [idValue, item] of beforeEvidence) {
    const currentItem = nextEvidence.get(idValue);
    if (!currentItem || JSON.stringify(item) !== JSON.stringify(currentItem))
      conflicts.push('existing evidence removed or rewritten: ' + idValue);
  }
  const beforePins = new Map((previous.sourcePins || []).map(x => [x.id, x]));
  const nextPins = new Map((current.sourcePins || []).map(x => [x.id, x]));
  const changedSourcePinIds = [];
  for (const [idValue, item] of beforePins) {
    const after = nextPins.get(idValue);
    if (!after) { conflicts.push('source pin removed: ' + idValue); continue; }
    if (item.reference !== after.reference || item.algorithm !== after.algorithm)
      conflicts.push('source pin identity rewritten: ' + idValue);
    if (item.revision !== after.revision) changedSourcePinIds.push(idValue);
  }
  if (conflicts.length) invalid('RECONCILE_CONFLICT: ' + conflicts.join('; '));
  return Object.freeze({
    compatible: true, taskId: current.task.id, taskStatus: current.task.status,
    changedStepIds, addedStepIds: current.task.steps.filter(x => !previous.task.steps.some(y => x.id === y.id)).map(x => x.id),
    addedEvidenceIds: current.evidence.filter(x => !beforeEvidence.has(x.id)).map(x => x.id),
    changedSourcePinIds,
    addedSourcePinIds: (current.sourcePins || []).filter(x => !beforePins.has(x.id)).map(x => x.id),
    sourceRecheckRequired: changedSourcePinIds.length > 0 || (current.sourcePins || []).some(x => !beforePins.has(x.id)),
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
