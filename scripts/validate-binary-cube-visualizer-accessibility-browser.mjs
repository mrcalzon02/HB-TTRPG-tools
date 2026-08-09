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
    try { handle.kill('SIGTERM'); } catch (_) { /* Best effort. */ }
  }
}
async function waitForExit(handle, attempts = 80) {
  if (!handle || handle.exitCode !== null) return;
  await new Promise(resolve => {
    let settled = false;
    const finish = () => { if (!settled) { settled = true; resolve(); } };
    handle.once('exit', finish);
    setTimeout(finish, attempts * 25);
  });
}
async function removeDirectoryWithRetry(directory, attempts = 20) {
  let lastError;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      fs.rmSync(directory, { recursive: true, force: true, maxRetries: 2, retryDelay: 25 });
      return;
    } catch (error) {
      lastError = error;
      await delay(50);
    }
  }
  throw lastError;
}

const browser = findCommand(browserCandidates);
const xvfb = findCommand(['Xvfb']);
assert.ok(browser, 'A Chromium-compatible browser is required for the V10 accessibility test.');
assert.ok(xvfb, 'Xvfb is required for the V10 accessibility test.');
assert.equal(typeof WebSocket, 'function', 'Node.js 22 or newer is required.');

const debuggingPort = 10100 + (process.pid % 31);
const display = `:${840 + (process.pid % 50)}`;
const profileDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'binary-cube-v10-browser-'));
const webServer = createServer((request, response) => {
  response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
  response.end('<!doctype html><html><head><meta charset="utf-8"><title>Binary Cube V10 Accessibility Validation</title></head><body><main><section id="shadowrun"></section></main></body></html>');
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

  const loadSources = async (rendererFailure = false) => {
    await evaluate(cdp, `(() => {
      document.body.innerHTML = '<main><section id="shadowrun"></section></main>';
      const styleNode = document.createElement('style');
      styleNode.textContent = 'body{margin:0;background:#050b13;color:white}.cube-visualizer-scene-shell{position:relative;width:800px;height:600px}.cube-visualizer-canvas{display:block;width:800px;height:600px}.cube-visualizer-label-layer{position:absolute;inset:0}.cube-visualizer-face-label,.cube-visualizer-axis-label,.cube-visualizer-direction-label,.cube-visualizer-phase-label{position:absolute}.cube-trace-stage[hidden],.cube-custom-mask-field[hidden],.cube-visualizer-2d[hidden],.cube-visualizer-scene-shell[hidden]{display:none}';
      document.head.appendChild(styleNode);
      localStorage.clear();
    })()`, 'Prepare V10 document');
    for (const filename of ['shadowrun-binary-cube-engine.js', 'binary-cube-visualizer-renderer.js']) {
      const source = fs.readFileSync(path.join(repositoryRoot, filename), 'utf8');
      await evaluate(cdp, `${source}\n//# sourceURL=${filename}`, filename);
    }
    if (rendererFailure) {
      await evaluate(cdp, `(() => {
        const actual = window.BinaryCubeVisualizerRenderer;
        window.BinaryCubeVisualizerRenderer = Object.freeze({
          ...actual,
          createRenderer() { throw new Error('Forced WebGL initialization failure'); }
        });
      })()`, 'Install forced renderer failure');
    }
    const controllerSource = fs.readFileSync(path.join(repositoryRoot, 'shadowrun-binary-cube-visualizer.js'), 'utf8');
    await evaluate(cdp, `${controllerSource}\n//# sourceURL=shadowrun-binary-cube-visualizer.js`, 'shadowrun-binary-cube-visualizer.js');
  };

  await loadSources(false);
  const normalReceipt = await evaluate(cdp, `(async () => {
    const Visualizer = window.ShadowrunBinaryCubeVisualizer;
    const panel = Visualizer.openPanel();
    const waitForState = async (predicate, label, attempts = 240) => {
      for (let attempt = 0; attempt < attempts; attempt += 1) {
        const state = Visualizer.currentState();
        if (predicate(state)) return state;
        await new Promise(resolve => setTimeout(resolve, 25));
      }
      throw new Error(label + ': ' + JSON.stringify(Visualizer.currentState()));
    };
    const press = (code, options = {}) => panel.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, cancelable: true, code, key: options.key || '', ctrlKey: Boolean(options.ctrlKey) }));

    const initial = await waitForState(state => state.packageReady && state.roundTripValid && state.traceReady, 'Initial V10 package did not settle.');
    if (!initial.rendererAvailable || initial.effectiveDisplayMode !== '3d' || initial.rendererVersion !== '0.6.0') throw new Error('The normal V10 WebGL path did not initialize.');
    if (initial.traceTranscriptEntryCount !== 10) throw new Error('The ten-phase transcript was not created.');
    const status = panel.querySelector('[data-cube-visualizer-status]');
    const live = panel.querySelector('[data-cube-accessibility-live]');
    if (status.getAttribute('role') !== 'status' || status.getAttribute('aria-live') !== 'polite' || status.getAttribute('aria-atomic') !== 'true') throw new Error('The visible status region is not fully announced.');
    if (live.getAttribute('role') !== 'status' || live.getAttribute('aria-live') !== 'polite') throw new Error('The dedicated live region is missing.');

    press('KeyO');
    press('Digit5');
    const outputFace = Visualizer.currentState();
    if (outputFace.draftOutputFace !== 'left' || outputFace.packageReady) throw new Error('Keyboard output-face selection failed.');
    press('KeyI');
    press('Digit6');
    press('Digit1');
    const direction = Visualizer.currentState();
    if (direction.draftInputFace !== 'right' || direction.draftOutputFace !== 'top') throw new Error('Keyboard input/output face sequence failed.');
    panel.querySelector('[data-cube-visualizer-generate]').click();
    await waitForState(state => state.packageReady && state.roundTripValid && state.traceReady, 'Keyboard-selected direction did not rebuild.');

    press('Digit2', { ctrlKey: true });
    if (Visualizer.currentState().cameraPreset !== 'front') throw new Error('Keyboard camera preset failed.');

    press('ArrowRight');
    if (Visualizer.currentState().tracePhaseIndex !== 1) throw new Error('Keyboard next-phase control failed.');
    const pointBefore = Visualizer.currentState().selectedPointId;
    press('BracketRight');
    if (Visualizer.currentState().selectedPointId !== Math.min(15, pointBefore + 1)) throw new Error('Keyboard point inspection failed.');
    press('PageDown');
    if (Visualizer.currentState().selectedBlockIndex !== 1) throw new Error('Keyboard next-block control failed.');
    press('PageUp');
    if (Visualizer.currentState().selectedBlockIndex !== 0) throw new Error('Keyboard previous-block control failed.');
    press('End');
    if (Visualizer.currentState().tracePhaseIndex !== 9) throw new Error('Keyboard last-phase control failed.');
    press('Home');
    if (Visualizer.currentState().tracePhaseIndex !== 0) throw new Error('Keyboard first-phase control failed.');

    press('Space');
    await new Promise(resolve => setTimeout(resolve, 120));
    if (!Visualizer.currentState().tracePlaying) throw new Error('Keyboard playback did not start.');
    press('Space');
    const paused = Visualizer.currentState();
    if (paused.tracePlaying) throw new Error('Keyboard playback did not pause.');

    press('KeyR');
    if (!Visualizer.currentState().reducedMotion) throw new Error('Keyboard reduced-motion toggle failed.');
    const timeline = panel.querySelector('[data-cube-trace-timeline]');
    timeline.value = '380';
    timeline.dispatchEvent(new Event('input', { bubbles: true }));
    const discreteA = Visualizer.currentState();
    if (Math.abs(discreteA.traceTime - 3 / 9) > 1e-9 || discreteA.tracePhaseProgress !== 0) throw new Error('Reduced motion did not snap to a discrete phase.');
    const positionA = JSON.stringify(discreteA.selectedAnimatedPosition);
    timeline.value = '420';
    timeline.dispatchEvent(new Event('input', { bubbles: true }));
    const discreteB = Visualizer.currentState();
    if (JSON.stringify(discreteB.selectedAnimatedPosition) !== positionA || discreteB.traceTime !== discreteA.traceTime) throw new Error('Reduced-motion state changed inside one phase interval.');
    timeline.value = '460';
    timeline.dispatchEvent(new Event('input', { bubbles: true }));
    const discreteC = Visualizer.currentState();
    if (discreteC.traceTime === discreteA.traceTime || JSON.stringify(discreteC.selectedAnimatedPosition) === positionA) throw new Error('Reduced motion did not advance at the next canonical phase.');
    if (!/discrete/.test(panel.querySelector('[data-cube-trace-timeline-readout]').textContent)) throw new Error('Reduced-motion timeline disclosure is missing.');

    const activeTranscript = panel.querySelector('[data-cube-trace-transcript] [aria-current="step"]');
    if (!activeTranscript || panel.querySelectorAll('[data-cube-trace-transcript] li').length !== 10) throw new Error('The active transcript phase is not exposed.');
    if (!live.textContent.includes('phase')) throw new Error('Phase changes were not announced.');

    const traceCells = [...panel.querySelectorAll('.cube-trace-cell')];
    if (!traceCells.length || !traceCells.every(cell => /^[DF] · P/.test(cell.querySelector('small')?.textContent || ''))) throw new Error('Visible non-color D/F trace markers are missing.');

    press('KeyD');
    const twoDimensional = Visualizer.currentState();
    if (twoDimensional.effectiveDisplayMode !== '2d') throw new Error('Keyboard 2D display toggle failed.');
    if (!panel.querySelector('[data-cube-visualizer-scene-shell]').hidden || panel.querySelector('[data-cube-visualizer-2d]').hidden) throw new Error('2D mode did not replace the primary scene.');
    const fallbackCells = panel.querySelectorAll('.cube-2d-cell');
    if (fallbackCells.length !== 32) throw new Error('The exact 4x4 input/output fallback did not render 32 cells.');
    if (!panel.querySelector('[data-cube-visualizer-2d-content]').textContent.includes('Package output')) throw new Error('The selected point 2D mapping is incomplete.');
    const fallbackTarget = panel.querySelector('.cube-2d-cell[data-role="output"]');
    fallbackTarget.focus();
    fallbackTarget.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, code: 'Enter', key: 'Enter' }));
    fallbackTarget.click();
    if (Visualizer.currentState().selectedPointId !== Number(fallbackTarget.dataset.cubeTracePoint)) throw new Error('The 2D fallback mapping is not keyboard-focusable and inspectable.');

    return {
      format: 'hb-ttrpg-shadowrun-binary-cube-v10-accessibility-browser-receipt',
      schemaVersion: '0.2.0',
      pass: true,
      rendererVersion: Visualizer.currentState().rendererVersion,
      webglVersion: (() => { const context = panel.querySelector('[data-cube-visualizer-canvas]').getContext('webgl2'); return context.getParameter(context.VERSION); })(),
      keyboardFaceSelection: true,
      keyboardCameraPresets: true,
      keyboardPlaybackAndStepping: true,
      keyboardBlockAndPointInspection: true,
      reducedMotionDiscretePhases: true,
      transcriptPhaseCount: panel.querySelectorAll('[data-cube-trace-transcript] li').length,
      liveAnnouncements: true,
      nonColorMarkers: true,
      exactTwoDimensionalCells: fallbackCells.length,
      exactTwoDimensionalMapping: true
    };
  })()`, 'Binary Cube V10 normal accessibility path');

  await cdp.call('Page.navigate', { url: pageUrl });
  await delay(150);
  await loadSources(true);
  const fallbackReceipt = await evaluate(cdp, `(() => {
    const Visualizer = window.ShadowrunBinaryCubeVisualizer;
    const panel = Visualizer.openPanel();
    const press = code => panel.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, cancelable: true, code }));
    const initial = Visualizer.currentState();
    if (initial.rendererAvailable || initial.effectiveDisplayMode !== '2d') throw new Error('Renderer failure did not select the 2D fallback.');
    if (!initial.packageReady || !initial.roundTripValid || !initial.traceReady) throw new Error('Renderer failure disabled canonical encoding or trace generation.');
    if (panel.querySelector('[data-cube-visualizer-2d]').hidden || !panel.querySelector('[data-cube-visualizer-scene-shell]').hidden) throw new Error('The 2D fallback is not the active primary visualization.');
    if (panel.querySelectorAll('.cube-2d-cell').length !== 32) throw new Error('The renderer-failure fallback lost exact 4x4 face cells.');
    if (panel.querySelectorAll('[data-cube-trace-transcript] li').length !== 10) throw new Error('The renderer-failure fallback lost the trace transcript.');
    if (!/Forced WebGL initialization failure/.test(panel.querySelector('[data-cube-visualizer-fallback]').textContent)) throw new Error('The fallback reason is not disclosed.');
    press('ArrowRight');
    if (Visualizer.currentState().tracePhaseIndex !== 1) throw new Error('Keyboard stepping failed without WebGL.');
    press('BracketRight');
    if (Visualizer.currentState().selectedPointId !== 1) throw new Error('Keyboard point inspection failed without WebGL.');
    return {
      pass: true,
      rendererAvailable: false,
      effectiveDisplayMode: Visualizer.currentState().effectiveDisplayMode,
      packageReady: Visualizer.currentState().packageReady,
      roundTripValid: Visualizer.currentState().roundTripValid,
      traceReady: Visualizer.currentState().traceReady,
      transcriptPhaseCount: panel.querySelectorAll('[data-cube-trace-transcript] li').length,
      exactTwoDimensionalCells: panel.querySelectorAll('.cube-2d-cell').length,
      keyboardWithoutWebgl: true
    };
  })()`, 'Binary Cube V10 forced 2D fallback');

  assert.equal(normalReceipt.pass, true);
  assert.equal(normalReceipt.rendererVersion, '0.6.0');
  assert.equal(normalReceipt.transcriptPhaseCount, 10);
  assert.equal(normalReceipt.exactTwoDimensionalCells, 32);
  assert.equal(normalReceipt.reducedMotionDiscretePhases, true);
  assert.equal(normalReceipt.keyboardFaceSelection, true);
  assert.equal(normalReceipt.keyboardCameraPresets, true);
  assert.equal(normalReceipt.keyboardPlaybackAndStepping, true);
  assert.equal(normalReceipt.keyboardBlockAndPointInspection, true);
  assert.equal(normalReceipt.liveAnnouncements, true);
  assert.equal(normalReceipt.nonColorMarkers, true);
  assert.match(normalReceipt.webglVersion, /WebGL 2\.0/);

  assert.equal(fallbackReceipt.pass, true);
  assert.equal(fallbackReceipt.rendererAvailable, false);
  assert.equal(fallbackReceipt.effectiveDisplayMode, '2d');
  assert.equal(fallbackReceipt.packageReady, true);
  assert.equal(fallbackReceipt.roundTripValid, true);
  assert.equal(fallbackReceipt.traceReady, true);
  assert.equal(fallbackReceipt.transcriptPhaseCount, 10);
  assert.equal(fallbackReceipt.exactTwoDimensionalCells, 32);
  assert.equal(fallbackReceipt.keyboardWithoutWebgl, true);

  console.log(JSON.stringify({ normal: normalReceipt, forcedFallback: fallbackReceipt }, null, 2));
} finally {
  cdp?.close();
  terminate(browserProcess);
  terminate(xvfbProcess);
  await waitForExit(browserProcess);
  await waitForExit(xvfbProcess);
  await new Promise(resolve => webServer.close(resolve));
  await removeDirectoryWithRetry(profileDirectory);
}
