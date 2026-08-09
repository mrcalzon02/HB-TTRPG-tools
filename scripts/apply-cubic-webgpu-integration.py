#!/usr/bin/env python3
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]

def read(path):
    return (ROOT / path).read_text(encoding='utf-8')

def write(path, text):
    (ROOT / path).write_text(text, encoding='utf-8')

def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f'{label}: expected exactly one match, found {count}')
    return text.replace(old, new, 1)

# --- authoritative Cubic search engine: expose CPU scoring primitives used by WebGPU ---
path = 'binary-cube-cubic-decryptor-engine.js'
text = read(path)
text = replace_once(text, "  const VERSION = '0.2.0';", "  const VERSION = '0.3.0';", 'engine version')
old_entropy = """  function entropy(bytesValue) {
    const bytes = Uint8Array.from(bytesValue || []);
    if (!bytes.length) return 0;
    const counts = new Uint32Array(256);
    for (const byte of bytes) counts[byte] += 1;
    let result = 0;
    for (const count of counts) if (count) { const p = count / bytes.length; result -= p * Math.log2(p); }
    return result;
  }
"""
new_entropy = """  function entropyFromCounts(countsValue, totalValue = null) {
    const counts = Array.from(countsValue || [], value => Math.max(0, Math.floor(Number(value) || 0)));
    invariant(counts.length === 256, 'Byte histogram must contain exactly 256 bins.');
    const total = totalValue == null ? counts.reduce((sum, count) => sum + count, 0) : Math.max(0, Math.floor(Number(totalValue) || 0));
    if (!total) return 0;
    invariant(counts.reduce((sum, count) => sum + count, 0) === total, 'Byte histogram count does not match plaintext byte length.');
    let result = 0;
    for (const count of counts) if (count) { const p = count / total; result -= p * Math.log2(p); }
    return result;
  }

  function histogram(bytesValue) {
    const bytes = Uint8Array.from(bytesValue || []);
    const counts = new Uint32Array(256);
    for (const byte of bytes) counts[byte] += 1;
    return Object.freeze(Array.from(counts));
  }

  function entropy(bytesValue) {
    const bytes = Uint8Array.from(bytesValue || []);
    if (!bytes.length) return 0;
    return entropyFromCounts(histogram(bytes), bytes.length);
  }
"""
text = replace_once(text, old_entropy, new_entropy, 'entropy helpers')
old_score = """  function scorePlaintext(bitsValue) {
    const bits = asBits(bitsValue, 'Candidate plaintext');
    const bytes = bitsToBytes(bits);
    const printable = printableFraction(bytes);
    const text = bytesToText(bytes, 4096).toLowerCase();
    const detectedSignature = signature(bytes);
    const byteEntropy = entropy(bytes);
    let tokenHits = 0;
    for (const token of COMMON_TOKENS) if (text.includes(token)) tokenHits += 1;
    const entropyStructure = Math.max(0, 1 - Math.abs(byteEntropy - 5.2) / 5.2);
    const score = Math.min(100,
      printable * 42
      + Math.min(28, tokenHits * 4)
      + (detectedSignature ? 45 : 0)
      + entropyStructure * 10
    );
    return Object.freeze({
      score,
      printableFraction: printable,
      entropy: byteEntropy,
      tokenHits,
      signature: detectedSignature,
      preview: bytesToText(bytes),
      hexPreview: bytesToHex(bytes),
      byteLength: bytes.length
    });
  }
"""
new_score = """  function scorePlaintextFromMetrics(bitsValue, metricsValue = {}) {
    const bits = asBits(bitsValue, 'Candidate plaintext');
    const bytes = bitsToBytes(bits);
    const metrics = metricsValue || {};
    let printable;
    if (Number.isInteger(Number(metrics.printableCount))) {
      const printableCount = Math.max(0, Math.floor(Number(metrics.printableCount)));
      invariant(printableCount <= bytes.length, 'Printable-byte count exceeds plaintext byte length.');
      printable = bytes.length ? printableCount / bytes.length : 0;
    } else printable = Number.isFinite(Number(metrics.printableFraction)) ? Number(metrics.printableFraction) : printableFraction(bytes);
    let byteEntropy;
    if (Array.isArray(metrics.histogram) || ArrayBuffer.isView(metrics.histogram)) byteEntropy = entropyFromCounts(metrics.histogram, bytes.length);
    else byteEntropy = Number.isFinite(Number(metrics.entropy)) ? Number(metrics.entropy) : entropy(bytes);
    const text = bytesToText(bytes, 4096).toLowerCase();
    const detectedSignature = signature(bytes);
    let tokenHits = 0;
    for (const token of COMMON_TOKENS) if (text.includes(token)) tokenHits += 1;
    const entropyStructure = Math.max(0, 1 - Math.abs(byteEntropy - 5.2) / 5.2);
    const score = Math.min(100,
      printable * 42
      + Math.min(28, tokenHits * 4)
      + (detectedSignature ? 45 : 0)
      + entropyStructure * 10
    );
    return Object.freeze({
      score,
      printableFraction: printable,
      entropy: byteEntropy,
      tokenHits,
      signature: detectedSignature,
      preview: bytesToText(bytes),
      hexPreview: bytesToHex(bytes),
      byteLength: bytes.length
    });
  }

  function scorePlaintext(bitsValue) {
    return scorePlaintextFromMetrics(bitsValue);
  }
"""
text = replace_once(text, old_score, new_score, 'score helpers')
text = replace_once(text, '  function attemptCandidate(source, candidate, options = {}) {', '  function prepareCandidate(source, candidate, options = {}) {', 'prepare candidate rename')
text = replace_once(text, "    const evidence = scorePlaintext(plaintext);\n    return Object.freeze({", "    return Object.freeze({", 'remove eager score')
text = replace_once(text, "      plaintextBits: plaintext,\n      ...evidence,\n      caveat:", "      plaintextBits: plaintext,\n      caveat:", 'remove evidence spread')
insert_before_checkpoint = """
  function completeCandidateEvidence(candidateValue, metricsValue = null) {
    if (!candidateValue) return null;
    const candidate = candidateValue;
    const evidence = metricsValue ? scorePlaintextFromMetrics(candidate.plaintextBits, metricsValue) : scorePlaintext(candidate.plaintextBits);
    return Object.freeze({ ...candidate, ...evidence });
  }

  function attemptCandidate(source, candidate, options = {}) {
    return completeCandidateEvidence(prepareCandidate(source, candidate, options));
  }

"""
text = replace_once(text, '  function makeCheckpoint(plan, cursor, attempts, stageId = null) {', insert_before_checkpoint + '  function makeCheckpoint(plan, cursor, attempts, stageId = null) {', 'candidate completion hooks')
text = replace_once(text,
"""    entropy,
    printableFraction,
    signature,
    scorePlaintext,
""",
"""    entropy,
    entropyFromCounts,
    histogram,
    printableFraction,
    signature,
    scorePlaintextFromMetrics,
    scorePlaintext,
    prepareCandidate,
    completeCandidateEvidence,
""", 'engine exports')
write(path, text)

# --- authoritative worker: one deterministic loop, optional parity-gated WebGPU Stage A scoring ---
worker = r'''\
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

  const resultLimit = Math.max(1, Math.min(100, Math.floor(Number(options.resultLimit) || Cubic.constants.DEFAULT_RESULT_LIMIT));
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
'''
write('binary-cube-cubic-decryptor-worker.js', worker)

# --- pool telemetry: preserve deterministic sharding while exposing worker acceleration state ---
path = 'binary-cube-cubic-decryptor-worker-pool.js'
text = read(path)
text = replace_once(text,
"const states = shards.map(shard => ({ shard, worker: null, progressCursor: shard.startCursor, attempts: 0, result: null, terminated: false }));",
"const states = shards.map(shard => ({ shard, worker: null, progressCursor: shard.startCursor, attempts: 0, result: null, acceleration: null, terminated: false }));", 'pool state acceleration')
needle = "    function totalAttemptsThisRun() { return states.reduce((sum, state) => sum + Math.max(0, Number(state.attempts) || 0), 0); }\n"
insert = needle + """

    function accelerationSummary() {
      const reports = states.map(state => state.acceleration).filter(Boolean);
      const backends = [...new Set(reports.map(report => report.backend).filter(Boolean))];
      const reasons = [...new Set(reports.map(report => report.reason).filter(Boolean))];
      const parityRows = reports.filter(report => typeof report.parityPassed === 'boolean');
      return Object.freeze({
        requestedMode: String(options.accelerationMode || 'cpu'),
        backends: Object.freeze(backends),
        parityPassed: parityRows.length ? parityRows.every(report => report.parityPassed) : null,
        fallback: reports.some(report => report.fallback),
        reasons: Object.freeze(reasons)
      });
    }
"""
text = replace_once(text, needle, insert, 'pool acceleration summary')
text = replace_once(text, "        checkpoint: Cubic.makeCheckpoint(plan, cursor, attempts, null)\n", "        acceleration: accelerationSummary(),\n        checkpoint: Cubic.makeCheckpoint(plan, cursor, attempts, null)\n", 'pool progress acceleration')
text = replace_once(text, "        workerCount: shards.length,\n        shards,\n        checkpoint:", "        workerCount: shards.length,\n        shards,\n        acceleration: accelerationSummary(),\n        checkpoint:", 'pool result acceleration')
text = replace_once(text, "        if (message.type === 'progress') {\n          state.progressCursor", "        if (message.type === 'progress') {\n          if (message.acceleration) state.acceleration = message.acceleration;\n          state.progressCursor", 'pool capture progress acceleration')
text = replace_once(text, "        if (message.type === 'result') {\n          state.result = message.result;", "        if (message.type === 'result') {\n          state.result = message.result;\n          if (message.result?.acceleration) state.acceleration = message.result.acceleration;", 'pool capture result acceleration')
write(path, text)

# --- UI: explicit optional acceleration selector, persistence and telemetry ---
path = 'binary-cube-cubic-decryptor.js'
text = read(path)
text = replace_once(text, "const WORKER_URL = 'binary-cube-cubic-decryptor-worker.js?v=20260809-cubic-decryptor-1';", "const WORKER_URL = 'binary-cube-cubic-decryptor-worker.js?v=20260809-cubic-webgpu-1';", 'worker cache seal')
text = replace_once(text, "      workerCount: Math.max(0, Math.floor(Number(panel.querySelector('#bccd-worker-count').value) || 0)),\n      progressEvery: 256", "      workerCount: Math.max(0, Math.floor(Number(panel.querySelector('#bccd-worker-count').value) || 0)),\n      accelerationMode: panel.querySelector('#bccd-acceleration-mode').value,\n      webgpuBatchSize: Math.max(1, Math.min(256, Math.floor(Number(panel.querySelector('#bccd-webgpu-batch-size').value) || 64))),\n      progressEvery: 256", 'UI options acceleration')
text = replace_once(text, "    setValue('#bccd-worker-count', options.workerCount);", "    setValue('#bccd-worker-count', options.workerCount);\n    setValue('#bccd-acceleration-mode', options.accelerationMode);\n    setValue('#bccd-webgpu-batch-size', options.webgpuBatchSize);", 'persist acceleration')
text = replace_once(text, "    const eta = measuredAttemptsPerSecond > 0 ? remaining / measuredAttemptsPerSecond : NaN;\n    panel.querySelector('[data-bccd-runtime]').innerHTML =", "    const eta = measuredAttemptsPerSecond > 0 ? remaining / measuredAttemptsPerSecond : NaN;\n    const acceleration = message.acceleration || {};\n    const backendRows = Array.isArray(acceleration.backends) ? acceleration.backends : acceleration.backend ? [acceleration.backend] : [];\n    const backendLabel = backendRows.length ? backendRows.join(' + ') : 'CPU / pending';\n    panel.querySelector('[data-bccd-runtime]').innerHTML =", 'runtime backend variables')
text = replace_once(text, "<span>Workers <strong>${Number(message.workerCount || activeWorker?.workerCount || 1).toLocaleString()}${Number.isFinite(Number(message.activeWorkers)) ? ` · ${Number(message.activeWorkers)} active` : ''}</strong></span><span>Elapsed", "<span>Workers <strong>${Number(message.workerCount || activeWorker?.workerCount || 1).toLocaleString()}${Number.isFinite(Number(message.activeWorkers)) ? ` · ${Number(message.activeWorkers)} active` : ''}</strong></span><span>Stage A backend <strong>${esc(backendLabel)}</strong></span><span>Elapsed", 'runtime backend display')
text = replace_once(text, "workerCount: result.workerCount, activeWorkers: 0 });", "workerCount: result.workerCount, activeWorkers: 0, acceleration: result.acceleration });", 'result acceleration telemetry')
text = replace_once(text, "<label>Parallel workers<input id=\"bccd-worker-count\" type=\"number\" min=\"0\" max=\"8\" value=\"0\"></label>", "<label>Parallel workers<input id=\"bccd-worker-count\" type=\"number\" min=\"0\" max=\"8\" value=\"0\"></label><label>GPU acceleration<select id=\"bccd-acceleration-mode\"><option value=\"auto\" selected>Automatic · WebGPU after parity check</option><option value=\"cpu\">CPU only</option><option value=\"webgpu\">Prefer WebGPU · CPU fallback</option></select></label><label>WebGPU Stage A batch size<input id=\"bccd-webgpu-batch-size\" type=\"number\" min=\"1\" max=\"256\" value=\"64\"></label>", 'UI acceleration controls')
text = replace_once(text, "Worker count 0 selects an automatic pool of up to four workers while preserving one deterministic global ordinal sequence. Reaching the budget produces a normal contiguous checkpoint, and worker count is deliberately excluded from the Plan ID.", "Worker count 0 selects an automatic pool of up to four workers while preserving one deterministic global ordinal sequence. Optional WebGPU accelerates only Stage A byte histogram/printability batches after canonical CPU key generation and decryption. It must pass parity checks and falls back to CPU on unsupported hardware, parity mismatch, or device loss. Worker count, acceleration mode, and batch size are deliberately excluded from the Plan ID.", 'UI acceleration boundary')
text = replace_once(text, "<span>Workers <strong>—</strong></span><span>Elapsed", "<span>Workers <strong>—</strong></span><span>Stage A backend <strong>CPU / pending</strong></span><span>Elapsed", 'initial backend runtime')
text = replace_once(text, "autosaveEnabled: autosaveEnabled() });", "autosaveEnabled: autosaveEnabled(), accelerationMode: panel?.querySelector('#bccd-acceleration-mode')?.value || 'auto' });", 'current state acceleration')
write(path, text)

# --- Cubic validator: async worker harness + WebGPU ownership/parity contracts ---
path = 'scripts/validate-binary-cube-cubic-decryptor.mjs'
text = read(path)
text = replace_once(text, "const Pool = require(path.join(root, 'binary-cube-cubic-decryptor-worker-pool.js'));", "const Pool = require(path.join(root, 'binary-cube-cubic-decryptor-worker-pool.js'));\nconst WebGPU = require(path.join(root, 'binary-cube-cubic-decryptor-webgpu.js'));", 'validator WebGPU import')
text = replace_once(text, "    run(message) {\n      messages.length = 0;\n      messageListener({ data: message });\n      return [...messages];\n    }", "    async run(message) {\n      messages.length = 0;\n      await messageListener({ data: message });\n      return [...messages];\n    }", 'async harness')
text = replace_once(text, "      queueMicrotask(() => {", "      queueMicrotask(async () => {", 'async adapter microtask')
text = replace_once(text, "          const rows = harness.run(message);", "          const rows = await harness.run(message);", 'async adapter run')
text = re.sub(r"const (\w+) = (\w+)\.run\(\{", r"const \1 = await \2.run({", text)
text = replace_once(text, "assert.equal(Cubic.constants.VERSION, '0.2.0');", "assert.equal(Cubic.constants.VERSION, '0.3.0');\nassert.equal(WebGPU.version, '0.1.0');\nassert.equal(WebGPU.backend, 'webgpu-stage-a-histogram-v1');\nassert.equal(WebGPU.capability().supported, false, 'Node validation intentionally exercises the deterministic CPU fallback environment.');\nassert.equal(typeof Cubic.entropyFromCounts, 'function');\nassert.equal(typeof Cubic.scorePlaintextFromMetrics, 'function');\nassert.equal(typeof Cubic.prepareCandidate, 'function');\nassert.equal(typeof Cubic.completeCandidateEvidence, 'function');", 'validator versions')
insert_after = "assert.throws(() => Cubic.normalizeCrib({ cribMode: 'hex', cribValue: 'abc' }), /complete hexadecimal bytes/);\n"
extra = insert_after + """
const gpuParityBits = utf8Bits('WebGPU Stage A canonical scoring parity fixture.');
const gpuParityBytes = Cubic.bitsToBytes(gpuParityBits);
const gpuParityHistogram = new Uint32Array(256);
let gpuParityPrintable = 0;
for (const byte of gpuParityBytes) {
  gpuParityHistogram[byte] += 1;
  if ((byte >= 32 && byte <= 126) || byte === 9 || byte === 10 || byte === 13) gpuParityPrintable += 1;
}
const gpuParityMetrics = {
  printableCount: gpuParityPrintable,
  printableFraction: gpuParityPrintable / gpuParityBytes.length,
  entropy: Cubic.entropyFromCounts(gpuParityHistogram, gpuParityBytes.length),
  histogram: Array.from(gpuParityHistogram),
  byteLength: gpuParityBytes.length
};
assert.deepEqual(Cubic.scorePlaintextFromMetrics(gpuParityBits, gpuParityMetrics), Cubic.scorePlaintext(gpuParityBits), 'GPU-produced integer statistics must feed the exact canonical Stage A score.');
assert.match(WebGPU.shaderSource, /atomicAdd/);
assert.doesNotMatch(WebGPU.shaderSource, /decrypt|permutation|key/i, 'WebGPU shader must not duplicate key generation or decryption.');
assert.ok(worker.includes('binary-cube-cubic-decryptor-webgpu.js'));
assert.ok(worker.includes('accelerator.verifyParity()'));
assert.ok(worker.includes('Cubic.prepareCandidate('));
assert.ok(worker.includes('Cubic.completeCandidateEvidence('));
assert.ok(ui.includes('id=\"bccd-acceleration-mode\"'));
assert.ok(ui.includes('Automatic · WebGPU after parity check'));
"""
text = replace_once(text, insert_after, extra, 'validator parity assertions')
# Add deterministic plan-ID acceleration invariance after broadPlan construction.
needle = "assert.ok(broadPlan.stages.every(stage => stage.gridSizes.every(size => rawSource.bits.length % (size * size) === 0)));\n"
extra = needle + """
const broadPlanGpuPreference = Cubic.buildSearchPlan(rawSource, {
  profiles: ['direct-permutation', 'iterative-chain'], usePackageMetadata: false, maxGridSize: 16,
  seedStart: 0, seedEnd: 3, seedTemplates: ['{n}'], includeFixedSeeds: false,
  orientationMode: 'manual', capacityMode: 'manual', payloadCapacity: directPackage.payloadCapacity,
  inputFace: 'top', outputFace: 'front', accelerationMode: 'webgpu', webgpuBatchSize: 128
});
assert.equal(broadPlanGpuPreference.planId, broadPlan.planId, 'Acceleration preference and batch size must never alter deterministic Plan ID or candidate space.');
"""
text = replace_once(text, needle, extra, 'plan ID acceleration invariance')
write(path, text)

# --- broad ownership validator: WebGPU is an accelerator above canonical decrypt/score authority ---
path = 'scripts/validate-scientific-tools-extraction.mjs'
text = read(path)
text = replace_once(text, "  cubicDecryptorPool: read('binary-cube-cubic-decryptor-worker-pool.js'),", "  cubicDecryptorPool: read('binary-cube-cubic-decryptor-worker-pool.js'),\n  cubicDecryptorWebGpu: read('binary-cube-cubic-decryptor-webgpu.js'),", 'ownership WebGPU source')
old_worker_check = "checks.push(includes('Cubic decryptor worker delegates deterministic attempts', sources.cubicDecryptorWorker, [\"'binary-cube-cubic-decryptor-engine.js'\", 'Cubic.attemptCandidate(', 'Cubic.makeCheckpoint(', \"message.operation !== 'search'\"]));"
new_worker_check = """checks.push(includes('Cubic WebGPU accelerator owns Stage A statistics only', sources.cubicDecryptorWebGpu, ['BinaryCubeCubicDecryptorWebGPU', 'atomicAdd', 'histogramBatch(', 'scoreCandidates(', 'verifyParity(', 'Cubic.entropyFromCounts(', 'Cubic.scorePlaintextFromMetrics(', 'Cubic.completeCandidateEvidence(']));
checks.push(excludes('Cubic WebGPU accelerator does not own keys or decryption', sources.cubicDecryptorWebGpu, ['generateResearchKey(', 'Engine.decryptBinary(', 'transformBlockWithKey(', 'iterativePermutation(']));
checks.push(includes('Cubic decryptor worker delegates deterministic attempts and parity-gated acceleration', sources.cubicDecryptorWorker, [\"'binary-cube-cubic-decryptor-engine.js'\", 'binary-cube-cubic-decryptor-webgpu.js', 'Cubic.prepareCandidate(', 'Cubic.completeCandidateEvidence(', 'WebGPU.createAccelerator(', 'accelerator.verifyParity()', 'Cubic.makeCheckpoint(', \"message.operation !== 'search'\"]));"""
text = replace_once(text, old_worker_check, new_worker_check, 'ownership worker check')
text = replace_once(text, "checks.push(includes('Cubic decryptor UI exposes resumable specialist search', sources.cubicDecryptorUi, ['Cubic Decryptor Tool', 'Build staged plan', 'Run / resume decryptor', 'Export checkpoint', 'Recover full plaintext', 'openInformationAnalysisSuite', 'openMediaForensicsSuite', 'regenerateKey(']));", "checks.push(includes('Cubic decryptor UI exposes resumable specialist search', sources.cubicDecryptorUi, ['Cubic Decryptor Tool', 'Build staged plan', 'Run / resume decryptor', 'GPU acceleration', 'bccd-acceleration-mode', 'WebGPU Stage A batch size', 'Export checkpoint', 'Recover full plaintext', 'openInformationAnalysisSuite', 'openMediaForensicsSuite', 'regenerateKey(']));", 'ownership UI check')
# Ensure permanent-file existence ledger notices the accelerator when that list is present.
if "nonEmpty('binary-cube-cubic-decryptor-worker.js');" in text and "nonEmpty('binary-cube-cubic-decryptor-webgpu.js');" not in text:
    text = text.replace("nonEmpty('binary-cube-cubic-decryptor-worker.js');", "nonEmpty('binary-cube-cubic-decryptor-worker.js');\nnonEmpty('binary-cube-cubic-decryptor-webgpu.js');", 1)
write(path, text)

print('Applied Cubic WebGPU integration to authoritative engine, worker, pool, UI, and validators.')
