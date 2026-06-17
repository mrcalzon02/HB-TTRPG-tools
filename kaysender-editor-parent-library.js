(() => {
  'use strict';

  const Registry = window.KaysenderEditorAdapters;
  const Repository = window.KaysenderEditorRepository;
  const Lifecycle = window.KaysenderEditorLifecycle;
  const Production = () => window.KaysenderMainlineEditorProduction;
  if (!Registry || !Repository || !Lifecycle) {
    console.error('Kaysender parent record library could not start: adapter registry, record repository, or lifecycle is missing.');
    return;
  }

  function activeContext() {
    const production = Production();
    const editorId = production?.getActiveEditorId?.() || '';
    const adapter = editorId ? Registry.resolve(editorId) : null;
    const panel = adapter ? document.getElementById(adapter.panelId) : null;
    return { production, editorId, adapter, panel };
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

  function savedParentMetadata(parent) {
    if (!parent?.profileId) return null;
    return Repository.list({ profileType: parent.profileType })
      .find(record => record.profileId === parent.profileId) || null;
  }

  function parentReferenceState(panel, definition) {
    const parent = currentParent(panel, definition);
    if (!parent) {
      return {
        state: 'none',
        parent: null,
        saved: null,
        message: `No saved ${definition.id} record is linked.`
      };
    }
    const saved = savedParentMetadata(parent);
    const label = parent.name || parent.data?.name || definition.id;
    const unresolved = parent.provenance?.origin === 'unresolved-inheritance-reference';
    if (unresolved) {
      if (saved) {
        const revisionNote = saved.revision === parent.revision
          ? `saved revision ${saved.revision} is available`
          : `saved revision ${saved.revision} differs from pinned revision ${parent.revision}`;
        return {
          state: 'unresolved',
          parent,
          saved,
          message: `Pinned ${label} · ${parent.profileId} · revision ${parent.revision} is retained without embedded context; ${revisionNote}. Restore deliberately from the saved record.`
        };
      }
      return {
        state: 'unavailable',
        parent,
        saved: null,
        message: `Pinned ${label} · ${parent.profileId} · revision ${parent.revision} is retained without embedded context, and its source record is unavailable in this browser's saved library.`
      };
    }
    if (!saved) {
      return {
        state: 'unavailable',
        parent,
        saved: null,
        message: `Linked ${label} · ${parent.profileId} · revision ${parent.revision}. The inherited snapshot is retained, but its source record is unavailable in this browser's saved library.`
      };
    }
    if (saved.revision > parent.revision) {
      return {
        state: 'stale',
        parent,
        saved,
        message: `Linked ${label} at revision ${parent.revision}; saved revision ${saved.revision} is available. Refresh deliberately to adopt the newer parent.`
      };
    }
    if (saved.revision < parent.revision) {
      return {
        state: 'ahead',
        parent,
        saved,
        message: `Linked ${label} at revision ${parent.revision}; the local saved library only has revision ${saved.revision}. The inherited snapshot is newer than the local source.`
      };
    }
    return {
      state: 'current',
      parent,
      saved,
      message: `Linked ${label} · ${parent.profileId} · current revision ${parent.revision}.`
    };
  }

  function controlId(adapter, definition) {
    return `mainline-parent-library-${adapter.id}-${definition.id}`;
  }

  function renderLinkedStatus(container, panel, definition) {
    const target = container.querySelector('[data-parent-library-status]');
    if (!target) return parentReferenceState(panel, definition);
    const reference = parentReferenceState(panel, definition);
    if (target.textContent !== reference.message) target.textContent = reference.message;
    target.dataset.linked = String(Boolean(reference.parent));
    target.dataset.referenceState = reference.state;
    container.dataset.referenceState = reference.state;
    return reference;
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
    const reference = renderLinkedStatus(container, panel, definition);
    loadButton.disabled = !select.value;
    if (reference.state === 'unresolved' && select.value === reference.parent?.profileId) {
      loadButton.textContent = 'Restore Parent Context';
    } else if (reference.state === 'stale' && select.value === reference.parent?.profileId) {
      loadButton.textContent = 'Refresh to Latest Parent';
    } else {
      loadButton.textContent = 'Load Saved Parent';
    }
    clearButton.disabled = !current;
  }

  function loadSelected(adapter, panel, definition, container) {
    const select = container.querySelector('select');
    const profileId = select?.value;
    if (!profileId) return;
    const previousReference = parentReferenceState(panel, definition);
    const previous = previousReference.parent;
    const result = Repository.load(profileId);
    const status = container.querySelector('[data-parent-library-status]');
    if (!result.ok) {
      if (status) {
        status.textContent = result.message;
        status.dataset.linked = 'false';
        status.dataset.referenceState = 'error';
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
      let action;
      if (previousReference.state === 'unresolved' && previous?.profileId === result.envelope.profileId) {
        action = `Restored embedded context for inherited ${definition.id} ${result.envelope.name} at revision ${result.envelope.revision}.`;
      } else if (previous?.profileId === result.envelope.profileId) {
        action = `Refreshed inherited ${definition.id} from revision ${previous.revision} to revision ${result.envelope.revision}.`;
      } else {
        action = `Linked inherited ${definition.id} record ${result.envelope.name}.`;
      }
      Lifecycle.markDirty(adapter.id, action, { autosave: true });
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
    Lifecycle.markDirty(adapter.id, `Cleared inherited ${definition.id} record.`, { autosave: true });
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
    container.dataset.referenceState = 'none';
    container.innerHTML = `
      <div class="mainline-parent-library-heading">
        <div>
          <strong>Saved ${escapeHtml(definition.id)} inheritance</strong>
          <p data-parent-library-status data-linked="false" data-reference-state="none">No saved ${escapeHtml(definition.id)} record is linked.</p>
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
      .mainline-parent-library-heading p[data-reference-state="current"]{color:#9ed6a4}
      .mainline-parent-library-heading p[data-reference-state="stale"],.mainline-parent-library-heading p[data-reference-state="unresolved"]{color:#e7bf73}
      .mainline-parent-library-heading p[data-reference-state="unavailable"],.mainline-parent-library-heading p[data-reference-state="ahead"],.mainline-parent-library-heading p[data-reference-state="error"]{color:#ff9b8b}
      .mainline-parent-library-control[data-reference-state="stale"],.mainline-parent-library-control[data-reference-state="unresolved"]{border-color:#e7bf73}
      .mainline-parent-library-control[data-reference-state="unavailable"],.mainline-parent-library-control[data-reference-state="ahead"]{border-color:#ff9b8b}
      .mainline-parent-library-row{display:grid;grid-template-columns:minmax(240px,1fr) auto auto;gap:8px;align-items:end;margin-top:8px}
      .mainline-parent-library-row label{grid-column:1/-1;color:var(--muted);font-size:.76rem;font-weight:700;text-transform:capitalize}
      @media(max-width:850px){.mainline-parent-library-row{grid-template-columns:1fr}.mainline-parent-library-row label{grid-column:auto}.mainline-parent-library-row button{width:100%}}
    `;
    document.head.appendChild(style);
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, character => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[character]));
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
    clearLinked,
    parentReferenceState
  });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install);
  else install();
})();
