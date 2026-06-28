(function installBinaryCubeEditor(root, factory) {
  'use strict';
  const dependency = root && root.ShadowrunBinaryCubeEngine
    ? root.ShadowrunBinaryCubeEngine
    : (typeof module === 'object' && module.exports ? require('./shadowrun-binary-cube-engine.js') : null);
  const api = factory(dependency);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.ShadowrunBinaryCubeEditor = api;
  if (root && root.document) api.install();
})(typeof globalThis !== 'undefined' ? globalThis : this, function createBinaryCubeEditor(Engine) {
  'use strict';

  const PANEL_ID = 'shadowrun-binary-cube-lab';
  const SECTION_ID = 'cube-custom-editor-section';
  const MAX_VISUAL_GRID_SIZE = 12;
  const MAX_HISTORY = 24;
  let observer = null;

  function fail(message) {
    throw new Error(message);
  }

  function requireEngine() {
    if (!Engine) fail('Shadowrun Binary Cube Engine must load before the custom key editor.');
    return Engine;
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function parseIntegerList(value, size, label) {
    const text = Array.isArray(value) ? value.join(',') : String(value ?? '');
    const tokens = text.trim().split(/[\s,;|]+/).filter(Boolean);
    if (tokens.length !== size) fail(`${label} must contain exactly ${size} integers.`);
    const values = tokens.map(token => Number(token));
    if (values.some(item => !Number.isInteger(item))) fail(`${label} may contain only integers.`);
    if (values.some(item => item < 0 || item >= size)) fail(`${label} values must be from 0 through ${size - 1}.`);
    if (new Set(values).size !== size) fail(`${label} must contain each value from 0 through ${size - 1} exactly once.`);
    return values;
  }

  function parseMask(value, size) {
    const expected = size * size;
    let values;
    if (Array.isArray(value)) {
      values = value.map(Boolean);
    } else {
      const compact = String(value ?? '').replace(/[\s,;|_[\]{}()]+/g, '');
      if (/[^01]/.test(compact)) fail('Mask text may contain only 0, 1, and separators.');
      values = [...compact].map(bit => bit === '1');
    }
    if (values.length !== expected) fail(`Mask must contain exactly ${expected} cells for a ${size} × ${size} face.`);
    if (!values.some(Boolean)) fail('Mask must retain at least one payload cell.');
    return values;
  }

  function serializePermutation(values) {
    return values.join(', ');
  }

  function serializeMask(mask, size) {
    const rows = [];
    for (let row = 0; row < size; row += 1) {
      rows.push(mask.slice(row * size, (row + 1) * size).map(Boolean).map(value => value ? '1' : '0').join(''));
    }
    return rows.join('\n');
  }

  function draftFromKey(rawKey) {
    const engine = requireEngine();
    const key = engine.validateKey(rawKey);
    return {
      gridSize: key.gridSize,
      rowPermutation: [...key.rowPermutation],
      columnPermutation: [...key.columnPermutation],
      depthPermutation: [...key.depthPermutation],
      mask: [...key.mask]
    };
  }

  function normalizeDraft(rawDraft, rawBaseKey) {
    const engine = requireEngine();
    const baseKey = engine.validateKey(rawBaseKey);
    const size = baseKey.gridSize;
    if (rawDraft && Number(rawDraft.gridSize) !== size) fail('Draft grid size does not match the active key.');
    return {
      gridSize: size,
      rowPermutation: parseIntegerList(rawDraft?.rowPermutation, size, 'Row permutation'),
      columnPermutation: parseIntegerList(rawDraft?.columnPermutation, size, 'Column permutation'),
      depthPermutation: parseIntegerList(rawDraft?.depthPermutation, size, 'Depth permutation'),
      mask: parseMask(rawDraft?.mask, size)
    };
  }

  function applyDraft(rawBaseKey, rawDraft) {
    const engine = requireEngine();
    const baseKey = engine.validateKey(rawBaseKey);
    const draft = normalizeDraft(rawDraft, baseKey);
    const candidate = {
      ...clone(baseKey),
      rowPermutation: draft.rowPermutation,
      columnPermutation: draft.columnPermutation,
      depthPermutation: draft.depthPermutation,
      mask: draft.mask
    };
    delete candidate.keyId;
    const key = engine.validateKey(candidate);
    engine.assertProjectionUniqueness(key);
    return key;
  }

  function analyzeDraft(rawBaseKey, rawDraft) {
    try {
      const baseKey = requireEngine().validateKey(rawBaseKey);
      const key = applyDraft(baseKey, rawDraft);
      const diagnostics = requireEngine().projectionDiagnostics(key);
      const payloadCells = key.mask.filter(Boolean).length;
      const totalCells = key.mask.length;
      return {
        valid: true,
        errors: [],
        warnings: payloadCells / totalCells < 0.25 ? ['The mask uses less than 25% of each block and will significantly expand transmitted data.'] : [],
        key,
        diagnostics,
        changed: key.keyId !== baseKey.keyId,
        payloadCells,
        inactiveCells: totalCells - payloadCells,
        density: payloadCells / totalCells
      };
    } catch (error) {
      return { valid: false, errors: [error.message], warnings: [], key: null, diagnostics: null, changed: false };
    }
  }

  function maskPattern(size, pattern, currentMask) {
    const total = size * size;
    const current = currentMask ? parseMask(currentMask, size) : Array(total).fill(true);
    switch (pattern) {
      case 'full': return Array(total).fill(true);
      case 'three-quarter': return Array.from({ length: total }, (_, index) => index % 4 !== 3);
      case 'half': return Array.from({ length: total }, (_, index) => (Math.floor(index / size) + (index % size)) % 2 === 0);
      case 'border': return Array.from({ length: total }, (_, index) => {
        const row = Math.floor(index / size);
        const column = index % size;
        return row === 0 || column === 0 || row === size - 1 || column === size - 1;
      });
      case 'diagonal': return Array.from({ length: total }, (_, index) => {
        const row = Math.floor(index / size);
        const column = index % size;
        return row === column || row + column === size - 1;
      });
      case 'invert': {
        const inverted = current.map(value => !value);
        return inverted.some(Boolean) ? inverted : Array(total).fill(true);
      }
      default: fail(`Unknown mask pattern: ${pattern}`);
    }
  }

  function rotatePermutation(values, amount) {
    const output = [...values];
    if (!output.length) return output;
    const offset = ((Number(amount) || 0) % output.length + output.length) % output.length;
    return output.slice(offset).concat(output.slice(0, offset));
  }

  function panelKey(panel) {
    const raw = panel.querySelector('#cube-key')?.value.trim();
    if (!raw) fail('Generate or import an active key before opening a custom draft.');
    try {
      return requireEngine().validateKey(JSON.parse(raw));
    } catch (error) {
      fail(`Active key is invalid: ${error.message}`);
    }
  }

  function state(section) {
    if (!section.__cubeEditorState) section.__cubeEditorState = { baseKey: null, history: [], future: [], lastValidKey: null };
    return section.__cubeEditorState;
  }

  function setStatus(section, message, type = '') {
    const node = section.querySelector('#cube-custom-status');
    node.textContent = message;
    node.classList.toggle('error', type === 'error');
    node.classList.toggle('success', type === 'success');
  }

  function announceMain(panel, message, type = '') {
    const node = panel.querySelector('#cube-status');
    if (!node) return;
    node.textContent = message;
    node.classList.toggle('error', type === 'error');
    node.classList.toggle('success', type === 'success');
  }

  function readDraft(section) {
    const current = state(section);
    if (!current.baseKey) fail('Load an active key into the editor first.');
    const size = current.baseKey.gridSize;
    return {
      gridSize: size,
      rowPermutation: section.querySelector('#cube-custom-row').value,
      columnPermutation: section.querySelector('#cube-custom-column').value,
      depthPermutation: section.querySelector('#cube-custom-depth').value,
      mask: section.querySelector('#cube-custom-mask').value
    };
  }

  function draftSnapshot(section) {
    return {
      row: section.querySelector('#cube-custom-row').value,
      column: section.querySelector('#cube-custom-column').value,
      depth: section.querySelector('#cube-custom-depth').value,
      mask: section.querySelector('#cube-custom-mask').value
    };
  }

  function restoreSnapshot(section, snapshot) {
    section.querySelector('#cube-custom-row').value = snapshot.row;
    section.querySelector('#cube-custom-column').value = snapshot.column;
    section.querySelector('#cube-custom-depth').value = snapshot.depth;
    section.querySelector('#cube-custom-mask').value = snapshot.mask;
    renderMaskGrid(section);
  }

  function pushHistory(section) {
    const current = state(section);
    const snapshot = draftSnapshot(section);
    const previous = current.history.at(-1);
    if (previous && JSON.stringify(previous) === JSON.stringify(snapshot)) return;
    current.history.push(snapshot);
    if (current.history.length > MAX_HISTORY) current.history.shift();
    current.future = [];
    updateHistoryButtons(section);
  }

  function updateHistoryButtons(section) {
    const current = state(section);
    section.querySelector('[data-cube-custom-undo]').disabled = current.history.length < 2;
    section.querySelector('[data-cube-custom-redo]').disabled = current.future.length === 0;
  }

  function writeDraft(section, draft, record = true) {
    section.querySelector('#cube-custom-row').value = serializePermutation(draft.rowPermutation);
    section.querySelector('#cube-custom-column').value = serializePermutation(draft.columnPermutation);
    section.querySelector('#cube-custom-depth').value = serializePermutation(draft.depthPermutation);
    section.querySelector('#cube-custom-mask').value = serializeMask(draft.mask, draft.gridSize);
    renderMaskGrid(section);
    if (record) pushHistory(section);
  }

  function renderMaskGrid(section) {
    const current = state(section);
    const target = section.querySelector('#cube-custom-mask-grid');
    if (!current.baseKey) {
      target.innerHTML = '<p>Load an active key to edit its mask.</p>';
      return;
    }
    const size = current.baseKey.gridSize;
    let mask;
    try {
      mask = parseMask(section.querySelector('#cube-custom-mask').value, size);
    } catch (error) {
      target.innerHTML = `<p class="cube-custom-grid-note">Mask grid unavailable until the text contains ${size * size} valid cells.</p>`;
      return;
    }
    if (size > MAX_VISUAL_GRID_SIZE) {
      target.innerHTML = `<p class="cube-custom-grid-note">${size} × ${size} mask: ${mask.filter(Boolean).length} active and ${mask.filter(value => !value).length} inactive cells. Use the text editor for sizes above ${MAX_VISUAL_GRID_SIZE}.</p>`;
      return;
    }
    target.innerHTML = `<div class="cube-custom-mask-buttons" style="--cube-custom-size:${size}" role="grid" aria-label="Editable ${size} by ${size} data-entry mask">${mask.map((enabled, index) => {
      const row = Math.floor(index / size) + 1;
      const column = index % size + 1;
      return `<button type="button" role="gridcell" aria-pressed="${enabled}" aria-label="Row ${row}, column ${column}, ${enabled ? 'payload' : 'filler'}" data-cube-custom-cell="${index}">${enabled ? '1' : '0'}</button>`;
    }).join('')}</div>`;
  }

  function updateMaskFromGrid(section, index) {
    const current = state(section);
    const size = current.baseKey.gridSize;
    const mask = parseMask(section.querySelector('#cube-custom-mask').value, size);
    mask[index] = !mask[index];
    if (!mask.some(Boolean)) {
      setStatus(section, 'At least one payload cell must remain enabled.', 'error');
      return;
    }
    section.querySelector('#cube-custom-mask').value = serializeMask(mask, size);
    renderMaskGrid(section);
    pushHistory(section);
    setStatus(section, `Mask cell ${index + 1} changed. Validate the draft before applying it.`);
  }

  function loadActiveKey(panel, section) {
    const key = panelKey(panel);
    const current = state(section);
    current.baseKey = clone(key);
    current.lastValidKey = clone(key);
    current.history = [];
    current.future = [];
    writeDraft(section, draftFromKey(key));
    setStatus(section, `Draft loaded from key ${key.keyId}. The active key remains unchanged until Apply Valid Draft is used.`, 'success');
  }

  function validateCurrentDraft(section) {
    const current = state(section);
    if (!current.baseKey) fail('Load an active key into the editor first.');
    const analysis = analyzeDraft(current.baseKey, readDraft(section));
    if (!analysis.valid) fail(analysis.errors.join(' '));
    const warning = analysis.warnings.length ? ` Warning: ${analysis.warnings.join(' ')}` : '';
    setStatus(section, `Draft is valid: ${analysis.diagnostics.pointCount} collision-free points, ${analysis.payloadCells} payload cells, candidate key ${analysis.key.keyId}.${warning}`, 'success');
    return analysis;
  }

  function applyCurrentDraft(panel, section) {
    const current = state(section);
    const analysis = validateCurrentDraft(section);
    const previousKey = panelKey(panel);
    current.lastValidKey = clone(previousKey);
    panel.querySelector('#cube-key').value = JSON.stringify(analysis.key, null, 2);
    const packageField = panel.querySelector('#cube-package');
    const decryptedField = panel.querySelector('#cube-decrypted');
    if (packageField?.value.trim()) packageField.value = '';
    if (decryptedField) decryptedField.value = '';
    current.baseKey = clone(analysis.key);
    current.history = [];
    current.future = [];
    writeDraft(section, draftFromKey(analysis.key));
    panel.dispatchEvent(new Event('input', { bubbles: true }));
    announceMain(panel, `Custom key ${analysis.key.keyId} applied after permutation, mask, fingerprint, and six-face projection validation. Any previous package was cleared because it belongs to the prior key.`, 'success');
    setStatus(section, `Custom key ${analysis.key.keyId} is now active.`, 'success');
  }

  function restoreLastValid(panel, section) {
    const current = state(section);
    if (!current.lastValidKey) fail('No previous valid key is available in this editor session.');
    const active = panelKey(panel);
    panel.querySelector('#cube-key').value = JSON.stringify(current.lastValidKey, null, 2);
    current.baseKey = clone(current.lastValidKey);
    current.lastValidKey = clone(active);
    current.history = [];
    current.future = [];
    writeDraft(section, draftFromKey(current.baseKey));
    panel.querySelector('#cube-package').value = '';
    panel.querySelector('#cube-decrypted').value = '';
    panel.dispatchEvent(new Event('input', { bubbles: true }));
    announceMain(panel, `Restored valid key ${current.baseKey.keyId}; incompatible package and decrypted output fields were cleared.`, 'success');
    setStatus(section, `Restored valid key ${current.baseKey.keyId}.`, 'success');
  }

  function applyPattern(section, pattern) {
    const current = state(section);
    if (!current.baseKey) fail('Load an active key into the editor first.');
    const size = current.baseKey.gridSize;
    const mask = maskPattern(size, pattern, section.querySelector('#cube-custom-mask').value);
    section.querySelector('#cube-custom-mask').value = serializeMask(mask, size);
    renderMaskGrid(section);
    pushHistory(section);
    setStatus(section, `${pattern.replace('-', ' ')} mask pattern loaded into the draft.`);
  }

  function shiftPermutation(section, field, amount) {
    const current = state(section);
    if (!current.baseKey) fail('Load an active key into the editor first.');
    const size = current.baseKey.gridSize;
    const selector = `#cube-custom-${field}`;
    const label = `${field[0].toUpperCase()}${field.slice(1)} permutation`;
    const values = parseIntegerList(section.querySelector(selector).value, size, label);
    section.querySelector(selector).value = serializePermutation(rotatePermutation(values, amount));
    pushHistory(section);
    setStatus(section, `${label} rotated by ${amount > 0 ? 'one position left' : 'one position right'}.`);
  }

  function undo(section) {
    const current = state(section);
    if (current.history.length < 2) return;
    const present = current.history.pop();
    current.future.push(present);
    restoreSnapshot(section, current.history.at(-1));
    updateHistoryButtons(section);
    setStatus(section, 'Draft edit undone.');
  }

  function redo(section) {
    const current = state(section);
    if (!current.future.length) return;
    const snapshot = current.future.pop();
    current.history.push(snapshot);
    restoreSnapshot(section, snapshot);
    updateHistoryButtons(section);
    setStatus(section, 'Draft edit redone.');
  }

  function style() {
    if (document.getElementById('shadowrun-binary-cube-editor-style')) return;
    const node = document.createElement('style');
    node.id = 'shadowrun-binary-cube-editor-style';
    node.textContent = `
      #${SECTION_ID}{display:grid;gap:14px;padding:16px;border:1px solid var(--line);border-radius:12px;background:#ffffff05}
      #${SECTION_ID} h3,#${SECTION_ID} p{margin:0}.cube-custom-editor-warning{padding:10px;border-left:4px solid #c88b2b;background:#c88b2b18;border-radius:6px}
      .cube-custom-editor-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:12px}.cube-custom-editor-field{display:grid;gap:6px}.cube-custom-editor-field label{font-weight:700}
      .cube-custom-editor-field textarea{min-height:100px;resize:vertical;font-family:ui-monospace,monospace}.cube-custom-editor-actions{display:flex;flex-wrap:wrap;gap:8px}.cube-custom-editor-actions button{min-width:120px}
      .cube-custom-status{min-height:1.4em;color:var(--muted)}.cube-custom-status.error{color:#ffb3b3}.cube-custom-status.success{color:#b8efc0}
      .cube-custom-mask-buttons{display:grid;grid-template-columns:repeat(var(--cube-custom-size),minmax(28px,36px));gap:3px;max-width:100%;overflow:auto}.cube-custom-mask-buttons button{aspect-ratio:1;padding:0;font:700 .78rem ui-monospace,monospace;border:1px solid var(--line);border-radius:4px;background:#ffffff08;color:var(--ink)}
      .cube-custom-mask-buttons button[aria-pressed="true"]{outline:2px solid var(--accent);background:#7fc8ff22}.cube-custom-grid-note{color:var(--muted)}
    `;
    document.head.appendChild(node);
  }

  function buildSection(panel) {
    if (panel.querySelector(`#${SECTION_ID}`)) return panel.querySelector(`#${SECTION_ID}`);
    const section = document.createElement('section');
    section.id = SECTION_ID;
    section.innerHTML = `
      <div><p class="eyebrow">Phase 11 draft workspace</p><h3>Custom Coordinate and Data-Entry Mask Editor</h3></div>
      <p class="cube-custom-editor-warning"><strong>Draft protection:</strong> edits do not alter the active key until they pass range, uniqueness, mask, fingerprint, and all-six-face projection validation. Applying a changed key clears the old package because it is no longer compatible.</p>
      <div class="cube-custom-editor-actions">
        <button type="button" class="link-button" data-cube-custom-load>Load Active Key</button>
        <button type="button" class="layout-button" data-cube-custom-validate>Validate Draft</button>
        <button type="button" class="link-button" data-cube-custom-apply>Apply Valid Draft</button>
        <button type="button" class="layout-button" data-cube-custom-restore>Restore Previous Valid Key</button>
        <button type="button" class="layout-button" data-cube-custom-undo disabled>Undo</button>
        <button type="button" class="layout-button" data-cube-custom-redo disabled>Redo</button>
      </div>
      <div class="cube-custom-editor-grid">
        <div class="cube-custom-editor-field"><label for="cube-custom-row">Row permutation</label><textarea id="cube-custom-row" spellcheck="false" aria-describedby="cube-custom-permutation-note"></textarea></div>
        <div class="cube-custom-editor-field"><label for="cube-custom-column">Column permutation</label><textarea id="cube-custom-column" spellcheck="false" aria-describedby="cube-custom-permutation-note"></textarea></div>
        <div class="cube-custom-editor-field"><label for="cube-custom-depth">Depth permutation</label><textarea id="cube-custom-depth" spellcheck="false" aria-describedby="cube-custom-permutation-note"></textarea></div>
      </div>
      <p id="cube-custom-permutation-note" class="cube-custom-grid-note">Each permutation must contain every integer from 0 through grid size minus one exactly once.</p>
      <div class="cube-custom-editor-actions">
        <button type="button" class="layout-button" data-cube-custom-shift="row:-1">Row right</button><button type="button" class="layout-button" data-cube-custom-shift="row:1">Row left</button>
        <button type="button" class="layout-button" data-cube-custom-shift="column:-1">Column right</button><button type="button" class="layout-button" data-cube-custom-shift="column:1">Column left</button>
        <button type="button" class="layout-button" data-cube-custom-shift="depth:-1">Depth right</button><button type="button" class="layout-button" data-cube-custom-shift="depth:1">Depth left</button>
      </div>
      <div class="cube-custom-editor-field"><label for="cube-custom-mask">Mask text</label><textarea id="cube-custom-mask" spellcheck="false"></textarea><small>Use one row per line or a continuous 0/1 string. A 1 is payload; a 0 is deterministic filler.</small></div>
      <div class="cube-custom-editor-actions">
        <button type="button" class="layout-button" data-cube-custom-pattern="full">Full</button>
        <button type="button" class="layout-button" data-cube-custom-pattern="three-quarter">75%</button>
        <button type="button" class="layout-button" data-cube-custom-pattern="half">Checker 50%</button>
        <button type="button" class="layout-button" data-cube-custom-pattern="border">Border</button>
        <button type="button" class="layout-button" data-cube-custom-pattern="diagonal">Diagonals</button>
        <button type="button" class="layout-button" data-cube-custom-pattern="invert">Invert</button>
      </div>
      <div id="cube-custom-mask-grid" aria-live="polite"><p>Load an active key to edit its mask.</p></div>
      <p id="cube-custom-status" class="cube-custom-status" role="status" aria-live="polite"></p>
    `;
    const output = panel.querySelector('.cube-lab-output');
    panel.insertBefore(section, output || null);
    bindSection(panel, section);
    return section;
  }

  function bindSection(panel, section) {
    section.querySelector('[data-cube-custom-load]').addEventListener('click', () => {
      try { loadActiveKey(panel, section); } catch (error) { setStatus(section, error.message, 'error'); }
    });
    section.querySelector('[data-cube-custom-validate]').addEventListener('click', () => {
      try { validateCurrentDraft(section); } catch (error) { setStatus(section, error.message, 'error'); }
    });
    section.querySelector('[data-cube-custom-apply]').addEventListener('click', () => {
      try { applyCurrentDraft(panel, section); } catch (error) { setStatus(section, error.message, 'error'); }
    });
    section.querySelector('[data-cube-custom-restore]').addEventListener('click', () => {
      try { restoreLastValid(panel, section); } catch (error) { setStatus(section, error.message, 'error'); }
    });
    section.querySelector('[data-cube-custom-undo]').addEventListener('click', () => undo(section));
    section.querySelector('[data-cube-custom-redo]').addEventListener('click', () => redo(section));
    section.querySelectorAll('[data-cube-custom-pattern]').forEach(button => button.addEventListener('click', () => {
      try { applyPattern(section, button.dataset.cubeCustomPattern); } catch (error) { setStatus(section, error.message, 'error'); }
    }));
    section.querySelectorAll('[data-cube-custom-shift]').forEach(button => button.addEventListener('click', () => {
      try {
        const [field, amount] = button.dataset.cubeCustomShift.split(':');
        shiftPermutation(section, field, Number(amount));
      } catch (error) { setStatus(section, error.message, 'error'); }
    }));
    section.querySelector('#cube-custom-mask-grid').addEventListener('click', event => {
      const button = event.target.closest('[data-cube-custom-cell]');
      if (!button) return;
      try { updateMaskFromGrid(section, Number(button.dataset.cubeCustomCell)); } catch (error) { setStatus(section, error.message, 'error'); }
    });
    section.querySelectorAll('textarea').forEach(textarea => textarea.addEventListener('change', () => {
      if (textarea.id === 'cube-custom-mask') renderMaskGrid(section);
      pushHistory(section);
      setStatus(section, 'Draft changed. Validate it before applying.');
    }));
  }

  function install() {
    requireEngine();
    if (typeof document === 'undefined') return;
    style();
    const attach = () => {
      const panel = document.getElementById(PANEL_ID);
      if (panel) buildSection(panel);
    };
    attach();
    if (!observer) {
      observer = new MutationObserver(attach);
      observer.observe(document.documentElement, { childList: true, subtree: true });
    }
  }

  return Object.freeze({
    parseIntegerList,
    parseMask,
    serializePermutation,
    serializeMask,
    draftFromKey,
    normalizeDraft,
    applyDraft,
    analyzeDraft,
    maskPattern,
    rotatePermutation,
    install,
    constants: Object.freeze({ MAX_VISUAL_GRID_SIZE, MAX_HISTORY })
  });
});
