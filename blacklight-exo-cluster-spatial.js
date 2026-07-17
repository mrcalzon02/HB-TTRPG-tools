(() => {
  'use strict';
  if (globalThis.BlacklightExoClusterSpatial) return;
  const AU_PER_LY = 63241.07708426628;
  const authority = globalThis.BlacklightExoAuthority;
  const grid = document.getElementById('exo-cluster-grid');
  if (!grid) return;

  let systems = [];
  let refreshQueued = false;

  function hash(value) {
    let state = 2166136261;
    for (const char of String(value)) {
      state ^= char.charCodeAt(0);
      state = Math.imul(state, 16777619);
    }
    return state >>> 0;
  }

  function unit(seed) {
    return hash(seed) / 4294967295;
  }

  function inferredMass(star, seed) {
    const text = String(star || '').toLowerCase();
    let base = /brown dwarf/.test(text) ? 0.06
      : /red dwarf|m\d/.test(text) ? 0.22
      : /white dwarf/.test(text) ? 0.72
      : /giant|supergiant/.test(text) ? 3.4
      : /binary|triple/.test(text) ? 1.5
      : 0.95;
    return Math.max(0.03, base * (0.72 + unit(`${seed}:mass`) * 0.66));
  }

  function proceduralPosition(seed, index) {
    if (index === 0) return {x:0, y:0, z:0};
    const u = unit(`${seed}:radius`);
    const v = unit(`${seed}:azimuth`);
    const w = unit(`${seed}:elevation`);
    const radiusLy = 2.5 + 27.5 * Math.pow(u, 0.72);
    const azimuth = v * Math.PI * 2;
    const zUnit = w * 1.7 - 0.85;
    const planar = Math.sqrt(Math.max(0, 1 - zUnit * zUnit));
    return {
      x:radiusLy * planar * Math.cos(azimuth) * AU_PER_LY,
      y:radiusLy * planar * Math.sin(azimuth) * AU_PER_LY,
      z:radiusLy * zUnit * AU_PER_LY
    };
  }

  function distanceLy(position) {
    return Math.hypot(position.x, position.y, position.z) / AU_PER_LY;
  }

  function readCards() {
    return [...grid.querySelectorAll('.exo-cluster-card')].map((card, index) => {
      const seed = card.querySelector('.exo-cluster-seed')?.textContent.trim() || `cluster-system-${index + 1}`;
      const name = card.querySelector('h3')?.textContent.trim() || `System ${index + 1}`;
      const star = card.querySelector('.exo-cluster-primary')?.textContent.trim() || 'Unclassified primary';
      const published = card.dataset.realNeighborhood === 'true';
      const record = published ? authority?.getSystem(seed) : null;
      const positionAU = record?.astrometry && authority?.equatorialPosition
        ? authority.equatorialPosition(record.astrometry)
        : proceduralPosition(seed, index);
      const stellarMassSolar = Number(record?.stellarMassSolar ?? card.dataset.stellarMass) || inferredMass(star, seed);
      const orbitingMassSolar = Number(card.dataset.planetaryMass) || 0;
      return {
        index:index + 1,
        seed,
        name,
        star,
        publishedReference:published,
        authorityMode:published ? 'published-first' : 'procedural',
        positionAU,
        positionLy:{x:positionAU.x / AU_PER_LY, y:positionAU.y / AU_PER_LY, z:positionAU.z / AU_PER_LY},
        distanceLy:distanceLy(positionAU),
        totalMassSolar:Number(record ? stellarMassSolar + (Number(record.confirmedOrbitingMassEarth) || 0) / 332946.0487 : stellarMassSolar + orbitingMassSolar),
        stellarMassSolar,
        positionConfidencePercent:published ? 98 : 76,
        positionBasis:published ? `${record?.astrometry?.frame || 'published astrometric frame'} coordinates` : 'deterministic fictional cluster coordinate derived from the cluster-system seed'
      };
    });
  }

  function clone(value) {
    return value == null ? value : structuredClone(value);
  }

  function refresh() {
    refreshQueued = false;
    systems = readCards();
    document.dispatchEvent(new CustomEvent('blacklight:exo-cluster-spatial-updated', {
      detail:{systems:clone(systems), version:1}
    }));
  }

  function queueRefresh() {
    if (refreshQueued) return;
    refreshQueued = true;
    queueMicrotask(refresh);
  }

  new MutationObserver(queueRefresh).observe(grid, {childList:true, subtree:true, characterData:true});

  globalThis.BlacklightExoClusterSpatial = Object.freeze({
    version:1,
    AU_PER_LY,
    getSystems:() => clone(systems),
    getSystem:identifier => clone(systems.find(item => item.seed === identifier || item.name === identifier) || null),
    refresh
  });

  queueRefresh();
})();
