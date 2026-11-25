'use strict';

const assert = require('node:assert/strict');
const { webcrypto } = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { setTimeout: delay } = require('node:timers/promises');
const vm = require('node:vm');
const ledgerCore = require('../cubechat-key-ledger-core.js');

const root = path.resolve(__dirname, '..');
const origin = 'http://127.0.0.1:8787';
const profile = 'a'.repeat(24);
const bundle = { format: 'cubechat-secret-bundle-v1', AB: '12'.repeat(32), BA: '34'.repeat(32) };
const engine = fs.readFileSync(path.join(root, 'shadowrun-binary-cube-engine.js'), 'utf8');
const largeKeyAdapter = fs.readFileSync(path.join(root, 'cubechat-large-key-adapter.js'), 'utf8');
const streams = new Map(), posts = [];

class Element {
  constructor() {
    this.value = '';
    this.children = [];
    this.files = [];
  }
  set textContent(text) {
    this.text = text;
    this.children.length = 0;
  }
  get textContent() { return this.text || ''; }
  append(node) { this.children.push(node); }
  scrollIntoView() {}
}

class EventStream {
  constructor(url) {
    const { searchParams } = new URL(url, origin);
    this.id = searchParams.get('profile') + ':' + searchParams.get('role');
    streams.set(this.id, this);
    queueMicrotask(() => this.onopen());
  }
  close() { streams.delete(this.id); }
}

function fetchRelay(url, { body }) {
  assert.equal(url, '/send');
  return new Promise(resolve => posts.push({ body: JSON.parse(body), resolve }));
}

function openPage(filename) {
  const elements = new Map();
  const records = new WeakMap();
  function get(id) {
    if (!elements.has(id)) elements.set(id, new Element());
    return elements.get(id);
  }
  const html = fs.readFileSync(path.join(root, filename), 'utf8');
  const source = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
  assert.equal(source.length, 1, filename);
  const context = vm.createContext({
    document: { getElementById: get, createElement: () => new Element() },
    crypto: webcrypto, URL, TextEncoder, TextDecoder, Uint8Array, ArrayBuffer, DataView, btoa, atob,
    location: { origin, protocol: 'http:' }, EventSource: EventStream, fetch: fetchRelay,
    CubeChatKeyLedger: {
      async enroll(key) { records.set(key, ledgerCore.initial(key.profile, key.direction, '0'.repeat(64), key.bytes.length)); },
      async reserve(key, size) {
        const { start, state } = ledgerCore.reserve(records.get(key), size);
        records.set(key, state);
        return start;
      },
      async markIncoming(key, start, size) {
        records.set(key, ledgerCore.acceptIncoming(records.get(key), start, size).state);
      }
    }
  });
  context.window = context;
  vm.runInContext(engine, context, { filename: 'shadowrun-binary-cube-engine.js' });
  vm.runInContext(largeKeyAdapter, context, { filename: 'cubechat-large-key-adapter.js' });
  vm.runInContext(source[0][1], context, { filename });
  return get;
}

function provision(role) {
  const contents = JSON.stringify({
    format: 'cubechat-provision-v1', role, profileId: profile, recipient: 'Test contact',
    endpoint: { scheme: 'http:', host: '127.0.0.1', port: 8787 }, bundle
  });
  return { size: Buffer.byteLength(contents), text: async () => contents };
}

function padFile(direction) {
  const capacity = 1024;
  const contents = Buffer.alloc(64 + capacity);
  contents.write('CCLK2');
  contents[5] = 1;
  contents[6] = direction;
  Buffer.from(profile, 'hex').copy(contents, 8);
  contents.writeUInt32BE(capacity, 20);
  contents.fill(direction, 64);
  return { size: contents.length, arrayBuffer: async () => Uint8Array.from(contents).buffer };
}

async function waitFor(condition, label) {
  const deadline = Date.now() + 3000;
  while (!condition()) {
    if (Date.now() >= deadline) assert.fail('Timed out waiting for ' + label);
    await delay(5);
  }
}

function draft(page, text) {
  const editor = page('message');
  editor.value = text;
  editor.oninput?.();
}

function nextPost(sequence, from, to, padStart) {
  const { body, resolve } = posts.shift();
  assert.deepEqual({ from: body.from, to: body.to, profile: body.profile }, { from, to, profile });
  const packet = JSON.parse(body.envelope);
  assert.equal(packet.sequence, sequence, from + ' should allocate a fresh sequence');
  assert.equal(packet.mode, padStart === null ? 'deterministic' : 'large-pad-v1');
  assert.equal(packet.padStart, padStart);
  return { body, resolve };
}

async function forward(post, log, text) {
  const { profile, from, to, envelope } = post.body;
  const stream = streams.get(profile + ':' + to);
  assert.ok(stream, 'Recipient must be connected');
  stream.onmessage({ data: JSON.stringify({ from, envelope }) });
  await waitFor(() => log.children.some(entry => entry.textContent === text), 'authenticated ' + text);
}

function finish(post, ok) {
  post.resolve({ ok, status: ok ? 200 : 503, json: async () => ({ deliveredConnections: 1 }) });
}

async function exercise(sender, recipientLog, from, to, large) {
  const firstText = from + ' first message';
  const secondText = from + ' second message';
  const secondOffset = Buffer.byteLength(firstText);
  const failedOffset = secondOffset + Buffer.byteLength(secondText);
  draft(sender, firstText);
  const firstSend = sender('send').onclick();
  await waitFor(() => posts.length === 1, 'first relay request');
  const first = nextPost(0, from, to, large ? 0 : null);

  draft(sender, secondText);
  const secondSend = sender('send').onclick();
  await waitFor(() => posts.length === 1, 'second request while first response is pending');
  const second = nextPost(1, from, to, large ? secondOffset : null);
  draft(sender, from + ' newer draft');

  await forward(first, recipientLog, firstText);
  await forward(second, recipientLog, secondText);
  finish(second, true);
  finish(first, true);
  await Promise.all([firstSend, secondSend]);
  assert.equal(sender('message').value, from + ' newer draft', 'Older responses must preserve the draft');

  const retryText = from + ' retry message';
  draft(sender, retryText);
  const failedSend = sender('send').onclick();
  await waitFor(() => posts.length === 1, 'failed relay request');
  finish(nextPost(2, from, to, large ? failedOffset : null), false);
  await failedSend;
  assert.equal(sender('message').value, retryText, 'A failed send must retain the draft');

  const retry = sender('send').onclick();
  await waitFor(() => posts.length === 1, 'retry relay request');
  const retried = nextPost(3, from, to, large ? failedOffset + Buffer.byteLength(retryText) : null);
  await forward(retried, recipientLog, retryText);
  finish(retried, true);
  await retry;
  assert.equal(sender('message').value, '');
}

async function testMode(large) {
  const host = openPage('cubechat-host.html');
  const guest = openPage('cubechat-network.html');
  await waitFor(() => guest('status').textContent.includes('KEYS preloaded'), 'guest initialization');
  host('imports').files = [provision('A')];
  guest('provisionFile').files = [provision('B')];
  await Promise.all([host('load').onclick(), guest('provisionImport').onclick()]);
  if (large) {
    for (const page of [host, guest]) {
      page('largeFiles').files = [padFile(1), padFile(2)];
      page('largeFresh').checked = true;
      await page('loadLarge').onclick();
    }
  }
  host('connect').onclick();
  guest('connect').onclick();
  await waitFor(() => streams.size === 2 && !host('send').disabled && !guest('send').disabled, 'both clients connected');
  await exercise(host, guest('messages'), 'A', 'B', large);
  await exercise(guest, host('log'), 'B', 'A', large);
  host('disconnect').onclick();
  guest('disconnect').onclick();
}

async function main() {
  await testMode(false);
  await testMode(true);
  console.log('PASS: both browser clients used distinct sequences for overlapping sends and retries in deterministic and CCLK2 modes. Newer drafts survived and CCLK2 ranges were not reused.');
}

main().catch(error => { console.error(error); process.exitCode = 1; });
