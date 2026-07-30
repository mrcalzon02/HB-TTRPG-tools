#!/usr/bin/env node

import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { spawn, spawnSync } from 'node:child_process';

const browserCandidates = [process.env.BINARY_CUBE_BROWSER, 'google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser'].filter(Boolean);
const pagesUrl = process.env.BINARY_CUBE_PAGES_URL || 'https://mrcalzon02.github.io/HB-TTRPG-tools/#shadowrun';

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
async function waitForEvaluation(cdp, expression, label, attempts = 240) {
  let lastValue;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    lastValue = await evaluate(cdp, expression, label);
    if (lastValue) return lastValue;
    await delay(250);
  }
  throw new Error(`Timed out waiting for ${label}. Last value: ${JSON.stringify(lastValue)}`);
}
function terminate(handle) {
  if (handle && !handle.killed) {
    try { handle.kill('SIGTERM'); } catch (_) { /* Best-effort cleanup. */ }
  }
}
async function waitForExit(handle, timeoutMilliseconds = 3000) {
  if (!handle || handle.exitCode !== null || handle.signalCode !== null) return;
  await Promise.race([new Promise(resolve => handle.once('exit', resolve)), delay(timeoutMilliseconds)]);
}
async function removeDirectoryWithRetries(directory, attempts = 20) {
  let lastError;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try { fs.rmSync(directory, { recursive: true, force: true }); return; }
    catch (error) {
      lastError = error;
      if (!['ENOTEMPTY', 'EBUSY', 'EPERM'].includes(error?.code)) throw error;
      await delay(100);
    }
  }
  throw lastError;
}

const browser = findCommand(browserCandidates);
const xvfb = findCommand(['Xvfb']);
assert.ok(browser, 'A Chromium-compatible browser is required for the V13 launch test.');
assert.ok(xvfb, 'Xvfb is required for the V13 launch test.');
assert.equal(typeof WebSocket, 'function', 'Node.js 22 or newer is required.');

const debuggingPort = 10520 + (process.pid % 43);
const display = `:${990 + (process.pid % 25)}`;
const profileDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'binary-cube-v13-pages-'));
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
    'about:blank'
  ], { env: { ...process.env, DISPLAY: display }, stdio: ['ignore', 'ignore', 'pipe'] });

  const pages = await waitForJson(`http://127.0.0.1:${debuggingPort}/json/list`);
  const page = pages.find(candidate => candidate.type === 'page');
  assert.ok(page?.webSocketDebuggerUrl);
  cdp = await connectCdp(page.webSocketDebuggerUrl);
  await cdp.call('Runtime.enable');
  await cdp.call('Page.enable');
  await cdp.call('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });

  const target = new URL(pagesUrl);
  target.searchParams.set('binary-cube-v13-launch-smoke', String(Date.now()));
  target.hash = 'shadowrun';
  await cdp.call('Page.navigate', { url: target.href });
  await waitForEvaluation(cdp, `document.readyState === 'complete'`, 'V13 Pages document readiness');
  await waitForEvaluation(cdp, `Boolean(window.HBTTRPGApp?.activateView)`, 'V13 public lazy-view activator');
  await evaluate(cdp, `window.HBTTRPGApp.activateView('shadowrun')`, 'Activate public Shadowrun workspace');
  await waitForEvaluation(
    cdp,
    `Boolean(document.querySelector('[data-shadowrun-module="shadowrun-binary-cube-encryption"]') && document.querySelector('[data-shadowrun-module="shadowrun-binary-cube-visualizer"]'))`,
    'promoted Binary Cube workspace cards'
  );

  const cardReceipt = await evaluate(cdp, `(() => {
    const readCard = id => {
      const card = document.querySelector('[data-shadowrun-module="' + id + '"]');
      const status = card?.querySelector('.badge[class*="status-"]');
      const action = card?.querySelector('[data-shadowrun-open]');
      return {
        id,
        title: card?.querySelector('h3')?.textContent || '',
        statusText: status?.textContent || '',
        statusClass: status?.className || '',
        actionText: action?.textContent || '',
        actionId: action?.dataset.shadowrunOpen || ''
      };
    };
    return {
      laboratory: readCard('shadowrun-binary-cube-encryption'),
      visualizer: readCard('shadowrun-binary-cube-visualizer')
    };
  })()`, 'Read promoted Binary Cube cards');

  assert.equal(cardReceipt.laboratory.title, 'Binary Cube Encryption Laboratory');
  assert.equal(cardReceipt.laboratory.statusText, 'Available');
  assert.match(cardReceipt.laboratory.statusClass, /status-available/);
  assert.equal(cardReceipt.laboratory.actionText, 'Open Laboratory');
  assert.equal(cardReceipt.visualizer.title, 'Binary Cube Encoder Visualizer');
  assert.equal(cardReceipt.visualizer.statusText, 'Available');
  assert.match(cardReceipt.visualizer.statusClass, /status-available/);
  assert.equal(cardReceipt.visualizer.actionText, 'Open Visualizer');

  await evaluate(cdp, `document.querySelector('[data-shadowrun-open="shadowrun-binary-cube-visualizer"]').click()`, 'Open promoted visualizer');
  await waitForEvaluation(cdp, `Boolean(window.ShadowrunBinaryCubeVisualizer?.openPanel)`, 'promoted visualizer API');
  const runtime = await evaluate(cdp, `(async () => {
    const Visualizer = window.ShadowrunBinaryCubeVisualizer;
    const panel = Visualizer.openPanel();
    for (let attempt = 0; attempt < 240; attempt += 1) {
      const state = Visualizer.currentState();
      if (state.packageReady && state.roundTripValid && state.traceReady) {
        return {
          panelOpen: state.panelOpen,
          rendererVersion: state.rendererVersion,
          packageReady: state.packageReady,
          roundTripValid: state.roundTripValid,
          traceReady: state.traceReady,
          transportKind: state.transportKind,
          panelCount: document.querySelectorAll('#' + Visualizer.constants.PANEL_ID).length,
          viewportWidth: innerWidth,
          documentScrollWidth: document.documentElement.scrollWidth,
          panelWidth: Math.round(panel.getBoundingClientRect().width)
        };
      }
      await new Promise(resolve => setTimeout(resolve, 25));
    }
    throw new Error('Promoted visualizer did not settle: ' + JSON.stringify(Visualizer.currentState()));
  })()`, 'Validate promoted visualizer runtime');

  assert.equal(runtime.panelOpen, true);
  assert.equal(runtime.rendererVersion, '0.5.0');
  assert.equal(runtime.packageReady, true);
  assert.equal(runtime.roundTripValid, true);
  assert.equal(runtime.traceReady, true);
  assert.equal(runtime.transportKind, 'internal-package');
  assert.equal(runtime.panelCount, 1);
  assert.ok(runtime.documentScrollWidth <= runtime.viewportWidth + 2);
  assert.ok(runtime.panelWidth <= runtime.viewportWidth + 2);

  console.log(JSON.stringify({
    format: 'hb-ttrpg-shadowrun-binary-cube-v13-pages-launch-receipt',
    schemaVersion: '0.1.0',
    pass: true,
    pathname: new URL(pagesUrl).pathname,
    hash: '#shadowrun',
    laboratory: cardReceipt.laboratory,
    visualizer: cardReceipt.visualizer,
    runtime
  }, null, 2));
} finally {
  cdp?.close();
  terminate(browserProcess);
  terminate(xvfbProcess);
  await Promise.all([waitForExit(browserProcess), waitForExit(xvfbProcess)]);
  await removeDirectoryWithRetries(profileDirectory);
}
