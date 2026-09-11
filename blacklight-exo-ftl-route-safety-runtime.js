(() => {
  'use strict';

  const REGISTRY_URL='data/exo-vessel/ftl-route-safety-integration.json';
  const CALIBRATION_URL='data/exo-vessel/ftl-safety-calibration-profiles.json';
  const STATUS=Object.freeze({ADMISSIBLE:'ADMISSIBLE',MARGINAL:'MARGINAL',REJECTED:'REJECTED',UNRESOLVED:'UNRESOLVED',CONFLICT:'CONFLICT'});
  let cachePromise=null;

  const finite=value=>value!==null&&value!==undefined&&value!==''&&Number.isFinite(Number(value));
  const unique=items=>[...new Set(items.filter(Boolean))];

  function deepFreeze(value){
    if(!value||typeof value!=='object'||Object.isFrozen(value))return value;
    Object.freeze(value);
    Object.getOwnPropertyNames(value).forEach(key=>deepFreeze(value[key]));
    return value;
  }

  async function fetchJson(url){
    const response=await fetch(url,{cache:'no-store'});
    if(!response.ok)throw new Error(`Unable to load ${url}: HTTP ${response.status}`);
    return response.json();
  }

  function loadRegistries(){
    if(!cachePromise){
      cachePromise=Promise.all([fetchJson(REGISTRY_URL),fetchJson(CALIBRATION_URL)])
        .then(([registry,calibrationRegistry])=>deepFreeze({registry,calibrationRegistry}))
        .catch(error=>{cachePromise=null;throw error;});
    }
    return cachePromise;
  }

  function pathKey(rating={}){
    const rank=Number(rating.pathLevel?.rank);
    return Number.isInteger(rank)&&rank>=0&&rank<=6?`p${rank}`:'p3';
  }

  function familyKey(rating={},request={},registry={}){
    const requested=request.family||rating.identity?.familyKey||rating.identity?.family;
    return registry.familyMap?.[requested]||null;
  }

  function routeKey(rating={},request={}){
    const requested=request.route;
    if(requested)return requested;
    const identity=rating.identity||{};
    const operational=globalThis.BlacklightExoFTLOperationalDefinitions?.routes||[];
    const match=operational.find(route=>route.label===identity.routeEnvironment);
    return match?.key||'deep-space';
  }

  function buildUncertainty(base,maturity={}){
    const covarianceFactor=finite(maturity.covarianceFactor)?Number(maturity.covarianceFactor):1;
    const common=base*0.65*covarianceFactor;
    return {
      ephemerisCovariance:base*0.80*covarianceFactor,
      massModelCovariance:base*1.15*covarianceFactor,
      clockCovariance:base*0.45*covarianceFactor,
      sensorCovariance:base*0.90*covarianceFactor,
      registrationCovariance:base*0.70*covarianceFactor,
      modelCovariance:base*1.25*covarianceFactor,
      commonCauseCovariance:common,
      provenance:['PROPOSED route-safety integration covariance model']
    };
  }

  function buildTiming(path,maturity={},route={}){
    const rank=Number(String(path).replace('p',''))||0;
    const lookahead=finite(maturity.lookaheadFactor)?Number(maturity.lookaheadFactor):1;
    const uncertainty=Math.max(0.05,Number(route.uncertaintyBase)||0.1);
    const predictionTime=(2.4+rank*1.35)*lookahead/Math.max(0.6,1+uncertainty*0.35);
    const sensorTime=Math.max(0.08,0.62-rank*0.065);
    const solverTime=Math.max(0.12,0.82-rank*0.075);
    const decisionTime=Math.max(0.10,0.58-rank*0.045);
    const commandTime=Math.max(0.05,0.24-rank*0.02);
    const actuationTime=Math.max(0.16,0.78-rank*0.07);
    const exitTime=Math.max(0.32,1.15-rank*0.09);
    const clearTime=Math.max(0.18,0.60-rank*0.045);
    const marginTime=0.32+uncertainty*0.55;
    return {predictionTime,sensorTime,solverTime,decisionTime,commandTime,actuationTime,exitTime,clearTime,marginTime};
  }

  function buildRecovery(maturity={},route={}){
    const recoveryFactor=finite(maturity.recoveryFactor)?Number(maturity.recoveryFactor):1;
    const burden=1+Math.max(0,Number(route.environment?.familyBoundaryHazard)||0)*0.28+Math.max(0,Number(route.uncertaintyBase)||0)*0.22;
    const totalAuthority=1.8*recoveryFactor;
    const requiredRecoveryAuthority=0.82*burden;
    const protectedReserve=Math.min(totalAuthority,1.05*recoveryFactor);
    return {totalAuthority,protectedReserve,requiredRecoveryAuthority};
  }

  function buildMeasurement(route={},family,registry={},maturity={},uncertaintyOverride=null){
    const redundancy=finite(maturity.redundancyFactor)?Number(maturity.redundancyFactor):1;
    const routeHazards=Array.isArray(route.requiredHazards)?route.requiredHazards:[];
    const familyHazards=Array.isArray(registry.familyHazards?.[family])?registry.familyHazards[family]:[];
    const requiredHazards=unique([...routeHazards,...familyHazards]);
    const observableHazards=[];
    const independentGuardHazards=[];
    requiredHazards.forEach((hazard,index)=>{
      if(redundancy>=0.8||index%3!==0)observableHazards.push(hazard);
      else if(redundancy>=0.6)independentGuardHazards.push(hazard);
    });
    return {
      requiredHazards,
      packet:{
        observableHazards,
        independentGuardHazards,
        uncertainty:uncertaintyOverride||buildUncertainty(Number(route.uncertaintyBase)||0.1,maturity)
      }
    };
  }

  function presentationFor(status,certificate,calibration){
    const labels={
      ADMISSIBLE:'Certified for modeled route',
      MARGINAL:'Marginal — reduce authority or improve margin',
      REJECTED:'Rejected — no certified transit solution',
      UNRESOLVED:'Unresolved — insufficient certification evidence',
      CONFLICT:'Conflict — calibration authority disagreement'
    };
    const reasons=certificate?.reasons||calibration?.warnings||[];
    return {label:labels[status]||status,blocking:[STATUS.REJECTED,STATUS.UNRESOLVED,STATUS.CONFLICT].includes(status),reasons:[...reasons]};
  }

  function blockedPhysicalResult({physical,status,family,path,routeId,calibration}){
    const warnings=physical?.warnings||['Physical route environment could not be certified.'];
    return deepFreeze({
      status,family,path,route:routeId,
      environmentSource:'PHYSICAL_SI',
      physicalEnvironment:physical||null,
      calibration:calibration?{status:calibration.status,profileIdentity:calibration.profileIdentity,warnings:calibration.warnings}:null,
      certificate:null,
      presentation:presentationFor(status,null,{warnings}),
      warnings,
      provenance:unique([...(physical?.provenance||[]),...(calibration?.provenance||[])])
    });
  }

  async function resolveGeneratedFTLRouteSafety(context={}){
    const Calibration=globalThis.BlacklightExoFTLSafetyCalibrationRuntime;
    const Certification=globalThis.BlacklightExoFTLSafetyCertificationRuntime;
    if(!Calibration||!Certification){
      return deepFreeze({status:STATUS.UNRESOLVED,warnings:['Safety calibration/certification runtimes are not loaded.'],presentation:presentationFor(STATUS.UNRESOLVED),provenance:[]});
    }

    const loaded=context.registry&&context.calibrationRegistry
      ?{registry:context.registry,calibrationRegistry:context.calibrationRegistry}
      :await loadRegistries();
    const registry=loaded.registry,calibrationRegistry=loaded.calibrationRegistry;
    const rating=context.rating||{},request=context.request||{};
    const family=familyKey(rating,request,registry),path=pathKey(rating),routeId=routeKey(rating,request),route=registry.routeArchetypes?.[routeId];
    if(!family||!route){
      return deepFreeze({status:STATUS.UNRESOLVED,family:family||null,path,route:routeId,warnings:['Generated family or route has no safety integration mapping.'],presentation:presentationFor(STATUS.UNRESOLVED),provenance:[]});
    }

    const calibration=Calibration.resolveFTLSafetyCalibrationProfile({
      registry:calibrationRegistry,
      requestedProfileId:context.requestedProfileId,
      requestedProfileVersion:context.requestedProfileVersion,
      path,
      namedOverrideIds:Array.isArray(context.namedOverrideIds)?context.namedOverrideIds:[],
      provenance:[registry.registryKey,routeId,...(Array.isArray(context.provenance)?context.provenance:[])]
    });
    if(calibration.status!=='READY'||!calibration.profile){
      const status=calibration.status==='CONFLICT'?STATUS.CONFLICT:STATUS.UNRESOLVED;
      return deepFreeze({status,family,path,route:routeId,calibration,certificate:null,presentation:presentationFor(status,null,calibration),warnings:calibration.warnings||[],provenance:calibration.provenance||[]});
    }

    let physical=null;
    let environmentPacket={epoch:'GENERATED_ROUTE_ARCHETYPE',...route.environment,provenance:[`${registry.registryKey}:${routeId}`]};
    let uncertaintyOverride=null;
    let environmentSource='PROPOSED_ROUTE_ARCHETYPE';
    if(context.physicalEnvironmentContext){
      const Physical=globalThis.BlacklightExoFTLPhysicalRouteEnvironmentRuntime;
      if(!Physical?.resolveFTLPhysicalRouteEnvironment){
        return blockedPhysicalResult({
          physical:{warnings:['A physicalEnvironmentContext was supplied but the physical-route bridge runtime is not loaded. Proposed route fallback is prohibited.'],provenance:[]},
          status:STATUS.UNRESOLVED,family,path,routeId,calibration
        });
      }
      physical=await Physical.resolveFTLPhysicalRouteEnvironment({
        physicalEnvironmentContext:context.physicalEnvironmentContext,
        familyBoundaryHazard:route.environment?.familyBoundaryHazard,
        epoch:context.physicalEnvironmentContext.epoch||'PHYSICAL_ROUTE_ENVIRONMENT',
        provenance:[registry.registryKey,routeId,...(Array.isArray(context.provenance)?context.provenance:[])]
      });
      if(physical.status==='OUTSIDE_MODEL_VALIDITY'){
        return blockedPhysicalResult({physical,status:STATUS.REJECTED,family,path,routeId,calibration});
      }
      if(physical.status!=='READY'){
        return blockedPhysicalResult({physical,status:STATUS.UNRESOLVED,family,path,routeId,calibration});
      }
      environmentPacket=physical.environmentPacket;
      uncertaintyOverride=physical.uncertaintyPacket;
      environmentSource='PHYSICAL_SI';
    }

    const maturity=calibration.maturityModifier||{};
    const measurement=buildMeasurement(route,family,registry,maturity,uncertaintyOverride);
    const timing=buildTiming(path,maturity,route);
    if(['fold-jump','q-lattice','phase-displacement'].includes(family))timing.decisionHorizonMode='PRECOMMIT';
    const certificate=Certification.resolveTransitSafetyCertificate({
      certificateId:`generated:${rating.identity?.name||'ftl'}:${routeId}:${calibration.profile.profileVersion}`,
      subjectId:rating.identity?.name||null,
      family,
      path,
      sharedTier:rating.identity?.tierKey||null,
      authoritySnapshot:{
        routeIntegrationRegistry:registry.schemaVersion,
        calibrationProfile:calibration.profileIdentity,
        environmentSource,
        physicalNormalizationProfile:physical?.normalizationProfile?`${physical.normalizationProfile.profileId}@${physical.normalizationProfile.profileVersion}`:null
      },
      environmentPacket,
      measurementPacket:measurement.packet,
      calibrationProfile:calibration.profile,
      routeCandidate:{projectedProgressRate:1},
      safetyState:timing,
      requiredHazards:measurement.requiredHazards,
      recoveryState:buildRecovery(maturity,route),
      provenance:unique([
        registry.registryKey,
        calibration.profile.profileId+'@'+calibration.profile.profileVersion,
        ...(physical?.provenance||[])
      ])
    });

    let status=certificate.status;
    const thresholds=calibration.profile.thresholds||{};
    if(status==='ADMISSIBLE'){
      if(finite(certificate.familyResponse?.gravityEfficiency)&&finite(thresholds.minimumGravityEfficiency)&&certificate.familyResponse.gravityEfficiency<Number(thresholds.minimumGravityEfficiency))status=STATUS.REJECTED;
      if(finite(certificate.familyResponse?.calculationEfficiency)&&finite(thresholds.minimumCalculationEfficiency)&&certificate.familyResponse.calculationEfficiency<Number(thresholds.minimumCalculationEfficiency))status=STATUS.REJECTED;
    }
    const warnings=[];
    if(status!==certificate.status)warnings.push('Family efficiency fell below the active profile threshold; route admission promoted to REJECTED.');
    if(environmentSource==='PHYSICAL_SI'){
      warnings.push(...(physical?.warnings||[]));
      warnings.push('Route gravity/curvature burden is sourced from a supplied SI physical environment packet; fictional family response and calibration remain DERIVED/PROPOSED.');
    }else{
      warnings.push('No physical environment packet was supplied; route environment values are PROPOSED normalized simulation inputs, not measured astrophysical constants.');
    }

    return deepFreeze({
      status,family,path,route:routeId,environmentSource,
      physicalEnvironment:physical,
      calibration:{status:calibration.status,profileIdentity:calibration.profileIdentity,appliedOverrides:calibration.appliedOverrides,ignoredOverrides:calibration.ignoredOverrides,warnings:calibration.warnings},
      certificate,
      presentation:presentationFor(status,certificate,calibration),
      warnings,
      provenance:unique([registry.registryKey,...(certificate.provenance||[]),...(calibration.provenance||[]),...(physical?.provenance||[])])
    });
  }

  globalThis.BlacklightExoFTLRouteSafetyRuntime=deepFreeze({STATUS,REGISTRY_URL,CALIBRATION_URL,loadRegistries,resolveGeneratedFTLRouteSafety});
})();
