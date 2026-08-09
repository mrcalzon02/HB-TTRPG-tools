#!/usr/bin/env node

import assert from 'node:assert/strict';
import path from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';

const originalWindow = globalThis.window;
const originalDocument = globalThis.document;
const originalPerformance = globalThis.performance;
const originalSetTimeout = globalThis.setTimeout;

let fakeNow = 0;
let yieldCount = 0;
globalThis.window = globalThis;
globalThis.document = { visibilityState: 'hidden' };
globalThis.performance = { now: () => fakeNow };
globalThis.setTimeout = (callback, delay = 0, ...args) => {
  yieldCount += 1;
  return originalSetTimeout(callback, delay, ...args);
};

try {
  await import(`${pathToFileURL(path.join(process.cwd(), 'scientific-tools-cooperative-runner.js')).href}?validation=${Date.now()}`);
  const runner = globalThis.ScientificToolsCooperativeRunner;
  assert.ok(runner, 'Cooperative runner must install on window/globalThis.');
  assert.equal(runner.DEFAULT_MAX_SLICE_MS, 8, 'Default slice budget must remain explicit and bounded.');

  const order = [];
  const progress = [];
  fakeNow = 0;
  yieldCount = 0;
  await runner.forRange({
    start: 0,
    end: 10,
    chunkSize: 100,
    maxSliceMs: 5,
    label: 'slow deterministic test',
    step(index) {
      order.push(index);
      fakeNow += 3;
    },
    onProgress(update) { progress.push(update); }
  });

  assert.deepEqual(order, [0,1,2,3,4,5,6,7,8,9], 'Time slicing must not change deterministic operation order.');
  assert.equal(yieldCount, 4, 'Ten 3ms items under a 5ms budget should yield after each two-item slice except the final slice.');
  assert.ok(progress.length >= 1, 'Progress must still be reported.');
  assert.ok(progress.every(update => update.sliceItems <= 2), 'A time-budgeted slice must stop once its measured budget is reached.');
  assert.equal(progress.at(-1).fraction, 1, 'Final progress must reach 100%.');

  const token = runner.createToken('cancellation test');
  const cancelledOrder = [];
  fakeNow = 0;
  await assert.rejects(
    runner.forRange({
      start: 0,
      end: 20,
      chunkSize: 20,
      maxSliceMs: 50,
      token,
      step(index) {
        cancelledOrder.push(index);
        fakeNow += 1;
        if (index === 3) token.cancel('test stop');
      }
    }),
    error => error?.name === 'CooperativeCancelledError'
  );
  assert.deepEqual(cancelledOrder, [0,1,2,3], 'Cancellation must be checked between individual work items, not only between large chunks.');

  console.log(JSON.stringify({
    format: 'hb-ttrpg-cooperative-slice-budget-receipt',
    schemaVersion: '0.1.0',
    pass: true,
    defaultMaxSliceMs: runner.DEFAULT_MAX_SLICE_MS,
    deterministicOrder: true,
    timeBudgetYieldCount: yieldCount,
    perItemCancellation: true
  }, null, 2));
} finally {
  if (originalWindow === undefined) delete globalThis.window; else globalThis.window = originalWindow;
  if (originalDocument === undefined) delete globalThis.document; else globalThis.document = originalDocument;
  globalThis.performance = originalPerformance;
  globalThis.setTimeout = originalSetTimeout;
  delete globalThis.ScientificToolsCooperativeRunner;
}
