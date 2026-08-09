(() => {
  'use strict';

  const WORKER_URL = 'shadowrun-binary-cube-worker.js?v=20260809-v14-binary-cube-worker';
  let worker = null;
  let nextRequestId = 1;
  const pending = new Map();

  function rejectAll(error) {
    for (const request of pending.values()) request.reject(error);
    pending.clear();
  }

  function resetWorker(error = null) {
    if (worker) {
      worker.terminate();
      worker = null;
    }
    if (error) rejectAll(error);
  }

  function ensureWorker() {
    if (worker) return worker;
    if (typeof Worker !== 'function') throw new Error('This browser does not support Web Workers required for freeze-safe Binary Cube execution.');
    worker = new Worker(new URL(WORKER_URL, document.baseURI));
    worker.addEventListener('message', event => {
      const message = event.data || {};
      const request = pending.get(message.id);
      if (!request) return;
      if (message.type === 'progress') {
        request.onProgress?.(Object.freeze({
          stage: String(message.stage || 'Working'),
          fraction: Math.max(0, Math.min(1, Number(message.fraction) || 0)),
          detail: String(message.detail || '')
        }));
        return;
      }
      pending.delete(message.id);
      if (message.type === 'result') {
        request.resolve(message.result);
        return;
      }
      const error = new Error(message.error?.message || 'Binary Cube worker failed.');
      error.name = message.error?.name || 'Error';
      if (message.error?.stack) error.stack = message.error.stack;
      request.reject(error);
    });
    worker.addEventListener('error', event => {
      const error = new Error(event.message || 'Binary Cube worker crashed.');
      resetWorker(error);
    });
    return worker;
  }

  function run(operation, payload = {}, options = {}) {
    const id = nextRequestId++;
    const activeWorker = ensureWorker();
    return new Promise((resolve, reject) => {
      pending.set(id, {
        resolve,
        reject,
        onProgress: typeof options.onProgress === 'function' ? options.onProgress : null
      });
      activeWorker.postMessage({ id, operation, payload });
    });
  }

  function cancelAll(reason = 'cancelled by user') {
    if (!worker && pending.size === 0) return false;
    const error = new Error(`Binary Cube background operation ${String(reason || 'cancelled')}.`);
    error.name = 'AbortError';
    resetWorker(error);
    return true;
  }

  function isBusy() {
    return pending.size > 0;
  }

  window.ShadowrunBinaryCubeWorkerClient = Object.freeze({
    run,
    cancelAll,
    isBusy,
    workerUrl: WORKER_URL
  });
})();
