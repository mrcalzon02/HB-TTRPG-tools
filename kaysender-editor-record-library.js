(() => {
  'use strict';

  const Repository = window.KaysenderEditorRepository;
  const Lifecycle = window.KaysenderEditorLifecycle;
  const Production = () => window.KaysenderMainlineEditorProduction;
  if (!Repository || !Lifecycle) {
    console.error('Kaysender editor record library could not start: repository or lifecycle is missing.');
    return;
  }

  function wait(ms) {
    return new Promise(resolve => window.setTimeout(resolve, ms));
  }

  function activeContext() {
    const production = Production();
    const editorId = production?.getActiveEditorId?.() || '';
    const adapter = editorId ? production?.getAdapter?.(editorId) : null;
    return { production, editorId, adapter };
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

  function refresh() {
    const select = document.getElementById('mainline-editor-record-library');
    if (!select) return;
    const previous = select.value;
    const { adapter } = activeContext();
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
    if (records.some(record => record.profileId === previous)) select.value = previous;
    select.disabled = !adapter || !records.length;
    const openButton = document.getElementById('mainline-editor-record-open');
    const deleteButton = document.getElementById('mainline-editor-record-delete');
    const saveButton = document.getElementById('mainline-editor-record-save');
    if (openButton) openButton.disabled = !select.value;
    if (deleteButton) deleteButton.disabled = !select.value;
    if (saveButton) saveButton.disabled = !adapter;
  }

  async function saveActiveRecord() {
    const { production, editorId, adapter } = activeContext();
    if (!production || !editorId || !adapter) {
      setStatus('Open an editor before saving a record.', 'warning');
      return;
    }
    production.rebuildActive();
    await wait(40);
    const envelope = production.getActiveEnvelope();
    if (!envelope) {
      setStatus('No canonical record is available to save.', 'error');
      return;
    }
    const result = Repository.save(envelope);
    setStatus(result.message, result.ok ? 'success' : 'error');
    if (result.ok) Lifecycle.markClean(editorId, `Saved ${envelope.name} to the local record library.`);
    refresh();
    const select = document.getElementById('mainline-editor-record-library');
    if (result.ok && select) select.value = envelope.profileId;
    refreshButtons();
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
    setStatus(result.message, 'success');
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
    const hasSelection = Boolean(select?.value);
    const openButton = document.getElementById('mainline-editor-record-open');
    const deleteButton = document.getElementById('mainline-editor-record-delete');
    if (openButton) openButton.disabled = !hasSelection;
    if (deleteButton) deleteButton.disabled = !hasSelection;
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
          <p id="mainline-editor-library-status" class="helper-note" data-severity="info">Records are stored locally in this browser by stable profile ID.</p>
        </div>
        <button id="mainline-editor-record-save" class="primary-action" type="button">Save Record</button>
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
      .mainline-editor-record-library-row{display:grid;grid-template-columns:minmax(220px,1fr) repeat(3,auto);gap:8px;align-items:end;margin-top:12px}
      .mainline-editor-record-library-row label{grid-column:1/-1;color:var(--muted);font-weight:700}
      #mainline-editor-library-status[data-severity="error"]{color:#ff8b8b}
      #mainline-editor-library-status[data-severity="warning"]{color:#e7bf73}
      #mainline-editor-library-status[data-severity="success"]{color:#9ed6a4}
      @media(max-width:900px){.mainline-editor-record-library-row{grid-template-columns:1fr}.mainline-editor-record-library-row label{grid-column:auto}.mainline-editor-record-library-row button{width:100%}}
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
    openSelectedRecord,
    deleteSelectedRecord,
    repairLibrary
  });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install);
  else install();
})();
