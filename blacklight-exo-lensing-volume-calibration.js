(() => {
  'use strict';

  function waitForModel(attempt = 0) {
    const base = globalThis.BlacklightExoLensingModel;
    if (!base) {
      if (attempt < 180) requestAnimationFrame(() => waitForModel(attempt + 1));
      return;
    }
    if (base.volumeCalibrated) return;

    const originalBuildScene = base.buildScene;

    function stellarRadius(starText = '') {
      const text = String(starText).toLowerCase();
      if (/white\s+dwarf|\bwd\b/.test(text)) return 0.012;
      if (/supergiant/.test(text)) return 50;
      if (/giant/.test(text)) return 10;
      if (/red\s+dwarf/.test(text)) return 0.32;
      if (/orange\s+dwarf/.test(text)) return 0.72;
      const classification = text.match(/\b([mkgfab])(?:-type)?\b/i)?.[1]?.toUpperCase();
      return ({M: 0.48, K: 0.78, G: 1, F: 1.3, A: 1.8, B: 3.5})[classification] || 1;
    }

    function volumeFactor(starText) {
      const radius = stellarRadius(starText);
      const relativeVolume = Math.max(1e-9, radius ** 3);
      return 1 + Math.log1p(relativeVolume) * 0.16;
    }

    function buildScene(entries, clusterSeed, options) {
      const scene = originalBuildScene(entries, clusterSeed, options);
      const factorByName = new Map(
        entries.map(entry => [entry.name, volumeFactor(entry.star || '')])
      );

      for (const node of scene.lensingNodes) {
        const factors = [];
        for (const connection of node.connections) {
          if (connection.kind === 'anomaly') continue;
          factors.push(factorByName.get(connection.fromName) || 1);
          factors.push(factorByName.get(connection.toName) || 1);
        }
        const averageFactor = factors.length
          ? factors.reduce((sum, value) => sum + value, 0) / factors.length
          : 1;
        const strongestFactor = factors.length ? Math.max(...factors) : 1;
        const volumeBoost = Math.sqrt(averageFactor * strongestFactor);
        node.strength *= volumeBoost;
        node.displayRadius *= 1 + Math.log1p(Math.max(0, volumeBoost - 1)) * 0.42;
        node.volumeFactor = volumeBoost;
      }

      scene.lensingNodes.sort((left, right) => right.strength - left.strength);
      return scene;
    }

    globalThis.BlacklightExoLensingModel = Object.freeze({
      ...base,
      buildScene,
      stellarRadius,
      volumeFactor,
      volumeCalibrated: true
    });
  }

  waitForModel();
})();
