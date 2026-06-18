(() => {
  'use strict';

  const root = typeof window !== 'undefined' ? window : globalThis;
  const clone = value => value === undefined ? undefined : JSON.parse(JSON.stringify(value));
  const unique = values => [...new Set((values || []).filter(Boolean).map(String))];
  const number = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
  const integer = (value, fallback = 0) => Math.trunc(number(value, fallback));
  const clamp = (value, minimum, maximum) => Math.max(minimum, Math.min(maximum, number(value, minimum)));
  const slug = value => String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'record';

  const COLLECTIONS = Object.freeze({
    waterSources: { path: 'hydrology.sources', prefix: 'water', idField: 'id' },
    reservoirs: { path: 'hydrology.reservoirs', prefix: 'reservoir', idField: 'id' },
    resourceNodes: { path: 'resources.nodes', prefix: 'resource', idField: 'id' },
    altitudeSegments: { path: 'motion.altitudeTimeline', prefix: 'altitude-segment', idField: 'id' },
    driftSegments: { path: 'motion.driftTimeline', prefix: 'drift-segment', idField: 'id' },
    faultZones: { path: 'stability.faultZones', prefix: 'fault', idField: 'id' },
    fractureEvents: { path: 'stability.fractureEvents', prefix: 'fracture-event', idField: 'id' },
    landingZones: { path: 'approaches.landingZones', prefix: 'landing', idField: 'id' },
    approachCorridors: { path: 'approaches.approachCorridors', prefix: 'approach', idField: 'id' },
    sites: { path: 'sites', prefix: 'site', idField: 'id' },
    hazards: { path: 'hazards', prefix: 'hazard', idField: 'id' },
    habitats: { path: 'ecology.habitats', prefix: 'habitat', idField: 'id' },
    speciesSlots: { path: 'ecology.speciesSlots', prefix: 'species-slot', idField: 'id' },
    settlementSlots: { path: 'settlementCapacity.settlementSlots', prefix: 'settlement-slot', idField: 'id' },
    routeNodes: { path: 'routeNodeExport.nodes', prefix: 'route-node', idField: 'id' }
  });

  const REFERENCE_FIELDS = Object.freeze([
    { path: 'map.activeCellIds', collection: null, field: null, type: 'many' },
    { path: 'map.cells', collection: null, field: 'waterCatchmentId', type: 'one' },
    { path: 'map.cells', collection: null, field: 'siteIds', type: 'many' },
    { path: 'map.cells', collection: null, field: 'resourceNodeIds', type: 'many' },
    { path: 'map.cells', collection: null, field: 'hazardIds', type: 'many' },
    { path: 'hydrology.sources', collection: 'waterSources', field: 'mapCellId', type: 'one' },
    { path: 'hydrology.reservoirs', collection: 'reservoirs', field: 'mapCellId', type: 'one' },
    { path: 'resources.nodes', collection: 'resourceNodes', field: 'mapCellId', type: 'one' },
    { path: 'stability.faultZones', collection: 'faultZones', field: 'cellIds', type: 'many' },
    { path: 'stability.fractureEvents', collection: 'fractureEvents', field: 'faultZoneId', type: 'one' },
    { path: 'approaches.landingZones', collection: 'landingZones', field: 'mapCellId', type: 'one' },
    { path: 'approaches.approachCorridors', collection: 'approachCorridors', field: 'landingZoneId', type: 'one' },
    { path: 'approaches.approachCorridors', collection: 'approachCorridors', field: 'hazardIds', type: 'many' },
    { path: 'sites', collection: 'sites', field: 'mapCellId', type: 'one' },
    { path: 'hazards', collection: 'hazards', field: 'cellIds', type: 'many' },
    { path: 'ecology.habitats', collection: 'habitats', field: 'cellIds', type: 'many' },
    { path: 'ecology.speciesSlots', collection: 'speciesSlots', field: 'habitatId', type: 'one' },
    { path: 'settlementCapacity.settlementSlots', collection: 'settlementSlots', field: 'mapCellId', type: 'one' },
    { path: 'settlementCapacity.settlementSlots', collection: 'settlementSlots', field: 'waterSourceIds', type: 'many' },
    { path: 'settlementCapacity.settlementSlots', collection: 'settlementSlots', field: 'landingZoneIds', type: 'many' },
    { path: 'routeNodeExport.nodes', collection: 'routeNodes', field: 'mapCellId', type: 'one' },
    { path: 'routeNodeExport.nodes', collection: 'routeNodes', field: 'landingZoneIds', type: 'many' },
    { path: 'routeNodeExport.defaultNodeId', collection: null, field: null, type: 'one' },
    { path: 'visibility.playerKnownSiteIds', collection: null, field: null, type: 'many' },
    { path: 'visibility.gmOnlySiteIds', collection: null, field: null, type: 'many' },
    { path: 'visibility.playerKnownHazardIds', collection: null, field: null, type: 'many' },
    { path: 'visibility.gmOnlyHazardIds', collection: null, field: null, type: 'many' }
  ]);

  function pathParts(path) {
    return String(path || '').replace(/^data\./, '').replace(/\[(\d+)\]/g, '.$1').split('.').filter(Boolean);
  }

  function getAt(object, path, fallback = undefined) {
    let current = object;
    for (const part of pathParts(path)) {
      if (current === null || current === undefined || !(part in Object(current))) return fallback;
      current = current[part];
    }
    return current;
  }

  function setAt(object, path, value) {
    const parts = pathParts(path);
    if (!parts.length) throw new Error('Cannot set the profile root directly.');
    let current = object;
    parts.slice(0, -1).forEach(part => {
      if (!current[part] || typeof current[part] !== 'object') current[part] = {};
      current = current[part];
    });
    current[parts.at(-1)] = value;
    return object;
  }

  function normalizeLockPath(path) {
    return pathParts(path).join('.');
  }

  function createLockMatcher(locks = []) {
    const normalized = unique(locks.map(normalizeLockPath));
    return path => {
      const target = normalizeLockPath(path);
      return normalized.some(lock => target === lock || target.startsWith(`${lock}.`) || lock.startsWith(`${target}.`));
    };
  }

  function normalizeValue(value, definition = {}) {
    const type = definition.type || 'text';
    if (type === 'boolean') return Boolean(value);
    if (type === 'integer') {
      const normalized = integer(value, definition.default ?? 0);
      return definition.minimum !== undefined ? Math.max(definition.minimum, normalized) : normalized;
    }
    if (type === 'number') {
      let normalized = number(value, definition.default ?? 0);
      if (definition.minimum !== undefined) normalized = Math.max(definition.minimum, normalized);
      if (definition.maximum !== undefined) normalized = Math.min(definition.maximum, normalized);
      return normalized;
    }
    if (type === 'percent') return clamp(value, 0, 100);
    if (type === 'list') {
      if (Array.isArray(value)) return unique(value.map(item => String(item).trim()));
      return unique(String(value || '').split(',').map(item => item.trim()));
    }
    if (type === 'lines') {
      if (Array.isArray(value)) return value.map(item => String(item).trim()).filter(Boolean);
      return String(value || '').split(/\r?\n/).map(item => item.trim()).filter(Boolean);
    }
    if (type === 'json') {
      if (typeof value === 'string') return JSON.parse(value || '{}');
      return clone(value || {});
    }
    if (type === 'enum') {
      const text = String(value || '');
      if (definition.options?.includes(text)) return text;
      return definition.options?.[0] ?? text;
    }
    return String(value ?? '').trim();
  }

  function nextStableId(prefix, records = [], preferred = '') {
    const existing = new Set(records.map(record => record?.id).filter(Boolean));
    const base = `${prefix}-${slug(preferred || 'new')}`;
    if (!existing.has(base)) return base;
    let counter = 2;
    while (existing.has(`${base}-${counter}`)) counter += 1;
    return `${base}-${counter}`;
  }

  function resolveCollection(collectionId) {
    const definition = COLLECTIONS[collectionId];
    if (!definition) throw new Error(`Unknown Island profile collection ${collectionId}.`);
    return definition;
  }

  function listReferences(profile, entityId) {
    const references = [];
    for (const definition of REFERENCE_FIELDS) {
      const value = getAt(profile, definition.path);
      if (Array.isArray(value) && definition.field) {
        value.forEach((record, index) => {
          const fieldValue = record?.[definition.field];
          const hit = definition.type === 'many' ? (fieldValue || []).includes(entityId) : fieldValue === entityId;
          if (hit) references.push({
            path: `${definition.path}[${index}].${definition.field}`,
            collection: definition.collection,
            recordId: record?.id || null,
            entityId
          });
        });
      } else {
        const hit = definition.type === 'many' ? (value || []).includes(entityId) : value === entityId;
        if (hit) references.push({ path: definition.path, collection: definition.collection, recordId: null, entityId });
      }
    }
    return references;
  }

  class IslandProfileModel {
    constructor(profile = {}, options = {}) {
      this.profile = clone(profile || {});
      this.listeners = new Set();
      this.getLocks = typeof options.getLocks === 'function' ? options.getLocks : () => options.locks || [];
      this.lockMatcher = createLockMatcher(this.getLocks());
    }

    #refreshLocks() {
      this.lockMatcher = createLockMatcher(this.getLocks());
    }

    #assertUnlocked(path) {
      this.#refreshLocks();
      if (this.lockMatcher(path)) throw new Error(`Profile path ${path} is locked.`);
    }

    #emit(type, detail = {}) {
      const event = Object.freeze({ type, profile: this.getProfile(), ...clone(detail) });
      this.listeners.forEach(listener => listener(event));
      return event;
    }

    subscribe(listener) {
      if (typeof listener !== 'function') throw new Error('Island profile listener must be a function.');
      this.listeners.add(listener);
      return () => this.listeners.delete(listener);
    }

    getProfile() {
      return clone(this.profile);
    }

    replaceProfile(profile = {}, options = {}) {
      this.profile = clone(profile || {});
      if (options.emit !== false) this.#emit('profile-replaced');
      return this.getProfile();
    }

    get(path, fallback = undefined) {
      return clone(getAt(this.profile, path, fallback));
    }

    isLocked(path) {
      this.#refreshLocks();
      return this.lockMatcher(path);
    }

    setField(path, value, definition = {}) {
      const result = this.setFields([{ path, value, definition }]);
      const change = result.changes[0];
      return change || { changed: false, path, value: clone(getAt(this.profile, path)), previous: clone(getAt(this.profile, path)) };
    }

    setFields(changes = []) {
      const prepared = changes.map(change => {
        this.#assertUnlocked(change.path);
        const previous = clone(getAt(this.profile, change.path));
        const normalized = normalizeValue(change.value, change.definition || {});
        return {
          path: change.path,
          previous,
          value: normalized,
          changed: JSON.stringify(previous) !== JSON.stringify(normalized)
        };
      }).filter(change => change.changed);
      if (!prepared.length) return { changed: false, changes: [] };
      prepared.forEach(change => setAt(this.profile, change.path, clone(change.value)));
      this.#emit('fields-changed', { changes: prepared });
      return { changed: true, changes: clone(prepared) };
    }

    listRecords(collectionId) {
      const definition = resolveCollection(collectionId);
      return clone(getAt(this.profile, definition.path, []));
    }

    addRecord(collectionId, record = {}, options = {}) {
      const definition = resolveCollection(collectionId);
      this.#assertUnlocked(definition.path);
      const records = this.listRecords(collectionId);
      const next = clone(record || {});
      next[definition.idField] = next[definition.idField] || nextStableId(definition.prefix, records, options.preferredId || next.name || next.type || collectionId);
      if (records.some(item => item[definition.idField] === next[definition.idField])) throw new Error(`Duplicate ${collectionId} ID ${next[definition.idField]}.`);
      records.push(next);
      setAt(this.profile, definition.path, records);
      this.#emit('record-added', { collectionId, path: definition.path, record: next });
      return clone(next);
    }

    updateRecord(collectionId, recordId, patch = {}, fieldDefinitions = {}) {
      const definition = resolveCollection(collectionId);
      const records = this.listRecords(collectionId);
      const index = records.findIndex(record => record[definition.idField] === recordId);
      if (index < 0) throw new Error(`Unknown ${collectionId} record ${recordId}.`);
      const previous = clone(records[index]);
      const next = clone(records[index]);
      Object.entries(patch).forEach(([field, value]) => {
        const fieldPath = `${definition.path}.${recordId}.${field}`;
        this.#assertUnlocked(fieldPath);
        if (field === definition.idField && value !== recordId) throw new Error(`Stable ID ${recordId} cannot be changed through record editing.`);
        next[field] = normalizeValue(value, fieldDefinitions[field] || {});
      });
      if (JSON.stringify(previous) === JSON.stringify(next)) return { changed: false, record: clone(next), previous };
      records[index] = next;
      setAt(this.profile, definition.path, records);
      this.#emit('record-updated', { collectionId, path: definition.path, record: next, previous });
      return { changed: true, record: clone(next), previous };
    }

    removeRecord(collectionId, recordId, options = {}) {
      const definition = resolveCollection(collectionId);
      this.#assertUnlocked(definition.path);
      const records = this.listRecords(collectionId);
      const index = records.findIndex(record => record[definition.idField] === recordId);
      if (index < 0) return { removed: false, reason: 'not-found', references: [] };
      const references = listReferences(this.profile, recordId).filter(reference => reference.path !== `${definition.path}[${index}].${definition.idField}`);
      if (references.length && options.force !== true) return { removed: false, reason: 'referenced', references: clone(references), record: clone(records[index]) };
      const [record] = records.splice(index, 1);
      setAt(this.profile, definition.path, records);
      this.#emit('record-removed', { collectionId, path: definition.path, record, references });
      return { removed: true, record: clone(record), references: clone(references) };
    }

    findReferences(entityId) {
      return clone(listReferences(this.profile, entityId));
    }

    buildCanonical(options = {}) {
      const domain = options.domain || root.KaysenderIslandV3Domain;
      const transformers = options.transformers || root.KaysenderIslandV3Transformers;
      if (!domain?.applyDerived) throw new Error('Island v3 domain engine is unavailable.');
      if (!transformers?.buildDownstreamExports) throw new Error('Island v3 downstream transformer is unavailable.');
      let canonical = domain.applyDerived(this.profile);
      canonical.outputs = canonical.outputs || {};
      canonical.outputs.downstreamExports = transformers.buildDownstreamExports(canonical, options.source || {});
      return clone(canonical);
    }

    commitCanonical(options = {}) {
      const previous = this.getProfile();
      this.profile = this.buildCanonical(options);
      this.#emit('canonical-rebuilt', { previous });
      return this.getProfile();
    }
  }

  root.KaysenderIslandV3ProfileModel = Object.freeze({
    COLLECTIONS,
    IslandProfileModel,
    REFERENCE_FIELDS,
    createLockMatcher,
    getAt,
    listReferences,
    nextStableId,
    normalizeLockPath,
    normalizeValue,
    setAt
  });
})();
