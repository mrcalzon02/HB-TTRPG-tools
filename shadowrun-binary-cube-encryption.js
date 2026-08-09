(() => {
  'use strict';

  const Engine = window.ShadowrunBinaryCubeEngine;
  const Executor = window.ShadowrunBinaryCubeWorkerClient;
  if (!Engine) {
    console.error('Shadowrun Binary Cube Engine must load before the laboratory interface.');
    return;
  }

  const TOOL_ID = 'shadowrun-binary-cube-encryption';
  const PANEL_ID = 'shadowrun-binary-cube-lab';
  const LAB_STATE_FORMAT = 'hb-ttrpg-shadowrun-binary-cube-laboratory-state';
  const LAB_STATE_SCHEMA_VERSION = '0.4.0';
  const LEGACY_STORAGE_KEYS = Object.freeze(['hb-ttrpg-shadowrun-binary-cube-v2']);
  const { FACES, RECOMMENDED_GRID_SIZES, SCHEMA_VERSION } = Engine.constants;
  let lastPlainFileName = 'binary-cube-output.bin';
  let operationGeneration = 0;

  function fail(message) { throw new Error(message); }
  function clone(value) { return value == null ? null : JSON.parse(JSON.stringify(value)); }

  function storageScope() {
    return String(document.body?.dataset?.binaryCubeStorageScope || 'web').replace(/[^A-Za-z0-9_-]+/g, '-');
  }

  function laboratoryStorageKey(scope = storageScope()) {
    return `${LAB_STATE_FORMAT}:${scope}`;
  }

  function migrateLaboratoryState(rawState) {
    if (!rawState || typeof rawState !== 'object' || Array.isArray(rawState)) return null;
    if (rawState.format === LAB_STATE_FORMAT && rawState.schemaVersion === LAB_STATE_SCHEMA_VERSION) return rawState;
    return {
      format: LAB_STATE_FORMAT,
      schemaVersion: LAB_STATE_SCHEMA_VERSION,
      input: rawState.input || '',
      package: rawState.package || '',
      key: rawState.key || '',
      decrypted: rawState.decrypted || '',
      plainFileName: rawState.plainFileName || 'binary-cube-output.bin',
      options: rawState.options || {}
    };
  }

  function setTransportArtifact(panel, kind = 'internal-package', documentObject = null) {
    panel.__cubeTransportArtifact = Object.freeze({ kind, document: clone(documentObject) });
  }

  function transportArtifact(panel) {
    return panel?.__cubeTransportArtifact || Object.freeze({ kind: 'internal-package', document: null });
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, character => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[character]));
  }
  function parseJson(value, label) {
    const raw = String(value ?? '').trim();
    if (!raw) fail(`${label} is empty.`);
    try { return JSON.parse(raw); }
    catch (error) { fail(`${label} is not valid JSON: ${error.message}`); }
  }
  function bytesToBits(bytes) {
    return Array.from(bytes, byte => Number(byte).toString(2).padStart(8, '0')).join('');
  }
  function bitsToBytes(bits) {
    const normalized = String(bits || '').replace(/\s+/g, '');
    if (!/^[01]+$/.test(normalized)) fail('Recovered unencrypted bits contain characters other than 0 and 1.');
    if (normalized.length % 8 !== 0) fail('Recovered unencrypted bits are not byte-aligned, so they cannot be downloaded as a normal file.');
    return new Uint8Array(Array.from({ length: normalized.length / 8 }, (_, index) => Number.parseInt(normalized.slice(index * 8, index * 8 + 8), 2)));
  }
  function safeFileName(value, fallback = 'binary-cube-output.bin') {
    const cleaned = String(value || '').replace(/[<>:"/\\|?*\u0000-\u001f]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 120);
    return cleaned || fallback;
  }

  function style() {
    if (document.getElementById(`${TOOL_ID}-style`)) return;
    const node = document.createElement('style');
    node.id = `${TOOL_ID}-style`;
    node.textContent = `
      #${PANEL_ID}{margin:24px 0;padding:20px;border:1px solid var(--line);border-radius:16px;background:#0e1219}
      #${PANEL_ID}[hidden]{display:none}.cube-lab-header{display:flex;gap:16px;align-items:flex-start;justify-content:space-between;flex-wrap:wrap}
      .cube-lab-warning{padding:12px 14px;border-left:4px solid #c88b2b;background:#c88b2b18;color:var(--ink);border-radius:6px}.cube-lab-runtime{padding:10px 12px;border-left:4px solid #5eb6ff;background:#5eb6ff12;border-radius:6px;color:var(--muted);line-height:1.45}
      .cube-transfer-lanes{display:grid;grid-template-columns:repeat(2,minmax(280px,1fr));gap:14px;margin:18px 0}.cube-transfer-lane{display:grid;gap:12px;padding:14px;border:1px solid var(--line);border-radius:14px;background:#111923}.cube-transfer-lane.encrypt{border-left:6px solid #5eb6ff}.cube-transfer-lane.decrypt{border-left:6px solid #b993ff}.cube-transfer-lane h3,.cube-transfer-lane p{margin:0}.cube-transfer-lane p{color:var(--muted);line-height:1.4}
      .cube-transfer-flow{display:grid;grid-template-columns:1fr auto 1fr;gap:8px;align-items:center}.cube-transfer-box{min-height:92px;padding:11px;border:1px dashed var(--line);border-radius:11px;background:#0c1118;display:grid;gap:7px;align-content:start}.cube-transfer-arrow{font-weight:900;color:var(--accent)}.cube-transfer-box .layout-button,.cube-transfer-box .link-button{width:100%;min-width:0}
      .cube-file-note{font:700 .75rem ui-monospace,monospace;color:#d7e7ff;word-break:break-word}.cube-lab-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px;margin:18px 0}.cube-lab-field{display:grid;gap:6px}.cube-lab-field label{font-weight:700}.cube-lab-field small{color:var(--muted)}.cube-lab-field textarea{min-height:120px;resize:vertical}.cube-lab-field input,.cube-lab-field select,.cube-lab-field textarea{width:100%;box-sizing:border-box}
      .cube-lab-actions{display:flex;flex-wrap:wrap;gap:8px;margin:14px 0}.cube-lab-actions button,.cube-lab-actions label{min-width:130px}.cube-file-button{position:relative;display:inline-flex;align-items:center;justify-content:center;cursor:pointer}.cube-file-button input{position:absolute;inline-size:1px;block-size:1px;opacity:0;pointer-events:none}.cube-cancel-operation{border-color:#b65d5d;color:#ffd1d1}
      .cube-lab-output{display:grid;gap:14px}.cube-lab-status{min-height:1.4em;color:var(--muted)}.cube-lab-status.error{color:#ffb3b3}.cube-lab-status.success{color:#b8efc0}.cube-preview-row{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:18px;align-items:start}.cube-preview{margin:0;display:grid;gap:8px}.cube-preview figcaption{font-weight:700}.cube-bit-grid{display:grid;grid-template-columns:repeat(var(--cube-grid-size),minmax(16px,24px));gap:2px;max-width:100%;overflow:auto}.cube-bit{display:grid;place-items:center;aspect-ratio:1;border:1px solid #ffffff22;border-radius:3px;font:700 .75rem ui-monospace,monospace}.cube-bit-1{background:#7fc8ff33}.cube-bit-0{background:#ffffff08}.cube-preview-summary,.cube-diagnostics{display:grid;gap:5px;padding:10px;border:1px dashed var(--line);border-radius:8px;color:var(--muted)}.cube-diagnostics strong{color:var(--ink)}
      @media(max-width:900px){.cube-transfer-lanes,.cube-transfer-flow{grid-template-columns:1fr}.cube-transfer-arrow{text-align:center}}
    `;
    document.head.appendChild(node);
  }

  function field(label, control, note = '') {
    return `<div class="cube-lab-field"><label>${label}</label>${control}${note ? `<small>${note}</small>` : ''}</div>`;
  }

  function gridMarkup(bits, size, label) {
    if (!bits) return '';
    if (size > 12 || bits === 'large-grid-projection-available') return `<div class="cube-preview-summary"><strong>${escapeHtml(label)}</strong><span>${size} × ${size} projection remains available through explicit exhaustive validation but is omitted from the DOM grid.</span></div>`;
    const cells = [...bits].map(bit => `<span class="cube-bit cube-bit-${bit}">${bit}</span>`).join('');
    return `<figure class="cube-preview"><figcaption>${escapeHtml(label)}</figcaption><div class="cube-bit-grid" style="--cube-grid-size:${size}">${cells}</div></figure>`;
  }

  function buildPanel() {
    const workspace = document.getElementById('shadowrun');
    if (!workspace) return null;
    let panel = document.getElementById(PANEL_ID);
    if (panel) return panel;
    panel = document.createElement('section');
    panel.id = PANEL_ID;
    panel.hidden = true;
    panel.innerHTML = `
      <div class="cube-lab-header"><div><p class="eyebrow">Experimental Matrix utility · engine ${SCHEMA_VERSION}</p><h2>Binary Cube Encryption Laboratory</h2><p>Generate, validate, export, inspect, and exchange canonical Binary Cube keys and packages.</p></div><button type="button" class="layout-button" data-cube-close>Close Laboratory</button></div>
      <p class="cube-lab-warning"><strong>Research and game-use warning:</strong> this is experimental permutation and obfuscation research. The checksum detects accidental changes but is not a cryptographic authenticator. Do not use this system to protect real credentials, financial records, private messages, or sensitive data.</p>
      <p class="cube-lab-runtime"><strong>Slow-hardware execution:</strong> expensive key, projection, encryption, decryption, and validation calls run in a dedicated Web Worker using the same canonical engine. The page remains interactive while slower systems work. Routine encrypt/decrypt uses the algebraic collision-free invariant; <em>Validate Pair</em> performs the deliberately slower exhaustive six-face projection check.</p>
      <div class="cube-transfer-lanes" aria-label="Binary Cube file transfer lanes">
        <section class="cube-transfer-lane encrypt"><h3>Unencrypted File In → Encrypted Package Out</h3><div class="cube-transfer-flow"><div class="cube-transfer-box"><strong>Unencrypted file</strong><label class="layout-button cube-file-button">Choose Unencrypted File<input id="cube-import-plain-file" type="file"></label><span id="cube-plain-file-note" class="cube-file-note">No unencrypted file loaded.</span></div><span class="cube-transfer-arrow">→</span><div class="cube-transfer-box"><strong>Canonical package</strong><button type="button" class="link-button" data-cube-encrypt-file>Encrypt Loaded File</button><button type="button" class="layout-button" data-cube-download-encrypted-file>Download Encrypted File</button></div></div><p>File bytes are converted to binary and encrypted through the canonical engine.</p></section>
        <section class="cube-transfer-lane decrypt"><h3>Encrypted Package In → Unencrypted File Out</h3><div class="cube-transfer-flow"><div class="cube-transfer-box"><strong>Encrypted package</strong><label class="layout-button cube-file-button">Choose Encrypted File<input id="cube-import-encrypted-file" type="file" accept="application/json,.json"></label><span id="cube-encrypted-file-note" class="cube-file-note">No encrypted package loaded.</span></div><span class="cube-transfer-arrow">→</span><div class="cube-transfer-box"><strong>Recovered file</strong><button type="button" class="link-button" data-cube-decrypt-file>Decrypt Loaded File</button><button type="button" class="layout-button" data-cube-download-plain-file>Download Unencrypted File</button></div></div><p>The matching key remains separate and is required for validation and recovery.</p></section>
      </div>
      <div class="cube-lab-grid">
        ${field('Manual unencrypted bits', '<textarea id="cube-input" spellcheck="false" placeholder="0100100001101001"></textarea>', 'Whitespace is ignored. File input is converted into bits here.')}
        ${field('Grid size', `<select id="cube-size">${RECOMMENDED_GRID_SIZES.map(size => `<option value="${size}">${size} × ${size} face · ${size * size} cells</option>`).join('')}</select>`)}
        ${field('Key seed', '<input id="cube-seed" type="text" value="shadowrun-matrix-demo">')}
        ${field('Input face', `<select id="cube-input-face">${FACES.map(face => `<option value="${face}"${face === 'top' ? ' selected' : ''}>${face}</option>`).join('')}</select>`)}
        ${field('Output face', `<select id="cube-output-face">${FACES.map(face => `<option value="${face}"${face === 'front' ? ' selected' : ''}>${face}</option>`).join('')}</select>`, 'Output must be perpendicular to input.')}
        ${field('Input start corner', '<select id="cube-input-turns"><option value="0">Top-left</option><option value="1">Top-right</option><option value="2">Bottom-right</option><option value="3">Bottom-left</option></select>')}
        ${field('Output orientation', '<select id="cube-output-turns"><option value="0">0°</option><option value="1">90°</option><option value="2">180°</option><option value="3">270°</option></select>')}
        ${field('Data-entry mask', '<select id="cube-mask-density"><option value="1">Full face · 100% payload</option><option value="0.75">Sparse · 75% payload</option><option value="0.5">Sparse · 50% payload</option></select>', 'The exact mask is retained in the key.')}
      </div>
      <div class="cube-lab-actions"><button type="button" class="link-button" data-cube-generate>Generate Key</button><button type="button" class="link-button" data-cube-encrypt>Encrypt Binary</button><button type="button" class="link-button" data-cube-decrypt>Decrypt Package</button><button type="button" class="layout-button" data-cube-validate>Validate Pair</button><button type="button" class="layout-button" data-cube-open-visualizer>Open in Visualizer</button><button type="button" class="layout-button" data-cube-reset>Reset</button><button type="button" class="layout-button cube-cancel-operation" data-cube-cancel disabled>Cancel active operation</button></div>
      <p id="cube-status" class="cube-lab-status" role="status" aria-live="polite"></p>
      <div class="cube-lab-output">
        ${field('Encrypted package JSON', '<textarea id="cube-package" spellcheck="false"></textarea>', 'Contains framing metadata, ciphertext, and corruption checksum; the key remains separate.')}
        <div class="cube-lab-actions"><button type="button" class="layout-button" data-cube-copy-package>Copy Package</button><button type="button" class="layout-button" data-cube-download-package>Download Package</button><label class="layout-button cube-file-button">Import Package<input id="cube-import-package" type="file" accept="application/json,.json"></label></div>
        ${field('Key JSON', '<textarea id="cube-key" spellcheck="false"></textarea>', 'Store and transmit the key separately from the package.')}
        <div class="cube-lab-actions"><button type="button" class="layout-button" data-cube-copy-key>Copy Key</button><button type="button" class="layout-button" data-cube-download-key>Download Key</button><label class="layout-button cube-file-button">Import Key<input id="cube-import-key" type="file" accept="application/json,.json"></label></div>
        ${field('Recovered unencrypted bits', '<textarea id="cube-decrypted" spellcheck="false" readonly></textarea>', 'Byte-aligned recovery can be downloaded as a normal file.')}
        <div id="cube-diagnostics" class="cube-diagnostics" hidden></div><div id="cube-preview-row" class="cube-preview-row" aria-live="polite"></div>
      </div>`;
    workspace.appendChild(panel);
    bindPanel(panel);
    restore(panel);
    return panel;
  }

  function values(panel) {
    return {
      gridSize: Number(panel.querySelector('#cube-size').value),
      seed: panel.querySelector('#cube-seed').value,
      inputFace: panel.querySelector('#cube-input-face').value,
      outputFace: panel.querySelector('#cube-output-face').value,
      inputQuarterTurns: Number(panel.querySelector('#cube-input-turns').value),
      outputQuarterTurns: Number(panel.querySelector('#cube-output-turns').value),
      maskDensity: Number(panel.querySelector('#cube-mask-density').value)
    };
  }

  function setStatus(panel, message, type = '') {
    const status = panel.querySelector('#cube-status');
    status.textContent = message;
    status.classList.toggle('error', type === 'error');
    status.classList.toggle('success', type === 'success');
  }
  function setFileNote(panel, selector, message) {
    const node = panel.querySelector(selector);
    if (node) node.textContent = message;
  }
  function syncOptionsFromSummary(panel, summary) {
    if (!summary) return;
    if (summary.gridSize != null) panel.querySelector('#cube-size').value = String(summary.gridSize);
  }
  function clearDiagnostics(panel) {
    panel.querySelector('#cube-diagnostics').hidden = true;
    panel.querySelector('#cube-diagnostics').innerHTML = '';
    panel.querySelector('#cube-preview-row').innerHTML = '';
  }
  function renderDiagnosticsSummary(panel, diagnostics) {
    if (!diagnostics) return clearDiagnostics(panel);
    const node = panel.querySelector('#cube-diagnostics');
    node.hidden = false;
    const proof = diagnostics.exhaustive ? 'exhaustive six-face check' : 'algebraic invariant';
    node.innerHTML = `<strong>Validated key ${escapeHtml(diagnostics.keyId)}</strong><span>${Number(diagnostics.pointCount).toLocaleString()} collision-free points · ${Number(diagnostics.payloadCapacity).toLocaleString()} payload cells · ${Number(diagnostics.inactiveMaskCells).toLocaleString()} masked filler cells</span><span>${diagnostics.blockCount} block${diagnostics.blockCount === 1 ? '' : 's'} · ${Number(diagnostics.originalBitLength).toLocaleString()} source bits · ${Number(diagnostics.ciphertextBitLength).toLocaleString()} transmitted bits</span><span>Checksum ${escapeHtml(diagnostics.checksum)} · ${escapeHtml(diagnostics.checksumType)} · ${escapeHtml(proof)}</span>`;
    const faces = diagnostics.firstBlockFaces;
    panel.querySelector('#cube-preview-row').innerHTML = faces
      ? FACES.map(face => gridMarkup(faces[face], diagnostics.gridSize, `${face} projection`)).join('')
      : `<div class="cube-preview-summary"><strong>Large-grid diagnostic</strong><span>Exact per-face DOM previews are intentionally omitted. Use Validate Pair for the exhaustive six-face calculation without blocking the page.</span></div>`;
  }

  const HEAVY_SELECTORS = Object.freeze([
    '[data-cube-generate]', '[data-cube-encrypt]', '[data-cube-decrypt]', '[data-cube-validate]',
    '[data-cube-encrypt-file]', '[data-cube-decrypt-file]', '#cube-import-key', '#cube-import-package', '#cube-import-encrypted-file'
  ]);

  function setBusy(panel, busy) {
    HEAVY_SELECTORS.forEach(selector => {
      const control = panel.querySelector(selector);
      if (control) control.disabled = busy;
    });
    const cancel = panel.querySelector('[data-cube-cancel]');
    if (cancel) cancel.disabled = !busy;
    panel.dataset.cubeWorkerBusy = busy ? 'true' : 'false';
  }

  async function runBackground(panel, operation, payload, label) {
    if (!Executor?.run) fail('Freeze-safe Binary Cube worker execution is unavailable. Reload the page so binary-cube-worker-client.js can initialize.');
    const generation = ++operationGeneration;
    if (Executor.isBusy?.()) Executor.cancelAll('superseded by a newer operation');
    setBusy(panel, true);
    setStatus(panel, `${label} · starting background worker…`);
    try {
      const result = await Executor.run(operation, payload, {
        onProgress: update => {
          if (generation !== operationGeneration) return;
          const percentage = Math.round(update.fraction * 100);
          setStatus(panel, `${label} · ${update.stage} · ${percentage}%`);
        }
      });
      if (generation !== operationGeneration) throw Object.assign(new Error('Operation was superseded.'), { name: 'AbortError' });
      return result;
    } finally {
      if (generation === operationGeneration) setBusy(panel, false);
    }
  }

  function cancelActiveOperation(panel, reason = 'cancelled by user') {
    operationGeneration += 1;
    const cancelled = Executor?.cancelAll?.(reason) || false;
    setBusy(panel, false);
    if (cancelled) setStatus(panel, 'Background Binary Cube operation cancelled.', 'success');
    return cancelled;
  }

  function save(panel) {
    try {
      localStorage.setItem(laboratoryStorageKey(), JSON.stringify({
        format: LAB_STATE_FORMAT,
        schemaVersion: LAB_STATE_SCHEMA_VERSION,
        input: panel.querySelector('#cube-input').value,
        package: panel.querySelector('#cube-package').value,
        key: panel.querySelector('#cube-key').value,
        decrypted: panel.querySelector('#cube-decrypted').value,
        plainFileName: lastPlainFileName,
        options: values(panel)
      }));
    } catch (_) { /* Browser storage is optional. */ }
  }
  function restore(panel) {
    const currentKey = laboratoryStorageKey();
    try {
      let raw = localStorage.getItem(currentKey);
      let legacyKey = null;
      if (!raw) {
        for (const candidate of LEGACY_STORAGE_KEYS) {
          raw = localStorage.getItem(candidate);
          if (raw) { legacyKey = candidate; break; }
        }
      }
      const saved = migrateLaboratoryState(JSON.parse(raw || 'null'));
      if (!saved) return;
      localStorage.setItem(currentKey, JSON.stringify(saved));
      if (legacyKey) localStorage.removeItem(legacyKey);
      panel.querySelector('#cube-input').value = saved.input || '';
      panel.querySelector('#cube-package').value = saved.package || '';
      panel.querySelector('#cube-key').value = saved.key || '';
      panel.querySelector('#cube-decrypted').value = saved.decrypted || '';
      lastPlainFileName = saved.plainFileName || lastPlainFileName;
      let storedPackage = null;
      try { storedPackage = saved.package ? JSON.parse(saved.package) : null; } catch (_) { /* Preserve editable invalid package text without exporting it. */ }
      setTransportArtifact(panel, 'internal-package', storedPackage);
      setFileNote(panel, '#cube-plain-file-note', saved.plainFileName ? `Last unencrypted file: ${saved.plainFileName}` : 'No unencrypted file loaded.');
      const options = saved.options || {};
      for (const [selector, value] of [['#cube-size',options.gridSize],['#cube-seed',options.seed],['#cube-input-face',options.inputFace],['#cube-output-face',options.outputFace],['#cube-input-turns',options.inputQuarterTurns],['#cube-output-turns',options.outputQuarterTurns],['#cube-mask-density',options.maskDensity]]) {
        if (value !== undefined && value !== null) panel.querySelector(selector).value = String(value);
      }
    } catch (_) { localStorage.removeItem(currentKey); }
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = safeFileName(filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }
  function downloadText(value, filename, type = 'application/json') {
    downloadBlob(new Blob([String(value)], { type }), filename);
  }
  async function copyText(value) {
    const text = String(value || '');
    if (!text.trim()) fail('There is nothing to copy.');
    if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(text);
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    if (!document.execCommand('copy')) fail('The browser could not copy the text.');
    textarea.remove();
  }
  async function readJsonFile(file, label) {
    if (!file) fail(`${label} was not selected.`);
    const text = await file.text();
    parseJson(text, label);
    return text;
  }

  async function importPlainFile(panel, file) {
    if (!file) fail('Choose an unencrypted file first.');
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (!bytes.length) fail('The selected unencrypted file is empty.');
    lastPlainFileName = file.name || 'binary-cube-output.bin';
    panel.querySelector('#cube-input').value = bytesToBits(bytes);
    panel.querySelector('#cube-package').value = '';
    panel.querySelector('#cube-decrypted').value = '';
    clearDiagnostics(panel);
    setFileNote(panel, '#cube-plain-file-note', `${lastPlainFileName} loaded · ${bytes.length} bytes · ${bytes.length * 8} bits.`);
    setStatus(panel, `Unencrypted file loaded: ${lastPlainFileName}.`, 'success');
    save(panel);
  }

  async function importEncryptedFile(panel, file) {
    const packageJson = await readJsonFile(file, 'Encrypted package file');
    panel.querySelector('#cube-package').value = packageJson;
    setFileNote(panel, '#cube-encrypted-file-note', `${file.name || 'encrypted package'} loaded.`);
    const keyJson = panel.querySelector('#cube-key').value.trim();
    if (keyJson) {
      const result = await runBackground(panel, 'validate-pair', { keyJson, packageJson, exhaustive: false }, 'Import validation');
      panel.querySelector('#cube-key').value = result.keyJson;
      panel.querySelector('#cube-package').value = result.packageJson;
      renderDiagnosticsSummary(panel, result.diagnostics);
      setStatus(panel, 'Encrypted package loaded; checksum, framing, and algebraic invariant validated. Use Validate Pair for the exhaustive six-face check.', 'success');
    } else {
      clearDiagnostics(panel);
      setStatus(panel, 'Encrypted package loaded. Import its matching key before decryption.', 'success');
    }
    save(panel);
  }

  async function encryptCurrentInput(panel) {
    const keyJson = panel.querySelector('#cube-key').value.trim() || null;
    const result = await runBackground(panel, 'encrypt', {
      bits: panel.querySelector('#cube-input').value,
      keyJson,
      options: values(panel),
      exhaustive: false
    }, 'Encrypting');
    panel.querySelector('#cube-key').value = result.keyJson;
    panel.querySelector('#cube-package').value = result.packageJson;
    panel.querySelector('#cube-decrypted').value = '';
    syncOptionsFromSummary(panel, result.keySummary);
    setTransportArtifact(panel, 'internal-package', parseJson(result.packageJson, 'Worker package result'));
    renderDiagnosticsSummary(panel, result.diagnostics);
    return result;
  }

  async function decryptCurrentPackage(panel) {
    const result = await runBackground(panel, 'decrypt', {
      keyJson: panel.querySelector('#cube-key').value,
      packageJson: panel.querySelector('#cube-package').value,
      exhaustive: false
    }, 'Decrypting');
    panel.querySelector('#cube-key').value = result.keyJson;
    panel.querySelector('#cube-package').value = result.packageJson;
    panel.querySelector('#cube-decrypted').value = result.plaintext;
    setTransportArtifact(panel, 'internal-package', parseJson(result.packageJson, 'Worker package result'));
    renderDiagnosticsSummary(panel, result.diagnostics);
    return result;
  }

  function currentArtifacts() {
    const panel = buildPanel();
    const keyText = panel?.querySelector('#cube-key')?.value.trim() || '';
    const packageText = panel?.querySelector('#cube-package')?.value.trim() || '';
    let key = null;
    let packageObject = null;
    try { if (keyText) key = JSON.parse(keyText); } catch (_) { /* Preserve editable invalid text without exporting it. */ }
    try { if (packageText) packageObject = JSON.parse(packageText); } catch (_) { /* Preserve editable invalid text without exporting it. */ }
    const transport = transportArtifact(panel);
    return Object.freeze({
      source: 'laboratory',
      sourceFileName: lastPlainFileName,
      bits: panel?.querySelector('#cube-input')?.value.replace(/\s+/g, '') || '',
      key: clone(key),
      transportKind: transport.kind,
      transportDocument: clone(transport.document),
      packageObject: transport.kind === 'internal-package' ? clone(packageObject) : null,
      secureExport: transport.kind === 'secure-export' ? clone(transport.document) : null,
      authenticatedEnvelope: transport.kind === 'authenticated-envelope' ? clone(transport.document) : null,
      recoveredBits: panel?.querySelector('#cube-decrypted')?.value.replace(/\s+/g, '') || ''
    });
  }

  async function loadArtifacts(artifacts = {}) {
    const panel = buildPanel();
    if (!panel) fail('The Shadowrun workspace is unavailable.');
    if (artifacts.sourceFileName) lastPlainFileName = safeFileName(artifacts.sourceFileName, lastPlainFileName);
    if (artifacts.bits) panel.querySelector('#cube-input').value = String(artifacts.bits).replace(/\s+/g, '');
    let keyJson = '';
    if (artifacts.key) {
      keyJson = JSON.stringify(artifacts.key, null, 2);
      const validated = await runBackground(panel, 'validate-key', { keyJson, exhaustive: false }, 'Loading key');
      keyJson = validated.keyJson;
      panel.querySelector('#cube-key').value = keyJson;
      syncOptionsFromSummary(panel, validated.summary);
    }
    const transportKind = artifacts.transportKind
      || (artifacts.secureExport ? 'secure-export' : artifacts.authenticatedEnvelope ? 'authenticated-envelope' : 'internal-package');
    const transportDocument = artifacts.transportDocument || artifacts.secureExport || artifacts.authenticatedEnvelope || artifacts.packageObject || null;
    if (transportKind === 'authenticated-envelope' && transportDocument) {
      window.ShadowrunBinaryCubeAuthUI?.loadEnvelopeArtifact?.(transportDocument);
      setTransportArtifact(panel, transportKind, transportDocument);
      panel.querySelector('#cube-package').value = '';
      panel.querySelector('#cube-decrypted').value = '';
      clearDiagnostics(panel);
    } else if (transportDocument) {
      if (!keyJson) keyJson = panel.querySelector('#cube-key').value.trim();
      if (!keyJson) fail('A matching Binary Cube key is required to load this transport artifact.');
      let packageDocument = transportDocument;
      if (transportKind === 'secure-export') {
        const key = Engine.validateKey(JSON.parse(keyJson));
        packageDocument = window.ShadowrunBinaryCubeSecureExport.expandSecureExport(transportDocument, key, Engine);
      }
      const packageJson = JSON.stringify(packageDocument, null, 2);
      const result = await runBackground(panel, 'decrypt', { keyJson, packageJson, exhaustive: false }, 'Loading package');
      panel.querySelector('#cube-key').value = result.keyJson;
      panel.querySelector('#cube-package').value = result.packageJson;
      panel.querySelector('#cube-decrypted').value = result.plaintext;
      if (!panel.querySelector('#cube-input').value.trim()) panel.querySelector('#cube-input').value = result.plaintext;
      setTransportArtifact(panel, transportKind, transportDocument);
      renderDiagnosticsSummary(panel, result.diagnostics);
    } else {
      setTransportArtifact(panel, 'internal-package', null);
      panel.querySelector('#cube-package').value = '';
      panel.querySelector('#cube-decrypted').value = artifacts.recoveredBits || '';
      clearDiagnostics(panel);
    }
    setFileNote(panel, '#cube-plain-file-note', `Artifacts loaded from ${artifacts.source || 'external source'}${lastPlainFileName ? ` · ${lastPlainFileName}` : ''}.`);
    save(panel);
    openPanel();
    setStatus(panel, `Binary Cube artifacts loaded from ${artifacts.source || 'external source'}.`, 'success');
    return currentArtifacts();
  }

  function bindPanel(panel) {
    if (panel.dataset.cubeLabBound === 'true') return;
    panel.dataset.cubeLabBound = 'true';
    panel.querySelector('[data-cube-close]').addEventListener('click', () => { cancelActiveOperation(panel, 'cancelled because the laboratory closed'); panel.hidden = true; });
    panel.querySelector('[data-cube-cancel]').addEventListener('click', () => cancelActiveOperation(panel));
    panel.querySelector('#cube-import-plain-file').addEventListener('change', async event => { try { await importPlainFile(panel, event.target.files?.[0]); } catch (error) { setStatus(panel, error.message, 'error'); } event.target.value = ''; });
    panel.querySelector('#cube-import-encrypted-file').addEventListener('change', async event => { try { await importEncryptedFile(panel, event.target.files?.[0]); } catch (error) { if (error.name !== 'AbortError') setStatus(panel, error.message, 'error'); } event.target.value = ''; });
    panel.querySelector('[data-cube-encrypt-file]').addEventListener('click', async () => { try { const result = await encryptCurrentInput(panel); setFileNote(panel, '#cube-encrypted-file-note', `Encrypted package ready for key ${result.keySummary.keyId}.`); setStatus(panel, `${result.diagnostics.blockCount} package block${result.diagnostics.blockCount === 1 ? '' : 's'} generated using key ${result.keySummary.keyId}.`, 'success'); save(panel); } catch (error) { if (error.name !== 'AbortError') setStatus(panel, error.message, 'error'); } });
    panel.querySelector('[data-cube-decrypt-file]').addEventListener('click', async () => { try { const result = await decryptCurrentPackage(panel); setStatus(panel, `${result.plaintext.length} recovered bits are ready.`, 'success'); save(panel); } catch (error) { if (error.name !== 'AbortError') setStatus(panel, error.message, 'error'); } });
    panel.querySelector('[data-cube-download-encrypted-file]').addEventListener('click', async () => { try { const result = await runBackground(panel, 'validate-pair', { keyJson: panel.querySelector('#cube-key').value, packageJson: panel.querySelector('#cube-package').value, exhaustive: false }, 'Preparing download'); downloadText(`${result.packageJson}\n`, `encrypted-binary-cube-package-${result.keySummary.keyId}.json`); setStatus(panel, 'Validated encrypted package downloaded.', 'success'); } catch (error) { if (error.name !== 'AbortError') setStatus(panel, error.message, 'error'); } });
    panel.querySelector('[data-cube-download-plain-file]').addEventListener('click', () => { try { downloadBlob(new Blob([bitsToBytes(panel.querySelector('#cube-decrypted').value)], { type: 'application/octet-stream' }), `decrypted-${lastPlainFileName}`); } catch (error) { setStatus(panel, error.message, 'error'); } });
    panel.querySelector('[data-cube-generate]').addEventListener('click', async () => { try { const result = await runBackground(panel, 'create-key', { options: values(panel), exhaustive: true }, 'Generating key'); panel.querySelector('#cube-key').value = result.keyJson; panel.querySelector('#cube-package').value = ''; panel.querySelector('#cube-decrypted').value = ''; clearDiagnostics(panel); setStatus(panel, `Key ${result.summary.keyId} generated and exhaustively checked with ${result.summary.payloadCells.toLocaleString()} payload cells.`, 'success'); save(panel); } catch (error) { if (error.name !== 'AbortError') setStatus(panel, error.message, 'error'); } });
    panel.querySelector('[data-cube-encrypt]').addEventListener('click', async () => { try { const result = await encryptCurrentInput(panel); setStatus(panel, `${result.diagnostics.originalBitLength} bits encrypted into ${result.diagnostics.blockCount} block${result.diagnostics.blockCount === 1 ? '' : 's'} using key ${result.keySummary.keyId}.`, 'success'); save(panel); } catch (error) { if (error.name !== 'AbortError') setStatus(panel, error.message, 'error'); } });
    panel.querySelector('[data-cube-decrypt]').addEventListener('click', async () => { try { const result = await decryptCurrentPackage(panel); setStatus(panel, `${result.plaintext.length} original bits recovered.`, 'success'); save(panel); } catch (error) { if (error.name !== 'AbortError') setStatus(panel, error.message, 'error'); } });
    panel.querySelector('[data-cube-validate]').addEventListener('click', async () => { try { const result = await runBackground(panel, 'validate-pair', { keyJson: panel.querySelector('#cube-key').value, packageJson: panel.querySelector('#cube-package').value, exhaustive: true }, 'Exhaustive validation'); panel.querySelector('#cube-key').value = result.keyJson; panel.querySelector('#cube-package').value = result.packageJson; renderDiagnosticsSummary(panel, result.diagnostics); setStatus(panel, `Key ${result.keySummary.keyId}, checksum ${result.diagnostics.checksum}, and all six face projections are valid.`, 'success'); save(panel); } catch (error) { if (error.name !== 'AbortError') setStatus(panel, error.message, 'error'); } });
    panel.querySelector('[data-cube-open-visualizer]').addEventListener('click', () => { try { window.dispatchEvent(new CustomEvent('shadowrun-binary-cube-open-visualizer', { detail: currentArtifacts() })); } catch (error) { setStatus(panel, error.message, 'error'); } });
    panel.querySelector('[data-cube-copy-key]').addEventListener('click', async () => { try { await copyText(panel.querySelector('#cube-key').value); setStatus(panel, 'Key JSON copied.', 'success'); } catch (error) { setStatus(panel, error.message, 'error'); } });
    panel.querySelector('[data-cube-copy-package]').addEventListener('click', async () => { try { await copyText(panel.querySelector('#cube-package').value); setStatus(panel, 'Package JSON copied.', 'success'); } catch (error) { setStatus(panel, error.message, 'error'); } });
    panel.querySelector('[data-cube-download-key]').addEventListener('click', async () => { try { const result = await runBackground(panel, 'validate-key', { keyJson: panel.querySelector('#cube-key').value, exhaustive: false }, 'Validating key'); downloadText(`${result.keyJson}\n`, `shadowrun-binary-cube-key-${result.summary.keyId}.json`); setStatus(panel, 'Validated key downloaded.', 'success'); } catch (error) { if (error.name !== 'AbortError') setStatus(panel, error.message, 'error'); } });
    panel.querySelector('[data-cube-download-package]').addEventListener('click', async () => { try { const result = await runBackground(panel, 'validate-pair', { keyJson: panel.querySelector('#cube-key').value, packageJson: panel.querySelector('#cube-package').value, exhaustive: false }, 'Validating package'); downloadText(`${result.packageJson}\n`, `shadowrun-binary-cube-package-${result.keySummary.keyId}.json`); setStatus(panel, 'Validated package downloaded.', 'success'); } catch (error) { if (error.name !== 'AbortError') setStatus(panel, error.message, 'error'); } });
    panel.querySelector('#cube-import-key').addEventListener('change', async event => { try { const keyJson = await readJsonFile(event.target.files?.[0], 'Key file'); const result = await runBackground(panel, 'validate-key', { keyJson, exhaustive: false }, 'Importing key'); panel.querySelector('#cube-key').value = result.keyJson; syncOptionsFromSummary(panel, result.summary); clearDiagnostics(panel); setStatus(panel, `Key ${result.summary.keyId} imported and validated.`, 'success'); save(panel); } catch (error) { if (error.name !== 'AbortError') setStatus(panel, error.message, 'error'); } event.target.value = ''; });
    panel.querySelector('#cube-import-package').addEventListener('change', async event => { try { const packageJson = await readJsonFile(event.target.files?.[0], 'Package file'); panel.querySelector('#cube-package').value = packageJson; const keyJson = panel.querySelector('#cube-key').value.trim(); if (keyJson) { const result = await runBackground(panel, 'validate-pair', { keyJson, packageJson, exhaustive: false }, 'Importing package'); panel.querySelector('#cube-key').value = result.keyJson; panel.querySelector('#cube-package').value = result.packageJson; renderDiagnosticsSummary(panel, result.diagnostics); setStatus(panel, 'Package imported; checksum, framing, and algebraic invariant validated.', 'success'); } else { clearDiagnostics(panel); setStatus(panel, 'Package imported; add its matching key to validate.', 'success'); } save(panel); } catch (error) { if (error.name !== 'AbortError') setStatus(panel, error.message, 'error'); } event.target.value = ''; });
    panel.querySelector('[data-cube-reset]').addEventListener('click', () => {
      if (!confirm('Clear the Binary Cube Encryption Laboratory and its local browser save?')) return;
      cancelActiveOperation(panel, 'cancelled by laboratory reset');
      localStorage.removeItem(laboratoryStorageKey());
      for (const legacyKey of LEGACY_STORAGE_KEYS) localStorage.removeItem(legacyKey);
      panel.querySelectorAll('textarea').forEach(textarea => { textarea.value = ''; });
      panel.querySelector('#cube-size').value = '4'; panel.querySelector('#cube-seed').value = 'shadowrun-matrix-demo'; panel.querySelector('#cube-input-face').value = 'top'; panel.querySelector('#cube-output-face').value = 'front'; panel.querySelector('#cube-input-turns').value = '0'; panel.querySelector('#cube-output-turns').value = '0'; panel.querySelector('#cube-mask-density').value = '1';
      lastPlainFileName = 'binary-cube-output.bin'; setFileNote(panel, '#cube-plain-file-note', 'No unencrypted file loaded.'); setFileNote(panel, '#cube-encrypted-file-note', 'No encrypted package loaded.'); clearDiagnostics(panel); setStatus(panel, 'Laboratory reset.', 'success');
    });
    panel.addEventListener('input', () => save(panel));
  }

  function openPanel() {
    const panel = buildPanel();
    if (!panel) return null;
    panel.hidden = false;
    panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    return panel;
  }
  function bindLaunchers() {
    document.querySelectorAll(`[data-shadowrun-open="${TOOL_ID}"]`).forEach(button => {
      if (button.dataset.cubeBound) return;
      button.dataset.cubeBound = 'true';
      button.addEventListener('click', openPanel);
    });
  }
  function init() {
    style(); buildPanel(); bindLaunchers();
    const grid = document.getElementById('shadowrun-grid');
    if (grid && grid.dataset.cubeObserver !== 'true') {
      grid.dataset.cubeObserver = 'true';
      new MutationObserver(bindLaunchers).observe(grid, { childList: true, subtree: true });
    }
  }

  window.ShadowrunBinaryCubeEncryption = Object.freeze({
    openPanel,
    loadArtifacts,
    currentArtifacts,
    cancelActiveOperation: () => cancelActiveOperation(buildPanel()),
    utilities: Object.freeze({ bytesToBits, bitsToBytes, laboratoryStorageKey, migrateLaboratoryState }),
    constants: Object.freeze({ LAB_STATE_FORMAT, LAB_STATE_SCHEMA_VERSION }),
    engine: Engine,
    executor: Executor || null
  });
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', init, { once: true }) : init();
})();
