(() => {
  'use strict';

  const clamp = (value, min = 0, max = 1) => Math.max(min, Math.min(max, value));
  const lerp = (a, b, t) => a + (b - a) * t;
  const smoothstep = (edge0, edge1, x) => {
    const t = clamp((x - edge0) / Math.max(1e-9, edge1 - edge0));
    return t * t * (3 - 2 * t);
  };

  function hash(value) {
    let result = 2166136261;
    for (const character of String(value || '')) {
      result ^= character.charCodeAt(0);
      result = Math.imul(result, 16777619);
    }
    return result >>> 0;
  }

  function random(seed) {
    let state = seed >>> 0;
    return () => {
      state += 0x6d2b79f5;
      let t = state;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function fade(t) { return t * t * t * (t * (t * 6 - 15) + 10); }
  function grad(ix, iy, seed) {
    const angle = (hash(`${seed}:${ix}:${iy}`) / 4294967296) * Math.PI * 2;
    return [Math.cos(angle), Math.sin(angle)];
  }
  function perlin2(x, y, seed) {
    const x0 = Math.floor(x), y0 = Math.floor(y), x1 = x0 + 1, y1 = y0 + 1;
    const sx = fade(x - x0), sy = fade(y - y0);
    const dot = (ix, iy) => { const g = grad(ix, iy, seed); return g[0] * (x - ix) + g[1] * (y - iy); };
    const n0 = lerp(dot(x0, y0), dot(x1, y0), sx);
    const n1 = lerp(dot(x0, y1), dot(x1, y1), sx);
    return clamp(lerp(n0, n1, sy) * 0.70710678 + 0.5);
  }
  function fbm2(x, y, seed, octaves = 5) {
    let value = 0, amplitude = 0.5, total = 0, fx = x, fy = y;
    for (let octave = 0; octave < octaves; octave += 1) {
      value += perlin2(fx, fy, seed + octave * 1013) * amplitude;
      total += amplitude;
      const nx = fx * 1.61 - fy * 1.17 + 11.7;
      fy = fx * 1.17 + fy * 1.61 + 7.3;
      fx = nx;
      amplitude *= 0.5;
    }
    return value / Math.max(total, 1e-9);
  }

  const MATERIALS = Object.freeze({
    alpha: { path: 'assets/warhammer-40k/planet-textures/base/alpha.png', role: 'biome', material: 'temperate-grassland', tags: ['grassland','temperate','scrub','vegetation'] },
    beta: { path: 'assets/warhammer-40k/planet-textures/base/beta.png', role: 'geology', material: 'dark-rock-soil', tags: ['ash','rock','soil','death-world'] },
    charlie: { path: 'assets/warhammer-40k/planet-textures/base/charlie.png', role: 'geology', material: 'glacial-ice', tags: ['ice','glacial','frozen'] },
    delta: { path: 'assets/warhammer-40k/planet-textures/base/delta.png', role: 'geology', material: 'sandstone-desert', tags: ['desert','sand','arid'] },
    epsilon: { path: 'assets/warhammer-40k/planet-textures/base/epsilon.png', role: 'geology', material: 'weathered-sandstone', tags: ['desert','sandstone','arid'] },
    foxtrot: { path: 'assets/warhammer-40k/planet-textures/base/foxtrot.png', role: 'geology', material: 'dry-badlands', tags: ['badlands','dry','cracked','arid'] },
    golf: { path: 'assets/warhammer-40k/planet-textures/base/golf.png', role: 'geology', material: 'industrial-plating', tags: ['forge','industrial','manufactorum','metal'] },
    hotel: { path: 'assets/warhammer-40k/planet-textures/base/hotel.png', role: 'geology', material: 'weathered-grey-rock', tags: ['rock','mountain','highland'] },
    india: { path: 'assets/warhammer-40k/planet-textures/base/india.png', role: 'geology', material: 'dark-basalt', tags: ['basalt','volcanic','dead-world'] },
    juliet: { path: 'assets/warhammer-40k/planet-textures/base/juliet.png', role: 'geology', material: 'ochre-highlands', tags: ['highland','ochre','arid','rock'] },
    kilo: { path: 'assets/warhammer-40k/planet-textures/base/kilo.png', role: 'geology', material: 'oxidized-volcanic', tags: ['volcanic','lava','oxidized','igneous'] },
    lima: { path: 'assets/warhammer-40k/planet-textures/base/lima.png', role: 'geology', material: 'cratered-regolith', tags: ['regolith','airless','moon','barren','cratered'] }
  });

  const TEMPLATE_RANGES = Object.freeze({
    desert: { geologyTags: ['desert','arid','badlands'], seaLevel: [0.58,0.76], temperature: [0.68,0.94], moisture: [0.04,0.28], polarExtent: [0,0.08], cloudCoverage: [0.02,0.18], civilization: [0.04,0.32] },
    forge: { geologyTags: ['forge','industrial','basalt','volcanic'], seaLevel: [0.52,0.74], temperature: [0.46,0.82], moisture: [0.12,0.44], polarExtent: [0,0.10], cloudCoverage: [0.25,0.64], civilization: [0.82,1] },
    ice: { geologyTags: ['ice','glacial','rock'], seaLevel: [0.48,0.66], temperature: [0.02,0.24], moisture: [0.28,0.72], polarExtent: [0.48,0.88], cloudCoverage: [0.22,0.58], civilization: [0.02,0.28] },
    temperate: { geologyTags: ['rock','soil','highland'], seaLevel: [0.44,0.62], temperature: [0.42,0.68], moisture: [0.42,0.72], polarExtent: [0.08,0.22], cloudCoverage: [0.22,0.55], civilization: [0.14,0.68] }
  });

  function materialCandidates(tags) {
    const wanted = new Set(tags || []);
    const matches = Object.entries(MATERIALS).filter(([, entry]) => entry.role === 'geology' && entry.tags.some(tag => wanted.has(tag)));
    return matches.length ? matches : Object.entries(MATERIALS).filter(([, entry]) => entry.role === 'geology');
  }
  function between(range, roll) { return lerp(range[0], range[1], roll()); }
  function templateFromText(text) {
    const value = String(text || '').toLowerCase();
    if (/forge world|forge-world|mechanicus|manufactorum|industrial world|foundry world/.test(value)) return 'forge';
    if (/desert|arid|dune|sand world|dust world|wasteland/.test(value)) return 'desert';
    if (/ice world|ice-bound|icebound|glacial|frozen world|frost world|cryogenic|polar world|tundra/.test(value)) return 'ice';
    return 'temperate';
  }

  function createProfile(identity, text = '', templateOverride = '') {
    const seed = hash(`${identity}|${text}`);
    const roll = random(seed);
    const template = TEMPLATE_RANGES[templateOverride] ? templateOverride : templateFromText(text);
    const ranges = TEMPLATE_RANGES[template];
    const candidates = materialCandidates(ranges.geologyTags);
    const [geologyId, geology] = candidates[Math.floor(roll() * candidates.length) % candidates.length];
    return Object.freeze({
      seed,
      template,
      geologyId,
      geologyPath: geology.path,
      geologyMaterial: geology.material,
      tintHue: (roll() - 0.5) * (template === 'forge' ? 0.08 : 0.22),
      tintSaturation: lerp(0.78, 1.18, roll()),
      tintBrightness: lerp(0.78, 1.16, roll()),
      uvScale: lerp(1.4, 4.6, roll()),
      uvRotation: roll() * Math.PI * 2,
      uvOffset: [roll(), roll()],
      seaLevel: between(ranges.seaLevel, roll),
      coastlineSoftness: lerp(0.025, 0.07, roll()),
      continentScale: lerp(2.1, 4.4, roll()),
      temperature: between(ranges.temperature, roll),
      moisture: between(ranges.moisture, roll),
      polarExtent: between(ranges.polarExtent, roll),
      cloudCoverage: between(ranges.cloudCoverage, roll),
      civilization: between(ranges.civilization, roll),
      ridgeStrength: lerp(0.18, 0.72, roll()),
      mountainThreshold: lerp(0.64, 0.82, roll()),
      biomeWarp: lerp(0.7, 2.1, roll())
    });
  }

  function sample(profile, u, v) {
    const seed = profile.seed;
    const x = u * profile.continentScale + seed * 0.000013;
    const y = v * profile.continentScale * 0.66 + seed * 0.000021;
    const broad = fbm2(x, y, seed, 5);
    const detail = fbm2(x * 2.6 + 11, y * 2.6 + 11, seed ^ 0x9e3779b9, 4) * 0.22;
    const elevation = clamp(broad + detail);
    const land = smoothstep(profile.seaLevel - profile.coastlineSoftness, profile.seaLevel + profile.coastlineSoftness, elevation);
    const coast = 1 - smoothstep(0, profile.coastlineSoftness * 1.6, Math.abs(elevation - profile.seaLevel));
    const latitude = Math.abs(v * 2 - 1);
    const moistureNoise = fbm2(u * 5.3 + seed * 0.000031, v * 5.3 + seed * 0.000017, seed ^ 0x85ebca6b, 4);
    const moisture = clamp(profile.moisture * 0.62 + moistureNoise * 0.52 - latitude * 0.12);
    const temperature = clamp(profile.temperature * 1.18 - latitude * (0.78 + profile.polarExtent * 0.22) - Math.max(0, elevation - 0.64) * 0.34);
    const ridgeNoise = Math.abs(fbm2(u * 8.2, v * 8.2, seed ^ 0xc2b2ae35, 4) * 2 - 1);
    const ridge = clamp((1 - ridgeNoise) * profile.ridgeStrength * land);
    const mountain = smoothstep(profile.mountainThreshold, 1, clamp(elevation + ridge * 0.42));
    const ice = clamp(smoothstep(0.28, 0.05, temperature) * land + smoothstep(1 - profile.polarExtent, 1, latitude));
    const jungle = clamp(land * smoothstep(0.48, 0.76, moisture) * smoothstep(0.46, 0.72, temperature) * (1 - mountain) * (1 - ice));
    const grassland = clamp(land * smoothstep(0.24, 0.54, moisture) * smoothstep(0.26, 0.58, temperature) * (1 - jungle * 0.72) * (1 - mountain) * (1 - ice));
    const desert = clamp(land * (1 - smoothstep(0.18, 0.46, moisture)) * smoothstep(0.42, 0.68, temperature) * (1 - ice));
    const rock = clamp(land * (1 - grassland * 0.72 - jungle * 0.82 - desert * 0.54 - ice * 0.7));
    return Object.freeze({ elevation, land, ocean: 1 - land, coast, moisture, temperature, mountain, ridge, ice, jungle, grassland, desert, rock });
  }

  window.CafarronPlanetProfileV1 = Object.freeze({ MATERIALS, TEMPLATE_RANGES, hash, random, fade, perlin2, fbm2, createProfile, sample });
})();
