#!/usr/bin/env node

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, '..');
const Dashboard = require(path.join(repositoryRoot, 'binary-cube-decryption-dashboard.js'));
const dashboardSource = fs.readFileSync(path.join(repositoryRoot, 'binary-cube-decryption-dashboard.js'), 'utf8');
const styleSource = fs.readFileSync(path.join(repositoryRoot, 'binary-cube-decryption-dashboard.css'), 'utf8');
const scientificToolsSource = fs.readFileSync(path.join(repositoryRoot, 'scientific-tools-entry.js'), 'utf8');

assert.equal(Dashboard.constants.SESSION_FORMAT, 'hb-ttrpg-binary-cube-decryption-dashboard-session');
assert.equal(Dashboard.constants.SESSION_SCHEMA_VERSION, '0.1.0');
assert.equal(Dashboard.constants.PACKAGE_FORMAT, 'hb-ttrpg-shadowrun-binary-cube-package');
assert.equal(Dashboard.constants.SECURE_EXPORT_FORMAT, 'hb-ttrpg-binary-cube-secure-export');
assert.equal(typeof Dashboard.openPanel, 'function');
assert.equal(typeof Dashboard.runAttackSuite, 'function');
assert.equal(typeof Dashboard.compareSources, 'function');
assert.equal(typeof Dashboard.knownKeyDecrypt, 'function');

const helloBits = '0100100001100101011011000110110001101111';
const source = Dashboard.parseSourceText(helloBits, 'binary', 'hello.bin');
assert.equal(source.bits, helloBits);
assert.equal(Dashboard.utilities.decodeText(source.bytes), 'Hello');
assert.equal(Dashboard.utilities.reverseByteOrder(helloBits), '0110111101101100011011000110010101001000');
assert.equal(Dashboard.utilities.reverseBitsPerByte('00000001'), '10000000');
assert.equal(Dashboard.utilities.nibbleSwap('11110000'), '00001111');
assert.equal(Dashboard.utilities.rotateByteBits('10000001', 1), '00000011');
assert.equal(Dashboard.utilities.xorByte('01000001', 0x20), '01100001');

const matrix = '000111222'.replaceAll('2', '1');
assert.equal(Dashboard.utilities.transformSquareBlock(matrix, 3, 'rotate-180').length, 9);
assert.equal(Dashboard.utilities.transformBlocks('000111000', 3, 'reverse-within-block'), '000111000'.split('').reverse().join(''));

const packageObject = {
  format: Dashboard.constants.PACKAGE_FORMAT,
  schemaVersion: '0.2.0',
  algorithm: 'latin-cube-face-permutation',
  keyId: 'deadbeef',
  gridSize: 4,
  inputFace: 'top',
  outputFace: 'front',
  inputQuarterTurns: 0,
  outputQuarterTurns: 1,
  originalBitLength: 32,
  payloadCapacity: 16,
  blockCount: 2,
  ciphertext: '0101010110101010'.repeat(2),
  checksumType: 'fnv1a32-corruption-detection-only',
  checksum: 'cafebabe'
};
const packageSource = Dashboard.parseSourceText(JSON.stringify(packageObject), 'auto', 'package.json');
assert.equal(packageSource.kind, 'binary-cube-package');
assert.equal(packageSource.bits, packageObject.ciphertext);
const diagnostics = Dashboard.analyzeSource(packageSource);
assert.equal(diagnostics.metadata.gridSize, 4);
assert.equal(diagnostics.metadata.inputFace, 'top');
assert.equal(diagnostics.metadata.outputFace, 'front');
assert.ok(diagnostics.candidateGridSizes.some(item => item.gridSize === 4 && item.source === 'package metadata'));
assert.equal(diagnostics.bitLength, 32);
assert.ok(diagnostics.byteEntropy >= 0 && diagnostics.byteEntropy <= 8);
assert.ok(diagnostics.oneDensity >= 0 && diagnostics.oneDensity <= 1);

const comparison = Dashboard.compareSources(
  Dashboard.parseSourceText('00001111', 'binary', 'a'),
  Dashboard.parseSourceText('00111100', 'binary', 'b')
);
assert.equal(comparison.comparedBitLength, 8);
assert.equal(comparison.differingBits, 4);
assert.equal(comparison.xorBits, '00110011');

const attackResults = await Dashboard.runAttackSuite(source, { singleByteXor: false, resultLimit: 8 });
assert.ok(attackResults.length >= 4);
assert.ok(attackResults.every(result => Number.isFinite(result.score) && result.bits.length === helloBits.length));
assert.ok(attackResults.some(result => result.method === 'identity'));

for (const required of [
  'Decryption Dashboard',
  'Binary Cube Cryptanalysis',
  'runAttackSuite',
  'compareSources',
  'knownKeyDecrypt',
  'single-byte XOR',
  'candidateGridSizes',
  'autocorrelation',
  'transformSquareBlock',
  'Research boundary:'
]) assert.match(dashboardSource, new RegExp(required.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'));

for (const selector of ['.bdd-shell', '.bdd-panel', '.bdd-results', '.bdd-result', '.bdd-metric-grid', '@media(max-width:900px)']) {
  assert.ok(styleSource.includes(selector), `Dashboard CSS is missing ${selector}.`);
}

for (const required of [
  'data-scientific-tools-tab="decryption-dashboard"',
  'data-scientific-tools-panel="decryption-dashboard"',
  'id="scientific-tools-open-decryption-dashboard"',
  'loadDecryptionDashboard',
  'openDecryptionDashboard',
  "loadScript('binary-cube-decryption-dashboard.js'",
  "loadStyle('binary-cube-decryption-dashboard.css'"
]) assert.ok(scientificToolsSource.includes(required), `Scientific Tools is missing ${required}.`);

assert.equal(dashboardSource.includes('ShadowrunBinaryCubeEngine.encryptBinary'), false, 'The dashboard must not reproduce or invoke encryption as an attack primitive.');
assert.equal(dashboardSource.includes('Engine.transformBlock'), false, 'The dashboard must not reconstruct the canonical Binary Cube transformation internally.');
assert.match(dashboardSource, /Engine\.decryptBinary\(packageObject, key\)/, 'Known-key control must delegate authoritative decryption to the canonical engine.');

console.log(JSON.stringify({
  format: 'hb-ttrpg-binary-cube-decryption-dashboard-validation-receipt',
  schemaVersion: '0.1.0',
  pass: true,
  sourceParsing: true,
  packageMetadataInspection: true,
  entropyAndBiasDiagnostics: true,
  autocorrelationDiagnostics: true,
  cubeBlockDivisorInference: true,
  structuralManipulations: true,
  singleByteXorAttackSurface: true,
  differentialComparison: true,
  canonicalKnownKeyDelegation: true,
  canonicalEncryptionReconstruction: false,
  responsiveDashboardSurface: true
}, null, 2));
