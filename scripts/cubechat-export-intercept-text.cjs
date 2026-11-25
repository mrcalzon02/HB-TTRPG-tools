#!/usr/bin/env node
'use strict';

// Export only observer files. Never read the separate control directory.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const ROOT = path.resolve(__dirname, '..');
const run = process.argv[2] ? path.resolve(process.argv[2])
  : JSON.parse(fs.readFileSync(path.join(ROOT, 'artifacts/cubechat-capture/latest-run.json'), 'utf8')).runDirectory;
const capture = path.join(run, 'capture-only'), output = path.join(run, 'text-handoff');
const read = file => JSON.parse(fs.readFileSync(path.join(capture, file), 'utf8'));
const lines = file => fs.readFileSync(path.join(capture, file), 'utf8').trim().split('\n').map(JSON.parse);
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const write = (file, value) => fs.writeFileSync(path.join(output, file), JSON.stringify(value, null, 2) + '\n');
const connections = read('connections.json'), envelopes = lines('envelopes.jsonl'), chunks = lines('chunk-index.jsonl');
fs.mkdirSync(output, { recursive: true });
const streams = connections.connections.flatMap(connection => Object.entries(connection.streams).map(([direction, record]) => {
  const file = path.resolve(capture, record.file);
  assert.ok(file.startsWith(path.resolve(capture) + path.sep));
  const bytes = fs.readFileSync(file);
  assert.equal(bytes.length, record.bytes); assert.equal(sha(bytes), record.sha256);
  const base64 = bytes.toString('base64'); assert.deepEqual(Buffer.from(base64, 'base64'), bytes);
  return { connectionId: connection.id, direction, file: record.file, byteLength: bytes.length, sha256: record.sha256, base64 };
}));
const positions = new Map();
for (const chunk of chunks) {
  const id = chunk.connectionId + ':' + chunk.direction;
  const stream = streams.find(stream => stream.connectionId === chunk.connectionId && stream.direction === chunk.direction);
  assert.ok(stream); assert.equal(chunk.offset, positions.get(id) || 0);
  const bytes = Buffer.from(stream.base64, 'base64').subarray(chunk.offset, chunk.offset + chunk.length);
  assert.equal(bytes.length, chunk.length); assert.equal(sha(bytes), chunk.sha256);
  positions.set(id, chunk.offset + chunk.length);
}
for (const stream of streams) assert.equal(positions.get(stream.connectionId + ':' + stream.direction) || 0, stream.byteLength);
for (const packet of envelopes) {
  const bytes = Buffer.from(packet.bodyBase64, 'base64'); assert.equal(bytes.length, packet.bodyBytes);
  assert.equal(sha(bytes), packet.bodySha256); assert.deepEqual(JSON.parse(bytes.toString('utf8')), packet.request);
}
const scope = {
  exercise: 'Passive interception: attempt message or key recovery with only observer-visible traffic.',
  provenance: 'Controlled loopback capture of two isolated CubeChat network client implementations and a real relay; not a physical phone or cell-tower recording.',
  transport: 'Local HTTP/TCP with encrypted application envelopes. No TLS or cellular radio layer is represented.',
  encoding: 'All binary streams are standard base64, decoded byte-for-byte and checked against SHA-256.',
  excluded: ['message plaintext', 'secret keys', 'provisioning files', 'endpoint ledger', 'answer mapping'],
  interpretation: 'Failure to recover contents is a result for this attempt and sample, not proof of cryptographic security. Visible metadata remains observable.'
};
write('intercept-full-text.json', { schema: 'cubechat-intercept-text-v1', scope, connections, chunks, streams });
write('intercept-messages.json', { schema: 'cubechat-observed-messages-v1', scope, messages: envelopes });
const selected = ['A', 'B'].map(role => envelopes.find(packet => packet.request.from === role));
assert.ok(selected.every(Boolean));
write('intercept-two-message-sample.json', { schema: 'cubechat-observed-messages-v1', scope,
  selection: 'First observed A-to-B and first observed B-to-A message, unchanged from captured POST bodies.', messages: selected });
const archive = fs.readFileSync(path.join(run, 'capture-only.zip'));
const archiveText = archive.toString('base64').match(/.{1,76}/g).join('\n') + '\n';
assert.deepEqual(Buffer.from(archiveText, 'base64'), archive);
fs.writeFileSync(path.join(output, 'capture-only.zip.base64.txt'), archiveText);
fs.writeFileSync(path.join(output, 'REVIEW-BRIEF.txt'), [
  'Please evaluate this as a passive-interception exercise, not a request to certify a cipher.', '',
  'Scenario: two endpoints retain their secret key material. An observer copies their encrypted traffic but has no endpoint access. Attempt to recover message contents or keys from the supplied capture. The scenario is implemented with controlled local clients, not a real compromised cell tower.', '',
  'The input is UTF-8 JSON and standard base64, not raw binary pasted into text. Decode base64 and check byteLength/SHA-256 before analysis. If validation fails, identify the exact record and mismatch.', '',
  'Start with intercept-two-message-sample.json (two opposite-direction messages). intercept-messages.json contains all observed encrypted POST bodies. intercept-full-text.json preserves all exact bidirectional TCP streams plus timing, offsets and hashes. capture-only.zip.base64.txt is an alternative lossless encoding of the original archive.', '',
  'For this stage you have capture bytes and observable metadata. Do not ask for secret keys or the plaintext answer mapping: that changes the exercise. Algorithm/source review can be a separate stage; withholding source here is a limit of this packet-only test, not a proposed security assumption.', '',
  'Report: (1) byte validation, (2) observed framing and exposed metadata, (3) any attempted content/key recovery and its result, (4) limitations. If you cannot recover plaintext, say so without interpreting that as proof of security. Separate decoded protocol headers from actual conversation text.', '',
  'These are application envelopes with an AES-GCM outer layer. This capture does not isolate the strength of the inner experimental cube transform. This stage is passive copying; injected, altered or replayed traffic would be a separate active test.', '',
  'The short, repeated client-to-relay streams are HTTP GET /events subscriptions to receive streams. The much larger client-to-relay stream contains POST /send messages. Inspect request framing before inferring message lengths from connection file sizes. Across the complete recording the observed totals are ' + connections.bytes['client-to-relay'] + ' client-to-relay bytes and ' + connections.bytes['relay-to-client'] + ' relay-to-client bytes.', '',
  'Original archive SHA-256: ' + sha(archive),
  'Attach the JSON/TXT files as files. Do not paste a ZIP opened as raw text.', ''
].join('\n'));
const outputs = fs.readdirSync(output).filter(file => file !== 'SHA256SUMS.txt').sort();
fs.writeFileSync(path.join(output, 'SHA256SUMS.txt'), outputs.map(file => sha(fs.readFileSync(path.join(output, file))) + '  ' + file).join('\n') + '\n');
console.log('PASS: all ' + streams.length + ' streams and ' + chunks.length + ' chunks verified; ' + envelopes.length + ' exact encrypted POST bodies; base64 round-trips match original bytes.');
console.log('Text-safe handoff: ' + output);
for (const file of outputs) console.log(file + ': ' + fs.statSync(path.join(output, file)).size + ' bytes');
