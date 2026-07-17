(() => {
  'use strict';
  const calculator = globalThis.BlacklightExoJumpCalculator;
  const spatial = globalThis.BlacklightExoClusterSpatial;
  const clusterSection = document.querySelector('.exo-cluster-section');
  if (!calculator || !spatial || !clusterSection || document.getElementById('exo-jump-calculator')) return;

  const NS = 'http://www.w3.org/2000/svg';
  let assignmentMode = 'start';

  const node = (tag, className = '', text = '') => {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text) element.textContent = text;
    return element;
  };
  const svgNode = tag => document.createElementNS(NS, tag);
  const formatNumber = (value, digits = 3) => Number(value || 0).toLocaleString(undefined, {maximumFractionDigits:digits});
  const formatMass = kg => globalThis.BlacklightExoFTL?.format?.massText?.(Number(kg) || 0) || `${formatNumber(kg, 3)} kg`;
  const formatEnergy = joules => globalThis.BlacklightExoFTL?.format?.energyText?.(Number(joules) || 0) || `${formatNumber(joules, 3)} J`;

  function buildInterface() {
    const section = node('section', 'bli-section exo-jump-section');
    section.id = 'exo-jump-calculator';
    const head = node('div', 'bli-section-head');
    head.append(
      node('p', 'bli-eyebrow', 'Charles // cluster jump planning overlay'),
      node('h2', '', 'Select two charted systems and I will estimate the complete transit, fueling, and emergence solution.'),
      node('p', '', 'The calculator uses the generated cluster coordinates and the same FTL family and Path-level models used by the main transit dossier. Published astrometry remains authoritative; procedural coordinates remain deterministic fictional chart data.')
    );

    const controls = node('div', 'exo-jump-controls');
    controls.innerHTML = `
      <label><span>Departure system</span><select id="exo-jump-start"></select></label>
      <label><span>Destination system</span><select id="exo-jump-end"></select></label>
      <label><span>FTL method</span><select id="exo-jump-family"></select></label>
      <label><span>Technology level</span><select id="exo-jump-path"></select></label>
      <div class="exo-jump-assign" role="group" aria-label="Map click assignment">
        <span>Map click assigns</span>
        <button id="exo-jump-assign-start" type="button" aria-pressed="true">Departure</button>
        <button id="exo-jump-assign-end" type="button" aria-pressed="false">Destination</button>
      </div>
      <button id="exo-jump-calculate" class="bli-action primary" type="button">Calculate Jump</button>`;

    const workspace = node('div', 'exo-jump-workspace');
    const mapPanel = node('article', 'exo-jump-map-panel');
    const mapHead = node('header', 'exo-panel-heading');
    mapHead.append(node('div'), node('p', 'exo-jump-map-note', 'Click a point to assign the selected endpoint. Z depth is shown beside each system.'));
    mapHead.firstChild.append(node('p', 'bli-eyebrow', 'Three-dimensional cluster projection'), node('h3', '', 'Jump route geometry'));
    const svg = svgNode('svg');
    svg.id = 'exo-jump-map';
    svg.setAttribute('viewBox', '0 0 900 560');
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', 'Cluster systems and selected jump route');
    mapPanel.append(mapHead, svg);

    const summary = node('aside', 'exo-jump-summary');
    summary.id = 'exo-jump-summary';
    summary.append(node('p', 'bli-eyebrow', 'Charles // route estimate'), node('h3', '', 'Awaiting two endpoints'), node('p', '', 'Select a departure, destination, FTL method, and Path level.'));
    workspace.append(mapPanel, summary);

    const results = node('div', 'exo-jump-results');
    results.id = 'exo-jump-results';
    section.append(head, controls, workspace, results);
    clusterSection.after(section);

    populateMethodControls();
    bindControls();
    refreshSystems();
  }

  function populateMethodControls() {
    const family = document.getElementById('exo-jump-family');
    for (const item of calculator.families) family.add(new Option(item.label, item.key));
    family.value = 'metric-envelope';
    const path = document.getElementById('exo-jump-path');
    for (const item of calculator.pathLevels) path.add(new Option(`Path ${item.rank} · ${item.label}`, item.key));
    path.value = 'p4';
  }

  function bindControls() {
    document.getElementById('exo-jump-calculate').addEventListener('click', calculate);
    for (const id of ['exo-jump-start','exo-jump-end','exo-jump-family','exo-jump-path']) {
      document.getElementById(id).addEventListener('change', () => {
        renderMap();
        if (document.getElementById('exo-jump-start').value && document.getElementById('exo-jump-end').value) calculate();
      });
    }
    document.getElementById('exo-jump-assign-start').addEventListener('click', () => setAssignment('start'));
    document.getElementById('exo-jump-assign-end').addEventListener('click', () => setAssignment('end'));
    document.addEventListener('blacklight:exo-cluster-spatial-updated', refreshSystems);
  }

  function setAssignment(mode) {
    assignmentMode = mode;
    document.getElementById('exo-jump-assign-start').setAttribute('aria-pressed', String(mode === 'start'));
    document.getElementById('exo-jump-assign-end').setAttribute('aria-pressed', String(mode === 'end'));
  }

  function refreshSystems() {
    const systems = spatial.getSystems();
    const start = document.getElementById('exo-jump-start');
    const end = document.getElementById('exo-jump-end');
    const priorStart = start.value;
    const priorEnd = end.value;
    start.replaceChildren();
    end.replaceChildren();
    for (const system of systems) {
      const label = `${system.name} · ${formatNumber(system.distanceLy, 3)} ly from chart origin`;
      start.add(new Option(label, system.seed));
      end.add(new Option(label, system.seed));
    }
    start.value = systems.some(item => item.seed === priorStart) ? priorStart : systems[0]?.seed || '';
    end.value = systems.some(item => item.seed === priorEnd) && priorEnd !== start.value ? priorEnd : systems[1]?.seed || systems[0]?.seed || '';
    renderMap();
    if (systems.length > 1) calculate();
  }

  function bounds(systems) {
    const xs = systems.map(item => item.positionLy.x);
    const ys = systems.map(item => item.positionLy.y);
    const minX = Math.min(...xs, -1), maxX = Math.max(...xs, 1), minY = Math.min(...ys, -1), maxY = Math.max(...ys, 1);
    const span = Math.max(maxX - minX, maxY - minY, 2);
    return {minX:minX - span * .12, maxX:maxX + span * .12, minY:minY - span * .12, maxY:maxY + span * .12};
  }

  function project(position, box) {
    return {
      x:60 + (position.x - box.minX) / (box.maxX - box.minX) * 780,
      y:500 - (position.y - box.minY) / (box.maxY - box.minY) * 440
    };
  }

  function renderMap() {
    const svg = document.getElementById('exo-jump-map');
    if (!svg) return;
    const systems = spatial.getSystems();
    svg.replaceChildren();
    if (!systems.length) return;
    const box = bounds(systems);
    const startSeed = document.getElementById('exo-jump-start')?.value;
    const endSeed = document.getElementById('exo-jump-end')?.value;
    const projected = new Map(systems.map(system => [system.seed, project(system.positionLy, box)]));

    const gridGroup = svgNode('g');
    gridGroup.classList.add('exo-jump-map-grid');
    for (let i = 0; i <= 8; i += 1) {
      const x = 60 + i * 97.5;
      const line = svgNode('line');
      line.setAttribute('x1', x); line.setAttribute('x2', x); line.setAttribute('y1', 40); line.setAttribute('y2', 500);
      gridGroup.append(line);
    }
    for (let i = 0; i <= 5; i += 1) {
      const y = 40 + i * 92;
      const line = svgNode('line');
      line.setAttribute('x1', 60); line.setAttribute('x2', 840); line.setAttribute('y1', y); line.setAttribute('y2', y);
      gridGroup.append(line);
    }
    svg.append(gridGroup);

    const startPoint = projected.get(startSeed);
    const endPoint = projected.get(endSeed);
    if (startPoint && endPoint) {
      const route = svgNode('line');
      route.classList.add('exo-jump-route-line');
      route.setAttribute('x1', startPoint.x); route.setAttribute('y1', startPoint.y); route.setAttribute('x2', endPoint.x); route.setAttribute('y2', endPoint.y);
      svg.append(route);
    }

    for (const system of systems) {
      const point = projected.get(system.seed);
      const group = svgNode('g');
      group.classList.add('exo-jump-system-point');
      if (system.seed === startSeed) group.classList.add('is-start');
      if (system.seed === endSeed) group.classList.add('is-end');
      group.setAttribute('tabindex', '0');
      group.setAttribute('role', 'button');
      group.setAttribute('aria-label', `${system.name}; ${formatNumber(system.positionLy.z, 3)} light-years Z depth`);
      const circle = svgNode('circle');
      circle.setAttribute('cx', point.x); circle.setAttribute('cy', point.y); circle.setAttribute('r', system.seed === startSeed || system.seed === endSeed ? 8 : 5.5);
      const label = svgNode('text');
      label.setAttribute('x', point.x + 10); label.setAttribute('y', point.y - 8); label.textContent = system.name;
      const depth = svgNode('text');
      depth.classList.add('exo-jump-depth-label'); depth.setAttribute('x', point.x + 10); depth.setAttribute('y', point.y + 9); depth.textContent = `z ${formatNumber(system.positionLy.z, 2)} ly`;
      group.append(circle, label, depth);
      const assign = () => {
        const target = document.getElementById(assignmentMode === 'start' ? 'exo-jump-start' : 'exo-jump-end');
        target.value = system.seed;
        setAssignment(assignmentMode === 'start' ? 'end' : 'start');
        if (document.getElementById('exo-jump-start').value !== document.getElementById('exo-jump-end').value) calculate();
        renderMap();
      };
      group.addEventListener('click', assign);
      group.addEventListener('keydown', event => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          assign();
        }
      });
      svg.append(group);
    }
  }

  function card(label, value, detail, state = '') {
    const article = node('article', 'exo-jump-result-card');
    if (state) article.dataset.state = state;
    article.append(node('small', '', label), node('h3', '', value), node('p', '', detail));
    return article;
  }

  function geometryCard(title, estimate) {
    return card(
      title,
      `${formatNumber(estimate.clearanceAU, 6)} AU from ${estimate.systemName}`,
      `Bearing ${formatNumber(estimate.azimuthDeg, 3)}°, elevation ${formatNumber(estimate.elevationDeg, 3)}°. Estimated uncertainty ±${formatNumber(estimate.uncertaintyKm, 2)} km or ±${formatNumber(estimate.angularUncertaintyDeg, 6)}°. ${formatNumber(estimate.certaintyPercent, 1)}% ${estimate.certaintyLabel}. ${estimate.basis}`,
      estimate.certaintyPercent < 55 ? 'warning' : 'ok'
    );
  }

  function renderResult(result) {
    const summary = document.getElementById('exo-jump-summary');
    summary.replaceChildren(
      node('p', 'bli-eyebrow', 'Charles // route estimate'),
      node('h3', '', `${result.start.name} → ${result.end.name}`),
      node('p', '', `${formatNumber(result.centerDistanceLy, 5)} ly barycenter-to-barycenter; ${formatNumber(result.effectiveDistanceLy, 5)} ly between certified entry and exit clearances.`),
      card('Resolved architecture', result.rating.identity?.pathArchitecture || result.rating.identity?.family || result.familyKey, `${result.rating.identity?.pathLevel || result.requestedPathLevelKey}; ${result.rating.identity?.energySystem || result.energy.energyMedium}`),
      card('Route status', result.status, `${formatNumber(result.certainty.percent, 1)}% ${result.certainty.label}. Route-window availability ${formatNumber(result.certainty.routeAvailabilityPercent, 2)}%; modeled activation success ${formatNumber(result.certainty.reliabilityPercent, 6)}%.`, result.range.withinCertifiedSingleJump ? 'ok' : 'warning')
    );

    const results = document.getElementById('exo-jump-results');
    const timing = node('section', 'exo-jump-result-group');
    timing.append(node('h3', '', 'Transit time'),
      card('Spool and route solution', result.timing.spoolText, 'Charge, alignment, destination verification, and final route acceptance before commitment.'),
      card('Payload crossing', result.timing.payloadText, `Crew elapsed estimate: ${result.timing.crewElapsedText}. Discrete methods report transition interval rather than ordinary local velocity.`),
      card('Recovery', result.timing.cooldownText, 'Controlled field collapse, thermal recovery, navigation reconciliation, and wake clearance.'),
      card('Complete mission response', result.timing.completeText, 'The operational time from beginning spool through completed recovery.', 'ok'));

    const energy = node('section', 'exo-jump-result-group');
    energy.append(node('h3', '', 'Energy and fueling'),
      card('Complete mission energy', result.energy.missionText || formatEnergy(result.energy.missionJ), `Peak modeled delivery ${result.energy.peakPowerText}.`),
      card('Minimum active energy medium', formatMass(result.energy.missionFuelKg), `${result.energy.energyMedium}. This excludes containment, tanks, transfer equipment, cooling, shielding, and the generator itself.`),
      card('Recommended departure load', formatMass(result.energy.recommendedFuelKg), `${formatMass(result.energy.reserveFuelKg)} reserved above the modeled mission requirement. Generated tankage supports approximately ${result.energy.tankageCycles} complete cycles.`),
      card('Recharge and thermal recovery', result.energy.rechargeText, `${result.energy.rechargeArchitecture}. Thermal debt ${result.energy.thermalDebtText}.`));

    const geometry = node('section', 'exo-jump-result-group');
    geometry.append(node('h3', '', 'Entry and exit solution'), geometryCard('Estimated entry point', result.entry), geometryCard('Estimated exit point', result.exit),
      card('Certified single-jump range', `${formatNumber(result.range.certifiedRangeLy, 4)} ly`, result.range.withinCertifiedSingleJump ? `The selected route retains ${formatNumber(result.range.marginAU / globalThis.BlacklightExoClusterSpatial.AU_PER_LY, 4)} ly of certified range margin.` : `The direct route exceeds certified range. A minimum of ${result.range.minimumLegs} legs requires intermediate systems, gates, or independently cleared deep-space waypoints.`, result.range.withinCertifiedSingleJump ? 'ok' : 'warning'));

    const notes = node('section', 'exo-jump-result-group exo-jump-notes');
    const list = node('ul');
    for (const item of [...result.corrections, result.warning]) list.append(node('li', '', item));
    notes.append(node('h3', '', 'Charles’s retained cautions'), list);
    results.replaceChildren(timing, energy, geometry, notes);
    renderMap();
  }

  function calculate() {
    const summary = document.getElementById('exo-jump-summary');
    try {
      const result = calculator.calculate({
        startSeed:document.getElementById('exo-jump-start').value,
        endSeed:document.getElementById('exo-jump-end').value,
        familyKey:document.getElementById('exo-jump-family').value,
        pathLevelKey:document.getElementById('exo-jump-path').value
      });
      renderResult(result);
    } catch (error) {
      summary.replaceChildren(node('p', 'bli-eyebrow', 'Charles // route estimate'), node('h3', '', 'Route cannot be calculated'), node('p', '', error.message));
      document.getElementById('exo-jump-results').replaceChildren();
      renderMap();
    }
  }

  buildInterface();
})();
