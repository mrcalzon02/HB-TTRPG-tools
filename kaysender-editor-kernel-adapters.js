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
  const fallbackCreateEnvelope = kernel.createEnvelope;
  const fallbackValidateEnvelope = kernel.validateEnvelope;
  const fallbackInheritanceReference = kernel.inheritanceReference;

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

  function normalizeInheritanceReferences(references = []) {
    let changed = false;
    const normalized = (Array.isArray(references) ? references : []).map(reference => {
      const next = kernel.deepClone(reference || {});
      if (!next.policy) {
        next.policy = 'pinned-revision';
        changed = true;
      }
      return next;
    });
    return { changed, references: normalized };
  }

  function inheritanceReference(envelope, relationship) {
    const reference = fallbackInheritanceReference(envelope, relationship);
    if (!reference) return null;
    return {
      ...reference,
      policy: 'pinned-revision',
      sourceUpdatedAt: envelope.updatedAt || null
    };
  }

  function inheritanceDiagnostics(envelope) {
    const diagnostics = [];
    if (!Array.isArray(envelope?.inheritance)) return diagnostics;
    envelope.inheritance.forEach((reference, index) => {
      const path = `inheritance[${index}]`;
      if (!reference || typeof reference !== 'object' || Array.isArray(reference)) {
        diagnostics.push(kernel.diagnostic('error', 'inheritance-reference-invalid', 'Inheritance reference must be an object.', path));
        return;
      }
      if (!String(reference.relationship || '').trim()) diagnostics.push(kernel.diagnostic('error', 'inheritance-relationship-missing', 'Inheritance relationship is required.', `${path}.relationship`));
      if (!String(reference.profileId || '').trim()) diagnostics.push(kernel.diagnostic('error', 'inheritance-profile-id-missing', 'Inherited profile ID is required.', `${path}.profileId`));
      if (!String(reference.profileType || '').trim()) diagnostics.push(kernel.diagnostic('error', 'inheritance-profile-type-missing', 'Inherited profile type is required.', `${path}.profileType`));
      if (!Number.isInteger(reference.revision) || reference.revision < 1) diagnostics.push(kernel.diagnostic('error', 'inheritance-revision-invalid', 'Inherited profile revision must be a positive integer.', `${path}.revision`));
      if (reference.policy !== 'pinned-revision') diagnostics.push(kernel.diagnostic('error', 'inheritance-policy-invalid', 'Inheritance must explicitly use the pinned-revision policy.', `${path}.policy`));
    });
    return diagnostics;
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

  function validateEnvelope(envelope, expectedTypes = []) {
    return [
      ...fallbackValidateEnvelope(envelope, expectedTypes),
      ...inheritanceDiagnostics(envelope),
      ...schemaCompatibilityDiagnostics(envelope)
    ];
  }

  function createEnvelope(dataInput, options = {}) {
    const sourceInheritance = options.inheritance ?? options.existingEnvelope?.inheritance ?? [];
    const normalized = normalizeInheritanceReferences(sourceInheritance);
    return fallbackCreateEnvelope(dataInput, {
      ...options,
      inheritance: normalized.references
    });
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

    const previous = kernel.deepClone(result.envelope);
    const normalizedInheritance = normalizeInheritanceReferences(previous.inheritance);
    if (normalizedInheritance.changed) {
      previous.inheritance = normalizedInheritance.references;
      previous.provenance = previous.provenance || {};
      previous.provenance.migrationLog = [
        ...(previous.provenance.migrationLog || []),
        {
          code: 'inheritance-policy-normalized',
          message: 'Normalized inherited profile references to explicit pinned-revision policy.'
        }
      ];
    }

    let migration;
    try {
      migration = migrations.migrate(previous.data, previous.profileType);
    } catch (error) {
      return migrationFailure({ ...result, envelope: previous }, error);
    }

    const envelope = migration.changed
      ? createEnvelope(migration.data, {
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

    const diagnostics = validateEnvelope(envelope, options.expectedTypes || []);
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

  function restoreInheritedEnvelope(sourceInput, reference, options = {}) {
    const expectedTypes = options.expectedTypes?.length
      ? options.expectedTypes
      : reference?.profileType ? [reference.profileType] : [];
    const result = normalizeImportedRecord(sourceInput, { ...options, expectedTypes });
    if (!result.ok || !reference) return result;

    const base = result.envelope;
    const restoredIdentity = {
      ...base,
      profileId: reference.profileId,
      profileType: reference.profileType || base.profileType,
      revision: reference.revision,
      updatedAt: reference.sourceUpdatedAt || base.updatedAt,
      provenance: {
        ...(base.provenance || {}),
        origin: 'inherited-snapshot',
        migrationLog: [
          ...(base.provenance?.migrationLog || []),
          {
            code: 'pinned-parent-identity-restored',
            message: `Restored pinned parent identity ${reference.profileId} revision ${reference.revision}.`
          }
        ]
      }
    };

    const envelope = createEnvelope(result.data, {
      existingEnvelope: restoredIdentity,
      profileType: restoredIdentity.profileType,
      profileSchemaVersion: base.profileSchemaVersion,
      editorId: base.provenance?.editorId,
      moduleId: base.provenance?.moduleId,
      origin: 'inherited-snapshot',
      importedAt: base.provenance?.importedAt,
      inheritance: base.inheritance,
      locks: base.locks,
      incrementRevision: false
    });
    const diagnostics = validateEnvelope(envelope, expectedTypes);
    diagnostics.push(kernel.diagnostic('info', 'pinned-parent-identity-restored', `Restored ${reference.relationship || 'parent'} ${reference.profileId} at revision ${reference.revision}.`, 'inheritance'));
    envelope.diagnostics = diagnostics;
    return {
      ok: !diagnostics.some(item => item.severity === 'error'),
      envelope,
      data: kernel.deepClone(envelope.data),
      context: kernel.adaptContext(envelope, envelope.profileType),
      diagnostics,
      migrations: result.migrations || []
    };
  }

  window.KaysenderEditorKernel = Object.freeze(Object.assign({}, kernel, {
    applyProfileToForm,
    createEnvelope,
    inheritanceReference,
    normalizeImportedRecord,
    restoreInheritedEnvelope,
    validateEnvelope
  }));
})();
