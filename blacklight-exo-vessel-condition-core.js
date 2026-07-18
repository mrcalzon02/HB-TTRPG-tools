(() => {
  'use strict';
  if(globalThis.BlacklightExoVesselConditionCore)return;
  const D=globalThis.BlacklightExoVesselConditionDefinitions;if(!D)return;
  const finite=(value,fallback=0)=>Number.isFinite(Number(value))?Number(value):fallback;
  const clamp=(value,min=0,max=100)=>Math.max(min,Math.min(max,finite(value)));
  const clone=value=>value==null?value:structuredClone(value);
  function hash(value){let state=2166136261;for(const char of String(value)){state^=char.charCodeAt(0);state=Math.imul(state,16777619);}return state>>>0;}
  const unit=value=>hash(value)/4294967295;
  const slug=value=>(String(value||'condition').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,52)||'condition');
  const stableId=(prefix,...parts)=>`${prefix}-${slug(parts.join('-'))}-${hash(parts.join(':')).toString(16).padStart(8,'0')}`;
  const sum=(rows,field)=>rows.reduce((total,row)=>total+finite(row[field]),0);
  const isPhysical=state=>!['MISSING','REMOVED'].includes(state.installationState);
  const isFunctional=state=>state.graphParticipation==='ACTIVE';

  function priorityIndex(module,priority){const index=priority.indexOf(module.semanticType);return index<0?priority.length:index;}
  function rankModules(modules,seed,priority=[]){return [...modules].sort((a,b)=>priorityIndex(a,priority)-priorityIndex(b,priority)||(unit(`${seed}:${a.moduleId}`)-unit(`${seed}:${b.moduleId}`))||a.moduleId.localeCompare(b.moduleId));}
  function selectByMass(modules,percent,seed,priority=[],predicate=()=>true){
    const candidates=rankModules(modules.filter(predicate),seed,priority),available=sum(candidates,'massTonnes'),target=available*clamp(percent)/100,selected=[];let mass=0;
    for(const module of candidates){if(mass>=target&&selected.length)break;selected.push(module);mass+=finite(module.massTonnes);}
    return selected;
  }
  function createEventFactory(historySeed,vesselId){let sequence=0;return(type,targetType,targetIds,magnitude,description,source='CONDITION_TEMPLATE',propagationId=null)=>({eventId:stableId('condition-event',vesselId,historySeed,++sequence,type),sequence,eventType:type,timestampMode:'RELATIVE_ORDER',targetType,targetIds:[...new Set(targetIds||[])],magnitude:clamp(magnitude),source,description,propagationId,deterministic:true});}
  function referenceState(module,axes){return{
    constructionPercent:100,commissioningPercent:clamp(axes.commissioningCompletionPercent),damagePercent:0,salvageRemovalPercent:0,maintenanceDebtPercent:clamp(axes.maintenanceDebtPercent),contaminationPercent:clamp(axes.contaminationPercent),operational:true,applicationStatus:'CONDITION_APPLIED',installationState:'INSTALLED',serviceState:'OPERATIONAL',disposition:'NONE',graphParticipation:'ACTIVE',conditionPercent:100,residualMassTonnes:finite(module.massTonnes),residualVolumeM3:finite(module.volumeM3),salvageableMassTonnes:finite(module.massTonnes)*.72,failureModes:[],eventIds:[]
  };}
  function attachEvent(states,event){for(const id of event.targetIds){const state=states.get(id);if(state&&!state.eventIds.includes(event.eventId))state.eventIds.push(event.eventId);}}
  function removeState(state,disposition,event){state.installationState='REMOVED';state.serviceState='OFFLINE';state.disposition=disposition;state.graphParticipation='NONE';state.operational=false;state.damagePercent=0;if(disposition==='SALVAGE')state.salvageRemovalPercent=100;state.failureModes.push(disposition==='SALVAGE'?'SALVAGED_OUT':'INTENTIONAL_REMOVAL');if(event&&!state.eventIds.includes(event.eventId))state.eventIds.push(event.eventId);}
  function damageState(state,amount,mode,event){if(['MISSING','REMOVED'].includes(state.installationState))return;state.damagePercent=Math.max(state.damagePercent,clamp(amount));state.disposition=state.disposition==='NONE'?'DAMAGE':state.disposition;state.serviceState=state.damagePercent>=80?'OFFLINE':'DEGRADED';state.graphParticipation=state.damagePercent>=95?'PHYSICAL_ONLY':'ACTIVE';state.operational=state.graphParticipation==='ACTIVE';if(!state.failureModes.includes(mode))state.failureModes.push(mode);if(event&&!state.eventIds.includes(event.eventId))state.eventIds.push(event.eventId);}
  function finalizeState(module,state,axes,template){
    if(template==='MOTHBALLED'&&isPhysical(state)){state.serviceState='MOTHBALLED';state.graphParticipation='PHYSICAL_ONLY';state.operational=false;state.failureModes.push('PRESERVATION_INHIBIT');}
    if(template==='ABANDONED'&&isPhysical(state)){state.serviceState='ABANDONED';state.graphParticipation='PHYSICAL_ONLY';state.operational=false;state.failureModes.push('CREW_ABSENT');}
    if(template==='WRECKED'&&isPhysical(state)&&state.graphParticipation!=='NONE'){state.serviceState='WRECKAGE';state.graphParticipation='PHYSICAL_ONLY';state.operational=false;}
    if(template==='NEWLY_MANUFACTURED'||template==='COMMISSIONING'){if(isPhysical(state)&&state.installationState==='INSTALLED'){state.serviceState=axes.commissioningCompletionPercent>=85?'DEGRADED':'OFFLINE';state.graphParticipation=axes.commissioningCompletionPercent>=85?'ACTIVE':'PHYSICAL_ONLY';state.operational=state.graphParticipation==='ACTIVE';}}
    if(template==='WORN_SERVICE'&&state.operational)state.serviceState='DEGRADED';
    if(state.installationState==='DESTROYED'){state.serviceState='WRECKAGE';state.graphParticipation='NONE';state.operational=false;state.disposition='DESTRUCTION';state.damagePercent=100;}
    if(state.installationState==='MISSING'){state.serviceState='OFFLINE';state.graphParticipation='NONE';state.operational=false;state.disposition='MISSING_CONSTRUCTION';}
    if(state.installationState==='INCOMPLETE'){state.serviceState='OFFLINE';state.graphParticipation='PHYSICAL_ONLY';state.operational=false;}
    let residualMass=finite(module.massTonnes),residualVolume=finite(module.volumeM3);
    if(state.installationState==='MISSING'||state.installationState==='REMOVED'){residualMass=0;residualVolume=0;}
    else if(state.installationState==='INCOMPLETE'){residualMass*=state.constructionPercent/100;residualVolume*=state.constructionPercent/100;}
    else if(state.installationState==='DESTROYED'){residualMass*=.35;residualVolume*=.45;}
    state.residualMassTonnes=Math.max(0,residualMass);state.residualVolumeM3=Math.max(0,residualVolume);
    state.conditionPercent=clamp(state.constructionPercent*(1-state.damagePercent/100)*(1-state.salvageRemovalPercent/100)-state.maintenanceDebtPercent*.1);
    state.salvageableMassTonnes=Math.max(0,state.residualMassTonnes*clamp(76-state.damagePercent*.45-state.contaminationPercent*.22,0,90)/100);
    state.failureModes=[...new Set(state.failureModes)];state.eventIds=[...new Set(state.eventIds)];
    return state;
  }

  function applyPrimaryCondition(result,condition,historySeed){
    const axes=condition.axes,template=condition.template,vesselId=result.contract.identifiers.vesselInstanceId,modules=result.moduleGraph.modules,states=new Map(modules.map(module=>[module.moduleId,referenceState(module,axes)])),events=[],event=createEventFactory(historySeed,vesselId);
    const add=record=>{events.push(record);attachEvent(states,record);return record;};

    if(axes.constructionCompletionPercent<100){
      const selected=selectByMass(modules,100-axes.constructionCompletionPercent,`${historySeed}:construction`,D.constructionPriority);if(selected.length){
        const record=add(event('CONSTRUCTION_SHORTFALL','MODULE',selected.map(item=>item.moduleId),100-axes.constructionCompletionPercent,'Planned systems were never fully installed; missing work is not damage or salvage.'));
        selected.forEach((module,index)=>{const state=states.get(module.moduleId),incomplete=index===selected.length-1||unit(`${historySeed}:incomplete:${module.moduleId}`)>.58;if(incomplete){state.installationState='INCOMPLETE';state.constructionPercent=Math.max(5,clamp(axes.constructionCompletionPercent*.62));state.failureModes.push('INCOMPLETE_CONSTRUCTION');}else{state.installationState='MISSING';state.constructionPercent=0;state.failureModes.push('NEVER_INSTALLED');}if(!state.eventIds.includes(record.eventId))state.eventIds.push(record.eventId);});
      }
    }
    if(axes.commissioningCompletionPercent<100){const targets=modules.filter(module=>isPhysical(states.get(module.moduleId)));if(targets.length)add(event('COMMISSIONING_PROGRESS','VESSEL',targets.map(item=>item.moduleId),axes.commissioningCompletionPercent,'Construction exists, but calibration, trials, stores, certification, or software commissioning remain incomplete.'));}
    if(axes.decommissioningPercent>0){
      const selected=selectByMass(modules,axes.decommissioningPercent,`${historySeed}:teardown`,D.teardownPriority,module=>['INSTALLED','INCOMPLETE'].includes(states.get(module.moduleId).installationState));if(selected.length){const record=add(event('TEARDOWN_REMOVAL','MODULE',selected.map(item=>item.moduleId),axes.decommissioningPercent,'Systems were intentionally removed during decommissioning or refit.'));for(const module of selected)removeState(states.get(module.moduleId),'TEARDOWN',record);}
    }
    if(axes.salvageRemovalPercent>0){
      const selected=selectByMass(modules,axes.salvageRemovalPercent,`${historySeed}:salvage`,D.salvagePriority,module=>['INSTALLED','INCOMPLETE'].includes(states.get(module.moduleId).installationState));if(selected.length){const record=add(event('SALVAGE_REMOVAL','MODULE',selected.map(item=>item.moduleId),axes.salvageRemovalPercent,'Recoverable equipment or material was removed under salvage authority, distinct from teardown and destruction.','SALVAGE_OPERATION'));for(const module of selected)removeState(states.get(module.moduleId),'SALVAGE',record);}
    }
    if(axes.maintenanceDebtPercent>0){const targets=modules.filter(module=>isPhysical(states.get(module.moduleId)));if(targets.length)add(event('MAINTENANCE_DEBT','MODULE',targets.map(item=>item.moduleId),axes.maintenanceDebtPercent,'Deferred maintenance reduces readiness without itself removing or destroying hardware.'));}
    if(axes.structuralDamagePercent>0){
      const selected=selectByMass(modules,axes.structuralDamagePercent,`${historySeed}:structural`,D.structuralSemantics, module=>isPhysical(states.get(module.moduleId))&&states.get(module.moduleId).installationState!=='DESTROYED');if(selected.length){const record=add(event('STRUCTURAL_DAMAGE','MODULE',selected.map(item=>item.moduleId),axes.structuralDamagePercent,'Structural load paths and supporting systems suffered physical damage.','LIFECYCLE_DAMAGE'));selected.forEach(module=>damageState(states.get(module.moduleId),Math.max(8,axes.structuralDamagePercent*(.72+unit(`${historySeed}:sd:${module.moduleId}`)*.42)),'STRUCTURAL_DAMAGE',record));}
    }
    if(axes.systemDamagePercent>0){
      const selected=selectByMass(modules,axes.systemDamagePercent,`${historySeed}:systems`,D.systemSemantics,module=>isPhysical(states.get(module.moduleId))&&states.get(module.moduleId).installationState!=='DESTROYED');if(selected.length){const record=add(event('SYSTEM_DAMAGE','MODULE',selected.map(item=>item.moduleId),axes.systemDamagePercent,'Machinery, control, habitat, or mission systems suffered physical or functional damage.','LIFECYCLE_DAMAGE'));selected.forEach(module=>damageState(states.get(module.moduleId),Math.max(8,axes.systemDamagePercent*(.68+unit(`${historySeed}:sys:${module.moduleId}`)*.46)),'SYSTEM_DAMAGE',record));}
    }
    if(axes.atmosphereIntegrityPercent<100)add(event('ATMOSPHERE_LOSS','ZONE',(result.moduleGraph.pressureZones||[]).map(zone=>zone.zoneId),100-axes.atmosphereIntegrityPercent,'Pressure-zone integrity is reduced independently of structural module removal.'));
    if(axes.contaminationPercent>0)add(event('CONTAMINATION','VESSEL',[vesselId],axes.contaminationPercent,'Contamination burdens surviving spaces and recoverable equipment.'));
    if(axes.dataIntegrityPercent<100)add(event('DATA_CORRUPTION','VESSEL',[vesselId],100-axes.dataIntegrityPercent,'Navigation, command, maintenance, and mission data integrity is degraded.'));
    if(axes.fuelLoadPercent<100)add(event('FUEL_DEPLETION','VESSEL',[vesselId],100-axes.fuelLoadPercent,'Fuel and reaction-mass load state is below the intact reference inventory.'));
    if(axes.coolantLoadPercent<100)add(event('COOLANT_LOSS','VESSEL',[vesselId],100-axes.coolantLoadPercent,'Coolant and thermal working-fluid load state is below the intact reference inventory.'));
    if(template==='MOTHBALLED')add(event('MOTHBALL','VESSEL',[vesselId],100-axes.operationalReadinessPercent,'The vessel is preserved, drained, inhibited, and sealed rather than damaged or dismantled.'));
    if(template==='ABANDONED')add(event('ABANDONMENT','VESSEL',[vesselId],100,'Crew authority and ordinary maintenance ceased while physical hardware may remain.'));
    if(axes.destructionPercent>0){
      const candidates=modules.filter(module=>isPhysical(states.get(module.moduleId))),selected=axes.destructionPercent>=100?candidates:selectByMass(candidates,axes.destructionPercent,`${historySeed}:destruction`,D.structuralSemantics);if(selected.length){const record=add(event('DESTRUCTION','MODULE',selected.map(item=>item.moduleId),axes.destructionPercent,'Destruction converts installed hardware into wreckage; only total destruction removes vessel coherence.','CATASTROPHIC_HISTORY'));selected.forEach((module,index)=>{const state=states.get(module.moduleId),destroyed=axes.destructionPercent>=100||unit(`${historySeed}:destroyed:${module.moduleId}:${index}`)<Math.min(.78,axes.destructionPercent/115);if(destroyed){state.installationState='DESTROYED';state.disposition='DESTRUCTION';state.damagePercent=100;state.failureModes.push('DESTROYED_HARDWARE');}else damageState(state,Math.max(state.damagePercent,axes.destructionPercent),'DESTRUCTION_DAMAGE',record);if(!state.eventIds.includes(record.eventId))state.eventIds.push(record.eventId);});}
    }

    for(const module of modules){const state=finalizeState(module,states.get(module.moduleId),axes,template);module.state=state;}
    return{states,events};
  }

  globalThis.BlacklightExoVesselConditionCore=Object.freeze({finite,clamp,clone,hash,unit,stableId,sum,isPhysical,isFunctional,rankModules,selectByMass,createEventFactory,applyPrimaryCondition,finalizeState});
})();