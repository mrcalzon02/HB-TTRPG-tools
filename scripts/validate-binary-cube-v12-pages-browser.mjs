#!/usr/bin/env node

import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { spawn, spawnSync } from 'node:child_process';

const browserCandidates = [process.env.BINARY_CUBE_BROWSER, 'google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser'].filter(Boolean);
const pagesUrl = process.env.BINARY_CUBE_PAGES_URL || 'https://mrcalzon02.github.io/HB-TTRPG-tools/#shadowrun';
const viewport = Object.freeze({ width: 390, height: 844, deviceScaleFactor: 1, mobile: true });

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
async function waitForEvaluation(cdp, expression, label, attempts = 240, delayMilliseconds = 250) {
  let lastValue;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    lastValue = await evaluate(cdp, expression, label);
    if (lastValue) return lastValue;
    await delay(delayMilliseconds);
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
assert.ok(browser, 'A Chromium-compatible browser is required for the V12 Pages test.');
assert.ok(xvfb, 'Xvfb is required for the V12 Pages test.');
assert.equal(typeof WebSocket, 'function', 'Node.js 22 or newer is required.');

const debuggingPort = 10420 + (process.pid % 41);
const display = `:${960 + (process.pid % 30)}`;
const profileDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'binary-cube-v12-pages-'));
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
  await cdp.call('Emulation.setDeviceMetricsOverride', viewport);

  const target = new URL(pagesUrl);
  target.searchParams.set('binary-cube-v12-pages-smoke', String(Date.now()));
  target.hash = 'shadowrun';
  await cdp.call('Page.navigate', { url: target.href });

  await waitForEvaluation(cdp, `document.readyState === 'complete'`, 'GitHub Pages document readiness');
  await evaluate(cdp, `(() => {
    const launcher = document.querySelector('[data-view="shadowrun"]');
    if (!launcher) throw new Error('The deployed landing page is missing its Shadowrun launcher.');
    launcher.click();
    return true;
  })()`, 'Activate deployed Shadowrun workspace');
  await waitForEvaluation(
    cdp,
    `Boolean(document.getElementById('shadowrun') && document.querySelector('[data-shadowrun-open="shadowrun-binary-cube-visualizer"]'))`,
    'deployed Shadowrun workspace and visualizer launcher'
  );
  await evaluate(cdp, `(() => {
    const launcher = document.querySelector('[data-shadowrun-open="shadowrun-binary-cube-visualizer"]');
    if (!launcher) throw new Error('The deployed Shadowrun workspace is missing its Binary Cube visualizer launcher.');
    launcher.click();
    return true;
  })()`, 'Open deployed Binary Cube visualizer');
  await waitForEvaluation(cdp, `Boolean(window.ShadowrunBinaryCubeVisualizer?.openPanel)`, 'deployed Binary Cube visualizer assets');

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
    const initial = await waitForState(state => state.packageReady && state.roundTripValid && state.traceReady, 'Deployed package did not settle.');

    const displayMode = panel.querySelector('[data-cube-visualizer-display-mode]');
    displayMode.value = '2d';
    displayMode.dispatchEvent(new Event('change', { bubbles: true }));
    const fallback = await waitForState(state => state.effectiveDisplayMode === '2d' && state.twoDimensionalFallbackReady, 'Exact 2D mobile fallback did not settle.');

    const requiredSelectors = [
      '[data-cube-visualizer-close]',
      '[data-cube-visualizer-generate]',
      '[data-cube-trace-build]',
      '[data-cube-encoder-decrypt]',
      '[data-cube-trace-timeline]',
      '[data-cube-visualizer-display-mode]'
    ];
    const missing = requiredSelectors.filter(selector => !panel.querySelector(selector));
    if (missing.length) throw new Error('Missing mobile controls: ' + missing.join(', '));

    const panelRect = panel.getBoundingClientRect();
    const controls = panel.querySelector('.cube-visualizer-controls')?.getBoundingClientRect();
    const main = panel.querySelector('.cube-visualizer-main-column')?.getBoundingClientRect();
    const overflowElements = [...panel.querySelectorAll('*')].filter(element => {
      if (element.hidden || getComputedStyle(element).display === 'none') return false;
      const rect = element.getBoundingClientRect();
      return rect.right > window.innerWidth + 2 || rect.left < -2;
    }).slice(0, 12).map(element => ({
      tag: element.tagName.toLowerCase(),
      className: String(element.className || '').slice(0, 120),
      left: Math.round(element.getBoundingClientRect().left),
      right: Math.round(element.getBoundingClientRect().right)
    }));

    if (document.documentElement.scrollWidth > window.innerWidth + 2) throw new Error('Deployed mobile page has horizontal overflow: ' + JSON.stringify(overflowElements));
    if (panelRect.width > window.innerWidth + 2) throw new Error('Visualizer panel exceeds the mobile viewport.');
    if (!controls || !main || main.top < controls.bottom - 2) throw new Error('Visualizer mobile columns did not stack without overlap.');
    if (panel.querySelectorAll('.cube-2d-cell').length !== 32) throw new Error('Exact 4x4 2D fallback did not expose 32 cells on mobile.');

    return {
      format: 'hb-ttrpg-shadowrun-binary-cube-v12-pages-browser-receipt',
      schemaVersion: '0.1.0',
      pass: true,
      href: location.href,
      pathname: location.pathname,
      hash: location.hash,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      documentScrollWidth: document.documentElement.scrollWidth,
      panelWidth: Math.round(panelRect.width),
      columnsStacked: main.top >= controls.bottom - 2,
      rendererVersion: initial.rendererVersion,
      rendererAvailable: initial.rendererAvailable,
      packageReady: fallback.packageReady,
      roundTripValid: fallback.roundTripValid,
      traceReady: fallback.traceReady,
      effectiveDisplayMode: fallback.effectiveDisplayMode,
      exactTwoDimensionalCells: panel.querySelectorAll('.cube-2d-cell').length,
      coreControlsPresent: missing.length === 0,
      overflowElementCount: overflowElements.length
    };
  })()`, 'Binary Cube V12 deployed Pages mobile validation');

  assert.equal(receipt.pass, true);
  assert.equal(receipt.pathname, '/HB-TTRPG-tools/');
  assert.equal(receipt.hash, '#shadowrun');
  assert.equal(receipt.viewportWidth, viewport.width);
  assert.ok(receipt.documentScrollWidth <= receipt.viewportWidth + 2);
  assert.ok(receipt.panelWidth <= receipt.viewportWidth + 2);
  assert.equal(receipt.columnsStacked, true);
  assert.equal(receipt.packageReady, true);
  assert.equal(receipt.roundTripValid, true);
  assert.equal(receipt.traceReady, true);
  assert.equal(receipt.effectiveDisplayMode, '2d');
  assert.equal(receipt.exactTwoDimensionalCells, 32);
  assert.equal(receipt.coreControlsPresent, true);
  assert.equal(receipt.overflowElementCount, 0);
  console.log(JSON.stringify(receipt, null, 2));
} finally {
  cdp?.close();
  terminate(browserProcess);
  terminate(xvfbProcess);
  await Promise.all([waitForExit(browserProcess), waitForExit(xvfbProcess)]);
  await removeDirectoryWithRetries(profileDirectory);
}
