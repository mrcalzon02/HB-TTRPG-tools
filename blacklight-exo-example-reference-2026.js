(() => {
  'use strict';

  const EARTHS_PER_SOLAR_MASS = 332946.0487;
  const JUPITERS_TO_EARTHS = 317.82838;
  const BARNARD_PLANET_EARTH = 1.09;
  const EPSILON_INDI_SUBSTELLAR_SOLAR = 0.778 + (66.92 + 53.25) / 1047.3486;
  const EPSILON_INDI_PLANET_EARTH = 7.6 * JUPITERS_TO_EARTHS;
  const $ = id => document.getElementById(id);

  function publicItem(name) {
    return globalThis.BlacklightExoExampleReference?.systems
      ?.find(system => system.name === name);
  }

  function updatePublicReference() {
    const barnard = publicItem("Barnard's Star");
    if (barnard) {
      barnard.knownOrbitingMassEarth = BARNARD_PLANET_EARTH;
      barnard.confidence = '2025 published minimum-mass sum for four confirmed sub-Earth planets';
      barnard.material = 'Low minimum masses support rocky interiors. A 2026 composition study using host-star Fe/Mg/Si abundances favors ferropericlase-rich mantles, reduced water capacity, and comparatively low radiogenic heating; these remain interior-model inferences.';
      barnard.note = 'All four known planets orbit inside the conventional habitable zone; the displayed mass is the summed radial-velocity minimum mass.';
    }

    const epsilon = publicItem('Epsilon Indi');
    if (epsilon) {
      epsilon.confirmed = '1 confirmed directly imaged cold super-Jupiter around Epsilon Indi A; two dynamically measured brown-dwarf companions are also present';
      epsilon.knownOrbitingMassEarth = EPSILON_INDI_PLANET_EARTH;
      epsilon.confidence = '2026 JWST/astrometry estimate: 7.6 ± 0.7 Jupiter masses';
      epsilon.material = 'JWST photometry confirms atmospheric ammonia. Thick water-ice clouds are the favored explanation for the suppressed ammonia feature, though low metallicity or nitrogen depletion remain alternatives.';
      epsilon.note = 'Cluster gravity includes Epsilon Indi A, the measured Ba/Bb brown-dwarf masses, and the updated planet mass.';
    }
  }

  function apply() {
    if ($('exo-cluster-seed')?.value.trim().toUpperCase() !== 'EXAMPLE') return;
    updatePublicReference();
    updateCardMass("Barnard's Star", BARNARD_PLANET_EARTH, null, new Map([
      ['Planetary record', '4 confirmed sub-Earth planets, all interior to the conventional habitable zone'],
      ['Mass confidence', '2025 published minimum-mass sum: approximately 1.09 Earth masses'],
      ['Known orbiting mass used', `${BARNARD_PLANET_EARTH.toFixed(2)} M⊕`],
      ['Material / mineral evidence', 'Rocky interiors are supported by low masses. Host-star Fe/Mg/Si modeling favors ferropericlase-rich, relatively dry, low-radiogenic-heating mantles; this is an inference rather than a direct sample.'],
      ['Interpretation note', 'The cluster calculation uses the summed radial-velocity minimum mass of the four confirmed planets.']
    ]));
    updateCardMass('Epsilon Indi', EPSILON_INDI_PLANET_EARTH, EPSILON_INDI_SUBSTELLAR_SOLAR, new Map([
      ['Planetary record', '1 confirmed directly imaged cold super-Jupiter; two brown-dwarf companions'],
      ['Mass confidence', '2026 JWST/astrometry estimate: 7.6 ± 0.7 Jupiter masses'],
      ['Known orbiting mass used', `${EPSILON_INDI_PLANET_EARTH.toFixed(1)} M⊕`],
      ['Material / mineral evidence', 'Atmospheric ammonia confirmed; thick water-ice clouds favored, with low metallicity or nitrogen depletion retained as alternatives.'],
      ['Interpretation note', 'Gravity includes Epsilon Indi A, dynamically measured Ba/Bb brown-dwarf masses, and the updated planet mass.']
    ]));
  }

  function updateCardMass(name, planetMassEarth, stellarOverride, values) {
    const card = [...document.querySelectorAll('#exo-cluster-grid .exo-cluster-card')]
      .find(item => (item.dataset.catalogName || item.querySelector('h3')?.textContent.trim()) === name);
    if (!card) return;
    const seed = card.querySelector('.exo-cluster-seed')?.textContent.trim();
    const masses = globalThis.BlacklightExoSystemMasses;
    if (!seed || !(masses instanceof Map)) return;

    const existing = masses.get(seed) || {};
    const stellarMassSolar = stellarOverride ?? Number(card.dataset.stellarMass) ?? existing.stellarMassSolar ?? 1;
    const planetaryMassSolar = planetMassEarth / EARTHS_PER_SOLAR_MASS;
    const record = {
      ...existing,
      seed,
      stellarMassSolar,
      planetMassEarth,
      moonMassEarth:0,
      beltMassLunar:0,
      planetaryMassSolar,
      beltMassSolar:0,
      totalSolarMass:stellarMassSolar + planetaryMassSolar,
      provenance:'2026-published-reference',
      referenceUpdated:'2026-07-13'
    };
    masses.set(seed, record);
    card.dataset.stellarMass = String(stellarMassSolar);
    card.dataset.planetaryMass = String(planetaryMassSolar);
    card.dataset.systemMass = String(record.totalSolarMass);
    values.set('Total gravity-source mass', `${record.totalSolarMass.toFixed(record.totalSolarMass >= 1 ? 6 : 7)} M☉`);

    for (const dt of card.querySelectorAll('.exo-real-reference-facts dt')) {
      const value = values.get(dt.textContent.trim());
      if (value !== undefined && dt.nextElementSibling) dt.nextElementSibling.textContent = value;
    }
  }

  function initialize() {
    updatePublicReference();
    const grid = $('exo-cluster-grid');
    if (!grid) {
      requestAnimationFrame(initialize);
      return;
    }
    let queued = false;
    const schedule = () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => {
        queued = false;
        apply();
      });
    };
    new MutationObserver(schedule).observe(grid, {childList:true, subtree:true});
    document.addEventListener('blacklight:example-reference-applied', schedule);
    document.addEventListener('blacklight:system-mass-measured', schedule);
    schedule();
  }

  initialize();
})();
