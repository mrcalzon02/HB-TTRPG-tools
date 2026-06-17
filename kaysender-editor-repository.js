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
    try {
      target.setItem(recordKey(envelope.profileId), JSON.stringify(envelope));
      const nextMetadata = metadata(envelope);
      const entries = readIndex().filter(item => item.profileId !== envelope.profileId);
      entries.push(nextMetadata);
      writeIndex(sortEntries(entries));
      return { ok: true, message: `Saved ${nextMetadata.name} revision ${nextMetadata.revision}.`, record: nextMetadata };
    } catch (error) {
      return { ok: false, message: `Record save failed: ${error.message}` };
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
    try {
      target.removeItem(recordKey(profileId));
      writeIndex(readIndex().filter(item => item.profileId !== profileId));
      return { ok: true, message: `Deleted saved record ${profileId}.` };
    } catch (error) {
      return { ok: false, message: `Record deletion failed: ${error.message}` };
    }
  }

  function list(options = {}) {
    return sortEntries(readIndex().filter(item => {
      if (options.profileType && item.profileType !== options.profileType) return false;
      if (options.editorId && item.editorId !== options.editorId) return false;
      return true;
    }));
  }

  function repairIndex() {
    const target = storage();
    if (!target) return { ok: false, message: 'Local storage is unavailable.' };
    const entries = [];
    for (let index = 0; index < target.length; index += 1) {
      const key = target.key(index);
      if (!key?.startsWith(RECORD_PREFIX)) continue;
      try {
        const envelope = JSON.parse(target.getItem(key));
        if (Kernel.isEnvelope(envelope)) entries.push(metadata(envelope));
      } catch {
        // Malformed orphaned records are omitted from the rebuilt index.
      }
    }
    try {
      writeIndex(sortEntries(entries));
      return { ok: true, message: `Rebuilt record index with ${entries.length} record${entries.length === 1 ? '' : 's'}.`, records: sortEntries(entries) };
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
