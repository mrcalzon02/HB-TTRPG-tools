(function installCommunicationCapacityAnalyzer(root, factory) {
  'use strict';
  const api = factory(root || globalThis);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.BinaryCubeCommunicationCapacityAnalyzer = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function createCommunicationCapacityAnalyzer(root) {
  'use strict';

  const PANEL_ID = 'binary-cube-communication-capacity-analyzer';
  const STYLE_ID = 'binary-cube-communication-capacity-analyzer-style';
  const PAPER_TITLE = 'Quantitative tools for comparing animal communication systems: information theory applied to bottlenose dolphin whistle repertoires';
  const PAPER_YEAR = 1999;
  const PAPER_AUTHORS = 'Brenda McCowan, Sean F. Hanser, Laurance R. Doyle';
  const HUMAN_ZIPF_REFERENCE = -1.00;
  const ADULT_DOLPHIN_ZIPF_REFERENCE = -0.95;
  const INFANT_DOLPHIN_ZIPF_REFERENCE = -0.82;
  const RANDOM_ZIPF_REFERENCE = -0.09;
  const MAX_INPUT_BYTES = 2 * 1024 * 1024;
  const MAX_SYMBOLS_FOR_SEQUENCE_ANALYSIS = 250000;
  const MAX_ENTROPY_ORDER = 5;
  const SHUFFLE_REPLICATES = 16;

  let panel = null;
  let activeBytes = null;
  let activeName = '';
  let activeToken = null;
  let lastReport = null;

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
      try { return new TextDecoder('utf-8', { fatal: false }).decode(bytes); } catch (_) { /* fallback below */ }
    }
    return Array.from(bytes, byte => byte >= 32 && byte <= 126 || byte === 9 || byte === 10 || byte === 13 ? String.fromCharCode(byte) : '�').join('');
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

  function bytesFromBits(value) {
    const bits = String(value ?? '').replace(/\s+/g, '');
    if (!bits || /[^01]/.test(bits)) fail('Binary input must contain only 0 and 1.');
    const output = new Uint8Array(Math.floor(bits.length / 8));
    for (let index = 0; index < output.length; index += 1) output[index] = parseInt(bits.slice(index * 8, index * 8 + 8), 2);
    return output;
  }

  function parseFlexibleInput(value, mode = 'auto') {
    const raw = String(value ?? '');
    if (!raw.trim()) fail('Input is empty.');
    if (mode === 'text') return textToBytes(raw);
    if (mode === 'hex') return bytesFromHex(raw);
    if (mode === 'base64') return bytesFromBase64(raw);
    if (mode === 'binary') return bytesFromBits(raw);
    const compact = raw.replace(/\s+/g, '');
    if (compact.length >= 16 && !/[^01]/.test(compact)) return bytesFromBits(raw);
    const hex = raw.replace(/0x/gi, '').replace(/[\s:_-]+/g, '');
    if (hex.length >= 16 && hex.length % 2 === 0 && !/[^0-9a-f]/i.test(hex)) return bytesFromHex(raw);
    if (compact.length >= 16 && compact.length % 4 === 0 && /^[A-Za-z0-9+/]+={0,2}$/.test(compact)) {
      try { return bytesFromBase64(compact); } catch (_) { /* text fallback */ }
    }
    return textToBytes(raw);
  }

  function symbolsFromBitGroups(bytesValue, widthValue) {
    const bytes = asBytes(bytesValue);
    const width = clamp(Math.floor(Number(widthValue) || 1), 1, 8);
    const symbols = [];
    let buffer = 0;
    let count = 0;
    const mask = (1 << width) - 1;
    for (const byte of bytes) {
      buffer = (buffer << 8) | byte;
      count += 8;
      while (count >= width) {
        count -= width;
        symbols.push((buffer >>> count) & mask);
        if (count === 0) buffer = 0;
        else buffer &= (1 << count) - 1;
      }
    }
    return symbols;
  }

  function tokenize(bytesValue, mode = 'bytes') {
    const bytes = asBytes(bytesValue);
    if (mode === 'bytes') return Array.from(bytes);
    if (mode === 'nibbles') return symbolsFromBitGroups(bytes, 4);
    if (mode === '2bit') return symbolsFromBitGroups(bytes, 2);
    if (mode === 'bits') return symbolsFromBitGroups(bytes, 1);
    const text = bytesToText(bytes);
    if (mode === 'characters') return Array.from(text);
    if (mode === 'words') {
      const words = text.toLowerCase().match(/[\p{L}\p{N}_'-]+|[^\s\p{L}\p{N}_'-]+/gu) || [];
      return words;
    }
    return Array.from(bytes);
  }

  function frequencyTable(symbolsValue) {
    const symbols = Array.from(symbolsValue || []);
    const counts = new Map();
    for (const symbol of symbols) counts.set(symbol, (counts.get(symbol) || 0) + 1);
    return Array.from(counts, ([symbol, count]) => ({ symbol, count, probability: count / Math.max(1, symbols.length) }))
      .sort((left, right) => right.count - left.count || String(left.symbol).localeCompare(String(right.symbol)));
  }

  function linearRegression(pointsValue) {
    const points = Array.from(pointsValue || []);
    if (points.length < 2) return Object.freeze({ slope: 0, intercept: 0, r2: 0 });
    const meanX = points.reduce((sum, point) => sum + point.x, 0) / points.length;
    const meanY = points.reduce((sum, point) => sum + point.y, 0) / points.length;
    let numerator = 0;
    let denominator = 0;
    let totalY = 0;
    for (const point of points) {
      const dx = point.x - meanX;
      numerator += dx * (point.y - meanY);
      denominator += dx * dx;
      totalY += (point.y - meanY) ** 2;
    }
    const slope = denominator ? numerator / denominator : 0;
    const intercept = meanY - slope * meanX;
    let residual = 0;
    for (const point of points) {
      const predicted = intercept + slope * point.x;
      residual += (point.y - predicted) ** 2;
    }
    const r2 = totalY ? 1 - residual / totalY : 1;
    return Object.freeze({ slope, intercept, r2 });
  }

  function zipfAnalysis(symbolsValue) {
    const symbols = Array.from(symbolsValue || []);
    const frequencies = frequencyTable(symbols);
    const points = frequencies
      .filter(row => row.count > 0)
      .map((row, index) => ({ x: Math.log10(index + 1), y: Math.log10(row.count), rank: index + 1, count: row.count, symbol: row.symbol }));
    const fit = linearRegression(points);
    const distanceToHuman = Math.abs(fit.slope - HUMAN_ZIPF_REFERENCE);
    const distanceToAdultDolphin = Math.abs(fit.slope - ADULT_DOLPHIN_ZIPF_REFERENCE);
    const distanceToRandomReference = Math.abs(fit.slope - RANDOM_ZIPF_REFERENCE);
    return Object.freeze({
      slope: fit.slope,
      intercept: fit.intercept,
      r2: fit.r2,
      symbolCount: symbols.length,
      repertoireSize: frequencies.length,
      distanceToHuman,
      distanceToAdultDolphin,
      distanceToRandomReference,
      firstOrderSampleRatio: symbols.length / Math.max(1, frequencies.length),
      firstOrderAdequate: symbols.length >= frequencies.length * 5,
      topFrequencies: Object.freeze(frequencies.slice(0, 20).map(Object.freeze))
    });
  }

  function shannonFromCounts(counts, total) {
    if (!total) return 0;
    let entropy = 0;
    for (const count of counts.values()) {
      const probability = count / total;
      entropy -= probability * Math.log2(probability);
    }
    return entropy;
  }

  function entropyOfSymbols(symbolsValue) {
    const symbols = Array.from(symbolsValue || []);
    const counts = new Map();
    for (const symbol of symbols) counts.set(symbol, (counts.get(symbol) || 0) + 1);
    return shannonFromCounts(counts, symbols.length);
  }

  function conditionalEntropy(symbolsValue, contextLengthValue = 1) {
    const symbols = Array.from(symbolsValue || []);
    const contextLength = Math.max(0, Math.floor(Number(contextLengthValue) || 0));
    if (contextLength === 0) return entropyOfSymbols(symbols);
    if (symbols.length <= contextLength) return 0;
    const contextCounts = new Map();
    const jointCounts = new Map();
    let observations = 0;
    for (let index = contextLength; index < symbols.length; index += 1) {
      const context = JSON.stringify(symbols.slice(index - contextLength, index));
      const joint = `${context}\u0000${JSON.stringify(symbols[index])}`;
      contextCounts.set(context, (contextCounts.get(context) || 0) + 1);
      jointCounts.set(joint, (jointCounts.get(joint) || 0) + 1);
      observations += 1;
    }
    let entropy = 0;
    for (const [joint, count] of jointCounts) {
      const separator = joint.lastIndexOf('\u0000');
      const context = joint.slice(0, separator);
      const pJoint = count / observations;
      const pNextGivenContext = count / contextCounts.get(context);
      entropy -= pJoint * Math.log2(pNextGivenContext);
    }
    return entropy;
  }

  function entropyOrderProfile(symbolsValue, maximumOrderValue = MAX_ENTROPY_ORDER) {
    const symbols = Array.from(symbolsValue || []);
    const maxOrder = clamp(Math.floor(Number(maximumOrderValue) || MAX_ENTROPY_ORDER), 1, MAX_ENTROPY_ORDER);
    const repertoireSize = new Set(symbols).size;
    const rows = [{ order: 0, entropy: repertoireSize > 0 ? Math.log2(repertoireSize) : 0, contextLength: null }];
    for (let order = 1; order <= maxOrder; order += 1) {
      rows.push({ order, entropy: conditionalEntropy(symbols, order - 1), contextLength: order - 1 });
    }
    const slopeFit = linearRegression(rows.map(row => ({ x: row.order, y: row.entropy })));
    const sequentialDrop = rows.length > 2 ? rows[1].entropy - rows[rows.length - 1].entropy : 0;
    return Object.freeze({
      rows: Object.freeze(rows.map(Object.freeze)),
      slope: slopeFit.slope,
      r2: slopeFit.r2,
      sequentialDrop,
      repertoireSize,
      symbolCount: symbols.length
    });
  }

  function deterministicShuffle(symbolsValue, seedValue) {
    const output = Array.from(symbolsValue || []);
    let state = (Number(seedValue) >>> 0) || 0x9e3779b9;
    const random = () => {
      state ^= state << 13;
      state ^= state >>> 17;
      state ^= state << 5;
      return (state >>> 0) / 0x100000000;
    };
    for (let index = output.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(random() * (index + 1));
      [output[index], output[swapIndex]] = [output[swapIndex], output[index]];
    }
    return output;
  }

  function surrogateSequenceTest(symbolsValue, maximumOrderValue = 3, replicatesValue = SHUFFLE_REPLICATES) {
    const symbols = Array.from(symbolsValue || []);
    const maximumOrder = clamp(Math.floor(Number(maximumOrderValue) || 3), 2, MAX_ENTROPY_ORDER);
    const replicates = clamp(Math.floor(Number(replicatesValue) || SHUFFLE_REPLICATES), 4, 64);
    const observed = entropyOrderProfile(symbols, maximumOrder);
    const slopes = [];
    const drops = [];
    for (let replicate = 0; replicate < replicates; replicate += 1) {
      const shuffled = deterministicShuffle(symbols, 0x9e3779b9 ^ ((replicate + 1) * 0x45d9f3b));
      const profile = entropyOrderProfile(shuffled, maximumOrder);
      slopes.push(profile.slope);
      drops.push(profile.sequentialDrop);
    }
    const average = values => values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length);
    const meanSlope = average(slopes);
    const meanDrop = average(drops);
    const slopeDelta = observed.slope - meanSlope;
    const dropDelta = observed.sequentialDrop - meanDrop;
    return Object.freeze({ observed, replicateCount: replicates, shuffledMeanSlope: meanSlope, shuffledMeanSequentialDrop: meanDrop, slopeDelta, sequentialDropDelta: dropDelta });
  }

  function sampleSufficiency(symbolsValue, maximumOrderValue = MAX_ENTROPY_ORDER) {
    const symbols = Array.from(symbolsValue || []);
    const repertoireSize = new Set(symbols).size;
    const rows = [];
    for (let order = 1; order <= maximumOrderValue; order += 1) {
      const contextLength = Math.max(0, order - 1);
      const contexts = new Set();
      if (contextLength === 0) contexts.add('∅');
      else for (let index = contextLength; index < symbols.length; index += 1) contexts.add(JSON.stringify(symbols.slice(index - contextLength, index)));
      const observations = Math.max(0, symbols.length - contextLength);
      const averagePerObservedContext = observations / Math.max(1, contexts.size);
      const theoreticalContextCount = contextLength === 0 ? 1 : repertoireSize ** contextLength;
      rows.push(Object.freeze({
        order,
        contextLength,
        observations,
        observedContexts: contexts.size,
        theoreticalContextCount: Number.isFinite(theoreticalContextCount) ? theoreticalContextCount : Infinity,
        averagePerObservedContext,
        adequate: order === 1 ? symbols.length >= repertoireSize * 5 : averagePerObservedContext >= 5
      }));
    }
    return Object.freeze(rows);
  }

  function lagMutualInformation(symbolsValue, lagValue = 1) {
    const symbols = Array.from(symbolsValue || []);
    const lag = Math.max(1, Math.floor(Number(lagValue) || 1));
    const total = symbols.length - lag;
    if (total < 2) return 0;
    const first = new Map();
    const second = new Map();
    const joint = new Map();
    for (let index = 0; index < total; index += 1) {
      const left = JSON.stringify(symbols[index]);
      const right = JSON.stringify(symbols[index + lag]);
      first.set(left, (first.get(left) || 0) + 1);
      second.set(right, (second.get(right) || 0) + 1);
      const pair = `${left}\u0000${right}`;
      joint.set(pair, (joint.get(pair) || 0) + 1);
    }
    let information = 0;
    for (const [pair, count] of joint) {
      const separator = pair.indexOf('\u0000');
      const left = pair.slice(0, separator);
      const right = pair.slice(separator + 1);
      const pxy = count / total;
      const px = first.get(left) / total;
      const py = second.get(right) / total;
      information += pxy * Math.log2(pxy / (px * py));
    }
    return information;
  }

  function analyzeMode(bytesValue, mode, options = {}) {
    const allSymbols = tokenize(bytesValue, mode);
    const symbols = allSymbols.length > MAX_SYMBOLS_FOR_SEQUENCE_ANALYSIS
      ? allSymbols.slice(0, MAX_SYMBOLS_FOR_SEQUENCE_ANALYSIS)
      : allSymbols;
    const maximumOrder = clamp(Math.floor(Number(options.maximumOrder) || MAX_ENTROPY_ORDER), 2, MAX_ENTROPY_ORDER);
    const zipf = zipfAnalysis(symbols);
    const entropyProfile = entropyOrderProfile(symbols, maximumOrder);
    const surrogate = surrogateSequenceTest(symbols, Math.min(3, maximumOrder), options.shuffleReplicates || SHUFFLE_REPLICATES);
    const sufficiency = sampleSufficiency(symbols, maximumOrder);
    const lagRows = [];
    for (let lag = 1; lag <= Math.min(12, Math.max(1, Math.floor(symbols.length / 20))); lag += 1) {
      lagRows.push(Object.freeze({ lag, mutualInformation: lagMutualInformation(symbols, lag) }));
    }
    lagRows.sort((left, right) => right.mutualInformation - left.mutualInformation);
    const firstOrderSimilarity = clamp(1 - Math.abs(zipf.slope - HUMAN_ZIPF_REFERENCE) / 1.5, 0, 1);
    const sequentialEvidence = clamp((surrogate.sequentialDropDelta + Math.max(0, -surrogate.slopeDelta)) / 2, 0, 1);
    const reliableOrders = sufficiency.filter(row => row.adequate).length;
    const reliabilityFraction = reliableOrders / Math.max(1, sufficiency.length);
    const evidenceScore = 100 * (firstOrderSimilarity * 0.35 + sequentialEvidence * 0.45 + reliabilityFraction * 0.20);
    let classification = 'inconclusive communication-like organization';
    if (evidenceScore >= 70 && zipf.r2 >= 0.7) classification = 'strong communication-like statistical organization';
    else if (evidenceScore >= 45) classification = 'moderate non-random sequential organization';
    else if (Math.abs(zipf.slope) < 0.2 && Math.abs(entropyProfile.slope) < 0.1) classification = 'weak communication-capacity signature / random-like organization';
    return Object.freeze({
      mode,
      symbolsAnalyzed: symbols.length,
      symbolsAvailable: allSymbols.length,
      truncatedForSequenceAnalysis: symbols.length !== allSymbols.length,
      zipf,
      entropyProfile,
      surrogate,
      sufficiency,
      strongestLags: Object.freeze(lagRows.slice(0, 8)),
      reliableOrderCount: reliableOrders,
      evidenceScore,
      classification,
      caveat: 'A communication-like Zipf slope or entropy-order structure is a necessary-looking statistical signature in some communication systems, not proof of language, semantics, intelligence, or decoded meaning.'
    });
  }

  function analyzeCommunicationCapacity(bytesValue, options = {}) {
    const bytes = asBytes(bytesValue);
    if (!bytes.length) fail('Load data before communication-capacity analysis.');
    if (bytes.length > MAX_INPUT_BYTES) fail(`Input exceeds ${MAX_INPUT_BYTES.toLocaleString()} bytes.`);
    const requestedModes = Array.isArray(options.modes) && options.modes.length
      ? options.modes
      : ['bytes', 'nibbles', '2bit', 'bits', 'characters', 'words'];
    const reports = [];
    for (const mode of requestedModes) {
      const report = analyzeMode(bytes, mode, options);
      if (report.symbolsAnalyzed >= 10 && report.zipf.repertoireSize >= 2) reports.push(report);
    }
    reports.sort((left, right) => right.evidenceScore - left.evidenceScore || right.zipf.r2 - left.zipf.r2);
    return Object.freeze({
      paper: Object.freeze({ title: PAPER_TITLE, year: PAPER_YEAR, authors: PAPER_AUTHORS }),
      byteLength: bytes.length,
      reports: Object.freeze(reports),
      best: reports[0] || null,
      referenceSlopes: Object.freeze({ humanLanguage: HUMAN_ZIPF_REFERENCE, adultDolphinWhistles: ADULT_DOLPHIN_ZIPF_REFERENCE, infantDolphinWhistles: INFANT_DOLPHIN_ZIPF_REFERENCE, randomReference: RANDOM_ZIPF_REFERENCE }),
      caveat: 'The 1999 dolphin study compared statistical organization and proposed communication capacity as an interspecies measure. Its dolphin higher-order entropy sample was preliminary and undersampled; this analyzer therefore reports explicit sample sufficiency rather than equating a numerical match with equal semantic information.'
    });
  }

  function ensureStyle() {
    if (!root?.document || root.document.getElementById(STYLE_ID)) return;
    const link = root.document.createElement('link');
    link.id = STYLE_ID;
    link.rel = 'stylesheet';
    link.href = 'binary-cube-communication-capacity-analyzer.css?v=20260809-communication-capacity-1';
    root.document.head.appendChild(link);
  }

  function formatNumber(value, digits = 4) { return Number.isFinite(Number(value)) ? Number(value).toFixed(digits) : '—'; }

  function renderReport(reportValue) {
    lastReport = reportValue;
    const target = panel?.querySelector('[data-bcca-report]');
    if (!target) return;
    const report = reportValue;
    if (!report?.reports?.length) {
      target.innerHTML = '<p class="bcca-muted">No usable symbolization produced enough categories for analysis.</p>';
      return;
    }
    const summaryRows = report.reports.map(item => `<tr><td>${esc(item.mode)}</td><td>${item.evidenceScore.toFixed(1)}</td><td>${formatNumber(item.zipf.slope, 4)}</td><td>${formatNumber(item.zipf.r2, 4)}</td><td>${formatNumber(item.entropyProfile.slope, 4)}</td><td>${item.reliableOrderCount}/${item.sufficiency.length}</td><td>${esc(item.classification)}</td></tr>`).join('');
    const detailed = report.reports.map(item => {
      const entropyRows = item.entropyProfile.rows.map(row => `<tr><td>H${row.order}</td><td>${formatNumber(row.entropy, 5)}</td><td>${row.contextLength === null ? 'repertoire' : row.contextLength}</td></tr>`).join('');
      const sufficiencyRows = item.sufficiency.map(row => `<tr><td>H${row.order}</td><td>${row.observations.toLocaleString()}</td><td>${row.observedContexts.toLocaleString()}</td><td>${formatNumber(row.averagePerObservedContext, 2)}</td><td>${row.adequate ? 'adequate' : 'undersampled'}</td></tr>`).join('');
      const lagRows = item.strongestLags.map(row => `<span class="bcca-chip">lag ${row.lag}: ${formatNumber(row.mutualInformation, 5)} bits</span>`).join('');
      return `<section class="bcca-card"><div class="bcca-mode-head"><div><h3>${esc(item.mode)} symbols</h3><p>${esc(item.classification)}</p></div><strong>${item.evidenceScore.toFixed(1)} / 100</strong></div><div class="bcca-metrics"><div><span>Zipf slope</span><b>${formatNumber(item.zipf.slope, 4)}</b></div><div><span>Zipf R²</span><b>${formatNumber(item.zipf.r2, 4)}</b></div><div><span>Entropy-order slope</span><b>${formatNumber(item.entropyProfile.slope, 4)}</b></div><div><span>Sequential drop</span><b>${formatNumber(item.entropyProfile.sequentialDrop, 4)}</b></div><div><span>Shuffle drop delta</span><b>${formatNumber(item.surrogate.sequentialDropDelta, 4)}</b></div><div><span>Symbols</span><b>${item.symbolsAnalyzed.toLocaleString()}</b></div></div><div class="bcca-grid"><div><h4>Entropy orders</h4><div class="bcca-table"><table><thead><tr><th>Order</th><th>Entropy</th><th>Context</th></tr></thead><tbody>${entropyRows}</tbody></table></div></div><div><h4>Sampling sufficiency</h4><div class="bcca-table"><table><thead><tr><th>Order</th><th>Obs.</th><th>Contexts</th><th>Obs/context</th><th>Status</th></tr></thead><tbody>${sufficiencyRows}</tbody></table></div></div></div><h4>Strongest lag mutual information</h4><div class="bcca-chips">${lagRows || '<span class="bcca-muted">Insufficient sequence.</span>'}</div><p class="bcca-muted">${esc(item.caveat)}</p></section>`;
    }).join('');
    target.innerHTML = `<section class="bcca-card bcca-overview"><h3>Communication-capacity comparison</h3><p>${esc(report.caveat)}</p><div class="bcca-reference"><span>Human-language Zipf reference ${HUMAN_ZIPF_REFERENCE.toFixed(2)}</span><span>Adult dolphin whistles ${ADULT_DOLPHIN_ZIPF_REFERENCE.toFixed(2)}</span><span>Infant dolphin whistles ${INFANT_DOLPHIN_ZIPF_REFERENCE.toFixed(2)}</span><span>Random comparison ${RANDOM_ZIPF_REFERENCE.toFixed(2)}</span></div><div class="bcca-table"><table><thead><tr><th>Symbolization</th><th>Evidence</th><th>Zipf slope</th><th>R²</th><th>Entropy slope</th><th>Reliable orders</th><th>Classification</th></tr></thead><tbody>${summaryRows}</tbody></table></div></section>${detailed}`;
  }

  function setStatus(message, kind = '') {
    const node = panel?.querySelector('[data-bcca-status]');
    if (node) { node.textContent = message; node.dataset.kind = kind; }
  }

  function loadBytes(value, name = 'analysis-input') {
    const bytes = asBytes(value);
    if (!bytes.length) fail('Input is empty.');
    if (bytes.length > MAX_INPUT_BYTES) fail(`Input exceeds ${MAX_INPUT_BYTES.toLocaleString()} bytes.`);
    activeBytes = Uint8Array.from(bytes);
    activeName = String(name || 'analysis-input');
    const summary = panel?.querySelector('[data-bcca-source]');
    if (summary) summary.innerHTML = `<span>${esc(activeName)}</span><strong>${activeBytes.length.toLocaleString()} bytes</strong>`;
    panel.querySelector('[data-bcca-run]').disabled = false;
    setStatus(`Loaded ${activeName}.`, 'success');
    return activeBytes;
  }

  async function executeAnalysis() {
    if (!activeBytes?.length) fail('Load data first.');
    activeToken?.cancel?.('superseded by newer communication analysis');
    const runner = root?.ScientificToolsCooperativeRunner;
    activeToken = runner?.createToken?.('Communication-capacity analysis') || { cancelled: false, cancel(reason) { this.cancelled = true; this.reason = reason; } };
    const button = panel.querySelector('[data-bcca-run]');
    const cancel = panel.querySelector('[data-bcca-cancel]');
    button.disabled = true;
    cancel.disabled = false;
    setStatus('Analyzing symbol organizations…');
    try {
      if (runner?.yieldControl) await runner.yieldControl();
      const selected = [...panel.querySelectorAll('[data-bcca-mode]:checked')].map(input => input.value);
      const report = analyzeCommunicationCapacity(activeBytes, {
        modes: selected,
        maximumOrder: panel.querySelector('#bcca-order').value,
        shuffleReplicates: panel.querySelector('#bcca-shuffles').value
      });
      if (activeToken.cancelled) fail(activeToken.reason || 'Analysis cancelled.');
      renderReport(report);
      setStatus(`Complete · ${report.reports.length} symbolizations analyzed.`, 'success');
    } catch (error) {
      if (activeToken?.cancelled) setStatus(`Cancelled${activeToken.reason ? ` · ${activeToken.reason}` : ''}.`, 'warning');
      else { setStatus(error.message, 'error'); throw error; }
    } finally {
      button.disabled = !activeBytes?.length;
      cancel.disabled = true;
      activeToken = null;
    }
  }

  function buildPanel() {
    if (!root?.document) fail('Communication Capacity Analyzer requires a browser document.');
    const existing = root.document.getElementById(PANEL_ID);
    if (existing) { panel = existing; return panel; }
    ensureStyle();
    panel = root.document.createElement('section');
    panel.id = PANEL_ID;
    panel.className = 'bcca-shell';
    panel.hidden = true;
    panel.setAttribute('aria-labelledby', 'bcca-title');
    panel.innerHTML = `<div class="bcca-backdrop" data-bcca-close></div><div class="bcca-panel" role="dialog" aria-modal="true" aria-labelledby="bcca-title"><header class="bcca-header"><div><p class="bcca-eyebrow">Scientific Tools · Decryption Dashboard</p><h2 id="bcca-title">Communication Capacity Analyzer</h2><p>McCowan–Hanser–Doyle-style first- and higher-order information analysis for unknown symbolic streams. Tests whether multiple possible symbolizations show Zipf-like balance, sequential dependence, entropy-order structure, and organization beyond shuffled surrogates.</p></div><button type="button" class="bcca-close" data-bcca-close aria-label="Close Communication Capacity Analyzer">×</button></header><div class="bcca-body"><aside class="bcca-controls"><section class="bcca-card"><h3>Acquire material</h3><label>Upload file<input id="bcca-file" type="file"></label><label>Paste format<select id="bcca-mode"><option value="auto">Auto detect</option><option value="text">Literal text</option><option value="hex">Hex</option><option value="base64">Base64</option><option value="binary">Binary bits</option></select></label><label>Paste material<textarea id="bcca-input" rows="8" spellcheck="false"></textarea></label><div class="bcca-actions"><button type="button" class="primary-action" data-bcca-load>Load input</button><button type="button" data-bcca-clear>Clear</button></div><div class="bcca-source" data-bcca-source><span>No source</span><strong>0 bytes</strong></div></section><section class="bcca-card"><h3>Symbol hypotheses</h3><div class="bcca-checks"><label><input type="checkbox" value="bytes" data-bcca-mode checked> Bytes</label><label><input type="checkbox" value="nibbles" data-bcca-mode checked> Nibbles</label><label><input type="checkbox" value="2bit" data-bcca-mode checked> 2-bit symbols</label><label><input type="checkbox" value="bits" data-bcca-mode> Individual bits</label><label><input type="checkbox" value="characters" data-bcca-mode checked> UTF-8 characters</label><label><input type="checkbox" value="words" data-bcca-mode checked> Text-like word/punctuation tokens</label></div><label>Maximum entropy order<input id="bcca-order" type="number" min="2" max="5" value="4"></label><label>Shuffle surrogate replicates<input id="bcca-shuffles" type="number" min="4" max="64" value="16"></label><div class="bcca-actions"><button type="button" class="primary-action" data-bcca-run disabled>Run communication analysis</button><button type="button" data-bcca-cancel disabled>Cancel</button></div></section><section class="bcca-boundary"><strong>Interpretation boundary:</strong> the 1999 dolphin work compared statistical organization, not decoded semantics. A slope near −1 or a strong entropy-order drop can support the hypothesis of structured communication, but cannot establish what a message means or even that it is language.</section></aside><main class="bcca-results"><div class="bcca-status" data-bcca-status role="status" aria-live="polite">Load material to begin.</div><section class="bcca-card"><h3>${esc(PAPER_TITLE)}</h3><p>${esc(PAPER_AUTHORS)} · ${PAPER_YEAR}. Adult dolphin whistles in that study produced a Zipf slope near −0.95 compared with approximately −1.00 for the human-language reference; the authors explicitly treated the higher-order dolphin entropy sample as preliminary/undersampled.</p></section><div data-bcca-report><p class="bcca-muted">No communication-capacity report yet.</p></div></main></div></div>`;
    root.document.body.appendChild(panel);
    bindPanel(panel);
    return panel;
  }

  function bindPanel(target) {
    target.querySelectorAll('[data-bcca-close]').forEach(button => button.addEventListener('click', closePanel));
    target.querySelector('[data-bcca-load]').addEventListener('click', () => {
      try { loadBytes(parseFlexibleInput(target.querySelector('#bcca-input').value, target.querySelector('#bcca-mode').value), 'pasted-input'); }
      catch (error) { setStatus(error.message, 'error'); }
    });
    target.querySelector('#bcca-file').addEventListener('change', event => {
      const file = event.target.files?.[0];
      if (!file) return;
      void file.arrayBuffer().then(buffer => loadBytes(new Uint8Array(buffer), file.name)).catch(error => setStatus(error.message, 'error'));
    });
    target.querySelector('[data-bcca-run]').addEventListener('click', () => void executeAnalysis().catch(error => console.error(error)));
    target.querySelector('[data-bcca-cancel]').addEventListener('click', () => activeToken?.cancel?.('cancel requested by user'));
    target.querySelector('[data-bcca-clear]').addEventListener('click', () => {
      activeToken?.cancel?.('session cleared');
      activeBytes = null;
      activeName = '';
      lastReport = null;
      target.querySelector('#bcca-input').value = '';
      target.querySelector('#bcca-file').value = '';
      target.querySelector('[data-bcca-source]').innerHTML = '<span>No source</span><strong>0 bytes</strong>';
      target.querySelector('[data-bcca-report]').innerHTML = '<p class="bcca-muted">No communication-capacity report yet.</p>';
      target.querySelector('[data-bcca-run]').disabled = true;
      setStatus('Load material to begin.');
    });
  }

  function openPanel(options = {}) {
    const target = buildPanel();
    target.hidden = false;
    root.document.body.classList.add('bcca-open');
    if (options.bytes) loadBytes(options.bytes, options.sourceName || 'handoff');
    else if (options.text) loadBytes(textToBytes(options.text), options.sourceName || 'handoff-text');
    return target;
  }

  function closePanel() {
    activeToken?.cancel?.('communication analyzer closed');
    if (panel) panel.hidden = true;
    root?.document?.body?.classList.remove('bcca-open');
  }

  function currentState() {
    return Object.freeze({ panelOpen: Boolean(panel && !panel.hidden), sourceLoaded: Boolean(activeBytes?.length), sourceBytes: activeBytes?.length || 0, reportReady: Boolean(lastReport) });
  }

  return Object.freeze({
    openPanel,
    closePanel,
    currentState,
    loadBytes,
    parseFlexibleInput,
    tokenize,
    frequencyTable,
    zipfAnalysis,
    conditionalEntropy,
    entropyOrderProfile,
    surrogateSequenceTest,
    sampleSufficiency,
    lagMutualInformation,
    analyzeMode,
    analyzeCommunicationCapacity,
    constants: Object.freeze({ PANEL_ID, PAPER_TITLE, PAPER_YEAR, PAPER_AUTHORS, HUMAN_ZIPF_REFERENCE, ADULT_DOLPHIN_ZIPF_REFERENCE, INFANT_DOLPHIN_ZIPF_REFERENCE, RANDOM_ZIPF_REFERENCE, MAX_INPUT_BYTES, MAX_SYMBOLS_FOR_SEQUENCE_ANALYSIS, MAX_ENTROPY_ORDER, SHUFFLE_REPLICATES }),
    utilities: Object.freeze({ asBytes, textToBytes, bytesToText, bytesFromHex, bytesFromBase64, bytesFromBits, symbolsFromBitGroups, linearRegression, entropyOfSymbols, deterministicShuffle })
  });
});