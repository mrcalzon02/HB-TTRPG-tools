(() => {
  'use strict';

  const root = typeof window !== 'undefined' ? window : globalThis;
  const base = root.KaysenderIslandV3AdapterFactory;
  const schema = root.KaysenderIslandV3Schema;
  if (!base || !schema) throw new Error('Island v3 adapter schema bridge requires the adapter factory and schema validator.');

  const clone = value => value === undefined ? undefined : JSON.parse(JSON.stringify(value));

  function renderSchemaDiagnostics(panel, diagnostics) {
    const session = base.getSession(panel);
    if (!session?.diagnosticList || !diagnostics.length) return;
    diagnostics.forEach(item => {
      const entry = document.createElement('li');
      entry.className = 'severity-error';
      const code = document.createElement('strong');
      code.textContent = item.code;
      entry.append(code, document.createTextNode(`: ${item.message}`));
      if (item.path) entry.append(document.createTextNode(` [${item.path}]`));
      session.diagnosticList.appendChild(entry);
    });
    session.diagnostics = [...(session.diagnostics || []), ...clone(diagnostics)];
  }

  function schemaDiagnostics(profile) {
    return schema.validate(profile);
  }

  function validateCanonical(profile) {
    const diagnostics = schemaDiagnostics(profile);
    return {
      ok: diagnostics.length === 0,
      diagnostics: clone(diagnostics),
      profile: clone(profile)
    };
  }

  function readProfile(panel) {
    const profile = base.readProfile(panel);
    if (!profile) return null;
    const result = validateCanonical(profile);
    if (!result.ok) {
      renderSchemaDiagnostics(panel, result.diagnostics);
      return null;
    }
    return result.profile;
  }

  function createDefinition(options = {}) {
    return Object.freeze({
      ...base.createDefinition(options),
      readProfile
    });
  }

  function activationBundle(options = {}) {
    return Object.freeze({
      adapter: createDefinition(options),
      migration: base.createMigrationDefinition(),
      loadOrder: Object.freeze([
        'kaysender-surface-grid-editor.css',
        'kaysender-surface-grid-resize.css',
        'kaysender-island-v3-adapter.css',
        'kaysender-surface-grid-editor.js',
        'kaysender-surface-grid-brushes.js',
        'kaysender-surface-cell-inspector.js',
        'kaysender-surface-grid-toolbar.js',
        'kaysender-surface-grid-resize.js',
        'kaysender-island-v3-schema-validator.js',
        'kaysender-island-v3-domain.js',
        'kaysender-island-v3-transformers.js',
        'kaysender-island-v3-consumer-builders.js',
        'kaysender-island-surface-grid-controller.js',
        'kaysender-island-v3-adapter-factory.js',
        'kaysender-island-v3-adapter-schema-bridge.js'
      ])
    });
  }

  root.KaysenderIslandV3AdapterFactory = Object.freeze({
    ...base,
    activationBundle,
    createDefinition,
    readProfile,
    schemaDiagnostics,
    validateCanonical
  });
})();
