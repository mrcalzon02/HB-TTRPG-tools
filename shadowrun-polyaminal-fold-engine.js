(function installPolyaminalFoldEngine(root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.ShadowrunPolyaminalFoldEngine = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function createPolyaminalFoldEngine() {
  'use strict';

  const FORMAT = 'hb-ttrpg-shadowrun-polyaminal-fold';
  const SCHEMA_VERSION = '0.1.0';
  const MAGIC = 0x50464c31;
  const CODECS = Object.freeze({ raw: 0, constant: 1, rle: 2, sparse: 3 });
  const CODEC_NAMES = Object.freeze(['raw', 'constant', 'rle', 'sparse']);
  const SUPPORTED_BLOCK_SIZES = Object.freeze([64, 128, 256, 512, 1024, 2048, 4096]);

  function fail(message) { throw new Error(message); }
  function normalizeBits(value) {
    const bits = String(value ?? '').replace(/\s+/g, '');
    if (!bits) fail('Binary input must contain at least one bit.');
    if (/[^01]/.test(bits)) fail('Binary input may contain only 0, 1, and whitespace.');
    return bits;
  }
  function isPowerOfTwo(value) { return Number.isInteger(value) && value > 1 && (value & (value - 1)) === 0; }
  function log2(value) { return Math.log2(value); }
  function gammaLength(value) {
    if (!Number.isInteger(value) || value < 1) fail('Gamma values must be positive integers.');
    const width = Math.floor(Math.log2(value)) + 1;
    return width * 2 - 1;
  }

  class BitWriter {
    constructor() { this.bits = []; }
    writeBit(value) { this.bits.push(value ? 1 : 0); }
    writeBits(value, width) {
      const numeric = typeof value === 'bigint' ? value : BigInt(value);
      for (let shift = width - 1; shift >= 0; shift -= 1) this.writeBit(Number((numeric >> BigInt(shift)) & 1n));
    }
    writeGamma(value) {
      const numeric = Number(value);
      const width = Math.floor(Math.log2(numeric)) + 1;
      for (let index = 1; index < width; index += 1) this.writeBit(0);
      this.writeBits(numeric, width);
    }
    writeBitString(value) { for (const bit of value) this.writeBit(bit === '1'); }
    toUint8Array() {
      const output = new Uint8Array(Math.ceil(this.bits.length / 8));
      for (let index = 0; index < this.bits.length; index += 1) {
        if (this.bits[index]) output[index >> 3] |= 1 << (7 - (index & 7));
      }
      return output;
    }
    get length() { return this.bits.length; }
  }

  class BitReader {
    constructor(bytes) { this.bytes = bytes; this.offset = 0; }
    readBit() {
      if (this.offset >= this.bytes.length * 8) fail('Unexpected end of Polyaminal Fold payload.');
      const value = (this.bytes[this.offset >> 3] >> (7 - (this.offset & 7))) & 1;
      this.offset += 1;
      return value;
    }
    readBits(width) {
      let value = 0n;
      for (let index = 0; index < width; index += 1) value = (value << 1n) | BigInt(this.readBit());
      return value;
    }
    readGamma() {
      let zeros = 0;
      while (this.readBit() === 0) zeros += 1;
      let value = 1;
      for (let index = 0; index < zeros; index += 1) value = (value << 1) | this.readBit();
      return value;
    }
    readBitString(length) {
      let output = '';
      for (let index = 0; index < length; index += 1) output += this.readBit() ? '1' : '0';
      return output;
    }
  }

  function checksumBytes(bytes, bitLength) {
    let hash = 0x811c9dc5;
    for (const byte of bytes) { hash ^= byte; hash = Math.imul(hash, 0x01000193); }
    for (let shift = 24; shift >= 0; shift -= 8) { hash ^= (bitLength >>> shift) & 0xff; hash = Math.imul(hash, 0x01000193); }
    return (hash >>> 0).toString(16).padStart(8, '0');
  }

  function bytesToBase64(bytes) {
    if (typeof Buffer !== 'undefined') return Buffer.from(bytes).toString('base64');
    let binary = '';
    for (const byte of bytes) binary += String.fromCharCode(byte);
    return btoa(binary);
  }
  function base64ToBytes(value) {
    if (typeof Buffer !== 'undefined') return Uint8Array.from(Buffer.from(value, 'base64'));
    const binary = atob(value);
    return Uint8Array.from(binary, character => character.charCodeAt(0));
  }

  function foldBlock(block) {
    if (!isPowerOfTwo(block.length)) fail('Fold blocks must have a power-of-two length.');
    let anchors = block;
    const stages = [];
    while (anchors.length > 1) {
      let nextAnchors = '';
      let swings = '';
      for (let index = 0; index < anchors.length; index += 2) {
        const first = anchors[index];
        const second = anchors[index + 1];
        nextAnchors += first;
        swings += first === second ? '0' : '1';
      }
      stages.push(swings);
      anchors = nextAnchors;
    }
    return { root: anchors, stages };
  }

  function unfoldBlock(root, stages) {
    let anchors = root;
    for (let stageIndex = stages.length - 1; stageIndex >= 0; stageIndex -= 1) {
      const swings = stages[stageIndex];
      if (swings.length !== anchors.length) fail(`Stage ${stageIndex} length does not match its anchor stream.`);
      let expanded = '';
      for (let index = 0; index < anchors.length; index += 1) {
        const first = anchors[index];
        expanded += first;
        expanded += swings[index] === '0' ? first : first === '0' ? '1' : '0';
      }
      anchors = expanded;
    }
    return anchors;
  }

  function runLengths(bits) {
    const runs = [];
    let current = bits[0];
    let count = 1;
    for (let index = 1; index < bits.length; index += 1) {
      if (bits[index] === current) count += 1;
      else { runs.push(count); current = bits[index]; count = 1; }
    }
    runs.push(count);
    return { first: bits[0], runs };
  }

  function sparsePositions(bits) {
    let ones = 0;
    for (const bit of bits) if (bit === '1') ones += 1;
    const minority = ones <= bits.length - ones ? '1' : '0';
    const positions = [];
    for (let index = 0; index < bits.length; index += 1) if (bits[index] === minority) positions.push(index);
    return { minority, positions };
  }

  function estimateCodecs(bits) {
    const estimates = [{ codec: CODECS.raw, name: 'raw', payloadBits: bits.length }];
    if (/^(0+|1+)$/.test(bits)) estimates.push({ codec: CODECS.constant, name: 'constant', payloadBits: 1 });
    const rle = runLengths(bits);
    estimates.push({ codec: CODECS.rle, name: 'rle', payloadBits: 1 + rle.runs.reduce((sum, run) => sum + gammaLength(run), 0), model: rle });
    const sparse = sparsePositions(bits);
    let previous = -1;
    let sparseBits = 1 + gammaLength(sparse.positions.length + 1);
    for (const position of sparse.positions) {
      sparseBits += gammaLength(position - previous);
      previous = position;
    }
    estimates.push({ codec: CODECS.sparse, name: 'sparse', payloadBits: sparseBits, model: sparse });
    return estimates.map(item => ({ ...item, totalBits: item.payloadBits + 2 }));
  }

  function chooseCodec(bits) {
    const priority = new Map([[CODECS.constant, 0], [CODECS.sparse, 1], [CODECS.rle, 2], [CODECS.raw, 3]]);
    return estimateCodecs(bits).sort((a, b) => a.totalBits - b.totalBits || priority.get(a.codec) - priority.get(b.codec))[0];
  }

  function writeStage(writer, bits) {
    const choice = chooseCodec(bits);
    writer.writeBits(choice.codec, 2);
    switch (choice.codec) {
      case CODECS.raw:
        writer.writeBitString(bits);
        break;
      case CODECS.constant:
        writer.writeBit(bits[0] === '1');
        break;
      case CODECS.rle: {
        const model = choice.model || runLengths(bits);
        writer.writeBit(model.first === '1');
        for (const run of model.runs) writer.writeGamma(run);
        break;
      }
      case CODECS.sparse: {
        const model = choice.model || sparsePositions(bits);
        writer.writeBit(model.minority === '1');
        writer.writeGamma(model.positions.length + 1);
        let previous = -1;
        for (const position of model.positions) {
          writer.writeGamma(position - previous);
          previous = position;
        }
        break;
      }
      default:
        fail('Unknown stage codec.');
    }
    return choice;
  }

  function readStage(reader, length) {
    const codec = Number(reader.readBits(2));
    switch (codec) {
      case CODECS.raw:
        return { bits: reader.readBitString(length), codec: 'raw' };
      case CODECS.constant: {
        const bit = reader.readBit() ? '1' : '0';
        return { bits: bit.repeat(length), codec: 'constant' };
      }
      case CODECS.rle: {
        let bit = reader.readBit() ? '1' : '0';
        let output = '';
        while (output.length < length) {
          const run = reader.readGamma();
          if (run < 1 || output.length + run > length) fail('Invalid RLE stage length.');
          output += bit.repeat(run);
          bit = bit === '0' ? '1' : '0';
        }
        return { bits: output, codec: 'rle' };
      }
      case CODECS.sparse: {
        const minority = reader.readBit() ? '1' : '0';
        const count = reader.readGamma() - 1;
        if (count < 0 || count > length) fail('Invalid sparse stage count.');
        const majority = minority === '0' ? '1' : '0';
        const output = new Array(length).fill(majority);
        let previous = -1;
        for (let index = 0; index < count; index += 1) {
          const gap = reader.readGamma();
          const position = previous + gap;
          if (position < 0 || position >= length) fail('Invalid sparse stage position.');
          output[position] = minority;
          previous = position;
        }
        return { bits: output.join(''), codec: 'sparse' };
      }
      default:
        fail('Unknown stage codec identifier.');
    }
  }

  function encode(binary, options = {}) {
    const bits = normalizeBits(binary);
    const blockSize = Number(options.blockSize || 1024);
    if (!SUPPORTED_BLOCK_SIZES.includes(blockSize)) fail(`Block size must be one of: ${SUPPORTED_BLOCK_SIZES.join(', ')}.`);
    if (bits.length > 0xffffffff) fail('The current prototype supports at most 2^32 - 1 input bits.');
    const writer = new BitWriter();
    writer.writeBits(MAGIC, 32);
    writer.writeBits(1, 8);
    writer.writeBits(log2(blockSize), 8);
    writer.writeBits(bits.length, 32);
    const blockCount = Math.ceil(bits.length / blockSize);
    const diagnostics = { blocks: [], codecCounts: { raw: 0, constant: 0, rle: 0, sparse: 0 } };
    for (let blockIndex = 0; blockIndex < blockCount; blockIndex += 1) {
      const source = bits.slice(blockIndex * blockSize, (blockIndex + 1) * blockSize);
      const padded = source.padEnd(blockSize, '0');
      const folded = foldBlock(padded);
      writer.writeBit(folded.root === '1');
      const blockInfo = { blockIndex, sourceBits: source.length, stages: [] };
      for (const stage of folded.stages) {
        const choice = writeStage(writer, stage);
        diagnostics.codecCounts[choice.name] += 1;
        blockInfo.stages.push({ length: stage.length, codec: choice.name, encodedBits: choice.totalBits, density: (stage.match(/1/g) || []).length / stage.length });
      }
      diagnostics.blocks.push(blockInfo);
    }
    const bytes = writer.toUint8Array();
    return {
      format: FORMAT,
      schemaVersion: SCHEMA_VERSION,
      algorithm: 'recursive-xor-anchor-swing-ladder',
      securityClassification: 'lossless-transform-and-compression-prototype-not-encryption',
      blockSize,
      originalBitLength: bits.length,
      encodedBitLength: writer.length,
      storedByteLength: bytes.length,
      ratio: writer.length / bits.length,
      checksumType: 'fnv1a32-corruption-detection-only',
      checksum: checksumBytes(bytes, writer.length),
      data: bytesToBase64(bytes),
      diagnostics
    };
  }

  function decode(packageObject) {
    const payload = typeof packageObject === 'string' ? JSON.parse(packageObject) : packageObject;
    if (!payload || payload.format !== FORMAT) fail('Unrecognized Polyaminal Fold package.');
    if (payload.schemaVersion !== SCHEMA_VERSION) fail(`Unsupported Polyaminal Fold schema: ${payload.schemaVersion || 'missing'}.`);
    const bytes = base64ToBytes(payload.data);
    if (payload.checksumType !== 'fnv1a32-corruption-detection-only') fail('Unsupported or missing Polyaminal Fold checksum type.');
    if (payload.checksum !== checksumBytes(bytes, Number(payload.encodedBitLength))) fail('Polyaminal Fold checksum validation failed.');
    const reader = new BitReader(bytes);
    if (Number(reader.readBits(32)) !== MAGIC) fail('Polyaminal Fold magic header does not match.');
    if (Number(reader.readBits(8)) !== 1) fail('Unsupported Polyaminal Fold binary version.');
    const blockSize = 2 ** Number(reader.readBits(8));
    if (!SUPPORTED_BLOCK_SIZES.includes(blockSize)) fail('Encoded block size is unsupported.');
    const originalBitLength = Number(reader.readBits(32));
    if (originalBitLength !== Number(payload.originalBitLength)) fail('Package metadata does not match the encoded bitstream length.');
    if (blockSize !== Number(payload.blockSize)) fail('Package block-size metadata does not match the encoded bitstream.');
    const blockCount = Math.ceil(originalBitLength / blockSize);
    const stageCount = log2(blockSize);
    let output = '';
    for (let blockIndex = 0; blockIndex < blockCount; blockIndex += 1) {
      const root = reader.readBit() ? '1' : '0';
      const stages = [];
      let length = blockSize / 2;
      for (let stageIndex = 0; stageIndex < stageCount; stageIndex += 1) {
        const decoded = readStage(reader, length);
        stages.push(decoded.bits);
        length /= 2;
      }
      output += unfoldBlock(root, stages);
    }
    return output.slice(0, originalBitLength);
  }

  function analyze(binary, options = {}) {
    const bits = normalizeBits(binary);
    const encoded = encode(bits, options);
    const decoded = decode(encoded);
    return {
      ...encoded,
      roundTrip: decoded === bits,
      savingsBits: bits.length - encoded.encodedBitLength,
      savingsPercent: (1 - encoded.encodedBitLength / bits.length) * 100
    };
  }

  return Object.freeze({
    encode,
    decode,
    analyze,
    foldBlock,
    unfoldBlock,
    estimateCodecs,
    chooseCodec,
    constants: Object.freeze({ FORMAT, SCHEMA_VERSION, MAGIC, CODECS, CODEC_NAMES, SUPPORTED_BLOCK_SIZES })
  });
});
