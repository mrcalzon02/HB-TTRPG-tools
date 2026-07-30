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
assert.ok(browser, 'A Chromium-compatible browser is required for the V12 lifecycle test.');
assert.ok(xvfb, 'Xvfb is required for the V12 lifecycle test.');
assert.equal(typeof WebSocket, 'function', 'Node.js 22 or newer is required.');

const debuggingPort = 10400 + (process.pid % 31);
const display = `:${890 + (process.pid % 50)}`;
const profileDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'binary-cube-v12-lifecycle-browser-'));
const webServer = createServer((request, response) => {
  response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
  response.end('<!doctype html><html><head><meta charset="utf-8"><title>Binary Cube V12 Lifecycle Validation</title></head><body><main><section id="shadowrun"></section></main></body></html>');
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

    const metrics = {
      rendererCreateCalls: 0,
      animationFrameRequests: 0,
      animationFrameCancellations: 0,
      resizeObserversCreated: 0,
      resizeObserversActive: 0,
      canvasListenerAdds: 0,
      canvasListenerRemovals: 0,
      buffersCreated: 0,
      buffersDeleted: 0,
      programsCreated: 0,
      programsDeleted: 0
    };
    const activeAnimationFrames = new Set();
    const canvasListeners = new Map();
    const buffers = new Set();
    const programs = new Set();

    const nativeRequestAnimationFrame = window.requestAnimationFrame.bind(window);
    const nativeCancelAnimationFrame = window.cancelAnimationFrame.bind(window);
    window.requestAnimationFrame = callback => {
      let handle = null;
      handle = nativeRequestAnimationFrame(timestamp => {
        activeAnimationFrames.delete(handle);
        callback(timestamp);
      });
      activeAnimationFrames.add(handle);
      metrics.animationFrameRequests += 1;
      return handle;
    };
    window.cancelAnimationFrame = handle => {
      if (activeAnimationFrames.delete(handle)) metrics.animationFrameCancellations += 1;
      nativeCancelAnimationFrame(handle);
    };

    const NativeResizeObserver = window.ResizeObserver;
    window.ResizeObserver = class InstrumentedResizeObserver {
      constructor(callback) {
        this.inner = new NativeResizeObserver(callback);
        this.disconnected = false;
        metrics.resizeObserversCreated += 1;
        metrics.resizeObserversActive += 1;
      }
      observe(...args) { return this.inner.observe(...args); }
      unobserve(...args) { return this.inner.unobserve(...args); }
      disconnect() {
        if (!this.disconnected) {
          this.disconnected = true;
          metrics.resizeObserversActive -= 1;
        }
        return this.inner.disconnect();
      }
    };

    const listenerIds = new WeakMap();
    let nextListenerId = 1;
    const listenerKey = (event, handler) => {
      if (!listenerIds.has(handler)) listenerIds.set(handler, nextListenerId++);
      return event + ':' + listenerIds.get(handler);
    };
    const canvasPrototype = HTMLCanvasElement.prototype;
    const nativeAddEventListener = canvasPrototype.addEventListener;
    const nativeRemoveEventListener = canvasPrototype.removeEventListener;
    canvasPrototype.addEventListener = function(event, handler, options) {
      let listeners = canvasListeners.get(this);
      if (!listeners) { listeners = new Set(); canvasListeners.set(this, listeners); }
      listeners.add(listenerKey(event, handler));
      metrics.canvasListenerAdds += 1;
      return nativeAddEventListener.call(this, event, handler, options);
    };
    canvasPrototype.removeEventListener = function(event, handler, options) {
      canvasListeners.get(this)?.delete(listenerKey(event, handler));
      metrics.canvasListenerRemovals += 1;
      return nativeRemoveEventListener.call(this, event, handler, options);
    };

    const glPrototype = WebGL2RenderingContext.prototype;
    const nativeCreateBuffer = glPrototype.createBuffer;
    const nativeDeleteBuffer = glPrototype.deleteBuffer;
    const nativeCreateProgram = glPrototype.createProgram;
    const nativeDeleteProgram = glPrototype.deleteProgram;
    glPrototype.createBuffer = function() {
      const resource = nativeCreateBuffer.call(this);
      if (resource) { buffers.add(resource); metrics.buffersCreated += 1; }
      return resource;
    };
    glPrototype.deleteBuffer = function(resource) {
      if (resource && buffers.delete(resource)) metrics.buffersDeleted += 1;
      return nativeDeleteBuffer.call(this, resource);
    };
    glPrototype.createProgram = function() {
      const resource = nativeCreateProgram.call(this);
      if (resource) { programs.add(resource); metrics.programsCreated += 1; }
      return resource;
    };
    glPrototype.deleteProgram = function(resource) {
      if (resource && programs.delete(resource)) metrics.programsDeleted += 1;
      return nativeDeleteProgram.call(this, resource);
    };

    window.__binaryCubeLifecycleMetrics = metrics;
    window.__binaryCubeLifecycleSnapshot = () => ({
      ...metrics,
      activeAnimationFrames: activeAnimationFrames.size,
      canvasListenerCount: [...canvasListeners.values()].reduce((sum, listeners) => sum + listeners.size, 0),
      liveBuffers: buffers.size,
      livePrograms: programs.size,
      panelCount: document.querySelectorAll('#shadowrun-binary-cube-visualizer').length,
      labelCount: document.querySelectorAll('#shadowrun-binary-cube-visualizer [data-cube-visualizer-label-layer] > *').length
    });
  })()`, 'Install V12 lifecycle instrumentation');

  for (const filename of ['shadowrun-binary-cube-engine.js', 'binary-cube-visualizer-renderer.js']) {
    const source = fs.readFileSync(path.join(repositoryRoot, filename), 'utf8');
    await evaluate(cdp, `${source}\n//# sourceURL=${filename}`, filename);
  }

  await evaluate(cdp, `(() => {
    const actual = window.BinaryCubeVisualizerRenderer;
    window.BinaryCubeVisualizerRenderer = Object.freeze({
      ...actual,
      createRenderer(options) {
        window.__binaryCubeLifecycleMetrics.rendererCreateCalls += 1;
        const instance = actual.createRenderer(options);
        window.__binaryCubeLifecycleRenderer = instance;
        return instance;
      }
    });
  })()`, 'Instrument renderer construction');

  const controllerSource = fs.readFileSync(path.join(repositoryRoot, 'shadowrun-binary-cube-visualizer.js'), 'utf8');
  await evaluate(cdp, `${controllerSource}\n//# sourceURL=shadowrun-binary-cube-visualizer.js`, 'shadowrun-binary-cube-visualizer.js');

  const receipt = await evaluate(cdp, `(async () => {
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
    await waitForState(state => state.packageReady && state.roundTripValid && state.traceReady && !state.scenePreparing && !state.tracePreparing, 'Initial V12 lifecycle package did not settle.');
    const baseline = window.__binaryCubeLifecycleSnapshot();
    if (baseline.rendererCreateCalls !== 1 || baseline.panelCount !== 1 || baseline.resizeObserversCreated !== 1 || baseline.resizeObserversActive !== 1) throw new Error('Initial lifecycle resources were not single-instance: ' + JSON.stringify(baseline));
    if (baseline.liveBuffers < 6 || baseline.livePrograms !== 1 || baseline.canvasListenerCount < 7 || baseline.labelCount < 10) throw new Error('Initial renderer resources were incomplete: ' + JSON.stringify(baseline));

    const cycleCount = 24;
    for (let cycle = 0; cycle < cycleCount; cycle += 1) {
      const opened = Visualizer.openPanel();
      if (opened !== panel) throw new Error('Open cycle created a replacement panel at cycle ' + cycle + '.');
      panel.querySelector('[data-cube-trace-restart]').click();
      panel.querySelector('[data-cube-trace-play]').click();
      await new Promise(resolve => setTimeout(resolve, 40));
      if (!Visualizer.currentState().tracePlaying) throw new Error('Playback did not start during lifecycle cycle ' + cycle + '.');
      panel.querySelector('[data-cube-visualizer-close]').click();
      await new Promise(resolve => setTimeout(resolve, 20));
      const closedState = Visualizer.currentState();
      const closedSnapshot = window.__binaryCubeLifecycleSnapshot();
      if (closedState.panelOpen || closedState.tracePlaying || !panel.hidden) throw new Error('Close did not hide and pause the panel at cycle ' + cycle + '.');
      if (closedSnapshot.activeAnimationFrames !== 0) throw new Error('Close left an animation frame active at cycle ' + cycle + ': ' + JSON.stringify(closedSnapshot));
    }

    const reopened = Visualizer.openPanel();
    if (reopened !== panel || panel.hidden) throw new Error('Final reopen did not restore the singleton panel.');
    const afterCycles = window.__binaryCubeLifecycleSnapshot();
    for (const key of ['rendererCreateCalls', 'resizeObserversCreated', 'resizeObserversActive', 'canvasListenerCount', 'liveBuffers', 'livePrograms', 'panelCount', 'labelCount']) {
      if (afterCycles[key] !== baseline[key]) throw new Error(key + ' changed across open/close cycles: ' + JSON.stringify({ baseline, afterCycles }));
    }
    if (afterCycles.activeAnimationFrames !== 0) throw new Error('A lifecycle animation frame survived the final reopen.');
    if (afterCycles.animationFrameRequests < cycleCount || afterCycles.animationFrameCancellations < cycleCount) throw new Error('The lifecycle test did not exercise frame creation and cancellation on every cycle.');

    window.__binaryCubeLifecycleRenderer.dispose();
    window.__binaryCubeLifecycleRenderer.dispose();
    const afterDispose = window.__binaryCubeLifecycleSnapshot();
    if (afterDispose.resizeObserversActive !== 0 || afterDispose.canvasListenerCount !== 0 || afterDispose.liveBuffers !== 0 || afterDispose.livePrograms !== 0 || afterDispose.labelCount !== 0) {
      throw new Error('Renderer disposal left live resources: ' + JSON.stringify(afterDispose));
    }

    return {
      format: 'hb-ttrpg-shadowrun-binary-cube-v12-lifecycle-browser-receipt',
      schemaVersion: '0.1.0',
      pass: true,
      cycleCount,
      baseline,
      afterCycles,
      afterDispose
    };
  })()`, 'Binary Cube V12 lifecycle browser execution');

  assert.equal(receipt.pass, true);
  assert.equal(receipt.cycleCount, 24);
  assert.equal(receipt.baseline.rendererCreateCalls, 1);
  assert.equal(receipt.afterCycles.rendererCreateCalls, 1);
  assert.equal(receipt.afterCycles.activeAnimationFrames, 0);
  assert.equal(receipt.afterDispose.resizeObserversActive, 0);
  assert.equal(receipt.afterDispose.canvasListenerCount, 0);
  assert.equal(receipt.afterDispose.liveBuffers, 0);
  assert.equal(receipt.afterDispose.livePrograms, 0);
  assert.equal(receipt.afterDispose.labelCount, 0);
  console.log(JSON.stringify(receipt, null, 2));
} finally {
  cdp?.close();
  terminate(browserProcess);
  terminate(xvfbProcess);
  await waitForExit(browserProcess);
  await waitForExit(xvfbProcess);
  await new Promise(resolve => webServer.close(resolve));
  await removeDirectoryWithRetry(profileDirectory);
}
