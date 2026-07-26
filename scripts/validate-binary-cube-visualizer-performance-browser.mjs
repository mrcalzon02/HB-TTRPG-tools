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
async function waitForJson(url, attempts = 180) {
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
function waitForExit(handle, timeoutMilliseconds = 3000) {
  if (!handle || handle.exitCode !== null || handle.signalCode !== null) return Promise.resolve();
  return new Promise(resolve => {
    let settled = false;
    let timer = null;
    const finish = () => {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      resolve();
    };
    timer = setTimeout(finish, timeoutMilliseconds);
    handle.once('exit', finish);
  });
}
async function removeDirectoryWithRetries(directory, attempts = 20) {
  let lastError;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      fs.rmSync(directory, { recursive: true, force: true });
      return;
    } catch (error) {
      lastError = error;
      if (!['ENOTEMPTY', 'EBUSY', 'EPERM'].includes(error?.code)) throw error;
      await delay(100);
    }
  }
  throw lastError;
}

const browser = findCommand(browserCandidates);
const xvfb = findCommand(['Xvfb']);
assert.ok(browser, 'A Chromium-compatible browser is required for the V9 performance test.');
assert.ok(xvfb, 'Xvfb is required for the V9 performance test.');
assert.equal(typeof WebSocket, 'function', 'Node.js 22 or newer is required.');

const debuggingPort = 10020 + (process.pid % 17);
const display = `:${780 + (process.pid % 60)}`;
const profileDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'binary-cube-v9-browser-'));
const webServer = createServer((request, response) => {
  response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
  response.end('<!doctype html><html><head><meta charset="utf-8"><title>Binary Cube V9 Browser Validation</title></head><body><main><section id="shadowrun"></section></main></body></html>');
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
  })()`, 'Prepare V9 document');

  for (const filename of ['shadowrun-binary-cube-engine.js', 'binary-cube-visualizer-renderer.js', 'shadowrun-binary-cube-visualizer.js']) {
    const source = fs.readFileSync(path.join(repositoryRoot, filename), 'utf8');
    await evaluate(cdp, `${source}\n//# sourceURL=${filename}`, filename);
  }

  const receipt = await evaluate(cdp, `(async () => {
    const Visualizer = window.ShadowrunBinaryCubeVisualizer;
    const panel = Visualizer.openPanel();
    const canvas = panel.querySelector('[data-cube-visualizer-canvas]');
    const gl = canvas.getContext('webgl2');
    if (!gl) throw new Error('WebGL2 is unavailable.');
    const waitForState = async (predicate, label, attempts = 240) => {
      for (let attempt = 0; attempt < attempts; attempt += 1) {
        const state = Visualizer.currentState();
        if (predicate(state)) return state;
        await new Promise(resolve => setTimeout(resolve, 25));
      }
      throw new Error(label + ': ' + JSON.stringify(Visualizer.currentState()));
    };

    const initial = Visualizer.currentState();
    if (initial.rendererVersion !== '0.5.0' || initial.renderTier !== 'detailed' || initial.renderedPointCount !== 16 || initial.exactPointCount !== 16) throw new Error('The detailed V9 tier did not initialize.');

    const size = panel.querySelector('[data-cube-visualizer-size]');
    size.value = '128';
    panel.querySelector('[data-cube-visualizer-generate]').click();
    const sampled = await waitForState(state => state.gridSize === 128 && !state.scenePreparing && !state.tracePreparing && state.traceReady, 'The 128-grid sampled scene and trace did not settle.');
    if (sampled.renderTier !== 'sampled' || sampled.renderedPointCount !== 8192 || sampled.exactPointCount !== 16384) throw new Error('Automatic sampled tier counts are incorrect: ' + JSON.stringify(sampled));
    if (sampled.traceRenderedPointCount !== 8192 || sampled.traceExactPointCount !== 16384) throw new Error('The sampled trace did not preserve exact point counts.');
    if (panel.querySelectorAll('.cube-trace-cell').length !== 0) throw new Error('The medium-grid trace expanded one DOM cell per point.');
    if (!/sampled trace/i.test(panel.querySelector('[data-cube-trace-representation-notice]').textContent)) throw new Error('The medium-grid sampled trace disclosure is missing.');
    if (!/8,192 of 16,384 exact points/i.test(panel.querySelector('[data-cube-visualizer-representation-notice]').textContent)) throw new Error('The sampled scene disclosure is missing.');
    const originalCiphertext = sampled.packageCiphertext;
    const originalChecksum = sampled.packageChecksum;

    const pointInput = panel.querySelector('[data-cube-trace-point-id]');
    pointInput.value = '12345';
    panel.querySelector('[data-cube-trace-select-point]').click();
    const selected = Visualizer.currentState();
    if (selected.selectedPointId !== 12345 || !Array.isArray(selected.selectedAnimatedPosition)) throw new Error('The selected point was not retained in the sampled trace.');

    const quality = panel.querySelector('[data-cube-visualizer-render-quality]');
    quality.value = 'aggregate';
    quality.dispatchEvent(new Event('change', { bubbles: true }));
    const aggregate = await waitForState(state => state.gridSize === 128 && !state.scenePreparing && state.renderTier === 'aggregate' && state.renderedPointCount === 2048 && state.traceRenderedPointCount === 2048, 'The aggregate quality change did not settle.');
    if (aggregate.packageCiphertext !== originalCiphertext || aggregate.packageChecksum !== originalChecksum || !aggregate.roundTripValid) throw new Error('Rendering quality mutated canonical package state.');
    if (aggregate.pointBufferBytes !== 2048 * 6 * 4) throw new Error('Aggregate point-buffer accounting is incorrect.');
    if (!/aggregate representation/i.test(panel.querySelector('[data-cube-visualizer-representation-notice]').textContent)) throw new Error('Aggregate representation disclosure is missing.');

    size.value = '256';
    panel.querySelector('[data-cube-visualizer-generate]').click();
    panel.querySelector('[data-cube-visualizer-cancel-preparation]').click();
    const cancelled = await waitForState(state => state.gridSize === 256 && !state.scenePreparing && !state.tracePreparing && state.cancelledPreparations >= 1, 'Pending V9 preparation did not cancel.');
    if (!cancelled.packageReady || !cancelled.roundTripValid || cancelled.packageOriginalBitLength !== 32) throw new Error('Cancellation discarded canonical package state.');

    return {
      format: 'hb-ttrpg-shadowrun-binary-cube-v9-browser-validation-receipt',
      schemaVersion: '0.1.0',
      pass: true,
      rendererVersion: aggregate.rendererVersion,
      webglVersion: gl.getParameter(gl.VERSION),
      sampledGridSize: 128,
      sampledExactPointCount: sampled.exactPointCount,
      sampledRenderedPointCount: sampled.renderedPointCount,
      aggregateRenderedPointCount: aggregate.renderedPointCount,
      aggregatePointBufferBytes: aggregate.pointBufferBytes,
      sampledTraceWithoutDomExpansion: true,
      selectedPointRetained: true,
      renderingQualityIndependentFromPackage: true,
      cancellationRetainedPackageState: true,
      cancelledPreparations: cancelled.cancelledPreparations,
      sceneBuildMilliseconds: sampled.sceneBuildMilliseconds,
      traceBuildMilliseconds: sampled.traceBuildMilliseconds,
      encodingMilliseconds: sampled.encodingMilliseconds
    };
  })()`, 'Binary Cube V9 browser performance');

  assert.equal(receipt.pass, true);
  assert.equal(receipt.rendererVersion, '0.5.0');
  assert.equal(receipt.sampledGridSize, 128);
  assert.equal(receipt.sampledExactPointCount, 16384);
  assert.equal(receipt.sampledRenderedPointCount, 8192);
  assert.equal(receipt.aggregateRenderedPointCount, 2048);
  assert.equal(receipt.aggregatePointBufferBytes, 49152);
  assert.equal(receipt.sampledTraceWithoutDomExpansion, true);
  assert.equal(receipt.selectedPointRetained, true);
  assert.equal(receipt.renderingQualityIndependentFromPackage, true);
  assert.equal(receipt.cancellationRetainedPackageState, true);
  assert.ok(receipt.cancelledPreparations >= 1);
  assert.match(receipt.webglVersion, /WebGL 2\.0/);
  assert.ok(receipt.sceneBuildMilliseconds >= 0);
  assert.ok(receipt.traceBuildMilliseconds >= 0);
  assert.ok(receipt.encodingMilliseconds >= 0);
  console.log(JSON.stringify(receipt, null, 2));
} finally {
  cdp?.close();
  terminate(browserProcess);
  terminate(xvfbProcess);
  await Promise.all([waitForExit(browserProcess), waitForExit(xvfbProcess)]);
  await new Promise(resolve => webServer.close(resolve));
  await removeDirectoryWithRetries(profileDirectory);
}
