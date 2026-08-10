(function installAudioLaboratory(root, factory) {
  'use strict';
  const api = factory(root || globalThis);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.AudioLaboratory = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function createAudioLaboratory(root) {
  'use strict';

  const VERSION = '0.1.0';
  const PANEL_ID = 'audio-laboratory';
  const STYLE_ID = 'audio-laboratory-style';
  const SESSION_FORMAT = 'hb-ttrpg-audio-laboratory-session';
  const DEFAULTS = Object.freeze({
    startHz: 250,
    endHz: 12000,
    durationSeconds: 0.65,
    outputDbfs: -24,
    maxRangeM: 12,
    temperatureC: 20,
    relativeHumidityPct: 50,
    echoThresholdRatio: 0.11,
    maxEchoes: 12,
    minimumEchoRangeM: 0.18,
    speakerMicSeparationM: 0.12,
    stationZ: 1.2,
    beamWidthDeg: 360,
    wallToleranceM: 0.16,
    wallThetaSteps: 180,
    wallRhoStepM: 0.08
  });
  const SAFETY = Object.freeze({
    maximumOutputDbfs: -6,
    defaultOutputDbfs: DEFAULTS.outputDbfs,
    maximumSweepSeconds: 4,
    minimumSweepSeconds: 0.08,
    maximumAudibleHz: 20000,
    note: 'Browser gain is digital dBFS, not calibrated acoustic dB SPL. Actual SPL depends on the speaker, amplifier, operating-system volume, placement, and room. Start quietly and calibrate with an SPL meter before making SPL claims.'
  });

  let panel = null;
  let audioRun = null;
  let currentMeasurement = null;
  let session = createSession();

  const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
  const finite = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const freeze = value => Object.freeze(value);

  function speedOfSoundMps(temperatureC = DEFAULTS.temperatureC, relativeHumidityPct = DEFAULTS.relativeHumidityPct) {
    const temperature = clamp(finite(temperatureC, DEFAULTS.temperatureC), -30, 60);
    const humidity = clamp(finite(relativeHumidityPct, DEFAULTS.relativeHumidityPct), 0, 100);
    return 331.3 + 0.606 * temperature + 0.0124 * humidity;
  }

  function dbfsToAmplitude(dbfs) {
    return 10 ** (clamp(finite(dbfs, DEFAULTS.outputDbfs), -96, SAFETY.maximumOutputDbfs) / 20);
  }

  function estimateSplDb(outputDbfs, calibration = {}) {
    const referenceSplDb = Number(calibration.referenceSplDb);
    const referenceDbfs = Number(calibration.referenceDbfs);
    if (!Number.isFinite(referenceSplDb) || !Number.isFinite(referenceDbfs)) return null;
    return referenceSplDb + (finite(outputDbfs) - referenceDbfs);
  }

  function acousticRangeResolutionM(startHz, endHz, speedMps = speedOfSoundMps()) {
    const bandwidth = Math.max(1, Math.abs(finite(endHz) - finite(startHz)));
    return speedMps / (2 * bandwidth);
  }

  function generateLogSweep(sampleRate, options = {}) {
    const rate = Math.max(8000, Math.floor(finite(sampleRate, 48000)));
    const durationSeconds = clamp(finite(options.durationSeconds, DEFAULTS.durationSeconds), SAFETY.minimumSweepSeconds, SAFETY.maximumSweepSeconds);
    const nyquistGuardHz = rate * 0.45;
    const startHz = clamp(finite(options.startHz, DEFAULTS.startHz), 20, Math.max(21, nyquistGuardHz - 1));
    const endHz = clamp(finite(options.endHz, DEFAULTS.endHz), startHz + 1, nyquistGuardHz);
    const samples = Math.max(32, Math.floor(durationSeconds * rate));
    const output = new Float32Array(samples);
    const ratio = endHz / startHz;
    const logRatio = Math.log(ratio);
    const k = durationSeconds / Math.max(1e-12, logRatio);
    const envelopeSeconds = Math.min(0.02, durationSeconds * 0.08);
    const envelopeSamples = Math.max(1, Math.floor(envelopeSeconds * rate));
    for (let i = 0; i < samples; i += 1) {
      const t = i / rate;
      const phase = 2 * Math.PI * startHz * k * (Math.exp(t / k) - 1);
      let envelope = 1;
      if (i < envelopeSamples) envelope *= 0.5 - 0.5 * Math.cos(Math.PI * i / envelopeSamples);
      const fromEnd = samples - 1 - i;
      if (fromEnd < envelopeSamples) envelope *= 0.5 - 0.5 * Math.cos(Math.PI * fromEnd / envelopeSamples);
      output[i] = Math.sin(phase) * envelope;
    }
    return freeze({ samples: output, sampleRate: rate, startHz, endHz, durationSeconds, bandwidthHz: endHz - startHz });
  }

  function nextPow2(value) {
    let n = 1;
    while (n < value) n <<= 1;
    return n;
  }

  function fft(real, imag, inverse = false) {
    const n = real.length;
    if (n !== imag.length || (n & (n - 1)) !== 0) throw new Error('FFT length must be a power of two.');
    for (let i = 1, j = 0; i < n; i += 1) {
      let bit = n >> 1;
      for (; j & bit; bit >>= 1) j ^= bit;
      j ^= bit;
      if (i < j) {
        [real[i], real[j]] = [real[j], real[i]];
        [imag[i], imag[j]] = [imag[j], imag[i]];
      }
    }
    for (let len = 2; len <= n; len <<= 1) {
      const angle = (inverse ? 2 : -2) * Math.PI / len;
      const wLenCos = Math.cos(angle);
      const wLenSin = Math.sin(angle);
      for (let i = 0; i < n; i += len) {
        let wCos = 1;
        let wSin = 0;
        const half = len >> 1;
        for (let j = 0; j < half; j += 1) {
          const uReal = real[i + j];
          const uImag = imag[i + j];
          const vReal = real[i + j + half] * wCos - imag[i + j + half] * wSin;
          const vImag = real[i + j + half] * wSin + imag[i + j + half] * wCos;
          real[i + j] = uReal + vReal;
          imag[i + j] = uImag + vImag;
          real[i + j + half] = uReal - vReal;
          imag[i + j + half] = uImag - vImag;
          const nextCos = wCos * wLenCos - wSin * wLenSin;
          wSin = wCos * wLenSin + wSin * wLenCos;
          wCos = nextCos;
        }
      }
    }
    if (inverse) {
      for (let i = 0; i < n; i += 1) {
        real[i] /= n;
        imag[i] /= n;
      }
    }
  }

  function normalizedMatchedFilter(recordedSamples, referenceSamples) {
    const recorded = recordedSamples instanceof Float32Array ? recordedSamples : Float32Array.from(recordedSamples || []);
    const reference = referenceSamples instanceof Float32Array ? referenceSamples : Float32Array.from(referenceSamples || []);
    if (recorded.length < reference.length || reference.length < 8) throw new Error('Recorded audio must contain the complete sweep reference.');
    const convolutionLength = recorded.length + reference.length - 1;
    const n = nextPow2(convolutionLength);
    const ar = new Float64Array(n);
    const ai = new Float64Array(n);
    const br = new Float64Array(n);
    const bi = new Float64Array(n);
    for (let i = 0; i < recorded.length; i += 1) ar[i] = recorded[i];
    for (let i = 0; i < reference.length; i += 1) br[i] = reference[reference.length - 1 - i];
    fft(ar, ai, false);
    fft(br, bi, false);
    for (let i = 0; i < n; i += 1) {
      const real = ar[i] * br[i] - ai[i] * bi[i];
      const imag = ar[i] * bi[i] + ai[i] * br[i];
      ar[i] = real;
      ai[i] = imag;
    }
    fft(ar, ai, true);

    let referenceEnergy = 0;
    for (let i = 0; i < reference.length; i += 1) referenceEnergy += reference[i] * reference[i];
    const prefixEnergy = new Float64Array(recorded.length + 1);
    for (let i = 0; i < recorded.length; i += 1) prefixEnergy[i + 1] = prefixEnergy[i] + recorded[i] * recorded[i];
    const validLags = recorded.length - reference.length + 1;
    const correlation = new Float32Array(validLags);
    const convolutionOffset = reference.length - 1;
    for (let lag = 0; lag < validLags; lag += 1) {
      const localEnergy = prefixEnergy[lag + reference.length] - prefixEnergy[lag];
      const denominator = Math.sqrt(Math.max(1e-18, referenceEnergy * localEnergy));
      correlation[lag] = denominator > 0 ? ar[lag + convolutionOffset] / denominator : 0;
    }
    return correlation;
  }

  function findLocalPeaks(values, startIndex, endIndex, threshold, minimumSeparationSamples, maximumPeaks) {
    const candidates = [];
    const start = clamp(Math.floor(startIndex), 1, Math.max(1, values.length - 2));
    const end = clamp(Math.floor(endIndex), start + 1, Math.max(start + 1, values.length - 1));
    for (let i = start; i < end; i += 1) {
      const magnitude = Math.abs(values[i]);
      if (magnitude < threshold) continue;
      if (magnitude >= Math.abs(values[i - 1]) && magnitude > Math.abs(values[i + 1])) candidates.push({ index: i, magnitude, signed: values[i] });
    }
    candidates.sort((a, b) => b.magnitude - a.magnitude);
    const selected = [];
    for (const candidate of candidates) {
      if (selected.some(row => Math.abs(row.index - candidate.index) < minimumSeparationSamples)) continue;
      selected.push(candidate);
      if (selected.length >= maximumPeaks) break;
    }
    return selected.sort((a, b) => a.index - b.index);
  }

  function analyzeRecordedSweep(referenceSamples, recordedSamples, options = {}) {
    const sampleRate = Math.max(8000, Math.floor(finite(options.sampleRate, 48000)));
    const speedMps = finite(options.speedMps, speedOfSoundMps(options.temperatureC, options.relativeHumidityPct));
    const maxRangeM = clamp(finite(options.maxRangeM, DEFAULTS.maxRangeM), 0.25, 100);
    const minimumEchoRangeM = clamp(finite(options.minimumEchoRangeM, DEFAULTS.minimumEchoRangeM), 0.02, maxRangeM);
    const thresholdRatio = clamp(finite(options.echoThresholdRatio, DEFAULTS.echoThresholdRatio), 0.01, 0.9);
    const maximumEchoes = clamp(Math.floor(finite(options.maxEchoes, DEFAULTS.maxEchoes)), 1, 64);
    const correlation = normalizedMatchedFilter(recordedSamples, referenceSamples);
    let maxMagnitude = 0;
    for (let i = 0; i < correlation.length; i += 1) maxMagnitude = Math.max(maxMagnitude, Math.abs(correlation[i]));
    if (maxMagnitude < 1e-5) throw new Error('No usable sweep correlation was detected in the microphone recording.');

    const directThreshold = maxMagnitude * 0.32;
    let directIndex = 0;
    let directMagnitude = 0;
    for (let i = 1; i < correlation.length - 1; i += 1) {
      const magnitude = Math.abs(correlation[i]);
      if (magnitude < directThreshold) continue;
      if (magnitude >= Math.abs(correlation[i - 1]) && magnitude > Math.abs(correlation[i + 1])) {
        directIndex = i;
        directMagnitude = magnitude;
        break;
      }
    }
    if (!directMagnitude) {
      for (let i = 0; i < correlation.length; i += 1) {
        const magnitude = Math.abs(correlation[i]);
        if (magnitude > directMagnitude) { directMagnitude = magnitude; directIndex = i; }
      }
    }

    const minimumDelaySamples = Math.max(2, Math.floor((2 * minimumEchoRangeM / speedMps) * sampleRate));
    const maximumDelaySamples = Math.max(minimumDelaySamples + 1, Math.floor((2 * maxRangeM / speedMps) * sampleRate));
    const searchStart = directIndex + minimumDelaySamples;
    const searchEnd = Math.min(correlation.length - 1, directIndex + maximumDelaySamples);
    const peakThreshold = Math.max(0.015, directMagnitude * thresholdRatio);
    const minimumSeparationSamples = Math.max(2, Math.floor(sampleRate * 0.00045));
    const peaks = findLocalPeaks(correlation, searchStart, searchEnd, peakThreshold, minimumSeparationSamples, maximumEchoes);
    const sweepBandwidthHz = Math.max(1, finite(options.endHz, DEFAULTS.endHz) - finite(options.startHz, DEFAULTS.startHz));
    const rangeResolutionM = Math.max(speedMps / (2 * sweepBandwidthHz), speedMps / (2 * sampleRate));
    const echoes = peaks.map((peak, index) => {
      const delaySamples = peak.index - directIndex;
      const delaySeconds = delaySamples / sampleRate;
      const excessPathM = delaySeconds * speedMps;
      const rangeM = excessPathM / 2;
      return freeze({
        id: `echo-${String(index + 1).padStart(2, '0')}`,
        correlationIndex: peak.index,
        delaySamples,
        delayMs: delaySeconds * 1000,
        excessPathM,
        rangeM,
        relativeDb: 20 * Math.log10(Math.max(1e-12, peak.magnitude / Math.max(1e-12, directMagnitude))),
        correlation: peak.signed,
        magnitude: peak.magnitude,
        rangeResolutionM
      });
    });
    return freeze({ correlation, directIndex, directMagnitude, peakThreshold, speedMps, sampleRate, maxRangeM, rangeResolutionM, echoes: freeze(echoes) });
  }

  function synthesizeEchoRecording(referenceSamples, sampleRate, options = {}) {
    const rate = Math.max(8000, Math.floor(finite(sampleRate, 48000)));
    const speedMps = finite(options.speedMps, speedOfSoundMps());
    const directDelaySeconds = clamp(finite(options.directDelaySeconds, 0.08), 0.01, 0.5);
    const directIndex = Math.floor(directDelaySeconds * rate);
    const echoes = (options.echoes || [
      { rangeM: 1.4, gain: 0.42 },
      { rangeM: 2.7, gain: 0.28 },
      { rangeM: 4.1, gain: 0.18 }
    ]).map(row => ({ rangeM: Math.max(0.02, finite(row.rangeM)), gain: finite(row.gain, 0.2) }));
    const maxDelay = echoes.reduce((max, echo) => Math.max(max, 2 * echo.rangeM / speedMps), 0);
    const length = directIndex + referenceSamples.length + Math.ceil((maxDelay + 0.25) * rate);
    const recording = new Float32Array(length);
    const add = (offset, gain) => {
      for (let i = 0; i < referenceSamples.length && offset + i < recording.length; i += 1) recording[offset + i] += referenceSamples[i] * gain;
    };
    add(directIndex, finite(options.directGain, 0.8));
    for (const echo of echoes) add(directIndex + Math.round((2 * echo.rangeM / speedMps) * rate), echo.gain);
    let seed = 0x4a3b2c1d;
    const noiseGain = clamp(finite(options.noiseGain, 0.003), 0, 0.05);
    for (let i = 0; i < recording.length; i += 1) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      recording[i] += (((seed / 0xffffffff) * 2) - 1) * noiseGain;
    }
    return freeze({ recording, directIndex, echoes: freeze(echoes.map(freeze)), sampleRate: rate, speedMps });
  }

  function normalizeEchoRanges(echoes) {
    return (echoes || []).map(row => finite(row.rangeM ?? row, Number.NaN)).filter(value => Number.isFinite(value) && value > 0);
  }

  function createSession(options = {}) {
    return {
      format: SESSION_FORMAT,
      schemaVersion: VERSION,
      createdAt: new Date().toISOString(),
      notes: String(options.notes || ''),
      stations: [],
      calibration: null
    };
  }

  function addStation(targetSession, station = {}) {
    if (!targetSession || !Array.isArray(targetSession.stations)) throw new Error('A valid Audio Laboratory session is required.');
    const echoes = normalizeEchoRanges(station.echoes || station.measurement?.echoes);
    if (!echoes.length) throw new Error('A station must include at least one measured echo range.');
    const normalized = freeze({
      id: station.id || `station-${String(targetSession.stations.length + 1).padStart(3, '0')}`,
      label: String(station.label || `Station ${targetSession.stations.length + 1}`),
      x: finite(station.x),
      y: finite(station.y),
      z: finite(station.z, DEFAULTS.stationZ),
      headingDeg: ((finite(station.headingDeg) % 360) + 360) % 360,
      beamWidthDeg: clamp(finite(station.beamWidthDeg, DEFAULTS.beamWidthDeg), 10, 360),
      speakerMicSeparationM: Math.max(0, finite(station.speakerMicSeparationM, DEFAULTS.speakerMicSeparationM)),
      speedMps: finite(station.speedMps, speedOfSoundMps()),
      echoes: freeze(echoes),
      capturedAt: station.capturedAt || new Date().toISOString(),
      source: String(station.source || 'measured')
    });
    targetSession.stations.push(normalized);
    return normalized;
  }

  function angleDifferenceDeg(a, b) {
    let difference = Math.abs(a - b) % 180;
    if (difference > 90) difference = 180 - difference;
    return difference;
  }

  function inferPlanarWalls(stationsValue, options = {}) {
    const stations = (stationsValue || []).filter(station => normalizeEchoRanges(station.echoes).length);
    if (stations.length < 2) return freeze([]);
    const toleranceM = clamp(finite(options.toleranceM, DEFAULTS.wallToleranceM), 0.03, 1.5);
    const thetaSteps = clamp(Math.floor(finite(options.thetaSteps, DEFAULTS.wallThetaSteps)), 30, 720);
    const rhoStepM = clamp(finite(options.rhoStepM, DEFAULTS.wallRhoStepM), 0.02, 0.5);
    const maxEcho = Math.max(...stations.flatMap(station => normalizeEchoRanges(station.echoes)));
    const coordinateMagnitude = Math.max(1, ...stations.flatMap(station => [Math.abs(finite(station.x)), Math.abs(finite(station.y))]));
    const rhoLimit = Math.max(2, coordinateMagnitude + maxEcho + 1);
    const candidates = [];
    for (let ti = 0; ti < thetaSteps; ti += 1) {
      const theta = ti / thetaSteps * Math.PI;
      const nx = Math.cos(theta);
      const ny = Math.sin(theta);
      for (let rho = -rhoLimit; rho <= rhoLimit + 1e-9; rho += rhoStepM) {
        let score = 0;
        let support = 0;
        let residualTotal = 0;
        const matches = [];
        for (const station of stations) {
          const predictedRangeM = Math.abs(nx * finite(station.x) + ny * finite(station.y) - rho);
          const echoRanges = normalizeEchoRanges(station.echoes);
          let nearest = Infinity;
          let matchedRangeM = null;
          for (const echoRangeM of echoRanges) {
            const difference = Math.abs(echoRangeM - predictedRangeM);
            if (difference < nearest) { nearest = difference; matchedRangeM = echoRangeM; }
          }
          const contribution = Math.exp(-0.5 * (nearest / toleranceM) ** 2);
          score += contribution;
          if (nearest <= toleranceM) support += 1;
          residualTotal += Math.min(nearest, toleranceM * 4);
          matches.push(freeze({ stationId: station.id, predictedRangeM, matchedRangeM, residualM: nearest }));
        }
        if (support >= Math.min(2, stations.length) && score >= 1.2) {
          candidates.push({
            thetaDeg: theta * 180 / Math.PI,
            rhoM: rho,
            score: score / stations.length,
            support,
            stationCount: stations.length,
            meanResidualM: residualTotal / stations.length,
            matches: freeze(matches)
          });
        }
      }
    }
    candidates.sort((a, b) => b.support - a.support || b.score - a.score || a.meanResidualM - b.meanResidualM);
    const selected = [];
    const rhoNms = Math.max(0.18, toleranceM * 1.5);
    const thetaNms = Math.max(2, 180 / thetaSteps * 3);
    for (const candidate of candidates) {
      if (selected.some(row => angleDifferenceDeg(row.thetaDeg, candidate.thetaDeg) < thetaNms && Math.abs(Math.abs(row.rhoM) - Math.abs(candidate.rhoM)) < rhoNms)) continue;
      selected.push(freeze(candidate));
      if (selected.length >= clamp(Math.floor(finite(options.maxWalls, 12)), 1, 32)) break;
    }
    return freeze(selected);
  }

  function sessionBounds(targetSession = session) {
    const stations = targetSession.stations || [];
    if (!stations.length) return freeze({ minX: -5, maxX: 5, minY: -4, maxY: 4 });
    const maxEcho = Math.max(2, ...stations.flatMap(station => normalizeEchoRanges(station.echoes)));
    const minX = Math.min(...stations.map(station => station.x)) - maxEcho;
    const maxX = Math.max(...stations.map(station => station.x)) + maxEcho;
    const minY = Math.min(...stations.map(station => station.y)) - maxEcho;
    const maxY = Math.max(...stations.map(station => station.y)) + maxEcho;
    const width = Math.max(2, maxX - minX);
    const height = Math.max(2, maxY - minY);
    const pad = Math.max(width, height) * 0.06;
    return freeze({ minX: minX - pad, maxX: maxX + pad, minY: minY - pad, maxY: maxY + pad });
  }

  function serializeSession(targetSession = session) {
    const walls = inferPlanarWalls(targetSession.stations);
    return JSON.stringify({ ...targetSession, inferredPlanarWalls: walls, exportedAt: new Date().toISOString() }, null, 2);
  }

  function loadSyntheticRoom(targetSession = session) {
    targetSession.stations.splice(0, targetSession.stations.length);
    const walls = [
      { axis: 'x', value: -3 }, { axis: 'x', value: 3 },
      { axis: 'y', value: -2.2 }, { axis: 'y', value: 2.2 }
    ];
    const poses = [
      { x: -1.4, y: -0.8 }, { x: 1.25, y: -0.65 }, { x: -1.0, y: 0.95 }, { x: 1.35, y: 0.85 }
    ];
    poses.forEach((pose, index) => {
      const echoes = walls.map(wall => wall.axis === 'x' ? Math.abs(pose.x - wall.value) : Math.abs(pose.y - wall.value));
      addStation(targetSession, { ...pose, z: 1.2, label: `Synthetic ${index + 1}`, echoes, source: 'synthetic-rectangular-room' });
    });
    return targetSession;
  }

  function ensureStyle() {
    if (!root?.document || root.document.getElementById(STYLE_ID)) return;
    const link = root.document.createElement('link');
    link.id = STYLE_ID;
    link.rel = 'stylesheet';
    link.href = 'audio-laboratory.css?v=20260809-audio-lab-1';
    root.document.head.appendChild(link);
  }

  function fitCanvas(canvas, minimumHeight = 230) {
    const rect = canvas.getBoundingClientRect();
    const dpr = root.devicePixelRatio || 1;
    const width = Math.max(320, Math.floor(rect.width * dpr));
    const height = Math.max(minimumHeight, Math.floor(rect.height * dpr));
    if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height; }
    return { width, height, dpr };
  }

  function drawGrid(ctx, width, height, dpr) {
    ctx.strokeStyle = 'rgba(150,180,200,.12)';
    ctx.lineWidth = Math.max(1, dpr * 0.6);
    const step = Math.max(34 * dpr, Math.floor(width / 14));
    for (let x = 0; x <= width; x += step) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke(); }
    for (let y = 0; y <= height; y += step) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke(); }
  }

  function drawCorrelation() {
    const canvas = panel?.querySelector('#al-correlation-canvas');
    if (!canvas) return;
    const { width, height, dpr } = fitCanvas(canvas, 250);
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, width, height);
    drawGrid(ctx, width, height, dpr);
    ctx.font = `${12 * dpr}px sans-serif`;
    ctx.fillStyle = '#d8e0e6';
    if (!currentMeasurement?.analysis) {
      ctx.fillText('Run a live or synthetic sweep to display matched-filter echo response.', 14 * dpr, 24 * dpr);
      return;
    }
    const analysis = currentMeasurement.analysis;
    const correlation = analysis.correlation;
    const start = Math.max(0, analysis.directIndex - Math.floor(analysis.sampleRate * 0.004));
    const maxSamples = Math.min(correlation.length - start, Math.ceil((2 * analysis.maxRangeM / analysis.speedMps + 0.012) * analysis.sampleRate));
    const xForIndex = index => (index - start) / Math.max(1, maxSamples - 1) * width;
    const centerY = height * 0.52;
    const scaleY = height * 0.42;
    ctx.strokeStyle = '#72d5ff';
    ctx.lineWidth = 1.4 * dpr;
    ctx.beginPath();
    const stride = Math.max(1, Math.floor(maxSamples / Math.max(1, width)));
    for (let i = 0; i < maxSamples; i += stride) {
      const index = start + i;
      const x = xForIndex(index);
      const y = centerY - correlation[index] * scaleY;
      if (!i) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.8)';
    ctx.beginPath();
    const directX = xForIndex(analysis.directIndex);
    ctx.moveTo(directX, 0); ctx.lineTo(directX, height); ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.fillText('direct/reference path', Math.min(width - 140 * dpr, directX + 5 * dpr), 18 * dpr);
    for (const echo of analysis.echoes) {
      const x = xForIndex(echo.correlationIndex);
      ctx.strokeStyle = 'rgba(255,184,108,.82)';
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke();
      ctx.fillStyle = '#ffcf99';
      ctx.fillText(`${echo.rangeM.toFixed(2)} m`, Math.min(width - 70 * dpr, x + 4 * dpr), 38 * dpr + (parseInt(echo.id.slice(-2), 10) % 3) * 15 * dpr);
    }
  }

  function drawMap() {
    const canvas = panel?.querySelector('#al-map-canvas');
    if (!canvas) return;
    const { width, height, dpr } = fitCanvas(canvas, 330);
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, width, height);
    drawGrid(ctx, width, height, dpr);
    const bounds = sessionBounds(session);
    const px = x => (x - bounds.minX) / Math.max(1e-9, bounds.maxX - bounds.minX) * width;
    const py = y => height - (y - bounds.minY) / Math.max(1e-9, bounds.maxY - bounds.minY) * height;
    const sx = width / Math.max(1e-9, bounds.maxX - bounds.minX);
    const sy = height / Math.max(1e-9, bounds.maxY - bounds.minY);
    const scale = Math.min(sx, sy);
    ctx.font = `${11 * dpr}px sans-serif`;
    const walls = inferPlanarWalls(session.stations, { toleranceM: finite(panel?.querySelector('#al-wall-tolerance')?.value, DEFAULTS.wallToleranceM) });
    walls.slice(0, 8).forEach((wall, index) => {
      const theta = wall.thetaDeg * Math.PI / 180;
      const nx = Math.cos(theta), ny = Math.sin(theta);
      const tx = -ny, ty = nx;
      const baseX = nx * wall.rhoM, baseY = ny * wall.rhoM;
      const span = Math.hypot(bounds.maxX - bounds.minX, bounds.maxY - bounds.minY) * 1.5;
      ctx.strokeStyle = index < 4 ? 'rgba(118,255,168,.86)' : 'rgba(118,255,168,.34)';
      ctx.lineWidth = (index < 4 ? 2.1 : 1.1) * dpr;
      ctx.beginPath();
      ctx.moveTo(px(baseX - tx * span), py(baseY - ty * span));
      ctx.lineTo(px(baseX + tx * span), py(baseY + ty * span));
      ctx.stroke();
    });
    for (const station of session.stations) {
      const cx = px(station.x), cy = py(station.y);
      ctx.strokeStyle = 'rgba(114,213,255,.19)';
      ctx.lineWidth = 1 * dpr;
      const heading = station.headingDeg * Math.PI / 180;
      const beam = station.beamWidthDeg * Math.PI / 180;
      for (const rangeM of station.echoes) {
        ctx.beginPath();
        const radius = rangeM * scale;
        if (station.beamWidthDeg >= 359) ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        else ctx.arc(cx, cy, radius, heading - beam / 2, heading + beam / 2);
        ctx.stroke();
      }
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(cx, cy, 4.5 * dpr, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#72d5ff';
      ctx.lineWidth = 2 * dpr;
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(heading) * 24 * dpr, cy - Math.sin(heading) * 24 * dpr); ctx.stroke();
      ctx.fillStyle = '#d8e0e6';
      ctx.fillText(station.label, cx + 7 * dpr, cy - 7 * dpr);
    }
    ctx.fillStyle = '#d8e0e6';
    ctx.fillText(session.stations.length < 2 ? 'One pose constrains range only; add stations to infer planar wall candidates.' : `${session.stations.length} stations · ${walls.length} planar wall candidates`, 12 * dpr, 20 * dpr);
  }

  function renderEchoes() {
    const body = panel?.querySelector('#al-echo-body');
    if (!body) return;
    const echoes = currentMeasurement?.analysis?.echoes || [];
    body.innerHTML = echoes.length ? echoes.map(echo => `<tr><td>${esc(echo.id)}</td><td>${echo.delayMs.toFixed(3)} ms</td><td>${echo.rangeM.toFixed(3)} m</td><td>${echo.excessPathM.toFixed(3)} m</td><td>${echo.relativeDb.toFixed(1)} dB</td><td>±${echo.rangeResolutionM.toFixed(3)} m</td></tr>`).join('') : '<tr><td colspan="6">No echo peaks measured yet.</td></tr>';
  }

  function renderWalls() {
    const body = panel?.querySelector('#al-wall-body');
    if (!body) return;
    const toleranceM = finite(panel.querySelector('#al-wall-tolerance')?.value, DEFAULTS.wallToleranceM);
    const walls = inferPlanarWalls(session.stations, { toleranceM });
    body.innerHTML = walls.length ? walls.map((wall, index) => `<tr><td>${index + 1}</td><td>${wall.thetaDeg.toFixed(1)}°</td><td>${wall.rhoM.toFixed(2)} m</td><td>${wall.support}/${wall.stationCount}</td><td>${(wall.score * 100).toFixed(1)}%</td><td>${wall.meanResidualM.toFixed(3)} m</td></tr>`).join('') : '<tr><td colspan="6">At least two stations are needed; three or more materially reduce ambiguity.</td></tr>';
  }

  function renderStations() {
    const body = panel?.querySelector('#al-station-body');
    if (!body) return;
    body.innerHTML = session.stations.length ? session.stations.map(station => `<tr><td>${esc(station.label)}</td><td>${station.x.toFixed(2)}, ${station.y.toFixed(2)}, ${station.z.toFixed(2)}</td><td>${station.headingDeg.toFixed(0)}°</td><td>${station.echoes.length}</td><td>${esc(station.source)}</td></tr>`).join('') : '<tr><td colspan="5">No mapping stations saved.</td></tr>';
  }

  function setStatus(message, state = 'idle') {
    const status = panel?.querySelector('#al-status');
    if (!status) return;
    status.textContent = message;
    status.dataset.state = state;
  }

  function readControls() {
    const get = (selector, fallback) => finite(panel?.querySelector(selector)?.value, fallback);
    const startHz = get('#al-start-hz', DEFAULTS.startHz);
    const endHz = get('#al-end-hz', DEFAULTS.endHz);
    const temperatureC = get('#al-temperature-c', DEFAULTS.temperatureC);
    const relativeHumidityPct = get('#al-humidity-pct', DEFAULTS.relativeHumidityPct);
    const speedMps = speedOfSoundMps(temperatureC, relativeHumidityPct);
    return freeze({
      startHz,
      endHz,
      durationSeconds: get('#al-duration-s', DEFAULTS.durationSeconds),
      outputDbfs: clamp(get('#al-output-dbfs', DEFAULTS.outputDbfs), -96, SAFETY.maximumOutputDbfs),
      maxRangeM: get('#al-max-range-m', DEFAULTS.maxRangeM),
      temperatureC,
      relativeHumidityPct,
      speedMps,
      echoThresholdRatio: get('#al-echo-threshold', DEFAULTS.echoThresholdRatio),
      maxEchoes: get('#al-max-echoes', DEFAULTS.maxEchoes),
      minimumEchoRangeM: get('#al-min-range-m', DEFAULTS.minimumEchoRangeM),
      speakerMicSeparationM: get('#al-speaker-mic-separation', DEFAULTS.speakerMicSeparationM),
      calibration: {
        referenceSplDb: panel?.querySelector('#al-cal-spl')?.value,
        referenceDbfs: panel?.querySelector('#al-cal-dbfs')?.value
      }
    });
  }

  function updateDerivedReadouts() {
    if (!panel) return;
    const config = readControls();
    const speed = panel.querySelector('#al-speed-readout');
    const resolution = panel.querySelector('#al-resolution-readout');
    const spl = panel.querySelector('#al-spl-readout');
    if (speed) speed.textContent = `${config.speedMps.toFixed(2)} m/s`;
    if (resolution) resolution.textContent = `${acousticRangeResolutionM(config.startHz, config.endHz, config.speedMps).toFixed(3)} m theoretical matched-filter range resolution`;
    const splDb = estimateSplDb(config.outputDbfs, config.calibration);
    if (spl) spl.textContent = splDb == null ? 'uncalibrated — output shown only in dBFS' : `≈ ${splDb.toFixed(1)} dB SPL at the calibration point`;
  }

  function concatenateFloat32(chunks) {
    const length = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const output = new Float32Array(length);
    let offset = 0;
    for (const chunk of chunks) { output.set(chunk, offset); offset += chunk.length; }
    return output;
  }

  async function stopAudioRun(reason = 'stopped') {
    const run = audioRun;
    audioRun = null;
    if (!run) return;
    try { run.source?.stop?.(); } catch (_) {}
    try { run.processor?.disconnect?.(); } catch (_) {}
    try { run.microphone?.disconnect?.(); } catch (_) {}
    try { run.mute?.disconnect?.(); } catch (_) {}
    try { run.stream?.getTracks?.().forEach(track => track.stop()); } catch (_) {}
    try { await run.context?.close?.(); } catch (_) {}
    setStatus(`Audio acquisition ${reason}.`, reason === 'completed' ? 'complete' : 'idle');
  }

  async function runLiveSweep() {
    if (!panel) return null;
    if (!root.navigator?.mediaDevices?.getUserMedia) throw new Error('This browser does not expose microphone capture through getUserMedia.');
    await stopAudioRun('reset');
    const config = readControls();
    setStatus('Requesting microphone access…', 'running');
    const stream = await root.navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false
      }
    });
    const AudioContextClass = root.AudioContext || root.webkitAudioContext;
    if (!AudioContextClass) { stream.getTracks().forEach(track => track.stop()); throw new Error('Web Audio API is unavailable in this browser.'); }
    const context = new AudioContextClass({ latencyHint: 'interactive' });
    await context.resume();
    const sweep = generateLogSweep(context.sampleRate, config);
    const buffer = context.createBuffer(1, sweep.samples.length, context.sampleRate);
    buffer.copyToChannel(sweep.samples, 0);
    const source = context.createBufferSource();
    source.buffer = buffer;
    const gain = context.createGain();
    gain.gain.value = dbfsToAmplitude(config.outputDbfs);
    source.connect(gain).connect(context.destination);

    const microphone = context.createMediaStreamSource(stream);
    const processor = context.createScriptProcessor(4096, 1, 1);
    const mute = context.createGain();
    mute.gain.value = 0;
    microphone.connect(processor);
    processor.connect(mute).connect(context.destination);
    const chunks = [];
    processor.onaudioprocess = event => chunks.push(new Float32Array(event.inputBuffer.getChannelData(0)));
    audioRun = { context, stream, source, gain, microphone, processor, mute };

    const preRollSeconds = 0.22;
    const postRollSeconds = Math.min(1.5, 0.18 + 2 * config.maxRangeM / config.speedMps);
    const startAt = context.currentTime + preRollSeconds;
    source.start(startAt);
    setStatus(`Sweeping ${Math.round(sweep.startHz)}–${Math.round(sweep.endHz)} Hz at ${config.outputDbfs.toFixed(1)} dBFS…`, 'running');
    await new Promise(resolve => root.setTimeout(resolve, Math.ceil((preRollSeconds + sweep.durationSeconds + postRollSeconds + 0.15) * 1000)));
    if (!audioRun) return null;
    const trackSettings = stream.getAudioTracks()[0]?.getSettings?.() || {};
    const recorded = concatenateFloat32(chunks);
    await stopAudioRun('completed');
    if (recorded.length <= sweep.samples.length) throw new Error('Microphone capture ended before a complete sweep response was recorded.');
    setStatus('Analyzing matched-filter response…', 'running');
    const analysis = analyzeRecordedSweep(sweep.samples, recorded, { ...config, sampleRate: context.sampleRate, startHz: sweep.startHz, endHz: sweep.endHz });
    currentMeasurement = freeze({
      source: 'live-browser-audio',
      capturedAt: new Date().toISOString(),
      config,
      sweep,
      recordingSampleCount: recorded.length,
      trackSettings: freeze({ ...trackSettings }),
      analysis
    });
    const processingWarnings = [];
    if (trackSettings.echoCancellation === true) processingWarnings.push('browser/device reports echo cancellation enabled');
    if (trackSettings.noiseSuppression === true) processingWarnings.push('browser/device reports noise suppression enabled');
    if (trackSettings.autoGainControl === true) processingWarnings.push('browser/device reports automatic gain control enabled');
    setStatus(`Analysis complete: ${analysis.echoes.length} echo candidates.${processingWarnings.length ? ` Warning: ${processingWarnings.join(', ')}.` : ''}`, processingWarnings.length ? 'warning' : 'complete');
    renderAll();
    return currentMeasurement;
  }

  function runSyntheticSweep() {
    const config = readControls();
    const sampleRate = 48000;
    const sweep = generateLogSweep(sampleRate, config);
    const synthetic = synthesizeEchoRecording(sweep.samples, sampleRate, { speedMps: config.speedMps });
    const analysis = analyzeRecordedSweep(sweep.samples, synthetic.recording, { ...config, sampleRate, startHz: sweep.startHz, endHz: sweep.endHz });
    currentMeasurement = freeze({ source: 'synthetic-echo-control', capturedAt: new Date().toISOString(), config, sweep, recordingSampleCount: synthetic.recording.length, expectedEchoes: synthetic.echoes, analysis });
    setStatus(`Synthetic matched-filter control complete: ${analysis.echoes.length} echo candidates.`, 'complete');
    renderAll();
    return currentMeasurement;
  }

  function saveCurrentStation() {
    if (!currentMeasurement?.analysis?.echoes?.length) throw new Error('Run a sweep and detect at least one echo before saving a mapping station.');
    const get = (selector, fallback) => finite(panel?.querySelector(selector)?.value, fallback);
    const label = String(panel?.querySelector('#al-station-label')?.value || `Station ${session.stations.length + 1}`);
    const config = currentMeasurement.config || readControls();
    const station = addStation(session, {
      label,
      x: get('#al-station-x', 0),
      y: get('#al-station-y', 0),
      z: get('#al-station-z', DEFAULTS.stationZ),
      headingDeg: get('#al-station-heading', 0),
      beamWidthDeg: get('#al-beam-width', DEFAULTS.beamWidthDeg),
      speakerMicSeparationM: config.speakerMicSeparationM,
      speedMps: currentMeasurement.analysis.speedMps,
      echoes: currentMeasurement.analysis.echoes,
      source: currentMeasurement.source
    });
    panel.querySelector('#al-station-label').value = `Station ${session.stations.length + 1}`;
    setStatus(`${station.label} saved with ${station.echoes.length} echo ranges.`, 'complete');
    renderAll();
    return station;
  }

  function downloadSession() {
    const blob = new Blob([serializeSession(session)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = root.document.createElement('a');
    anchor.href = url;
    anchor.download = `audio-laboratory-session-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    root.document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  function renderAll() {
    updateDerivedReadouts();
    renderEchoes();
    renderStations();
    renderWalls();
    drawCorrelation();
    drawMap();
  }

  function closePanel() {
    void stopAudioRun('stopped');
    panel?.remove();
    panel = null;
  }

  function buildPanel() {
    if (!root?.document) return null;
    ensureStyle();
    panel = root.document.createElement('section');
    panel.id = PANEL_ID;
    panel.className = 'audio-laboratory-panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');
    panel.setAttribute('aria-labelledby', 'al-title');
    panel.innerHTML = `
      <div class="al-shell">
        <header class="al-header">
          <div><p class="al-eyebrow">Scientific Tools · Active acoustic ranging</p><h2 id="al-title">Audio Laboratory</h2><p>Speaker-to-microphone frequency sweeps, matched-filter echo ranging, and multi-station planar-geometry inference.</p></div>
          <button type="button" class="al-close" aria-label="Close Audio Laboratory">×</button>
        </header>
        <div class="al-safety"><strong>Acoustic-output boundary:</strong> ${esc(SAFETY.note)} The browser requests echo cancellation, noise suppression, and automatic gain control off, but hardware/OS processing may ignore those requests. A single station yields path lengths, not unique wall directions; directional geometry is inferred only across multiple poses.</div>
        <div class="al-layout">
          <aside class="al-controls">
            <section class="al-card"><h3>Sweep & environment</h3>
              <div class="al-fields">
                <label>Start frequency <span><input id="al-start-hz" type="number" min="20" step="10" value="${DEFAULTS.startHz}"> Hz</span></label>
                <label>End frequency <span><input id="al-end-hz" type="number" min="40" max="20000" step="100" value="${DEFAULTS.endHz}"> Hz</span></label>
                <label>Sweep duration <span><input id="al-duration-s" type="number" min="0.08" max="4" step="0.05" value="${DEFAULTS.durationSeconds}"> s</span></label>
                <label>Output level <span><input id="al-output-dbfs" type="number" min="-96" max="${SAFETY.maximumOutputDbfs}" step="1" value="${DEFAULTS.outputDbfs}"> dBFS</span></label>
                <label>Max range <span><input id="al-max-range-m" type="number" min="0.25" max="100" step="0.5" value="${DEFAULTS.maxRangeM}"> m</span></label>
                <label>Min echo range <span><input id="al-min-range-m" type="number" min="0.02" step="0.02" value="${DEFAULTS.minimumEchoRangeM}"> m</span></label>
                <label>Temperature <span><input id="al-temperature-c" type="number" min="-30" max="60" step="0.5" value="${DEFAULTS.temperatureC}"> °C</span></label>
                <label>Relative humidity <span><input id="al-humidity-pct" type="number" min="0" max="100" step="1" value="${DEFAULTS.relativeHumidityPct}"> %</span></label>
                <label>Echo threshold <span><input id="al-echo-threshold" type="number" min="0.01" max="0.9" step="0.01" value="${DEFAULTS.echoThresholdRatio}"> × direct</span></label>
                <label>Max echo peaks <span><input id="al-max-echoes" type="number" min="1" max="64" step="1" value="${DEFAULTS.maxEchoes}"></span></label>
              </div>
              <div class="al-derived"><span><strong>Sound speed:</strong> <span id="al-speed-readout"></span></span><span><strong>Resolution:</strong> <span id="al-resolution-readout"></span></span></div>
              <div class="al-actions"><button id="al-run-live" type="button" class="primary-action">Run Live Sweep</button><button id="al-stop" type="button" class="secondary-action">Stop Audio</button><button id="al-run-synthetic" type="button" class="secondary-action">Synthetic Sweep Control</button></div>
            </section>
            <section class="al-card"><h3>Acoustic calibration</h3>
              <p>Use an external SPL meter at a fixed position and unchanged OS/hardware volume. Without this reference, dBFS is not dB SPL.</p>
              <div class="al-fields"><label>Measured reference SPL <span><input id="al-cal-spl" type="number" step="0.1" placeholder="optional"> dB SPL</span></label><label>Reference browser level <span><input id="al-cal-dbfs" type="number" step="1" placeholder="e.g. -24"> dBFS</span></label><label>Speaker↔mic separation <span><input id="al-speaker-mic-separation" type="number" min="0" step="0.01" value="${DEFAULTS.speakerMicSeparationM}"> m</span></label></div>
              <p class="al-readout"><strong>Estimated level:</strong> <span id="al-spl-readout"></span></p>
            </section>
            <section class="al-card"><h3>Mapping station</h3>
              <div class="al-fields"><label>Label <span><input id="al-station-label" type="text" value="Station 1"></span></label><label>X <span><input id="al-station-x" type="number" step="0.1" value="0"> m</span></label><label>Y <span><input id="al-station-y" type="number" step="0.1" value="0"> m</span></label><label>Z <span><input id="al-station-z" type="number" step="0.1" value="${DEFAULTS.stationZ}"> m</span></label><label>Heading <span><input id="al-station-heading" type="number" min="0" max="359" step="1" value="0"> °</span></label><label>Acoustic beam width <span><input id="al-beam-width" type="number" min="10" max="360" step="10" value="${DEFAULTS.beamWidthDeg}"> °</span></label><label>Wall-fit tolerance <span><input id="al-wall-tolerance" type="number" min="0.03" max="1.5" step="0.01" value="${DEFAULTS.wallToleranceM}"> m</span></label></div>
              <div class="al-actions"><button id="al-save-station" type="button" class="primary-action">Save Current Station</button><button id="al-room-demo" type="button" class="secondary-action">Load Synthetic Room</button><button id="al-clear-session" type="button" class="secondary-action">Clear Stations</button><button id="al-export" type="button" class="secondary-action">Export Session JSON</button></div>
            </section>
          </aside>
          <main class="al-workspace">
            <div id="al-status" class="al-status" data-state="idle" role="status">Ready. Start at a low speaker volume.</div>
            <section class="al-card"><h3>Matched-filter echo response</h3><canvas id="al-correlation-canvas" class="al-canvas"></canvas><div class="al-table-wrap"><table><thead><tr><th>Peak</th><th>Delay</th><th>Monostatic range</th><th>Excess path</th><th>Relative level</th><th>Resolution</th></tr></thead><tbody id="al-echo-body"></tbody></table></div></section>
            <section class="al-card"><h3>Acoustic spatial constraint map</h3><p>Each station draws range rings/arcs. Green lines are planar-wall candidates scored against all stations. They are hypotheses, not a unique reconstruction.</p><canvas id="al-map-canvas" class="al-canvas al-map"></canvas></section>
            <section class="al-grid-two">
              <div class="al-card"><h3>Stations</h3><div class="al-table-wrap"><table><thead><tr><th>Station</th><th>XYZ m</th><th>Heading</th><th>Echoes</th><th>Source</th></tr></thead><tbody id="al-station-body"></tbody></table></div></div>
              <div class="al-card"><h3>Planar wall candidates</h3><div class="al-table-wrap"><table><thead><tr><th>#</th><th>Normal</th><th>ρ</th><th>Support</th><th>Score</th><th>Residual</th></tr></thead><tbody id="al-wall-body"></tbody></table></div></div>
            </section>
            <section class="al-boundary"><strong>Interpretation boundary:</strong> matched-filter delay provides excess acoustic path length. The displayed range uses the colocated speaker/microphone approximation, range ≈ cΔt/2. Large speaker–microphone separation, directional transducers, specular reflections, diffraction, reverberation, device DSP, clock drift, and moving objects can bias or split peaks. Room-scale structural claims should be repeated from multiple measured poses.</section>
          </main>
        </div>
      </div>`;
    root.document.body.appendChild(panel);
    panel.querySelector('.al-close').addEventListener('click', closePanel);
    panel.querySelector('#al-run-live').addEventListener('click', () => void runLiveSweep().catch(error => setStatus(error.message, 'error')));
    panel.querySelector('#al-stop').addEventListener('click', () => void stopAudioRun('stopped'));
    panel.querySelector('#al-run-synthetic').addEventListener('click', () => { try { runSyntheticSweep(); } catch (error) { setStatus(error.message, 'error'); } });
    panel.querySelector('#al-save-station').addEventListener('click', () => { try { saveCurrentStation(); } catch (error) { setStatus(error.message, 'error'); } });
    panel.querySelector('#al-room-demo').addEventListener('click', () => { loadSyntheticRoom(session); setStatus('Synthetic rectangular-room station set loaded.', 'complete'); renderAll(); });
    panel.querySelector('#al-clear-session').addEventListener('click', () => { session = createSession(); setStatus('Mapping stations cleared.', 'idle'); renderAll(); });
    panel.querySelector('#al-export').addEventListener('click', downloadSession);
    panel.querySelectorAll('input').forEach(input => input.addEventListener('input', () => { updateDerivedReadouts(); if (input.id === 'al-wall-tolerance') { renderWalls(); drawMap(); } }));
    root.addEventListener?.('resize', renderAll, { passive: true });
    renderAll();
    return panel;
  }

  function openPanel(options = {}) {
    ensureStyle();
    if (!panel || !root.document?.body?.contains(panel)) buildPanel();
    if (options.syntheticRoom) { loadSyntheticRoom(session); renderAll(); }
    panel?.scrollTo?.({ top: 0, behavior: 'smooth' });
    return panel;
  }

  return freeze({
    constants: freeze({ VERSION, PANEL_ID, STYLE_ID, SESSION_FORMAT, DEFAULTS, SAFETY }),
    speedOfSoundMps,
    dbfsToAmplitude,
    estimateSplDb,
    acousticRangeResolutionM,
    generateLogSweep,
    normalizedMatchedFilter,
    analyzeRecordedSweep,
    synthesizeEchoRecording,
    createSession,
    addStation,
    inferPlanarWalls,
    serializeSession,
    loadSyntheticRoom,
    openPanel,
    closePanel,
    runLiveSweep,
    stopAudioRun
  });
});
