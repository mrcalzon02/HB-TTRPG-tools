#!/usr/bin/env node
'use strict';

// Execute the real local CubeChat page and canonical engine with Web Crypto.
// This DOM harness verifies the scenario without a browser or npm packages.
// It does not verify browser layout, relay transport, or production security.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { webcrypto } = require('node:crypto');

const ROOT = path.resolve(__dirname, '..');
const FIXTURE = path.join(ROOT, 'data/cubechat/sailing-family-conversation.json');
const PAGE = path.join(ROOT, 'cubechat.html');
const scenario = JSON.parse(fs.readFileSync(FIXTURE, 'utf8'));
const html = fs.readFileSync(PAGE, 'utf8');
const encoder = new TextEncoder();
const decoder = new TextDecoder();

function entries(value) {
  if (Array.isArray(value)) return value.map(item => [typeof item === 'string' ? item : item.id || item.role, item]);
  return Object.entries(value || {});
}

function validateFixture() {
  assert.equal(scenario.schema, 'cubechat-scenario-v1');
  const metadata = { ...scenario };
  delete metadata.messages;
  assert.match(JSON.stringify(metadata), /fictional|synthetic/i, 'Scenario must identify its fictional status');
  const participants = new Map(entries(scenario.participants));
  assert.deepEqual([...participants.keys()].sort(), ['A', 'B'], 'Only the two fictional coordinators may speak');
  const stages = new Set(entries(scenario.stages).map(([id]) => id));
  assert.ok(stages.size > 0, 'Scenario must define its conversation stages');
  assert.ok(Array.isArray(scenario.messages) && scenario.messages.length >= 50, 'Scenario needs at least 50 exchanges');
  const ids = new Set();
  const speakers = new Set();
  let previousTime = -Infinity;
  for (const message of scenario.messages) {
    assert.equal(typeof message.id, 'string');
    assert.ok(message.id && !ids.has(message.id), 'Message IDs must be nonempty and unique: ' + message.id);
    ids.add(message.id);
    assert.ok(participants.has(message.sender), 'Unknown sender for ' + message.id);
    speakers.add(message.sender);
    assert.ok(stages.has(message.stage), 'Unknown conversation stage for ' + message.id);
    const time = Date.parse(message.at);
    assert.ok(Number.isFinite(time), 'Invalid timestamp for ' + message.id);
    assert.ok(time >= previousTime, 'Timestamps must be in conversation order: ' + message.id);
    previousTime = time;
    assert.equal(typeof message.text, 'string');
    assert.ok(message.text.trim(), 'Empty message: ' + message.id);
    assert.ok(encoder.encode(message.text).length <= 4096, 'Message exceeds network client size limit: ' + message.id);
  }
  assert.equal(speakers.size, 2, 'Both coordinators must participate');
}

class Element {
  constructor(tagName = 'div', id = '') {
    this.tagName = tagName.toUpperCase();
    this.id = id;
    this.children = [];
    this.parentNode = null;
    this._text = '';
    this.value = '';
    this.className = '';
    this.disabled = false;
    this.hidden = false;
    this.attributes = new Map();
    this.scrollTop = 0;
    this.onclick = null;
  }
  get textContent() { return this._text + this.children.map(child => child.textContent).join(''); }
  set textContent(value) {
    this._text = String(value ?? '');
    for (const child of this.children) child.parentNode = null;
    this.children = [];
  }
  get scrollHeight() { return this.children.length; }
  get firstChild() { return this.children[0] || null; }
  append(...children) {
    for (let child of children) {
      if (typeof child === 'string') {
        const text = new Element('#text');
        text.textContent = child;
        child = text;
      }
      assert.ok(child instanceof Element, 'DOM append requires a node');
      child.parentNode = this;
      this.children.push(child);
    }
  }
  appendChild(child) { this.append(child); return child; }
  replaceChildren(...children) { this.textContent = ''; this.append(...children); }
  setAttribute(name, value) { this.attributes.set(name, String(value)); }
  getAttribute(name) { return this.attributes.get(name) ?? null; }
  scrollIntoView() {}
  querySelectorAll(selector) {
    const matches = [];
    const visit = element => {
      for (const child of element.children) {
        const match = selector.startsWith('.')
          ? child.className.split(/\s+/).includes(selector.slice(1))
          : child.tagName.toLowerCase() === selector.toLowerCase();
        if (match) matches.push(child);
        visit(child);
      }
    };
    visit(this);
    return matches;
  }
}

function createHarness(search = '') {
  const elements = new Map();
  for (const match of html.matchAll(/<([a-z][a-z0-9]*)\b[^>]*\bid="([^"]+)"[^>]*>/gi)) {
    const element = new Element(match[1], match[2]);
    element.disabled = /\bdisabled\b/i.test(match[0]);
    elements.set(element.id, element);
  }
  const get = id => {
    assert.ok(elements.has(id), 'Missing UI element #' + id);
    return elements.get(id);
  };
  const cryptography = { encryptions: [], authenticatedRejections: 0 };
  const subtle = new Proxy(webcrypto.subtle, {
    get(target, property) {
      if (property === 'encrypt') return async (algorithm, key, plaintext) => {
        const ciphertext = await target.encrypt(algorithm, key, plaintext);
        cryptography.encryptions.push({
          aad: JSON.parse(decoder.decode(algorithm.additionalData)),
          iv: Buffer.from(algorithm.iv).toString('hex')
        });
        return ciphertext;
      };
      if (property === 'decrypt') return async (...args) => {
        try { return await target.decrypt(...args); }
        catch (error) {
          if (error.name === 'OperationError') cryptography.authenticatedRejections++;
          throw error;
        }
      };
      const value = Reflect.get(target, property, target);
      return typeof value === 'function' ? value.bind(target) : value;
    }
  });
  const requested = [];
  const context = vm.createContext({
    console,
    TextEncoder,
    TextDecoder,
    URLSearchParams,
    Uint8Array,
    location: { search },
    crypto: { subtle, getRandomValues: webcrypto.getRandomValues.bind(webcrypto) },
    btoa: value => Buffer.from(value, 'binary').toString('base64'),
    atob: value => Buffer.from(value, 'base64').toString('binary'),
    setTimeout,
    clearTimeout,
    document: { getElementById: get, createElement: tag => new Element(tag) },
    fetch: async url => {
      assert.equal(new URL(String(url), 'http://127.0.0.1:8787/').pathname, '/data/cubechat/sailing-family-conversation.json', 'Scenario must load its local fixture');
      requested.push(String(url));
      return { ok: true, status: 200, json: async () => JSON.parse(JSON.stringify(scenario)) };
    }
  });
  context.window = context;
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'shadowrun-binary-cube-engine.js'), 'utf8'), context, { filename: 'shadowrun-binary-cube-engine.js' });
  const scripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)].filter(match => !/\bsrc\s*=/.test(match[1]));
  assert.ok(scripts.length, 'CubeChat must have an inline application script');
  scripts.forEach((match, index) => vm.runInContext(match[2], context, { filename: 'cubechat-inline-' + index + '.js' }));
  const click = async id => {
    const element = get(id);
    assert.equal(element.disabled, false, '#' + id + ' must be enabled');
    assert.equal(typeof element.onclick, 'function', '#' + id + ' must have a handler');
    await element.onclick();
    assert.doesNotMatch(get('status').className, /\berror\b/, get('status').textContent);
  };
  return { get, click, requested, cryptography };
}

function hasExactText(node, expected) {
  return node.textContent === expected || node.children.some(child => hasExactText(child, expected));
}

function assertTranscript(harness, expectedMessages) {
  for (const pane of ['am', 'bm']) {
    const bubbles = harness.get(pane).querySelectorAll('.bubble');
    assert.equal(bubbles.length, expectedMessages.length, pane + ' message count');
    for (let index = 0; index < expectedMessages.length; index++) {
      const message = expectedMessages[index];
      assert.ok(hasExactText(bubbles[index], message.text), pane + ' must recover exact text for ' + message.id);
      const outgoing = pane === 'am' ? message.sender === 'A' : message.sender === 'B';
      assert.equal(/\bout\b/.test(bubbles[index].className), outgoing, pane + ' direction for ' + message.id);
    }
  }
}

function assertWire(harness, expectedDirection, expectedSequence) {
  const raw = harness.get('wire').textContent;
  const wire = JSON.parse(raw);
  assert.equal(wire.format, 'cubechat-local-v1');
  assert.equal(wire.channel, expectedDirection);
  assert.equal(wire.sequence, expectedSequence);
  assert.equal(Buffer.from(wire.iv, 'base64').length, 12);
  assert.ok(Buffer.from(wire.ciphertext, 'base64').length > 16, 'Wire must contain authenticated ciphertext');
  for (const message of scenario.messages) assert.ok(!raw.includes(message.text), 'Wire leaks scenario plaintext: ' + message.id);
  assert.ok(!('secret' in wire) && !('key' in wire) && !('text' in wire), 'Wire must exclude keys and plaintext');
}

async function run() {
  validateFixture();
  const harness = createHarness();
  const { get, click, cryptography } = harness;
  assert.equal(get('scenarioNext').disabled, true);
  await click('scenarioLoad');
  assert.equal(harness.requested.length, 1);
  assert.equal(get('am').children.length, 0, 'Loading creates a fresh session before replay');
  assert.ok(get('aName').textContent && get('bName').textContent, 'Scenario names must be displayed');
  await click('scenarioNext');
  assertTranscript(harness, scenario.messages.slice(0, 1));
  assertWire(harness, scenario.messages[0].sender === 'A' ? 'AB' : 'BA', 0);
  const firstPlay = click('scenarioPlay');
  assert.equal(get('reset').disabled, true, 'Reset must be disabled while scenario playback is running');
  assert.equal(get('scenarioPause').disabled, false, 'Pause must be available during replay');
  await click('scenarioPause');
  assert.equal(get('scenarioPause').disabled, true, 'Pause request must disable another pause');
  await firstPlay;
  const pausedCount = get('am').querySelectorAll('.bubble').length;
  assert.ok(pausedCount > 1 && pausedCount < scenario.messages.length, 'Pause must stop before the whole transcript is sent');
  assertTranscript(harness, scenario.messages.slice(0, pausedCount));
  assert.match(get('scenarioStatus').textContent, /paused/i, 'Paused transcript must report its status');
  assert.equal(get('scenarioPlay').disabled, false, 'Paused scenario must be resumable');
  assert.equal(get('reset').disabled, false, 'Paused scenario must permit clearing the session');
  await click('scenarioPlay');
  assertTranscript(harness, scenario.messages);
  assert.match(get('scenarioStatus').textContent, /complete|finished/i, 'Replay must report completion');
  assert.equal(get('scenarioNext').disabled, true, 'Completed scenario cannot send another scripted message');
  assert.equal(get('reset').disabled, false, 'Reset must re-enable when replay completes');
  assert.equal(cryptography.encryptions.length, scenario.messages.length, 'Each scenario bubble must traverse real encryption');
  const sequences = { AB: 0, BA: 0 };
  const nonces = new Set();
  cryptography.encryptions.forEach((record, index) => {
    const channel = scenario.messages[index].sender === 'A' ? 'AB' : 'BA';
    assert.equal(record.aad.channel, channel);
    assert.equal(record.aad.sequence, sequences[channel]++, 'Per-direction sequence must be monotonic');
    assert.ok(!nonces.has(record.iv), 'Fresh messages must not reuse a nonce');
    nonces.add(record.iv);
  });
  const last = scenario.messages.at(-1);
  assertWire(harness, last.sender === 'A' ? 'AB' : 'BA', sequences[last.sender === 'A' ? 'AB' : 'BA'] - 1);
  const beforeTamper = cryptography.authenticatedRejections;
  await click('tamper');
  assert.equal(cryptography.authenticatedRejections, beforeTamper + 1, 'Tamper test must reach AES-GCM authentication rather than only the replay guard');
  assert.match(get('status').textContent, /PASS.*reject/i);
  const manual = { id: 'manual-continuation', sender: 'B', text: 'Thanks — the fictional fleet manifest is checked. 🌊' };
  get('bt').value = manual.text;
  await click('bs');
  assertTranscript(harness, [...scenario.messages, manual]);
  assertWire(harness, 'BA', sequences.BA);
  assert.equal(get('bt').value, '', 'Manual message field must clear after sending');
  const previousNonce = JSON.parse(get('wire').textContent).iv;
  await click('reset');
  assert.equal(get('am').children.length, 0);
  assert.equal(get('bm').children.length, 0);
  assert.equal(get('scenarioNext').disabled, true);
  assert.equal(get('as').disabled, true);
  assert.equal(get('bs').disabled, true);
  assert.match(get('wire').textContent, /No messages sent/i);
  await click('scenarioLoad');
  await click('scenarioNext');
  assertTranscript(harness, scenario.messages.slice(0, 1));
  assertWire(harness, scenario.messages[0].sender === 'A' ? 'AB' : 'BA', 0);
  assert.notEqual(JSON.parse(get('wire').textContent).iv, previousNonce, 'New replay must use a fresh session nonce');
  const automatic = createHarness('?scenario=sailing-family-trip');
  const deadline = Date.now() + 10000;
  while (!/complete/i.test(automatic.get('scenarioStatus').textContent) || automatic.get('reset').disabled) {
    assert.doesNotMatch(automatic.get('status').className, /\berror\b/, automatic.get('status').textContent);
    assert.ok(Date.now() < deadline, 'Scenario query route must complete within 10 seconds');
    await new Promise(resolve => setTimeout(resolve, 25));
  }
  assert.equal(automatic.requested.length, 1, 'Scenario query route must load the local fixture once');
  assertTranscript(automatic, scenario.messages);
  assert.equal(automatic.cryptography.encryptions.length, scenario.messages.length, 'Automatic route must encrypt every exchange');
  assert.equal(automatic.get('as').disabled, false, 'Automatic replay must permit manual A continuation');
  assert.equal(automatic.get('bs').disabled, false, 'Automatic replay must permit manual B continuation');
  assert.equal(automatic.get('scenarioPause').disabled, true, 'Pause must be disabled after automatic completion');
  assert.equal(automatic.get('scenarioNext').disabled, true, 'Automatic completion must exhaust scripted exchanges');
  console.log('PASS: ' + scenario.messages.length + ' fictional messages recovered in both panes through canonical cube + AES-GCM; sequence/nonce checks, authenticated tamper rejection, pause/resume, manual continuation, fresh replay reset, and automatic scenario route.');
  console.log('Scope: Node DOM harness; browser layout, relay delivery, and independent-device security are not tested.');
}

run().catch(error => {
  console.error('FAIL: ' + (error.stack || error));
  process.exitCode = 1;
});
