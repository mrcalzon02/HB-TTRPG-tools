(() => {
  'use strict';

  const imageCache = new Map();
  const clamp = (value, min = 0, max = 1) => Math.max(min, Math.min(max, value));
  const mix = (a, b, t) => a + (b - a) * clamp(t);
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
      for (let x = offsetX - drawWidth; x < width + drawWidth; x += drawWidth) context.drawImage(image, x, y, drawWidth, drawHeight);
    }
    context.restore();
    return context.getImageData(0, 0, width, height);
  }

  function tintPixel(r, g, b, profile) {
    const brightness = profile.tintBrightness || 1;
    const saturation = profile.tintSaturation || 1;
    const hue = profile.tintHue || 0;
    const grey = (r + g + b) / 3;
    let rr = mix(grey, r, saturation) * brightness;
    let gg = mix(grey, g, saturation) * brightness;
    let bb = mix(grey, b, saturation) * brightness;
    if (hue !== 0) {
      const angle = hue * Math.PI * 2;
      const cosA = Math.cos(angle), sinA = Math.sin(angle);
      const nr = (0.213 + cosA * 0.787 - sinA * 0.213) * rr + (0.715 - cosA * 0.715 - sinA * 0.715) * gg + (0.072 - cosA * 0.072 + sinA * 0.928) * bb;
      const ng = (0.213 - cosA * 0.213 + sinA * 0.143) * rr + (0.715 + cosA * 0.285 + sinA * 0.140) * gg + (0.072 - cosA * 0.072 - sinA * 0.283) * bb;
      const nb = (0.213 - cosA * 0.213 - sinA * 0.787) * rr + (0.715 - cosA * 0.715 + sinA * 0.715) * gg + (0.072 + cosA * 0.928 + sinA * 0.072) * bb;
      rr = nr; gg = ng; bb = nb;
    }
    return [Math.max(0, Math.min(255, rr)), Math.max(0, Math.min(255, gg)), Math.max(0, Math.min(255, bb))];
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

  function biomeColor(sample) {
    if (sample.ice > 0.5) return [210, 235, 244];
    if (sample.jungle > 0.45) return [35, 73, 38];
    if (sample.grassland > 0.40) return [92, 111, 55];
    if (sample.desert > 0.40) return [176, 135, 79];
    if (sample.mountain > 0.52) return [102, 99, 91];
    return null;
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
    const grass = grassImage ? sampleImage(grassImage, width, height, { ...profile, uvScale: (profile.uvScale || 1) * 0.72, uvRotation: (profile.uvRotation || 0) * -0.43 }) : null;
    const surfaceCanvas = document.createElement('canvas');
    const bumpCanvas = document.createElement('canvas');
    const emissiveCanvas = document.createElement('canvas');
    surfaceCanvas.width = bumpCanvas.width = emissiveCanvas.width = width;
    surfaceCanvas.height = bumpCanvas.height = emissiveCanvas.height = height;
    const surfaceContext = surfaceCanvas.getContext('2d', { alpha: false });
    const bumpContext = bumpCanvas.getContext('2d', { alpha: false });
    const emissiveContext = emissiveCanvas.getContext('2d', { alpha: false });
    const surface = surfaceContext.createImageData(width, height);
    const bump = bumpContext.createImageData(width, height);
    const emissive = emissiveContext.createImageData(width, height);

    for (let y = 0; y < height; y += 1) {
      const v = (y + 0.5) / height;
      for (let x = 0; x < width; x += 1) {
        const u = (x + 0.5) / width;
        const offset = (y * width + x) * 4;
        const sample = profileEngine.sample(profile, u, v);
        const tinted = tintPixel(geology.data[offset], geology.data[offset + 1], geology.data[offset + 2], profile);
        let r = tinted[0], g = tinted[1], b = tinted[2];

        if (sample.ocean > 0.02) {
          const deep = clamp((profile.seaLevel - sample.elevation + 0.10) * 4.0);
          const coast = sample.coast;
          const or = mix(30, 14, deep), og = mix(79, 43, deep), ob = mix(105, 78, deep);
          r = mix(r, or, sample.ocean * (1 - coast * 0.28));
          g = mix(g, og, sample.ocean * (1 - coast * 0.28));
          b = mix(b, ob, sample.ocean * (1 - coast * 0.28));
        }

        const biome = biomeColor(sample);
        if (biome && sample.land > 0.02) {
          let strength = Math.max(sample.ice, sample.jungle, sample.grassland, sample.desert, sample.mountain) * sample.land;
          if (sample.grassland > 0.34 && grass) {
            const gr = grass.data[offset], gg = grass.data[offset + 1], gb = grass.data[offset + 2];
            const vegetation = sample.grassland * sample.land;
            r = mix(r, gr, vegetation * 0.58);
            g = mix(g, gg, vegetation * 0.68);
            b = mix(b, gb, vegetation * 0.54);
            strength *= 0.55;
          }
          r = mix(r, biome[0], strength * 0.48);
          g = mix(g, biome[1], strength * 0.48);
          b = mix(b, biome[2], strength * 0.48);
        }

        if (sample.coast > 0.02 && sample.land > 0.1) {
          const coastMix = sample.coast * sample.land * 0.42;
          r = mix(r, 194, coastMix); g = mix(g, 167, coastMix); b = mix(b, 118, coastMix);
        }

        surface.data[offset] = Math.max(0, Math.min(255, r));
        surface.data[offset + 1] = Math.max(0, Math.min(255, g));
        surface.data[offset + 2] = Math.max(0, Math.min(255, b));
        surface.data[offset + 3] = 255;

        const heightValue = Math.max(0, Math.min(255, 72 + sample.elevation * 128 + sample.mountain * 52 - sample.ocean * 38));
        bump.data[offset] = bump.data[offset + 1] = bump.data[offset + 2] = heightValue;
        bump.data[offset + 3] = 255;

        const civilization = clamp(profile.civilization || 0);
        const urbanNoise = profileEngine.fbm2(u * 22 + profile.seed * 0.00007, v * 18, profile.seed ^ 0x27d4eb2d, 3);
        const city = sample.land * civilization * Math.max(0, urbanNoise - (0.73 - civilization * 0.2)) * 3.8 * (1 - sample.mountain);
        const lava = profile.template === 'forge' ? sample.land * Math.max(0, sample.ridge - 0.34) * 0.75 : 0;
        const glow = clamp(city + lava);
        emissive.data[offset] = Math.min(255, 255 * glow);
        emissive.data[offset + 1] = Math.min(255, (profile.template === 'forge' ? 92 : 188) * glow);
        emissive.data[offset + 2] = Math.min(255, (profile.template === 'forge' ? 28 : 92) * glow);
        emissive.data[offset + 3] = 255;
      }
    }

    surfaceContext.putImageData(surface, 0, 0);
    bumpContext.putImageData(bump, 0, 0);
    emissiveContext.putImageData(emissive, 0, 0);
    return Object.freeze({
      map: canvasTexture(THREE, surfaceCanvas, true),
      bumpMap: canvasTexture(THREE, bumpCanvas, false),
      emissiveMap: canvasTexture(THREE, emissiveCanvas, false),
      profile
    });
  }

  function materialFromTextures(THREE, textures, fallbackColor = 0x8c8c82) {
    const template = textures.profile.template;
    return new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: textures.map,
      bumpMap: textures.bumpMap,
      bumpScale: template === 'ice' ? 0.018 : template === 'forge' ? 0.032 : 0.026,
      roughness: template === 'ice' ? 0.48 : template === 'forge' ? 0.66 : 0.82,
      metalness: template === 'forge' ? 0.34 : 0.03,
      emissive: template === 'forge' ? 0xff5828 : 0xffc36d,
      emissiveMap: textures.emissiveMap,
      emissiveIntensity: template === 'forge' ? 1.15 : 0.38,
      userData: { fallbackColor }
    });
  }

  window.CafarronPlanetCompositorV1 = Object.freeze({ loadImage, compose, materialFromTextures });
})();
