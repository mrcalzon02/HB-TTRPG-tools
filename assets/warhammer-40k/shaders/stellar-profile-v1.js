(() => {
  'use strict';

  const clamp = (value, min = 0, max = 1) => Math.max(min, Math.min(max, value));
  const lerp = (a, b, t) => a + (b - a) * t;

  const STELLAR_CLASSES = Object.freeze({
    Y: { label: 'Y-type ultracool brown dwarf', family: 'brown-dwarf', spectral: ['Y'], luminosityClass: '', weight: 0.018, temperature: [250, 500], hue: [0.075, 0.115], saturation: [0.46, 0.68], lightness: [0.18, 0.30], radius: [0.28, 0.38], intensity: [0.28, 0.52], granulation: [3.8, 6.2], contrast: [0.34, 0.54], spots: [0.12, 0.28], facula: [0.04, 0.14], corona: [0.04, 0.14], rotation: [0.00008, 0.00017], activity: [0.18, 0.34], activityRate: [0.08, 0.18], fieldScale: [4.2, 7.2], flare: [0.01, 0.05], pulse: [0, 0], pulseRate: [0, 0], updateMs: [190, 280] },
    T: { label: 'T-type methane brown dwarf', family: 'brown-dwarf', spectral: ['T'], luminosityClass: '', weight: 0.045, temperature: [500, 1300], hue: [0.045, 0.085], saturation: [0.50, 0.72], lightness: [0.22, 0.36], radius: [0.30, 0.41], intensity: [0.36, 0.68], granulation: [4.1, 6.8], contrast: [0.32, 0.52], spots: [0.10, 0.25], facula: [0.05, 0.16], corona: [0.05, 0.16], rotation: [0.00008, 0.00018], activity: [0.20, 0.38], activityRate: [0.09, 0.20], fieldScale: [4.6, 7.8], flare: [0.02, 0.07], pulse: [0, 0], pulseRate: [0, 0], updateMs: [175, 255] },
    L: { label: 'L-type red-brown dwarf', family: 'brown-dwarf', spectral: ['L'], luminosityClass: '', weight: 0.075, temperature: [1300, 2400], hue: [0.025, 0.060], saturation: [0.58, 0.78], lightness: [0.28, 0.44], radius: [0.32, 0.44], intensity: [0.52, 0.96], granulation: [4.4, 7.3], contrast: [0.30, 0.50], spots: [0.09, 0.23], facula: [0.07, 0.20], corona: [0.07, 0.20], rotation: [0.000075, 0.00017], activity: [0.22, 0.42], activityRate: [0.08, 0.19], fieldScale: [4.8, 8.1], flare: [0.03, 0.10], pulse: [0, 0], pulseRate: [0, 0], updateMs: [165, 245] },
    M: { label: 'M-type red dwarf', family: 'main-sequence', spectral: ['M'], luminosityClass: 'V', weight: 0.285, temperature: [2400, 3700], hue: [0.012, 0.045], saturation: [0.58, 0.78], lightness: [0.48, 0.66], radius: [0.42, 0.62], intensity: [1.45, 2.35], granulation: [4.8, 8.0], contrast: [0.24, 0.42], spots: [0.08, 0.24], facula: [0.20, 0.44], corona: [0.34, 0.62], rotation: [0.000045, 0.00010], activity: [0.20, 0.48], activityRate: [0.05, 0.14], fieldScale: [5.0, 8.8], flare: [0.08, 0.30], pulse: [0, 0], pulseRate: [0, 0], updateMs: [145, 225] },
    K: { label: 'K-type orange dwarf', family: 'main-sequence', spectral: ['K'], luminosityClass: 'V', weight: 0.180, temperature: [3700, 5200], hue: [0.055, 0.092], saturation: [0.44, 0.66], lightness: [0.58, 0.76], radius: [0.54, 0.74], intensity: [2.05, 3.00], granulation: [5.6, 8.8], contrast: [0.20, 0.36], spots: [0.04, 0.16], facula: [0.26, 0.50], corona: [0.42, 0.68], rotation: [0.00005, 0.000095], activity: [0.14, 0.34], activityRate: [0.04, 0.11], fieldScale: [5.6, 9.0], flare: [0.04, 0.14], pulse: [0, 0], pulseRate: [0, 0], updateMs: [155, 235] },
    G: { label: 'G-type yellow dwarf', family: 'main-sequence', spectral: ['G'], luminosityClass: 'V', weight: 0.110, temperature: [5200, 6000], hue: [0.095, 0.125], saturation: [0.30, 0.52], lightness: [0.68, 0.84], radius: [0.62, 0.82], intensity: [2.75, 3.55], granulation: [6.2, 9.6], contrast: [0.18, 0.32], spots: [0.025, 0.12], facula: [0.30, 0.58], corona: [0.50, 0.76], rotation: [0.000055, 0.000105], activity: [0.10, 0.27], activityRate: [0.035, 0.095], fieldScale: [6.0, 9.6], flare: [0.025, 0.09], pulse: [0, 0], pulseRate: [0, 0], updateMs: [165, 245] },
    F: { label: 'F-type yellow-white dwarf', family: 'main-sequence', spectral: ['F'], luminosityClass: 'V', weight: 0.060, temperature: [6000, 7500], hue: [0.105, 0.145], saturation: [0.10, 0.26], lightness: [0.82, 0.94], radius: [0.72, 0.90], intensity: [3.20, 4.00], granulation: [6.8, 10.4], contrast: [0.16, 0.28], spots: [0.01, 0.08], facula: [0.36, 0.64], corona: [0.58, 0.82], rotation: [0.000065, 0.000115], activity: [0.08, 0.22], activityRate: [0.04, 0.11], fieldScale: [6.6, 10.2], flare: [0.015, 0.07], pulse: [0, 0], pulseRate: [0, 0], updateMs: [160, 240] },
    A: { label: 'A-type white main-sequence star', family: 'main-sequence', spectral: ['A'], luminosityClass: 'V', weight: 0.028, temperature: [7500, 10000], hue: [0.56, 0.59], saturation: [0.08, 0.24], lightness: [0.86, 0.96], radius: [0.78, 0.98], intensity: [3.55, 4.35], granulation: [7.4, 11.2], contrast: [0.14, 0.25], spots: [0.005, 0.055], facula: [0.40, 0.68], corona: [0.64, 0.88], rotation: [0.000075, 0.000125], activity: [0.06, 0.18], activityRate: [0.045, 0.12], fieldScale: [7.2, 11.0], flare: [0.01, 0.05], pulse: [0, 0], pulseRate: [0, 0], updateMs: [150, 225] },
    B: { label: 'B-type blue-white star', family: 'main-sequence', spectral: ['B'], luminosityClass: 'V', weight: 0.012, temperature: [10000, 30000], hue: [0.575, 0.605], saturation: [0.22, 0.42], lightness: [0.84, 0.95], radius: [0.88, 1.06], intensity: [4.05, 5.05], granulation: [8.0, 12.0], contrast: [0.13, 0.24], spots: [0.00, 0.045], facula: [0.46, 0.74], corona: [0.72, 0.94], rotation: [0.000085, 0.000135], activity: [0.06, 0.18], activityRate: [0.05, 0.14], fieldScale: [8.0, 12.0], flare: [0.01, 0.05], pulse: [0, 0], pulseRate: [0, 0], updateMs: [140, 215] },
    O: { label: 'O-type blue star', family: 'main-sequence', spectral: ['O'], luminosityClass: 'V', weight: 0.003, temperature: [30000, 50000], hue: [0.585, 0.615], saturation: [0.34, 0.54], lightness: [0.82, 0.94], radius: [0.98, 1.14], intensity: [4.70, 5.80], granulation: [8.8, 12.8], contrast: [0.12, 0.22], spots: [0.00, 0.035], facula: [0.52, 0.82], corona: [0.82, 1.00], rotation: [0.000095, 0.000145], activity: [0.07, 0.20], activityRate: [0.055, 0.15], fieldScale: [8.8, 13.2], flare: [0.01, 0.06], pulse: [0, 0], pulseRate: [0, 0], updateMs: [130, 205] },
    'red-giant': { label: 'Red giant', family: 'giant', spectral: ['K', 'M'], luminosityClass: 'III', weight: 0.050, temperature: [3000, 4700], hue: [0.018, 0.060], saturation: [0.52, 0.74], lightness: [0.56, 0.76], radius: [0.92, 1.10], intensity: [3.45, 4.55], granulation: [3.2, 5.8], contrast: [0.28, 0.48], spots: [0.025, 0.14], facula: [0.26, 0.52], corona: [0.62, 0.90], rotation: [0.00002, 0.00005], activity: [0.16, 0.38], activityRate: [0.018, 0.055], fieldScale: [2.8, 5.2], flare: [0.03, 0.12], pulse: [0, 0], pulseRate: [0, 0], updateMs: [190, 300] },
    'orange-giant': { label: 'Orange giant', family: 'giant', spectral: ['K'], luminosityClass: 'III', weight: 0.025, temperature: [4000, 5200], hue: [0.050, 0.090], saturation: [0.42, 0.64], lightness: [0.62, 0.80], radius: [0.88, 1.06], intensity: [3.65, 4.75], granulation: [3.6, 6.0], contrast: [0.24, 0.44], spots: [0.02, 0.12], facula: [0.28, 0.54], corona: [0.58, 0.86], rotation: [0.000022, 0.000055], activity: [0.13, 0.32], activityRate: [0.02, 0.06], fieldScale: [3.2, 5.6], flare: [0.025, 0.10], pulse: [0, 0], pulseRate: [0, 0], updateMs: [185, 290] },
    'yellow-giant': { label: 'Yellow giant', family: 'giant', spectral: ['F', 'G'], luminosityClass: 'III', weight: 0.012, temperature: [5000, 7000], hue: [0.090, 0.145], saturation: [0.18, 0.42], lightness: [0.72, 0.88], radius: [0.86, 1.04], intensity: [3.90, 5.05], granulation: [4.0, 6.5], contrast: [0.20, 0.38], spots: [0.015, 0.10], facula: [0.34, 0.62], corona: [0.62, 0.88], rotation: [0.000025, 0.00006], activity: [0.11, 0.28], activityRate: [0.025, 0.07], fieldScale: [3.8, 6.2], flare: [0.02, 0.08], pulse: [0, 0], pulseRate: [0, 0], updateMs: [175, 275] },
    'blue-giant': { label: 'Blue giant', family: 'giant', spectral: ['B', 'O'], luminosityClass: 'III', weight: 0.004, temperature: [12000, 36000], hue: [0.575, 0.615], saturation: [0.26, 0.48], lightness: [0.84, 0.96], radius: [1.00, 1.16], intensity: [4.90, 6.10], granulation: [5.8, 9.0], contrast: [0.14, 0.28], spots: [0.00, 0.05], facula: [0.48, 0.80], corona: [0.78, 1.00], rotation: [0.00004, 0.00009], activity: [0.09, 0.24], activityRate: [0.035, 0.09], fieldScale: [5.2, 8.4], flare: [0.015, 0.08], pulse: [0, 0], pulseRate: [0, 0], updateMs: [155, 245] },
    'red-supergiant': { label: 'Red supergiant', family: 'supergiant', spectral: ['M', 'K'], luminosityClass: 'I', weight: 0.003, temperature: [3000, 4300], hue: [0.010, 0.050], saturation: [0.56, 0.78], lightness: [0.58, 0.78], radius: [1.10, 1.28], intensity: [5.00, 6.40], granulation: [2.2, 4.2], contrast: [0.34, 0.58], spots: [0.03, 0.16], facula: [0.24, 0.50], corona: [0.72, 1.00], rotation: [0.000012, 0.000035], activity: [0.20, 0.46], activityRate: [0.010, 0.035], fieldScale: [2.0, 4.0], flare: [0.04, 0.16], pulse: [0, 0], pulseRate: [0, 0], updateMs: [220, 340] },
    'blue-supergiant': { label: 'Blue supergiant', family: 'supergiant', spectral: ['B', 'O'], luminosityClass: 'I', weight: 0.001, temperature: [18000, 50000], hue: [0.585, 0.620], saturation: [0.30, 0.54], lightness: [0.86, 0.98], radius: [1.08, 1.24], intensity: [5.60, 7.20], granulation: [4.8, 7.8], contrast: [0.16, 0.30], spots: [0.00, 0.04], facula: [0.54, 0.86], corona: [0.88, 1.00], rotation: [0.00003, 0.000075], activity: [0.11, 0.28], activityRate: [0.025, 0.075], fieldScale: [4.6, 7.4], flare: [0.02, 0.10], pulse: [0, 0], pulseRate: [0, 0], updateMs: [165, 255] },
    'white-dwarf-da': { label: 'DA hydrogen-atmosphere white dwarf', family: 'white-dwarf', spectral: ['DA'], luminosityClass: '', weight: 0.045, temperature: [7000, 40000], hue: [0.56, 0.61], saturation: [0.04, 0.20], lightness: [0.90, 0.99], radius: [0.23, 0.34], intensity: [2.55, 4.20], granulation: [10.0, 15.0], contrast: [0.07, 0.17], spots: [0.00, 0.03], facula: [0.46, 0.76], corona: [0.30, 0.56], rotation: [0.000075, 0.00016], activity: [0.04, 0.14], activityRate: [0.06, 0.18], fieldScale: [10.0, 15.0], flare: [0.00, 0.03], pulse: [0, 0], pulseRate: [0, 0], updateMs: [120, 195] },
    'white-dwarf-db': { label: 'DB helium-atmosphere white dwarf', family: 'white-dwarf', spectral: ['DB'], luminosityClass: '', weight: 0.018, temperature: [11000, 30000], hue: [0.54, 0.59], saturation: [0.05, 0.22], lightness: [0.88, 0.98], radius: [0.22, 0.33], intensity: [2.45, 4.00], granulation: [9.6, 14.5], contrast: [0.08, 0.19], spots: [0.00, 0.035], facula: [0.42, 0.72], corona: [0.28, 0.54], rotation: [0.00007, 0.00015], activity: [0.05, 0.15], activityRate: [0.055, 0.17], fieldScale: [9.5, 14.5], flare: [0.00, 0.035], pulse: [0, 0], pulseRate: [0, 0], updateMs: [125, 200] },
    'white-dwarf-dc': { label: 'DC featureless white dwarf', family: 'white-dwarf', spectral: ['DC'], luminosityClass: '', weight: 0.008, temperature: [5000, 12000], hue: [0.08, 0.13], saturation: [0.04, 0.16], lightness: [0.82, 0.96], radius: [0.21, 0.32], intensity: [1.90, 3.25], granulation: [8.8, 13.5], contrast: [0.08, 0.20], spots: [0.00, 0.04], facula: [0.32, 0.62], corona: [0.22, 0.46], rotation: [0.00006, 0.00014], activity: [0.04, 0.14], activityRate: [0.05, 0.15], fieldScale: [8.5, 13.5], flare: [0.00, 0.03], pulse: [0, 0], pulseRate: [0, 0], updateMs: [135, 210] },
    'neutron-star': { label: 'Neutron star', family: 'neutron-star', spectral: ['NS'], luminosityClass: '', weight: 0.012, temperature: [250000, 900000], hue: [0.58, 0.64], saturation: [0.18, 0.42], lightness: [0.90, 1.00], radius: [0.15, 0.22], intensity: [3.30, 5.10], granulation: [13.0, 20.0], contrast: [0.08, 0.22], spots: [0.01, 0.07], facula: [0.58, 0.90], corona: [0.44, 0.72], rotation: [0.00022, 0.00048], activity: [0.18, 0.42], activityRate: [0.16, 0.42], fieldScale: [12.0, 19.0], flare: [0.04, 0.16], pulse: [0.04, 0.16], pulseRate: [0.7, 1.8], updateMs: [80, 130] },
    pulsar: { label: 'Pulsar neutron star', family: 'neutron-star', spectral: ['PSR'], luminosityClass: '', weight: 0.004, temperature: [350000, 1200000], hue: [0.59, 0.66], saturation: [0.20, 0.48], lightness: [0.92, 1.00], radius: [0.15, 0.21], intensity: [3.80, 5.80], granulation: [14.0, 21.0], contrast: [0.08, 0.20], spots: [0.01, 0.06], facula: [0.62, 0.94], corona: [0.50, 0.82], rotation: [0.00028, 0.00062], activity: [0.22, 0.48], activityRate: [0.20, 0.52], fieldScale: [13.0, 20.0], flare: [0.05, 0.18], pulse: [0.28, 0.70], pulseRate: [1.1, 3.8], updateMs: [55, 95] },
    magnetar: { label: 'Magnetar', family: 'neutron-star', spectral: ['MAG'], luminosityClass: '', weight: 0.002, temperature: [450000, 1500000], hue: [0.60, 0.68], saturation: [0.22, 0.52], lightness: [0.92, 1.00], radius: [0.16, 0.22], intensity: [4.20, 6.40], granulation: [12.0, 19.0], contrast: [0.10, 0.26], spots: [0.015, 0.08], facula: [0.66, 1.00], corona: [0.58, 0.92], rotation: [0.00020, 0.00050], activity: [0.30, 0.62], activityRate: [0.18, 0.48], fieldScale: [11.0, 18.0], flare: [0.18, 0.46], pulse: [0.18, 0.52], pulseRate: [0.5, 2.2], updateMs: [60, 105] }
  });

  function engine() {
    const profile = window.CafarronPlanetProfileV1;
    if (!profile?.hash || !profile?.random) throw new Error('Planetary profile primitives are required by the stellar profile engine.');
    return profile;
  }

  function explicitClass(text) {
    const value = String(text || '').toLowerCase();
    if (/magnetar|soft gamma repeater|anomalous x-ray pulsar/.test(value)) return 'magnetar';
    if (/pulsar|radio pulsar/.test(value)) return 'pulsar';
    if (/neutron star|neutron-star/.test(value)) return 'neutron-star';
    if (/\bda\s*white dwarf|hydrogen[- ]atmosphere white dwarf/.test(value)) return 'white-dwarf-da';
    if (/\bdb\s*white dwarf|helium[- ]atmosphere white dwarf/.test(value)) return 'white-dwarf-db';
    if (/\bdc\s*white dwarf|featureless white dwarf/.test(value)) return 'white-dwarf-dc';
    if (/white dwarf|degenerate star/.test(value)) return 'white-dwarf-da';
    if (/red supergiant|red super-giant/.test(value)) return 'red-supergiant';
    if (/blue supergiant|blue super-giant/.test(value)) return 'blue-supergiant';
    if (/blue giant/.test(value)) return 'blue-giant';
    if (/yellow giant/.test(value)) return 'yellow-giant';
    if (/orange giant/.test(value)) return 'orange-giant';
    if (/red giant|giant red star/.test(value)) return 'red-giant';
    if (/\by[- ]?type\b|y dwarf/.test(value)) return 'Y';
    if (/\bt[- ]?type\b|t dwarf|methane brown dwarf/.test(value)) return 'T';
    if (/\bl[- ]?type\b|l dwarf/.test(value)) return 'L';
    if (/brown dwarf/.test(value)) return 'L';
    if (/\bo[- ]?type\b|hot blue star/.test(value)) return 'O';
    if (/\bb[- ]?type\b|blue-white star/.test(value)) return 'B';
    if (/\ba[- ]?type\b|white main sequence/.test(value)) return 'A';
    if (/\bf[- ]?type\b|yellow-white star/.test(value)) return 'F';
    if (/\bg[- ]?type\b|yellow dwarf|yellow star|solar analogue|sun-like/.test(value)) return 'G';
    if (/\bk[- ]?type\b|orange dwarf|orange star/.test(value)) return 'K';
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

  function designationFor(stellarClass, ranges, roll) {
    const spectral = ranges.spectral[Math.floor(roll() * ranges.spectral.length) % ranges.spectral.length];
    if (ranges.family === 'neutron-star') return spectral;
    const subtype = Math.floor(roll() * 10);
    if (ranges.family === 'white-dwarf') return `${spectral}${Math.max(1, subtype)}`;
    return `${spectral}${subtype}${ranges.luminosityClass ? ` ${ranges.luminosityClass}` : ''}`;
  }

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
    const designation = designationFor(stellarClass, ranges, roll);
    return Object.freeze({
      seed,
      stellarClass,
      family: ranges.family,
      designation,
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
      activityAmplitude: between(ranges.activity, roll),
      activityRate: between(ranges.activityRate, roll),
      activityFieldScale: between(ranges.fieldScale, roll),
      flareStrength: between(ranges.flare, roll),
      pulseStrength: between(ranges.pulse, roll),
      pulseRate: between(ranges.pulseRate, roll),
      activityIntervalMs: Math.round(between(ranges.updateMs, roll)),
      templateCrop: lerp(0.56, 0.68, roll()),
      differentialShear: lerp(0.015, 0.075, roll()),
      activityPhase: roll() * Math.PI * 2
    });
  }

  window.CafarronStellarProfileV1 = Object.freeze({ STELLAR_CLASSES, explicitClass, chooseClass, designationFor, createProfile, clamp });
})();
