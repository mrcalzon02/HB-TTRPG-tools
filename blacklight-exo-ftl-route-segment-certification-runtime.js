(() => {
  'use strict';

  const REGISTRY_URL='data/exo-vessel/ftl-route-segment-certification-registry.json';
  const STATUS=Object.freeze({ADMISSIBLE:'ADMISSIBLE',MARGINAL:'MARGINAL',REJECTED:'REJECTED',UNRESOLVED:'UNRESOLVED',OUTSIDE_MODEL_VALIDITY:'OUTSIDE_MODEL_VALIDITY'});
  let registryPromise=null;

  const finite=value=>value!==null&&value!==undefined&&value!==''&&Number.isFinite(Number(value));
  const clamp=(value,min,max)=>Math.min(max,Math.max(min,value));
  const vector=value=>value&&['x','y','z'].every(axis=>finite(value[axis]))?{x:Number(value.x),y:Number(value.y),z:Number(value.z)}:null;
  const magnitude=v=>v?Math.hypot(v.x,v.y,v.z):null;
  const unique=items=>[...new Set((items||[]).filter(Boolean))];

  function deepFreeze(value){
    if(!value||typeof value!=='object'||Object.isFrozen(value))return value;
    Object.freeze(value);
    Object.getOwnPropertyNames(value).forEach(key=>deepFreeze(value[key]));
    return value;
  }

  async function loadRegistry(){
    if(!registryPromise){
      registryPromise=fetch(REGISTRY_URL,{cache:'no-store'}).then(response=>{
        if(!response.ok)throw new Error(`Unable to load ${REGISTRY_URL}: HTTP ${response.status}`);
        return response.json();
      }).then(registry=>{
        if(registry?.registryKey!=='blacklight.ftl.route-segment-certification')throw new Error('Invalid route-segment certification registry identity.');
        return deepFreeze(registry);
      }).catch(error=>{registryPromise=null;throw error;});
    }
    return registryPromise;
  }

  function metric(sample,key){
    const value=sample?.environment?.metrics?.[key];
    return finite(value)?Number(value):null;
  }

  function maxFinite(...values){
    const available=values.filter(finite).map(Number);
    return available.length?Math.max(...available):null;
  }

  function minFinite(...values){
    const available=values.filter(finite).map(Number);
    return available.length?Math.min(...available):null;
  }

  function accelerationDirectionChange(left,right){
    const a=vector(left?.environment?.metrics?.accelerationMPerS2);
    const b=vector(right?.environment?.metrics?.accelerationMPerS2);
    if(!a||!b)return null;
    const ma=magnitude(a),mb=magnitude(b);
    if(!(ma>0&&mb>0))return null;
    return Math.acos(clamp((a.x*b.x+a.y*b.y+a.z*b.z)/(ma*mb),-1,1));
  }

  function endpointStatus(sample){
    const status=sample?.environment?.status;
    if(status==='OUTSIDE_MODEL_VALIDITY')return STATUS.OUTSIDE_MODEL_VALIDITY;
    if(status==='UNRESOLVED'||status==='PARTIAL'||!status)return STATUS.UNRESOLVED;
    return STATUS.ADMISSIBLE;
  }

  function worstStatus(...states){
    const rank={ADMISSIBLE:0,MARGINAL:1,UNRESOLVED:2,REJECTED:3,OUTSIDE_MODEL_VALIDITY:4};
    return states.reduce((worst,state)=>rank[state]>rank[worst]?state:worst,STATUS.ADMISSIBLE);
  }

  function segmentEnvelope(left,right){
    return {
      maxDimensionlessPotentialDepth:maxFinite(metric(left,'dimensionlessPotentialDepth'),metric(right,'dimensionlessPotentialDepth')),
      maxAccelerationMPerS2:maxFinite(metric(left,'accelerationMagnitudeMPerS2'),metric(right,'accelerationMagnitudeMPerS2')),
      maxTidalFrobeniusPerS2:maxFinite(metric(left,'tidalFrobeniusPerS2'),metric(right,'tidalFrobeniusPerS2')),
      maxSingleSourceCurvatureScalePerM2:maxFinite(metric(left,'maxSingleSourceCurvatureScalePerM2'),metric(right,'maxSingleSourceCurvatureScalePerM2')),
      minimumSchwarzschildRadiusRatio:minFinite(metric(left,'minimumSchwarzschildRadiusRatio'),metric(right,'minimumSchwarzschildRadiusRatio'))
    };
  }

  function gradients(left,right,lengthM){
    const potentialLeft=left?.environment?.metrics?.potentialM2PerS2;
    const potentialRight=right?.environment?.metrics?.potentialM2PerS2;
    const accelerationLeft=metric(left,'accelerationMagnitudeMPerS2');
    const accelerationRight=metric(right,'accelerationMagnitudeMPerS2');
    const tidalLeft=metric(left,'tidalFrobeniusPerS2');
    const tidalRight=metric(right,'tidalFrobeniusPerS2');
    return {
      potentialGradientAlongPathMPerS2:finite(potentialLeft)&&finite(potentialRight)?Math.abs(Number(potentialRight)-Number(potentialLeft))/lengthM:null,
      accelerationGradientAlongPathPerS2:finite(accelerationLeft)&&finite(accelerationRight)?Math.abs(accelerationRight-accelerationLeft)/lengthM:null,
      tidalGradientAlongPathPerMS2:finite(tidalLeft)&&finite(tidalRight)?Math.abs(tidalRight-tidalLeft)/lengthM:null,
      accelerationDirectionChangeRad:accelerationDirectionChange(left,right)
    };
  }

  function buildSegment(left,right,index,routeLengthM){
    const fractionStart=Number(left.fraction),fractionEnd=Number(right.fraction);
    const lengthM=(fractionEnd-fractionStart)*routeLengthM;
    const status=worstStatus(endpointStatus(left),endpointStatus(right));
    const reasons=[];
    if(status===STATUS.OUTSIDE_MODEL_VALIDITY)reasons.push('At least one segment boundary sample lies outside the active physical model validity domain.');
    if(status===STATUS.UNRESOLVED)reasons.push('At least one segment boundary sample is PARTIAL or UNRESOLVED; missing evidence may not be replaced with zero or perfect certainty.');
    return {
      index,fractionStart,fractionEnd,lengthM,status,
      environmentEnvelope:segmentEnvelope(left,right),
      gradientDiagnostics:gradients(left,right,lengthM),
      uncertainty:left?.environment?.uncertainty||right?.environment?.uncertainty||null,
      reasons,
      provenance:unique([...(left?.environment?.provenance||[]),...(right?.environment?.provenance||[])])
    };
  }

  function unresolved(reason,registry,path=null){
    return deepFreeze({
      schemaVersion:'1.0.0',status:STATUS.UNRESOLVED,
      route:path?.route||null,segments:[],
      routeDisposition:{conjunctive:true,worstStatus:STATUS.UNRESOLVED,blockingSegmentIndices:[],marginalSegmentIndices:[],minimumMargin:null},
      sampling:path?.sampling||null,uncertainty:path?.uncertainty||null,warnings:[reason],
      provenance:unique([REGISTRY_URL,...(path?.provenance||[])]),canonSafeguards:registry?.canonSafeguards||[]
    });
  }

  async function resolveFTLRouteSegmentCertification(context={}){
    const registry=context.registry||await loadRegistry();
    let path=context.pathPacket||null;
    if(!path){
      const PathRuntime=context.pathRuntime||globalThis.BlacklightExoFTLPhysicalRoutePathRuntime;
      if(!PathRuntime?.resolveFTLPhysicalRoutePath)return unresolved('Physical route-path runtime is not loaded and no pathPacket was supplied.',registry);
      path=await PathRuntime.resolveFTLPhysicalRoutePath(context.pathContext||context);
    }
    if(!path||!Array.isArray(path.samples)||path.samples.length<2)return unresolved('A physical route path with at least two ordered samples is required.',registry,path);
    if(!finite(path.route?.lengthM)||Number(path.route.lengthM)<=0)return unresolved('Physical route path has no valid SI route length.',registry,path);

    const samples=[...path.samples].sort((a,b)=>Number(a.fraction)-Number(b.fraction));
    const segments=[];
    for(let index=0;index<samples.length-1;index+=1){
      const segment=buildSegment(samples[index],samples[index+1],index,Number(path.route.lengthM));
      if(!(segment.lengthM>0))return unresolved(`Segment ${index} has zero or negative physical length.`,registry,path);
      segments.push(segment);
    }

    const worst=segments.reduce((state,segment)=>worstStatus(state,segment.status),STATUS.ADMISSIBLE);
    const blocking=segments.filter(segment=>[STATUS.REJECTED,STATUS.UNRESOLVED,STATUS.OUTSIDE_MODEL_VALIDITY].includes(segment.status)).map(segment=>segment.index);
    const marginal=segments.filter(segment=>segment.status===STATUS.MARGINAL).map(segment=>segment.index);
    const warnings=[];
    if(path.status==='PARTIAL')warnings.push('The parent route path is PARTIAL; affected intervals remain unresolved for certification even where finite field values exist.');
    if(worst===STATUS.OUTSIDE_MODEL_VALIDITY)warnings.push('At least one interval requires a higher-fidelity physical model before transit certification.');
    if(blocking.length)warnings.push(`Route contains ${blocking.length} blocking interval(s); benign intervals cannot average them away.`);
    warnings.push('Segment envelopes are endpoint-sampled numerical envelopes, not analytic proofs of the continuous interior. Preserve the parent adaptive-refinement record.');

    return deepFreeze({
      schemaVersion:'1.0.0',status:worst,
      route:path.route,
      segments,
      routeDisposition:{conjunctive:true,worstStatus:worst,blockingSegmentIndices:blocking,marginalSegmentIndices:marginal,minimumMargin:null},
      sampling:path.sampling,
      uncertainty:path.uncertainty||null,
      warnings,
      provenance:unique([REGISTRY_URL,...(path.provenance||[])]),
      canonSafeguards:registry.canonSafeguards||[]
    });
  }

  globalThis.BlacklightExoFTLRouteSegmentCertificationRuntime=deepFreeze({STATUS,REGISTRY_URL,loadRegistry,resolveFTLRouteSegmentCertification});
})();