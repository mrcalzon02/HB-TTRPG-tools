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
        close() {
          socket.close();
        }
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
  const result = await cdp.call('Runtime.evaluate', {
    expression,
    returnByValue: true,
    awaitPromise: true
  });
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
assert.ok(browser, 'A Chromium-compatible browser is required for the V3 WebGL smoke test.');
assert.ok(xvfb, 'Xvfb is required for the V3 WebGL smoke test.');
assert.equal(typeof WebSocket, 'function', 'Node.js 22 or newer is required for the browser validator.');

const port = 9300 + (process.pid % 300);
const displayNumber = 130 + (process.pid % 200);
const display = `:${displayNumber}`;
const profileDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'binary-cube-v3-browser-'));
const xvfbProcess = spawn(xvfb, [display, '-screen', '0', '1280x900x24', '-nolisten', 'tcp'], {
  stdio: ['ignore', 'ignore', 'pipe']
});
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
    styleNode.textContent = 'body{margin:0;background:#050b13;color:white}.cube-visualizer-scene-shell{position:relative;width:800px;height:600px}.cube-visualizer-canvas{display:block;width:800px;height:600px}.cube-visualizer-label-layer{position:absolute;inset:0}.cube-visualizer-face-label,.cube-visualizer-axis-label{position:absolute}';
    document.head.appendChild(styleNode);
    const panel = window.ShadowrunBinaryCubeVisualizer.openPanel();
    const canvas = panel.querySelector('[data-cube-visualizer-canvas]');
    const gl = canvas.getContext('webgl2');
    if (!gl) throw new Error('WebGL2 is unavailable.');
    const state = window.ShadowrunBinaryCubeVisualizer.currentState();
    if (state.gridSize !== 4 || !state.keyId) throw new Error('The canonical default scene did not load.');
    for (const preset of ['front', 'back', 'left', 'right', 'top', 'bottom']) {
      panel.querySelector('[data-cube-visualizer-camera="' + preset + '"]').click();
    }
    panel.querySelector('[data-cube-visualizer-reset-camera]').click();
    const status = panel.querySelector('[data-cube-visualizer-status]').textContent;
    if (!/Rendered the complete keyed point field/.test(status)) throw new Error('The canonical scene status was not reported.');
    return {
      format: 'hb-ttrpg-shadowrun-binary-cube-v3-browser-validation-receipt',
      schemaVersion: '0.1.0',
      pass: true,
      keyId: state.keyId,
      gridSize: state.gridSize,
      rendererVersion: state.rendererVersion,
      webglVersion: gl.getParameter(gl.VERSION),
      canvasWidth: canvas.width,
      canvasHeight: canvas.height,
      faceLabelCount: panel.querySelectorAll('.cube-visualizer-face-label').length,
      cameraPresetCount: 7
    };
  })()`, 'Binary Cube V3 browser smoke');

  assert.equal(receipt.pass, true);
  assert.equal(receipt.gridSize, 4);
  assert.equal(receipt.canvasWidth, 800);
  assert.equal(receipt.canvasHeight, 600);
  assert.equal(receipt.faceLabelCount, 6);
  assert.equal(receipt.cameraPresetCount, 7);
  assert.match(receipt.webglVersion, /WebGL 2\.0/);
  console.log(JSON.stringify(receipt, null, 2));
} finally {
  cdp?.close();
  terminate(browserProcess);
  terminate(xvfbProcess);
  await delay(200);
  fs.rmSync(profileDirectory, { recursive: true, force: true });
}
