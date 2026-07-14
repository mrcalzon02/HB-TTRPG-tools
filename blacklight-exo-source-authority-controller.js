(() => {
  'use strict';

  const $ = id => document.getElementById(id);
  const authority = globalThis.BlacklightExoAuthority;
  const generate = $('exo-generate-system');
  const seedInput = $('exo-seed-input');
  const tableBody = $('exo-orbital-table-body');

  if (!authority || !generate || !seedInput || !tableBody) return;

  let applyQueued = false;

  function scheduleApply() {
    if (applyQueued) return;
    applyQueued = true;
    setTimeout(() => {
      applyQueued = false;
      apply();
    }, 0);
  }

  function apply() {
    const record = authority.getSystem(seedInput.value.trim());
    if (!record) {
      deactivate();
      return;
    }

    document.body.classList.add('exo-source-authority-active');
    const banner = ensureBanner();
    banner.hidden = false;
    banner.dataset.mode = record.detailProvider === 'published-sol' ? 'published' : 'hybrid';
    $('exo-authority-system-name').textContent = record.name;
    $('exo-authority-version').textContent = `Authority ${authority.version}`;
    $('exo-authority-mode').textContent = record.detailProvider === 'published-sol'
      ? 'Published Solar System record'
      : 'Published record with labeled RNG supplements for unknown fields';
    $('exo-authority-summary').textContent = authority.describeProvenance(record);

    setText($('exo-summary-name'),record.name);
    setText($('exo-summary-star'),record.star);
    setText($('exo-summary-planets'),record.confirmedPlanetCount);
    setText($('exo-summary-population'),record.populated ? 'Known populated' : 'No confirmed population');
    setText($('exo-summary-hz-bodies'),record.confirmedHzBodyCount);
    $('exo-summary-population')?.classList.toggle('is-populated',record.populated);
    $('exo-summary-population')?.classList.toggle('is-unpopulated',!record.populated);

    removeLegacyReferencePanels();
    renderPublishedInventory(record);

    if (record.detailProvider === 'published-sol') {
      clearSupplementLabels();
      return;
    }

    setText($('exo-orbit-title'),`${record.name} published-first system record`);
    const note = document.querySelector('.exo-projection-note');
    if (note) {
      note.textContent = 'Published stellar properties and confirmed planets are authoritative. The projection below supplements unknown architecture with deterministic RNG; every generated object is explicitly labeled hypothetical and must not be interpreted as a detection.';
    }
    labelGeneratedRows();
    prependAuthorityFeatures(record);
  }

  function ensureBanner() {
    let banner = $('exo-source-authority-banner');
    if (banner) return banner;
    banner = document.createElement('section');
    banner.id = 'exo-source-authority-banner';
    banner.className = 'exo-source-authority-banner';
    banner.innerHTML = `
      <div>
        <span id="exo-authority-version">Authority</span>
        <strong id="exo-authority-system-name">System</strong>
      </div>
      <div>
        <strong id="exo-authority-mode">Published-first record</strong>
        <p id="exo-authority-summary"></p>
      </div>
    `;
    document.querySelector('.exo-control-section')?.insertAdjacentElement('afterend',banner);
    return banner;
  }

  function renderPublishedInventory(record) {
    let section = $('exo-published-inventory');
    if (!section) {
      section = document.createElement('section');
      section.id = 'exo-published-inventory';
      section.className = 'bli-section exo-published-inventory';
      document.querySelector('.exo-system-workspace')?.insertAdjacentElement('afterend',section);
    }

    const sourceLabels = record.sources
      .map(id => authority.sources[id]?.label || id)
      .join(' · ');
    section.innerHTML = '';
    const heading = document.createElement('div');
    heading.className = 'bli-section-head';
    const eyebrow = document.createElement('p');
    eyebrow.className = 'bli-eyebrow';
    eyebrow.textContent = 'Unified source authority';
    const title = document.createElement('h2');
    title.textContent = `${record.name}: published system inventory`;
    const explanation = document.createElement('p');
    explanation.textContent = record.confirmedPlanetCount
      ? `${record.confirmedPlanetCount} confirmed planet${record.confirmedPlanetCount === 1 ? '' : 's'} are authoritative. Candidate records are separated and excluded from confirmed counts and gravity totals.`
      : 'No planet is treated as confirmed in the current authority record. Any displayed generated worlds are hypothetical supplements, not detections.';
    heading.append(eyebrow,title,explanation);
    section.append(heading);

    const facts = document.createElement('dl');
    facts.className = 'exo-authority-facts';
    addFact(facts,'Distance',record.astrometry.distanceLy ? `${record.astrometry.distanceLy.toFixed(3)} light-years` : 'Heliocentric origin');
    addFact(facts,'Stellar system',record.star);
    addFact(facts,'Published stellar/system mass',`${formatMass(record.stellarMassSolar)} M☉`);
    addFact(facts,'Confirmed orbiting mass',record.confirmedOrbitingMassEarth ? `${formatEarthMass(record.confirmedOrbitingMassEarth)} M⊕` : 'No confirmed mass included');
    addFact(facts,'Composition evidence',record.composition || 'Unknown');
    addFact(facts,'Source families',sourceLabels);
    section.append(facts);

    const grid = document.createElement('div');
    grid.className = 'exo-published-planet-grid';
    for (const planet of record.confirmedPlanets || []) grid.append(planetCard(planet,'confirmed'));
    for (const candidate of record.candidates || []) grid.append(planetCard(candidate,'candidate'));
    if (!grid.children.length) {
      const empty = document.createElement('p');
      empty.className = 'exo-authority-empty';
      empty.textContent = 'No confirmed or candidate planetary record is included for this system. RNG supplements may be shown below only to support fictional scenario development.';
      grid.append(empty);
    }
    section.append(grid);
  }

  function planetCard(planet,status) {
    const article = document.createElement('article');
    article.className = `exo-published-planet-card ${status}`;
    const label = document.createElement('span');
    label.textContent = status === 'confirmed' ? 'Confirmed published record' : 'Candidate / disputed — excluded';
    const title = document.createElement('h3');
    title.textContent = planet.name || 'Unresolved candidate record';
    const list = document.createElement('dl');
    const fields = [
      ['Host',planet.host],
      ['Period',Number.isFinite(planet.periodDays) ? `${planet.periodDays.toLocaleString()} days` : null],
      ['Semi-major axis',Number.isFinite(planet.semiMajorAu) ? `${planet.semiMajorAu} AU` : null],
      ['Mass',Number.isFinite(planet.massEarth) ? `${planet.massEarth} M⊕ (${planet.massType || 'published'})` : planet.massType],
      ['Habitable-zone relation',planet.hz === true ? 'Within or near conventional HZ' : planet.hz === false ? 'Outside conventional HZ' : null],
      ['Status',planet.status],
      ['Treatment',planet.treatment]
    ];
    for (const [key,value] of fields) if (value !== undefined && value !== null && value !== '') addFact(list,key,value);
    article.append(label,title,list);
    return article;
  }

  function labelGeneratedRows() {
    for (const row of tableBody.querySelectorAll('tr')) {
      const orbit = row.cells?.[0]?.textContent.trim() || '';
      if (!/^\d+(?:\.\d+)?$/.test(orbit) && !/^B\d+$/i.test(orbit)) continue;
      row.classList.add('exo-rng-supplement-row');
      row.dataset.provenance = 'rng-supplement';
      const classCell = row.cells?.[2];
      if (classCell && !/^RNG supplement ·/i.test(classCell.textContent)) {
        classCell.textContent = `RNG supplement · ${classCell.textContent}`;
      }
      const button = row.querySelector('button');
      if (button) button.title = 'Hypothetical deterministic supplement. This object is not part of the published confirmed inventory.';
    }
  }

  function clearSupplementLabels() {
    for (const row of tableBody.querySelectorAll('.exo-rng-supplement-row')) {
      row.classList.remove('exo-rng-supplement-row');
      delete row.dataset.provenance;
      const classCell = row.cells?.[2];
      if (classCell) classCell.textContent = classCell.textContent.replace(/^RNG supplement ·\s*/i,'');
    }
  }

  function prependAuthorityFeatures(record) {
    const list = $('exo-system-features');
    if (!list) return;
    for (const old of list.querySelectorAll('[data-authority-feature]')) old.remove();
    const features = [
      `Published-first authority ${authority.version} is active for ${record.name}.`,
      `${record.confirmedPlanetCount} confirmed planet${record.confirmedPlanetCount === 1 ? '' : 's'}; ${record.candidates.length} candidate/disputed record${record.candidates.length === 1 ? '' : 's'}.`,
      'Procedural objects are hypothetical supplements and cannot replace published values.'
    ];
    for (const text of features.reverse()) {
      const item = document.createElement('li');
      item.dataset.authorityFeature = 'true';
      item.textContent = text;
      list.prepend(item);
    }
  }

  function removeLegacyReferencePanels() {
    document.querySelectorAll('.exo-real-reference-facts,#exo-example-provenance').forEach(node => node.remove());
  }

  function deactivate() {
    document.body.classList.remove('exo-source-authority-active');
    const banner = $('exo-source-authority-banner');
    if (banner) banner.hidden = true;
    const inventory = $('exo-published-inventory');
    if (inventory) inventory.hidden = true;
    clearSupplementLabels();
  }

  function addFact(container,label,value) {
    const dt = document.createElement('dt');
    const dd = document.createElement('dd');
    dt.textContent = label;
    dd.textContent = String(value);
    container.append(dt,dd);
  }

  function formatMass(value) {
    const number = Number(value) || 0;
    return number >= 1 ? number.toFixed(5) : number.toFixed(6);
  }

  function formatEarthMass(value) {
    const number = Number(value) || 0;
    return number >= 1000 ? Math.round(number).toLocaleString() : number >= 10 ? number.toFixed(2) : number.toFixed(3);
  }

  function setText(node,value) {
    if (node && node.textContent !== String(value)) node.textContent = String(value);
  }

  generate.addEventListener('click',scheduleApply);
  seedInput.addEventListener('change',scheduleApply);
  document.addEventListener('blacklight:source-authority-ready',scheduleApply);
  scheduleApply();
})();