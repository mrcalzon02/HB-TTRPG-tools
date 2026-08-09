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
assert.ok(browser, 'A Chromium-compatible browser is required for the V8 sequencing test.');
assert.ok(xvfb, 'Xvfb is required for the V8 sequencing test.');
assert.equal(typeof WebSocket, 'function', 'Node.js 22 or newer is required.');

const debuggingPort = 9980 + (process.pid % 15);
const display = `:${710 + (process.pid % 60)}`;
const profileDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'binary-cube-v8-browser-'));
const webServer = createServer((request, response) => {
  response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
  response.end('<!doctype html><html><head><meta charset="utf-8"><title>Binary Cube V8 Browser Validation</title></head><body><main><section id="shadowrun"></section></main></body></html>');
});
await new Promise((resolve, reject) => {
  webServer.once('error', reject);
  webServer.listen(0, '127.0.0.1', resolve);
});
const webAddress = webServer.address();
assert.ok(webAddress && typeof webAddress === 'object');
const pageUrl = `http://127.0.0.1:${webAddress.port}/`;
const xvfbProcess = spawn(xvfb, [display, '-screen', '0', '1280x900x24', '-nolisten', 'tcp'], { stdio: ['ignore', 'ignore', 'pipe'] });
let browserProcess;
let cdp;

try {
  await delay(350);
  browserProcess = spawn(browser, [
    '--no-sandbox',
    `--remote-debugging-port=${debuggingPort}`,
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

  const pages = await waitForJson(`http://127.0.0.1:${debuggingPort}/json/list`);
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
  })()`, 'Prepare V8 document');

  for (const filename of ['shadowrun-binary-cube-engine.js', 'binary-cube-visualizer-renderer.js', 'shadowrun-binary-cube-visualizer.js']) {
    const source = fs.readFileSync(path.join(repositoryRoot, filename), 'utf8');
    await evaluate(cdp, `${source}\n//# sourceURL=${filename}`, filename);
  }

  const receipt = await evaluate(cdp, `(async () => {
    const Visualizer = window.ShadowrunBinaryCubeVisualizer;
    const Engine = window.ShadowrunBinaryCubeEngine;
    const panel = Visualizer.openPanel();
    const canvas = panel.querySelector('[data-cube-visualizer-canvas]');
    const gl = canvas.getContext('webgl2');
    if (!gl) throw new Error('WebGL2 is unavailable.');

    const maskMode = panel.querySelector('[data-cube-visualizer-mask-mode]');
    maskMode.value = 'custom';
    maskMode.dispatchEvent(new Event('change', { bubbles: true }));
    const customMask = panel.querySelector('[data-cube-visualizer-custom-mask]');
    customMask.value = '1010101010101010';
    customMask.dispatchEvent(new Event('input', { bubbles: true }));
    panel.querySelector('[data-cube-visualizer-generate]').click();

    const sourceBits = Array.from({ length: 37 }, (_, index) => ((index * 5 + 3) % 7 < 3 ? '1' : '0')).join('');
    const sourceField = panel.querySelector('[data-cube-trace-bits]');
    sourceField.value = sourceBits;
    sourceField.dispatchEvent(new Event('input', { bubbles: true }));
    panel.querySelector('[data-cube-trace-build]').click();

    const initial = Visualizer.currentState();
    const originalCiphertext = initial.packageCiphertext;
    if (!initial.packageReady || !initial.roundTripValid || initial.packageBlockCount !== 5 || initial.traceCollectionCount !== 5) throw new Error('The V8 five-block package did not initialize.');
    if (panel.querySelectorAll('[data-cube-encoder-block-timeline] [data-cube-encoder-block-marker]').length !== 5) throw new Error('The compact block timeline is incomplete.');
    const finalMarker = panel.querySelector('[data-cube-encoder-block-marker="4"]');
    if (!finalMarker?.classList.contains('partial')) throw new Error('The final partial block is not marked.');
    if (!/partial payload filler/i.test(panel.querySelector('[data-cube-encoder-range-inspector]').textContent)) throw new Error('The selected-block range inspector does not report partial filler.');

    panel.querySelector('[data-cube-encoder-next-block]').click();
    if (Visualizer.currentState().selectedBlockIndex !== 1) throw new Error('Next-block navigation failed.');
    panel.querySelector('[data-cube-encoder-previous-block]').click();
    if (Visualizer.currentState().selectedBlockIndex !== 0) throw new Error('Previous-block navigation failed.');

    const sourceJumpInput = panel.querySelector('[data-cube-encoder-source-index]');
    sourceJumpInput.value = '17';
    panel.querySelector('[data-cube-encoder-source-jump]').click();
    const sourceJump = Visualizer.currentState();
    if (sourceJump.selectedBlockIndex !== 2 || sourceJump.selectedSourceBitIndex !== 17) throw new Error('Direct source-bit jump failed.');
    if (sourceJump.selectedFinalBit !== sourceBits[17]) throw new Error('Source-bit jump did not retain the exact bit value.');

    const ciphertextJumpInput = panel.querySelector('[data-cube-encoder-ciphertext-index]');
    ciphertextJumpInput.value = '35';
    panel.querySelector('[data-cube-encoder-ciphertext-jump]').click();
    const ciphertextJump = Visualizer.currentState();
    if (ciphertextJump.selectedBlockIndex !== 2 || ciphertextJump.selectedFinalOutputIndex !== 35) throw new Error('Direct ciphertext-bit jump failed.');
    if (ciphertextJump.selectedFinalBit !== originalCiphertext[35]) throw new Error('Ciphertext-bit jump did not retain the exact ciphertext bit.');

    const blockSelect = panel.querySelector('[data-cube-encoder-block]');
    const scope = panel.querySelector('[data-cube-trace-scope]');
    const speed = panel.querySelector('[data-cube-trace-speed]');
    const timeline = panel.querySelector('[data-cube-trace-timeline]');
    speed.value = '2';
    speed.dispatchEvent(new Event('change', { bubbles: true }));

    blockSelect.value = '0';
    blockSelect.dispatchEvent(new Event('change', { bubbles: true }));
    scope.value = 'all-blocks';
    scope.dispatchEvent(new Event('change', { bubbles: true }));
    timeline.value = '999';
    timeline.dispatchEvent(new Event('input', { bubbles: true }));
    panel.querySelector('[data-cube-trace-play]').click();
    await new Promise(resolve => setTimeout(resolve, 500));
    const allBlocks = Visualizer.currentState();
    if (allBlocks.selectedBlockIndex !== 1 || !allBlocks.tracePlaying || allBlocks.tracePlaybackScope !== 'all-blocks') throw new Error('Automatic forward block sequencing failed.');
    panel.querySelector('[data-cube-trace-pause]').click();

    blockSelect.value = '0';
    blockSelect.dispatchEvent(new Event('change', { bubbles: true }));
    scope.value = 'selected-block';
    scope.dispatchEvent(new Event('change', { bubbles: true }));
    timeline.value = '999';
    timeline.dispatchEvent(new Event('input', { bubbles: true }));
    panel.querySelector('[data-cube-trace-play]').click();
    await new Promise(resolve => setTimeout(resolve, 500));
    const selectedBlockOnly = Visualizer.currentState();
    if (selectedBlockOnly.selectedBlockIndex !== 0 || selectedBlockOnly.tracePlaying || selectedBlockOnly.traceTime !== 1) throw new Error('Selected-block scope crossed a block boundary.');

    blockSelect.value = '0';
    blockSelect.dispatchEvent(new Event('change', { bubbles: true }));
    scope.value = 'overview-only';
    scope.dispatchEvent(new Event('change', { bubbles: true }));
    timeline.value = '999';
    timeline.dispatchEvent(new Event('input', { bubbles: true }));
    panel.querySelector('[data-cube-trace-play]').click();
    await new Promise(resolve => setTimeout(resolve, 500));
    const overview = Visualizer.currentState();
    if (overview.selectedBlockIndex !== 1 || overview.tracePlaybackScope !== 'overview-only' || !overview.tracePlaying) throw new Error('Overview-only block sequencing failed.');
    panel.querySelector('[data-cube-trace-pause]').click();

    blockSelect.value = '1';
    blockSelect.dispatchEvent(new Event('change', { bubbles: true }));
    scope.value = 'all-blocks';
    scope.dispatchEvent(new Event('change', { bubbles: true }));
    timeline.value = '0';
    timeline.dispatchEvent(new Event('input', { bubbles: true }));
    panel.querySelector('[data-cube-trace-reverse-play]').click();
    await new Promise(resolve => setTimeout(resolve, 500));
    const reverse = Visualizer.currentState();
    if (reverse.selectedBlockIndex !== 0 || !reverse.tracePlaying || reverse.tracePlaybackDirection !== -1) throw new Error('Automatic reverse block sequencing failed: ' + JSON.stringify(reverse));
    panel.querySelector('[data-cube-trace-pause]').click();

    blockSelect.value = '4';
    blockSelect.dispatchEvent(new Event('change', { bubbles: true }));
    const finalState = Visualizer.currentState();
    if (!finalState.selectedBlockFinalPartial || finalState.selectedBlockSourceBitsConsumed !== 5 || finalState.selectedBlockPartialPayloadFillerCells !== 3 || finalState.selectedBlockTotalFillerCells !== 11) throw new Error('Final partial-block accounting failed.');
    if (finalState.packageCiphertext !== originalCiphertext || JSON.stringify(JSON.parse(panel.querySelector('[data-cube-encoder-package]').value).ciphertext) !== JSON.stringify(originalCiphertext)) throw new Error('Sequencing or inspection mutated the package ciphertext.');
    if (panel.querySelectorAll('.cube-trace-cell.partial-filler').length < 3) throw new Error('Partial filler cells are not visibly distinguished.');

    const key = JSON.parse(panel.querySelector('[data-cube-visualizer-key]').value);
    const packageObject = JSON.parse(panel.querySelector('[data-cube-encoder-package]').value);
    if (Engine.decryptBinary(packageObject, key) !== sourceBits) throw new Error('V8 sequencing changed canonical package recovery.');

    return {
      format: 'hb-ttrpg-shadowrun-binary-cube-v8-browser-validation-receipt',
      schemaVersion: '0.2.0',
      pass: true,
      rendererVersion: finalState.rendererVersion,
      webglVersion: gl.getParameter(gl.VERSION),
      blockCount: finalState.packageBlockCount,
      timelineMarkerCount: panel.querySelectorAll('[data-cube-encoder-block-marker]').length,
      directSourceJump: true,
      directCiphertextJump: true,
      forwardAllBlockPlayback: true,
      reverseAllBlockPlayback: true,
      selectedBlockBoundary: true,
      overviewPlayback: true,
      finalPartialBlock: true,
      partialPayloadFillerCells: finalState.selectedBlockPartialPayloadFillerCells,
      maskFillerCells: finalState.selectedBlockMaskFillerCells,
      totalFillerCells: finalState.selectedBlockTotalFillerCells,
      exactPackageStateVisibleAndUnchanged: true
    };
  })()`, 'Binary Cube V8 browser sequencing');

  assert.equal(receipt.pass, true);
  assert.equal(receipt.rendererVersion, '0.6.0');
  assert.equal(receipt.blockCount, 5);
  assert.equal(receipt.timelineMarkerCount, 5);
  assert.equal(receipt.directSourceJump, true);
  assert.equal(receipt.directCiphertextJump, true);
  assert.equal(receipt.forwardAllBlockPlayback, true);
  assert.equal(receipt.reverseAllBlockPlayback, true);
  assert.equal(receipt.selectedBlockBoundary, true);
  assert.equal(receipt.overviewPlayback, true);
  assert.equal(receipt.finalPartialBlock, true);
  assert.equal(receipt.partialPayloadFillerCells, 3);
  assert.equal(receipt.maskFillerCells, 8);
  assert.equal(receipt.totalFillerCells, 11);
  assert.equal(receipt.exactPackageStateVisibleAndUnchanged, true);
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
