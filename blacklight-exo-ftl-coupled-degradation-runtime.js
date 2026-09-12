(() => {
  'use strict';

  const REGISTRY_URL='data/exo-vessel/ftl-coupled-degradation-registry.json';
  const STATUS=Object.freeze({READY:'READY',UNRESOLVED:'UNRESOLVED',CONFLICT:'CONFLICT',BLOCKED:'BLOCKED'});
  const CHANNELS=Object.freeze(['sensor','navigation','reference','solver','command','actuator','exit','clearance','recovery','thermal','structure']);
  const DRIVERS=Object.freeze(['power','thermal','cooling','hydraulic','dielectric','metabolic']);
  let cachePromise=null;

  const finite=v=>v!==null&&v!==undefined&&v!==''&&Number.isFinite(Number(v));
  const clamp01=v=>Math.min(1,Math.max(0,Number(v)||0));
  const unique=items=>[...new Set((items||[]).filter(Boolean))];

  function deepFreeze(value){
    if(!value||typeof value!=='object'||Object.isFrozen(value))return value;
    Object.freeze(value);
    Object.getOwnPropertyNames(value).forEach(k=>deepFreeze(value[k]));
    return value;
  }

  async function loadRegistry(){
    if(!cachePromise){
      cachePromise=fetch(REGISTRY_URL,{cache:'no-store'}).then(r=>{
        if(!r.ok)throw new Error(`Unable to load ${REGISTRY_URL}: HTTP ${r.status}`);
        return r.json();
      }).then(deepFreeze).catch(error=>{cachePromise=null;throw error;});
    }
    return cachePromise;
  }

  function selectProfile(registry,context={}){
    if(context.couplingProfile&&typeof context.couplingProfile==='object')return {status:STATUS.READY,profile:context.couplingProfile,warnings:['Caller-supplied coupling profile is active; treat it according to its declared provenance/status.']};
    const requested=context.profileId||'generic-shared-infrastructure-v1';
    const matches=(registry.profiles||[]).filter(p=>p.profileId===requested);
    if(!matches.length)return {status:STATUS.UNRESOLVED,profile:null,warnings:[`No coupled-degradation profile matched ${requested}.`]};
    if(matches.length>1){
      const sig=new Set(matches.map(p=>JSON.stringify({status:p.status,aggregationMode:p.aggregationMode,couplings:p.couplings})));
      if(sig.size>1)return {status:STATUS.CONFLICT,profile:null,warnings:[`Conflicting coupled-degradation profiles matched ${requested}.`]};
    }
    return {status:STATUS.READY,profile:matches[0],warnings:[]};
  }

  function normalizeReadiness(readiness={}){
    const out={};
    CHANNELS.forEach(channel=>{out[channel]=finite(readiness[channel])?clamp01(readiness[channel]):1;});
    return out;
  }

  function normalizedHighStress(value,nominal,limit){
    if(!finite(value)||!finite(nominal)||!finite(limit)||Number(limit)<=Number(nominal))return null;
    return clamp01((Number(value)-Number(nominal))/(Number(limit)-Number(nominal)));
  }

  function normalizedLowStress(value,minimum,nominal){
    if(!finite(value)||!finite(minimum)||!finite(nominal)||Number(nominal)<=Number(minimum))return null;
    return clamp01((Number(nominal)-Number(value))/(Number(nominal)-Number(minimum)));
  }

  function evaluateTransient(transient={},interventionHorizon=null){
    const projection={};
    const stress={};
    const signatures={};
    const warnings=[];
    let hardBlock=false;

    const horizon=finite(interventionHorizon)?Math.max(0,Number(interventionHorizon)):(finite(transient.interventionHorizon)?Math.max(0,Number(transient.interventionHorizon)):null);

    if(finite(transient.availablePowerW)&&finite(transient.loadPowerW)){
      const available=Math.max(0,Number(transient.availablePowerW));
      const load=Math.max(0,Number(transient.loadPowerW));
      const deficit=Math.max(0,load-available);
      projection.powerDeficitW=deficit;
      signatures.powerDeficitW=deficit;
      stress.power=load>0?clamp01(deficit/load):0;
      if(deficit>0&&finite(transient.bufferEnergyJ)){
        projection.powerHoldTime= Math.max(0,Number(transient.bufferEnergyJ))/deficit;
        if(horizon!==null&&projection.powerHoldTime<horizon){
          stress.power=1;
          hardBlock=true;
          warnings.push(`Power buffer hold time ${projection.powerHoldTime.toFixed(6)} s is shorter than the declared intervention horizon ${horizon.toFixed(6)} s.`);
        }
      }
    }

    if(finite(transient.temperatureK)){
      let evalT=Number(transient.temperatureK);
      if(horizon!==null&&finite(transient.heatGenerationW)&&finite(transient.heatRejectionW)&&finite(transient.thermalCapacityJPerK)&&Number(transient.thermalCapacityJPerK)>0){
        const net=Number(transient.heatGenerationW)-Number(transient.heatRejectionW);
        evalT=evalT+net*horizon/Number(transient.thermalCapacityJPerK);
        projection.netHeatW=net;
        projection.projectedTemperatureK=evalT;
        signatures.netWasteHeatW=net;
      }
      const s=normalizedHighStress(evalT,transient.nominalTemperatureK,transient.limitTemperatureK);
      if(s!==null)stress.thermal=s;
      if(finite(transient.limitTemperatureK)&&evalT>=Number(transient.limitTemperatureK)){
        stress.thermal=1;
        hardBlock=true;
        warnings.push(`Projected/evaluated temperature ${evalT.toFixed(3)} K reaches or exceeds declared limit ${Number(transient.limitTemperatureK).toFixed(3)} K.`);
      }
    }

    const cooling=normalizedLowStress(transient.coolantFlow,transient.coolantFlowMin,transient.coolantFlowNominal);
    if(cooling!==null)stress.cooling=cooling;
    const hydraulic=normalizedLowStress(transient.hydraulicPressure,transient.hydraulicPressureMin,transient.hydraulicPressureNominal);
    if(hydraulic!==null)stress.hydraulic=hydraulic;
    if(finite(transient.dielectricQuality))stress.dielectric=clamp01(1-Number(transient.dielectricQuality));
    if(finite(transient.metabolicSupport))stress.metabolic=clamp01(1-Number(transient.metabolicSupport));

    DRIVERS.forEach(driver=>{if(stress[driver]===undefined)stress[driver]=0;});
    return {stress,projection,signatures,warnings,hardBlock};
  }

  function applyCouplings(inputReadiness,stress,profile){
    const effective={...inputReadiness};
    const contributions={};
    CHANNELS.forEach(channel=>{
      const incomingDeficit=1-clamp01(inputReadiness[channel]);
      let worst=incomingDeficit;
      let dominant={driver:'incoming',deficit:incomingDeficit};
      DRIVERS.forEach(driver=>{
        const coefficient=finite(profile?.couplings?.[driver]?.[channel])?clamp01(profile.couplings[driver][channel]):0;
        const coupled=coefficient*clamp01(stress[driver]);
        if(coupled>worst){worst=coupled;dominant={driver,deficit:coupled,coefficient,stress:clamp01(stress[driver])};}
      });
      effective[channel]=clamp01(1-worst);
      contributions[channel]=dominant;
    });
    return {effective,contributions};
  }

  async function resolveFTLCoupledDegradation(context={}){
    const registry=context.registry||await loadRegistry();
    const selected=selectProfile(registry,context);
    const inputReadiness=normalizeReadiness(context.readiness||{});
    const warnings=[...(selected.warnings||[])];
    if(selected.status!==STATUS.READY){
      return deepFreeze({status:selected.status,profile:selected.profile,inputReadiness,effectiveReadiness:{...inputReadiness},driverStress:Object.fromEntries(DRIVERS.map(d=>[d,0])),transientProjection:{},dominantContributions:{},blockedChannels:[],signatures:{},warnings,provenance:unique([registry.registryKey,...(context.provenance||[])])});
    }

    const transient=evaluateTransient(context.transientState||{},context.interventionHorizon);
    warnings.push(...transient.warnings);
    const coupled=applyCouplings(inputReadiness,transient.stress,selected.profile);
    const blockedChannels=CHANNELS.filter(channel=>coupled.effective[channel]<=0);
    if(transient.hardBlock&&!blockedChannels.length){
      ['solver','actuator','exit','recovery','thermal'].forEach(channel=>{coupled.effective[channel]=0;if(!blockedChannels.includes(channel))blockedChannels.push(channel);});
      warnings.push('A declared hard power/thermal limit was crossed; safety-critical dependent channels are blocked rather than assigned an arbitrary finite penalty.');
    }
    const degraded=CHANNELS.filter(channel=>coupled.effective[channel]<inputReadiness[channel]-1e-12);
    if(degraded.length)warnings.push(`Common-cause transient evidence reduces readiness in: ${degraded.join(', ')}.`);
    const status=blockedChannels.length?STATUS.BLOCKED:STATUS.READY;
    return deepFreeze({
      status,
      profile:selected.profile,
      inputReadiness,
      effectiveReadiness:coupled.effective,
      driverStress:transient.stress,
      transientProjection:transient.projection,
      dominantContributions:coupled.contributions,
      blockedChannels,
      signatures:transient.signatures,
      warnings,
      provenance:unique([registry.registryKey,selected.profile.profileId,...(context.provenance||[])])
    });
  }

  globalThis.BlacklightExoFTLCoupledDegradationRuntime=deepFreeze({STATUS,CHANNELS,DRIVERS,resolveFTLCoupledDegradation});
})();
