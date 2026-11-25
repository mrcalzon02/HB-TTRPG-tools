'use strict';

const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

// Use deterministic response queues and timers with the real request handler.
const intervals = new Set(), deadlines = new Set();
const server = {
  listen(port, host) { this.address = { port, host }; }
};
const maxSubscribers = 64, maxPerRoute = 8;
const maxPendingBytes = 1024 * 1024 + 4096, drainTimeoutMs = 10_000;
const filename = path.resolve(__dirname, '..', 'cubechat-server.cjs');
const source = fs.readFileSync(filename, 'utf8');
const clients = vm.runInNewContext(source + '\nclients;', {
  __dirname: path.dirname(filename),
  process: { env: {}, argv: [] },
  require(name) {
    if (name === 'node:http') return { createServer(handler) { server.handle = handler; return server; } };
    if (name === './cubechat-forum.cjs') return { handle: () => false };
    return require(name);
  },
  Buffer, URL,
  setInterval(callback) { intervals.add(callback); return callback; },
  clearInterval(callback) { intervals.delete(callback); },
  setTimeout(callback, ms) { const timer = { callback, ms }; deadlines.add(timer); return timer; },
  clearTimeout(timer) { deadlines.delete(timer); }
}, { filename });

class Response extends EventEmitter {
  constructor() {
    super();
    this.writableLength = 0;
    this.frames = [];
  }
  writeHead(status) { this.status = status; this.headersSent = true; }
  end(text) { this.body = text; this.writableEnded = true; }
  write(frame) {
    this.frames.push(frame.toString());
    if (this.blocked) this.writableLength += frame.length;
    return !this.blocked;
  }
  drain() {
    this.blocked = false;
    this.writableLength = 0;
    this.emit('drain');
  }
  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    this.emit('close');
  }
}

function request(method, url, body) {
  const req = Object.assign(new EventEmitter(), { method, url });
  const response = new Response();
  server.handle(req, response);
  if (body) req.emit('data', Buffer.from(JSON.stringify(body)));
  req.emit('end');
  return response;
}

const profile = number => number.toString(16).padStart(24, '0');
function subscribe(number) {
  return request('GET', '/events?profile=' + profile(number) + '&role=B');
}
function send(number) {
  const envelope = JSON.stringify({ format: 'cubechat-local-v1', iv: 'AAAAAAAAAAAAAAAA', ciphertext: 'dGVzdA==' });
  const res = request('POST', '/send', { profile: profile(number), from: 'A', to: 'B', envelope });
  assert.equal(res.status, 200);
  return JSON.parse(res.body).deliveredConnections;
}

assert.equal(send(101), 0);
assert.equal(send(102), 0);
assert.equal(clients.size, 0, 'Unsubscribed sends must not allocate routing entries');
assert.equal(server.address.host, '127.0.0.1');
assert.equal(server.maxConnections, 128);

const sameRoute = Array.from({ length: maxPerRoute }, () => subscribe(1));
assert.ok(sameRoute.every(response => response.status === 200));
assert.equal(subscribe(1).status, 429);
assert.equal(send(1), maxPerRoute);
sameRoute[0].destroy();
const replacement = subscribe(1);
assert.equal(replacement.status, 200, 'Disconnect must release a route slot');
replacement.destroy();
for (const response of sameRoute.slice(1)) response.destroy();
assert.equal(clients.size, 0, 'Last disconnect must remove the route');

const uniqueRoutes = Array.from({ length: maxSubscribers }, (_, i) => subscribe(i + 1));
assert.ok(uniqueRoutes.every(response => response.status === 200));
assert.equal(subscribe(maxSubscribers + 1).status, 503);
assert.equal(clients.size, maxSubscribers);
for (const response of uniqueRoutes) response.destroy();

const good = subscribe(2), slow = subscribe(2);
slow.blocked = true;
assert.equal(send(2), 2, 'Both streams accept the first in-budget frame');
assert.equal(deadlines.size, 1);
slow.drain();
assert.equal(deadlines.size, 0, 'A healthy drain must cancel the deadline');
assert.equal(send(2), 2);

slow.blocked = true;
slow.writableLength = maxPendingBytes;
const priorWrites = slow.frames.length;
assert.equal(send(2), 1, 'Only the healthy stream accepts another frame');
assert.equal(slow.destroyed, true);
assert.equal(slow.frames.length, priorWrites, 'Never enqueue a frame over budget');
assert.ok(good.frames.at(-1).startsWith('data: '));

const stalled = subscribe(2);
stalled.blocked = true;
assert.equal(send(2), 2);
const [timeout] = deadlines;
assert.equal(timeout.ms, drainTimeoutMs);
assert.equal(send(2), 2);
assert.deepEqual([...deadlines], [timeout], 'Further writes must not postpone the drain deadline');
timeout.callback();
assert.equal(stalled.destroyed, true);
assert.equal(deadlines.size, 0);
good.destroy();
assert.equal(clients.size, 0);
assert.equal(intervals.size, 0, 'Disconnects must release all heartbeat timers');
console.log('PASS: loopback default, connection and subscription bounds, idle-route cleanup, output cap, and drain deadlines.');
