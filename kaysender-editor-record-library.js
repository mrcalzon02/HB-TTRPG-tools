(() => {
  'use strict';

  const Kernel = window.KaysenderEditorKernel;
  const Repository = window.KaysenderEditorRepository;
  const Lifecycle = window.KaysenderEditorLifecycle;
  const Production = () => window.KaysenderMainlineEditorProduction;
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

  function setStatus(message, severity = 'info') {
    const target = document.getElementById('mainline-editor-library-status');
    if (!target) return;
    target.textContent = message;
    target.dataset.severity = severity;
  }

  function optionLabel(record) {
    return `${record.name} · r${record.revision}`;
  }

  function savedMetadata(profileId) {
    if (!profileId) return null;
    return Repository.list().find(item => item.profileId === profileId) || null;
  }

  function setIdentityField(id, value) {
    const target = document.getElementById(id);
    if (target) target.textContent = value;
  }

  function renderIdentity(envelope) {
    const saved = savedMetadata(envelope?.profileId);
    setIdentityField('mainline-editor-identity-id', envelope?.profileId || 'No active record');
    setIdentityField('mainline-editor-identity-type', envelope?.profileType || '—');
    setIdentityField('mainline-editor-identity-schema', envelope?.profileSchemaVersion || envelope?.data?.schemaVersion || '—');
    setIdentityField('mainline-editor-identity-revision', envelope?.revision ? String(envelope.revision) : '—');
    setIdentityField('mainline-editor-identity-storage', envelope ? saved ? 'Saved record' : 'Not yet saved' : '—');
    const storage = document.getElementById('mainline-editor-identity-storage');
    if (storage) storage.dataset.saved = String(Boolean(saved));
    const saveButton = document.getElementById('mainline-editor-record-save');
    if (saveButton) saveButton.textContent = saved ? 'Update Existing Record' : 'Save New Record';
    const cloneButton = document.getElementById('mainline-editor-record-clone-save');
    if (cloneButton) cloneButton.disabled = !envelope;
  }

  function refresh() {
    const select = document.getElementById('mainline-editor-record-library');
    if (!select) return;
    const previous = select.value;
    const { adapter, envelope } = activeContext();
    const records = adapter ? Repository.list({ profileType: adapter.profileType }) : [];
    select.replaceChildren();
    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = adapter
      ? records.length ? 'Choose a saved record…' : 'No saved records for this editor'
      : 'Open an editor to view saved records';
    select.appendChild(placeholder);
    records.forEach(record => {
      const option = document.createElement('option');
      option.value = record.profileId;
      option.textContent = optionLabel(record);
      option.title = `${record.profileId} · ${record.profileType}`;
      select.appendChild(option);
    });
    const preferred = records.some(record => record.profileId === envelope?.profileId)
      ? envelope.profileId
      : previous;
    if (records.some(record => record.profileId === preferred)) select.value = preferred;
    select.disabled = !adapter || !records.length;
    renderIdentity(envelope);
    refreshButtons();
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
    const envelope = await rebuildEnvelope();
    if (!envelope) {
      setStatus('No canonical record is available to save.', 'error');
      return;
    }
    const existed = Boolean(savedMetadata(envelope.profileId));
    const result = Repository.save(envelope);
    setStatus(
      result.ok
        ? `${existed ? 'Updated' : 'Saved'} ${envelope.name} without changing profile ID ${envelope.profileId}.`
        : result.message,
      result.ok ? 'success' : 'error'
    );
    if (result.ok) Lifecycle.markClean(editorId, `${existed ? 'Updated' : 'Saved'} ${envelope.name} in the local record library.`);
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
    const result = Repository.save(clone);
    setStatus(
      result.ok
        ? `Saved a new clone with profile ID ${clone.profileId}; original ${source.profileId} was not overwritten.`
        : result.message,
      result.ok ? 'success' : 'error'
    );
    if (result.ok) Lifecycle.markClean(editorId, `Saved cloned record ${clone.name}.`);
    refresh();
  }

  function openSelectedRecord() {
    const select = document.getElementById('mainline-editor-record-library');
    const profileId = select?.value;
    if (!profileId) return;
    const { production, editorId } = activeContext();
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
    Lifecycle.markClean(editorId, `Opened saved record ${result.envelope.name}.`);
    setStatus(`Opened ${result.envelope.name} with stable profile ID ${result.envelope.profileId}.`, 'success');
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
          <p id="mainline-editor-library-status" class="helper-note" data-severity="info">Saving updates the current stable profile ID. Cloning always creates a new profile ID.</p>
        </div>
        <div class="mainline-editor-record-library-primary-actions">
          <button id="mainline-editor-record-save" class="primary-action" type="button">Save New Record</button>
          <button id="mainline-editor-record-clone-save" class="secondary-action" type="button">Save as New Clone</button>
        </div>
      </div>
      <dl class="mainline-editor-record-identity" aria-label="Active record identity">
        <div><dt>Profile ID</dt><dd id="mainline-editor-identity-id">No active record</dd></div>
        <div><dt>Profile Type</dt><dd id="mainline-editor-identity-type">—</dd></div>
        <div><dt>Schema</dt><dd id="mainline-editor-identity-schema">—</dd></div>
        <div><dt>Revision</dt><dd id="mainline-editor-identity-revision">—</dd></div>
        <div><dt>Library State</dt><dd id="mainline-editor-identity-storage" data-saved="false">—</dd></div>
      </dl>
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
    refresh();
    return true;
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
      .mainline-editor-record-identity{display:grid;grid-template-columns:repeat(5,minmax(130px,1fr));gap:8px;margin:12px 0}
      .mainline-editor-record-identity div{padding:8px;border:1px solid var(--line);border-radius:10px;background:rgba(255,255,255,.025);min-width:0}
      .mainline-editor-record-identity dt{color:var(--muted);font-size:.72rem;text-transform:uppercase;letter-spacing:.05em}
      .mainline-editor-record-identity dd{margin:.25rem 0 0;overflow-wrap:anywhere;font-weight:700}
      #mainline-editor-identity-storage[data-saved="true"]{color:#9ed6a4}
      #mainline-editor-identity-storage[data-saved="false"]{color:#e7bf73}
      .mainline-editor-record-library-row{display:grid;grid-template-columns:minmax(220px,1fr) repeat(3,auto);gap:8px;align-items:end;margin-top:12px}
      .mainline-editor-record-library-row label{grid-column:1/-1;color:var(--muted);font-weight:700}
      #mainline-editor-library-status[data-severity="error"]{color:#ff8b8b}
      #mainline-editor-library-status[data-severity="warning"]{color:#e7bf73}
      #mainline-editor-library-status[data-severity="success"]{color:#9ed6a4}
      @media(max-width:1100px){.mainline-editor-record-identity{grid-template-columns:repeat(2,minmax(160px,1fr))}}
      @media(max-width:900px){.mainline-editor-record-library-row,.mainline-editor-record-identity{grid-template-columns:1fr}.mainline-editor-record-library-row label{grid-column:auto}.mainline-editor-record-library-row button,.mainline-editor-record-library-primary-actions button{width:100%}.mainline-editor-record-library-primary-actions{width:100%}}
    `;
    document.head.appendChild(style);
  }

  function install() {
    injectStyles();
    ensureControls();
    const observer = new MutationObserver(() => {
      if (ensureControls()) refresh();
    });
    observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener('storage', refresh);
    window.addEventListener('kaysender-editor-lifecycle-change', refresh);
    window.setInterval(refresh, 1000);
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
