(() => {
  'use strict';
  const base=globalThis.BlacklightExoVessel,prior=globalThis.BlacklightExoVesselContracts;
  if(!base?.conditionHistoryVersion||!prior||base.conditionContractVersion)return;
  function validate(record){
    const inherited=prior.validate(record),violations=[...(inherited.violations||[])],history=record?.conditionHistory;
    if(history){
      if(!history.validation?.valid)violations.push(...(history.validation?.violations||['VESSEL-05 condition history validation failed.']));
      if(history.vesselInstanceId!==record.contract?.identifiers?.vesselInstanceId)violations.push('Condition history vessel identifier does not match the canonical contract.');
      const modules=record.moduleGraph?.modules||[],states=history.moduleStates||[],stateIds=new Set(states.map(state=>state.moduleId));if(stateIds.size!==modules.length||modules.some(module=>!stateIds.has(module.moduleId)))violations.push('Condition history inventory does not match the persistent semantic module inventory.');
      for(const module of modules){const state=states.find(item=>item.moduleId===module.moduleId),reference=module.extensions?.conditionReferenceState;if(!reference||reference.phase!=='VESSEL-03'||reference.authority!=='INTACT_REFERENCE'||!reference.state)violations.push(`${module.moduleId} lacks preserved intact-reference state.`);if(state){const{moduleId,...expected}=state;if(JSON.stringify(module.state)!==JSON.stringify(expected))violations.push(`${module.moduleId} state diverges from canonical condition history.`);}}
      const placements=record.voxelLayout?.modulePlacements||[],voxelStates=history.voxelStates||[],placementIds=new Set(placements.map(item=>item.placementId)),voxelStateIds=new Set(voxelStates.map(item=>item.placementId));if(placementIds.size!==voxelStateIds.size||[...placementIds].some(id=>!voxelStateIds.has(id)))violations.push('Voxel condition inventory does not match the intact VESSEL-04 placement inventory.');
      for(const voxelState of voxelStates){if(['MISSING','REMOVED'].includes(voxelState.installationState)&&voxelState.occupied)violations.push(`${voxelState.placementId} is absent but remains occupied.`);if(voxelState.graphParticipation==='NONE'&&voxelState.coherentParticipation)violations.push(`${voxelState.placementId} claims coherence without graph participation.`);}
      if(history.residualVoxelField?.referencePlacementCount!==placements.length)violations.push('Residual voxel field does not preserve the intact placement count.');
      if(history.residualVoxelField?.coherentVesselGraph!==history.coherentVesselGraph)violations.push('Residual voxel coherence disagrees with condition history.');
      if(record.damageTopology?.voxelStates?.length!==voxelStates.length||record.damageTopology?.residualVoxelField?.referenceAuthority!=='VESSEL-04_INTACT_VOXEL_LAYOUT')violations.push('Damage topology does not expose canonical voxel condition state.');
      if(record.contract?.condition?.applicationStatus!=='APPLIED_TO_MODULE_AND_VOXEL_GRAPHS')violations.push('Canonical condition was not applied to module and voxel graph authority.');
      if(record.contract?.condition?.coherentVesselGraph!==history.coherentVesselGraph)violations.push('Canonical condition coherence disagrees with condition history.');
      if(record.contract?.derivedLayers?.find(layer=>layer.key==='damageTopology')?.status!=='generated')violations.push('Canonical contract did not mark damageTopology as generated.');
      if(record.contract?.provenance?.generatorVersion!=='3.5.0'||record.contract?.provenance?.conditionHistoryVersion!=='1.0.0')violations.push('Canonical provenance does not identify VESSEL-05.');
      if(record.contract?.extensions?.conditionHistorySchema!=='data/schemas/exo-vessel-condition-history.schema.json')violations.push('Canonical contract does not expose the condition-history schema.');
      if(history.axes?.destructionPercent===100&&(history.coherentVesselGraph||history.residualVoxelField?.coherentVesselGraph||Object.values(history.effectiveGraphs||{}).some(graph=>graph.nodes?.length||graph.edges?.length)))violations.push('Total destruction retained coherent effective topology.');
      if(history.axes?.destructionPercent>=75&&history.axes?.destructionPercent<100&&!history.coherentVesselGraph)violations.push('A sub-total wreck failed to retain coherent wreckage.');
      const forbidden=JSON.stringify(history);for(const marker of ['lightLagSeconds','engagementEnvelope','hitProbability','impactVoxel'])if(forbidden.includes(marker))violations.push(`VESSEL-05 prematurely includes deferred field ${marker}.`);
    }
    return{valid:!violations.length,violations};
  }
  const contracts=Object.freeze({...prior,conditionHistoryRegistryPath:'data/exo-vessel/condition-history-registry.json',schemas:Object.freeze({...prior.schemas,conditionHistory:'data/schemas/exo-vessel-condition-history.schema.json'}),validate});
  function finalize(result){if(result?.contract)result.contract.validation=validate(result);return result;}
  function generate(seed,input={},source=null){return finalize(base.generate(seed,input,source));}
  function migrateRecord(record,input={},source=null){return finalize(base.migrateRecord(record,input,source));}
  globalThis.BlacklightExoVesselContracts=contracts;
  globalThis.BlacklightExoVessel=Object.freeze({...base,conditionContractVersion:1,contracts,validateContract:validate,generate,migrateRecord});
})();