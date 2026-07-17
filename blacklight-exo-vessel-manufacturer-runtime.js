(() => {
  'use strict';
  const base=globalThis.BlacklightExoVessel;
  const P=globalThis.BlacklightExoVesselPhilosophyDefinitions;
  const D=globalThis.BlacklightExoVesselManufacturerDefinitions;
  if(!base||!P||!D||base.manufacturerVersion)return;

  const archetypes=Object.fromEntries(P.archetypes.map(item=>[item.key,item]));
  const focuses=D.focusProfiles;
  const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
  const finite=(value,fallback=0)=>Number.isFinite(Number(value))?Number(value):fallback;
  const clone=value=>value==null?value:structuredClone(value);
  const dom=id=>globalThis.document?.getElementById?.(id)?.value||null;
  const dossier=source=>source?.dossier||source?.biology||null;
  function hash(value){let state=2166136261;for(const char of String(value)){state^=char.charCodeAt(0);state=Math.imul(state,16777619);}return state>>>0;}
  const unit=value=>hash(value)/4294967295;
  const slug=(value,fallback='unknown')=>(String(value||fallback).toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,52)||fallback);
  const id=(prefix,label,seed)=>`${prefix}-${slug(label)}-${hash(`${prefix}:${label}:${seed}`).toString(16).padStart(8,'0')}`;
  const pick=(seed,list)=>list[Math.floor(unit(seed)*list.length)%list.length];
  function normalize(table){
    const entries=Object.entries(table).map(([key,value])=>[key,Math.max(.001,finite(value,.001))]);
    const total=entries.reduce((sum,[,value])=>sum+value,0);
    return Object.fromEntries(entries.map(([key,value])=>[key,value/total]));
  }
  function inferArchetype(input,result,source){
    const explicit=input.manufacturerProfile||dom('exo-vessel-archetype');
    if(explicit&&explicit!=='inherit'&&archetypes[explicit])return{key:explicit,reason:'The cultural architecture family was selected explicitly.'};
    const d=dossier(source),species=d?.species||{},civilization=d?.civilization||{},system=d?.system||{},role=result.identity?.roleKey||input.role||'explorer';
    const hasCulture=Boolean(d?.species||d?.civilization);
    const text=[species.environment,species.bodyPlan,species.chemistry,species.adaptation,species.cognition,civilization.government,civilization.economy,civilization.warfare,(civilization.values||[]).join(' '),system.state,system.economy,system.traffic,hasCulture?'':role].join(' ').toLowerCase();
    const score={VAULT_KEEPER:0,VOID_NOMAD:0,CORP_LOGISTICS:0,APEX_WARLORD:0};
    const add=(key,pattern,value)=>{if(pattern.test(text))score[key]+=value;};
    add('VAULT_KEEPER',/subterranean|high-gravity|high-pressure|icebound|cryosphere|ocean|pressure|continuity|custodian|archive|colony|passenger/,4);
    add('VOID_NOMAD',/scaveng|salvage|relic|nomad|migrat|decentral|clan|distributed|collective|frontier|departed|militia/,4);
    add('CORP_LOGISTICS',/corporate|commercial|merchant|tanker|logistics|standardized|concession|export|traffic|transit-service|market/,4);
    add('APEX_WARLORD',/military|warship|fortress|siege|contested|orbital denial|fleet|warfare|stewardship/,4);
    if(!hasCulture){
      const fallback=({warship:'APEX_WARLORD',merchant:'CORP_LOGISTICS',tanker:'CORP_LOGISTICS',courier:'CORP_LOGISTICS',explorer:'VOID_NOMAD',science:'VAULT_KEEPER',passenger:'VAULT_KEEPER',colony:'VAULT_KEEPER'})[role];
      if(fallback)score[fallback]+=2;
    }
    const key=Object.entries(score).sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0]))[0][0];
    return{key,reason:`The ${archetypes[key].label} cultural baseline was inferred from the originating biology, environment, government, economy, and warfare doctrine${hasCulture?'':`, with ${result.identity?.role||role} used only because no originating culture was available`}.`};
  }
  function sourceIdentity(seed,result,source){
    const d=dossier(source),speciesName=d?.species?.name||result.lifeSupport?.profile?.sourceSpecies||'Reference Species',speciesCommon=d?.species?.commonName||String(speciesName).split(/\s+/)[0],organizationName=d?.civilization?.government||d?.civilization?.economy||'Independent Vessel Authority';
    const sourceRoot=d?.seed||`reference:${slug(speciesName)}`;
    const speciesSeed=`${sourceRoot}:species:${slug(speciesName)}`,organizationSeed=`${speciesSeed}:organization:${slug(organizationName)}`;
    return{d,speciesName,speciesCommon,organizationName,speciesSeed,organizationSeed,speciesId:id('species',speciesName,speciesSeed),organizationId:id('org',organizationName,organizationSeed)};
  }
  function technologyRank(result){
    return Math.max(0,Math.min(6,Math.round(finite(result.drive?.pathLevelRank,4))));
  }
  function sharedPressure(identity,source){
    const d=identity.d,species=d?.species||{},civilization=d?.civilization||{},system=d?.system||{};
    return [species.environment,species.bodyPlan,species.chemistry,species.senses?.join?.(' '),species.cognition,species.adaptation,species.size,civilization.government,civilization.economy,civilization.warfare,civilization.technology,(civilization.values||[]).join(' '),system.state,system.economy,system.traffic].join(' ');
  }
  function materialSet(seed,matrix,text,rank){
    const materials=[...matrix.materials];
    for(const rule of D.materialRules)if(rule.pattern.test(text))materials.push(...rule.materials);
    if(rank>=5)materials.push('precision-grown high-temperature lattice');
    if(rank<=1)materials.push('conventional welded alloy frame');
    return [...new Set(materials)].sort((a,b)=>hash(`${seed}:${a}`)-hash(`${seed}:${b}`)).slice(0,4);
  }
  function manufacturerName(seed,identity,focus,index){
    const speciesToken=slug(identity.speciesCommon,'exo').replace(/(^|-)(\w)/g,(_,dash,char)=>`${dash}${char.toUpperCase()}`).replaceAll('-','');
    const root=index===0?speciesToken:pick(`${seed}:root`,D.nameRoots);
    const middle=focus.label.split(' ')[0];
    const end=pick(`${seed}:end`,D.nameEnds);
    return `${root} ${middle} ${end}`.replace(/\s+/g,' ').trim();
  }
  function designationPrefix(name,index){
    const letters=name.split(/\s+/).map(part=>part[0]).join('').toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,3);
    return `${letters||'EX'}${index+1}`;
  }
  function generateManufacturer(seed,input,result,source,index){
    const identity=sourceIdentity(seed,result,source),inferred=inferArchetype(input,result,source),archetype=archetypes[inferred.key],matrix=D.archetypeMatrices[inferred.key],focus=focuses[index%focuses.length];
    const manufacturerSeed=`${identity.organizationSeed}:manufacturer:${index}:${focus.key}`,name=manufacturerName(manufacturerSeed,identity,focus,index),manufacturerId=id('mfr',name,manufacturerSeed);
    const text=sharedPressure(identity,source),rank=technologyRank(result);
    let internal=archetype.internalsBias+focus.architectureNudge+(unit(`${manufacturerSeed}:architecture`)-.5)*2*archetype.variance;
    if(/high-gravity|high-pressure|subterranean|ocean|cryosphere/i.test(text))internal+=.07;
    if(/distributed|collective|salvage|militia|low-gravity|artificial habitat/i.test(text))internal-=.06;
    internal=clamp(internal,.04,.96);
    const standardization=clamp(archetype.standardization+focus.standardization+(/corporate|bureaucratic|state-directed|fleet/i.test(text)?.06:0)+(unit(`${manufacturerSeed}:std`)-.5)*.06,.15,.99);
    const modularity=clamp((1-internal)*.62+focus.modularity+(inferred.key==='VOID_NOMAD'?.18:0)+(inferred.key==='CORP_LOGISTICS'?.12:0),.12,.98);
    const automation=clamp(.18+rank*.11+focus.automation+(/machine|synthetic|post-material/i.test(text)?.12:0),.08,.98);
    const qualityControl=clamp(.42+standardization*.32+focus.quality+(unit(`${manufacturerSeed}:quality`)-.5)*.06,.25,.99);
    const baseLife={VAULT_KEEPER:90,VOID_NOMAD:48,CORP_LOGISTICS:42,APEX_WARLORD:58}[inferred.key]||50;
    const topology={...matrix.topology};for(const [key,value]of Object.entries(focus.topology))topology[key]=(topology[key]||0)+value;
    topology.MONOCOQUE+=internal*.12;topology.SPINE+=(1-internal)*.10;topology.HYBRID+=Math.max(0,.5-Math.abs(internal-.5))*.14;
    const variants={...matrix.variants};variants.LEGACY*=focus.legacy;variants.PROTOTYPE*=focus.prototype;variants.ADVANCED*=.75+rank*.08;variants.STANDARD*=1.08-standardization*.08;
    const materials=materialSet(manufacturerSeed,matrix,text,rank);
    const repairDoctrine=pick(`${manufacturerSeed}:repair`,matrix.repair);
    const visual={
      silhouette:internal>=.68?'compact protected citadel':internal<=.32?'elongated open service spine':'protected inhabited core with external machinery rails',
      symmetry:pick(`${manufacturerSeed}:symmetry`,D.visualAxes.symmetry),
      surface:pick(`${manufacturerSeed}:surface`,D.visualAxes.surface),
      moduleRhythm:pick(`${manufacturerSeed}:rhythm`,D.visualAxes.rhythm),
      sensorPlacement:pick(`${manufacturerSeed}:sensor`,D.visualAxes.sensors),
      radiatorPlacement:pick(`${manufacturerSeed}:radiator`,D.visualAxes.radiators),
      recognitionFeatures:[matrix.visual[index%matrix.visual.length],matrix.visual[(index+1)%matrix.visual.length],focus.label]
    };
    const prefix=designationPrefix(name,index),classRoots=[identity.speciesCommon,focus.key.toLowerCase(),['Aegis','Vector','Keel','Horizon','Reliant','Pioneer'][hash(`${manufacturerSeed}:class`)%6]];
    const record={
      recordType:'exoVesselManufacturer',schemaVersion:'1.0.0',manufacturerId,name,speciesId:identity.speciesId,organizationId:identity.organizationId,baseTechnologyBand:`P${rank}`,
      archetype:{key:inferred.key,label:archetype.label,inferenceReason:inferred.reason,focusKey:focus.key,focusLabel:focus.label},
      architecture:{internalsBias:internal,evaBias:1-internal,allowedDeviationVariance:clamp(archetype.variance+(focus.key==='FRONTIER'?.07:focus.key==='CONTINUITY'?-0.01:0),.02,.30),primaryStructuralMaterial:materials[0],preferredEnvelope:internal>=.65?'INTERNAL':internal<=.35?'EVA':'HYBRID'},
      production:{standardization,modularity,automation,qualityControl,plannedServiceLifeYears:Math.round(baseLife*focus.serviceLife*(.86+qualityControl*.28))},
      technologyVariantWeights:normalize(variants),topologyWeights:normalize(topology),materials,repairDoctrine,
      weaponPreferences:[...matrix.weapons].sort((a,b)=>hash(`${manufacturerSeed}:weapon:${a}`)-hash(`${manufacturerSeed}:weapon:${b}`)).slice(0,4),
      namingGrammar:{designationPrefix:prefix,classPattern:`${classRoots[0]}-${classRoots[2]} class`,serialPattern:`${prefix}-{HULL_FAMILY}-{SERIAL}`,familyRoots:classRoots,manufacturerIndex:index},
      visualGrammar:visual,
      doctrine:{production:`${focus.label} shaped by ${archetype.label} cultural engineering.`,maintenance:repairDoctrine,architecture:`${Math.round(internal*100)}% Internals bias and ${Math.round((1-internal)*100)}% EVA bias before module-specific routing.`,industrialContext:text||'No inherited industrial record was available.'},
      signatureTraits:[visual.silhouette,visual.moduleRhythm,repairDoctrine,materials[0]],
      preferredRoles:inferred.key==='APEX_WARLORD'?['warship','courier','tanker']:inferred.key==='CORP_LOGISTICS'?['merchant','tanker','passenger','courier']:inferred.key==='VAULT_KEEPER'?['colony','passenger','science']:['explorer','science','merchant'],
      provenance:{speciesSeed:identity.speciesSeed,organizationSeed:identity.organizationSeed,manufacturerSeed,sourceSpecies:identity.speciesName,sourceOrganization:identity.organizationName,sourceDossierSeed:identity.d?.seed||null,generatorId:'blacklight-exo-vessel-manufacturer-generator',generatorVersion:'1.0.0'},
      validation:{valid:true,violations:[]}
    };
    const violations=[];
    const near=(value,target)=>Math.abs(value-target)<1e-9;
    if(!near(record.architecture.internalsBias+record.architecture.evaBias,1))violations.push('Architecture biases do not sum to one.');
    if(!near(Object.values(record.topologyWeights).reduce((a,b)=>a+b,0),1))violations.push('Topology weights do not sum to one.');
    if(!near(Object.values(record.technologyVariantWeights).reduce((a,b)=>a+b,0),1))violations.push('Technology variant weights do not sum to one.');
    record.validation={valid:!violations.length,violations};
    return record;
  }
  function catalog(seed,input,result,source,count=D.catalogSize){
    return Array.from({length:Math.max(1,Math.min(12,Math.round(finite(count,D.catalogSize))))},(_,index)=>generateManufacturer(seed,input,result,source,index));
  }
  function selectedIndex(input){
    const raw=input.manufacturerIndex??input.manufacturerVariant??dom('exo-vessel-manufacturer-index')??0;
    return Math.max(0,Math.min(11,Math.round(finite(raw,0))));
  }
  function apply(seed,input,source,result){
    const records=catalog(seed,input,result,source,D.catalogSize),index=selectedIndex(input)%records.length,manufacturer=records[index];
    result.manufacturer=clone(manufacturer);
    result.manufacturerCatalog=records.map(item=>({manufacturerId:item.manufacturerId,name:item.name,archetypeKey:item.archetype.key,focusKey:item.archetype.focusKey,internalsBias:item.architecture.internalsBias,evaBias:item.architecture.evaBias,preferredEnvelope:item.architecture.preferredEnvelope,primaryStructuralMaterial:item.architecture.primaryStructuralMaterial,designationPrefix:item.namingGrammar.designationPrefix}));
    result.identity.manufacturerId=manufacturer.manufacturerId;
    result.identity.manufacturerName=manufacturer.name;
    result.identity.hullFamilyName=`${manufacturer.namingGrammar.classPattern} ${result.identity.roleKey} variant`;
    result.identity.originalEngineeringName=result.identity.name;
    result.identity.name=`${manufacturer.name} ${result.identity.hullFamilyName} ${result.identity.role}`;
    result.warnings=[...(result.warnings||[]),`${manufacturer.name} is a persistent species- and organization-derived manufacturer, not one of the four cultural architecture baselines.`,`${manufacturer.archetype.focusLabel} changes architecture bias, topology, materials, standardization, repair doctrine, equipment-quality distribution, and visible construction grammar.`];
    return result;
  }
  function generate(seed,input={},source=null){const value=String(seed||input.seed||'vessel');return apply(value,input,source,base.generate(value,input,source));}
  function save(record){
    if(!record?.manufacturerId)return false;
    try{const key='blacklight-exo-manufacturer-library-v1',library=JSON.parse(globalThis.localStorage?.getItem(key)||'{}');library[record.manufacturerId]=record;globalThis.localStorage?.setItem(key,JSON.stringify(library));return true;}catch{return false;}
  }
  function list(){try{return Object.values(JSON.parse(globalThis.localStorage?.getItem('blacklight-exo-manufacturer-library-v1')||'{}'));}catch{return[];}}
  const generator=Object.freeze({version:1,schemaVersion:'1.0.0',catalogSize:D.catalogSize,generateManufacturer,catalog,save,list});
  globalThis.BlacklightExoVesselManufacturerGenerator=generator;
  globalThis.BlacklightExoVessel=Object.freeze({...base,manufacturerVersion:1,manufacturerGenerator:generator,generate});
})();