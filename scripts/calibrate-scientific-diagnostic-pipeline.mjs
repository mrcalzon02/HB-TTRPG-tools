#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import vm from 'node:vm';
import { TextEncoder, TextDecoder } from 'node:util';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const Pipeline = require(path.join(root, 'binary-cube-diagnostic-pipeline.js'));
const Registry = require(path.join(root, 'binary-cube-diagnostic-calibration-registry.js'));
const LocalMedia = require(path.join(root, 'scientific-tools-local-media.js'));

function loadDemoCorpus() {
  const source = fs.readFileSync(path.join(root, 'binary-cube-media-forensics-demo-corpus.js'), 'utf8');
  const context = vm.createContext({ console, TextEncoder, TextDecoder, Uint8Array, Uint8ClampedArray, Float32Array, DataView, ArrayBuffer, Map, Set, Object, Array, Math, Promise, Number, String, Boolean, JSON, Error, TypeError });
  context.globalThis = context;
  vm.runInContext(source, context, { filename: 'binary-cube-media-forensics-demo-corpus.js' });
  if (!context.BinaryCubeMediaForensicsDemoCorpus?.buildDemoBytes) throw new Error('Known-ground-truth demonstration corpus did not expose buildDemoBytes.');
  return context.BinaryCubeMediaForensicsDemoCorpus;
}

const Corpus = loadDemoCorpus();
const EXPECTATIONS = Object.freeze([
  Object.freeze({ fixtureId: 'clean-control', detectorId: 'media-forensic-sweep', expected: 'negative', family: 'clean-raster-control' }),
  Object.freeze({ fixtureId: 'clean-control', detectorId: 'png-structure', expected: 'negative', family: 'clean-raster-control' }),
  Object.freeze({ fixtureId: 'clean-control', detectorId: 'raster-steganalysis', expected: 'negative', family: 'clean-raster-control' }),
  Object.freeze({ fixtureId: 'rgb-lsb', detectorId: 'png-structure', expected: 'negative', family: 'pixel-domain-lsb' }),
  Object.freeze({ fixtureId: 'rgb-lsb', detectorId: 'raster-steganalysis', expected: 'positive', family: 'pixel-domain-lsb' }),
  Object.freeze({ fixtureId: 'post-iend', detectorId: 'media-forensic-sweep', expected: 'positive', family: 'appended-container-data' }),
  Object.freeze({ fixtureId: 'post-iend', detectorId: 'png-structure', expected: 'positive', family: 'appended-container-data' }),
  Object.freeze({ fixtureId: 'afsk1200', detectorId: 'audio-signal-forensics', expected: 'positive', family: 'audio-afsk' }),
  Object.freeze({ fixtureId: 'dtmf', detectorId: 'audio-signal-forensics', expected: 'positive', family: 'audio-dtmf' })
]);

const reports = new Map();
for (const demo of Corpus.demos) {
  const bytes = Uint8Array.from(Corpus.buildDemoBytes(demo.id));
  let raster = null;
  try { raster = LocalMedia.decodePngRgba(bytes); } catch (_) { raster = null; }
  const report = await Pipeline.runPipeline(bytes, { sourceName: demo.downloadName, mimeType: demo.mimeType, profile: 'thorough', raster });
  reports.set(demo.id, report);
}

const receipts = EXPECTATIONS.map(expectation => {
  const report = reports.get(expectation.fixtureId);
  const finding = report?.findings?.find(item => item.detectorId === expectation.detectorId) || null;
  const observedPositive = finding ? Registry.isObservedPositive(finding) : false;
  return Object.freeze({
    format: Registry.constants.RECEIPT_FORMAT,
    schemaVersion: Registry.constants.SCHEMA_VERSION,
    fixtureId: expectation.fixtureId,
    detectorId: expectation.detectorId,
    concealmentFamily: expectation.family,
    expected: expectation.expected,
    completed: Boolean(finding && finding.status !== 'error'),
    observedPositive,
    pass: expectation.expected === 'positive' ? observedPositive : !observedPositive,
    status: finding?.status || 'missing',
    positiveEvidence: Number(finding?.positiveEvidence || 0),
    negativeEvidence: Number(finding?.negativeEvidence || 0),
    runtimeReliability: Number(finding?.runtimeReliability ?? finding?.reliability ?? 0),
    sampleSufficiency: Number(finding?.sampleSufficiency || 0),
    metrics: finding?.metrics || {},
    note: 'Ground-truth calibration receipt; a failed expectation is retained as measured detector behavior rather than rewritten into a pass.'
  });
});

const snapshot = Registry.buildSnapshot(receipts, { generatedBy: 'scripts/calibrate-scientific-diagnostic-pipeline.mjs', corpusVersion: Corpus.constants.DEMO_VERSION });
const fixtureSummaries = Corpus.demos.map(demo => {
  const report = reports.get(demo.id);
  return Object.freeze({ fixtureId: demo.id, sourceName: demo.downloadName, classification: report.classification.subtype, presenceIndex: report.indices.presenceIndex, certaintyIndex: report.indices.certaintyIndex, coverageIndex: report.indices.coverageIndex, missRiskIndex: report.indices.missRiskIndex, detectorStatuses: Object.freeze(report.findings.map(item => Object.freeze({ detectorId: item.detectorId, status: item.status, positiveEvidence: item.positiveEvidence, sampleSufficiency: item.sampleSufficiency }))) });
});
const output = Object.freeze({
  format: 'hb-ttrpg-scientific-diagnostic-calibration-run',
  schemaVersion: '0.1.0',
  corpusVersion: Corpus.constants.DEMO_VERSION,
  pipelineVersion: Pipeline.version,
  registryVersion: Registry.version,
  expectationCount: EXPECTATIONS.length,
  passCount: receipts.filter(item => item.pass).length,
  failCount: receipts.filter(item => !item.pass).length,
  snapshot,
  fixtureSummaries: Object.freeze(fixtureSummaries),
  boundary: 'Failures are calibration observations, not automatically test failures. CI validates that controlled fixtures and expected detector paths execute; measured false positives/negatives remain visible in the receipt.'
});

const serialized = JSON.stringify(output, null, 2) + '\n';
const jsonArg = process.argv.find(argument => argument.startsWith('--json='));
if (jsonArg) fs.writeFileSync(path.resolve(jsonArg.slice('--json='.length)), serialized);
process.stdout.write(serialized);
