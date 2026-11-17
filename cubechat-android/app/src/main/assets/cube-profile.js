/* Invoked only inside the offline profile WebView. The shipped lab engine is the authority. */
(() => {
  'use strict';
  const root = typeof globalThis !== 'undefined' ? globalThis : window;
  const engine = root.ShadowrunBinaryCubeEngine;
  if (!engine) throw new Error('Binary Cube engine missing');
  const keys = new Map();
  function keyFor(seed) {
    if (!/^[0-9a-f]{64}$/.test(seed)) throw new Error('Invalid directional key');
    if (!keys.has(seed)) {
      if (keys.size >= 2) keys.clear();
      keys.set(seed, engine.createKey({
        gridSize: 64, seed, maskDensity: 1, inputFace: 'top', outputFace: 'front'
      }));
    }
    return keys.get(seed);
  }
  root.CubeChatTransform = function (operation, seed, data) {
    try {
      const key = keyFor(seed);
      if (operation === 'encode') {
        const bytes = atob(data);
        if (!bytes.length || bytes.length > 4096) throw new Error('Invalid message size');
        const bits = Array.from(bytes, c => c.charCodeAt(0).toString(2).padStart(8, '0')).join('');
        return {value: JSON.stringify(engine.encryptBinary(bits, key))};
      }
      if (operation !== 'decode') throw new Error('Unknown profile operation');
      const bits = engine.decryptBinary(JSON.parse(data), key);
      if (bits.length % 8 || bits.length > 4096 * 8) throw new Error('Invalid decoded length');
      let binary = '';
      for (let i = 0; i < bits.length; i += 8) {
        binary += String.fromCharCode(parseInt(bits.slice(i, i + 8), 2));
      }
      return {value: btoa(binary)};
    } catch (error) {
      return {error: String(error.message || 'Cube transform failed')};
    }
  };
})();
