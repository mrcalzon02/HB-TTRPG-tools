(() => {
  'use strict';

  const Kernel = window.KaysenderEditorKernel;
  const Registry = window.KaysenderEditorAdapters;
  const Lifecycle = window.KaysenderEditorLifecycle;
  if (!Kernel || !Registry || !Lifecycle) {
    console.error('Kaysender editor production runtime could not start: shared kernel, adapter registry, or lifecycle is missing.');
    return;
  }

  const activeEnvelopes = new Map();
  let activeEditorId = '';

  function adapters() {
    return Registry.list();
  }

  function resolveAdapter(editorIdOrAlias) {
    return Registry.resolve(editorIdOrAlias);
  }

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
      .mainline-editor-record-state{margin:.5rem 0 0;color:var(--muted);font-weight:700}.mainline-editor-record-state[data-dirty="true"]{color:#e7bf73}
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
          <div class="mainline-editor-stage">P0 Shared Editor Framework</div>
          <h2 id="mainline-editor-title">Kaysender Production Editor</h2>
          <p id="mainline-editor-description" class="helper-note">Shared profile contract, drafts, validation, inheritance, locks, diagnostics, and canonical exports.</p>
          <p id="mainline-editor-record-state" class="mainline-editor-record-state" data-dirty="false">Ready.</p>
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
      if (activeEditorId && !Lifecycle.confirmLeave(activeEditorId)) return;
      shell.hidden = true;
      activeEditorId = '';
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

  async function launch(editorIdOrAlias) {
    const adapter = resolveAdapter(editorIdOrAlias);
    if (!adapter) {
      renderDiagnostics([Kernel.diagnostic('error', 'editor-adapter-missing', `No shared editor adapter is registered for ${editorIdOrAlias}.`)]);
      return null;
    }
    if (activeEditorId && activeEditorId !== adapter.id && !Lifecycle.confirmLeave(activeEditorId, 'The current editor has unsaved changes. Switch editors anyway?')) {
      return null;
    }
    switchKaysenderView();
    const shell = getShell();
    shell.hidden = false;
    shell.querySelector('#mainline-editor-title').textContent = adapter.label.replace(/^Open /, '');
    shell.querySelector('#mainline-editor-description').textContent = `Adapter-driven ${adapter.profileType} editor with shared lifecycle, canonical identity, imports, drafts, locks, provenance, and diagnostics.`;
    renderDiagnostics([Kernel.diagnostic('info', 'editor-loading', `Opening ${adapter.label.replace(/^Open /, '')}.`)]);
    adapter.open();
    try {
      const panel = await waitForPanel(adapter.panelId);
      activeEditorId = adapter.id;
      adoptPanel(adapter, panel);
      shell.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return panel;
    } catch (error) {
      renderDiagnostics([Kernel.diagnostic('error', 'editor-open-failed', error.message)]);
      return null;
    }
  }

  function adoptPanel(adapter, panel) {
    const shell = getShell();
    const body = shell.querySelector('#mainline-editor-body');
    document.querySelectorAll('.editor-panel').forEach(item => {
      if (item !== panel) item.hidden = true;
    });
    panel.hidden = false;
    body.replaceChildren(panel);
    panel.dataset.productionEditorId = adapter.id;
    decorateLockControls(adapter, panel);
    bindParentImports(adapter, panel);
    hideDuplicatedLegacyActions(adapter, panel);
    renderToolbar(adapter, panel);
    Lifecycle.bind(adapter, panel, { autosave: () => autosaveDraft(adapter, panel) });
    renderLifecycleState(Lifecycle.getState(adapter.id));
    const existing = activeEnvelopes.get(adapter.id);
    if (existing) {
      applyEnvelope(adapter, panel, existing);
      Lifecycle.markClean(adapter.id, `Restored open record ${existing.name}.`);
    } else {
      renderDiagnostics([Kernel.diagnostic('info', 'editor-ready', `${adapter.label.replace(/^Open /, '')} is running through the shared adapter runtime.`)]);
      refreshProvenance(adapter, panel);
    }
  }

  function hideDuplicatedLegacyActions(adapter, panel) {
    adapter.hiddenLegacyActionIds.forEach(id => panel.querySelector(`#${id}`)?.classList.add('production-hidden'));
  }

  function decorateLockControls(adapter, panel) {
    const form = panel.querySelector(`#${adapter.formId}`);
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
    return Array.from(panel.querySelectorAll('[data-editor-lock]:checked'))
      .map(item => item.dataset.editorLock)
      .filter(Boolean);
  }

  function renderToolbar(adapter, panel) {
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

    toolbar.querySelector('[data-action="rebuild"]').addEventListener('click', () => rebuild(adapter, panel));
    toolbar.querySelector('[data-action="new"]').addEventListener('click', () => newBlankRecord(adapter, panel));
    toolbar.querySelector('[data-action="import"]').addEventListener('click', () => getShell().querySelector('#mainline-editor-import-file').click());
    toolbar.querySelector('[data-action="recover"]').addEventListener('click', () => recoverDraft(adapter, panel));
    toolbar.querySelector('[data-action="validate"]').addEventListener('click', () => validateCurrent(adapter, panel));
    toolbar.querySelector('[data-action="save"]').addEventListener('click', () => saveCurrentDraft(adapter, panel));
    toolbar.querySelector('[data-action="clone"]').addEventListener('click', () => cloneCurrent(adapter, panel));
    toolbar.querySelector('[data-action="randomize"]').addEventListener('click', () => randomizeUnlocked(adapter, panel));
    toolbar.querySelector('[data-action="copy"]').addEventListener('click', () => copyCurrent(adapter, panel));
    toolbar.querySelector('[data-action="export"]').addEventListener('click', () => exportCurrent(adapter, panel));
    toolbar.querySelector('[data-action="wiki"]').addEventListener('click', () => exportWikiDraft(adapter, panel));

    const fileInput = getShell().querySelector('#mainline-editor-import-file');
    fileInput.onchange = async event => {
      const file = event.target.files?.[0];
      event.target.value = '';
      if (!file) return;
      try {
        importRecord(adapter, panel, await file.text());
      } catch (error) {
        renderDiagnostics([Kernel.diagnostic('error', 'file-read-failed', `Could not read ${file.name}: ${error.message}`)]);
      }
    };
  }

  function triggerBuild(adapter, panel) {
    panel.querySelector(`#${adapter.buildButtonId}`)?.click();
  }

  function rebuild(adapter, panel) {
    triggerBuild(adapter, panel);
    window.setTimeout(() => {
      buildEnvelope(adapter, panel);
      refreshProvenance(adapter, panel);
    }, 0);
  }

  function clearParentImport(panel, definition) {
    panel.dataset[definition.contextDatasetKey] = '';
    panel.dataset[definition.envelopeDatasetKey] = '';
    const textarea = panel.querySelector(`#${definition.textareaId}`);
    if (textarea) textarea.value = '';
    const status = definition.statusId ? panel.querySelector(`#${definition.statusId}`) : null;
    if (status) status.textContent = definition.emptyStatus;
  }

  function newBlankRecord(adapter, panel) {
    if (!Lifecycle.confirmLeave(adapter.id, 'This record has unsaved changes. Create a new blank record anyway?')) return;
    panel.querySelector(`#${adapter.formId}`)?.reset();
    panel.querySelectorAll('[data-editor-lock]').forEach(item => { item.checked = false; });
    adapter.parentImports.forEach(definition => clearParentImport(panel, definition));
    activeEnvelopes.delete(adapter.id);
    Kernel.clearDraft(adapter.id, true);
    Lifecycle.reset(adapter.id, 'Old recovery draft cleared. New blank record has not been saved.');
    Lifecycle.markDirty(adapter.id, 'New blank record has unsaved changes.', { autosave: false });
    rebuild(adapter, panel);
    renderDiagnostics([Kernel.diagnostic('info', 'blank-record-created', 'Created a new blank record with fresh profile identity and cleared its previous recovery draft.')]);
  }

  function readRawProfile(adapter, panel) {
    if (typeof adapter.readProfile === 'function') return adapter.readProfile(panel);
    const output = panel.querySelector(`#${adapter.outputId}`);
    const target = output ? Array.from(output.querySelectorAll('textarea.json-export')).at(-1) : null;
    if (!target?.value?.trim()) return null;
    try {
      return JSON.parse(target.value);
    } catch (error) {
      renderDiagnostics([Kernel.diagnostic('error', 'editor-output-invalid', `Editor output is not valid JSON: ${error.message}`)]);
      return null;
    }
  }

  function collectInheritance(adapter, panel) {
    const references = [];
    adapter.parentImports.forEach(definition => {
      const serialized = panel.dataset[definition.envelopeDatasetKey];
      if (!serialized) return;
      try {
        const reference = Kernel.inheritanceReference(JSON.parse(serialized), definition.relationship);
        if (reference) references.push(reference);
      } catch (error) {
        renderDiagnostics([Kernel.diagnostic('warning', 'parent-envelope-unreadable', `Could not read ${definition.id} provenance: ${error.message}`)]);
      }
    });
    return references;
  }

  function buildEnvelope(adapter, panel) {
    const raw = readRawProfile(adapter, panel);
    if (!raw) return null;
    const envelope = Kernel.createEnvelope(raw, {
      existingEnvelope: activeEnvelopes.get(adapter.id),
      editorId: adapter.id,
      moduleId: adapter.moduleId,
      origin: activeEnvelopes.has(adapter.id) ? undefined : 'editor-created',
      inheritance: collectInheritance(adapter, panel),
      locks: lockedFields(panel)
    });
    activeEnvelopes.set(adapter.id, envelope);
    return envelope;
  }

  function importRecord(adapter, panel, input) {
    const result = Kernel.normalizeImportedRecord(input, {
      expectedTypes: [adapter.profileType],
      editorId: adapter.id,
      moduleId: adapter.moduleId
    });
    renderDiagnostics(result.diagnostics);
    if (!result.ok) return null;
    activeEnvelopes.set(adapter.id, result.envelope);
    Lifecycle.reset(adapter.id, `Loaded ${result.envelope.name}. Synchronizing recovery state.`);
    const synchronizationVersion = Lifecycle.checkpoint(adapter.id);
    applyEnvelope(adapter, panel, result.envelope);
    window.setTimeout(() => {
      const synchronizedEnvelope = activeEnvelopes.get(adapter.id) || result.envelope;
      const draftResult = Kernel.saveDraft(adapter.id, synchronizedEnvelope);
      if (draftResult.ok) {
        Lifecycle.markCleanIfUnchanged(
          adapter.id,
          synchronizationVersion,
          `Loaded ${synchronizedEnvelope.name}. Recovery draft synchronized.`
        );
        return;
      }
      Lifecycle.markDirty(
        adapter.id,
        `Loaded ${synchronizedEnvelope.name}, but its recovery draft could not be synchronized.`,
        { autosave: false }
      );
      renderDiagnostics([
        ...Kernel.validateEnvelope(synchronizedEnvelope, [adapter.profileType]),
        Kernel.diagnostic('error', 'import-draft-sync-failed', draftResult.message)
      ]);
    }, 0);
    return result.envelope;
  }

  function inheritanceFor(envelope, definition) {
    return envelope.inheritance?.find(reference => reference.relationship === definition.relationship) || null;
  }

  function unresolvedParentEnvelope(reference) {
    const sourceAdapter = adapters().find(adapter => adapter.profileType === reference.profileType);
    const timestamp = reference.sourceUpdatedAt || new Date().toISOString();
    return {
      editorEnvelopeVersion: Kernel.ENVELOPE_VERSION,
      profileId: reference.profileId,
      profileType: reference.profileType,
      profileSchemaVersion: sourceAdapter?.currentSchemaVersion || '1.0.0',
      revision: reference.revision,
      createdAt: timestamp,
      updatedAt: timestamp,
      name: reference.name || 'Unavailable Parent',
      provenance: {
        editorId: sourceAdapter?.id || 'unresolved-parent-reference',
        moduleId: sourceAdapter?.moduleId || 'unresolved-parent-reference',
        origin: 'unresolved-inheritance-reference',
        importedAt: null,
        clonedFromProfileId: null,
        migrationLog: []
      },
      inheritance: [],
      locks: [],
      diagnostics: [Kernel.diagnostic('warning', 'inherited-source-data-missing', `Embedded context for ${reference.profileId} is unavailable.`)],
      data: {
        name: reference.name || 'Unavailable Parent',
        profileType: reference.profileType,
        schemaVersion: sourceAdapter?.currentSchemaVersion || '1.0.0'
      }
    };
  }

  function preserveUnresolvedParent(panel, definition, reference) {
    const placeholder = unresolvedParentEnvelope(reference);
    panel.dataset[definition.contextDatasetKey] = '';
    panel.dataset[definition.envelopeDatasetKey] = JSON.stringify(placeholder);
    const textarea = panel.querySelector(`#${definition.textareaId}`);
    if (textarea) textarea.value = JSON.stringify(placeholder, null, 2);
    const status = definition.statusId ? panel.querySelector(`#${definition.statusId}`) : null;
    if (status) status.textContent = `Pinned ${definition.id} ${reference.profileId} revision ${reference.revision} is retained, but its embedded context is unavailable.`;
  }

  function applyEnvelope(adapter, panel, envelope) {
    const form = panel.querySelector(`#${adapter.formId}`);
    Kernel.applyProfileToForm(form, adapter.profileType, envelope.data);
    const restorationDiagnostics = [];
    adapter.parentImports.forEach(definition => {
      const sourceRecord = envelope.data?.[definition.sourceProfileField];
      const reference = inheritanceFor(envelope, definition);
      if (sourceRecord) {
        const restored = applyParentRecord(panel, definition, sourceRecord, reference);
        if (!restored && reference) {
          preserveUnresolvedParent(panel, definition, reference);
          restorationDiagnostics.push(Kernel.diagnostic('error', 'pinned-parent-restore-failed', `Could not restore pinned ${definition.id} ${reference.profileId}; its reference was retained.`, 'inheritance'));
        }
      } else if (reference) {
        preserveUnresolvedParent(panel, definition, reference);
        restorationDiagnostics.push(Kernel.diagnostic('warning', 'inherited-source-data-missing', `The record retains a ${definition.relationship} reference to ${reference.profileId}, but its embedded parent context is missing.`, 'inheritance'));
      } else {
        clearParentImport(panel, definition);
      }
    });
    panel.querySelectorAll('[data-editor-lock]').forEach(item => {
      item.checked = envelope.locks?.includes(item.dataset.editorLock) || false;
    });
    rebuild(adapter, panel);
    renderDiagnostics([
      ...Kernel.validateEnvelope(envelope, [adapter.profileType]),
      ...restorationDiagnostics,
      Kernel.diagnostic('info', 'record-loaded', `Loaded ${envelope.name} (${envelope.profileId}).`)
    ]);
  }

  function applyParentRecord(panel, definition, record, reference = null) {
    const result = reference
      ? Kernel.restoreInheritedEnvelope(record, reference, { expectedTypes: definition.expectedTypes })
      : Kernel.normalizeImportedRecord(record, { expectedTypes: definition.expectedTypes });
    if (!result.ok) {
      renderDiagnostics(result.diagnostics);
      return false;
    }
    panel.dataset[definition.contextDatasetKey] = JSON.stringify(result.context);
    panel.dataset[definition.envelopeDatasetKey] = JSON.stringify(result.envelope);
    const textarea = panel.querySelector(`#${definition.textareaId}`);
    if (textarea) textarea.value = JSON.stringify(result.envelope, null, 2);
    const status = definition.statusId ? panel.querySelector(`#${definition.statusId}`) : null;
    if (status) {
      status.textContent = reference
        ? `Restored ${result.envelope.name} (${result.envelope.profileId}) at pinned revision ${result.envelope.revision}.`
        : `Loaded ${result.envelope.name} (${result.envelope.profileId}).`;
    }
    return true;
  }

  function validateCurrent(adapter, panel) {
    triggerBuild(adapter, panel);
    window.setTimeout(() => {
      const envelope = buildEnvelope(adapter, panel);
      if (!envelope) {
        renderDiagnostics([Kernel.diagnostic('error', 'profile-unavailable', 'No profile JSON is available to validate.')]);
        return;
      }
      const diagnostics = Kernel.validateEnvelope(envelope, [adapter.profileType]);
      if (!diagnostics.some(item => item.severity === 'error')) {
        diagnostics.push(Kernel.diagnostic('info', 'validation-passed', `Record ${envelope.profileId} passed shared envelope and profile-type validation.`));
      }
      renderDiagnostics(diagnostics);
    }, 0);
  }

  async function persistDraft(adapter, panel) {
    triggerBuild(adapter, panel);
    await new Promise(resolve => window.setTimeout(resolve, 0));
    const envelope = buildEnvelope(adapter, panel);
    if (!envelope) return { ok: false, message: 'No profile is available to save.' };
    return Kernel.saveDraft(adapter.id, envelope);
  }

  async function autosaveDraft(adapter, panel) {
    return persistDraft(adapter, panel);
  }

  async function saveCurrentDraft(adapter, panel) {
    const saveVersion = Lifecycle.checkpoint(adapter.id);
    const result = await persistDraft(adapter, panel);
    if (!result.ok) {
      renderDiagnostics([Kernel.diagnostic('error', 'draft-save-failed', result.message)]);
      return;
    }
    const cleanResult = Lifecycle.markCleanIfUnchanged(adapter.id, saveVersion, 'Local recovery draft saved manually.');
    renderDiagnostics([
      Kernel.diagnostic(
        cleanResult.ok ? 'info' : 'warning',
        cleanResult.ok ? 'draft-saved' : 'draft-saved-newer-edits-remain',
        cleanResult.ok ? result.message : `${result.message} Newer edits remain unsaved.`
      )
    ]);
  }

  function recoverDraft(adapter, panel) {
    const envelope = Kernel.loadDraft(adapter.id);
    if (!envelope) {
      renderDiagnostics([Kernel.diagnostic('warning', 'draft-not-found', 'No recoverable local draft exists for this editor.')]);
      return;
    }
    activeEnvelopes.set(adapter.id, envelope);
    applyEnvelope(adapter, panel, envelope);
    Lifecycle.markClean(adapter.id, `Recovered local draft ${envelope.name}.`);
  }

  function cloneCurrent(adapter, panel) {
    const envelope = buildEnvelope(adapter, panel);
    if (!envelope) {
      renderDiagnostics([Kernel.diagnostic('error', 'clone-failed', 'No profile is available to clone.')]);
      return;
    }
    const clone = Kernel.cloneEnvelope(envelope, { editorId: adapter.id, moduleId: adapter.moduleId });
    activeEnvelopes.set(adapter.id, clone);
    applyEnvelope(adapter, panel, clone);
    Lifecycle.markDirty(adapter.id, `Cloned ${envelope.name}; the new record has not been saved.`, { autosave: false });
  }

  function randomizeUnlocked(adapter, panel) {
    const form = panel.querySelector(`#${adapter.formId}`);
    const locked = lockedFields(panel);
    const snapshot = Kernel.snapshotFields(form, locked);
    panel.querySelector(`#${adapter.randomizeButtonId}`)?.click();
    window.setTimeout(() => {
      Kernel.restoreFields(form, snapshot);
      triggerBuild(adapter, panel);
      buildEnvelope(adapter, panel);
      Lifecycle.markDirty(adapter.id, `Randomized unlocked fields while preserving ${locked.length} lock${locked.length === 1 ? '' : 's'}.`);
      renderDiagnostics([Kernel.diagnostic('info', 'selective-randomization-complete', `Randomized unlocked fields while preserving ${locked.length} lock${locked.length === 1 ? '' : 's'}.`) ]);
    }, 0);
  }

  async function copyCurrent(adapter, panel) {
    const envelope = buildEnvelope(adapter, panel);
    if (!envelope) {
      renderDiagnostics([Kernel.diagnostic('error', 'copy-failed', 'No profile is available to copy.')]);
      return;
    }
    try {
      const copied = await Kernel.copyJson(envelope);
      renderDiagnostics([Kernel.diagnostic(copied ? 'info' : 'warning', copied ? 'canonical-json-copied' : 'clipboard-unavailable', copied ? 'Canonical profile JSON copied.' : 'Clipboard API is unavailable; use Export Canonical JSON.')]);
    } catch (error) {
      renderDiagnostics([Kernel.diagnostic('error', 'copy-failed', error.message)]);
    }
  }

  function exportCurrent(adapter, panel) {
    const envelope = buildEnvelope(adapter, panel);
    if (!envelope) {
      renderDiagnostics([Kernel.diagnostic('error', 'export-failed', 'No profile is available to export.')]);
      return;
    }
    Kernel.downloadJson(envelope, `${Kernel.slugify(envelope.name)}.${adapter.profileType}.json`);
    renderDiagnostics([Kernel.diagnostic('info', 'canonical-json-exported', `Exported ${envelope.profileId} revision ${envelope.revision}.`)]);
  }

  function exportWikiDraft(adapter, panel) {
    const raw = readRawProfile(adapter, panel);
    const draft = typeof adapter.getWikiDraft === 'function' ? adapter.getWikiDraft(raw) : raw?.outputs?.wikiDraft;
    if (!draft) {
      renderDiagnostics([Kernel.diagnostic('error', 'wiki-export-failed', 'This record has no wiki draft output.')]);
      return;
    }
    Kernel.downloadJson(draft, `${Kernel.slugify(draft.title || raw.name)}.wiki-draft.json`);
    renderDiagnostics([Kernel.diagnostic('info', 'wiki-draft-exported', `Exported wiki draft for ${draft.title || raw.name}.`)]);
  }

  function bindParentImports(adapter, panel) {
    if (panel.dataset.productionContextBound === adapter.id) return;
    panel.dataset.productionContextBound = adapter.id;
    panel.addEventListener('click', event => {
      const target = event.target.closest('button');
      const definition = Registry.getParentImport(adapter, target?.id);
      if (!definition) return;
      const textarea = panel.querySelector(`#${definition.textareaId}`);
      if (!textarea?.value?.trim()) return;
      const result = Kernel.normalizeImportedRecord(textarea.value, { expectedTypes: definition.expectedTypes });
      renderDiagnostics(result.diagnostics);
      if (!result.ok) {
        event.preventDefault();
        event.stopImmediatePropagation();
        return;
      }
      panel.dataset[definition.envelopeDatasetKey] = JSON.stringify(result.envelope);
      textarea.value = JSON.stringify(result.context, null, 2);
      Lifecycle.markDirty(adapter.id, `Loaded ${definition.id} parent ${result.envelope.name}.`);
      window.setTimeout(() => refreshProvenance(adapter, panel), 0);
    }, true);
  }

  function refreshProvenance(adapter, panel) {
    const list = getShell().querySelector('#mainline-editor-provenance');
    const envelope = activeEnvelopes.get(adapter.id);
    const inheritance = collectInheritance(adapter, panel);
    const items = [];
    if (envelope) items.push(`Current record: ${escapeHtml(envelope.profileId)} revision ${envelope.revision}.`);
    inheritance.forEach(item => items.push(`${escapeHtml(item.relationship)}: ${escapeHtml(item.name)} (${escapeHtml(item.profileId)}) revision ${item.revision}.`));
    envelope?.provenance?.migrationLog?.forEach(item => items.push(`Migration: ${escapeHtml(item.message)}.`));
    list.innerHTML = items.length ? items.map(item => `<li>${item}</li>`).join('') : '<li>No inherited records loaded.</li>';
  }

  function renderLifecycleState(state) {
    if (!state || state.editorId !== activeEditorId) return;
    const target = getShell().querySelector('#mainline-editor-record-state');
    if (!target) return;
    target.dataset.dirty = String(state.dirty);
    target.dataset.status = state.status;
    target.textContent = state.message;
  }

  function renderDiagnostics(diagnostics) {
    const list = getShell().querySelector('#mainline-editor-diagnostics');
    const records = Array.isArray(diagnostics) && diagnostics.length
      ? diagnostics
      : [Kernel.diagnostic('info', 'no-diagnostics', 'No diagnostics reported.')];
    list.innerHTML = records.map(item => `<li class="editor-diagnostic-${escapeHtml(item.severity)}"><strong>${escapeHtml(item.code)}</strong>: ${escapeHtml(item.message)}${item.path ? ` <code>${escapeHtml(item.path)}</code>` : ''}</li>`).join('');
  }

  function decorateCards() {
    adapters().forEach(adapter => {
      document.querySelectorAll(`.module-card[data-module-id="${adapter.moduleId}"]`).forEach(card => {
        adapter.legacyButtonSelectors.forEach(selector => card.querySelectorAll(selector).forEach(button => button.remove()));
        if (adapter.cardLinkFlag) card.dataset[adapter.cardLinkFlag] = 'true';
        if (card.querySelector(`[data-production-editor="${adapter.id}"]`)) return;
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'primary-action production-editor-launch';
        button.dataset.productionEditor = adapter.id;
        button.textContent = adapter.label;
        button.addEventListener('click', () => launch(adapter.id));
        card.appendChild(button);
      });
    });
  }

  function activeAdapterAndPanel() {
    const adapter = resolveAdapter(activeEditorId);
    const panel = adapter ? document.getElementById(adapter.panelId) : null;
    return { adapter, panel };
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  }

  function install() {
    injectStyles();
    getShell();
    decorateCards();
    window.addEventListener('kaysender-editor-lifecycle-change', event => renderLifecycleState(event.detail));
    const observer = new MutationObserver(decorateCards);
    observer.observe(document.body, { childList: true, subtree: true });
    window.setInterval(decorateCards, 1000);
    window.KaysenderMainlineEditorProduction = Object.freeze({
      launch,
      launchIsland: () => launch('island'),
      launchSettlement: () => launch('settlement'),
      launchAirship: () => launch('airship'),
      listEditors: () => adapters().map(adapter => ({
        id: adapter.id,
        moduleId: adapter.moduleId,
        profileType: adapter.profileType,
        parentProfileTypes: adapter.parentImports.flatMap(item => item.expectedTypes)
      })),
      getAdapter: editorIdOrAlias => resolveAdapter(editorIdOrAlias),
      getActiveEditorId: () => activeEditorId,
      getActiveEnvelope: () => Kernel.deepClone(activeEnvelopes.get(activeEditorId) || null),
      getRecordState: editorIdOrAlias => {
        const adapter = resolveAdapter(editorIdOrAlias || activeEditorId);
        return adapter ? Lifecycle.getState(adapter.id) : null;
      },
      rebuildActive: () => {
        const { adapter, panel } = activeAdapterAndPanel();
        if (adapter && panel) rebuild(adapter, panel);
      },
      newBlankActive: () => {
        const { adapter, panel } = activeAdapterAndPanel();
        if (adapter && panel) newBlankRecord(adapter, panel);
      },
      importIntoActive: input => {
        const { adapter, panel } = activeAdapterAndPanel();
        return adapter && panel ? importRecord(adapter, panel, input) : null;
      }
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install);
  else install();
})();
