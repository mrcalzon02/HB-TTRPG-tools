(function installBinaryCubeInformationAnalysisSuite(root, factory) {
  'use strict';
  const api = factory(root || globalThis);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.BinaryCubeInformationAnalysisSuite = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function createBinaryCubeInformationAnalysisSuite(root) {
  'use strict';

  const PANEL_ID = 'binary-cube-information-analysis-suite';
  const STYLE_ID = 'binary-cube-information-analysis-suite-style';
  const MAX_INPUT_BYTES = 2 * 1024 * 1024;
  const MAX_CANDIDATES = 80;
  const PAPER_TITLE = 'Language Trees and Zipping';
  const PAPER_YEAR = 2002;
  const PAPER_AUTHORS = 'D. Benedetto, E. Caglioti, V. Loreto';
  const MAURER_TITLE = 'A Universal Statistical Test for Random Bit Generators';
  const MAURER_YEAR = 1992;

  const REFERENCE_CORPORA = Object.freeze({
    english: `This reference passage is deliberately ordinary English prose. It contains recurring articles, prepositions, punctuation, word boundaries, and sentence structures so a compressor can learn patterns typical of readable English. The purpose is not to define meaning by vocabulary. It is to provide a modest statistical reference that unknown material can be compared against. Information that resembles natural language should usually reuse many short sequences and grammatical transitions, while uniformly random bytes should not exhibit the same compression affinity.`,
    spanish: `Este pasaje de referencia contiene prosa española ordinaria, con artículos, preposiciones, puntuación y estructuras de oración repetidas. Su propósito no es decidir el significado de un mensaje, sino ofrecer un cuerpo estadístico pequeño para comparar datos desconocidos. Un texto legible suele reutilizar secuencias de letras y palabras de una manera que un compresor puede aprender.`,
    french: `Ce passage de référence contient une prose française ordinaire avec des articles, des prépositions, de la ponctuation et des structures de phrase répétées. Son rôle n'est pas de prouver la signification d'un message mais de fournir un échantillon statistique permettant de comparer des données inconnues. Un texte lisible réutilise généralement des motifs qu'un compresseur peut apprendre.`,
    german: `Dieser Referenzabschnitt enthält gewöhnliche deutsche Prosa mit Artikeln, Präpositionen, Satzzeichen und wiederkehrenden Satzstrukturen. Er soll nicht die Bedeutung einer Nachricht beweisen, sondern eine kleine statistische Vergleichsbasis für unbekannte Daten liefern. Lesbarer Text verwendet häufig wiederkehrende Muster, die ein Kompressor lernen kann.`,
    json: `{"type":"reference","records":[{"id":1,"name":"alpha","enabled":true},{"id":2,"name":"beta","enabled":false}],"metadata":{"version":1,"description":"structured machine-readable data with repeated keys and punctuation"}}`,
    source: `function referenceExample(input) { const values = Array.from(input || []); return values.map((value, index) => ({ index, value, valid: value !== null })); } // source code repeats identifiers, punctuation, operators, braces, keywords, whitespace, and syntactic forms.`
  });

  const FILE_SIGNATURES = Object.freeze([
    { label: 'PDF', bytes: [0x25, 0x50, 0x44, 0x46] },
    { label: 'ZIP / OOXML / JAR', bytes: [0x50, 0x4b, 0x03, 0x04] },
    { label: 'PNG', bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
    { label: 'JPEG', bytes: [0xff, 0xd8, 0xff] },
    { label: 'GIF87/89', bytes: [0x47, 0x49, 0x46, 0x38] },
    { label: 'GZIP', bytes: [0x1f, 0x8b] },
    { label: 'BZIP2', bytes: [0x42, 0x5a, 0x68] },
    { label: 'XZ', bytes: [0xfd, 0x37, 0x7a, 0x58, 0x5a, 0x00] },
    { label: '7-Zip', bytes: [0x37, 0x7a, 0xbc, 0xaf, 0x27, 0x1c] },
    { label: 'RAR', bytes: [0x52, 0x61, 0x72, 0x21, 0x1a, 0x07] },
    { label: 'ELF', bytes: [0x7f, 0x45, 0x4c, 0x46] },
    { label: 'PE / DOS executable', bytes: [0x4d, 0x5a] },
    { label: 'SQLite', bytes: [0x53, 0x51, 0x4c, 0x69, 0x74, 0x65, 0x20, 0x66, 0x6f, 0x72, 0x6d, 0x61, 0x74, 0x20, 0x33, 0x00] },
    { label: 'WASM', bytes: [0x00, 0x61, 0x73, 0x6d] },
    { label: 'Mach-O 64-bit', bytes: [0xcf, 0xfa, 0xed, 0xfe] },
    { label: 'Mach-O 32-bit', bytes: [0xce, 0xfa, 0xed, 0xfe] }
  ]);

  const ENGLISH_FREQ = Object.freeze({
    ' ': 0.182, e: 0.102, t: 0.075, a: 0.065, o: 0.061, n: 0.057, i: 0.056, s: 0.053, r: 0.049, h: 0.049,
    l: 0.033, d: 0.033, u: 0.022, c: 0.022, m: 0.020, f: 0.018, w: 0.017, g: 0.016, p: 0.015, y: 0.014,
    b: 0.012, v: 0.008, k: 0.006, x: 0.0015, j: 0.001, q: 0.001, z: 0.0007
  });
  const COMMON_NGRAMS = Object.freeze([' th', 'the', 'he ', 'ing', 'ion', 'and', ' of', 'to ', ' in', 'er ', 're ', 'ed ', 'is ', 'it ', 'ou', 'ea', 'en', 'at', 'on', 'or']);
  const MAURER_EXPECTED = Object.freeze({
    6: 5.2177052, 7: 6.1962507, 8: 7.1836656, 9: 8.1764248, 10: 9.1723243,
    11: 10.170032, 12: 11.168765, 13: 12.168070, 14: 13.167693, 15: 14.167488, 16: 15.167379
  });

  let panel = null;
  let activeBytes = null;
  let activeName = '';
  let activeToken = null;
  let activeCandidates = [];

  const clamp = (value, minimum, maximum) => Math.max(minimum, Math.min(maximum, value));
  const esc = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));

  function fail(message) { throw new Error(message); }

  function asBytes(value) {
    if (value instanceof Uint8Array) return value;
    if (value instanceof ArrayBuffer) return new Uint8Array(value);
    if (ArrayBuffer.isView(value)) return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
    return Uint8Array.from(value || []);
  }

  function concatBytes(...parts) {
    const arrays = parts.map(asBytes);
    const length = arrays.reduce((sum, bytes) => sum + bytes.length, 0);
    const output = new Uint8Array(length);
    let offset = 0;
    for (const bytes of arrays) { output.set(bytes, offset); offset += bytes.length; }
    return output;
  }

  function textToBytes(value) {
    const text = String(value ?? '');
    if (typeof TextEncoder !== 'undefined') return new TextEncoder().encode(text);
    return Uint8Array.from(unescape(encodeURIComponent(text)), character => character.charCodeAt(0));
  }

  function bytesToText(value, encoding = 'utf-8') {
    const bytes = asBytes(value);
    if (typeof TextDecoder !== 'undefined') {
      try { return new TextDecoder(encoding, { fatal: false }).decode(bytes); } catch (_) { /* fallback */ }
    }
    return Array.from(bytes, byte => byte >= 32 && byte <= 126 || byte === 9 || byte === 10 || byte === 13 ? String.fromCharCode(byte) : '�').join('');
  }

  function bytesToHex(value) { return Array.from(asBytes(value), byte => byte.toString(16).padStart(2, '0')).join(''); }
  function bitsFromBytes(value) { return Array.from(asBytes(value), byte => byte.toString(2).padStart(8, '0')).join(''); }

  function bytesFromBits(value) {
    const bits = String(value ?? '').replace(/\s+/g, '');
    if (!bits || /[^01]/.test(bits)) fail('Binary input must contain only 0, 1, and whitespace.');
    const count = Math.floor(bits.length / 8);
    const bytes = new Uint8Array(count);
    for (let index = 0; index < count; index += 1) bytes[index] = parseInt(bits.slice(index * 8, index * 8 + 8), 2);
    return bytes;
  }

  function bytesFromHex(value) {
    const compact = String(value ?? '').replace(/0x/gi, '').replace(/[\s:_-]+/g, '');
    if (!compact || compact.length % 2 || /[^0-9a-f]/i.test(compact)) fail('Hex input must contain complete hexadecimal bytes.');
    const bytes = new Uint8Array(compact.length / 2);
    for (let index = 0; index < bytes.length; index += 1) bytes[index] = parseInt(compact.slice(index * 2, index * 2 + 2), 16);
    return bytes;
  }

  function bytesFromBase64(value) {
    const compact = String(value ?? '').replace(/\s+/g, '');
    if (!compact) fail('Base64 input is empty.');
    if (typeof root?.atob === 'function') {
      const binary = root.atob(compact);
      return Uint8Array.from(binary, character => character.charCodeAt(0) & 0xff);
    }
    if (typeof Buffer !== 'undefined') return Uint8Array.from(Buffer.from(compact, 'base64'));
    fail('Base64 decoding is unavailable.');
  }

  function parseFlexibleInput(value, mode = 'auto') {
    const raw = String(value ?? '');
    const selected = String(mode || 'auto');
    if (!raw.trim()) fail('Input is empty.');
    if (selected === 'binary') return bytesFromBits(raw);
    if (selected === 'hex') return bytesFromHex(raw);
    if (selected === 'base64') return bytesFromBase64(raw);
    if (selected === 'text') return textToBytes(raw);
    if (selected === 'auto') {
      const compact = raw.replace(/\s+/g, '');
      if (compact.length >= 16 && !/[^01]/.test(compact)) return bytesFromBits(raw);
      const hex = raw.replace(/0x/gi, '').replace(/[\s:_-]+/g, '');
      if (hex.length >= 8 && hex.length % 2 === 0 && !/[^0-9a-f]/i.test(hex)) return bytesFromHex(raw);
      if (/^[A-Za-z0-9+/]+={0,2}$/.test(compact) && compact.length >= 16 && compact.length % 4 === 0) {
        try { return bytesFromBase64(compact); } catch (_) { /* text fallback */ }
      }
    }
    return textToBytes(raw);
  }

  function histogram(value) {
    const counts = new Uint32Array(256);
    for (const byte of asBytes(value)) counts[byte] += 1;
    return counts;
  }

  function shannonEntropy(value) {
    const bytes = asBytes(value);
    if (!bytes.length) return 0;
    const counts = histogram(bytes);
    let entropy = 0;
    for (const count of counts) if (count) { const p = count / bytes.length; entropy -= p * Math.log2(p); }
    return entropy;
  }

  function minEntropy(value) {
    const bytes = asBytes(value);
    if (!bytes.length) return 0;
    const counts = histogram(bytes);
    let max = 0;
    for (const count of counts) if (count > max) max = count;
    return -Math.log2(max / bytes.length);
  }

  function chiSquareUniformity(value) {
    const bytes = asBytes(value);
    if (!bytes.length) return 0;
    const expected = bytes.length / 256;
    const counts = histogram(bytes);
    let statistic = 0;
    for (const count of counts) { const delta = count - expected; statistic += delta * delta / expected; }
    return statistic;
  }

  function indexOfCoincidence(value) {
    const bytes = asBytes(value);
    if (bytes.length < 2) return 0;
    const counts = histogram(bytes);
    let numerator = 0;
    for (const count of counts) numerator += count * (count - 1);
    return numerator / (bytes.length * (bytes.length - 1));
  }

  function serialCorrelation(value, lag = 1) {
    const bytes = asBytes(value);
    const distance = Math.max(1, Math.floor(Number(lag) || 1));
    const count = bytes.length - distance;
    if (count < 2) return 0;
    let meanA = 0;
    let meanB = 0;
    for (let i = 0; i < count; i += 1) { meanA += bytes[i]; meanB += bytes[i + distance]; }
    meanA /= count; meanB /= count;
    let covariance = 0;
    let varianceA = 0;
    let varianceB = 0;
    for (let i = 0; i < count; i += 1) {
      const a = bytes[i] - meanA;
      const b = bytes[i + distance] - meanB;
      covariance += a * b; varianceA += a * a; varianceB += b * b;
    }
    return varianceA && varianceB ? covariance / Math.sqrt(varianceA * varianceB) : 0;
  }

  function runsTestBits(value) {
    const bits = typeof value === 'string' ? value.replace(/\s+/g, '') : bitsFromBytes(value);
    if (bits.length < 2) return Object.freeze({ runs: bits.length, expected: bits.length, z: 0, oneFraction: bits === '1' ? 1 : 0 });
    let ones = 0;
    let runs = 1;
    for (let index = 0; index < bits.length; index += 1) {
      if (bits[index] === '1') ones += 1;
      if (index && bits[index] !== bits[index - 1]) runs += 1;
    }
    const n = bits.length;
    const p = ones / n;
    const expected = 1 + 2 * n * p * (1 - p);
    const variance = n > 1 ? (2 * n * p * (1 - p) * (2 * n * p * (1 - p) - 1)) / (n - 1) : 0;
    const z = variance > 0 ? (runs - expected) / Math.sqrt(variance) : 0;
    return Object.freeze({ runs, expected, z, oneFraction: p });
  }

  function ngramEntropy(value, order = 2) {
    const bytes = asBytes(value);
    const n = Math.max(1, Math.min(4, Math.floor(Number(order) || 1)));
    const total = bytes.length - n + 1;
    if (total <= 0) return 0;
    const counts = new Map();
    for (let index = 0; index < total; index += 1) {
      let key = '';
      for (let offset = 0; offset < n; offset += 1) key += String.fromCharCode(bytes[index + offset]);
      counts.set(key, (counts.get(key) || 0) + 1);
    }
    let entropy = 0;
    for (const count of counts.values()) { const p = count / total; entropy -= p * Math.log2(p); }
    return entropy / n;
  }

  function mutualInformationLag(value, lag = 1) {
    const bytes = asBytes(value);
    const distance = Math.max(1, Math.floor(Number(lag) || 1));
    const total = bytes.length - distance;
    if (total < 2) return 0;
    const first = new Uint32Array(256);
    const second = new Uint32Array(256);
    const pairs = new Map();
    for (let i = 0; i < total; i += 1) {
      const a = bytes[i]; const b = bytes[i + distance];
      first[a] += 1; second[b] += 1;
      const key = a * 256 + b;
      pairs.set(key, (pairs.get(key) || 0) + 1);
    }
    let mi = 0;
    for (const [key, count] of pairs) {
      const a = Math.floor(key / 256); const b = key % 256;
      const pxy = count / total;
      const px = first[a] / total; const py = second[b] / total;
      mi += pxy * Math.log2(pxy / (px * py));
    }
    return mi;
  }

  function slidingEntropy(value, windowSize = 256, stepSize = 128) {
    const bytes = asBytes(value);
    const window = Math.max(32, Math.floor(Number(windowSize) || 256));
    const step = Math.max(16, Math.floor(Number(stepSize) || Math.floor(window / 2)));
    const rows = [];
    for (let offset = 0; offset < bytes.length; offset += step) {
      const slice = bytes.slice(offset, Math.min(bytes.length, offset + window));
      if (slice.length < Math.min(32, window)) break;
      rows.push(Object.freeze({ offset, length: slice.length, entropy: shannonEntropy(slice) }));
    }
    return Object.freeze(rows);
  }

  function maurerUniversal(value, blockLengthValue = null) {
    const bits = typeof value === 'string' ? value.replace(/\s+/g, '') : bitsFromBytes(value);
    if (!bits || /[^01]/.test(bits)) fail('Maurer analysis requires binary data.');
    let L = Number(blockLengthValue);
    if (!Number.isInteger(L)) {
      L = bits.length >= 16 * (10 * 65536 + 1000) ? 16 : bits.length >= 8 * (10 * 256 + 1000) ? 8 : bits.length >= 6 * (10 * 64 + 400) ? 6 : Math.max(3, Math.min(5, Math.floor(Math.log2(Math.max(8, bits.length / 64)))));
    }
    L = clamp(L, 3, 16);
    const blockCount = Math.floor(bits.length / L);
    const Q = Math.min(Math.floor(blockCount / 3), 10 * (2 ** L));
    const K = blockCount - Q;
    if (Q < 4 || K < 4) return Object.freeze({ blockLength: L, initializationBlocks: Q, testBlocks: K, statistic: null, expected: MAURER_EXPECTED[L] || null, deviation: null, note: 'Sample too short for a useful return-distance statistic.' });
    const table = new Int32Array(2 ** L);
    function blockAt(index) { return parseInt(bits.slice(index * L, index * L + L), 2); }
    for (let index = 0; index < Q; index += 1) table[blockAt(index)] = index + 1;
    let sum = 0;
    for (let index = Q; index < Q + K; index += 1) {
      const symbol = blockAt(index);
      const previous = table[symbol];
      const distance = index + 1 - previous;
      table[symbol] = index + 1;
      sum += Math.log2(Math.max(1, distance));
    }
    const statistic = sum / K;
    const expected = MAURER_EXPECTED[L] || null;
    return Object.freeze({
      blockLength: L,
      initializationBlocks: Q,
      testBlocks: K,
      statistic,
      expected,
      deviation: expected === null ? null : statistic - expected,
      note: expected === null ? 'Return-distance statistic only; no tabulated reference value for this block length.' : 'Compare the statistic with the tabulated random-source expectation; this dashboard does not present it as a formal p-value.'
    });
  }

  function lz78PhraseCount(value) {
    const bytes = asBytes(value);
    const dictionary = new Set();
    let phrase = '';
    let count = 0;
    for (const byte of bytes) {
      const next = `${phrase}${String.fromCharCode(byte)}`;
      if (dictionary.has(next)) phrase = next;
      else { dictionary.add(next); count += 1; phrase = ''; }
    }
    if (phrase) count += 1;
    return count;
  }

  function lzComplexityRatio(value) {
    const bytes = asBytes(value);
    if (!bytes.length) return 0;
    const phrases = lz78PhraseCount(bytes);
    const normalization = bytes.length / Math.max(1, Math.log2(bytes.length + 1));
    return phrases / Math.max(1, normalization);
  }

  async function gzipLength(value) {
    const bytes = asBytes(value);
    if (!bytes.length) return 0;
    if (typeof CompressionStream !== 'undefined') {
      const stream = new Blob([bytes]).stream().pipeThrough(new CompressionStream('gzip'));
      const compressed = await new Response(stream).arrayBuffer();
      return compressed.byteLength;
    }
    const phrases = lz78PhraseCount(bytes);
    return Math.ceil(18 + phrases * Math.max(2, Math.log2(Math.max(2, phrases))) / 8);
  }

  async function normalizedCompressionDistance(leftValue, rightValue) {
    const left = asBytes(leftValue); const right = asBytes(rightValue);
    const [cl, cr, clr] = await Promise.all([gzipLength(left), gzipLength(right), gzipLength(concatBytes(left, right))]);
    const denominator = Math.max(cl, cr, 1);
    return Object.freeze({ distance: (clr - Math.min(cl, cr)) / denominator, leftCompressed: cl, rightCompressed: cr, joinedCompressed: clr });
  }

  async function bclRelativeEntropy(referenceValue, candidateValue) {
    const A = asBytes(referenceValue);
    const candidate = asBytes(candidateValue);
    if (candidate.length < 48) return Object.freeze({ available: false, reason: 'Candidate is too short for a useful BCL split.', relativeEntropyPerByte: null });
    const bLength = clamp(Math.floor(candidate.length * 0.2), 32, Math.min(2048, Math.max(32, candidate.length - 16)));
    const split = candidate.length - bLength;
    const B = candidate.slice(0, split);
    const b = candidate.slice(split);
    const [la, lab, lb, lbb] = await Promise.all([
      gzipLength(A), gzipLength(concatBytes(A, b)), gzipLength(B), gzipLength(concatBytes(B, b))
    ]);
    const deltaAb = lab - la;
    const deltaBb = lbb - lb;
    return Object.freeze({
      available: true,
      referenceBytes: A.length,
      candidateTrainingBytes: B.length,
      probeBytes: b.length,
      deltaReferenceProbe: deltaAb,
      deltaCandidateProbe: deltaBb,
      relativeEntropyPerByte: (deltaAb - deltaBb) / Math.max(1, b.length),
      method: 'Benedetto–Caglioti–Loreto compression-relative-entropy estimator'
    });
  }

  function utf8Validity(value) {
    const bytes = asBytes(value);
    if (!bytes.length) return 0;
    let valid = 0; let index = 0;
    while (index < bytes.length) {
      const byte = bytes[index];
      if (byte <= 0x7f) { valid += 1; index += 1; continue; }
      let continuation = 0;
      if (byte >= 0xc2 && byte <= 0xdf) continuation = 1;
      else if (byte >= 0xe0 && byte <= 0xef) continuation = 2;
      else if (byte >= 0xf0 && byte <= 0xf4) continuation = 3;
      else { index += 1; continue; }
      let ok = index + continuation < bytes.length;
      for (let j = 1; ok && j <= continuation; j += 1) ok = bytes[index + j] >= 0x80 && bytes[index + j] <= 0xbf;
      if (ok) { valid += continuation + 1; index += continuation + 1; } else index += 1;
    }
    return valid / bytes.length;
  }

  function printableFraction(value) {
    const bytes = asBytes(value);
    if (!bytes.length) return 0;
    let count = 0;
    for (const byte of bytes) if ((byte >= 32 && byte <= 126) || byte === 9 || byte === 10 || byte === 13) count += 1;
    return count / bytes.length;
  }

  function languageScore(value) {
    const text = bytesToText(value).toLowerCase();
    const bytes = asBytes(value);
    if (!bytes.length) return 0;
    let score = printableFraction(bytes) * 40 + utf8Validity(bytes) * 10;
    let observed = 0;
    let expected = 0;
    const counts = new Map();
    for (const character of text) counts.set(character, (counts.get(character) || 0) + 1);
    for (const [character, probability] of Object.entries(ENGLISH_FREQ)) {
      const actual = (counts.get(character) || 0) / Math.max(1, text.length);
      observed += Math.abs(actual - probability);
      expected += probability;
    }
    score += clamp((1 - observed / Math.max(0.01, expected)) * 25, 0, 25);
    let hits = 0;
    for (const token of COMMON_NGRAMS) if (text.includes(token)) hits += 1;
    score += Math.min(25, hits * 2.2);
    return clamp(score, 0, 100);
  }

  function fileSignatures(value) {
    const bytes = asBytes(value);
    const matches = [];
    for (const signature of FILE_SIGNATURES) {
      const limit = Math.max(0, bytes.length - signature.bytes.length);
      for (let offset = 0; offset <= limit; offset += 1) {
        let match = true;
        for (let index = 0; index < signature.bytes.length; index += 1) if (bytes[offset + index] !== signature.bytes[index]) { match = false; break; }
        if (match) { matches.push(Object.freeze({ label: signature.label, offset })); break; }
      }
    }
    const text = bytesToText(bytes.slice(0, Math.min(bytes.length, 8192))).trimStart();
    if (text.startsWith('{') || text.startsWith('[')) {
      try { JSON.parse(text); matches.push(Object.freeze({ label: 'JSON', offset: 0 })); } catch (_) { /* not proven JSON */ }
    }
    if (/^<\?xml|^<!doctype|^<html/i.test(text)) matches.push(Object.freeze({ label: 'XML / HTML-like', offset: 0 }));
    return Object.freeze(matches);
  }

  function stringCarve(value, minimumLength = 5) {
    const bytes = asBytes(value);
    const minimum = Math.max(3, Math.floor(Number(minimumLength) || 5));
    const strings = [];
    let start = -1;
    for (let index = 0; index <= bytes.length; index += 1) {
      const byte = bytes[index];
      const printable = index < bytes.length && ((byte >= 32 && byte <= 126) || byte === 9);
      if (printable && start < 0) start = index;
      if ((!printable || index === bytes.length) && start >= 0) {
        if (index - start >= minimum) strings.push(Object.freeze({ encoding: 'ASCII', offset: start, text: bytesToText(bytes.slice(start, index)) }));
        start = -1;
      }
    }
    for (const littleEndian of [true, false]) {
      let run = [];
      let runOffset = 0;
      for (let index = 0; index + 1 < bytes.length; index += 2) {
        const code = littleEndian ? bytes[index] | (bytes[index + 1] << 8) : (bytes[index] << 8) | bytes[index + 1];
        const printable = (code >= 32 && code <= 126) || code === 9;
        if (printable) { if (!run.length) runOffset = index; run.push(String.fromCharCode(code)); }
        else { if (run.length >= minimum) strings.push(Object.freeze({ encoding: littleEndian ? 'UTF-16LE' : 'UTF-16BE', offset: runOffset, text: run.join('') })); run = []; }
      }
      if (run.length >= minimum) strings.push(Object.freeze({ encoding: littleEndian ? 'UTF-16LE' : 'UTF-16BE', offset: runOffset, text: run.join('') }));
    }
    return Object.freeze(strings.slice(0, 250));
  }

  function reverseBytes(value) { return Uint8Array.from(Array.from(asBytes(value)).reverse()); }
  function reverseBitsByte(byte) { let value = byte; let output = 0; for (let i = 0; i < 8; i += 1) { output = (output << 1) | (value & 1); value >>>= 1; } return output; }
  function reverseBitsPerByte(value) { return Uint8Array.from(asBytes(value), reverseBitsByte); }
  function nibbleSwap(value) { return Uint8Array.from(asBytes(value), byte => ((byte & 0x0f) << 4) | ((byte & 0xf0) >>> 4)); }
  function rotateBitsPerByte(value, shiftValue) {
    const shift = ((Number(shiftValue) || 0) % 8 + 8) % 8;
    return Uint8Array.from(asBytes(value), byte => shift ? ((byte >>> shift) | (byte << (8 - shift))) & 0xff : byte);
  }
  function xorByte(value, keyValue) { const key = Number(keyValue) & 0xff; return Uint8Array.from(asBytes(value), byte => byte ^ key); }

  function swapWordEndian(value, wordSizeValue) {
    const bytes = asBytes(value); const size = Math.max(2, Math.floor(Number(wordSizeValue) || 2));
    const output = new Uint8Array(bytes.length);
    for (let offset = 0; offset < bytes.length; offset += size) {
      const end = Math.min(bytes.length, offset + size);
      for (let index = offset; index < end; index += 1) output[index] = bytes[end - 1 - (index - offset)];
    }
    return output;
  }

  function adjacentXorDecode(value) {
    const bytes = asBytes(value); const output = new Uint8Array(bytes.length);
    if (!bytes.length) return output;
    output[0] = bytes[0];
    for (let index = 1; index < bytes.length; index += 1) output[index] = bytes[index] ^ bytes[index - 1];
    return output;
  }

  function cumulativeXorDecode(value) {
    const bytes = asBytes(value); const output = new Uint8Array(bytes.length); let accumulator = 0;
    for (let index = 0; index < bytes.length; index += 1) { accumulator ^= bytes[index]; output[index] = accumulator; }
    return output;
  }

  function deltaAddDecode(value) {
    const bytes = asBytes(value); const output = new Uint8Array(bytes.length); let accumulator = 0;
    for (let index = 0; index < bytes.length; index += 1) { accumulator = (accumulator + bytes[index]) & 0xff; output[index] = accumulator; }
    return output;
  }

  function deltaSubtractDecode(value) {
    const bytes = asBytes(value); const output = new Uint8Array(bytes.length);
    if (!bytes.length) return output;
    output[0] = bytes[0];
    for (let index = 1; index < bytes.length; index += 1) output[index] = (bytes[index] - bytes[index - 1] + 256) & 0xff;
    return output;
  }

  function deinterleave(value, parityFirst = 0) {
    const bytes = asBytes(value); const output = [];
    for (const parity of [parityFirst & 1, 1 - (parityFirst & 1)]) for (let index = parity; index < bytes.length; index += 2) output.push(bytes[index]);
    return Uint8Array.from(output);
  }

  function bitPlane(value, bitIndex) {
    const bytes = asBytes(value); const bit = clamp(Math.floor(Number(bitIndex) || 0), 0, 7);
    const bits = [];
    for (const byte of bytes) bits.push((byte >>> bit) & 1);
    const output = new Uint8Array(Math.floor(bits.length / 8));
    for (let index = 0; index < output.length; index += 1) {
      let byte = 0;
      for (let offset = 0; offset < 8; offset += 1) byte = (byte << 1) | bits[index * 8 + offset];
      output[index] = byte;
    }
    return output;
  }

  function columnarTranspose(value, widthValue, inverse = false) {
    const bytes = asBytes(value); const width = clamp(Math.floor(Number(widthValue) || 2), 2, 64);
    const rows = Math.ceil(bytes.length / width); const output = [];
    if (!inverse) {
      for (let column = 0; column < width; column += 1) for (let row = 0; row < rows; row += 1) { const index = row * width + column; if (index < bytes.length) output.push(bytes[index]); }
    } else {
      const columnLengths = new Array(width).fill(Math.floor(bytes.length / width));
      for (let column = 0; column < bytes.length % width; column += 1) columnLengths[column] += 1;
      const columns = []; let cursor = 0;
      for (let column = 0; column < width; column += 1) { columns.push(bytes.slice(cursor, cursor + columnLengths[column])); cursor += columnLengths[column]; }
      for (let row = 0; row < rows; row += 1) for (let column = 0; column < width; column += 1) if (row < columns[column].length) output.push(columns[column][row]);
    }
    return Uint8Array.from(output);
  }

  function strideExtract(value, strideValue, offsetValue = 0) {
    const bytes = asBytes(value); const stride = clamp(Math.floor(Number(strideValue) || 2), 2, 64); const offset = clamp(Math.floor(Number(offsetValue) || 0), 0, stride - 1);
    const output = [];
    for (let index = offset; index < bytes.length; index += stride) output.push(bytes[index]);
    return Uint8Array.from(output);
  }

  function rot13Text(value) {
    return String(value ?? '').replace(/[A-Za-z]/g, character => String.fromCharCode((character <= 'Z' ? 65 : 97) + (character.charCodeAt(0) - (character <= 'Z' ? 65 : 97) + 13) % 26));
  }
  function atbashText(value) {
    return String(value ?? '').replace(/[A-Za-z]/g, character => {
      const base = character <= 'Z' ? 65 : 97; return String.fromCharCode(base + 25 - (character.charCodeAt(0) - base));
    });
  }
  function caesarText(value, shiftValue) {
    const shift = ((Number(shiftValue) || 0) % 26 + 26) % 26;
    return String(value ?? '').replace(/[A-Za-z]/g, character => {
      const base = character <= 'Z' ? 65 : 97; return String.fromCharCode(base + (character.charCodeAt(0) - base + shift) % 26);
    });
  }
  function rot47Text(value) { return String(value ?? '').replace(/[!-~]/g, character => String.fromCharCode(33 + (character.charCodeAt(0) - 33 + 47) % 94)); }

  function base32Decode(value) {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    const compact = String(value ?? '').toUpperCase().replace(/=+$/g, '').replace(/\s+/g, '');
    if (!compact || /[^A-Z2-7]/.test(compact)) fail('Not valid RFC 4648 Base32 text.');
    let buffer = 0; let bits = 0; const output = [];
    for (const character of compact) {
      buffer = (buffer << 5) | alphabet.indexOf(character); bits += 5;
      while (bits >= 8) { bits -= 8; output.push((buffer >>> bits) & 0xff); buffer &= (1 << bits) - 1; }
    }
    return Uint8Array.from(output);
  }

  function decodeEscapes(value) {
    return String(value ?? '')
      .replace(/\\x([0-9a-f]{2})/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
      .replace(/\\u([0-9a-f]{4})/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
      .replace(/\\n/g, '\n').replace(/\\r/g, '\r').replace(/\\t/g, '\t').replace(/\\\\/g, '\\');
  }

  function decodeHtmlEntities(value) {
    return String(value ?? '').replace(/&#(x?[0-9a-f]+);/gi, (_, code) => String.fromCodePoint(code[0].toLowerCase() === 'x' ? parseInt(code.slice(1), 16) : parseInt(code, 10)))
      .replace(/&lt;/gi, '<').replace(/&gt;/gi, '>').replace(/&amp;/gi, '&').replace(/&quot;/gi, '"').replace(/&#39;/gi, "'");
  }

  function detectEncodingLayers(value) {
    const text = String(value ?? '').trim();
    const layers = [];
    const compact = text.replace(/\s+/g, '');
    if (compact.length >= 8 && compact.length % 2 === 0 && !/[^0-9a-f]/i.test(compact)) layers.push('hex');
    if (compact.length >= 8 && compact.length % 4 === 0 && /^[A-Za-z0-9+/]+={0,2}$/.test(compact)) layers.push('base64');
    if (compact.length >= 8 && /^[A-Z2-7]+=*$/i.test(compact)) layers.push('base32');
    if (/%[0-9a-f]{2}/i.test(text)) layers.push('percent-encoding');
    if (/\\x[0-9a-f]{2}|\\u[0-9a-f]{4}/i.test(text)) layers.push('escaped-bytes');
    if (/&(?:#x?[0-9a-f]+|lt|gt|amp|quot);/i.test(text)) layers.push('html-entities');
    return Object.freeze(layers);
  }

  async function recursivePeel(value, maximumDepth = 6) {
    let bytes = asBytes(value); const chain = [];
    for (let depth = 0; depth < maximumDepth; depth += 1) {
      const text = bytesToText(bytes).trim();
      const layers = detectEncodingLayers(text);
      let next = null; let method = '';
      try {
        if (layers.includes('hex')) { next = bytesFromHex(text); method = 'hex decode'; }
        else if (layers.includes('base64')) { next = bytesFromBase64(text); method = 'Base64 decode'; }
        else if (layers.includes('base32')) { next = base32Decode(text); method = 'Base32 decode'; }
        else if (layers.includes('percent-encoding')) { next = textToBytes(decodeURIComponent(text)); method = 'percent decode'; }
        else if (layers.includes('escaped-bytes')) { next = textToBytes(decodeEscapes(text)); method = 'escape decode'; }
        else if (layers.includes('html-entities')) { next = textToBytes(decodeHtmlEntities(text)); method = 'HTML entity decode'; }
      } catch (_) { next = null; }
      if (!next || !next.length || bytesToHex(next) === bytesToHex(bytes)) break;
      chain.push(Object.freeze({ depth: depth + 1, method, inputBytes: bytes.length, outputBytes: next.length }));
      bytes = next;
    }
    return Object.freeze({ bytes, chain: Object.freeze(chain) });
  }

  function candidateScore(value) {
    const bytes = asBytes(value);
    if (!bytes.length) return Object.freeze({ score: 0, printable: 0, utf8: 0, language: 0, entropy: 0, signatures: [] });
    const printable = printableFraction(bytes);
    const utf8 = utf8Validity(bytes);
    const language = languageScore(bytes);
    const entropy = shannonEntropy(bytes);
    const signatures = fileSignatures(bytes);
    const structurePreference = clamp(1 - Math.abs(entropy - 5.2) / 5.2, 0, 1);
    const score = clamp(printable * 28 + utf8 * 12 + language * 0.45 + Math.min(20, signatures.length * 12) + structurePreference * 5, 0, 100);
    return Object.freeze({ score, printable, utf8, language, entropy, signatures });
  }

  function repeatingXorCandidate(value, keyLengthValue) {
    const bytes = asBytes(value); const keyLength = clamp(Math.floor(Number(keyLengthValue) || 2), 2, 64);
    const key = new Uint8Array(keyLength);
    for (let position = 0; position < keyLength; position += 1) {
      const column = [];
      for (let index = position; index < bytes.length; index += keyLength) column.push(bytes[index]);
      let bestKey = 0; let bestScore = -Infinity;
      for (let candidate = 0; candidate < 256; candidate += 1) {
        const decoded = Uint8Array.from(column, byte => byte ^ candidate);
        const score = languageScore(decoded) + printableFraction(decoded) * 35;
        if (score > bestScore) { bestScore = score; bestKey = candidate; }
      }
      key[position] = bestKey;
    }
    const decoded = Uint8Array.from(bytes, (byte, index) => byte ^ key[index % key.length]);
    return Object.freeze({ key, decoded });
  }

  function hammingDistanceBytes(leftValue, rightValue) {
    const left = asBytes(leftValue); const right = asBytes(rightValue); const length = Math.min(left.length, right.length); let bits = 0;
    for (let index = 0; index < length; index += 1) { let value = left[index] ^ right[index]; while (value) { bits += value & 1; value >>>= 1; } }
    return length ? bits / (length * 8) : 0;
  }

  function likelyRepeatingXorLengths(value, maximum = 24) {
    const bytes = asBytes(value); const rows = [];
    for (let length = 2; length <= Math.min(maximum, Math.floor(bytes.length / 4)); length += 1) {
      const chunks = [];
      for (let offset = 0; offset + length <= bytes.length && chunks.length < 6; offset += length) chunks.push(bytes.slice(offset, offset + length));
      if (chunks.length < 3) continue;
      let total = 0; let pairs = 0;
      for (let index = 0; index + 1 < chunks.length; index += 1) { total += hammingDistanceBytes(chunks[index], chunks[index + 1]); pairs += 1; }
      rows.push({ keyLength: length, normalizedHamming: total / Math.max(1, pairs) });
    }
    return Object.freeze(rows.sort((a, b) => a.normalizedHamming - b.normalizedHamming).slice(0, 8).map(Object.freeze));
  }

  function structuralCandidates(value) {
    const bytes = asBytes(value); const candidates = [];
    const add = (method, candidateBytes) => candidates.push({ method, bytes: asBytes(candidateBytes) });
    add('identity', bytes); add('reverse byte order', reverseBytes(bytes)); add('reverse bits in each byte', reverseBitsPerByte(bytes)); add('swap nibbles', nibbleSwap(bytes));
    for (let shift = 1; shift <= 7; shift += 1) add(`rotate bits in each byte right ${shift}`, rotateBitsPerByte(bytes, shift));
    for (const word of [2, 4, 8]) add(`swap ${word * 8}-bit word endianness`, swapWordEndian(bytes, word));
    add('adjacent-byte XOR difference', adjacentXorDecode(bytes)); add('cumulative XOR decode', cumulativeXorDecode(bytes)); add('cumulative delta-add decode', deltaAddDecode(bytes)); add('adjacent delta-subtract decode', deltaSubtractDecode(bytes));
    add('deinterleave even bytes then odd bytes', deinterleave(bytes, 0)); add('deinterleave odd bytes then even bytes', deinterleave(bytes, 1));
    for (let plane = 0; plane < 8; plane += 1) add(`extract bit plane ${plane}`, bitPlane(bytes, plane));
    for (let width = 2; width <= 16; width += 1) { add(`columnar transpose width ${width}`, columnarTranspose(bytes, width, false)); add(`inverse columnar transpose width ${width}`, columnarTranspose(bytes, width, true)); }
    for (let stride = 2; stride <= 8; stride += 1) for (let offset = 0; offset < stride; offset += 1) add(`stride ${stride} offset ${offset}`, strideExtract(bytes, stride, offset));
    const text = bytesToText(bytes);
    add('ROT13 text', textToBytes(rot13Text(text))); add('Atbash text', textToBytes(atbashText(text))); add('ROT47 text', textToBytes(rot47Text(text)));
    for (let shift = 1; shift < 26; shift += 1) add(`Caesar shift +${shift}`, textToBytes(caesarText(text, shift)));
    return candidates;
  }

  function distinctCandidates(values) {
    const seen = new Set(); const output = [];
    for (const candidate of values) {
      const bytes = asBytes(candidate.bytes); const fingerprint = `${bytes.length}:${bytesToHex(bytes.slice(0, 2048))}`;
      if (seen.has(fingerprint)) continue;
      seen.add(fingerprint); output.push({ ...candidate, bytes });
    }
    return output;
  }

  async function rankDeobfuscationCandidates(value, options = {}) {
    const bytes = asBytes(value); const runner = root?.ScientificToolsCooperativeRunner;
    const token = options.token || runner?.createToken?.('Information deobfuscation sweep') || { cancelled: false };
    const onProgress = typeof options.onProgress === 'function' ? options.onProgress : null;
    let candidates = structuralCandidates(bytes);
    if (options.singleByteXor !== false) for (let key = 1; key < 256; key += 1) candidates.push({ method: `single-byte XOR 0x${key.toString(16).padStart(2, '0')}`, bytes: xorByte(bytes, key) });
    if (options.repeatingXor !== false) {
      const lengths = likelyRepeatingXorLengths(bytes, 24).slice(0, 6);
      for (const row of lengths) { const result = repeatingXorCandidate(bytes, row.keyLength); candidates.push({ method: `repeating XOR inferred length ${row.keyLength} · key ${bytesToHex(result.key)}`, bytes: result.decoded }); }
    }
    const peeled = await recursivePeel(bytes);
    if (peeled.chain.length) candidates.push({ method: `recursive encoding peel · ${peeled.chain.map(step => step.method).join(' → ')}`, bytes: peeled.bytes });
    candidates = distinctCandidates(candidates);
    const scored = new Array(candidates.length);
    const processCandidate = index => {
      const candidate = candidates[index]; const metrics = candidateScore(candidate.bytes);
      scored[index] = Object.freeze({ ...candidate, ...metrics, preview: bytesToText(candidate.bytes.slice(0, 1200)), hexPreview: bytesToHex(candidate.bytes.slice(0, 160)) });
    };
    if (runner?.forRange) {
      await runner.forRange({ start: 0, end: candidates.length, chunkSize: 24, token, label: 'Scoring deobfuscation candidates', step: processCandidate, onProgress });
    } else {
      for (let index = 0; index < candidates.length; index += 1) processCandidate(index);
    }
    scored.sort((a, b) => b.score - a.score || b.language - a.language || a.method.localeCompare(b.method));
    return Object.freeze(scored.slice(0, clamp(Math.floor(Number(options.limit) || 40), 10, MAX_CANDIDATES)));
  }

  async function referenceAffinity(value, customReference = '') {
    const bytes = asBytes(value);
    const references = { ...REFERENCE_CORPORA };
    if (String(customReference || '').trim()) references.custom = String(customReference);
    const rows = [];
    for (const [name, text] of Object.entries(references)) {
      const reference = textToBytes(text);
      const [bcl, ncd] = await Promise.all([bclRelativeEntropy(reference, bytes), normalizedCompressionDistance(reference, bytes)]);
      rows.push(Object.freeze({ name, bclRelativeEntropyPerByte: bcl.relativeEntropyPerByte, bclAvailable: bcl.available, ncd: ncd.distance }));
    }
    return Object.freeze(rows.sort((a, b) => (a.ncd ?? 9) - (b.ncd ?? 9)));
  }

  async function analyzeInformation(value, options = {}) {
    const bytes = asBytes(value);
    if (!bytes.length) fail('Load data before running information analysis.');
    if (bytes.length > MAX_INPUT_BYTES) fail(`Information suite input exceeds the ${MAX_INPUT_BYTES.toLocaleString()}-byte analysis limit.`);
    const entropy = shannonEntropy(bytes);
    const minimumEntropy = minEntropy(bytes);
    const gzip = await gzipLength(bytes);
    const compressionRatio = gzip / Math.max(1, bytes.length);
    const runs = runsTestBits(bytes);
    const maurer = maurerUniversal(bytes);
    const affinities = await referenceAffinity(bytes, options.customReference || '');
    const strings = stringCarve(bytes, options.minimumStringLength || 5);
    const signatures = fileSignatures(bytes);
    const windows = slidingEntropy(bytes, options.windowSize || 256, options.windowStep || 128);
    const lagRows = [];
    for (let lag = 1; lag <= Math.min(32, Math.max(1, Math.floor(bytes.length / 8))); lag += 1) lagRows.push(Object.freeze({ lag, serialCorrelation: serialCorrelation(bytes, lag), mutualInformation: mutualInformationLag(bytes, lag) }));
    lagRows.sort((a, b) => Math.abs(b.serialCorrelation) + b.mutualInformation - (Math.abs(a.serialCorrelation) + a.mutualInformation));
    const bestAffinity = affinities[0] || null;
    const structureSignals = [
      compressionRatio < 0.95 ? 1 : 0,
      entropy < 7.7 ? 1 : 0,
      Math.abs(runs.z) > 2 ? 1 : 0,
      indexOfCoincidence(bytes) > 0.005 ? 1 : 0,
      ngramEntropy(bytes, 2) < 7.5 ? 1 : 0,
      Math.abs(serialCorrelation(bytes, 1)) > 0.04 ? 1 : 0,
      mutualInformationLag(bytes, 1) > 0.03 ? 1 : 0,
      signatures.length ? 1 : 0,
      strings.length >= 3 ? 1 : 0,
      bestAffinity && bestAffinity.ncd < 0.95 ? 1 : 0
    ];
    const evidenceScore = 100 * structureSignals.reduce((sum, value) => sum + value, 0) / structureSignals.length;
    let evidenceClass = 'weak / inconclusive structure evidence';
    if (evidenceScore >= 70) evidenceClass = 'strong evidence of recoverable structure';
    else if (evidenceScore >= 45) evidenceClass = 'moderate evidence of non-random structure';
    else if (entropy > 7.85 && Math.abs(runs.z) < 2 && compressionRatio >= 0.98) evidenceClass = 'random-like, compressed, or strongly encrypted/obfuscated';
    return Object.freeze({
      byteLength: bytes.length,
      entropy,
      minEntropy: minimumEntropy,
      chiSquare: chiSquareUniformity(bytes),
      indexOfCoincidence: indexOfCoincidence(bytes),
      compressionLength: gzip,
      compressionRatio,
      lzComplexityRatio: lzComplexityRatio(bytes),
      ngramEntropy: Object.freeze({ one: ngramEntropy(bytes, 1), two: ngramEntropy(bytes, 2), three: ngramEntropy(bytes, 3), four: ngramEntropy(bytes, 4) }),
      runs,
      maurer,
      utf8Validity: utf8Validity(bytes),
      printableFraction: printableFraction(bytes),
      languageScore: languageScore(bytes),
      affinities,
      signatures,
      strings,
      entropyWindows: windows,
      strongestLags: Object.freeze(lagRows.slice(0, 12)),
      likelyRepeatingXorLengths: likelyRepeatingXorLengths(bytes, 32),
      encodingLayers: detectEncodingLayers(bytesToText(bytes)),
      evidenceScore,
      evidenceClass,
      caveat: 'This is an ensemble of statistical and compression evidence. It cannot prove semantic meaning; encrypted or already-compressed intelligible content may remain deliberately random-like.'
    });
  }

  async function fullAnalysis(value, options = {}) {
    const bytes = asBytes(value);
    const token = options.token || root?.ScientificToolsCooperativeRunner?.createToken?.('Information analysis and deobfuscation') || { cancelled: false };
    const onProgress = typeof options.onProgress === 'function' ? options.onProgress : null;
    onProgress?.({ label: 'Information evidence', fraction: 0.05, completed: 1, total: 3 });
    const analysis = await analyzeInformation(bytes, options);
    if (token.cancelled) fail(token.reason || 'Analysis cancelled.');
    onProgress?.({ label: 'Deobfuscation sweep', fraction: 0.35, completed: 2, total: 3 });
    const candidates = await rankDeobfuscationCandidates(bytes, { ...options, token, onProgress: progress => onProgress?.({ ...progress, fraction: 0.35 + (Number(progress.fraction) || 0) * 0.6 }) });
    onProgress?.({ label: 'Complete', fraction: 1, completed: 3, total: 3 });
    return Object.freeze({ analysis, candidates });
  }

  function ensureStyle() {
    if (!root?.document || root.document.getElementById(STYLE_ID)) return;
    const link = root.document.createElement('link'); link.id = STYLE_ID; link.rel = 'stylesheet'; link.href = 'binary-cube-information-analysis-suite.css?v=20260809-information-analysis-1'; root.document.head.appendChild(link);
  }

  function formatPercent(value) { return `${(Number(value || 0) * 100).toFixed(2)}%`; }
  function formatNumber(value, digits = 4) { return Number.isFinite(Number(value)) ? Number(value).toFixed(digits) : '—'; }

  function renderAnalysis(result) {
    const target = panel?.querySelector('[data-bias-analysis]'); if (!target) return;
    const analysis = result.analysis;
    const affinityRows = analysis.affinities.map(row => `<tr><td>${esc(row.name)}</td><td>${row.bclAvailable ? formatNumber(row.bclRelativeEntropyPerByte, 5) : 'sample too short'}</td><td>${formatNumber(row.ncd, 4)}</td></tr>`).join('');
    const lagRows = analysis.strongestLags.map(row => `<tr><td>${row.lag}</td><td>${formatNumber(row.serialCorrelation, 5)}</td><td>${formatNumber(row.mutualInformation, 5)}</td></tr>`).join('');
    const entropyRows = analysis.entropyWindows.slice(0, 48).map(row => `<tr><td>${row.offset.toLocaleString()}</td><td>${row.length}</td><td>${formatNumber(row.entropy, 4)}</td></tr>`).join('');
    const signatureRows = analysis.signatures.length ? analysis.signatures.map(item => `<span class="bias-chip">${esc(item.label)} @ ${item.offset}</span>`).join('') : '<span class="bias-muted">No recognized magic signatures detected.</span>';
    const xorLengths = analysis.likelyRepeatingXorLengths.map(row => `<span class="bias-chip">${row.keyLength} bytes · ${formatNumber(row.normalizedHamming, 4)}</span>`).join('') || '<span class="bias-muted">Insufficient material.</span>';
    target.innerHTML = `
      <section class="bias-card bias-verdict"><div><span>Structured-information evidence</span><strong>${analysis.evidenceScore.toFixed(0)} / 100</strong></div><h3>${esc(analysis.evidenceClass)}</h3><p>${esc(analysis.caveat)}</p></section>
      <section class="bias-card"><h3>Entropy, randomness and complexity</h3><div class="bias-metric-grid">
        <div><span>Shannon entropy</span><strong>${formatNumber(analysis.entropy, 5)} / 8</strong></div><div><span>Min-entropy</span><strong>${formatNumber(analysis.minEntropy, 5)}</strong></div><div><span>GZIP ratio</span><strong>${formatNumber(analysis.compressionRatio, 4)}</strong></div><div><span>LZ complexity ratio</span><strong>${formatNumber(analysis.lzComplexityRatio, 4)}</strong></div><div><span>Index of coincidence</span><strong>${formatNumber(analysis.indexOfCoincidence, 6)}</strong></div><div><span>Chi-square vs uniform bytes</span><strong>${formatNumber(analysis.chiSquare, 2)}</strong></div><div><span>Runs z-score</span><strong>${formatNumber(analysis.runs.z, 3)}</strong></div><div><span>UTF-8 valid-byte fraction</span><strong>${formatPercent(analysis.utf8Validity)}</strong></div>
      </div><div class="bias-metric-grid"><div><span>1-gram entropy/byte</span><strong>${formatNumber(analysis.ngramEntropy.one)}</strong></div><div><span>2-gram entropy/byte</span><strong>${formatNumber(analysis.ngramEntropy.two)}</strong></div><div><span>3-gram entropy/byte</span><strong>${formatNumber(analysis.ngramEntropy.three)}</strong></div><div><span>4-gram entropy/byte</span><strong>${formatNumber(analysis.ngramEntropy.four)}</strong></div></div></section>
      <section class="bias-card"><h3>${esc(MAURER_TITLE)} · ${MAURER_YEAR}</h3><p>A return-distance entropy statistic inspired by Ueli Maurer's universal random-bit-generator test. It is included as a random-like/non-random-like diagnostic rather than presented as a formal certification.</p><div class="bias-metric-grid"><div><span>Block length</span><strong>${analysis.maurer.blockLength}</strong></div><div><span>Statistic</span><strong>${analysis.maurer.statistic === null ? '—' : formatNumber(analysis.maurer.statistic, 6)}</strong></div><div><span>Random-source expectation</span><strong>${analysis.maurer.expected === null ? '—' : formatNumber(analysis.maurer.expected, 6)}</strong></div><div><span>Deviation</span><strong>${analysis.maurer.deviation === null ? '—' : formatNumber(analysis.maurer.deviation, 6)}</strong></div></div><p class="bias-muted">${esc(analysis.maurer.note)}</p></section>
      <section class="bias-card"><h3>${esc(PAPER_TITLE)} · ${PAPER_YEAR}</h3><p>${esc(PAPER_AUTHORS)}. The dashboard uses compression-relative-entropy and normalized compression distance as evidence of whether the unknown data behaves like a reference body of knowledge. Lower distance generally means greater shared compressor-learnable structure; this is evidence of relationship, not proof of semantic meaning.</p><div class="bias-table-scroll"><table><thead><tr><th>Reference</th><th>BCL relative entropy / byte</th><th>Normalized compression distance</th></tr></thead><tbody>${affinityRows}</tbody></table></div></section>
      <section class="bias-card"><h3>Structural signals</h3><div class="bias-chip-row">${signatureRows}</div><h4>Detected outer encoding layers</h4><div class="bias-chip-row">${analysis.encodingLayers.length ? analysis.encodingLayers.map(layer => `<span class="bias-chip">${esc(layer)}</span>`).join('') : '<span class="bias-muted">None obvious.</span>'}</div><h4>Likely repeating-XOR key lengths</h4><div class="bias-chip-row">${xorLengths}</div><h4>Strongest lag relationships</h4><div class="bias-table-scroll"><table><thead><tr><th>Lag</th><th>Serial correlation</th><th>Mutual information</th></tr></thead><tbody>${lagRows}</tbody></table></div></section>
      <section class="bias-card"><h3>Sliding entropy map</h3><div class="bias-table-scroll bias-small-table"><table><thead><tr><th>Offset</th><th>Window bytes</th><th>Entropy</th></tr></thead><tbody>${entropyRows}</tbody></table></div></section>
      <section class="bias-card"><h3>Extracted strings</h3><div class="bias-string-list">${analysis.strings.length ? analysis.strings.slice(0, 80).map(item => `<div><span>${esc(item.encoding)} @ ${item.offset}</span><code>${esc(item.text)}</code></div>`).join('') : '<p class="bias-muted">No strings above the selected minimum length were carved.</p>'}</div></section>`;
  }

  function renderCandidates(candidatesValue) {
    activeCandidates = Array.from(candidatesValue || []);
    const target = panel?.querySelector('[data-bias-candidates]'); if (!target) return;
    target.innerHTML = activeCandidates.length ? activeCandidates.map((candidate, index) => `
      <article class="bias-candidate"><header><span>#${index + 1}</span><strong>${esc(candidate.method)}</strong><b>${candidate.score.toFixed(1)}</b></header><div class="bias-chip-row"><span class="bias-chip">printable ${formatPercent(candidate.printable)}</span><span class="bias-chip">UTF-8 ${formatPercent(candidate.utf8)}</span><span class="bias-chip">language ${candidate.language.toFixed(1)}</span><span class="bias-chip">entropy ${formatNumber(candidate.entropy, 3)}</span>${candidate.signatures.map(item => `<span class="bias-chip">${esc(item.label)} @ ${item.offset}</span>`).join('')}</div><pre>${esc(candidate.preview || '(no text preview)')}</pre><details><summary>Hex preview</summary><code>${esc(candidate.hexPreview)}</code></details><div class="bias-actions"><button type="button" data-bias-copy="${index}">Copy preview</button><button type="button" data-bias-download="${index}">Save bytes</button></div></article>`).join('') : '<p class="bias-muted">No candidates yet.</p>';
  }

  function updateProgress(progressValue) {
    const progress = progressValue || {}; const meter = panel?.querySelector('[data-bias-progress]'); const label = panel?.querySelector('[data-bias-progress-label]');
    if (meter) meter.value = clamp(Number(progress.fraction) || 0, 0, 1);
    if (label) label.textContent = `${progress.label || 'Working'} · ${Math.round(clamp(Number(progress.fraction) || 0, 0, 1) * 100)}%`;
  }

  function setStatus(message, kind = '') { const node = panel?.querySelector('[data-bias-status]'); if (node) { node.textContent = message; node.dataset.kind = kind; } }

  function downloadBytes(value, filename) {
    const bytes = asBytes(value); const blob = new Blob([bytes], { type: 'application/octet-stream' }); const url = URL.createObjectURL(blob); const link = root.document.createElement('a'); link.href = url; link.download = String(filename || 'deobfuscation-candidate.bin').replace(/[<>:"/\\|?*\u0000-\u001f]+/g, '-').slice(0, 140); root.document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(url);
  }

  async function copyText(value) {
    if (root?.navigator?.clipboard?.writeText) return root.navigator.clipboard.writeText(String(value ?? ''));
    const textarea = root.document.createElement('textarea'); textarea.value = String(value ?? ''); textarea.style.position = 'fixed'; textarea.style.opacity = '0'; root.document.body.appendChild(textarea); textarea.select(); root.document.execCommand('copy'); textarea.remove();
  }

  async function executeAnalysis() {
    if (!activeBytes?.length) fail('Load data first.');
    activeToken?.cancel?.('superseded by newer analysis');
    const runner = root?.ScientificToolsCooperativeRunner;
    activeToken = runner?.createToken?.('Information analysis and deobfuscation') || { cancelled: false, cancel(reason) { this.cancelled = true; this.reason = reason; } };
    panel.querySelector('[data-bias-run]').disabled = true; panel.querySelector('[data-bias-cancel]').disabled = false; setStatus('Analysis running…');
    try {
      const result = await fullAnalysis(activeBytes, {
        token: activeToken,
        customReference: panel.querySelector('#bias-reference').value,
        singleByteXor: panel.querySelector('#bias-single-xor').checked,
        repeatingXor: panel.querySelector('#bias-repeating-xor').checked,
        minimumStringLength: panel.querySelector('#bias-string-length').value,
        limit: panel.querySelector('#bias-result-limit').value,
        windowSize: panel.querySelector('#bias-window-size').value,
        onProgress: updateProgress
      });
      renderAnalysis(result); renderCandidates(result.candidates); updateProgress({ label: 'Complete', fraction: 1 }); setStatus(`Complete · ${result.candidates.length} ranked deobfuscation candidates.`, 'success');
    } catch (error) {
      if (activeToken?.cancelled) setStatus(`Cancelled${activeToken.reason ? ` · ${activeToken.reason}` : ''}.`, 'warning');
      else { setStatus(error.message, 'error'); throw error; }
    } finally { panel.querySelector('[data-bias-run]').disabled = !activeBytes?.length; panel.querySelector('[data-bias-cancel]').disabled = true; activeToken = null; }
  }

  function loadBytes(value, name = 'analysis-input') {
    const bytes = asBytes(value); if (!bytes.length) fail('Input is empty.'); if (bytes.length > MAX_INPUT_BYTES) fail(`Input exceeds ${MAX_INPUT_BYTES.toLocaleString()} bytes.`); activeBytes = Uint8Array.from(bytes); activeName = String(name || 'analysis-input'); activeCandidates = [];
    const summary = panel?.querySelector('[data-bias-source]'); if (summary) summary.innerHTML = `<div><span>Source</span><strong>${esc(activeName)}</strong></div><div><span>Bytes</span><strong>${activeBytes.length.toLocaleString()}</strong></div><div><span>Entropy</span><strong>${formatNumber(shannonEntropy(activeBytes), 4)}</strong></div><div><span>Printable</span><strong>${formatPercent(printableFraction(activeBytes))}</strong></div>`;
    panel.querySelector('[data-bias-run]').disabled = false; panel.querySelector('[data-bias-analysis]').innerHTML = '<p class="bias-muted">Ready for information analysis.</p>'; renderCandidates([]); setStatus(`Loaded ${activeName}.`, 'success'); return activeBytes;
  }

  function buildPanel() {
    if (!root?.document) fail('Information Analysis Suite requires a browser document.');
    const existing = root.document.getElementById(PANEL_ID); if (existing) { panel = existing; return panel; }
    ensureStyle(); panel = root.document.createElement('section'); panel.id = PANEL_ID; panel.className = 'bias-shell'; panel.hidden = true; panel.setAttribute('aria-labelledby', 'bias-title');
    panel.innerHTML = `
      <div class="bias-backdrop" data-bias-close></div><div class="bias-panel" role="dialog" aria-modal="true" aria-labelledby="bias-title">
        <header class="bias-header"><div><p class="bias-eyebrow">Scientific Tools · Decryption Dashboard</p><h2 id="bias-title">Information & Deobfuscation Analysis Suite</h2><p>Broad offline workbench for deciding whether opaque data contains statistically recoverable structure, comparing it to reference knowledge with compression methods, carving embedded information, and sweeping reversible de-obfuscation hypotheses.</p></div><button type="button" class="bias-close" data-bias-close aria-label="Close Information Analysis Suite">×</button></header>
        <div class="bias-body"><aside class="bias-controls">
          <section class="bias-card"><h3>Acquire material</h3><label>Upload file<input id="bias-file" type="file"></label><label>Paste format<select id="bias-mode"><option value="auto">Auto detect</option><option value="text">Literal text</option><option value="hex">Hex</option><option value="base64">Base64</option><option value="binary">Binary bits</option></select></label><label>Paste material<textarea id="bias-input" rows="8" spellcheck="false"></textarea></label><div class="bias-actions"><button type="button" class="primary-action" data-bias-load>Load input</button><button type="button" data-bias-clear>Clear</button></div><div class="bias-source" data-bias-source><p class="bias-muted">No data loaded.</p></div></section>
          <section class="bias-card"><h3>Reference knowledge</h3><p class="bias-muted">Optional custom reference corpus for compression-affinity tests. Built-in English, Spanish, French, German, JSON, and source-code references are always compared.</p><label>Custom corpus<textarea id="bias-reference" rows="6" spellcheck="false" placeholder="Paste known related language, protocol text, source format, documentation, or a known-plaintext corpus."></textarea></label></section>
          <section class="bias-card"><h3>Analysis controls</h3><label class="bias-check"><input id="bias-single-xor" type="checkbox" checked> Sweep all single-byte XOR keys</label><label class="bias-check"><input id="bias-repeating-xor" type="checkbox" checked> Infer repeating-XOR key lengths and keys</label><label>Minimum carved string length<input id="bias-string-length" type="number" min="3" max="64" value="5"></label><label>Sliding entropy window<input id="bias-window-size" type="number" min="32" max="8192" step="32" value="256"></label><label>Ranked candidate limit<input id="bias-result-limit" type="number" min="10" max="80" value="40"></label><div class="bias-actions"><button type="button" class="primary-action" data-bias-run disabled>Run full analysis</button><button type="button" data-bias-cancel disabled>Cancel</button></div><progress data-bias-progress max="1" value="0"></progress><div class="bias-progress-label" data-bias-progress-label>Idle</div></section>
          <section class="bias-boundary"><strong>Evidence boundary:</strong> no entropy, compression, language, or randomness statistic can by itself prove that a byte stream has semantic meaning. This suite combines independent signals and keeps “structured,” “random-like,” “compressed,” “encrypted,” and “intelligible” as distinct claims.</section>
        </aside><main class="bias-results"><div class="bias-status" data-bias-status role="status" aria-live="polite">Load material to begin.</div><div data-bias-analysis><p class="bias-muted">No analysis yet.</p></div><section class="bias-card"><h3>Ranked de-obfuscation candidates</h3><div data-bias-candidates><p class="bias-muted">No candidates yet.</p></div></section></main></div>
      </div>`;
    root.document.body.appendChild(panel); bindPanel(panel); return panel;
  }

  function bindPanel(target) {
    target.querySelectorAll('[data-bias-close]').forEach(button => button.addEventListener('click', closePanel));
    target.querySelector('[data-bias-load]').addEventListener('click', () => { try { loadBytes(parseFlexibleInput(target.querySelector('#bias-input').value, target.querySelector('#bias-mode').value), 'pasted-input'); } catch (error) { setStatus(error.message, 'error'); } });
    target.querySelector('#bias-file').addEventListener('change', event => { const file = event.target.files?.[0]; if (!file) return; void file.arrayBuffer().then(buffer => loadBytes(new Uint8Array(buffer), file.name)).catch(error => setStatus(error.message, 'error')); });
    target.querySelector('[data-bias-run]').addEventListener('click', () => void executeAnalysis().catch(error => console.error(error)));
    target.querySelector('[data-bias-cancel]').addEventListener('click', () => activeToken?.cancel?.('cancel requested by user'));
    target.querySelector('[data-bias-clear]').addEventListener('click', () => { activeToken?.cancel?.('session cleared'); activeBytes = null; activeName = ''; activeCandidates = []; target.querySelector('#bias-input').value = ''; target.querySelector('#bias-file').value = ''; target.querySelector('[data-bias-source]').innerHTML = '<p class="bias-muted">No data loaded.</p>'; target.querySelector('[data-bias-analysis]').innerHTML = '<p class="bias-muted">No analysis yet.</p>'; renderCandidates([]); target.querySelector('[data-bias-run]').disabled = true; updateProgress({ label: 'Idle', fraction: 0 }); setStatus('Load material to begin.'); });
    target.querySelector('[data-bias-candidates]').addEventListener('click', event => { const copy = event.target.closest('[data-bias-copy]'); const save = event.target.closest('[data-bias-download]'); if (copy) { const candidate = activeCandidates[Number(copy.dataset.biasCopy)]; if (candidate) void copyText(candidate.preview || ''); } if (save) { const candidate = activeCandidates[Number(save.dataset.biasDownload)]; if (candidate) downloadBytes(candidate.bytes, `deobfuscation-candidate-${Number(save.dataset.biasDownload) + 1}.bin`); } });
  }

  function openPanel(options = {}) {
    const target = buildPanel(); target.hidden = false; root.document.body.classList.add('bias-open');
    if (options.bytes) loadBytes(options.bytes, options.sourceName || 'handoff');
    else if (options.text) loadBytes(textToBytes(options.text), options.sourceName || 'handoff-text');
    return target;
  }

  function closePanel() { activeToken?.cancel?.('analysis suite closed'); if (panel) panel.hidden = true; root?.document?.body?.classList.remove('bias-open'); }
  function currentState() { return Object.freeze({ panelOpen: Boolean(panel && !panel.hidden), sourceLoaded: Boolean(activeBytes?.length), sourceBytes: activeBytes?.length || 0, candidateCount: activeCandidates.length, running: Boolean(activeToken && !activeToken.cancelled) }); }

  return Object.freeze({
    openPanel, closePanel, currentState, loadBytes, parseFlexibleInput, analyzeInformation, fullAnalysis, rankDeobfuscationCandidates, referenceAffinity, bclRelativeEntropy, normalizedCompressionDistance, maurerUniversal, recursivePeel,
    utilities: Object.freeze({ asBytes, concatBytes, textToBytes, bytesToText, bytesToHex, bitsFromBytes, bytesFromBits, bytesFromHex, bytesFromBase64, histogram, shannonEntropy, minEntropy, chiSquareUniformity, indexOfCoincidence, serialCorrelation, runsTestBits, ngramEntropy, mutualInformationLag, slidingEntropy, lz78PhraseCount, lzComplexityRatio, utf8Validity, printableFraction, languageScore, fileSignatures, stringCarve, reverseBytes, reverseBitsPerByte, nibbleSwap, rotateBitsPerByte, xorByte, swapWordEndian, adjacentXorDecode, cumulativeXorDecode, deltaAddDecode, deltaSubtractDecode, deinterleave, bitPlane, columnarTranspose, strideExtract, rot13Text, atbashText, caesarText, rot47Text, base32Decode, decodeEscapes, decodeHtmlEntities, detectEncodingLayers, candidateScore, repeatingXorCandidate, likelyRepeatingXorLengths, structuralCandidates }),
    constants: Object.freeze({ PANEL_ID, MAX_INPUT_BYTES, MAX_CANDIDATES, PAPER_TITLE, PAPER_YEAR, PAPER_AUTHORS, MAURER_TITLE, MAURER_YEAR, REFERENCE_CORPORA })
  });
});