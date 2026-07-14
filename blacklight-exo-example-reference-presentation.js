(() => {
  'use strict';

  const PRESET = 'EXAMPLE';
  const $ = id => document.getElementById(id);

  function apply() {
    if ($('exo-cluster-seed')?.value.trim().toUpperCase() !== PRESET) return;
    const reference = globalThis.BlacklightExoExampleReference;
    const masses = globalThis.BlacklightExoSystemMasses;
    if (!reference || !(masses instanceof Map)) return;

    const records = new Map(reference.systems.map(item => [item.name, item]));
    for (const card of document.querySelectorAll('#exo-cluster-grid .exo-cluster-card')) {
      const name = card.dataset.catalogName || card.querySelector('h3')?.textContent.trim();
      const item = records.get(name);
      const seed = card.querySelector('.exo-cluster-seed')?.textContent.trim();
      const mass = masses.get(seed);
      if (!item || !mass) continue;

      for (const wrapper of card.querySelectorAll('.exo-cluster-metrics > div')) {
        const dt = wrapper.querySelector('dt');
        const dd = wrapper.querySelector('dd');
        if (!dt || !dd) continue;
        if (/generated orbiting mass/i.test(dt.textContent)) {
          dt.textContent = 'Confirmed orbiting mass';
          dd.textContent = `${item.knownOrbitingMassEarth.toLocaleString(undefined, {maximumFractionDigits:2})} M⊕`;
          wrapper.title = 'Confirmed or conservative published minimum mass. Candidates are excluded.';
        } else if (/total modeled mass/i.test(dt.textContent)) {
          dt.textContent = 'Gravity-source mass';
          dd.textContent = `${mass.totalSolarMass.toFixed(mass.totalSolarMass >= 1 ? 6 : 7)} M☉`;
          wrapper.title = 'Published stellar estimate plus confirmed or conservative minimum orbiting mass.';
        }
      }

      const open = card.querySelector('.exo-cluster-open');
      if (open) {
        open.textContent = name === 'Sol'
          ? 'Open Generated Sol Scenario'
          : `Open Generated ${name} Scenario`;
        open.title = 'The cluster location and reference facts are observational; the detailed orbital system remains a deterministic EXO scenario.';
      }
    }

    const hz = $('exo-cluster-summary-habitable');
    if (hz) {
      hz.textContent = '3';
      hz.title = 'Sol, Proxima Centauri within the Alpha Centauri system, and Ross 128 have confirmed bodies commonly placed in or near conventional habitable zones. This is not a life claim.';
    }
    const populated = $('exo-cluster-summary-populated');
    if (populated) populated.title = 'Only the Solar System is marked as known populated.';
  }

  function initialize() {
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
