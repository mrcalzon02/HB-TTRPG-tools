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
async function waitForExit(handle, timeoutMilliseconds = 3000) {
  if (!handle || handle.exitCode !== null || handle.signalCode !== null) return;
  await new Promise(resolve => {
    let settled = false;
    const finish = () => { if (!settled) { settled = true; resolve(); } };
    handle.once('exit', finish);
    setTimeout(finish, timeoutMilliseconds);
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
assert.ok(browser, 'A Chromium-compatible browser is required for the V12 stale-work test.');
assert.ok(xvfb, 'Xvfb is required for the V12 stale-work test.');
assert.equal(typeof WebSocket, 'function', 'Node.js 22 or newer is required.');

const debuggingPort = 10320 + (process.pid % 37);
const display = `:${920 + (process.pid % 40)}`;
const profileDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'binary-cube-v12-stale-work-'));
const webServer = createServer((request, response) => {
  response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
  response.end('<!doctype html><html><head><meta charset="utf-8"><title>Binary Cube V12 Stale Work Validation</title></head><body><main><section id="shadowrun"></section></main></body></html>');
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
    styleNode.textContent = 'body{margin:0;background:#050b13;color:white}.cube-visualizer-scene-shell{position:relative;width:800px;height:600px}.cube-visualizer-canvas{display:block;width:800px;height:600px}.cube-visualizer-label-layer{position:absolute;inset:0}.cube-visualizer-face-label,.cube-visualizer-axis-label,.cube-visualizer-direction-label,.cube-visualizer-phase-label{position:absolute}.cube-trace-stage[hidden],.cube-custom-mask-field[hidden],.cube-visualizer-2d[hidden],.cube-visualizer-scene-shell[hidden]{display:none}';
    document.head.appendChild(styleNode);
    localStorage.clear();
  })()`, 'Prepare V12 stale-work document');

  for (const filename of ['shadowrun-binary-cube-engine.js', 'binary-cube-visualizer-renderer.js']) {
    const source = fs.readFileSync(path.join(repositoryRoot, filename), 'utf8');
    await evaluate(cdp, `${source}\n//# sourceURL=${filename}`, filename);
  }

  await evaluate(cdp, `(() => {
    const actual = window.ShadowrunBinaryCubeEngine;
    const hooks = window.__binaryCubeV12MutationHooks = {
      sceneActions: [],
      sceneChecksums: [],
      traceAction: null,
      traceChecksumBefore: null
    };
    window.ShadowrunBinaryCubeEngine = Object.freeze({
      ...actual,
      buildPointsById(...args) {
        const points = actual.buildPointsById(...args);
        const action = hooks.sceneActions.shift();
        if (action === 'replace-key') {
          const Visualizer = window.ShadowrunBinaryCubeVisualizer;
          const panel = document.getElementById(Visualizer.constants.PANEL_ID);
          hooks.sceneChecksums.push(Visualizer.currentState().packageChecksum);
          panel.querySelector('[data-cube-visualizer-seed]').value = 'binary-cube-v12-race-replacement';
          panel.querySelector('[data-cube-visualizer-generate]').click();
        } else if (action === 'change-quality') {
          const Visualizer = window.ShadowrunBinaryCubeVisualizer;
          const panel = document.getElementById(Visualizer.constants.PANEL_ID);
          hooks.sceneChecksums.push(Visualizer.currentState().packageChecksum);
          const quality = panel.querySelector('[data-cube-visualizer-render-quality]');
          quality.value = 'aggregate';
          quality.dispatchEvent(new Event('change', { bubbles: true }));
        }
        return points;
      },
      traceEncryptBlock(...args) {
        const trace = actual.traceEncryptBlock(...args);
        if (hooks.traceAction === 'next-block') {
          hooks.traceAction = null;
          const Visualizer = window.ShadowrunBinaryCubeVisualizer;
          const panel = document.getElementById(Visualizer.constants.PANEL_ID);
          hooks.traceChecksumBefore = Visualizer.currentState().packageChecksum;
          panel.querySelector('[data-cube-encoder-next-block]').click();
        }
        return trace;
      }
    });
  })()`, 'Install re-entrant stale-work hooks');

  const controllerSource = fs.readFileSync(path.join(repositoryRoot, 'shadowrun-binary-cube-visualizer.js'), 'utf8');
  await evaluate(cdp, `${controllerSource}\n//# sourceURL=shadowrun-binary-cube-visualizer.js`, 'shadowrun-binary-cube-visualizer.js');

  const receipt = await evaluate(cdp, `(async () => {
    const Visualizer = window.ShadowrunBinaryCubeVisualizer;
    const hooks = window.__binaryCubeV12MutationHooks;
    const panel = Visualizer.openPanel();
    const waitForState = async (predicate, label, attempts = 320) => {
      for (let attempt = 0; attempt < attempts; attempt += 1) {
        const state = Visualizer.currentState();
        if (predicate(state)) return state;
        await new Promise(resolve => setTimeout(resolve, 25));
      }
      throw new Error(label + ': ' + JSON.stringify(Visualizer.currentState()));
    };

    await waitForState(state => state.packageReady && state.roundTripValid && state.traceReady, 'Initial package did not settle.');

    const size = panel.querySelector('[data-cube-visualizer-size]');
    const seed = panel.querySelector('[data-cube-visualizer-seed]');
    size.value = '128';
    seed.value = 'binary-cube-v12-race-initial';
    hooks.sceneActions.push('replace-key', 'change-quality');
    panel.querySelector('[data-cube-visualizer-generate]').click();
    const superseded = Visualizer.currentState();
    const supersededKeyId = superseded.keyId;
    const supersededChecksum = superseded.packageChecksum;

    const sceneSettled = await waitForState(state =>
      state.gridSize === 128 &&
      state.keyId !== supersededKeyId &&
      state.renderQuality === 'aggregate' &&
      state.renderTier === 'aggregate' &&
      state.renderedPointCount === 2048 &&
      state.staleSceneResultsDiscarded >= 2 &&
      !state.scenePreparing &&
      state.packageReady &&
      state.roundTripValid,
    'Rapid key and quality replacement did not settle.');

    if (hooks.sceneChecksums.length !== 2) throw new Error('Scene race hooks did not execute twice.');
    if (hooks.sceneChecksums[0] !== supersededChecksum) throw new Error('The superseded package receipt changed before key replacement.');
    if (hooks.sceneChecksums[1] !== sceneSettled.packageChecksum) throw new Error('Rendering-quality replacement changed the active package.');
    if (sceneSettled.packageChecksum === supersededChecksum) throw new Error('The replacement key did not produce a replacement package.');

    const bits = panel.querySelector('[data-cube-trace-bits]');
    bits.value = '01'.repeat(9000);
    hooks.traceAction = 'next-block';
    panel.querySelector('[data-cube-trace-build]').click();
    const packageBeforeTraceRace = Visualizer.currentState();
    if (packageBeforeTraceRace.packageBlockCount !== 2) throw new Error('The trace race requires exactly two package blocks.');

    const traceSettled = await waitForState(state =>
      state.staleTraceResultsDiscarded >= 1 &&
      state.selectedBlockIndex === 1 &&
      state.traceReady &&
      state.traceBlockIndex === 1 &&
      !state.tracePreparing &&
      state.packageReady &&
      state.roundTripValid,
    'Rapid trace block replacement did not settle.');

    if (hooks.traceChecksumBefore !== packageBeforeTraceRace.packageChecksum) throw new Error('The trace race started from the wrong package receipt.');
    if (traceSettled.packageChecksum !== packageBeforeTraceRace.packageChecksum) throw new Error('Discarding the stale trace mutated the package.');
    if (traceSettled.packageCiphertext !== packageBeforeTraceRace.packageCiphertext) throw new Error('Discarding the stale trace mutated ciphertext.');

    return {
      format: 'hb-ttrpg-shadowrun-binary-cube-v12-stale-work-browser-receipt',
      schemaVersion: '0.1.0',
      pass: true,
      supersededKeyId,
      activeKeyId: traceSettled.keyId,
      supersededChecksum,
      activeChecksum: traceSettled.packageChecksum,
      renderQuality: traceSettled.renderQuality,
      renderTier: traceSettled.renderTier,
      renderedPointCount: traceSettled.renderedPointCount,
      staleSceneResultsDiscarded: traceSettled.staleSceneResultsDiscarded,
      staleTraceResultsDiscarded: traceSettled.staleTraceResultsDiscarded,
      packageBlockCount: traceSettled.packageBlockCount,
      selectedBlockIndex: traceSettled.selectedBlockIndex,
      traceBlockIndex: traceSettled.traceBlockIndex,
      roundTripValid: traceSettled.roundTripValid,
      packagePreservedAcrossQualityRace: hooks.sceneChecksums[1] === sceneSettled.packageChecksum,
      packagePreservedAcrossTraceRace: traceSettled.packageChecksum === packageBeforeTraceRace.packageChecksum,
      ciphertextPreservedAcrossTraceRace: traceSettled.packageCiphertext === packageBeforeTraceRace.packageCiphertext
    };
  })()`, 'Binary Cube V12 stale-work browser validation');

  assert.equal(receipt.pass, true);
  assert.notEqual(receipt.activeKeyId, receipt.supersededKeyId);
  assert.notEqual(receipt.activeChecksum, receipt.supersededChecksum);
  assert.equal(receipt.renderQuality, 'aggregate');
  assert.equal(receipt.renderTier, 'aggregate');
  assert.equal(receipt.renderedPointCount, 2048);
  assert.ok(receipt.staleSceneResultsDiscarded >= 2);
  assert.ok(receipt.staleTraceResultsDiscarded >= 1);
  assert.equal(receipt.packageBlockCount, 2);
  assert.equal(receipt.selectedBlockIndex, 1);
  assert.equal(receipt.traceBlockIndex, 1);
  assert.equal(receipt.roundTripValid, true);
  assert.equal(receipt.packagePreservedAcrossQualityRace, true);
  assert.equal(receipt.packagePreservedAcrossTraceRace, true);
  assert.equal(receipt.ciphertextPreservedAcrossTraceRace, true);
  console.log(JSON.stringify(receipt, null, 2));
} finally {
  cdp?.close();
  terminate(browserProcess);
  terminate(xvfbProcess);
  await Promise.all([waitForExit(browserProcess), waitForExit(xvfbProcess)]);
  await new Promise(resolve => webServer.close(resolve));
  await removeDirectoryWithRetries(profileDirectory);
}
