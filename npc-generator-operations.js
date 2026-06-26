(() => {
  'use strict';
  const Random=globalThis.NpcProfileRandom;
  const F=globalThis.NpcProfileGeneratorFoundation;
  const Assembly=globalThis.NpcProfileGeneratorAssembly;
  if(!Random||!F||!Assembly)throw new Error('NPC random, foundation, and assembly modules must load before operations.');
  const VERSION='0.1.0';

  function existingExtension(profile){
    const entries=Object.entries(profile.sections?.extensions||{});
    return entries.length===1?{id:entries[0][0],envelope:entries[0][1]}:null;
  }

  function targetFor(profile,module){
    if(module.targetKind==='canonical-work'){
      const envelope=profile.sections?.workContext;
      return envelope?.state==='present'?{id:'workContext',pointer:'/sections/workContext',envelope}:null;
    }
    if(module.targetKind==='existing-extension'){
      const target=existingExtension(profile);
      return target?{...target,pointer:`/sections/extensions/${target.id}`}:null;
    }
    if(module.targetKind==='new-extension'){
      const id=module.extensionId||`${profile.archetype.id}Operation`;
      profile.sections.extensions=profile.sections.extensions||{};
      profile.sections.extensions[id]=profile.sections.extensions[id]||{state:'present',data:{}};
      return{id,pointer:`/sections/extensions/${id}`,envelope:profile.sections.extensions[id]};
    }
    return null;
  }

  function enrich(result,config={}){
    if(!result?.profile)return result;
    const profile=result.profile;
    const pack=config.pack||{};
    const module=pack.operationModules?.[profile.archetype?.id];
    if(!module)return result;
    const depth=F.normalizeDepth(config.mode||profile.generator?.mode||'standard');
    if(depth==='quick')return result;
    const target=targetFor(profile,module);
    if(!target){
      result.diagnostics.push(F.diagnostic('GENERATOR_OPERATION_TARGET_MISSING','error',`No operation target is available for ${profile.archetype.id}.`,'/sections',{archetypeId:profile.archetype.id,targetKind:module.targetKind}));
      profile.diagnostics=F.clone(result.diagnostics);
      result.valid=false;
      return result;
    }
    const counters=config.rerollCounters||profile.generator?.rerollCounters||{};
    const rerollKey=target.id==='workContext'?'workContext':`extension:${target.id}`;
    const rng=Random.create(Random.deriveSeed(profile.generator?.seed||config.seed||'npc','operation',VERSION,profile.archetype.id,target.id,`reroll:${Number(counters[rerollKey]||0)}`));
    target.envelope.state='present';
    target.envelope.data=target.envelope.data||{};
    const generated=F.generateFields(module.fields,pack,rng,result.diagnostics,`${target.pointer}/data`,depth);
    Object.assign(target.envelope.data,generated);
    target.envelope.operationModule={id:profile.archetype.id,label:module.label||profile.archetype.label,version:VERSION};
    for(const field of module.fields||[]){
      if(!F.fieldIncluded(field,depth)||field.policy!=='required')continue;
      const value=target.envelope.data[field.id];
      const empty=value===undefined||value===null||value===''||(Array.isArray(value)&&!value.length);
      if(empty)result.diagnostics.push(F.diagnostic('GENERATOR_OPERATION_FIELD_EMPTY','error',`Required operational field ${field.id} is empty.`,`${target.pointer}/data/${field.id}`,{archetypeId:profile.archetype.id}));
    }
    Assembly.applyLocks(profile,config.previousProfile,config.locks||[],result.diagnostics);
    profile.generator.operationGeneratorVersion=VERSION;
    profile.diagnostics=F.clone(result.diagnostics);
    result.receipt=F.clone(profile.generator);
    result.valid=!result.diagnostics.some(item=>item.severity==='error');
    return result;
  }

  globalThis.NpcProfileGeneratorOperations=Object.freeze({VERSION,existingExtension,targetFor,enrich});
})();
