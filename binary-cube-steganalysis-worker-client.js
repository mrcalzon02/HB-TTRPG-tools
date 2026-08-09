(() => {
  'use strict';

  const WORKER_URL = 'binary-cube-steganalysis-worker.js?v=20260809-raster-evidence-profile-1';
  const HEARTBEAT_INTERVAL_MS = 1000;
  let worker = null;
  let nextRequestId = 1;
  const pending = new Map();

  function now() {
    return globalThis.performance?.now?.() ?? Date.now();
  }

  function stopHeartbeat(request) {
    if (!request?.heartbeatTimer) return;
    clearInterval(request.heartbeatTimer);
    request.heartbeatTimer = 0;
  }

  function rejectAll(error) {
    for (const request of pending.values()) {
      stopHeartbeat(request);
      request.reject(error);
    }
    pending.clear();
  }

  function resetWorker(error = null) {
    if (worker) {
      worker.terminate();
      worker = null;
    }
    if (error) rejectAll(error);
  }

  function progressPayload(request, overrides = {}) {
    return Object.freeze({
      stage: overrides.stage ?? request.lastStage ?? 'Working',
      fraction: overrides.fraction ?? request.lastFraction ?? 0,
      heartbeat: Boolean(overrides.heartbeat),
      elapsedMilliseconds: Math.max(0, now() - request.startedAt)
    });
  }

  function ensureWorker() {
    if (worker) return worker;
    if (typeof Worker !== 'function') throw new Error('This browser does not support Web Workers required for freeze-safe steganalysis.');
    const base = typeof document !== 'undefined' ? document.baseURI : globalThis.location?.href;
    worker = new Worker(new URL(WORKER_URL, base));
    worker.addEventListener('message', event => {
      const message = event.data || {};
      const request = pending.get(message.id);
      if (!request) return;
      if (message.type === 'progress') {
        request.lastStage = String(message.stage || 'Working');
        request.lastFraction = Math.max(0, Math.min(1, Number(message.fraction) || 0));
        request.onProgress?.(progressPayload(request));
        return;
      }
      pending.delete(message.id);
      stopHeartbeat(request);
      if (message.type === 'result') {
        request.resolve(message.result);
        return;
      }
      const error = new Error(message.error?.message || 'Steganalysis worker failed.');
      error.name = message.error?.name || 'Error';
      request.reject(error);
    });
    worker.addEventListener('error', event => {
      resetWorker(new Error(event.message || 'Steganalysis worker crashed.'));
    });
    return worker;
  }

  function run(operation, payload = {}, options = {}) {
    const id = nextRequestId++;
    const activeWorker = ensureWorker();
    return new Promise((resolve, reject) => {
      const request = {
        resolve,
        reject,
        onProgress: typeof options.onProgress === 'function' ? options.onProgress : null,
        startedAt: now(),
        lastStage: 'Starting steganalysis worker',
        lastFraction: 0,
        heartbeatTimer: 0
      };
      if (request.onProgress) {
        request.heartbeatTimer = setInterval(() => {
          if (!pending.has(id)) return stopHeartbeat(request);
          request.onProgress(progressPayload(request, { stage: `${request.lastStage} · still working`, heartbeat: true }));
        }, HEARTBEAT_INTERVAL_MS);
      }
      pending.set(id, request);
      try {
        activeWorker.postMessage({ id, operation, ...payload }, Array.from(options.transfer || []));
      } catch (error) {
        pending.delete(id);
        stopHeartbeat(request);
        reject(error);
      }
    });
  }

  function profileRaster(rgbaValue, width, height, options = {}) {
    const rgba = rgbaValue instanceof Uint8ClampedArray ? new Uint8ClampedArray(rgbaValue) : new Uint8ClampedArray(rgbaValue || []);
    return run('raster-evidence-profile', {
      rgba: rgba.buffer,
      width,
      height,
      tileSize: options.tileSize,
      channels: options.channels
    }, {
      transfer: [rgba.buffer],
      onProgress: options.onProgress
    });
  }

  function localizedRaster(rgbaValue, width, height, options = {}) {
    const rgba = rgbaValue instanceof Uint8ClampedArray ? new Uint8ClampedArray(rgbaValue) : new Uint8ClampedArray(rgbaValue || []);
    return run('localized-raster', {
      rgba: rgba.buffer,
      width,
      height,
      tileSize: options.tileSize,
      channel: options.channel || 'luma'
    }, {
      transfer: [rgba.buffer],
      onProgress: options.onProgress
    });
  }

  function cancelAll(reason = 'cancelled by user') {
    if (!worker && pending.size === 0) return false;
    const error = new Error(`Steganalysis background operation ${String(reason || 'cancelled')}.`);
    error.name = 'AbortError';
    resetWorker(error);
    return true;
  }

  function isBusy() {
    return pending.size > 0;
  }

  window.BinaryCubeSteganalysisWorkerClient = Object.freeze({
    run,
    profileRaster,
    localizedRaster,
    cancelAll,
    isBusy,
    workerUrl: WORKER_URL,
    heartbeatIntervalMs: HEARTBEAT_INTERVAL_MS
  });
})();
