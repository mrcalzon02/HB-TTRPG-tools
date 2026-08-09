#!/usr/bin/env python3
from pathlib import Path

OLD_VERSION = '20260809-cubic-decryptor-hardening-6'
NEW_VERSION = '20260809-cubic-decryptor-hardening-7'


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

pool = 'binary-cube-cubic-decryptor-worker-pool.js'
ui = 'binary-cube-cubic-decryptor.js'
validator = 'scripts/validate-binary-cube-cubic-decryptor.mjs'
scientific_validator = 'scripts/validate-scientific-tools-extraction.mjs'

replace_once(pool,
"""    const options = { ...(config.options || {}) };
    const resumeCursor = clampInteger(config.resumeCursor, 0, plan.totalAttempts);
""",
"""    const options = { ...(config.options || {}) };
    const stopOnFingerprint = options.stopOnFingerprint !== false;
    const resumeCursor = clampInteger(config.resumeCursor, 0, plan.totalAttempts);
""",
'Pool explicit stop-on-fingerprint semantics')

replace_once(pool,
"""      if (exactMatch) {
        cursor = contiguousCursor();
        exhausted = false;
        stoppedEarly = true;
        stopReason = 'fingerprint-match';
      } else {
""",
"""      if (exactMatch && stopOnFingerprint) {
        cursor = contiguousCursor();
        exhausted = false;
        stoppedEarly = true;
        stopReason = 'fingerprint-match';
      } else {
""",
'Pool final result respects stop toggle')

replace_once(pool,
"""        caveat: exactMatch
          ? 'Parallel workers searched disjoint global ordinal ranges. The result is resolved only after every lower ordinal shard is complete, so the retained exact key is the earliest exact identity match in the searched prefix.'
          : 'Parallel workers searched one deterministic, contiguous bounded cursor interval. Worker count changes elapsed time only; the Plan ID and resulting checkpoint cursor are independent of shard count.'
""",
"""        caveat: exactMatch && stopOnFingerprint
          ? 'Parallel workers searched disjoint global ordinal ranges. The result is resolved only after every lower ordinal shard is complete, so the retained exact key is the earliest exact identity match in the searched prefix.'
          : exactMatch
            ? 'An exact key identity was observed, but stop-on-identity was disabled. The pool completed the entire assigned deterministic interval before checkpointing.'
            : 'Parallel workers searched one deterministic, contiguous bounded cursor interval. Worker count changes elapsed time only; the Plan ID and resulting checkpoint cursor are independent of shard count.'
""",
'Pool exact-match caveat without stopping')

replace_once(pool,
"""      if (exactMatch) {
        const required = requiredStatesForExact();
""",
"""      if (exactMatch && stopOnFingerprint) {
        const required = requiredStatesForExact();
""",
'Pool early finish respects stop toggle')

replace_once(pool,
"""        if (settled && !exactMatch) return;
""",
"""        if (settled) return;
""",
'Pool ignores all messages after settlement')

replace_once(pool,
"""          if (exactMatch) {
            for (const higher of states) if (higher.shard.startCursor > exactOrdinal && !higher.result) terminateState(higher);
          }
""",
"""          if (exactMatch && stopOnFingerprint) {
            for (const higher of states) if (higher.shard.startCursor > exactOrdinal && !higher.result) terminateState(higher);
          }
""",
'Pool termination respects stop toggle')

replace_once(ui,
"""  let autosaveDbPromise = null;
""",
"""  let autosaveDbPromise = null;
  let benchmarkRecommendation = null;
""",
'Cubic benchmark state')

replace_once(ui,
"""  function sourceForWorker() {
    if (!activeSource) fail('Load a Binary Cube package or raw ciphertext first.');
    if (activeSource.kind === 'package') return { kind: 'package', package: activeSource.package };
    return { kind: 'raw', bits: activeSource.bits, framing: { ...(activeSource.framing || {}), ...manualFraming() } };
  }
""",
"""  function sourceForWorker() {
    if (!activeSource) fail('Load a Binary Cube package or raw ciphertext first.');
    if (activeSource.kind === 'package') return { kind: 'package', package: activeSource.package };
    return { kind: 'raw', bits: activeSource.bits, framing: { ...(activeSource.framing || {}), ...manualFraming() } };
  }

  function sourceForBenchmark() {
    if (!activeSource) fail('Load ciphertext before benchmarking workers.');
    if (activeSource.kind === 'package') {
      const artifact = activeSource.package;
      return {
        kind: 'raw',
        bits: activeSource.bits,
        framing: {
          sourceName: `${activeSourceName || 'package'} · raw benchmark view`,
          inputFace: artifact.inputFace,
          outputFace: artifact.outputFace,
          inputQuarterTurns: Number(artifact.inputQuarterTurns) || 0,
          outputQuarterTurns: Number(artifact.outputQuarterTurns) || 0,
          payloadCapacity: Number(artifact.payloadCapacity) || null,
          originalBitLength: Number(artifact.originalBitLength) || null
        }
      };
    }
    return { kind: 'raw', bits: activeSource.bits, framing: { ...(activeSource.framing || {}), ...manualFraming(), sourceName: `${activeSourceName || 'raw'} · benchmark` } };
  }
""",
'Cubic benchmark raw source')

replace_once(ui,
"""  function pauseSearch() {
""",
"""  function renderBenchmark(rows = [], status = '') {
    const target = panel.querySelector('[data-bccd-benchmark]');
    if (!target) return;
    if (!rows.length) { target.innerHTML = `<p class=\"bccd-muted\">${esc(status || 'No worker benchmark has been run for this source.')}</p>`; return; }
    const baseline = Math.max(1e-9, Number(rows[0]?.attemptsPerSecond) || 0);
    const best = rows.reduce((winner, row) => !winner || row.attemptsPerSecond > winner.attemptsPerSecond ? row : winner, null);
    benchmarkRecommendation = best?.workerCount || null;
    target.innerHTML = `<div class=\"bccd-plan-summary\"><div><span>Recommended workers</span><strong>${benchmarkRecommendation || '—'}</strong></div><div><span>Best throughput</span><strong>${best ? `${Math.round(best.attemptsPerSecond).toLocaleString()} attempts/s` : '—'}</strong></div><div><span>Benchmark interval</span><strong>${rows[0]?.attempts?.toLocaleString() || '—'} attempts / run</strong></div></div><div class=\"bccd-table-scroll\"><table><thead><tr><th>Workers</th><th>Attempts</th><th>Elapsed</th><th>Attempts/s</th><th>Speedup</th><th>Efficiency</th></tr></thead><tbody>${rows.map(row => { const speedup = baseline > 0 ? row.attemptsPerSecond / baseline : 0; const efficiency = row.workerCount > 0 ? speedup / row.workerCount : 0; return `<tr><td>${row.workerCount}</td><td>${row.attempts.toLocaleString()}</td><td>${formatDuration(row.elapsedMilliseconds / 1000)}</td><td>${Math.round(row.attemptsPerSecond).toLocaleString()}</td><td>${speedup.toFixed(2)}×</td><td>${pct(efficiency)}</td></tr>`; }).join('')}</tbody></table></div><p class=\"bccd-muted\">${esc(status || 'Measured in this browser on the currently loaded ciphertext. Wall-clock scaling is hardware/runtime specific; it does not alter the deterministic search plan.')}</p>`;
  }

  async function benchmarkWorkers() {
    if (running) fail('Pause the active decryptor search before benchmarking workers.');
    const benchmarkButton = panel.querySelector('[data-bccd-benchmark-workers]');
    const applyButton = panel.querySelector('[data-bccd-apply-worker-recommendation]');
    benchmarkButton.disabled = true;
    applyButton.disabled = true;
    benchmarkRecommendation = null;
    const baseOptions = optionsFromControls();
    const rawSource = sourceForBenchmark();
    const selected = selectedProfiles();
    const benchmarkOptions = {
      ...baseOptions,
      profiles: selected.length ? [selected[0]] : ['direct-permutation'],
      usePackageMetadata: false,
      stopOnFingerprint: false,
      scoreThreshold: 100,
      resultLimit: 1,
      cribMode: 'none',
      cribValue: '',
      maxAttemptsThisRun: Math.max(100, Math.floor(Number(panel.querySelector('#bccd-benchmark-attempts').value) || 4000))
    };
    const normalizedSource = Cubic.sourceFromRaw(rawSource.bits, rawSource.framing);
    const plan = Cubic.buildSearchPlan(normalizedSource, benchmarkOptions);
    if (!plan.totalAttempts) fail('No benchmarkable candidate space exists for the current source and selected generator.');
    const counts = [1, 2, 4, 8].filter(count => count <= Pool.constants.MAX_WORKERS && count <= plan.totalAttempts);
    const rows = [];
    try {
      for (const count of counts) {
        setStatus(`Benchmarking ${count} Cubic worker${count === 1 ? '' : 's'}…`);
        renderBenchmark(rows, `Running ${count}-worker benchmark…`);
        const search = Pool.startSearch({
          plan,
          source: rawSource,
          options: benchmarkOptions,
          resumeCursor: 0,
          workerCount: count,
          hardwareConcurrency: Math.max(1, Number(navigator.hardwareConcurrency) || 2),
          requestId: `benchmark-${Date.now()}-${count}`,
          workerFactory: () => new Worker(new URL(WORKER_URL, document.baseURI).href)
        });
        const result = await search.promise;
        rows.push({ workerCount: count, attempts: result.attemptsThisRun, elapsedMilliseconds: result.elapsedMilliseconds, attemptsPerSecond: result.attemptsPerSecond });
      }
      renderBenchmark(rows, 'Recommendation is the highest measured attempts/second for this browser and ciphertext. Re-run after major hardware/browser changes.');
      applyButton.disabled = !benchmarkRecommendation;
      setStatus(`Worker benchmark complete · recommended ${benchmarkRecommendation || '—'} worker${benchmarkRecommendation === 1 ? '' : 's'}.`, 'success');
      return rows;
    } finally {
      benchmarkButton.disabled = false;
    }
  }

  function applyWorkerRecommendation() {
    if (!benchmarkRecommendation) fail('Run the worker benchmark first.');
    panel.querySelector('#bccd-worker-count').value = String(benchmarkRecommendation);
    setStatus(`Applied ${benchmarkRecommendation} workers as the explicit pool size. This does not change the deterministic Plan ID.`, 'success');
  }

  function pauseSearch() {
""",
'Cubic worker benchmark functions')

replace_once(ui,
"""<p class=\"bccd-muted\">The attempt budget limits one pooled session; 0 means unlimited. Worker count 0 selects an automatic pool of up to four workers while preserving one deterministic global ordinal sequence. Reaching the budget produces a normal contiguous checkpoint, and worker count is deliberately excluded from the Plan ID.</p><label class=\"bccd-inline\"><input id=\"bccd-stop-exact\" type=\"checkbox\" checked> Stop when package key identity matches</label>""",
"""<p class=\"bccd-muted\">The attempt budget limits one pooled session; 0 means unlimited. Worker count 0 selects an automatic pool of up to four workers while preserving one deterministic global ordinal sequence. Reaching the budget produces a normal contiguous checkpoint, and worker count is deliberately excluded from the Plan ID.</p><div class=\"bccd-grid\"><label>Benchmark attempts / worker-count test<input id=\"bccd-benchmark-attempts\" type=\"number\" min=\"100\" step=\"100\" value=\"4000\"></label></div><div class=\"bccd-actions\"><button type=\"button\" data-bccd-benchmark-workers>Benchmark 1 / 2 / 4 / 8 workers</button><button type=\"button\" data-bccd-apply-worker-recommendation disabled>Apply recommendation</button></div><div data-bccd-benchmark><p class=\"bccd-muted\">No worker benchmark has been run for this source.</p></div><label class=\"bccd-inline\"><input id=\"bccd-stop-exact\" type=\"checkbox\" checked> Stop when package key identity matches</label>""",
'Cubic worker benchmark UI')

replace_once(ui,
"""    target.querySelector('[data-bccd-start]').addEventListener('click', () => void runSearch().catch(error => { if (error?.name !== 'AbortError') setStatus(error.message, 'error'); }));
    target.querySelector('[data-bccd-pause]').addEventListener('click', pauseSearch);
""",
"""    target.querySelector('[data-bccd-start]').addEventListener('click', () => void runSearch().catch(error => { if (error?.name !== 'AbortError') setStatus(error.message, 'error'); }));
    target.querySelector('[data-bccd-pause]').addEventListener('click', pauseSearch);
    target.querySelector('[data-bccd-benchmark-workers]').addEventListener('click', () => void benchmarkWorkers().catch(error => setStatus(error.message, 'error')));
    target.querySelector('[data-bccd-apply-worker-recommendation]').addEventListener('click', () => { try { applyWorkerRecommendation(); } catch (error) { setStatus(error.message, 'error'); } });
""",
'Cubic worker benchmark bindings')

replace_once(validator,
"""assert.equal(Cubic.validateCheckpoint(resumedPoolResult.checkpoint, poolPlan).cursor, 438);

// Raw-ciphertext known-plaintext search:""",
"""assert.equal(Cubic.validateCheckpoint(resumedPoolResult.checkpoint, poolPlan).cursor, 438);

// Disabling stop-on-identity must preserve the entire assigned pooled interval even when an exact key is observed.
const nonStoppingPool = Pool.startSearch({
  plan: poolPlan,
  source: { kind: 'package', package: workerPackage },
  options: { ...workerSearchOptions, stopOnFingerprint: false, maxAttemptsThisRun: 500 },
  resumeCursor: 0,
  workerCount: 4,
  hardwareConcurrency: 8,
  requestId: 'pool-no-early-stop',
  workerFactory: () => createWorkerAdapter()
});
const nonStoppingPoolResult = await nonStoppingPool.promise;
assert.ok(nonStoppingPoolResult.exactMatch, 'The pool must still report an observed exact key identity when stop-on-identity is disabled.');
assert.equal(nonStoppingPoolResult.exactMatch.seed, workerSeed);
assert.equal(nonStoppingPoolResult.cursor, 500, 'stopOnFingerprint=false must complete the entire assigned interval instead of truncating at the exact key.');
assert.equal(nonStoppingPoolResult.attemptsThisRun, 500);
assert.equal(nonStoppingPoolResult.stopReason, 'attempt-budget');

// Raw-ciphertext known-plaintext search:""",
'Cubic validator pool non-stopping semantics')

replace_once(validator,
"""  'deterministic shard'
]) assert.ok(ui.includes(required), `UI is missing ${JSON.stringify(required)}`);
""",
"""  'deterministic shard',
  'Benchmark 1 / 2 / 4 / 8 workers',
  'benchmarkWorkers(',
  'Apply recommendation',
  'parallel efficiency'
]) assert.ok(ui.includes(required), `UI is missing ${JSON.stringify(required)}`);
""",
'Cubic validator benchmark UI contract')

replace_once(validator, "schema: '0.7.0'", "schema: '0.8.0'", 'Cubic worker benchmark receipt version')
replace_once(validator,
"""    workerPool: { workerCount: resumedPoolResult.workerCount, firstRunCursor: firstPoolResult.cursor, resumedCursor: resumedPoolResult.cursor, recoveredOrdinal: resumedPoolResult.exactMatch.ordinal, deterministicPlanId: resumedPoolResult.planId === singleWorkerPlanId }
""",
"""    workerPool: { workerCount: resumedPoolResult.workerCount, firstRunCursor: firstPoolResult.cursor, resumedCursor: resumedPoolResult.cursor, recoveredOrdinal: resumedPoolResult.exactMatch.ordinal, deterministicPlanId: resumedPoolResult.planId === singleWorkerPlanId, nonStoppingExactCursor: nonStoppingPoolResult.cursor }
""",
'Cubic worker benchmark validation receipt')

replace_once('scientific-tools-entry.js', f"const ASSET_VERSION = '{OLD_VERSION}';", f"const ASSET_VERSION = '{NEW_VERSION}';", 'Scientific Tools worker benchmark cache seal')
replace_once('app-lite-view-mounts.js', f"loadScript('scientific-tools-entry.js?v={OLD_VERSION}')", f"loadScript('scientific-tools-entry.js?v={NEW_VERSION}')", 'Top-level worker benchmark cache seal')
replace_once(scientific_validator, f"loadScript('scientific-tools-entry.js?v={OLD_VERSION}')", f"loadScript('scientific-tools-entry.js?v={NEW_VERSION}')", 'Scientific validator benchmark top cache')
replace_once(scientific_validator, f"const ASSET_VERSION = '{OLD_VERSION}';", f"const ASSET_VERSION = '{NEW_VERSION}';", 'Scientific validator benchmark cache')
replace_once(scientific_validator, "schemaVersion: '0.23.0'", "schemaVersion: '0.24.0'", 'Scientific ownership benchmark receipt')

print('Cubic worker stop semantics and scaling benchmark applied or already present.')
