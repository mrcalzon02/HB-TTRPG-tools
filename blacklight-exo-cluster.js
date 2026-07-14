(() => {
  'use strict';

  const $ = id => document.getElementById(id);
  const generateButton = $('exo-generate-system');
  const seedInput = $('exo-seed-input');
  const clusterSeedInput = $('exo-cluster-seed');
  const clusterCount = $('exo-cluster-count');
  const generateClusterButton = $('exo-generate-cluster');
  const randomClusterButton = $('exo-random-cluster');
  const forcePopulatedButton = $('exo-force-populated-hz');
  const clusterGrid = $('exo-cluster-grid');
  const clusterStatus = $('exo-cluster-status');
  const populationSummary = $('exo-summary-population');
  const hzBodiesSummary = $('exo-summary-hz-bodies');
  const clusterSystemsSummary = $('exo-cluster-summary-systems');
  const clusterPopulatedSummary = $('exo-cluster-summary-populated');
  const clusterHabitableSummary = $('exo-cluster-summary-habitable');

  if (!generateButton || !seedInput || !clusterGrid) return;

  const EXAMPLE_SYSTEMS = [
    ['Sol','G2V yellow dwarf',8,true,1,2,1],
    ['Alpha Centauri','G2V + K1V + M5.5V triple',2,false,1,1,1],
    ["Barnard's Star",'M4V red dwarf',4,false,0,0,0],
    ['Luhman 16','L7.5 + T0.5 brown-dwarf binary',0,false,0,0,0],
    ['Wolf 359','M6V red dwarf',0,false,0,0,0],
    ['Lalande 21185','M2V red dwarf',2,false,0,0,0],
    ['Sirius','A1V + DA2 binary',0,false,0,0,0],
    ['Luyten 726-8','M5.5V + M6V binary',0,false,0,0,0],
    ['Ross 154','M3.5V red dwarf',0,false,0,0,0],
    ['Ross 248','M6V red dwarf',0,false,0,0,0],
    ['Epsilon Eridani','K2V orange dwarf',1,false,0,0,0],
    ['Lacaille 9352','M0.5V red dwarf',2,false,0,0,0],
    ['Ross 128','M4V red dwarf',1,false,1,1,1],
    ['EZ Aquarii','M-dwarf triple system',0,false,0,0,0],
    ['61 Cygni','K5V + K7V binary',0,false,0,0,0],
    ['Procyon','F5IV-V + DQZ white dwarf binary',0,false,0,0,0],
    ['Struve 2398','M3V + M3.5V binary',0,false,0,0,0],
    ['Groombridge 34','M1.5V + M3.5V binary',2,false,0,0,0],
    ['Epsilon Indi','K5V + brown-dwarf pair',1,false,0,0,0],
    ['Tau Ceti','G8V yellow dwarf',0,false,0,0,0]
  ];

  let clusterSystems = [];
  let selectedClusterSeed = '';
  let buildingCluster = false;
  let forcingPopulatedSystem = false;

  function createRandomSeed() {
    if (globalThis.crypto?.getRandomValues) {
      const values = new Uint32Array(2);
      globalThis.crypto.getRandomValues(values);
      return `${values[0].toString(36)}-${values[1].toString(36)}`;
    }
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  }

  function nextFrame() {
    return new Promise(resolve => requestAnimationFrame(resolve));
  }

  function readInspectorData() {
    const data = $('exo-inspector-data');
    const values = {};
    if (!data) return values;
    const children = [...data.children];
    for (let index = 0; index < children.length - 1; index += 2) {
      values[children[index].textContent.trim()] = children[index + 1].textContent.trim();
    }
    return values;
  }

  function selectPrimaryStar() {
    document.querySelector('.exo-star-target')?.dispatchEvent(new MouseEvent('click', {bubbles:true}));
  }

  function parseHabitableZone() {
    selectPrimaryStar();
    const text = readInspectorData()['Habitable zone'] || '';
    const values = text.match(/[\d.]+/g)?.map(Number) || [];
    return values.length >= 2 ? {inner:values[0], outer:values[1]} : null;
  }

  function systemRowsInHabitableZone(zone) {
    const rows = [...document.querySelectorAll('#exo-orbital-table-body tr')];
    const planets = [];
    let parent = null;
    for (const row of rows) {
      const cells = row.cells;
      if (!cells?.length) continue;
      const orbit = cells[0].textContent.trim();
      const distanceText = cells[3]?.textContent.trim() || '';
      if (/^\d+$/.test(orbit) && / AU$/.test(distanceText)) {
        const distance = Number.parseFloat(distanceText);
        parent = {row, orbit, distance, inZone:Boolean(zone && distance >= zone.inner && distance <= zone.outer), moonRows:[]};
        planets.push(parent);
      } else if (/^\d+\.\d+$/.test(orbit) && parent) {
        parent.moonRows.push(row);
      } else if (!/^\d+\.\d+$/.test(orbit)) {
        parent = null;
      }
    }
    return planets.filter(planet => planet.inZone);
  }

  function systemHasPopulationSignature() {
    return /civilization signature|non-natural activity/i.test($('exo-system-features')?.textContent || '');
  }

  function inspectPlanetPopulation(planet) {
    planet.row.querySelector('button')?.click();
    const civilization = readInspectorData().Civilization || '';
    return {populated:Boolean(civilization && !/^No\b/i.test(civilization)), civilization};
  }

  function readCurrentSystemMetadata(options = {}) {
    const seed = seedInput.value.trim();
    const zone = parseHabitableZone();
    const hzPlanets = systemRowsInHabitableZone(zone);
    let populatedHzPlanet = null;
    if (options.inspectHabitablePopulation) {
      for (const planet of hzPlanets) {
        const result = inspectPlanetPopulation(planet);
        if (result.populated) {
          populatedHzPlanet = {
            name:planet.row.cells[1].textContent.trim().replace(/^↳\s*/, ''),
            civilization:result.civilization
          };
          break;
        }
      }
    }
    const hzBodyCount = hzPlanets.reduce((total, planet) => total + 1 + planet.moonRows.length, 0);
    const metadata = {
      seed,
      name:$('exo-summary-name')?.textContent.trim() || 'Unknown system',
      star:$('exo-summary-star')?.textContent.trim() || 'Unknown primary',
      planetCount:Number($('exo-summary-planets')?.textContent || 0),
      populated:systemHasPopulationSignature(),
      hzPlanetCount:hzPlanets.length,
      hzBodyCount,
      populatedHzPlanet,
      habitableWorlds:Number(
        [...document.querySelectorAll('#exo-resource-index .exo-resource-item')]
          .find(item => /Habitable worlds/i.test(item.textContent))
          ?.querySelector('strong')?.textContent || 0
      )
    };
    if (!options.keepSelection || !populatedHzPlanet) selectPrimaryStar();
    return metadata;
  }

  function updateCurrentSummary(metadata = readCurrentSystemMetadata()) {
    setText(populationSummary, metadata.populated ? 'Populated' : 'Unpopulated');
    populationSummary?.classList.toggle('is-populated', metadata.populated);
    populationSummary?.classList.toggle('is-unpopulated', !metadata.populated);
    setText(hzBodiesSummary, metadata.hzBodyCount);
  }

  function setClusterStatus(message, state = '') {
    setText(clusterStatus, message);
    if (clusterStatus && clusterStatus.dataset.state !== state) clusterStatus.dataset.state = state;
  }

  function updateClusterTotals() {
    setText(clusterSystemsSummary, clusterSystems.length);
    setText(clusterPopulatedSummary, clusterSystems.filter(system => system.populated).length);
    setText(clusterHabitableSummary, clusterSystems.filter(system => system.hzBodyCount > 0).length);
  }

  function loadClusterSystem(entry, scroll = true) {
    selectedClusterSeed = entry.seed;
    seedInput.value = entry.seed;
    generateButton.click();
    renderClusterCards();
    if (scroll) $('exo-control-title')?.scrollIntoView({behavior:'smooth', block:'start'});
  }

  function renderClusterCards() {
    const fragment = document.createDocumentFragment();
    for (const entry of clusterSystems) {
      const card = document.createElement('article');
      card.className = 'exo-cluster-card';
      card.classList.toggle('is-selected', entry.seed === selectedClusterSeed);
      card.classList.toggle('is-populated', entry.populated);

      const heading = document.createElement('div');
      heading.className = 'exo-cluster-card-heading';
      const title = document.createElement('h3');
      title.textContent = entry.name;
      const status = document.createElement('span');
      status.className = `exo-population-badge ${entry.populated ? 'populated' : 'unpopulated'}`;
      status.textContent = entry.populated ? 'Populated' : 'Unpopulated';
      heading.append(title, status);

      const primary = document.createElement('p');
      primary.className = 'exo-cluster-primary';
      primary.textContent = entry.star;

      const metrics = document.createElement('dl');
      metrics.className = 'exo-cluster-metrics';
      for (const [label, value] of [
        ['Planets', entry.planetCount],
        ['HZ planets', entry.hzPlanetCount],
        ['HZ bodies', entry.hzBodyCount],
        ['Habitable worlds', entry.habitableWorlds]
      ]) {
        const wrapper = document.createElement('div');
        const dt = document.createElement('dt');
        const dd = document.createElement('dd');
        dt.textContent = label;
        dd.textContent = String(value);
        wrapper.append(dt, dd);
        metrics.append(wrapper);
      }

      const seed = document.createElement('code');
      seed.className = 'exo-cluster-seed';
      seed.textContent = entry.seed;

      const open = document.createElement('button');
      open.type = 'button';
      open.className = 'bli-action exo-cluster-open';
      open.textContent = entry.hzBodyCount > 0 ? 'Expand Habitable-Zone System' : 'Open System';
      open.setAttribute('aria-pressed', String(entry.seed === selectedClusterSeed));
      open.addEventListener('click', () => loadClusterSystem(entry));

      card.addEventListener('dblclick', () => loadClusterSystem(entry));
      card.append(heading, primary, metrics, seed, open);
      fragment.append(card);
    }
    clusterGrid.replaceChildren(fragment);
    updateClusterTotals();
  }

  function exampleSystems() {
    return EXAMPLE_SYSTEMS.map(([name, star, planetCount, populated, hzPlanetCount, hzBodyCount, habitableWorlds], index) => ({
      seed:`EXAMPLE:system:${index + 1}`,
      clusterIndex:index + 1,
      name,
      star,
      planetCount,
      populated,
      hzPlanetCount,
      hzBodyCount,
      habitableWorlds,
      publishedReference:true
    }));
  }

  async function generateCluster(randomize = false) {
    if (buildingCluster || forcingPopulatedSystem) return;
    buildingCluster = true;
    if (generateClusterButton) generateClusterButton.disabled = true;
    if (randomClusterButton) randomClusterButton.disabled = true;

    try {
      if (randomize || !clusterSeedInput.value.trim()) clusterSeedInput.value = createRandomSeed();
      const baseSeed = clusterSeedInput.value.trim();

      if (baseSeed.toUpperCase() === 'EXAMPLE') {
        if (clusterCount) clusterCount.value = '20';
        clusterSystems = exampleSystems();
        selectedClusterSeed = clusterSystems[0].seed;
        setClusterStatus('Loading the fixed Sol-centered nearby-star reference cluster…', 'working');
        renderClusterCards();
        loadClusterSystem(clusterSystems[0], false);
        updateCurrentSummary(readCurrentSystemMetadata());
        setClusterStatus('EXAMPLE preset loaded: 20 fixed nearby stellar systems. Open any card to generate its detailed EXO scenario.', 'ready');
        return;
      }

      const count = Math.max(2, Math.min(20, Number(clusterCount?.value || 8)));
      const systems = [];
      setClusterStatus(`Generating ${count} selectable star systems…`, 'working');
      for (let index = 0; index < count; index += 1) {
        const childSeed = `${baseSeed}:system:${index + 1}`;
        seedInput.value = childSeed;
        generateButton.click();
        const metadata = readCurrentSystemMetadata();
        metadata.clusterIndex = index + 1;
        systems.push(metadata);
        setClusterStatus(`Charting system ${index + 1} of ${count}: ${metadata.name}`, 'working');
        if ((index + 1) % 2 === 0) await nextFrame();
      }

      clusterSystems = systems;
      selectedClusterSeed = systems[0]?.seed || '';
      renderClusterCards();
      if (systems[0]) {
        loadClusterSystem(systems[0], false);
        updateCurrentSummary(readCurrentSystemMetadata());
      }
      setClusterStatus(`${count} systems charted. Select a system to expand it below.`, 'ready');
    } finally {
      buildingCluster = false;
      if (generateClusterButton) generateClusterButton.disabled = false;
      if (randomClusterButton) randomClusterButton.disabled = false;
    }
  }

  async function forcePopulatedHabitableSystem() {
    if (forcingPopulatedSystem || buildingCluster) return;
    forcingPopulatedSystem = true;
    const originalText = forcePopulatedButton?.textContent;
    if (forcePopulatedButton) {
      forcePopulatedButton.disabled = true;
      forcePopulatedButton.textContent = 'Creating Populated HZ System…';
    }

    try {
      const baseSeed = seedInput.value.trim() || createRandomSeed();
      let found = null;
      const maximumAttempts = 1200;
      for (let attempt = 1; attempt <= maximumAttempts; attempt += 1) {
        const candidateSeed = `${baseSeed}:populated-hz:${attempt}`;
        seedInput.value = candidateSeed;
        generateButton.click();
        const metadata = readCurrentSystemMetadata({inspectHabitablePopulation:true, keepSelection:true});
        if (metadata.populatedHzPlanet) {
          metadata.forced = true;
          found = metadata;
          break;
        }
        if (forcePopulatedButton) forcePopulatedButton.textContent = `Searching Habitable Systems… ${attempt}`;
        if (attempt % 20 === 0) await nextFrame();
      }
      if (!found) {
        setClusterStatus('No populated habitable-zone planet was found within the safety limit. Try again with another seed.', 'error');
        return;
      }
      selectedClusterSeed = found.seed;
      const existingIndex = clusterSystems.findIndex(item => item.seed === found.seed);
      if (existingIndex >= 0) clusterSystems[existingIndex] = found;
      else clusterSystems.unshift(found);
      renderClusterCards();
      updateCurrentSummary(found);
      setClusterStatus(`${found.name} created with ${found.populatedHzPlanet.name} populated inside the habitable zone (${found.populatedHzPlanet.civilization}).`, 'ready');
    } finally {
      forcingPopulatedSystem = false;
      if (forcePopulatedButton) {
        forcePopulatedButton.disabled = false;
        forcePopulatedButton.textContent = originalText;
      }
    }
  }

  function setText(node, value) {
    if (node && node.textContent !== String(value)) node.textContent = String(value);
  }

  generateButton.addEventListener('click', () => {
    if (buildingCluster || forcingPopulatedSystem) return;
    queueMicrotask(() => {
      const metadata = readCurrentSystemMetadata();
      selectedClusterSeed = metadata.seed;
      updateCurrentSummary(metadata);
      renderClusterCards();
    });
  });

  generateClusterButton?.addEventListener('click', () => generateCluster(false));
  randomClusterButton?.addEventListener('click', () => generateCluster(true));
  forcePopulatedButton?.addEventListener('click', forcePopulatedHabitableSystem);
  clusterSeedInput?.addEventListener('keydown', event => {
    if (event.key === 'Enter') generateCluster(false);
  });

  const initialMetadata = readCurrentSystemMetadata();
  updateCurrentSummary(initialMetadata);
  clusterSeedInput.value = 'EXAMPLE';
  if (clusterCount) clusterCount.value = '20';
  requestAnimationFrame(() => generateCluster(false));
})();
