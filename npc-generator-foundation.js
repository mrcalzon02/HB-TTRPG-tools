(() => {
  'use strict';
  const Random = globalThis.NpcProfileRandom;
  if (!Random) throw new Error('npc-profile-generator-random.js must load first.');

  const CANONICAL_SECTIONS = [
    'appearance','mechanics','socialEconomic','residence','workContext',
    'familyHousehold','personality','motivations','background',
    'affiliationsRelationships','possessionsResources','secretsProblemsHooks'
  ];
  const isObject = value => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
  const clone = value => value === undefined ? undefined : JSON.parse(JSON.stringify(value));
  const diagnostic = (code, severity, message, path = '/', extra = {}) => ({ code, severity, message, path, ...extra });

  function decodePointer(pointer) {
    if (pointer === '' || pointer === '/') return [];
    if (typeof pointer !== 'string' || !pointer.startsWith('/')) throw new TypeError(`Invalid JSON pointer ${pointer}.`);
    return pointer.slice(1).split('/').map(part => part.replace(/~1/g, '/').replace(/~0/g, '~'));
  }

  function pointerGet(target, pointer) {
    return decodePointer(pointer).reduce((value, key) => value == null ? undefined : value[key], target);
  }

  function pointerSet(target, pointer, value) {
    const parts = decodePointer(pointer);
    if (!parts.length) throw new TypeError('Root replacement is not supported.');
    let cursor = target;
    for (let index = 0; index < parts.length - 1; index += 1) {
      const key = parts[index];
      if (!isObject(cursor[key]) && !Array.isArray(cursor[key])) cursor[key] = {};
      cursor = cursor[key];
    }
    cursor[parts[parts.length - 1]] = clone(value);
    return target;
  }

  function tableEntries(pack, tableId) {
    const table = pack?.tables?.[tableId];
    if (Array.isArray(table)) return table;
    if (isObject(table) && Array.isArray(table.entries)) return table.entries;
    return [];
  }

  function chooseTable(pack, tableId, rng, diagnostics, path, fallback = null) {
    if (!tableId) {
      diagnostics.push(diagnostic('GENERATOR_TABLE_ID_MISSING','warning',`No table is configured for ${path}.`,path));
      return clone(fallback);
    }
    const entries = tableEntries(pack, tableId);
    if (!entries.length) {
      diagnostics.push(diagnostic('GENERATOR_TABLE_EMPTY','warning',`Table ${tableId} is missing or empty.`,path,{tableId}));
      return clone(fallback);
    }
    const weighted = entries.some(entry => isObject(entry) && 'weight' in entry);
    return clone(weighted ? rng.weightedChoice(entries) : rng.choice(entries));
  }

  function generatedProfileId(seed, packId, archetypeId) {
    const first = Random.hash32(Random.deriveSeed(seed, packId, archetypeId)).toString(16).padStart(8,'0');
    const second = Random.hash32(`${first}:profile`).toString(16).padStart(8,'0');
    return `npc-${first}-${second}`;
  }

  function fieldState(field, rng) {
    if (field.policy === 'weighted-none') return rng.int(0,99) < Number(field.noneWeight || 0) ? 'none' : 'present';
    if (field.policy === 'unknown-allowed') return rng.int(0,99) < Number(field.unknownWeight ?? 25) ? 'unknown' : 'present';
    if (field.policy === 'prohibited') return 'not-applicable';
    return 'present';
  }

  function generateField(field, pack, rng, diagnostics, path) {
    const state = fieldState(field, rng);
    if (field.valueType === 'stateful-reference') {
      if (state !== 'present') return { state };
      return { state:'present', value:chooseTable(pack,field.tableId,rng,diagnostics,path,`Unresolved ${field.label || field.id}`) };
    }
    if (state !== 'present') return state === 'unknown' ? 'Unknown' : null;
    if (field.valueType === 'string-list') {
      const entries = tableEntries(pack, field.tableId);
      if (!entries.length) {
        diagnostics.push(diagnostic('GENERATOR_TABLE_EMPTY','warning',`Table ${field.tableId} is missing or empty.`,path,{tableId:field.tableId}));
        return [];
      }
      const count = Math.min(entries.length, Math.max(1, Number(field.count || 1)));
      return rng.shuffle(entries).slice(0,count).map(entry => clone(isObject(entry) && 'value' in entry ? entry.value : entry));
    }
    if (field.valueType === 'integer' || field.valueType === 'number') return Number(chooseTable(pack,field.tableId,rng,diagnostics,path,0));
    if (field.valueType === 'boolean') return tableEntries(pack,field.tableId).length ? Boolean(chooseTable(pack,field.tableId,rng,diagnostics,path,false)) : rng.bool();
    if (field.valueType === 'object') return chooseTable(pack,field.tableId,rng,diagnostics,path,{});
    return chooseTable(pack,field.tableId,rng,diagnostics,path,`Unresolved ${field.label || field.id}`);
  }

  function generateFields(fields, pack, rng, diagnostics, basePath) {
    const data = {};
    for (const field of fields || []) data[field.id] = generateField(field,pack,rng.fork(`field:${field.id}`),diagnostics,`${basePath}/${field.id}`);
    return data;
  }

  const camelToKebab = value => String(value || '').replace(/([a-z0-9])([A-Z])/g,'$1-$2').toLowerCase();

  function specializedSectionFor(archetype, sectionId, policy) {
    if (policy?.substituteSection) return (archetype.specializedSections || []).find(section => section.id === policy.substituteSection);
    if (sectionId === 'workContext' && (archetype.specializedSections || []).length === 1) return archetype.specializedSections[0];
    return null;
  }

  function sectionRng(rootRng, sectionId, counters) {
    return rootRng.fork(`section:${sectionId}`,`reroll:${Number(counters?.[sectionId] || 0)}`);
  }

  function generateIdentity(pack, rootRng, diagnostics, options, counters) {
    const rng = sectionRng(rootRng,'identity',counters);
    const selected = options?.identity || {};
    const givenName = selected.givenName ?? chooseTable(pack,'givenNames',rng.fork('givenName'),diagnostics,'/identity/givenName','Unnamed');
    const familyName = selected.familyName ?? chooseTable(pack,'familyNames',rng.fork('familyName'),diagnostics,'/identity/familyName',null);
    const ancestryId = selected.ancestryId ?? chooseTable(pack,'ancestries',rng.fork('ancestry'),diagnostics,'/identity/ancestryId','unknown-ancestry');
    const pronouns = selected.pronouns ?? chooseTable(pack,'pronouns',rng.fork('pronouns'),diagnostics,'/identity/pronouns','they/them');
    const ageBand = selected.ageBand ?? chooseTable(pack,'ageBands',rng.fork('ageBand'),diagnostics,'/identity/ageBand','adult');
    const language = selected.language ?? chooseTable(pack,'languages',rng.fork('language'),diagnostics,'/identity/languages','Common');
    const range = pack?.ageRanges?.[ageBand] || [18,65];
    const age = selected.age ?? rng.fork('age').int(Number(range[0]),Number(range[1]));
    return {
      fullName:selected.fullName ?? [givenName,familyName].filter(Boolean).join(' '),
      givenName,familyName,aliases:clone(selected.aliases || []),titles:clone(selected.titles || []),
      pronouns,gender:selected.gender ?? null,age,ageBand,ancestryId,
      cultureId:selected.cultureId ?? null,homeland:selected.homeland ?? null,
      currentLocation:selected.currentLocation ?? null,languages:clone(selected.languages || [language])
    };
  }

  globalThis.NpcProfileGeneratorFoundation = Object.freeze({
    CANONICAL_SECTIONS:Object.freeze(CANONICAL_SECTIONS),isObject,clone,diagnostic,
    decodePointer,pointerGet,pointerSet,tableEntries,chooseTable,generatedProfileId,
    generateField,generateFields,camelToKebab,specializedSectionFor,sectionRng,generateIdentity
  });
})();
