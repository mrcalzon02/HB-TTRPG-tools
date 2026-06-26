(() => {
  'use strict';

  const WORKSPACE_ID = 'npc-generator';
  const CARD_ID = 'universal-npc-generator-card';
  const SCRIPT_SEQUENCE = [
    ['npc-profile-generator-random.js', 'NpcProfileRandom'],
    ['npc-profile-generator-rules-core.js', 'NpcProfileRules'],
    ['npc-profile-generator-rules-validation.js', 'NpcProfileRules'],
    ['npc-generator-foundation.js', 'NpcProfileGeneratorFoundation'],
    ['npc-generator-compose.js', 'NpcProfileGeneratorAssembly'],
    ['npc-generator-household-core.js', 'NpcProfileHouseholdCore'],
    ['npc-generator-household-records.js', 'NpcProfileHouseholdRecords'],
    ['npc-generator-relationship-records.js', 'NpcProfileRelationshipRecords'],
    ['npc-generator-household.js', 'NpcProfileGeneratorHousehold'],
    ['npc-generator-operations.js', 'NpcProfileGeneratorOperations'],
    ['npc-generator-mechanics.js', 'NpcProfileGeneratorMechanics'],
    ['npc-profile-generator-core.js', 'NpcProfileGeneratorCore'],
    ['npc-profile-generator-storage.js', 'NpcProfileGeneratorStorage'],
    ['npc-profile-generator-export.js', 'NpcProfileGeneratorExport'],
    ['npc-profile-generator-renderer.js', 'NpcProfileGeneratorRenderer'],
    ['npc-profile-generator-ui.js', 'NpcProfileGeneratorUI'],
    ['npc-profile-generator-mechanics-ui.js', 'NpcProfileGeneratorMechanicsUI'],
    ['npc-profile-generator-persistence-ui.js', 'NpcProfileGeneratorPersistenceUI'],
    ['npc-profile-generator-persistence-restore.js', 'NpcProfileGeneratorPersistenceRestore'],
    ['npc-profile-generator-depth-data.js', 'NpcProfileGeneratorDepthData'],
    ['npc-profile-generator-household-data.js', 'NpcProfileGeneratorHouseholdData'],
    ['npc-profile-generator-operation-data.js', 'NpcProfileGeneratorOperationData'],
    ['npc-profile-generator-mechanics-data.js', 'NpcProfileGeneratorMechanicsData']
  ];

  function loadStylesheet(href,attribute) {
    if (document.querySelector(`link[${attribute}]`)) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.setAttribute(attribute,'true');
    document.head.appendChild(link);
  }

  function loadScript(src, globalName) {
    if (globalThis[globalName]) return Promise.resolve();
    const existing = document.querySelector(`script[data-npc-source="${src}"]`);
    if (existing) return new Promise((resolve, reject) => {
      existing.addEventListener('load', resolve, { once: true });
      existing.addEventListener('error', () => reject(new Error(`Could not load ${src}.`)), { once: true });
    });
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.defer = true;
      script.dataset.npcSource = src;
      script.addEventListener('load', resolve, { once: true });
      script.addEventListener('error', () => reject(new Error(`Could not load ${src}.`)), { once: true });
      document.body.appendChild(script);
    });
  }

  async function loadRuntime() {
    for (const [src, globalName] of SCRIPT_SEQUENCE) await loadScript(src, globalName);
  }

  function switchView(viewId) {
    document.querySelectorAll('.view').forEach(view => view.classList.toggle('active', view.id === viewId));
    document.querySelectorAll('.nav-button').forEach(button => button.classList.toggle('active', button.dataset.view === viewId));
    if (viewId === 'generators') document.querySelector('.nav-button[data-view="generators"]')?.classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function buildWorkspace() {
    let section = document.getElementById(WORKSPACE_ID);
    if (section) return section;
    section = document.createElement('section');
    section.id = WORKSPACE_ID;
    section.className = 'view npc-generator-view';
    section.setAttribute('aria-labelledby', 'npc-generator-title');
    section.innerHTML = `
      <div class="hero-card no-print npc-generator-hero">
        <div>
          <p class="eyebrow">Deterministic standalone workspace</p>
          <h2 id="npc-generator-title">Universal NPC Profile Generator</h2>
          <p>Generate a person who fits their social role. Workplace, authority, criminal operation, estate, street territory, family, motivations, and background are selected through archetype-aware policies rather than one flat random table.</p>
        </div>
        <button type="button" class="secondary-action" id="npc-return-generators">Return to Generator Bench</button>
      </div>
      <div id="npc-generator-status" class="registry-status no-print" role="status" aria-live="polite">Preparing Universal NPC Profile Generator…</div>
      <div id="npc-profile-generator-root" class="npc-profile-generator-root" aria-busy="true"></div>`;
    document.querySelector('main')?.appendChild(section);
    section.querySelector('#npc-return-generators')?.addEventListener('click', () => switchView('generators'));
    return section;
  }

  function buildCard() {
    const generators = document.getElementById('generators');
    if (!generators || document.getElementById(CARD_ID)) return;
    const registryGrid = document.getElementById('kaysender-generators-grid');
    const card = document.createElement('article');
    card.id = CARD_ID;
    card.className = 'module-card';
    card.innerHTML = `
      <div class="module-meta"><span class="badge section-generators">generator</span><span class="badge status-active">active</span><span class="badge">dedicated workspace</span></div>
      <h3>Universal NPC Profile Generator</h3>
      <p>Create civilians, laborers, craftspeople, merchants, bankers, beggars, guards, soldiers, thieves, bandits, and nobles with role-appropriate homes, workplaces, operations, families, motives, secrets, hooks, optional mechanics, and local profile storage.</p>
      <h4>Module capabilities</h4>
      <div class="chip-list"><span class="chip">11 archetypes</span><span class="chip">deterministic seeds</span><span class="chip">section rerolls</span><span class="chip">field and section locks</span><span class="chip">conditional operations</span><span class="chip">optional mechanics</span><span class="chip">save and import</span><span class="chip">JSON, text, Markdown</span></div>
      <button type="button" class="primary-action" id="open-universal-npc-generator">Open NPC Generator</button>`;
    card.querySelector('#open-universal-npc-generator')?.addEventListener('click', () => {
      switchView(WORKSPACE_ID);
      document.getElementById(WORKSPACE_ID)?.querySelector('select, input, button')?.focus();
    });
    if (registryGrid) registryGrid.insertAdjacentElement('beforebegin', card);
    else generators.appendChild(card);
  }

  async function init() {
    loadStylesheet('npc-profile-generator.css','data-npc-profile-generator-style');
    loadStylesheet('npc-profile-generator-persistence.css','data-npc-profile-persistence-style');
    buildCard();
    const section = buildWorkspace();
    const status = section.querySelector('#npc-generator-status');
    try {
      await loadRuntime();
      const workspace = await globalThis.NpcProfileGeneratorUI.mount(section.querySelector('#npc-profile-generator-root'), status);
      globalThis.NpcProfileGeneratorWorkspace = workspace;
      await globalThis.NpcProfileGeneratorDepthData.enrich(workspace);
      await globalThis.NpcProfileGeneratorHouseholdData.enrich(workspace);
      await globalThis.NpcProfileGeneratorOperationData.enrich(workspace);
      await globalThis.NpcProfileGeneratorMechanicsData.enrich(workspace);
    } catch (error) {
      if (status) {
        status.textContent = `Universal NPC Profile Generator failed to initialize: ${error.message}`;
        status.dataset.tone = 'error';
      }
    }
  }

  const observer = new MutationObserver(buildCard);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
