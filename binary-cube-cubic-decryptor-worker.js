'use strict';

importScripts(
  'shadowrun-binary-cube-engine.js',
  'binary-cube-key-generation-research.js',
  'binary-cube-cubic-decryptor-engine.js',
  'binary-cube-cubic-decryptor-webgpu.js?v=20260809-cubic-webgpu-1'
);

const Cubic = self.BinaryCubeCubicDecryptorEngine;
const WebGPU = self.BinaryCubeCubicDecryptorWebGPU;
if (!Cubic) throw new Error('Cubic Decryptor worker could not load the search engine.');

function postProgress(id, payload) {
  self.postMessage({ id, type: 'progress', ...payload });
}

function normalizeSource(sourceValue) {
  const source = sourceValue || {};
  if (source.kind === 'package') return Cubic.parsePackage(source.package);
  if (source.kind === 'raw') return Cubic.sourceFromRaw(source.bits, source.framing || {});
  if (source.package) return Cubic.parsePackage(source.package);
  return Cubic.sourceFromRaw(source.bits, source.framing || {});
}

function keepCandidate(candidates, candidate, limit) {
  candidates.push(candidate);
  candidates.sort((left, right) => {
    if (left.exactDigestMatch !== right.exactDigestMatch) return left.exactDigestMatch ? -1 : 1;
    if (left.exactFingerprintMatch !== right.exactFingerprintMatch) return left.exactFingerprintMatch ? -1 : 1;
    if (left.cribMatch !== right.cribMatch) return left.cribMatch ? -1 : 1;
    if (right.score !== left.score) return right.score - left.score;
    const leftOrdinal = Number.isInteger(left.ordinal) ? left.ordinal : Number.MAX_SAFE_INTEGER;
    const rightOrdinal = Number.isInteger(right.ordinal) ? right.ordinal : Number.MAX_SAFE_INTEGER;
    if (leftOrdinal !== rightOrdinal) return leftOrdinal - rightOrdinal;
    if (left.gridSize !== right.gridSize) return left.gridSize - right.gridSize;
    if (left.profile !== right.profile) return left.profile.localeCompare(right.profile);
    return left.seed.localeCompare(right.seed);
  });
  if (candidates.length > limit) candidates.length = limit;
}

function* enumerateSeeds(seedSpec) {
  for (const seed of seedSpec.fixed) yield { seed, seedSource: 'fixed-known-seed' };
  for (let counter = seedSpec.start; counter <= seedSpec.end; counter += 1) {
    for (const template of seedSpec.templates) yield { seed: Cubic.renderSeed(template, counter), seedSource: `${template} @ ${counter}` };
  }
}

function cpuScorer(requestedMode = 'cpu', reason = 'CPU Stage A scoring selected.') {
  return {
    requestedMode,
    backend: requestedMode === 'cpu' ? 'cpu' : 'cpu-fallback',
    parityPassed: null,
    fallback: requestedMode !== 'cpu',
    reason,
    async scoreCandidates(rows) { return rows.map(candidate => Cubic.completeCandidateEvidence(candidate)); },
    destroy() {}
  };
}

async function resolveScorer(options) {
  const requestedMode = ['auto', 'webgpu', 'cpu'].includes(String(options.accelerationMode || '').toLowerCase())
    ? String(options.accelerationMode).toLowerCase()
    : 'cpu';
  if (requestedMode === 'cpu' || !WebGPU) return cpuScorer(requestedMode, WebGPU ? 'CPU Stage A scoring selected.' : 'WebGPU runtime is unavailable; deterministic CPU scoring remains active.');
  const capability = WebGPU.capability();
  if (!capability.supported) return cpuScorer(requestedMode, `${capability.reason} Deterministic CPU scoring remains active.`);
  try {
    const accelerator = await WebGPU.createAccelerator({ batchSize: Number(options.webgpuBatchSize) || WebGPU.constants.DEFAULT_BATCH_SIZE });
    const parity = await accelerator.verifyParity();
    return {
      requestedMode,
      backend: accelerator.backend,
      parityPassed: Boolean(parity?.pass),
      fallback: false,
      reason: 'WebGPU parity passed. GPU computes Stage A byte histogram/printability only; canonical key generation, decryption, entropy interpretation, signatures, tokens, and ranking remain authoritative CPU logic.',
      async scoreCandidates(rows) { return accelerator.scoreCandidates(rows); },
      destroy() { accelerator.destroy(); }
    };
  } catch (error) {
    return cpuScorer(requestedMode, `WebGPU initialization/parity failed (${error?.message || error}); deterministic CPU scoring remains active.`);
  }
}

function accelerationReport(scorer) {
  return Object.freeze({
    requestedMode: scorer.requestedMode,
    backend: scorer.backend,
    parityPassed: scorer.parityPassed,
    fallback: Boolean(scorer.fallback),
    reason: scorer.reason
  });
}

async function runSearch(message) {
  const id = message.id;
  if (message.operation !== 'search') {
    self.postMessage({ id, type: 'error', error: { name: 'Error', message: `Unsupported Cubic Decryptor worker operation: ${message.operation}` } });
    return;
  }

  const source = normalizeSource(message.source);
  const options = message.options || {};
  const cribSpec = Cubic.normalizeCrib(options);
  const attemptOptions = cribSpec.enabled ? { ...options, cribSpec } : options;
  const plan = Cubic.buildSearchPlan(source, options);
  const resumeCursor = Math.max(0, Math.floor(Number(message.resumeCursor) || 0));
  if (resumeCursor > plan.totalAttempts) throw new Error('Resume cursor is beyond the deterministic search plan.');

  const resultLimit = Math.max(1, Math.min(100, Math.floor(Number(options.resultLimit) || Cubic.constants.DEFAULT_RESULT_LIMIT)));
  const threshold = Math.max(0, Math.min(100, Number(options.scoreThreshold) || Cubic.constants.DEFAULT_SCORE_THRESHOLD));
  const progressEvery = Math.max(1, Math.floor(Number(options.progressEvery) || 256));
  const requestedBudget = Number(options.maxAttemptsThisRun);
  const maxAttemptsThisRun = Number.isFinite(requestedBudget) && requestedBudget > 0 ? Math.max(1, Math.floor(requestedBudget)) : Number.POSITIVE_INFINITY;
  const batchSize = Math.max(1, Math.min(256, Math.floor(Number(options.webgpuBatchSize) || 64)));
  const candidates = [];
  const errors = [];
  const pending = [];
  let cursor = 0;
  let attemptsThisRun = 0;
  let exactMatch = null;
  let stoppedEarly = false;
  let stopReason = null;
  let activeStageId = null;
  const startedAt = Date.now();
  let scorer = await resolveScorer(options);

  async function flushPending() {
    if (!pending.length) return;
    const batch = pending.splice(0, pending.length);
    let scored;
    try {
      scored = await scorer.scoreCandidates(batch);
    } catch (error) {
      const failedBackend = scorer.backend;
      try { scorer.destroy(); } catch (_) { /* best effort */ }
      scorer = cpuScorer(scorer.requestedMode, `${failedBackend} failed during Stage A scoring (${error?.message || error}); continued at the same deterministic cursor on CPU.`);
      scored = await scorer.scoreCandidates(batch);
    }
    for (const rankedCandidate of scored) {
      if (!rankedCandidate) continue;
      if (rankedCandidate.exactFingerprintMatch || rankedCandidate.cribMatch || rankedCandidate.score >= threshold) {
        keepCandidate(candidates, rankedCandidate, resultLimit);
        self.postMessage({ id, type: 'candidate', candidate: rankedCandidate, cursor, stageId: rankedCandidate.stageId, acceleration: accelerationReport(scorer) });
        if (rankedCandidate.exactFingerprintMatch && (!exactMatch || rankedCandidate.ordinal < exactMatch.ordinal)) exactMatch = rankedCandidate;
      }
    }
  }

  function progress(stage, stageId) {
    const elapsedMilliseconds = Date.now() - startedAt;
    postProgress(id, {
      stage,
      stageId,
      fraction: plan.totalAttempts ? Math.max(cursor, resumeCursor) / plan.totalAttempts : 1,
      cursor: Math.max(cursor, resumeCursor),
      attemptsThisRun,
      totalAttempts: plan.totalAttempts,
      candidates: candidates.length,
      elapsedMilliseconds,
      attemptsPerSecond: elapsedMilliseconds > 0 ? attemptsThisRun * 1000 / elapsedMilliseconds : 0,
      planId: plan.planId,
      acceleration: accelerationReport(scorer),
      checkpoint: Cubic.makeCheckpoint(plan, Math.max(cursor, resumeCursor), attemptsThisRun, stageId)
    });
  }

  try {
    progress('Search plan ready', null);
    outer:
    for (const stage of plan.stages) {
      activeStageId = stage.id;
      progress(`${stage.profileLabel} · ${stage.tierLabel}`, stage.id);
      for (const gridSize of stage.gridSizes) {
        const orientations = Cubic.orientationVariants(source, gridSize, options);
        const capacities = Cubic.capacityVariants(source, gridSize, options);
        for (const orientation of orientations) {
          for (const payloadCapacity of capacities) {
            for (const seedRow of enumerateSeeds(plan.seeds)) {
              const ordinal = cursor;
              cursor += 1;
              if (ordinal < resumeCursor) continue;
              attemptsThisRun += 1;
              try {
                const prepared = Cubic.prepareCandidate(source, {
                  stageId: stage.id,
                  profile: stage.profile,
                  gridSize,
                  orientation,
                  payloadCapacity,
                  seed: seedRow.seed,
                  seedSource: seedRow.seedSource
                }, attemptOptions);
                if (prepared) pending.push(Object.freeze({ ...prepared, ordinal }));
                if (pending.length >= batchSize || prepared?.exactFingerprintMatch) await flushPending();
                if (exactMatch && options.stopOnFingerprint !== false) {
                  stoppedEarly = true;
                  stopReason = 'fingerprint-match';
                  break outer;
                }
              } catch (error) {
                if (errors.length < 12) errors.push({ stageId: stage.id, gridSize, seed: seedRow.seed, message: error.message });
              }
              if (attemptsThisRun === 1 || attemptsThisRun % progressEvery === 0) {
                await flushPending();
                progress(`${stage.profileLabel} · ${stage.tierLabel} · ${gridSize}³ candidate space`, stage.id);
              }
              if (attemptsThisRun >= maxAttemptsThisRun) {
                await flushPending();
                stoppedEarly = true;
                stopReason = 'attempt-budget';
                break outer;
              }
            }
          }
        }
      }
      await flushPending();
    }
    await flushPending();

    const exhausted = !stoppedEarly && cursor >= plan.totalAttempts;
    const checkpoint = Cubic.makeCheckpoint(plan, cursor, attemptsThisRun, activeStageId);
    const elapsedMilliseconds = Date.now() - startedAt;
    self.postMessage({
      id,
      type: 'result',
      result: {
        format: Cubic.constants.RESULT_FORMAT,
        version: Cubic.constants.VERSION,
        plan,
        planId: plan.planId,
        cursor,
        attemptsThisRun,
        exhausted,
        stoppedEarly,
        stopReason,
        exactMatch,
        candidates,
        errors,
        elapsedMilliseconds,
        attemptsPerSecond: elapsedMilliseconds > 0 ? attemptsThisRun * 1000 / elapsedMilliseconds : 0,
        acceleration: accelerationReport(scorer),
        checkpoint,
        caveat: source.kind === 'package'
          ? 'A matching package key fingerprint is strong reproducibility evidence for this deterministic generator search. Optional WebGPU affects Stage A statistics throughput only and never key generation/decryption or deterministic ordinal order.'
          : cribSpec.enabled
            ? 'Raw-ciphertext candidates that fail the configured known-plaintext crib are rejected before Stage A scoring. Optional WebGPU affects Stage A statistics throughput only; a crib match remains conditional on the supplied plaintext assumption.'
            : 'Raw-ciphertext candidates are ranked by lightweight structure heuristics. Optional WebGPU only accelerates parity-checked byte statistics; use specialist corroboration before treating a candidate as successful decryption.'
      }
    });
  } finally {
    try { scorer.destroy(); } catch (_) { /* best effort */ }
  }
}

self.addEventListener('message', event => runSearch(event.data || {}).catch(error => {
  const id = event.data?.id;
  self.postMessage({ id, type: 'error', error: { name: error.name || 'Error', message: error.message || String(error) } });
}));
