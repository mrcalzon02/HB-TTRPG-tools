import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { test } from 'node:test';
import { validateHandoff, compactHandoff, diagnoseHandoff, reconcileHandoffs, compareSourcePins, auditReviewClaims } from '../scripts/agent-handoff.mjs';

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

test('diagnostics expose budget shortfall and cannot imply verified sources', () => {
  const blocked = diagnoseHandoff(example, 512);
  assert.equal(blocked.status, 'insufficient-mandatory-budget');
  assert.ok(blocked.shortfallChars > 0);
  assert.deepEqual(blocked.sourcePinIds, ['charles-engram']);
  assert.equal(blocked.sourceFreshness, 'not-checked');
  assert.equal(blocked.evidenceOrigin, 'self-declared-not-host-verified');
  assert.equal(blocked.grantsExecution, false);
  const roomy = diagnoseHandoff(example, 8000);
  assert.equal(roomy.status, 'fits');
  assert.equal(roomy.shortfallChars, 0);
  assert.equal(roomy.initialChars, JSON.stringify(example).length);
});
test('compaction retains optional source pins and reports exact size', () => {
  const start = copy(example);
  start.optionalContext.push({ id: 'bulky', priority: 3, text: 'X'.repeat(3500) });
  const min = JSON.stringify({ ...start, optionalContext: [] }).length;
  const result = compactHandoff(start, min + 200);
  assert.ok(result.omittedIds.includes('bulky'));
  assert.deepEqual(result.handoff.sourcePins, start.sourcePins);
  assert.equal(result.mandatoryChars, min);
  assert.equal(result.chars, JSON.stringify(result.handoff).length);
  assert.equal(result.reducedByChars, JSON.stringify(start).length - result.chars);
  assert.equal(start.optionalContext.length, 2);
  const tiny = diagnoseHandoff(start, 512);
  assert.deepEqual(tiny.omittedOptionalIds, ['bulky', 'historical-notes']);
  assert.equal(tiny.status, 'insufficient-mandatory-budget');
});
test('pin syntax and algorithms are checked; no caller data becomes authenticated', () => {
  const wrong = change(x => { x.sourcePins[0].revision = 'A'.repeat(64); });
  assert.throws(() => validateHandoff(wrong), /sourcePins.revision/);
  const duplicates = change(x => { x.sourcePins.push({ ...x.sourcePins[0] }); });
  assert.throws(() => validateHandoff(duplicates), /duplicate IDs/);
  const gitPin = change(x => {
    x.sourcePins.push({ id: 'release-commit', reference: 'main', algorithm: 'git-sha1', revision: 'a'.repeat(40) });
  });
  assert.ok(validateHandoff(gitPin).valid);
  const mismatch = change(x => { x.sourcePins[0].algorithm = 'git-sha1'; });
  assert.throws(() => validateHandoff(mismatch), /sourcePins.revision/);
});
test('source comparison reports matches, changes, and missing observations without claiming freshness', () => {
  const pins = example.sourcePins;
  const matching = [{ id: pins[0].id, algorithm: pins[0].algorithm, revision: pins[0].revision }];
  const ok = compareSourcePins(example, matching);
  assert.equal(ok.comparison, 'declared-revisions-match');
  assert.deepEqual(ok.matchingIds, ['charles-engram']);
  assert.equal(ok.freshnessVerified, false);
  assert.equal(ok.observationsOrigin, 'caller-supplied-not-host-authenticated');
  const changed = compareSourcePins(example, [{ ...matching[0], revision: '0'.repeat(64) }]);
  assert.deepEqual(changed.differingIds, ['charles-engram']);
  assert.equal(changed.comparison, 'revision-difference');
  const missing = compareSourcePins(example);
  assert.equal(missing.comparison, 'incomplete');
  assert.deepEqual(missing.uncheckedIds, ['charles-engram']);
  assert.throws(() => compareSourcePins(example, [matching[0], matching[0]]), /duplicate observation/);
  assert.throws(() => compareSourcePins(example, [{ ...matching[0], id: 'private-runner' }]), /no registered source pin/);
  assert.throws(() => compareSourcePins(example, [{ ...matching[0], algorithm: 'git-sha1' }]), /algorithm mismatch/);
  const withoutPins = change(x => { delete x.sourcePins; });
  assert.equal(compareSourcePins(withoutPins).comparison, 'no-pins');
});
test('reconciliation accepts compatible progress while reporting unverified evidence', () => {
  const updated = change(x => {
    x.task.steps[1].status = 'active';
    x.checkpoint.summary = 'One step is active; no result has been observed.';
    x.evidence.push({ id: 'second-note', kind: 'source', reference: 'offline note', outcome: 'unverified' });
    x.sourcePins[0].revision = 'f'.repeat(64);
  });
  const original = JSON.stringify(example);
  const result = reconcileHandoffs(example, updated);
  assert.equal(result.compatible, true);
  assert.deepEqual(result.changedStepIds, ['run-tests']);
  assert.deepEqual(result.addedEvidenceIds, ['second-note']);
  assert.deepEqual(result.changedSourcePinIds, ['charles-engram']);
  assert.equal(result.sourceRecheckRequired, true);
  assert.equal(result.executionVerified, false);
  assert.equal(JSON.stringify(example), original);
});
test('reconciliation fails closed on scope drift, deleted evidence, and silent regressions', () => {
  const candidates = [
    change(x => { x.task.id = 'different-task'; }),
    change(x => { x.task.project = 'other-project'; }),
    change(x => { x.task.objective = 'Other project goal'; }),
    change(x => { x.task.steps.splice(1, 1); }),
    change(x => { x.task.steps[0].title = 'Altered historical step'; }),
    change(x => { x.task.steps[0].status = 'active'; }),
    change(x => { x.task.steps[0].evidenceIds = []; }),
    change(x => { x.evidence[0].note = 'Overwritten provenance'; }),
    change(x => { delete x.sourcePins; }),
    change(x => { x.sourcePins[0].reference = 'another document'; }),
    change(x => { x.task.status = 'planned'; })
  ];
  for (const [i, candidate] of candidates.entries())
    assert.throws(() => reconcileHandoffs(example, candidate), undefined, 'conflict ' + i);
});
test('CLI diagnose and source comparison work from provided JSON files, without modifying them', () => {
  const oldBytes = readFileSync(fixturePath, 'utf8');
  const diagnostics = JSON.parse(execFileSync(process.execPath,
    ['scripts/agent-handoff.mjs', 'diagnose', fixturePath, '8000'], { encoding: 'utf8' }));
  assert.equal(diagnostics.sourceFreshness, 'not-checked');
  const observed = JSON.parse(execFileSync(process.execPath,
    ['scripts/agent-handoff.mjs', 'compare-sources', fixturePath, 'api/ai/examples/agent-source-observations.json'],
    { encoding: 'utf8' }));
  assert.equal(observed.comparison, 'declared-revisions-match');
  assert.equal(observed.freshnessVerified, false);
  const unchanged = JSON.parse(execFileSync(process.execPath,
    ['scripts/agent-handoff.mjs', 'reconcile', fixturePath, fixturePath], { encoding: 'utf8' }));
  assert.equal(unchanged.compatible, true);
  assert.equal(readFileSync(fixturePath, 'utf8'), oldBytes);
});


const reopeningRequest = JSON.parse(readFileSync('api/ai/examples/agent-reopening-request.json', 'utf8'));
const reviewedReopening = JSON.parse(readFileSync('api/ai/examples/agent-reviewed-reopening.json', 'utf8'));

test('reopening schema and synthetic examples remain non-authorizing and backwards compatible', () => {
  const schema = JSON.parse(readFileSync('api/ai/agent-handoff.schema.json', 'utf8'));
  assert.equal(schema.required.includes('reopenings'), false);
  assert.equal(schema.properties.reopenings.items.oneOf.length, 3);
  assert.equal(validateHandoff(example).reopeningEvents, 0);
  assert.equal(validateHandoff(reopeningRequest).reopeningEvents, 1);
  assert.equal(validateHandoff(reviewedReopening).reopeningEvents, 2);
  assert.equal(reviewedReopening.authority.grantsPrivateRunnerDispatch, false);
  assert.equal(reviewedReopening.evidence[1].note.includes('no verified host authorization'), true);
});
test('append-only reopening request preserves completed step and asks for review', () => {
  const before = JSON.stringify(example);
  const next = reconcileHandoffs(example, reopeningRequest);
  assert.equal(next.compatible, true);
  assert.equal(next.reconciliationStatus, 'review-requested');
  assert.deepEqual(next.pendingReopeningRequestIds, ['reopen-source-audit']);
  assert.deepEqual(next.newReopeningRequestIds, ['reopen-source-audit']);
  assert.deepEqual(next.reopenedStepIds, []);
  assert.equal(next.hostReviewVerified, false);
  assert.equal(reopeningRequest.task.steps[0].status, 'completed');
  assert.equal(JSON.stringify(example), before);
});
test('review claim allows a structurally consistent reopening without granting host approval', () => {
  const res = reconcileHandoffs(reopeningRequest, reviewedReopening);
  assert.equal(res.reconciliationStatus, 'review-claim-unverified');
  assert.deepEqual(res.reopenedStepIds, ['source-audit']);
  assert.deepEqual(res.reviewClaimIds, ['review-source-audit']);
  assert.deepEqual(res.pendingReopeningRequestIds, []);
  assert.equal(res.reviewRequired, true);
  assert.equal(res.hostReviewVerified, false);
  assert.equal(res.executionVerified, false);
  assert.equal(res.permissionsGranted, false);
  assert.ok(reviewedReopening.task.steps[0].evidenceIds.includes('source-readback'));
  assert.ok(reviewedReopening.task.steps[0].evidenceIds.includes('synthetic-review-record'));
  assert.equal(reconcileHandoffs(reviewedReopening, reviewedReopening).reconciliationStatus, 'compatible');
});
test('completed task may only reopen through an append-only synthetic review claim', () => {
  const base = copy(example);
  base.evidence.push({ id: 'second-pass', kind: 'test-result', reference: 'SYNTHETIC', outcome: 'observed-pass' });
  base.task.steps[1].evidenceIds.push('second-pass');
  base.task.steps[1].status = 'completed';
  base.task.status = 'completed';
  const requested = copy(base);
  requested.reopenings = [{
    eventType: 'request', id: 'reopen-one', stepId: 'source-audit',
    reason: 'Synthetic need to revisit a finished test', priorEvidenceIds: ['source-readback']
  }];
  const claimed = copy(requested);
  claimed.reopenings.push({
    eventType: 'review-claim', id: 'claim-one', stepId: 'source-audit',
    requestId: 'reopen-one', reviewEvidenceId: 'review-observation',
    reviewReference: 'SYNTHETIC-not-authenticated'
  });
  claimed.evidence.push({
    id: 'review-observation', kind: 'host-observation',
    reference: 'SYNTHETIC-not-real-host-proof', outcome: 'observed-pass'
  });
  claimed.task.status = 'active';
  claimed.task.steps[0].status = 'active';
  claimed.task.steps[0].evidenceIds.push('review-observation');
  assert.equal(reconcileHandoffs(base, requested).reconciliationStatus, 'review-requested');
  const result = reconcileHandoffs(requested, claimed);
  assert.deepEqual(result.reopenedStepIds, ['source-audit']);
  assert.equal(result.reopeningAuthorization, 'self-declared-not-host-authenticated');
  const silent = copy(base);
  silent.task.status = 'active';
  silent.task.steps[0].status = 'active';
  assert.throws(() => reconcileHandoffs(base, silent), /RECONCILE_CONFLICT/);
});
test('reject forged, edited, duplicated or unlinked reopening history', () => {
  const invalidShape = [
    change(x => { x.reopenings = [{ eventType: 'request', id: 'r', stepId: 'source-audit', reason: 'reason', priorEvidenceIds: [] }]; }),
    change(x => { x.reopenings = [{ eventType: 'request', id: 'r', stepId: 'unknown', reason: 'reason', priorEvidenceIds: ['source-readback'] }]; }),
    change(x => { x.reopenings = [{ eventType: 'review-claim', id: 'c', stepId: 'source-audit', requestId: 'absent', reviewEvidenceId: 'source-readback', reviewReference: 'fabricated' }]; }),
    change(x => { x.reopenings = [reopeningRequest.reopenings[0], reopeningRequest.reopenings[0]]; }),
    change(x => { x.reopenings = [reopeningRequest.reopenings[0], { eventType: 'review-claim', id: 'c', stepId: 'source-audit', requestId: 'reopen-source-audit', reviewEvidenceId: 'source-readback', reviewReference: 'no host review' }]; })
  ];
  for (const [i, candidate] of invalidShape.entries())
    assert.throws(() => validateHandoff(candidate), undefined, 'invalid event ' + i);
  const drift = [
    change(x => { x.task.steps[0].status = 'active'; }),
    change(x => { x.reopenings = [reopeningRequest.reopenings[0]]; x.task.steps[0].status = 'active'; }),
    (() => { const x = copy(reopeningRequest); x.reopenings[0].reason = 'changed historical reason'; return x; })(),
    (() => { const x = copy(reviewedReopening); x.reopenings[1].reviewEvidenceId = 'source-readback'; return x; })(),
    (() => { const x = copy(reviewedReopening); x.task.steps[0].evidenceIds = ['source-readback']; return x; })(),
    (() => { const x = copy(reviewedReopening); x.reopenings.reverse(); return x; })()
  ];
  for (const [i, candidate] of drift.entries())
    assert.throws(() => reconcileHandoffs(i < 2 ? example : reopeningRequest, candidate), undefined, 'unreviewed or tampered transition ' + i);
  assert.throws(() => reconcileHandoffs(reviewedReopening, reopeningRequest), /RECONCILE_CONFLICT/);
});
test('compaction and diagnostics retain reopening requests and review claims', () => {
  const x = copy(reviewedReopening);
  x.optionalContext.push({ id: 'verbose', priority: 3, text: 'L'.repeat(3000) });
  const minimum = JSON.stringify({ ...x, optionalContext: [] }).length;
  const result = compactHandoff(x, minimum);
  assert.deepEqual(result.handoff.reopenings, x.reopenings);
  assert.deepEqual(result.handoff.evidence, x.evidence);
  assert.ok(result.omittedIds.length > 0);
  assert.equal(diagnoseHandoff(x, 512).reopeningHostReviewVerified, false);
  assert.deepEqual(diagnoseHandoff(reopeningRequest, 8000).pendingReopeningRequestIds, ['reopen-source-audit']);
  assert.throws(() => compactHandoff(x, 512), /BUDGET_TOO_SMALL/);
});
test('CLI reconcile reports review-required rather than falsely approving a review', () => {
  const output = JSON.parse(execFileSync(process.execPath, [
    'scripts/agent-handoff.mjs', 'reconcile',
    'api/ai/examples/agent-reopening-request.json',
    'api/ai/examples/agent-reviewed-reopening.json'
  ], { encoding: 'utf8' }));
  assert.equal(output.reconciliationStatus, 'review-claim-unverified');
  assert.equal(output.hostReviewVerified, false);
  assert.equal(output.permissionsGranted, false);
});


const timedReview = JSON.parse(readFileSync('api/ai/examples/agent-timed-review.json', 'utf8'));
const supersededReview = JSON.parse(readFileSync('api/ai/examples/agent-superseded-review.json', 'utf8'));

test('legacy undated review remains readable but has unknown expiration', () => {
  assert.equal(validateHandoff(reviewedReopening).valid, true);
  const outcome = auditReviewClaims(reviewedReopening, '2026-11-20T12:00:00Z');
  assert.equal(outcome.claims[0].status, 'unknown-expiration');
  assert.deepEqual(outcome.recheckClaimIds, ['review-source-audit']);
  assert.equal(outcome.hostReviewVerified, false);
  assert.equal(outcome.executionPermission, false);
});
test('timed review has a declared window, never independently authenticated', () => {
  const early = auditReviewClaims(timedReview, '2026-11-01T11:59:59Z');
  assert.equal(early.claims[0].status, 'not-yet-issued');
  const during = auditReviewClaims(timedReview, '2026-11-02T11:59:59Z');
  assert.equal(during.claims[0].status, 'within-declared-window-unverified');
  assert.equal(during.freshnessVerified, false);
  assert.equal(during.hostReviewVerified, false);
  assert.equal(during.comparisonTimeOrigin, 'caller-supplied-not-authenticated');
  assert.deepEqual(during.hostVerificationRequiredClaimIds, ['review-source-audit']);
  const boundary = auditReviewClaims(timedReview, '2026-11-02T12:00:00Z');
  assert.equal(boundary.claims[0].status, 'expired');
  assert.deepEqual(boundary.recheckClaimIds, ['review-source-audit']);
  const unknownClock = auditReviewClaims(timedReview);
  assert.equal(unknownClock.claims[0].status, 'time-unchecked');
  assert.equal(unknownClock.comparisonTime, null);
  assert.deepEqual(diagnoseHandoff(timedReview).reviewClaimsNeedingRecheckIds, ['review-source-audit']);
  assert.deepEqual(diagnoseHandoff(timedReview).reviewClaimsAwaitingHostVerificationIds, ['review-source-audit']);
});
test('withdrawn and superseded claims are explicitly invalidated, not erased', () => {
  assert.deepEqual(timedReview.evidence, supersededReview.evidence);
  assert.deepEqual(timedReview.reopenings, supersededReview.reopenings.slice(0, -1));
  const sup = auditReviewClaims(supersededReview, '2026-11-02T11:00:00Z');
  assert.equal(sup.claims[0].status, 'superseded');
  assert.equal(sup.claims[0].invalidationEventId, 'supersede-source-review');
  assert.equal(sup.executionPermission, false);
  const withdrawn = copy(supersededReview);
  withdrawn.reopenings[2].reasonCode = 'withdrawn';
  const result = auditReviewClaims(withdrawn, '2026-11-01T12:00:00Z');
  assert.equal(result.claims[0].status, 'withdrawn');
  assert.deepEqual(result.recheckClaimIds, ['review-source-audit']);
});
test('review invalidation is a compatible append-only history update requiring re-review', () => {
  const previous = JSON.stringify(timedReview);
  const outcome = reconcileHandoffs(timedReview, supersededReview);
  assert.equal(outcome.compatible, true);
  assert.equal(outcome.reconciliationStatus, 'review-invalidated');
  assert.equal(outcome.reviewRequired, true);
  assert.equal(outcome.reviewRecheckRequired, true);
  assert.deepEqual(outcome.invalidatedReviewClaimIds, ['review-source-audit']);
  assert.equal(outcome.hostReviewVerified, false);
  assert.equal(outcome.permissionsGranted, false);
  assert.deepEqual(diagnoseHandoff(supersededReview).invalidatedReviewClaimIds, ['review-source-audit']);
  assert.equal(JSON.stringify(timedReview), previous);
  assert.equal(reconcileHandoffs(supersededReview, supersededReview).reconciliationStatus, 'compatible');
});
test('invalid review time windows and calendar values fail closed', () => {
  const invalid = [
    x => { delete x.reopenings[1].expiresAt; },
    x => { delete x.reopenings[1].reviewedAt; },
    x => { x.reopenings[1].expiresAt = x.reopenings[1].reviewedAt; },
    x => { x.reopenings[1].expiresAt = '2026-10-31T12:00:00Z'; },
    x => { x.reopenings[1].reviewedAt = '2026-02-31T12:00:00Z'; },
    x => { x.reopenings[1].reviewedAt = '2026-11-01T12:00:00+02:00'; },
    x => { x.reopenings[1].expiresAt = '2026-11-02T12:00Z'; },
    x => { x.reopenings[1].expiresAt = '2026-11-02T12:00:00.000Z'; }
  ];
  for (const [i, mutate] of invalid.entries()) {
    const bad = copy(timedReview);
    mutate(bad);
    assert.throws(() => validateHandoff(bad), undefined, 'bad time case ' + i);
  }
  assert.throws(() => auditReviewClaims(timedReview, '2026-02-31T00:00:00Z'), /UTC timestamp/);
  assert.throws(() => auditReviewClaims(timedReview, 'now'), /UTC timestamp/);
  assert.throws(() => auditReviewClaims(timedReview, '2026-11-01T11:00:00-09:00'), /UTC timestamp/);
});
test('invalidations cannot be duplicated, backdated into ordering, or aimed at unrelated claims', () => {
  const wrong = [
    x => { x.reopenings[2].claimId = 'unknown'; },
    x => { x.reopenings[2].stepId = 'run-tests'; },
    x => { x.reopenings[2].reasonCode = 'approved'; },
    x => { x.reopenings[2].reason = ''; },
    x => { x.reopenings[2].credentials = 'unsanctioned'; },
    x => { x.reopenings.push({ ...x.reopenings[2], id: 'second-invalidate' }); },
    x => { x.reopenings.unshift(x.reopenings.pop()); }
  ];
  for (const [i, mutate] of wrong.entries()) {
    const bad = copy(supersededReview);
    mutate(bad);
    assert.throws(() => validateHandoff(bad), undefined, 'invalid invalidation case ' + i);
  }
  const changed = copy(supersededReview);
  changed.reopenings[1].expiresAt = '2026-11-04T12:00:00Z';
  assert.throws(() => reconcileHandoffs(supersededReview, changed), /RECONCILE_CONFLICT/);
  assert.throws(() => reconcileHandoffs(supersededReview, timedReview), /RECONCILE_CONFLICT/);
  const removed = copy(supersededReview);
  removed.reopenings.pop();
  assert.throws(() => reconcileHandoffs(supersededReview, removed), /RECONCILE_CONFLICT/);
});
test('compaction retains review validity and invalidation history without leaking privileges', () => {
  const input = copy(supersededReview);
  input.optionalContext.push({ id: 'large-optional', priority: 3, text: 'C'.repeat(3000) });
  const baseline = JSON.stringify({ ...input, optionalContext: [] }).length;
  const result = compactHandoff(input, baseline + 5);
  assert.ok(result.omittedIds.includes('large-optional'));
  assert.deepEqual(result.handoff.reopenings, input.reopenings);
  assert.deepEqual(result.handoff.evidence, input.evidence);
  assert.deepEqual(result.handoff.authority, input.authority);
  assert.equal(result.handoff.authority.grantsPrivateRunnerDispatch, false);
  assert.throws(() => compactHandoff(input, 512), /BUDGET_TOO_SMALL/);
});
test('CLI review-status uses explicit UTC clock input only and cannot authenticate a claim', () => {
  const source = 'api/ai/examples/agent-timed-review.json';
  const raw = readFileSync(source, 'utf8');
  const expired = JSON.parse(execFileSync(process.execPath, [
    'scripts/agent-handoff.mjs', 'review-status', source, '2026-11-02T12:00:00Z'
  ], { encoding: 'utf8' }));
  assert.equal(expired.claims[0].status, 'expired');
  assert.equal(expired.hostReviewVerified, false);
  const clockMissing = JSON.parse(execFileSync(process.execPath, [
    'scripts/agent-handoff.mjs', 'review-status', source
  ], { encoding: 'utf8' }));
  assert.equal(clockMissing.claims[0].status, 'time-unchecked');
  assert.equal(readFileSync(source, 'utf8'), raw);
});
