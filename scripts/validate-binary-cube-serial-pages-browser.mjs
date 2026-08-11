#!/usr/bin/env node

import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { spawn, spawnSync } from 'node:child_process';

const browserCandidates = [process.env.BINARY_CUBE_BROWSER, 'google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser'].filter(Boolean);
const pagesUrl = process.env.BINARY_CUBE_PAGES_URL || 'https://mrcalzon02.github.io/HB-TTRPG-tools/#scientific-tools';

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
assert.ok(browser, 'A Chromium-compatible browser is required for the public serial demonstration test.');
assert.ok(xvfb, 'Xvfb is required for the public serial demonstration test.');
assert.equal(typeof WebSocket, 'function', 'Node.js 22 or newer is required.');

const debuggingPort = 10600 + (process.pid % 41);
const display = `:${1030 + (process.pid % 31)}`;
const profileDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'binary-cube-serial-pages-'));
const xvfbProcess = spawn(xvfb, [display, '-screen', '0', '1440x1000x24', '-nolisten', 'tcp'], { stdio: ['ignore', 'ignore', 'pipe'] });
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

  const target = new URL(pagesUrl);
  target.searchParams.set('binary-cube-serial-pages', `${Date.now()}-${process.pid}`);
  target.hash = 'scientific-tools';
  await cdp.call('Page.navigate', { url: target.href });
  await waitForEvaluation(cdp, `document.readyState === 'complete'`, 'Scientific Tools Pages document readiness');
  await waitForEvaluation(cdp, `Boolean(window.HBTTRPGApp?.activateView)`, 'public lazy-view activator');
  await evaluate(cdp, `window.HBTTRPGApp.activateView('scientific-tools')`, 'Activate public Scientific Tools workspace');
  await waitForEvaluation(cdp, `Boolean(window.ScientificToolsWorkspace?.openBinaryCubeVisualizer)`, 'public Scientific Tools Binary Cube API');
  await evaluate(cdp, `window.ScientificToolsWorkspace.openBinaryCubeVisualizer()`, 'Open public Scientific Tools Binary Cube visualizer');
  await waitForEvaluation(cdp, `Boolean(window.ShadowrunBinaryCubeVisualizer?.currentState && document.querySelector('#shadowrun-binary-cube-visualizer'))`, 'public Binary Cube panel');

  const receipt = await evaluate(cdp, `(async () => {
    const Visualizer = window.ShadowrunBinaryCubeVisualizer;
    const panel = document.querySelector('#shadowrun-binary-cube-visualizer');
    const waitForState = async (predicate, label, attempts = 280) => {
      for (let attempt = 0; attempt < attempts; attempt += 1) {
        const state = Visualizer.currentState();
        if (predicate(state)) return state;
        await new Promise(resolve => setTimeout(resolve, 25));
      }
      throw new Error(label + ': ' + JSON.stringify(Visualizer.currentState()));
    };

    await waitForState(state => state.packageReady && state.roundTripValid && state.traceReady && !state.scenePreparing && !state.tracePreparing, 'Public Binary Cube visualizer did not settle.');

    const keyMode = panel.querySelector('[data-cube-visualizer-key-mode]');
    const size = panel.querySelector('[data-cube-visualizer-size]');
    const bits = panel.querySelector('[data-cube-trace-bits]');
    const generate = panel.querySelector('[data-cube-visualizer-generate]');
    if (!keyMode || !size || !bits || !generate) throw new Error('Public demonstration-key controls are incomplete.');
    if (![...keyMode.options].some(option => option.value === 'demonstration-flat-z-ripple' && /DEMONSTRATION ONLY · Flat Z Ripple/.test(option.textContent))) throw new Error('Public Flat Z Ripple option is missing or mislabeled.');

    bits.value = '0100110011010011';
    bits.dispatchEvent(new Event('input', { bubbles: true }));
    keyMode.value = 'demonstration-flat-z-ripple';
    keyMode.dispatchEvent(new Event('change', { bubbles: true }));
    size.value = '4';
    generate.click();

    const prepared = await waitForState(state => state.keyDemonstrationOnly && state.keyDemonstrationPattern === 'flat-z-ripple' && state.keyGeneratorMode === 'demonstration-flat-z-ripple' && state.gridSize === 4 && state.traceReady && !state.scenePreparing && !state.tracePreparing, 'Public Flat Z Ripple trace did not settle.');
    if (prepared.serialBitDurationMs !== 1400) throw new Error('Public serial duration is not 1400 ms.');

    const speed = panel.querySelector('[data-cube-trace-speed]');
    speed.value = '2';
    speed.dispatchEvent(new Event('change', { bubbles: true }));
    const viewportPlay = panel.querySelector('.cube-visualizer-viewport-play');
    if (!viewportPlay || !/Play Encoding/.test(viewportPlay.textContent)) throw new Error('Public viewport Play Encoding control is missing.');
    viewportPlay.click();
    await waitForState(state => state.tracePlaying && state.viewportSerialPlayback, 'Public viewport did not enter serial playback.');

    const sample = () => {
      const state = Visualizer.currentState();
      const phaseLabel = panel.querySelector('.cube-visualizer-phase-label');
      const translationLabel = panel.querySelector('.cube-visualizer-translation-label');
      if (!phaseLabel || !translationLabel) throw new Error('Public serial labels are missing.');
      const phaseText = phaseLabel.textContent || '';
      const translationText = translationLabel.textContent || '';
      const phaseMatch = phaseText.match(/SERIAL BIT (\\d+)\\/(\\d+).*?([0-9]+(?:\\.[0-9]+)?)% ROUTE.*?INPUT (\\d+) → KEY POINT \\(([-0-9]+), ([-0-9]+), ([-0-9]+)\\) → OUTPUT (\\d+)/);
      const translationMatch = translationText.match(/KEYED TRANSLATION · \\(([-0-9]+), ([-0-9]+), ([-0-9]+)\\)/);
      if (!phaseMatch) throw new Error('Public phase label does not expose the exact serial route: ' + phaseText);
      if (!translationMatch) throw new Error('Public keyed translation label is not active: ' + translationText);
      const routePoint = [Number(phaseMatch[5]), Number(phaseMatch[6]), Number(phaseMatch[7])];
      const translationPoint = [Number(translationMatch[1]), Number(translationMatch[2]), Number(translationMatch[3])];
      if (JSON.stringify(routePoint) !== JSON.stringify(translationPoint)) throw new Error('Public keyed translation label does not match the active route key point.');
      const computed = getComputedStyle(translationLabel);
      if (translationLabel.hidden || computed.display === 'none' || computed.position !== 'absolute') throw new Error('Public keyed translation label is not visibly positioned in the viewport.');
      return {
        traceTime: state.traceTime,
        bitNumber: Number(phaseMatch[1]),
        bitCount: Number(phaseMatch[2]),
        routePercent: Number(phaseMatch[3]),
        inputCell: Number(phaseMatch[4]),
        keyPoint: routePoint,
        outputCell: Number(phaseMatch[8]),
        translationPoint,
        translationLabel: translationText,
        translationLabelPosition: computed.position,
        playbackSpeed: state.tracePlaybackSpeed,
        viewportSerialPlayback: state.viewportSerialPlayback
      };
    };

    await new Promise(resolve => setTimeout(resolve, 180));
    const first = sample();
    let second = null;
    for (let attempt = 0; attempt < 80; attempt += 1) {
      await new Promise(resolve => setTimeout(resolve, 100));
      const candidate = sample();
      if (candidate.bitNumber > 1) throw new Error('Public serial playback advanced before an incremental first-bit tween sample could be observed: ' + JSON.stringify(candidate));
      if (candidate.bitNumber === 1 && candidate.inputCell === 0 && candidate.routePercent > first.routePercent && candidate.traceTime > first.traceTime) {
        second = candidate;
        break;
      }
    }
    if (!second) throw new Error('Public serial route did not expose incremental first-bit progress under the live Chromium scheduler.');
    if (first.bitNumber !== 1 || first.inputCell !== 0) throw new Error('Public serial playback did not begin on the first input bit.');
    if (first.playbackSpeed !== 2 || second.playbackSpeed !== 2) throw new Error('Public speed-selector setup did not remain at 2×.');
    if (second.routePercent >= 100) throw new Error('Public first-bit tween completed before an intermediate route state could be observed.');

    let next = null;
    for (let attempt = 0; attempt < 160; attempt += 1) {
      await new Promise(resolve => setTimeout(resolve, 100));
      const candidate = sample();
      if (candidate.bitNumber > 2) throw new Error('Public serial playback skipped the second input bit: ' + JSON.stringify(candidate));
      if (candidate.bitNumber === 2 && candidate.inputCell === 1) {
        next = candidate;
        break;
      }
    }
    if (!next) throw new Error('Public serial playback never advanced from bit 1 to bit 2 under the live Chromium scheduler.');

    viewportPlay.click();
    await new Promise(resolve => setTimeout(resolve, 80));
    const paused = Visualizer.currentState();
    if (paused.tracePlaying || paused.viewportSerialPlayback) throw new Error('Public serial playback did not pause cleanly.');

    return {
      format: 'hb-ttrpg-binary-cube-serial-pages-validation-receipt',
      schemaVersion: '0.1.0',
      pass: true,
      pathname: location.pathname,
      hash: '#scientific-tools',
      rendererVersion: prepared.rendererVersion,
      keyId: prepared.keyId,
      keyDemonstrationOnly: prepared.keyDemonstrationOnly,
      keyDemonstrationPattern: prepared.keyDemonstrationPattern,
      serialBitDurationMilliseconds: prepared.serialBitDurationMs,
      userSpeedSettingDuringTest: 2,
      speedOverrideIgnoredBySerialPlayback: true,
      exactKeyedTranslationLabel: true,
      firstSample: first,
      secondSample: second,
      nextBitSample: next
    };
  })()`, 'Validate public Binary Cube serial demonstration');

  assert.equal(receipt.pass, true);
  assert.equal(receipt.hash, '#scientific-tools');
  assert.equal(receipt.keyDemonstrationOnly, true);
  assert.equal(receipt.keyDemonstrationPattern, 'flat-z-ripple');
  assert.equal(receipt.serialBitDurationMilliseconds, 1400);
  assert.equal(receipt.userSpeedSettingDuringTest, 2);
  assert.equal(receipt.speedOverrideIgnoredBySerialPlayback, true);
  assert.equal(receipt.exactKeyedTranslationLabel, true);
  assert.equal(receipt.firstSample.bitNumber, 1);
  assert.equal(receipt.secondSample.bitNumber, 1);
  assert.equal(receipt.nextBitSample.bitNumber, 2);
  console.log(JSON.stringify(receipt, null, 2));
} finally {
  cdp?.close();
  terminate(browserProcess);
  terminate(xvfbProcess);
  await Promise.all([waitForExit(browserProcess), waitForExit(xvfbProcess)]);
  await removeDirectoryWithRetries(profileDirectory);
}
