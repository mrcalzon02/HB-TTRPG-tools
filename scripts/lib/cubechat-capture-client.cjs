'use strict';

// Test-only Node host for the unchanged CubeChat network client. The application
// still performs all encoding, AES-GCM, send, authentication and decoding. Only
// the DOM, EventSource transport, and browser IndexedDB backend are adapted here.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const http = require('node:http');
const https = require('node:https');
const { createHash, webcrypto } = require('node:crypto');
const Core = require('../../cubechat-key-ledger-core.js');
const ROOT = path.resolve(__dirname, '../..');

function waitFor(predicate, label, timeout = 10000) {
  const deadline = Date.now() + timeout;
  return new Promise((resolve, reject) => {
    function check() {
      try {
        if (predicate()) return resolve();
        if (Date.now() >= deadline) return reject(Error('Timed out: ' + label));
        setTimeout(check, 10);
      } catch (error) { reject(error); }
    }
    check();
  });
}

function durableLedger(directory, role) {
  fs.mkdirSync(directory, { recursive: true });
  const statePath = path.join(directory, 'state.json');
  const journalPath = path.join(directory, 'journal.ndjson');
  let queue = Promise.resolve();
  function read() {
    let state;
    try { state = JSON.parse(fs.readFileSync(statePath, 'utf8')); }
    catch (error) {
      if (error.code !== 'ENOENT') throw error;
      return { schema: 'cubechat-node-ledger-store-v1', role, records: {}, sequences: {} };
    }
    if (state.schema !== 'cubechat-node-ledger-store-v1' || state.role !== role || !state.records || Array.isArray(state.records)) throw Error('Invalid Node ledger store');
    for (const [id, record] of Object.entries(state.records)) {
      Core.validate(record);
      if (record.id !== id) throw Error('Invalid Node ledger identity');
    }
    state.sequences ??= {};
    return state;
  }
  function write(state) {
    const temporary = statePath + '.' + process.pid + '.tmp';
    const descriptor = fs.openSync(temporary, 'w', 0o600);
    try { fs.writeFileSync(descriptor, JSON.stringify(state, null, 2) + '\n'); fs.fsyncSync(descriptor); }
    finally { fs.closeSync(descriptor); }
    fs.renameSync(temporary, statePath);
  }
  function journal(event) {
    const descriptor = fs.openSync(journalPath, 'a', 0o600);
    try { fs.writeFileSync(descriptor, JSON.stringify({ at: new Date().toISOString(), role, ...event }) + '\n'); fs.fsyncSync(descriptor); }
    finally { fs.closeSync(descriptor); }
  }
  function transaction(operation) {
    const result = queue.then(() => operation(read()));
    queue = result.catch(() => {});
    return result;
  }
  function enrolledId(key) {
    if (!key?.ledgerId) throw Error('Consumable key not enrolled into durable Node ledger');
    return key.ledgerId;
  }
  const api = {
    async sequenceId(profile, direction, secret) {
      return Core.sequenceId(profile, direction, createHash('sha256').update(secret).digest('hex'));
    },
    reserveSequence(id) {
      return transaction(store => {
        const { state, value } = Core.reserveSequence(id, store.sequences[id]);
        store.sequences[id] = state;
        write(store);
        return value;
      });
    },
    markSequence(id, sequence) {
      return transaction(store => {
        store.sequences[id] = Core.acceptSequence(id, store.sequences[id], sequence).state;
        write(store);
      });
    },
    enroll(key, confirmUnused) {
      return transaction(store => {
        if (!key || !(key.bytes instanceof Uint8Array)) throw Error('Import a parsed CCLK2 key before enrollment');
        const fingerprint = createHash('sha256').update(key.bytes).digest('hex');
        const base = Core.initial(key.profile, key.direction, fingerprint, key.bytes.length);
        let record = store.records[base.id];
        const newFile = !record;
        if (newFile) {
          if (confirmUnused !== true) throw Error('Unrecognized consumable material: attest unused before enrollment');
          store.records[base.id] = record = base;
          write(store);
        } else {
          Core.validate(record);
          if (record.id !== base.id || record.capacity !== base.capacity) throw Error('Imported CCLK2 file does not match durable record');
        }
        journal({ operation: 'enroll', id: record.id, profile: record.profile, direction: record.direction, capacity: record.capacity, nextOut: record.nextOut, newFile });
        key.ledgerId = base.id;
        return { newFile, outboundNext: record.nextOut, fingerprint };
      });
    },
    reserve(key, length) {
      return transaction(store => {
        const id = enrolledId(key), record = store.records[id];
        if (!record) throw Error('Key ledger missing; refusing to reset key position');
        const reservation = Core.reserve(record, length);
        store.records[id] = reservation.state;
        write(store); // The region is committed before the application encrypts.
        journal({ operation: 'reserve', id, direction: record.direction, start: reservation.start, length, nextOut: reservation.state.nextOut });
        return reservation.start;
      });
    },
    markIncoming(key, start, length) {
      return transaction(store => {
        const id = enrolledId(key), record = store.records[id];
        if (!record) throw Error('Incoming key ledger missing; refusing material reuse');
        const accepted = Core.acceptIncoming(record, start, length);
        store.records[id] = accepted.state;
        write(store);
        journal({ operation: 'receive', id, direction: record.direction, start, length, nextOut: accepted.state.nextOut });
        return true;
      });
    }
  };
  return {
    api: Object.freeze(api),
    async snapshot() {
      await queue;
      const state = read();
      const journalEntries = fs.existsSync(journalPath) ? fs.readFileSync(journalPath, 'utf8').trim().split('\n').filter(Boolean).map(line => JSON.parse(line)) : [];
      return { ...state, journal: journalEntries };
    }
  };
}

async function createClient({ role, baseUrl, ledgerDirectory, onDecoded, onSent }) {
  if (!['A', 'B'].includes(role)) throw Error('Client role must be A or B');
  const endpoint = new URL(baseUrl);
  if (!['http:', 'https:'].includes(endpoint.protocol) || !endpoint.port || !ledgerDirectory) throw Error('Explicit relay origin and ledger directory required');
  const origin = endpoint.origin, messages = [], errors = [], streams = new Set(), callbacks = new Set();
  let fatal = null, provisioned = false, sending = false, closed = false;
  const ledger = durableLedger(path.resolve(ledgerDirectory), role);
  function fail(error) { const reason = error instanceof Error ? error : Error(String(error)); errors.push(reason.message); fatal ||= reason; }
  function callback(fn, event) {
    if (!fn) return;
    try {
      const result = fn(event);
      if (result && typeof result.then === 'function') {
        const pending = Promise.resolve(result).catch(fail).finally(() => callbacks.delete(pending));
        callbacks.add(pending);
      }
    } catch (error) { fail(error); }
  }
  class Element {
    constructor(tag, id = '') { this.tagName = tag.toUpperCase(); this.id = id; this.children = []; this._text = ''; this.className = ''; this.value = ''; this.disabled = false; this.checked = false; this.files = []; this.onclick = null; }
    get textContent() { return this._text + this.children.map(child => child.textContent).join(''); }
    set textContent(value) {
      this._text = String(value ?? ''); this.children = [];
      if (this.id === 'status' && /^(Incoming message rejected:|Send failed:|Provision import failed:|Demo initialization failed:)/.test(this._text)) fail(Error(role + ': ' + this._text));
    }
    append(child) {
      this.children.push(child);
      if (this.id === 'messages' && /\bbubble\b/.test(child.className)) {
        const at = new Date().toISOString(), mine = /\bmine\b/.test(child.className);
        const event = { text: child.textContent, mine, role, at, ...(mine ? {} : { receivedAt: at }) };
        messages.push(event);
        callback(mine ? onSent : onDecoded, event);
      }
    }
    scrollIntoView() {}
    click() { return this.onclick?.(); }
  }
  const html = fs.readFileSync(path.join(ROOT, 'cubechat-network.html'), 'utf8');
  const elements = new Map();
  for (const match of html.matchAll(/<([a-z][a-z0-9]*)\b[^>]*\bid="([^"]+)"[^>]*>/gi)) {
    const element = new Element(match[1], match[2]);
    element.disabled = /\bdisabled\b/i.test(match[0]);
    const value = /\bvalue="([^"]*)"/i.exec(match[0]);
    if (value) element.value = value[1];
    elements.set(element.id, element);
  }
  const get = id => { if (!elements.has(id)) throw Error('Unknown client UI element: ' + id); return elements.get(id); };
  get('role').value = role;
  get('host').value = endpoint.hostname;
  get('port').value = endpoint.port;

  class EventSourceAdapter {
    constructor(relative) {
      this.onopen = null; this.onmessage = null; this.onerror = null;
      this.readyState = 0; this.closed = false; this.buffer = ''; this.request = null; this.response = null;
      streams.add(this);
      const url = new URL(relative, origin);
      const transport = url.protocol === 'https:' ? https : http;
      this.request = transport.get(url, response => {
        this.response = response;
        if (response.statusCode !== 200) return this.error(Error('EventSource HTTP ' + response.statusCode));
        this.readyState = 1; this.onopen?.({ type: 'open' });
        response.setEncoding('utf8');
        response.on('data', chunk => {
          this.buffer += chunk.replace(/\r\n/g, '\n');
          let separator;
          while ((separator = this.buffer.indexOf('\n\n')) !== -1) {
            const frame = this.buffer.slice(0, separator); this.buffer = this.buffer.slice(separator + 2);
            const data = frame.split('\n').filter(line => line.startsWith('data:')).map(line => line.slice(5).replace(/^ /, '')).join('\n');
            if (data) { try { this.onmessage?.({ data }); } catch (error) { fail(error); } }
          }
        });
        response.on('error', error => this.error(error));
        response.on('end', () => { if (!this.closed) this.error(Error('EventSource ended unexpectedly')); });
      });
      this.request.on('error', error => this.error(error));
    }
    error(error) { if (this.closed) return; this.readyState = 2; fail(error); this.onerror?.({ type: 'error' }); this.close(); }
    close() { if (this.closed) return; this.closed = true; this.readyState = 2; this.response?.destroy(); this.request?.destroy(); streams.delete(this); }
  }
  const context = vm.createContext({
    console, TextEncoder, TextDecoder, Uint8Array, ArrayBuffer, DataView, URL, Blob,
    crypto: webcrypto, setTimeout, clearTimeout,
    btoa: text => Buffer.from(text, 'binary').toString('base64'),
    atob: text => Buffer.from(text, 'base64').toString('binary'),
    location: { origin, protocol: endpoint.protocol },
    document: { getElementById: get, createElement: tag => new Element(tag) },
    fetch: (url, options) => fetch(new URL(url, origin), { ...options, signal: options?.signal || AbortSignal.timeout(10000) }),
    EventSource: EventSourceAdapter,
    CubeChatKeyLedger: ledger.api
  });
  context.window = context;
  for (const source of ['shadowrun-binary-cube-engine.js', 'cubechat-large-key-adapter.js', 'cubechat-key-ledger-core.js']) {
    vm.runInContext(fs.readFileSync(path.join(ROOT, source), 'utf8'), context, { filename: source });
  }
  const inline = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)].filter(match => !/\bsrc\s*=/.test(match[1]));
  if (inline.length !== 1) throw Error('Expected one unchanged CubeChat network application script');
  vm.runInContext(inline[0][2], context, { filename: 'cubechat-network-inline.js' });
  await waitFor(() => { if (fatal) throw fatal; return /PUBLIC DEMONSTRATION KEYS preloaded/.test(get('status').textContent); }, 'client initialization');
  function healthy() { if (closed) throw Error('Client is closed'); if (fatal) throw fatal; }
  async function invoke(id) {
    healthy();
    if (typeof get(id).onclick !== 'function') throw Error('Missing actual client action: ' + id);
    await get(id).onclick();
    healthy();
  }
  function file(name, input) {
    const data = Buffer.from(input);
    return { name, size: data.length, text: async () => data.toString('utf8'), arrayBuffer: async () => Uint8Array.from(data).buffer };
  }
  return {
    role, messages, errors,
    status: () => get('status').textContent,
    async provision({ profileId, bundle, AB, BA }) {
      healthy();
      await invoke('disconnect');
      if (!/^[a-f0-9]{24}$/.test(profileId || '') || !AB || !BA) throw Error('Fresh matching profile and CCLK2 files required');
      const packageValue = { format: 'cubechat-provision-v1', profileId, recipient: 'Fictional coordinator ' + role, role, endpoint: { scheme: endpoint.protocol, host: endpoint.hostname, port: Number(endpoint.port) }, bundle };
      get('provisionFile').files = [file('provision.json', Buffer.from(JSON.stringify(packageValue)))];
      await invoke('provisionImport');
      if (!get('status').textContent.startsWith('Provisioned ')) throw Error(get('status').textContent);
      get('largeFiles').files = [file('AB.bin', AB), file('BA.bin', BA)];
      get('largeFresh').checked = true;
      await invoke('loadLarge');
      if (!get('status').textContent.startsWith('Large key material imported')) throw Error(get('status').textContent);
      provisioned = true;
    },
    async connect() {
      healthy();
      if (!provisioned) throw Error('Fresh private provisioning required before connecting');
      await invoke('connect');
      await waitFor(() => { healthy(); return !get('send').disabled; }, 'client ' + role + ' relay connection');
    },
    async disconnect() { await invoke('disconnect'); },
    async send(text) {
      healthy();
      if (!provisioned || get('send').disabled || sending) throw Error('Client not provisioned/connected, or send already in progress');
      sending = true;
      const previous = messages.length;
      try {
        get('message').value = text;
        await invoke('send');
        if (get('message').value !== '' || !messages.slice(previous).some(message => message.mine && message.text === text)) throw Error('Actual network client did not complete send: ' + get('status').textContent);
        await Promise.all([...callbacks]);
        healthy();
      } finally { sending = false; }
    },
    ledgerSnapshot: () => ledger.snapshot(),
    async close() {
      if (closed) return;
      get('disconnect').onclick?.();
      for (const stream of [...streams]) stream.close();
      await Promise.all([...callbacks]);
      await ledger.snapshot();
      closed = true;
    }
  };
}

module.exports = { createClient };
