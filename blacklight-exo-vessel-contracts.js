(() => {
  'use strict';
  const base=globalThis.BlacklightExoVessel;
  if(!base||base.contractVersion)return;
  const SCHEMA='1.0.0',BANDS=['T-1','P0','P1','P2','P3','P4','P5','P6'];
  const VARIANTS={LEGACY:-.3,STANDARD:0,REFINED:.12,ADVANCED:.22,PROTOTYPE:.3};
  const SEEDS=['speciesSeed','organizationSeed','manufacturerSeed','hullFamilySeed','vesselInstanceSeed','layoutSeed','equipmentSeed','conditionSeed','historySeed'];
  const AXES={constructionCompletionPercent:100,commissioningCompletionPercent:100,operationalReadinessPercent:100,structuralDamagePercent:0,systemDamagePercent:0,salvageRemovalPercent:0,decommissioningPercent:0,maintenanceDebtPercent:0,fuelLoadPercent:100,coolantLoadPercent:100,atmosphereIntegrityPercent:100,contaminationPercent:0,crewAvailabilityPercent:100,dataIntegrityPercent:100,destructionPercent:0};
  const t=values=>Object.freeze({...AXES,...values});
  const CONDITIONS=Object.freeze({
    NEWLY_MANUFACTURED:t({commissioningCompletionPercent:30,operationalReadinessPercent:25,fuelLoadPercent:15,coolantLoadPercent:70,crewAvailabilityPercent:0}),
    PARTIALLY_COMPLETED:t({constructionCompletionPercent:68,commissioningCompletionPercent:0,operationalReadinessPercent:0,fuelLoadPercent:0,coolantLoadPercent:20,crewAvailabilityPercent:0}),
    COMMISSIONING:t({commissioningCompletionPercent:72,operationalReadinessPercent:55,fuelLoadPercent:60,coolantLoadPercent:90,crewAvailabilityPercent:70}),
    OPERATIONAL:t({}),
    WORN_SERVICE:t({operationalReadinessPercent:78,structuralDamagePercent:4,systemDamagePercent:9,maintenanceDebtPercent:46,fuelLoadPercent:72,coolantLoadPercent:84,dataIntegrityPercent:92}),
    PARTIALLY_TORN_DOWN:t({operationalReadinessPercent:12,salvageRemovalPercent:18,decommissioningPercent:52,fuelLoadPercent:3,coolantLoadPercent:22,crewAvailabilityPercent:8}),
    MOTHBALLED:t({operationalReadinessPercent:20,maintenanceDebtPercent:28,fuelLoadPercent:0,coolantLoadPercent:35,atmosphereIntegrityPercent:65,crewAvailabilityPercent:0}),
    ABANDONED:t({operationalReadinessPercent:18,structuralDamagePercent:8,systemDamagePercent:22,maintenanceDebtPercent:72,fuelLoadPercent:9,coolantLoadPercent:31,atmosphereIntegrityPercent:58,contaminationPercent:14,crewAvailabilityPercent:0,dataIntegrityPercent:64}),
    PARTIALLY_SALVAGED:t({operationalReadinessPercent:8,structuralDamagePercent:14,systemDamagePercent:38,salvageRemovalPercent:35,maintenanceDebtPercent:80,fuelLoadPercent:0,coolantLoadPercent:14,atmosphereIntegrityPercent:44,crewAvailabilityPercent:0,dataIntegrityPercent:42,destructionPercent:22}),
    DAMAGED:t({operationalReadinessPercent:62,structuralDamagePercent:18,systemDamagePercent:24,maintenanceDebtPercent:32,fuelLoadPercent:61,coolantLoadPercent:68,atmosphereIntegrityPercent:78,crewAvailabilityPercent:82,dataIntegrityPercent:80,destructionPercent:18}),
    CRIPPLED:t({operationalReadinessPercent:22,structuralDamagePercent:56,systemDamagePercent:63,maintenanceDebtPercent:74,fuelLoadPercent:28,coolantLoadPercent:37,atmosphereIntegrityPercent:42,crewAvailabilityPercent:48,dataIntegrityPercent:54,destructionPercent:62}),
    WRECKED:t({operationalReadinessPercent:0,structuralDamagePercent:82,systemDamagePercent:90,maintenanceDebtPercent:100,fuelLoadPercent:5,coolantLoadPercent:7,atmosphereIntegrityPercent:8,contaminationPercent:48,crewAvailabilityPercent:0,dataIntegrityPercent:22,destructionPercent:82}),
    DESTROYED:t({operationalReadinessPercent:0,structuralDamagePercent:100,systemDamagePercent:100,maintenanceDebtPercent:100,fuelLoadPercent:0,coolantLoadPercent:0,atmosphereIntegrityPercent:0,contaminationPercent:100,crewAvailabilityPercent:0,dataIntegrityPercent:0,destructionPercent:100})
  });
  const LAYERS=['engineeringBaseline','architectureAdjustedMassLedger','powerAndThermalLedger','armorAndProtectionLedger','sensorAndNavigationLedger','maneuverAndDeltaVLedger','weaponInventory','countermeasureInventory','moduleGraph','voxelLayout','damageTopology','combatEnvelope','gameplayStatBlock','actionSet'];
  const LEGACY_OK=new Set(['structure','maneuver','maintenance','payload','shielding','navigation','thermal','life-support','power','fuel','conventional-engine','conventional-propellant','armor','protection-fields','sensors','fire-control','electronic-warfare','weapon-mounts','weapon-support','weapon-magazines','weapon-cooling','countermeasures','margin']);
  const clone=value=>value==null?value:structuredClone(value);
  const dom=id=>globalThis.document?.getElementById?.(id)?.value||null;
  function hash(value){let h=2166136261;for(const c of String(value)){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return h>>>0;}
  const unit=value=>hash(value)/4294967295;
  const slug=(value,fallback='unknown')=>(String(value||fallback).toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,52)||fallback);
  const id=(prefix,label,seed)=>`${prefix}-${slug(label)}-${hash(`${prefix}:${label}:${seed}`).toString(16).padStart(8,'0')}`;
  const dossier=source=>source?.dossier||source?.biology||null;
  const fallbackWeights=key=>({
    VAULT_KEEPER:{LEGACY:.08,STANDARD:.62,REFINED:.18,ADVANCED:.09,PROTOTYPE:.03},
    VOID_NOMAD:{LEGACY:.18,STANDARD:.42,REFINED:.14,ADVANCED:.08,PROTOTYPE:.18},
    CORP_LOGISTICS:{LEGACY:.08,STANDARD:.72,REFINED:.13,ADVANCED:.05,PROTOTYPE:.02},
    APEX_WARLORD:{LEGACY:.07,STANDARD:.52,REFINED:.16,ADVANCED:.20,PROTOTYPE:.05}
  }[key]||{LEGACY:.1,STANDARD:.62,REFINED:.15,ADVANCED:.09,PROTOTYPE:.04});
  function choose(seed,table){let roll=unit(seed);for(const key of['LEGACY','STANDARD','REFINED','ADVANCED','PROTOTYPE']){roll-=Number(table[key])||0;if(roll<=0)return key;}return'STANDARD';}

  function technology(seed,input,result){
    const explicit=String(input.principalTechnologyBand||'').toUpperCase();
    const rank=Number(result.drive?.pathLevelRank)||0,band=explicit||`P${Math.max(0,Math.min(6,rank))}`;
    if(!BANDS.includes(band))throw new Error(`Unknown principal technology band ${band}.`);
    if(band==='T-1'&&result.drive?.familyKey)throw new Error('An FTL-equipped vessel cannot use T-1 as its principal technology band.');
    const principalRank=BANDS.indexOf(band)-1,profile=result.designation?.originArchetypeKey||'CORP_LOGISTICS',overrides=input.subsystemVariants||{},weights=result.manufacturer?.technologyVariantWeights||fallbackWeights(profile);
    const known=new Set((result.hull?.massBudget||[]).map(row=>row.key));
    for(const [key,value]of Object.entries(overrides)){if(!known.has(key))throw new Error(`Unknown subsystem ${key}.`);if(!(String(value).toUpperCase()in VARIANTS))throw new Error(`Invalid technology variant ${value}.`);}
    const subsystemVariants=(result.hull?.massBudget||[]).map(row=>{
      const forced=overrides[row.key]!=null,variant=forced?String(overrides[row.key]).toUpperCase():choose(`${seed}:technology:${row.key}`,weights),offset=VARIANTS[variant],heritageBand=band==='P0'&&variant==='LEGACY'&&LEGACY_OK.has(row.key)?'T-1':band;
      return{subsystemKey:row.key,label:row.label,principalBand:band,variant,offset,technologyIndex:principalRank+offset,heritageBand,source:forced?'explicit subsystem override':`${result.manufacturer?.name||profile} technology-variant distribution`,rationale:heritageBand==='T-1'?`This P0 vessel explicitly uses sub-P0 heritage for ${row.label}.`:`${row.label} remains inside ${band} with a ${variant} implementation.`,explicitOverride:forced};
    });
    const violations=subsystemVariants.filter(row=>Math.abs(row.offset)>.300000001||(row.heritageBand==='T-1'&&!LEGACY_OK.has(row.subsystemKey))).map(row=>`${row.subsystemKey} violates technology policy.`);
    return{principalBand:band,principalRank,pathLevelKey:result.drive?.pathLevelKey||null,policyVersion:SCHEMA,allowedOffsetMinimum:-.3,allowedOffsetMaximum:.3,subsystemVariants,validation:{valid:!violations.length,violations}};
  }

  function seedRecord(seed,result,source){
    const manufacturer=result.manufacturer,d=dossier(source),species=d?.species?.name||manufacturer?.provenance?.sourceSpecies||result.designation?.originSpecies||'reference-species',organization=d?.civilization?.government||manufacturer?.provenance?.sourceOrganization||result.designation?.originOrganization||'independent-organization';
    const speciesSeed=manufacturer?.provenance?.speciesSeed||`${d?.seed||seed}:species:${slug(species)}`,organizationSeed=manufacturer?.provenance?.organizationSeed||`${speciesSeed}:organization:${slug(organization)}`,manufacturerSeed=manufacturer?.provenance?.manufacturerSeed||`${organizationSeed}:manufacturer:${slug(manufacturer?.name||result.designation?.originArchetype||'provisional-manufacturer')}`,hullFamilySeed=`${manufacturerSeed}:hull-family:${slug(result.identity?.roleKey)}:${slug(result.drive?.familyKey)}`,vesselInstanceSeed=String(seed);
    return{speciesSeed,organizationSeed,manufacturerSeed,hullFamilySeed,vesselInstanceSeed,layoutSeed:`${seed}:layout`,equipmentSeed:`${seed}:equipment`,conditionSeed:`${seed}:condition`,historySeed:`${seed}:history`};
  }

  function identifiers(seeds,result,source){
    const manufacturer=result.manufacturer,d=dossier(source),species=d?.species?.name||manufacturer?.provenance?.sourceSpecies||result.designation?.originSpecies||'reference-species',organization=d?.civilization?.government||manufacturer?.provenance?.sourceOrganization||result.designation?.originOrganization||'independent-organization',manufacturerName=manufacturer?.name||result.designation?.originManufacturer||result.designation?.originArchetype||'provisional-manufacturer',hull=`${manufacturerName}-${result.identity?.hullFamilyName||result.identity?.roleKey}-${result.drive?.familyKey}-${result.designPhilosophy?.classification}`;
    return{speciesId:manufacturer?.speciesId||id('species',species,seeds.speciesSeed),organizationId:manufacturer?.organizationId||id('org',organization,seeds.organizationSeed),manufacturerId:manufacturer?.manufacturerId||id('mfr',manufacturerName,seeds.manufacturerSeed),hullFamilyId:id('hull',hull,seeds.hullFamilySeed),vesselInstanceId:id('vessel',result.identity?.designationCode||result.identity?.name,seeds.vesselInstanceSeed)};
  }

  const doctrine=result=>({courier:'CIVILIAN',explorer:'SCIENTIFIC',merchant:'MERCHANT',passenger:'PASSENGER',colony:'COLONIAL',science:'SCIENTIFIC',warship:'MILITARY',tanker:'INDUSTRIAL'}[result.identity?.roleKey]||'CIVILIAN');
  function condition(input,result){
    const template=String(input.conditionTemplate||input.initialConditionTemplate||dom('exo-vessel-condition')||'OPERATIONAL').toUpperCase();
    if(!CONDITIONS[template])throw new Error(`Unknown vessel condition template ${template}.`);
    const axes={...CONDITIONS[template]};
    for(const [key,value]of Object.entries(input.conditionOverrides||{})){if(!(key in AXES))throw new Error(`Unknown condition axis ${key}.`);if(!Number.isFinite(Number(value))||value<0||value>100)throw new Error(`Condition axis ${key} must remain between 0 and 100.`);axes[key]=Number(value);}
    const violations=[];if(axes.destructionPercent===100&&(axes.operationalReadinessPercent||axes.structuralDamagePercent<100||axes.systemDamagePercent<100))violations.push('A 100% destroyed vessel cannot remain operational or structurally coherent.');
    return{schemaVersion:SCHEMA,template,serviceDoctrine:doctrine(result),axes,coherentVesselGraph:axes.destructionPercent<100,applicationStatus:'schema-only',validation:{valid:!violations.length,violations}};
  }
  function layers(result){
    const engineeringReady=Boolean(result.engineeringLedger?.validation?.valid),moduleReady=Boolean(result.moduleGraph?.validation?.valid),readyCount=moduleReady?9:engineeringReady?8:5;
    return LAYERS.map((key,index)=>({key,status:index<readyCount?'generated':'planned',version:index<readyCount?'1.0.0':null,source:index===8&&moduleReady?'VESSEL-03 semantic module graph':index>=5&&engineeringReady?'VESSEL-02 engineering ledger':index<5?'current vessel engineering runtime':'EXO phased vessel roadmap',notes:index<readyCount?'Available in the current record.':'Reserved for a later phase.'}));
  }

  function validate(record){
    const c=record?.contract,violations=[];
    if(!c)violations.push('Missing contract envelope.');
    if(c?.schemaVersion!==SCHEMA)violations.push('Unexpected schema version.');
    for(const key of SEEDS)if(!c?.seeds?.[key])violations.push(`Missing ${key}.`);
    for(const value of Object.values(c?.identifiers||{}))if(!/^(species|org|mfr|hull|vessel)-[a-z0-9][a-z0-9-]{5,95}$/.test(value))violations.push(`Invalid identifier ${value}.`);
    if(record?.manufacturer){
      if(!record.manufacturer.validation?.valid)violations.push(...(record.manufacturer.validation?.violations||['Manufacturer validation failed.']));
      if(c?.identifiers?.manufacturerId!==record.manufacturer.manufacturerId)violations.push('Contract manufacturer identifier does not match the generated manufacturer.');
      if(c?.identifiers?.speciesId!==record.manufacturer.speciesId||c?.identifiers?.organizationId!==record.manufacturer.organizationId)violations.push('Manufacturer origin identifiers do not match the contract.');
    }
    if(record?.engineeringLedger&&!record.engineeringLedger.validation?.valid)violations.push(...(record.engineeringLedger.validation?.violations||['VESSEL-02 engineering validation failed.']));
    if(record?.moduleGraph){
      if(!record.moduleGraph.validation?.valid)violations.push(...(record.moduleGraph.validation?.violations||['VESSEL-03 module graph validation failed.']));
      if(record.moduleGraph.vesselInstanceId!==c?.identifiers?.vesselInstanceId)violations.push('Module graph vessel identifier does not match the canonical contract.');
      const moduleMass=(record.moduleGraph.modules||[]).reduce((sum,module)=>sum+(Number(module.massTonnes)||0),0),moduleVolume=(record.moduleGraph.modules||[]).reduce((sum,module)=>sum+(Number(module.volumeM3)||0),0);
      if(Math.abs(moduleMass-(Number(record?.hull?.totalMassTonnes)||0))>Math.max(1,moduleMass)*1e-9)violations.push('Module graph mass does not close against the vessel.');
      if(Math.abs(moduleVolume-(Number(record?.hull?.totalVolumeM3)||0))>Math.max(1,moduleVolume)*1e-9)violations.push('Module graph volume does not close against the vessel.');
    }
    if(!c?.technology?.validation?.valid)violations.push(...(c?.technology?.validation?.violations||[]));
    if(!c?.condition?.validation?.valid)violations.push(...(c?.condition?.validation?.violations||[]));
    if(c?.condition?.axes?.destructionPercent===100&&c?.condition?.coherentVesselGraph!==false)violations.push('Destroyed vessel retained coherent graph.');
    const mass=(record?.hull?.massBudget||[]).reduce((sum,row)=>sum+(Number(row.massTonnes)||0),0);if(Math.abs(mass-(Number(record?.hull?.totalMassTonnes)||0))>Math.max(1,Math.abs(mass))*1e-9)violations.push('Mass ledger does not close.');
    return{valid:!violations.length,violations};
  }

  function apply(seed,input,source,result){
    if(result.contract?.schemaVersion===SCHEMA&&result.version===3)return result;
    const sourceVersion=Number(result.version)||1,seeds=seedRecord(seed,result,source),ids=identifiers(seeds,result,source),tech=technology(seed,input,result),state=condition(input,result),time=result.generatedAt||new Date().toISOString(),moduleReady=Boolean(result.moduleGraph?.validation?.valid),engineeringReady=Boolean(result.engineeringLedger);
    result.version=3;
    result.contract={recordType:'exoVessel',schemaVersion:SCHEMA,contractVersion:1,revision:1,createdAt:time,updatedAt:time,identifiers:ids,seeds,technology:tech,condition:state,derivedLayers:layers(result),provenance:{generatorId:'blacklight-exo-vessel-generator',generatorVersion:moduleReady?'3.3.0':engineeringReady?'3.2.0':'3.1.0',sourceRecordVersion:sourceVersion,sourceType:source?.type||result.source?.type||'standalone',registry:'data/exo-vessel/vessel-contract-registry.json',governingGuide:'EXO_VESSEL_SYSTEM_DESIGN_GUIDE.md',schema:'data/schemas/exo-vessel-record.schema.json',migrationRegistry:'data/exo-vessel/migrations.json',manufacturerGeneratorVersion:result.manufacturer?.provenance?.generatorVersion||null,engineeringLedgerVersion:result.engineeringLedger?.schemaVersion||null,engineeringRegistry:engineeringReady?'data/exo-vessel/engineering-registry.json':null,moduleGraphVersion:moduleReady?result.moduleGraph.schemaVersion:null,moduleGraphRegistry:moduleReady?'data/exo-vessel/module-graph-registry.json':null},migration:{policyVersion:SCHEMA,history:[{migrationId:`exo-vessel-v${sourceVersion}-to-contract-${SCHEMA}`,fromRecordVersion:sourceVersion,toRecordVersion:3,toSchemaVersion:SCHEMA,strategy:'append-only-envelope',preservedUnknownFields:true}]},validation:{valid:true,violations:[]},extensions:{engineeringLedgerSchema:engineeringReady?'data/schemas/exo-vessel-engineering-ledger.schema.json':null,moduleGraphSchema:moduleReady?'data/schemas/exo-vessel-module-graph.schema.json':null}};
    Object.assign(result.identity,ids,{technologyBand:tech.principalBand});
    if(result.manufacturer){result.manufacturer.speciesId=ids.speciesId;result.manufacturer.organizationId=ids.organizationId;result.manufacturer.manufacturerId=ids.manufacturerId;}
    result.condition=clone(state);
    result.contract.validation=validate(result);
    result.warnings=[...(result.warnings||[]),`Canonical contract ${SCHEMA} assigns ${tech.principalBand} as the vessel-wide technology band; every subsystem remains within ±0.30.`,`Condition ${state.template} is schema-only until the condition and damage phase applies it to vessel graphs.`];
    return result;
  }

  const generate=(seed,input={},source=null)=>apply(String(seed||input.seed||'vessel'),input,source,base.generate(String(seed||input.seed||'vessel'),input,source));
  const migrate=(record,input={},source=null)=>{if(!record||typeof record!=='object')throw new Error('A vessel record is required.');const copy=clone(record);if(copy.contract?.schemaVersion===SCHEMA&&copy.version===3){copy.contract.validation=validate(copy);return copy;}return apply(String(copy.seed||input.seed||'migrated-vessel'),input,source,copy);};
  const contracts=Object.freeze({schemaVersion:SCHEMA,contractVersion:1,technologyBands:BANDS,withinBandVariants:Object.entries(VARIANTS).map(([key,offset])=>({key,offset})),seedHierarchy:SEEDS,conditionAxes:Object.keys(AXES),conditionTemplates:CONDITIONS,serviceDoctrines:['CIVILIAN','MERCHANT','PASSENGER','INDUSTRIAL','SCIENTIFIC','COLONIAL','GOVERNMENT','PARAMILITARY','MILITARY','PIRATE_OR_IRREGULAR','ABANDONED_OR_UNKNOWN'],derivedLayers:LAYERS,registryPath:'data/exo-vessel/vessel-contract-registry.json',migrationRegistryPath:'data/exo-vessel/migrations.json',engineeringRegistryPath:'data/exo-vessel/engineering-registry.json',moduleGraphRegistryPath:'data/exo-vessel/module-graph-registry.json',schemas:{record:'data/schemas/exo-vessel-record.schema.json',manufacturer:'data/schemas/exo-vessel-manufacturer.schema.json',condition:'data/schemas/exo-vessel-condition.schema.json',module:'data/schemas/exo-vessel-module.schema.json',engineering:'data/schemas/exo-vessel-engineering-ledger.schema.json',moduleGraph:'data/schemas/exo-vessel-module-graph.schema.json'},validate,migrate});
  globalThis.BlacklightExoVesselContracts=contracts;
  globalThis.BlacklightExoVessel=Object.freeze({...base,version:3,contractVersion:1,schemaVersion:SCHEMA,contracts,generate,migrateRecord:migrate,validateContract:validate});
})();