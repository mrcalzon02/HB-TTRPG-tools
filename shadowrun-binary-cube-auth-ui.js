(() => {
  'use strict';

  const Engine = window.ShadowrunBinaryCubeEngine;
  const Auth = window.ShadowrunBinaryCubeAuth;
  const PANEL_ID = 'shadowrun-binary-cube-lab';
  const AUTH_ID = 'cube-auth-envelope-section';
  const STORAGE_KEY = 'hb-ttrpg-shadowrun-binary-cube-auth-envelope-v1';

  if (!Engine || !Auth) {
    console.error('Binary Cube engine and authenticated-envelope module must load before the authentication interface.');
    return;
  }

  function clone(value) { return value == null ? null : JSON.parse(JSON.stringify(value)); }

  function setTransportArtifact(panel, envelope) {
    panel.__cubeTransportArtifact = Object.freeze({ kind: 'authenticated-envelope', document: clone(envelope) });
  }

  function fail(message) {
    throw new Error(message);
  }

  function setStatus(panel, message, type = '') {
    const status = panel.querySelector('#cube-status');
    if (!status) return;
    status.textContent = message;
    status.classList.toggle('error', type === 'error');
    status.classList.toggle('success', type === 'success');
  }

  function parseJsonField(panel, selector, label) {
    const raw = panel.querySelector(selector)?.value.trim();
    if (!raw) fail(`${label} is empty.`);
    try {
      return JSON.parse(raw);
    } catch (error) {
      fail(`${label} is not valid JSON: ${error.message}`);
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
    if (!String(value || '').trim()) fail('There is nothing to copy.');
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

  async function readJsonFile(file, label) {
    if (!file) fail(`${label} was not selected.`);
    const text = await file.text();
    try {
      return JSON.parse(text);
    } catch (error) {
      fail(`${label} is not valid JSON: ${error.message}`);
    }
  }

  function persistEnvelope(section) {
    try {
      localStorage.setItem(STORAGE_KEY, section.querySelector('#cube-auth-envelope').value);
    } catch (_) {
      // Browser storage is optional; passphrases are never stored.
    }
  }

  function restoreEnvelope(section) {
    try {
      section.querySelector('#cube-auth-envelope').value = localStorage.getItem(STORAGE_KEY) || '';
    } catch (_) {
      // Browser storage is optional; passphrases are never stored.
    }
  }

  function build() {
    const panel = document.getElementById(PANEL_ID);
    if (!panel || document.getElementById(AUTH_ID)) return;
    const output = panel.querySelector('.cube-lab-output') || panel;
    const section = document.createElement('section');
    section.id = AUTH_ID;
    section.innerHTML = `
      <div class="cube-lab-header">
        <div>
          <p class="eyebrow">Optional authenticated transport · AES-GCM</p>
          <h3>Authenticated Package Envelope</h3>
          <p>Wrap the serialized Binary Cube package in standard passphrase-derived authenticated encryption. This protects the exported package in transit; it does not make the underlying cube permutation production cryptography.</p>
        </div>
      </div>
      <p class="cube-lab-warning"><strong>Passphrase boundary:</strong> the passphrase is used only in memory and is never stored by this tool. Losing it makes the envelope unrecoverable. A weak passphrase remains vulnerable to guessing.</p>
      <div class="cube-lab-grid">
        <div class="cube-lab-field">
          <label for="cube-auth-passphrase">Envelope passphrase</label>
          <input id="cube-auth-passphrase" type="password" minlength="12" maxlength="1024" autocomplete="new-password" spellcheck="false">
          <small>Minimum 12 characters. Use a unique, high-entropy phrase.</small>
        </div>
        <div class="cube-lab-field">
          <label for="cube-auth-envelope">Authenticated envelope JSON</label>
          <textarea id="cube-auth-envelope" spellcheck="false" placeholder="Seal a validated package or import an authenticated envelope."></textarea>
          <small>Contains PBKDF2 parameters, AES-GCM metadata, and authenticated ciphertext. It does not contain the passphrase.</small>
        </div>
      </div>
      <div class="cube-lab-actions">
        <button type="button" class="link-button" data-cube-auth-seal>Seal Package</button>
        <button type="button" class="link-button" data-cube-auth-open>Open Envelope</button>
        <button type="button" class="layout-button" data-cube-auth-inspect>Inspect Envelope</button>
        <button type="button" class="layout-button" data-cube-auth-copy>Copy Envelope</button>
        <button type="button" class="layout-button" data-cube-auth-download>Download Envelope</button>
        <label class="layout-button cube-file-button">Import Envelope<input id="cube-auth-import" type="file" accept="application/json,.json"></label>
        <button type="button" class="layout-button" data-cube-auth-clear>Clear Envelope</button>
      </div>
      <div id="cube-auth-summary" class="cube-diagnostics" hidden></div>
    `;
    output.appendChild(section);
    bind(panel, section);
    restoreEnvelope(section);
  }

  function renderSummary(section, envelope) {
    const summary = Auth.inspectEnvelope(envelope);
    const node = section.querySelector('#cube-auth-summary');
    node.hidden = false;
    node.textContent = `${summary.cipher.name}-${summary.cipher.keyLength} authenticated envelope · ${summary.kdf.name} ${summary.kdf.hash} at ${summary.kdf.iterations.toLocaleString()} iterations · key ${summary.cubeKeyId} · ${summary.ciphertextBytes} ciphertext bytes.`;
  }

  function clearSummary(section) {
    const node = section.querySelector('#cube-auth-summary');
    node.hidden = true;
    node.textContent = '';
  }

  function bind(panel, section) {
    const passphrase = () => section.querySelector('#cube-auth-passphrase').value;
    const envelopeField = section.querySelector('#cube-auth-envelope');

    section.querySelector('[data-cube-auth-seal]').addEventListener('click', async event => {
      const button = event.currentTarget;
      button.disabled = true;
      button.setAttribute('aria-busy', 'true');
      try {
        const key = Engine.validateKey(parseJsonField(panel, '#cube-key', 'Key JSON'));
        const packageObject = Engine.validatePackage(parseJsonField(panel, '#cube-package', 'Encrypted package JSON'), key);
        const envelope = await Auth.sealPackage(packageObject, passphrase());
        envelopeField.value = JSON.stringify(envelope, null, 2);
        setTransportArtifact(panel, envelope);
        renderSummary(section, envelope);
        persistEnvelope(section);
        setStatus(panel, `Package for key ${key.keyId} sealed in an authenticated AES-GCM envelope. The passphrase was not stored.`, 'success');
      } catch (error) {
        setStatus(panel, error.message, 'error');
      } finally {
        button.disabled = false;
        button.removeAttribute('aria-busy');
      }
    });

    section.querySelector('[data-cube-auth-open]').addEventListener('click', async event => {
      const button = event.currentTarget;
      button.disabled = true;
      button.setAttribute('aria-busy', 'true');
      try {
        const envelope = parseJsonField(panel, '#cube-auth-envelope', 'Authenticated envelope JSON');
        const packageObject = await Auth.openEnvelope(envelope, passphrase());
        panel.querySelector('#cube-package').value = JSON.stringify(packageObject, null, 2);
        setTransportArtifact(panel, envelope);
        panel.querySelector('#cube-package').dispatchEvent(new Event('input', { bubbles: true }));
        renderSummary(section, envelope);
        const keyText = panel.querySelector('#cube-key').value.trim();
        if (keyText) {
          const key = Engine.validateKey(JSON.parse(keyText));
          Engine.validatePackage(packageObject, key);
          panel.querySelector('[data-cube-validate]')?.click();
          setStatus(panel, `Authenticated envelope opened and its Binary Cube package validated against key ${key.keyId}.`, 'success');
        } else {
          setStatus(panel, `Authenticated envelope opened for key ${packageObject.keyId}. Import its matching Binary Cube key to validate or decrypt the package.`, 'success');
        }
      } catch (error) {
        setStatus(panel, error.message, 'error');
      } finally {
        button.disabled = false;
        button.removeAttribute('aria-busy');
      }
    });

    section.querySelector('[data-cube-auth-inspect]').addEventListener('click', () => {
      try {
        const envelope = parseJsonField(panel, '#cube-auth-envelope', 'Authenticated envelope JSON');
        renderSummary(section, envelope);
        setStatus(panel, 'Authenticated envelope structure is valid. Opening it still requires the correct passphrase.', 'success');
      } catch (error) {
        setStatus(panel, error.message, 'error');
      }
    });

    section.querySelector('[data-cube-auth-copy]').addEventListener('click', async () => {
      try {
        await copyText(envelopeField.value);
        setStatus(panel, 'Authenticated envelope JSON copied.', 'success');
      } catch (error) {
        setStatus(panel, error.message, 'error');
      }
    });

    section.querySelector('[data-cube-auth-download]').addEventListener('click', () => {
      try {
        const envelope = parseJsonField(panel, '#cube-auth-envelope', 'Authenticated envelope JSON');
        const summary = Auth.inspectEnvelope(envelope);
        downloadJson(envelope, `shadowrun-binary-cube-authenticated-${summary.cubeKeyId}.json`);
        setStatus(panel, `Authenticated envelope for key ${summary.cubeKeyId} downloaded.`, 'success');
      } catch (error) {
        setStatus(panel, error.message, 'error');
      }
    });

    section.querySelector('#cube-auth-import').addEventListener('change', async event => {
      try {
        const envelope = await readJsonFile(event.target.files?.[0], 'Authenticated envelope file');
        Auth.validateEnvelope(envelope);
        envelopeField.value = JSON.stringify(envelope, null, 2);
        setTransportArtifact(panel, envelope);
        renderSummary(section, envelope);
        persistEnvelope(section);
        setStatus(panel, 'Authenticated envelope imported and structurally validated. Enter its passphrase to open it.', 'success');
      } catch (error) {
        setStatus(panel, error.message, 'error');
      }
      event.target.value = '';
    });

    section.querySelector('[data-cube-auth-clear]').addEventListener('click', () => {
      envelopeField.value = '';
      section.querySelector('#cube-auth-passphrase').value = '';
      localStorage.removeItem(STORAGE_KEY);
      clearSummary(section);
      setStatus(panel, 'Authenticated envelope and in-memory passphrase cleared.', 'success');
    });

    envelopeField.addEventListener('input', () => persistEnvelope(section));
    panel.querySelector('[data-cube-reset]')?.addEventListener('click', () => {
      setTimeout(() => {
        if (panel.querySelector('#cube-key').value || panel.querySelector('#cube-package').value) return;
        envelopeField.value = '';
        section.querySelector('#cube-auth-passphrase').value = '';
        localStorage.removeItem(STORAGE_KEY);
        clearSummary(section);
      }, 0);
    });
  }


  function currentEnvelopeArtifact() {
    const section = document.getElementById(AUTH_ID);
    const raw = section?.querySelector('#cube-auth-envelope')?.value.trim();
    if (!raw) return null;
    return clone(Auth.validateEnvelope(JSON.parse(raw)));
  }

  function loadEnvelopeArtifact(rawEnvelope) {
    build();
    const panel = document.getElementById(PANEL_ID);
    const section = document.getElementById(AUTH_ID);
    if (!panel || !section) fail('The authenticated-envelope interface is unavailable.');
    const envelope = Auth.validateEnvelope(rawEnvelope);
    section.querySelector('#cube-auth-envelope').value = JSON.stringify(envelope, null, 2);
    section.querySelector('#cube-auth-passphrase').value = '';
    setTransportArtifact(panel, envelope);
    renderSummary(section, envelope);
    persistEnvelope(section);
    setStatus(panel, 'Authenticated envelope loaded. Enter its passphrase to open it; no passphrase was stored.', 'success');
    return clone(envelope);
  }

  function init() {
    build();
    if (!document.getElementById(PANEL_ID)) {
      const observer = new MutationObserver(() => {
        if (!document.getElementById(PANEL_ID)) return;
        observer.disconnect();
        build();
      });
      observer.observe(document.body, { childList: true, subtree: true });
    }
  }

  window.ShadowrunBinaryCubeAuthUI = Object.freeze({ mount: build, auth: Auth, currentEnvelopeArtifact, loadEnvelopeArtifact });
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', init, { once: true }) : init();
})();
