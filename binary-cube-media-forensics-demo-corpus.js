(function installBinaryCubeMediaForensicsDemoCorpus(root) {
  'use strict';

  const PANEL_ID = 'binary-cube-media-forensics-demo-corpus';
  const STYLE_ID = 'binary-cube-media-forensics-demo-corpus-style';
  const DEMO_VERSION = '20260809-ground-truth-1';
  const WIDTH = 64;
  const HEIGHT = 64;
  const RGB_LSB_PAYLOAD = 'HB-TTRPG::RGB-LSB::KNOWN-GROUND-TRUTH\n';
  const AFSK_PAYLOAD = 'HBDEMO01';
  const DTMF_PAYLOAD = '38255156';

  const DEMOS = Object.freeze([
    Object.freeze({
      id: 'clean-control',
      title: 'Clean PNG control',
      downloadName: 'binary-cube-demo-control.png',
      mimeType: 'image/png',
      tool: 'Raster baseline / convolution',
      workflow: 'raster',
      expected: 'No hidden payload. This is the negative-control raster used for parity comparison.',
      description: 'Deterministic 64×64 RGB control image. It provides the clean reference for raster bit planes, convolution residuals, entropy and visual parity.'
    }),
    Object.freeze({
      id: 'rgb-lsb',
      title: 'RGB-LSB embedded PNG',
      downloadName: 'binary-cube-demo-rgb-lsb.png',
      mimeType: 'image/png',
      tool: 'Raster LSB / bit-plane extraction',
      workflow: 'raster-lsb',
      expected: `Bit 0, RGB, MSB-first begins with ${JSON.stringify(RGB_LSB_PAYLOAD.trim())}.`,
      description: 'Positive-control raster steganography fixture. A known ASCII payload is embedded sequentially across the RGB least-significant bits while every modified sample remains within one level of the clean control.'
    }),
    Object.freeze({
      id: 'post-iend',
      title: 'Post-IEND appended PNG',
      downloadName: 'binary-cube-demo-post-iend.png',
      mimeType: 'image/png',
      tool: 'Container / appended-data forensics',
      workflow: 'container',
      expected: 'Container scan should report a second PNG beginning immediately after the first PNG IEND boundary.',
      description: 'Positive-control container fixture. The complete clean control PNG is appended after the first PNG IEND chunk, giving the carving tools a known trailing PNG signature and exact boundary.'
    }),
    Object.freeze({
      id: 'afsk1200',
      title: 'AFSK 1200 WAV',
      downloadName: 'binary-cube-demo-afsk1200.wav',
      mimeType: 'audio/wav',
      tool: 'AFSK / binary FSK decoder',
      workflow: 'afsk',
      expected: `1200/2200 Hz at 1200 baud decodes MSB-first to ${JSON.stringify(AFSK_PAYLOAD)}.`,
      description: 'Known-ground-truth 1200-baud binary carrier using 1200 Hz for mark/1 and 2200 Hz for space/0. It is intended for spectrum, Goertzel and FSK parity checks.'
    }),
    Object.freeze({
      id: 'dtmf',
      title: 'DTMF sequence WAV',
      downloadName: 'binary-cube-demo-dtmf.wav',
      mimeType: 'audio/wav',
      tool: 'DTMF decoder',
      workflow: 'dtmf',
      expected: `Expected decoded symbol sequence: ${DTMF_PAYLOAD}.`,
      description: 'Eight-symbol DTMF fixture with explicit inter-symbol silence so the existing frame decoder can verify symbol boundaries as well as tone identification.'
    })
  ]);

  let panel = null;
  const generatedCache = new Map();
  const objectUrls = new Map();

  const esc = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
  const asBytes = value => value instanceof Uint8Array ? value : Uint8Array.from(value || []);
  const textBytes = value => typeof TextEncoder !== 'undefined' ? new TextEncoder().encode(String(value)) : Uint8Array.from(unescape(encodeURIComponent(String(value))), character => character.charCodeAt(0));

  function concatBytes(...parts) {
    const values = parts.map(asBytes);
    const output = new Uint8Array(values.reduce((sum, value) => sum + value.length, 0));
    let offset = 0;
    for (const value of values) { output.set(value, offset); offset += value.length; }
    return output;
  }

  function uint32be(value) {
    return Uint8Array.of((value >>> 24) & 0xff, (value >>> 16) & 0xff, (value >>> 8) & 0xff, value & 0xff);
  }

  function crc32(value) {
    const bytes = asBytes(value);
    let crc = 0xffffffff;
    for (const byte of bytes) {
      crc ^= byte;
      for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
    }
    return (crc ^ 0xffffffff) >>> 0;
  }

  function adler32(value) {
    const bytes = asBytes(value);
    let a = 1; let b = 0;
    for (const byte of bytes) { a = (a + byte) % 65521; b = (b + a) % 65521; }
    return ((b << 16) | a) >>> 0;
  }

  function zlibStored(value) {
    const bytes = asBytes(value);
    const chunks = [Uint8Array.of(0x78, 0x01)];
    let offset = 0;
    while (offset < bytes.length) {
      const length = Math.min(65535, bytes.length - offset);
      const final = offset + length >= bytes.length ? 1 : 0;
      const complement = (~length) & 0xffff;
      chunks.push(Uint8Array.of(final, length & 0xff, (length >>> 8) & 0xff, complement & 0xff, (complement >>> 8) & 0xff));
      chunks.push(bytes.slice(offset, offset + length));
      offset += length;
    }
    chunks.push(uint32be(adler32(bytes)));
    return concatBytes(...chunks);
  }

  function pngChunk(type, dataValue) {
    const typeBytes = textBytes(type);
    const data = asBytes(dataValue);
    const body = concatBytes(typeBytes, data);
    return concatBytes(uint32be(data.length), body, uint32be(crc32(body)));
  }

  function encodeRgbPng(rgbValue, width = WIDTH, height = HEIGHT) {
    const rgb = asBytes(rgbValue);
    if (rgb.length !== width * height * 3) throw new Error('RGB demonstration raster size does not match its declared dimensions.');
    const scanlines = new Uint8Array(height * (1 + width * 3));
    for (let y = 0; y < height; y += 1) {
      const row = y * (1 + width * 3);
      scanlines[row] = 0;
      scanlines.set(rgb.slice(y * width * 3, (y + 1) * width * 3), row + 1);
    }
    const ihdr = new Uint8Array(13);
    ihdr.set(uint32be(width), 0); ihdr.set(uint32be(height), 4);
    ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
    return concatBytes(
      Uint8Array.of(137, 80, 78, 71, 13, 10, 26, 10),
      pngChunk('IHDR', ihdr),
      pngChunk('IDAT', zlibStored(scanlines)),
      pngChunk('IEND', new Uint8Array(0))
    );
  }

  function makeControlRgb() {
    const rgb = new Uint8Array(WIDTH * HEIGHT * 3);
    for (let y = 0; y < HEIGHT; y += 1) {
      for (let x = 0; x < WIDTH; x += 1) {
        const offset = (y * WIDTH + x) * 3;
        const grid = (x % 8 === 0 || y % 8 === 0) ? 36 : 0;
        rgb[offset] = (24 + x * 3 + grid) & 0xff;
        rgb[offset + 1] = (42 + y * 3 + (x ^ y) + grid) & 0xff;
        rgb[offset + 2] = (86 + (x * 5 + y * 7) % 128 + grid) & 0xff;
      }
    }
    return rgb;
  }

  function embedRgbLsb(rgbValue, payloadValue) {
    const rgb = Uint8Array.from(asBytes(rgbValue));
    const payload = textBytes(payloadValue);
    const requiredBits = payload.length * 8;
    if (requiredBits > rgb.length) throw new Error('RGB demonstration carrier is too small for the requested payload.');
    let cursor = 0;
    for (const byte of payload) {
      for (let bit = 7; bit >= 0; bit -= 1) {
        rgb[cursor] = (rgb[cursor] & 0xfe) | ((byte >>> bit) & 1);
        cursor += 1;
      }
    }
    return rgb;
  }

  function bytesToBits(value) {
    const bits = [];
    for (const byte of asBytes(value)) for (let bit = 7; bit >= 0; bit -= 1) bits.push((byte >>> bit) & 1);
    return bits;
  }

  function wavPcm16(samplesValue, sampleRate) {
    const samples = Array.from(samplesValue || [], Number);
    const dataSize = samples.length * 2;
    const output = new Uint8Array(44 + dataSize);
    const view = new DataView(output.buffer);
    const putText = (offset, text) => { for (let index = 0; index < text.length; index += 1) output[offset + index] = text.charCodeAt(index); };
    putText(0, 'RIFF'); view.setUint32(4, 36 + dataSize, true); putText(8, 'WAVE'); putText(12, 'fmt ');
    view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true); view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true); putText(36, 'data'); view.setUint32(40, dataSize, true);
    for (let index = 0; index < samples.length; index += 1) view.setInt16(44 + index * 2, Math.max(-32768, Math.min(32767, Math.round(samples[index] * 32767))), true);
    return output;
  }

  function makeAfskWav() {
    const sampleRate = 48000;
    const baud = 1200;
    const samplesPerSymbol = sampleRate / baud;
    const bits = bytesToBits(textBytes(AFSK_PAYLOAD));
    const samples = new Float32Array(bits.length * samplesPerSymbol);
    let phase = 0;
    for (let symbol = 0; symbol < bits.length; symbol += 1) {
      const frequency = bits[symbol] ? 1200 : 2200;
      const increment = 2 * Math.PI * frequency / sampleRate;
      for (let index = 0; index < samplesPerSymbol; index += 1) {
        samples[symbol * samplesPerSymbol + index] = Math.sin(phase) * 0.72;
        phase += increment;
        if (phase > Math.PI * 2) phase -= Math.PI * 2;
      }
    }
    return wavPcm16(samples, sampleRate);
  }

  const DTMF = Object.freeze({
    '1': [697, 1209], '2': [697, 1336], '3': [697, 1477],
    '4': [770, 1209], '5': [770, 1336], '6': [770, 1477],
    '7': [852, 1209], '8': [852, 1336], '9': [852, 1477],
    '*': [941, 1209], '0': [941, 1336], '#': [941, 1477]
  });

  function makeDtmfWav() {
    const sampleRate = 8000;
    const toneSamples = Math.floor(sampleRate * 0.08);
    const gapSamples = Math.floor(sampleRate * 0.05);
    const samples = [];
    for (const key of DTMF_PAYLOAD) {
      const [low, high] = DTMF[key];
      for (let index = 0; index < toneSamples; index += 1) {
        const time = index / sampleRate;
        samples.push(0.38 * Math.sin(2 * Math.PI * low * time) + 0.38 * Math.sin(2 * Math.PI * high * time));
      }
      for (let index = 0; index < gapSamples; index += 1) samples.push(0);
    }
    return wavPcm16(samples, sampleRate);
  }

  function buildDemoBytes(id) {
    const cleanRgb = makeControlRgb();
    const cleanPng = encodeRgbPng(cleanRgb);
    if (id === 'clean-control') return cleanPng;
    if (id === 'rgb-lsb') return encodeRgbPng(embedRgbLsb(cleanRgb, RGB_LSB_PAYLOAD));
    if (id === 'post-iend') return concatBytes(cleanPng, cleanPng);
    if (id === 'afsk1200') return makeAfskWav();
    if (id === 'dtmf') return makeDtmfWav();
    throw new Error(`Unknown demonstration fixture: ${id}`);
  }

  function demoById(id) {
    const demo = DEMOS.find(item => item.id === id);
    if (!demo) throw new Error(`Unknown demonstration fixture: ${id}`);
    return demo;
  }

  async function sha256Hex(bytes) {
    if (!root?.crypto?.subtle) return 'unavailable';
    const digest = await root.crypto.subtle.digest('SHA-256', bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));
    return Array.from(new Uint8Array(digest), value => value.toString(16).padStart(2, '0')).join('');
  }

  async function loadDemo(id) {
    if (generatedCache.has(id)) return generatedCache.get(id);
    const promise = (async () => {
      const demo = demoById(id);
      const bytes = buildDemoBytes(id);
      const digest = await sha256Hex(bytes);
      return Object.freeze({ demo, bytes, digest });
    })();
    generatedCache.set(id, promise);
    promise.catch(() => generatedCache.delete(id));
    return promise;
  }

  function objectUrlFor(loaded) {
    if (objectUrls.has(loaded.demo.id)) return objectUrls.get(loaded.demo.id);
    const url = URL.createObjectURL(new Blob([loaded.bytes], { type: loaded.demo.mimeType }));
    objectUrls.set(loaded.demo.id, url);
    return url;
  }

  function downloadDemo(loaded) {
    const link = root.document.createElement('a');
    link.href = objectUrlFor(loaded);
    link.download = loaded.demo.downloadName;
    root.document.body.appendChild(link);
    link.click();
    link.remove();
  }

  function waitFor(predicate, timeoutMs = 8000) {
    const started = Date.now();
    return new Promise((resolve, reject) => {
      const check = () => {
        try { const value = predicate(); if (value) return resolve(value); }
        catch (error) { return reject(error); }
        if (Date.now() - started >= timeoutMs) return reject(new Error('Timed out while preparing the selected forensic workbench.'));
        root.setTimeout(check, 40);
      };
      check();
    });
  }

  async function ensureMediaSuite() {
    if (root.BinaryCubeMediaForensicsSuite?.openPanel) return root.BinaryCubeMediaForensicsSuite;
    const workspace = root.ScientificToolsWorkspace;
    if (workspace?.loadMediaForensicsSuite) {
      const api = await workspace.loadMediaForensicsSuite();
      if (api?.openPanel) return api;
    }
    throw new Error('The Steganography, Signal & Media Forensics Suite is unavailable.');
  }

  function clickSection(suitePanel, section) {
    suitePanel.querySelector(`[data-bmfs-section-button="${section}"]`)?.click();
  }

  async function openInAppropriateTool(id) {
    const loaded = await loadDemo(id);
    const suite = await ensureMediaSuite();
    const suitePanel = suite.openPanel({ bytes: loaded.bytes, sourceName: loaded.demo.downloadName });
    await new Promise(resolve => root.requestAnimationFrame?.(() => resolve()) || root.setTimeout(resolve, 0));

    if (loaded.demo.workflow === 'container') {
      clickSection(suitePanel, 'overview');
      suitePanel.querySelector('[data-bmfs-run]')?.click();
      return suitePanel;
    }
    if (loaded.demo.workflow === 'raster' || loaded.demo.workflow === 'raster-lsb') {
      suitePanel.querySelector('[data-bmfs-decode-raster]')?.click();
      await waitFor(() => !suitePanel.querySelector('[data-bmfs-raster-meta]')?.textContent?.startsWith('No raster'));
      if (loaded.demo.workflow === 'raster-lsb') {
        suitePanel.querySelector('#bmfs-bit-source').value = 'raster';
        suitePanel.querySelector('#bmfs-bit-index').value = '0';
        suitePanel.querySelector('#bmfs-bit-order').value = 'msb';
        suitePanel.querySelector('#bmfs-raster-channels').value = 'rgb';
        suitePanel.querySelector('[data-bmfs-extract]')?.click();
        clickSection(suitePanel, 'bits');
      } else clickSection(suitePanel, 'raster');
      return suitePanel;
    }
    if (loaded.demo.workflow === 'afsk' || loaded.demo.workflow === 'dtmf') {
      suitePanel.querySelector('[data-bmfs-decode-audio]')?.click();
      await waitFor(() => !suitePanel.querySelector('[data-bmfs-audio-meta]')?.textContent?.startsWith('No audio'));
      clickSection(suitePanel, 'audio');
      suitePanel.querySelector('#bmfs-audio-decoder').value = loaded.demo.workflow === 'afsk' ? 'fsk' : 'dtmf';
      if (loaded.demo.workflow === 'afsk') {
        suitePanel.querySelector('#bmfs-audio-preset').value = 'afsk1200';
        suitePanel.querySelector('#bmfs-mark-frequency').value = '1200';
        suitePanel.querySelector('#bmfs-space-frequency').value = '2200';
        suitePanel.querySelector('#bmfs-baud').value = '1200';
      }
      suitePanel.querySelector('[data-bmfs-audio-decode]')?.click();
      return suitePanel;
    }
    return suitePanel;
  }

  function ensureStyle() {
    if (!root?.document || root.document.getElementById(STYLE_ID)) return;
    const style = root.document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      body.bmfdc-open{overflow:hidden}
      #${PANEL_ID}[hidden]{display:none}
      #${PANEL_ID}{position:fixed;inset:0;z-index:10080;display:grid;place-items:center;padding:20px}
      #${PANEL_ID} .bmfdc-backdrop{position:absolute;inset:0;background:rgba(4,8,13,.82);backdrop-filter:blur(4px)}
      #${PANEL_ID} .bmfdc-panel{position:relative;width:min(1180px,96vw);max-height:92vh;overflow:auto;border:1px solid var(--line,#33404d);border-radius:22px;background:var(--panel,#111821);box-shadow:0 24px 90px rgba(0,0,0,.5)}
      #${PANEL_ID} .bmfdc-header{display:flex;justify-content:space-between;gap:20px;align-items:flex-start;padding:22px 24px;border-bottom:1px solid var(--line,#33404d)}
      #${PANEL_ID} .bmfdc-header h2{margin:.2rem 0 .35rem}
      #${PANEL_ID} .bmfdc-header p{margin:0;color:var(--muted,#a9b5c1);line-height:1.55;max-width:850px}
      #${PANEL_ID} .bmfdc-close{font-size:1.8rem;line-height:1;background:transparent;border:0;color:inherit;cursor:pointer}
      #${PANEL_ID} .bmfdc-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:16px;padding:20px}
      #${PANEL_ID} .bmfdc-card{border:1px solid var(--line,#33404d);border-radius:16px;background:rgba(255,255,255,.025);overflow:hidden}
      #${PANEL_ID} .bmfdc-preview{min-height:180px;display:grid;place-items:center;background:#070b10;padding:10px}
      #${PANEL_ID} .bmfdc-preview img{display:block;max-width:100%;max-height:280px;image-rendering:auto;object-fit:contain}
      #${PANEL_ID} .bmfdc-preview audio{width:100%}
      #${PANEL_ID} .bmfdc-loading{color:var(--muted,#a9b5c1);font-size:.88rem}
      #${PANEL_ID} .bmfdc-copy{padding:16px}
      #${PANEL_ID} .bmfdc-copy h3{margin:0 0 7px}
      #${PANEL_ID} .bmfdc-copy p{margin:.4rem 0;color:var(--muted,#a9b5c1);line-height:1.5}
      #${PANEL_ID} .bmfdc-expected{border-left:2px solid var(--accent,#69c);padding-left:9px}
      #${PANEL_ID} .bmfdc-meta{display:grid;gap:4px;margin:10px 0;font-size:.8rem;color:var(--muted,#a9b5c1)}
      #${PANEL_ID} .bmfdc-meta code{overflow-wrap:anywhere}
      #${PANEL_ID} .bmfdc-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}
      #${PANEL_ID} button{cursor:pointer}
      #${PANEL_ID} .bmfdc-status{margin:0 20px 20px;padding:11px 13px;border-left:3px solid var(--accent,#69c);background:rgba(255,255,255,.035);color:var(--muted,#a9b5c1)}
      @media (max-width:700px){#${PANEL_ID}{padding:6px}#${PANEL_ID} .bmfdc-panel{width:100%;max-height:98vh;border-radius:14px}#${PANEL_ID} .bmfdc-grid{grid-template-columns:1fr;padding:12px}}
    `;
    root.document.head.appendChild(style);
  }

  async function renderPreview(id) {
    const target = panel?.querySelector(`[data-bmfdc-preview="${id}"]`);
    if (!target) return;
    try {
      const loaded = await loadDemo(id);
      const url = objectUrlFor(loaded);
      if (loaded.demo.mimeType.startsWith('image/')) target.innerHTML = `<img src="${esc(url)}" alt="${esc(loaded.demo.title)} demonstration fixture">`;
      else target.innerHTML = `<audio controls preload="metadata" src="${esc(url)}">Audio playback is unavailable in this browser.</audio>`;
      const integrity = panel?.querySelector(`[data-bmfdc-integrity="${id}"]`);
      if (integrity) integrity.textContent = `${loaded.bytes.length.toLocaleString()} bytes · SHA-256 ${loaded.digest}`;
    } catch (error) { target.innerHTML = `<p class="bmfdc-loading">${esc(error.message)}</p>`; }
  }

  function setStatus(message) {
    const node = panel?.querySelector('[data-bmfdc-status]');
    if (node) node.textContent = message;
  }

  function buildPanel() {
    if (!root?.document) throw new Error('The demonstration corpus requires a browser document.');
    const existing = root.document.getElementById(PANEL_ID);
    if (existing) { panel = existing; return panel; }
    ensureStyle();
    panel = root.document.createElement('section');
    panel.id = PANEL_ID;
    panel.hidden = true;
    panel.setAttribute('aria-labelledby', 'bmfdc-title');
    panel.innerHTML = `<div class="bmfdc-backdrop" data-bmfdc-close></div><div class="bmfdc-panel" role="dialog" aria-modal="true" aria-labelledby="bmfdc-title"><header class="bmfdc-header"><div><p>Scientific Tools · Known-ground-truth corpus</p><h2 id="bmfdc-title">Steganography & Signal Demonstration Files</h2><p>The repository owns deterministic control and positive-test files for parity testing. Each fixture is generated byte-for-byte from this authoritative corpus module, previewed here, saveable as a real PNG/WAV file, and handed directly to the matching existing forensic workbench.</p></div><button type="button" class="bmfdc-close" data-bmfdc-close aria-label="Close demonstration corpus">×</button></header><div class="bmfdc-grid">${DEMOS.map(demo => `<article class="bmfdc-card"><div class="bmfdc-preview" data-bmfdc-preview="${esc(demo.id)}"><span class="bmfdc-loading">Building ${esc(demo.downloadName)}…</span></div><div class="bmfdc-copy"><h3>${esc(demo.title)}</h3><p><strong>${esc(demo.tool)}</strong></p><p>${esc(demo.description)}</p><p class="bmfdc-expected"><strong>Ground truth:</strong> ${esc(demo.expected)}</p><div class="bmfdc-meta"><code data-bmfdc-integrity="${esc(demo.id)}">Computing file integrity…</code><span>Corpus ${DEMO_VERSION}</span></div><div class="bmfdc-actions"><button type="button" class="primary-action" data-bmfdc-open="${esc(demo.id)}">Open in ${esc(demo.tool)}</button><button type="button" class="secondary-action" data-bmfdc-save="${esc(demo.id)}">Save demonstration file</button></div></div></article>`).join('')}</div><div class="bmfdc-status" data-bmfdc-status>Demonstration files are generated deterministically and hashed before display or handoff.</div></div>`;
    root.document.body.appendChild(panel);
    panel.querySelectorAll('[data-bmfdc-close]').forEach(button => button.addEventListener('click', closePanel));
    panel.addEventListener('click', event => {
      const openButton = event.target.closest('[data-bmfdc-open]');
      if (openButton) {
        const id = openButton.dataset.bmfdcOpen;
        openButton.disabled = true;
        setStatus(`Loading ${demoById(id).downloadName} into its forensic workbench…`);
        void openInAppropriateTool(id).then(() => setStatus(`${demoById(id).downloadName} handed to ${demoById(id).tool}.`)).catch(error => setStatus(error.message)).finally(() => { openButton.disabled = false; });
        return;
      }
      const saveButton = event.target.closest('[data-bmfdc-save]');
      if (saveButton) {
        const id = saveButton.dataset.bmfdcSave;
        saveButton.disabled = true;
        void loadDemo(id).then(loaded => { downloadDemo(loaded); setStatus(`Saved ${loaded.demo.downloadName}.`); }).catch(error => setStatus(error.message)).finally(() => { saveButton.disabled = false; });
      }
    });
    return panel;
  }

  function openPanel() {
    const target = buildPanel();
    target.hidden = false;
    root.document.body.classList.add('bmfdc-open');
    for (const demo of DEMOS) void renderPreview(demo.id);
    return target;
  }

  function closePanel() {
    if (panel) panel.hidden = true;
    root?.document?.body?.classList.remove('bmfdc-open');
  }

  root.BinaryCubeMediaForensicsDemoCorpus = Object.freeze({
    openPanel,
    closePanel,
    loadDemo,
    openInAppropriateTool,
    buildDemoBytes,
    demos: DEMOS,
    constants: Object.freeze({ PANEL_ID, DEMO_VERSION, WIDTH, HEIGHT, RGB_LSB_PAYLOAD, AFSK_PAYLOAD, DTMF_PAYLOAD })
  });
})(typeof globalThis !== 'undefined' ? globalThis : this);
