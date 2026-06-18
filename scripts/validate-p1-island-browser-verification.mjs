import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const receiptPath = path.resolve(root, process.argv[2] || 'data/kaysender/receipts/p1-island-browser.json');
const receipt = JSON.parse(await fs.readFile(receiptPath, 'utf8'));
const runnerSource = await fs.readFile(path.join(root, 'scripts/run-p1-island-browser-verification.mjs'), 'utf8');
const indexSource = await fs.readFile(path.join(root, 'index.html'), 'utf8');

const expectedChecks = [
  'controllers-mounted',
  'prepared-runtime-unregistered',
  'atomic-scalar-edit',
  'safe-text-rendering',
  'stable-record-add',
  'stable-record-update',
  'unreferenced-record-remove',
  'referenced-record-protection',
  'precise-field-lock',
  'deliberate-surface-edit',
  'destructive-resize-preview',
  'non-destructive-expansion',
  'canonical-validation',
  'downstream-consumers',
  'lossless-round-trip'
];

assert.equal(receipt.schemaVersion, '1.0.0');
assert.equal(receipt.stage, 'P1');
assert.equal(receipt.stageId, 'floating-island-production-editor');
assert.equal(receipt.result, 'passed');
assert.ok(typeof receipt.completedAt === 'string' && !Number.isNaN(Date.parse(receipt.completedAt)));
assert.deepEqual(receipt.checks.map(check => check.id), expectedChecks);
assert.ok(receipt.checks.every(check => check.status === 'passed'));
assert.ok(receipt.checks.every(check => typeof check.detail === 'string' && check.detail.length > 20));
assert.ok(Array.isArray(receipt.dirtyTransitions));
assert.ok(receipt.dirtyTransitions.length >= 5, 'Browser verification did not observe enough real lifecycle transitions.');
assert.ok(receipt.dirtyTransitions.every(item => item.editorId === 'floating-island-editor'));
assert.ok(Array.isArray(receipt.diagnostics));
assert.equal(receipt.diagnostics.some(item => item.severity === 'error'), false, 'Browser verification retained error diagnostics.');
assert.ok(receipt.diagnostics.some(item => item.code === 'island-record-still-referenced'), 'Referenced-record protection did not emit its browser diagnostic.');
assert.equal(receipt.canonicalSummary.profileType, 'floating-island-foundation-profile');
assert.equal(receipt.canonicalSummary.schemaVersion, '3.0.0');
assert.equal(receipt.canonicalSummary.mapDimensions, '3x3');
assert.ok(receipt.canonicalSummary.mapCellCount >= 9);
for (const consumer of ['population', 'settlement', 'ecology', 'route']) {
  assert.ok(receipt.canonicalSummary.downstreamConsumers.includes(consumer), `Browser receipt omits ${consumer} downstream output.`);
}

for (const marker of [
  "import { chromium } from 'playwright'",
  "window.KaysenderEditorLifecycle = Object.freeze",
  "identityForm.requestSubmit()",
  "data-brush-id=\"terrain-forest\"",
  "surface.previewResize(1, 1",
  "surface.resize(3, 3",
  "KaysenderIslandV3Schema.validate(canonical)",
  "KaysenderIslandV3Domain.validate(canonical)",
  "JSON.parse(JSON.stringify(canonical))"
]) assert.ok(runnerSource.includes(marker), `P1 browser runner is missing '${marker}'.`);

for (const preparedAsset of [
  'kaysender-island-v3-profile-model.js',
  'kaysender-island-v3-panels.js',
  'kaysender-island-v3-panels-lifecycle.js',
  'kaysender-island-v3-panels-atomic.js',
  'kaysender-island-surface-grid-controller.js'
]) assert.equal(indexSource.includes(preparedAsset), false, `${preparedAsset} was activated by the browser-verification work.`);

console.log('P1 Island browser verification receipt passed validation.');
console.log(`Verified ${receipt.checks.length} rendered Chromium interactions, ${receipt.dirtyTransitions.length} lifecycle transitions, canonical schema/domain validity, lossless round-trip, and standard downstream consumers.`);
