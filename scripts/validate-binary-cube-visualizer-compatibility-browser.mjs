#!/usr/bin/env node

import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
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
async function waitFor(predicate, label, attempts = 120, delayMilliseconds = 50) {
  let last;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    last = await predicate();
    if (last) return last;
    await delay(delayMilliseconds);
  }
  throw new Error(`Timed out waiting for ${label}. Last value: ${JSON.stringify(last)}`);
}
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
      for (const request of pending.values()) request.reject(new Error('Chromium DevTools closed before completing a request.'));
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
async function waitForExit(handle, milliseconds = 5000) {
  if (!handle || handle.exitCode !== null) return;
  await Promise.race([
    new Promise(resolve => handle.once('exit', resolve)),
    delay(milliseconds)
  ]);
}
function removeProfile(directory) {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    try { fs.rmSync(directory, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 }); return; }
    catch (error) { if (attempt === 7) throw error; }
  }
}

const browser = findCommand(browserCandidates);
const xvfb = findCommand(['Xvfb']);
assert.ok(browser, 'A Chromium-compatible browser is required for the V11 compatibility test.');
assert.ok(xvfb, 'Xvfb is required for the V11 compatibility test.');
assert.equal(typeof WebSocket, 'function', 'Node.js 22 or newer is required.');

const debugPort = 9850 + (process.pid % 100);
const pagePort = 11850 + (process.pid % 100);
const display = `:${650 + (process.pid % 100)}`;
const profileDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'binary-cube-v11-browser-'));
const pageUrl = `http://127.0.0.1:${pagePort}/`;
const server = http.createServer((request, response) => {
  response.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
  response.end('<!doctype html><html><head><meta charset="utf-8"></head><body data-binary-cube-storage-scope="compatibility-test"><main><section id="shadowrun"></section></main></body></html>');
});
await new Promise((resolve, reject) => server.listen(pagePort, '127.0.0.1', error => error ? reject(error) : resolve()));
const xvfbProcess = spawn(xvfb, [display, '-screen', '0', '1365x900x24', '-nolisten', 'tcp'], { stdio: ['ignore', 'ignore', 'pipe'] });
let browserProcess;
let cdp;

try {
  await delay(350);
  browserProcess = spawn(browser, [
    '--no-sandbox',
    `--remote-debugging-port=${debugPort}`,
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

  const pages = await waitForJson(`http://127.0.0.1:${debugPort}/json/list`);
  const page = pages.find(candidate => candidate.type === 'page');
  assert.ok(page?.webSocketDebuggerUrl, 'Chromium did not expose a page endpoint.');
  cdp = await connectCdp(page.webSocketDebuggerUrl);
  await cdp.call('Runtime.enable');
  await cdp.call('Page.enable');
  await cdp.call('Page.navigate', { url: pageUrl });
  await delay(120);
  await evaluate(cdp, `localStorage.clear(); window.alert = () => {}; document.body.dataset.binaryCubeStorageScope = 'compatibility-test';`, 'browser setup');

  const styleNode = fs.readFileSync(path.join(repositoryRoot, 'binary-cube-visualizer.css'), 'utf8');
  await evaluate(cdp, `(() => { const node = document.createElement('style'); node.textContent = ${JSON.stringify(styleNode)}; document.head.appendChild(node); })()`, 'visualizer style');
  for (const filename of [
    'shadowrun-binary-cube-engine.js',
    'shadowrun-binary-cube-auth.js',
    'shadowrun-binary-cube-encryption.js',
    'shadowrun-binary-cube-editor.js',
    'shadowrun-binary-cube-auth-ui.js',
    'shadowrun-binary-cube-secure-export.js',
    'binary-cube-visualizer-renderer.js',
    'shadowrun-binary-cube-visualizer.js'
  ]) {
    const source = fs.readFileSync(path.join(repositoryRoot, filename), 'utf8');
    await evaluate(cdp, `${source}\n//# sourceURL=${filename}`, filename);
  }
  await delay(120);

  const receipt = await evaluate(cdp, `(async () => {
    const Engine = window.ShadowrunBinaryCubeEngine;
    const Lab = window.ShadowrunBinaryCubeEncryption;
    const Editor = window.ShadowrunBinaryCubeEditor;
    const Auth = window.ShadowrunBinaryCubeAuth;
    const AuthUI = window.ShadowrunBinaryCubeAuthUI;
    const SecureExport = window.ShadowrunBinaryCubeSecureExport;
    const Visualizer = window.ShadowrunBinaryCubeVisualizer;
    if (!Engine || !Lab || !Editor || !Auth || !AuthUI || !SecureExport || !Visualizer) throw new Error('V11 tool family did not load completely.');

    const bits = '10110100101101001010110100101101001';
    const key = Engine.createKey({ gridSize: 4, seed: 'v11-browser', inputFace: 'left', outputFace: 'top', inputQuarterTurns: 1, outputQuarterTurns: 3, maskDensity: 0.5 });
    const packageObject = Engine.encryptBinary(bits, key);

    Lab.loadArtifacts({ source: 'browser-internal', sourceFileName: 'v11.bin', bits, key, packageObject });
    const labInternal = Lab.currentArtifacts();
    if (labInternal.transportKind !== 'internal-package' || !labInternal.packageObject) throw new Error('Laboratory internal artifact provenance failed.');
    await Visualizer.loadArtifacts(labInternal);
    let state = Visualizer.currentState();
    if (!state.packageReady || !state.roundTripValid || state.transportKind !== 'internal-package' || state.packageChecksum !== packageObject.checksum) throw new Error('Internal laboratory-to-visualizer handoff failed.');

    const draft = Editor.draftFromKey(key);
    draft.rowPermutation = Editor.rotatePermutation(draft.rowPermutation, 1);
    draft.mask = Editor.maskPattern(key.gridSize, 'diagonal', draft.mask);
    const editedKey = Editor.applyDraft(key, draft);
    const invalid = { ...draft, depthPermutation: [...draft.depthPermutation] };
    invalid.depthPermutation[0] = invalid.depthPermutation[1];
    let invalidRejected = false;
    try { Editor.applyDraft(key, invalid); } catch (_) { invalidRejected = true; }
    if (!invalidRejected) throw new Error('Invalid editor draft was accepted.');
    Lab.loadArtifacts({ source: 'validated-editor', bits, key: editedKey });
    await Visualizer.loadArtifacts(Lab.currentArtifacts());
    state = Visualizer.currentState();
    if (state.keyId !== editedKey.keyId || !state.packageReady || !state.roundTripValid) throw new Error('Validated editor key handoff failed.');

    const editedPackage = Engine.encryptBinary(bits, editedKey);
    const secure = SecureExport.createSecureExport(editedPackage, editedKey, Engine);
    await Visualizer.loadArtifacts({ source: 'secure-export-test', bits, key: editedKey, secureExport: secure });
    state = Visualizer.currentState();
    const secureDisplayed = JSON.parse(document.querySelector('[data-cube-encoder-package]').value);
    const secureArtifacts = Visualizer.currentArtifacts();
    if (!state.packageReady || !state.roundTripValid || state.transportKind !== 'secure-export' || !state.transportMetadataMinimized) throw new Error('Secure export did not open as a validated package.');
    if (Object.hasOwn(secureDisplayed, 'keyId') || Object.hasOwn(secureDisplayed, 'originalBitLength') || Object.hasOwn(secureDisplayed, 'gridSize')) throw new Error('Visualizer exposed secure-export metadata.');
    if (secureArtifacts.packageObject !== null || !secureArtifacts.secureExport) throw new Error('Secure export handoff exposed the reconstructed internal package.');
    Lab.loadArtifacts(secureArtifacts);
    const labSecure = Lab.currentArtifacts();
    if (labSecure.transportKind !== 'secure-export' || labSecure.packageObject !== null || !labSecure.secureExport) throw new Error('Secure export provenance was lost on return to the laboratory.');

    const passphrase = 'V11 browser compatibility passphrase';
    const envelope = await Auth.sealPackage(editedPackage, passphrase, { iterations: Auth.constants.MIN_ITERATIONS });
    await Visualizer.loadArtifacts({ source: 'authenticated-envelope-test', bits, key: editedKey, authenticatedEnvelope: envelope });
    state = Visualizer.currentState();
    if (state.transportKind !== 'authenticated-envelope' || state.packageReady) throw new Error('Authenticated envelope opened without a passphrase.');
    const passphraseField = document.querySelector('[data-cube-encoder-passphrase]');
    passphraseField.value = passphrase;
    document.querySelector('[data-cube-encoder-open-envelope]').click();
    for (let attempt = 0; attempt < 120 && !Visualizer.currentState().packageReady; attempt += 1) await new Promise(resolve => setTimeout(resolve, 50));
    state = Visualizer.currentState();
    const envelopeDisplayed = JSON.parse(document.querySelector('[data-cube-encoder-package]').value);
    const envelopeArtifacts = Visualizer.currentArtifacts();
    if (!state.packageReady || !state.roundTripValid || state.transportKind !== 'authenticated-envelope' || !state.transportAuthenticated) throw new Error('Authenticated envelope did not open and validate.');
    if (envelopeDisplayed.format !== Auth.constants.ENVELOPE_FORMAT || envelopeArtifacts.packageObject !== null || !envelopeArtifacts.authenticatedEnvelope) throw new Error('Authenticated-envelope handoff exposed the internal package.');

    const stored = localStorage.getItem(state.storageKey) || '';
    if (!stored || stored.includes(passphrase) || stored.includes('cube-encoder-passphrase')) throw new Error('Visualizer storage persisted the passphrase.');
    const storedObject = JSON.parse(stored);
    if (storedObject.schemaVersion !== Visualizer.constants.VISUALIZER_STATE_SCHEMA_VERSION || storedObject.transportKind !== 'authenticated-envelope') throw new Error('Visualizer storage schema or provenance was not persisted.');

    Lab.loadArtifacts(envelopeArtifacts);
    const labEnvelope = Lab.currentArtifacts();
    const authArtifact = AuthUI.currentEnvelopeArtifact();
    if (labEnvelope.transportKind !== 'authenticated-envelope' || labEnvelope.packageObject !== null || !authArtifact) throw new Error('Authenticated envelope was not preserved in the laboratory.');
    if (document.querySelector('#cube-auth-passphrase').value !== '') throw new Error('Laboratory handoff retained an envelope passphrase.');

    const visualizerKey = Visualizer.utilities.visualizerStorageKey('compatibility-test');
    const laboratoryKey = Lab.utilities.laboratoryStorageKey('compatibility-test');
    if (visualizerKey === laboratoryKey) throw new Error('Visualizer and laboratory storage keys collide.');
    const migratedVisualizer = Visualizer.utilities.migrateVisualizerState({ bits, key: editedKey, packageObject: editedPackage, displayMode: '2d' });
    const migratedLab = Lab.utilities.migrateLaboratoryState({ input: bits, key: JSON.stringify(editedKey), package: JSON.stringify(editedPackage) });
    if (migratedVisualizer.schemaVersion !== '0.1.0' || migratedLab.schemaVersion !== '0.3.0') throw new Error('Explicit storage migration failed.');

    return {
      format: 'hb-ttrpg-shadowrun-binary-cube-v11-browser-compatibility-receipt',
      schemaVersion: '0.2.0',
      pass: true,
      webglVersion: document.querySelector('[data-cube-visualizer-canvas]').getContext('webgl2')?.getParameter(0x1F02) || '2D fallback',
      internalHandoff: true,
      validatedEditorHandoff: true,
      invalidEditorDraftRejected: true,
      secureExportMetadataMinimized: true,
      secureExportReturnHandoff: true,
      authenticatedEnvelopeOpened: true,
      authenticatedEnvelopeReturnHandoff: true,
      passphrasePersisted: false,
      scopedStorageKeysDistinct: true,
      visualizerStorageSchema: migratedVisualizer.schemaVersion,
      laboratoryStorageSchema: migratedLab.schemaVersion,
      recoveredBitsMatch: Visualizer.currentState().recoveredBits === bits
    };
  })()`, 'Binary Cube V11 browser compatibility');

  assert.equal(receipt.pass, true);
  assert.equal(receipt.internalHandoff, true);
  assert.equal(receipt.validatedEditorHandoff, true);
  assert.equal(receipt.invalidEditorDraftRejected, true);
  assert.equal(receipt.secureExportMetadataMinimized, true);
  assert.equal(receipt.secureExportReturnHandoff, true);
  assert.equal(receipt.authenticatedEnvelopeOpened, true);
  assert.equal(receipt.authenticatedEnvelopeReturnHandoff, true);
  assert.equal(receipt.passphrasePersisted, false);
  assert.equal(receipt.scopedStorageKeysDistinct, true);
  assert.equal(receipt.visualizerStorageSchema, '0.1.0');
  assert.equal(receipt.laboratoryStorageSchema, '0.3.0');
  assert.equal(receipt.recoveredBitsMatch, true);
  console.log(JSON.stringify(receipt, null, 2));
} finally {
  cdp?.close();
  terminate(browserProcess);
  terminate(xvfbProcess);
  server.close();
  await waitForExit(browserProcess);
  await waitForExit(xvfbProcess);
  removeProfile(profileDirectory);
}
