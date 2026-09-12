(() => {
  'use strict';

  const REGISTRY_URL='data/exo-vessel/ftl-route-safety-integration.json';
  const CALIBRATION_URL='data/exo-vessel/ftl-safety-calibration-profiles.json';
  const STATUS=Object.freeze({ADMISSIBLE:'ADMISSIBLE',MARGINAL:'MARGINAL',REJECTED:'REJECTED',UNRESOLVED:'UNRESOLVED',OUTSIDE_MODEL_VALIDITY:'OUTSIDE_MODEL_VALIDITY',CONFLICT:'CONFLICT'});
  let cachePromise=null;

  const finite=value=>value!==null&&value!==undefined&&value!==''&&Number.isFinite(Number(value));
  const unique=items=>[...new Set((items||[]).filter(Boolean))];

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
    if(request.route)return request.route;
    const identity=rating.identity||{};
    const operational=globalThis.BlacklightExoFTLOperationalDefinitions?.routes||[];
    return operational.find(route=>route.label===identity.routeEnvironment)?.key||'deep-space';
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
    return {
      predictionTime:(2.4+rank*1.35)*lookahead/Math.max(0.6,1+uncertainty*0.35),
      sensorTime:Math.max(0.08,0.62-rank*0.065),
      solverTime:Math.max(0.12,0.82-rank*0.075),
      decisionTime:Math.max(0.10,0.58-rank*0.045),
      commandTime:Math.max(0.05,0.24-rank*0.02),
      actuationTime:Math.max(0.16,0.78-rank*0.07),
      exitTime:Math.max(0.32,1.15-rank*0.09),
      clearTime:Math.max(0.18,0.60-rank*0.045),
      marginTime:0.32+uncertainty*0.55
    };
  }

  function buildRecovery(maturity={},route={},options={}){
    const recoveryFactor=finite(maturity.recoveryFactor)?Number(maturity.recoveryFactor):1;
    const routeBoundary=options.useRouteBoundary===false?null:route.environment?.familyBoundaryHazard;
    const explicitBoundary=finite(options.familyBoundaryHazard)?Number(options.familyBoundaryHazard):null;
    const boundaryBurden=explicitBoundary!==null?Math.max(0,explicitBoundary):(finite(routeBoundary)?Math.max(0,Number(routeBoundary)):0);
    const burden=1+boundaryBurden*0.28+Math.max(0,Number(route.uncertaintyBase)||0)*0.22;
    const totalAuthority=1.8*recoveryFactor;
    return {totalAuthority,protectedReserve:Math.min(totalAuthority,1.05*recoveryFactor),requiredRecoveryAuthority:0.82*burden};
  }

  function buildMeasurement(route={},family,registry={},maturity={},uncertaintyOverride=null){
    const redundancy=finite(maturity.redundancyFactor)?Number(maturity.redundancyFactor):1;
    const requiredHazards=unique([...(Array.isArray(route.requiredHazards)?route.requiredHazards:[]),...(Array.isArray(registry.familyHazards?.[family])?registry.familyHazards[family]:[])]);
    const observableHazards=[];
    const independentGuardHazards=[];
    requiredHazards.forEach((hazard,index)=>{
      if(redundancy>=0.8||index%3!==0)observableHazards.push(hazard);
      else if(redundancy>=0.6)independentGuardHazards.push(hazard);
    });
    return {requiredHazards,packet:{observableHazards,independentGuardHazards,uncertainty:uncertaintyOverride||buildUncertainty(Number(route.uncertaintyBase)||0.1,maturity)}};
  }

  function presentationFor(status,certificate,calibration){
    const labels={ADMISSIBLE:'Certified for modeled route',MARGINAL:'Marginal — reduce authority or improve margin',REJECTED:'Rejected — no certified transit solution',UNRESOLVED:'Unresolved — insufficient certification evidence',OUTSIDE_MODEL_VALIDITY:'Rejected — physical model outside validity domain',CONFLICT:'Conflict — calibration authority disagreement'};
    const reasons=certificate?.reasons||calibration?.warnings||[];
    return {label:labels[status]||status,blocking:[STATUS.REJECTED,STATUS.UNRESOLVED,STATUS.OUTSIDE_MODEL_VALIDITY,STATUS.CONFLICT].includes(status),reasons:[...reasons]};
  }

  function timingIdentityContext(context={},family,baselineTiming,baselineRecovery,provenance=[]){
    return {
      baselineTiming,baselineRecovery,family,
      namedTechnologyId:context.namedTechnologyId||null,
      vesselId:context.vesselId||null,
      installationId:context.installationId||null,
      manufacturerId:context.manufacturerId||null,
      raceId:context.raceId||null,
      readiness:context.installationReadiness||context.readiness||{},
      maintenancePenalty:context.installationMaintenancePenalty??context.maintenancePenalty,
      provenance
    };
  }

  async function resolveInstallationTiming(context,family,baselineTiming,baselineRecovery,provenance=[]){
    const Runtime=globalThis.BlacklightExoFTLInstallationSafetyTimingRuntime;
    if(!Runtime?.resolveFTLInstallationSafetyTiming){
      return deepFreeze({status:'UNRESOLVED',timing:{...baselineTiming},recovery:baselineRecovery?{...baselineRecovery}:null,selectedRecord:null,readiness:null,appliedFactors:null,warnings:['Installation safety timing runtime is not loaded; named readiness/maintenance evidence cannot be applied.'],provenance:unique(provenance)});
    }
    return Runtime.resolveFTLInstallationSafetyTiming(timingIdentityContext(context,family,baselineTiming,baselineRecovery,provenance));
  }

  function timingBlocksCertification(packet){
    return packet?.status==='BLOCKED'||packet?.status==='CONFLICT';
  }

  function blockedPhysicalResult({physical,status,family,path,routeId,calibration,warnings=null,provenance=[]}){
    const effectiveWarnings=warnings||physical?.warnings||['Physical route environment could not be certified.'];
    return deepFreeze({status,family,path,route:routeId,environmentSource:'PHYSICAL_SI',physicalEnvironment:physical||null,familySegmentCertification:null,firstBlockingSegment:null,conservativeBlocker:null,installationSafetyTiming:null,calibration:calibration?{status:calibration.status,profileIdentity:calibration.profileIdentity,warnings:calibration.warnings}:null,certificate:null,presentation:presentationFor(status,null,{warnings:effectiveWarnings}),warnings:effectiveWarnings,provenance:unique([...(physical?.provenance||[]),...(calibration?.provenance||[]),...provenance])});
  }

  function representativeSegment(segmentSafety){
    const segments=Array.isArray(segmentSafety?.segments)?segmentSafety.segments:[];
    const firstIndex=segmentSafety?.routeDisposition?.firstBlockingSegmentIndex;
    if(firstIndex!==null&&firstIndex!==undefined){
      const first=segments.find(segment=>segment.index===firstIndex);
      if(first)return first;
    }
    return segments.find(segment=>segment.status==='MARGINAL')||segments[0]||null;
  }

  async function resolvePhysicalPathSafety({context,rating,registry,route,routeId,family,path,calibration}){
    const FamilySegments=globalThis.BlacklightExoFTLFamilySegmentCertificationRuntime;
    if(!FamilySegments?.resolveFTLFamilySegmentCertification){
      const warnings=['A physical route path was supplied but the family-segment certification runtime is not loaded. Route-level fallback is prohibited.'];
      return deepFreeze({status:STATUS.UNRESOLVED,family,path,route:routeId,environmentSource:'PHYSICAL_ROUTE_PATH',physicalEnvironment:null,familySegmentCertification:null,firstBlockingSegment:null,conservativeBlocker:null,installationSafetyTiming:null,calibration:{status:calibration.status,profileIdentity:calibration.profileIdentity,warnings:calibration.warnings},certificate:null,presentation:presentationFor(STATUS.UNRESOLVED,null,{warnings}),warnings,provenance:unique([registry.registryKey,...(calibration.provenance||[])])});
    }

    const maturity=calibration.maturityModifier||{};
    const measurement=buildMeasurement(route,family,registry,maturity,null);
    const baselineTiming={...(context.safetyState||buildTiming(path,maturity,route))};
    if(['fold-jump','q-lattice','phase-displacement'].includes(family)&&!baselineTiming.decisionHorizonMode)baselineTiming.decisionHorizonMode='PRECOMMIT';
    const baselineRecovery=context.recoveryState||buildRecovery(maturity,route,{useRouteBoundary:false,familyBoundaryHazard:context.familyBoundaryHazard});
    const timingPacket=await resolveInstallationTiming(context,family,baselineTiming,baselineRecovery,[registry.registryKey,routeId,...(Array.isArray(context.provenance)?context.provenance:[])]);
    if(timingBlocksCertification(timingPacket)){
      const status=timingPacket.status==='CONFLICT'?STATUS.CONFLICT:STATUS.REJECTED;
      const warnings=unique([...(timingPacket.warnings||[]),'Installation timing/readiness authority blocks physical-route certification before family-segment evaluation.']);
      return deepFreeze({status,family,path,route:routeId,environmentSource:'PHYSICAL_ROUTE_PATH',physicalEnvironment:null,familySegmentCertification:null,firstBlockingSegment:null,conservativeBlocker:null,installationSafetyTiming:timingPacket,calibration:{status:calibration.status,profileIdentity:calibration.profileIdentity,warnings:calibration.warnings},certificate:null,presentation:presentationFor(status,null,{warnings}),warnings,provenance:unique([registry.registryKey,...(timingPacket.provenance||[]),...(calibration.provenance||[])])});
    }

    const segmentSafety=await FamilySegments.resolveFTLFamilySegmentCertification({
      family,path,pathPacket:context.pathPacket||null,segmentPacket:context.segmentPacket||null,pathContext:context.physicalRoutePathContext||context.pathContext||context,
      requestedProfileId:context.requestedProfileId,requestedProfileVersion:context.requestedProfileVersion,namedOverrideIds:Array.isArray(context.namedOverrideIds)?context.namedOverrideIds:[],subjectId:rating.identity?.name||null,sharedTier:rating.identity?.tierKey||null,
      projectedProgressRate:finite(context.projectedProgressRate)?Number(context.projectedProgressRate):null,currentRouteFraction:finite(context.currentRouteFraction)?Number(context.currentRouteFraction):0,
      familyBoundaryHazard:context.familyBoundaryHazard,familyBoundaryHazardKnownAbsent:context.familyBoundaryHazardKnownAbsent===true,
      uncertaintyAwareBoundaryRefinement:context.uncertaintyAwareBoundaryRefinement||context.boundaryRefinementPacket||null,topologyHazardKey:context.topologyHazardKey||null,topologyHazardApplicabilityResolution:context.topologyHazardApplicabilityResolution||null,
      namedTechnologyId:context.namedTechnologyId||null,vesselId:context.vesselId||null,installationId:context.installationId||null,raceId:context.raceId||null,manufacturerId:context.manufacturerId||null,canonicalResolutionRequired:context.canonicalResolutionRequired!==false,topologyApplicabilitySimulationOverride:context.topologyApplicabilitySimulationOverride||null,
      requiredHazards:measurement.requiredHazards,measurementPacket:measurement.packet,safetyState:timingPacket.timing,recoveryState:timingPacket.recovery,
      provenance:unique([registry.registryKey,routeId,...(timingPacket.provenance||[]),...(Array.isArray(context.provenance)?context.provenance:[])])
    });
    const representative=representativeSegment(segmentSafety);
    const firstIndex=segmentSafety?.routeDisposition?.firstBlockingSegmentIndex;
    const firstBlocking=firstIndex===null||firstIndex===undefined?null:(segmentSafety.segments||[]).find(segment=>segment.index===firstIndex)||null;
    const conservative=segmentSafety?.routeDisposition?.conservativeBlocker||null;
    const status=segmentSafety.status||STATUS.UNRESOLVED;
    const warnings=unique([...(timingPacket.warnings||[]),...(segmentSafety.warnings||[]),'Route disposition is conjunctive across family-certified physical intervals; benign intervals cannot average away a blocker.',!finite(context.familyBoundaryHazard)&&context.familyBoundaryHazardKnownAbsent!==true&&family!=='inertial-torch'?'No explicit family-boundary hazard was supplied for this physical path; exotic-family intervals remain unresolved rather than inheriting a route archetype boundary value.':null,firstBlocking?`First blocking interval ${firstBlocking.index} begins at route fraction ${Number(firstBlocking.fractionStart).toFixed(6)}.`:null,conservative?.applicableToCertifiedBlocker&&finite(conservative.effectiveBlockingFraction)&&finite(conservative.nominalBlockingFraction)&&Number(conservative.effectiveBlockingFraction)<Number(conservative.nominalBlockingFraction)?`Explicit topology authority moves the conservative planning edge to route fraction ${Number(conservative.effectiveBlockingFraction).toFixed(6)}; the nominal blocking interval remains unchanged.`:null]);
    const presentation=presentationFor(status,representative?.certificate,{warnings});
    if(firstBlocking){
      const disposition=segmentSafety.routeDisposition||{};
      const distance=disposition.distanceToFirstBlockingSegmentM,nominalDistance=disposition.nominalDistanceToFirstBlockingSegmentM,reachable=disposition.interventionReachable;
      presentation.reasons=unique([...(presentation.reasons||[]),`First blocker: interval ${firstBlocking.index}.`,finite(nominalDistance)?`Nominal distance to first blocker: ${Number(nominalDistance).toExponential(6)} m.`:null,finite(distance)&&(!finite(nominalDistance)||Number(distance)!==Number(nominalDistance))?`Conservative distance to first blocker: ${Number(distance).toExponential(6)} m.`:finite(distance)?`Distance to first blocker: ${Number(distance).toExponential(6)} m.`:null,reachable===false?'Modeled intervention cannot clear the conservative first-blocker edge in time.':reachable===true?'Modeled intervention remains reachable before the conservative first-blocker edge.':'Intervention reachability is unresolved.']);
    }
    return deepFreeze({status,family,path,route:routeId,environmentSource:'PHYSICAL_ROUTE_PATH',physicalEnvironment:null,familySegmentCertification:segmentSafety,firstBlockingSegment:firstBlocking,conservativeBlocker:conservative,installationSafetyTiming:timingPacket,calibration:{status:calibration.status,profileIdentity:calibration.profileIdentity,appliedOverrides:calibration.appliedOverrides,ignoredOverrides:calibration.ignoredOverrides,warnings:calibration.warnings},certificate:representative?.certificate||null,presentation,warnings,provenance:unique([registry.registryKey,...(timingPacket.provenance||[]),...(conservative?.provenance||[]),...(segmentSafety.provenance||[]),...(calibration.provenance||[])])});
  }

  async function resolveGeneratedFTLRouteSafety(context={}){
    const Calibration=globalThis.BlacklightExoFTLSafetyCalibrationRuntime;
    const Certification=globalThis.BlacklightExoFTLSafetyCertificationRuntime;
    if(!Calibration||!Certification)return deepFreeze({status:STATUS.UNRESOLVED,warnings:['Safety calibration/certification runtimes are not loaded.'],presentation:presentationFor(STATUS.UNRESOLVED),provenance:[]});

    const loaded=context.registry&&context.calibrationRegistry?{registry:context.registry,calibrationRegistry:context.calibrationRegistry}:await loadRegistries();
    const registry=loaded.registry,calibrationRegistry=loaded.calibrationRegistry,rating=context.rating||{},request=context.request||{};
    const family=familyKey(rating,request,registry),path=pathKey(rating),routeId=routeKey(rating,request),route=registry.routeArchetypes?.[routeId];
    if(!family||!route)return deepFreeze({status:STATUS.UNRESOLVED,family:family||null,path,route:routeId,warnings:['Generated family or route has no safety integration mapping.'],presentation:presentationFor(STATUS.UNRESOLVED),provenance:[]});

    const calibration=Calibration.resolveFTLSafetyCalibrationProfile({registry:calibrationRegistry,requestedProfileId:context.requestedProfileId,requestedProfileVersion:context.requestedProfileVersion,path,namedOverrideIds:Array.isArray(context.namedOverrideIds)?context.namedOverrideIds:[],provenance:[registry.registryKey,routeId,...(Array.isArray(context.provenance)?context.provenance:[])]});
    if(calibration.status!=='READY'||!calibration.profile){
      const status=calibration.status==='CONFLICT'?STATUS.CONFLICT:STATUS.UNRESOLVED;
      return deepFreeze({status,family,path,route:routeId,calibration,certificate:null,presentation:presentationFor(status,null,calibration),warnings:calibration.warnings||[],provenance:calibration.provenance||[]});
    }
    if(context.physicalRoutePathContext||context.pathPacket||context.segmentPacket)return resolvePhysicalPathSafety({context,rating,registry,route,routeId,family,path,calibration});

    let physical=null,environmentPacket={epoch:'GENERATED_ROUTE_ARCHETYPE',...route.environment,provenance:[`${registry.registryKey}:${routeId}`]},uncertaintyOverride=null,environmentSource='PROPOSED_ROUTE_ARCHETYPE';
    if(context.physicalEnvironmentContext){
      const Physical=globalThis.BlacklightExoFTLPhysicalRouteEnvironmentRuntime;
      if(!Physical?.resolveFTLPhysicalRouteEnvironment)return blockedPhysicalResult({physical:{warnings:['A physicalEnvironmentContext was supplied but the physical-route bridge runtime is not loaded. Proposed route fallback is prohibited.'],provenance:[]},status:STATUS.UNRESOLVED,family,path,routeId,calibration});
      physical=await Physical.resolveFTLPhysicalRouteEnvironment({physicalEnvironmentContext:context.physicalEnvironmentContext,familyBoundaryHazard:route.environment?.familyBoundaryHazard,epoch:context.physicalEnvironmentContext.epoch||'PHYSICAL_ROUTE_ENVIRONMENT',provenance:[registry.registryKey,routeId,...(Array.isArray(context.provenance)?context.provenance:[])]});
      if(physical.status==='OUTSIDE_MODEL_VALIDITY')return blockedPhysicalResult({physical,status:STATUS.OUTSIDE_MODEL_VALIDITY,family,path,routeId,calibration});
      if(physical.status!=='READY')return blockedPhysicalResult({physical,status:STATUS.UNRESOLVED,family,path,routeId,calibration});
      environmentPacket=physical.environmentPacket;uncertaintyOverride=physical.uncertaintyPacket;environmentSource='PHYSICAL_SI';
    }

    const maturity=calibration.maturityModifier||{};
    const measurement=buildMeasurement(route,family,registry,maturity,uncertaintyOverride);
    const baselineTiming={...(context.safetyState||buildTiming(path,maturity,route))};
    if(['fold-jump','q-lattice','phase-displacement'].includes(family)&&!baselineTiming.decisionHorizonMode)baselineTiming.decisionHorizonMode='PRECOMMIT';
    const baselineRecovery=context.recoveryState||buildRecovery(maturity,route);
    const timingPacket=await resolveInstallationTiming(context,family,baselineTiming,baselineRecovery,[registry.registryKey,routeId,calibration.profile.profileId+'@'+calibration.profile.profileVersion,...(physical?.provenance||[]),...(Array.isArray(context.provenance)?context.provenance:[])]);
    if(timingBlocksCertification(timingPacket)){
      const status=timingPacket.status==='CONFLICT'?STATUS.CONFLICT:STATUS.REJECTED;
      const warnings=unique([...(timingPacket.warnings||[]),'Installation timing/readiness authority blocks route certification before transit-safety evaluation.']);
      return deepFreeze({status,family,path,route:routeId,environmentSource,physicalEnvironment:physical,familySegmentCertification:null,firstBlockingSegment:null,conservativeBlocker:null,installationSafetyTiming:timingPacket,calibration:{status:calibration.status,profileIdentity:calibration.profileIdentity,warnings:calibration.warnings},certificate:null,presentation:presentationFor(status,null,{warnings}),warnings,provenance:unique([registry.registryKey,...(timingPacket.provenance||[]),...(calibration.provenance||[]),...(physical?.provenance||[])])});
    }

    const certificate=Certification.resolveTransitSafetyCertificate({certificateId:`generated:${rating.identity?.name||'ftl'}:${routeId}:${calibration.profile.profileVersion}`,subjectId:rating.identity?.name||null,family,path,sharedTier:rating.identity?.tierKey||null,authoritySnapshot:{routeIntegrationRegistry:registry.schemaVersion,calibrationProfile:calibration.profileIdentity,environmentSource,physicalNormalizationProfile:physical?.normalizationProfile?`${physical.normalizationProfile.profileId}@${physical.normalizationProfile.profileVersion}`:null,installationSafetyTiming:timingPacket.selectedRecord?.recordId||timingPacket.status},environmentPacket,measurementPacket:measurement.packet,calibrationProfile:calibration.profile,routeCandidate:{projectedProgressRate:1},safetyState:timingPacket.timing,requiredHazards:measurement.requiredHazards,recoveryState:timingPacket.recovery,provenance:unique([registry.registryKey,calibration.profile.profileId+'@'+calibration.profile.profileVersion,...(timingPacket.provenance||[]),...(physical?.provenance||[])])});

    let status=certificate.status;
    const thresholds=calibration.profile.thresholds||{};
    if(status==='ADMISSIBLE'){
      if(finite(certificate.familyResponse?.gravityEfficiency)&&finite(thresholds.minimumGravityEfficiency)&&certificate.familyResponse.gravityEfficiency<Number(thresholds.minimumGravityEfficiency))status=STATUS.REJECTED;
      if(finite(certificate.familyResponse?.calculationEfficiency)&&finite(thresholds.minimumCalculationEfficiency)&&certificate.familyResponse.calculationEfficiency<Number(thresholds.minimumCalculationEfficiency))status=STATUS.REJECTED;
    }
    const warnings=unique([...(timingPacket.warnings||[]),status!==certificate.status?'Family efficiency fell below the active profile threshold; route admission promoted to REJECTED.':null,environmentSource==='PHYSICAL_SI'?'Route gravity/curvature burden is sourced from a supplied SI physical environment packet; fictional family response and calibration remain DERIVED/PROPOSED.':'No physical environment packet was supplied; route environment values are PROPOSED normalized simulation inputs, not measured astrophysical constants.',...(environmentSource==='PHYSICAL_SI'?(physical?.warnings||[]):[])]);

    return deepFreeze({status,family,path,route:routeId,environmentSource,physicalEnvironment:physical,familySegmentCertification:null,firstBlockingSegment:null,conservativeBlocker:null,installationSafetyTiming:timingPacket,calibration:{status:calibration.status,profileIdentity:calibration.profileIdentity,appliedOverrides:calibration.appliedOverrides,ignoredOverrides:calibration.ignoredOverrides,warnings:calibration.warnings},certificate,presentation:presentationFor(status,certificate,{warnings}),warnings,provenance:unique([registry.registryKey,...(timingPacket.provenance||[]),...(certificate.provenance||[]),...(calibration.provenance||[]),...(physical?.provenance||[])])});
  }

  globalThis.BlacklightExoFTLRouteSafetyRuntime=deepFreeze({STATUS,REGISTRY_URL,CALIBRATION_URL,loadRegistries,resolveGeneratedFTLRouteSafety});
})();
