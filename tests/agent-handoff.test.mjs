import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { test } from 'node:test';
import { validateHandoff, compactHandoff } from '../scripts/agent-handoff.mjs';

const fixturePath = 'api/ai/examples/agent-handoff.json';
const example = JSON.parse(readFileSync(fixturePath, 'utf8'));
const copy = input => JSON.parse(JSON.stringify(input));
const change = (mutate) => { const x = copy(example); mutate(x); return x; };

test('example is valid, carries required Charles/index pair and no tool grants', () => {
  const result = validateHandoff(example);
  assert.equal(result.valid, true);
  assert.equal(result.executionPermission, false);
  assert.equal(result.evidenceOrigin, 'self-declared-not-host-verified');
  assert.equal(example.engram.id, 'blacklight.charles');
  assert.equal(example.engram.registry, 'skills/index.json');
  assert.equal(example.authority.grantsPrivateRunnerDispatch, false);
});
test('schema declares each mandatory field and all permission constants', () => {
  const schema = JSON.parse(readFileSync('api/ai/agent-handoff.schema.json', 'utf8'));
  for (const key of ['format', 'engram', 'task', 'checkpoint', 'evidence', 'optionalContext', 'authority'])
    assert.ok(schema.required.includes(key), key);
  assert.equal(schema.properties.authority.properties.grantsTools.const, false);
  assert.equal(schema.properties.authority.properties.grantsPersistentMemory.const, false);
  assert.equal(schema.properties.authority.properties.grantsPrivateRunnerDispatch.const, false);
});
test('compaction is deterministic, immutable and drops optional context only', () => {
  const input = copy(example);
  input.optionalContext.push({ id: 'verbose-extra', priority: 3, text: 'R'.repeat(2400) });
  input.optionalContext.push({ id: 'critical-note', priority: 0, text: 'C'.repeat(250) });
  const before = JSON.stringify(input);
  const baseline = JSON.stringify({ ...input, optionalContext: [] }).length;
  const result = compactHandoff(input, baseline + 500);
  assert.ok(result.omittedIds.includes('verbose-extra'));
  assert.equal(result.handoff.engram.id, 'blacklight.charles');
  assert.equal(result.handoff.engram.registry, 'skills/index.json');
  assert.deepEqual(result.handoff.task, input.task);
  assert.deepEqual(result.handoff.evidence, input.evidence);
  assert.deepEqual(result.handoff.authority, input.authority);
  assert.ok(result.chars <= result.maxChars);
  assert.deepEqual(result, compactHandoff(input, baseline + 500));
  assert.equal(JSON.stringify(input), before, 'input must not be mutated');
});
test('mandatory records are never truncated to fit a too-small budget', () => {
  assert.throws(() => compactHandoff(example, 512), /BUDGET_TOO_SMALL/);
  assert.throws(() => compactHandoff(example, -1), /maxChars/);
});
test('completed step must have declared pass evidence; task requires all completed', () => {
  const missingEvidence = change(x => { x.task.steps[0].evidenceIds = []; });
  assert.throws(() => validateHandoff(missingEvidence), /completed step/);
  const claimedCompletion = change(x => { x.task.status = 'completed'; });
  assert.throws(() => validateHandoff(claimedCompletion), /completed task/);
  const fictionalEvidence = change(x => { x.task.steps[0].evidenceIds = ['nonexistent-evidence']; });
  assert.throws(() => validateHandoff(fictionalEvidence), /missing evidence/);
  const unverifiedEvidence = change(x => { x.evidence[0].outcome = 'unverified'; });
  assert.throws(() => validateHandoff(unverifiedEvidence), /completed step/);
});
test('deny forged authority, missing companions, unauthorized fields and duplicate IDs', () => {
  const invalid = [
    change(x => { x.authority.grantsTools = true; }),
    change(x => { x.authority.grantsPrivateRunnerDispatch = true; }),
    change(x => { x.authority.grantsPersistentMemory = true; }),
    change(x => { x.authority.stateOwner = 'engram'; }),
    change(x => { x.engram.id = 'foreign'; }),
    change(x => { x.engram.registry = 'runner-control/index.json'; }),
    change(x => { x.engram.selection = 'automatic'; }),
    change(x => { x.credentials = 'opaque'; }),
    change(x => { x.task.steps.push(copy(x.task.steps[0])); }),
    change(x => { x.evidence.push(copy(x.evidence[0])); }),
    change(x => { x.task.status = 'blocked'; }),
    change(x => { x.optionalContext[0].priority = 9; })
  ];
  for (const [idx, value] of invalid.entries())
    assert.throws(() => validateHandoff(value), undefined, 'invalid case ' + idx);
});
test('CLI validates from file and compacts without modifying it', () => {
  const original = readFileSync(fixturePath, 'utf8');
  const out = JSON.parse(execFileSync(process.execPath, ['scripts/agent-handoff.mjs', 'validate', fixturePath], { encoding: 'utf8' }));
  assert.equal(out.valid, true);
  const compact = JSON.parse(execFileSync(process.execPath, ['scripts/agent-handoff.mjs', 'compact', fixturePath, '8000'], { encoding: 'utf8' }));
  assert.equal(compact.handoff.engram.id, 'blacklight.charles');
  assert.equal(compact.handoff.authority.grantsPrivateRunnerDispatch, false);
  assert.equal(readFileSync(fixturePath, 'utf8'), original);
});
