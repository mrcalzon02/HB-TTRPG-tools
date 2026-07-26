#!/usr/bin/env node

import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, '..');
const browserCandidates = [
  process.env.BINARY_CUBE_BROWSER,
  'google-chrome',
  'google-chrome-stable',
  'chromium',
  'chromium-browser'
].filter(Boolean);

function findCommand(candidates) {
  for (const candidate of candidates) {
    if (candidate.includes(path.sep) && fs.existsSync(candidate)) return candidate;
    const result = spawnSync('sh', ['-lc', `command -v ${JSON.stringify(candidate)}`], { encoding: 'utf8' });
    if (result.status === 0 && result.stdout.trim()) return result.stdout.trim();
  }
  return null;
}

function delay(milliseconds) {
  return new Promise(resolve => setTimeout(resolve, milliseconds));
}

async function waitForJson(url, attempts = 160) {
  let lastError;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const response = await fetch(url);
      if (response.ok) return response.json();
      lastError = new Error(`${url} returned HTTP ${response.status}.`);
    } catch (error) {
      lastError = error;
    }
    await delay(100);
  }
  throw lastError || new Error(`Timed out waiting for ${url}.`);
}

function connectCdp(webSocketUrl) {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(webSocketUrl);
    let sequence = 0;
    const pending = new Map();
    socket.addEventListener('open', () => {
      resolve({
        call(method, params = {}) {
          sequence += 1;
          const id = sequence;
          return new Promise((resolveCall, rejectCall) => {
            pending.set(id, { resolve: resolveCall, reject: rejectCall });
            socket.send(JSON.stringify({ id, method, params }));
          });
        },
        close() { socket.close(); }
      });
    }, { once: true });
    socket.addEventListener('message', event => {
      const message = JSON.parse(String(event.data));
      if (!message.id || !pending.has(message.id)) return;
      const request = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) request.reject(new Error(`${message.error.message || 'CDP error'} (${message.error.code || 'unknown'})`));
      else request.resolve(message.result);
    });
    socket.addEventListener('error', () => reject(new Error('Could not connect to the Chromium DevTools endpoint.')), { once: true });
    socket.addEventListener('close', () => {
      for (const request of pending.values()) request.reject(new Error('Chromium DevTools connection closed before completing a request.'));
      pending.clear();
    });
  });
}

async function evaluate(cdp, expression, label) {
  const result = await cdp.call('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (result.exceptionDetails) {
    const description = result.result?.description || result.exceptionDetails.text || 'Unknown browser exception.';
    throw new Error(`${label} failed in Chromium: ${description}`);
  }
  return result.result?.value;
}

function terminate(processHandle) {
  if (!processHandle || processHandle.killed) return;
  try { processHandle.kill('SIGTERM'); } catch (_) { /* Best-effort cleanup. */ }
}

const browser = findCommand(browserCandidates);
const xvfb = findCommand(['Xvfb']);
assert.ok(browser, 'A Chromium-compatible browser is required for the V5 WebGL stepping test.');
assert.ok(xvfb, 'Xvfb is required for the V5 WebGL stepping test.');
assert.equal(typeof WebSocket, 'function', 'Node.js 22 or newer is required for the browser validator.');

const port = 9500 + (process.pid % 300);
const displayNumber = 330 + (process.pid % 200);
const display = `:${displayNumber}`;
const profileDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'binary-cube-v5-browser-'));
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
    'about:blank'
  ], {
    env: { ...process.env, DISPLAY: display },
    stdio: ['ignore', 'ignore', 'pipe']
  });

  const pages = await waitForJson(`http://127.0.0.1:${port}/json/list`);
  const page = pages.find(candidate => candidate.type === 'page');
  assert.ok(page?.webSocketDebuggerUrl, 'Chromium did not expose a page DevTools endpoint.');
  cdp = await connectCdp(page.webSocketDebuggerUrl);
  await cdp.call('Runtime.enable');

  for (const filename of [
    'shadowrun-binary-cube-engine.js',
    'binary-cube-visualizer-renderer.js',
    'shadowrun-binary-cube-visualizer.js'
  ]) {
    const source = fs.readFileSync(path.join(repositoryRoot, filename), 'utf8');
    await evaluate(cdp, `${source}\n//# sourceURL=${filename}`, filename);
  }

  const receipt = await evaluate(cdp, `(() => {
    document.body.innerHTML = '<main><section id="shadowrun"></section></main>';
    const styleNode = document.createElement('style');
    styleNode.textContent = 'body{margin:0;background:#050b13;color:white}.cube-visualizer-scene-shell{position:relative;width:800px;height:600px}.cube-visualizer-canvas{display:block;width:800px;height:600px}.cube-visualizer-label-layer{position:absolute;inset:0}.cube-visualizer-face-label,.cube-visualizer-axis-label,.cube-visualizer-direction-label,.cube-visualizer-phase-label{position:absolute}.cube-trace-stage[hidden]{display:none}';
    document.head.appendChild(styleNode);

    const panel = window.ShadowrunBinaryCubeVisualizer.openPanel();
    const canvas = panel.querySelector('[data-cube-visualizer-canvas]');
    const gl = canvas.getContext('webgl2');
    if (!gl) throw new Error('WebGL2 is unavailable.');

    const initial = window.ShadowrunBinaryCubeVisualizer.currentState();
    if (!initial.traceReady || initial.tracePhaseIndex !== 0 || initial.tracePhaseId !== 'source-ready' || initial.tracePhaseCount !== 10) throw new Error('The canonical V5 trace did not initialize at phase 1.');
    if (initial.rendererVersion !== '0.3.0') throw new Error('The V5 renderer version is incorrect.');

    const key = JSON.parse(panel.querySelector('[data-cube-visualizer-key]').value);
    const bits = panel.querySelector('[data-cube-trace-bits]').value.replace(/\\s+/g, '');
    const canonicalTrace = window.ShadowrunBinaryCubeEngine.traceEncryptBlock(bits, key, 0);
    window.ShadowrunBinaryCubeEngine.validateTransformationTrace(canonicalTrace, key);
    if (initial.traceOutputBlock !== canonicalTrace.outputBlock) throw new Error('The visible trace output does not match the canonical engine trace.');

    panel.querySelector('[data-cube-trace-next]').click();
    let stepped = window.ShadowrunBinaryCubeVisualizer.currentState();
    if (stepped.tracePhaseIndex !== 1 || stepped.tracePhaseId !== 'block-framed') throw new Error('Next-phase control failed.');
    panel.querySelector('[data-cube-trace-last]').click();
    stepped = window.ShadowrunBinaryCubeVisualizer.currentState();
    if (stepped.tracePhaseIndex !== 9 || stepped.tracePhaseId !== 'block-complete') throw new Error('Last-phase control failed.');
    panel.querySelector('[data-cube-trace-previous]').click();
    stepped = window.ShadowrunBinaryCubeVisualizer.currentState();
    if (stepped.tracePhaseIndex !== 8 || stepped.tracePhaseId !== 'encrypted-block-emitted') throw new Error('Previous-phase control failed.');
    panel.querySelector('[data-cube-trace-first]').click();
    stepped = window.ShadowrunBinaryCubeVisualizer.currentState();
    if (stepped.tracePhaseIndex !== 0) throw new Error('First-phase control failed.');

    const firstSourceCell = panel.querySelector('[data-cube-trace-source-strip] [data-cube-trace-point]');
    if (!firstSourceCell) throw new Error('The source strip contains no selectable bit.');
    firstSourceCell.click();
    const sourceSelection = window.ShadowrunBinaryCubeVisualizer.currentState();
    if (sourceSelection.selectedSourceBitIndex !== 0) throw new Error('Source-to-point selection did not preserve source index 0.');
    if (sourceSelection.selectedFinalBit !== sourceSelection.traceOutputBlock[sourceSelection.selectedFinalOutputIndex]) throw new Error('Selected source bit does not resolve to its exact final output bit.');
    if (canonicalTrace.inputProjectionPointIds[sourceSelection.selectedInputCellIndex] !== sourceSelection.selectedPointId) throw new Error('Selected input-cell mapping changed.');
    if (canonicalTrace.outputProjectionPointIds[sourceSelection.selectedOutputCellIndex] !== sourceSelection.selectedPointId) throw new Error('Selected output-cell mapping changed.');

    const pointInput = panel.querySelector('[data-cube-trace-point-id]');
    pointInput.value = '15';
    panel.querySelector('[data-cube-trace-select-point]').click();
    const pointSelection = window.ShadowrunBinaryCubeVisualizer.currentState();
    if (pointSelection.selectedPointId !== 15) throw new Error('Direct point-ID inspection failed.');
    if (pointSelection.selectedFinalBit !== canonicalTrace.outputBlock[pointSelection.selectedFinalOutputIndex]) throw new Error('Direct point-ID inspection returned an incorrect final bit.');

    panel.querySelector('[data-cube-trace-restart]').click();
    const restarted = window.ShadowrunBinaryCubeVisualizer.currentState();
    if (restarted.tracePhaseIndex !== 0 || restarted.tracePhaseId !== 'source-ready') throw new Error('Restart control failed.');

    const sizeSelect = panel.querySelector('[data-cube-visualizer-size]');
    sizeSelect.value = '20';
    panel.querySelector('[data-cube-visualizer-generate]').click();
    const largeScene = window.ShadowrunBinaryCubeVisualizer.currentState();
    if (largeScene.gridSize !== 20 || largeScene.traceReady) throw new Error('The V5 detailed trace limit did not preserve the larger static scene boundary.');
    if (!/12 × 12/.test(panel.querySelector('[data-cube-trace-unavailable]').textContent)) throw new Error('The detailed trace limit notice is missing.');

    sizeSelect.value = '4';
    panel.querySelector('[data-cube-visualizer-generate]').click();
    const rebuilt = window.ShadowrunBinaryCubeVisualizer.currentState();
    if (!rebuilt.traceReady || rebuilt.tracePhaseCount !== 10) throw new Error('The canonical trace did not rebuild after returning to a detailed grid.');

    for (const preset of ['front', 'back', 'left', 'right', 'top', 'bottom']) panel.querySelector('[data-cube-visualizer-camera="' + preset + '"]').click();
    panel.querySelector('[data-cube-visualizer-reset-camera]').click();

    return {
      format: 'hb-ttrpg-shadowrun-binary-cube-v5-browser-validation-receipt',
      schemaVersion: '0.1.0',
      pass: true,
      rendererVersion: rebuilt.rendererVersion,
      webglVersion: gl.getParameter(gl.VERSION),
      canvasWidth: canvas.width,
      canvasHeight: canvas.height,
      phaseCount: rebuilt.tracePhaseCount,
      canonicalOutputMatch: true,
      sourcePointOutputTraceable: true,
      directPointInspection: true,
      firstPreviousNextLastRestart: true,
      largeStaticScenePreserved: true,
      detailedTraceGridLimit: window.ShadowrunBinaryCubeVisualizer.constants.MAX_MANUAL_TRACE_GRID_SIZE,
      interpolationPresent: false
    };
  })()`, 'Binary Cube V5 browser stepping');

  assert.equal(receipt.pass, true);
  assert.equal(receipt.rendererVersion, '0.3.0');
  assert.equal(receipt.canvasWidth, 800);
  assert.equal(receipt.canvasHeight, 600);
  assert.equal(receipt.phaseCount, 10);
  assert.equal(receipt.canonicalOutputMatch, true);
  assert.equal(receipt.sourcePointOutputTraceable, true);
  assert.equal(receipt.directPointInspection, true);
  assert.equal(receipt.firstPreviousNextLastRestart, true);
  assert.equal(receipt.largeStaticScenePreserved, true);
  assert.equal(receipt.detailedTraceGridLimit, 12);
  assert.equal(receipt.interpolationPresent, false);
  assert.match(receipt.webglVersion, /WebGL 2\.0/);
  console.log(JSON.stringify(receipt, null, 2));
} finally {
  cdp?.close();
  terminate(browserProcess);
  terminate(xvfbProcess);
  await delay(200);
  fs.rmSync(profileDirectory, { recursive: true, force: true });
}
