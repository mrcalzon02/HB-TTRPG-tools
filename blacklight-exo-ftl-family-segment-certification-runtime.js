(() => {
  'use strict';

  const REGISTRY_URL='data/exo-vessel/ftl-family-segment-certification-registry.json';
  const CALIBRATION_URL='data/exo-vessel/ftl-safety-calibration-profiles.json';
  const PHYSICAL_BRIDGE_URL='data/exo-vessel/ftl-physical-route-environment-bridge.json';
  const ROUTE_INTEGRATION_URL='data/exo-vessel/ftl-route-safety-integration.json';
  const STATUS=Object.freeze({ADMISSIBLE:'ADMISSIBLE',MARGINAL:'MARGINAL',REJECTED:'REJECTED',UNRESOLVED:'UNRESOLVED',OUTSIDE_MODEL_VALIDITY:'OUTSIDE_MODEL_VALIDITY',CONFLICT:'CONFLICT'});
  const PRECOMMIT=new Set(['fold-jump','q-lattice','phase-displacement']);
  const EXOTIC=new Set(['metric-compression','gravitational-plane','slipstream-shear','q-lattice','n-manifold','fold-jump','wormhole-gate','phase-displacement']);
  let supportPromise=null;

  const finite=v=>v!==null&&v!==undefined&&v!==''&&Number.isFinite(Number(v));
  const n=v=>Number(v);
  const sq=v=>n(v)*n(v);
  const unique=items=>[...new Set((items||[]).filter(Boolean))];
  const clamp01=v=>Math.max(0,Math.min(1,n(v)));

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

  async function loadSupport(){
    if(!supportPromise){
      supportPromise=Promise.all([
        fetchJson(REGISTRY_URL),fetchJson(CALIBRATION_URL),fetchJson(PHYSICAL_BRIDGE_URL),fetchJson(ROUTE_INTEGRATION_URL)
      ]).then(([registry,calibrationRegistry,physicalBridge,routeIntegration])=>{
        if(registry?.registryKey!=='blacklight.ftl.family-segment-certification')throw new Error('Invalid family-segment certification registry identity.');
        if(calibrationRegistry?.registryKey!=='blacklight.ftl.safety-calibration-profiles')throw new Error('Invalid safety calibration registry identity.');
        if(physicalBridge?.registryKey!=='blacklight.ftl.physical-route-environment-bridge')throw new Error('Invalid physical route environment bridge identity.');
        if(routeIntegration?.registryKey!=='blacklight.ftl.route-safety-integration')throw new Error('Invalid route safety integration registry identity.');
        return deepFreeze({registry,calibrationRegistry,physicalBridge,routeIntegration});
      }).catch(error=>{supportPromise=null;throw error;});
    }
    return supportPromise;
  }

  function worstStatus(...states){
    const rank={ADMISSIBLE:0,MARGINAL:1,UNRESOLVED:2,REJECTED:3,OUTSIDE_MODEL_VALIDITY:4,CONFLICT:5};
    return states.filter(Boolean).reduce((worst,state)=>(rank[state]??2)>(rank[worst]??0)?state:worst,STATUS.ADMISSIBLE);
  }

  function unresolved(reason,registry,family=null,path=null,segmentPacket=null,status=STATUS.UNRESOLVED){
    return deepFreeze({
      schemaVersion:'1.0.0',status,family,path,calibration:null,normalization:null,segments:[],
      routeDisposition:{conjunctive:true,worstStatus:status,blockingSegmentIndices:[],firstBlockingSegmentIndex:null,distanceToFirstBlockingSegmentM:null,timeToFirstBlockingSegmentS:null,interventionReachable:null},
      warnings:[reason],provenance:unique([REGISTRY_URL,...(segmentPacket?.provenance||[])]),canonSafeguards:registry?.canonSafeguards||[]
    });
  }

  function boundaryHazardFor(context,index,family){
    if(family==='inertial-torch')return 0;
    const source=context.familyBoundaryHazard;
    if(Array.isArray(source)&&finite(source[index]))return Math.max(0,n(source[index]));
    if(source&&typeof source==='object'&&finite(source[index]))return Math.max(0,n(source[index]));
    if(finite(source))return Math.max(0,n(source));
    if(context.familyBoundaryHazardKnownAbsent===true)return 0;
    return null;
  }

  function normalizeSegmentEnvironment(segment,normalization,boundaryHazard){
    const env=segment?.environmentEnvelope||{};
    const refs=normalization?.referenceScales||{};
    const required=[
      ['maxDimensionlessPotentialDepth','dimensionlessPotentialDepth'],
      ['maxAccelerationMPerS2','accelerationMPerS2'],
      ['maxTidalFrobeniusPerS2','tidalFrobeniusPerS2'],
      ['maxSingleSourceCurvatureScalePerM2','curvatureScalePerM2']
    ];
    const missing=required.filter(([key,ref])=>!finite(env[key])||!finite(refs[ref])||n(refs[ref])<=0);
    if(missing.length)return {status:STATUS.UNRESOLVED,reason:`Segment ${segment?.index} lacks physical metric/reference pairs: ${missing.map(x=>x.join('/')).join(', ')}`};

    const uncertainty=segment?.uncertainty||{};
    const uKeys=['massFractional1Sigma','ephemerisFractional1Sigma','modelFractional1Sigma','clockFractional1Sigma','sensorFractional1Sigma','registrationFractional1Sigma','commonCauseFractional1Sigma'];
    const missingU=uKeys.filter(key=>!finite(uncertainty[key])||n(uncertainty[key])<0);
    if(missingU.length)return {status:STATUS.UNRESOLVED,reason:`Segment ${segment?.index} lacks bounded uncertainty: ${missingU.join(', ')}.`};
    if(!finite(refs.massModelFractional1Sigma)||n(refs.massModelFractional1Sigma)<=0)return {status:STATUS.UNRESOLVED,reason:'Physical normalization has no positive mass-model uncertainty reference.'};
    if(boundaryHazard===null)return {status:STATUS.UNRESOLVED,reason:`Segment ${segment?.index} has no explicit ${segment?.family||'family'} boundary-hazard state; ordinary gravity cannot manufacture it.`};

    const massModelSigma=Math.sqrt(sq(uncertainty.massFractional1Sigma)+sq(uncertainty.ephemerisFractional1Sigma)+sq(uncertainty.modelFractional1Sigma));
    const environmentPacket={
      epoch:uncertainty.epoch||null,
      potentialMagnitude:Math.abs(n(env.maxDimensionlessPotentialDepth))/n(refs.dimensionlessPotentialDepth),
      accelerationMagnitude:Math.abs(n(env.maxAccelerationMPerS2))/n(refs.accelerationMPerS2),
      tidalTensorNorm:Math.abs(n(env.maxTidalFrobeniusPerS2))/n(refs.tidalFrobeniusPerS2),
      curvatureNorm:Math.abs(n(env.maxSingleSourceCurvatureScalePerM2))/n(refs.curvatureScalePerM2),
      massModelUncertainty:massModelSigma/n(refs.massModelFractional1Sigma),
      hiddenMassProbability:finite(uncertainty.hiddenMassProbability)?clamp01(uncertainty.hiddenMassProbability):null,
      familyBoundaryHazard:boundaryHazard,
      provenance:unique([...(segment.provenance||[]),`${normalization.profileId}@${normalization.profileVersion}`,'segment endpoint envelope normalized before fictional family response'])
    };
    const uncertaintyPacket={
      ephemerisCovariance:sq(uncertainty.ephemerisFractional1Sigma),
      massModelCovariance:sq(uncertainty.massFractional1Sigma),
      clockCovariance:sq(uncertainty.clockFractional1Sigma),
      sensorCovariance:sq(uncertainty.sensorFractional1Sigma),
      registrationCovariance:sq(uncertainty.registrationFractional1Sigma),
      modelCovariance:sq(uncertainty.modelFractional1Sigma),
      commonCauseCovariance:sq(uncertainty.commonCauseFractional1Sigma),
      provenance:unique([...(segment.provenance||[]),'DERIVED squared fractional 1-sigma diagonal covariance proxies'])
    };
    return {status:STATUS.ADMISSIBLE,environmentPacket,uncertaintyPacket};
  }

  function efficiencyGate(certificate,thresholds={}){
    const reasons=[];
    let status=certificate?.status||STATUS.UNRESOLVED;
    const g=certificate?.familyResponse?.gravityEfficiency;
    const c=certificate?.familyResponse?.calculationEfficiency;
    if(!finite(g)||!finite(c))return {status:worstStatus(status,STATUS.UNRESOLVED),reasons:['Family efficiency could not be resolved for this segment.']};
    if(finite(thresholds.minimumGravityEfficiency)&&n(g)<n(thresholds.minimumGravityEfficiency)){
      status=worstStatus(status,STATUS.REJECTED);reasons.push(`Gravity efficiency ${n(g).toFixed(6)} is below profile minimum ${n(thresholds.minimumGravityEfficiency).toFixed(6)}.`);
    }
    if(finite(thresholds.minimumCalculationEfficiency)&&n(c)<n(thresholds.minimumCalculationEfficiency)){
      status=worstStatus(status,STATUS.REJECTED);reasons.push(`Calculation efficiency ${n(c).toFixed(6)} is below profile minimum ${n(thresholds.minimumCalculationEfficiency).toFixed(6)}.`);
    }
    return {status,reasons};
  }

  function interventionReach(segment,certificate,routeLengthM,context,family){
    const startDistance=Math.max(0,n(segment.fractionStart)*routeLengthM);
    const currentFraction=finite(context.currentRouteFraction)?Math.max(0,Math.min(1,n(context.currentRouteFraction))):0;
    const currentDistance=currentFraction*routeLengthM;
    const distanceAhead=Math.max(0,startDistance-currentDistance);
    const lookahead=certificate?.sensorLookahead||{};
    if(PRECOMMIT.has(family)){
      return {mode:'PRECOMMIT',distanceAheadM:distanceAhead,interventionTimeS:finite(lookahead.interventionTime)?n(lookahead.interventionTime):null,predictionTimeS:finite(lookahead.predictionTime)?n(lookahead.predictionTime):null,marginS:finite(lookahead.margin)?n(lookahead.margin):null,reachable:lookahead.status==='ADMISSIBLE'};
    }
    const rate=finite(context.projectedProgressRate)?Math.max(0,n(context.projectedProgressRate)):null;
    const tInt=finite(lookahead.interventionTime)?n(lookahead.interventionTime):null;
    if(rate===null||!(rate>0)||tInt===null)return {mode:'CONTINUOUS',distanceAheadM:distanceAhead,interventionTimeS:tInt,projectedProgressRate:rate,interventionDistanceM:null,marginM:null,reachable:null};
    const interventionDistance=rate*tInt;
    return {mode:'CONTINUOUS',distanceAheadM:distanceAhead,interventionTimeS:tInt,projectedProgressRate:rate,interventionDistanceM:interventionDistance,marginM:distanceAhead-interventionDistance,reachable:distanceAhead>interventionDistance};
  }

  async function resolveFTLFamilySegmentCertification(context={}){
    const support=context.support||await loadSupport();
    const registry=support.registry;
    const family=String(context.family||'').trim();
    const path=context.path||null;
    const Calibration=context.calibrationRuntime||globalThis.BlacklightExoFTLSafetyCalibrationRuntime;
    const Safety=context.safetyRuntime||globalThis.BlacklightExoFTLSafetyCertificationRuntime;
    if(!Calibration?.resolveFTLSafetyCalibrationProfile)return unresolved('Safety calibration runtime is not loaded.',registry,family,path);
    if(!Safety?.resolveTransitSafetyCertificate)return unresolved('Safety certification runtime is not loaded.',registry,family,path);

    let segmentPacket=context.segmentPacket||null;
    if(!segmentPacket){
      const Segments=context.segmentRuntime||globalThis.BlacklightExoFTLRouteSegmentCertificationRuntime;
      if(!Segments?.resolveFTLRouteSegmentCertification)return unresolved('Route-segment runtime is not loaded and no segmentPacket was supplied.',registry,family,path);
      segmentPacket=await Segments.resolveFTLRouteSegmentCertification({pathPacket:context.pathPacket,pathRuntime:context.pathRuntime,pathContext:context.pathContext||context});
    }
    if(segmentPacket?.status==='OUTSIDE_MODEL_VALIDITY')return unresolved('The physical route contains an interval outside the active model validity domain.',registry,family,path,segmentPacket,STATUS.OUTSIDE_MODEL_VALIDITY);
    if(!Array.isArray(segmentPacket?.segments)||!segmentPacket.segments.length)return unresolved('No physical route segments are available for family certification.',registry,family,path,segmentPacket);

    const calibrationResolution=Calibration.resolveFTLSafetyCalibrationProfile({
      registry:context.calibrationRegistry||support.calibrationRegistry,
      requestedProfileId:context.requestedProfileId,
      requestedProfileVersion:context.requestedProfileVersion,
      family,path,namedOverrideIds:context.namedOverrideIds,namedOverrides:context.namedOverrides,provenance:context.provenance
    });
    if(calibrationResolution.status==='CONFLICT')return unresolved('Calibration authority is conflicting; deterministic family-segment certification refused.',registry,family,path,segmentPacket,STATUS.CONFLICT);
    if(calibrationResolution.status!=='READY'||!calibrationResolution.profile)return unresolved(`Calibration is ${calibrationResolution.status||'UNRESOLVED'}; family-segment certification requires a ready versioned profile.`,registry,family,path,segmentPacket);

    const normalization=support.physicalBridge.normalizationProfile;
    const familyHazards=support.routeIntegration.familyHazards?.[family]||[];
    const requiredHazards=unique([...(Array.isArray(context.requiredHazards)?context.requiredHazards:[]),...familyHazards]);
    const routeLengthM=n(segmentPacket.route?.lengthM);
    if(!(routeLengthM>0))return unresolved('Segment packet has no positive SI route length.',registry,family,path,segmentPacket);

    const segments=[];
    for(const segment of segmentPacket.segments){
      if(segment.status==='OUTSIDE_MODEL_VALIDITY'){
        segments.push({...segment,status:STATUS.OUTSIDE_MODEL_VALIDITY,environmentPacket:null,uncertaintyPacket:null,certificate:null,interventionReach:null,reasons:unique([...(segment.reasons||[]),'Physical model invalid on this interval.'])});
        continue;
      }
      if(segment.status==='UNRESOLVED'){
        segments.push({...segment,status:STATUS.UNRESOLVED,environmentPacket:null,uncertaintyPacket:null,certificate:null,interventionReach:null,reasons:unique([...(segment.reasons||[]),'Physical evidence is unresolved on this interval.'])});
        continue;
      }
      const boundaryHazard=boundaryHazardFor(context,segment.index,family);
      const normalized=normalizeSegmentEnvironment(segment,normalization,boundaryHazard);
      if(normalized.status!==STATUS.ADMISSIBLE){
        segments.push({...segment,status:normalized.status,environmentPacket:null,uncertaintyPacket:null,certificate:null,interventionReach:null,reasons:unique([...(segment.reasons||[]),normalized.reason])});
        continue;
      }
      const measurementPacket={...(context.measurementPacket||{}),uncertainty:normalized.uncertaintyPacket};
      const certificate=Safety.resolveTransitSafetyCertificate({
        certificateId:`${context.certificateIdPrefix||'segment'}-${segment.index}`,
        subjectId:context.subjectId||null,family,path,sharedTier:context.sharedTier||null,
        authoritySnapshot:context.authoritySnapshot||null,
        environmentPacket:normalized.environmentPacket,
        uncertaintyPacket:normalized.uncertaintyPacket,
        calibrationProfile:calibrationResolution.profile,
        routeCandidate:{projectedProgressRate:context.projectedProgressRate},
        safetyState:context.safetyState||{},requiredHazards,measurementPacket,
        recoveryState:context.recoveryState||{},provenance:unique([REGISTRY_URL,...(context.provenance||[]),...(segment.provenance||[])])
      });
      const gate=efficiencyGate(certificate,calibrationResolution.profile.thresholds||{});
      const reach=interventionReach(segment,certificate,routeLengthM,context,family);
      let status=worstStatus(segment.status,gate.status);
      const reasons=unique([...(segment.reasons||[]),...(certificate.reasons||[]),...gate.reasons]);
      segments.push({...segment,status,environmentPacket:normalized.environmentPacket,uncertaintyPacket:normalized.uncertaintyPacket,certificate,interventionReach:reach,reasons,provenance:unique([...(segment.provenance||[]),...(certificate.provenance||[])])});
    }

    const blocking=segments.filter(s=>[STATUS.REJECTED,STATUS.UNRESOLVED,STATUS.OUTSIDE_MODEL_VALIDITY,STATUS.CONFLICT].includes(s.status));
    const firstBlocking=blocking.length?blocking.reduce((a,b)=>a.fractionStart<=b.fractionStart?a:b):null;
    const worst=segments.reduce((state,s)=>worstStatus(state,s.status),STATUS.ADMISSIBLE);
    const distanceToFirst=firstBlocking?Math.max(0,n(firstBlocking.fractionStart)*routeLengthM-(finite(context.currentRouteFraction)?n(context.currentRouteFraction)*routeLengthM:0)):null;
    let timeToFirst=null,reachable=null;
    if(firstBlocking){
      reachable=firstBlocking.interventionReach?.reachable??null;
      if(!PRECOMMIT.has(family)&&finite(context.projectedProgressRate)&&n(context.projectedProgressRate)>0)timeToFirst=distanceToFirst/n(context.projectedProgressRate);
      if(PRECOMMIT.has(family)&&finite(firstBlocking.interventionReach?.predictionTimeS))timeToFirst=firstBlocking.interventionReach.predictionTimeS;
    }
    const warnings=unique([
      ...(calibrationResolution.warnings||[]),
      ...(segmentPacket.warnings||[]),
      'Physical interval metrics constrain the fictional family model; they do not make the FTL mechanism real.',
      'Endpoint-derived segment envelopes remain sampled numerical envelopes, not analytic bounds on the unsampled interior.',
      firstBlocking&&reachable===false?'The first blocking interval is inside the modeled intervention reach requirement; abort/reject before transit authority is committed.':null
    ]);

    return deepFreeze({
      schemaVersion:'1.0.0',status:worst,family,path,
      calibration:{profileIdentity:calibrationResolution.profileIdentity,appliedOverrides:calibrationResolution.appliedOverrides,ignoredOverrides:calibrationResolution.ignoredOverrides},
      normalization:{profileId:normalization.profileId,profileVersion:normalization.profileVersion,status:normalization.status},
      segments,
      routeDisposition:{conjunctive:true,worstStatus:worst,blockingSegmentIndices:blocking.map(s=>s.index),firstBlockingSegmentIndex:firstBlocking?.index??null,distanceToFirstBlockingSegmentM:distanceToFirst,timeToFirstBlockingSegmentS:timeToFirst,interventionReachable:reachable},
      warnings,provenance:unique([REGISTRY_URL,CALIBRATION_URL,PHYSICAL_BRIDGE_URL,ROUTE_INTEGRATION_URL,...(segmentPacket.provenance||[]),...(calibrationResolution.provenance||[])]),canonSafeguards:registry.canonSafeguards||[]
    });
  }

  globalThis.BlacklightExoFTLFamilySegmentCertificationRuntime=deepFreeze({STATUS,REGISTRY_URL,loadSupport,resolveFTLFamilySegmentCertification});
})();
