(() => {
  'use strict';

  const PANEL_ID = 'shadowrun-binary-cube-lab';
  let previewUrl = '';

  function fail(message) {
    throw new Error(message);
  }

  function setStatus(panel, message, type = '') {
    const node = panel?.querySelector('#cube-status');
    if (!node) return;
    node.textContent = message;
    node.classList.toggle('error', type === 'error');
    node.classList.toggle('success', type === 'success');
  }

  function parseKey(panel) {
    const raw = panel.querySelector('#cube-key')?.value.trim();
    if (!raw) fail('Generate or import a key before creating a key image.');
    try {
      return window.ShadowrunBinaryCubeEngine.validateKey(JSON.parse(raw));
    } catch (error) {
      fail(`Key JSON is invalid: ${error.message}`);
    }
  }

  function safeFilename(value) {
    return String(value || 'binary-cube-key.png').replace(/[<>:"/\\|?*\u0000-\u001f]+/g, '-').slice(0, 140);
  }

  function brandPrefix() {
    const brand = String(document.body?.dataset.binaryCubeBrand || '').toLowerCase();
    if (brand === 'blacklight') return 'blacklight';
    if (brand === 'standalone') return 'binary-cube-desktop';
    return 'shadowrun';
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = safeFilename(filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function syncOptions(panel, key) {
    for (const [selector, value] of [
      ['#cube-size', key.gridSize],
      ['#cube-seed', key.seed],
      ['#cube-input-face', key.inputFace],
      ['#cube-output-face', key.outputFace],
      ['#cube-input-turns', key.inputQuarterTurns],
      ['#cube-output-turns', key.outputQuarterTurns]
    ]) {
      const field = panel.querySelector(selector);
      if (field) field.value = String(value);
    }

    const maskField = panel.querySelector('#cube-mask-density');
    if (maskField) {
      const density = key.mask.filter(Boolean).length / key.mask.length;
      const value = String(density);
      let option = [...maskField.options].find(candidate => Math.abs(Number(candidate.value) - density) < 1e-9);
      if (!option) {
        option = document.createElement('option');
        option.value = value;
        option.textContent = `Imported key · ${Math.round((1 - density) * 10000) / 100}% blocked`;
        maskField.appendChild(option);
      }
      maskField.value = option.value;
    }
  }

  function configureMaskOptions(panel) {
    const select = panel.querySelector('#cube-mask-density');
    if (!select || select.dataset.expandedMaskOptions === 'true') return;
    select.dataset.expandedMaskOptions = 'true';
    const current = Number(select.value || 1);
    const densities = [1, 0.99, 0.95, 0.9, 0.8, 0.75, 0.67, 0.5, 0.33, 0.25, 0.1, 0.05, 0.01];
    select.innerHTML = densities.map(density => {
      const blocked = Math.round((1 - density) * 100);
      const payload = Math.round(density * 100);
      return `<option value="${density}">${blocked}% blocked · ${payload}% payload</option>`;
    }).join('');
    const nearest = densities.reduce((best, density) => Math.abs(density - current) < Math.abs(best - current) ? density : best, densities[0]);
    select.value = String(nearest);
    const note = select.closest('.cube-lab-field')?.querySelector('small');
    if (note) note.textContent = 'Blocked cells receive deterministic filler. Expanded presets range from 0% through 99% blocked, and the exact mask is preserved in JSON and PNG keys.';
  }

  function describeLargeGrid(panel) {
    const select = panel.querySelector('#cube-size');
    if (!select || select.dataset.largeGridDescribed === 'true') return;
    select.dataset.largeGridDescribed = 'true';
    const note = select.closest('.cube-lab-field')?.querySelector('small');
    if (note) note.textContent = `Grid sizes now extend through ${window.ShadowrunBinaryCubeEngine.constants.MAX_GRID_SIZE} × ${window.ShadowrunBinaryCubeEngine.constants.MAX_GRID_SIZE}. Large keys consume substantially more memory and processing time.`;
  }

  function showPreview(panel, blob, key) {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    previewUrl = URL.createObjectURL(blob);
    const image = panel.querySelector('#cube-key-image-preview');
    const note = panel.querySelector('#cube-key-image-note');
    if (image) {
      image.src = previewUrl;
      image.hidden = false;
      image.alt = `Lossless ${key.gridSize} by ${key.gridSize} Binary Cube key image for key ${key.keyId}`;
    }
    if (note) note.textContent = `${key.gridSize} × ${key.gridSize} lossless 16-bit PNG · key ${key.keyId} · blue-channel mask markers.`;
  }

  async function downloadKeyImage(panel) {
    const key = parseKey(panel);
    setStatus(panel, `Encoding lossless ${key.gridSize} × ${key.gridSize} key PNG…`);
    const blob = await window.BinaryCubeKeyImage.encodeKeyBlob(key, window.ShadowrunBinaryCubeEngine);
    showPreview(panel, blob, key);
    downloadBlob(blob, `${brandPrefix()}-binary-cube-key-${key.keyId}.png`);
    setStatus(panel, `Lossless key PNG ${key.keyId} created and pixel-verified from the canonical key.`, 'success');
  }

  async function importKeyImage(panel, file) {
    if (!file) fail('Choose a Binary Cube key PNG first.');
    if (file.type && file.type !== 'image/png') fail('Binary Cube key images must remain PNG files.');
    setStatus(panel, `Validating lossless key image ${file.name || ''}…`);
    const key = await window.BinaryCubeKeyImage.decodeKeyPng(file, window.ShadowrunBinaryCubeEngine);
    const field = panel.querySelector('#cube-key');
    field.value = JSON.stringify(key, null, 2);
    field.dispatchEvent(new Event('input', { bubbles: true }));
    syncOptions(panel, key);
    showPreview(panel, file, key);
    setStatus(panel, `Lossless key PNG imported. Embedded key, fingerprint, PNG CRCs, dimensions, logarithmic depth raster, and blue-channel mask markers all validated for key ${key.keyId}.`, 'success');
  }

  function style() {
    if (document.getElementById('binary-cube-key-image-style')) return;
    const node = document.createElement('style');
    node.id = 'binary-cube-key-image-style';
    node.textContent = `
      .cube-key-image-panel{display:grid;grid-template-columns:minmax(220px,.5fr) minmax(0,1fr);gap:14px;align-items:start;padding:14px;border:1px solid var(--line);border-radius:14px;background:#0b1119}
      .cube-key-image-preview-wrap{display:grid;gap:8px;place-items:start}.cube-key-image-preview{display:block;max-width:min(100%,520px);max-height:520px;image-rendering:pixelated;border:1px solid var(--line);border-radius:8px;background:#000}
      .cube-key-image-copy{display:grid;gap:8px;color:var(--muted);line-height:1.5}.cube-key-image-copy strong{color:var(--ink)}
      @media(max-width:900px){.cube-key-image-panel{grid-template-columns:1fr}}
    `;
    document.head.appendChild(node);
  }

  function enhance(panel) {
    if (!panel || panel.dataset.losslessKeyImageEnhanced === 'true') return;
    if (!window.BinaryCubeKeyImage || !window.ShadowrunBinaryCubeEngine) return;
    panel.dataset.losslessKeyImageEnhanced = 'true';
    style();
    configureMaskOptions(panel);
    describeLargeGrid(panel);

    const keyField = panel.querySelector('#cube-key');
    const actions = keyField?.closest('.cube-lab-field')?.nextElementSibling;
    if (!keyField || !actions?.classList.contains('cube-lab-actions')) return;

    const download = document.createElement('button');
    download.type = 'button';
    download.className = 'layout-button';
    download.textContent = 'Download Lossless Key PNG';
    download.addEventListener('click', () => void downloadKeyImage(panel).catch(error => setStatus(panel, error.message, 'error')));

    const importLabel = document.createElement('label');
    importLabel.className = 'layout-button cube-file-button';
    importLabel.textContent = 'Import Lossless Key PNG';
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/png,.png';
    input.addEventListener('change', () => {
      const file = input.files?.[0];
      void importKeyImage(panel, file)
        .catch(error => setStatus(panel, error.message, 'error'))
        .finally(() => { input.value = ''; });
    });
    importLabel.appendChild(input);
    actions.append(download, importLabel);

    const imagePanel = document.createElement('section');
    imagePanel.className = 'cube-key-image-panel';
    imagePanel.innerHTML = `
      <div class="cube-key-image-preview-wrap">
        <img id="cube-key-image-preview" class="cube-key-image-preview" hidden alt="">
        <small id="cube-key-image-note">No lossless key image generated or imported.</small>
      </div>
      <div class="cube-key-image-copy">
        <strong>Lossless key image contract</strong>
        <span>Pixel X and Y are the key field coordinates. A 16-bit logarithmic grayscale value represents depth. Blocked cells invert the blue channel, producing a full-color mask marker while leaving red and green as the depth reference.</span>
        <span>The complete canonical key is compressed inside a private CRC-protected PNG chunk. Import rejects missing metadata, altered pixels, changed dimensions, reduced bit depth, palette conversion, interlacing, wrong fingerprints, and any mismatch between the image and embedded key.</span>
        <span>Do not resize, crop, recolor, screenshot, convert, optimize, or resave this file through an image editor. Use the original PNG produced by the laboratory.</span>
      </div>
    `;
    actions.insertAdjacentElement('afterend', imagePanel);
  }

  function install() {
    const attempt = () => enhance(document.getElementById(PANEL_ID));
    attempt();
    const observer = new MutationObserver(attempt);
    observer.observe(document.documentElement, { childList: true, subtree: true });
  }

  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', install, { once: true }) : install();
})();
