(() => {
  'use strict';

  const Engine = window.ShadowrunBinaryCubeEngine;
  if (!Engine) {
    console.error('Shadowrun Binary Cube Engine must load before the laboratory interface.');
    return;
  }

  const TOOL_ID = 'shadowrun-binary-cube-encryption';
  const PANEL_ID = 'shadowrun-binary-cube-lab';
  const STORAGE_KEY = 'hb-ttrpg-shadowrun-binary-cube-v2';
  const { FACES, RECOMMENDED_GRID_SIZES, SCHEMA_VERSION } = Engine.constants;

  function fail(message) {
    throw new Error(message);
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, character => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[character]));
  }

  function gridMarkup(bits, size, label) {
    if (!bits) return '';
    if (size > 12) {
      return `<div class="cube-preview-summary"><strong>${escapeHtml(label)}</strong><span>${size} × ${size} projection available in diagnostics but omitted from the visual grid.</span></div>`;
    }
    const cells = [...bits].map(bit => `<span class="cube-bit cube-bit-${bit}">${bit}</span>`).join('');
    return `<figure class="cube-preview"><figcaption>${escapeHtml(label)}</figcaption><div class="cube-bit-grid" style="--cube-grid-size:${size}">${cells}</div></figure>`;
  }

  function style() {
    if (document.getElementById(`${TOOL_ID}-style`)) return;
    const node = document.createElement('style');
    node.id = `${TOOL_ID}-style`;
    node.textContent = `
      #${PANEL_ID}{margin:24px 0;padding:20px;border:1px solid var(--line);border-radius:16px;background:#0e1219}
      #${PANEL_ID}[hidden]{display:none}
      .cube-lab-header{display:flex;gap:16px;align-items:flex-start;justify-content:space-between;flex-wrap:wrap}
      .cube-lab-warning{padding:12px 14px;border-left:4px solid #c88b2b;background:#c88b2b18;color:var(--ink);border-radius:6px}
      .cube-lab-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px;margin:18px 0}
      .cube-lab-field{display:grid;gap:6px}.cube-lab-field label{font-weight:700}.cube-lab-field small{color:var(--muted)}
      .cube-lab-field textarea{min-height:120px;resize:vertical}.cube-lab-field input,.cube-lab-field select,.cube-lab-field textarea{width:100%;box-sizing:border-box}
      .cube-lab-actions{display:flex;flex-wrap:wrap;gap:8px;margin:14px 0}.cube-lab-actions button,.cube-lab-actions label{min-width:130px}
      .cube-file-button{display:inline-flex;align-items:center;justify-content:center;cursor:pointer}.cube-file-button input{position:absolute;inline-size:1px;block-size:1px;opacity:0;pointer-events:none}
      .cube-lab-output{display:grid;gap:14px}.cube-lab-status{min-height:1.4em;color:var(--muted)}.cube-lab-status.error{color:#ffb3b3}.cube-lab-status.success{color:#b8efc0}
      .cube-preview-row{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:18px;align-items:start}.cube-preview{margin:0;display:grid;gap:8px}.cube-preview figcaption{font-weight:700}
      .cube-bit-grid{display:grid;grid-template-columns:repeat(var(--cube-grid-size),minmax(16px,24px));gap:2px;max-width:100%;overflow:auto}
      .cube-bit{display:grid;place-items:center;aspect-ratio:1;border:1px solid #ffffff22;border-radius:3px;font:700 .75rem ui-monospace,monospace}.cube-bit-1{background:#7fc8ff33}.cube-bit-0{background:#ffffff08}
      .cube-preview-summary,.cube-diagnostics{display:grid;gap:5px;padding:10px;border:1px dashed var(--line);border-radius:8px;color:var(--muted)}
      .cube-diagnostics strong{color:var(--ink)}
    `;
    document.head.appendChild(node);
  }

  function field(label, control, note = '') {
    return `<div class="cube-lab-field"><label>${label}</label>${control}${note ? `<small>${note}</small>` : ''}</div>`;
  }

  function buildPanel() {
    const workspace = document.getElementById('shadowrun');
    if (!workspace || document.getElementById(PANEL_ID)) return;
    const panel = document.createElement('section');
    panel.id = PANEL_ID;
    panel.hidden = true;
    panel.innerHTML = `
      <div class="cube-lab-header">
        <div><p class="eyebrow">Experimental Matrix utility · engine ${SCHEMA_VERSION}</p><h2>Binary Cube Encryption Laboratory</h2><p>Generate, validate, export, and inspect a reversible keyed 3D face-projection permutation.</p></div>
        <button type="button" class="layout-button" data-cube-close>Close Laboratory</button>
      </div>
      <p class="cube-lab-warning"><strong>Research and game-use warning:</strong> this is experimental permutation and obfuscation research. The checksum detects accidental changes but is not a cryptographic authenticator. Do not use this system to protect real credentials, financial records, private messages, or sensitive data.</p>
      <div class="cube-lab-grid">
        ${field('Binary input', '<textarea id="cube-input" spellcheck="false" placeholder="0100100001101001"></textarea>', 'Whitespace is ignored. All other characters are rejected.')}
        ${field('Grid size', `<select id="cube-size">${RECOMMENDED_GRID_SIZES.map(size => `<option value="${size}">${size} × ${size} face · ${size * size} cells</option>`).join('')}</select>`, 'The source recommends 4, 12, 20, 28, 36, 44, 52, and 60.')}
        ${field('Key seed', '<input id="cube-seed" type="text" value="shadowrun-matrix-demo">', 'The seed deterministically generates coordinate permutations, mask placement, and filler.')}
        ${field('Input face', `<select id="cube-input-face">${FACES.map(face => `<option value="${face}" ${face === 'top' ? 'selected' : ''}>${face}</option>`).join('')}</select>`)}
        ${field('Output face', `<select id="cube-output-face">${FACES.map(face => `<option value="${face}" ${face === 'front' ? 'selected' : ''}>${face}</option>`).join('')}</select>`, 'The output must be perpendicular to the input face.')}
        ${field('Input start corner', '<select id="cube-input-turns"><option value="0">Top-left</option><option value="1">Top-right</option><option value="2">Bottom-right</option><option value="3">Bottom-left</option></select>')}
        ${field('Output orientation', '<select id="cube-output-turns"><option value="0">0°</option><option value="1">90°</option><option value="2">180°</option><option value="3">270°</option></select>')}
        ${field('Data-entry mask', '<select id="cube-mask-density"><option value="1">Full face · 100% payload</option><option value="0.75">Sparse · 75% payload</option><option value="0.5">Sparse · 50% payload</option></select>', 'Inactive cells receive deterministic filler and the exact mask remains in the key.')}
      </div>
      <div class="cube-lab-actions">
        <button type="button" class="link-button" data-cube-generate>Generate Key</button>
        <button type="button" class="link-button" data-cube-encrypt>Encrypt Binary</button>
        <button type="button" class="link-button" data-cube-decrypt>Decrypt Package</button>
        <button type="button" class="layout-button" data-cube-validate>Validate Pair</button>
        <button type="button" class="layout-button" data-cube-reset>Reset</button>
      </div>
      <p id="cube-status" class="cube-lab-status" role="status" aria-live="polite"></p>
      <div class="cube-lab-output">
        ${field('Encrypted package JSON', '<textarea id="cube-package" spellcheck="false" placeholder="Generate a key, then encrypt binary data."></textarea>', 'Contains framing metadata, ciphertext, and a non-cryptographic corruption checksum; it does not contain coordinate permutations or the mask.')}
        <div class="cube-lab-actions">
          <button type="button" class="layout-button" data-cube-copy-package>Copy Package</button>
          <button type="button" class="layout-button" data-cube-download-package>Download Package</button>
          <label class="layout-button cube-file-button">Import Package<input id="cube-import-package" type="file" accept="application/json,.json"></label>
        </div>
        ${field('Key JSON', '<textarea id="cube-key" spellcheck="false" placeholder="Generate or import a key JSON document."></textarea>', 'Store and transmit the key separately from the encrypted package.')}
        <div class="cube-lab-actions">
          <button type="button" class="layout-button" data-cube-copy-key>Copy Key</button>
          <button type="button" class="layout-button" data-cube-download-key>Download Key</button>
          <label class="layout-button cube-file-button">Import Key<input id="cube-import-key" type="file" accept="application/json,.json"></label>
        </div>
        ${field('Decrypted binary', '<textarea id="cube-decrypted" spellcheck="false" readonly></textarea>')}
        <div id="cube-diagnostics" class="cube-diagnostics" hidden></div>
        <div id="cube-preview-row" class="cube-preview-row" aria-live="polite"></div>
      </div>
    `;
    workspace.appendChild(panel);
    bindPanel(panel);
    restore(panel);
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

  function parseJsonField(panel, selector, label) {
    const raw = panel.querySelector(selector).value.trim();
    if (!raw) fail(`${label} is empty.`);
    try {
      return JSON.parse(raw);
    } catch (error) {
      fail(`${label} is not valid JSON: ${error.message}`);
    }
  }

  function syncOptionsFromKey(panel, key) {
    panel.querySelector('#cube-size').value = String(key.gridSize);
    panel.querySelector('#cube-seed').value = key.seed;
    panel.querySelector('#cube-input-face').value = key.inputFace;
    panel.querySelector('#cube-output-face').value = key.outputFace;
    panel.querySelector('#cube-input-turns').value = String(key.inputQuarterTurns);
    panel.querySelector('#cube-output-turns').value = String(key.outputQuarterTurns);
    const density = key.mask.filter(Boolean).length / key.mask.length;
    const nearest = [1, 0.75, 0.5].sort((a, b) => Math.abs(a - density) - Math.abs(b - density))[0];
    panel.querySelector('#cube-mask-density').value = String(nearest);
  }

  function renderDiagnostics(panel, packageObject, keyObject) {
    const diagnostics = Engine.diagnosePackage(packageObject, keyObject);
    const diagnosticNode = panel.querySelector('#cube-diagnostics');
    diagnosticNode.hidden = false;
    diagnosticNode.innerHTML = `
      <strong>Validated key ${escapeHtml(diagnostics.keyId)}</strong>
      <span>${diagnostics.pointField.pointCount} collision-free points · ${diagnostics.payloadCapacity} payload cells · ${diagnostics.inactiveMaskCells} masked filler cells</span>
      <span>${diagnostics.blockCount} block${diagnostics.blockCount === 1 ? '' : 's'} · ${diagnostics.originalBitLength} source bits · ${diagnostics.ciphertextBitLength} transmitted bits</span>
      <span>Checksum ${escapeHtml(diagnostics.checksum)} · ${escapeHtml(diagnostics.checksumType)}</span>
    `;
    panel.querySelector('#cube-preview-row').innerHTML = FACES.map(face => gridMarkup(
      diagnostics.firstBlock.faces[face], diagnostics.gridSize, `${face} projection`
    )).join('');
  }

  function clearDiagnostics(panel) {
    panel.querySelector('#cube-diagnostics').hidden = true;
    panel.querySelector('#cube-diagnostics').innerHTML = '';
    panel.querySelector('#cube-preview-row').innerHTML = '';
  }

  function save(panel) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        input: panel.querySelector('#cube-input').value,
        package: panel.querySelector('#cube-package').value,
        key: panel.querySelector('#cube-key').value,
        decrypted: panel.querySelector('#cube-decrypted').value,
        options: values(panel)
      }));
    } catch (_) {
      // Browser storage is optional.
    }
  }

  function restore(panel) {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      if (!saved) return;
      panel.querySelector('#cube-input').value = saved.input || '';
      panel.querySelector('#cube-package').value = saved.package || '';
      panel.querySelector('#cube-key').value = saved.key || '';
      panel.querySelector('#cube-decrypted').value = saved.decrypted || '';
      const options = saved.options || {};
      for (const [selector, value] of [
        ['#cube-size', options.gridSize], ['#cube-seed', options.seed], ['#cube-input-face', options.inputFace],
        ['#cube-output-face', options.outputFace], ['#cube-input-turns', options.inputQuarterTurns],
        ['#cube-output-turns', options.outputQuarterTurns], ['#cube-mask-density', options.maskDensity]
      ]) if (value !== undefined && value !== null) panel.querySelector(selector).value = String(value);
    } catch (_) {
      localStorage.removeItem(STORAGE_KEY);
    }
  }

  function downloadJson(value, filename) {
    const blob = new Blob([`${JSON.stringify(value, null, 2)}\n`], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  async function copyText(value) {
    if (!value.trim()) fail('There is nothing to copy.');
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return;
    }
    const textarea = document.createElement('textarea');
    textarea.value = value;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    if (!document.execCommand('copy')) fail('The browser could not copy the text.');
    textarea.remove();
  }

  function readJsonFile(file, label) {
    if (!file) return Promise.reject(new Error(`${label} was not selected.`));
    return file.text().then(text => {
      try {
        return JSON.parse(text);
      } catch (error) {
        fail(`${label} is not valid JSON: ${error.message}`);
      }
    });
  }

  function bindPanel(panel) {
    panel.querySelector('[data-cube-close]').addEventListener('click', () => { panel.hidden = true; });

    panel.querySelector('[data-cube-generate]').addEventListener('click', () => {
      try {
        const key = Engine.createKey(values(panel));
        Engine.assertProjectionUniqueness(key);
        panel.querySelector('#cube-key').value = JSON.stringify(key, null, 2);
        panel.querySelector('#cube-package').value = '';
        panel.querySelector('#cube-decrypted').value = '';
        clearDiagnostics(panel);
        setStatus(panel, `Key ${key.keyId} generated · ${key.mask.filter(Boolean).length} payload cells per ${key.gridSize * key.gridSize}-cell block.`, 'success');
        save(panel);
      } catch (error) {
        setStatus(panel, error.message, 'error');
      }
    });

    panel.querySelector('[data-cube-encrypt]').addEventListener('click', () => {
      try {
        let key;
        const keyField = panel.querySelector('#cube-key');
        if (keyField.value.trim()) key = Engine.validateKey(parseJsonField(panel, '#cube-key', 'Key JSON'));
        else {
          key = Engine.createKey(values(panel));
          keyField.value = JSON.stringify(key, null, 2);
        }
        const packageObject = Engine.encryptBinary(panel.querySelector('#cube-input').value, key);
        panel.querySelector('#cube-package').value = JSON.stringify(packageObject, null, 2);
        panel.querySelector('#cube-decrypted').value = '';
        renderDiagnostics(panel, packageObject, key);
        setStatus(panel, `${packageObject.originalBitLength} input bits encrypted into ${packageObject.blockCount} validated cube block${packageObject.blockCount === 1 ? '' : 's'} using key ${key.keyId}.`, 'success');
        save(panel);
      } catch (error) {
        setStatus(panel, error.message, 'error');
      }
    });

    panel.querySelector('[data-cube-decrypt]').addEventListener('click', () => {
      try {
        const key = Engine.validateKey(parseJsonField(panel, '#cube-key', 'Key JSON'));
        const packageObject = parseJsonField(panel, '#cube-package', 'Encrypted package JSON');
        const plaintext = Engine.decryptBinary(packageObject, key);
        panel.querySelector('#cube-decrypted').value = plaintext;
        renderDiagnostics(panel, packageObject, key);
        setStatus(panel, `${plaintext.length} original bits recovered after key, framing, block, and checksum validation.`, 'success');
        save(panel);
      } catch (error) {
        setStatus(panel, error.message, 'error');
      }
    });

    panel.querySelector('[data-cube-validate]').addEventListener('click', () => {
      try {
        const key = Engine.validateKey(parseJsonField(panel, '#cube-key', 'Key JSON'));
        const packageObject = Engine.validatePackage(parseJsonField(panel, '#cube-package', 'Encrypted package JSON'), key);
        renderDiagnostics(panel, packageObject, key);
        setStatus(panel, `Key ${key.keyId} and package checksum ${packageObject.checksum} are structurally valid.`, 'success');
      } catch (error) {
        setStatus(panel, error.message, 'error');
      }
    });

    panel.querySelector('[data-cube-copy-key]').addEventListener('click', async () => {
      try {
        await copyText(panel.querySelector('#cube-key').value);
        setStatus(panel, 'Key JSON copied.', 'success');
      } catch (error) { setStatus(panel, error.message, 'error'); }
    });
    panel.querySelector('[data-cube-copy-package]').addEventListener('click', async () => {
      try {
        await copyText(panel.querySelector('#cube-package').value);
        setStatus(panel, 'Encrypted package JSON copied.', 'success');
      } catch (error) { setStatus(panel, error.message, 'error'); }
    });

    panel.querySelector('[data-cube-download-key]').addEventListener('click', () => {
      try {
        const key = Engine.validateKey(parseJsonField(panel, '#cube-key', 'Key JSON'));
        downloadJson(key, `shadowrun-binary-cube-key-${key.keyId}.json`);
        setStatus(panel, `Key ${key.keyId} downloaded.`, 'success');
      } catch (error) { setStatus(panel, error.message, 'error'); }
    });
    panel.querySelector('[data-cube-download-package]').addEventListener('click', () => {
      try {
        const key = Engine.validateKey(parseJsonField(panel, '#cube-key', 'Key JSON'));
        const packageObject = Engine.validatePackage(parseJsonField(panel, '#cube-package', 'Encrypted package JSON'), key);
        downloadJson(packageObject, `shadowrun-binary-cube-package-${packageObject.keyId}.json`);
        setStatus(panel, `Package for key ${packageObject.keyId} downloaded.`, 'success');
      } catch (error) { setStatus(panel, error.message, 'error'); }
    });

    panel.querySelector('#cube-import-key').addEventListener('change', async event => {
      try {
        const key = Engine.validateKey(await readJsonFile(event.target.files?.[0], 'Key file'));
        panel.querySelector('#cube-key').value = JSON.stringify(key, null, 2);
        syncOptionsFromKey(panel, key);
        clearDiagnostics(panel);
        setStatus(panel, `Key ${key.keyId} imported and validated.`, 'success');
        save(panel);
      } catch (error) { setStatus(panel, error.message, 'error'); }
      event.target.value = '';
    });
    panel.querySelector('#cube-import-package').addEventListener('change', async event => {
      try {
        const packageObject = await readJsonFile(event.target.files?.[0], 'Package file');
        panel.querySelector('#cube-package').value = JSON.stringify(packageObject, null, 2);
        const keyRaw = panel.querySelector('#cube-key').value.trim();
        if (keyRaw) {
          const key = Engine.validateKey(JSON.parse(keyRaw));
          const validated = Engine.validatePackage(packageObject, key);
          renderDiagnostics(panel, validated, key);
          setStatus(panel, `Package imported and validated against key ${key.keyId}.`, 'success');
        } else {
          clearDiagnostics(panel);
          setStatus(panel, 'Package imported. Import or paste its matching key to validate and decrypt it.', 'success');
        }
        save(panel);
      } catch (error) { setStatus(panel, error.message, 'error'); }
      event.target.value = '';
    });

    panel.querySelector('[data-cube-reset]').addEventListener('click', () => {
      if (!confirm('Clear the Binary Cube Encryption Laboratory and its local browser save?')) return;
      localStorage.removeItem(STORAGE_KEY);
      panel.querySelectorAll('textarea').forEach(textarea => { textarea.value = ''; });
      panel.querySelector('#cube-size').value = '4';
      panel.querySelector('#cube-seed').value = 'shadowrun-matrix-demo';
      panel.querySelector('#cube-input-face').value = 'top';
      panel.querySelector('#cube-output-face').value = 'front';
      panel.querySelector('#cube-input-turns').value = '0';
      panel.querySelector('#cube-output-turns').value = '0';
      panel.querySelector('#cube-mask-density').value = '1';
      clearDiagnostics(panel);
      setStatus(panel, 'Laboratory reset.', 'success');
    });

    panel.addEventListener('input', () => save(panel));
  }

  function openPanel() {
    buildPanel();
    const panel = document.getElementById(PANEL_ID);
    if (!panel) return;
    panel.hidden = false;
    panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function bindLaunchers() {
    document.querySelectorAll(`[data-shadowrun-open="${TOOL_ID}"]`).forEach(button => {
      if (button.dataset.cubeBound) return;
      button.dataset.cubeBound = 'true';
      button.addEventListener('click', openPanel);
    });
  }

  function init() {
    style();
    buildPanel();
    bindLaunchers();
    const grid = document.getElementById('shadowrun-grid');
    if (grid && grid.dataset.cubeObserver !== 'true') {
      grid.dataset.cubeObserver = 'true';
      new MutationObserver(bindLaunchers).observe(grid, { childList: true, subtree: true });
    }
  }

  window.ShadowrunBinaryCubeEncryption = Object.freeze({ openPanel, engine: Engine });
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', init, { once: true }) : init();
})();
