(() => {
  'use strict';

  function waitForModel(attempt = 0) {
    const base = globalThis.BlacklightExoLensingModel;
    if (!base || !base.midpointCalibrated || !(globalThis.BlacklightExoSystemMasses instanceof Map)) {
      if (attempt < 360) requestAnimationFrame(() => waitForModel(attempt + 1));
      return;
    }
    if (base.systemMassCalibrated) return;

    const originalBuildScene = base.buildScene;
    function buildScene(entries, clusterSeed, options) {
      const massRecords = globalThis.BlacklightExoSystemMasses;
      const calibrated = entries.map(entry => {
        const record = massRecords.get(entry.seed);
        return record
          ? {
              ...entry,
              stellarMass: record.stellarMassSolar,
              planetaryMass: record.planetaryMassSolar + record.beltMassSolar,
              mass: record.totalSolarMass,
              massBreakdown: {...record}
            }
          : entry;
      });
      const scene = originalBuildScene(calibrated, clusterSeed, options);
      scene.systemMassIncludesOrbitingBodies = true;
      return scene;
    }

    globalThis.BlacklightExoLensingModel = Object.freeze({
      ...base,
      buildScene,
      systemMassCalibrated: true,
      EARTHS_PER_SOLAR_MASS: 332946.0487,
      EARTHS_PER_LUNAR_MASS: 81.30056
    });
  }

  waitForModel();
})();
