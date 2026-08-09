(() => {
  'use strict';

  const PANEL_ID = 'binary-cube-diagnostic-pipeline-panel';
  const Pipeline = window.BinaryCubeDiagnosticPipeline;
  const Media = window.BinaryCubeMediaForensicsSuite;
  if (!Pipeline) throw new Error('Diagnostic Pipeline panel requires BinaryCubeDiagnosticPipeline.');

  let panel = null;
  let activeBytes = null;
  let activeName = '';
  let activeMime = '';
  let activeReport = null;
  let activeToken = null;

  const esc = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[character]));
  const pct = value => `${(Number(value || 0) * 100).toFixed(1)}%`;
  const calibrationLabel = value => String(value || 'prior-only').replaceAll('-', ' ');

  function setStatus(message, kind = '') {
    const node = panel?.querySelector('[data-bcdp-status]');
    if (node) { node.textContent = message; node.dataset.kind = kind; }
  }

  function ensureStyle() {
    if (document.getElementById('binary-cube-diagnostic-pipeline-style')) return;
    const link = document.createElement('link');
    link.id = 'binary-cube-diagnostic-pipeline-style';
    link.rel = 'stylesheet';
    link.href = 'binary-cube-diagnostic-pipeline.css?v=20260809-diagnostic-calibration-1';
    document.head.appendChild(link);
  }

  function downloadReport() {
    if (!activeReport) return;
    const text = JSON.stringify(activeReport, (key, value) => {
      if (value instanceof Uint8Array || value instanceof Uint8ClampedArray) return { type: value.constructor.name, length: value.length };
      if (value instanceof ArrayBuffer) return { type: 'ArrayBuffer', byteLength: value.byteLength };
      return value;
    }, 2);
    const blob = new Blob([text], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${(activeName || 'diagnostic').replace(/[^a-z0-9._-]+/gi, '-')}.diagnostic.json`;
    document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(url);
  }

  async function loadSource(value, name = 'diagnostic-input', mimeType = '') {
    const bytes = value instanceof File ? new Uint8Array(await value.arrayBuffer()) : value instanceof Uint8Array ? value : new Uint8Array(value || []);
    if (!bytes.length) throw new Error('Diagnostic input is empty.');
    if (bytes.length > Pipeline.constants.MAX_INPUT_BYTES) throw new Error(`Diagnostic input exceeds ${Pipeline.constants.MAX_INPUT_BYTES.toLocaleString()} bytes.`);
    activeBytes = Uint8Array.from(bytes);
    activeName = value instanceof File ? value.name : String(name || 'diagnostic-input');
    activeMime = value instanceof File ? value.type : String(mimeType || '');
    activeReport = null;
    panel.querySelector('[data-bcdp-source]').innerHTML = `<strong>${esc(activeName)}</strong><span>${activeBytes.length.toLocaleString()} bytes${activeMime ? ` · ${esc(activeMime)}` : ''}</span>`;
    panel.querySelector('[data-bcdp-run]').disabled = false;
    panel.querySelector('[data-bcdp-export]').disabled = true;
    panel.querySelector('[data-bcdp-summary]').innerHTML = '<p>Ready for routed diagnostic analysis.</p>';
    panel.querySelector('[data-bcdp-plan]').innerHTML = '';
    panel.querySelector('[data-bcdp-findings]').innerHTML = '';
    setStatus(`Loaded ${activeName}.`, 'success');
    return activeBytes;
  }

  async function prepareRaster(classification) {
    if (!activeBytes || classification.classId !== 'raster-image' || !Media?.decodeBrowserRaster) return null;
    try {
      setStatus('Decoding raster pixels for pixel-domain detectors…');
      return await Media.decodeBrowserRaster(activeBytes, activeMime || classification.mime || '');
    } catch (error) {
      setStatus(`Raster pixel decode unavailable; continuing with byte/container/coefficient detectors · ${error.message}`, 'warning');
      return null;
    }
  }

  function renderPlan(report) {
    const rows = report.plan.detectors.map(item => {
      const calibration = item.calibration;
      const calibrationText = calibration ? `${calibrationLabel(calibration.calibrationStatus)} · ${Number(calibration.cases || 0)} case${Number(calibration.cases || 0) === 1 ? '' : 's'}` : 'prior only';
      return `<tr><td>${item.stage}</td><td>${esc(item.id)}</td><td>${esc(item.cost)}</td><td>${item.applicable ? 'scheduled' : 'not applicable'}</td><td>${esc(calibrationText)}</td><td>${esc(item.reason)}</td></tr>`;
    }).join('');
    panel.querySelector('[data-bcdp-plan]').innerHTML = `<div class="bcdp-table"><table><thead><tr><th>Stage</th><th>Detector</th><th>Cost</th><th>Routing</th><th>Calibration</th><th>Reason</th></tr></thead><tbody>${rows}</tbody></table></div>`;
  }

  function renderFindings(report) {
    const cards = report.findings.map(item => {
      const calibration = `${calibrationLabel(item.calibrationStatus)} · ${Number(item.calibrationCases || 0)} measured case${Number(item.calibrationCases || 0) === 1 ? '' : 's'}`;
      const reliability = item.runtimeReliability == null || Math.abs(Number(item.runtimeReliability) - Number(item.reliability)) < 1e-9 ? `reliability ${pct(item.reliability)}` : `reliability ${pct(item.reliability)} · runtime prior ${pct(item.runtimeReliability)}`;
      return `<article class="bcdp-finding" data-status="${esc(item.status)}"><header><strong>${esc(item.detectorId)}</strong><span>${esc(item.status)}</span></header><div class="bcdp-finding-metrics"><span>positive ${pct(item.positiveEvidence)}</span><span>negative ${pct(item.negativeEvidence)}</span><span>${esc(reliability)}</span><span>sample ${pct(item.sampleSufficiency)}</span><span>calibration ${esc(calibration)}</span></div><p>${item.notes.length ? esc(item.notes.join(' ')) : 'No additional note.'}</p><details><summary>Metrics</summary><pre>${esc(JSON.stringify(item.metrics, null, 2))}</pre></details></article>`;
    }).join('');
    panel.querySelector('[data-bcdp-findings]').innerHTML = cards || '<p>No detector findings were produced.</p>';
  }

  function renderSummary(report) {
    const i = report.indices;
    const calibration = report.calibration || {};
    const calibrationText = calibration.corpusVersion && calibration.corpusVersion !== 'none' ? `Measured corpus ${calibration.corpusVersion} · ${Number(calibration.receiptCount || 0)} receipt${Number(calibration.receiptCount || 0) === 1 ? '' : 's'} · ${pct(i.calibrationIndex)} of routed findings empirically calibrated.` : `No empirical baseline loaded; detector priors are in use · ${pct(i.calibrationIndex)} empirically calibrated.`;
    panel.querySelector('[data-bcdp-summary]').innerHTML = `<div class="bcdp-index-grid"><article><span>Asset Presence Index</span><strong>${pct(i.presenceIndex)}</strong><p>Weighted positive evidence among completed applicable detectors.</p></article><article><span>Certainty Index</span><strong>${pct(i.certaintyIndex)}</strong><p>Coverage, sample sufficiency, agreement, independent evidence groups, and bounded calibration support.</p></article><article><span>Coverage Index</span><strong>${pct(i.coverageIndex)}</strong><p>How much of the routed detector plan actually completed.</p></article><article><span>Undetected / Miss-Risk Index</span><strong>${pct(i.missRiskIndex)}</strong><p>Rises when applicable methods could not run, calibration is sparse, or opaque/random-like material remains unresolved.</p></article></div><div class="bcdp-verdict"><strong>${esc(i.classification.replaceAll('-', ' '))}</strong><p>${esc(i.boundary)}</p></div><p class="bcdp-classification"><strong>Asset classification:</strong> ${esc(report.classification.label)} · classifier confidence ${pct(report.classification.confidence)}</p><p class="bcdp-classification"><strong>Calibration provenance:</strong> ${esc(calibrationText)}</p><p class="bcdp-classification"><strong>Calibration boundary:</strong> ${esc(calibration.boundary || 'Calibration is corpus-bounded and cannot be interpreted as a universal probability of detection.')}</p>`;
  }

  async function runPipeline() {
    if (!activeBytes) throw new Error('Load a file first.');
    activeToken?.cancel?.('superseded by newer diagnostic run');
    const Runner = window.ScientificToolsCooperativeRunner;
    activeToken = Runner?.createToken?.(`Diagnostic pipeline · ${activeName}`) || { cancelled:false, cancel(reason){ this.cancelled=true; this.reason=reason; } };
    const profile = panel.querySelector('#bcdp-profile').value;
    const classification = Pipeline.classifyAsset(activeBytes, { mimeType: activeMime });
    const raster = profile === 'triage' ? null : await prepareRaster(classification);
    const run = panel.querySelector('[data-bcdp-run]'); const cancel = panel.querySelector('[data-bcdp-cancel]');
    run.disabled = true; cancel.disabled = false; panel.querySelector('[data-bcdp-export]').disabled = true;
    try {
      activeReport = await Pipeline.runPipeline(activeBytes, {
        sourceName: activeName,
        mimeType: activeMime,
        profile,
        raster,
        token: activeToken,
        onProgress(update) {
          const progress = panel.querySelector('[data-bcdp-progress]');
          if (progress) progress.value = Number(update.fraction) || 0;
          setStatus(`${update.label} · ${Math.round((Number(update.fraction) || 0) * 100)}%`);
        }
      });
      renderSummary(activeReport); renderPlan(activeReport); renderFindings(activeReport);
      panel.querySelector('[data-bcdp-export]').disabled = false;
      setStatus(`Diagnostic pipeline complete · ${activeReport.findings.length} detector findings.`, 'success');
    } catch (error) {
      if (activeToken?.cancelled || error?.name === 'AbortError') setStatus(`Diagnostic pipeline cancelled${activeToken?.reason ? ` · ${activeToken.reason}` : ''}.`, 'warning');
      else { setStatus(error.message, 'error'); throw error; }
    } finally {
      run.disabled = !activeBytes; cancel.disabled = true; activeToken = null;
    }
  }

  async function handoff(kind) {
    if (!activeBytes) throw new Error('Load a source first.');
    const workspace = window.ScientificToolsWorkspace;
    if (kind === 'media') return workspace?.openMediaForensicsSuite?.(null, { bytes: activeBytes, sourceName: activeName });
    if (kind === 'information') return workspace?.openInformationAnalysisSuite?.(null, { bytes: activeBytes, sourceName: activeName });
    if (kind === 'steganalysis') return workspace?.openSteganalysisLab?.(null, { bytes: activeBytes, sourceName: activeName, mimeType: activeMime });
    if (kind === 'cube') {
      const Dashboard = window.BinaryCubeDecryptionDashboard;
      const source = Dashboard?.parseSourceBytes?.(activeBytes, activeName);
      return workspace?.openDecryptionDashboard?.(null, source ? { source } : null);
    }
  }

  function buildPanel() {
    if (panel) return panel;
    ensureStyle();
    panel = document.createElement('section'); panel.id = PANEL_ID; panel.className = 'bcdp-shell'; panel.hidden = true;
    panel.innerHTML = `<div class="bcdp-backdrop" data-bcdp-close></div><div class="bcdp-panel" role="dialog" aria-modal="true" aria-labelledby="bcdp-title"><header class="bcdp-header"><div><p>Scientific Tools · Concurrent routed diagnostics</p><h2 id="bcdp-title">Diagnostic Evaluation Pipeline</h2><p>Submit one file. The pipeline identifies the asset class, schedules applicable detectors in a deterministic stage order, runs independent detectors concurrently where safe, and reports positive evidence, certainty, coverage, and residual miss-risk without pretending that a negative scan proves absence.</p></div><button type="button" data-bcdp-close aria-label="Close diagnostic pipeline">×</button></header><div class="bcdp-body"><aside><section class="bcdp-card"><h3>Acquire asset</h3><label>File<input id="bcdp-file" type="file"></label><label>Analysis depth<select id="bcdp-profile"><option value="triage">Triage</option><option value="thorough" selected>Thorough</option><option value="exhaustive">Exhaustive</option></select></label><div class="bcdp-source" data-bcdp-source>No source loaded.</div><div class="bcdp-actions"><button type="button" class="primary-action" data-bcdp-run disabled>Run Routed Evaluation</button><button type="button" data-bcdp-cancel disabled>Cancel</button><button type="button" data-bcdp-export disabled>Export JSON Report</button></div><progress data-bcdp-progress max="1" value="0"></progress><p data-bcdp-status role="status" aria-live="polite">Load a file to begin.</p></section><section class="bcdp-card"><h3>Specialist handoff</h3><p>The routed report can be handed to the existing authoritative workbenches without duplicating their implementations.</p><div class="bcdp-actions"><button type="button" data-bcdp-handoff="media">Media Forensics</button><button type="button" data-bcdp-handoff="steganalysis">Advanced Steganalysis</button><button type="button" data-bcdp-handoff="information">Information / Deobfuscation</button><button type="button" data-bcdp-handoff="cube">Binary Cube Dashboard</button></div></section><section class="bcdp-boundary"><strong>Evidence boundary:</strong> Asset Presence, Certainty, Coverage, and Miss-Risk are indices, not posterior probabilities. Calibration is measured against versioned controls and remains corpus-bounded. “Nothing detected” only means the methods that actually ran found no sufficient positive evidence.</section></aside><main><section class="bcdp-card"><h3>Top-line indices</h3><div data-bcdp-summary><p>No report yet.</p></div></section><section class="bcdp-card"><h3>Order of operations / routing plan</h3><div data-bcdp-plan></div></section><section class="bcdp-card"><h3>Detector evidence ledger</h3><div class="bcdp-findings" data-bcdp-findings></div></section></main></div></div>`;
    document.body.appendChild(panel);
    panel.querySelectorAll('[data-bcdp-close]').forEach(node => node.addEventListener('click', closePanel));
    panel.querySelector('#bcdp-file').addEventListener('change', event => { const file = event.target.files?.[0]; if (file) void loadSource(file).catch(error => setStatus(error.message, 'error')); });
    panel.querySelector('[data-bcdp-run]').addEventListener('click', () => void runPipeline().catch(error => console.error(error)));
    panel.querySelector('[data-bcdp-cancel]').addEventListener('click', () => activeToken?.cancel?.('cancel requested by user'));
    panel.querySelector('[data-bcdp-export]').addEventListener('click', downloadReport);
    panel.querySelectorAll('[data-bcdp-handoff]').forEach(button => button.addEventListener('click', () => void handoff(button.dataset.bcdpHandoff).catch(error => setStatus(error.message, 'error'))));
    return panel;
  }

  function openPanel(options = {}) {
    const target = buildPanel(); target.hidden = false; document.body.classList.add('bcdp-open');
    if (options.bytes) void loadSource(options.bytes, options.sourceName || 'handoff', options.mimeType || '').then(() => options.autorun ? runPipeline() : null).catch(error => setStatus(error.message, 'error'));
    return target;
  }
  function closePanel() { activeToken?.cancel?.('diagnostic panel closed'); if (panel) panel.hidden = true; document.body.classList.remove('bcdp-open'); }
  function currentState() { return Object.freeze({ panelOpen: Boolean(panel && !panel.hidden), sourceLoaded: Boolean(activeBytes), sourceBytes: activeBytes?.length || 0, reportComplete: Boolean(activeReport), running: Boolean(activeToken && !activeToken.cancelled) }); }

  window.BinaryCubeDiagnosticPipelinePanel = Object.freeze({ openPanel, closePanel, currentState, loadSource, runPipeline });
})();
