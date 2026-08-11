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
assert.ok(browser, 'A Chromium-compatible browser is required for the serial demonstration browser test.');
assert.ok(xvfb, 'Xvfb is required for the serial demonstration browser test.');
assert.equal(typeof WebSocket, 'function', 'Node.js 22 or newer is required for the browser validator.');

const port = 9900 + (process.pid % 80);
const displayNumber = 650 + (process.pid % 80);
const display = `:${displayNumber}`;
const profileDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'binary-cube-serial-browser-'));
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
  await evaluate(cdp, `Object.defineProperty(window, 'localStorage', { configurable: true, value: (() => { const values = new Map(); return { getItem(key) { const normalized = String(key); return values.has(normalized) ? values.get(normalized) : null; }, setItem(key, value) { values.set(String(key), String(value)); }, removeItem(key) { values.delete(String(key)); }, clear() { values.clear(); } }; })() }); true;`, 'Install synthetic serial storage');

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

    panel.querySelector('[data-cube-trace-bits]').value = '0100110011010011';
    const keyMode = panel.querySelector('[data-cube-visualizer-key-mode]');
    keyMode.value = 'demonstration-flat-z-ripple';
    keyMode.dispatchEvent(new Event('change', { bubbles: true }));
    const size = panel.querySelector('[data-cube-visualizer-size]');
    size.value = '4';
    panel.querySelector('[data-cube-visualizer-generate]').click();

    const generated = window.ShadowrunBinaryCubeVisualizer.currentState();
    if (!generated.keyDemonstrationOnly || generated.keyDemonstrationPattern !== 'flat-z-ripple' || generated.keyGeneratorMode !== 'demonstration-flat-z-ripple') throw new Error('Flat Z Ripple did not become the active demonstration key.');
    if (generated.serialBitDurationMs !== 1400) throw new Error('The serial bit duration is not 1400 ms.');
    if (!generated.traceReady || generated.gridSize !== 4 || generated.traceExactPointCount !== 16) throw new Error('The 4 × 4 canonical trace was not ready for serial playback.');

    const key = window.ShadowrunBinaryCubeVisualizer.currentArtifacts().key;
    if (!key.demonstrationOnly || key.demonstrationPattern !== 'flat-z-ripple' || key.demonstrationFormula !== 'z=(x+y) mod gridSize') throw new Error('Demonstration key metadata was not preserved.');
    if (!key.rowPermutation.every((value, index) => value === index) || !key.columnPermutation.every((value, index) => value === index) || !key.depthPermutation.every((value, index) => value === index) || !key.mask.every(Boolean)) throw new Error('Flat Z Ripple stopped using identity permutations and the full payload mask.');

    const speed = panel.querySelector('[data-cube-trace-speed]');
    speed.value = '2';
    speed.dispatchEvent(new Event('change', { bubbles: true }));

    const viewportPlay = panel.querySelector('.cube-visualizer-viewport-play');
    if (!viewportPlay) throw new Error('Viewport Play Encoding control is missing.');
    viewportPlay.click();
    await new Promise(resolve => setTimeout(resolve, 180));

    const samples = [];
    const readSample = () => {
      const state = window.ShadowrunBinaryCubeVisualizer.currentState();
      const label = panel.querySelector('.cube-visualizer-phase-label')?.textContent || '';
      const match = label.match(/SERIAL BIT (\\d+)\\/(\\d+).*?([0-9]+(?:\\.[0-9]+)?)% ROUTE.*?INPUT (\\d+) → KEY POINT \\(([-0-9]+), ([-0-9]+), ([-0-9]+)\\) → OUTPUT (\\d+)/);
      if (!match) throw new Error('Serial renderer label did not expose the exact active route: ' + label);
      return {
        traceTime: state.traceTime,
        tracePlaying: state.tracePlaying,
        viewportSerialPlayback: state.viewportSerialPlayback,
        playbackSpeed: state.tracePlaybackSpeed,
        bitNumber: Number(match[1]),
        bitCount: Number(match[2]),
        routePercent: Number(match[3]),
        inputCell: Number(match[4]),
        keyPoint: [Number(match[5]), Number(match[6]), Number(match[7])],
        outputCell: Number(match[8]),
        label
      };
    };

    samples.push(readSample());
    await new Promise(resolve => setTimeout(resolve, 260));
    samples.push(readSample());
    await new Promise(resolve => setTimeout(resolve, 260));
    samples.push(readSample());
    await new Promise(resolve => setTimeout(resolve, 260));
    samples.push(readSample());

    for (const sample of samples) {
      if (!sample.tracePlaying || !sample.viewportSerialPlayback) throw new Error('Viewport serial mode disengaged during the first bit.');
      if (sample.playbackSpeed !== 2) throw new Error('The user speed selector did not remain at 2× for the override test.');
      if (sample.bitNumber !== 1 || sample.bitCount !== 16 || sample.inputCell !== 0) throw new Error('More than one bit advanced during the first 1.4-second interval: ' + JSON.stringify(sample));
    }
    for (let index = 1; index < samples.length; index += 1) {
      if (!(samples[index].routePercent > samples[index - 1].routePercent)) throw new Error('Serial route progress was not continuously increasing: ' + JSON.stringify(samples));
      if (!(samples[index].traceTime > samples[index - 1].traceTime)) throw new Error('Serial trace time was not continuously increasing.');
    }
    if (!(samples.at(-1).routePercent < 100)) throw new Error('The first bit completed too early; the 2× speed selector appears to have accelerated serial playback.');

    await new Promise(resolve => setTimeout(resolve, 620));
    const secondBit = readSample();
    if (secondBit.bitNumber !== 2 || secondBit.inputCell !== 1) throw new Error('The serial typewriter did not advance to exactly the second input bit after about 1.4 seconds: ' + JSON.stringify(secondBit));
    if (!(secondBit.routePercent > 0 && secondBit.routePercent < 60)) throw new Error('The second bit did not begin near the start of its own route: ' + JSON.stringify(secondBit));

    viewportPlay.click();
    await new Promise(resolve => setTimeout(resolve, 80));
    const paused = window.ShadowrunBinaryCubeVisualizer.currentState();
    if (paused.tracePlaying || paused.viewportSerialPlayback) throw new Error('Viewport serial playback did not pause cleanly.');

    return {
      format: 'hb-ttrpg-binary-cube-serial-demonstration-browser-receipt',
      schemaVersion: '0.1.0',
      pass: true,
      rendererVersion: generated.rendererVersion,
      webglVersion: gl.getParameter(gl.VERSION),
      keyId: generated.keyId,
      gridSize: generated.gridSize,
      serialBitDurationMilliseconds: generated.serialBitDurationMs,
      userSpeedSettingDuringTest: 2,
      speedOverrideIgnoredBySerialPlayback: true,
      oneBitAtATime: true,
      incrementalRouteSamples: samples.map(sample => ({ bitNumber: sample.bitNumber, inputCell: sample.inputCell, routePercent: sample.routePercent, traceTime: sample.traceTime, keyPoint: sample.keyPoint, outputCell: sample.outputCell })),
      secondBitSample: { bitNumber: secondBit.bitNumber, inputCell: secondBit.inputCell, routePercent: secondBit.routePercent, traceTime: secondBit.traceTime, keyPoint: secondBit.keyPoint, outputCell: secondBit.outputCell },
      exactRouteLabelPresent: true,
      deterministicDemonstrationKey: true,
      syntheticStorageOnly: true
    };
  })()`, 'Binary Cube serial demonstration browser');

  assert.equal(receipt.pass, true);
  assert.equal(receipt.rendererVersion, '0.6.0');
  assert.equal(receipt.gridSize, 4);
  assert.equal(receipt.serialBitDurationMilliseconds, 1400);
  assert.equal(receipt.userSpeedSettingDuringTest, 2);
  assert.equal(receipt.speedOverrideIgnoredBySerialPlayback, true);
  assert.equal(receipt.oneBitAtATime, true);
  assert.equal(receipt.incrementalRouteSamples.length, 4);
  assert.equal(receipt.secondBitSample.bitNumber, 2);
  assert.equal(receipt.exactRouteLabelPresent, true);
  assert.equal(receipt.deterministicDemonstrationKey, true);
  console.log(JSON.stringify(receipt, null, 2));
} finally {
  try { cdp?.close(); } catch (_) { /* Best-effort cleanup. */ }
  terminate(browserProcess);
  terminate(xvfbProcess);
  try { fs.rmSync(profileDirectory, { recursive: true, force: true }); } catch (_) { /* Best-effort cleanup. */ }
}
