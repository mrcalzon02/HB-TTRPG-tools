(function installBinaryCubeCubicDecryptorWebGPU(root, factory) {
  'use strict';
  const Cubic = root?.BinaryCubeCubicDecryptorEngine
    || (typeof module === 'object' && module.exports && typeof require === 'function'
      ? require('./binary-cube-cubic-decryptor-engine.js')
      : null);
  const api = factory(root, Cubic);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.BinaryCubeCubicDecryptorWebGPU = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function createBinaryCubeCubicDecryptorWebGPU(root, Cubic) {
  'use strict';

  if (!Cubic) throw new Error('Cubic WebGPU acceleration requires BinaryCubeCubicDecryptorEngine.');

  const VERSION = '0.1.0';
  const BACKEND = 'webgpu-stage-a-histogram-v1';
  const HISTOGRAM_BINS = 256;
  const OUTPUT_STRIDE = HISTOGRAM_BINS + 1;
  const WORKGROUP_SIZE = 128;
  const DEFAULT_BATCH_SIZE = 64;
  const MAX_BATCH_SIZE = 256;

  const SHADER_SOURCE = `
@group(0) @binding(0) var<storage, read> bytesIn : array<u32>;
@group(0) @binding(1) var<storage, read> lengths : array<u32>;
@group(0) @binding(2) var<storage, read_write> counts : array<atomic<u32>>;
@group(0) @binding(3) var<storage, read> meta : array<u32>;

@compute @workgroup_size(${WORKGROUP_SIZE})
fn main(@builtin(global_invocation_id) globalId : vec3<u32>) {
  let sampleCount = meta[0];
  let stride = meta[1];
  let flatIndex = globalId.x;
  let totalCells = sampleCount * stride;
  if (flatIndex >= totalCells) { return; }

  let sampleIndex = flatIndex / stride;
  let byteIndex = flatIndex % stride;
  let byteLength = lengths[sampleIndex];
  if (byteIndex >= byteLength) { return; }

  let value = bytesIn[flatIndex] & 255u;
  let outputBase = sampleIndex * ${OUTPUT_STRIDE}u;
  atomicAdd(&counts[outputBase + 1u + value], 1u);
  if ((value >= 32u && value <= 126u) || value == 9u || value == 10u || value == 13u) {
    atomicAdd(&counts[outputBase], 1u);
  }
}
`;

  function fail(message) { throw new Error(message); }
  const clampInteger = (value, minimum, maximum) => Math.max(minimum, Math.min(maximum, Math.floor(Number(value) || 0)));

  function capability() {
    if (!root?.navigator?.gpu) return Object.freeze({ supported: false, backend: BACKEND, reason: 'navigator.gpu is unavailable in this browser/context.' });
    if (root?.isSecureContext === false) return Object.freeze({ supported: false, backend: BACKEND, reason: 'WebGPU requires a secure browser context.' });
    return Object.freeze({ supported: true, backend: BACKEND, reason: 'WebGPU is exposed; adapter/device validation occurs when acceleration is enabled.' });
  }

  function assertCanonicalScoringHelpers() {
    if (typeof Cubic.entropyFromCounts !== 'function') fail('Cubic WebGPU acceleration requires Cubic.entropyFromCounts().');
    if (typeof Cubic.scorePlaintextFromMetrics !== 'function') fail('Cubic WebGPU acceleration requires Cubic.scorePlaintextFromMetrics().');
    if (typeof Cubic.completeCandidateEvidence !== 'function') fail('Cubic WebGPU acceleration requires Cubic.completeCandidateEvidence().');
  }

  function destroyBuffer(buffer) {
    try { buffer?.destroy?.(); } catch (_) { /* best effort */ }
  }

  function bytesToBits(bytesValue) {
    return Array.from(Uint8Array.from(bytesValue || []), byte => byte.toString(2).padStart(8, '0')).join('');
  }

  function paritySamples() {
    return [
      bytesToBits(Cubic.textToBytes('WebGPU parity control: the quick brown fox and structured text.')),
      bytesToBits(Uint8Array.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a,0,1,2,3,4,5,6,7])),
      bytesToBits(Uint8Array.from(Array.from({ length: 64 }, (_, index) => (index * 37 + 11) & 0xff)))
    ];
  }

  async function createAccelerator(options = {}) {
    assertCanonicalScoringHelpers();
    const available = capability();
    if (!available.supported) fail(available.reason);

    const adapter = await root.navigator.gpu.requestAdapter({ powerPreference: options.powerPreference || 'high-performance' });
    if (!adapter) fail('WebGPU did not provide a compatible GPU adapter.');
    const device = await adapter.requestDevice();
    if (!device) fail('WebGPU did not provide a GPU device.');

    const usage = root.GPUBufferUsage;
    const mapMode = root.GPUMapMode;
    if (!usage || !mapMode) fail('WebGPU buffer constants are unavailable in this browser.');

    const shaderModule = device.createShaderModule({ label: 'Cubic Stage A histogram shader', code: SHADER_SOURCE });
    const pipelineDescriptor = {
      label: 'Cubic Stage A histogram pipeline',
      layout: 'auto',
      compute: { module: shaderModule, entryPoint: 'main' }
    };
    const pipeline = typeof device.createComputePipelineAsync === 'function'
      ? await device.createComputePipelineAsync(pipelineDescriptor)
      : device.createComputePipeline(pipelineDescriptor);

    let lost = false;
    let destroyed = false;
    let parityVerified = false;
    Promise.resolve(device.lost).then(() => { lost = true; }).catch(() => { lost = true; });

    function assertReady() {
      if (destroyed) fail('The Cubic WebGPU accelerator has been destroyed.');
      if (lost) fail('The WebGPU device was lost; use the CPU worker pool fallback.');
    }

    async function histogramBatch(bitstreamsValue) {
      assertReady();
      const bitstreams = Array.from(bitstreamsValue || [], value => String(value || ''));
      if (!bitstreams.length) return [];
      const byteRows = bitstreams.map(bits => Cubic.bitsToBytes(bits));
      const sampleCount = byteRows.length;
      const stride = Math.max(1, ...byteRows.map(bytes => bytes.length));
      const flattened = new Uint32Array(sampleCount * stride);
      const lengths = new Uint32Array(sampleCount);
      for (let sampleIndex = 0; sampleIndex < sampleCount; sampleIndex += 1) {
        const bytes = byteRows[sampleIndex];
        lengths[sampleIndex] = bytes.length;
        const base = sampleIndex * stride;
        for (let byteIndex = 0; byteIndex < bytes.length; byteIndex += 1) flattened[base + byteIndex] = bytes[byteIndex];
      }
      const outputWords = sampleCount * OUTPUT_STRIDE;
      const outputZeros = new Uint32Array(outputWords);
      const meta = new Uint32Array([sampleCount, stride, 0, 0]);

      const inputBuffer = device.createBuffer({ label: 'Cubic WebGPU bytes', size: Math.max(4, flattened.byteLength), usage: usage.STORAGE | usage.COPY_DST });
      const lengthBuffer = device.createBuffer({ label: 'Cubic WebGPU lengths', size: Math.max(4, lengths.byteLength), usage: usage.STORAGE | usage.COPY_DST });
      const outputBuffer = device.createBuffer({ label: 'Cubic WebGPU histogram output', size: Math.max(4, outputZeros.byteLength), usage: usage.STORAGE | usage.COPY_SRC | usage.COPY_DST });
      const metaBuffer = device.createBuffer({ label: 'Cubic WebGPU metadata', size: meta.byteLength, usage: usage.STORAGE | usage.COPY_DST });
      const readbackBuffer = device.createBuffer({ label: 'Cubic WebGPU histogram readback', size: Math.max(4, outputZeros.byteLength), usage: usage.COPY_DST | usage.MAP_READ });

      try {
        device.queue.writeBuffer(inputBuffer, 0, flattened);
        device.queue.writeBuffer(lengthBuffer, 0, lengths);
        device.queue.writeBuffer(outputBuffer, 0, outputZeros);
        device.queue.writeBuffer(metaBuffer, 0, meta);

        const bindGroup = device.createBindGroup({
          label: 'Cubic WebGPU Stage A bind group',
          layout: pipeline.getBindGroupLayout(0),
          entries: [
            { binding: 0, resource: { buffer: inputBuffer } },
            { binding: 1, resource: { buffer: lengthBuffer } },
            { binding: 2, resource: { buffer: outputBuffer } },
            { binding: 3, resource: { buffer: metaBuffer } }
          ]
        });
        const encoder = device.createCommandEncoder({ label: 'Cubic WebGPU Stage A encoder' });
        const pass = encoder.beginComputePass({ label: 'Cubic WebGPU Stage A pass' });
        pass.setPipeline(pipeline);
        pass.setBindGroup(0, bindGroup);
        pass.dispatchWorkgroups(Math.ceil((sampleCount * stride) / WORKGROUP_SIZE));
        pass.end();
        encoder.copyBufferToBuffer(outputBuffer, 0, readbackBuffer, 0, outputZeros.byteLength);
        device.queue.submit([encoder.finish()]);
        await readbackBuffer.mapAsync(mapMode.READ);
        const copied = new Uint32Array(readbackBuffer.getMappedRange().slice(0));
        readbackBuffer.unmap();

        return byteRows.map((bytes, sampleIndex) => {
          const base = sampleIndex * OUTPUT_STRIDE;
          const histogram = copied.slice(base + 1, base + OUTPUT_STRIDE);
          const printableCount = copied[base];
          const printableFraction = bytes.length ? printableCount / bytes.length : 0;
          const entropy = Cubic.entropyFromCounts(histogram, bytes.length);
          return Object.freeze({ printableCount, printableFraction, entropy, histogram: Object.freeze(Array.from(histogram)), byteLength: bytes.length });
        });
      } finally {
        destroyBuffer(inputBuffer);
        destroyBuffer(lengthBuffer);
        destroyBuffer(outputBuffer);
        destroyBuffer(metaBuffer);
        destroyBuffer(readbackBuffer);
      }
    }

    async function scorePlaintexts(bitstreamsValue) {
      const bitstreams = Array.from(bitstreamsValue || [], value => String(value || ''));
      const metrics = await histogramBatch(bitstreams);
      return Object.freeze(bitstreams.map((bits, index) => Cubic.scorePlaintextFromMetrics(bits, metrics[index])));
    }

    async function scoreCandidates(candidatesValue) {
      assertReady();
      const candidates = Array.from(candidatesValue || []);
      if (!candidates.length) return Object.freeze([]);
      const batchSize = clampInteger(options.batchSize || DEFAULT_BATCH_SIZE, 1, MAX_BATCH_SIZE);
      const output = [];
      for (let offset = 0; offset < candidates.length; offset += batchSize) {
        const batch = candidates.slice(offset, offset + batchSize);
        const metrics = await histogramBatch(batch.map(candidate => candidate.plaintextBits));
        for (let index = 0; index < batch.length; index += 1) {
          const scored = Cubic.completeCandidateEvidence(batch[index], metrics[index]);
          output.push(Object.freeze({
            ...scored,
            stageAAcceleration: Object.freeze({ backend: BACKEND, version: VERSION })
          }));
        }
      }
      return Object.freeze(output);
    }

    async function verifyParity() {
      assertReady();
      const samples = paritySamples();
      const gpuRows = await scorePlaintexts(samples);
      const cpuRows = samples.map(bits => Cubic.scorePlaintext(bits));
      for (let index = 0; index < samples.length; index += 1) {
        const gpu = gpuRows[index];
        const cpu = cpuRows[index];
        for (const field of ['score', 'printableFraction', 'entropy', 'tokenHits', 'signature', 'preview', 'hexPreview', 'byteLength']) {
          if (!Object.is(gpu[field], cpu[field])) fail(`WebGPU Stage A parity failed for sample ${index + 1}, field ${field}.`);
        }
      }
      parityVerified = true;
      return Object.freeze({ pass: true, sampleCount: samples.length, backend: BACKEND, version: VERSION });
    }

    return Object.freeze({
      backend: BACKEND,
      version: VERSION,
      adapter,
      device,
      get parityVerified() { return parityVerified; },
      histogramBatch,
      scorePlaintexts,
      scoreCandidates,
      verifyParity,
      destroy() {
        if (destroyed) return;
        destroyed = true;
        try { device.destroy?.(); } catch (_) { /* best effort */ }
      }
    });
  }

  return Object.freeze({
    version: VERSION,
    backend: BACKEND,
    constants: Object.freeze({ VERSION, BACKEND, HISTOGRAM_BINS, OUTPUT_STRIDE, WORKGROUP_SIZE, DEFAULT_BATCH_SIZE, MAX_BATCH_SIZE }),
    capability,
    createAccelerator,
    shaderSource: SHADER_SOURCE
  });
});
