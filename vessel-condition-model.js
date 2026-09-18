(function (root, factory) {
  const engine = root && root.HBSemanticSpatialEngine ? root.HBSemanticSpatialEngine : (typeof require === 'function' ? require('./semantic-spatial-engine.js') : null);
  const api = factory(engine);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.HBVesselConditionModel = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (engine) {
  'use strict';
  if (!engine) throw new Error('vessel-condition-model requires HBSemanticSpatialEngine.');

  const CONDITION_TEMPLATES = Object.freeze({
    NEWLY_MANUFACTURED:{constructionCompletionPercent:100,commissioningCompletionPercent:30,operationalReadinessPercent:25,structuralDamagePercent:0,systemDamagePercent:0,salvageRemovalPercent:0,decommissioningPercent:0,maintenanceDebtPercent:0,fuelLoadPercent:15,coolantLoadPercent:70,atmosphereIntegrityPercent:100,contaminationPercent:0,crewAvailabilityPercent:0,dataIntegrityPercent:100,destructionPercent:0},
    PARTIALLY_COMPLETED:{constructionCompletionPercent:68,commissioningCompletionPercent:0,operationalReadinessPercent:0,structuralDamagePercent:0,systemDamagePercent:0,salvageRemovalPercent:0,decommissioningPercent:0,maintenanceDebtPercent:0,fuelLoadPercent:0,coolantLoadPercent:20,atmosphereIntegrityPercent:100,contaminationPercent:0,crewAvailabilityPercent:0,dataIntegrityPercent:100,destructionPercent:0},
    COMMISSIONING:{constructionCompletionPercent:100,commissioningCompletionPercent:72,operationalReadinessPercent:55,structuralDamagePercent:0,systemDamagePercent:0,salvageRemovalPercent:0,decommissioningPercent:0,maintenanceDebtPercent:0,fuelLoadPercent:60,coolantLoadPercent:90,atmosphereIntegrityPercent:100,contaminationPercent:0,crewAvailabilityPercent:70,dataIntegrityPercent:100,destructionPercent:0},
    OPERATIONAL:{constructionCompletionPercent:100,commissioningCompletionPercent:100,operationalReadinessPercent:100,structuralDamagePercent:0,systemDamagePercent:0,salvageRemovalPercent:0,decommissioningPercent:0,maintenanceDebtPercent:0,fuelLoadPercent:100,coolantLoadPercent:100,atmosphereIntegrityPercent:100,contaminationPercent:0,crewAvailabilityPercent:100,dataIntegrityPercent:100,destructionPercent:0},
    WORN_SERVICE:{constructionCompletionPercent:100,commissioningCompletionPercent:100,operationalReadinessPercent:78,structuralDamagePercent:4,systemDamagePercent:9,salvageRemovalPercent:0,decommissioningPercent:0,maintenanceDebtPercent:46,fuelLoadPercent:72,coolantLoadPercent:84,atmosphereIntegrityPercent:100,contaminationPercent:0,crewAvailabilityPercent:100,dataIntegrityPercent:92,destructionPercent:0},
    PARTIALLY_TORN_DOWN:{constructionCompletionPercent:100,commissioningCompletionPercent:100,operationalReadinessPercent:12,structuralDamagePercent:0,systemDamagePercent:0,salvageRemovalPercent:18,decommissioningPercent:52,maintenanceDebtPercent:0,fuelLoadPercent:3,coolantLoadPercent:22,atmosphereIntegrityPercent:100,contaminationPercent:0,crewAvailabilityPercent:8,dataIntegrityPercent:100,destructionPercent:0},
    MOTHBALLED:{constructionCompletionPercent:100,commissioningCompletionPercent:100,operationalReadinessPercent:20,structuralDamagePercent:0,systemDamagePercent:0,salvageRemovalPercent:0,decommissioningPercent:0,maintenanceDebtPercent:28,fuelLoadPercent:0,coolantLoadPercent:35,atmosphereIntegrityPercent:65,contaminationPercent:0,crewAvailabilityPercent:0,dataIntegrityPercent:100,destructionPercent:0},
    ABANDONED:{constructionCompletionPercent:100,commissioningCompletionPercent:100,operationalReadinessPercent:18,structuralDamagePercent:8,systemDamagePercent:22,salvageRemovalPercent:0,decommissioningPercent:0,maintenanceDebtPercent:72,fuelLoadPercent:9,coolantLoadPercent:31,atmosphereIntegrityPercent:58,contaminationPercent:14,crewAvailabilityPercent:0,dataIntegrityPercent:64,destructionPercent:0},
    PARTIALLY_SALVAGED:{constructionCompletionPercent:100,commissioningCompletionPercent:100,operationalReadinessPercent:8,structuralDamagePercent:14,systemDamagePercent:38,salvageRemovalPercent:35,decommissioningPercent:0,maintenanceDebtPercent:80,fuelLoadPercent:0,coolantLoadPercent:14,atmosphereIntegrityPercent:44,contaminationPercent:0,crewAvailabilityPercent:0,dataIntegrityPercent:42,destructionPercent:22},
    DAMAGED:{constructionCompletionPercent:100,commissioningCompletionPercent:100,operationalReadinessPercent:62,structuralDamagePercent:18,systemDamagePercent:24,salvageRemovalPercent:0,decommissioningPercent:0,maintenanceDebtPercent:32,fuelLoadPercent:61,coolantLoadPercent:68,atmosphereIntegrityPercent:78,contaminationPercent:0,crewAvailabilityPercent:82,dataIntegrityPercent:80,destructionPercent:18},
    CRIPPLED:{constructionCompletionPercent:100,commissioningCompletionPercent:100,operationalReadinessPercent:22,structuralDamagePercent:56,systemDamagePercent:63,salvageRemovalPercent:0,decommissioningPercent:0,maintenanceDebtPercent:74,fuelLoadPercent:28,coolantLoadPercent:37,atmosphereIntegrityPercent:42,contaminationPercent:0,crewAvailabilityPercent:48,dataIntegrityPercent:54,destructionPercent:62},
    WRECKED:{constructionCompletionPercent:100,commissioningCompletionPercent:100,operationalReadinessPercent:0,structuralDamagePercent:82,systemDamagePercent:90,salvageRemovalPercent:0,decommissioningPercent:0,maintenanceDebtPercent:100,fuelLoadPercent:5,coolantLoadPercent:7,atmosphereIntegrityPercent:8,contaminationPercent:48,crewAvailabilityPercent:0,dataIntegrityPercent:22,destructionPercent:82},
    DESTROYED:{constructionCompletionPercent:100,commissioningCompletionPercent:100,operationalReadinessPercent:0,structuralDamagePercent:100,systemDamagePercent:100,salvageRemovalPercent:0,decommissioningPercent:0,maintenanceDebtPercent:100,fuelLoadPercent:0,coolantLoadPercent:0,atmosphereIntegrityPercent:0,contaminationPercent:100,crewAvailabilityPercent:0,dataIntegrityPercent:0,destructionPercent:100}
  });
  const AXIS_KEYS = Object.freeze(Object.keys(CONDITION_TEMPLATES.OPERATIONAL));
  const clone = value => value == null ? value : JSON.parse(JSON.stringify(value));
  const clamp = value => Math.max(0, Math.min(100, Number.isFinite(Number(value)) ? Number(value) : 0));
  function hash(value){let state=2166136261;for(const char of String(value)){state^=char.charCodeAt(0);state=Math.imul(state,16777619);}return state>>>0;}
  const unit = value => hash(value) / 4294967295;
  const stableId = (prefix, seed, suffix) => prefix + '-' + hash(String(seed) + ':' + String(suffix)).toString(16).padStart(8,'0');

  function normalize(input) {
    const source = input || {};
    const legacySeverity = source.damageSeverity == null ? null : Math.max(0, Math.min(1, Number(source.damageSeverity) || 0));
    let template = String(source.conditionTemplate || source.condition || '').trim().toUpperCase();
    if (!CONDITION_TEMPLATES[template]) template = legacySeverity > 0 ? 'DAMAGED' : 'OPERATIONAL';
    const axes = {...CONDITION_TEMPLATES[template], ...(source.conditionAxes || {})};
    for (const key of AXIS_KEYS) if (source[key] != null) axes[key] = source[key];
    if (legacySeverity != null && legacySeverity > 0) {
      axes.structuralDamagePercent = Math.max(clamp(axes.structuralDamagePercent), legacySeverity * 78);
      axes.systemDamagePercent = Math.max(clamp(axes.systemDamagePercent), legacySeverity * 92);
      axes.destructionPercent = Math.max(clamp(axes.destructionPercent), legacySeverity * 48);
      axes.atmosphereIntegrityPercent = Math.min(clamp(axes.atmosphereIntegrityPercent), 100 - legacySeverity * 74);
    }
    for (const key of AXIS_KEYS) axes[key] = clamp(axes[key]);
    return {template, axes};
  }

  function ranked(items, seed, purpose) {
    return [...items].sort((a,b) => unit(seed + ':' + purpose + ':' + (a.nodeId || a.id)) - unit(seed + ':' + purpose + ':' + (b.nodeId || b.id)));
  }

  function selectPercent(items, percent, seed, purpose, preserveOne) {
    const list = ranked(items, seed, purpose);
    if (!list.length || percent <= 0) return [];
    let count = Math.ceil(list.length * clamp(percent) / 100);
    if (preserveOne && percent < 100) count = Math.min(count, Math.max(0, list.length - 1));
    return list.slice(0, count);
  }

  function protectedSurvivorIds(layout, states, destructionPercent, seed) {
    if (destructionPercent >= 100) return new Set();
    const installed=(layout.rooms||[]).filter(room=>states.get(room.nodeId)?.installationState==='INSTALLED');
    if (!installed.length) return new Set();
    const installedIds=new Set(installed.map(room=>room.nodeId));
    const adjacency=new Map(installed.map(room=>[room.nodeId,new Set()]));
    for (const edge of layout.edges||[]) if (installedIds.has(edge.a)&&installedIds.has(edge.b)) {adjacency.get(edge.a).add(edge.b);adjacency.get(edge.b).add(edge.a);}
    let best=[];
    const unseen=new Set(installedIds);
    while(unseen.size){
      const start=unseen.values().next().value,seen=new Set([start]),queue=[start];unseen.delete(start);
      while(queue.length){const current=queue.shift();const nexts=[...(adjacency.get(current)||[])].sort((a,b)=>unit(seed+':survivor:'+a)-unit(seed+':survivor:'+b));for(const next of nexts)if(!seen.has(next)){seen.add(next);unseen.delete(next);queue.push(next);}}
      if(seen.size>best.length)best=[...seen];
    }
    const desired=Math.max(1,Math.ceil(installed.length*(100-clamp(destructionPercent))/100));
    return new Set(best.slice(0,Math.min(desired,best.length)));
  }

  function createState(room, axes) {
    return {
      roomId:room.nodeId,
      deck:room.deck,
      role:room.role,
      label:room.label,
      installationState:'INSTALLED',
      serviceState:'OPERATIONAL',
      operational:true,
      accessState:'OPEN',
      pressureState:axes.atmosphereIntegrityPercent >= 85 ? 'PRESSURIZED' : axes.atmosphereIntegrityPercent >= 35 ? 'COMPROMISED' : 'DEPRESSURIZED',
      damagePercent:0,
      salvageRemovalPercent:0,
      contaminationPercent:clamp(axes.contaminationPercent),
      failureModes:[],
      effects:[]
    };
  }

  function addEffect(state, effect) {
    if (!state.effects.includes(effect)) state.effects.push(effect);
  }

  function markDamage(state, amount, mode, seed) {
    if (state.installationState !== 'INSTALLED') return;
    state.damagePercent = Math.max(state.damagePercent, clamp(amount));
    if (!state.failureModes.includes(mode)) state.failureModes.push(mode);
    state.serviceState = state.damagePercent >= 70 ? 'OFFLINE' : 'DEGRADED';
    state.operational = state.damagePercent < 70;
    if (state.damagePercent >= 45) state.accessState = unit(seed + ':' + state.roomId + ':access') < .52 ? 'BLOCKED' : 'RESTRICTED';
    const tags = new Set(state.tags || []);
    const role = String(state.role || '');
    if (/engineering|reactor|power|mechanical|drive/i.test(role)) addEffect(state,'power-isolated');
    else if (/atmosphere|life-support|habitation|medical/i.test(role)) addEffect(state,'atmosphere-loss');
    else if (/sensor|command|control|navigation|data/i.test(role)) addEffect(state,'data-loss');
    else addEffect(state, unit(seed + ':' + state.roomId + ':effect') < .5 ? 'structural-damage' : 'blocked-access');
  }

  function event(seed, sequence, type, magnitude, targets, description) {
    return {eventId:stableId('vessel-condition-event',seed,sequence + ':' + type),sequence,eventType:type,magnitudePercent:clamp(magnitude),targetIds:[...targets],description,deterministic:true};
  }

  function apply(referenceLayout, request) {
    if (!referenceLayout || !Array.isArray(referenceLayout.rooms)) throw new Error('Vessel condition application requires a semantic spatial layout.');
    const seed = String((request && request.seed) || referenceLayout.seed || 'vessel-condition');
    const normalized = normalize(request);
    const axes = normalized.axes;
    const layout = clone(referenceLayout);
    const states = new Map(layout.rooms.map(room => {
      const state = createState(room, axes);
      state.tags = Array.isArray(room.tags) ? room.tags.slice() : [];
      return [room.nodeId,state];
    }));
    const events = [];
    let sequence = 0;
    const pushEvent = (type,magnitude,targets,description) => { if (targets.length || type === 'VESSEL_STATE') events.push(event(seed,++sequence,type,magnitude,targets,description)); };

    const constructionMissing = selectPercent(layout.rooms, 100 - axes.constructionCompletionPercent, seed, 'construction', true);
    constructionMissing.forEach((room,index) => {
      const state=states.get(room.nodeId);
      state.installationState=index===constructionMissing.length-1 && axes.constructionCompletionPercent>0 ? 'INCOMPLETE' : 'MISSING';
      state.serviceState='OFFLINE';state.operational=false;state.accessState='INACCESSIBLE';state.failureModes.push(state.installationState==='MISSING'?'NEVER_INSTALLED':'INCOMPLETE_CONSTRUCTION');
    });
    pushEvent('CONSTRUCTION_SHORTFALL',100-axes.constructionCompletionPercent,constructionMissing.map(x=>x.nodeId),'Planned compartments or systems were never completed.');

    const teardown = selectPercent(layout.rooms.filter(r => states.get(r.nodeId).installationState==='INSTALLED'), axes.decommissioningPercent, seed, 'teardown', true);
    teardown.forEach(room => { const state=states.get(room.nodeId);state.installationState='REMOVED';state.serviceState='OFFLINE';state.operational=false;state.accessState='VOID';state.failureModes.push('INTENTIONAL_REMOVAL');addEffect(state,'removed-system'); });
    pushEvent('TEARDOWN_REMOVAL',axes.decommissioningPercent,teardown.map(x=>x.nodeId),'Deliberate decommissioning removed installed vessel spaces or systems.');

    const structural = selectPercent(layout.rooms.filter(r => states.get(r.nodeId).installationState==='INSTALLED'), axes.structuralDamagePercent, seed, 'structural-damage', true);
    structural.forEach(room => markDamage(states.get(room.nodeId), Math.max(12,axes.structuralDamagePercent*(.72+unit(seed+':structural:'+room.nodeId)*.42)), 'STRUCTURAL_DAMAGE', seed));
    pushEvent('STRUCTURAL_DAMAGE',axes.structuralDamagePercent,structural.map(x=>x.nodeId),'Structural casualty damaged surviving vessel compartments.');

    const systems = selectPercent(layout.rooms.filter(r => states.get(r.nodeId).installationState==='INSTALLED'), axes.systemDamagePercent, seed, 'system-damage', true);
    systems.forEach(room => markDamage(states.get(room.nodeId), Math.max(10,axes.systemDamagePercent*(.68+unit(seed+':system:'+room.nodeId)*.46)), 'SYSTEM_DAMAGE', seed));
    pushEvent('SYSTEM_DAMAGE',axes.systemDamagePercent,systems.map(x=>x.nodeId),'Machinery, controls, or mission systems suffered functional damage.');

    const salvage = selectPercent(layout.rooms.filter(r => states.get(r.nodeId).installationState==='INSTALLED'), axes.salvageRemovalPercent, seed, 'salvage', true);
    salvage.forEach(room => { const state=states.get(room.nodeId);state.installationState='REMOVED';state.serviceState='OFFLINE';state.operational=false;state.accessState='STRIPPED';state.salvageRemovalPercent=100;state.failureModes.push('SALVAGED_OUT');addEffect(state,'salvaged-out'); });
    pushEvent('SALVAGE_REMOVAL',axes.salvageRemovalPercent,salvage.map(x=>x.nodeId),'Post-loss salvage removed recoverable systems from the reference vessel.');

    const installedBeforeDestruction=layout.rooms.filter(r => states.get(r.nodeId).installationState==='INSTALLED');
    const survivorIds=protectedSurvivorIds(layout,states,axes.destructionPercent,seed);
    const destructionTarget=Math.min(installedBeforeDestruction.length-survivorIds.size,Math.ceil(installedBeforeDestruction.length*axes.destructionPercent/100));
    const destruction=ranked(installedBeforeDestruction.filter(room=>!survivorIds.has(room.nodeId)),seed,'destruction').slice(0,Math.max(0,destructionTarget));
    destruction.forEach(room => {
      const state=states.get(room.nodeId);
      const destroyed=axes.destructionPercent>=100 || unit(seed+':destroyed:'+room.nodeId) < Math.min(.86,axes.destructionPercent/108);
      if (destroyed) {
        state.installationState='DESTROYED';state.serviceState='WRECKAGE';state.operational=false;state.accessState='DESTROYED';state.damagePercent=100;state.failureModes.push('DESTROYED_HARDWARE');addEffect(state,'structural-destruction');
      } else markDamage(state,Math.max(state.damagePercent,axes.destructionPercent),'DESTRUCTION_DAMAGE',seed);
    });
    pushEvent('DESTRUCTION',axes.destructionPercent,destruction.map(x=>x.nodeId),'Catastrophic history converted intact compartments into damaged or destroyed wreckage.');

    if (axes.atmosphereIntegrityPercent < 100) {
      for (const state of states.values()) if (state.installationState==='INSTALLED' && unit(seed+':pressure:'+state.roomId) > axes.atmosphereIntegrityPercent/100) {state.pressureState='DEPRESSURIZED';addEffect(state,'atmosphere-loss');}
      pushEvent('ATMOSPHERE_LOSS',100-axes.atmosphereIntegrityPercent,[...states.keys()],'Pressure integrity fell below the intact reference state.');
    }
    if (axes.contaminationPercent > 0) {
      for (const state of states.values()) if (state.installationState==='INSTALLED' && unit(seed+':contamination:'+state.roomId) < axes.contaminationPercent/100) addEffect(state,'contamination');
      pushEvent('CONTAMINATION',axes.contaminationPercent,[...states.keys()],'Contamination burdens surviving spaces and recoverable equipment.');
    }

    for (const state of states.values()) {
      if (normalized.template==='ABANDONED' && state.installationState==='INSTALLED') {state.serviceState='ABANDONED';state.operational=false;state.failureModes.push('CREW_ABSENT');}
      if (normalized.template==='MOTHBALLED' && state.installationState==='INSTALLED') {state.serviceState='MOTHBALLED';state.operational=false;state.failureModes.push('PRESERVATION_INHIBIT');}
      if (normalized.template==='WRECKED' && state.installationState==='INSTALLED') {state.serviceState='WRECKAGE';state.operational=false;}
      if (normalized.template==='WORN_SERVICE' && state.operational) state.serviceState='DEGRADED';
      delete state.tags;
    }

    const roomStates=[...states.values()];
    const roomById=new Map(roomStates.map(state=>[state.roomId,state]));
    layout.rooms=layout.rooms.map(room=>({...room,condition:clone(roomById.get(room.nodeId))}));

    const corridorStates=(layout.corridors||[]).map(corridor=>{
      const a=roomById.get(corridor.a),b=roomById.get(corridor.b);
      const endpointLost=[a,b].some(s=>s&&['MISSING','REMOVED','DESTROYED'].includes(s.installationState));
      const survivorLink=survivorIds.has(corridor.a)&&survivorIds.has(corridor.b);
      const severity=Math.max(a?.damagePercent||0,b?.damagePercent||0,axes.structuralDamagePercent*.35);
      let state=endpointLost?'SEVERED':'OPEN';
      if(!endpointLost&&!survivorLink&&severity>20&&unit(seed+':corridor:'+corridor.id)<Math.min(.8,severity/115))state=severity>=65?'SEVERED':'BLOCKED';
      return {corridorId:corridor.id,deck:corridor.deck,state,functional:state==='OPEN',severityPercent:clamp(severity)};
    });
    const corridorById=new Map(corridorStates.map(state=>[state.corridorId,state]));
    layout.corridors=(layout.corridors||[]).map(corridor=>({...corridor,condition:clone(corridorById.get(corridor.id))}));
    layout.doors=(layout.doors||[]).map(door=>{const route=corridorById.get(door.corridorId),room=roomById.get(door.roomId);const state=route?.state==='SEVERED'||room?.installationState==='DESTROYED'?'INOPERABLE':route?.state==='BLOCKED'?'SEALED':'OPEN';return {...door,condition:{state,functional:state==='OPEN'}};});

    const connectorGroups=new Map();
    for(const connector of layout.connectors||[]){if(!connectorGroups.has(connector.pairId))connectorGroups.set(connector.pairId,[]);connectorGroups.get(connector.pairId).push(connector);}
    const connectorStates=[];
    for(const [pairId,items] of connectorGroups){const lost=items.some(item=>{const state=roomById.get(item.nodeId);return state&&['MISSING','REMOVED','DESTROYED'].includes(state.installationState);});const survivorLink=items.length===2&&items.every(item=>survivorIds.has(item.nodeId));const severity=Math.max(...items.map(item=>roomById.get(item.nodeId)?.damagePercent||0),0);let state=lost?'SEVERED':'OPEN';if(!lost&&!survivorLink&&severity>25&&unit(seed+':connector:'+pairId)<severity/120)state='BLOCKED';connectorStates.push({pairId,state,functional:state==='OPEN',severityPercent:clamp(severity)});}
    const connectorByPair=new Map(connectorStates.map(state=>[state.pairId,state]));
    layout.connectors=(layout.connectors||[]).map(connector=>({...connector,condition:clone(connectorByPair.get(connector.pairId))}));

    const activeRoomIds=roomStates.filter(state=>!['MISSING','REMOVED','DESTROYED'].includes(state.installationState)).map(state=>state.roomId);
    const activeSet=new Set(activeRoomIds);
    const adjacency=new Map(activeRoomIds.map(id=>[id,new Set()]));
    for(const corridor of layout.corridors||[]){if(corridor.condition?.functional&&activeSet.has(corridor.a)&&activeSet.has(corridor.b)){adjacency.get(corridor.a).add(corridor.b);adjacency.get(corridor.b).add(corridor.a);}}
    for(const [pairId,items] of connectorGroups){const state=connectorByPair.get(pairId);if(!state?.functional||items.length!==2)continue;const a=items[0].nodeId,b=items[1].nodeId;if(activeSet.has(a)&&activeSet.has(b)){adjacency.get(a).add(b);adjacency.get(b).add(a);}}
    let largestComponent=[];
    const unseen=new Set(activeRoomIds);
    while(unseen.size){const start=unseen.values().next().value,seen=new Set([start]),queue=[start];unseen.delete(start);while(queue.length){const current=queue.shift();for(const next of adjacency.get(current)||[]){if(!seen.has(next)){seen.add(next);unseen.delete(next);queue.push(next);}}}if(seen.size>largestComponent.length)largestComponent=[...seen];}
    const coherentVesselGraph=axes.destructionPercent<100&&largestComponent.length>0;
    const salvageCandidates=roomStates.filter(state=>state.installationState!=='MISSING').map(state=>({roomId:state.roomId,label:state.label,deck:state.deck,disposition:state.installationState==='REMOVED'?'REMOVED':state.installationState==='DESTROYED'?'WRECKAGE':'INSTALLED',recoverabilityPercent:clamp(82-state.damagePercent*.58-state.contaminationPercent*.28-(state.salvageRemovalPercent||0))})).filter(item=>item.recoverabilityPercent>0);
    const validationErrors=[];
    if (axes.destructionPercent===100&&coherentVesselGraph) validationErrors.push('Total destruction retained a coherent vessel graph.');
    if (axes.destructionPercent>=75&&axes.destructionPercent<100&&layout.rooms.length>0&&!coherentVesselGraph) validationErrors.push('Sub-total wreck generation failed to retain coherent wreckage.');
    if (roomStates.length!==referenceLayout.rooms.length) validationErrors.push('Condition application changed the reference room inventory.');

    return {
      schemaVersion:'1.0.0',
      model:'hb-vessel-condition-model',
      template:normalized.template,
      axes,
      coherentVesselGraph,
      events,
      roomStates,
      corridorStates,
      connectorStates,
      salvageCandidates,
      survivingGraph:{activeRoomIds,largestComponentRoomIds:largestComponent,traversableCorridorIds:corridorStates.filter(x=>x.functional).map(x=>x.corridorId),traversableConnectorPairIds:connectorStates.filter(x=>x.functional).map(x=>x.pairId)},
      spatialLayout:layout,
      validation:{ok:validationErrors.length===0,errors:validationErrors,warnings:[]}
    };
  }

  return Object.freeze({ CONDITION_TEMPLATES, AXIS_KEYS, normalize, apply });
});