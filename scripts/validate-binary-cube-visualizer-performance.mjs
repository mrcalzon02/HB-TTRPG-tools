#!/usr/bin/env node

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, '..');
const Engine = require(path.join(repositoryRoot, 'shadowrun-binary-cube-engine.js'));
const Renderer = require(path.join(repositoryRoot, 'binary-cube-visualizer-renderer.js'));
globalThis.ShadowrunBinaryCubeEngine = Engine;
globalThis.BinaryCubeVisualizerRenderer = Renderer;
const Visualizer = require(path.join(repositoryRoot, 'shadowrun-binary-cube-visualizer.js'));
const engineSource = fs.readFileSync(path.join(repositoryRoot, 'shadowrun-binary-cube-engine.js'), 'utf8');
const rendererSource = fs.readFileSync(path.join(repositoryRoot, 'binary-cube-visualizer-renderer.js'), 'utf8');
const controllerSource = fs.readFileSync(path.join(repositoryRoot, 'shadowrun-binary-cube-visualizer.js'), 'utf8');
const styleSource = fs.readFileSync(path.join(repositoryRoot, 'binary-cube-visualizer.css'), 'utf8');

assert.equal(Renderer.constants.RENDERER_VERSION, '0.5.0');
assert.deepEqual(Renderer.constants.RENDER_QUALITIES, ['auto', 'exact', 'sampled', 'aggregate']);
assert.deepEqual(Visualizer.constants.RENDER_QUALITIES, ['auto', 'exact', 'sampled', 'aggregate']);
assert.equal(Visualizer.constants.MAX_STATIC_GRID_SIZE, 1024);
assert.equal(Visualizer.constants.MAX_MANUAL_TRACE_GRID_SIZE, 12);
assert.equal(Visualizer.constants.MAX_SAMPLED_TRACE_GRID_SIZE, 256);
assert.equal(typeof Engine.buildPointsById, 'function');
assert.equal(typeof Renderer.resolveRenderPlan, 'function');
assert.equal(typeof Renderer.deterministicSamplePointIds, 'function');
assert.equal(typeof Renderer.resolveTraceRenderPointIds, 'function');

const key = Engine.createKey({
  gridSize: 12,
  seed: 'binary-cube-v9-sample-authority',
  inputFace: 'left',
  outputFace: 'top',
  inputQuarterTurns: 3,
  outputQuarterTurns: 1,
  maskDensity: 0.75
});
const allPoints = Engine.buildPoints(key);
const requestedIds = [0, 11, 12, 37, 71, 143];
const sampledPoints = Engine.buildPointsById(key, requestedIds);
assert.deepEqual(sampledPoints, requestedIds.map(pointId => allPoints[pointId]), 'Canonical sampled point construction diverged from the complete point field.');
assert.throws(() => Engine.buildPointsById(key, [0, 0]), /more than once/);
assert.throws(() => Engine.buildPointsById(key, [144]), /0 through 143/);

const plans = {
  detailed: Renderer.resolveRenderPlan(4, 'auto'),
  batched: Renderer.resolveRenderPlan(64, 'auto'),
  sampled: Renderer.resolveRenderPlan(128, 'auto'),
  aggregate: Renderer.resolveRenderPlan(512, 'auto'),
  exact128: Renderer.resolveRenderPlan(128, 'exact'),
  exactFallback: Renderer.resolveRenderPlan(512, 'exact')
};
assert.equal(plans.detailed.tier, 'detailed');
assert.equal(plans.detailed.renderedPointCount, 16);
assert.equal(plans.detailed.fullRepresentation, true);
assert.equal(plans.batched.tier, 'batched');
assert.equal(plans.batched.renderedPointCount, 4096);
assert.equal(plans.batched.fullRepresentation, true);
assert.equal(plans.sampled.tier, 'sampled');
assert.equal(plans.sampled.totalPointCount, 16384);
assert.equal(plans.sampled.renderedPointCount, 8192);
assert.equal(plans.sampled.fullRepresentation, false);
assert.equal(plans.aggregate.tier, 'aggregate');
assert.equal(plans.aggregate.totalPointCount, 262144);
assert.equal(plans.aggregate.renderedPointCount, 2048);
assert.equal(plans.exact128.effectiveQuality, 'exact');
assert.equal(plans.exact128.renderedPointCount, 16384);
assert.equal(plans.exactFallback.fallback, true);
assert.equal(plans.exactFallback.effectiveQuality, 'sampled');
assert.equal(plans.exactFallback.renderedPointCount, 8192);

for (const plan of Object.values(plans)) {
  assert.equal(new Set(plan.pointIds).size, plan.pointIds.length, `${plan.tier} point IDs must be unique.`);
  assert.ok(plan.pointIds.every(pointId => Number.isInteger(pointId) && pointId >= 0 && pointId < plan.totalPointCount));
  assert.ok(plan.pointIds.includes(0));
  assert.ok(plan.pointIds.includes(plan.totalPointCount - 1));
}
assert.deepEqual(
  Renderer.deterministicSamplePointIds(128, 8192),
  Renderer.deterministicSamplePointIds(128, 8192),
  'Sample IDs must be deterministic.'
);
const selectedPointId = 12345;
const selectedRow = 77;
const selectedSample = Renderer.deterministicSamplePointIds(128, 8192, { selectedPointId, selectedRow });
assert.ok(selectedSample.includes(selectedPointId), 'The selected point must remain in a sampled representation.');
assert.ok(selectedSample.some(pointId => Math.floor(pointId / 128) === selectedRow), 'The selected row must contribute to the sampled cohort.');

const bits = Array.from({ length: 91 }, (_, index) => index % 3 === 0 ? '1' : '0').join('');
const traceKey = Engine.createKey({ gridSize: 12, seed: 'binary-cube-v9-trace-sample', inputFace: 'top', outputFace: 'front', maskDensity: 1 });
const trace = Engine.traceEncryptBlock(bits, traceKey, 0);
Engine.validateTransformationTrace(trace, traceKey);
const tracePlan = Renderer.resolveRenderPlan(12, 'aggregate');
const traceIds = Renderer.resolveTraceRenderPointIds(trace, tracePlan, 91, 'row');
assert.equal(traceIds.length, 144, 'A small trace must not omit points when the total is below the aggregate budget.');
assert.ok(traceIds.includes(91));

for (const selector of [
  'data-cube-visualizer-render-quality',
  'data-cube-visualizer-representation-notice',
  'data-cube-visualizer-performance-metrics',
  'data-cube-visualizer-cancel-preparation',
  'data-cube-trace-representation-notice'
]) assert.match(controllerSource, new RegExp(selector), `V9 controller is missing ${selector}.`);
for (const className of ['cube-performance-panel', 'cube-representation-notice', 'cube-performance-metrics', 'cube-trace-representation-notice']) {
  assert.match(styleSource, new RegExp(`\\.${className}`), `V9 styling is missing .${className}.`);
}
assert.match(controllerSource, /sceneBuildGeneration/);
assert.match(controllerSource, /traceBuildGeneration/);
assert.match(controllerSource, /staleSceneResultsDiscarded/);
assert.match(controllerSource, /staleTraceResultsDiscarded/);
assert.match(controllerSource, /cancelPendingPreparation/);
assert.match(controllerSource, /buildPackageBlockDescriptors/);
assert.match(controllerSource, /activeTraces\.filter\(Boolean\)/);
assert.equal(rendererSource.includes('ShadowrunBinaryCubeEngine'), false, 'Renderer must remain isolated from canonical encoding logic.');
assert.equal(rendererSource.includes('Engine.'), false, 'Renderer must not call the canonical engine.');
assert.equal(controllerSource.includes('Engine.transformBlock'), false, 'Controller must not reconstruct Binary Cube transformations.');
assert.match(engineSource, /function buildPointsById/);

const performancePolicy = Renderer.constants.RENDER_TIER_POLICY;
console.log(JSON.stringify({
  format: 'hb-ttrpg-shadowrun-binary-cube-v9-performance-validation-receipt',
  schemaVersion: '0.1.0',
  rendererVersion: Renderer.constants.RENDERER_VERSION,
  performancePolicy,
  plans: Object.fromEntries(Object.entries(plans).map(([name, plan]) => [name, {
    gridSize: plan.gridSize,
    tier: plan.tier,
    requestedQuality: plan.requestedQuality,
    effectiveQuality: plan.effectiveQuality,
    totalPointCount: plan.totalPointCount,
    renderedPointCount: plan.renderedPointCount,
    omittedPointCount: plan.omittedPointCount,
    fallback: plan.fallback
  }])),
  canonicalSampleParity: true,
  deterministicSampling: true,
  selectedPointRetention: true,
  selectedRowCohort: true,
  staleResultGuardsPresent: true,
  cancellationBoundaryPresent: true,
  rendererAlgorithmIsolationPreserved: true,
  encodingResolutionIndependentFromRendering: true
}, null, 2));
