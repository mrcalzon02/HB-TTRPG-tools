#!/usr/bin/env node

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { TextEncoder, TextDecoder } from 'node:util';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const Steganalysis = require(path.join(root, 'binary-cube-steganalysis-engine.js'));
const EvidenceProfile = require(path.join(root, 'binary-cube-steganalysis-evidence-profile.js'));
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

const routedSteganalysis = Object.freeze({
  ...Steganalysis,
  inspectPngMetadata() {
    return Object.freeze({ valid: true, chunks: Object.freeze([]), textChunks: Object.freeze([]), trailingBytes: 0, caveat: 'Neutral PNG structure stub for routed raster validation.' });
  }
});

globalThis.BinaryCubeSteganalysisEngine = routedSteganalysis;
globalThis.BinaryCubeSteganalysisEvidenceProfile = EvidenceProfile;
globalThis.BinaryCubeInformationAnalysisSuite = Object.freeze({
  async analyzeInformation() {
    return Object.freeze({ evidenceScore: 0, evidenceClass: 'structured-control', entropy: 0, compressionRatio: 1, printableFraction: 0, encodingLayers: Object.freeze([]), signatures: Object.freeze([]), strings: Object.freeze([]), strongestLags: Object.freeze([]), caveat: 'Neutral information-analysis stub.' });
  },
  async rankDeobfuscationCandidates() { return Object.freeze([]); }
});
globalThis.BinaryCubeMediaForensicsSuite = Object.freeze({
  async fullForensicSweepAsync() {
    return Object.freeze({ bytes: Object.freeze({ container: Object.freeze({ trailingBytes: 0 }), candidates: Object.freeze([]) }), wav: null, caveat: 'Neutral media-forensics stub.' });
  }
});
globalThis.BinaryCubeDiagnosticCalibrationRegistry = Object.freeze({
  version: 'test-neutral',
  defaultSnapshot: null,
  calibrationFor() { return null; },
  effectiveWeight(_detectorId, weight) { return weight; }
});
globalThis.BinaryCubeDiagnosticCalibrationBaseline = Object.freeze({ snapshot: null });

const pipelinePath = path.join(root, 'binary-cube-diagnostic-pipeline.js');
delete require.cache[require.resolve(pipelinePath)];
const Pipeline = require(pipelinePath);

function fixture(id) {
  const bytes = Uint8Array.from(Corpus.buildDemoBytes(id));
  const raster = LocalMedia.decodePngRgba(bytes);
  return Object.freeze({ bytes, raster });
}

function selectedProfile(raster, channel = 'luma') {
  const profile = EvidenceProfile.profileRaster(raster.rgba, raster.width, raster.height, { tileSize: 64, channels: ['r', 'g', 'b', 'luma'] });
  const selected = profile.channels.find(record => record.channel === channel);
  if (!selected) throw new Error(`Evidence profile omitted ${channel}.`);
  return Object.freeze({ profile, selected });
}

async function routed(id) {
  const source = fixture(id);
  const report = await Pipeline.runPipeline(source.bytes, {
    sourceName: id,
    mimeType: 'image/png',
    profile: 'thorough',
    raster: source.raster,
    rasterChannel: 'luma',
    tileSize: 64
  });
  const rasterFinding = report.findings.find(item => item.detectorId === 'raster-steganalysis');
  if (!rasterFinding) throw new Error(`Routed report omitted raster-steganalysis for ${id}.`);
  return Object.freeze({ source, report, rasterFinding, reference: selectedProfile(source.raster) });
}

const clean = await routed('clean-control');
const known = await routed('rgb-lsb');

assert.equal(Pipeline.version, '0.3.0', 'Diagnostic Pipeline version must advance with the evidence-ledger schema.');
assert.equal(Pipeline.constants.REPORT_SCHEMA_VERSION, '0.3.0', 'Diagnostic report schema must expose miss-risk evidence explicitly.');

const expectedMagic = Object.freeze({
  png: Object.freeze([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]),
  jpeg: Object.freeze([0xff,0xd8,0xff]),
  gif: Object.freeze([0x47,0x49,0x46,0x38]),
  riff: Object.freeze([0x52,0x49,0x46,0x46]),
  pdf: Object.freeze([0x25,0x50,0x44,0x46]),
  zip: Object.freeze([0x50,0x4b,0x03,0x04]),
  gzip: Object.freeze([0x1f,0x8b]),
  '7zip': Object.freeze([0x37,0x7a,0xbc,0xaf,0x27,0x1c]),
  rar: Object.freeze([0x52,0x61,0x72,0x21,0x1a,0x07]),
  elf: Object.freeze([0x7f,0x45,0x4c,0x46]),
  pe: Object.freeze([0x4d,0x5a])
});
assert.equal(Pipeline.constants.MAGIC.length, Object.keys(expectedMagic).length, 'Diagnostic format classifier signature inventory changed unexpectedly.');
for (const [id, bytes] of Object.entries(expectedMagic)) {
  assert.deepEqual(Array.from(Pipeline.constants.MAGIC.find(item => item.id === id)?.bytes || []), Array.from(bytes), `Existing ${id} magic classification must not regress while raster routing is edited.`);
}

for (const row of [clean, known]) {
  const legacy = row.reference.selected.global.legacyPayloadMagnitudeEvidence;
  assert.ok(Math.abs(row.rasterFinding.positiveEvidence - legacy) < 1e-12, `${row.report.source.sourceName}: Asset Presence evidence must remain the legacy selected-channel scalar.`);
  assert.equal(row.rasterFinding.status, row.reference.selected.global.legacyStatus, `${row.report.source.sourceName}: selected-channel legacy status must remain unchanged.`);
  assert.equal(row.rasterFinding.metrics.legacyChannel, 'luma');
  assert.equal(row.rasterFinding.metrics.evidenceProfileVersion, EvidenceProfile.version);
  assert.equal(row.rasterFinding.metrics.crossChannel.channelCount, 4);
  assert.ok(Array.isArray(row.rasterFinding.metrics.diagnosticFlags));

  const neutralFindings = row.report.findings.map(item => ({ ...item, missRiskEvidence: 0 }));
  const neutralIndices = Pipeline.aggregateEvidence(row.report.plan, neutralFindings, row.report.errors);
  assert.ok(Math.abs(row.report.indices.presenceIndex - neutralIndices.presenceIndex) < 1e-12, `${row.report.source.sourceName}: unresolved evidence must not alter Asset Presence.`);
  assert.ok(Math.abs(row.report.indices.certaintyIndex - neutralIndices.certaintyIndex) < 1e-12, `${row.report.source.sourceName}: unresolved evidence must not alter Certainty.`);
  assert.ok(row.report.indices.missRiskIndex + 1e-12 >= neutralIndices.missRiskIndex, `${row.report.source.sourceName}: unresolved evidence may only preserve or raise Miss-Risk.`);
}

assert.equal(known.rasterFinding.status, 'negative', 'The measured RGB-LSB false negative must remain preserved until calibrated detector evidence supports a verdict change.');
assert.ok(known.rasterFinding.positiveEvidence > clean.rasterFinding.positiveEvidence, 'Known RGB-LSB control should retain its larger below-threshold legacy scalar.');
assert.ok(known.rasterFinding.metrics.diagnosticFlags.some(flag => flag.id === 'nonzero-below-legacy-threshold'), 'Known RGB-LSB control must preserve the below-threshold unresolved condition.');
assert.ok(!clean.rasterFinding.metrics.diagnosticFlags.some(flag => flag.id === 'nonzero-below-legacy-threshold'), 'Clean control must not inherit the RGB-LSB below-threshold condition.');
assert.ok(known.rasterFinding.missRiskEvidence > clean.rasterFinding.missRiskEvidence, 'Known RGB-LSB unresolved evidence must raise detector miss-risk more than the clean control.');
assert.ok(known.report.indices.unresolvedEvidenceIndex > clean.report.indices.unresolvedEvidenceIndex, 'Routed unresolved-evidence index must distinguish the known false-negative control from the clean control.');

const repeatedLocalization = Pipeline.utilities.rasterMissRiskEvidence({ diagnosticFlags: [
  { id: 'localized-global-divergence' },
  { id: 'localized-global-divergence' },
  { id: 'localized-global-divergence' }
] });
assert.ok(Math.abs(repeatedLocalization - Pipeline.constants.RASTER_UNRESOLVED_FLAG_WEIGHTS['localized-global-divergence']) < 1e-12, 'Repeated copies of one diagnostic symptom must not multiply its miss-risk contribution.');

const receipt = Object.freeze({
  receipt: 'hb-ttrpg-diagnostic-raster-evidence-routing-validation-receipt',
  schemaVersion: '0.1.0',
  pass: true,
  pipelineVersion: Pipeline.version,
  reportSchemaVersion: Pipeline.constants.REPORT_SCHEMA_VERSION,
  formatSignatureCount: Pipeline.constants.MAGIC.length,
  clean: Object.freeze({
    status: clean.rasterFinding.status,
    positiveEvidence: clean.rasterFinding.positiveEvidence,
    missRiskEvidence: clean.rasterFinding.missRiskEvidence,
    unresolvedEvidenceIndex: clean.report.indices.unresolvedEvidenceIndex,
    missRiskIndex: clean.report.indices.missRiskIndex,
    diagnosticFlags: clean.rasterFinding.metrics.diagnosticFlags
  }),
  knownRgbLsb: Object.freeze({
    status: known.rasterFinding.status,
    positiveEvidence: known.rasterFinding.positiveEvidence,
    missRiskEvidence: known.rasterFinding.missRiskEvidence,
    unresolvedEvidenceIndex: known.report.indices.unresolvedEvidenceIndex,
    missRiskIndex: known.report.indices.missRiskIndex,
    diagnosticFlags: known.rasterFinding.metrics.diagnosticFlags
  }),
  presenceVerdictChanged: false,
  boundary: 'Cross-channel and localized raster structure is routed into a separate miss-risk evidence field. The legacy selected-channel scalar and thresholds remain authoritative for Asset Presence in this revision.'
});

console.log(JSON.stringify(receipt, null, 2));
