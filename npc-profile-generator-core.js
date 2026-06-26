(() => {
  'use strict';
  const foundation = globalThis.NpcProfileGeneratorFoundation;
  const assembly = globalThis.NpcProfileGeneratorAssembly;
  if (!foundation || !assembly) throw new Error('NPC generator foundation and composition modules must load first.');
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
    generateProfile: assembly.generateProfile
  });
})();
