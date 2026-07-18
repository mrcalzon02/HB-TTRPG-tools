(() => {
  'use strict';
  const base=globalThis.BlacklightExoVessel,D=globalThis.BlacklightExoVesselGameplayDefinitions,C=globalThis.BlacklightExoVesselGameplayCore;
  if(!base?.combatResolutionContractVersion||!D||!C||base.gameplayVersion)return;
  const dom=id=>globalThis.document?.getElementById?.(id)?.value??null;
  function validationMode(input){const mode=String(input.gameplayValidationMode||dom('exo-vessel-gameplay-mode')||D.defaults.validationMode).toUpperCase();if(!D.validationModes.includes(mode))throw new Error(`Unknown gameplay validation mode ${mode}.`);return mode;}
  function gameplayDifficulty(input){const value=Number(input.gameplayDifficultyPercent??dom('exo-vessel-gameplay-difficulty')??D.defaults.difficultyPercent);return Number.isFinite(value)?Math.max(0,Math.min(100,value)):D.defaults.difficultyPercent;}
  function familyKey(weaponFamily){return weaponFamily==='SAND_GUN'?'sand-gun':weaponFamily==='LASER'?'laser':weaponFamily==='MISSILE'?'guided-missile':String(weaponFamily||'').toLowerCase().replaceAll('_','-');}
  function canonicalWeaponAuthority(result){
    const weaponModel=result?.weaponEngagementModel;if(!weaponModel)return result;
    const engagements=(weaponModel.engagements||[]).map(item=>({...item,operational:item.operationalState,familyKey:familyKey(item.weaponFamily)}));
    const countermeasureEnvelopes=(weaponModel.countermeasureEnvelopes||[]).map(item=>({...item,operational:item.operationalState,inventory:{...(item.inventory||{}),rounds:item.effectiveUnitCount}}));
    return{...result,weaponEngagementModel:{...weaponModel,engagements,countermeasureEnvelopes}};
  }
  function canonicalizeSourceLinks(model){
    const rewrite=link=>({...link,path:String(link.path||'').replaceAll('.operational.','.operationalState.').replace('countermeasureEnvelopes[].operationalState.effectiveRounds','countermeasureEnvelopes[].operationalState.effectiveRounds')});
    for(const stat of model.statistics||[])stat.sourceLinks=(stat.sourceLinks||[]).map(rewrite);
    for(const pool of model.resources?.pools||[])pool.sourceLinks=(pool.sourceLinks||[]).map(rewrite);
    for(const action of model.actions||[])action.sourceLinks=(action.sourceLinks||[]).map(rewrite);
    model.validation.warnings=[...(model.validation.warnings||[]),'VESSEL-09 consumed canonical VESSEL-07 operationalState, weaponFamily, and effectiveUnitCount authority through the phase-boundary adapter.'];
    return model;
  }
  function layerUpdate(layer){
    if(layer.key==='gameplayStatBlock')return{...layer,status:'generated',version:'1.0.0',source:'VESSEL-09 traceable normalized vessel statistics',notes:'Ten normalized statistics retain weighted links to engineering, surviving graphs, track state, weapon envelopes, resources, crew support, and post-impact authority.'};
    if(layer.key==='actionSet')return{...layer,status:'validated',version:'1.0.0',source:'VESSEL-09 RPG action economy',notes:'Navigation, sensor/targeting, offensive, defensive, engineering, and damage-control actions share one deterministic percentile authority in simplified and detailed play.'};
    return layer;
  }
  function build(result,input){const mode=validationMode(input),difficulty=gameplayDifficulty(input),seed=`${result.contract.seeds.equipmentSeed}:gameplay:${result.contract.seeds.historySeed}`;return canonicalizeSourceLinks(C.build(canonicalWeaponAuthority(result),{...input,gameplayValidationMode:mode,gameplayDifficultyPercent:difficulty},seed));}
  function apply(input,result){
    if(result?.gameplayModel?.phase==='VESSEL-09'&&result?.contract?.provenance?.gameplayVersion==='1.0.0')return result;
    const record=build(result,input);result.gameplayModel=record;result.gameplayStatBlock={recordType:'exoVesselGameplayStatBlock',schemaVersion:'1.0.0',phase:'VESSEL-09',vesselInstanceId:record.vesselInstanceId,statistics:record.statistics,normalization:record.normalization,referenceAuthority:record.referenceAuthority};result.actionSet={recordType:'exoVesselActionSet',schemaVersion:'1.0.0',phase:'VESSEL-09',vesselInstanceId:record.vesselInstanceId,resources:record.resources,actions:record.actions,simplifiedResolution:record.simplifiedResolution,detailedResolution:record.detailedResolution,resolverCompatibility:record.resolverCompatibility};
    result.contract.derivedLayers=result.contract.derivedLayers.map(layerUpdate);result.contract.provenance={...result.contract.provenance,generatorVersion:'3.9.0',gameplayVersion:'1.0.0',gameplayRegistry:'data/exo-vessel/gameplay-action-registry.json'};result.contract.extensions={...result.contract.extensions,gameplaySchema:'data/schemas/exo-vessel-gameplay.schema.json'};
    const available=record.actions.filter(item=>item.available).length,averageStat=record.statistics.reduce((sum,item)=>sum+item.value,0)/Math.max(1,record.statistics.length);result.warnings=[...(result.warnings||[]),`VESSEL-09 exposes ${record.statistics.length} source-traceable vessel statistics averaging ${averageStat.toFixed(1)} and ${available} currently available actions.`,`Simplified and detailed action resolution use the same deterministic d100 probability authority; detailed play adds timing, resources, opportunity cost, and consequence detail without changing the roll.`,`Campaign persistence, integrated combat state, and the final diegetic control revision remain deferred to VESSEL-10.`];return result;
  }
  function generate(seed,input={},source=null){return apply(input,base.generate(seed,input,source));}
  function migrateRecord(record,input={},source=null){return apply(input,base.migrateRecord(record,input,source));}
  function resolveAction(recordOrModel,actionId,context={}){const model=recordOrModel?.gameplayModel||recordOrModel;return C.resolveAction(model,actionId,context);}
  globalThis.BlacklightExoVessel=Object.freeze({...base,gameplayVersion:1,gameplaySchemaVersion:'1.0.0',gameplayDefinitions:D,resolveGameplayAction:resolveAction,generate,migrateRecord});
})();
