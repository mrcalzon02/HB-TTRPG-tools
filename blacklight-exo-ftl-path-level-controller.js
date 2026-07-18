(() => {
  'use strict';
  const R=globalThis.BlacklightExoFTLPathRuntime,E=globalThis.BlacklightExoFTLPathEngineering;
  if(!R||!E||R.base.pathLevelExtensionVersion)return;
  const {base,D,LEVEL_MAP,FAMILY_MAP,STAGE_TO_TIER,LEVEL5_BALANCE,LEVEL5_PROFILES,rngFor,clamp,logNumber,ensureControl,requestedLevel,inferLevel,composeLevel,updatePerformance,updateRange,updateNavigation,updateKinematics,secondsText}=R;

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
    let facilityMass=logNumber(rng,stage.facilityMassTonnes[0],stage.facilityMassTonnes[1]);
    const isLevel5=stage.rank===5,isWormhole=isLevel5&&result.identity.familyKey==='wormhole-gate',profile=LEVEL5_PROFILES[result.identity.familyKey];
    if(isWormhole)facilityMass=Math.max(25000000,facilityMass*2500);
    const chemicalComparison=E.makeChemicalComparison(result,stage,rng),hierarchy=E.makeHierarchy(result.identity.familyKey,levelKey);

    result.version=3;
    Object.assign(result.identity,{pathLevel:stage.label,pathLevelKey:stage.key,pathLevelRank:stage.rank,pathName:stage.pathLabel,pathArchitecture:stage.name});
    result.pathLevel={key:stage.key,rank:stage.rank,label:stage.label,pathLabel:stage.pathLabel,architectureName:stage.name,developmentInstallation:isWormhole?'paired fixed stellar or deep-space gate mouths with chronology control, route-defense, mass-flow balancing, and civilization-scale support industry':stage.scaleDescription,facilityMassTonnes:facilityMass,facilityMassText:`${facilityMass.toLocaleString(undefined,{maximumFractionDigits:2})} tonnes`,speedRangeC:[...stage.speedC],rangeAU:[...stage.rangeAU],energyMultiplierRange:[...stage.energyMultiplier],recommendedEnergyKey:stage.recommendedEnergyKey,recommendedEnergy:stage.recommendedEnergy,chargeWindow:`${secondsText(stage.spoolSeconds[0])}–${secondsText(stage.spoolSeconds[1])}`,recoveryWindow:`${secondsText(stage.cooldownSeconds[0])}–${secondsText(stage.cooldownSeconds[1])}`,breakthrough:stage.breakthrough,utility:stage.utility,limitation:stage.limitation,commonUtility:stage.commonUtility,commonLimit:stage.commonLimit,chemicalComparison};
    if(isLevel5&&profile){
      Object.assign(result.pathLevel,{speedFloorAuPerHour:profile.minAuPerHour,speedTargetAuPerHour:profile.targetAuPerHour,speedCeilingAuPerHour:profile.maxAuPerHour,speedVariationAuPerHour:profile.variationAuPerHour,speedBandAuPerHour:[profile.minAuPerHour,profile.maxAuPerHour],balanceAuthority:'Path Level 5 AU/hour family operating band'});
      result.pathLevel.balanceNote=isWormhole
        ?`Path 5 wormhole-gate transit operates around ${profile.targetAuPerHour} AU/hour with a controlled ±${profile.variationAuPerHour} AU/hour band, never exceeding ${profile.maxAuPerHour} AU/hour. Its advantage remains inseparable from paired fixed mouths, chronology control, exceptional scarcity, and civilization-scale cost.`
        :`This Path 5 family operates around ${profile.targetAuPerHour} AU/hour with a controlled ±${profile.variationAuPerHour} AU/hour band. Route quality and doctrine may move the result between ${profile.minAuPerHour} and ${profile.maxAuPerHour} AU/hour, but cannot exceed that family envelope.`;
    }
    if(isWormhole){
      Object.assign(result.pathLevel,{rarityClass:'UNIVERSE_RAREST',capitalBurdenClass:'CIVILIZATION_SCALE_MAXIMUM',engineeringDifficultyClass:'EXTREME_TOPOLOGICAL',capitalCostIndex:100,engineeringDifficultyIndex:100,availabilityIndex:1,infrastructureRule:'Path 5 wormhole transit requires paired fixed mouths, chronology-safe synchronization, protected route governance, and exceptional exotic-state production.'});
      result.engineeringMaturity.integrationComplexity=Math.max(97,result.engineeringMaturity.integrationComplexity);
      result.risk.score=Math.max(94,result.risk.score);result.risk.label='Critical';
      result.risk.drivers=[...new Set([...(result.risk.drivers||[]),'universe-rarest paired wormhole infrastructure','chronology-safe mouth synchronization','civilization-scale capital and exotic-state burden'])];
      result.power.pathLevelCapitalBurdenClass='CIVILIZATION_SCALE_MAXIMUM';
    }
    result.pathHierarchy=hierarchy;
    result.engineeringMaturity.maturityLabel=`${stage.label} · ${stage.name}`;result.engineeringMaturity.integrationComplexity=clamp(Math.round(result.engineeringMaturity.integrationComplexity+(6-stage.rank)*5),1,100);
    result.compatibility.requested.pathLevel=requested;result.compatibility.resolved.pathLevel=levelKey;
    if(requested!=='random'&&input.tier&&input.tier!=='random'&&input.tier!==result.identity.tierKey){result.compatibility.corrections.push(`Drive-path level ${stage.rank} controls the maturity baseline; shared hierarchy tier ${input.tier} resolved as ${result.identity.tierKey}.`);result.compatibility.fullyHonored=false;}
    result.sourceImpact.push(`${stage.pathLabel} is operating at Path ${stage.rank}: ${stage.name}.`);
    if(isLevel5&&profile)result.sourceImpact.push(`${stage.pathLabel} Path 5 performance is constrained to ${profile.minAuPerHour}–${profile.maxAuPerHour} AU/hour around a ${profile.targetAuPerHour} AU/hour setting target.`);
    if(isWormhole)result.sourceImpact.push('Path 5 wormhole transit is the rarest, most expensive, and most difficult transit technology in the setting; its superior operating band cannot be separated from fixed infrastructure and civilization-scale burden.');
    result.summary+=` Within the ${stage.pathLabel.toLowerCase()}, this is Path ${stage.rank} (${stage.label.toLowerCase()}): ${stage.name}. The development installation is a ${result.pathLevel.developmentInstallation}, with a modeled mass of ${result.pathLevel.facilityMassText}, a ${result.pathLevel.chargeWindow} charge window, and a ${result.pathLevel.recoveryWindow} recovery window. ${chemicalComparison.conclusion}`;
    if(isLevel5&&profile)result.summary+=` Its Path 5 travel-vector band is ${profile.minAuPerHour}–${profile.maxAuPerHour} AU/hour, centered on ${profile.targetAuPerHour} AU/hour with ±${profile.variationAuPerHour} AU/hour technology and route variation.`;
    if(isWormhole)result.summary+=` The ${LEVEL5_BALANCE.wormholeMaximumAuPerHour} AU/hour absolute ceiling belongs to the universe's rarest and most expensive paired-gate infrastructure rather than an ordinary shipboard drive.`;
    return result;
  }

  ensureControl();
  globalThis.BlacklightExoFTL=Object.freeze({...base,version:3,pathLevelExtensionVersion:3,pathLevels:D.levels,pathDefinitions:D.paths,pathLevelBalance:LEVEL5_BALANCE,generate});
})();