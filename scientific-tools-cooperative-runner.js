(() => {
  'use strict';

  const DEFAULT_CHUNK_SIZE = 128;
  const DEFAULT_MAX_SLICE_MS = 8;
  const DEFAULT_PROGRESS_INTERVAL_MS = 80;
  let nextTokenId = 1;

  class CooperativeCancelledError extends Error {
    constructor(message = 'Cooperative scientific task cancelled.') {
      super(message);
      this.name = 'CooperativeCancelledError';
    }
  }

  function now() {
    return globalThis.performance?.now?.() ?? Date.now();
  }

  function createToken(label = 'scientific-task') {
    return {
      id: nextTokenId++,
      label: String(label || 'scientific-task'),
      cancelled: false,
      reason: '',
      cancel(reason = 'cancelled') {
        this.cancelled = true;
        this.reason = String(reason || 'cancelled');
      }
    };
  }

  function assertActive(token) {
    if (token?.cancelled) throw new CooperativeCancelledError(`${token.label || 'Scientific task'}: ${token.reason || 'cancelled'}.`);
  }

  function yieldControl() {
    return new Promise(resolve => {
      const finish = () => setTimeout(resolve, 0);
      const documentVisible = typeof document === 'undefined' || document.visibilityState !== 'hidden';
      if (documentVisible && typeof requestAnimationFrame === 'function') {
        requestAnimationFrame(finish);
      } else {
        setTimeout(resolve, 0);
      }
    });
  }

  function normalizedSliceBudget(value) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return DEFAULT_MAX_SLICE_MS;
    return Math.max(1, Math.min(50, numeric));
  }

  function progressSnapshot(label, completed, total, sliceItems, sliceMilliseconds) {
    return Object.freeze({
      label,
      completed,
      total,
      fraction: total ? completed / total : 1,
      sliceItems,
      sliceMilliseconds
    });
  }

  async function forRange(options = {}) {
    const start = Number.isInteger(options.start) ? options.start : 0;
    const end = Number.isInteger(options.end) ? options.end : start;
    const chunkSize = Math.max(1, Math.floor(Number(options.chunkSize) || DEFAULT_CHUNK_SIZE));
    const maxSliceMs = normalizedSliceBudget(options.maxSliceMs);
    const step = options.step;
    if (typeof step !== 'function') throw new TypeError('forRange requires a step(index) function.');
    const token = options.token || null;
    const onProgress = typeof options.onProgress === 'function' ? options.onProgress : null;
    const label = String(options.label || token?.label || 'scientific-task');
    const total = Math.max(0, end - start);
    let index = start;
    let completed = 0;
    let lastProgressAt = -Infinity;

    while (index < end) {
      assertActive(token);
      const sliceStartedAt = now();
      let sliceItems = 0;

      while (index < end && sliceItems < chunkSize) {
        assertActive(token);
        step(index);
        index += 1;
        sliceItems += 1;
        completed = index - start;

        // Time is deliberately not part of the scientific result. It only decides
        // when the browser gets control back; item order and deterministic RNG order
        // remain unchanged on fast and slow hardware.
        if (sliceItems > 0 && now() - sliceStartedAt >= maxSliceMs) break;
      }

      const timestamp = now();
      const sliceMilliseconds = timestamp - sliceStartedAt;
      if (onProgress && (completed === total || timestamp - lastProgressAt >= DEFAULT_PROGRESS_INTERVAL_MS)) {
        lastProgressAt = timestamp;
        onProgress(progressSnapshot(label, completed, total, sliceItems, sliceMilliseconds));
      }

      if (index < end) await yieldControl();
    }

    if (onProgress && total === 0) onProgress(progressSnapshot(label, 0, 0, 0, 0));
    return completed;
  }

  async function forEach(values, options = {}) {
    const list = values || [];
    await forRange({
      ...options,
      start: 0,
      end: list.length,
      step: index => options.step(list[index], index)
    });
    return list;
  }

  async function consumeGenerator(generator, options = {}) {
    if (!generator || typeof generator.next !== 'function') throw new TypeError('consumeGenerator requires a generator.');
    const token = options.token || null;
    const stepsPerSlice = Math.max(1, Math.floor(Number(options.stepsPerSlice) || DEFAULT_CHUNK_SIZE));
    const maxSliceMs = normalizedSliceBudget(options.maxSliceMs);
    const onProgress = typeof options.onProgress === 'function' ? options.onProgress : null;
    let stepCount = 0;

    while (true) {
      assertActive(token);
      const sliceStartedAt = now();
      let sliceItems = 0;
      while (sliceItems < stepsPerSlice) {
        assertActive(token);
        const next = generator.next();
        if (next.done) return next.value;
        stepCount += 1;
        sliceItems += 1;
        if (onProgress && next.value?.progress) onProgress(next.value.progress);
        if (now() - sliceStartedAt >= maxSliceMs) break;
      }
      await yieldControl();
    }
  }

  async function map(values, mapper, options = {}) {
    const list = Array.from(values || []);
    const result = new Array(list.length);
    await forRange({
      ...options,
      start: 0,
      end: list.length,
      step: index => { result[index] = mapper(list[index], index); }
    });
    return result;
  }

  window.ScientificToolsCooperativeRunner = Object.freeze({
    DEFAULT_CHUNK_SIZE,
    DEFAULT_MAX_SLICE_MS,
    CooperativeCancelledError,
    createToken,
    assertActive,
    yieldControl,
    forRange,
    forEach,
    consumeGenerator,
    map
  });
})();