(() => {
  'use strict';

  const clamp = (value, min = 0, max = 1) => Math.max(min, Math.min(max, value));
  const lerp = (a, b, t) => a + (b - a) * t;

  const STELLAR_CLASSES = Object.freeze({
    O: { label: 'O-type blue star', weight: 0.012, temperature: [30000, 44000], hue: [0.585, 0.615], saturation: [0.34, 0.54], lightness: [0.82, 0.94], radius: [0.96, 1.16], intensity: [4.4, 5.4], granulation: [8.8, 12.8], contrast: [0.12, 0.22], spots: [0.00, 0.035], facula: [0.52, 0.82], corona: [0.82, 1.00], rotation: [0.000095, 0.000145] },
    B: { label: 'B-type blue-white star', weight: 0.035, temperature: [10000, 30000], hue: [0.575, 0.605], saturation: [0.22, 0.42], lightness: [0.84, 0.95], radius: [0.86, 1.08], intensity: [3.9, 4.8], granulation: [8.0, 12.0], contrast: [0.13, 0.24], spots: [0.00, 0.045], facula: [0.46, 0.74], corona: [0.72, 0.94], rotation: [0.000085, 0.000135] },
    A: { label: 'A-type white star', weight: 0.072, temperature: [7500, 10000], hue: [0.56, 0.59], saturation: [0.08, 0.24], lightness: [0.86, 0.96], radius: [0.76, 0.98], intensity: [3.45, 4.15], granulation: [7.4, 11.2], contrast: [0.14, 0.25], spots: [0.005, 0.055], facula: [0.40, 0.68], corona: [0.64, 0.88], rotation: [0.000075, 0.000125] },
    F: { label: 'F-type yellow-white star', weight: 0.115, temperature: [6000, 7500], hue: [0.105, 0.145], saturation: [0.10, 0.26], lightness: [0.82, 0.94], radius: [0.70, 0.90], intensity: [3.15, 3.85], granulation: [6.8, 10.4], contrast: [0.16, 0.28], spots: [0.01, 0.075], facula: [0.36, 0.64], corona: [0.58, 0.82], rotation: [0.000065, 0.000115] },
    G: { label: 'G-type yellow star', weight: 0.175, temperature: [5200, 6000], hue: [0.095, 0.125], saturation: [0.30, 0.52], lightness: [0.68, 0.84], radius: [0.64, 0.82], intensity: [2.75, 3.45], granulation: [6.2, 9.6], contrast: [0.18, 0.32], spots: [0.025, 0.11], facula: [0.30, 0.58], corona: [0.50, 0.76], rotation: [0.000055, 0.000105] },
    K: { label: 'K-type orange star', weight: 0.225, temperature: [3700, 5200], hue: [0.055, 0.092], saturation: [0.44, 0.66], lightness: [0.58, 0.76], radius: [0.58, 0.76], intensity: [2.35, 3.05], granulation: [5.6, 8.8], contrast: [0.20, 0.36], spots: [0.035, 0.14], facula: [0.26, 0.50], corona: [0.44, 0.68], rotation: [0.00005, 0.000095] },
    M: { label: 'M-type red dwarf', weight: 0.305, temperature: [2400, 3700], hue: [0.012, 0.045], saturation: [0.58, 0.78], lightness: [0.48, 0.66], radius: [0.48, 0.66], intensity: [1.9, 2.65], granulation: [4.8, 8.0], contrast: [0.24, 0.42], spots: [0.05, 0.18], facula: [0.20, 0.44], corona: [0.36, 0.60], rotation: [0.000045, 0.00009] },
    'red-giant': { label: 'Red giant', weight: 0.038, temperature: [3000, 4700], hue: [0.018, 0.060], saturation: [0.52, 0.74], lightness: [0.56, 0.76], radius: [1.08, 1.42], intensity: [3.05, 4.10], granulation: [3.6, 6.4], contrast: [0.26, 0.46], spots: [0.025, 0.13], facula: [0.26, 0.52], corona: [0.62, 0.90], rotation: [0.000025, 0.000055] },
    'white-dwarf': { label: 'White dwarf', weight: 0.023, temperature: [8000, 26000], hue: [0.56, 0.61], saturation: [0.06, 0.24], lightness: [0.90, 0.99], radius: [0.36, 0.50], intensity: [2.8, 3.75], granulation: [10.0, 15.0], contrast: [0.08, 0.18], spots: [0.00, 0.025], facula: [0.50, 0.78], corona: [0.40, 0.66], rotation: [0.00008, 0.00015] }
  });

  function engine() {
    const profile = window.CafarronPlanetProfileV1;
    if (!profile?.hash || !profile?.random) throw new Error('Planetary profile primitives are required by the stellar profile engine.');
    return profile;
  }

  function explicitClass(text) {
    const value = String(text || '').toLowerCase();
    if (/white dwarf|degenerate star/.test(value)) return 'white-dwarf';
    if (/red giant|giant red star/.test(value)) return 'red-giant';
    if (/\bo[- ]?type\b|blue supergiant|hot blue star/.test(value)) return 'O';
    if (/\bb[- ]?type\b|blue-white star/.test(value)) return 'B';
    if (/\ba[- ]?type\b|white main sequence/.test(value)) return 'A';
    if (/\bf[- ]?type\b|yellow-white star/.test(value)) return 'F';
    if (/\bg[- ]?type\b|yellow star|solar analogue|sun-like/.test(value)) return 'G';
    if (/\bk[- ]?type\b|orange star/.test(value)) return 'K';
    if (/\bm[- ]?type\b|red dwarf/.test(value)) return 'M';
    return '';
  }

  function chooseClass(identity, text = '') {
    const explicit = explicitClass(text);
    if (explicit) return explicit;
    const { hash, random } = engine();
    const roll = random(hash(`${identity}|stellar-class`))();
    let cursor = 0;
    for (const [name, entry] of Object.entries(STELLAR_CLASSES)) {
      cursor += entry.weight;
      if (roll <= cursor) return name;
    }
    return 'G';
  }

  function between(range, roll) { return lerp(range[0], range[1], roll()); }

  function createProfile(identity, text = '') {
    const { hash, random } = engine();
    const stellarClass = chooseClass(identity, text);
    const ranges = STELLAR_CLASSES[stellarClass];
    const seed = hash(`${identity}|${text}|${stellarClass}`);
    const roll = random(seed);
    const temperatureK = Math.round(between(ranges.temperature, roll));
    const surfaceHue = between(ranges.hue, roll);
    const surfaceSaturation = between(ranges.saturation, roll);
    const surfaceLightness = between(ranges.lightness, roll);
    return Object.freeze({
      seed,
      stellarClass,
      label: ranges.label,
      temperatureK,
      surfaceHue,
      surfaceSaturation,
      surfaceLightness,
      radius: between(ranges.radius, roll),
      lightIntensity: between(ranges.intensity, roll),
      granulationScale: between(ranges.granulation, roll),
      surfaceContrast: between(ranges.contrast, roll),
      spotDensity: between(ranges.spots, roll),
      spotScale: lerp(7.5, 15.5, roll()),
      faculaStrength: between(ranges.facula, roll),
      coronaStrength: between(ranges.corona, roll),
      rotationSpeed: between(ranges.rotation, roll),
      templateCrop: lerp(0.56, 0.68, roll()),
      differentialShear: lerp(0.015, 0.075, roll()),
      activityPhase: roll() * Math.PI * 2
    });
  }

  window.CafarronStellarProfileV1 = Object.freeze({ STELLAR_CLASSES, explicitClass, chooseClass, createProfile, clamp });
})();
