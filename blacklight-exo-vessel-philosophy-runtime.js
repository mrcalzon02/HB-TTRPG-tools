(() => {
  'use strict';
  const base=globalThis.BlacklightExoVessel;
  const P=globalThis.BlacklightExoVesselPhilosophyDefinitions;
  if(!base||!P||base.philosophyVersion)return;

  const profileMap=Object.fromEntries(P.archetypes.map(item=>[item.key,item]));
  const philosophyMap=P.philosophies;
  const roleMap=Object.fromEntries((base.roles||[]).map(item=>[item.key,item]));
  const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
  const finite=(value,fallback=0)=>Number.isFinite(Number(value))?Number(value):fallback;
  const clone=value=>value==null?value:structuredClone(value);
  const fmt=(value,digits=2)=>finite(value).toLocaleString(undefined,{maximumFractionDigits:digits});
  function hash(value){let state=2166136261;for(const char of String(value)){state^=char.charCodeAt(0);state=Math.imul(state,16777619);}return state>>>0;}
  const unit=seed=>hash(seed)/4294967295;
  const domValue=id=>globalThis.document?.getElementById?.(id)?.value||null;
  const sourceDossier=source=>source?.dossier||source?.biology||null;

  function manufacturerProfile(result){
    const manufacturer=result.manufacturer;
    if(!manufacturer)return null;
    const archetype=profileMap[manufacturer.archetype?.key]||profileMap.CORP_LOGISTICS;
    return{
      ...archetype,
      label:manufacturer.name,
      archetypeLabel:archetype.label,
      manufacturerId:manufacturer.manufacturerId,
      manufacturerName:manufacturer.name,
      designationPrefix:manufacturer.namingGrammar?.designationPrefix,
      internalsBias:finite(manufacturer.architecture?.internalsBias,archetype.internalsBias),
      evaBias:finite(manufacturer.architecture?.evaBias,archetype.evaBias),
      material:manufacturer.architecture?.primaryStructuralMaterial||archetype.material,
      variance:finite(manufacturer.architecture?.allowedDeviationVariance,archetype.variance),
      standardization:finite(manufacturer.production?.standardization,archetype.standardization),
      modularity:finite(manufacturer.production?.modularity,.5),
      qualityControl:finite(manufacturer.production?.qualityControl,.5),
      description:manufacturer.doctrine?.production||archetype.description,
      focusKey:manufacturer.archetype?.focusKey||null,
      focusLabel:manufacturer.archetype?.focusLabel||null
    };
  }

  function inferArchetype(input,result,source){
    const generated=manufacturerProfile(result);
    if(generated)return{profile:generated,reason:`${generated.manufacturerName} was generated from the originating species and organization. Its ${generated.archetypeLabel} ancestry supplies the cultural baseline while its own production focus controls the actual architecture weights.`};
    const explicit=input.manufacturerProfile||domValue('exo-vessel-archetype');
    if(explicit&&explicit!=='inherit'&&profileMap[explicit])return{profile:profileMap[explicit],reason:'The manufacturer archetype was selected explicitly.'};
    const dossier=sourceDossier(source),species=dossier?.species||{},civilization=dossier?.civilization||{},system=dossier?.system||{},role=result.identity?.roleKey||input.role||'explorer';
    const text=[species.environment,species.bodyPlan,species.adaptation,species.cognition,civilization.government,civilization.economy,civilization.warfare,system.state,system.economy,role].join(' ').toLowerCase();
    let key;
    if(/military|warship|warlord|fortress|siege|contested|orbital denial|fleet doctrine/.test(text))key='APEX_WARLORD';
    else if(/corporate|commercial|merchant|tanker|logistics|standardized|concession|export economy|traffic/.test(text))key='CORP_LOGISTICS';
    else if(/scaveng|salvage|nomad|migrat|decentral|clan|distributed|frontier|departed/.test(text))key='VOID_NOMAD';
    else if(/subterranean|high-gravity|high-pressure|icebound|pressure|vault|custodian|continuity|colony|passenger/.test(text))key='VAULT_KEEPER';
    else key=({warship:'APEX_WARLORD',merchant:'CORP_LOGISTICS',tanker:'CORP_LOGISTICS',courier:'CORP_LOGISTICS',explorer:'VOID_NOMAD',science:'VAULT_KEEPER',passenger:'VAULT_KEEPER',colony:'VAULT_KEEPER'})[role]||'CORP_LOGISTICS';
    return{profile:profileMap[key],reason:`The ${profileMap[key].label} profile was inferred from the originating biology, government, economy, warfare doctrine, and ${result.identity?.role||role} mission.`};
  }

  function resolveBias(seed,input,result,source){
    const inferred=inferArchetype(input,result,source),profile=inferred.profile;
    const override=String(input.designEnvelope||domValue('exo-vessel-envelope')||'AUTO').toUpperCase();
    let internalBias=clamp(profile.internalsBias+(unit(`${seed}:architecture-variance`)-.5)*2*profile.variance,.02,.98);
    if(override==='INTERNAL')internalBias=.98;
    else if(override==='EVA')internalBias=.02;
    else if(override==='HYBRID')internalBias=.50;
    return{profile,reason:inferred.reason,override,internalBias,evaBias:1-internalBias};
  }

  function moduleProbability(rowKey,bias){
    const internalNudge={drive:.08,'drive-integration':.06,power:.08,'life-support':.24,navigation:.12,shielding:.10,maintenance:.04,structure:.12,fuel:-.10,payload:-.14,thermal:-.12,maneuver:-.10,margin:-.04}[rowKey]||0;
    let value=bias.internalBias+internalNudge;
    if(bias.profile.key==='APEX_WARLORD'&&['drive','drive-integration','power','navigation','shielding'].includes(rowKey))value+=.07;
    if(bias.profile.key==='CORP_LOGISTICS'&&['fuel','payload','thermal','maneuver'].includes(rowKey))value-=.10;
    if(bias.profile.key==='VOID_NOMAD'&&rowKey!=='life-support')value-=.08;
    if(bias.profile.key==='VAULT_KEEPER'&&['life-support','maintenance','structure'].includes(rowKey))value+=.08;
    if(finite(bias.profile.modularity,.5)>.7&&['fuel','payload','thermal','maneuver','maintenance'].includes(rowKey))value-=.05;
    if(bias.profile.focusKey==='CONTINUITY'&&['structure','life-support','navigation'].includes(rowKey))value+=.04;
    if(bias.profile.focusKey==='FRONTIER'&&rowKey!=='life-support')value-=.04;
    return clamp(value,.01,.99);
  }

  function selectEnvelope(seed,rowKey,bias){
    if(bias.override==='INTERNAL')return'INTERNAL';
    if(bias.override==='EVA')return'EVA';
    return unit(`${seed}:module:${rowKey}`)<moduleProbability(rowKey,bias)?'INTERNAL':'EVA';
  }

  function inventoryFloor(row,result){
    if(row.key==='drive')return finite(result.drive?.apparatusMassTonnes,row.massTonnes);
    if(row.key==='fuel')return finite(result.fuel?.carriedFuelTonnes,0);
    if(row.key==='life-support')return finite(result.lifeSupport?.mediumMassTonnes)+finite(result.lifeSupport?.solventReserveTonnes)+finite(result.lifeSupport?.nutritionTonnes);
    if(row.key==='thermal')return finite(result.thermal?.coolantTonnes,0);
    if(row.key==='payload')return finite(row.massTonnes)*.80;
    return 0;
  }

  const classify=ratio=>ratio>=.65?'INTERNAL':ratio<=.35?'EVA':'HYBRID';
  const archetypePrefix=key=>({VAULT_KEEPER:'VK',VOID_NOMAD:'VN',CORP_LOGISTICS:'CL',APEX_WARLORD:'AW'})[key]||'EX';
  const designationPrefix=profile=>profile.designationPrefix||archetypePrefix(profile.key);

  function coreInterpretation(classification,profile,internalRatio){
    const percentage=fmt(internalRatio*100,1);
    if(classification==='INTERNAL')return`I classify this as an Internals-first vessel: ${percentage}% of modeled subsystem volume is enclosed by the pressure-vault and internal-service philosophy. ${profile.label} design doctrine treats the ship as one inhabited armored machine, so the hull belt, compartmentation, and protected utility trunks are allowed to become heavier than the exposed machinery they replace.`;
    if(classification==='EVA')return`I classify this as an EVA-first vessel: ${fmt((1-internalRatio)*100,1)}% of modeled subsystem volume is attached as vacuum-native machinery. ${profile.label} doctrine protects the crew nucleus and treats the surrounding ship as a modular industrial truss whose tanks, radiators, processors, cargo, and propulsion units are expected to be serviced from outside.`;
    return`I classify this as a hybrid vessel: ${percentage}% of modeled subsystem volume is internal and ${fmt((1-internalRatio)*100,1)}% is vacuum-exposed. ${profile.label} doctrine buries crew-critical and catastrophic-failure systems while placing high-turnover, high-heat, bulky, or expendable systems on external rails and trusses.`;
  }

  function geometry(volumeM3,shape){
    const ratioH=.72,beam=Math.cbrt(Math.max(1,volumeM3)/(Math.PI/6*Math.max(2,shape)*ratioH));
    return{lengthM:beam*shape,beamM:beam,heightM:beam*ratioH,decks:Math.max(1,Math.round(beam*ratioH/4.2)),surfaceAreaM2:Math.PI*beam*(beam*shape+beam*ratioH)*.74};
  }

  function formatMass(tonnes){
    const value=Math.max(0,finite(tonnes));
    if(value>=1e12)return`${fmt(value/1e12,3)} trillion tonnes`;
    if(value>=1e9)return`${fmt(value/1e9,3)} billion tonnes`;
    if(value>=1e6)return`${fmt(value/1e6,3)} million tonnes`;
    if(value>=1e3)return`${fmt(value/1e3,3)} thousand tonnes`;
    if(value>=1)return`${fmt(value,3)} tonnes`;
    return`${fmt(value*1000,3)} kg`;
  }

  function apply(seed,input,source,result){
    const bias=resolveBias(seed,input,result,source),baseline=clone(result.hull.massBudget||[]);
    const assignments=baseline.map(row=>{
      const module=P.moduleTypes[row.key]||{label:row.label,internalForm:'Internal machinery compartment',evaForm:'External machinery pod',internalTag:'ROUTING: INTERNAL',evaTag:'ROUTING: EVA',crewDependent:false};
      const envelope=selectEnvelope(seed,row.key,bias),philosophy=philosophyMap[envelope];
      const floor=Math.min(finite(row.massTonnes),Math.max(0,inventoryFloor(row,result))),affected=Math.max(0,finite(row.massTonnes)-floor);
      const adjustedMass=floor+affected*philosophy.massMultiplier,adjustedVolume=finite(row.volumeM3)*philosophy.volumeMultiplier,parentId=envelope==='INTERNAL'?`pressure-vault-${row.key}`:`vacuum-truss-${row.key}`;
      return{...row,baselineMassTonnes:finite(row.massTonnes),baselineVolumeM3:finite(row.volumeM3),physicalInventoryFloorTonnes:floor,architectureAffectedMassTonnes:affected,massTonnes:adjustedMass,volumeM3:adjustedVolume,moduleType:module.label,envelope,concreteForm:envelope==='INTERNAL'?module.internalForm:module.evaForm,germinationTag:envelope==='INTERNAL'?module.internalTag:module.evaTag,attachment:{parentId,requiredProperty:philosophy.attachmentProperty,parentProperties:[philosophy.attachmentProperty,envelope==='INTERNAL'?'PRESSURIZED_ACCESS':'REMOTE_SERVICEABLE'],valid:true},crewDependent:module.crewDependent,utilityRouting:philosophy.utilityRouting,structuralEnvelope:philosophy.structuralEnvelope,modifiers:{massMultiplier:philosophy.massMultiplier,volumeMultiplier:philosophy.volumeMultiplier,armorEfficiency:philosophy.armorEfficiency,repairTimeMultiplier:philosophy.repairTimeMultiplier,cascadeRisk:philosophy.cascadeRisk,cascadeRiskIndex:philosophy.cascadeRiskIndex,thermalSignatureMultiplier:philosophy.thermalSignatureMultiplier},repairTimeIndex:philosophy.repairTimeMultiplier,thermalSignatureIndex:philosophy.thermalSignatureMultiplier,effectiveArmorIndex:philosophy.armorEfficiency,note:`${row.note} Architectural form: ${envelope==='INTERNAL'?module.internalForm:module.evaForm}; ${envelope==='INTERNAL'?module.internalTag:module.evaTag}.`};
    });

    const totalMass=assignments.reduce((sum,row)=>sum+row.massTonnes,0),totalVolume=assignments.reduce((sum,row)=>sum+row.volumeM3,0);
    const internalVolume=assignments.filter(row=>row.envelope==='INTERNAL').reduce((sum,row)=>sum+row.volumeM3,0),internalMass=assignments.filter(row=>row.envelope==='INTERNAL').reduce((sum,row)=>sum+row.massTonnes,0);
    const internalRatio=internalVolume/Math.max(1e-12,totalVolume),classification=classify(internalRatio),weighted=field=>assignments.reduce((sum,row)=>sum+row.massTonnes*finite(row.modifiers[field],1),0)/Math.max(1e-12,totalMass);
    const repairMultiplier=weighted('repairTimeMultiplier'),cascadeIndex=weighted('cascadeRiskIndex'),thermalSignature=weighted('thermalSignatureMultiplier'),armorEfficiency=weighted('armorEfficiency');
    const role=roleMap[result.identity?.roleKey]||roleMap.explorer||{shape:5},shape=classification==='INTERNAL'?Math.max(3.2,role.shape*.84):classification==='EVA'?role.shape*1.28:role.shape,hullGeometry=geometry(totalVolume,shape);
    const baseMass=baseline.reduce((sum,row)=>sum+finite(row.massTonnes),0),baseVolume=baseline.reduce((sum,row)=>sum+finite(row.volumeM3),0),massFactor=totalMass/Math.max(1e-12,baseMass),volumeFactor=totalVolume/Math.max(1e-12,baseVolume);
    const maintainability=clamp(100*(1/repairMultiplier)*(.72+bias.profile.standardization*.28),10,100),productionCostFactor=massFactor*(.72+volumeFactor*.28)*(1.12-bias.profile.standardization*.18)*(1+(finite(bias.profile.qualityControl,.5)-.5)*.08);
    const code=`${designationPrefix(bias.profile)}-${classification==='INTERNAL'?'INT':classification==='EVA'?'EVA':'HYB'}-${Math.round(internalRatio*100).toString().padStart(2,'0')}`;
    const dossier=sourceDossier(source),originSpecies=dossier?.species?.name||result.lifeSupport?.profile?.sourceSpecies||'unidentified originating species',originOrganization=dossier?.civilization?.government||dossier?.civilization?.economy||result.manufacturer?.provenance?.sourceOrganization||bias.profile.label;

    result.version=2;
    result.identity.designationCode=code;
    result.identity.designPhilosophy=`${classification==='INTERNAL'?'Internals-first':classification==='EVA'?'EVA-first':'Hybrid'} · ${bias.profile.label}`;
    result.identity.name=`${result.identity.name} [${code}]`;
    Object.assign(result.hull,{baselineMassTonnes:baseMass,baselineVolumeM3:baseVolume,totalMassTonnes:totalMass,totalVolumeM3:totalVolume,lengthM:hullGeometry.lengthM,beamM:hullGeometry.beamM,heightM:hullGeometry.heightM,decks:hullGeometry.decks,surfaceAreaM2:hullGeometry.surfaceAreaM2,averageDensityTonnesM3:totalMass/Math.max(1e-12,totalVolume),massBalanceErrorTonnes:totalMass-assignments.reduce((sum,row)=>sum+row.massTonnes,0),massBudget:assignments.map(row=>({...row,massPercent:row.massTonnes/totalMass*100,massText:formatMass(row.massTonnes),volumeText:`${fmt(row.volumeM3,1)} m³`})),totalMassText:formatMass(totalMass),dryMassTonnes:totalMass-finite(result.fuel?.carriedFuelTonnes)});

    const rowMap=Object.fromEntries(assignments.map(row=>[row.key,row]));
    result.drive.apparatusMassTonnes=rowMap.drive?.massTonnes||result.drive.apparatusMassTonnes;
    result.drive.integratedDriveMassTonnes=finite(rowMap.drive?.massTonnes)+finite(rowMap['drive-integration']?.massTonnes);
    result.drive.driveFractionPercent=result.drive.integratedDriveMassTonnes/totalMass*100;
    result.drive.apparatusVolumeM3=rowMap.drive?.volumeM3||result.drive.apparatusVolumeM3;
    result.drive.serviceVolumeM3=finite(rowMap.drive?.volumeM3)+finite(rowMap['drive-integration']?.volumeM3);
    if(result.power)result.power.generationPlantTonnes=rowMap.power?.massTonnes||result.power.generationPlantTonnes;
    if(result.fuel){result.fuel.architectureAdjustedSystemTonnes=rowMap.fuel?.massTonnes;result.fuel.containmentAndTransferTonnes=Math.max(0,finite(rowMap.fuel?.massTonnes)-finite(result.fuel.carriedFuelTonnes));result.fuel.totalFuelSystemTonnes=rowMap.fuel?.massTonnes;}
    if(result.thermal)result.thermal.totalThermalTonnes=rowMap.thermal?.massTonnes||result.thermal.totalThermalTonnes;
    if(result.lifeSupport){result.lifeSupport.massTonnes=rowMap['life-support']?.massTonnes||result.lifeSupport.massTonnes;result.lifeSupport.volumeM3=rowMap['life-support']?.volumeM3||result.lifeSupport.volumeM3;}
    if(result.protection){result.protection.shieldMassTonnes=rowMap.shielding?.massTonnes||result.protection.shieldMassTonnes;result.protection.architecturalArmorEfficiency=armorEfficiency;}
    if(result.navigation)result.navigation.independentSensorMassTonnes=rowMap.navigation?.massTonnes||result.navigation.independentSensorMassTonnes;
    if(result.maintenance){result.maintenance.totalMaintenanceTonnes=rowMap.maintenance?.massTonnes||result.maintenance.totalMaintenanceTonnes;result.maintenance.baselineHoursPerJump=result.maintenance.estimatedHoursPerJump;result.maintenance.estimatedHoursPerJump*=repairMultiplier;result.maintenance.estimatedHoursPerJumpText=`${fmt(result.maintenance.estimatedHoursPerJump,1)} technician-hours`;result.maintenance.architecturalMaintainabilityRating=maintainability;}

    const actualManufacturer=result.manufacturer;
    result.designation={code,full:`${code} ${result.identity.role}`,originManufacturerId:actualManufacturer?.manufacturerId||null,originManufacturer:actualManufacturer?.name||bias.profile.label,originArchetypeKey:bias.profile.key,originArchetype:bias.profile.archetypeLabel||profileMap[bias.profile.key]?.label||bias.profile.label,originSpecies,originOrganization,primaryStructuralMaterial:bias.profile.material,allowedDeviationVariance:bias.profile.variance,classification,internalsPercent:internalRatio*100,evaPercent:(1-internalRatio)*100,coreInterpretation:coreInterpretation(classification,bias.profile,internalRatio)};
    result.designPhilosophy={version:1,profile:clone(bias.profile),inferenceReason:bias.reason,requestedEnvelope:bias.override,seededInternalsBias:bias.internalBias,seededEvaBias:bias.evaBias,classification,internalsVolumePercent:internalRatio*100,evaVolumePercent:(1-internalRatio)*100,internalsMassPercent:internalMass/Math.max(1e-12,totalMass)*100,evaMassPercent:(1-internalMass/Math.max(1e-12,totalMass))*100,pressurizedVolumeM3:internalVolume,unpressurizedTrussVolumeM3:totalVolume-internalVolume,globalResults:{massFactor,volumeFactor,armorEfficiency,repairTimeMultiplier:repairMultiplier,cascadingDamageRiskIndex:cascadeIndex,cascadingDamageRisk:cascadeIndex>.62?'high':cascadeIndex>.38?'moderate':'low',thermalSignatureMultiplier:thermalSignature,productionCostFactor,maintainabilityRating:maintainability,standardizationIndex:bias.profile.standardization,modularityIndex:finite(bias.profile.modularity,.5),qualityControlIndex:finite(bias.profile.qualityControl,.5)},selectedImplications:{principle:classification==='INTERNAL'?philosophyMap.INTERNAL.principle:classification==='EVA'?philosophyMap.EVA.principle:'Crew-critical systems follow the Internals-first rule while high-turnover, bulky, hot, or expendable systems follow the EVA-first rule.',benefits:classification==='INTERNAL'?philosophyMap.INTERNAL.benefits:classification==='EVA'?philosophyMap.EVA.benefits:[...philosophyMap.INTERNAL.benefits.slice(0,2),...philosophyMap.EVA.benefits.slice(0,2)],tradeoffs:classification==='INTERNAL'?philosophyMap.INTERNAL.tradeoffs:classification==='EVA'?philosophyMap.EVA.tradeoffs:[...philosophyMap.INTERNAL.tradeoffs.slice(0,2),...philosophyMap.EVA.tradeoffs.slice(0,2)]},comparison:{INTERNAL:clone(philosophyMap.INTERNAL),EVA:clone(philosophyMap.EVA)},baselineMassBudget:baseline,moduleAssignments:assignments.map(row=>({key:row.key,label:row.label,moduleType:row.moduleType,envelope:row.envelope,concreteForm:row.concreteForm,germinationTag:row.germinationTag,attachment:row.attachment,crewDependent:row.crewDependent,utilityRouting:row.utilityRouting,structuralEnvelope:row.structuralEnvelope,baselineMassTonnes:row.baselineMassTonnes,finalMassTonnes:row.massTonnes,baselineVolumeM3:row.baselineVolumeM3,finalVolumeM3:row.volumeM3,physicalInventoryFloorTonnes:row.physicalInventoryFloorTonnes,modifiers:row.modifiers})),hardpointRules:[{envelope:'INTERNAL',requiredParentProperty:'ATMOSPHERE_MANIFOLD',rule:'An INTERNAL module must descend from a pressure-vault component carrying ATMOSPHERE_MANIFOLD and protected access.'},{envelope:'EVA',requiredParentProperty:'VACUUM_EXPOSED',rule:'An EVA module may attach directly to a structural hardpoint carrying VACUUM_EXPOSED and remote-service capability.'}],attachmentValidation:{valid:assignments.every(row=>row.attachment.valid&&row.attachment.parentProperties.includes(row.attachment.requiredProperty)),invalidModules:assignments.filter(row=>!row.attachment.valid||!row.attachment.parentProperties.includes(row.attachment.requiredProperty)).map(row=>row.key)},germinationSequence:P.germinationSequence.map(step=>({...step,status:'complete'}))};
    if(actualManufacturer){actualManufacturer.realizedArchitecture={classification,internalsVolumePercent:internalRatio*100,evaVolumePercent:(1-internalRatio)*100,massFactor,volumeFactor,maintainabilityRating:maintainability,thermalSignatureMultiplier:thermalSignature,productionCostFactor};}
    result.warnings=[...(result.warnings||[]),`The ${code} designation records ${actualManufacturer?.name||bias.profile.label}, its ${bias.profile.archetypeLabel||bias.profile.label} ancestry, and the ${classification} envelope—not merely the vessel mission class.`,`Architecture adjusted the supportable mass from ${formatMass(baseMass)} to ${formatMass(totalMass)} while preserving the unmodified baseline ledger for audit.`,classification==='INTERNAL'?'Internals-first protection reduces exposed machinery and infrared presentation, but service access and cascading atmosphere/fire risk are materially worse.':classification==='EVA'?'EVA-first modularity reduces replacement time and cascading damage, but external hardpoints, conduits, and thermal emissions are easier to detect and damage.':'Hybrid architecture inherits both rule sets; every module must retain its assigned pressure-manifold or vacuum-hardpoint parent.'].filter(Boolean);
    return result;
  }

  function generate(seed,input={},source=null){return apply(String(seed||input.seed||'vessel'),input,source,base.generate(seed,input,source));}
  globalThis.BlacklightExoVessel=Object.freeze({...base,version:2,philosophyVersion:1,manufacturerProfiles:P.archetypes,designPhilosophies:P.philosophies,modulePhilosophyDefinitions:P.moduleTypes,generate});
})();