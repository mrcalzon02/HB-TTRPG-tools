(() => {
  'use strict';

  const REGISTRY_URL='data/exo-vessel/ftl-installation-safety-timing-registry.json';
  const STATUS=Object.freeze({READY:'READY',UNRESOLVED:'UNRESOLVED',CONFLICT:'CONFLICT',BLOCKED:'BLOCKED'});
  const CHANNELS=Object.freeze(['sensor','navigation','reference','solver','command','actuator','exit','clearance','recovery','thermal','structure']);
  const PRECEDENCE=Object.freeze({GENERIC:0,RACE:1,MANUFACTURER:2,NAMED_TECHNOLOGY:3,VESSEL:4,INSTALLATION:5});
  let cachePromise=null;

  const finite=v=>v!==null&&v!==undefined&&v!==''&&Number.isFinite(Number(v));
  const clampReadiness=v=>finite(v)?Math.min(1,Number(v)):1;
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

  function identityMap(context={}){
    return {
      INSTALLATION:context.installationId||null,
      VESSEL:context.vesselId||null,
      NAMED_TECHNOLOGY:context.namedTechnologyId||null,
      MANUFACTURER:context.manufacturerId||null,
      RACE:context.raceId||null,
      GENERIC:'blacklight.generic'
    };
  }

  function selectRecord(registry,context={}){
    const ids=identityMap(context);
    const matches=(registry.records||[]).filter(record=>ids[record.scopeType]&&String(record.scopeId)===String(ids[record.scopeType]));
    if(!matches.length)return {record:null,status:STATUS.UNRESOLVED,warnings:['No installation-safety timing record matched the supplied identity context.']};
    matches.sort((a,b)=>(PRECEDENCE[b.scopeType]??-1)-(PRECEDENCE[a.scopeType]??-1));
    const topRank=PRECEDENCE[matches[0].scopeType]??-1;
    const top=matches.filter(r=>(PRECEDENCE[r.scopeType]??-1)===topRank);
    if(top.length>1){
      const signatures=new Set(top.map(r=>JSON.stringify({status:r.status,scopeId:r.scopeId,numericPolicy:r.numericPolicy||null,defaultReadiness:r.defaultReadiness||null})));
      if(signatures.size>1)return {record:null,status:STATUS.CONFLICT,warnings:[`Conflicting ${top[0].scopeType} installation-safety timing records matched ${top[0].scopeId}.`]};
    }
    const record=top[0];
    if(record.status==='UNRESOLVED')return {record,status:STATUS.UNRESOLVED,warnings:[record.numericPolicy||'Matched named timing authority remains unresolved.']};
    return {record,status:STATUS.READY,warnings:[]};
  }

  function mergeReadiness(record,context={}){
    const base=record?.defaultReadiness||{};
    const measured=context.readiness||{};
    const out={};
    CHANNELS.forEach(channel=>{
      const raw=measured[channel]!==undefined?measured[channel]:(base[channel]!==undefined?base[channel]:1);
      out[channel]=clampReadiness(raw);
    });
    return out;
  }

  async function resolveCoupledReadiness(readiness,context={},provenance=[]){
    if(context.coupledDegradationPacket&&typeof context.coupledDegradationPacket==='object'){
      const packet=context.coupledDegradationPacket;
      return {packet,readiness:packet.effectiveReadiness?{...readiness,...packet.effectiveReadiness}:{...readiness}};
    }
    const hasTransient=context.transientState&&typeof context.transientState==='object';
    const hasProfile=context.couplingProfileId||context.couplingProfile;
    if(!hasTransient&&!hasProfile)return {packet:null,readiness:{...readiness}};
    const Runtime=globalThis.BlacklightExoFTLCoupledDegradationRuntime;
    if(!Runtime?.resolveFTLCoupledDegradation){
      return {packet:deepFreeze({status:STATUS.UNRESOLVED,warnings:['Coupled-degradation evidence was supplied but the coupled-degradation runtime is not loaded.'],provenance:unique(provenance)}),readiness:{...readiness}};
    }
    const packet=await Runtime.resolveFTLCoupledDegradation({
      readiness,
      transientState:context.transientState||{},
      profileId:context.couplingProfileId||undefined,
      couplingProfile:context.couplingProfile||undefined,
      interventionHorizon:context.interventionHorizon,
      provenance
    });
    return {packet,readiness:packet?.effectiveReadiness?{...readiness,...packet.effectiveReadiness}:{...readiness}};
  }

  function blockedChannels(readiness){
    return CHANNELS.filter(channel=>!finite(readiness[channel])||Number(readiness[channel])<=0);
  }

  function maintenancePenalty(context={},record={}){
    const raw=context.maintenancePenalty!==undefined?context.maintenancePenalty:(record.defaultMaintenancePenalty!==undefined?record.defaultMaintenancePenalty:1);
    return finite(raw)?Math.max(1,Number(raw)):1;
  }

  function scaleTime(value,factor){
    return finite(value)?Math.max(0,Number(value)*factor):value;
  }

  function adjustTiming(baseline={},readiness={},penalty=1){
    const factors={
      prediction:Math.max(0,readiness.sensor)*Math.max(0,readiness.navigation)*Math.max(0,readiness.reference)/penalty,
      sensor:penalty/Math.max(readiness.sensor,Number.EPSILON),
      solver:penalty/Math.max(Math.min(readiness.solver,readiness.navigation),Number.EPSILON),
      decision:penalty/Math.max(Math.min(readiness.navigation,readiness.reference),Number.EPSILON),
      command:penalty/Math.max(readiness.command,Number.EPSILON),
      actuation:penalty/Math.max(Math.min(readiness.actuator,readiness.structure),Number.EPSILON),
      exit:penalty/Math.max(Math.min(readiness.exit,readiness.actuator,readiness.structure),Number.EPSILON),
      clearance:penalty/Math.max(Math.min(readiness.clearance,readiness.sensor),Number.EPSILON),
      margin:penalty
    };
    return {
      timing:{
        ...baseline,
        predictionTime:scaleTime(baseline.predictionTime,factors.prediction),
        sensorTime:scaleTime(baseline.sensorTime,factors.sensor),
        solverTime:scaleTime(baseline.solverTime,factors.solver),
        decisionTime:scaleTime(baseline.decisionTime,factors.decision),
        commandTime:scaleTime(baseline.commandTime,factors.command),
        actuationTime:scaleTime(baseline.actuationTime,factors.actuation),
        exitTime:scaleTime(baseline.exitTime,factors.exit),
        clearTime:scaleTime(baseline.clearTime,factors.clearance),
        marginTime:scaleTime(baseline.marginTime,factors.margin)
      },
      factors
    };
  }

  function adjustRecovery(baseline=null,readiness={}){
    if(!baseline||typeof baseline!=='object')return baseline;
    const r=Math.max(0,readiness.recovery);
    return {
      ...baseline,
      totalAuthority:finite(baseline.totalAuthority)?Number(baseline.totalAuthority)*r:baseline.totalAuthority,
      protectedReserve:finite(baseline.protectedReserve)?Number(baseline.protectedReserve)*r:baseline.protectedReserve,
      requiredRecoveryAuthority:baseline.requiredRecoveryAuthority
    };
  }

  async function resolveFTLInstallationSafetyTiming(context={}){
    const registry=context.registry||await loadRegistry();
    const selected=selectRecord(registry,context);
    const record=selected.record;
    const baselineReadiness=mergeReadiness(record,context);
    const baselineTiming={...(context.baselineTiming||{})};
    const baselineRecovery=context.baselineRecovery?{...context.baselineRecovery}:null;
    const provenance=unique([registry.registryKey,...(record?.provenance||[]),...(context.provenance||[])]);
    const coupled=await resolveCoupledReadiness(baselineReadiness,context,provenance);
    const readiness=coupled.readiness;
    const blocked=blockedChannels(readiness);
    const penalty=maintenancePenalty(context,record||{});
    const warnings=[...(selected.warnings||[]),...(coupled.packet?.warnings||[])];

    if(coupled.packet?.status===STATUS.CONFLICT){
      warnings.push('Coupled-degradation authority conflicts; installation timing certification cannot average contradictory common-cause models.');
      return deepFreeze({status:STATUS.CONFLICT,baselineTiming,baselineRecovery,timing:{...baselineTiming},recovery:baselineRecovery?{...baselineRecovery}:null,selectedRecord:record||null,readiness,coupledDegradation:coupled.packet,appliedFactors:{maintenancePenalty:1},warnings,provenance:unique([...provenance,...(coupled.packet.provenance||[])])});
    }

    if(blocked.length||coupled.packet?.status===STATUS.BLOCKED){
      warnings.push(`Blocking readiness channel(s): ${blocked.join(', ')||coupled.packet?.blockedChannels?.join(', ')||'common-cause transient limit'}.`);
      return deepFreeze({
        status:STATUS.BLOCKED,
        baselineTiming,
        baselineRecovery,
        timing:{...baselineTiming},
        recovery:baselineRecovery?{...baselineRecovery}:null,
        selectedRecord:record||null,
        readiness,
        coupledDegradation:coupled.packet,
        appliedFactors:{maintenancePenalty:penalty},
        warnings,
        provenance:unique([...provenance,...(coupled.packet?.provenance||[])])
      });
    }

    if(selected.status!==STATUS.READY){
      warnings.push('Named timing authority did not authorize numeric adjustment; baseline timing is preserved rather than guessed.');
      return deepFreeze({
        status:selected.status,
        baselineTiming,
        baselineRecovery,
        timing:{...baselineTiming},
        recovery:baselineRecovery?{...baselineRecovery}:null,
        selectedRecord:record||null,
        readiness,
        coupledDegradation:coupled.packet,
        appliedFactors:{maintenancePenalty:1},
        warnings,
        provenance:unique([...provenance,...(coupled.packet?.provenance||[])])
      });
    }

    const adjusted=adjustTiming(baselineTiming,readiness,penalty);
    const recovery=adjustRecovery(baselineRecovery,readiness);
    if(penalty>1)warnings.push(`Maintenance degradation factor ${penalty.toFixed(4)} lengthens intervention timing.`);
    if(CHANNELS.some(channel=>readiness[channel]<baselineReadiness[channel]))warnings.push('Common-cause power/thermal/infrastructure evidence reduces one or more readiness channels before timing adjustment.');
    else if(CHANNELS.some(channel=>readiness[channel]<1))warnings.push('Measured installation readiness reduces one or more timing/recovery margins; no family equation was changed.');
    if(record?.familyId===null&&context.family)warnings.push('Selected installation timing record does not establish transit-family identity; supplied family remains independently authoritative.');

    return deepFreeze({
      status:STATUS.READY,
      baselineTiming,
      baselineRecovery,
      timing:adjusted.timing,
      recovery,
      selectedRecord:record,
      readiness,
      coupledDegradation:coupled.packet,
      appliedFactors:{...adjusted.factors,maintenancePenalty:penalty},
      warnings,
      provenance:unique([...provenance,...(coupled.packet?.provenance||[])])
    });
  }

  globalThis.BlacklightExoFTLInstallationSafetyTimingRuntime=deepFreeze({STATUS,CHANNELS,resolveFTLInstallationSafetyTiming});
})();
