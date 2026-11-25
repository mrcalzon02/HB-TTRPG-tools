'use strict';

const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const html = fs.readFileSync(path.join(__dirname, '..', 'cubechat-key-handoff.html'), 'utf8');
const source = html.match(/<script>([\s\S]*?)<\/script>/)[1];
const profile = '0123456789abcdef01234567';
const ab = Buffer.alloc(32, 0x12), ba = Buffer.alloc(32, 0x34);
const fixture = Buffer.concat([Buffer.of(1), Buffer.from(profile, 'hex'), ab, ba, Buffer.of(0)]);
fixture[77] = fixture.subarray(0, 77).reduce((sum, byte) => (sum + byte) & 255, 0);
const transfer = 'CCK1.' + fixture.toString('base64url');
const hash = value => createHash('sha256').update(value).digest('hex');

function page() {
  const elements = new Map(), downloads = new Map(), blobs = new Map();
  function get(id) {
    if (!elements.has(id)) elements.set(id, { value: '', files: [] });
    return elements.get(id);
  }
  vm.runInNewContext(source, {
    document: {
      getElementById: get,
      createElement: () => ({ click() { downloads.set(this.download, blobs.get(this.href)); } })
    },
    URL: {
      createObjectURL(blob) { const id = 'blob:' + blobs.size; blobs.set(id, blob); return id; },
      revokeObjectURL() {}
    },
    ArrayBuffer, DataView, Blob, TextEncoder, TextDecoder, btoa, atob, setTimeout() {},
    location: { hostname: '127.0.0.1', port: '8787', protocol: 'http:' }
  }, { filename: 'cubechat-key-handoff.html' });
  return { get, downloads };
}

async function main() {
  const sender = page(), recipient = page();
  sender.get('data').value = transfer;
  sender.get('tone').onclick();
  sender.get('save').onclick();
  const wav = sender.downloads.get('cubechat-SECRET-modem.wav');
  assert.equal(wav.type, 'audio/wav');
  const audio = await wav.arrayBuffer();
  assert.equal(Buffer.from(audio).subarray(0, 4).toString('ascii'), 'RIFF');
  for (const name of ['cubechat-SECRET-modem.wav', 'cubechat-SECRET-transfer.txt']) {
    const blob = sender.downloads.get(name);
    recipient.get('file').files = [{ name, size: blob.size, arrayBuffer: () => blob.arrayBuffer(), text: () => blob.text() }];
    await recipient.get('file').onchange();
    assert.match(recipient.get('report').textContent, /Imported transfer successfully/);
    assert.equal(recipient.get('data').value, transfer);
    assert.equal(hash(recipient.get('data').value), hash(transfer));
    assert.equal(recipient.get('profile').value, profile);
  }
  for (const [action, role, name] of [['export', 'B', 'GUEST'], ['hostExport', 'A', 'HOST']]) {
    recipient.get(action).onclick();
    const provision = JSON.parse(await recipient.downloads.get('cubechat-rekey-' + name + '-SECRET.json').text());
    assert.equal(provision.role, role);
    assert.equal(provision.profileId, profile);
    assert.deepEqual(provision.bundle, { format: 'cubechat-secret-bundle-v1', AB: ab.toString('hex'), BA: ba.toString('hex') });
  }
  const truncated = audio.slice(0, 60000);
  let finishOldRead;
  const oldRead = new Promise(resolve => { finishOldRead = resolve; });
  recipient.get('file').files = [{ name: 'delayed.wav', size: audio.byteLength, arrayBuffer: () => oldRead }];
  const stale = recipient.get('file').onchange();
  recipient.get('file').files = [{ name: 'truncated.wav', size: truncated.byteLength, arrayBuffer: async () => truncated }];
  await recipient.get('file').onchange();
  finishOldRead(audio);
  await stale;
  assert.match(recipient.get('report').textContent, /Import failed/);
  assert.equal(recipient.get('export').disabled, true);
  assert.equal(recipient.get('hostExport').disabled, true);
  assert.equal(recipient.get('data').value, '');
  console.log('PASS: generated WAV and text recovered the exact known transfer and SHA-256, exported both roles, and rejected truncation');
}

main().catch(error => { console.error(error); process.exitCode = 1; });
