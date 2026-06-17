(() => {
  'use strict';

  const Kernel = window.KaysenderEditorKernel;
  if (!Kernel) {
    console.error('Kaysender editor adapter registry could not start: shared kernel is missing.');
    return;
  }

  const adapters = new Map();
  const aliases = new Map();
  const requiredFields = Object.freeze([
    'id', 'moduleId', 'label', 'profileType', 'panelId', 'formId',
    'outputId', 'buildButtonId', 'randomizeButtonId', 'open'
  ]);

  const isText = value => typeof value === 'string' && value.trim().length > 0;

  function normalizeParentImport(definition, editorId) {
    const required = [
      'id', 'relationship', 'textareaId', 'loadButtonId',
      'contextDatasetKey', 'envelopeDatasetKey', 'sourceProfileField'
    ];
    required.forEach(field => {
      if (!isText(definition?.[field])) throw new Error(`Adapter ${editorId} parent import is missing ${field}.`);
    });
    const expectedTypes = Array.isArray(definition.expectedTypes)
      ? definition.expectedTypes.filter(isText)
      : [];
    if (!expectedTypes.length) throw new Error(`Adapter ${editorId} parent import ${definition.id} requires expectedTypes.`);
    return Object.freeze({
      ...definition,
      expectedTypes: Object.freeze([...expectedTypes]),
      emptyStatus: definition.emptyStatus || `No ${definition.id} profile loaded.`
    });
  }

  function normalizeAdapter(input) {
    if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Adapter registration requires an object.');
    requiredFields.forEach(field => {
      const valid = field === 'open' ? typeof input[field] === 'function' : isText(input[field]);
      if (!valid) throw new Error(`Adapter is missing required field ${field}.`);
    });
    if (!Kernel.PROFILE_TYPES.includes(input.profileType)) {
      throw new Error(`Adapter ${input.id} uses unsupported profile type ${input.profileType}.`);
    }
    const parentImports = (input.parentImports || []).map(item => normalizeParentImport(item, input.id));
    const parentIds = new Set();
    const loadActions = new Set();
    parentImports.forEach(item => {
      if (parentIds.has(item.id)) throw new Error(`Adapter ${input.id} duplicates parent ${item.id}.`);
      if (loadActions.has(item.loadButtonId)) throw new Error(`Adapter ${input.id} duplicates load action ${item.loadButtonId}.`);
      parentIds.add(item.id);
      loadActions.add(item.loadButtonId);
    });
    return Object.freeze({
      ...input,
      aliases: Object.freeze([...(input.aliases || [])].filter(isText)),
      legacyButtonSelectors: Object.freeze([...(input.legacyButtonSelectors || [])].filter(isText)),
      hiddenLegacyActionIds: Object.freeze(Array.from(new Set([
        input.randomizeButtonId,
        ...(input.hiddenLegacyActionIds || [])
      ].filter(isText)))),
      parentImports: Object.freeze(parentImports),
      fieldMap: Object.freeze({ ...(input.fieldMap || {}) }),
      flatFieldExclusions: Object.freeze([...(input.flatFieldExclusions || [])].filter(isText))
    });
  }

  function register(input) {
    const adapter = normalizeAdapter(input);
    if (adapters.has(adapter.id)) throw new Error(`Adapter ${adapter.id} is already registered.`);
    adapters.set(adapter.id, adapter);
    [adapter.id, ...adapter.aliases].forEach(alias => {
      if (aliases.has(alias)) throw new Error(`Adapter alias ${alias} is already registered.`);
      aliases.set(alias, adapter.id);
    });
    return adapter;
  }

  function resolve(idOrAlias) {
    return adapters.get(aliases.get(idOrAlias) || idOrAlias) || null;
  }

  function list() {
    return Array.from(adapters.values());
  }

  function getParentImport(adapterOrId, parentIdOrButtonId) {
    const adapter = typeof adapterOrId === 'string' ? resolve(adapterOrId) : adapterOrId;
    return adapter?.parentImports.find(item => item.id === parentIdOrButtonId || item.loadButtonId === parentIdOrButtonId) || null;
  }

  window.KaysenderEditorAdapters = Object.freeze({
    register,
    resolve,
    list,
    getParentImport,
    requiredFields
  });
})();
