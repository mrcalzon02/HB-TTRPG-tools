(() => {
  'use strict';

  const Kernel = window.KaysenderEditorKernel;
  if (!Kernel) {
    console.error('Kaysender editor production shell could not start: shared kernel is missing.');
    return;
  }

  const activeEnvelopes = new Map();
  let activeSpecId = '';

  const editorSpecs = {
    island: {
      id: 'floating-island-editor',
      moduleId: 'floating-island-generator',
      label: 'Open Production Island Editor',
      profileType: 'floating-island-foundation-profile',
      panelId: 'kaysender-editor-panel',
      formId: 'floating-island-editor-form',
      outputId: 'floating-island-editor-output',
      buildButtonId: 'island-build-profile',
      randomizeButtonId: 'island-randomize',
      legacyButtonSelector: '.editor-launch',
      open: () => window.openFloatingIslandEditor?.()
    },
    settlement: {
      id: 'settlement-editor',
      moduleId: 'settlement-generator',
      label: 'Open Production Settlement Editor',
      profileType: 'settlement-profile',
      panelId: 'kaysender-settlement-editor-panel',
      formId: 'settlement-editor-form',
      outputId: 'settlement-editor-output',
      buildButtonId: 'settlement-build-profile',
      randomizeButtonId: 'settlement-randomize',
      legacyButtonSelector: '.settlement-editor-launch',
      open: () => window.openSettlementEditor?.()
    },
    airship: {
      id: 'airship-editor',
      moduleId: 'airship-vessel-generator',
      label: 'Open Production Airship Editor',
      profileType: 'airship-profile',
      panelId: 'kaysender-airship-editor-panel',
      formId: 'airship-editor-form',
      outputId: 'airship-editor-output',
      buildButtonId: 'airship-build-profile',
      randomizeButtonId: 'airship-randomize',
      legacyButtonSelector: '.airship-editor-launch',
      open: () => window.openAirshipEditor?.()
    }
  };

  function injectStyles() {
    if (document.getElementById('kaysender-mainline-editor-style')) return;
    const style = document.createElement('style');
    style.id = 'kaysender-mainline-editor-style';
    style.textContent = `
      .production-editor-launch{margin-top:10px;width:100%}
      .mainline-editor-shell{border:1px solid rgba(200,138,53,.55);border-radius:24px;padding:18px;margin:18px 0 28px;background:linear-gradient(180deg,rgba(200,138,53,.08),rgba(0,0,0,.18));box-shadow:var(--shadow)}
      .mainline-editor-shell[hidden]{display:none}.mainline-editor-shell-header{display:flex;justify-content:space-between;gap:16px;align-items:flex-start;flex-wrap:wrap}
      .mainline-editor-stage{color:var(--accent);font-weight:800;text-transform:uppercase;letter-spacing:.08em;font-size:.75rem}.mainline-editor-toolbar{display:flex;flex-wrap:wrap;gap:8px;margin:14px 0}
      .mainline-editor-toolbar button{width:auto}.mainline-editor-status-grid{display:grid;grid-template-columns:minmax(260px,1fr) minmax(260px,1fr);gap:12px;margin:12px 0}
      .mainline-editor-status-card{border:1px solid var(--line);border-radius:14px;padding:12px;background:rgba(0,0,0,.18)}
      .mainline-editor-status-card h3{margin-top:0;color:var(--accent)}.mainline-editor-status-card ul{margin:0;padding-left:20px;color:var(--muted)}
      .editor-diagnostic-error{color:#ff8b8b}.editor-diagnostic-warning{color:#e7bf73}.editor-diagnostic-info{color:var(--muted)}
      .editor-field-lock{display:flex;align-items:center;gap:6px;margin-top:4px;color:var(--muted);font-size:.7rem}.editor-field-lock input{width:auto!important;padding:0!important}
      .production-hidden{display:none!important}.mainline-editor-body>.editor-panel{margin:0;border-color:rgba(255,255,255,.1);box-shadow:none;background:rgba(0,0,0,.08)}
      @media(max-width:850px){.mainline-editor-status-grid{grid-template-columns:1fr}.mainline-editor-toolbar button{flex:1 1 180px}}
    `;
    document.head.appendChild(style);
  }

  function switchKaysenderView() {
    document.querySelectorAll('.view').forEach(view => view.classList.toggle('active', view.id === 'kaysender'));
    document.querySelectorAll('.nav-button').forEach(button => button.classList.toggle('active', button.dataset.view === 'kaysender'));
  }

  function getShell() {
    let shell = document.getElementById('kaysender-mainline-editor-shell');
    if (shell) return shell;
    shell = document.createElement('section');
    shell.id = 'kaysender-mainline-editor-shell';
    shell.className = 'mainline-editor-shell no-print';
    shell.hidden = true;
    shell.innerHTML = `
      <div class="mainline-editor-shell-header">
        <div>
          <div class="mainline-editor-stage">P0 Shared Editor Kernel</div>
          <h2 id="mainline-editor-title">Kaysender Production Editor</h2>
          <p id="mainline-editor-description" class="helper-note">Shared profile contract, drafts, validation, inheritance, locks, diagnostics, and canonical exports.</p>
        </div>
        <button id="mainline-editor-close" class="secondary-action" type="button">Close Editor</button>
      </div>
      <div id="mainline-editor-toolbar" class="mainline-editor-toolbar"></div>
      <input id="mainline-editor-import-file" type="file" accept="application/json" hidden />
      <div class="mainline-editor-status-grid">
        <article class="mainline-editor-status-card"><h3>Diagnostics</h3><ul id="mainline-editor-diagnostics"><li class="editor-diagnostic-info">No diagnostics yet.</li></ul></article>
        <article class="mainline-editor-status-card"><h3>Provenance and Inheritance</h3><ul id="mainline-editor-provenance"><li>No inherited records loaded.</li></ul></article>
      </div>
      <div id="mainline-editor-body" class="mainline-editor-body"></div>`;
    const status = document.getElementById('kaysender-status');
    if (status) status.insertAdjacentElement('afterend', shell);
    else document.getElementById('kaysender')?.prepend(shell);
    shell.querySelector('#mainline-editor-close')?.addEventListener('click', () => {
      shell.hidden = true;
      activeSpecId = '';
    });
    return shell;
  }

  function waitForPanel(panelId, timeoutMs = 6000) {
    return new Promise((resolve, reject) => {
      const started = Date.now();
      const poll = () => {
        const panel = document.getElementById(panelId);
        if (panel && !panel.querySelector('.helper-note')?.textContent?.startsWith('Loading')) return resolve(panel);
        if (Date.now() - started >= timeoutMs) return reject(new Error(`Editor panel ${panelId} did not become ready.`));
        window.setTimeout(poll, 50);
      };
      poll();
    });
  }

  async function launchEditor(spec) {
    switchKaysenderView();
    const shell = getShell();
    shell.hidden = false;
    shell.querySelector('#mainline-editor-title').textContent = spec.label.replace(/^Open /, '').replace(/ Editor$/, ' Editor');
    shell.querySelector('#mainline-editor-description').textContent = 'Shared production shell with canonical envelope, stable identity, recoverable drafts, field locks, migrations, provenance, and actionable diagnostics.';
    renderDiagnostics([Kernel.diagnostic('info', 'editor-loading', `Opening ${spec.label.replace(/^Open /, '')}.`)]);
    spec.open();
    try {
      const panel = await waitForPanel(spec.panelId);
      activeSpecId = spec.id;
      adoptPanel(spec, panel);
      shell.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (error) {
      renderDiagnostics([Kernel.diagnostic('error', 'editor-open-failed', error.message)]);
    }
  }

  function adoptPanel(spec, panel) {
    const shell = getShell();
    const body = shell.querySelector('#mainline-editor-body');
    document.querySelectorAll('.editor-panel').forEach(item => {
      if (item !== panel) item.hidden = true;
    });
    panel.hidden = false;
    body.replaceChildren(panel);
    panel.dataset.productionEditorId = spec.id;
    decorateLockControls(spec, panel);
    bindContextAdapters(spec, panel);
    hideDuplicatedLegacyActions(spec, panel);
    renderToolbar(spec, panel);
    renderDiagnostics([Kernel.diagnostic('info', 'editor-ready', `${spec.label.replace(/^Open /, '')} is running through the P0 shared shell.`)]);
    refreshProvenance(spec, panel);
  }

  function hideDuplicatedLegacyActions(spec, panel) {
    const ids = [spec.randomizeButtonId];
    if (spec.id === 'floating-island-editor') ids.push('island-copy-json', 'island-download-json');
    if (spec.id === 'settlement-editor') ids.push('settlement-copy-json', 'settlement-download-json');
    if (spec.id === 'airship-editor') ids.push('airship-copy-json', 'airship-download-json');
    ids.forEach(id => panel.querySelector(`#${id}`)?.classList.add('production-hidden'));
  }

  function decorateLockControls(spec, panel) {
    const form = panel.querySelector(`#${spec.formId}`);
    if (!form) return;
    form.querySelectorAll('label').forEach(label => {
      const field = label.querySelector('input[name],select[name],textarea[name]');
      if (!field || label.querySelector('[data-editor-lock]')) return;
      const lock = document.createElement('span');
      lock.className = 'editor-field-lock';
      lock.innerHTML = `<input type="checkbox" data-editor-lock="${escapeHtml(field.name)}" /> Lock during randomization`;
      label.appendChild(lock);
    });
  }

  function lockedFields(panel) {
    return Array.from(panel.querySelectorAll('[data-editor-lock]:checked')).map(item => item.dataset.editorLock).filter(Boolean);
  }

  function renderToolbar(spec, panel) {
    const toolbar = getShell().querySelector('#mainline-editor-toolbar');
    toolbar.innerHTML = `
      <button class="primary-action" type="button" data-action="rebuild">Rebuild Record</button>
      <button class="secondary-action" type="button" data-action="new">New Blank Record</button>
      <button class="secondary-action" type="button" data-action="import">Load / Import Record</button>
      <button class="secondary-action" type="button" data-action="recover">Recover Local Draft</button>
      <button class="secondary-action" type="button" data-action="validate">Validate Record</button>
      <button class="secondary-action" type="button" data-action="save">Save Local Draft</button>
      <button class="secondary-action" type="button" data-action="clone">Clone Record</button>
      <button class="secondary-action" type="button" data-action="randomize">Randomize Unlocked Fields</button>
      <button class="secondary-action" type="button" data-action="copy">Copy Canonical JSON</button>
      <button class="secondary-action" type="button" data-action="export">Export Canonical JSON</button>
      <button class="secondary-action" type="button" data-action="wiki">Export Wiki Draft</button>`;

    toolbar.querySelector('[data-action="rebuild"]').addEventListener('click', () => rebuild(spec, panel));
    toolbar.querySelector('[data-action="new"]').addEventListener('click', () => newBlankRecord(spec, panel));
    toolbar.querySelector('[data-action="import"]').addEventListener('click', () => getShell().querySelector('#mainline-editor-import-file').click());
    toolbar.querySelector('[data-action="recover"]').addEventListener('click', () => recoverDraft(spec, panel));
    toolbar.querySelector('[data-action="validate"]').addEventListener('click', () => validateCurrent(spec, panel));
    toolbar.querySelector('[data-action="save"]').addEventListener('click', () => saveCurrentDraft(spec, panel));
    toolbar.querySelector('[data-action="clone"]').addEventListener('click', () => cloneCurrent(spec, panel));
    toolbar.querySelector('[data-action="randomize"]').addEventListener('click', () => randomizeUnlocked(spec, panel));
    toolbar.querySelector('[data-action="copy"]').addEventListener('click', () => copyCurrent(spec, panel));
    toolbar.querySelector('[data-action="export"]').addEventListener('click', () => exportCurrent(spec, panel));
    toolbar.querySelector('[data-action="wiki"]').addEventListener('click', () => exportWikiDraft(spec, panel));

    const fileInput = getShell().querySelector('#mainline-editor-import-file');
    fileInput.onchange = async event => {
      const file = event.target.files?.[0];
      event.target.value = '';
      if (!file) return;
      try {
        const text = await file.text();
        importRecord(spec, panel, text);
      } catch (error) {
        renderDiagnostics([Kernel.diagnostic('error', 'file-read-failed', `Could not read ${file.name}: ${error.message}`)]);
      }
    };
  }

  function rebuild(spec, panel) {
    panel.querySelector(`#${spec.buildButtonId}`)?.click();
    window.setTimeout(() => {
      buildEnvelope(spec, panel);
      refreshProvenance(spec, panel);
    }, 0);
  }

  function newBlankRecord(spec, panel) {
    const form = panel.querySelector(`#${spec.formId}`);
    form?.reset();
    panel.querySelectorAll('[data-editor-lock]').forEach(item => { item.checked = false; });
    clearContext(panel, 'island');
    clearContext(panel, 'settlement');
    activeEnvelopes.delete(spec.id);
    Kernel.clearDraft(spec.id);
    rebuild(spec, panel);
    renderDiagnostics([Kernel.diagnostic('info', 'blank-record-created', 'Created a new blank record with fresh profile identity.')]);
  }

  function clearContext(panel, type) {
    const datasetKey = type === 'island' ? 'sourceIsland' : 'sourceSettlement';
    const envelopeKey = type === 'island' ? 'sourceIslandEnvelope' : 'sourceSettlementEnvelope';
    panel.dataset[datasetKey] = '';
    panel.dataset[envelopeKey] = '';
    panel.querySelector(`#settlement-${type}-import`)?.replaceChildren();
    const textareas = [panel.querySelector(`#settlement-${type}-import`), panel.querySelector(`#airship-${type}-import`)];
    textareas.filter(Boolean).forEach(item => { item.value = ''; });
    const statuses = [panel.querySelector(`#settlement-${type}-status`), panel.querySelector(`#airship-${type}-status`)];
    statuses.filter(Boolean).forEach(item => { item.textContent = `No ${type} profile loaded.`; });
  }

  function readRawProfile(spec, panel) {
    const output = panel.querySelector(`#${spec.outputId}`);
    const textareas = output ? Array.from(output.querySelectorAll('textarea.json-export')) : [];
    const target = textareas.at(-1);
    if (!target?.value?.trim()) return null;
    try { return JSON.parse(target.value); } catch (_) { return null; }
  }

  function collectInheritance(spec, panel) {
    const refs = [];
    const pairs = [
      ['sourceIslandEnvelope', 'parent-island'],
      ['sourceSettlementEnvelope', 'parent-settlement']
    ];
    pairs.forEach(([key, relationship]) => {
      if (!panel.dataset[key]) return;
      try {
        const envelope = JSON.parse(panel.dataset[key]);
        const reference = Kernel.inheritanceReference(envelope, relationship);
        if (reference) refs.push(reference);
      } catch (_) { /* diagnostics already surfaced during import */ }
    });
    const previous = activeEnvelopes.get(spec.id);
    return refs.length ? refs : (previous?.inheritance || []);
  }

  function buildEnvelope(spec, panel) {
    const raw = readRawProfile(spec, panel);
    if (!raw) return null;
    const envelope = Kernel.createEnvelope(raw, {
      existingEnvelope: activeEnvelopes.get(spec.id),
      editorId: spec.id,
      moduleId: spec.moduleId,
      origin: activeEnvelopes.has(spec.id) ? undefined : 'editor-created',
      inheritance: collectInheritance(spec, panel),
      locks: lockedFields(panel)
    });
    activeEnvelopes.set(spec.id, envelope);
    return envelope;
  }

  function importRecord(spec, panel, input) {
    const result = Kernel.normalizeImportedRecord(input, {
      expectedTypes: [spec.profileType],
      editorId: spec.id,
      moduleId: spec.moduleId
    });
    renderDiagnostics(result.diagnostics);
    if (!result.ok) return;
    activeEnvelopes.set(spec.id, result.envelope);
    applyEnvelope(spec, panel, result.envelope);
  }

  function applyEnvelope(spec, panel, envelope) {
    const form = panel.querySelector(`#${spec.formId}`);
    Kernel.applyProfileToForm(form, spec.profileType, envelope.data);
    applyInheritedContext(panel, envelope.data?.sourceIslandProfile, 'island');
    applyInheritedContext(panel, envelope.data?.sourceSettlementProfile, 'settlement');
    panel.querySelectorAll('[data-editor-lock]').forEach(item => {
      item.checked = envelope.locks?.includes(item.dataset.editorLock) || false;
    });
    rebuild(spec, panel);
    renderDiagnostics([
      ...Kernel.validateEnvelope(envelope, [spec.profileType]),
      Kernel.diagnostic('info', 'record-loaded', `Loaded ${envelope.name} (${envelope.profileId}).`)
    ]);
  }

  function applyInheritedContext(panel, record, type) {
    if (!record) return;
    const expected = type === 'island' ? ['floating-island-foundation-profile'] : ['settlement-profile'];
    const result = Kernel.normalizeImportedRecord(record, { expectedTypes: expected });
    if (!result.ok) return;
    const datasetKey = type === 'island' ? 'sourceIsland' : 'sourceSettlement';
    const envelopeKey = type === 'island' ? 'sourceIslandEnvelope' : 'sourceSettlementEnvelope';
    panel.dataset[datasetKey] = JSON.stringify(result.context);
    panel.dataset[envelopeKey] = JSON.stringify(result.envelope);
    const textarea = panel.querySelector(`#settlement-${type}-import`) || panel.querySelector(`#airship-${type}-import`);
    if (textarea) textarea.value = JSON.stringify(result.envelope, null, 2);
  }

  function validateCurrent(spec, panel) {
    rebuild(spec, panel);
    window.setTimeout(() => {
      const envelope = buildEnvelope(spec, panel);
      if (!envelope) return renderDiagnostics([Kernel.diagnostic('error', 'profile-unavailable', 'No profile JSON is available to validate.')]);
      const diagnostics = Kernel.validateEnvelope(envelope, [spec.profileType]);
      if (!diagnostics.some(item => item.severity === 'error')) diagnostics.push(Kernel.diagnostic('info', 'validation-passed', `Record ${envelope.profileId} passed shared envelope and profile-type validation.`));
      renderDiagnostics(diagnostics);
    }, 0);
  }

  function saveCurrentDraft(spec, panel) {
    const envelope = buildEnvelope(spec, panel);
    if (!envelope) return renderDiagnostics([Kernel.diagnostic('error', 'draft-save-failed', 'No profile is available to save.')]);
    const result = Kernel.saveDraft(spec.id, envelope);
    renderDiagnostics([Kernel.diagnostic(result.ok ? 'info' : 'error', result.ok ? 'draft-saved' : 'draft-save-failed', result.message)]);
  }

  function recoverDraft(spec, panel) {
    const envelope = Kernel.loadDraft(spec.id);
    if (!envelope) return renderDiagnostics([Kernel.diagnostic('warning', 'draft-not-found', 'No recoverable local draft exists for this editor.')]);
    activeEnvelopes.set(spec.id, envelope);
    applyEnvelope(spec, panel, envelope);
  }

  function cloneCurrent(spec, panel) {
    const envelope = buildEnvelope(spec, panel);
    if (!envelope) return renderDiagnostics([Kernel.diagnostic('error', 'clone-failed', 'No profile is available to clone.')]);
    const clone = Kernel.cloneEnvelope(envelope, { editorId: spec.id, moduleId: spec.moduleId });
    activeEnvelopes.set(spec.id, clone);
    applyEnvelope(spec, panel, clone);
  }

  function randomizeUnlocked(spec, panel) {
    const form = panel.querySelector(`#${spec.formId}`);
    const locked = lockedFields(panel);
    const snapshot = Kernel.snapshotFields(form, locked);
    panel.querySelector(`#${spec.randomizeButtonId}`)?.click();
    window.setTimeout(() => {
      Kernel.restoreFields(form, snapshot);
      panel.querySelector(`#${spec.buildButtonId}`)?.click();
      buildEnvelope(spec, panel);
      renderDiagnostics([Kernel.diagnostic('info', 'selective-randomization-complete', `Randomized unlocked fields while preserving ${locked.length} lock${locked.length === 1 ? '' : 's'}.`)]);
    }, 0);
  }

  async function copyCurrent(spec, panel) {
    const envelope = buildEnvelope(spec, panel);
    if (!envelope) return renderDiagnostics([Kernel.diagnostic('error', 'copy-failed', 'No profile is available to copy.')]);
    try {
      const copied = await Kernel.copyJson(envelope);
      renderDiagnostics([Kernel.diagnostic(copied ? 'info' : 'warning', copied ? 'canonical-json-copied' : 'clipboard-unavailable', copied ? 'Canonical profile JSON copied.' : 'Clipboard API is unavailable; use Export Canonical JSON.')]);
    } catch (error) {
      renderDiagnostics([Kernel.diagnostic('error', 'copy-failed', error.message)]);
    }
  }

  function exportCurrent(spec, panel) {
    const envelope = buildEnvelope(spec, panel);
    if (!envelope) return renderDiagnostics([Kernel.diagnostic('error', 'export-failed', 'No profile is available to export.')]);
    Kernel.downloadJson(envelope, `${Kernel.slugify(envelope.name)}.${spec.profileType}.json`);
    renderDiagnostics([Kernel.diagnostic('info', 'canonical-json-exported', `Exported ${envelope.profileId} revision ${envelope.revision}.`)]);
  }

  function exportWikiDraft(spec, panel) {
    const raw = readRawProfile(spec, panel);
    const draft = raw?.outputs?.wikiDraft;
    if (!draft) return renderDiagnostics([Kernel.diagnostic('error', 'wiki-export-failed', 'This record has no wiki draft output.')]);
    Kernel.downloadJson(draft, `${Kernel.slugify(draft.title || raw.name)}.wiki-draft.json`);
    renderDiagnostics([Kernel.diagnostic('info', 'wiki-draft-exported', `Exported wiki draft for ${draft.title || raw.name}.`)]);
  }

  function bindContextAdapters(spec, panel) {
    if (panel.dataset.productionContextBound === 'true') return;
    panel.dataset.productionContextBound = 'true';
    panel.addEventListener('click', event => {
      const target = event.target.closest('button');
      const definitions = {
        'settlement-load-island': { type: 'island', expected: ['floating-island-foundation-profile'], textareaId: 'settlement-island-import' },
        'airship-load-island': { type: 'island', expected: ['floating-island-foundation-profile'], textareaId: 'airship-island-import' },
        'airship-load-settlement': { type: 'settlement', expected: ['settlement-profile'], textareaId: 'airship-settlement-import' }
      };
      const definition = definitions[target?.id];
      if (!definition) return;
      const textarea = panel.querySelector(`#${definition.textareaId}`);
      if (!textarea?.value?.trim()) return;
      const result = Kernel.normalizeImportedRecord(textarea.value, { expectedTypes: definition.expected });
      renderDiagnostics(result.diagnostics);
      if (!result.ok) {
        event.preventDefault();
        event.stopImmediatePropagation();
        return;
      }
      const datasetKey = definition.type === 'island' ? 'sourceIslandEnvelope' : 'sourceSettlementEnvelope';
      panel.dataset[datasetKey] = JSON.stringify(result.envelope);
      textarea.value = JSON.stringify(result.context, null, 2);
      window.setTimeout(() => refreshProvenance(spec, panel), 0);
    }, true);
  }

  function refreshProvenance(spec, panel) {
    const list = getShell().querySelector('#mainline-editor-provenance');
    const envelope = activeEnvelopes.get(spec.id);
    const inheritance = collectInheritance(spec, panel);
    const items = [];
    if (envelope) items.push(`Current record: ${escapeHtml(envelope.profileId)} revision ${envelope.revision}.`);
    inheritance.forEach(item => items.push(`${escapeHtml(item.relationship)}: ${escapeHtml(item.name)} (${escapeHtml(item.profileId)}).`));
    if (envelope?.provenance?.migrationLog?.length) {
      envelope.provenance.migrationLog.forEach(item => items.push(`Migration: ${escapeHtml(item.message)}.`));
    }
    list.innerHTML = items.length ? items.map(item => `<li>${item}</li>`).join('') : '<li>No inherited records loaded.</li>';
  }

  function renderDiagnostics(diagnostics) {
    const list = getShell().querySelector('#mainline-editor-diagnostics');
    const records = Array.isArray(diagnostics) && diagnostics.length ? diagnostics : [Kernel.diagnostic('info', 'no-diagnostics', 'No diagnostics reported.')];
    list.innerHTML = records.map(item => `<li class="editor-diagnostic-${escapeHtml(item.severity)}"><strong>${escapeHtml(item.code)}</strong>: ${escapeHtml(item.message)}${item.path ? ` <code>${escapeHtml(item.path)}</code>` : ''}</li>`).join('');
  }

  function decorateCards() {
    Object.values(editorSpecs).forEach(spec => {
      document.querySelectorAll(`.module-card[data-module-id="${spec.moduleId}"]`).forEach(card => {
        card.querySelectorAll(spec.legacyButtonSelector).forEach(button => button.remove());
        if (spec.id === 'floating-island-editor') card.dataset.editorLinked = 'true';
        if (spec.id === 'settlement-editor') card.dataset.settlementEditorLinked = 'true';
        if (spec.id === 'airship-editor') card.dataset.airshipEditorLinked = 'true';
        if (card.querySelector(`[data-production-editor="${spec.id}"]`)) return;
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'primary-action production-editor-launch';
        button.dataset.productionEditor = spec.id;
        button.textContent = spec.label;
        button.addEventListener('click', () => launchEditor(spec));
        card.appendChild(button);
      });
    });
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  }

  function install() {
    injectStyles();
    getShell();
    decorateCards();
    const observer = new MutationObserver(decorateCards);
    observer.observe(document.body, { childList: true, subtree: true });
    window.setInterval(decorateCards, 1000);
    window.KaysenderMainlineEditorProduction = Object.freeze({
      launchIsland: () => launchEditor(editorSpecs.island),
      launchSettlement: () => launchEditor(editorSpecs.settlement),
      launchAirship: () => launchEditor(editorSpecs.airship),
      getActiveEditorId: () => activeSpecId
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install);
  else install();
})();
