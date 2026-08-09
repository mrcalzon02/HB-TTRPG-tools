#!/usr/bin/env python3
from pathlib import Path

OLD_VERSION = '20260809-cubic-decryptor-hardening-5'
NEW_VERSION = '20260809-cubic-decryptor-hardening-6'


def replace_once(path, old, new, label):
    file = Path(path)
    text = file.read_text()
    if new in text and old not in text:
        return False
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected exactly one old fragment, found {count}')
    file.write_text(text.replace(old, new, 1))
    return True


def replace_between(path, start, end, replacement, label):
    file = Path(path)
    text = file.read_text()
    if replacement in text:
        return False
    a = text.find(start)
    if a < 0:
        raise SystemExit(f'{label}: start marker not found')
    b = text.find(end, a + len(start))
    if b < 0:
        raise SystemExit(f'{label}: end marker not found')
    if text.find(start, a + 1) >= 0:
        raise SystemExit(f'{label}: start marker is not unique')
    file.write_text(text[:a] + replacement + text[b:])
    return True


worker = 'binary-cube-cubic-decryptor-worker.js'
ui = 'binary-cube-cubic-decryptor.js'
validator = 'scripts/validate-binary-cube-cubic-decryptor.mjs'
scientific = 'scientific-tools-entry.js'
scientific_validator = 'scripts/validate-scientific-tools-extraction.mjs'

replace_once(worker,
r"""  candidates.sort((left, right) => {
    if (left.exactFingerprintMatch !== right.exactFingerprintMatch) return left.exactFingerprintMatch ? -1 : 1;
    if (left.cribMatch !== right.cribMatch) return left.cribMatch ? -1 : 1;
    if (right.score !== left.score) return right.score - left.score;
    if (left.gridSize !== right.gridSize) return left.gridSize - right.gridSize;
""",
r"""  candidates.sort((left, right) => {
    if (left.exactFingerprintMatch !== right.exactFingerprintMatch) return left.exactFingerprintMatch ? -1 : 1;
    if (left.cribMatch !== right.cribMatch) return left.cribMatch ? -1 : 1;
    if (right.score !== left.score) return right.score - left.score;
    const leftOrdinal = Number.isInteger(left.ordinal) ? left.ordinal : Number.MAX_SAFE_INTEGER;
    const rightOrdinal = Number.isInteger(right.ordinal) ? right.ordinal : Number.MAX_SAFE_INTEGER;
    if (leftOrdinal !== rightOrdinal) return leftOrdinal - rightOrdinal;
    if (left.gridSize !== right.gridSize) return left.gridSize - right.gridSize;
""",
'Cubic worker deterministic ordinal sorting')

replace_once(worker,
r"""                const candidate = Cubic.attemptCandidate(source, {
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
""",
r"""                const candidate = Cubic.attemptCandidate(source, {
                  stageId: stage.id,
                  profile: stage.profile,
                  gridSize,
                  orientation,
                  payloadCapacity,
                  seed: seedRow.seed,
                  seedSource: seedRow.seedSource
                }, attemptOptions);
                const rankedCandidate = candidate ? Object.freeze({ ...candidate, ordinal }) : null;
                if (rankedCandidate && (rankedCandidate.exactFingerprintMatch || rankedCandidate.cribMatch || rankedCandidate.score >= threshold)) {
                  keepCandidate(candidates, rankedCandidate, resultLimit);
                  if (rankedCandidate.exactFingerprintMatch) {
                    exactMatch = rankedCandidate;
                    self.postMessage({ id, type: 'candidate', candidate: rankedCandidate, cursor, stageId: stage.id });
                    if (options.stopOnFingerprint !== false) {
""",
'Cubic worker global candidate ordinal')

replace_once(worker,
"""                  } else self.postMessage({ id, type: 'candidate', candidate, cursor, stageId: stage.id });
""",
"""                  } else self.postMessage({ id, type: 'candidate', candidate: rankedCandidate, cursor, stageId: stage.id });
""",
'Cubic worker nonexact ordinal candidate')

replace_once(ui,
"""  const Cubic = window.BinaryCubeCubicDecryptorEngine;
  const Dashboard = window.BinaryCubeDecryptionDashboard;
""",
"""  const Cubic = window.BinaryCubeCubicDecryptorEngine;
  const Pool = window.BinaryCubeCubicDecryptorWorkerPool;
  const Dashboard = window.BinaryCubeDecryptionDashboard;
""",
'Cubic UI pool dependency')
replace_once(ui,
"""  if (!Cubic) throw new Error('Cubic Decryptor Tool requires BinaryCubeCubicDecryptorEngine.');
  if (!Dashboard) throw new Error('Cubic Decryptor Tool requires BinaryCubeDecryptionDashboard for authoritative source parsing.');
""",
"""  if (!Cubic) throw new Error('Cubic Decryptor Tool requires BinaryCubeCubicDecryptorEngine.');
  if (!Pool) throw new Error('Cubic Decryptor Tool requires BinaryCubeCubicDecryptorWorkerPool.');
  if (!Dashboard) throw new Error('Cubic Decryptor Tool requires BinaryCubeDecryptionDashboard for authoritative source parsing.');
""",
'Cubic UI pool requirement')

replace_between(ui,
"  function terminateWorker(reason = 'cancelled') {",
"\n\n  function selectedProfiles() {",
r"""  function terminateWorker(reason = 'cancelled') {
    const reject = activeReject;
    stopHeartbeat();
    if (activeWorker) {
      if (typeof activeWorker.cancel === 'function') activeWorker.cancel(reason);
      else activeWorker.terminate?.();
    }
    activeWorker = null; activeReject = null; running = false; requestId += 1;
    if (reject) { const error = new Error(reason); error.name = 'AbortError'; reject(error); }
    if (panel) {
      panel.querySelector('[data-bccd-start]').disabled = !activeSource;
      panel.querySelector('[data-bccd-pause]').disabled = true;
    }
  }""",
'Cubic UI pooled cancellation')

replace_once(ui,
"""      maxAttemptsThisRun: Math.max(0, Math.floor(Number(panel.querySelector('#bccd-attempt-budget').value) || 0)),
      progressEvery: 256
""",
"""      maxAttemptsThisRun: Math.max(0, Math.floor(Number(panel.querySelector('#bccd-attempt-budget').value) || 0)),
      workerCount: Math.max(0, Math.floor(Number(panel.querySelector('#bccd-worker-count').value) || 0)),
      progressEvery: 256
""",
'Cubic UI worker-count option')
replace_once(ui,
"""    setValue('#bccd-attempt-budget', options.maxAttemptsThisRun);
  }
""",
"""    setValue('#bccd-attempt-budget', options.maxAttemptsThisRun);
    setValue('#bccd-worker-count', options.workerCount);
  }
""",
'Cubic persisted worker count')

replace_once(ui,
"""      if (b.score !== a.score) return b.score - a.score;
      return candidateIdentity(a).localeCompare(candidateIdentity(b));
""",
"""      if (b.score !== a.score) return b.score - a.score;
      const aOrdinal = Number.isInteger(a.ordinal) ? a.ordinal : Number.MAX_SAFE_INTEGER;
      const bOrdinal = Number.isInteger(b.ordinal) ? b.ordinal : Number.MAX_SAFE_INTEGER;
      if (aOrdinal !== bOrdinal) return aOrdinal - bOrdinal;
      return candidateIdentity(a).localeCompare(candidateIdentity(b));
""",
'Cubic UI deterministic ordinal tiebreak')

replace_once(ui,
"""    panel.querySelector('[data-bccd-runtime]').innerHTML = `<span>Cursor <strong>${cursor.toLocaleString()}</strong></span><span>Attempts this run <strong>${attemptsThisRun.toLocaleString()}</strong></span><span>Candidates <strong>${Number(message.candidates ?? candidates.length).toLocaleString()}</strong></span><span>Elapsed <strong>${formatDuration(elapsedMilliseconds / 1000)}</strong></span><span>Attempts / second <strong>${measuredAttemptsPerSecond > 0 ? Math.round(measuredAttemptsPerSecond).toLocaleString() : '—'}</strong></span><span>Estimated remaining <strong>${formatDuration(eta)}</strong></span>`;
""",
"""    panel.querySelector('[data-bccd-runtime]').innerHTML = `<span>Cursor <strong>${cursor.toLocaleString()}</strong></span><span>Attempts this run <strong>${attemptsThisRun.toLocaleString()}</strong></span><span>Candidates <strong>${Number(message.candidates ?? candidates.length).toLocaleString()}</strong></span><span>Workers <strong>${Number(message.workerCount || activeWorker?.workerCount || 1).toLocaleString()}${Number.isFinite(Number(message.activeWorkers)) ? ` · ${Number(message.activeWorkers)} active` : ''}</strong></span><span>Elapsed <strong>${formatDuration(elapsedMilliseconds / 1000)}</strong></span><span>Attempts / second <strong>${measuredAttemptsPerSecond > 0 ? Math.round(measuredAttemptsPerSecond).toLocaleString() : '—'}</strong></span><span>Estimated remaining <strong>${formatDuration(eta)}</strong></span>`;
""",
'Cubic UI pooled runtime telemetry')

replace_between(ui,
"  function runSearch() {",
"\n\n  function pauseSearch() {",
r"""  function runSearch() {
    if (running) return Promise.resolve(null);
    const plan = buildPlan();
    const options = optionsFromControls();
    const resumeCursor = latestCheckpoint?.planId === plan.planId ? Number(latestCheckpoint.cursor) || 0 : 0;
    const id = ++requestId;
    const hardwareConcurrency = Math.max(1, Number(navigator.hardwareConcurrency) || 2);
    const workerCount = Pool.resolveWorkerCount(options.workerCount, hardwareConcurrency);
    const search = Pool.startSearch({
      plan,
      source: sourceForWorker(),
      options,
      resumeCursor,
      workerCount,
      hardwareConcurrency,
      requestId: id,
      workerFactory: () => new Worker(new URL(WORKER_URL, document.baseURI).href),
      onProgress: message => { if (id === requestId && running) updateProgress(message); },
      onCandidate: candidate => { if (id === requestId && running) addCandidate(candidate); }
    });
    activeWorker = search; running = true; startedAt = performance.now();
    panel.querySelector('[data-bccd-start]').disabled = true; panel.querySelector('[data-bccd-pause]').disabled = false;
    setStatus(`Running plan ${plan.planId} from cursor ${resumeCursor.toLocaleString()} across ${search.workerCount} deterministic shard${search.workerCount === 1 ? '' : 's'}…`);
    heartbeat = window.setInterval(() => { if (activeWorker === search) setStatus(`Cubic Decryptor pool active · ${search.workerCount} worker${search.workerCount === 1 ? '' : 's'} · ${((performance.now() - startedAt) / 1000).toFixed(1)} s`); }, 1000);
    return search.promise.then(result => {
      if (activeWorker !== search) return result;
      stopHeartbeat(); activeWorker = null; activeReject = null; running = false; panel.querySelector('[data-bccd-start]').disabled = false; panel.querySelector('[data-bccd-pause]').disabled = true;
      latestPlan = result.plan; latestCheckpoint = result.checkpoint; candidates = result.candidates || candidates; renderPlan(latestPlan); renderCheckpoint(); renderCandidates();
      updateProgress({ stage: result.exactMatch ? 'Earliest exact key identity resolved' : result.exhausted ? 'Search exhausted' : result.stopReason === 'attempt-budget' ? 'Run attempt budget reached' : 'Search stopped', fraction: latestPlan.totalAttempts ? result.cursor / latestPlan.totalAttempts : 1, cursor: result.cursor, attemptsThisRun: result.attemptsThisRun, candidates: candidates.length, checkpoint: result.checkpoint, elapsedMilliseconds: result.elapsedMilliseconds, attemptsPerSecond: result.attemptsPerSecond, totalAttempts: latestPlan.totalAttempts, workerCount: result.workerCount, activeWorkers: 0 });
      setStatus(result.exactMatch ? `Resolved earliest exact package key identity at global ordinal ${Number(result.exactMatch.ordinal).toLocaleString()} after ${result.attemptsThisRun.toLocaleString()} parallel attempts.` : result.exhausted ? `Search exhausted after ${result.attemptsThisRun.toLocaleString()} parallel attempts in this run.` : result.stopReason === 'attempt-budget' ? `Run budget reached at deterministic cursor ${result.cursor.toLocaleString()} across ${result.workerCount} shard${result.workerCount === 1 ? '' : 's'}. Run again to resume without replaying the committed prefix.` : 'Search stopped.', result.exactMatch ? 'success' : 'warning');
      void saveAutosaveNow().catch(error => setAutosaveStatus(`Local autosave unavailable · ${error.message}`));
      if ((!result.exactMatch || !result.exactMatch.exactDigestMatch) && candidates.length) void corroborateRetainedCandidates().catch(error => setStatus(`Stage B corroboration unavailable · ${error.message}`, 'warning'));
      return result;
    }).catch(error => {
      if (activeWorker === search) {
        stopHeartbeat(); activeWorker = null; activeReject = null; running = false; panel.querySelector('[data-bccd-start]').disabled = false; panel.querySelector('[data-bccd-pause]').disabled = true;
      }
      if (error?.name !== 'AbortError') setStatus(error.message || String(error), 'error');
      throw error;
    });
  }""",
'Cubic UI deterministic worker pool run')

replace_once(ui,
"""<label>Attempt budget / run<input id=\"bccd-attempt-budget\" type=\"number\" min=\"0\" step=\"1000\" value=\"250000\"></label></div><p class=\"bccd-muted\">The attempt budget limits one worker session; 0 means unlimited. Reaching the budget produces a normal deterministic checkpoint so the next run resumes without changing the Plan ID.</p>""",
"""<label>Attempt budget / run<input id=\"bccd-attempt-budget\" type=\"number\" min=\"0\" step=\"1000\" value=\"250000\"></label><label>Parallel workers<input id=\"bccd-worker-count\" type=\"number\" min=\"0\" max=\"8\" value=\"0\"></label></div><p class=\"bccd-muted\">The attempt budget limits one pooled session; 0 means unlimited. Worker count 0 selects an automatic pool of up to four workers while preserving one deterministic global ordinal sequence. Reaching the budget produces a normal contiguous checkpoint, and worker count is deliberately excluded from the Plan ID.</p>""",
'Cubic UI worker pool control')

replace_once(ui,
"""<span>Candidates <strong>0</strong></span><span>Elapsed <strong>0 s</strong></span>""",
"""<span>Candidates <strong>0</strong></span><span>Workers <strong>—</strong></span><span>Elapsed <strong>0 s</strong></span>""",
'Cubic UI initial worker telemetry')

replace_once(ui,
"""  function currentState() { return Object.freeze({ panelOpen: Boolean(panel && !panel.hidden), sourceKind: activeSource?.kind || null, sourceId: activeSourceId, running, planId: latestPlan?.planId || null, checkpointCursor: latestCheckpoint?.cursor || 0, candidateCount: candidates.length, autosaveEnabled: autosaveEnabled() }); }
""",
"""  function currentState() { return Object.freeze({ panelOpen: Boolean(panel && !panel.hidden), sourceKind: activeSource?.kind || null, sourceId: activeSourceId, running, workerCount: activeWorker?.workerCount || 0, planId: latestPlan?.planId || null, checkpointCursor: latestCheckpoint?.cursor || 0, candidateCount: candidates.length, autosaveEnabled: autosaveEnabled() }); }
""",
'Cubic UI pooled current state')

replace_once(scientific,
"""      await loadScript('binary-cube-cubic-decryptor-engine.js', () => Boolean(window.BinaryCubeCubicDecryptorEngine));
      await loadScript('binary-cube-cubic-decryptor.js', () => Boolean(window.BinaryCubeCubicDecryptor));
""",
"""      await loadScript('binary-cube-cubic-decryptor-engine.js', () => Boolean(window.BinaryCubeCubicDecryptorEngine));
      await loadScript('binary-cube-cubic-decryptor-worker-pool.js', () => Boolean(window.BinaryCubeCubicDecryptorWorkerPool));
      await loadScript('binary-cube-cubic-decryptor.js', () => Boolean(window.BinaryCubeCubicDecryptor));
""",
'Scientific Tools Cubic worker pool loader')

replace_once(validator,
"""const Cubic = require(path.join(root, 'binary-cube-cubic-decryptor-engine.js'));
const Information = require(path.join(root, 'binary-cube-information-analysis-suite.js'));
""",
"""const Cubic = require(path.join(root, 'binary-cube-cubic-decryptor-engine.js'));
const Pool = require(path.join(root, 'binary-cube-cubic-decryptor-worker-pool.js'));
const Information = require(path.join(root, 'binary-cube-information-analysis-suite.js'));
""",
'Cubic validator worker pool authority')

replace_once(validator,
"""function resultMessage(messages, label) {
""",
r"""function createWorkerAdapter() {
  const harness = createWorkerHarness();
  const listeners = { message: [], error: [] };
  let terminated = false;
  return {
    addEventListener(type, listener) { if (listeners[type]) listeners[type].push(listener); },
    postMessage(message) {
      queueMicrotask(() => {
        if (terminated) return;
        try {
          const rows = harness.run(message);
          for (const row of rows) {
            if (terminated) break;
            for (const listener of listeners.message) listener({ data: row });
          }
        } catch (error) {
          if (!terminated) for (const listener of listeners.error) listener({ message: error.message, error });
        }
      });
    },
    terminate() { terminated = true; }
  };
}

function resultMessage(messages, label) {
""",
'Cubic validator worker adapter')

replace_once(validator,
"""assert.equal(Cubic.constants.VERSION, '0.2.0');
""",
"""assert.equal(Cubic.constants.VERSION, '0.2.0');
assert.equal(Pool.constants.VERSION, '0.1.0');
assert.equal(Pool.resolveWorkerCount(0, 8), 4);
assert.equal(Pool.resolveWorkerCount(6, 8), 6);
const partitionProbe = Pool.partitionRun(501, 200, 238, 4);
assert.deepEqual(partitionProbe.map(row => [row.startCursor, row.endCursorExclusive]), [[200,260],[260,320],[320,379],[379,438]]);
assert.equal(partitionProbe.reduce((sum, row) => sum + row.attemptLimit, 0), 238);
""",
'Cubic validator deterministic pool partition')

replace_once(validator,
"""assert.equal(Cubic.validateCheckpoint(resumedWorkerResult.checkpoint, resumedWorkerResult.plan).cursor, 438);

// Raw-ciphertext known-plaintext search:""",
r"""assert.equal(Cubic.validateCheckpoint(resumedWorkerResult.checkpoint, resumedWorkerResult.plan).cursor, 438);

// Four-worker deterministic pool: bounded prefix then fresh pooled resume must preserve the same global cursor semantics.
const poolPlan = Cubic.buildSearchPlan(Cubic.parsePackage(workerPackage), workerSearchOptions);
const singleWorkerPlanId = poolPlan.planId;
const poolPlanDifferentWorkerHint = Cubic.buildSearchPlan(Cubic.parsePackage(workerPackage), { ...workerSearchOptions, workerCount: 8 });
assert.equal(poolPlanDifferentWorkerHint.planId, singleWorkerPlanId, 'Worker count must never enter the deterministic Cubic Plan ID.');
const firstPoolSearch = Pool.startSearch({
  plan: poolPlan,
  source: { kind: 'package', package: workerPackage },
  options: { ...workerSearchOptions, maxAttemptsThisRun: 200 },
  resumeCursor: 0,
  workerCount: 4,
  hardwareConcurrency: 8,
  requestId: 'pool-first',
  workerFactory: () => createWorkerAdapter()
});
const firstPoolResult = await firstPoolSearch.promise;
assert.equal(firstPoolResult.workerCount, 4);
assert.equal(firstPoolResult.cursor, 200);
assert.equal(firstPoolResult.attemptsThisRun, 200);
assert.equal(firstPoolResult.stopReason, 'attempt-budget');
assert.equal(firstPoolResult.exactMatch, null);
assert.deepEqual(firstPoolResult.shards.map(row => row.startCursor), [0,50,100,150]);
assert.deepEqual(firstPoolResult.shards.map(row => row.endCursorExclusive), [50,100,150,200]);
assert.equal(Cubic.validateCheckpoint(firstPoolResult.checkpoint, poolPlan).cursor, 200);

const resumedPoolSearch = Pool.startSearch({
  plan: poolPlan,
  source: { kind: 'package', package: workerPackage },
  options: { ...workerSearchOptions, maxAttemptsThisRun: 300 },
  resumeCursor: firstPoolResult.checkpoint.cursor,
  workerCount: 4,
  hardwareConcurrency: 8,
  requestId: 'pool-resume',
  workerFactory: () => createWorkerAdapter()
});
const resumedPoolResult = await resumedPoolSearch.promise;
assert.equal(resumedPoolResult.planId, singleWorkerPlanId);
assert.equal(resumedPoolResult.workerCount, 4);
assert.equal(resumedPoolResult.stopReason, 'fingerprint-match');
assert.ok(resumedPoolResult.exactMatch);
assert.equal(resumedPoolResult.exactMatch.seed, workerSeed);
assert.equal(resumedPoolResult.exactMatch.ordinal, 437);
assert.equal(resumedPoolResult.exactMatch.keyDigest, workerKey.keyDigest);
assert.equal(resumedPoolResult.cursor, 438, 'Parallel exact-match resolution must commit only the contiguous searched prefix through the earliest exact ordinal.');
assert.equal(resumedPoolResult.attemptsThisRun, 238, 'Four-worker resume must search each ordinal in the committed prefix exactly once for this fixture.');
assert.equal(Cubic.validateCheckpoint(resumedPoolResult.checkpoint, poolPlan).cursor, 438);

// Raw-ciphertext known-plaintext search:""",
'Cubic validator four-worker resume')

replace_once(validator,
"""  'AUTOSAVE_MAX_PLAINTEXT_BITS = 65536'
]) assert.ok(ui.includes(required), `UI is missing ${JSON.stringify(required)}`);
""",
"""  'AUTOSAVE_MAX_PLAINTEXT_BITS = 65536',
  'BinaryCubeCubicDecryptorWorkerPool',
  'bccd-worker-count',
  'Parallel workers',
  'Pool.startSearch',
  'deterministic shard'
]) assert.ok(ui.includes(required), `UI is missing ${JSON.stringify(required)}`);
""",
'Cubic validator pool UI contract')

replace_once(validator,
"""  'candidate.cribMatch',
  \"stopReason = 'attempt-budget'\"
""",
"""  'candidate.cribMatch',
  'ordinal',
  \"stopReason = 'attempt-budget'\"
""",
'Cubic validator worker ordinal contract')

replace_once(validator, "schema: '0.6.0'", "schema: '0.7.0'", 'Cubic worker pool receipt version')
replace_once(validator,
"""    cribSearch: { planId: cribPlanA.planId, recoveredSeed: cribCandidate.seed, matched: cribCandidate.cribMatch, sampleExpanded: cribCandidate.plaintextBits.length >= Buffer.byteLength('KNOWN-PLAINTEXT-CRIB') * 8 }
""",
"""    cribSearch: { planId: cribPlanA.planId, recoveredSeed: cribCandidate.seed, matched: cribCandidate.cribMatch, sampleExpanded: cribCandidate.plaintextBits.length >= Buffer.byteLength('KNOWN-PLAINTEXT-CRIB') * 8 },
    workerPool: { workerCount: resumedPoolResult.workerCount, firstRunCursor: firstPoolResult.cursor, resumedCursor: resumedPoolResult.cursor, recoveredOrdinal: resumedPoolResult.exactMatch.ordinal, deterministicPlanId: resumedPoolResult.planId === singleWorkerPlanId }
""",
'Cubic worker pool validation receipt')

replace_once(scientific_validator,
"""  cubicDecryptorEngine: read('binary-cube-cubic-decryptor-engine.js'),
  cubicDecryptorWorker: read('binary-cube-cubic-decryptor-worker.js'),
""",
"""  cubicDecryptorEngine: read('binary-cube-cubic-decryptor-engine.js'),
  cubicDecryptorPool: read('binary-cube-cubic-decryptor-worker-pool.js'),
  cubicDecryptorWorker: read('binary-cube-cubic-decryptor-worker.js'),
""",
'Scientific ownership Cubic pool source')
replace_once(scientific_validator,
"""checks.push(excludes('Cubic decryptor does not duplicate cube transforms or generators', sources.cubicDecryptorEngine, ['function transformBlockWithKey(', 'function iterativePermutation(', 'function randomWalkPermutation(', 'function nestedPermutation(']));
checks.push(includes('Cubic decryptor worker delegates deterministic attempts', sources.cubicDecryptorWorker,""",
"""checks.push(excludes('Cubic decryptor does not duplicate cube transforms or generators', sources.cubicDecryptorEngine, ['function transformBlockWithKey(', 'function iterativePermutation(', 'function randomWalkPermutation(', 'function nestedPermutation(']));
checks.push(includes('Cubic worker pool owns deterministic ordinal sharding without cryptographic duplication', sources.cubicDecryptorPool, ['BinaryCubeCubicDecryptorWorkerPool', 'function partitionRun(', 'function startSearch(', 'resumeCursor', 'maxAttemptsThisRun', 'earliest exact identity match', 'Cubic.makeCheckpoint(']));
checks.push(excludes('Cubic worker pool does not own key generation or decryption', sources.cubicDecryptorPool, ['generateResearchKey(', 'Engine.decryptBinary(', 'function transformBlockWithKey(']));
checks.push(includes('Cubic decryptor worker delegates deterministic attempts', sources.cubicDecryptorWorker,""",
'Scientific ownership Cubic pool boundary')
replace_once(scientific_validator,
"""  'function loadCubicDecryptor()', 'id=\"scientific-tools-open-diagnostic-pipeline\"',""",
"""  'function loadCubicDecryptor()', \"loadScript('binary-cube-cubic-decryptor-worker-pool.js'\", 'id=\"scientific-tools-open-diagnostic-pipeline\"',""",
'Scientific ownership Cubic pool loader')
replace_once(scientific_validator, "schemaVersion: '0.22.0'", "schemaVersion: '0.23.0'", 'Scientific ownership worker pool receipt')

replace_once(scientific, f"const ASSET_VERSION = '{OLD_VERSION}';", f"const ASSET_VERSION = '{NEW_VERSION}';", 'Scientific Tools worker-pool cache seal')
replace_once('app-lite-view-mounts.js', f"loadScript('scientific-tools-entry.js?v={OLD_VERSION}')", f"loadScript('scientific-tools-entry.js?v={NEW_VERSION}')", 'Top-level worker-pool cache seal')
replace_once(scientific_validator, f"loadScript('scientific-tools-entry.js?v={OLD_VERSION}')", f"loadScript('scientific-tools-entry.js?v={NEW_VERSION}')", 'Scientific validator worker-pool top cache')
replace_once(scientific_validator, f"const ASSET_VERSION = '{OLD_VERSION}';", f"const ASSET_VERSION = '{NEW_VERSION}';", 'Scientific validator worker-pool cache')

print('Deterministic Cubic worker pool integration applied or already present.')
