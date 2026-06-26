(() => {
  'use strict';
  const Random = globalThis.NpcProfileRandom;
  const Rules = globalThis.NpcProfileRules;
  const F = globalThis.NpcProfileGeneratorFoundation;
  if (!Random || !Rules || !F) throw new Error('NPC random, rules, and foundation modules must load first.');
  const GENERATOR_ID = 'universal-npc-profile-generator';
  const VERSION = '0.1.0';

  function generateExtension(id, archetype, pack, rootRng, diagnostics, counters, mode) {
    const definition = (archetype.specializedSections || []).find(section => section.id === id);
    if (!definition) {
      diagnostics.push(F.diagnostic('GENERATOR_SPECIALIZED_SECTION_MISSING','error',`Specialized section ${id} is not declared.`,`/sections/extensions/${id}`));
      return { id, envelope:{state:'unknown',reason:'Missing specialized-section definition.'} };
    }
    const rng = F.sectionRng(rootRng,`extension:${id}`,counters);
    return { id, envelope:{state:'present',data:F.generateFields(definition.fields,pack,rng,diagnostics,`/sections/extensions/${id}/data`,mode)} };
  }

  function generateSection(id, archetype, applicability, pack, rootRng, diagnostics, counters, mode) {
    const resolution = applicability.sections[id] || {state:'present',policy:'optional'};
    const policy = archetype.sectionPolicies?.[id] || {policy:'optional'};
    if (resolution.state !== 'present') {
      return {
        envelope:{
          state:resolution.state,
          ...(resolution.reason ? {reason:resolution.reason} : {}),
          ...(resolution.substituteSection ? {substituteSection:resolution.substituteSection} : {})
        },
        extension:resolution.substituteSection ? generateExtension(resolution.substituteSection,archetype,pack,rootRng,diagnostics,counters,mode) : null
      };
    }
    const specialized = F.specializedSectionFor(archetype,id,policy);
    const fields = specialized?.fields || pack?.sectionFields?.[id] || [];
    const data = F.generateFields(fields,pack,F.sectionRng(rootRng,id,counters),diagnostics,`/sections/${id}/data`,mode);
    if (specialized) data.kind = F.camelToKebab(specialized.id);
    if (resolution.derived) data.derived = true;
    return { envelope:{state:'present',data}, extension:null };
  }

  function applyLocks(generated, previous, locks, diagnostics) {
    if (!previous || !Array.isArray(locks)) return generated;
    for (const pointer of locks) {
      try {
        const value = F.pointerGet(previous,pointer);
        if (value === undefined) {
          diagnostics.push(F.diagnostic('GENERATOR_LOCK_SOURCE_MISSING','warning',`Locked path ${pointer} is absent.`,pointer));
          continue;
        }
        F.pointerSet(generated,pointer,value);
      } catch (error) {
        diagnostics.push(F.diagnostic('GENERATOR_LOCK_PATH_INVALID','error',error.message,'/locks',{pointer}));
      }
    }
    return generated;
  }

  function provenanceFor(previous,packId,archetypeId,override) {
    if (override) return F.clone(override);
    if (!previous?.provenance) return {createdBy:'generator',sourcePackIds:[packId],sourceEntryIds:[archetypeId],migratedFromSchema:null,notes:[]};
    const prior=F.clone(previous.provenance);
    return {
      createdBy:'user',
      sourcePackIds:[...new Set([...(prior.sourcePackIds||[]),packId])],
      sourceEntryIds:[...new Set([...(prior.sourceEntryIds||[]),archetypeId])],
      migratedFromSchema:prior.migratedFromSchema??null,
      notes:F.clone(prior.notes||[])
    };
  }

  function generateProfile(config = {}) {
    const diagnostics = [];
    const seed = Random.normalizeSeed(config.seed);
    const pack = config.pack || {};
    const mode = F.normalizeDepth(config.mode || 'standard');
    const resolved = config.archetype?.inheritanceChain
      ? {archetype:config.archetype,diagnostics:[]}
      : Rules.resolveArchetype(config.archetypeId,config.archetypes || []);
    diagnostics.push(...(resolved.diagnostics || []));
    const archetype = resolved.archetype;
    if (!archetype) return {profile:null,diagnostics:[...diagnostics,F.diagnostic('GENERATOR_ARCHETYPE_UNAVAILABLE','error','A resolved archetype is required.','/archetype')],valid:false};

    const counters = F.clone(config.rerollCounters || {});
    const packId=pack.packId || 'unknown-pack';
    const rootRng = Random.create(Random.deriveSeed(seed,VERSION,packId,pack.version || '0.0.0',archetype.id));
    const applicability = Rules.resolveApplicability(archetype,{
      rollForSection:id => F.sectionRng(rootRng,`applicability:${id}`,counters).int(0,99),
      explicitStates:config.explicitStates || {},
      optionalStates:config.optionalStates || {}
    });
    diagnostics.push(...applicability.diagnostics);

    const sections = {}, extensions = {};
    for (const id of F.CANONICAL_SECTIONS) {
      const result = generateSection(id,archetype,applicability,pack,rootRng,diagnostics,counters,mode);
      sections[id] = result.envelope;
      if (result.extension) extensions[result.extension.id] = result.extension.envelope;
    }
    if (Object.keys(extensions).length) sections.extensions = extensions;
    const timestamp = config.timestamp || '1970-01-01T00:00:00.000Z';
    const profile = {
      profileType:'npcProfile',schemaVersion:'1.0.0',
      profileId:config.profileId || config.previousProfile?.profileId || F.generatedProfileId(seed,packId,archetype.id),
      revision:Number(config.revision || config.previousProfile?.revision || 1),
      createdAt:config.previousProfile?.createdAt || timestamp,updatedAt:timestamp,
      generator:{generatorId:GENERATOR_ID,generatorVersion:VERSION,packId,packVersion:pack.version || '0.0.0',seed,mode,rerollCounters:counters},
      archetype:{id:archetype.id,label:archetype.label,parentId:archetype.parentId || null,subtypeId:null,tags:F.clone(archetype.tags || [])},
      identity:F.generateIdentity(pack,rootRng,diagnostics,config.options || {},counters,mode),
      sections,locks:F.clone(config.locks || []),diagnostics:[],
      provenance:provenanceFor(config.previousProfile,packId,archetype.id,config.provenance)
    };

    applyLocks(profile,config.previousProfile,config.locks || [],diagnostics);
    diagnostics.push(...Rules.validateProfileAgainstArchetype(profile,archetype).diagnostics);
    profile.diagnostics = F.clone(diagnostics);
    return {profile,diagnostics,valid:!diagnostics.some(item => item.severity === 'error'),receipt:F.clone(profile.generator)};
  }

  globalThis.NpcProfileGeneratorAssembly = Object.freeze({GENERATOR_ID,VERSION,generateExtension,generateSection,applyLocks,provenanceFor,generateProfile});
})();
