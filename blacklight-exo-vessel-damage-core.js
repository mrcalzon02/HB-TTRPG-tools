(() => {
  'use strict';
  if(globalThis.BlacklightExoVesselDamageCore)return;
  const D=globalThis.BlacklightExoVesselDamageDefinitions;if(!D)return;
  const finite=(v,f=0)=>Number.isFinite(Number(v))?Number(v):f;
  const clamp=(v,a=0,b=100)=>Math.max(a,Math.min(b,finite(v,a)));
  const clone=v=>v==null?v:structuredClone(v);
  const sum=(rows,key)=>rows.reduce((n,row)=>n+finite(row[key]),0);
  const unique=rows=>[...new Set(rows.filter(Boolean))];
  function hash(v){let n=2166136261;for(const c of String(v)){n^=c.charCodeAt(0);n=Math.imul(n,16777619);}return n>>>0;}
  const unit=v=>hash(v)/4294967295;
  const slug=v=>(String(v||'damage').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,54)||'damage');
  const stableId=(prefix,...parts)=>`${prefix}-${slug(parts.join('-'))}-${hash(parts.join(':')).toString(16).padStart(8,'0')}`;
  const dom=id=>globalThis.document?.getElementById?.(id)?.value??null;
  const emptyEffects=()=>({events:[],moduleEffects:[],routeEffects:[],zoneEffects:[],crewEffects:{exposedCrewPercent:0,casualtyPotentialPercent:0,habitatAuthorityLost:false,damageControlMitigationPercent:0},detachedModuleIds:[]});

  function scenario(input={}){
    const read=(key,id,fallback)=>input[key]??dom(id)??fallback;
    const record={
      incomingWeaponFamily:String(read('incomingWeaponFamily','exo-vessel-damage-weapon',D.defaults.incomingWeaponFamily)).toUpperCase(),
      damageBand:String(read('damageBand','exo-vessel-damage-band',D.defaults.damageBand)),
      impactFacing:String(read('impactFacing','exo-vessel-damage-facing',D.defaults.impactFacing)).toUpperCase(),
      salvoCount:Math.max(1,Math.round(finite(read('salvoCount','exo-vessel-damage-salvo',D.defaults.salvoCount),1))),
      attackIntensityPercent:clamp(read('attackIntensityPercent','exo-vessel-damage-intensity',D.defaults.attackIntensityPercent)),
      targetEvasionPercent:clamp(read('targetEvasionPercent','exo-vessel-damage-evasion',D.defaults.targetEvasionPercent)),
      damageControlPercent:clamp(read('damageControlPercent','exo-vessel-damage-control',D.defaults.damageControlPercent))
    };
    if(record.impactFacing!=='AUTO'&&!D.facings.includes(record.impactFacing))throw new Error(`Unknown VESSEL-08 impact facing ${record.impactFacing}.`);
    if(!D.damageBands.includes(record.damageBand))throw new Error(`Unknown VESSEL-08 engagement band ${record.damageBand}.`);
    return record;
  }

  function selectEngagement(result,s,seed){
    const all=result.weaponEngagementModel?.engagements||[];
    let rows=s.incomingWeaponFamily==='AUTO'?all:all.filter(x=>x.weaponFamily===s.incomingWeaponFamily);
    if(!rows.length)rows=all;if(!rows.length)return null;
    const ready=rows.filter(x=>x.operationalState?.ready&&x.bands?.[s.damageBand]?.rangeM>0),pool=ready.length?ready:rows;
    return pool[Math.floor(unit(`${seed}:engagement`)*pool.length)%pool.length];
  }
  function resolveFacing(s,engagement,seed){
    if(D.facings.includes(s.impactFacing))return s.impactFacing;
    const native=String(engagement?.facing||'').toUpperCase();
    return D.facings.includes(native)?native:D.facings[Math.floor(unit(`${seed}:facing`)*D.facings.length)%D.facings.length];
  }
  function resolveIntercept(engagement,s,seed){
    if(!engagement)return{outcome:'NO_SOLUTION',resolved:false,impactProbabilityPercent:0,rollPercent:100,defenseRollPercent:100,reason:'No installed VESSEL-07 weapon engagement exists.'};
    const band=engagement.bands?.[s.damageBand];
    if(!band||band.rangeM<=0||!['AVAILABLE','PHYSICALLY_REACHABLE'].includes(band.status))return{outcome:'NO_SOLUTION',resolved:false,impactProbabilityPercent:0,rollPercent:100,defenseRollPercent:100,reason:`The ${s.damageBand} engagement band is unavailable.`};
    const survival=clamp(band.activeDefenseSurvivalPercent),quality=clamp(band.solutionQualityPercent),intensity=.45+.55*s.attackIntensityPercent/100;
    const probability=clamp(quality*survival/100*intensity-s.targetEvasionPercent*.32,0,97),roll=unit(`${seed}:impact`)*100,defenseRoll=unit(`${seed}:defense`)*100;
    const interceptable=['GUIDED_MISSILE','GUIDED_INTERCEPTOR','KINETIC_GUIDED'].includes(engagement.performance?.mode);
    if(interceptable&&defenseRoll>survival)return{outcome:'INTERCEPTED',resolved:true,impactProbabilityPercent:probability,rollPercent:roll,defenseRollPercent:defenseRoll,reason:'Modeled active defense defeated the incoming weapon before local impact.'};
    if(roll<=probability)return{outcome:'IMPACT',resolved:true,impactProbabilityPercent:probability,rollPercent:roll,defenseRollPercent:defenseRoll,reason:'The deterministic intercept roll entered occupied target volume.'};
    if(roll<=Math.min(100,probability+18))return{outcome:'NEAR_MISS',resolved:true,impactProbabilityPercent:probability,rollPercent:roll,defenseRollPercent:defenseRoll,reason:'The attack crossed the local envelope but missed occupied target volume.'};
    return{outcome:'MISS',resolved:true,impactProbabilityPercent:probability,rollPercent:roll,defenseRollPercent:defenseRoll,reason:'Track, maneuver, dispersion, or terminal error displaced the attack.'};
  }

  function surfaceDistance(bounds,facing,grid){
    const m={x:grid.size.x-1,y:grid.size.y-1,z:grid.size.z-1};
    return facing==='FORE'?m.x-bounds.max.x:facing==='AFT'?bounds.min.x:facing==='LEFT'?bounds.min.y:facing==='RIGHT'?m.y-bounds.max.y:facing==='UP'?m.z-bounds.max.z:bounds.min.z;
  }
  function chooseImpact(result,facing,seed){
    const grid=result.voxelLayout?.grid,placements=result.voxelLayout?.modulePlacements||[];if(!grid)return null;
    const voxels=new Map((result.conditionHistory?.voxelStates||[]).map(x=>[x.placementId,x])),modules=new Map((result.moduleGraph?.modules||[]).map(x=>[x.moduleId,x]));
    const rows=placements.map(p=>({p,v:voxels.get(p.placementId),m:modules.get(p.moduleId)})).filter(x=>x.v?.occupied&&x.v?.residualMaterial!==false).map(x=>{
      const distance=Math.max(0,surfaceDistance(x.p.bounds,facing,grid)),external=x.m?.architecture==='EVA'||x.m?.installationEnvironment==='VACUUM_EXPOSED'||['WEAPON','SENSOR','THERMAL_CONTROL','COUNTERMEASURE','ACTIVE_PROTECTION','MAIN_ENGINE'].includes(x.m?.semanticType),weight=(external?1.7:1)*(1+.28*(D.semanticCriticality[x.m?.semanticType]||1))/(1+distance*.8);return{...x,distance,weight};
    }).sort((a,b)=>a.distance-b.distance||b.weight-a.weight||a.p.placementId.localeCompare(b.p.placementId));
    if(!rows.length)return null;const near=rows.filter(x=>x.distance<=rows[0].distance+2),total=near.reduce((n,x)=>n+x.weight,0),target=unit(`${seed}:placement`)*total;let n=0,pick=near.at(-1);for(const row of near){n+=row.weight;if(n>=target){pick=row;break;}}
    return{placementId:pick.p.placementId,moduleId:pick.p.moduleId,bounds:clone(pick.p.bounds),voxelType:pick.p.voxelType,semanticType:pick.m?.semanticType||pick.p.semanticType,architecture:pick.m?.architecture||pick.m?.installationEnvironment||'UNKNOWN',surfaceDistanceCells:pick.distance};
  }

  function incidentEnergy(engagement,s){
    const p=engagement?.performance||{},a=engagement?.installedAllocation||{},mass=Math.max(1,finite(p.roundMassKg,finite(a.unitRoundMassTonnes)*1000||250)),scale=s.salvoCount*Math.max(.05,s.attackIntensityPercent/100);
    if(p.mode==='DIRECTED_ENERGY')return Math.max(0,finite(p.availablePowerW)*finite(p.effectiveDwellSeconds)*scale);
    if(p.mode==='GUIDED_MISSILE'||p.mode==='GUIDED_INTERCEPTOR'){const v=Math.max(100,finite(p.deltaVMps)+finite(p.accelerationMps2)*Math.min(finite(p.burnSeconds),12));return(.5*mass*v*v+mass*2.5e7)*scale;}
    return Math.max(0,finite(p.muzzleEnergyJ,.5*mass*finite(p.velocityMps)**2)*scale);
  }
  function protection(result,facing,engagement,impact,s){
    const surface=(result.voxelLayout?.armorSurfaces||[]).find(x=>x.facing===facing),mode=engagement?.performance?.mode||'UNKNOWN',energy=incidentEnergy(engagement,s),field=Math.max(0,finite(surface?.activeField?.effectiveFieldFactor)),affinity=mode==='DIRECTED_ENERGY'?.56:mode.includes('MISSILE')?.34:.22,reduction=clamp(field/(field+1.4)*affinity,0,.78),afterField=energy*(1-reduction),edge=Math.max(.25,finite(result.voxelLayout?.grid?.cellEdgeM,1)),radius=Math.max(edge*.5,finite(engagement?.bands?.[s.damageBand]?.aimOrFootprintRadiusM,edge)),area=Math.max(edge*edge,Math.PI*Math.min(radius,edge*4)**2),density=Math.max(0,finite(surface?.passive?.effectiveArealDensityKgM2)),resistance=density*area*(mode==='DIRECTED_ENERGY'?1.8e6:mode==='PARTICULATE_CLOUD'?2.2e6:3.4e6),residual=Math.max(0,afterField-resistance);
    const mix=mode==='DIRECTED_ENERGY'?{PENETRATION:.08,ABLATION:.34,HEATING:.42,FRAGMENTATION:.02,RADIATION:.12,IMPULSE:.02}:mode==='PARTICULATE_CLOUD'?{PENETRATION:.12,ABLATION:.24,HEATING:.08,FRAGMENTATION:.42,RADIATION:.04,IMPULSE:.10}:mode.includes('MISSILE')?{PENETRATION:.22,ABLATION:.08,HEATING:.14,FRAGMENTATION:.28,RADIATION:.06,IMPULSE:.22}:{PENETRATION:.34,ABLATION:.06,HEATING:.08,FRAGMENTATION:.24,RADIATION:.04,IMPULSE:.24};
    return{facing,surfaceId:surface?.surfaceId||null,coverageMode:surface?.coverageMode||'UNPROTECTED',incidentEnergyJ:energy,activeField:{effectiveFieldFactor:field,reductionPercent:reduction*100,energyAfterFieldJ:afterField},passive:{effectiveArealDensityKgM2:density,equivalentThicknessMm:finite(surface?.passive?.equivalentThicknessMm),protectedAreaM2:area,resistanceJ:resistance},residualEnergyJ:residual,retainedEnergyPercent:energy?residual/energy*100:0,penetrationRatio:residual/Math.max(1,resistance),effectMix:Object.fromEntries(Object.entries(mix).map(([k,f])=>[k,{fraction:f,energyJ:residual*f}])),impactPlacementId:impact?.placementId||null};
  }

  const boundsDistance=(a,b)=>{if(!a||!b)return Infinity;const g=(amin,amax,bmin,bmax)=>Math.max(0,bmin-amax-1,amin-bmax-1);return g(a.min.x,a.max.x,b.min.x,b.max.x)+g(a.min.y,a.max.y,b.min.y,b.max.y)+g(a.min.z,a.max.z,b.min.z,b.max.z);};
  function damagedState(before,module,severity,mix,eventId,detached){
    const state=clone(before),old=finite(state.damagePercent),critical=D.semanticCriticality[module?.semanticType]||1;state.damagePercent=clamp(Math.max(old,old+severity*(1-old/120))*critical);state.conditionPercent=clamp(finite(state.constructionPercent,100)*(1-state.damagePercent/100)*(1-finite(state.salvageRemovalPercent)/100)-finite(state.maintenanceDebtPercent)*.1);state.failureModes=unique([...(state.failureModes||[]),'COMBAT_LOCAL_DAMAGE',...Object.entries(mix).sort((a,b)=>b[1].energyJ-a[1].energyJ).slice(0,3).map(([k])=>`COMBAT_${k}`)]);state.eventIds=unique([...(state.eventIds||[]),eventId]);
    if(detached||state.damagePercent>=98){state.installationState='DESTROYED';state.serviceState='WRECKAGE';state.disposition='DESTRUCTION';state.graphParticipation='NONE';state.operational=false;state.residualMassTonnes=finite(state.residualMassTonnes)*.35;state.residualVolumeM3=finite(state.residualVolumeM3)*.45;}
    else if(state.damagePercent>=85){state.serviceState='OFFLINE';state.graphParticipation='PHYSICAL_ONLY';state.operational=false;}else{state.serviceState='DEGRADED';state.operational=state.graphParticipation==='ACTIVE';}
    state.salvageableMassTonnes=Math.min(finite(state.residualMassTonnes),finite(state.residualMassTonnes)*clamp(72-state.damagePercent*.5,0,80)/100);return state;
  }
  function neighbors(result,id){const set=new Set();for(const graph of Object.values(result.conditionHistory?.effectiveGraphs||{}))for(const e of graph.edges||[]){if(e.from===id)set.add(e.to);if(e.to===id)set.add(e.from);}return set;}
  function resolveLocalEffects(result,intercept,impact,protectionRecord,s,seed){
    if(intercept.outcome!=='IMPACT'||!impact)return emptyEffects();
    const modules=result.moduleGraph?.modules||[],moduleMap=new Map(modules.map(x=>[x.moduleId,x])),states=new Map((result.conditionHistory?.moduleStates||[]).map(x=>[x.moduleId,x])),primary=moduleMap.get(impact.moduleId),eventId=stableId('combat-event',result.contract.identifiers.vesselInstanceId,seed,'impact'),external=/EVA|VACUUM|EXTERNAL/.test(String(impact.architecture)),base=clamp(Math.max(1,(Math.log10(Math.max(1,protectionRecord.residualEnergyJ))-5)*9)+clamp(protectionRecord.penetrationRatio*22,0,55)+s.attackIntensityPercent*.18),severity=clamp(base*(external?1.18:.9)),detached=external&&severity>=72&&unit(`${seed}:detach`)<severity/115,moduleEffects=[];
    moduleEffects.push({moduleId:impact.moduleId,placementId:impact.placementId,semanticType:primary?.semanticType||impact.semanticType,role:'PRIMARY',severityPercent:severity,detached,before:clone(states.get(impact.moduleId)),after:damagedState(states.get(impact.moduleId),primary,severity,protectionRecord.effectMix,eventId,detached)});
    const linked=neighbors(result,impact.moduleId),near=modules.filter(m=>m.moduleId!==impact.moduleId&&states.get(m.moduleId)?.graphParticipation!=='NONE'&&(linked.has(m.moduleId)||boundsDistance(primary?.voxelBounds,m.voxelBounds)<=1)).sort((a,b)=>a.moduleId.localeCompare(b.moduleId)),prop=D.propagationHazards.includes(primary?.semanticType)?severity*.42:severity*.2;
    for(const m of near.slice(0,Math.max(1,Math.min(4,Math.ceil(severity/28))))){const sec=clamp(prop*(.65+unit(`${seed}:${m.moduleId}`)*.5)*(external?.7:1.12),0,68);if(sec<3)continue;const id=stableId('combat-event',result.contract.identifiers.vesselInstanceId,seed,m.moduleId);moduleEffects.push({moduleId:m.moduleId,placementId:(result.voxelLayout?.modulePlacements||[]).find(x=>x.moduleId===m.moduleId)?.placementId||null,semanticType:m.semanticType,role:'SECONDARY',severityPercent:sec,detached:false,before:clone(states.get(m.moduleId)),after:damagedState(states.get(m.moduleId),m,sec,protectionRecord.effectMix,id,false)});}
    const affected=new Set(moduleEffects.map(x=>x.moduleId)),routeEffects=[];for(const route of result.conditionHistory?.routeStates||[]){if(!route.functional||(!affected.has(route.fromNodeId)&&!affected.has(route.toNodeId)))continue;const sev=Math.max(...moduleEffects.filter(x=>x.moduleId===route.fromNodeId||x.moduleId===route.toNodeId).map(x=>x.severityPercent),0);if(unit(`${seed}:route:${route.routeId}`)<clamp(sev/110+(route.graphType==='structural'?.08:.18),0,.94))routeEffects.push({routeId:route.routeId,graphType:route.graphType,fromNodeId:route.fromNodeId,toNodeId:route.toNodeId,beforeState:'ACTIVE',afterState:'SEVERED',functional:false,severityPercent:sev});}
    const zoneEffects=[];for(const zone of result.conditionHistory?.zoneStates||[]){const source=(result.moduleGraph?.pressureZones||[]).find(x=>x.zoneId===zone.zoneId);if(!(source?.moduleIds||[]).some(id=>affected.has(id)))continue;const sev=Math.max(...moduleEffects.filter(x=>source.moduleIds.includes(x.moduleId)).map(x=>x.severityPercent),0),integrity=clamp(finite(zone.atmosphereIntegrityPercent)*(1-sev/145));zoneEffects.push({zoneId:zone.zoneId,label:zone.label,beforeState:zone.state,beforeAtmosphereIntegrityPercent:zone.atmosphereIntegrityPercent,afterAtmosphereIntegrityPercent:integrity,afterState:integrity<15?'LOST':integrity<35?'DEPRESSURIZED':integrity<70?'COMPROMISED':zone.state,contaminationIncreasePercent:clamp(sev*.28)});}
    const habitat=moduleEffects.some(x=>['LIFE_SUPPORT','HABITAT','MEDICAL'].includes(x.semanticType)),zoneLoss=zoneEffects.reduce((n,x)=>Math.max(n,finite(x.beforeAtmosphereIntegrityPercent)-finite(x.afterAtmosphereIntegrityPercent)),0),exposure=clamp((habitat?severity*.55:severity*.16)+zoneLoss*.7),casualty=clamp(exposure*(1-s.damageControlPercent/140)*(external?.55:1));
    return{events:[{eventId,eventType:'LOCAL_COMBAT_IMPACT',sequence:1,targetType:'PLACEMENT',targetIds:[impact.placementId],sourceEngagementId:null,description:`Resolved ${severity.toFixed(1)}% local severity against ${primary?.label||impact.moduleId}.`,deterministic:true}],moduleEffects,routeEffects,zoneEffects,crewEffects:{exposedCrewPercent:exposure,casualtyPotentialPercent:casualty,habitatAuthorityLost:habitat&&severity>=80,damageControlMitigationPercent:s.damageControlPercent},detachedModuleIds:moduleEffects.filter(x=>x.detached).map(x=>x.moduleId)};
  }

  function postImpactState(result,local,seed){
    const moduleStates=(result.conditionHistory?.moduleStates||[]).map(clone),map=new Map(moduleStates.map(x=>[x.moduleId,x]));for(const e of local.moduleEffects)map.set(e.moduleId,{moduleId:e.moduleId,...clone(e.after)});
    const severed=new Set(local.routeEffects.map(x=>x.routeId)),active=new Set([...map.values()].filter(x=>x.graphParticipation==='ACTIVE').map(x=>x.moduleId)),physical=new Set([...map.values()].filter(x=>x.graphParticipation!=='NONE').map(x=>x.moduleId)),infra=new Set(result.moduleGraph?.infrastructureNodes?.map(x=>x.nodeId)||[]),effectiveGraphs={};
    for(const[name,g]of Object.entries(result.conditionHistory?.effectiveGraphs||{})){const allowed=name==='structural'?new Set([...infra,...physical]):new Set([...infra,...active]);effectiveGraphs[name]={graphType:name,nodes:(g.nodes||[]).filter(id=>allowed.has(id)),edges:(g.edges||[]).filter(e=>allowed.has(e.from)&&allowed.has(e.to)&&!severed.has(e.edgeId)).map(clone)};}
    const voxelStates=(result.conditionHistory?.voxelStates||[]).map(clone),effects=new Map(local.moduleEffects.map(x=>[x.moduleId,x]));for(const v of voxelStates){const e=effects.get(v.moduleId);if(!e)continue;Object.assign(v,{damagePercent:e.after.damagePercent,conditionPercent:e.after.conditionPercent,installationState:e.after.installationState,serviceState:e.after.serviceState,graphParticipation:e.after.graphParticipation,conditionState:e.after.installationState==='DESTROYED'?'DESTROYED_WRECKAGE':'DAMAGED',occupied:finite(e.after.residualVolumeM3)>0,residualMaterial:finite(e.after.residualVolumeM3)>0,coherentParticipation:e.after.graphParticipation!=='NONE'});}
    const zoneEffects=new Map(local.zoneEffects.map(x=>[x.zoneId,x])),zoneStates=(result.conditionHistory?.zoneStates||[]).map(z=>{const e=zoneEffects.get(z.zoneId);return e?{...clone(z),state:e.afterState,atmosphereIntegrityPercent:e.afterAtmosphereIntegrityPercent,contaminationPercent:clamp(finite(z.contaminationPercent)+e.contaminationIncreasePercent)}:clone(z);}),routeEffects=new Set(local.routeEffects.map(x=>x.routeId)),routeStates=(result.conditionHistory?.routeStates||[]).map(r=>routeEffects.has(r.routeId)?{...clone(r),state:'SEVERED',functional:false}:clone(r));
    const before=result.conditionHistory?.moduleStates||[],after=[...map.values()],preMass=sum(before,'residualMassTonnes'),mass=sum(after,'residualMassTonnes'),preVolume=sum(before,'residualVolumeM3'),volume=sum(after,'residualVolumeM3');
    return{recordType:'exoVesselPostImpactState',schemaVersion:'1.0.0',phase:'VESSEL-08',stateId:stableId('post-impact-state',result.contract.identifiers.vesselInstanceId,seed),vesselInstanceId:result.contract.identifiers.vesselInstanceId,referenceConditionAuthority:'VESSEL-05_IMMUTABLE_PRE_IMPACT',moduleStates:after,voxelStates,zoneStates,routeStates,effectiveGraphs,recalculated:{preImpactResidualMassTonnes:preMass,residualMassTonnes:mass,residualMassLossTonnes:Math.max(0,preMass-mass),preImpactResidualVolumeM3:preVolume,residualVolumeM3:volume,operationalModuleCount:after.filter(x=>x.operational&&x.graphParticipation==='ACTIVE').length,damagedModuleCount:after.filter(x=>finite(x.damagePercent)>0&&x.installationState!=='DESTROYED').length,destroyedModuleCount:after.filter(x=>x.installationState==='DESTROYED').length,severedRouteCount:routeStates.filter(x=>!x.functional).length,crewExposurePercent:local.crewEffects.exposedCrewPercent,casualtyPotentialPercent:local.crewEffects.casualtyPotentialPercent},residualVoxelField:{referencePlacementCount:voxelStates.length,occupiedPlacementCount:voxelStates.filter(x=>x.occupied).length,activePlacementCount:voxelStates.filter(x=>x.graphParticipation==='ACTIVE').length,wreckagePlacementCount:voxelStates.filter(x=>['DAMAGED','WRECKAGE','DESTROYED_WRECKAGE'].includes(x.conditionState)).length,absentPlacementCount:voxelStates.filter(x=>!x.occupied).length,coherentVesselGraph:Object.values(effectiveGraphs).some(g=>g.nodes?.length),referenceAuthority:'VESSEL-05_RESIDUAL_VOXEL_FIELD'}};
  }

  function validate(record,result){
    const errors=[],modules=new Set((result.moduleGraph?.modules||[]).map(x=>x.moduleId)),placements=new Set((result.voxelLayout?.modulePlacements||[]).map(x=>x.placementId)),routes=new Set((result.conditionHistory?.routeStates||[]).map(x=>x.routeId)),post=record.postImpactState;
    if(record.phase!=='VESSEL-08'||record.schemaVersion!=='1.0.0')errors.push('Combat resolution record does not identify VESSEL-08 schema 1.0.0.');
    if(record.vesselInstanceId!==result.contract?.identifiers?.vesselInstanceId)errors.push('Combat resolution vessel identifier diverges from canonical authority.');
    if(!D.outcomes.includes(record.interceptResolution?.outcome))errors.push('Combat resolution has an unknown intercept outcome.');
    if(record.interceptResolution?.outcome==='IMPACT'&&(!placements.has(record.impact?.placementId)||!modules.has(record.impact?.moduleId)))errors.push('Resolved impact lacks a valid VESSEL-04 placement and VESSEL-03 module.');
    if(record.interceptResolution?.outcome!=='IMPACT'&&record.localEffects?.moduleEffects?.length)errors.push('A non-impact outcome applied local module damage.');
    for(const e of record.localEffects?.moduleEffects||[]){if(!modules.has(e.moduleId))errors.push(`${e.moduleId} is not a canonical module.`);if(e.after?.installationState==='DESTROYED'&&e.after?.graphParticipation!=='NONE')errors.push(`${e.moduleId} is destroyed but remains graph-active.`);}
    for(const e of record.localEffects?.routeEffects||[]){if(!routes.has(e.routeId))errors.push(`${e.routeId} is not a surviving VESSEL-05 route.`);if(post?.routeStates?.find(x=>x.routeId===e.routeId)?.functional)errors.push(`${e.routeId} was severed but remains functional.`);}
    for(const state of post?.moduleStates||[])if(state.installationState==='DESTROYED'&&(state.operational||state.graphParticipation!=='NONE'))errors.push(`${state.moduleId} remains usable in the post-impact state after destruction.`);
    if(post?.recalculated?.residualMassTonnes>post?.recalculated?.preImpactResidualMassTonnes+1e-9)errors.push('Post-impact residual mass exceeds pre-impact residual mass.');
    if(JSON.stringify(result.conditionHistory?.moduleStates||[])!==record.referenceSnapshots?.conditionModuleStatesJson)errors.push('VESSEL-05 reference condition mutated during combat resolution.');
    return{valid:!errors.length,violations:errors,warnings:[],moduleEffectCount:record.localEffects?.moduleEffects?.length||0,routeEffectCount:record.localEffects?.routeEffects?.length||0,repairCount:record.repairLog?.length||0};
  }

  function faultEffect(record){if(record.localEffects.moduleEffects[0])return record.localEffects.moduleEffects[0];const state=record.postImpactState.moduleStates[0];if(!state)return null;const e={moduleId:state.moduleId,placementId:record.postImpactState.voxelStates.find(x=>x.moduleId===state.moduleId)?.placementId||null,semanticType:'UNKNOWN',role:'FAULT_INJECTION',severityPercent:1,detached:false,before:clone(state),after:clone(state)};record.localEffects.moduleEffects.push(e);return e;}
  function faultRoute(record){if(record.localEffects.routeEffects[0])return record.localEffects.routeEffects[0];const state=record.postImpactState.routeStates[0];if(!state)return null;const e={routeId:state.routeId,graphType:state.graphType,fromNodeId:state.fromNodeId,toNodeId:state.toNodeId,beforeState:'ACTIVE',afterState:'SEVERED',functional:false,severityPercent:1};record.localEffects.routeEffects.push(e);return e;}
  function injectFault(record,fault){
    const key=String(fault||'').toUpperCase();
    if(key==='IMPACT_WITHOUT_PLACEMENT'){record.interceptResolution.outcome='IMPACT';record.impact=null;}
    else if(key==='MISS_WITH_DAMAGE'){faultEffect(record);record.interceptResolution.outcome='MISS';}
    else if(key==='DESTROYED_MODULE_ACTIVE'){const e=faultEffect(record);if(e){Object.assign(e.after,{installationState:'DESTROYED',graphParticipation:'ACTIVE',operational:true});const state=record.postImpactState.moduleStates.find(x=>x.moduleId===e.moduleId);if(state)Object.assign(state,{installationState:'DESTROYED',graphParticipation:'ACTIVE',operational:true});}}
    else if(key==='SEVERED_ROUTE_ACTIVE'){const e=faultRoute(record),state=e&&record.postImpactState.routeStates.find(x=>x.routeId===e.routeId);if(state)Object.assign(state,{state:'ACTIVE',functional:true});}
    else if(key==='RESIDUAL_MASS_INCREASE')record.postImpactState.recalculated.residualMassTonnes=record.postImpactState.recalculated.preImpactResidualMassTonnes+1;
    else if(key==='REFERENCE_CONDITION_MUTATED')record.referenceSnapshots.conditionModuleStatesJson='mutated';
  }
  function repair(record,result,seed){
    const repairs=[],add=(type,id)=>repairs.push([type,id]);
    if(record.interceptResolution.outcome==='IMPACT'&&!record.impact){record.interceptResolution.outcome='MISS';record.localEffects=emptyEffects();record.postImpactState=postImpactState(result,record.localEffects,seed);add('IMPACT_WITHOUT_PLACEMENT',record.vesselInstanceId);}
    if(record.interceptResolution.outcome!=='IMPACT'&&record.localEffects.moduleEffects.length){record.localEffects=emptyEffects();record.postImpactState=postImpactState(result,record.localEffects,seed);add('MISS_WITH_DAMAGE',record.vesselInstanceId);}
    for(const e of record.localEffects.moduleEffects){if(e.after.installationState==='DESTROYED'&&e.after.graphParticipation!=='NONE'){e.after.graphParticipation='NONE';e.after.operational=false;const state=record.postImpactState.moduleStates.find(x=>x.moduleId===e.moduleId);if(state){state.graphParticipation='NONE';state.operational=false;}add('DESTROYED_MODULE_ACTIVE',e.moduleId);}}
    for(const state of record.postImpactState.moduleStates)if(state.installationState==='DESTROYED'&&state.graphParticipation!=='NONE'){state.graphParticipation='NONE';state.operational=false;add('DESTROYED_MODULE_ACTIVE',state.moduleId);}
    for(const e of record.localEffects.routeEffects){const state=record.postImpactState.routeStates.find(x=>x.routeId===e.routeId);if(state?.functional){state.state='SEVERED';state.functional=false;add('SEVERED_ROUTE_ACTIVE',e.routeId);}}
    if(record.postImpactState.recalculated.residualMassTonnes>record.postImpactState.recalculated.preImpactResidualMassTonnes){record.postImpactState.recalculated.residualMassTonnes=record.postImpactState.recalculated.preImpactResidualMassTonnes;record.postImpactState.recalculated.residualMassLossTonnes=0;add('RESIDUAL_MASS_INCREASE',record.vesselInstanceId);}
    const snapshot=JSON.stringify(result.conditionHistory?.moduleStates||[]);if(record.referenceSnapshots.conditionModuleStatesJson!==snapshot){record.referenceSnapshots.conditionModuleStatesJson=snapshot;add('REFERENCE_CONDITION_MUTATED',record.vesselInstanceId);}
    for(const[type,targetId]of repairs)record.repairLog.push({repairId:stableId('combat-repair',record.vesselInstanceId,type,targetId),type,targetId,description:`Deterministically repaired ${type.toLowerCase().replaceAll('_',' ')}.`,deterministic:true});return repairs;
  }

  function build(result,s,seed,input={}){
    const engagement=selectEngagement(result,s,seed),facing=resolveFacing(s,engagement,seed),intercept=resolveIntercept(engagement,s,seed),impact=intercept.outcome==='IMPACT'?chooseImpact(result,facing,seed):null,protectionRecord=protection(result,facing,engagement,impact,s),local=resolveLocalEffects(result,intercept,impact,protectionRecord,s,seed);if(local.events[0])local.events[0].sourceEngagementId=engagement?.engagementId||null;
    const record={recordType:'exoVesselCombatResolution',schemaVersion:'1.0.0',phase:'VESSEL-08',vesselInstanceId:result.contract.identifiers.vesselInstanceId,resolutionSeed:seed,validationMode:String(input.damageValidationMode||'REPAIR').toUpperCase(),referenceAuthority:{voxelLayout:'VESSEL-04_INTACT_PLACEMENT_AND_DIRECTIONAL_SURFACE_AUTHORITY',conditionHistory:'VESSEL-05_IMMUTABLE_PRE_IMPACT_AND_SURVIVING_GRAPH_AUTHORITY',combatGeometry:'VESSEL-06_TRACK_AND_TARGET_MANEUVER_AUTHORITY',weaponEngagement:'VESSEL-07_INSTALLED_WEAPON_AND_ENGAGEMENT_AUTHORITY'},scenario:s,sourceEngagement:engagement?{engagementId:engagement.engagementId,weaponFamily:engagement.weaponFamily,label:engagement.label,bandKey:s.damageBand,band:clone(engagement.bands?.[s.damageBand]),performance:clone(engagement.performance),operationalState:clone(engagement.operationalState),nativeMethodology:clone(engagement.nativeMethodology)}:null,interceptResolution:intercept,approachFacing:facing,impact,protectionResolution:protectionRecord,localEffects:local,postImpactState:postImpactState(result,local,seed),referenceSnapshots:{conditionModuleStatesJson:JSON.stringify(result.conditionHistory?.moduleStates||[])},repairLog:[],deferredSystems:clone(D.deferredSystems),validation:{valid:true,violations:[],warnings:[]}};
    injectFault(record,input.damageFault);let check=validate(record,result);if(!check.valid&&record.validationMode==='REPAIR'){const before=[...check.violations];repair(record,result,seed);check=validate(record,result);check.preRepairViolations=before;}else if(!check.valid)throw new Error(`Combat resolution rejected: ${check.violations.join('; ')}`);record.validation=check;return record;
  }
  globalThis.BlacklightExoVesselDamageCore=Object.freeze({finite,clamp,clone,hash,unit,stableId,scenario,selectEngagement,resolveFacing,resolveIntercept,surfaceDistance,chooseImpact,incidentEnergy,protection,resolveLocalEffects,postImpactState,validate,injectFault,repair,build});
})();
