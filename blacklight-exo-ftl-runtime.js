(() => {
  'use strict';

  const P=globalThis.BlacklightExoFTLPhysicsDefinitions;
  const O=globalThis.BlacklightExoFTLOperationalDefinitions;
  if(!P||!O)return;
  const {AU_KM,LY_AU,C_KM_S,C_AU_S,C_AU_MIN,C_AU_HOUR,C_AU_DAY}=P.constants;
  const TIERS=P.tiers,FAMILIES=P.families;
  const SCALES=O.scales,INFRASTRUCTURES=O.infrastructures,ROUTES=O.routes,DOCTRINES=O.doctrines,ENERGY=O.energySystems;
  const GENERAL_HURDLES=O.generalHurdles,GRAVITY_LIMITS=O.gravityLimits,QN_FACTORS=O.qnFactors,EDGE_CASES=O.edgeCases;

  const SCALE_MAP = Object.fromEntries(SCALES.map(item => [item.key,item]));
  const TIER_MAP = Object.fromEntries(TIERS.map(item => [item.key,item]));
  const FAMILY_MAP = Object.fromEntries(FAMILIES.map(item => [item.key,item]));
  const INFRA_MAP = Object.fromEntries(INFRASTRUCTURES.map(item => [item.key,item]));
  const ROUTE_MAP = Object.fromEntries(ROUTES.map(item => [item.key,item]));
  const DOCTRINE_MAP = Object.fromEntries(DOCTRINES.map(item => [item.key,item]));
  const ENERGY_MAP = Object.fromEntries(ENERGY.map(item => [item.key,item]));

  function hash(value){let state=2166136261;for(const char of String(value)){state^=char.charCodeAt(0);state=Math.imul(state,16777619);}return state>>>0;}
  function rngFor(seed){let state=hash(seed)||1;return()=>{state+=0x6D2B79F5;let value=state;value=Math.imul(value^value>>>15,value|1);value^=value+Math.imul(value^value>>>7,value|61);return((value^value>>>14)>>>0)/4294967296;};}
  const pick=(rng,list)=>list[Math.floor(rng()*list.length)]||list[0];
  const integer=(rng,min,max)=>Math.floor(min+rng()*(max-min+1));
  const number=(rng,min,max,digits=6)=>Number((min+(max-min)*rng()).toFixed(digits));
  function logNumber(rng,min,max){const a=Math.log10(min),b=Math.log10(max);return 10**(a+(b-a)*rng());}
  function unique(rng,list,count){const pool=[...list],out=[];while(pool.length&&out.length<count)out.push(pool.splice(Math.floor(rng()*pool.length),1)[0]);return out;}
  function clamp(value,min,max){return Math.max(min,Math.min(max,value));}
  function sum(list,fn){return list.reduce((total,item)=>total+(Number(fn(item))||0),0);}
  function medianRange(range){return Math.sqrt(range[0]*range[1]);}
  function secondsToText(seconds){
    if(!Number.isFinite(seconds))return'not finite';
    if(seconds<.001)return`${(seconds*1e6).toFixed(2)} μs`;
    if(seconds<1)return`${(seconds*1000).toFixed(2)} ms`;
    if(seconds<60)return`${seconds.toFixed(2)} s`;
    if(seconds<3600)return`${(seconds/60).toFixed(2)} min`;
    if(seconds<86400)return`${(seconds/3600).toFixed(2)} h`;
    if(seconds<31557600)return`${(seconds/86400).toFixed(2)} d`;
    return`${(seconds/31557600).toFixed(3)} y`;
  }
  function distanceText(au){
    if(au>=LY_AU)return`${(au/LY_AU).toFixed(3)} ly`;
    if(au>=1)return`${au.toFixed(3)} AU`;
    return`${(au*AU_KM).toLocaleString(undefined,{maximumFractionDigits:0})} km`;
  }
  function energyText(joules){
    const units=[['YJ',1e24],['ZJ',1e21],['EJ',1e18],['PJ',1e15],['TJ',1e12],['GJ',1e9],['MJ',1e6]];
    for(const [unit,value] of units)if(joules>=value)return`${(joules/value).toFixed(3)} ${unit}`;
    return`${joules.toExponential(3)} J`;
  }
  function powerText(watts){
    const units=[['YW',1e24],['ZW',1e21],['EW',1e18],['PW',1e15],['TW',1e12],['GW',1e9],['MW',1e6]];
    for(const [unit,value] of units)if(watts>=value)return`${(watts/value).toFixed(3)} ${unit}`;
    return`${watts.toExponential(3)} W`;
  }
  function massText(kg){
    if(kg>=1e9)return`${(kg/1e9).toFixed(3)} million tonnes`;
    if(kg>=1e6)return`${(kg/1e6).toFixed(3)} tonnes`;
    if(kg>=1000)return`${(kg/1000).toFixed(3)} tonnes`;
    return`${kg.toFixed(2)} kg`;
  }

  function sourceFacts(source){
    const type=source?.type||'standalone';
    const government=source?.government||null;
    const dossier=source?.dossier||null;
    const system=source?.system||dossier?.system?.physicalSystem||null;
    const cluster=source?.cluster||null;
    const clusterSystems=Array.isArray(cluster?.systems)?cluster.systems:[];
    const technology=government?.source?.technology||dossier?.civilization?.technology||dossier?.tech?.label||null;
    const reach=government?.identity?.scale||dossier?.civilization?.reach||dossier?.reach?.label||null;
    const strategicAssets=government?.military?.strategicAssets||[];
    const infrastructure=dossier?.system?.infrastructure||system?.facilities||[];
    const systemNames=clusterSystems.map(item=>item.name).filter(Boolean);
    if(system?.name&&!systemNames.includes(system.name))systemNames.unshift(system.name);
    if(dossier?.system?.name&&!systemNames.includes(dossier.system.name))systemNames.unshift(dossier.system.name);
    let inferredTier=3;
    const text=String(technology||'').toLowerCase();
    if(/pre-industrial|industrial/.test(text))inferredTier=0;
    else if(/orbital/.test(text))inferredTier=1;
    else if(/system-capable/.test(text))inferredTier=2;
    else if(/advanced interstellar/.test(text))inferredTier=6;
    else if(/interstellar/.test(text))inferredTier=4;
    else if(/post-material/.test(text))inferredTier=8;
    if(/cluster|multiple|network/.test(String(reach||'').toLowerCase()))inferredTier=Math.max(inferredTier,5);
    if(strategicAssets.some(item=>/gate|transit/i.test(item)))inferredTier=Math.max(inferredTier,5);
    const population=government?.source?.population||dossier?.system?.population||sum(clusterSystems,item=>item.population||0);
    return{
      type,government,dossier,system,cluster,clusterSystems,systemNames,technology,reach,strategicAssets,infrastructure,population,
      polity:government?.identity?.formalName||null,
      governmentModel:government?.constitution?.model||dossier?.civilization?.government||null,
      economy:government?.economy?.model||dossier?.civilization?.economy||dossier?.system?.economy||null,
      condition:government?.identity?.condition||dossier?.system?.state||null,
      sourceSeed:government?.seed||dossier?.seed||system?.seed||cluster?.seed||null,
      inferredTier
    };
  }

  function chooseTier(rng,options,facts){
    if(options.tier&&options.tier!=='random')return TIER_MAP[options.tier]||TIERS[facts.inferredTier];
    const low=Math.max(0,facts.inferredTier-1),high=Math.min(8,facts.inferredTier+1);
    return TIERS[integer(rng,low,high)];
  }
  function chooseScale(rng,options,tier){
    if(options.scale&&options.scale!=='random'){
      const selected=SCALE_MAP[options.scale];
      if(selected&&selected.minTier<=tier.rank)return selected;
    }
    const candidates=SCALES.filter(item=>item.minTier<=tier.rank&&!(item.key==='megastructure'&&tier.rank<2));
    return pick(rng,candidates);
  }
  function familyCandidates(tier,scale){
    return FAMILIES.filter(item=>tier.rank>=item.tiers[0]&&tier.rank<=item.tiers[1]&&!(scale.key==='fighter'&&!['metric-envelope','slipstream-shear','q-lattice','n-manifold','phase-displacement'].includes(item.key)));
  }
  function chooseFamily(rng,options,tier,scale,facts){
    if(options.family&&options.family!=='random'){
      const selected=FAMILY_MAP[options.family];
      if(selected&&tier.rank>=selected.tiers[0]&&tier.rank<=selected.tiers[1])return selected;
    }
    if(facts.strategicAssets.some(item=>/gate/i.test(item))&&tier.rank>=2&&rng()<.58)return FAMILY_MAP['wormhole-gate'];
    return pick(rng,familyCandidates(tier,scale));
  }
  function chooseInfrastructure(rng,options,family,scale){
    if(options.infrastructure&&options.infrastructure!=='random'){
      const selected=INFRA_MAP[options.infrastructure];
      if(selected&&family.infrastructures.includes(selected.key))return selected;
    }
    let candidates=INFRASTRUCTURES.filter(item=>family.infrastructures.includes(item.key));
    if(scale.key==='fighter')candidates=candidates.filter(item=>item.key!=='fixed-gate'&&item.key!=='paired-gate');
    if(scale.key==='megastructure')candidates=candidates.filter(item=>item.key!=='self-contained');
    return pick(rng,candidates);
  }
  function chooseEnergy(rng,options,family,tier,infrastructure){
    if(options.energy&&options.energy!=='random'){
      const selected=ENERGY_MAP[options.energy];
      if(selected&&selected.minTier<=tier.rank&&family.energySystems.includes(selected.key))return selected;
    }
    const candidates=ENERGY.filter(item=>item.minTier<=tier.rank&&family.energySystems.includes(item.key));
    if(infrastructure.key==='fixed-gate'&&ENERGY_MAP['star-fed']&&family.energySystems.includes('star-fed'))return ENERGY_MAP['star-fed'];
    return pick(rng,candidates.length?candidates:ENERGY.filter(item=>item.minTier<=tier.rank));
  }

  globalThis.BlacklightExoFTLRuntime=Object.freeze({
    P,O,AU_KM,LY_AU,C_KM_S,C_AU_S,C_AU_MIN,C_AU_HOUR,C_AU_DAY,
    TIERS,FAMILIES,SCALES,INFRASTRUCTURES,ROUTES,DOCTRINES,ENERGY,
    GENERAL_HURDLES,GRAVITY_LIMITS,QN_FACTORS,EDGE_CASES,
    SCALE_MAP,TIER_MAP,FAMILY_MAP,INFRA_MAP,ROUTE_MAP,DOCTRINE_MAP,ENERGY_MAP,
    hash,rngFor,pick,integer,number,logNumber,unique,clamp,sum,medianRange,
    secondsToText,distanceText,energyText,powerText,massText,sourceFacts,
    chooseTier,chooseScale,chooseFamily,chooseInfrastructure,chooseEnergy
  });
})();