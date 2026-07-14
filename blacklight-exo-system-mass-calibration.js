(() => {
  'use strict';

  const EARTHS_PER_SOLAR_MASS = 332946.0487;
  const EARTHS_PER_LUNAR_MASS = 81.30056;
  const LUNAR_MASSES_PER_SOLAR_MASS = EARTHS_PER_SOLAR_MASS * EARTHS_PER_LUNAR_MASS;
  const masses = globalThis.BlacklightExoSystemMasses instanceof Map
    ? globalThis.BlacklightExoSystemMasses
    : new Map();
  globalThis.BlacklightExoSystemMasses = masses;

  const $ = id => document.getElementById(id);
  let measuring = false;

  function inspectorValues() {
    const data = $('exo-inspector-data');
    const values = {};
    if (!data) return values;
    const children = [...data.children];
    for (let index = 0; index < children.length - 1; index += 2) {
      values[children[index].textContent.trim()] = children[index + 1].textContent.trim();
    }
    return values;
  }

  function numberFrom(value) {
    const match = String(value || '').replace(/,/g, '').match(/-?\d+(?:\.\d+)?/);
    return match ? Number(match[0]) : 0;
  }

  function isPublishedExampleSeed(seed) {
    return $('exo-cluster-seed')?.value.trim().toUpperCase() === 'EXAMPLE' &&
      /^EXAMPLE:system:\d+$/i.test(seed);
  }

  function measureCurrentSystem(force = false) {
    const seed = $('exo-seed-input')?.value.trim();
    const table = $('exo-orbital-table-body');
    if (!seed || !table || measuring) return masses.get(seed) || null;
    if (isPublishedExampleSeed(seed)) return masses.get(seed) || null;
    if (!force && masses.has(seed)) return masses.get(seed);

    measuring = true;
    try {
      const selected = table.querySelector('tr[aria-selected="true"]')?.dataset.objectId || 'star';
      document.querySelector('.exo-star-target')?.dispatchEvent(new MouseEvent('click', {bubbles: true}));
      const stellarMassSolar = Math.max(0.00001, numberFrom(inspectorValues().Mass) || 1);

      let planetMassEarth = 0;
      let moonMassEarth = 0;
      let beltMassLunar = 0;
      let planetCount = 0;
      let moonCount = 0;
      let beltCount = 0;

      for (const row of table.querySelectorAll('tr')) {
        const orbit = row.cells?.[0]?.textContent.trim() || '';
        const button = row.querySelector('button');
        if (!button) continue;
        button.click();
        const values = inspectorValues();

        if (/^\d+$/.test(orbit)) {
          planetMassEarth += numberFrom(values.Mass);
          planetCount += 1;
        } else if (/^\d+\.\d+$/.test(orbit)) {
          moonMassEarth += numberFrom(values.Mass);
          moonCount += 1;
        } else if (values['Estimated mass']) {
          beltMassLunar += numberFrom(values['Estimated mass']);
          beltCount += 1;
        }
      }

      const planetaryMassSolar = (planetMassEarth + moonMassEarth) / EARTHS_PER_SOLAR_MASS;
      const beltMassSolar = beltMassLunar / LUNAR_MASSES_PER_SOLAR_MASS;
      const record = {
        seed,
        stellarMassSolar,
        planetMassEarth,
        moonMassEarth,
        beltMassLunar,
        planetaryMassSolar,
        beltMassSolar,
        totalSolarMass: stellarMassSolar + planetaryMassSolar + beltMassSolar,
        planetCount,
        moonCount,
        beltCount,
        measuredAt: Date.now(),
        provenance: 'generated-system'
      };
      masses.set(seed, record);

      const restore = selected === 'star'
        ? document.querySelector('.exo-star-target')
        : table.querySelector(`tr[data-object-id="${escapeSelector(selected)}"] button`);
      restore?.dispatchEvent(new MouseEvent('click', {bubbles: true}));
      decorateCards();
      document.dispatchEvent(new CustomEvent('blacklight:system-mass-measured', {detail: record}));
      return record;
    } finally {
      measuring = false;
    }
  }

  function decorateCards() {
    for (const card of document.querySelectorAll('#exo-cluster-grid .exo-cluster-card')) {
      const seed = card.querySelector('.exo-cluster-seed')?.textContent.trim();
      const record = masses.get(seed);
      if (!record) continue;
      setDataset(card, 'stellarMass', record.stellarMassSolar);
      setDataset(card, 'planetaryMass', record.planetaryMassSolar + record.beltMassSolar);
      setDataset(card, 'systemMass', record.totalSolarMass);
      const metrics = card.querySelector('.exo-cluster-metrics');
      if (!metrics) continue;
      let wrapper = metrics.querySelector('[data-system-mass-metric]');
      if (!wrapper) {
        wrapper = document.createElement('div');
        wrapper.dataset.systemMassMetric = 'true';
        const dt = document.createElement('dt');
        const dd = document.createElement('dd');
        dt.textContent = 'Total mass';
        wrapper.append(dt, dd);
        metrics.append(wrapper);
      }
      const dd = wrapper.querySelector('dd');
      setText(dd, `${formatSolarMass(record.totalSolarMass)} M☉`);
      const title = `${record.planetMassEarth.toFixed(3)} Earth masses in planets; ${record.moonMassEarth.toFixed(3)} Earth masses in moons; ${record.beltMassLunar.toFixed(3)} lunar masses in belts.`;
      if (wrapper.title !== title) wrapper.title = title;
    }
  }

  function setText(node, value) {
    if (node && node.textContent !== String(value)) node.textContent = String(value);
  }

  function setDataset(node, key, value) {
    const next = String(value);
    if (node.dataset[key] !== next) node.dataset[key] = next;
  }

  function formatSolarMass(value) {
    if (value >= 10) return value.toFixed(3);
    if (value >= 1) return value.toFixed(6);
    return value.toFixed(7);
  }

  function escapeSelector(value) {
    return globalThis.CSS?.escape ? CSS.escape(value) : String(value).replace(/["\\]/g, '\\$&');
  }

  function bind() {
    const generate = $('exo-generate-system');
    const grid = $('exo-cluster-grid');
    if (!generate || !grid) {
      requestAnimationFrame(bind);
      return;
    }
    generate.addEventListener('click', () => measureCurrentSystem());
    new MutationObserver(decorateCards).observe(grid, {childList: true});
    requestAnimationFrame(decorateCards);
    globalThis.BlacklightExoMeasureCurrentSystem = measureCurrentSystem;
  }

  bind();
})();
