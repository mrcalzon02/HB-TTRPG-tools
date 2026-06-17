(() => {
  'use strict';

  const kernel = window.KaysenderEditorKernel;
  const registry = window.KaysenderEditorAdapters;
  const mapping = window.KaysenderEditorFieldMapping;
  const migrations = window.KaysenderEditorMigrations;
  if (!kernel || !registry || !mapping || !migrations) {
    console.error('Kaysender editor kernel adapters could not start: a shared dependency is missing.');
    return;
  }

  const fallbackApplyProfileToForm = kernel.applyProfileToForm;
  const fallbackNormalizeImportedRecord = kernel.normalizeImportedRecord;

  function adapterForProfileType(profileType) {
    return registry.list().find(adapter => adapter.profileType === profileType) || null;
  }

  function applyProfileToForm(form, profileType, profileInput) {
    const adapter = adapterForProfileType(profileType);
    if (!adapter) return fallbackApplyProfileToForm(form, profileType, profileInput);
    if (typeof adapter.applyProfileToForm === 'function') {
      return adapter.applyProfileToForm({
        form,
        profileType,
        profile: profileInput,
        mapping,
        fallback: fallbackApplyProfileToForm
      });
    }
    if (Object.keys(adapter.fieldMap || {}).length) {
      return mapping.apply(form, profileInput, adapter.fieldMap);
    }
    return mapping.applyFlat(form, profileInput, adapter.flatFieldExclusions || []);
  }

  function migrationFailure(result, error) {
    const diagnostics = [
      ...(result?.diagnostics || []),
      kernel.diagnostic('error', 'profile-migration-failed', `Profile migration failed: ${error.message}`)
    ];
    if (result?.envelope) result.envelope.diagnostics = diagnostics;
    return {
      ...(result || {}),
      ok: false,
      diagnostics
    };
  }

  function normalizeImportedRecord(input, options = {}) {
    const result = fallbackNormalizeImportedRecord(input, options);
    if (!result?.envelope?.profileType) return result;

    let migration;
    try {
      migration = migrations.migrate(result.envelope.data, result.envelope.profileType);
    } catch (error) {
      return migrationFailure(result, error);
    }
    if (!migration.changed) return result;

    const previous = result.envelope;
    const envelope = kernel.createEnvelope(migration.data, {
      existingEnvelope: previous,
      profileType: previous.profileType,
      profileSchemaVersion: migration.data.schemaVersion,
      editorId: options.editorId || previous.provenance?.editorId,
      moduleId: options.moduleId || previous.provenance?.moduleId,
      origin: previous.provenance?.origin,
      importedAt: previous.provenance?.importedAt,
      migrationLog: migration.log,
      inheritance: previous.inheritance,
      locks: previous.locks,
      incrementRevision: false
    });
    const diagnostics = kernel.validateEnvelope(envelope, options.expectedTypes || []);
    envelope.diagnostics = diagnostics;
    return {
      ok: !diagnostics.some(item => item.severity === 'error'),
      envelope,
      data: kernel.deepClone(envelope.data),
      context: kernel.adaptContext(envelope, envelope.profileType),
      diagnostics,
      migrations: migration.applied
    };
  }

  window.KaysenderEditorKernel = Object.freeze(Object.assign({}, kernel, {
    applyProfileToForm,
    normalizeImportedRecord
  }));
})();
