(function installBinaryCubeSteganalysisEngine(root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.BinaryCubeSteganalysisEngine = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function createBinaryCubeSteganalysisEngine() {
  'use strict';

  const VERSION = '0.1.0';
  const DEFAULT_RS_MASK = Object.freeze([0, 1, 1, 0]);
  const DEFAULT_TILE_SIZE = 64;
  const JPEG_ZIGZAG = Object.freeze([
    0, 1, 8, 16, 9, 2, 3, 10,
    17, 24, 32, 25, 18, 11, 4, 5,
    12, 19, 26, 33, 40, 48, 41, 34,
    27, 20, 13, 6, 7, 14, 21, 28,
    35, 42, 49, 56, 57, 50, 43, 36,
    29, 22, 15, 23, 30, 37, 44, 51,
    58, 59, 52, 45, 38, 31, 39, 46,
    53, 60, 61, 54, 47, 55, 62, 63
  ]);

  const clamp = (value, minimum, maximum) => Math.max(minimum, Math.min(maximum, value));
  const finite = value => Number.isFinite(Number(value));
  const asBytes = value => value instanceof Uint8Array ? value : value instanceof ArrayBuffer ? new Uint8Array(value) : ArrayBuffer.isView(value) ? new Uint8Array(value.buffer, value.byteOffset, value.byteLength) : Uint8Array.from(value || []);
  const asSamples = value => Array.from(value || [], item => Number(item) || 0);

  function mean(values) {
    if (!values.length) return 0;
    let total = 0;
    for (const value of values) total += value;
    return total / values.length;
  }

  function median(valuesValue) {
    const values = Array.from(valuesValue || []).filter(finite).sort((a, b) => a - b);
    if (!values.length) return 0;
    const middle = Math.floor(values.length / 2);
    return values.length % 2 ? values[middle] : (values[middle - 1] + values[middle]) / 2;
  }

  function variance(valuesValue, average = null) {
    const values = Array.from(valuesValue || []);
    if (!values.length) return 0;
    const mu = average == null ? mean(values) : average;
    let total = 0;
    for (const value of values) total += (value - mu) ** 2;
    return total / values.length;
  }

  function solveQuadratic(aValue, bValue, cValue) {
    const a = Number(aValue) || 0;
    const b = Number(bValue) || 0;
    const c = Number(cValue) || 0;
    if (Math.abs(a) < 1e-12) {
      if (Math.abs(b) < 1e-12) return Object.freeze([]);
      return Object.freeze([-c / b]);
    }
    const discriminant = b * b - 4 * a * c;
    if (discriminant < 0) return Object.freeze([]);
    const root = Math.sqrt(discriminant);
    const first = (-b - root) / (2 * a);
    const second = (-b + root) / (2 * a);
    return Object.freeze([first, second]);
  }

  function lsbEntropy(samplesValue) {
    const samples = asSamples(samplesValue);
    if (!samples.length) return Object.freeze({ ones: 0, zeros: 0, oneFraction: 0, entropy: 0, transitionFraction: 0 });
    let ones = 0;
    let transitions = 0;
    let previous = null;
    for (const sample of samples) {
      const bit = Math.abs(Math.trunc(sample)) & 1;
      ones += bit;
      if (previous !== null && previous !== bit) transitions += 1;
      previous = bit;
    }
    const p = ones / samples.length;
    const entropy = p <= 0 || p >= 1 ? 0 : -p * Math.log2(p) - (1 - p) * Math.log2(1 - p);
    return Object.freeze({ ones, zeros: samples.length - ones, oneFraction: p, entropy, transitionFraction: samples.length > 1 ? transitions / (samples.length - 1) : 0 });
  }

  function lsbPairChiSquare(samplesValue) {
    const samples = asSamples(samplesValue);
    const counts = new Uint32Array(256);
    for (const sample of samples) counts[clamp(Math.round(sample), 0, 255)] += 1;
    let statistic = 0;
    let usedPairs = 0;
    for (let even = 0; even < 256; even += 2) {
      const a = counts[even];
      const b = counts[even + 1];
      const expected = (a + b) / 2;
      if (!expected) continue;
      statistic += ((a - expected) ** 2 + (b - expected) ** 2) / expected;
      usedPairs += 1;
    }
    return Object.freeze({ statistic, usedPairs, normalized: usedPairs ? statistic / usedPairs : 0, note: 'Lower pair-normalized chi-square is consistent with stronger even/odd histogram equalization, but is not by itself proof of LSB embedding.' });
  }

  function rsDiscrimination(group) {
    let total = 0;
    for (let index = 0; index + 1 < group.length; index += 1) total += Math.abs(group[index + 1] - group[index]);
    return total;
  }

  function rsFlip(value, operation) {
    const sample = Math.trunc(Number(value) || 0);
    if (operation === 0) return sample;
    if (operation > 0) return (sample & 1) === 0 ? sample + 1 : sample - 1;
    return (sample & 1) === 0 ? sample - 1 : sample + 1;
  }

  function rsGroupCounts(samplesValue, maskValue = DEFAULT_RS_MASK) {
    const samples = asSamples(samplesValue);
    const mask = Array.from(maskValue || DEFAULT_RS_MASK, value => Math.sign(Number(value) || 0));
    const size = Math.max(2, mask.length);
    let regular = 0;
    let singular = 0;
    let unusable = 0;
    let groups = 0;
    for (let offset = 0; offset + size <= samples.length; offset += size) {
      const original = samples.slice(offset, offset + size);
      const changed = original.map((value, index) => rsFlip(value, mask[index] || 0));
      const base = rsDiscrimination(original);
      const flipped = rsDiscrimination(changed);
      if (flipped > base) regular += 1;
      else if (flipped < base) singular += 1;
      else unusable += 1;
      groups += 1;
    }
    return Object.freeze({ regular, singular, unusable, groups, difference: regular - singular, regularFraction: groups ? regular / groups : 0, singularFraction: groups ? singular / groups : 0 });
  }

  function rsAnalysis(samplesValue, options = {}) {
    const samples = asSamples(samplesValue);
    const mask = Array.from(options.mask || DEFAULT_RS_MASK);
    const negativeMask = mask.map(value => -value);
    const toggled = samples.map(value => rsFlip(value, 1));
    const m0 = rsGroupCounts(samples, mask);
    const m1 = rsGroupCounts(toggled, mask);
    const n0 = rsGroupCounts(samples, negativeMask);
    const n1 = rsGroupCounts(toggled, negativeMask);
    const d0 = m0.difference;
    const d1 = m1.difference;
    const dn0 = n0.difference;
    const dn1 = n1.difference;
    const a = 2 * (d1 + d0);
    const b = dn0 - dn1 - d1 - 3 * d0;
    const c = d0 - dn0;
    const roots = solveQuadratic(a, b, c);
    const z = roots.length ? roots.reduce((best, value) => Math.abs(value) < Math.abs(best) ? value : best, roots[0]) : NaN;
    const rawEstimate = finite(z) && Math.abs(z - 0.5) > 1e-12 ? z / (z - 0.5) : NaN;
    const estimate = finite(rawEstimate) ? clamp(rawEstimate, 0, 1) : null;
    const groupCount = Math.min(m0.groups, n0.groups);
    const initialBias = groupCount ? Math.abs(d0 - dn0) / groupCount : 0;
    return Object.freeze({
      method: 'RS steganalysis',
      mask: Object.freeze(mask),
      counts: Object.freeze({ m0, m1, negativeM0: n0, negativeM1: n1 }),
      equation: Object.freeze({ a, b, c, roots }),
      z: finite(z) ? z : null,
      rawEstimate: finite(rawEstimate) ? rawEstimate : null,
      estimatedPayloadRate: estimate,
      estimatedChangedSampleRate: estimate == null ? null : estimate / 2,
      initialBias,
      groups: groupCount,
      valid: estimate != null && groupCount >= 16,
      caveat: 'RS estimates randomized LSB-replacement payload under its regular/singular-group assumptions. Initial cover bias, small images, heavy noise, preprocessing, or adaptive embedding can move the estimate.'
    });
  }

  function samplePairsFromSamples(samplesValue, step = 2) {
    const samples = asSamples(samplesValue);
    const pairs = [];
    const stride = Math.max(1, Math.floor(Number(step) || 2));
    for (let index = 0; index + 1 < samples.length; index += stride) pairs.push(Object.freeze([samples[index], samples[index + 1]]));
    return Object.freeze(pairs);
  }

  function samplePairTraceCounts(pairsValue) {
    const pairs = Array.from(pairsValue || []);
    let c0 = 0;
    let c1 = 0;
    let d0 = 0;
    let d2 = 0;
    let x1 = 0;
    let y1 = 0;
    let usable = 0;
    for (const pair of pairs) {
      if (!pair || pair.length < 2) continue;
      const u = clamp(Math.round(Number(pair[0]) || 0), 0, 255);
      const v = clamp(Math.round(Number(pair[1]) || 0), 0, 255);
      const difference = Math.abs(u - v);
      const shiftedDifference = Math.abs((u >> 1) - (v >> 1));
      if (shiftedDifference === 0) c0 += 1;
      if (shiftedDifference === 1) c1 += 1;
      if (difference === 0) d0 += 1;
      if (difference === 2) d2 += 1;
      if (difference === 1) {
        const even = (u & 1) === 0 ? u : v;
        const odd = (u & 1) === 1 ? u : v;
        if (even > odd) x1 += 1;
        else y1 += 1;
      }
      usable += 1;
    }
    return Object.freeze({ c0, c1, d0, d2, x1, y1, pairs: usable });
  }

  function samplePairAnalysisFromPairs(pairsValue) {
    const counts = samplePairTraceCounts(pairsValue);
    const a = (2 * counts.c0 - counts.c1) / 4;
    const b = -(2 * counts.d0 - counts.d2 + 2 * counts.y1 - 2 * counts.x1) / 2;
    const c = counts.y1 - counts.x1;
    const roots = solveQuadratic(a, b, c);
    const eligible = roots.filter(value => finite(value) && value >= -0.25 && value <= 1.25);
    const pool = eligible.length ? eligible : roots;
    const root = pool.length ? pool.reduce((best, value) => Math.abs(value) < Math.abs(best) ? value : best, pool[0]) : NaN;
    const rawEstimate = finite(root) ? root : NaN;
    const estimate = finite(rawEstimate) ? clamp(rawEstimate, 0, 1) : null;
    const preconditions = Object.freeze({ cOrdering: 2 * counts.c0 > counts.c1, dOrdering: 2 * counts.d0 >= counts.d2 });
    const traceImbalance = (counts.x1 + counts.y1) ? Math.abs(counts.y1 - counts.x1) / (counts.x1 + counts.y1) : 0;
    return Object.freeze({
      method: 'Sample Pair Analysis',
      counts,
      equation: Object.freeze({ a, b, c, roots }),
      rawEstimate: finite(rawEstimate) ? rawEstimate : null,
      estimatedPayloadRate: estimate,
      estimatedChangedSampleRate: estimate == null ? null : estimate / 2,
      preconditions,
      traceImbalance,
      valid: estimate != null && counts.pairs >= 32 && preconditions.cOrdering,
      caveat: 'The SPA estimate uses the m=0 trace-multiset quadratic for randomized LSB replacement. It is sensitive to pair selection and to violations of the natural-signal trace-balance assumption.'
    });
  }

  function samplePairAnalysis(samplesValue, options = {}) {
    return samplePairAnalysisFromPairs(samplePairsFromSamples(samplesValue, options.step || 2));
  }

  function rgbaChannelSamples(rgbaValue, widthValue, heightValue, channelValue = 'luma', bounds = null) {
    const rgba = rgbaValue instanceof Uint8ClampedArray ? rgbaValue : new Uint8ClampedArray(rgbaValue || []);
    const width = Math.max(0, Math.floor(Number(widthValue) || 0));
    const height = Math.max(0, Math.floor(Number(heightValue) || 0));
    const channel = String(channelValue || 'luma').toLowerCase();
    const x0 = bounds ? clamp(Math.floor(bounds.x || 0), 0, width) : 0;
    const y0 = bounds ? clamp(Math.floor(bounds.y || 0), 0, height) : 0;
    const x1 = bounds ? clamp(Math.ceil((bounds.x || 0) + (bounds.width || 0)), x0, width) : width;
    const y1 = bounds ? clamp(Math.ceil((bounds.y || 0) + (bounds.height || 0)), y0, height) : height;
    const samples = [];
    const indexForChannel = channel === 'r' ? 0 : channel === 'g' ? 1 : channel === 'b' ? 2 : channel === 'a' ? 3 : -1;
    for (let y = y0; y < y1; y += 1) {
      for (let x = x0; x < x1; x += 1) {
        const offset = (y * width + x) * 4;
        if (indexForChannel >= 0) samples.push(rgba[offset + indexForChannel]);
        else samples.push(Math.round(0.2126 * rgba[offset] + 0.7152 * rgba[offset + 1] + 0.0722 * rgba[offset + 2]));
      }
    }
    return Object.freeze(samples);
  }

  function rgbaSpatialPairs(rgbaValue, widthValue, heightValue, channelValue = 'luma', bounds = null) {
    const rgba = rgbaValue instanceof Uint8ClampedArray ? rgbaValue : new Uint8ClampedArray(rgbaValue || []);
    const width = Math.max(0, Math.floor(Number(widthValue) || 0));
    const height = Math.max(0, Math.floor(Number(heightValue) || 0));
    const channel = String(channelValue || 'luma').toLowerCase();
    const x0 = bounds ? clamp(Math.floor(bounds.x || 0), 0, width) : 0;
    const y0 = bounds ? clamp(Math.floor(bounds.y || 0), 0, height) : 0;
    const x1 = bounds ? clamp(Math.ceil((bounds.x || 0) + (bounds.width || 0)), x0, width) : width;
    const y1 = bounds ? clamp(Math.ceil((bounds.y || 0) + (bounds.height || 0)), y0, height) : height;
    const indexForChannel = channel === 'r' ? 0 : channel === 'g' ? 1 : channel === 'b' ? 2 : channel === 'a' ? 3 : -1;
    const valueAt = (x, y) => {
      const offset = (y * width + x) * 4;
      return indexForChannel >= 0 ? rgba[offset + indexForChannel] : Math.round(0.2126 * rgba[offset] + 0.7152 * rgba[offset + 1] + 0.0722 * rgba[offset + 2]);
    };
    const pairs = [];
    for (let y = y0; y < y1; y += 1) {
      for (let x = x0; x < x1; x += 1) {
        if (x + 1 < x1) pairs.push(Object.freeze([valueAt(x, y), valueAt(x + 1, y)]));
        if (y + 1 < y1) pairs.push(Object.freeze([valueAt(x, y), valueAt(x, y + 1)]));
      }
    }
    return Object.freeze(pairs);
  }

  function residualRoughness(samplesValue, widthValue) {
    const samples = asSamples(samplesValue);
    const width = Math.max(1, Math.floor(Number(widthValue) || samples.length || 1));
    if (!samples.length) return 0;
    let total = 0;
    let count = 0;
    for (let index = 0; index < samples.length; index += 1) {
      if ((index % width) + 1 < width && index + 1 < samples.length) { total += Math.abs(samples[index] - samples[index + 1]); count += 1; }
      if (index + width < samples.length) { total += Math.abs(samples[index] - samples[index + width]); count += 1; }
    }
    return count ? total / count / 255 : 0;
  }

  function residualCooccurrence(samplesValue, widthValue, thresholdValue = 3) {
    const samples = asSamples(samplesValue);
    const width = Math.max(2, Math.floor(Number(widthValue) || 2));
    const threshold = clamp(Math.floor(Number(thresholdValue) || 3), 1, 12);
    const bins = threshold * 2 + 1;
    const matrix = Array.from({ length: bins }, () => new Uint32Array(bins));
    let pairs = 0;
    for (let y = 0; y < Math.floor(samples.length / width); y += 1) {
      const row = y * width;
      for (let x = 0; x + 2 < width; x += 1) {
        const r1 = clamp(Math.round(samples[row + x + 1] - samples[row + x]), -threshold, threshold) + threshold;
        const r2 = clamp(Math.round(samples[row + x + 2] - samples[row + x + 1]), -threshold, threshold) + threshold;
        matrix[r1][r2] += 1;
        pairs += 1;
      }
    }
    let entropy = 0;
    let diagonal = 0;
    let symmetryError = 0;
    if (pairs) {
      for (let i = 0; i < bins; i += 1) {
        for (let j = 0; j < bins; j += 1) {
          const count = matrix[i][j];
          if (count) { const p = count / pairs; entropy -= p * Math.log2(p); }
          if (i === j) diagonal += count;
          symmetryError += Math.abs(count - matrix[j][i]);
        }
      }
    }
    return Object.freeze({ threshold, bins, pairs, entropy, diagonalFraction: pairs ? diagonal / pairs : 0, symmetryError: pairs ? symmetryError / (2 * pairs) : 0, matrix: Object.freeze(matrix.map(row => Object.freeze(Array.from(row)))) });
  }

  function analyzeRasterRegion(rgba, width, height, channel, bounds) {
    const samples = rgbaChannelSamples(rgba, width, height, channel, bounds);
    const regionWidth = bounds?.width || width;
    const pairs = rgbaSpatialPairs(rgba, width, height, channel, bounds);
    const rs = rsAnalysis(samples);
    const spa = samplePairAnalysisFromPairs(pairs);
    const lsb = lsbEntropy(samples);
    const chi = lsbPairChiSquare(samples);
    const residual = residualRoughness(samples, regionWidth);
    const cooccurrence = residualCooccurrence(samples, regionWidth, 3);
    const estimates = [rs.valid ? rs.estimatedPayloadRate : null, spa.valid ? spa.estimatedPayloadRate : null].filter(finite);
    return Object.freeze({ rs, spa, lsb, chi, residualRoughness: residual, residualCooccurrence: cooccurrence, payloadEstimateConsensus: estimates.length ? median(estimates) : null, detectorAgreement: estimates.length >= 2 ? 1 - Math.min(1, Math.abs(estimates[0] - estimates[1])) : null });
  }

  function localizedRasterAnalysis(rgbaValue, widthValue, heightValue, options = {}) {
    const rgba = rgbaValue instanceof Uint8ClampedArray ? rgbaValue : new Uint8ClampedArray(rgbaValue || []);
    const width = Math.max(1, Math.floor(Number(widthValue) || 1));
    const height = Math.max(1, Math.floor(Number(heightValue) || 1));
    const tileSize = clamp(Math.floor(Number(options.tileSize) || DEFAULT_TILE_SIZE), 16, 512);
    const channel = String(options.channel || 'luma').toLowerCase();
    const tiles = [];
    for (let y = 0; y < height; y += tileSize) {
      for (let x = 0; x < width; x += tileSize) {
        const bounds = Object.freeze({ x, y, width: Math.min(tileSize, width - x), height: Math.min(tileSize, height - y) });
        tiles.push(Object.freeze({ ...bounds, analysis: analyzeRasterRegion(rgba, width, height, channel, bounds) }));
      }
    }
    return Object.freeze({ width, height, tileSize, channel, columns: Math.ceil(width / tileSize), rows: Math.ceil(height / tileSize), global: analyzeRasterRegion(rgba, width, height, channel, null), tiles: Object.freeze(tiles), caveat: 'Localized values are detector measurements, not calibrated probabilities. Compare neighboring tiles and independent metrics rather than interpreting any one heatmap as proof.' });
  }

  function compareRasters(coverValue, suspectValue, widthValue, heightValue) {
    const cover = coverValue instanceof Uint8ClampedArray ? coverValue : new Uint8ClampedArray(coverValue || []);
    const suspect = suspectValue instanceof Uint8ClampedArray ? suspectValue : new Uint8ClampedArray(suspectValue || []);
    const width = Math.max(1, Math.floor(Number(widthValue) || 1));
    const height = Math.max(1, Math.floor(Number(heightValue) || 1));
    const expectedLength = width * height * 4;
    if (cover.length !== expectedLength || suspect.length !== expectedLength) throw new Error('Known-cover comparison requires equal RGBA dimensions.');
    const perChannel = Array.from({ length: 4 }, () => ({ changedSamples: 0, lsbFlips: 0, squaredError: 0, absoluteError: 0, bitPlaneFlips: new Uint32Array(8) }));
    const changedMask = new Uint8Array(width * height);
    let changedPixels = 0;
    let squaredError = 0;
    let absoluteError = 0;
    let changedSamples = 0;
    const coverLuma = new Float64Array(width * height);
    const suspectLuma = new Float64Array(width * height);
    let minX = width; let minY = height; let maxX = -1; let maxY = -1;
    for (let pixel = 0; pixel < width * height; pixel += 1) {
      let pixelChanged = false;
      const base = pixel * 4;
      coverLuma[pixel] = 0.2126 * cover[base] + 0.7152 * cover[base + 1] + 0.0722 * cover[base + 2];
      suspectLuma[pixel] = 0.2126 * suspect[base] + 0.7152 * suspect[base + 1] + 0.0722 * suspect[base + 2];
      for (let channel = 0; channel < 4; channel += 1) {
        const a = cover[base + channel];
        const b = suspect[base + channel];
        const delta = b - a;
        if (delta) {
          pixelChanged = true;
          changedSamples += 1;
          perChannel[channel].changedSamples += 1;
          if ((a & 1) !== (b & 1)) perChannel[channel].lsbFlips += 1;
          const xor = a ^ b;
          for (let bit = 0; bit < 8; bit += 1) if ((xor >>> bit) & 1) perChannel[channel].bitPlaneFlips[bit] += 1;
        }
        const squared = delta * delta;
        squaredError += squared;
        absoluteError += Math.abs(delta);
        perChannel[channel].squaredError += squared;
        perChannel[channel].absoluteError += Math.abs(delta);
      }
      if (pixelChanged) {
        changedMask[pixel] = 255;
        changedPixels += 1;
        const x = pixel % width;
        const y = Math.floor(pixel / width);
        minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y);
      }
    }
    let adjacentChanged = 0;
    let changedWithNeighbor = 0;
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const index = y * width + x;
        if (!changedMask[index]) continue;
        let neighbor = false;
        if (x + 1 < width && changedMask[index + 1]) { adjacentChanged += 1; neighbor = true; }
        if (y + 1 < height && changedMask[index + width]) { adjacentChanged += 1; neighbor = true; }
        if (x > 0 && changedMask[index - 1]) neighbor = true;
        if (y > 0 && changedMask[index - width]) neighbor = true;
        if (neighbor) changedWithNeighbor += 1;
      }
    }
    const samples = width * height * 4;
    const mse = samples ? squaredError / samples : 0;
    const psnr = mse === 0 ? Infinity : 10 * Math.log10((255 * 255) / mse);
    const muX = mean(coverLuma);
    const muY = mean(suspectLuma);
    const varX = variance(coverLuma, muX);
    const varY = variance(suspectLuma, muY);
    let covariance = 0;
    for (let index = 0; index < coverLuma.length; index += 1) covariance += (coverLuma[index] - muX) * (suspectLuma[index] - muY);
    covariance /= Math.max(1, coverLuma.length);
    const c1 = (0.01 * 255) ** 2;
    const c2 = (0.03 * 255) ** 2;
    const ssim = ((2 * muX * muY + c1) * (2 * covariance + c2)) / ((muX * muX + muY * muY + c1) * (varX + varY + c2));
    const channelNames = ['r', 'g', 'b', 'a'];
    const channelReports = {};
    perChannel.forEach((row, index) => {
      channelReports[channelNames[index]] = Object.freeze({
        changedSamples: row.changedSamples,
        changedFraction: row.changedSamples / (width * height),
        lsbFlips: row.lsbFlips,
        lsbFlipFraction: row.changedSamples ? row.lsbFlips / row.changedSamples : 0,
        mse: row.squaredError / (width * height),
        mae: row.absoluteError / (width * height),
        bitPlaneFlips: Object.freeze(Array.from(row.bitPlaneFlips))
      });
    });
    return Object.freeze({
      width, height, changedPixels, changedPixelFraction: changedPixels / (width * height), changedSamples, changedSampleFraction: changedSamples / samples,
      mse, mae: absoluteError / samples, psnr, ssim,
      changedWithNeighborFraction: changedPixels ? changedWithNeighbor / changedPixels : 0,
      adjacentChangedPairs: adjacentChanged,
      boundingBox: changedPixels ? Object.freeze({ x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 }) : null,
      channels: Object.freeze(channelReports),
      changedMask,
      caveat: 'Known-cover comparison identifies exact differences. Similarity metrics quantify distortion but do not identify why a change was made.'
    });
  }

  function confusionMetrics(truthValue, predictedValue) {
    const truth = Array.from(truthValue || [], Boolean);
    const predicted = Array.from(predictedValue || [], Boolean);
    if (truth.length !== predicted.length) throw new Error('Truth and prediction arrays must have equal length.');
    let tp = 0; let tn = 0; let fp = 0; let fn = 0;
    for (let index = 0; index < truth.length; index += 1) {
      if (truth[index] && predicted[index]) tp += 1;
      else if (!truth[index] && !predicted[index]) tn += 1;
      else if (!truth[index] && predicted[index]) fp += 1;
      else fn += 1;
    }
    const safe = (numerator, denominator) => denominator ? numerator / denominator : 0;
    const precision = safe(tp, tp + fp);
    const recall = safe(tp, tp + fn);
    const specificity = safe(tn, tn + fp);
    const accuracy = safe(tp + tn, truth.length);
    const balancedAccuracy = (recall + specificity) / 2;
    const denominator = Math.sqrt((tp + fp) * (tp + fn) * (tn + fp) * (tn + fn));
    const mcc = denominator ? (tp * tn - fp * fn) / denominator : 0;
    return Object.freeze({ tp, tn, fp, fn, precision, recall, truePositiveRate: recall, falsePositiveRate: safe(fp, fp + tn), specificity, accuracy, balancedAccuracy, mcc, f1: precision + recall ? 2 * precision * recall / (precision + recall) : 0 });
  }

  function rocCurve(truthValue, scoreValue) {
    const truth = Array.from(truthValue || [], Boolean);
    const scores = Array.from(scoreValue || [], Number);
    if (truth.length !== scores.length) throw new Error('Truth and score arrays must have equal length.');
    const thresholds = Array.from(new Set(scores.filter(finite))).sort((a, b) => b - a);
    const points = [Object.freeze({ threshold: Infinity, truePositiveRate: 0, falsePositiveRate: 0 })];
    for (const threshold of thresholds) {
      const metrics = confusionMetrics(truth, scores.map(value => value >= threshold));
      points.push(Object.freeze({ threshold, truePositiveRate: metrics.truePositiveRate, falsePositiveRate: metrics.falsePositiveRate, precision: metrics.precision, recall: metrics.recall }));
    }
    points.push(Object.freeze({ threshold: -Infinity, truePositiveRate: 1, falsePositiveRate: 1 }));
    const sorted = points.slice().sort((a, b) => a.falsePositiveRate - b.falsePositiveRate || a.truePositiveRate - b.truePositiveRate);
    let auc = 0;
    for (let index = 1; index < sorted.length; index += 1) auc += (sorted[index].falsePositiveRate - sorted[index - 1].falsePositiveRate) * (sorted[index].truePositiveRate + sorted[index - 1].truePositiveRate) / 2;
    return Object.freeze({ points: Object.freeze(points), auc: clamp(auc, 0, 1) });
  }

  function regressionMetrics(expectedValue, estimatedValue) {
    const expected = Array.from(expectedValue || [], Number);
    const estimated = Array.from(estimatedValue || [], Number);
    if (expected.length !== estimated.length) throw new Error('Expected and estimated arrays must have equal length.');
    let absolute = 0; let squared = 0; let bias = 0; let usable = 0;
    for (let index = 0; index < expected.length; index += 1) {
      if (!finite(expected[index]) || !finite(estimated[index])) continue;
      const error = estimated[index] - expected[index];
      absolute += Math.abs(error); squared += error * error; bias += error; usable += 1;
    }
    return Object.freeze({ count: usable, mae: usable ? absolute / usable : 0, rmse: usable ? Math.sqrt(squared / usable) : 0, bias: usable ? bias / usable : 0 });
  }

  function recoveredBitMetrics(expectedValue, recoveredValue, expectedBitLength = null) {
    const expected = asBytes(expectedValue);
    const recovered = asBytes(recoveredValue);
    const bitLength = expectedBitLength == null ? expected.length * 8 : Math.min(expected.length * 8, Math.max(0, Math.floor(expectedBitLength)));
    let wrong = 0;
    let correct = 0;
    for (let bit = 0; bit < bitLength; bit += 1) {
      const a = (expected[bit >> 3] >>> (7 - (bit & 7))) & 1;
      const byte = recovered[bit >> 3];
      const b = byte == null ? -1 : (byte >>> (7 - (bit & 7))) & 1;
      if (a === b) correct += 1; else wrong += 1;
    }
    let prefix = 0;
    while (prefix < expected.length && prefix < recovered.length && expected[prefix] === recovered[prefix]) prefix += 1;
    return Object.freeze({ bitLength, correctBits: correct, wrongBits: wrong, bitErrorRate: bitLength ? wrong / bitLength : 0, recoveredByteFraction: expected.length ? Math.min(expected.length, recovered.length) / expected.length : 0, longestCorrectPrefixBytes: prefix, exact: expected.length === recovered.length && prefix === expected.length });
  }

  function analyzeTextSteganography(textValue) {
    const text = String(textValue ?? '');
    const counts = { zeroWidth: 0, bidiControls: 0, variationSelectors: 0, nonBreakingSpaces: 0, unusualSpaces: 0, trailingWhitespaceLines: 0 };
    const suspicious = [];
    let index = 0;
    for (const character of text) {
      const code = character.codePointAt(0);
      let category = '';
      if ([0x200b, 0x200c, 0x200d, 0x2060, 0xfeff].includes(code)) { counts.zeroWidth += 1; category = 'zero-width'; }
      else if ((code >= 0x202a && code <= 0x202e) || (code >= 0x2066 && code <= 0x2069) || code === 0x200e || code === 0x200f) { counts.bidiControls += 1; category = 'bidi-control'; }
      else if ((code >= 0xfe00 && code <= 0xfe0f) || (code >= 0xe0100 && code <= 0xe01ef)) { counts.variationSelectors += 1; category = 'variation-selector'; }
      else if (code === 0x00a0) { counts.nonBreakingSpaces += 1; category = 'non-breaking-space'; }
      else if ([0x1680, 0x180e, 0x2000, 0x2001, 0x2002, 0x2003, 0x2004, 0x2005, 0x2006, 0x2007, 0x2008, 0x2009, 0x200a, 0x202f, 0x205f, 0x3000].includes(code)) { counts.unusualSpaces += 1; category = 'unusual-space'; }
      if (category && suspicious.length < 256) suspicious.push(Object.freeze({ index, codePoint: `U+${code.toString(16).toUpperCase().padStart(4, '0')}`, category }));
      index += character.length;
    }
    for (const line of text.split(/\r?\n/)) if (/[ \t]+$/.test(line)) counts.trailingWhitespaceLines += 1;
    const nfc = text.normalize ? text.normalize('NFC') : text;
    const nfkc = text.normalize ? text.normalize('NFKC') : text;
    return Object.freeze({ length: text.length, counts: Object.freeze(counts), suspicious: Object.freeze(suspicious), nfcChanges: nfc !== text, nfkcChanges: nfkc !== text, normalizationLengthDelta: text.length - nfkc.length, caveat: 'Unicode controls and unusual whitespace can be legitimate. Report exact code points and context rather than treating their presence as proof of hidden data.' });
  }

  function u16be(bytes, offset) { return (bytes[offset] << 8) | bytes[offset + 1]; }

  function inspectPngMetadata(value) {
    const bytes = asBytes(value);
    const signature = [137, 80, 78, 71, 13, 10, 26, 10];
    if (bytes.length < 8 || signature.some((byte, index) => bytes[index] !== byte)) return Object.freeze({ valid: false, chunks: Object.freeze([]), textChunks: Object.freeze([]) });
    const chunks = [];
    const textChunks = [];
    let offset = 8;
    while (offset + 12 <= bytes.length) {
      const length = ((bytes[offset] << 24) | (bytes[offset + 1] << 16) | (bytes[offset + 2] << 8) | bytes[offset + 3]) >>> 0;
      const type = String.fromCharCode(...bytes.slice(offset + 4, offset + 8));
      const start = offset + 8;
      const end = start + length;
      if (end + 4 > bytes.length) break;
      chunks.push(Object.freeze({ type, offset, length }));
      if (['tEXt', 'zTXt', 'iTXt'].includes(type)) {
        const data = bytes.slice(start, end);
        const zero = data.indexOf(0);
        const keyword = zero >= 0 ? String.fromCharCode(...data.slice(0, Math.min(zero, 128))) : '';
        textChunks.push(Object.freeze({ type, keyword, length, previewHex: Array.from(data.slice(0, 96), byte => byte.toString(16).padStart(2, '0')).join(' ') }));
      }
      offset = end + 4;
      if (type === 'IEND') break;
    }
    return Object.freeze({ valid: true, chunks: Object.freeze(chunks), textChunks: Object.freeze(textChunks), trailingBytes: Math.max(0, bytes.length - offset) });
  }

  function inspectJpegMetadata(value) {
    const bytes = asBytes(value);
    if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return Object.freeze({ valid: false, segments: Object.freeze([]) });
    const segments = [];
    let offset = 2;
    while (offset + 1 < bytes.length) {
      while (offset < bytes.length && bytes[offset] !== 0xff) offset += 1;
      while (offset < bytes.length && bytes[offset] === 0xff) offset += 1;
      if (offset >= bytes.length) break;
      const marker = bytes[offset++];
      if (marker === 0xd9) { segments.push(Object.freeze({ marker: 'EOI', code: marker, offset: offset - 2, length: 0 })); break; }
      if (marker === 0xda) { segments.push(Object.freeze({ marker: 'SOS', code: marker, offset: offset - 2, length: 0 })); break; }
      if ((marker >= 0xd0 && marker <= 0xd7) || marker === 0x01 || marker === 0xd8) continue;
      if (offset + 2 > bytes.length) break;
      const length = u16be(bytes, offset);
      if (length < 2 || offset + length > bytes.length) break;
      const dataStart = offset + 2;
      const dataEnd = offset + length;
      let label = `FF${marker.toString(16).toUpperCase().padStart(2, '0')}`;
      if (marker >= 0xe0 && marker <= 0xef) label = `APP${marker - 0xe0}`;
      else if (marker === 0xfe) label = 'COM';
      else if (marker === 0xdb) label = 'DQT';
      else if (marker === 0xc4) label = 'DHT';
      else if (marker === 0xc0) label = 'SOF0';
      else if (marker === 0xc2) label = 'SOF2';
      const previewBytes = bytes.slice(dataStart, Math.min(dataEnd, dataStart + 96));
      const ascii = Array.from(previewBytes, byte => byte >= 32 && byte <= 126 ? String.fromCharCode(byte) : '.').join('');
      let kind = '';
      if (ascii.startsWith('Exif')) kind = 'EXIF';
      else if (ascii.includes('http://ns.adobe.com/xap/1.0/')) kind = 'XMP';
      else if (ascii.startsWith('ICC_PROFILE')) kind = 'ICC profile';
      segments.push(Object.freeze({ marker: label, code: marker, offset: offset - 2, length, kind, asciiPreview: ascii }));
      offset = dataEnd;
    }
    return Object.freeze({ valid: true, segments: Object.freeze(segments) });
  }

  function buildHuffmanTable(counts, symbols) {
    const table = Array.from({ length: 17 }, () => new Map());
    let code = 0;
    let symbolIndex = 0;
    for (let length = 1; length <= 16; length += 1) {
      const count = counts[length - 1] || 0;
      for (let index = 0; index < count; index += 1) table[length].set(code++, symbols[symbolIndex++]);
      code <<= 1;
    }
    return table;
  }

  class EntropyReader {
    constructor(bytes, offset) { this.bytes = bytes; this.offset = offset; this.current = 0; this.remaining = 0; this.marker = null; }
    nextEntropyByte() {
      if (this.offset >= this.bytes.length) return null;
      let value = this.bytes[this.offset++];
      if (value !== 0xff) return value;
      while (this.offset < this.bytes.length && this.bytes[this.offset] === 0xff) this.offset += 1;
      if (this.offset >= this.bytes.length) return null;
      const next = this.bytes[this.offset++];
      if (next === 0x00) return 0xff;
      this.marker = next;
      return null;
    }
    readBit() {
      if (!this.remaining) {
        const value = this.nextEntropyByte();
        if (value == null) throw new Error(`JPEG entropy stream ended at marker ${this.marker == null ? 'EOF' : `FF${this.marker.toString(16)}`}.`);
        this.current = value;
        this.remaining = 8;
      }
      this.remaining -= 1;
      return (this.current >>> this.remaining) & 1;
    }
    readBits(count) { let value = 0; for (let index = 0; index < count; index += 1) value = (value << 1) | this.readBit(); return value; }
    decode(table) {
      let code = 0;
      for (let length = 1; length <= 16; length += 1) {
        code = (code << 1) | this.readBit();
        if (table[length].has(code)) return table[length].get(code);
      }
      throw new Error('JPEG Huffman code exceeded 16 bits.');
    }
  }

  function receiveExtended(reader, size) {
    if (!size) return 0;
    const value = reader.readBits(size);
    const threshold = 1 << (size - 1);
    return value < threshold ? value - ((1 << size) - 1) : value;
  }

  function createCoefficientAccumulator(component) {
    return {
      id: component.id, h: component.h, v: component.v, quantTableId: component.quantTableId, blocks: 0, dcSum: 0, dcAbsSum: 0, dcMin: Infinity, dcMax: -Infinity,
      nonzeroAc: 0, zeroAc: 0, oddAc: 0, evenAc: 0, plusMinusOneAc: 0,
      frequencies: Array.from({ length: 64 }, (_, zigzag) => ({ zigzag, naturalIndex: JPEG_ZIGZAG[zigzag], count: 0, nonzero: 0, odd: 0, even: 0, absSum: 0, min: Infinity, max: -Infinity })),
      samples: []
    };
  }

  function recordBlock(accumulator, coefficientsNatural) {
    accumulator.blocks += 1;
    const dc = coefficientsNatural[0];
    accumulator.dcSum += dc; accumulator.dcAbsSum += Math.abs(dc); accumulator.dcMin = Math.min(accumulator.dcMin, dc); accumulator.dcMax = Math.max(accumulator.dcMax, dc);
    for (let zigzag = 0; zigzag < 64; zigzag += 1) {
      const value = coefficientsNatural[JPEG_ZIGZAG[zigzag]];
      const row = accumulator.frequencies[zigzag];
      row.count += 1; row.absSum += Math.abs(value); row.min = Math.min(row.min, value); row.max = Math.max(row.max, value);
      if (value !== 0) {
        row.nonzero += 1;
        if (Math.abs(value) & 1) row.odd += 1; else row.even += 1;
        if (zigzag > 0) {
          accumulator.nonzeroAc += 1;
          if (Math.abs(value) & 1) accumulator.oddAc += 1; else accumulator.evenAc += 1;
          if (Math.abs(value) === 1) accumulator.plusMinusOneAc += 1;
        }
      } else if (zigzag > 0) accumulator.zeroAc += 1;
    }
    if (accumulator.samples.length < 256) accumulator.samples.push(Object.freeze(Array.from(coefficientsNatural)));
  }

  function finalizeAccumulator(accumulator) {
    const totalAc = accumulator.nonzeroAc + accumulator.zeroAc;
    const frequencies = accumulator.frequencies.map(row => Object.freeze({
      zigzag: row.zigzag, naturalIndex: row.naturalIndex, count: row.count, nonzero: row.nonzero,
      nonzeroFraction: row.count ? row.nonzero / row.count : 0,
      oddFractionAmongNonzero: row.nonzero ? row.odd / row.nonzero : 0,
      evenFractionAmongNonzero: row.nonzero ? row.even / row.nonzero : 0,
      meanAbsolute: row.count ? row.absSum / row.count : 0,
      min: row.count ? row.min : 0, max: row.count ? row.max : 0
    }));
    return Object.freeze({
      id: accumulator.id, h: accumulator.h, v: accumulator.v, quantTableId: accumulator.quantTableId, blocks: accumulator.blocks,
      dcMean: accumulator.blocks ? accumulator.dcSum / accumulator.blocks : 0,
      dcMeanAbsolute: accumulator.blocks ? accumulator.dcAbsSum / accumulator.blocks : 0,
      dcMin: accumulator.blocks ? accumulator.dcMin : 0, dcMax: accumulator.blocks ? accumulator.dcMax : 0,
      nonzeroAc: accumulator.nonzeroAc, zeroAc: accumulator.zeroAc,
      zeroAcFraction: totalAc ? accumulator.zeroAc / totalAc : 0,
      oddAcFractionAmongNonzero: accumulator.nonzeroAc ? accumulator.oddAc / accumulator.nonzeroAc : 0,
      evenAcFractionAmongNonzero: accumulator.nonzeroAc ? accumulator.evenAc / accumulator.nonzeroAc : 0,
      plusMinusOneFractionAmongNonzero: accumulator.nonzeroAc ? accumulator.plusMinusOneAc / accumulator.nonzeroAc : 0,
      oddEvenImbalance: accumulator.nonzeroAc ? Math.abs(accumulator.oddAc - accumulator.evenAc) / accumulator.nonzeroAc : 0,
      frequencies: Object.freeze(frequencies), sampleBlocks: Object.freeze(accumulator.samples)
    });
  }

  function inspectJpegCoefficients(value) {
    const bytes = asBytes(value);
    if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return Object.freeze({ valid: false, supported: false, reason: 'Not a JPEG SOI stream.' });
    const quantTables = new Map();
    const huffmanTables = new Map();
    let frame = null;
    let progressive = false;
    let restartInterval = 0;
    let offset = 2;
    let scanStart = -1;
    let scanSelectors = null;
    while (offset + 1 < bytes.length) {
      while (offset < bytes.length && bytes[offset] !== 0xff) offset += 1;
      while (offset < bytes.length && bytes[offset] === 0xff) offset += 1;
      if (offset >= bytes.length) break;
      const marker = bytes[offset++];
      if (marker === 0xd9) break;
      if ((marker >= 0xd0 && marker <= 0xd7) || marker === 0x01 || marker === 0xd8) continue;
      if (offset + 2 > bytes.length) break;
      const length = u16be(bytes, offset);
      if (length < 2 || offset + length > bytes.length) throw new Error('JPEG segment length exceeds input.');
      const start = offset + 2;
      const end = offset + length;
      if (marker === 0xdb) {
        let p = start;
        while (p < end) {
          const info = bytes[p++]; const precision = info >>> 4; const id = info & 0x0f;
          const values = [];
          for (let index = 0; index < 64; index += 1) { values.push(precision ? u16be(bytes, p) : bytes[p]); p += precision ? 2 : 1; }
          quantTables.set(id, Object.freeze({ id, precision: precision ? 16 : 8, values: Object.freeze(values) }));
        }
      } else if (marker === 0xc4) {
        let p = start;
        while (p < end) {
          const info = bytes[p++]; const tableClass = info >>> 4; const id = info & 0x0f;
          const counts = Array.from(bytes.slice(p, p + 16)); p += 16;
          const symbolCount = counts.reduce((sum, count) => sum + count, 0);
          const symbols = Array.from(bytes.slice(p, p + symbolCount)); p += symbolCount;
          huffmanTables.set(`${tableClass}:${id}`, Object.freeze({ tableClass, id, counts: Object.freeze(counts), symbols: Object.freeze(symbols), decode: buildHuffmanTable(counts, symbols) }));
        }
      } else if (marker === 0xc0 || marker === 0xc2) {
        progressive = marker === 0xc2;
        const precision = bytes[start]; const height = u16be(bytes, start + 1); const width = u16be(bytes, start + 3); const count = bytes[start + 5];
        const components = [];
        let p = start + 6;
        for (let index = 0; index < count; index += 1) { const id = bytes[p++]; const hv = bytes[p++]; const quantTableId = bytes[p++]; components.push(Object.freeze({ id, h: hv >>> 4, v: hv & 0x0f, quantTableId })); }
        frame = Object.freeze({ precision, width, height, components: Object.freeze(components), marker: progressive ? 'SOF2' : 'SOF0' });
      } else if (marker === 0xdd) restartInterval = u16be(bytes, start);
      else if (marker === 0xda) {
        const count = bytes[start];
        const selectors = new Map();
        let p = start + 1;
        for (let index = 0; index < count; index += 1) { const id = bytes[p++]; const tables = bytes[p++]; selectors.set(id, Object.freeze({ dcTableId: tables >>> 4, acTableId: tables & 0x0f })); }
        const spectralStart = bytes[p++]; const spectralEnd = bytes[p++]; const approximation = bytes[p++];
        scanSelectors = Object.freeze({ selectors, spectralStart, spectralEnd, approximation });
        scanStart = end;
        break;
      }
      offset = end;
    }
    if (!frame || scanStart < 0 || !scanSelectors) return Object.freeze({ valid: true, supported: false, reason: 'JPEG frame or scan header was not found.', frame, progressive, restartInterval });
    if (progressive) return Object.freeze({ valid: true, supported: false, reason: 'Progressive JPEG coefficient decoding is not yet enabled; metadata and marker inspection remain available.', frame, progressive, restartInterval });
    if (restartInterval) return Object.freeze({ valid: true, supported: false, reason: 'Baseline JPEG uses restart intervals; this first coefficient-domain decoder intentionally refuses to guess across restart boundaries.', frame, progressive, restartInterval });
    if (scanSelectors.spectralStart !== 0 || scanSelectors.spectralEnd !== 63 || scanSelectors.approximation !== 0) return Object.freeze({ valid: true, supported: false, reason: 'Non-baseline spectral selection is unsupported by the baseline coefficient decoder.', frame, progressive, restartInterval });
    const maxH = Math.max(...frame.components.map(component => component.h));
    const maxV = Math.max(...frame.components.map(component => component.v));
    const mcuColumns = Math.ceil(frame.width / (8 * maxH));
    const mcuRows = Math.ceil(frame.height / (8 * maxV));
    const accumulators = new Map(frame.components.map(component => [component.id, createCoefficientAccumulator(component)]));
    const predictors = new Map(frame.components.map(component => [component.id, 0]));
    const reader = new EntropyReader(bytes, scanStart);
    for (let my = 0; my < mcuRows; my += 1) {
      for (let mx = 0; mx < mcuColumns; mx += 1) {
        for (const component of frame.components) {
          const selector = scanSelectors.selectors.get(component.id);
          if (!selector) throw new Error(`JPEG scan omitted frame component ${component.id}.`);
          const dcTable = huffmanTables.get(`0:${selector.dcTableId}`)?.decode;
          const acTable = huffmanTables.get(`1:${selector.acTableId}`)?.decode;
          if (!dcTable || !acTable) throw new Error(`JPEG Huffman table missing for component ${component.id}.`);
          for (let vy = 0; vy < component.v; vy += 1) {
            for (let hx = 0; hx < component.h; hx += 1) {
              const coefficients = new Int16Array(64);
              const dcSize = reader.decode(dcTable);
              const dcDelta = receiveExtended(reader, dcSize);
              const dc = (predictors.get(component.id) || 0) + dcDelta;
              predictors.set(component.id, dc);
              coefficients[0] = dc;
              let zigzag = 1;
              while (zigzag < 64) {
                const symbol = reader.decode(acTable);
                if (symbol === 0) break;
                const run = symbol >>> 4;
                const size = symbol & 0x0f;
                if (run === 15 && size === 0) { zigzag += 16; continue; }
                zigzag += run;
                if (zigzag >= 64) throw new Error('JPEG AC run exceeded block boundary.');
                coefficients[JPEG_ZIGZAG[zigzag]] = receiveExtended(reader, size);
                zigzag += 1;
              }
              recordBlock(accumulators.get(component.id), coefficients);
            }
          }
        }
      }
    }
    const components = frame.components.map(component => finalizeAccumulator(accumulators.get(component.id)));
    return Object.freeze({
      valid: true, supported: true, frame, progressive: false, restartInterval: 0, mcuColumns, mcuRows,
      quantizationTables: Object.freeze(Array.from(quantTables.values())),
      huffmanTables: Object.freeze(Array.from(huffmanTables.values()).map(table => Object.freeze({ tableClass: table.tableClass, id: table.id, counts: table.counts, symbolCount: table.symbols.length }))),
      components: Object.freeze(components),
      caveat: 'Coefficient histograms, odd/even populations, ±1 concentration, and quantization structure are forensic features. They do not identify a specific embedding algorithm without calibrated reference evidence.'
    });
  }

  return Object.freeze({
    version: VERSION,
    rsAnalysis,
    rsGroupCounts,
    samplePairAnalysis,
    samplePairAnalysisFromPairs,
    samplePairTraceCounts,
    samplePairsFromSamples,
    lsbEntropy,
    lsbPairChiSquare,
    rgbaChannelSamples,
    rgbaSpatialPairs,
    residualRoughness,
    residualCooccurrence,
    analyzeRasterRegion,
    localizedRasterAnalysis,
    compareRasters,
    confusionMetrics,
    rocCurve,
    regressionMetrics,
    recoveredBitMetrics,
    analyzeTextSteganography,
    inspectPngMetadata,
    inspectJpegMetadata,
    inspectJpegCoefficients,
    constants: Object.freeze({ VERSION, DEFAULT_RS_MASK, DEFAULT_TILE_SIZE, JPEG_ZIGZAG })
  });
});
