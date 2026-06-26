(() => {
  'use strict';
  const Random=globalThis.NpcProfileRandom;
  const F=globalThis.NpcProfileGeneratorFoundation;
  const H=globalThis.NpcProfileHouseholdCore;
  const Household=globalThis.NpcProfileHouseholdRecords;
  const Relationships=globalThis.NpcProfileRelationshipRecords;
  const Assembly=globalThis.NpcProfileGeneratorAssembly;
  if(!Random||!F||!H||!Household||!Relationships||!Assembly)throw new Error('Household generation modules must load first.');
  const VERSION='0.1.0';

  function collectNames(value,output=[]){
    if(Array.isArray(value))value.forEach(entry=>collectNames(entry,output));
    else if(value&&typeof value==='object'){
      if(typeof value.name==='string')output.push(value.name);
      Object.values(value).forEach(entry=>collectNames(entry,output));
    }
    return output;
  }
  function counterChanged(counters,previousCounters,id){
    return Number(counters?.[id]||0)!==Number(previousCounters?.[id]||0);
  }

  function enrich(result,config={}){
    if(!result?.profile)return result;
    const profile=result.profile;
    const pack=config.pack||{};
    const depth=F.normalizeDepth(config.mode||profile.generator?.mode||'standard');
    const ancestryId=profile.identity?.ancestryId||'human';
    const rule=H.ruleFor(pack,ancestryId);
    const counters=config.rerollCounters||profile.generator?.rerollCounters||{};
    const previous=config.previousProfile;
    const previousCounters=previous?.generator?.rerollCounters||{};
    const familyChanged=Boolean(previous)&&counterChanged(counters,previousCounters,'familyHousehold');
    const relationshipsChanged=Boolean(previous)&&counterChanged(counters,previousCounters,'affiliationsRelationships');
    const familyOnly=familyChanged&&!relationshipsChanged;
    const relationshipsOnly=relationshipsChanged&&!familyChanged;
    const root=Random.create(Random.deriveSeed(profile.generator?.seed||config.seed||'npc','household',VERSION,profile.archetype?.id||'unknown'));
    const identityRng=root.fork('identity',`reroll:${Number(counters.identity||0)}`);
    const ranges=H.rangesFor(rule);
    const requested=profile.identity?.ageBand||'adult';
    const exactAge=config.options?.identity?.age;
    if(exactAge===undefined||exactAge===null){
      const[minimum,maximum]=ranges[requested]||ranges.adult;
      if(profile.identity.age<minimum||profile.identity.age>maximum)profile.identity.age=identityRng.fork('age').int(minimum,maximum);
    }
    const age=Math.max(0,Number(profile.identity.age||0));
    const lifeStage=H.stageForAge(age,rule);
    profile.identity.age=age;
    profile.identity.ageBand=lifeStage;
    const common={pack,depth,ancestryId,rule,belowAdult:age<Number(rule.adultThreshold||18),age,lifeStage};

    if(relationshipsOnly&&previous?.sections?.familyHousehold)profile.sections.familyHousehold=F.clone(previous.sections.familyHousehold);
    else{
      const familyReserved=new Set([profile.identity.fullName]);
      if(familyOnly)for(const name of collectNames(previous?.sections?.affiliationsRelationships))familyReserved.add(name);
      Household.enrich(profile,{...common,reserved:familyReserved,rng:root.fork('familyHousehold',`reroll:${Number(counters.familyHousehold||0)}`)});
    }

    if(familyOnly&&previous?.sections?.affiliationsRelationships)profile.sections.affiliationsRelationships=F.clone(previous.sections.affiliationsRelationships);
    else{
      const relationshipReserved=new Set([profile.identity.fullName,...collectNames(profile.sections?.familyHousehold)]);
      Relationships.enrich(profile,{...common,reserved:relationshipReserved,rng:root.fork('affiliationsRelationships',`reroll:${Number(counters.affiliationsRelationships||0)}`)});
    }

    Assembly.applyLocks(profile,config.previousProfile,config.locks||[],result.diagnostics);
    profile.diagnostics=F.clone(result.diagnostics);
    profile.generator.householdGeneratorVersion=VERSION;
    result.receipt=F.clone(profile.generator);
    return result;
  }

  globalThis.NpcProfileGeneratorHousehold=Object.freeze({VERSION,collectNames,counterChanged,enrich});
})();
