(() => {
  'use strict';
  const packs = globalThis.HBMedicinalPotionDataPacks ||= {};
  if (typeof require === 'function') {
    packs.sensory ||= require('./medicinal-potions-sensory-data.js');
    packs.compounds ||= require('./medicinal-potions-compounds-data.js');
    packs.process ||= require('./medicinal-potions-process-data.js');
  }
  for (const required of ['sensory', 'compounds', 'process']) if (!packs[required]) throw new Error(`Potion formula pack ${required} is missing.`);
  const pack = { ...packs.sensory, ...packs.compounds, ...packs.process };
  packs.formula = pack;
  if (typeof module !== 'undefined' && module.exports) module.exports = pack;
})();