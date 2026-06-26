(() => {
  'use strict';

  const DATA_URLS = Object.freeze({
    manifest: 'data/npc-generator/packs/generic-fantasy-core.json',
    policies: 'data/npc-generator/archetypes/wave-a-policies.json',
    names: 'data/npc-generator/names/core-fantasy-names.json',
    ancestries: 'data/npc-generator/ancestries/core-fantasy.json',
    coreTables: 'data/npc-generator/tables/core-profile-tables.json',
    operationalTables: 'data/npc-generator/tables/wave-a-operational-tables.json'
  });
  const STORAGE_KEY = 'hb-ttrpg-universal-npc-generator-v1';

  const Core = () => globalThis.NpcProfileGeneratorCore;
  const Rules = () => globalThis.NpcProfileRules;
  const Renderer = () => globalThis.NpcProfileGeneratorRenderer;

  function createOption(value, label) {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = label;
    return option;
  }

  function loadJson(url) {
    return fetch(url, { cache: 'no-store' }).then(response => {
      if (!response.ok) throw new Error(`${url} returned ${response.status}.`);
      return response.json();
    });
  }

  function mergePackData(data) {
    const tables = {};
    [data.names.tables, data.ancestries.tables, data.coreTables.tables, data.operationalTables.tables]
      .forEach(source => Object.entries(source || {}).forEach(([id, entries]) => { tables[id] = entries; }));
    return {
      packId: data.manifest.packId,
      version: data.manifest.version,
      tables,
      ageRanges: data.ancestries.ageRanges || {},
      sectionFields: data.coreTables.sectionFields || {}
    };
  }

  function randomSeed() {
    if (globalThis.crypto?.getRandomValues) {
      const values = new Uint32Array(2);
      globalThis.crypto.getRandomValues(values);
      return `npc-${values[0].toString(16)}-${values[1].toString(16)}`;
    }
    return `npc-${Date.now().toString(36)}`;
  }

  class NpcGeneratorWorkspace {
    constructor(root, status) {
      this.root = root;
      this.status = status;
      this.data = null;
      this.pack = null;
      this.currentProfile = null;
      this.currentResult = null;
      this.rerollCounters = {};
      this.locks = new Set();
      this.controls = {};
    }

    setStatus(message, tone = 'neutral') {
      if (!this.status) return;
      this.status.textContent = message;
      this.status.dataset.tone = tone;
    }

    async load() {
      this.setStatus('Loading universal NPC data…');
      const [manifest, policies, names, ancestries, coreTables, operationalTables] = await Promise.all([
        loadJson(DATA_URLS.manifest),
        loadJson(DATA_URLS.policies),
        loadJson(DATA_URLS.names),
        loadJson(DATA_URLS.ancestries),
        loadJson(DATA_URLS.coreTables),
        loadJson(DATA_URLS.operationalTables)
      ]);
      this.data = { manifest, policies, names, ancestries, coreTables, operationalTables };
      this.pack = mergePackData(this.data);
      this.renderShell();
      this.populateControls();
      this.restorePreferences();
      this.updateConditionalControls();
      this.generate('initial');
      this.root.setAttribute('aria-busy', 'false');
    }

    renderShell() {
      this.root.innerHTML = `
        <div class="npc-generator-layout">
          <aside class="npc-generator-controls no-print" aria-label="NPC generator controls">
            <div class="npc-control-heading"><p class="eyebrow">Generation controls</p><h2>Profile Parameters</h2></div>
            <label>Archetype<select id="npc-archetype" class="tool-input"></select></label>
            <label>Profile depth<select id="npc-depth" class="tool-input"><option value="quick">Quick</option><option value="standard" selected>Standard</option><option value="deep">Deep</option></select></label>
            <label>Ancestry<select id="npc-ancestry" class="tool-input"><option value="">Random ancestry</option></select></label>
            <label>Age band<select id="npc-age-band" class="tool-input"><option value="">Random age band</option></select></label>
            <label>Exact age<input id="npc-age" class="tool-input" type="number" min="0" placeholder="Random within band" /></label>
            <label>Mechanical profile<select id="npc-level-mode" class="tool-input"><option value="generated">Generate mechanics</option><option value="none">No mechanical profile</option><option value="custom">Custom level</option></select></label>
            <label id="npc-custom-level-group" hidden>Custom level<input id="npc-custom-level" class="tool-input" type="number" min="0" max="30" value="1" /></label>
            <label>Seed<input id="npc-seed" class="tool-input" type="text" /></label>
            <div class="npc-control-row"><button id="npc-random-seed" type="button" class="secondary-action">New seed</button><button id="npc-generate" type="button" class="primary-action">Generate NPC</button></div>
            <section class="npc-archetype-preview" aria-labelledby="npc-archetype-preview-title"><h3 id="npc-archetype-preview-title">Archetype behavior</h3><div id="npc-archetype-summary"></div></section>
            <div class="npc-control-row"><button id="npc-export" type="button" class="secondary-action" disabled>Export JSON</button><button id="npc-print" type="button" class="secondary-action" disabled>Print profile</button></div>
            <button id="npc-clear-locks" type="button" class="danger-action" disabled>Clear all locks</button>
            <p class="helper-note">Locks preserve selected sections or fields during rerolls. Section rerolls use isolated sub-seeds, so unrelated profile information remains stable.</p>
          </aside>
          <section class="npc-generator-output" aria-label="Generated NPC profile">
            <div id="npc-profile-diagnostics" class="npc-diagnostics npc-diagnostics-clear" aria-live="polite">No generator diagnostics.</div>
            <div id="npc-profile-output" class="npc-profile-output"></div>
          </section>
        </div>`;

      const ids = [
        'npc-archetype','npc-depth','npc-ancestry','npc-age-band','npc-age','npc-level-mode',
        'npc-custom-level-group','npc-custom-level','npc-seed','npc-archetype-summary','npc-profile-diagnostics',
        'npc-profile-output','npc-random-seed','npc-generate','npc-export','npc-print','npc-clear-locks'
      ];
      ids.forEach(id => { this.controls[id] = this.root.querySelector(`#${id}`); });
      this.bindEvents();
    }

    bindEvents() {
      this.controls['npc-archetype'].addEventListener('change', () => {
        this.rerollCounters = {};
        this.locks.clear();
        this.currentProfile = null;
        this.updateConditionalControls();
        this.savePreferences();
      });
      ['npc-depth','npc-ancestry','npc-age-band','npc-age','npc-level-mode','npc-custom-level','npc-seed']
        .forEach(id => this.controls[id].addEventListener('change', () => {
          this.updateConditionalControls();
          this.savePreferences();
        }));
      this.controls['npc-level-mode'].addEventListener('input', () => this.updateConditionalControls());
      this.controls['npc-random-seed'].addEventListener('click', () => {
        this.controls['npc-seed'].value = randomSeed();
        this.rerollCounters = {};
        this.generate('new-seed');
      });
      this.controls['npc-generate'].addEventListener('click', () => this.generate('manual'));
      this.controls['npc-export'].addEventListener('click', () => this.exportProfile());
      this.controls['npc-print'].addEventListener('click', () => window.print());
      this.controls['npc-clear-locks'].addEventListener('click', () => {
        this.locks.clear();
        this.renderProfile();
      });
    }

    populateControls() {
      const archetypeSelect = this.controls['npc-archetype'];
      const records = new Map((this.data.policies.archetypes || []).map(record => [record.id, record]));
      (this.data.policies.firstReleaseIds || []).forEach(id => {
        const record = records.get(id);
        archetypeSelect.appendChild(createOption(id, record?.label || id));
      });
      (this.data.ancestries.tables?.ancestries || []).forEach(id => this.controls['npc-ancestry'].appendChild(createOption(id, Renderer().labelFor(id))));
      (this.data.ancestries.tables?.ageBands || []).forEach(id => this.controls['npc-age-band'].appendChild(createOption(id, Renderer().labelFor(id))));
      if (!this.controls['npc-seed'].value) this.controls['npc-seed'].value = randomSeed();
    }

    selectedArchetype() {
      const id = this.controls['npc-archetype'].value;
      return Rules().resolveArchetype(id, this.data.policies.archetypes || []).archetype;
    }

    updateConditionalControls() {
      if (!this.data) return;
      const archetype = this.selectedArchetype();
      const mechanicsPolicy = archetype?.sectionPolicies?.mechanics?.policy || 'optional';
      const mode = this.controls['npc-level-mode'].value;
      const noneOption = [...this.controls['npc-level-mode'].options].find(option => option.value === 'none');
      if (noneOption) noneOption.disabled = mechanicsPolicy === 'required';
      if (mechanicsPolicy === 'required' && mode === 'none') this.controls['npc-level-mode'].value = 'generated';
      this.controls['npc-custom-level-group'].hidden = this.controls['npc-level-mode'].value !== 'custom';
      this.renderArchetypeSummary(archetype);
    }

    renderArchetypeSummary(archetype) {
      const target = this.controls['npc-archetype-summary'];
      target.innerHTML = '';
      if (!archetype) return;
      const description = document.createElement('p');
      description.textContent = archetype.description || 'No archetype description supplied.';
      const chips = document.createElement('div');
      chips.className = 'chip-list';
      (archetype.specializedSections || []).forEach(section => {
        const chip = document.createElement('span');
        chip.className = 'chip';
        chip.textContent = section.label || Renderer().labelFor(section.id);
        chips.appendChild(chip);
      });
      if (!chips.childElementCount) {
        const chip = document.createElement('span');
        chip.className = 'chip';
        chip.textContent = 'General profile sections';
        chips.appendChild(chip);
      }
      target.append(description, chips);
    }

    generationConfig() {
      const archetype = this.selectedArchetype();
      const identity = {};
      if (this.controls['npc-ancestry'].value) identity.ancestryId = this.controls['npc-ancestry'].value;
      if (this.controls['npc-age-band'].value) identity.ageBand = this.controls['npc-age-band'].value;
      if (this.controls['npc-age'].value !== '') identity.age = Number(this.controls['npc-age'].value);
      const optionalStates = {};
      if (this.controls['npc-level-mode'].value === 'none' && archetype?.sectionPolicies?.mechanics?.policy !== 'required') optionalStates.mechanics = 'none';
      return {
        seed: this.controls['npc-seed'].value.trim() || randomSeed(),
        archetype,
        pack: this.pack,
        mode: this.controls['npc-depth'].value,
        options: { identity },
        optionalStates,
        rerollCounters: { ...this.rerollCounters },
        locks: [...this.locks],
        previousProfile: this.currentProfile,
        timestamp: new Date().toISOString()
      };
    }

    applyInterfaceOverrides(result) {
      if (!result?.profile) return result;
      if (this.controls['npc-level-mode'].value === 'custom' && result.profile.sections?.mechanics?.state === 'present') {
        const level = Number(this.controls['npc-custom-level'].value || 1);
        result.profile.sections.mechanics.data.level = level;
        const notice = {
          code: 'INTERFACE_CUSTOM_LEVEL_APPLIED',
          severity: 'info',
          message: `The interface replaced the generated level with ${level}.`,
          path: '/sections/mechanics/data/level'
        };
        result.diagnostics.push(notice);
        result.profile.diagnostics.push(notice);
      }
      return result;
    }

    generate(reason) {
      try {
        this.setStatus('Generating NPC profile…');
        const result = this.applyInterfaceOverrides(Core().generateProfile(this.generationConfig()));
        this.currentResult = result;
        this.currentProfile = result.profile;
        this.renderProfile();
        this.savePreferences();
        const errorCount = result.diagnostics.filter(item => item.severity === 'error').length;
        this.setStatus(
          result.profile
            ? `${result.profile.identity.fullName} generated as ${result.profile.archetype.label}. ${errorCount ? `${errorCount} error diagnostic(s).` : 'Profile ready.'}`
            : 'Generation failed before a profile could be created.',
          errorCount ? 'error' : 'success'
        );
        this.root.dispatchEvent(new CustomEvent('npc-profile-generated', { detail: { reason, profile: result.profile } }));
      } catch (error) {
        this.setStatus(`NPC generation failed: ${error.message}`, 'error');
        Renderer().renderDiagnostics(this.controls['npc-profile-diagnostics'], [{ code: 'INTERFACE_GENERATION_FAILURE', severity: 'error', message: error.message, path: '/' }]);
      }
    }

    reroll(sectionId) {
      this.rerollCounters[sectionId] = Number(this.rerollCounters[sectionId] || 0) + 1;
      this.generate(`reroll:${sectionId}`);
    }

    toggleLock(pointer) {
      if (this.locks.has(pointer)) this.locks.delete(pointer);
      else this.locks.add(pointer);
      this.renderProfile();
    }

    renderProfile() {
      Renderer().renderDiagnostics(this.controls['npc-profile-diagnostics'], this.currentResult?.diagnostics || []);
      Renderer().renderProfile(this.controls['npc-profile-output'], this.currentProfile, {
        locks: this.locks,
        onReroll: sectionId => this.reroll(sectionId),
        onToggleLock: pointer => this.toggleLock(pointer)
      });
      const enabled = Boolean(this.currentProfile);
      this.controls['npc-export'].disabled = !enabled;
      this.controls['npc-print'].disabled = !enabled;
      this.controls['npc-clear-locks'].disabled = !this.locks.size;
    }

    exportProfile() {
      if (!this.currentProfile) return;
      const safeName = (this.currentProfile.identity?.fullName || 'npc').replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase();
      const blob = new Blob([JSON.stringify(this.currentProfile, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${safeName || 'npc'}-profile.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    }

    savePreferences() {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
          archetype: this.controls['npc-archetype'].value,
          depth: this.controls['npc-depth'].value,
          ancestry: this.controls['npc-ancestry'].value,
          ageBand: this.controls['npc-age-band'].value,
          age: this.controls['npc-age'].value,
          levelMode: this.controls['npc-level-mode'].value,
          customLevel: this.controls['npc-custom-level'].value,
          seed: this.controls['npc-seed'].value
        }));
      } catch (_) {
        // Storage is optional; generation remains fully functional without it.
      }
    }

    restorePreferences() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return;
        const saved = JSON.parse(raw);
        Object.entries({
          'npc-archetype': saved.archetype,
          'npc-depth': saved.depth,
          'npc-ancestry': saved.ancestry,
          'npc-age-band': saved.ageBand,
          'npc-age': saved.age,
          'npc-level-mode': saved.levelMode,
          'npc-custom-level': saved.customLevel,
          'npc-seed': saved.seed
        }).forEach(([id, value]) => {
          if (value !== undefined && value !== null && this.controls[id]) this.controls[id].value = value;
        });
      } catch (_) {
        // Ignore unreadable local preferences.
      }
    }
  }

  async function mount(root, status) {
    if (!root || root.dataset.npcMounted === 'true') return null;
    root.dataset.npcMounted = 'true';
    root.setAttribute('aria-busy', 'true');
    const workspace = new NpcGeneratorWorkspace(root, status);
    try {
      await workspace.load();
      return workspace;
    } catch (error) {
      root.setAttribute('aria-busy', 'false');
      workspace.setStatus(`Universal NPC data could not be loaded: ${error.message}`, 'error');
      root.innerHTML = '<div class="module-empty">The NPC generator requires GitHub Pages or a local web server so its JSON data files can be loaded.</div>';
      return workspace;
    }
  }

  globalThis.NpcProfileGeneratorUI = Object.freeze({
    DATA_URLS,
    mergePackData,
    NpcGeneratorWorkspace,
    mount
  });
})();
