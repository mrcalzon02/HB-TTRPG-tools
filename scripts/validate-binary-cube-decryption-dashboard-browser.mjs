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
assert.ok(browser, 'A Chromium-compatible browser is required for the Decryption Dashboard browser test.');
assert.ok(xvfb, 'Xvfb is required for the Decryption Dashboard browser test.');
assert.equal(typeof WebSocket, 'function', 'Node.js 22 or newer is required.');

const debuggingPort = 10700 + (process.pid % 43);
const display = `:${1040 + (process.pid % 25)}`;
const profileDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'binary-cube-decryption-dashboard-'));
const webServer = createServer((request, response) => {
  response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
  response.end('<!doctype html><html><head><meta charset="utf-8"><title>Decryption Dashboard Validation</title></head><body></body></html>');
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
    document.body.innerHTML = '<main></main>';
    const style = document.createElement('style');
    style.textContent = 'body{margin:0;background:#050a12;color:#e5edf7;--line:#334155;--muted:#9aa9bb;--ink:#e5edf7;--accent:#67e8f9}.primary-action{padding:8px}';
    document.head.appendChild(style);
  })()`, 'Prepare dashboard document');

  for (const filename of [
    'scientific-tools-cooperative-runner.js',
    'shadowrun-binary-cube-engine.js',
    'shadowrun-binary-cube-secure-export.js',
    'binary-cube-decryption-dashboard.js'
  ]) {
    const source = fs.readFileSync(path.join(repositoryRoot, filename), 'utf8');
    await evaluate(cdp, `${source}\n//# sourceURL=${filename}`, filename);
  }

  const receipt = await evaluate(cdp, `(async () => {
    const Engine = window.ShadowrunBinaryCubeEngine;
    const Dashboard = window.BinaryCubeDecryptionDashboard;
    if (!Dashboard?.openPanel || !Engine?.encryptBinary) throw new Error('Dashboard dependencies did not load.');

    const panel = Dashboard.openPanel();
    const key = Engine.createKey({ gridSize: 4, seed: 'decryption-dashboard-browser', inputFace: 'top', outputFace: 'front', maskDensity: 1 });
    const plaintext = new TextEncoder().encode('Attack at dawn. Binary Cube dashboard browser control.');
    const bits = Array.from(plaintext, byte => byte.toString(2).padStart(8, '0')).join('');
    const packageObject = Engine.encryptBinary(bits, key);

    const input = panel.querySelector('#bdd-input');
    input.value = JSON.stringify(packageObject);
    panel.querySelector('#bdd-input-mode').value = 'auto';
    panel.querySelector('[data-bdd-load-paste]').click();
    let state = Dashboard.currentState();
    if (!state.sourceLoaded || state.sourceKind !== 'binary-cube-package' || state.sourceBitLength !== packageObject.ciphertext.length) throw new Error('Pasted package was not acquired correctly.');
    if (!panel.querySelector('[data-bdd-diagnostics]').textContent.includes('Byte entropy')) throw new Error('Structural diagnostics did not render.');
    if (!panel.querySelector('[data-bdd-source-summary]').textContent.includes('gridSize')) throw new Error('Exposed package metadata was not surfaced.');

    panel.querySelector('#bdd-single-byte-xor').checked = false;
    panel.querySelector('#bdd-result-limit').value = '8';
    panel.querySelector('[data-bdd-run]').click();
    for (let attempt = 0; attempt < 200; attempt += 1) {
      state = Dashboard.currentState();
      if (!state.attackRunning && state.resultCount > 0) break;
      await new Promise(resolve => setTimeout(resolve, 20));
    }
    state = Dashboard.currentState();
    if (state.attackRunning || state.resultCount < 4) throw new Error('Bounded attack suite did not complete.');
    if (!panel.querySelectorAll('.bdd-result').length) throw new Error('Ranked attack results did not render.');
    if (!/Attack suite complete/.test(panel.querySelector('[data-bdd-status]').textContent)) throw new Error('Attack completion was not announced.');

    const compareInput = panel.querySelector('#bdd-compare-input');
    compareInput.value = JSON.stringify({ ...packageObject, ciphertext: packageObject.ciphertext.split('').map((bit, index) => index === 0 ? (bit === '1' ? '0' : '1') : bit).join('') });
    panel.querySelector('[data-bdd-compare]').click();
    if (!panel.querySelector('[data-bdd-compare-output]').textContent.includes('Differing bits')) throw new Error('Differential comparison did not render.');

    panel.querySelector('#bdd-known-key').value = JSON.stringify(key);
    panel.querySelector('[data-bdd-known-key-run]').click();
    const known = panel.querySelector('[data-bdd-known-key-output]').textContent;
    if (!known.includes('Attack at dawn.')) throw new Error('Known-key control did not delegate to canonical decryption.');

    const parsedBytes = Dashboard.parseSourceBytes(new TextEncoder().encode('0100000101000010'), 'bits.txt');
    if (parsedBytes.kind !== 'binary-text-file' || new TextDecoder().decode(parsedBytes.bytes) !== 'AB') throw new Error('Uploaded-file byte parsing contract failed.');

    Dashboard.closePanel();
    if (Dashboard.currentState().panelOpen) throw new Error('Dashboard did not close.');
    Dashboard.openPanel();
    if (document.querySelectorAll('#' + Dashboard.constants.PANEL_ID).length !== 1) throw new Error('Dashboard panel is not a singleton.');

    return {
      format: 'hb-ttrpg-binary-cube-decryption-dashboard-browser-receipt',
      schemaVersion: '0.1.0',
      pass: true,
      sourceKind: state.sourceKind,
      sourceBitLength: state.sourceBitLength,
      rankedCandidateCount: state.resultCount,
      packageMetadataVisible: true,
      structuralDiagnosticsVisible: true,
      differentialComparison: true,
      knownKeyCanonicalDecrypt: true,
      fileByteParsing: true,
      singletonPanel: true,
      cooperativeRunnerPresent: Boolean(window.ScientificToolsCooperativeRunner)
    };
  })()`, 'Binary Cube Decryption Dashboard browser validation');

  assert.equal(receipt.pass, true);
  assert.equal(receipt.sourceKind, 'binary-cube-package');
  assert.ok(receipt.sourceBitLength > 0);
  assert.ok(receipt.rankedCandidateCount >= 4);
  assert.equal(receipt.packageMetadataVisible, true);
  assert.equal(receipt.structuralDiagnosticsVisible, true);
  assert.equal(receipt.differentialComparison, true);
  assert.equal(receipt.knownKeyCanonicalDecrypt, true);
  assert.equal(receipt.fileByteParsing, true);
  assert.equal(receipt.singletonPanel, true);
  assert.equal(receipt.cooperativeRunnerPresent, true);
  console.log(JSON.stringify(receipt, null, 2));
} finally {
  cdp?.close();
  terminate(browserProcess);
  terminate(xvfbProcess);
  await Promise.all([waitForExit(browserProcess), waitForExit(xvfbProcess)]);
  await new Promise(resolve => webServer.close(resolve));
  await removeDirectoryWithRetries(profileDirectory);
}
