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

  function parseVersion(value) {
    const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(String(value || ''));
    return match ? match.slice(1).map(Number) : null;
  }

  function compareVersions(left, right) {
    const leftParts = parseVersion(left);
    const rightParts = parseVersion(right);
    if (!leftParts || !rightParts) return null;
    for (let index = 0; index < 3; index += 1) {
      if (leftParts[index] > rightParts[index]) return 1;
      if (leftParts[index] < rightParts[index]) return -1;
    }
    return 0;
  }

  function schemaCompatibilityDiagnostics(envelope) {
    const adapter = adapterForProfileType(envelope?.profileType);
    if (!adapter) return [];
    const received = String(envelope.profileSchemaVersion || envelope.data?.schemaVersion || '1.0.0');
    const expected = adapter.currentSchemaVersion;
    const comparison = compareVersions(received, expected);
    if (comparison === null) {
      return [kernel.diagnostic('error', 'profile-schema-version-invalid', `Profile schema version '${received}' is invalid. Expected ${expected}.`, 'profileSchemaVersion')];
    }
    if (comparison < 0) {
      return [kernel.diagnostic('error', 'profile-schema-outdated', `Profile schema ${received} is older than the ${adapter.label.replace(/^Open /, '')} contract ${expected}, and no registered migration completed the upgrade.`, 'profileSchemaVersion')];
    }
    if (comparison > 0) {
      return [kernel.diagnostic('error', 'profile-schema-future', `Profile schema ${received} is newer than the supported ${adapter.label.replace(/^Open /, '')} contract ${expected}.`, 'profileSchemaVersion')];
    }
    return [];
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

    const previous = result.envelope;
    const envelope = migration.changed
      ? kernel.createEnvelope(migration.data, {
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
        })
      : previous;

    const diagnostics = [
      ...kernel.validateEnvelope(envelope, options.expectedTypes || []),
      ...schemaCompatibilityDiagnostics(envelope)
    ];
    if (migration.changed) {
      diagnostics.push(kernel.diagnostic('info', 'profile-schema-migrated', `Applied ${migration.applied.length} registered migration${migration.applied.length === 1 ? '' : 's'} and upgraded the profile to schema ${envelope.profileSchemaVersion}.`, 'profileSchemaVersion'));
    }
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
