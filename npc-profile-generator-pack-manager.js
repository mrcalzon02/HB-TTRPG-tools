(() => {
  'use strict';
  const Validator=globalThis.NpcProfileGeneratorPackValidator;
  if(!Validator)throw new Error('Custom pack validator must load before pack manager.');
  const clone=Validator.clone;

  function stableKey(value){
    if(value===null||typeof value!=='object')return JSON.stringify(value);
    if(Array.isArray(value))return`[${value.map(stableKey).join(',')}]`;
    return`{${Object.keys(value).sort().map(key=>`${JSON.stringify(key)}:${stableKey(value[key])}`).join(',')}}`;
  }
  function appendUnique(target,entries){
    const output=target||[];const seen=new Set(output.map(stableKey));
    for(const entry of entries||[]){const key=stableKey(entry);if(!seen.has(key)){seen.add(key);output.push(clone(entry));}}
    return output;
  }
  function normalizedBasePack(pack){
    const output=clone(pack||{});
    output.tables=output.tables||{};
    output.sectionFields=output.sectionFields||{};
    output.ageRanges=output.ageRanges||{};
    output.ancestryRules=output.ancestryRules||{};
    output.operationModules=output.operationModules||{};
    output.mechanicalPackages=output.mechanicalPackages||{};
    output.mechanicalLevelGuidance=output.mechanicalLevelGuidance||{};
    output.customPacks=Array.isArray(output.customPacks)?output.customPacks:[];
    return output;
  }

  function applyValidatedPack(basePack,baseArchetypes,customPack){
    const pack=normalizedBasePack(basePack);
    const archetypes=clone(baseArchetypes||[]);
    for(const[name,entries]of Object.entries(customPack.names||{}))pack.tables[name]=appendUnique([...(pack.tables[name]||[])],entries);
    for(const[id,entries]of Object.entries(customPack.tables||{}))pack.tables[id]=clone(entries);
    for(const[id,entries]of Object.entries(customPack.tableExtensions||{}))pack.tables[id]=appendUnique([...(pack.tables[id]||[])],entries);
    pack.tables.ancestries=pack.tables.ancestries||[];
    for(const ancestry of customPack.ancestries||[]){
      pack.tables.ancestries=appendUnique(pack.tables.ancestries,[ancestry.id]);
      pack.ageRanges[ancestry.id]=clone(ancestry.ageRanges);
      pack.ancestryRules[ancestry.id]={id:ancestry.id,...clone(ancestry.householdRule)};
      pack.customAncestries=pack.customAncestries||{};
      pack.customAncestries[ancestry.id]={id:ancestry.id,label:ancestry.label,sourcePackId:customPack.packId};
    }
    archetypes.push(...clone(customPack.archetypes||[]));
    Object.assign(pack.operationModules,clone(customPack.operationModules||{}));
    Object.assign(pack.mechanicalPackages,clone(customPack.mechanicalPackages||{}));
    Object.assign(pack.mechanicalLevelGuidance,clone(customPack.levelGuidance||{}));
    pack.customPacks.push({packId:customPack.packId,version:customPack.version,title:customPack.title});
    pack.activeCustomPackIds=pack.customPacks.map(item=>item.packId);
    return{pack,archetypes};
  }

  function applyCustomPack(basePack,baseArchetypes,input,options={}){
    const validation=Validator.validateCustomPack(input,{
      basePack,
      baseArchetypes,
      installedPacks:options.installedPacks||[],
      generatorVersion:options.generatorVersion||Validator.GENERATOR_VERSION,
      profileSchemaVersion:options.profileSchemaVersion||Validator.PROFILE_SCHEMA_VERSION
    });
    if(!validation.valid)return{valid:false,pack:clone(basePack),archetypes:clone(baseArchetypes||[]),diagnostics:validation.diagnostics,appliedPack:null};
    const merged=applyValidatedPack(basePack,baseArchetypes,validation.pack);
    return{valid:true,...merged,diagnostics:validation.diagnostics,appliedPack:clone(validation.pack)};
  }

  function rebuild(basePack,baseArchetypes,customPacks,options={}){
    let pack=normalizedBasePack(basePack);
    let archetypes=clone(baseArchetypes||[]);
    const diagnostics=[];const applied=[];
    for(const customPack of customPacks||[]){
      const result=applyCustomPack(pack,archetypes,customPack,{...options,installedPacks:applied});
      diagnostics.push(...result.diagnostics.map(item=>({...item,packId:customPack.packId})));
      if(!result.valid)return{valid:false,pack:clone(basePack),archetypes:clone(baseArchetypes||[]),diagnostics,appliedPacks:[]};
      pack=result.pack;archetypes=result.archetypes;applied.push({packId:customPack.packId,version:customPack.version,title:customPack.title});
    }
    return{valid:true,pack,archetypes,diagnostics,appliedPacks:applied};
  }

  globalThis.NpcProfileGeneratorPackManager=Object.freeze({clone,stableKey,appendUnique,normalizedBasePack,applyValidatedPack,applyCustomPack,rebuild});
})();
