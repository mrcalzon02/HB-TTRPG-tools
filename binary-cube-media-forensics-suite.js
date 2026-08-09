(function installBinaryCubeMediaForensicsSuite(root, factory) {
  'use strict';
  const api = factory(root || globalThis);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.BinaryCubeMediaForensicsSuite = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function createBinaryCubeMediaForensicsSuite(root) {
  'use strict';

  const PANEL_ID = 'binary-cube-media-forensics-suite';
  const STYLE_ID = 'binary-cube-media-forensics-suite-style';
  const WORKER_URL = 'binary-cube-media-forensics-worker.js?v=20260809-media-forensics-1';
  const MAX_INPUT_BYTES = 32 * 1024 * 1024;
  const MAX_RASTER_PIXELS = 16 * 1024 * 1024;
  const MAX_PREVIEW_BYTES = 4096;
  const WORKER_HEARTBEAT_MS = 1000;

  const CONVOLUTION_KERNELS = Object.freeze({
    identity: Object.freeze({ name: 'Identity', width: 3, height: 3, values: Object.freeze([0, 0, 0, 0, 1, 0, 0, 0, 0]) }),
    boxBlur: Object.freeze({ name: 'Box blur', width: 3, height: 3, values: Object.freeze([1, 1, 1, 1, 1, 1, 1, 1, 1]), divisor: 9 }),
    gaussian: Object.freeze({ name: 'Gaussian blur', width: 3, height: 3, values: Object.freeze([1, 2, 1, 2, 4, 2, 1, 2, 1]), divisor: 16 }),
    sharpen: Object.freeze({ name: 'Sharpen', width: 3, height: 3, values: Object.freeze([0, -1, 0, -1, 5, -1, 0, -1, 0]) }),
    laplacian: Object.freeze({ name: 'Laplacian', width: 3, height: 3, values: Object.freeze([0, -1, 0, -1, 4, -1, 0, -1, 0]) }),
    highPass: Object.freeze({ name: 'High pass', width: 3, height: 3, values: Object.freeze([-1, -1, -1, -1, 8, -1, -1, -1, -1]) }),
    sobelX: Object.freeze({ name: 'Sobel X', width: 3, height: 3, values: Object.freeze([-1, 0, 1, -2, 0, 2, -1, 0, 1]) }),
    sobelY: Object.freeze({ name: 'Sobel Y', width: 3, height: 3, values: Object.freeze([-1, -2, -1, 0, 0, 0, 1, 2, 1]) }),
    prewittX: Object.freeze({ name: 'Prewitt X', width: 3, height: 3, values: Object.freeze([-1, 0, 1, -1, 0, 1, -1, 0, 1]) }),
    prewittY: Object.freeze({ name: 'Prewitt Y', width: 3, height: 3, values: Object.freeze([-1, -1, -1, 0, 0, 0, 1, 1, 1]) }),
    emboss: Object.freeze({ name: 'Emboss', width: 3, height: 3, values: Object.freeze([-2, -1, 0, -1, 1, 1, 0, 1, 2]), bias: 128 })
  });

  const AUDIO_PRESETS = Object.freeze({
    afsk1200: Object.freeze({ label: 'AFSK 1200-style', markFrequency: 1200, spaceFrequency: 2200, baud: 1200 }),
    fsk300Low: Object.freeze({ label: '300-baud low pair', markFrequency: 1270, spaceFrequency: 1070, baud: 300 }),
    fsk300High: Object.freeze({ label: '300-baud high pair', markFrequency: 2225, spaceFrequency: 2025, baud: 300 })
  });

  const DTMF_ROWS = Object.freeze([697, 770, 852, 941]);
  const DTMF_COLUMNS = Object.freeze([1209, 1336, 1477, 1633]);
  const DTMF_KEYS = Object.freeze([
    Object.freeze(['1', '2', '3', 'A']),
    Object.freeze(['4', '5', '6', 'B']),
    Object.freeze(['7', '8', '9', 'C']),
    Object.freeze(['*', '0', '#', 'D'])
  ]);

  let panel = null;
  let activeBytes = null;
  let activeName = '';
  let activeRaster = null;
  let activeAudio = null;
  let activeWorker = null;
  let activeWorkerReject = null;
  let workerHeartbeat = 0;
  let requestCounter = 0;
  let latestSweep = null;
  let latestExtraction = null;
  let latestConvolution = null;

  const clamp = (value, minimum, maximum) => Math.max(minimum, Math.min(maximum, value));
  const esc = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
  function fail(message) { throw new Error(message); }

  function asBytes(value) {
    if (value instanceof Uint8Array) return value;
    if (value instanceof ArrayBuffer) return new Uint8Array(value);
    if (ArrayBuffer.isView(value)) return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
    return Uint8Array.from(value || []);
  }

  function textToBytes(value) {
    const text = String(value ?? '');
    if (typeof TextEncoder !== 'undefined') return new TextEncoder().encode(text);
    return Uint8Array.from(unescape(encodeURIComponent(text)), character => character.charCodeAt(0));
  }

  function bytesToText(value) {
    const bytes = asBytes(value);
    if (typeof TextDecoder !== 'undefined') {
      try { return new TextDecoder('utf-8', { fatal: false }).decode(bytes); } catch (_) { /* fallback */ }
    }
    return Array.from(bytes, byte => byte >= 32 && byte <= 126 || byte === 9 || byte === 10 || byte === 13 ? String.fromCharCode(byte) : '�').join('');
  }

  function bytesToHex(value, separator = '') {
    return Array.from(asBytes(value), byte => byte.toString(16).padStart(2, '0')).join(separator);
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
      const decoded = root.atob(compact);
      return Uint8Array.from(decoded, character => character.charCodeAt(0) & 0xff);
    }
    if (typeof Buffer !== 'undefined') return Uint8Array.from(Buffer.from(compact, 'base64'));
    fail('Base64 decoding is unavailable.');
  }

  function bytesFromBits(value) {
    const bits = String(value ?? '').replace(/\s+/g, '');
    if (!bits || /[^01]/.test(bits)) fail('Binary input must contain only 0 and 1.');
    const output = new Uint8Array(Math.floor(bits.length / 8));
    for (let index = 0; index < output.length; index += 1) output[index] = parseInt(bits.slice(index * 8, index * 8 + 8), 2);
    return output;
  }

  function parseFlexibleInput(value, mode = 'auto') {
    const raw = String(value ?? '');
    const selected = String(mode || 'auto');
    if (!raw.trim()) fail('Input is empty.');
    if (selected === 'text') return textToBytes(raw);
    if (selected === 'hex') return bytesFromHex(raw);
    if (selected === 'base64') return bytesFromBase64(raw);
    if (selected === 'binary') return bytesFromBits(raw);
    const compact = raw.replace(/\s+/g, '');
    if (compact.length >= 16 && /^[01]+$/.test(compact)) return bytesFromBits(raw);
    const hex = raw.replace(/0x/gi, '').replace(/[\s:_-]+/g, '');
    if (hex.length >= 8 && hex.length % 2 === 0 && /^[0-9a-f]+$/i.test(hex)) return bytesFromHex(raw);
    if (compact.length >= 16 && compact.length % 4 === 0 && /^[A-Za-z0-9+/]+={0,2}$/.test(compact)) {
      try { return bytesFromBase64(compact); } catch (_) { /* text fallback */ }
    }
    return textToBytes(raw);
  }

  function packBits(bitsValue, bitOrder = 'msb') {
    const bits = Array.from(bitsValue || [], bit => bit ? 1 : 0);
    const bytes = new Uint8Array(Math.floor(bits.length / 8));
    for (let index = 0; index < bytes.length; index += 1) {
      let byte = 0;
      for (let offset = 0; offset < 8; offset += 1) {
        const bit = bits[index * 8 + offset];
        if (bitOrder === 'lsb') byte |= bit << offset;
        else byte = (byte << 1) | bit;
      }
      bytes[index] = byte;
    }
    return bytes;
  }

  function unpackBits(value, bitOrder = 'msb') {
    const bits = [];
    for (const byte of asBytes(value)) {
      for (let offset = 0; offset < 8; offset += 1) {
        const shift = bitOrder === 'lsb' ? offset : 7 - offset;
        bits.push((byte >>> shift) & 1);
      }
    }
    return bits;
  }

  function extractByteBitPlane(value, bitIndexValue = 0, options = {}) {
    const bytes = asBytes(value);
    const bitIndex = clamp(Math.floor(Number(bitIndexValue) || 0), 0, 7);
    const stride = Math.max(1, Math.floor(Number(options.stride) || 1));
    const offset = clamp(Math.floor(Number(options.offset) || 0), 0, Math.max(0, bytes.length));
    const invert = Boolean(options.invert);
    const bits = [];
    for (let index = offset; index < bytes.length; index += stride) bits.push(((bytes[index] >>> bitIndex) & 1) ^ (invert ? 1 : 0));
    return Object.freeze({ bitIndex, bitCount: bits.length, bytes: packBits(bits, options.bitOrder === 'lsb' ? 'lsb' : 'msb'), bits: Object.freeze(bits) });
  }

  function extractSelectedBits(value, bitIndexesValue = [0], options = {}) {
    const bytes = asBytes(value);
    const bitIndexes = Array.from(new Set(Array.from(bitIndexesValue || [0], item => clamp(Math.floor(Number(item) || 0), 0, 7))));
    const stride = Math.max(1, Math.floor(Number(options.stride) || 1));
    const offset = clamp(Math.floor(Number(options.offset) || 0), 0, Math.max(0, bytes.length));
    const bits = [];
    for (let index = offset; index < bytes.length; index += stride) {
      for (const bitIndex of bitIndexes) bits.push((bytes[index] >>> bitIndex) & 1);
    }
    return Object.freeze({ bitIndexes: Object.freeze(bitIndexes), bitCount: bits.length, bits: Object.freeze(bits), bytes: packBits(bits, options.bitOrder === 'lsb' ? 'lsb' : 'msb') });
  }

  function bitEntropy(bitsValue) {
    const bits = Array.from(bitsValue || []);
    if (!bits.length) return 0;
    let ones = 0;
    for (const bit of bits) if (bit) ones += 1;
    const p = ones / bits.length;
    if (p <= 0 || p >= 1) return 0;
    return -p * Math.log2(p) - (1 - p) * Math.log2(1 - p);
  }

  function bitPlaneDiagnostics(value) {
    const bytes = asBytes(value);
    return Object.freeze(Array.from({ length: 8 }, (_, bitIndex) => {
      let ones = 0;
      let transitions = 0;
      let previous = null;
      for (const byte of bytes) {
        const bit = (byte >>> bitIndex) & 1;
        ones += bit;
        if (previous !== null && previous !== bit) transitions += 1;
        previous = bit;
      }
      const oneFraction = bytes.length ? ones / bytes.length : 0;
      return Object.freeze({ bitIndex, oneFraction, entropy: bitEntropy(Array.from(bytes, byte => (byte >>> bitIndex) & 1)), transitionFraction: bytes.length > 1 ? transitions / (bytes.length - 1) : 0 });
    }));
  }

  function lsbPairChiSquare(value) {
    const bytes = asBytes(value);
    const counts = new Uint32Array(256);
    for (const byte of bytes) counts[byte] += 1;
    let statistic = 0;
    let usedPairs = 0;
    for (let even = 0; even < 256; even += 2) {
      const a = counts[even];
      const b = counts[even + 1];
      const expected = (a + b) / 2;
      if (expected <= 0) continue;
      statistic += ((a - expected) ** 2 + (b - expected) ** 2) / expected;
      usedPairs += 1;
    }
    return Object.freeze({ statistic, usedPairs, normalized: usedPairs ? statistic / usedPairs : 0, note: 'Pair-equalization χ² is a steganalysis clue, not a proof of LSB embedding or absence of embedding.' });
  }

  function bitAutocorrelation(bitsValue, maxLagValue = 64) {
    const bits = Array.from(bitsValue || [], bit => bit ? 1 : -1);
    const maxLag = Math.min(Math.max(1, Math.floor(Number(maxLagValue) || 64)), Math.max(1, bits.length - 1));
    const rows = [];
    for (let lag = 1; lag <= maxLag; lag += 1) {
      let sum = 0;
      const count = bits.length - lag;
      for (let index = 0; index < count; index += 1) sum += bits[index] * bits[index + lag];
      rows.push(Object.freeze({ lag, correlation: count ? sum / count : 0 }));
    }
    return Object.freeze(rows);
  }

  function entropyOfBytes(value) {
    const bytes = asBytes(value);
    if (!bytes.length) return 0;
    const counts = new Uint32Array(256);
    for (const byte of bytes) counts[byte] += 1;
    let entropy = 0;
    for (const count of counts) if (count) { const p = count / bytes.length; entropy -= p * Math.log2(p); }
    return entropy;
  }

  function printableFraction(value) {
    const bytes = asBytes(value);
    if (!bytes.length) return 0;
    let printable = 0;
    for (const byte of bytes) if (byte === 9 || byte === 10 || byte === 13 || byte >= 32 && byte <= 126) printable += 1;
    return printable / bytes.length;
  }

  function signatureForBytes(value) {
    const bytes = asBytes(value);
    const starts = (...values) => values.every((byte, index) => bytes[index] === byte);
    if (starts(0x25, 0x50, 0x44, 0x46)) return 'PDF';
    if (starts(0x50, 0x4b, 0x03, 0x04)) return 'ZIP / OOXML / JAR';
    if (starts(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)) return 'PNG';
    if (starts(0xff, 0xd8, 0xff)) return 'JPEG';
    if (starts(0x47, 0x49, 0x46, 0x38)) return 'GIF';
    if (starts(0x52, 0x49, 0x46, 0x46) && bytes.length >= 12 && String.fromCharCode(...bytes.slice(8, 12)) === 'WAVE') return 'WAV';
    if (starts(0x49, 0x44, 0x33)) return 'ID3 / encoded audio';
    if (starts(0x4f, 0x67, 0x67, 0x53)) return 'Ogg';
    if (starts(0x66, 0x4c, 0x61, 0x43)) return 'FLAC';
    return '';
  }

  function parseKernelMatrix(value) {
    const rows = String(value ?? '').trim().split(/\n|;/).map(row => row.trim()).filter(Boolean).map(row => row.split(/[\s,]+/).filter(Boolean).map(Number));
    if (!rows.length || rows.some(row => row.some(number => !Number.isFinite(number)))) fail('Kernel matrix must contain finite numeric values.');
    const width = rows[0].length;
    if (!width || rows.some(row => row.length !== width)) fail('Every convolution-kernel row must have the same width.');
    if (width > 15 || rows.length > 15) fail('Interactive convolution kernels are limited to 15×15.');
    return Object.freeze({ width, height: rows.length, values: Object.freeze(rows.flat()) });
  }

  function convolve1d(samplesValue, kernelValue, options = {}) {
    const samples = Array.from(samplesValue || [], Number);
    const kernel = Array.from(kernelValue || [], Number);
    if (!kernel.length || kernel.some(value => !Number.isFinite(value))) fail('A finite 1-D convolution kernel is required.');
    const output = new Float64Array(samples.length);
    const center = Math.floor(kernel.length / 2);
    const divisor = Number.isFinite(Number(options.divisor)) && Number(options.divisor) !== 0 ? Number(options.divisor) : 1;
    const bias = Number(options.bias) || 0;
    const boundary = options.boundary || 'clamp';
    for (let index = 0; index < samples.length; index += 1) {
      let sum = 0;
      for (let k = 0; k < kernel.length; k += 1) {
        let source = index + k - center;
        if (boundary === 'wrap' && samples.length) source = (source % samples.length + samples.length) % samples.length;
        else if (boundary === 'clamp') source = clamp(source, 0, Math.max(0, samples.length - 1));
        if (source >= 0 && source < samples.length) sum += samples[source] * kernel[k];
      }
      output[index] = sum / divisor + bias;
    }
    return output;
  }

  function crossCorrelate1d(leftValue, rightValue, maxLagValue = 64) {
    const left = Array.from(leftValue || [], Number);
    const right = Array.from(rightValue || [], Number);
    const maxLag = Math.max(0, Math.floor(Number(maxLagValue) || 64));
    const rows = [];
    for (let lag = -maxLag; lag <= maxLag; lag += 1) {
      let sumXY = 0; let sumX2 = 0; let sumY2 = 0; let count = 0;
      for (let index = 0; index < left.length; index += 1) {
        const other = index + lag;
        if (other < 0 || other >= right.length) continue;
        const x = left[index]; const y = right[other];
        sumXY += x * y; sumX2 += x * x; sumY2 += y * y; count += 1;
      }
      rows.push(Object.freeze({ lag, correlation: count && sumX2 && sumY2 ? sumXY / Math.sqrt(sumX2 * sumY2) : 0, count }));
    }
    return Object.freeze(rows);
  }

  function convolve2d(valuesValue, widthValue, heightValue, kernelValue, options = {}) {
    const values = Array.from(valuesValue || [], Number);
    const width = Math.floor(Number(widthValue) || 0);
    const height = Math.floor(Number(heightValue) || 0);
    if (width <= 0 || height <= 0 || width * height > values.length) fail('2-D convolution requires valid source dimensions.');
    const kernel = kernelValue?.values ? kernelValue : parseKernelMatrix(kernelValue);
    const output = new Float64Array(width * height);
    const centerX = Math.floor(kernel.width / 2);
    const centerY = Math.floor(kernel.height / 2);
    const divisor = Number(kernel.divisor || options.divisor || 1) || 1;
    const bias = Number(kernel.bias ?? options.bias ?? 0) || 0;
    const boundary = options.boundary || 'clamp';
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        let sum = 0;
        for (let ky = 0; ky < kernel.height; ky += 1) {
          for (let kx = 0; kx < kernel.width; kx += 1) {
            let sx = x + kx - centerX;
            let sy = y + ky - centerY;
            if (boundary === 'wrap') { sx = (sx % width + width) % width; sy = (sy % height + height) % height; }
            else if (boundary === 'clamp') { sx = clamp(sx, 0, width - 1); sy = clamp(sy, 0, height - 1); }
            if (sx >= 0 && sx < width && sy >= 0 && sy < height) sum += values[sy * width + sx] * kernel.values[ky * kernel.width + kx];
          }
        }
        output[y * width + x] = sum / divisor + bias;
      }
    }
    return output;
  }

  function nextPowerOfTwo(value) {
    let result = 1;
    while (result < value) result <<= 1;
    return result;
  }

  function fftReal(samplesValue, requestedSize = null) {
    const samples = Array.from(samplesValue || [], Number);
    let size = requestedSize ? nextPowerOfTwo(Math.max(2, Math.floor(requestedSize))) : nextPowerOfTwo(Math.max(2, samples.length));
    size = Math.min(size, 32768);
    const real = new Float64Array(size);
    const imag = new Float64Array(size);
    for (let index = 0; index < Math.min(samples.length, size); index += 1) real[index] = samples[index];
    for (let i = 1, j = 0; i < size; i += 1) {
      let bit = size >> 1;
      for (; j & bit; bit >>= 1) j ^= bit;
      j ^= bit;
      if (i < j) { const tempR = real[i]; real[i] = real[j]; real[j] = tempR; const tempI = imag[i]; imag[i] = imag[j]; imag[j] = tempI; }
    }
    for (let length = 2; length <= size; length <<= 1) {
      const angle = -2 * Math.PI / length;
      const wLenR = Math.cos(angle); const wLenI = Math.sin(angle);
      for (let start = 0; start < size; start += length) {
        let wr = 1; let wi = 0;
        for (let offset = 0; offset < length / 2; offset += 1) {
          const even = start + offset; const odd = even + length / 2;
          const vr = real[odd] * wr - imag[odd] * wi;
          const vi = real[odd] * wi + imag[odd] * wr;
          const ur = real[even]; const ui = imag[even];
          real[even] = ur + vr; imag[even] = ui + vi;
          real[odd] = ur - vr; imag[odd] = ui - vi;
          const nextWr = wr * wLenR - wi * wLenI;
          wi = wr * wLenI + wi * wLenR; wr = nextWr;
        }
      }
    }
    const magnitudes = new Float64Array(size / 2);
    for (let index = 0; index < magnitudes.length; index += 1) magnitudes[index] = Math.hypot(real[index], imag[index]);
    return Object.freeze({ size, real, imag, magnitudes });
  }

  function spectralSummary(samplesValue, sampleRateValue = 1, options = {}) {
    const samples = Array.from(samplesValue || [], Number);
    if (!samples.length) return Object.freeze({ fftSize: 0, centroidHz: 0, flatness: 0, dominant: Object.freeze([]) });
    const size = Math.min(nextPowerOfTwo(Math.min(samples.length, Number(options.fftSize) || 8192)), 32768);
    const windowed = new Float64Array(size);
    for (let index = 0; index < size; index += 1) {
      const sample = samples[index] || 0;
      const window = size > 1 ? 0.5 - 0.5 * Math.cos(2 * Math.PI * index / (size - 1)) : 1;
      windowed[index] = sample * window;
    }
    const spectrum = fftReal(windowed, size);
    const sampleRate = Number(sampleRateValue) || 1;
    let weighted = 0; let total = 0; let logSum = 0; let positive = 0;
    const peaks = [];
    for (let bin = 1; bin < spectrum.magnitudes.length; bin += 1) {
      const magnitude = spectrum.magnitudes[bin];
      const frequency = bin * sampleRate / spectrum.size;
      total += magnitude; weighted += frequency * magnitude;
      if (magnitude > 0) { logSum += Math.log(magnitude); positive += 1; }
      if (bin > 1 && bin + 1 < spectrum.magnitudes.length && magnitude >= spectrum.magnitudes[bin - 1] && magnitude >= spectrum.magnitudes[bin + 1]) peaks.push({ frequency, magnitude });
    }
    const arithmetic = total / Math.max(1, spectrum.magnitudes.length - 1);
    const geometric = positive ? Math.exp(logSum / positive) : 0;
    peaks.sort((a, b) => b.magnitude - a.magnitude);
    return Object.freeze({ fftSize: spectrum.size, centroidHz: total ? weighted / total : 0, flatness: arithmetic ? geometric / arithmetic : 0, dominant: Object.freeze(peaks.slice(0, 12).map(item => Object.freeze(item))) });
  }

  function goertzelPower(samplesValue, sampleRateValue, frequencyValue) {
    const samples = samplesValue || [];
    const sampleRate = Number(sampleRateValue) || 1;
    const frequency = clamp(Number(frequencyValue) || 0, 0, sampleRate / 2);
    if (!samples.length || !frequency) return 0;
    const omega = 2 * Math.PI * frequency / sampleRate;
    const coefficient = 2 * Math.cos(omega);
    let previous = 0; let previous2 = 0;
    for (const sample of samples) {
      const current = Number(sample) + coefficient * previous - previous2;
      previous2 = previous; previous = current;
    }
    return previous2 * previous2 + previous * previous - coefficient * previous * previous2;
  }

  function rms(samplesValue) {
    const samples = samplesValue || [];
    if (!samples.length) return 0;
    let sum = 0;
    for (const sample of samples) sum += Number(sample) ** 2;
    return Math.sqrt(sum / samples.length);
  }

  function audioStatistics(samplesValue) {
    const samples = Array.from(samplesValue || [], Number);
    if (!samples.length) return Object.freeze({ rms: 0, peak: 0, dc: 0, zeroCrossingRate: 0 });
    let sum = 0; let square = 0; let peak = 0; let crossings = 0;
    for (let index = 0; index < samples.length; index += 1) {
      const sample = samples[index]; sum += sample; square += sample * sample; peak = Math.max(peak, Math.abs(sample));
      if (index && (samples[index - 1] < 0) !== (sample < 0)) crossings += 1;
    }
    return Object.freeze({ rms: Math.sqrt(square / samples.length), peak, dc: sum / samples.length, zeroCrossingRate: samples.length > 1 ? crossings / (samples.length - 1) : 0 });
  }

  function decodeDtmf(samplesValue, sampleRateValue, options = {}) {
    const samples = Array.from(samplesValue || [], Number);
    const sampleRate = Number(sampleRateValue) || 1;
    const frameMs = clamp(Number(options.frameMs) || 40, 20, 120);
    const hopMs = clamp(Number(options.hopMs) || frameMs / 2, 10, frameMs);
    const frameSize = Math.max(32, Math.floor(sampleRate * frameMs / 1000));
    const hop = Math.max(16, Math.floor(sampleRate * hopMs / 1000));
    const frames = [];
    for (let offset = 0; offset + frameSize <= samples.length; offset += hop) {
      const frame = samples.slice(offset, offset + frameSize);
      const rowPower = DTMF_ROWS.map(frequency => goertzelPower(frame, sampleRate, frequency));
      const columnPower = DTMF_COLUMNS.map(frequency => goertzelPower(frame, sampleRate, frequency));
      const rowIndex = rowPower.indexOf(Math.max(...rowPower));
      const columnIndex = columnPower.indexOf(Math.max(...columnPower));
      const rowSorted = [...rowPower].sort((a, b) => b - a); const columnSorted = [...columnPower].sort((a, b) => b - a);
      const rowRatio = rowSorted[1] > 0 ? rowSorted[0] / rowSorted[1] : Infinity;
      const columnRatio = columnSorted[1] > 0 ? columnSorted[0] / columnSorted[1] : Infinity;
      const signal = rms(frame);
      const valid = signal > (Number(options.minimumRms) || 0.005) && rowRatio >= (Number(options.minimumRatio) || 2.2) && columnRatio >= (Number(options.minimumRatio) || 2.2);
      frames.push(Object.freeze({ offset, timeSeconds: offset / sampleRate, key: valid ? DTMF_KEYS[rowIndex][columnIndex] : '', rowFrequency: DTMF_ROWS[rowIndex], columnFrequency: DTMF_COLUMNS[columnIndex], rowRatio, columnRatio, rms: signal }));
    }
    const keys = [];
    let previous = '';
    for (const frame of frames) {
      if (frame.key && frame.key !== previous) keys.push(frame.key);
      previous = frame.key;
    }
    return Object.freeze({ keys: keys.join(''), frames: Object.freeze(frames) });
  }

  function decodeBinaryFsk(samplesValue, sampleRateValue, options = {}) {
    const samples = Array.from(samplesValue || [], Number);
    const sampleRate = Number(sampleRateValue) || 1;
    const markFrequency = Number(options.markFrequency) || 1200;
    const spaceFrequency = Number(options.spaceFrequency) || 2200;
    const baud = Number(options.baud) || 1200;
    const samplesPerSymbol = sampleRate / baud;
    if (samplesPerSymbol < 4) fail('Sample rate is too low for the requested FSK baud rate.');
    const phases = Math.max(1, Math.min(16, Math.floor(samplesPerSymbol)));
    let best = null;
    for (let phaseIndex = 0; phaseIndex < phases; phaseIndex += 1) {
      const phase = Math.floor(phaseIndex * samplesPerSymbol / phases);
      const bits = []; const confidences = [];
      for (let offset = phase; offset + samplesPerSymbol <= samples.length; offset += samplesPerSymbol) {
        const start = Math.floor(offset); const end = Math.min(samples.length, Math.floor(offset + samplesPerSymbol));
        const frame = samples.slice(start, end);
        const mark = goertzelPower(frame, sampleRate, markFrequency); const space = goertzelPower(frame, sampleRate, spaceFrequency);
        const total = mark + space;
        bits.push(mark >= space ? 1 : 0); confidences.push(total ? Math.abs(mark - space) / total : 0);
      }
      const meanConfidence = confidences.length ? confidences.reduce((sum, value) => sum + value, 0) / confidences.length : 0;
      if (!best || meanConfidence > best.meanConfidence) best = { phase, bits, confidences, meanConfidence };
    }
    const bits = best?.bits || [];
    return Object.freeze({ markFrequency, spaceFrequency, baud, samplesPerSymbol, phase: best?.phase || 0, meanConfidence: best?.meanConfidence || 0, bits: Object.freeze(bits), bytesMsb: packBits(bits, 'msb'), bytesLsb: packBits(bits, 'lsb') });
  }

  function decodeOnOffKeying(samplesValue, sampleRateValue, options = {}) {
    const samples = Array.from(samplesValue || [], Number);
    const sampleRate = Number(sampleRateValue) || 1;
    const baud = Number(options.baud) || 100;
    const carrierFrequency = Number(options.carrierFrequency) || 0;
    const samplesPerSymbol = sampleRate / baud;
    if (samplesPerSymbol < 2) fail('Sample rate is too low for the requested OOK baud rate.');
    const energies = [];
    for (let offset = 0; offset + samplesPerSymbol <= samples.length; offset += samplesPerSymbol) {
      const frame = samples.slice(Math.floor(offset), Math.floor(offset + samplesPerSymbol));
      energies.push(carrierFrequency > 0 ? goertzelPower(frame, sampleRate, carrierFrequency) / Math.max(1, frame.length ** 2) : rms(frame));
    }
    const sorted = [...energies].sort((a, b) => a - b);
    const threshold = Number.isFinite(Number(options.threshold)) ? Number(options.threshold) : sorted[Math.floor(sorted.length / 2)] || 0;
    const bits = energies.map(value => value > threshold ? 1 : 0);
    return Object.freeze({ baud, carrierFrequency, threshold, energies: Object.freeze(energies), bits: Object.freeze(bits), bytesMsb: packBits(bits, 'msb'), bytesLsb: packBits(bits, 'lsb') });
  }

  function parseRiffChunks(value) {
    const bytes = asBytes(value);
    if (bytes.length < 12 || String.fromCharCode(...bytes.slice(0, 4)) !== 'RIFF') return null;
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const formType = String.fromCharCode(...bytes.slice(8, 12));
    const chunks = [];
    let offset = 12;
    while (offset + 8 <= bytes.length) {
      const id = String.fromCharCode(...bytes.slice(offset, offset + 4));
      const size = view.getUint32(offset + 4, true);
      const dataOffset = offset + 8;
      const end = Math.min(bytes.length, dataOffset + size);
      chunks.push(Object.freeze({ id, offset, dataOffset, size, availableSize: end - dataOffset }));
      offset = dataOffset + size + (size & 1);
      if (offset <= dataOffset) break;
    }
    return Object.freeze({ formType, declaredSize: view.getUint32(4, true), chunks: Object.freeze(chunks), trailingOffset: Math.min(bytes.length, offset), trailingBytes: Math.max(0, bytes.length - offset) });
  }

  function parseWav(value) {
    const bytes = asBytes(value);
    const riff = parseRiffChunks(bytes);
    if (!riff || riff.formType !== 'WAVE') return null;
    const fmt = riff.chunks.find(chunk => chunk.id === 'fmt ');
    const data = riff.chunks.find(chunk => chunk.id === 'data');
    if (!fmt || !data || fmt.availableSize < 16) return Object.freeze({ ...riff, valid: false, reason: 'WAVE container is missing a complete fmt or data chunk.' });
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const audioFormat = view.getUint16(fmt.dataOffset, true);
    const channels = view.getUint16(fmt.dataOffset + 2, true);
    const sampleRate = view.getUint32(fmt.dataOffset + 4, true);
    const byteRate = view.getUint32(fmt.dataOffset + 8, true);
    const blockAlign = view.getUint16(fmt.dataOffset + 12, true);
    const bitsPerSample = view.getUint16(fmt.dataOffset + 14, true);
    const frameCount = blockAlign ? Math.floor(data.availableSize / blockAlign) : 0;
    return Object.freeze({ ...riff, valid: true, audioFormat, channels, sampleRate, byteRate, blockAlign, bitsPerSample, frameCount, durationSeconds: sampleRate ? frameCount / sampleRate : 0, dataOffset: data.dataOffset, dataSize: data.availableSize, dataChunk: data, formatChunk: fmt, pcmInteger: audioFormat === 1, ieeeFloat: audioFormat === 3 });
  }

  function decodeWavChannels(value, wavValue = null, options = {}) {
    const bytes = asBytes(value);
    const wav = wavValue || parseWav(bytes);
    if (!wav?.valid) fail('A valid WAVE file is required.');
    if (!wav.pcmInteger && !wav.ieeeFloat) fail(`WAVE format ${wav.audioFormat} is not directly decoded by the raw PCM analyzer; use browser media decoding when available.`);
    const maxFrames = Math.min(wav.frameCount, Math.max(1, Math.floor(Number(options.maxFrames) || wav.frameCount)));
    const channels = Array.from({ length: wav.channels }, () => new Float32Array(maxFrames));
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const bytesPerSample = Math.ceil(wav.bitsPerSample / 8);
    for (let frame = 0; frame < maxFrames; frame += 1) {
      for (let channel = 0; channel < wav.channels; channel += 1) {
        const offset = wav.dataOffset + frame * wav.blockAlign + channel * bytesPerSample;
        let sample = 0;
        if (wav.ieeeFloat && wav.bitsPerSample === 32) sample = view.getFloat32(offset, true);
        else if (wav.ieeeFloat && wav.bitsPerSample === 64) sample = view.getFloat64(offset, true);
        else if (wav.bitsPerSample === 8) sample = (view.getUint8(offset) - 128) / 128;
        else if (wav.bitsPerSample === 16) sample = view.getInt16(offset, true) / 32768;
        else if (wav.bitsPerSample === 24) {
          let raw = view.getUint8(offset) | view.getUint8(offset + 1) << 8 | view.getUint8(offset + 2) << 16;
          if (raw & 0x800000) raw |= 0xff000000;
          sample = raw / 8388608;
        } else if (wav.bitsPerSample === 32) sample = view.getInt32(offset, true) / 2147483648;
        else fail(`Unsupported PCM sample width ${wav.bitsPerSample}.`);
        channels[channel][frame] = clamp(sample, -1, 1);
      }
    }
    return Object.freeze({ wav, channels: Object.freeze(channels), frameCount: maxFrames });
  }

  function rawPcmSampleUnsigned(bytes, offset, bytesPerSample) {
    let value = 0n;
    for (let index = 0; index < bytesPerSample; index += 1) value |= BigInt(bytes[offset + index] || 0) << BigInt(index * 8);
    return value;
  }

  function extractPcmSampleBitPlane(value, wavValue, bitIndexValue = 0, channelValue = 0, options = {}) {
    const bytes = asBytes(value); const wav = wavValue || parseWav(bytes);
    if (!wav?.valid || !wav.pcmInteger) fail('PCM integer WAVE input is required for sample-bit-plane extraction.');
    const bitIndex = clamp(Math.floor(Number(bitIndexValue) || 0), 0, Math.max(0, wav.bitsPerSample - 1));
    const channel = clamp(Math.floor(Number(channelValue) || 0), 0, Math.max(0, wav.channels - 1));
    const bytesPerSample = Math.ceil(wav.bitsPerSample / 8);
    const bits = [];
    for (let frame = 0; frame < wav.frameCount; frame += Math.max(1, Math.floor(Number(options.frameStride) || 1))) {
      const offset = wav.dataOffset + frame * wav.blockAlign + channel * bytesPerSample;
      const raw = rawPcmSampleUnsigned(bytes, offset, bytesPerSample);
      bits.push(Number((raw >> BigInt(bitIndex)) & 1n));
    }
    return Object.freeze({ bitIndex, channel, bitCount: bits.length, bits: Object.freeze(bits), bytes: packBits(bits, options.bitOrder === 'lsb' ? 'lsb' : 'msb') });
  }

  function extractPcmDeltaBitPlane(value, wavValue, bitIndexValue = 0, channelValue = 0, options = {}) {
    const bytes = asBytes(value); const wav = wavValue || parseWav(bytes);
    if (!wav?.valid || !wav.pcmInteger) fail('PCM integer WAVE input is required for delta-bit extraction.');
    const bitIndex = clamp(Math.floor(Number(bitIndexValue) || 0), 0, Math.max(0, wav.bitsPerSample - 1));
    const channel = clamp(Math.floor(Number(channelValue) || 0), 0, Math.max(0, wav.channels - 1));
    const bytesPerSample = Math.ceil(wav.bitsPerSample / 8);
    const mask = (1n << BigInt(wav.bitsPerSample)) - 1n;
    const bits = [];
    let previous = null;
    for (let frame = 0; frame < wav.frameCount; frame += 1) {
      const offset = wav.dataOffset + frame * wav.blockAlign + channel * bytesPerSample;
      const raw = rawPcmSampleUnsigned(bytes, offset, bytesPerSample);
      if (previous !== null) {
        const delta = (raw - previous) & mask;
        bits.push(Number((delta >> BigInt(bitIndex)) & 1n));
      }
      previous = raw;
    }
    return Object.freeze({ bitIndex, channel, bitCount: bits.length, bits: Object.freeze(bits), bytes: packBits(bits, options.bitOrder === 'lsb' ? 'lsb' : 'msb') });
  }

  function stereoDifference(channelsValue) {
    const channels = channelsValue || [];
    if (channels.length < 2) return new Float32Array(0);
    const length = Math.min(channels[0].length, channels[1].length);
    const output = new Float32Array(length);
    for (let index = 0; index < length; index += 1) output[index] = (channels[0][index] - channels[1][index]) * 0.5;
    return output;
  }

  function parsePngChunks(value) {
    const bytes = asBytes(value);
    const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
    if (bytes.length < 8 || !signature.every((byte, index) => bytes[index] === byte)) return null;
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const chunks = [];
    let offset = 8; let endOffset = 8;
    while (offset + 12 <= bytes.length) {
      const length = view.getUint32(offset, false);
      const type = String.fromCharCode(...bytes.slice(offset + 4, offset + 8));
      const dataOffset = offset + 8;
      const crcOffset = dataOffset + length;
      if (crcOffset + 4 > bytes.length) break;
      chunks.push(Object.freeze({ type, offset, dataOffset, length, crcOffset }));
      endOffset = crcOffset + 4; offset = endOffset;
      if (type === 'IEND') break;
    }
    return Object.freeze({ chunks: Object.freeze(chunks), endOffset, trailingBytes: Math.max(0, bytes.length - endOffset) });
  }

  function parseJpegSegments(value) {
    const bytes = asBytes(value);
    if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return null;
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const segments = [];
    let offset = 2; let eoiOffset = -1;
    while (offset + 1 < bytes.length) {
      if (bytes[offset] !== 0xff) { offset += 1; continue; }
      while (offset < bytes.length && bytes[offset] === 0xff) offset += 1;
      if (offset >= bytes.length) break;
      const marker = bytes[offset++];
      if (marker === 0xd9) { eoiOffset = offset; break; }
      if (marker === 0xda) {
        if (offset + 2 > bytes.length) break;
        const headerLength = view.getUint16(offset, false); offset += headerLength;
        while (offset + 1 < bytes.length) {
          if (bytes[offset] === 0xff && bytes[offset + 1] === 0xd9) { eoiOffset = offset + 2; offset = eoiOffset; break; }
          if (bytes[offset] === 0xff && bytes[offset + 1] === 0x00) offset += 2;
          else offset += 1;
        }
        break;
      }
      if ((marker >= 0xd0 && marker <= 0xd7) || marker === 0x01) continue;
      if (offset + 2 > bytes.length) break;
      const length = view.getUint16(offset, false);
      const start = offset - 2;
      const dataOffset = offset + 2;
      segments.push(Object.freeze({ marker, markerHex: `FF${marker.toString(16).padStart(2, '0').toUpperCase()}`, offset: start, dataOffset, length: Math.max(0, length - 2) }));
      offset += length;
    }
    return Object.freeze({ segments: Object.freeze(segments), eoiOffset, trailingBytes: eoiOffset >= 0 ? Math.max(0, bytes.length - eoiOffset) : 0 });
  }

  function parseId3v2(value) {
    const bytes = asBytes(value);
    if (bytes.length < 10 || String.fromCharCode(...bytes.slice(0, 3)) !== 'ID3') return null;
    const size = ((bytes[6] & 0x7f) << 21) | ((bytes[7] & 0x7f) << 14) | ((bytes[8] & 0x7f) << 7) | (bytes[9] & 0x7f);
    return Object.freeze({ versionMajor: bytes[3], versionRevision: bytes[4], flags: bytes[5], payloadSize: size, totalSize: Math.min(bytes.length, 10 + size), trailingBytes: Math.max(0, bytes.length - (10 + size)) });
  }

  function scanContainer(value) {
    const bytes = asBytes(value);
    const type = signatureForBytes(bytes);
    const png = parsePngChunks(bytes);
    const jpeg = parseJpegSegments(bytes);
    const riff = parseRiffChunks(bytes);
    const id3 = parseId3v2(bytes);
    let trailingOffset = bytes.length;
    if (png) trailingOffset = png.endOffset;
    else if (jpeg?.eoiOffset >= 0) trailingOffset = jpeg.eoiOffset;
    else if (riff) trailingOffset = Math.min(bytes.length, 8 + riff.declaredSize);
    else if (id3) trailingOffset = id3.totalSize;
    const trailing = bytes.slice(trailingOffset);
    return Object.freeze({ type, png, jpeg, riff, id3, trailingOffset, trailingBytes: trailing.length, trailingSignature: signatureForBytes(trailing), trailingPreviewHex: bytesToHex(trailing.slice(0, 128), ' ') });
  }

  function extractRasterChannel(rgbaValue, channelValue = 'r') {
    const rgba = asBytes(rgbaValue);
    const channel = String(channelValue || 'r').toLowerCase();
    const output = new Uint8Array(Math.floor(rgba.length / 4));
    const index = { r: 0, g: 1, b: 2, a: 3 }[channel];
    for (let pixel = 0; pixel < output.length; pixel += 1) {
      const offset = pixel * 4;
      if (index !== undefined) output[pixel] = rgba[offset + index];
      else output[pixel] = Math.round(rgba[offset] * 0.2126 + rgba[offset + 1] * 0.7152 + rgba[offset + 2] * 0.0722);
    }
    return output;
  }

  function extractRasterLsb(rgbaValue, options = {}) {
    const rgba = asBytes(rgbaValue);
    const selected = String(options.channels || 'rgb').toLowerCase().split('').filter(channel => 'rgba'.includes(channel));
    const channels = selected.length ? selected : ['r', 'g', 'b'];
    const indexes = { r: 0, g: 1, b: 2, a: 3 };
    const bitIndex = clamp(Math.floor(Number(options.bitIndex) || 0), 0, 7);
    const pixelStride = Math.max(1, Math.floor(Number(options.pixelStride) || 1));
    const bits = [];
    const pixelCount = Math.floor(rgba.length / 4);
    for (let pixel = Math.max(0, Math.floor(Number(options.pixelOffset) || 0)); pixel < pixelCount; pixel += pixelStride) {
      for (const channel of channels) bits.push((rgba[pixel * 4 + indexes[channel]] >>> bitIndex) & 1);
    }
    return Object.freeze({ channels: channels.join(''), bitIndex, bitCount: bits.length, bits: Object.freeze(bits), bytes: packBits(bits, options.bitOrder === 'lsb' ? 'lsb' : 'msb') });
  }

  function rasterBitPlaneImage(rgbaValue, bitIndexValue = 0, channelValue = 'rgb') {
    const rgba = asBytes(rgbaValue);
    const bitIndex = clamp(Math.floor(Number(bitIndexValue) || 0), 0, 7);
    const channels = String(channelValue || 'rgb').toLowerCase();
    const indexes = ['r', 'g', 'b'].filter(channel => channels.includes(channel)).map(channel => ({ r: 0, g: 1, b: 2 }[channel]));
    const selected = indexes.length ? indexes : [0, 1, 2];
    const output = new Uint8ClampedArray(rgba.length);
    for (let pixel = 0; pixel < Math.floor(rgba.length / 4); pixel += 1) {
      let sum = 0;
      for (const index of selected) sum += (rgba[pixel * 4 + index] >>> bitIndex) & 1;
      const value = sum / selected.length >= 0.5 ? 255 : 0;
      output[pixel * 4] = value; output[pixel * 4 + 1] = value; output[pixel * 4 + 2] = value; output[pixel * 4 + 3] = 255;
    }
    return output;
  }

  function convolveRasterChannel(rgbaValue, widthValue, heightValue, kernelValue, channelValue = 'luma', options = {}) {
    const rgba = asBytes(rgbaValue); const width = Math.floor(Number(widthValue) || 0); const height = Math.floor(Number(heightValue) || 0);
    if (rgba.length < width * height * 4) fail('RGBA source is smaller than the declared raster dimensions.');
    const channel = extractRasterChannel(rgba, channelValue);
    const filtered = convolve2d(channel, width, height, kernelValue, options);
    const output = new Uint8ClampedArray(width * height * 4);
    let min = Infinity; let max = -Infinity;
    for (const value of filtered) { min = Math.min(min, value); max = Math.max(max, value); }
    const autoScale = options.autoScale !== false && max > min;
    for (let index = 0; index < filtered.length; index += 1) {
      const value = autoScale ? 255 * (filtered[index] - min) / (max - min) : clamp(filtered[index], 0, 255);
      output[index * 4] = value; output[index * 4 + 1] = value; output[index * 4 + 2] = value; output[index * 4 + 3] = 255;
    }
    return Object.freeze({ values: filtered, rgba: output, minimum: min, maximum: max, width, height });
  }

  function byteSweep(value) {
    const bytes = asBytes(value);
    const planes = bitPlaneDiagnostics(bytes);
    const candidates = [];
    for (let bit = 0; bit < 8; bit += 1) {
      for (const order of ['msb', 'lsb']) {
        const extracted = extractByteBitPlane(bytes, bit, { bitOrder: order });
        candidates.push(Object.freeze({ method: `byte bit-plane ${bit} · ${order.toUpperCase()} packing`, byteLength: extracted.bytes.length, entropy: entropyOfBytes(extracted.bytes), printable: printableFraction(extracted.bytes), signature: signatureForBytes(extracted.bytes), preview: bytesToText(extracted.bytes.slice(0, MAX_PREVIEW_BYTES)), hexPreview: bytesToHex(extracted.bytes.slice(0, 160), ' ') }));
      }
    }
    candidates.sort((a, b) => (b.signature ? 1 : 0) - (a.signature ? 1 : 0) || b.printable - a.printable || a.entropy - b.entropy);
    return Object.freeze({ byteLength: bytes.length, entropy: entropyOfBytes(bytes), signature: signatureForBytes(bytes), lsbPair: lsbPairChiSquare(bytes), planes, container: scanContainer(bytes), candidates: Object.freeze(candidates) });
  }

  function wavSweep(value) {
    const bytes = asBytes(value);
    const wav = parseWav(bytes);
    if (!wav?.valid) return null;
    const report = { wav, sampleBitPlanes: [], channelStats: [], spectra: [], stereo: null };
    if (wav.pcmInteger) {
      const maxBit = Math.min(wav.bitsPerSample, 8);
      for (let channel = 0; channel < wav.channels; channel += 1) {
        for (let bit = 0; bit < maxBit; bit += 1) {
          const extraction = extractPcmSampleBitPlane(bytes, wav, bit, channel, { bitOrder: 'msb' });
          report.sampleBitPlanes.push(Object.freeze({ channel, bit, printable: printableFraction(extraction.bytes), entropy: entropyOfBytes(extraction.bytes), signature: signatureForBytes(extraction.bytes), preview: bytesToText(extraction.bytes.slice(0, 1024)), hexPreview: bytesToHex(extraction.bytes.slice(0, 96), ' ') }));
        }
      }
    }
    try {
      const decoded = decodeWavChannels(bytes, wav, { maxFrames: Math.min(wav.frameCount, wav.sampleRate * 30) });
      for (let channel = 0; channel < decoded.channels.length; channel += 1) {
        report.channelStats.push(audioStatistics(decoded.channels[channel]));
        report.spectra.push(spectralSummary(decoded.channels[channel], wav.sampleRate));
      }
      if (decoded.channels.length >= 2) report.stereo = Object.freeze({ difference: audioStatistics(stereoDifference(decoded.channels)), correlation: crossCorrelate1d(decoded.channels[0].slice(0, 65536), decoded.channels[1].slice(0, 65536), 16) });
    } catch (error) { report.decodeNote = error.message; }
    return Object.freeze({ ...report, sampleBitPlanes: Object.freeze(report.sampleBitPlanes), channelStats: Object.freeze(report.channelStats), spectra: Object.freeze(report.spectra) });
  }

  function fullForensicSweep(value) {
    const bytes = asBytes(value);
    if (!bytes.length) fail('Load data before forensic analysis.');
    if (bytes.length > MAX_INPUT_BYTES) fail(`Input exceeds the ${MAX_INPUT_BYTES.toLocaleString()} byte forensic-analysis limit.`);
    return Object.freeze({ bytes: byteSweep(bytes), wav: wavSweep(bytes), caveat: 'Steganalysis and signal-decoding results are hypotheses and extraction aids. Statistical anomalies, readable fragments, or tone matches are not proof of intentional hiding without corroborating evidence.' });
  }

  function ensureStyle() {
    if (!root?.document || root.document.getElementById(STYLE_ID)) return;
    const link = root.document.createElement('link'); link.id = STYLE_ID; link.rel = 'stylesheet'; link.href = 'binary-cube-media-forensics-suite.css?v=20260809-media-forensics-1'; root.document.head.appendChild(link);
  }

  function clearWorkerHeartbeat() { if (workerHeartbeat) { root?.clearInterval?.(workerHeartbeat); workerHeartbeat = 0; } }
  function cleanupWorker() { clearWorkerHeartbeat(); if (activeWorker) activeWorker.terminate(); activeWorker = null; activeWorkerReject = null; }
  function cancelWorker(reason = 'forensic analysis cancelled') {
    const reject = activeWorkerReject; clearWorkerHeartbeat(); if (activeWorker) activeWorker.terminate(); activeWorker = null; activeWorkerReject = null;
    if (reject) { const error = new Error(reason); error.name = 'AbortError'; reject(error); }
  }

  function fullForensicSweepAsync(value, hooks = {}) {
    const bytes = asBytes(value);
    if (!bytes.length) return Promise.reject(new Error('Load data before forensic analysis.'));
    if (typeof root?.Worker !== 'function') return Promise.resolve(fullForensicSweep(bytes));
    cancelWorker('superseded by newer forensic sweep');
    const id = ++requestCounter; const startedAt = Date.now(); const onProgress = typeof hooks.onProgress === 'function' ? hooks.onProgress : null;
    const worker = new root.Worker(new URL(WORKER_URL, root.document?.baseURI || root.location?.href || '').href); activeWorker = worker;
    return new Promise((resolve, reject) => {
      activeWorkerReject = reject; let stage = 'Starting media forensic worker'; let fraction = 0;
      const emit = heartbeat => onProgress?.(Object.freeze({ stage: heartbeat ? `${stage} · still working` : stage, fraction, heartbeat, elapsedMilliseconds: Date.now() - startedAt }));
      workerHeartbeat = root.setInterval?.(() => emit(true), WORKER_HEARTBEAT_MS) || 0; emit(false);
      worker.addEventListener('message', event => {
        const message = event.data || {}; if (message.id !== id || worker !== activeWorker) return;
        if (message.type === 'progress') { stage = String(message.stage || 'Working'); fraction = clamp(Number(message.fraction) || 0, 0, 1); emit(false); return; }
        cleanupWorker();
        if (message.type === 'result') resolve(message.report);
        else { const error = new Error(message.error?.message || 'Media forensic worker failed.'); error.name = message.error?.name || 'Error'; reject(error); }
      });
      worker.addEventListener('error', event => { if (worker !== activeWorker) return; cleanupWorker(); reject(new Error(event.message || 'Media forensic worker crashed.')); });
      const transferable = bytes.slice(); worker.postMessage({ id, operation: 'full-sweep', bytes: transferable.buffer }, [transferable.buffer]);
    });
  }

  async function decodeBrowserAudio(value) {
    if (!root?.AudioContext && !root?.webkitAudioContext) fail('Browser audio decoding is unavailable.');
    const Context = root.AudioContext || root.webkitAudioContext; const context = new Context();
    try {
      const source = asBytes(value); const copy = source.buffer.slice(source.byteOffset, source.byteOffset + source.byteLength);
      const buffer = await context.decodeAudioData(copy);
      const channels = [];
      for (let channel = 0; channel < buffer.numberOfChannels; channel += 1) channels.push(Float32Array.from(buffer.getChannelData(channel)));
      return Object.freeze({ sampleRate: buffer.sampleRate, channels: Object.freeze(channels), frameCount: buffer.length, durationSeconds: buffer.duration, source: 'Web Audio decodeAudioData' });
    } finally { try { await context.close(); } catch (_) { /* ignore */ } }
  }

  async function decodeBrowserRaster(value, mimeType = '') {
    if (!root?.document || typeof root.createImageBitmap !== 'function') fail('Browser raster decoding is unavailable.');
    const bytes = asBytes(value); const blob = new Blob([bytes], { type: mimeType || 'application/octet-stream' }); const bitmap = await root.createImageBitmap(blob);
    try {
      if (bitmap.width * bitmap.height > MAX_RASTER_PIXELS) fail(`Decoded raster exceeds ${MAX_RASTER_PIXELS.toLocaleString()} pixels.`);
      const canvas = root.document.createElement('canvas'); canvas.width = bitmap.width; canvas.height = bitmap.height;
      const context = canvas.getContext('2d', { willReadFrequently: true }); context.drawImage(bitmap, 0, 0); const imageData = context.getImageData(0, 0, bitmap.width, bitmap.height);
      return Object.freeze({ width: bitmap.width, height: bitmap.height, rgba: Uint8ClampedArray.from(imageData.data), source: 'createImageBitmap + Canvas 2D' });
    } finally { bitmap.close?.(); }
  }

  function formatPercent(value) { return `${(Number(value || 0) * 100).toFixed(2)}%`; }
  function formatNumber(value, digits = 4) { return Number.isFinite(Number(value)) ? Number(value).toFixed(digits) : '—'; }
  function setStatus(message, kind = '') { const node = panel?.querySelector('[data-bmfs-status]'); if (node) { node.textContent = message; node.dataset.kind = kind; } }

  function downloadBytes(value, filename = 'extracted-data.bin') {
    const bytes = asBytes(value); const blob = new Blob([bytes], { type: 'application/octet-stream' }); const url = URL.createObjectURL(blob); const link = root.document.createElement('a'); link.href = url; link.download = filename.replace(/[<>:"/\\|?*\u0000-\u001f]+/g, '-'); root.document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(url);
  }

  function drawRasterPreview(rgbaValue, width, height, canvas) {
    if (!canvas) return; canvas.width = width; canvas.height = height; const context = canvas.getContext('2d'); const data = new ImageData(new Uint8ClampedArray(rgbaValue), width, height); context.putImageData(data, 0, 0);
  }

  function drawWaveform(samplesValue, canvas) {
    if (!canvas) return; const samples = samplesValue || []; const width = canvas.width = Math.max(420, canvas.clientWidth || 720); const height = canvas.height = 180; const context = canvas.getContext('2d'); context.clearRect(0, 0, width, height); context.beginPath();
    const step = Math.max(1, Math.floor(samples.length / width));
    for (let x = 0; x < width; x += 1) { let min = 1; let max = -1; for (let index = x * step; index < Math.min(samples.length, (x + 1) * step); index += 1) { min = Math.min(min, samples[index]); max = Math.max(max, samples[index]); } const y1 = height * (0.5 - max * 0.45); const y2 = height * (0.5 - min * 0.45); context.moveTo(x, y1); context.lineTo(x, y2); } context.stroke();
  }

  function renderSweep(report) {
    latestSweep = report; const target = panel?.querySelector('[data-bmfs-overview]'); if (!target) return;
    const bytes = report.bytes; const container = bytes.container; const planes = bytes.planes.map(row => `<tr><td>${row.bitIndex}</td><td>${formatPercent(row.oneFraction)}</td><td>${formatNumber(row.entropy, 4)}</td><td>${formatPercent(row.transitionFraction)}</td></tr>`).join('');
    const candidates = bytes.candidates.slice(0, 12).map((candidate, index) => `<article class="bmfs-candidate"><header><strong>${esc(candidate.method)}</strong><span>${candidate.signature ? esc(candidate.signature) : `${formatPercent(candidate.printable)} printable`}</span></header><pre>${esc(candidate.preview || '(no readable preview)')}</pre><code>${esc(candidate.hexPreview)}</code></article>`).join('');
    target.innerHTML = `<section class="bmfs-card bmfs-verdict"><h3>Byte-level steganography sweep</h3><div class="bmfs-metrics"><div><span>Bytes</span><strong>${bytes.byteLength.toLocaleString()}</strong></div><div><span>Entropy</span><strong>${formatNumber(bytes.entropy, 5)} / 8</strong></div><div><span>Signature</span><strong>${esc(bytes.signature || 'none')}</strong></div><div><span>LSB pair χ² / pair</span><strong>${formatNumber(bytes.lsbPair.normalized, 4)}</strong></div></div><p>${esc(report.caveat)}</p></section><section class="bmfs-card"><h3>Bit-plane diagnostics</h3><div class="bmfs-table-scroll"><table><thead><tr><th>Bit</th><th>1 fraction</th><th>Entropy</th><th>Transitions</th></tr></thead><tbody>${planes}</tbody></table></div></section><section class="bmfs-card"><h3>Container / appended-data scan</h3><div class="bmfs-metrics"><div><span>Detected</span><strong>${esc(container.type || 'unknown/raw')}</strong></div><div><span>Trailing bytes</span><strong>${container.trailingBytes.toLocaleString()}</strong></div><div><span>Trailing signature</span><strong>${esc(container.trailingSignature || 'none')}</strong></div></div><code>${esc(container.trailingPreviewHex || '')}</code></section><section class="bmfs-card"><h3>Top packed bit-plane candidates</h3>${candidates}</section>${report.wav ? renderWavSweepHtml(report.wav) : ''}`;
  }

  function renderWavSweepHtml(report) {
    const wav = report.wav; const planeRows = report.sampleBitPlanes.slice(0, 24).map(row => `<tr><td>${row.channel + 1}</td><td>${row.bit}</td><td>${formatPercent(row.printable)}</td><td>${formatNumber(row.entropy, 4)}</td><td>${esc(row.signature || '')}</td><td><code>${esc(row.preview.slice(0, 120))}</code></td></tr>`).join('');
    const stats = report.channelStats.map((row, index) => `<div><span>Channel ${index + 1}</span><strong>RMS ${formatNumber(row.rms, 5)} · peak ${formatNumber(row.peak, 4)} · ZCR ${formatNumber(row.zeroCrossingRate, 4)}</strong></div>`).join('');
    return `<section class="bmfs-card"><h3>Raw PCM / WAVE analysis</h3><div class="bmfs-metrics"><div><span>Format</span><strong>${wav.audioFormat}</strong></div><div><span>Channels</span><strong>${wav.channels}</strong></div><div><span>Sample rate</span><strong>${wav.sampleRate.toLocaleString()} Hz</strong></div><div><span>Sample width</span><strong>${wav.bitsPerSample} bit</strong></div><div><span>Frames</span><strong>${wav.frameCount.toLocaleString()}</strong></div><div><span>Duration</span><strong>${formatNumber(wav.durationSeconds, 3)} s</strong></div></div><div class="bmfs-channel-stats">${stats}</div><div class="bmfs-table-scroll"><table><thead><tr><th>Ch</th><th>Sample bit</th><th>Printable</th><th>Entropy</th><th>Signature</th><th>Preview</th></tr></thead><tbody>${planeRows}</tbody></table></div></section>`;
  }

  function renderExtraction(result, label) {
    latestExtraction = result.bytes; const target = panel?.querySelector('[data-bmfs-extraction]'); if (!target) return;
    target.innerHTML = `<div class="bmfs-metrics"><div><span>Method</span><strong>${esc(label)}</strong></div><div><span>Bits</span><strong>${Number(result.bitCount || result.bits?.length || result.bytes.length * 8).toLocaleString()}</strong></div><div><span>Bytes</span><strong>${result.bytes.length.toLocaleString()}</strong></div><div><span>Signature</span><strong>${esc(signatureForBytes(result.bytes) || 'none')}</strong></div><div><span>Printable</span><strong>${formatPercent(printableFraction(result.bytes))}</strong></div></div><pre>${esc(bytesToText(result.bytes.slice(0, MAX_PREVIEW_BYTES)))}</pre><code>${esc(bytesToHex(result.bytes.slice(0, 256), ' '))}</code><div class="bmfs-actions"><button type="button" data-bmfs-save-extraction>Save extracted bytes</button></div>`;
  }

  async function acquireFile(file) {
    const buffer = await file.arrayBuffer(); loadBytes(new Uint8Array(buffer), file.name, file.type || '');
  }

  function loadBytes(value, name = 'media-input', mimeType = '') {
    const bytes = asBytes(value); if (!bytes.length) fail('Input is empty.'); if (bytes.length > MAX_INPUT_BYTES) fail(`Input exceeds ${MAX_INPUT_BYTES.toLocaleString()} bytes.`);
    activeBytes = Uint8Array.from(bytes); activeName = String(name || 'media-input'); activeRaster = null; activeAudio = null; latestSweep = null; latestExtraction = null; latestConvolution = null;
    const source = panel?.querySelector('[data-bmfs-source]'); if (source) source.innerHTML = `<div><span>Source</span><strong>${esc(activeName)}</strong></div><div><span>Bytes</span><strong>${activeBytes.length.toLocaleString()}</strong></div><div><span>Detected</span><strong>${esc(signatureForBytes(activeBytes) || mimeType || 'raw/unknown')}</strong></div>`;
    panel.querySelector('[data-bmfs-run]').disabled = false; panel.querySelector('[data-bmfs-extract]').disabled = false; panel.querySelector('[data-bmfs-decode-audio]').disabled = false; panel.querySelector('[data-bmfs-decode-raster]').disabled = false;
    setStatus(`Loaded ${activeName}.`, 'success'); return activeBytes;
  }

  async function executeFullSweep() {
    if (!activeBytes?.length) fail('Load material first.'); const run = panel.querySelector('[data-bmfs-run]'); const cancel = panel.querySelector('[data-bmfs-cancel]'); run.disabled = true; cancel.disabled = false; setStatus('Starting forensic sweep…');
    try {
      const report = await fullForensicSweepAsync(activeBytes, { onProgress(update) { setStatus(`${update.stage} · ${Math.round(update.fraction * 100)}% · ${(update.elapsedMilliseconds / 1000).toFixed(1)} s`); } });
      renderSweep(report); setStatus('Forensic sweep complete.', 'success');
    } catch (error) { if (error?.name === 'AbortError') setStatus(`Cancelled · ${error.message}`, 'warning'); else { setStatus(error.message, 'error'); throw error; } }
    finally { run.disabled = !activeBytes?.length; cancel.disabled = true; }
  }

  async function executeRasterDecode() {
    if (!activeBytes?.length) fail('Load an image first.'); setStatus('Decoding raster pixels…'); activeRaster = await decodeBrowserRaster(activeBytes); panel.querySelector('[data-bmfs-raster-meta]').textContent = `${activeRaster.width} × ${activeRaster.height} · ${(activeRaster.rgba.length / 4).toLocaleString()} pixels`; drawRasterPreview(activeRaster.rgba, activeRaster.width, activeRaster.height, panel.querySelector('#bmfs-raster-preview')); setStatus('Raster decoded. LSB and convolution tools are ready.', 'success');
  }

  async function executeAudioDecode() {
    if (!activeBytes?.length) fail('Load audio first.'); setStatus('Decoding audio through browser media codecs…'); activeAudio = await decodeBrowserAudio(activeBytes); panel.querySelector('[data-bmfs-audio-meta]').textContent = `${activeAudio.channels.length} channel(s) · ${activeAudio.sampleRate.toLocaleString()} Hz · ${formatNumber(activeAudio.durationSeconds, 3)} s`; drawWaveform(activeAudio.channels[0], panel.querySelector('#bmfs-waveform')); renderAudioDecodedAnalysis(); setStatus('Audio decoded. Spectral, DTMF, FSK and OOK tools are ready.', 'success');
  }

  function renderAudioDecodedAnalysis() {
    if (!activeAudio) return; const target = panel.querySelector('[data-bmfs-audio-results]'); const channel = clamp(Math.floor(Number(panel.querySelector('#bmfs-audio-channel').value) || 0), 0, activeAudio.channels.length - 1); const samples = activeAudio.channels[channel]; const stats = audioStatistics(samples); const spectrum = spectralSummary(samples, activeAudio.sampleRate); const peaks = spectrum.dominant.slice(0, 8).map(item => `<span class="bmfs-chip">${formatNumber(item.frequency, 1)} Hz</span>`).join(''); target.innerHTML = `<div class="bmfs-metrics"><div><span>RMS</span><strong>${formatNumber(stats.rms, 6)}</strong></div><div><span>Peak</span><strong>${formatNumber(stats.peak, 5)}</strong></div><div><span>DC</span><strong>${formatNumber(stats.dc, 6)}</strong></div><div><span>Zero crossing</span><strong>${formatNumber(stats.zeroCrossingRate, 5)}</strong></div><div><span>Spectral centroid</span><strong>${formatNumber(spectrum.centroidHz, 1)} Hz</strong></div><div><span>Spectral flatness</span><strong>${formatNumber(spectrum.flatness, 5)}</strong></div></div><div class="bmfs-chip-row">${peaks}</div>`;
  }

  function executeBitExtraction() {
    if (!activeBytes?.length) fail('Load material first.'); const sourceMode = panel.querySelector('#bmfs-bit-source').value; const bit = Number(panel.querySelector('#bmfs-bit-index').value) || 0; const order = panel.querySelector('#bmfs-bit-order').value;
    let result; let label;
    if (sourceMode === 'raster') {
      if (!activeRaster) fail('Decode raster pixels first.'); const channels = panel.querySelector('#bmfs-raster-channels').value; result = extractRasterLsb(activeRaster.rgba, { channels, bitIndex: bit, bitOrder: order }); label = `raster ${channels.toUpperCase()} bit ${bit}`;
    } else if (sourceMode === 'pcm') {
      const wav = parseWav(activeBytes); if (!wav?.valid) fail('Raw PCM sample extraction requires a WAVE input.'); result = extractPcmSampleBitPlane(activeBytes, wav, bit, Number(panel.querySelector('#bmfs-pcm-channel').value) || 0, { bitOrder: order }); label = `PCM channel ${result.channel + 1} sample bit ${bit}`;
    } else if (sourceMode === 'pcm-delta') {
      const wav = parseWav(activeBytes); if (!wav?.valid) fail('PCM delta extraction requires a WAVE input.'); result = extractPcmDeltaBitPlane(activeBytes, wav, bit, Number(panel.querySelector('#bmfs-pcm-channel').value) || 0, { bitOrder: order }); label = `PCM delta channel ${result.channel + 1} bit ${bit}`;
    } else { result = extractByteBitPlane(activeBytes, bit, { bitOrder: order, stride: panel.querySelector('#bmfs-byte-stride').value, offset: panel.querySelector('#bmfs-byte-offset').value }); label = `raw byte bit ${bit}`; }
    renderExtraction(result, label);
  }

  function executeConvolution() {
    const mode = panel.querySelector('#bmfs-convolution-source').value; const preset = panel.querySelector('#bmfs-kernel-preset').value; const kernel = preset === 'custom' ? parseKernelMatrix(panel.querySelector('#bmfs-kernel').value) : CONVOLUTION_KERNELS[preset]; if (!kernel) fail('Select or define a convolution kernel.');
    if (mode === 'raster') {
      if (!activeRaster) fail('Decode raster pixels first.'); latestConvolution = convolveRasterChannel(activeRaster.rgba, activeRaster.width, activeRaster.height, kernel, panel.querySelector('#bmfs-convolution-channel').value, { autoScale: true }); drawRasterPreview(latestConvolution.rgba, activeRaster.width, activeRaster.height, panel.querySelector('#bmfs-convolution-preview')); panel.querySelector('[data-bmfs-convolution-meta]').textContent = `${kernel.name || 'custom kernel'} · range ${formatNumber(latestConvolution.minimum, 2)}…${formatNumber(latestConvolution.maximum, 2)}`;
    } else {
      if (!activeAudio) fail('Decode audio first.'); const channel = clamp(Number(panel.querySelector('#bmfs-audio-channel').value) || 0, 0, activeAudio.channels.length - 1); const rowKernel = kernel.height === 1 ? kernel.values : kernel.values.slice(Math.floor(kernel.height / 2) * kernel.width, Math.floor(kernel.height / 2 + 1) * kernel.width); latestConvolution = convolve1d(activeAudio.channels[channel], rowKernel, { divisor: kernel.divisor || 1, bias: 0 }); drawWaveform(latestConvolution, panel.querySelector('#bmfs-convolution-waveform')); panel.querySelector('[data-bmfs-convolution-meta]').textContent = `${kernel.name || 'custom kernel'} · ${rowKernel.length}-tap FIR row`;
    }
    setStatus('Convolution complete.', 'success');
  }

  function executeAudioDecoder() {
    if (!activeAudio) fail('Decode audio first.'); const channel = clamp(Number(panel.querySelector('#bmfs-audio-channel').value) || 0, 0, activeAudio.channels.length - 1); const samples = activeAudio.channels[channel]; const mode = panel.querySelector('#bmfs-audio-decoder').value; const target = panel.querySelector('[data-bmfs-decoder-output]');
    if (mode === 'dtmf') { const result = decodeDtmf(samples, activeAudio.sampleRate); target.innerHTML = `<strong>DTMF:</strong> <code>${esc(result.keys || '(none)')}</code> · ${result.frames.length} windows`; return; }
    const preset = AUDIO_PRESETS[panel.querySelector('#bmfs-audio-preset').value] || AUDIO_PRESETS.afsk1200; const mark = Number(panel.querySelector('#bmfs-mark-frequency').value) || preset.markFrequency; const space = Number(panel.querySelector('#bmfs-space-frequency').value) || preset.spaceFrequency; const baud = Number(panel.querySelector('#bmfs-baud').value) || preset.baud;
    if (mode === 'fsk') { const result = decodeBinaryFsk(samples, activeAudio.sampleRate, { markFrequency: mark, spaceFrequency: space, baud }); latestExtraction = result.bytesMsb; target.innerHTML = `<strong>FSK:</strong> ${result.bits.length} bits · confidence ${formatPercent(result.meanConfidence)}<pre>${esc(bytesToText(result.bytesMsb.slice(0, 1024)))}</pre><code>${esc(bytesToHex(result.bytesMsb.slice(0, 160), ' '))}</code>`; return; }
    const result = decodeOnOffKeying(samples, activeAudio.sampleRate, { carrierFrequency: mark, baud }); latestExtraction = result.bytesMsb; target.innerHTML = `<strong>OOK:</strong> ${result.bits.length} bits · threshold ${formatNumber(result.threshold, 6)}<pre>${esc(bytesToText(result.bytesMsb.slice(0, 1024)))}</pre><code>${esc(bytesToHex(result.bytesMsb.slice(0, 160), ' '))}</code>`;
  }

  function buildPanel() {
    if (!root?.document) fail('Media Forensics Suite requires a browser document.'); const existing = root.document.getElementById(PANEL_ID); if (existing) { panel = existing; return panel; } ensureStyle(); panel = root.document.createElement('section'); panel.id = PANEL_ID; panel.className = 'bmfs-shell'; panel.hidden = true; panel.setAttribute('aria-labelledby', 'bmfs-title');
    panel.innerHTML = `<div class="bmfs-backdrop" data-bmfs-close></div><div class="bmfs-panel" role="dialog" aria-modal="true" aria-labelledby="bmfs-title"><header class="bmfs-header"><div><p class="bmfs-eyebrow">Scientific Tools · Decryption Dashboard</p><h2 id="bmfs-title">Steganography, Signal & Media Forensics Suite</h2><p>Byte-, pixel-, sample-, matrix-, spectrum-, container-, and carrier-level extraction workbench for recovering hidden or transformed information without assuming where the information boundary is.</p></div><button type="button" class="bmfs-close" data-bmfs-close aria-label="Close Media Forensics Suite">×</button></header><div class="bmfs-body"><aside class="bmfs-controls"><section class="bmfs-card"><h3>Acquire material</h3><label>Upload file<input id="bmfs-file" type="file"></label><label>Paste mode<select id="bmfs-mode"><option value="auto">Auto</option><option value="text">Text</option><option value="hex">Hex</option><option value="base64">Base64</option><option value="binary">Bits</option></select></label><textarea id="bmfs-input" rows="6" spellcheck="false"></textarea><div class="bmfs-actions"><button type="button" data-bmfs-load>Load paste</button><button type="button" class="primary-action" data-bmfs-run disabled>Full forensic sweep</button><button type="button" data-bmfs-cancel disabled>Cancel</button></div><div class="bmfs-source" data-bmfs-source><p>No material loaded.</p></div></section><section class="bmfs-card"><h3>Decode media</h3><div class="bmfs-actions"><button type="button" data-bmfs-decode-raster disabled>Decode image pixels</button><button type="button" data-bmfs-decode-audio disabled>Decode audio samples</button></div><p class="bmfs-muted" data-bmfs-raster-meta>No raster decoded.</p><p class="bmfs-muted" data-bmfs-audio-meta>No audio decoded.</p></section><section class="bmfs-card"><h3>LSB / bit-plane extraction</h3><label>Source<select id="bmfs-bit-source"><option value="bytes">Raw bytes</option><option value="raster">Decoded raster channels</option><option value="pcm">Raw PCM sample bits</option><option value="pcm-delta">PCM sample-delta bits</option></select></label><div class="bmfs-grid-two"><label>Bit index<input id="bmfs-bit-index" type="number" min="0" max="31" value="0"></label><label>Pack order<select id="bmfs-bit-order"><option value="msb">MSB-first</option><option value="lsb">LSB-first</option></select></label><label>Byte stride<input id="bmfs-byte-stride" type="number" min="1" max="4096" value="1"></label><label>Byte offset<input id="bmfs-byte-offset" type="number" min="0" value="0"></label><label>Raster channels<input id="bmfs-raster-channels" value="rgb"></label><label>PCM channel<input id="bmfs-pcm-channel" type="number" min="0" value="0"></label></div><button type="button" class="primary-action" data-bmfs-extract disabled>Extract selected plane</button></section><section class="bmfs-boundary"><strong>Evidence boundary:</strong> LSB balance, convolution residuals, spectral peaks, decoded characters, or modem-like tone matches are leads. Preserve the original carrier and corroborate recovered information before calling it intentional embedding.</section></aside><main class="bmfs-results"><div class="bmfs-status" data-bmfs-status role="status" aria-live="polite">Load material to begin.</div><div class="bmfs-tab-strip"><button type="button" data-bmfs-section-button="overview" class="active">Overview</button><button type="button" data-bmfs-section-button="bits">Bitplanes</button><button type="button" data-bmfs-section-button="matrix">Convolution</button><button type="button" data-bmfs-section-button="audio">Audio</button><button type="button" data-bmfs-section-button="raster">Raster</button></div><section data-bmfs-section="overview"><div data-bmfs-overview><p class="bmfs-muted">No forensic sweep yet.</p></div></section><section data-bmfs-section="bits" hidden><section class="bmfs-card"><h3>Extraction result</h3><div data-bmfs-extraction><p class="bmfs-muted">Choose a source and bit plane.</p></div></section></section><section data-bmfs-section="matrix" hidden><section class="bmfs-card"><h3>Convolution / correlation matrix workbench</h3><div class="bmfs-grid-two"><label>Source<select id="bmfs-convolution-source"><option value="raster">Raster channel</option><option value="audio">Audio FIR</option></select></label><label>Preset<select id="bmfs-kernel-preset">${Object.entries(CONVOLUTION_KERNELS).map(([key, item]) => `<option value="${key}">${esc(item.name)}</option>`).join('')}<option value="custom">Custom</option></select></label><label>Raster channel<select id="bmfs-convolution-channel"><option value="luma">Luma</option><option value="r">Red</option><option value="g">Green</option><option value="b">Blue</option><option value="a">Alpha</option></select></label></div><label>Custom matrix<textarea id="bmfs-kernel" rows="4">0 -1 0\n-1 4 -1\n0 -1 0</textarea></label><button type="button" class="primary-action" data-bmfs-convolve>Apply convolution</button><p data-bmfs-convolution-meta class="bmfs-muted">No convolution yet.</p><canvas id="bmfs-convolution-preview"></canvas><canvas id="bmfs-convolution-waveform"></canvas></section></section><section data-bmfs-section="audio" hidden><section class="bmfs-card"><h3>Decoded audio / encoded-audio data tools</h3><label>Channel<input id="bmfs-audio-channel" type="number" min="0" value="0"></label><canvas id="bmfs-waveform"></canvas><div data-bmfs-audio-results><p class="bmfs-muted">Decode audio samples first.</p></div><hr><div class="bmfs-grid-two"><label>Decoder<select id="bmfs-audio-decoder"><option value="dtmf">DTMF</option><option value="fsk">Binary FSK / AFSK</option><option value="ook">On-off keying / tone envelope</option></select></label><label>Preset<select id="bmfs-audio-preset">${Object.entries(AUDIO_PRESETS).map(([key, item]) => `<option value="${key}">${esc(item.label)}</option>`).join('')}</select></label><label>Mark / carrier Hz<input id="bmfs-mark-frequency" type="number" value="1200"></label><label>Space Hz<input id="bmfs-space-frequency" type="number" value="2200"></label><label>Baud<input id="bmfs-baud" type="number" value="1200"></label></div><button type="button" class="primary-action" data-bmfs-audio-decode>Run signal decoder</button><div data-bmfs-decoder-output class="bmfs-decoder-output">No decoder result.</div></section></section><section data-bmfs-section="raster" hidden><section class="bmfs-card"><h3>Raster bit-plane preview</h3><canvas id="bmfs-raster-preview"></canvas><div class="bmfs-actions"><button type="button" data-bmfs-raster-plane>Render selected bit plane</button></div></section></section></main></div></div>`;
    root.document.body.appendChild(panel); bindPanel(panel); return panel;
  }

  function selectSection(name) {
    panel.querySelectorAll('[data-bmfs-section]').forEach(section => { section.hidden = section.dataset.bmfsSection !== name; });
    panel.querySelectorAll('[data-bmfs-section-button]').forEach(button => button.classList.toggle('active', button.dataset.bmfsSectionButton === name));
  }

  function bindPanel(target) {
    target.querySelectorAll('[data-bmfs-close]').forEach(button => button.addEventListener('click', closePanel));
    target.querySelector('#bmfs-file').addEventListener('change', event => { const file = event.target.files?.[0]; if (file) void acquireFile(file).catch(error => setStatus(error.message, 'error')); });
    target.querySelector('[data-bmfs-load]').addEventListener('click', () => { try { loadBytes(parseFlexibleInput(target.querySelector('#bmfs-input').value, target.querySelector('#bmfs-mode').value), 'pasted-input'); } catch (error) { setStatus(error.message, 'error'); } });
    target.querySelector('[data-bmfs-run]').addEventListener('click', () => void executeFullSweep().catch(error => console.error(error)));
    target.querySelector('[data-bmfs-cancel]').addEventListener('click', () => cancelWorker('cancel requested by user'));
    target.querySelector('[data-bmfs-decode-raster]').addEventListener('click', () => void executeRasterDecode().catch(error => setStatus(error.message, 'error')));
    target.querySelector('[data-bmfs-decode-audio]').addEventListener('click', () => void executeAudioDecode().catch(error => setStatus(error.message, 'error')));
    target.querySelector('[data-bmfs-extract]').addEventListener('click', () => { try { executeBitExtraction(); selectSection('bits'); } catch (error) { setStatus(error.message, 'error'); } });
    target.querySelector('[data-bmfs-convolve]').addEventListener('click', () => { try { executeConvolution(); } catch (error) { setStatus(error.message, 'error'); } });
    target.querySelector('[data-bmfs-audio-decode]').addEventListener('click', () => { try { executeAudioDecoder(); } catch (error) { setStatus(error.message, 'error'); } });
    target.querySelector('[data-bmfs-raster-plane]').addEventListener('click', () => { try { if (!activeRaster) fail('Decode raster pixels first.'); const rgba = rasterBitPlaneImage(activeRaster.rgba, target.querySelector('#bmfs-bit-index').value, target.querySelector('#bmfs-raster-channels').value); drawRasterPreview(rgba, activeRaster.width, activeRaster.height, target.querySelector('#bmfs-raster-preview')); } catch (error) { setStatus(error.message, 'error'); } });
    target.querySelector('[data-bmfs-extraction]').addEventListener('click', event => { if (event.target.closest('[data-bmfs-save-extraction]') && latestExtraction) downloadBytes(latestExtraction, 'media-forensics-extraction.bin'); });
    target.querySelectorAll('[data-bmfs-section-button]').forEach(button => button.addEventListener('click', () => selectSection(button.dataset.bmfsSectionButton)));
    target.querySelector('#bmfs-audio-channel').addEventListener('change', () => { if (activeAudio) { drawWaveform(activeAudio.channels[clamp(Number(target.querySelector('#bmfs-audio-channel').value) || 0, 0, activeAudio.channels.length - 1)], target.querySelector('#bmfs-waveform')); renderAudioDecodedAnalysis(); } });
    target.querySelector('#bmfs-audio-preset').addEventListener('change', () => { const preset = AUDIO_PRESETS[target.querySelector('#bmfs-audio-preset').value]; if (!preset) return; target.querySelector('#bmfs-mark-frequency').value = preset.markFrequency; target.querySelector('#bmfs-space-frequency').value = preset.spaceFrequency; target.querySelector('#bmfs-baud').value = preset.baud; });
  }

  function openPanel(options = {}) {
    const target = buildPanel(); target.hidden = false; root.document.body.classList.add('bmfs-open'); if (options.bytes) loadBytes(options.bytes, options.sourceName || 'handoff'); else if (options.text) loadBytes(textToBytes(options.text), options.sourceName || 'handoff-text'); return target;
  }
  function closePanel() { cancelWorker('media forensics suite closed'); if (panel) panel.hidden = true; root?.document?.body?.classList.remove('bmfs-open'); }
  function currentState() { return Object.freeze({ panelOpen: Boolean(panel && !panel.hidden), sourceLoaded: Boolean(activeBytes?.length), sourceBytes: activeBytes?.length || 0, rasterDecoded: Boolean(activeRaster), audioDecoded: Boolean(activeAudio), sweepComplete: Boolean(latestSweep) }); }

  return Object.freeze({
    openPanel, closePanel, currentState, loadBytes, parseFlexibleInput, fullForensicSweep, fullForensicSweepAsync, decodeBrowserAudio, decodeBrowserRaster,
    utilities: Object.freeze({ asBytes, textToBytes, bytesToText, bytesToHex, bytesFromHex, bytesFromBase64, bytesFromBits, packBits, unpackBits, extractByteBitPlane, extractSelectedBits, bitEntropy, bitPlaneDiagnostics, lsbPairChiSquare, bitAutocorrelation, entropyOfBytes, printableFraction, signatureForBytes, parseKernelMatrix, convolve1d, crossCorrelate1d, convolve2d, fftReal, spectralSummary, goertzelPower, rms, audioStatistics, decodeDtmf, decodeBinaryFsk, decodeOnOffKeying, parseRiffChunks, parseWav, decodeWavChannels, extractPcmSampleBitPlane, extractPcmDeltaBitPlane, stereoDifference, parsePngChunks, parseJpegSegments, parseId3v2, scanContainer, extractRasterChannel, extractRasterLsb, rasterBitPlaneImage, convolveRasterChannel, byteSweep, wavSweep }),
    constants: Object.freeze({ PANEL_ID, WORKER_URL, MAX_INPUT_BYTES, MAX_RASTER_PIXELS, MAX_PREVIEW_BYTES, CONVOLUTION_KERNELS, AUDIO_PRESETS, DTMF_ROWS, DTMF_COLUMNS, DTMF_KEYS })
  });
});