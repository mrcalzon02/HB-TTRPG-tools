(function installBinaryCubePreEntryMask(root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.BinaryCubePreEntryMask = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function createBinaryCubePreEntryMask() {
  'use strict';

  const FORMAT = 'hb-ttrpg-binary-cube-pre-entry-mask';
  const SCHEMA_VERSION = '1.0.0';
  const METHODS = Object.freeze([
    Object.freeze({id:'none', title:'None', description:'No pre-entry mask. Control condition for comparison.'}),
    Object.freeze({id:'white-noise', title:'White Noise', description:'Independent deterministic pseudorandom mask bits across the complete input field.'}),
    Object.freeze({id:'newspaper-cutout', title:'Newspaper Cut-Out', description:'Blocky irregular rectangular and torn-edge regions inspired by physical cut-and-paste masking.'}),
    Object.freeze({id:'plasma-noise', title:'Plasma Noise', description:'Multi-octave interpolated value-noise field thresholded into a binary mask.'}),
    Object.freeze({id:'cellular-diffusion', title:'Cellular Diffusion', description:'Seeded binary field repeatedly evolved by local-neighbor cellular rules to form spreading clustered regions.'}),
    Object.freeze({id:'crosshatch-jitter', title:'Crosshatch Jitter', description:'Deterministic row/column banding with seeded local jitter; useful as a structured-mask control.'}),
    Object.freeze({id:'burst-cluster', title:'Burst Cluster', description:'Seeded radial clusters scattered across the field; useful for testing localized masking and edge behavior.'})
  ]);
  const METHOD_IDS = Object.freeze(METHODS.map(method => method.id));

  function fail(message) { throw new Error(message); }
  function normalizeBits(value, label = 'Binary input') {
    const bits = String(value ?? '').replace(/\s+/g, '');
    if (!bits) fail(`${label} must contain at least one bit.`);
    if (/[^01]/.test(bits)) fail(`${label} may contain only 0, 1, and whitespace.`);
    return bits;
  }
  function fnv1a32(value) {
    let hash = 0x811c9dc5;
    const text = String(value ?? '');
    for (let index = 0; index < text.length; index += 1) {
      hash ^= text.charCodeAt(index);
      hash = Math.imul(hash, 0x01000193);
    }
    return hash >>> 0;
  }
  function hex32(value) { return fnv1a32(value).toString(16).padStart(8, '0'); }
  function mulberry32(seed) {
    let state = seed >>> 0;
    return () => {
      state += 0x6d2b79f5;
      let result = state;
      result = Math.imul(result ^ (result >>> 15), result | 1);
      result ^= result + Math.imul(result ^ (result >>> 7), result | 61);
      return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
    };
  }
  function clamp(value, min, max, fallback) {
    const number = Number(value);
    return Number.isFinite(number) ? Math.max(min, Math.min(max, number)) : fallback;
  }
  function integer(value, min, max, fallback) {
    const number = Number(value);
    return Number.isInteger(number) ? Math.max(min, Math.min(max, number)) : fallback;
  }
  function smoothstep(value) { return value * value * (3 - 2 * value); }
  function lerp(left, right, amount) { return left + (right - left) * amount; }
  function xorBits(bits, maskBits) {
    if (bits.length !== maskBits.length) fail('Input and pre-entry mask lengths must match.');
    let output = '';
    for (let index = 0; index < bits.length; index += 1) output += bits[index] === maskBits[index] ? '0' : '1';
    return output;
  }
  function resolveDimensions(length, requestedWidth) {
    const width = integer(requestedWidth, 1, Math.max(1, length), Math.max(1, Math.ceil(Math.sqrt(length))));
    return {width, height: Math.ceil(length / width)};
  }
  function maskStats(maskBits) {
    const bits = normalizeBits(maskBits, 'Mask bits');
    let ones = 0;
    let transitions = 0;
    let longestRun = 1;
    let currentRun = 1;
    for (let index = 0; index < bits.length; index += 1) {
      if (bits[index] === '1') ones += 1;
      if (index > 0) {
        if (bits[index] !== bits[index - 1]) { transitions += 1; currentRun = 1; }
        else { currentRun += 1; longestRun = Math.max(longestRun, currentRun); }
      }
    }
    const oneRatio = ones / bits.length;
    const entropy = [oneRatio, 1 - oneRatio].filter(p => p > 0).reduce((sum, p) => sum - p * Math.log2(p), 0);
    return Object.freeze({bitLength:bits.length,ones,zeros:bits.length-ones,oneRatio,transitions,transitionRate:bits.length>1?transitions/(bits.length-1):0,longestRun,binaryEntropy:entropy});
  }
  function normalizeOptions(length, raw = {}) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) fail('Pre-entry mask options must be an object.');
    const method = String(raw.method || 'none');
    if (!METHOD_IDS.includes(method)) fail(`Unsupported pre-entry mask method: ${method}.`);
    const dimensions = resolveDimensions(length, raw.fieldWidth);
    return Object.freeze({
      method,
      seed: String(raw.seed || 'binary-cube-pre-entry-mask'),
      fieldWidth: dimensions.width,
      fieldHeight: dimensions.height,
      intensity: clamp(raw.intensity, 0.01, 0.99, 0.5),
      scale: clamp(raw.scale, 1, 256, 12),
      octaves: integer(raw.octaves, 1, 8, 4),
      cellularSteps: integer(raw.cellularSteps, 0, 32, 4),
      patchCount: integer(raw.patchCount, 1, 4096, Math.max(4, Math.ceil(length / Math.max(16, dimensions.width * 2)))),
      clusterCount: integer(raw.clusterCount, 1, 4096, Math.max(3, Math.ceil(length / Math.max(32, dimensions.width * 4))))
    });
  }
  function randomFor(options, salt = '') { return mulberry32(fnv1a32(`${options.seed}|${options.method}|${salt}`)); }
  function flatIndex(x, y, width) { return y * width + x; }
  function inLength(index, length) { return index >= 0 && index < length; }

  function whiteNoise(length, options) {
    const random = randomFor(options, 'white');
    let bits = '';
    for (let index = 0; index < length; index += 1) bits += random() < options.intensity ? '1' : '0';
    return bits;
  }
  function newspaperCutout(length, options) {
    const {fieldWidth:width, fieldHeight:height} = options;
    const field = new Uint8Array(width * height);
    const random = randomFor(options, 'newspaper');
    for (let patch = 0; patch < options.patchCount; patch += 1) {
      const patchWidth = Math.max(1, Math.floor((0.08 + random() * 0.35) * width));
      const patchHeight = Math.max(1, Math.floor((0.08 + random() * 0.28) * height));
      const startX = Math.floor(random() * width);
      const startY = Math.floor(random() * height);
      const bit = random() < options.intensity ? 1 : 0;
      for (let y = startY; y < Math.min(height, startY + patchHeight); y += 1) {
        const tornLeft = Math.floor(random() * Math.max(1, Math.ceil(patchWidth * 0.2)));
        const tornRight = Math.floor(random() * Math.max(1, Math.ceil(patchWidth * 0.2)));
        for (let x = startX + tornLeft; x < Math.min(width, startX + patchWidth - tornRight); x += 1) field[flatIndex(x,y,width)] = bit;
      }
    }
    for (let index = 0; index < length; index += 1) if (random() < 0.04) field[index] ^= 1;
    return Array.from(field.slice(0, length), value => value ? '1' : '0').join('');
  }
  function latticeValue(x, y, octave, options) {
    const hash = fnv1a32(`${options.seed}|plasma|${octave}|${x}|${y}`);
    return hash / 0xffffffff;
  }
  function valueNoise(x, y, scale, octave, options) {
    const gx = x / scale;
    const gy = y / scale;
    const x0 = Math.floor(gx); const y0 = Math.floor(gy);
    const tx = smoothstep(gx - x0); const ty = smoothstep(gy - y0);
    const a = latticeValue(x0, y0, octave, options);
    const b = latticeValue(x0 + 1, y0, octave, options);
    const c = latticeValue(x0, y0 + 1, octave, options);
    const d = latticeValue(x0 + 1, y0 + 1, octave, options);
    return lerp(lerp(a,b,tx), lerp(c,d,tx), ty);
  }
  function plasmaNoise(length, options) {
    const {fieldWidth:width} = options;
    let bits = '';
    for (let index = 0; index < length; index += 1) {
      const x = index % width; const y = Math.floor(index / width);
      let total = 0; let weight = 1; let weights = 0;
      for (let octave = 0; octave < options.octaves; octave += 1) {
        const scale = Math.max(1, options.scale / Math.pow(2, octave));
        total += valueNoise(x, y, scale, octave, options) * weight;
        weights += weight;
        weight *= 0.5;
      }
      bits += (total / weights) < options.intensity ? '1' : '0';
    }
    return bits;
  }
  function cellularDiffusion(length, options) {
    const {fieldWidth:width, fieldHeight:height} = options;
    const random = randomFor(options, 'cellular');
    let field = new Uint8Array(width * height);
    for (let index = 0; index < field.length; index += 1) field[index] = random() < options.intensity ? 1 : 0;
    const neighborCount = (source, x, y) => {
      let count = 0;
      for (let dy = -1; dy <= 1; dy += 1) for (let dx = -1; dx <= 1; dx += 1) {
        if (!dx && !dy) continue;
        const nx = (x + dx + width) % width;
        const ny = (y + dy + height) % height;
        count += source[flatIndex(nx,ny,width)];
      }
      return count;
    };
    for (let step = 0; step < options.cellularSteps; step += 1) {
      const next = new Uint8Array(field.length);
      for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1) {
        const index = flatIndex(x,y,width);
        const neighbors = neighborCount(field,x,y);
        next[index] = neighbors >= 5 ? 1 : neighbors <= 2 ? 0 : field[index];
        if (random() < 0.01) next[index] ^= 1;
      }
      field = next;
    }
    return Array.from(field.slice(0,length), value => value ? '1' : '0').join('');
  }
  function crosshatchJitter(length, options) {
    const {fieldWidth:width} = options;
    const random = randomFor(options, 'crosshatch');
    let bits = '';
    const rowPeriod = Math.max(2, Math.round(2 + options.scale / 4));
    const colPeriod = Math.max(2, Math.round(3 + options.scale / 5));
    for (let index = 0; index < length; index += 1) {
      const x = index % width; const y = Math.floor(index / width);
      let bit = ((x % colPeriod === 0) ^ (y % rowPeriod === 0)) ? 1 : 0;
      if (random() < options.intensity * 0.18) bit ^= 1;
      bits += bit ? '1' : '0';
    }
    return bits;
  }
  function burstCluster(length, options) {
    const {fieldWidth:width, fieldHeight:height} = options;
    const field = new Float64Array(width * height);
    const random = randomFor(options, 'burst');
    for (let cluster = 0; cluster < options.clusterCount; cluster += 1) {
      const cx = random() * width; const cy = random() * height;
      const radius = Math.max(1, (0.05 + random() * 0.2) * Math.max(width,height));
      const strength = 0.5 + random() * 0.8;
      for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1) {
        const dx = x - cx; const dy = y - cy;
        const distance = Math.sqrt(dx*dx + dy*dy);
        if (distance <= radius) field[flatIndex(x,y,width)] += (1 - distance / radius) * strength;
      }
    }
    let bits = '';
    for (let index = 0; index < length; index += 1) bits += field[index] >= (1 - options.intensity) ? '1' : '0';
    return bits;
  }
  function generateMaskBits(length, rawOptions = {}) {
    const size = Number(length);
    if (!Number.isInteger(size) || size < 1 || size > 10000000) fail('Pre-entry mask length must be an integer from 1 through 10000000 bits.');
    const options = normalizeOptions(size, rawOptions);
    switch (options.method) {
      case 'none': return '0'.repeat(size);
      case 'white-noise': return whiteNoise(size, options);
      case 'newspaper-cutout': return newspaperCutout(size, options);
      case 'plasma-noise': return plasmaNoise(size, options);
      case 'cellular-diffusion': return cellularDiffusion(size, options);
      case 'crosshatch-jitter': return crosshatchJitter(size, options);
      case 'burst-cluster': return burstCluster(size, options);
      default: fail(`Unsupported pre-entry mask method: ${options.method}.`);
    }
  }
  function descriptorFor(length, rawOptions = {}, maskBits = null) {
    const options = normalizeOptions(length, rawOptions);
    const generated = maskBits || generateMaskBits(length, options);
    return Object.freeze({
      format: FORMAT,
      schemaVersion: SCHEMA_VERSION,
      method: options.method,
      seed: options.seed,
      bitLength: length,
      fieldWidth: options.fieldWidth,
      fieldHeight: options.fieldHeight,
      parameters: Object.freeze({intensity:options.intensity,scale:options.scale,octaves:options.octaves,cellularSteps:options.cellularSteps,patchCount:options.patchCount,clusterCount:options.clusterCount}),
      maskChecksum: hex32(generated)
    });
  }
  function validateDescriptor(rawDescriptor) {
    const descriptor = typeof rawDescriptor === 'string' ? JSON.parse(rawDescriptor) : rawDescriptor;
    if (!descriptor || typeof descriptor !== 'object' || Array.isArray(descriptor)) fail('A pre-entry mask descriptor is required.');
    if (descriptor.format !== FORMAT) fail('Pre-entry mask descriptor format is not recognized.');
    if (descriptor.schemaVersion !== SCHEMA_VERSION) fail(`Unsupported pre-entry mask schema version: ${descriptor.schemaVersion || 'missing'}.`);
    if (!METHOD_IDS.includes(descriptor.method)) fail(`Unsupported pre-entry mask method: ${descriptor.method}.`);
    const bitLength = integer(descriptor.bitLength, 1, 10000000, null);
    if (!bitLength) fail('Pre-entry mask descriptor bitLength is invalid.');
    const options = {
      method:descriptor.method,
      seed:String(descriptor.seed || ''),
      fieldWidth:descriptor.fieldWidth,
      ...(descriptor.parameters || {})
    };
    const normalized = normalizeOptions(bitLength, options);
    const maskBits = generateMaskBits(bitLength, normalized);
    if (descriptor.maskChecksum !== hex32(maskBits)) fail('Pre-entry mask descriptor checksum does not match regenerated mask bits.');
    return Object.freeze({...descriptor, seed:String(descriptor.seed || ''), bitLength, fieldWidth:normalized.fieldWidth, fieldHeight:normalized.fieldHeight, parameters:Object.freeze({...descriptor.parameters})});
  }
  function applyMask(bitsValue, rawOptions = {}) {
    const bits = normalizeBits(bitsValue);
    const maskBits = generateMaskBits(bits.length, rawOptions);
    const descriptor = descriptorFor(bits.length, rawOptions, maskBits);
    return Object.freeze({
      format:'hb-ttrpg-binary-cube-pre-entry-mask-result',
      schemaVersion:SCHEMA_VERSION,
      originalBits:bits,
      maskedBits:xorBits(bits,maskBits),
      maskBits,
      descriptor,
      statistics:maskStats(maskBits)
    });
  }
  function removeMask(maskedBitsValue, rawDescriptor) {
    const maskedBits = normalizeBits(maskedBitsValue, 'Masked binary input');
    const descriptor = validateDescriptor(rawDescriptor);
    if (maskedBits.length !== descriptor.bitLength) fail(`Masked input length ${maskedBits.length} does not match descriptor bitLength ${descriptor.bitLength}.`);
    const maskBits = generateMaskBits(descriptor.bitLength, {method:descriptor.method,seed:descriptor.seed,fieldWidth:descriptor.fieldWidth,...descriptor.parameters});
    return Object.freeze({
      format:'hb-ttrpg-binary-cube-pre-entry-unmask-result',
      schemaVersion:SCHEMA_VERSION,
      bits:xorBits(maskedBits,maskBits),
      maskBits,
      descriptor
    });
  }
  function listMethods() { return METHODS.map(method => ({...method})); }
  function runSelfTest() {
    const source = '0100100001101001001010011110001010100110';
    const results = [];
    for (const method of METHOD_IDS) {
      const options = {method,seed:`mask-self-test-${method}`,fieldWidth:8,intensity:0.5,scale:6,octaves:3,cellularSteps:3,patchCount:6,clusterCount:4};
      const first = applyMask(source, options);
      const second = applyMask(source, options);
      const recovered = removeMask(first.maskedBits, first.descriptor);
      results.push({
        method,
        deterministic:first.maskBits === second.maskBits && first.descriptor.maskChecksum === second.descriptor.maskChecksum,
        reversible:recovered.bits === source,
        lengthPreserved:first.maskedBits.length === source.length
      });
    }
    const ok = results.every(result => result.deterministic && result.reversible && result.lengthPreserved);
    return Object.freeze({ok,schemaVersion:SCHEMA_VERSION,testCount:results.length,passedCount:results.filter(result=>result.deterministic&&result.reversible&&result.lengthPreserved).length,results});
  }

  return Object.freeze({
    FORMAT,SCHEMA_VERSION,METHODS,
    listMethods,normalizeBits,generateMaskBits,descriptorFor,validateDescriptor,applyMask,removeMask,maskStats,runSelfTest
  });
});
