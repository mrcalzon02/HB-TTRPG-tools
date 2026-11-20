import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const cli = fileURLToPath(new URL('../scripts/inspect-model.mjs', import.meta.url));
const obj = [
  '# quad with native UVs and normals',
  'o Sample', 'mtllib example.mtl', 'usemtl metal',
  'v 0 0 0', 'v 1 0 0', 'v 1 2 0', 'v 0 2 0',
  'vt 0 0', 'vt 1 0', 'vt 1 1', 'vt 0 1',
  'vn 0 0 1',
  'f 1/1/1 2/2/1 3/3/1 4/4/1'
].join('\n') + '\n';
const gltf = {
  asset: { version: '2.0', generator: 'synthetic-test' },
  scene: 0, scenes: [{ nodes: [0] }], nodes: [{ mesh: 0 }],
  accessors: [{ count: 3, type: 'VEC3', componentType: 5126, min: [0, -1, 0], max: [1, 2, 3] }],
  meshes: [{ primitives: [{ attributes: { POSITION: 0 } }] }],
  buffers: []
};
function glb(document) {
  const json = Buffer.from(JSON.stringify(document), 'utf8');
  const padded = Buffer.alloc((json.length + 3) & ~3, 0x20);
  json.copy(padded);
  const output = Buffer.alloc(12 + 8 + padded.length);
  output.write('glTF', 0); output.writeUInt32LE(2, 4);
  output.writeUInt32LE(output.length, 8); output.writeUInt32LE(padded.length, 12);
  output.writeUInt32LE(0x4e4f534a, 16); padded.copy(output, 20);
  return output;
}
function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'hb-model-source-'));
  const put = (name, content) => {
    const full = path.join(root, name);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, content);
  };
  const run = (...args) => spawnSync(process.execPath, [cli, '--root', root, ...args], { encoding: 'utf8' });
  return { root, put, run, done: () => fs.rmSync(root, { recursive: true, force: true }) };
}

test('inspects OBJ, JSON glTF, GLB and Blender native headers without claiming render proof', () => {
  const f = fixture();
  try {
    f.put('quad.obj', obj);
    f.put('mesh.gltf', JSON.stringify(gltf));
    f.put('mesh.glb', glb(gltf));
    f.put('mesh.blend', Buffer.from('BLENDER-v502file-payload'));
    const r = f.run('quad.obj', 'mesh.gltf', 'mesh.glb', 'mesh.blend');
    assert.equal(r.status, 0, r.stderr);
    const o = JSON.parse(r.stdout);
    assert.equal(o.format, 'hb-3d-source-inspection/1');
    assert.equal(o.readOnly, true);
    assert.equal(o.nativeModelOpened, false);
    assert.equal(o.sourceExecutionPerformed, false);
    assert.equal(o.visualProofProvided, false);
    assert.equal(o.gameRuntimeAcceptanceVerified, false);
    assert.deepEqual(o.results.map(x => x.format), ['obj', 'gltf', 'glb', 'blend']);
    assert.equal(o.results[0].vertices, 4);
    assert.equal(o.results[0].faces, 1);
    assert.equal(o.results[0].trianglesAfterFan, 2);
    assert.equal(o.results[0].facesWithUV, 1);
    assert.equal(o.results[0].facesWithNormals, 1);
    assert.deepEqual(o.results[0].declaredVertexBounds, { min: [0, 0, 0], max: [1, 2, 0] });
    assert.equal(o.results[0].materialLibrariesDeclared, 1);
    assert.equal(o.results[1].meshes, 1);
    assert.equal(o.results[1].primitives, 1);
    assert.deepEqual(o.results[1].declaredPositionBounds, { min: [0, -1, 0], max: [1, 2, 3] });
    assert.equal(o.results[2].nativeModelOpened, false);
    assert.equal(o.results[2].hasBinaryChunk, false);
    assert.equal(o.results[3].headerOnly, true);
    assert.equal(o.results[3].pointerWidthBits, 64);
    assert.equal(o.results[3].blenderHeaderVersion, '5.2');
    for (const row of o.results) assert.match(row.sha256, /^[0-9a-f]{64}$/);
  } finally { f.done(); }
});

test('OBJ negative relative indices are accepted, invalid positive or zero indices rejected', () => {
  const f = fixture();
  try {
    f.put('negative.obj', 'v 0 0 0\nv 1 0 0\nv 0 1 0\nf -3 -2 -1\n');
    assert.equal(f.run('negative.obj').status, 0);
    f.put('invalid.obj', 'v 0 0 0\nv 1 0 0\nv 0 1 0\nf 1 2 4\n');
    assert.notEqual(f.run('invalid.obj').status, 0);
    f.put('zero.obj', 'v 0 0 0\nv 1 0 0\nv 0 1 0\nf 1 2 0\n');
    assert.notEqual(f.run('zero.obj').status, 0);
  } finally { f.done(); }
});

test('glTF external dependencies are only counted, never fetched or presented as resolved', () => {
  const f = fixture();
  try {
    const external = structuredClone(gltf);
    external.buffers = [{ byteLength: 4, uri: 'https://example.invalid/harmful.bin' }];
    external.images = [{ uri: '../../private-texture.png' }];
    f.put('references.gltf', JSON.stringify(external));
    const r = f.run('references.gltf');
    assert.equal(r.status, 0, r.stderr);
    const result = JSON.parse(r.stdout).results[0];
    assert.equal(result.externalResourcesDeclared, 2);
    assert.equal(result.sourceBuffersDecoded, false);
    assert.equal(result.texturesDecoded, false);
    assert.doesNotMatch(r.stdout, /example\.invalid|private-texture/);
  } finally { f.done(); }
});

test('invalid GLB versions, truncation and chunk ordering fail closed', () => {
  const f = fixture();
  try {
    const valid = glb(gltf);
    const wrongLength = Buffer.from(valid); wrongLength.writeUInt32LE(valid.length + 8, 8);
    f.put('length.glb', wrongLength);
    const wrongChunk = Buffer.from(valid); wrongChunk.writeUInt32LE(0x004e4942, 16);
    f.put('order.glb', wrongChunk);
    const wrongVersion = Buffer.from(valid); wrongVersion.writeUInt32LE(1, 4);
    f.put('version.glb', wrongVersion);
    for (const name of ['length.glb', 'order.glb', 'version.glb']) assert.notEqual(f.run(name).status, 0, name);
  } finally { f.done(); }
});

test('malformed glTF primitives and invalid indices fail closed', () => {
  const f = fixture();
  try {
    const wrong = structuredClone(gltf);
    wrong.meshes[0].primitives[0].attributes.POSITION = 9;
    f.put('bad.gltf', JSON.stringify(wrong));
    assert.notEqual(f.run('bad.gltf').status, 0);
    f.put('bad.obj', 'v NaN 0 0\nv 1 0 0\nv 0 1 0\nf 1 2 3\n');
    assert.notEqual(f.run('bad.obj').status, 0);
    f.put('unknown.fbx', Buffer.from('BLENDER-v502'));
    assert.notEqual(f.run('unknown.fbx').status, 0);
    f.put('broken.blend', Buffer.from('BLENDER!v502'));
    assert.notEqual(f.run('broken.blend').status, 0);
  } finally { f.done(); }
});

test('read-only root guard rejects absolute, escaping, nested symlink and directory access', () => {
  const f = fixture();
  try {
    f.put('mesh.obj', obj);
    f.put('inner/mesh.obj', obj);
    fs.symlinkSync('inner', path.join(f.root, 'shortcut'));
    fs.symlinkSync('mesh.obj', path.join(f.root, 'shortcut.obj'));
    for (const name of ['/etc/passwd', '../escape.obj', '.', 'shortcut/mesh.obj', 'shortcut.obj']) {
      assert.notEqual(f.run(name).status, 0, name);
    }
    assert.notEqual(f.run(...Array(17).fill('mesh.obj')).status, 0);
  } finally { f.done(); }
});

test('oversized and zero-byte sources rejected without reads', () => {
  const f = fixture();
  try {
    f.put('empty.obj', Buffer.alloc(0));
    f.put('huge.obj', Buffer.alloc(32 * 1024 * 1024 + 1));
    assert.notEqual(f.run('empty.obj').status, 0);
    assert.notEqual(f.run('huge.obj').status, 0);
  } finally { f.done(); }
});

test('GLB embedded binary must satisfy the declared buffer size; no binary is decoded', () => {
  const f = fixture();
  try {
    const embedded = structuredClone(gltf);
    embedded.buffers = [{ byteLength: 4 }];
    const raw = glb(embedded);
    const valid = Buffer.alloc(raw.length + 12);
    raw.copy(valid);
    valid.writeUInt32LE(valid.length, 8);
    valid.writeUInt32LE(4, raw.length);
    valid.writeUInt32LE(0x004e4942, raw.length + 4);
    valid.writeUInt32LE(0x01020304, raw.length + 8);
    f.put('with-bin.glb', valid);
    const pass = f.run('with-bin.glb');
    assert.equal(pass.status, 0, pass.stderr);
    const model = JSON.parse(pass.stdout).results[0];
    assert.equal(model.hasBinaryChunk, true);
    assert.equal(model.sourceBuffersDecoded, false);
    f.put('without-bin.glb', glb(embedded));
    assert.notEqual(f.run('without-bin.glb').status, 0);
  } finally { f.done(); }
});

test('malformed image references and non-string buffer URIs in glTF are rejected', () => {
  const f = fixture();
  try {
    const wrong = structuredClone(gltf);
    wrong.images = 'fake-array';
    f.put('image.gltf', JSON.stringify(wrong));
    assert.notEqual(f.run('image.gltf').status, 0);
    const malformed = structuredClone(gltf);
    malformed.buffers = [{ byteLength: 10, uri: { command: 'do-not-run' } }];
    f.put('buffer.gltf', JSON.stringify(malformed));
    assert.notEqual(f.run('buffer.gltf').status, 0);
  } finally { f.done(); }
});
