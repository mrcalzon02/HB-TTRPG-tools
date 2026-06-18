(() => {
  'use strict';

  const root = typeof window !== 'undefined' ? window : globalThis;
  const base = root.KaysenderIslandV3AdapterFactory;
  const panelsApi = root.KaysenderIslandV3Panels;
  if (!base?.LEGACY_FIELD_MAP) throw new Error('Island production-panel bridge requires the final legacy-projecting adapter factory.');
  if (!panelsApi?.IslandProductionController) throw new Error('Island production-panel bridge requires the final structured panel controller.');

  const clone = value => value === undefined ? undefined : JSON.parse(JSON.stringify(value));

  function checkedLocks(panel) {
    const local = Array.from(panel?.querySelectorAll?.('[data-editor-lock]:checked') || [])
      .map(item => item.dataset.editorLock)
      .filter(Boolean);
    const envelope = root.KaysenderMainlineEditorProduction?.getActiveEnvelope?.()?.locks || [];
    return [...new Set([...envelope, ...local])];
  }

  function syncBlockEditors(session, profile) {
    session.blockEditors?.forEach?.((textarea, blockId) => {
      if (profile?.[blockId] !== undefined) textarea.value = JSON.stringify(profile[blockId], null, 2);
    });
  }

  function appendPanelDiagnostics(session, diagnostics = []) {
    if (!session?.diagnosticList) return;
    diagnostics.forEach(item => {
      const entry = document.createElement('li');
      entry.className = `severity-${item.severity || 'info'}`;
      const code = document.createElement('strong');
      code.textContent = item.code || 'diagnostic';
      entry.append(code, document.createTextNode(`: ${item.message || ''}`));
      if (item.path) entry.append(document.createTextNode(` [${item.path}]`));
      session.diagnosticList.appendChild(entry);
    });
  }

  function createStructuredWorkspace(session) {
    if (session.productionController) return session;
    const blockRoot = session.workspace?.querySelector?.('.island-v3-block-grid');
    const ledgerHeading = blockRoot?.previousElementSibling || null;
    const diagnosticCard = session.workspace?.querySelector?.('.island-v3-diagnostics');

    const productionHeading = document.createElement('div');
    productionHeading.className = 'section-heading island-v3-production-heading';
    const title = document.createElement('h3');
    title.textContent = 'Structured Production Ledgers';
    const note = document.createElement('p');
    note.className = 'helper-note';
    note.textContent = 'Edit Island systems as typed fields and stable records. The advanced JSON view below is read-only.';
    productionHeading.append(title, note);

    const productionRoot = document.createElement('div');
    productionRoot.id = 'floating-island-production-panels';
    productionRoot.className = 'island-v3-production-panels-root';

    const advanced = document.createElement('details');
    advanced.className = 'island-v3-advanced-json';
    const advancedSummary = document.createElement('summary');
    advancedSummary.textContent = 'Advanced Read-Only JSON Ledger View';
    advanced.appendChild(advancedSummary);
    if (ledgerHeading) advanced.appendChild(ledgerHeading);
    if (blockRoot) advanced.appendChild(blockRoot);
    session.blockEditors?.forEach?.(textarea => {
      textarea.readOnly = true;
      textarea.setAttribute('aria-readonly', 'true');
    });

    if (diagnosticCard) {
      session.workspace.insertBefore(productionHeading, diagnosticCard);
      session.workspace.insertBefore(productionRoot, diagnosticCard);
      session.workspace.insertBefore(advanced, diagnosticCard);
    } else {
      session.workspace.append(productionHeading, productionRoot, advanced);
    }

    session.productionRoot = productionRoot;
    session.advancedJson = advanced;
    session.productionController = new panelsApi.IslandProductionController({
      editorId: base.EDITOR_ID,
      root: productionRoot,
      profile: session.profile,
      getLocks: () => checkedLocks(session.panel),
      onProfileChange: payload => {
        session.profile = clone(payload.profile);
        syncBlockEditors(session, session.profile);
      },
      onDiagnostics: diagnostics => appendPanelDiagnostics(session, diagnostics)
    });
    syncBlockEditors(session, session.productionController.getProfile());
    return session;
  }

  function mergeSurfaceMapIntoProduction(session) {
    createStructuredWorkspace(session);
    const profile = session.productionController.getProfile();
    profile.map = clone(session.controller?.getMap?.() || session.profile?.map || profile.map);
    session.productionController.replaceProfile(profile);
    session.profile = clone(profile);
    syncBlockEditors(session, profile);
    return clone(profile);
  }

  function ensureSession(panel, profileInput = null) {
    const session = base.ensureSession(panel, profileInput);
    createStructuredWorkspace(session);
    if (profileInput) {
      session.productionController.replaceProfile(base.toV3(profileInput));
      mergeSurfaceMapIntoProduction(session);
    }
    return session;
  }

  function replaceSessionProfile(session, profileInput) {
    const replaced = base.replaceSessionProfile(session, profileInput);
    createStructuredWorkspace(replaced);
    replaced.productionController.replaceProfile(replaced.profile);
    syncBlockEditors(replaced, replaced.profile);
    return replaced;
  }

  function readProfile(panel) {
    const session = ensureSession(panel);
    mergeSurfaceMapIntoProduction(session);
    const profile = base.readProfile(panel);
    if (!profile) return null;
    session.productionController.replaceProfile(profile);
    session.profile = clone(profile);
    syncBlockEditors(session, profile);
    return clone(profile);
  }

  function applyProfileToForm(args) {
    const applied = base.applyProfileToForm(args);
    const form = args.form;
    const panel = form?.closest?.('.editor-panel') || document.getElementById('kaysender-editor-panel');
    if (panel) {
      const session = ensureSession(panel, args.profile);
      session.productionController.replaceProfile(base.toV3(args.profile));
      mergeSurfaceMapIntoProduction(session);
    }
    return applied;
  }

  function createDefinition(options = {}) {
    return Object.freeze({
      ...base.createDefinition(options),
      readProfile,
      applyProfileToForm
    });
  }

  function activationBundle(options = {}) {
    const previous = base.activationBundle(options);
    const additions = [
      'kaysender-island-v3-panels.css',
      'kaysender-island-v3-profile-model.js',
      'kaysender-island-v3-panels.js',
      'kaysender-island-v3-panels-lifecycle.js',
      'kaysender-island-v3-panels-atomic.js',
      'kaysender-island-v3-adapter-panels-bridge.js'
    ];
    return Object.freeze({
      adapter: createDefinition(options),
      migration: previous.migration,
      loadOrder: Object.freeze([...previous.loadOrder, ...additions])
    });
  }

  root.KaysenderIslandV3AdapterFactory = Object.freeze({
    ...base,
    activationBundle,
    applyProfileToForm,
    createDefinition,
    createStructuredWorkspace,
    ensureSession,
    mergeSurfaceMapIntoProduction,
    readProfile,
    replaceSessionProfile,
    syncBlockEditors
  });
})();
