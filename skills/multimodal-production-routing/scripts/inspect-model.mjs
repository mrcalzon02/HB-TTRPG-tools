#!/usr/bin/env node
/** Bounded, read-only local source inspection. No model loading, rendering, network or execution. */
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { TextDecoder } from 'node:util';

const MAX_FILES = 16;
const MAX_BYTES = 32 * 1024 * 1024;
const MAX_RECORDS = 1_000_000;
const strictUtf8 = new TextDecoder('utf-8', { fatal: true });
const fail = message => { throw new Error(message); };
const checked = (condition, message) => { if (!condition) fail(message); };
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const finite = value => Number.isFinite(value) && Math.abs(value) <= 1e9;
const nonnegativeInt = value => Number.isSafeInteger(value) && value >= 0;

function readableText(bytes) {
  const value = strictUtf8.decode(bytes);
  checked(!value.includes('\0'), 'source contains NUL bytes');
  return value.replace(/^\uFEFF/, '');
}
function bounds() {
  return { min: [Infinity, Infinity, Infinity], max: [-Infinity, -Infinity, -Infinity] };
}
function addPoint(box, point) {
  for (let i = 0; i < 3; i++) {
    checked(finite(point[i]), 'non-finite or out-of-range vertex coordinate');
    box.min[i] = Math.min(box.min[i], point[i]);
    box.max[i] = Math.max(box.max[i], point[i]);
  }
}
function finishBounds(box) {
  return box.min[0] === Infinity ? null : box;
}
function parseObj(bytes) {
  const source = readableText(bytes);
  const box = bounds();
  let vertices = 0, textureCoordinates = 0, normals = 0, faces = 0;
  let trianglesAfterFan = 0, facesWithUV = 0, facesWithNormals = 0;
  let materialReferences = 0;
  const materials = new Set();
  const components = new Set();
  function faceIndex(index, count, label) {
    checked(/^-?[1-9]\d*$/.test(index), `invalid OBJ ${label} index`);
    const number = Number(index);
    checked(Number.isSafeInteger(number) && (number > 0 ? number <= count : -number <= count), `OBJ ${label} index outside declared data`);
  }
  for (const rawLine of source.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const [command, ...args] = line.split(/\s+/);
    if (command === 'v') {
      checked(args.length >= 3, 'OBJ vertex needs three coordinates');
      const point = args.slice(0, 3).map(Number);
      checked(args.slice(0, 3).every(s => s !== ''), 'OBJ vertex has empty coordinate');
      addPoint(box, point);
      checked(++vertices <= MAX_RECORDS, 'OBJ vertex limit exceeded');
    } else if (command === 'vt') {
      checked(args.length >= 1 && args.slice(0, Math.min(args.length, 3)).every(s => s !== '' && finite(Number(s))), 'invalid OBJ UV coordinates');
      checked(++textureCoordinates <= MAX_RECORDS, 'OBJ UV limit exceeded');
    } else if (command === 'vn') {
      checked(args.length >= 3 && args.slice(0, 3).every(s => s !== '' && finite(Number(s))), 'invalid OBJ vertex normal');
      checked(++normals <= MAX_RECORDS, 'OBJ normal limit exceeded');
    } else if (command === 'f') {
      checked(args.length >= 3 && args.length <= 256, 'OBJ face must contain 3-256 corners');
      let hasUV = true, hasNormals = true;
      for (const corner of args) {
        const parts = corner.split('/');
        checked(parts.length <= 3 && parts.length >= 1, 'invalid OBJ face corner');
        faceIndex(parts[0], vertices, 'vertex');
        const uv = parts.length > 1 && parts[1] !== '';
        const normal = parts.length > 2 && parts[2] !== '';
        checked(parts.length === 1 || uv || normal, 'empty OBJ face attribute');
        if (uv) faceIndex(parts[1], textureCoordinates, 'texture');
        if (normal) faceIndex(parts[2], normals, 'normal');
        hasUV &&= uv;
        hasNormals &&= normal;
      }
      checked(++faces <= MAX_RECORDS, 'OBJ face limit exceeded');
      trianglesAfterFan += args.length - 2;
      if (hasUV) facesWithUV++;
      if (hasNormals) facesWithNormals++;
    } else if (command === 'mtllib') {
      if (args.length) materialReferences += args.length;
    } else if (command === 'usemtl' && args.length) {
      if (materials.size < 1024) materials.add(args.join(' '));
    } else if ((command === 'o' || command === 'g') && args.length) {
      if (components.size < 1024) components.add(`${command}:${args.join(' ')}`);
    }
  }
  return {
    format: 'obj', sourceType: 'text-mesh', vertices, textureCoordinates,
    normals, faces, trianglesAfterFan, facesWithUV, facesWithNormals,
    namedComponents: components.size, materialsUsed: materials.size,
    materialLibrariesDeclared: materialReferences, declaredVertexBounds: finishBounds(box),
    externalDependenciesResolved: false, topologyFullyVerified: false
  };
}
function indexIn(value, length) { return nonnegativeInt(value) && value < length; }
function parseGltf(source, binaryChunkBytes = null, fromGlb = false) {
  let doc;
  try { doc = JSON.parse(source.trim().replace(/\0+$/, '')); }
  catch { fail('invalid glTF JSON'); }
  checked(object(doc) && object(doc.asset) && doc.asset.version === '2.0', 'expected glTF asset version 2.0');
  for (const key of ['meshes', 'accessors', 'materials', 'textures', 'buffers', 'nodes', 'scenes', 'images']) {
    checked(doc[key] === undefined || Array.isArray(doc[key]), `glTF ${key} must be an array`);
    checked(!Array.isArray(doc[key]) || doc[key].length <= MAX_RECORDS, `glTF ${key} exceeds record limit`);
  }
  const meshes = doc.meshes ?? [], accessors = doc.accessors ?? [];
  const materials = doc.materials ?? [], nodes = doc.nodes ?? [], scenes = doc.scenes ?? [];
  const buffers = doc.buffers ?? [];
  if (doc.scene !== undefined) checked(indexIn(doc.scene, scenes.length), 'invalid glTF default scene');
  let externalResources = 0, embeddedDataUris = 0, unresolvedBinaryReferences = 0;
  for (const buffer of buffers) {
    checked(object(buffer) && nonnegativeInt(buffer.byteLength), 'invalid glTF buffer');
    checked(buffer.uri === undefined || typeof buffer.uri === 'string', 'invalid glTF buffer URI');
    if (typeof buffer.uri === 'string') {
      if (buffer.uri.startsWith('data:')) embeddedDataUris++;
      else externalResources++;
    } else if (binaryChunkBytes !== null) {
      checked(buffer.byteLength <= binaryChunkBytes, 'GLB binary chunk shorter than declared buffer');
    } else if (fromGlb) fail('GLB declares a binary buffer without a binary chunk');
    else unresolvedBinaryReferences++;
  }
  for (const item of doc.images ?? []) {
    checked(object(item), 'invalid glTF image reference');
    checked(item.uri === undefined || typeof item.uri === 'string', 'invalid glTF image URI');
    if (typeof item.uri === 'string') {
      if (item.uri.startsWith('data:')) embeddedDataUris++;
      else externalResources++;
    }
  }
  const box = bounds();
  let declaredBounds = 0, primitiveCount = 0, indexedPrimitives = 0;
  for (const mesh of meshes) {
    checked(object(mesh) && Array.isArray(mesh.primitives) && mesh.primitives.length > 0, 'invalid glTF mesh primitives');
    for (const primitive of mesh.primitives) {
      checked(object(primitive) && object(primitive.attributes), 'invalid glTF mesh primitive');
      checked(indexIn(primitive.attributes.POSITION, accessors.length), 'glTF primitive missing POSITION accessor');
      if (primitive.indices !== undefined) {
        checked(indexIn(primitive.indices, accessors.length), 'invalid glTF primitive index accessor');
        indexedPrimitives++;
      }
      if (primitive.material !== undefined) checked(indexIn(primitive.material, materials.length), 'invalid glTF primitive material');
      const accessor = accessors[primitive.attributes.POSITION];
      checked(object(accessor) && accessor.type === 'VEC3' && nonnegativeInt(accessor.count) && accessor.count > 0, 'invalid glTF position accessor');
      if (Array.isArray(accessor.min) && Array.isArray(accessor.max) && accessor.min.length === 3 && accessor.max.length === 3) {
        for (let i = 0; i < 3; i++) checked(finite(accessor.min[i]) && finite(accessor.max[i]) && accessor.min[i] <= accessor.max[i], 'invalid glTF position bounds');
        addPoint(box, accessor.min); addPoint(box, accessor.max);
        declaredBounds++;
      }
      checked(++primitiveCount <= MAX_RECORDS, 'glTF primitive limit exceeded');
    }
  }
  for (const scene of scenes) {
    checked(object(scene) && (scene.nodes === undefined || Array.isArray(scene.nodes)), 'invalid glTF scene');
    for (const nodeId of scene.nodes ?? []) checked(indexIn(nodeId, nodes.length), 'glTF scene references nonexistent node');
  }
  for (const node of nodes) {
    checked(object(node), 'invalid glTF node');
    if (node.mesh !== undefined) checked(indexIn(node.mesh, meshes.length), 'glTF node references nonexistent mesh');
  }
  return {
    format: fromGlb ? 'glb' : 'gltf', sourceType: 'gltf-2',
    scenes: scenes.length, nodes: nodes.length, meshes: meshes.length,
    primitives: primitiveCount, indexedPrimitives, accessors: accessors.length,
    materials: materials.length, textures: (doc.textures ?? []).length,
    externalResourcesDeclared: externalResources, embeddedDataUris,
    unresolvedBinaryReferences, hasBinaryChunk: binaryChunkBytes !== null,
    declaredPositionBounds: finishBounds(box), primitivesWithDeclaredBounds: declaredBounds,
    sourceBuffersDecoded: false, texturesDecoded: false, nativeModelOpened: false
  };
}
function parseGlb(bytes) {
  checked(bytes.length >= 20 && bytes.toString('ascii', 0, 4) === 'glTF', 'invalid GLB magic');
  checked(bytes.readUInt32LE(4) === 2 && bytes.readUInt32LE(8) === bytes.length, 'invalid GLB version or length');
  let offset = 12, json = null, binaryBytes = null, chunks = 0;
  while (offset < bytes.length) {
    checked(offset + 8 <= bytes.length, 'truncated GLB chunk header');
    const length = bytes.readUInt32LE(offset), kind = bytes.readUInt32LE(offset + 4);
    checked(length % 4 === 0 && offset + 8 + length <= bytes.length, 'truncated or misaligned GLB chunk');
    const start = offset + 8;
    if (chunks === 0 && kind === 0x4e4f534a) json = readableText(bytes.subarray(start, start + length));
    else if (chunks === 1 && kind === 0x004e4942) binaryBytes = length;
    else fail('unexpected GLB chunk ordering or type');
    offset = start + length;
    chunks++;
    checked(chunks <= 2, 'too many GLB chunks');
  }
  checked(json !== null && offset === bytes.length, 'GLB JSON chunk missing');
  return parseGltf(json, binaryBytes, true);
}
function parseBlend(bytes) {
  checked(bytes.length >= 12 && bytes.toString('ascii', 0, 7) === 'BLENDER', 'invalid Blender source header');
  const pointerFlag = String.fromCharCode(bytes[7]);
  const endianFlag = String.fromCharCode(bytes[8]);
  const version = bytes.toString('ascii', 9, 12);
  checked(['_', '-'].includes(pointerFlag) && ['v', 'V'].includes(endianFlag) && /^\d{3}$/.test(version), 'invalid Blender pointer, endian or version metadata');
  return {
    format: 'blend', sourceType: 'blender-native', blenderHeaderVersion: `${version[0]}.${Number(version.slice(1))}`,
    pointerWidthBits: pointerFlag === '-' ? 64 : 32,
    endian: endianFlag === 'v' ? 'little' : 'big',
    headerOnly: true, nativeModelOpened: false, topologyFullyVerified: false
  };
}
function inspectSource(name, bytes) {
  switch (path.extname(name).toLowerCase()) {
    case '.obj': return parseObj(bytes);
    case '.gltf': return parseGltf(readableText(bytes));
    case '.glb': return parseGlb(bytes);
    case '.blend': return parseBlend(bytes);
    default: fail('unsupported 3D source extension (supported: .obj, .gltf, .glb, .blend)');
  }
}
function safeSourcePath(realRoot, name) {
  checked(typeof name === 'string' && name.length > 0 && !path.isAbsolute(name) && !name.includes('\0'), 'source path must be relative to selected root');
  const absolute = path.resolve(realRoot, name);
  const relative = path.relative(realRoot, absolute);
  checked(relative.length > 0 && !relative.startsWith('..' + path.sep) && relative !== '..' && !path.isAbsolute(relative), 'source path escapes the selected root');
  let walk = realRoot;
  for (const part of relative.split(path.sep)) {
    walk = path.join(walk, part);
    checked(!fs.lstatSync(walk).isSymbolicLink(), 'symlink source path rejected');
  }
  const real = fs.realpathSync(absolute);
  checked(path.relative(realRoot, real) === relative && fs.statSync(real).isFile(), 'source is not a regular file beneath selected root');
  return { real, name: relative.split(path.sep).join('/') };
}
function main(args) {
  const terms = [...args];
  let root = process.cwd();
  if (terms[0] === '--root') {
    checked(terms[1], 'missing --root directory');
    root = terms[1]; terms.splice(0, 2);
  }
  checked(terms.length > 0 && terms.length <= MAX_FILES && terms.every(s => !s.startsWith('--')), 'usage: inspect-model.mjs [--root DIRECTORY] file.obj [file.glb ...] (1-16 files)');
  const realRoot = fs.realpathSync(root);
  checked(fs.statSync(realRoot).isDirectory(), 'selected root must be a directory');
  const results = [];
  for (const term of terms) {
    const { real, name } = safeSourcePath(realRoot, term);
    const size = fs.statSync(real).size;
    checked(size > 0 && size <= MAX_BYTES, '3D source outside bounded 1-byte to 32-MiB range');
    const bytes = fs.readFileSync(real);
    checked(bytes.length === size, 'source changed while being read');
    results.push({ file: name, bytes: size, sha256: createHash('sha256').update(bytes).digest('hex'), ...inspectSource(name, bytes) });
  }
  return {
    format: 'hb-3d-source-inspection/1', readOnly: true,
    nativeModelOpened: false, sourceExecutionPerformed: false,
    visualProofProvided: false, gameRuntimeAcceptanceVerified: false,
    results
  };
}
try { process.stdout.write(JSON.stringify(main(process.argv.slice(2)), null, 2) + '\n'); }
catch (error) { process.stderr.write(`[model-inspect] ${error.message}\n`); process.exitCode = 1; }
