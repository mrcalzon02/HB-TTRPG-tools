(() => {
  'use strict';

  const root = typeof window !== 'undefined' ? window : globalThis;
  const ENVELOPE_VERSION = '1.0.0';
  const STORAGE_PREFIX = 'hb-ttrpg-tools:kaysender-editor-draft:';
  const PROFILE_TYPES = new Set([
    'floating-island-foundation-profile',
    'settlement-profile',
    'airship-profile'
  ]);

  function deepClone(value) {
    if (value === undefined) return undefined;
    return JSON.parse(JSON.stringify(value));
  }

  function nowIso() {
    return new Date().toISOString();
  }

  function slugify(value, fallback = 'profile') {
    return String(value || fallback)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || fallback;
  }

  function randomHex(length = 12) {
    const cryptoObject = root.crypto || globalThis.crypto;
    if (cryptoObject?.randomUUID) return cryptoObject.randomUUID().replace(/-/g, '').slice(0, length);
    if (cryptoObject?.getRandomValues) {
      const bytes = new Uint8Array(Math.ceil(length / 2));
      cryptoObject.getRandomValues(bytes);
      return Array.from(bytes, value => value.toString(16).padStart(2, '0')).join('').slice(0, length);
    }
    return `${Date.now().toString(16)}${Math.floor(Math.random() * 0xffffffff).toString(16)}`.slice(0, length);
  }

  function createProfileId(profileType, name) {
    const typeStem = {
      'floating-island-foundation-profile': 'island',
      'settlement-profile': 'settlement',
      'airship-profile': 'airship'
    }[profileType] || 'profile';
    return `${typeStem}-${slugify(name, 'unnamed').slice(0, 42)}-${randomHex(12)}`;
  }

  function stableNormalize(value) {
    if (Array.isArray(value)) return value.map(stableNormalize);
    if (value && typeof value === 'object') {
      return Object.keys(value).sort().reduce((result, key) => {
        if (value[key] !== undefined) result[key] = stableNormalize(value[key]);
        return result;
      }, {});
    }
    return value;
  }

  function stableStringify(value) {
    return JSON.stringify(stableNormalize(value));
  }

  function profileFingerprint(data, locks = [], inheritance = []) {
    return stableStringify({
      data,
      locks: Array.from(new Set(locks || [])).sort(),
      inheritance: inheritance || []
    });
  }

  function diagnostic(severity, code, message, path = '') {
    return { severity, code, message, path };
  }

  function isEnvelope(value) {
    return Boolean(value && typeof value === 'object' && value.editorEnvelopeVersion && value.data && value.profileId);
  }

  function unwrap(value) {
    return isEnvelope(value) ? value.data : value;
  }

  function inferProfileType(data) {
    if (!data || typeof data !== 'object') return '';
    if (PROFILE_TYPES.has(data.profileType)) return data.profileType;
    if (data.classification && data.geometry && data.hydrology) return 'floating-island-foundation-profile';
    if (data.settlementType && data.populationScale && data.governmentType) return 'settlement-profile';
    if (data.vesselClass && data.coreType && data.crewQuality) return 'airship-profile';
    if ('waterProfile' in data || 'routeTraffic' in data || 'altitudeBand' in data) return 'floating-island-foundation-profile';
    return '';
  }

  function validateDomainData(data, expectedTypes = []) {
    const diagnostics = [];
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      diagnostics.push(diagnostic('error', 'record-not-object', 'Imported record must be a JSON object.'));
      return diagnostics;
    }
    const profileType = inferProfileType(data);
    if (!profileType) diagnostics.push(diagnostic('error', 'profile-type-unknown', 'Could not identify this record as an island, settlement, or airship profile.', 'profileType'));
    if (expectedTypes.length && profileType && !expectedTypes.includes(profileType)) {
      diagnostics.push(diagnostic('error', 'profile-type-mismatch', `Expected ${expectedTypes.join(' or ')}, received ${profileType}.`, 'profileType'));
    }
    if (!String(data.name || '').trim()) diagnostics.push(diagnostic('error', 'profile-name-missing', 'Profile name is required.', 'name'));
    if (profileType === 'floating-island-foundation-profile') {
      if (!data.geometry && !('lengthKm' in data)) diagnostics.push(diagnostic('warning', 'island-geometry-missing', 'Island profile does not contain canonical geometry or legacy length fields.', 'geometry'));
      if (!data.hydrology && !('waterProfile' in data)) diagnostics.push(diagnostic('warning', 'island-hydrology-missing', 'Island profile does not contain hydrology data.', 'hydrology'));
    }
    if (profileType === 'settlement-profile' && !data.derivedScores) diagnostics.push(diagnostic('warning', 'settlement-scores-missing', 'Settlement profile has no derivedScores block.', 'derivedScores'));
    if (profileType === 'airship-profile' && !data.derivedScores) diagnostics.push(diagnostic('warning', 'airship-scores-missing', 'Airship profile has no derivedScores block.', 'derivedScores'));
    return diagnostics;
  }

  function validateEnvelope(envelope, expectedTypes = []) {
    const diagnostics = [];
    if (!isEnvelope(envelope)) {
      diagnostics.push(diagnostic('error', 'envelope-invalid', 'Record is not a canonical editor envelope.'));
      return diagnostics;
    }
    if (envelope.editorEnvelopeVersion !== ENVELOPE_VERSION) diagnostics.push(diagnostic('error', 'envelope-version-unsupported', `Envelope version ${envelope.editorEnvelopeVersion} is not supported.`, 'editorEnvelopeVersion'));
    if (!/^[a-z0-9][a-z0-9-]*-[a-f0-9]{8,}$/.test(envelope.profileId || '')) diagnostics.push(diagnostic('error', 'profile-id-invalid', 'Profile ID is missing or malformed.', 'profileId'));
    if (!Number.isInteger(envelope.revision) || envelope.revision < 1) diagnostics.push(diagnostic('error', 'revision-invalid', 'Revision must be a positive integer.', 'revision'));
    if (!Array.isArray(envelope.inheritance)) diagnostics.push(diagnostic('error', 'inheritance-invalid', 'Inheritance ledger must be an array.', 'inheritance'));
    if (!Array.isArray(envelope.locks)) diagnostics.push(diagnostic('error', 'locks-invalid', 'Field locks must be an array.', 'locks'));
    diagnostics.push(...validateDomainData(envelope.data, expectedTypes));
    return diagnostics;
  }

  function createEnvelope(dataInput, options = {}) {
    const data = deepClone(unwrap(dataInput));
    const profileType = options.profileType || inferProfileType(data);
    if (profileType && !data.profileType) data.profileType = profileType;
    const previous = options.existingEnvelope && isEnvelope(options.existingEnvelope) ? options.existingEnvelope : null;
    const timestamp = nowIso();
    const inheritance = deepClone(options.inheritance || previous?.inheritance || []);
    const locks = Array.from(new Set(options.locks || previous?.locks || [])).sort();
    const previousFingerprint = previous ? profileFingerprint(previous.data, previous.locks, previous.inheritance) : '';
    const nextFingerprint = profileFingerprint(data, locks, inheritance);
    const changed = !previous || previousFingerprint !== nextFingerprint;
    const incrementRevision = previous && options.incrementRevision !== false && changed;
    const migrationLog = [
      ...(previous?.provenance?.migrationLog || []),
      ...(options.migrationLog || [])
    ];
    const diagnostics = validateDomainData(data, profileType ? [profileType] : []);
    return {
      editorEnvelopeVersion: ENVELOPE_VERSION,
      profileId: previous?.profileId || options.profileId || createProfileId(profileType, data?.name),
      profileType,
      profileSchemaVersion: String(data?.schemaVersion || options.profileSchemaVersion || '1.0.0'),
      revision: previous ? previous.revision + (incrementRevision ? 1 : 0) : 1,
      createdAt: previous?.createdAt || timestamp,
      updatedAt: previous && !changed ? previous.updatedAt : timestamp,
      name: String(data?.name || 'Unnamed Profile'),
      provenance: {
        editorId: options.editorId || previous?.provenance?.editorId || 'unknown-editor',
        moduleId: options.moduleId || previous?.provenance?.moduleId || 'unknown-module',
        origin: options.origin || previous?.provenance?.origin || 'editor-created',
        importedAt: options.importedAt || previous?.provenance?.importedAt || null,
        clonedFromProfileId: options.clonedFromProfileId || previous?.provenance?.clonedFromProfileId || null,
        migrationLog
      },
      inheritance,
      locks,
      diagnostics,
      data
    };
  }

  function cloneEnvelope(envelope, options = {}) {
    const source = isEnvelope(envelope) ? envelope : createEnvelope(envelope, options);
    const data = deepClone(source.data);
    data.name = options.name || `${data.name || 'Unnamed Profile'} Copy`;
    return createEnvelope(data, {
      ...options,
      existingEnvelope: null,
      clonedFromProfileId: source.profileId,
      origin: 'cloned-record',
      migrationLog: [...(source.provenance?.migrationLog || []), { code: 'profile-cloned', message: `Cloned from ${source.profileId}.` }],
      inheritance: source.inheritance,
      locks: source.locks
    });
  }

  function classifyAltitude(meanAltitudeM) {
    const value = Number(meanAltitudeM || 0);
    if (value >= 6000) return 'extreme high altitude';
    if (value >= 3500) return 'high altitude';
    if (value >= 1500) return 'middle altitude';
    if (value > 0) return 'low altitude';
    return '';
  }

  function deriveFoodProfile(data) {
    if (data.foodProfile) return data.foodProfile;
    const score = Number(data.derivedScores?.agriculturalPotential ?? data.derivedScores?.settlementViability ?? 0);
    if (score >= 16) return 'surplus exports';
    if (score >= 11) return 'tight but stable';
    if (score >= 6) return 'import dependent';
    return 'famine risk';
  }

  function firstText(...values) {
    for (const value of values) {
      if (typeof value === 'string' && value.trim()) return value;
      if (Array.isArray(value)) {
        const found = value.find(item => typeof item === 'string' && item.trim());
        if (found) return found;
      }
    }
    return '';
  }

  function adaptIslandContext(record) {
    const data = deepClone(unwrap(record) || {});
    const scores = data.derivedScores || {};
    const access = data.access || {};
    const resources = data.resources || {};
    const output = data.outputs || {};
    const normalizedScores = {
      ...scores,
      habitability: Number(scores.habitability ?? scores.settlementViability ?? scores.agriculturalPotential ?? 0),
      collapseRisk: Number(scores.collapseRisk ?? scores.hazardPressure ?? Math.max(0, 20 - Number(scores.structuralStability ?? 10))),
      routeValue: Number(scores.routeValue ?? scores.routeReliability ?? access.routeReliability ?? 0),
      conflictPressure: Number(scores.conflictPressure ?? scores.hazardPressure ?? 0)
    };
    return {
      ...data,
      profileType: 'floating-island-foundation-profile',
      waterProfile: firstText(data.waterProfile, data.hydrology?.profile),
      foodProfile: deriveFoodProfile(data),
      routeAccess: firstText(data.routeAccess, access.routeTraffic, access.approachProfile),
      factionPressure: firstText(data.factionPressure, output.factionHooks),
      threatClock: firstText(data.threatClock, data.warnings, output.gmNotes),
      primaryResource: firstText(data.primaryResource, resources.knownMinerals, resources.mineralPresence),
      altitudeBand: firstText(data.altitudeBand, classifyAltitude(data.motion?.meanAltitudeM)),
      settlementFootprint: firstText(data.settlementFootprint, data.classification?.currentUse),
      derivedScores: normalizedScores
    };
  }

  function adaptSettlementContext(record) {
    const data = deepClone(unwrap(record) || {});
    return { ...data, profileType: 'settlement-profile' };
  }

  function adaptAirshipContext(record) {
    const data = deepClone(unwrap(record) || {});
    return { ...data, profileType: 'airship-profile' };
  }

  function adaptContext(record, profileType = inferProfileType(unwrap(record))) {
    if (profileType === 'floating-island-foundation-profile') return adaptIslandContext(record);
    if (profileType === 'settlement-profile') return adaptSettlementContext(record);
    if (profileType === 'airship-profile') return adaptAirshipContext(record);
    return deepClone(unwrap(record));
  }

  function normalizeImportedRecord(input, options = {}) {
    const expectedTypes = options.expectedTypes || [];
    let parsed;
    try {
      parsed = typeof input === 'string' ? JSON.parse(input) : deepClone(input);
    } catch (error) {
      return { ok: false, diagnostics: [diagnostic('error', 'json-parse-failed', `Could not parse JSON: ${error.message}`)] };
    }

    const importedAt = nowIso();
    let envelope;
    const migrationLog = [];
    if (isEnvelope(parsed)) {
      envelope = deepClone(parsed);
      migrationLog.push({ code: 'canonical-envelope-loaded', message: `Loaded canonical envelope ${envelope.profileId}.` });
    } else {
      const profileType = inferProfileType(parsed);
      migrationLog.push({ code: 'legacy-profile-wrapped', message: 'Wrapped a pre-P0 domain profile in the canonical editor envelope.' });
      if (profileType === 'floating-island-foundation-profile') {
        if (parsed.hydrology || parsed.access || parsed.resources) migrationLog.push({ code: 'nested-island-adapter', message: 'Current nested island profile will be exposed through the compatibility context adapter.' });
        else migrationLog.push({ code: 'flat-island-adapter', message: 'Legacy flat island profile will be exposed through the compatibility context adapter.' });
      }
      envelope = createEnvelope(parsed, {
        profileType,
        editorId: options.editorId || 'import-adapter',
        moduleId: options.moduleId || 'import-adapter',
        origin: 'imported-pre-p0-record',
        importedAt,
        migrationLog,
        incrementRevision: false
      });
    }

    envelope.provenance = envelope.provenance || {};
    envelope.provenance.importedAt = envelope.provenance.importedAt || importedAt;
    envelope.provenance.migrationLog = [...(envelope.provenance.migrationLog || []), ...migrationLog];
    const diagnostics = validateEnvelope(envelope, expectedTypes);
    envelope.diagnostics = diagnostics;
    return {
      ok: !diagnostics.some(item => item.severity === 'error'),
      envelope,
      data: deepClone(envelope.data),
      context: adaptContext(envelope, envelope.profileType),
      diagnostics
    };
  }

  function inheritanceReference(envelope, relationship) {
    if (!isEnvelope(envelope)) return null;
    return {
      relationship,
      profileId: envelope.profileId,
      profileType: envelope.profileType,
      name: envelope.name || envelope.data?.name || 'Unnamed Profile',
      revision: envelope.revision
    };
  }

  function draftKey(editorId) {
    return `${STORAGE_PREFIX}${editorId}`;
  }

  function saveDraft(editorId, envelope) {
    if (!root.localStorage) return { ok: false, message: 'Local storage is unavailable.' };
    root.localStorage.setItem(draftKey(editorId), JSON.stringify(envelope));
    return { ok: true, message: `Saved local draft for ${editorId}.` };
  }

  function loadDraft(editorId) {
    if (!root.localStorage) return null;
    const text = root.localStorage.getItem(draftKey(editorId));
    if (!text) return null;
    const result = normalizeImportedRecord(text);
    return result.ok ? result.envelope : null;
  }

  function clearDraft(editorId, explicit = false) {
    if (!explicit) return { ok: false, message: 'Draft retained. Clearing a recovery draft requires an explicit clear action.' };
    if (!root.localStorage) return { ok: false, message: 'Local storage is unavailable.' };
    root.localStorage.removeItem(draftKey(editorId));
    return { ok: true, message: `Cleared local draft for ${editorId}.` };
  }

  function snapshotFields(form, fieldNames) {
    const snapshot = {};
    (fieldNames || []).forEach(name => {
      const field = form?.elements?.[name];
      if (field) snapshot[name] = field.value;
    });
    return snapshot;
  }

  function restoreFields(form, snapshot) {
    Object.entries(snapshot || {}).forEach(([name, value]) => {
      const field = form?.elements?.[name];
      if (field) field.value = value;
    });
  }

  function setField(form, name, value) {
    if (value === undefined || value === null) return;
    const field = form?.elements?.[name];
    if (field) field.value = value;
  }

  function applyProfileToForm(form, profileType, profileInput) {
    const data = unwrap(profileInput) || {};
    if (!form) return [];
    const applied = [];
    function assign(name, value) {
      if (value === undefined || value === null || !form.elements?.[name]) return;
      setField(form, name, value);
      applied.push(name);
    }

    if (profileType === 'floating-island-foundation-profile') {
      const map = {
        name: data.name,
        sizeClass: data.classification?.sizeClass,
        shapeProfile: data.classification?.shapeProfile,
        currentUse: data.classification?.currentUse,
        lengthKm: data.geometry?.lengthKm,
        widthKm: data.geometry?.widthKm,
        meanThicknessM: data.geometry?.meanThicknessM,
        usableSurfacePercent: data.geometry?.usableSurfacePercent,
        baseRockPercent: data.composition?.ordinaryRockPercent,
        floatstonePercent: data.composition?.floatstonePercent,
        soilPercent: data.composition?.soilSedimentPercent,
        cavernVoidPercent: data.composition?.cavernVoidPercent,
        meanAltitudeM: data.motion?.meanAltitudeM,
        verticalOscillationM: data.motion?.verticalOscillationM,
        oscillationPeriodHours: data.motion?.oscillationPeriodHours,
        altitudePredictability: data.motion?.altitudePredictability,
        horizontalDriftKpd: data.motion?.horizontalDriftKpd,
        driftPredictability: data.motion?.driftPredictability,
        nearestCivilizationKm: data.access?.nearestCivilizationKm,
        routeTraffic: data.access?.routeTraffic,
        chartQuality: data.access?.chartQuality,
        approachProfile: data.access?.approachProfile,
        waterProfile: data.hydrology?.profile ?? data.waterProfile,
        annualRainfallMm: data.hydrology?.annualRainfallMm,
        primaryTerrain: data.terrain?.primary,
        secondaryTerrain: data.terrain?.secondary,
        flatlandPercent: data.terrain?.flatlandPercent,
        arableSoilPercent: data.terrain?.arableSoilPercent,
        vegetationCoverPercent: data.terrain?.vegetationCoverPercent,
        mineralPresence: data.resources?.mineralPresence,
        mineralAccessibility: data.resources?.mineralAccessibility,
        wildlifeDensity: data.ecology?.wildlifeDensity,
        dominantWildlife: data.ecology?.dominantWildlife,
        existingPopulation: data.population?.permanentPopulation,
        knownDungeonCount: data.siteInventory?.knownDungeonCount,
        hiddenSiteDensity: data.siteInventory?.hiddenSiteDensity
      };
      Object.entries(map).forEach(([name, value]) => assign(name, value));
      return applied;
    }

    Object.entries(data).forEach(([name, value]) => {
      if (['outputs', 'derivedScores', 'sourceIslandProfile', 'sourceSettlementProfile'].includes(name)) return;
      if (typeof value !== 'object') assign(name, value);
    });
    return applied;
  }

  function downloadJson(value, filename) {
    if (!root.document || !root.URL || !root.Blob) return false;
    const blob = new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    return true;
  }

  async function copyJson(value) {
    if (!root.navigator?.clipboard) return false;
    await root.navigator.clipboard.writeText(JSON.stringify(value, null, 2));
    return true;
  }

  const api = Object.freeze({
    ENVELOPE_VERSION,
    PROFILE_TYPES: Array.from(PROFILE_TYPES),
    deepClone,
    slugify,
    createProfileId,
    stableNormalize,
    stableStringify,
    profileFingerprint,
    isEnvelope,
    unwrap,
    inferProfileType,
    diagnostic,
    validateDomainData,
    validateEnvelope,
    createEnvelope,
    cloneEnvelope,
    adaptIslandContext,
    adaptSettlementContext,
    adaptAirshipContext,
    adaptContext,
    normalizeImportedRecord,
    inheritanceReference,
    saveDraft,
    loadDraft,
    clearDraft,
    snapshotFields,
    restoreFields,
    applyProfileToForm,
    downloadJson,
    copyJson
  });

  root.KaysenderEditorKernel = api;
})();
