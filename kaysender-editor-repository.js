(() => {
  'use strict';

  const Kernel = window.KaysenderEditorKernel;
  if (!Kernel) {
    console.error('Kaysender editor repository could not start: shared kernel is missing.');
    return;
  }

  const INDEX_KEY = 'hb-ttrpg-tools:kaysender-editor-record-index';
  const RECORD_PREFIX = 'hb-ttrpg-tools:kaysender-editor-record:';

  function storage() {
    return window.localStorage || null;
  }

  function recordKey(profileId) {
    return `${RECORD_PREFIX}${profileId}`;
  }

  function readIndex() {
    const target = storage();
    if (!target) return [];
    try {
      const parsed = JSON.parse(target.getItem(INDEX_KEY) || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function writeIndex(entries) {
    const target = storage();
    if (!target) throw new Error('Local storage is unavailable.');
    target.setItem(INDEX_KEY, JSON.stringify(entries));
  }

  function metadata(envelope) {
    return {
      profileId: envelope.profileId,
      profileType: envelope.profileType,
      name: envelope.name || envelope.data?.name || 'Unnamed Profile',
      revision: envelope.revision,
      updatedAt: envelope.updatedAt || new Date().toISOString(),
      editorId: envelope.provenance?.editorId || 'unknown-editor',
      moduleId: envelope.provenance?.moduleId || 'unknown-module'
    };
  }

  function sortEntries(entries) {
    return [...entries].sort((left, right) => {
      const typeOrder = String(left.profileType).localeCompare(String(right.profileType));
      if (typeOrder) return typeOrder;
      return String(left.name).localeCompare(String(right.name));
    });
  }

  function recordFingerprint(envelope) {
    return JSON.stringify({
      profileType: envelope?.profileType || '',
      data: envelope?.data || {},
      locks: Array.isArray(envelope?.locks) ? [...envelope.locks].sort() : [],
      inheritance: envelope?.inheritance || []
    });
  }

  function readExisting(target, profileId) {
    const serialized = target.getItem(recordKey(profileId));
    if (!serialized) return { serialized: null, envelope: null };
    try {
      const result = Kernel.normalizeImportedRecord(serialized);
      if (!result.ok) {
        return {
          serialized,
          envelope: null,
          error: `Existing saved record ${profileId} is malformed. Delete it explicitly or repair the library before saving.`
        };
      }
      return { serialized, envelope: result.envelope };
    } catch (error) {
      return {
        serialized,
        envelope: null,
        error: `Existing saved record ${profileId} could not be read: ${error.message}`
      };
    }
  }

  function revisionConflict(existing, incoming) {
    if (!existing) return null;
    if (existing.profileType !== incoming.profileType) {
      return `Profile ID ${incoming.profileId} is already used by ${existing.profileType}, not ${incoming.profileType}.`;
    }
    if (existing.revision > incoming.revision) {
      return `A newer saved revision ${existing.revision} already exists. Reload it before saving revision ${incoming.revision}.`;
    }
    if (existing.revision === incoming.revision && recordFingerprint(existing) !== recordFingerprint(incoming)) {
      return `Saved record ${incoming.profileId} has different content at revision ${incoming.revision}. Reload it or save your work as a new clone.`;
    }
    return null;
  }

  function save(envelope) {
    const target = storage();
    if (!target) return { ok: false, message: 'Local storage is unavailable.' };
    const diagnostics = Kernel.validateEnvelope(envelope, envelope?.profileType ? [envelope.profileType] : []);
    const errors = diagnostics.filter(item => item.severity === 'error');
    if (errors.length) {
      return {
        ok: false,
        message: `Record was not saved: ${errors.map(item => item.message).join('; ')}`,
        diagnostics
      };
    }

    const key = recordKey(envelope.profileId);
    const previousIndex = readIndex();
    const existing = readExisting(target, envelope.profileId);
    if (existing.error) return { ok: false, conflict: true, message: existing.error };
    const conflictMessage = revisionConflict(existing.envelope, envelope);
    if (conflictMessage) {
      return {
        ok: false,
        conflict: true,
        message: `Record was not saved: ${conflictMessage}`,
        savedRevision: existing.envelope?.revision || null,
        incomingRevision: envelope.revision
      };
    }

    if (
      existing.envelope &&
      existing.envelope.revision === envelope.revision &&
      recordFingerprint(existing.envelope) === recordFingerprint(envelope)
    ) {
      const existingMetadata = metadata(existing.envelope);
      return {
        ok: true,
        unchanged: true,
        message: `${existingMetadata.name} revision ${existingMetadata.revision} was already current; stored timestamps and provenance were preserved.`,
        record: existingMetadata
      };
    }

    try {
      target.setItem(key, JSON.stringify(envelope));
      const nextMetadata = metadata(envelope);
      const entries = previousIndex.filter(item => item.profileId !== envelope.profileId);
      entries.push(nextMetadata);
      writeIndex(sortEntries(entries));
      return {
        ok: true,
        message: `Saved ${nextMetadata.name} revision ${nextMetadata.revision}.`,
        record: nextMetadata,
        unchanged: false
      };
    } catch (error) {
      try {
        if (existing.serialized === null) target.removeItem(key);
        else target.setItem(key, existing.serialized);
        writeIndex(previousIndex);
      } catch {
        // The original record and index were restored on a best-effort basis.
      }
      return { ok: false, message: `Record save failed and was rolled back: ${error.message}` };
    }
  }

  function load(profileId) {
    const target = storage();
    if (!target) return { ok: false, message: 'Local storage is unavailable.' };
    try {
      const serialized = target.getItem(recordKey(profileId));
      if (!serialized) return { ok: false, message: `Saved record ${profileId} was not found.` };
      const result = Kernel.normalizeImportedRecord(serialized);
      if (!result.ok) return { ok: false, message: 'Saved record is malformed.', diagnostics: result.diagnostics };
      return { ok: true, envelope: result.envelope, message: `Loaded ${result.envelope.name}.` };
    } catch (error) {
      return { ok: false, message: `Record load failed: ${error.message}` };
    }
  }

  function remove(profileId, explicit = false) {
    if (!explicit) return { ok: false, message: 'Deleting a saved record requires explicit confirmation.' };
    const target = storage();
    if (!target) return { ok: false, message: 'Local storage is unavailable.' };
    const key = recordKey(profileId);
    const previousSerialized = target.getItem(key);
    const previousIndex = readIndex();
    try {
      target.removeItem(key);
      writeIndex(previousIndex.filter(item => item.profileId !== profileId));
      return { ok: true, message: `Deleted saved record ${profileId}.` };
    } catch (error) {
      try {
        if (previousSerialized !== null) target.setItem(key, previousSerialized);
        writeIndex(previousIndex);
      } catch {
        // The original record and index were restored on a best-effort basis.
      }
      return { ok: false, message: `Record deletion failed and was rolled back: ${error.message}` };
    }
  }

  function list(options = {}) {
    const target = storage();
    const liveEntries = readIndex().filter(item => target?.getItem(recordKey(item.profileId)) !== null);
    return sortEntries(liveEntries.filter(item => {
      if (options.profileType && item.profileType !== options.profileType) return false;
      if (options.editorId && item.editorId !== options.editorId) return false;
      return true;
    }));
  }

  function repairIndex() {
    const target = storage();
    if (!target) return { ok: false, message: 'Local storage is unavailable.' };
    const entries = [];
    const rejected = [];
    for (let index = 0; index < target.length; index += 1) {
      const key = target.key(index);
      if (!key?.startsWith(RECORD_PREFIX)) continue;
      try {
        const serialized = target.getItem(key);
        const result = Kernel.normalizeImportedRecord(serialized);
        if (result.ok) entries.push(metadata(result.envelope));
        else rejected.push(key.slice(RECORD_PREFIX.length));
      } catch {
        rejected.push(key.slice(RECORD_PREFIX.length));
      }
    }
    try {
      writeIndex(sortEntries(entries));
      const rejectionNote = rejected.length
        ? ` ${rejected.length} malformed record${rejected.length === 1 ? ' was' : 's were'} excluded.`
        : '';
      return {
        ok: true,
        message: `Rebuilt record index with ${entries.length} record${entries.length === 1 ? '' : 's'}.${rejectionNote}`,
        records: sortEntries(entries),
        rejected
      };
    } catch (error) {
      return { ok: false, message: `Record index repair failed: ${error.message}` };
    }
  }

  window.KaysenderEditorRepository = Object.freeze({
    save,
    load,
    remove,
    list,
    repairIndex,
    indexKey: INDEX_KEY,
    recordPrefix: RECORD_PREFIX
  });
})();
