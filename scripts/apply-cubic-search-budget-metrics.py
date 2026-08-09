#!/usr/bin/env python3
from pathlib import Path

OLD_VERSION = '20260809-cubic-decryptor-hardening-2'
NEW_VERSION = '20260809-cubic-decryptor-hardening-3'


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


ui = 'binary-cube-cubic-decryptor.js'
worker = 'binary-cube-cubic-decryptor-worker.js'
validator = 'scripts/validate-binary-cube-cubic-decryptor.mjs'
scientific_validator = 'scripts/validate-scientific-tools-extraction.mjs'

replace_once(ui,
"""  let candidates = [];
  let running = false;

  const esc = value => String(value ?? '').replace(/[&<>\"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '\"': '&quot;', \"'\": '&#39;' }[character]));
  const pct = value => Number.isFinite(Number(value)) ? `${(Number(value) * 100).toFixed(2)}%` : '—';
  const num = (value, digits = 3) => Number.isFinite(Number(value)) ? Number(value).toFixed(digits) : '—';
""",
"""  let candidates = [];
  let running = false;
  let measuredAttemptsPerSecond = 0;

  const esc = value => String(value ?? '').replace(/[&<>\"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '\"': '&quot;', \"'\": '&#39;' }[character]));
  const pct = value => Number.isFinite(Number(value)) ? `${(Number(value) * 100).toFixed(2)}%` : '—';
  const num = (value, digits = 3) => Number.isFinite(Number(value)) ? Number(value).toFixed(digits) : '—';
  function formatDuration(secondsValue) {
    const seconds = Number(secondsValue);
    if (!Number.isFinite(seconds) || seconds < 0) return '—';
    if (seconds < 1) return '<1 s';
    if (seconds < 60) return `${seconds.toFixed(seconds < 10 ? 1 : 0)} s`;
    const minutes = seconds / 60;
    if (minutes < 60) return `${minutes.toFixed(minutes < 10 ? 1 : 0)} min`;
    const hours = minutes / 60;
    if (hours < 48) return `${hours.toFixed(hours < 10 ? 1 : 0)} h`;
    const days = hours / 24;
    return `${days.toFixed(days < 10 ? 1 : 0)} d`;
  }
""",
'Cubic performance state and duration formatter')

replace_once(ui,
"""      sampleBlocks: Number(panel.querySelector('#bccd-sample-blocks').value) || 1,
      progressEvery: 256
""",
"""      sampleBlocks: Number(panel.querySelector('#bccd-sample-blocks').value) || 1,
      maxAttemptsThisRun: Math.max(0, Math.floor(Number(panel.querySelector('#bccd-attempt-budget').value) || 0)),
      progressEvery: 256
""",
'Cubic run budget option')

replace_once(ui,
"""    latestPlan = null; latestCheckpoint = null; candidates = [];
""",
"""    latestPlan = null; latestCheckpoint = null; candidates = []; measuredAttemptsPerSecond = 0;
""",
'Cubic source reset throughput')

replace_once(ui,
"""    const rows = plan.stages.map((stage, index) => `<tr><td>${index + 1}</td><td>${esc(stage.profileLabel)}</td><td>${esc(stage.tierLabel)}</td><td>${stage.gridSizes.join(', ')}</td><td>${stage.attempts.toLocaleString()}</td></tr>`).join('');
    target.innerHTML = `<div class=\"bccd-plan-summary\"><div><span>Plan ID</span><strong><code>${plan.planId}</code></strong></div><div><span>Stages</span><strong>${plan.stages.length}</strong></div><div><span>Total candidates</span><strong>${plan.totalAttempts.toLocaleString()}</strong></div><div><span>Seed domain</span><strong>${plan.seedStart.toLocaleString()}…${plan.seedEnd.toLocaleString()}</strong></div></div><div class=\"bccd-table-scroll\"><table><thead><tr><th>Stage</th><th>Generator</th><th>Cube tier</th><th>Grid sizes</th><th>Attempts</th></tr></thead><tbody>${rows}</tbody></table></div><p class=\"bccd-muted\">Search order is deterministic: stage → grid size → geometry → mask capacity → fixed seeds → numeric seed counter → seed template.</p>`;
""",
"""    const budget = Math.max(0, Math.floor(Number(panel.querySelector('#bccd-attempt-budget')?.value) || 0));
    const rows = plan.stages.map((stage, index) => `<tr><td>${index + 1}</td><td>${esc(stage.profileLabel)}</td><td>${esc(stage.tierLabel)}</td><td>${stage.gridSizes.join(', ')}</td><td>${stage.attempts.toLocaleString()}</td><td data-bccd-stage-runtime=\"${index}\">${measuredAttemptsPerSecond > 0 ? formatDuration(stage.attempts / measuredAttemptsPerSecond) : 'measure during run'}</td></tr>`).join('');
    const passCount = budget ? Math.ceil(plan.totalAttempts / budget) : 1;
    target.innerHTML = `<div class=\"bccd-plan-summary\"><div><span>Plan ID</span><strong><code>${plan.planId}</code></strong></div><div><span>Stages</span><strong>${plan.stages.length}</strong></div><div><span>Total candidates</span><strong>${plan.totalAttempts.toLocaleString()}</strong></div><div><span>Seed domain</span><strong>${plan.seedStart.toLocaleString()}…${plan.seedEnd.toLocaleString()}</strong></div><div><span>Run budget</span><strong>${budget ? `${budget.toLocaleString()} attempts · ${passCount.toLocaleString()} pass${passCount === 1 ? '' : 'es'} minimum` : 'unlimited'}</strong></div><div><span>Measured plan runtime</span><strong data-bccd-total-runtime>${measuredAttemptsPerSecond > 0 ? formatDuration(plan.totalAttempts / measuredAttemptsPerSecond) : 'measure during run'}</strong></div></div><div class=\"bccd-table-scroll\"><table><thead><tr><th>Stage</th><th>Generator</th><th>Cube tier</th><th>Grid sizes</th><th>Attempts</th><th>Est. runtime</th></tr></thead><tbody>${rows}</tbody></table></div><p class=\"bccd-muted\">Search order is deterministic: stage → grid size → geometry → mask capacity → fixed seeds → numeric seed counter → seed template. The per-run budget controls session length only and is deliberately excluded from the deterministic Plan ID.</p>`;
  }

  function updatePlanRuntimeEstimates() {
    if (!latestPlan || !(measuredAttemptsPerSecond > 0)) return;
    latestPlan.stages.forEach((stage, index) => { const node = panel.querySelector(`[data-bccd-stage-runtime=\"${index}\"]`); if (node) node.textContent = formatDuration(stage.attempts / measuredAttemptsPerSecond); });
    const total = panel.querySelector('[data-bccd-total-runtime]');
    if (total) total.textContent = formatDuration(latestPlan.totalAttempts / measuredAttemptsPerSecond);
""",
'Cubic plan runtime estimates')

replace_once(ui,
"""  function updateProgress(message) {
    const meter = panel.querySelector('[data-bccd-progress]');
    meter.value = Math.max(0, Math.min(1, Number(message.fraction) || 0));
    panel.querySelector('[data-bccd-progress-label]').textContent = `${message.stage || 'Searching'} · ${(meter.value * 100).toFixed(2)}%`;
    panel.querySelector('[data-bccd-runtime]').innerHTML = `<span>Cursor <strong>${Number(message.cursor || 0).toLocaleString()}</strong></span><span>Attempts this run <strong>${Number(message.attemptsThisRun || 0).toLocaleString()}</strong></span><span>Candidates <strong>${Number(message.candidates ?? candidates.length).toLocaleString()}</strong></span><span>Elapsed <strong>${((performance.now() - startedAt) / 1000).toFixed(1)} s</strong></span>`;
    if (message.checkpoint) { latestCheckpoint = message.checkpoint; renderCheckpoint(); }
  }
""",
"""  function updateProgress(message) {
    const meter = panel.querySelector('[data-bccd-progress]');
    meter.value = Math.max(0, Math.min(1, Number(message.fraction) || 0));
    panel.querySelector('[data-bccd-progress-label]').textContent = `${message.stage || 'Searching'} · ${(meter.value * 100).toFixed(2)}%`;
    const elapsedMilliseconds = Number(message.elapsedMilliseconds) > 0 ? Number(message.elapsedMilliseconds) : Math.max(0, performance.now() - startedAt);
    const attemptsThisRun = Number(message.attemptsThisRun || 0);
    const reportedRate = Number(message.attemptsPerSecond);
    const rate = Number.isFinite(reportedRate) && reportedRate > 0 ? reportedRate : elapsedMilliseconds > 0 && attemptsThisRun > 0 ? attemptsThisRun * 1000 / elapsedMilliseconds : measuredAttemptsPerSecond;
    if (Number.isFinite(rate) && rate > 0) { measuredAttemptsPerSecond = rate; updatePlanRuntimeEstimates(); }
    const totalAttempts = Number(message.totalAttempts || latestPlan?.totalAttempts || 0);
    const cursor = Number(message.cursor || 0);
    const remaining = Math.max(0, totalAttempts - cursor);
    const eta = measuredAttemptsPerSecond > 0 ? remaining / measuredAttemptsPerSecond : NaN;
    panel.querySelector('[data-bccd-runtime]').innerHTML = `<span>Cursor <strong>${cursor.toLocaleString()}</strong></span><span>Attempts this run <strong>${attemptsThisRun.toLocaleString()}</strong></span><span>Candidates <strong>${Number(message.candidates ?? candidates.length).toLocaleString()}</strong></span><span>Elapsed <strong>${formatDuration(elapsedMilliseconds / 1000)}</strong></span><span>Attempts / second <strong>${measuredAttemptsPerSecond > 0 ? Math.round(measuredAttemptsPerSecond).toLocaleString() : '—'}</strong></span><span>Estimated remaining <strong>${formatDuration(eta)}</strong></span>`;
    if (message.checkpoint) { latestCheckpoint = message.checkpoint; renderCheckpoint(); }
  }
""",
'Cubic measured throughput and ETA')

replace_once(ui,
"""          const result = message.result; latestPlan = result.plan; latestCheckpoint = result.checkpoint; candidates = result.candidates || candidates; renderPlan(latestPlan); renderCheckpoint(); renderCandidates(); updateProgress({ stage: result.exactMatch ? 'Exact fingerprint candidate found' : result.exhausted ? 'Search exhausted' : 'Search stopped', fraction: latestPlan.totalAttempts ? result.cursor / latestPlan.totalAttempts : 1, cursor: result.cursor, attemptsThisRun: result.attemptsThisRun, candidates: candidates.length, checkpoint: result.checkpoint });
          setStatus(result.exactMatch ? `Stopped on package key identity match after ${result.attemptsThisRun.toLocaleString()} attempts.` : result.exhausted ? `Search exhausted after ${result.attemptsThisRun.toLocaleString()} attempts in this run.` : 'Search stopped.', result.exactMatch ? 'success' : 'warning');
""",
"""          const result = message.result; latestPlan = result.plan; latestCheckpoint = result.checkpoint; candidates = result.candidates || candidates; renderPlan(latestPlan); renderCheckpoint(); renderCandidates(); updateProgress({ stage: result.exactMatch ? 'Exact key identity found' : result.exhausted ? 'Search exhausted' : result.stopReason === 'attempt-budget' ? 'Run attempt budget reached' : 'Search stopped', fraction: latestPlan.totalAttempts ? result.cursor / latestPlan.totalAttempts : 1, cursor: result.cursor, attemptsThisRun: result.attemptsThisRun, candidates: candidates.length, checkpoint: result.checkpoint, elapsedMilliseconds: result.elapsedMilliseconds, attemptsPerSecond: result.attemptsPerSecond, totalAttempts: latestPlan.totalAttempts });
          setStatus(result.exactMatch ? `Stopped on package key identity match after ${result.attemptsThisRun.toLocaleString()} attempts.` : result.exhausted ? `Search exhausted after ${result.attemptsThisRun.toLocaleString()} attempts in this run.` : result.stopReason === 'attempt-budget' ? `Run budget reached at deterministic cursor ${result.cursor.toLocaleString()}. Run again to resume without replaying completed attempts.` : 'Search stopped.', result.exactMatch ? 'success' : 'warning');
""",
'Cubic bounded-run result status and metrics')

replace_once(ui,
"""    terminateWorker('search reset'); latestCheckpoint = null; candidates = []; renderCheckpoint(); renderCandidates(); panel.querySelector('[data-bccd-progress]').value = 0; panel.querySelector('[data-bccd-progress-label]').textContent = 'Idle'; setStatus('Search cursor and retained candidates reset.');
""",
"""    terminateWorker('search reset'); latestCheckpoint = null; candidates = []; measuredAttemptsPerSecond = 0; renderCheckpoint(); renderCandidates(); panel.querySelector('[data-bccd-progress]').value = 0; panel.querySelector('[data-bccd-progress-label]').textContent = 'Idle'; setStatus('Search cursor, measured throughput, and retained candidates reset.');
""",
'Cubic reset throughput')

replace_once(ui,
"""<div class=\"bccd-grid\"><label>Raw score threshold<input id=\"bccd-score-threshold\" type=\"number\" min=\"0\" max=\"100\" value=\"32\"></label><label>Top candidates<input id=\"bccd-result-limit\" type=\"number\" min=\"1\" max=\"100\" value=\"24\"></label><label>Raw sample blocks<input id=\"bccd-sample-blocks\" type=\"number\" min=\"1\" max=\"16\" value=\"1\"></label></div><label class=\"bccd-inline\"><input id=\"bccd-stop-exact\" type=\"checkbox\" checked> Stop when package key fingerprint matches</label>""",
"""<div class=\"bccd-grid\"><label>Raw score threshold<input id=\"bccd-score-threshold\" type=\"number\" min=\"0\" max=\"100\" value=\"32\"></label><label>Top candidates<input id=\"bccd-result-limit\" type=\"number\" min=\"1\" max=\"100\" value=\"24\"></label><label>Raw sample blocks<input id=\"bccd-sample-blocks\" type=\"number\" min=\"1\" max=\"16\" value=\"1\"></label><label>Attempt budget / run<input id=\"bccd-attempt-budget\" type=\"number\" min=\"0\" step=\"1000\" value=\"250000\"></label></div><p class=\"bccd-muted\">The attempt budget limits one worker session; 0 means unlimited. Reaching the budget produces a normal deterministic checkpoint so the next run resumes without changing the Plan ID.</p><label class=\"bccd-inline\"><input id=\"bccd-stop-exact\" type=\"checkbox\" checked> Stop when package key identity matches</label>""",
'Cubic attempt budget control')

replace_once(ui,
"""<div data-bccd-runtime class=\"bccd-runtime\"><span>Cursor <strong>0</strong></span><span>Attempts this run <strong>0</strong></span><span>Candidates <strong>0</strong></span><span>Elapsed <strong>0.0 s</strong></span></div>""",
"""<div data-bccd-runtime class=\"bccd-runtime\"><span>Cursor <strong>0</strong></span><span>Attempts this run <strong>0</strong></span><span>Candidates <strong>0</strong></span><span>Elapsed <strong>0 s</strong></span><span>Attempts / second <strong>—</strong></span><span>Estimated remaining <strong>—</strong></span></div>""",
'Cubic runtime metrics initial UI')

replace_once(worker,
"""              if (attemptsThisRun === 1 || attemptsThisRun % progressEvery === 0) {
                postProgress(id, {
                  stage: `${stage.profileLabel} · ${stage.tierLabel} · ${gridSize}³ candidate space`,
                  stageId: stage.id,
                  fraction: plan.totalAttempts ? cursor / plan.totalAttempts : 1,
                  cursor,
                  attemptsThisRun,
                  totalAttempts: plan.totalAttempts,
                  candidates: candidates.length,
                  elapsedMilliseconds: Date.now() - startedAt,
                  planId: plan.planId,
""",
"""              if (attemptsThisRun === 1 || attemptsThisRun % progressEvery === 0) {
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
""",
'Cubic worker throughput progress')

replace_once(worker,
"""    const exhausted = !stoppedEarly && cursor >= plan.totalAttempts;
    const checkpoint = Cubic.makeCheckpoint(plan, cursor, attemptsThisRun, activeStageId);
    self.postMessage({
""",
"""    const exhausted = !stoppedEarly && cursor >= plan.totalAttempts;
    const checkpoint = Cubic.makeCheckpoint(plan, cursor, attemptsThisRun, activeStageId);
    const elapsedMilliseconds = Date.now() - startedAt;
    self.postMessage({
""",
'Cubic worker result elapsed metric')

replace_once(worker,
"""        errors,
        elapsedMilliseconds: Date.now() - startedAt,
        checkpoint,
""",
"""        errors,
        elapsedMilliseconds,
        attemptsPerSecond: elapsedMilliseconds > 0 ? attemptsThisRun * 1000 / elapsedMilliseconds : 0,
        checkpoint,
""",
'Cubic worker result throughput')

replace_once(validator,
"""assert.equal(firstWorkerResult.attemptsThisRun, 200, 'First bounded worker run must execute exactly its attempt budget');
assert.equal(firstWorkerResult.stoppedEarly, true);
""",
"""assert.equal(firstWorkerResult.attemptsThisRun, 200, 'First bounded worker run must execute exactly its attempt budget');
assert.ok(Number.isFinite(firstWorkerResult.attemptsPerSecond) && firstWorkerResult.attemptsPerSecond >= 0, 'Bounded worker result must expose measured attempts/second.');
assert.equal(firstWorkerResult.stoppedEarly, true);
""",
'Cubic validator throughput result')

replace_once(validator,
"""  'Information.analyzeInformation'
]) assert.ok(ui.includes(required), `UI is missing ${JSON.stringify(required)}`);
""",
"""  'Information.analyzeInformation',
  'bccd-attempt-budget',
  'Attempts / second',
  'Estimated remaining',
  'formatDuration(',
  'updatePlanRuntimeEstimates('
]) assert.ok(ui.includes(required), `UI is missing ${JSON.stringify(required)}`);
""",
'Cubic validator performance UI contract')

replace_once(validator,
"""  'maxAttemptsThisRun',
  \"stopReason = 'attempt-budget'\"
""",
"""  'maxAttemptsThisRun',
  'attemptsPerSecond',
  \"stopReason = 'attempt-budget'\"
""",
'Cubic validator worker throughput contract')

replace_once(validator, "schema: '0.3.0'", "schema: '0.4.0'", 'Cubic performance receipt version')

replace_once('scientific-tools-entry.js', f"const ASSET_VERSION = '{OLD_VERSION}';", f"const ASSET_VERSION = '{NEW_VERSION}';", 'Scientific Tools performance cache seal')
replace_once('app-lite-view-mounts.js', f"loadScript('scientific-tools-entry.js?v={OLD_VERSION}')", f"loadScript('scientific-tools-entry.js?v={NEW_VERSION}')", 'Top-level performance cache seal')
replace_once(scientific_validator, f"loadScript('scientific-tools-entry.js?v={OLD_VERSION}')", f"loadScript('scientific-tools-entry.js?v={NEW_VERSION}')", 'Scientific Tools validator performance top cache')
replace_once(scientific_validator, f"const ASSET_VERSION = '{OLD_VERSION}';", f"const ASSET_VERSION = '{NEW_VERSION}';", 'Scientific Tools validator performance cache')
replace_once(scientific_validator, "schemaVersion: '0.19.0'", "schemaVersion: '0.20.0'", 'Scientific Tools performance ownership receipt')

print('Cubic deterministic search budget and performance metrics applied or already present.')
