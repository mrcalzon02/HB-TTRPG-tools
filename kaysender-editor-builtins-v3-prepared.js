(() => {
  'use strict';

  const Registry = window.KaysenderEditorAdapters;
  const Migrations = window.KaysenderEditorMigrations;
  const IslandFactory = window.KaysenderIslandV3AdapterFactory;
  if (!Registry || !Migrations || !IslandFactory) {
    console.error('Prepared P1 built-ins could not start: registry, migration registry, or Island v3 adapter factory is missing.');
    return;
  }

  Registry.register(IslandFactory.createDefinition());
  Migrations.register(IslandFactory.createMigrationDefinition());

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
})();
