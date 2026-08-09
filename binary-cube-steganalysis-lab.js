(() => {
  'use strict';

  const PANEL_ID = 'binary-cube-steganalysis-lab';
  const WORKER_URL = 'binary-cube-steganalysis-worker.js?v=20260809-steganalysis-1';
  const MAX_INPUT_BYTES = 32 * 1024 * 1024;
  const Engine = window.BinaryCubeSteganalysisEngine;
  const Media = window.BinaryCubeMediaForensicsSuite;
  if (!Engine) throw new Error('Advanced Steganalysis Lab requires BinaryCubeSteganalysisEngine.');
  if (!Media) throw new Error('Advanced Steganalysis Lab requires BinaryCubeMediaForensicsSuite for authoritative media decoding.');

  let panel = null;
  let activeBytes = null;
  let activeName = '';
  let activeMime = '';
  let activeRaster = null;
  let coverBytes = null;
  let coverName = '';
  let coverRaster = null;
  let localizedReport = null;
  let comparisonReport = null;
  let jpegReport = null;
  let activeWorker = null;
  let activeReject = null;
  let requestId = 0;
  let heartbeat = 0;
  let lastProgress = { stage: '', fraction: 0 };
  let workerStartedAt = 0;

  const clamp = (value, minimum, maximum) => Math.max(minimum, Math.min(maximum, value));
  const esc = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
  const pct = (value, digits = 2) => Number.isFinite(Number(value)) ? `${(Number(value) * 100).toFixed(digits)}%` : '—';
  const num = (value, digits = 4) => Number.isFinite(Number(value)) ? Number(value).toFixed(digits) : '—';
  const asBytes = value => value instanceof Uint8Array ? value : value instanceof ArrayBuffer ? new Uint8Array(value) : ArrayBuffer.isView(value) ? new Uint8Array(value.buffer, value.byteOffset, value.byteLength) : Uint8Array.from(value || []);

  function fail(message) { throw new Error(message); }
  function setStatus(message, kind = '') { const node = panel?.querySelector('[data-bcsl-status]'); if (node) { node.textContent = message; node.dataset.kind = kind; } }

  function stopHeartbeat() { if (heartbeat) window.clearInterval(heartbeat); heartbeat = 0; }
  function cancelWorker(reason = 'cancelled') {
    const reject = activeReject;
    stopHeartbeat();
    if (activeWorker) activeWorker.terminate();
    activeWorker = null; activeReject = null; requestId += 1;
    if (reject) { const error = new Error(reason); error.name = 'AbortError'; reject(error); }
    const cancel = panel?.querySelector('[data-bcsl-cancel]'); if (cancel) cancel.disabled = true;
  }

  function runWorker(operation, payload, transfers = []) {
    if (typeof Worker !== 'function') return Promise.reject(new Error('Advanced steganalysis requires Web Worker support; synchronous heavy fallback is intentionally disabled.'));
    cancelWorker('superseded');
    const id = ++requestId;
    const worker = new Worker(new URL(WORKER_URL, document.baseURI).href);
    activeWorker = worker;
    workerStartedAt = performance.now();
    lastProgress = { stage: 'Starting steganalysis worker', fraction: 0 };
    const cancel = panel?.querySelector('[data-bcsl-cancel]'); if (cancel) cancel.disabled = false;
    heartbeat = window.setInterval(() => {
      if (activeWorker !== worker || id !== requestId) return;
      const elapsed = (performance.now() - workerStartedAt) / 1000;
      setStatus(`${lastProgress.stage || 'Worker active'} · ${Math.round((lastProgress.fraction || 0) * 100)}% · ${elapsed.toFixed(1)} s`);
    }, 1000);
    return new Promise((resolve, reject) => {
      activeReject = reject;
      worker.addEventListener('message', event => {
        if (worker !== activeWorker || id !== requestId) return;
        const message = event.data || {};
        if (message.id !== id) return;
        if (message.type === 'progress') { lastProgress = message; setStatus(`${message.stage} · ${Math.round((message.fraction || 0) * 100)}%`); return; }
        stopHeartbeat(); worker.terminate(); activeWorker = null; activeReject = null; if (cancel) cancel.disabled = true;
        if (message.type === 'result') resolve(message.result);
        else { const error = new Error(message.error?.message || 'Steganalysis worker failed.'); error.name = message.error?.name || 'Error'; reject(error); }
      });
      worker.addEventListener('error', event => {
        if (worker !== activeWorker || id !== requestId) return;
        stopHeartbeat(); worker.terminate(); activeWorker = null; activeReject = null; if (cancel) cancel.disabled = true;
        reject(new Error(event.message || 'Steganalysis worker crashed.'));
      }, { once: true });
      worker.postMessage({ id, operation, ...payload }, transfers);
    });
  }

  function renderImage(raster, canvas) {
    if (!raster || !canvas) return;
    canvas.width = raster.width; canvas.height = raster.height;
    canvas.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(raster.rgba), raster.width, raster.height), 0, 0);
  }

  function heatmapMetric(tile, metric) {
    const analysis = tile.analysis;
    if (metric === 'rs') return analysis.rs?.estimatedPayloadRate ?? 0;
    if (metric === 'spa') return analysis.spa?.estimatedPayloadRate ?? 0;
    if (metric === 'lsb-balance') return 1 - Math.min(1, 2 * Math.abs((analysis.lsb?.oneFraction ?? 0.5) - 0.5));
    if (metric === 'pair-equalization') return 1 / (1 + Math.max(0, analysis.chi?.normalized ?? 0));
    if (metric === 'residual') return clamp(analysis.residualRoughness || 0, 0, 1);
    if (metric === 'cooccurrence') return clamp((analysis.residualCooccurrence?.entropy || 0) / 6, 0, 1);
    return analysis.payloadEstimateConsensus ?? 0;
  }

  function drawLocalizedHeatmap() {
    if (!localizedReport || !activeRaster) return;
    const canvas = panel.querySelector('#bcsl-heatmap');
    const metric = panel.querySelector('#bcsl-heatmap-metric').value;
    canvas.width = localizedReport.width; canvas.height = localizedReport.height;
    const context = canvas.getContext('2d');
    context.clearRect(0, 0, canvas.width, canvas.height);
    for (const tile of localizedReport.tiles) {
      const value = clamp(heatmapMetric(tile, metric), 0, 1);
      const hue = 215 - value * 215;
      context.fillStyle = `hsla(${hue},85%,52%,${0.22 + value * 0.68})`;
      context.fillRect(tile.x, tile.y, tile.width, tile.height);
      if (tile.width >= 40 && tile.height >= 24) {
        context.fillStyle = 'rgba(255,255,255,.92)'; context.font = `${Math.max(9, Math.min(14, tile.width / 7))}px ui-monospace,monospace`;
        context.fillText(value.toFixed(2), tile.x + 4, tile.y + 14);
      }
    }
    panel.querySelector('[data-bcsl-heatmap-note]').textContent = `${metric.replaceAll('-', ' ')} · ${localizedReport.tileSize}px tiles · values are detector measurements, not probabilities.`;
  }

  function renderLedger(report) {
    const target = panel.querySelector('[data-bcsl-ledger]');
    const rs = report.global.rs;
    const spa = report.global.spa;
    const chi = report.global.chi;
    const rows = [
      ['RS payload estimate', rs.valid ? pct(rs.estimatedPayloadRate) : 'insufficient / unstable', `groups ${rs.groups.toLocaleString()} · initial-bias signal ${pct(rs.initialBias)}`],
      ['Sample Pair estimate', spa.valid ? pct(spa.estimatedPayloadRate) : 'insufficient / unstable', `pairs ${spa.counts.pairs.toLocaleString()} · trace imbalance ${pct(spa.traceImbalance)}`],
      ['Detector agreement', report.global.detectorAgreement == null ? '—' : pct(report.global.detectorAgreement), 'Agreement is proximity between the two quantitative estimates, not confidence of guilt.'],
      ['LSB balance', pct(report.global.lsb.oneFraction), `entropy ${num(report.global.lsb.entropy, 5)} · transitions ${pct(report.global.lsb.transitionFraction)}`],
      ['Pair equalization χ²', num(chi.normalized, 5), 'Lower normalized values are more even within LSB replacement pairs; content statistics can also produce this.'],
      ['Residual roughness', num(report.global.residualRoughness, 5), `co-occurrence entropy ${num(report.global.residualCooccurrence.entropy, 4)}`]
    ];
    target.innerHTML = rows.map(([name, value, note]) => `<article class="bcsl-evidence"><div><strong>${esc(name)}</strong><span>${esc(value)}</span></div><p>${esc(note)}</p></article>`).join('');
  }

  function renderTileTable(report) {
    const target = panel.querySelector('[data-bcsl-tile-table]');
    const rows = report.tiles.map(tile => `<tr><td>${tile.x},${tile.y}</td><td>${tile.width}×${tile.height}</td><td>${tile.analysis.rs.valid ? pct(tile.analysis.rs.estimatedPayloadRate) : '—'}</td><td>${tile.analysis.spa.valid ? pct(tile.analysis.spa.estimatedPayloadRate) : '—'}</td><td>${tile.analysis.payloadEstimateConsensus == null ? '—' : pct(tile.analysis.payloadEstimateConsensus)}</td><td>${num(tile.analysis.chi.normalized, 3)}</td><td>${num(tile.analysis.residualRoughness, 4)}</td></tr>`).join('');
    target.innerHTML = `<div class="bcsl-table-scroll"><table><thead><tr><th>Tile</th><th>Size</th><th>RS</th><th>SPA</th><th>Consensus</th><th>χ²/pair</th><th>Residual</th></tr></thead><tbody>${rows}</tbody></table></div>`;
  }

  function renderMetadata(bytes) {
    const target = panel.querySelector('[data-bcsl-metadata]');
    const png = Engine.inspectPngMetadata(bytes);
    const jpeg = Engine.inspectJpegMetadata(bytes);
    if (png.valid) {
      target.innerHTML = `<strong>PNG structure:</strong> ${png.chunks.length} chunks · ${png.textChunks.length} text-bearing ancillary chunk(s) · ${png.trailingBytes.toLocaleString()} trailing bytes${png.textChunks.length ? `<div class="bcsl-chip-row">${png.textChunks.map(item => `<span>${esc(item.type)}:${esc(item.keyword || '(no keyword)')}</span>`).join('')}</div>` : ''}`;
    } else if (jpeg.valid) {
      const metadata = jpeg.segments.filter(item => item.marker.startsWith('APP') || item.marker === 'COM');
      target.innerHTML = `<strong>JPEG structure:</strong> ${jpeg.segments.length} header segments · ${metadata.length} APP/COM metadata segment(s)<div class="bcsl-chip-row">${metadata.slice(0, 16).map(item => `<span>${esc(item.marker)}${item.kind ? ` · ${esc(item.kind)}` : ''}</span>`).join('')}</div>`;
    } else target.innerHTML = '<strong>Container metadata:</strong> no PNG/JPEG structural metadata parser matched this input.';
  }

  async function loadSuspect(fileOrBytes, name = 'suspect', mime = '') {
    const bytes = fileOrBytes instanceof File ? new Uint8Array(await fileOrBytes.arrayBuffer()) : asBytes(fileOrBytes);
    if (!bytes.length) fail('Suspect input is empty.'); if (bytes.length > MAX_INPUT_BYTES) fail(`Suspect exceeds ${MAX_INPUT_BYTES.toLocaleString()} bytes.`);
    activeBytes = Uint8Array.from(bytes); activeName = fileOrBytes instanceof File ? fileOrBytes.name : name; activeMime = fileOrBytes instanceof File ? fileOrBytes.type : mime;
    activeRaster = null; localizedReport = null; comparisonReport = null; jpegReport = null;
    panel.querySelector('[data-bcsl-source]').innerHTML = `<strong>${esc(activeName)}</strong><span>${activeBytes.length.toLocaleString()} bytes</span>`;
    renderMetadata(activeBytes); setStatus(`Loaded ${activeName}.`, 'success');
  }

  async function decodeSuspectRaster() {
    if (!activeBytes) fail('Load a suspect image first.');
    setStatus('Decoding suspect raster through the shared Media Forensics decoder…');
    activeRaster = await Media.decodeBrowserRaster(activeBytes, activeMime);
    renderImage(activeRaster, panel.querySelector('#bcsl-raster-preview'));
    panel.querySelector('[data-bcsl-raster-meta]').textContent = `${activeRaster.width} × ${activeRaster.height} · ${(activeRaster.rgba.length / 4).toLocaleString()} pixels`;
    setStatus('Raster decoded. Quantitative and localized steganalysis is ready.', 'success');
  }

  async function runLocalized() {
    if (!activeRaster) await decodeSuspectRaster();
    const copy = new Uint8ClampedArray(activeRaster.rgba);
    const tileSize = Number(panel.querySelector('#bcsl-tile-size').value) || 64;
    const channel = panel.querySelector('#bcsl-channel').value;
    setStatus('Running localized RS / SPA / residual analysis…');
    localizedReport = await runWorker('localized-raster', { rgba: copy.buffer, width: activeRaster.width, height: activeRaster.height, tileSize, channel }, [copy.buffer]);
    renderLedger(localizedReport); renderTileTable(localizedReport); drawLocalizedHeatmap();
    setStatus('Localized steganalysis complete. Compare independent measurements before drawing conclusions.', 'success');
  }

  async function loadCover(file) {
    coverBytes = new Uint8Array(await file.arrayBuffer()); coverName = file.name;
    if (coverBytes.length > MAX_INPUT_BYTES) fail(`Cover exceeds ${MAX_INPUT_BYTES.toLocaleString()} bytes.`);
    setStatus(`Decoding known cover ${coverName}…`);
    coverRaster = await Media.decodeBrowserRaster(coverBytes, file.type || '');
    renderImage(coverRaster, panel.querySelector('#bcsl-cover-preview'));
    panel.querySelector('[data-bcsl-cover-meta]').textContent = `${coverName} · ${coverRaster.width} × ${coverRaster.height}`;
    setStatus('Known cover loaded.', 'success');
  }

  function drawChangedMask(report) {
    const canvas = panel.querySelector('#bcsl-change-map');
    canvas.width = report.width; canvas.height = report.height;
    const image = new Uint8ClampedArray(report.width * report.height * 4);
    for (let index = 0; index < report.changedMask.length; index += 1) {
      const value = report.changedMask[index] ? 255 : 0;
      image[index * 4] = value; image[index * 4 + 1] = value; image[index * 4 + 2] = value; image[index * 4 + 3] = 255;
    }
    canvas.getContext('2d').putImageData(new ImageData(image, report.width, report.height), 0, 0);
  }

  function renderComparison(report) {
    const target = panel.querySelector('[data-bcsl-comparison]');
    const channels = ['r', 'g', 'b', 'a'].map(name => { const row = report.channels[name]; return `<tr><td>${name.toUpperCase()}</td><td>${row.changedSamples.toLocaleString()}</td><td>${pct(row.changedFraction)}</td><td>${row.lsbFlips.toLocaleString()}</td><td>${pct(row.lsbFlipFraction)}</td><td>${row.bitPlaneFlips.join(', ')}</td></tr>`; }).join('');
    target.innerHTML = `<div class="bcsl-metrics"><div><span>Changed pixels</span><strong>${report.changedPixels.toLocaleString()} · ${pct(report.changedPixelFraction)}</strong></div><div><span>Changed samples</span><strong>${report.changedSamples.toLocaleString()} · ${pct(report.changedSampleFraction)}</strong></div><div><span>MSE</span><strong>${num(report.mse, 6)}</strong></div><div><span>PSNR</span><strong>${report.psnr === Infinity ? '∞' : `${num(report.psnr, 3)} dB`}</strong></div><div><span>SSIM</span><strong>${num(report.ssim, 6)}</strong></div><div><span>Changed pixels with changed neighbor</span><strong>${pct(report.changedWithNeighborFraction)}</strong></div></div><p>${report.boundingBox ? `Difference bounding box: ${report.boundingBox.x},${report.boundingBox.y} · ${report.boundingBox.width}×${report.boundingBox.height}.` : 'No pixel differences detected.'}</p><div class="bcsl-table-scroll"><table><thead><tr><th>Channel</th><th>Changed</th><th>Fraction</th><th>LSB flips</th><th>LSB among changes</th><th>Bit-plane flips 0→7</th></tr></thead><tbody>${channels}</tbody></table></div>`;
    drawChangedMask(report);
  }

  async function runKnownCoverComparison() {
    if (!activeRaster) await decodeSuspectRaster();
    if (!coverRaster) fail('Load a known cover image first.');
    if (coverRaster.width !== activeRaster.width || coverRaster.height !== activeRaster.height) fail('Known cover and suspect must have identical raster dimensions.');
    const cover = new Uint8ClampedArray(coverRaster.rgba); const suspect = new Uint8ClampedArray(activeRaster.rgba);
    comparisonReport = await runWorker('compare-raster', { cover: cover.buffer, suspect: suspect.buffer, width: activeRaster.width, height: activeRaster.height }, [cover.buffer, suspect.buffer]);
    renderComparison(comparisonReport); setStatus('Known-cover parity comparison complete.', 'success');
  }

  function renderJpeg(report) {
    const target = panel.querySelector('[data-bcsl-jpeg]');
    if (!report.valid) { target.innerHTML = '<p>Input is not a JPEG stream.</p>'; return; }
    if (!report.supported) { target.innerHTML = `<div class="bcsl-warning"><strong>Coefficient decoder stopped safely:</strong> ${esc(report.reason)}</div>`; return; }
    const components = report.components.map(component => `<article class="bcsl-evidence"><div><strong>Component ${component.id}</strong><span>${component.blocks.toLocaleString()} blocks</span></div><p>AC zero ${pct(component.zeroAcFraction)} · odd nonzero ${pct(component.oddAcFractionAmongNonzero)} · ±1 among nonzero ${pct(component.plusMinusOneFractionAmongNonzero)} · odd/even imbalance ${pct(component.oddEvenImbalance)}</p></article>`).join('');
    const primary = report.components[0];
    const rows = primary.frequencies.map(row => `<tr><td>${row.zigzag}</td><td>${row.naturalIndex}</td><td>${pct(row.nonzeroFraction)}</td><td>${pct(row.oddFractionAmongNonzero)}</td><td>${num(row.meanAbsolute, 3)}</td><td>${row.min}…${row.max}</td></tr>`).join('');
    const quant = report.quantizationTables.map(table => `<details><summary>Quantization table ${table.id} · ${table.precision}-bit</summary><code>${table.values.join(' ')}</code></details>`).join('');
    target.innerHTML = `<div class="bcsl-metrics"><div><span>Frame</span><strong>${report.frame.width}×${report.frame.height}</strong></div><div><span>MCUs</span><strong>${report.mcuColumns}×${report.mcuRows}</strong></div><div><span>Components</span><strong>${report.components.length}</strong></div><div><span>Quantization tables</span><strong>${report.quantizationTables.length}</strong></div></div>${components}<h4>Primary component coefficient populations</h4><div class="bcsl-table-scroll"><table><thead><tr><th>Zigzag</th><th>Natural index</th><th>Nonzero</th><th>Odd | nonzero</th><th>Mean |coef|</th><th>Range</th></tr></thead><tbody>${rows}</tbody></table></div><h4>Quantization structure</h4>${quant}<p class="bcsl-muted">${esc(report.caveat)}</p>`;
  }

  async function runJpegInspection() {
    if (!activeBytes) fail('Load a JPEG first.');
    const copy = activeBytes.slice();
    jpegReport = await runWorker('jpeg-coefficients', { bytes: copy.buffer }, [copy.buffer]);
    renderJpeg(jpegReport); setStatus(jpegReport.supported ? 'Baseline JPEG DCT coefficient inspection complete.' : `JPEG inspected: ${jpegReport.reason}`, jpegReport.supported ? 'success' : 'warning');
  }

  function runTextAnalysis() {
    const text = panel.querySelector('#bcsl-text-input').value;
    const report = Engine.analyzeTextSteganography(text);
    const counts = report.counts;
    const suspicious = report.suspicious.slice(0, 80).map(item => `<tr><td>${item.index}</td><td><code>${item.codePoint}</code></td><td>${esc(item.category)}</td></tr>`).join('');
    panel.querySelector('[data-bcsl-text-results]').innerHTML = `<div class="bcsl-metrics"><div><span>Zero-width</span><strong>${counts.zeroWidth}</strong></div><div><span>Bidi controls</span><strong>${counts.bidiControls}</strong></div><div><span>Variation selectors</span><strong>${counts.variationSelectors}</strong></div><div><span>NBSP</span><strong>${counts.nonBreakingSpaces}</strong></div><div><span>Unusual spaces</span><strong>${counts.unusualSpaces}</strong></div><div><span>Trailing-whitespace lines</span><strong>${counts.trailingWhitespaceLines}</strong></div><div><span>NFC changes</span><strong>${report.nfcChanges ? 'yes' : 'no'}</strong></div><div><span>NFKC changes</span><strong>${report.nfkcChanges ? 'yes' : 'no'}</strong></div></div><div class="bcsl-table-scroll"><table><thead><tr><th>Index</th><th>Code point</th><th>Class</th></tr></thead><tbody>${suspicious || '<tr><td colspan="3">No tracked hidden-format code points.</td></tr>'}</tbody></table></div><p class="bcsl-muted">${esc(report.caveat)}</p>`;
  }

  function parseNumberList(value) { return String(value || '').split(/[\s,;]+/).filter(Boolean).map(Number); }
  function runEvaluation() {
    const truthNumbers = parseNumberList(panel.querySelector('#bcsl-eval-truth').value);
    const scores = parseNumberList(panel.querySelector('#bcsl-eval-scores').value);
    if (!truthNumbers.length || truthNumbers.length !== scores.length) fail('Evaluation truth and score arrays must be non-empty and equal length.');
    const truth = truthNumbers.map(value => value > 0);
    const threshold = Number(panel.querySelector('#bcsl-eval-threshold').value) || 0.5;
    const confusion = Engine.confusionMetrics(truth, scores.map(value => value >= threshold));
    const roc = Engine.rocCurve(truth, scores);
    panel.querySelector('[data-bcsl-eval-results]').innerHTML = `<div class="bcsl-metrics"><div><span>ROC AUC</span><strong>${num(roc.auc, 5)}</strong></div><div><span>TPR / recall</span><strong>${pct(confusion.truePositiveRate)}</strong></div><div><span>FPR</span><strong>${pct(confusion.falsePositiveRate)}</strong></div><div><span>Precision</span><strong>${pct(confusion.precision)}</strong></div><div><span>Balanced accuracy</span><strong>${pct(confusion.balancedAccuracy)}</strong></div><div><span>MCC</span><strong>${num(confusion.mcc, 5)}</strong></div><div><span>F1</span><strong>${num(confusion.f1, 5)}</strong></div></div><p>Confusion: TP ${confusion.tp}, TN ${confusion.tn}, FP ${confusion.fp}, FN ${confusion.fn} at threshold ${threshold}.</p>`;
  }

  async function runBatch(files) {
    const list = Array.from(files || []);
    if (!list.length) fail('Choose one or more raster files for batch analysis.');
    const rows = [];
    for (let index = 0; index < list.length; index += 1) {
      const file = list[index];
      setStatus(`Batch ${index + 1}/${list.length}: decoding ${file.name}…`);
      try {
        const bytes = new Uint8Array(await file.arrayBuffer());
        const raster = await Media.decodeBrowserRaster(bytes, file.type || '');
        const rgba = new Uint8ClampedArray(raster.rgba);
        const report = await runWorker('raster-global', { rgba: rgba.buffer, width: raster.width, height: raster.height, channel: panel.querySelector('#bcsl-channel').value }, [rgba.buffer]);
        rows.push({ name: file.name, width: raster.width, height: raster.height, rs: report.rs, spa: report.spa, consensus: report.payloadEstimateConsensus, entropy: report.lsb.entropy, chi: report.chi.normalized, residual: report.residualRoughness });
      } catch (error) { rows.push({ name: file.name, error: error.message }); }
    }
    panel.querySelector('[data-bcsl-batch-results]').innerHTML = `<div class="bcsl-table-scroll"><table><thead><tr><th>File</th><th>Dimensions</th><th>RS</th><th>SPA</th><th>Consensus</th><th>LSB entropy</th><th>χ²/pair</th><th>Residual</th></tr></thead><tbody>${rows.map(row => row.error ? `<tr><td>${esc(row.name)}</td><td colspan="7">${esc(row.error)}</td></tr>` : `<tr><td>${esc(row.name)}</td><td>${row.width}×${row.height}</td><td>${row.rs.valid ? pct(row.rs.estimatedPayloadRate) : '—'}</td><td>${row.spa.valid ? pct(row.spa.estimatedPayloadRate) : '—'}</td><td>${row.consensus == null ? '—' : pct(row.consensus)}</td><td>${num(row.entropy, 5)}</td><td>${num(row.chi, 4)}</td><td>${num(row.residual, 4)}</td></tr>`).join('')}</tbody></table></div>`;
    setStatus(`Batch analysis complete for ${rows.length} file(s).`, 'success');
  }

  function selectSection(name) {
    panel.querySelectorAll('[data-bcsl-section]').forEach(section => { section.hidden = section.dataset.bcslSection !== name; });
    panel.querySelectorAll('[data-bcsl-tab]').forEach(button => button.classList.toggle('active', button.dataset.bcslTab === name));
  }

  function buildPanel() {
    if (panel) return panel;
    panel = document.createElement('section'); panel.id = PANEL_ID; panel.className = 'bcsl-shell'; panel.hidden = true;
    panel.innerHTML = `<div class="bcsl-backdrop" data-bcsl-close></div><div class="bcsl-dialog" role="dialog" aria-modal="true" aria-labelledby="bcsl-title"><header class="bcsl-header"><div><p class="bcsl-eyebrow">Scientific Tools · Decryption Dashboard · Media Forensics</p><h2 id="bcsl-title">Advanced Steganalysis Laboratory</h2><p>Quantitative LSB steganalysis, localization, known-cover parity, JPEG coefficient-domain inspection, Unicode hiding diagnostics, and detector evaluation. Measurements remain separate evidence channels instead of being collapsed into a single opaque probability.</p></div><button type="button" data-bcsl-close class="bcsl-close" aria-label="Close Advanced Steganalysis Laboratory">×</button></header><div class="bcsl-acquire"><label>Suspect file<input id="bcsl-suspect-file" type="file"></label><div data-bcsl-source class="bcsl-source"><span>No suspect loaded.</span></div><button type="button" data-bcsl-cancel disabled>Cancel active calculation</button></div><div class="bcsl-status" data-bcsl-status role="status" aria-live="polite">Load material to begin.</div><nav class="bcsl-tabs"><button type="button" class="active" data-bcsl-tab="raster">Raster RS / SPA</button><button type="button" data-bcsl-tab="compare">Known-cover parity</button><button type="button" data-bcsl-tab="jpeg">JPEG DCT</button><button type="button" data-bcsl-tab="text">Text / Unicode</button><button type="button" data-bcsl-tab="batch">Batch / Evaluation</button></nav><main class="bcsl-body">
      <section data-bcsl-section="raster"><div class="bcsl-grid"><article class="bcsl-card"><h3>Quantitative raster steganalysis</h3><div class="bcsl-controls"><label>Channel<select id="bcsl-channel"><option value="luma">Luma</option><option value="r">Red</option><option value="g">Green</option><option value="b">Blue</option><option value="a">Alpha</option></select></label><label>Tile size<select id="bcsl-tile-size"><option value="32">32 px</option><option value="64" selected>64 px</option><option value="128">128 px</option><option value="256">256 px</option></select></label><button type="button" data-bcsl-decode>Decode raster</button><button type="button" class="primary-action" data-bcsl-run-local>Run RS + SPA + localization</button></div><p class="bcsl-muted" data-bcsl-raster-meta>No raster decoded.</p><canvas id="bcsl-raster-preview"></canvas><div data-bcsl-metadata class="bcsl-metadata">No container metadata yet.</div></article><article class="bcsl-card"><h3>Evidence ledger</h3><div data-bcsl-ledger><p class="bcsl-muted">No quantitative run yet.</p></div></article></div><article class="bcsl-card"><h3>Localized detector heatmap</h3><label>Heatmap metric<select id="bcsl-heatmap-metric"><option value="consensus">RS/SPA payload estimate consensus</option><option value="rs">RS payload estimate</option><option value="spa">Sample Pair payload estimate</option><option value="lsb-balance">LSB 50/50 balance</option><option value="pair-equalization">Even/odd pair equalization</option><option value="residual">Residual roughness</option><option value="cooccurrence">Residual co-occurrence entropy</option></select></label><canvas id="bcsl-heatmap"></canvas><p class="bcsl-muted" data-bcsl-heatmap-note>No heatmap yet.</p><div data-bcsl-tile-table></div></article></section>
      <section data-bcsl-section="compare" hidden><div class="bcsl-grid"><article class="bcsl-card"><h3>Known cover</h3><label>Original / known-cover image<input id="bcsl-cover-file" type="file" accept="image/*"></label><p data-bcsl-cover-meta class="bcsl-muted">No cover loaded.</p><canvas id="bcsl-cover-preview"></canvas><button type="button" class="primary-action" data-bcsl-compare>Compare exact raster changes</button></article><article class="bcsl-card"><h3>Modification map</h3><canvas id="bcsl-change-map"></canvas><p class="bcsl-muted">White pixels changed; black pixels are identical.</p></article></div><article class="bcsl-card"><h3>Parity metrics</h3><div data-bcsl-comparison><p class="bcsl-muted">Load a suspect and a dimension-matched known cover.</p></div></article></section>
      <section data-bcsl-section="jpeg" hidden><article class="bcsl-card"><h3>Baseline JPEG coefficient-domain inspection</h3><p>Parses quantization and Huffman tables and decodes baseline sequential quantized DCT blocks. Progressive and restart-interval streams are reported explicitly rather than guessed.</p><button type="button" class="primary-action" data-bcsl-jpeg>Inspect JPEG coefficients</button><div data-bcsl-jpeg><p class="bcsl-muted">Load a JPEG to inspect DCT populations.</p></div></article></section>
      <section data-bcsl-section="text" hidden><article class="bcsl-card"><h3>Unicode / text steganography diagnostics</h3><textarea id="bcsl-text-input" rows="12" spellcheck="false" placeholder="Paste text to inspect zero-width characters, bidi controls, variation selectors, unusual spaces, trailing whitespace, and normalization changes."></textarea><button type="button" class="primary-action" data-bcsl-text>Analyze text structure</button><div data-bcsl-text-results><p class="bcsl-muted">No text analysis yet.</p></div></article></section>
      <section data-bcsl-section="batch" hidden><div class="bcsl-grid"><article class="bcsl-card"><h3>Batch raster corpus</h3><label>Image corpus<input id="bcsl-batch-files" type="file" accept="image/*" multiple></label><button type="button" class="primary-action" data-bcsl-batch>Analyze selected corpus</button><div data-bcsl-batch-results><p class="bcsl-muted">No batch run yet.</p></div></article><article class="bcsl-card"><h3>Detector evaluation metrics</h3><label>Truth labels (0/1)<textarea id="bcsl-eval-truth" rows="3" placeholder="0,0,1,1"></textarea></label><label>Detector scores<textarea id="bcsl-eval-scores" rows="3" placeholder="0.05,0.2,0.76,0.93"></textarea></label><label>Decision threshold<input id="bcsl-eval-threshold" type="number" min="0" max="1" step="0.01" value="0.5"></label><button type="button" data-bcsl-evaluate>Calculate ROC / confusion metrics</button><div data-bcsl-eval-results><p class="bcsl-muted">Metrics include ROC AUC, TPR, FPR, precision, balanced accuracy, MCC, and F1.</p></div></article></div></section>
    </main><footer class="bcsl-boundary"><strong>Evidence boundary:</strong> RS, Sample Pair Analysis, LSB pair statistics, residual features, JPEG coefficient populations, metadata anomalies, similarity scores, and Unicode controls have independent failure modes. The laboratory reports measurements and ground-truth comparisons; it does not label a carrier “stego” from a single statistic.</footer></div>`;
    document.body.appendChild(panel);
    panel.querySelectorAll('[data-bcsl-close]').forEach(node => node.addEventListener('click', closePanel));
    panel.querySelector('[data-bcsl-cancel]').addEventListener('click', () => cancelWorker('cancel requested by user'));
    panel.querySelector('#bcsl-suspect-file').addEventListener('change', event => { const file = event.target.files?.[0]; if (file) void loadSuspect(file).catch(error => setStatus(error.message, 'error')); });
    panel.querySelector('[data-bcsl-decode]').addEventListener('click', () => void decodeSuspectRaster().catch(error => setStatus(error.message, 'error')));
    panel.querySelector('[data-bcsl-run-local]').addEventListener('click', () => void runLocalized().catch(error => { if (error?.name !== 'AbortError') setStatus(error.message, 'error'); }));
    panel.querySelector('#bcsl-heatmap-metric').addEventListener('change', drawLocalizedHeatmap);
    panel.querySelector('#bcsl-cover-file').addEventListener('change', event => { const file = event.target.files?.[0]; if (file) void loadCover(file).catch(error => setStatus(error.message, 'error')); });
    panel.querySelector('[data-bcsl-compare]').addEventListener('click', () => void runKnownCoverComparison().catch(error => { if (error?.name !== 'AbortError') setStatus(error.message, 'error'); }));
    panel.querySelector('[data-bcsl-jpeg]').addEventListener('click', () => void runJpegInspection().catch(error => { if (error?.name !== 'AbortError') setStatus(error.message, 'error'); }));
    panel.querySelector('[data-bcsl-text]').addEventListener('click', () => { try { runTextAnalysis(); } catch (error) { setStatus(error.message, 'error'); } });
    panel.querySelector('[data-bcsl-batch]').addEventListener('click', () => void runBatch(panel.querySelector('#bcsl-batch-files').files).catch(error => { if (error?.name !== 'AbortError') setStatus(error.message, 'error'); }));
    panel.querySelector('[data-bcsl-evaluate]').addEventListener('click', () => { try { runEvaluation(); } catch (error) { setStatus(error.message, 'error'); } });
    panel.querySelectorAll('[data-bcsl-tab]').forEach(button => button.addEventListener('click', () => selectSection(button.dataset.bcslTab)));
    return panel;
  }

  async function openPanel(options = {}) {
    buildPanel(); panel.hidden = false; document.body.classList.add('bcsl-open');
    if (options.bytes) await loadSuspect(options.bytes, options.sourceName || 'handoff', options.mimeType || '');
    if (options.text != null) { panel.querySelector('#bcsl-text-input').value = String(options.text); selectSection('text'); }
    return panel;
  }

  function closePanel() { cancelWorker('lab closed'); if (panel) panel.hidden = true; document.body.classList.remove('bcsl-open'); }
  function currentState() { return Object.freeze({ panelOpen: Boolean(panel && !panel.hidden), sourceLoaded: Boolean(activeBytes?.length), rasterDecoded: Boolean(activeRaster), coverLoaded: Boolean(coverRaster), localizedComplete: Boolean(localizedReport), comparisonComplete: Boolean(comparisonReport), jpegComplete: Boolean(jpegReport) }); }

  window.BinaryCubeSteganalysisLab = Object.freeze({ openPanel, closePanel, currentState, loadSuspect, runLocalized, runKnownCoverComparison, runJpegInspection });
})();
