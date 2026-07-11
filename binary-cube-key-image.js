(function installBinaryCubeKeyImage(root, factory) {
  'use strict';
  const api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.BinaryCubeKeyImage = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function createBinaryCubeKeyImage(root) {
  'use strict';

  const IMAGE_FORMAT = 'hb-ttrpg-binary-cube-key-image';
  const IMAGE_SCHEMA_VERSION = '1.0.0';
  const RASTER_ENCODING = 'png-16bit-rgb-log-depth-blue-complement-mask';
  const KEY_CHUNK_TYPE = 'bcKz';
  const PNG_SIGNATURE = Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const TEXT_ENCODER = new TextEncoder();
  const TEXT_DECODER = new TextDecoder('utf-8', { fatal: true });
  const CRC_TABLE = buildCrcTable();

  function fail(message) {
    throw new Error(message);
  }

  function engine(value) {
    const resolved = value || root?.ShadowrunBinaryCubeEngine;
    if (!resolved) fail('The Binary Cube engine is not available.');
    return resolved;
  }

  function buildCrcTable() {
    const table = new Uint32Array(256);
    for (let index = 0; index < 256; index += 1) {
      let value = index;
      for (let bit = 0; bit < 8; bit += 1) value = (value & 1) ? (0xedb88320 ^ (value >>> 1)) : (value >>> 1);
      table[index] = value >>> 0;
    }
    return table;
  }

  function crc32(bytes) {
    let crc = 0xffffffff;
    for (let index = 0; index < bytes.length; index += 1) crc = CRC_TABLE[(crc ^ bytes[index]) & 0xff] ^ (crc >>> 8);
    return (crc ^ 0xffffffff) >>> 0;
  }

  function concat(parts) {
    const length = parts.reduce((total, part) => total + part.length, 0);
    const output = new Uint8Array(length);
    let offset = 0;
    for (const part of parts) {
      output.set(part, offset);
      offset += part.length;
    }
    return output;
  }

  function chunk(type, data = new Uint8Array()) {
    if (!/^[A-Za-z]{4}$/.test(type)) fail(`Invalid PNG chunk type: ${type}`);
    const typeBytes = TEXT_ENCODER.encode(type);
    const output = new Uint8Array(data.length + 12);
    const view = new DataView(output.buffer);
    view.setUint32(0, data.length, false);
    output.set(typeBytes, 4);
    output.set(data, 8);
    view.setUint32(data.length + 8, crc32(concat([typeBytes, data])), false);
    return output;
  }

  async function transformCompression(bytes, mode) {
    const Constructor = mode === 'compress' ? root?.CompressionStream : root?.DecompressionStream;
    if (typeof Constructor !== 'function') fail(`${mode === 'compress' ? 'CompressionStream' : 'DecompressionStream'} is unavailable in this environment.`);
    const stream = new Blob([bytes]).stream().pipeThrough(new Constructor('deflate'));
    return new Uint8Array(await new Response(stream).arrayBuffer());
  }

  function logarithmicDepthTone(depth, size) {
    if (!Number.isInteger(depth) || depth < 0 || depth >= size) fail('The key contains a depth value outside its grid.');
    return Math.round((Math.log2(depth + 1) / Math.log2(size)) * 65535);
  }

  function pointDepth(key, x, y) {
    const latinValue = (key.rowPermutation[x] + key.columnPermutation[y]) % key.gridSize;
    return key.depthPermutation[latinValue];
  }

  function setUint16(bytes, offset, value) {
    bytes[offset] = (value >>> 8) & 0xff;
    bytes[offset + 1] = value & 0xff;
  }

  function getUint16(bytes, offset) {
    return (bytes[offset] << 8) | bytes[offset + 1];
  }

  function imageMetadata(key) {
    return {
      format: IMAGE_FORMAT,
      schemaVersion: IMAGE_SCHEMA_VERSION,
      rasterEncoding: RASTER_ENCODING,
      gridSize: key.gridSize,
      key
    };
  }

  async function encodeKeyPng(rawKey, engineValue) {
    const Engine = engine(engineValue);
    const key = Engine.validateKey(rawKey);
    const size = key.gridSize;
    const bytesPerPixel = 6;
    const rowBytes = size * bytesPerPixel;
    const raster = new Uint8Array((rowBytes + 1) * size);

    for (let y = 0; y < size; y += 1) {
      const rowOffset = y * (rowBytes + 1);
      raster[rowOffset] = 0;
      for (let x = 0; x < size; x += 1) {
        const keyIndex = x * size + y;
        const depth = pointDepth(key, x, y);
        const tone = logarithmicDepthTone(depth, size);
        const blue = key.mask[keyIndex] ? tone : (tone ^ 0xffff);
        const pixelOffset = rowOffset + 1 + x * bytesPerPixel;
        setUint16(raster, pixelOffset, tone);
        setUint16(raster, pixelOffset + 2, tone);
        setUint16(raster, pixelOffset + 4, blue);
      }
    }

    const ihdr = new Uint8Array(13);
    const ihdrView = new DataView(ihdr.buffer);
    ihdrView.setUint32(0, size, false);
    ihdrView.setUint32(4, size, false);
    ihdr[8] = 16;
    ihdr[9] = 2;
    ihdr[10] = 0;
    ihdr[11] = 0;
    ihdr[12] = 0;

    const metadataBytes = TEXT_ENCODER.encode(JSON.stringify(imageMetadata(key)));
    const compressedMetadata = await transformCompression(metadataBytes, 'compress');
    const compressedRaster = await transformCompression(raster, 'compress');
    const text = TEXT_ENCODER.encode('Description\0Lossless Binary Cube key image. Do not resize, recolor, convert, or strip PNG chunks.');

    return concat([
      PNG_SIGNATURE,
      chunk('IHDR', ihdr),
      chunk(KEY_CHUNK_TYPE, compressedMetadata),
      chunk('tEXt', text),
      chunk('IDAT', compressedRaster),
      chunk('IEND')
    ]);
  }

  function paethPredictor(left, up, upLeft) {
    const prediction = left + up - upLeft;
    const leftDistance = Math.abs(prediction - left);
    const upDistance = Math.abs(prediction - up);
    const upLeftDistance = Math.abs(prediction - upLeft);
    if (leftDistance <= upDistance && leftDistance <= upLeftDistance) return left;
    if (upDistance <= upLeftDistance) return up;
    return upLeft;
  }

  function unfilterRaster(filtered, width, height) {
    const bytesPerPixel = 6;
    const rowBytes = width * bytesPerPixel;
    const expectedLength = (rowBytes + 1) * height;
    if (filtered.length !== expectedLength) fail(`PNG raster length ${filtered.length} does not match the expected ${expectedLength} bytes.`);
    const output = new Uint8Array(rowBytes * height);

    for (let row = 0; row < height; row += 1) {
      const sourceOffset = row * (rowBytes + 1);
      const targetOffset = row * rowBytes;
      const filter = filtered[sourceOffset];
      if (filter > 4) fail(`Unsupported PNG row filter: ${filter}.`);
      for (let index = 0; index < rowBytes; index += 1) {
        const raw = filtered[sourceOffset + 1 + index];
        const left = index >= bytesPerPixel ? output[targetOffset + index - bytesPerPixel] : 0;
        const up = row > 0 ? output[targetOffset - rowBytes + index] : 0;
        const upLeft = row > 0 && index >= bytesPerPixel ? output[targetOffset - rowBytes + index - bytesPerPixel] : 0;
        let predictor = 0;
        if (filter === 1) predictor = left;
        else if (filter === 2) predictor = up;
        else if (filter === 3) predictor = Math.floor((left + up) / 2);
        else if (filter === 4) predictor = paethPredictor(left, up, upLeft);
        output[targetOffset + index] = (raw + predictor) & 0xff;
      }
    }
    return output;
  }

  async function bytesFromInput(input) {
    if (input instanceof Uint8Array) return input;
    if (input instanceof ArrayBuffer) return new Uint8Array(input);
    if (ArrayBuffer.isView(input)) return new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
    if (input && typeof input.arrayBuffer === 'function') return new Uint8Array(await input.arrayBuffer());
    fail('A PNG Blob, ArrayBuffer, or Uint8Array is required.');
  }

  function sameBytes(left, right) {
    if (left.length !== right.length) return false;
    for (let index = 0; index < left.length; index += 1) if (left[index] !== right[index]) return false;
    return true;
  }

  async function decodeKeyPng(input, engineValue) {
    const Engine = engine(engineValue);
    const bytes = await bytesFromInput(input);
    if (bytes.length < PNG_SIGNATURE.length || !sameBytes(bytes.subarray(0, 8), PNG_SIGNATURE)) fail('The selected file is not a PNG image.');

    let offset = 8;
    let width = 0;
    let height = 0;
    let bitDepth = 0;
    let colorType = -1;
    let interlace = -1;
    let metadataChunk = null;
    const idatChunks = [];
    let sawEnd = false;

    while (offset + 12 <= bytes.length) {
      const view = new DataView(bytes.buffer, bytes.byteOffset + offset, bytes.length - offset);
      const length = view.getUint32(0, false);
      const chunkEnd = offset + 12 + length;
      if (chunkEnd > bytes.length) fail('The PNG contains a truncated chunk.');
      const typeBytes = bytes.subarray(offset + 4, offset + 8);
      const type = TEXT_DECODER.decode(typeBytes);
      const data = bytes.subarray(offset + 8, offset + 8 + length);
      const storedCrc = new DataView(bytes.buffer, bytes.byteOffset + offset + 8 + length, 4).getUint32(0, false);
      const expectedCrc = crc32(concat([typeBytes, data]));
      if (storedCrc !== expectedCrc) fail(`PNG chunk ${type} failed CRC validation.`);

      if (type === 'IHDR') {
        if (length !== 13) fail('The PNG IHDR chunk is invalid.');
        const header = new DataView(data.buffer, data.byteOffset, data.byteLength);
        width = header.getUint32(0, false);
        height = header.getUint32(4, false);
        bitDepth = data[8];
        colorType = data[9];
        if (data[10] !== 0 || data[11] !== 0) fail('The PNG uses unsupported compression or filtering methods.');
        interlace = data[12];
      } else if (type === KEY_CHUNK_TYPE) {
        if (metadataChunk) fail('The PNG contains more than one Binary Cube key chunk.');
        metadataChunk = new Uint8Array(data);
      } else if (type === 'IDAT') {
        idatChunks.push(new Uint8Array(data));
      } else if (type === 'IEND') {
        sawEnd = true;
        break;
      }
      offset = chunkEnd;
    }

    if (!sawEnd) fail('The PNG is missing its IEND chunk.');
    if (!metadataChunk) fail('The PNG is missing its lossless Binary Cube key chunk. It may have been edited or metadata-stripped.');
    if (!idatChunks.length) fail('The PNG contains no image data.');
    if (width < 1 || height < 1 || width !== height) fail('A Binary Cube key image must be square.');
    if (bitDepth !== 16 || colorType !== 2 || interlace !== 0) fail('A Binary Cube key image must remain a non-interlaced 16-bit RGB PNG.');

    let metadata;
    try {
      metadata = JSON.parse(TEXT_DECODER.decode(await transformCompression(metadataChunk, 'decompress')));
    } catch (error) {
      fail(`The embedded Binary Cube key record is invalid: ${error.message}`);
    }
    if (metadata.format !== IMAGE_FORMAT) fail('The PNG does not contain a recognized Binary Cube key record.');
    if (metadata.schemaVersion !== IMAGE_SCHEMA_VERSION) fail(`Unsupported Binary Cube key-image schema: ${metadata.schemaVersion || 'missing'}.`);
    if (metadata.rasterEncoding !== RASTER_ENCODING) fail('The Binary Cube key image uses an unsupported raster encoding.');

    const key = Engine.validateKey(metadata.key);
    if (metadata.gridSize !== key.gridSize || width !== key.gridSize || height !== key.gridSize) fail('The PNG dimensions do not match the embedded key grid size.');

    const filteredRaster = await transformCompression(concat(idatChunks), 'decompress');
    const raster = unfilterRaster(filteredRaster, width, height);
    const rowBytes = width * 6;

    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const keyIndex = x * width + y;
        const pixelOffset = y * rowBytes + x * 6;
        const red = getUint16(raster, pixelOffset);
        const green = getUint16(raster, pixelOffset + 2);
        const blue = getUint16(raster, pixelOffset + 4);
        const expectedTone = logarithmicDepthTone(pointDepth(key, x, y), width);
        const expectedBlue = key.mask[keyIndex] ? expectedTone : (expectedTone ^ 0xffff);
        if (red !== expectedTone || green !== expectedTone || blue !== expectedBlue) {
          fail(`The Binary Cube key image raster does not exactly match its embedded key at x=${x}, y=${y}.`);
        }
      }
    }

    return key;
  }

  async function encodeKeyBlob(rawKey, engineValue) {
    return new Blob([await encodeKeyPng(rawKey, engineValue)], { type: 'image/png' });
  }

  return Object.freeze({
    encodeKeyPng,
    encodeKeyBlob,
    decodeKeyPng,
    logarithmicDepthTone,
    constants: Object.freeze({ IMAGE_FORMAT, IMAGE_SCHEMA_VERSION, RASTER_ENCODING, KEY_CHUNK_TYPE })
  });
});
