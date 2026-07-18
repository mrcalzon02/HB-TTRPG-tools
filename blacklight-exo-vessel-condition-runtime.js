(() => {
  'use strict';
  const base=globalThis.BlacklightExoVessel,C=globalThis.BlacklightExoVesselConditionCore,P=globalThis.BlacklightExoVesselConditionPropagation,D=globalThis.BlacklightExoVesselConditionDefinitions;
  if(!base?.voxelContractVersion||!C||!P||!D||base.conditionHistoryVersion)return;
  const clone=value=>value==null?value:structuredClone(value);
  const dom=id=>globalThis.document?.getElementById?.(id)?.value||null;
  function validationMode(input){const mode=String(input.conditionValidationMode||dom('exo-vessel-condition-mode')||'REPAIR').toUpperCase();if(!['REPAIR','STRICT'].includes(mode))throw new Error(`Unknown condition validation mode ${mode}.`);return mode;}
  function synchronizeModules(result,history){const states=new Map(history.moduleStates.map(state=>[state.moduleId,state]));for(const module of result.moduleGraph.modules){const state=states.get(module.moduleId);if(state){const{moduleId,...moduleState}=state;module.state=clone(moduleState);}}result.modules=result.moduleGraph.modules;}
  function generatedLayer(layer){return layer.key==='damageTopology'?{...layer,status:'generated',version:'1.0.0',source:'VESSEL-05 condition history and surviving graphs',notes:'Condition, lifecycle history, removal provenance, residual mass, and effective connectivity are applied without altering the intact VESSEL-03 and VESSEL-04 reference authorities.'}:layer;}
  function apply(input,result){
    if(result?.conditionHistory?.phase==='VESSEL-05'&&result?.contract?.provenance?.generatorVersion==='3.5.0')return result;
    const condition=clone(result.contract.condition),mode=validationMode(input),primary=C.applyPrimaryCondition(result,condition,result.contract.seeds.historySeed),history=P.build(result,condition,primary,{...input,conditionValidationMode:mode});history.validationMode=mode;synchronizeModules(result,history);
    result.conditionHistory=history;
    result.damageTopology={recordType:'exoVesselDamageTopology',schemaVersion:'1.0.0',phase:'VESSEL-05',vesselInstanceId:history.vesselInstanceId,coherentVesselGraph:history.coherentVesselGraph,effectiveGraphs:clone(history.effectiveGraphs),zoneStates:clone(history.zoneStates),routeStates:clone(history.routeStates),loadPathStates:clone(history.loadPathStates),moduleStates:clone(history.moduleStates),referenceAuthority:clone(history.referenceAuthority),validation:clone(history.validation)};
    result.effectiveVessel={recordType:'exoVesselEffectiveState',schemaVersion:'1.0.0',phase:'VESSEL-05',vesselInstanceId:history.vesselInstanceId,coherentVesselGraph:history.coherentVesselGraph,...clone(history.recalculated)};
    const appliedCondition={...condition,coherentVesselGraph:history.coherentVesselGraph,applicationStatus:'APPLIED_TO_MODULE_AND_VOXEL_GRAPHS',validation:clone(history.validation)};result.condition=clone(appliedCondition);result.contract.condition=clone(appliedCondition);
    result.contract.derivedLayers=result.contract.derivedLayers.map(generatedLayer);
    result.contract.provenance={...result.contract.provenance,generatorVersion:'3.5.0',conditionHistoryVersion:'1.0.0',conditionHistoryRegistry:'data/exo-vessel/condition-history-registry.json'};
    result.contract.extensions={...result.contract.extensions,conditionHistorySchema:'data/schemas/exo-vessel-condition-history.schema.json'};
    result.warnings=[...(result.warnings||[]),`VESSEL-05 applied ${history.activeTemplate} through ${history.events.length} deterministic history events and retained ${history.recalculated.residualMassTonnes.toLocaleString(undefined,{maximumFractionDigits:3})} tonnes of residual material.`,`The intact module graph and voxel layout remain design authority. Effective graphs contain only surviving physical or functional participation; combat tracks, weapon envelopes, and local hit resolution remain deferred to VESSEL-06 through VESSEL-08.`];
    return result;
  }
  function generate(seed,input={},source=null){return apply(input,base.generate(seed,input,source));}
  function migrateRecord(record,input={},source=null){return apply(input,base.migrateRecord(record,input,source));}
  globalThis.BlacklightExoVessel=Object.freeze({...base,conditionHistoryVersion:1,conditionHistorySchemaVersion:'1.0.0',conditionDefinitions:D,generate,migrateRecord});
})();