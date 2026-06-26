(() => {
  'use strict';

  const Registry = window.KaysenderEditorAdapters;
  if (!Registry) {
    console.error('Kaysender built-in editor adapters could not start: adapter registry is missing.');
    return;
  }

  const islandStyles = [
    'kaysender-surface-grid-editor.css',
    'kaysender-surface-grid-resize.css',
    'kaysender-island-v3-adapter.css',
    'kaysender-island-v3-panels.css'
  ];

  const islandScripts = [
    'kaysender-surface-grid-editor.js',
    'kaysender-surface-grid-brushes.js',
    'kaysender-surface-cell-inspector.js',
    'kaysender-surface-grid-toolbar.js',
    'kaysender-surface-grid-resize.js',
    'kaysender-island-v3-schema-validator.js',
    'kaysender-island-v3-domain.js',
    'kaysender-island-v3-transformers.js',
    'kaysender-island-v3-migration-normalizer.js',
    'kaysender-island-v3-consumer-builders.js',
    'kaysender-island-surface-grid-controller.js',
    'kaysender-island-v3-adapter-factory.js',
    'kaysender-island-v3-adapter-schema-bridge.js',
    'kaysender-island-v3-legacy-projection.js',
    'kaysender-island-v3-profile-model.js',
    'kaysender-island-v3-panels.js',
    'kaysender-island-v3-reference-suggestions.js',
    'kaysender-island-v3-panels-lifecycle.js',
    'kaysender-island-v3-panels-atomic.js',
    'kaysender-island-v3-adapter-panels-bridge.js'
  ];

  function ensureStyle(href) {
    if (document.querySelector(`link[rel="stylesheet"][href="${href}"]`)) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    document.head.appendChild(link);
  }

  function loadScript(src) {
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing?.dataset.loaded === 'true') return Promise.resolve();
    if (existing) {
      return new Promise((resolve, reject) => {
        existing.addEventListener('load', resolve, { once: true });
        existing.addEventListener('error', () => reject(new Error(`Could not load ${src}.`)), { once: true });
      });
    }
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.async = false;
      script.addEventListener('load', () => {
        script.dataset.loaded = 'true';
        resolve();
      }, { once: true });
      script.addEventListener('error', () => reject(new Error(`Could not load ${src}.`)), { once: true });
      document.head.appendChild(script);
    });
  }

  async function activateIslandV3() {
    try {
      islandStyles.forEach(ensureStyle);
      for (const src of islandScripts) await loadScript(src);

      const Factory = window.KaysenderIslandV3AdapterFactory;
      const Migrations = window.KaysenderEditorMigrations;
      if (!Factory || !Migrations) throw new Error('Island 3.0.0 adapter dependencies did not initialize.');

      if (!Migrations.list('floating-island-foundation-profile').some(item => item.id === 'island-2.0.0-to-3.0.0')) {
        Migrations.register(Factory.createMigrationDefinition());
      }
      if (!Registry.resolve('floating-island-editor')) Registry.register(Factory.createDefinition());

      document.dispatchEvent(new CustomEvent('kaysender-editor-adapters-changed', {
        detail: { editorId: 'floating-island-editor', schemaVersion: '3.0.0' }
      }));
      console.info('Kaysender Island 3.0.0 production editor activated.');
    } catch (error) {
      console.error(`Kaysender Island 3.0.0 activation failed: ${error.message}`);
      const status = document.getElementById('kaysender-status');
      if (status) status.textContent = `Island editor activation failed: ${error.message}`;
    }
  }

  function registerHeadlessIslandContract() {
    if (typeof document !== 'undefined' || Registry.resolve('floating-island-editor')) return;
    Registry.register({
      id: 'floating-island-editor',
      aliases: ['island'],
      moduleId: 'floating-island-generator',
      label: 'Headless P0 Island Contract Adapter',
      profileType: 'floating-island-foundation-profile',
      currentSchemaVersion: '2.0.0',
      panelId: 'kaysender-editor-panel',
      formId: 'floating-island-editor-form',
      outputId: 'floating-island-editor-output',
      buildButtonId: 'island-build-profile',
      randomizeButtonId: 'island-randomize',
      legacyButtonSelectors: ['.editor-launch'],
      hiddenLegacyActionIds: ['island-copy-json', 'island-download-json'],
      cardLinkFlag: 'editorLinked',
      fieldMap: {},
      flatFieldExclusions: ['outputs', 'derivedScores'],
      parentImports: [],
      open: () => undefined
    });
  }

  registerHeadlessIslandContract();

  Registry.register({
    id: 'settlement-editor',
    aliases: ['settlement'],
    moduleId: 'settlement-generator',
    label: 'Open Production Settlement Editor',
    profileType: 'settlement-profile',
    currentSchemaVersion: '1.0.0',
    panelId: 'kaysender-settlement-editor-panel',
    formId: 'settlement-editor-form',
    outputId: 'settlement-editor-output',
    buildButtonId: 'settlement-build-profile',
    randomizeButtonId: 'settlement-randomize',
    legacyButtonSelectors: ['.settlement-editor-launch'],
    hiddenLegacyActionIds: ['settlement-copy-json', 'settlement-download-json'],
    cardLinkFlag: 'settlementEditorLinked',
    flatFieldExclusions: ['outputs', 'derivedScores', 'sourceIslandProfile', 'sourceSettlementProfile'],
    parentImports: [
      {
        id: 'island',
        relationship: 'parent-island',
        expectedTypes: ['floating-island-foundation-profile'],
        textareaId: 'settlement-island-import',
        loadButtonId: 'settlement-load-island',
        statusId: 'settlement-island-status',
        contextDatasetKey: 'sourceIsland',
        envelopeDatasetKey: 'sourceIslandEnvelope',
        sourceProfileField: 'sourceIslandProfile',
        emptyStatus: 'No island profile loaded.'
      }
    ],
    open: () => window.openSettlementEditor?.()
  });

  Registry.register({
    id: 'airship-editor',
    aliases: ['airship'],
    moduleId: 'airship-vessel-generator',
    label: 'Open Production Airship Editor',
    profileType: 'airship-profile',
    currentSchemaVersion: '1.0.0',
    panelId: 'kaysender-airship-editor-panel',
    formId: 'airship-editor-form',
    outputId: 'airship-editor-output',
    buildButtonId: 'airship-build-profile',
    randomizeButtonId: 'airship-randomize',
    legacyButtonSelectors: ['.airship-editor-launch'],
    hiddenLegacyActionIds: ['airship-copy-json', 'airship-download-json'],
    cardLinkFlag: 'airshipEditorLinked',
    flatFieldExclusions: ['outputs', 'derivedScores', 'sourceIslandProfile', 'sourceSettlementProfile'],
    parentImports: [
      {
        id: 'island',
        relationship: 'parent-island',
        expectedTypes: ['floating-island-foundation-profile'],
        textareaId: 'airship-island-import',
        loadButtonId: 'airship-load-island',
        statusId: 'airship-island-status',
        contextDatasetKey: 'sourceIsland',
        envelopeDatasetKey: 'sourceIslandEnvelope',
        sourceProfileField: 'sourceIslandProfile',
        emptyStatus: 'No island profile loaded.'
      },
      {
        id: 'settlement',
        relationship: 'parent-settlement',
        expectedTypes: ['settlement-profile'],
        textareaId: 'airship-settlement-import',
        loadButtonId: 'airship-load-settlement',
        statusId: 'airship-settlement-status',
        contextDatasetKey: 'sourceSettlement',
        envelopeDatasetKey: 'sourceSettlementEnvelope',
        sourceProfileField: 'sourceSettlementProfile',
        emptyStatus: 'No settlement profile loaded.'
      }
    ],
    open: () => window.openAirshipEditor?.()
  });

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', activateIslandV3, { once: true });
    else activateIslandV3();
  }
})();
