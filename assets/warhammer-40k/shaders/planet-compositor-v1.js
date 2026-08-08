(() => {
  'use strict';

  const imageCache = new Map();
  const clamp = (value, min = 0, max = 1) => Math.max(min, Math.min(max, value));
  const mix = (a, b, t) => a + (b - a) * clamp(t);
  const smoothstep = (edge0, edge1, value) => {
    if (edge0 === edge1) return value < edge0 ? 0 : 1;
    const t = clamp((value - edge0) / (edge1 - edge0));
    return t * t * (3 - 2 * t);
  };
  const ASSET_ROOT = 'assets/warhammer-40k/planet-textures/';

  const MORPHOLOGY = Object.freeze({
    desert: 'dunes', savanna: 'dunes', sulfur: 'dunes', chthonic: 'rift',
    volcanic: 'rift', mining: 'rift', death: 'rift', battlefield: 'rift', ash: 'rift',
    barren: 'cratered', dead: 'cratered', crone: 'cratered', rogue: 'cratered',
    ice: 'glacial', alpine: 'glacial', tundra: 'glacial',
    ocean: 'archipelago', archipelago: 'archipelago',
    hive: 'megacity', urban: 'megacity', forge: 'megacity', administratum: 'megacity', armoury: 'megacity', naval: 'megacity',
    agri: 'cultivated', civilized: 'cultivated', paradise: 'cultivated', feudal: 'cultivated',
    jungle: 'biosphere', forest: 'biosphere', swamp: 'biosphere', maiden: 'biosphere', exodite: 'biosphere', feral: 'biosphere'
  });

  function morphologyFor(profile) {
    if (profile.surfaceMode === 'bands') return 'bands';
    return MORPHOLOGY[String(profile.template || '').toLowerCase()] || 'continental';
  }

  function loadImage(path) {
    const resolved = new URL(path, document.baseURI).href;
    if (imageCache.has(resolved)) return imageCache.get(resolved);
    const promise = new Promise((resolve, reject) => {
      const image = new Image();
      image.decoding = 'async';
      image.addEventListener('load', () => resolve(image), { once: true });
      image.addEventListener('error', () => reject(new Error(`Planetary surface asset could not be loaded: ${path}`)), { once: true });
      image.src = resolved;
    });
    imageCache.set(resolved, promise);
    promise.catch(() => imageCache.delete(resolved));
    return promise;
  }

  function imageDataFromSource(image, width, height) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d', { alpha: false, willReadFrequently: true });
    context.drawImage(image, 0, 0, width, height);
    return context.getImageData(0, 0, width, height);
  }

  function tintPixel(r, g, b, profile) {
    const brightness = profile.tintBrightness || 1;
    const saturation = profile.tintSaturation || 1;
    const contrast = profile.tintContrast || 1;
    const hue = profile.tintHue || 0;
    const grey = (r + g + b) / 3;
    let rr = (grey + (r - grey) * saturation) * brightness;
    let gg = (grey + (g - grey) * saturation) * brightness;
    let bb = (grey + (b - grey) * saturation) * brightness;
    rr = (rr - 127.5) * contrast + 127.5;
    gg = (gg - 127.5) * contrast + 127.5;
    bb = (bb - 127.5) * contrast + 127.5;
    if (hue !== 0) {
      const angle = hue * Math.PI * 2;
      const cosA = Math.cos(angle), sinA = Math.sin(angle);
      const nr = (0.213 + cosA * 0.787 - sinA * 0.213) * rr + (0.715 - cosA * 0.715 - sinA * 0.715) * gg + (0.072 - cosA * 0.072 + sinA * 0.928) * bb;
      const ng = (0.213 - cosA * 0.213 + sinA * 0.143) * rr + (0.715 + cosA * 0.285 + sinA * 0.140) * gg + (0.072 - cosA * 0.072 - sinA * 0.283) * bb;
      const nb = (0.213 - cosA * 0.213 - sinA * 0.787) * rr + (0.715 - cosA * 0.715 + sinA * 0.715) * gg + (0.072 + cosA * 0.928 + sinA * 0.072) * bb;
      rr = nr; gg = ng; bb = nb;
    }
    return [clamp(rr, 0, 255), clamp(gg, 0, 255), clamp(bb, 0, 255)];
  }

  function canvasTexture(THREE, canvas, srgb = true) {
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.anisotropy = 4;
    if (srgb && 'sRGBEncoding' in THREE) texture.encoding = THREE.sRGBEncoding;
    texture.needsUpdate = true;
    return texture;
  }

  function blendChannel(value, target, weight) { return mix(value, target, clamp(weight)); }
  function blendBiome(r, g, b, target, weight) {
    return [blendChannel(r, target[0], weight), blendChannel(g, target[1], weight), blendChannel(b, target[2], weight)];
  }
  function wrap01(value) { const wrapped = value % 1; return wrapped < 0 ? wrapped + 1 : wrapped; }
  function wrappedDelta(value, center) {
    let delta = wrap01(value) - wrap01(center);
    if (delta > 0.5) delta -= 1;
    if (delta < -0.5) delta += 1;
    return delta;
  }
  function seedUnit(seed, salt) {
    let value = (seed ^ salt) >>> 0;
    value ^= value >>> 16;
    value = Math.imul(value, 0x7feb352d);
    value ^= value >>> 15;
    value = Math.imul(value, 0x846ca68b);
    value ^= value >>> 16;
    return (value >>> 0) / 4294967296;
  }

  function imageOffset(imageData, width, height, u, v) {
    const x = Math.min(width - 1, Math.max(0, Math.floor(wrap01(u) * width)));
    const y = Math.min(height - 1, Math.max(0, Math.floor(clamp(v) * height)));
    return (y * width + x) * 4;
  }

  function rotatedSpherePoint(point, rotation) {
    const cosine = Math.cos(rotation || 0), sine = Math.sin(rotation || 0);
    return { x: point.x * cosine - point.z * sine, y: point.y, z: point.x * sine + point.z * cosine };
  }

  function triplanarPixel(imageData, width, height, point, profile, scaleMultiplier = 1, phase = 0) {
    const rotated = rotatedSpherePoint(point, profile.uvRotation || 0);
    const scale = clamp(profile.uvScale || 1, 0.35, 5.5) * scaleMultiplier;
    const offsetX = profile.uvOffset?.[0] || 0, offsetY = profile.uvOffset?.[1] || 0;
    const power = 4;
    let wx = Math.pow(Math.abs(rotated.x), power), wy = Math.pow(Math.abs(rotated.y), power), wz = Math.pow(Math.abs(rotated.z), power);
    const total = Math.max(1e-9, wx + wy + wz); wx /= total; wy /= total; wz /= total;
    const projections = [
      [0.5 + rotated.z * scale * 0.5 + offsetX + phase, 0.5 + rotated.y * scale * 0.5 + offsetY, wx],
      [0.5 + rotated.x * scale * 0.5 + offsetX + phase * 0.37, 0.5 + rotated.z * scale * 0.5 + offsetY + 0.31, wy],
      [0.5 + rotated.x * scale * 0.5 + offsetX + phase * 0.71, 0.5 + rotated.y * scale * 0.5 + offsetY + 0.63, wz]
    ];
    let r = 0, g = 0, b = 0;
    for (const [u, v, weight] of projections) {
      const offset = imageOffset(imageData, width, height, u, v);
      r += imageData.data[offset] * weight;
      g += imageData.data[offset + 1] * weight;
      b += imageData.data[offset + 2] * weight;
    }
    return [r, g, b];
  }

  function hue2rgb(p, q, t) {
    let value = t;
    if (value < 0) value += 1;
    if (value > 1) value -= 1;
    if (value < 1 / 6) return p + (q - p) * 6 * value;
    if (value < 1 / 2) return q;
    if (value < 2 / 3) return p + (q - p) * (2 / 3 - value) * 6;
    return p;
  }

  function hslToRgb(h, s, l) {
    const hue = wrap01(h), saturation = clamp(s), lightness = clamp(l);
    if (saturation === 0) return [lightness * 255, lightness * 255, lightness * 255];
    const q = lightness < 0.5 ? lightness * (1 + saturation) : lightness + saturation - lightness * saturation;
    const p = 2 * lightness - q;
    return [hue2rgb(p, q, hue + 1 / 3) * 255, hue2rgb(p, q, hue) * 255, hue2rgb(p, q, hue - 1 / 3) * 255];
  }

  function craterMask(point, profile, count = 7) {
    let mask = 0;
    for (let index = 0; index < count; index += 1) {
      const u = seedUnit(profile.seed, 0x9e3779b1 + index * 0x45d9f3b);
      const v = seedUnit(profile.seed, 0x85ebca77 + index * 0x27d4eb2d);
      const longitude = u * Math.PI * 2;
      const latitude = (v - 0.5) * Math.PI;
      const center = { x: Math.cos(latitude) * Math.cos(longitude), y: Math.sin(latitude), z: Math.cos(latitude) * Math.sin(longitude) };
      const dot = clamp(point.x * center.x + point.y * center.y + point.z * center.z, -1, 1);
      const angle = Math.acos(dot);
      const radius = 0.045 + seedUnit(profile.seed, 0xc2b2ae3d + index * 0x165667b1) * 0.11;
      const normalized = angle / radius;
      const rim = Math.exp(-Math.pow((normalized - 1) * 4.8, 2));
      const basin = Math.exp(-Math.pow(normalized * 1.8, 2));
      mask += rim * 0.82 - basin * 0.52;
    }
    return clamp(mask * 0.72 + 0.34, 0, 1);
  }

  function morphologySample(profileEngine, profile, sample, point, u, v, morphology) {
    const seed = profile.seed >>> 0;
    const broad = profileEngine.sphereFbm(u, v, seed ^ 0x4cf5ad43, 2.1, 4);
    const mid = profileEngine.sphereFbm(u, v, seed ^ 0x165667b1, 7.4, 4);
    const fine = profileEngine.sphereFbm(u, v, seed ^ 0xd3a2646c, 18.8, 3);
    const ridgeNoise = 1 - Math.abs(mid * 2 - 1);
    let heightDelta = 0, colorMask = 0, emissiveBoost = 0;

    if (morphology === 'dunes') {
      const warp = (broad - 0.5) * 2.8;
      const dune = 0.5 + 0.5 * Math.sin((point.x * 12.7 + point.z * 9.1 + point.y * 4.2 + warp) * Math.PI);
      colorMask = sample.land * smoothstep(0.38, 0.92, dune) * (0.45 + fine * 0.55);
      heightDelta = (dune - 0.5) * 0.16 * sample.land;
    } else if (morphology === 'rift') {
      const rift = 1 - smoothstep(0.055, 0.24, Math.abs(mid - 0.5));
      const fault = smoothstep(0.55, 0.88, ridgeNoise) * (0.35 + broad * 0.65);
      colorMask = sample.land * clamp(rift * 0.78 + fault * 0.38);
      heightDelta = sample.land * (fault * 0.24 - rift * 0.18);
      emissiveBoost = sample.land * rift * smoothstep(0.48, 0.86, profile.temperature || 0) * 0.78;
    } else if (morphology === 'cratered') {
      const crater = craterMask(point, profile, 6 + Math.floor(seedUnit(seed, 0x510e527f) * 5));
      colorMask = sample.land * crater;
      heightDelta = sample.land * ((crater - 0.34) * 0.27 + (fine - 0.5) * 0.05);
    } else if (morphology === 'glacial') {
      const fissure = 1 - smoothstep(0.025, 0.12, Math.abs(fine - 0.5));
      colorMask = sample.land * clamp(fissure * 0.72 + smoothstep(0.60, 0.88, broad) * 0.28);
      heightDelta = sample.land * (fissure * 0.12 + (broad - 0.5) * 0.08);
    } else if (morphology === 'archipelago') {
      const shelf = smoothstep(0.31, 0.64, broad) * (1 - smoothstep(0.72, 0.91, mid));
      colorMask = clamp(sample.coast * 0.68 + sample.ocean * shelf * 0.46);
      heightDelta = sample.land * (mid - 0.5) * 0.10 - sample.ocean * shelf * 0.035;
    } else if (morphology === 'megacity') {
      const gridA = Math.abs(Math.sin((point.x * 23 + point.z * 11 + broad * 3.2) * Math.PI));
      const gridB = Math.abs(Math.sin((point.z * 19 - point.y * 13 + mid * 2.7) * Math.PI));
      const grid = smoothstep(0.78, 0.98, Math.max(gridA, gridB));
      colorMask = sample.land * grid * clamp((profile.civilization || 0) * 0.72 + (profile.industrialization || 0) * 0.48);
      heightDelta = colorMask * (0.09 + fine * 0.08);
      emissiveBoost = colorMask * clamp(profile.emissiveDensity || 0) * 0.68;
    } else if (morphology === 'cultivated') {
      const parcels = 0.5 + 0.5 * Math.sin((point.x * 18.5 + point.z * 15.5 + broad * 2.4) * Math.PI);
      colorMask = sample.land * smoothstep(0.42, 0.86, parcels) * (1 - sample.mountain) * clamp(profile.moisture || 0);
      heightDelta = (parcels - 0.5) * 0.035 * sample.land;
    } else if (morphology === 'biosphere') {
      colorMask = sample.land * smoothstep(0.38, 0.80, broad * 0.55 + mid * 0.45) * (1 - sample.ice) * (1 - sample.mountain * 0.42);
      heightDelta = sample.land * (mid - 0.5) * 0.08;
    } else {
      colorMask = sample.land * smoothstep(0.54, 0.82, broad) * 0.32;
      heightDelta = sample.land * (mid - 0.5) * 0.045;
    }

    return { broad, mid, fine, colorMask: clamp(colorMask), heightDelta, emissiveBoost: clamp(emissiveBoost) };
  }

  function gasBandSample(profileEngine, profile, u, v) {
    const latitude = v * 2 - 1;
    const broad = profileEngine.sphereFbm(u, v, profile.seed ^ 0x7f4a7c15, 2.8, 4);
    const shear = profileEngine.sphereFbm(u, v, profile.seed ^ 0x243f6a88, 5.1, 4);
    const storm = profileEngine.sphereFbm(u, v, profile.seed ^ 0x4cf5ad43, 8.6, 4);
    const fine = profileEngine.sphereFbm(u, v, profile.seed ^ 0x165667b1, 15.2, 3);
    const bandFrequency = 8 + profile.bandStrength * 18;
    const warpedLatitude = latitude + (broad - 0.5) * (0.04 + profile.stormStrength * 0.07) + (shear - 0.5) * 0.018;
    const phaseShear = (shear - 0.5) * (2.1 + profile.bandStrength * 1.8);
    const band = 0.5 + 0.5 * Math.sin(warpedLatitude * Math.PI * bandFrequency + phaseShear);
    const fineBand = 0.5 + 0.5 * Math.sin(warpedLatitude * Math.PI * bandFrequency * 2.45 + fine * 3.7 + phaseShear * 1.6);

    const stormU = seedUnit(profile.seed, 0x6a09e667);
    const stormV = 0.34 + seedUnit(profile.seed, 0xbb67ae85) * 0.32;
    const du = wrappedDelta(u, stormU) / (0.055 + profile.stormStrength * 0.06);
    const dv = (v - stormV) / (0.026 + profile.stormStrength * 0.035);
    const oval = Math.exp(-(du * du + dv * dv));
    const secondaryU = wrap01(stormU + 0.37);
    const du2 = wrappedDelta(u, secondaryU) / 0.045;
    const dv2 = (v - (1 - stormV)) / 0.024;
    const secondary = Math.exp(-(du2 * du2 + dv2 * dv2)) * profile.stormStrength * 0.34;
    const stormCell = clamp((smoothstep(0.66, 0.90, storm) * 0.55 + oval * 0.92 + secondary) * profile.stormStrength * Math.pow(1 - Math.abs(latitude), 0.34));

    const hue = profile.gasHue + (band - 0.5) * (0.05 + profile.bandStrength * 0.03) + (storm - 0.5) * 0.026 + oval * 0.018;
    const saturation = clamp(profile.gasSaturation * (0.76 + fineBand * 0.30) - stormCell * 0.10);
    const lightness = clamp(profile.gasBrightness * (0.70 + band * 0.36) + (fineBand - 0.5) * 0.08 + stormCell * 0.15);
    return { rgb: hslToRgb(hue, saturation, lightness), band, fineBand, stormCell, storm, oval };
  }

  async function compose(THREE, profile, options = {}) {
    const profileEngine = window.CafarronPlanetProfileV1;
    if (!profileEngine?.sample || !profileEngine?.spherePoint || !profileEngine?.sphereFbm) throw new Error('Planet profile engine has not answered the Cartographica compositor.');
    const width = Math.max(64, Math.min(512, options.width || 256));
    const height = Math.max(32, Math.min(256, options.height || 128));
    const morphology = morphologyFor(profile);
    const atmosphericBands = morphology === 'bands';
    let geology = null, grass = null;
    if (!atmosphericBands) {
      const geologyPath = profile.geologyPath || `${ASSET_ROOT}base/hotel.png`;
      const [geologyImage, grassImage] = await Promise.all([
        loadImage(geologyPath),
        loadImage(`${ASSET_ROOT}base/alpha.png`).catch(() => null)
      ]);
      geology = imageDataFromSource(geologyImage, width, height);
      grass = grassImage ? imageDataFromSource(grassImage, width, height) : null;
    }

    const surfaceCanvas = document.createElement('canvas');
    const bumpCanvas = document.createElement('canvas');
    const emissiveCanvas = document.createElement('canvas');
    const cloudCanvas = document.createElement('canvas');
    surfaceCanvas.width = bumpCanvas.width = emissiveCanvas.width = cloudCanvas.width = width;
    surfaceCanvas.height = bumpCanvas.height = emissiveCanvas.height = cloudCanvas.height = height;
    const surfaceContext = surfaceCanvas.getContext('2d', { alpha: false });
    const bumpContext = bumpCanvas.getContext('2d', { alpha: false });
    const emissiveContext = emissiveCanvas.getContext('2d', { alpha: false });
    const cloudContext = cloudCanvas.getContext('2d', { alpha: false });
    const surface = surfaceContext.createImageData(width, height);
    const bump = bumpContext.createImageData(width, height);
    const emissive = emissiveContext.createImageData(width, height);
    const cloud = cloudContext.createImageData(width, height);

    for (let y = 0; y < height; y += 1) {
      const v = height > 1 ? y / (height - 1) : 0;
      for (let x = 0; x < width; x += 1) {
        const u = width > 1 ? x / (width - 1) : 0;
        const offset = (y * width + x) * 4;
        const point = profileEngine.spherePoint(u, v);
        let sample = null, r = 0, g = 0, b = 0, gas = null, morphologyData = null;
        let scarMask = 0, ruinMask = 0, anomalyMask = 0, biosphereMask = 0;
        const accentRgb = hslToRgb(profile.accentHue || 0, 0.58, 0.54);

        if (atmosphericBands) {
          gas = gasBandSample(profileEngine, profile, u, v);
          [r, g, b] = gas.rgb;
        } else {
          sample = profileEngine.sample(profile, u, v);
          morphologyData = morphologySample(profileEngine, profile, sample, point, u, v, morphology);
          const base = triplanarPixel(geology, width, height, point, profile);
          const tinted = tintPixel(base[0], base[1], base[2], profile);
          r = tinted[0]; g = tinted[1]; b = tinted[2];

          const deep = clamp((profile.seaLevel - sample.elevation + 0.10) * 4.0);
          const oceanStrength = sample.ocean * (1 - sample.coast * 0.28);
          r = mix(r, mix(30, 12, deep), oceanStrength);
          g = mix(g, mix(82, 40, deep), oceanStrength);
          b = mix(b, mix(112, 76, deep), oceanStrength);

          if (grass) {
            const vegetation = sample.grassland * sample.land;
            const vegetationPixel = triplanarPixel(grass, width, height, point, profile, 0.72, 0.17);
            r = mix(r, vegetationPixel[0], vegetation * 0.58);
            g = mix(g, vegetationPixel[1], vegetation * 0.68);
            b = mix(b, vegetationPixel[2], vegetation * 0.54);
          }

          const biomeWeights = [
            [[176, 135, 79], sample.desert * sample.land * 0.52],
            [[92, 111, 55], sample.grassland * sample.land * 0.42],
            [[35, 73, 38], sample.jungle * sample.land * 0.58],
            [[102, 99, 91], sample.mountain * sample.land * 0.54],
            [[210, 235, 244], sample.ice * sample.land * 0.72]
          ];
          for (const [target, weight] of biomeWeights) [r, g, b] = blendBiome(r, g, b, target, weight);
          const coastMix = sample.coast * sample.land * 0.42;
          r = mix(r, 194, coastMix); g = mix(g, 167, coastMix); b = mix(b, 118, coastMix);

          const morph = morphologyData.colorMask;
          if (morphology === 'dunes') [r, g, b] = blendBiome(r, g, b, [205, 158, 91], morph * 0.28);
          if (morphology === 'rift') [r, g, b] = blendBiome(r, g, b, [61, 44, 38], morph * 0.42);
          if (morphology === 'cratered') [r, g, b] = blendBiome(r, g, b, [94, 91, 84], morph * 0.32);
          if (morphology === 'glacial') [r, g, b] = blendBiome(r, g, b, [222, 240, 246], morph * 0.48);
          if (morphology === 'archipelago') [r, g, b] = blendBiome(r, g, b, [56, 133, 147], morph * 0.28);
          if (morphology === 'megacity') [r, g, b] = blendBiome(r, g, b, [112, 116, 114], morph * 0.52);
          if (morphology === 'cultivated') [r, g, b] = blendBiome(r, g, b, [116, 132, 64], morph * 0.28);
          if (morphology === 'biosphere') [r, g, b] = blendBiome(r, g, b, accentRgb, morph * 0.24);

          const scarring = clamp(profile.surfaceScarring || 0);
          const ruins = clamp(profile.ruinDensity || 0);
          const anomaly = clamp(profile.anomalyDensity || 0);
          const biosphere = clamp(profile.biosphereStrength || 0);
          if (scarring > 0) {
            const scarField = profileEngine.sphereFbm(u, v, profile.seed ^ 0x6a09e667, 12.6, 4);
            scarMask = sample.land * scarring * smoothstep(0.54, 0.84, scarField) * (0.34 + sample.ridge * 0.66);
            [r, g, b] = blendBiome(r, g, b, [54, 46, 41], scarMask * 0.72);
          }
          if (ruins > 0) {
            const ruinField = profileEngine.sphereFbm(u, v, profile.seed ^ 0xbb67ae85, 24.8, 3);
            ruinMask = sample.land * ruins * smoothstep(0.66, 0.86, ruinField) * (1 - sample.mountain * 0.55);
            [r, g, b] = blendBiome(r, g, b, [91, 96, 94], ruinMask * 0.58);
          }
          if (biosphere > 0) {
            const biosphereField = profileEngine.sphereFbm(u, v, profile.seed ^ 0x3c6ef372, 6.4, 4);
            biosphereMask = sample.land * biosphere * smoothstep(0.40, 0.72, biosphereField) * (1 - sample.ice) * (1 - sample.mountain * 0.48);
            [r, g, b] = blendBiome(r, g, b, accentRgb, biosphereMask * 0.26);
          }
          if (anomaly > 0) {
            const anomalyField = profileEngine.sphereFbm(u, v, profile.seed ^ 0xa54ff53a, 9.8, 4);
            anomalyMask = anomaly * smoothstep(0.58, 0.84, anomalyField) * (0.24 + sample.land * 0.76) * (0.40 + sample.ridge * 0.60);
            [r, g, b] = blendBiome(r, g, b, accentRgb, anomalyMask * 0.46);
          }
        }

        surface.data[offset] = clamp(r, 0, 255);
        surface.data[offset + 1] = clamp(g, 0, 255);
        surface.data[offset + 2] = clamp(b, 0, 255);
        surface.data[offset + 3] = 255;

        const heightValue = atmosphericBands
          ? clamp(112 + gas.band * 20 + gas.fineBand * 10 + gas.stormCell * 18 + gas.oval * 9, 0, 255)
          : clamp(72 + (sample.elevation + morphologyData.heightDelta) * 128 + sample.mountain * 52 - sample.ocean * 38 + scarMask * 22 + ruinMask * 14, 0, 255);
        bump.data[offset] = bump.data[offset + 1] = bump.data[offset + 2] = heightValue;
        bump.data[offset + 3] = 255;

        const civilization = clamp(profile.civilization || 0);
        const industrialization = clamp(profile.industrialization || 0);
        const emissiveDensity = clamp(profile.emissiveDensity || 0);
        let glow = 0, anomalyGlow = 0;
        if (!atmosphericBands) {
          const urbanNoise = profileEngine.sphereFbm(u, v, profile.seed ^ 0x27d4eb2d, 19.5, 3);
          const cityThreshold = 0.76 - civilization * 0.24;
          const urbanMask = smoothstep(cityThreshold, cityThreshold + 0.14, urbanNoise);
          const city = sample.land * civilization * emissiveDensity * urbanMask * (1 - sample.mountain);
          const thermal = sample.land * industrialization * emissiveDensity * smoothstep(0.30, 0.68, sample.ridge) * smoothstep(0.34, 0.78, profile.temperature) * 0.82;
          anomalyGlow = anomalyMask * clamp(profile.anomalyDensity || 0) * 0.92;
          glow = clamp(city + thermal + anomalyGlow + morphologyData.emissiveBoost);
        }
        const anomalyShare = glow > 1e-6 ? clamp(anomalyGlow / glow) : 0;
        const emissiveR = mix(255, accentRgb[0], anomalyShare * 0.92);
        const emissiveG = mix(mix(188, 92, industrialization), accentRgb[1], anomalyShare * 0.92);
        const emissiveB = mix(mix(92, 28, industrialization), accentRgb[2], anomalyShare * 0.92);
        emissive.data[offset] = Math.min(255, emissiveR * glow);
        emissive.data[offset + 1] = Math.min(255, emissiveG * glow);
        emissive.data[offset + 2] = Math.min(255, emissiveB * glow);
        emissive.data[offset + 3] = 255;

        const coverage = clamp(profile.cloudCoverage || 0);
        const atmosphere = clamp(profile.atmosphere || 0);
        let cloudMask;
        if (atmosphericBands) {
          const highCloud = profileEngine.sphereFbm(u, v, profile.seed ^ 0xd3a2646c, 10.8, 4);
          const threshold = mix(0.70, 0.46, coverage);
          cloudMask = clamp((smoothstep(threshold - 0.12, threshold + 0.12, highCloud) * 0.40 + gas.band * 0.20 + gas.stormCell * 0.62 + gas.oval * 0.24) * atmosphere);
        } else {
          const cloudNoise = profileEngine.sphereFbm(u, v, profile.seed ^ 0x165667b1, 5.2 + profile.moisture * 2.1, 5);
          const cloudWarp = profileEngine.sphereFbm(u, v, profile.seed ^ 0xd3a2646c, 10.7, 3);
          const cloudField = cloudNoise * 0.74 + cloudWarp * 0.26;
          const cloudThreshold = mix(0.80, 0.40, coverage);
          const cloudSoftness = 0.10 + coverage * 0.10;
          const latitude = Math.abs(v * 2 - 1);
          const polarCloud = smoothstep(0.68, 1, latitude) * clamp(profile.moisture || 0) * 0.16;
          const haze = clamp(profile.hazeDensity || 0);
          const hazeField = haze > 0 ? profileEngine.sphereFbm(u, v, profile.seed ^ 0x510e527f, 3.7, 3) : 0;
          const hazeMask = haze * smoothstep(0.30, 0.74, hazeField) * 0.42;
          const terrainLift = morphology === 'glacial' ? sample.mountain * 0.08 : morphology === 'biosphere' ? sample.jungle * 0.10 : 0;
          cloudMask = clamp((smoothstep(cloudThreshold - cloudSoftness, cloudThreshold + cloudSoftness, cloudField) + polarCloud + hazeMask + terrainLift) * atmosphere);
        }
        const cloudValue = Math.round(cloudMask * 255);
        cloud.data[offset] = cloud.data[offset + 1] = cloud.data[offset + 2] = cloudValue;
        cloud.data[offset + 3] = 255;
      }
    }

    surfaceContext.putImageData(surface, 0, 0);
    bumpContext.putImageData(bump, 0, 0);
    emissiveContext.putImageData(emissive, 0, 0);
    cloudContext.putImageData(cloud, 0, 0);
    return Object.freeze({
      map: canvasTexture(THREE, surfaceCanvas, true),
      bumpMap: canvasTexture(THREE, bumpCanvas, false),
      emissiveMap: canvasTexture(THREE, emissiveCanvas, false),
      cloudMap: canvasTexture(THREE, cloudCanvas, false),
      morphology,
      profile
    });
  }

  function materialFromTextures(THREE, textures, fallbackColor = 0x8c8c82) {
    const profile = textures.profile;
    const industrialization = clamp(profile.industrialization || 0);
    const temperature = clamp(profile.temperature || 0);
    const emissiveDensity = clamp(profile.emissiveDensity || 0);
    const atmosphericBands = profile.surfaceMode === 'bands';
    const morphology = textures.morphology || morphologyFor(profile);
    const roughnessAdjustment = morphology === 'glacial' ? -0.12 : morphology === 'megacity' ? -0.16 : morphology === 'dunes' ? 0.04 : 0;
    return new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: textures.map,
      bumpMap: textures.bumpMap,
      bumpScale: atmosphericBands ? 0.004 + profile.bandStrength * 0.004 : mix(0.018, 0.038, clamp(profile.ridgeStrength || 0.4)),
      roughness: atmosphericBands ? 0.86 : clamp(0.92 - industrialization * 0.28 - (1 - temperature) * 0.16 + roughnessAdjustment, 0.34, 0.96),
      metalness: atmosphericBands ? 0 : clamp(0.02 + industrialization * 0.38 + (morphology === 'megacity' ? 0.08 : 0), 0.02, 0.50),
      emissive: 0xffffff,
      emissiveMap: textures.emissiveMap,
      emissiveIntensity: atmosphericBands ? 0 : 0.22 + emissiveDensity * 1.02,
      userData: { fallbackColor, morphology }
    });
  }

  function atmosphereColor(THREE, profile) {
    if (profile.surfaceMode === 'bands') {
      const rgb = hslToRgb(profile.gasHue, profile.gasSaturation * 0.72, clamp(profile.gasBrightness + 0.08));
      return new THREE.Color(rgb[0] / 255, rgb[1] / 255, rgb[2] / 255);
    }
    const temperature = clamp(profile.temperature || 0), moisture = clamp(profile.moisture || 0), industrialization = clamp(profile.industrialization || 0);
    const haze = clamp(profile.hazeDensity || 0), anomaly = clamp(profile.anomalyDensity || 0);
    const accent = hslToRgb(profile.accentHue || 0, 0.52, 0.54).map(value => value / 255);
    const cold = [0.55, 0.80, 0.96], temperate = [0.38, 0.66, 0.88], warm = [0.86, 0.62, 0.38], industrial = [0.72, 0.42, 0.26];
    const temperateBlend = smoothstep(0.08, 0.52, temperature), warmBlend = smoothstep(0.42, 0.92, temperature);
    let target = cold.map((value, index) => mix(value, temperate[index], temperateBlend));
    target = target.map((value, index) => mix(value, warm[index], warmBlend));
    target = target.map((value, index) => mix(value, industrial[index], industrialization * 0.46));
    target = target.map((value, index) => mix(value, [0.72, 0.82, 0.90][index], moisture * 0.18));
    const accentWeight = clamp(haze * 0.16 + anomaly * 0.34);
    target = target.map((value, index) => mix(value, accent[index], accentWeight));
    return new THREE.Color(target[0], target[1], target[2]);
  }

  function layerMaterialsFromTextures(THREE, textures) {
    const profile = textures.profile;
    const atmosphere = clamp(profile.atmosphere || 0), coverage = clamp(profile.cloudCoverage || 0);
    const atmosphericBands = profile.surfaceMode === 'bands';
    return Object.freeze({
      cloudMaterial: new THREE.MeshStandardMaterial({
        color: atmosphericBands ? atmosphereColor(THREE, profile) : 0xf0eee5,
        alphaMap: textures.cloudMap,
        transparent: true,
        opacity: atmosphericBands ? atmosphere * (0.08 + coverage * 0.24) : atmosphere * (0.24 + coverage * 0.48),
        depthWrite: false,
        roughness: 1,
        metalness: 0
      }),
      atmosphereMaterial: new THREE.MeshBasicMaterial({
        color: atmosphereColor(THREE, profile),
        transparent: true,
        opacity: atmosphericBands ? atmosphere * 0.17 : atmosphere * 0.13,
        side: THREE.BackSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending
      })
    });
  }

  window.CafarronPlanetCompositorV1 = Object.freeze({ loadImage, compose, materialFromTextures, layerMaterialsFromTextures, morphologyFor, gasBandSample });
})();
