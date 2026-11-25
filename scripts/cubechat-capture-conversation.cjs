#!/usr/bin/env node
'use strict';

// Known-plaintext control run. Share only capture-only.zip, not the controls.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const net = require('node:net');
const { spawn } = require('node:child_process');
const { randomBytes, randomUUID, createHash, webcrypto } = require('node:crypto');
const { createClient } = require('./lib/cubechat-capture-client.cjs');
const { createCaptureProxy, extractRequests } = require('./lib/cubechat-capture-proxy.cjs');
const Core = require('../cubechat-key-ledger-core.js');
const Engine = require('../shadowrun-binary-cube-engine.js');
const ROOT = path.resolve(__dirname, '..'), FIXTURE = 'data/cubechat/sailing-family-conversation.json';
const ROTATE_EVERY = 12, MATERIAL_BYTES = 1024 * 1024;
const sha = value => createHash('sha256').update(value).digest('hex');
const json = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', { mode: 0o600 });
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const iso = () => new Date().toISOString();
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));

function listFiles(directory, prefix = '') {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const relative = prefix + entry.name;
    return entry.isDirectory() ? listFiles(path.join(directory, entry.name), relative + '/') : [relative];
  }).sort();
}

function largeFile(profile, direction) {
  const data = Buffer.alloc(64 + MATERIAL_BYTES);
  data.write('CCLK2', 0, 'ascii'); data[5] = 1; data[6] = direction === 'AB' ? 1 : 2;
  Buffer.from(profile, 'hex').copy(data, 8); data.writeUInt32BE(MATERIAL_BYTES, 20);
  randomBytes(MATERIAL_BYTES).copy(data, 64); return data;
}

function vacantPort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer(); server.once('error', reject);
    server.listen(0, '127.0.0.1', () => { const port = server.address().port; server.close(() => resolve(port)); });
  });
}

async function startRelay(controlDirectory) {
  const port = await vacantPort();
  const env = { ...process.env, CUBECHAT_HOST: '127.0.0.1', CUBECHAT_PORT: String(port),
    CUBECHAT_FORUM_DB: path.join(controlDirectory, 'unused-forum.json'), CUBECHAT_FORUM_ADMIN_TOKEN: '',
    CUBECHAT_TLS_CERT: '', CUBECHAT_TLS_KEY: '' };
  const child = spawn(process.execPath, ['cubechat-server.cjs', String(port)], { cwd: ROOT, env, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
  let log = ''; child.stdout.on('data', chunk => { log += chunk; }); child.stderr.on('data', chunk => { log += chunk; });
  try {
    const deadline = Date.now() + 10000;
    while (!log.includes('CubeChat listening')) {
      if (child.exitCode !== null || Date.now() > deadline) throw Error('Test relay failed to start: ' + log);
      await pause(20);
    }
  } catch (error) { child.kill(); throw error; }
  return { port, async close() {
    if (child.exitCode === null) { child.kill(); await Promise.race([new Promise(resolve => child.once('exit', resolve)), pause(1500)]); }
    fs.writeFileSync(path.join(controlDirectory, 'relay.log'), log);
  } };
}

function zipDirectory(directory, target) {
  const table = Array.from({ length: 256 }, (_, i) => { let c = i; for (let j = 0; j < 8; j++) c = c & 1 ? 0xedb88320 ^ c >>> 1 : c >>> 1; return c >>> 0; });
  const crc32 = buffer => { let c = 0xffffffff; for (const byte of buffer) c = table[(c ^ byte) & 255] ^ c >>> 8; return (c ^ 0xffffffff) >>> 0; };
  const local = [], central = []; let offset = 0; const files = listFiles(directory);
  for (const file of files) {
    const name = Buffer.from(file), data = fs.readFileSync(path.join(directory, file)), crc = crc32(data);
    const header = Buffer.alloc(30); header.writeUInt32LE(0x04034b50); header.writeUInt16LE(20, 4); header.writeUInt16LE(0x800, 6);
    header.writeUInt32LE(crc, 14); header.writeUInt32LE(data.length, 18); header.writeUInt32LE(data.length, 22); header.writeUInt16LE(name.length, 26);
    const dir = Buffer.alloc(46); dir.writeUInt32LE(0x02014b50); dir.writeUInt16LE(20, 4); dir.writeUInt16LE(20, 6); dir.writeUInt16LE(0x800, 8);
    dir.writeUInt32LE(crc, 16); dir.writeUInt32LE(data.length, 20); dir.writeUInt32LE(data.length, 24); dir.writeUInt16LE(name.length, 28); dir.writeUInt32LE(offset, 42);
    local.push(header, name, data); central.push(dir, name); offset += header.length + name.length + data.length;
  }
  const directoryBytes = Buffer.concat(central), end = Buffer.alloc(22); end.writeUInt32LE(0x06054b50);
  end.writeUInt16LE(files.length, 8); end.writeUInt16LE(files.length, 10); end.writeUInt32LE(directoryBytes.length, 12); end.writeUInt32LE(offset, 16);
  fs.writeFileSync(target, Buffer.concat([...local, directoryBytes, end]));
  return { files: files.length, bytes: fs.statSync(target).size, sha256: sha(fs.readFileSync(target)) };
}

function networkAad(envelope) {
  return Buffer.from(JSON.stringify({ format: envelope.format, channel: envelope.channel, sequence: envelope.sequence,
    profile: envelope.profile, mode: envelope.mode || 'deterministic', padStart: envelope.padStart ?? null, padLength: envelope.padLength ?? null }));
}

async function decryptCaptured(envelope, bundle, material) {
  const seed = bundle[envelope.channel];
  const aes = await webcrypto.subtle.importKey('raw', Buffer.from(seed, 'hex'), 'AES-GCM', false, ['decrypt']);
  const plain = await webcrypto.subtle.decrypt({ name: 'AES-GCM', iv: Buffer.from(envelope.iv, 'base64'), additionalData: networkAad(envelope) }, aes, Buffer.from(envelope.ciphertext, 'base64'));
  const cube = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(plain));
  const key = Engine.createKey({ gridSize: 64, seed, maskDensity: 1, inputFace: 'top', outputFace: 'front' });
  const bits = Engine.decryptBinary(cube, key); assert.equal(bits.length % 8, 0);
  const bytes = Buffer.from(Array.from({ length: bits.length / 8 }, (_, i) => parseInt(bits.slice(i * 8, i * 8 + 8), 2)));
  assert.equal(envelope.mode, 'large-pad-v1'); assert.equal(envelope.padLength, bytes.length);
  assert.ok(envelope.padStart >= 0 && envelope.padStart + bytes.length <= material.length - 64);
  for (let i = 0; i < bytes.length; i++) bytes[i] ^= material[64 + envelope.padStart + i];
  return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
}

function observedRequests(capture) {
  const chunks = fs.readFileSync(path.join(capture, 'chunk-index.jsonl'), 'utf8').trim().split('\n').map(JSON.parse);
  return extractRequests(capture).filter(request => request.method === 'POST' && request.path === '/send').map(request => {
    const order = chunks.findIndex(chunk => chunk.connectionId === request.connectionId && chunk.direction === 'client-to-relay' && chunk.offset <= request.sourceOffset && chunk.offset + chunk.length > request.sourceOffset);
    assert.ok(order >= 0, 'Request must occur in capture chunk index');
    return { ...request, capturedAt: chunks[order].capturedAt, captureOrder: order, body: JSON.parse(request.bodyUtf8) };
  }).sort((a, b) => a.captureOrder - b.captureOrder || a.sourceOffset - b.sourceOffset);
}

async function verifyRun(runDirectory) {
  const control = path.join(runDirectory, 'control'), capture = path.join(runDirectory, 'capture-only');
  const fixture = read(path.join(control, 'known-plaintext.json')), comparison = read(path.join(control, 'comparison.json'));
  const observed = fs.readFileSync(path.join(capture, 'envelopes.jsonl'), 'utf8').trim().split('\n').map(JSON.parse);
  const requests = observedRequests(capture), epochs = read(path.join(control, 'key-sets.json'));
  assert.equal(observed.length, fixture.messages.length); assert.equal(requests.length, observed.length); assert.equal(comparison.length, observed.length);
  const counts = {}, nonces = new Set();
  const serverStreams = read(path.join(capture, 'connections.json')).connections.map(connection => {
    const record = connection.streams['relay-to-client'], bytes = fs.readFileSync(path.join(capture, record.file));
    assert.equal(bytes.length, record.bytes); assert.equal(sha(bytes), record.sha256); return bytes;
  });
  for (let index = 0; index < observed.length; index++) {
    const packet = observed[index], entry = comparison[index], message = fixture.messages[index], envelope = JSON.parse(packet.request.envelope);
    const epoch = epochs[entry.epoch - 1], directory = path.join(control, epoch.directory);
    const host = read(path.join(directory, 'A-provision.json')), material = fs.readFileSync(path.join(directory, envelope.channel + '.bin'));
    assert.equal(packet.observedIndex, index + 1); assert.equal(entry.messageId, message.id);
    assert.equal(packet.request.from, message.sender); assert.equal(packet.request.profile, host.profileId);
    assert.equal(packet.request.to, message.sender === 'A' ? 'B' : 'A');
    assert.equal(entry.plaintextSha256, sha(Buffer.from(message.text))); assert.equal(entry.envelopeSha256, sha(packet.request.envelope));
    assert.equal(sha(Buffer.from(requests[index].bodyBase64, 'base64')), packet.bodySha256);
    assert.equal(packet.bodyBase64, requests[index].bodyBase64);
    assert.deepEqual(packet.request, JSON.parse(Buffer.from(packet.bodyBase64, 'base64').toString('utf8')));
    const sse = Buffer.from('data: ' + JSON.stringify({ from: packet.request.from, envelope: packet.request.envelope }) + '\n\n');
    assert.ok(serverStreams.some(stream => stream.includes(sse)), 'Exact forwarded envelope must occur in captured receive bytes');
    const countId = entry.epoch + ':' + envelope.channel;
    const count = counts[countId] ||= { bytes: 0, messages: 0, epoch: entry.epoch, direction: envelope.channel };
    const firstSequence = epoch.sequenceStart ?? 0;
    assert.equal(envelope.sequence, firstSequence + count.messages); assert.equal(envelope.padStart, count.bytes); assert.equal(envelope.padLength, Buffer.byteLength(message.text));
    const nonce = entry.epoch + ':' + envelope.channel + ':' + envelope.iv; assert.ok(!nonces.has(nonce)); nonces.add(nonce);
    assert.equal(await decryptCaptured(envelope, host.bundle, material), message.text, 'Independent recovery of actual captured bytes');
    count.messages++; count.bytes += envelope.padLength;
    assert.ok(Date.parse(entry.decodedAt) >= Date.parse(entry.enteredAt));
    if (index) assert.ok(Date.parse(entry.enteredAt) >= Date.parse(comparison[index - 1].decodedAt), 'Next entry must follow previous decoded receipt');
  }
  let ledgerRecords = 0;
  for (const role of ['A', 'B']) {
    const store = read(path.join(control, 'ledgers', role, 'state.json'));
    for (const count of Object.values(counts)) {
      const epoch = epochs[count.epoch - 1], material = fs.readFileSync(path.join(control, epoch.directory, count.direction + '.bin'));
      const keyId = Core.initial(epoch.profileId, count.direction, sha(material.subarray(64)), MATERIAL_BYTES).id;
      const record = store.records[keyId]; Core.validate(record); ledgerRecords++;
      const sender = (role === 'A' ? 'AB' : 'BA') === count.direction;
      assert.equal(record.nextOut, sender ? count.bytes : 0); assert.deepEqual(record.incomingRanges, sender ? [] : [[0, count.bytes]]);
      if (!sender) assert.throws(() => Core.acceptIncoming(record, 0, 1), /overlap|reused/i);
    }
  }
  const first = JSON.parse(observed[0].request.envelope), epoch = epochs[0];
  const bundle = read(path.join(control, epoch.directory, 'A-provision.json')).bundle;
  const material = fs.readFileSync(path.join(control, epoch.directory, first.channel + '.bin'));
  const corrupted = { ...first }, bytes = Buffer.from(first.ciphertext, 'base64'); bytes[0] ^= 1; corrupted.ciphertext = bytes.toString('base64');
  await assert.rejects(decryptCaptured(corrupted, bundle, material), error => error.name === 'OperationError');
  await assert.rejects(decryptCaptured(first, { ...bundle, [first.channel]: randomBytes(32).toString('hex') }, material), error => error.name === 'OperationError');
  const secrets = epochs.flatMap(entry => {
    const directory = path.join(control, entry.directory), bundle = read(path.join(directory, 'A-provision.json')).bundle;
    return ['AB', 'BA'].flatMap(direction => [Buffer.from(bundle[direction]), fs.readFileSync(path.join(directory, direction + '.bin')).subarray(64, 128)]);
  });
  for (const relative of listFiles(capture)) {
    assert.ok(!/provision|plaintext|ledger|comparison|key-sets/i.test(relative), 'Control file leaked into observer directory');
    const bytes = fs.readFileSync(path.join(capture, relative));
    for (const message of fixture.messages) assert.ok(!bytes.includes(Buffer.from(message.text)), 'Plaintext leaked into observer files');
    for (const secret of secrets) assert.ok(!bytes.includes(secret), 'Secret key material leaked into observer files');
  }
  return { schema: 'cubechat-capture-verification-v1', verifiedAt: iso(), messages: observed.length, exactRecoveries: observed.length,
    keySets: epochs.length, rotations: epochs.length - 1, ledgerRecords, allNextEntriesAfterDecode: true,
    exactPostBodiesAndReceiveStreams: true, tamperRejected: true, wrongKeyRejected: true, overlappingRangesRejected: true,
    observerBundleContainsNoPlaintextOrKeys: true, perEpochDirection: Object.values(counts),
    scope: 'Unchanged network clients in two Node VM endpoints; canonical cube + AES-GCM; real loopback relay/TCP capture; filesystem ledger using canonical core. No browser IndexedDB, cellular radio, TLS, or production-security claim.' };
}

async function run() {
  const runId = randomUUID(), runDirectory = path.join(ROOT, 'artifacts', 'cubechat-capture', runId);
  const control = path.join(runDirectory, 'control'), capture = path.join(runDirectory, 'capture-only');
  fs.mkdirSync(control, { recursive: true }); fs.mkdirSync(capture);
  const fixture = read(path.join(ROOT, FIXTURE)); assert.equal(fixture.fictional, true);
  json(path.join(control, 'known-plaintext.json'), fixture);
  fs.writeFileSync(path.join(control, 'known-plaintext.txt'), fixture.messages.map(message => `${message.id} | ${message.at} | ${fixture.participants[message.sender].name}\n${message.text}\n`).join('\n'));
  const sourcePaths = [FIXTURE, 'cubechat-network.html', 'shadowrun-binary-cube-engine.js', 'cubechat-server.cjs', 'cubechat-large-key-adapter.js', 'cubechat-key-ledger-core.js', 'scripts/lib/cubechat-capture-client.cjs', 'scripts/lib/cubechat-capture-proxy.cjs', 'scripts/cubechat-capture-conversation.cjs'];
  json(path.join(control, 'run-manifest.json'), { runId, startedAt: iso(), rotateEveryDeliveredMessages: ROTATE_EVERY, randomMaterialBytesPerDirection: MATERIAL_BYTES,
    randomness: 'Node OS-backed cryptographic randomBytes; not an external certified physical TRNG',
    rotation: 'Fresh matching out-of-band provisioning imported on both disconnected endpoints at drained boundaries; no automatic ratchet',
    sources: sourcePaths.map(file => ({ file, sha256: sha(fs.readFileSync(path.join(ROOT, file))) })) });
  const auditPath = path.join(control, 'endpoint-audit.jsonl');
  const audit = value => fs.appendFileSync(auditPath, JSON.stringify({ at: iso(), ...value }) + '\n');
  let relay, proxy, clients = {}, complete = false, pending = null;
  const epochs = [], comparison = [];
  try {
    relay = await startRelay(control); proxy = await createCaptureProxy({ targetPort: relay.port, captureDirectory: capture });
    const profileId = randomBytes(12).toString('hex');
    for (const role of ['A', 'B']) clients[role] = await createClient({ role, baseUrl: proxy.baseUrl, ledgerDirectory: path.join(control, 'ledgers', role),
      onDecoded(receipt) {
        if (!pending || receipt.role !== pending.receiver) throw Error('Unexpected decoded receipt');
        assert.equal(receipt.text, pending.text); pending.decodedAt = receipt.receivedAt || iso();
        audit({ event: 'decoded-and-ledger-recorded', messageId: pending.messageId, role: receipt.role, plaintextSha256: sha(Buffer.from(receipt.text)) });
      } });
    for (let index = 0; index < fixture.messages.length; index++) {
      if (index % ROTATE_EVERY === 0) {
        for (const client of Object.values(clients)) await client.disconnect();
        const number = epochs.length + 1, name = 'epoch-' + String(number).padStart(3, '0'), relative = 'key-sets/' + name;
        const directory = path.join(control, relative); fs.mkdirSync(directory, { recursive: true });
        const bundle = { format: 'cubechat-secret-bundle-v1', AB: randomBytes(32).toString('hex'), BA: randomBytes(32).toString('hex') };
        const AB = largeFile(profileId, 'AB'), BA = largeFile(profileId, 'BA');
        fs.writeFileSync(path.join(directory, 'AB.bin'), AB, { mode: 0o600 }); fs.writeFileSync(path.join(directory, 'BA.bin'), BA, { mode: 0o600 });
        for (const role of ['A', 'B']) {
          json(path.join(directory, role + '-provision.json'), { format: 'cubechat-provision-v1', profileId, recipient: fixture.participants[role].name, role,
            endpoint: { host: '127.0.0.1', port: proxy.port, scheme: 'http:' }, bundle });
          await clients[role].provision({ profileId, bundle, AB: new Uint8Array(AB), BA: new Uint8Array(BA) });
        }
        epochs.push({ epoch: number, directory: relative, profileId, beginsAtMessage: index + 1, sequenceStart: Core.SEQUENCE_START, ABMaterialSha256: sha(AB.subarray(64)), BAMaterialSha256: sha(BA.subarray(64)) });
        audit({ event: 'coordinated-replacement-provisioned', epoch: number, beginsAtMessage: index + 1 });
        for (const client of Object.values(clients)) await client.connect();
      }
      const message = fixture.messages[index], receiver = message.sender === 'A' ? 'B' : 'A';
      pending = { messageId: message.id, receiver, text: message.text, enteredAt: iso(), decodedAt: null };
      audit({ event: 'plaintext-entry', messageId: message.id, sender: message.sender, afterDecodedMessageId: index ? fixture.messages[index - 1].id : null });
      await clients[message.sender].send(message.text);
      const deadline = Date.now() + 10000;
      while (!pending.decodedAt || !/Authenticated incoming/.test(clients[receiver].status())) {
        const errors = Object.values(clients).flatMap(client => client.errors || []); if (errors.length) throw Error(errors.join('; '));
        if (Date.now() > deadline) throw Error('Decoded receipt timed out for ' + message.id + ': ' + clients[receiver].status());
        await pause(5);
      }
      comparison.push({ observedIndex: index + 1, messageId: message.id, epoch: epochs.length, sender: message.sender,
        enteredAt: pending.enteredAt, decodedAt: pending.decodedAt, plaintextSha256: sha(Buffer.from(message.text)) });
      pending = null;
    }
    complete = true;
  } finally {
    for (const client of Object.values(clients)) await client.close();
    if (proxy) await proxy.close(); if (relay) await relay.close();
    json(path.join(control, 'key-sets.json'), epochs);
    if (!complete) json(path.join(control, 'incomplete-run.json'), { stoppedAt: iso(), completedMessages: comparison.length });
  }
  const requests = observedRequests(capture); assert.equal(requests.length, fixture.messages.length);
  const envelopes = requests.map((request, index) => {
    comparison[index].envelopeSha256 = sha(request.body.envelope);
    return { observedIndex: index + 1, capturedAt: request.capturedAt, connectionId: request.connectionId,
      method: request.method, path: request.path, bodyBytes: request.bodyBytes, bodySha256: sha(Buffer.from(request.bodyBase64, 'base64')),
      bodyBase64: request.bodyBase64, request: request.body };
  });
  fs.writeFileSync(path.join(capture, 'envelopes.jsonl'), envelopes.map(value => JSON.stringify(value)).join('\n') + '\n');
  json(path.join(control, 'comparison.json'), comparison);
  fs.writeFileSync(path.join(capture, 'CAPTURE-README.txt'), [
    'PASSIVE ENCRYPTED APPLICATION TRAFFIC CAPTURE', '',
    'This directory contains only observer-visible bytes and metadata from a controlled local run.',
    'streams/*.bin are exact TCP byte streams in each direction. chunk-index.jsonl records capture timing and stream offsets.',
    'connections.json identifies streams. envelopes.jsonl indexes observed POST /send bodies; bodyBase64 preserves each exact body.',
    'Stream chunks are read/write boundaries, not IP packets. This is not a PCAP, cellular radio capture, or TLS capture.',
    'No original message text, provisioning secrets, random key files, endpoint ledgers or plaintext comparisons are included.',
    'Visible routing labels, IVs, sequences, mode, byte offsets, lengths and timing have been retained.',
    'The application envelope includes AES-GCM around an experimental cube transform. No security conclusion follows from this capture.',
    'Timestamps are actual execution times. Conversation dates and human reply delays are not simulated.', ''
  ].join('\n'));
  fs.writeFileSync(path.join(capture, 'SHA256SUMS.txt'), listFiles(capture).map(file => sha(fs.readFileSync(path.join(capture, file))) + '  ' + file).join('\n') + '\n');
  const verification = await verifyRun(runDirectory); json(path.join(control, 'verification.json'), verification);
  const archive = zipDirectory(capture, path.join(runDirectory, 'capture-only.zip')); json(path.join(control, 'archive.json'), archive);
  fs.writeFileSync(path.join(runDirectory, 'LOCAL-CONTROL-DO-NOT-SHARE.txt'), 'Share only capture-only.zip or capture-only/.\ncontrol/ contains original messages, all test secrets, ledgers and the answer mapping.\nDo not reuse this test material for another run or real communication.\n');
  json(path.join(ROOT, 'artifacts', 'cubechat-capture', 'latest-run.json'), { runId, runDirectory, captureZip: path.join(runDirectory, 'capture-only.zip'), verification: path.join(control, 'verification.json') });
  console.log('PASS: ' + verification.messages + ' messages entered, encoded, encrypted, transported, received and decoded exactly.');
  console.log('PASS: ' + verification.keySets + ' random directional key sets; durable nonoverlapping ledger reservations; each next entry follows decoded receipt.');
  console.log('PASS: independent recovery from captured bytes, receive-stream match, wrong-key/tamper rejection, capture-only separation.');
  console.log('Capture only: ' + path.join(runDirectory, 'capture-only.zip'));
  console.log('Local controls: ' + control);
  console.log('Archive SHA-256: ' + archive.sha256);
}

if (require.main === module) {
  const operation = process.argv[2] === '--verify' ? verifyRun(path.resolve(process.argv[3] || '')).then(result => console.log(JSON.stringify(result, null, 2))) : run();
  operation.catch(error => { console.error('FAIL: ' + (error.stack || error)); process.exitCode = 1; });
}
module.exports = { verifyRun };
