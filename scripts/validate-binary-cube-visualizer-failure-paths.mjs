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
    return { traceTime, phasePosition, phaseIndex, nextPhaseIndex: Math.min(phaseCount - 1, phaseIndex + 1), segmentProgress: phasePosition - phaseIndex };
  },
  tracePointPosition() { return [0, 0, 0]; },
  resolveRenderPlan(gridSize) { return { tier: gridSize <= 64 ? 'batched' : 'sampled', renderedPointCount: Math.min(gridSize * gridSize, 8192) }; }
});
const Visualizer = require(path.join(repositoryRoot, 'shadowrun-binary-cube-visualizer.js'));

const key = Engine.createKey({
  gridSize: 4,
  seed: 'binary-cube-v12-failure-paths',
  inputFace: 'left',
  outputFace: 'top',
  inputQuarterTurns: 1,
  outputQuarterTurns: 3,
  maskDensity: 0.5
});
const wrongKey = Engine.createKey({
  gridSize: 4,
  seed: 'binary-cube-v12-wrong-key',
  inputFace: 'left',
  outputFace: 'top',
  inputQuarterTurns: 1,
  outputQuarterTurns: 3,
  maskDensity: 0.5
});
const bits = '10110100101101001010110100101101001';
const packageObject = Engine.encryptBinary(bits, key);

assert.notEqual(wrongKey.keyId, key.keyId);
assert.throws(() => Engine.validatePackage(packageObject, wrongKey), undefined, 'A package must be rejected under the wrong key.');

const corruptedPackage = {
  ...packageObject,
  ciphertext: `${packageObject.ciphertext[0] === '0' ? '1' : '0'}${packageObject.ciphertext.slice(1)}`
};
assert.throws(() => Engine.validatePackage(corruptedPackage, key), undefined, 'A ciphertext mutation must fail package validation.');
assert.equal(Engine.decryptBinary(packageObject, key), bits);

const secureExport = SecureExport.createSecureExport(packageObject, key, Engine);
assert.deepEqual(SecureExport.expandSecureExport(secureExport, key, Engine), packageObject);
assert.throws(() => SecureExport.expandSecureExport(secureExport, wrongKey, Engine), undefined, 'A secure export must not reconstruct under the wrong key.');
assert.equal(Object.hasOwn(secureExport, 'keyId'), false);
assert.equal(Object.hasOwn(secureExport, 'originalBitLength'), false);
assert.equal(Object.hasOwn(secureExport, 'gridSize'), false);

const draft = Editor.draftFromKey(key);
draft.rowPermutation = Editor.rotatePermutation(draft.rowPermutation, 1);
const editedKey = Editor.applyDraft(key, draft);
assert.notEqual(editedKey.keyId, key.keyId);
const invalidDraft = { ...draft, depthPermutation: [...draft.depthPermutation] };
invalidDraft.depthPermutation[0] = invalidDraft.depthPermutation[1];
assert.throws(() => Editor.applyDraft(key, invalidDraft), undefined, 'An invalid editor permutation must be rejected.');

const migrated = Visualizer.utilities.migrateVisualizerState({
  bits,
  key,
  packageObject,
  displayMode: '2d',
  renderQuality: 'aggregate'
});
assert.equal(migrated.schemaVersion, Visualizer.constants.VISUALIZER_STATE_SCHEMA_VERSION);
assert.equal(migrated.transportKind, 'internal-package');
assert.equal(migrated.preferences.displayMode, '2d');
assert.equal(migrated.preferences.renderQuality, 'aggregate');
assert.equal(Visualizer.utilities.migrateVisualizerState(null), null);

const visualizerSource = fs.readFileSync(path.join(repositoryRoot, 'shadowrun-binary-cube-visualizer.js'), 'utf8');
assert.match(
  visualizerSource,
  /function readStoredVisualizerState\(\)[\s\S]*?catch \(_\) \{[\s\S]*?root\.localStorage\.removeItem\(currentKey\);[\s\S]*?return null;/,
  'Malformed stored JSON must be removed and treated as recoverable.'
);
assert.match(
  visualizerSource,
  /function buildPanel\(\)[\s\S]*?if \(!restoreVisualizerState\(panel\)\) generateKey\(panel\);/,
  'A failed state restoration must regenerate a canonical working state.'
);

console.log(JSON.stringify({
  format: 'hb-ttrpg-shadowrun-binary-cube-v12-failure-path-validation-receipt',
  schemaVersion: '0.1.0',
  pass: true,
  wrongKeyRejected: true,
  corruptedCiphertextRejected: true,
  secureExportRoundTrip: true,
  secureExportWrongKeyRejected: true,
  secureExportMetadataMinimized: true,
  validatedEditorDraftAccepted: true,
  invalidEditorDraftRejected: true,
  legacyStorageMigrated: true,
  malformedStorageRecoveryContract: true
}, null, 2));
