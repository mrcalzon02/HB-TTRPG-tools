(() => {
  'use strict';
  const $ = id => document.getElementById(id);

  function anchorSection(anchorId) {
    return $(anchorId)?.closest('.bli-section') || $('exo-ftl-mechanism-progression')?.closest('.bli-section') || $('exo-ftl-hierarchy')?.closest('.bli-section');
  }

  function makeSection(id, eyebrow, title, anchorId, className = 'exo-ftl-grid') {
    let container = $(id);
    if (container) return container;
    const anchor = anchorSection(anchorId);
    if (!anchor) return null;
    const section = document.createElement('section');
    section.className = 'bli-section exo-ftl-assembly-section';
    const head = document.createElement('div');
    head.className = 'bli-section-head';
    const small = document.createElement('p');
    small.className = 'bli-eyebrow';
    small.textContent = eyebrow;
    const heading = document.createElement('h2');
    heading.textContent = title;
    container = document.createElement('div');
    container.id = id;
    container.className = className;
    head.append(small, heading);
    section.append(head, container);
    anchor.after(section);
    return container;
  }

  function card(label, title, text, state = '') {
    const article = document.createElement('article');
    article.className = 'exo-ftl-card exo-ftl-assembly-card';
    if (state) article.dataset.assemblyState = state;
    const small = document.createElement('small');
    const heading = document.createElement('h3');
    const paragraph = document.createElement('p');
    small.textContent = label;
    heading.textContent = title;
    paragraph.textContent = text;
    article.append(small, heading, paragraph);
    return article;
  }

  function renderCards(container, rows) {
    if (!container) return;
    container.replaceChildren(...rows.map(row => card(...row)));
  }

  function addBadge(text) {
    const badges = $('exo-ftl-badges');
    if (!badges) return;
    badges.querySelector('[data-assembly-badge="true"]')?.remove();
    const span = document.createElement('span');
    span.dataset.assemblyBadge = 'true';
    span.textContent = text;
    badges.append(span);
  }

  function makeTable(headers, rows, className = '') {
    const wrapper = document.createElement('div');
    wrapper.className = `exo-ftl-assembly-table-wrap ${className}`.trim();
    const table = document.createElement('table');
    table.className = 'exo-ftl-assembly-table';
    const thead = document.createElement('thead');
    const headRow = document.createElement('tr');
    for (const header of headers) {
      const th = document.createElement('th');
      th.scope = 'col';
      th.textContent = header;
      headRow.append(th);
    }
    thead.append(headRow);
    const tbody = document.createElement('tbody');
    for (const row of rows) {
      const tr = document.createElement('tr');
      for (const value of row) {
        const td = document.createElement('td');
        if (value instanceof Node) td.append(value);
        else td.textContent = value;
        tr.append(td);
      }
      tbody.append(tr);
    }
    table.append(thead, tbody);
    wrapper.append(table);
    return wrapper;
  }

  function ratioText(value) {
    return `${Number(value).toLocaleString(undefined, { maximumFractionDigits: 3 })}:1`;
  }

  function percent(value) {
    return `${Number(value).toFixed(value < 0.1 ? 4 : 2)}%`;
  }

  function renderOverview(a) {
    const container = makeSection(
      'exo-ftl-assembly-overview',
      'Construction architecture',
      'Build the complete device as a qualified machine: material burden, reference ratio, production effort, service philosophy, and commissioning standard.',
      'exo-ftl-charles-alternates'
    );
    renderCards(container, [
      ['Assembly doctrine', a.doctrineLabel, a.assemblyPrinciple],
      ['Ratio convention', `Reference: ${a.referenceComponent}`, a.ratioRule],
      ['Installed apparatus', a.totalApparatusMassText, `${a.modeledInstalledVolumeText} modeled installed volume at ${a.installedDensityTonnesM3.toFixed(3)} tonnes/m³.`],
      ['Component architecture', `${a.componentClassCount} classes · ${a.componentCount.toLocaleString()} modeled units`, `${a.interfaceCount} independently qualified subsystem interfaces.`],
      ['Peak assembly load', a.peakPowerText, 'Peak power is allocated independently from mass and volume so the three ratio ledgers are not mistaken for the same physical burden.'],
      ['Production labor', a.productionEstimate.laborHoursText, `${a.productionEstimate.representativeWorkforce.toLocaleString()} representative workers; modeled critical path ${a.productionEstimate.criticalPathText}.`],
      ['Fabrication loss and rework', a.productionEstimate.fabricationAndReworkLossText, `${a.qualityPlan.assemblyLossPercent}% current-stage material loss, failed qualification hardware, machining allowance, and rework.`],
      ['Recommended spares', a.productionEstimate.recommendedSpareMassText, `${a.qualityPlan.spareMassPercent}% installed-mass spare allocation for active surfaces, seals, switches, sensors, and containment sectors.`],
      ['Current construction strategy', `Path ${a.pathLevelRank} · ${a.pathLevelLabel}`, a.currentStageStrategy],
      ['Acceptance campaign', 'Commissioning hold point', a.currentAcceptanceTest]
    ]);
  }

  function renderComponents(a) {
    const container = makeSection(
      'exo-ftl-assembly-components',
      'Bill of materials and subsystem ratios',
      'Every major component class, how much of the machine it represents, where it is installed, and how it compares with the prime reference component.',
      'exo-ftl-assembly-overview',
      'exo-ftl-assembly-stack'
    );
    if (!container) return;
    const ratioRows = a.components.map(component => [
      component.name,
      component.count.toLocaleString(),
      component.massText,
      percent(component.massPercent),
      ratioText(component.ratioToReference.mass),
      component.peakPowerText,
      percent(component.powerPercent),
      component.volumeText,
      percent(component.volumePercent),
      ratioText(component.ratioToReference.volume)
    ]);
    const table = makeTable(
      ['Component', 'Count', 'Mass', 'Mass share', 'Mass vs. reference', 'Peak power', 'Power share', 'Volume', 'Volume share', 'Volume vs. reference'],
      ratioRows,
      'exo-ftl-assembly-wide-table'
    );
    const details = document.createElement('div');
    details.className = 'exo-ftl-grid exo-ftl-assembly-component-details';
    for (const component of a.components) {
      const wear = component.wear[0];
      details.append(card(
        `${component.subsystem} · ${component.count.toLocaleString()} units`,
        component.name,
        `${component.role} Placement: ${component.placement}. Materials: ${component.materials}. Current form: ${component.currentForm} Assembly: ${component.assemblyMethod} Alignment: ${component.alignmentRequirement} Interfaces: ${component.interfaces.join(', ')}. Unit mass ${component.unitMassText}; ratio to ${component.ratioToReference.referenceName}: ${component.ratioToReference.text}. Primary wear: ${wear.name}, ${wear.adjustedLifeText} under current route severity; inspect every ${wear.inspectionIntervalText}. Service access: ${component.serviceAccess}`,
        wear.wearPerTransitPercent > 1 ? 'warning' : 'normal'
      ));
    }
    container.replaceChildren(table, details);
  }

  function renderSequence(a) {
    const container = makeSection(
      'exo-ftl-assembly-sequence',
      'Construction and assembly sequence',
      'Build order, prerequisite interfaces, alignment hold points, inspection records, and the service access that must remain after installation.',
      'exo-ftl-assembly-components',
      'exo-ftl-assembly-sequence-grid'
    );
    if (!container) return;
    container.replaceChildren(...a.assemblySequence.map(step => card(
      `Assembly step ${step.step} · ${step.subsystem}`,
      step.component,
      `Prerequisites: ${step.prerequisites.length ? step.prerequisites.join(', ') : 'foundation, facility utilities, and surveyed reference geometry'}. Procedure: ${step.procedure} Alignment hold point: ${step.alignmentHoldPoint} Quality hold point: ${step.qualityHoldPoint} Downstream interfaces: ${step.downstreamInterfaces.length ? step.downstreamInterfaces.join(', ') : 'final system commissioning'}. Preserve access: ${step.accessRequirement}`
    )));
  }

  function renderInterfaces(a) {
    const container = makeSection(
      'exo-ftl-assembly-interfaces',
      'Qualified mechanical, field, utility, and control interfaces',
      'How subsystem boundaries are joined and why apparently independent components can still create common-mode failure.',
      'exo-ftl-assembly-sequence',
      'exo-ftl-assembly-stack'
    );
    if (!container) return;
    const critical = document.createElement('div');
    critical.className = 'exo-ftl-list-grid';
    const criticalCard = document.createElement('article');
    const heading = document.createElement('h3');
    heading.textContent = 'Non-negotiable integration rules';
    const list = document.createElement('ul');
    for (const rule of a.interfaces.criticalRules) {
      const li = document.createElement('li');
      li.textContent = rule;
      list.append(li);
    }
    criticalCard.append(heading, list);
    critical.append(criticalCard);

    const rows = a.interfaces.edges.map(edge => [
      edge.a,
      edge.b,
      ratioText(edge.massRatio),
      ratioText(edge.powerRatio),
      edge.interfaceRequirement
    ]);
    const table = makeTable(
      ['Subsystem A', 'Subsystem B', 'A:B mass', 'A:B peak power', 'Interface qualification requirement'],
      rows
    );
    container.replaceChildren(critical, table);
  }

  function renderQuality(a) {
    const container = makeSection(
      'exo-ftl-assembly-quality',
      'Fabrication, joining, metrology, and commissioning standard',
      'The current technological stage changes how the same component train is manufactured, aligned, inspected, repaired, and accepted.',
      'exo-ftl-assembly-interfaces'
    );
    renderCards(container, [
      ['Fabrication method', a.pathLevelLabel, a.qualityPlan.fabrication],
      ['Joining and utility interfaces', `${a.qualityPlan.modularityPercent}% modularity`, a.qualityPlan.joining],
      ['Metrology and examination', `${a.qualityPlan.nondestructiveTestCoveragePercent}% nondestructive examination coverage`, a.qualityPlan.metrology],
      ['Commissioning', 'Full-device acceptance', a.qualityPlan.commissioning],
      ['Automation', `${a.qualityPlan.automationPercent}% modeled construction automation`, 'Automation includes fabrication, alignment, test execution, recordkeeping, and corrective calibration; it does not eliminate independent acceptance authority.'],
      ['Tolerance improvement', `${a.qualityPlan.toleranceFactorRelativeToPath0.toExponential(3)}× Path 0 tolerance burden`, 'Lower values represent tighter alignment, timing, phase, cleanliness, surface, and field-geometry error relative to the monumental precursor.'],
      ['Recoverable operating energy', `${a.qualityPlan.energyRecoveryPercent}%`, 'The remainder becomes waste heat, field wake, radiation, sacrificial wear, irreversible state correction, or stored environmental disturbance.']
    ]);
  }

  function renderMaintenance(a) {
    const container = makeSection(
      'exo-ftl-assembly-maintenance',
      'Wear, inspection, overhaul, and replacement estimates',
      'Component life is reduced by the generated route, environmental interference, mission energy, and current technology level rather than assumed to be a fixed catalog value.',
      'exo-ftl-assembly-quality',
      'exo-ftl-assembly-stack'
    );
    if (!container) return;
    const summary = document.createElement('div');
    summary.className = 'exo-ftl-grid';
    summary.append(
      card('Current environment multiplier', a.maintenance.environmentSeverityText, 'Applied to every component life estimate for this generated route and mission.'),
      card('Shortest-life component', a.maintenance.shortestLifeComponent || 'not established', `${a.maintenance.shortestLifeMode || ''}; modeled life ${a.maintenance.shortestLifeText || 'not established'}.`, 'warning'),
      card('Periodic inspection', 'Coordinated condition inspection', a.maintenance.periodicInspection),
      card('Coordinated overhaul', 'Maximum whole-train interval', a.maintenance.overhaul),
      card('Maintenance philosophy', a.pathLevelLabel, a.maintenance.stageMaintenancePhilosophy)
    );
    const rows = a.maintenance.rows.map(row => [
      row.component,
      row.mode,
      percent(row.wearPerTransitPercent),
      row.adjustedLifeText,
      row.operatingTimeText,
      row.inspectionIntervalText,
      row.overhaulIntervalText,
      row.symptoms,
      row.serviceAction,
      row.consequence
    ]);
    const table = makeTable(
      ['Component', 'Wear mode', 'Wear per transit', 'Adjusted life', 'Operating-time equivalent', 'Inspect', 'Overhaul', 'Warning signs', 'Service action', 'Failure consequence'],
      rows,
      'exo-ftl-assembly-wide-table'
    );
    container.replaceChildren(summary, table);
  }

  function renderProgression(a) {
    const container = makeSection(
      'exo-ftl-assembly-progression',
      'Construction progression across Path 0–6',
      'The component train performs the same physical action at every stage; production, ratios, tolerances, service life, modularity, and repair strategy improve around that invariant method.',
      'exo-ftl-assembly-maintenance',
      'exo-ftl-hierarchy'
    );
    if (!container) return;
    container.replaceChildren();
    for (const level of a.stageProgression) {
      const article = document.createElement('article');
      article.className = 'exo-ftl-tier-card exo-ftl-assembly-stage';
      article.dataset.status = level.rank < a.pathLevelRank ? 'mastered precursor' : level.rank === a.pathLevelRank ? 'current capability' : 'future or unavailable';
      const small = document.createElement('small');
      const heading = document.createElement('h3');
      const paragraph = document.createElement('p');
      small.textContent = `Path ${level.rank} · ${level.rank === a.pathLevelRank ? 'current construction standard' : level.rank < a.pathLevelRank ? 'mastered construction standard' : 'future construction standard'}`;
      heading.textContent = level.label;
      paragraph.textContent = `${level.strategy} Representative apparatus ${level.representativeMassText}; ${level.laborHoursText}; ${level.representativeWorkforce.toLocaleString()} workers; critical path ${level.criticalPathText}. Automation ${level.automationPercent}%; modularity ${level.modularityPercent}%; nondestructive examination ${level.ndtCoveragePercent}%; energy recovery ${level.energyRecoveryPercent}%; fabrication and rework loss ${level.assemblyLossPercent}%; spare mass ${level.spareMassPercent}%. Geometric-mean component life ${level.componentLifeText}. Fabrication: ${level.fabrication} Joining: ${level.joining} Metrology: ${level.metrology} Commissioning: ${level.commissioning} Acceptance: ${level.acceptanceTest} Improvement: ${level.improvement}`;
      article.append(small, heading, paragraph);
      container.append(article);
    }
  }

  function renderWarnings(a) {
    const container = makeSection(
      'exo-ftl-assembly-warnings',
      'Construction authority warnings',
      'Conditions that invalidate component ratios, wear estimates, or safe commissioning.',
      'exo-ftl-assembly-progression',
      'exo-ftl-list-grid'
    );
    if (!container) return;
    const article = document.createElement('article');
    const heading = document.createElement('h3');
    const list = document.createElement('ul');
    heading.textContent = 'Do not release the device for service when any statement below is unresolved';
    for (const warning of a.constructionWarnings) {
      const li = document.createElement('li');
      li.textContent = warning;
      list.append(li);
    }
    article.append(heading, list);
    container.replaceChildren(article);
  }

  function render(rating) {
    const a = rating?.constructionAssembly;
    if (!a) return;
    addBadge(`Construction assembly · ${a.componentClassCount} classes`);
    renderOverview(a);
    renderComponents(a);
    renderSequence(a);
    renderInterfaces(a);
    renderQuality(a);
    renderMaintenance(a);
    renderProgression(a);
    renderWarnings(a);
  }

  document.addEventListener('blacklight:exo-ftl-generated', event => render(event.detail?.rating));
  queueMicrotask(() => render(globalThis.BlacklightExoGetActiveFTL?.()));
})();
