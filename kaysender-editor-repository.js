(() => {
  'use strict';

  const Kernel = window.KaysenderEditorKernel;
  if (!Kernel) {
    console.error('Kaysender editor repository could not start: shared kernel is missing.');
    return;
  }

  const INDEX_KEY = 'hb-ttrpg-tools:kaysender-editor-record-index';
  const RECORD_PREFIX = 'hb-ttrpg-tools:kaysender-editor-record:';
  const REQUIRED_INDEX_FIELDS = Object.freeze([
    'generation',
    'lineageComplete',
    'parentProfileId',
    'parentRevision',
    'rootProfileId',
    'rootRevision'
  ]);
  let automaticIndexCheckComplete = false;
  let automaticIndexCheckResult = null;

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

  function provenanceIndex(envelope) {
    const provenance = envelope?.provenance || {};
    const lineage = Array.isArray(provenance.lineage) ? provenance.lineage : [];
    const root = provenance.generation === 0
      ? {
          profileId: envelope.profileId,
          revision: envelope.revision,
          name: envelope.name || envelope.data?.name || 'Unnamed Profile'
        }
      : lineage[0] || null;
    return {
      generation: Number.isInteger(provenance.generation) ? provenance.generation : null,
      lineageComplete: provenance.lineageComplete === true,
      parentProfileId: provenance.parent?.profileId || provenance.clonedFromProfileId || null,
      parentRevision: Number.isInteger(provenance.parent?.revision) ? provenance.parent.revision : null,
      rootProfileId: root?.profileId || null,
      rootRevision: Number.isInteger(root?.revision) ? root.revision : null
    };
  }

  function metadata(envelope) {
    return {
      profileId: envelope.profileId,
      profileType: envelope.profileType,
      name: envelope.name || envelope.data?.name || 'Unnamed Profile',
      revision: envelope.revision,
      updatedAt: envelope.updatedAt || new Date().toISOString(),
      editorId: envelope.provenance?.editorId || 'unknown-editor',
      moduleId: envelope.provenance?.moduleId || 'unknown-module',
      ...provenanceIndex(envelope)
    };
  }

  function sortEntries(entries) {
    return [...entries].sort((left, right) => {
      const typeOrder = String(left.profileType).localeCompare(String(right.profileType));
      if (typeOrder) return typeOrder;
      const nameOrder = String(left.name).localeCompare(String(right.name));
      if (nameOrder) return nameOrder;
      const leftGeneration = Number.isInteger(left.generation) ? left.generation : Number.MAX_SAFE_INTEGER;
      const rightGeneration = Number.isInteger(right.generation) ? right.generation : Number.MAX_SAFE_INTEGER;
      if (leftGeneration !== rightGeneration) return leftGeneration - rightGeneration;
      return Number(left.revision || 0) - Number(right.revision || 0);
    });
  }

  function recordFingerprint(envelope) {
    const provenance = envelope?.provenance || {};
    return JSON.stringify({
      profileType: envelope?.profileType || '',
      data: envelope?.data || {},
      locks: Array.isArray(envelope?.locks) ? [...envelope.locks].sort() : [],
      inheritance: envelope?.inheritance || [],
      provenance: {
        generation: Object.prototype.hasOwnProperty.call(provenance, 'generation') ? provenance.generation : null,
        parent: provenance.parent || null,
        lineage: Array.isArray(provenance.lineage) ? provenance.lineage : [],
        lineageComplete: provenance.lineageComplete === true,
        clonedFromProfileId: provenance.clonedFromProfileId || null
      }
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
      return `Saved record ${incoming.profileId} has different content or provenance at revision ${incoming.revision}. Reload it or save your work as a new clone.`;
    }
    return null;
  }

  function save(envelope) {
    const target = storage();
    if (!target) return { ok: false, message: 'Local storage is unavailable.' };
    ensureIndexCurrent();
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

  function storedProfileIds(target) {
    const profileIds = [];
    for (let index = 0; index < target.length; index += 1) {
      const key = target.key(index);
      if (key?.startsWith(RECORD_PREFIX)) profileIds.push(key.slice(RECORD_PREFIX.length));
    }
    return profileIds.sort();
  }

  function indexEntryIsCurrent(entry) {
    return Boolean(
      entry &&
      typeof entry === 'object' &&
      !Array.isArray(entry) &&
      String(entry.profileId || '').trim() &&
      REQUIRED_INDEX_FIELDS.every(field => Object.prototype.hasOwnProperty.call(entry, field))
    );
  }

  function indexHealth() {
    const target = storage();
    if (!target) return { ok: false, stale: false, message: 'Local storage is unavailable.' };
    const rawIndex = target.getItem(INDEX_KEY);
    let parsedIndex = [];
    let indexReadable = true;
    if (rawIndex !== null) {
      try {
        parsedIndex = JSON.parse(rawIndex);
        if (!Array.isArray(parsedIndex)) {
          parsedIndex = [];
          indexReadable = false;
        }
      } catch {
        indexReadable = false;
      }
    }
    const entries = indexReadable ? parsedIndex : [];
    const storedIds = storedProfileIds(target);
    const indexedIds = entries.map(item => item?.profileId).filter(Boolean).sort();
    const storedSet = new Set(storedIds);
    const indexedSet = new Set(indexedIds);
    const missing = storedIds.filter(profileId => !indexedSet.has(profileId));
    const orphaned = indexedIds.filter(profileId => !storedSet.has(profileId));
    const outdated = entries
      .filter(item => storedSet.has(item?.profileId) && !indexEntryIsCurrent(item))
      .map(item => item.profileId);
    const duplicates = indexedIds.filter((profileId, index) => index > 0 && profileId === indexedIds[index - 1]);
    const stale = !indexReadable || missing.length > 0 || orphaned.length > 0 || outdated.length > 0 || duplicates.length > 0;
    return {
      ok: true,
      stale,
      indexReadable,
      storedCount: storedIds.length,
      indexedCount: entries.length,
      missing,
      orphaned,
      outdated,
      duplicates,
      message: stale
        ? 'Saved record index metadata is stale and should be rebuilt from canonical records.'
        : `Saved record index is current for ${storedIds.length} record${storedIds.length === 1 ? '' : 's'}.`
    };
  }

  function list(options = {}) {
    const target = storage();
    ensureIndexCurrent();
    const liveEntries = readIndex().filter(item => target?.getItem(recordKey(item.profileId)) !== null);
    return sortEntries(liveEntries.filter(item => {
      if (options.profileType && item.profileType !== options.profileType) return false;
      if (options.editorId && item.editorId !== options.editorId) return false;
      if (Number.isInteger(options.generation) && item.generation !== options.generation) return false;
      if (typeof options.lineageComplete === 'boolean' && item.lineageComplete !== options.lineageComplete) return false;
      if (options.query) {
        const query = String(options.query).trim().toLowerCase();
        const searchable = [
          item.name,
          item.profileId,
          item.profileType,
          item.editorId,
          item.moduleId,
          Number.isInteger(item.generation) ? `g${item.generation}` : 'generation unknown',
          item.parentProfileId,
          item.rootProfileId
        ].filter(Boolean).join(' ').toLowerCase();
        if (query && !searchable.includes(query)) return false;
      }
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

  function ensureIndexCurrent(options = {}) {
    const force = options.force === true;
    if (automaticIndexCheckComplete && !force) {
      return automaticIndexCheckResult || {
        ok: true,
        repaired: false,
        skipped: true,
        message: 'Automatic saved record index check already completed for this page session.'
      };
    }
    const health = indexHealth();
    let result;
    if (!health.ok || !health.stale) {
      result = { ...health, repaired: false };
    } else {
      const repair = repairIndex();
      result = {
        ...repair,
        repaired: repair.ok,
        previousHealth: health
      };
    }
    if (!force) {
      automaticIndexCheckComplete = true;
      automaticIndexCheckResult = result;
    }
    return result;
  }

  window.KaysenderEditorRepository = Object.freeze({
    save,
    load,
    remove,
    list,
    indexHealth,
    ensureIndexCurrent,
    repairIndex,
    indexKey: INDEX_KEY,
    recordPrefix: RECORD_PREFIX
  });
})();
