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
const Editor = require(path.join(repositoryRoot, 'shadowrun-binary-cube-editor.js'));
const Auth = require(path.join(repositoryRoot, 'shadowrun-binary-cube-auth.js'));
const SecureExport = require(path.join(repositoryRoot, 'shadowrun-binary-cube-secure-export.js'));

globalThis.ShadowrunBinaryCubeEngine = Engine;
globalThis.ShadowrunBinaryCubeAuth = Auth;
globalThis.ShadowrunBinaryCubeSecureExport = SecureExport;
globalThis.BinaryCubeVisualizerRenderer = Object.freeze({
  constants: Object.freeze({
    RENDERER_VERSION: '0.5.0',
    PLAYBACK_MODES: Object.freeze(['all', 'selected', 'row']),
    RENDER_TIER_POLICY: Object.freeze({ batchedMaximum: 64 })
  }),
  resolveTraceTimeline(value, phaseCount = 10) {
    const traceTime = Math.max(0, Math.min(1, Number(value) || 0));
    const phasePosition = traceTime * Math.max(1, phaseCount - 1);
    const phaseIndex = Math.floor(phasePosition + 1e-9);
    const nextPhaseIndex = Math.min(phaseCount - 1, phaseIndex + 1);
    return { traceTime, phasePosition, phaseIndex, nextPhaseIndex, segmentProgress: phasePosition - phaseIndex };
  },
  tracePointPosition() { return [0, 0, 0]; },
  resolveRenderPlan(gridSize) { return { tier: gridSize <= 64 ? 'batched' : 'sampled', effectiveQuality: 'auto', fallback: gridSize > 64, renderedPointCount: Math.min(gridSize * gridSize, 8192) }; }
});
const Visualizer = require(path.join(repositoryRoot, 'shadowrun-binary-cube-visualizer.js'));

const visualizerSource = fs.readFileSync(path.join(repositoryRoot, 'shadowrun-binary-cube-visualizer.js'), 'utf8');
const laboratorySource = fs.readFileSync(path.join(repositoryRoot, 'shadowrun-binary-cube-encryption.js'), 'utf8');
const authUiSource = fs.readFileSync(path.join(repositoryRoot, 'shadowrun-binary-cube-auth-ui.js'), 'utf8');
const secureSource = fs.readFileSync(path.join(repositoryRoot, 'shadowrun-binary-cube-secure-export.js'), 'utf8');
const entrySource = fs.readFileSync(path.join(repositoryRoot, 'shadowrun-entry.js'), 'utf8');
const prepareSource = fs.readFileSync(path.join(repositoryRoot, 'desktop/binary-cube/scripts/prepare-app.mjs'), 'utf8');
const desktopHtml = fs.readFileSync(path.join(repositoryRoot, 'desktop/binary-cube/app/index.html'), 'utf8');
const desktopSource = fs.readFileSync(path.join(repositoryRoot, 'desktop/binary-cube/app/desktop.js'), 'utf8');

assert.equal(Visualizer.constants.VISUALIZER_STATE_FORMAT, 'hb-ttrpg-shadowrun-binary-cube-visualizer-state');
assert.equal(Visualizer.constants.VISUALIZER_STATE_SCHEMA_VERSION, '0.1.0');
assert.deepEqual(Visualizer.constants.TRANSPORT_KINDS, ['internal-package', 'secure-export', 'authenticated-envelope']);
assert.equal(Visualizer.utilities.visualizerStorageKey('web'), 'hb-ttrpg-shadowrun-binary-cube-visualizer-state:web');
assert.equal(Visualizer.utilities.visualizerStorageKey('desktop'), 'hb-ttrpg-shadowrun-binary-cube-visualizer-state:desktop');

const migratedVisualizer = Visualizer.utilities.migrateVisualizerState({
  bits: '0101',
  sourceFileName: 'legacy.bin',
  packageObject: { format: Engine.constants.PACKAGE_FORMAT },
  displayMode: '2d',
  reducedMotion: true
});
assert.equal(migratedVisualizer.format, Visualizer.constants.VISUALIZER_STATE_FORMAT);
assert.equal(migratedVisualizer.schemaVersion, Visualizer.constants.VISUALIZER_STATE_SCHEMA_VERSION);
assert.equal(migratedVisualizer.bits, '0101');
assert.equal(migratedVisualizer.transportKind, 'internal-package');
assert.equal(migratedVisualizer.preferences.displayMode, '2d');
assert.equal(migratedVisualizer.preferences.reducedMotion, true);
assert.equal(Object.hasOwn(migratedVisualizer, 'passphrase'), false);

const key = Engine.createKey({
  gridSize: 4,
  seed: 'binary-cube-v11-compatibility',
  inputFace: 'left',
  outputFace: 'top',
  inputQuarterTurns: 1,
  outputQuarterTurns: 3,
  maskDensity: 0.5
});
const bits = '10110100101101001010110100101101001';
const packageObject = Engine.encryptBinary(bits, key);
assert.equal(Engine.decryptBinary(packageObject, key), bits);
assert.equal(Visualizer.utilities.detectTransportKind(packageObject), 'internal-package');

const secure = SecureExport.createSecureExport(packageObject, key, Engine);
assert.equal(Visualizer.utilities.detectTransportKind(secure), 'secure-export');
assert.equal(Object.hasOwn(secure, 'keyId'), false);
assert.equal(Object.hasOwn(secure, 'originalBitLength'), false);
assert.equal(Object.hasOwn(secure, 'gridSize'), false);
assert.deepEqual(SecureExport.expandSecureExport(secure, key, Engine), packageObject);

const passphrase = 'V11 compatibility passphrase';
const envelope = await Auth.sealPackage(packageObject, passphrase, {
  iterations: Auth.constants.MIN_ITERATIONS,
  saltBytes: Uint8Array.from({ length: Auth.constants.SALT_BYTES }, (_, index) => index + 1),
  ivBytes: Uint8Array.from({ length: Auth.constants.IV_BYTES }, (_, index) => index + 21)
});
assert.equal(Visualizer.utilities.detectTransportKind(envelope), 'authenticated-envelope');
assert.deepEqual(await Auth.openEnvelope(envelope, passphrase), packageObject);
await assert.rejects(() => Auth.openEnvelope(envelope, 'wrong passphrase here'), /verification failed/i);

const draft = Editor.draftFromKey(key);
draft.rowPermutation = Editor.rotatePermutation(draft.rowPermutation, 1);
draft.mask = Editor.maskPattern(key.gridSize, 'diagonal', draft.mask);
const editedKey = Editor.applyDraft(key, draft);
assert.notEqual(editedKey.keyId, key.keyId);
assert.equal(Editor.analyzeDraft(key, draft).valid, true);
const invalidDraft = { ...draft, depthPermutation: [...draft.depthPermutation] };
invalidDraft.depthPermutation[0] = invalidDraft.depthPermutation[1];
assert.throws(() => Editor.applyDraft(key, invalidDraft), /each value|permutation|exactly once/i);

for (const required of [
  'VISUALIZER_STATE_SCHEMA_VERSION',
  'migrateVisualizerState',
  'activeTransportKind',
  'authenticated-envelope',
  'secure-export',
  'data-cube-encoder-passphrase',
  'createSecureTransport',
  'openAuthenticatedTransport',
  'saveVisualizerState'
]) assert.match(visualizerSource, new RegExp(required.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));

assert.equal(/passphrase\s*[:=].*localStorage/i.test(visualizerSource), false, 'Visualizer persistence must never store a passphrase.');
assert.match(laboratorySource, /LAB_STATE_SCHEMA_VERSION = '0\.3\.0'/);
assert.match(laboratorySource, /laboratoryStorageKey/);
assert.match(laboratorySource, /transportKind/);
assert.match(laboratorySource, /secureExport/);
assert.match(laboratorySource, /authenticatedEnvelope/);
assert.match(authUiSource, /currentEnvelopeArtifact/);
assert.match(authUiSource, /loadEnvelopeArtifact/);
assert.match(secureSource, /setTransportArtifact\(targetPanel, 'secure-export'/);
assert.match(entrySource, /ASSET_VERSION = '20260726-3'/);
assert.ok((entrySource.match(/shadowrun-binary-cube-secure-export\.js/g) || []).length >= 2);
assert.match(entrySource, /await Promise\.resolve\(api\.loadArtifacts/);

for (const asset of ['binary-cube-visualizer.css', 'binary-cube-visualizer-renderer.js', 'shadowrun-binary-cube-visualizer.js']) {
  assert.match(prepareSource, new RegExp(asset.replaceAll('.', '\\.')));
  assert.match(desktopHtml, new RegExp(asset.replaceAll('.', '\\.')));
}
assert.match(desktopSource, /shadowrun-binary-cube-open-visualizer/);
assert.match(desktopSource, /shadowrun-binary-cube-open-laboratory/);
assert.match(desktopSource, /Promise\.resolve\(window\.ShadowrunBinaryCubeVisualizer\?\.loadArtifacts/);

console.log(JSON.stringify({
  format: 'hb-ttrpg-shadowrun-binary-cube-v11-compatibility-validation-receipt',
  schemaVersion: '0.1.0',
  pass: true,
  editorDraftValidation: true,
  secureExportMetadataMinimized: true,
  secureExportRoundTrip: true,
  authenticatedEnvelopeRoundTrip: true,
  wrongPassphraseRejected: true,
  visualizerStorageMigration: true,
  passphrasePersistence: false,
  laboratoryTransportProvenance: true,
  desktopBidirectionalHandoff: true,
  assetVersion: '20260726-3'
}, null, 2));
