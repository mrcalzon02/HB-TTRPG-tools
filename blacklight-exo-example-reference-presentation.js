(() => {
  'use strict';

  const PRESET = 'EXAMPLE';
  const $ = id => document.getElementById(id);
  let scheduled = false;

  function scheduleApply() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      apply();
    });
  }

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
        if (/generated orbiting mass|confirmed orbiting mass/i.test(dt.textContent)) {
          setText(dt, 'Confirmed orbiting mass');
          setText(dd, `${item.knownOrbitingMassEarth.toLocaleString(undefined, {maximumFractionDigits:2})} M⊕`);
          setTitle(wrapper, 'Confirmed or conservative published minimum mass. Candidates are excluded.');
        } else if (/total modeled mass|gravity-source mass/i.test(dt.textContent)) {
          setText(dt, 'Gravity-source mass');
          setText(dd, `${mass.totalSolarMass.toFixed(mass.totalSolarMass >= 1 ? 6 : 7)} M☉`);
          setTitle(wrapper, 'Published stellar estimate plus confirmed or conservative minimum orbiting mass.');
        }
      }

      const open = card.querySelector('.exo-cluster-open');
      if (open) {
        setText(open, name === 'Sol' ? 'Open Generated Sol Scenario' : `Open Generated ${name} Scenario`);
        setTitle(open, 'The cluster location and reference facts are observational; the detailed orbital system remains a deterministic EXO scenario.');
      }
    }

    const hz = $('exo-cluster-summary-habitable');
    setText(hz, '3');
    setTitle(hz, 'Sol, Proxima Centauri within the Alpha Centauri system, and Ross 128 have confirmed bodies commonly placed in or near conventional habitable zones. This is not a life claim.');
    setTitle($('exo-cluster-summary-populated'), 'Only the Solar System is marked as known populated.');
  }

  function setText(node, value) {
    if (node && node.textContent !== String(value)) node.textContent = String(value);
  }

  function setTitle(node, value) {
    if (node && node.title !== value) node.title = value;
  }

  function initialize() {
    const grid = $('exo-cluster-grid');
    if (!grid) {
      requestAnimationFrame(initialize);
      return;
    }
    new MutationObserver(scheduleApply).observe(grid, {childList:true});
    document.addEventListener('blacklight:example-reference-applied', scheduleApply);
    document.addEventListener('blacklight:system-mass-measured', scheduleApply);
    scheduleApply();
  }

  initialize();
})();
