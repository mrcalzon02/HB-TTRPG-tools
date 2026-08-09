#!/usr/bin/env node

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import vm from 'node:vm';

const root = process.cwd();
const source = fs.readFileSync(path.join(root, 'binary-cube-steganalysis-worker-client.js'), 'utf8');
const workerSource = fs.readFileSync(path.join(root, 'binary-cube-steganalysis-worker.js'), 'utf8');

const workers = [];
class FakeWorker {
  constructor(url) {
    this.url = String(url);
    this.listeners = new Map();
    this.terminated = false;
    this.messages = [];
    workers.push(this);
  }
  addEventListener(type, handler) {
    const rows = this.listeners.get(type) || [];
    rows.push(handler);
    this.listeners.set(type, rows);
  }
  postMessage(message, transfer = []) {
    this.messages.push({ message, transfer });
    if (message.operation === 'slow-test') return;
    queueMicrotask(() => {
      for (const handler of this.listeners.get('message') || []) handler({ data: { id: message.id, type: 'progress', stage: 'fake worker progress', fraction: 0.5 } });
      for (const handler of this.listeners.get('message') || []) handler({ data: { id: message.id, type: 'result', result: { operation: message.operation, width: message.width, height: message.height } } });
    });
  }
  terminate() { this.terminated = true; }
}

const context = vm.createContext({
  window: {},
  Worker: FakeWorker,
  URL,
  document: { baseURI: 'https://example.test/tools/' },
  globalThis: null,
  performance: { now: () => Date.now() },
  Date,
  Error,
  Map,
  Array,
  ArrayBuffer,
  Uint8Array,
  Uint8ClampedArray,
  setInterval,
  clearInterval,
  queueMicrotask,
  Number,
  String,
  Boolean,
  Object,
  Math
});
context.globalThis = context;
vm.runInContext(source, context, { filename: 'binary-cube-steganalysis-worker-client.js' });
const Client = context.window.BinaryCubeSteganalysisWorkerClient;
assert.ok(Client, 'Worker client must expose BinaryCubeSteganalysisWorkerClient.');
assert.equal(Client.heartbeatIntervalMs, 1000);
assert.match(Client.workerUrl, /binary-cube-steganalysis-worker\.js/);

const original = new Uint8ClampedArray([10, 20, 30, 255]);
let progressSeen = false;
const result = await Client.profileRaster(original, 1, 1, { tileSize: 32, channels: ['r','g','b','luma'], onProgress: () => { progressSeen = true; } });
assert.equal(result.operation, 'raster-evidence-profile');
assert.equal(result.width, 1);
assert.equal(result.height, 1);
assert.equal(original[0], 10, 'profileRaster must copy caller RGBA bytes before transferring its worker buffer.');
assert.equal(workers.length, 1);
const sent = workers[0].messages[0];
assert.equal(sent.message.operation, 'raster-evidence-profile');
assert.deepEqual(Array.from(sent.message.channels), ['r','g','b','luma']);
assert.equal(sent.transfer.length, 1, 'Raster profile should transfer the copied RGBA buffer instead of structured-cloning it again.');
assert.notEqual(sent.message.rgba, original.buffer, 'Transferred raster buffer must not be the caller-owned buffer.');
assert.equal(progressSeen, true);

const pending = Client.run('slow-test');
assert.equal(Client.isBusy(), true);
assert.equal(Client.cancelAll('validator cancellation'), true);
await assert.rejects(pending, error => error?.name === 'AbortError' && /validator cancellation/.test(error.message));
assert.equal(workers[0].terminated, true);
assert.equal(Client.isBusy(), false);

for (const required of [
  "const HEARTBEAT_INTERVAL_MS = 1000;",
  "function profileRaster(",
  "new Uint8ClampedArray(rgbaValue)",
  "run('raster-evidence-profile'",
  "transfer: [rgba.buffer]",
  "worker.terminate()",
  "function cancelAll("
]) assert.ok(source.includes(required), `Worker client missing freeze-safe contract token ${required}.`);
for (const forbidden of ['function rsAnalysis(', 'function samplePairAnalysis(', 'function residualCooccurrence(', 'function lsbPairChiSquare(']) assert.ok(!source.includes(forbidden), `Worker client must not duplicate detector math: ${forbidden}`);
assert.ok(workerSource.includes("operation === 'raster-evidence-profile'"));
assert.ok(workerSource.includes('EvidenceProfile.profileRaster'));

console.log(JSON.stringify({
  receipt: 'hb-ttrpg-steganalysis-worker-client-validation-receipt',
  schemaVersion: '0.1.0',
  pass: true,
  rasterProfileRunsInWorker: true,
  callerBufferPreserved: true,
  copiedBufferTransferred: true,
  livenessHeartbeatMilliseconds: Client.heartbeatIntervalMs,
  terminationCancellation: true,
  detectorMathDuplicated: false
}, null, 2));
