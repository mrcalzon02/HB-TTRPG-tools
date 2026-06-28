(() => {
  'use strict';

  const TOOL_ID = 'shadowrun-binary-cube-encryption';
  const PANEL_ID = 'shadowrun-binary-cube-lab';
  const STORAGE_KEY = 'hb-ttrpg-shadowrun-binary-cube-v1';
  const KEY_FORMAT = 'hb-ttrpg-shadowrun-binary-cube-key';
  const PACKAGE_FORMAT = 'hb-ttrpg-shadowrun-binary-cube-package';
  const SCHEMA_VERSION = '0.1.0';
  const FACES = Object.freeze(['top', 'bottom', 'front', 'back', 'left', 'right']);
  const OPPOSITE = Object.freeze({ top: 'bottom', bottom: 'top', front: 'back', back: 'front', left: 'right', right: 'left' });
  const RECOMMENDED_GRID_SIZES = Object.freeze([4, 12, 20, 28, 36, 44, 52, 60]);

  function fail(message) {
    throw new Error(message);
  }

  function normalizeBits(value) {
    const compact = String(value ?? '').replace(/\s+/g, '');
    if (!compact) fail('Enter at least one binary digit.');
    if (/[^01]/.test(compact)) fail('Binary input may contain only 0, 1, and whitespace.');
    return compact;
  }

  function fnv1a32(value) {
    let hash = 0x811c9dc5;
    const text = String(value ?? '');
    for (let index = 0; index < text.length; index += 1) {
      hash ^= text.charCodeAt(index);
      hash = Math.imul(hash, 0x01000193);
    }
    return hash >>> 0;
  }

  function mulberry32(seed) {
    let state = seed >>> 0;
    return () => {
      state += 0x6d2b79f5;
      let result = state;
      result = Math.imul(result ^ (result >>> 15), result | 1);
      result ^= result + Math.imul(result ^ (result >>> 7), result | 61);
      return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
    };
  }

  function range(size) {
    return Array.from({ length: size }, (_, index) => index);
  }

  function shuffle(values, random) {
    const output = [...values];
    for (let index = output.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(random() * (index + 1));
      [output[index], output[swapIndex]] = [output[swapIndex], output[index]];
    }
    return output;
  }

  function isPermutation(values, size) {
    return Array.isArray(values)
      && values.length === size
      && new Set(values).size === size
      && values.every(value => Number.isInteger(value) && value >= 0 && value < size);
  }

  function validateFacePair(inputFace, outputFace) {
    if (!FACES.includes(inputFace) || !FACES.includes(outputFace)) fail('Input and output faces must be valid cube faces.');
    if (inputFace === outputFace) fail('The output face cannot be the same as the input face.');
    if (OPPOSITE[inputFace] === outputFace) fail('The opposite face preserves the original projection. Choose one of the four perpendicular faces.');
  }

  function maskFromDensity(size, density, random) {
    const cellCount = size * size;
    const normalizedDensity = Math.max(0.05, Math.min(1, Number(density) || 1));
    const target = Math.max(1, Math.round(cellCount * normalizedDensity));
    const indexes = shuffle(range(cellCount), random);
    const selected = new Set(indexes.slice(0, target));
    return range(cellCount).map(index => selected.has(index));
  }

  function keyFingerprint(key) {
    const material = [
      key.gridSize,
      key.inputFace,
      key.outputFace,
      key.inputQuarterTurns,
      key.outputQuarterTurns,
      key.rowPermutation.join(','),
      key.columnPermutation.join(','),
      key.depthPermutation.join(','),
      key.mask.map(Boolean).map(value => value ? '1' : '0').join('')
    ].join('|');
    return fnv1a32(material).toString(16).padStart(8, '0');
  }

  function createKey(options = {}) {
    const gridSize = Number(options.gridSize ?? 4);
    if (!Number.isInteger(gridSize) || gridSize < 2 || gridSize > 60) fail('Grid size must be an integer from 2 through 60.');
    const seed = String(options.seed || 'shadowrun-cube-key');
    const inputFace = String(options.inputFace || 'top');
    const outputFace = String(options.outputFace || 'front');
    validateFacePair(inputFace, outputFace);
    const inputQuarterTurns = ((Number(options.inputQuarterTurns) || 0) % 4 + 4) % 4;
    const outputQuarterTurns = ((Number(options.outputQuarterTurns) || 0) % 4 + 4) % 4;
    const random = mulberry32(fnv1a32(`${seed}|${gridSize}|latin-cube-key`));
    const key = {
      format: KEY_FORMAT,
      schemaVersion: SCHEMA_VERSION,
      algorithm: 'latin-cube-face-permutation',
      securityClassification: 'experimental-ttrpg-obfuscation-not-production-cryptography',
      gridSize,
      seed,
      inputFace,
      outputFace,
      inputQuarterTurns,
      outputQuarterTurns,
      rowPermutation: shuffle(range(gridSize), random),
      columnPermutation: shuffle(range(gridSize), random),
      depthPermutation: shuffle(range(gridSize), random),
      mask: maskFromDensity(gridSize, options.maskDensity ?? 1, random),
      paddingMode: 'deterministic-seeded-random'
    };
    key.keyId = keyFingerprint(key);
    return key;
  }

  function validateKey(key) {
    if (!key || typeof key !== 'object') fail('A key object is required.');
    if (key.format !== KEY_FORMAT) fail('The imported key format is not recognized.');
    const size = Number(key.gridSize);
    if (!Number.isInteger(size) || size < 2 || size > 60) fail('The key grid size is invalid.');
    validateFacePair(key.inputFace, key.outputFace);
    if (!isPermutation(key.rowPermutation, size)) fail('The key row permutation is invalid.');
    if (!isPermutation(key.columnPermutation, size)) fail('The key column permutation is invalid.');
    if (!isPermutation(key.depthPermutation, size)) fail('The key depth permutation is invalid.');
    if (!Array.isArray(key.mask) || key.mask.length !== size * size || !key.mask.some(Boolean)) fail('The key mask is invalid or has no payload cells.');
    const copy = {
      ...key,
      gridSize: size,
      inputQuarterTurns: ((Number(key.inputQuarterTurns) || 0) % 4 + 4) % 4,
      outputQuarterTurns: ((Number(key.outputQuarterTurns) || 0) % 4 + 4) % 4,
      mask: key.mask.map(Boolean)
    };
    const expected = keyFingerprint(copy);
    if (key.keyId && key.keyId !== expected) fail('The key fingerprint does not match its contents.');
    copy.keyId = expected;
    return copy;
  }

  function buildPoints(key) {
    const size = key.gridSize;
    const points = [];
    for (let x = 0; x < size; x += 1) {
      for (let y = 0; y < size; y += 1) {
        const latinValue = (key.rowPermutation[x] + key.columnPermutation[y]) % size;
        points.push({ id: x * size + y, x, y, z: key.depthPermutation[latinValue] });
      }
    }
    return points;
  }

  function rotateCell(row, column, size, quarterTurns) {
    let nextRow = row;
    let nextColumn = column;
    for (let turn = 0; turn < quarterTurns; turn += 1) {
      [nextRow, nextColumn] = [nextColumn, size - 1 - nextRow];
    }
    return [nextRow, nextColumn];
  }

  function faceCell(point, face, size, quarterTurns = 0) {
    let row;
    let column;
    switch (face) {
      case 'top':
        row = point.y; column = point.x; break;
      case 'bottom':
        row = point.y; column = size - 1 - point.x; break;
      case 'front':
        row = size - 1 - point.z; column = point.x; break;
      case 'back':
        row = size - 1 - point.z; column = size - 1 - point.x; break;
      case 'left':
        row = size - 1 - point.z; column = point.y; break;
      case 'right':
        row = size - 1 - point.z; column = size - 1 - point.y; break;
      default:
        fail(`Unknown cube face: ${face}`);
    }
    return rotateCell(row, column, size, quarterTurns);
  }

  function faceOrder(points, face, size, quarterTurns) {
    return [...points].sort((first, second) => {
      const [firstRow, firstColumn] = faceCell(first, face, size, quarterTurns);
      const [secondRow, secondColumn] = faceCell(second, face, size, quarterTurns);
      return firstRow - secondRow || firstColumn - secondColumn;
    });
  }

  function assertProjectionUniqueness(points, size) {
    for (const face of ['top', 'front', 'left']) {
      const cells = points.map(point => faceCell(point, face, size, 0).join(','));
      if (new Set(cells).size !== size * size) fail(`Generated point field overlaps when viewed from the ${face} face.`);
    }
    return true;
  }

  function transformBlock(block, key, fromFace, fromTurns, toFace, toTurns) {
    const points = buildPoints(key);
    const inputOrder = faceOrder(points, fromFace, key.gridSize, fromTurns);
    const outputOrder = faceOrder(points, toFace, key.gridSize, toTurns);
    if (block.length !== inputOrder.length) fail('A cube block must contain exactly gridSize squared bits.');
    const bitsByPoint = new Map(inputOrder.map((point, index) => [point.id, block[index]]));
    return outputOrder.map(point => bitsByPoint.get(point.id)).join('');
  }

  function deterministicFiller(key, blockIndex, cellCount) {
    const random = mulberry32(fnv1a32(`${key.seed}|${key.keyId}|padding|${blockIndex}`));
    return range(cellCount).map(() => random() >= 0.5 ? '1' : '0');
  }

  function encryptBinary(binary, rawKey) {
    const bits = normalizeBits(binary);
    const key = validateKey(rawKey);
    const cellCount = key.gridSize * key.gridSize;
    const payloadIndexes = key.mask.flatMap((enabled, index) => enabled ? [index] : []);
    const payloadCapacity = payloadIndexes.length;
    const blockCount = Math.ceil(bits.length / payloadCapacity);
    let cursor = 0;
    let ciphertext = '';
    const firstInputBlock = [];
    const firstOutputBlock = [];

    for (let blockIndex = 0; blockIndex < blockCount; blockIndex += 1) {
      const cells = deterministicFiller(key, blockIndex, cellCount);
      for (const cellIndex of payloadIndexes) {
        if (cursor < bits.length) cells[cellIndex] = bits[cursor++];
      }
      const inputBlock = cells.join('');
      const outputBlock = transformBlock(inputBlock, key, key.inputFace, key.inputQuarterTurns, key.outputFace, key.outputQuarterTurns);
      ciphertext += outputBlock;
      if (blockIndex === 0) {
        firstInputBlock.push(...cells);
        firstOutputBlock.push(...outputBlock);
      }
    }

    return {
      format: PACKAGE_FORMAT,
      schemaVersion: SCHEMA_VERSION,
      algorithm: key.algorithm,
      securityClassification: key.securityClassification,
      keyId: key.keyId,
      gridSize: key.gridSize,
      inputFace: key.inputFace,
      outputFace: key.outputFace,
      inputQuarterTurns: key.inputQuarterTurns,
      outputQuarterTurns: key.outputQuarterTurns,
      originalBitLength: bits.length,
      payloadCapacity,
      blockCount,
      ciphertext,
      preview: {
        firstInputBlock: firstInputBlock.join(''),
        firstOutputBlock: firstOutputBlock.join('')
      }
    };
  }

  function decryptBinary(rawPackage, rawKey) {
    const key = validateKey(rawKey);
    const payload = typeof rawPackage === 'string' ? JSON.parse(rawPackage) : rawPackage;
    if (!payload || payload.format !== PACKAGE_FORMAT) fail('The encrypted package format is not recognized.');
    if (payload.keyId !== key.keyId) fail('The encrypted package requires a different key.');
    if (Number(payload.gridSize) !== key.gridSize) fail('Package and key grid sizes do not match.');
    const ciphertext = normalizeBits(payload.ciphertext);
    const cellCount = key.gridSize * key.gridSize;
    if (ciphertext.length % cellCount !== 0) fail('Ciphertext length is not aligned to the cube block size.');
    const payloadIndexes = key.mask.flatMap((enabled, index) => enabled ? [index] : []);
    let plaintext = '';

    for (let offset = 0; offset < ciphertext.length; offset += cellCount) {
      const outputBlock = ciphertext.slice(offset, offset + cellCount);
      const inputBlock = transformBlock(outputBlock, key, key.outputFace, key.outputQuarterTurns, key.inputFace, key.inputQuarterTurns);
      for (const cellIndex of payloadIndexes) plaintext += inputBlock[cellIndex];
    }
    const originalBitLength = Number(payload.originalBitLength);
    if (!Number.isInteger(originalBitLength) || originalBitLength < 0 || originalBitLength > plaintext.length) fail('The package original bit length is invalid.');
    return plaintext.slice(0, originalBitLength);
  }

  function gridMarkup(bits, size, label) {
    if (!bits) return '';
    if (size > 20) return `<div class="cube-preview-summary"><strong>${label}</strong><span>${size} × ${size} preview omitted to keep the browser responsive.</span></div>`;
    const cells = [...bits].map(bit => `<span class="cube-bit cube-bit-${bit}">${bit}</span>`).join('');
    return `<figure class="cube-preview"><figcaption>${label}</figcaption><div class="cube-bit-grid" style="--cube-grid-size:${size}">${cells}</div></figure>`;
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
      .cube-lab-field textarea{min-height:110px;resize:vertical}.cube-lab-field input,.cube-lab-field select,.cube-lab-field textarea{width:100%;box-sizing:border-box}
      .cube-lab-actions{display:flex;flex-wrap:wrap;gap:8px;margin:14px 0}.cube-lab-actions button{min-width:130px}
      .cube-lab-output{display:grid;gap:14px}.cube-lab-status{min-height:1.4em;color:var(--muted)}.cube-lab-status.error{color:#ffb3b3}
      .cube-preview-row{display:flex;gap:18px;flex-wrap:wrap;align-items:flex-start}.cube-preview{margin:0;display:grid;gap:8px}.cube-preview figcaption{font-weight:700}
      .cube-bit-grid{display:grid;grid-template-columns:repeat(var(--cube-grid-size),minmax(18px,26px));gap:2px;max-width:100%;overflow:auto}
      .cube-bit{display:grid;place-items:center;aspect-ratio:1;border:1px solid #ffffff22;border-radius:3px;font:700 .78rem ui-monospace,monospace}.cube-bit-1{background:#7fc8ff33}.cube-bit-0{background:#ffffff08}
      .cube-preview-summary{display:grid;gap:4px;padding:10px;border:1px dashed var(--line);border-radius:8px;color:var(--muted)}
      .shadowrun-tool-launch{margin-top:12px}
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
        <div><p class="eyebrow">Experimental Matrix utility</p><h2>Binary Cube Encryption Laboratory</h2><p>Build and test the reversible face-projection permutation described in the supplied 3D encryption notes.</p></div>
        <button type="button" class="layout-button" data-cube-close>Close Laboratory</button>
      </div>
      <p class="cube-lab-warning"><strong>Research and game-use warning:</strong> this is an experimental permutation and obfuscation model. It has not received cryptographic review and must not protect real credentials, financial records, private messages, or other sensitive data.</p>
      <div class="cube-lab-grid">
        ${field('Binary input', '<textarea id="cube-input" spellcheck="false" placeholder="0100100001101001"></textarea>', 'Whitespace is ignored. All other characters are rejected.')}
        ${field('Grid size', `<select id="cube-size">${RECOMMENDED_GRID_SIZES.map(size => `<option value="${size}">${size} × ${size} face · ${size * size} cells</option>`).join('')}</select>`, 'The source document recommends 4, 12, 20, 28, 36, 44, 52, and 60.')}
        ${field('Key seed', '<input id="cube-seed" type="text" value="shadowrun-matrix-demo">', 'The seed deterministically generates the Latin cube point field, mask, and filler stream.')}
        ${field('Input face', `<select id="cube-input-face">${FACES.map(face => `<option value="${face}" ${face === 'top' ? 'selected' : ''}>${face}</option>`).join('')}</select>`)}
        ${field('Output face', `<select id="cube-output-face">${FACES.map(face => `<option value="${face}" ${face === 'front' ? 'selected' : ''}>${face}</option>`).join('')}</select>`, 'The output must be perpendicular to the input face; same and opposite faces are rejected.')}
        ${field('Input start corner', '<select id="cube-input-turns"><option value="0">Top-left</option><option value="1">Top-right</option><option value="2">Bottom-right</option><option value="3">Bottom-left</option></select>')}
        ${field('Output orientation', '<select id="cube-output-turns"><option value="0">0°</option><option value="1">90°</option><option value="2">180°</option><option value="3">270°</option></select>')}
        ${field('Data-entry mask', '<select id="cube-mask-density"><option value="1">Full face · 100% payload</option><option value="0.75">Sparse · 75% payload</option><option value="0.5">Sparse · 50% payload</option></select>', 'Inactive cells receive deterministic junk bits and become part of the key-defined mask.')}
      </div>
      <div class="cube-lab-actions">
        <button type="button" class="link-button" data-cube-generate>Generate Key</button>
        <button type="button" class="link-button" data-cube-encrypt>Encrypt Binary</button>
        <button type="button" class="link-button" data-cube-decrypt>Decrypt Package</button>
        <button type="button" class="layout-button" data-cube-reset>Reset</button>
      </div>
      <p id="cube-status" class="cube-lab-status" role="status" aria-live="polite"></p>
      <div class="cube-lab-output">
        ${field('Encrypted package JSON', '<textarea id="cube-package" spellcheck="false" placeholder="Generate a key, then encrypt binary data."></textarea>', 'Contains framing metadata and ciphertext, but not the key permutations or mask.')}
        ${field('Key JSON', '<textarea id="cube-key" spellcheck="false" placeholder="Generate or paste a key JSON document."></textarea>', 'The key is required for decryption and includes the coordinate permutations and data-entry mask.')}
        ${field('Decrypted binary', '<textarea id="cube-decrypted" spellcheck="false" readonly></textarea>')}
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

  function setStatus(panel, message, error = false) {
    const status = panel.querySelector('#cube-status');
    status.textContent = message;
    status.classList.toggle('error', error);
  }

  function parseJsonField(panel, selector, label) {
    const raw = panel.querySelector(selector).value.trim();
    if (!raw) fail(`${label} is empty.`);
    try { return JSON.parse(raw); } catch (error) { fail(`${label} is not valid JSON: ${error.message}`); }
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

  function showPreview(panel, packageObject) {
    panel.querySelector('#cube-preview-row').innerHTML = [
      gridMarkup(packageObject.preview?.firstInputBlock, packageObject.gridSize, `${packageObject.inputFace} input block`),
      gridMarkup(packageObject.preview?.firstOutputBlock, packageObject.gridSize, `${packageObject.outputFace} encrypted block`)
    ].join('');
  }

  function bindPanel(panel) {
    panel.querySelector('[data-cube-close]').addEventListener('click', () => { panel.hidden = true; });
    panel.querySelector('[data-cube-generate]').addEventListener('click', () => {
      try {
        const key = createKey(values(panel));
        assertProjectionUniqueness(buildPoints(key), key.gridSize);
        panel.querySelector('#cube-key').value = JSON.stringify(key, null, 2);
        panel.querySelector('#cube-package').value = '';
        panel.querySelector('#cube-decrypted').value = '';
        panel.querySelector('#cube-preview-row').innerHTML = '';
        setStatus(panel, `Key ${key.keyId} generated · ${key.mask.filter(Boolean).length} payload cells per ${key.gridSize * key.gridSize}-cell block.`);
        save(panel);
      } catch (error) { setStatus(panel, error.message, true); }
    });
    panel.querySelector('[data-cube-encrypt]').addEventListener('click', () => {
      try {
        let key;
        const keyField = panel.querySelector('#cube-key');
        if (keyField.value.trim()) key = validateKey(parseJsonField(panel, '#cube-key', 'Key JSON'));
        else {
          key = createKey(values(panel));
          keyField.value = JSON.stringify(key, null, 2);
        }
        const packageObject = encryptBinary(panel.querySelector('#cube-input').value, key);
        panel.querySelector('#cube-package').value = JSON.stringify(packageObject, null, 2);
        panel.querySelector('#cube-decrypted').value = '';
        showPreview(panel, packageObject);
        setStatus(panel, `${packageObject.originalBitLength} input bits encrypted into ${packageObject.blockCount} cube block${packageObject.blockCount === 1 ? '' : 's'} using key ${key.keyId}.`);
        save(panel);
      } catch (error) { setStatus(panel, error.message, true); }
    });
    panel.querySelector('[data-cube-decrypt]').addEventListener('click', () => {
      try {
        const key = parseJsonField(panel, '#cube-key', 'Key JSON');
        const packageObject = parseJsonField(panel, '#cube-package', 'Encrypted package JSON');
        const plaintext = decryptBinary(packageObject, key);
        panel.querySelector('#cube-decrypted').value = plaintext;
        showPreview(panel, packageObject);
        setStatus(panel, `${plaintext.length} original bits recovered and trimmed to the stored source length.`);
        save(panel);
      } catch (error) { setStatus(panel, error.message, true); }
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
      panel.querySelector('#cube-preview-row').innerHTML = '';
      setStatus(panel, 'Laboratory reset.');
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

  const api = Object.freeze({
    createKey,
    validateKey,
    buildPoints,
    assertProjectionUniqueness,
    faceOrder,
    transformBlock,
    encryptBinary,
    decryptBinary,
    openPanel,
    constants: Object.freeze({ KEY_FORMAT, PACKAGE_FORMAT, SCHEMA_VERSION, FACES, RECOMMENDED_GRID_SIZES })
  });

  if (typeof window !== 'undefined') window.ShadowrunBinaryCubeEncryption = api;
  if (typeof document === 'undefined') return;
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', init, { once: true }) : init();
})();
