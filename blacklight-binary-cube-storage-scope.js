(() => {
  'use strict';

  const remap = new Map([
    ['hb-ttrpg-shadowrun-binary-cube-v2', 'hb-ttrpg-blacklight-binary-cube-v1'],
    ['hb-ttrpg-shadowrun-binary-cube-auth-envelope-v1', 'hb-ttrpg-blacklight-binary-cube-auth-envelope-v1']
  ]);

  const originalGetItem = Storage.prototype.getItem;
  const originalSetItem = Storage.prototype.setItem;
  const originalRemoveItem = Storage.prototype.removeItem;

  function scopedKey(key) {
    return remap.get(String(key)) || key;
  }

  Storage.prototype.getItem = function getBlacklightScopedItem(key) {
    return originalGetItem.call(this, scopedKey(key));
  };

  Storage.prototype.setItem = function setBlacklightScopedItem(key, value) {
    return originalSetItem.call(this, scopedKey(key), value);
  };

  Storage.prototype.removeItem = function removeBlacklightScopedItem(key) {
    return originalRemoveItem.call(this, scopedKey(key));
  };

  window.BlacklightBinaryCubeStorageScope = Object.freeze({
    namespace: 'blacklight',
    mappedKeys: Object.freeze(Object.fromEntries(remap))
  });
})();
