(() => {
  'use strict';

  const TEMPLATE_PATH = 'assets/warhammer-40k/planet-textures/base/SOLAR TEMPLATE.jpg';
  const cache = new Map();
  const clamp = (value, min = 0, max = 1) => Math.max(min, Math.min(max, value));
  const mix = (a, b, t) => a + (b - a) * clamp(t);
  const smoothstep = (a, b, x) => {
    if (a === b) return x < a ? 0 : 1;
    const t = clamp((x - a) / (b - a));
    return t * t * (3 - 2 * t);
  };
  const wrap01 = value => {
    const wrapped = value % 1;
    return wrapped < 0 ? wrapped + 1 : wrapped;
  };

  function loadImage(path = TEMPLATE_PATH) {
    const resolved = new URL(path, document.baseURI).href;
    if (cache.has(resolved)) return cache.get(resolved);
    const promise = new Promise((resolve, reject) => {
      const image = new Image();
      image.decoding = 'async';
      image.addEventListener('load', () => resolve(image), { once: true });
      image.addEventListener('error', () => reject(new Error(`Stellar surface asset could not be loaded: ${path}`)), { once: true });
      image.src = resolved;
    });
    cache.set(resolved, promise);
    promise.catch(() => cache.delete(resolved));
    return promise;
  }

  function centralSurfaceData(image, size, cropFraction) {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const context = canvas.getContext('2d', { alpha: false, willReadFrequently: true });
    const crop = Math.min(image.naturalWidth, image.naturalHeight) * clamp(cropFraction, 0.50, 0.76);
    const sx = (image.naturalWidth - crop) * 0.5;
    const sy = (image.naturalHeight - crop) * 0.5;
    context.drawImage(image, sx, sy, crop, crop, 0, 0, size, size);
    return context.getImageData(0, 0, size, size);
  }

  function pixelAt(data, size, u, v) {
    const x = Math.max(0, Math.min(size - 1, Math.round(clamp(u) * (size - 1))));
    const y = Math.max(0, Math.min(size - 1, Math.round(clamp(v) * (size - 1))));
    const offset = (y * size + x) * 4;
    return [data.data[offset], data.data[offset + 1], data.data[offset + 2]];
  }

  function projectedPixel(data, size, point, profile) {
    const angle = profile.activityPhase * 0.17;
    const cosine = Math.cos(angle), sine = Math.sin(angle);
    const rotated = { x: point.x * cosine - point.z * sine, y: point.y, z: point.x * sine + point.z * cosine };
    const power = profile.family === 'supergiant' ? 3 : 4;
    let wx = Math.pow(Math.abs(rotated.x), power), wy = Math.pow(Math.abs(rotated.y), power), wz = Math.pow(Math.abs(rotated.z), power);
    const total = Math.max(1e-9, wx + wy + wz); wx /= total; wy /= total; wz /= total;
    const toDisk = (a, b, phase = 0) => {
      const radius = Math.hypot(a, b);
      const limit = 0.92;
      const divisor = radius > limit ? radius / limit : 1;
      return [0.5 + (a / divisor) * 0.47 + phase, 0.5 + (b / divisor) * 0.47];
    };
    const samples = [
      [...toDisk(rotated.z, rotated.y), wx],
      [...toDisk(rotated.x, rotated.z, 0.006), wy],
      [...toDisk(rotated.x, rotated.y, -0.006), wz]
    ];
    let r = 0, g = 0, b = 0;
    for (const [u, v, weight] of samples) {
      const pixel = pixelAt(data, size, u, v);
      r += pixel[0] * weight; g += pixel[1] * weight; b += pixel[2] * weight;
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
    let hue = h % 1; if (hue < 0) hue += 1;
    const saturation = clamp(s), lightness = clamp(l);
    if (saturation === 0) return [lightness * 255, lightness * 255, lightness * 255];
    const q = lightness < 0.5 ? lightness * (1 + saturation) : lightness + saturation - lightness * saturation;
    const p = 2 * lightness - q;
    return [hue2rgb(p, q, hue + 1 / 3) * 255, hue2rgb(p, q, hue) * 255, hue2rgb(p, q, hue - 1 / 3) * 255];
  }

  function canvasTexture(THREE, canvas) {
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.anisotropy = 4;
    if ('sRGBEncoding' in THREE) texture.encoding = THREE.sRGBEncoding;
    texture.needsUpdate = true;
    return texture;
  }

  function createActivityController(profile, context, image, basePixels, fields, texture) {
    const interval = Math.max(48, Number(profile.activityIntervalMs || 180));
    const amplitude = clamp(profile.activityAmplitude || 0, 0, 0.8);
    const flareStrength = clamp(profile.flareStrength || 0, 0, 0.8);
    const pulseStrength = clamp(profile.pulseStrength || 0, 0, 0.9);
    const pulseRate = Math.max(0, Number(profile.pulseRate || 0));
    const activityRate = Math.max(0.002, Number(profile.activityRate || 0.05));
    let lastUpdate = -Infinity;
    let baselineEmission = null;
    let lastSnapshot = Object.freeze({ lightScale: 1, coronaScale: 1, emission: 0.5, updated: false });

    function update(now = performance.now()) {
      if (now - lastUpdate < interval) return lastSnapshot;
      lastUpdate = now;
      const phase = wrap01(now * 0.001 * activityRate + profile.activityPhase / (Math.PI * 2));
      const cursor = phase * fields.length;
      const leftIndex = Math.floor(cursor) % fields.length;
      const rightIndex = (leftIndex + 1) % fields.length;
      const blend = smoothstep(0, 1, cursor - Math.floor(cursor));
      const left = fields[leftIndex], right = fields[rightIndex];
      let emissionSum = 0;
      let flareSum = 0;
      const pixelCount = left.length;

      for (let index = 0; index < pixelCount; index += 1) {
        const field = mix(left[index], right[index], blend);
        const emission = smoothstep(0.28, 0.82, field);
        const hotField = smoothstep(0.72, 0.96, field) * flareStrength;
        const coolField = smoothstep(0.20, 0.42, 1 - field) * amplitude;
        const localScale = clamp(1 + (emission - 0.5) * amplitude * 1.18 + hotField * 0.74 - coolField * 0.22, 0.42, 1.86);
        const offset = index * 4;
        image.data[offset] = clamp(basePixels[offset] * localScale, 0, 255);
        image.data[offset + 1] = clamp(basePixels[offset + 1] * localScale, 0, 255);
        image.data[offset + 2] = clamp(basePixels[offset + 2] * localScale, 0, 255);
        image.data[offset + 3] = 255;
        emissionSum += emission;
        flareSum += hotField;
      }

      const meanEmission = emissionSum / Math.max(1, pixelCount);
      const meanFlare = flareSum / Math.max(1, pixelCount);
      if (baselineEmission === null) baselineEmission = meanEmission;
      const emissionDelta = meanEmission - baselineEmission;
      let pulseScale = 1;
      if (pulseStrength > 0 && pulseRate > 0) {
        const pulseWave = 0.5 + 0.5 * Math.sin(now * 0.001 * pulseRate * Math.PI * 2 + profile.activityPhase);
        const spike = Math.pow(pulseWave, profile.family === 'neutron-star' ? 10 : 5);
        pulseScale = clamp(1 - pulseStrength * 0.18 + spike * pulseStrength * 1.18, 0.34, 2.0);
      }
      const fieldScale = clamp(1 + emissionDelta * (5.4 + amplitude * 8.6) + meanFlare * (1.4 + flareStrength * 2.2), 0.52, 1.68);
      const lightScale = clamp(fieldScale * pulseScale, 0.28, 2.25);
      const coronaScale = clamp(0.92 + meanEmission * 0.16 + meanFlare * 0.42 + (pulseScale - 1) * 0.22, 0.72, 1.46);
      context.putImageData(image, 0, 0);
      texture.needsUpdate = true;
      lastSnapshot = Object.freeze({ lightScale, coronaScale, emission: meanEmission, flare: meanFlare, pulseScale, updated: true });
      return lastSnapshot;
    }

    return Object.freeze({ update, interval });
  }

  async function compose(THREE, profile, options = {}) {
    const planetary = window.CafarronPlanetProfileV1;
    if (!planetary?.spherePoint || !planetary?.sphereFbm) throw new Error('Sphere-space procedural primitives are unavailable to the stellar compositor.');
    const width = Math.max(128, Math.min(512, options.width || 256));
    const height = Math.max(64, Math.min(256, options.height || 128));
    const template = await loadImage();
    const templateSize = Math.max(128, Math.min(384, options.templateSize || 256));
    const source = centralSurfaceData(template, templateSize, profile.templateCrop);
    const canvas = document.createElement('canvas');
    canvas.width = width; canvas.height = height;
    const context = canvas.getContext('2d', { alpha: false });
    const image = context.createImageData(width, height);
    const pixelCount = width * height;
    const activityFields = [new Float32Array(pixelCount), new Float32Array(pixelCount), new Float32Array(pixelCount)];

    for (let y = 0; y < height; y += 1) {
      const v = height > 1 ? y / (height - 1) : 0;
      for (let x = 0; x < width; x += 1) {
        const u = width > 1 ? x / (width - 1) : 0;
        const point = planetary.spherePoint(u, v);
        const sourcePixel = projectedPixel(source, templateSize, point, profile);
        const luminance = clamp((sourcePixel[0] * 0.299 + sourcePixel[1] * 0.587 + sourcePixel[2] * 0.114) / 255);
        const broad = planetary.sphereFbm(u, v, profile.seed ^ 0x243f6a88, profile.granulationScale * 0.48, 4);
        const granule = planetary.sphereFbm(u, v, profile.seed ^ 0x85a308d3, profile.granulationScale, 4);
        const fine = planetary.sphereFbm(u, v, profile.seed ^ 0x13198a2e, profile.granulationScale * 2.1, 3);
        const spotField = planetary.sphereFbm(u, v, profile.seed ^ 0x03707344, profile.spotScale, 4);
        const spotThreshold = mix(0.88, 0.66, clamp(profile.spotDensity * 4.6));
        const spot = smoothstep(spotThreshold, Math.min(0.98, spotThreshold + 0.12), spotField) * clamp(profile.spotDensity * 4.0);
        const faculaField = planetary.sphereFbm(u, v, profile.seed ^ 0xa4093822, profile.granulationScale * 1.42, 3);
        const facula = smoothstep(0.64, 0.88, faculaField) * profile.faculaStrength;
        const textureDetail = (luminance - 0.5) * (profile.family === 'brown-dwarf' ? 0.26 : 0.34);
        const procedural = (broad - 0.5) * profile.surfaceContrast * 0.66 + (granule - 0.5) * profile.surfaceContrast + (fine - 0.5) * 0.08;
        const energy = clamp(0.58 + textureDetail + procedural + facula * 0.16 - spot * 0.46, 0.10, 1);
        const lightness = clamp(profile.surfaceLightness * (0.62 + energy * 0.52));
        const saturation = clamp(profile.surfaceSaturation * (0.90 + (granule - 0.5) * 0.18));
        const hue = profile.surfaceHue + (broad - 0.5) * 0.012 + facula * 0.004;
        const rgb = hslToRgb(hue, saturation, lightness);
        const offset = (y * width + x) * 4;
        image.data[offset] = clamp(rgb[0], 0, 255);
        image.data[offset + 1] = clamp(rgb[1], 0, 255);
        image.data[offset + 2] = clamp(rgb[2], 0, 255);
        image.data[offset + 3] = 255;

        const activityIndex = y * width + x;
        const activityScale = Math.max(1.2, profile.activityFieldScale || profile.granulationScale);
        activityFields[0][activityIndex] = planetary.sphereFbm(u, v, profile.seed ^ 0x6a09e667, activityScale, 4);
        activityFields[1][activityIndex] = planetary.sphereFbm(wrap01(u + 1 / 3), v, profile.seed ^ 0x6a09e667, activityScale, 4);
        activityFields[2][activityIndex] = planetary.sphereFbm(wrap01(u + 2 / 3), v, profile.seed ^ 0x6a09e667, activityScale, 4);
      }
    }
    context.putImageData(image, 0, 0);
    const basePixels = new Uint8ClampedArray(image.data);
    const texture = canvasTexture(THREE, canvas);
    const activity = createActivityController(profile, context, image, basePixels, activityFields, texture);
    return Object.freeze({ map: texture, profile, activity });
  }

  function materialFromTextures(THREE, textures) {
    const material = new THREE.MeshBasicMaterial({ color: 0xffffff, map: textures.map, toneMapped: false });
    material.userData.stellarActivity = textures.activity;
    material.userData.stellarProfile = textures.profile;
    return material;
  }

  function coronaMaterials(THREE, profile) {
    const color = new THREE.Color().setHSL(profile.surfaceHue, clamp(profile.surfaceSaturation * 0.74), clamp(profile.surfaceLightness + 0.12));
    const common = { color, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false };
    return Object.freeze({
      inner: new THREE.MeshBasicMaterial({ ...common, opacity: 0.07 + profile.coronaStrength * 0.08 }),
      outer: new THREE.MeshBasicMaterial({ ...common, opacity: 0.025 + profile.coronaStrength * 0.055 })
    });
  }

  window.CafarronStellarCompositorV1 = Object.freeze({ TEMPLATE_PATH, loadImage, compose, materialFromTextures, coronaMaterials });
})();
