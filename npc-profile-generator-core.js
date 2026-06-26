(() => {
  'use strict';
  const foundation = globalThis.NpcProfileGeneratorFoundation;
  const assembly = globalThis.NpcProfileGeneratorAssembly;
  const household = globalThis.NpcProfileGeneratorHousehold;
  const operations = globalThis.NpcProfileGeneratorOperations;
  const mechanics = globalThis.NpcProfileGeneratorMechanics;
  if (!foundation || !assembly) throw new Error('NPC generator foundation and composition modules must load first.');

  function generateProfile(config = {}) {
    let result = assembly.generateProfile(config);
    if (household) result = household.enrich(result, config);
    if (operations) result = operations.enrich(result, config);
    if (mechanics) result = mechanics.enrich(result, config);
    return result;
  }

  globalThis.NpcProfileGeneratorCore = Object.freeze({
    GENERATOR_ID: assembly.GENERATOR_ID,
    VERSION: assembly.VERSION,
    CANONICAL_SECTIONS: foundation.CANONICAL_SECTIONS,
    decodePointer: foundation.decodePointer,
    pointerGet: foundation.pointerGet,
    pointerSet: foundation.pointerSet,
    tableEntries: foundation.tableEntries,
    chooseTable: foundation.chooseTable,
    generatedProfileId: foundation.generatedProfileId,
    generateField: foundation.generateField,
    generateFields: foundation.generateFields,
    applyLocks: assembly.applyLocks,
    generateProfile
  });
})();
