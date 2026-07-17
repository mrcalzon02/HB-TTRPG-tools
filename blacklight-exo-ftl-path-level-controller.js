(() => {
  'use strict';
  const R=globalThis.BlacklightExoFTLPathRuntime,E=globalThis.BlacklightExoFTLPathEngineering;
  if(!R||!E||R.base.pathLevelExtensionVersion)return;
  const {base,D,LEVEL_MAP,FAMILY_MAP,STAGE_TO_TIER,rngFor,clamp,logNumber,ensureControl,requestedLevel,inferLevel,composeLevel,updatePerformance,updateRange,updateNavigation,updateKinematics,secondsText}=R;

  function generate(seed,input={},source=null){
    ensureControl();
    const requested=requestedLevel(input),prepared={...input,pathLevel:requested};
    if(requested!=='random'){
      const rank=LEVEL_MAP[requested]?.rank||0;let tierRank=STAGE_TO_TIER[rank];
      const family=input.family&&input.family!=='random'?FAMILY_MAP[input.family]:null;
      if(family)tierRank=clamp(tierRank,family.tiers[0],family.tiers[1]);
      prepared.tier=`t${tierRank}`;
    }
    const result=base.generate(seed,prepared,source),rng=rngFor(`${seed}:path-levels:v1`),levelKey=requested==='random'?inferLevel(result,rng):requested,stage=composeLevel(result.identity.familyKey,levelKey);
    if(!stage)return result;

    updatePerformance(result,stage,rng);updateRange(result,stage,rng);updateNavigation(result,stage,rng);updateKinematics(result,stage,rng);E.scaleEnergy(result,stage,rng);E.updateRouteAndReliability(result,stage,rng);
    const facilityMass=logNumber(rng,stage.facilityMassTonnes[0],stage.facilityMassTonnes[1]),chemicalComparison=E.makeChemicalComparison(result,stage,rng),hierarchy=E.makeHierarchy(result.identity.familyKey,levelKey);

    result.version=3;
    Object.assign(result.identity,{pathLevel:stage.label,pathLevelKey:stage.key,pathLevelRank:stage.rank,pathName:stage.pathLabel,pathArchitecture:stage.name});
    result.pathLevel={key:stage.key,rank:stage.rank,label:stage.label,pathLabel:stage.pathLabel,architectureName:stage.name,developmentInstallation:stage.scaleDescription,facilityMassTonnes:facilityMass,facilityMassText:`${facilityMass.toLocaleString(undefined,{maximumFractionDigits:2})} tonnes`,speedRangeC:[...stage.speedC],rangeAU:[...stage.rangeAU],energyMultiplierRange:[...stage.energyMultiplier],recommendedEnergyKey:stage.recommendedEnergyKey,recommendedEnergy:stage.recommendedEnergy,chargeWindow:`${secondsText(stage.spoolSeconds[0])}–${secondsText(stage.spoolSeconds[1])}`,recoveryWindow:`${secondsText(stage.cooldownSeconds[0])}–${secondsText(stage.cooldownSeconds[1])}`,breakthrough:stage.breakthrough,utility:stage.utility,limitation:stage.limitation,commonUtility:stage.commonUtility,commonLimit:stage.commonLimit,chemicalComparison};
    result.pathHierarchy=hierarchy;
    result.engineeringMaturity.maturityLabel=`${stage.label} · ${stage.name}`;result.engineeringMaturity.integrationComplexity=clamp(Math.round(result.engineeringMaturity.integrationComplexity+(6-stage.rank)*5),1,100);
    result.compatibility.requested.pathLevel=requested;result.compatibility.resolved.pathLevel=levelKey;
    if(requested!=='random'&&input.tier&&input.tier!=='random'&&input.tier!==result.identity.tierKey){result.compatibility.corrections.push(`Drive-path level ${stage.rank} controls the maturity baseline; shared hierarchy tier ${input.tier} resolved as ${result.identity.tierKey}.`);result.compatibility.fullyHonored=false;}
    result.sourceImpact.push(`${stage.pathLabel} is operating at Path ${stage.rank}: ${stage.name}.`);
    result.summary+=` Within the ${stage.pathLabel.toLowerCase()}, this is Path ${stage.rank} (${stage.label.toLowerCase()}): ${stage.name}. The development installation is a ${stage.scaleDescription}, with a modeled mass of ${result.pathLevel.facilityMassText}, a ${result.pathLevel.chargeWindow} charge window, and a ${result.pathLevel.recoveryWindow} recovery window. ${chemicalComparison.conclusion}`;
    return result;
  }

  ensureControl();
  globalThis.BlacklightExoFTL=Object.freeze({...base,version:3,pathLevelExtensionVersion:1,pathLevels:D.levels,pathDefinitions:D.paths,generate});
})();
