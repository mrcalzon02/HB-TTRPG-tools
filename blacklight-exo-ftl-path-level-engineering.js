(() => {
  'use strict';
  const R=globalThis.BlacklightExoFTLPathRuntime;if(!R)return;
  const {base,D,ENERGY_MAP,DISCRETE_MODES,number,clamp,logNumber,secondsText,distanceText,energyText,powerText,massText,composeLevel}=R;
  const {AU_KM,LY_AU}=base.constants;

  function scaleEnergy(result,stage,rng){
    const multiplier=number(rng,stage.energyMultiplier[0],stage.energyMultiplier[1]),energy=base.energySystems.find(item=>item.label===result.identity.energySystem)||base.energySystems[0],budget=result.energyBudget;
    const activation=result.power.activationJ*multiplier,transit=budget.transitJ*multiplier,collapse=budget.collapseJ*multiplier,mission=activation+transit+collapse,fuel=mission/(energy.specific*energy.efficiency),thermal=mission*(1-energy.efficiency);
    const peak=activation/Math.max(.001,result.performance.spoolSeconds*number(rng,.08,.22)),sustained=transit/Math.max(.001,result.kinematics.payloadTransitSeconds),rechargePower=Math.max(result.power.averagePowerW*.18,peak*number(rng,.02,.18)),recharge=mission/rechargePower,cycles=Math.max(1,Math.round(budget.tankageCycles/clamp(Math.sqrt(multiplier),1,12)));
    Object.assign(budget,{activationJ:activation,activationText:energyText(activation),transitJ:transit,transitText:energyText(transit),collapseJ:collapse,collapseText:energyText(collapse),missionJ:mission,missionText:energyText(mission),peakPowerW:peak,peakPowerText:powerText(peak),sustainedPowerW:sustained,sustainedPowerText:powerText(sustained),missionFuelKg:fuel,missionFuelText:massText(fuel),fuelPerAUkg:fuel/Math.max(1e-12,result.performance.referenceDistanceAU),fuelPerAUText:massText(fuel/Math.max(1e-12,result.performance.referenceDistanceAU)),fuelPerLYkg:fuel/Math.max(1e-12,result.performance.referenceDistanceAU)*LY_AU,fuelPerLYText:massText(fuel/Math.max(1e-12,result.performance.referenceDistanceAU)*LY_AU),thermalDebtJ:thermal,thermalDebtText:energyText(thermal),thermalDebtGWh:thermal/3.6e12,rechargeSeconds:recharge,rechargeText:secondsText(recharge),tankageCycles:cycles,carriedFuelText:massText(fuel*cycles),pathEnergyMultiplier:multiplier});
    const storage=activation*number(rng,1.08,1.35),average=activation/Math.max(.001,result.performance.spoolSeconds),activationFuel=activation/(energy.specific*energy.efficiency),waste=activation*(1-energy.efficiency);
    Object.assign(result.power,{activationJ:activation,activationText:energyText(activation),averagePowerW:average,averagePowerText:powerText(average),storageJ:storage,storageText:energyText(storage),fuelKg:activationFuel,fuelText:massText(activationFuel),wasteJ:waste,wasteText:energyText(waste)});
    budget.accountingNote=`Path-level mission accounting applies a ${multiplier.toFixed(3)}× maturity burden to the underlying architecture. Early levels pay for crude field control, oversized containment, poor conversion efficiency, and long charge losses; mature levels recover energy through tighter metrology and smaller field volumes.`;
  }

  function updateRouteAndReliability(result,stage,rng){
    const windowFactor=number(rng,stage.windowMultiplier[0],stage.windowMultiplier[1]);
    result.routeEnvelope.certifiedWindowAvailabilityPercent=clamp(result.routeEnvelope.certifiedWindowAvailabilityPercent*windowFactor,.1,100);result.routeEnvelope.certifiedWindowText=`${result.routeEnvelope.certifiedWindowAvailabilityPercent.toFixed(2)}% of modeled route time`;
    result.routeEnvelope.wakePersistenceSeconds*=number(rng,Math.max(.3,stage.energyMultiplier[0]**.25),Math.max(.5,stage.energyMultiplier[1]**.3));result.routeEnvelope.wakePersistenceText=secondsText(result.routeEnvelope.wakePersistenceSeconds);
    const reliabilityFactor=number(rng,stage.reliabilityMultiplier[0],stage.reliabilityMultiplier[1]),failures=clamp(result.reliability.modeledFailuresPerThousand*reliabilityFactor,.001,450);
    result.reliability.modeledFailuresPerThousand=failures;result.reliability.certifiedSuccessProbability=1-failures/1000;result.reliability.certifiedSuccessPercent=(1-failures/1000)*100;result.reliability.cycleLife=Math.max(1,Math.round(result.reliability.cycleLife/Math.max(1,reliabilityFactor*.7)));result.reliability.overhaulIntervalCycles=Math.max(1,Math.round(result.reliability.overhaulIntervalCycles/Math.max(1,reliabilityFactor*.6)));result.reliability.pathReliabilityMultiplier=reliabilityFactor;
  }

  function makeChemicalComparison(result,stage,rng){
    const distanceAU=Math.max(stage.minimumEconomicAU,result.performance.referenceDistanceAU),chemicalSeconds=distanceAU*AU_KM/D.chemicalBenchmarkKmS;
    let payloadSeconds=distanceAU/result.performance.practicalAuPerSecond;
    if(DISCRETE_MODES.has(result.kinematics.mode))payloadSeconds=logNumber(rng,stage.crossingSeconds[0],stage.crossingSeconds[1])*(1+Math.log10(Math.max(1,distanceAU))/24);
    const pathSeconds=result.performance.spoolSeconds+payloadSeconds+result.performance.cooldownSeconds;
    return{benchmarkKmPerSecond:D.chemicalBenchmarkKmS,benchmarkDistanceAU:distanceAU,benchmarkDistanceText:distanceText(distanceAU),chemicalMissionSeconds:chemicalSeconds,chemicalMissionText:secondsText(chemicalSeconds),pathMissionSeconds:pathSeconds,pathMissionText:secondsText(pathSeconds),missionAdvantage:chemicalSeconds/Math.max(.001,pathSeconds),cruiseVelocityAdvantage:result.performance.practicalKmPerSecond/D.chemicalBenchmarkKmS,minimumEconomicAU:stage.minimumEconomicAU,conclusion:chemicalSeconds>pathSeconds?`At ${distanceText(distanceAU)}, the complete path-level mission is ${(chemicalSeconds/pathSeconds).toFixed(2)}× faster than the ${D.chemicalBenchmarkKmS} km/s EXO chemical benchmark even after charge and recovery.`:`At ${distanceText(distanceAU)}, charge overhead outweighs the speed advantage; this installation is economically intended for routes longer than ${distanceText(stage.minimumEconomicAU)} or for payloads chemical propulsion cannot support.`};
  }

  function makeHierarchy(familyKey,currentKey){
    const current=R.LEVEL_MAP[currentKey].rank;
    return D.levels.map(level=>{const stage=composeLevel(familyKey,level.key);return{key:level.key,rank:level.rank,label:level.label,name:stage.name,status:level.rank<current?'mastered precursor':level.rank===current?'current path capability':'future path development',speedRange:stage.speedC[1]<1?`${(stage.speedC[0]*100).toFixed(4)}–${(stage.speedC[1]*100).toFixed(3)}% c`:`${stage.speedC[0].toLocaleString()}–${stage.speedC[1].toLocaleString()}c`,range:`${distanceText(stage.rangeAU[0])}–${distanceText(stage.rangeAU[1])}`,installation:stage.scaleDescription,energyMultiplier:`${stage.energyMultiplier[0]}–${stage.energyMultiplier[1]}× maturity burden`,spool:`${secondsText(stage.spoolSeconds[0])}–${secondsText(stage.spoolSeconds[1])}`,breakthrough:stage.breakthrough,utility:stage.utility,limitation:stage.limitation,recommendedEnergy:stage.recommendedEnergy};});
  }

  globalThis.BlacklightExoFTLPathEngineering=Object.freeze({scaleEnergy,updateRouteAndReliability,makeChemicalComparison,makeHierarchy});
})();
