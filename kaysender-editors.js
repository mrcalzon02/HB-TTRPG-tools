(() => {
  const FLOATING_ISLAND_EDITOR_URL = 'data/kaysender/editors/floating-island-editor.json';
  let floatingIslandEditorConfig = null;
  let latestFloatingIslandProfile = null;

  const editorModules = {
    'floating-island-generator': {
      label: 'Launch Detailed Island Editor',
      open: openFloatingIslandEditor
    }
  };

  function injectStyles() {
    if (document.getElementById('kaysender-editor-style')) return;
    const style = document.createElement('style');
    style.id = 'kaysender-editor-style';
    style.textContent = `
      .editor-launch { margin-top: 10px; width: 100%; }
      .editor-panel {
        border: 1px solid var(--line);
        border-radius: 24px;
        padding: 22px;
        margin: 18px 0 28px;
        background: linear-gradient(180deg, rgba(255,255,255,0.07), rgba(255,255,255,0.025));
        box-shadow: var(--shadow);
      }
      .editor-grid {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 12px;
        margin: 16px 0;
      }
      .editor-grid label {
        color: var(--muted);
        font-size: 0.76rem;
      }
      .editor-grid input,
      .editor-grid select,
      .editor-panel textarea {
        background: #10131a;
        border: 1px solid var(--line);
        color: var(--ink);
        border-radius: 12px;
        padding: 10px 12px;
        width: 100%;
      }
      .editor-action-row {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
        margin: 12px 0 18px;
      }
      .editor-action-row button { width: auto; }
      .editor-output-grid {
        display: grid;
        grid-template-columns: minmax(260px, 0.85fr) minmax(320px, 1.15fr);
        gap: 16px;
        align-items: start;
      }
      .editor-card {
        border: 1px solid rgba(200, 138, 53, 0.35);
        border-radius: 18px;
        padding: 16px;
        background: rgba(0,0,0,0.18);
      }
      .editor-card h3,
      .editor-card h4 { color: var(--accent); }
      .editor-card p,
      .editor-card li { color: var(--muted); line-height: 1.5; }
      .score-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 10px;
      }
      .score-box {
        border: 1px solid var(--line);
        border-radius: 14px;
        padding: 10px;
        background: rgba(255,255,255,0.04);
      }
      .score-box strong { display: block; color: var(--ink); font-size: 1.35rem; }
      .json-export {
        min-height: 260px;
        font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
        font-size: 0.78rem;
      }
      @media (max-width: 1050px) {
        .editor-grid, .editor-output-grid { grid-template-columns: 1fr; }
      }
    `;
    document.head.appendChild(style);
  }

  async function loadFloatingIslandConfig() {
    if (floatingIslandEditorConfig) return floatingIslandEditorConfig;
    const response = await fetch(FLOATING_ISLAND_EDITOR_URL, { cache: 'no-store' });
    if (!response.ok) throw new Error(`Floating Island editor request failed: ${response.status}`);
    floatingIslandEditorConfig = await response.json();
    return floatingIslandEditorConfig;
  }

  function switchKaysenderView() {
    document.querySelectorAll('.view').forEach(view => view.classList.toggle('active', view.id === 'kaysender'));
    document.querySelectorAll('.nav-button').forEach(button => button.classList.toggle('active', button.dataset.view === 'kaysender'));
  }

  function getPanel() {
    let panel = document.getElementById('kaysender-editor-panel');
    if (!panel) {
      panel = document.createElement('section');
      panel.id = 'kaysender-editor-panel';
      panel.className = 'editor-panel no-print';
      const status = document.getElementById('kaysender-status');
      if (status) status.insertAdjacentElement('afterend', panel);
      else document.getElementById('kaysender')?.prepend(panel);
    }
    return panel;
  }

  async function openFloatingIslandEditor() {
    injectStyles();
    switchKaysenderView();
    const panel = getPanel();
    panel.innerHTML = '<p class="helper-note">Loading detailed Floating Island editor…</p>';

    try {
      const config = await loadFloatingIslandConfig();
      renderFloatingIslandEditor(panel, config);
      panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (error) {
      panel.innerHTML = '<p class="helper-note">Floating Island editor could not be loaded. Confirm GitHub Pages or a local web server is serving JSON files.</p>';
    }
  }

  function renderFloatingIslandEditor(panel, config) {
    panel.innerHTML = '';

    const header = document.createElement('div');
    header.className = 'section-heading';
    header.innerHTML = `
      <p class="eyebrow">Stage ${config.stage} editor-alpha</p>
      <h2>${config.title}</h2>
      <p>${config.purpose}</p>
    `;

    const sourceCard = document.createElement('article');
    sourceCard.className = 'editor-card';
    sourceCard.innerHTML = `<h3>Source-derived build assumptions</h3><ul>${config.sourceThemes.map(theme => `<li>${theme}</li>`).join('')}</ul>`;

    const form = document.createElement('form');
    form.id = 'floating-island-editor-form';
    form.className = 'editor-grid';
    form.autocomplete = 'off';

    config.controls.forEach(control => form.appendChild(createControl(control)));

    const actions = document.createElement('div');
    actions.className = 'editor-action-row';
    actions.innerHTML = `
      <button class="primary-action" type="button" id="island-build-profile">Build Island Profile</button>
      <button class="secondary-action" type="button" id="island-randomize">Randomize Controls</button>
      <button class="secondary-action" type="button" id="island-copy-json">Copy Profile JSON</button>
      <button class="secondary-action" type="button" id="island-download-json">Download Profile JSON</button>
    `;

    const output = document.createElement('div');
    output.id = 'floating-island-editor-output';
    output.className = 'editor-output-grid';

    panel.append(header, sourceCard, form, actions, output);

    panel.querySelector('#island-build-profile').addEventListener('click', () => buildAndRenderProfile(config, panel));
    panel.querySelector('#island-randomize').addEventListener('click', () => {
      randomizeControls(config, panel);
      buildAndRenderProfile(config, panel);
    });
    panel.querySelector('#island-copy-json').addEventListener('click', copyProfileJson);
    panel.querySelector('#island-download-json').addEventListener('click', downloadProfileJson);

    buildAndRenderProfile(config, panel);
  }

  function createControl(control) {
    const label = document.createElement('label');
    label.textContent = control.label;

    if (control.type === 'select') {
      const select = document.createElement('select');
      select.name = control.id;
      control.options.forEach(option => {
        const opt = document.createElement('option');
        opt.value = option;
        opt.textContent = option;
        if (option === control.default) opt.selected = true;
        select.appendChild(opt);
      });
      label.appendChild(select);
      return label;
    }

    const input = document.createElement('input');
    input.name = control.id;
    input.type = control.type || 'text';
    input.value = control.default || '';
    label.appendChild(input);
    return label;
  }

  function getFormValues(panel) {
    const form = panel.querySelector('#floating-island-editor-form');
    const data = {};
    new FormData(form).forEach((value, key) => { data[key] = value; });
    return data;
  }

  function randomizeControls(config, panel) {
    const form = panel.querySelector('#floating-island-editor-form');
    config.controls.forEach(control => {
      const field = form.elements[control.id];
      if (!field) return;
      if (control.type === 'select') field.value = choice(control.options);
      if (control.id === 'name') field.value = randomIslandName();
    });
  }

  function buildProfile(config, values) {
    const scores = calculateScores(config, values);
    const outputs = buildOutputs(config, values, scores);
    return {
      name: values.name || 'Unnamed Skyland',
      profileType: 'floating-island-profile',
      islandRole: values.islandRole,
      sizeClass: values.sizeClass,
      altitudeBand: values.altitudeBand,
      stabilityClass: values.stabilityClass,
      driftPattern: values.driftPattern,
      anchorStatus: values.anchorStatus,
      terrainCore: values.terrainCore,
      waterProfile: values.waterProfile,
      foodProfile: values.foodProfile,
      primaryResource: values.primaryResource,
      ecologyPressure: values.ecologyPressure,
      settlementFootprint: values.settlementFootprint,
      factionPressure: values.factionPressure,
      culturalAdaptation: values.culturalAdaptation,
      routeAccess: values.routeAccess,
      threatClock: values.threatClock,
      derivedScores: scores,
      outputs
    };
  }

  function calculateScores(config, values) {
    const habitability = 5 + scorePart(config.scoring.habitability.waterProfile, values.waterProfile) + scorePart(config.scoring.habitability.foodProfile, values.foodProfile) + scorePart(config.scoring.habitability.stabilityClass, values.stabilityClass);
    const routeValue = 5 + scorePart(config.scoring.routeValue.islandRole, values.islandRole) + scorePart(config.scoring.routeValue.primaryResource, values.primaryResource) + scorePart(config.scoring.routeValue.routeAccess, values.routeAccess);
    const conflictPressure = 2 + scorePart(config.scoring.conflictPressure.factionPressure, values.factionPressure) + scorePart(config.scoring.conflictPressure.threatClock, values.threatClock);
    const collapseRisk = clamp(10 - habitability + conflictPressure + instabilityRisk(values), 0, 20);
    const gmComplexity = clamp(Math.ceil((routeValue + conflictPressure + collapseRisk) / 3), 1, 20);

    return {
      habitability: clamp(habitability, 0, 20),
      routeValue: clamp(routeValue, 0, 20),
      conflictPressure: clamp(conflictPressure, 0, 20),
      collapseRisk,
      gmComplexity
    };
  }

  function instabilityRisk(values) {
    const unstable = ['actively crumbling', 'fracture-prone', 'seasonally unstable'];
    const riskyDrift = ['storm-driven drift', 'erratic wandering', 'split-chain drift', 'recently detached', 'being pulled by unknown force'];
    const riskyAnchor = ['none', 'failing unknown mechanism'];
    return (unstable.includes(values.stabilityClass) ? 3 : 0) + (riskyDrift.includes(values.driftPattern) ? 2 : 0) + (riskyAnchor.includes(values.anchorStatus) ? 2 : 0);
  }

  function buildOutputs(config, values, scores) {
    const summary = fillTemplate(config.outputTemplates.summary, values);
    const gmNotes = config.outputTemplates.gmNoteTemplates.map(template => fillTemplate(template, values));
    const settlementHooks = config.outputTemplates.settlementHooks.map(template => fillTemplate(template, values));
    const routeHooks = config.outputTemplates.routeHooks.map(template => fillTemplate(template, values));
    const marketHooks = config.outputTemplates.marketHooks.map(template => fillTemplate(template, values));
    const encounterHooks = config.outputTemplates.encounterHooks.map(template => fillTemplate(template, values));
    const wikiDraft = {
      id: slugify(values.name || 'unnamed-skyland'),
      title: values.name || 'Unnamed Skyland',
      category: 'Locations',
      summary,
      body: [
        summary,
        `Habitability ${scores.habitability}/20, route value ${scores.routeValue}/20, conflict pressure ${scores.conflictPressure}/20, collapse risk ${scores.collapseRisk}/20.`,
        `GM focus: ${values.threatClock}; faction pressure: ${values.factionPressure}; ecology pressure: ${values.ecologyPressure}.`
      ],
      tags: ['floating island', values.islandRole, values.primaryResource, values.altitudeBand, values.factionPressure],
      relatedEntries: ['floating-islands', 'scarcity-loop', 'sky-ecology'],
      relatedModules: ['floating-island-generator', 'settlement-generator', 'world-map-route-generator', 'supply-water-planner']
    };

    return { summary, gmNotes, settlementHooks, routeHooks, marketHooks, encounterHooks, wikiDraft };
  }

  function buildAndRenderProfile(config, panel) {
    const values = getFormValues(panel);
    latestFloatingIslandProfile = buildProfile(config, values);
    renderProfile(panel, latestFloatingIslandProfile);
  }

  function renderProfile(panel, profile) {
    const output = panel.querySelector('#floating-island-editor-output');
    if (!output) return;
    output.innerHTML = '';

    const overview = document.createElement('article');
    overview.className = 'editor-card';
    overview.innerHTML = `
      <h3>${profile.name}</h3>
      <p>${profile.outputs.summary}</p>
      <div class="score-grid">
        ${scoreBox('Habitability', profile.derivedScores.habitability)}
        ${scoreBox('Route Value', profile.derivedScores.routeValue)}
        ${scoreBox('Conflict', profile.derivedScores.conflictPressure)}
        ${scoreBox('Collapse Risk', profile.derivedScores.collapseRisk)}
        ${scoreBox('GM Complexity', profile.derivedScores.gmComplexity)}
      </div>
      ${renderList('GM Notes', profile.outputs.gmNotes)}
      ${renderList('Settlement Hooks', profile.outputs.settlementHooks)}
      ${renderList('Route Hooks', profile.outputs.routeHooks)}
      ${renderList('Market Hooks', profile.outputs.marketHooks)}
      ${renderList('Encounter Hooks', profile.outputs.encounterHooks)}
    `;

    const exportCard = document.createElement('article');
    exportCard.className = 'editor-card';
    exportCard.innerHTML = `
      <h3>Structured Output</h3>
      <p>This profile is shaped for later campaign-note storage, generated wiki entries, route planning, settlement generation, and encounter generation.</p>
      <h4>Draft Wiki Entry</h4>
      <textarea class="json-export" readonly>${JSON.stringify(profile.outputs.wikiDraft, null, 2)}</textarea>
      <h4>Full Profile JSON</h4>
      <textarea class="json-export" readonly>${JSON.stringify(profile, null, 2)}</textarea>
    `;

    output.append(overview, exportCard);
  }

  function renderList(title, items) {
    return `<h4>${title}</h4><ul>${items.map(item => `<li>${item}</li>`).join('')}</ul>`;
  }

  function scoreBox(title, value) {
    return `<div class="score-box"><span>${title}</span><strong>${value}</strong></div>`;
  }

  async function copyProfileJson() {
    if (!latestFloatingIslandProfile) return;
    try {
      await navigator.clipboard.writeText(JSON.stringify(latestFloatingIslandProfile, null, 2));
      alert('Floating island profile JSON copied.');
    } catch (error) {
      alert('Clipboard copy failed. Use the visible JSON text area instead.');
    }
  }

  function downloadProfileJson() {
    if (!latestFloatingIslandProfile) return;
    const blob = new Blob([JSON.stringify(latestFloatingIslandProfile, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${slugify(latestFloatingIslandProfile.name)}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function decorateCards() {
    injectStyles();
    document.querySelectorAll('.module-card').forEach(card => {
      const moduleId = card.dataset.moduleId;
      const editor = editorModules[moduleId];
      if (!editor || card.dataset.editorLinked === 'true') return;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'primary-action editor-launch';
      button.textContent = editor.label;
      button.addEventListener('click', editor.open);
      card.appendChild(button);
      card.dataset.editorLinked = 'true';
    });
  }

  function scorePart(table, key) {
    if (!table || !(key in table)) return 0;
    return Number(table[key]) || 0;
  }

  function fillTemplate(template, values) {
    return template.replace(/\{(\w+)\}/g, (_, key) => values[key] || 'unknown');
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function choice(list) {
    return list[Math.floor(Math.random() * list.length)];
  }

  function slugify(value) {
    return String(value || 'unnamed-skyland').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'unnamed-skyland';
  }

  function randomIslandName() {
    const prefixes = ['Dun', 'Veyr', 'Asha', 'Karth', 'Morn', 'Zeph', 'Brass', 'Hollow', 'Wind', 'Cloud', 'Grim', 'Sable'];
    const roots = ['hallow', 'spire', 'roost', 'reach', 'fall', 'chain', 'crag', 'haven', 'crown', 'rift', 'watch', 'harbor'];
    return `${choice(prefixes)}${choice(roots)}`;
  }

  window.openFloatingIslandEditor = openFloatingIslandEditor;

  const observer = new MutationObserver(decorateCards);
  observer.observe(document.body, { childList: true, subtree: true });
  document.addEventListener('DOMContentLoaded', decorateCards);
  setInterval(decorateCards, 1000);
})();
