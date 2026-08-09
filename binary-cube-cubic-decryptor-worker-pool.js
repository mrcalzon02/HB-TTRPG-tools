(function installBinaryCubeCubicDecryptorWorkerPool(root, factory) {
  'use strict';
  const Cubic = root?.BinaryCubeCubicDecryptorEngine
    || (typeof module === 'object' && module.exports && typeof require === 'function' ? require('./binary-cube-cubic-decryptor-engine.js') : null);
  const api = factory(Cubic);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.BinaryCubeCubicDecryptorWorkerPool = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function createBinaryCubeCubicDecryptorWorkerPool(Cubic) {
  'use strict';

  if (!Cubic) throw new Error('Cubic Decryptor worker pool requires BinaryCubeCubicDecryptorEngine.');

  const VERSION = '0.1.0';
  const MAX_WORKERS = 8;
  const AUTO_WORKER_CAP = 4;

  function fail(message) { throw new Error(message); }
  const clampInteger = (value, minimum, maximum) => Math.max(minimum, Math.min(maximum, Math.floor(Number(value) || 0)));

  function resolveWorkerCount(value, hardwareConcurrency = 0) {
    const requested = Math.floor(Number(value) || 0);
    if (requested > 0) return clampInteger(requested, 1, MAX_WORKERS);
    const hardware = Math.max(1, Math.floor(Number(hardwareConcurrency) || 2));
    return Math.max(1, Math.min(AUTO_WORKER_CAP, hardware > 1 ? hardware - 1 : 1));
  }

  function partitionRun(totalAttemptsValue, resumeCursorValue, attemptBudgetValue, workerCountValue) {
    const totalAttempts = Math.max(0, Math.floor(Number(totalAttemptsValue) || 0));
    const resumeCursor = clampInteger(resumeCursorValue, 0, totalAttempts);
    const remaining = Math.max(0, totalAttempts - resumeCursor);
    const budget = Math.max(0, Math.floor(Number(attemptBudgetValue) || 0));
    const runAttempts = budget ? Math.min(remaining, budget) : remaining;
    if (!runAttempts) return Object.freeze([]);
    const count = Math.min(resolveWorkerCount(workerCountValue, workerCountValue), runAttempts);
    const base = Math.floor(runAttempts / count);
    const remainder = runAttempts % count;
    const shards = [];
    let cursor = resumeCursor;
    for (let index = 0; index < count; index += 1) {
      const attemptLimit = base + (index < remainder ? 1 : 0);
      const startCursor = cursor;
      const endCursorExclusive = startCursor + attemptLimit;
      shards.push(Object.freeze({ index, startCursor, endCursorExclusive, attemptLimit }));
      cursor = endCursorExclusive;
    }
    return Object.freeze(shards);
  }

  function candidateOrder(left, right) {
    if (left.exactDigestMatch !== right.exactDigestMatch) return left.exactDigestMatch ? -1 : 1;
    if (left.exactFingerprintMatch !== right.exactFingerprintMatch) return left.exactFingerprintMatch ? -1 : 1;
    if (left.cribMatch !== right.cribMatch) return left.cribMatch ? -1 : 1;
    if (Number(right.score || 0) !== Number(left.score || 0)) return Number(right.score || 0) - Number(left.score || 0);
    const leftOrdinal = Number.isInteger(left.ordinal) ? left.ordinal : Number.MAX_SAFE_INTEGER;
    const rightOrdinal = Number.isInteger(right.ordinal) ? right.ordinal : Number.MAX_SAFE_INTEGER;
    if (leftOrdinal !== rightOrdinal) return leftOrdinal - rightOrdinal;
    if (left.gridSize !== right.gridSize) return left.gridSize - right.gridSize;
    if (left.profile !== right.profile) return String(left.profile).localeCompare(String(right.profile));
    return String(left.seed).localeCompare(String(right.seed));
  }

  function candidateIdentity(candidate) {
    return [candidate.profile, candidate.gridSize, candidate.seed, candidate.inputFace, candidate.outputFace, candidate.inputQuarterTurns, candidate.outputQuarterTurns, candidate.payloadCapacity].join('|');
  }

  function mergeCandidate(candidates, candidate, limit) {
    if (!candidate) return candidates;
    const id = candidateIdentity(candidate);
    const existing = candidates.findIndex(item => candidateIdentity(item) === id);
    if (existing >= 0) candidates.splice(existing, 1);
    candidates.push(candidate);
    candidates.sort(candidateOrder);
    if (candidates.length > limit) candidates.length = limit;
    return candidates;
  }

  function startSearch(config = {}) {
    const plan = config.plan;
    if (!plan || plan.format !== Cubic.constants.PLAN_FORMAT) fail('Cubic worker pool requires a deterministic Cubic search plan.');
    if (typeof config.workerFactory !== 'function') fail('Cubic worker pool requires a workerFactory function.');
    const options = { ...(config.options || {}) };
    const resumeCursor = clampInteger(config.resumeCursor, 0, plan.totalAttempts);
    const workerCount = resolveWorkerCount(config.workerCount, config.hardwareConcurrency);
    const shards = partitionRun(plan.totalAttempts, resumeCursor, options.maxAttemptsThisRun, workerCount);
    const resultLimit = Math.max(1, Math.min(100, Math.floor(Number(options.resultLimit) || Cubic.constants.DEFAULT_RESULT_LIMIT)));
    const source = config.source;
    const startedAt = Date.now();
    const candidates = [];
    const errors = [];
    const states = shards.map(shard => ({ shard, worker: null, progressCursor: shard.startCursor, attempts: 0, result: null, terminated: false }));
    let settled = false;
    let rejectPromise = null;
    let resolvePromise = null;
    let exactMatch = null;
    let exactOrdinal = Number.POSITIVE_INFINITY;

    function totalAttemptsThisRun() { return states.reduce((sum, state) => sum + Math.max(0, Number(state.attempts) || 0), 0); }

    function contiguousCursor() {
      let cursor = resumeCursor;
      for (const state of states) {
        if (state.shard.startCursor > cursor) break;
        const progress = Math.max(state.shard.startCursor, Math.min(state.shard.endCursorExclusive, Number(state.progressCursor) || state.shard.startCursor));
        if (state.result) {
          cursor = Math.max(cursor, progress);
          if (progress < state.shard.endCursorExclusive) break;
          continue;
        }
        cursor = Math.max(cursor, progress);
        break;
      }
      return cursor;
    }

    function terminateState(state) {
      if (state.terminated) return;
      state.terminated = true;
      try { state.worker?.terminate?.(); } catch (_) { /* best effort */ }
    }

    function terminateAll() { for (const state of states) terminateState(state); }

    function emitProgress(stage = 'Parallel Cubic search') {
      const attempts = totalAttemptsThisRun();
      const elapsedMilliseconds = Math.max(0, Date.now() - startedAt);
      const cursor = contiguousCursor();
      const covered = Math.min(plan.totalAttempts, resumeCursor + attempts);
      const activeWorkers = states.filter(state => !state.result && !state.terminated).length;
      config.onProgress?.({
        type: 'progress',
        stage,
        stageId: null,
        fraction: plan.totalAttempts ? covered / plan.totalAttempts : 1,
        cursor,
        attemptsThisRun: attempts,
        totalAttempts: plan.totalAttempts,
        candidates: candidates.length,
        elapsedMilliseconds,
        attemptsPerSecond: elapsedMilliseconds > 0 ? attempts * 1000 / elapsedMilliseconds : 0,
        planId: plan.planId,
        workerCount: shards.length,
        activeWorkers,
        checkpoint: Cubic.makeCheckpoint(plan, cursor, attempts, null)
      });
    }

    function lowestExactCandidate(candidate) {
      if (!candidate) return;
      const ordinal = Number.isInteger(candidate.ordinal) ? candidate.ordinal : Number.MAX_SAFE_INTEGER;
      if (!exactMatch || ordinal < exactOrdinal || (ordinal === exactOrdinal && candidateOrder(candidate, exactMatch) < 0)) {
        exactMatch = candidate;
        exactOrdinal = ordinal;
      }
    }

    function requiredStatesForExact() {
      if (!exactMatch || !Number.isFinite(exactOrdinal)) return [];
      return states.filter(state => state.shard.startCursor <= exactOrdinal);
    }

    function finalResult() {
      const attempts = totalAttemptsThisRun();
      const elapsedMilliseconds = Math.max(0, Date.now() - startedAt);
      let cursor;
      let exhausted;
      let stoppedEarly;
      let stopReason;
      if (exactMatch) {
        cursor = contiguousCursor();
        exhausted = false;
        stoppedEarly = true;
        stopReason = 'fingerprint-match';
      } else {
        cursor = shards.length ? shards[shards.length - 1].endCursorExclusive : resumeCursor;
        exhausted = cursor >= plan.totalAttempts;
        stoppedEarly = !exhausted;
        stopReason = exhausted ? null : 'attempt-budget';
      }
      const lastCompleted = [...states].reverse().find(state => state.result);
      return Object.freeze({
        format: Cubic.constants.RESULT_FORMAT,
        version: Cubic.constants.VERSION,
        plan,
        planId: plan.planId,
        cursor,
        attemptsThisRun: attempts,
        exhausted,
        stoppedEarly,
        stopReason,
        exactMatch,
        candidates: Object.freeze([...candidates]),
        errors: Object.freeze([...errors]),
        elapsedMilliseconds,
        attemptsPerSecond: elapsedMilliseconds > 0 ? attempts * 1000 / elapsedMilliseconds : 0,
        workerCount: shards.length,
        shards,
        checkpoint: Cubic.makeCheckpoint(plan, cursor, attempts, lastCompleted?.result?.checkpoint?.stageId || exactMatch?.stageId || null),
        caveat: exactMatch
          ? 'Parallel workers searched disjoint global ordinal ranges. The result is resolved only after every lower ordinal shard is complete, so the retained exact key is the earliest exact identity match in the searched prefix.'
          : 'Parallel workers searched one deterministic, contiguous bounded cursor interval. Worker count changes elapsed time only; the Plan ID and resulting checkpoint cursor are independent of shard count.'
      });
    }

    function maybeFinish() {
      if (settled) return;
      if (exactMatch) {
        const required = requiredStatesForExact();
        if (!required.every(state => Boolean(state.result))) return;
        for (const state of states) if (state.shard.startCursor > exactOrdinal) terminateState(state);
        settled = true;
        const result = finalResult();
        emitProgress('Earliest exact key identity resolved');
        resolvePromise(result);
        return;
      }
      if (!states.every(state => Boolean(state.result))) return;
      settled = true;
      const result = finalResult();
      emitProgress(result.exhausted ? 'Parallel search exhausted' : 'Parallel run budget reached');
      resolvePromise(result);
    }

    function failSearch(errorValue) {
      if (settled) return;
      settled = true;
      terminateAll();
      const error = errorValue instanceof Error ? errorValue : new Error(String(errorValue || 'Cubic worker-pool search failed.'));
      rejectPromise(error);
    }

    const promise = new Promise((resolve, reject) => { resolvePromise = resolve; rejectPromise = reject; });

    if (!shards.length) {
      settled = true;
      resolvePromise(Object.freeze({
        format: Cubic.constants.RESULT_FORMAT,
        version: Cubic.constants.VERSION,
        plan,
        planId: plan.planId,
        cursor: resumeCursor,
        attemptsThisRun: 0,
        exhausted: resumeCursor >= plan.totalAttempts,
        stoppedEarly: false,
        stopReason: null,
        exactMatch: null,
        candidates: Object.freeze([]),
        errors: Object.freeze([]),
        elapsedMilliseconds: 0,
        attemptsPerSecond: 0,
        workerCount: 0,
        shards,
        checkpoint: Cubic.makeCheckpoint(plan, resumeCursor, 0, null),
        caveat: 'No candidate attempts remain in the deterministic search plan.'
      }));
      return Object.freeze({ plan, shards, workerCount: 0, promise, cancel() {} });
    }

    states.forEach(state => {
      const worker = config.workerFactory(state.shard);
      state.worker = worker;
      const id = `${config.requestId || 'pool'}:${state.shard.index}`;
      worker.addEventListener('message', event => {
        if (settled && !exactMatch) return;
        const message = event.data || {};
        if (message.id !== id) return;
        if (message.type === 'progress') {
          state.progressCursor = Math.max(state.progressCursor, Math.min(state.shard.endCursorExclusive, Number(message.cursor) || state.progressCursor));
          state.attempts = Math.max(state.attempts, Number(message.attemptsThisRun) || 0);
          emitProgress(`${message.stage || 'Cubic search'} · worker ${state.shard.index + 1}/${shards.length}`);
          return;
        }
        if (message.type === 'candidate') {
          mergeCandidate(candidates, message.candidate, resultLimit);
          config.onCandidate?.(message.candidate, state.shard);
          return;
        }
        if (message.type === 'result') {
          state.result = message.result;
          state.progressCursor = Math.max(state.progressCursor, Math.min(state.shard.endCursorExclusive, Number(message.result?.cursor) || state.progressCursor));
          state.attempts = Math.max(state.attempts, Number(message.result?.attemptsThisRun) || 0);
          for (const candidate of message.result?.candidates || []) mergeCandidate(candidates, candidate, resultLimit);
          for (const row of message.result?.errors || []) if (errors.length < 24) errors.push({ ...row, shardIndex: state.shard.index });
          lowestExactCandidate(message.result?.exactMatch || null);
          if (exactMatch) {
            for (const higher of states) if (higher.shard.startCursor > exactOrdinal && !higher.result) terminateState(higher);
          }
          emitProgress(message.result?.exactMatch ? `Exact key identity reported by worker ${state.shard.index + 1}` : `Worker ${state.shard.index + 1}/${shards.length} completed`);
          maybeFinish();
          return;
        }
        if (message.type === 'error') {
          const error = new Error(message.error?.message || `Cubic worker ${state.shard.index + 1} failed.`);
          error.name = message.error?.name || 'Error';
          failSearch(error);
        }
      });
      worker.addEventListener('error', event => failSearch(new Error(event?.message || `Cubic worker ${state.shard.index + 1} crashed.`)), { once: true });
      worker.postMessage({
        id,
        operation: 'search',
        source,
        options: { ...options, maxAttemptsThisRun: state.shard.attemptLimit },
        resumeCursor: state.shard.startCursor
      });
    });

    emitProgress(`Parallel search started · ${shards.length} worker${shards.length === 1 ? '' : 's'}`);

    return Object.freeze({
      plan,
      shards,
      workerCount: shards.length,
      promise,
      cancel(reason = 'Cubic parallel search cancelled') {
        if (settled) return;
        settled = true;
        terminateAll();
        const error = new Error(reason);
        error.name = 'AbortError';
        rejectPromise(error);
      }
    });
  }

  return Object.freeze({
    version: VERSION,
    constants: Object.freeze({ VERSION, MAX_WORKERS, AUTO_WORKER_CAP }),
    resolveWorkerCount,
    partitionRun,
    candidateOrder,
    mergeCandidate,
    startSearch
  });
});
