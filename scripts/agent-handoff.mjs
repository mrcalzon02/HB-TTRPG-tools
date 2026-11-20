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
  record(input, 'handoff', ['format', 'engram', 'task', 'checkpoint', 'evidence', 'optionalContext', 'authority']);
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
  return Object.freeze({
    valid: true, steps: input.task.steps.length, evidence: input.evidence.length,
    optionalContext: input.optionalContext.length, evidenceOrigin: 'self-declared-not-host-verified',
    executionPermission: false
  });
}
function compactHandoff(input, maxChars = 8000) {
  validateHandoff(input);
  if (!Number.isInteger(maxChars) || maxChars < 512 || maxChars > 65536)
    invalid('maxChars must be an integer between 512 and 65536; it counts UTF-16 string characters, not tokens');
  const copy = JSON.parse(JSON.stringify(input));
  const candidates = [...copy.optionalContext].sort((a, b) => b.priority - a.priority || a.id.localeCompare(b.id));
  const omittedIds = [];
  while (JSON.stringify(copy).length > maxChars && candidates.length) {
    const item = candidates.shift();
    copy.optionalContext = copy.optionalContext.filter(entry => entry.id !== item.id);
    omittedIds.push(item.id);
  }
  const compactText = JSON.stringify(copy);
  if (compactText.length > maxChars)
    invalid('BUDGET_TOO_SMALL: mandatory engram, authority, task, evidence and checkpoint cannot be dropped');
  validateHandoff(copy);
  return Object.freeze({
    handoff: copy, chars: compactText.length, maxChars, omittedIds,
    tokenEstimate: 'not-provided; maxChars measures UTF-16 code units only',
    evidenceOrigin: 'self-declared-not-host-verified'
  });
}

export { validateHandoff, compactHandoff };

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [command, source = '-', limit] = process.argv.slice(2);
  try {
    if (!['validate', 'compact'].includes(command)) throw new Error('Usage: node scripts/agent-handoff.mjs validate|compact path.json|- [maxChars]');
    const input = JSON.parse(readFileSync(source === '-' ? 0 : source, 'utf8'));
    const result = command === 'validate'
      ? validateHandoff(input)
      : compactHandoff(input, limit === undefined ? 8000 : Number(limit));
    process.stdout.write(JSON.stringify(result, null, 2) + '\n');
  } catch (error) {
    process.stderr.write(String(error.message) + '\n');
    process.exitCode = 1;
  }
}
