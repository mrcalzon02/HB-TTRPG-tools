(() => {
  'use strict';

  const Kernel = window.KaysenderEditorKernel;
  const Repository = window.KaysenderEditorRepository;
  const Lifecycle = window.KaysenderEditorLifecycle;
  const Production = () => window.KaysenderMainlineEditorProduction;
  let lastContextSignature = '';
  if (!Kernel || !Repository || !Lifecycle) {
    console.error('Kaysender editor record library could not start: kernel, repository, or lifecycle is missing.');
    return;
  }

  function wait(ms) {
    return new Promise(resolve => window.setTimeout(resolve, ms));
  }

  function activeContext() {
    const production = Production();
    const editorId = production?.getActiveEditorId?.() || '';
    const adapter = editorId ? production?.getAdapter?.(editorId) : null;
    const envelope = production?.getActiveEnvelope?.() || null;
    return { production, editorId, adapter, envelope };
  }

  function contextSignature(context = activeContext()) {
    const provenance = context.envelope?.provenance || {};
    return [
      context.editorId || '',
      context.adapter?.profileType || '',
      context.envelope?.profileId || '',
      context.envelope?.revision || '',
      Number.isInteger(provenance.generation) ? provenance.generation : '',
      provenance.lineageComplete === false ? 'incomplete' : provenance.lineageComplete === true ? 'complete' : ''
    ].join('|');
  }

  function setStatus(message, severity = 'info') {
    const target = document.getElementById('mainline-editor-library-status');
    if (!target) return;
    target.textContent = message;
    target.dataset.severity = severity;
  }

  function generationLabel(record) {
    return Number.isInteger(record?.generation) ? `G${record.generation}` : 'G?';
  }

  function optionLabel(record) {
    const lineageWarning = record.lineageComplete === false ? ' · lineage incomplete' : '';
    return `${record.name} · ${generationLabel(record)} · r${record.revision}${lineageWarning}`;
  }

  function savedMetadata(profileId) {
    if (!profileId) return null;
    return Repository.list().find(item => item.profileId === profileId) || null;
  }

  function setIdentityField(id, value) {
    const target = document.getElementById(id);
    if (target) target.textContent = value;
  }

  function provenanceIdentity(envelope) {
    if (!envelope) {
      return {
        generation: '—',
        root: '—',
        parent: '—',
        lineageState: '—'
      };
    }
    const provenance = envelope.provenance || {};
    const generation = Number.isInteger(provenance.generation) ? `G${provenance.generation}` : 'Unknown';
    const lineage = Array.isArray(provenance.lineage) ? provenance.lineage : [];
    const root = provenance.generation === 0
      ? `${envelope.name || envelope.data?.name || 'Unnamed Profile'} · r${envelope.revision}`
      : lineage[0]
        ? `${lineage[0].name || lineage[0].profileId} · r${lineage[0].revision}`
        : 'Unknown';
    const parent = provenance.parent
      ? `${provenance.parent.name || provenance.parent.profileId} · r${provenance.parent.revision}`
      : provenance.generation === 0
        ? 'Root record'
        : provenance.clonedFromProfileId
          ? `${provenance.clonedFromProfileId} · revision unknown`
          : 'Unknown';
    const lineageState = provenance.lineageComplete === false
      ? 'Incomplete legacy lineage'
      : provenance.lineageComplete === true
        ? 'Complete'
        : 'Unknown';
    return { generation, root, parent, lineageState };
  }

  function renderIdentity(envelope) {
    const saved = savedMetadata(envelope?.profileId);
    const provenance = provenanceIdentity(envelope);
    setIdentityField('mainline-editor-identity-id', envelope?.profileId || 'No active record');
    setIdentityField('mainline-editor-identity-type', envelope?.profileType || '—');
    setIdentityField('mainline-editor-identity-schema', envelope?.profileSchemaVersion || envelope?.data?.schemaVersion || '—');
    setIdentityField('mainline-editor-identity-revision', envelope?.revision ? String(envelope.revision) : '—');
    setIdentityField('mainline-editor-identity-generation', provenance.generation);
    setIdentityField('mainline-editor-identity-root', provenance.root);
    setIdentityField('mainline-editor-identity-parent', provenance.parent);
    setIdentityField('mainline-editor-identity-lineage', provenance.lineageState);
    setIdentityField('mainline-editor-identity-storage', envelope ? saved ? 'Saved record' : 'Not yet saved' : '—');
    const lineage = document.getElementById('mainline-editor-identity-lineage');
    if (lineage) lineage.dataset.complete = String(envelope?.provenance?.lineageComplete === true);
    const storage = document.getElementById('mainline-editor-identity-storage');
    if (storage) storage.dataset.saved = String(Boolean(saved));
    const saveButton = document.getElementById('mainline-editor-record-save');
    if (saveButton) saveButton.textContent = saved ? 'Update Existing Record' : 'Save New Record';
    const cloneButton = document.getElementById('mainline-editor-record-clone-save');
    if (cloneButton) cloneButton.disabled = !envelope;
  }

  function libraryFilters() {
    const query = document.getElementById('mainline-editor-record-search')?.value?.trim() || '';
    const lineage = document.getElementById('mainline-editor-lineage-filter')?.value || 'all';
    return {
      query,
      lineageComplete: lineage === 'complete' ? true : lineage === 'incomplete' ? false : undefined
    };
  }

  function repositoryHealthSummary() {
    if (typeof Repository.ensureIndexCurrent !== 'function') return '';
    const result = Repository.ensureIndexCurrent();
    if (!result) return '';
    if (result.ok === false) return ` Index health unavailable: ${result.message || 'unknown storage error'}`;
    if (!result.repaired) return '';
    const rejectedCount = Array.isArray(result.rejected) ? result.rejected.length : 0;
    if (rejectedCount) {
      return ` Index rebuilt from canonical records; ${rejectedCount} malformed record${rejectedCount === 1 ? ' was' : 's were'} excluded.`;
    }
    return ' Index rebuilt from canonical records.';
  }

  function renderResultSummary(visibleCount, totalCount, healthSummary = '') {
    const target = document.getElementById('mainline-editor-record-results');
    if (!target) return;
    const recordSummary = visibleCount === totalCount
      ? `${totalCount} saved record${totalCount === 1 ? '' : 's'} available.`
      : `${visibleCount} of ${totalCount} saved record${totalCount === 1 ? '' : 's'} shown.`;
    target.textContent = `${recordSummary}${healthSummary}`;
    target.dataset.health = healthSummary.includes('malformed') || healthSummary.includes('unavailable') ? 'warning' : healthSummary ? 'repaired' : 'current';
  }

  function refresh() {
    const select = document.getElementById('mainline-editor-record-library');
    if (!select) return;
    const previous = select.value;
    const context = activeContext();
    const { adapter, envelope } = context;
    lastContextSignature = contextSignature(context);
    const filters = libraryFilters();
    const healthSummary = repositoryHealthSummary();
    const allRecords = adapter ? Repository.list({ profileType: adapter.profileType }) : [];
    const records = adapter ? Repository.list({
      profileType: adapter.profileType,
      query: filters.query,
      lineageComplete: filters.lineageComplete
    }) : [];
    select.replaceChildren();
    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = adapter
      ? records.length
        ? 'Choose a saved record…'
        : allRecords.length
          ? 'No saved records match the current search or filter'
          : 'No saved records for this editor'
      : 'Open an editor to view saved records';
    select.appendChild(placeholder);
    records.forEach(record => {
      const option = document.createElement('option');
      option.value = record.profileId;
      option.textContent = optionLabel(record);
      const parent = record.parentProfileId ? ` · parent ${record.parentProfileId}${record.parentRevision ? ` r${record.parentRevision}` : ''}` : '';
      const root = record.rootProfileId ? ` · root ${record.rootProfileId}${record.rootRevision ? ` r${record.rootRevision}` : ''}` : '';
      option.title = `${record.profileId} · ${record.profileType} · ${generationLabel(record)}${parent}${root}`;
      select.appendChild(option);
    });
    const preferred = records.some(record => record.profileId === envelope?.profileId)
      ? envelope.profileId
      : previous;
    if (records.some(record => record.profileId === preferred)) select.value = preferred;
    select.disabled = !adapter || !records.length;
    renderResultSummary(records.length, allRecords.length, healthSummary);
    renderIdentity(envelope);
    refreshButtons();
  }

  function refreshIfContextChanged() {
    if (contextSignature() !== lastContextSignature) refresh();
  }

  async function rebuildEnvelope() {
    const { production } = activeContext();
    production?.rebuildActive?.();
    await wait(40);
    return Production()?.getActiveEnvelope?.() || null;
  }

  async function saveActiveRecord() {
    const { editorId, adapter } = activeContext();
    if (!editorId || !adapter) {
      setStatus('Open an editor before saving a record.', 'warning');
      return;
    }
    const saveVersion = Lifecycle.checkpoint(editorId);
    const envelope = await rebuildEnvelope();
    if (!envelope) {
      setStatus('No canonical record is available to save.', 'error');
      return;
    }
    const existed = Boolean(savedMetadata(envelope.profileId));
    const result = Repository.save(envelope);
    if (!result.ok) {
      setStatus(result.message, 'error');
      refresh();
      return;
    }
    const cleanResult = Lifecycle.markCleanIfUnchanged(
      editorId,
      saveVersion,
      `${existed ? 'Updated' : 'Saved'} ${envelope.name} in the local record library.`
    );
    if (cleanResult.ok) {
      setStatus(`${existed ? 'Updated' : 'Saved'} ${envelope.name} without changing profile ID ${envelope.profileId}.`, 'success');
    } else {
      setStatus(`Saved ${envelope.name} revision ${envelope.revision}, but newer edits remain unsaved.`, 'warning');
    }
    refresh();
  }

  async function saveAsNewClone() {
    const { production, editorId, adapter } = activeContext();
    if (!production || !editorId || !adapter) {
      setStatus('Open an editor before cloning a record.', 'warning');
      return;
    }
    const source = await rebuildEnvelope();
    if (!source) {
      setStatus('No canonical record is available to clone.', 'error');
      return;
    }
    const clone = Kernel.cloneEnvelope(source, {
      editorId: adapter.id,
      moduleId: adapter.moduleId
    });
    const imported = production.importIntoActive(clone);
    if (!imported) {
      setStatus('The cloned record could not be loaded into the active editor.', 'error');
      return;
    }
    const saveVersion = Lifecycle.checkpoint(editorId);
    await wait(40);
    const activeClone = Production()?.getActiveEnvelope?.() || imported || clone;
    const result = Repository.save(activeClone);
    if (!result.ok) {
      setStatus(result.message, 'error');
      refresh();
      return;
    }
    const cleanResult = Lifecycle.markCleanIfUnchanged(editorId, saveVersion, `Saved cloned record ${activeClone.name}.`);
    setStatus(
      cleanResult.ok
        ? `Saved a new clone with profile ID ${activeClone.profileId}; original ${source.profileId} was not overwritten.`
        : `Saved clone ${activeClone.profileId}, but newer edits remain unsaved.`,
      cleanResult.ok ? 'success' : 'warning'
    );
    refresh();
  }

  function openSelectedRecord() {
    const select = document.getElementById('mainline-editor-record-library');
    const profileId = select?.value;
    if (!profileId) return;
    const { production, editorId } = activeContext();
    if (!Lifecycle.confirmLeave(editorId, 'The current record has unsaved changes. Open the selected saved record anyway?')) return;
    const result = Repository.load(profileId);
    if (!result.ok) {
      setStatus(result.message, 'error');
      return;
    }
    const imported = production?.importIntoActive?.(result.envelope);
    if (!imported) {
      setStatus('The saved record could not be loaded into the active editor.', 'error');
      return;
    }
    setStatus(`Opened ${result.envelope.name} with stable profile ID ${result.envelope.profileId}. Recovery draft synchronization is in progress.`, 'success');
    refresh();
  }

  function deleteSelectedRecord() {
    const select = document.getElementById('mainline-editor-record-library');
    const profileId = select?.value;
    if (!profileId) return;
    const record = Repository.list().find(item => item.profileId === profileId);
    const label = record?.name || profileId;
    if (!window.confirm(`Delete the saved record “${label}”? This does not clear the currently open form or its recovery draft.`)) return;
    const result = Repository.remove(profileId, true);
    setStatus(result.message, result.ok ? 'success' : 'error');
    refresh();
  }

  function repairLibrary() {
    const result = Repository.repairIndex();
    setStatus(result.message, result.ok ? 'success' : 'error');
    refresh();
  }

  function refreshButtons() {
    const select = document.getElementById('mainline-editor-record-library');
    const { adapter, envelope } = activeContext();
    const hasSelection = Boolean(select?.value);
    const openButton = document.getElementById('mainline-editor-record-open');
    const deleteButton = document.getElementById('mainline-editor-record-delete');
    const saveButton = document.getElementById('mainline-editor-record-save');
    const cloneButton = document.getElementById('mainline-editor-record-clone-save');
    if (openButton) openButton.disabled = !hasSelection;
    if (deleteButton) deleteButton.disabled = !hasSelection;
    if (saveButton) saveButton.disabled = !adapter;
    if (cloneButton) cloneButton.disabled = !envelope;
  }

  function ensureControls() {
    const shell = document.getElementById('kaysender-mainline-editor-shell');
    const toolbar = document.getElementById('mainline-editor-toolbar');
    if (!shell || !toolbar || document.getElementById('mainline-editor-record-library-controls')) return false;

    const controls = document.createElement('section');
    controls.id = 'mainline-editor-record-library-controls';
    controls.className = 'mainline-editor-record-library-controls';
    controls.setAttribute('aria-labelledby', 'mainline-editor-record-library-title');
    controls.innerHTML = `
      <div class="mainline-editor-record-library-heading">
        <div>
          <h3 id="mainline-editor-record-library-title">Saved Record Library</h3>
          <p id="mainline-editor-library-status" class="helper-note" data-severity="info">Update keeps the same profile and generation. Clone creates a new profile and advances generation.</p>
        </div>
        <div class="mainline-editor-record-library-primary-actions">
          <button id="mainline-editor-record-save" class="primary-action" type="button">Save New Record</button>
          <button id="mainline-editor-record-clone-save" class="secondary-action" type="button">Save as New Clone</button>
        </div>
      </div>
      <dl class="mainline-editor-record-identity" aria-label="Active record identity and provenance">
        <div><dt>Profile ID</dt><dd id="mainline-editor-identity-id">No active record</dd></div>
        <div><dt>Profile Type</dt><dd id="mainline-editor-identity-type">—</dd></div>
        <div><dt>Schema</dt><dd id="mainline-editor-identity-schema">—</dd></div>
        <div><dt>Revision</dt><dd id="mainline-editor-identity-revision">—</dd></div>
        <div><dt>Generation</dt><dd id="mainline-editor-identity-generation">—</dd></div>
        <div><dt>Root</dt><dd id="mainline-editor-identity-root">—</dd></div>
        <div><dt>Immediate Parent</dt><dd id="mainline-editor-identity-parent">—</dd></div>
        <div><dt>Lineage</dt><dd id="mainline-editor-identity-lineage" data-complete="false">—</dd></div>
        <div><dt>Library State</dt><dd id="mainline-editor-identity-storage" data-saved="false">—</dd></div>
      </dl>
      <div class="mainline-editor-record-find-row" role="search" aria-label="Find saved records">
        <label for="mainline-editor-record-search">Find saved records</label>
        <input id="mainline-editor-record-search" class="tool-input" type="search" placeholder="Name, ID, G2, parent, root…" autocomplete="off" />
        <label for="mainline-editor-lineage-filter">Lineage</label>
        <select id="mainline-editor-lineage-filter" class="tool-input">
          <option value="all">All lineage states</option>
          <option value="complete">Complete lineage</option>
          <option value="incomplete">Incomplete legacy lineage</option>
        </select>
        <span id="mainline-editor-record-results" class="helper-note" data-health="current" aria-live="polite">0 saved records available.</span>
      </div>
      <div class="mainline-editor-record-library-row">
        <label for="mainline-editor-record-library">Saved records for the active editor</label>
        <select id="mainline-editor-record-library" class="tool-input"></select>
        <button id="mainline-editor-record-open" class="secondary-action" type="button" disabled>Open Saved Record</button>
        <button id="mainline-editor-record-delete" class="danger-action" type="button" disabled>Delete Saved Record</button>
        <button id="mainline-editor-record-repair" class="secondary-action" type="button">Repair Record Index</button>
      </div>`;
    toolbar.insertAdjacentElement('afterend', controls);

    controls.querySelector('#mainline-editor-record-save').addEventListener('click', saveActiveRecord);
    controls.querySelector('#mainline-editor-record-clone-save').addEventListener('click', saveAsNewClone);
    controls.querySelector('#mainline-editor-record-open').addEventListener('click', openSelectedRecord);
    controls.querySelector('#mainline-editor-record-delete').addEventListener('click', deleteSelectedRecord);
    controls.querySelector('#mainline-editor-record-repair').addEventListener('click', repairLibrary);
    controls.querySelector('#mainline-editor-record-library').addEventListener('change', refreshButtons);
    controls.querySelector('#mainline-editor-record-search').addEventListener('input', refresh);
    controls.querySelector('#mainline-editor-lineage-filter').addEventListener('change', refresh);
    refresh();
    return true;
  }

  function loadParentLibraryScript() {
    if (window.KaysenderEditorParentLibrary || document.querySelector('script[data-kaysender-parent-library]')) return;
    const script = document.createElement('script');
    script.src = 'kaysender-editor-parent-library.js';
    script.async = false;
    script.dataset.kaysenderParentLibrary = 'true';
    document.head.appendChild(script);
  }

  function injectStyles() {
    if (document.getElementById('kaysender-editor-record-library-style')) return;
    const style = document.createElement('style');
    style.id = 'kaysender-editor-record-library-style';
    style.textContent = `
      .mainline-editor-record-library-controls{margin:12px 0;padding:14px;border:1px solid var(--line);border-radius:14px;background:rgba(0,0,0,.16)}
      .mainline-editor-record-library-heading{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex-wrap:wrap}
      .mainline-editor-record-library-heading h3{margin:0;color:var(--accent)}
      .mainline-editor-record-library-heading p{margin:.35rem 0 0}
      .mainline-editor-record-library-primary-actions{display:flex;gap:8px;flex-wrap:wrap}
      .mainline-editor-record-identity{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px;margin:12px 0}
      .mainline-editor-record-identity div{padding:8px;border:1px solid var(--line);border-radius:10px;background:rgba(255,255,255,.025);min-width:0}
      .mainline-editor-record-identity dt{color:var(--muted);font-size:.72rem;text-transform:uppercase;letter-spacing:.05em}
      .mainline-editor-record-identity dd{margin:.25rem 0 0;overflow-wrap:anywhere;font-weight:700}
      #mainline-editor-identity-storage[data-saved="true"],#mainline-editor-identity-lineage[data-complete="true"]{color:#9ed6a4}
      #mainline-editor-identity-storage[data-saved="false"],#mainline-editor-identity-lineage[data-complete="false"]{color:#e7bf73}
      .mainline-editor-record-find-row{display:grid;grid-template-columns:minmax(220px,2fr) minmax(180px,1fr);gap:8px 12px;align-items:end;margin:12px 0;padding-top:12px;border-top:1px solid var(--line)}
      .mainline-editor-record-find-row label{color:var(--muted);font-weight:700}
      .mainline-editor-record-find-row label:first-child{grid-column:1}.mainline-editor-record-find-row label:nth-of-type(2){grid-column:2}
      #mainline-editor-record-search{grid-column:1}#mainline-editor-lineage-filter{grid-column:2}#mainline-editor-record-results{grid-column:1/-1;margin:0}
      #mainline-editor-record-results[data-health="repaired"]{color:#9ed6a4}
      #mainline-editor-record-results[data-health="warning"]{color:#e7bf73}
      .mainline-editor-record-library-row{display:grid;grid-template-columns:minmax(220px,1fr) repeat(3,auto);gap:8px;align-items:end;margin-top:12px}
      .mainline-editor-record-library-row label{grid-column:1/-1;color:var(--muted);font-weight:700}
      #mainline-editor-library-status[data-severity="error"]{color:#ff8b8b}
      #mainline-editor-library-status[data-severity="warning"]{color:#e7bf73}
      #mainline-editor-library-status[data-severity="success"]{color:#9ed6a4}
      @media(max-width:900px){.mainline-editor-record-find-row,.mainline-editor-record-library-row,.mainline-editor-record-identity{grid-template-columns:1fr}.mainline-editor-record-find-row label,.mainline-editor-record-find-row input,.mainline-editor-record-find-row select,#mainline-editor-record-results,.mainline-editor-record-library-row label{grid-column:auto}.mainline-editor-record-library-row button,.mainline-editor-record-library-primary-actions button{width:100%}.mainline-editor-record-library-primary-actions{width:100%}}
    `;
    document.head.appendChild(style);
  }

  function install() {
    injectStyles();
    ensureControls();
    loadParentLibraryScript();
    const observer = new MutationObserver(() => {
      if (ensureControls()) refresh();
    });
    observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener('storage', refresh);
    window.addEventListener('kaysender-editor-lifecycle-change', refresh);
    window.setInterval(refreshIfContextChanged, 1000);
  }

  window.KaysenderEditorRecordLibrary = Object.freeze({
    refresh,
    saveActiveRecord,
    saveAsNewClone,
    openSelectedRecord,
    deleteSelectedRecord,
    repairLibrary
  });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install);
  else install();
})();