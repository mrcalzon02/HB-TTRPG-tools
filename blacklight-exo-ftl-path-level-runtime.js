(() => {
  'use strict';
  const base=globalThis.BlacklightExoFTL,D=globalThis.BlacklightExoFTLPathDefinitions;
  if(!base||!D)return;
  const {C_AU_S,C_KM_S,LY_AU}=base.constants;
  const LEVEL_MAP=Object.fromEntries(D.levels.map(item=>[item.key,item]));
  const FAMILY_MAP=Object.fromEntries(base.families.map(item=>[item.key,item]));
  const ENERGY_MAP=Object.fromEntries(base.energySystems.map(item=>[item.key,item]));
  const STAGE_TO_TIER=[0,1,2,3,4,6,8];
  const DISCRETE_MODES=new Set(['discrete-translation','discrete-fold','gate-traversal','discrete-state-displacement']);

  function hash(value){let state=2166136261;for(const char of String(value)){state^=char.charCodeAt(0);state=Math.imul(state,16777619);}return state>>>0;}
  function rngFor(seed){let state=hash(seed)||1;return()=>{state+=0x6D2B79F5;let value=state;value=Math.imul(value^value>>>15,value|1);value^=value+Math.imul(value^value>>>7,value|61);return((value^value>>>14)>>>0)/4294967296;};}
  const number=(rng,min,max,digits=8)=>Number((min+(max-min)*rng()).toFixed(digits));
  const pick=(rng,list)=>list[Math.floor(rng()*list.length)]||list[0];
  const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
  const logNumber=(rng,min,max)=>10**(Math.log10(min)+(Math.log10(max)-Math.log10(min))*rng());

  function cRelation(value){
    const c=Math.max(0,Number(value)||0);
    if(c<1)return{mode:'sublight',percentOfC:c*100,percentBelowC:(1-c)*100,shortfallPercent:(1-c)*100,multipleC:c,label:`${(c*100).toLocaleString(undefined,{maximumFractionDigits:6})}% of light speed`};
    return{mode:'superluminal',multipleC:c,percentBeyondC:(c-1)*100,label:`${c.toLocaleString(undefined,{maximumFractionDigits:c<100?4:2})}c · ${((c-1)*100).toLocaleString(undefined,{maximumFractionDigits:2})}% beyond light speed`};
  }
  const secondsText=seconds=>base.format.secondsToText(Math.max(0,seconds));
  const distanceText=au=>base.format.distanceText(Math.max(0,au));
  const energyText=value=>base.format.energyText(Math.max(0,value));
  const powerText=value=>base.format.powerText(Math.max(0,value));
  const massText=value=>base.format.massText(Math.max(0,value));

  function ensureControl(){
    if(document.getElementById('exo-ftl-path-level'))return;
    const grid=document.querySelector('.exo-ftl-control-grid');if(!grid)return;
    const label=document.createElement('label'),title=document.createElement('span'),select=document.createElement('select');
    title.textContent='Drive-path technology level';select.id='exo-ftl-path-level';
    for(const [value,text] of [['random','Infer or randomize path level'],...D.levels.map(level=>[level.key,`Path ${level.rank} · ${level.label}`])]){
      const option=document.createElement('option');option.value=value;option.textContent=text;select.append(option);
    }
    label.append(title,select);grid.append(label);
  }
  const requestedLevel=input=>input.pathLevel||document.getElementById('exo-ftl-path-level')?.value||'random';

  function inferLevel(result,rng){
    if(result.source?.type==='standalone')return pick(rng,['p0','p0','p1','p1','p2','p2','p3','p3','p4','p5','p6']);
    const rank=result.identity.tierRank,mapped=rank<=0?0:rank===1?1:rank===2?2:rank===3?3:rank===4?4:rank<=6?5:6;
    return`p${clamp(mapped+pick(rng,[-1,0,0,0,1]),0,6)}`;
  }

  function composeLevel(familyKey,levelKey){
    const generic=LEVEL_MAP[levelKey]||D.levels[0],path=D.paths[familyKey];if(!path)return null;
    const i=generic.rank;
    return{...generic,pathLabel:path.label,name:path.names[i],speedC:path.speedC[i],rangeAU:path.rangeAU[i],breakthrough:path.breakthroughs[i],utility:path.utilities[i],limitation:path.limits[i],recommendedEnergyKey:path.energy[i],recommendedEnergy:ENERGY_MAP[path.energy[i]]?.label||path.energy[i]};
  }

  function updatePerformance(result,stage,rng){
    const p=result.performance,routeFactor=clamp(p.practicalRouteC/Math.max(1e-12,p.ratedCleanSpaceC),.015,1.35);
    const cleanC=logNumber(rng,stage.speedC[0],stage.speedC[1]),practicalC=Math.max(1e-8,cleanC*routeFactor),auSecond=practicalC*C_AU_S,distanceAU=p.referenceDistanceAU;
    const transitSeconds=distanceAU/auSecond,spoolSeconds=logNumber(rng,stage.spoolSeconds[0],stage.spoolSeconds[1]),cooldownSeconds=logNumber(rng,stage.cooldownSeconds[0],stage.cooldownSeconds[1]),missionSeconds=spoolSeconds+transitSeconds+cooldownSeconds,status=cRelation(practicalC);
    Object.assign(p,{ratedCleanSpaceC:cleanC,practicalRouteC:practicalC,cStatus:status,standardizedRatingRelation:status,lightTimeCompression:practicalC,cleanSpaceAuPerSecond:cleanC*C_AU_S,practicalAuPerSecond:auSecond,practicalAuPerMinute:auSecond*60,practicalAuPerHour:auSecond*3600,practicalAuPerDay:auSecond*86400,practicalAuPerYear:auSecond*31557600,practicalKmPerSecond:practicalC*C_KM_S,transitSeconds,transitText:secondsText(transitSeconds),spoolSeconds,spoolText:secondsText(spoolSeconds),cooldownSeconds,cooldownText:secondsText(cooldownSeconds),missionSeconds,missionText:secondsText(missionSeconds),oneAuText:secondsText(1/auSecond),oneLightYearText:secondsText(LY_AU/auSecond),tenLightYearText:secondsText(10*LY_AU/auSecond),compressionReading:`${(auSecond*3600).toLocaleString(undefined,{maximumFractionDigits:5})} AU/hour · ${practicalC.toLocaleString(undefined,{maximumFractionDigits:5})}× standardized light-time compression`});
  }

  function updateRange(result,stage,rng){
    const reserve=clamp(result.range.reserveFraction||number(rng,.12,.35),.08,.42),nominal=logNumber(rng,stage.rangeAU[0],stage.rangeAU[1]),certified=nominal*(1-reserve);
    Object.assign(result.range,{nominalAU:nominal,nominalText:distanceText(nominal),nominalLy:nominal/LY_AU,certifiedAU:certified,certifiedText:distanceText(certified),reserveFraction:reserve,reservePercent:reserve*100,timeAtCertifiedRange:secondsText(certified/result.performance.practicalAuPerSecond),routeCountAtReference:Math.max(0,Math.floor(certified/result.performance.referenceDistanceAU))});
  }

  function updateNavigation(result,stage,rng){
    const factor=number(rng,stage.errorMultiplier[0],stage.errorMultiplier[1]),errorPerAU=Math.max(.000001,result.navigation.errorKmPerAU*factor),arrival=errorPerAU*Math.sqrt(Math.max(1,result.performance.referenceDistanceAU));
    result.navigation.errorKmPerAU=errorPerAU;result.navigation.referenceArrivalErrorKm=arrival;result.navigation.referenceArrivalErrorText=`±${arrival.toLocaleString(undefined,{maximumFractionDigits:2})} km`;result.navigation.solutionRefreshSeconds*=clamp(factor/3,.6,18);
  }

  function updateKinematics(result,stage,rng){
    const k=result.kinematics,p=result.performance,distanceAU=p.referenceDistanceAU,referenceLightSeconds=distanceAU/C_AU_S,mode=k.mode;
    let payloadSeconds=p.transitSeconds;
    if(DISCRETE_MODES.has(mode))payloadSeconds=logNumber(rng,stage.crossingSeconds[0],stage.crossingSeconds[1])*(1+Math.log10(Math.max(1,distanceAU))/24);
    const missionSeconds=p.spoolSeconds+payloadSeconds+p.cooldownSeconds,payloadC=referenceLightSeconds/Math.max(1e-12,payloadSeconds),missionC=referenceLightSeconds/Math.max(1e-12,missionSeconds);
    let crewSeconds=payloadSeconds,gamma=null;
    if(result.identity.familyKey==='inertial-torch'&&p.practicalRouteC<1){gamma=1/Math.sqrt(1-p.practicalRouteC**2);crewSeconds=payloadSeconds/gamma;}
    else if(DISCRETE_MODES.has(mode))crewSeconds=payloadSeconds*number(rng,.9,1.1);
    else if(/hyperspatial|manifold/.test(mode))crewSeconds=payloadSeconds*number(rng,.72,1.08);
    Object.assign(k,{referenceDistanceAU:distanceAU,referenceLightTimeSeconds:referenceLightSeconds,referenceLightTimeText:secondsText(referenceLightSeconds),standardizedEquivalentSeconds:p.transitSeconds,standardizedEquivalentText:p.transitText,payloadTransitSeconds:payloadSeconds,payloadTransitText:secondsText(payloadSeconds),payloadEffectiveC:payloadC,payloadRelation:cRelation(payloadC),completeMissionSeconds:missionSeconds,completeMissionText:secondsText(missionSeconds),missionEffectiveC:missionC,missionRelation:cRelation(missionC),crewElapsedSeconds:crewSeconds,crewElapsedText:secondsText(crewSeconds),gamma});
    p.missionSeconds=missionSeconds;p.missionText=secondsText(missionSeconds);
  }

  globalThis.BlacklightExoFTLPathRuntime=Object.freeze({base,D,C_AU_S,C_KM_S,LY_AU,LEVEL_MAP,FAMILY_MAP,ENERGY_MAP,STAGE_TO_TIER,DISCRETE_MODES,rngFor,number,pick,clamp,logNumber,cRelation,secondsText,distanceText,energyText,powerText,massText,ensureControl,requestedLevel,inferLevel,composeLevel,updatePerformance,updateRange,updateNavigation,updateKinematics});
})();
