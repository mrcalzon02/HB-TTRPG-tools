(() => {
  'use strict';

  const kernel = window.KaysenderEditorKernel;
  const registry = window.KaysenderEditorAdapters;
  const mapping = window.KaysenderEditorFieldMapping;
  if (!kernel || !registry || !mapping) {
    console.error('Kaysender editor kernel adapters could not start: a shared dependency is missing.');
    return;
  }

  const fallbackApplyProfileToForm = kernel.applyProfileToForm;

  function adapterForProfileType(profileType) {
    return registry.list().find(adapter => adapter.profileType === profileType) || null;
  }

  function applyProfileToForm(form, profileType, profileInput) {
    const adapter = adapterForProfileType(profileType);
    if (!adapter) return fallbackApplyProfileToForm(form, profileType, profileInput);
    if (Object.keys(adapter.fieldMap || {}).length) {
      return mapping.apply(form, profileInput, adapter.fieldMap);
    }
    return mapping.applyFlat(form, profileInput, adapter.flatFieldExclusions || []);
  }

  window.KaysenderEditorKernel = Object.freeze(Object.assign({}, kernel, {
    applyProfileToForm
  }));
})();
