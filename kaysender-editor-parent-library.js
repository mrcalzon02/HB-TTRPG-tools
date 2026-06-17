(() => {
  'use strict';

  const Registry = window.KaysenderEditorAdapters;
  const Repository = window.KaysenderEditorRepository;
  const Production = () => window.KaysenderMainlineEditorProduction;
  if (!Registry || !Repository) {
    console.error('Kaysender parent record library could not start: adapter registry or record repository is missing.');
    return;
  }

  function activeContext() {
    const production = Production();
    const editorId = production?.getActiveEditorId?.() || '';
    const adapter = editorId ? Registry.resolve(editorId) : null;
    const panel = adapter ? document.getElementById(adapter.panelId) : null;
    return { production, adapter, panel };
  }

  function recordsFor(definition) {
    return definition.expectedTypes.flatMap(profileType => Repository.list({ profileType }));
  }

  function currentParent(panel, definition) {
    const serialized = panel?.dataset?.[definition.envelopeDatasetKey];
    if (!serialized) return null;
    try {
      const envelope = JSON.parse(serialized);
      return envelope?.profileId ? envelope : null;
    } catch {
      return null;
    }
  }

  function controlId(adapter, definition) {
    return `mainline-parent-library-${adapter.id}-${definition.id}`;
  }

  function renderLinkedStatus(container, panel, definition) {
    const target = container.querySelector('[data-parent-library-status]');
    if (!target) return;
    const parent = currentParent(panel, definition);
    const nextText = parent
      ? `Linked ${parent.name || parent.data?.name || definition.id} · ${parent.profileId} · revision ${parent.revision}`
      : `No saved ${definition.id} record is linked.`;
    if (target.textContent !== nextText) target.textContent = nextText;
    target.dataset.linked = String(Boolean(parent));
  }

  function populateSelect(container, definition, panel) {
    const select = container.querySelector('select');
    const loadButton = container.querySelector('[data-parent-library-load]');
    const clearButton = container.querySelector('[data-parent-library-clear]');
    if (!select || !loadButton || !clearButton) return;
    const records = recordsFor(definition);
    const current = currentParent(panel, definition);
    const desiredValue = select.value || current?.profileId || '';
    const signature = records.map(item => `${item.profileId}:${item.revision}:${item.updatedAt}`).join('|');
    if (select.dataset.signature !== signature) {
      select.dataset.signature = signature;
      select.replaceChildren();
      const placeholder = document.createElement('option');
      placeholder.value = '';
      placeholder.textContent = records.length
        ? `Choose a saved ${definition.id} record…`
        : `No saved ${definition.id} records available`;
      select.appendChild(placeholder);
      records.forEach(record => {
        const option = document.createElement('option');
        option.value = record.profileId;
        option.textContent = `${record.name} · r${record.revision}`;
        option.title = `${record.profileId} · ${record.profileType}`;
        select.appendChild(option);
      });
    }
    if (records.some(record => record.profileId === desiredValue)) select.value = desiredValue;
    select.disabled = !records.length;
    loadButton.disabled = !select.value;
    clearButton.disabled = !current;
    renderLinkedStatus(container, panel, definition);
  }

  function loadSelected(adapter, panel, definition, container) {
    const select = container.querySelector('select');
    const profileId = select?.value;
    if (!profileId) return;
    const result = Repository.load(profileId);
    const status = container.querySelector('[data-parent-library-status]');
    if (!result.ok) {
      if (status) {
        status.textContent = result.message;
        status.dataset.linked = 'false';
      }
      return;
    }
    const textarea = panel.querySelector(`#${definition.textareaId}`);
    const existingLoadButton = panel.querySelector(`#${definition.loadButtonId}`);
    if (!textarea || !existingLoadButton) {
      if (status) status.textContent = `The ${definition.id} import controls are unavailable.`;
      return;
    }
    textarea.value = JSON.stringify(result.envelope, null, 2);
    existingLoadButton.click();
    window.setTimeout(() => {
      renderLinkedStatus(container, panel, definition);
      Production()?.rebuildActive?.();
    }, 0);
  }

  function clearLinked(adapter, panel, definition, container) {
    const linked = currentParent(panel, definition);
    if (linked && !window.confirm(`Clear inherited ${definition.id} record “${linked.name || linked.data?.name || linked.profileId}” from this ${adapter.label.replace(/^Open /, '')}?`)) {
      return;
    }
    panel.dataset[definition.contextDatasetKey] = '';
    panel.dataset[definition.envelopeDatasetKey] = '';
    const textarea = panel.querySelector(`#${definition.textareaId}`);
    if (textarea) textarea.value = '';
    const legacyStatus = definition.statusId ? panel.querySelector(`#${definition.statusId}`) : null;
    if (legacyStatus) legacyStatus.textContent = definition.emptyStatus;
    const select = container.querySelector('select');
    if (select) select.value = '';
    renderLinkedStatus(container, panel, definition);
    populateSelect(container, definition, panel);
    Production()?.rebuildActive?.();
  }

  function createControl(adapter, panel, definition) {
    const id = controlId(adapter, definition);
    if (document.getElementById(id)) return document.getElementById(id);
    const textarea = panel.querySelector(`#${definition.textareaId}`);
    if (!textarea) return null;

    const container = document.createElement('section');
    container.id = id;
    container.className = 'mainline-parent-library-control';
    container.dataset.parentImportId = definition.id;
    container.innerHTML = `
      <div class="mainline-parent-library-heading">
        <div>
          <strong>Saved ${escapeHtml(definition.id)} inheritance</strong>
          <p data-parent-library-status data-linked="false">No saved ${escapeHtml(definition.id)} record is linked.</p>
        </div>
      </div>
      <div class="mainline-parent-library-row">
        <label for="${id}-select">Saved ${escapeHtml(definition.id)} records</label>
        <select id="${id}-select" class="tool-input"></select>
        <button type="button" class="secondary-action" data-parent-library-load disabled>Load Saved Parent</button>
        <button type="button" class="secondary-action" data-parent-library-clear disabled>Clear Parent Link</button>
      </div>`;
    textarea.insertAdjacentElement('beforebegin', container);
    container.querySelector('select').addEventListener('change', () => populateSelect(container, definition, panel));
    container.querySelector('[data-parent-library-load]').addEventListener('click', () => loadSelected(adapter, panel, definition, container));
    container.querySelector('[data-parent-library-clear]').addEventListener('click', () => clearLinked(adapter, panel, definition, container));
    populateSelect(container, definition, panel);
    return container;
  }

  function refresh() {
    const { adapter, panel } = activeContext();
    if (!adapter || !panel) return;
    adapter.parentImports.forEach(definition => {
      const container = createControl(adapter, panel, definition);
      if (container) populateSelect(container, definition, panel);
    });
  }

  function injectStyles() {
    if (document.getElementById('kaysender-parent-record-library-style')) return;
    const style = document.createElement('style');
    style.id = 'kaysender-parent-record-library-style';
    style.textContent = `
      .mainline-parent-library-control{grid-column:1/-1;padding:12px;border:1px solid rgba(200,138,53,.4);border-radius:14px;background:rgba(200,138,53,.06)}
      .mainline-parent-library-heading strong{color:var(--accent);text-transform:capitalize}
      .mainline-parent-library-heading p{margin:.35rem 0;color:var(--muted);overflow-wrap:anywhere}
      .mainline-parent-library-heading p[data-linked="true"]{color:#9ed6a4}
      .mainline-parent-library-row{display:grid;grid-template-columns:minmax(240px,1fr) auto auto;gap:8px;align-items:end;margin-top:8px}
      .mainline-parent-library-row label{grid-column:1/-1;color:var(--muted);font-size:.76rem;font-weight:700;text-transform:capitalize}
      @media(max-width:850px){.mainline-parent-library-row{grid-template-columns:1fr}.mainline-parent-library-row label{grid-column:auto}.mainline-parent-library-row button{width:100%}}
    `;
    document.head.appendChild(style);
  }

  function install() {
    injectStyles();
    refresh();
    window.addEventListener('storage', refresh);
    window.addEventListener('kaysender-editor-lifecycle-change', refresh);
    window.setInterval(refresh, 1000);
  }

  window.KaysenderEditorParentLibrary = Object.freeze({
    refresh,
    loadSelected,
    clearLinked
  });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install);
  else install();
})();
