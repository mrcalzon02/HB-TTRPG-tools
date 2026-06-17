(() => {
  'use strict';

  const Registry = window.KaysenderEditorAdapters;
  if (!Registry) {
    console.error('Kaysender built-in editor adapters could not start: adapter registry is missing.');
    return;
  }

  Registry.register({
    id: 'floating-island-editor',
    aliases: ['island'],
    moduleId: 'floating-island-generator',
    label: 'Open Production Island Editor',
    profileType: 'floating-island-foundation-profile',
    panelId: 'kaysender-editor-panel',
    formId: 'floating-island-editor-form',
    outputId: 'floating-island-editor-output',
    buildButtonId: 'island-build-profile',
    randomizeButtonId: 'island-randomize',
    legacyButtonSelectors: ['.editor-launch'],
    hiddenLegacyActionIds: ['island-copy-json', 'island-download-json'],
    cardLinkFlag: 'editorLinked',
    parentImports: [],
    open: () => window.openFloatingIslandEditor?.()
  });

  Registry.register({
    id: 'settlement-editor',
    aliases: ['settlement'],
    moduleId: 'settlement-generator',
    label: 'Open Production Settlement Editor',
    profileType: 'settlement-profile',
    panelId: 'kaysender-settlement-editor-panel',
    formId: 'settlement-editor-form',
    outputId: 'settlement-editor-output',
    buildButtonId: 'settlement-build-profile',
    randomizeButtonId: 'settlement-randomize',
    legacyButtonSelectors: ['.settlement-editor-launch'],
    hiddenLegacyActionIds: ['settlement-copy-json', 'settlement-download-json'],
    cardLinkFlag: 'settlementEditorLinked',
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
    panelId: 'kaysender-airship-editor-panel',
    formId: 'airship-editor-form',
    outputId: 'airship-editor-output',
    buildButtonId: 'airship-build-profile',
    randomizeButtonId: 'airship-randomize',
    legacyButtonSelectors: ['.airship-editor-launch'],
    hiddenLegacyActionIds: ['airship-copy-json', 'airship-download-json'],
    cardLinkFlag: 'airshipEditorLinked',
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
