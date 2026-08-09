(() => {
  'use strict';

  const PANEL_ID = 'binary-cube-cubic-decryptor';
  const WORKER_URL = 'binary-cube-cubic-decryptor-worker.js?v=20260809-cubic-decryptor-1';
  const Cubic = window.BinaryCubeCubicDecryptorEngine;
  const Dashboard = window.BinaryCubeDecryptionDashboard;
  const Engine = window.ShadowrunBinaryCubeEngine;
  if (!Cubic) throw new Error('Cubic Decryptor Tool requires BinaryCubeCubicDecryptorEngine.');
  if (!Dashboard) throw new Error('Cubic Decryptor Tool requires BinaryCubeDecryptionDashboard for authoritative source parsing.');
  if (!Engine) throw new Error('Cubic Decryptor Tool requires ShadowrunBinaryCubeEngine.');

  let panel = null;
  let activeSource = null;
  let activeSourceName = '';
  let activeWorker = null;
  let activeReject = null;
  let requestId = 0;
  let heartbeat = 0;
  let startedAt = 0;
  let latestPlan = null;
  let latestCheckpoint = null;
  let candidates = [];
  let running = false;
  let measuredAttemptsPerSecond = 0;

  const esc = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
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
  function fail(message) { throw new Error(message); }
  function setStatus(message, kind = '') { const node = panel?.querySelector('[data-bccd-status]'); if (node) { node.textContent = message; node.dataset.kind = kind; } }

  function stopHeartbeat() { if (heartbeat) window.clearInterval(heartbeat); heartbeat = 0; }
  function terminateWorker(reason = 'cancelled') {
    const reject = activeReject;
    stopHeartbeat();
    if (activeWorker) activeWorker.terminate();
    activeWorker = null; activeReject = null; running = false; requestId += 1;
    if (reject) { const error = new Error(reason); error.name = 'AbortError'; reject(error); }
    if (panel) {
      panel.querySelector('[data-bccd-start]').disabled = !activeSource;
      panel.querySelector('[data-bccd-pause]').disabled = true;
    }
  }

  function selectedProfiles() {
    return [...panel.querySelectorAll('[data-bccd-profile]:checked')].map(input => input.value);
  }

  function manualFraming() {
    return {
      sourceName: activeSourceName || 'raw ciphertext',
      inputFace: panel.querySelector('#bccd-input-face').value,
      outputFace: panel.querySelector('#bccd-output-face').value,
      inputQuarterTurns: Number(panel.querySelector('#bccd-input-turns').value) || 0,
      outputQuarterTurns: Number(panel.querySelector('#bccd-output-turns').value) || 0,
      payloadCapacity: Number(panel.querySelector('#bccd-payload-capacity').value) || null,
      originalBitLength: Number(panel.querySelector('#bccd-original-length').value) || null
    };
  }

  function optionsFromControls() {
    const profiles = selectedProfiles();
    if (!profiles.length) fail('Select at least one key-generation family.');
    return {
      profiles,
      includeLegacyProfiles: panel.querySelector('#bccd-legacy').checked,
      usePackageMetadata: panel.querySelector('#bccd-use-metadata').checked,
      maxGridSize: Number(panel.querySelector('#bccd-max-grid').value) || 64,
      seedStart: Number(panel.querySelector('#bccd-seed-start').value) || 0,
      seedEnd: Number(panel.querySelector('#bccd-seed-end').value) || 0,
      seedTemplates: panel.querySelector('#bccd-seed-templates').value.split(/\r?\n/).map(value => value.trim()).filter(Boolean),
      includeFixedSeeds: panel.querySelector('#bccd-fixed-seeds').checked,
      orientationMode: panel.querySelector('#bccd-orientation-mode').value,
      capacityMode: panel.querySelector('#bccd-capacity-mode').value,
      ...manualFraming(),
      stopOnFingerprint: panel.querySelector('#bccd-stop-exact').checked,
      resultLimit: Number(panel.querySelector('#bccd-result-limit').value) || 24,
      scoreThreshold: Number(panel.querySelector('#bccd-score-threshold').value) || 32,
      sampleBlocks: Number(panel.querySelector('#bccd-sample-blocks').value) || 1,
      maxAttemptsThisRun: Math.max(0, Math.floor(Number(panel.querySelector('#bccd-attempt-budget').value) || 0)),
      progressEvery: 256
    };
  }

  function sourceForWorker() {
    if (!activeSource) fail('Load a Binary Cube package or raw ciphertext first.');
    if (activeSource.kind === 'package') return { kind: 'package', package: activeSource.package };
    return { kind: 'raw', bits: activeSource.bits, framing: { ...(activeSource.framing || {}), ...manualFraming() } };
  }

  function normalizeParsedSource(parsed, sourceName) {
    if (parsed?.artifact?.format === Engine.constants.PACKAGE_FORMAT) {
      const source = Cubic.parsePackage(parsed.artifact);
      return Object.freeze({ ...source, sourceName });
    }
    return Cubic.sourceFromRaw(parsed.bits, { ...manualFraming(), sourceName });
  }

  function populateMetadata(source) {
    const target = panel.querySelector('[data-bccd-source]');
    if (!source) { target.innerHTML = '<p>No source loaded.</p>'; return; }
    if (source.kind === 'package') {
      const artifact = source.package;
      target.innerHTML = `<div><span>Source</span><strong>${esc(activeSourceName)}</strong></div><div><span>Type</span><strong>Canonical Binary Cube package</strong></div><div><span>Ciphertext</span><strong>${source.bits.length.toLocaleString()} bits</strong></div><div><span>Grid</span><strong>${artifact.gridSize}³</strong></div><div><span>Payload capacity</span><strong>${Number(artifact.payloadCapacity).toLocaleString()} bits/block</strong></div><div><span>Key fingerprint</span><strong><code>${esc(artifact.keyId || 'missing')}</code></strong></div><div><span>Strong key identity</span><strong><code>${esc(artifact.keyDigest ? `SHA-256 ${artifact.keyDigest.slice(0, 16)}…` : 'legacy package · unavailable')}</code></strong></div><div><span>Geometry</span><strong>${esc(artifact.inputFace)} → ${esc(artifact.outputFace)} · turns ${artifact.inputQuarterTurns}/${artifact.outputQuarterTurns}</strong></div>`;
      panel.querySelector('#bccd-payload-capacity').value = artifact.payloadCapacity || '';
      panel.querySelector('#bccd-original-length').value = artifact.originalBitLength || '';
      panel.querySelector('#bccd-input-face').value = artifact.inputFace || 'top';
      panel.querySelector('#bccd-output-face').value = artifact.outputFace || 'front';
      panel.querySelector('#bccd-input-turns').value = artifact.inputQuarterTurns || 0;
      panel.querySelector('#bccd-output-turns').value = artifact.outputQuarterTurns || 0;
    } else target.innerHTML = `<div><span>Source</span><strong>${esc(activeSourceName)}</strong></div><div><span>Type</span><strong>Raw ciphertext</strong></div><div><span>Ciphertext</span><strong>${source.bits.length.toLocaleString()} bits</strong></div><div><span>Framing</span><strong>Manual / deterministic sweep controls</strong></div>`;
  }

  function loadParsedSource(parsed, sourceName = 'input') {
    terminateWorker('source replaced');
    activeSourceName = String(sourceName || 'input');
    activeSource = normalizeParsedSource(parsed, activeSourceName);
    latestPlan = null; latestCheckpoint = null; candidates = []; measuredAttemptsPerSecond = 0;
    populateMetadata(activeSource);
    renderPlan(null); renderCandidates(); renderCheckpoint();
    panel.querySelector('[data-bccd-start]').disabled = false;
    setStatus(`Loaded ${activeSourceName}. Build the staged search plan to inspect the deterministic search size.`, 'success');
  }

  async function loadFile(file) {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const parsed = Dashboard.parseSourceBytes(bytes, file.name);
    loadParsedSource(parsed, file.name);
  }

  function loadPaste() {
    const mode = panel.querySelector('#bccd-input-mode').value;
    const value = panel.querySelector('#bccd-input').value;
    const parsed = Dashboard.parseSourceText(value, mode, 'pasted-input');
    loadParsedSource(parsed, 'pasted-input');
  }

  function renderPlan(plan) {
    const target = panel.querySelector('[data-bccd-plan]');
    if (!plan) { target.innerHTML = '<p class="bccd-muted">No plan built yet.</p>'; return; }
    const budget = Math.max(0, Math.floor(Number(panel.querySelector('#bccd-attempt-budget')?.value) || 0));
    const rows = plan.stages.map((stage, index) => `<tr><td>${index + 1}</td><td>${esc(stage.profileLabel)}</td><td>${esc(stage.tierLabel)}</td><td>${stage.gridSizes.join(', ')}</td><td>${stage.attempts.toLocaleString()}</td><td data-bccd-stage-runtime="${index}">${measuredAttemptsPerSecond > 0 ? formatDuration(stage.attempts / measuredAttemptsPerSecond) : 'measure during run'}</td></tr>`).join('');
    const passCount = budget ? Math.ceil(plan.totalAttempts / budget) : 1;
    target.innerHTML = `<div class="bccd-plan-summary"><div><span>Plan ID</span><strong><code>${plan.planId}</code></strong></div><div><span>Stages</span><strong>${plan.stages.length}</strong></div><div><span>Total candidates</span><strong>${plan.totalAttempts.toLocaleString()}</strong></div><div><span>Seed domain</span><strong>${plan.seedStart.toLocaleString()}…${plan.seedEnd.toLocaleString()}</strong></div><div><span>Run budget</span><strong>${budget ? `${budget.toLocaleString()} attempts · ${passCount.toLocaleString()} pass${passCount === 1 ? '' : 'es'} minimum` : 'unlimited'}</strong></div><div><span>Measured plan runtime</span><strong data-bccd-total-runtime>${measuredAttemptsPerSecond > 0 ? formatDuration(plan.totalAttempts / measuredAttemptsPerSecond) : 'measure during run'}</strong></div></div><div class="bccd-table-scroll"><table><thead><tr><th>Stage</th><th>Generator</th><th>Cube tier</th><th>Grid sizes</th><th>Attempts</th><th>Est. runtime</th></tr></thead><tbody>${rows}</tbody></table></div><p class="bccd-muted">Search order is deterministic: stage → grid size → geometry → mask capacity → fixed seeds → numeric seed counter → seed template. The per-run budget controls session length only and is deliberately excluded from the deterministic Plan ID.</p>`;
  }

  function updatePlanRuntimeEstimates() {
    if (!latestPlan || !(measuredAttemptsPerSecond > 0)) return;
    latestPlan.stages.forEach((stage, index) => { const node = panel.querySelector(`[data-bccd-stage-runtime="${index}"]`); if (node) node.textContent = formatDuration(stage.attempts / measuredAttemptsPerSecond); });
    const total = panel.querySelector('[data-bccd-total-runtime]');
    if (total) total.textContent = formatDuration(latestPlan.totalAttempts / measuredAttemptsPerSecond);
  }

  function buildPlan() {
    if (!activeSource) fail('Load ciphertext first.');
    const options = optionsFromControls();
    const source = activeSource.kind === 'package' ? activeSource : Cubic.sourceFromRaw(activeSource.bits, manualFraming());
    const plan = Cubic.buildSearchPlan(source, options);
    if (!plan.stages.length) fail('No candidate stages apply. For raw input, increase max grid size or verify that ciphertext length is divisible by a candidate cube face size.');
    if (latestCheckpoint && latestCheckpoint.planId !== plan.planId) latestCheckpoint = null;
    latestPlan = plan; renderPlan(plan); renderCheckpoint();
    setStatus(`Deterministic plan ${plan.planId} contains ${plan.totalAttempts.toLocaleString()} candidate keys.`, 'success');
    return plan;
  }

  function renderCheckpoint() {
    const target = panel.querySelector('[data-bccd-checkpoint]');
    if (!latestCheckpoint) { target.innerHTML = '<span>No checkpoint.</span>'; return; }
    const total = latestPlan?.totalAttempts || 0;
    target.innerHTML = `<span>Plan <code>${esc(latestCheckpoint.planId)}</code></span><strong>cursor ${Number(latestCheckpoint.cursor).toLocaleString()}${total ? ` / ${total.toLocaleString()}` : ''}</strong><span>${esc(latestCheckpoint.stageId || 'between stages')}</span>`;
  }

  function candidateIdentity(candidate) {
    return [candidate.profile, candidate.gridSize, candidate.seed, candidate.inputFace, candidate.outputFace, candidate.inputQuarterTurns, candidate.outputQuarterTurns, candidate.payloadCapacity].join('|');
  }

  function sortCandidates() {
    candidates.sort((a, b) => {
      if (a.exactDigestMatch !== b.exactDigestMatch) return a.exactDigestMatch ? -1 : 1;
      if (a.exactFingerprintMatch !== b.exactFingerprintMatch) return a.exactFingerprintMatch ? -1 : 1;
      const aStageB = Number(a.corroboration?.candidateScore);
      const bStageB = Number(b.corroboration?.candidateScore);
      const aHasStageB = Number.isFinite(aStageB);
      const bHasStageB = Number.isFinite(bStageB);
      if (aHasStageB !== bHasStageB) return aHasStageB ? -1 : 1;
      if (aHasStageB && bStageB !== aStageB) return bStageB - aStageB;
      if (b.score !== a.score) return b.score - a.score;
      return candidateIdentity(a).localeCompare(candidateIdentity(b));
    });
  }

  function addCandidate(candidate) {
    const id = candidateIdentity(candidate);
    const existing = candidates.findIndex(item => candidateIdentity(item) === id);
    if (existing >= 0) candidates.splice(existing, 1);
    candidates.push(candidate);
    sortCandidates();
    const limit = Number(panel.querySelector('#bccd-result-limit').value) || 24;
    if (candidates.length > limit) candidates.length = limit;
    renderCandidates();
  }

  async function informationCorroborator() {
    const workspace = window.ScientificToolsWorkspace;
    if (!workspace?.loadInformationAnalysisSuite) fail('Information & Deobfuscation Suite loader is unavailable.');
    await workspace.loadInformationAnalysisSuite();
    const Information = window.BinaryCubeInformationAnalysisSuite;
    if (!Information?.utilities?.candidateScore || !Information?.analyzeInformation) fail('Information & Deobfuscation candidate scoring APIs are unavailable.');
    return Information;
  }

  async function corroborateCandidate(candidate, Information) {
    const bytes = candidateBytes(candidate);
    const quick = Information.utilities.candidateScore(bytes);
    const analysis = await Information.analyzeInformation(bytes, { windowSize: Math.min(256, Math.max(32, bytes.length || 32)), minimumStringLength: 5 });
    return Object.freeze({
      ...candidate,
      corroboration: Object.freeze({
        source: 'Information & Deobfuscation Analysis Suite',
        scope: candidate.fullRecovery ? 'full plaintext' : 'retained plaintext sample',
        candidateScore: quick.score,
        printableFraction: quick.printable,
        utf8Validity: quick.utf8,
        languageScore: quick.language,
        entropy: quick.entropy,
        signatures: Object.freeze((quick.signatures || []).map(item => item.label || String(item))),
        informationEvidenceScore: analysis.evidenceScore,
        informationEvidenceClass: analysis.evidenceClass,
        compressionRatio: analysis.compressionRatio,
        carvedStringCount: analysis.strings?.length || 0,
        boundary: 'Stage B is corroborating evidence from the existing Information & Deobfuscation Suite. Its scores rank structure and readability; they are not a probability that the candidate key is correct.'
      })
    });
  }

  async function corroborateRetainedCandidates(limitValue = 8) {
    if (!candidates.length) return [];
    const Information = await informationCorroborator();
    const limit = Math.max(1, Math.min(candidates.length, Math.floor(Number(limitValue) || 8)));
    const queue = candidates.filter(candidate => !candidate.exactDigestMatch && !candidate.corroboration).slice(0, limit);
    if (!queue.length) {
      setStatus('No retained candidates require Stage B specialist corroboration.', 'success');
      return [];
    }
    const updated = [];
    for (let index = 0; index < queue.length; index += 1) {
      const candidate = queue[index];
      setStatus(`Stage B specialist corroboration ${index + 1}/${queue.length} · ${candidate.profileLabel} · seed ${candidate.seed}…`);
      const row = await corroborateCandidate(candidate, Information);
      const candidateIndex = candidates.findIndex(item => candidateIdentity(item) === candidateIdentity(candidate));
      if (candidateIndex >= 0) candidates.splice(candidateIndex, 1, row);
      updated.push(row);
    }
    sortCandidates();
    renderCandidates();
    setStatus(`Stage B specialist corroboration complete for ${updated.length} retained candidate${updated.length === 1 ? '' : 's'}.`, 'success');
    return updated;
  }

  function renderCandidates() {
    const target = panel.querySelector('[data-bccd-results]');
    if (!candidates.length) { target.innerHTML = '<p class="bccd-muted">No candidate plaintexts retained yet.</p>'; return; }
    target.innerHTML = candidates.map((candidate, index) => { const stageB = candidate.corroboration; const stageBSignatures = stageB?.signatures?.length ? `<span>Stage B signatures ${esc(stageB.signatures.join(', '))}</span>` : ''; return `<article class="bccd-candidate ${candidate.exactFingerprintMatch ? 'bccd-exact' : ''}"><header><div><span>#${index + 1}</span><strong>${esc(candidate.profileLabel)} · ${candidate.gridSize}³</strong></div><b>${candidate.exactDigestMatch ? 'SHA-256 KEY MATCH' : candidate.exactFingerprintMatch ? 'LEGACY KEY FINGERPRINT MATCH' : stageB ? `Stage B ${num(stageB.candidateScore, 1)}` : `Stage A ${num(candidate.score, 1)}`}</b></header><div class="bccd-chips"><span>seed <code>${esc(candidate.seed)}</code></span><span>${esc(candidate.inputFace)}→${esc(candidate.outputFace)}</span><span>turns ${candidate.inputQuarterTurns}/${candidate.outputQuarterTurns}</span><span>capacity ${candidate.payloadCapacity}</span><span>Stage A ${num(candidate.score, 1)}</span><span>printable ${pct(candidate.printableFraction)}</span><span>entropy ${num(candidate.entropy, 3)}</span>${candidate.signature ? `<span>${esc(candidate.signature)}</span>` : ''}${stageB ? `<span>Stage B UTF-8 ${pct(stageB.utf8Validity)}</span><span>language ${num(stageB.languageScore, 1)}</span><span>compression ${num(stageB.compressionRatio, 3)}</span><span>${esc(stageB.informationEvidenceClass)}</span>${stageBSignatures}` : ''}</div><pre>${esc(candidate.preview || '(binary / no printable preview)')}</pre><details><summary>Hex preview and evidence boundary</summary><code>${esc(candidate.hexPreview || '')}</code><p>${esc(candidate.caveat || '')}</p>${stageB ? `<p><strong>Stage B · ${esc(stageB.scope)}:</strong> ${esc(stageB.boundary)}</p>` : ''}</details><div class="bccd-actions"><button type="button" data-bccd-analyze="${index}">Analyze candidate</button><button type="button" data-bccd-media="${index}">Media forensics</button><button type="button" data-bccd-full="${index}">Recover full plaintext</button><button type="button" data-bccd-save="${index}">Save plaintext</button><button type="button" data-bccd-save-key="${index}">Save recovered key</button></div></article>`; }).join('');
  }

  function download(value, filename, type = 'application/octet-stream') {
    const blob = new Blob([value], { type }); const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = filename.replace(/[<>:"/\\|?*\u0000-\u001f]+/g, '-'); document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(url);
  }

  function candidateBytes(candidate) { return Cubic.bitsToBytes(candidate.plaintextBits); }

  function saveCandidate(candidate) {
    download(candidateBytes(candidate), `cubic-decryptor-${candidate.profile}-${candidate.gridSize}-${candidate.keyId || 'candidate'}.bin`);
  }

  function regenerateKey(candidate) {
    const Research = window.BinaryCubeKeyGenerationResearch;
    if (!Research?.generateResearchKey) fail('Binary Cube key-generation research is unavailable.');
    const key = Research.generateResearchKey(candidate.profile, candidate.seed, candidate.gridSize, {
      gridSize: candidate.gridSize,
      inputFace: candidate.inputFace,
      outputFace: candidate.outputFace,
      inputQuarterTurns: candidate.inputQuarterTurns,
      outputQuarterTurns: candidate.outputQuarterTurns,
      maskDensity: candidate.payloadCapacity / (candidate.gridSize * candidate.gridSize)
    });
    if (candidate.keyId && key.keyId !== candidate.keyId) fail('Regenerated key fingerprint does not match the retained candidate.');
    return key;
  }

  function saveKey(candidate) {
    const key = regenerateKey(candidate);
    download(JSON.stringify(key, null, 2), `cubic-decryptor-key-${key.keyId || 'candidate'}.json`, 'application/json');
  }

  function recoverFullCandidate(candidate) {
    const key = regenerateKey(candidate);
    let plaintextBits;
    if (activeSource?.kind === 'package') plaintextBits = Engine.decryptBinary(activeSource.package, key);
    else {
      if (!activeSource?.bits) fail('The raw ciphertext source is no longer loaded.');
      const framing = { ...(activeSource.framing || {}), ...manualFraming() };
      const source = Cubic.sourceFromRaw(activeSource.bits, framing);
      const payload = Cubic.syntheticPackage(source, key, candidate.payloadCapacity, source.bits, framing.originalBitLength);
      plaintextBits = Engine.decryptBinary(payload, key);
    }
    const evidence = Cubic.scorePlaintext(plaintextBits);
    const updated = Object.freeze({ ...candidate, ...evidence, plaintextBits, fullRecovery: true });
    const index = candidates.findIndex(item => candidateIdentity(item) === candidateIdentity(candidate));
    if (index >= 0) candidates.splice(index, 1, updated);
    renderCandidates();
    setStatus(`Recovered full plaintext with ${updated.profileLabel} / seed ${updated.seed}.`, 'success');
    return updated;
  }

  function openAnalysis(candidate) {
    const api = window.ScientificToolsWorkspace;
    if (!api?.openInformationAnalysisSuite) return fail('Information & Deobfuscation Suite is not available from Scientific Tools.');
    return api.openInformationAnalysisSuite(null, { bytes: candidateBytes(candidate), sourceName: `Cubic Decryptor · ${candidate.profile} · ${candidate.seed}` });
  }

  function openMedia(candidate) {
    const api = window.ScientificToolsWorkspace;
    if (!api?.openMediaForensicsSuite) return fail('Media Forensics Suite is not available from Scientific Tools.');
    return api.openMediaForensicsSuite(null, { bytes: candidateBytes(candidate), sourceName: `Cubic Decryptor · ${candidate.profile} · ${candidate.seed}` });
  }

  function updateProgress(message) {
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

  function runSearch() {
    if (running) return Promise.resolve(null);
    const plan = buildPlan();
    const options = optionsFromControls();
    const resumeCursor = latestCheckpoint?.planId === plan.planId ? Number(latestCheckpoint.cursor) || 0 : 0;
    const id = ++requestId;
    const worker = new Worker(new URL(WORKER_URL, document.baseURI).href);
    activeWorker = worker; running = true; startedAt = performance.now();
    panel.querySelector('[data-bccd-start]').disabled = true; panel.querySelector('[data-bccd-pause]').disabled = false;
    setStatus(`Running plan ${plan.planId} from cursor ${resumeCursor.toLocaleString()}…`);
    heartbeat = window.setInterval(() => { if (activeWorker === worker) setStatus(`Cubic Decryptor worker active · ${((performance.now() - startedAt) / 1000).toFixed(1)} s`); }, 1000);
    return new Promise((resolve, reject) => {
      activeReject = reject;
      worker.addEventListener('message', event => {
        if (worker !== activeWorker || event.data?.id !== id) return;
        const message = event.data || {};
        if (message.type === 'progress') { updateProgress(message); return; }
        if (message.type === 'candidate') { addCandidate(message.candidate); return; }
        stopHeartbeat(); worker.terminate(); activeWorker = null; activeReject = null; running = false; panel.querySelector('[data-bccd-start]').disabled = false; panel.querySelector('[data-bccd-pause]').disabled = true;
        if (message.type === 'result') {
          const result = message.result; latestPlan = result.plan; latestCheckpoint = result.checkpoint; candidates = result.candidates || candidates; renderPlan(latestPlan); renderCheckpoint(); renderCandidates(); updateProgress({ stage: result.exactMatch ? 'Exact key identity found' : result.exhausted ? 'Search exhausted' : result.stopReason === 'attempt-budget' ? 'Run attempt budget reached' : 'Search stopped', fraction: latestPlan.totalAttempts ? result.cursor / latestPlan.totalAttempts : 1, cursor: result.cursor, attemptsThisRun: result.attemptsThisRun, candidates: candidates.length, checkpoint: result.checkpoint, elapsedMilliseconds: result.elapsedMilliseconds, attemptsPerSecond: result.attemptsPerSecond, totalAttempts: latestPlan.totalAttempts });
          setStatus(result.exactMatch ? `Stopped on package key identity match after ${result.attemptsThisRun.toLocaleString()} attempts.` : result.exhausted ? `Search exhausted after ${result.attemptsThisRun.toLocaleString()} attempts in this run.` : result.stopReason === 'attempt-budget' ? `Run budget reached at deterministic cursor ${result.cursor.toLocaleString()}. Run again to resume without replaying completed attempts.` : 'Search stopped.', result.exactMatch ? 'success' : 'warning');
          if ((!result.exactMatch || !result.exactMatch.exactDigestMatch) && candidates.length) void corroborateRetainedCandidates().catch(error => setStatus(`Stage B corroboration unavailable · ${error.message}`, 'warning'));
          resolve(result);
        } else { const error = new Error(message.error?.message || 'Cubic Decryptor worker failed.'); error.name = message.error?.name || 'Error'; setStatus(error.message, 'error'); reject(error); }
      });
      worker.addEventListener('error', event => { if (worker !== activeWorker) return; stopHeartbeat(); worker.terminate(); activeWorker = null; activeReject = null; running = false; panel.querySelector('[data-bccd-start]').disabled = false; panel.querySelector('[data-bccd-pause]').disabled = true; const error = new Error(event.message || 'Cubic Decryptor worker crashed.'); setStatus(error.message, 'error'); reject(error); }, { once: true });
      worker.postMessage({ id, operation: 'search', source: sourceForWorker(), options, resumeCursor });
    });
  }

  function pauseSearch() {
    if (!running) return;
    terminateWorker('search paused');
    setStatus(`Paused at deterministic cursor ${Number(latestCheckpoint?.cursor || 0).toLocaleString()}. Run again to resume.`, 'warning');
  }

  function resetCursor() {
    terminateWorker('search reset'); latestCheckpoint = null; candidates = []; measuredAttemptsPerSecond = 0; renderCheckpoint(); renderCandidates(); panel.querySelector('[data-bccd-progress]').value = 0; panel.querySelector('[data-bccd-progress-label]').textContent = 'Idle'; setStatus('Search cursor, measured throughput, and retained candidates reset.');
  }

  function exportCheckpoint() {
    if (!latestCheckpoint) return fail('There is no checkpoint to export.');
    download(JSON.stringify(latestCheckpoint, null, 2), `cubic-decryptor-checkpoint-${latestCheckpoint.planId}.json`, 'application/json');
  }

  async function importCheckpoint(file) {
    const value = JSON.parse(await file.text());
    const plan = buildPlan();
    latestCheckpoint = Cubic.validateCheckpoint(value, plan); renderCheckpoint();
    setStatus(`Checkpoint restored at cursor ${latestCheckpoint.cursor.toLocaleString()}.`, 'success');
  }

  function buildPanel() {
    const existing = document.getElementById(PANEL_ID); if (existing) { panel = existing; return panel; }
    panel = document.createElement('section'); panel.id = PANEL_ID; panel.className = 'bccd-shell'; panel.hidden = true; panel.setAttribute('aria-labelledby', 'bccd-title');
    const profileRows = Cubic.constants.PROFILE_ORDER.map((profile, index) => {
      const definition = window.BinaryCubeKeyGenerationResearch.constants.PROFILE_DEFINITIONS.find(item => item.id === profile);
      return `<label class="bccd-check"><input type="checkbox" data-bccd-profile value="${profile}" checked><span><strong>${index + 1}. ${esc(definition?.label || profile)}</strong><small>${esc(definition?.note || '')}</small></span></label>`;
    }).join('');
    panel.innerHTML = `<div class="bccd-backdrop" data-bccd-close></div><div class="bccd-panel" role="dialog" aria-modal="true" aria-labelledby="bccd-title"><header class="bccd-header"><div><p class="bccd-eyebrow">Scientific Tools · Decryption Dashboard</p><h2 id="bccd-title">Cubic Decryptor Tool</h2><p>Deterministic staged brute-force search for the Binary Cube key-generation families. Search begins with the canonical direct-permutation family and the smallest compatible cubes, then expands through iterative, walk, and nested key engines while preserving a reproducible candidate order.</p></div><button type="button" class="bccd-close" data-bccd-close aria-label="Close Cubic Decryptor Tool">×</button></header><div class="bccd-body"><aside class="bccd-controls"><section class="bccd-card"><h3>1 · Acquire ciphertext</h3><label>Upload package / ciphertext<input id="bccd-file" type="file"></label><label>Paste mode<select id="bccd-input-mode"><option value="auto">Auto</option><option value="json">Binary Cube package JSON</option><option value="binary">Raw binary</option><option value="hex">Raw hex</option><option value="base64">Raw Base64</option></select></label><textarea id="bccd-input" rows="6" spellcheck="false"></textarea><button type="button" data-bccd-load>Load pasted source</button><div class="bccd-source" data-bccd-source><p>No source loaded.</p></div></section><section class="bccd-card"><h3>2 · Generator stages</h3>${profileRows}<label class="bccd-check"><input id="bccd-legacy" type="checkbox"><span><strong>Legacy / rejected research generators</strong><small>Also test local-adjacent walk and nested hierarchy counterexamples.</small></span></label><label>Maximum cube size<input id="bccd-max-grid" type="number" min="3" max="1024" value="64"></label><label class="bccd-inline"><input id="bccd-use-metadata" type="checkbox" checked> Constrain geometry/capacity/grid from package metadata</label></section><section class="bccd-card"><h3>3 · Deterministic seed domain</h3><div class="bccd-grid"><label>Start<input id="bccd-seed-start" type="number" min="0" value="0"></label><label>End<input id="bccd-seed-end" type="number" min="0" value="65535"></label></div><label>Seed templates<textarea id="bccd-seed-templates" rows="4">{n}</textarea></label><p class="bccd-muted">Supported placeholders: {n}, {n8}, {hex}, {hex8}. Templates run in the entered order for every counter value.</p><label class="bccd-inline"><input id="bccd-fixed-seeds" type="checkbox" checked> Probe known fixed/default seeds before numeric templates</label></section><section class="bccd-card"><h3>4 · Raw framing expansion</h3><label>Orientation search<select id="bccd-orientation-mode"><option value="manual">Manual geometry</option><option value="all">All valid face/rotation combinations</option></select></label><div class="bccd-grid"><label>Input face<select id="bccd-input-face">${Engine.constants.FACES.map(face => `<option>${face}</option>`).join('')}</select></label><label>Output face<select id="bccd-output-face">${Engine.constants.FACES.map(face => `<option ${face === 'front' ? 'selected' : ''}>${face}</option>`).join('')}</select></label><label>Input turns<input id="bccd-input-turns" type="number" min="0" max="3" value="0"></label><label>Output turns<input id="bccd-output-turns" type="number" min="0" max="3" value="0"></label><label>Payload capacity<input id="bccd-payload-capacity" type="number" min="1" placeholder="auto/common"></label><label>Original bit length<input id="bccd-original-length" type="number" min="1" placeholder="max if unknown"></label></div><label>Mask-capacity search<select id="bccd-capacity-mode"><option value="manual">Manual or common 100/75/50/25%</option><option value="exhaustive">Exhaust every legal capacity</option></select></label><p class="bccd-muted">Canonical package mode normally bypasses this expansion because the package already records grid, faces, rotations, original length, and payload capacity.</p></section><section class="bccd-card"><h3>5 · Retention / stopping</h3><div class="bccd-grid"><label>Raw score threshold<input id="bccd-score-threshold" type="number" min="0" max="100" value="32"></label><label>Top candidates<input id="bccd-result-limit" type="number" min="1" max="100" value="24"></label><label>Raw sample blocks<input id="bccd-sample-blocks" type="number" min="1" max="16" value="1"></label><label>Attempt budget / run<input id="bccd-attempt-budget" type="number" min="0" step="1000" value="250000"></label></div><p class="bccd-muted">The attempt budget limits one worker session; 0 means unlimited. Reaching the budget produces a normal deterministic checkpoint so the next run resumes without changing the Plan ID.</p><label class="bccd-inline"><input id="bccd-stop-exact" type="checkbox" checked> Stop when package key identity matches</label></section><section class="bccd-boundary"><strong>Search boundary:</strong> new canonical packages carry a SHA-256 digest of canonical key material in addition to the legacy 32-bit FNV-1a keyId. SHA-256 matches are strong key-identity evidence; legacy packages fall back to FNV matching. Raw-ciphertext scores remain triage evidence only. Confirm promising plaintext with known-plaintext, file-format, or Information & Deobfuscation analysis.</section></aside><main class="bccd-results"><div class="bccd-status" data-bccd-status role="status" aria-live="polite">Load ciphertext to begin.</div><section class="bccd-card"><h3>Staged program sequence</h3><div class="bccd-actions"><button type="button" data-bccd-plan>Build staged plan</button><button type="button" class="primary-action" data-bccd-start disabled>Run / resume decryptor</button><button type="button" data-bccd-pause disabled>Pause</button><button type="button" data-bccd-reset>Reset cursor</button></div><progress data-bccd-progress max="1" value="0"></progress><div data-bccd-progress-label class="bccd-progress-label">Idle</div><div data-bccd-runtime class="bccd-runtime"><span>Cursor <strong>0</strong></span><span>Attempts this run <strong>0</strong></span><span>Candidates <strong>0</strong></span><span>Elapsed <strong>0 s</strong></span><span>Attempts / second <strong>—</strong></span><span>Estimated remaining <strong>—</strong></span></div><div data-bccd-plan><p class="bccd-muted">No plan built yet.</p></div></section><section class="bccd-card"><h3>Checkpoint / deterministic resume</h3><div class="bccd-actions"><button type="button" data-bccd-export-checkpoint>Export checkpoint</button><label class="bccd-file-button">Import checkpoint<input id="bccd-checkpoint-file" type="file" accept="application/json"></label></div><div data-bccd-checkpoint class="bccd-checkpoint"><span>No checkpoint.</span></div></section><section class="bccd-card"><h3>Recovered / promising candidates</h3><div class="bccd-actions"><button type="button" data-bccd-corroborate>Corroborate retained candidates</button></div><p class="bccd-muted">Stage A is the inexpensive inner-loop Cubic score. Stage B runs only on retained candidates and delegates structure/language/signature analysis to the existing Information & Deobfuscation Suite.</p><div data-bccd-results><p class="bccd-muted">No candidate plaintexts retained yet.</p></div></section></main></div></div>`;
    document.body.appendChild(panel); bindPanel(panel); return panel;
  }

  function bindPanel(target) {
    target.querySelectorAll('[data-bccd-close]').forEach(button => button.addEventListener('click', closePanel));
    target.querySelector('#bccd-file').addEventListener('change', event => { const file = event.target.files?.[0]; if (file) void loadFile(file).catch(error => setStatus(error.message, 'error')); });
    target.querySelector('[data-bccd-load]').addEventListener('click', () => { try { loadPaste(); } catch (error) { setStatus(error.message, 'error'); } });
    target.querySelector('[data-bccd-plan]').addEventListener('click', () => { try { buildPlan(); } catch (error) { setStatus(error.message, 'error'); } });
    target.querySelector('[data-bccd-start]').addEventListener('click', () => void runSearch().catch(error => { if (error?.name !== 'AbortError') console.error(error); }));
    target.querySelector('[data-bccd-pause]').addEventListener('click', pauseSearch);
    target.querySelector('[data-bccd-reset]').addEventListener('click', resetCursor);
    target.querySelector('[data-bccd-corroborate]').addEventListener('click', () => void corroborateRetainedCandidates().catch(error => setStatus(error.message, 'error')));
    target.querySelector('[data-bccd-export-checkpoint]').addEventListener('click', () => { try { exportCheckpoint(); } catch (error) { setStatus(error.message, 'error'); } });
    target.querySelector('#bccd-checkpoint-file').addEventListener('change', event => { const file = event.target.files?.[0]; if (file) void importCheckpoint(file).catch(error => setStatus(error.message, 'error')); });
    target.querySelector('[data-bccd-results]').addEventListener('click', event => {
      const analyze = event.target.closest('[data-bccd-analyze]'); const media = event.target.closest('[data-bccd-media]'); const full = event.target.closest('[data-bccd-full]'); const save = event.target.closest('[data-bccd-save]'); const saveKeyButton = event.target.closest('[data-bccd-save-key]');
      try {
        if (analyze) void openAnalysis(candidates[Number(analyze.dataset.bccdAnalyze)]);
        if (media) void openMedia(candidates[Number(media.dataset.bccdMedia)]);
        if (full) recoverFullCandidate(candidates[Number(full.dataset.bccdFull)]);
        if (save) saveCandidate(candidates[Number(save.dataset.bccdSave)]);
        if (saveKeyButton) saveKey(candidates[Number(saveKeyButton.dataset.bccdSaveKey)]);
      } catch (error) { setStatus(error.message, 'error'); }
    });
    target.querySelector('#bccd-input-face').addEventListener('change', () => {
      const inputFace = target.querySelector('#bccd-input-face').value; const select = target.querySelector('#bccd-output-face'); const legal = Engine.legalOutputFaces(inputFace);
      [...select.options].forEach(option => { option.disabled = !legal.includes(option.value); }); if (!legal.includes(select.value)) select.value = legal[0];
    });
  }

  function openPanel(options = {}) {
    const target = buildPanel(); target.hidden = false; document.body.classList.add('bccd-open');
    if (options.package) loadParsedSource({ artifact: options.package, bits: options.package.ciphertext }, options.sourceName || 'handoff-package');
    else if (options.bits) loadParsedSource({ artifact: null, bits: options.bits }, options.sourceName || 'handoff-bits');
    return target;
  }

  function closePanel() { terminateWorker('Cubic Decryptor Tool closed'); if (panel) panel.hidden = true; document.body.classList.remove('bccd-open'); }
  function currentState() { return Object.freeze({ panelOpen: Boolean(panel && !panel.hidden), sourceKind: activeSource?.kind || null, running, planId: latestPlan?.planId || null, checkpointCursor: latestCheckpoint?.cursor || 0, candidateCount: candidates.length }); }

  window.BinaryCubeCubicDecryptor = Object.freeze({ openPanel, closePanel, currentState, buildPlan, runSearch, pauseSearch });
})();
