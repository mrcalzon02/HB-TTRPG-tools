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

  function sampleImage(image, width, height, profile) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d', { alpha: false, willReadFrequently: true });
    const scale = Math.max(0.35, Math.min(3.5, profile.uvScale || 1));
    const drawWidth = width * scale;
    const drawHeight = height * scale;
    context.save();
    context.translate(width * 0.5, height * 0.5);
    context.rotate(profile.uvRotation || 0);
    context.translate(-width * 0.5, -height * 0.5);
    const offsetX = -((profile.uvOffset?.[0] || 0) * drawWidth) % drawWidth;
    const offsetY = -((profile.uvOffset?.[1] || 0) * drawHeight) % drawHeight;
    for (let y = offsetY - drawHeight; y < height + drawHeight; y += drawHeight) {
      for (let x = offsetX - drawWidth; x < width + drawWidth; x += drawWidth) {
        context.drawImage(image, x, y, drawWidth, drawHeight);
      }
    }
    context.restore();
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
      rr = nr;
      gg = ng;
      bb = nb;
    }
    return [
      Math.max(0, Math.min(255, rr)),
      Math.max(0, Math.min(255, gg)),
      Math.max(0, Math.min(255, bb))
    ];
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

  function blendChannel(value, target, weight) {
    return mix(value, target, clamp(weight));
  }

  function blendBiome(r, g, b, target, weight) {
    return [
      blendChannel(r, target[0], weight),
      blendChannel(g, target[1], weight),
      blendChannel(b, target[2], weight)
    ];
  }

  async function compose(THREE, profile, options = {}) {
    const profileEngine = window.CafarronPlanetProfileV1;
    if (!profileEngine?.sample) throw new Error('Planet profile engine has not answered the Cartographica compositor.');
    const width = Math.max(64, Math.min(512, options.width || 256));
    const height = Math.max(32, Math.min(256, options.height || 128));
    const geologyPath = profile.geologyPath || `${ASSET_ROOT}base/hotel.png`;
    const [geologyImage, grassImage] = await Promise.all([
      loadImage(geologyPath),
      loadImage(`${ASSET_ROOT}base/alpha.png`).catch(() => null)
    ]);
    const geology = sampleImage(geologyImage, width, height, profile);
    const grass = grassImage ? sampleImage(grassImage, width, height, {
      ...profile,
      uvScale: (profile.uvScale || 1) * 0.72,
      uvRotation: (profile.uvRotation || 0) * -0.43
    }) : null;
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
      const v = (y + 0.5) / height;
      for (let x = 0; x < width; x += 1) {
        const u = (x + 0.5) / width;
        const offset = (y * width + x) * 4;
        const sample = profileEngine.sample(profile, u, v);
        const tinted = tintPixel(geology.data[offset], geology.data[offset + 1], geology.data[offset + 2], profile);
        let r = tinted[0], g = tinted[1], b = tinted[2];

        const deep = clamp((profile.seaLevel - sample.elevation + 0.10) * 4.0);
        const oceanStrength = sample.ocean * (1 - sample.coast * 0.28);
        r = mix(r, mix(30, 14, deep), oceanStrength);
        g = mix(g, mix(79, 43, deep), oceanStrength);
        b = mix(b, mix(105, 78, deep), oceanStrength);

        if (grass) {
          const vegetation = sample.grassland * sample.land;
          r = mix(r, grass.data[offset], vegetation * 0.58);
          g = mix(g, grass.data[offset + 1], vegetation * 0.68);
          b = mix(b, grass.data[offset + 2], vegetation * 0.54);
        }

        const biomeWeights = [
          [[176, 135, 79], sample.desert * sample.land * 0.52],
          [[92, 111, 55], sample.grassland * sample.land * 0.42],
          [[35, 73, 38], sample.jungle * sample.land * 0.58],
          [[102, 99, 91], sample.mountain * sample.land * 0.54],
          [[210, 235, 244], sample.ice * sample.land * 0.72]
        ];
        for (const [target, weight] of biomeWeights) {
          [r, g, b] = blendBiome(r, g, b, target, weight);
        }

        const coastMix = sample.coast * sample.land * 0.42;
        r = mix(r, 194, coastMix);
        g = mix(g, 167, coastMix);
        b = mix(b, 118, coastMix);

        surface.data[offset] = Math.max(0, Math.min(255, r));
        surface.data[offset + 1] = Math.max(0, Math.min(255, g));
        surface.data[offset + 2] = Math.max(0, Math.min(255, b));
        surface.data[offset + 3] = 255;

        const heightValue = Math.max(0, Math.min(255, 72 + sample.elevation * 128 + sample.mountain * 52 - sample.ocean * 38));
        bump.data[offset] = bump.data[offset + 1] = bump.data[offset + 2] = heightValue;
        bump.data[offset + 3] = 255;

        const civilization = clamp(profile.civilization || 0);
        const industrialization = clamp(profile.industrialization || 0);
        const emissiveDensity = clamp(profile.emissiveDensity || 0);
        const urbanNoise = profileEngine.fbm2(u * 22 + profile.seed * 0.00007, v * 18, profile.seed ^ 0x27d4eb2d, 3);
        const cityThreshold = 0.76 - civilization * 0.24;
        const urbanMask = smoothstep(cityThreshold, cityThreshold + 0.14, urbanNoise);
        const city = sample.land * civilization * emissiveDensity * urbanMask * (1 - sample.mountain);
        const thermal = sample.land * industrialization * emissiveDensity * smoothstep(0.30, 0.68, sample.ridge) * smoothstep(0.34, 0.78, profile.temperature) * 0.82;
        const glow = clamp(city + thermal);
        emissive.data[offset] = Math.min(255, 255 * glow);
        emissive.data[offset + 1] = Math.min(255, mix(188, 92, industrialization) * glow);
        emissive.data[offset + 2] = Math.min(255, mix(92, 28, industrialization) * glow);
        emissive.data[offset + 3] = 255;

        const coverage = clamp(profile.cloudCoverage || 0);
        const atmosphere = clamp(profile.atmosphere || 0);
        const cloudNoise = profileEngine.fbm2(u * (4.8 + profile.moisture * 2.4) + profile.seed * 0.000019, v * (4.1 + profile.moisture * 1.8), profile.seed ^ 0x165667b1, 5);
        const cloudWarp = profileEngine.fbm2(u * 11.7 + 7.1, v * 8.9 + profile.seed * 0.000011, profile.seed ^ 0xd3a2646c, 3);
        const cloudField = cloudNoise * 0.78 + cloudWarp * 0.22;
        const cloudThreshold = mix(0.80, 0.40, coverage);
        const cloudSoftness = 0.10 + coverage * 0.10;
        const latitude = Math.abs(v * 2 - 1);
        const polarCloud = smoothstep(0.68, 1, latitude) * clamp(profile.moisture || 0) * 0.16;
        const cloudMask = clamp((smoothstep(cloudThreshold - cloudSoftness, cloudThreshold + cloudSoftness, cloudField) + polarCloud) * atmosphere);
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
      profile
    });
  }

  function materialFromTextures(THREE, textures, fallbackColor = 0x8c8c82) {
    const profile = textures.profile;
    const industrialization = clamp(profile.industrialization || 0);
    const temperature = clamp(profile.temperature || 0);
    const emissiveDensity = clamp(profile.emissiveDensity || 0);
    return new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: textures.map,
      bumpMap: textures.bumpMap,
      bumpScale: mix(0.018, 0.034, clamp(profile.ridgeStrength || 0.4)),
      roughness: clamp(0.92 - industrialization * 0.28 - (1 - temperature) * 0.16, 0.42, 0.94),
      metalness: clamp(0.02 + industrialization * 0.38, 0.02, 0.42),
      emissive: 0xffffff,
      emissiveMap: textures.emissiveMap,
      emissiveIntensity: 0.22 + emissiveDensity * 1.02,
      userData: { fallbackColor }
    });
  }

  function atmosphereColor(THREE, profile) {
    const temperature = clamp(profile.temperature || 0);
    const moisture = clamp(profile.moisture || 0);
    const industrialization = clamp(profile.industrialization || 0);
    const cold = [0.55, 0.80, 0.96], temperate = [0.38, 0.66, 0.88], warm = [0.86, 0.62, 0.38], industrial = [0.72, 0.42, 0.26];
    const temperateBlend = smoothstep(0.08, 0.52, temperature);
    const warmBlend = smoothstep(0.42, 0.92, temperature);
    let target = cold.map((value, index) => mix(value, temperate[index], temperateBlend));
    target = target.map((value, index) => mix(value, warm[index], warmBlend));
    target = target.map((value, index) => mix(value, industrial[index], industrialization * 0.46));
    target = target.map((value, index) => mix(value, [0.72, 0.82, 0.90][index], moisture * 0.18));
    return new THREE.Color(target[0], target[1], target[2]);
  }

  function layerMaterialsFromTextures(THREE, textures) {
    const profile = textures.profile;
    const atmosphere = clamp(profile.atmosphere || 0);
    const coverage = clamp(profile.cloudCoverage || 0);
    return Object.freeze({
      cloudMaterial: new THREE.MeshStandardMaterial({
        color: 0xf0eee5,
        alphaMap: textures.cloudMap,
        transparent: true,
        opacity: atmosphere * (0.24 + coverage * 0.48),
        depthWrite: false,
        roughness: 1,
        metalness: 0
      }),
      atmosphereMaterial: new THREE.MeshBasicMaterial({
        color: atmosphereColor(THREE, profile),
        transparent: true,
        opacity: atmosphere * 0.13,
        side: THREE.BackSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending
      })
    });
  }

  window.CafarronPlanetCompositorV1 = Object.freeze({ loadImage, compose, materialFromTextures, layerMaterialsFromTextures });
})();
