(() => {
  'use strict';
  const base=globalThis.BlacklightExoFTL,D=globalThis.BlacklightExoFTLPathDefinitions,R=globalThis.BlacklightExoFTLPathRuntime;
  if(!base?.pathLevelExtensionVersion||!D?.level5Balance||!R||base.pathLevelBalanceVersion)return;
  const {C_AU_S,LY_AU}=base.constants;
  const DISCRETE=R.DISCRETE_MODES;
  const finite=(value,fallback=0)=>Number.isFinite(Number(value))?Number(value):fallback;

  function rebalancePerformance(result){
    if(result?.identity?.pathLevelRank!==5||!result.performance)return result;
    const familyKey=result.identity.familyKey,isWormhole=familyKey==='wormhole-gate',balance=D.level5Balance;
    const capAuPerHour=isWormhole?balance.wormholeCapAuPerHour:balance.nonWormholeCapAuPerHour;
    const capC=isWormhole?balance.wormholeCapC:balance.nonWormholeCapC;
    const p=result.performance,k=result.kinematics||{},distanceAU=Math.max(1e-12,finite(p.referenceDistanceAU,1));
    const beforeAuPerHour=finite(p.practicalAuPerHour,finite(p.practicalRouteC)*C_AU_S*3600);
    const cleanC=Math.min(capC,Math.max(1e-12,finite(p.ratedCleanSpaceC)));
    const practicalC=Math.min(capC,Math.max(1e-12,finite(p.practicalRouteC)));
    const auSecond=practicalC*C_AU_S,transitSeconds=distanceAU/auSecond,status=R.cRelation(practicalC);

    Object.assign(p,{
      ratedCleanSpaceC:cleanC,
      practicalRouteC:practicalC,
      cStatus:status,
      standardizedRatingRelation:status,
      lightTimeCompression:practicalC,
      cleanSpaceAuPerSecond:cleanC*C_AU_S,
      practicalAuPerSecond:auSecond,
      practicalAuPerMinute:auSecond*60,
      practicalAuPerHour:auSecond*3600,
      practicalAuPerDay:auSecond*86400,
      practicalAuPerYear:auSecond*31557600,
      practicalKmPerSecond:practicalC*base.constants.C_KM_S,
      transitSeconds,
      transitText:R.secondsText(transitSeconds),
      oneAuText:R.secondsText(1/auSecond),
      oneLightYearText:R.secondsText(LY_AU/auSecond),
      tenLightYearText:R.secondsText(10*LY_AU/auSecond),
      compressionReading:`${(auSecond*3600).toLocaleString(undefined,{maximumFractionDigits:5})} AU/hour · ${practicalC.toLocaleString(undefined,{maximumFractionDigits:5})}× standardized light-time compression`,
      pathLevelSpeedCeilingAuPerHour:capAuPerHour,
      pathLevelSpeedCeilingC:capC,
      speedCeilingApplied:beforeAuPerHour>capAuPerHour+1e-6,
      speedBalanceClass:isWormhole?'PATH_5_WORMHOLE_APEX':'PATH_5_COMPETITIVE_NON_WORMHOLE'
    });

    const mode=k.mode,referenceLightSeconds=distanceAU/C_AU_S;
    k.standardizedEquivalentSeconds=transitSeconds;
    k.standardizedEquivalentText=R.secondsText(transitSeconds);
    if(!DISCRETE.has(mode)){
      k.payloadTransitSeconds=transitSeconds;
      k.payloadTransitText=R.secondsText(transitSeconds);
      k.payloadEffectiveC=practicalC;
      k.payloadRelation=status;
      k.crewElapsedSeconds=transitSeconds;
      k.crewElapsedText=R.secondsText(transitSeconds);
    }
    const payloadSeconds=Math.max(1e-12,finite(k.payloadTransitSeconds,transitSeconds));
    const missionSeconds=Math.max(1e-12,finite(p.spoolSeconds)+payloadSeconds+finite(p.cooldownSeconds));
    k.referenceLightTimeSeconds=referenceLightSeconds;
    k.referenceLightTimeText=R.secondsText(referenceLightSeconds);
    k.completeMissionSeconds=missionSeconds;
    k.completeMissionText=R.secondsText(missionSeconds);
    k.missionEffectiveC=referenceLightSeconds/missionSeconds;
    k.missionRelation=R.cRelation(k.missionEffectiveC);
    p.missionSeconds=missionSeconds;
    p.missionText=R.secondsText(missionSeconds);

    result.pathLevel.speedRangeC=[...D.paths[familyKey].speedC[5]];
    result.pathLevel.speedCeilingAuPerHour=capAuPerHour;
    result.pathLevel.speedCeilingC=capC;
    result.pathLevel.balanceAuthority='Path Level 5 AU-compression ceiling';
    result.pathLevel.balanceNote=isWormhole
      ?'Path 5 wormhole transit alone may approach 2,140,132.953375 AU/hour. The advantage is inseparable from fixed-mouth infrastructure, chronology control, extraordinary cost, and exceptional scarcity.'
      :'Path 5 non-wormhole transit may approach 1,426,755.30225 AU/hour. Family ranges remain deliberately close enough that engineering doctrine, route access, reliability, and operational burden still matter.';
    return result;
  }

  function applyWormholeBurden(result){
    if(result?.identity?.pathLevelRank!==5||result.identity.familyKey!=='wormhole-gate')return result;
    const authority=D.paths['wormhole-gate'].level5Authority||{};
    const path=result.pathLevel,power=result.power||{},mass=Math.max(25000000,finite(path.facilityMassTonnes)*2500);
    path.facilityMassTonnes=mass;
    path.facilityMassText=`${mass.toLocaleString(undefined,{maximumFractionDigits:2})} tonnes`;
    path.developmentInstallation='paired fixed stellar or deep-space gate mouths with dedicated chronology control, route-defense, mass-flow balancing, and civilization-scale support industry';
    path.rarityClass=authority.rarityClass;
    path.capitalBurdenClass=authority.capitalBurdenClass;
    path.engineeringDifficultyClass=authority.engineeringDifficultyClass;
    path.infrastructureRule=authority.infrastructureRule;
    path.capitalCostIndex=100;
    path.engineeringDifficultyIndex=100;
    path.availabilityIndex=1;
    result.engineeringMaturity.integrationComplexity=Math.max(97,finite(result.engineeringMaturity.integrationComplexity));
    result.risk.score=Math.max(94,finite(result.risk.score));
    result.risk.label='Critical';
    result.risk.drivers=[...new Set([...(result.risk.drivers||[]),'universe-rarest paired wormhole infrastructure','chronology-safe mouth synchronization','civilization-scale capital and exotic-state burden'])];
    result.sourceImpact.push('Path 5 wormhole transit is classified as the rarest, most expensive, and most difficult transit technology in the setting; its superior AU-compression ceiling cannot be separated from its fixed infrastructure and civilization-scale burden.');
    result.summary+=` Its Path 5 wormhole ceiling is ${D.level5Balance.wormholeCapAuPerHour.toLocaleString(undefined,{maximumFractionDigits:6})} AU/hour, but this rating belongs to the universe's rarest and most expensive paired-gate infrastructure rather than an ordinary shipboard drive.`;
    power.pathLevelCapitalBurdenClass='CIVILIZATION_SCALE_MAXIMUM';
    return result;
  }

  function generate(seed,input={},source=null){return applyWormholeBurden(rebalancePerformance(base.generate(seed,input,source)));}
  globalThis.BlacklightExoFTL=Object.freeze({...base,pathLevelBalanceVersion:1,pathLevelBalance:D.level5Balance,generate});
})();