#!/usr/bin/env node

import assert from 'node:assert/strict';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { performance } from 'node:perf_hooks';

const require = createRequire(import.meta.url);
const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, '..');
const Engine = require(path.join(repositoryRoot, 'shadowrun-binary-cube-engine.js'));
const Renderer = require(path.join(repositoryRoot, 'binary-cube-visualizer-renderer.js'));

function measure(operation) {
  const started = performance.now();
  const value = operation();
  return { value, milliseconds: performance.now() - started };
}

const sceneMeasurements = [];
for (const gridSize of [4, 64, 128, 256, 512, 1024]) {
  const keyReceipt = measure(() => Engine.createKey({
    gridSize,
    seed: `binary-cube-v9-measure-${gridSize}`,
    inputFace: 'top',
    outputFace: 'front',
    inputQuarterTurns: 0,
    outputQuarterTurns: 1,
    maskDensity: 0.75
  }));
  const planReceipt = measure(() => Renderer.resolveRenderPlan(gridSize, 'auto'));
  const pointReceipt = measure(() => Engine.buildPointsById(keyReceipt.value, planReceipt.value.pointIds));
  assert.equal(pointReceipt.value.length, planReceipt.value.renderedPointCount);
  sceneMeasurements.push({
    gridSize,
    totalPointCount: gridSize * gridSize,
    tier: planReceipt.value.tier,
    renderedPointCount: planReceipt.value.renderedPointCount,
    omittedPointCount: planReceipt.value.omittedPointCount,
    keyMilliseconds: keyReceipt.milliseconds,
    planMilliseconds: planReceipt.milliseconds,
    sampledPointBuildMilliseconds: pointReceipt.milliseconds,
    estimatedInterleavedBufferBytes: pointReceipt.value.length * 6 * Float32Array.BYTES_PER_ELEMENT
  });
}

const traceMeasurements = [];
for (const gridSize of [4, 12, 64, 128]) {
  const key = Engine.createKey({
    gridSize,
    seed: `binary-cube-v9-trace-measure-${gridSize}`,
    inputFace: 'left',
    outputFace: 'top',
    inputQuarterTurns: 1,
    outputQuarterTurns: 3,
    maskDensity: 1
  });
  const bitLength = Math.min(gridSize * gridSize, 16384);
  const bits = Array.from({ length: bitLength }, (_, index) => index % 5 < 2 ? '1' : '0').join('');
  const packageReceipt = measure(() => Engine.encryptBinary(bits, key));
  const traceReceipt = measure(() => Engine.traceEncryptBlock(bits, key, 0));
  const validationReceipt = measure(() => Engine.validateTransformationTrace(traceReceipt.value, key));
  assert.equal(traceReceipt.value.outputBlock, packageReceipt.value.ciphertext.slice(0, gridSize * gridSize));
  const plan = Renderer.resolveRenderPlan(gridSize, 'auto');
  const renderIdsReceipt = measure(() => Renderer.resolveTraceRenderPointIds(traceReceipt.value, plan, 0, 'all'));
  traceMeasurements.push({
    gridSize,
    pointCount: gridSize * gridSize,
    renderedTracePointCount: renderIdsReceipt.value.length,
    encryptionMilliseconds: packageReceipt.milliseconds,
    traceMilliseconds: traceReceipt.milliseconds,
    traceValidationMilliseconds: validationReceipt.milliseconds,
    traceSampleResolutionMilliseconds: renderIdsReceipt.milliseconds
  });
}

console.log(JSON.stringify({
  format: 'hb-ttrpg-shadowrun-binary-cube-v9-performance-measurement-receipt',
  schemaVersion: '0.1.0',
  nodeVersion: process.version,
  rendererVersion: Renderer.constants.RENDERER_VERSION,
  policy: Renderer.constants.RENDER_TIER_POLICY,
  sceneMeasurements,
  traceMeasurements,
  notes: [
    'Measurements are observational and are not hard timing thresholds.',
    'Canonical key and package work remains full resolution.',
    'Rendered point budgets cap WebGL upload size independently from encoding size.'
  ]
}, null, 2));
