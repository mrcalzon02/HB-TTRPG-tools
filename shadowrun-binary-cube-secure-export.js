(function installBinaryCubeSecureExport(root, factory) {
  'use strict';
  const api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.ShadowrunBinaryCubeSecureExport = api;
  if (root && root.document) api.install();
})(typeof globalThis !== 'undefined' ? globalThis : this, function createBinaryCubeSecureExport(root) {
  'use strict';

  const EXPORT_FORMAT = 'hb-ttrpg-binary-cube-secure-export';
  const EXPORT_SCHEMA_VERSION = '0.1.0';
  const EXPORT_CHECKSUM_TYPE = 'fnv1a32-secure-export-corruption-detection-only';
  const LENGTH_HEADER_BITS = 64;
  const PANEL_ID = 'shadowrun-binary-cube-lab';
  const PACKAGE_INPUT_IDS = new Set(['cube-import-encrypted-file', 'cube-import-package']);
  let installed = false;

  function fail(message) {
    throw new Error(message);
  }

  function engine(value) {
    const resolved = value || root?.ShadowrunBinaryCubeEngine;
    if (!resolved) fail('The Binary Cube engine is not available.');
    return resolved;
  }

  function parseObject(value, label = 'Secure export') {
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch (error) {
        fail(`${label} is not valid JSON: ${error.message}`);
      }
    }
    if (!value || typeof value !== 'object' || Array.isArray(value)) fail(`${label} must be a JSON object.`);
    return value;
  }

  function normalizeBits(value, label) {
    const bits = String(value ?? '').replace(/\s+/g, '');
    if (!bits || /[^01]/.test(bits)) fail(`${label} must contain only binary digits.`);
    return bits;
  }

  function fnv1a32(value) {
    let hash = 0x811c9dc5;
    const text = String(value ?? '');
    for (let index = 0; index < text.length; index += 1) {
      hash ^= text.charCodeAt(index);
      hash = Math.imul(hash, 0x01000193);
    }
    return (hash >>> 0).toString(16).padStart(8, '0');
  }

  function exportChecksumMaterial(value) {
    return JSON.stringify({
      format: value.format,
      schemaVersion: value.schemaVersion,
      ciphertext: value.ciphertext,
      framingCiphertext: value.framingCiphertext,
      checksumType: value.checksumType,
      checksum: value.checksum,
      exportChecksumType: value.exportChecksumType
    });
  }

  function integerToHeaderBits(value) {
    const length = BigInt(value);
    if (length < 1n || length > BigInt(Number.MAX_SAFE_INTEGER)) fail('The original bit length cannot be represented safely by this export format.');
    return length.toString(2).padStart(LENGTH_HEADER_BITS, '0');
  }

  function headerBitsToInteger(bits) {
    const normalized = normalizeBits(bits, 'Decrypted framing header');
    if (normalized.length !== LENGTH_HEADER_BITS) fail(`The decrypted framing header must contain exactly ${LENGTH_HEADER_BITS} bits.`);
    const length = BigInt(`0b${normalized}`);
    if (length < 1n || length > BigInt(Number.MAX_SAFE_INTEGER)) fail('The decrypted framing header contains an invalid original bit length.');
    return Number(length);
  }

  function packageBase(key, Engine) {
    return {
      format: Engine.constants.PACKAGE_FORMAT,
      schemaVersion: Engine.constants.SCHEMA_VERSION,
      algorithm: Engine.constants.ALGORITHM,
      securityClassification: Engine.constants.SECURITY_CLASSIFICATION,
      keyId: key.keyId,
      gridSize: key.gridSize,
      inputFace: key.inputFace,
      outputFace: key.outputFace,
      inputQuarterTurns: key.inputQuarterTurns,
      outputQuarterTurns: key.outputQuarterTurns
    };
  }

  function createSecureExport(rawPackage, rawKey, engineValue) {
    const Engine = engine(engineValue);
    const key = Engine.validateKey(rawKey);
    const packageObject = Engine.validatePackage(rawPackage, key);
    const framingPackage = Engine.encryptBinary(integerToHeaderBits(packageObject.originalBitLength), key);
    const secure = {
      format: EXPORT_FORMAT,
      schemaVersion: EXPORT_SCHEMA_VERSION,
      ciphertext: packageObject.ciphertext,
      framingCiphertext: framingPackage.ciphertext,
      checksumType: packageObject.checksumType,
      checksum: packageObject.checksum,
      exportChecksumType: EXPORT_CHECKSUM_TYPE
    };
    secure.exportChecksum = fnv1a32(exportChecksumMaterial(secure));
    return secure;
  }

  function validateSecureExport(rawExport) {
    const secure = parseObject(rawExport, 'Secure Binary Cube export');
    if (secure.format !== EXPORT_FORMAT) fail('The selected document is not a secure Binary Cube export.');
    if (secure.schemaVersion !== EXPORT_SCHEMA_VERSION) fail(`Unsupported secure export schema: ${secure.schemaVersion || 'missing'}.`);
    const normalized = {
      format: EXPORT_FORMAT,
      schemaVersion: EXPORT_SCHEMA_VERSION,
      ciphertext: normalizeBits(secure.ciphertext, 'Secure export ciphertext'),
      framingCiphertext: normalizeBits(secure.framingCiphertext, 'Secure export framing ciphertext'),
      checksumType: String(secure.checksumType || ''),
      checksum: String(secure.checksum || ''),
      exportChecksumType: String(secure.exportChecksumType || ''),
      exportChecksum: String(secure.exportChecksum || '')
    };
    if (!normalized.checksumType || !normalized.checksum) fail('The secure export is missing its package checksum information.');
    if (normalized.exportChecksumType !== EXPORT_CHECKSUM_TYPE) fail('The secure export corruption-check profile is missing or unsupported.');
    const expected = fnv1a32(exportChecksumMaterial(normalized));
    if (normalized.exportChecksum !== expected) fail('Secure export corruption validation failed.');
    return normalized;
  }

  function isSecureExport(value) {
    try {
      return parseObject(value).format === EXPORT_FORMAT;
    } catch (_) {
      return false;
    }
  }

  function expandSecureExport(rawExport, rawKey, engineValue) {
    const Engine = engine(engineValue);
    const secure = validateSecureExport(rawExport);
    const key = Engine.validateKey(rawKey);
    const cellCount = key.gridSize * key.gridSize;
    const payloadCapacity = key.mask.filter(Boolean).length;

    if (secure.framingCiphertext.length % cellCount !== 0) fail('Secure framing ciphertext is not aligned to the supplied key.');
    const framingBlockCount = secure.framingCiphertext.length / cellCount;
    const framingPackage = {
      ...packageBase(key, Engine),
      originalBitLength: LENGTH_HEADER_BITS,
      payloadCapacity,
      blockCount: framingBlockCount,
      ciphertext: secure.framingCiphertext,
      checksumType: Engine.constants.CHECKSUM_TYPE
    };
    framingPackage.checksum = Engine.packageChecksum(framingPackage);
    const originalBitLength = headerBitsToInteger(Engine.decryptBinary(framingPackage, key));

    if (secure.ciphertext.length % cellCount !== 0) fail('Secure export ciphertext is not aligned to the supplied key.');
    const blockCount = secure.ciphertext.length / cellCount;
    const packageObject = {
      ...packageBase(key, Engine),
      originalBitLength,
      payloadCapacity,
      blockCount,
      ciphertext: secure.ciphertext,
      checksumType: secure.checksumType,
      checksum: secure.checksum
    };
    return Engine.validatePackage(packageObject, key);
  }

  function panel() {
    return root.document.getElementById(PANEL_ID);
  }

  function setStatus(targetPanel, message, type = '') {
    const node = targetPanel?.querySelector('#cube-status');
    if (!node) return;
    node.textContent = message;
    node.classList.toggle('error', type === 'error');
    node.classList.toggle('success', type === 'success');
  }

  function parseField(targetPanel, selector, label) {
    const raw = targetPanel.querySelector(selector)?.value.trim();
    if (!raw) fail(`${label} is empty.`);
    return parseObject(raw, label);
  }

  function keyFromPanel(targetPanel) {
    const Engine = engine();
    return Engine.validateKey(parseField(targetPanel, '#cube-key', 'Key JSON'));
  }

  function setTransportArtifact(targetPanel, kind, documentObject) {
    targetPanel.__cubeTransportArtifact = Object.freeze({ kind, document: JSON.parse(JSON.stringify(documentObject)) });
  }

  function replacePackageField(targetPanel, value) {
    const field = targetPanel.querySelector('#cube-package');
    field.value = JSON.stringify(value, null, 2);
    field.dispatchEvent(new Event('input', { bubbles: true }));
  }

  function ensureInternalPackage(targetPanel) {
    const Engine = engine();
    const packageValue = parseField(targetPanel, '#cube-package', 'Encrypted package JSON');
    if (!isSecureExport(packageValue)) return packageValue;
    const expanded = expandSecureExport(packageValue, keyFromPanel(targetPanel), Engine);
    replacePackageField(targetPanel, expanded);
    return expanded;
  }

  function secureExportFromPanel(targetPanel) {
    const Engine = engine();
    const key = keyFromPanel(targetPanel);
    const packageObject = Engine.validatePackage(ensureInternalPackage(targetPanel), key);
    return createSecureExport(packageObject, key, Engine);
  }

  function safeFilename(value) {
    return String(value || 'binary-cube-secure-export.json').replace(/[<>:"/\\|?*\u0000-\u001f]+/g, '-').slice(0, 140);
  }

  function brandPrefix() {
    return String(root.document.body?.dataset.binaryCubeBrand || '').toLowerCase() === 'blacklight' ? 'blacklight' : 'shadowrun';
  }

  function secureFilename() {
    return `${brandPrefix()}-binary-cube-secure-export.json`;
  }

  function downloadJson(value, filename) {
    const blob = new Blob([`${JSON.stringify(value, null, 2)}\n`], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = root.document.createElement('a');
    link.href = url;
    link.download = safeFilename(filename);
    root.document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  async function copyText(value) {
    if (root.navigator.clipboard?.writeText) {
      await root.navigator.clipboard.writeText(value);
      return;
    }
    const textarea = root.document.createElement('textarea');
    textarea.value = value;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    root.document.body.appendChild(textarea);
    textarea.select();
    if (!root.document.execCommand('copy')) fail('The browser could not copy the secure package text.');
    textarea.remove();
  }

  function setFileNote(targetPanel, selector, message) {
    const node = targetPanel.querySelector(selector);
    if (node) node.textContent = message;
  }

  async function importPackageFile(targetPanel, input, file) {
    if (!file) fail('Choose an encrypted package file first.');
    let imported;
    try {
      imported = JSON.parse(await file.text());
    } catch (error) {
      fail(`Encrypted package file is not valid JSON: ${error.message}`);
    }

    if (isSecureExport(imported)) {
      const keyText = targetPanel.querySelector('#cube-key').value.trim();
      if (keyText) {
        const secureDocument = imported;
        imported = expandSecureExport(imported, JSON.parse(keyText), engine());
        setTransportArtifact(targetPanel, 'secure-export', secureDocument);
        setStatus(targetPanel, 'Secure encrypted package imported, reconstructed from the supplied key, and validated.', 'success');
      } else {
        imported = validateSecureExport(imported);
        setStatus(targetPanel, 'Secure encrypted package imported. Import or paste the matching key before validation or decryption.', 'success');
      }
    } else {
      const keyText = targetPanel.querySelector('#cube-key').value.trim();
      if (keyText) imported = engine().validatePackage(imported, JSON.parse(keyText));
      setStatus(targetPanel, 'Legacy encrypted package imported. New downloads use the metadata-minimized secure export format.', 'success');
    }

    replacePackageField(targetPanel, imported);
    if (input.id === 'cube-import-encrypted-file') setFileNote(targetPanel, '#cube-encrypted-file-note', `${file.name || 'encrypted package'} loaded.`);
  }

  function tryExpandAfterKeyChange(targetPanel) {
    try {
      const value = parseField(targetPanel, '#cube-package', 'Encrypted package JSON');
      if (!isSecureExport(value)) return;
      const expanded = expandSecureExport(value, keyFromPanel(targetPanel), engine());
      replacePackageField(targetPanel, expanded);
      setTransportArtifact(targetPanel, 'secure-export', value);
      setStatus(targetPanel, 'Secure package reconstructed and validated with the imported key.', 'success');
    } catch (_) {
      // Partial key edits and unmatched keys remain visible until the user validates or decrypts.
    }
  }

  function enhancePanel(targetPanel) {
    if (!targetPanel || targetPanel.dataset.secureExportEnhanced === 'true') return;
    targetPanel.dataset.secureExportEnhanced = 'true';
    const packageField = targetPanel.querySelector('#cube-package');
    const note = packageField?.closest('.cube-lab-field')?.querySelector('small');
    if (note) note.textContent = 'Internal working package. Copy and download actions emit a secure external export with key-derived layout fields removed and original length carried inside encrypted framing.';
    targetPanel.querySelectorAll('[data-cube-download-package],[data-cube-download-encrypted-file]').forEach(button => { button.textContent = 'Download Secure Package'; });
    const copyButton = targetPanel.querySelector('[data-cube-copy-package]');
    if (copyButton) copyButton.textContent = 'Copy Secure Package';

    if (brandPrefix() === 'blacklight') {
      const title = targetPanel.querySelector('.cube-lab-header h2');
      const eyebrow = targetPanel.querySelector('.cube-lab-header .eyebrow');
      if (title) title.textContent = 'Blacklight Binary Cube Encryption Laboratory';
      if (eyebrow) eyebrow.textContent = `Black-level archive utility · engine ${engine().constants.SCHEMA_VERSION}`;
    }
  }

  function handleClick(event) {
    const button = event.target.closest?.('button,[data-cube-copy-package],[data-cube-download-package],[data-cube-download-encrypted-file]');
    const targetPanel = button?.closest?.(`#${PANEL_ID}`);
    if (!button || !targetPanel) return;

    if (button.matches('[data-cube-copy-package]')) {
      event.preventDefault();
      event.stopImmediatePropagation();
      void (async () => {
        try {
          const secure = secureExportFromPanel(targetPanel);
          await copyText(JSON.stringify(secure, null, 2));
          setStatus(targetPanel, 'Metadata-minimized secure package copied.', 'success');
        } catch (error) { setStatus(targetPanel, error.message, 'error'); }
      })();
      return;
    }

    if (button.matches('[data-cube-download-package],[data-cube-download-encrypted-file]')) {
      event.preventDefault();
      event.stopImmediatePropagation();
      try {
        downloadJson(secureExportFromPanel(targetPanel), secureFilename());
        setStatus(targetPanel, 'Metadata-minimized secure encrypted package downloaded without key-derived layout fields.', 'success');
      } catch (error) { setStatus(targetPanel, error.message, 'error'); }
      return;
    }

    if (brandPrefix() === 'blacklight' && button.matches('[data-cube-download-key]')) {
      event.preventDefault();
      event.stopImmediatePropagation();
      try {
        const key = keyFromPanel(targetPanel);
        downloadJson(key, 'blacklight-binary-cube-key.json');
        setStatus(targetPanel, 'Blacklight Binary Cube key downloaded separately.', 'success');
      } catch (error) { setStatus(targetPanel, error.message, 'error'); }
      return;
    }

    if (button.matches('[data-cube-decrypt-file],[data-cube-decrypt],[data-cube-validate],[data-cube-auth-seal]')) {
      try {
        ensureInternalPackage(targetPanel);
      } catch (error) {
        event.preventDefault();
        event.stopImmediatePropagation();
        setStatus(targetPanel, error.message, 'error');
      }
    }
  }

  function handleChange(event) {
    const input = event.target;
    if (!PACKAGE_INPUT_IDS.has(input.id)) {
      if (input.id === 'cube-import-key') {
        for (const delay of [0, 100, 500]) root.setTimeout(() => tryExpandAfterKeyChange(panel()), delay);
      }
      return;
    }
    const targetPanel = input.closest(`#${PANEL_ID}`);
    if (!targetPanel) return;
    event.stopImmediatePropagation();
    const file = input.files?.[0];
    void importPackageFile(targetPanel, input, file)
      .catch(error => setStatus(targetPanel, error.message, 'error'))
      .finally(() => { input.value = ''; });
  }

  function handleInput(event) {
    if (event.target.id !== 'cube-key') return;
    root.setTimeout(() => tryExpandAfterKeyChange(event.target.closest(`#${PANEL_ID}`)), 0);
  }

  function install() {
    if (installed || !root?.document) return;
    installed = true;
    root.document.addEventListener('click', handleClick, true);
    root.document.addEventListener('change', handleChange, true);
    root.document.addEventListener('input', handleInput);

    const existing = panel();
    if (existing) enhancePanel(existing);
    const observer = new MutationObserver(() => {
      const targetPanel = panel();
      if (targetPanel) enhancePanel(targetPanel);
    });
    observer.observe(root.document.documentElement, { childList: true, subtree: true });
  }

  return Object.freeze({
    createSecureExport,
    validateSecureExport,
    expandSecureExport,
    isSecureExport,
    install,
    constants: Object.freeze({ EXPORT_FORMAT, EXPORT_SCHEMA_VERSION, EXPORT_CHECKSUM_TYPE, LENGTH_HEADER_BITS })
  });
});
