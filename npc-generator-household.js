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

  function enrich(result,config={}){
    if(!result?.profile)return result;
    const profile=result.profile;
    const pack=config.pack||{};
    const depth=F.normalizeDepth(config.mode||profile.generator?.mode||'standard');
    const ancestryId=profile.identity?.ancestryId||'human';
    const rule=H.ruleFor(pack,ancestryId);
    const counters=config.rerollCounters||profile.generator?.rerollCounters||{};
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
    const common={pack,depth,ancestryId,rule,reserved:new Set([profile.identity.fullName]),belowAdult:age<Number(rule.adultThreshold||18),age,lifeStage};
    Household.enrich(profile,{...common,rng:root.fork('familyHousehold',`reroll:${Number(counters.familyHousehold||0)}`)});
    Relationships.enrich(profile,{...common,rng:root.fork('affiliationsRelationships',`reroll:${Number(counters.affiliationsRelationships||0)}`)});
    Assembly.applyLocks(profile,config.previousProfile,config.locks||[],result.diagnostics);
    profile.diagnostics=F.clone(result.diagnostics);
    profile.generator.householdGeneratorVersion=VERSION;
    result.receipt=F.clone(profile.generator);
    return result;
  }

  globalThis.NpcProfileGeneratorHousehold=Object.freeze({VERSION,enrich});
})();
