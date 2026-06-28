import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const scriptPath = fileURLToPath(import.meta.url);
const root = path.resolve(path.dirname(scriptPath), '..');
const require = createRequire(import.meta.url);
const engine = require(path.join(root, 'shadowrun-polyaminal-fold-engine.js'));

let assertions = 0;
let roundTrips = 0;

function check(condition, message) {
  assertions += 1;
  assert.ok(condition, message);
}

function equal(actual, expected, message) {
  assertions += 1;
  assert.equal(actual, expected, message);
}

function bitsFromBytes(bytes) {
  return [...bytes].map(value => value.toString(2).padStart(8, '0')).join('');
}

function deterministicBits(length, seed = 1) {
  let state = seed >>> 0;
  let output = '';
  for (let index = 0; index < length; index += 1) {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    output += state >>> 31 ? '1' : '0';
  }
  return output;
}

for (const blockSize of engine.constants.SUPPORTED_BLOCK_SIZES) {
  for (const length of [1, 2, 3, blockSize - 1, blockSize, blockSize + 1, blockSize * 3 + 17]) {
    for (let sample = 0; sample < 8; sample += 1) {
      const input = deterministicBits(length, blockSize * 31 + length * 17 + sample);
      const payload = engine.encode(input, { blockSize });
      equal(engine.decode(payload), input, `Round trip failed for block ${blockSize}, length ${length}, sample ${sample}.`);
      roundTrips += 1;
    }
  }
}

for (const length of [2, 4, 8, 16, 32, 64, 128, 256, 512, 1024]) {
  const input = deterministicBits(length, length);
  const folded = engine.foldBlock(input);
  equal(engine.unfoldBlock(folded.root, folded.stages), input, `Fold/unfold failed for ${length} bits.`);
  equal(folded.stages.reduce((sum, stage) => sum + stage.length, 0) + 1, length, 'The raw fold must conserve the original bit count.');
}

const fixtures = {
  zeros: '0'.repeat(4096),
  alternating: '01'.repeat(2048),
  runs: `${'0'.repeat(1024)}${'1'.repeat(1024)}${'0'.repeat(2048)}`,
  text: bitsFromBytes(Buffer.from('The quick brown fox jumps over the lazy dog. '.repeat(12))),
  random: deterministicBits(4096, 0x12345678)
};
const benchmarks = {};

for (const [name, input] of Object.entries(fixtures)) {
  const result = engine.analyze(input, { blockSize: 1024 });
  check(result.roundTrip, `${name} benchmark must round-trip.`);
  benchmarks[name] = {
    inputBits: input.length,
    encodedBits: result.encodedBitLength,
    ratio: result.ratio,
    savingsPercent: result.savingsPercent,
    codecCounts: result.diagnostics.codecCounts
  };
}

check(benchmarks.zeros.ratio < 0.1, 'Zero data should compress strongly.');
check(benchmarks.alternating.ratio < 0.1, 'Alternating data should compress strongly through the swing ladder.');
check(benchmarks.runs.ratio < 0.1, 'Aligned run data should compress strongly.');
check(benchmarks.text.ratio < 1, 'The text fixture should show at least some compression.');
check(benchmarks.random.ratio >= 1, 'The random fixture must not claim compression where no useful structure exists.');

const packageObject = engine.encode('0101010101010101', { blockSize: 64 });
const damaged = structuredClone(packageObject);
const damagedBytes = Buffer.from(damaged.data, 'base64');
damagedBytes[damagedBytes.length - 1] ^= 1;
damaged.data = damagedBytes.toString('base64');
assertions += 1;
assert.throws(() => engine.decode(damaged), /checksum validation failed/i, 'Bitstream corruption must be detected.');

const summary = {
  receiptType: 'shadowrunPolyaminalFoldValidationSummary',
  schemaVersion: engine.constants.SCHEMA_VERSION,
  valid: true,
  assertions,
  roundTrips,
  supportedBlockSizes: engine.constants.SUPPORTED_BLOCK_SIZES,
  benchmarks
};

if (process.argv[2]) {
  const outputPath = path.resolve(process.argv[2]);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(summary, null, 2)}\n`);
}

console.log('Shadowrun Polyaminal Fold Ladder validation passed.');
console.log(`Assertions: ${assertions}`);
console.log(`Round trips: ${roundTrips}`);
for (const [name, result] of Object.entries(benchmarks)) {
  console.log(`- ${name}: ${result.encodedBits}/${result.inputBits} bits · ratio ${result.ratio.toFixed(4)} · savings ${result.savingsPercent.toFixed(2)}%`);
}
