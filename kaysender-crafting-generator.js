(() => {
  const MANIFEST_URL = 'data/kaysender/generators/crafting/crafting-generator.json';
  const MODULE_DEFAULTS = {
    'crafting-gadget-creator': { label: 'Launch Crafting Generator', mode: 'all' },
    'airship-core-builder': { label: 'Launch Ship Systems Builder', mode: 'ship-core' }
  };
  let dataPromise;
  let latestProjects = [];

  function choice(list) {
    if (!Array.isArray(list) || !list.length) return null;
    return list[Math.floor(Math.random() * list.length)];
  }

  function rollDie(sides = 20) {
    return Math.floor(Math.random() * sides) + 1;
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function titleCase(value) {
    return String(value || '').replace(/-/g, ' ').replace(/\b\w/g, letter => letter.toUpperCase());
  }

  function injectStyles() {
    if (document.getElementById('kaysender-crafting-style')) return;
    const style = document.createElement('style');
    style.id = 'kaysender-crafting-style';
    style.textContent = `
      .crafting-launch { margin-top: 10px; width: 100%; }
      .crafting-panel { border: 1px solid var(--line); border-radius: 24px; padding: 22px; margin: 18px 0 28px; background: linear-gradient(180deg, rgba(255,255,255,.06), rgba(255,255,255,.025)); box-shadow: var(--shadow); }
      .crafting-panel input, .crafting-panel select { background: #10131a; border: 1px solid var(--line); color: var(--ink); border-radius: 12px; padding: 10px 12px; width: 100%; }
      .crafting-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; margin: 14px 0; }
      .crafting-actions { display: flex; flex-wrap: wrap; gap: 10px; margin: 12px 0; }
      .crafting-output { display: grid; gap: 14px; margin-top: 16px; }
      .crafting-card { border: 1px solid rgba(200,138,53,.4); border-radius: 18px; padding: 16px; background: rgba(0,0,0,.2); }
      .crafting-card h4 { margin: 0 0 4px; color: var(--accent); }
      .crafting-card .crafting-subtitle { color: var(--muted); margin-bottom: 12px; }
      .crafting-kv { display: grid; grid-template-columns: 190px 1fr; gap: 10px; border-top: 1px solid rgba(255,255,255,.08); padding: 8px 0; }
      .crafting-kv strong { color: var(--ink); }
      .crafting-warning { border-color: rgba(155,63,63,.75); }
      .crafting-success { border-color: rgba(131,179,109,.75); }
      .crafting-note { color: var(--muted); line-height: 1.5; }
      .crafting-checkbox { display: flex; align-items: center; gap: 8px; min-height: 42px; }
      .crafting-checkbox input { width: auto; }
      @media (max-width: 1050px) { .crafting-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
      @media (max-width: 700px) { .crafting-grid, .crafting-kv { grid-template-columns: 1fr; } }
    `;
    document.head.appendChild(style);
  }

  async function fetchJson(url) {
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) throw new Error(`${url} returned ${response.status}`);
    return response.json();
  }

  function loadData() {
    if (!dataPromise) {
      dataPromise = fetchJson(MANIFEST_URL).then(async manifest => {
        const packs = await Promise.all((manifest.packs || []).map(fetchJson));
        const templates = packs.flatMap(pack => pack.templates || []);
        const modifiers = packs.reduce((combined, pack) => {
          Object.entries(pack).forEach(([key, value]) => {
            if (['setting', 'schemaVersion', 'templates'].includes(key)) return;
            combined[key] = Array.isArray(value) ? [...(combined[key] || []), ...value] : value;
          });
          return combined;
        }, {});
        return { ...manifest, templates, ...modifiers };
      });
    }
    return dataPromise;
  }

  function decorateCards() {
    injectStyles();
    document.querySelectorAll('.module-card').forEach(card => {
      const moduleId = card.dataset.moduleId;
      const config = MODULE_DEFAULTS[moduleId];
      if (!config || card.dataset.craftingReady === 'true') return;
      const button = document.createElement('button');
      button.className = 'secondary-action crafting-launch';
      button.type = 'button';
      button.textContent = config.label;
      button.addEventListener('click', () => openGenerator(moduleId, config.mode, card.querySelector('h3')?.textContent || titleCase(moduleId)));
      card.appendChild(button);
      card.dataset.craftingReady = 'true';
    });
  }

  function switchKaysenderView() {
    document.querySelectorAll('.view').forEach(view => view.classList.toggle('active', view.id === 'kaysender'));
    document.querySelectorAll('.nav-button').forEach(button => button.classList.toggle('active', button.dataset.view === 'kaysender'));
  }

  async function openGenerator(moduleId, defaultMode, title) {
    const dashboard = document.getElementById('kaysender');
    const status = document.getElementById('kaysender-status');
    const target = dashboard || document.querySelector('main');
    if (!target) return;

    let panel = document.getElementById('kaysender-alpha-panel');
    if (!panel) {
      panel = document.createElement('section');
      panel.id = 'kaysender-alpha-panel';
      if (status) status.insertAdjacentElement('afterend', panel);
      else target.prepend(panel);
    }
    panel.className = 'crafting-panel no-print';
    panel.innerHTML = '';

    const header = document.createElement('div');
    header.className = 'section-heading';
    const eyebrow = document.createElement('p');
    eyebrow.className = 'eyebrow';
    eyebrow.textContent = 'Hypertext d20 crafting engine';
    const heading = document.createElement('h2');
    heading.textContent = title;
    const intro = document.createElement('p');
    intro.textContent = 'Generate complete equipment and ship-system recipes, then optionally simulate research, construction, material loss, flaws, and final testing under the converted Kaysender invention rules.';
    const loading = document.createElement('p');
    loading.className = 'crafting-note';
    loading.textContent = 'Loading equipment, ship module, material, power, flaw, and project tables…';
    header.append(eyebrow, heading, intro);
    panel.append(header, loading);
    switchKaysenderView();
    panel.scrollIntoView({ behavior: 'smooth', block: 'start' });

    try {
      const data = await loadData();
      if (!panel.contains(loading)) return;
      loading.remove();
      renderControls(panel, data, defaultMode, moduleId);
    } catch (error) {
      loading.textContent = `Crafting generator data could not be loaded: ${error.message}`;
    }
  }

  function fillSelect(select, options) {
    select.innerHTML = '';
    options.forEach(entry => {
      const option = document.createElement('option');
      option.value = entry.value;
      option.textContent = entry.label;
      select.appendChild(option);
    });
  }

  function renderControls(panel, data, defaultMode, moduleId) {
    const grid = document.createElement('div');
    grid.className = 'crafting-grid';
    grid.innerHTML = `
      <label>Project family<select data-craft="mode"></select></label>
      <label>Specific pattern<select data-craft="template"></select></label>
      <label>Complexity<select data-craft="complexity"></select></label>
      <label>Material quality<select data-craft="quality"></select></label>
      <label>Facility<select data-craft="facility"></select></label>
      <label>Crafter skill bonus<input data-craft="skill" type="number" min="-5" max="40" value="8"></label>
      <label>Qualified primary crafters<input data-craft="team" type="number" min="1" max="12" value="1"></label>
      <label>Aid-another bonus<input data-craft="assist" type="number" min="0" max="8" value="2"></label>
      <label>Projects to generate<input data-craft="count" type="number" min="1" max="8" value="1"></label>
      <label class="crafting-checkbox"><input data-craft="simulate" type="checkbox" checked> Simulate research, construction, and testing</label>
    `;

    const modeSelect = grid.querySelector('[data-craft="mode"]');
    const templateSelect = grid.querySelector('[data-craft="template"]');
    const complexitySelect = grid.querySelector('[data-craft="complexity"]');
    const qualitySelect = grid.querySelector('[data-craft="quality"]');
    const facilitySelect = grid.querySelector('[data-craft="facility"]');

    fillSelect(modeSelect, data.generatorModes.map(mode => ({ value: mode.id, label: mode.label })));
    modeSelect.value = data.generatorModes.some(mode => mode.id === defaultMode) ? defaultMode : 'all';
    fillSelect(complexitySelect, [
      { value: 'appropriate', label: 'Pattern-appropriate complexity' },
      ...data.complexities.map(entry => ({ value: entry.id, label: `${entry.label} — DC ${entry.dc}, ${entry.workUnits} base work unit${entry.workUnits === 1 ? '' : 's'}` }))
    ]);
    fillSelect(qualitySelect, data.qualities.map(entry => ({ value: entry.id, label: entry.label })));
    qualitySelect.value = 'common';
    fillSelect(facilitySelect, data.facilities.map(entry => ({ value: entry.id, label: `${entry.label} (${entry.modifier >= 0 ? '+' : ''}${entry.modifier})` })));
    facilitySelect.value = moduleId === 'airship-core-builder' ? 'specialized' : 'proper';

    const updateTemplates = () => {
      const filtered = templatesForMode(data.templates, modeSelect.value);
      fillSelect(templateSelect, [
        { value: 'random', label: `Random matching pattern (${filtered.length})` },
        ...filtered.map(template => ({ value: template.id, label: `${template.label} — ${template.category}` }))
      ]);
    };
    modeSelect.addEventListener('change', updateTemplates);
    updateTemplates();

    const note = document.createElement('p');
    note.className = 'crafting-note';
    note.textContent = 'Work units represent eight hours of productive labor by one qualified primary crafter. Up to three assistants may normally contribute aid another; the simulator treats the entered aid bonus as already resolved.';

    const actions = document.createElement('div');
    actions.className = 'crafting-actions';
    const generate = document.createElement('button');
    generate.type = 'button';
    generate.className = 'primary-action';
    generate.textContent = 'Generate Crafting Projects';
    const exportButton = document.createElement('button');
    exportButton.type = 'button';
    exportButton.className = 'secondary-action';
    exportButton.textContent = 'Export Generated JSON';
    exportButton.disabled = true;
    actions.append(generate, exportButton);

    const output = document.createElement('div');
    output.className = 'crafting-output';
    panel.append(grid, note, actions, output);

    generate.addEventListener('click', () => {
      const controls = {
        mode: modeSelect.value,
        templateId: templateSelect.value,
        complexityId: complexitySelect.value,
        qualityId: qualitySelect.value,
        facilityId: facilitySelect.value,
        skillBonus: clamp(Number(grid.querySelector('[data-craft="skill"]')?.value || 0), -5, 40),
        teamSize: clamp(Number(grid.querySelector('[data-craft="team"]')?.value || 1), 1, 12),
        assistBonus: clamp(Number(grid.querySelector('[data-craft="assist"]')?.value || 0), 0, 8),
        count: clamp(Number(grid.querySelector('[data-craft="count"]')?.value || 1), 1, 8),
        simulate: Boolean(grid.querySelector('[data-craft="simulate"]')?.checked)
      };
      latestProjects = [];
      output.innerHTML = '';
      for (let index = 0; index < controls.count; index += 1) {
        const project = generateProject(data, controls);
        latestProjects.push(project);
        output.appendChild(renderProjectCard(project));
      }
      exportButton.disabled = !latestProjects.length;
    });

    exportButton.addEventListener('click', () => {
      if (!latestProjects.length) return;
      downloadJson(`kaysender-crafting-projects-${new Date().toISOString().slice(0, 10)}.json`, {
        setting: data.setting,
        ruleset: data.ruleset,
        schemaVersion: data.schemaVersion,
        generatedAt: new Date().toISOString(),
        projects: latestProjects
      });
    });
  }

  function templatesForMode(templates, mode) {
    if (mode === 'all') return templates;
    return templates.filter(template => template.mode === mode);
  }

  function findById(list, id) {
    return list.find(entry => entry.id === id);
  }

  function complexityIndex(data, id) {
    return data.complexities.findIndex(entry => entry.id === id);
  }

  function selectComplexity(data, template, requestedId) {
    const minimumIndex = Math.max(0, complexityIndex(data, template.minimumComplexity));
    const defaultIndex = Math.max(minimumIndex, complexityIndex(data, template.defaultComplexity));
    if (requestedId === 'appropriate') return data.complexities[defaultIndex];
    const requestedIndex = Math.max(0, complexityIndex(data, requestedId));
    return data.complexities[Math.max(minimumIndex, requestedIndex)];
  }

  function matchingMaterial(data, template) {
    const matches = (data.materialSets || []).filter(material => material.tags?.some(tag => template.materialTags?.includes(tag)));
    return choice(matches) || choice(data.materialSets) || { label: 'appropriate common materials', tags: [] };
  }

  function matchingPower(data, template) {
    const matches = (data.powerSources || []).filter(power => template.powerTags?.includes(power.id));
    return choice(matches) || choice(data.powerSources) || { label: 'no dedicated power source', maintenance: 'Inspect during normal maintenance.' };
  }

  function roundPrice(value) {
    if (value < 100) return Math.max(1, Math.round(value));
    if (value < 1000) return Math.round(value / 5) * 5;
    if (value < 10000) return Math.round(value / 50) * 50;
    return Math.round(value / 500) * 500;
  }

  function formatMoney(value) {
    return `${Math.max(0, Math.round(value)).toLocaleString()} gp`;
  }

  function generateProject(data, controls) {
    const pool = templatesForMode(data.templates, controls.mode);
    const template = controls.templateId === 'random'
      ? choice(pool)
      : pool.find(entry => entry.id === controls.templateId) || choice(pool) || choice(data.templates);
    const complexity = selectComplexity(data, template, controls.complexityId);
    const defaultComplexity = findById(data.complexities, template.defaultComplexity) || complexity;
    const quality = findById(data.qualities, controls.qualityId) || data.qualities[1];
    const facility = findById(data.facilities, controls.facilityId) || data.facilities[1];
    const scale = findById(data.scales, template.scale) || data.scales[0];
    const material = matchingMaterial(data, template);
    const power = matchingPower(data, template);
    const effect = choice(template.effects) || 'Provides a practical function appropriate to the pattern.';
    const ratio = complexity.priceMultiplier / Math.max(0.25, defaultComplexity.priceMultiplier);
    const commonMarketPrice = roundPrice(template.baseMarketPrice * ratio * scale.priceMultiplier);
    const marketPrice = roundPrice(commonMarketPrice * quality.saleMultiplier);
    const rawMaterialCost = roundPrice((commonMarketPrice / 3) * quality.materialMultiplier);
    const workUnits = Math.max(1, Math.ceil(complexity.workUnits * scale.workMultiplier * quality.workMultiplier));
    const plannedDays = Math.max(1, Math.ceil(workUnits / controls.teamSize));
    const selectedComplexityIndex = complexityIndex(data, complexity.id);
    const defaultComplexityIndex = complexityIndex(data, template.defaultComplexity);
    const improvementCount = clamp(Math.max(0, selectedComplexityIndex - defaultComplexityIndex) + (quality.id === 'exceptional' ? 1 : 0), 0, 3);
    const improvements = uniqueChoices(data.improvements || [], improvementCount);
    const automaticMinorFlaws = uniqueChoices(data.minorFlaws || [], quality.automaticFlaws || 0);
    const forcedMajorFlaw = template.id === 'salvaged-unknown-core' ? [choice(data.majorFlaws)] : [];
    const name = `${choice(data.modelPrefixes) || 'Kaysender'} ${template.label} — ${choice(data.modelSuffixes) || 'Workshop Pattern'}`;
    const manufacturer = choice(data.manufacturers) || 'independent workshop';
    const legalStatus = choice(data.legalStatuses) || 'unclassified equipment';
    const complication = choice(data.complications) || 'no unusual complication recorded';
    const weightMultiplier = quality.id === 'improvised' ? 1.15 : quality.id === 'fine' ? 0.95 : quality.id === 'exceptional' ? 0.85 : 1;
    const weight = Math.max(0.1, Math.round(template.baseWeight * weightMultiplier * 10) / 10);

    const project = {
      id: `${template.id}-${Date.now()}-${Math.floor(Math.random() * 100000)}`,
      name,
      manufacturer,
      ruleset: data.ruleset,
      generatorStatus: 'alpha-playtest-draft',
      templateId: template.id,
      mode: template.mode,
      category: template.category,
      scale: scale.label,
      slotUse: template.slotUse,
      quality: quality.label,
      complexity: complexity.label,
      projectDC: complexity.dc,
      minimumRecommendedLevel: complexity.minimumLevel,
      workUnits,
      plannedWorkDays: plannedDays,
      qualifiedPrimaryCrafters: controls.teamSize,
      marketPrice,
      rawMaterialCost,
      weightPounds: weight,
      primaryConstructionSkill: template.primarySkill,
      researchSkill: template.researchSkill,
      testingSkill: template.testSkill,
      facility: facility.label,
      facilityModifier: facility.modifier,
      qualityBuildModifier: quality.buildModifier,
      activation: template.activation,
      effect,
      materials: material.label,
      materialTags: material.tags || [],
      powerSource: power.label,
      powerMaintenance: power.maintenance,
      maintenance: template.maintenance,
      restrictions: template.restrictions,
      legalStatus,
      plannedImprovements: improvements,
      potentialMinorFlaws: automaticMinorFlaws,
      potentialMajorFlaws: forcedMajorFlaw.filter(Boolean),
      projectComplication: complication,
      constructionAssumptions: {
        crafterSkillBonus: controls.skillBonus,
        aidAnotherBonus: controls.assistBonus,
        qualityModifier: quality.buildModifier,
        facilityModifier: facility.modifier
      }
    };

    if (controls.simulate) {
      project.simulation = simulateProject(project, data, controls, quality, facility);
      project.potentialMinorFlaws.push(...project.simulation.minorFlaws);
      project.potentialMajorFlaws.push(...project.simulation.majorFlaws);
    }

    project.potentialMinorFlaws = [...new Set(project.potentialMinorFlaws.filter(Boolean))];
    project.potentialMajorFlaws = [...new Set(project.potentialMajorFlaws.filter(Boolean))];
    project.wikiDraft = makeWikiDraft(project);
    return project;
  }

  function uniqueChoices(list, count) {
    const available = [...list];
    const results = [];
    while (available.length && results.length < count) {
      const index = Math.floor(Math.random() * available.length);
      results.push(available.splice(index, 1)[0]);
    }
    return results;
  }

  function simulateProject(project, data, controls, quality, facility) {
    const researchRoll = rollDie();
    const researchTotal = researchRoll + controls.skillBonus + controls.assistBonus + facility.modifier;
    let researchModifier = 0;
    if (researchTotal >= project.projectDC + 5) researchModifier = 4;
    else if (researchTotal >= project.projectDC) researchModifier = 2;
    else if (researchTotal <= project.projectDC - 5) researchModifier = -2;

    let completed = 0;
    let attempts = 0;
    let replacementCost = 0;
    let minorFailureCount = 0;
    let majorFailureCount = 0;
    const maxAttempts = project.workUnits * 6 + 20;
    while (completed < project.workUnits && attempts < maxAttempts) {
      attempts += 1;
      const total = rollDie() + controls.skillBonus + controls.assistBonus + facility.modifier + quality.buildModifier + (attempts === 1 ? researchModifier : 0);
      if (total >= project.projectDC) {
        completed += 1 + Math.floor((total - project.projectDC) / 5);
      } else {
        const failureMargin = project.projectDC - total;
        if (failureMargin >= 10) {
          majorFailureCount += 1;
          replacementCost += project.rawMaterialCost * 0.25;
        } else if (failureMargin >= 5) {
          minorFailureCount += 1;
          replacementCost += project.rawMaterialCost * 0.1;
        } else {
          replacementCost += project.rawMaterialCost * 0.1;
        }
      }
    }

    const testRoll = rollDie();
    const testTotal = testRoll + controls.skillBonus + controls.assistBonus + facility.modifier + quality.testModifier;
    const testMargin = testTotal - project.projectDC;
    if (testMargin < 0) minorFailureCount += 1;
    if (testMargin <= -5) majorFailureCount += 1;
    const minorFlaws = uniqueChoices(data.minorFlaws || [], Math.min(3, minorFailureCount));
    const majorFlaws = uniqueChoices(data.majorFlaws || [], Math.min(2, majorFailureCount));
    const actualDays = Math.max(1, Math.ceil(attempts / controls.teamSize));
    const completedSuccessfully = completed >= project.workUnits && testTotal >= project.projectDC;

    return {
      completedSuccessfully,
      research: { die: researchRoll, total: researchTotal, dc: project.projectDC, constructionModifier: researchModifier },
      construction: {
        checksAttempted: attempts,
        workUnitsCompleted: Math.min(completed, project.workUnits),
        workUnitsRequired: project.workUnits,
        calendarDays: actualDays,
        replacementMaterialCost: roundPrice(replacementCost)
      },
      testing: { die: testRoll, total: testTotal, dc: project.projectDC, margin: testMargin },
      minorFlaws,
      majorFlaws,
      finalMaterialCost: roundPrice(project.rawMaterialCost + replacementCost),
      result: completedSuccessfully
        ? testMargin >= 5 ? 'Exceptional validated prototype' : 'Validated working prototype'
        : completed < project.workUnits ? 'Construction stalled before completion' : 'Completed prototype failed final validation'
    };
  }

  function makeWikiDraft(project) {
    return {
      id: project.id,
      title: project.name,
      category: project.mode.startsWith('ship') ? 'Ships' : 'Equipment',
      summary: `${project.quality} ${project.category.toLowerCase()} generated under the Hypertext d20-compatible Kaysender invention system.`,
      body: [
        `${project.name} is a ${project.scale.toLowerCase()} pattern attributed to ${project.manufacturer}.`,
        project.effect,
        `Construction requires ${project.workUnits} work units at DC ${project.projectDC}, ${formatMoney(project.rawMaterialCost)} in planned raw materials, and ${project.primaryConstructionSkill}.`
      ],
      sections: [
        { heading: 'Operation', sectionType: 'conversion-note', body: [project.activation, project.restrictions] },
        { heading: 'Construction profile', sectionType: 'builder-note', body: [`Materials: ${project.materials}.`, `Power: ${project.powerSource}.`, `Maintenance: ${project.maintenance}`] }
      ],
      sourceStatus: 'derived-tool-output',
      tags: [project.category, project.mode, project.complexity, 'crafting generator', 'Hypertext d20'],
      relatedEntries: ['invention-system'],
      relatedModules: ['crafting-gadget-creator', project.mode.startsWith('ship') ? 'airship-core-builder' : 'shop-market-generator']
    };
  }

  function renderProjectCard(project) {
    const card = document.createElement('article');
    const simulationClass = project.simulation
      ? project.simulation.completedSuccessfully ? 'crafting-success' : 'crafting-warning'
      : '';
    card.className = `crafting-card ${simulationClass}`.trim();
    const heading = document.createElement('h4');
    heading.textContent = project.name;
    const subtitle = document.createElement('div');
    subtitle.className = 'crafting-subtitle';
    subtitle.textContent = `${project.category} · ${project.scale} · ${project.quality} · ${project.complexity}`;
    card.append(heading, subtitle);

    const rows = [
      ['Manufacturer or workshop', project.manufacturer],
      ['Rules status', `${project.ruleset}; ${project.generatorStatus}`],
      ['Operation', project.activation],
      ['Primary effect', project.effect],
      ['Restrictions', project.restrictions],
      ['Project difficulty', `DC ${project.projectDC}; minimum recommended character level ${project.minimumRecommendedLevel}`],
      ['Labor plan', `${project.workUnits} work units; approximately ${project.plannedWorkDays} day(s) with ${project.qualifiedPrimaryCrafters} qualified primary crafter(s)`],
      ['Construction skills', `${project.primaryConstructionSkill}; research ${project.researchSkill}; testing ${project.testingSkill}`],
      ['Facility and modifiers', `${project.facility} (${signed(project.facilityModifier)}); quality modifier ${signed(project.qualityBuildModifier)}`],
      ['Materials', `${project.materials}; planned raw-material cost ${formatMoney(project.rawMaterialCost)}`],
      ['Market price', `${formatMoney(project.marketPrice)} draft sale value`],
      ['Weight and installation', `${project.weightPounds.toLocaleString()} lb.; ${project.slotUse}`],
      ['Power source', project.powerSource],
      ['Maintenance', `${project.maintenance} ${project.powerMaintenance}`],
      ['Legal status', project.legalStatus],
      ['Project complication', project.projectComplication],
      ['Planned improvements', project.plannedImprovements.length ? project.plannedImprovements.join('; ') : 'None included in the base pattern'],
      ['Minor flaws', project.potentialMinorFlaws.length ? project.potentialMinorFlaws.join('; ') : 'No known minor flaw'],
      ['Major flaws', project.potentialMajorFlaws.length ? project.potentialMajorFlaws.join('; ') : 'No known major flaw']
    ];

    if (project.simulation) {
      rows.push(
        ['Simulated result', project.simulation.result],
        ['Research roll', `${project.simulation.research.die} on the die; total ${project.simulation.research.total} vs DC ${project.simulation.research.dc}; first construction modifier ${signed(project.simulation.research.constructionModifier)}`],
        ['Construction simulation', `${project.simulation.construction.checksAttempted} checks across ${project.simulation.construction.calendarDays} day(s); ${project.simulation.construction.workUnitsCompleted}/${project.simulation.construction.workUnitsRequired} work units completed`],
        ['Material loss', `${formatMoney(project.simulation.construction.replacementMaterialCost)} replacement materials; final material cost ${formatMoney(project.simulation.finalMaterialCost)}`],
        ['Final test', `${project.simulation.testing.die} on the die; total ${project.simulation.testing.total} vs DC ${project.simulation.testing.dc}`]
      );
    }

    rows.forEach(([label, value]) => appendRow(card, label, value));
    const actions = document.createElement('div');
    actions.className = 'crafting-actions';
    const exportProject = document.createElement('button');
    exportProject.type = 'button';
    exportProject.className = 'secondary-action';
    exportProject.textContent = 'Export Project JSON';
    exportProject.addEventListener('click', () => downloadJson(`${project.id}.json`, project));
    const exportWiki = document.createElement('button');
    exportWiki.type = 'button';
    exportWiki.className = 'secondary-action';
    exportWiki.textContent = 'Export Wiki Draft';
    exportWiki.addEventListener('click', () => downloadJson(`${project.id}-wiki.json`, project.wikiDraft));
    actions.append(exportProject, exportWiki);
    card.appendChild(actions);
    return card;
  }

  function signed(value) {
    return Number(value) >= 0 ? `+${Number(value)}` : String(Number(value));
  }

  function appendRow(card, label, value) {
    const row = document.createElement('div');
    row.className = 'crafting-kv';
    const key = document.createElement('strong');
    key.textContent = label;
    const content = document.createElement('span');
    content.textContent = String(value ?? '');
    row.append(key, content);
    card.appendChild(row);
  }

  function downloadJson(filename, payload) {
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename.replace(/[^a-z0-9._-]+/gi, '-');
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  window.openKaysenderCraftingGenerator = (mode = 'all') => openGenerator('crafting-gadget-creator', mode, 'Crafting, Gadget, and Equipment Creator');

  const observer = new MutationObserver(decorateCards);
  observer.observe(document.body, { childList: true, subtree: true });
  document.addEventListener('DOMContentLoaded', decorateCards);
  setInterval(decorateCards, 1000);
})();
