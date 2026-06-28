import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const scriptPath = fileURLToPath(import.meta.url);
const root = path.resolve(path.dirname(scriptPath), '..');
const require = createRequire(import.meta.url);
const engine = require(path.join(root, 'shadowrun-binary-cube-engine.js'));
const editor = require(path.join(root, 'shadowrun-binary-cube-editor.js'));

let assertions = 0;
let roundTrips = 0;
const sizesCovered = new Set();
const patternsCovered = new Set();

function check(condition, message) {
  assertions += 1;
  assert.ok(condition, message);
}

function equal(actual, expected, message) {
  assertions += 1;
  assert.equal(actual, expected, message);
}

function deepEqual(actual, expected, message) {
  assertions += 1;
  assert.deepEqual(actual, expected, message);
}

function expectThrow(callback, pattern, message) {
  assertions += 1;
  assert.throws(callback, pattern, message);
}

function patternedBits(length, salt) {
  return Array.from({ length }, (_, index) => ((index * 5 + salt * 13 + Math.floor(index / 2)) % 2 ? '1' : '0')).join('');
}

function validateParsersAndSerializers() {
  deepEqual(editor.parseIntegerList('3, 1 0;2', 4, 'Row permutation'), [3, 1, 0, 2], 'Permutation parser must accept documented separators.');
  equal(editor.serializePermutation([3, 1, 0, 2]), '3, 1, 0, 2', 'Permutation serialization must remain readable.');
  const mask = editor.parseMask('1010\n0101\n1010\n0101', 4);
  equal(mask.length, 16, 'Mask parser must preserve every cell.');
  equal(mask.filter(Boolean).length, 8, 'Mask parser must preserve enabled cells.');
  equal(editor.serializeMask(mask, 4), '1010\n0101\n1010\n0101', 'Mask serialization must be stable.');
  expectThrow(() => editor.parseIntegerList('0,1,1,3', 4, 'Row permutation'), /exactly once/i, 'Duplicate permutation values must fail.');
  expectThrow(() => editor.parseIntegerList('0,1,2,4', 4, 'Row permutation'), /0 through 3/i, 'Out-of-range permutation values must fail.');
  expectThrow(() => editor.parseIntegerList('0,1,2', 4, 'Row permutation'), /exactly 4/i, 'Short permutations must fail.');
  expectThrow(() => editor.parseMask('0000000000000000', 4), /at least one/i, 'Empty masks must fail.');
  expectThrow(() => editor.parseMask('10102', 2), /only 0, 1/i, 'Non-binary masks must fail.');
  expectThrow(() => editor.parseMask('101', 2), /exactly 4/i, 'Wrong-length masks must fail.');
}

function validatePatterns() {
  const expectedCounts = new Map([
    ['full', 16],
    ['three-quarter', 12],
    ['half', 8],
    ['border', 12],
    ['diagonal', 8]
  ]);
  for (const [pattern, count] of expectedCounts) {
    const mask = editor.maskPattern(4, pattern, Array(16).fill(true));
    equal(mask.filter(Boolean).length, count, `${pattern} pattern must have the expected capacity.`);
    patternsCovered.add(pattern);
  }
  const inverted = editor.maskPattern(4, 'invert', editor.maskPattern(4, 'half'));
  equal(inverted.filter(Boolean).length, 8, 'Inverting the checker mask must preserve complementary capacity.');
  deepEqual(editor.rotatePermutation([0, 1, 2, 3], 1), [1, 2, 3, 0], 'Positive permutation rotation must move left.');
  deepEqual(editor.rotatePermutation([0, 1, 2, 3], -1), [3, 0, 1, 2], 'Negative permutation rotation must move right.');
  expectThrow(() => editor.maskPattern(4, 'unknown'), /unknown mask pattern/i, 'Unknown patterns must fail visibly.');
}

function validateCustomKeys() {
  const patterns = ['full', 'three-quarter', 'half', 'border', 'diagonal'];
  for (const [sizeIndex, gridSize] of engine.constants.RECOMMENDED_GRID_SIZES.entries()) {
    const base = engine.createKey({
      gridSize,
      seed: `editor-base-${gridSize}`,
      inputFace: 'top',
      outputFace: 'front',
      inputQuarterTurns: sizeIndex % 4,
      outputQuarterTurns: (sizeIndex + 1) % 4,
      maskDensity: 1
    });
    const originalDraft = editor.draftFromKey(base);
    equal(originalDraft.gridSize, gridSize, 'Draft must inherit the active key grid size.');
    for (const [patternIndex, pattern] of patterns.entries()) {
      const draft = {
        ...originalDraft,
        rowPermutation: editor.rotatePermutation(originalDraft.rowPermutation, patternIndex + 1),
        columnPermutation: editor.rotatePermutation(originalDraft.columnPermutation, -(patternIndex + 1)),
        depthPermutation: editor.rotatePermutation(originalDraft.depthPermutation, patternIndex + 2),
        mask: editor.maskPattern(gridSize, pattern, originalDraft.mask)
      };
      const analysis = editor.analyzeDraft(base, draft);
      check(analysis.valid, `Custom ${pattern} draft must validate at grid size ${gridSize}.`);
      check(analysis.changed, `Custom ${pattern} draft must produce a changed key fingerprint at grid size ${gridSize}.`);
      check(analysis.diagnostics.collisionFree, `Custom ${pattern} draft must remain collision-free at grid size ${gridSize}.`);
      equal(analysis.key.mask.filter(Boolean).length, analysis.payloadCells, 'Analysis payload count must match the rebuilt key mask.');
      const bitLength = analysis.payloadCells + 7;
      const input = patternedBits(bitLength, sizeIndex + patternIndex);
      const payload = engine.encryptBinary(input, analysis.key);
      equal(engine.decryptBinary(payload, analysis.key), input, `Custom ${pattern} key must round-trip at grid size ${gridSize}.`);
      roundTrips += 1;
      sizesCovered.add(gridSize);
      patternsCovered.add(pattern);
    }
  }
}

function validateFailureAndIntegration() {
  const base = engine.createKey({ gridSize: 4, seed: 'editor-failure', inputFace: 'top', outputFace: 'front', maskDensity: 1 });
  const draft = editor.draftFromKey(base);
  const duplicate = { ...draft, rowPermutation: [0, 1, 1, 3] };
  const duplicateResult = editor.analyzeDraft(base, duplicate);
  check(!duplicateResult.valid && /exactly once/i.test(duplicateResult.errors[0]), 'Duplicate draft permutations must return a visible validation error.');
  const wrongSize = { ...draft, gridSize: 12 };
  check(!editor.analyzeDraft(base, wrongSize).valid, 'Drafts for a different grid size must fail.');
  const emptyMask = { ...draft, mask: Array(16).fill(false) };
  check(!editor.analyzeDraft(base, emptyMask).valid, 'Drafts with no payload cells must fail.');

  const rebuilt = editor.applyDraft(base, {
    ...draft,
    rowPermutation: editor.rotatePermutation(draft.rowPermutation, 1),
    mask: editor.maskPattern(4, 'half', draft.mask)
  });
  check(rebuilt.keyId !== base.keyId, 'Applying valid custom material must recalculate the key fingerprint.');
  expectThrow(() => engine.decryptBinary(engine.encryptBinary('101001', base), rebuilt), /different key/i, 'A package made with the prior key must reject the rebuilt key.');

  const moduleSource = fs.readFileSync(path.join(root, 'shadowrun-binary-cube-editor.js'), 'utf8');
  const entrySource = fs.readFileSync(path.join(root, 'shadowrun-entry.js'), 'utf8');
  check(entrySource.includes("shadowrun-binary-cube-editor.js"), 'The Shadowrun loader must load the custom editor.');
  check(entrySource.includes('window.ShadowrunBinaryCubeEditor'), 'The Shadowrun loader must verify the custom editor API.');
  check(moduleSource.includes('Apply Valid Draft'), 'The editor must expose an explicit protected apply action.');
  check(moduleSource.includes('Restore Previous Valid Key'), 'The editor must expose previous-key recovery.');
  check(moduleSource.includes('aria-pressed'), 'Visual mask cells must expose non-color-only state.');
  check(moduleSource.includes('MAX_VISUAL_GRID_SIZE'), 'The editor must limit large visual grids.');
}

validateParsersAndSerializers();
validatePatterns();
validateCustomKeys();
validateFailureAndIntegration();

for (const size of engine.constants.RECOMMENDED_GRID_SIZES) check(sizesCovered.has(size), `Editor validation did not cover recommended size ${size}.`);
for (const pattern of ['full', 'three-quarter', 'half', 'border', 'diagonal']) check(patternsCovered.has(pattern), `Editor validation did not cover ${pattern}.`);

const summary = {
  receiptType: 'shadowrunBinaryCubeEditorValidationSummary',
  schemaVersion: engine.constants.SCHEMA_VERSION,
  valid: true,
  assertions,
  roundTrips,
  recommendedGridSizesCovered: [...sizesCovered].sort((a, b) => a - b),
  maskPatternsCovered: [...patternsCovered].sort(),
  draftProtection: true,
  previousKeyRecovery: true,
  maximumVisualGridSize: editor.constants.MAX_VISUAL_GRID_SIZE
};
const outputPath = process.argv[2] ? path.resolve(process.argv[2]) : null;
if (outputPath) {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(summary, null, 2)}\n`);
}
console.log('Shadowrun Binary Cube editor validation passed.');
console.log(`Assertions: ${assertions}`);
console.log(`Custom-key round trips: ${roundTrips}`);
console.log(`Recommended sizes: ${summary.recommendedGridSizesCovered.join(', ')}`);
