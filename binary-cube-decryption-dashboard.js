(function installBinaryCubeDecryptionDashboard(root, factory) {
  'use strict';
  const api = factory(root || globalThis);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.BinaryCubeDecryptionDashboard = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function createBinaryCubeDecryptionDashboard(root) {
  'use strict';

  const PANEL_ID = 'binary-cube-decryption-dashboard';
  const STYLE_ID = 'binary-cube-decryption-dashboard-style';
  const SESSION_FORMAT = 'hb-ttrpg-binary-cube-decryption-dashboard-session';
  const SESSION_SCHEMA_VERSION = '0.1.0';
  const PACKAGE_FORMAT = 'hb-ttrpg-shadowrun-binary-cube-package';
  const SECURE_EXPORT_FORMAT = 'hb-ttrpg-binary-cube-secure-export';
  const MAX_INPUT_BITS = 8 * 1024 * 1024;
  const DEFAULT_RESULT_LIMIT = 24;
  const MAX_GRID_SIZE_FOR_STRUCTURAL_ATTACK = 128;
  const COMMON_TEXT_TOKENS = Object.freeze([
    ' the ', ' and ', ' of ', ' to ', ' in ', ' is ', 'ing', 'ion', 'that', 'with', 'http', '{', '}', '[', ']', ':', ',', '\n'
  ]);
  const FILE_SIGNATURES = Object.freeze([
    { label: 'PDF', bytes: [0x25, 0x50, 0x44, 0x46] },
    { label: 'ZIP', bytes: [0x50, 0x4b, 0x03, 0x04] },
    { label: 'PNG', bytes: [0x89, 0x50, 0x4e, 0x47] },
    { label: 'GIF', bytes: [0x47, 0x49, 0x46, 0x38] },
    { label: 'JPEG', bytes: [0xff, 0xd8, 0xff] },
    { label: 'GZIP', bytes: [0x1f, 0x8b] },
    { label: '7-Zip', bytes: [0x37, 0x7a, 0xbc, 0xaf, 0x27, 0x1c] },
    { label: 'RAR', bytes: [0x52, 0x61, 0x72, 0x21, 0x1a, 0x07] },
    { label: 'ELF', bytes: [0x7f, 0x45, 0x4c, 0x46] }
  ]);

  let panel = null;
  let activeSource = null;
  let activeResults = [];
  let activeToken = null;

  const esc = value => String(value ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[character]));
  const clamp = (value, minimum, maximum) => Math.max(minimum, Math.min(maximum, value));

  function fail(message) { throw new Error(message); }

  function canonicalEngine() {
    return root?.ShadowrunBinaryCubeEngine || null;
  }

  function cooperativeRunner() {
    return root?.ScientificToolsCooperativeRunner || null;
  }

  function ensureStyle() {
    if (!root?.document || root.document.getElementById(STYLE_ID)) return;
    const link = root.document.createElement('link');
    link.id = STYLE_ID;
    link.rel = 'stylesheet';
    link.href = 'binary-cube-decryption-dashboard.css?v=20260809-decryption-dashboard-1';
    root.document.head.appendChild(link);
  }

  function normalizeBits(value, label = 'Input') {
    const bits = String(value ?? '').replace(/\s+/g, '');
    if (!bits) fail(`${label} is empty.`);
    if (/[^01]/.test(bits)) fail(`${label} must contain only binary digits and whitespace.`);
    if (bits.length > MAX_INPUT_BITS) fail(`${label} exceeds the ${MAX_INPUT_BITS.toLocaleString()}-bit dashboard limit.`);
    return bits;
  }

  function bitsFromBytes(bytesValue) {
    const bytes = Uint8Array.from(bytesValue || []);
    if (bytes.length * 8 > MAX_INPUT_BITS) fail(`Input exceeds the ${MAX_INPUT_BITS.toLocaleString()}-bit dashboard limit.`);
    let output = '';
    for (const byte of bytes) output += byte.toString(2).padStart(8, '0');
    return output;
  }

  function bytesFromBits(bitsValue) {
    const bits = normalizeBits(bitsValue, 'Bitstream');
    const byteCount = Math.floor(bits.length / 8);
    const bytes = new Uint8Array(byteCount);
    for (let index = 0; index < byteCount; index += 1) bytes[index] = parseInt(bits.slice(index * 8, index * 8 + 8), 2);
    return bytes;
  }

  function bytesFromHex(value) {
    const compact = String(value ?? '').replace(/0x/gi, '').replace(/[\s:_-]+/g, '');
    if (!compact) fail('Hex input is empty.');
    if (/[^0-9a-f]/i.test(compact)) fail('Hex input contains non-hexadecimal characters.');
    if (compact.length % 2) fail('Hex input must contain complete bytes (an even number of hex digits).');
    const bytes = new Uint8Array(compact.length / 2);
    for (let index = 0; index < bytes.length; index += 1) bytes[index] = parseInt(compact.slice(index * 2, index * 2 + 2), 16);
    return bytes;
  }

  function bytesFromBase64(value) {
    const compact = String(value ?? '').replace(/\s+/g, '');
    if (!compact) fail('Base64 input is empty.');
    let binary;
    if (typeof root?.atob === 'function') binary = root.atob(compact);
    else if (typeof Buffer !== 'undefined') binary = Buffer.from(compact, 'base64').toString('binary');
    else fail('Base64 decoding is unavailable in this runtime.');
    return Uint8Array.from(binary, character => character.charCodeAt(0) & 0xff);
  }

  function textBytes(value) {
    const text = String(value ?? '');
    if (!text) fail('Text input is empty.');
    if (typeof TextEncoder !== 'undefined') return new TextEncoder().encode(text);
    return Uint8Array.from(unescape(encodeURIComponent(text)), character => character.charCodeAt(0));
  }

  function decodeText(bytesValue) {
    const bytes = Uint8Array.from(bytesValue || []);
    if (!bytes.length) return '';
    if (typeof TextDecoder !== 'undefined') {
      try { return new TextDecoder('utf-8', { fatal: false }).decode(bytes); } catch (_) { /* ASCII fallback below. */ }
    }
    return Array.from(bytes, byte => byte >= 32 && byte <= 126 || byte === 9 || byte === 10 || byte === 13 ? String.fromCharCode(byte) : '�').join('');
  }

  function parseJsonArtifact(value) {
    try {
      const object = typeof value === 'string' ? JSON.parse(value) : value;
      if (!object || typeof object !== 'object' || Array.isArray(object)) return null;
      if (object.format === PACKAGE_FORMAT && typeof object.ciphertext === 'string') {
        return { kind: 'binary-cube-package', artifact: object, bits: normalizeBits(object.ciphertext, 'Package ciphertext') };
      }
      if (object.format === SECURE_EXPORT_FORMAT && typeof object.ciphertext === 'string') {
        return { kind: 'binary-cube-secure-export', artifact: object, bits: normalizeBits(object.ciphertext, 'Secure-export ciphertext') };
      }
      return null;
    } catch (_) {
      return null;
    }
  }

  function parseSourceText(value, mode = 'auto', sourceName = 'pasted-input') {
    const raw = String(value ?? '');
    const selectedMode = String(mode || 'auto');
    let bits;
    let kind = selectedMode;
    let artifact = null;

    if (selectedMode === 'auto' || selectedMode === 'json') {
      const parsedArtifact = parseJsonArtifact(raw.trim());
      if (parsedArtifact) {
        bits = parsedArtifact.bits;
        kind = parsedArtifact.kind;
        artifact = parsedArtifact.artifact;
      } else if (selectedMode === 'json') {
        fail('JSON input is not a recognized Binary Cube package or secure export.');
      }
    }
    if (!bits && (selectedMode === 'auto' || selectedMode === 'binary')) {
      const compact = raw.replace(/\s+/g, '');
      if (compact && !/[^01]/.test(compact)) {
        bits = normalizeBits(compact, 'Binary input');
        kind = 'binary';
      } else if (selectedMode === 'binary') {
        fail('Binary input may contain only 0, 1, and whitespace.');
      }
    }
    if (!bits && (selectedMode === 'auto' || selectedMode === 'hex')) {
      const compact = raw.replace(/0x/gi, '').replace(/[\s:_-]+/g, '');
      if (selectedMode === 'hex' || (compact.length >= 2 && compact.length % 2 === 0 && !/[^0-9a-f]/i.test(compact))) {
        const bytes = bytesFromHex(raw);
        bits = bitsFromBytes(bytes);
        kind = 'hex';
      }
    }
    if (!bits && selectedMode === 'base64') {
      bits = bitsFromBytes(bytesFromBase64(raw));
      kind = 'base64';
    }
    if (!bits) {
      const bytes = textBytes(raw);
      bits = bitsFromBytes(bytes);
      kind = selectedMode === 'auto' ? 'text' : selectedMode;
    }

    return Object.freeze({
      sourceName: String(sourceName || 'pasted-input'),
      kind,
      bits,
      bytes: bytesFromBits(bits),
      artifact,
      trailingBitCount: bits.length % 8
    });
  }

  function parseSourceBytes(bytesValue, sourceName = 'uploaded-file') {
    const bytes = Uint8Array.from(bytesValue || []);
    if (!bytes.length) fail('The selected file is empty.');
    if (bytes.length * 8 > MAX_INPUT_BITS) fail(`The selected file exceeds the ${MAX_INPUT_BITS.toLocaleString()}-bit dashboard limit.`);
    const text = decodeText(bytes);
    const artifact = parseJsonArtifact(text.trim());
    if (artifact) {
      return Object.freeze({
        sourceName: String(sourceName || 'uploaded-file'),
        kind: artifact.kind,
        bits: artifact.bits,
        bytes: bytesFromBits(artifact.bits),
        artifact: artifact.artifact,
        trailingBitCount: artifact.bits.length % 8
      });
    }
    const compactTextBits = text.replace(/\s+/g, '');
    if (compactTextBits && !/[^01]/.test(compactTextBits)) {
      const bits = normalizeBits(compactTextBits, 'Binary text file');
      return Object.freeze({
        sourceName: String(sourceName || 'uploaded-file'),
        kind: 'binary-text-file',
        bits,
        bytes: bytesFromBits(bits),
        artifact: null,
        trailingBitCount: bits.length % 8
      });
    }
    const bits = bitsFromBytes(bytes);
    return Object.freeze({ sourceName: String(sourceName || 'uploaded-file'), kind: 'file-bytes', bits, bytes, artifact: null, trailingBitCount: 0 });
  }

  function shannonEntropy(bytesValue) {
    const bytes = Uint8Array.from(bytesValue || []);
    if (!bytes.length) return 0;
    const counts = new Uint32Array(256);
    for (const byte of bytes) counts[byte] += 1;
    let entropy = 0;
    for (const count of counts) {
      if (!count) continue;
      const probability = count / bytes.length;
      entropy -= probability * Math.log2(probability);
    }
    return entropy;
  }

  function indexOfCoincidence(bytesValue) {
    const bytes = Uint8Array.from(bytesValue || []);
    if (bytes.length < 2) return 0;
    const counts = new Uint32Array(256);
    for (const byte of bytes) counts[byte] += 1;
    let numerator = 0;
    for (const count of counts) numerator += count * (count - 1);
    return numerator / (bytes.length * (bytes.length - 1));
  }

  function bitDensity(bitsValue) {
    const bits = normalizeBits(bitsValue, 'Bitstream');
    let ones = 0;
    for (const bit of bits) if (bit === '1') ones += 1;
    return ones / bits.length;
  }

  function longestRun(bitsValue) {
    const bits = normalizeBits(bitsValue, 'Bitstream');
    let best = 1;
    let current = 1;
    for (let index = 1; index < bits.length; index += 1) {
      if (bits[index] === bits[index - 1]) current += 1;
      else current = 1;
      if (current > best) best = current;
    }
    return best;
  }

  function candidateGridSizes(bitLength, artifact = null) {
    const exact = Number(artifact?.gridSize);
    const candidates = [];
    if (Number.isInteger(exact) && exact >= 3 && exact <= 1024) candidates.push({ gridSize: exact, source: 'package metadata', aligned: bitLength % (exact * exact) === 0 });
    const recommended = [3, 4, 5, 6, 7, 8, 10, 12, 16, 20, 28, 36, 44, 52, 60, 64, 96, 128, 192, 256, 384, 512, 768, 1024];
    for (const gridSize of recommended) {
      if (gridSize === exact) continue;
      const cellCount = gridSize * gridSize;
      if (bitLength % cellCount === 0) candidates.push({ gridSize, source: 'exact block divisor', aligned: true });
    }
    return Object.freeze(candidates.slice(0, 16).map(Object.freeze));
  }

  function autocorrelation(bitsValue, maximumLag = 64) {
    const bits = normalizeBits(bitsValue, 'Bitstream');
    const limit = Math.min(maximumLag, Math.max(0, bits.length - 1));
    const rows = [];
    for (let lag = 1; lag <= limit; lag += 1) {
      let matches = 0;
      const total = bits.length - lag;
      for (let index = 0; index < total; index += 1) if (bits[index] === bits[index + lag]) matches += 1;
      rows.push({ lag, matchRate: total ? matches / total : 0 });
    }
    return rows.sort((left, right) => Math.abs(right.matchRate - 0.5) - Math.abs(left.matchRate - 0.5)).slice(0, 8);
  }

  function blockDiagnostics(bitsValue, gridSizeValue) {
    const bits = normalizeBits(bitsValue, 'Bitstream');
    const gridSize = Number(gridSizeValue);
    if (!Number.isInteger(gridSize) || gridSize < 3) return [];
    const cellCount = gridSize * gridSize;
    if (bits.length % cellCount) return [];
    const blockCount = bits.length / cellCount;
    const rows = [];
    for (let blockIndex = 0; blockIndex < Math.min(blockCount, 64); blockIndex += 1) {
      const block = bits.slice(blockIndex * cellCount, (blockIndex + 1) * cellCount);
      let ones = 0;
      for (const bit of block) if (bit === '1') ones += 1;
      rows.push(Object.freeze({ blockIndex, ones, zeros: cellCount - ones, oneDensity: ones / cellCount }));
    }
    return Object.freeze(rows);
  }

  function analyzeSource(sourceValue, gridSizeValue = null) {
    const source = sourceValue;
    if (!source?.bits) fail('A parsed source is required.');
    const bits = source.bits;
    const bytes = source.bytes || bytesFromBits(bits);
    const grids = candidateGridSizes(bits.length, source.artifact);
    const selectedGrid = Number(gridSizeValue) || grids[0]?.gridSize || null;
    const byteCounts = new Uint32Array(256);
    for (const byte of bytes) byteCounts[byte] += 1;
    const topBytes = Array.from(byteCounts, (count, byte) => ({ byte, count }))
      .filter(row => row.count)
      .sort((left, right) => right.count - left.count || left.byte - right.byte)
      .slice(0, 8);
    const metadata = source.artifact ? {
      format: source.artifact.format,
      schemaVersion: source.artifact.schemaVersion,
      algorithm: source.artifact.algorithm || null,
      keyId: source.artifact.keyId || null,
      gridSize: source.artifact.gridSize ?? null,
      inputFace: source.artifact.inputFace || null,
      outputFace: source.artifact.outputFace || null,
      inputQuarterTurns: source.artifact.inputQuarterTurns ?? null,
      outputQuarterTurns: source.artifact.outputQuarterTurns ?? null,
      originalBitLength: source.artifact.originalBitLength ?? null,
      payloadCapacity: source.artifact.payloadCapacity ?? null,
      blockCount: source.artifact.blockCount ?? null,
      checksumType: source.artifact.checksumType || null,
      checksum: source.artifact.checksum || null,
      framingCiphertextBits: typeof source.artifact.framingCiphertext === 'string' ? source.artifact.framingCiphertext.length : null
    } : null;
    return Object.freeze({
      bitLength: bits.length,
      byteLength: bytes.length,
      trailingBitCount: bits.length % 8,
      oneDensity: bitDensity(bits),
      longestBitRun: longestRun(bits),
      byteEntropy: shannonEntropy(bytes),
      indexOfCoincidence: indexOfCoincidence(bytes),
      topBytes: Object.freeze(topBytes.map(Object.freeze)),
      candidateGridSizes: grids,
      strongestAutocorrelations: Object.freeze(autocorrelation(bits)),
      selectedGridSize: selectedGrid,
      blockDiagnostics: selectedGrid ? blockDiagnostics(bits, selectedGrid) : Object.freeze([]),
      metadata
    });
  }

  function reverseBits(bits) { return bits.split('').reverse().join(''); }

  function mapByteChunks(bitsValue, mapper) {
    const bits = normalizeBits(bitsValue, 'Bitstream');
    const fullLength = Math.floor(bits.length / 8) * 8;
    let output = '';
    for (let offset = 0; offset < fullLength; offset += 8) output += mapper(bits.slice(offset, offset + 8), offset / 8);
    return output + bits.slice(fullLength);
  }

  function reverseBitsPerByte(bits) { return mapByteChunks(bits, byteBits => byteBits.split('').reverse().join('')); }
  function reverseByteOrder(bitsValue) {
    const bits = normalizeBits(bitsValue, 'Bitstream');
    const fullLength = Math.floor(bits.length / 8) * 8;
    const chunks = [];
    for (let offset = 0; offset < fullLength; offset += 8) chunks.push(bits.slice(offset, offset + 8));
    return chunks.reverse().join('') + bits.slice(fullLength);
  }
  function nibbleSwap(bits) { return mapByteChunks(bits, byteBits => byteBits.slice(4) + byteBits.slice(0, 4)); }
  function rotateByteBits(bits, amount) {
    const shift = ((Number(amount) || 0) % 8 + 8) % 8;
    return mapByteChunks(bits, byteBits => byteBits.slice(shift) + byteBits.slice(0, shift));
  }

  function xorByte(bitsValue, keyValue) {
    const bits = normalizeBits(bitsValue, 'Bitstream');
    const key = Number(keyValue) & 0xff;
    const bytes = bytesFromBits(bits);
    const output = new Uint8Array(bytes.length);
    for (let index = 0; index < bytes.length; index += 1) output[index] = bytes[index] ^ key;
    return bitsFromBytes(output) + bits.slice(bytes.length * 8);
  }

  function transformSquareBlock(block, gridSize, transform) {
    const size = Number(gridSize);
    const cellCount = size * size;
    if (block.length !== cellCount) fail('Square block length does not match the selected grid size.');
    const output = new Array(cellCount);
    const at = (row, column) => block[row * size + column];
    for (let row = 0; row < size; row += 1) {
      for (let column = 0; column < size; column += 1) {
        let sourceRow = row;
        let sourceColumn = column;
        switch (transform) {
          case 'transpose': sourceRow = column; sourceColumn = row; break;
          case 'anti-transpose': sourceRow = size - 1 - column; sourceColumn = size - 1 - row; break;
          case 'rotate-90': sourceRow = size - 1 - column; sourceColumn = row; break;
          case 'rotate-180': sourceRow = size - 1 - row; sourceColumn = size - 1 - column; break;
          case 'rotate-270': sourceRow = column; sourceColumn = size - 1 - row; break;
          case 'mirror-horizontal': sourceRow = row; sourceColumn = size - 1 - column; break;
          case 'mirror-vertical': sourceRow = size - 1 - row; sourceColumn = column; break;
          default: break;
        }
        output[row * size + column] = at(sourceRow, sourceColumn);
      }
    }
    return output.join('');
  }

  function transformBlocks(bitsValue, gridSizeValue, transform) {
    const bits = normalizeBits(bitsValue, 'Bitstream');
    const gridSize = Number(gridSizeValue);
    if (!Number.isInteger(gridSize) || gridSize < 3 || gridSize > MAX_GRID_SIZE_FOR_STRUCTURAL_ATTACK) fail(`Grid size must be 3-${MAX_GRID_SIZE_FOR_STRUCTURAL_ATTACK} for structural attacks.`);
    const cellCount = gridSize * gridSize;
    if (bits.length % cellCount) fail('Bitstream is not aligned to the selected square block size.');
    const blocks = [];
    for (let offset = 0; offset < bits.length; offset += cellCount) blocks.push(bits.slice(offset, offset + cellCount));
    if (transform === 'reverse-block-order') return blocks.reverse().join('');
    if (transform === 'reverse-within-block') return blocks.map(reverseBits).join('');
    return blocks.map(block => transformSquareBlock(block, gridSize, transform)).join('');
  }

  function signatureForBytes(bytesValue) {
    const bytes = Uint8Array.from(bytesValue || []);
    for (const signature of FILE_SIGNATURES) {
      if (signature.bytes.every((byte, index) => bytes[index] === byte)) return signature.label;
    }
    const text = decodeText(bytes.slice(0, 4096)).trimStart();
    if (text.startsWith('{') || text.startsWith('[')) {
      try { JSON.parse(text); return 'JSON'; } catch (_) { /* Not enough structure to claim a signature. */ }
    }
    if (text.startsWith('<?xml') || text.startsWith('<html') || text.startsWith('<!DOCTYPE')) return 'markup-like';
    return '';
  }

  function textScore(bitsValue, cribValue = '') {
    const bits = normalizeBits(bitsValue, 'Candidate');
    const bytes = bytesFromBits(bits);
    if (!bytes.length) return Object.freeze({ score: 0, printableFraction: 0, letterSpaceFraction: 0, signature: '', preview: '', hexPreview: '' });
    let printable = 0;
    let letterSpace = 0;
    for (const byte of bytes) {
      if ((byte >= 32 && byte <= 126) || byte === 9 || byte === 10 || byte === 13) printable += 1;
      if ((byte >= 65 && byte <= 90) || (byte >= 97 && byte <= 122) || byte === 32 || byte === 10 || byte === 13 || byte === 9) letterSpace += 1;
    }
    const printableFraction = printable / bytes.length;
    const letterSpaceFraction = letterSpace / bytes.length;
    const text = decodeText(bytes);
    const lower = text.toLowerCase();
    let tokenHits = 0;
    for (const token of COMMON_TEXT_TOKENS) if (lower.includes(token)) tokenHits += 1;
    const signature = signatureForBytes(bytes);
    const crib = String(cribValue || '').toLowerCase();
    const cribHit = crib && lower.includes(crib) ? 1 : 0;
    const entropy = shannonEntropy(bytes);
    const textEntropyPreference = 1 - clamp(Math.abs(entropy - 4.5) / 4.5, 0, 1);
    const score = clamp(
      printableFraction * 52
      + letterSpaceFraction * 18
      + Math.min(18, tokenHits * 3)
      + (signature ? 18 : 0)
      + cribHit * 30
      + textEntropyPreference * 4,
      0,
      100
    );
    const preview = text.replace(/\u0000/g, '␀').slice(0, 420);
    const hexPreview = Array.from(bytes.slice(0, 96), byte => byte.toString(16).padStart(2, '0')).join(' ');
    return Object.freeze({ score, printableFraction, letterSpaceFraction, signature, cribHit: Boolean(cribHit), preview, hexPreview, entropy });
  }

  function structuralCandidates(bitsValue, gridSizeValue = null) {
    const bits = normalizeBits(bitsValue, 'Bitstream');
    const candidates = [
      { method: 'identity', bits },
      { method: 'reverse entire bitstream', bits: reverseBits(bits) },
      { method: 'reverse byte order', bits: reverseByteOrder(bits) },
      { method: 'reverse bits inside each byte', bits: reverseBitsPerByte(bits) },
      { method: 'swap high/low nibbles', bits: nibbleSwap(bits) }
    ];
    for (let shift = 1; shift <= 7; shift += 1) candidates.push({ method: `rotate bits within each byte by ${shift}`, bits: rotateByteBits(bits, shift) });

    const gridSize = Number(gridSizeValue);
    if (Number.isInteger(gridSize) && gridSize >= 3 && gridSize <= MAX_GRID_SIZE_FOR_STRUCTURAL_ATTACK && bits.length % (gridSize * gridSize) === 0) {
      for (const transform of ['transpose', 'anti-transpose', 'rotate-90', 'rotate-180', 'rotate-270', 'mirror-horizontal', 'mirror-vertical', 'reverse-block-order', 'reverse-within-block']) {
        candidates.push({ method: `${gridSize}×${gridSize} blocks · ${transform}`, bits: transformBlocks(bits, gridSize, transform) });
      }
    }
    return candidates;
  }

  function distinctCandidates(candidates) {
    const seen = new Set();
    const result = [];
    for (const candidate of candidates) {
      if (seen.has(candidate.bits)) continue;
      seen.add(candidate.bits);
      result.push(candidate);
    }
    return result;
  }

  async function runAttackSuite(sourceValue, options = {}) {
    const source = sourceValue;
    if (!source?.bits) fail('Load a ciphertext source before running attacks.');
    const Runner = cooperativeRunner();
    const gridSize = Number(options.gridSize) || candidateGridSizes(source.bits.length, source.artifact)[0]?.gridSize || null;
    const crib = String(options.crib || '');
    const includeSingleByteXor = options.singleByteXor !== false;
    const resultLimit = clamp(Math.floor(Number(options.resultLimit) || DEFAULT_RESULT_LIMIT), 4, 100);
    const token = options.token || Runner?.createToken?.('Binary Cube decryption attack suite') || { cancelled: false };
    const onProgress = typeof options.onProgress === 'function' ? options.onProgress : null;
    const base = distinctCandidates(structuralCandidates(source.bits, gridSize));
    const scored = [];
    const totalSteps = base.length * (includeSingleByteXor ? 256 : 1);
    let completed = 0;

    function pushCandidate(method, bits) {
      const metrics = textScore(bits, crib);
      scored.push(Object.freeze({ method, bits, ...metrics }));
    }

    for (let baseIndex = 0; baseIndex < base.length; baseIndex += 1) {
      if (token.cancelled) fail(token.reason || 'Decryption attack suite cancelled.');
      const candidate = base[baseIndex];
      pushCandidate(candidate.method, candidate.bits);
      completed += 1;
      if (includeSingleByteXor) {
        const xorResults = [];
        const runRange = Runner?.forRange;
        const processKey = key => {
          if (key === 0) return;
          const xored = xorByte(candidate.bits, key);
          const metrics = textScore(xored, crib);
          xorResults.push({ method: `${candidate.method} → XOR 0x${key.toString(16).padStart(2, '0')}`, bits: xored, ...metrics });
        };
        if (runRange) {
          await runRange({
            start: 1,
            end: 256,
            chunkSize: 32,
            token,
            label: candidate.method,
            step: processKey,
            onProgress: progress => {
              if (onProgress) onProgress({ completed: completed + progress.completed, total: totalSteps, fraction: (completed + progress.completed) / totalSteps, label: `Testing ${candidate.method}` });
            }
          });
        } else {
          for (let key = 1; key < 256; key += 1) processKey(key);
        }
        xorResults.sort((left, right) => right.score - left.score || left.method.localeCompare(right.method));
        scored.push(...xorResults.slice(0, 3).map(Object.freeze));
        completed += 255;
      }
      if (onProgress) onProgress({ completed: Math.min(completed, totalSteps), total: totalSteps, fraction: Math.min(1, completed / totalSteps), label: `Completed ${candidate.method}` });
      if (Runner?.yieldControl) await Runner.yieldControl();
    }

    scored.sort((left, right) => right.score - left.score || right.printableFraction - left.printableFraction || left.method.localeCompare(right.method));
    return Object.freeze(scored.slice(0, resultLimit));
  }

  function compareSources(primaryValue, secondaryValue, gridSizeValue = null) {
    const primary = primaryValue;
    const secondary = secondaryValue;
    if (!primary?.bits || !secondary?.bits) fail('Both primary and comparison sources are required.');
    const length = Math.min(primary.bits.length, secondary.bits.length);
    let differing = 0;
    const xor = new Array(length);
    for (let index = 0; index < length; index += 1) {
      const different = primary.bits[index] !== secondary.bits[index];
      if (different) differing += 1;
      xor[index] = different ? '1' : '0';
    }
    const gridSize = Number(gridSizeValue);
    const cellCount = Number.isInteger(gridSize) && gridSize >= 3 ? gridSize * gridSize : null;
    const equalBlocks = [];
    if (cellCount && primary.bits.length === secondary.bits.length && primary.bits.length % cellCount === 0) {
      const blockCount = primary.bits.length / cellCount;
      for (let blockIndex = 0; blockIndex < blockCount; blockIndex += 1) {
        const start = blockIndex * cellCount;
        if (primary.bits.slice(start, start + cellCount) === secondary.bits.slice(start, start + cellCount)) equalBlocks.push(blockIndex);
      }
    }
    const xorBits = xor.join('');
    return Object.freeze({
      comparedBitLength: length,
      primaryBitLength: primary.bits.length,
      secondaryBitLength: secondary.bits.length,
      differingBits: differing,
      hammingFraction: length ? differing / length : 0,
      equalLength: primary.bits.length === secondary.bits.length,
      equalBlocks: Object.freeze(equalBlocks),
      xorBits,
      xorScore: xorBits ? textScore(xorBits) : null
    });
  }

  function knownKeyDecrypt(sourceValue, keyValue) {
    const Engine = canonicalEngine();
    if (!Engine?.decryptBinary) fail('The canonical Binary Cube engine is not loaded.');
    if (!sourceValue?.artifact) fail('Known-key verification requires a Binary Cube JSON package or secure export.');
    const key = Engine.validateKey(keyValue);
    let packageObject = sourceValue.artifact;
    if (packageObject.format === SECURE_EXPORT_FORMAT) {
      const SecureExport = root?.ShadowrunBinaryCubeSecureExport;
      if (!SecureExport?.expandSecureExport) fail('Secure-export expansion support is not loaded.');
      packageObject = SecureExport.expandSecureExport(packageObject, key, Engine);
    }
    const plaintextBits = Engine.decryptBinary(packageObject, key);
    return Object.freeze({
      keyId: key.keyId,
      bits: plaintextBits,
      bytes: bytesFromBits(plaintextBits),
      text: decodeText(bytesFromBits(plaintextBits)),
      score: textScore(plaintextBits)
    });
  }

  function metadataRows(metadata) {
    if (!metadata) return '<p class="bdd-muted">No Binary Cube package metadata was exposed by this input.</p>';
    const entries = Object.entries(metadata).filter(([, value]) => value !== null && value !== undefined && value !== '');
    return `<dl class="bdd-metadata">${entries.map(([key, value]) => `<div><dt>${esc(key)}</dt><dd>${esc(value)}</dd></div>`).join('')}</dl>`;
  }

  function formatPercent(value) { return `${(Number(value || 0) * 100).toFixed(2)}%`; }
  function formatEntropy(value) { return Number(value || 0).toFixed(4); }

  function renderSourceSummary() {
    if (!panel) return;
    const target = panel.querySelector('[data-bdd-source-summary]');
    const diagnosticsTarget = panel.querySelector('[data-bdd-diagnostics]');
    if (!activeSource) {
      if (target) target.innerHTML = '<p class="bdd-muted">No ciphertext loaded.</p>';
      if (diagnosticsTarget) diagnosticsTarget.innerHTML = '';
      return;
    }
    const gridField = panel.querySelector('#bdd-grid-size');
    const diagnostics = analyzeSource(activeSource, gridField?.value || null);
    if (gridField && !gridField.value && diagnostics.selectedGridSize) gridField.value = String(diagnostics.selectedGridSize);
    if (target) {
      target.innerHTML = `
        <div class="bdd-summary-grid">
          <div><span>Source</span><strong>${esc(activeSource.sourceName)}</strong></div>
          <div><span>Detected type</span><strong>${esc(activeSource.kind)}</strong></div>
          <div><span>Bits</span><strong>${diagnostics.bitLength.toLocaleString()}</strong></div>
          <div><span>Whole bytes</span><strong>${diagnostics.byteLength.toLocaleString()}</strong></div>
        </div>
        ${metadataRows(diagnostics.metadata)}`;
    }
    if (diagnosticsTarget) {
      const grids = diagnostics.candidateGridSizes.length
        ? diagnostics.candidateGridSizes.map(item => `<span class="bdd-chip">${item.gridSize}×${item.gridSize} · ${esc(item.source)}</span>`).join('')
        : '<span class="bdd-muted">No recommended square block divisor found.</span>';
      const correlations = diagnostics.strongestAutocorrelations.map(row => `<tr><td>${row.lag}</td><td>${formatPercent(row.matchRate)}</td><td>${formatPercent(Math.abs(row.matchRate - 0.5))}</td></tr>`).join('');
      const topBytes = diagnostics.topBytes.map(row => `<span class="bdd-chip">0x${row.byte.toString(16).padStart(2, '0')} × ${row.count}</span>`).join('');
      diagnosticsTarget.innerHTML = `
        <div class="bdd-metric-grid">
          <div><span>Byte entropy</span><strong>${formatEntropy(diagnostics.byteEntropy)} / 8</strong></div>
          <div><span>1-bit density</span><strong>${formatPercent(diagnostics.oneDensity)}</strong></div>
          <div><span>Index of coincidence</span><strong>${diagnostics.indexOfCoincidence.toFixed(6)}</strong></div>
          <div><span>Longest same-bit run</span><strong>${diagnostics.longestBitRun}</strong></div>
        </div>
        <div class="bdd-analysis-block"><h4>Likely cube block sizes</h4><div class="bdd-chip-row">${grids}</div></div>
        <div class="bdd-analysis-block"><h4>Most common bytes</h4><div class="bdd-chip-row">${topBytes || '<span class="bdd-muted">No complete bytes.</span>'}</div></div>
        <div class="bdd-analysis-block"><h4>Strongest bit autocorrelation lags</h4><div class="bdd-table-scroll"><table><thead><tr><th>Lag</th><th>Match rate</th><th>Deviation from random</th></tr></thead><tbody>${correlations}</tbody></table></div></div>`;
    }
    panel.querySelector('[data-bdd-run]').disabled = false;
    panel.querySelector('[data-bdd-known-key-run]').disabled = !activeSource.artifact;
  }

  function renderResults(resultsValue) {
    if (!panel) return;
    const target = panel.querySelector('[data-bdd-results]');
    const results = Array.from(resultsValue || []);
    activeResults = results;
    if (!target) return;
    if (!results.length) {
      target.innerHTML = '<p class="bdd-muted">No candidate results yet.</p>';
      return;
    }
    target.innerHTML = results.map((result, index) => `
      <article class="bdd-result" data-bdd-result-index="${index}">
        <div class="bdd-result-head"><div><span class="bdd-rank">#${index + 1}</span><strong>${esc(result.method)}</strong></div><span class="bdd-score">${result.score.toFixed(1)}</span></div>
        <div class="bdd-result-metrics"><span>Printable ${formatPercent(result.printableFraction)}</span><span>Entropy ${formatEntropy(result.entropy)}</span>${result.signature ? `<span>Signature ${esc(result.signature)}</span>` : ''}${result.cribHit ? '<span>Crib matched</span>' : ''}</div>
        <pre class="bdd-preview">${esc(result.preview || '(no text preview)')}</pre>
        <details><summary>Hex / bit preview</summary><code>${esc(result.hexPreview)}</code><code>${esc(result.bits.slice(0, 512))}${result.bits.length > 512 ? '…' : ''}</code></details>
        <div class="bdd-result-actions"><button type="button" data-bdd-copy="${index}">Copy text preview</button><button type="button" data-bdd-download="${index}">Save candidate bytes</button></div>
      </article>`).join('');
  }

  function setStatus(message, kind = '') {
    const node = panel?.querySelector('[data-bdd-status]');
    if (!node) return;
    node.textContent = message;
    node.dataset.kind = kind;
  }

  function updateProgress(progressValue) {
    const progress = progressValue || {};
    const meter = panel?.querySelector('[data-bdd-progress]');
    const label = panel?.querySelector('[data-bdd-progress-label]');
    if (meter) meter.value = clamp(Number(progress.fraction) || 0, 0, 1);
    if (label) label.textContent = `${progress.label || 'Working'} · ${Math.round((Number(progress.fraction) || 0) * 100)}%`;
  }

  function buildPanel() {
    if (!root?.document) fail('The Decryption Dashboard requires a browser document.');
    const existing = root.document.getElementById(PANEL_ID);
    if (existing) { panel = existing; return panel; }
    ensureStyle();
    panel = root.document.createElement('section');
    panel.id = PANEL_ID;
    panel.className = 'bdd-shell';
    panel.hidden = true;
    panel.setAttribute('aria-labelledby', 'bdd-title');
    panel.innerHTML = `
      <div class="bdd-backdrop" data-bdd-close></div>
      <div class="bdd-panel" role="dialog" aria-modal="true" aria-labelledby="bdd-title">
        <header class="bdd-header">
          <div><p class="bdd-eyebrow">Scientific Tools · Binary Cube Cryptanalysis</p><h2 id="bdd-title">Decryption Dashboard</h2><p>Offline analysis workbench for probing Binary Cube ciphertext, package metadata, block structure, reversible data manipulations, XOR hypotheses, and known-sample relationships. Candidate scores are evidence-ranking aids, not proof of successful decryption.</p></div>
          <button type="button" class="bdd-close" data-bdd-close aria-label="Close Decryption Dashboard">×</button>
        </header>
        <div class="bdd-body">
          <aside class="bdd-input-column">
            <section class="bdd-card"><h3>1 · Acquire ciphertext</h3>
              <label>Upload file<input id="bdd-file" type="file"></label>
              <label>Paste format<select id="bdd-input-mode"><option value="auto" selected>Auto detect</option><option value="json">Binary Cube JSON</option><option value="binary">Binary bits</option><option value="hex">Hex bytes</option><option value="base64">Base64</option><option value="text">Literal text bytes</option></select></label>
              <label>Paste source<textarea id="bdd-input" rows="9" spellcheck="false" placeholder="Paste a Binary Cube package, secure export, raw bitstream, hex, Base64, or byte-oriented text here."></textarea></label>
              <div class="bdd-actions"><button type="button" class="primary-action" data-bdd-load-paste>Load pasted input</button><button type="button" data-bdd-clear>Clear</button></div>
              <div data-bdd-source-summary><p class="bdd-muted">No ciphertext loaded.</p></div>
            </section>
            <section class="bdd-card"><h3>2 · Attack controls</h3>
              <label>Cube grid size<input id="bdd-grid-size" type="number" min="3" max="128" step="1" placeholder="Auto"></label>
              <label>Expected plaintext fragment / crib<input id="bdd-crib" type="text" autocomplete="off" placeholder="Optional known word or phrase"></label>
              <label class="bdd-check"><input id="bdd-single-byte-xor" type="checkbox" checked> Test all single-byte XOR values after each structural manipulation</label>
              <label>Maximum ranked candidates<input id="bdd-result-limit" type="number" min="4" max="100" step="1" value="24"></label>
              <div class="bdd-actions"><button type="button" class="primary-action" data-bdd-run disabled>Run attack suite</button><button type="button" data-bdd-cancel disabled>Cancel</button></div>
              <progress data-bdd-progress max="1" value="0"></progress><div class="bdd-progress-label" data-bdd-progress-label>Idle</div>
            </section>
            <section class="bdd-card"><h3>Known-key control</h3><p class="bdd-muted">Use the canonical engine as a calibration control. This does not count as breaking the cipher.</p>
              <label>Key JSON<textarea id="bdd-known-key" rows="7" spellcheck="false" placeholder="Optional canonical Binary Cube key JSON"></textarea></label>
              <button type="button" data-bdd-known-key-run disabled>Verify/decrypt with supplied key</button>
              <pre class="bdd-known-key-output" data-bdd-known-key-output></pre>
            </section>
          </aside>
          <main class="bdd-analysis-column">
            <section class="bdd-card"><div class="bdd-section-head"><h3>Structural diagnostics</h3><span class="bdd-local">Local processing only</span></div><div data-bdd-diagnostics></div></section>
            <section class="bdd-card"><h3>Comparison / differential probe</h3><p class="bdd-muted">Paste a second ciphertext to measure Hamming distance, identical cube blocks, and XOR difference. This is useful for repeated-key, known-plaintext, and chosen-sample experiments.</p>
              <label>Comparison source<textarea id="bdd-compare-input" rows="5" spellcheck="false" placeholder="Second Binary Cube package, bitstream, hex, or text sample"></textarea></label>
              <div class="bdd-actions"><button type="button" data-bdd-compare>Compare against primary</button></div><div data-bdd-compare-output></div>
            </section>
            <section class="bdd-card"><div class="bdd-section-head"><h3>Ranked candidate outputs</h3><span data-bdd-status role="status" aria-live="polite">Load ciphertext to begin.</span></div><div class="bdd-results" data-bdd-results><p class="bdd-muted">No candidate results yet.</p></div></section>
            <section class="bdd-boundary"><strong>Research boundary:</strong> this dashboard is purpose-built to stress-test the experimental Binary Cube system. It performs local statistical analysis and bounded reversible manipulations; it does not claim that a high-ranked candidate is plaintext, and it does not replace the canonical engine for authoritative decryption.</section>
          </main>
        </div>
      </div>`;
    root.document.body.appendChild(panel);
    bindPanel(panel);
    return panel;
  }

  async function copyText(value) {
    if (root?.navigator?.clipboard?.writeText) return root.navigator.clipboard.writeText(String(value ?? ''));
    const textarea = root.document.createElement('textarea');
    textarea.value = String(value ?? '');
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    root.document.body.appendChild(textarea);
    textarea.select();
    root.document.execCommand('copy');
    textarea.remove();
  }

  function downloadBytes(bitsValue, filename) {
    const bits = normalizeBits(bitsValue, 'Candidate');
    const bytes = bytesFromBits(bits);
    const blob = new Blob([bytes], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const link = root.document.createElement('a');
    link.href = url;
    link.download = String(filename || 'binary-cube-candidate.bin').replace(/[<>:"/\\|?*\u0000-\u001f]+/g, '-').slice(0, 140);
    root.document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function clearSession() {
    activeToken?.cancel?.('session cleared');
    activeToken = null;
    activeSource = null;
    activeResults = [];
    if (!panel) return;
    panel.querySelector('#bdd-input').value = '';
    panel.querySelector('#bdd-file').value = '';
    panel.querySelector('#bdd-grid-size').value = '';
    panel.querySelector('#bdd-crib').value = '';
    panel.querySelector('#bdd-compare-input').value = '';
    panel.querySelector('[data-bdd-compare-output]').innerHTML = '';
    panel.querySelector('[data-bdd-known-key-output]').textContent = '';
    panel.querySelector('[data-bdd-run]').disabled = true;
    panel.querySelector('[data-bdd-known-key-run]').disabled = true;
    renderSourceSummary();
    renderResults([]);
    updateProgress({ fraction: 0, label: 'Idle' });
    setStatus('Load ciphertext to begin.');
  }

  function setSource(sourceValue) {
    activeSource = sourceValue;
    activeResults = [];
    renderSourceSummary();
    renderResults([]);
    updateProgress({ fraction: 0, label: 'Ready' });
    setStatus(`Loaded ${sourceValue.sourceName}.`, 'success');
    return sourceValue;
  }

  async function readFile(file) {
    if (!file) fail('Select a file first.');
    const buffer = await file.arrayBuffer();
    return setSource(parseSourceBytes(new Uint8Array(buffer), file.name));
  }

  async function executeAttack() {
    if (!activeSource) fail('Load ciphertext first.');
    activeToken?.cancel?.('superseded by a new attack run');
    const Runner = cooperativeRunner();
    activeToken = Runner?.createToken?.('Binary Cube decryption attack suite') || { cancelled: false, cancel(reason) { this.cancelled = true; this.reason = reason; } };
    const runButton = panel.querySelector('[data-bdd-run]');
    const cancelButton = panel.querySelector('[data-bdd-cancel]');
    runButton.disabled = true;
    cancelButton.disabled = false;
    setStatus('Attack suite running…');
    try {
      const results = await runAttackSuite(activeSource, {
        gridSize: panel.querySelector('#bdd-grid-size').value,
        crib: panel.querySelector('#bdd-crib').value,
        singleByteXor: panel.querySelector('#bdd-single-byte-xor').checked,
        resultLimit: panel.querySelector('#bdd-result-limit').value,
        token: activeToken,
        onProgress: updateProgress
      });
      renderResults(results);
      updateProgress({ fraction: 1, label: 'Complete' });
      setStatus(`Attack suite complete · ${results.length} candidates retained.`, 'success');
    } catch (error) {
      if (activeToken?.cancelled) {
        setStatus(`Attack suite cancelled${activeToken.reason ? ` · ${activeToken.reason}` : ''}.`, 'warning');
      } else {
        setStatus(error.message, 'error');
        throw error;
      }
    } finally {
      runButton.disabled = !activeSource;
      cancelButton.disabled = true;
      activeToken = null;
    }
  }

  function runComparison() {
    if (!activeSource) fail('Load a primary ciphertext first.');
    const raw = panel.querySelector('#bdd-compare-input').value;
    if (!raw.trim()) fail('Paste a comparison source first.');
    const secondary = parseSourceText(raw, 'auto', 'comparison-sample');
    const comparison = compareSources(activeSource, secondary, panel.querySelector('#bdd-grid-size').value);
    const target = panel.querySelector('[data-bdd-compare-output]');
    target.innerHTML = `
      <div class="bdd-metric-grid"><div><span>Compared bits</span><strong>${comparison.comparedBitLength.toLocaleString()}</strong></div><div><span>Differing bits</span><strong>${comparison.differingBits.toLocaleString()}</strong></div><div><span>Hamming distance</span><strong>${formatPercent(comparison.hammingFraction)}</strong></div><div><span>Equal length</span><strong>${comparison.equalLength ? 'Yes' : 'No'}</strong></div></div>
      <p><strong>Identical aligned blocks:</strong> ${comparison.equalBlocks.length ? esc(comparison.equalBlocks.join(', ')) : 'none detected'}</p>
      <details><summary>XOR-difference preview</summary><code>${esc(comparison.xorBits.slice(0, 768))}${comparison.xorBits.length > 768 ? '…' : ''}</code></details>`;
    return comparison;
  }

  function runKnownKey() {
    if (!activeSource) fail('Load a Binary Cube artifact first.');
    const rawKey = panel.querySelector('#bdd-known-key').value.trim();
    if (!rawKey) fail('Paste a canonical Binary Cube key first.');
    let key;
    try { key = JSON.parse(rawKey); } catch (error) { fail(`Key JSON is invalid: ${error.message}`); }
    const result = knownKeyDecrypt(activeSource, key);
    panel.querySelector('[data-bdd-known-key-output]').textContent = `Key ${result.keyId}\n${result.text || '(binary plaintext; no printable UTF-8 preview)'}\n\nBits: ${result.bits.slice(0, 768)}${result.bits.length > 768 ? '…' : ''}`;
    setStatus('Known-key canonical decryption completed.', 'success');
    return result;
  }

  function bindPanel(target) {
    if (target.dataset.bddBound === 'true') return;
    target.dataset.bddBound = 'true';
    target.querySelectorAll('[data-bdd-close]').forEach(node => node.addEventListener('click', closePanel));
    target.querySelector('[data-bdd-load-paste]').addEventListener('click', () => {
      try { setSource(parseSourceText(target.querySelector('#bdd-input').value, target.querySelector('#bdd-input-mode').value, 'pasted-input')); }
      catch (error) { setStatus(error.message, 'error'); }
    });
    target.querySelector('#bdd-file').addEventListener('change', event => {
      const file = event.target.files?.[0];
      if (!file) return;
      void readFile(file).catch(error => setStatus(error.message, 'error'));
    });
    target.querySelector('[data-bdd-clear]').addEventListener('click', clearSession);
    target.querySelector('[data-bdd-run]').addEventListener('click', () => void executeAttack().catch(error => console.error(error)));
    target.querySelector('[data-bdd-cancel]').addEventListener('click', () => activeToken?.cancel?.('cancel requested by user'));
    target.querySelector('[data-bdd-compare]').addEventListener('click', () => { try { runComparison(); } catch (error) { setStatus(error.message, 'error'); } });
    target.querySelector('[data-bdd-known-key-run]').addEventListener('click', () => { try { runKnownKey(); } catch (error) { setStatus(error.message, 'error'); } });
    target.querySelector('#bdd-grid-size').addEventListener('change', renderSourceSummary);
    target.querySelector('[data-bdd-results]').addEventListener('click', event => {
      const copyButton = event.target.closest('[data-bdd-copy]');
      const downloadButton = event.target.closest('[data-bdd-download]');
      if (copyButton) {
        const result = activeResults[Number(copyButton.dataset.bddCopy)];
        if (result) void copyText(result.preview || '');
      }
      if (downloadButton) {
        const result = activeResults[Number(downloadButton.dataset.bddDownload)];
        if (result) downloadBytes(result.bits, `binary-cube-candidate-${Number(downloadButton.dataset.bddDownload) + 1}.bin`);
      }
    });
  }

  function openPanel(options = {}) {
    const target = buildPanel();
    target.hidden = false;
    root.document.body.classList.add('bdd-open');
    if (options.source?.bits) setSource(options.source);
    if (options.artifact) setSource(parseSourceText(JSON.stringify(options.artifact), 'json', options.sourceName || 'artifact'));
    return target;
  }

  function closePanel() {
    if (!panel) return;
    activeToken?.cancel?.('dashboard closed');
    panel.hidden = true;
    root?.document?.body?.classList.remove('bdd-open');
  }

  function currentState() {
    return Object.freeze({
      panelOpen: Boolean(panel && !panel.hidden),
      sourceLoaded: Boolean(activeSource),
      sourceKind: activeSource?.kind || null,
      sourceBitLength: activeSource?.bits?.length || 0,
      resultCount: activeResults.length,
      attackRunning: Boolean(activeToken && !activeToken.cancelled)
    });
  }

  return Object.freeze({
    openPanel,
    closePanel,
    currentState,
    setSource,
    parseSourceText,
    parseSourceBytes,
    analyzeSource,
    runAttackSuite,
    compareSources,
    knownKeyDecrypt,
    utilities: Object.freeze({
      bitsFromBytes,
      bytesFromBits,
      bytesFromHex,
      bytesFromBase64,
      textBytes,
      decodeText,
      shannonEntropy,
      indexOfCoincidence,
      bitDensity,
      longestRun,
      candidateGridSizes,
      autocorrelation,
      blockDiagnostics,
      reverseBitsPerByte,
      reverseByteOrder,
      nibbleSwap,
      rotateByteBits,
      xorByte,
      transformSquareBlock,
      transformBlocks,
      textScore,
      signatureForBytes
    }),
    constants: Object.freeze({
      PANEL_ID,
      SESSION_FORMAT,
      SESSION_SCHEMA_VERSION,
      PACKAGE_FORMAT,
      SECURE_EXPORT_FORMAT,
      MAX_INPUT_BITS,
      DEFAULT_RESULT_LIMIT,
      MAX_GRID_SIZE_FOR_STRUCTURAL_ATTACK
    })
  });
});
