#!/usr/bin/env node

import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createServer } from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, '..');
const browserCandidates = [process.env.BINARY_CUBE_BROWSER, 'google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser'].filter(Boolean);

function findCommand(candidates) {
  for (const candidate of candidates) {
    if (candidate.includes(path.sep) && fs.existsSync(candidate)) return candidate;
    const result = spawnSync('sh', ['-lc', `command -v ${JSON.stringify(candidate)}`], { encoding: 'utf8' });
    if (result.status === 0 && result.stdout.trim()) return result.stdout.trim();
  }
  return null;
}
function delay(milliseconds) { return new Promise(resolve => setTimeout(resolve, milliseconds)); }
async function waitForJson(url, attempts = 160) {
  let lastError;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const response = await fetch(url);
      if (response.ok) return response.json();
      lastError = new Error(`${url} returned HTTP ${response.status}.`);
    } catch (error) { lastError = error; }
    await delay(100);
  }
  throw lastError || new Error(`Timed out waiting for ${url}.`);
}
function connectCdp(webSocketUrl) {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(webSocketUrl);
    let sequence = 0;
    const pending = new Map();
    socket.addEventListener('open', () => resolve({
      call(method, params = {}) {
        const id = ++sequence;
        return new Promise((resolveCall, rejectCall) => {
          pending.set(id, { resolve: resolveCall, reject: rejectCall });
          socket.send(JSON.stringify({ id, method, params }));
        });
      },
      close() { socket.close(); }
    }), { once: true });
    socket.addEventListener('message', event => {
      const message = JSON.parse(String(event.data));
      if (!message.id || !pending.has(message.id)) return;
      const request = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) request.reject(new Error(`${message.error.message || 'CDP error'} (${message.error.code || 'unknown'})`));
      else request.resolve(message.result);
    });
    socket.addEventListener('error', () => reject(new Error('Could not connect to Chromium DevTools.')), { once: true });
    socket.addEventListener('close', () => {
      for (const request of pending.values()) request.reject(new Error('Chromium DevTools connection closed before completing a request.'));
      pending.clear();
    });
  });
}
async function evaluate(cdp, expression, label) {
  const result = await cdp.call('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (result.exceptionDetails) throw new Error(`${label} failed: ${result.result?.description || result.exceptionDetails.text || 'unknown browser exception'}`);
  return result.result?.value;
}
function terminate(handle) {
  if (handle && !handle.killed) {
    try { handle.kill('SIGTERM'); } catch (_) { /* Best-effort cleanup. */ }
  }
}

const browser = findCommand(browserCandidates);
const xvfb = findCommand(['Xvfb']);
assert.ok(browser, 'A Chromium-compatible browser is required for the V7 encoder test.');
assert.ok(xvfb, 'Xvfb is required for the V7 encoder test.');
assert.equal(typeof WebSocket, 'function', 'Node.js 22 or newer is required.');

const port = 9900 + (process.pid % 90);
const display = `:${630 + (process.pid % 80)}`;
const profileDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'binary-cube-v7-browser-'));
const webServer = createServer((request, response) => {
  response.writeHead(200, {
    'Content-Type': 'text/html; charset=utf-8',
    'Cache-Control': 'no-store'
  });
  response.end('<!doctype html><html><head><meta charset="utf-8"><title>Binary Cube V7 Browser Validation</title></head><body><main><section id="shadowrun"></section></main></body></html>');
});
await new Promise((resolve, reject) => {
  webServer.once('error', reject);
  webServer.listen(0, '127.0.0.1', resolve);
});
const webAddress = webServer.address();
assert.ok(webAddress && typeof webAddress === 'object', 'The V7 browser validation server did not expose a localhost address.');
const pageUrl = `http://127.0.0.1:${webAddress.port}/`;
const xvfbProcess = spawn(xvfb, [display, '-screen', '0', '1280x900x24', '-nolisten', 'tcp'], { stdio: ['ignore', 'ignore', 'pipe'] });
let browserProcess;
let cdp;

try {
  await delay(350);
  browserProcess = spawn(browser, [
    '--no-sandbox',
    `--remote-debugging-port=${port}`,
    '--remote-allow-origins=*',
    `--user-data-dir=${profileDirectory}`,
    '--use-gl=angle',
    '--use-angle=swiftshader',
    '--enable-webgl',
    '--enable-unsafe-swiftshader',
    '--ignore-gpu-blocklist',
    '--disable-dev-shm-usage',
    '--disable-background-networking',
    '--disable-component-update',
    '--disable-default-apps',
    '--disable-extensions',
    '--no-first-run',
    pageUrl
  ], { env: { ...process.env, DISPLAY: display }, stdio: ['ignore', 'ignore', 'pipe'] });

  const pages = await waitForJson(`http://127.0.0.1:${port}/json/list`);
  const page = pages.find(candidate => candidate.type === 'page');
  assert.ok(page?.webSocketDebuggerUrl);
  cdp = await connectCdp(page.webSocketDebuggerUrl);
  await cdp.call('Runtime.enable');
  await cdp.call('Page.enable');
  await cdp.call('Page.navigate', { url: pageUrl });
  await delay(100);

  await evaluate(cdp, `(() => {
    document.body.innerHTML = '<main><section id="shadowrun"></section></main>';
    const styleNode = document.createElement('style');
    styleNode.textContent = 'body{margin:0;background:#050b13;color:white}.cube-visualizer-scene-shell{position:relative;width:800px;height:600px}.cube-visualizer-canvas{display:block;width:800px;height:600px}.cube-visualizer-label-layer{position:absolute;inset:0}.cube-visualizer-face-label,.cube-visualizer-axis-label,.cube-visualizer-direction-label,.cube-visualizer-phase-label{position:absolute}.cube-trace-stage[hidden],.cube-custom-mask-field[hidden]{display:none}';
    document.head.appendChild(styleNode);
    localStorage.clear();
  })()`, 'Prepare V7 document');

  for (const filename of ['shadowrun-binary-cube-engine.js', 'binary-cube-visualizer-renderer.js', 'shadowrun-binary-cube-visualizer.js', 'shadowrun-binary-cube-encryption.js']) {
    const source = fs.readFileSync(path.join(repositoryRoot, filename), 'utf8');
    await evaluate(cdp, `${source}\n//# sourceURL=${filename}`, filename);
  }

  const receipt = await evaluate(cdp, `(async () => {
    const Visualizer = window.ShadowrunBinaryCubeVisualizer;
    const Laboratory = window.ShadowrunBinaryCubeEncryption;
    const Engine = window.ShadowrunBinaryCubeEngine;
    const panel = Visualizer.openPanel();
    const canvas = panel.querySelector('[data-cube-visualizer-canvas]');
    const gl = canvas.getContext('webgl2');
    if (!gl) throw new Error('WebGL2 is unavailable.');

    const initial = Visualizer.currentState();
    if (!initial.packageReady || !initial.roundTripValid || initial.packageBlockCount !== 2 || initial.traceCollectionCount !== 2 || initial.selectedBlockIndex !== 0) throw new Error('The V7 default package did not initialize with two verified traces.');
    const initialKey = JSON.parse(panel.querySelector('[data-cube-visualizer-key]').value);
    const initialBits = panel.querySelector('[data-cube-trace-bits]').value.replace(/\\s+/g, '');
    const initialPackage = JSON.parse(panel.querySelector('[data-cube-encoder-package]').value);
    const expectedInitial = Engine.encryptBinary(initialBits, initialKey);
    if (JSON.stringify(initialPackage) !== JSON.stringify(expectedInitial)) throw new Error('The default visualizer package differs from canonical engine output.');
    if (Engine.decryptBinary(initialPackage, initialKey) !== initialBits) throw new Error('The default package did not decrypt to its source bits.');

    const maskMode = panel.querySelector('[data-cube-visualizer-mask-mode]');
    maskMode.value = 'custom';
    maskMode.dispatchEvent(new Event('change', { bubbles: true }));
    const customMask = panel.querySelector('[data-cube-visualizer-custom-mask]');
    customMask.value = '1010101010101010';
    customMask.dispatchEvent(new Event('input', { bubbles: true }));
    panel.querySelector('[data-cube-visualizer-generate]').click();

    const sourceBits = '11100010101101011001';
    const sourceField = panel.querySelector('[data-cube-trace-bits]');
    sourceField.value = sourceBits;
    sourceField.dispatchEvent(new Event('input', { bubbles: true }));
    panel.querySelector('[data-cube-trace-build]').click();
    const customState = Visualizer.currentState();
    if (!customState.packageReady || !customState.roundTripValid || customState.payloadCapacity !== 8 || customState.packageBlockCount !== 3 || customState.traceCollectionCount !== 3) throw new Error('Custom-mask multi-block package generation failed.');
    const customKey = JSON.parse(panel.querySelector('[data-cube-visualizer-key]').value);
    const customPackage = JSON.parse(panel.querySelector('[data-cube-encoder-package]').value);
    const expectedCustom = Engine.encryptBinary(sourceBits, customKey);
    if (JSON.stringify(customPackage) !== JSON.stringify(expectedCustom)) throw new Error('Custom-mask visualizer package differs from canonical engine output.');
    if (panel.querySelectorAll('[data-cube-encoder-block] option').length !== 3) throw new Error('The package block selector does not contain all traces.');

    const blockSelect = panel.querySelector('[data-cube-encoder-block]');
    blockSelect.value = '1';
    blockSelect.dispatchEvent(new Event('change', { bubbles: true }));
    const blockState = Visualizer.currentState();
    if (blockState.selectedBlockIndex !== 1 || blockState.traceBlockIndex !== 1) throw new Error('Selected package block did not become the active trace.');
    if (blockState.traceOutputBlock !== customPackage.ciphertext.slice(16, 32)) throw new Error('Selected block trace differs from its ciphertext slice.');
    if (blockState.selectedFinalOutputIndex < 16 || blockState.selectedFinalOutputIndex >= 32) throw new Error('Selected point does not report a package-global ciphertext index.');

    panel.querySelector('[data-cube-encoder-decrypt]').click();
    const decryptedState = Visualizer.currentState();
    if (!decryptedState.roundTripValid || decryptedState.recoveredBits !== sourceBits) throw new Error('Decrypt and exact package round-trip validation failed.');
    panel.querySelector('[data-cube-encoder-validate]').click();
    if (!/validated/i.test(panel.querySelector('[data-cube-visualizer-status]').textContent)) throw new Error('Full package validation status was not reported.');

    const fileInput = panel.querySelector('[data-cube-encoder-file]');
    const transfer = new DataTransfer();
    transfer.items.add(new File([new Uint8Array([0, 255, 65])], 'sample.bin', { type: 'application/octet-stream' }));
    Object.defineProperty(fileInput, 'files', { configurable: true, value: transfer.files });
    fileInput.dispatchEvent(new Event('change', { bubbles: true }));
    await new Promise(resolve => setTimeout(resolve, 40));
    const fileBits = '000000001111111101000001';
    if (sourceField.value !== fileBits || Visualizer.currentState().sourceFileName !== 'sample.bin') throw new Error('File bytes were not converted into exact binary input.');
    panel.querySelector('[data-cube-trace-build]').click();
    const fileState = Visualizer.currentState();
    const fileKey = JSON.parse(panel.querySelector('[data-cube-visualizer-key]').value);
    const filePackage = JSON.parse(panel.querySelector('[data-cube-encoder-package]').value);
    if (!fileState.roundTripValid || fileState.recoveredBits !== fileBits || JSON.stringify(filePackage) !== JSON.stringify(Engine.encryptBinary(fileBits, fileKey))) throw new Error('File-derived package parity failed.');

    const visualizerArtifacts = Visualizer.currentArtifacts();
    const loadedLaboratory = Laboratory.loadArtifacts(visualizerArtifacts);
    const labPanel = document.getElementById('shadowrun-binary-cube-lab');
    if (!labPanel || labPanel.hidden) throw new Error('Visualizer-to-laboratory artifact handoff did not open the laboratory.');
    if (labPanel.querySelector('#cube-input').value !== fileBits) throw new Error('Laboratory source bits differ after handoff.');
    if (labPanel.querySelector('#cube-key').value.trim() !== JSON.stringify(visualizerArtifacts.key, null, 2)) throw new Error('Laboratory key differs after handoff.');
    if (labPanel.querySelector('#cube-package').value.trim() !== JSON.stringify(visualizerArtifacts.packageObject, null, 2)) throw new Error('Laboratory package differs after handoff.');
    if (loadedLaboratory.recoveredBits !== fileBits) throw new Error('Laboratory did not recover the handed-off package.');

    const laboratoryBits = '1010101000111100';
    labPanel.querySelector('#cube-input').value = laboratoryBits;
    labPanel.querySelector('[data-cube-encrypt]').click();
    const laboratoryArtifacts = Laboratory.currentArtifacts();
    if (!laboratoryArtifacts.packageObject || Engine.decryptBinary(laboratoryArtifacts.packageObject, laboratoryArtifacts.key) !== laboratoryBits) throw new Error('Laboratory did not generate a canonical handoff package.');
    Visualizer.loadArtifacts(laboratoryArtifacts);
    const returnedState = Visualizer.currentState();
    if (!returnedState.packageReady || !returnedState.roundTripValid || returnedState.recoveredBits !== laboratoryBits) throw new Error('Laboratory-to-visualizer artifact loading failed.');
    if (returnedState.packageChecksum !== laboratoryArtifacts.packageObject.checksum) throw new Error('Package checksum changed during laboratory-to-visualizer transfer.');

    const packageFileInput = panel.querySelector('[data-cube-encoder-import-package]');
    const packageTransfer = new DataTransfer();
    packageTransfer.items.add(new File([JSON.stringify(laboratoryArtifacts.packageObject)], 'package.json', { type: 'application/json' }));
    Object.defineProperty(packageFileInput, 'files', { configurable: true, value: packageTransfer.files });
    packageFileInput.dispatchEvent(new Event('change', { bubbles: true }));
    await new Promise(resolve => setTimeout(resolve, 40));
    if (!Visualizer.currentState().roundTripValid) throw new Error('Package-file import did not retain exact round-trip validity.');

    maskMode.value = '1';
    maskMode.dispatchEvent(new Event('change', { bubbles: true }));
    const sizeSelect = panel.querySelector('[data-cube-visualizer-size]');
    sizeSelect.value = '20';
    panel.querySelector('[data-cube-visualizer-generate]').click();
    const largeState = Visualizer.currentState();
    if (largeState.gridSize !== 20 || !largeState.packageReady || !largeState.roundTripValid || !largeState.traceReady || largeState.traceCollectionCount !== largeState.packageBlockCount || largeState.renderTier !== 'batched' || largeState.exactPointCount !== 400 || largeState.renderedPointCount !== 400 || largeState.traceExactPointCount !== 400 || largeState.traceRenderedPointCount !== 400) throw new Error('The V7 large-grid package/exact-batched boundary failed: ' + JSON.stringify(largeState));
    if (panel.querySelectorAll('.cube-trace-cell').length !== 0) throw new Error('The 20 × 20 package trace expanded one document cell per point.');

    return {
      format: 'hb-ttrpg-shadowrun-binary-cube-v7-browser-validation-receipt',
      schemaVersion: '0.3.0',
      pass: true,
      rendererVersion: returnedState.rendererVersion,
      webglVersion: gl.getParameter(gl.VERSION),
      canvasWidth: canvas.width,
      canvasHeight: canvas.height,
      defaultBlockCount: initial.packageBlockCount,
      customMaskPayloadCapacity: customState.payloadCapacity,
      customMaskBlockCount: customState.packageBlockCount,
      exactCanonicalPackageParity: true,
      allBlockTraceCollection: true,
      selectedBlockCiphertextMatch: true,
      packageGlobalPointIndex: true,
      exactDecryptReencryptRoundTrip: true,
      fileByteConversion: true,
      packageFileImport: true,
      visualizerToLaboratoryHandoff: true,
      laboratoryToVisualizerHandoff: true,
      exactBatchedLargeGridTrace: true,
      storageCapableLocalhostOrigin: true
    };
  })()`, 'Binary Cube V7 browser encoder');

  assert.equal(receipt.pass, true);
  assert.equal(receipt.rendererVersion, '0.5.0');
  assert.equal(receipt.canvasWidth, 800);
  assert.equal(receipt.canvasHeight, 600);
  assert.equal(receipt.defaultBlockCount, 2);
  assert.equal(receipt.customMaskPayloadCapacity, 8);
  assert.equal(receipt.customMaskBlockCount, 3);
  assert.equal(receipt.exactCanonicalPackageParity, true);
  assert.equal(receipt.allBlockTraceCollection, true);
  assert.equal(receipt.selectedBlockCiphertextMatch, true);
  assert.equal(receipt.packageGlobalPointIndex, true);
  assert.equal(receipt.exactDecryptReencryptRoundTrip, true);
  assert.equal(receipt.fileByteConversion, true);
  assert.equal(receipt.packageFileImport, true);
  assert.equal(receipt.visualizerToLaboratoryHandoff, true);
  assert.equal(receipt.laboratoryToVisualizerHandoff, true);
  assert.equal(receipt.exactBatchedLargeGridTrace, true);
  assert.equal(receipt.storageCapableLocalhostOrigin, true);
  assert.match(receipt.webglVersion, /WebGL 2\.0/);
  console.log(JSON.stringify(receipt, null, 2));
} finally {
  cdp?.close();
  terminate(browserProcess);
  terminate(xvfbProcess);
  await new Promise(resolve => webServer.close(resolve));
  await delay(200);
  fs.rmSync(profileDirectory, { recursive: true, force: true });
}
