(() => {
  'use strict';

  function normalizePackage(pkg) {
    if (pkg?.outputs?.items) {
      pkg.outputs.item = pkg.outputs.items;
      delete pkg.outputs.items;
    }
    return pkg;
  }

  function install() {
    const core = window.WODContextAwareCore;
    if (!core?.enrichPackage || core.__wodOutputNormalizerInstalled) return false;
    const original = core.enrichPackage.bind(core);
    core.enrichPackage = (...args) => normalizePackage(original(...args));
    Object.defineProperty(core, '__wodOutputNormalizerInstalled', {
      configurable: false,
      enumerable: false,
      value: true
    });
    return true;
  }

  let attempts = 0;
  const seek = () => {
    attempts += 1;
    if (!install() && attempts < 100) window.setTimeout(seek, 20);
  };
  seek();
})();
