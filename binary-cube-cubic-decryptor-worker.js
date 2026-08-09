'use strict';

importScripts(
  'shadowrun-binary-cube-engine.js',
  'binary-cube-key-generation-research.js',
  'binary-cube-cubic-decryptor-engine.js'
);

const Cubic = self.BinaryCubeCubicDecryptorEngine;
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
    if (left.exactFingerprintMatch !== right.exactFingerprintMatch) return left.exactFingerprintMatch ? -1 : 1;
    if (left.cribMatch !== right.cribMatch) return left.cribMatch ? -1 : 1;
    if (right.score !== left.score) return right.score - left.score;
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

self.addEventListener('message', event => {
  const message = event.data || {};
  const id = message.id;
  if (message.operation !== 'search') {
    self.postMessage({ id, type: 'error', error: { name: 'Error', message: `Unsupported Cubic Decryptor worker operation: ${message.operation}` } });
    return;
  }

  try {
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
    const maxAttemptsThisRun = Number.isFinite(requestedBudget) && requestedBudget > 0
      ? Math.max(1, Math.floor(requestedBudget))
      : Number.POSITIVE_INFINITY;
    const candidates = [];
    const errors = [];
    let cursor = 0;
    let attemptsThisRun = 0;
    let exactMatch = null;
    let stoppedEarly = false;
    let stopReason = null;
    let activeStageId = null;
    const startedAt = Date.now();

    postProgress(id, { stage: 'Search plan ready', stageId: null, fraction: plan.totalAttempts ? resumeCursor / plan.totalAttempts : 1, cursor: resumeCursor, totalAttempts: plan.totalAttempts, planId: plan.planId, checkpoint: Cubic.makeCheckpoint(plan, resumeCursor, 0, null) });

    outer:
    for (const stage of plan.stages) {
      activeStageId = stage.id;
      postProgress(id, { stage: `${stage.profileLabel} · ${stage.tierLabel}`, stageId: stage.id, fraction: plan.totalAttempts ? Math.max(cursor, resumeCursor) / plan.totalAttempts : 1, cursor: Math.max(cursor, resumeCursor), totalAttempts: plan.totalAttempts, planId: plan.planId, checkpoint: Cubic.makeCheckpoint(plan, Math.max(cursor, resumeCursor), attemptsThisRun, stage.id) });
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
                const candidate = Cubic.attemptCandidate(source, {
                  stageId: stage.id,
                  profile: stage.profile,
                  gridSize,
                  orientation,
                  payloadCapacity,
                  seed: seedRow.seed,
                  seedSource: seedRow.seedSource
                }, attemptOptions);
                if (candidate && (candidate.exactFingerprintMatch || candidate.cribMatch || candidate.score >= threshold)) {
                  keepCandidate(candidates, candidate, resultLimit);
                  if (candidate.exactFingerprintMatch) {
                    exactMatch = candidate;
                    self.postMessage({ id, type: 'candidate', candidate, cursor, stageId: stage.id });
                    if (options.stopOnFingerprint !== false) {
                      stoppedEarly = true;
                      stopReason = 'fingerprint-match';
                      break outer;
                    }
                  } else self.postMessage({ id, type: 'candidate', candidate, cursor, stageId: stage.id });
                }
              } catch (error) {
                if (errors.length < 12) errors.push({ stageId: stage.id, gridSize, seed: seedRow.seed, message: error.message });
              }
              if (attemptsThisRun === 1 || attemptsThisRun % progressEvery === 0) {
                const elapsedMilliseconds = Date.now() - startedAt;
                postProgress(id, {
                  stage: `${stage.profileLabel} · ${stage.tierLabel} · ${gridSize}³ candidate space`,
                  stageId: stage.id,
                  fraction: plan.totalAttempts ? cursor / plan.totalAttempts : 1,
                  cursor,
                  attemptsThisRun,
                  totalAttempts: plan.totalAttempts,
                  candidates: candidates.length,
                  elapsedMilliseconds,
                  attemptsPerSecond: elapsedMilliseconds > 0 ? attemptsThisRun * 1000 / elapsedMilliseconds : 0,
                  planId: plan.planId,
                  checkpoint: Cubic.makeCheckpoint(plan, cursor, attemptsThisRun, stage.id)
                });
              }
              if (attemptsThisRun >= maxAttemptsThisRun) {
                stoppedEarly = true;
                stopReason = 'attempt-budget';
                break outer;
              }
            }
          }
        }
      }
    }

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
        checkpoint,
        caveat: source.kind === 'package'
          ? 'A matching package key fingerprint is strong reproducibility evidence for this deterministic generator search, but the package fingerprint is 32-bit FNV-1a corruption metadata rather than a collision-resistant cryptographic identifier.'
          : cribSpec.enabled
            ? 'Raw-ciphertext candidates that fail the configured known-plaintext crib are rejected before Stage A scoring. A crib match is strong hypothesis evidence but remains conditional on the supplied plaintext assumption.'
            : 'Raw-ciphertext candidates are ranked by lightweight structure heuristics. Use the Information & Deobfuscation Suite and known-plaintext checks before treating a candidate as a successful decryption.'
      }
    });
  } catch (error) {
    self.postMessage({ id, type: 'error', error: { name: error.name || 'Error', message: error.message || String(error) } });
  }
});
