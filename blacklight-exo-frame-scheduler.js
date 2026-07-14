(() => {
  'use strict';

  const nativeRequest = window.requestAnimationFrame.bind(window);
  const classification = new WeakMap();
  const lastRendered = new WeakMap();
  const FRAME_INTERVAL = 1000 / 30;

  function isPrimarySystemRenderer(callback) {
    if (typeof callback !== 'function') return false;
    if (classification.has(callback)) return classification.get(callback);
    let matches = false;
    try {
      const source = Function.prototype.toString.call(callback);
      matches = callback.name === 'renderFrame' &&
        source.includes("state.view === '3d'") &&
        source.includes('drawSystem3d');
    } catch {}
    classification.set(callback, matches);
    return matches;
  }

  window.requestAnimationFrame = function requestAnimationFrame(callback) {
    if (!isPrimarySystemRenderer(callback)) return nativeRequest(callback);

    const run = timestamp => {
      const previous = lastRendered.get(callback) || 0;
      if (timestamp - previous >= FRAME_INTERVAL) {
        lastRendered.set(callback, timestamp);
        callback(timestamp);
        return;
      }
      nativeRequest(run);
    };

    return nativeRequest(run);
  };
})();
