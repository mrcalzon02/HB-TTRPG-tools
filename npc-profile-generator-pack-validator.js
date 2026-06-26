(() => {
  'use strict';
  const GENERATOR_VERSION='0.1.0';
  const PROFILE_SCHEMA_VERSION='1.0.0';
  const RESERVED_PREFIXES=Object.freeze(['core-','system-']);
  const ID_PATTERN=/^[a-z0-9][a-z0-9-]{2,63}$/;
  const VERSION_PATTERN=/^\d+\.\d+\.\d+$/;
  const object=value=>Boolean(value)&&typeof value==='object'&&!Array.isArray(value);
  const clone=value=>value===undefined?undefined:JSON.parse(JSON.stringify(value));
  const diagnostic=(code,severity,message,path='/',extra={})=>({code,severity,message,path,...extra});
  const major=value=>Number(String(value||'').split('.')[0]);
  const versionParts=value=>VERSION_PATTERN.test(String(value||''))?String(value).split('.').map(Number):null;
  function compareVersions(left,right){const a=versionParts(left),b=versionParts(right);if(!a||!b)return null;for(let i=0;i<3;i+=1){if(a[i]!==b[i])return a[i]-b[i];}return 0;}
  function reserved(id){return RESERVED_PREFIXES.some(prefix=>String(id||'').startsWith(prefix));}
  function uniqueValues(entries){const seen=new Set();const output=[];for(const entry of entries||[]){const key=JSON.stringify(entry);if(!seen.has(key)){seen.add(key);output.push(entry);}}return output;}

  function normalized(pack){
    const source=clone(pack||{});
    return{
      ...source,
      dependencies:Array.isArray(source.dependencies)?source.dependencies:[],
      names:object(source.names)?source.names:{},
      ancestries:Array.isArray(source.ancestries)?source.ancestries:[],
      tables:object(source.tables)?source.tables:{},
      tableExtensions:object(source.tableExtensions)?source.tableExtensions:{},
      archetypes:Array.isArray(source.archetypes)?source.archetypes:[],
      operationModules:object(source.operationModules)?source.operationModules:{},
      mechanicalPackages:object(source.mechanicalPackages)?source.mechanicalPackages:{},
      levelGuidance:object(source.levelGuidance)?source.levelGuidance:{},
      notes:Array.isArray(source.notes)?source.notes:[]
    };
  }

  function validateBasic(pack,context,diagnostics){
    if(!object(pack)){diagnostics.push(diagnostic('CUSTOM_PACK_NOT_OBJECT','error','Custom pack must be a JSON object.'));return;}
    if(pack.packType!=='npcCustomPack')diagnostics.push(diagnostic('CUSTOM_PACK_TYPE','error','packType must be npcCustomPack.','/packType'));
    for(const field of['schemaVersion','packId','version','title','description','compatibility'])if(pack[field]===undefined||pack[field]===null||pack[field]==='')diagnostics.push(diagnostic('CUSTOM_PACK_REQUIRED_FIELD','error',`${field} is required.`,`/${field}`));
    if(!VERSION_PATTERN.test(pack.schemaVersion||''))diagnostics.push(diagnostic('CUSTOM_PACK_SCHEMA_VERSION','error','schemaVersion must use semantic versioning.','/schemaVersion'));
    if(!VERSION_PATTERN.test(pack.version||''))diagnostics.push(diagnostic('CUSTOM_PACK_VERSION','error','version must use semantic versioning.','/version'));
    if(!ID_PATTERN.test(pack.packId||''))diagnostics.push(diagnostic('CUSTOM_PACK_ID','error','packId is invalid.','/packId'));
    if(pack.packId===context.basePack?.packId||reserved(pack.packId))diagnostics.push(diagnostic('CUSTOM_PACK_PROTECTED_ID','error',`Pack ID ${pack.packId} is protected.`, '/packId'));
    if(!object(pack.compatibility)){diagnostics.push(diagnostic('CUSTOM_PACK_COMPATIBILITY','error','compatibility must be an object.','/compatibility'));return;}
    const compatibility=pack.compatibility;
    if(compareVersions(compatibility.generatorMinVersion,context.generatorVersion||GENERATOR_VERSION)>0)diagnostics.push(diagnostic('CUSTOM_PACK_GENERATOR_TOO_OLD','error',`Generator ${context.generatorVersion||GENERATOR_VERSION} is below required ${compatibility.generatorMinVersion}.`,'/compatibility/generatorMinVersion'));
    if(Number(compatibility.generatorMaxMajor)<major(context.generatorVersion||GENERATOR_VERSION))diagnostics.push(diagnostic('CUSTOM_PACK_GENERATOR_TOO_NEW','error','Custom pack does not support this generator major version.','/compatibility/generatorMaxMajor'));
    if(major(compatibility.profileSchemaVersion)!==major(context.profileSchemaVersion||PROFILE_SCHEMA_VERSION))diagnostics.push(diagnostic('CUSTOM_PACK_PROFILE_SCHEMA','error',`Profile schema ${compatibility.profileSchemaVersion} is incompatible.`,'/compatibility/profileSchemaVersion'));
    if(compatibility.basePackId!==context.basePack?.packId)diagnostics.push(diagnostic('CUSTOM_PACK_BASE_MISMATCH','error',`Custom pack expects ${compatibility.basePackId}, not ${context.basePack?.packId}.`,'/compatibility/basePackId'));
    const installed=new Map([[context.basePack?.packId,context.basePack?.version],...(context.installedPacks||[]).map(item=>[item.packId,item.version])]);
    for(const dependency of pack.dependencies||[]){
      const available=installed.get(dependency.packId);
      if(!available&&!dependency.optional)diagnostics.push(diagnostic('CUSTOM_PACK_DEPENDENCY_MISSING','error',`Required pack ${dependency.packId} is not installed.`,'/dependencies'));
      else if(available&&compareVersions(available,dependency.minimumVersion)<0)diagnostics.push(diagnostic('CUSTOM_PACK_DEPENDENCY_VERSION','error',`${dependency.packId} ${available} is below ${dependency.minimumVersion}.`,'/dependencies'));
    }
  }

  function validateTables(pack,context,diagnostics){
    const baseTables=context.basePack?.tables||{};
    const futureIds=new Set([...Object.keys(baseTables),...Object.keys(pack.tables||{})]);
    for(const[name,entries]of Object.entries(pack.names||{})){
      if(!['givenNames','familyNames','pronouns','languages'].includes(name))diagnostics.push(diagnostic('CUSTOM_PACK_NAME_GROUP','error',`Unknown name group ${name}.`,`/names/${name}`));
      if(!Array.isArray(entries)||!entries.length||entries.some(value=>typeof value!=='string'||!value.trim()))diagnostics.push(diagnostic('CUSTOM_PACK_NAME_VALUES','error',`${name} must contain non-empty strings.`,`/names/${name}`));
    }
    for(const[id,entries]of Object.entries(pack.tables||{})){
      if(!ID_PATTERN.test(id)||reserved(id))diagnostics.push(diagnostic('CUSTOM_PACK_TABLE_ID','error',`Table ID ${id} is invalid or reserved.`,`/tables/${id}`));
      if(Object.prototype.hasOwnProperty.call(baseTables,id))diagnostics.push(diagnostic('CUSTOM_PACK_TABLE_OVERRIDE','error',`Table ${id} already exists; use tableExtensions.`,`/tables/${id}`));
      if(!Array.isArray(entries)||!entries.length)diagnostics.push(diagnostic('CUSTOM_PACK_TABLE_EMPTY','error',`Table ${id} must contain entries.`,`/tables/${id}`));
    }
    for(const[id,entries]of Object.entries(pack.tableExtensions||{})){
      if(!Object.prototype.hasOwnProperty.call(baseTables,id)&&!Object.prototype.hasOwnProperty.call(pack.tables||{},id))diagnostics.push(diagnostic('CUSTOM_PACK_EXTENSION_TARGET','error',`Table extension ${id} has no target.`,`/tableExtensions/${id}`));
      if(!Array.isArray(entries)||!entries.length)diagnostics.push(diagnostic('CUSTOM_PACK_EXTENSION_EMPTY','error',`Table extension ${id} must contain entries.`,`/tableExtensions/${id}`));
    }
    return futureIds;
  }

  function validateAncestries(pack,context,diagnostics){
    const existing=new Set(context.basePack?.tables?.ancestries||[]);
    const seen=new Set();
    for(const ancestry of pack.ancestries||[]){
      const path=`/ancestries/${seen.size}`;
      if(!object(ancestry)||!ID_PATTERN.test(ancestry.id||'')||reserved(ancestry.id))diagnostics.push(diagnostic('CUSTOM_PACK_ANCESTRY_ID','error','Ancestry ID is invalid or reserved.',`${path}/id`));
      if(existing.has(ancestry.id)||seen.has(ancestry.id))diagnostics.push(diagnostic('CUSTOM_PACK_ANCESTRY_DUPLICATE','error',`Ancestry ${ancestry.id} already exists.`,`${path}/id`));
      seen.add(ancestry.id);
      const ranges=ancestry.ageRanges||{};let previous=-1;
      for(const band of['child','adolescent','adult','middle-aged','elderly']){
        const range=ranges[band];
        if(!Array.isArray(range)||range.length!==2||!range.every(Number.isInteger)||range[0]<0||range[1]<range[0]||range[0]<=previous)diagnostics.push(diagnostic('CUSTOM_PACK_AGE_RANGE','error',`${ancestry.id}.${band} age range is invalid.`,`${path}/ageRanges/${band}`));
        else previous=range[1];
      }
      const rule=ancestry.householdRule||{};
      if(rule.adultThreshold!==ranges.adult?.[0]||rule.elderThreshold!==ranges.elderly?.[0]||rule.maxAge!==ranges.elderly?.[1])diagnostics.push(diagnostic('CUSTOM_PACK_ANCESTRY_RULE_MISMATCH','error',`${ancestry.id} household thresholds disagree with age ranges.`,`${path}/householdRule`));
      if(!(rule.parentGapMin>0&&rule.parentGapMax>=rule.parentGapMin&&rule.siblingSpread>=0&&rule.partnerSpread>=0))diagnostics.push(diagnostic('CUSTOM_PACK_ANCESTRY_RULE','error',`${ancestry.id} household rule is invalid.`,`${path}/householdRule`));
    }
    return seen;
  }

  function fieldReferences(fields,tableIds,diagnostics,path){
    for(const[fieldIndex,field]of(fields||[]).entries()){
      const at=`${path}/${fieldIndex}`;
      if(!object(field)||!field.id||!field.label||!field.valueType||!field.policy)diagnostics.push(diagnostic('CUSTOM_PACK_FIELD_SHAPE','error','Field definition is incomplete.',at));
      if(field.tableId&&!tableIds.has(field.tableId))diagnostics.push(diagnostic('CUSTOM_PACK_TABLE_REFERENCE','error',`Field references missing table ${field.tableId}.`,`${at}/tableId`));
      if(field.policy==='weighted-none'&&!Number.isInteger(field.noneWeight))diagnostics.push(diagnostic('CUSTOM_PACK_FIELD_WEIGHT','error',`${field.id} requires noneWeight.`,`${at}/noneWeight`));
    }
  }

  function validateArchetypes(pack,context,tableIds,diagnostics){
    const base=context.baseArchetypes||[];
    const baseIds=new Set(base.map(item=>item.id));
    const customIds=new Set();
    for(const[index,archetype]of(pack.archetypes||[]).entries()){
      const path=`/archetypes/${index}`;
      if(!object(archetype)||!ID_PATTERN.test(archetype.id||'')||reserved(archetype.id))diagnostics.push(diagnostic('CUSTOM_PACK_ARCHETYPE_ID','error','Archetype ID is invalid or reserved.',`${path}/id`));
      if(baseIds.has(archetype.id)||customIds.has(archetype.id))diagnostics.push(diagnostic('CUSTOM_PACK_ARCHETYPE_OVERRIDE','error',`Archetype ${archetype.id} already exists.`,`${path}/id`));
      customIds.add(archetype.id);
      if(!archetype.label||!archetype.description||!object(archetype.sectionPolicies)||!Array.isArray(archetype.specializedSections)||!Array.isArray(archetype.validationRules))diagnostics.push(diagnostic('CUSTOM_PACK_ARCHETYPE_SHAPE','error',`${archetype.id||'Archetype'} is incomplete.`,path));
      for(const[sectionIndex,section]of(archetype.specializedSections||[]).entries())fieldReferences(section.fields,tableIds,diagnostics,`${path}/specializedSections/${sectionIndex}/fields`);
      for(const[sectionId,policy]of Object.entries(archetype.sectionPolicies||{}))if(policy?.policy==='substitute'&&!(archetype.specializedSections||[]).some(section=>section.id===policy.substituteSection))diagnostics.push(diagnostic('CUSTOM_PACK_SUBSTITUTE_REFERENCE','error',`${sectionId} substitutes missing section ${policy.substituteSection}.`,`${path}/sectionPolicies/${sectionId}`));
    }
    const allIds=new Set([...baseIds,...customIds]);
    for(const[index,archetype]of(pack.archetypes||[]).entries())if(archetype.parentId&&!allIds.has(archetype.parentId))diagnostics.push(diagnostic('CUSTOM_PACK_PARENT_MISSING','error',`${archetype.id} parent ${archetype.parentId} is missing.`,`/archetypes/${index}/parentId`));
    if(globalThis.NpcProfileRules){
      const combined=[...base,...pack.archetypes];
      for(const archetype of pack.archetypes||[]){const resolved=globalThis.NpcProfileRules.resolveArchetype(archetype.id,combined);diagnostics.push(...resolved.diagnostics.map(item=>({...item,code:`CUSTOM_${item.code}`})));}
    }
    return customIds;
  }

  function validateModules(pack,context,customIds,tableIds,diagnostics){
    for(const[id,module]of Object.entries(pack.operationModules||{})){
      if(!customIds.has(id))diagnostics.push(diagnostic('CUSTOM_PACK_OPERATION_TARGET','error',`Operation module ${id} must target an archetype in this pack.`,`/operationModules/${id}`));
      if(!['canonical-work','existing-extension','new-extension'].includes(module.targetKind))diagnostics.push(diagnostic('CUSTOM_PACK_OPERATION_KIND','error',`Operation module ${id} has an invalid targetKind.`,`/operationModules/${id}/targetKind`));
      if(module.targetKind==='new-extension'&&!module.extensionId)diagnostics.push(diagnostic('CUSTOM_PACK_OPERATION_EXTENSION','error',`Operation module ${id} requires extensionId.`,`/operationModules/${id}/extensionId`));
      fieldReferences(module.fields,tableIds,diagnostics,`/operationModules/${id}/fields`);
    }
    const mechanics=context.basePack?.mechanicsCore||{};
    for(const[id,pkg]of Object.entries(pack.mechanicalPackages||{})){
      if(!customIds.has(id))diagnostics.push(diagnostic('CUSTOM_PACK_MECHANICS_TARGET','error',`Mechanical package ${id} must target an archetype in this pack.`,`/mechanicalPackages/${id}`));
      for(const ability of pkg.primaryAbilities||[])if(!mechanics.abilityOrder?.includes(ability))diagnostics.push(diagnostic('CUSTOM_PACK_ABILITY_REFERENCE','error',`Unknown ability ${ability}.`,`/mechanicalPackages/${id}/primaryAbilities`));
      for(const skill of pkg.skills||[])if(!mechanics.skillAbilities?.[skill])diagnostics.push(diagnostic('CUSTOM_PACK_SKILL_REFERENCE','error',`Unknown skill ${skill}.`,`/mechanicalPackages/${id}/skills`));
      for(const option of pkg.combatOptions||[])if(!mechanics.weaponProfiles?.[option])diagnostics.push(diagnostic('CUSTOM_PACK_COMBAT_REFERENCE','error',`Unknown combat option ${option}.`,`/mechanicalPackages/${id}/combatOptions`));
      for(const option of pkg.protectionOptions||[])if(!mechanics.armorProfiles?.[option])diagnostics.push(diagnostic('CUSTOM_PACK_PROTECTION_REFERENCE','error',`Unknown protection option ${option}.`,`/mechanicalPackages/${id}/protectionOptions`));
      const range=pack.levelGuidance?.[id];
      if(!Array.isArray(range)||range.length!==2||!range.every(Number.isInteger)||range[0]<0||range[1]<range[0])diagnostics.push(diagnostic('CUSTOM_PACK_LEVEL_GUIDANCE','error',`Mechanical package ${id} requires valid level guidance.`,`/levelGuidance/${id}`));
    }
    for(const[id]of Object.entries(pack.levelGuidance||{}))if(!pack.mechanicalPackages?.[id])diagnostics.push(diagnostic('CUSTOM_PACK_ORPHAN_LEVEL_GUIDANCE','error',`Level guidance ${id} has no mechanical package.`,`/levelGuidance/${id}`));
    for(const archetype of pack.archetypes||[])if(archetype.sectionPolicies?.mechanics?.policy==='required'&&!pack.mechanicalPackages?.[archetype.id])diagnostics.push(diagnostic('CUSTOM_PACK_REQUIRED_MECHANICS_MISSING','error',`${archetype.id} requires a mechanical package.`,`/mechanicalPackages/${archetype.id}`));
  }

  function validateCustomPack(input,context={}){
    const pack=normalized(input);const diagnostics=[];
    validateBasic(pack,context,diagnostics);
    const tableIds=validateTables(pack,context,diagnostics);
    validateAncestries(pack,context,diagnostics);
    const customIds=validateArchetypes(pack,context,tableIds,diagnostics);
    validateModules(pack,context,customIds,tableIds,diagnostics);
    try{JSON.stringify(pack);}catch(error){diagnostics.push(diagnostic('CUSTOM_PACK_NOT_SERIALIZABLE','error',error.message));}
    return{pack,diagnostics,valid:!diagnostics.some(item=>item.severity==='error')};
  }

  globalThis.NpcProfileGeneratorPackValidator=Object.freeze({GENERATOR_VERSION,PROFILE_SCHEMA_VERSION,RESERVED_PREFIXES,ID_PATTERN,VERSION_PATTERN,clone,diagnostic,major,versionParts,compareVersions,reserved,uniqueValues,normalized,validateCustomPack});
})();
