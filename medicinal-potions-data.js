(() => {
  'use strict';

  const packs = globalThis.HBMedicinalPotionDataPacks ||= {};
  if (typeof require === 'function') {
    packs.core ||= require('./medicinal-potions-core-data.js');
    packs.effects ||= require('./medicinal-potions-effects-data.js');
    packs.formula ||= require('./medicinal-potions-formula-data.js');
    packs.aging ||= require('./medicinal-potions-aging-data.js');
  }
  for (const required of ['core', 'effects', 'formula', 'aging']) {
    if (!packs[required]) throw new Error(`Potion data pack ${required} must load before the assembled data module.`);
  }
  const data = Object.freeze({ ...packs.core, ...packs.effects, ...packs.formula, ...packs.aging });
  if (typeof module !== 'undefined' && module.exports) module.exports = data;
  globalThis.HBMedicinalPotionData = data;
})();