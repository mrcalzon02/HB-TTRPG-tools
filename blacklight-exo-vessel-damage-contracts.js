(() => {
  'use strict';
  const base=globalThis.BlacklightExoVessel,prior=globalThis.BlacklightExoVesselContracts;
  if(!base?.combatResolutionVersion||!prior||base.combatResolutionContractVersion)return;
  function validate(record){
    const inherited=prior.validate(record),violations=[...(inherited.violations||[])],model=record?.combatResolutionModel;
    if(model){
      if(!model.validation?.valid)violations.push(...(model.validation?.violations||['VESSEL-08 combat resolution validation failed.']));
      if(model.vesselInstanceId!==record.contract?.identifiers?.vesselInstanceId)violations.push('Combat resolution vessel identifier does not match the canonical contract.');
      if(model.referenceAuthority?.voxelLayout!=='VESSEL-04_INTACT_PLACEMENT_AND_DIRECTIONAL_SURFACE_AUTHORITY')violations.push('Combat resolution lacks VESSEL-04 voxel and protection-surface authority.');
      if(model.referenceAuthority?.conditionHistory!=='VESSEL-05_IMMUTABLE_PRE_IMPACT_AND_SURVIVING_GRAPH_AUTHORITY')violations.push('Combat resolution lacks immutable VESSEL-05 pre-impact authority.');
      if(model.referenceAuthority?.combatGeometry!=='VESSEL-06_TRACK_AND_TARGET_MANEUVER_AUTHORITY')violations.push('Combat resolution lacks VESSEL-06 combat geometry authority.');
      if(model.referenceAuthority?.weaponEngagement!=='VESSEL-07_INSTALLED_WEAPON_AND_ENGAGEMENT_AUTHORITY')violations.push('Combat resolution lacks VESSEL-07 weapon engagement authority.');
      if(model.interceptResolution?.outcome==='IMPACT'){
        if(!record.voxelLayout?.modulePlacements?.some(item=>item.placementId===model.impact?.placementId&&item.moduleId===model.impact?.moduleId))violations.push('Combat resolution impact does not map to a canonical placement and module.');
      }else if(model.localEffects?.moduleEffects?.length)violations.push('Non-impact combat result contains local module damage.');
      for(const effect of model.localEffects?.moduleEffects||[])if(effect.after?.installationState==='DESTROYED'&&(effect.after?.operational||effect.after?.graphParticipation!=='NONE'))violations.push(`${effect.moduleId} remains usable after VESSEL-08 destruction.`);
      if(model.postImpactState?.referenceConditionAuthority!=='VESSEL-05_IMMUTABLE_PRE_IMPACT')violations.push('Post-impact state does not preserve VESSEL-05 reference authority.');
      if(model.postImpactState?.recalculated?.residualMassTonnes>model.postImpactState?.recalculated?.preImpactResidualMassTonnes+1e-9)violations.push('Post-impact mass exceeds the pre-impact condition state.');
      if(JSON.stringify(record.conditionHistory?.moduleStates||[])!==model.referenceSnapshots?.conditionModuleStatesJson)violations.push('Canonical VESSEL-05 condition history was mutated by combat resolution.');
      if(record.contract?.derivedLayers?.find(layer=>layer.key==='damageTopology')?.source!=='VESSEL-08 local combat resolution')violations.push('Canonical damage topology does not identify VESSEL-08 authority.');
      if(record.contract?.provenance?.generatorVersion!=='3.8.0'||record.contract?.provenance?.combatResolutionVersion!=='1.0.0')violations.push('Canonical provenance does not identify VESSEL-08 combat resolution.');
      if(record.contract?.extensions?.combatResolutionSchema!=='data/schemas/exo-vessel-combat-resolution.schema.json')violations.push('Canonical contract does not expose the combat-resolution schema.');
      if(model.deferredSystems?.gameplayStatisticsAndActions!=='VESSEL-09')violations.push('VESSEL-08 does not defer gameplay statistics and actions to VESSEL-09.');
    }
    return{valid:!violations.length,violations};
  }
  const contracts=Object.freeze({...prior,combatResolutionRegistryPath:'data/exo-vessel/combat-resolution-registry.json',schemas:Object.freeze({...prior.schemas,combatResolution:'data/schemas/exo-vessel-combat-resolution.schema.json'}),validate});
  function finalize(result){if(result?.contract)result.contract.validation=validate(result);return result;}
  function generate(seed,input={},source=null){return finalize(base.generate(seed,input,source));}
  function migrateRecord(record,input={},source=null){return finalize(base.migrateRecord(record,input,source));}
  globalThis.BlacklightExoVesselContracts=contracts;
  globalThis.BlacklightExoVessel=Object.freeze({...base,combatResolutionContractVersion:1,contracts,validateContract:validate,generate,migrateRecord});
})();
