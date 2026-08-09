#!/usr/bin/env python3
from pathlib import Path

OLD_VERSION = '20260809-cubic-decryptor-hardening-4'
NEW_VERSION = '20260809-cubic-decryptor-hardening-5'


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
validator = 'scripts/validate-binary-cube-cubic-decryptor.mjs'
scientific_validator = 'scripts/validate-scientific-tools-extraction.mjs'

replace_once(ui,
"""  const PANEL_ID = 'binary-cube-cubic-decryptor';
  const WORKER_URL = 'binary-cube-cubic-decryptor-worker.js?v=20260809-cubic-decryptor-1';
""",
"""  const PANEL_ID = 'binary-cube-cubic-decryptor';
  const WORKER_URL = 'binary-cube-cubic-decryptor-worker.js?v=20260809-cubic-decryptor-1';
  const AUTOSAVE_DB_NAME = 'hb-ttrpg-cubic-decryptor';
  const AUTOSAVE_STORE = 'sessions';
  const AUTOSAVE_FORMAT = 'hb-ttrpg-cubic-decryptor-autosave';
  const AUTOSAVE_VERSION = '0.1.0';
  const AUTOSAVE_MAX_PLAINTEXT_BITS = 65536;
""",
'Cubic IndexedDB constants')

replace_once(ui,
"""  let running = false;
  let measuredAttemptsPerSecond = 0;
""",
"""  let running = false;
  let measuredAttemptsPerSecond = 0;
  let activeSourceId = null;
  let autosaveTimer = 0;
  let autosaveDbPromise = null;
""",
'Cubic autosave state')

replace_once(ui,
"""  function fail(message) { throw new Error(message); }
  function setStatus(message, kind = '') { const node = panel?.querySelector('[data-bccd-status]'); if (node) { node.textContent = message; node.dataset.kind = kind; } }

  function stopHeartbeat() {
""",
"""  function fail(message) { throw new Error(message); }
  function setStatus(message, kind = '') { const node = panel?.querySelector('[data-bccd-status]'); if (node) { node.textContent = message; node.dataset.kind = kind; } }
  function setAutosaveStatus(message) { const node = panel?.querySelector('[data-bccd-autosave-status]'); if (node) node.textContent = message; }

  function sourceIdentity(source) {
    const bits = String(source?.bits || '');
    const sampleSize = Math.min(65536, bits.length);
    const middleStart = Math.max(0, Math.floor((bits.length - sampleSize) / 2));
    const lastStart = Math.max(0, bits.length - sampleSize);
    const material = [
      'hb-ttrpg-cubic-source-identity-v1',
      bits.length,
      source?.kind || 'raw',
      source?.package?.keyDigest || '',
      source?.package?.keyId || '',
      source?.package?.checksum || '',
      bits.slice(0, sampleSize),
      bits.slice(middleStart, middleStart + sampleSize),
      bits.slice(lastStart)
    ].join('|');
    return `sha256-sampled-source-v1:${Engine.sha256Hex(material)}`;
  }

  function openAutosaveDb() {
    if (!('indexedDB' in window)) return Promise.resolve(null);
    if (autosaveDbPromise) return autosaveDbPromise;
    autosaveDbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(AUTOSAVE_DB_NAME, 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(AUTOSAVE_STORE)) db.createObjectStore(AUTOSAVE_STORE, { keyPath: 'sourceId' });
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error('IndexedDB could not open Cubic Decryptor autosave storage.'));
      request.onblocked = () => reject(new Error('IndexedDB Cubic Decryptor autosave upgrade is blocked by another open page.'));
    });
    return autosaveDbPromise;
  }

  async function autosaveStore(mode, operation) {
    const db = await openAutosaveDb();
    if (!db) return null;
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(AUTOSAVE_STORE, mode);
      const store = transaction.objectStore(AUTOSAVE_STORE);
      let request;
      try { request = operation(store); } catch (error) { reject(error); return; }
      if (request) {
        request.onsuccess = () => resolve(request.result ?? true);
        request.onerror = () => reject(request.error || transaction.error || new Error('IndexedDB Cubic Decryptor autosave request failed.'));
      } else {
        transaction.oncomplete = () => resolve(true);
        transaction.onerror = () => reject(transaction.error || new Error('IndexedDB Cubic Decryptor autosave transaction failed.'));
      }
    });
  }

  const readAutosave = sourceId => autosaveStore('readonly', store => store.get(sourceId));
  const writeAutosave = record => autosaveStore('readwrite', store => store.put(record));
  const deleteAutosave = sourceId => autosaveStore('readwrite', store => store.delete(sourceId));

  function stopHeartbeat() {
""",
'Cubic IndexedDB storage and source identity')

replace_once(ui,
"""  function sourceForWorker() {
""",
"""  function applyPersistedOptions(options = {}) {
    const profiles = new Set(Array.isArray(options.profiles) ? options.profiles : []);
    panel.querySelectorAll('[data-bccd-profile]').forEach(input => { input.checked = profiles.size ? profiles.has(input.value) : input.checked; });
    const setValue = (selector, value) => { const node = panel.querySelector(selector); if (node && value != null) node.value = value; };
    const setChecked = (selector, value) => { const node = panel.querySelector(selector); if (node && value != null) node.checked = Boolean(value); };
    setChecked('#bccd-legacy', options.includeLegacyProfiles);
    setChecked('#bccd-use-metadata', options.usePackageMetadata);
    setValue('#bccd-max-grid', options.maxGridSize);
    setValue('#bccd-seed-start', options.seedStart);
    setValue('#bccd-seed-end', options.seedEnd);
    if (Array.isArray(options.seedTemplates)) setValue('#bccd-seed-templates', options.seedTemplates.join('\n'));
    setChecked('#bccd-fixed-seeds', options.includeFixedSeeds);
    setValue('#bccd-orientation-mode', options.orientationMode);
    setValue('#bccd-capacity-mode', options.capacityMode);
    setValue('#bccd-input-face', options.inputFace);
    setValue('#bccd-output-face', options.outputFace);
    setValue('#bccd-input-turns', options.inputQuarterTurns);
    setValue('#bccd-output-turns', options.outputQuarterTurns);
    setValue('#bccd-payload-capacity', options.payloadCapacity || '');
    setValue('#bccd-original-length', options.originalBitLength || '');
    setChecked('#bccd-stop-exact', options.stopOnFingerprint);
    setValue('#bccd-result-limit', options.resultLimit);
    setValue('#bccd-score-threshold', options.scoreThreshold);
    setValue('#bccd-sample-blocks', options.sampleBlocks);
    setValue('#bccd-crib-mode', options.cribMode);
    setValue('#bccd-crib-value', options.cribValue);
    setValue('#bccd-crib-signature', options.cribSignature);
    setValue('#bccd-crib-offset', options.cribOffsetBytes);
    setValue('#bccd-attempt-budget', options.maxAttemptsThisRun);
  }

  function candidateAutosaveSnapshot(candidate) {
    const plaintextBits = String(candidate?.plaintextBits || '');
    const truncated = plaintextBits.length > AUTOSAVE_MAX_PLAINTEXT_BITS;
    return {
      ...candidate,
      plaintextBits: plaintextBits.slice(0, AUTOSAVE_MAX_PLAINTEXT_BITS),
      fullRecovery: truncated ? false : Boolean(candidate?.fullRecovery),
      autosavePlaintextTruncated: truncated,
      autosaveOriginalPlaintextBits: plaintextBits.length
    };
  }

  function autosaveEnabled() { return Boolean(panel?.querySelector('#bccd-autosave')?.checked); }

  async function saveAutosaveNow() {
    if (!autosaveEnabled() || !activeSourceId || !latestPlan) return false;
    const options = optionsFromControls();
    delete options.progressEvery;
    const record = {
      format: AUTOSAVE_FORMAT,
      version: AUTOSAVE_VERSION,
      sourceId: activeSourceId,
      sourceName: activeSourceName,
      savedAt: new Date().toISOString(),
      planId: latestPlan.planId,
      options,
      checkpoint: latestCheckpoint ? { ...latestCheckpoint } : null,
      measuredAttemptsPerSecond,
      candidates: candidates.map(candidateAutosaveSnapshot)
    };
    await writeAutosave(record);
    setAutosaveStatus(`Saved locally ${new Date(record.savedAt).toLocaleTimeString()} · cursor ${Number(record.checkpoint?.cursor || 0).toLocaleString()} · ${record.candidates.length} candidate${record.candidates.length === 1 ? '' : 's'}.`);
    return true;
  }

  function scheduleAutosave(delay = 700) {
    if (!autosaveEnabled() || !activeSourceId || !latestPlan) return;
    if (autosaveTimer) window.clearTimeout(autosaveTimer);
    autosaveTimer = window.setTimeout(() => { autosaveTimer = 0; void saveAutosaveNow().catch(error => setAutosaveStatus(`Local autosave unavailable · ${error.message}`)); }, Math.max(0, delay));
  }

  async function clearSavedSession() {
    if (!activeSourceId) { setAutosaveStatus('Load ciphertext before clearing a saved session.'); return false; }
    await deleteAutosave(activeSourceId);
    setAutosaveStatus('Saved local session cleared for this ciphertext.');
    return true;
  }

  async function restoreAutosaveForSource() {
    if (!activeSourceId) return false;
    let record;
    try { record = await readAutosave(activeSourceId); }
    catch (error) { setAutosaveStatus(`Local resume unavailable · ${error.message}`); return false; }
    if (!record || record.format !== AUTOSAVE_FORMAT || record.version !== AUTOSAVE_VERSION) return false;
    try {
      applyPersistedOptions(record.options || {});
      const plan = buildPlan();
      if (record.planId !== plan.planId) throw new Error('Saved Plan ID no longer matches the rebuilt deterministic search plan.');
      latestCheckpoint = record.checkpoint ? Cubic.validateCheckpoint(record.checkpoint, plan) : null;
      candidates = Array.isArray(record.candidates) ? record.candidates : [];
      measuredAttemptsPerSecond = Math.max(0, Number(record.measuredAttemptsPerSecond) || 0);
      sortCandidates();
      renderPlan(plan); renderCheckpoint(); renderCandidates(); updatePlanRuntimeEstimates();
      setAutosaveStatus(`Restored local session saved ${new Date(record.savedAt).toLocaleString()} · cursor ${Number(latestCheckpoint?.cursor || 0).toLocaleString()} · ${candidates.length} candidate${candidates.length === 1 ? '' : 's'}.`);
      setStatus(`Restored interrupted Cubic search at deterministic cursor ${Number(latestCheckpoint?.cursor || 0).toLocaleString()}.`, 'success');
      return true;
    } catch (error) {
      await deleteAutosave(activeSourceId).catch(() => {});
      setAutosaveStatus(`Discarded incompatible saved session · ${error.message}`);
      latestPlan = null; latestCheckpoint = null; candidates = []; measuredAttemptsPerSecond = 0;
      renderPlan(null); renderCheckpoint(); renderCandidates();
      return false;
    }
  }

  function sourceForWorker() {
""",
'Cubic autosave option/candidate/restore functions')

replace_once(ui,
"""  function loadParsedSource(parsed, sourceName = 'input') {
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
""",
"""  async function loadParsedSource(parsed, sourceName = 'input') {
    terminateWorker('source replaced');
    if (autosaveTimer) { window.clearTimeout(autosaveTimer); autosaveTimer = 0; }
    activeSourceName = String(sourceName || 'input');
    activeSource = normalizeParsedSource(parsed, activeSourceName);
    activeSourceId = sourceIdentity(activeSource);
    latestPlan = null; latestCheckpoint = null; candidates = []; measuredAttemptsPerSecond = 0;
    populateMetadata(activeSource);
    renderPlan(null); renderCandidates(); renderCheckpoint();
    panel.querySelector('[data-bccd-start]').disabled = true;
    setAutosaveStatus('Checking this ciphertext for a compatible local interrupted-search session…');
    const restored = await restoreAutosaveForSource();
    panel.querySelector('[data-bccd-start]').disabled = false;
    if (!restored) setStatus(`Loaded ${activeSourceName}. Build the staged search plan to inspect the deterministic search size.`, 'success');
  }

  async function loadFile(file) {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const parsed = Dashboard.parseSourceBytes(bytes, file.name);
    await loadParsedSource(parsed, file.name);
  }

  async function loadPaste() {
    const mode = panel.querySelector('#bccd-input-mode').value;
    const value = panel.querySelector('#bccd-input').value;
    const parsed = Dashboard.parseSourceText(value, mode, 'pasted-input');
    await loadParsedSource(parsed, 'pasted-input');
  }
""",
'Cubic autosave source load/restore')

replace_once(ui,
"""    latestPlan = plan; renderPlan(plan); renderCheckpoint();
    setStatus(`Deterministic plan ${plan.planId} contains ${plan.totalAttempts.toLocaleString()} candidate keys.`, 'success');
""",
"""    latestPlan = plan; renderPlan(plan); renderCheckpoint();
    scheduleAutosave();
    setStatus(`Deterministic plan ${plan.planId} contains ${plan.totalAttempts.toLocaleString()} candidate keys.`, 'success');
""",
'Cubic autosave plan creation')

replace_once(ui,
"""    renderCandidates();
  }

  async function informationCorroborator() {
""",
"""    renderCandidates();
    scheduleAutosave();
  }

  async function informationCorroborator() {
""",
'Cubic autosave retained candidate')

replace_once(ui,
"""    sortCandidates();
    renderCandidates();
    setStatus(`Stage B specialist corroboration complete for ${updated.length} retained candidate${updated.length === 1 ? '' : 's'}.`, 'success');
""",
"""    sortCandidates();
    renderCandidates();
    scheduleAutosave();
    setStatus(`Stage B specialist corroboration complete for ${updated.length} retained candidate${updated.length === 1 ? '' : 's'}.`, 'success');
""",
'Cubic autosave Stage B updates')

replace_once(ui,
"""    renderCandidates();
    setStatus(`Recovered full plaintext with ${updated.profileLabel} / seed ${updated.seed}.`, 'success');
""",
"""    renderCandidates();
    scheduleAutosave();
    setStatus(`Recovered full plaintext with ${updated.profileLabel} / seed ${updated.seed}.`, 'success');
""",
'Cubic autosave full recovery')

replace_once(ui,
"""    if (message.checkpoint) { latestCheckpoint = message.checkpoint; renderCheckpoint(); }
  }
""",
"""    if (message.checkpoint) { latestCheckpoint = message.checkpoint; renderCheckpoint(); scheduleAutosave(); }
  }
""",
'Cubic autosave progress checkpoint')

replace_once(ui,
"""          if ((!result.exactMatch || !result.exactMatch.exactDigestMatch) && candidates.length) void corroborateRetainedCandidates().catch(error => setStatus(`Stage B corroboration unavailable · ${error.message}`, 'warning'));
          resolve(result);
""",
"""          void saveAutosaveNow().catch(error => setAutosaveStatus(`Local autosave unavailable · ${error.message}`));
          if ((!result.exactMatch || !result.exactMatch.exactDigestMatch) && candidates.length) void corroborateRetainedCandidates().catch(error => setStatus(`Stage B corroboration unavailable · ${error.message}`, 'warning'));
          resolve(result);
""",
'Cubic autosave completed run')

replace_once(ui,
"""  function pauseSearch() {
    if (!running) return;
    terminateWorker('search paused');
    setStatus(`Paused at deterministic cursor ${Number(latestCheckpoint?.cursor || 0).toLocaleString()}. Run again to resume.`, 'warning');
  }

  function resetCursor() {
    terminateWorker('search reset'); latestCheckpoint = null; candidates = []; measuredAttemptsPerSecond = 0; renderCheckpoint(); renderCandidates(); panel.querySelector('[data-bccd-progress]').value = 0; panel.querySelector('[data-bccd-progress-label]').textContent = 'Idle'; setStatus('Search cursor, measured throughput, and retained candidates reset.');
  }
""",
"""  function pauseSearch() {
    if (!running) return;
    terminateWorker('search paused');
    void saveAutosaveNow().catch(error => setAutosaveStatus(`Local autosave unavailable · ${error.message}`));
    setStatus(`Paused at deterministic cursor ${Number(latestCheckpoint?.cursor || 0).toLocaleString()}. Run again to resume.`, 'warning');
  }

  function resetCursor() {
    terminateWorker('search reset'); latestCheckpoint = null; candidates = []; measuredAttemptsPerSecond = 0; renderCheckpoint(); renderCandidates(); panel.querySelector('[data-bccd-progress]').value = 0; panel.querySelector('[data-bccd-progress-label]').textContent = 'Idle'; void clearSavedSession().catch(error => setAutosaveStatus(`Could not clear saved session · ${error.message}`)); setStatus('Search cursor, measured throughput, retained candidates, and local autosave reset.');
  }
""",
'Cubic autosave pause/reset behavior')

replace_once(ui,
"""    latestCheckpoint = Cubic.validateCheckpoint(value, plan); renderCheckpoint();
    setStatus(`Checkpoint restored at cursor ${latestCheckpoint.cursor.toLocaleString()}.`, 'success');
""",
"""    latestCheckpoint = Cubic.validateCheckpoint(value, plan); renderCheckpoint();
    scheduleAutosave();
    setStatus(`Checkpoint restored at cursor ${latestCheckpoint.cursor.toLocaleString()}.`, 'success');
""",
'Cubic autosave imported checkpoint')

replace_once(ui,
"""<section class=\"bccd-card\"><h3>Checkpoint / deterministic resume</h3><div class=\"bccd-actions\"><button type=\"button\" data-bccd-export-checkpoint>Export checkpoint</button><label class=\"bccd-file-button\">Import checkpoint<input id=\"bccd-checkpoint-file\" type=\"file\" accept=\"application/json\"></label></div><div data-bccd-checkpoint class=\"bccd-checkpoint\"><span>No checkpoint.</span></div></section>""",
"""<section class=\"bccd-card\"><h3>Checkpoint / deterministic resume</h3><div class=\"bccd-actions\"><button type=\"button\" data-bccd-export-checkpoint>Export checkpoint</button><label class=\"bccd-file-button\">Import checkpoint<input id=\"bccd-checkpoint-file\" type=\"file\" accept=\"application/json\"></label><button type=\"button\" data-bccd-clear-autosave>Clear saved local session</button></div><label class=\"bccd-inline\"><input id=\"bccd-autosave\" type=\"checkbox\" checked> Autosave interrupted search to this browser</label><p class=\"bccd-muted\">Autosave uses IndexedDB on this site origin only. It stores controls, checkpoint/cursor, throughput, and retained candidate samples; it does not upload data and does not persist the source ciphertext itself. Reload the same ciphertext to restore. Persisted plaintext samples are capped at 65,536 bits per candidate.</p><div data-bccd-autosave-status class=\"bccd-muted\">No local session loaded.</div><div data-bccd-checkpoint class=\"bccd-checkpoint\"><span>No checkpoint.</span></div></section>""",
'Cubic autosave UI')

replace_once(ui,
"""    target.querySelector('[data-bccd-load]').addEventListener('click', () => { try { loadPaste(); } catch (error) { setStatus(error.message, 'error'); } });
""",
"""    target.querySelector('[data-bccd-load]').addEventListener('click', () => void loadPaste().catch(error => setStatus(error.message, 'error')));
""",
'Cubic async pasted source load')

replace_once(ui,
"""    target.querySelector('[data-bccd-corroborate]').addEventListener('click', () => void corroborateRetainedCandidates().catch(error => setStatus(error.message, 'error')));
    target.querySelector('[data-bccd-export-checkpoint]').addEventListener('click', () => { try { exportCheckpoint(); } catch (error) { setStatus(error.message, 'error'); } });
""",
"""    target.querySelector('[data-bccd-corroborate]').addEventListener('click', () => void corroborateRetainedCandidates().catch(error => setStatus(error.message, 'error')));
    target.querySelector('[data-bccd-clear-autosave]').addEventListener('click', () => void clearSavedSession().catch(error => setAutosaveStatus(`Could not clear saved session · ${error.message}`)));
    target.querySelector('#bccd-autosave').addEventListener('change', event => { if (event.target.checked) { setAutosaveStatus('Local autosave enabled for this browser.'); scheduleAutosave(0); } else setAutosaveStatus('Local autosave disabled. Existing saved session remains until cleared.'); });
    target.querySelector('[data-bccd-export-checkpoint]').addEventListener('click', () => { try { exportCheckpoint(); } catch (error) { setStatus(error.message, 'error'); } });
""",
'Cubic autosave controls binding')

replace_once(ui,
"""    if (options.package) loadParsedSource({ artifact: options.package, bits: options.package.ciphertext }, options.sourceName || 'handoff-package');
    else if (options.bits) loadParsedSource({ artifact: null, bits: options.bits }, options.sourceName || 'handoff-bits');
""",
"""    if (options.package) void loadParsedSource({ artifact: options.package, bits: options.package.ciphertext }, options.sourceName || 'handoff-package').catch(error => setStatus(error.message, 'error'));
    else if (options.bits) void loadParsedSource({ artifact: null, bits: options.bits }, options.sourceName || 'handoff-bits').catch(error => setStatus(error.message, 'error'));
""",
'Cubic autosave handoff load')

replace_once(ui,
"""  function closePanel() { terminateWorker('Cubic Decryptor Tool closed'); if (panel) panel.hidden = true; document.body.classList.remove('bccd-open'); }
""",
"""  function closePanel() { void saveAutosaveNow().catch(() => {}); terminateWorker('Cubic Decryptor Tool closed'); if (panel) panel.hidden = true; document.body.classList.remove('bccd-open'); }
""",
'Cubic autosave close behavior')

replace_once(ui,
"""  function currentState() { return Object.freeze({ panelOpen: Boolean(panel && !panel.hidden), sourceKind: activeSource?.kind || null, running, planId: latestPlan?.planId || null, checkpointCursor: latestCheckpoint?.cursor || 0, candidateCount: candidates.length }); }
""",
"""  function currentState() { return Object.freeze({ panelOpen: Boolean(panel && !panel.hidden), sourceKind: activeSource?.kind || null, sourceId: activeSourceId, running, planId: latestPlan?.planId || null, checkpointCursor: latestCheckpoint?.cursor || 0, candidateCount: candidates.length, autosaveEnabled: autosaveEnabled() }); }
""",
'Cubic autosave state exposure')

replace_once(validator,
"""  'KNOWN-PLAINTEXT CRIB MATCH'
]) assert.ok(ui.includes(required), `UI is missing ${JSON.stringify(required)}`);
""",
"""  'KNOWN-PLAINTEXT CRIB MATCH',
  'indexedDB.open',
  'hb-ttrpg-cubic-decryptor-autosave',
  'sourceIdentity(',
  'restoreAutosaveForSource',
  'candidateAutosaveSnapshot',
  'Clear saved local session',
  'Autosave interrupted search to this browser',
  'does not persist the source ciphertext itself',
  'AUTOSAVE_MAX_PLAINTEXT_BITS = 65536'
]) assert.ok(ui.includes(required), `UI is missing ${JSON.stringify(required)}`);
assert.ok(!ui.includes('localStorage'), 'Cubic long-run autosave must use IndexedDB rather than localStorage.');
""",
'Cubic autosave validator contract')

replace_once(validator, "schema: '0.5.0'", "schema: '0.6.0'", 'Cubic autosave validation receipt')

replace_once('scientific-tools-entry.js', f"const ASSET_VERSION = '{OLD_VERSION}';", f"const ASSET_VERSION = '{NEW_VERSION}';", 'Scientific Tools autosave cache seal')
replace_once('app-lite-view-mounts.js', f"loadScript('scientific-tools-entry.js?v={OLD_VERSION}')", f"loadScript('scientific-tools-entry.js?v={NEW_VERSION}')", 'Top-level autosave cache seal')
replace_once(scientific_validator, f"loadScript('scientific-tools-entry.js?v={OLD_VERSION}')", f"loadScript('scientific-tools-entry.js?v={NEW_VERSION}')", 'Scientific Tools validator autosave top cache')
replace_once(scientific_validator, f"const ASSET_VERSION = '{OLD_VERSION}';", f"const ASSET_VERSION = '{NEW_VERSION}';", 'Scientific Tools validator autosave cache')
replace_once(scientific_validator, "schemaVersion: '0.21.0'", "schemaVersion: '0.22.0'", 'Scientific Tools autosave ownership receipt')

print('Cubic IndexedDB interrupted-search autosave applied or already present.')
