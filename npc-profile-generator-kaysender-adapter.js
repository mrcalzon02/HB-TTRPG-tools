(() => {
  'use strict';
  const Random=globalThis.NpcProfileRandom;
  const Data=globalThis.NpcProfileGeneratorKaysenderData;
  if(!Random||!Data)throw new Error('NPC random and Kaysender data modules must load before the Kaysender adapter.');
  const VERSION='0.1.0';
  const ADAPTER_ID='universal-npc-kaysender-adapter';
  const LEGACY_RUNTIME_SHA='008314c9c4619564a3b18efafd43fe13257757fa';
  const MANIFEST_SHA='b9b0fe527db38b30255cb1a142068daa22b8394e';
  const DEFAULT_TIMESTAMP='1970-01-01T00:00:00.000Z';
  const clone=Data.clone;

  function normalizeOptions(options={}){
    const count=Math.min(12,Math.max(1,Math.round(Number(options.count)||1)));
    return{
      populationBandId:options.populationBandId||'random-population',
      classPool:['appropriate','npc','pc','custom','all'].includes(options.classPool)?options.classPool:'appropriate',
      powerTierId:options.powerTierId||'appropriate',
      ageBand:['appropriate','child','adolescent','adult','middle-aged','elderly'].includes(options.ageBand)?options.ageBand:'appropriate',
      ancestryName:options.ancestryName||'random',count
    };
  }
  function choose(rng,entries,fallback='none'){
    return Array.isArray(entries)&&entries.length?rng.choice(entries):fallback;
  }
  function recordId(seed,index){return`kaysender-npc-${Random.hash32(Random.deriveSeed(seed,'record',index)).toString(36).padStart(8,'0')}`;}
  function selectBand(data,requested,rng){
    const found=data.bandIndex?.[requested];
    if(found&&found.id!=='random-population')return found;
    return choose(rng,data.selectableBands,data.selectableBands?.[0]);
  }
  function selectAncestry(data,requested,rng){
    if(requested!=='random'&&data.ancestryIndex?.[requested])return data.ancestryIndex[requested];
    return choose(rng,data.ancestries,data.ancestries?.[0]);
  }
  function selectClass(data,band,mode,rng){
    if(mode==='appropriate'){
      const name=rng.weightedChoice((band.preferredClasses||[]).map(entry=>({value:entry.name,weight:entry.weight})));
      return data.classIndex?.[name]||choose(rng.fork('npc-fallback'),data.classPools.npc,data.classes?.[0]);
    }
    const candidates=mode==='all'?data.classes:data.classPools?.[mode];
    return choose(rng,candidates,choose(rng.fork('npc-fallback'),data.classPools.npc,data.classes?.[0]));
  }
  function levelRange(data,band,powerTierId){
    const tier=data.powerTierIndex?.[powerTierId];
    if(tier?.id==='appropriate')return clone(band.levelRange);
    if(tier&&Number.isInteger(tier.min)&&Number.isInteger(tier.max))return{min:tier.min,max:tier.max};
    return{min:1,max:1};
  }
  function statStub(profile,level){
    const priorities=(profile.keyAbilities||[]).join(', ');
    if(profile.pool==='custom')return`${profile.name} ${level}; exact Hit Die, base attack, saves, and feature progression remain conversion-pending. Key ability priorities: ${priorities}.`;
    const saves=profile.goodSaves?.length?profile.goodSaves.join(', '):'none';
    return`${profile.name} ${level}; ${profile.hitDie} Hit Die; ${profile.baseAttack} base attack progression; good saves: ${saves}; key ability priorities: ${priorities}.`;
  }
  function classLabel(profile,level,path){return!path||path==='none'?`${profile.name} ${level}`:`${profile.name} ${level} — ${path}`;}
  function legacyRows(record){
    return[
      {label:'Population band',value:record.population.label},
      {label:'Ancestry and age',value:`${record.identity.ancestryName}; ${record.identity.ageBand}`},
      {label:'Home region',value:record.homeRegion},
      {label:'Occupation',value:record.occupation},
      {label:'Class and level',value:record.classProfile.classLabel},
      {label:'Class role',value:record.classProfile.role},
      {label:'Ship role',value:record.crew.shipRole},
      {label:'Faction tie',value:record.factionTie},
      {label:'Disposition',value:record.characterization.disposition},
      {label:'Need',value:record.characterization.need},
      {label:'Fear',value:record.characterization.fear},
      {label:'Loyalty',value:record.characterization.loyalty},
      {label:'Secret',value:record.characterization.secret},
      {label:'Current problem',value:record.characterization.currentProblem},
      {label:'Combat readiness',value:record.population.combatReadiness},
      {label:'Open d20 stat stub',value:record.classProfile.statStub},
      {label:'Rules status',value:record.classProfile.rulesStatus}
    ];
  }
  function buildRecord(data,selection,config={}){
    const compatibility=data.compatibility,profile=selection.classProfile;
    const givenName=selection.givenName,familyName=selection.familyName;
    const sourcePaths=[compatibility.sources.manifest,selection.band.sourcePath].filter(Boolean);
    const record={
      recordType:'kaysenderNpcAlpha',schemaVersion:'1.0.0',recordId:recordId(selection.seed,selection.batchIndex),
      generatedAt:config.timestamp||DEFAULT_TIMESTAMP,
      adapter:{adapterId:ADAPTER_ID,adapterVersion:VERSION,seed:selection.seed,legacyRuntimeSha:LEGACY_RUNTIME_SHA,manifestSha:MANIFEST_SHA},
      options:{populationBandId:selection.requested.populationBandId,classPool:selection.requested.classPool,powerTierId:selection.requested.powerTierId,ageBand:selection.requested.ageBand,ancestryName:selection.requested.ancestryName,batchIndex:selection.batchIndex,batchCount:selection.batchCount},
      identity:{fullName:`${givenName} ${familyName}`,givenName,familyName,ancestryName:selection.ancestry.name,ancestryId:selection.ancestry.id,ageBand:selection.ageBand},
      population:{bandId:selection.band.id,label:selection.band.label,description:selection.band.description,combatReadiness:selection.band.combatReadiness,levelRange:clone(selection.band.levelRange)},
      homeRegion:selection.homeRegion,occupation:selection.occupation,
      classProfile:{name:profile.name,pool:profile.pool,level:selection.level,path:selection.path||null,classLabel:classLabel(profile,selection.level,selection.path),role:profile.role,hitDie:profile.hitDie,baseAttack:profile.baseAttack,goodSaves:clone(profile.goodSaves||[]),keyAbilities:clone(profile.keyAbilities||[]),conversionStatus:profile.conversionStatus||'',statStub:selection.statStub||statStub(profile,selection.level),rulesStatus:selection.rulesStatus||profile.conversionStatus||compatibility.fallbacks.standardRulesStatus},
      crew:{shipRole:selection.shipRole,assigned:selection.shipRole!==compatibility.fallbacks.unassignedCrewRole},
      factionTie:selection.factionTie,
      characterization:{disposition:selection.disposition,need:selection.need,fear:selection.fear,loyalty:selection.loyalty,secret:selection.secret,currentProblem:selection.currentProblem},
      presentation:{extraClass:selection.band.combatReadiness.includes('noncombatant')?'scan-clean':'',scanClean:selection.band.combatReadiness.includes('noncombatant')},
      legacyRows:[],universalProfileId:null,
      provenance:{sourcePaths:[...new Set(sourcePaths)],sourceBandPack:selection.band.sourcePath,legacyRuntimePreserved:true}
    };
    record.legacyRows=legacyRows(record);
    return record;
  }
  function generateRecord(data,rawOptions={},config={}){
    const requested=normalizeOptions(rawOptions),batchIndex=Math.max(0,Math.min(requested.count-1,Number(config.batchIndex)||0));
    const seed=Random.normalizeSeed(config.seed||'kaysender-default-seed');
    const root=Random.create(Random.deriveSeed(seed,ADAPTER_ID,VERSION,batchIndex));
    const band=selectBand(data,requested.populationBandId,root.fork('band'));
    const ancestry=selectAncestry(data,requested.ancestryName,root.fork('ancestry'));
    const ageBand=requested.ageBand==='appropriate'?choose(root.fork('age'),band.ageBands,'adult'):requested.ageBand;
    const classProfile=selectClass(data,band,requested.classPool,root.fork('class'));
    if(!band||!ancestry||!classProfile)throw new Error('Kaysender compatibility data is incomplete.');
    const range=levelRange(data,band,requested.powerTierId),level=root.fork('level').int(range.min,range.max);
    const path=choose(root.fork('path'),classProfile.paths,'none');
    const shipRole=band.crewRoles.length?choose(root.fork('crew-role'),band.crewRoles):data.compatibility.fallbacks.unassignedCrewRole;
    return buildRecord(data,{
      seed,requested,batchIndex,batchCount:requested.count,band,ancestry,ageBand,classProfile,level,path,
      givenName:choose(root.fork('given-name'),ancestry.givenNames),familyName:choose(root.fork('family-name'),ancestry.familyNames),
      homeRegion:choose(root.fork('home-region'),data.homeRegions),occupation:choose(root.fork('occupation'),band.occupations),shipRole,
      factionTie:choose(root.fork('faction'),data.factions),disposition:choose(root.fork('disposition'),data.dispositions),
      need:choose(root.fork('need'),data.needs),fear:choose(root.fork('fear'),data.fears),loyalty:choose(root.fork('loyalty'),data.loyalties),
      secret:choose(root.fork('secret'),data.secrets),currentProblem:choose(root.fork('problem'),data.problems)
    },config);
  }
  function generateBatch(data,options={},config={}){
    const normalized=normalizeOptions(options),records=[];
    for(let index=0;index<normalized.count;index+=1)records.push(generateRecord(data,normalized,{...config,batchIndex:index}));
    return records;
  }

  function ensureSection(profile,id){
    profile.sections=profile.sections||{};
    const envelope=profile.sections[id];
    if(!envelope||envelope.state!=='present')profile.sections[id]={state:'present',data:{}};
    profile.sections[id].data=profile.sections[id].data||{};
    return profile.sections[id].data;
  }
  function toUniversalProfile(record,data,config={}){
    const Rules=globalThis.NpcProfileRules,Core=globalThis.NpcProfileGeneratorCore;
    if(!Rules||!Core)throw new Error('NPC rules and core modules are required for universal profile conversion.');
    const pack=config.pack||Data.extendPack(config.basePack||{},data);
    const band=data.bandIndex[record.population.bandId],archetypes=config.archetypes||[];
    const resolved=Rules.resolveArchetype(band.archetypeId,archetypes);
    if(!resolved.valid)throw new Error(`Kaysender archetype ${band.archetypeId} could not be resolved.`);
    const result=Core.generateProfile({seed:Random.deriveSeed(record.adapter.seed,'universal',record.options.batchIndex),archetype:resolved.archetype,pack,mode:config.mode||'standard',mechanicalMode:'none',timestamp:record.generatedAt,options:{identity:{ancestryId:record.identity.ancestryId,ageBand:record.identity.ageBand}}});
    if(!result.profile)throw new Error('Universal profile generation failed for the Kaysender record.');
    const profile=result.profile;
    Object.assign(profile.identity,{fullName:record.identity.fullName,givenName:record.identity.givenName,familyName:record.identity.familyName,ancestryId:record.identity.ancestryId,ageBand:record.identity.ageBand,homeland:record.homeRegion,currentLocation:record.homeRegion});
    Object.assign(ensureSection(profile,'socialEconomic'),{populationBandId:record.population.bandId,populationBand:record.population.label,occupation:record.occupation,combatReadiness:record.population.combatReadiness});
    Object.assign(ensureSection(profile,'personality'),{disposition:record.characterization.disposition});
    Object.assign(ensureSection(profile,'motivations'),{immediateNeed:record.characterization.need,fear:record.characterization.fear,loyalty:record.characterization.loyalty});
    Object.assign(ensureSection(profile,'affiliationsRelationships'),{factionTie:record.factionTie,loyalty:record.characterization.loyalty});
    Object.assign(ensureSection(profile,'secretsProblemsHooks'),{secret:record.characterization.secret,currentProblem:record.characterization.currentProblem});
    profile.sections.mechanics={state:'present',data:{systemId:'open-d20-compatible',mechanicalMode:'open-d20-light',level:record.classProfile.level,classLabel:record.classProfile.name,displayLabel:record.classProfile.classLabel,role:record.classProfile.role,pool:record.classProfile.pool,path:record.classProfile.path,hitDie:record.classProfile.hitDie,baseAttack:record.classProfile.baseAttack,goodSaves:clone(record.classProfile.goodSaves),primaryAbilities:clone(record.classProfile.keyAbilities),combatReadiness:record.population.combatReadiness,statStub:record.classProfile.statStub,rulesStatus:record.classProfile.rulesStatus,conversionStatus:record.classProfile.conversionStatus}};
    profile.sections.extensions=profile.sections.extensions||{};
    profile.sections.extensions.kaysenderPopulation={state:'present',data:{bandId:record.population.bandId,label:record.population.label,description:record.population.description,family:band.family,homeRegion:record.homeRegion,occupation:record.occupation,combatReadiness:record.population.combatReadiness}};
    profile.sections.extensions.kaysenderCrewRole={state:'present',data:clone(record.crew)};
    profile.sections.extensions.kaysenderClassProfile={state:'present',data:clone(record.classProfile)};
    profile.generator.mechanicalMode='open-d20-light';profile.generator.mechanicalOptions={mode:'open-d20-light',levelMode:'exact',level:record.classProfile.level};
    profile.generator.customPackIds=[...new Set([...(profile.generator.customPackIds||[]),data.compatibility.packId])];
    profile.provenance.sourcePackIds=[...new Set([...(profile.provenance.sourcePackIds||[]),data.compatibility.packId])];
    profile.provenance.sourceEntryIds=[...new Set([...(profile.provenance.sourceEntryIds||[]),record.population.bandId,record.identity.ancestryId,data.classIndex[record.classProfile.name]?.id].filter(Boolean))];
    profile.provenance.notes=[...(profile.provenance.notes||[]),`Adapted from Kaysender NPC alpha record ${record.recordId}.`];
    record.universalProfileId=profile.profileId;
    return{record,profile,diagnostics:result.diagnostics,valid:!result.diagnostics.some(item=>item.severity==='error')};
  }

  function rowMap(rows){
    return new Map((rows||[]).map(row=>Array.isArray(row)?[row[0],String(row[1])]:[row.label,String(row.value)]));
  }
  function parseClass(value,data){
    const names=[...data.classes].sort((a,b)=>b.name.length-a.name.length);
    const profile=names.find(entry=>String(value).startsWith(`${entry.name} `))||data.classIndex.Commoner||data.classes[0];
    const rest=String(value).slice(profile.name.length).trim(),match=rest.match(/^(\d+)(?:\s+—\s+(.+))?$/);
    return{profile,level:Number(match?.[1]||1),path:match?.[2]||'none'};
  }
  function importLegacyCard(input,data,config={}){
    const rows=rowMap(input?.rows),ancestryAge=String(rows.get('Ancestry and age')||'').split(';').map(value=>value.trim());
    const ancestry=data.ancestryIndex[ancestryAge[0]]||data.ancestries[0];
    const band=data.populationBands.find(entry=>entry.label===rows.get('Population band'))||data.selectableBands[0];
    const parsedClass=parseClass(rows.get('Class and level')||'Commoner 1',data);
    const name=String(input?.name||'Unknown Person').trim().split(/\s+/),givenName=name.shift()||'Unknown',familyName=name.join(' ')||'Person';
    const seed=Random.normalizeSeed(config.seed||`import:${input?.name||'unknown'}`),requested=normalizeOptions({populationBandId:band.id,classPool:parsedClass.profile.pool,powerTierId:'appropriate',ageBand:ancestryAge[1]||'adult',ancestryName:ancestry.name,count:1});
    const record=buildRecord(data,{seed,requested,batchIndex:0,batchCount:1,band,ancestry,ageBand:ancestryAge[1]||'adult',classProfile:parsedClass.profile,level:parsedClass.level,path:parsedClass.path,givenName,familyName,homeRegion:rows.get('Home region')||'none',occupation:rows.get('Occupation')||input?.occupation||'none',shipRole:rows.get('Ship role')||data.compatibility.fallbacks.unassignedCrewRole,factionTie:rows.get('Faction tie')||'none',disposition:rows.get('Disposition')||'none',need:rows.get('Need')||'none',fear:rows.get('Fear')||'none',loyalty:rows.get('Loyalty')||'none',secret:rows.get('Secret')||'none',currentProblem:rows.get('Current problem')||'none',statStub:rows.get('Open d20 stat stub'),rulesStatus:rows.get('Rules status')},config);
    record.presentation.extraClass=input?.extraClass==='scan-clean'?'scan-clean':'';record.presentation.scanClean=record.presentation.extraClass==='scan-clean';
    if((input?.rows||[]).length===17)record.legacyRows=(input.rows||[]).map(row=>Array.isArray(row)?{label:String(row[0]),value:String(row[1])}:{label:String(row.label),value:String(row.value)});
    return record;
  }

  globalThis.NpcProfileGeneratorKaysenderAdapter=Object.freeze({VERSION,ADAPTER_ID,LEGACY_RUNTIME_SHA,MANIFEST_SHA,DEFAULT_TIMESTAMP,normalizeOptions,choose,recordId,selectBand,selectAncestry,selectClass,levelRange,statStub,classLabel,legacyRows,buildRecord,generateRecord,generateBatch,ensureSection,toUniversalProfile,rowMap,parseClass,importLegacyCard});
})();
