(() => {
  'use strict';
  const base=globalThis.BlacklightExoVessel,prior=globalThis.BlacklightExoVesselContracts,D=globalThis.BlacklightExoVesselGameplayDefinitions;
  if(!base?.gameplayVersion||!prior||!D||base.gameplayContractVersion)return;
  function validate(record){
    const inherited=prior.validate(record),violations=[...(inherited.violations||[])],model=record?.gameplayModel;
    if(model){
      if(!model.validation?.valid)violations.push(...(model.validation?.violations||['VESSEL-09 gameplay validation failed.']));
      if(model.vesselInstanceId!==record.contract?.identifiers?.vesselInstanceId)violations.push('Gameplay vessel identifier does not match the canonical contract.');
      if(model.referenceAuthority?.engineeringLedger!=='VESSEL-02_PHYSICAL_PERFORMANCE_AND_RESOURCE_AUTHORITY')violations.push('Gameplay model lacks VESSEL-02 physical performance authority.');
      if(model.referenceAuthority?.moduleGraph!=='VESSEL-03_INSTALLED_SYSTEM_AND_ROUTE_AUTHORITY')violations.push('Gameplay model lacks VESSEL-03 module and route authority.');
      if(model.referenceAuthority?.conditionHistory!=='VESSEL-05_SURVIVING_GRAPH_AND_RESOURCE_AUTHORITY')violations.push('Gameplay model lacks VESSEL-05 surviving graph authority.');
      if(model.referenceAuthority?.combatGeometry!=='VESSEL-06_TRACK_AND_FIRE_CONTROL_AUTHORITY')violations.push('Gameplay model lacks VESSEL-06 track authority.');
      if(model.referenceAuthority?.weaponEngagement!=='VESSEL-07_WEAPON_FAMILY_AND_ENVELOPE_AUTHORITY')violations.push('Gameplay model lacks VESSEL-07 engagement authority.');
      if(model.referenceAuthority?.combatResolution!=='VESSEL-08_POST_IMPACT_STATE_AUTHORITY')violations.push('Gameplay model lacks VESSEL-08 post-impact authority.');
      if(model.statistics?.length!==D.statDefinitions.length)violations.push('Gameplay model does not expose every VESSEL-09 statistic.');
      for(const stat of model.statistics||[]){if(stat.value<0||stat.value>100)violations.push(`${stat.key} is outside 0-100.`);if(!stat.sourceLinks?.length)violations.push(`${stat.key} lacks traceable source links.`);}
      for(const action of model.actions||[]){if(!D.actionCategories.includes(action.category))violations.push(`${action.actionId} has an unknown category.`);if(!model.statistics?.some(stat=>stat.key===action.statKey))violations.push(`${action.actionId} references an unknown statistic.`);if(!action.available&&action.successProbabilityPercent!==0)violations.push(`${action.actionId} is unavailable but retains a success probability.`);if(action.outcomeAuthority!=='SHARED_PERCENTILE')violations.push(`${action.actionId} does not use the shared percentile authority.`);}
      for(const category of D.actionCategories)if(!model.actions?.some(action=>action.category===category))violations.push(`Gameplay action set lacks ${category}.`);
      if(model.resolverCompatibility?.sameProbabilityAuthority!==true||model.simplifiedResolution?.roll!=='d100'||model.detailedResolution?.roll!=='d100')violations.push('Simplified and detailed gameplay resolution are not compatible.');
      if(record.contract?.derivedLayers?.find(layer=>layer.key==='gameplayStatBlock')?.source!=='VESSEL-09 traceable normalized vessel statistics')violations.push('Canonical gameplay stat layer does not identify VESSEL-09 authority.');
      if(record.contract?.derivedLayers?.find(layer=>layer.key==='actionSet')?.source!=='VESSEL-09 RPG action economy')violations.push('Canonical action set does not identify VESSEL-09 authority.');
      if(record.contract?.provenance?.generatorVersion!=='3.9.0'||record.contract?.provenance?.gameplayVersion!=='1.0.0')violations.push('Canonical provenance does not identify VESSEL-09 gameplay authority.');
      if(record.contract?.extensions?.gameplaySchema!=='data/schemas/exo-vessel-gameplay.schema.json')violations.push('Canonical contract does not expose the gameplay schema.');
      if(model.deferredSystems?.integratedUiAndCampaignPersistence!=='VESSEL-10')violations.push('VESSEL-09 does not defer integrated UI and campaign persistence to VESSEL-10.');
    }
    return{valid:!violations.length,violations};
  }
  const contracts=Object.freeze({...prior,gameplayRegistryPath:'data/exo-vessel/gameplay-action-registry.json',schemas:Object.freeze({...prior.schemas,gameplay:'data/schemas/exo-vessel-gameplay.schema.json'}),validate});
  function finalize(result){if(result?.contract)result.contract.validation=validate(result);return result;}
  function generate(seed,input={},source=null){return finalize(base.generate(seed,input,source));}
  function migrateRecord(record,input={},source=null){return finalize(base.migrateRecord(record,input,source));}
  globalThis.BlacklightExoVesselContracts=contracts;
  globalThis.BlacklightExoVessel=Object.freeze({...base,gameplayContractVersion:1,contracts,validateContract:validate,generate,migrateRecord});
})();
