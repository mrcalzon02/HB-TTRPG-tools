(() => {
  'use strict';
  const rules = globalThis.NpcProfileRules;
  if (!rules) return;
  globalThis.NpcProfileRules = Object.freeze({ ...rules });
})();
