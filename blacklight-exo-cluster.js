(() => {
  'use strict';

  const $ = id => document.getElementById(id);
  const authority = globalThis.BlacklightExoAuthority;
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
    return values.length >= 2 ? {inner:values[0],outer:values[1]} : null;
  }

  function systemRowsInHabitableZone(zone) {
    const planets = [];
    let parent = null;
    for (const row of document.querySelectorAll('#exo-orbital-table-body tr')) {
      const orbit = row.cells?.[0]?.textContent.trim() || '';
      const distanceText = row.cells?.[3]?.textContent.trim() || '';
      if (/^\d+$/.test(orbit) && / AU$/.test(distanceText)) {
        const distance = Number.parseFloat(distanceText);
        parent = {row,distance,inZone:Boolean(zone && distance >= zone.inner && distance <= zone.outer),moonRows:[]};
        planets.push(parent);
      } else if (/^\d+\.\d+$/.test(orbit) && parent) {
        parent.moonRows.push(row);
      } else if (!/^\d+\.\d+$/.test(orbit)) {
        parent = null;
      }
    }
    return planets.filter(planet => planet.inZone);
  }

  function inspectPlanetPopulation(planet) {
    planet.row.querySelector('button')?.click();
    const civilization = readInspectorData().Civilization || '';
    return {populated:Boolean(civilization && !/^No\b/i.test(civilization)),civilization};
  }

  function readCurrentSystemMetadata(options = {}) {
    const seed = seedInput.value.trim();
    const published = authority?.getSystem(seed);
    if (published) {
      return {
        seed,
        name:published.name,
        star:published.star,
        planetCount:published.confirmedPlanetCount,
        populated:published.populated,
        hzPlanetCount:published.confirmedHzPlanetCount,
        hzBodyCount:published.confirmedHzBodyCount,
        habitableWorlds:published.knownLifeWorlds,
        publishedReference:true
      };
    }

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
    const metadata = {
      seed,
      name:$('exo-summary-name')?.textContent.trim() || 'Unknown system',
      star:$('exo-summary-star')?.textContent.trim() || 'Unknown primary',
      planetCount:Number($('exo-summary-planets')?.textContent || 0),
      populated:/civilization signature|non-natural activity/i.test($('exo-system-features')?.textContent || ''),
      hzPlanetCount:hzPlanets.length,
      hzBodyCount:hzPlanets.reduce((total,planet) => total + 1 + planet.moonRows.length,0),
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
    setText(populationSummary,metadata.populated ? 'Populated' : 'Unpopulated');
    populationSummary?.classList.toggle('is-populated',metadata.populated);
    populationSummary?.classList.toggle('is-unpopulated',!metadata.populated);
    setText(hzBodiesSummary,metadata.hzBodyCount);
  }

  function setClusterStatus(message,state = '') {
    setText(clusterStatus,message);
    if (clusterStatus && clusterStatus.dataset.state !== state) clusterStatus.dataset.state = state;
  }

  function updateClusterTotals() {
    setText(clusterSystemsSummary,clusterSystems.length);
    setText(clusterPopulatedSummary,clusterSystems.filter(system => system.populated).length);
    setText(clusterHabitableSummary,clusterSystems.filter(system => system.hzBodyCount > 0).length);
  }

  function loadClusterSystem(entry,scroll = true) {
    selectedClusterSeed = entry.seed;
    seedInput.value = entry.seed;
    generateButton.click();
    renderClusterCards();
    if (scroll) $('exo-control-title')?.scrollIntoView({behavior:'smooth',block:'start'});
  }

  function renderClusterCards() {
    const fragment = document.createDocumentFragment();
    for (const entry of clusterSystems) fragment.append(createClusterCard(entry));
    clusterGrid.replaceChildren(fragment);
    updateClusterTotals();
  }

  function createClusterCard(entry) {
    const card = document.createElement('article');
    card.className = 'exo-cluster-card';
    card.classList.toggle('is-selected',entry.seed === selectedClusterSeed);
    card.classList.toggle('is-populated',entry.populated);
    card.dataset.authorityMode = entry.authorityMode || 'generated';

    if (entry.publishedReference) {
      card.dataset.realNeighborhood = 'true';
      card.dataset.catalogName = entry.name;
      card.dataset.stellarMass = String(entry.stellarMassSolar);
      card.dataset.planetaryMass = String(entry.orbitingMassSolar);
      card.dataset.systemMass = String(entry.totalMassSolar);
      card.dataset.distanceLy = String(entry.distanceLy);
    }

    const heading = document.createElement('div');
    heading.className = 'exo-cluster-card-heading';
    const title = document.createElement('h3');
    title.textContent = entry.name;
    const status = document.createElement('span');
    status.className = `exo-population-badge ${entry.populated ? 'populated' : 'unpopulated'}`;
    status.textContent = entry.populated ? 'Known populated' : 'No confirmed population';
    heading.append(title,status);

    const primary = document.createElement('p');
    primary.className = 'exo-cluster-primary';
    primary.textContent = entry.star;

    const metrics = document.createElement('dl');
    metrics.className = 'exo-cluster-metrics';
    const metricRows = entry.publishedReference ? [
      ['Distance',entry.distanceLy ? `${entry.distanceLy.toFixed(3)} ly` : 'Origin'],
      ['Stellar/system mass',`${formatSolarMass(entry.stellarMassSolar)} M☉`],
      ['Confirmed planets',entry.confirmedPlanetCount],
      ['Confirmed orbiting mass',`${formatEarthMass(entry.orbitingMassEarth)} M⊕`]
    ] : [
      ['Planets',entry.planetCount],
      ['HZ planets',entry.hzPlanetCount],
      ['HZ bodies',entry.hzBodyCount],
      ['Habitable worlds',entry.habitableWorlds]
    ];
    for (const [label,value] of metricRows) metrics.append(metric(label,value));

    if (entry.publishedReference) {
      const note = document.createElement('p');
      note.className = 'exo-authority-note';
      const candidateText = entry.candidates?.length
        ? ` ${entry.candidates.length} candidate/disputed record${entry.candidates.length === 1 ? '' : 's'} remain excluded from confirmed totals.`
        : '';
      note.textContent = `Published-first authority. RNG may supplement only unknown fields and must remain labeled hypothetical.${candidateText}`;
      card.append(heading,primary,metrics,note);
    } else {
      card.append(heading,primary,metrics);
    }

    const seed = document.createElement('code');
    seed.className = 'exo-cluster-seed';
    seed.textContent = entry.seed;

    const open = document.createElement('button');
    open.type = 'button';
    open.className = 'bli-action exo-cluster-open';
    if (entry.publishedReference) {
      open.textContent = entry.detailProvider === 'published-sol'
        ? 'Open Published Solar System'
        : entry.confirmedPlanetCount
          ? 'Open Published System Record'
          : 'Open Published Star + RNG Supplement';
      open.title = 'Published values remain authoritative. Generated content is limited to explicitly unknown supplemental fields.';
    } else {
      open.textContent = entry.hzBodyCount > 0 ? 'Expand Habitable-Zone System' : 'Open System';
    }
    open.setAttribute('aria-pressed',String(entry.seed === selectedClusterSeed));
    open.addEventListener('click',() => loadClusterSystem(entry));

    card.addEventListener('dblclick',() => loadClusterSystem(entry));
    card.append(seed,open);
    return card;
  }

  function metric(label,value) {
    const wrapper = document.createElement('div');
    const dt = document.createElement('dt');
    const dd = document.createElement('dd');
    dt.textContent = label;
    dd.textContent = String(value);
    wrapper.append(dt,dd);
    return wrapper;
  }

  function exampleSystems() {
    if (!authority) throw new Error('Blacklight EXO source authority did not load before the cluster controller.');
    return authority.getExampleClusterEntries();
  }

  async function generateCluster(randomize = false) {
    if (buildingCluster || forcingPopulatedSystem) return;
    buildingCluster = true;
    if (generateClusterButton) generateClusterButton.disabled = true;
    if (randomClusterButton) randomClusterButton.disabled = true;

    try {
      if (randomize || !clusterSeedInput.value.trim()) clusterSeedInput.value = createRandomSeed();
      const baseSeed = clusterSeedInput.value.trim();

      if (authority?.isExampleSeed(baseSeed)) {
        if (clusterCount) clusterCount.value = String(authority.getExampleClusterEntries().length);
        clusterSystems = exampleSystems();
        selectedClusterSeed = clusterSystems[0].seed;
        setClusterStatus(`Loading published-first nearby-star authority v${authority.version}…`,'working');
        renderClusterCards();
        loadClusterSystem(clusterSystems[0],false);
        updateCurrentSummary(readCurrentSystemMetadata());
        setClusterStatus(
          `EXAMPLE authority v${authority.version}: published astrometry, stellar properties, confirmed planets, and measured masses take precedence. RNG is restricted to labeled unknown supplements.`,
          'ready'
        );
        return;
      }

      const count = Math.max(2,Math.min(20,Number(clusterCount?.value || 8)));
      const systems = [];
      setClusterStatus(`Generating ${count} selectable star systems…`,'working');
      for (let index=0; index<count; index+=1) {
        const childSeed = `${baseSeed}:system:${index + 1}`;
        seedInput.value = childSeed;
        generateButton.click();
        const metadata = readCurrentSystemMetadata();
        metadata.clusterIndex = index + 1;
        systems.push(metadata);
        setClusterStatus(`Charting system ${index + 1} of ${count}: ${metadata.name}`,'working');
        if ((index + 1) % 2 === 0) await nextFrame();
      }
      clusterSystems = systems;
      selectedClusterSeed = systems[0]?.seed || '';
      renderClusterCards();
      if (systems[0]) {
        loadClusterSystem(systems[0],false);
        updateCurrentSummary(readCurrentSystemMetadata());
      }
      setClusterStatus(`${count} systems charted. Select a system to expand it below.`,'ready');
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
      const currentPublished = authority?.getSystem(seedInput.value.trim());
      const baseSeed = currentPublished ? createRandomSeed() : seedInput.value.trim() || createRandomSeed();
      let found = null;
      for (let attempt=1; attempt<=1200; attempt+=1) {
        const candidateSeed = `${baseSeed}:populated-hz:${attempt}`;
        seedInput.value = candidateSeed;
        generateButton.click();
        const metadata = readCurrentSystemMetadata({inspectHabitablePopulation:true,keepSelection:true});
        if (metadata.populatedHzPlanet) {
          metadata.forced = true;
          found = metadata;
          break;
        }
        if (forcePopulatedButton) forcePopulatedButton.textContent = `Searching Habitable Systems… ${attempt}`;
        if (attempt % 20 === 0) await nextFrame();
      }
      if (!found) {
        setClusterStatus('No populated habitable-zone planet was found within the safety limit. Try again with another seed.','error');
        return;
      }
      selectedClusterSeed = found.seed;
      const existingIndex = clusterSystems.findIndex(item => item.seed === found.seed);
      if (existingIndex >= 0) clusterSystems[existingIndex] = found;
      else clusterSystems.unshift(found);
      renderClusterCards();
      updateCurrentSummary(found);
      setClusterStatus(`${found.name} created with ${found.populatedHzPlanet.name} populated inside the habitable zone (${found.populatedHzPlanet.civilization}).`,'ready');
    } finally {
      forcingPopulatedSystem = false;
      if (forcePopulatedButton) {
        forcePopulatedButton.disabled = false;
        forcePopulatedButton.textContent = originalText;
      }
    }
  }

  function formatSolarMass(value) {
    const number = Number(value) || 0;
    if (number >= 10) return number.toFixed(3);
    if (number >= 1) return number.toFixed(5);
    return number.toFixed(6);
  }

  function formatEarthMass(value) {
    const number = Number(value) || 0;
    if (!number) return '0 confirmed';
    if (number >= 1000) return Math.round(number).toLocaleString();
    if (number >= 10) return number.toFixed(2);
    return number.toFixed(3);
  }

  function setText(node,value) {
    if (node && node.textContent !== String(value)) node.textContent = String(value);
  }

  generateButton.addEventListener('click',() => {
    if (buildingCluster || forcingPopulatedSystem) return;
    queueMicrotask(() => {
      const metadata = readCurrentSystemMetadata();
      selectedClusterSeed = metadata.seed;
      updateCurrentSummary(metadata);
      renderClusterCards();
    });
  });

  generateClusterButton?.addEventListener('click',() => generateCluster(false));
  randomClusterButton?.addEventListener('click',() => generateCluster(true));
  forcePopulatedButton?.addEventListener('click',forcePopulatedHabitableSystem);
  clusterSeedInput?.addEventListener('keydown',event => {
    if (event.key === 'Enter') generateCluster(false);
  });

  updateCurrentSummary(readCurrentSystemMetadata());
  clusterSeedInput.value = authority?.presetSeed || 'EXAMPLE';
  if (clusterCount) clusterCount.value = String(authority?.getExampleClusterEntries().length || 20);
  requestAnimationFrame(() => generateCluster(false));
})();