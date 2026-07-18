(() => {
  'use strict';
  const prior=globalThis.BlacklightExoVesselConditionPropagation;
  if(!prior||prior.voxelConditionVersion)return;
  const clone=value=>value==null?value:structuredClone(value);
  function stateLabel(state){
    if(state.installationState==='MISSING')return'MISSING_CONSTRUCTION';
    if(state.installationState==='REMOVED')return state.disposition==='SALVAGE'?'SALVAGED_OUT':'REMOVED';
    if(state.installationState==='DESTROYED')return'DESTROYED_WRECKAGE';
    if(state.installationState==='INCOMPLETE')return'INCOMPLETE';
    if(state.serviceState==='WRECKAGE')return'WRECKAGE';
    if(state.damagePercent>0)return'DAMAGED';
    if(state.graphParticipation==='PHYSICAL_ONLY')return'INACTIVE_PHYSICAL';
    return'ACTIVE';
  }
  function voxelStates(result,history){
    const states=new Map(history.moduleStates.map(state=>[state.moduleId,state]));
    return(result.voxelLayout?.modulePlacements||[]).map(placement=>{
      const state=states.get(placement.moduleId);if(!state)throw new Error(`Voxel placement ${placement.placementId} lacks VESSEL-05 module state.`);
      const occupied=state.residualVolumeM3>0&& !['MISSING','REMOVED'].includes(state.installationState);
      return{placementId:placement.placementId,moduleId:placement.moduleId,bounds:clone(placement.bounds),referenceVoxelType:placement.voxelType,referenceCapacityCells:placement.capacityCells,conditionState:stateLabel(state),installationState:state.installationState,serviceState:state.serviceState,disposition:state.disposition,graphParticipation:state.graphParticipation,damagePercent:state.damagePercent,conditionPercent:state.conditionPercent,residualVolumeM3:state.residualVolumeM3,occupied,residualMaterial:occupied,coherentParticipation:history.coherentVesselGraph&&state.graphParticipation!=='NONE'};
    });
  }
  function residualVoxelField(result,history,states){
    const occupied=states.filter(state=>state.occupied),active=states.filter(state=>state.graphParticipation==='ACTIVE'),wreckage=states.filter(state=>['WRECKAGE','DESTROYED_WRECKAGE','DAMAGED'].includes(state.conditionState)),removed=states.filter(state=>!state.occupied);
    return{recordType:'exoVesselResidualVoxelField',schemaVersion:'1.0.0',phase:'VESSEL-05',vesselInstanceId:history.vesselInstanceId,referenceLayoutVersion:result.voxelLayout?.schemaVersion||'1.0.0',referenceGrid:clone(result.voxelLayout?.grid||null),coherentVesselGraph:history.coherentVesselGraph,referencePlacementCount:states.length,occupiedPlacementCount:occupied.length,activePlacementCount:active.length,wreckagePlacementCount:wreckage.length,absentPlacementCount:removed.length,occupiedPlacementIds:occupied.map(state=>state.placementId),activePlacementIds:active.map(state=>state.placementId),wreckagePlacementIds:wreckage.map(state=>state.placementId),absentPlacementIds:removed.map(state=>state.placementId),functionalRouteIds:history.routeStates.filter(route=>route.functional).map(route=>route.routeId),severedRouteIds:history.routeStates.filter(route=>!route.functional).map(route=>route.routeId),referenceAuthority:'VESSEL-04_INTACT_VOXEL_LAYOUT'};
  }
  function validateVoxelState(result,history){
    const violations=[],placements=result.voxelLayout?.modulePlacements||[],states=history.voxelStates||[],placementIds=new Set(placements.map(item=>item.placementId)),stateIds=new Set(states.map(item=>item.placementId));
    if(placementIds.size!==stateIds.size||[...placementIds].some(id=>!stateIds.has(id)))violations.push('Voxel condition inventory does not match the intact VESSEL-04 placement inventory.');
    for(const state of states){if(!placementIds.has(state.placementId))violations.push(`${state.placementId} is not an intact voxel placement.`);if(['MISSING','REMOVED'].includes(state.installationState)&&state.occupied)violations.push(`${state.placementId} is absent but still marked occupied.`);if(state.residualVolumeM3===0&&state.occupied)violations.push(`${state.placementId} has no residual volume but remains occupied.`);if(state.graphParticipation==='NONE'&&state.coherentParticipation)violations.push(`${state.placementId} lacks graph participation but claims coherent participation.`);}
    if(history.axes.destructionPercent===100&&history.residualVoxelField.coherentVesselGraph)violations.push('Total destruction retained a coherent residual voxel field.');
    return{valid:!violations.length,violations};
  }
  function build(result,condition,primary,input={}){
    const history=prior.build(result,condition,primary,input),states=voxelStates(result,history);history.voxelStates=states;history.residualVoxelField=residualVoxelField(result,history,states);const validation=validateVoxelState(result,history);if(!validation.valid)throw new Error(`Voxel condition application rejected: ${validation.violations.join('; ')}`);history.validation={...history.validation,voxelStateCount:states.length};return history;
  }
  globalThis.BlacklightExoVesselConditionPropagation=Object.freeze({...prior,voxelConditionVersion:1,voxelStates,residualVoxelField,validateVoxelState,build});
})();