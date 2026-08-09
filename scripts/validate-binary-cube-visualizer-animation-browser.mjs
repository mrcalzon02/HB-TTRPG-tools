#!/usr/bin/env node

import assert from 'node:assert/strict';
import fs from 'node:fs';
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
assert.ok(browser, 'A Chromium-compatible browser is required for the V6 WebGL animation test.');
assert.ok(xvfb, 'Xvfb is required for the V6 WebGL animation test.');
assert.equal(typeof WebSocket, 'function', 'Node.js 22 or newer is required for the browser validator.');

const port = 9700 + (process.pid % 200);
const displayNumber = 530 + (process.pid % 100);
const display = `:${displayNumber}`;
const profileDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'binary-cube-v6-browser-'));
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
  ], { env: { ...process.env, DISPLAY: display }, stdio: ['ignore', 'ignore', 'pipe'] });

  const pages = await waitForJson(`http://127.0.0.1:${port}/json/list`);
  const page = pages.find(candidate => candidate.type === 'page');
  assert.ok(page?.webSocketDebuggerUrl, 'Chromium did not expose a page DevTools endpoint.');
  cdp = await connectCdp(page.webSocketDebuggerUrl);
  await cdp.call('Runtime.enable');
  await evaluate(cdp, `Object.defineProperty(window, 'localStorage', { configurable: true, value: (() => { const values = new Map(); return { getItem(key) { const normalized = String(key); return values.has(normalized) ? values.get(normalized) : null; }, setItem(key, value) { values.set(String(key), String(value)); }, removeItem(key) { values.delete(String(key)); }, clear() { values.clear(); } }; })() }); true;`, 'Install synthetic V6 storage');

  for (const filename of ['shadowrun-binary-cube-engine.js', 'binary-cube-visualizer-renderer.js', 'shadowrun-binary-cube-visualizer.js']) {
    const source = fs.readFileSync(path.join(repositoryRoot, filename), 'utf8');
    await evaluate(cdp, `${source}\n//# sourceURL=${filename}`, filename);
  }

  const receipt = await evaluate(cdp, `(async () => {
    document.body.innerHTML = '<main><section id="shadowrun"></section></main>';
    const styleNode = document.createElement('style');
    styleNode.textContent = 'body{margin:0;background:#050b13;color:white}.cube-visualizer-scene-shell{position:relative;width:800px;height:600px}.cube-visualizer-canvas{display:block;width:800px;height:600px}.cube-visualizer-label-layer{position:absolute;inset:0}.cube-visualizer-face-label,.cube-visualizer-axis-label,.cube-visualizer-direction-label,.cube-visualizer-phase-label{position:absolute}.cube-trace-stage[hidden]{display:none}';
    document.head.appendChild(styleNode);

    const panel = window.ShadowrunBinaryCubeVisualizer.openPanel();
    const canvas = panel.querySelector('[data-cube-visualizer-canvas]');
    const gl = canvas.getContext('webgl2');
    if (!gl) throw new Error('WebGL2 is unavailable.');

    const initial = window.ShadowrunBinaryCubeVisualizer.currentState();
    if (!initial.traceReady || initial.traceTime !== 0 || initial.tracePhaseIndex !== 0 || initial.tracePhaseId !== 'source-ready' || initial.tracePhaseCount !== 10) throw new Error('The canonical V6 timeline did not initialize at zero.');
    if (initial.rendererVersion !== '0.6.0') throw new Error('The V6 renderer version is incorrect under the current renderer.');
    if (panel.querySelectorAll('[data-cube-trace-marker]').length !== 10) throw new Error('The ten trace phase markers were not created.');

    const key = JSON.parse(panel.querySelector('[data-cube-visualizer-key]').value);
    const bits = panel.querySelector('[data-cube-trace-bits]').value.replace(/\s+/g, '');
    const canonicalTrace = window.ShadowrunBinaryCubeEngine.traceEncryptBlock(bits, key, 0);
    window.ShadowrunBinaryCubeEngine.validateTransformationTrace(canonicalTrace, key);
    if (initial.traceOutputBlock !== canonicalTrace.outputBlock) throw new Error('The animated trace output does not match the canonical engine trace.');

    const startPosition = [...initial.selectedAnimatedPosition];
    const timeline = panel.querySelector('[data-cube-trace-timeline]');
    timeline.value = '380';
    timeline.dispatchEvent(new Event('input', { bubbles: true }));
    const scrubbed = window.ShadowrunBinaryCubeVisualizer.currentState();
    if (Math.abs(scrubbed.traceTime - 0.38) > 0.002 || scrubbed.tracePlaying) throw new Error('Timeline scrubbing failed or started playback.');
    if (JSON.stringify(startPosition) === JSON.stringify(scrubbed.selectedAnimatedPosition)) throw new Error('The selected point did not move during interpolation.');
    const deterministicPosition = [...scrubbed.selectedAnimatedPosition];

    const mode = panel.querySelector('[data-cube-trace-mode]');
    mode.value = 'selected';
    mode.dispatchEvent(new Event('change', { bubbles: true }));
    if (window.ShadowrunBinaryCubeVisualizer.currentState().tracePlaybackMode !== 'selected') throw new Error('Selected-bit playback mode failed.');
    mode.value = 'row';
    mode.dispatchEvent(new Event('change', { bubbles: true }));
    if (window.ShadowrunBinaryCubeVisualizer.currentState().tracePlaybackMode !== 'row') throw new Error('Input-row playback mode failed.');
    mode.value = 'all';
    mode.dispatchEvent(new Event('change', { bubbles: true }));

    const speed = panel.querySelector('[data-cube-trace-speed]');
    speed.value = '2';
    speed.dispatchEvent(new Event('change', { bubbles: true }));
    panel.querySelector('[data-cube-trace-play]').click();
    await new Promise(resolve => setTimeout(resolve, 140));
    const playing = window.ShadowrunBinaryCubeVisualizer.currentState();
    if (!playing.tracePlaying || playing.tracePlaybackDirection !== 1 || playing.tracePlaybackSpeed !== 2 || playing.traceTime <= scrubbed.traceTime) throw new Error('Forward playback failed.');

    panel.querySelector('[data-cube-trace-pause]').click();
    const paused = window.ShadowrunBinaryCubeVisualizer.currentState();
    await new Promise(resolve => setTimeout(resolve, 120));
    const stablePause = window.ShadowrunBinaryCubeVisualizer.currentState();
    if (stablePause.tracePlaying || Math.abs(paused.traceTime - stablePause.traceTime) > 1e-9) throw new Error('Paused trace time drifted.');
    if (JSON.stringify(paused.selectedAnimatedPosition) !== JSON.stringify(stablePause.selectedAnimatedPosition)) throw new Error('Paused point position drifted.');

    panel.querySelector('[data-cube-trace-reverse-play]').click();
    await new Promise(resolve => setTimeout(resolve, 120));
    panel.querySelector('[data-cube-trace-pause]').click();
    const reversed = window.ShadowrunBinaryCubeVisualizer.currentState();
    if (reversed.tracePlaying || reversed.traceTime >= paused.traceTime) throw new Error('Reverse playback failed.');

    timeline.value = '380';
    timeline.dispatchEvent(new Event('input', { bubbles: true }));
    const returned = window.ShadowrunBinaryCubeVisualizer.currentState();
    if (JSON.stringify(returned.selectedAnimatedPosition) !== JSON.stringify(deterministicPosition)) throw new Error('Returning to the same trace time produced animation drift.');

    panel.querySelector('[data-cube-trace-marker="7"]').click();
    const markerJump = window.ShadowrunBinaryCubeVisualizer.currentState();
    if (markerJump.tracePhaseIndex !== 7 || Math.abs(markerJump.traceTime - 7 / 9) > 1e-9) throw new Error('Phase marker jump failed.');
    panel.querySelector('[data-cube-trace-previous]').click();
    if (window.ShadowrunBinaryCubeVisualizer.currentState().tracePhaseIndex !== 6) throw new Error('Reverse phase step failed.');
    panel.querySelector('[data-cube-trace-next]').click();
    if (window.ShadowrunBinaryCubeVisualizer.currentState().tracePhaseIndex !== 7) throw new Error('Forward phase step failed.');

    const firstSourceCell = panel.querySelector('[data-cube-trace-source-strip] [data-cube-trace-point]');
    firstSourceCell.click();
    const selected = window.ShadowrunBinaryCubeVisualizer.currentState();
    if (selected.selectedSourceBitIndex !== 0) throw new Error('Source-to-point selection changed.');
    if (selected.selectedFinalBit !== selected.traceOutputBlock[selected.selectedFinalOutputIndex]) throw new Error('Selected final bit changed.');

    panel.querySelector('[data-cube-trace-restart]').click();
    const restarted = window.ShadowrunBinaryCubeVisualizer.currentState();
    if (restarted.traceTime !== 0 || restarted.tracePlaying || restarted.tracePhaseId !== 'source-ready') throw new Error('Restart did not return to a stable zero-time state.');

    const sizeSelect = panel.querySelector('[data-cube-visualizer-size]');
    sizeSelect.value = '20';
    panel.querySelector('[data-cube-visualizer-generate]').click();
    const largeScene = window.ShadowrunBinaryCubeVisualizer.currentState();
    if (largeScene.gridSize !== 20 || !largeScene.traceReady || largeScene.renderTier !== 'batched' || largeScene.exactPointCount !== 400 || largeScene.renderedPointCount !== 400 || largeScene.traceExactPointCount !== 400 || largeScene.traceRenderedPointCount !== 400) throw new Error('The V6 boundary did not advance to an exact V9 batched animation: ' + JSON.stringify(largeScene));
    if (panel.querySelectorAll('.cube-trace-cell').length !== 0) throw new Error('The 20 × 20 animated trace expanded one document cell per point.');
    if (!/exact 400-point canonical state/i.test(panel.querySelector('[data-cube-trace-representation-notice]').textContent)) throw new Error('The V9 exact batched trace disclosure is missing.');

    sizeSelect.value = '4';
    panel.querySelector('[data-cube-visualizer-generate]').click();
    const rebuilt = window.ShadowrunBinaryCubeVisualizer.currentState();
    if (!rebuilt.traceReady || rebuilt.tracePhaseCount !== 10 || rebuilt.traceTime !== 0) throw new Error('The canonical animated trace did not rebuild.');

    for (const preset of ['front', 'back', 'left', 'right', 'top', 'bottom']) panel.querySelector('[data-cube-visualizer-camera="' + preset + '"]').click();
    panel.querySelector('[data-cube-visualizer-reset-camera]').click();

    return {
      format: 'hb-ttrpg-shadowrun-binary-cube-v6-browser-validation-receipt',
      schemaVersion: '0.1.0',
      pass: true,
      rendererVersion: rebuilt.rendererVersion,
      webglVersion: gl.getParameter(gl.VERSION),
      canvasWidth: canvas.width,
      canvasHeight: canvas.height,
      phaseCount: rebuilt.tracePhaseCount,
      markerCount: panel.querySelectorAll('[data-cube-trace-marker]').length,
      canonicalOutputMatch: true,
      forwardPlayback: true,
      reversePlayback: true,
      stablePause: true,
      deterministicScrubReturn: true,
      playbackModes: 3,
      playbackSpeeds: 4,
      selectedBitTraceable: true,
      exactBatchedTraceAt20: true,
      domDetailedTraceGridLimit: window.ShadowrunBinaryCubeVisualizer.constants.MAX_MANUAL_TRACE_GRID_SIZE,
      syntheticStorageOnly: true
    };
  })()`, 'Binary Cube V6 browser animation');

  assert.equal(receipt.pass, true);
  assert.equal(receipt.rendererVersion, '0.6.0');
  assert.equal(receipt.canvasWidth, 800);
  assert.equal(receipt.canvasHeight, 600);
  assert.equal(receipt.phaseCount, 10);
  assert.equal(receipt.markerCount, 10);
  assert.equal(receipt.canonicalOutputMatch, true);
  assert.equal(receipt.forwardPlayback, true);
  assert.equal(receipt.reversePlayback, true);
  assert.equal(receipt.stablePause, true);
  assert.equal(receipt.deterministicScrubReturn, true);
  assert.equal(receipt.playbackModes, 3);
  assert.equal(receipt.playbackSpeeds, 4);
  assert.equal(receipt.selectedBitTraceable, true);
  assert.equal(receipt.exactBatchedTraceAt20, true);
  assert.equal(receipt.domDetailedTraceGridLimit, 12);
  assert.equal(receipt.syntheticStorageOnly, true);
  assert.match(receipt.webglVersion, /WebGL 2\.0/);
  console.log(JSON.stringify(receipt, null, 2));
} finally {
  cdp?.close();
  terminate(browserProcess);
  terminate(xvfbProcess);
  await delay(200);
  fs.rmSync(profileDirectory, { recursive: true, force: true });
}
