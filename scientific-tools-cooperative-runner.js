(() => {
  'use strict';

  const DEFAULT_CHUNK_SIZE = 128;
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
      if (typeof requestAnimationFrame === 'function') {
        requestAnimationFrame(() => setTimeout(resolve, 0));
      } else {
        setTimeout(resolve, 0);
      }
    });
  }

  async function forRange(options = {}) {
    const start = Number.isInteger(options.start) ? options.start : 0;
    const end = Number.isInteger(options.end) ? options.end : start;
    const chunkSize = Math.max(1, Math.floor(Number(options.chunkSize) || DEFAULT_CHUNK_SIZE));
    const step = options.step;
    if (typeof step !== 'function') throw new TypeError('forRange requires a step(index) function.');
    const token = options.token || null;
    const onProgress = typeof options.onProgress === 'function' ? options.onProgress : null;
    const label = String(options.label || token?.label || 'scientific-task');
    const total = Math.max(0, end - start);
    let completed = 0;
    let lastProgressAt = -Infinity;

    for (let chunkStart = start; chunkStart < end; chunkStart += chunkSize) {
      assertActive(token);
      const chunkEnd = Math.min(end, chunkStart + chunkSize);
      for (let index = chunkStart; index < chunkEnd; index += 1) step(index);
      completed = chunkEnd - start;
      const timestamp = now();
      if (onProgress && (completed === total || timestamp - lastProgressAt >= DEFAULT_PROGRESS_INTERVAL_MS)) {
        lastProgressAt = timestamp;
        onProgress(Object.freeze({ label, completed, total, fraction: total ? completed / total : 1 }));
      }
      if (chunkEnd < end) await yieldControl();
    }

    if (onProgress && total === 0) onProgress(Object.freeze({ label, completed: 0, total: 0, fraction: 1 }));
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
    const onProgress = typeof options.onProgress === 'function' ? options.onProgress : null;
    let stepCount = 0;
    while (true) {
      assertActive(token);
      for (let index = 0; index < stepsPerSlice; index += 1) {
        const next = generator.next();
        if (next.done) return next.value;
        stepCount += 1;
        if (onProgress && next.value?.progress) onProgress(next.value.progress);
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